import { contextBridge, ipcRenderer } from "electron";
import type { DeployTarget, DeployResult, DeployStepReport } from "../../control-plane/deploy-orchestrator.js";
import type { ApprovedSshTargetRecord } from "../../control-plane/ssh-identity-store.js";

export interface DeployerBridge {
  detectTargets(): Promise<{ localVm: { available: boolean; version?: string; reason?: string; appliancePresent: boolean } }>;
  listApprovedSshIdentities(): Promise<ReadonlyArray<ApprovedSshTargetRecord>>;
  addSshIdentity(host: string, port: number, user: string, label?: string): Promise<{ ok: boolean; reason?: string }>;
  deploy(target: DeployTarget): Promise<DeployResult>;
  removeLocalVm(): Promise<{ ok: boolean; detail: string }>;
  onProgress(listener: (step: DeployStepReport) => void): () => void;
  windowControls: {
    minimize(): void;
    toggleMaximize(): void;
    close(): void;
  };
}

const bridge: DeployerBridge = {
  detectTargets: () => ipcRenderer.invoke("deployer:detect-targets"),
  listApprovedSshIdentities: () => ipcRenderer.invoke("deployer:list-ssh-identities"),
  addSshIdentity: (host, port, user, label) => ipcRenderer.invoke("deployer:add-ssh-identity", host, port, user, label),
  deploy: (target) => ipcRenderer.invoke("deployer:deploy", target),
  removeLocalVm: () => ipcRenderer.invoke("deployer:remove-local-vm"),
  onProgress: (listener) => {
    const handler = (_event: unknown, step: DeployStepReport) => listener(step);
    ipcRenderer.on("deployer:progress", handler);
    return () => ipcRenderer.removeListener("deployer:progress", handler);
  },
  windowControls: {
    minimize: () => ipcRenderer.send("window:minimize"),
    toggleMaximize: () => ipcRenderer.send("window:toggle-maximize"),
    close: () => ipcRenderer.send("window:close"),
  },
};

contextBridge.exposeInMainWorld("deployer", bridge);
