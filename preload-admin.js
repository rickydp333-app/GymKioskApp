const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('adminDesktop', {
  validatePin: (pin) => ipcRenderer.invoke('admin-validate-pin', pin),
  startKioskApp: () => ipcRenderer.invoke('admin-start-kiosk'),
  exitKioskApp: () => ipcRenderer.invoke('admin-exit-kiosk'),
  getKioskAutoStartEnabled: () => ipcRenderer.invoke('admin-get-kiosk-autostart'),
  setKioskAutoStartEnabled: (enabled) => ipcRenderer.invoke('admin-set-kiosk-autostart', enabled),
  openKioskAdminPanel: () => ipcRenderer.invoke('admin-open-kiosk-admin-panel'),
  getReport: (reportType) => ipcRenderer.invoke('admin-get-report', reportType),
  exportReport: (reportType, format) => ipcRenderer.invoke('admin-export-report', { reportType, format }),
  logAdminAction: (payload) => ipcRenderer.invoke('log-admin-action', payload)
});
