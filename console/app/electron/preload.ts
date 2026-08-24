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
  school: {
    setCredential: (value: string) => ipcRenderer.invoke('school:set-credential', value) as Promise<{ ok: boolean; reason?: string }>,
    verifyCredential: (value: string) => ipcRenderer.invoke('school:verify-credential', value) as Promise<{ ok: boolean; reason?: string }>,
    recoveryPath: () => ipcRenderer.invoke('school:recovery-path') as Promise<{ ok: boolean; path?: string; reason?: string }>,
    packagedVaultProbe: (expected: { product: string; packageVersion: string; candidateCommit: string; appId: string }) => ipcRenderer.invoke('school:packaged-vault-probe', expected) as Promise<{ provenanceMatched: boolean; writeSucceeded: boolean; readMatched: boolean; deleteSucceeded: boolean; absentAfterDelete: boolean }>,
  },
  accessibility: {
    isScreenReaderActive: () => ipcRenderer.invoke('accessibility:screen-reader') as Promise<boolean>,
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
};

contextBridge.exposeInMainWorld('dingDesktop', api);
