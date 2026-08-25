import { contextBridge, ipcRenderer } from 'electron';
import type { ControlPlaneRequest, ControlPlaneResponse, DingDesktopApi, UpdaterStatusForRenderer, UpdaterRestartResult } from '../../shared/control-plane.js';

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
};

contextBridge.exposeInMainWorld('dingDesktop', api);
