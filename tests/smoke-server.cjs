const { spawn } = require('child_process');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const BASE_URL = 'http://localhost:3001';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch (_error) {
      // server not ready yet
    }
    await wait(400);
  }
  throw new Error('Server did not become healthy in time');
}

async function isServerHealthy() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    return response.ok;
  } catch (_error) {
    return false;
  }
}

async function run() {
  const root = path.resolve(__dirname, '..');
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gymkiosk-smoke-'));
  const hadServerAlready = await isServerHealthy();
  const serverProcess = hadServerAlready
    ? null
    : spawn(process.execPath, ['server.js'], {
      cwd: root,
      env: {
        ...process.env,
        GYMKIOSK_DATA_DIR: testDataDir,
        GYMKIOSK_SYNC_KEY: 'smoke-sync-key-1234567890',
        GYMKIOSK_SYNC_URL: `${BASE_URL}/api/kiosk-sync`,
        ALERT_EMAIL_ENABLED: '0'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

  let stderr = '';
  if (serverProcess) {
    serverProcess.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
  }

  try {
    await waitForHealth();

    const healthRes = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(healthRes.status, 200, 'health endpoint should return 200');

    const infoRes = await fetch(`${BASE_URL}/api/info`);
    assert.strictEqual(infoRes.status, 200, 'info endpoint should return 200');

    const workoutId = `smoke-${Date.now()}`;
    const createWorkoutRes = await fetch(`${BASE_URL}/api/workouts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workoutId,
        data: {
          user: 'smoke-test',
          created: new Date().toISOString(),
          exercises: [{ name: 'Push-Up', reps: 10, sets: 3 }]
        }
      })
    });
    assert.strictEqual(createWorkoutRes.status, 200, 'create workout should return 200');

    const getWorkoutRes = await fetch(`${BASE_URL}/api/workouts/${workoutId}`);
    assert.strictEqual(getWorkoutRes.status, 200, 'get workout should return 200');

    const stretchId = `stretch-${Date.now()}`;
    const createStretchRes = await fetch(`${BASE_URL}/api/workouts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workoutId: stretchId,
        data: {
          type: 'stretch',
          title: 'Back Stretch Routine',
          bodyPart: 'back',
          user: 'smoke-test',
          created: new Date().toISOString(),
          exercises: [{ name: 'Child’s Pose', howTo: ['Hold gently'], primary: ['Back'] }]
        }
      })
    });
    assert.strictEqual(createStretchRes.status, 200, 'create stretch routine should return 200');

    const getStretchRes = await fetch(`${BASE_URL}/api/workouts/${stretchId}`);
    assert.strictEqual(getStretchRes.status, 200, 'get stretch routine should return 200');
    const stretchPayload = await getStretchRes.json();
    assert.strictEqual(stretchPayload.data.type, 'stretch', 'stretch routine type should be preserved');

    const stretchPageRes = await fetch(`${BASE_URL}/stretch/${stretchId}`);
    assert.strictEqual(stretchPageRes.status, 200, 'stretch phone page should return 200');
    assert.ok((await stretchPageRes.text()).includes('loadingText'), 'stretch route should serve the mobile viewer');

    const email = `smoke-${Date.now()}@example.com`;
    const password = 'SmokeTest123!';

    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    assert.strictEqual(registerRes.status, 200, 'register should return 200');

    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    assert.strictEqual(loginRes.status, 200, 'login should return 200');

    const rejectedSync = await fetch(`${BASE_URL}/api/kiosk-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-key' },
      body: JSON.stringify({ kioskId: 'smoke-kiosk', events: [] })
    });
    assert.strictEqual(rejectedSync.status, 401, 'website sync should reject an invalid credential');

    const syncedWorkoutId = `synced-${Date.now()}`;
    const acceptedSync = await fetch(`${BASE_URL}/api/kiosk-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer smoke-sync-key-1234567890' },
      body: JSON.stringify({
        kioskId: 'smoke-kiosk',
        events: [{
          id: 1,
          event_type: 'workout.created',
          payload: {
            workoutId: syncedWorkoutId,
            data: { user: 'sync-test', exercises: [{ name: 'Squat', reps: 5, sets: 5 }] },
            created: new Date().toISOString()
          }
        }]
      })
    });
    assert.strictEqual(acceptedSync.status, 200, 'website sync should accept a valid signed batch');

    const syncedWorkoutRes = await fetch(`${BASE_URL}/api/workouts/${syncedWorkoutId}`);
    assert.strictEqual(syncedWorkoutRes.status, 200, 'synced workout should be available to QR links');

    console.log('✅ Smoke test passed');
  } catch (error) {
    console.error('❌ Smoke test failed:', error.message);
    if (stderr) {
      console.error('Server stderr:\n', stderr);
    }
    process.exitCode = 1;
  } finally {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGINT');
    }
    setTimeout(() => fs.rmSync(testDataDir, { recursive: true, force: true }), 500).unref();
  }
}

run();
