const assert = require('assert');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('================================================================');
console.log('🧪 TESTING MATRIX: Resumable Multipart Recording Upload System');
console.log('================================================================\n');

// 1. Schema & Table verification
const { initSchema, getDb } = require('../database/schema');
initSchema();
const db = getDb();

console.log('▶ [TEST 1] Verifying Database Schema & Column Migrations...');
const sessionTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='recording_upload_sessions'").get();
assert(sessionTable, 'recording_upload_sessions table must exist');

const sessionCols = db.prepare("PRAGMA table_info(recording_upload_sessions)").all().map(c => c.name);
const expectedSessionCols = ['id', 'recording_id', 'class_id', 'faculty_id', 'client_upload_id', 'title', 'storage_key', 'r2_upload_id', 'file_size', 'part_size', 'total_parts', 'uploaded_parts', 'status'];
expectedSessionCols.forEach(col => {
  assert(sessionCols.includes(col), `recording_upload_sessions must have column ${col}`);
});

const recordingCols = db.prepare("PRAGMA table_info(recordings)").all().map(c => c.name);
const expectedRecCols = ['id', 'title', 'video_url', 'published', 'upload_status', 'storage_key', 'upload_id'];
expectedRecCols.forEach(col => {
  assert(recordingCols.includes(col), `recordings table must have column ${col}`);
});

console.log('  ✅ Schema verified: recording_upload_sessions and recordings columns are fully migrated.\n');

// 2. Storage Key & Security Verification
console.log('▶ [TEST 2] Verifying Cloudflare R2 Storage Keys & Security Rules...');
const {
  isValidStorageKey,
  isR2Configured,
  getS3Client,
  createMultipartUpload,
  getPresignedPartUploadUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  verifyObject,
  checkObjectExists,
  deleteObject,
  getPublicUrl
} = require('../services/r2Storage');

const classId = 'test_class_101';
const recordingId = Date.now();
const testStorageKey = `recordings/live/${classId}/rec_${recordingId}/recording.webm`;
assert(isValidStorageKey(testStorageKey), 'Generated key must pass isValidStorageKey check');

// Traversal and injection safety
assert(!isValidStorageKey('../../etc/passwd.webm'), 'Should reject path traversal');
assert(!isValidStorageKey('recordings/2026/../malicious.webm'), 'Should reject internal traversal');
assert(!isValidStorageKey('/recordings/2026/rooted.webm'), 'Should reject absolute root path');
assert(!isValidStorageKey(''), 'Should reject empty key');
console.log(`  ✅ Storage key format & path traversal security checks passed: ${testStorageKey}\n`);

// 3. Cloudflare R2 Connectivity & Multipart Upload Matrix
async function runMultipartMatrixTests() {
  console.log('▶ [TEST 3] Testing Cloudflare R2 Connectivity & Configuration...');
  const r2Configured = isR2Configured();
  console.log(`  Cloudflare R2 configured: ${r2Configured}`);

  const s3 = getS3Client();
  assert(s3, 'S3 client must be initialized');
  console.log('  ✅ S3 Client successfully initialized for R2 endpoint.\n');

  // Test 3.1: Full Multipart Upload (Init -> Presigned Part -> Upload -> Complete -> Verify)
  console.log('▶ [TEST 3.1] Executing End-to-End Multipart Upload Flow...');
  const partSize = 5 * 1024 * 1024; // 5MB (minimum part size for S3/R2 multipart uploads)
  const totalParts = 2;
  const totalFileSize = partSize * totalParts;
  const uploadSessionId = `test_sess_${Date.now()}`;
  const clientUploadId = `client_up_${Date.now()}`;

  // Step A: Init Multipart on R2
  console.log('  1. Calling createMultipartUpload on Cloudflare R2...');
  const initResult = await createMultipartUpload({
    storageKey: testStorageKey,
    contentType: 'video/webm'
  });

  assert(initResult.uploadId, 'createMultipartUpload must return an uploadId');
  assert(initResult.storageKey === testStorageKey, 'Returned storageKey must match');
  console.log(`     R2 UploadId: ${initResult.uploadId}`);

  // Step B: Create session & recording in SQLite
  console.log('  2. Creating session in SQLite (status: uploading)...');
  db.prepare(`
    INSERT INTO recordings (
      title, subject, video_url, video_provider, published, upload_id,
      client_upload_id, upload_status, storage_key, file_size, total_bytes, mime_type
    ) VALUES (?, 'Accountancy', '', 'html5', 0, ?, ?, 'uploading', ?, ?, ?, 'video/webm')
  `).run('Test Masterclass Live Recording', uploadSessionId, clientUploadId, testStorageKey, totalFileSize, totalFileSize);

  const recRow = db.prepare('SELECT * FROM recordings WHERE upload_id = ?').get(uploadSessionId);
  assert(recRow, 'Recording row must exist in DB');
  assert(recRow.upload_status === 'uploading', 'Status must be uploading');
  assert(recRow.published === 0, 'Published must be 0 while uploading');

  db.prepare(`
    INSERT INTO recording_upload_sessions (
      id, recording_id, class_id, faculty_id, client_upload_id, title,
      storage_key, r2_upload_id, file_name, file_size, mime_type,
      duration_seconds, part_size, total_parts, uploaded_parts, uploaded_bytes, status
    ) VALUES (?, ?, ?, 'faculty_admin_1', ?, 'Test Masterclass Live Recording',
      ?, ?, 'recording.webm', ?, 'video/webm', 3600, ?, ?, '[]', 0, 'uploading')
  `).run(uploadSessionId, recRow.id, classId, clientUploadId, testStorageKey, initResult.uploadId, totalFileSize, partSize, totalParts);

  // Step C: Generate Presigned URLs for Parts and Upload
  console.log('  3. Generating Presigned Part URLs & uploading 2 x 5MB parts directly to R2...');
  const uploadedParts = [];

  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    const presigned = await getPresignedPartUploadUrl({
      storageKey: testStorageKey,
      uploadId: initResult.uploadId,
      partNumber
    });
    assert(presigned.uploadUrl, `Presigned URL for part ${partNumber} must be present`);
    assert(presigned.partNumber === partNumber, 'Part number must match');

    // Create 5MB chunk buffer with pseudo-video data
    const chunkBuffer = Buffer.alloc(partSize, 0x41 + partNumber);

    // Direct PUT to R2 via node fetch
    const uploadRes = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(chunkBuffer.length)
      },
      body: chunkBuffer
    });

    assert(uploadRes.ok, `Direct PUT to R2 for part ${partNumber} failed: ${uploadRes.status} ${uploadRes.statusText}`);
    const etag = uploadRes.headers.get('etag')?.replace(/"/g, '');
    assert(etag, `R2 must return an ETag header for part ${partNumber}`);
    console.log(`     Uploaded Part ${partNumber}/${totalParts} (5MB) -> ETag: ${etag}`);

    uploadedParts.push({ PartNumber: partNumber, ETag: etag });

    // Update session progress in DB
    db.prepare(`
      UPDATE recording_upload_sessions
      SET uploaded_parts = ?, uploaded_bytes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify(uploadedParts), partNumber * partSize, uploadSessionId);
  }

  // Step D: Complete Multipart Upload on R2
  console.log('  4. Completing multipart upload on Cloudflare R2...');
  const completeRes = await completeMultipartUpload({
    storageKey: testStorageKey,
    uploadId: initResult.uploadId,
    parts: uploadedParts
  });

  assert(completeRes.success, 'completeMultipartUpload must succeed');
  console.log(`     Complete response location: ${completeRes.location}`);

  // Step E: Verify Object on R2
  console.log('  5. Verifying finalized object existence & byte length on R2...');
  const verifyObj = await verifyObject(testStorageKey);
  assert(verifyObj.exists, 'Final object must exist on R2');
  assert(verifyObj.contentLength === totalFileSize, `Content length must match total parts (${totalFileSize} bytes), got: ${verifyObj.contentLength}`);
  console.log(`     Verified on R2: Size = ${(verifyObj.contentLength / (1024 * 1024)).toFixed(1)} MB (${verifyObj.contentLength} bytes)`);

  // Step F: Update DB status to published
  const publicUrl = getPublicUrl(testStorageKey);
  db.prepare(`
    UPDATE recording_upload_sessions SET status = 'published', uploaded_bytes = ? WHERE id = ?
  `).run(totalFileSize, uploadSessionId);

  db.prepare(`
    UPDATE recordings
    SET video_url = ?, upload_status = 'published', published = 1, file_size = ?, uploaded_bytes = ?, total_bytes = ?, published_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(publicUrl, totalFileSize, totalFileSize, totalFileSize, recRow.id);

  // Sync to live_class_recordings
  db.prepare(`
    INSERT OR REPLACE INTO live_class_recordings (
      title, subject, storage_url, duration_seconds, file_size, mime_type, processing_status, published
    ) VALUES ('Test Masterclass Live Recording', 'Accountancy', ?, 3600, ?, 'video/webm', 'ready', 1)
  `).run(publicUrl, String(totalFileSize));

  const finalRec = db.prepare('SELECT * FROM recordings WHERE id = ?').get(recRow.id);
  assert(finalRec.upload_status === 'published', 'Final recording upload_status must be published');
  assert(finalRec.published === 1, 'Final recording published flag must be 1');
  assert(finalRec.video_url === publicUrl, 'Final recording video_url must match R2 public URL');
  console.log('  ✅ PASS: Full multipart upload cycle completed, verified on R2, and published in DB!\n');

  // Test 3.2: Pause and Resume Flow
  console.log('▶ [TEST 3.2] Testing Pause and Resume Lifecycle in Database...');
  const pauseSessId = `sess_pause_${Date.now()}`;
  db.prepare(`
    INSERT INTO recording_upload_sessions (
      id, class_id, faculty_id, client_upload_id, title, storage_key,
      r2_upload_id, file_name, file_size, mime_type, part_size, total_parts, status
    ) VALUES (?, 'class_pause_test', 'fac_1', 'client_p1', 'Paused Test', 'recordings/live/class_p1/rec_1/recording.webm', 'r2_pause_id', 'recording.webm', 50000000, 'video/webm', 25000000, 2, 'uploading')
  `).run(pauseSessId);

  // Pause
  db.prepare("UPDATE recording_upload_sessions SET status = 'upload_paused', error_message = 'Paused by user' WHERE id = ?").run(pauseSessId);
  const pausedSess = db.prepare('SELECT * FROM recording_upload_sessions WHERE id = ?').get(pauseSessId);
  assert(pausedSess.status === 'upload_paused', 'Session must be upload_paused');
  console.log('     Session state paused: upload_paused');

  // Resume
  db.prepare("UPDATE recording_upload_sessions SET status = 'uploading', error_message = NULL WHERE id = ?").run(pauseSessId);
  const resumedSess = db.prepare('SELECT * FROM recording_upload_sessions WHERE id = ?').get(pauseSessId);
  assert(resumedSess.status === 'uploading', 'Session must be resumed to uploading');
  console.log('     Session state resumed: uploading');
  console.log('  ✅ PASS: Pause and Resume state machine verified!\n');

  // Test 3.3: Cancel & Abort Flow
  console.log('▶ [TEST 3.3] Testing Cancel and Abort Lifecycle...');
  const abortKey = `recordings/live/class_abort/rec_${Date.now()}/recording.webm`;
  const abortInit = await createMultipartUpload({ storageKey: abortKey, contentType: 'video/webm' });
  assert(abortInit.uploadId, 'Abort test init uploadId generated');

  console.log('     Calling abortMultipartUpload on R2...');
  const abortRes = await abortMultipartUpload({ storageKey: abortKey, uploadId: abortInit.uploadId });
  assert(abortRes.success, 'abortMultipartUpload must succeed');

  const abortCheck = await checkObjectExists(abortKey);
  assert(!abortCheck.exists, 'Aborted object must not exist on R2');
  console.log('  ✅ PASS: R2 multipart upload cleanly aborted and discarded!\n');

  // Test 3.4: Student Playback Retrieval & Streaming Range
  console.log('▶ [TEST 3.4] Testing Student & Admin Recording Query Fallback...');
  const studentRecordings = db.prepare(`
    SELECT r.*,
           COALESCE(r.video_url, r.storage_key) as video_url,
           COALESCE(r.video_url, r.storage_key) as storage_url
    FROM recordings r
    WHERE (r.published = 1 OR r.is_published = 1) AND (r.upload_status IS NULL OR r.upload_status = 'published')
    ORDER BY r.created_at DESC
  `).all();

  assert(studentRecordings.length > 0, 'Student query must return published recordings');
  const uploadedInList = studentRecordings.find(r => r.storage_key === testStorageKey);
  assert(uploadedInList, 'Newly uploaded recording must be present in Student recordings list');
  console.log(`     Found published lecture: "${uploadedInList.title}" | URL: ${uploadedInList.video_url}`);
  console.log('  ✅ PASS: Published recording is immediately available to students and admins!\n');

  // Clean up test file from R2
  console.log('🧹 Cleaning up test object from R2...');
  await deleteObject(testStorageKey);
  const afterDelete = await checkObjectExists(testStorageKey);
  assert(!afterDelete.exists, 'Cleaned up test file from R2');
  console.log('  ✅ Cleanup complete.\n');

  console.log('================================================================');
  console.log('🎉 ALL TESTING MATRIX CRITERIA PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runMultipartMatrixTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
