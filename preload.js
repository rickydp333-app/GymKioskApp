/* =========================================
   PRELOAD.JS – ELECTRON IPC BRIDGE
========================================= */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  protectUserPin: (pin) => ipcRenderer.invoke('user-pin-protect', pin),
  revealUserPin: (payload) => ipcRenderer.invoke('admin-user-pin-reveal', payload),
  validateAdminPin: (pin) => ipcRenderer.invoke('admin-validate-pin', pin),
  racquetballSignUp: (payload) => ipcRenderer.invoke('racquetball-sign-up', payload),
  racquetballLogIn: (payload) => ipcRenderer.invoke('racquetball-log-in', payload),
  racquetballListMembers: (payload) => ipcRenderer.invoke('racquetball-list-members', payload),
  racquetballResetPin: (payload) => ipcRenderer.invoke('racquetball-reset-pin', payload),
  leagueRequest: (payload) => ipcRenderer.invoke('racquetball-league-request', payload),
  changeAdminPin: (payload) => ipcRenderer.invoke('admin-change-pin', payload),
  saveKioskDeviceKey: (payload) => ipcRenderer.invoke('admin-save-kiosk-device-key', payload),
  createKioskQrWorkout: (payload) => ipcRenderer.invoke('kiosk-create-qr-workout', payload),
  exitApp: (token) => ipcRenderer.invoke('exit-app', token),
  logAdminAction: (payload) => ipcRenderer.invoke('log-admin-action', payload)
});

console.log('PRELOAD.JS LOADED');
