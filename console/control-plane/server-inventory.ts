/**
 * A real multi-server inventory.
 *
 * Before this module, the console tracked exactly one target: a single `TargetProfile`
 * held in the renderer's own component state, discovered fresh on every launch and
 * discarded the moment the window closed. Talking to a second Asterisk box meant losing
 * the first one. This module is the model half of fixing that: a list of configured
 * servers, each with its own connection details and its own independently observed
 * connection state, persisted so the list survives a restart, plus the notion of an
 * "active" server the rest of the interface acts on.
 *
 * Everything here is pure and injectable — no network, no filesystem, no Electron API.
 * The only I/O this module performs is through the `ServerInventoryStore` a caller
 * supplies, so it can be exercised in a plain `node:test` run and wired to a real file
 * (or a fake one) at the boundary in `app/electron/main.ts`.
 *
 * Secrets never live here. A server record may carry a `credentialKey` naming an entry
 * in the OS credential vault; the module never reads, writes, or reasons about the
 * secret value itself — only the stable key that names where to find it.
 */
import type { ConnectionKind, TargetProfile } from "./contracts.js";
import { CONNECTION_KINDS } from "./contracts.js";

export const SERVER_INVENTORY_SCHEMA_VERSION = 1 as const;

/** The honest states a server's connection can be in — never a guessed success. */
export const SERVER_CONNECTION_STATES = [
  "idle",
  "connecting",
  "connected",
  "unreachable",
  "refused",
] as const;

export type ServerConnectionState = (typeof SERVER_CONNECTION_STATES)[number];

const CONNECTION_STATE_SET: ReadonlySet<string> = new Set(SERVER_CONNECTION_STATES);

/** What a caller supplies to register a new server. */
export interface ServerRecordInput {
  name: string;
  connectionKind: ConnectionKind;
  host?: string;
  port?: number;
  user?: string;
  wslDistribution?: string;
  dockerContext?: string;
  dockerProject?: string;
  knownHostsPath?: string;
  /** Names an entry in the OS credential vault. The secret itself never passes through here. */
  credentialKey?: string;
}

/** One configured server, with its own independently tracked connection state. */
export interface ServerRecord extends ServerRecordInput {
  id: string;
  createdAt: string;
  state: ServerConnectionState;
  /** The real reason behind the current state — never present for `connected`. */
  reason?: string;
  lastSeenAt?: string;
}

export interface ServerInventoryStore {
  /** Returns `undefined` when nothing has been persisted yet. */
  read(): ServerInventorySnapshot | undefined;
  write(snapshot: ServerInventorySnapshot): void;
}

export interface ServerInventorySnapshot {
  schemaVersion: typeof SERVER_INVENTORY_SCHEMA_VERSION;
  servers: ServerRecord[];
  activeServerId?: string;
}

/** A store that keeps nothing — the default when a caller does not need persistence (tests). */
export class InMemoryServerInventoryStore implements ServerInventoryStore {
  private snapshot: ServerInventorySnapshot | undefined;
  read() {
    return this.snapshot;
  }
  write(snapshot: ServerInventorySnapshot) {
    this.snapshot = snapshot;
  }
}

export class ServerInventoryError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface ServerInventoryOptions {
  store?: ServerInventoryStore;
  generateId?: () => string;
  now?: () => string;
}

function defaultId(): string {
  return `srv-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function distributionKey(input: Pick<ServerRecordInput, "connectionKind" | "wslDistribution" | "dockerContext" | "dockerProject" | "host" | "port" | "user">): string {
  if (input.connectionKind === "wsl") return `wsl:${input.wslDistribution!.toLocaleLowerCase()}`;
  if (input.connectionKind === "localDocker") {
    return `localDocker:${(input.dockerContext ?? "default").toLocaleLowerCase()}:${input.dockerProject!.toLocaleLowerCase()}`;
  }
  if (input.connectionKind === "remoteDocker") {
    return `remoteDocker:${input.user!.toLocaleLowerCase()}@${input.host!.toLocaleLowerCase()}:${input.port ?? 22}:${(input.dockerContext ?? "default").toLocaleLowerCase()}:${input.dockerProject!.toLocaleLowerCase()}`;
  }
  return `remoteLinux:${input.user!.toLocaleLowerCase()}@${input.host!.toLocaleLowerCase()}:${input.port ?? 22}`;
}

const INPUT_KEYS = new Set([
  "name", "connectionKind", "host", "port", "user", "wslDistribution", "dockerContext",
  "dockerProject", "knownHostsPath", "credentialKey",
]);
const RECORD_KEYS = new Set([...INPUT_KEYS, "id", "createdAt", "state", "reason", "lastSeenAt"]);

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeInput(input: ServerRecordInput): ServerRecordInput {
  const raw = input as unknown as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (!INPUT_KEYS.has(key)) throw new ServerInventoryError("INVALID_FIELD", `Server field "${key}" is not allowed.`);
  }
  const name = text(raw.name);
  if (!name) throw new ServerInventoryError("NAME_REQUIRED", "A server needs a name.");
  const connectionKind = raw.connectionKind;
  if (typeof connectionKind !== "string" || !(CONNECTION_KINDS as ReadonlyArray<string>).includes(connectionKind)) {
    throw new ServerInventoryError("INVALID_CONNECTION_KIND", "Choose a supported server connection type.");
  }
  const kind = connectionKind as ConnectionKind;
  const port = raw.port === undefined ? undefined : Number(raw.port);
  if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65_535)) {
    throw new ServerInventoryError("INVALID_PORT", "The server port must be an integer from 1 to 65535.");
  }
  const host = text(raw.host);
  const user = text(raw.user);
  const wslDistribution = text(raw.wslDistribution);
  const dockerContext = text(raw.dockerContext);
  const dockerProject = text(raw.dockerProject);
  const knownHostsPath = text(raw.knownHostsPath);
  const credentialKey = text(raw.credentialKey);

  if (kind === "wsl") {
    if (!wslDistribution) throw new ServerInventoryError("WSL_DISTRIBUTION_REQUIRED", "Choose a discovered WSL distribution.");
    return { name, connectionKind: kind, wslDistribution };
  }
  if (kind === "localDocker") {
    if (!dockerProject) throw new ServerInventoryError("DOCKER_PROJECT_REQUIRED", "Choose a local Docker project.");
    if (!/^[A-Za-z0-9_.-]+$/u.test(dockerProject) || (dockerContext && !/^[A-Za-z0-9_.-]+$/u.test(dockerContext))) {
      throw new ServerInventoryError("INVALID_DOCKER_TARGET", "Docker context and project names may use letters, digits, dots, underscores, and hyphens.");
    }
    return { name, connectionKind: kind, dockerContext, dockerProject };
  }
  if (!host || !user) throw new ServerInventoryError("REMOTE_TARGET_REQUIRED", "A remote server needs both a host and user.");
  if (!/^(?:[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?|\[[0-9A-Fa-f:]+\])$/u.test(host)) {
    throw new ServerInventoryError("INVALID_HOST", "The remote host must be an exact DNS name or IP address.");
  }
  if (kind === "remoteDocker" && !dockerProject) {
    throw new ServerInventoryError("DOCKER_PROJECT_REQUIRED", "Choose the Docker project on the remote server.");
  }
  if (kind === "remoteDocker" && (!/^[A-Za-z0-9_.-]+$/u.test(dockerProject!) || (dockerContext && !/^[A-Za-z0-9_.-]+$/u.test(dockerContext)))) {
    throw new ServerInventoryError("INVALID_DOCKER_TARGET", "Docker context and project names may use letters, digits, dots, underscores, and hyphens.");
  }
  return {
    name,
    connectionKind: kind,
    host,
    user,
    port: port ?? 22,
    knownHostsPath,
    credentialKey,
    ...(kind === "remoteDocker" ? { dockerContext, dockerProject } : {}),
  };
}

/**
 * The server inventory: add, edit, remove, and the state each server observes for
 * itself. One server being unreachable never touches any other server's record — every
 * mutation here is keyed by id and never reasons about "the" connection, only "a"
 * connection.
 */
export class ServerInventory {
  private readonly store: ServerInventoryStore;
  private readonly generateId: () => string;
  private readonly now: () => string;
  private servers = new Map<string, ServerRecord>();
  private activeServerId: string | undefined;

  constructor(options: ServerInventoryOptions = {}) {
    this.store = options.store ?? new InMemoryServerInventoryStore();
    this.generateId = options.generateId ?? defaultId;
    this.now = options.now ?? (() => new Date().toISOString());
    this.load();
  }

  private load(): void {
    const snapshot = this.store.read();
    if (!snapshot) return;
    if (snapshot.schemaVersion !== SERVER_INVENTORY_SCHEMA_VERSION || !Array.isArray(snapshot.servers)) {
      throw new ServerInventoryError("INVENTORY_SCHEMA_INVALID", "The saved server inventory schema is unsupported or corrupt.");
    }
    const records = snapshot.servers.map((server) => this.validateRecord(server));
    this.servers = new Map(records.map(server => [server.id, server]));
    if (this.servers.size !== records.length) {
      throw new ServerInventoryError("INVENTORY_DUPLICATE_ID", "The saved server inventory contains duplicate ids.");
    }
    if (snapshot.activeServerId && this.servers.has(snapshot.activeServerId)) {
      this.activeServerId = snapshot.activeServerId;
    }
  }

  private persist(): void {
    this.store.write({ schemaVersion: SERVER_INVENTORY_SCHEMA_VERSION, servers: this.list(), activeServerId: this.activeServerId });
  }

  private validateRecord(server: ServerRecord): ServerRecord {
    if (typeof server !== "object" || server === null) {
      throw new ServerInventoryError("INVENTORY_RECORD_INVALID", "The saved server inventory contains an invalid record.");
    }
    for (const key of Object.keys(server)) {
      if (!RECORD_KEYS.has(key)) {
        throw new ServerInventoryError("INVENTORY_RECORD_INVALID", `Saved server field "${key}" is not allowed.`);
      }
    }
    const id = text((server as { id?: unknown }).id);
    const createdAt = text((server as { createdAt?: unknown }).createdAt);
    if (!id || !/^[A-Za-z0-9._:-]{1,128}$/u.test(id) || !createdAt || Number.isNaN(Date.parse(createdAt))) {
      throw new ServerInventoryError("INVENTORY_RECORD_INVALID", "A saved server record has an invalid id or timestamp.");
    }
    if (!CONNECTION_STATE_SET.has(server.state)) {
      throw new ServerInventoryError("INVENTORY_RECORD_INVALID", `Saved server ${id} has an invalid state.`);
    }
    const normalized = normalizeInput({
      name: server.name,
      connectionKind: server.connectionKind,
      host: server.host,
      port: server.port,
      user: server.user,
      wslDistribution: server.wslDistribution,
      dockerContext: server.dockerContext,
      dockerProject: server.dockerProject,
      knownHostsPath: server.knownHostsPath,
      credentialKey: server.credentialKey,
    });
    return { ...normalized, id, createdAt, state: server.state, reason: text(server.reason), lastSeenAt: text(server.lastSeenAt) };
  }

  private ensureUniqueTarget(candidate: ServerRecordInput, excludedId?: string): void {
    const key = distributionKey(candidate);
    for (const existing of this.servers.values()) {
      if (existing.id !== excludedId && distributionKey(existing) === key) {
        throw new ServerInventoryError("DUPLICATE_TARGET", `A server named "${existing.name}" already points at the same target.`);
      }
    }
  }

  list(): ServerRecord[] {
    return [...this.servers.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  get(id: string): ServerRecord | undefined {
    return this.servers.get(id);
  }

  activeId(): string | undefined {
    return this.activeServerId;
  }

  active(): ServerRecord | undefined {
    return this.activeServerId ? this.servers.get(this.activeServerId) : undefined;
  }

  /**
   * Registers a new server. Validated up front: a blank name, an unknown connection
   * kind, or a duplicate of a server already pointed at the same distribution/container/
   * host is refused rather than silently accepted and reconciled later.
   */
  add(input: ServerRecordInput): ServerRecord {
    const normalized = normalizeInput(input);
    this.ensureUniqueTarget(normalized);
    const record: ServerRecord = {
      ...normalized,
      id: this.generateId(),
      createdAt: this.now(),
      state: "idle",
    };
    this.servers.set(record.id, record);
    if (!this.activeServerId) this.activeServerId = record.id;
    this.persist();
    return record;
  }

  /** Edits connection details and invalidates stale connection evidence when routing changes. */
  update(id: string, patch: Partial<ServerRecordInput>): ServerRecord {
    const existing = this.mustGet(id);
    const candidate = { ...existing, ...patch };
    const normalized = normalizeInput({
      name: candidate.name,
      connectionKind: candidate.connectionKind,
      host: candidate.host,
      port: candidate.port,
      user: candidate.user,
      wslDistribution: candidate.wslDistribution,
      dockerContext: candidate.dockerContext,
      dockerProject: candidate.dockerProject,
      knownHostsPath: candidate.knownHostsPath,
      credentialKey: candidate.credentialKey,
    });
    this.ensureUniqueTarget(normalized, id);
    const targetChanged = distributionKey(existing) !== distributionKey(normalized);
    const updated: ServerRecord = {
      ...normalized,
      id: existing.id,
      createdAt: existing.createdAt,
      state: targetChanged ? "idle" : existing.state,
      reason: targetChanged ? undefined : existing.reason,
      lastSeenAt: targetChanged ? undefined : existing.lastSeenAt,
    };
    this.servers.set(id, updated);
    this.persist();
    return updated;
  }

  /**
   * Removes a server permanently. The renderer is expected to have already run this
   * past the product's destructive-action confirmation — this call itself performs the
   * removal without asking again, exactly like `runtime.remove` does for the bundled
   * runtime.
   */
  remove(id: string): void {
    this.mustGet(id);
    this.servers.delete(id);
    if (this.activeServerId === id) {
      this.activeServerId = this.list()[0]?.id;
    }
    this.persist();
  }

  /** Switches which server the rest of the interface acts on. Refuses an unknown id. */
  setActive(id: string): ServerRecord {
    const record = this.mustGet(id);
    this.activeServerId = id;
    this.persist();
    return record;
  }

  /**
   * Records what was actually observed for one server. Honest states only: a caller
   * reporting `connected` must not also supply a `reason`, and `unreachable`/`refused`
   * must supply the real one rather than leaving the previous server's reason in place.
   */
  setState(
    id: string,
    state: ServerConnectionState,
    reason?: string,
    evidence?: { targetId: string; operatingSystem: boolean; asterisk: boolean },
  ): ServerRecord {
    if (!CONNECTION_STATE_SET.has(state)) {
      throw new ServerInventoryError("INVALID_STATE", `"${state}" is not a recognised connection state.`);
    }
    const existing = this.mustGet(id);
    if (state === "connected" && (!evidence || evidence.targetId !== id || !evidence.operatingSystem || !evidence.asterisk)) {
      throw new ServerInventoryError("CONNECTED_EVIDENCE_REQUIRED", "A server is connected only after both operating-system and Asterisk probes succeed for that exact target.");
    }
    if ((state === "unreachable" || state === "refused") && !text(reason)) {
      throw new ServerInventoryError("STATE_REASON_REQUIRED", `The ${state} state needs the observed reason.`);
    }
    const updated: ServerRecord = {
      ...existing,
      state,
      reason: state === "connected" || state === "idle" || state === "connecting" ? undefined : reason,
      lastSeenAt: state === "connected" ? this.now() : existing.lastSeenAt,
    };
    this.servers.set(id, updated);
    this.persist();
    return updated;
  }

  private mustGet(id: string): ServerRecord {
    const record = this.servers.get(id);
    if (!record) throw new ServerInventoryError("SERVER_NOT_FOUND", `No server with id "${id}" is registered.`);
    return record;
  }

  /** Projects a record onto the `TargetProfile` shape the rest of the control plane already reads against. */
  toTargetProfile(id: string): TargetProfile {
    const server = this.mustGet(id);
    return {
      id: server.id,
      displayName: server.name,
      connectionKind: server.connectionKind,
      host: server.host,
      port: server.port,
      user: server.user,
      wslDistribution: server.wslDistribution,
      dockerContext: server.dockerContext,
      dockerProject: server.dockerProject,
      knownHostsPath: server.knownHostsPath,
    };
  }
}

/**
 * The cross-server response-routing guard.
 *
 * Every outstanding read/command/config request against a server is stamped with a
 * generation number for that exact server id. A response is only ever applied when it
 * is still both: (a) the newest request issued for that server (an older request whose
 * answer arrives late after a newer one was already issued for the same server is
 * stale), and (b) actually addressed to the server the caller is applying it to (a
 * response from server A must never be merged into server B's state, however it got
 * mixed up).
 *
 * This is what stops one server that is slow to answer from clobbering a screen that
 * has since switched to (or re-read) another server, or has re-issued a newer request
 * to the same server.
 */
export interface RequestToken {
  serverId: string;
  generation: number;
}

export class ResponseRoutingGuard {
  private generations = new Map<string, number>();

  /** Call when issuing a request. Keep the returned token and pass it back to `isCurrent`. */
  begin(serverId: string): RequestToken {
    const next = (this.generations.get(serverId) ?? 0) + 1;
    this.generations.set(serverId, next);
    return { serverId, generation: next };
  }

  /**
   * True only when `token` is still the newest request issued for its server id. A
   * caller must additionally check that `token.serverId` matches whatever it is about
   * to apply the response to — this method alone cannot know that, since a caller could
   * (incorrectly) pass a token for one server while writing into another's slot. See
   * `applyIfCurrent` for the version that enforces both checks together.
   */
  isCurrent(token: RequestToken): boolean {
    return this.generations.get(token.serverId) === token.generation;
  }
}

/**
 * Applies `data` to `target[token.serverId]` only when the token is still current for
 * that server AND `expectedServerId` (the server the caller believes it is updating —
 * typically "whatever screen/slot this callback closes over") actually matches
 * `token.serverId`. Returns whether the write happened, so a caller can tell a stale or
 * misrouted response was correctly dropped rather than silently ignored.
 */
export function applyIfCurrent<T>(
  guard: ResponseRoutingGuard,
  token: RequestToken,
  expectedServerId: string,
  target: Record<string, T>,
  data: T,
  /**
   * Where in `target` the answer belongs.
   *
   * Defaults to the server it came from, which is right when the slot holds one entry
   * per server. It is wrong when the caller's slot is keyed by something else, and that
   * went unnoticed: the console keys its readings by screen, so every answer was filed
   * under a server id nobody ever read back and every table stayed empty. The guard
   * reported success each time, because storing the answer was all it had been asked to
   * confirm.
   *
   * Naming the key explicitly keeps the routing check — is this answer still current, and
   * is it for the server we are looking at — separate from where the answer is filed.
   */
  key: string = token.serverId,
): boolean {
  if (token.serverId !== expectedServerId) return false;
  if (!guard.isCurrent(token)) return false;
  target[key] = data;
  return true;
}
