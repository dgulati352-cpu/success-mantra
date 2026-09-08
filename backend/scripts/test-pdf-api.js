const assert = require('assert');
const express = require('express');
const request = require('http');
const jwt = require('jsonwebtoken');

console.log('🧪 Starting Success Mantra PDF API Integration Tests...\n');

const app = require('../server');
const { JWT_SECRET } = require('../middleware/auth');

// Create admin and student test tokens
const adminToken = jwt.sign(
  { id: 'admin_test_1', name: 'Admin Test', email: 'admin@successmantra.demo', role: 'admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const studentToken = jwt.sign(
  { id: 'student_test_1', name: 'Student Test', email: 'student@example.com', role: 'student' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = request.request(
      {
        hostname: 'localhost',
        port: 5001,
        path,
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      },
      res => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const parsed = raw ? JSON.parse(raw) : {};
            resolve({ statusCode: res.statusCode, body: parsed, raw });
          } catch (e) {
            resolve({ statusCode: res.statusCode, body: null, raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  // Test 1: Unauthenticated request to /api/admin/pdfs should be rejected (401)
  const unauthRes = await makeRequest('/api/admin/pdfs', 'GET');
  assert.strictEqual(unauthRes.statusCode, 401, 'Unauthenticated request should return 401');
  console.log('✅ PASS: Unauthenticated user blocked with 401 Unauthorized');

  // Test 2: Student user to /api/admin/pdfs should be rejected (403)
  const studentRes = await makeRequest('/api/admin/pdfs', 'GET', null, studentToken);
  assert.strictEqual(studentRes.statusCode, 403, 'Student role should return 403 Forbidden');
  console.log('✅ PASS: Normal student user blocked with 403 Forbidden');

  // Test 3: Admin user can access /api/admin/pdfs (200)
  const adminListRes = await makeRequest('/api/admin/pdfs', 'GET', null, adminToken);
  assert.strictEqual(adminListRes.statusCode, 200, 'Admin should return 200 OK');
  assert(adminListRes.body.success === true, 'Admin list response should be success');
  assert(adminListRes.body.data && Array.isArray(adminListRes.body.data.items), 'Should contain items array');
  assert(adminListRes.body.data.stats, 'Should contain stats object');
  console.log('✅ PASS: Admin user successfully accessed /api/admin/pdfs with statistics');

  // Test 4: Validation on /api/admin/pdfs/upload-url (reject wrong mime/type, reject missing title)
  const invalidMimeRes = await makeRequest('/api/admin/pdfs/upload-url', 'POST', {
    title: 'Test',
    category: 'Success Mantra',
    file_name: 'test.exe',
    file_size: 1024,
    mime_type: 'application/x-msdownload'
  }, adminToken);
  assert.strictEqual(invalidMimeRes.statusCode, 400, 'Non-PDF file should be rejected');
  console.log('✅ PASS: Non-PDF file (.exe) rejected with 400 Bad Request');

  // Test 5: Valid upload-url request
  const validUrlRes = await makeRequest('/api/admin/pdfs/upload-url', 'POST', {
    title: 'CUET 2026 Mathematics Blueprint',
    category: 'CUET',
    file_name: 'maths_blueprint.pdf',
    file_size: 2048576,
    mime_type: 'application/pdf'
  }, adminToken);
  assert.strictEqual(validUrlRes.statusCode, 200, 'Valid upload-url should return 200');
  assert(validUrlRes.body.data.uploadUrl, 'Response must have uploadUrl');
  assert(validUrlRes.body.data.storageKey, 'Response must have storageKey');
  const storageKey = validUrlRes.body.data.storageKey;
  console.log(`✅ PASS: Generated presigned R2 upload URL for key: ${storageKey}`);

  // Test 6: Confirm upload (simulate dev fallback storage)
  const { uploadBuffer } = require('../services/r2Storage');
  await uploadBuffer({
    storageKey,
    buffer: Buffer.from('%PDF-1.4 Simulated uploaded content'),
    contentType: 'application/pdf'
  });

  const confirmRes = await makeRequest('/api/admin/pdfs/confirm', 'POST', {
    storageKey,
    title: 'CUET 2026 Mathematics Blueprint',
    description: 'Comprehensive chapterwise weightage',
    category: 'CUET',
    fileName: 'maths_blueprint.pdf',
    fileSize: 2048576,
    isActive: true
  }, adminToken);

  assert.strictEqual(confirmRes.statusCode, 201, 'Confirm should return 201 Created');
  assert(confirmRes.body.data && confirmRes.body.data.id, 'Confirm response should have record id');
  const createdId = confirmRes.body.data.id;
  console.log(`✅ PASS: Confirmed upload and created database record (ID: ${createdId})`);

  // Test 7: Public API /api/pdfs returns active document
  const publicRes = await makeRequest('/api/pdfs', 'GET');
  assert.strictEqual(publicRes.statusCode, 200, 'Public API should return 200 OK');
  assert(publicRes.body.data && Array.isArray(publicRes.body.data), 'Public data should be array');
  const foundInPublic = publicRes.body.data.find(d => d.id === createdId);
  assert(foundInPublic, 'Uploaded active PDF should be present in public API');
  assert(foundInPublic.fileUrl, 'Public record should contain fileUrl');
  assert(!foundInPublic.storage_key, 'Public record should not expose internal storage_key');
  console.log('✅ PASS: Public API /api/pdfs verified — active document visible with safe fields');

  // Test 8: Admin PATCH /api/admin/pdfs/:id (update metadata)
  const patchRes = await makeRequest(`/api/admin/pdfs/${createdId}`, 'PATCH', {
    title: 'CUET 2026 Mathematics Master Blueprint (Updated)',
    is_active: false
  }, adminToken);
  assert.strictEqual(patchRes.statusCode, 200, 'PATCH should return 200');
  assert(patchRes.body.data.title.includes('(Updated)'), 'Title should be updated');
  assert(patchRes.body.data.is_active === 0, 'Status should be inactive');
  console.log('✅ PASS: Admin updated metadata and deactivated document');

  // Test 9: Deactivated document is hidden from public API
  const publicAfterDeactivate = await makeRequest('/api/pdfs', 'GET');
  const hiddenInPublic = publicAfterDeactivate.body.data.find(d => d.id === createdId);
  assert(!hiddenInPublic, 'Inactive document must be hidden from public API');
  console.log('✅ PASS: Inactive document successfully excluded from /api/pdfs');

  // Test 10: Admin DELETE /api/admin/pdfs/:id
  const deleteRes = await makeRequest(`/api/admin/pdfs/${createdId}`, 'DELETE', null, adminToken);
  assert.strictEqual(deleteRes.statusCode, 200, 'DELETE should return 200 OK');
  console.log(`✅ PASS: Admin deleted PDF ${createdId} from storage and database`);

  // Test 11: Document is gone from admin list
  const listAfterDelete = await makeRequest('/api/admin/pdfs', 'GET', null, adminToken);
  const existsAfterDelete = listAfterDelete.body.data.items.some(d => d.id === createdId);
  assert(!existsAfterDelete, 'Document must be removed from database');
  console.log('✅ PASS: Deleted document no longer appears in admin list');

  console.log('\n🎉 ALL END-TO-END API TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

// Ensure server is listening on 5001
const server = app.server || app.listen(5001, () => {
  runTests().catch(err => {
    console.error('❌ API Test failed:', err);
    process.exit(1);
  });
});

if (server.listening) {
  runTests().catch(err => {
    console.error('❌ API Test failed:', err);
    process.exit(1);
  });
}
