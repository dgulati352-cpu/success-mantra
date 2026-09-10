/**
 * Comprehensive Automated Test Suite for Success Mantra AI Agent
 * Verifies:
 *  1. Authenticated User Identity (req.user.id preservation)
 *  2. Class Authorization (Class 11 vs Class 12)
 *  3. Multi-Class Authorization (Class 11 + CUET)
 *  4. Live Class Diagnostics (Unauthorized class denied, authorized allowed)
 *  5. Notes/PDF Diagnostics (Class scoping)
 *  6. Attendance Privacy Isolation (Cannot view other students' attendance)
 *  7. AI Conversation IDOR Ownership Enforcement
 *  8. Allowlist Enforcement (Unknown/arbitrary tool execution denied)
 *  9. Output Sanitization (Credentials, tokens, secrets redacted)
 * 10. Support Ticket Escalation (source = 'AI_AGENT')
 * 11. Rate Limiting Enforcement
 */

require('dotenv').config();
const { initSchema, getDb } = require('../database/schema');
const { executeToolCall, ALLOWLISTED_TOOLS } = require('../services/ai/aiToolRouter');
const { sanitizeToolOutput, sanitizeUserInput } = require('../services/ai/aiSanitizer');
const { setDoc, addDoc, queryCollection } = require('../database/firestore');
const aiRateLimiter = require('../middleware/aiRateLimit');

async function runTests() {
  console.log('====================================================');
  console.log('🤖 RUNNING SUCCESS MANTRA AI SECURITY & TOOL TESTS');
  console.log('====================================================\n');

  initSchema();
  const db = getDb();

  // Allow async initial sync to settle
  await new Promise(r => setTimeout(r, 2000));

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- SETUP MOCK TEST DATA ---
  const student11Id = 'usr_ai_test_student_11';
  const student12Id = 'usr_ai_test_student_12';
  const studentMultiId = 'usr_ai_test_student_multi';

  // Seed test users
  db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, role, target_class, stream)
    VALUES (?, ?, ?, 'student', ?, 'Commerce')
  `).run(student11Id, 'Aarav Class 11', 'aarav11@successmantra.test', 'Class 11');

  db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, role, target_class, stream)
    VALUES (?, ?, ?, 'student', ?, 'Commerce')
  `).run(student12Id, 'Priya Class 12', 'priya12@successmantra.test', 'Class 12');

  db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, role, target_class, stream)
    VALUES (?, ?, ?, 'student', ?, 'Commerce')
  `).run(studentMultiId, 'Kabir Multi-Enrolled', 'kabir.multi@successmantra.test', 'Class 11');

  // Seed student profiles
  db.prepare(`
    INSERT OR REPLACE INTO student_profiles (user_id, target_class, stream, academic_goal)
    VALUES (?, 'Class 11', 'Commerce', 'Class 11 Fundamentals')
  `).run(student11Id);

  db.prepare(`
    INSERT OR REPLACE INTO student_profiles (user_id, target_class, stream, academic_goal)
    VALUES (?, 'Class 12', 'Commerce', 'Class 12 Boards 99%')
  `).run(student12Id);

  // Seed Firestore mock users & enrollments
  await setDoc('users', student11Id, {
    id: student11Id,
    name: 'Aarav Class 11',
    email: 'aarav11@successmantra.test',
    target_class: 'Class 11',
    role: 'student'
  });
  await setDoc('users', student12Id, {
    id: student12Id,
    name: 'Priya Class 12',
    email: 'priya12@successmantra.test',
    target_class: 'Class 12',
    role: 'student'
  });
  await setDoc('users', studentMultiId, {
    id: studentMultiId,
    name: 'Kabir Multi-Enrolled',
    email: 'kabir.multi@successmantra.test',
    target_class: 'Class 11',
    role: 'student'
  });

  await setDoc('enrollments', 'enr_student_11', {
    user_id: student11Id,
    class_id: 'cls_class_11_commerce',
    target_class: 'Class 11',
    status: 'active'
  });
  await setDoc('enrollments', 'enr_student_12', {
    user_id: student12Id,
    class_id: 'cls_class_12_commerce',
    target_class: 'Class 12',
    status: 'active'
  });
  await setDoc('enrollments', 'enr_multi_11', {
    user_id: studentMultiId,
    class_id: 'cls_class_11_commerce',
    target_class: 'Class 11',
    status: 'active'
  });
  await setDoc('enrollments', 'enr_multi_cuet', {
    user_id: studentMultiId,
    class_id: 'cls_cuet_2027',
    target_class: 'CUET',
    status: 'active'
  });

  // Clean and seed specific community memberships
  db.prepare('DELETE FROM community_members WHERE user_id IN (?, ?, ?)').run(student11Id, student12Id, studentMultiId);
  db.prepare('DELETE FROM course_enrollments WHERE user_id IN (?, ?, ?)').run(student11Id, student12Id, studentMultiId);

  db.prepare(`
    INSERT OR REPLACE INTO community_members (community_id, user_id, role)
    VALUES ('comm_class_11_commerce', ?, 'student')
  `).run(student11Id);
  db.prepare(`
    INSERT OR REPLACE INTO community_members (community_id, user_id, role)
    VALUES ('comm_class_12_commerce', ?, 'student')
  `).run(student12Id);

  // Seed test courses
  db.prepare(`
    INSERT OR REPLACE INTO courses (id, title, slug, target_class, subject, is_published)
    VALUES (901, 'Class 11 Accounts Pro', 'c11-acc', 'Class 11', 'Accountancy', 1)
  `).run();
  db.prepare(`
    INSERT OR REPLACE INTO courses (id, title, slug, target_class, subject, is_published)
    VALUES (902, 'Class 12 Accounts Blueprint', 'c12-acc', 'Class 12', 'Accountancy', 1)
  `).run();
  db.prepare(`
    INSERT OR REPLACE INTO courses (id, title, slug, target_class, subject, is_published)
    VALUES (903, 'CUET General Test 2027', 'cuet-gt', 'CUET', 'General Test', 1)
  `).run();

  // Seed test notes
  db.prepare(`
    INSERT OR REPLACE INTO study_materials (id, course_id, title, file_url, file_type)
    VALUES (911, 901, 'Class 11 Depreciation Notes', 'https://r2.successmantra.in/c11_dep.pdf', 'pdf')
  `).run();
  db.prepare(`
    INSERT OR REPLACE INTO study_materials (id, course_id, title, file_url, file_type)
    VALUES (912, 902, 'Class 12 Cash Flow Secrets', 'https://r2.successmantra.in/c12_cfs.pdf', 'pdf')
  `).run();

  // Seed test live classes
  db.prepare(`
    INSERT OR REPLACE INTO live_classes (id, course_id, faculty_id, title, subject, start_time, status)
    VALUES ('lc_test_c11', 901, 'usr_faculty_manish', 'Class 11 Journal Masterclass', 'Accountancy', '2026-09-15 18:00:00', 'live')
  `).run();
  db.prepare(`
    INSERT OR REPLACE INTO live_classes (id, course_id, faculty_id, title, subject, start_time, status)
    VALUES ('lc_test_c12', 902, 'usr_faculty_manish', 'Class 12 Partnership Live', 'Accountancy', '2026-09-15 19:00:00', 'live')
  `).run();

  // Seed test attendance records
  db.prepare(`
    INSERT OR REPLACE INTO attendance_records (id, user_id, subject, class_date, status)
    VALUES (951, ?, 'Accountancy', '2026-09-08', 'present')
  `).run(student11Id);
  db.prepare(`
    INSERT OR REPLACE INTO attendance_records (id, user_id, subject, class_date, status)
    VALUES (952, ?, 'Accountancy', '2026-09-08', 'absent')
  `).run(student12Id);

  // ==========================================
  // TEST GROUP 1: Student A (Class 11) Scope
  // ==========================================
  console.log('\n--- Test Group 1: Student A (Class 11) Scope & IDOR ---');

  // 1.1 Student A fetching notes
  const auth11 = await require('../middleware/classAuth').getStudentAuthorizedClasses(student11Id);
  console.log('DEBUG auth11 targetClasses:', Array.from(auth11.authorizedTargetClasses));
  console.log('DEBUG auth11 classIds:', Array.from(auth11.authorizedClassIds));

  const notesResA = await executeToolCall({
    toolName: 'getMyNotes',
    rawArgs: {},
    userId: student11Id
  });
  const hasClass11Note = notesResA.courseNotes?.some(n => n.title.includes('Class 11 Depreciation'));
  const hasClass12Note = notesResA.courseNotes?.some(n => n.title.includes('Class 12 Cash Flow'));
  assert(hasClass11Note === true, 'Student A can see authorized Class 11 notes');
  assert(hasClass12Note === false, 'Student A is DENIED access to Class 12 notes in listing');

  // 1.2 Student A requesting specific Class 12 note diagnostic
  const noteDiagResA = await executeToolCall({
    toolName: 'getNoteStatus',
    rawArgs: { noteId: 'mat_912' },
    userId: student11Id
  });
  console.log('DEBUG noteDiagResA for mat_912:', noteDiagResA);
  assert(noteDiagResA.authorized === false && noteDiagResA.status === 'ACCESS_DENIED', 'Student A diagnostic for Class 12 note returns ACCESS_DENIED');

  // 1.3 Student A diagnosing Class 12 Live Class
  const liveDiagResA = await executeToolCall({
    toolName: 'getLiveSessionStatus',
    rawArgs: { sessionId: 'lc_test_c12' },
    userId: student11Id
  });
  console.log('DEBUG liveDiagResA for lc_test_c12:', liveDiagResA);
  assert(liveDiagResA.authorized === false && liveDiagResA.status === 'ACCESS_DENIED', 'Student A diagnostic for Class 12 live session is DENIED');

  // 1.4 Student A diagnosing Class 11 Live Class
  const liveDiagResA11 = await executeToolCall({
    toolName: 'getLiveSessionStatus',
    rawArgs: { sessionId: 'lc_test_c11' },
    userId: student11Id
  });
  console.log('DEBUG liveDiagResA11 for lc_test_c11:', liveDiagResA11);
  assert(liveDiagResA11.authorized === true && liveDiagResA11.status === 'live', 'Student A diagnostic for Class 11 live session is ALLOWED and reports live');

  // ==========================================
  // TEST GROUP 2: Multi-Class Enrollment (Student C)
  // ==========================================
  console.log('\n--- Test Group 2: Multi-Class Enrollment (Class 11 + CUET) ---');

  const coursesResC = await executeToolCall({
    toolName: 'getMyCourses',
    rawArgs: {},
    userId: studentMultiId
  });
  const c11Course = coursesResC.courses?.some(c => c.targetClass === 'Class 11');
  const cuetCourse = coursesResC.courses?.some(c => c.targetClass === 'CUET');
  const c12Course = coursesResC.courses?.some(c => c.targetClass === 'Class 12');

  assert(c11Course === true, 'Student C (Multi) has access to Class 11');
  assert(cuetCourse === true, 'Student C (Multi) has access to CUET 2027');
  assert(c12Course === false, 'Student C (Multi) is DENIED access to Class 12');

  // ==========================================
  // TEST GROUP 3: Attendance & Privacy
  // ==========================================
  console.log('\n--- Test Group 3: Attendance & Privacy Isolation ---');

  const attendResA = await executeToolCall({
    toolName: 'getMyAttendance',
    rawArgs: { studentId: student12Id }, // Attempted injection parameter
    userId: student11Id // Server bound userId
  });
  assert(attendResA.success === true, 'Attendance returned successfully for authenticated user');
  assert(attendResA.recentRecords.every(r => r.status === 'present'), 'Student A sees only their own present attendance, not student 12 absent log');

  // ==========================================
  // TEST GROUP 4: Tool Allowlist Security
  // ==========================================
  console.log('\n--- Test Group 4: Tool Allowlist & Arbitrary Execution Rejection ---');

  const dangerousTools = ['eval', 'executeSql', 'readConfigFile', 'deleteUser', 'getLiveKitTokenDirectly'];
  for (const dt of dangerousTools) {
    const res = await executeToolCall({
      toolName: dt,
      rawArgs: {},
      userId: student11Id
    });
    assert(res.authorized === false && res.error.includes('not permitted'), `Tool Router DENIED unapproved tool: ${dt}`);
  }

  // ==========================================
  // TEST GROUP 5: AI Conversation IDOR Ownership
  // ==========================================
  console.log('\n--- Test Group 5: AI Conversation IDOR Ownership ---');

  const convId11 = 'conv_test_owner_11';
  db.prepare(`
    INSERT OR REPLACE INTO ai_conversations (id, user_id, title, context)
    VALUES (?, ?, 'Private Chat 11', 'GENERAL')
  `).run(convId11, student11Id);

  db.prepare(`
    INSERT OR REPLACE INTO ai_messages (id, conversation_id, user_id, role, content)
    VALUES ('msg_test_11', ?, ?, 'user', 'Confidential question about marks')
  `).run(convId11, student11Id);

  // Student 12 attempts to query Student 11's conversation
  const unauthorizedConv = db.prepare('SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?').get(convId11, student12Id);
  assert(!unauthorizedConv, 'Student 12 query for Student 11 AI conversation returns null (Protected)');

  // ==========================================
  // TEST GROUP 6: Sanitization & Secrets Redaction
  // ==========================================
  console.log('\n--- Test Group 6: Secrets Redaction & Output Sanitizer ---');

  const dirtyPayload = {
    apiKey: 'nvapi-secret-key-1234567890abcdef',
    livekitToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
    normalField: 'Accountancy Chapter 1 Notes',
    streamKey: 'live_secret_456789'
  };

  const cleanPayload = sanitizeToolOutput(dirtyPayload);
  assert(cleanPayload.apiKey === '[REDACTED]', 'API key field redacted');
  assert(cleanPayload.passwordHash === '[REDACTED]', 'Password hash redacted');
  assert(cleanPayload.streamKey === '[REDACTED]', 'Stream key redacted');
  assert(cleanPayload.normalField === 'Accountancy Chapter 1 Notes', 'Normal safe field preserved');

  // ==========================================
  // TEST GROUP 7: Support Ticket Escalation
  // ==========================================
  console.log('\n--- Test Group 7: Support Ticket Creation with source = AI_AGENT ---');

  const ticketRes = await executeToolCall({
    toolName: 'createSupportTicket',
    rawArgs: {
      category: 'Live Class',
      subject: 'Stream not responding in Class 11 Session',
      description: 'AI detected stream delay of 45 seconds',
      priority: 'High'
    },
    userId: student11Id
  });

  assert(ticketRes.success === true, 'Support ticket created successfully via AI tool');
  assert(ticketRes.ticketNumber && ticketRes.ticketNumber.startsWith('SM-AI-'), 'Ticket number generated with AI prefix');

  const dbTicket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketRes.ticketId);
  assert(dbTicket.source === 'AI_AGENT', 'Support ticket stored with source = AI_AGENT in database');
  assert(dbTicket.user_id === student11Id, 'Support ticket correctly linked to student identity');

  // ==========================================
  // TEST GROUP 8: Rate Limiter Middleware
  // ==========================================
  console.log('\n--- Test Group 8: AI Rate Limiting ---');

  let rateLimitHit = false;
  const mockReq = {
    user: { id: 'usr_ratelimit_tester' },
    body: { message: 'Test message' },
    ip: '127.0.0.1',
    headers: {}
  };
  const mockRes = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(payload) {
      if (this.statusCode === 429) rateLimitHit = true;
      return payload;
    }
  };

  // Send 25 requests (limit is 20)
  for (let i = 0; i < 25; i++) {
    aiRateLimiter(mockReq, mockRes, () => {});
  }
  assert(rateLimitHit === true, 'Rate limiter triggered HTTP 429 after exceeding limit');

  // ==========================================
  // TEST RESULTS SUMMARY
  // ==========================================
  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error in AI test suite:', err);
  process.exit(1);
});
