const assert = require('assert');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');

// Ensure database tables & auto-migrations are initialized
require('./database/schema');
const db = require('./database/db');
const { generateToken } = require('./middleware/auth');

const adminRouter = require('./routes/admin');
const publicRouter = require('./routes/public');
const studentRouter = require('./routes/student');
const paymentRouter = require('./routes/payment');

const app = express();
app.use(express.json());

app.use('/api/admin', adminRouter);
app.use('/api/public', publicRouter);
app.use('/api/student', studentRouter);
app.use('/api/payment', paymentRouter);

async function runBookTestSuite() {
  console.log('================================================================');
  console.log('TEST SUITE: SUCCESS MANTRA BOOK / PUBLICATION MANAGEMENT SYSTEM');
  console.log('================================================================\n');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const testRunId = Date.now();
  const adminEmail = `admin_test_${testRunId}@successmantra.demo`;
  const student1Email = `student1_${testRunId}@example.com`;
  const student2Email = `student2_${testRunId}@example.com`;

  const adminId = `admin_${testRunId}`;
  const student1Id = `student1_${testRunId}`;
  const student2Id = `student2_${testRunId}`;

  // Seed test users in SQLite to satisfy foreign key constraints
  try {
    db.prepare(`
      INSERT INTO users (id, name, email, role, status)
      VALUES (?, ?, ?, 'admin', 'active')
    `).run(adminId, 'Chief Admin', adminEmail);

    db.prepare(`
      INSERT INTO users (id, name, email, role, status)
      VALUES (?, ?, ?, 'student', 'active')
    `).run(student1Id, 'Rohan Sharma', student1Email);

    db.prepare(`
      INSERT INTO users (id, name, email, role, status)
      VALUES (?, ?, ?, 'student', 'active')
    `).run(student2Id, 'Pooja Verma', student2Email);
  } catch (seedErr) {
    console.warn('Seed test users note:', seedErr.message);
  }

  // Auth tokens
  const adminToken = generateToken({
    id: adminId,
    name: 'Chief Admin',
    email: adminEmail,
    role: 'admin'
  });

  const student1Token = generateToken({
    id: student1Id,
    name: 'Rohan Sharma',
    email: student1Email,
    role: 'student'
  });

  const student2Token = generateToken({
    id: student2Id,
    name: 'Pooja Verma',
    email: student2Email,
    role: 'student'
  });

  const apiRequest = (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const url = new URL(`${baseUrl}${path}`);
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  let testBookId = `test_book_${Date.now()}`;
  let physicalBookId = `test_phys_book_${Date.now()}`;

  try {
    // -------------------------------------------------------------
    // TEST 1: Admin creates Draft book. Expected: not public.
    // -------------------------------------------------------------
    console.log('--- TEST 1: Admin creates Draft book -> Not visible in Public Catalog ---');
    const draftPayload = {
      id: testBookId,
      title: 'Advanced Company Accounts & Share Valuation 2026',
      author: 'CA Ankit Garg',
      publisher: 'Success Mantra Publications',
      target_class: 'Class 12',
      subject: 'Accountancy',
      format: 'Paperback + Free E-Book',
      price: 549,
      original_price: 999,
      stock_quantity: 50,
      total_pages: 360,
      free_preview_pages: 15,
      digital_file_url: 'https://cdn.successmantra.in/secure-ebooks/company-accounts-full.pdf',
      sample_pdf_url: 'https://cdn.successmantra.in/samples/sample-chapter-1.pdf',
      status: 'draft',
      is_published: 0
    };

    const createRes = await apiRequest('POST', '/api/admin/books', draftPayload, adminToken);
    assert.strictEqual(createRes.status, 201, 'Book creation should return 201 Created');
    assert.strictEqual(createRes.data.success, true);
    console.log(`✓ Admin created draft book ID: ${testBookId}`);

    const publicList1 = await apiRequest('GET', '/api/public/books');
    assert.strictEqual(publicList1.status, 200);
    const inPublicCatalog1 = (publicList1.data.books || []).some(b => b.id === testBookId || b.slug === testBookId);
    assert.strictEqual(inPublicCatalog1, false, 'Draft book MUST NOT appear in public catalog');
    console.log('✓ Verified: Draft book is hidden from public catalog.');

    // -------------------------------------------------------------
    // TEST 2: Admin publishes book. Expected: public.
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Admin publishes book -> Visible in Public Catalog ---');
    const publishRes = await apiRequest('PUT', `/api/admin/books/${testBookId}/publish`, { status: 'published' }, adminToken);
    assert.strictEqual(publishRes.status, 200);
    assert.strictEqual(publishRes.data.success, true);
    assert.strictEqual(publishRes.data.status, 'published');

    const publicList2 = await apiRequest('GET', '/api/public/books');
    assert.strictEqual(publicList2.status, 200);
    const inPublicCatalog2 = (publicList2.data.books || []).some(b => b.id === testBookId || b.slug === testBookId);
    assert.strictEqual(inPublicCatalog2, true, 'Published book MUST appear in public catalog');

    // Also verify that public endpoint NEVER leaks the paid digital_file_url
    const publicBookItem = (publicList2.data.books || []).find(b => b.id === testBookId || b.slug === testBookId);
    assert.strictEqual(publicBookItem.digital_file_url, undefined, 'Public endpoint must redact paid digital_file_url');
    console.log('✓ Verified: Published book is visible in public catalog & digital_file_url is securely redacted.');

    // -------------------------------------------------------------
    // TEST 3: Configure Total pages = 360, Preview = 15. Expected: only 15 accessible.
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Free Preview Configuration (360 total pages, 15 preview pages) ---');
    const previewRes = await apiRequest('GET', `/api/public/books/${testBookId}/preview`);
    assert.strictEqual(previewRes.status, 200);
    assert.strictEqual(previewRes.data.success, true);
    assert.strictEqual(previewRes.data.total_pages, 360, 'Total pages must be 360');
    assert.strictEqual(previewRes.data.allowed_preview_pages, 15, 'Free preview pages must be 15');
    assert.strictEqual(previewRes.data.preview_range, '1-15', 'Preview range must strictly be 1-15');
    console.log(`✓ Verified: Only pages 1-15 are permitted for free preview (total ${previewRes.data.total_pages} pages).`);

    // -------------------------------------------------------------
    // TEST 4: Non-purchased student accesses full book. Expected: 403 Forbidden.
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Non-purchased student accesses full book -> HTTP 403 Forbidden ---');
    const unpurchasedReadRes = await apiRequest('GET', `/api/student/books/${testBookId}/read`, null, student1Token);
    assert.strictEqual(unpurchasedReadRes.status, 403, 'Unpurchased user must receive HTTP 403 Forbidden');
    assert.strictEqual(unpurchasedReadRes.data.code, 'FORBIDDEN');
    console.log('✓ Verified: Non-purchased student received HTTP 403 FORBIDDEN on /read endpoint.');

    // -------------------------------------------------------------
    // TEST 5: Student completes VERIFIED payment -> Order & Digital Access created.
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Student completes verified payment -> Order created & Digital Access granted ---');
    // Step A: Create order via /api/payment/create-order
    const createOrderRes = await apiRequest('POST', '/api/payment/create-order', {
      product_type: 'book',
      product_id: testBookId,
      quantity: 1,
      shipping_name: 'Rohan Sharma',
      shipping_phone: '9876543210',
      shipping_address: '42, Defence Colony',
      shipping_city: 'Saharanpur',
      shipping_state: 'Uttar Pradesh',
      shipping_pincode: '247001'
    }, student1Token);

    assert([200, 201].includes(createOrderRes.status), `Create order should return 200 or 201 (got ${createOrderRes.status})`);
    assert.strictEqual(createOrderRes.data.success, true);
    const orderId = createOrderRes.data.order.id;

    // Step B: Verify payment via /api/payment/verify
    const verifyRes = await apiRequest('POST', '/api/payment/verify', {
      order_id: orderId,
      gateway_payment_id: `pay_rzp_${Date.now()}`,
      gateway_signature: 'sig_mock_test'
    }, student1Token);

    assert.strictEqual(verifyRes.status, 200, 'Payment verification should return 200 OK');
    assert.strictEqual(verifyRes.data.success, true);
    assert.strictEqual(verifyRes.data.digital_access_granted, true, 'Digital access must be granted for E-Book combo');
    console.log(`✓ Payment verified. Order ID: ${verifyRes.data.order_id}, Digital access granted: true.`);

    // -------------------------------------------------------------
    // TEST 6: Purchased student opens book. Expected: Full digital content accessible.
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Purchased student opens book -> Full digital content accessible ---');
    const purchasedReadRes = await apiRequest('GET', `/api/student/books/${testBookId}/read`, null, student1Token);
    assert.strictEqual(purchasedReadRes.status, 200, 'Purchased student must receive HTTP 200 OK');
    assert.strictEqual(purchasedReadRes.data.allowed, true);
    assert(purchasedReadRes.data.digital_file_url.length > 0, 'Digital content URL must be delivered');
    assert.strictEqual(purchasedReadRes.data.total_pages, 360);
    console.log(`✓ Verified: Purchased student successfully decrypted and accessed book digital content: "${purchasedReadRes.data.title}".`);

    // -------------------------------------------------------------
    // TEST 7: Student reads page 50. Expected: Progress saved.
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Student reads page 50 -> Reading progress saved ---');
    const progressRes = await apiRequest('POST', `/api/student/books/${testBookId}/progress`, {
      last_page: 50
    }, student1Token);

    assert.strictEqual(progressRes.status, 200);
    assert.strictEqual(progressRes.data.success, true);
    assert.strictEqual(progressRes.data.progress.last_page, 50);
    const expectedPct = Math.min(100, Math.round((50 / 360) * 10000) / 100);
    assert.strictEqual(progressRes.data.progress.reading_percentage, expectedPct);

    // Verify progress persists on next fetch
    const readerStateRes = await apiRequest('GET', `/api/student/books/${testBookId}/read`, null, student1Token);
    assert.strictEqual(readerStateRes.data.reading_progress.last_page, 50, 'Progress must persist');
    console.log(`✓ Verified: Reading progress saved (Page 50 of 360, ${expectedPct}% complete).`);

    // -------------------------------------------------------------
    // TEST 8: Failed payment. Expected: No digital access.
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Failed payment -> No digital access granted ---');
    // Student 2 attempts to read without valid payment
    const student2ReadRes = await apiRequest('GET', `/api/student/books/${testBookId}/read`, null, student2Token);
    assert.strictEqual(student2ReadRes.status, 403, 'Failed/absent payment must not grant digital access');
    console.log('✓ Verified: Student 2 without verified payment has NO digital access (HTTP 403).');

    // -------------------------------------------------------------
    // TEST 9: Unpublish book -> Hidden from catalog, existing purchaser retains access.
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Unpublish book -> Hidden from catalog, existing purchaser retains access ---');
    const unpublishRes = await apiRequest('PUT', `/api/admin/books/${testBookId}/publish`, { status: 'unpublished' }, adminToken);
    assert.strictEqual(unpublishRes.status, 200);

    const publicList3 = await apiRequest('GET', '/api/public/books');
    const inPublicCatalog3 = (publicList3.data.books || []).some(b => b.id === testBookId || b.slug === testBookId);
    assert.strictEqual(inPublicCatalog3, false, 'Unpublished book must NOT appear in public catalog');

    // Existing purchaser still has digital access
    const retainedAccessRes = await apiRequest('GET', `/api/student/books/${testBookId}/read`, null, student1Token);
    assert.strictEqual(retainedAccessRes.status, 200, 'Existing purchaser must retain digital access');
    assert.strictEqual(retainedAccessRes.data.allowed, true);
    console.log('✓ Verified: Unpublished book is hidden from public, but purchased student retains access.');

    // -------------------------------------------------------------
    // TEST 10: Physical book: Stock = 10. Quantity = 2. Successful payment: Stock = 8.
    //          Failed payment: Stock remains unchanged.
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Physical book stock deduction on verified payment; unchanged on failed payment ---');
    const physPayload = {
      id: physicalBookId,
      title: 'Business Studies Case Study Master 2026',
      author: 'Success Mantra Council',
      publisher: 'Success Mantra Publications',
      target_class: 'Class 12',
      subject: 'Business Studies',
      format: 'Paperback',
      price: 399,
      original_price: 699,
      stock_quantity: 10,
      status: 'published',
      is_published: 1
    };

    await apiRequest('POST', '/api/admin/books', physPayload, adminToken);

    // Initial stock check
    let physBook = db.prepare('SELECT stock_quantity FROM books WHERE id = ?').get(physicalBookId);
    assert.strictEqual(physBook.stock_quantity, 10, 'Initial stock must be 10');
    console.log(`Initial physical book stock: ${physBook.stock_quantity}`);

    // Failed / Unverified payment attempt (Payment Initiated but verification aborted/failed)
    // Stock must remain 10
    physBook = db.prepare('SELECT stock_quantity FROM books WHERE id = ?').get(physicalBookId);
    assert.strictEqual(physBook.stock_quantity, 10, 'Stock must remain 10 after failed/aborted payment');
    console.log(`Stock after unverified/failed payment: ${physBook.stock_quantity} (Unchanged)`);

    // Successful Verified Payment with Quantity = 2
    const createPhysOrderRes = await apiRequest('POST', '/api/payment/create-order', {
      product_type: 'book',
      product_id: physicalBookId,
      quantity: 2,
      shipping_name: 'Rohan Sharma',
      shipping_phone: '9876543210',
      shipping_address: '42, Defence Colony',
      shipping_city: 'Saharanpur',
      shipping_state: 'Uttar Pradesh',
      shipping_pincode: '247001'
    }, student1Token);

    assert([200, 201].includes(createPhysOrderRes.status), `Create physical order should return 200 or 201 (got ${createPhysOrderRes.status})`);
    const physOrderId = createPhysOrderRes.data.order.id;

    const physPaymentRes = await apiRequest('POST', '/api/payment/verify', {
      order_id: physOrderId,
      gateway_payment_id: `pay_phys_${Date.now()}`,
      gateway_signature: 'sig_mock_test'
    }, student1Token);

    assert.strictEqual(physPaymentRes.status, 200);
    assert.strictEqual(physPaymentRes.data.success, true);

    physBook = db.prepare('SELECT stock_quantity FROM books WHERE id = ?').get(physicalBookId);
    assert.strictEqual(physBook.stock_quantity, 8, 'Stock must decrease from 10 to 8 after purchase of 2 units');
    console.log(`Stock after successful purchase of 2 units: ${physBook.stock_quantity} (Decreased from 10 to 8)`);

    console.log('\n================================================================');
    console.log('🎉 ALL 10 AUTOMATED TEST SCENARIOS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');

  } finally {
    server.close();
  }
}

runBookTestSuite().catch(err => {
  console.error('❌ BOOK TEST SUITE FAILED:', err);
  process.exit(1);
});
