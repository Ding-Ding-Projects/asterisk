import ConsoleShell, { RAIL, SCREENS, ORDER } from "../../../../console/app/renderer/src/generated/console";
import type { Component } from "react";
import type { DeployResult, DeployStepReport, DeployTarget } from "../../../control-plane/deploy-orchestrator.js";

/**
 * Registers the deployer's own destinations into the console's compiled design shell,
 * exactly the way the console's own `registerPbxAdminScreens()`-style modules add a
 * rail and a catalogue of screens into `RAIL`/`SCREENS`/`ORDER`: mutate the exported
 * structures the compiled shell already reads, rather than forking the shell or
 * hand-editing `console/app/renderer/src/generated/console.tsx`.
 *
 * This module imports the generated file directly from the console's own source tree
 * (not a copy), so this app's bundle carries the same compiled Material 3 shell —
 * tabbed navigation, the command palette, notifications, the appearance system, and
 * the four-gate destructive-action confirmation — instead of a bespoke one. Because
 * this file runs in the deployer's own separate Electron/Vite process, mutating these
 * module-scoped arrays here has no effect on the console application's own process;
 * they are two different bundles, each with its own fresh copy of the generated module.
 *
 * The deployer is a purpose-built app, so it clears the design's own baked-in PBX rail
 * before adding its own — additive-only mutation (as the PBX admin screens pattern
 * uses) would leave 32 PBX-administration destinations in an app whose only job is
 * standing up a server, none of which this application can read or act on.
 */
const ctl = (
  id: string,
  label: string,
  kind: string,
  value: unknown,
  extra?: Record<string, unknown>,
): Record<string, unknown> => Object.assign({ id, label, kind, value }, extra ?? {});

export function registerDeployerScreens(): void {
  RAIL.length = 0;
  RAIL.push({
    id: "deploy",
    icon: "rocket_launch",
    label: "Deploy",
    groupLabel: "Deploy",
    groupDesc: "Stand up a Ding PBX server automatically, on a local VM or a remote host over SSH.",
  });

  for (const key of Object.keys(SCREENS)) delete (SCREENS as Record<string, unknown>)[key];
  Object.assign(SCREENS, {
    deploy: {
      rail: "deploy",
      icon: "rocket_launch",
      label: "Deploy",
      title: "Deploy Ding PBX",
      file: "deployer",
      kind: undefined,
      sub:
        "Choose a detected route, then run the deployment. Remote hosts must already provide Asterisk, " +
        "Node.js 22 or newer, and passwordless sudo for the approved account.",
      groups: [
        {
          title: "Target",
          desc: "Where the server is deployed. Only VirtualBox is offered if it is actually installed, " +
            "and only SSH targets you have approved below can be dialed.",
          ctls: [
            ctl("d_mode", "Target", "segmented", "Detecting targets", {
              options: ["Detecting targets"],
              info: "Local VM imports a bundled appliance into VirtualBox on this machine. Remote host connects " +
                "over SSH to a Linux machine you already have and installs the server there.",
            }),
            ctl("d_sshtarget", "Approved SSH target", "select", "", {
              options: ["(none approved yet)"],
              info: "This list is the approved-target store: only a host and port that have already been added " +
                "here may ever be dialed, exactly as the console's own SSH policy requires.",
            }),
            ctl("d_addtarget", "Add SSH target", "file", "", {
              accept: "application/json,.json",
              info:
                'Choose a local JSON file shaped {"host":"...","port":22,"user":"..."}. Adding a target only ' +
                "approves dialing it — the first real connection is still trust-on-first-use, and a host key " +
                "that later changes stops every future deployment to it.",
            }),
          ],
        },
        {
          title: "Run",
          desc: "Verified by asking the server itself once the install finishes, never by trusting an exit code.",
          ctls: [
            ctl("d_deploy", "Deploy", "segmented", "Deploy Ding PBX", {
              options: ["Deploy Ding PBX"],
              action: "deploy-run",
              info: "Runs the full one-click deployment against the chosen target and does not report success " +
                "until the server actually answers its readiness route with valid setup metadata.",
            }),
          ],
        },
      ],
    },
    progress: {
      rail: "deploy",
      icon: "checklist",
      label: "Progress & result",
      title: "Deployment progress",
      file: "deployer",
      kind: "table",
      sub: "The real, verified steps of the last deployment attempt, in order.",
      table: { grid: "1.4fr 90px 3fr", cols: ["Step", "Status", "Detail"], rows: [] },
      groups: [],
    },
    manage: {
      rail: "deploy",
      icon: "delete_forever",
      label: "Remove local VM",
      title: "Remove the deployer's local VM",
      file: "deployer",
      kind: undefined,
      sub: "Irreversible. Only ever removes the VM this deployer itself created — never a VM you made by hand.",
      groups: [
        {
          title: "Danger zone",
          desc: "Powers off and deletes the deployer's own managed VM and its disks.",
          ctls: [
            ctl("d_remove", "Remove local VM", "segmented", "Remove", {
              options: ["Remove"],
              action: "remove-vm",
              info: "Goes through the same four-gate confirmation as every other destructive action in this " +
                "product before anything is actually deleted.",
            }),
          ],
        },
      ],
    },
  });

  ORDER.length = 0;
  ORDER.push("deploy", "progress", "manage");
}

interface DeployerWindowBridge {
  detectTargets(): Promise<{ localVm: { available: boolean; version?: string; reason?: string; appliancePresent: boolean } }>;
  listApprovedSshIdentities(): Promise<ReadonlyArray<{ host: string; port: number; user: string; label?: string }>>;
  addSshIdentity(host: string, port: number, user: string, label?: string): Promise<{ ok: boolean; reason?: string }>;
  deploy(target: DeployTarget): Promise<DeployResult>;
  removeLocalVm(): Promise<{ ok: boolean; detail: string }>;
  onProgress(listener: (step: DeployStepReport) => void): () => void;
  windowControls: { minimize(): void; toggleMaximize(): void; close(): void };
}

declare global {
  interface Window {
    deployer: DeployerWindowBridge;
  }
}

interface ShellState {
  values: Record<string, unknown>;
  ceremonyCmd?: string;
  screen: string;
}

/**
 * Supplies the one thing the compiled shell cannot know on its own — real behavior —
 * exactly the way `console/app/renderer/src/App.tsx` does for the console: override
 * `renderVals()` to inject a real `executeCeremony`, real window controls, and real
 * file-picker/action handling, while every other method (`toast`, `fire`, `ceremony`,
 * `areYouSure`, `setVal`, the whole rendering path) is inherited unchanged from
 * `ConsoleShell`. No control kind used here is new: `segmented` with an `action`,
 * `select`, and `file` are all part of the existing compiled design.
 */
const Base = ConsoleShell as unknown as new (props: Record<string, never>) => Component<Record<string, never>> & {
  state: ShellState;
  renderVals(): Record<string, unknown>;
  set(key: string, value: unknown): void;
  setState(update: Record<string, unknown>): void;
  toast(message: string): void;
  fire(title: string, body: string): void;
  ceremony(title: string, command: string): void;
  onFilePicked?(ctl: { id: string }, file: File): void;
  onFileCleared?(ctl: { id: string }): void;
  controlActionText?(action: string): string;
  onControlAction?(action: string): void;
  fileControlName?(ctl: { id: string }): string;
  fileControlHasFile?(ctl: { id: string }): boolean;
  forceUpdate(): void;
};

export class DeployerShell extends Base {
  /**
   * Move to a screen this application actually has, before the first render.
   *
   * The compiled shell initialises its own state to `dash`, which is correct for the
   * console and wrong here: `registerDeployerScreens()` clears every entry in `SCREENS`
   * and installs three of its own, so `dash` no longer exists by the time the shell
   * looks it up. It then reads `.table` off `undefined` and the whole tree throws, which
   * renders as an empty white window rather than as an error anybody would notice.
   *
   * Found by launching the built application and looking at it. It type-checked, its
   * module graph resolved, and all forty-eight tests passed, because none of that
   * exercises the one line where the shell's default screen meets a catalogue that no
   * longer contains it.
   */
  constructor(props: Record<string, never>) {
    super(props);
    this.state = { ...this.state, screen: ORDER[0] };
  }

  private running = false;
  private lastSteps: DeployStepReport[] = [];
  private lastResult: DeployResult | null = null;
  private sshTargets: ReadonlyArray<{ host: string; port: number; user: string; label?: string }> = [];
  private localVm: { available: boolean; version?: string; reason?: string; appliancePresent: boolean } | null = null;
  private targetsLoaded = false;
  private targetDetectionError = "";
  private addedTargetFileName = "";
  private unsubscribeProgress?: () => void;

  componentDidMount(): void {
    super.componentDidMount?.();
    this.unsubscribeProgress = window.deployer.onProgress((step) => {
      this.lastSteps = [...this.lastSteps, step];
      this.applyProgressRows();
      this.forceUpdate();
    });
    void this.refreshTargets();
  }

  componentWillUnmount(): void {
    super.componentWillUnmount?.();
    this.unsubscribeProgress?.();
  }

  private async refreshTargets(): Promise<void> {
    this.targetsLoaded = false;
    this.targetDetectionError = "";
    try {
      const [detected, sshTargets] = await Promise.all([
        window.deployer.detectTargets(),
        window.deployer.listApprovedSshIdentities(),
      ]);
      this.localVm = detected.localVm;
      this.sshTargets = sshTargets;
      const options = this.availableTargetModes();
      const current = String((this.state.values as Record<string, unknown>).d_mode ?? "");
      if (options.length > 0 && !options.includes(current)) this.set("d_mode", options[0]);
    } catch (error) {
      this.localVm = null;
      this.sshTargets = [];
      this.targetDetectionError = error instanceof Error ? error.message : "Target detection failed.";
    } finally {
      this.targetsLoaded = true;
      this.forceUpdate();
    }
  }

  private availableTargetModes(): string[] {
    const modes: string[] = [];
    if (this.localVm?.available && this.localVm.appliancePresent) modes.push("Local VM");
    if (this.sshTargets.length > 0) modes.push("Remote host (SSH)");
    return modes;
  }

  private applyProgressRows(): void {
    const progress = (SCREENS as Record<string, { sub?: string; table?: { rows: string[][] } }>).progress;
    const table = progress.table;
    if (!table) return;
    table.rows = this.lastSteps.map((step) => [step.name, step.ok ? "✓ ok" : "✗ failed", step.detail]);
    progress.sub = this.running
      ? "Deployment is running. Completed steps appear below as the target reports them."
      : this.lastResult?.ok
        ? "The last deployment was verified by the installed server's readiness response."
        : this.lastResult
          ? "The last deployment did not complete. The final row names the observed reason."
          : "No deployment has run in this session."
  }

  /** Read by the `select`-kind `d_sshtarget` control before every render. */
  private applySshTargetOptions(): void {
    const deployScreen = (SCREENS as Record<string, { groups?: Array<{ ctls?: Array<Record<string, unknown>> }> }>).deploy;
    const control = deployScreen?.groups?.flatMap((group) => group.ctls ?? []).find((c) => c.id === "d_sshtarget");
    if (!control) return;
    control.options = this.sshTargets.length
      ? this.sshTargets.map((target) => `${target.label ? target.label + " — " : ""}${target.user}@${target.host}:${target.port}`)
      : ["(none approved yet)"];
  }

  private applyTargetModeOptions(): void {
    const deployScreen = (SCREENS as Record<string, { groups?: Array<{ ctls?: Array<Record<string, unknown>> }> }>).deploy;
    const control = deployScreen?.groups?.flatMap((group) => group.ctls ?? []).find((c) => c.id === "d_mode");
    if (!control) return;
    const modes = this.availableTargetModes();
    control.options = !this.targetsLoaded
      ? ["Detecting targets"]
      : modes.length > 0
        ? modes
        : ["No available target"];
    control.info = this.targetDetectionError
      ? `Target detection failed: ${this.targetDetectionError}`
      : modes.length === 0 && this.targetsLoaded
        ? "No deployable route is available. A local route requires VirtualBox and the bundled appliance. A remote route requires an approved SSH target."
        : "Only routes detected from the current machine and approved target store are listed.";
  }

  renderVals(): Record<string, unknown> {
    this.applyProgressRows();
    this.applySshTargetOptions();
    this.applyTargetModeOptions();
    const values = super.renderVals();
    return {
      ...values,
      __window: window.deployer.windowControls,
      executeCeremony: this.executeCeremony,
    };
  }

  /** `select`/`segmented`-kind controls with `c.action` route here; `text`-kind
   * status readouts route to `controlActionText` below. Both are part of the
   * compiled design's own escape hatch for real side effects. */
  onControlAction = (action: string): void => {
    if (action === "deploy-run") { this.startDeploy(); return; }
    if (action === "remove-vm") { this.startRemoveVm(); return; }
  };

  private currentTarget(): DeployTarget | undefined {
    if (!this.targetsLoaded) return undefined;
    const mode = String((this.state.values as Record<string, unknown>).d_mode ?? "");
    if (mode === "Local VM" && this.localVm?.available && this.localVm.appliancePresent) return { kind: "localVm" };
    const selectedLabel = String((this.state.values as Record<string, unknown>).d_sshtarget ?? "");
    const match = this.sshTargets.find(
      (target) => `${target.label ? target.label + " — " : ""}${target.user}@${target.host}:${target.port}` === selectedLabel,
    );
    if (!match) return undefined;
    return { kind: "ssh", host: match.host, port: match.port, user: match.user, knownHostsPath: "" };
  }

  private startDeploy(): void {
    const target = this.currentTarget();
    if (!target) {
      this.toast(this.targetsLoaded
        ? "No deployable target is selected. Add an approved SSH target or install the detected local requirements."
        : "Target detection is still running.");
      return;
    }
    const label = target.kind === "localVm" ? "the local VM" : `${target.user}@${target.host}:${target.port}`;
    this.ceremony(`Deploy Ding PBX to ${label}`, `deploy:${JSON.stringify(target)}`);
  }

  private startRemoveVm(): void {
    this.ceremony("Remove the deployer's local VM", "remove-vm");
  }

  /** The confirmation flow's final gate. The design's own default just announces
   * "executed and attested" without calling anything real — this replaces that with
   * the actual deployment or removal, and reports exactly what happened. */
  private executeCeremony = (): void => {
    const command = this.state.ceremonyCmd ?? "";
    this.set("ceremonyOpen", false);
    if (command.startsWith("deploy:")) {
      void this.runDeploy(JSON.parse(command.slice("deploy:".length)) as DeployTarget);
      return;
    }
    if (command === "remove-vm") {
      void this.runRemoveVm();
      return;
    }
  };

  private async runDeploy(target: DeployTarget): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.lastSteps = [];
    this.applyProgressRows();
    this.set("screen", "progress");
    this.forceUpdate();
    try {
      const result = await window.deployer.deploy(target);
      this.lastResult = result;
      if (result.ok) {
        this.fire("Deployment verified", `${result.adminUrl} answered its readiness route.`);
      } else {
        this.toast("⚠ Deployment did not complete. See Progress & result for the exact reason.");
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "The deployment request ended unexpectedly.";
      const failedStep = { name: "deployment request", ok: false, detail };
      this.lastSteps = [...this.lastSteps, failedStep];
      this.lastResult = { ok: false, steps: this.lastSteps };
      this.toast(`⚠ ${detail}`);
    } finally {
      this.running = false;
      this.applyProgressRows();
      this.forceUpdate();
    }
  }

  private async runRemoveVm(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.forceUpdate();
    try {
      const step = await window.deployer.removeLocalVm();
      if (step.ok) this.fire("VM removed", step.detail);
      else this.toast(`⚠ ${step.detail}`);
    } catch (error) {
      this.toast(`⚠ ${error instanceof Error ? error.message : "The removal request ended unexpectedly."}`);
    } finally {
      this.running = false;
      this.forceUpdate();
    }
  }

  controlActionText = (action: string): string => {
    if (action === "deploy-run") return this.running ? "Deployment running" : this.lastResult?.ok ? "Last deployment verified" : this.lastResult ? "Last deployment failed" : "";
    return "";
  };

  fileControlName = (c: { id: string }): string => (c.id === "d_addtarget" ? this.addedTargetFileName || "No file chosen" : "No file chosen");
  fileControlHasFile = (c: { id: string }): boolean => c.id === "d_addtarget" && Boolean(this.addedTargetFileName);

  onFilePicked = (c: { id: string }, file: File): void => {
    if (c.id !== "d_addtarget") return;
    void file.text().then(async (text) => {
      let parsed: { host?: unknown; port?: unknown; user?: unknown; label?: unknown };
      try {
        parsed = JSON.parse(text) as typeof parsed;
      } catch {
        this.toast("⚠ That file is not valid JSON");
        return;
      }
      const host = String(parsed.host ?? "");
      const port = Number(parsed.port ?? 22);
      const user = String(parsed.user ?? "");
      const label = typeof parsed.label === "string" ? parsed.label : undefined;
      const result = await window.deployer.addSshIdentity(host, port, user, label);
      if (!result.ok) {
        this.toast(`⚠ ${result.reason ?? "That target could not be added"}`);
        return;
      }
      this.addedTargetFileName = file.name;
      await this.refreshTargets();
      this.fire("SSH target approved", `${user}@${host}:${port} may now be selected as a deploy target.`);
    });
  };

  onFileCleared = (c: { id: string }): void => {
    if (c.id === "d_addtarget") this.addedTargetFileName = "";
  };
}
