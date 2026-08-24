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
  | 'pbx.read' | 'pbx.command' | 'pbx.config' | 'pbx.plan'
  | 'history.list' | 'history.restore'
  /* Prompts and music-on-hold media on the target, so a "custom" choice can be given a file. */
  | 'media.list' | 'media.upload' | 'media.remove'
  /* The console's own append-only record of what it changed, kept locally. */
  | 'local-history.list' | 'local-history.record' | 'local-history.restore'
  /* Durable renderer settings (appearance, personal vocabulary) -- see
   * `control-plane/settings-store.ts`. The renderer's own `localStorage` is in-memory
   * only for a `file://` origin and never survives a relaunch. */
  | 'settings.snapshot' | 'settings.write' | 'settings.remove'
  /* The desktop's complete local migration and Git history surface. */
  | 'migration.export' | 'migration.export.start' | 'migration.import.start' | 'migration.operation.status' | 'migration.validate' | 'migration.import'
  | 'migration.cancel' | 'migration.recovery.status' | 'migration.recovery.retry'
  | 'backup.create' | 'backup.start' | 'backup.list' | 'backup.retained.verify' | 'backup.prune.preview'
  | 'backup.prune'
  | 'git.history.status' | 'git.remote.set' | 'git.remote.set.start' | 'git.remote.remove' | 'git.remote.remove.start'
  | 'git.remote.fetch' | 'git.remote.fetch.start' | 'git.remote.push' | 'git.remote.push.start';

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
}

declare global { interface Window { dingDesktop?: DingDesktopApi } }
