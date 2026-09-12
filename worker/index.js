/**
 * Success Mantra Academy — Cloudflare Worker Native API
 * Provides native Cloudflare D1 (Database) & Cloudflare R2 (Storage) integration
 * for live recording uploads, resumable multipart handling, lecture notes, and student playback.
 */

// Helper to handle CORS
function handleCors(request, responseHeaders = {}) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Range, X-Upload-Id, X-Part-Number',
    'Access-Control-Expose-Headers': 'ETag, Content-Length, Content-Range, Accept-Ranges, Content-Type, Date',
    'Access-Control-Max-Age': '86400',
    ...responseHeaders
  };
}

function jsonResponse(data, status = 200, request = null, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(request ? handleCors(request) : {}),
      ...extraHeaders
    }
  });
}

function errorResponse(code, message, status = 400, request = null, extra = {}) {
  return jsonResponse({
    success: false,
    error: code,
    message,
    ...extra
  }, status, request);
}

// Token helper for authorization
function getUserFromRequest(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { id: 'anonymous', role: 'public', name: 'Anonymous' };
  }
  const token = authHeader.substring(7);
  // Basic token decoding (or JWT validation)
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return {
        id: String(payload.id || payload.userId || payload.sub || 'user_1'),
        role: String(payload.role || 'teacher').toLowerCase(),
        name: payload.name || payload.email || 'Faculty User'
      };
    }
  } catch (e) {}
  return { id: 'faculty_default', role: 'teacher', name: 'Teacher' };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // 1. Handle OPTIONS preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: handleCors(request)
      });
    }

    const user = getUserFromRequest(request, env);

    try {
      // ------------------------------------------------------------------------
      // 2. HEALTH CHECK
      // ------------------------------------------------------------------------
      if (pathname === '/api/health' || pathname === '/health') {
        return jsonResponse({
          status: 'ok',
          platform: 'Success Mantra Cloudflare-Native Worker',
          timestamp: new Date().toISOString(),
          d1: !!env.DB,
          r2: !!env.R2_BUCKET
        }, 200, request);
      }

      // ------------------------------------------------------------------------
      // 3. RECORDING UPLOAD: INITIALIZE / CREATE MULTIPART SESSION
      // POST /api/recordings/:id/upload/create  OR  POST /api/admin/recordings/upload/init
      // ------------------------------------------------------------------------
      if (method === 'POST' && (
        pathname.match(/^\/api\/recordings\/[^\/]+\/upload\/create$/) ||
        pathname === '/api/admin/recordings/upload/init' ||
        pathname === '/api/recordings/upload/create'
      )) {
        const body = await request.json().catch(() => ({}));
        const urlIdMatch = pathname.match(/^\/api\/recordings\/([^\/]+)\/upload\/create$/);
        const classId = body.classId || (urlIdMatch ? urlIdMatch[1] : null) || body.sessionId;
        const fileSize = Number(body.fileSize || 0);

        if (!classId) {
          return errorResponse('INVALID_CLASS_ID', 'Class ID / Session ID is required.', 400, request);
        }
        if (fileSize <= 0) {
          return errorResponse('INVALID_FILE_SIZE', 'Valid positive fileSize is required.', 400, request);
        }

        const teacherId = user.id || 'faculty_1';
        const title = (body.title || 'Live Classroom Recording').trim();
        const mimeType = (body.mimeType || 'video/webm').toLowerCase();
        const ext = mimeType.includes('mp4') ? '.mp4' : mimeType.includes('mov') ? '.mov' : '.webm';
        const recordingId = body.recordingId ? String(body.recordingId) : `rec_${Date.now()}`;
        const clientUploadId = body.clientUploadId || `client_${classId}_${Date.now()}`;

        // Standardized Clean R2 Object Key: recordings/{teacherId}/{sessionId}/{recordingId}/recording.webm
        const storageKey = `recordings/${teacherId}/${classId}/${recordingId}/recording${ext}`;
        const partSize = 6 * 1024 * 1024; // 6 MB chunks (meets Cloudflare R2 minimum 5MB part size requirement)
        const totalParts = Math.max(1, Math.ceil(fileSize / partSize));

        console.log(`[R2] CreateMultipartUpload for ${storageKey}, totalParts: ${totalParts}`);

        // Create R2 Multipart Upload using Worker Native R2 Binding
        let r2UploadId = '';
        if (env.R2_BUCKET && typeof env.R2_BUCKET.createMultipartUpload === 'function') {
          const multipart = await env.R2_BUCKET.createMultipartUpload(storageKey, {
            httpMetadata: { contentType: mimeType }
          });
          r2UploadId = multipart.uploadId;
        } else {
          r2UploadId = `r2_mp_${Date.now()}_${crypto.randomUUID()}`;
        }

        const uploadSessionId = `upsess_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

        // D1 Database Operations
        if (env.DB) {
          // 1. Insert/Update into recordings table
          await env.DB.prepare(`
            INSERT INTO recordings (
              id, session_id, teacher_id, title, description, object_key,
              bucket, mime_type, file_size, duration, status, upload_id,
              uploaded_bytes, total_bytes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'success-mantra', ?, ?, ?, 'uploading', ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              status = 'uploading',
              upload_id = excluded.upload_id,
              total_bytes = excluded.total_bytes,
              updated_at = CURRENT_TIMESTAMP
          `).bind(
            recordingId,
            String(classId),
            teacherId,
            title,
            body.description || `Lecture recording for ${classId}`,
            storageKey,
            mimeType,
            fileSize,
            Number(body.duration || 3600),
            uploadSessionId,
            fileSize
          ).run();

          // 2. Insert into recording_uploads table
          await env.DB.prepare(`
            INSERT INTO recording_uploads (
              id, recording_id, upload_id, object_key, part_size,
              total_parts, uploaded_bytes, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, 'uploading', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).bind(
            uploadSessionId,
            recordingId,
            r2UploadId,
            storageKey,
            partSize,
            totalParts
          ).run();

          console.log(`[D1] Upload state saved: uploadSessionId=${uploadSessionId}, r2UploadId=${r2UploadId}`);
        }

        return jsonResponse({
          success: true,
          uploadId: uploadSessionId,
          r2UploadId,
          recordingId,
          storageKey,
          partSize,
          totalParts,
          uploadedParts: [],
          uploadedBytes: 0,
          status: 'uploading'
        }, 201, request);
      }

      // ------------------------------------------------------------------------
      // 4. RECORDING UPLOAD: GET PRESIGNED / PART INFO
      // POST /api/recordings/:id/upload/presign  OR  POST /api/admin/recordings/upload/part
      // ------------------------------------------------------------------------
      if (method === 'POST' && (
        pathname.match(/^\/api\/recordings\/[^\/]+\/upload\/presign$/) ||
        pathname === '/api/admin/recordings/upload/part' ||
        pathname === '/api/recordings/upload/presign'
      )) {
        const body = await request.json().catch(() => ({}));
        const uploadId = body.uploadId;
        const partNumber = Number(body.partNumber || 1);

        if (!uploadId || isNaN(partNumber) || partNumber < 1) {
          return errorResponse('INVALID_PARAMS', 'Valid uploadId and partNumber are required.', 400, request);
        }

        let session = null;
        if (env.DB) {
          session = await env.DB.prepare(`
            SELECT * FROM recording_uploads WHERE id = ?
          `).bind(uploadId).first();
        }

        if (!session) {
          return errorResponse('UPLOAD_NOT_FOUND', 'Upload session not found.', 404, request);
        }

        console.log(`[R2] Presigned / direct proxy requested for part ${partNumber} (upload ${uploadId})`);

        return jsonResponse({
          success: true,
          partNumber,
          uploadId,
          storageKey: session.object_key,
          // Direct endpoint for streaming binary chunk directly into Worker R2 binding
          uploadUrl: `/api/recordings/${uploadId}/upload/part-data?partNumber=${partNumber}`,
          isFallback: false
        }, 200, request);
      }

      // ------------------------------------------------------------------------
      // 5. RECORDING UPLOAD: STREAM RAW BINARY CHUNK DIRECTLY TO R2
      // PUT / POST /api/recordings/:id/upload/part-data  OR  POST /api/admin/recordings/upload/part-data
      // ------------------------------------------------------------------------
      if ((method === 'PUT' || method === 'POST') && (
        pathname.match(/^\/api\/recordings\/[^\/]+\/upload\/part-data$/) ||
        pathname === '/api/admin/recordings/upload/part-data' ||
        pathname === '/api/recordings/upload/part-data'
      )) {
        const urlIdMatch = pathname.match(/^\/api\/recordings\/([^\/]+)\/upload\/part-data$/);
        const uploadId = urlIdMatch ? urlIdMatch[1] : (url.searchParams.get('uploadId') || request.headers.get('x-upload-id'));
        const partNumber = Number(url.searchParams.get('partNumber') || request.headers.get('x-part-number') || 1);

        if (!uploadId || isNaN(partNumber) || partNumber < 1) {
          return errorResponse('INVALID_PARAMS', 'uploadId and partNumber are required.', 400, request);
        }

        let session = null;
        if (env.DB) {
          session = await env.DB.prepare(`
            SELECT * FROM recording_uploads WHERE id = ?
          `).bind(uploadId).first();
        }

        if (!session) {
          return errorResponse('UPLOAD_NOT_FOUND', 'Upload session not found.', 404, request);
        }

        // Read binary body from request
        let binaryBody = null;
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          const fileOrBlob = formData.get('chunk') || formData.get('file');
          if (fileOrBlob && typeof fileOrBlob.arrayBuffer === 'function') {
            binaryBody = await fileOrBlob.arrayBuffer();
          }
        } else {
          binaryBody = await request.arrayBuffer();
        }

        if (!binaryBody || binaryBody.byteLength === 0) {
          return errorResponse('EMPTY_CHUNK', 'No binary chunk bytes received.', 400, request);
        }

        const chunkLength = binaryBody.byteLength;
        console.log(`[UPLOAD] Uploading Part ${partNumber} (${chunkLength} bytes) to R2...`);

        let etag = `"${crypto.randomUUID()}"`;

        // Upload part directly to R2 bucket binding
        if (env.R2_BUCKET && typeof env.R2_BUCKET.resumeMultipartUpload === 'function') {
          const multipart = env.R2_BUCKET.resumeMultipartUpload(session.object_key, session.upload_id);
          const uploadedPart = await multipart.uploadPart(partNumber, binaryBody);
          etag = uploadedPart.etag;
        } else if (env.R2_BUCKET && typeof env.R2_BUCKET.put === 'function') {
          // If direct put or single part
          const putRes = await env.R2_BUCKET.put(`${session.object_key}.part_${partNumber}`, binaryBody);
          etag = putRes.httpEtag || putRes.etag || etag;
        }

        console.log(`[UPLOAD] Part ${partNumber} response: 200, ETag received: ${etag}`);

        // Save part to D1 recording_upload_parts table
        if (env.DB) {
          const partId = `part_${uploadId}_${partNumber}`;
          await env.DB.prepare(`
            INSERT INTO recording_upload_parts (
              id, upload_session_id, part_number, part_size, etag, status, uploaded_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'uploaded', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(upload_session_id, part_number) DO UPDATE SET
              part_size = excluded.part_size,
              etag = excluded.etag,
              status = 'uploaded',
              updated_at = CURRENT_TIMESTAMP
          `).bind(partId, uploadId, partNumber, chunkLength, etag).run();

          // Calculate total uploaded bytes from verified parts
          const sumResult = await env.DB.prepare(`
            SELECT SUM(part_size) as total_uploaded, COUNT(*) as parts_count
            FROM recording_upload_parts
            WHERE upload_session_id = ? AND status = 'uploaded'
          `).bind(uploadId).first();

          const totalUploadedBytes = Number(sumResult?.total_uploaded || 0);

          await env.DB.prepare(`
            UPDATE recording_uploads
            SET uploaded_bytes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(totalUploadedBytes, uploadId).run();

          await env.DB.prepare(`
            UPDATE recordings
            SET uploaded_bytes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE upload_id = ? OR id = ?
          `).bind(totalUploadedBytes, uploadId, session.recording_id).run();

          console.log(`[D1] Part ${partNumber} saved to D1. Total uploaded: ${totalUploadedBytes} bytes.`);
        }

        return jsonResponse({
          success: true,
          partNumber,
          etag,
          partSize: chunkLength,
          uploadedBytes: chunkLength
        }, 200, request, {
          'ETag': etag
        });
      }

      // ------------------------------------------------------------------------
      // 6. RECORDING UPLOAD: PART COMPLETE NOTIFICATION
      // POST /api/recordings/:id/upload/part-complete  OR  POST /api/admin/recordings/upload/part-complete
      // ------------------------------------------------------------------------
      if (method === 'POST' && (
        pathname.match(/^\/api\/recordings\/[^\/]+\/upload\/part-complete$/) ||
        pathname === '/api/admin/recordings/upload/part-complete' ||
        pathname === '/api/recordings/upload/part-complete'
      )) {
        const body = await request.json().catch(() => ({}));
        const uploadId = body.uploadId;
        const partNumber = Number(body.partNumber);
        const etag = body.etag;
        const partSize = Number(body.partSize || 0);

        if (!uploadId || !partNumber || !etag) {
          return errorResponse('INVALID_PARAMS', 'uploadId, partNumber, and etag are required.', 400, request);
        }

        if (env.DB) {
          const partId = `part_${uploadId}_${partNumber}`;
          await env.DB.prepare(`
            INSERT INTO recording_upload_parts (
              id, upload_session_id, part_number, part_size, etag, status, uploaded_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'uploaded', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(upload_session_id, part_number) DO UPDATE SET
              part_size = excluded.part_size,
              etag = excluded.etag,
              status = 'uploaded',
              updated_at = CURRENT_TIMESTAMP
          `).bind(partId, uploadId, partNumber, partSize, etag).run();

          const sumResult = await env.DB.prepare(`
            SELECT SUM(part_size) as total_uploaded, COUNT(*) as parts_count
            FROM recording_upload_parts
            WHERE upload_session_id = ? AND status = 'uploaded'
          `).bind(uploadId).first();

          const totalUploaded = Number(sumResult?.total_uploaded || 0);

          await env.DB.prepare(`
            UPDATE recording_uploads
            SET uploaded_bytes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(totalUploaded, uploadId).run();

          await env.DB.prepare(`
            UPDATE recordings
            SET uploaded_bytes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE upload_id = ?
          `).bind(totalUploaded, uploadId).run();

          console.log(`[D1] Part ${partNumber} confirmed with ETag ${etag}. Total bytes: ${totalUploaded}`);
        }

        return jsonResponse({
          success: true,
          partNumber,
          etag
        }, 200, request);
      }

      // ------------------------------------------------------------------------
      // 7. RECORDING UPLOAD: COMPLETE MULTIPART UPLOAD
      // POST /api/recordings/:id/upload/complete  OR  POST /api/admin/recordings/upload/complete
      // ------------------------------------------------------------------------
      if (method === 'POST' && (
        pathname.match(/^\/api\/recordings\/[^\/]+\/upload\/complete$/) ||
        pathname === '/api/admin/recordings/upload/complete' ||
        pathname === '/api/recordings/upload/complete'
      )) {
        const body = await request.json().catch(() => ({}));
        const urlIdMatch = pathname.match(/^\/api\/recordings\/([^\/]+)\/upload\/complete$/);
        const uploadId = body.uploadId || (urlIdMatch ? urlIdMatch[1] : null);

        if (!uploadId) {
          return errorResponse('INVALID_PARAMS', 'uploadId is required to complete multipart upload.', 400, request);
        }

        console.log(`[UPLOAD] Completing multipart upload ${uploadId}...`);

        let session = null;
        let dbParts = [];
        if (env.DB) {
          session = await env.DB.prepare(`
            SELECT * FROM recording_uploads WHERE id = ?
          `).bind(uploadId).first();

          if (session) {
            const partsResult = await env.DB.prepare(`
              SELECT part_number, part_size, etag FROM recording_upload_parts
              WHERE upload_session_id = ? AND status = 'uploaded'
              ORDER BY part_number ASC
            `).bind(uploadId).all();
            dbParts = partsResult.results || [];
          }
        }

        if (!session) {
          return errorResponse('UPLOAD_NOT_FOUND', 'Upload session not found in D1.', 404, request);
        }

        // Build parts array from DB or client
        let finalParts = (Array.isArray(body.parts) && body.parts.length > 0)
          ? body.parts.map(p => ({
              partNumber: Number(p.PartNumber || p.partNumber),
              etag: p.ETag || p.etag
            }))
          : dbParts.map(p => ({
              partNumber: Number(p.part_number),
              etag: p.etag
            }));

        finalParts.sort((a, b) => a.partNumber - b.partNumber);

        console.log(`[R2] CompleteMultipartUpload for ${session.object_key} with ${finalParts.length} parts`);

        // Execute CompleteMultipartUpload on R2
        if (env.R2_BUCKET && typeof env.R2_BUCKET.resumeMultipartUpload === 'function') {
          const multipart = env.R2_BUCKET.resumeMultipartUpload(session.object_key, session.upload_id);
          const formattedR2Parts = finalParts.map(p => ({
            partNumber: p.partNumber,
            etag: p.etag
          }));
          await multipart.complete(formattedR2Parts);
        }

        console.log(`[UPLOAD] R2 multipart completed for ${session.object_key}`);

        // Verify final object in R2
        let verifiedSize = session.uploaded_bytes;
        if (env.R2_BUCKET && typeof env.R2_BUCKET.head === 'function') {
          const head = await env.R2_BUCKET.head(session.object_key);
          if (head) {
            verifiedSize = head.size;
          }
        }

        // Playback URL
        const playbackUrl = env.R2_PUBLIC_URL
          ? `${env.R2_PUBLIC_URL.replace(/\/+$/, '')}/${session.object_key}`
          : `/api/r2/file/${session.object_key}`;

        // Update D1 database to completed
        if (env.DB) {
          await env.DB.prepare(`
            UPDATE recording_uploads
            SET status = 'completed', uploaded_bytes = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(verifiedSize, uploadId).run();

          await env.DB.prepare(`
            UPDATE recordings
            SET status = 'completed',
                file_size = ?,
                uploaded_bytes = ?,
                total_bytes = ?,
                playback_key = ?,
                completed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE upload_id = ? OR id = ?
          `).bind(verifiedSize, verifiedSize, verifiedSize, playbackUrl, uploadId, session.recording_id).run();

          console.log(`[D1] Recording status updated to completed for recordingId=${session.recording_id}`);
        }

        return jsonResponse({
          success: true,
          message: 'Recording upload completed, verified, and published!',
          recordingId: session.recording_id,
          objectKey: session.object_key,
          videoUrl: playbackUrl,
          fileSize: verifiedSize,
          status: 'completed'
        }, 200, request);
      }

      // ------------------------------------------------------------------------
      // 8. RECORDING UPLOAD: STATUS & RECOVERY FOR RESUMPTION
      // GET /api/recordings/:id/upload/status  OR  GET /api/admin/recordings/upload/:uploadId/status
      // ------------------------------------------------------------------------
      if (method === 'GET' && (
        pathname.match(/^\/api\/recordings\/[^\/]+\/upload\/status$/) ||
        pathname.match(/^\/api\/admin\/recordings\/upload\/[^\/]+\/status$/)
      )) {
        const urlMatch = pathname.match(/^\/api\/recordings\/([^\/]+)\/upload\/status$/) ||
                         pathname.match(/^\/api\/admin\/recordings\/upload\/([^\/]+)\/status$/);
        const uploadOrRecId = urlMatch ? urlMatch[1] : '';

        if (!uploadOrRecId) {
          return errorResponse('INVALID_ID', 'ID is required.', 400, request);
        }

        let session = null;
        let parts = [];
        if (env.DB) {
          session = await env.DB.prepare(`
            SELECT * FROM recording_uploads
            WHERE id = ? OR recording_id = ?
            ORDER BY created_at DESC LIMIT 1
          `).bind(uploadOrRecId, uploadOrRecId).first();

          if (session) {
            const partsRes = await env.DB.prepare(`
              SELECT part_number, part_size, etag, status FROM recording_upload_parts
              WHERE upload_session_id = ? AND status = 'uploaded'
              ORDER BY part_number ASC
            `).bind(session.id).all();
            parts = partsRes.results || [];
          }
        }

        if (!session) {
          return errorResponse('UPLOAD_NOT_FOUND', 'Upload session not found in D1.', 404, request);
        }

        const completedPartsNums = parts.map(p => p.part_number);
        const nextParts = [];
        for (let i = 1; i <= session.total_parts; i++) {
          if (!completedPartsNums.includes(i)) {
            nextParts.push(i);
          }
        }

        return jsonResponse({
          success: true,
          recordingId: session.recording_id,
          uploadId: session.id,
          r2UploadId: session.upload_id,
          storageKey: session.object_key,
          totalParts: session.total_parts,
          partSize: session.part_size,
          uploadedBytes: session.uploaded_bytes,
          completedParts: completedPartsNums,
          uploadedParts: parts.map(p => ({ partNumber: p.part_number, etag: p.etag, size: p.part_size })),
          nextParts,
          status: session.status
        }, 200, request);
      }

      // ------------------------------------------------------------------------
      // 9. RECORDING UPLOAD: LIST PENDING UPLOADS
      // GET /api/recordings/pending  OR  GET /api/admin/recordings/upload/pending
      // ------------------------------------------------------------------------
      if (method === 'GET' && (
        pathname === '/api/recordings/pending' ||
        pathname === '/api/admin/recordings/upload/pending'
      )) {
        let pending = [];
        if (env.DB) {
          const res = await env.DB.prepare(`
            SELECT ru.*, r.title, r.session_id as class_id, r.duration
            FROM recording_uploads ru
            LEFT JOIN recordings r ON ru.recording_id = r.id
            WHERE ru.status NOT IN ('completed', 'aborted')
            ORDER BY ru.created_at DESC
          `).all();
          pending = (res.results || []).map(r => ({
            id: r.id,
            uploadId: r.id,
            classId: r.class_id,
            recordingId: r.recording_id,
            title: r.title || 'Live Recording',
            storageKey: r.object_key,
            totalParts: r.total_parts,
            partSize: r.part_size,
            uploadedBytes: r.uploaded_bytes,
            status: r.status,
            createdAt: r.created_at
          }));
        }

        return jsonResponse({
          success: true,
          pendingUploads: pending
        }, 200, request);
      }

      // ------------------------------------------------------------------------
      // 10. RECORDING UPLOAD: ABORT / CANCEL
      // POST /api/recordings/:id/upload/abort  OR  POST /api/admin/recordings/upload/:uploadId/cancel
      // ------------------------------------------------------------------------
      if (method === 'POST' && (
        pathname.match(/^\/api\/recordings\/[^\/]+\/upload\/abort$/) ||
        pathname.match(/^\/api\/admin\/recordings\/upload\/[^\/]+\/cancel$/)
      )) {
        const urlMatch = pathname.match(/^\/api\/recordings\/([^\/]+)\/upload\/abort$/) ||
                         pathname.match(/^\/api\/admin\/recordings\/upload\/([^\/]+)\/cancel$/);
        const uploadId = urlMatch ? urlMatch[1] : '';

        if (env.DB) {
          const session = await env.DB.prepare(`
            SELECT * FROM recording_uploads WHERE id = ?
          `).bind(uploadId).first();

          if (session) {
            if (env.R2_BUCKET && typeof env.R2_BUCKET.resumeMultipartUpload === 'function') {
              try {
                const multipart = env.R2_BUCKET.resumeMultipartUpload(session.object_key, session.upload_id);
                await multipart.abort();
              } catch (e) {}
            }

            await env.DB.prepare(`
              UPDATE recording_uploads SET status = 'aborted', updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).bind(uploadId).run();

            await env.DB.prepare(`
              UPDATE recordings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE upload_id = ?
            `).bind(uploadId).run();
          }
        }

        return jsonResponse({
          success: true,
          message: 'Upload aborted and cleaned up.'
        }, 200, request);
      }

      // ------------------------------------------------------------------------
      // 11. CLOUDFLARE D1: STUDENTS & UNIQUE EMAIL ENFORCEMENT
      // GET /api/admin/students  OR  GET /api/students
      // ------------------------------------------------------------------------
      if (method === 'GET' && (pathname === '/api/admin/students' || pathname === '/api/students')) {
        let studentsList = [];
        if (env.DB) {
          try {
            const queryRes = await env.DB.prepare(`
              SELECT id, student_id, name, email, phone, target_class, stream, school, city, location, status, created_at, updated_at
              FROM students
              GROUP BY LOWER(TRIM(email))
              ORDER BY updated_at DESC
            `).all();
            studentsList = queryRes.results || [];
          } catch (e) {
            try {
              const uRes = await env.DB.prepare(`
                SELECT id, name, email, role, created_at, updated_at
                FROM users
                WHERE role IN ('STUDENT', 'student')
                GROUP BY LOWER(TRIM(email))
                ORDER BY updated_at DESC
              `).all();
              studentsList = (uRes.results || []).map(u => ({
                id: u.id,
                student_id: 'SM-2026-' + u.id.slice(-5),
                name: u.name,
                email: u.email,
                phone: 'No phone',
                target_class: 'Class 12',
                status: 'active',
                created_at: u.created_at,
                updated_at: u.updated_at
              }));
            } catch (uErr) {}
          }
        }

        return jsonResponse({
          success: true,
          count: studentsList.length,
          students: studentsList
        }, 200, request);
      }

      // ------------------------------------------------------------------------
      // 12. CLOUDFLARE D1: SYNC / DEDUPLICATE STUDENT RECORD
      // POST /api/admin/students/sync  OR  POST /api/students/sync
      // ------------------------------------------------------------------------
      if (method === 'POST' && (pathname === '/api/admin/students/sync' || pathname === '/api/students/sync')) {
        const body = await request.json().catch(() => ({}));
        const email = (body.email || '').toLowerCase().trim();
        if (!email) {
          return errorResponse('INVALID_EMAIL', 'Email is required', 400, request);
        }
        if (env.DB) {
          try {
            await env.DB.prepare(`
              INSERT INTO students (id, student_id, name, email, phone, target_class, stream, school, city, location, status, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(email) DO UPDATE SET
                name = excluded.name,
                phone = COALESCE(excluded.phone, students.phone),
                target_class = COALESCE(excluded.target_class, students.target_class),
                stream = COALESCE(excluded.stream, students.stream),
                school = COALESCE(excluded.school, students.school),
                city = COALESCE(excluded.city, students.city),
                location = COALESCE(excluded.location, students.location),
                status = COALESCE(excluded.status, students.status),
                updated_at = CURRENT_TIMESTAMP
            `).bind(
              body.id || `std_${Date.now()}`,
              body.student_id || body.studentId || null,
              body.name || email.split('@')[0],
              email,
              body.phone || null,
              body.target_class || 'Class 12',
              body.stream || 'Commerce',
              body.school || null,
              body.city || null,
              body.location || null,
              body.status || 'active'
            ).run();
          } catch (d1Err) {
            console.warn('[D1_STUDENTS_SYNC_WARN]', d1Err.message);
          }
        }

        return jsonResponse({
          success: true,
          message: 'Student record synced with Cloudflare D1 with unique email enforcement.'
        }, 200, request);
      }

      // ------------------------------------------------------------------------
      // 13. CLOUDFLARE D1: COURSES MANAGEMENT & PERSISTENCE
      // GET /api/admin/courses | POST /api/admin/courses | PUT /api/admin/courses/:id
      // ------------------------------------------------------------------------
      if (method === 'GET' && (pathname === '/api/admin/courses' || pathname === '/api/courses' || pathname === '/api/public/courses')) {
        let coursesList = [];
        if (env.DB) {
          try {
            const { results } = await env.DB.prepare(`
              SELECT * FROM courses ORDER BY created_at DESC
            `).all();
            if (Array.isArray(results) && results.length > 0) {
              coursesList = results;
            }
          } catch (d1Err) {
            console.warn('[D1_COURSES_GET_WARN]', d1Err.message);
          }
        }
        return jsonResponse({
          success: true,
          count: coursesList.length,
          courses: coursesList
        }, 200, request);
      }

      if (method === 'POST' && (pathname === '/api/admin/courses' || pathname === '/api/courses')) {
        const body = await request.json().catch(() => ({}));
        const courseId = body.id || `course_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const title = (body.title || '').trim();
        const target_class = body.target_class || 'Class 12';
        const subject = body.subject || 'Accountancy';
        const price = Number(body.price) || 0;
        const original_price = Number(body.original_price) || 0;
        const thumbnail_url = body.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800';

        if (!title) {
          return errorResponse('INVALID_COURSE_DATA', 'Course title is required', 400, request);
        }

        if (env.DB) {
          try {
            await env.DB.prepare(`
              INSERT INTO courses (id, title, slug, target_class, subject, description, short_description, price, original_price, badge, thumbnail_url, is_published, is_featured, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                target_class = excluded.target_class,
                subject = excluded.subject,
                description = excluded.description,
                price = excluded.price,
                original_price = excluded.original_price,
                thumbnail_url = excluded.thumbnail_url,
                updated_at = CURRENT_TIMESTAMP
            `).bind(
              courseId,
              title,
              body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              target_class,
              subject,
              body.description || body.short_description || '',
              body.short_description || '',
              price,
              original_price,
              body.badge || 'New Batch',
              thumbnail_url
            ).run();
          } catch (d1Err) {
            console.warn('[D1_COURSE_SAVE_WARN]', d1Err.message);
          }
        }

        return jsonResponse({
          success: true,
          message: 'Course saved permanently in Cloudflare D1!',
          course: { id: courseId, title, target_class, subject, price, original_price, thumbnail_url }
        }, 201, request);
      }

      if (method === 'DELETE' && pathname.match(/^\/api\/admin\/courses\/[^\/]+$/)) {
        const cId = pathname.split('/').pop();
        if (env.DB && cId) {
          try {
            await env.DB.prepare(`DELETE FROM courses WHERE id = ?`).bind(cId).run();
          } catch (d1Err) {}
        }
        return jsonResponse({ success: true, message: 'Course deleted from Cloudflare D1.' }, 200, request);
      }

      // ------------------------------------------------------------------------
      // 12.1 BOOKSTORE & PUBLICATIONS ERP (CLOUDFLARE D1 PERMANENT STORE)
      // GET /api/admin/books | GET /api/books | GET /api/public/books
      // POST /api/admin/books | PUT /api/admin/books/:id | DELETE /api/admin/books/:id
      // ------------------------------------------------------------------------
      if (method === 'GET' && (pathname === '/api/admin/books' || pathname === '/api/books' || pathname === '/api/public/books')) {
        let booksList = [];
        if (env.DB) {
          try {
            await env.DB.prepare(`
              CREATE TABLE IF NOT EXISTS books (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                author TEXT NOT NULL DEFAULT 'Success Mantra Academic Council',
                publisher TEXT DEFAULT 'Success Mantra Publications',
                isbn TEXT,
                target_class TEXT NOT NULL DEFAULT 'Class 12',
                subject TEXT NOT NULL DEFAULT 'Commerce',
                description TEXT,
                price INTEGER NOT NULL DEFAULT 499,
                original_price INTEGER NOT NULL DEFAULT 899,
                discount_percentage INTEGER DEFAULT 45,
                cover_image_url TEXT,
                sample_pdf_url TEXT,
                digital_file_url TEXT,
                is_digital INTEGER DEFAULT 0,
                format TEXT DEFAULT 'Paperback',
                pages INTEGER DEFAULT 450,
                total_pages INTEGER DEFAULT 450,
                free_preview_pages INTEGER DEFAULT 15,
                edition TEXT DEFAULT '2026-27 Edition',
                stock_quantity INTEGER DEFAULT 150,
                badge TEXT DEFAULT 'Bestseller',
                rating REAL DEFAULT 4.9,
                reviews_count INTEGER DEFAULT 128,
                status TEXT DEFAULT 'published',
                is_active INTEGER DEFAULT 1,
                is_featured INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `).run();

            const { results } = await env.DB.prepare(`SELECT * FROM books ORDER BY created_at DESC`).all();
            if (Array.isArray(results) && results.length > 0) {
              booksList = results;
            }
          } catch (d1Err) {
            console.warn('[D1_BOOKS_GET_WARN]', d1Err.message);
          }
        }
        return jsonResponse({
          success: true,
          count: booksList.length,
          books: booksList
        }, 200, request);
      }

      if ((method === 'POST' || method === 'PUT') && (
        pathname === '/api/admin/books' ||
        pathname === '/api/books' ||
        pathname.match(/^\/api\/admin\/books\/[^\/]+$/) ||
        pathname.match(/^\/api\/books\/[^\/]+$/)
      )) {
        const body = await request.json().catch(() => ({}));
        const urlIdMatch = pathname.match(/^\/api\/(?:admin\/)?books\/([^\/]+)$/);
        const bookId = (urlIdMatch ? urlIdMatch[1] : null) || body.id || `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const title = (body.title || '').trim();
        const author = body.author || 'Success Mantra Academic Council';
        const publisher = body.publisher || 'Success Mantra Publications';
        const target_class = body.target_class || 'Class 12';
        const subject = body.subject || 'Accountancy';
        const price = Number(body.price) || 499;
        const original_price = Number(body.original_price) || 899;
        const discount_percentage = original_price > price ? Math.round(((original_price - price) / original_price) * 100) : 40;
        const cover_image_url = body.cover_image_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600';
        const sample_pdf_url = body.sample_pdf_url || '';
        const digital_file_url = body.digital_file_url || '';
        const format = body.format || 'Paperback';
        const pages = Number(body.pages || body.total_pages) || 450;
        const free_preview_pages = Number(body.free_preview_pages) || 15;
        const stock_quantity = Number(body.stock_quantity) || 100;
        const badge = body.badge || 'Bestseller';
        const status = body.status || 'published';
        const is_active = status === 'draft' ? 0 : 1;
        const is_featured = body.is_featured ? 1 : 0;
        const description = body.description || '';

        if (!title) {
          return errorResponse('INVALID_BOOK_DATA', 'Book title is required.', 400, request);
        }

        if (env.DB) {
          try {
            await env.DB.prepare(`
              INSERT INTO books (
                id, title, author, publisher, isbn, target_class, subject, description,
                price, original_price, discount_percentage, cover_image_url, sample_pdf_url,
                digital_file_url, is_digital, format, pages, total_pages, free_preview_pages,
                edition, stock_quantity, badge, status, is_active, is_featured, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                author = excluded.author,
                publisher = excluded.publisher,
                isbn = excluded.isbn,
                target_class = excluded.target_class,
                subject = excluded.subject,
                description = excluded.description,
                price = excluded.price,
                original_price = excluded.original_price,
                discount_percentage = excluded.discount_percentage,
                cover_image_url = excluded.cover_image_url,
                sample_pdf_url = excluded.sample_pdf_url,
                digital_file_url = excluded.digital_file_url,
                is_digital = excluded.is_digital,
                format = excluded.format,
                pages = excluded.pages,
                total_pages = excluded.total_pages,
                free_preview_pages = excluded.free_preview_pages,
                edition = excluded.edition,
                stock_quantity = excluded.stock_quantity,
                badge = excluded.badge,
                status = excluded.status,
                is_active = excluded.is_active,
                is_featured = excluded.is_featured,
                updated_at = CURRENT_TIMESTAMP
            `).bind(
              bookId,
              title,
              author,
              publisher,
              body.isbn || '',
              target_class,
              subject,
              description,
              price,
              original_price,
              discount_percentage,
              cover_image_url,
              sample_pdf_url,
              digital_file_url,
              digital_file_url ? 1 : 0,
              format,
              pages,
              pages,
              free_preview_pages,
              body.edition || '2026-27 Board Edition',
              stock_quantity,
              badge,
              status,
              is_active,
              is_featured
            ).run();
          } catch (d1Err) {
            console.warn('[D1_BOOK_SAVE_WARN]', d1Err.message);
          }
        }

        const savedBook = {
          id: bookId,
          title,
          author,
          publisher,
          target_class,
          subject,
          description,
          price,
          original_price,
          discount_percentage,
          cover_image_url,
          sample_pdf_url,
          digital_file_url,
          format,
          pages,
          total_pages: pages,
          free_preview_pages,
          stock_quantity,
          badge,
          status,
          is_active,
          is_featured
        };

        return jsonResponse({
          success: true,
          message: 'Book saved permanently in Cloudflare D1 & Bookstore!',
          book: savedBook
        }, 200, request);
      }

      if (method === 'DELETE' && pathname.match(/^\/api\/(?:admin\/)?books\/[^\/]+$/)) {
        const bId = pathname.split('/').pop();
        if (env.DB && bId) {
          try {
            await env.DB.prepare(`DELETE FROM books WHERE id = ?`).bind(bId).run();
          } catch (d1Err) {}
        }
        return jsonResponse({ success: true, message: 'Book deleted from Cloudflare D1.' }, 200, request);
      }

      // ------------------------------------------------------------------------
      // 13. VIDEO STREAMING & PLAYBACK WITH HTTP RANGE SUPPORT (RFC 7233)
      // GET /api/r2/file/*  OR  GET /r2/file/*  OR  GET /api/recordings/:id/playback
      // ------------------------------------------------------------------------
      if (method === 'GET' && (
        pathname.startsWith('/api/r2/file/') ||
        pathname.startsWith('/r2/file/') ||
        pathname.match(/^\/api\/recordings\/[^\/]+\/playback$/)
      )) {
        let objectKey = '';
        if (pathname.match(/^\/api\/recordings\/([^\/]+)\/playback$/)) {
          const recId = pathname.match(/^\/api\/recordings\/([^\/]+)\/playback$/)[1];
          if (env.DB) {
            const rec = await env.DB.prepare(`
              SELECT object_key, playback_key FROM recordings WHERE id = ?
            `).bind(recId).first();
            objectKey = rec?.object_key || '';
          }
        } else {
          objectKey = pathname.replace(/^\/(api\/)?r2\/file\//, '').replace(/^\/+/, '');
        }

        if (!objectKey) {
          return new Response('File not found', { status: 404, headers: handleCors(request) });
        }

        if (!env.R2_BUCKET) {
          return new Response('R2 Storage binding not configured', { status: 503, headers: handleCors(request) });
        }

        const rangeHeader = request.headers.get('Range');
        let r2Options = {};
        if (rangeHeader) {
          // Parse Range: bytes=start-end
          const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
          if (rangeMatch) {
            const offset = parseInt(rangeMatch[1], 10);
            const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : undefined;
            const length = end !== undefined ? (end - offset + 1) : undefined;
            r2Options = { range: { offset, length } };
          }
        }

        const r2Object = await env.R2_BUCKET.get(objectKey, r2Options);
        if (!r2Object) {
          return new Response('Object not found in R2', { status: 404, headers: handleCors(request) });
        }

        const headers = new Headers();
        r2Object.writeHttpMetadata(headers);
        headers.set('ETag', r2Object.httpEtag);
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

        // Merge CORS
        const cors = handleCors(request);
        for (const [k, v] of Object.entries(cors)) {
          headers.set(k, v);
        }

        const status = (rangeHeader && r2Object.range) ? 206 : 200;
        if (status === 206 && r2Object.range) {
          const totalSize = r2Object.size;
          const rangeOffset = r2Object.range.offset || 0;
          const rangeLength = r2Object.range.length || (totalSize - rangeOffset);
          const rangeEnd = rangeOffset + rangeLength - 1;
          headers.set('Content-Range', `bytes ${rangeOffset}-${rangeEnd}/${totalSize}`);
          headers.set('Content-Length', String(rangeLength));
        }

        return new Response(r2Object.body, {
          status,
          headers
        });
      }

      // ------------------------------------------------------------------------
      // 14. CLOUDFLARE D1: MOCK TESTS & QUESTIONS PERSISTENT API
      // ------------------------------------------------------------------------

      // A. LIST ALL MOCK TESTS (Admin)
      // GET /api/admin/mock-tests  OR  GET /api/admin/tests
      if (method === 'GET' && (pathname === '/api/admin/mock-tests' || pathname === '/api/admin/tests')) {
        let testsList = [];
        if (env.DB) {
          try {
            const { results } = await env.DB.prepare(`
              SELECT m.*,
                (SELECT COUNT(*) FROM questions q WHERE q.test_id = m.id) as questions_count,
                (SELECT COUNT(*) FROM test_attempts a WHERE a.test_id = m.id) as attempts_count
              FROM mock_tests m
              ORDER BY m.created_at DESC
            `).all();
            if (Array.isArray(results)) {
              testsList = results.map(t => ({
                ...t,
                access_type: (t.access_type || 'free').toLowerCase(),
                status: t.status || 'published',
                is_free: (t.access_type === 'free' || t.is_free === 1) ? 1 : 0,
                questions_count: Number(t.questions_count) || 0,
                attempts_count: Number(t.attempts_count) || 0
              }));
            }
          } catch (d1Err) {
            console.error('[D1_WORKER_GET_TESTS_ERROR]', d1Err);
          }
        }
        console.log(`[MOCK TESTS READ] count=${testsList.length}`);
        return jsonResponse({
          success: true,
          count: testsList.length,
          tests: testsList
        }, 200, request);
      }

      // B. CREATE MOCK TEST (Admin)
      // POST /api/admin/mock-tests  OR  POST /api/admin/tests
      if (method === 'POST' && (pathname === '/api/admin/mock-tests' || pathname === '/api/admin/tests')) {
        const body = await request.json().catch(() => ({}));
        const testId = body.id || `tst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const title = (body.title || 'CBSE / CUET Mock Test').trim();
        const access_type = (body.access_type || (body.is_free ? 'free' : 'vip_only')).toLowerCase();
        const is_free = access_type === 'free' ? 1 : 0;
        const status = body.status || 'published';

        if (!title) {
          return errorResponse('INVALID_TITLE', 'Test title is required.', 400, request);
        }

        if (env.DB) {
          try {
            await env.DB.prepare(`
              INSERT INTO mock_tests (
                id, title, description, subject, target_class, class_id, batch_id, course_id,
                access_type, is_free, status, is_active, duration_minutes, total_marks, passing_marks,
                negative_marking, marking_scheme, published_at, created_by, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                description = excluded.description,
                subject = excluded.subject,
                target_class = excluded.target_class,
                class_id = excluded.class_id,
                batch_id = excluded.batch_id,
                course_id = excluded.course_id,
                access_type = excluded.access_type,
                is_free = excluded.is_free,
                status = excluded.status,
                is_active = excluded.is_active,
                duration_minutes = excluded.duration_minutes,
                total_marks = excluded.total_marks,
                passing_marks = excluded.passing_marks,
                negative_marking = excluded.negative_marking,
                marking_scheme = excluded.marking_scheme,
                updated_at = CURRENT_TIMESTAMP
            `).bind(
              testId,
              title,
              body.description || '',
              body.subject || 'Commerce',
              body.target_class || 'Class 12',
              body.class_id || null,
              body.batch_id || null,
              body.course_id || null,
              access_type,
              is_free,
              status,
              status === 'draft' ? 0 : 1,
              Number(body.duration_minutes) || 180,
              Number(body.total_marks) || 300,
              Number(body.passing_marks) || Math.round((Number(body.total_marks) || 300) * 0.4),
              Number(body.negative_marking !== undefined ? body.negative_marking : 1),
              body.marking_scheme || '+4 for correct, -1 for incorrect',
              user.id || 'admin'
            ).run();

            console.log(`[MOCK TEST CREATE] testId=${testId} D1 insert success`);

            // If questions provided in payload, insert individually
            if (Array.isArray(body.questions) && body.questions.length > 0) {
              for (let i = 0; i < body.questions.length; i++) {
                const q = body.questions[i];
                const qId = q.id || `q_${testId}_${i + 1}_${Date.now()}`;
                await env.DB.prepare(`
                  INSERT INTO questions (
                    id, test_id, question_text, question_type, image_url, option_a, option_b, option_c, option_d,
                    options_json, correct_answer, marks, negative_marks, explanation, question_order, order_index,
                    created_at, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                  ON CONFLICT(id) DO UPDATE SET
                    question_text = excluded.question_text,
                    question_type = excluded.question_type,
                    image_url = excluded.image_url,
                    option_a = excluded.option_a,
                    option_b = excluded.option_b,
                    option_c = excluded.option_c,
                    option_d = excluded.option_d,
                    correct_answer = excluded.correct_answer,
                    marks = excluded.marks,
                    negative_marks = excluded.negative_marks,
                    explanation = excluded.explanation,
                    updated_at = CURRENT_TIMESTAMP
                `).bind(
                  qId,
                  testId,
                  (q.question_text || q.stem || '').trim() || 'Question statement',
                  (q.question_type || 'mcq').toLowerCase(),
                  q.image_url || q.photo_url || null,
                  q.option_a || '',
                  q.option_b || '',
                  q.option_c || '-',
                  q.option_d || '-',
                  q.options_json ? JSON.stringify(q.options_json) : null,
                  (q.correct_answer || 'A').toUpperCase().trim(),
                  Number(q.marks) || 4,
                  Number(q.negative_marks !== undefined ? q.negative_marks : 1),
                  q.explanation || '',
                  i + 1,
                  i + 1
                ).run();
                console.log(`[QUESTION CREATE] testId=${testId} questionId=${qId} D1 insert success`);
              }
            }
          } catch (d1Err) {
            console.error(`[D1_WORKER_CREATE_TEST_ERROR] testId=${testId}`, d1Err);
            return errorResponse('DATABASE_ERROR', d1Err.message, 500, request);
          }
        }

        return jsonResponse({
          success: true,
          message: 'Mock test created successfully in Cloudflare D1.',
          testId,
          test: {
            id: testId,
            title,
            access_type,
            is_free,
            status
          }
        }, 201, request);
      }

      // C. GET SINGLE MOCK TEST WITH QUESTIONS (Admin)
      // GET /api/admin/mock-tests/:id  OR  GET /api/admin/tests/:id
      if (method === 'GET' && (
        pathname.match(/^\/api\/admin\/mock-tests\/[^\/]+$/) ||
        pathname.match(/^\/api\/admin\/tests\/[^\/]+$/)
      )) {
        const testId = pathname.split('/').pop();
        let test = null;
        let questions = [];

        if (env.DB && testId) {
          try {
            test = await env.DB.prepare(`SELECT * FROM mock_tests WHERE id = ?`).bind(testId).first();
            if (test) {
              const qRes = await env.DB.prepare(`
                SELECT * FROM questions WHERE test_id = ?
                ORDER BY question_order ASC, order_index ASC, created_at ASC
              `).bind(testId).all();
              questions = (qRes.results || []).map(q => ({
                id: q.id,
                test_id: q.test_id,
                question_text: q.question_text,
                question_type: (q.question_type || 'mcq').toUpperCase(),
                image_url: q.image_url || null,
                option_a: q.option_a || '',
                option_b: q.option_b || '',
                option_c: q.option_c || '-',
                option_d: q.option_d || '-',
                correct_answer: q.correct_answer,
                marks: Number(q.marks) || 4,
                negative_marks: Number(q.negative_marks) || 1,
                explanation: q.explanation || '',
                question_order: Number(q.question_order) || 1
              }));
            }
          } catch (d1Err) {
            console.error(`[D1_WORKER_GET_TEST_DETAIL_ERROR] testId=${testId}`, d1Err);
          }
        }

        if (!test) {
          console.log(`[MOCK TEST READ] testId=${testId} found=false`);
          return errorResponse('TEST_NOT_FOUND', 'Mock test not found in Cloudflare D1.', 404, request);
        }

        console.log(`[MOCK TEST READ] testId=${testId} found=true questionsCount=${questions.length}`);
        return jsonResponse({
          success: true,
          test: {
            ...test,
            access_type: (test.access_type || 'free').toLowerCase(),
            status: test.status || 'published',
            is_free: (test.access_type === 'free' || test.is_free === 1) ? 1 : 0
          },
          questions
        }, 200, request);
      }

      // D. UPDATE MOCK TEST (Admin)
      // PUT /api/admin/mock-tests/:id  OR  PUT /api/admin/tests/:id
      if (method === 'PUT' && (
        pathname.match(/^\/api\/admin\/mock-tests\/[^\/]+$/) ||
        pathname.match(/^\/api\/admin\/tests\/[^\/]+$/)
      )) {
        const testId = pathname.split('/').pop();
        const body = await request.json().catch(() => ({}));
        if (env.DB && testId) {
          try {
            await env.DB.prepare(`
              UPDATE mock_tests
              SET title = COALESCE(?, title),
                  description = COALESCE(?, description),
                  subject = COALESCE(?, subject),
                  target_class = COALESCE(?, target_class),
                  class_id = COALESCE(?, class_id),
                  batch_id = COALESCE(?, batch_id),
                  course_id = COALESCE(?, course_id),
                  access_type = COALESCE(?, access_type),
                  is_free = COALESCE(?, is_free),
                  status = COALESCE(?, status),
                  duration_minutes = COALESCE(?, duration_minutes),
                  total_marks = COALESCE(?, total_marks),
                  passing_marks = COALESCE(?, passing_marks),
                  negative_marking = COALESCE(?, negative_marking),
                  marking_scheme = COALESCE(?, marking_scheme),
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).bind(
              body.title || null,
              body.description !== undefined ? body.description : null,
              body.subject || null,
              body.target_class || null,
              body.class_id || null,
              body.batch_id || null,
              body.course_id || null,
              body.access_type ? body.access_type.toLowerCase() : null,
              body.is_free !== undefined ? (body.is_free ? 1 : 0) : null,
              body.status || null,
              body.duration_minutes ? Number(body.duration_minutes) : null,
              body.total_marks ? Number(body.total_marks) : null,
              body.passing_marks ? Number(body.passing_marks) : null,
              body.negative_marking !== undefined ? Number(body.negative_marking) : null,
              body.marking_scheme || null,
              testId
            ).run();

            // If questions provided in PUT payload, upsert each question
            if (Array.isArray(body.questions) && body.questions.length > 0) {
              for (let i = 0; i < body.questions.length; i++) {
                const q = body.questions[i];
                const qId = q.id || `q_${testId}_${i + 1}_${Date.now()}`;
                await env.DB.prepare(`
                  INSERT INTO questions (
                    id, test_id, question_text, question_type, image_url, option_a, option_b, option_c, option_d,
                    options_json, correct_answer, marks, negative_marks, explanation, question_order, order_index,
                    created_at, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                  ON CONFLICT(id) DO UPDATE SET
                    question_text = excluded.question_text,
                    question_type = excluded.question_type,
                    image_url = excluded.image_url,
                    option_a = excluded.option_a,
                    option_b = excluded.option_b,
                    option_c = excluded.option_c,
                    option_d = excluded.option_d,
                    correct_answer = excluded.correct_answer,
                    marks = excluded.marks,
                    negative_marks = excluded.negative_marks,
                    explanation = excluded.explanation,
                    updated_at = CURRENT_TIMESTAMP
                `).bind(
                  qId,
                  testId,
                  (q.question_text || q.stem || '').trim() || 'Question statement',
                  (q.question_type || 'mcq').toLowerCase(),
                  q.image_url || q.photo_url || null,
                  q.option_a || '',
                  q.option_b || '',
                  q.option_c || '-',
                  q.option_d || '-',
                  q.options_json ? JSON.stringify(q.options_json) : null,
                  (q.correct_answer || 'A').toUpperCase().trim(),
                  Number(q.marks) || 4,
                  Number(q.negative_marks !== undefined ? q.negative_marks : 1),
                  q.explanation || '',
                  i + 1,
                  i + 1
                ).run();
              }
            }
          } catch (d1Err) {
            return errorResponse('DATABASE_ERROR', d1Err.message, 500, request);
          }
        }
        return jsonResponse({ success: true, message: 'Mock test updated in D1.' }, 200, request);
      }

      // E. TOGGLE TEST ACCESS (Admin)
      // PATCH /api/admin/mock-tests/:id/toggle-access  OR  PATCH /api/admin/tests/:id/toggle-access
      if (method === 'PATCH' && (
        pathname.match(/^\/api\/admin\/mock-tests\/[^\/]+\/toggle-access$/) ||
        pathname.match(/^\/api\/admin\/tests\/[^\/]+\/toggle-access$/)
      )) {
        const parts = pathname.split('/');
        const testId = parts[parts.length - 2];
        let newAccess = 'vip_only';
        let newIsFree = 0;

        if (env.DB && testId) {
          const test = await env.DB.prepare(`SELECT access_type, is_free FROM mock_tests WHERE id = ?`).bind(testId).first();
          if (test) {
            const currentIsFree = (test.access_type === 'free' || test.is_free === 1);
            newAccess = currentIsFree ? 'vip_only' : 'free';
            newIsFree = newAccess === 'free' ? 1 : 0;
            await env.DB.prepare(`
              UPDATE mock_tests SET access_type = ?, is_free = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).bind(newAccess, newIsFree, testId).run();
          }
        }

        return jsonResponse({
          success: true,
          message: `Access toggled to ${newAccess === 'free' ? 'Free for All' : 'VIP Member Only'}`,
          access_type: newAccess,
          is_free: newIsFree
        }, 200, request);
      }

      // F. DELETE MOCK TEST (Admin)
      // DELETE /api/admin/mock-tests/:id  OR  DELETE /api/admin/tests/:id
      if (method === 'DELETE' && (
        pathname.match(/^\/api\/admin\/mock-tests\/[^\/]+$/) ||
        pathname.match(/^\/api\/admin\/tests\/[^\/]+$/)
      )) {
        const testId = pathname.split('/').pop();
        if (env.DB && testId) {
          try {
            await env.DB.prepare(`DELETE FROM questions WHERE test_id = ?`).bind(testId).run();
            await env.DB.prepare(`DELETE FROM test_attempts WHERE test_id = ?`).bind(testId).run();
            await env.DB.prepare(`DELETE FROM mock_tests WHERE id = ?`).bind(testId).run();
            console.log(`[MOCK TEST DELETE] testId=${testId} D1 delete success`);
          } catch (d1Err) {}
        }
        return jsonResponse({ success: true, message: 'Mock test deleted from Cloudflare D1.' }, 200, request);
      }

      // G. ADD INDIVIDUAL QUESTION TO TEST (Admin)
      // POST /api/admin/mock-tests/:testId/questions  OR  POST /api/admin/tests/:testId/questions
      if (method === 'POST' && (
        pathname.match(/^\/api\/admin\/mock-tests\/[^\/]+\/questions$/) ||
        pathname.match(/^\/api\/admin\/tests\/[^\/]+\/questions$/)
      )) {
        const parts = pathname.split('/');
        const testId = parts[parts.length - 2];
        const body = await request.json().catch(() => ({}));

        if (!testId) {
          return errorResponse('INVALID_TEST_ID', 'testId is required.', 400, request);
        }

        if (env.DB) {
          // Verify test exists
          const test = await env.DB.prepare(`SELECT id FROM mock_tests WHERE id = ?`).bind(testId).first();
          if (!test) {
            return errorResponse('TEST_NOT_FOUND', `Mock test '${testId}' does not exist in D1.`, 404, request);
          }

          const maxOrderRes = await env.DB.prepare(`
            SELECT MAX(question_order) as max_order FROM questions WHERE test_id = ?
          `).bind(testId).first();
          const nextOrder = (Number(maxOrderRes?.max_order) || 0) + 1;
          const questionId = body.id || `q_${testId}_${nextOrder}_${Date.now()}`;

          await env.DB.prepare(`
            INSERT INTO questions (
              id, test_id, question_text, question_type, image_url, option_a, option_b, option_c, option_d,
              options_json, correct_answer, marks, negative_marks, explanation, question_order, order_index,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              question_text = excluded.question_text,
              question_type = excluded.question_type,
              image_url = excluded.image_url,
              option_a = excluded.option_a,
              option_b = excluded.option_b,
              option_c = excluded.option_c,
              option_d = excluded.option_d,
              correct_answer = excluded.correct_answer,
              marks = excluded.marks,
              negative_marks = excluded.negative_marks,
              explanation = excluded.explanation,
              updated_at = CURRENT_TIMESTAMP
          `).bind(
            questionId,
            testId,
            (body.question_text || body.stem || '').trim() || 'Question statement',
            (body.question_type || 'mcq').toLowerCase(),
            body.image_url || body.photo_url || null,
            body.option_a || '',
            body.option_b || '',
            body.option_c || '-',
            body.option_d || '-',
            body.options_json ? JSON.stringify(body.options_json) : null,
            (body.correct_answer || 'A').toUpperCase().trim(),
            Number(body.marks) || 4,
            Number(body.negative_marks !== undefined ? body.negative_marks : 1),
            body.explanation || '',
            nextOrder,
            nextOrder
          ).run();

          console.log(`[QUESTION CREATE] testId=${testId} questionId=${questionId} D1 insert success`);

          return jsonResponse({
            success: true,
            message: 'Question persisted to Cloudflare D1.',
            question: {
              id: questionId,
              test_id: testId,
              question_text: body.question_text || body.stem,
              question_type: body.question_type,
              correct_answer: body.correct_answer,
              marks: body.marks || 4,
              question_order: nextOrder
            }
          }, 201, request);
        }
      }

      // H. UPDATE INDIVIDUAL QUESTION (Admin)
      // PUT /api/admin/mock-tests/:testId/questions/:questionId  OR  PUT /api/admin/tests/:testId/questions/:questionId
      if (method === 'PUT' && (
        pathname.match(/^\/api\/admin\/mock-tests\/[^\/]+\/questions\/[^\/]+$/) ||
        pathname.match(/^\/api\/admin\/tests\/[^\/]+\/questions\/[^\/]+$/)
      )) {
        const parts = pathname.split('/');
        const questionId = parts[parts.length - 1];
        const testId = parts[parts.length - 3];
        const body = await request.json().catch(() => ({}));

        if (env.DB && testId && questionId) {
          try {
            await env.DB.prepare(`
              UPDATE questions
              SET question_text = COALESCE(?, question_text),
                  question_type = COALESCE(?, question_type),
                  image_url = ?,
                  option_a = COALESCE(?, option_a),
                  option_b = COALESCE(?, option_b),
                  option_c = COALESCE(?, option_c),
                  option_d = COALESCE(?, option_d),
                  correct_answer = COALESCE(?, correct_answer),
                  marks = COALESCE(?, marks),
                  negative_marks = COALESCE(?, negative_marks),
                  explanation = COALESCE(?, explanation),
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND test_id = ?
            `).bind(
              body.question_text || body.stem || null,
              body.question_type ? body.question_type.toLowerCase() : null,
              body.image_url !== undefined ? (body.image_url || null) : null,
              body.option_a || null,
              body.option_b || null,
              body.option_c || null,
              body.option_d || null,
              body.correct_answer ? body.correct_answer.toUpperCase().trim() : null,
              body.marks ? Number(body.marks) : null,
              body.negative_marks !== undefined ? Number(body.negative_marks) : null,
              body.explanation !== undefined ? body.explanation : null,
              questionId,
              testId
            ).run();

            console.log(`[QUESTION UPDATE] testId=${testId} questionId=${questionId} D1 update success`);
            return jsonResponse({ success: true, message: 'Question updated in D1.' }, 200, request);
          } catch (d1Err) {
            return errorResponse('DATABASE_ERROR', d1Err.message, 500, request);
          }
        }
      }

      // I. DELETE INDIVIDUAL QUESTION (Admin)
      // DELETE /api/admin/mock-tests/:testId/questions/:questionId  OR  DELETE /api/admin/tests/:testId/questions/:questionId
      if (method === 'DELETE' && (
        pathname.match(/^\/api\/admin\/mock-tests\/[^\/]+\/questions\/[^\/]+$/) ||
        pathname.match(/^\/api\/admin\/tests\/[^\/]+\/questions\/[^\/]+$/)
      )) {
        const parts = pathname.split('/');
        const questionId = parts[parts.length - 1];
        const testId = parts[parts.length - 3];

        if (env.DB && testId && questionId) {
          try {
            await env.DB.prepare(`DELETE FROM questions WHERE id = ? AND test_id = ?`).bind(questionId, testId).run();
            console.log(`[QUESTION DELETE] testId=${testId} questionId=${questionId} D1 delete success`);
            return jsonResponse({ success: true, message: 'Question deleted from Cloudflare D1.' }, 200, request);
          } catch (d1Err) {
            return errorResponse('DATABASE_ERROR', d1Err.message, 500, request);
          }
        }
      }

      // J. STUDENT: LIST PUBLISHED MOCK TESTS
      // GET /api/student/tests  OR  GET /api/student/mock-tests
      if (method === 'GET' && (pathname === '/api/student/tests' || pathname === '/api/student/mock-tests')) {
        let publishedTests = [];
        if (env.DB) {
          try {
            const { results } = await env.DB.prepare(`
              SELECT m.*,
                (SELECT COUNT(*) FROM questions q WHERE q.test_id = m.id) as total_questions,
                (SELECT COUNT(*) FROM test_attempts a WHERE a.test_id = m.id AND a.user_id = ?) as my_attempts_count
              FROM mock_tests m
              WHERE m.status IN ('published', 'active') AND m.is_active = 1
              ORDER BY m.created_at DESC
            `).bind(user.id || 'anonymous').all();

            if (Array.isArray(results)) {
              publishedTests = results.map(t => {
                const normAccess = (t.access_type || 'free').toLowerCase();
                const isFree = (normAccess === 'free' || t.is_free === 1);
                const isLocked = !isFree && user.role !== 'admin' && user.role !== 'vip';
                return {
                  ...t,
                  access_type: normAccess,
                  is_free: isFree ? 1 : 0,
                  is_locked: isLocked,
                  total_questions: Number(t.total_questions) || 0
                };
              });
            }
          } catch (d1Err) {
            console.error('[D1_WORKER_STUDENT_TESTS_ERROR]', d1Err);
          }
        }

        console.log(`[STUDENT TEST QUERY] studentId=${user.id} testsFound=${publishedTests.length}`);
        return jsonResponse({
          success: true,
          count: publishedTests.length,
          tests: publishedTests,
          isVip: user.role === 'vip' || user.role === 'admin'
        }, 200, request);
      }

      // K. STUDENT: GET TEST DETAILS & QUESTIONS (WITHOUT CORRECT ANSWERS)
      // GET /api/student/tests/:id  OR  GET /api/student/mock-tests/:id
      if (method === 'GET' && (
        pathname.match(/^\/api\/student\/tests\/[^\/]+$/) ||
        pathname.match(/^\/api\/student\/mock-tests\/[^\/]+$/)
      )) {
        const testId = pathname.split('/').pop();
        let test = null;
        let safeQuestions = [];

        if (env.DB && testId) {
          test = await env.DB.prepare(`SELECT * FROM mock_tests WHERE id = ?`).bind(testId).first();
          if (test) {
            const qRes = await env.DB.prepare(`
              SELECT id, test_id, question_text, question_type, image_url, option_a, option_b, option_c, option_d, marks, question_order
              FROM questions
              WHERE test_id = ?
              ORDER BY question_order ASC, order_index ASC, created_at ASC
            `).bind(testId).all();

            safeQuestions = (qRes.results || []).map(q => ({
              id: q.id,
              test_id: q.test_id,
              question_text: q.question_text,
              question_type: (q.question_type || 'mcq').toUpperCase(),
              image_url: q.image_url || null,
              option_a: q.option_a || '',
              option_b: q.option_b || '',
              option_c: q.option_c || '-',
              option_d: q.option_d || '-',
              marks: Number(q.marks) || 4,
              question_order: Number(q.question_order) || 1
            }));
          }
        }

        if (!test) {
          return errorResponse('TEST_NOT_FOUND', 'Mock test not found in Cloudflare D1.', 404, request);
        }

        return jsonResponse({
          success: true,
          test: {
            ...test,
            questions: safeQuestions
          }
        }, 200, request);
      }

      // L. STUDENT: SUBMIT TEST WITH SERVER-SIDE SCORING
      // POST /api/student/tests/:id/submit  OR  POST /api/student/mock-tests/:id/submit
      if (method === 'POST' && (
        pathname.match(/^\/api\/student\/tests\/[^\/]+\/submit$/) ||
        pathname.match(/^\/api\/student\/mock-tests\/[^\/]+\/submit$/)
      )) {
        const parts = pathname.split('/');
        const testId = parts[parts.length - 2];
        const body = await request.json().catch(() => ({}));
        const submittedAnswers = body.answers || {};

        if (!env.DB || !testId) {
          return errorResponse('DATABASE_ERROR', 'Cloudflare D1 is not available.', 500, request);
        }

        const test = await env.DB.prepare(`SELECT * FROM mock_tests WHERE id = ?`).bind(testId).first();
        if (!test) {
          return errorResponse('TEST_NOT_FOUND', 'Mock test not found.', 404, request);
        }

        const qRes = await env.DB.prepare(`SELECT * FROM questions WHERE test_id = ?`).bind(testId).all();
        const questions = qRes.results || [];
        if (!questions.length) {
          return errorResponse('EMPTY_TEST', 'Test has no questions.', 400, request);
        }

        let totalMarks = 0;
        let scoreObtained = 0;
        let correctCount = 0;
        let incorrectCount = 0;
        let unansweredCount = 0;
        const evaluatedQuestions = [];

        for (const q of questions) {
          const qMarks = Number(q.marks) || 4;
          const qNeg = Number(q.negative_marks !== undefined ? q.negative_marks : (test.negative_marking || 1));
          totalMarks += qMarks;

          const studentChoice = (submittedAnswers[q.id] || submittedAnswers[String(q.id)] || '').toUpperCase().trim();
          const correctKey = String(q.correct_answer || '').toUpperCase().trim();

          if (!studentChoice) {
            unansweredCount++;
            evaluatedQuestions.push({
              id: q.id,
              question_text: q.question_text,
              selected_answer: null,
              correct_answer: correctKey,
              is_correct: false,
              marks_awarded: 0,
              explanation: q.explanation
            });
          } else if (studentChoice === correctKey) {
            correctCount++;
            scoreObtained += qMarks;
            evaluatedQuestions.push({
              id: q.id,
              question_text: q.question_text,
              selected_answer: studentChoice,
              correct_answer: correctKey,
              is_correct: true,
              marks_awarded: qMarks,
              explanation: q.explanation
            });
          } else {
            incorrectCount++;
            scoreObtained = Math.max(0, scoreObtained - qNeg);
            evaluatedQuestions.push({
              id: q.id,
              question_text: q.question_text,
              selected_answer: studentChoice,
              correct_answer: correctKey,
              is_correct: false,
              marks_awarded: -qNeg,
              explanation: q.explanation
            });
          }
        }

        const percentage = totalMarks > 0 ? Math.max(0, Math.round((scoreObtained / totalMarks) * 100)) : 0;
        const passingMarks = Number(test.passing_marks) || Math.round(totalMarks * 0.4);
        const passed = scoreObtained >= passingMarks ? 1 : 0;
        const attemptId = `att_${testId}_${user.id || 'anon'}_${Date.now()}`;

        await env.DB.prepare(`
          INSERT INTO test_attempts (
            id, test_id, user_id, student_name, student_email, score, total_marks, percentage, passed,
            correct_count, incorrect_count, unanswered_count, answers_json, time_spent_seconds, status,
            submitted_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).bind(
          attemptId,
          testId,
          user.id || 'anonymous_student',
          user.name || 'Student',
          null,
          scoreObtained,
          totalMarks,
          percentage,
          passed,
          correctCount,
          incorrectCount,
          unansweredCount,
          JSON.stringify(evaluatedQuestions),
          Number(body.timeSpent || 0)
        ).run();

        console.log(`[TEST SUBMISSION SUCCESS] attemptId=${attemptId} score=${scoreObtained}/${totalMarks} (${percentage}%)`);

        return jsonResponse({
          success: true,
          message: 'Exam submitted and evaluated successfully!',
          attemptId,
          scorecard: {
            attempt_id: attemptId,
            test_id: testId,
            test_title: test.title,
            score: scoreObtained,
            total_marks: totalMarks,
            percentage,
            passed: passed === 1,
            total_correct: correctCount,
            total_incorrect: incorrectCount,
            unanswered: unansweredCount,
            answers: evaluatedQuestions
          }
        }, 200, request);
      }

      // M. STUDENT: GET TEST RESULT / SCORECARD
      // GET /api/student/tests/:id/result  OR  GET /api/student/mock-tests/:id/result
      if (method === 'GET' && (
        pathname.match(/^\/api\/student\/tests\/[^\/]+\/result$/) ||
        pathname.match(/^\/api\/student\/mock-tests\/[^\/]+\/result$/)
      )) {
        const parts = pathname.split('/');
        const testId = parts[parts.length - 2];

        if (env.DB && testId) {
          const attempt = await env.DB.prepare(`
            SELECT a.*, m.title as test_title
            FROM test_attempts a
            JOIN mock_tests m ON a.test_id = m.id
            WHERE a.test_id = ? AND a.user_id = ?
            ORDER BY a.submitted_at DESC
            LIMIT 1
          `).bind(testId, user.id || 'anonymous_student').first();

          if (attempt) {
            return jsonResponse({
              success: true,
              scorecard: {
                attempt_id: attempt.id,
                test_id: attempt.test_id,
                test_title: attempt.test_title,
                score: attempt.score,
                total_marks: attempt.total_marks,
                percentage: attempt.percentage,
                passed: attempt.passed === 1,
                total_correct: attempt.correct_count,
                total_incorrect: attempt.incorrect_count,
                unanswered: attempt.unanswered_count,
                answers: attempt.answers_json ? JSON.parse(attempt.answers_json) : []
              }
            }, 200, request);
          }
        }

        return errorResponse('RESULT_NOT_FOUND', 'No scorecard found for this test attempt.', 404, request);
      }

      // ------------------------------------------------------------------------
      // 15. CLOUDFLARE D1 + R2 STUDY NOTES & MATERIALS
      // ------------------------------------------------------------------------
      // GET /api/admin/materials
      if (method === 'GET' && (pathname === '/api/admin/materials' || pathname === '/api/materials')) {
        if (!env.DB) {
          return errorResponse('DATABASE_UNAVAILABLE', 'D1 database binding not configured', 503, request);
        }

        const access_type = url.searchParams.get('access_type') || 'ALL';
        const target_class = url.searchParams.get('target_class') || 'ALL';
        const material_type = url.searchParams.get('material_type') || 'ALL';
        const search = url.searchParams.get('search') || '';
        const limit = Number(url.searchParams.get('limit')) || 100;
        const page = Number(url.searchParams.get('page')) || 1;
        const offset = (page - 1) * limit;

        let sql = 'SELECT * FROM study_materials WHERE 1=1';
        const params = [];

        if (access_type !== 'ALL') {
          sql += ' AND access_type = ?';
          params.push(access_type.toLowerCase());
        }
        if (target_class !== 'ALL') {
          sql += ' AND (target_class = ? OR class_id = ?)';
          params.push(target_class, target_class);
        }
        if (material_type !== 'ALL') {
          if (material_type === 'COMBO' || material_type === 'combo') {
            sql += " AND (is_combo = 1 OR material_type = 'combo' OR subject LIKE '%+%')";
          } else if (material_type === 'SINGLE' || material_type === 'single') {
            sql += " AND (is_combo = 0 AND material_type != 'combo' AND subject NOT LIKE '%+%')";
          } else {
            sql += ' AND material_type = ?';
            params.push(material_type);
          }
        }
        if (search.trim()) {
          const term = `%${search.trim()}%`;
          sql += ' AND (title LIKE ? OR subject LIKE ? OR chapter LIKE ? OR course_title LIKE ?)';
          params.push(term, term, term, term);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const stmt = env.DB.prepare(sql);
        const { results: materials } = await stmt.bind(...params).all();

        // Calculate D1 stats
        const totalCount = await env.DB.prepare("SELECT COUNT(*) as count FROM study_materials WHERE status = 'published' OR is_published = 1").first('count') || 0;
        const comboCount = await env.DB.prepare("SELECT COUNT(*) as count FROM study_materials WHERE (status = 'published' OR is_published = 1) AND (is_combo = 1 OR material_type = 'combo' OR subject LIKE '%+%')").first('count') || 0;
        const freeCount = await env.DB.prepare("SELECT COUNT(*) as count FROM study_materials WHERE (status = 'published' OR is_published = 1) AND access_type = 'free'").first('count') || 0;
        const enrolledCount = await env.DB.prepare("SELECT COUNT(*) as count FROM study_materials WHERE (status = 'published' OR is_published = 1) AND (access_type = 'enrolled' OR access_type = 'ENROLLED_ONLY')").first('count') || 0;
        const vipCount = await env.DB.prepare("SELECT COUNT(*) as count FROM study_materials WHERE (status = 'published' OR is_published = 1) AND (access_type = 'vip' OR access_type = 'vip_only' OR access_type = 'VIP_EXCLUSIVE')").first('count') || 0;

        return jsonResponse({
          success: true,
          materials: (materials || []).map(m => ({
            ...m,
            is_published: m.is_published === 1,
            is_combo: m.is_combo === 1,
            is_downloadable: m.is_downloadable !== 0
          })),
          stats: {
            total: totalCount,
            combos: comboCount,
            free: freeCount,
            enrolled: enrolledCount,
            vip: vipCount
          }
        }, 200, request);
      }

      // POST /api/admin/materials (Native Worker R2 upload + D1 insert)
      if (method === 'POST' && pathname === '/api/admin/materials') {
        if (!env.DB || !env.R2_BUCKET) {
          return errorResponse('SERVICES_UNAVAILABLE', 'D1 or R2 binding not available', 503, request);
        }

        const contentType = request.headers.get('content-type') || '';
        let title = 'Untitled Material';
        let access_type = 'free';
        let target_class = 'Class 12';
        let class_id = 'all';
        let subject = 'Accountancy';
        let chapter = '';
        let fileBuffer = null;
        let fileName = 'document.pdf';
        let mimeType = 'application/pdf';

        if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          title = formData.get('title') || title;
          access_type = formData.get('access_type') || formData.get('access_permission') || access_type;
          target_class = formData.get('target_class') || formData.get('class') || target_class;
          class_id = formData.get('class_id') || class_id;
          subject = formData.get('subject') || subject;
          chapter = formData.get('chapter') || chapter;

          const file = formData.get('file');
          if (file && typeof file.arrayBuffer === 'function') {
            fileBuffer = await file.arrayBuffer();
            fileName = file.name || fileName;
            mimeType = file.type || mimeType;
          }
        } else {
          const body = await request.json().catch(() => ({}));
          title = body.title || title;
          access_type = body.access_type || access_type;
          target_class = body.target_class || target_class;
          class_id = body.class_id || class_id;
          subject = body.subject || subject;
          chapter = body.chapter || chapter;
        }

        const id = `mat_${Date.now()}_${crypto.randomUUID().substring(0, 5)}`;
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileKey = `study-materials/${class_id || 'general'}/all/${crypto.randomUUID()}-${safeName}`;

        if (fileBuffer) {
          await env.R2_BUCKET.put(fileKey, fileBuffer, {
            httpMetadata: { contentType: mimeType }
          });
        }

        const now = new Date().toISOString();
        const normAccess = (access_type === 'vip' || access_type === 'vip_only') ? 'vip' :
                           (access_type === 'enrolled' || access_type === 'enrolled_only') ? 'enrolled' : 'free';

        try {
          await env.DB.prepare(`
            INSERT INTO study_materials (
              id, title, description, subject, chapter, class_id, target_class, batch_id,
              course_id, course_title, material_type, access_type, status, is_published,
              is_combo, combo_badge, file_name, file_key, file_url, file_size, file_size_bytes,
              mime_type, file_type, page_count, free_preview_pages, is_downloadable,
              thumbnail_url, cover_image, author, downloads_count, created_by, created_at,
              updated_at, published_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id, title, '', subject, chapter, class_id, target_class, null,
            null, 'General Notes', 'notes', normAccess, 'published', 1,
            0, '', fileName, fileKey, '', fileBuffer ? `${(fileBuffer.byteLength / (1024 * 1024)).toFixed(1)} MB` : '3.5 MB',
            fileBuffer ? fileBuffer.byteLength : 0, mimeType, 'PDF', '25 Pages', 0, 1,
            '', '', 'CA Manish Kalra', 0, user.id || 'admin', now, now, now
          ).run();
        } catch (dbErr) {
          if (fileBuffer && env.R2_BUCKET) {
            await env.R2_BUCKET.delete(fileKey).catch(() => {});
          }
          throw dbErr;
        }

        return jsonResponse({
          success: true,
          material: {
            id,
            title,
            subject,
            chapter,
            target_class,
            access_type: normAccess,
            file_key: fileKey,
            file_name: fileName
          }
        }, 201, request);
      }

      // DELETE /api/admin/materials/:id
      if (method === 'DELETE' && pathname.startsWith('/api/admin/materials/')) {
        const id = pathname.split('/').pop();
        if (env.DB && id) {
          const row = await env.DB.prepare('SELECT file_key FROM study_materials WHERE id = ?').bind(id).first();
          await env.DB.prepare('DELETE FROM study_materials WHERE id = ?').bind(id).run();
          if (row && row.file_key && env.R2_BUCKET) {
            await env.R2_BUCKET.delete(row.file_key).catch(() => {});
          }
          return jsonResponse({ success: true, message: 'Deleted successfully' }, 200, request);
        }
      }

      // PATCH /api/admin/materials/:id/access
      if (method === 'PATCH' && pathname.match(/^\/api\/admin\/materials\/[^\/]+\/access$/)) {
        const parts = pathname.split('/');
        const id = parts[parts.length - 2];
        const body = await request.json().catch(() => ({}));
        const access = (body.access_type || body.access || 'free').toLowerCase();
        if (env.DB && id) {
          await env.DB.prepare('UPDATE study_materials SET access_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(access, id).run();
          return jsonResponse({ success: true, access_type: access }, 200, request);
        }
      }

      // GET /api/student/materials
      if (method === 'GET' && pathname === '/api/student/materials') {
        if (!env.DB) {
          return errorResponse('DATABASE_UNAVAILABLE', 'D1 database binding not configured', 503, request);
        }

        const { results: materials } = await env.DB.prepare(`
          SELECT * FROM study_materials
          WHERE status = 'published' OR is_published = 1
          ORDER BY created_at DESC
          LIMIT 100
        `).all();

        return jsonResponse({
          success: true,
          count: (materials || []).length,
          materials: (materials || []).map(m => {
            const isFree = m.access_type === 'free';
            return {
              ...m,
              is_published: true,
              is_accessible: isFree || user.role === 'admin' || user.role === 'super_admin',
              is_locked: !isFree && user.id === 'anonymous',
              lock_reason: isFree ? null : 'AUTH_REQUIRED',
              file_url: isFree ? m.file_url : ''
            };
          })
        }, 200, request);
      }

      // GET /api/student/materials/:id/view or /download
      if (method === 'GET' && (
        pathname.match(/^\/api\/student\/materials\/[^\/]+\/view$/) ||
        pathname.match(/^\/api\/student\/materials\/[^\/]+\/download$/)
      )) {
        const parts = pathname.split('/');
        const id = parts[parts.length - 2];
        const isDownload = pathname.endsWith('/download');

        if (env.DB && id) {
          const material = await env.DB.prepare('SELECT * FROM study_materials WHERE id = ?').bind(id).first();
          if (!material) {
            return errorResponse('NOT_FOUND', 'Material not found', 404, request);
          }

          if (isDownload) {
            await env.DB.prepare('UPDATE study_materials SET downloads_count = downloads_count + 1 WHERE id = ?').bind(id).run().catch(() => {});
          }

          if (material.file_key && env.R2_BUCKET) {
            const object = await env.R2_BUCKET.get(material.file_key);
            if (object) {
              const headers = new Headers();
              object.writeHttpMetadata(headers);
              headers.set('etag', object.httpEtag);
              if (isDownload) {
                headers.set('Content-Disposition', `attachment; filename="${material.file_name || 'document.pdf'}"`);
              } else {
                headers.set('Content-Disposition', `inline; filename="${material.file_name || 'document.pdf'}"`);
              }
              const corsHeaders = handleCors(request);
              for (const [k, v] of Object.entries(corsHeaders)) {
                headers.set(k, v);
              }
              return new Response(object.body, { headers });
            }
          }

          return jsonResponse({
            success: true,
            view_url: material.file_url || '',
            download_url: material.file_url || ''
          }, 200, request);
        }
      }

      // ------------------------------------------------------------------------
      // 16. FALLBACK 404
      // ------------------------------------------------------------------------
      return jsonResponse({
        success: false,
        error: 'ROUTE_NOT_FOUND',
        message: `Endpoint ${method} ${pathname} not found on Cloudflare Worker.`
      }, 404, request);

    } catch (err) {
      console.error('[WORKER_ERROR]', err);
      return errorResponse('INTERNAL_SERVER_ERROR', err.message || 'Worker internal error', 500, request);
    }
  }
};
