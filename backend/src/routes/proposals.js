/**
 * Date Proposal Routes
 *
 * The core differentiator of Doukhou — structured date planning.
 *
 * Routes:
 * - POST   /api/proposals                      — Create a proposal
 * - GET    /api/proposals/:matchId              — List proposals for a match
 * - PUT    /api/proposals/:id/accept            — Accept a proposal
 * - PUT    /api/proposals/:id/decline           — Decline a proposal
 * - PUT    /api/proposals/:id/modify            — Counter-proposal (modify)
 * - GET    /api/proposals/suggestions/:matchId  — Smart place suggestions (task #16)
 */

const express = require('express');
const { getDB } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const { validate, Joi } = require('../middleware/validate');
const { ACTIVITY_TYPES, NEIGHBORHOODS, BUDGET_RANGES } = require('../utils/constants');
const { searchPlaces, searchPlace } = require('../utils/osm');

const router = express.Router();
const db = getDB();

// -------------------------------------------------------
// Validation schemas
// -------------------------------------------------------

const createProposalSchema = Joi.object({
  matchId: Joi.string().required(),
  activityType: Joi.string().required(),
  date: Joi.date().iso().greater('now').required(),
  time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(), // HH:MM
  neighborhood: Joi.string().required(),
  budgetRange: Joi.string().valid('Low', 'Medium', 'High').optional(),
  suggestedPlace: Joi.string().max(200).optional().allow(''),
  notes: Joi.string().max(500).optional().allow('')
});

const modifyProposalSchema = Joi.object({
  activityType: Joi.string().optional(),
  date: Joi.date().iso().greater('now').optional(),
  time: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  neighborhood: Joi.string().optional(),
  budgetRange: Joi.string().valid('Low', 'Medium', 'High').optional(),
  suggestedPlace: Joi.string().max(200).optional().allow(''),
  notes: Joi.string().max(500).optional().allow('')
});

// -------------------------------------------------------
// POST /api/proposals — Create a proposal
// -------------------------------------------------------
router.post('/', authMiddleware, validate(createProposalSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const { matchId, activityType, date, time, neighborhood, budgetRange, suggestedPlace, notes } = req.body;

    // Verify match exists and user is part of it
    const match = await db.read('matches', matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (!match.users.includes(userId)) return res.status(403).json({ error: 'Not your match' });

    // Get the recipient (other user in match)
    const recipientId = match.users.find(u => u !== userId);

    // Validate activity type exists in our constants
    const validActivity = ACTIVITY_TYPES.find(a => a.id === activityType);
    if (!validActivity) {
      return res.status(400).json({ error: 'Invalid activity type', validTypes: ACTIVITY_TYPES.map(a => a.id) });
    }

    // Validate neighborhood
    const validNeighborhood = NEIGHBORHOODS.find(n => n.name === neighborhood);
    if (!validNeighborhood) {
      return res.status(400).json({ error: 'Invalid neighborhood', validNeighborhoods: NEIGHBORHOODS.map(n => n.name) });
    }

    // Build proposal
    const proposal = await db.create('proposals', {
      matchId,
      proposerId: userId,
      recipientId,
      activityType,
      activityLabel: validActivity.label,
      activityEmoji: validActivity.emoji,
      date,
      time,
      neighborhood,
      neighborhoodCoords: { lat: validNeighborhood.lat, lon: validNeighborhood.lon },
      budgetRange: budgetRange || null,
      suggestedPlace: suggestedPlace || null,
      notes: notes || null,
      status: 'pending',
      modificationHistory: []
    });

    // Notify via Socket.io
    try {
      const { io } = require('../server');
      if (io) {
        io.to(`match:${matchId}`).emit('proposal:new', {
          matchId,
          proposal: {
            id: proposal.id,
            proposerId: userId,
            activityType,
            activityEmoji: validActivity.emoji,
            date,
            time,
            neighborhood,
            status: 'pending'
          }
        });
      }
    } catch (_) { /* Socket.io not available */ }

    res.status(201).json({ proposal });
  } catch (err) {
    console.error('POST /proposals error:', err);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// -------------------------------------------------------
// GET /api/proposals/:matchId — List proposals for a match
// -------------------------------------------------------
router.get('/:matchId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { matchId } = req.params;

    // Verify match access
    const match = await db.read('matches', matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (!match.users.includes(userId)) return res.status(403).json({ error: 'Not your match' });

    // Get all proposals for this match
    const proposals = await db.query('proposals',
      p => p.matchId === matchId
    );

    // Sort by creation date (newest first)
    proposals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ proposals });
  } catch (err) {
    console.error('GET /proposals/:matchId error:', err);
    res.status(500).json({ error: 'Failed to load proposals' });
  }
});

// -------------------------------------------------------
// PUT /api/proposals/:id/accept — Accept a proposal
// -------------------------------------------------------
router.put('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const proposalId = req.params.id;

    const proposal = await db.read('proposals', proposalId);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    // Only the recipient can accept
    if (proposal.recipientId !== userId) {
      return res.status(403).json({ error: 'Only the proposal recipient can accept' });
    }

    if (proposal.status !== 'pending') {
      return res.status(400).json({ error: `Proposal is already ${proposal.status}` });
    }

    // Update proposal status
    const updated = await db.update('proposals', proposalId, {
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    });

    // Create confirmed date
    const confirmedDate = await db.create('confirmed_dates', {
      matchId: proposal.matchId,
      proposalId: proposal.id,
      proposerId: proposal.proposerId,
      recipientId: proposal.recipientId,
      activityType: proposal.activityType,
      activityLabel: proposal.activityLabel,
      activityEmoji: proposal.activityEmoji,
      date: proposal.date,
      time: proposal.time,
      neighborhood: proposal.neighborhood,
      neighborhoodCoords: proposal.neighborhoodCoords,
      budgetRange: proposal.budgetRange,
      suggestedPlace: proposal.suggestedPlace,
      notes: proposal.notes
    });

    // Notify via Socket.io
    try {
      const { io } = require('../server');
      if (io) {
        io.to(`match:${proposal.matchId}`).emit('proposal:accepted', {
          matchId: proposal.matchId,
          proposalId: proposal.id,
          confirmedDateId: confirmedDate.id,
          acceptedBy: userId
        });
      }
    } catch (_) { /* Socket.io not available */ }

    res.json({ proposal: updated, confirmedDate });
  } catch (err) {
    console.error('PUT /proposals/:id/accept error:', err);
    res.status(500).json({ error: 'Failed to accept proposal' });
  }
});

// -------------------------------------------------------
// PUT /api/proposals/:id/decline — Decline a proposal
// -------------------------------------------------------
router.put('/:id/decline', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const proposalId = req.params.id;

    const proposal = await db.read('proposals', proposalId);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    // Only the recipient can decline
    if (proposal.recipientId !== userId) {
      return res.status(403).json({ error: 'Only the proposal recipient can decline' });
    }

    if (proposal.status !== 'pending') {
      return res.status(400).json({ error: `Proposal is already ${proposal.status}` });
    }

    // Update proposal status
    const updated = await db.update('proposals', proposalId, {
      status: 'declined',
      declinedAt: new Date().toISOString()
    });

    // Notify via Socket.io
    try {
      const { io } = require('../server');
      if (io) {
        io.to(`match:${proposal.matchId}`).emit('proposal:declined', {
          matchId: proposal.matchId,
          proposalId: proposal.id,
          declinedBy: userId
        });
      }
    } catch (_) { /* Socket.io not available */ }

    res.json({ proposal: updated });
  } catch (err) {
    console.error('PUT /proposals/:id/decline error:', err);
    res.status(500).json({ error: 'Failed to decline proposal' });
  }
});

// -------------------------------------------------------
// PUT /api/proposals/:id/modify — Counter-proposal (modify)
// -------------------------------------------------------
router.put('/:id/modify', authMiddleware, validate(modifyProposalSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const proposalId = req.params.id;

    const proposal = await db.read('proposals', proposalId);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    // Only the recipient can modify (counter-proposal)
    if (proposal.recipientId !== userId) {
      return res.status(403).json({ error: 'Only the proposal recipient can modify' });
    }

    if (proposal.status !== 'pending') {
      return res.status(400).json({ error: `Proposal is already ${proposal.status}` });
    }

    // Build modification entry
    const modification = {
      modifiedBy: userId,
      modifiedAt: new Date().toISOString(),
      changes: {}
    };

    const updates = {};

    // Apply only provided fields
    const fields = ['activityType', 'date', 'time', 'neighborhood', 'budgetRange', 'suggestedPlace', 'notes'];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        // Capture old value for history
        modification.changes[field] = { from: proposal[field], to: req.body[field] };
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(modification.changes).length === 0) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    // Validate activity type if being changed
    if (updates.activityType) {
      const validActivity = ACTIVITY_TYPES.find(a => a.id === updates.activityType);
      if (!validActivity) {
        return res.status(400).json({ error: 'Invalid activity type' });
      }
      updates.activityLabel = validActivity.label;
      updates.activityEmoji = validActivity.emoji;
    }

    // Validate neighborhood if being changed
    if (updates.neighborhood) {
      const validNeighborhood = NEIGHBORHOODS.find(n => n.name === updates.neighborhood);
      if (!validNeighborhood) {
        return res.status(400).json({ error: 'Invalid neighborhood' });
      }
      updates.neighborhoodCoords = { lat: validNeighborhood.lat, lon: validNeighborhood.lon };
    }

    // Add to modification history
    const history = [...(proposal.modificationHistory || []), modification];

    // Update proposal
    const updated = await db.update('proposals', proposalId, {
      ...updates,
      status: 'modified',
      modificationHistory: history,
      modifiedAt: new Date().toISOString()
    });

    // Notify via Socket.io
    try {
      const { io } = require('../server');
      if (io) {
        io.to(`match:${proposal.matchId}`).emit('proposal:modified', {
          matchId: proposal.matchId,
          proposalId: proposal.id,
          modifiedBy: userId,
          changes: modification.changes
        });
      }
    } catch (_) { /* Socket.io not available */ }

    res.json({ proposal: updated });
  } catch (err) {
    console.error('PUT /proposals/:id/modify error:', err);
    res.status(500).json({ error: 'Failed to modify proposal' });
  }
});

// -------------------------------------------------------
// GET /api/proposals/suggestions/:matchId — Smart place suggestions
// (Task #16 - placeholder, will be fully implemented with OSM)
// -------------------------------------------------------
router.get('/suggestions/:matchId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { matchId } = req.params;

    // Verify match access
    const match = await db.read('matches', matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (!match.users.includes(userId)) return res.status(403).json({ error: 'Not your match' });

    // Get both users' profiles to find shared activities
    const userA = await db.read('users', match.users[0]);
    const userB = await db.read('users', match.users[1]);

    if (!userA || !userB) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Find shared activities
    const activitiesA = (userA.activities || []).map(a => typeof a === 'string' ? a : a.id || a);
    const activitiesB = (userB.activities || []).map(a => typeof a === 'string' ? a : a.id || a);
    const sharedActivities = activitiesA.filter(a => activitiesB.includes(a));

    // Build suggestions per shared activity using constants (no OSM yet)
    const suggestions = [];

    for (const activityId of sharedActivities) {
      const activityDef = ACTIVITY_TYPES.find(a => a.id === activityId);
      if (!activityDef) continue;

      // Find a midpoint neighborhood as a suggestion area
      const latA = userA.location?.latitude || NEIGHBORHOODS[0].lat;
      const lonA = userA.location?.longitude || NEIGHBORHOODS[0].lon;
      const latB = userB.location?.latitude || NEIGHBORHOODS[0].lat;
      const lonB = userB.location?.longitude || NEIGHBORHOODS[0].lon;
      const midLat = (latA + latB) / 2;
      const midLon = (lonA + lonB) / 2;

      // Find closest neighborhood to midpoint
      let closestNeighborhood = NEIGHBORHOODS[0];
      let minDist = Infinity;
      for (const n of NEIGHBORHOODS) {
        const d = db.haversineDistance(midLat, midLon, n.lat, n.lon);
        if (d < minDist) { minDist = d; closestNeighborhood = n; }
      }

      suggestions.push({
        activityId: activityDef.id,
        activityLabel: activityDef.label,
        activityEmoji: activityDef.emoji,
        suggestedNeighborhood: closestNeighborhood.name,
        distanceFromMidpoint: Math.round(minDist * 10) / 10,
        // Fetch real places from OSM Overpass API
        places: await searchPlaces(
          closestNeighborhood.lat,
          closestNeighborhood.lon,
          activityDef.osmTags,
          3, // 3km radius
          3  // max 3 places per activity
        )
      });
    }

    res.json({
      sharedActivities: sharedActivities,
      suggestions
    });
  } catch (err) {
    console.error('GET /proposals/suggestions/:matchId error:', err);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// -------------------------------------------------------
// GET /api/proposals/search/place — Search places via Nominatim
// Used by mobile app for place autocomplete
// -------------------------------------------------------
router.get('/search/place', authMiddleware, async (req, res) => {
  try {
    const { q, lat, lon } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const results = await searchPlace(q.trim(), lat ? parseFloat(lat) : null, lon ? parseFloat(lon) : null);
    res.json({ results });
  } catch (err) {
    console.error('GET /proposals/search/place error:', err);
    res.status(500).json({ error: 'Place search failed' });
  }
});

module.exports = router;
