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

export const MIGRATION_SCHEMA_VERSION = 1;
export const MIGRATION_LIMITS = Object.freeze({
  maxManifestBytes: 1_048_576,
  maxFileBytes: 64 * 1024 * 1024,
  maxPayloadBytes: 512 * 1024 * 1024,
  maxEntries: 4_096,
  maxDepth: 8,
  maxPathLength: 240,
});

const SAFE_FILE_NAMES = new Set([
  "servers.json", "settings.json", "notifications.json", "tabs.json", "groups.json",
  "appearance.json", "documents.json", "history-manifest.json", "git-receipts.json", "migration-operations.json",
]);
/* The local history directory is represented only by history.bundle.  Traversing it
 * would copy loose objects, which is explicitly not a migration format. */
const SAFE_DIRECTORIES = new Set(["artifacts"]);
const SECRET_WORD = /(credential|password|passwd|secret|token|totp|pin|passkey|vocabulary)/iu;
const TRANSIENT_NAMES = /(cache|tmp|temp|lock|socket|session)/iu;
const REMOTE_NAME = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/u;
const SHA256 = /^[0-9a-f]{64}$/iu;

export type MigrationOmissionReason =
  | "credential-vault-secret"
  | "private-vocabulary"
  | "source-path"
  | "transient-cache"
  | "unsafe-or-unsupported";

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
  kind: "export" | "import" | "backup" | "fetch" | "push";
  startedAt: string;
  finishedAt?: string;
  state: OperationState;
  completed: number;
  total: number;
  bytesDone: number;
  bytesTotal: number;
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
  refs: ReadonlyArray<{ name: string; object: string; kind: string }>;
  remotes: ReadonlyArray<RemoteRecord>;
  receipt?: GitReceipt;
}

export interface GitReceipt {
  id: string;
  action: "fetch" | "push";
  remote: string;
  branch: string;
  status: "success" | "rejected" | "auth-failure" | "divergence" | "cancelled" | "unverified";
  observedAt: string;
  detail: string;
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

function assertNoLink(path: string, root: string): void {
  const absoluteRoot = resolve(root);
  const absolute = resolve(root, path);
  if (absolute !== absoluteRoot && !absolute.startsWith(`${absoluteRoot}${sep}`)) throw new Error("Path escaped its root.");
  let current = absoluteRoot;
  for (const part of relative(absoluteRoot, absolute).split(sep).filter(Boolean)) {
    current = join(current, part);
    const stat = lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error(`Symlinks are not accepted in migration data: ${path}`);
    if (process.platform === "win32" && ((stat as unknown as { isReparsePoint?: () => boolean }).isReparsePoint?.() ?? false)) {
      throw new Error(`Reparse points are not accepted in migration data: ${path}`);
    }
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
    this.index += 1; const result: Record<string, unknown> = {}; const keys = new Set<string>(); this.ws();
    if (this.source[this.index] === "}") { this.index += 1; return result; }
    while (this.index < this.source.length) {
      this.ws(); if (this.source[this.index] !== '"') throw new Error("Object key must be a JSON string.");
      const key = this.string(); if (keys.has(key)) throw new Error(`Duplicate JSON key: ${key}`); keys.add(key);
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

function validRemoteUrl(raw: string): string {
  const value = raw.trim();
  if (!value || /[\u0000-\u001f\u007f]/u.test(value) || /[\s]/u.test(value)) throw new Error("Remote URL contains whitespace or control characters.");
  if (/^git@[^:]+:.+$/u.test(value)) return value;
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

function assertManifest(value: unknown): asserts value is MigrationManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Migration manifest must be an object.");
  const manifest = value as Record<string, unknown>;
  if (manifest.schemaVersion !== MIGRATION_SCHEMA_VERSION || manifest.kind !== "ding-pbx-console-migration") throw new Error("Unknown or future migration schema.");
  if (!Array.isArray(manifest.files) || manifest.files.length > MIGRATION_LIMITS.maxEntries) throw new Error("Migration file list is invalid or too large.");
  if (!Array.isArray(manifest.omissions)) throw new Error("Migration omissions are required.");
  const seen = new Set<string>();
  for (const entry of manifest.files as Array<Record<string, unknown>>) {
    const path = assertBoundedPath(String(entry.path ?? ""));
    if (seen.has(path)) throw new Error(`Duplicate migration file: ${path}`); seen.add(path);
    if (!Number.isSafeInteger(entry.bytes) || Number(entry.bytes) < 0 || Number(entry.bytes) > MIGRATION_LIMITS.maxFileBytes || !SHA256.test(String(entry.sha256 ?? ""))) throw new Error(`Invalid file record: ${path}`);
  }
  const git = manifest.gitHistory;
  if (git !== null && (typeof git !== "object" || git === undefined || !SHA256.test(String((git as Record<string, unknown>).sha256 ?? "")))) throw new Error("Invalid Git bundle record.");
}

async function execute(executor: ProcessExecutor, cwd: string, args: ReadonlyArray<string>, timeoutMs = 30_000): Promise<string> {
  const result = await executor.execute({ executable: "git", args, cwd, timeoutMs, maxOutputBytes: 16 * 1024 * 1024 });
  if (result.status !== "succeeded") throw new Error(result.stderr.trim() || `git exited with ${result.exitCode ?? "no status"}.`);
  return result.stdout;
}

function copyChecked(source: string, destination: string): number {
  assertNoLink(relative(dirname(source), source) || basename(source), dirname(source));
  const size = bytes(source); if (size > MIGRATION_LIMITS.maxFileBytes) throw new Error(`${basename(source)} exceeds the file limit.`);
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, readFileSync(source)); return size;
}

export class MigrationBackupService {
  readonly #root: string;
  readonly #history: string;
  readonly #executor: ProcessExecutor;
  readonly #now: () => Date;
  constructor(options: MigrationBackupOptions) {
    this.#root = resolve(options.userDataPath); this.#history = resolve(options.historyPath ?? join(this.#root, "history")); this.#executor = options.executor; this.#now = options.now ?? (() => new Date());
  }

  private readOperations(): MigrationOperation[] {
    try { const value = readJsonStrict(operationPath(this.#root)); return Array.isArray(value) ? value as MigrationOperation[] : []; } catch { return []; }
  }
  private writeOperations(value: ReadonlyArray<MigrationOperation>): void { atomicWriteFileSync(operationPath(this.#root), `${JSON.stringify(value, null, 2)}\n`); }
  private operation(kind: MigrationOperation["kind"]): MigrationOperation {
    return { id: randomUUID(), kind, startedAt: nowIso(this.#now), state: "running", completed: 0, total: 0, bytesDone: 0, bytesTotal: 0, items: [], detail: "Started." };
  }
  private finish(operation: MigrationOperation, state: OperationState, detail: string, items: ReadonlyArray<OperationItem> = operation.items): MigrationOperation {
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

  private sourceFiles(): string[] {
    const found: string[] = [];
    for (const name of SAFE_FILE_NAMES) { const path = join(this.#root, name); if (existsSync(path) && lstatSync(path).isFile()) found.push(path); }
    for (const directory of SAFE_DIRECTORIES) {
      const root = join(this.#root, directory); if (!existsSync(root) || !lstatSync(root).isDirectory()) continue;
      const visit = (dir: string, depth: number) => {
        if (depth > MIGRATION_LIMITS.maxDepth) throw new Error(`Migration data exceeds the directory depth limit at ${directory}.`);
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const path = join(dir, entry.name); const rel = relative(this.#root, path).replaceAll(sep, "/");
          if (SECRET_WORD.test(rel) || TRANSIENT_NAMES.test(entry.name)) continue;
          assertNoLink(path.slice(this.#root.length + 1), this.#root);
          if (entry.isDirectory()) visit(path, depth + 1); else if (entry.isFile()) found.push(path);
        }
      };
      visit(root, 1);
    }
    return found.slice(0, MIGRATION_LIMITS.maxEntries);
  }

  private async ensureHistoryRepository(): Promise<void> {
    if (existsSync(join(this.#history, ".git"))) return;
    mkdirSync(this.#history, { recursive: true });
    await execute(this.#executor, this.#history, ["init", "--quiet"]);
    await execute(this.#executor, this.#history, ["config", "user.name", "Ding PBX Console local history"]);
    await execute(this.#executor, this.#history, ["config", "user.email", "local-history@ding-pbx-console.invalid"]);
    await execute(this.#executor, this.#history, ["commit", "--quiet", "--allow-empty", "-m", "Initialize local history"]);
  }

  private async gitRecord(directory: string): Promise<{ record: MigrationGitRecord; sourceBundle: string }> {
    mkdirSync(directory, { recursive: true });
    const bundle = join(directory, "history.bundle");
    await this.ensureHistoryRepository();
    await execute(this.#executor, this.#history, ["bundle", "create", bundle, "--all"], 120_000);
    await execute(this.#executor, this.#history, ["bundle", "verify", bundle], 30_000);
    const refs = (await execute(this.#executor, this.#history, ["for-each-ref", "--format=%(refname)\t%(objectname)\t%(objecttype)"]))
      .split(/\r?\n/u).filter(Boolean).map((line) => { const [name, object, kind] = line.split("\t"); return { name, object, kind }; });
    return { record: { path: "history.bundle", bytes: bytes(bundle), sha256: sha256File(bundle), refs, verified: true }, sourceBundle: bundle };
  }

  async exportMigration(destination?: string, signal?: AbortSignal): Promise<{ operation: MigrationOperation; path: string; manifest: MigrationManifest }> {
    const operation = this.operation("export"); this.writeOperations([...this.readOperations(), operation]);
    const output = resolve(destination || join(this.#root, "exports", `ding-pbx-migration-${Date.now()}`));
    const stage = mkdtempSync(join(tmpdir(), "ding-migration-export-")); const items: OperationItem[] = [];
    try {
      mkdirSync(output, { recursive: true }); const files = this.sourceFiles();
      const records: MigrationFileRecord[] = []; let totalBytes = 0;
      for (const source of files) {
        if (signal?.aborted) throw new Error("Export cancelled.");
        const path = relative(this.#root, source).replaceAll(sep, "/"); const target = join(stage, path); const size = copyChecked(source, target); totalBytes += size;
        if (totalBytes > MIGRATION_LIMITS.maxPayloadBytes) throw new Error("Migration payload exceeds the total size limit.");
        records.push({ path, bytes: size, sha256: sha256File(target) }); items.push({ path, state: "succeeded", bytes: size });
      }
      const git = await this.gitRecord(stage);
      const manifest: MigrationManifest = { schemaVersion: MIGRATION_SCHEMA_VERSION, kind: "ding-pbx-console-migration", createdAt: nowIso(this.#now), application: "Ding PBX Console", files: records, gitHistory: git.record, omissions: this.omissions(), retention: { backups: this.retention() } };
      writeFileSync(join(stage, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      if (existsSync(output)) rmSync(output, { recursive: true, force: true }); renameSync(stage, output);
      const next = { ...operation, completed: items.length, total: items.length, bytesDone: totalBytes, bytesTotal: totalBytes, items, detail: `Exported ${items.length} files and one verified Git bundle.` };
      return { operation: this.finish(next, "succeeded", next.detail), path: output, manifest };
    } catch (error) {
      rmSync(stage, { recursive: true, force: true }); const detail = error instanceof Error ? error.message : String(error); const state: OperationState = signal?.aborted ? "cancelled" : "failed";
      return { operation: this.finish({ ...operation, items }, state, detail), path: output, manifest: { schemaVersion: MIGRATION_SCHEMA_VERSION, kind: "ding-pbx-console-migration", createdAt: nowIso(this.#now), application: "Ding PBX Console", files: [], gitHistory: null, omissions: this.omissions(), retention: { backups: this.retention() } } };
    }
  }

  private retention(): number { try { const value = readJsonStrict(backupIndexPath(this.#root)); return Array.isArray(value) ? value.length : 0; } catch { return 0; } }

  async createBackup(signal?: AbortSignal): Promise<{ operation: MigrationOperation; path: string; manifest: MigrationManifest }> {
    const path = join(this.#root, "backups", `${Date.now()}-${randomUUID()}`); const result = await this.exportMigration(path, signal); const indexPath = backupIndexPath(this.#root);
    const index = (() => { try { const value = readJsonStrict(indexPath); return Array.isArray(value) ? value as Array<{ path: string; createdAt: string }> : []; } catch { return []; } })();
    index.unshift({ path, createdAt: result.manifest.createdAt }); atomicWriteFileSync(indexPath, `${JSON.stringify(index.slice(0, 32), null, 2)}\n`);
    const operations = this.readOperations().map((entry) => entry.id === result.operation.id ? { ...entry, kind: "backup" as const } : entry);
    this.writeOperations(operations);
    return { ...result, operation: { ...result.operation, kind: "backup" } };
  }

  async listBackups(): Promise<ReadonlyArray<{ path: string; createdAt: string; bytes: number; verified: boolean }>> {
    try {
      const value = readJsonStrict(backupIndexPath(this.#root)); if (!Array.isArray(value)) return [];
      return value.map((entry) => { const path = String((entry as Record<string, unknown>).path ?? ""); const manifestPath = join(path, "manifest.json"); if (!isAbsolute(path) || !existsSync(manifestPath)) return undefined; return { path, createdAt: String((entry as Record<string, unknown>).createdAt ?? ""), bytes: bytes(manifestPath), verified: true }; }).filter(Boolean) as Array<{ path: string; createdAt: string; bytes: number; verified: boolean }>;
    } catch { return []; }
  }

  async validateImport(source: string): Promise<MigrationManifest> {
    const manifestPath = statSync(source).isDirectory() ? join(source, "manifest.json") : source;
    assertNoLink(relative(dirname(manifestPath), manifestPath) || basename(manifestPath), dirname(manifestPath));
    const value = readJsonStrict(manifestPath); assertManifest(value); const root = dirname(manifestPath); let total = 0;
    const seen = new Set<string>();
    for (const entry of value.files) {
      const path = assertBoundedPath(entry.path); if (seen.has(path)) throw new Error(`Duplicate file record: ${path}`); seen.add(path);
      const sourcePath = join(root, path); if (!existsSync(sourcePath) || !lstatSync(sourcePath).isFile()) throw new Error(`Migration file is missing: ${path}`); assertNoLink(path, root);
      const size = bytes(sourcePath); total += size; if (size !== entry.bytes || sha256File(sourcePath).toLowerCase() !== entry.sha256.toLowerCase()) throw new Error(`Hash or size mismatch for ${path}.`);
    }
    if (total > MIGRATION_LIMITS.maxPayloadBytes) throw new Error("Migration payload exceeds the total size limit.");
    if (value.gitHistory) { const bundle = join(root, value.gitHistory.path); if (!existsSync(bundle) || bytes(bundle) !== value.gitHistory.bytes || sha256File(bundle).toLowerCase() !== value.gitHistory.sha256.toLowerCase()) throw new Error("Git bundle hash or size mismatch."); await execute(this.#executor, root, ["bundle", "verify", bundle], 30_000); }
    return value;
  }

  async importMigration(source: string, confirmReplace = false, signal?: AbortSignal): Promise<{ operation: MigrationOperation; manifest: MigrationManifest }> {
    const operation = this.operation("import"); this.writeOperations([...this.readOperations(), operation]);
    if (!confirmReplace) return { operation: this.finish(operation, "failed", "Replacement requires the two-key destructive confirmation."), manifest: await this.validateImport(source) };
    const manifest = await this.validateImport(source); const backup = await this.createBackup(signal); if (backup.operation.state !== "succeeded") return { operation: this.finish(operation, "failed", "The automatic backup before import did not complete."), manifest };
    const manifestPath = statSync(source).isDirectory() ? join(source, "manifest.json") : source; const root = dirname(manifestPath); const stage = mkdtempSync(join(tmpdir(), "ding-migration-import-")); const items: OperationItem[] = [];
    try {
      let total = 0; for (const entry of manifest.files) { if (signal?.aborted) throw new Error("Import cancelled."); const dest = join(stage, entry.path); const size = copyChecked(join(root, entry.path), dest); total += size; items.push({ path: entry.path, state: "succeeded", bytes: size }); }
      if (manifest.gitHistory) {
        const bundle = join(root, manifest.gitHistory.path); const restoredHistory = join(stage, "history");
        await execute(this.#executor, stage, ["clone", "--quiet", bundle, restoredHistory], 120_000); await execute(this.#executor, restoredHistory, ["fsck", "--full"], 120_000);
      }
      const parent = dirname(this.#root); const movedLive = join(parent, `${basename(this.#root)}.pre-import-${randomUUID()}`);
      renameSync(this.#root, movedLive);
      try {
        renameSync(stage, this.#root);
        const backupName = basename(backup.path); const preservedBackup = join(movedLive, "backups", backupName);
        mkdirSync(join(this.#root, "backups"), { recursive: true });
        if (existsSync(preservedBackup)) renameSync(preservedBackup, join(this.#root, "backups", backupName));
        rmSync(movedLive, { recursive: true, force: true });
      }
      catch (error) { if (existsSync(this.#root)) rmSync(this.#root, { recursive: true, force: true }); renameSync(movedLive, this.#root); throw error; }
      const next = { ...operation, completed: items.length, total: items.length, bytesDone: total, bytesTotal: total, items, detail: `Imported ${items.length} files after a verified automatic backup.` }; return { operation: this.finish(next, "succeeded", next.detail), manifest };
    } catch (error) { rmSync(stage, { recursive: true, force: true }); return { operation: this.finish({ ...operation, items }, signal?.aborted ? "cancelled" : "failed", error instanceof Error ? error.message : String(error)), manifest }; }
  }

  async gitStatus(remote?: string, branch?: string): Promise<GitStatusRecord> {
    if (!existsSync(join(this.#history, ".git"))) return { repositoryPath: this.#history, head: "", branch: "", clean: true, ahead: 0, behind: 0, divergence: false, refs: [], remotes: [] };
    const head = (await execute(this.#executor, this.#history, ["rev-parse", "HEAD"])).trim(); const branchName = (await execute(this.#executor, this.#history, ["branch", "--show-current"])).trim() || "HEAD";
    const status = await execute(this.#executor, this.#history, ["status", "--porcelain=v1"]); const refs = (await execute(this.#executor, this.#history, ["for-each-ref", "--format=%(refname)\t%(objectname)\t%(objecttype)"])).split(/\r?\n/u).filter(Boolean).map((line) => { const [name, object, kind] = line.split("\t"); return { name, object, kind }; });
    const lines = (await execute(this.#executor, this.#history, ["remote", "-v"])).split(/\r?\n/u).filter(Boolean); const remotes: RemoteRecord[] = []; for (const line of lines) { const match = /^([^\s]+)\s+(\S+)\s+\((fetch|push)\)$/u.exec(line); if (!match) continue; const existing = remotes.find((entry) => entry.name === match[1]); if (existing) existing[match[3] === "fetch" ? "fetchUrl" : "pushUrl"] = match[2]; else remotes.push({ name: match[1], url: match[2], fetchUrl: match[3] === "fetch" ? match[2] : "", pushUrl: match[3] === "push" ? match[2] : "" }); }
    let ahead = 0; let behind = 0; if (remote) { const selected = remotes.find((entry) => entry.name === remote); if (selected && branch) { try { const counts = (await execute(this.#executor, this.#history, ["rev-list", "--left-right", "--count", `${branch}...${remote}/${branch}`])).trim().split(/\s+/u).map(Number); ahead = counts[0] || 0; behind = counts[1] || 0; } catch { /* no upstream is an unverified comparison, not a clean comparison */ } } }
    return { repositoryPath: this.#history, head, branch: branchName, clean: status.trim().length === 0, ahead, behind, divergence: ahead > 0 && behind > 0, refs, remotes, receipt: this.readReceipts()[0] };
  }

  private readReceipts(): GitReceipt[] { try { const value = readJsonStrict(receiptPath(this.#root)); return Array.isArray(value) ? value as GitReceipt[] : []; } catch { return []; } }
  private writeReceipt(receipt: GitReceipt): void { atomicWriteFileSync(receiptPath(this.#root), `${JSON.stringify([receipt, ...this.readReceipts()].slice(0, 100), null, 2)}\n`); }

  async setRemote(name: string, url: string): Promise<GitStatusRecord> {
    if (!REMOTE_NAME.test(name)) throw new Error("Remote name must start with a letter and contain only letters, digits, dots, hyphens, or underscores."); const safeUrl = validRemoteUrl(url);
    if (isLocalBareRepository(safeUrl) && !existsSync(join(safeUrl, "HEAD"))) throw new Error("The local remote must be an existing bare repository with a HEAD file.");
    await this.ensureHistoryRepository();
    await execute(this.#executor, this.#history, ["remote", "remove", name]).catch(() => undefined); await execute(this.#executor, this.#history, ["remote", "add", name, safeUrl]); return this.gitStatus();
  }
  async removeRemote(name: string): Promise<GitStatusRecord> { if (!REMOTE_NAME.test(name)) throw new Error("Invalid remote name."); await this.ensureHistoryRepository(); await execute(this.#executor, this.#history, ["remote", "remove", name]); return this.gitStatus(); }
  async fetchRemote(name: string, signal?: AbortSignal): Promise<{ receipt: GitReceipt; status: GitStatusRecord }> {
    if (!REMOTE_NAME.test(name)) throw new Error("Invalid remote name."); const start = nowIso(this.#now); try { if (signal?.aborted) throw new Error("Fetch cancelled."); await execute(this.#executor, this.#history, ["fetch", "--prune", name], 120_000); const receipt: GitReceipt = { id: randomUUID(), action: "fetch", remote: name, branch: "", status: "success", observedAt: start, detail: "Fetch completed; no local refs were checked out or rewritten." }; this.writeReceipt(receipt); return { receipt, status: await this.gitStatus() }; } catch (error) { const detail = error instanceof Error ? error.message : String(error); const status: GitReceipt["status"] = signal?.aborted ? "cancelled" : /auth|permission|denied/iu.test(detail) ? "auth-failure" : "rejected"; const receipt = { id: randomUUID(), action: "fetch" as const, remote: name, branch: "", status, observedAt: start, detail }; this.writeReceipt(receipt); return { receipt, status: await this.gitStatus() }; }
  }
  async pushRemote(name: string, branch: string, signal?: AbortSignal): Promise<{ receipt: GitReceipt; status: GitStatusRecord }> {
    if (!REMOTE_NAME.test(name) || !REMOTE_NAME.test(branch)) throw new Error("Remote and branch names must use safe Git ref characters."); const start = nowIso(this.#now); try { if (signal?.aborted) throw new Error("Push cancelled."); const before = await this.gitStatus(name, branch); if (before.divergence) { const receipt = { id: randomUUID(), action: "push" as const, remote: name, branch, status: "divergence" as const, observedAt: start, detail: "Push refused because local and remote history diverge." }; this.writeReceipt(receipt); return { receipt, status: before }; } await execute(this.#executor, this.#history, ["push", name, branch], 120_000); const receipt = { id: randomUUID(), action: "push" as const, remote: name, branch, status: "success" as const, observedAt: start, detail: "Normal push completed without force or history rewriting." }; this.writeReceipt(receipt); return { receipt, status: await this.gitStatus(name, branch) }; } catch (error) { const detail = error instanceof Error ? error.message : String(error); const status: GitReceipt["status"] = signal?.aborted ? "cancelled" : /auth|permission|denied/iu.test(detail) ? "auth-failure" : /non-fast-forward|rejected|diverg/iu.test(detail) ? "divergence" : "rejected"; const receipt = { id: randomUUID(), action: "push" as const, remote: name, branch, status, observedAt: start, detail }; this.writeReceipt(receipt); return { receipt, status: await this.gitStatus(name, branch) }; }
  }
}
