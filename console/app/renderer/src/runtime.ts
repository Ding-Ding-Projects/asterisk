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
  if (state === 'failed') {
    return ` — creating ${name} did not succeed: ${runtime?.status?.reason ?? 'no reason was reported'}.`;
  }
  return '';
}

/** Whether the console can create its own runtime right now, and may offer to. */
export function canProvision(runtime: RuntimeStatus | undefined): boolean {
  return runtime?.status?.state === 'notProvisioned';
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
    case 'failed': return `failed — ${status.reason ?? 'no reason reported'}`;
    default: return 'unknown';
  }
}
