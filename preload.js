/* =========================================
   PRELOAD.JS – ELECTRON IPC BRIDGE
========================================= */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  exitApp: () => ipcRenderer.invoke('exit-app'),
  logAdminAction: (payload) => ipcRenderer.invoke('log-admin-action', payload)
});

console.log('PRELOAD.JS LOADED');