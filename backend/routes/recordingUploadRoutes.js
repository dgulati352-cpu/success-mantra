const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const uploadChunk = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
const r2Storage = require('../services/r2Storage');
const { getDb } = require('../database/schema');
const { getDoc, addDoc, updateDoc } = require('../database/firestore');

const MIN_R2_PART_SIZE = 5 * 1024 * 1024; // 5 MB (S3/R2 specification minimum)
const RECORDING_PART_SIZE = 6 * 1024 * 1024; // 6 MB chunks (guaranteed >= 5MB for R2/S3 compatibility)

// Helper to log audit actions safely
const logAudit = async (userId, action, entity, entityId, details, ip) => {
  try {
    const db = getDb();
    if (db && typeof db.prepare === 'function') {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, action, entity, String(entityId || ''), details || '', ip || '');
    }
  } catch (e) {
    // Non-blocking audit log failure
  }
};

// In-memory session cache for resilient serverless & multi-instance environments
const uploadSessionsCache = new Map();

/**
 * Multi-tier upload session retriever:
 * 1. In-memory Map cache (instant, zero-latency)
 * 2. SQLite local database (when available)
 * 3. Firestore collection (persistent across Vercel/serverless cold-starts)
 * 4. Stateless fallback from client request headers/body
 */
async function getUploadSession(uploadId, fallbackData = {}) {
  if (!uploadId) return null;

  // 1. In-memory cache
  if (uploadSessionsCache.has(uploadId)) {
    const cached = uploadSessionsCache.get(uploadId);
    if (fallbackData.storageKey) cached.storage_key = fallbackData.storageKey;
    if (fallbackData.r2UploadId) cached.r2_upload_id = fallbackData.r2UploadId;
    return cached;
  }

  // 2. SQLite
  const db = getDb();
  if (db && typeof db.prepare === 'function') {
    try {
      const row = db.prepare('SELECT * FROM recording_upload_sessions WHERE id = ?').get(uploadId);
      if (row) {
        uploadSessionsCache.set(uploadId, row);
        return row;
      }
    } catch (e) {}
  }

  // 3. Firestore
  try {
    const fsDoc = await getDoc('recordingUploadSessions', String(uploadId));
    if (fsDoc) {
      uploadSessionsCache.set(uploadId, fsDoc);
      return fsDoc;
    }
  } catch (e) {}

  // 4. Stateless fallback if client provided storageKey & r2UploadId
  if (fallbackData.storageKey && fallbackData.r2UploadId) {
    const synthetic = {
      id: uploadId,
      class_id: fallbackData.classId || 'live_class',
      faculty_id: fallbackData.facultyId || 'faculty_1',
      title: fallbackData.title || 'Live Recording',
      storage_key: fallbackData.storageKey,
      r2_upload_id: fallbackData.r2UploadId,
      file_size: Number(fallbackData.fileSize) || 0,
      part_size: Number(fallbackData.partSize) || RECORDING_PART_SIZE,
      total_parts: Number(fallbackData.totalParts) || 1,
      uploaded_parts: '[]',
      uploaded_bytes: 0,
      status: 'uploading'
    };
    uploadSessionsCache.set(uploadId, synthetic);
    return synthetic;
  }

  return null;
}

/**
 * Persists session state across memory cache, SQLite, and Firestore
 */
function saveUploadSession(session) {
  if (!session || !session.id) return;
  uploadSessionsCache.set(session.id, session);

  const db = getDb();
  if (db && typeof db.prepare === 'function') {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO recording_upload_sessions (
          id, recording_id, class_id, faculty_id, client_upload_id, title,
          storage_key, r2_upload_id, file_name, file_size, mime_type,
          duration_seconds, part_size, total_parts, uploaded_parts, uploaded_bytes, status, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        session.id,
        session.recording_id || session.id,
        session.class_id,
        session.faculty_id,
        session.client_upload_id || '',
        session.title || '',
        session.storage_key,
        session.r2_upload_id,
        session.file_name || 'recording.webm',
        Number(session.file_size || 0),
        session.mime_type || 'video/webm',
        Number(session.duration_seconds || 3600),
        Number(session.part_size || RECORDING_PART_SIZE),
        Number(session.total_parts || 1),
        session.uploaded_parts || '[]',
        Number(session.uploaded_bytes || 0),
        session.status || 'uploading'
      );
    } catch (e) {}
  }

  try {
    setDoc('recordingUploadSessions', String(session.id), session).catch(() => {});
  } catch (e) {}
}

/**
 * 1. POST /api/admin/recordings/upload/init
 * Initializes or recovers a resumable R2 Multipart Upload session
 */
router.post('/init', async (req, res) => {
  try {
    const {
      classId,
      clientUploadId,
      title,
      fileName,
      mimeType,
      fileSize,
      duration,
      subject,
      targetClass,
      courseId,
      chapter,
      description,
      isFreePreview
    } = req.body;

    if (!classId) {
      return res.status(400).json({ success: false, message: 'Class ID is required.' });
    }
    if (!fileSize || Number(fileSize) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid file size is required.' });
    }

    const db = getDb();
    const facultyId = req.user.id;

    // Check class access/ownership
    let liveClass = null;
    if (db && typeof db.prepare === 'function') {
      try {
        liveClass = db.prepare('SELECT * FROM live_classes WHERE id = ?').get(classId);
      } catch (e) {}
    }
    if (!liveClass) {
      try {
        liveClass = (await getDoc('liveClasses', String(classId))) || null;
      } catch (e) {}
    }

    if (!liveClass && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(404).json({ success: false, message: 'Live class not found or unauthorized.' });
    }

    if (liveClass && req.user.role === 'faculty' && String(liveClass.faculty_id) !== String(facultyId)) {
      return res.status(403).json({ success: false, message: 'You can only upload recordings for your own classes.' });
    }

    const safeClientUploadId = clientUploadId || `client_${classId}_${Date.now()}`;
    const cleanFileSize = Number(fileSize);

    // Idempotency check: verify existing unfinished upload session
    let existingSession = null;
    if (uploadSessionsCache.has(safeClientUploadId)) {
      existingSession = uploadSessionsCache.get(safeClientUploadId);
    }
    if (!existingSession && db && typeof db.prepare === 'function') {
      try {
        existingSession = db.prepare(`
          SELECT * FROM recording_upload_sessions
          WHERE (client_upload_id = ? OR (class_id = ? AND file_size = ? AND status IN ('upload_pending', 'uploading', 'upload_paused')))
            AND status NOT IN ('published', 'cancelled')
          ORDER BY created_at DESC LIMIT 1
        `).get(safeClientUploadId, classId, cleanFileSize);
      } catch (e) {}
    }

    if (existingSession) {
      // Discard legacy sessions that used part sizes below S3/R2 5MB minimum requirement
      if (existingSession.part_size && Number(existingSession.part_size) < MIN_R2_PART_SIZE) {
        console.warn(`[UPLOAD_INIT] Stale session with invalid sub-5MB part size (${existingSession.part_size} bytes). Discarding to prevent EntityTooSmall error.`);
        existingSession = null;
      }
    }

    if (existingSession) {
      let isR2Alive = false;
      let uploadedParts = [];
      try { uploadedParts = JSON.parse(existingSession.uploaded_parts || '[]'); } catch(e) {}

      // Actively verify with R2 that the multipart upload session is still valid
      try {
        const r2Parts = await r2Storage.listUploadedParts({
          storageKey: existingSession.storage_key,
          uploadId: existingSession.r2_upload_id
        });
        isR2Alive = true;
        if (r2Parts && r2Parts.length > 0) {
          const r2PartMap = new Map();
          r2Parts.forEach(p => r2PartMap.set(p.partNumber, p.etag));
          uploadedParts = uploadedParts.map(p => ({
            ...p,
            etag: r2PartMap.get(p.partNumber) || p.etag
          }));
          r2Parts.forEach(rp => {
            if (!uploadedParts.some(p => p.partNumber === rp.partNumber)) {
              uploadedParts.push({ partNumber: rp.partNumber, etag: rp.etag, size: rp.size });
            }
          });
          uploadedParts.sort((a, b) => a.partNumber - b.partNumber);
        }
      } catch (r2Err) {
        console.warn(`[UPLOAD_INIT] Stale R2 upload ID detected (${r2Err.message}). Discarding expired session.`);
        isR2Alive = false;
      }

      if (isR2Alive) {
        uploadSessionsCache.set(existingSession.id, existingSession);
        return res.json({
          success: true,
          resumed: true,
          uploadId: existingSession.id,
          r2UploadId: existingSession.r2_upload_id,
          recordingId: existingSession.recording_id,
          storageKey: existingSession.storage_key,
          partSize: existingSession.part_size,
          totalParts: existingSession.total_parts,
          uploadedParts,
          uploadedBytes: existingSession.uploaded_bytes,
          status: existingSession.status
        });
      }
    }

    // Determine extension and clean filename
    const cleanMime = (mimeType || 'video/webm').toLowerCase();
    const ext = cleanMime.includes('mp4') ? '.mp4' : cleanMime.includes('mov') ? '.mov' : '.webm';
    const uploadSessionId = `upsess_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const cleanTitle = (title || liveClass?.title || 'Live Interactive Masterclass').trim();
    const recordingId = Date.now();
    // Standardized Clean R2 Storage Key: recordings/{teacherId}/{sessionId}/{recordingId}/recording.webm
    const storageKey = `recordings/${facultyId}/${classId}/${recordingId}/recording${ext}`;

    // Compliant part size: 6 MB chunks guaranteed to satisfy S3/R2 5MB minimum requirement
    const partSize = RECORDING_PART_SIZE;
    const totalParts = Math.max(1, Math.ceil(cleanFileSize / partSize));

    console.log(`[R2] CreateMultipartUpload for ${storageKey}, totalParts: ${totalParts}`);

    // Initialize R2 Multipart Upload
    const r2Init = await r2Storage.createMultipartUpload({
      storageKey,
      contentType: cleanMime
    });

    const recordingTitle = cleanTitle;
    const recordingSubject = subject || liveClass?.subject || 'Accountancy';
    const recordingTargetClass = targetClass || liveClass?.course_class || liveClass?.target_class || 'Class 12';
    const recordingCourseId = courseId || liveClass?.course_id || null;
    const recordingChapter = chapter || liveClass?.topic || 'Live Broadcast Recording';
    const recordingDescription = description || liveClass?.description || `Recorded live lecture conducted for ${recordingTargetClass}.`;

    // 1. Create recording entry in recordings table with status 'uploading'
    let newRecordingId = recordingId;
    if (db && typeof db.prepare === 'function') {
      try {
        const insertStmt = db.prepare(`
          INSERT INTO recordings (
            live_class_id, course_id, faculty_id, title, subject, target_class, chapter,
            description, video_url, video_provider, thumbnail_url, duration_minutes,
            access_level, published, upload_id, client_upload_id, upload_status, storage_key,
            file_size, uploaded_bytes, total_bytes, mime_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', 'html5', ?, ?, 'enrolled', 0, ?, ?, 'uploading', ?, ?, 0, ?, ?)
        `);
        const result = insertStmt.run(
          classId,
          recordingCourseId,
          facultyId,
          recordingTitle,
          recordingSubject,
          recordingTargetClass,
          recordingChapter,
          recordingDescription,
          liveClass?.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
          Math.round(Number(duration || 3600) / 60),
          uploadSessionId,
          safeClientUploadId,
          storageKey,
          cleanFileSize,
          cleanFileSize,
          cleanMime
        );
        newRecordingId = result.lastInsertRowid || recordingId;
      } catch (dbErr) {
        console.warn('[UPLOAD_INIT] DB insert recording warning:', dbErr.message);
      }
    }

    // 2. Persist session records into multi-tier storage
    const sessionRecord = {
      id: uploadSessionId,
      recording_id: newRecordingId,
      class_id: classId,
      faculty_id: facultyId,
      client_upload_id: safeClientUploadId,
      title: recordingTitle,
      storage_key: storageKey,
      r2_upload_id: r2Init.uploadId,
      file_name: fileName || `recording${ext}`,
      file_size: cleanFileSize,
      mime_type: cleanMime,
      duration_seconds: Number(duration || 3600),
      part_size: partSize,
      total_parts: totalParts,
      uploaded_parts: '[]',
      uploaded_bytes: 0,
      status: 'uploading'
    };

    saveUploadSession(sessionRecord);

    console.log(`[D1/Storage] Upload state saved: uploadId=${uploadSessionId}, storageKey=${storageKey}, r2UploadId=${r2Init.uploadId}`);

    await logAudit(
      facultyId,
      'INIT_RECORDING_MULTIPART_UPLOAD',
      'RECORDING_UPLOAD',
      uploadSessionId,
      `Initialized ${totalParts}-part upload for "${recordingTitle}" (${(cleanFileSize / (1024 * 1024)).toFixed(1)} MB)`,
      req.ip
    );

    console.log(`[RecordingUpload] initialized: uploadId=${uploadSessionId}, parts=${totalParts}, storageKey=${storageKey}`);

    return res.status(201).json({
      success: true,
      resumed: false,
      uploadId: uploadSessionId,
      r2UploadId: r2Init.uploadId,
      recordingId: newRecordingId,
      storageKey,
      partSize,
      totalParts,
      uploadedParts: [],
      uploadedBytes: 0,
      status: 'uploading'
    });
  } catch (err) {
    console.error('[UPLOAD_INIT] Error:', err);
    return res.status(500).json({ success: false, message: `Failed to initialize recording upload: ${err.message}` });
  }
});

/**
 * 2. POST /api/admin/recordings/upload/part
 * Generates an authorized presigned URL for direct Browser -> Cloudflare R2 PUT of a single slice
 */
router.post('/part', async (req, res) => {
  try {
    const { uploadId, partNumber, storageKey, r2UploadId } = req.body;
    if (!uploadId || !partNumber) {
      return res.status(400).json({ success: false, message: 'Upload ID and partNumber are required.' });
    }

    const pNum = Number(partNumber);
    if (isNaN(pNum) || pNum < 1) {
      return res.status(400).json({ success: false, message: 'Invalid part number.' });
    }

    const session = await getUploadSession(uploadId, { storageKey, r2UploadId });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Upload session not found.' });
    }

    if (session.status === 'cancelled' || session.status === 'published') {
      return res.status(400).json({ success: false, message: `Upload session is ${session.status}.` });
    }

    const partInfo = await r2Storage.getPresignedPartUploadUrl({
      storageKey: session.storage_key,
      uploadId: session.r2_upload_id,
      partNumber: pNum,
      expiresInSeconds: 3600 // 1 hour token for slow connections
    });

    return res.json({
      success: true,
      partNumber: pNum,
      uploadUrl: partInfo.uploadUrl,
      r2UploadId: session.r2_upload_id,
      storageKey: session.storage_key,
      isFallback: partInfo.isFallback || false
    });
  } catch (err) {
    console.error('[UPLOAD_PART] Error:', err);
    return res.status(500).json({ success: false, message: `Failed to get part authorization: ${err.message}` });
  }
});

/**
 * 2b. POST /api/admin/recordings/upload/part-data
 * Server-side chunk streaming proxy: uploads chunk directly to Cloudflare R2 from backend (0 CORS issues)
 */
router.post('/part-data', uploadChunk.single('chunk'), async (req, res) => {
  try {
    const uploadId = req.body?.uploadId || req.headers['x-upload-id'] || req.query?.uploadId;
    const partNumber = Number(req.body?.partNumber || req.headers['x-part-number'] || req.query?.partNumber);
    const storageKeyParam = req.body?.storageKey || req.headers['x-storage-key'];
    const r2UploadIdParam = req.body?.r2UploadId || req.headers['x-r2-upload-id'];
    const fileSizeParam = req.body?.fileSize || req.headers['x-file-size'];

    if (!uploadId || !partNumber) {
      return res.status(400).json({ success: false, message: 'Upload ID and partNumber are required.' });
    }

    const buffer = req.file?.buffer || req.body;
    if (!buffer || !buffer.length) {
      return res.status(400).json({ success: false, message: 'No chunk data received.' });
    }

    const session = await getUploadSession(uploadId, {
      storageKey: storageKeyParam,
      r2UploadId: r2UploadIdParam,
      fileSize: fileSizeParam
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Upload session not found.' });
    }

    const partResult = await r2Storage.uploadPartBuffer({
      storageKey: session.storage_key,
      uploadId: session.r2_upload_id,
      partNumber,
      buffer
    });

    const etag = partResult.etag;

    // Record completed part in database
    let parts = [];
    try { parts = JSON.parse(session.uploaded_parts || '[]'); } catch(e) {}
    const existingIndex = parts.findIndex(p => p.partNumber === partNumber);
    if (existingIndex >= 0) {
      parts[existingIndex] = { partNumber, etag, size: buffer.length };
    } else {
      parts.push({ partNumber, etag, size: buffer.length });
    }
    parts.sort((a, b) => a.partNumber - b.partNumber);
    const uploadedBytes = parts.reduce((acc, p) => acc + (Number(p.size) || 0), 0);

    session.uploaded_parts = JSON.stringify(parts);
    session.uploaded_bytes = uploadedBytes;
    session.status = 'uploading';
    saveUploadSession(session);

    const db = getDb();
    if (db && typeof db.prepare === 'function') {
      try {
        const partId = `part_${uploadId}_${partNumber}`;
        db.prepare(`
          INSERT INTO recording_upload_parts (
            id, upload_session_id, part_number, part_size, etag, status, uploaded_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'uploaded', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(upload_session_id, part_number) DO UPDATE SET
            part_size = excluded.part_size,
            etag = excluded.etag,
            status = 'uploaded',
            updated_at = CURRENT_TIMESTAMP
        `).run(partId, uploadId, partNumber, buffer.length, etag);

        db.prepare(`
          UPDATE recording_uploads
          SET uploaded_bytes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(uploadedBytes, uploadId);

        db.prepare(`
          UPDATE recordings
          SET uploaded_bytes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE upload_id = ?
        `).run(uploadedBytes, uploadId);
      } catch(e) {
        console.warn('[UPLOAD_PART_DATA] DB parts update note:', e.message);
      }
    }

    console.log(`[D1/Storage] Part ${partNumber} saved. Total uploaded: ${uploadedBytes}/${session.file_size || buffer.length} bytes`);

    return res.json({
      success: true,
      partNumber,
      etag,
      uploadedBytes,
      totalBytes: session.file_size || buffer.length,
      completedPartsCount: parts.length,
      totalParts: session.total_parts
    });
  } catch (err) {
    console.error('[UPLOAD_PART_DATA] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 3. POST /api/admin/recordings/upload/part-complete
 * Records a confirmed part upload with its ETag and byte size to maintain resumable progress
 */
router.post('/part-complete', async (req, res) => {
  try {
    const { uploadId, partNumber, etag, partSize, storageKey, r2UploadId } = req.body;
    if (!uploadId || !partNumber || !etag) {
      return res.status(400).json({ success: false, message: 'uploadId, partNumber, and etag are required.' });
    }

    const session = await getUploadSession(uploadId, { storageKey, r2UploadId });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Upload session not found.' });
    }

    const pNum = Number(partNumber);
    const pSize = Number(partSize) || session.part_size;

    let parts = [];
    try { parts = JSON.parse(session.uploaded_parts || '[]'); } catch(e) {}

    const existingIndex = parts.findIndex(p => p.partNumber === pNum);
    if (existingIndex >= 0) {
      parts[existingIndex] = { partNumber: pNum, etag, size: pSize };
    } else {
      parts.push({ partNumber: pNum, etag, size: pSize });
    }

    parts.sort((a, b) => a.partNumber - b.partNumber);
    const uploadedBytes = parts.reduce((acc, p) => acc + (Number(p.size) || 0), 0);

    session.uploaded_parts = JSON.stringify(parts);
    session.uploaded_bytes = uploadedBytes;
    saveUploadSession(session);

    const db = getDb();
    if (db && typeof db.prepare === 'function') {
      try {
        const partId = `part_${uploadId}_${pNum}`;
        db.prepare(`
          INSERT INTO recording_upload_parts (
            id, upload_session_id, part_number, part_size, etag, status, uploaded_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'uploaded', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(upload_session_id, part_number) DO UPDATE SET
            part_size = excluded.part_size,
            etag = excluded.etag,
            status = 'uploaded',
            updated_at = CURRENT_TIMESTAMP
        `).run(partId, uploadId, pNum, pSize, etag);

        db.prepare(`
          UPDATE recording_uploads
          SET uploaded_bytes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(uploadedBytes, uploadId);

        db.prepare(`
          UPDATE recordings
          SET uploaded_bytes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE upload_id = ?
        `).run(uploadedBytes, uploadId);
      } catch (dbErr) {
        console.warn('[PART_COMPLETE] DB update note:', dbErr.message);
      }
    }

    console.log(`[D1/Storage] Part ${pNum} confirmed. Total uploaded: ${uploadedBytes}/${session.file_size} bytes`);

    return res.json({
      success: true,
      partNumber: pNum,
      uploadedBytes,
      totalBytes: session.file_size,
      completedPartsCount: parts.length,
      totalParts: session.total_parts
    });
  } catch (err) {
    console.error('[PART_COMPLETE] Error:', err);
    return res.status(500).json({ success: false, message: `Failed to record part completion: ${err.message}` });
  }
});

/**
 * 4. POST /api/admin/recordings/upload/complete
 * Assembles multipart upload on Cloudflare R2, verifies object integrity, updates database, and publishes
 */
router.post('/complete', async (req, res) => {
  try {
    const { uploadId, parts, storageKey, r2UploadId } = req.body;
    if (!uploadId) {
      return res.status(400).json({ success: false, message: 'Upload ID is required.' });
    }

    const session = await getUploadSession(uploadId, { storageKey, r2UploadId });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Upload session not found.' });
    }

    // Determine final parts list: use body.parts if provided or fallback to recorded session parts
    let finalParts = Array.isArray(parts) && parts.length > 0 ? parts : [];
    if (finalParts.length === 0) {
      try { finalParts = JSON.parse(session.uploaded_parts || '[]'); } catch(e) {}
    }

    if (finalParts.length < (session.total_parts || 1)) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete upload: missing parts. Expected ${session.total_parts}, received ${finalParts.length}.`
      });
    }

    session.status = 'completing';
    saveUploadSession(session);

    const db = getDb();
    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare("UPDATE recording_upload_sessions SET status = 'completing' WHERE id = ?").run(uploadId);
        db.prepare("UPDATE recordings SET upload_status = 'completing' WHERE upload_id = ?").run(uploadId);
      } catch(e) {}
    }

    console.log(`[RecordingUpload] completing: uploadId=${uploadId}, parts=${finalParts.length}`);

    // 2. Complete Cloudflare R2 Multipart Upload
    const completeRes = await r2Storage.completeMultipartUpload({
      storageKey: session.storage_key,
      uploadId: session.r2_upload_id,
      parts: finalParts
    });

    // 3. Mandatory Verification Step: verify object exists and content length
    session.status = 'verifying';
    saveUploadSession(session);

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare("UPDATE recording_upload_sessions SET status = 'verifying' WHERE id = ?").run(uploadId);
        db.prepare("UPDATE recordings SET upload_status = 'verifying' WHERE upload_id = ?").run(uploadId);
      } catch(e) {}
    }

    console.log(`[RecordingUpload] verifying: storageKey=${session.storage_key}`);
    const verification = await r2Storage.verifyObject({ storageKey: session.storage_key });

    if (!verification.exists) {
      const errMsg = verification.reason || 'Storage object could not be verified on Cloudflare R2.';
      session.status = 'upload_failed';
      saveUploadSession(session);
      if (db && typeof db.prepare === 'function') {
        db.prepare("UPDATE recording_upload_sessions SET status = 'upload_failed', error_message = ? WHERE id = ?").run(errMsg, uploadId);
        db.prepare("UPDATE recordings SET upload_status = 'upload_failed', upload_error = ? WHERE upload_id = ?").run(errMsg, uploadId);
      }
      return res.status(500).json({ success: false, message: errMsg });
    }

    console.log(`[RecordingUpload] verified: contentLength=${verification.contentLength} bytes, type=${verification.contentType}`);

    // 4. Generate persistent playback URL
    const playbackUrl = r2Storage.getPublicUrl(session.storage_key);

    // 5. Update Database Records & Mark Published
    const nowIso = new Date().toISOString();
    const durationMins = Math.round(Number(session.duration_seconds || 3600) / 60) || 60;

    session.status = 'published';
    session.uploaded_bytes = verification.contentLength;
    saveUploadSession(session);

    if (db && typeof db.prepare === 'function') {
      try {
        // Update session
        db.prepare(`
          UPDATE recording_upload_sessions
          SET status = 'published', uploaded_bytes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(verification.contentLength, uploadId);

        // Update recording
        db.prepare(`
          UPDATE recordings
          SET video_url = ?,
              video_provider = 'html5',
              storage_key = ?,
              upload_status = 'published',
              published = 1,
              file_size = ?,
              uploaded_bytes = ?,
              total_bytes = ?,
              uploaded_at = CURRENT_TIMESTAMP,
              published_at = CURRENT_TIMESTAMP
          WHERE upload_id = ? OR id = ?
        `).run(playbackUrl, session.storage_key, verification.contentLength, verification.contentLength, verification.contentLength, uploadId, session.recording_id);

        // Update live class record
        db.prepare(`
          UPDATE live_classes
          SET recording_url = ?,
              recording_status = 'ready',
              status = 'completed',
              is_recorded = 1,
              duration_minutes = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(playbackUrl, durationMins, session.class_id);

        // Also sync into live_class_recordings table for cross-compatibility
        try {
          db.prepare(`
            INSERT OR REPLACE INTO live_class_recordings (
              live_class_id, course_id, faculty_id, title, subject,
              storage_url, duration_seconds, file_size, mime_type, processing_status, published
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', 1)
          `).run(
            session.class_id,
            session.course_id || null,
            String(session.faculty_id || req.user.id),
            session.title,
            session.subject || 'Accountancy',
            playbackUrl,
            session.duration_seconds || (durationMins * 60),
            String(verification.contentLength),
            session.mime_type || 'video/webm'
          );
        } catch (lcrErr) {
          console.warn('[UPLOAD_COMPLETE] live_class_recordings sync note:', lcrErr.message);
        }
      } catch (dbFinalErr) {
        console.error('[UPLOAD_COMPLETE] DB final update warning:', dbFinalErr.message);
      }
    }

    // Also update Firestore collections
    try {
      await updateDoc('liveClasses', String(session.class_id), {
        recording_url: playbackUrl,
        recording_status: 'ready',
        status: 'completed',
        is_recorded: true,
        duration_minutes: durationMins,
        recorded_at: nowIso
      });
    } catch(fsErr) {}

    await logAudit(
      req.user.id,
      'COMPLETE_RECORDING_UPLOAD',
      'RECORDING',
      session.recording_id,
      `Successfully uploaded, verified, and published recording: "${session.title}" (${(verification.contentLength / (1024 * 1024)).toFixed(1)} MB)`,
      req.ip
    );

    console.log(`[RecordingUpload] published: recordingId=${session.recording_id}, videoUrl=${playbackUrl}`);

    return res.json({
      success: true,
      message: `Recording "${session.title}" uploaded, verified, and published to Recorded Videos!`,
      videoUrl: playbackUrl,
      recordingId: session.recording_id,
      fileSize: verification.contentLength,
      storageKey: session.storage_key
    });
  } catch (err) {
    console.error('[UPLOAD_COMPLETE] Error:', err);
    return res.status(500).json({ success: false, message: `Failed to complete upload: ${err.message}` });
  }
});

/**
 * 5. GET /api/admin/recordings/upload/:uploadId/status
 * Fetches authoritative server & R2 upload session state for resumption
 */
router.get('/:uploadId/status', async (req, res) => {
  try {
    const { uploadId } = req.params;
    const session = await getUploadSession(uploadId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Upload session not found.' });
    }

    let uploadedParts = [];
    try { uploadedParts = JSON.parse(session.uploaded_parts || '[]'); } catch(e) {}

    // Check R2 for confirmed uploaded parts to ensure client and server sync
    try {
      const r2Parts = await r2Storage.listUploadedParts({
        storageKey: session.storage_key,
        uploadId: session.r2_upload_id
      });
      if (r2Parts && r2Parts.length > 0) {
        const r2PartMap = new Map();
        r2Parts.forEach(p => r2PartMap.set(p.partNumber, p.etag));
        uploadedParts = uploadedParts.map(p => ({
          ...p,
          etag: r2PartMap.get(p.partNumber) || p.etag
        }));
        r2Parts.forEach(rp => {
          if (!uploadedParts.some(p => p.partNumber === rp.partNumber)) {
            uploadedParts.push({ partNumber: rp.partNumber, etag: rp.etag, size: rp.size });
          }
        });
        uploadedParts.sort((a, b) => a.partNumber - b.partNumber);
      }
    } catch(r2ListErr) {}

    return res.json({
      success: true,
      session: {
        id: session.id,
        classId: session.class_id,
        recordingId: session.recording_id,
        title: session.title,
        storageKey: session.storage_key,
        fileSize: session.file_size,
        uploadedBytes: session.uploaded_bytes,
        partSize: session.part_size,
        totalParts: session.total_parts,
        uploadedParts,
        status: session.status,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      }
    });
  } catch (err) {
    console.error('[UPLOAD_STATUS] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 6. POST /api/admin/recordings/upload/:uploadId/cancel
 * Aborts R2 multipart session and cleans up incomplete recording records
 */
router.post('/:uploadId/cancel', async (req, res) => {
  try {
    const { uploadId } = req.params;
    const session = await getUploadSession(uploadId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Upload session not found.' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && String(session.faculty_id) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    // 1. Abort R2 multipart upload to free bucket storage
    try {
      await r2Storage.abortMultipartUpload({
        storageKey: session.storage_key,
        uploadId: session.r2_upload_id
      });
    } catch(e) {}

    // 2. Mark session cancelled
    session.status = 'cancelled';
    saveUploadSession(session);

    const db = getDb();
    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare("UPDATE recording_upload_sessions SET status = 'cancelled' WHERE id = ?").run(uploadId);
        // Remove unpublished placeholder recording
        db.prepare("DELETE FROM recordings WHERE upload_id = ? AND published = 0").run(uploadId);
      } catch(e) {}
    }

    await logAudit(req.user.id, 'CANCEL_RECORDING_UPLOAD', 'RECORDING_UPLOAD', uploadId, `Cancelled upload for ${session.title}`, req.ip);

    return res.json({ success: true, message: 'Upload cancelled and storage session aborted.' });
  } catch (err) {
    console.error('[UPLOAD_CANCEL] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 7. GET /api/admin/recordings/upload/pending
 * Lists all unfinished upload sessions for the teacher/admin to resume on login or page refresh
 */
router.get('/pending', async (req, res) => {
  try {
    const db = getDb();
    if (!db || typeof db.prepare !== 'function') {
      return res.json({ success: true, pendingUploads: [] });
    }

    let rows = [];
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      rows = db.prepare(`
        SELECT * FROM recording_upload_sessions
        WHERE status IN ('upload_pending', 'uploading', 'upload_paused', 'upload_failed')
        ORDER BY created_at DESC
      `).all();
    } else {
      rows = db.prepare(`
        SELECT * FROM recording_upload_sessions
        WHERE faculty_id = ? AND status IN ('upload_pending', 'uploading', 'upload_paused', 'upload_failed')
        ORDER BY created_at DESC
      `).all(req.user.id);
    }

    const pendingUploads = rows.map(r => {
      let parts = [];
      try { parts = JSON.parse(r.uploaded_parts || '[]'); } catch(e) {}
      return {
        id: r.id,
        classId: r.class_id,
        recordingId: r.recording_id,
        clientUploadId: r.client_upload_id,
        title: r.title,
        storageKey: r.storage_key,
        fileSize: r.file_size,
        uploadedBytes: r.uploaded_bytes,
        partSize: r.part_size,
        totalParts: r.total_parts,
        uploadedParts: parts,
        status: r.status,
        createdAt: r.created_at
      };
    });

    return res.json({ success: true, pendingUploads });
  } catch (err) {
    console.error('[UPLOAD_PENDING] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
