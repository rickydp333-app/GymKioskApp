'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { resolveAdminProfile } = require('../lib/admin-profile');
const { registerUserPinVault } = require('../lib/user-pin-vault');
const { createPersistentStore } = require('../lib/persistent-store');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-release-test-'));
try {
  const old = path.join(root, 'temp', 'GymKioskApp', 'session-admin');
  fs.mkdirSync(old, { recursive: true });
  fs.writeFileSync(path.join(old, 'profile-test'), 'existing-profile');
  const migrated = resolveAdminProfile(path.join(root, 'appdata'), path.join(root, 'temp'));
  assert.equal(fs.readFileSync(path.join(migrated, 'profile-test'), 'utf8'), 'existing-profile');
  fs.writeFileSync(path.join(old, 'profile-test'), 'stale-profile');
  resolveAdminProfile(path.join(root, 'appdata'), path.join(root, 'temp'));
  assert.equal(fs.readFileSync(path.join(migrated, 'profile-test'), 'utf8'), 'existing-profile');
  assert(fs.existsSync(old), 'legacy profile must remain available');
  const handlers = {};
  registerUserPinVault({ ipcMain: { handle: (name, fn) => { handlers[name] = fn; } },
    safeStorage: { isEncryptionAvailable: () => true, encryptString: value => Buffer.from(value), decryptString: value => value.toString() },
    isAdmin: token => token === 'authorized' });
  const encrypted = handlers['user-pin-protect']({}, '0042');
  assert.equal(handlers['admin-user-pin-reveal']({}, { token: 'authorized', encrypted }).pin, '0042');
  assert.equal(handlers['admin-user-pin-reveal']({}, { token: 'expired', encrypted }).success, false);
  for (const config of ['admin-builder.json', 'kiosk-builder.json']) {
    const c = require('../' + config);
    assert(c.files.includes('!data/**/*'), 'must not ship live development data');
    assert.equal(c.nsis.deleteAppDataOnUninstall, false);
    assert(c.files.includes('screensaver-tutorial.html'));
  }
  const sourceDataDir = path.join(root, 'empty-source');
  fs.mkdirSync(sourceDataDir);
  const opts = { dataDir: path.join(root, 'data'), sourceDataDir };
  let store = createPersistentStore(opts);
  const users = store.readMap('users');
  assert.equal(users.size, 0, 'a clean install must not copy developer users');
  users.set('test-member', { username: 'test-member', favorite: 'kept' });
  store.writeMap('users', users);
  store.close();
  store = createPersistentStore(opts);
  assert.equal(store.readMap('users').get('test-member').favorite, 'kept');
  store.close();
  const releaseSource = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'release-install-set.cjs'), 'utf8');
  const verifyStart = releaseSource.indexOf('function verifyPackagedApp(');
  const verifyEnd = releaseSource.indexOf('\nfunction cleanTargetBuildArtifacts(', verifyStart);
  const packageFiles = ['/server.js', '/js/data/exercises.js', '/mobile/viewer.html', '/screensaver-tutorial.html', '/js/kiosk-tutorial.js', '/css/kiosk-tutorial.css', '/lib/user-pin-vault.js', '/assets/branding/logo.png', '/main.js'];
  for (let index = 0; index < 97; index++) packageFiles.push(`/assets/stretches/test-${index}.png`);
  let wrongSource = false;
  let packagedVersion = require('../package.json').version;
  const verifierContext = {
    repoRoot: '/test-source', version: packagedVersion, path,
    fs: { existsSync: () => true, readFileSync: () => Buffer.from('current-source') },
    asar: {
      listPackage: () => packageFiles,
      extractFile: (_archive, name) => name === 'package.json'
        ? Buffer.from(JSON.stringify({ version: packagedVersion }))
        : Buffer.from(wrongSource ? 'stale-source' : 'current-source')
    }
  };
  vm.createContext(verifierContext);
  vm.runInContext(releaseSource.slice(verifyStart, verifyEnd), verifierContext);
  const target = { name: 'kiosk', label: 'Kiosk', outputDir: '/test-output' };
  assert.equal(verifierContext.verifyPackagedApp(target).verifiedSourceFiles, 11);
  wrongSource = true;
  assert.throws(() => verifierContext.verifyPackagedApp(target), /does not match current source/);
  wrongSource = false;
  packageFiles.push('/data/users.json');
  assert.throws(() => verifierContext.verifyPackagedApp(target), /development data/);
  packageFiles.pop();
  packagedVersion = '0.0.0';
  assert.throws(() => verifierContext.verifyPackagedApp(target), /incorrect version/);
  console.log('PASS: profile migration, preserved data on reopen, clean new install, authorized PIN reveal, package safeguards');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
