const { app, BrowserWindow, session } = require('electron');

app.commandLine.appendSwitch('use-fake-ui-for-media-stream');

async function run() {
  const ses = session.defaultSession;

  ses.setPermissionCheckHandler((_wc, permission) => {
    return ['media', 'videoCapture', 'audioCapture'].includes(permission);
  });

  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(['media', 'videoCapture', 'audioCapture'].includes(permission));
  });

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false
    }
  });

  await win.loadURL('https://example.com');

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      const response = {
        href: location.href,
        protocol: location.protocol,
        isSecureContext: window.isSecureContext,
        apiAvailable: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
        beforeDevices: [],
        afterDevices: [],
        getUserMediaSuccess: false,
        getUserMediaError: null
      };

      if (!response.apiAvailable) {
        return response;
      }

      const simplify = list => list.map(d => ({
        kind: d.kind,
        label: d.label,
        deviceId: d.deviceId
      }));

      response.beforeDevices = simplify(await navigator.mediaDevices.enumerateDevices());

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        response.getUserMediaSuccess = true;
      } catch (error) {
        response.getUserMediaError = error && error.message ? error.message : String(error);
      }

      response.afterDevices = simplify(await navigator.mediaDevices.enumerateDevices());

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      return response;
    })();
  `);

  console.log(JSON.stringify(result, null, 2));
}

app.whenReady()
  .then(run)
  .then(() => app.quit())
  .catch((error) => {
    console.error('CAMERA_CHECK_FAILED');
    console.error(error && error.stack ? error.stack : String(error));
    app.exit(1);
  });
