/**
 * Chat HTTP Fallback Routes
 *
 * Provides REST endpoints for chat when Socket.io is unavailable:
 * - GET /api/chat/conversations — list all conversations with last message preview
 * - GET /api/chat/:conversationId/messages — paginated message history
 * - POST /api/chat/:conversationId/messages — send message via HTTP
 */

const express = require('express');
const { getDB } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const { validate, Joi } = require('../middleware/validate');

const router = express.Router();
const db = getDB();

// Validation schemas
const sendMessageSchema = Joi.object({
  text: Joi.string().min(1).max(2000).required()
});

/**
 * Verify that the user is part of a match (and thus can access its conversation)
 * Returns the match object if valid, null otherwise
 */
async function verifyMatchAccess(userId, matchId) {
  const match = await db.read('matches', matchId);
  if (!match) return null;
  if (!match.users.includes(userId)) return null;
  return match;
}

// -------------------------------------------------------
// GET /api/chat/conversations
// List all conversations for the authenticated user
// -------------------------------------------------------
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all active matches for this user
    const activeMatches = await db.readIndex('active_matches');
    const matchIds = activeMatches[userId] || [];

    const conversations = [];

    for (const matchId of matchIds) {
      const match = await db.read('matches', matchId);
      if (!match) continue;

      // Get the other user's info
      const otherUserId = match.users.find(u => u !== userId);
      const otherUser = await db.read('users', otherUserId);
      if (!otherUser) continue;

      // Load conversation messages
      const conversationId = `conversation_${matchId}`;
      const conversation = await db.read('messages', conversationId);

      let lastMessage = null;
      let unreadCount = 0;

      if (conversation && conversation.messages.length > 0) {
        const msgs = conversation.messages;
        lastMessage = {
          text: msgs[msgs.length - 1].text,
          senderId: msgs[msgs.length - 1].senderId,
          timestamp: msgs[msgs.length - 1].timestamp
        };

        // Count unread messages (messages from the other user that are not read)
        unreadCount = msgs.filter(
          m => m.senderId !== userId && !m.read
        ).length;
      }

      // Strip sensitive fields from other user
      const { password, ...safeUser } = otherUser;

      conversations.push({
        conversationId,
        matchId,
        user: safeUser,
        lastMessage,
        unreadCount,
        updatedAt: match.updatedAt || match.createdAt
      });
    }

    // Sort by most recent activity (last message timestamp or match creation)
    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp || a.updatedAt;
      const bTime = b.lastMessage?.timestamp || b.updatedAt;
      return new Date(bTime) - new Date(aTime);
    });

    res.json({ conversations });
  } catch (err) {
    console.error('GET /conversations error:', err);
    res.status(500).json({ error: 'Failed to load conversations' });
  }
});

// -------------------------------------------------------
// GET /api/chat/:conversationId/messages
// Paginated message history
// -------------------------------------------------------
router.get('/:conversationId/messages', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    // Extract matchId from conversationId (format: "conversation_{matchId}")
    const matchId = conversationId.replace('conversation_', '');

    // Verify user has access
    const match = await verifyMatchAccess(userId, matchId);
    if (!match) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Pagination params
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // max 100
    const before = req.query.before; // ISO timestamp cursor (get messages before this time)

    // Load conversation
    const conversation = await db.read('messages', conversationId);

    if (!conversation) {
      return res.json({ messages: [], hasMore: false });
    }

    let messages = [...conversation.messages];

    // Filter by cursor if provided
    if (before) {
      messages = messages.filter(m => m.timestamp < before);
    }

    // Take the last `limit` messages (most recent)
    const hasMore = messages.length > limit;
    messages = messages.slice(-limit);

    res.json({
      messages,
      hasMore,
      cursor: messages.length > 0 ? messages[0].timestamp : null
    });
  } catch (err) {
    console.error('GET /:conversationId/messages error:', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// -------------------------------------------------------
// POST /api/chat/:conversationId/messages
// HTTP fallback: send a message without Socket.io
// -------------------------------------------------------
router.post('/:conversationId/messages',
  authMiddleware,
  validate(sendMessageSchema),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;
      const { text } = req.body;

      // Extract matchId from conversationId
      const matchId = conversationId.replace('conversation_', '');

      // Verify user has access
      const match = await verifyMatchAccess(userId, matchId);
      if (!match) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Build message
      const message = {
        id: db.generateId(),
        senderId: userId,
        text: text.trim(),
        timestamp: new Date().toISOString(),
        read: false,
        readAt: null
      };

      // Load or create conversation
      let conversation = await db.read('messages', conversationId);
      if (!conversation) {
        conversation = await db.create('messages', {
          id: conversationId,
          matchId,
          messages: []
        });
      }

      conversation.messages.push(message);
      await db.update('messages', conversationId, {
        messages: conversation.messages
      });

      // Also emit via Socket.io if the server is running (best-effort)
      try {
        const { io } = require('../server');
        if (io) {
          io.to(`match:${matchId}`).emit('message:receive', { matchId, message });
        }
      } catch (_) {
        // Socket.io not available, that's fine — this is the fallback
      }

      res.status(201).json({ message });
    } catch (err) {
      console.error('POST /:conversationId/messages error:', err);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
);

module.exports = router;
