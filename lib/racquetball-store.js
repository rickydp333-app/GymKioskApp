'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

function createRacquetballStore({ dataDir, isAdmin = () => false, now = () => Date.now() }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const database = new DatabaseSync(path.join(dataDir, 'racquetball.db'));
  database.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
  database.exec(`CREATE TABLE IF NOT EXISTS league_members (
    id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL, pin_salt TEXT NOT NULL, pin_hash TEXT NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);
  database.exec(`CREATE TABLE IF NOT EXISTS player_sync (
    member_id TEXT PRIMARY KEY, synced_at TEXT, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT
  );
  INSERT OR IGNORE INTO player_sync (member_id) SELECT id FROM league_members;
  CREATE TABLE IF NOT EXISTS website_players (
    email TEXT PRIMARY KEY, full_name TEXT NOT NULL, phone TEXT NOT NULL,
    created_at TEXT NOT NULL, received_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS league_schedule (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, kind TEXT NOT NULL, date TEXT NOT NULL,
    start_time TEXT NOT NULL, end_time TEXT NOT NULL, location TEXT NOT NULL, notes TEXT NOT NULL
  );`);
  const columns = database.prepare('PRAGMA table_info(website_players)').all().map(column => column.name);
  for (const [name, definition] of [['pin_salt', 'TEXT'], ['pin_hash', 'TEXT'], ['failed_attempts', 'INTEGER NOT NULL DEFAULT 0'], ['locked_until', 'INTEGER NOT NULL DEFAULT 0'], ['source_id', 'TEXT']]) {
    if (!columns.includes(name)) database.exec(`ALTER TABLE website_players ADD COLUMN ${name} ${definition}`);
  }
  database.exec(`CREATE TABLE IF NOT EXISTS league_migrations (name TEXT PRIMARY KEY);
    INSERT INTO player_sync (member_id) SELECT id FROM league_members WHERE 1
    ON CONFLICT(member_id) DO UPDATE SET synced_at = CASE
      WHEN EXISTS(SELECT 1 FROM league_migrations WHERE name = 'credential-sync') THEN synced_at ELSE NULL END;
    INSERT OR IGNORE INTO league_migrations VALUES ('credential-sync');`);
  const publicMember = member => ({ id: member.id, fullName: member.full_name, email: member.email, phone: member.phone });
  const normalizeEmail = email => String(email || '').trim().toLowerCase();
  const validPin = pin => typeof pin === 'string' && /^\d{4}$/.test(pin);
  const pinCredentials = pin => {
    const salt = crypto.randomBytes(16).toString('hex');
    return { salt, hash: crypto.scryptSync(pin, salt, 64).toString('hex') };
  };

  function signUp(payload = {}) {
    const fullName = String(payload.fullName || '').trim();
    const email = normalizeEmail(payload.email);
    const phone = String(payload.phone || '').trim();
    if (!fullName || fullName.length > 120 || /[\x00-\x1f]/.test(fullName)) return { success: false, error: 'Enter your full name (up to 120 characters).' };
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: 'Enter a valid email address.' };
    if (phone.length > 40 || !/^[+\d\s().-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15) return { success: false, error: 'Enter a valid phone number (7 to 15 digits).' };
    if (!validPin(payload.pin)) return { success: false, error: 'Choose a four-digit PIN.' };
    if (database.prepare('SELECT id FROM league_members WHERE email = ?').get(email)) return { success: false, error: 'This email is already registered. Log in instead.' };
    const member = { id: crypto.randomUUID(), full_name: fullName, email, phone };
    const credentials = pinCredentials(payload.pin);
    transaction(() => {
      database.prepare('INSERT INTO league_members (id, full_name, email, phone, pin_salt, pin_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(member.id, fullName, email, phone, credentials.salt, credentials.hash, new Date(now()).toISOString());
      database.prepare('INSERT INTO player_sync (member_id) VALUES (?)').run(member.id);
    });
    return { success: true, member: publicMember(member) };
  }

  function logIn(payload = {}) {
    const email = normalizeEmail(payload.email);
    if (!validPin(payload.pin) || email.length > 254) return { success: false, error: 'Email or PIN was not accepted.' };
    const member = database.prepare('SELECT * FROM league_members WHERE email = ?').get(email);
    if (!member) return { success: false, error: 'Email or PIN was not accepted.' };
    if (member.locked_until > now()) return { success: false, error: 'Too many attempts. Try again in one minute.' };
    const hash = crypto.scryptSync(payload.pin, member.pin_salt, 64);
    if (!crypto.timingSafeEqual(hash, Buffer.from(member.pin_hash, 'hex'))) {
      const attempts = member.locked_until ? 1 : member.failed_attempts + 1;
      database.prepare('UPDATE league_members SET failed_attempts = ?, locked_until = ? WHERE id = ?')
        .run(attempts, attempts >= 5 ? now() + 60000 : 0, member.id);
      return { success: false, error: attempts >= 5 ? 'Too many attempts. Try again in one minute.' : 'Email or PIN was not accepted.' };
    }
    database.prepare('UPDATE league_members SET failed_attempts = 0, locked_until = 0 WHERE id = ?').run(member.id);
    return { success: true, member: publicMember(member) };
  }

  function listMembers(token) {
    if (!isAdmin(token)) return { success: false, error: 'Administrator authorization required.' };
    const members = database.prepare('SELECT id, full_name, email FROM league_members ORDER BY full_name, email').all();
    return { success: true, members: members.map(member => ({ id: member.id, fullName: member.full_name, email: member.email })) };
  }

  function resetPin(payload = {}) {
    if (!isAdmin(payload.token)) return { success: false, error: 'Administrator authorization required.' };
    if (!validPin(payload.pin)) return { success: false, error: 'Choose a four-digit PIN.' };
    const member = database.prepare('SELECT id FROM league_members WHERE id = ?').get(String(payload.memberId || ''));
    if (!member) return { success: false, error: 'League member not found.' };
    const credentials = pinCredentials(payload.pin);
    transaction(() => {
      database.prepare('UPDATE league_members SET pin_salt = ?, pin_hash = ?, failed_attempts = 0, locked_until = 0 WHERE id = ?')
        .run(credentials.salt, credentials.hash, member.id);
      database.prepare('UPDATE player_sync SET synced_at = NULL WHERE member_id = ?').run(member.id);
    });
    return { success: true };
  }

  function transaction(callback) {
    database.exec('BEGIN IMMEDIATE');
    try {
      const result = callback();
      database.exec('COMMIT');
      return result;
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  function pendingPlayers() {
    return database.prepare(`SELECT m.id, m.full_name, m.email, m.phone, m.created_at, m.pin_salt, m.pin_hash
      FROM league_members m JOIN player_sync s ON s.member_id = m.id
      WHERE s.synced_at IS NULL ORDER BY m.created_at, m.id LIMIT 50`).all()
      .map(member => ({ ...publicMember(member), createdAt: member.created_at, pinSalt: member.pin_salt, pinHash: member.pin_hash }));
  }

  function completePlayerSync(ids, uploaded = []) {
    const update = database.prepare('UPDATE player_sync SET synced_at = ?, last_error = NULL WHERE member_id = ?');
    transaction(() => ids.forEach(id => {
      const sent = uploaded.find(player => player.id === id);
      if (sent && database.prepare('SELECT pin_hash FROM league_members WHERE id=?').get(id)?.pin_hash !== sent.pinHash) return;
      update.run(new Date(now()).toISOString(), id);
    }));
  }

  function failPlayerSync(ids, error) {
    const update = database.prepare('UPDATE player_sync SET attempts = attempts + 1, last_error = ? WHERE member_id = ?');
    transaction(() => ids.forEach(id => update.run(String(error).slice(0, 500), id)));
  }

  function receivePlayers(players) {
    if (!Array.isArray(players) || !players.length || players.length > 50) return { success: false, error: 'Send 1 to 50 players.' };
    const normalized = [];
    for (const player of players) {
      if (!player || typeof player !== 'object' || Array.isArray(player)) return { success: false, error: 'Invalid player.' };
      const { id, fullName, email, phone, createdAt, pinSalt, pinHash } = player;
      if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(id) ||
          typeof fullName !== 'string' || !fullName.trim() || fullName.length > 120 || /[\x00-\x1f]/.test(fullName) ||
          typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          typeof phone !== 'string' || phone.length > 40 || !/^[+\d\s().-]+$/.test(phone) ||
          phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15 ||
          typeof createdAt !== 'string' || createdAt.length > 40 || !Number.isFinite(Date.parse(createdAt))) {
        return { success: false, error: 'Invalid player contact details or signup date.' };
      }
      if ((pinSalt !== undefined || pinHash !== undefined) &&
          (typeof pinSalt !== 'string' || !/^[a-f0-9]{32}$/.test(pinSalt) || typeof pinHash !== 'string' || !/^[a-f0-9]{128}$/.test(pinHash))) {
        return { success: false, error: 'Invalid player login credentials.' };
      }
      const existing = database.prepare('SELECT source_id FROM website_players WHERE email=?').get(normalizeEmail(email));
      if (existing?.source_id && existing.source_id !== id) return { success: false, error: 'This player email belongs to another kiosk registration. Ask an administrator to resolve it.' };
      normalized.push({ id, fullName: fullName.trim(), email: normalizeEmail(email), phone: phone.trim(), createdAt: new Date(createdAt).toISOString(), pinSalt: pinSalt || null, pinHash: pinHash || null });
    }
    const insert = database.prepare(`INSERT INTO website_players (email, full_name, phone, created_at, received_at, pin_salt, pin_hash, source_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET
      pin_salt = COALESCE(excluded.pin_salt, website_players.pin_salt),
      pin_hash = COALESCE(excluded.pin_hash, website_players.pin_hash),
      source_id = COALESCE(website_players.source_id, excluded.source_id),
      failed_attempts = CASE WHEN excluded.pin_hash IS NOT NULL AND excluded.pin_hash != website_players.pin_hash THEN 0 ELSE website_players.failed_attempts END,
      locked_until = CASE WHEN excluded.pin_hash IS NOT NULL AND excluded.pin_hash != website_players.pin_hash THEN 0 ELSE website_players.locked_until END`);
    if (new Set(normalized.map(player => player.email)).size !== normalized.length) {
      return { success: false, error: 'Send each player email only once per upload.' };
    }
    const hasSessions = database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='league_sessions'").get();
    transaction(() => normalized.forEach(player => {
      const previous = database.prepare('SELECT pin_hash FROM website_players WHERE email=?').get(player.email);
      insert.run(player.email, player.fullName, player.phone, player.createdAt, new Date(now()).toISOString(), player.pinSalt, player.pinHash, player.id);
      if (hasSessions && previous && player.pinHash && previous.pin_hash !== player.pinHash) {
        database.prepare('DELETE FROM league_sessions WHERE email=?').run(player.email);
      }
    }));
    return { success: true, acceptedIds: normalized.map(player => player.id) };
  }

  function websitePlayers() {
    return database.prepare('SELECT full_name, email, phone, created_at FROM website_players ORDER BY created_at DESC, email').all()
      .map(player => ({ fullName: player.full_name, email: player.email, phone: player.phone, createdAt: player.created_at }));
  }

  function schedule(month) {
    return database.prepare(`SELECT id, title, kind, date, start_time AS startTime, end_time AS endTime, location, notes
      FROM league_schedule WHERE date >= ? AND date < ? ORDER BY date, start_time, title, id`)
      .all(`${month}-01`, `${month}-32`);
  }

  function saveSchedule(payload, id = crypto.randomUUID(), updating = false) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { success: false, error: 'Enter schedule details.' };
    const { title, kind, date, startTime, endTime, location = '', notes = '' } = payload;
    const validText = (value, max) => typeof value === 'string' && value.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value);
    if (!validText(title, 120) || !title.trim() || !['match', 'practice', 'event'].includes(kind) ||
        !validText(location, 160) || !validText(notes, 1000)) return { success: false, error: 'Enter a title, valid event type, location (up to 160 characters), and notes (up to 1000 characters).' };
    if (typeof date !== 'string' || !/^(20\d{2}|2100)-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
      return { success: false, error: 'Choose a valid date between 2000 and 2100.' };
    }
    const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (!validTime(startTime) || !validTime(endTime) || endTime <= startTime) {
      return { success: false, error: 'The end time must be after the start time on the same day (Eastern Time).' };
    }
    if (updating) {
      const result = database.prepare(`UPDATE league_schedule SET title = ?, kind = ?, date = ?, start_time = ?, end_time = ?, location = ?, notes = ? WHERE id = ?`)
        .run(title.trim(), kind, date, startTime, endTime, location.trim(), notes.trim(), id);
      if (!result.changes) return { success: false, error: 'Schedule entry not found.', notFound: true };
    } else {
      database.prepare('INSERT INTO league_schedule (id, title, kind, date, start_time, end_time, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, title.trim(), kind, date, startTime, endTime, location.trim(), notes.trim());
    }
    return { success: true, event: { id, title: title.trim(), kind, date, startTime, endTime, location: location.trim(), notes: notes.trim() } };
  }

  function deleteSchedule(id) {
    const result = database.prepare('DELETE FROM league_schedule WHERE id = ?').run(id);
    return result.changes ? { success: true } : { success: false, error: 'Schedule entry not found.', notFound: true };
  }

  return { signUp, logIn, listMembers, resetPin, pendingPlayers, completePlayerSync, failPlayerSync, receivePlayers, websitePlayers, schedule, saveSchedule, deleteSchedule, close: () => database.close() };
}

module.exports = { createRacquetballStore };