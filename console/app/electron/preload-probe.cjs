const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dingDesktop', Object.freeze({
  school: Object.freeze({
    packagedVaultProbe: async expected => {
      const authorization = await ipcRenderer.invoke('school:probe-authorize');
      if (!authorization) return { provenanceMatched: false, writeSucceeded: false, readMatched: false, deleteSucceeded: false, absentAfterDelete: false, rejected: true };
      return ipcRenderer.invoke('school:packaged-vault-probe', authorization, expected);
    },
  }),
}));
