'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createAdminSettings } = require('../lib/admin-settings');
const { createPersistentStore } = require('../lib/persistent-store');

const ROOT = path.resolve(__dirname, '..');

function run() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gymkiosk-security-'));
  try {
    const admin = createAdminSettings(path.join(tempRoot, 'settings'));
    assert.strictEqual(admin.validate('3333'), true, 'initial administrator PIN should be 3333');
    assert.strictEqual(admin.validate('1234'), false, 'incorrect administrator PIN should fail');
    assert.strictEqual(admin.change('3333', '8642').success, true, 'administrator PIN should be changeable');
    assert.strictEqual(admin.validate('3333'), false, 'old administrator PIN should stop working');
    assert.strictEqual(admin.validate('8642'), true, 'new administrator PIN should work');

    const encryptedValues = new Map();
    const safeStorage = {
      isEncryptionAvailable: () => true,
      encryptString: value => { const encrypted = Buffer.from(value).toString('base64'); encryptedValues.set(encrypted, value); return Buffer.from(encrypted); },
      decryptString: value => encryptedValues.get(value.toString())
    };
    const deviceKey = 'a'.repeat(64);
    assert.strictEqual(admin.setKioskDeviceKey('not-a-key', safeStorage).success, false, 'invalid kiosk device keys should be rejected');
    assert.strictEqual(admin.setKioskDeviceKey(deviceKey, safeStorage).success, true, 'valid device keys should be saved');
    assert.strictEqual(admin.getKioskDeviceKey(safeStorage), deviceKey, 'saved kiosk key should decrypt for main-process use');

    const settingsText = fs.readFileSync(admin.settingsPath, 'utf8');
    assert.ok(!settingsText.includes('3333') && !settingsText.includes('8642'), 'PINs must not be stored in plain text');
    assert.ok(!settingsText.includes(deviceKey), 'kiosk device key must be encrypted at rest');

    const store = createPersistentStore({ dataDir: path.join(tempRoot, 'data'), sourceDataDir: path.join(ROOT, 'data') });
    assert.ok(fs.existsSync(store.databasePath), 'SQLite database should be created');
    assert.ok(store.readMap('users').size >= 0, 'legacy users should be readable after migration');
    store.enqueueSync('security.test', { ok: true });
    assert.strictEqual(store.pendingSync().length, 1, 'offline sync event should be queued');
    store.close();

    const authSource = fs.readFileSync(path.join(ROOT, 'js', 'auth.js'), 'utf8');
    assert.ok(!/ADMIN_CODE\s*=/.test(authSource), 'administrator PIN must not be embedded in browser code');
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(!/Face Login|Face Recognition|Voice Recognition|Preferred Speaker Output/i.test(html), 'biometric controls must not appear in menus');

    const serverSource = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
    assert.match(serverSource, /app\.set\('trust proxy',\s*TRUST_PROXY_HOPS\)/, 'proxy trust should be explicitly configured');
    assert.match(serverSource, /function getRequestClientKey\(req\)\s*\{\s*return req\.ip/, 'rate limiting should use Express-resolved client identity');
    assert.ok(!serverSource.includes("req.headers['x-forwarded-for']"), 'rate limiting must not trust a caller-supplied forwarded header directly');
    assert.match(serverSource, /function saveCollections\(res, \.\.\.saveFunctions\)[\s\S]*res\.status\(500\)/, 'persistence failures should return an API error');
    assert.ok(serverSource.includes('saveCollections(res, saveWorkouts'), 'workout writes should check persistence results');

    const mainSource = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
    const preloadSource = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
    const uiSource = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
    assert.ok(mainSource.includes("ipcMain.handle('admin-save-kiosk-device-key'"), 'device key updates should require main-process admin authorization');
    assert.ok(mainSource.includes("ipcMain.handle('kiosk-create-qr-workout'"), 'QR workout creation should use main-process IPC');
    assert.ok(mainSource.includes("'x-gymkiosk-key': key"), 'only the main process should send the kiosk device key');
    assert.ok(mainSource.includes('analyticsSyncToken: payload.analyticsSyncToken'), 'the per-export analytics token should reach the server');
    assert.ok(preloadSource.includes("invoke('kiosk-create-qr-workout', payload)"), 'preload should expose the QR export IPC');
    assert.ok(!uiSource.includes("'x-gymkiosk-key'"), 'renderer code must not handle the kiosk device key');
    const renderConfig = fs.readFileSync(path.join(ROOT, 'render.yaml'), 'utf8');
    assert.match(renderConfig, /key:\s*GYMKIOSK_DEVICE_KEY[\s\S]{0,80}generateValue:\s*true/, 'Render should generate the kiosk device key instead of storing it in source');
    assert.ok(!renderConfig.includes('REPLACE_WITH_A_RANDOM_64_CHARACTER_HEX_KEY'), 'Render must not deploy a placeholder device key');

    console.log('✅ Security and migration regression tests passed');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

run();
