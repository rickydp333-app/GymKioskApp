const { contextBridge, ipcRenderer } = require('electron');
let adminToken = null;

contextBridge.exposeInMainWorld('adminDesktop', {
  validatePin: async (pin) => {
    const result = await ipcRenderer.invoke('admin-validate-pin', pin);
    adminToken = result?.success ? result.token : null;
    return !!result?.success;
  },
  startKioskApp: () => ipcRenderer.invoke('admin-start-kiosk', adminToken),
  exitKioskApp: () => ipcRenderer.invoke('admin-exit-kiosk', adminToken),
  getKioskAutoStartEnabled: () => ipcRenderer.invoke('admin-get-kiosk-autostart', adminToken),
  setKioskAutoStartEnabled: (enabled) => ipcRenderer.invoke('admin-set-kiosk-autostart', { token: adminToken, enabled }),
  openKioskAdminPanel: () => ipcRenderer.invoke('admin-open-kiosk-admin-panel', adminToken),
  getReport: (reportType) => ipcRenderer.invoke('admin-get-report', { token: adminToken, reportType }),
  exportReport: (reportType, format) => ipcRenderer.invoke('admin-export-report', { token: adminToken, reportType, format }),
  logAdminAction: (payload) => ipcRenderer.invoke('log-admin-action', payload)
});
