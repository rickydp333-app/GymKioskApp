'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'racquetball-kiosk-'));
const handlers = new Map();
const mainWindow = {};
const sender = { mainFrame: {} };
const event = { sender, senderFrame: sender.mainFrame };
let online = true, httpStatus = 200;
const calls = [];
const context = {
  fs, path, DATA_DIR: dataDir, mainWindow,
  racquetballStore: null, racquetballSync: null, leagueBridgeRegistered: false,
  isValidAdminSession: () => false, safeStorage: {}, adminSettings: { getKioskDeviceKey: () => '' },
  createRacquetballStore: () => ({}),
  createRacquetballSync: () => ({ start() {} }),
  BrowserWindow: { fromWebContents: contents => contents === sender ? mainWindow : null },
  ipcMain: { handle: (channel, handler) => {
    assert(!handlers.has(channel), 'league IPC registration must be idempotent');
    handlers.set(channel, handler);
  } },
  AbortSignal, Date, console: { error() {} },
  fetch: async (url, options) => {
    calls.push({ url, options });
    if (!online) throw new Error('offline');
    return { ok: httpStatus === 200, status: httpStatus,
      json: async () => httpStatus === 200 ? { success: true, events: [], standings: [] } : { error: 'Sign in again.' } };
  }
};
vm.createContext(context);
const source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
vm.runInContext(source.slice(source.indexOf('function initializeRacquetball()')), context);

async function run() {
  context.initializeRacquetball();
  context.initializeRacquetball();
  const request = handlers.get('racquetball-league-request');
  assert.equal((await request({ sender: {} }, { path: '/api/racquetball/standings' })).success, false);
  assert.equal((await request({ sender, senderFrame: {} }, { path: '/api/racquetball/standings' })).success, false);
  for (const invalid of ['/api/admin/racquetball/players', '//example.com', '/api/racquetball/standings?redirect=1']) {
    assert.equal((await request(event, { path: invalid })).success, false);
  }
  assert.equal(calls.length, 0);
  const standings = { path: '/api/racquetball/standings' };
  assert.equal((await request(event, standings)).success, true);
  assert.equal(calls[0].url, 'https://app.rdpsplace.me/api/racquetball/standings');
  online = false;
  const offline = await request(event, standings);
  assert.equal(offline.cached, true);
  assert(Number.isFinite(Date.parse(offline.cachedAt)));
  assert.equal((await request(event, { path: '/api/racquetball/schedule?month=2026-12' })).success, false);
  assert.equal((await request(event, { path: '/api/racquetball/my-matches' })).success, false);
  assert.equal((await request(event, { path: '/api/racquetball/login', method: 'POST', body: { email: 'test@example.com', pin: '0042' } })).success, false);
  assert(!fs.readFileSync(path.join(dataDir, 'league-public-cache.json'), 'utf8').includes('0042'));
  online = true; httpStatus = 401;
  assert.equal((await request(event, { path: '/api/racquetball/my-matches' })).status, 401);
  httpStatus = 200;
  for (let month = 1; month <= 12; month++) {
    for (const year of [2026, 2027, 2028]) {
      await request(event, { path: `/api/racquetball/schedule?month=${year}-${String(month).padStart(2, '0')}` });
    }
  }
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(path.join(dataDir, 'league-public-cache.json')))).length, 25);
  console.log('PASS: repeated kiosk initialization, authorized IPC, HTTPS origin, public-only offline cache, expiry status and cache limit');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => fs.rmSync(dataDir, { recursive: true, force: true }));
