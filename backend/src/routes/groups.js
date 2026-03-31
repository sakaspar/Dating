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
 * Routes (task #19 — join/approve/chat, to be implemented next):
 * - POST   /api/groups/:id/join                — Request to join
 * - PUT    /api/groups/:id/approve/:userId      — Creator approves member
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

module.exports = router;
