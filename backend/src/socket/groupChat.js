/**
 * Socket.io Group Chat Handler
 *
 * Handles real-time messaging within group activities:
 * - group:join (join a group room)
 * - group:leave (leave a group room)
 * - group:message:send / group:message:receive
 * - group:typing:start / group:typing:stop
 *
 * Messages stored in /data/group_messages/group_{group_id}.json
 * Only approved members can participate.
 */

const { getDB } = require('../utils/db');

// Typing debounce timers: "groupId:userId" -> timeout
const typingTimers = new Map();
const TYPING_TIMEOUT_MS = 3000;

/**
 * Initialize group chat Socket.io events
 * @param {import('socket.io').Server} io
 */
function initGroupChatSocket(io) {
  const db = getDB();

  io.on('connection', (socket) => {
    const userId = socket.userId;
    if (!userId) return;

    // --- group:join — Join a group room ---
    socket.on('group:join', async (data, callback) => {
      try {
        const { groupId } = data;
        if (!groupId) return respond(callback, { error: 'groupId is required' });

        // Verify group membership
        const group = await db.read('groups', groupId);
        if (!group) return respond(callback, { error: 'Group not found' });

        const isMember = group.members?.some(m => m.userId === userId && m.status === 'approved');
        if (!isMember && group.creatorId !== userId) {
          return respond(callback, { error: 'Not a member of this group' });
        }

        socket.join(`group:${groupId}`);
        console.log(`👥 User ${userId} joined group room: ${groupId}`);

        // Notify other members
        socket.to(`group:${groupId}`).emit('group:userJoined', {
          groupId,
          userId,
          timestamp: new Date().toISOString()
        });

        respond(callback, { success: true });
      } catch (err) {
        console.error('group:join error:', err);
        respond(callback, { error: 'Failed to join group room' });
      }
    });

    // --- group:leave — Leave a group room ---
    socket.on('group:leave', (data) => {
      try {
        const { groupId } = data;
        if (!groupId) return;

        socket.leave(`group:${groupId}`);
        clearTypingTimer(groupId, userId);

        socket.to(`group:${groupId}`).emit('group:userLeft', {
          groupId,
          userId,
          timestamp: new Date().toISOString()
        });

        console.log(`👥 User ${userId} left group room: ${groupId}`);
      } catch (err) {
        console.error('group:leave error:', err);
      }
    });

    // --- group:message:send ---
    socket.on('group:message:send', async (data, callback) => {
      try {
        const { groupId, text } = data;

        if (!groupId || !text || typeof text !== 'string') {
          return respond(callback, { error: 'groupId and text are required' });
        }

        const trimmedText = text.trim();
        if (trimmedText.length === 0 || trimmedText.length > 2000) {
          return respond(callback, { error: 'Message must be 1-2000 characters' });
        }

        // Verify group membership
        const group = await db.read('groups', groupId);
        if (!group) return respond(callback, { error: 'Group not found' });

        const isMember = group.members?.some(m => m.userId === userId && m.status === 'approved');
        if (!isMember && group.creatorId !== userId) {
          return respond(callback, { error: 'Only group members can send messages' });
        }

        // Get sender info
        const sender = await db.read('users', userId);

        // Build message
        const message = {
          id: db.generateId(),
          senderId: userId,
          senderName: sender?.name || 'Anonymous',
          senderPhoto: (sender?.photos && sender.photos.length > 0) ? sender.photos[0] : null,
          text: trimmedText,
          timestamp: new Date().toISOString()
        };

        // Load or create group messages file
        const groupMsgId = `group_${groupId}`;
        let conversation = await db.read('group_messages', groupMsgId);
        if (!conversation) {
          conversation = await db.create('group_messages', {
            id: groupMsgId,
            groupId,
            messages: []
          });
        }

        conversation.messages.push(message);
        await db.update('group_messages', groupMsgId, {
          messages: conversation.messages
        });

        // Clear typing
        clearTypingTimer(groupId, userId);
        io.to(`group:${groupId}`).emit('group:typing:stop', { groupId, userId });

        // Broadcast to group room
        io.to(`group:${groupId}`).emit('group:message:receive', {
          groupId,
          message
        });

        respond(callback, { success: true, message });
        console.log(`💬 Group message in ${groupId}: ${userId} -> ${trimmedText.substring(0, 50)}`);
      } catch (err) {
        console.error('group:message:send error:', err);
        respond(callback, { error: 'Failed to send group message' });
      }
    });

    // --- group:typing:start ---
    socket.on('group:typing:start', async (data) => {
      try {
        const { groupId } = data;
        if (!groupId) return;

        socket.to(`group:${groupId}`).emit('group:typing:start', { groupId, userId });

        resetTypingTimer(groupId, userId, () => {
          socket.to(`group:${groupId}`).emit('group:typing:stop', { groupId, userId });
        });
      } catch (err) {
        console.error('group:typing:start error:', err);
      }
    });

    // --- group:typing:stop ---
    socket.on('group:typing:stop', (data) => {
      try {
        const { groupId } = data;
        if (!groupId) return;

        clearTypingTimer(groupId, userId);
        socket.to(`group:${groupId}`).emit('group:typing:stop', { groupId, userId });
      } catch (err) {
        console.error('group:typing:stop error:', err);
      }
    });
  });

  console.log('👥 Socket.io group chat handler initialized');
}

// --- Helpers ---

function respond(callback, data) {
  if (typeof callback === 'function') callback(data);
}

function resetTypingTimer(groupId, userId, onExpire) {
  const key = `${groupId}:${userId}`;
  if (typingTimers.has(key)) clearTimeout(typingTimers.get(key));
  typingTimers.set(key, setTimeout(() => {
    typingTimers.delete(key);
    onExpire();
  }, TYPING_TIMEOUT_MS));
}

function clearTypingTimer(groupId, userId) {
  const key = `${groupId}:${userId}`;
  if (typingTimers.has(key)) {
    clearTimeout(typingTimers.get(key));
    typingTimers.delete(key);
  }
}

module.exports = { initGroupChatSocket };
