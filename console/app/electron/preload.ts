import { contextBridge, ipcRenderer } from 'electron';
import type { ControlPlaneRequest, ControlPlaneResponse, DingDesktopApi, NativeHostStatus, UpdaterStatusForRenderer, UpdaterRestartResult } from '../../shared/control-plane.js';
import type { DownloadCommand, DownloadSurfaceKind, DownloadTransferReceipt, DownloadTransferSnapshot, ExtensionDownloadHandoff } from '../../shared/download-transfer.js';

const api: DingDesktopApi = {
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
  dialog: {
    pickFolder: () => ipcRenderer.invoke('dialog:pick-folder') as Promise<string | undefined>,
  },
  controlPlane: {
    request: (request: ControlPlaneRequest) => ipcRenderer.invoke('control-plane:request', request) as Promise<ControlPlaneResponse>,
  },
  school: {
    setCredential: (value: string) => ipcRenderer.invoke('school:set-credential', value) as Promise<{ ok: boolean; reason?: string }>,
    verifyCredential: (value: string) => ipcRenderer.invoke('school:verify-credential', value) as Promise<{ ok: boolean; reason?: string }>,
    recoveryPath: () => ipcRenderer.invoke('school:recovery-path') as Promise<{ ok: boolean; path?: string; reason?: string }>,
  },
  statusHub: { baseUrl: process.env.STATUS_HUB_URL },
  nativeHost: {
    getStatus: () => ipcRenderer.invoke('native-host:get-status') as Promise<NativeHostStatus>,
    register: () => ipcRenderer.invoke('native-host:register') as Promise<NativeHostStatus>,
    onStatus: (listener: (status: NativeHostStatus) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: NativeHostStatus) => listener(status);
      ipcRenderer.on('native-host:status', handler);
      return () => ipcRenderer.removeListener('native-host:status', handler);
    },
  },
  downloads: {
    listPendingHandoffs: () => ipcRenderer.invoke('download:handoffs') as Promise<ExtensionDownloadHandoff[]>,
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
    onHandoff: (listener: (handoff: ExtensionDownloadHandoff) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, handoff: ExtensionDownloadHandoff) => listener(handoff);
      ipcRenderer.on('download:handoff', handler);
      return () => ipcRenderer.removeListener('download:handoff', handler);
    },
    onHandoffCancelled: (listener: (handoffId: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, handoffId: string) => listener(handoffId);
      ipcRenderer.on('download:handoff-cancelled', handler);
      return () => ipcRenderer.removeListener('download:handoff-cancelled', handler);
    },
    closeWindow: (kind: DownloadSurfaceKind) => ipcRenderer.invoke('download:close-window', kind) as Promise<void>,
    openWindow: (kind: DownloadSurfaceKind) => ipcRenderer.invoke('download:open-window', kind) as Promise<void>,
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
