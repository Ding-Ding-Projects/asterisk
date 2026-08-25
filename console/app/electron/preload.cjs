const { contextBridge, ipcRenderer } = require('electron');

const api = Object.freeze({
  platform: process.platform,
  window: Object.freeze({
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
    setTitle: title => ipcRenderer.send('window:set-title', title),
  }),
  controlPlane: Object.freeze({
    request: request => ipcRenderer.invoke('control-plane:request', request),
  }),
  updater: Object.freeze({
    getStatus: () => ipcRenderer.invoke('updater:get-status'),
    checkNow: () => ipcRenderer.invoke('updater:check-now'),
    restartToInstall: () => ipcRenderer.invoke('updater:restart-to-install'),
    setUnsavedDraftCount: count => ipcRenderer.send('updater:set-draft-count', count),
    dismiss: () => ipcRenderer.send('updater:dismiss'),
    onStatus: listener => {
      const handler = (_event, status) => listener(status);
      ipcRenderer.on('updater:status', handler);
      return () => ipcRenderer.removeListener('updater:status', handler);
    },
  }),
  accessibility: Object.freeze({
    isScreenReaderActive: () => ipcRenderer.invoke('accessibility:is-screen-reader-active'),
    onChange: listener => {
      const handler = (_event, active) => listener(active);
      ipcRenderer.on('accessibility:changed', handler);
      return () => ipcRenderer.removeListener('accessibility:changed', handler);
    },
  }),
});

contextBridge.exposeInMainWorld('dingDesktop', api);
