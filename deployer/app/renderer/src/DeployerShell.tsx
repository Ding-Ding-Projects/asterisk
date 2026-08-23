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
        "Choose where to stand up the server, then run the deployment. Every dependency is " +
        "obtained automatically; nothing here asks you to go and install something by hand.",
      groups: [
        {
          title: "Target",
          desc: "Where the server is deployed. Only VirtualBox is offered if it is actually installed, " +
            "and only SSH targets you have approved below can be dialed.",
          ctls: [
            ctl("d_mode", "Target", "segmented", "Local VM", {
              options: ["Local VM", "Remote host (SSH)"],
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
                "until the server actually answers its health endpoint with a real Asterisk version.",
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
  private addedTargetFileName = "";
  private unsubscribeProgress?: () => void;

  componentDidMount(): void {
    super.componentDidMount?.();
    this.unsubscribeProgress = window.deployer.onProgress((step) => {
      this.lastSteps = [...this.lastSteps, step];
      this.applyProgressRows();
      this.forceUpdate();
    });
    void this.refreshSshTargets();
  }

  componentWillUnmount(): void {
    super.componentWillUnmount?.();
    this.unsubscribeProgress?.();
  }

  private async refreshSshTargets(): Promise<void> {
    this.sshTargets = await window.deployer.listApprovedSshIdentities();
    this.forceUpdate();
  }

  private applyProgressRows(): void {
    const table = (SCREENS as Record<string, { table?: { rows: string[][] } }>).progress.table;
    if (!table) return;
    table.rows = this.lastSteps.map((step) => [step.name, step.ok ? "✓ ok" : "✗ failed", step.detail]);
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

  renderVals(): Record<string, unknown> {
    this.applyProgressRows();
    this.applySshTargetOptions();
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
    const mode = String((this.state.values as Record<string, unknown>).d_mode ?? "Local VM");
    if (mode === "Local VM") return { kind: "localVm" };
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
      this.toast("Choose an approved SSH target first, or add one below.");
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
    const result = await window.deployer.deploy(target);
    this.running = false;
    this.lastResult = result;
    this.forceUpdate();
    if (result.ok) {
      this.fire("Deployment verified", `${result.adminUrl} answered with Asterisk ${result.asteriskVersion}.`);
    } else {
      this.toast("⚠ Deployment did not complete — see Progress & result for the exact reason");
    }
  }

  private async runRemoveVm(): Promise<void> {
    const step = await window.deployer.removeLocalVm();
    if (step.ok) this.fire("VM removed", step.detail);
    else this.toast(`⚠ ${step.detail}`);
  }

  controlActionText = (action: string): string => {
    if (action === "deploy-run") return this.running ? "Deploying…" : this.lastResult?.ok ? "Last run succeeded" : "";
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
      await this.refreshSshTargets();
      this.fire("SSH target approved", `${user}@${host}:${port} may now be selected as a deploy target.`);
    });
  };

  onFileCleared = (c: { id: string }): void => {
    if (c.id === "d_addtarget") this.addedTargetFileName = "";
  };
}
