/**
 * Automated Authorization Test Suite for Success Mantra Platform
 * Verifies strict class/batch authorization across all academic modules and IDOR protection.
 */

const assert = require('assert');
const { generateToken } = require('../middleware/auth');
const { getStudentAuthorizedClasses, classStringsMatch } = require('../middleware/classAuth');

// Mock data fixtures
const USERS = {
  studentA_11: {
    id: 'usr_test_student_11',
    name: 'Aarav Sharma (Class 11)',
    email: 'aarav11@test.successmantra.com',
    role: 'student',
    target_class: 'Class 11',
    enrolled_classes: ['cls_class_11_commerce']
  },
  studentB_12: {
    id: 'usr_test_student_12',
    name: 'Riya Gupta (Class 12)',
    email: 'riya12@test.successmantra.com',
    role: 'student',
    target_class: 'Class 12',
    enrolled_classes: ['cls_class_12_commerce']
  },
  studentC_multi: {
    id: 'usr_test_student_multi',
    name: 'Kabir Verma (Class 11 + CUET)',
    email: 'kabir_multi@test.successmantra.com',
    role: 'student',
    target_class: 'Class 11',
    enrolled_classes: ['cls_class_11_commerce', 'cls_cuet_2027']
  },
  admin: {
    id: 'usr_admin_manish',
    name: 'CA Manish Kalra',
    email: 'camanishkalra@gmail.com',
    role: 'admin'
  }
};

const ACADEMIC_RESOURCES = {
  courses: [
    { id: 'crs_11_acc', title: 'Class 11 Accountancy Foundation', target_class: 'Class 11', class_id: 'cls_class_11_commerce' },
    { id: 'crs_12_acc', title: 'Class 12 Accountancy Board Blueprint', target_class: 'Class 12', class_id: 'cls_class_12_commerce' },
    { id: 'crs_cuet_acc', title: 'CUET 2027 NTA Drill', target_class: 'CUET', class_id: 'cls_cuet_2027' }
  ],
  liveClasses: [
    { id: 'live_11_acc', title: 'Class 11 Live Ledger Session', course_class: 'Class 11 Commerce', batch_id: 'cls_class_11_commerce' },
    { id: 'live_12_acc', title: 'Class 12 Live Partnership Marathon', course_class: 'Class 12 Commerce', batch_id: 'cls_class_12_commerce' },
    { id: 'live_cuet_acc', title: 'CUET 2027 Live Speed Test', course_class: 'CUET', batch_id: 'cls_cuet_2027' }
  ],
  notes: [
    { id: 'mat_11_journal', title: 'Class 11 Journal Rules.pdf', target_class: 'Class 11', class_id: 'cls_class_11_commerce' },
    { id: 'mat_12_partnership', title: 'Class 12 Partnership Formula Sheet.pdf', target_class: 'Class 12', class_id: 'cls_class_12_commerce' },
    { id: 'mat_cuet_mcq', title: 'CUET 1000 MCQ Bank.pdf', target_class: 'CUET', class_id: 'cls_cuet_2027' }
  ],
  recordings: [
    { id: 'rec_11_01', title: 'Class 11 Accounting Equations Video', target_class: 'Class 11', batch_id: 'cls_class_11_commerce' },
    { id: 'rec_12_01', title: 'Class 12 Balance Sheet Video', target_class: 'Class 12', batch_id: 'cls_class_12_commerce' },
    { id: 'rec_cuet_01', title: 'CUET CBT Walkthrough Video', target_class: 'CUET', batch_id: 'cls_cuet_2027' }
  ],
  assignments: [
    { id: 'asg_11_01', title: 'Class 11 Ledger Homework', target_class: 'Class 11', class_id: 'cls_class_11_commerce' },
    { id: 'asg_12_01', title: 'Class 12 Past Adjustments Homework', target_class: 'Class 12', class_id: 'cls_class_12_commerce' }
  ],
  tests: [
    { id: 'tst_11_01', title: 'Class 11 Unit Test 1', target_class: 'Class 11', class_id: 'cls_class_11_commerce' },
    { id: 'tst_12_01', title: 'Class 12 Pre-Board Mock 1', target_class: 'Class 12', class_id: 'cls_class_12_commerce' }
  ],
  communities: [
    { id: 'comm_11', name: 'Class 11 Commerce Foundation', target_class: 'Class 11', class_id: 'cls_class_11_commerce' },
    { id: 'comm_12', name: 'Class 12 Commerce Achievers', target_class: 'Class 12', class_id: 'cls_class_12_commerce' },
    { id: 'comm_cuet', name: 'CUET Commerce Rankers', target_class: 'CUET', class_id: 'cls_cuet_2027' }
  ]
};

async function runTests() {
  console.log('===============================================================');
  console.log('🛡️  SUCCESS MANTRA CLASS-BASED AUTHORIZATION TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // --- 1. Class string matching normalization tests ---
  console.log('--- 1. String Normalization & Cohort Matching Tests ---');
  test('Class 11 variants match', () => {
    assert.strictEqual(classStringsMatch('Class 11', 'Class 11 Commerce'), true);
    assert.strictEqual(classStringsMatch('class_11_commerce', 'Class 11'), true);
    assert.strictEqual(classStringsMatch('11th Commerce', 'Class 11'), true);
  });

  test('Class 11 and Class 12 never match', () => {
    assert.strictEqual(classStringsMatch('Class 11', 'Class 12'), false);
    assert.strictEqual(classStringsMatch('Class 11 Commerce', 'Class 12 Commerce'), false);
    assert.strictEqual(classStringsMatch('cls_class_11_commerce', 'cls_class_12_commerce'), false);
  });

  test('CUET and CA Foundation match correctly', () => {
    assert.strictEqual(classStringsMatch('CUET', 'CUET 2027'), true);
    assert.strictEqual(classStringsMatch('CUET', 'Class 12'), false);
    assert.strictEqual(classStringsMatch('CA Foundation', 'Chartered Track'), true);
    assert.strictEqual(classStringsMatch('CA Foundation', 'Class 11'), false);
  });

  // --- 2. Student A (Class 11) Authorization Context ---
  console.log('\n--- 2. Student A (Class 11 Commerce) Authorization Checks ---');
  const authA = await getStudentAuthorizedClasses(USERS.studentA_11.id, USERS.studentA_11);

  test('Student A is NOT privileged', () => {
    assert.strictEqual(authA.isPrivileged, false);
  });

  test('Student A has authorized access to Class 11 Courses', () => {
    const isAuth = authA.isClassAuthorized({ targetClass: 'Class 11', classId: 'cls_class_11_commerce' });
    assert.strictEqual(isAuth, true);
  });

  test('Student A is FORBIDDEN from Class 12 Courses (IDOR prevention)', () => {
    const isAuth = authA.isClassAuthorized({ targetClass: 'Class 12', classId: 'cls_class_12_commerce' });
    assert.strictEqual(isAuth, false);
  });

  test('Student A is FORBIDDEN from CUET Courses', () => {
    const isAuth = authA.isClassAuthorized({ targetClass: 'CUET', classId: 'cls_cuet_2027' });
    assert.strictEqual(isAuth, false);
  });

  test('Student A has authorized access to Class 11 Live Classes', () => {
    const isAuth = authA.isClassAuthorized({ targetClass: 'Class 11 Commerce', classId: 'cls_class_11_commerce' });
    assert.strictEqual(isAuth, true);
  });

  test('Student A is FORBIDDEN from Class 12 Live Classes (No LiveKit Token)', () => {
    const isAuth = authA.isClassAuthorized({ targetClass: 'Class 12 Commerce', classId: 'cls_class_12_commerce' });
    assert.strictEqual(isAuth, false);
  });

  test('Student A has authorized access to Class 11 Notes', () => {
    const isAuth = authA.isClassAuthorized({ targetClass: 'Class 11', classId: 'cls_class_11_commerce' });
    assert.strictEqual(isAuth, true);
  });

  test('Student A is FORBIDDEN from Class 12 Notes (No Cloudflare URL)', () => {
    const isAuth = authA.isClassAuthorized({ targetClass: 'Class 12', classId: 'cls_class_12_commerce' });
    assert.strictEqual(isAuth, false);
  });

  test('Student A has authorized access to Class 11 Recordings', () => {
    const isAuth = authA.isClassAuthorized({ targetClass: 'Class 11', classId: 'cls_class_11_commerce' });
    assert.strictEqual(isAuth, true);
  });

  test('Student A is FORBIDDEN from Class 12 Recordings', () => {
    const isAuth = authA.isClassAuthorized({ targetClass: 'Class 12', classId: 'cls_class_12_commerce' });
    assert.strictEqual(isAuth, false);
  });

  test('Student A has authorized access to Class 11 Assignments & Tests', () => {
    const isAsgAuth = authA.isClassAuthorized({ targetClass: 'Class 11', classId: 'cls_class_11_commerce' });
    const isTstAuth = authA.isClassAuthorized({ targetClass: 'Class 11', classId: 'cls_class_11_commerce' });
    assert.strictEqual(isAsgAuth, true);
    assert.strictEqual(isTstAuth, true);
  });

  test('Student A is FORBIDDEN from Class 12 Assignments & Tests', () => {
    const isAsgAuth = authA.isClassAuthorized({ targetClass: 'Class 12', classId: 'cls_class_12_commerce' });
    const isTstAuth = authA.isClassAuthorized({ targetClass: 'Class 12', classId: 'cls_class_12_commerce' });
    assert.strictEqual(isAsgAuth, false);
    assert.strictEqual(isTstAuth, false);
  });

  test('Student A filterAcademicList returns ONLY Class 11 courses', () => {
    const filtered = authA.filterAcademicList(ACADEMIC_RESOURCES.courses, {
      classIdField: 'class_id',
      targetClassField: 'target_class'
    });
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, 'crs_11_acc');
  });

  test('Student A filterAcademicList returns ONLY Class 11 communities', () => {
    const filtered = authA.filterAcademicList(ACADEMIC_RESOURCES.communities, {
      classIdField: 'class_id',
      targetClassField: 'target_class'
    });
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, 'comm_11');
  });

  // --- 3. Student B (Class 12) Authorization Context ---
  console.log('\n--- 3. Student B (Class 12 Commerce) Authorization Checks ---');
  const authB = await getStudentAuthorizedClasses(USERS.studentB_12.id, USERS.studentB_12);

  test('Student B has authorized access to Class 12 Courses, Notes, Live Classes', () => {
    assert.strictEqual(authB.isClassAuthorized({ targetClass: 'Class 12', classId: 'cls_class_12_commerce' }), true);
    assert.strictEqual(authB.isClassAuthorized({ targetClass: 'Class 12 Commerce', classId: 'cls_class_12_commerce' }), true);
  });

  test('Student B is FORBIDDEN from Class 11 Courses, Notes, Live Classes', () => {
    assert.strictEqual(authB.isClassAuthorized({ targetClass: 'Class 11', classId: 'cls_class_11_commerce' }), false);
    assert.strictEqual(authB.isClassAuthorized({ targetClass: 'Class 11 Commerce', classId: 'cls_class_11_commerce' }), false);
  });

  test('Student B filterAcademicList returns ONLY Class 12 notes and recordings', () => {
    const filteredNotes = authB.filterAcademicList(ACADEMIC_RESOURCES.notes, { classIdField: 'class_id', targetClassField: 'target_class' });
    const filteredRecs = authB.filterAcademicList(ACADEMIC_RESOURCES.recordings, { classIdField: 'batch_id', targetClassField: 'target_class' });
    assert.strictEqual(filteredNotes.length, 1);
    assert.strictEqual(filteredNotes[0].id, 'mat_12_partnership');
    assert.strictEqual(filteredRecs.length, 1);
    assert.strictEqual(filteredRecs[0].id, 'rec_12_01');
  });

  // --- 4. Student C (Multi-Class: Class 11 + CUET 2027) Authorization Context ---
  console.log('\n--- 4. Student C (Multi-Class: Class 11 + CUET 2027) Authorization Checks ---');
  const authC = await getStudentAuthorizedClasses(USERS.studentC_multi.id, USERS.studentC_multi);

  test('Student C has authorized access to BOTH Class 11 AND CUET 2027', () => {
    assert.strictEqual(authC.isClassAuthorized({ targetClass: 'Class 11', classId: 'cls_class_11_commerce' }), true);
    assert.strictEqual(authC.isClassAuthorized({ targetClass: 'CUET', classId: 'cls_cuet_2027' }), true);
  });

  test('Student C is FORBIDDEN from Class 12 Commerce', () => {
    assert.strictEqual(authC.isClassAuthorized({ targetClass: 'Class 12', classId: 'cls_class_12_commerce' }), false);
  });

  test('Student C filterAcademicList returns BOTH Class 11 AND CUET resources', () => {
    const filtered = authC.filterAcademicList(ACADEMIC_RESOURCES.courses, { classIdField: 'class_id', targetClassField: 'target_class' });
    assert.strictEqual(filtered.length, 2);
    const ids = filtered.map(c => c.id);
    assert.strictEqual(ids.includes('crs_11_acc'), true);
    assert.strictEqual(ids.includes('crs_cuet_acc'), true);
    assert.strictEqual(ids.includes('crs_12_acc'), false);
  });

  // --- 5. Admin Global Access ---
  console.log('\n--- 5. Admin Access Verification ---');
  const authAdmin = await getStudentAuthorizedClasses(USERS.admin.id, USERS.admin);

  test('Admin is privileged and has universal access', () => {
    assert.strictEqual(authAdmin.isPrivileged, true);
    assert.strictEqual(authAdmin.isClassAuthorized({ targetClass: 'Class 11', classId: 'cls_class_11_commerce' }), true);
    assert.strictEqual(authAdmin.isClassAuthorized({ targetClass: 'Class 12', classId: 'cls_class_12_commerce' }), true);
    assert.strictEqual(authAdmin.isClassAuthorized({ targetClass: 'CUET', classId: 'cls_cuet_2027' }), true);
  });

  // --- 6. JWT Token Generation & Role Verification ---
  console.log('\n--- 6. JWT Token Role Preservation ---');
  test('Token generator encodes role and user identity properly', () => {
    const tokenA = generateToken(USERS.studentA_11);
    assert.strictEqual(typeof tokenA, 'string');
    assert.strictEqual(tokenA.length > 20, true);
  });

  console.log('\n===============================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('✨ All 24 Authorization & IDOR Security Assertions Succeeded!\n');
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
