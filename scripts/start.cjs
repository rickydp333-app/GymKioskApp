const { spawn, execFileSync } = require('child_process');
const http = require('http');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const SERVER_URL = 'http://127.0.0.1:3001/api/info';
let serverProcess = null;
let kioskProcess = null;
let shuttingDown = false;
let serverStartedByLauncher = false;
const skipElectron = process.env.GYMKIOSK_SKIP_ELECTRON === '1';
const testMode = process.env.GYMKIOSK_TEST_MODE === '1';
const keepServerAliveOnKioskCrash = process.env.GYMKIOSK_KEEP_SERVER_ON_KIOSK_CRASH !== '0';
const restartKioskOnCrash = process.env.GYMKIOSK_RESTART_KIOSK_ON_CRASH !== '0';
const kioskRestartDelayMs = Math.max(500, Number(process.env.GYMKIOSK_KIOSK_RESTART_DELAY_MS || 2000));
const kioskMaxCrashRestarts = Math.max(1, Number(process.env.GYMKIOSK_MAX_KIOSK_CRASH_RESTARTS || 5));
const kioskStableRunResetMs = Math.max(5000, Number(process.env.GYMKIOSK_KIOSK_STABLE_RESET_MS || 60000));
let kioskCrashRestartCount = 0;
let kioskLaunchStartedAt = 0;
let kioskRestartTimer = null;
let kioskDetachedWatchTimer = null;
const kioskHandoffGraceMs = Math.max(2000, Number(process.env.GYMKIOSK_KIOSK_HANDOFF_GRACE_MS || 15000));

function log(message) {
  console.log(`[start] ${message}`);
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (kioskRestartTimer) {
    clearTimeout(kioskRestartTimer);
    kioskRestartTimer = null;
  }

  if (kioskDetachedWatchTimer) {
    clearInterval(kioskDetachedWatchTimer);
    kioskDetachedWatchTimer = null;
  }

  if (kioskProcess && !kioskProcess.killed) {
    kioskProcess.kill();
  }

  if (serverStartedByLauncher && serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }

  process.exit(code);
}

function getElectronProcessCount() {
  if (process.platform !== 'win32') return 0;

  try {
    const output = execFileSync('tasklist', ['/FI', 'IMAGENAME eq electron.exe', '/FO', 'CSV', '/NH'], {
      encoding: 'utf8'
    });

    const lines = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith('INFO:'));

    return lines.length;
  } catch (_error) {
    return 0;
  }
}

function startDetachedKioskWatch() {
  if (kioskDetachedWatchTimer) return;

  kioskDetachedWatchTimer = setInterval(() => {
    if (shuttingDown) {
      clearInterval(kioskDetachedWatchTimer);
      kioskDetachedWatchTimer = null;
      return;
    }

    const electronCount = getElectronProcessCount();
    if (electronCount > 0) return;

    clearInterval(kioskDetachedWatchTimer);
    kioskDetachedWatchTimer = null;
    log('No Electron process detected after launcher handoff. Relaunching kiosk...');
    startKiosk();
  }, 2000);
}

function pingServer(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(!!res.statusCode && res.statusCode >= 200 && res.statusCode < 500);
    });

    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function waitForServer(url, timeoutMs = 60000, intervalMs = 1000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          resolve();
          return;
        }

        retry();
      });

      req.on('error', retry);
      req.setTimeout(3000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error(`Server did not become ready within ${timeoutMs}ms`));
        return;
      }

      setTimeout(check, intervalMs);
    };

    check();
  });
}

function waitForServerExit(maxMs = 10000) {
  if (!serverProcess) return Promise.resolve();

  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      resolve();
    }, maxMs);

    serverProcess.once('exit', () => {
      if (resolved) return;
      clearTimeout(timer);
      resolved = true;
      resolve();
    });
  });
}

function startServer() {
  log('Starting API server...');
  serverStartedByLauncher = true;
  serverProcess = spawn(process.execPath, [path.join(rootDir, 'server.js')], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  serverProcess.on('exit', async (code) => {
    if (shuttingDown) return;

    if (code !== 0) {
      const existingServerAlive = await pingServer(SERVER_URL);
      if (existingServerAlive) {
        log(`Server process exited with code ${code}, but an existing server is already available on port 3001. Continuing.`);
        serverProcess = null;
        serverStartedByLauncher = false;
        return;
      }

      log(`Server exited early with code ${code}`);
      shutdown(code || 1);
      return;
    }

    log('Server process exited.');
    shutdown(0);
  });
}

function startKiosk() {
  log('Launching kiosk app...');
  let electronBinary = null;
  try {
    electronBinary = require('electron');
  } catch (error) {
    log(`Unable to resolve Electron binary: ${error.message}`);
    shutdown(1);
    return;
  }

  kioskProcess = spawn(electronBinary, [rootDir], {
    cwd: rootDir,
    stdio: 'inherit'
  });
  kioskLaunchStartedAt = Date.now();

  kioskProcess.on('exit', (code) => {
    if (shuttingDown) return;
    const exitCode = code ?? 0;
    const ranMs = Date.now() - kioskLaunchStartedAt;
    const electronCount = getElectronProcessCount();

    if (ranMs >= kioskStableRunResetMs) {
      kioskCrashRestartCount = 0;
    }

    log(`Kiosk exited with code ${exitCode}`);

    // On Windows, Electron can relaunch and detach while the original child exits 0.
    if (exitCode === 0 && ranMs <= kioskHandoffGraceMs && electronCount > 0) {
      kioskProcess = null;
      log(`Kiosk launcher process exited after handoff; tracking ${electronCount} Electron process(es).`);
      startDetachedKioskWatch();
      return;
    }

    if (exitCode !== 0 && restartKioskOnCrash) {
      if (kioskCrashRestartCount < kioskMaxCrashRestarts) {
        kioskCrashRestartCount += 1;
        kioskProcess = null;
        log(`Scheduling kiosk restart ${kioskCrashRestartCount}/${kioskMaxCrashRestarts} in ${kioskRestartDelayMs}ms.`);
        kioskRestartTimer = setTimeout(() => {
          kioskRestartTimer = null;
          if (shuttingDown) return;
          startKiosk();
        }, kioskRestartDelayMs);
        return;
      }

      log(`Kiosk reached max crash restarts (${kioskMaxCrashRestarts}).`);
    }

    // Keep backend alive for troubleshooting or mobile usage when kiosk exits unexpectedly.
    if (exitCode !== 0 && keepServerAliveOnKioskCrash && serverStartedByLauncher && serverProcess && !serverProcess.killed) {
      kioskProcess = null;
      log('Keeping API server running after unexpected kiosk exit.');
      return;
    }

    shutdown(exitCode);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

(async () => {
  try {
    const existingServerAlive = await pingServer(SERVER_URL);
    if (existingServerAlive) {
      log('Detected existing API server on port 3001. Reusing it.');
    } else {
      startServer();
    }

    await waitForServer(SERVER_URL);
    log('Server is ready.');

    if (skipElectron) {
      log('Skipping Electron launch (GYMKIOSK_SKIP_ELECTRON=1).');
      if (testMode) {
        if (serverStartedByLauncher && serverProcess && !serverProcess.killed) {
          serverProcess.kill('SIGINT');
          await waitForServerExit();
        }
        shutdown(0);
      }
      return;
    }

    startKiosk();
  } catch (error) {
    log(`Startup failed: ${error.message}`);
    shutdown(1);
  }
})();
