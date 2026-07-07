const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('flipClock', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  onSettings: (callback) => ipcRenderer.on('settings:changed', (_event, settings) => callback(settings)),
  restartClock: () => ipcRenderer.invoke('clock:restart'),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  platform: process.platform
});
