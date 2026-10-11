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
    assert(c.files.includes('!**/*MacBook Pro*'), 'must not ship stale MacBook-named duplicates');
    assert.equal(c.nsis.deleteAppDataOnUninstall, false);
    assert(c.files.includes('screensaver-tutorial.html'));
  }
  const renderConfig = fs.readFileSync(path.join(__dirname, '..', 'render.yaml'), 'utf8');
  assert.match(renderConfig, /key:\s*GYMKIOSK_DEVICE_KEY[\s\S]{0,80}generateValue:\s*true/, 'Render should generate the kiosk device key instead of storing it in source');
  assert.ok(!renderConfig.includes('REPLACE_WITH_A_RANDOM_64_CHARACTER_HEX_KEY'), 'Render Blueprint must not deploy a placeholder device key');
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
  assert(/'--publish',\s*'never'/.test(releaseSource), 'builder must not publish unverified CI installers automatically');
  assert.match(releaseSource, /Compress-Archive[\s\S]*-ErrorAction Stop/, 'archive compression errors must stop the release build');
  assert.match(releaseSource, /spawnSync\('tar\.exe', \['-tf', zipPath\]/, 'release ZIP must pass an archive integrity check');
  const verifyStart = releaseSource.indexOf('function verifyPackagedApp(');
  const verifyEnd = releaseSource.indexOf('\nfunction cleanTargetBuildArtifacts(', verifyStart);
  const packageFiles = ['/server.js', '/js/data/exercises.js', '/mobile/viewer.html', '/screensaver-tutorial.html', '/build-info.json', '/js/kiosk-tutorial.js', '/css/kiosk-tutorial.css', '/lib/user-pin-vault.js', '/assets/branding/logo.png', '/main.js'];
  packageFiles.push('/js/racquetball.js', '/css/racquetball.css', '/lib/racquetball-store.js');
  packageFiles.push('/lib/racquetball-sync.js', '/js/racquetball-admin.js', '/mobile/racquetball-admin.html');
  packageFiles.push('/mobile/racquetball.html', '/js/racquetball-web.js', '/css/racquetball-web.css');
  packageFiles.push('/lib/racquetball-league.js', '/lib/racquetball-mail.js', '/js/racquetball-portal.js', '/css/racquetball-portal.css', '/assets/branding/norfolk-fitness.png', '/preload.js');
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
        : name === 'build-info.json'
          ? Buffer.from(JSON.stringify({ createdAt: '2026-10-04T19:33:05.796Z' }))
          : Buffer.from(wrongSource ? 'stale-source' : 'current-source')
    }
  };
  vm.createContext(verifierContext);
  vm.runInContext(releaseSource.slice(verifyStart, verifyEnd), verifierContext);
  const target = { name: 'kiosk', label: 'Kiosk', outputDir: '/test-output' };
  assert.equal(verifierContext.verifyPackagedApp(target).verifiedSourceFiles, 27);
  wrongSource = true;
  assert.throws(() => verifierContext.verifyPackagedApp(target), /does not match current source/);
  wrongSource = false;
  packageFiles.push('/data/users.json');
  assert.throws(() => verifierContext.verifyPackagedApp(target), /development data/);
  packageFiles.pop();
  packagedVersion = '0.0.0';
  assert.throws(() => verifierContext.verifyPackagedApp(target), /incorrect version/);
  const { createRacquetballStore } = require('../lib/racquetball-store');
  const leagueOptions = { dataDir: path.join(root, 'league'), isAdmin: token => token === 'authorized', now: () => 100000 };
  let league = createRacquetballStore(leagueOptions);
  const registration = { fullName: 'League Member', email: 'member@example.com', phone: '519-555-0123', pin: '0042' };
  assert.equal(league.signUp({ ...registration, email: 'invalid' }).success, false);
  assert.equal(league.signUp({ ...registration, pin: '42' }).success, false);
  assert.equal(league.signUp({ ...registration, phone: 'bad' }).success, false);
  const signedUp = league.signUp(registration);
  assert.equal(signedUp.success, true);
  assert.equal(signedUp.member.pin, undefined, 'league PINs must never be returned');
  assert.equal(signedUp.member.pin_hash, undefined);
  assert.equal(league.signUp({ ...registration, email: ' MEMBER@EXAMPLE.COM ' }).success, false, 'league email should be unique ignoring case');
  league.close();
  league = createRacquetballStore(leagueOptions);
  assert.equal(league.logIn({ email: registration.email, pin: registration.pin }).success, true, 'league registration must survive reopening');
  for (let attempt = 0; attempt < 5; attempt++) assert.equal(league.logIn({ email: registration.email, pin: '1111' }).success, false);
  league.close();
  league = createRacquetballStore(leagueOptions);
  assert.equal(league.logIn({ email: registration.email, pin: registration.pin }).success, false, 'league PIN attempts must lock after five failures');
  assert.equal(league.listMembers('expired').success, false);
  assert.equal(league.listMembers('authorized').members.length, 1);
  assert.equal(league.resetPin({ memberId: signedUp.member.id, pin: '1234', token: 'expired' }).success, false);
  assert.equal(league.resetPin({ memberId: signedUp.member.id, pin: '1234', token: 'authorized' }).success, true);
  assert.equal(league.logIn({ email: registration.email, pin: '1234' }).success, true);
  league.close();
  console.log('PASS: profile migration, preserved data on reopen, clean new install, authorized PIN reveal, package safeguards');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
