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

    const settingsText = fs.readFileSync(admin.settingsPath, 'utf8');
    assert.ok(!settingsText.includes('3333') && !settingsText.includes('8642'), 'PINs must not be stored in plain text');

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

    console.log('✅ Security and migration regression tests passed');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

run();
