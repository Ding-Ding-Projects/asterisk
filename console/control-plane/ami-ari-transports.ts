import { createConnection, type Socket } from "node:net";
import { connect as tlsConnect } from "node:tls";
import type { IncomingHttpHeaders } from "node:http";
import { AMI_ACTION_REGISTRY, ARI_OPERATION_REGISTRY } from "./generated/ami-ari-registry.js";

export interface VaultCredential {
  username: string;
  secret: string;
}

/** The host supplies an OS-vault implementation. Secrets never enter receipts. */
export interface CredentialVault {
  read(key: string, signal?: AbortSignal): Promise<VaultCredential | undefined>;
}

export type TransportState = "available" | "unavailable" | "timedOut" | "cancelled";

export interface AmiFieldMap {
  readonly [name: string]: string;
}

export interface AmiReceipt {
  state: TransportState;
  observedAt: string;
  action: AmiActionName;
  response?: string;
  message?: string;
  fields?: AmiFieldMap;
  reason?: string;
}

export const AMI_ACTIONS: Record<string, { action: string; required: ReadonlyArray<string>; parameters?: unknown }> = {
  ping: { action: "Ping", required: [] },
  coreStatus: { action: "CoreStatus", required: [] },
  commandCatalog: { action: "ListCommands", required: [] },
  moduleList: { action: "ModuleCheck", required: ["Module"] },
} as const;

for (const action of AMI_ACTION_REGISTRY) {
  const parameters = (action as unknown as { parameters?: ReadonlyArray<{ name?: string; required?: boolean }> }).parameters ?? [];
  AMI_ACTIONS[action.id] = { action: action.name, required: parameters.filter((parameter) => parameter.required && typeof parameter.name === 'string').map((parameter) => parameter.name!), parameters };
}

export type AmiActionName = string;

export interface AmiTransportOptions {
  host: string;
  port: number;
  credentialKey: string;
  vault: CredentialVault;
  timeoutMs?: number;
  tls?: boolean;
  now?: () => Date;
}

/**
 * Minimal bounded AMI transport. It supports only named, typed operations and
 * consumes credentials from the injected OS-vault boundary. It does not expose
 * a free-form action string or a shell route.
 */
export class AmiTransport {
  readonly #options: Required<Pick<AmiTransportOptions, "timeoutMs" | "now">> & AmiTransportOptions;

  constructor(options: AmiTransportOptions) {
    if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) throw new Error("AMI port must be 1-65535");
    if (!options.host.trim() || /[\r\n]/u.test(options.host)) throw new Error("AMI host is invalid");
    if (options.tls !== true && !isLoopback(options.host)) throw new Error("Plain AMI is permitted only on loopback; enable TLS for a remote target.");
    this.#options = { ...options, timeoutMs: options.timeoutMs ?? 10_000, now: options.now ?? (() => new Date()) };
  }

  async execute(operation: AmiActionName, fields: Readonly<Record<string, string>> = {}, signal?: AbortSignal): Promise<AmiReceipt> {
    const definition = AMI_ACTIONS[operation];
    for (const required of definition.required) if (typeof fields[required] !== "string" || !fields[required].trim()) return this.unavailable(operation, `AMI field ${required} is required.`);
    const credential = await this.#options.vault.read(this.#options.credentialKey, signal);
    if (!credential) return this.unavailable(operation, "The AMI credential is unavailable in the OS vault.");
    const payload = [
      `Action: Login`, `Username: ${credential.username}`, `Secret: ${credential.secret}`, `Events: off`, "",
      `Action: ${definition.action}`,
      ...Object.entries(fields).map(([key, value]) => `${key}: ${safeHeader(value)}`),
      "",
    ].join("\r\n");
    const started = this.#options.now().toISOString();
    try {
      const raw = await this.#exchange(payload, signal);
      const parsed = parseAmiHeaders(raw);
      return { state: parsed.response === "Success" ? "available" : "unavailable", observedAt: started, action: operation, ...parsed, reason: parsed.response === "Success" ? undefined : parsed.message };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "AMI exchange failed.";
      const state: TransportState = signal?.aborted ? "cancelled" : /timed out/iu.test(reason) ? "timedOut" : "unavailable";
      return { state, observedAt: started, action: operation, reason };
    }
  }

  #exchange(payload: string, signal?: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
      let socket: Socket | undefined;
      let settled = false;
      let buffer = "";
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener("abort", abort);
        socket?.destroy();
        if (error) reject(error); else resolve(buffer);
      };
      const abort = () => finish(new Error("AMI exchange cancelled"));
      if (signal?.aborted) return abort();
      signal?.addEventListener("abort", abort, { once: true });
      socket = this.#options.tls === true
        ? tlsConnect({ host: this.#options.host, port: this.#options.port, rejectUnauthorized: true })
        : createConnection({ host: this.#options.host, port: this.#options.port });
      socket.setTimeout(this.#options.timeoutMs, () => finish(new Error("AMI exchange timed out")));
      socket.setEncoding("utf8");
      socket.on("data", (chunk: string) => {
        buffer += chunk;
        if (buffer.includes("Response: Success") || buffer.includes("Response: Error")) finish();
        if (buffer.length > 512 * 1024) finish(new Error("AMI response exceeded the bounded receipt size"));
      });
      socket.once("error", (error) => finish(error));
      socket.once("connect", () => socket?.write(payload));
    });
  }

  #optionsNow(): string { return this.#options.now().toISOString(); }
  private unavailable(action: AmiActionName, reason: string): AmiReceipt { return { state: "unavailable", observedAt: this.#optionsNow(), action, reason }; }
}

export interface AmiEventEnvelope {
  event: string;
  fields: AmiFieldMap;
  observedAt: string;
}

export interface AmiEventTransportOptions extends AmiTransportOptions {
  queueLimit?: number;
  reconnectLimit?: number;
}

/** Event-only AMI session. Actions and events use separate lifecycles and receipts. */
export class AmiEventTransport {
  readonly #options: Required<Pick<AmiEventTransportOptions, "timeoutMs" | "queueLimit" | "reconnectLimit" | "now">> & AmiEventTransportOptions;
  readonly #knownEvents = new Set(AMI_EVENT_REGISTRY.map((event) => event.name));
  readonly #queue: AmiEventEnvelope[] = [];
  #socket: Socket | undefined;
  #stopped = false;
  #dropped = 0;

  constructor(options: AmiEventTransportOptions) {
    if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) throw new Error("AMI event port must be 1-65535");
    if (options.tls !== true && !isLoopback(options.host)) throw new Error("Plain AMI events are permitted only on loopback.");
    this.#options = { ...options, timeoutMs: options.timeoutMs ?? 10_000, queueLimit: options.queueLimit ?? 256, reconnectLimit: options.reconnectLimit ?? 3, now: options.now ?? (() => new Date()) };
  }

  async start(listener: (event: AmiEventEnvelope) => void, signal?: AbortSignal): Promise<{ state: TransportState; dropped: number; reason?: string }> {
    const credential = await this.#options.vault.read(this.#options.credentialKey, signal);
    if (!credential) return { state: "unavailable", dropped: 0, reason: "The AMI event credential is unavailable in the OS vault." };
    this.#stopped = false;
    signal?.addEventListener("abort", () => this.stop(), { once: true });
    let attempts = 0;
    while (!this.#stopped && attempts <= this.#options.reconnectLimit) {
      try {
        await this.#connect(credential, listener, signal);
        if (this.#stopped) return { state: "cancelled", dropped: this.#dropped };
      } catch (error) {
        if (this.#stopped || signal?.aborted) return { state: "cancelled", dropped: this.#dropped, reason: "AMI event stream cancelled." };
        attempts += 1;
        if (attempts > this.#options.reconnectLimit) return { state: "unavailable", dropped: this.#dropped, reason: error instanceof Error ? error.message : "AMI event stream failed." };
        await new Promise((resolve) => setTimeout(resolve, Math.min(2 ** attempts * 250, 2_000)));
      }
    }
    return { state: "cancelled", dropped: this.#dropped };
  }

  stop(): void { this.#stopped = true; this.#socket?.destroy(); this.#socket = undefined; }

  #connect(credential: VaultCredential, listener: (event: AmiEventEnvelope) => void, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      let buffer = "";
      let settled = false;
      const finish = (error?: Error) => { if (settled) return; settled = true; this.#socket?.destroy(); this.#socket = undefined; error ? reject(error) : resolve(); };
      this.#socket = this.#options.tls === true ? tlsConnect({ host: this.#options.host, port: this.#options.port, rejectUnauthorized: true }) : createConnection({ host: this.#options.host, port: this.#options.port });
      this.#socket.setTimeout(this.#options.timeoutMs, () => finish(new Error("AMI event stream timed out")));
      this.#socket.setEncoding("utf8");
      this.#socket.once("connect", () => this.#socket?.write(`Action: Login\r\nUsername: ${credential.username}\r\nSecret: ${credential.secret}\r\nEvents: on\r\n\r\n`));
      this.#socket.on("data", (chunk: string) => {
        buffer += chunk;
        if (buffer.length > 2 * 1024 * 1024) return finish(new Error("AMI event stream exceeded the bounded buffer"));
        let separator = buffer.indexOf("\r\n\r\n");
        while (separator >= 0) {
          const raw = buffer.slice(0, separator);
          buffer = buffer.slice(separator + 4);
          const fields = parseAmiHeaders(raw).fields;
          const event = fields.Event;
          if (event && this.#knownEvents.has(event)) {
            const envelope = { event, fields, observedAt: this.#options.now().toISOString() };
            if (this.#queue.length >= this.#options.queueLimit) { this.#queue.shift(); this.#dropped += 1; }
            this.#queue.push(envelope);
            listener(this.#queue.shift()!);
          }
          separator = buffer.indexOf("\r\n\r\n");
        }
      });
      this.#socket.once("close", () => finish());
      this.#socket.once("error", (error) => finish(error));
      if (signal?.aborted) finish(new Error("AMI event stream cancelled"));
    });
  }
}

export interface AriOperationSpec {
  method: string;
  path: string;
  parameters?: ReadonlyArray<{ name?: string; paramType?: string; required?: boolean; allowMultiple?: boolean; dataType?: string }>;
  requestSchema?: { body?: ReadonlyArray<{ name?: string; dataType?: string; required?: boolean }> };
  responseSchema?: { responseClass?: string; errors?: ReadonlyArray<{ code?: number; reason?: string }> };
  websocket?: { protocol?: string };
}

export const ARI_OPERATIONS: Record<string, AriOperationSpec> = {
  asteriskInfo: { method: "GET", path: "/ari/asterisk/info" },
  listChannels: { method: "GET", path: "/ari/channels" },
  listBridges: { method: "GET", path: "/ari/bridges" },
  listEndpoints: { method: "GET", path: "/ari/endpoints" },
  listApplications: { method: "GET", path: "/ari/applications" },
} as const;

for (const operation of ARI_OPERATION_REGISTRY) ARI_OPERATIONS[operation.id] = { method: operation.method, path: operation.path, parameters: operation.parameters, requestSchema: operation.requestSchema, responseSchema: operation.responseSchema, websocket: operation.websocket };

export type AriOperationName = string;

export interface AriReceipt<T = unknown> {
  state: TransportState;
  observedAt: string;
  operation: AriOperationName;
  status?: number;
  headers?: Readonly<Pick<IncomingHttpHeaders, "content-type" | "etag">>;
  value?: T;
  reason?: string;
}

export interface AriTransportOptions {
  baseUrl: string;
  credentialKey: string;
  vault: CredentialVault;
  timeoutMs?: number;
  maxResponseBytes?: number;
  now?: () => Date;
}

export interface AriOperationInput {
  parameters?: Readonly<Record<string, string | number | boolean>>;
  body?: unknown;
  headers?: Readonly<Record<string, string>>;
}

/** Bounded ARI HTTP transport with an allowlisted operation catalogue. */
export class AriTransport {
  readonly #options: Required<Pick<AriTransportOptions, "timeoutMs" | "maxResponseBytes" | "now">> & AriTransportOptions;

  constructor(options: AriTransportOptions) {
    const url = new URL(options.baseUrl);
    if (!/^https?:$/u.test(url.protocol) || url.username || url.password || url.hash || (url.protocol === "http:" && !isLoopback(url.hostname))) throw new Error("ARI base URL must use HTTPS, or HTTP on loopback, without credentials or fragments");
    this.#options = { ...options, timeoutMs: options.timeoutMs ?? 10_000, maxResponseBytes: options.maxResponseBytes ?? 2 * 1024 * 1024, now: options.now ?? (() => new Date()) };
  }

  async execute<T = unknown>(operation: AriOperationName, input: AriOperationInput = {}, signal?: AbortSignal): Promise<AriReceipt<T>> {
    const credential = await this.#options.vault.read(this.#options.credentialKey, signal);
    const observedAt = this.#options.now().toISOString();
    if (!credential) return { state: "unavailable", observedAt, operation, reason: "The ARI credential is unavailable in the OS vault." };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#options.timeoutMs);
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const spec = ARI_OPERATIONS[operation];
      if (!spec) return { state: "unavailable", observedAt, operation, reason: "The ARI operation is not registered." };
      const parameters = input.parameters ?? {};
      const declared = new Map((spec.parameters ?? []).map((parameter) => [parameter.name ?? "", parameter]));
      const unknown = Object.keys(parameters).filter((name) => !declared.has(name) && !spec.path.includes(`{${name}}`));
      if (unknown.length > 0) return { state: "unavailable", observedAt, operation, reason: `Unknown ARI parameters: ${unknown.join(", ")}.` };
      const unresolved = [...spec.path.matchAll(/\{([^}]+)\}/gu)].map((match) => match[1]).filter((name) => parameters[name] === undefined);
      const missingQuery = (spec.parameters ?? []).filter((parameter) => parameter.required && parameter.paramType !== "path" && parameters[parameter.name ?? ""] === undefined).map((parameter) => parameter.name ?? "unknown");
      if (missingQuery.length > 0) return { state: "unavailable", observedAt, operation, reason: `Missing ARI parameters: ${missingQuery.join(", ")}.` };
      if (unresolved.length > 0) return { state: "unavailable", observedAt, operation, reason: `Missing ARI path parameters: ${unresolved.join(", ")}.` };
      let path = spec.path.replace(/\{([^}]+)\}/gu, (_match, name: string) => encodeURIComponent(String(parameters[name])));
      const query = Object.entries(parameters).filter(([name]) => !spec.path.includes(`{${name}}`) && declared.get(name)?.paramType !== "body");
      if (query.length > 0) path += `?${new URLSearchParams(query.map(([name, value]) => [name, String(value)]))}`;
      const url = new URL(path, this.#options.baseUrl);
      const bodyRequired = (spec.requestSchema?.body ?? []).some((field) => field.required === true);
      if (bodyRequired && input.body === undefined) return { state: "unavailable", observedAt, operation, reason: "The ARI operation requires a request body." };
      const headers = Object.fromEntries(Object.entries(input.headers ?? {}).filter(([name]) => /^(Accept|Content-Type|If-Match|X-\w+)$/u.test(name)));
      const response = await fetch(url, { method: spec.method, redirect: "error", signal: controller.signal, headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${credential.username}:${credential.secret}`).toString("base64")}`, ...headers }, body: input.body === undefined ? undefined : JSON.stringify(input.body) });
      const text = await boundedText(response, this.#options.maxResponseBytes);
      let value: T | undefined;
      if (text.trim()) {
        try { value = JSON.parse(text) as T; }
        catch { return { state: "unavailable", observedAt, operation, status: response.status, reason: "ARI returned malformed JSON." }; }
      }
      const schemaError = response.ok ? responseSchemaError(value, spec.responseSchema?.responseClass) : undefined;
      return { state: response.ok && !schemaError ? "available" : "unavailable", observedAt, operation, status: response.status, headers: { "content-type": response.headers.get("content-type") ?? undefined, etag: response.headers.get("etag") ?? undefined }, value, reason: schemaError ?? (response.ok ? undefined : `ARI returned HTTP ${response.status}.`) };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "ARI request failed.";
      return { state: signal?.aborted ? "cancelled" : controller.signal.aborted ? "timedOut" : "unavailable", observedAt, operation, reason };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }

  async discoverResources(signal?: AbortSignal): Promise<{ state: TransportState; names: ReadonlyArray<string>; attempted: number; failed: number; complete: boolean; reason?: string }> {
    const operations = (Object.keys(ARI_OPERATIONS) as AriOperationName[]).filter((operation) => ARI_OPERATIONS[operation].method === "GET" || ARI_OPERATIONS[operation].method === "HEAD");
    const names: string[] = [];
    let failed = 0;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(this.#options.timeoutMs * 2, 30_000));
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    try {
      for (let index = 0; index < operations.length && !controller.signal.aborted; index += 4) {
        const batch = operations.slice(index, index + 4);
        const receipts = await Promise.all(batch.map((operation) => this.execute(operation, {}, controller.signal)));
        for (let offset = 0; offset < receipts.length; offset += 1) {
          const receipt = receipts[offset]!;
          if (receipt.state === "available") names.push(ARI_OPERATIONS[batch[offset]!]!.path);
          else failed += 1;
        }
      }
      cancelled = controller.signal.aborted;
      return { state: cancelled ? "timedOut" : names.length > 0 ? "available" : "unavailable", names, attempted: operations.length, failed, complete: !cancelled && failed === 0, reason: cancelled ? "ARI resource discovery exceeded its overall bound." : names.length > 0 ? undefined : "No ARI resource operation returned an available response." };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }
}

export interface AriWebSocketLike {
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((error: unknown) => void) | null;
  onclose: (() => void) | null;
  close(): void;
}

export type AriWebSocketFactory = (url: string, headers: Readonly<Record<string, string>>) => AriWebSocketLike;

export interface AriEventEnvelope {
  type: string;
  value: unknown;
  observedAt: string;
}

/** Bounded ARI WebSocket event transport. The host supplies a header-capable WebSocket factory. */
export class AriEventTransport {
  readonly #baseUrl: string;
  readonly #credentialKey: string;
  readonly #vault: CredentialVault;
  readonly #factory?: AriWebSocketFactory;
  readonly #queueLimit: number;
  readonly #reconnectLimit: number;
  readonly #now: () => Date;
  #socket: AriWebSocketLike | undefined;
  #stopped = false;
  #dropped = 0;

  constructor(options: AriTransportOptions & { webSocketFactory?: AriWebSocketFactory; queueLimit?: number; reconnectLimit?: number }) {
    const parsed = new URL(options.baseUrl);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && isLoopback(parsed.hostname))) throw new Error("ARI events require HTTPS, or HTTP on loopback");
    this.#baseUrl = options.baseUrl;
    this.#credentialKey = options.credentialKey;
    this.#vault = options.vault;
    this.#factory = options.webSocketFactory;
    this.#queueLimit = options.queueLimit ?? 256;
    this.#reconnectLimit = options.reconnectLimit ?? 3;
    this.#now = options.now ?? (() => new Date());
  }

  async start(listener: (event: AriEventEnvelope) => void, signal?: AbortSignal): Promise<{ state: TransportState; dropped: number; reason?: string }> {
    if (!this.#factory) return { state: "unavailable", dropped: 0, reason: "No header-capable WebSocket factory is mounted in this host." };
    const credential = await this.#vault.read(this.#credentialKey, signal);
    if (!credential) return { state: "unavailable", dropped: 0, reason: "The ARI event credential is unavailable in the OS vault." };
    this.#stopped = false;
    signal?.addEventListener("abort", () => this.stop(), { once: true });
    for (let attempt = 0; attempt <= this.#reconnectLimit && !this.#stopped; attempt += 1) {
      try {
        await this.#connect(credential, listener, signal);
      } catch (error) {
        if (this.#stopped || signal?.aborted) return { state: "cancelled", dropped: this.#dropped, reason: "ARI event stream cancelled." };
        if (attempt === this.#reconnectLimit) return { state: "unavailable", dropped: this.#dropped, reason: error instanceof Error ? error.message : "ARI event stream failed." };
        await new Promise((resolve) => setTimeout(resolve, Math.min(2 ** (attempt + 1) * 250, 2_000)));
      }
    }
    return { state: "cancelled", dropped: this.#dropped };
  }

  stop(): void { this.#stopped = true; this.#socket?.close(); this.#socket = undefined; }

  #connect(credential: VaultCredential, listener: (event: AriEventEnvelope) => void, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const queue: AriEventEnvelope[] = [];
      const finish = (error?: Error) => { if (settled) return; settled = true; this.#socket?.close(); this.#socket = undefined; error ? reject(error) : resolve(); };
      const url = this.#baseUrl.replace(/^http/iu, "ws") + "events";
      this.#socket = this.#factory!(url, { Authorization: `Basic ${Buffer.from(`${credential.username}:${credential.secret}`).toString("base64")}`, "Sec-WebSocket-Protocol": "ari" });
      this.#socket.onopen = () => undefined;
      this.#socket.onmessage = (event) => {
        if (typeof event.data !== "string" || event.data.length > 512 * 1024) return finish(new Error("ARI event exceeded the bounded size"));
        try {
          const parsed = JSON.parse(event.data) as { type?: unknown };
          if (typeof parsed.type !== "string") return;
          const envelope = { type: parsed.type, value: parsed, observedAt: this.#now().toISOString() };
          if (queue.length >= this.#queueLimit) { queue.shift(); this.#dropped += 1; }
          queue.push(envelope);
          listener(queue.shift()!);
        } catch { finish(new Error("ARI event was malformed JSON")); }
      };
      this.#socket.onerror = () => finish(new Error("ARI event socket failed"));
      this.#socket.onclose = () => finish();
      if (signal?.aborted) finish(new Error("ARI event stream cancelled"));
    });
  }
}

async function boundedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    bytes += next.value.byteLength;
    if (bytes > maxBytes) { await reader.cancel(); throw new Error("ARI response exceeded the bounded receipt size"); }
    chunks.push(next.value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

function parseAmiHeaders(raw: string): { response?: string; message?: string; fields: AmiFieldMap } {
  const fields: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/u)) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key.length <= 80 && value.length <= 4096) fields[key] = value;
  }
  return { response: fields.Response, message: fields.Message, fields };
}

function responseSchemaError(value: unknown, responseClass: string | undefined): string | undefined {
  if (!responseClass || responseClass === "void") return undefined;
  if (/^List\[/u.test(responseClass)) return Array.isArray(value) ? undefined : `ARI response schema expected ${responseClass}.`;
  return value !== null && typeof value === "object" ? undefined : `ARI response schema expected ${responseClass}.`;
}

function safeHeader(value: string): string {
  if (/[\r\n]/u.test(value)) throw new Error("AMI field contains a line break");
  return value.slice(0, 4096);
}

function isLoopback(host: string): boolean {
  const value = host.trim().toLowerCase().replace(/^\[|\]$/gu, "");
  return value === "localhost" || value === "127.0.0.1" || value === "::1";
}
