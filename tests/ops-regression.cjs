const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'http://127.0.0.1:3001';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerUp() {
  try {
    const response = await fetch(`${BASE_URL}/api/info`);
    return response.ok;
  } catch (_error) {
    return false;
  }
}

async function waitForServer(timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerUp()) return;
    await wait(400);
  }
  throw new Error('Server did not become ready in time');
}

async function testExitIpcContract() {
  const mainCode = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
  const preloadCode = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');

  const mainUsesHandle = mainCode.includes("ipcMain.handle('exit-app'");
  const preloadUsesInvoke = /invoke\('exit-app',\s*token\)/.test(preloadCode);

  if (mainUsesHandle) {
    assert.ok(
      preloadUsesInvoke,
      'preload.js must invoke exit-app with an administrator session token'
    );
  }
}

async function testLauncherServerReadiness() {
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gymkiosk-ops-'));
  const launcher = spawn(process.execPath, [path.join(ROOT, 'scripts', 'start.cjs')], {
    cwd: ROOT,
    env: {
      ...process.env,
      GYMKIOSK_TEST_MODE: '1',
      GYMKIOSK_SKIP_ELECTRON: '1',
      GYMKIOSK_DATA_DIR: testDataDir,
      ALERT_EMAIL_ENABLED: '0'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';
  launcher.stdout.on('data', chunk => { stdout += chunk.toString(); });
  launcher.stderr.on('data', chunk => { stderr += chunk.toString(); });

  try {
    await waitForServer();

    const exitCode = await new Promise((resolve, reject) => {
      launcher.on('error', reject);
      launcher.on('exit', (code) => resolve(code));
    });

    assert.strictEqual(exitCode, 0, `Launcher should exit cleanly in test mode. stdout=${stdout} stderr=${stderr}`);
  } finally {
    if (!launcher.killed) {
      launcher.kill('SIGINT');
    }
    setTimeout(() => fs.rmSync(testDataDir, { recursive: true, force: true }), 500).unref();
  }
}

async function run() {
  try {
    await testExitIpcContract();
    await testLauncherServerReadiness();
    console.log('✅ Operational regression tests passed');
  } catch (error) {
    console.error('❌ Operational regression tests failed:', error.message);
    process.exitCode = 1;
  }
}

run();
