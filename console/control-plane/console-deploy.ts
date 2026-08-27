/**
 * Installing this console onto a VM over SSH, from the desktop app.
 *
 * The console can already run as a server beside Asterisk -- `server/http-server.ts` and its
 * systemd unit exist and work. What was missing was any way for a person to GET it there
 * without opening a terminal, which for something administered the way FreePBX is
 * administered is most of the point.
 *
 * The shape here is deliberately the same as everywhere else this project reaches a machine:
 *
 *  - **A plan first, then the doing.** `planDeployment` is pure and returns the exact steps.
 *    They can be read, shown to a person before anything runs, and asserted in a test without
 *    a network or a VM anywhere near it.
 *  - **No shell, ever.** Every step is an allowlisted executable and a separate argument
 *    vector. Nothing is interpolated into a command string, so a hostname cannot become a
 *    command however it is spelled.
 *  - **The host key discipline is not relaxed for convenience.** The same persistent
 *    known_hosts, the same refusal of an ephemeral store, the same stop-on-mismatch as the
 *    read-only probes. A deployment is the LAST place to start trusting a key blindly: it
 *    ends with a privileged installer.
 *  - **Nothing is invented about the remote.** The installer that runs is the one checked in
 *    at server/deploy/install.sh, which creates only paths it owns and never touches
 *    Asterisk's own configuration or service.
 */
import type { CommandResult, ProcessExecutor } from './executor.js';

export interface DeployTarget {
  host: string;
  port: number;
  user: string;
  /** Persistent and absolute. An ephemeral store is refused, exactly as for a probe. */
  knownHostsPath: string;
}

export interface DeployPlan {
  /** Where the bundle is put on the remote before it is unpacked. Under /tmp and per-run. */
  stagingDirectory: string;
  steps: ReadonlyArray<DeployStep>;
}

export interface DeployStep {
  /** What a person sees while it runs. Written as a statement of what is happening. */
  name: string;
  executable: 'ssh' | 'scp';
  args: ReadonlyArray<string>;
  /** How long this one step may take. A file copy is allowed longer than a probe. */
  timeoutMs: number;
  /** Said when this step fails, in place of the raw command output. */
  whenItFails: string;
}

/** The archive the desktop app builds and sends. One file, so one copy step. */
export const BUNDLE_NAME = 'ding-pbx-console.tar.gz';

/** Where the installer ends up once the bundle is unpacked. */
export const INSTALLER_PATH = 'server/deploy/install.sh';

export const SERVICE_NAME = 'ding-pbx-console';

/**
 * The SSH options every step shares.
 *
 * `accept-new` enrols a key nobody has seen before and still refuses one that has CHANGED,
 * which is the distinction that matters: a first connection to a machine you just built is
 * ordinary, and a key that differs from the recorded one means something is wrong and the
 * deployment must not proceed. `UpdateHostKeys=no` keeps the record from being rewritten
 * underneath that check.
 */
function sshOptions(target: DeployTarget): string[] {
  return [
    '-p', String(target.port),
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', 'UpdateHostKeys=no',
    '-o', `UserKnownHostsFile=${target.knownHostsPath}`,
    '-o', 'ConnectTimeout=10',
    '-o', 'BatchMode=yes',
  ];
}

/** scp spells the port option differently from ssh, which is a real and easy mistake. */
function scpOptions(target: DeployTarget): string[] {
  return [
    '-P', String(target.port),
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', 'UpdateHostKeys=no',
    '-o', `UserKnownHostsFile=${target.knownHostsPath}`,
    '-o', 'ConnectTimeout=10',
    '-o', 'BatchMode=yes',
  ];
}

export function validateDeployTarget(target: DeployTarget): void {
  if (!/^([a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,251}[a-zA-Z0-9])?|\[[0-9a-fA-F:]+\])$/u.test(target.host)) {
    throw new Error('The host must be an exact DNS name, IPv4 address, or bracketed IPv6 address.');
  }
  if (!Number.isSafeInteger(target.port) || target.port < 1 || target.port > 65_535) {
    throw new Error('The SSH port is invalid.');
  }
  if (!/^[a-z_][a-z0-9_-]{0,31}$/u.test(target.user)) {
    throw new Error('The SSH user is invalid.');
  }
  /* The null device is checked BEFORE the absolute-path rule, because a bare NUL breaks both
   * and "that is not an absolute path" is the less useful of the two things to be told. */
  if (/null|nul$|dev[\\/]null/iu.test(target.knownHostsPath)) {
    /* A deployment ends by running a privileged installer. Throwing away the host record for
     * that is not a shortcut, it is removing the only check that the machine at the other end
     * is the machine you meant. */
    throw new Error('A null or ephemeral known_hosts store is prohibited.');
  }
  if (!/^(?:[a-zA-Z]:[\\/]|\/).+/u.test(target.knownHostsPath)) {
    throw new Error('known_hosts must use a persistent absolute path.');
  }
}

/**
 * The exact steps, in order, with nothing run.
 *
 * `stamp` names the staging directory so two deployments cannot collide, and is passed in
 * rather than read from the clock here: a plan that changes with the time cannot be asserted.
 */
export function planDeployment(
  target: DeployTarget,
  bundlePath: string,
  stamp: string,
): DeployPlan {
  validateDeployTarget(target);
  if (!/^[A-Za-z0-9._-]{1,64}$/u.test(stamp)) {
    throw new Error('The deployment stamp must be a short plain identifier.');
  }
  if (bundlePath.trim() === '') throw new Error('There is no bundle to send.');

  const staging = `/tmp/ding-deploy-${stamp}`;
  const remote = `${target.user}@${target.host}`;
  const ssh = sshOptions(target);

  return {
    stagingDirectory: staging,
    steps: [
      {
        name: 'Checking the machine can be reached',
        executable: 'ssh',
        args: [...ssh, remote, 'uname', '-s'],
        timeoutMs: 20_000,
        whenItFails: 'That machine did not answer over SSH, so nothing was installed.',
      },
      {
        name: 'Checking this account can install a service',
        executable: 'ssh',
        /* Without a password prompt. A deployment that stops here is far better than one
         * that hangs on a prompt nobody can see. */
        args: [...ssh, remote, 'sudo', '-n', 'true'],
        timeoutMs: 20_000,
        whenItFails: 'That account cannot use sudo without a password, so the installer could not be run.',
      },
      {
        name: 'Making room for the upload',
        executable: 'ssh',
        args: [...ssh, remote, 'mkdir', '-p', staging],
        timeoutMs: 20_000,
        whenItFails: 'The staging directory could not be created on that machine.',
      },
      {
        name: 'Sending the console',
        executable: 'scp',
        args: [...scpOptions(target), bundlePath, `${remote}:${staging}/${BUNDLE_NAME}`],
        /* A copy is allowed far longer than a probe: this is tens of megabytes over whatever
         * link the machine happens to be on. */
        timeoutMs: 15 * 60_000,
        whenItFails: 'The console could not be copied to that machine.',
      },
      {
        name: 'Unpacking it',
        executable: 'ssh',
        args: [...ssh, remote, 'tar', '-xzf', `${staging}/${BUNDLE_NAME}`, '-C', staging],
        timeoutMs: 5 * 60_000,
        whenItFails: 'The archive arrived but could not be unpacked.',
      },
      {
        name: 'Installing the service',
        executable: 'ssh',
        /* The installer checked in at server/deploy/install.sh, not an arbitrary script: it
         * creates only paths it owns and never touches Asterisk's own service. */
        args: [...ssh, remote, 'sudo', '-n', 'bash', `${staging}/${INSTALLER_PATH}`],
        timeoutMs: 15 * 60_000,
        whenItFails: 'The installer ran and did not finish. Nothing of Asterisk was changed.',
      },
      {
        name: 'Checking it started',
        executable: 'ssh',
        args: [...ssh, remote, 'systemctl', 'is-active', SERVICE_NAME],
        timeoutMs: 30_000,
        whenItFails: 'It installed but the service is not running.',
      },
      {
        name: 'Clearing the upload away',
        executable: 'ssh',
        args: [...ssh, remote, 'rm', '-rf', staging],
        timeoutMs: 60_000,
        whenItFails: 'It installed, but the temporary upload could not be removed.',
      },
    ],
  };
}

export interface DeployProgress {
  name: string;
  ok: boolean;
  detail: string;
}

export interface DeployOutcome {
  ok: boolean;
  /** Every step attempted, in order, with what happened. Never only the last one. */
  steps: ReadonlyArray<DeployProgress>;
  /** Where to reach it, once it is genuinely running. Absent otherwise. */
  reachableAt?: string;
}

export interface DeployRunOptions {
  executor: ProcessExecutor;
  plan: DeployPlan;
  target: DeployTarget;
  onStep?: (step: DeployProgress) => void;
  signal?: AbortSignal;
}

/** A host key that has CHANGED, as opposed to one never seen. Never enrolled automatically. */
const HOST_KEY_CHANGED = /REMOTE HOST IDENTIFICATION HAS CHANGED|Host key verification failed/iu;

/**
 * Runs the plan, stopping at the first step that fails.
 *
 * It reports every step as it goes rather than one verdict at the end, because installing
 * over a network is slow enough that silence reads as a hang -- and because when it does
 * fail, which step it failed at is most of the diagnosis.
 */
export async function runDeployment(options: DeployRunOptions): Promise<DeployOutcome> {
  const { executor, plan, target, onStep, signal } = options;
  const steps: DeployProgress[] = [];

  const record = (progress: DeployProgress): void => {
    steps.push(progress);
    onStep?.(progress);
  };

  for (const step of plan.steps) {
    if (signal?.aborted) {
      record({ name: step.name, ok: false, detail: 'Stopped before this step.' });
      return { ok: false, steps };
    }
    let result: CommandResult;
    try {
      result = await executor.execute({
        executable: step.executable,
        args: [...step.args],
        timeoutMs: step.timeoutMs,
        maxOutputBytes: 256 * 1024,
        signal,
      });
    } catch (error) {
      record({ name: step.name, ok: false, detail: `${step.whenItFails} ${describe(error)}` });
      return { ok: false, steps };
    }

    if (HOST_KEY_CHANGED.test(result.stderr)) {
      /* Not a failure to retry past. The recorded key for this machine does not match the one
       * it presented, and the next step would run a privileged installer on it. */
      record({
        name: step.name,
        ok: false,
        detail: `The host key for ${target.host} does not match the one recorded for it. `
          + 'Nothing was installed. Confirm the machine out of band before going further.',
      });
      return { ok: false, steps };
    }

    if (result.exitCode !== 0) {
      record({ name: step.name, ok: false, detail: `${step.whenItFails} ${firstLine(result.stderr)}`.trim() });
      return { ok: false, steps };
    }
    record({ name: step.name, ok: true, detail: firstLine(result.stdout) || 'Done.' });
  }

  return { ok: true, steps, reachableAt: `http://${target.host}:8088/` };
}

function firstLine(text: string): string {
  const line = text.split(/\r?\n/u).find((candidate) => candidate.trim() !== '');
  return line === undefined ? '' : line.trim().slice(0, 200);
}

function describe(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 200);
}
