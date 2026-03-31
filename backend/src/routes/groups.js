/**
 * Group Activities Routes
 *
 * Allow users to create and join group outings — culturally safer
 * and more comfortable for the Tunisian market.
 *
 * Routes (task #18 — CRUD):
 * - POST   /api/groups          — Create a group activity
 * - GET    /api/groups           — Browse groups with filters
 * - GET    /api/groups/:id       — Get group details
 *
 * Routes (task #19 — join/approve/chat):
 * - POST   /api/groups/:id/join                — Request to join
 * - PUT    /api/groups/:id/approve/:userId      — Creator approves member
 * - DELETE /api/groups/:id/leave                — Leave a group
 * - DELETE /api/groups/:id/kick/:userId         — Creator kicks member
 * - GET    /api/groups/:id/messages             — Group chat history
 */

const express = require('express');
const { getDB } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const { validate, Joi } = require('../middleware/validate');
const { ACTIVITY_TYPES, NEIGHBORHOODS, GENDERS } = require('../utils/constants');

const router = express.Router();
const db = getDB();

// -------------------------------------------------------
// Validation schemas
// -------------------------------------------------------

const createGroupSchema = Joi.object({
  activityType: Joi.string().required(),
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  date: Joi.date().iso().greater('now').required(),
  time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  neighborhood: Joi.string().required(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  currentGroupSize: Joi.number().integer().min(1).max(20).required(),
  lookingFor: Joi.number().integer().min(1).max(10).required(),
  visibility: Joi.string().valid('public', 'friends').default('public'),
  ageRangeMin: Joi.number().integer().min(18).max(99).optional(),
  ageRangeMax: Joi.number().integer().min(18).max(99).optional(),
  genderPreference: Joi.string().valid('any', 'male', 'female').default('any')
});

const browseGroupsSchema = Joi.object({
  activityType: Joi.string().optional(),
  neighborhood: Joi.string().optional(),
  date: Joi.date().iso().optional(),
  maxDistance: Joi.number().min(1).max(100).optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20)
});

// -------------------------------------------------------
// POST /api/groups — Create a group activity
// -------------------------------------------------------
router.post('/', authMiddleware, validate(createGroupSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      activityType, title, description, date, time, neighborhood,
      latitude, longitude, currentGroupSize, lookingFor,
      visibility, ageRangeMin, ageRangeMax, genderPreference
    } = req.body;

    // Validate activity type
    const validActivity = ACTIVITY_TYPES.find(a => a.id === activityType);
    if (!validActivity) {
      return res.status(400).json({ error: 'Invalid activity type', validTypes: ACTIVITY_TYPES.map(a => a.id) });
    }

    // Validate neighborhood
    const validNeighborhood = NEIGHBORHOODS.find(n => n.name === neighborhood);
    if (!validNeighborhood) {
      return res.status(400).json({ error: 'Invalid neighborhood', validNeighborhoods: NEIGHBORHOODS.map(n => n.name) });
    }

    // Validate age range if provided
    if (ageRangeMin && ageRangeMax && ageRangeMin > ageRangeMax) {
      return res.status(400).json({ error: 'ageRangeMin cannot be greater than ageRangeMax' });
    }

    // Get creator profile for display info
    const creator = await db.read('users', userId);
    if (!creator) return res.status(404).json({ error: 'User not found' });

    // Build group
    const group = await db.create('groups', {
      creatorId: userId,
      creatorName: creator.name || 'Anonymous',
      creatorPhoto: (creator.photos && creator.photos.length > 0) ? creator.photos[0] : null,
      activityType,
      activityLabel: validActivity.label,
      activityEmoji: validActivity.emoji,
      title,
      description,
      date,
      time,
      neighborhood,
      location: {
        latitude: latitude || validNeighborhood.lat,
        longitude: longitude || validNeighborhood.lon
      },
      currentGroupSize,
      lookingFor,
      visibility,
      ageRange: {
        min: ageRangeMin || 18,
        max: ageRangeMax || 99
      },
      genderPreference,
      status: 'open', // open | full | completed | cancelled
      members: [
        {
          userId,
          name: creator.name || 'Anonymous',
          role: 'creator',
          status: 'approved',
          joinedAt: new Date().toISOString()
        }
      ],
      pendingRequests: []
    });

    // Notify via Socket.io
    try {
      const { io } = require('../server');
      if (io) {
        io.emit('group:new', {
          groupId: group.id,
          title: group.title,
          activityType: group.activityType,
          activityEmoji: group.activityEmoji,
          neighborhood: group.neighborhood,
          date: group.date,
          creatorId: userId,
          currentGroupSize: group.currentGroupSize,
          lookingFor: group.lookingFor
        });
      }
    } catch (_) { /* Socket.io not available */ }

    res.status(201).json({ group });
  } catch (err) {
    console.error('POST /groups error:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// -------------------------------------------------------
// GET /api/groups — Browse groups with filters
// -------------------------------------------------------
router.get('/', authMiddleware, validate(browseGroupsSchema, 'query'), async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      activityType, neighborhood, date, maxDistance,
      latitude, longitude, page, limit
    } = req.query;

    // Get user profile for filtering
    const user = await db.read('users', userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Build user age for age-range filter
    const userAge = user.age || null;

    // Query all open groups
    let groups = await db.query('groups', g => {
      // Only show open groups
      if (g.status !== 'open') return false;

      // Don't show groups user already joined or requested
      const isMember = g.members && g.members.some(m => m.userId === userId);
      const hasPending = g.pendingRequests && g.pendingRequests.includes(userId);
      if (isMember || hasPending) return false;

      // Filter by activity type
      if (activityType && g.activityType !== activityType) return false;

      // Filter by neighborhood
      if (neighborhood && g.neighborhood !== neighborhood) return false;

      // Filter by date
      if (date && g.date !== date) return false;

      // Filter by age range
      if (userAge && g.ageRange) {
        if (userAge < g.ageRange.min || userAge > g.ageRange.max) return false;
      }

      // Filter by gender preference
      if (g.genderPreference && g.genderPreference !== 'any') {
        if (user.gender && user.gender !== g.genderPreference) return false;
      }

      return true;
    });

    // Apply distance filter if coordinates provided
    if (maxDistance && latitude && longitude) {
      groups = groups
        .map(g => {
          if (!g.location?.latitude || !g.location?.longitude) return null;
          const dist = db.haversineDistance(
            parseFloat(latitude), parseFloat(longitude),
            g.location.latitude, g.location.longitude
          );
          return { ...g, _distance: Math.round(dist * 10) / 10 };
        })
        .filter(g => g && g._distance <= maxDistance)
        .sort((a, b) => a._distance - b._distance);
    } else {
      // Sort by date (soonest first)
      groups.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedGroups = groups.slice(startIndex, startIndex + limit);

    res.json({
      groups: paginatedGroups,
      pagination: {
        page,
        limit,
        total: groups.length,
        totalPages: Math.ceil(groups.length / limit)
      }
    });
  } catch (err) {
    console.error('GET /groups error:', err);
    res.status(500).json({ error: 'Failed to load groups' });
  }
});

// -------------------------------------------------------
// GET /api/groups/:id — Get group details
// -------------------------------------------------------
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;

    const group = await db.read('groups', groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Check if user has access (public groups visible to all, friends-only requires membership)
    if (group.visibility === 'friends') {
      const isMember = group.members && group.members.some(m => m.userId === userId);
      if (!isMember && group.creatorId !== userId) {
        return res.status(403).json({ error: 'This is a friends-only group' });
      }
    }

    // Compute user's relationship to group
    const isCreator = group.creatorId === userId;
    const memberEntry = group.members?.find(m => m.userId === userId);
    const isMember = !!memberEntry;
    const hasPending = group.pendingRequests?.includes(userId);
    const spotsLeft = Math.max(0, group.lookingFor - (group.members?.filter(m => m.status === 'approved').length || 0));

    // Hide pending requests from non-creators
    const responseData = { ...group };
    if (!isCreator) {
      delete responseData.pendingRequests;
    }

    res.json({
      group: responseData,
      userRelation: {
        isCreator,
        isMember,
        memberStatus: memberEntry?.status || null,
        hasPendingRequest: hasPending
      },
      spotsLeft
    });
  } catch (err) {
    console.error('GET /groups/:id error:', err);
    res.status(500).json({ error: 'Failed to load group' });
  }
});

// -------------------------------------------------------
// POST /api/groups/:id/join — Request to join a group
// -------------------------------------------------------
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;

    const group = await db.read('groups', groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.status !== 'open') {
      return res.status(400).json({ error: `Group is ${group.status}, not accepting new members` });
    }

    // Check if already a member
    const existingMember = group.members?.find(m => m.userId === userId);
    if (existingMember) {
      return res.status(400).json({ error: `You are already a ${existingMember.status} member` });
    }

    // Check if already has pending request
    if (group.pendingRequests?.includes(userId)) {
      return res.status(400).json({ error: 'You already have a pending request' });
    }

    // Check if group is full
    const approvedCount = group.members?.filter(m => m.status === 'approved').length || 0;
    const totalSpots = group.currentGroupSize + group.lookingFor;
    if (approvedCount >= totalSpots) {
      return res.status(400).json({ error: 'Group is full' });
    }

    // Check age range
    const user = await db.read('users', userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.age && group.ageRange) {
      if (user.age < group.ageRange.min || user.age > group.ageRange.max) {
        return res.status(400).json({ error: `Group requires ages ${group.ageRange.min}-${group.ageRange.max}` });
      }
    }

    // Check gender preference
    if (group.genderPreference && group.genderPreference !== 'any') {
      if (user.gender && user.gender !== group.genderPreference) {
        return res.status(400).json({ error: `Group is looking for ${group.genderPreference} members only` });
      }
    }

    // Add pending request
    const pendingRequests = [...(group.pendingRequests || []), userId];
    await db.update('groups', groupId, { pendingRequests });

    // Notify group creator via Socket.io
    try {
      const { io } = require('../server');
      if (io) {
        io.to(`user:${group.creatorId}`).emit('group:joinRequest', {
          groupId,
          groupTitle: group.title,
          userId,
          userName: user.name || 'Anonymous',
          userPhoto: (user.photos && user.photos.length > 0) ? user.photos[0] : null
        });
      }
    } catch (_) { /* Socket.io not available */ }

    res.json({ message: 'Join request sent', groupId });
  } catch (err) {
    console.error('POST /groups/:id/join error:', err);
    res.status(500).json({ error: 'Failed to request join' });
  }
});

// -------------------------------------------------------
// PUT /api/groups/:id/approve/:userId — Creator approves a member
// -------------------------------------------------------
router.put('/:id/approve/:userId', authMiddleware, async (req, res) => {
  try {
    const creatorId = req.user.id;
    const groupId = req.params.id;
    const targetUserId = req.params.userId;

    const group = await db.read('groups', groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Only creator can approve
    if (group.creatorId !== creatorId) {
      return res.status(403).json({ error: 'Only the group creator can approve members' });
    }

    // Check target has a pending request
    if (!group.pendingRequests?.includes(targetUserId)) {
      return res.status(400).json({ error: 'No pending request from this user' });
    }

    // Check if group is full
    const approvedCount = group.members?.filter(m => m.status === 'approved').length || 0;
    const totalSpots = group.currentGroupSize + group.lookingFor;
    if (approvedCount >= totalSpots) {
      return res.status(400).json({ error: 'Group is full' });
    }

    // Get target user info
    const targetUser = await db.read('users', targetUserId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Move from pending to members
    const pendingRequests = group.pendingRequests.filter(id => id !== targetUserId);
    const newApprovedCount = approvedCount + 1;
    const members = [
      ...(group.members || []),
      {
        userId: targetUserId,
        name: targetUser.name || 'Anonymous',
        role: 'member',
        status: 'approved',
        joinedAt: new Date().toISOString()
      }
    ];

    // Check if group is now full
    const updates = { members, pendingRequests };
    if (newApprovedCount >= totalSpots) {
      updates.status = 'full';
    }

    await db.update('groups', groupId, updates);

    // Notify approved user via Socket.io
    try {
      const { io } = require('../server');
      if (io) {
        io.to(`user:${targetUserId}`).emit('group:approved', {
          groupId,
          groupTitle: group.title,
          approvedBy: creatorId
        });

        // Notify all group members that a new member joined
        io.to(`group:${groupId}`).emit('group:memberJoined', {
          groupId,
          userId: targetUserId,
          userName: targetUser.name || 'Anonymous'
        });
      }
    } catch (_) { /* Socket.io not available */ }

    res.json({ message: 'Member approved', groupId, userId: targetUserId, spotsLeft: totalSpots - newApprovedCount });
  } catch (err) {
    console.error('PUT /groups/:id/approve/:userId error:', err);
    res.status(500).json({ error: 'Failed to approve member' });
  }
});

// -------------------------------------------------------
// DELETE /api/groups/:id/leave — Leave a group
// -------------------------------------------------------
router.delete('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;

    const group = await db.read('groups', groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Creator cannot leave — must delete/cancel the group
    if (group.creatorId === userId) {
      return res.status(400).json({ error: 'Creators cannot leave their own group. Cancel it instead.' });
    }

    // Check if user is a member
    const memberIndex = (group.members || []).findIndex(m => m.userId === userId);
    if (memberIndex === -1) {
      return res.status(400).json({ error: 'You are not a member of this group' });
    }

    // Remove from members
    const members = group.members.filter(m => m.userId !== userId);

    // If group was full, reopen it
    const updates = { members };
    if (group.status === 'full') {
      updates.status = 'open';
    }

    await db.update('groups', groupId, updates);

    // Notify group via Socket.io
    try {
      const { io } = require('../server');
      if (io) {
        io.to(`group:${groupId}`).emit('group:memberLeft', {
          groupId,
          userId,
          reason: 'left'
        });
      }
    } catch (_) { /* Socket.io not available */ }

    res.json({ message: 'Left group', groupId });
  } catch (err) {
    console.error('DELETE /groups/:id/leave error:', err);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// -------------------------------------------------------
// DELETE /api/groups/:id/kick/:userId — Creator kicks a member
// -------------------------------------------------------
router.delete('/:id/kick/:userId', authMiddleware, async (req, res) => {
  try {
    const creatorId = req.user.id;
    const groupId = req.params.id;
    const targetUserId = req.params.userId;

    const group = await db.read('groups', groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Only creator can kick
    if (group.creatorId !== creatorId) {
      return res.status(403).json({ error: 'Only the group creator can kick members' });
    }

    // Cannot kick yourself
    if (targetUserId === creatorId) {
      return res.status(400).json({ error: 'Cannot kick yourself. Cancel the group instead.' });
    }

    // Check if target is a member
    const memberIndex = (group.members || []).findIndex(m => m.userId === targetUserId);
    if (memberIndex === -1) {
      return res.status(400).json({ error: 'User is not a member of this group' });
    }

    // Remove from members
    const members = group.members.filter(m => m.userId !== targetUserId);

    const updates = { members };
    if (group.status === 'full') {
      updates.status = 'open';
    }

    await db.update('groups', groupId, updates);

    // Notify via Socket.io
    try {
      const { io } = require('../server');
      if (io) {
        io.to(`user:${targetUserId}`).emit('group:kicked', {
          groupId,
          groupTitle: group.title,
          kickedBy: creatorId
        });

        io.to(`group:${groupId}`).emit('group:memberLeft', {
          groupId,
          userId: targetUserId,
          reason: 'kicked'
        });
      }
    } catch (_) { /* Socket.io not available */ }

    res.json({ message: 'Member kicked', groupId, userId: targetUserId });
  } catch (err) {
    console.error('DELETE /groups/:id/kick/:userId error:', err);
    res.status(500).json({ error: 'Failed to kick member' });
  }
});

// -------------------------------------------------------
// GET /api/groups/:id/messages — Group chat history
// -------------------------------------------------------
router.get('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const group = await db.read('groups', groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Must be an approved member to see messages
    const isMember = group.members?.some(m => m.userId === userId && m.status === 'approved');
    if (!isMember && group.creatorId !== userId) {
      return res.status(403).json({ error: 'Only group members can view messages' });
    }

    // Load group messages
    const groupMsgId = `group_${groupId}`;
    const conversation = await db.read('group_messages', groupMsgId);

    if (!conversation) {
      return res.json({ messages: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }

    const allMessages = conversation.messages || [];

    // Pagination (newest first, then slice)
    const total = allMessages.length;
    const startIndex = Math.max(0, total - (page * limit));
    const endIndex = Math.max(0, total - ((page - 1) * limit));
    const messages = allMessages.slice(startIndex, endIndex);

    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('GET /groups/:id/messages error:', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

module.exports = router;
