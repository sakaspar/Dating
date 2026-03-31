/**
 * Socket.io Real-Time Chat Handler
 *
 * Handles real-time messaging between matched users:
 * - JWT authentication on connection
 * - message:send / message:receive
 * - message:read (read receipts)
 * - typing:start / typing:stop
 * - user:online / user:offline
 *
 * Messages stored in /data/messages/conversation_{match_id}.json
 * Only matched users can chat.
 */

const jwt = require('jsonwebtoken');
const { getDB } = require('../utils/db');
const { notifyNewMessage } = require('../utils/notifications');

// In-memory map: userId -> Set of socketIds (supports multiple devices)
const onlineUsers = new Map();

// Map: socketId -> userId (for cleanup on disconnect)
const socketUserMap = new Map();

// Typing debounce timers: "matchId:userId" -> timeout
const typingTimers = new Map();

const TYPING_TIMEOUT_MS = 3000; // Auto-stop typing after 3s

/**
 * Initialize Socket.io with chat event handlers
 * @param {import('socket.io').Server} io
 */
function initChatSocket(io) {
  const db = getDB();

  // --- JWT Authentication Middleware ---
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new Error('Token expired'));
      }
      return next(new Error('Invalid token'));
    }
  });

  // --- Connection Handler ---
  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`🔌 Socket connected: ${userId} (${socket.id})`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
      // Broadcast user:online to matches
      await broadcastPresence(io, db, userId, 'user:online');
    }
    onlineUsers.get(userId).add(socket.id);
    socketUserMap.set(socket.id, userId);

    // Join rooms for all active matches (so we can broadcast to match partners)
    try {
      const activeMatches = await db.readIndex('active_matches');
      const userMatchIds = activeMatches[userId] || [];
      for (const matchId of userMatchIds) {
        socket.join(`match:${matchId}`);
      }
    } catch (err) {
      console.error('Error joining match rooms:', err.message);
    }

    // --- message:send ---
    socket.on('message:send', async (data, callback) => {
      try {
        const { matchId, text } = data;

        // Validate input
        if (!matchId || !text || typeof text !== 'string') {
          return respond(callback, { error: 'matchId and text are required' });
        }

        const trimmedText = text.trim();
        if (trimmedText.length === 0 || trimmedText.length > 2000) {
          return respond(callback, { error: 'Message must be 1-2000 characters' });
        }

        // Verify match exists and user is part of it
        const match = await db.read('matches', matchId);
        if (!match) {
          return respond(callback, { error: 'Match not found' });
        }
        if (!match.users.includes(userId)) {
          return respond(callback, { error: 'Not your match' });
        }

        // Build message object
        const message = {
          id: db.generateId(),
          senderId: userId,
          text: trimmedText,
          timestamp: new Date().toISOString(),
          read: false,
          readAt: null
        };

        // Load conversation file and append message
        const conversationId = `conversation_${matchId}`;
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

        // Clear typing indicator for this user in this match
        clearTypingTimer(matchId, userId);
        io.to(`match:${matchId}`).emit('typing:stop', { matchId, userId });

        // Broadcast message to all sockets in the match room (including sender for multi-device)
        io.to(`match:${matchId}`).emit('message:receive', {
          matchId,
          message
        });

        respond(callback, { success: true, message });

        // Send push notification to the other user (if offline)
        const recipientId = match.users.find(u => u !== userId);
        if (recipientId && !onlineUsers.has(recipientId)) {
          const sender = await db.read('users', userId);
          const senderName = sender?.name || 'Someone';
          notifyNewMessage(recipientId, senderName, matchId, trimmedText).catch(() => {});
        }

        console.log(`💬 Message in match ${matchId}: ${userId} -> ${trimmedText.substring(0, 50)}`);
      } catch (err) {
        console.error('message:send error:', err);
        respond(callback, { error: 'Failed to send message' });
      }
    });

    // --- message:read ---
    socket.on('message:read', async (data, callback) => {
      try {
        const { matchId, messageId } = data;

        if (!matchId) {
          return respond(callback, { error: 'matchId is required' });
        }

        // Verify match
        const match = await db.read('matches', matchId);
        if (!match || !match.users.includes(userId)) {
          return respond(callback, { error: 'Not your match' });
        }

        // Load conversation
        const conversationId = `conversation_${matchId}`;
        const conversation = await db.read('messages', conversationId);
        if (!conversation) {
          return respond(callback, { error: 'Conversation not found' });
        }

        let updated = false;

        if (messageId) {
          // Mark specific message as read
          const msg = conversation.messages.find(m => m.id === messageId);
          if (msg && msg.senderId !== userId && !msg.read) {
            msg.read = true;
            msg.readAt = new Date().toISOString();
            updated = true;
          }
        } else {
          // Mark all unread messages from the other user as read
          for (const msg of conversation.messages) {
            if (msg.senderId !== userId && !msg.read) {
              msg.read = true;
              msg.readAt = new Date().toISOString();
              updated = true;
            }
          }
        }

        if (updated) {
          await db.update('messages', conversationId, {
            messages: conversation.messages
          });

          // Notify the other user about read receipts
          io.to(`match:${matchId}`).emit('message:read', {
            matchId,
            readBy: userId,
            readAt: new Date().toISOString()
          });
        }

        respond(callback, { success: true });
      } catch (err) {
        console.error('message:read error:', err);
        respond(callback, { error: 'Failed to mark as read' });
      }
    });

    // --- typing:start ---
    socket.on('typing:start', async (data) => {
      try {
        const { matchId } = data;
        if (!matchId) return;

        // Verify match
        const match = await db.read('matches', matchId);
        if (!match || !match.users.includes(userId)) return;

        // Broadcast to other users in the match (not the sender)
        socket.to(`match:${matchId}`).emit('typing:start', { matchId, userId });

        // Auto-stop typing after timeout
        resetTypingTimer(matchId, userId, () => {
          socket.to(`match:${matchId}`).emit('typing:stop', { matchId, userId });
        });
      } catch (err) {
        console.error('typing:start error:', err);
      }
    });

    // --- typing:stop ---
    socket.on('typing:stop', (data) => {
      try {
        const { matchId } = data;
        if (!matchId) return;

        clearTypingTimer(matchId, userId);
        socket.to(`match:${matchId}`).emit('typing:stop', { matchId, userId });
      } catch (err) {
        console.error('typing:stop error:', err);
      }
    });

    // --- Disconnect ---
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${userId} (${socket.id})`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast user:offline to matches
          await broadcastPresence(io, db, userId, 'user:offline');
        }
      }
      socketUserMap.delete(socket.id);
    });
  });

  console.log('💬 Socket.io chat handler initialized');
}

// --- Helpers ---

/**
 * Send callback response (supports both callback and no-callback scenarios)
 */
function respond(callback, data) {
  if (typeof callback === 'function') {
    callback(data);
  }
}

/**
 * Broadcast online/offline presence to all match partners
 */
async function broadcastPresence(io, db, userId, event) {
  try {
    const activeMatches = await db.readIndex('active_matches');
    const userMatchIds = activeMatches[userId] || [];

    for (const matchId of userMatchIds) {
      io.to(`match:${matchId}`).emit(event, {
        userId,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error(`broadcastPresence error (${event}):`, err.message);
  }
}

/**
 * Reset typing debounce timer
 */
function resetTypingTimer(matchId, userId, onExpire) {
  const key = `${matchId}:${userId}`;
  if (typingTimers.has(key)) {
    clearTimeout(typingTimers.get(key));
  }
  typingTimers.set(key, setTimeout(() => {
    typingTimers.delete(key);
    onExpire();
  }, TYPING_TIMEOUT_MS));
}

/**
 * Clear typing timer
 */
function clearTypingTimer(matchId, userId) {
  const key = `${matchId}:${userId}`;
  if (typingTimers.has(key)) {
    clearTimeout(typingTimers.get(key));
    typingTimers.delete(key);
  }
}

/**
 * Check if a user is online
 */
function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

/**
 * Get all online user IDs
 */
function getOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}

module.exports = {
  initChatSocket,
  isUserOnline,
  getOnlineUserIds,
  onlineUsers
};
