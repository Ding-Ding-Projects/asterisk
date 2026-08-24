import { contextBridge, ipcRenderer } from 'electron';
import type { ControlPlaneRequest, ControlPlaneResponse, DingDesktopApi, UpdaterStatusForRenderer, UpdaterRestartResult } from '../../shared/control-plane.js';
import type { DownloadCommand, DownloadTransferReceipt, DownloadTransferSnapshot, ExtensionDownloadHandoff } from '../../shared/download-transfer.js';

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
  statusHub: { baseUrl: process.env.STATUS_HUB_URL },
  downloads: {
    start: (handoff: ExtensionDownloadHandoff) => ipcRenderer.invoke('download:start', handoff) as Promise<DownloadTransferReceipt>,
    cancelHandoff: (handoffId: string) => ipcRenderer.invoke('download:cancel-handoff', handoffId) as Promise<DownloadTransferReceipt>,
    command: (transferId: string, command: Exclude<DownloadCommand, 'start'>) => ipcRenderer.invoke('download:command', transferId, command) as Promise<DownloadTransferReceipt>,
    getSnapshot: (transferId: string) => ipcRenderer.invoke('download:snapshot', transferId) as Promise<DownloadTransferSnapshot | undefined>,
    subscribe: (transferId: string, listener: (snapshot: DownloadTransferSnapshot) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, snapshot: DownloadTransferSnapshot) => { if (snapshot.transferId === transferId) listener(snapshot); };
      ipcRenderer.on('download:snapshot', handler);
      void ipcRenderer.invoke('download:snapshot', transferId).then((snapshot: DownloadTransferSnapshot | undefined) => { if (snapshot) listener(snapshot); });
      return () => ipcRenderer.removeListener('download:snapshot', handler);
    },
    submitHandoff: (handoff: ExtensionDownloadHandoff) => ipcRenderer.invoke('download:submit-handoff', handoff),
    onHandoff: (listener: (handoff: ExtensionDownloadHandoff) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, handoff: ExtensionDownloadHandoff) => listener(handoff);
      ipcRenderer.on('download:handoff', handler);
      return () => ipcRenderer.removeListener('download:handoff', handler);
    },
  },
  converter: {
    pickFile: () => ipcRenderer.invoke('converter:pick-file'),
    pickDestination: () => ipcRenderer.invoke('converter:pick-destination'),
    confirmOverwrite: (request: { destinationPath: string }) => ipcRenderer.invoke('converter:confirm-overwrite', request),
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
