'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { createRacquetballStore } = require('../lib/racquetball-store');
const { createRacquetballSync } = require('../lib/racquetball-sync');
const { createPersistentStore } = require('../lib/persistent-store');
const { hashPin } = require('../lib/admin-settings');

const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-racquetball-admin-'));
const deviceKey = 'b'.repeat(64);
const password = 'test-only-password-123';
const quietLogger = { warn() {}, error() {} };
let server;
let local;
let base;
let serverOutput = '';

function availablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function startServer() {
  server = spawn(process.execPath, [path.join(root, 'server.js')], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env, PORT: new URL(base).port,
      GYMKIOSK_DATA_DIR: path.join(temp, 'website'),
      GYMKIOSK_DEVICE_KEY: deviceKey,
      GYMKIOSK_RACQUETBALL_ADMIN_EMAILS: 'admin@example.com,reserved@example.com',
      GYMKIOSK_SYNC_URL: '', GYMKIOSK_SYNC_KEY: '', ALERT_EMAIL_ENABLED: '0'
    }
  });
  server.stdout.on('data', data => { serverOutput += data; });
  server.stderr.on('data', data => { serverOutput += data; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Server exited: ${serverOutput}`);
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch (error) {
      if (error.name !== 'TypeError') throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Server startup timed out: ${serverOutput}`);
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  const exited = new Promise(resolve => server.once('exit', resolve));
  server.kill();
  await exited;
}

async function account(email, operation = 'register') {
  const response = await fetch(`${base}/api/auth/${operation}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  assert.equal(response.status, 200);
  return (await response.json()).sessionId;
}

async function list(token) {
  return fetch(`${base}/api/admin/racquetball/players`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

async function run() {
  local = createRacquetballStore({ dataDir: path.join(temp, 'kiosk') });
  const registration = { fullName: 'Rick <script>', email: 'PLAYER@EXAMPLE.COM', phone: '519-555-0123', pin: '0042' };
  const member = local.signUp(registration).member;
  assert(member);
  assert.equal(local.pendingPlayers().length, 1);
  const outbound = JSON.stringify(local.pendingPlayers());
  assert(outbound.includes('pinHash') && !outbound.includes('0042') && !outbound.includes('"pin":'), 'uploads may include salted verification hashes, never plaintext PINs');
  local.close();
  local = createRacquetballStore({ dataDir: path.join(temp, 'kiosk') });
  assert.equal(local.pendingPlayers().length, 1, 'offline queue must survive restart');

  let sync = createRacquetballSync({ store: local, getDeviceKey: () => null, logger: quietLogger });
  assert.equal(await sync.flush(), 'not-configured');
  sync = createRacquetballSync({
    store: local, getDeviceKey: () => deviceKey, logger: quietLogger,
    request: async () => { throw new Error('offline'); }
  });
  assert.equal(await sync.flush(), 'offline-queued');
  assert.equal(local.pendingPlayers().length, 1);
  sync = createRacquetballSync({
    store: local, getDeviceKey: () => deviceKey, logger: quietLogger,
    request: async () => ({ ok: true, json: async () => ({ success: true, acceptedIds: [] }) })
  });
  assert.equal(await sync.flush(), 'offline-queued', 'an unconfirmed upload must stay queued');
  assert.equal(local.pendingPlayers().length, 1);

  // Import all-or-nothing validation must not partially add a valid batch.
  const receiver = createRacquetballStore({ dataDir: path.join(temp, 'receiver') });
  assert.equal(receiver.receivePlayers([...local.pendingPlayers(), { invalid: true }]).success, false);
  assert.equal(receiver.websitePlayers().length, 0);
  receiver.close();

  base = `http://127.0.0.1:${await availablePort()}`;
  const website = createPersistentStore({ dataDir: path.join(temp, 'website'), sourceDataDir: path.join(temp, 'empty-legacy') });
  const passwordRecord = hashPin(password);
  website.writeMap('users', new Map([['test-admin-account', {
    email: 'admin@example.com', passwordSalt: passwordRecord.salt, passwordHash: passwordRecord.hash, workouts: []
  }]]));
  website.close();
  await startServer();
  assert.equal((await list()).status, 401);
  assert.equal((await list('fake')).status, 401);
  const reserved = await fetch(`${base}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'reserved@example.com', password })
  });
  assert.equal(reserved.status, 403, 'public registration must not claim a reserved administrator identity');
  const admin = await account('admin@example.com', 'login');
  const ordinary = await account('ordinary@example.com');
  assert.equal((await list(ordinary)).status, 403);
  for (const supplied of ['', 'bad-key']) {
    const response = await fetch(`${base}/api/racquetball/players/sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gymkiosk-key': supplied },
      body: JSON.stringify({ players: local.pendingPlayers() })
    });
    assert.equal(response.status, 401, 'even loopback imports must require the correct device key');
  }
  const invalid = await fetch(`${base}/api/racquetball/players/sync`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gymkiosk-key': deviceKey },
    body: JSON.stringify({ players: [{ bad: true }] })
  });
  assert.equal(invalid.status, 400);
  const sent = local.pendingPlayers();
  sync = createRacquetballSync({
    store: local, getDeviceKey: () => deviceKey, logger: quietLogger,
    endpoint: `${base}/api/racquetball/players/sync`
  });
  assert.equal(await sync.flush(), 'up-to-date');
  assert.equal(local.pendingPlayers().length, 0);
  let response = await list(admin);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  let result = await response.json();
  assert.equal(result.players.length, 1);
  assert.deepEqual(Object.keys(result.players[0]).sort(), ['createdAt', 'email', 'fullName', 'phone']);
  assert.equal(result.players[0].email, 'player@example.com');
  assert.equal(result.players[0].fullName, registration.fullName);
  assert.equal(result.players[0].phone, registration.phone);
  assert(Number.isFinite(Date.parse(result.players[0].createdAt)));
  const retry = await fetch(`${base}/api/racquetball/players/sync`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gymkiosk-key': deviceKey },
    body: JSON.stringify({ players: sent })
  });
  assert.deepEqual((await retry.json()).acceptedIds, [member.id]);
  assert.equal((await (await list(admin)).json()).players.length, 1, 'retries must not duplicate players');
  const page = await fetch(`${base}/admin/racquetball`);
  assert.equal(page.status, 200);
  assert(!(await page.text()).includes('player@example.com'), 'public page markup must not embed contacts');

  const scheduleUrl = `${base}/api/admin/racquetball/schedule`;
  const event = { title: 'League event <script>', kind: 'event', date: '2028-02-29', startTime: '18:00', endTime: '19:00', location: 'Court 1', notes: 'Public event details.' };
  async function mutate(method, token, payload = event, id = '') {
    return fetch(`${scheduleUrl}${id ? `/${id}` : ''}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(method !== 'DELETE' ? { body: JSON.stringify(payload) } : {})
    });
  }
  for (const method of ['POST', 'PUT', 'DELETE']) {
    assert.equal((await mutate(method, null, event, method === 'POST' ? '' : 'unknown')).status, 401);
    assert.equal((await mutate(method, ordinary, event, method === 'POST' ? '' : 'unknown')).status, 403);
  }
  for (const invalidEvent of [
    { ...event, title: '' }, { ...event, kind: 'invalid' }, { ...event, date: '2027-02-29' },
    { ...event, startTime: '24:00' }, { ...event, endTime: '17:00' },
    { ...event, endTime: '18:00' }, { ...event, notes: 'x'.repeat(1001) }
  ]) assert.equal((await mutate('POST', admin, invalidEvent)).status, 400);
  response = await fetch(`${base}/api/racquetball/schedule?month=2028-02`);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).events, [], 'calendar must start empty');
  response = await mutate('POST', admin);
  assert.equal(response.status, 201);
  const scheduleId = (await response.json()).event.id;
  response = await fetch(`${base}/api/racquetball/schedule?month=2028-02`);
  result = await response.json();
  assert.equal(result.timeZone, 'America/Toronto');
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].startTime, '18:00', 'times must remain Eastern wall-clock times');
  assert.equal(JSON.stringify(result).includes('player@example.com'), false, 'public schedule must not reveal player contacts');
  for (const month of ['2028-13', '2027-00', 'bad', '1999-12']) {
    assert.equal((await fetch(`${base}/api/racquetball/schedule?month=${month}`)).status, 400);
  }
  const publicPage = await fetch(`${base}/racquetball`);
  assert.equal(publicPage.status, 200);
  assert((await publicPage.text()).includes('Racquetball Schedule'));

  await stopServer();
  await startServer();
  assert.equal((await list(admin)).status, 401, 'old sessions must not work after restart');
  const newAdmin = await account('admin@example.com', 'login');
  response = await list(newAdmin);
  assert.equal((await response.json()).players.length, 1, 'website players must survive restart');
  response = await fetch(`${base}/api/racquetball/schedule?month=2028-02`);
  assert.equal((await response.json()).events.length, 1, 'schedule must survive server restart');
  assert.equal((await mutate('PUT', newAdmin, { ...event, date: '2028-03-01', title: 'Practice', kind: 'practice' }, scheduleId)).status, 200);
  assert.equal((await (await fetch(`${base}/api/racquetball/schedule?month=2028-02`)).json()).events.length, 0);
  assert.equal((await (await fetch(`${base}/api/racquetball/schedule?month=2028-03`)).json()).events[0].title, 'Practice');
  assert.equal((await mutate('DELETE', newAdmin, null, scheduleId)).status, 200);
  assert.equal((await mutate('DELETE', newAdmin, null, scheduleId)).status, 400);
  assert.equal((await mutate('PUT', newAdmin, event, scheduleId)).status, 400);
  assert.equal((await (await fetch(`${base}/api/racquetball/schedule?month=2028-03`)).json()).events.length, 0);
  local.close();
  local = createRacquetballStore({ dataDir: path.join(temp, 'kiosk') });
  assert.equal(local.pendingPlayers().length, 0, 'acknowledged players must not be requeued on restart');

  const { DatabaseSync } = require('node:sqlite');
  local.close();
  local = null;
  const database = new DatabaseSync(path.join(temp, 'kiosk', 'racquetball.db'));
  database.exec('DROP TABLE player_sync');
  database.close();
  local = createRacquetballStore({ dataDir: path.join(temp, 'kiosk') });
  assert.equal(local.pendingPlayers().length, 1, 'existing players must be queued when adding the sync feature');
  console.log('PASS: offline player sync, protected admin contacts, public Eastern calendar, authorized schedule CRUD, validation and persistence');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await stopServer();
  local?.close();
  fs.rmSync(temp, { recursive: true, force: true });
});
