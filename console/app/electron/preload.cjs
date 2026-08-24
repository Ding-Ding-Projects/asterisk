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
    clearChoice: () => ipcRenderer.invoke('external-editor:clear-choice'),
    resetStorage: () => ipcRenderer.invoke('external-editor:reset-storage'),
    cancelOperation: operationId => ipcRenderer.invoke('external-editor:cancel', operationId),
    saveCustom: record => ipcRenderer.invoke('external-editor:save-custom', record),
    removeCustom: editorId => ipcRenderer.invoke('external-editor:remove-custom', editorId),
    savePortable: executable => ipcRenderer.invoke('external-editor:save-portable', executable),
    pickExecutable: () => ipcRenderer.invoke('external-editor:pick-executable'),
    pickFolder: () => ipcRenderer.invoke('external-editor:pick-folder'),
    openDownload: editorId => ipcRenderer.invoke('external-editor:open-download', editorId),
    openProjectFolder: (folder, editorId) => ipcRenderer.invoke('external-editor:open-project', folder, editorId),
    launch: (target, editorId) => ipcRenderer.invoke('external-editor:launch', target, editorId),
    openExport: input => ipcRenderer.invoke('external-editor:open-export', input),
    openMaterializedFile: input => ipcRenderer.invoke('external-editor:open-materialized-file', input),
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
