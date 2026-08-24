const { contextBridge, ipcRenderer } = require('electron');

const api = Object.freeze({
  platform: process.platform,
  window: Object.freeze({
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
  }),
  controlPlane: Object.freeze({
    request: request => ipcRenderer.invoke('control-plane:request', request),
  }),
  school: Object.freeze({
    setCredential: value => ipcRenderer.invoke('school:set-credential', value),
    verifyCredential: value => ipcRenderer.invoke('school:verify-credential', value),
    recoveryPath: () => ipcRenderer.invoke('school:recovery-path'),
    packagedVaultProbe: expected => ipcRenderer.invoke('school:packaged-vault-probe', expected),
  }),
  accessibility: Object.freeze({
    isScreenReaderActive: () => ipcRenderer.invoke('accessibility:screen-reader'),
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
});

contextBridge.exposeInMainWorld('dingDesktop', api);
