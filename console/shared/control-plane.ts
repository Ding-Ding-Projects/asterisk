/**
 * `runtime.*` manage the console's own WSL distribution, created from the Asterisk
 * payload inside the installer. They replace an earlier `server.provision-bundled`
 * that was declared here and implemented nowhere, so the application could see its own
 * packaged runtime and had no way to run it.
 */
export type ControlPlaneAction =
  | 'server.list' | 'server.connect' | 'pbx.snapshot' | 'pbx.apply'
  | 'server.inventory.list' | 'server.inventory.add' | 'server.inventory.update'
  | 'server.inventory.remove' | 'server.inventory.set-active'
  | 'runtime.status' | 'runtime.provision' | 'runtime.stop' | 'runtime.remove'
  /*
   * `daemon.*` start, stop and restart the Asterisk process itself inside the managed
   * distribution `runtime.*` provisions. Provisioning only ever proved the binary
   * exists (`asterisk -V`); nothing started the daemon that every `pbx.read` needs to
   * actually connect to, so a freshly provisioned distribution was unusable until
   * someone ran `asterisk -F` by hand. See `control-plane/asterisk-service.ts`.
   */
  | 'daemon.status' | 'daemon.start' | 'daemon.stop' | 'daemon.restart'
  /*
   * Installs this console onto a machine reached over SSH, so it runs beside Asterisk and is
   * administered from a browser. Desktop only, and refused when hosted: a server reaching out
   * to install itself elsewhere is a different product with a different threat model.
   */
  | 'deploy.console'
  /*
   * Fetches one external settings source. The privileged process makes the request
   * because it needs the token, and returns the raw result rather than applying it --
   * the renderer decides what a body is permitted to change, and moving that decision
   * here would put the allowlist somewhere the person configuring the source cannot
   * see it. See control-plane/settings-source-fetcher.ts.
   */
  | 'settings.source.fetch'
  | 'pbx.read' | 'pbx.command' | 'pbx.config' | 'pbx.plan'
  | 'history.list' | 'history.restore'
  /* Prompts and music-on-hold media on the target, so a "custom" choice can be given a file. */
  | 'media.list' | 'media.upload' | 'media.remove'
  /* The console's own append-only record of what it changed, kept locally. */
  | 'local-history.list' | 'local-history.record' | 'local-history.restore'
  /* Durable renderer settings (appearance, personal vocabulary) -- see
   * `control-plane/settings-store.ts`. The renderer's own `localStorage` is in-memory
   * only for a `file://` origin and never survives a relaunch. */
  | 'settings.snapshot' | 'settings.write' | 'settings.remove';

/** The screens a `pbx.read` can answer, each backed by read-only Asterisk CLI output. */
export type PbxReadView =
  | 'dash' | 'live' | 'endpoints' | 'trunks' | 'queues' | 'modules' | 'canvas'
  /* Destinations that previously had no reader and stayed empty for want of one. */
  | 'voicemail' | 'confbridge' | 'moh' | 'codecs' | 'security' | 'cdr' | 'logger' | 'ami'
  | 'about' | 'cli';

export interface ControlPlaneRequest {
  requestId: string;
  action: ControlPlaneAction;
  serverId?: string;
  view?: PbxReadView;
  payload?: Readonly<Record<string, unknown>>;
}

/** A reading is either a value observed on the target, or the exact reason there is none. */
export type Observation<T> =
  | { state: 'available'; observedAt: string; value: T }
  | { state: 'unavailable'; observedAt: string; reason: string };

export type ControlPlaneResponse =
  | { ok: true; requestId: string; data: unknown }
  | { ok: false; requestId: string; code: string; message: string };

/**
 * What the renderer needs to render the update banner. Deliberately narrower than the
 * main process's own `UpdaterState` (see `control-plane/updater.ts`) — it never carries
 * a filesystem path or the raw release payload, only what the banner displays.
 */
export interface UpdaterStatusForRenderer {
  state: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'failed';
  revision?: number;
  latestVersion?: string;
  installedVersion?: string;
  releaseUrl?: string;
  lastError?: string;
  dismissed?: boolean;
  unsavedDraftCount: number;
  restartPending: boolean;
}

export interface UpdaterRestartResult {
  ok: boolean;
  reason?: string;
}

export interface DingDesktopApi {
  platform: string;
  window: { minimize(): void; toggleMaximize(): void; close(): void };
  controlPlane: { request(request: ControlPlaneRequest): Promise<ControlPlaneResponse> };
  updater: {
    /** Current state, read once (e.g. on mount) without waiting for the next push. */
    getStatus(): Promise<UpdaterStatusForRenderer>;
    /** Manual "Check for updates" action. Resolves once the check (and any download) settles. */
    checkNow(): Promise<UpdaterStatusForRenderer>;
    /** "Restart to install update" — returns only after spawn acknowledgement or failure. */
    restartToInstall(): Promise<UpdaterRestartResult>;
    /** Publishes the count of PBX drafts that still need review, apply, or discard. */
    setUnsavedDraftCount(count: number): void;
    /** "Later" — hides the banner until the next check finds something (or the user checks manually). */
    dismiss(): void;
    /** Subscribes to every state change; returns an unsubscribe function. */
    onStatus(listener: (status: UpdaterStatusForRenderer) => void): () => void;
  };
  /**
   * Live provisioning progress.
   *
   * Optional on the interface because the hosted HTTP bridge has no privileged process
   * to report from, and a renderer that assumed it was always there would fail on that
   * surface rather than degrading. Callers check before subscribing.
   */
  provisioning?: {
    /** Subscribes to each step as it finishes; returns an unsubscribe function. */
    onStep(listener: (step: ProvisionStepForRenderer) => void): () => void;
  };
  /**
   * Electron's own accessibility-support signal (`app.isAccessibilitySupportEnabled()`
   * and the `'accessibility-support-changed'` event), forwarded to the renderer so a
   * feature such as spoken narration can duck under a real screen reader rather than
   * talking over it.
   *
   * Optional for the same reason `provisioning` is: the hosted HTTP bridge runs with no
   * Electron main process behind it and has no such signal to report, so a caller
   * checks for this before subscribing rather than a renderer assuming it exists.
   */
  accessibility?: {
    /** The current state, read once (e.g. on mount) without waiting for a change event. */
    isScreenReaderActive(): Promise<boolean>;
    /** Subscribes to every change; returns an unsubscribe function. */
    onChange(listener: (active: boolean) => void): () => void;
  };
}

/** One provisioning step, as the renderer sees it. Structurally the control plane's own
 *  ProvisionStep, restated here so the shared contract does not import the control plane. */
export interface ProvisionStepForRenderer {
  name: string;
  ok: boolean;
  detail: string;
}

declare global { interface Window { dingDesktop?: DingDesktopApi } }
