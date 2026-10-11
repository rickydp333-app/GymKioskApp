'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const SEASON = '2026-27';
const TOKEN_TTL = 7 * 86400000;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
class LeagueError extends Error {}

function scoreResult(input) {
  if (!input || typeof input !== 'object') throw new LeagueError('Enter match scores.');
  if (input.forfeit === true) {
    if (![1, 2].includes(input.winner)) throw new LeagueError('Choose the forfeit winner.');
    return { forfeit: true, winner: input.winner, games: [], points: input.winner === 1 ? [5, 0] : [0, 5], totals: [0, 0] };
  }
  if (!Array.isArray(input.games) || input.games.length < 2 || input.games.length > 3) throw new LeagueError('Enter two games, or three when a tiebreaker is needed.');
  const wins = [0, 0], totals = [0, 0];
  const games = input.games.map((game, index) => {
    if (wins.includes(2)) throw new LeagueError('Do not enter another game after a player has won two.');
    if (!Array.isArray(game) || game.length !== 2 || game.some(value => !Number.isSafeInteger(value) || value < 0 || value > 999)) throw new LeagueError('Scores must be whole numbers between 0 and 999.');
    const high = Math.max(...game), low = Math.min(...game), target = index < 2 ? 15 : 11;
    if (high < target || high - low < 2 || (high > target && high - low !== 2)) throw new LeagueError(`Game ${index + 1} must reach ${target} and be won by two points.`);
    wins[game[0] > game[1] ? 0 : 1]++;
    totals[0] += game[0]; totals[1] += game[1];
    return game;
  });
  const winnerIndex = wins.indexOf(2);
  if (winnerIndex < 0) throw new LeagueError('The match must have a winner of two games.');
  const loserIndex = 1 - winnerIndex;
  const points = [0, 0];
  points[winnerIndex] = games.length === 2 ? 5 : 4;
  points[loserIndex] = games.length === 3 ? 2 : totals[loserIndex] >= 20 ? 1 : 0;
  return { forfeit: false, winner: winnerIndex + 1, games, points, totals };
}

function createLeague({ dataDir, now = Date.now, publicUrl = 'https://app.rdpsplace.me' }) {
  const db = new DatabaseSync(path.join(dataDir, 'racquetball.db'));
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;');
  const columns = db.prepare('PRAGMA table_info(league_schedule)').all().map(column => column.name);
  for (const [name, definition] of [
    ['player1', 'TEXT'], ['player2', 'TEXT'], ['season', `TEXT NOT NULL DEFAULT '${SEASON}'`],
    ['result', 'TEXT'], ['result_status', "TEXT NOT NULL DEFAULT 'scheduled'"], ['revision', 'INTEGER NOT NULL DEFAULT 0']
  ]) if (!columns.includes(name)) db.exec(`ALTER TABLE league_schedule ADD COLUMN ${name} ${definition}`);
  db.exec(`CREATE TABLE IF NOT EXISTS league_requests (
    id TEXT PRIMARY KEY, match_id TEXT NOT NULL, type TEXT NOT NULL, requester TEXT NOT NULL,
    recipient TEXT NOT NULL, payload TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
    revision INTEGER NOT NULL, expires_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
  );
  CREATE TABLE IF NOT EXISTS league_mail (
    id TEXT PRIMARY KEY, request_id TEXT NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL,
    text TEXT NOT NULL, html TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, sent_at TEXT
  );
  CREATE TABLE IF NOT EXISTS league_sessions (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL);`);
  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  const escape = text => String(text).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const player = email => db.prepare('SELECT * FROM website_players WHERE email=?').get(email);
  function match(id) {
    const entry = db.prepare('SELECT * FROM league_schedule WHERE id=?').get(id);
    if (!entry || entry.kind !== 'match') throw new LeagueError('Scheduled match not found.');
    return entry;
  }
  function participant(entry, email) {
    if (!entry.player1 || !entry.player2 || ![entry.player1, entry.player2].includes(email)) throw new LeagueError('You can only manage matches you are scheduled to play.');
  }
  function logIn(payload = {}) {
    const email = String(payload?.email || '').trim().toLowerCase();
    if (!payload || typeof payload.pin !== 'string' || !/^\d{4}$/.test(payload.pin)) throw new LeagueError('Email or PIN was not accepted.');
    const member = player(email);
    if (!member?.pin_hash || !member.pin_salt) throw new LeagueError('Email or PIN was not accepted. New registrations may still be uploading.');
    if (member.locked_until > now()) throw new LeagueError('Too many attempts. Try again in one minute.');
    const candidate = crypto.scryptSync(payload.pin, member.pin_salt, 64);
    if (!crypto.timingSafeEqual(candidate, Buffer.from(member.pin_hash, 'hex'))) {
      const attempts = member.locked_until ? 1 : member.failed_attempts + 1;
      db.prepare('UPDATE website_players SET failed_attempts=?,locked_until=? WHERE email=?').run(attempts, attempts >= 5 ? now() + 60000 : 0, email);
      throw new LeagueError(attempts >= 5 ? 'Too many attempts. Try again in one minute.' : 'Email or PIN was not accepted.');
    }
    db.prepare('UPDATE website_players SET failed_attempts=0,locked_until=0 WHERE email=?').run(email);
    db.prepare('DELETE FROM league_sessions WHERE expires_at < ?').run(now());
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO league_sessions VALUES (?,?,?)').run(hash(token), email, now() + 30 * 60000);
    return { success: true, token, member: { fullName: member.full_name, email } };
  }
  function session(token) {
    if (typeof token !== 'string') return null;
    return db.prepare('SELECT email FROM league_sessions WHERE token_hash=? AND expires_at>?').get(hash(token), now())?.email || null;
  }
  function logOut(token) { if (typeof token === 'string') db.prepare('DELETE FROM league_sessions WHERE token_hash=?').run(hash(token)); }
  function publicMatch(entry) {
    const expiredScore = entry.result_status === 'pending' &&
      !db.prepare("SELECT 1 FROM league_requests WHERE match_id=? AND revision=? AND status='pending' AND expires_at>?").get(entry.id, entry.revision, now());
    return {
      id: entry.id, title: entry.title, kind: entry.kind, date: entry.date, startTime: entry.start_time, endTime: entry.end_time,
      location: entry.location, notes: entry.notes, season: entry.season, status: expiredScore ? 'scheduled' : entry.result_status,
      player1Name: player(entry.player1)?.full_name || null, player2Name: player(entry.player2)?.full_name || null,
      result: entry.result_status === 'confirmed' && entry.result ? JSON.parse(entry.result) : null
    };
  }
  function schedule(month) {
    return db.prepare('SELECT * FROM league_schedule WHERE date>=? AND date<? ORDER BY date,start_time,id').all(`${month}-01`, `${month}-32`).map(publicMatch);
  }
  function myMatches(email) {
    return db.prepare('SELECT * FROM league_schedule WHERE player1=? OR player2=? ORDER BY date,start_time').all(email, email).map(entry => ({
      ...publicMatch(entry), mySide: entry.player1 === email ? 1 : 2,
      pending: db.prepare("SELECT id,type,payload,expires_at,requester,recipient,status FROM league_requests WHERE match_id=? AND revision=? AND status IN ('pending','disputed') ORDER BY rowid DESC")
        .all(entry.id, entry.revision).map(request => ({
          id: request.id, type: request.type, payload: JSON.parse(request.payload), status: request.expires_at <= now() && request.status === 'pending' ? 'expired' : request.status,
          canRespond: request.recipient === email && request.status === 'pending' && request.expires_at > now()
        }))
    }));
  }
  function conflicts(entry, slot) {
    const existing = db.prepare(`SELECT * FROM league_schedule WHERE id!=? AND date=? AND start_time<? AND end_time>?`).all(entry.id, slot.date, slot.endTime, slot.startTime);
    if (existing.some(other => (entry.location && other.location.toLowerCase() === entry.location.toLowerCase()) ||
        [entry.player1, entry.player2].filter(Boolean).some(email => [other.player1, other.player2].includes(email)))) {
      throw new LeagueError('That time conflicts with another booking for a player or the same court.');
    }
  }
  function validSlot(slot) {
    if (!slot || typeof slot.date !== 'string' || !/^(20\d{2}|2100)-\d{2}-\d{2}$/.test(slot.date) ||
        !Number.isFinite(Date.parse(`${slot.date}T00:00:00Z`)) || new Date(`${slot.date}T00:00:00Z`).toISOString().slice(0, 10) !== slot.date ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.endTime) || slot.endTime <= slot.startTime) {
      throw new LeagueError('Enter a valid date and start/end times on the same day in Eastern Time.');
    }
    return { date: slot.date, startTime: slot.startTime, endTime: slot.endTime };
  }
  function saveSchedule(payload, id, updating = false) {
    return transaction(() => {
      const old = updating ? db.prepare('SELECT * FROM league_schedule WHERE id=?').get(id) : null;
      if (updating && !old) throw new LeagueError('Schedule entry not found.');
      const slot = validSlot(payload);
      for (const [field, limit] of [['title', 120], ['location', 160], ['notes', 1000]]) {
        const value = payload[field] ?? '';
        if (typeof value !== 'string' || value.length > limit || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw new LeagueError(`Invalid ${field}.`);
      }
      if (!payload.title?.trim() || !['match', 'practice', 'event'].includes(payload.kind)) throw new LeagueError('Enter a title and valid event type.');
      const entry = { id: id || crypto.randomUUID(), player1: payload.player1 || null, player2: payload.player2 || null, location: (payload.location || '').trim() };
      if (payload.kind === 'match' && (!entry.player1 || !entry.player2 || entry.player1 === entry.player2 || !player(entry.player1) || !player(entry.player2))) throw new LeagueError('Choose two different registered players for a match.');
      if (payload.kind !== 'match') { entry.player1 = null; entry.player2 = null; }
      if (old?.result_status === 'confirmed' && (old.player1 !== entry.player1 || old.player2 !== entry.player2 || old.kind !== payload.kind)) throw new LeagueError('Cannot change players or type on a confirmed match. Correct its result first.');
      conflicts(entry, slot);
      if (old) {
        db.prepare(`UPDATE league_schedule SET title=?,kind=?,date=?,start_time=?,end_time=?,location=?,notes=?,player1=?,player2=?,revision=revision+1,
          result_status=CASE WHEN result_status='confirmed' THEN 'confirmed' ELSE 'scheduled' END WHERE id=?`)
          .run(payload.title.trim(), payload.kind, slot.date, slot.startTime, slot.endTime, entry.location, (payload.notes || '').trim(), entry.player1, entry.player2, entry.id);
        invalidate(entry.id);
      } else db.prepare(`INSERT INTO league_schedule(id,title,kind,date,start_time,end_time,location,notes,player1,player2,season) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
        .run(entry.id, payload.title.trim(), payload.kind, slot.date, slot.startTime, slot.endTime, entry.location, (payload.notes || '').trim(), entry.player1, entry.player2, SEASON);
      return { success: true, event: publicMatch(db.prepare('SELECT * FROM league_schedule WHERE id=?').get(entry.id)) };
    });
  }
  function invalidate(id) {
    db.prepare("UPDATE league_requests SET status='superseded' WHERE match_id=? AND status IN ('pending','disputed')").run(id);
  }
  function deleteSchedule(id) {
    return transaction(() => {
      if (!db.prepare('DELETE FROM league_schedule WHERE id=?').run(id).changes) throw new LeagueError('Schedule entry not found.');
      invalidate(id);
      return { success: true };
    });
  }
  function createRequest(entry, email, type, payload) {
    const recipient = entry.player1 === email ? entry.player2 : entry.player1;
    const token = crypto.randomBytes(32).toString('hex'), id = crypto.randomUUID();
    const expires = now() + TOKEN_TTL;
    db.prepare(`INSERT INTO league_requests(id,match_id,type,requester,recipient,payload,token_hash,revision,expires_at) VALUES(?,?,?,?,?,?,?,?,?)`)
      .run(id, entry.id, type, email, recipient, JSON.stringify(payload), hash(token), entry.revision, expires);
    const link = `${publicUrl}/racquetball/confirm#${token}`;
    const heading = type === 'score' ? 'Confirm Racquetball score' : 'Respond to Racquetball rescheduling';
    const details = type === 'score' ? `${player(entry.player1).full_name} vs ${player(entry.player2).full_name}\n${payload.forfeit ? `Forfeit; winner: ${player(payload.winner === 1 ? entry.player1 : entry.player2).full_name}` : payload.games.map((game, index) => `Game ${index + 1}: ${game[0]} - ${game[1]}`).join('\n')}`
      : payload.options.map(slot => `${slot.date}: ${slot.startTime} - ${slot.endTime} Eastern Time`).join('\n');
    const text = `${player(email).full_name} sent a request for "${entry.title}".\n${details}\n\nReview and confirm or decline: ${link}\nExpires in 7 days. Nothing changes until you explicitly confirm on the website.`;
    db.prepare('INSERT INTO league_mail(id,request_id,recipient,subject,text,html) VALUES(?,?,?,?,?,?)')
      .run(crypto.randomUUID(), id, recipient, heading, text, `<p>${escape(text).replace(/\n/g, '<br>')}</p><p><a href="${escape(link)}">${heading}</a></p>`);
    return { success: true, requestId: id, emailStatus: 'queued', message: 'Request saved. The opponent confirmation email is queued for delivery.' };
  }
  function submitScore(id, email, input) {
    const result = scoreResult(input);
    return transaction(() => {
      const entry = match(id); participant(entry, email);
      if (['confirmed', 'disputed'].includes(entry.result_status)) throw new LeagueError('This result is confirmed or disputed; an administrator must resolve changes.');
      const pending = db.prepare("SELECT 1 FROM league_requests WHERE match_id=? AND status='pending' AND expires_at>?").get(id, now());
      if (pending) throw new LeagueError('Wait for the existing score or rescheduling request to be resolved.');
      invalidate(id);
      db.prepare("UPDATE league_schedule SET result_status='pending' WHERE id=?").run(id);
      return createRequest(entry, email, 'score', result);
    });
  }
  function propose(id, email, input) {
    return transaction(() => {
      const entry = match(id); participant(entry, email);
      if (entry.result_status === 'pending' && !db.prepare("SELECT 1 FROM league_requests WHERE match_id=? AND status='pending' AND expires_at>?").get(id, now())) {
        db.prepare("UPDATE league_schedule SET result_status='scheduled' WHERE id=?").run(id);
        entry.result_status = 'scheduled';
      }
      if (entry.result_status !== 'scheduled') throw new LeagueError('Only unplayed scheduled matches can be rescheduled.');
      if (!Array.isArray(input?.options) || !input.options.length || input.options.length > 3) throw new LeagueError('Suggest one to three alternatives.');
      const options = input.options.map(validSlot);
      if (new Set(options.map(slot => JSON.stringify(slot))).size !== options.length) throw new LeagueError('Choose different alternatives.');
      options.forEach(slot => conflicts(entry, slot));
      if (db.prepare("SELECT 1 FROM league_requests WHERE match_id=? AND status='pending' AND expires_at>?").get(id, now())) throw new LeagueError('A request is already awaiting your opponent.');
      invalidate(id);
      return createRequest(entry, email, 'reschedule', { options });
    });
  }
  function getRequest(token, requestId, email) {
    const request = token ? db.prepare('SELECT * FROM league_requests WHERE token_hash=?').get(hash(token)) :
      db.prepare('SELECT * FROM league_requests WHERE id=? AND recipient=?').get(requestId, email);
    if (!request || request.status !== 'pending' || request.expires_at <= now()) throw new LeagueError('This confirmation link is invalid, expired, or already used.');
    const entry = match(request.match_id);
    if (entry.revision !== request.revision) throw new LeagueError('This request is no longer current.');
    return { request, entry };
  }
  function review(token) {
    const { request, entry } = getRequest(token);
    return { success: true, type: request.type, match: publicMatch(entry), payload: JSON.parse(request.payload), expiresAt: request.expires_at };
  }
  function respond({ token, requestId, email, decision, option }) {
    if (!['approve', 'decline'].includes(decision)) throw new LeagueError('Choose approve or decline.');
    return transaction(() => {
      const { request, entry } = getRequest(token, requestId, email);
      const payload = JSON.parse(request.payload);
      if (decision === 'approve') {
        if (request.type === 'score') {
          db.prepare("UPDATE league_schedule SET result=?,result_status='confirmed',revision=revision+1 WHERE id=?").run(JSON.stringify(payload), entry.id);
        } else {
          if (!Number.isInteger(option) || !payload.options[option]) throw new LeagueError('Choose one proposed time.');
          const slot = payload.options[option]; conflicts(entry, slot);
          db.prepare('UPDATE league_schedule SET date=?,start_time=?,end_time=?,revision=revision+1 WHERE id=?').run(slot.date, slot.startTime, slot.endTime, entry.id);
        }
      } else if (request.type === 'score') db.prepare("UPDATE league_schedule SET result_status='disputed' WHERE id=?").run(entry.id);
      db.prepare('UPDATE league_requests SET status=? WHERE id=?').run(decision === 'approve' ? 'approved' : request.type === 'score' ? 'disputed' : 'declined', request.id);
      return { success: true, message: decision === 'approve' ? 'Approved. The schedule and standings are updated.' : request.type === 'score' ? 'Score disputed. An administrator will resolve it.' : 'Rescheduling declined. The original time remains.' };
    });
  }
  function correctResult(id, input) {
    const result = input?.clear === true ? null : scoreResult(input);
    return transaction(() => {
      const entry = match(id);
      if (!entry.player1 || !entry.player2) throw new LeagueError('Assign both match players first.');
      db.prepare('UPDATE league_schedule SET result=?,result_status=?,revision=revision+1 WHERE id=?').run(result ? JSON.stringify(result) : null, result ? 'confirmed' : 'scheduled', id);
      invalidate(id);
      return { success: true };
    });
  }
  function standings() {
    const rows = new Map(db.prepare('SELECT email,full_name FROM website_players').all().map(member => [member.email, {
      name: member.full_name, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0, differential: 0
    }]));
    for (const entry of db.prepare("SELECT * FROM league_schedule WHERE season=? AND result_status='confirmed'").all(SEASON)) {
      const result = JSON.parse(entry.result);
      [entry.player1, entry.player2].forEach((email, index) => {
        const row = rows.get(email); if (!row) return;
        row.played++; row.wins += result.winner === index + 1 ? 1 : 0; row.losses += result.winner === index + 1 ? 0 : 1;
        row.points += result.points[index]; row.scored += result.totals[index]; row.conceded += result.totals[1 - index];
        row.differential = row.scored - row.conceded;
      });
    }
    const sorted = [...rows.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || b.differential - a.differential || a.name.localeCompare(b.name));
    sorted.forEach((row, index) => {
      const previous = sorted[index - 1];
      row.rank = previous && row.points === previous.points && row.wins === previous.wins && row.differential === previous.differential ? previous.rank : index + 1;
    });
    return { success: true, season: SEASON, standings: sorted };
  }
  function adminMatches() {
    return db.prepare("SELECT * FROM league_schedule WHERE kind='match' ORDER BY date,start_time").all().map(entry => ({
      ...publicMatch(entry), player1: entry.player1, player2: entry.player2,
      requests: db.prepare("SELECT type,payload,status FROM league_requests WHERE match_id=? AND status IN ('pending','disputed')").all(entry.id).map(row => ({ ...row, payload: JSON.parse(row.payload) }))
    }));
  }
  function adminSchedule(month) {
    return db.prepare('SELECT * FROM league_schedule WHERE date>=? AND date<? ORDER BY date,start_time').all(`${month}-01`, `${month}-32`)
      .map(entry => ({ ...publicMatch(entry), player1: entry.player1 || '', player2: entry.player2 || '' }));
  }
  function pendingMail() {
    return db.prepare(`SELECT m.* FROM league_mail m JOIN league_requests r ON m.request_id=r.id
      WHERE m.sent_at IS NULL AND r.status='pending' AND r.expires_at>? ORDER BY m.rowid LIMIT 20`).all(now());
  }
  function mailSent(id) { db.prepare('UPDATE league_mail SET sent_at=?,last_error=NULL WHERE id=?').run(new Date(now()).toISOString(), id); }
  function mailFailed(id, error) { db.prepare('UPDATE league_mail SET attempts=attempts+1,last_error=? WHERE id=?').run(String(error).slice(0, 500), id); }
  return { logIn, session, logOut, schedule, myMatches, saveSchedule, deleteSchedule, submitScore, propose, review, respond, correctResult, standings, adminMatches, adminSchedule, pendingMail, mailSent, mailFailed, close: () => db.close() };
}
module.exports = { createLeague, scoreResult, SEASON, LeagueError };
