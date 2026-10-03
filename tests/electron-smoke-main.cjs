'use strict';

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const screenshotPath = process.env.GYMKIOSK_SCREENSHOT || path.join(app.getPath('temp'), 'gymkiosk-smoke.png');
const errors = [];

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    webPreferences: {
      preload: path.join(ROOT, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.webContents.on('console-message', (_event, details) => {
    if (details.level === 'error') errors.push(details.message);
  });
  window.webContents.on('render-process-gone', (_event, details) => errors.push(`renderer:${details.reason}`));

  await window.loadFile(path.join(ROOT, 'index.html'));
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const title = await window.webContents.executeJavaScript('document.title');
  const visibleScreen = await window.webContents.executeJavaScript(`
    Array.from(document.querySelectorAll('.screen')).find((node) => !node.classList.contains('hidden'))?.id || null
  `);
  const biometricMenuMatches = await window.webContents.executeJavaScript(`
    (document.body.innerText.match(/Face Login|Face Recognition|Voice Recognition|Preferred Speaker Output/gi) || []).length
  `);
  let screensaverState = null;
  if (process.env.GYMKIOSK_TEST_SCREENSAVER === '1') {
    await window.webContents.executeJavaScript('window.triggerScreensaverTest()');
    const ready = await window.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const startedAt = Date.now();
        const check = () => {
          const overlay = document.getElementById('tutorialScreensaverOverlay');
          const frame = document.getElementById('tutorialScreensaverFrame');
          const fallback = overlay?.querySelector('[role="status"]');
          const state = {
            overlayVisible: overlay?.style.display === 'block',
            frameVisible: frame?.style.visibility === 'visible',
            fallbackVisible: !!fallback && fallback.style.display !== 'none',
            frameUrl: frame?.src || null
          };
          if (state.frameVisible || Date.now() - startedAt > 6000) resolve(state);
          else setTimeout(check, 100);
        };
        check();
      })
    `);
    screensaverState = ready;
    if (!ready.frameVisible) errors.push('screensaver tutorial iframe did not signal ready');
  }
  const image = await window.webContents.capturePage();
  fs.writeFileSync(screenshotPath, image.toPNG());

  console.log(JSON.stringify({ title, visibleScreen, biometricMenuMatches, screensaverState, screenshotPath, errors }, null, 2));
  app.exit(errors.length ? 1 : 0);
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
