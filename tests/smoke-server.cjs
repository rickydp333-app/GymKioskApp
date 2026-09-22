const { spawn } = require('child_process');
const assert = require('assert');
const path = require('path');

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
  const hadServerAlready = await isServerHealthy();
  const serverProcess = hadServerAlready
    ? null
    : spawn(process.execPath, ['server.js'], {
      cwd: root,
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
  }
}

run();
