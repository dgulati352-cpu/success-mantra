/**
 * Automated Verification Test Suite for Success Mantra AI (Google Gemini Free Tier)
 */

const assert = require('assert');
require('dotenv').config({ path: './backend/.env' });
const { getDb } = require('./database/schema');
const { 
  convertToolsToGeminiFormat, 
  convertMessagesToGemini, 
  convertGeminiResponseToOpenAI,
  DEFAULT_MODEL,
  FALLBACK_MODEL
} = require('./services/ai/geminiClient');
const { TOOL_DEFINITIONS, executeToolCall, ALLOWLISTED_TOOLS } = require('./services/ai/aiToolRouter');
const { getSystemPrompt } = require('./services/ai/aiSystemPrompt');
const { processChatMessage } = require('./services/ai/aiAgent');

async function runGeminiIntegrationSuite() {
  console.log('================================================================');
  console.log('TEST SUITE: SUCCESS MANTRA AI (GOOGLE GEMINI FREE TIER)');
  console.log('================================================================\n');

  const db = getDb();
  const adminUser = db.prepare("SELECT id, name, role FROM users WHERE role = 'admin' LIMIT 1").get();
  const studentUser = db.prepare("SELECT id, name, role, target_class FROM users WHERE role = 'student' LIMIT 1").get();

  assert(adminUser, 'Admin user must exist in database.');
  assert(studentUser, 'Student user must exist in database.');

  // TEST 1: Tool definitions and Gemini Schema conversion
  console.log('--- TEST 1: Gemini Tool Schema Conversion (27 Allowlisted Tools) ---');
  assert.strictEqual(TOOL_DEFINITIONS.length, 27, 'Expected exactly 27 registered tool definitions');
  const geminiTools = convertToolsToGeminiFormat(TOOL_DEFINITIONS);
  assert(Array.isArray(geminiTools) && geminiTools.length === 1, 'Expected tools array of length 1');
  assert(Array.isArray(geminiTools[0].functionDeclarations), 'Expected functionDeclarations array');
  assert.strictEqual(geminiTools[0].functionDeclarations.length, 27, 'Expected 27 functionDeclarations');
  console.log('✓ Verified: 27 tools successfully converted to Gemini Function Declarations format.');

  // TEST 2: OpenAI <-> Gemini Message Conversion
  console.log('\n--- TEST 2: Multi-turn Message & Tool Call Conversion ---');
  const mockChatThread = [
    { role: 'system', content: 'You are Success Mantra AI.' },
    { role: 'user', content: 'What courses am I enrolled in?' },
    {
      role: 'assistant',
      content: null,
      tool_calls: [{
        id: 'call_getMyCourses_0',
        function: { name: 'getMyCourses', arguments: '{}' }
      }]
    },
    {
      role: 'tool',
      tool_call_id: 'call_getMyCourses_0',
      tool_name: 'getMyCourses',
      content: JSON.stringify({ success: true, enrolledCourses: [{ id: 1, title: 'Accounts Class 12' }] })
    }
  ];

  const geminiPayload = convertMessagesToGemini(mockChatThread);
  assert.strictEqual(geminiPayload.systemInstruction, 'You are Success Mantra AI.');
  assert.strictEqual(geminiPayload.contents.length, 3, 'Expected 3 turns: user, model, user(functionResponse)');
  assert.strictEqual(geminiPayload.contents[0].role, 'user');
  assert.strictEqual(geminiPayload.contents[1].role, 'model');
  assert.strictEqual(geminiPayload.contents[1].parts[0].functionCall.name, 'getMyCourses');
  assert.strictEqual(geminiPayload.contents[2].role, 'user');
  assert.strictEqual(geminiPayload.contents[2].parts[0].functionResponse.name, 'getMyCourses');
  assert(geminiPayload.contents[2].parts[0].functionResponse.response.success === true);
  console.log('✓ Verified: Multi-turn message conversion & functionResponse mapping pass seamlessly.');

  // TEST 3: Gemini Response to OpenAI Format Conversion
  console.log('\n--- TEST 3: Gemini SDK Response Normalization ---');
  const mockGeminiModelResponse = {
    candidates: [{
      content: {
        parts: [
          {
            functionCall: {
              name: 'getAdminOverview',
              args: {}
            }
          }
        ]
      }
    }]
  };
  const normalized = convertGeminiResponseToOpenAI(mockGeminiModelResponse);
  assert(normalized.choices[0].message.tool_calls.length === 1);
  assert.strictEqual(normalized.choices[0].message.tool_calls[0].function.name, 'getAdminOverview');
  console.log('✓ Verified: Gemini tool call candidates normalize correctly to OpenAI tool_calls structure.');

  // TEST 4: Role-Aware System Prompt
  console.log('\n--- TEST 4: Role-Aware System Prompts (Admin vs Student) ---');
  const studentPrompt = getSystemPrompt('LIVE_CLASS', studentUser);
  const adminPrompt = getSystemPrompt('ADMIN_BOOKS', adminUser);

  assert(!studentPrompt.includes('### Admin Context:'), 'Student prompt must not include Admin context');
  assert(adminPrompt.includes('### Admin Context:'), 'Admin prompt must include Admin context');
  assert(adminPrompt.includes('You are assisting an administrator'), 'Admin instructions must be present');
  console.log('✓ Verified: System prompt dynamically injects admin guidance for administrators and student constraints for students.');

  // TEST 5: RBAC Enforcement on Admin Tools
  console.log('\n--- TEST 5: Security & RBAC Enforcement on Admin Tools ---');
  const unauthorizedAdminCall = await executeToolCall({
    toolName: 'getAdminOverview',
    rawArgs: {},
    userId: studentUser.id
  });
  assert(unauthorizedAdminCall.error && unauthorizedAdminCall.error.includes('Unauthorized'), 'Student calling admin tool must be denied');

  const authorizedAdminCall = await executeToolCall({
    toolName: 'getAdminOverview',
    rawArgs: {},
    userId: adminUser.id
  });
  assert(authorizedAdminCall.success === true, 'Admin calling getAdminOverview must succeed');
  assert(typeof authorizedAdminCall.platformStats.totalStudents === 'number', 'Expected numeric student count');
  console.log(`✓ Verified: Student blocked from Admin tool. Admin returned live platform stats (Total Students: ${authorizedAdminCall.platformStats.totalStudents}, Courses: ${authorizedAdminCall.platformStats.totalCourses}).`);

  // TEST 6: Student Bookstore Tool Execution
  console.log('\n--- TEST 6: Student Bookstore Tool Execution ---');
  const studentBooks = await executeToolCall({
    toolName: 'getMyBooks',
    rawArgs: {},
    userId: studentUser.id
  });
  assert(studentBooks.success === true, 'getMyBooks should succeed');
  assert(Array.isArray(studentBooks.books), 'Expected books array');
  console.log(`✓ Verified: Student successfully queried bookstore via AI tools (${studentBooks.books.length} publications available).`);

  // TEST 7: Admin Bookstore Inventory Tool Execution
  console.log('\n--- TEST 7: Admin Bookstore Inventory Tool Execution ---');
  const adminBookStats = await executeToolCall({
    toolName: 'getAdminBookStats',
    rawArgs: {},
    userId: adminUser.id
  });
  assert(adminBookStats.success === true, 'Admin getAdminBookStats should succeed');
  assert(typeof adminBookStats.summary.totalBooks === 'number');
  assert(Array.isArray(adminBookStats.lowStockBooks));
  console.log(`✓ Verified: Admin bookstore diagnostics passed (Total: ${adminBookStats.summary.totalBooks}, Low Stock: ${adminBookStats.summary.lowStockCount}).`);

  // TEST 8: Live AI Chat Turn with Google Gemini
  console.log('\n--- TEST 8: Live AI Chat Turn with Google Gemini ---');
  const chatResult = await processChatMessage({
    userId: studentUser.id,
    message: 'Hello Success Mantra AI, how can you help me today?',
    uiContext: 'GENERAL',
    userDetails: studentUser
  });
  assert(chatResult.success === true, 'processChatMessage must succeed');
  assert(typeof chatResult.reply === 'string' && chatResult.reply.length > 0, 'Reply must be a non-empty string');
  assert(chatResult.conversationId, 'Conversation ID must be generated or tracked');
  console.log(`✓ Verified: Live Gemini chat turn completed (Conversation ID: ${chatResult.conversationId}).`);
  console.log(`  Assistant Response: "${chatResult.reply.slice(0, 100)}..."`);

  console.log('\n================================================================');
  console.log('🎉 ALL 8 GEMINI AI INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================\n');
  process.exit(0);
}

runGeminiIntegrationSuite().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
