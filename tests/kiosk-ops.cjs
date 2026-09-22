const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function testSingleInstanceLock() {
  const mainCode = read('main.js');
  assert.ok(
    /requestSingleInstanceLock\(/.test(mainCode),
    'main.js should enforce single-instance lock with app.requestSingleInstanceLock()'
  );
}

function testDevtoolsGatedForProduction() {
  const mainCode = read('main.js');

  const hasDevtoolsFlag = /devTools\s*:\s*isDev/.test(mainCode);
  const hasOpenDevtoolsGate = /if\s*\(\s*isDev\s*\)\s*\{[\s\S]*openDevTools\(/.test(mainCode);

  assert.ok(hasDevtoolsFlag, 'main.js should gate BrowserWindow devTools by isDev');
  assert.ok(hasOpenDevtoolsGate, 'main.js should only open DevTools when isDev');
}

function testStartupLauncherSafetyFlags() {
  const launcherCode = read('scripts/start.cjs');

  assert.ok(
    launcherCode.includes('GYMKIOSK_SKIP_ELECTRON'),
    'scripts/start.cjs should support GYMKIOSK_SKIP_ELECTRON for non-UI testing'
  );
  assert.ok(
    launcherCode.includes('GYMKIOSK_TEST_MODE'),
    'scripts/start.cjs should support GYMKIOSK_TEST_MODE for controlled test shutdown'
  );
}

function run() {
  try {
    testSingleInstanceLock();
    testDevtoolsGatedForProduction();
    testStartupLauncherSafetyFlags();
    console.log('✅ Kiosk operational policy tests passed');
  } catch (error) {
    console.error('❌ Kiosk operational policy tests failed:', error.message);
    process.exitCode = 1;
  }
}

run();
