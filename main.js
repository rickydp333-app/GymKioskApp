/* =========================================
   MAIN.JS – WINDOWS KIOSK SAFE
========================================= */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const KIOSK_SETTINGS_PATH = path.join(DATA_DIR, 'kiosk-settings.json');

try {
  // Keep Chromium storage (including localStorage profiles) in a persistent path.
  const sessionDataPath = path.join(app.getPath('appData'), 'GymKioskApp', 'session-kiosk');
  fs.mkdirSync(sessionDataPath, { recursive: true });
  app.setPath('sessionData', sessionDataPath);
} catch (_error) {
}

let mainWindow;
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
      devTools: isDev || process.env.GYMKIOSK_DEVTOOLS === '1'
    }
  });
  mainWindow.loadFile('index.html');

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

ipcMain.handle('exit-app', () => {
  console.log('EXIT APP RECEIVED FROM ADMIN');
  app.quit();
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

app.whenReady().then(() => {
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