/**
 * Electron main process for the Ding PBX one-click deployer.
 *
 * Owns the privileged side of the deployment: the allowlisted process executor, the
 * hypervisor and SSH control-plane modules, the persisted SSH-target approval store,
 * and the health check. The renderer (the compiled console design shell, see
 * `DeployerShell.tsx`) never runs a command itself; it only asks the main process to
 * deploy and receives progress events back over IPC — the same separation the console
 * itself uses between its renderer and its control plane.
 */
import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NodeProcessExecutor } from "../../control-plane/executor.js";
import { DeployOrchestrator, type DeployTarget } from "../../control-plane/deploy-orchestrator.js";
import { HypervisorVmProvisioning, MANAGED_VM_NAME } from "../../control-plane/hypervisor-vm.js";
import { SshIdentityStore } from "../../control-plane/ssh-identity-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const executor = new NodeProcessExecutor({
  allowedExecutables: ["VBoxManage", "ssh"],
  defaultTimeoutMs: 30_000,
});

function userDataPath(...segments: string[]): string {
  return path.join(app.getPath("userData"), ...segments);
}

/**
 * Persisted across restarts, exactly like the known_hosts file below: a host that has
 * never been approved cannot be dialed even once, and a host that was approved stays
 * approved after the app restarts rather than silently re-opening to anything typed.
 */
const identityStore = new SshIdentityStore(userDataPath("ssh-identities.json"));

/**
 * Fixed, persistent path so a host key recorded on one run is still the key checked
 * against on every later run — the whole point of trust-on-first-use is that "first"
 * only happens once per host, ever, not once per app launch.
 */
const KNOWN_HOSTS_PATH = userDataPath("known_hosts");

function resourcePath(...segments: string[]): string {
  const base = app.isPackaged ? (process as NodeJS.Process & { resourcesPath: string }).resourcesPath : path.join(__dirname, "..", "..");
  return path.join(base, ...segments);
}

function readInstallScript(): string {
  try {
    return readFileSync(resourcePath("server", "install.sh"), "utf8");
  } catch {
    /* The server-mode lane's install script is not present in this build yet. The
     * orchestrator fails cleanly at the "copy install script" step rather than
     * silently deploying nothing. */
    return "";
  }
}

function appliancePathIfPresent(): string | undefined {
  const candidate = resourcePath("pbx", "ding-pbx.ova");
  try {
    readFileSync(candidate);
    return candidate;
  } catch {
    return undefined;
  }
}

let mainWindow: BrowserWindow | null = null;

function createOrchestrator(): DeployOrchestrator {
  return new DeployOrchestrator({
    executor,
    appliancePath: appliancePathIfPresent(),
    installScriptText: readInstallScript(),
    approvedSshIdentities: identityStore.identities(),
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  } else {
    mainWindow.loadURL("http://localhost:5175");
  }
}

ipcMain.handle("deployer:detect-targets", async () => {
  const orchestrator = createOrchestrator();
  return orchestrator.detectAvailableTargets();
});

ipcMain.handle("deployer:list-ssh-identities", async () => {
  await identityStore.load();
  return identityStore.list();
});

ipcMain.handle("deployer:add-ssh-identity", async (_event: Electron.IpcMainInvokeEvent, host: string, port: number, user: string, label?: string) => {
  return identityStore.add(host, port, user, label);
});

ipcMain.handle("deployer:deploy", async (event: Electron.IpcMainInvokeEvent, target: DeployTarget) => {
  const orchestrator = createOrchestrator();
  const sender = event.sender;
  const resolvedTarget: DeployTarget =
    target.kind === "ssh" ? { ...target, knownHostsPath: KNOWN_HOSTS_PATH } : target;
  return orchestrator.deploy(resolvedTarget, (step) => {
    if (!sender.isDestroyed()) sender.send("deployer:progress", step);
  });
});

/**
 * Scoped to exactly the deployer's own managed VM name — see `hypervisor-vm.ts` for
 * why `remove` refuses anything else. This is the one destructive path in the whole
 * application, and the renderer only reaches it after the compiled shell's own
 * four-gate confirmation ceremony has completed.
 */
ipcMain.handle("deployer:remove-local-vm", async () => {
  const provisioning = new HypervisorVmProvisioning({ executor, appliancePath: appliancePathIfPresent() ?? "" });
  return provisioning.remove(MANAGED_VM_NAME);
});

ipcMain.on("window:minimize", () => mainWindow?.minimize());
ipcMain.on("window:toggle-maximize", () => (mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize()));
ipcMain.on("window:close", () => mainWindow?.close());

app.whenReady().then(async () => {
  await identityStore.load();
  createWindow();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
