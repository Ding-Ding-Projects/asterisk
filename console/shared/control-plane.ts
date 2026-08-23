/**
 * `runtime.*` manage the console's own WSL distribution, created from the Asterisk
 * payload inside the installer. They replace an earlier `server.provision-bundled`
 * that was declared here and implemented nowhere, so the application could see its own
 * packaged runtime and had no way to run it.
 */
export type ControlPlaneAction =
  | 'server.list' | 'server.connect' | 'pbx.snapshot' | 'pbx.apply'
  | 'runtime.status' | 'runtime.provision' | 'runtime.stop' | 'runtime.remove'
  | 'pbx.read' | 'pbx.command' | 'history.list' | 'history.restore';

/** The screens a `pbx.read` can answer, each backed by read-only Asterisk CLI output. */
export type PbxReadView =
  | 'dash' | 'live' | 'endpoints' | 'trunks' | 'queues' | 'modules' | 'canvas';

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

export interface DingDesktopApi {
  platform: string;
  window: { minimize(): void; toggleMaximize(): void; close(): void };
  controlPlane: { request(request: ControlPlaneRequest): Promise<ControlPlaneResponse> };
}

declare global { interface Window { dingDesktop?: DingDesktopApi } }
