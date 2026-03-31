/**
 * Backup Routes
 *
 * GET  /api/backup/status  — last backup status + schedule info
 * POST /api/backup/run     — trigger a manual backup now
 * GET  /api/backup/log     — view backup log history
 */

const express = require('express');
const router = express.Router();
const { runBackupNow, getBackupStatus } = require('../utils/backup-scheduler');
const { getDB } = require('../utils/db');
const path = require('path');

// GET /api/backup/status — Current backup status
router.get('/status', (req, res) => {
  const status = getBackupStatus();
  res.json(status);
});

// POST /api/backup/run — Trigger manual backup
router.post('/run', async (req, res) => {
  const status = getBackupStatus();
  if (status.isRunning) {
    return res.status(409).json({ error: 'Backup already in progress' });
  }

  try {
    const result = await runBackupNow();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/backup/log — Backup history
router.get('/log', async (req, res) => {
  const db = getDB();
  const logPath = path.join(db.dataDir, 'backups', 'backup_log.json');
  try {
    const fs = require('fs').promises;
    const raw = await fs.readFile(logPath, 'utf8');
    const log = JSON.parse(raw);
    // Return last 50 entries
    res.json(log.slice(-50));
  } catch (err) {
    res.json([]);
  }
});

module.exports = router;
