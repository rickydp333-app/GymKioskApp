const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gymkiosk-mobile-logs-'));
let BASE_URL = '';
let serverProcess = null;
let serverStderr = '';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

async function startServer() {
  const port = await getAvailablePort();
  BASE_URL = `http://127.0.0.1:${port}`;
  serverStderr = '';
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), GYMKIOSK_DATA_DIR: DATA_DIR, ALERT_EMAIL_ENABLED: '0' },
    stdio: ['ignore', 'ignore', 'pipe']
  });
  serverProcess.stderr.on('data', chunk => { serverStderr += chunk.toString(); });

  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (serverProcess.exitCode !== null) throw new Error(`Server exited early: ${serverStderr}`);
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch (_error) {
      // The server is still starting.
    }
    await wait(200);
  }
  throw new Error(`Server did not become healthy: ${serverStderr}`);
}

async function stopServer() {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  const current = serverProcess;
  const exited = new Promise(resolve => current.once('exit', resolve));
  current.kill();
  await Promise.race([exited, wait(5000)]);
  serverProcess = null;
}

async function requestJson(route, options) {
  const response = await fetch(`${BASE_URL}${route}`, options);
  const body = await response.json();
  return { response, body };
}

async function register(email) {
  const { response, body } = await requestJson('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'WorkoutLogsTest123!' })
  });
  assert.equal(response.status, 200, `registration failed: ${JSON.stringify(body)}`);
  return body;
}

async function run() {
  const date = '2026-10-01';
  const workoutId = `mobile-log-${Date.now()}`;
  const ownerEmail = `owner-${Date.now()}@example.com`;
  const otherEmail = `other-${Date.now()}@example.com`;

  try {
    await startServer();
    const owner = await register(ownerEmail);
    const other = await register(otherEmail);

    const created = await requestJson('/api/workouts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workoutId, data: { exercises: [{ name: 'Bench Press', sets: 3 }] } })
    });
    assert.equal(created.response.status, 200, 'kiosk workout should be available to log');

    const viewer = await fetch(`${BASE_URL}/workout/${workoutId}`);
    assert.equal(viewer.status, 200, 'workout QR route should serve the phone viewer');
    const viewerHtml = await viewer.text();
    assert.match(viewerHtml, /exercise-log-panel/, 'phone viewer should include the logging form');
    assert.match(viewerHtml, /Log your training/, 'phone viewer should label the set logging panel');

    const invalid = await requestJson(`/api/workouts/${workoutId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner.sessionId}` },
      body: JSON.stringify({ exerciseLogs: [{ id: 'invalid-log-id', exerciseKey: '0', exerciseName: 'Bench Press', weight: 100, reps: 0, date }] })
    });
    assert.equal(invalid.response.status, 400, 'invalid exercise logs should be rejected');

    const exerciseLog = {
      id: `mobile-log-${Date.now()}`,
      exerciseKey: '0',
      exerciseName: 'Bench Press',
      weight: 135.5,
      reps: 5,
      date
    };
    const saved = await requestJson(`/api/workouts/${workoutId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner.sessionId}` },
      body: JSON.stringify({ completed: true, progress: [true], exerciseLogs: [exerciseLog] })
    });
    assert.equal(saved.response.status, 200, `valid log should save: ${JSON.stringify(saved.body)}`);

    for (const [label, sessionId, expectedCount] of [
      ['owner', owner.sessionId, 1],
      ['other account', other.sessionId, 0],
      ['public QR visitor', null, 0]
    ]) {
      const headers = sessionId ? { Authorization: `Bearer ${sessionId}` } : {};
      const result = await requestJson(`/api/workouts/${workoutId}`, { headers });
      assert.equal(result.response.status, 200, `${label} should load workout`);
      assert.equal(result.body.exerciseLogs.length, expectedCount, `${label} log visibility mismatch`);
    }

    await stopServer();
    await startServer();
    const login = await requestJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ownerEmail, password: 'WorkoutLogsTest123!' })
    });
    assert.equal(login.response.status, 200, 'owner should sign in after server restart');
    const restored = await requestJson(`/api/workouts/${workoutId}`, {
      headers: { Authorization: `Bearer ${login.body.sessionId}` }
    });
    assert.equal(restored.body.exerciseLogs.length, 1, 'workout logs should persist across server restart');

    const database = new DatabaseSync(path.join(DATA_DIR, 'gym-kiosk.db'), { readOnly: true });
    try {
      const usersPayload = database.prepare("SELECT payload FROM app_collections WHERE name = 'users'").get();
      const users = new Map(JSON.parse(usersPayload.payload));
      const savedUser = users.get(owner.userId);
      assert.equal(savedUser.exerciseHistory['Bench Press'][0].date, date, 'exercise history date should persist');
      assert.deepEqual(savedUser.exerciseHistory['Bench Press'][0].sets, [{ weight: 135.5, reps: 5 }]);
      assert.equal(savedUser.personalRecords['Bench Press'].estimatedMax, 158, 'estimated personal record should persist');
    } finally {
      database.close();
    }

    console.log('Mobile workout log regression tests passed.');
  } finally {
    await stopServer();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
