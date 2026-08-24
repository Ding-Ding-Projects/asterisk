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
  externalEditor: {
    detect: () => ipcRenderer.invoke('external-editor:detect'),
    getStatus: () => ipcRenderer.invoke('external-editor:detect'),
    onStatus: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, status) => listener(status);
      ipcRenderer.on('external-editor:status', handler);
      return () => ipcRenderer.removeListener('external-editor:status', handler);
    },
    choose: (editorId: string) => ipcRenderer.invoke('external-editor:choose', editorId),
    clearChoice: () => ipcRenderer.invoke('external-editor:clear-choice'),
    resetStorage: () => ipcRenderer.invoke('external-editor:reset-storage'),
    cancelOperation: (operationId: string) => ipcRenderer.invoke('external-editor:cancel', operationId),
    saveCustom: (record) => ipcRenderer.invoke('external-editor:save-custom', record),
    removeCustom: (editorId: string) => ipcRenderer.invoke('external-editor:remove-custom', editorId),
    savePortable: (executable: string) => ipcRenderer.invoke('external-editor:save-portable', executable),
    pickExecutable: () => ipcRenderer.invoke('external-editor:pick-executable'),
    pickFolder: () => ipcRenderer.invoke('external-editor:pick-folder'),
    openDownload: (editorId?: string) => ipcRenderer.invoke('external-editor:open-download', editorId),
    openProjectFolder: (folder: string, editorId?: string) => ipcRenderer.invoke('external-editor:open-project', folder, editorId),
    launch: (target, editorId) => ipcRenderer.invoke('external-editor:launch', target, editorId),
    openExport: (input) => ipcRenderer.invoke('external-editor:open-export', input),
    openMaterializedFile: (input) => ipcRenderer.invoke('external-editor:open-materialized-file', input),
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
