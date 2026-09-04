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
  // Pre-existing drift, fixed alongside the new exports below rather than left for the
  // next reader to rediscover: `preload.ts` has always declared `provisioning`, but this
  // is the file Electron actually loads (see `main.ts`'s `webPreferences.preload`), so
  // `window.dingDesktop.provisioning` was never really there and live deploy progress
  // never had anywhere to subscribe.
  provisioning: Object.freeze({
    onStep: listener => {
      const handler = (_event, step) => listener(step);
      ipcRenderer.on('provision:step', handler);
      return () => ipcRenderer.removeListener('provision:step', handler);
    },
  }),
  editors: Object.freeze({
    detect: () => ipcRenderer.invoke('editors:detect'),
    open: target => ipcRenderer.invoke('editors:open', target),
  }),
  localData: Object.freeze({
    path: () => ipcRenderer.invoke('local-data:path'),
    openFolder: () => ipcRenderer.invoke('local-data:open-folder'),
  }),
  // The `ding-pbx://` product route's renderer end. `pending` is pulled once on mount and
  // is also the signal that tells the main process a listener exists here, so a link
  // arriving later is pushed rather than queued behind a listener that never registered.
  deepLink: Object.freeze({
    pending: () => ipcRenderer.invoke('deep-link:pending'),
    onNavigate: listener => {
      const handler = (_event, delivery) => listener(delivery);
      ipcRenderer.on('deep-link:navigate', handler);
      return () => ipcRenderer.removeListener('deep-link:navigate', handler);
    },
  }),
});

contextBridge.exposeInMainWorld('dingDesktop', api);
