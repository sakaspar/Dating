/**
 * Backup Scheduler
 *
 * Runs daily backups at 3:00 AM via node-cron.
 * Also supports manual trigger.
 *
 * Flow:
 * 1. Copy all /data collections to /backups/{YYYY-MM-DD}/
 * 2. Compress backups older than 3 days (.tar.gz)
 * 3. Delete backups older than 30 days
 * 4. Log everything to backup_log.json
 */

const cron = require('node-cron');
const { getDB } = require('./db');

let isRunning = false;
let lastRun = null;
let lastResult = null;

/**
 * Execute backup
 */
async function executeBackup() {
  if (isRunning) {
    console.log('⚠️ Backup already running, skipping...');
    return { status: 'skipped', reason: 'already running' };
  }

  isRunning = true;
  const db = getDB();
  const startTime = Date.now();

  try {
    console.log(`\n🕐 [Backup] Started at ${new Date().toISOString()}`);

    // 1. Create backup (copy all JSON files to /backups/{date}/)
    const backupDir = await db.backup();
    console.log(`✅ [Backup] Created: ${backupDir}`);

    // 2. Compress old backups + clean up (>30 days removed, >3 days compressed)
    const cleanup = await db.cleanupOldBackups(30, 3);
    if (cleanup.compressed > 0) {
      console.log(`📦 [Backup] Compressed ${cleanup.compressed} old backup(s)`);
    }
    if (cleanup.removed > 0) {
      console.log(`🗑️ [Backup] Removed ${cleanup.removed} old backup(s)`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️ [Backup] Completed in ${elapsed}s`);

    lastRun = new Date().toISOString();
    lastResult = { status: 'success', backupDir, ...cleanup, elapsed: parseFloat(elapsed) };
    return lastResult;
  } catch (err) {
    console.error('❌ [Backup] Failed:', err.message);
    lastRun = new Date().toISOString();
    lastResult = { status: 'error', error: err.message };
    return lastResult;
  } finally {
    isRunning = false;
  }
}

/**
 * Start the backup scheduler
 * Runs daily at 3:00 AM
 */
function startBackupScheduler() {
  // Run daily at 3:00 AM
  cron.schedule('0 3 * * *', () => {
    executeBackup();
  });

  console.log('📅 Backup scheduler started (daily at 3:00 AM)');
}

/**
 * Get backup status
 */
function getBackupStatus() {
  return {
    isRunning,
    lastRun,
    lastResult,
    schedule: '0 3 * * * (daily at 3:00 AM)'
  };
}

/**
 * Run backup immediately (for manual trigger)
 */
function runBackupNow() {
  return executeBackup();
}

module.exports = { startBackupScheduler, runBackupNow, getBackupStatus };
