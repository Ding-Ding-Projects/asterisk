/**
 * The renderer's half of the multi-server inventory.
 *
 * The model itself — add/edit/remove, persistence, and the cross-server response-
 * routing guard — lives in `control-plane/server-inventory.ts` and is exercised there
 * with `node:test`. This module is the thin renderer-side wrapper: it talks to the
 * main process through the same `dingDesktop.controlPlane.request` bridge every other
 * screen uses, and it is where `App.tsx` gets the guard it needs so a slow answer from
 * one server can never land in another server's (or a superseded request's own) slot.
 */
import { ResponseRoutingGuard, applyIfCurrent } from '../../../control-plane/server-inventory';
import type { RequestToken, ServerConnectionState } from '../../../control-plane/server-inventory';
import type { ControlPlaneResponse } from '../../../shared/control-plane';

export interface ServerSummary {
  id: string;
  name: string;
  connectionKind: string;
  wslDistribution?: string;
  dockerContext?: string;
  dockerProject?: string;
  host?: string;
  port?: number;
  user?: string;
  knownHostsPath?: string;
  state: ServerConnectionState;
  reason?: string;
  lastSeenAt?: string;
}

export interface ServerListState {
  servers: ServerSummary[];
  activeServerId?: string;
  state: 'loaded' | 'unavailable';
  reason?: string;
}

type Requester = (action: string, extra?: Record<string, unknown>) => Promise<ControlPlaneResponse | undefined>;

/**
 * Owns the configured server list and the request-generation guard that keeps a
 * per-server answer from being applied anywhere except its own, still-current slot.
 *
 * `begin`/`applyReading` are the two calls a caller needs around any request whose
 * answer will be merged into per-server state: `begin(serverId)` before issuing the
 * request, `applyReading(token, expectedServerId, slot, data)` when the answer comes
 * back. A response is written only when both hold: the token is still the newest one
 * issued for that server (nothing newer superseded it), and the slot being written is
 * actually the server the token was minted for.
 */
export class ServerSwitcher {
  private readonly guard = new ResponseRoutingGuard();
  private readonly request: Requester;
  servers: ServerSummary[] = [];
  activeServerId: string | undefined;
  loadState: 'loading' | 'loaded' | 'unavailable' = 'loading';
  loadReason: string | undefined;

  constructor(request: Requester) {
    this.request = request;
  }

  begin(serverId: string): RequestToken {
    return this.guard.begin(serverId);
  }

  /** See the guard's own documentation in `control-plane/server-inventory.ts`. */
  applyReading<T>(token: RequestToken, expectedServerId: string, slot: Record<string, T>, data: T, key?: string): boolean {
    return applyIfCurrent(this.guard, token, expectedServerId, slot, data, key);
  }

  async load(): Promise<ServerListState> {
    const response = await this.request('server.inventory.list');
    if (!response?.ok) {
      this.loadState = 'unavailable';
      this.loadReason = response?.message ?? 'The server inventory could not be read.';
      return { servers: this.servers, activeServerId: this.activeServerId, state: this.loadState, reason: this.loadReason };
    }
    const data = response.data as { servers?: ServerSummary[]; activeServerId?: string };
    this.servers = data.servers ?? [];
    this.activeServerId = data.activeServerId;
    this.loadState = 'loaded';
    this.loadReason = undefined;
    return { servers: this.servers, activeServerId: this.activeServerId, state: this.loadState };
  }

  async add(input: {
    name: string;
    connectionKind: string;
    wslDistribution?: string;
    dockerContext?: string;
    dockerProject?: string;
    host?: string;
    port?: number;
    user?: string;
    knownHostsPath?: string;
  }): Promise<ServerSummary | undefined> {
    const response = await this.request('server.inventory.add', { payload: input });
    if (!response?.ok) return undefined;
    await this.load();
    return (response.data as { server: ServerSummary }).server;
  }

  /** The caller is expected to have already run this past the destructive-action confirmation. */
  async remove(id: string): Promise<boolean> {
    const response = await this.request('server.inventory.remove', { serverId: id });
    if (!response?.ok) return false;
    await this.load();
    return true;
  }

  async setActive(id: string): Promise<ServerSummary | undefined> {
    const response = await this.request('server.inventory.set-active', { serverId: id });
    if (!response?.ok) return undefined;
    await this.load();
    return (response.data as { server: ServerSummary }).server;
  }

  async connect(id: string): Promise<ControlPlaneResponse | undefined> {
    return await this.request('server.connect', { serverId: id });
  }
}
