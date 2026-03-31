/**
 * Safety Routes
 *
 * Report and block systems to keep users safe.
 *
 * Routes (task #20 — Report system):
 * - POST   /api/safety/report           — Report a user
 * - GET    /api/safety/reports          — Admin review queue
 * - PUT    /api/safety/reports/:id      — Admin: update report status
 *
 * Routes (task #21 — Block system):
 * - POST   /api/safety/block            — Block a user
 * - GET    /api/safety/blocked          — List blocked users
 * - DELETE /api/safety/block/:userId    — Unblock a user
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { getDB } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const { validate, Joi } = require('../middleware/validate');
const { REPORT_REASONS } = require('../utils/constants');

const router = express.Router();
const db = getDB();

// Multer config for evidence uploads
const evidenceStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const dir = path.join(process.env.UPLOAD_DIR || './uploads', 'reports', req.user.id);
    const fs = require('fs').promises;
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `evidence_${Date.now()}${ext}`);
  }
});

const uploadEvidence = multer({
  storage: evidenceStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only images (jpg, png, webp) and videos (mp4, mov) are allowed'));
  }
});

// -------------------------------------------------------
// Validation schemas
// -------------------------------------------------------

const reportSchema = Joi.object({
  reportedUserId: Joi.string().required(),
  reason: Joi.string().valid(...REPORT_REASONS).required(),
  description: Joi.string().max(1000).optional().allow('')
});

const blockSchema = Joi.object({
  userId: Joi.string().required()
});

const updateReportSchema = Joi.object({
  status: Joi.string().valid('reviewed', 'resolved', 'dismissed').required(),
  adminNote: Joi.string().max(1000).optional().allow('')
});

// -------------------------------------------------------
// POST /api/safety/report — Report a user
// -------------------------------------------------------
router.post('/report', authMiddleware, uploadEvidence.single('evidence'), async (req, res) => {
  try {
    const reporterId = req.user.id;
    const { reportedUserId, reason, description } = req.body;

    // Validate reason
    if (!reportedUserId || !reason) {
      return res.status(400).json({ error: 'reportedUserId and reason are required' });
    }

    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason', validReasons: REPORT_REASONS });
    }

    // Cannot report yourself
    if (reporterId === reportedUserId) {
      return res.status(400).json({ error: 'Cannot report yourself' });
    }

    // Verify reported user exists
    const reportedUser = await db.read('users', reportedUserId);
    if (!reportedUser) return res.status(404).json({ error: 'User not found' });

    // Check for duplicate reports (same reporter, same target, same reason, within 24h)
    const recentReports = await db.query('reports', r =>
      r.reporterId === reporterId &&
      r.reportedUserId === reportedUserId &&
      r.reason === reason &&
      r.status === 'pending' &&
      (Date.now() - new Date(r.createdAt).getTime()) < 24 * 60 * 60 * 1000
    );

    if (recentReports.length > 0) {
      return res.status(400).json({ error: 'You already have a pending report for this user with the same reason' });
    }

    // Build report
    const report = await db.create('reports', {
      reporterId,
      reporterName: (await db.read('users', reporterId))?.name || 'Anonymous',
      reportedUserId,
      reportedUserName: reportedUser.name || 'Anonymous',
      reason,
      reasonLabel: reason.replace(/_/g, ' '),
      description: description || null,
      evidence: req.file ? `/uploads/reports/${reporterId}/${req.file.filename}` : null,
      status: 'pending', // pending | reviewed | resolved | dismissed
      adminNote: null,
      reviewedAt: null,
      reviewedBy: null
    });

    res.status(201).json({
      message: 'Report submitted successfully',
      report: {
        id: report.id,
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt
      }
    });
  } catch (err) {
    console.error('POST /safety/report error:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// -------------------------------------------------------
// GET /api/safety/reports — Admin review queue
// -------------------------------------------------------
router.get('/reports', authMiddleware, async (req, res) => {
  try {
    // Simple admin check — in production, use a proper role system
    const user = await db.read('users', req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const status = req.query.status || 'pending';
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    let reports = await db.query('reports', r => r.status === status);

    // Sort newest first
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const total = reports.length;
    const startIndex = (page - 1) * limit;
    reports = reports.slice(startIndex, startIndex + limit);

    res.json({
      reports,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('GET /safety/reports error:', err);
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

// -------------------------------------------------------
// PUT /api/safety/reports/:id — Admin: update report status
// -------------------------------------------------------
router.put('/reports/:id', authMiddleware, validate(updateReportSchema), async (req, res) => {
  try {
    const user = await db.read('users', req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const reportId = req.params.id;
    const { status, adminNote } = req.body;

    const report = await db.read('reports', reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const updated = await db.update('reports', reportId, {
      status,
      adminNote: adminNote || null,
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user.id
    });

    res.json({ report: updated });
  } catch (err) {
    console.error('PUT /safety/reports/:id error:', err);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// -------------------------------------------------------
// POST /api/safety/block — Block a user
// -------------------------------------------------------
router.post('/block', authMiddleware, validate(blockSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const { userId: targetUserId } = req.body;

    // Cannot block yourself
    if (userId === targetUserId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    // Verify target user exists
    const targetUser = await db.read('users', targetUserId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Get current user's profile
    const user = await db.read('users', userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if already blocked
    const blockedUsers = user.blockedUsers || [];
    if (blockedUsers.includes(targetUserId)) {
      return res.status(400).json({ error: 'User is already blocked' });
    }

    // Add to blocked list
    blockedUsers.push(targetUserId);
    await db.update('users', userId, { blockedUsers });

    // Also unmatch if there's an active match
    try {
      const activeMatches = await db.readIndex('active_matches');
      const userMatchIds = activeMatches[userId] || [];

      for (const matchId of userMatchIds) {
        const match = await db.read('matches', matchId);
        if (match && match.users.includes(targetUserId)) {
          // Remove match
          await db.delete('matches', matchId);

          // Update active_matches index for both users
          const otherUserId = match.users.find(u => u !== userId);
          if (activeMatches[otherUserId]) {
            activeMatches[otherUserId] = activeMatches[otherUserId].filter(id => id !== matchId);
          }
          activeMatches[userId] = activeMatches[userId].filter(id => id !== matchId);

          await db.writeIndex('active_matches', activeMatches);
          break;
        }
      }
    } catch (err) {
      console.error('Error unmatching on block:', err.message);
    }

    // Notify via Socket.io
    try {
      const { io } = require('../server');
      if (io) {
        io.to(`user:${targetUserId}`).emit('user:blocked', {
          blockedBy: userId
        });
      }
    } catch (_) { /* Socket.io not available */ }

    res.json({ message: 'User blocked', userId: targetUserId });
  } catch (err) {
    console.error('POST /safety/block error:', err);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// -------------------------------------------------------
// GET /api/safety/blocked — List blocked users
// -------------------------------------------------------
router.get('/blocked', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await db.read('users', userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const blockedIds = user.blockedUsers || [];

    // Fetch minimal profile info for each blocked user
    const blockedUsers = await Promise.all(
      blockedIds.map(async (id) => {
        const blocked = await db.read('users', id);
        if (!blocked) return null;
        return {
          id: blocked.id,
          name: blocked.name || 'Anonymous',
          photo: (blocked.photos && blocked.photos.length > 0) ? blocked.photos[0] : null
        };
      })
    );

    res.json({ blockedUsers: blockedUsers.filter(Boolean) });
  } catch (err) {
    console.error('GET /safety/blocked error:', err);
    res.status(500).json({ error: 'Failed to load blocked users' });
  }
});

// -------------------------------------------------------
// DELETE /api/safety/block/:userId — Unblock a user
// -------------------------------------------------------
router.delete('/block/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const targetUserId = req.params.userId;

    const user = await db.read('users', userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const blockedUsers = user.blockedUsers || [];
    const index = blockedUsers.indexOf(targetUserId);

    if (index === -1) {
      return res.status(400).json({ error: 'User is not blocked' });
    }

    // Remove from blocked list
    blockedUsers.splice(index, 1);
    await db.update('users', userId, { blockedUsers });

    res.json({ message: 'User unblocked', userId: targetUserId });
  } catch (err) {
    console.error('DELETE /safety/block/:userId error:', err);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

module.exports = router;
