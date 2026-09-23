const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
  const hasOpenDevtoolsGate = /if\s*\(\s*autoOpenDevTools\s*\)\s*\{[\s\S]*openDevTools\(/.test(mainCode);

  assert.ok(hasDevtoolsFlag, 'main.js should gate BrowserWindow devTools by isDev');
  assert.ok(hasOpenDevtoolsGate, 'main.js should only auto-open DevTools when explicitly requested');
}

function testElectronSandboxAndAdminAuthorization() {
  const mainCode = read('main.js');
  const preloadCode = read('preload.js');
  assert.ok(/sandbox\s*:\s*true/.test(mainCode), 'main.js should enable the renderer sandbox');
  assert.ok(mainCode.includes("ipcMain.handle('admin-validate-pin'"), 'admin PIN must be validated in the main process');
  assert.ok(/invoke\('exit-app',\s*token\)/.test(preloadCode), 'exit must require an admin session token');
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

function testCreateUserKeyboardHandlers() {
  const uiCode = read('js/ui.js');

  assert.ok(
    uiCode.includes("document.querySelectorAll('.keyboard-key').forEach"),
    'Create User and search keyboard buttons should have click handlers'
  );
  assert.ok(
    uiCode.includes("input.id === 'newUserPin'") && uiCode.includes("!/^\\d$/.test(key)"),
    'Create User PIN keyboard input should accept digits only'
  );
  assert.ok(
    uiCode.includes('document.activeKeyboardInput = input'),
    'Create User keyboard should track the active username or PIN input'
  );
}

function testStretchQrSharing() {
  const uiCode = read('js/ui.js');
  const qrCode = read('js/qr.js');
  const serverCode = read('server.js');
  const viewerCode = read('mobile/viewer.html');

  assert.ok(uiCode.includes('Send Stretches to Phone with QR Code'), 'stretch screen should expose QR sharing');
  assert.ok(uiCode.includes("displayQRCodeModal(stretchId, kioskIP, { type: 'stretch' })"), 'stretch sharing should open a stretch QR');
  assert.ok(qrCode.includes("contentType === 'stretch' ? 'stretch' : 'workout'"), 'stretch QR should use the stretch URL');
  assert.ok(serverCode.includes("app.get('/stretch/:workoutId'"), 'server should expose the stretch phone route');
  assert.ok(viewerCode.includes("workoutData?.type === 'stretch'"), 'phone viewer should render stretch-specific labels');
}

function testStretchImagesExist() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(read('js/data/exercises.js'), context);

  const groups = context.window.LOCAL_EXERCISES?.stretchesByBodyPart || {};
  const missing = [];
  for (const [group, stretches] of Object.entries(groups)) {
    for (const stretch of stretches) {
      const relativePath = String(stretch.image || '').replaceAll('/', path.sep);
      const fullPath = path.join(ROOT, relativePath);
      if (!stretch.image || !fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
        missing.push(`${group}: ${stretch.name} -> ${stretch.image || '(no image)'}`);
      }
    }
  }

  assert.ok(Object.keys(groups).length > 0, 'stretch exercise groups should be available');
  assert.deepStrictEqual(missing, [], `stretch images are missing:\n${missing.join('\n')}`);
}

function testStretchImagePathsPreserveExistingFilenames() {
  const uiCode = read('js/ui.js');
  const helperStart = uiCode.indexOf('function normalizeMediaPath');
  const helperEnd = uiCode.indexOf('function applyImageFallbacks');
  assert.ok(helperStart >= 0 && helperEnd > helperStart, 'media path helpers should be available');

  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `${uiCode.slice(helperStart, helperEnd)}\nresult = getMediaPathCandidates('assets/stretches/back/Reverse Back Bend .png');`,
    sandbox
  );

  assert.strictEqual(
    sandbox.result[0],
    'assets/stretches/back/Reverse Back Bend .png',
    'the exact stored stretch image filename must be attempted before normalized fallbacks'
  );
}

function testMobileViewerScriptsCompile() {
  const viewerCode = read('mobile/viewer.html');
  const scripts = [...viewerCode.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0, 'mobile viewer should contain executable JavaScript');
  scripts.forEach((match, index) => {
    assert.doesNotThrow(
      () => new Function(match[1]),
      `mobile viewer script ${index + 1} should compile`
    );
  });
}

function run() {
  try {
    testSingleInstanceLock();
    testDevtoolsGatedForProduction();
    testElectronSandboxAndAdminAuthorization();
    testStartupLauncherSafetyFlags();
    testCreateUserKeyboardHandlers();
    testStretchQrSharing();
    testStretchImagesExist();
    testStretchImagePathsPreserveExistingFilenames();
    testMobileViewerScriptsCompile();
    console.log('✅ Kiosk operational policy tests passed');
  } catch (error) {
    console.error('❌ Kiosk operational policy tests failed:', error.message);
    process.exitCode = 1;
  }
}

run();
