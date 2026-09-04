import { contextBridge, ipcRenderer } from 'electron';
import type { ControlPlaneRequest, ControlPlaneResponse, DingDesktopApi, UpdaterStatusForRenderer, UpdaterRestartResult } from '../../shared/control-plane.js';
import type { DeepLinkDelivery } from '../../shared/deep-link.js';

const api: DingDesktopApi = {
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
    setTitle: (title: string) => ipcRenderer.send('window:set-title', title),
  },
  controlPlane: {
    request: (request: ControlPlaneRequest) => ipcRenderer.invoke('control-plane:request', request) as Promise<ControlPlaneResponse>,
  },
  updater: {
    getStatus: () => ipcRenderer.invoke('updater:get-status') as Promise<UpdaterStatusForRenderer>,
    checkNow: () => ipcRenderer.invoke('updater:check-now') as Promise<UpdaterStatusForRenderer>,
    restartToInstall: () => ipcRenderer.invoke('updater:restart-to-install') as Promise<UpdaterRestartResult>,
    setUnsavedDraftCount: (count: number) => ipcRenderer.send('updater:set-draft-count', count),
    dismiss: () => ipcRenderer.send('updater:dismiss'),
    onStatus: (listener: (status: UpdaterStatusForRenderer) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: UpdaterStatusForRenderer) => listener(status);
      ipcRenderer.on('updater:status', handler);
      return () => ipcRenderer.removeListener('updater:status', handler);
    },
  },
  provisioning: {
    /** Returns its own unsubscribe, so a caller cannot leak a listener across reloads. */
    onStep: (listener: (step: { name: string; ok: boolean; detail: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, step: { name: string; ok: boolean; detail: string }) => listener(step);
      ipcRenderer.on('provision:step', handler);
      return () => ipcRenderer.removeListener('provision:step', handler);
    },
  },
  accessibility: {
    isScreenReaderActive: () => ipcRenderer.invoke('accessibility:is-screen-reader-active') as Promise<boolean>,
    onChange: (listener: (active: boolean) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, active: boolean) => listener(active);
      ipcRenderer.on('accessibility:changed', handler);
      return () => ipcRenderer.removeListener('accessibility:changed', handler);
    },
  },
  editors: {
    detect: () => ipcRenderer.invoke('editors:detect') as ReturnType<NonNullable<DingDesktopApi['editors']>['detect']>,
    open: (target: { kind: 'file' | 'folder'; path: string }) => ipcRenderer.invoke('editors:open', target) as ReturnType<NonNullable<DingDesktopApi['editors']>['open']>,
  },
  localData: {
    path: () => ipcRenderer.invoke('local-data:path') as ReturnType<NonNullable<DingDesktopApi['localData']>['path']>,
    openFolder: () => ipcRenderer.invoke('local-data:open-folder') as ReturnType<NonNullable<DingDesktopApi['localData']>['openFolder']>,
  },
  deepLink: {
    /** Pulled once on mount. Invoking it is also what tells the main process a listener
     *  exists on this side, so a link arriving later can be pushed rather than queued. */
    pending: () => ipcRenderer.invoke('deep-link:pending') as Promise<DeepLinkDelivery[]>,
    onNavigate: (listener: (delivery: DeepLinkDelivery) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, delivery: DeepLinkDelivery) => listener(delivery);
      ipcRenderer.on('deep-link:navigate', handler);
      return () => ipcRenderer.removeListener('deep-link:navigate', handler);
    },
  },
};

contextBridge.exposeInMainWorld('dingDesktop', api);
