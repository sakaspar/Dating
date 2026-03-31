const express = require('express');
const { getDB } = require('../utils/db');
const { getMatches } = require('../utils/matching');
const { authMiddleware } = require('../middleware/auth');
const { validate, Joi } = require('../middleware/validate');
const { notifyNewMatch } = require('../utils/notifications');
const { track } = require('../utils/analytics');
let isUserOnline;
try { ({ isUserOnline } = require('../socket/chat')); } catch (e) { isUserOnline = () => false; }

const router = express.Router();
const db = getDB();

const swipeSchema = Joi.object({
  targetUserId: Joi.string().required(),
  action: Joi.string().valid('like', 'pass').required()
});

// GET /api/matches/discover - Get potential matches
router.get('/discover', authMiddleware, async (req, res) => {
  try {
    const matches = await getMatches(req.user.id);
    res.json({ matches });
  } catch (err) {
    console.error('Discover error:', err);
    if (err.message.includes('location')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

// POST /api/matches/swipe - Record swipe action
router.post('/swipe', authMiddleware, validate(swipeSchema), async (req, res) => {
  try {
    const { targetUserId, action } = req.body;
    const userId = req.user.id;

    if (targetUserId === userId) {
      return res.status(400).json({ error: 'Cannot swipe on yourself' });
    }

    // Verify target user exists
    const targetUser = await db.read('users', targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Load or create swipe record for current user
    const swipeFile = `${userId}_swipes`;
    let userSwipes = await db.read('swipes', swipeFile);
    if (!userSwipes) {
      userSwipes = await db.create('swipes', {
        id: swipeFile,
        userId,
        swiped: {}
      });
    }

    // Don't allow double-swipe
    if (userSwipes.swiped[targetUserId]) {
      return res.status(400).json({ error: 'Already swiped on this user' });
    }

    // Record swipe
    userSwipes.swiped[targetUserId] = {
      action,
      timestamp: new Date().toISOString()
    };
    await db.update('swipes', swipeFile, { swiped: userSwipes.swiped });

    let matched = false;
    let matchId = null;

    // Check for mutual like
    if (action === 'like') {
      const targetSwipes = await db.read('swipes', `${targetUserId}_swipes`);
      if (targetSwipes?.swiped?.[userId]?.action === 'like') {
        // MUTUAL LIKE! Create match
        matched = true;
        matchId = db.generateId();
        const match = await db.create('matches', {
          id: matchId,
          users: [userId, targetUserId].sort(),
          createdAt: new Date().toISOString()
        });

        // Add to active matches index for both users
        const activeMatches = await db.readIndex('active_matches');
        if (!activeMatches[userId]) activeMatches[userId] = [];
        if (!activeMatches[targetUserId]) activeMatches[targetUserId] = [];
        activeMatches[userId].push(matchId);
        activeMatches[targetUserId].push(matchId);
        await db.writeIndex('active_matches', activeMatches);

        console.log(`🎉 Match created: ${matchId} between ${userId} and ${targetUserId}`);

        // Send push notifications to both users
        const currentUser = await db.read('users', userId);
        const userName = currentUser?.name || 'Someone';
        const targetName = targetUser?.name || 'Someone';
        notifyNewMatch([userId, targetUserId], matchId, userId === match.users[0] ? targetName : userName).catch(() => {});

        // Track analytics
        track('match').catch(() => {});
      }
    }

    res.json({
      action,
      matched,
      matchId: matchId || undefined
    });
  } catch (err) {
    console.error('Swipe error:', err);
    res.status(500).json({ error: 'Failed to record swipe' });
  }
});

// GET /api/matches - Get user's matches
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const activeMatches = await db.readIndex('active_matches');
    const matchIds = activeMatches[userId] || [];

    const currentUser = await db.read('users', userId);

    const matches = [];
    for (const matchId of matchIds) {
      const match = await db.read('matches', matchId);
      if (!match) continue;

      // Get the other user's profile
      const otherUserId = match.users.find(u => u !== userId);
      const otherUser = await db.read('users', otherUserId);
      if (!otherUser) continue;

      const { password, ...safeUser } = otherUser;

      // Get last message from conversation
      const conversation = await db.read('messages', `conversation_${matchId}`);
      let lastMessage = null;
      let unreadCount = 0;
      if (conversation?.messages?.length) {
        const sorted = [...conversation.messages].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        lastMessage = sorted[0];
        unreadCount = sorted.filter(m => m.senderId !== userId && !m.read).length;
      }

      // Calculate shared activities
      const userActivities = currentUser?.preferences?.activities || [];
      const otherActivities = otherUser?.preferences?.activities || [];
      const sharedActivities = userActivities.filter(a => otherActivities.includes(a));

      // Online status from socket module
      const isOnline = isUserOnline ? isUserOnline(otherUserId) : false;

      matches.push({
        matchId: match.id,
        id: match.id,
        matchedAt: match.createdAt,
        user: safeUser,
        otherUser: { ...safeUser, online: isOnline, sharedActivities },
        lastMessage,
        unreadCount,
      });
    }

    // Sort by most recent activity (last message or match time)
    matches.sort((a, b) => {
      const timeA = a.lastMessage?.timestamp || a.matchedAt;
      const timeB = b.lastMessage?.timestamp || b.matchedAt;
      return new Date(timeB) - new Date(timeA);
    });

    res.json({ matches });
  } catch (err) {
    console.error('Get matches error:', err);
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

// DELETE /api/matches/:id - Unmatch
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const matchId = req.params.id;

    const match = await db.read('matches', matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    if (!match.users.includes(userId)) {
      return res.status(403).json({ error: 'Not your match' });
    }

    // Remove from active matches index for both users
    const activeMatches = await db.readIndex('active_matches');
    for (const uid of match.users) {
      if (activeMatches[uid]) {
        activeMatches[uid] = activeMatches[uid].filter(m => m !== matchId);
      }
    }
    await db.writeIndex('active_matches', activeMatches);

    // Delete match
    await db.delete('matches', matchId);

    res.json({ message: 'Unmatched successfully' });
  } catch (err) {
    console.error('Unmatch error:', err);
    res.status(500).json({ error: 'Failed to unmatch' });
  }
});

module.exports = router;
