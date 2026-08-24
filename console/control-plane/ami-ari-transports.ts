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

export const AMI_ACTIONS: Record<string, { action: string; required: ReadonlyArray<string> }> = {
  ping: { action: "Ping", required: [] },
  coreStatus: { action: "CoreStatus", required: [] },
  commandCatalog: { action: "ListCommands", required: [] },
  moduleList: { action: "ModuleCheck", required: ["Module"] },
} as const;

for (const action of AMI_ACTION_REGISTRY) AMI_ACTIONS[action.id] = { action: action.name, required: [] };

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

export const ARI_OPERATIONS: Record<string, { method: string; path: string }> = {
  asteriskInfo: { method: "GET", path: "/ari/asterisk/info" },
  listChannels: { method: "GET", path: "/ari/channels" },
  listBridges: { method: "GET", path: "/ari/bridges" },
  listEndpoints: { method: "GET", path: "/ari/endpoints" },
  listApplications: { method: "GET", path: "/ari/applications" },
} as const;

for (const operation of ARI_OPERATION_REGISTRY) ARI_OPERATIONS[operation.id] = { method: operation.method, path: operation.path };

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

/** Bounded ARI HTTP transport with an allowlisted operation catalogue. */
export class AriTransport {
  readonly #options: Required<Pick<AriTransportOptions, "timeoutMs" | "maxResponseBytes" | "now">> & AriTransportOptions;

  constructor(options: AriTransportOptions) {
    const url = new URL(options.baseUrl);
    if (!/^https?:$/u.test(url.protocol) || url.username || url.password || url.hash || (url.protocol === "http:" && !isLoopback(url.hostname))) throw new Error("ARI base URL must use HTTPS, or HTTP on loopback, without credentials or fragments");
    this.#options = { ...options, timeoutMs: options.timeoutMs ?? 10_000, maxResponseBytes: options.maxResponseBytes ?? 2 * 1024 * 1024, now: options.now ?? (() => new Date()) };
  }

  async execute<T = unknown>(operation: AriOperationName, signal?: AbortSignal): Promise<AriReceipt<T>> {
    const credential = await this.#options.vault.read(this.#options.credentialKey, signal);
    const observedAt = this.#options.now().toISOString();
    if (!credential) return { state: "unavailable", observedAt, operation, reason: "The ARI credential is unavailable in the OS vault." };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#options.timeoutMs);
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const spec = ARI_OPERATIONS[operation];
      const url = new URL(spec.path, this.#options.baseUrl);
      const response = await fetch(url, { method: spec.method, redirect: "error", signal: controller.signal, headers: { Accept: "application/json", Authorization: `Basic ${Buffer.from(`${credential.username}:${credential.secret}`).toString("base64")}` } });
      const text = await boundedText(response, this.#options.maxResponseBytes);
      let value: T | undefined;
      if (text.trim()) {
        try { value = JSON.parse(text) as T; }
        catch { return { state: "unavailable", observedAt, operation, status: response.status, reason: "ARI returned malformed JSON." }; }
      }
      return { state: response.ok ? "available" : "unavailable", observedAt, operation, status: response.status, headers: { "content-type": response.headers.get("content-type") ?? undefined, etag: response.headers.get("etag") ?? undefined }, value, reason: response.ok ? undefined : `ARI returned HTTP ${response.status}.` };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "ARI request failed.";
      return { state: signal?.aborted ? "cancelled" : controller.signal.aborted ? "timedOut" : "unavailable", observedAt, operation, reason };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }

  async discoverResources(signal?: AbortSignal): Promise<{ state: TransportState; names: ReadonlyArray<string>; reason?: string }> {
    const names: string[] = [];
    for (const operation of Object.keys(ARI_OPERATIONS) as AriOperationName[]) {
      const spec = ARI_OPERATIONS[operation];
      if (spec.method !== "GET" && spec.method !== "HEAD") continue;
      const receipt = await this.execute(operation, signal);
      if (receipt.state === "cancelled" || receipt.state === "timedOut") return { state: receipt.state, names, reason: receipt.reason };
      if (receipt.state === "available") names.push(spec.path);
    }
    return { state: names.length > 0 ? "available" : "unavailable", names, reason: names.length > 0 ? undefined : "No ARI resource operation returned an available response." };
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

function safeHeader(value: string): string {
  if (/[\r\n]/u.test(value)) throw new Error("AMI field contains a line break");
  return value.slice(0, 4096);
}

function isLoopback(host: string): boolean {
  const value = host.trim().toLowerCase().replace(/^\[|\]$/gu, "");
  return value === "localhost" || value === "127.0.0.1" || value === "::1";
}
