/* =========================================
   PRELOAD.JS – ELECTRON IPC BRIDGE
========================================= */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  validateAdminPin: (pin) => ipcRenderer.invoke('admin-validate-pin', pin),
  changeAdminPin: (payload) => ipcRenderer.invoke('admin-change-pin', payload),
  exitApp: (token) => ipcRenderer.invoke('exit-app', token),
  logAdminAction: (payload) => ipcRenderer.invoke('log-admin-action', payload)
});

console.log('PRELOAD.JS LOADED');
