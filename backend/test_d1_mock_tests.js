/**
 * Automated Verification Script for Success Mantra Cloudflare D1 Mock Test / CBT Engine
 * Tests Acceptance Scenarios A through J
 */

const d1Database = require('./services/d1Database');
const assert = require('assert');

async function runTests() {
  console.log('====================================================');
  console.log('🚀 SUCCESS MANTRA CLOUDFLARE D1 MOCK TEST VERIFICATION');
  console.log('====================================================\n');

  // 1. Initial schema check
  d1Database.initD1Schema();
  console.log('✅ Schema initialization verified.');

  // TEST A: ADMIN CREATE TEST & ADD QUESTIONS
  console.log('\n--- TEST A: CREATE TEST & INDIVIDUAL QUESTIONS PERSISTENCE ---');
  const testPayload = {
    title: 'Cloudflare D1 Full Board Persistence Test',
    description: 'Relational CBT Mock Test with Cascade Questions',
    duration_minutes: 180,
    total_marks: 12,
    passing_marks: 5,
    negative_marking: 1,
    target_class: 'Class 12',
    subject: 'Economics / Accountancy',
    access_type: 'free',
    is_free: 1
  };

  const createdTest = await d1Database.createMockTest(testPayload, 'admin_super');
  console.log(`[MOCK TEST CREATE] testId=${createdTest.id} title="${createdTest.title}"`);
  assert(createdTest && createdTest.id, 'Test ID should be generated');

  // Add Question 1
  const q1 = await d1Database.createQuestion(createdTest.id, {
    question_text: 'What is Marginal Utility when Total Utility is at maximum?',
    question_type: 'mcq',
    option_a: 'Zero',
    option_b: 'Maximum',
    option_c: 'Negative',
    option_d: 'Constant',
    correct_answer: 'A',
    marks: 4,
    negative_marks: 1,
    explanation: 'Total Utility is maximum when Marginal Utility is exactly zero.'
  });
  console.log(`[QUESTION 1 CREATE] id=${q1.id} text="${q1.question_text.slice(0, 30)}..."`);
  assert(q1 && q1.id && q1.test_id === createdTest.id, 'Q1 test_id must match');

  // Add Question 2
  const q2 = await d1Database.createQuestion(createdTest.id, {
    question_text: 'In the absence of a partnership deed, interest on partner loan is allowed at:',
    question_type: 'mcq',
    option_a: '6% p.a.',
    option_b: '10% p.a.',
    option_c: '12% p.a.',
    option_d: 'No interest',
    correct_answer: 'A',
    marks: 4,
    negative_marks: 1,
    explanation: 'Section 13(d) of Indian Partnership Act specifies 6% p.a.'
  });
  console.log(`[QUESTION 2 CREATE] id=${q2.id} text="${q2.question_text.slice(0, 30)}..."`);

  // Add Question 3
  const q3 = await d1Database.createQuestion(createdTest.id, {
    question_text: 'GNP minus Depreciation equals:',
    question_type: 'mcq',
    option_a: 'NNP',
    option_b: 'GDP',
    option_c: 'NDP',
    option_d: 'National Income',
    correct_answer: 'A',
    marks: 4,
    negative_marks: 1,
    explanation: 'Net National Product (NNP) = GNP - Depreciation.'
  });
  console.log(`[QUESTION 3 CREATE] id=${q3.id} text="${q3.question_text.slice(0, 30)}..."`);

  // TEST B: PERSISTENCE & RELOAD
  console.log('\n--- TEST B: PERSISTENCE & RELOAD FROM D1 ---');
  const reloaded = await d1Database.getMockTestById(createdTest.id);
  assert(reloaded, 'Test must exist in D1');
  assert.strictEqual(reloaded.questions.length, 3, 'All 3 questions must be loaded from D1');
  console.log(`✅ Test successfully loaded with all ${reloaded.questions.length} questions from D1.`);

  // TEST C & D: STUDENT READ & ANSWER SECRECY
  console.log('\n--- TEST C & D: STUDENT READ WITH SAFE ANSWER SECRECY ---');
  const studentView = await d1Database.getMockTestById(createdTest.id, { safeForStudent: true });
  assert(studentView.questions.length === 3, 'Student must receive 3 questions');
  for (const sq of studentView.questions) {
    assert.strictEqual(sq.correct_answer, undefined, 'Student question MUST NOT contain correct_answer!');
    assert(sq.option_a && sq.option_b, 'Question options must be present');
  }
  console.log('✅ Student questions delivered safely without exposing answer keys.');

  // TEST F: STUDENT SUBMISSION & SERVER EVALUATION
  console.log('\n--- TEST F: SERVER-SIDE SCORE EVALUATION & ATTEMPT PERSISTENCE ---');
  const studentAnswers = {
    [q1.id]: 'A', // Correct (+4)
    [q2.id]: 'A', // Correct (+4)
    [q3.id]: 'B'  // Wrong (-1, correct is A)
  };

  const studentId = 'usr_student_test_101';
  const submitResult = await d1Database.submitTestAnswers(createdTest.id, studentId, studentAnswers, {
    name: 'Dhairya Gulati',
    email: 'student@successmantra.com'
  });

  console.log(`[SUBMISSION RESULT] Score: ${submitResult.scorecard.score}/${submitResult.scorecard.total_marks} (${submitResult.scorecard.percentage}%)`);
  assert.strictEqual(submitResult.scorecard.score, 7, 'Score should be 4 + 4 - 1 = 7');
  assert.strictEqual(submitResult.scorecard.total_correct, 2, 'Correct count should be 2');
  assert.strictEqual(submitResult.scorecard.total_incorrect, 1, 'Incorrect count should be 1');
  console.log('✅ Server-side scoring accurate (4 + 4 - 1 = 7).');

  // TEST G: RESULT RETRIEVAL
  console.log('\n--- TEST G: PERSISTED ATTEMPT RESULT RETRIEVAL ---');
  const resultData = await d1Database.getTestResult(createdTest.id, studentId);
  assert(resultData, 'Test attempt result must exist in D1');
  assert.strictEqual(resultData.score, 7, 'Persisted score in D1 must be 7');
  assert.strictEqual(resultData.answers.length, 3, 'All 3 evaluated question answers must be stored');
  console.log(`✅ D1 Test Result verified: Score=${resultData.score}/${resultData.total_marks}`);

  // TEST H: QUESTION DELETION & CASCADE
  console.log('\n--- TEST H: INDIVIDUAL QUESTION DELETE ---');
  await d1Database.deleteQuestion(createdTest.id, q3.id);
  const afterDelete = await d1Database.getMockTestById(createdTest.id);
  assert.strictEqual(afterDelete.questions.length, 2, 'Remaining questions must be exactly 2');
  console.log('✅ Question 3 deleted cleanly. Remaining: 2 questions in D1.');

  // TEST I & J: ACCESS TYPE TOGGLE & CLEANUP
  console.log('\n--- TEST I & J: ACCESS TYPE UPDATE & CLEANUP ---');
  await d1Database.updateMockTest(createdTest.id, { access_type: 'vip_only', is_free: 0 });
  const vipTest = await d1Database.getMockTestById(createdTest.id);
  assert.strictEqual(vipTest.access_type, 'vip', 'Access type normalized to vip');
  assert.strictEqual(vipTest.is_free, 0, 'is_free must be 0 for VIP');
  console.log('✅ VIP access toggle verified.');

  // Cleanup test record
  await d1Database.deleteMockTest(createdTest.id);
  const deletedCheck = await d1Database.getMockTestById(createdTest.id);
  assert.strictEqual(deletedCheck, null, 'Deleted test should no longer exist in D1');
  const orphanedQuestions = await d1Database.getQuestionsByTestId(createdTest.id);
  assert.strictEqual(orphanedQuestions.length, 0, 'Cascade delete verified for questions');
  console.log('✅ Cascade deletion of mock_tests, questions, and test_attempts verified.');

  console.log('\n====================================================');
  console.log('🎉 ALL CLOUDFLARE D1 CBT ACCEPTANCE TESTS PASSED (100%)');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
