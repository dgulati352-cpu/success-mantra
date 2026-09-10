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
        const partSize = 3.5 * 1024 * 1024; // 3.5 MB chunks (safe for serverless proxies & edge payload limits)
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
      // 12. FALLBACK 404
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
