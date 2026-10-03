(() => {
  const appEl = document.getElementById('adminDesktopApp');
  const statusEl = document.getElementById('adminDesktopStatus');
  const reportsPanelEl = document.getElementById('reportsPanel');
  const reportOutputEl = document.getElementById('reportOutput');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const serverQrStatusBtn = document.getElementById('serverQrStatusBtn');
  const exitKioskBtn = document.getElementById('exitKioskBtn');
  const shutdownKioskBtn = document.getElementById('shutdownKioskBtn');
  const toggleStartupBtn = document.getElementById('toggleStartupBtn');

  const pinModalEl = document.getElementById('adminPinModalDesktop');
  const pinDisplayEl = document.getElementById('adminPinDisplayDesktop');
  let enteredPin = '';
  let currentReportType = null;

  function setStatus(message) {
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  function updatePinDisplay() {
    if (!pinDisplayEl) return;
    const masked = enteredPin.padEnd(4, '•').split('').map((ch, index) => (index < enteredPin.length ? '•' : ch)).join('');
    pinDisplayEl.textContent = masked;
  }

  function formatReport(data) {
    return JSON.stringify(data, null, 2);
  }

  async function fetchJsonWithTimeout(url, timeoutMs = 4000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function handleServerQrStatus() {
    const baseCandidates = ['http://localhost:3001', 'http://127.0.0.1:3001'];

    setStatus('Checking Server/QR status...');

    let activeBase = null;
    let health = null;
    let info = null;
    let lastError = null;

    for (const baseUrl of baseCandidates) {
      try {
        health = await fetchJsonWithTimeout(`${baseUrl}/api/health`);
        info = await fetchJsonWithTimeout(`${baseUrl}/api/info`);
        activeBase = baseUrl;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    reportsPanelEl.classList.remove('hidden');
    currentReportType = null;

    if (!activeBase || !health || !info) {
      reportOutputEl.textContent = formatReport({
        status: 'offline',
        message: 'Server is not reachable for QR sharing.',
        checkedEndpoints: baseCandidates,
        error: lastError ? lastError.message : 'Unknown error',
        nextStep: 'Start the mobile server with npm run server or npm start.'
      });
      setStatus('Server/QR status: offline.');
      return;
    }

    const qrBaseUrl = `http://${info.ipAddress}:${info.port}`;

    reportOutputEl.textContent = formatReport({
      status: 'online',
      serverBaseUrl: activeBase,
      health,
      info,
      qrPreview: `${qrBaseUrl}/workout/{workoutId}`,
      timestamp: new Date().toISOString()
    });

    setStatus(`Server/QR status loaded (${info.ipAddress}:${info.port}).`);
    await window.adminDesktop.logAdminAction({
      action: 'admin_desktop_server_qr_status',
      details: `${activeBase} -> ${qrBaseUrl}`
    });
  }

  async function handleReportLoad(reportType) {
    setStatus(`Loading ${reportType}...`);
    const data = await window.adminDesktop.getReport(reportType);
    reportOutputEl.textContent = formatReport(data);
    currentReportType = reportType;
    setStatus(`${reportType} loaded.`);
  }

  async function handleExport(format) {
    if (!currentReportType) {
      setStatus('Load a report before exporting.');
      return;
    }

    setStatus(`Exporting ${currentReportType} as ${format.toUpperCase()}...`);
    const result = await window.adminDesktop.exportReport(currentReportType, format);

    if (result?.canceled) {
      setStatus('Export canceled.');
      return;
    }

    if (!result?.success) {
      setStatus(`Export failed: ${result?.error || 'Unknown error'}`);
      return;
    }

    setStatus(`Exported: ${result.filePath}`);
    await window.adminDesktop.logAdminAction({
      action: 'admin_desktop_export_report',
      details: `${currentReportType} -> ${format} -> ${result.filePath}`
    });
  }

  async function handleStartKiosk() {
    const result = await window.adminDesktop.startKioskApp();
    setStatus(result?.status === 'focused' ? 'Kiosk already running (focused).' : 'Kiosk started.');
    await window.adminDesktop.logAdminAction({ action: 'admin_desktop_start_kiosk', details: JSON.stringify(result || {}) });
  }

  async function handleOpenKioskAdmin() {
    const result = await window.adminDesktop.openKioskAdminPanel();
    setStatus(result?.status === 'focused' ? 'Kiosk admin panel focused.' : 'Kiosk admin panel opened.');
    await window.adminDesktop.logAdminAction({ action: 'admin_desktop_open_kiosk_admin', details: JSON.stringify(result || {}) });
  }

  async function handleExitKiosk() {
    const shouldExit = confirm('Exit the kiosk app now?');
    if (!shouldExit) {
      setStatus('Exit canceled.');
      return;
    }

    const result = await window.adminDesktop.exitKioskApp();
    if (result?.status === 'closed') {
      setStatus('Kiosk app closed.');
    } else {
      setStatus('Kiosk app is not running.');
    }

    await window.adminDesktop.logAdminAction({
      action: 'admin_desktop_exit_kiosk',
      details: JSON.stringify(result || {})
    });
  }

  function updateStartupButtonLabel(enabled) {
    if (!toggleStartupBtn) return;
    toggleStartupBtn.textContent = enabled ? '🚀 Startup: ON' : '🚀 Startup: OFF';
  }

  async function refreshStartupSetting() {
    if (!toggleStartupBtn) return;
    const result = await window.adminDesktop.getKioskAutoStartEnabled();
    updateStartupButtonLabel(result?.enabled !== false);
  }

  async function handleToggleStartup() {
    const current = await window.adminDesktop.getKioskAutoStartEnabled();
    const nextEnabled = !(current?.enabled !== false);
    const result = await window.adminDesktop.setKioskAutoStartEnabled(nextEnabled);

    if (!result?.success) {
      setStatus(`Failed to update startup setting: ${result?.error || 'Unknown error'}`);
      return;
    }

    updateStartupButtonLabel(result.enabled !== false);
    setStatus(`Kiosk startup on boot is now ${result.enabled ? 'enabled' : 'disabled'}.`);

    await window.adminDesktop.logAdminAction({
      action: 'admin_desktop_toggle_startup',
      details: `autoStartOnBoot=${result.enabled ? 'true' : 'false'}`
    });
  }

  function unlockApp() {
    pinModalEl.classList.add('hidden');
    appEl.classList.remove('hidden');
    setStatus('Authenticated.');
    refreshStartupSetting().catch((error) => setStatus(`Failed to read startup setting: ${error.message}`));
  }

  let loginPending = false;
  let loginGeneration = 0;
  const loginStatus = document.getElementById('adminLoginStatus');
  const cancelLogin = () => {
    loginGeneration++;
    enteredPin = '';
    updatePinDisplay();
    window.adminDesktop.cancelLogin();
  };
  document.getElementById('cancelAdminLogin').addEventListener('click', cancelLogin);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !pinModalEl.classList.contains('hidden')) cancelLogin();
  });
  async function validatePin() {
    if (loginPending) return;
    if (!/^\d{4,8}$/.test(enteredPin)) { loginStatus.textContent = 'Enter your 4–8 digit PIN.'; return; }
    loginPending = true;
    const generation = ++loginGeneration;
    loginStatus.textContent = 'Checking PIN…';
    let timer;
    try {
      const ok = await Promise.race([
        window.adminDesktop.validatePin(enteredPin),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Login timed out.')), 8000); })
      ]);
      if (generation !== loginGeneration) return;
      if (ok) { loginStatus.textContent = ''; unlockApp(); return; }
      loginStatus.textContent = 'PIN not accepted. Try again or cancel.';
    } catch (_) {
      if (generation === loginGeneration) loginStatus.textContent = 'Unable to check PIN. Try again or cancel.';
    } finally {
      clearTimeout(timer);
      loginPending = false;
      enteredPin = '';
      updatePinDisplay();
    }
  }

  pinModalEl.querySelectorAll('button[data-key]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.key;
      if (key === 'clear') {
        enteredPin = '';
        updatePinDisplay();
        return;
      }
      if (key === 'ok') {
        await validatePin();
        return;
      }
      if (/^\d$/.test(key) && enteredPin.length < 8) {
        enteredPin += key;
        updatePinDisplay();
      }
    });
  });

  document.getElementById('startKioskBtn').addEventListener('click', () => {
    handleStartKiosk().catch((error) => setStatus(`Failed to start kiosk: ${error.message}`));
  });

  document.getElementById('openKioskAdminBtn').addEventListener('click', () => {
    handleOpenKioskAdmin().catch((error) => setStatus(`Failed to open kiosk admin: ${error.message}`));
  });

  document.getElementById('openReportsBtn').addEventListener('click', () => {
    reportsPanelEl.classList.remove('hidden');
    setStatus('Reports panel opened.');
  });

  if (serverQrStatusBtn) {
    serverQrStatusBtn.addEventListener('click', () => {
      handleServerQrStatus().catch((error) => {
        setStatus(`Server/QR check failed: ${error.message}`);
      });
    });
  }

  if (exitKioskBtn) {
    exitKioskBtn.addEventListener('click', () => {
      handleExitKiosk().catch((error) => setStatus(`Failed to exit kiosk app: ${error.message}`));
    });
  }

  if (shutdownKioskBtn) {
    shutdownKioskBtn.addEventListener('click', () => {
      handleExitKiosk();
    });
  }

  if (toggleStartupBtn) {
    toggleStartupBtn.addEventListener('click', () => {
      handleToggleStartup().catch((error) => setStatus(`Failed to toggle startup setting: ${error.message}`));
    });
  }

  document.querySelectorAll('.report-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      handleReportLoad(btn.dataset.report).catch((error) => {
        setStatus(`Failed to load report: ${error.message}`);
      });
    });
  });

  exportJsonBtn.addEventListener('click', () => {
    handleExport('json').catch((error) => setStatus(`Export failed: ${error.message}`));
  });

  exportCsvBtn.addEventListener('click', () => {
    handleExport('csv').catch((error) => setStatus(`Export failed: ${error.message}`));
  });

  appEl.classList.add('hidden');
  updatePinDisplay();
})();
