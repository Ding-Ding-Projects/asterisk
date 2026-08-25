import { contextBridge, ipcRenderer } from 'electron';
import type { ControlPlaneRequest, ControlPlaneResponse, DingDesktopApi, UpdaterStatusForRenderer, UpdaterRestartResult } from '../../shared/control-plane.js';

const api: DingDesktopApi = {
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
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
  editors: {
    detect: () => ipcRenderer.invoke('editors:detect') as ReturnType<NonNullable<DingDesktopApi['editors']>['detect']>,
    open: (target: { kind: 'file' | 'folder'; path: string }) => ipcRenderer.invoke('editors:open', target) as ReturnType<NonNullable<DingDesktopApi['editors']>['open']>,
  },
  localData: {
    path: () => ipcRenderer.invoke('local-data:path') as ReturnType<NonNullable<DingDesktopApi['localData']>['path']>,
    openFolder: () => ipcRenderer.invoke('local-data:open-folder') as ReturnType<NonNullable<DingDesktopApi['localData']>['openFolder']>,
  },
};

contextBridge.exposeInMainWorld('dingDesktop', api);
