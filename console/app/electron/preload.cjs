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
  externalEditor: Object.freeze({
    detect: () => ipcRenderer.invoke('external-editor:detect'),
    choose: editorId => ipcRenderer.invoke('external-editor:choose', editorId),
    saveCustom: record => ipcRenderer.invoke('external-editor:save-custom', record),
    removeCustom: editorId => ipcRenderer.invoke('external-editor:remove-custom', editorId),
    pickExecutable: () => ipcRenderer.invoke('external-editor:pick-executable'),
    openDownload: editorId => ipcRenderer.invoke('external-editor:open-download', editorId),
    openProjectFolder: editorId => ipcRenderer.invoke('external-editor:open-project', editorId),
    launch: (target, editorId) => ipcRenderer.invoke('external-editor:launch', target, editorId),
    openExport: input => ipcRenderer.invoke('external-editor:open-export', input),
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
