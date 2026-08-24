import type { DownloadSurfaceKind, DownloadTransferClient, DownloadTransferSnapshot, ExtensionDownloadHandoff } from './download-transfer.js';

export interface NativeHostStatus {
  state: 'ready' | 'starting' | 'unavailable' | 'error';
  message: string;
  retryable: boolean;
  browsers?: readonly string[];
  executablePath?: string;
  executableSha256?: string;
}

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
  /* Local converter catalog and capability evidence. The queue and file-picker actions
   * use the same namespace so the renderer cannot invent a parallel transport. */
  | 'converter.catalog' | 'converter.pdf-capabilities' | 'converter.sniff'
  | 'converter.queue.create' | 'converter.queue.enqueue-one' | 'converter.queue.page'
  | 'converter.queue.start' | 'converter.queue.pause' | 'converter.queue.resume' | 'converter.queue.cancel'
  | 'ollama.snapshot' | 'ollama.health' | 'ollama.version' | 'ollama.models.installed' | 'ollama.models.running'
  | 'ollama.model.show' | 'ollama.model.delete' | 'ollama.model.copy'
  | 'ollama.pulls.list' | 'ollama.pulls.enqueue' | 'ollama.pulls.cancel' | 'ollama.pulls.retry' | 'ollama.pulls.reconcile'
  | 'ollama.chat.sessions' | 'ollama.chat.create' | 'ollama.chat.rename' | 'ollama.chat.delete' | 'ollama.chat.send'
  | 'ollama.chat.retry' | 'ollama.chat.regenerate' | 'ollama.chat.stop'
  /* Live Status Hub observations and receipt-backed question delivery. */
  | 'status-hub.register' | 'status-hub.project' | 'status-hub.sessions' | 'status-hub.session'
  | 'status-hub.replies' | 'status-hub.answer'
  /* Dim-sum cache is local-only. A missing cache is an honest unavailable result. */
  | 'dim-sum.cache.read'
  /* Desktop forge publishing uses gh/git through the typed privileged bridge. */
  | 'forge.capabilities' | 'forge.accounts.list' | 'forge.account.add'
  | 'forge.account.refresh' | 'forge.account.activate' | 'forge.account.sign-out'
  | 'forge.owners.list' | 'forge.publish' | 'forge.receipts.list'
  | 'forge.auth.sign-in' | 'forge.operation.cancel' | 'forge.operation.status' | 'forge.state.reset-corruption';

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
  dialog: { pickFolder(): Promise<string | undefined> };
  controlPlane: { request(request: ControlPlaneRequest): Promise<ControlPlaneResponse> };
  statusHub: { baseUrl?: string };
  nativeHost: {
    getStatus(): Promise<NativeHostStatus>;
    register(): Promise<NativeHostStatus>;
    onStatus(listener: (status: NativeHostStatus) => void): () => void;
  };
  downloads: DownloadTransferClient & {
    listPendingHandoffs(): Promise<ExtensionDownloadHandoff[]>;
    getSnapshot(transferId: string): Promise<DownloadTransferSnapshot | undefined>;
    onHandoff(listener: (handoff: ExtensionDownloadHandoff) => void): () => void;
    onHandoffCancelled(listener: (handoffId: string) => void): () => void;
    closeWindow(kind: DownloadSurfaceKind): Promise<void>;
    openWindow(kind: DownloadSurfaceKind): Promise<void>;
  };
  converter: {
    pickFile(): Promise<{ sourcePath: string; name: string; bytes: number; lastModified?: string } | undefined>;
    pickDestination(): Promise<string | undefined>;
    confirmOverwrite(request: { destinationPath: string }): Promise<{ approved: boolean; detail: string }>;
  };
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
