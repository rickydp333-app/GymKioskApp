'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const COLLECTIONS = ['workouts', 'users', 'calendars', 'friend-challenges'];

function resolveDataDirectory(appName = 'GymKioskApp') {
  if (process.env.GYMKIOSK_DATA_DIR) {
    return path.resolve(process.env.GYMKIOSK_DATA_DIR);
  }

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(localAppData, appName, 'data');
  }

  return path.join(os.homedir(), `.${appName.toLowerCase()}`, 'data');
}

function readLegacyJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`Unable to import legacy data from ${filePath}: ${error.message}`);
    return fallback;
  }
}

function createPersistentStore(options = {}) {
  const sourceDataDir = options.sourceDataDir || path.join(__dirname, '..', 'data');
  const dataDir = options.dataDir || resolveDataDirectory();
  const backupDir = path.join(dataDir, 'migration-backup');
  const databasePath = path.join(dataDir, 'gym-kiosk.db');

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  const database = new DatabaseSync(databasePath);
  database.exec('PRAGMA journal_mode = WAL;');
  database.exec('PRAGMA synchronous = FULL;');
  database.exec('PRAGMA foreign_keys = ON;');
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_collections (
      name TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
    CREATE TABLE IF NOT EXISTS sync_inbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kiosk_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      source_event_id TEXT,
      received_at TEXT NOT NULL,
      UNIQUE(kiosk_id, source_event_id)
    );
  `);

  const selectCollection = database.prepare('SELECT payload FROM app_collections WHERE name = ?');
  const upsertCollection = database.prepare(`
    INSERT INTO app_collections (name, payload, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
  `);

  function runTransaction(callback) {
    database.exec('BEGIN IMMEDIATE;');
    try {
      const result = callback();
      database.exec('COMMIT;');
      return result;
    } catch (error) {
      database.exec('ROLLBACK;');
      throw error;
    }
  }

  function writeCollection(name, payload) {
    if (!COLLECTIONS.includes(name)) throw new Error(`Unknown collection: ${name}`);
    upsertCollection.run(name, JSON.stringify(payload), new Date().toISOString());
  }

  function readCollection(name, fallback) {
    if (!COLLECTIONS.includes(name)) throw new Error(`Unknown collection: ${name}`);
    const row = selectCollection.get(name);
    if (!row) return fallback;
    try {
      return JSON.parse(row.payload);
    } catch (error) {
      throw new Error(`Stored ${name} data is invalid: ${error.message}`);
    }
  }

  const migrationApplied = database.prepare('SELECT 1 FROM schema_migrations WHERE version = 1').get();
  if (!migrationApplied) {
    runTransaction(() => {
      for (const name of COLLECTIONS) {
        const legacyFile = path.join(sourceDataDir, `${name}.json`);
        const fallback = name === 'friend-challenges' ? [] : [];
        const existing = selectCollection.get(name);
        if (!existing) {
          const payload = readLegacyJson(legacyFile, fallback);
          writeCollection(name, payload);
        }

        if (fs.existsSync(legacyFile)) {
          const backupFile = path.join(backupDir, `${name}.json`);
          if (!fs.existsSync(backupFile)) fs.copyFileSync(legacyFile, backupFile);
        }
      }

      database.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?)')
        .run(new Date().toISOString());
    });
  }

  return {
    dataDir,
    databasePath,
    backupDir,
    readMap(name) {
      const payload = readCollection(name, []);
      return new Map(Array.isArray(payload) ? payload : []);
    },
    writeMap(name, map) {
      writeCollection(name, Array.from(map.entries()));
    },
    readList(name) {
      const payload = readCollection(name, []);
      return Array.isArray(payload) ? payload : [];
    },
    writeList(name, list) {
      writeCollection(name, Array.isArray(list) ? list : []);
    },
    enqueueSync(eventType, payload) {
      database.prepare('INSERT INTO sync_outbox (event_type, payload, created_at) VALUES (?, ?, ?)')
        .run(String(eventType), JSON.stringify(payload), new Date().toISOString());
    },
    pendingSync(limit = 50) {
      return database.prepare('SELECT id, event_type, payload, created_at, attempts FROM sync_outbox ORDER BY id LIMIT ?')
        .all(Math.max(1, Math.min(200, Number(limit) || 50)))
        .map((row) => ({ ...row, payload: JSON.parse(row.payload) }));
    },
    completeSync(ids) {
      const remove = database.prepare('DELETE FROM sync_outbox WHERE id = ?');
      runTransaction(() => ids.forEach((id) => remove.run(id)));
    },
    failSync(ids, error) {
      const update = database.prepare('UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?');
      runTransaction(() => ids.forEach((id) => update.run(String(error).slice(0, 500), id)));
    },
    receiveSync(kioskId, events) {
      const insert = database.prepare(`
        INSERT OR IGNORE INTO sync_inbox (kiosk_id, event_type, payload, source_event_id, received_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      let accepted = 0;
      runTransaction(() => {
        events.forEach((event) => {
          const result = insert.run(
            String(kioskId),
            String(event.event_type),
            JSON.stringify(event.payload),
            String(event.id),
            new Date().toISOString()
          );
          accepted += Number(result.changes || 0);
        });
      });
      return accepted;
    },
    close() {
      database.close();
    }
  };
}

module.exports = { createPersistentStore, resolveDataDirectory };

