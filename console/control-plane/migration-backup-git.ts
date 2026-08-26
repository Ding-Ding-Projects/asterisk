/**
 * Local migration, verified backup, and local-history Git management.
 *
 * The payload is deliberately a directory rather than a loose archive.  A directory
 * keeps every manifest and hash inspectable offline, while the history itself is carried
 * only as a verified Git bundle.  No `.git` directory from a source installation is ever
 * copied into a migration payload.
 */
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync,
  rmSync, statSync, writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import type { ProcessExecutor } from "./executor.js";
import { atomicWriteFileSync } from "./atomic-file.js";
import { redactText } from "./redaction.js";

export const MIGRATION_SCHEMA_VERSION = 1;
export const MIGRATION_LIMITS = Object.freeze({
  maxManifestBytes: 1_048_576,
  maxFileBytes: 64 * 1024 * 1024,
  maxPayloadBytes: 512 * 1024 * 1024,
  maxEntries: 4_096,
  maxDepth: 8,
  maxPathLength: 240,
  maxStringLength: 8_192,
  maxRefs: 4_096,
  maxOmissions: 4_096,
  maxRetention: 365,
  maxOperations: 256,
  maxReceipts: 256,
  maxTimestampLength: 64,
});

const SAFE_FILE_NAMES = new Set([
  "servers.json", "settings.json", "notifications.json", "tabs.json", "groups.json",
  "appearance.json", "documents.json", "history-manifest.json", "git-receipts.json", "migration-operations.json",
]);
/* The local history directory is represented only by history.bundle.  Traversing it
 * would copy loose objects, which is explicitly not a migration format. */
const SAFE_DIRECTORIES = new Set(["artifacts"]);
const APP_OWNED_INVENTORY = Object.freeze([
  "servers.json", "settings.json", "notifications.json", "tabs.json", "groups.json",
  "appearance.json", "documents.json", "history-manifest.json", "git-receipts.json",
  "migration-operations.json", "history/", "artifacts/", "backups/",
]);
const UNSAFE_JSON_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const SECRET_WORD = /(credential|password|passwd|secret|token|totp|pin|passkey|vocabulary)/iu;
const SOURCE_PATH_KEY = /(?:source|file|config|working)[-_]?path$|directory$/iu;
const TRANSIENT_NAMES = /(cache|tmp|temp|lock|socket|session)/iu;
const REMOTE_NAME = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/u;
const SHA256 = /^[0-9a-f]{64}$/iu;
const OBJECT_ID = /^[0-9a-f]{40,64}$/iu;
const RECORD_SCHEMAS: Readonly<Record<string, ReadonlySet<string> | "array" | "settings">> = Object.freeze({
  "servers.json": new Set(["servers", "activeServerId"]),
  "settings.json": "settings",
  "notifications.json": new Set(["notifications"]),
  "tabs.json": new Set(["tabs", "activeTab", "pinned", "groups"]),
  "groups.json": new Set(["groups"]),
  "appearance.json": new Set(["schemaVersion", "values", "theme", "rules"]),
  "documents.json": new Set(["documents"]),
  "history-manifest.json": new Set(["schemaVersion", "entries"]),
  "git-receipts.json": "array",
  "migration-operations.json": "array",
});
const NESTED_RECORD_SCHEMAS: Readonly<Record<string, ReadonlySet<string>>> = Object.freeze({
  servers: new Set(["id", "name", "connectionKind", "host", "port", "user", "wslDistribution", "dockerContext", "dockerProject", "knownHostsPath", "credentialKey", "createdAt", "state", "reason", "lastSeenAt"]),
  notifications: new Set(["id", "title", "body", "severity", "createdAt", "dismissed", "action"]),
  tabs: new Set(["id", "label", "title", "groupId", "pinned", "appearance"]),
  groups: new Set(["id", "name", "colour", "collapsed", "tabIds", "appearance"]),
  documents: new Set(["id", "name", "content", "format", "updatedAt"]),
  entries: new Set(["id", "action", "subject", "createdAt", "commit"]),
});
const BOOLEAN_FIELDS = new Set(["pinned", "collapsed", "dismissed"]);
const DATE_FIELDS = new Set(["createdAt", "updatedAt", "lastSeenAt", "observedAt"]);
const NUMBER_FIELDS = new Set(["port"]);
const ENUM_FIELDS: Readonly<Record<string, ReadonlySet<string>>> = Object.freeze({
  connectionKind: new Set(["wsl", "docker", "ssh", "local"]),
  severity: new Set(["info", "success", "progress", "warning", "error"]),
  format: new Set(["json", "jsonl", "yaml", "toml", "xml", "csv", "tsv", "markdown", "html"]),
  state: new Set(["available", "unavailable", "connecting", "connected", "unreachable", "clean", "dirty"]),
});

export type MigrationOmissionReason =
  | "credential-vault-secret"
  | "private-vocabulary"
  | "source-path"
  | "transient-cache"
  | "unsafe-or-unsupported";
const OMISSION_REASONS = new Set<MigrationOmissionReason>(["credential-vault-secret", "private-vocabulary", "source-path", "transient-cache", "unsafe-or-unsupported"]);

export interface MigrationOmission {
  path: string;
  reason: MigrationOmissionReason;
  detail: string;
}

export interface MigrationFileRecord {
  path: string;
  bytes: number;
  sha256: string;
}

export interface MigrationGitRecord {
  path: string;
  bytes: number;
  sha256: string;
  refs: ReadonlyArray<{ name: string; object: string; kind: string }>;
  head: string;
  detachedHead: boolean;
  verified: boolean;
}

export interface MigrationManifest {
  schemaVersion: number;
  kind: "ding-pbx-console-migration";
  createdAt: string;
  application: string;
  files: ReadonlyArray<MigrationFileRecord>;
  gitHistory: MigrationGitRecord | null;
  omissions: ReadonlyArray<MigrationOmission>;
  retention: { backups: number };
}

export type OperationState = "queued" | "running" | "paused" | "succeeded" | "partial" | "failed" | "cancelled";

export interface OperationItem {
  path: string;
  state: "queued" | "running" | "succeeded" | "skipped" | "failed" | "cancelled";
  bytes?: number;
  detail?: string;
}

export interface MigrationOperation {
  id: string;
  kind: "export" | "import" | "backup" | "fetch" | "push" | "remote-set" | "remote-remove";
  startedAt: string;
  finishedAt?: string;
  state: OperationState;
  completed: number;
  total: number;
  bytesDone: number;
  bytesTotal: number;
  phase: "validate" | "stage" | "verify" | "swap" | "complete";
  items: ReadonlyArray<OperationItem>;
  detail: string;
}

export interface RemoteRecord {
  name: string;
  url: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface GitStatusRecord {
  repositoryPath: string;
  head: string;
  branch: string;
  clean: boolean;
  ahead: number;
  behind: number;
  divergence: boolean;
  comparison: "verified" | "unverified";
  refs: ReadonlyArray<{ name: string; object: string; kind: string }>;
  remotes: ReadonlyArray<RemoteRecord>;
  receipts: ReadonlyArray<GitReceipt>;
  receiptError?: string;
  corruptReceipt?: { kind: "corrupt-receipt"; path: string; detail: string };
  receipt?: GitReceipt;
}

export interface GitReceipt {
  id: string;
  action: "fetch" | "push" | "remote-set" | "remote-remove";
  remote: string;
  branch: string;
  status: "prepared" | "success" | "rejected" | "auth-failure" | "divergence" | "cancelled" | "unverified" | "receipt-write-failure" | "corrupt";
  observedAt: string;
  detail: string;
}

interface PrunePreviewRecord {
  path: string;
  kind: string;
  manifestSha256: string;
  status: string;
  verified: boolean;
  eligible: boolean;
  reason: string;
}

interface PrunePreview {
  token: string;
  keep: number;
  selectedPaths: ReadonlyArray<string>;
  indexRevision: string;
  expiresAt: number;
  records: ReadonlyArray<PrunePreviewRecord>;
}

export interface MigrationBackupOptions {
  userDataPath: string;
  historyPath?: string;
  executor: ProcessExecutor;
  now?: () => Date;
}

function nowIso(now: () => Date): string { return now().toISOString(); }
function sha256File(path: string): string { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function bytes(path: string): number { return statSync(path).size; }
function operationPath(root: string): string { return join(root, "migration-operations.json"); }
function receiptPath(root: string): string { return join(root, "git-receipts.json"); }
function backupIndexPath(root: string): string { return join(root, "backups", "index.json"); }

function assertBoundedPath(path: string, field = "path"): string {
  if (typeof path !== "string" || path.length === 0 || path.length > MIGRATION_LIMITS.maxPathLength) {
    throw new Error(`${field} is empty or exceeds ${MIGRATION_LIMITS.maxPathLength} characters.`);
  }
  const normalized = path.replaceAll("\\", "/");
  if (normalized.startsWith("/") || /^[A-Za-z]:\//u.test(normalized) || normalized.split("/").includes("..")) {
    throw new Error(`${field} must be relative and must not contain traversal.`);
  }
  return normalized;
}

function assertNoLinksAlong(path: string, boundary?: string): void {
  const absolute = resolve(path); const root = boundary ? resolve(boundary) : undefined;
  if (root && absolute !== root && !absolute.startsWith(`${root}${sep}`)) throw new Error(`Path escaped its application-data boundary: ${path}`);
  let current = absolute;
  while (true) {
    try {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink()) throw new Error(`Symlink is not accepted in migration data: ${path}`);
      if (process.platform === "win32" && ((stat as unknown as { isReparsePoint?: () => boolean }).isReparsePoint?.() ?? false)) throw new Error(`Reparse point is not accepted in migration data: ${path}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const parent = dirname(current); if (parent === current) break; current = parent;
  }
}

function assertTreeNoLinks(root: string, boundary?: string): void {
  assertNoLinksAlong(root, boundary);
  if (!existsSync(root)) return;
  const stat = lstatSync(root); if (!stat.isDirectory()) throw new Error(`Expected a directory at ${root}.`);
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const child = join(root, entry.name); assertNoLinksAlong(child, boundary);
    if (entry.isDirectory()) assertTreeNoLinks(child, boundary);
  }
}

/** A small strict JSON parser that rejects duplicate object keys before JSON.parse can erase them. */
class StrictJsonParser {
  private index = 0;
  constructor(private readonly source: string) {}
  parse(): unknown { const value = this.value(0); this.ws(); if (this.index !== this.source.length) throw new Error("Trailing data after JSON value."); return value; }
  private ws(): void { while (/\s/u.test(this.source[this.index] ?? "")) this.index += 1; }
  private value(depth: number): unknown {
    if (depth > MIGRATION_LIMITS.maxDepth) throw new Error("JSON nesting exceeds the migration limit.");
    this.ws(); const ch = this.source[this.index];
    if (ch === "{") return this.object(depth + 1);
    if (ch === "[") return this.array(depth + 1);
    if (ch === '"') return this.string();
    if (this.source.startsWith("true", this.index)) { this.index += 4; return true; }
    if (this.source.startsWith("false", this.index)) { this.index += 5; return false; }
    if (this.source.startsWith("null", this.index)) { this.index += 4; return null; }
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(this.source.slice(this.index));
    if (number) { this.index += number[0].length; return Number(number[0]); }
    throw new Error(`Invalid JSON at offset ${this.index}.`);
  }
  private string(): string {
    const start = this.index; this.index += 1;
    let escaped = false;
    while (this.index < this.source.length) {
      const ch = this.source[this.index++];
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === '"') return JSON.parse(this.source.slice(start, this.index)) as string;
    }
    throw new Error("Unterminated JSON string.");
  }
  private object(depth: number): Record<string, unknown> {
    this.index += 1; const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>; const keys = new Set<string>(); this.ws();
    if (this.source[this.index] === "}") { this.index += 1; return result; }
    while (this.index < this.source.length) {
      this.ws(); if (this.source[this.index] !== '"') throw new Error("Object key must be a JSON string.");
      const key = this.string(); if (keys.has(key)) throw new Error(`Duplicate JSON key: ${key}`); if (UNSAFE_JSON_KEYS.has(key)) throw new Error(`Unsafe JSON key: ${key}`); keys.add(key);
      this.ws(); if (this.source[this.index++] !== ":") throw new Error("Missing colon after JSON key.");
      result[key] = this.value(depth); this.ws(); const next = this.source[this.index++];
      if (next === "}") return result; if (next !== ",") throw new Error("Missing comma in JSON object.");
    }
    throw new Error("Unterminated JSON object.");
  }
  private array(depth: number): unknown[] {
    this.index += 1; const result: unknown[] = []; this.ws();
    if (this.source[this.index] === "]") { this.index += 1; return result; }
    while (this.index < this.source.length) {
      result.push(this.value(depth)); this.ws(); const next = this.source[this.index++];
      if (next === "]") return result; if (next !== ",") throw new Error("Missing comma in JSON array.");
    }
    throw new Error("Unterminated JSON array.");
  }
}

function readJsonStrict(path: string, maxBytes = MIGRATION_LIMITS.maxManifestBytes): unknown {
  if (bytes(path) > maxBytes) throw new Error(`${basename(path)} exceeds its size limit.`);
  return new StrictJsonParser(readFileSync(path, "utf8")).parse();
}

function assertExactKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>, label: string): void {
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${label} contains unsupported field ${key}.`);
}

function validateSafeJson(value: unknown, path: string, depth = 0): void {
  if (depth > MIGRATION_LIMITS.maxDepth) throw new Error(`${path} exceeds the JSON depth limit.`);
  if (typeof value === "string") { if (value.length > MIGRATION_LIMITS.maxStringLength) throw new Error(`${path} contains an overlong string.`); return; }
  if (typeof value === "number") { if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) throw new Error(`${path} contains an unsafe number.`); return; }
  if (typeof value === "boolean" || value === null) return;
  if (Array.isArray(value)) { if (value.length > MIGRATION_LIMITS.maxEntries) throw new Error(`${path} contains too many entries.`); value.forEach((entry, index) => validateSafeJson(entry, `${path}[${index}]`, depth + 1)); return; }
  if (typeof value !== "object") throw new Error(`${path} contains an unsupported JSON value.`);
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (UNSAFE_JSON_KEYS.has(key) || key.length > MIGRATION_LIMITS.maxStringLength || SECRET_WORD.test(key) || SOURCE_PATH_KEY.test(key)) throw new Error(`${path} contains an unsafe field name.`);
    validateSafeJson(entry, `${path}.${key}`, depth + 1);
  }
}

function sanitizeDiagnostic(value: string): string {
  return redactText(value).replace(/(https?:\/\/|ssh:\/\/)([^\s/@:]+):([^\s/@]+)@/giu, "$1[REDACTED]@");
}

function sanitizeJson(value: unknown): unknown {
  if (typeof value === "string") return sanitizeDiagnostic(value);
  if (Array.isArray(value)) return value.map(sanitizeJson);
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) { if (SECRET_WORD.test(key) || SOURCE_PATH_KEY.test(key)) continue; output[key] = sanitizeJson(entry); }
    return output;
  }
  return value;
}

function sanitizeRecordPayload(path: string, value: unknown): { value: unknown; omissions: ReadonlyArray<{ field: string; reason: MigrationOmissionReason }> } {
  const schema = RECORD_SCHEMAS[basename(path)]; const omissions: Array<{ field: string; reason: MigrationOmissionReason }> = [];
  if (schema === "settings") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} must be an object of string settings.`);
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (/vocab/iu.test(key)) { omissions.push({ field: key, reason: "private-vocabulary" }); continue; }
      if (SECRET_WORD.test(key)) { omissions.push({ field: key, reason: "credential-vault-secret" }); continue; }
      if (SOURCE_PATH_KEY.test(key)) { omissions.push({ field: key, reason: "source-path" }); continue; }
      if (typeof entry !== "string" || entry.length > MIGRATION_LIMITS.maxStringLength) throw new Error(`${path}.${key} must be a bounded string.`);
      output[key] = entry;
    }
    return { value: output, omissions };
  }
  if (schema === "array") {
    if (!Array.isArray(value) || value.length > MIGRATION_LIMITS.maxEntries) throw new Error(`${path} must be a bounded array record.`);
    for (const entry of value) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`${path} contains a non-object record.`);
      if (basename(path) === "git-receipts.json") assertExactKeys(entry as Record<string, unknown>, new Set(["id", "action", "remote", "branch", "status", "observedAt", "detail"]), "Git receipt");
      if (basename(path) === "migration-operations.json") { assertExactKeys(entry as Record<string, unknown>, new Set(["id", "kind", "startedAt", "finishedAt", "state", "completed", "total", "bytesDone", "bytesTotal", "phase", "items", "detail"]), "Migration operation"); const items = (entry as Record<string, unknown>).items; if (!Array.isArray(items) || items.length > MIGRATION_LIMITS.maxEntries) throw new Error(`${path} operation items are invalid.`); for (const item of items) { if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`${path} operation item is invalid.`); assertExactKeys(item as Record<string, unknown>, new Set(["path", "state", "bytes", "detail"]), "Migration operation item"); validateSafeJson(item, `${path}.items`); } }
    }
    return { value, omissions };
  }
  if (schema && (!value || typeof value !== "object" || Array.isArray(value))) throw new Error(`${path} must be an object record.`);
  if (schema) {
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (/vocab/iu.test(key)) { omissions.push({ field: key, reason: "private-vocabulary" }); continue; }
      if (SECRET_WORD.test(key)) { omissions.push({ field: key, reason: "credential-vault-secret" }); continue; }
      if (SOURCE_PATH_KEY.test(key)) { omissions.push({ field: key, reason: "source-path" }); continue; }
      if (!schema.has(key)) throw new Error(`${path} contains unsupported field ${key}.`);
      output[key] = entry;
      const nestedSchema = NESTED_RECORD_SCHEMAS[key]; if (nestedSchema && Array.isArray(entry)) { const safeNested = entry.map((nested, index) => { if (!nested || typeof nested !== "object" || Array.isArray(nested)) throw new Error(`${path}.${key} contains a non-object record.`); const copy: Record<string, unknown> = Object.create(null) as Record<string, unknown>; for (const [nestedKey, nestedValue] of Object.entries(nested as Record<string, unknown>)) { if (/vocab/iu.test(nestedKey)) { omissions.push({ field: `${key}[${index}].${nestedKey}`, reason: "private-vocabulary" }); continue; } if (SECRET_WORD.test(nestedKey)) { omissions.push({ field: `${key}[${index}].${nestedKey}`, reason: "credential-vault-secret" }); continue; } if (SOURCE_PATH_KEY.test(nestedKey)) { omissions.push({ field: `${key}[${index}].${nestedKey}`, reason: "source-path" }); continue; } if (BOOLEAN_FIELDS.has(nestedKey) && typeof nestedValue !== "boolean") throw new Error(`${path}.${key}[${index}].${nestedKey} must be boolean.`); if (DATE_FIELDS.has(nestedKey) && (typeof nestedValue !== "string" || !Number.isFinite(Date.parse(nestedValue)))) throw new Error(`${path}.${key}[${index}].${nestedKey} must be an ISO timestamp.`); if (NUMBER_FIELDS.has(nestedKey) && (typeof nestedValue !== "number" || !Number.isSafeInteger(nestedValue) || nestedValue < 0 || nestedValue > 65535)) throw new Error(`${path}.${key}[${index}].${nestedKey} must be a bounded integer.`); if (ENUM_FIELDS[nestedKey] && (typeof nestedValue !== "string" || !ENUM_FIELDS[nestedKey].has(nestedValue))) throw new Error(`${path}.${key}[${index}].${nestedKey} has an unsupported value.`); validateSafeJson(nestedValue, `${path}.${key}[${index}].${nestedKey}`); copy[nestedKey] = nestedValue; } assertExactKeys(copy, nestedSchema, `${path}.${key}`); return copy; }); output[key] = safeNested; }
    }
    return { value: output, omissions };
  }
  const sanitized = sanitizeJson(value); validateSafeJson(sanitized, path); return { value: sanitized, omissions };
}

function validateRecordFile(path: string): void {
  if (!path.toLowerCase().endsWith(".json")) return;
  const record = sanitizeRecordPayload(path, readJsonStrict(path, MIGRATION_LIMITS.maxFileBytes));
  if (record.omissions.length > 0) throw new Error(`${path} contains fields that were not represented by manifest omissions.`);
  validateSafeJson(record.value, path);
}

function overlapsPath(left: string, right: string): boolean {
  const a = resolve(left); const b = resolve(right);
  return a === b || a.startsWith(`${b}${sep}`) || b.startsWith(`${a}${sep}`);
}

function validatedExportDestination(requested: string | undefined, liveRoot: string, historyRoot: string, internalBackupRoot?: string): string {
  const protectedRoots = [liveRoot, historyRoot, join(liveRoot, "backups")];
  const parent = requested ? dirname(resolve(requested)) : join(dirname(liveRoot), "Ding PBX Console Exports");
  const output = resolve(requested || join(parent, `ding-pbx-migration-${Date.now()}-${randomUUID()}`));
  const internal = internalBackupRoot ? resolve(internalBackupRoot) : undefined;
  const allowedInternalChild = internal && output !== internal && output.startsWith(`${internal}${sep}`);
  if (!allowedInternalChild && protectedRoots.some((root) => overlapsPath(output, root))) throw new Error("Export destination may not be the live data, history, backup root, or any ancestor or descendant of those roots.");
  if (internal && !allowedInternalChild && overlapsPath(output, internal)) throw new Error("Internal backup destinations must be fresh children of the verified backup root.");
  if (internal) assertNoLinksAlong(internal, liveRoot);
  assertNoLinksAlong(parent); if (existsSync(output)) throw new Error("Export destination already exists. Choose a fresh child so an existing destination is preserved.");
  mkdirSync(parent, { recursive: true }); assertNoLinksAlong(parent); return output;
}

function renameRetry(from: string, to: string, attempts = 8): void {
  let last: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { renameSync(from, to); return; } catch (error) {
      last = error; const code = (error as NodeJS.ErrnoException).code;
      if (!["EPERM", "EACCES", "EBUSY"].includes(code ?? "")) break;
      const buffer = new SharedArrayBuffer(4); Atomics.wait(new Int32Array(buffer), 0, 0, 40);
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

function validRemoteUrl(raw: string): string {
  const value = raw.trim();
  if (!value || /[\u0000-\u001f\u007f]/u.test(value) || /[\s]/u.test(value)) throw new Error("Remote URL contains whitespace or control characters.");
  if (/^git@[^:]+:\/[^\s]+$/u.test(value)) return value;
  if (/^[A-Za-z]:[\\/]/u.test(value) || value.startsWith("/") || value.startsWith("\\\\")) return resolve(value);
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("Remote URL must be HTTPS, SSH, or an absolute local bare-repository path."); }
  if (!["https:", "ssh:"].includes(parsed.protocol)) throw new Error("Remote URL protocol must be HTTPS or SSH.");
  if (parsed.username || parsed.password || !parsed.hostname || parsed.search || parsed.hash) throw new Error("Remote URL must not embed credentials, query data, or fragments.");
  if (parsed.protocol === "ssh:" && !parsed.pathname.startsWith("/")) throw new Error("SSH remote path must be absolute.");
  return value;
}

function isLocalBareRepository(value: string): boolean {
  return /^[A-Za-z]:[\\/]/u.test(value) || value.startsWith("/") || value.startsWith("\\\\");
}

function assertLocalBareLayout(value: string, label: string): void {
  if (!existsSync(join(value, "HEAD")) || !existsSync(join(value, "objects")) || !existsSync(join(value, "refs"))) throw new Error(`${label} must be an existing bare repository with HEAD, objects, and refs.`);
  assertNoLinksAlong(value);
}

function assertManifest(value: unknown): asserts value is MigrationManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Migration manifest must be an object.");
  const manifest = value as Record<string, unknown>;
  assertExactKeys(manifest, new Set(["schemaVersion", "kind", "createdAt", "application", "files", "gitHistory", "omissions", "retention"]), "Migration manifest");
  if (manifest.schemaVersion !== MIGRATION_SCHEMA_VERSION || manifest.kind !== "ding-pbx-console-migration") throw new Error("Unknown or future migration schema.");
  if (typeof manifest.createdAt !== "string" || manifest.createdAt.length > MIGRATION_LIMITS.maxTimestampLength || !Number.isFinite(Date.parse(manifest.createdAt))) throw new Error("Migration timestamp is invalid.");
  if (typeof manifest.application !== "string" || manifest.application.length > MIGRATION_LIMITS.maxStringLength) throw new Error("Migration application name is invalid.");
  if (!Array.isArray(manifest.files) || manifest.files.length > MIGRATION_LIMITS.maxEntries) throw new Error("Migration file list is invalid or too large.");
  if (!Array.isArray(manifest.omissions) || manifest.omissions.length > MIGRATION_LIMITS.maxOmissions) throw new Error("Migration omissions are required and bounded.");
  const seen = new Set<string>();
  for (const entry of manifest.files as Array<Record<string, unknown>>) {
    assertExactKeys(entry, new Set(["path", "bytes", "sha256"]), "Migration file record");
    const path = assertBoundedPath(String(entry.path ?? ""));
    if (seen.has(path)) throw new Error(`Duplicate migration file: ${path}`); seen.add(path);
    if (!Number.isSafeInteger(entry.bytes) || Number(entry.bytes) < 0 || Number(entry.bytes) > MIGRATION_LIMITS.maxFileBytes || !SHA256.test(String(entry.sha256 ?? ""))) throw new Error(`Invalid file record: ${path}`);
  }
  for (const omission of manifest.omissions as Array<Record<string, unknown>>) {
    assertExactKeys(omission, new Set(["path", "reason", "detail"]), "Migration omission");
    if (typeof omission.path !== "string" || omission.path.length > MIGRATION_LIMITS.maxPathLength || typeof omission.reason !== "string" || omission.reason.length > MIGRATION_LIMITS.maxStringLength || !OMISSION_REASONS.has(omission.reason as MigrationOmissionReason) || typeof omission.detail !== "string" || omission.detail.length > MIGRATION_LIMITS.maxStringLength) throw new Error("Migration omission is invalid.");
  }
  const omissionPaths = new Set<string>(); const baseOmissions = new Set(["credential-vault", "personal-vocabulary", "source-paths", "transient-caches", "history/", "backups/"]); for (const omission of manifest.omissions as Array<Record<string, unknown>>) { const path = String(omission.path); if (omissionPaths.has(path)) throw new Error(`Duplicate migration omission: ${path}`); const fieldBase = path.includes("#") ? path.slice(0, path.indexOf("#")) : path; if (!baseOmissions.has(path) && !seen.has(fieldBase)) throw new Error(`Migration omission is not derived from the handwritten inventory: ${path}`); omissionPaths.add(path); }
  const git = manifest.gitHistory;
  if (git !== null && (typeof git !== "object" || git === undefined)) throw new Error("Invalid Git bundle record.");
  if (git !== null) {
    const record = git as Record<string, unknown>; assertExactKeys(record, new Set(["path", "bytes", "sha256", "refs", "head", "detachedHead", "verified"]), "Git bundle record");
    if (typeof record.path !== "string" || record.path !== "history.bundle" || !SHA256.test(String(record.sha256 ?? "")) || !Number.isSafeInteger(record.bytes) || Number(record.bytes) < 1 || Number(record.bytes) > MIGRATION_LIMITS.maxFileBytes || typeof record.head !== "string" || !OBJECT_ID.test(record.head) || typeof record.detachedHead !== "boolean" || record.verified !== true || !Array.isArray(record.refs) || record.refs.length > MIGRATION_LIMITS.maxRefs) throw new Error("Invalid Git bundle record.");
    const refs = record.refs as Array<Record<string, unknown>>; for (const ref of refs) { assertExactKeys(ref, new Set(["name", "object", "kind"]), "Git ref"); if (typeof ref.name !== "string" || ref.name.length > MIGRATION_LIMITS.maxStringLength || !OBJECT_ID.test(String(ref.object ?? "")) || !["commit", "tag", "tree", "blob"].includes(String(ref.kind))) throw new Error("Invalid Git ref."); }
  }
  if (!manifest.retention || typeof manifest.retention !== "object" || Array.isArray(manifest.retention)) throw new Error("Migration retention is required.");
  assertExactKeys(manifest.retention as Record<string, unknown>, new Set(["backups"]), "Migration retention");
  const backups = (manifest.retention as Record<string, unknown>).backups; if (!Number.isSafeInteger(backups) || Number(backups) < 0 || Number(backups) > MIGRATION_LIMITS.maxRetention) throw new Error("Migration retention is invalid.");
}

async function execute(executor: ProcessExecutor, cwd: string, args: ReadonlyArray<string>, timeoutMs = 30_000, signal?: AbortSignal): Promise<string> {
  const result = await executor.execute({ executable: "git", args, cwd, timeoutMs, maxOutputBytes: 16 * 1024 * 1024, signal });
  if (result.status === "cancelled") throw new Error("Operation cancelled.");
  if (result.status === "timedOut") throw new Error("Operation timed out.");
  if (result.status !== "succeeded") throw new Error(result.stderr.trim() || `git exited with ${result.exitCode ?? "no status"}.`);
  return result.stdout;
}

function copyChecked(source: string, destination: string): number {
  assertNoLinksAlong(source);
  const size = bytes(source); if (size > MIGRATION_LIMITS.maxFileBytes) throw new Error(`${basename(source)} exceeds the file limit.`);
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, readFileSync(source)); return size;
}

export class MigrationBackupService {
  readonly #root: string;
  readonly #history: string;
  readonly #executor: ProcessExecutor;
  readonly #now: () => Date;
  #active?: { id: string; controller: AbortController };
  #recoveryError?: string;
  readonly #completed = new Map<string, { done: boolean; result?: unknown; error?: string }>();
  readonly #handshakeControllers = new Map<string, AbortController>();
  readonly #prunePreviews = new Map<string, PrunePreview>();
  constructor(options: MigrationBackupOptions) {
    this.#root = resolve(options.userDataPath); this.#history = resolve(options.historyPath ?? join(this.#root, "history")); this.#executor = options.executor; this.#now = options.now ?? (() => new Date());
    this.recoverInterruptedSwap();
  }

  private readOperations(): MigrationOperation[] {
    try { const value = readJsonStrict(operationPath(this.#root)); if (!Array.isArray(value) || value.length > MIGRATION_LIMITS.maxOperations) throw new Error("Operation history exceeds its retention bound."); return value as MigrationOperation[]; } catch (error) { if (error instanceof Error && error.message.includes("retention bound")) throw error; return []; }
  }
  private writeOperations(value: ReadonlyArray<MigrationOperation>): void { atomicWriteFileSync(operationPath(this.#root), `${JSON.stringify(value, null, 2)}\n`); }
  private operation(kind: MigrationOperation["kind"], id?: string): MigrationOperation {
    if (this.#recoveryError) throw new Error(`Migration journal recovery is unresolved: ${this.#recoveryError}`);
    if (this.#active) throw new Error(`Another ${this.#active.id} operation is already running.`);
    return { id: id ?? randomUUID(), kind, startedAt: nowIso(this.#now), state: "running", completed: 0, total: 0, bytesDone: 0, bytesTotal: 0, phase: "validate", items: [], detail: "Started." };
  }
  private assertReady(): void { if (this.#recoveryError) throw new Error(`Migration journal recovery is unresolved: ${this.#recoveryError}`); }
  private claim(operation: MigrationOperation): AbortSignal {
    const controller = new AbortController(); this.#active = { id: operation.id, controller }; return controller.signal;
  }
  async cancel(operationId: string): Promise<{ cancelled: boolean; detail: string }> {
    const handshake = this.#handshakeControllers.get(operationId); if (handshake) { handshake.abort(); return { cancelled: true, detail: "Cancellation requested for the pending operation." }; }
    if (!this.#active || this.#active.id !== operationId) return { cancelled: false, detail: "No matching operation is running." };
    this.#active.controller.abort(); return { cancelled: true, detail: "Cancellation requested; the operation will retain its partial record." };
  }
  recoveryStatus(): { resolved: boolean; detail: string } { return this.#recoveryError ? { resolved: false, detail: this.#recoveryError } : { resolved: true, detail: "No unresolved migration journal recovery." }; }
  retryRecovery(): { resolved: boolean; detail: string } { this.#recoveryError = undefined; this.recoverInterruptedSwap(); return this.recoveryStatus(); }
  startImport(source: string): { operationId: string } {
    this.assertReady(); if (this.#completed.size >= MIGRATION_LIMITS.maxOperations) throw new Error("Operation result retention is full."); const operationId = randomUUID(); const controller = new AbortController(); this.#handshakeControllers.set(operationId, controller); this.#completed.set(operationId, { done: false }); void this.importMigration(source, true, controller.signal, operationId).then((result) => this.#completed.set(operationId, { done: true, result })).catch((error) => this.#completed.set(operationId, { done: true, error: sanitizeDiagnostic(error instanceof Error ? error.message : String(error)) })).finally(() => this.#handshakeControllers.delete(operationId)); return { operationId };
  }
  startFetchRemote(name: string): { operationId: string } {
    const operation = this.operation("fetch"); this.writeOperations([...this.readOperations(), operation]); const signal = this.claim(operation); this.writeOperations(this.readOperations().map((entry) => entry.id === operation.id ? { ...operation, phase: "verify", detail: `Fetching remote ${name}.` } : entry)); this.#completed.set(operation.id, { done: false }); void this.fetchRemote(name, signal).then((result) => { const ok = result.receipt.status === "success"; const finished = this.finish({ ...operation, phase: "complete", completed: 1, total: 1, items: [{ path: name, state: ok ? "succeeded" : "failed", detail: result.receipt.detail }], detail: result.receipt.detail }, ok ? "succeeded" : "failed", result.receipt.detail); this.#completed.set(operation.id, { done: true, result: { ...result, operation: finished } }); }).catch((error) => { const detail = sanitizeDiagnostic(error instanceof Error ? error.message : String(error)); this.#completed.set(operation.id, { done: true, error: detail }); }).finally(() => { if (this.#active?.id === operation.id) this.#active = undefined; }); return { operationId: operation.id };
  }
  startPushRemote(name: string, branch: string): { operationId: string } {
    const operation = this.operation("push"); this.writeOperations([...this.readOperations(), operation]); const signal = this.claim(operation); this.writeOperations(this.readOperations().map((entry) => entry.id === operation.id ? { ...operation, phase: "verify", detail: `Pushing ${branch} to remote ${name}.` } : entry)); this.#completed.set(operation.id, { done: false }); void this.pushRemote(name, branch, signal).then((result) => { const ok = result.receipt.status === "success"; const finished = this.finish({ ...operation, phase: "complete", completed: 1, total: 1, items: [{ path: `${name}/${branch}`, state: ok ? "succeeded" : "failed", detail: result.receipt.detail }], detail: result.receipt.detail }, ok ? "succeeded" : "failed", result.receipt.detail); this.#completed.set(operation.id, { done: true, result: { ...result, operation: finished } }); }).catch((error) => { const detail = sanitizeDiagnostic(error instanceof Error ? error.message : String(error)); this.#completed.set(operation.id, { done: true, error: detail }); }).finally(() => { if (this.#active?.id === operation.id) this.#active = undefined; }); return { operationId: operation.id };
  }
  startSetRemote(name: string, url: string, pushUrl?: string): { operationId: string } {
    const operation = this.operation("remote-set"); this.writeOperations([...this.readOperations(), operation]); const signal = this.claim(operation); this.#completed.set(operation.id, { done: false }); void this.setRemote(name, url, pushUrl, signal).then((result) => { const finished = this.finish({ ...operation, phase: "complete", completed: 1, total: 1, items: [{ path: name, state: "succeeded", detail: "Remote set and receipt recorded." }], detail: "Remote set completed." }, "succeeded", "Remote set completed."); this.#completed.set(operation.id, { done: true, result: { status: result, operation: finished } }); }).catch((error) => { const detail = sanitizeDiagnostic(error instanceof Error ? error.message : String(error)); const finished = this.finish({ ...operation, phase: "complete", completed: 1, total: 1, items: [{ path: name, state: "failed", detail }], detail }, "failed", detail); this.#completed.set(operation.id, { done: true, result: { operation: finished }, error: detail }); }).finally(() => { if (this.#active?.id === operation.id) this.#active = undefined; }); return { operationId: operation.id };
  }
  startRemoveRemote(name: string): { operationId: string } {
    const operation = this.operation("remote-remove"); this.writeOperations([...this.readOperations(), operation]); const signal = this.claim(operation); this.#completed.set(operation.id, { done: false }); void this.removeRemote(name, signal).then((result) => { const finished = this.finish({ ...operation, phase: "complete", completed: 1, total: 1, items: [{ path: name, state: "succeeded", detail: "Remote removed and receipt recorded." }], detail: "Remote remove completed." }, "succeeded", "Remote remove completed."); this.#completed.set(operation.id, { done: true, result: { status: result, operation: finished } }); }).catch((error) => { const detail = sanitizeDiagnostic(error instanceof Error ? error.message : String(error)); const finished = this.finish({ ...operation, phase: "complete", completed: 1, total: 1, items: [{ path: name, state: "failed", detail }], detail }, "failed", detail); this.#completed.set(operation.id, { done: true, result: { operation: finished }, error: detail }); }).finally(() => { if (this.#active?.id === operation.id) this.#active = undefined; }); return { operationId: operation.id };
  }
  startExport(destination?: string): { operationId: string } {
    if (this.#completed.size >= MIGRATION_LIMITS.maxOperations) throw new Error("Operation result retention is full."); const promise = this.exportMigration(destination); const operationId = this.#active?.id; if (!operationId) throw new Error("Export did not reach its operation-start handshake."); this.#completed.set(operationId, { done: false }); void promise.then((result) => this.#completed.set(operationId, { done: true, result })).catch((error) => this.#completed.set(operationId, { done: true, error: sanitizeDiagnostic(error instanceof Error ? error.message : String(error)) })); return { operationId };
  }
  startBackup(): { operationId: string } {
    if (this.#completed.size >= MIGRATION_LIMITS.maxOperations) throw new Error("Operation result retention is full."); const promise = this.createBackup(); const operationId = this.#active?.id; if (!operationId) throw new Error("Backup did not reach its operation-start handshake."); this.#completed.set(operationId, { done: false }); void promise.then((result) => this.#completed.set(operationId, { done: true, result })).catch((error) => this.#completed.set(operationId, { done: true, error: sanitizeDiagnostic(error instanceof Error ? error.message : String(error)) })); return { operationId };
  }
  operationStatus(operationId: string): { operationId: string; state: "running" | "succeeded" | "failed" | "cancelled"; phase?: MigrationOperation["phase"]; path?: string; result?: unknown; detail?: string } {
    const current = this.#active?.id === operationId; const completed = this.#completed.get(operationId); if (current && !completed?.done) { const entry = this.readOperations().find((candidate) => candidate.id === operationId); return { operationId, state: "running", phase: entry?.phase, detail: entry?.detail }; }
    if (!completed) { const entry = this.readOperations().find((candidate) => candidate.id === operationId); return entry ? { operationId, state: entry.state === "succeeded" ? "succeeded" : entry.state === "cancelled" ? "cancelled" : entry.state === "failed" || entry.state === "partial" ? "failed" : "running", detail: entry.detail } : { operationId, state: "failed", detail: "Operation id is unknown." }; }
    if (completed.error) return { operationId, state: "failed", detail: completed.error };
    const operationState = (completed.result as { operation?: { state?: string; phase?: MigrationOperation["phase"] } } | undefined)?.operation?.state; return { operationId, state: operationState === "cancelled" ? "cancelled" : operationState === "succeeded" ? "succeeded" : "failed", phase: (completed.result as { operation?: { phase?: MigrationOperation["phase"] } } | undefined)?.operation?.phase, path: (completed.result as { path?: string } | undefined)?.path, result: completed.result, detail: operationState === "succeeded" ? undefined : "Operation completed without a successful state." };
  }
  private finish(operation: MigrationOperation, state: OperationState, detail: string, items: ReadonlyArray<OperationItem> = operation.items): MigrationOperation {
    if (state === "failed" && /cancel/iu.test(detail)) state = "cancelled";
    const next = { ...operation, state, finishedAt: nowIso(this.#now), detail, items }; this.writeOperations([...this.readOperations().filter((entry) => entry.id !== operation.id), next]); return next;
  }

  private omissions(): MigrationOmission[] {
    return [
      { path: "credential-vault", reason: "credential-vault-secret", detail: "Passwords, PINs, TOTP secrets, passkeys, and remote credentials stay in the operating-system credential vault." },
      { path: "personal-vocabulary", reason: "private-vocabulary", detail: "Private vocabulary values and source metadata never leave the local cache." },
      { path: "source-paths", reason: "source-path", detail: "Absolute source paths are omitted so a migration cannot disclose the old machine layout." },
      { path: "transient-caches", reason: "transient-cache", detail: "Caches, sockets, locks, and temporary downloads are rebuilt instead of moved." },
    ];
  }

  private sourceInventory(): { files: string[]; omissions: MigrationOmission[] } {
    const found: string[] = []; const omissions: MigrationOmission[] = [...this.omissions()];
    const classify = (rel: string, reason: MigrationOmissionReason, detail: string) => omissions.push({ path: rel, reason, detail });
    const visitArtifacts = (dir: string, depth: number): void => {
      if (depth > MIGRATION_LIMITS.maxDepth) throw new Error(`Migration data exceeds the directory depth limit at ${relative(this.#root, dir)}.`);
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name); const rel = relative(this.#root, path).replaceAll(sep, "/"); assertNoLinksAlong(path);
        if (SECRET_WORD.test(rel)) { classify(rel, "credential-vault-secret", "The path name is credential-shaped and was not copied."); continue; }
        if (TRANSIENT_NAMES.test(entry.name)) { classify(rel, "transient-cache", "Transient cache or lock data is rebuilt locally."); continue; }
        if (entry.isDirectory()) visitArtifacts(path, depth + 1);
        else if (entry.isFile()) found.push(path);
        else throw new Error(`Unsupported filesystem entry encountered: ${rel}`);
      }
    };
    if (!existsSync(this.#root)) throw new Error("The application data root does not exist.");
    assertNoLinksAlong(this.#root);
    for (const entry of readdirSync(this.#root, { withFileTypes: true })) {
      const path = join(this.#root, entry.name); const rel = entry.name.replaceAll(sep, "/"); assertNoLinksAlong(path);
      if (SAFE_FILE_NAMES.has(entry.name) && entry.isFile()) { found.push(path); continue; }
      if (entry.name === "artifacts" && entry.isDirectory()) { visitArtifacts(path, 1); continue; }
      if (entry.name === "history" && entry.isDirectory()) { classify("history/", "unsafe-or-unsupported", "Loose Git history is omitted; history.bundle is the only transferable representation."); continue; }
      if (entry.name === "backups" && entry.isDirectory()) { classify("backups/", "source-path", "Backup directories retain machine-local absolute paths and are not copied into a migration."); continue; }
      if (SECRET_WORD.test(entry.name)) { classify(rel, "credential-vault-secret", "Credential-shaped application data is kept in the operating-system vault."); continue; }
      if (TRANSIENT_NAMES.test(entry.name)) { classify(rel, "transient-cache", "Transient cache or lock data is rebuilt locally."); continue; }
      if (entry.isDirectory() || entry.isFile()) classify(rel, "unsafe-or-unsupported", `Not listed in the handwritten application-state inventory: ${APP_OWNED_INVENTORY.join(", ")}.`);
      else throw new Error(`Unsupported filesystem entry encountered: ${rel}`);
    }
    if (found.length > MIGRATION_LIMITS.maxEntries) throw new Error(`Application state has ${found.length} files, over the ${MIGRATION_LIMITS.maxEntries} entry limit.`);
    if (omissions.length > MIGRATION_LIMITS.maxOmissions) throw new Error(`Application state has ${omissions.length} omission records, over the ${MIGRATION_LIMITS.maxOmissions} omission limit.`);
    for (const path of found) {
      if (path.toLowerCase().endsWith(".json")) {
        const value = readJsonStrict(path, MIGRATION_LIMITS.maxFileBytes); const record = sanitizeRecordPayload(path, value); validateSafeJson(record.value, relative(this.#root, path));
        for (const omission of record.omissions) omissions.push({ path: `${relative(this.#root, path).replaceAll(sep, "/")}#${omission.field}`, reason: omission.reason, detail: `Field ${omission.field} was omitted by the exact ${basename(path)} schema.` });
      }
    }
    if (omissions.length > MIGRATION_LIMITS.maxOmissions) throw new Error(`Derived omission records exceed ${MIGRATION_LIMITS.maxOmissions}.`);
    return { files: found, omissions };
  }

  private async ensureHistoryRepository(signal?: AbortSignal): Promise<void> {
    assertTreeNoLinks(this.#history, this.#root);
    if (existsSync(join(this.#history, ".git"))) return;
    mkdirSync(this.#history, { recursive: true });
    await execute(this.#executor, this.#history, ["init", "--quiet"], 30_000, signal);
    await execute(this.#executor, this.#history, ["config", "user.name", "Ding PBX Console local history"], 30_000, signal);
    await execute(this.#executor, this.#history, ["config", "user.email", "local-history@ding-pbx-console.invalid"], 30_000, signal);
    await execute(this.#executor, this.#history, ["commit", "--quiet", "--allow-empty", "-m", "Initialize local history"], 30_000, signal);
  }

  private async gitRecord(directory: string, signal?: AbortSignal): Promise<{ record: MigrationGitRecord; sourceBundle: string }> {
    mkdirSync(directory, { recursive: true });
    const bundle = join(directory, "history.bundle");
    await this.ensureHistoryRepository(signal);
    assertTreeNoLinks(this.#history, this.#root);
    const head = (await execute(this.#executor, this.#history, ["rev-parse", "HEAD"], 30_000, signal)).trim();
    const symbolic = await execute(this.#executor, this.#history, ["symbolic-ref", "-q", "HEAD"], 30_000, signal).catch(() => "");
    const detachedHead = symbolic.trim().length === 0;
    await execute(this.#executor, this.#history, ["bundle", "create", bundle, "--all", "HEAD"], 120_000, signal);
    if (bytes(bundle) < 1 || bytes(bundle) > MIGRATION_LIMITS.maxFileBytes) throw new Error("Git bundle exceeded its per-file byte limit immediately after creation.");
    await execute(this.#executor, this.#history, ["bundle", "verify", bundle], 30_000, signal);
    const refs = (await execute(this.#executor, this.#history, ["for-each-ref", "--format=%(refname)\t%(objectname)\t%(objecttype)"], 30_000, signal))
      .split(/\r?\n/u).filter(Boolean).map((line) => { const [name, object, kind] = line.split("\t"); return { name, object, kind }; });
    if (refs.length > MIGRATION_LIMITS.maxRefs) throw new Error("Local history has too many refs.");
    const advertised = (await execute(this.#executor, this.#history, ["bundle", "list-heads", bundle], 30_000, signal)).split(/\r?\n/u).filter(Boolean).map((line) => line.trim().split(/\s+/u)).map(([object, name]) => ({ object, name }));
    for (const ref of refs) if (!advertised.some((entry) => entry.name === ref.name && entry.object === ref.object)) throw new Error(`Git bundle did not advertise ref ${ref.name}.`);
    const restore = mkdtempSync(join(tmpdir(), "ding-history-verify-"));
    try { await execute(this.#executor, restore, ["clone", "--quiet", bundle, join(restore, "clone")], 120_000, signal); await execute(this.#executor, join(restore, "clone"), ["fsck", "--full"], 120_000, signal); await execute(this.#executor, join(restore, "clone"), ["cat-file", "-e", `${head}^{commit}`], 30_000, signal); }
    finally { rmSync(restore, { recursive: true, force: true }); }
    return { record: { path: "history.bundle", bytes: bytes(bundle), sha256: sha256File(bundle), refs, head, detachedHead, verified: true }, sourceBundle: bundle };
  }

  async exportMigration(destination?: string, signal?: AbortSignal, internalBackupRoot?: string, inheritedOperation?: MigrationOperation): Promise<{ operation: MigrationOperation; path: string; manifest: MigrationManifest }> {
    const inherited = Boolean(inheritedOperation); const operation = inheritedOperation ?? this.operation("export"); if (!inherited) this.writeOperations([...this.readOperations(), operation]);
    let output = ""; let stage = ""; const items: OperationItem[] = [];
    const operationSignal = inherited ? (this.#active?.controller.signal ?? new AbortController().signal) : this.claim(operation); if (signal) signal.addEventListener("abort", () => this.#active?.controller.abort(), { once: true }); signal = operationSignal;
    try {
      output = validatedExportDestination(destination, this.#root, this.#history, internalBackupRoot);
      stage = mkdtempSync(join(tmpdir(), "ding-migration-export-"));
      const inventory = this.sourceInventory(); const files = inventory.files;
      const records: MigrationFileRecord[] = []; let totalBytes = 0;
      const phase = { ...operation, phase: "stage" as const, total: files.length + 1, bytesTotal: 0, detail: "Staging application state." }; this.writeOperations(this.readOperations().map((entry) => entry.id === operation.id ? phase : entry));
      for (const source of files) {
        if (signal?.aborted) throw new Error("Export cancelled.");
        const path = relative(this.#root, source).replaceAll(sep, "/"); const target = join(stage, path); const size = copyChecked(source, target); totalBytes += size;
        if (totalBytes > MIGRATION_LIMITS.maxPayloadBytes || size > MIGRATION_LIMITS.maxFileBytes) throw new Error("Migration payload exceeds its byte limit.");
        if (path.toLowerCase().endsWith(".json")) { const record = sanitizeRecordPayload(path, readJsonStrict(source, MIGRATION_LIMITS.maxFileBytes)); validateSafeJson(record.value, path); writeFileSync(target, `${JSON.stringify(record.value, null, 2)}\n`, "utf8"); }
        records.push({ path, bytes: bytes(target), sha256: sha256File(target) }); items.push({ path, state: "succeeded", bytes: bytes(target) });
        this.writeOperations(this.readOperations().map((entry) => entry.id === operation.id ? { ...phase, completed: items.length, bytesDone: totalBytes, items } : entry));
      }
      const git = await this.gitRecord(stage, signal); totalBytes += git.record.bytes; if (totalBytes > MIGRATION_LIMITS.maxPayloadBytes || git.record.bytes > MIGRATION_LIMITS.maxFileBytes) throw new Error("Git bundle exceeds the migration byte limit.");
      records.push({ path: git.record.path, bytes: git.record.bytes, sha256: git.record.sha256 }); items.push({ path: git.record.path, state: "succeeded", bytes: git.record.bytes });
      const verifyPhase = { ...phase, phase: "verify" as const, completed: items.length, bytesDone: totalBytes, bytesTotal: totalBytes, items, detail: "Verifying the Git bundle and manifest." }; this.writeOperations(this.readOperations().map((entry) => entry.id === operation.id ? verifyPhase : entry));
      const manifest: MigrationManifest = { schemaVersion: MIGRATION_SCHEMA_VERSION, kind: "ding-pbx-console-migration", createdAt: nowIso(this.#now), application: "Ding PBX Console", files: records, gitHistory: git.record, omissions: inventory.omissions, retention: { backups: this.retention() } };
      writeFileSync(join(stage, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      assertManifest(readJsonStrict(join(stage, "manifest.json"))); assertNoLinksAlong(stage); renameRetry(stage, output);
      const next = { ...operation, phase: "complete" as const, completed: items.length, total: items.length, bytesDone: totalBytes, bytesTotal: totalBytes, items, detail: `Exported ${items.length} files and one verified Git bundle.` };
      return { operation: inherited ? { ...next, state: "running", detail: "Verified backup staged before import." } : this.finish(next, "succeeded", next.detail), path: output, manifest };
    } catch (error) {
      if (stage) rmSync(stage, { recursive: true, force: true }); const detail = error instanceof Error ? error.message : String(error); const state: OperationState = signal?.aborted ? "cancelled" : "failed";
      const failed = { ...operation, items, state, detail }; if (inherited) this.writeOperations(this.readOperations().map((entry) => entry.id === operation.id ? failed : entry)); return { operation: inherited ? failed : this.finish(failed, state, detail), path: output, manifest: { schemaVersion: MIGRATION_SCHEMA_VERSION, kind: "ding-pbx-console-migration", createdAt: nowIso(this.#now), application: "Ding PBX Console", files: [], gitHistory: null, omissions: this.omissions(), retention: { backups: this.retention() } } };
    } finally { if (!inherited && this.#active?.id === operation.id) this.#active = undefined; }
  }

  private retention(): number { try { const value = readJsonStrict(backupIndexPath(this.#root)); return Array.isArray(value) ? value.length : 0; } catch { return 0; } }

  private swapJournalPath(): string { return join(dirname(this.#root), `${basename(this.#root)}.migration-swap-journal.json`); }
  private assertSwapJournal(value: Record<string, unknown>): void {
    assertExactKeys(value, new Set(["schemaVersion", "oldRoot", "incomingRoot", "backupRoot", "failedIncoming", "phase", "createdAt", "recoveredAt", "detail"]), "Migration swap journal");
    const phases = new Set(["prepared", "old-moved", "incoming-moved", "verified", "rolled-back", "abandoned-before-swap", "rolled-back-on-startup", "recovered-incoming", "recovery-failed"]); if (value.schemaVersion !== 1 || value.oldRoot !== this.#root || typeof value.phase !== "string" || !phases.has(value.phase) || typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))) throw new Error("Migration swap journal schema is invalid.");
    const sibling = (candidate: unknown, prefix: string): void => { if (typeof candidate !== "string" || dirname(resolve(candidate)) !== dirname(this.#root) || !basename(resolve(candidate)).startsWith(prefix)) throw new Error("Migration swap journal sibling relationship is invalid."); };
    sibling(value.incomingRoot, `${basename(this.#root)}.incoming-import-`); sibling(value.backupRoot, `${basename(this.#root)}.pre-import-`); sibling(value.failedIncoming, `${basename(this.#root)}.failed-import-`);
  }
  private writeSwapJournal(value: Record<string, unknown>): void { this.assertSwapJournal(value); atomicWriteFileSync(this.swapJournalPath(), `${JSON.stringify(value, null, 2)}\n`); }

  private retainTreeInBackupIndex(path: string, detail: string): void {
    if (!existsSync(this.#root)) return;
    const indexPath = backupIndexPath(this.#root); let entries: Array<Record<string, unknown>> = [];
    try { const value = readJsonStrict(indexPath); if (Array.isArray(value)) entries = value as Array<Record<string, unknown>>; } catch { entries = []; }
    if (entries.some((entry) => entry.path === path)) return;
    entries.unshift({ path, createdAt: nowIso(this.#now), kind: "retained-import-tree", detail });
    if (entries.length > MIGRATION_LIMITS.maxRetention) throw new Error("Backup retention index is full during journal recovery.");
    atomicWriteFileSync(indexPath, `${JSON.stringify(entries, null, 2)}\n`);
  }

  private recoverInterruptedSwap(): void {
    const journalPath = this.swapJournalPath(); if (!existsSync(journalPath)) return;
    try {
      const journal = readJsonStrict(journalPath) as Record<string, unknown>; this.assertSwapJournal(journal); const phase = String(journal.phase ?? "");
      const oldRoot = resolve(String(journal.oldRoot ?? this.#root)); const incomingRaw = String(journal.incomingRoot ?? ""); const backupRaw = String(journal.backupRoot ?? ""); const failedRaw = String(journal.failedIncoming ?? ""); const incoming = incomingRaw ? resolve(incomingRaw) : ""; const backup = backupRaw ? resolve(backupRaw) : ""; const failed = failedRaw ? resolve(failedRaw) : "";
      assertNoLinksAlong(oldRoot, dirname(oldRoot)); if (incoming) assertNoLinksAlong(incoming, dirname(oldRoot)); if (backup) assertNoLinksAlong(backup, dirname(oldRoot)); if (failed) assertNoLinksAlong(failed, dirname(oldRoot));
      if (phase === "prepared") { if (existsSync(incoming) && !existsSync(failed)) renameRetry(incoming, failed); this.writeSwapJournal({ ...journal, phase: "abandoned-before-swap", recoveredAt: nowIso(this.#now) }); return; }
      if (phase === "old-moved") { if (!existsSync(oldRoot) && existsSync(backup)) renameRetry(backup, oldRoot); if (existsSync(incoming) && !existsSync(failed)) renameRetry(incoming, failed); if (existsSync(failed)) this.retainTreeInBackupIndex(failed, "Retained failed incoming tree after startup recovery."); this.writeSwapJournal({ ...journal, phase: "rolled-back-on-startup", recoveredAt: nowIso(this.#now) }); return; }
      if (phase === "incoming-moved" || phase === "verified") { if (existsSync(backup)) this.retainTreeInBackupIndex(backup, `Retained after interrupted import phase ${phase}.`); this.writeSwapJournal({ ...journal, phase: "recovered-incoming", recoveredAt: nowIso(this.#now) }); return; }
    } catch (error) {
      this.#recoveryError = sanitizeDiagnostic(error instanceof Error ? error.message : String(error));
      try { const journal = readJsonStrict(journalPath) as Record<string, unknown>; this.writeSwapJournal({ ...journal, phase: "recovery-failed", detail: sanitizeDiagnostic(error instanceof Error ? error.message : String(error)), recoveredAt: nowIso(this.#now) }); } catch { /* keep the original journal for manual recovery */ }
    }
  }

  private async verifyImportedRoot(root: string, manifest: MigrationManifest, signal?: AbortSignal): Promise<void> {
    assertNoLinksAlong(root); const manifestPath = join(root, "manifest.json"); if (!existsSync(manifestPath)) throw new Error("The imported root is missing its manifest.");
    const returned = readJsonStrict(manifestPath); assertManifest(returned); if (returned.createdAt !== manifest.createdAt || returned.files.length !== manifest.files.length) throw new Error("The imported root manifest changed during the swap.");
    for (const entry of manifest.files) { const path = join(root, entry.path); if (!existsSync(path) || bytes(path) !== entry.bytes || sha256File(path).toLowerCase() !== entry.sha256.toLowerCase()) throw new Error(`The imported root failed independent verification for ${entry.path}.`); validateRecordFile(path); }
    if (manifest.gitHistory) await execute(this.#executor, join(root, "history"), ["fsck", "--full"], 120_000, signal);
  }

  async createBackup(signal?: AbortSignal, inheritedOperation?: MigrationOperation): Promise<{ operation: MigrationOperation; path: string; manifest: MigrationManifest }> {
    this.assertReady();
    const backupRoot = join(this.#root, "backups"); assertTreeNoLinks(backupRoot, this.#root); const path = join(backupRoot, `${Date.now()}-${randomUUID()}`); const result = await this.exportMigration(path, signal, backupRoot, inheritedOperation); if (inheritedOperation) return result; const indexPath = backupIndexPath(this.#root);
    if (result.operation.state !== "succeeded") throw new Error(`Backup was not indexed because its final validation ended in ${result.operation.state}: ${result.operation.detail}`);
    const index = (() => { try { const value = readJsonStrict(indexPath); return Array.isArray(value) ? value as Array<Record<string, unknown>> : []; } catch { return []; } })();
    index.unshift({ path, createdAt: result.manifest.createdAt, kind: "verified-backup", verified: true }); if (index.length > MIGRATION_LIMITS.maxRetention) throw new Error("Backup retention index is full; prune verified backups before creating another."); atomicWriteFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
    const operations = this.readOperations().map((entry) => entry.id === result.operation.id ? { ...entry, kind: "backup" as const } : entry);
    this.writeOperations(operations);
    return { ...result, operation: { ...result.operation, kind: "backup" } };
  }

  async listBackups(): Promise<ReadonlyArray<{ path: string; createdAt: string; kind: "verified-backup" | "retained-import-tree" | "unknown"; manifestSha256: string; bytes: number; verified: boolean; status: "verified" | "unverified" | "corrupt" | "indexed"; detail: string }>> {
    try {
      const value = readJsonStrict(backupIndexPath(this.#root)); if (!Array.isArray(value)) return [];
      const output: Array<{ path: string; createdAt: string; kind: "verified-backup" | "retained-import-tree" | "unknown"; manifestSha256: string; bytes: number; verified: boolean; status: "verified" | "unverified" | "corrupt" | "indexed"; detail: string }> = [];
      for (const entry of value as Array<Record<string, unknown>>) {
        const path = String(entry.path ?? ""); const createdAt = String(entry.createdAt ?? ""); const kind = entry.kind === "retained-import-tree" ? "retained-import-tree" : entry.kind === "verified-backup" || entry.kind === undefined ? "verified-backup" : "unknown"; if (!isAbsolute(path)) { output.push({ path, createdAt, kind, manifestSha256: "", bytes: 0, verified: false, status: "corrupt", detail: "Indexed backup path is not absolute." }); continue; }
        if (kind === "retained-import-tree") { output.push({ path, createdAt, kind, manifestSha256: "", bytes: 0, verified: false, status: "indexed", detail: String(entry.detail ?? "Retained import tree. It is never pruned automatically.") }); continue; }
        try { const manifest = await this.verifyBackupDirectory(path); output.push({ path, createdAt, kind, manifestSha256: sha256File(join(path, "manifest.json")), bytes: manifest.files.reduce((sum, item) => sum + item.bytes, 0), verified: true, status: "verified", detail: "Manifest, file hashes, and Git bundle verified." }); }
        catch (error) { const exists = existsSync(join(path, "manifest.json")); output.push({ path, createdAt, kind, manifestSha256: exists ? sha256File(join(path, "manifest.json")) : "", bytes: 0, verified: false, status: exists ? "unverified" : "indexed", detail: sanitizeDiagnostic(error instanceof Error ? error.message : String(error)) }); }
      }
      return output;
    } catch { return []; }
  }

  private async verifyBackupDirectory(path: string): Promise<MigrationManifest> {
    const backupRoot = resolve(join(this.#root, "backups")); const candidate = resolve(path);
    if (!candidate.startsWith(`${backupRoot}${sep}`) || candidate === backupRoot) throw new Error("Backup path is outside the backup root.");
    assertNoLinksAlong(candidate); const manifestPath = join(candidate, "manifest.json"); if (!existsSync(manifestPath)) throw new Error("Backup manifest is missing.");
    const value = readJsonStrict(manifestPath); assertManifest(value); let total = 0;
    for (const entry of value.files) { const file = join(candidate, entry.path); assertNoLinksAlong(file, candidate); if (!existsSync(file) || bytes(file) !== entry.bytes || sha256File(file).toLowerCase() !== entry.sha256.toLowerCase()) throw new Error(`Backup file verification failed for ${entry.path}.`); validateRecordFile(file); total += entry.bytes; }
    if (total > MIGRATION_LIMITS.maxPayloadBytes) throw new Error("Backup exceeds the payload limit.");
    if (value.gitHistory) await execute(this.#executor, candidate, ["bundle", "verify", join(candidate, value.gitHistory.path)], 30_000);
    return value;
  }
  async verifyRetainedTree(path: string): Promise<{ path: string; kind: "retained-import-tree"; status: "indexed" | "corrupt"; detail: string }> {
    this.assertReady(); const candidate = resolve(path); const parent = dirname(this.#root); if (dirname(candidate) !== parent || !basename(candidate).startsWith(`${basename(this.#root)}.`)) throw new Error("Retained tree is not a generated sibling of the current application-data root.");
    try { assertTreeNoLinks(candidate, parent); const entries = readdirSync(candidate, { withFileTypes: true }); return { path: candidate, kind: "retained-import-tree", status: "indexed", detail: `Retained tree is readable with ${entries.length} top-level entries. It remains inventory-only and is not pruned.` }; }
    catch (error) { return { path: candidate, kind: "retained-import-tree", status: "corrupt", detail: sanitizeDiagnostic(error instanceof Error ? error.message : String(error)) }; }
  }

  async previewPrune(keep: number, selectedPaths: ReadonlyArray<string> = []): Promise<PrunePreview> {
    this.assertReady();
    if (!Number.isSafeInteger(keep) || keep < 1 || keep > MIGRATION_LIMITS.maxRetention) throw new Error("Backup retention must be between 1 and 365.");
    const entries = (await this.listBackups()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); const selected = new Set(selectedPaths.map((path) => resolve(path)));
    const records = entries.map((entry, index) => { const selectedMatch = selected.size === 0 || selected.has(resolve(entry.path)); const eligible = entry.kind === "verified-backup" && entry.status === "verified" && index >= keep && selectedMatch; const reason = eligible ? "eligible: verified, beyond retention, and selected" : entry.kind === "retained-import-tree" ? "retained-import-tree: inventory-only and never pruned" : entry.status !== "verified" ? `not-eligible: ${entry.status}` : index < keep ? "not-eligible: within retention" : selectedMatch ? "not-eligible: policy" : "not-eligible: outside selected scope"; return { path: entry.path, kind: entry.kind, manifestSha256: entry.manifestSha256, status: entry.status, verified: entry.verified, eligible, reason }; });
    const indexRevision = createHash("sha256").update(JSON.stringify(records)).digest("hex"); const token = randomUUID(); const preview = { token, keep, selectedPaths: [...selected], indexRevision, expiresAt: Date.now() + 5 * 60 * 1000, records }; this.#prunePreviews.set(token, preview); return preview;
  }

  async pruneBackups(keep: number, selectedPaths: ReadonlyArray<string> = [], previewToken?: string): Promise<{ removed: number; retained: number; receipts: ReadonlyArray<{ path: string; status: string; detail: string; removed: boolean }> }> {
    this.assertReady();
    if (!Number.isSafeInteger(keep) || keep < 1 || keep > MIGRATION_LIMITS.maxRetention) throw new Error("Backup retention must be between 1 and 365.");
    if (typeof previewToken !== "string" || previewToken.trim().length === 0) throw new Error("A nonempty prune preview token is required before backup candidates can be enumerated or removed.");
    const preview = this.#prunePreviews.get(previewToken); if (!preview || preview.expiresAt < Date.now() || preview.keep !== keep || JSON.stringify([...preview.selectedPaths].map((path) => resolve(path)).sort()) !== JSON.stringify([...selectedPaths].map((path) => resolve(path)).sort())) throw new Error("The prune preview is missing, expired, or stale. Preview the exact current backup set again.");
    const entries = (await this.listBackups()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); const receipts: Array<{ path: string; status: string; detail: string; removed: boolean }> = []; let removed = 0;
    if (preview) { const current = await this.previewPrune(keep, selectedPaths); if (current.indexRevision !== preview.indexRevision) throw new Error("The backup index changed after preview. No paths were removed."); }
    for (const entry of entries) { try { await this.verifyBackupDirectory(entry.path); receipts.push({ path: entry.path, status: "verified", detail: "Manifest, hashes, and Git bundle verified.", removed: false }); } catch (error) { receipts.push({ path: entry.path, status: "unverified", detail: sanitizeDiagnostic(error instanceof Error ? error.message : String(error)), removed: false }); } }
    const selected = new Set(selectedPaths.map((path) => resolve(path))); const removable = preview ? receipts.filter((receipt) => preview.records.some((record) => record.path === receipt.path && record.eligible)) : receipts.filter((receipt, index) => index >= keep && receipt.status === "verified" && (selected.size === 0 || selected.has(resolve(receipt.path))));
    for (const receipt of removable) { assertNoLinksAlong(receipt.path); rmSync(receipt.path, { recursive: true, force: true }); receipt.removed = true; removed += 1; }
    const retained = entries.filter((entry) => !removable.some((candidate) => candidate.path === entry.path)); atomicWriteFileSync(backupIndexPath(this.#root), `${JSON.stringify(retained.map((entry) => ({ path: entry.path, createdAt: entry.createdAt, kind: entry.kind, detail: entry.detail })), null, 2)}\n`);
    if (previewToken) this.#prunePreviews.delete(previewToken); return { removed, retained: retained.length, receipts };
  }

  async validateImport(source: string): Promise<MigrationManifest> {
    const manifestPath = statSync(source).isDirectory() ? join(source, "manifest.json") : source;
    assertNoLinksAlong(manifestPath); const value = readJsonStrict(manifestPath); assertManifest(value); const root = dirname(manifestPath);
    assertNoLinksAlong(root); if (overlapsPath(root, this.#root) || overlapsPath(root, this.#history)) throw new Error("Import source may not be the live data or history root, or any ancestor or descendant.");
    let total = 0;
    const seen = new Set<string>();
    for (const entry of value.files) {
      const path = assertBoundedPath(entry.path); if (seen.has(path)) throw new Error(`Duplicate file record: ${path}`); seen.add(path);
      const sourcePath = join(root, path); if (!existsSync(sourcePath) || !lstatSync(sourcePath).isFile()) throw new Error(`Migration file is missing: ${path}`); assertNoLinksAlong(sourcePath);
      const size = bytes(sourcePath); total += size; if (size !== entry.bytes || size > MIGRATION_LIMITS.maxFileBytes || sha256File(sourcePath).toLowerCase() !== entry.sha256.toLowerCase()) throw new Error(`Hash or size mismatch for ${path}.`);
      validateRecordFile(sourcePath);
    }
    if (total > MIGRATION_LIMITS.maxPayloadBytes) throw new Error("Migration payload exceeds the total size limit.");
    if (value.gitHistory) {
      const gitPath = assertBoundedPath(value.gitHistory.path, "gitHistory.path"); if (!seen.has(gitPath)) throw new Error("Git bundle must also be present in the manifest file list.");
      const bundle = join(root, gitPath); if (!existsSync(bundle) || bytes(bundle) !== value.gitHistory.bytes || sha256File(bundle).toLowerCase() !== value.gitHistory.sha256.toLowerCase()) throw new Error("Git bundle hash or size mismatch.");
      await execute(this.#executor, root, ["bundle", "verify", bundle], 30_000);
    }
    return value;
  }

  async importMigration(source: string, confirmReplace = false, signal?: AbortSignal, operationId?: string): Promise<{ operation: MigrationOperation; manifest: MigrationManifest }> {
    const operation = this.operation("import", operationId); this.writeOperations([...this.readOperations(), operation]);
    if (!confirmReplace) {
      try { return { operation: this.finish(operation, "failed", "Replacement requires the two-key destructive confirmation."), manifest: await this.validateImport(source) }; }
      catch (error) { const empty: MigrationManifest = { schemaVersion: MIGRATION_SCHEMA_VERSION, kind: "ding-pbx-console-migration", createdAt: nowIso(this.#now), application: "Ding PBX Console", files: [], gitHistory: null, omissions: this.omissions(), retention: { backups: this.retention() } }; return { operation: this.finish(operation, "failed", error instanceof Error ? error.message : String(error)), manifest: empty }; }
    }
    let stage = ""; const items: OperationItem[] = [];
    const operationSignal = this.claim(operation); if (signal) signal.addEventListener("abort", () => this.#active?.controller.abort(), { once: true }); signal = operationSignal;
    let manifest: MigrationManifest;
    try { manifest = await this.validateImport(source); }
    catch (error) { const empty: MigrationManifest = { schemaVersion: MIGRATION_SCHEMA_VERSION, kind: "ding-pbx-console-migration", createdAt: nowIso(this.#now), application: "Ding PBX Console", files: [], gitHistory: null, omissions: this.omissions(), retention: { backups: this.retention() } }; if (this.#active?.id === operation.id) this.#active = undefined; return { operation: this.finish(operation, "failed", error instanceof Error ? error.message : String(error)), manifest: empty }; }
    let backup: { operation: MigrationOperation; path: string; manifest: MigrationManifest };
    try { backup = await this.createBackup(signal, operation); } catch (error) { if (this.#active?.id === operation.id) this.#active = undefined; return { operation: this.finish(operation, "failed", error instanceof Error ? error.message : String(error)), manifest }; }
    if (backup.operation.state !== "running") { if (this.#active?.id === operation.id) this.#active = undefined; return { operation: this.finish(operation, "failed", "The automatic backup before import did not complete."), manifest }; }
    try {
      const manifestPath = statSync(source).isDirectory() ? join(source, "manifest.json") : source; const root = dirname(manifestPath); stage = mkdtempSync(join(dirname(this.#root), `${basename(this.#root)}.incoming-import-`)); assertNoLinksAlong(stage, dirname(this.#root));
      let total = 0; const phase = { ...operation, phase: "stage" as const, total: manifest.files.length, bytesTotal: manifest.files.reduce((sum, entry) => sum + entry.bytes, 0), detail: "Staging and validating import files." }; this.writeOperations(this.readOperations().map((entry) => entry.id === operation.id ? phase : entry));
      for (const entry of manifest.files) { if (signal?.aborted) throw new Error("Import cancelled."); const dest = join(stage, entry.path); const size = copyChecked(join(root, entry.path), dest); total += size; items.push({ path: entry.path, state: "succeeded", bytes: size }); this.writeOperations(this.readOperations().map((entry) => entry.id === operation.id ? { ...phase, completed: items.length, bytesDone: total, items } : entry)); }
      writeFileSync(join(stage, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      if (manifest.gitHistory) {
        const bundle = join(root, manifest.gitHistory.path); const restoredHistory = join(stage, "history");
        await execute(this.#executor, stage, ["clone", "--quiet", bundle, restoredHistory], 120_000, signal); await execute(this.#executor, restoredHistory, ["fsck", "--full"], 120_000, signal);
      }
      const parent = dirname(this.#root); const movedLive = join(parent, `${basename(this.#root)}.pre-import-${randomUUID()}`);
      const failedIncoming = join(parent, `${basename(this.#root)}.failed-import-${randomUUID()}`);
      this.writeSwapJournal({ schemaVersion: 1, oldRoot: this.#root, incomingRoot: stage, backupRoot: movedLive, failedIncoming, phase: "prepared", createdAt: nowIso(this.#now) });
      renameRetry(this.#root, movedLive); this.writeSwapJournal({ schemaVersion: 1, oldRoot: this.#root, incomingRoot: stage, backupRoot: movedLive, failedIncoming, phase: "old-moved", createdAt: nowIso(this.#now) });
      try {
        renameRetry(stage, this.#root); this.writeSwapJournal({ schemaVersion: 1, oldRoot: this.#root, incomingRoot: stage, backupRoot: movedLive, failedIncoming, phase: "incoming-moved", createdAt: nowIso(this.#now) });
        await this.verifyImportedRoot(this.#root, manifest, signal); this.retainTreeInBackupIndex(movedLive, "Previous application-data tree retained after successful import."); this.writeSwapJournal({ schemaVersion: 1, oldRoot: this.#root, incomingRoot: stage, backupRoot: movedLive, failedIncoming, phase: "verified", createdAt: nowIso(this.#now) });
      }
      catch (error) {
        if (existsSync(this.#root)) renameRetry(this.#root, failedIncoming);
        if (existsSync(movedLive)) renameRetry(movedLive, this.#root);
        this.writeSwapJournal({ schemaVersion: 1, oldRoot: this.#root, incomingRoot: stage, backupRoot: movedLive, failedIncoming, phase: "rolled-back", createdAt: nowIso(this.#now), detail: error instanceof Error ? error.message : String(error) });
        throw error;
      }
      const next = { ...operation, phase: "complete" as const, completed: items.length, total: items.length, bytesDone: total, bytesTotal: total, items, detail: `Imported ${items.length} files after a verified automatic backup. Both the prior and imported trees remain retained.` }; return { operation: this.finish(next, "succeeded", next.detail), manifest };
    } catch (error) { if (stage) rmSync(stage, { recursive: true, force: true }); return { operation: this.finish({ ...operation, items }, signal?.aborted ? "cancelled" : "failed", error instanceof Error ? error.message : String(error)), manifest }; }
    finally { if (this.#active?.id === operation.id) this.#active = undefined; }
  }

  async gitStatus(remote?: string, branch?: string): Promise<GitStatusRecord> {
    if (!existsSync(join(this.#history, ".git"))) return { repositoryPath: this.#history, head: "", branch: "", clean: true, ahead: 0, behind: 0, divergence: false, comparison: "unverified", refs: [], remotes: [], receipts: [] };
    assertTreeNoLinks(this.#history, this.#root);
    const head = (await execute(this.#executor, this.#history, ["rev-parse", "HEAD"])).trim(); const branchName = (await execute(this.#executor, this.#history, ["branch", "--show-current"])).trim() || "HEAD";
    const status = await execute(this.#executor, this.#history, ["status", "--porcelain=v1"]); const refs = (await execute(this.#executor, this.#history, ["for-each-ref", "--format=%(refname)\t%(objectname)\t%(objecttype)"])).split(/\r?\n/u).filter(Boolean).map((line) => { const [name, object, kind] = line.split("\t"); return { name, object, kind }; });
    if (refs.length > MIGRATION_LIMITS.maxRefs) throw new Error("Local history has too many refs to display safely.");
    const lines = (await execute(this.#executor, this.#history, ["remote", "-v"])).split(/\r?\n/u).filter(Boolean); const remotes: RemoteRecord[] = []; for (const line of lines) { const match = /^([^\s]+)\s+(\S+)\s+\((fetch|push)\)$/u.exec(line); if (!match) continue; const existing = remotes.find((entry) => entry.name === match[1]); if (existing) existing[match[3] === "fetch" ? "fetchUrl" : "pushUrl"] = match[2]; else remotes.push({ name: match[1], url: match[2], fetchUrl: match[3] === "fetch" ? match[2] : "", pushUrl: match[3] === "push" ? match[2] : "" }); }
    let ahead = 0; let behind = 0; let comparison: GitStatusRecord["comparison"] = "unverified"; if (remote) { const selected = remotes.find((entry) => entry.name === remote); if (selected && branch) { try { const counts = (await execute(this.#executor, this.#history, ["rev-list", "--left-right", "--count", `${branch}...${remote}/${branch}`])).trim().split(/\s+/u).map(Number); ahead = counts[0] || 0; behind = counts[1] || 0; comparison = "verified"; } catch { /* no comparison is unverified, never clean */ } } }
    let receipts: GitReceipt[] = []; let receiptError: string | undefined; let corruptReceipt: GitStatusRecord["corruptReceipt"]; try { receipts = this.readReceipts(); } catch (error) { receiptError = sanitizeDiagnostic(error instanceof Error ? error.message : String(error)); corruptReceipt = { kind: "corrupt-receipt", path: receiptPath(this.#root), detail: receiptError }; receipts = []; }
    return { repositoryPath: this.#history, head, branch: branchName, clean: status.trim().length === 0, ahead, behind, divergence: ahead > 0 && behind > 0, comparison, refs, remotes: remotes.map((entry) => ({ ...entry, url: sanitizeDiagnostic(entry.url), fetchUrl: sanitizeDiagnostic(entry.fetchUrl), pushUrl: sanitizeDiagnostic(entry.pushUrl) })), receipts, receiptError, corruptReceipt, receipt: receipts[0] };
  }

  private readReceipts(): GitReceipt[] {
    try {
      const value = readJsonStrict(receiptPath(this.#root)); if (!Array.isArray(value) || value.length > MIGRATION_LIMITS.maxReceipts) throw new Error("Git receipt history exceeds its retention bound.");
      for (const receipt of value as Array<Record<string, unknown>>) { assertExactKeys(receipt, new Set(["id", "action", "remote", "branch", "status", "observedAt", "detail"]), "Git receipt"); if (typeof receipt.id !== "string" || receipt.id.length > MIGRATION_LIMITS.maxStringLength || !["fetch", "push", "remote-set", "remote-remove"].includes(String(receipt.action)) || typeof receipt.remote !== "string" || !REMOTE_NAME.test(receipt.remote) || typeof receipt.branch !== "string" || receipt.branch.length > MIGRATION_LIMITS.maxStringLength || !["prepared", "success", "rejected", "auth-failure", "divergence", "cancelled", "unverified", "receipt-write-failure", "corrupt"].includes(String(receipt.status)) || typeof receipt.observedAt !== "string" || receipt.observedAt.length > MIGRATION_LIMITS.maxTimestampLength || !Number.isFinite(Date.parse(receipt.observedAt)) || typeof receipt.detail !== "string" || receipt.detail.length > MIGRATION_LIMITS.maxStringLength) throw new Error("Git receipt is invalid."); }
      return value as GitReceipt[];
    } catch (error) { if (error instanceof Error && (error.message.includes("retention bound") || error.message.includes("Git receipt"))) throw error; return []; }
  }
  private writeReceipt(receipt: GitReceipt): void { const existing = this.readReceipts(); if (existing.length >= MIGRATION_LIMITS.maxReceipts) throw new Error("Git receipt history is full; export or prune receipts before recording another."); atomicWriteFileSync(receiptPath(this.#root), `${JSON.stringify([receipt, ...existing], null, 2)}\n`); }

  async setRemote(name: string, url: string, pushUrl?: string, signal?: AbortSignal): Promise<GitStatusRecord> {
    this.assertReady();
    if (!REMOTE_NAME.test(name)) throw new Error("Remote name must start with a letter and contain only letters, digits, dots, hyphens, or underscores."); const safeUrl = validRemoteUrl(url); const clearPushUrl = pushUrl === ""; const safePushUrl = pushUrl && !clearPushUrl ? validRemoteUrl(pushUrl) : undefined;
    if (isLocalBareRepository(safeUrl)) assertLocalBareLayout(safeUrl, "The local remote");
    if (safePushUrl && isLocalBareRepository(safePushUrl)) assertLocalBareLayout(safePushUrl, "The local push remote");
    await this.ensureHistoryRepository(signal);
    this.writeReceipt({ id: randomUUID(), action: "remote-set", remote: name, branch: "", status: "prepared", observedAt: nowIso(this.#now), detail: "Remote replacement prepared; previous fetch and push configuration will be restored if either update fails." });
    const existingFetch = await execute(this.#executor, this.#history, ["remote", "get-url", name], 30_000, signal).then((value) => value.trim()).catch(() => "");
    const existingPushUrls = await execute(this.#executor, this.#history, ["config", "--get-all", `remote.${name}.pushurl`], 30_000, signal).then((value) => value.split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)).catch(() => [] as string[]);
    const existingPush = (await execute(this.#executor, this.#history, ["remote", "get-url", "--push", name], 30_000, signal).then((value) => value.trim()).catch(() => ""));
    try {
      if (existingFetch) await execute(this.#executor, this.#history, ["remote", "set-url", name, safeUrl], 30_000, signal); else await execute(this.#executor, this.#history, ["remote", "add", name, safeUrl], 30_000, signal);
      if (safePushUrl) await execute(this.#executor, this.#history, ["remote", "set-url", "--push", name, safePushUrl], 30_000, signal);
      if (clearPushUrl && existingPushUrls.length > 0) await execute(this.#executor, this.#history, ["config", "--unset-all", `remote.${name}.pushurl`], 30_000, signal);
      const resolvedFetch = (await execute(this.#executor, this.#history, ["remote", "get-url", name], 30_000, signal)).trim(); const resolvedPush = (await execute(this.#executor, this.#history, ["remote", "get-url", "--push", name], 30_000, signal)).trim(); if (resolvedFetch !== safeUrl || (safePushUrl && resolvedPush !== safePushUrl) || (clearPushUrl && resolvedPush !== safeUrl)) throw new Error("Remote configuration readback did not match the validated fetch or push URL.");
      this.writeReceipt({ id: randomUUID(), action: "remote-set", remote: name, branch: "", status: "success", observedAt: nowIso(this.#now), detail: `Remote replaced transactionally. Observed fetch URL: ${sanitizeDiagnostic(resolvedFetch)}. Observed push URL: ${sanitizeDiagnostic(resolvedPush)}. Previous fetch configuration existed: ${existingFetch ? "yes" : "no"}. Previous custom push configuration existed: ${existingPushUrls.length > 0 ? "yes" : "no"}.` });
      return this.gitStatus();
    } catch (error) {
      try {
        if (existingFetch) { await execute(this.#executor, this.#history, ["remote", "set-url", name, existingFetch], 30_000, signal); if (existingPushUrls.length > 0) { await execute(this.#executor, this.#history, ["config", "--unset-all", `remote.${name}.pushurl`], 30_000, signal); for (const priorPushUrl of existingPushUrls) await execute(this.#executor, this.#history, ["remote", "set-url", "--add", "--push", name, priorPushUrl], 30_000, signal); } }
        else await execute(this.#executor, this.#history, ["remote", "remove", name], 30_000, signal);
      } catch (rollbackError) { this.writeReceipt({ id: randomUUID(), action: "remote-set", remote: name, branch: "", status: "unverified", observedAt: nowIso(this.#now), detail: `Remote replacement failed and rollback also failed: ${sanitizeDiagnostic(rollbackError instanceof Error ? rollbackError.message : String(rollbackError))}` }); throw error; }
      this.writeReceipt({ id: randomUUID(), action: "remote-set", remote: name, branch: "", status: "rejected", observedAt: nowIso(this.#now), detail: `Remote replacement failed and the prior configuration was restored: ${sanitizeDiagnostic(error instanceof Error ? error.message : String(error))}` });
      throw error;
    }
  }
  async removeRemote(name: string, signal?: AbortSignal): Promise<GitStatusRecord> { this.assertReady(); if (!REMOTE_NAME.test(name)) throw new Error("Invalid remote name."); await this.ensureHistoryRepository(signal); this.writeReceipt({ id: randomUUID(), action: "remote-remove", remote: name, branch: "", status: "prepared", observedAt: nowIso(this.#now), detail: "Remote removal prepared; the operation will report the terminal receipt." }); await execute(this.#executor, this.#history, ["remote", "remove", name], 30_000, signal); let resolved = ""; try { resolved = (await execute(this.#executor, this.#history, ["remote", "get-url", name], 30_000, signal)).trim(); } catch (error) { const detail = sanitizeDiagnostic(error instanceof Error ? error.message : String(error)); if (!/no such remote|does not appear to be a git repository|not found/iu.test(detail)) throw new Error(`Remote removal readback failed: ${detail}`); } if (resolved) throw new Error("Remote removal readback still returned a URL."); try { this.writeReceipt({ id: randomUUID(), action: "remote-remove", remote: name, branch: "", status: "success", observedAt: nowIso(this.#now), detail: "Remote removed; no URL was retained." }); } catch (error) { throw new Error(`Remote was removed but its terminal receipt could not be written: ${error instanceof Error ? error.message : String(error)}`); } return this.gitStatus(); }
  async fetchRemote(name: string, signal?: AbortSignal): Promise<{ receipt: GitReceipt; status: GitStatusRecord }> {
    this.assertReady();
    if (!REMOTE_NAME.test(name)) throw new Error("Invalid remote name."); const start = nowIso(this.#now); let prepared = false; try { this.writeReceipt({ id: randomUUID(), action: "fetch", remote: name, branch: "", status: "prepared", observedAt: start, detail: "Fetch prepared; terminal status will be recorded after the normal fetch." }); prepared = true; if (signal?.aborted) throw new Error("Fetch cancelled."); await execute(this.#executor, this.#history, ["fetch", "--prune", name], 120_000, signal); const receipt: GitReceipt = { id: randomUUID(), action: "fetch", remote: name, branch: "", status: "success", observedAt: start, detail: "Fetch completed; no local refs were checked out or rewritten." }; this.writeReceipt(receipt); return { receipt, status: await this.gitStatus() }; } catch (error) { const detail = sanitizeDiagnostic(error instanceof Error ? error.message : String(error)); const status: GitReceipt["status"] = signal?.aborted ? "cancelled" : prepared && /receipt|history/iu.test(detail) ? "receipt-write-failure" : /auth|permission|denied/iu.test(detail) ? "auth-failure" : "rejected"; const receipt = { id: randomUUID(), action: "fetch" as const, remote: name, branch: "", status, observedAt: start, detail: status === "auth-failure" ? `${detail} Re-authenticate through the operating-system credential manager, then retry.` : detail }; try { this.writeReceipt(receipt); } catch { /* terminal receipt persistence failure remains in the returned operation result */ } return { receipt, status: await this.gitStatus() }; }
  }
  async pushRemote(name: string, branch: string, signal?: AbortSignal): Promise<{ receipt: GitReceipt; status: GitStatusRecord }> {
    this.assertReady();
    if (!REMOTE_NAME.test(name) || !REMOTE_NAME.test(branch)) throw new Error("Remote and branch names must use safe Git ref characters.");
    const start = nowIso(this.#now); let mutated = false;
    try {
      if (signal?.aborted) throw new Error("Push cancelled.");
      const before = await this.gitStatus(name, branch);
      if (before.comparison !== "verified" || !before.remotes.some((remote) => remote.name === name)) throw new Error("Select and verify the remote and target branch before preparing a push.");
      const pushUrl = validRemoteUrl((await execute(this.#executor, this.#history, ["remote", "get-url", "--push", name], 30_000, signal)).trim());
      const localObject = (await execute(this.#executor, this.#history, ["rev-parse", branch], 30_000, signal)).trim();
      this.writeReceipt({ id: randomUUID(), action: "push", remote: name, branch, status: "prepared", observedAt: start, detail: `Push prepared for ${sanitizeDiagnostic(pushUrl)}, refs/heads/${branch}, and object ${localObject}.` });
      if (before.divergence) { const receipt = { id: randomUUID(), action: "push" as const, remote: name, branch, status: "divergence" as const, observedAt: start, detail: "Push refused because local and remote history diverge." }; this.writeReceipt(receipt); return { receipt, status: before }; }
      await execute(this.#executor, this.#history, ["push", name, branch], 120_000, signal); mutated = true;
      const remoteLine = (await execute(this.#executor, this.#history, ["ls-remote", pushUrl, `refs/heads/${branch}`], 120_000, signal)).trim(); const [remoteObject] = remoteLine.split(/\s+/u);
      if (!OBJECT_ID.test(remoteObject ?? "") || remoteObject !== localObject) throw new Error("The push completed but ls-remote did not verify the intended ref and object at the configured push URL.");
      const receipt = { id: randomUUID(), action: "push" as const, remote: name, branch, status: "success" as const, observedAt: start, detail: "Normal push completed and ls-remote verified the configured push URL, ref, and object." }; this.writeReceipt(receipt); return { receipt, status: await this.gitStatus(name, branch) };
    } catch (error) {
      const detail = sanitizeDiagnostic(error instanceof Error ? error.message : String(error)); const status: GitReceipt["status"] = signal?.aborted ? "cancelled" : mutated && /receipt|history/iu.test(detail) ? "receipt-write-failure" : /auth|permission|denied/iu.test(detail) ? "auth-failure" : /non-fast-forward|rejected|diverg/iu.test(detail) ? "divergence" : "rejected";
      const receipt = { id: randomUUID(), action: "push" as const, remote: name, branch, status, observedAt: start, detail: status === "auth-failure" ? `${detail} Re-authenticate through the operating-system credential manager, then retry.` : detail }; try { this.writeReceipt(receipt); } catch { /* receipt persistence failure remains in the returned operation result */ } return { receipt, status: await this.gitStatus(name, branch) };
    }
  }
}
