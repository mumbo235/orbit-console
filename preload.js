const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('orbitNative', {
  isNative: true,
  onKey: cb => ipcRenderer.on('orbit-key', (_e, key) => cb(key)),
  quit: () => ipcRenderer.send('orbit-quit'),
  toggleFullscreen: () => ipcRenderer.send('orbit-fullscreen'),
});
