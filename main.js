/* =========================================
   MAIN.JS – WINDOWS KIOSK SAFE
========================================= */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

try {
  const sessionDataPath = path.join(app.getPath('temp'), 'GymKioskApp', 'session-kiosk');
  fs.mkdirSync(sessionDataPath, { recursive: true });
  app.setPath('sessionData', sessionDataPath);
} catch (_error) {
}

let mainWindow;
const isDev = process.env.NODE_ENV !== 'production' || process.env.GYMKIOSK_DEVTOOLS === '1';
const autoOpenDevTools = isDev && process.env.GYMKIOSK_DEVTOOLS_AUTO_OPEN !== '0';

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
      devTools: isDev
    }
  });
  mainWindow.loadFile('index.html');

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // On Windows, quit when window closes
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});