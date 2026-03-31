/**
 * Daily Backup Cron Job
 *
 * Run with: node src/utils/backup-cron.js
 * Or add to crontab: 0 3 * * * cd /path/to/backend && node src/utils/backup-cron.js >> /var/log/doukhou-backup.log 2>&1
 *
 * Actions:
 * 1. Create a backup of all data
 * 2. Compress backups older than 3 days
 * 3. Clean up backups older than 30 days
 * 4. Log the result
 */

require('dotenv').config();
const { getDB } = require('./db');

async function runBackup() {
  const db = getDB();
  const startTime = Date.now();

  console.log(`\n🕐 Backup started at ${new Date().toISOString()}`);

  try {
    // 1. Create backup
    const backupDir = await db.backup();
    console.log(`✅ Backup created: ${backupDir}`);

    // 2. Compress old + clean up ancient backups
    const { removed, compressed } = await db.cleanupOldBackups(30, 3);
    if (compressed > 0) console.log(`📦 Compressed ${compressed} old backup(s)`);
    if (removed > 0) console.log(`🗑️ Removed ${removed} old backup(s)`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️ Backup completed in ${elapsed}s`);
    console.log(`📊 Memory usage: ${JSON.stringify(process.memoryUsage())}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Backup failed:', err);
    process.exit(1);
  }
}

runBackup();
