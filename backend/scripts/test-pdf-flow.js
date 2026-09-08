const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('🧪 Starting Success Mantra PDF Management System verification tests...\n');

// 1. Test database schema & table creation
const { initSchema } = require('../database/schema');
const db = require('../database/db');

initSchema();

const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='pdf_documents'").get();
assert(tableInfo, 'pdf_documents table should exist in SQLite');
console.log('✅ PASS: pdf_documents table exists in database');

const indexList = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='pdf_documents'").all();
const indexNames = indexList.map(i => i.name);
assert(indexNames.includes('idx_pdf_is_active'), 'idx_pdf_is_active should exist');
assert(indexNames.includes('idx_pdf_category'), 'idx_pdf_category should exist');
assert(indexNames.includes('idx_pdf_created_at'), 'idx_pdf_created_at should exist');
assert(indexNames.includes('idx_pdf_title'), 'idx_pdf_title should exist');
console.log('✅ PASS: Database indexes verified (is_active, category, created_at, title)');

// 2. Test Cloudflare R2 storage utility functions
const {
  generateStorageKey,
  isValidStorageKey,
  getPublicUrl,
  sanitizeFileName,
  uploadBuffer,
  checkObjectExists,
  deleteObject,
  MAX_PDF_SIZE_MB,
  MAX_PDF_SIZE_BYTES
} = require('../services/r2Storage');

// Test key generator
const key = generateStorageKey('My Sample Document.pdf');
const currentYear = new Date().getFullYear();
assert(key.startsWith(`pdfs/${currentYear}/`), `Key should start with pdfs/${currentYear}/, got: ${key}`);
assert(key.endsWith('.pdf'), 'Key should end with .pdf');
assert(isValidStorageKey(key), 'Generated key should pass isValidStorageKey check');
console.log(`✅ PASS: Generated valid storage key: ${key}`);

// Test security against directory traversal / forged keys
assert(!isValidStorageKey('../pdfs/hack.pdf'), 'Should reject directory traversal');
assert(!isValidStorageKey('pdfs/2026/../../etc/passwd.pdf'), 'Should reject traversal in key');
assert(!isValidStorageKey('pdfs/2026/file.exe'), 'Should reject non-pdf key');
assert(!isValidStorageKey('other-bucket/2026/file.pdf'), 'Should reject outside namespace');
console.log('✅ PASS: Security validation rejects forged or malicious storage keys');

// Test sanitizeFileName
const cleanName = sanitizeFileName('../../dangerous<>:"/\\|?*name 1.pdf');
assert(!cleanName.includes('..'), 'Sanitized name must not have path traversal');
assert(cleanName.endsWith('.pdf'), 'Sanitized name must end with .pdf');
console.log(`✅ PASS: Filename sanitization passed: ${cleanName}`);

// Test buffer upload, existence check, and deletion
async function runStorageAndDbTests() {
  const testBuffer = Buffer.from('%PDF-1.5 test pdf content for unit verification');
  const testKey = generateStorageKey('test_doc.pdf');

  // Upload buffer
  const uploadRes = await uploadBuffer({ storageKey: testKey, buffer: testBuffer, contentType: 'application/pdf' });
  assert(uploadRes.storageKey === testKey, 'Storage key matches');
  console.log('✅ PASS: PDF buffer stored in storage layer');

  // Check object exists
  const meta = await checkObjectExists(testKey);
  assert(meta.exists === true, 'Object should exist in storage');
  assert(meta.size === testBuffer.length, 'Object size should match');
  console.log(`✅ PASS: Object exists confirmed via HeadObject (size: ${meta.size} bytes)`);

  // Insert record in database
  const testId = 'pdf_test_' + Date.now();
  const insertStmt = db.prepare(`
    INSERT INTO pdf_documents (id, title, description, file_name, file_size, mime_type, storage_key, file_url, category, is_active, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertStmt.run(
    testId,
    'Chapter 1 Financial Statements',
    'Introductory guide for Class 12',
    'chapter_1.pdf',
    meta.size,
    'application/pdf',
    testKey,
    uploadRes.fileUrl,
    'Success Mantra',
    1,
    'admin_test'
  );
  console.log('✅ PASS: Metadata record inserted into pdf_documents');

  // Retrieve and verify
  const record = db.prepare('SELECT * FROM pdf_documents WHERE id = ?').get(testId);
  assert(record, 'Record should be retrievable from database');
  assert(record.title === 'Chapter 1 Financial Statements');
  assert(record.is_active === 1);
  assert(record.storage_key === testKey);
  console.log('✅ PASS: Database record verified successfully');

  // Verify public query (only active records)
  const activeRecords = db.prepare('SELECT * FROM pdf_documents WHERE is_active = 1').all();
  assert(activeRecords.some(r => r.id === testId), 'Active record should be in public listing');

  // Toggle inactive
  db.prepare('UPDATE pdf_documents SET is_active = 0 WHERE id = ?').run(testId);
  const activeAfterDeactivate = db.prepare('SELECT * FROM pdf_documents WHERE is_active = 1').all();
  assert(!activeAfterDeactivate.some(r => r.id === testId), 'Inactive record must NOT be in public listing');
  console.log('✅ PASS: Public query filter verified (inactive documents excluded)');

  // Clean up test object and record
  await deleteObject(testKey);
  const metaAfterDelete = await checkObjectExists(testKey);
  assert(metaAfterDelete.exists === false, 'Object should not exist after deletion');
  db.prepare('DELETE FROM pdf_documents WHERE id = ?').run(testId);
  console.log('✅ PASS: PDF object deleted from storage and database cleaned up');

  console.log('\n🎉 ALL BACKEND & STORAGE TESTS PASSED SUCCESSFULLY!\n');
}

runStorageAndDbTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
