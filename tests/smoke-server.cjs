const { spawn } = require('child_process');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');

let BASE_URL = '';

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

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function run() {
  const root = path.resolve(__dirname, '..');
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gymkiosk-smoke-'));
  const port = await getAvailablePort();
  BASE_URL = `http://127.0.0.1:${port}`;
  const serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
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
    const loginPayload = await loginRes.json();
    const authCheckRes = await fetch(`${BASE_URL}/api/user/stats`, {
      headers: { Authorization: `Bearer ${loginPayload.sessionId}` }
    });
    assert.strictEqual(authCheckRes.status, 200, 'new mobile session should authorize account API requests');

    const completionDate = new Date().toISOString().slice(0, 10);
    const saveExerciseLogsRes = await fetch(`${BASE_URL}/api/workouts/${workoutId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginPayload.sessionId}`
      },
      body: JSON.stringify({
        completed: true,
        progress: [true],
        exerciseLogs: [{
          id: `smoke-log-${Date.now()}`,
          exerciseKey: '0',
          exerciseName: 'Push-Up',
          weight: 45,
          reps: 10,
          date: completionDate
        }]
      })
    });
    assert.strictEqual(saveExerciseLogsRes.status, 200, 'authenticated mobile exercise logs should save');
    const savedExerciseWorkout = await saveExerciseLogsRes.json();
    assert.strictEqual(savedExerciseWorkout.workout.userId, loginPayload.userId, 'saved workout should belong to the signed-in owner');

    const privateWorkoutRes = await fetch(`${BASE_URL}/api/workouts/${workoutId}`, {
      headers: { Authorization: `Bearer ${loginPayload.sessionId}` }
    });
    const privateWorkoutPayload = await privateWorkoutRes.json();
    assert.strictEqual(privateWorkoutPayload.exerciseLogs.length, 1, `workout owner should retrieve saved exercise logs; owner=${loginPayload.userId} session=${loginPayload.sessionId} PUT=${JSON.stringify(savedExerciseWorkout)} GET=${JSON.stringify(privateWorkoutPayload)}`);
    assert.strictEqual(privateWorkoutPayload.exerciseLogs[0].date, completionDate, 'saved completion date should be preserved');

    const publicWorkoutRes = await fetch(`${BASE_URL}/api/workouts/${workoutId}`);
    const publicWorkoutPayload = await publicWorkoutRes.json();
    assert.strictEqual(publicWorkoutPayload.exerciseLogs.length, 0, 'public QR viewers must not receive private exercise logs');

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
