/**
 * The preload script, hand-maintained in CommonJS.
 *
 * This package is `"type": "module"`, so the compiler emits `preload.js` as an ES
 * module. A sandboxed Electron preload cannot be an ES module: it is loaded before the
 * page and outside the module system, so the `import` statements at the top of the
 * emitted file never run and `contextBridge.exposeInMainWorld` is never reached.
 *
 * Nothing reports this. The window opens, the preload is found at the path the main
 * process names, and the renderer simply sees `window.deployer` as `undefined` and
 * throws on first use. It renders as a blank white window.
 *
 * The console solves the same problem the same way, in `console/app/electron/preload.cjs`.
 * The cost is that this file and `preload.ts` must be kept in step by hand; the type
 * definition in `preload.ts` remains the contract, and this is its runtime twin.
 */
const { contextBridge, ipcRenderer } = require('electron');

const bridge = {
  detectTargets: () => ipcRenderer.invoke('deployer:detect-targets'),
  listApprovedSshIdentities: () => ipcRenderer.invoke('deployer:list-ssh-identities'),
  addSshIdentity: (host, port, user, label) =>
    ipcRenderer.invoke('deployer:add-ssh-identity', host, port, user, label),
  deploy: (target) => ipcRenderer.invoke('deployer:deploy', target),
  removeLocalVm: () => ipcRenderer.invoke('deployer:remove-local-vm'),
  onProgress: (listener) => {
    const handler = (_event, step) => listener(step);
    ipcRenderer.on('deployer:progress', handler);
    return () => ipcRenderer.removeListener('deployer:progress', handler);
  },
  windowControls: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
};

contextBridge.exposeInMainWorld('deployer', bridge);
