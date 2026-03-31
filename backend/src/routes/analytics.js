/**
 * Analytics Routes
 *
 * View daily and range analytics.
 *
 * Routes:
 * - GET /api/analytics/today        — Today's metrics
 * - GET /api/analytics/:date        — Specific date (YYYY-MM-DD)
 * - GET /api/analytics?start=&end=  — Date range with totals
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getDaily, getRange } = require('../utils/analytics');
const { getDB } = require('../utils/db');

const router = express.Router();

// All analytics routes require auth + admin check
router.use(authMiddleware, async (req, res, next) => {
  const db = getDB();
  const user = await db.read('users', req.user.id);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
});

// GET /api/analytics/today
router.get('/today', async (req, res) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    const data = await getDaily(date);
    res.json({ analytics: data });
  } catch (err) {
    console.error('GET /analytics/today error:', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// GET /api/analytics?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (start && end) {
      const data = await getRange(start, end);
      return res.json({ analytics: data });
    }

    // Default: return today
    const date = new Date().toISOString().split('T')[0];
    const data = await getDaily(date);
    res.json({ analytics: data });
  } catch (err) {
    console.error('GET /analytics error:', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// GET /api/analytics/:date
router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params;
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
    }
    const data = await getDaily(date);
    if (!data) return res.status(404).json({ error: 'No analytics for this date' });
    res.json({ analytics: data });
  } catch (err) {
    console.error('GET /analytics/:date error:', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

module.exports = router;
