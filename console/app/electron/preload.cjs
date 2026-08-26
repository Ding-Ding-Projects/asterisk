const { contextBridge, ipcRenderer } = require('electron');

const api = Object.freeze({
  platform: process.platform,
  window: Object.freeze({
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
  }),
  dialog: Object.freeze({
    pickFolder: () => ipcRenderer.invoke('dialog:pick-folder'),
  }),
  controlPlane: Object.freeze({
    request: request => ipcRenderer.invoke('control-plane:request', request),
  }),
  school: Object.freeze({
    setCredential: value => ipcRenderer.invoke('school:set-credential', value),
    verifyCredential: value => ipcRenderer.invoke('school:verify-credential', value),
    recoveryPath: () => ipcRenderer.invoke('school:recovery-path'),
  }),
  statusHub: Object.freeze({ baseUrl: process.env.STATUS_HUB_URL }),
  nativeHost: Object.freeze({
    getStatus: () => ipcRenderer.invoke('native-host:get-status'),
    register: () => ipcRenderer.invoke('native-host:register'),
    onStatus: listener => {
      const handler = (_event, status) => listener(status);
      ipcRenderer.on('native-host:status', handler);
      return () => ipcRenderer.removeListener('native-host:status', handler);
    },
  }),
  downloads: Object.freeze({
    listPendingHandoffs: () => ipcRenderer.invoke('download:handoffs'),
    start: handoff => ipcRenderer.invoke('download:start', handoff),
    cancelHandoff: handoffId => ipcRenderer.invoke('download:cancel-handoff', handoffId),
    command: (transferId, command) => ipcRenderer.invoke('download:command', transferId, command),
    getSnapshot: transferId => ipcRenderer.invoke('download:snapshot', transferId),
    subscribe: (transferId, listener) => {
      const handler = (_event, snapshot) => { if (snapshot.transferId === transferId) listener(snapshot); };
      ipcRenderer.on('download:snapshot', handler);
      void ipcRenderer.invoke('download:snapshot', transferId).then(snapshot => { if (snapshot) listener(snapshot); });
      return () => ipcRenderer.removeListener('download:snapshot', handler);
    },
    onHandoff: listener => {
      const handler = (_event, handoff) => listener(handoff);
      ipcRenderer.on('download:handoff', handler);
      return () => ipcRenderer.removeListener('download:handoff', handler);
    },
    onHandoffCancelled: listener => {
      const handler = (_event, handoffId) => listener(handoffId);
      ipcRenderer.on('download:handoff-cancelled', handler);
      return () => ipcRenderer.removeListener('download:handoff-cancelled', handler);
    },
    closeWindow: kind => ipcRenderer.invoke('download:close-window', kind),
    openWindow: kind => ipcRenderer.invoke('download:open-window', kind),
  }),
  converter: Object.freeze({
    pickFile: () => ipcRenderer.invoke('converter:pick-file'),
    pickDestination: () => ipcRenderer.invoke('converter:pick-destination'),
    confirmOverwrite: request => ipcRenderer.invoke('converter:confirm-overwrite', request),
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
