/**
 * JSON Database Manager
 * 
 * Handles all CRUD operations on JSON files with:
 * - Unique ID generation (UUID v4)
 * - In-memory caching (node-cache)
 * - File-based indexing for fast lookups
 * - Haversine proximity search
 * - Daily automated backups
 */

const fs = require('fs').promises;
const fss = require('fs'); // for streams
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');

class JsonDB {
  constructor(dataDir = './data') {
    this.dataDir = path.resolve(dataDir);
    this.cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5 min cache
  }

  // Ensure directory exists
  async _ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }

  // Get full path for a collection
  _getCollectionPath(collection) {
    return path.join(this.dataDir, collection);
  }

  // Generate unique ID
  generateId() {
    return uuidv4();
  }

  // CREATE - Write a new JSON file
  async create(collection, data) {
    const id = data.id || this.generateId();
    const record = { ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const dirPath = this._getCollectionPath(collection);
    await this._ensureDir(dirPath);
    const filePath = path.join(dirPath, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2));
    this.cache.set(`${collection}:${id}`, record);
    return record;
  }

  // READ - Read a single JSON file
  async read(collection, id) {
    const cacheKey = `${collection}:${id}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const filePath = path.join(this._getCollectionPath(collection), `${id}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(raw);
      this.cache.set(cacheKey, data);
      return data;
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  // UPDATE - Update an existing JSON file
  async update(collection, id, updates) {
    const existing = await this.read(collection, id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
    const filePath = path.join(this._getCollectionPath(collection), `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
    this.cache.set(`${collection}:${id}`, updated);
    return updated;
  }

  // DELETE - Remove a JSON file
  async delete(collection, id) {
    const filePath = path.join(this._getCollectionPath(collection), `${id}.json`);
    try {
      await fs.unlink(filePath);
      this.cache.del(`${collection}:${id}`);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') return false;
      throw err;
    }
  }

  // LIST - List all files in a collection
  async list(collection) {
    const dirPath = this._getCollectionPath(collection);
    try {
      const files = await fs.readdir(dirPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      const records = await Promise.all(
        jsonFiles.map(async (file) => {
          const id = file.replace('.json', '');
          return this.read(collection, id);
        })
      );
      return records.filter(Boolean);
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  // QUERY - Find records matching a filter function
  async query(collection, filterFn) {
    const all = await this.list(collection);
    return all.filter(filterFn);
  }

  // INDEX - Read an index file
  async readIndex(indexName) {
    const cacheKey = `index:${indexName}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const filePath = path.join(this._getCollectionPath('indexes'), `${indexName}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(raw);
      this.cache.set(cacheKey, data);
      return data;
    } catch (err) {
      if (err.code === 'ENOENT') return {};
      throw err;
    }
  }

  // INDEX - Write/update an index file
  async writeIndex(indexName, data) {
    const dirPath = this._getCollectionPath('indexes');
    await this._ensureDir(dirPath);
    const filePath = path.join(dirPath, `${indexName}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    this.cache.set(`index:${indexName}`, data);
  }

  // INDEX - Add entry to an index
  async addToIndex(indexName, key, value) {
    const index = await this.readIndex(indexName);
    index[key] = value;
    await this.writeIndex(indexName, index);
  }

  // INDEX - Remove entry from an index
  async removeFromIndex(indexName, key) {
    const index = await this.readIndex(indexName);
    delete index[key];
    await this.writeIndex(indexName, index);
  }

  // HAVERSINE - Calculate distance between two GPS coordinates (km)
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this._toRad(lat2 - lat1);
    const dLon = this._toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _toRad(deg) {
    return deg * (Math.PI / 180);
  }

  // PROXIMITY - Find records within a radius (km)
  async findWithinRadius(collection, centerLat, centerLon, radiusKm, latKey = 'latitude', lonKey = 'longitude') {
    const all = await this.list(collection);
    return all.filter(record => {
      if (!record[latKey] || !record[lonKey]) return false;
      const distance = this.haversineDistance(centerLat, centerLon, record[latKey], record[lonKey]);
      return distance <= radiusKm;
    }).map(record => ({
      ...record,
      _distance: this.haversineDistance(centerLat, centerLon, record[latKey], record[lonKey])
    }));
  }

  // BACKUP - Create a backup of all data
  async backup() {
    const date = new Date().toISOString().split('T')[0];
    const backupDir = path.join(this.dataDir, 'backups', date);
    await this._ensureDir(backupDir);

    const collections = ['users', 'matches', 'messages', 'proposals', 'groups', 'swipes', 'reports', 'indexes', 'analytics', 'confirmed_dates', 'group_messages'];
    let fileCount = 0;
    for (const collection of collections) {
      const srcDir = this._getCollectionPath(collection);
      const destDir = path.join(backupDir, collection);
      try {
        const files = await fs.readdir(srcDir);
        await this._ensureDir(destDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            await fs.copyFile(path.join(srcDir, file), path.join(destDir, file));
            fileCount++;
          }
        }
      } catch (err) {
        if (err.code !== 'ENOENT') console.error(`Backup error for ${collection}:`, err.message);
      }
    }

    const logEntry = { date, timestamp: new Date().toISOString(), filesBackedUp: fileCount, status: 'success' };
    await this._ensureDir(path.join(this.dataDir, 'backups'));
    const logPath = path.join(this.dataDir, 'backups', 'backup_log.json');
    let log = [];
    try {
      const raw = await fs.readFile(logPath, 'utf8');
      log = JSON.parse(raw);
    } catch (e) { /* first backup */ }
    log.push(logEntry);
    await fs.writeFile(logPath, JSON.stringify(log, null, 2));

    console.log(`✅ Backup completed: ${backupDir} (${fileCount} files)`);
    return backupDir;
  }

  // COMPRESS - Gzip a backup directory into a .tar.gz archive
  async compressBackup(dirPath) {
    const tarPath = `${dirPath}.tar.gz`;

    // Collect all files in the backup directory
    const allFiles = [];
    const collectFiles = async (dir, base = '') => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(base, entry.name);
        if (entry.isDirectory()) {
          await collectFiles(fullPath, relPath);
        } else if (entry.isFile()) {
          allFiles.push({ fullPath, relPath });
        }
      }
    };
    await collectFiles(dirPath);

    // Create a simple tar-like archive and gzip it
    const gzip = zlib.createGzip({ level: 6 });
    const output = fss.createWriteStream(tarPath);

    // Simple tar format: for each file, write a header + content
    const writeHeader = (name, size) => {
      // 512-byte tar header (simplified)
      const header = Buffer.alloc(512);
      header.write(name, 0, 100);           // file name
      header.write('100644', 100, 8);       // mode
      header.write('0000000', 108, 8);      // uid
      header.write('0000000', 116, 8);      // gid
      header.write(size.toString(8).padStart(11, '0'), 124, 12); // size (octal)
      header.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, '0'), 136, 12); // mtime
      header.write('0', 156, 1);            // typeflag (file)
      // checksum
      let checksum = 0;
      for (let i = 0; i < 512; i++) checksum += header[i];
      header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
      return header;
    };

    const writePadding = (size) => {
      const remainder = 512 - (size % 512);
      if (remainder < 512) return Buffer.alloc(remainder);
      return Buffer.alloc(0);
    };

    // Pipe through gzip to output
    gzip.pipe(output);

    for (const file of allFiles) {
      const content = await fs.readFile(file.fullPath);
      const header = writeHeader(file.relPath, content.length);
      gzip.write(header);
      gzip.write(content);
      gzip.write(writePadding(content.length));
    }

    // End-of-archive marker (two 512-byte blocks of zeros)
    gzip.write(Buffer.alloc(1024));
    gzip.end();

    await new Promise((resolve, reject) => {
      output.on('finish', resolve);
      output.on('error', reject);
    });

    // Remove original uncompressed directory
    await fs.rm(dirPath, { recursive: true, force: true });

    console.log(`📦 Compressed backup: ${tarPath}`);
    return tarPath;
  }

  // BACKUP CLEANUP - Compress old backups, remove ancient ones
  async cleanupOldBackups(daysToKeep = 30, daysToCompress = 3) {
    const backupsDir = path.join(this.dataDir, 'backups');
    try {
      const entries = await fs.readdir(backupsDir, { withFileTypes: true });
      const now = Date.now();
      const cutoff = now - (daysToKeep * 24 * 60 * 60 * 1000);
      const compressCutoff = now - (daysToCompress * 24 * 60 * 60 * 1000);
      let removed = 0;
      let compressed = 0;

      for (const entry of entries) {
        const dirPath = path.join(backupsDir, entry.name);

        // Handle directory backups (YYYY-MM-DD format)
        if (entry.isDirectory()) {
          const dirDate = new Date(entry.name);
          if (isNaN(dirDate.getTime())) continue;

          if (dirDate.getTime() < cutoff) {
            await fs.rm(dirPath, { recursive: true, force: true });
            removed++;
            console.log(`🗑️ Removed old backup: ${entry.name}`);
          } else if (dirDate.getTime() < compressCutoff) {
            // Only compress if not already compressed
            const tarPath = `${dirPath}.tar.gz`;
            try {
              await fs.access(tarPath);
              // Already compressed, skip
            } catch {
              await this.compressBackup(dirPath);
              compressed++;
            }
          }
        }

        // Handle .tar.gz files older than cutoff
        if (entry.isFile() && entry.name.endsWith('.tar.gz')) {
          const dirDate = new Date(entry.name.replace('.tar.gz', ''));
          if (isNaN(dirDate.getTime())) continue;
          if (dirDate.getTime() < cutoff) {
            await fs.unlink(dirPath);
            removed++;
            console.log(`🗑️ Removed old compressed backup: ${entry.name}`);
          }
        }
      }

      // Update backup log with cleanup info
      const logPath = path.join(backupsDir, 'backup_log.json');
      try {
        const raw = await fs.readFile(logPath, 'utf8');
        const log = JSON.parse(raw);
        log.push({
          action: 'cleanup',
          timestamp: new Date().toISOString(),
          removed,
          compressed,
          daysToKeep,
          daysToCompress
        });
        await fs.writeFile(logPath, JSON.stringify(log, null, 2));
      } catch (e) { /* no log yet */ }

      return { removed, compressed };
    } catch (err) {
      if (err.code === 'ENOENT') return { removed: 0, compressed: 0 };
      throw err;
    }
  }

  // STATS - Get collection stats
  async stats(collection) {
    const records = await this.list(collection);
    return { collection, count: records.length };
  }

  // Clear cache for a collection
  clearCache(collection) {
    const keys = this.cache.keys().filter(k => k.startsWith(`${collection}:`));
    keys.forEach(k => this.cache.del(k));
  }
}

// Singleton instance
let instance = null;

function getDB(dataDir) {
  if (!instance) {
    instance = new JsonDB(dataDir || process.env.DATA_DIR || './data');
  }
  return instance;
}

module.exports = { JsonDB, getDB };
