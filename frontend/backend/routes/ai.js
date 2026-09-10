/**
 * Success Mantra AI API Routes
 * Endpoints for AI Chat, Live Class Diagnostics, Conversations, and Ticket Escalations.
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const aiRateLimiter = require('../middleware/aiRateLimit');
const { processChatMessage, runLiveClassDiagnostic } = require('../services/ai/aiAgent');
const { createSupportTicket, getMySupportTickets } = require('../services/ai/aiTools');
const { getDb } = require('../database/schema');

// All AI endpoints require user authentication
router.use(verifyToken);

/**
 * POST /api/ai/chat
 * Primary conversation endpoint with NVIDIA NIM & allowlisted tools
 */
router.post('/chat', aiRateLimiter, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { message, conversationId, uiContext } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message string is required.'
      });
    }

    const result = await processChatMessage({
      userId,
      conversationId: conversationId || null,
      message,
      uiContext: uiContext || 'GENERAL',
      userDetails: req.user
    });

    res.json(result);
  } catch (err) {
    console.error('[AI Chat Route Error]:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI request.',
      error: process.env.NODE_ENV === 'production' ? null : err.message
    });
  }
});

/**
 * POST /api/ai/diagnose/live
 * Fast one-click diagnostic check for the student's live classroom connection
 */
router.post('/diagnose/live', aiRateLimiter, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const result = await runLiveClassDiagnostic({ userId });
    res.json(result);
  } catch (err) {
    console.error('[AI Diagnose Live Error]:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to complete live class diagnostics.'
    });
  }
});

/**
 * GET /api/ai/conversations
 * Retrieve all conversation threads belonging to the authenticated student
 */
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const db = getDb();

    const conversations = db.prepare(`
      SELECT id, title, context, created_at, updated_at
      FROM ai_conversations
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT 30
    `).all(userId);

    res.json({
      success: true,
      conversations
    });
  } catch (err) {
    console.error('[AI Get Conversations Error]:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversations.'
    });
  }
});

/**
 * GET /api/ai/conversations/:id
 * Retrieve messages for a single conversation with strict IDOR ownership enforcement
 */
router.get('/conversations/:id', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const convId = req.params.id;
    const db = getDb();

    const conversation = db.prepare(`
      SELECT id, title, context, created_at, updated_at
      FROM ai_conversations
      WHERE id = ? AND user_id = ?
    `).get(convId, userId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied.'
      });
    }

    const messages = db.prepare(`
      SELECT id, role, content, tool_name, metadata, created_at
      FROM ai_messages
      WHERE conversation_id = ? AND user_id = ?
      ORDER BY created_at ASC
    `).all(convId, userId);

    const parsedMessages = messages.map(m => {
      let meta = null;
      try {
        if (m.metadata) meta = JSON.parse(m.metadata);
      } catch (e) {}
      return {
        ...m,
        metadata: meta
      };
    });

    res.json({
      success: true,
      conversation,
      messages: parsedMessages
    });
  } catch (err) {
    console.error('[AI Get Conversation Details Error]:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversation details.'
    });
  }
});

/**
 * POST /api/ai/support-ticket
 * Create an AI-escalated support ticket
 */
router.post('/support-ticket', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { category, subject, description, priority } = req.body;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required to create a ticket.'
      });
    }

    const result = await createSupportTicket({
      userId,
      category: category || 'TECHNICAL',
      subject,
      description: description || subject,
      priority: priority || 'Medium'
    });

    res.json(result);
  } catch (err) {
    console.error('[AI Create Ticket Error]:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket.'
    });
  }
});

/**
 * GET /api/ai/support-tickets
 * Get all support tickets created by the authenticated student
 */
router.get('/support-tickets', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const result = await getMySupportTickets({ userId });
    res.json(result);
  } catch (err) {
    console.error('[AI Get Tickets Error]:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve support tickets.'
    });
  }
});

module.exports = router;
