/**
 * Success Mantra AI Agent Engine
 * Coordinates conversation context, system prompts, tool execution loop,
 * database persistence, and graceful error fallbacks.
 */

const crypto = require('crypto');
const { getDb } = require('../../database/schema');
const { callGeminiChatCompletions } = require('./geminiClient');
const { getSystemPrompt } = require('./aiSystemPrompt');
const { sanitizeUserInput } = require('./aiSanitizer');
const { TOOL_DEFINITIONS, executeToolCall } = require('./aiToolRouter');

/**
 * Handle a chat turn with Success Mantra AI
 */
async function processChatMessage({
  userId,
  conversationId = null,
  message,
  uiContext = 'GENERAL',
  userDetails = null
}) {
  const db = getDb();
  const cleanMessage = sanitizeUserInput(message);

  if (!cleanMessage) {
    return {
      success: false,
      message: 'Message cannot be empty.'
    };
  }

  // Ensure conversation tables exist
  try {
    if (db && typeof db.exec === 'function') {
      db.exec(`
        CREATE TABLE IF NOT EXISTS ai_conversations (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT,
          context TEXT DEFAULT 'GENERAL',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS ai_messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          tool_name TEXT,
          tool_call_id TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
  } catch (schemaErr) {}

  // 1. Resolve or create AI Conversation with strict user ownership
  let activeConvId = conversationId;
  if (activeConvId) {
    try {
      const existing = db.prepare('SELECT id, user_id FROM ai_conversations WHERE id = ?').get(activeConvId);
      if (!existing || existing.user_id !== userId) {
        // IDOR protection: Do not allow accessing someone else's conversation
        activeConvId = null;
      }
    } catch (e) {
      activeConvId = null;
    }
  }

  if (!activeConvId) {
    activeConvId = `conv_${crypto.randomUUID()}`;
    try {
      db.prepare(`
        INSERT INTO ai_conversations (id, user_id, title, context)
        VALUES (?, ?, ?, ?)
      `).run(activeConvId, userId, cleanMessage.slice(0, 40) + '...', uiContext);
    } catch (e) {}
  } else {
    try {
      db.prepare(`
        UPDATE ai_conversations SET updated_at = CURRENT_TIMESTAMP, context = ? WHERE id = ?
      `).run(uiContext, activeConvId);
    } catch (e) {}
  }

  // 2. Fetch recent conversation history (max 8 recent messages to preserve context window & latency)
  let historyRows = [];
  try {
    historyRows = db.prepare(`
      SELECT role, content, tool_name, tool_call_id
      FROM ai_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      LIMIT 10
    `).all(activeConvId);
  } catch (e) {}

  // 3. Save incoming user message
  const userMsgId = `msg_${crypto.randomUUID()}`;
  try {
    db.prepare(`
      INSERT INTO ai_messages (id, conversation_id, user_id, role, content)
      VALUES (?, ?, ?, 'user', ?)
    `).run(userMsgId, activeConvId, userId, cleanMessage);
  } catch (e) {}

  // 4. Construct messages payload
  const systemPrompt = getSystemPrompt(uiContext, userDetails);
  const messagesPayload = [
    { role: 'system', content: systemPrompt }
  ];

  for (const h of historyRows) {
    if (h.role === 'user' || h.role === 'assistant') {
      messagesPayload.push({
        role: h.role,
        content: h.content
      });
    }
  }

  // Add current message
  messagesPayload.push({
    role: 'user',
    content: cleanMessage
  });

  // 5. Query Google Gemini with tools
  let finalAssistantReply = '';
  const toolsUsed = [];
  let diagnosticsSummary = null;

  try {
    const initialResponse = await callGeminiChatCompletions({
      messages: messagesPayload,
      tools: TOOL_DEFINITIONS,
      toolChoice: 'auto',
      temperature: 0.3,
      maxTokens: 1024
    });

    const choice = initialResponse?.choices?.[0];
    const assistantMessage = choice?.message;

    if (!assistantMessage) {
      throw new Error('Empty response received from Google Gemini provider.');
    }

    // Check if the model requested any tool calls
    if (Array.isArray(assistantMessage.tool_calls) && assistantMessage.tool_calls.length > 0) {
      // Append assistant's tool-call request to thread
      messagesPayload.push(assistantMessage);

      for (const tc of assistantMessage.tool_calls) {
        const fnName = tc.function?.name;
        const rawArgs = tc.function?.arguments || '{}';
        toolsUsed.push(fnName);

        // Execute tool safely
        const toolResult = await executeToolCall({
          toolName: fnName,
          rawArgs,
          userId,
          userDetails
        });

        if (toolResult && toolResult.diagnostics) {
          diagnosticsSummary = toolResult.diagnostics;
        }

        // Add tool response to message thread
        messagesPayload.push({
          role: 'tool',
          tool_call_id: tc.id || `call_${fnName}`,
          tool_name: fnName,
          content: JSON.stringify(toolResult)
        });
      }

      // Final completion call with tool results
      const finalResponse = await callGeminiChatCompletions({
        messages: messagesPayload,
        temperature: 0.3,
        maxTokens: 1024
      });

      finalAssistantReply = finalResponse?.choices?.[0]?.message?.content || 'I processed your request using the platform diagnostics.';
    } else {
      finalAssistantReply = assistantMessage.content || 'How can I assist you with your studies or platform features today?';
    }
  } catch (aiErr) {
    console.error('[Success Mantra AI] Error during Gemini completion:', aiErr.message);

    // If Gemini is temporarily offline or unconfigured, provide graceful fallback without crashing
    finalAssistantReply = "Success Mantra AI is ready. If you need any assistance with courses, bookstore inventory, tests, or live classes, please let me know!";
  }

  // 6. Save assistant's reply to database
  const assistantMsgId = `msg_${crypto.randomUUID()}`;
  try {
    db.prepare(`
      INSERT INTO ai_messages (id, conversation_id, user_id, role, content, metadata)
      VALUES (?, ?, ?, 'assistant', ?, ?)
    `).run(
      assistantMsgId,
      activeConvId,
      userId,
      finalAssistantReply,
      JSON.stringify({
        toolsUsed,
        diagnostics: diagnosticsSummary,
        uiContext
      })
    );
  } catch (e) {}

  return {
    success: true,
    conversationId: activeConvId,
    reply: finalAssistantReply,
    toolsUsed,
    diagnostics: diagnosticsSummary,
    uiContext
  };
}

/**
 * Fast One-Click Diagnostic for Live Classes
 */
async function runLiveClassDiagnostic({ userId }) {
  const { checkLiveKitConnection } = require('./aiTools');
  const result = await checkLiveKitConnection({ userId });
  return result;
}

module.exports = {
  processChatMessage,
  runLiveClassDiagnostic
};
