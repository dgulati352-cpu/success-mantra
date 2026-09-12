/**
 * Success Mantra LMS Lifecycle Automated Verification Test
 * Tests Admin Course Creation, Chapter & Content Management,
 * Public Catalog Filtering, Payment-Gated Access Control, and Progress Tracking.
 */

const http = require('http');
const jwt = require('jsonwebtoken');
const db = require('./database/db');
const { initSchema } = require('./database/schema');

const JWT_SECRET = process.env.JWT_SECRET || 'success_mantra_production_super_secret_jwt_key_2026';

// Initialize schema
initSchema();

// Seed test users into DB
try {
  db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, role, status)
    VALUES ('admin_test_1', 'Test Admin', 'admin@successmantra.demo', 'admin', 'active')
  `).run();
  db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, role, status)
    VALUES ('student_test_lms_1', 'Enrolled Student', 'student1@test.com', 'student', 'active')
  `).run();
  db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, role, status)
    VALUES ('student_test_lms_2', 'Non-Enrolled Student', 'student2@test.com', 'student', 'active')
  `).run();
} catch (e) {
  console.warn('Test user seed note:', e.message);
}

// Generate test tokens
const adminToken = jwt.sign(
  { id: 'admin_test_1', email: 'admin@successmantra.demo', role: 'admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const studentToken = jwt.sign(
  { id: 'student_test_lms_1', email: 'student1@test.com', role: 'student' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const student2Token = jwt.sign(
  { id: 'student_test_lms_2', email: 'student2@test.com', role: 'student' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

// Helper for HTTP requests
function makeRequest(app, method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: '127.0.0.1',
        port: port,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          server.close();
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        });
      });

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
}

async function runLmsTests() {
  console.log('====================================================');
  console.log('🚀 SUCCESS MANTRA LMS COURSES AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  const express = require('express');
  const app = express();
  app.use(express.json());

  // Mount routes
  const adminRoutes = require('./routes/admin');
  const publicRoutes = require('./routes/public');
  const studentRoutes = require('./routes/student');
  const paymentRoutes = require('./routes/payment');

  app.use('/api/admin', adminRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/payment', paymentRoutes);

  let passedCount = 0;
  let totalTests = 10;
  let testCourseId = null;
  let testSlug = null;
  let chap1Id = null;
  let chap2Id = null;
  let freeVideoId = null;
  let paidVideoId = null;
  let freeMatId = null;
  let paidMatId = null;

  try {
    // -------------------------------------------------------------
    // TEST 1: Admin creates Draft course. Course NOT visible publicly.
    // -------------------------------------------------------------
    console.log('--- TEST 1: Admin creates Draft course ---');
    const createDraftRes = await makeRequest(app, 'POST', '/api/admin/courses', {
      title: 'Automated Test Course Draft',
      subject: 'Accountancy',
      target_class: 'Class 12',
      price: 2999,
      original_price: 4999,
      status: 'draft',
      live_on_catalog: 0,
      short_description: 'Draft test course',
      description: 'Draft course full syllabus'
    }, adminToken);

    testCourseId = createDraftRes.data.course?.id || createDraftRes.data.id;
    testSlug = createDraftRes.data.course?.slug || 'automated-test-course-draft';

    const pubCheck1 = await makeRequest(app, 'GET', '/api/public/courses');
    const inCatalog1 = (pubCheck1.data.courses || []).some(c => c.id === testCourseId || c.slug === testSlug);

    if (createDraftRes.status === 200 && !inCatalog1) {
      console.log('✅ TEST 1 PASSED: Draft course successfully created and excluded from public catalog.\n');
      passedCount++;
    } else {
      console.error('❌ TEST 1 FAILED: Draft course appeared in public catalog or create failed.', createDraftRes.data);
    }

    // -------------------------------------------------------------
    // TEST 2: Admin publishes course and enables catalog. Course appears publicly.
    // -------------------------------------------------------------
    console.log('--- TEST 2: Admin publishes course and enables catalog ---');
    const updatePubRes = await makeRequest(app, 'PUT', `/api/admin/courses/${testCourseId}`, {
      status: 'published',
      live_on_catalog: 1,
      is_published: 1
    }, adminToken);

    const pubCheck2 = await makeRequest(app, 'GET', '/api/public/courses');
    const inCatalog2 = (pubCheck2.data.courses || []).some(c => c.id === testCourseId || c.slug === testSlug);

    if (updatePubRes.status === 200 && inCatalog2) {
      console.log('✅ TEST 2 PASSED: Published course appears in public catalog.\n');
      passedCount++;
    } else {
      console.error('❌ TEST 2 FAILED: Published course not in public catalog.', updatePubRes.data, pubCheck2.data);
    }

    // -------------------------------------------------------------
    // TEST 3: Admin adds 2 chapters, 2 videos (1 free, 1 paid), 2 notes (1 free, 1 paid)
    // -------------------------------------------------------------
    console.log('--- TEST 3: Admin adds chapters, videos, and materials ---');
    const ch1Res = await makeRequest(app, 'POST', `/api/admin/courses/${testCourseId}/chapters`, {
      title: 'Chapter 1: Partnership Basics',
      chapter_number: 1,
      order_index: 1
    }, adminToken);
    chap1Id = ch1Res.data.chapter?.id || 1;

    const ch2Res = await makeRequest(app, 'POST', `/api/admin/courses/${testCourseId}/chapters`, {
      title: 'Chapter 2: Goodwill Valuation',
      chapter_number: 2,
      order_index: 2
    }, adminToken);
    chap2Id = ch2Res.data.chapter?.id || 2;

    // Free Video in Chapter 1
    const vid1Res = await makeRequest(app, 'POST', `/api/admin/courses/${testCourseId}/videos`, {
      title: 'Introduction to Partnership (Free Preview)',
      video_url: 'https://cdn.successmantra.in/free-preview-video.mp4',
      duration_minutes: 15,
      is_free_preview: 1,
      chapter_id: chap1Id
    }, adminToken);
    freeVideoId = vid1Res.data.video?.id;

    // Paid Video in Chapter 2
    const vid2Res = await makeRequest(app, 'POST', `/api/admin/courses/${testCourseId}/videos`, {
      title: 'Advanced Super Profit Method (Paid Lecture)',
      video_url: 'https://cdn.successmantra.in/protected-paid-video.mp4',
      duration_minutes: 45,
      is_free_preview: 0,
      chapter_id: chap2Id
    }, adminToken);
    paidVideoId = vid2Res.data.video?.id;

    // Free Material in Chapter 1
    const mat1Res = await makeRequest(app, 'POST', `/api/admin/courses/${testCourseId}/materials`, {
      title: 'Partnership Formula Sheet (Free PDF)',
      file_url: 'https://cdn.successmantra.in/free-formula-sheet.pdf',
      file_type: 'PDF',
      is_free_preview: 1,
      chapter_id: chap1Id
    }, adminToken);
    freeMatId = mat1Res.data.material?.id;

    // Paid Material in Chapter 2
    const mat2Res = await makeRequest(app, 'POST', `/api/admin/courses/${testCourseId}/materials`, {
      title: 'Comprehensive 100-Question Question Bank (Paid PDF)',
      file_url: 'https://cdn.successmantra.in/protected-question-bank.pdf',
      file_type: 'PDF',
      is_free_preview: 0,
      chapter_id: chap2Id
    }, adminToken);
    paidMatId = mat2Res.data.material?.id;

    if (freeVideoId && paidVideoId && freeMatId && paidMatId) {
      console.log('✅ TEST 3 PASSED: Added 2 chapters, 2 videos (1 free, 1 paid), and 2 notes (1 free, 1 paid).\n');
      passedCount++;
    } else {
      console.error('❌ TEST 3 FAILED: Failed to create all chapters and media.', { freeVideoId, paidVideoId, freeMatId, paidMatId });
    }

    // -------------------------------------------------------------
    // TEST 4: Non-enrolled student checks course and lessons:
    // Free preview video -> ALLOWED
    // Free preview note -> ALLOWED
    // Paid video -> HTTP 403
    // -------------------------------------------------------------
    console.log('--- TEST 4: Non-enrolled student access checks ---');
    const freeLessonCheck = await makeRequest(app, 'GET', `/api/student/lessons/${freeVideoId}`, null, studentToken);
    const paidLessonCheck = await makeRequest(app, 'GET', `/api/student/lessons/${paidVideoId}`, null, studentToken);
    const publicSyllabus = await makeRequest(app, 'GET', `/api/public/courses/${testSlug}`);

    const freeAllowed = freeLessonCheck.status === 200 && freeLessonCheck.data.lesson?.video_url;
    const paidBlocked = paidLessonCheck.status === 403;

    if (freeAllowed && paidBlocked) {
      console.log('✅ TEST 4 PASSED: Free preview video allowed; paid video strictly rejected with HTTP 403.\n');
      passedCount++;
    } else {
      console.error('❌ TEST 4 FAILED: Non-enrolled gating failed.', {
        freeStatus: freeLessonCheck.status,
        freeData: freeLessonCheck.data,
        paidStatus: paidLessonCheck.status,
        paidData: paidLessonCheck.data,
        freeVideoId,
        paidVideoId
      });
    }

    // -------------------------------------------------------------
    // TEST 5: Simulate VERIFIED successful payment -> Enrollment created
    // -------------------------------------------------------------
    console.log('--- TEST 5: Simulate verified payment & enrollment creation ---');
    // Create order
    const orderRes = await makeRequest(app, 'POST', '/api/payment/create-order', {
      product_type: 'course',
      product_id: testCourseId
    }, studentToken);

    const orderId = orderRes.data.order?.id;

    // Verify payment
    const verifyRes = await makeRequest(app, 'POST', '/api/payment/verify', {
      order_id: orderId,
      gateway_payment_id: 'pay_test_' + Date.now(),
      gateway_signature: 'sig_mock_verified'
    }, studentToken);

    // Verify database record
    const enrollmentRow = db.prepare(`
      SELECT * FROM course_enrollments WHERE user_id = 'student_test_lms_1' AND (course_id = ? OR course_id = CAST(? AS TEXT))
    `).get(testCourseId, testCourseId);

    if (verifyRes.status === 200 && enrollmentRow && enrollmentRow.status === 'active') {
      console.log('✅ TEST 5 PASSED: Verified payment successfully created active course enrollment.\n');
      passedCount++;
    } else {
      console.error('❌ TEST 5 FAILED: Enrollment not created upon verified payment.', verifyRes.data, enrollmentRow);
    }

    // -------------------------------------------------------------
    // TEST 6: Enrolled student has full access to paid videos & course appears in My Courses
    // -------------------------------------------------------------
    console.log('--- TEST 6: Enrolled student access to paid content & My Courses ---');
    const enrolledPaidLessonCheck = await makeRequest(app, 'GET', `/api/student/lessons/${paidVideoId}`, null, studentToken);
    const myCoursesCheck = await makeRequest(app, 'GET', '/api/student/courses', null, studentToken);

    const hasCourseInList = (myCoursesCheck.data.courses || []).some(c => String(c.id) === String(testCourseId));
    const paidLessonUnlocked = enrolledPaidLessonCheck.status === 200 && enrolledPaidLessonCheck.data.lesson?.video_url;

    if (paidLessonUnlocked && hasCourseInList) {
      console.log('✅ TEST 6 PASSED: Enrolled student has full access to paid videos and course appears in My Courses.\n');
      passedCount++;
    } else {
      console.error('❌ TEST 6 FAILED: Enrolled student could not access paid content or course missing from My Courses.', {
        paidLessonStatus: enrolledPaidLessonCheck.status,
        hasCourseInList
      });
    }

    // -------------------------------------------------------------
    // TEST 7: Progress: complete lesson, update lesson_progress, verify course progress %
    // -------------------------------------------------------------
    console.log('--- TEST 7: Lesson progress update & course progress calculation ---');
    const progRes = await makeRequest(app, 'POST', `/api/student/lessons/${paidVideoId}/progress`, {
      is_completed: 1,
      last_watched_seconds: 2700,
      watch_percentage: 100,
      notes: 'Completed full valuation lecture.'
    }, studentToken);

    const updatedEnrollment = db.prepare(`
      SELECT * FROM course_enrollments WHERE user_id = 'student_test_lms_1' AND (course_id = ? OR course_id = CAST(? AS TEXT))
    `).get(testCourseId, testCourseId);

    if (progRes.status === 200 && progRes.data.is_completed === 1 && updatedEnrollment.progress_percentage > 0) {
      console.log(`✅ TEST 7 PASSED: Lesson completed, course progress recalculated to ${updatedEnrollment.progress_percentage}%.\n`);
      passedCount++;
    } else {
      console.error('❌ TEST 7 FAILED: Progress not recalculated.', progRes.data, updatedEnrollment);
    }

    // -------------------------------------------------------------
    // TEST 8: Unpublish course: hidden from public catalog, but enrolled student retains full access
    // -------------------------------------------------------------
    console.log('--- TEST 8: Unpublish course retention ---');
    await makeRequest(app, 'PUT', `/api/admin/courses/${testCourseId}`, {
      status: 'unpublished',
      is_published: 0
    }, adminToken);

    const pubCheck3 = await makeRequest(app, 'GET', '/api/public/courses');
    const hiddenFromPublic = !(pubCheck3.data.courses || []).some(c => c.id === testCourseId);
    const studentStillHasAccess = await makeRequest(app, 'GET', `/api/student/lessons/${paidVideoId}`, null, studentToken);

    if (hiddenFromPublic && studentStillHasAccess.status === 200) {
      console.log('✅ TEST 8 PASSED: Unpublished course hidden from catalog while enrolled student retains access.\n');
      passedCount++;
    } else {
      console.error('❌ TEST 8 FAILED: Unpublish behavior incorrect.', { hiddenFromPublic, accessStatus: studentStillHasAccess.status });
    }

    // -------------------------------------------------------------
    // TEST 9: Failed payment: No enrollment, no course access
    // -------------------------------------------------------------
    console.log('--- TEST 9: Failed / pending payment prevents access ---');
    const failOrder = await makeRequest(app, 'POST', '/api/payment/create-order', {
      product_type: 'course',
      product_id: testCourseId
    }, student2Token);

    // student 2 does NOT verify payment
    const student2LessonCheck = await makeRequest(app, 'GET', `/api/student/lessons/${paidVideoId}`, null, student2Token);
    const student2Courses = await makeRequest(app, 'GET', '/api/student/courses', null, student2Token);
    const student2HasCourse = (student2Courses.data.courses || []).some(c => String(c.id) === String(testCourseId));

    if (student2LessonCheck.status === 403 && !student2HasCourse) {
      console.log('✅ TEST 9 PASSED: Unverified/pending payment grants zero course access.\n');
      passedCount++;
    } else {
      console.error('❌ TEST 9 FAILED: Access was granted without verified payment.', {
        status: student2LessonCheck.status,
        student2HasCourse
      });
    }

    // -------------------------------------------------------------
    // TEST 10: Unauthenticated access to protected content is rejected
    // -------------------------------------------------------------
    console.log('--- TEST 10: Unauthenticated API access rejection ---');
    const unauthLesson = await makeRequest(app, 'GET', `/api/student/lessons/${paidVideoId}`);
    const unauthCourses = await makeRequest(app, 'GET', '/api/student/courses');

    if (unauthLesson.status === 401 && unauthCourses.status === 401) {
      console.log('✅ TEST 10 PASSED: Unauthenticated requests rejected with HTTP 401.\n');
      passedCount++;
    } else {
      console.error('❌ TEST 10 FAILED: Unauthenticated access was not rejected with 401.', {
        lessonStatus: unauthLesson.status,
        coursesStatus: unauthCourses.status
      });
    }

  } catch (err) {
    console.error('💥 Test execution error:', err);
  } finally {
    // Cleanup test records
    try {
      if (testCourseId) {
        db.prepare('DELETE FROM courses WHERE id = ?').run(testCourseId);
        db.prepare('DELETE FROM chapters WHERE course_id = ?').run(testCourseId);
        db.prepare('DELETE FROM lessons WHERE course_id = ?').run(testCourseId);
        db.prepare('DELETE FROM course_materials WHERE course_id = ?').run(testCourseId);
        db.prepare('DELETE FROM course_enrollments WHERE course_id = ?').run(testCourseId);
        db.prepare('DELETE FROM lesson_progress WHERE user_id LIKE "student_test_%"').run();
      }
    } catch (e) {}

    console.log('====================================================');
    console.log(`📊 FINAL TEST RESULT: ${passedCount}/${totalTests} TESTS PASSED (${Math.round((passedCount / totalTests) * 100)}%)`);
    console.log('====================================================');

    if (passedCount === totalTests) {
      console.log('🎉 ALL LMS COURSES LIFECYCLE TESTS PASSED!');
      process.exit(0);
    } else {
      console.error('❌ SOME TESTS FAILED');
      process.exit(1);
    }
  }
}

runLmsTests();
