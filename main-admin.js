const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron');
const { registerUserPinVault } = require('./lib/user-pin-vault');
const { resolveAdminProfile } = require('./lib/admin-profile');
registerUserPinVault({ ipcMain, safeStorage, isAdmin: (token) => hasAdminSession(token) });
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const crypto = require('crypto');
const { createAdminSettings } = require('./lib/admin-settings');
const { createPersistentStore, resolveDataDirectory } = require('./lib/persistent-store');

const ROOT_DIR = __dirname;
const DATA_DIR = resolveDataDirectory();
const KIOSK_SETTINGS_PATH = path.join(DATA_DIR, 'kiosk-settings.json');
const SERVER_URL = 'http://127.0.0.1:3001/api/info';

try {
  const sessionDataPath = resolveAdminProfile(app.getPath('appData'), app.getPath('temp'));
  fs.mkdirSync(sessionDataPath, { recursive: true });
  app.setPath('sessionData', sessionDataPath);
} catch (_error) {
}

let adminWindow = null;
let kioskWindow = null;
let kioskAdminWindow = null;
let apiServerProcess = null;
let apiServerStartedByAdmin = false;
const adminSettings = createAdminSettings(path.dirname(DATA_DIR));
const persistentStore = createPersistentStore({ dataDir: DATA_DIR, sourceDataDir: path.join(ROOT_DIR, 'data') });
const adminSessions = new Map();

function issueAdminSession() {
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, Date.now() + (15 * 60 * 1000));
  return token;
}

function hasAdminSession(token) {
  const normalized = String(token || '');
  const expiresAt = adminSessions.get(normalized);
  if (!expiresAt || expiresAt < Date.now()) {
    adminSessions.delete(normalized);
    return false;
  }
  return true;
}

function requireAdminToken(token) {
  return hasAdminSession(token) ? null : { success: false, error: 'Administrator session expired.' };
}

const isDev = process.env.NODE_ENV !== 'production' || process.env.GYMKIOSK_DEVTOOLS === '1';
const autoOpenDevTools = isDev && process.env.GYMKIOSK_DEVTOOLS_AUTO_OPEN !== '0';

function formatBytes(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_error) {
    return fallback;
  }
}

function sanitizeForFilename(value = 'report') {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'report';
}

function getKioskSettings() {
  return readJson(KIOSK_SETTINGS_PATH, { autoStartOnBoot: true });
}

function saveKioskSettings(settings = {}) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const toSave = {
      autoStartOnBoot: settings.autoStartOnBoot !== false
    };

    fs.writeFileSync(KIOSK_SETTINGS_PATH, JSON.stringify(toSave, null, 2), 'utf8');
    return toSave;
  } catch (_error) {
    return null;
  }
}

function flattenRows(value, prefix = '', rows = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const key = prefix ? `${prefix}.${index}` : String(index);
      flattenRows(item, key, rows);
    });
    return rows;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, nested]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      flattenRows(nested, nextPrefix, rows);
    });
    return rows;
  }

  rows.push({ key: prefix || 'value', value: value ?? '' });
  return rows;
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(data) {
  const rows = flattenRows(data);
  const lines = ['key,value'];
  rows.forEach((row) => {
    lines.push(`${escapeCsv(row.key)},${escapeCsv(row.value)}`);
  });
  return lines.join('\n');
}

function createAdminWindow() {
  adminWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 760,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(ROOT_DIR, 'preload-admin.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  adminWindow.loadFile(path.join('admin', 'desktop.html'));

  adminWindow.on('closed', () => {
    adminWindow = null;
  });
}

function createKioskWindow() {
  if (kioskWindow && !kioskWindow.isDestroyed()) {
    kioskWindow.focus();
    return { status: 'focused' };
  }

  kioskWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    kiosk: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(ROOT_DIR, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev
    }
  });

  kioskWindow.loadFile('index.html');

  if (autoOpenDevTools) {
    kioskWindow.webContents.openDevTools({ mode: 'detach' });
  }

  kioskWindow.on('closed', () => {
    kioskWindow = null;
  });

  return { status: 'started' };
}

function openKioskAdminPanelWindow() {
  if (kioskAdminWindow && !kioskAdminWindow.isDestroyed()) {
    kioskAdminWindow.focus();
    return { status: 'focused' };
  }

  kioskAdminWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(ROOT_DIR, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false
    }
  });

  kioskAdminWindow.loadFile('index.html');
  kioskAdminWindow.webContents.on('did-finish-load', () => {
    kioskAdminWindow.webContents.executeJavaScript(`
      (() => {
        try {
          if (typeof showScreen === 'function') {
            showScreen('mainActionsScreen');
          }
          const modal = document.getElementById('adminPinModal');
          if (modal) {
            modal.classList.remove('hidden');
          }
        } catch (e) {
          console.error('Admin panel bootstrap error:', e);
        }
      })();
    `).catch(() => {});
  });

  kioskAdminWindow.on('closed', () => {
    kioskAdminWindow = null;
  });

  return { status: 'opened' };
}

function collectErrorLogs() {
  const serverLogPath = path.join(ROOT_DIR, 'server-log.txt');
  const candidates = [
    serverLogPath
  ];

  const records = [];
  candidates.forEach((filePath) => {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    lines.forEach((line) => {
      if (/error|exception|failed|fatal/i.test(line)) {
        records.push({ source: path.basename(filePath), line });
      }
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    totalErrors: records.length,
    records: records.slice(-300)
  };
}

function collectAdminAuditReport() {
  const auditPath = path.join(app.getPath('userData'), 'logs', 'admin-audit.log');
  const records = [];

  if (fs.existsSync(auditPath)) {
    const lines = fs.readFileSync(auditPath, 'utf8').split(/\r?\n/).filter(Boolean);
    lines.forEach((line) => {
      try {
        records.push(JSON.parse(line));
      } catch (_error) {
        records.push({ ts: new Date().toISOString(), action: 'parse_error', details: line });
      }
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    path: auditPath,
    totalEvents: records.length,
    events: records.slice(-300)
  };
}

function collectWorkoutUsageReport() {
  const entries = Array.from(persistentStore.readMap('workouts').entries());

  const muscleCounts = new Map();
  const exerciseCounts = new Map();

  entries.forEach(([, payload]) => {
    const days = payload?.data?.exercises;
    if (!Array.isArray(days)) return;

    days.forEach((dayBlock) => {
      const day = String(dayBlock?.day || 'unknown').toLowerCase();
      muscleCounts.set(day, (muscleCounts.get(day) || 0) + 1);

      const exercises = Array.isArray(dayBlock?.dayExercises) ? dayBlock.dayExercises : [];
      exercises.forEach((exercise) => {
        const name = exercise?.name || 'Unknown Exercise';
        exerciseCounts.set(name, (exerciseCounts.get(name) || 0) + 1);
      });
    });
  });

  const topMuscles = [...muscleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, count }));

  const topExercises = [...exerciseCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([name, count]) => ({ name, count }));

  return {
    generatedAt: new Date().toISOString(),
    totalWorkoutEntries: entries.length,
    topMuscles,
    topExercises
  };
}

function collectUserActivityReport() {
  const usersData = Array.from(persistentStore.readMap('users').entries());
  const workoutEntries = Array.from(persistentStore.readMap('workouts').entries());

  const users = usersData.map(([id, user]) => ({
    id,
    email: user?.email || '',
    workoutLinks: Array.isArray(user?.workouts) ? user.workouts.length : 0
  }));

  const workoutsByUserId = new Map();
  workoutEntries.forEach(([, payload]) => {
    const key = payload?.userId || payload?.data?.user || 'anonymous';
    workoutsByUserId.set(key, (workoutsByUserId.get(key) || 0) + 1);
  });

  const leaderboard = [...workoutsByUserId.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([userId, workoutCount]) => ({ userId, workoutCount }));

  return {
    generatedAt: new Date().toISOString(),
    registeredUsers: users.length,
    users,
    workoutLeaderboard: leaderboard
  };
}

function pingServer() {
  return new Promise((resolve) => {
    const req = http.get(SERVER_URL, (res) => {
      res.resume();
      resolve({ ok: res.statusCode >= 200 && res.statusCode < 500, statusCode: res.statusCode });
    });

    req.on('error', (error) => resolve({ ok: false, error: error.message }));
    req.setTimeout(2500, () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
  });
}

function waitForServerReady(timeoutMs = 60000, intervalMs = 1000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = async () => {
      const status = await pingServer();
      if (status.ok) {
        resolve(true);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error(`Server did not become ready within ${timeoutMs}ms`));
        return;
      }

      setTimeout(check, intervalMs);
    };

    check();
  });
}

function startApiServer() {
  if (apiServerProcess && !apiServerProcess.killed) {
    return;
  }

  apiServerStartedByAdmin = true;
  const syncEnvironment = adminSettings.getSyncEnvironment();
  apiServerProcess = spawn(process.execPath, [path.join(ROOT_DIR, 'server.js')], {
    cwd: ROOT_DIR,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', GYMKIOSK_DATA_DIR: DATA_DIR, ...syncEnvironment },
    stdio: 'inherit'
  });

  apiServerProcess.on('exit', () => {
    apiServerProcess = null;
    apiServerStartedByAdmin = false;
  });
}

async function ensureApiServerForKiosk() {
  const status = await pingServer();
  if (status.ok) {
    return;
  }

  startApiServer();
  await waitForServerReady();
}

async function collectSystemHealthReport() {
  const files = ['gym-kiosk.db'];
  const fileStats = files.map((name) => {
    const filePath = path.join(DATA_DIR, name);
    if (!fs.existsSync(filePath)) {
      return { name, exists: false, size: '0 B' };
    }
    const stat = fs.statSync(filePath);
    return {
      name,
      exists: true,
      size: formatBytes(stat.size),
      updatedAt: stat.mtime.toISOString()
    };
  });

  const serverStatus = await pingServer();

  return {
    generatedAt: new Date().toISOString(),
    appVersion: app.getVersion(),
    platform: process.platform,
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
    uptimeSeconds: Math.round(process.uptime()),
    windows: {
      adminWindowOpen: !!(adminWindow && !adminWindow.isDestroyed()),
      kioskWindowOpen: !!(kioskWindow && !kioskWindow.isDestroyed()),
      kioskAdminWindowOpen: !!(kioskAdminWindow && !kioskAdminWindow.isDestroyed())
    },
    serverStatus,
    dataFiles: fileStats
  };
}

async function getReportData(reportType) {
  switch (reportType) {
    case 'error-logs':
      return collectErrorLogs();
    case 'admin-audit':
      return collectAdminAuditReport();
    case 'workout-usage':
      return collectWorkoutUsageReport();
    case 'user-activity':
      return collectUserActivityReport();
    case 'system-health':
      return await collectSystemHealthReport();
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

ipcMain.handle('admin-validate-pin', (_event, pin) => {
  const success = adminSettings.validate(String(pin || ''));
  return { success, token: success ? issueAdminSession() : null };
});

ipcMain.handle('admin-change-pin', (_event, payload = {}) => {
  const denied = requireAdminToken(payload.token); if (denied) return denied;
  return adminSettings.change(payload.currentPin, payload.newPin);
});

ipcMain.handle('admin-start-kiosk', async (_event, token) => {
  const denied = requireAdminToken(token); if (denied) return denied;
  await ensureApiServerForKiosk();
  return createKioskWindow();
});
ipcMain.handle('admin-exit-kiosk', (_event, token) => {
  const denied = requireAdminToken(token); if (denied) return denied;
  let closedAny = false;

  if (kioskAdminWindow && !kioskAdminWindow.isDestroyed()) {
    kioskAdminWindow.close();
    kioskAdminWindow = null;
    closedAny = true;
  }

  if (kioskWindow && !kioskWindow.isDestroyed()) {
    kioskWindow.close();
    kioskWindow = null;
    closedAny = true;
  }

  return { status: closedAny ? 'closed' : 'not-running' };
});
ipcMain.handle('admin-get-kiosk-autostart', (_event, token) => {
  const denied = requireAdminToken(token); if (denied) return denied;
  const settings = getKioskSettings();
  return { enabled: settings.autoStartOnBoot !== false };
});
ipcMain.handle('admin-set-kiosk-autostart', (_event, payload = {}) => {
  const denied = requireAdminToken(payload.token); if (denied) return denied;
  const enabled = payload.enabled;
  const saved = saveKioskSettings({ autoStartOnBoot: !!enabled });
  if (!saved) {
    return { success: false, error: 'Failed to save kiosk startup setting.' };
  }
  return { success: true, enabled: saved.autoStartOnBoot !== false };
});
ipcMain.handle('admin-open-kiosk-admin-panel', (_event, token) => {
  const denied = requireAdminToken(token); if (denied) return denied;
  return openKioskAdminPanelWindow();
});

ipcMain.handle('admin-get-report', async (_event, payload = {}) => {
  const denied = requireAdminToken(payload.token); if (denied) return denied;
  const reportType = payload.reportType;
  try {
    return await getReportData(reportType);
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('admin-export-report', async (_event, payload = {}) => {
  const denied = requireAdminToken(payload.token); if (denied) return denied;
  const reportType = payload.reportType;
  const format = String(payload.format || 'json').toLowerCase();
  if (!reportType) {
    return { success: false, error: 'Missing report type' };
  }
  if (!['json', 'csv'].includes(format)) {
    return { success: false, error: `Unsupported export format: ${format}` };
  }

  try {
    const reportData = await getReportData(reportType);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `${sanitizeForFilename(reportType)}-${timestamp}`;

    const saveResult = await dialog.showSaveDialog({
      title: `Export ${reportType}`,
      defaultPath: path.join(app.getPath('documents'), `${baseName}.${format}`),
      filters: format === 'json'
        ? [{ name: 'JSON', extensions: ['json'] }]
        : [{ name: 'CSV', extensions: ['csv'] }]
    });

    if (saveResult.canceled || !saveResult.filePath) {
      return { success: false, canceled: true };
    }

    const output = format === 'json'
      ? JSON.stringify(reportData, null, 2)
      : toCsv(reportData);

    fs.writeFileSync(saveResult.filePath, output, 'utf8');
    return {
      success: true,
      filePath: saveResult.filePath,
      format,
      reportType
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin-cancel-login', (event) => {
  const sourceWindow = BrowserWindow.fromWebContents(event.sender);
  if (sourceWindow === adminWindow) sourceWindow.close();
});

ipcMain.handle('exit-app', (event, token) => {
  const denied = requireAdminToken(token); if (denied) return denied;
  const sourceWindow = BrowserWindow.fromWebContents(event.sender);
  if (sourceWindow && sourceWindow !== adminWindow) {
    sourceWindow.close();
    return { success: true, closedWindow: true };
  }

  app.quit();
  return { success: true, closedWindow: false };
});

ipcMain.handle('log-admin-action', (_event, payload = {}) => {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    const logFile = path.join(logDir, 'admin-audit.log');
    const entry = {
      ts: new Date().toISOString(),
      action: payload.action || 'unknown',
      actor: payload.actor || 'admin',
      details: payload.details || ''
    };

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    fs.appendFileSync(logFile, `${JSON.stringify(entry)}\n`, 'utf8');
    return { success: true, logFile };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(createAdminWindow);

app.on('window-all-closed', () => {
  if (apiServerStartedByAdmin && apiServerProcess && !apiServerProcess.killed) {
    apiServerProcess.kill();
  }
  app.quit();
});

app.on('before-quit', () => {
  try { persistentStore.close(); } catch (_error) {}
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createAdminWindow();
  }
});
