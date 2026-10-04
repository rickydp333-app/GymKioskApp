/* =========================================
   MAIN.JS – WINDOWS KIOSK SAFE
========================================= */

const { app, BrowserWindow, ipcMain, shell, safeStorage } = require('electron');
const { registerUserPinVault } = require('./lib/user-pin-vault');
registerUserPinVault({ ipcMain, safeStorage, isAdmin: (token) => isValidAdminSession(token) });
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const crypto = require('crypto');
const http = require('http');
const { createAdminSettings } = require('./lib/admin-settings');
const { resolveDataDirectory } = require('./lib/persistent-store');

const ROOT_DIR = __dirname;
const DATA_DIR = resolveDataDirectory();
const KIOSK_SETTINGS_PATH = path.join(DATA_DIR, 'kiosk-settings.json');

try {
  // Keep Chromium storage (including localStorage profiles) in a persistent path.
  const sessionDataPath = path.join(app.getPath('appData'), 'GymKioskApp', 'session-kiosk');
  fs.mkdirSync(sessionDataPath, { recursive: true });
  app.setPath('sessionData', sessionDataPath);
} catch (_error) {
}

let mainWindow;
let serverProcess = null;
let adminSettings = null;
const adminSessions = new Map();
const failedPinAttempts = new Map();
const ADMIN_SESSION_TTL_MS = 15 * 60 * 1000;
const isDev = process.env.NODE_ENV !== 'production' || process.env.GYMKIOSK_DEVTOOLS === '1';
// Only open DevTools if GYMKIOSK_DEVTOOLS_AUTO_OPEN is '1'
const autoOpenDevTools = process.env.GYMKIOSK_DEVTOOLS_AUTO_OPEN === '1';

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function getKioskAutoStartSetting() {
  try {
    if (!fs.existsSync(KIOSK_SETTINGS_PATH)) {
      return true;
    }

    const settings = JSON.parse(fs.readFileSync(KIOSK_SETTINGS_PATH, 'utf8'));
    return settings.autoStartOnBoot !== false;
  } catch (_error) {
    return true;
  }
}

function applyKioskAutoStartOnBoot(enabled) {
  if (process.platform !== 'win32') return;

  try {
    const loginItemConfig = {
      openAtLogin: !!enabled,
      path: process.execPath,
      args: []
    };

    app.setLoginItemSettings(loginItemConfig);

    const current = app.getLoginItemSettings({ path: process.execPath, args: [] });
    if (current.openAtLogin !== !!enabled) {
      app.setLoginItemSettings(loginItemConfig);
    }

    console.log(`Kiosk auto-start on boot is ${enabled ? 'enabled' : 'disabled'}.`);
  } catch (error) {
    console.error('Failed to configure kiosk auto-start:', error.message);
  }
}

/* ========= CREATE WINDOW ========= */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    kiosk: true, // 🔒 Locks the window
    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev || process.env.GYMKIOSK_DEVTOOLS === '1'
    }
  });
  mainWindow.loadFile('index.html');

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) event.preventDefault();
  });
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'notifications');
  });

  // Only auto-open DevTools if explicitly requested
  if (autoOpenDevTools) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // 🔧 OPTIONAL: Auto-open DevTools during development
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* ========= EXIT KIOSK (ADMIN ONLY) ========= */

function isValidAdminSession(token) {
  const normalized = String(token || '');
  const expiresAt = adminSessions.get(normalized);
  if (!expiresAt || expiresAt < Date.now()) {
    adminSessions.delete(normalized);
    return false;
  }
  return true;
}

ipcMain.handle('admin-validate-pin', (event, pin) => {
  const senderKey = event.sender.id;
  const failure = failedPinAttempts.get(senderKey) || { count: 0, lockedUntil: 0 };
  if (failure.lockedUntil > Date.now()) {
    return { success: false, lockedUntil: failure.lockedUntil };
  }

  if (!adminSettings.validate(String(pin || ''))) {
    failure.count += 1;
    failure.lockedUntil = failure.count >= 5 ? Date.now() + 60_000 : 0;
    if (failure.lockedUntil) failure.count = 0;
    failedPinAttempts.set(senderKey, failure);
    return { success: false, lockedUntil: failure.lockedUntil || null };
  }

  failedPinAttempts.delete(senderKey);
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, Date.now() + ADMIN_SESSION_TTL_MS);
  return { success: true, token, expiresInMs: ADMIN_SESSION_TTL_MS };
});

ipcMain.handle('admin-change-pin', (_event, payload = {}) => {
  if (!isValidAdminSession(payload.token)) {
    return { success: false, error: 'Administrator session expired.' };
  }
  return adminSettings.change(payload.currentPin, payload.newPin);
});

ipcMain.handle('admin-save-kiosk-device-key', (event, payload = {}) => {
  if (BrowserWindow.fromWebContents(event.sender) !== mainWindow || !isValidAdminSession(payload.token)) {
    return { success: false, error: 'Administrator authorization required.' };
  }
  return adminSettings.setKioskDeviceKey(payload.key, safeStorage);
});

ipcMain.handle('kiosk-create-qr-workout', async (event, payload = {}) => {
  if (BrowserWindow.fromWebContents(event.sender) !== mainWindow) {
    return { success: false, error: 'Kiosk window authorization required.' };
  }
  const workoutId = String(payload.workoutId || '');
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(workoutId) || !payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
    return { success: false, error: 'Invalid workout export.' };
  }
  const key = adminSettings.getKioskDeviceKey(safeStorage);
  if (!key) return { success: false, error: 'Kiosk device key is not configured. Set it in Render and Admin Settings.' };
  let baseUrl;
  try {
    baseUrl = new URL(String(payload.baseUrl || ''));
  } catch (_error) {
    return { success: false, error: 'Invalid QR server address.' };
  }
  const publicHosts = new Set(['app.rdpsplace.me', 'www.rdpsstrengthandconditioning.ca', 'rdpsstrengthandconditioning.ca', 'gymkioskapp.onrender.com']);
  const isLocal = ['localhost', '127.0.0.1'].includes(baseUrl.hostname) && baseUrl.port === '3001';
  if (!(baseUrl.protocol === 'https:' && publicHosts.has(baseUrl.hostname)) && !(baseUrl.protocol === 'http:' && isLocal)) {
    return { success: false, error: 'QR server is not an approved GymKiosk address.' };
  }
  try {
    const response = await fetch(new URL('/api/workouts/create', baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-gymkiosk-key': key },
      body: JSON.stringify({ workoutId, data: payload.data, analyticsSyncToken: payload.analyticsSyncToken }),
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return { success: false, error: `Workout export failed (HTTP ${response.status}).` };
    return { success: true, ...(await response.json()) };
  } catch (error) {
    return { success: false, error: 'Unable to reach the workout server.' };
  }
});

ipcMain.handle('exit-app', (_event, token) => {
  if (!isValidAdminSession(token)) {
    return { success: false, error: 'Administrator authorization required.' };
  }
  console.log('EXIT APP RECEIVED FROM ADMIN');
  setImmediate(() => app.quit());
  return { success: true };
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
    console.error('Failed to write admin audit log:', error.message);
    return { success: false, error: error.message };
  }
});

/* ========= APP LIFECYCLE ========= */

function isLocalServerAvailable() {
  return new Promise((resolve) => {
    const request = http.get('http://127.0.0.1:3001/api/health', (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.setTimeout(1500, () => { request.destroy(); resolve(false); });
    request.on('error', () => resolve(false));
  });
}

async function startLocalServer() {
  if (await isLocalServerAvailable()) return;
  const syncEnvironment = adminSettings.getSyncEnvironment();
  serverProcess = spawn(process.execPath, [path.join(ROOT_DIR, 'server.js')], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      GYMKIOSK_DATA_DIR: resolveDataDirectory(),
      ...syncEnvironment
    },
    windowsHide: true,
    stdio: 'ignore'
  });
  serverProcess.on('error', (error) => console.error('Local server failed to start:', error.message));
  serverProcess.on('exit', (code) => {
    if (code && !app.isQuitting) console.error(`Local server exited with code ${code}`);
    serverProcess = null;
  });
}

app.whenReady().then(() => {
  adminSettings = createAdminSettings(path.dirname(resolveDataDirectory()));
  startLocalServer().catch((error) => console.error('Unable to start local server:', error.message));
  const autoStartEnabled = getKioskAutoStartSetting();
  applyKioskAutoStartOnBoot(autoStartEnabled);
  createWindow();
});

app.on('window-all-closed', () => {
  // On Windows, quit when window closes
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});
