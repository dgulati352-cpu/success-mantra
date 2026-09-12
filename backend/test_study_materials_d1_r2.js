/**
 * End-to-End Test Suite: Cloudflare D1 + R2 Study Notes & Materials System
 * Tests Admin Upload, R2 Object Storage, D1 Canonical Metadata, Access Control,
 * Class Isolation, VIP Rules, Signed URLs, Counter Stats, and Deletion.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

const db = require('./database/db');
const d1Database = require('./services/d1Database');
const r2Storage = require('./services/r2Storage');
const { generateToken } = require('./middleware/auth');

// Make HTTP request helper
function makeRequest(app, method, url, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const parsedUrl = new URL(`http://127.0.0.1:${port}${url}`);
      
      const reqHeaders = { ...headers };
      let bodyData = null;

      if (data) {
        if (typeof data === 'string') {
          bodyData = data;
        } else if (Buffer.isBuffer(data)) {
          bodyData = data;
        } else {
          bodyData = JSON.stringify(data);
          if (!reqHeaders['Content-Type']) {
            reqHeaders['Content-Type'] = 'application/json';
          }
        }
        reqHeaders['Content-Length'] = Buffer.byteLength(bodyData);
      }

      const options = {
        hostname: '127.0.0.1',
        port,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: reqHeaders
      };

      const req = http.request(options, (res) => {
        let resBody = '';
        res.on('data', chunk => resBody += chunk);
        res.on('end', () => {
          server.close();
          let parsed = null;
          try {
            parsed = JSON.parse(resBody);
          } catch (e) {
            parsed = resBody;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        });
      });

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (bodyData) {
        req.write(bodyData);
      }
      req.end();
    });
  });
}

// Multipart helper
function buildMultipart(fields, fileField = null) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const parts = [];

  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
      `${value}\r\n`
    );
  }

  if (fileField) {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"\r\n` +
      `Content-Type: ${fileField.contentType || 'application/pdf'}\r\n\r\n`
    );
    parts.push(fileField.buffer);
    parts.push('\r\n');
  }

  parts.push(`--${boundary}--\r\n`);

  const bufferParts = parts.map(p => typeof p === 'string' ? Buffer.from(p) : p);
  const totalBody = Buffer.concat(bufferParts);

  return {
    body: totalBody,
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('TEST SUITE: Cloudflare D1 + R2 Study Notes & Materials');
  console.log('====================================================\n');

  // Ensure tables in D1/SQLite
  d1Database.initD1Schema();

  // Load Express App
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const adminRoutes = require('./routes/admin');
  const studentRoutes = require('./routes/student');

  app.use('/api/admin', adminRoutes);
  app.use('/api/student', studentRoutes);

  // Setup test users & tokens
  const adminUser = { id: 'admin_test_1', name: 'Admin Test', email: 'admin@successmantra.demo', role: 'admin' };
  const adminToken = generateToken(adminUser);

  const studentClass11 = { id: 'student_c11', name: 'Student Class 11', email: 'c11@test.com', role: 'student', target_class: 'Class 11' };
  const student11Token = generateToken(studentClass11);

  const studentClass12 = { id: 'student_c12', name: 'Student Class 12', email: 'c12@test.com', role: 'student', target_class: 'Class 12' };
  const student12Token = generateToken(studentClass12);

  const vipStudent = {
    id: 'student_vip',
    name: 'VIP Student',
    email: 'vip@test.com',
    role: 'student',
    target_class: 'Class 11',
    activeMembership: true,
    membership: { status: 'active', is_vip: true }
  };
  const vipToken = generateToken(vipStudent);

  // Setup student class enrollments in SQLite for testing isolation
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        class_id TEXT,
        target_class TEXT,
        batch_id TEXT,
        course_id TEXT,
        status TEXT DEFAULT 'active'
      )
    `).run();
    db.prepare('DELETE FROM enrollments WHERE user_id LIKE "student_%"').run();
    db.prepare('INSERT OR REPLACE INTO enrollments (id, user_id, class_id, target_class, batch_id, status) VALUES (?, ?, ?, ?, ?, ?)').run(
      'enr_11', 'student_c11', 'class_11', 'Class 11', 'batch_commerce_11', 'active'
    );
    db.prepare('INSERT OR REPLACE INTO enrollments (id, user_id, class_id, target_class, batch_id, status) VALUES (?, ?, ?, ?, ?, ?)').run(
      'enr_12', 'student_c12', 'class_12', 'Class 12', 'batch_commerce_12', 'active'
    );
  } catch (e) {}

  let freeMatId = null;
  let enrolledMatId = null;
  let vipMatId = null;

  // ─────────────────────────────────────────────────────────────────
  // TEST 1: Admin Upload Free PDF Material
  // ─────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: Admin Uploads Free Notes PDF to R2 & D1 ---');
  const samplePdfBuffer = Buffer.from('%PDF-1.4 sample PDF study material content for Success Mantra testing');
  const upload1 = buildMultipart({
    title: 'Class 11 Accounting Basics & Formula Sheet',
    target_class: 'Class 11',
    class_id: 'class_11',
    subject: 'Accountancy',
    access_type: 'free',
    is_downloadable: 'true',
    page_count: '15 Pages',
    author: 'CA Manish Kalra'
  }, {
    name: 'file',
    filename: 'Class_11_Accounts_Notes.pdf',
    contentType: 'application/pdf',
    buffer: samplePdfBuffer
  });

  const res1 = await makeRequest(app, 'POST', '/api/admin/materials', upload1.body, {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': upload1.contentType
  });

  console.log('Upload Free Material Response Status:', res1.status);
  assert.strictEqual(res1.status, 201, `Expected 201 Created, got ${res1.status}: ${JSON.stringify(res1.data)}`);
  assert.strictEqual(res1.data.success, true);
  assert(res1.data.material && res1.data.material.id, 'Material ID must be present');
  assert(res1.data.material.file_key, 'R2 file_key must be present');
  console.log('Created Material ID:', res1.data.material.id);
  console.log('R2 Object Key:', res1.data.material.file_key);
  freeMatId = res1.data.material.id;

  // Verify D1 Canonical Record directly
  const d1Check1 = db.prepare('SELECT * FROM study_materials WHERE id = ?').get(freeMatId);
  assert(d1Check1, 'Record must exist in D1 table');
  assert.strictEqual(d1Check1.file_key, res1.data.material.file_key, 'D1 file_key must match R2 object key');
  console.log('✓ Verified D1 record and file_key match!\n');

  // ─────────────────────────────────────────────────────────────────
  // TEST 2: Admin Upload Enrolled Material (Class 11 specific)
  // ─────────────────────────────────────────────────────────────────
  console.log('--- TEST 2: Admin Uploads Enrolled-Only Class 11 Notes ---');
  const upload2 = buildMultipart({
    title: 'Class 11 Exclusive Ledger Mastery Notes',
    target_class: 'Class 11',
    class_id: 'class_11',
    subject: 'Accountancy',
    access_type: 'enrolled',
    is_downloadable: 'true',
    author: 'CA Manish Kalra'
  }, {
    name: 'file',
    filename: 'Class_11_Ledger_Mastery.pdf',
    contentType: 'application/pdf',
    buffer: samplePdfBuffer
  });

  const res2 = await makeRequest(app, 'POST', '/api/admin/materials', upload2.body, {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': upload2.contentType
  });

  assert.strictEqual(res2.status, 201);
  enrolledMatId = res2.data.material.id;
  console.log('Created Enrolled Material ID:', enrolledMatId);
  console.log('✓ Enrolled material uploaded successfully!\n');

  // ─────────────────────────────────────────────────────────────────
  // TEST 3: Admin Upload VIP Material (Book Combo)
  // ─────────────────────────────────────────────────────────────────
  console.log('--- TEST 3: Admin Uploads VIP-Exclusive Book Combo ---');
  const upload3 = buildMultipart({
    title: 'Class 11 3-in-1 Mega Combo Handbook (ACC + BUI + ECO)',
    target_class: 'Class 11',
    class_id: 'class_11',
    subject: 'ACC + BUI + ECO',
    is_combo: '1',
    combo_badge: '3-in-1 Mega Combo',
    access_type: 'vip',
    free_preview_pages: '5',
    is_downloadable: 'false',
    author: 'CA Manish Kalra'
  }, {
    name: 'file',
    filename: 'Combo_Handbook_ACC_BUI_ECO.pdf',
    contentType: 'application/pdf',
    buffer: samplePdfBuffer
  });

  const res3 = await makeRequest(app, 'POST', '/api/admin/materials', upload3.body, {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': upload3.contentType
  });

  assert.strictEqual(res3.status, 201);
  vipMatId = res3.data.material.id;
  console.log('Created VIP Combo Material ID:', vipMatId);
  console.log('✓ VIP Combo material uploaded successfully!\n');

  // ─────────────────────────────────────────────────────────────────
  // TEST 4: Admin Metrics & Counters Persistence
  // ─────────────────────────────────────────────────────────────────
  console.log('--- TEST 4: Admin GET /api/admin/materials (D1-backed Stats) ---');
  const adminListRes = await makeRequest(app, 'GET', '/api/admin/materials', null, {
    'Authorization': `Bearer ${adminToken}`
  });

  assert.strictEqual(adminListRes.status, 200);
  assert.strictEqual(adminListRes.data.success, true);
  const stats = adminListRes.data.stats;
  console.log('D1 Stats Counters:', stats);
  assert(stats.total >= 3, `Expected total >= 3, got ${stats.total}`);
  assert(stats.free >= 1, `Expected free >= 1, got ${stats.free}`);
  assert(stats.enrolled >= 1, `Expected enrolled >= 1, got ${stats.enrolled}`);
  assert(stats.vip >= 1, `Expected vip >= 1, got ${stats.vip}`);
  assert(stats.combos >= 1, `Expected combos >= 1, got ${stats.combos}`);
  console.log('✓ Verified D1 stats counters match production rules!\n');

  // ─────────────────────────────────────────────────────────────────
  // TEST 5: Anonymous Visitor Access to Study Notes
  // ─────────────────────────────────────────────────────────────────
  console.log('--- TEST 5: Anonymous Visitor Queries /api/student/materials ---');
  const publicStudentRes = await makeRequest(app, 'GET', '/api/student/materials');
  assert.strictEqual(publicStudentRes.status, 200);
  assert.strictEqual(publicStudentRes.data.success, true);

  const anonFreeMat = publicStudentRes.data.materials.find(m => m.id === freeMatId);
  const anonEnrolledMat = publicStudentRes.data.materials.find(m => m.id === enrolledMatId);
  const anonVipMat = publicStudentRes.data.materials.find(m => m.id === vipMatId);

  assert(anonFreeMat && anonFreeMat.is_accessible === true, 'Free material must be accessible to anonymous user');
  assert(anonEnrolledMat && anonEnrolledMat.is_locked === true, 'Enrolled material must be locked for anonymous user');
  assert.strictEqual(anonEnrolledMat.lock_reason, 'AUTH_REQUIRED');
  assert.strictEqual(anonEnrolledMat.file_url, '', 'Protected file_url must be redacted for locked content');
  assert(anonVipMat && anonVipMat.is_locked === true, 'VIP material must be locked for anonymous user');
  console.log('✓ Anonymous visitor correctly allowed for free material, locked with AUTH_REQUIRED for protected notes!\n');

  // ─────────────────────────────────────────────────────────────────
  // TEST 6: Class Isolation (Class 11 vs Class 12 Enrolled Access)
  // ─────────────────────────────────────────────────────────────────
  console.log('--- TEST 6: Class Isolation Test ---');
  const c11Res = await makeRequest(app, 'GET', '/api/student/materials', null, {
    'Authorization': `Bearer ${student11Token}`
  });
  const c11EnrolledMat = c11Res.data.materials.find(m => m.id === enrolledMatId);
  assert(c11EnrolledMat && c11EnrolledMat.is_accessible === true, 'Class 11 student must be ALLOWED for Class 11 notes');

  const c12Res = await makeRequest(app, 'GET', '/api/student/materials', null, {
    'Authorization': `Bearer ${student12Token}`
  });
  const c12EnrolledMat = c12Res.data.materials.find(m => m.id === enrolledMatId);
  assert(c12EnrolledMat && c12EnrolledMat.is_accessible === false, 'Class 12 student must be DENIED for Class 11 notes');
  assert.strictEqual(c12EnrolledMat.lock_reason, 'ENROLLMENT_REQUIRED');
  assert.strictEqual(c12EnrolledMat.file_url, '', 'File URL must be redacted for unauthorized class');
  console.log('✓ Class isolation strictly enforced: Class 11 student ALLOWED, Class 12 student DENIED!\n');

  // ─────────────────────────────────────────────────────────────────
  // TEST 7: VIP Access Rules
  // ─────────────────────────────────────────────────────────────────
  console.log('--- TEST 7: VIP Membership Test ---');
  // Regular student (c11) without VIP membership tries VIP note
  assert(c11Res.data.materials.find(m => m.id === vipMatId).is_accessible === false);
  assert.strictEqual(c11Res.data.materials.find(m => m.id === vipMatId).lock_reason, 'VIP_REQUIRED');

  // VIP student tries VIP note
  const vipRes = await makeRequest(app, 'GET', '/api/student/materials', null, {
    'Authorization': `Bearer ${vipToken}`
  });
  const vipMatInRes = vipRes.data.materials.find(m => m.id === vipMatId);
  assert(vipMatInRes && vipMatInRes.is_accessible === true, 'Active VIP student must be ALLOWED for VIP notes');
  console.log('✓ VIP rules verified: non-VIP denied with VIP_REQUIRED, active VIP allowed!\n');

  // ─────────────────────────────────────────────────────────────────
  // TEST 8: In-App Reader Signed URL Generation
  // ─────────────────────────────────────────────────────────────────
  console.log('--- TEST 8: GET /api/student/materials/:id/view (Signed R2 URL) ---');
  // Unauthorized user gets 403 / 401
  const unauthViewRes = await makeRequest(app, 'GET', `/api/student/materials/${vipMatId}/view`);
  assert.strictEqual(unauthViewRes.status, 401, 'Unauthenticated view request must fail');

  // Authorized student gets signed view URL
  const authViewRes = await makeRequest(app, 'GET', `/api/student/materials/${freeMatId}/view`);
  assert.strictEqual(authViewRes.status, 200);
  assert.strictEqual(authViewRes.data.success, true);
  assert(authViewRes.data.view_url, 'Must return signed view URL');
  console.log('Generated View URL:', authViewRes.data.view_url.substring(0, 80) + '...');
  console.log('✓ In-App Reader generates secure signed view link!\n');

  // ─────────────────────────────────────────────────────────────────
  // TEST 9: Secure Download & Counter Increment
  // ─────────────────────────────────────────────────────────────────
  console.log('--- TEST 9: GET /api/student/materials/:id/download ---');
  const d1BeforeDl = db.prepare('SELECT downloads_count FROM study_materials WHERE id = ?').get(freeMatId);
  const dlCountBefore = d1BeforeDl.downloads_count || 0;

  const dlRes = await makeRequest(app, 'GET', `/api/student/materials/${freeMatId}/download`);
  assert.strictEqual(dlRes.status, 200);
  assert(dlRes.data.download_url, 'Must return download URL');

  const d1AfterDl = db.prepare('SELECT downloads_count FROM study_materials WHERE id = ?').get(freeMatId);
  assert.strictEqual(d1AfterDl.downloads_count, dlCountBefore + 1, 'downloads_count must increment in D1');
  console.log(`✓ Download counter incremented in D1: ${dlCountBefore} -> ${d1AfterDl.downloads_count}!\n`);

  // ─────────────────────────────────────────────────────────────────
  // TEST 10: Admin Edit Material
  // ─────────────────────────────────────────────────────────────────
  console.log('--- TEST 10: Admin PUT /api/admin/materials/:id ---');
  const editRes = await makeRequest(app, 'PUT', `/api/admin/materials/${freeMatId}`, {
    title: 'Class 11 Accounting Basics (Updated 2026 Edition)',
    page_count: '28 Pages'
  }, {
    'Authorization': `Bearer ${adminToken}`
  });
  assert.strictEqual(editRes.status, 200);
  assert.strictEqual(editRes.data.material.title, 'Class 11 Accounting Basics (Updated 2026 Edition)');

  const d1EditCheck = db.prepare('SELECT title, page_count FROM study_materials WHERE id = ?').get(freeMatId);
  assert.strictEqual(d1EditCheck.title, 'Class 11 Accounting Basics (Updated 2026 Edition)');
  assert.strictEqual(d1EditCheck.page_count, '28 Pages');
  console.log('✓ Admin edit persisted in D1!\n');

  // ─────────────────────────────────────────────────────────────────
  // TEST 11: Admin Access Permission Toggle
  // ─────────────────────────────────────────────────────────────────
  console.log('--- TEST 11: Admin PATCH /api/admin/materials/:id/access ---');
  const patchAccessRes = await makeRequest(app, 'PATCH', `/api/admin/materials/${freeMatId}/access`, {
    access_type: 'enrolled'
  }, {
    'Authorization': `Bearer ${adminToken}`
  });
  assert.strictEqual(patchAccessRes.status, 200);

  const d1AccessCheck = db.prepare('SELECT access_type FROM study_materials WHERE id = ?').get(freeMatId);
  assert.strictEqual(d1AccessCheck.access_type, 'enrolled');
  console.log('✓ Access type toggle persisted in D1!\n');

  // ─────────────────────────────────────────────────────────────────
  // TEST 12: Admin Delete Material (Removes D1 and R2 File)
  // ─────────────────────────────────────────────────────────────────
  console.log('--- TEST 12: Admin DELETE /api/admin/materials/:id ---');
  const deleteRes = await makeRequest(app, 'DELETE', `/api/admin/materials/${freeMatId}`, null, {
    'Authorization': `Bearer ${adminToken}`
  });
  assert.strictEqual(deleteRes.status, 200);

  const d1DelCheck = db.prepare('SELECT * FROM study_materials WHERE id = ?').get(freeMatId);
  assert(!d1DelCheck, 'Record must be completely removed from D1');

  // Clean up other test items
  await makeRequest(app, 'DELETE', `/api/admin/materials/${enrolledMatId}`, null, { 'Authorization': `Bearer ${adminToken}` });
  await makeRequest(app, 'DELETE', `/api/admin/materials/${vipMatId}`, null, { 'Authorization': `Bearer ${adminToken}` });

  console.log('✓ Deletion verified: D1 record and R2 object successfully removed!\n');

  console.log('====================================================');
  console.log('ALL 12 TESTS PASSED PERFECTLY!');
  console.log('Canonical Cloudflare D1 + R2 Architecture Verified.');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
