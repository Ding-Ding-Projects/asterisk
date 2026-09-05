/**
 * The console's own Asterisk runtime, as the interface needs to talk about it.
 *
 * Discovery finding nothing used to be a dead end: the screen reported that no target
 * existed and stopped there, while the installer was carrying a complete Asterisk root
 * filesystem the console could have created one from. A message that names only the
 * problem leaves a person stuck; one that names the way forward does not.
 */

export type ProvisionState =
  | 'ready'
  | 'notProvisioned'
  | 'wslUnavailable'
  | 'payloadMissing'
  | 'provisioning'
  | 'unusable'
  | 'failed';

export interface RuntimeStatus {
  managedDistribution: string;
  bundledRuntime?: { state?: string; reason?: string };
  status?: {
    state: ProvisionState;
    distribution: string;
    reason?: string;
    asteriskVersion?: string;
    observedAt: string;
  };
}

/**
 * A sentence to append when nothing was discovered.
 *
 * Each state gets the one true next action rather than a generic suggestion. Where there
 * is genuinely nothing the console can do — no support on the machine, or a build that
 * carried no runtime — it says that plainly instead of offering a route that would fail.
 */
export function runtimeHint(runtime: RuntimeStatus | undefined): string {
  const state = runtime?.status?.state;
  if (!state) return '';
  const name = runtime?.status?.distribution ?? runtime?.managedDistribution ?? 'the managed distribution';

  if (state === 'notProvisioned') {
    return ` — this build carries an Asterisk runtime, so ${name} can be created from it here.`;
  }
  if (state === 'ready') {
    /* Discovery filters out distributions that are not usable targets, so a ready runtime
     * that discovery did not return means the two disagree. Say that, rather than
     * implying the user did something wrong. */
    const version = runtime?.status?.asteriskVersion;
    return ` — ${name} reports ${version ?? 'Asterisk'} but was not returned by discovery; try discovering again.`;
  }
  if (state === 'payloadMissing') {
    return ' — this build did not carry an Asterisk runtime, so one cannot be created from it.';
  }
  if (state === 'wslUnavailable') {
    return ` — ${runtime?.status?.reason ?? 'WSL did not answer on this machine'}.`;
  }
  if (state === 'unusable') {
    /* The one state with no way forward until this was written. The distribution is
     * registered, so creating it is refused; it does not answer, so it cannot be used.
     * Naming the reason alone left a person with a runtime they could neither run nor
     * replace, so the sentence names the actual escape: remove it, then create it again. */
    return (
      ` — ${name} is registered but did not answer: ${runtime?.status?.reason ?? 'no reason was reported'}.` +
      ` It cannot be created again while it is registered, so remove it first and then create it.`
    );
  }
  if (state === 'failed') {
    return ` — creating ${name} did not succeed: ${runtime?.status?.reason ?? 'no reason was reported'}.`;
  }
  return '';
}

/** Whether the console can create its own runtime right now, and may offer to. */
export function canProvision(runtime: RuntimeStatus | undefined): boolean {
  return runtime?.status?.state === 'notProvisioned';
}

/**
 * Whether removing the managed distribution is the route out of where the console is.
 *
 * Only true for a registered distribution that does not answer. Removing a working
 * runtime is a destructive action a person may still choose, but it is not something the
 * interface should be recommending, so this stays narrow: it answers "is removal the fix
 * for this particular state", not "is removal possible".
 */
export function canRecoverRuntime(runtime: RuntimeStatus | undefined): boolean {
  return runtime?.status?.state === 'unusable';
}

/**
 * Whether the managed distribution is registered at all, and so has something for
 * `wsl.exe --terminate` to actually stop.
 *
 * Both a working runtime (`ready`) and one that is registered but not answering
 * (`unusable`) qualify: terminating a WSL instance does not require Asterisk to be
 * answering inside it, and a stuck instance is exactly the case someone most wants to
 * be able to stop. Every other state has no distribution to terminate.
 */
export function canStopRuntime(runtime: RuntimeStatus | undefined): boolean {
  const state = runtime?.status?.state;
  return state === 'ready' || state === 'unusable';
}

/** A short label for the managed runtime, for a status line beside the target. */
export function runtimeLabel(runtime: RuntimeStatus | undefined): string {
  const status = runtime?.status;
  if (!status) return 'not checked';
  switch (status.state) {
    case 'ready': return `ready — ${status.asteriskVersion ?? 'Asterisk installed'}`;
    case 'notProvisioned': return 'not created yet';
    case 'payloadMissing': return 'no runtime in this build';
    case 'wslUnavailable': return 'WSL unavailable';
    case 'provisioning': return 'being created';
    case 'unusable': return `registered but not answering — ${status.reason ?? 'no reason reported'}`;
    case 'failed': return `failed — ${status.reason ?? 'no reason reported'}`;
    default: return 'unknown';
  }
}

/**
 * Which discovered WSL distribution to connect to first.
 *
 * Discovery returns names in the order `wsl --list --quiet` prints them, and the console
 * used to take the first one. On a machine with any other distribution sorting ahead of
 * the managed one, the dashboard probed that stranger, found no `asterisk` binary, and
 * reported "command not found" while a working managed runtime sat further down the list.
 * The managed distribution wins whenever it is present; otherwise the first name stands.
 */
export function preferredDistribution(discovered: ReadonlyArray<string>, managed: string | undefined): string | undefined {
  if (!discovered.length) return undefined;
  if (managed && discovered.includes(managed)) return managed;
  return discovered[0];
}
