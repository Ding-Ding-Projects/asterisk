import { existsSync, readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import type { LocalHistory, LocalHistoryEntry } from "./local-history.js";
import type { CommandRequest, CommandResult, ProcessExecutor } from "./executor.js";
import { redactText } from "./redaction.js";
import { atomicWriteFileSync } from "./atomic-file.js";

export const FORGE_SCHEMA_VERSION = 1 as const;
export const FORGE_GH_SHA256 = "e2efa10a5d2ce93cac9bc4b676932b62947c0967c01c8f2c3a9cb4437ad358d3";
export const FORGE_CONPTY_HELPER_SHA256 = "4dc258722923d12e9887ca32d0241f95bd64e1e460f9b31866778cf06f50188a";
export const FORGE_PROVIDERS = ["github", "gitlab"] as const;
export type ForgeProvider = (typeof FORGE_PROVIDERS)[number];
export type ForgeOwnerKind = "personal" | "organization";
export type ForgePublishRoute = "fork" | "copy-and-push";

export interface ForgeProviderCapabilities {
  provider: ForgeProvider;
  displayName: string;
  supportsFork: boolean;
  supportsCopyAndPush: boolean;
  apiState: "available" | "unavailable";
  supportsOrganizationCreation?: boolean;
  reason?: string;
}

export interface ForgeAccount {
  id: string;
  provider: ForgeProvider;
  hostname: string;
  login: string;
  displayName: string;
  tokenRef?: string;
  credentialStorage: "keyring" | "plaintext-refused" | "unknown";
  state: "available" | "reauth-required" | "signed-out";
  lastSeenAt: string;
  active?: boolean;
}

export interface ForgeOwner {
  id: string;
  accountId: string;
  provider: ForgeProvider;
  login: string;
  displayName: string;
  kind: ForgeOwnerKind;
  canForkRepository: boolean;
  canCreateRepository: boolean;
  capabilities: ForgeProviderCapabilities;
}

export type ForgeReceiptStatus = "succeeded" | "partial" | "failed" | "cancelled" | "unknown-side-effect" | "reauth-required" | "unavailable";

export interface ForgeAccountReceipt {
  kind: "account";
  operation: "sign-in" | "sign-out" | "refresh" | "activate";
  id: string;
  status: ForgeReceiptStatus;
  provider: ForgeProvider;
  accountId: string;
  message: string;
  observedAt: string;
  reauthAction?: "add-account" | "refresh-account" | "sign-in";
}

export interface ForgePublicationReceipt {
  kind: "publication";
  id: string;
  status: ForgeReceiptStatus;
  provider: ForgeProvider;
  accountId: string;
  ownerId?: string;
  route?: ForgePublishRoute;
  repositoryName?: string;
  repositoryUrl?: string;
  effectivePushUrl?: string;
  sourceCommit?: string;
  message: string;
  observedAt: string;
  reauthAction?: "add-account" | "refresh-account" | "sign-in";
}

export interface ForgeInterruptedReceipt {
  kind: "interrupted";
  operation: ForgeOperation["kind"];
  id: string;
  status: "unknown-side-effect";
  provider: "github";
  accountId: string;
  message: string;
  observedAt: string;
}

export type ForgeReceipt = ForgeAccountReceipt | ForgePublicationReceipt | ForgeInterruptedReceipt;
export type ForgeActionStatus = ForgeReceiptStatus | "pending";

export interface ForgeState {
  schemaVersion: typeof FORGE_SCHEMA_VERSION;
  activeAccountId?: string;
  accounts: ForgeAccount[];
  receipts: ForgeReceipt[];
  operation: ForgeOperation;
  corruption?: string;
  device?: ForgeDeviceState;
}

export interface ForgeDeviceState {
  status: "idle" | "pending" | "installed" | "failed" | "cancelled";
  userCode?: string;
  verificationUri?: string;
  expiresAt?: string;
  message: string;
}

export interface ForgeOperation {
  id: string;
  kind: "idle" | "account-discovery" | "sign-in" | "publish" | "owner-discovery";
  status: "idle" | "running" | "succeeded" | "failed" | "cancelled";
  progress: number;
  message: string;
  startedAt?: string;
  cancellable: boolean;
}

export interface ForgeStateStore {
  read(): ForgeState | undefined;
  write(state: ForgeState): void;
}

export class FileForgeStateStore implements ForgeStateStore {
  readonly #path: string;

  constructor(path: string) {
    this.#path = path;
  }

  read(): ForgeState | undefined {
    if (!existsSync(this.#path)) return undefined;
    try {
      const parsed = JSON.parse(readFileSync(this.#path, "utf8")) as unknown;
      return parseForgeState(parsed);
    } catch {
      return { ...defaultState(), corruption: "The saved forge state could not be parsed, so no account or receipt data was applied." };
    }
  }

  write(state: ForgeState): void {
    atomicWriteFileSync(this.#path, `${JSON.stringify(state, null, 2)}\n`);
  }
}

export interface ForgePublisherOptions {
  executor: ProcessExecutor;
  store: ForgeStateStore;
  history?: Pick<LocalHistory, "record">;
  now?: () => Date;
  deviceClientId?: string;
  fetchImpl?: typeof fetch;
  conptyHelperPath?: string;
  conptyStatePath?: string;
  bundledGhPath?: string;
  bundledGhSha256?: string;
  conptyHelperSha256?: string;
}

export interface ForgeAccountRequest {
  provider?: unknown;
  hostname?: unknown;
  login?: unknown;
}

export interface ForgeSignInRequest {
  provider?: unknown;
  hostname?: unknown;
}

export interface ForgePublishRequest {
  accountId?: unknown;
  ownerId?: unknown;
  provider?: unknown;
  route?: unknown;
  sourceRemote?: unknown;
  sourcePath?: unknown;
  repositoryName?: unknown;
  description?: unknown;
  visibility?: unknown;
  defaultBranch?: unknown;
}

export interface ForgeActionResult<T> {
  status: ForgeActionStatus;
  message: string;
  data?: T;
  receipt?: ForgeReceipt;
  reauthAction?: "add-account" | "refresh-account" | "sign-in";
}

export const PROVIDER_CAPABILITIES: Readonly<Record<ForgeProvider, ForgeProviderCapabilities>> = {
  github: {
    provider: "github",
    displayName: "GitHub",
    supportsFork: true,
    supportsCopyAndPush: true,
    apiState: "available",
    supportsOrganizationCreation: true,
  },
  gitlab: {
    provider: "gitlab",
    displayName: "GitLab",
    supportsFork: false,
    supportsCopyAndPush: false,
    apiState: "unavailable",
    supportsOrganizationCreation: false,
    reason: "GitLab publishing is listed but no local gitlab CLI or OS-vault adapter is configured.",
  },
};

const GITHUB_HOST = "github.com";
const MAX_RECEIPTS = 100;
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u;
const SAFE_LOGIN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,38}$/u;
const SAFE_OWNER_ID = /^github:(?:user|org):[A-Za-z0-9][A-Za-z0-9._-]{0,38}$/u;
const SAFE_ACCOUNT_ID = /^github\.com:[A-Za-z0-9][A-Za-z0-9._-]{0,38}$/u;
const SAFE_COMMIT = /^[0-9a-f]{7,64}$/iu;
const SAFE_REMOTE = /^https:\/\/[A-Za-z0-9.-]+\/[A-Za-z0-9._/-]+(?:\.git)?$/u;
const AUTH_ENVIRONMENT_KEYS = [
  "GH_TOKEN", "GITHUB_TOKEN", "GH_ENTERPRISE_TOKEN", "GITHUB_ENTERPRISE_TOKEN", "GITLAB_TOKEN", "GH_HOST", "GIT_ASKPASS",
  "GIT_CONFIG_COUNT", "GIT_CONFIG_KEY_0", "GIT_CONFIG_VALUE_0", "GIT_CONFIG_PARAMETERS", "GIT_HTTP_EXTRAHEADER", "GIT_SSH_COMMAND",
] as const;

function defaultState(): ForgeState {
  return { schemaVersion: FORGE_SCHEMA_VERSION, accounts: [], receipts: [], operation: idleOperation(), device: { status: "idle", message: "No device sign-in is running." } };
}

function idleOperation(): ForgeOperation {
  return { id: "idle", kind: "idle", status: "idle", progress: 0, message: "No forge operation is running.", cancellable: false };
}

function parseForgeState(value: unknown): ForgeState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...defaultState(), corruption: "The saved forge state had an invalid shape, so no account or receipt data was applied." };
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== FORGE_SCHEMA_VERSION || !Array.isArray(record.accounts) || !Array.isArray(record.receipts)) {
    return { ...defaultState(), corruption: "The saved forge state used an unsupported schema, so no account or receipt data was applied." };
  }
  const rawAccounts = record.accounts as unknown[];
  const accounts = rawAccounts.filter(isForgeAccount).slice(0, 50);
  const receipts = record.receipts.filter(isForgeReceipt).slice(0, MAX_RECEIPTS);
  const activeAccountId = typeof record.activeAccountId === "string" && accounts.some((account) => account.id === record.activeAccountId)
    ? record.activeAccountId
    : undefined;
  const storedOperation = isForgeOperation(record.operation) ? record.operation : idleOperation();
  const wasInterrupted = storedOperation.status === "running";
  const operation = wasInterrupted ? { ...storedOperation, status: "failed" as const, cancellable: false, message: "The previous forge operation stopped before its outcome was recorded." } : storedOperation;
  const device = isForgeDeviceState(record.device) ? record.device : { status: "idle" as const, message: "No device sign-in is running." };
  const corruptionParts = [] as string[];
  if (rawAccounts.length !== accounts.length) corruptionParts.push("Some saved forge accounts were invalid and were retained as unavailable rather than applied.");
  if (!isForgeOperation(record.operation)) corruptionParts.push("The saved forge operation state was missing or invalid and was reset to idle.");
  if (!isForgeDeviceState(record.device)) corruptionParts.push("The saved device-flow state was missing or invalid and was reset to idle.");
  const corruption = corruptionParts.length > 0 ? corruptionParts.join(" ") : undefined;
  const interrupted = wasInterrupted ? [{ kind: "interrupted" as const, operation: storedOperation.kind, id: `forge-interrupted-${storedOperation.id}`, status: "unknown-side-effect" as const, provider: "github" as const, accountId: activeAccountId ?? "github.com:unknown", message: `The ${storedOperation.kind} operation stopped before its external outcome was known. Re-read the provider and local checkout before retrying.`, observedAt: new Date().toISOString() }] : [];
  return { schemaVersion: FORGE_SCHEMA_VERSION, activeAccountId, accounts, receipts: [...interrupted, ...receipts], operation, device, corruption };
}

function isForgeAccount(value: unknown): value is ForgeAccount {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && SAFE_ACCOUNT_ID.test(record.id)
    && record.provider === "github" && record.hostname === GITHUB_HOST
    && typeof record.login === "string" && SAFE_LOGIN.test(record.login)
    && typeof record.displayName === "string" && record.displayName.length <= 120
    && (record.tokenRef === undefined || (typeof record.tokenRef === "string" && record.tokenRef.length <= 200))
    && (record.credentialStorage === "keyring" || record.credentialStorage === "plaintext-refused" || record.credentialStorage === "unknown")
    && (record.state === "available" || record.state === "reauth-required" || record.state === "signed-out")
    && typeof record.lastSeenAt === "string"
    && (record.active === undefined || typeof record.active === "boolean");
}

function isForgeReceipt(value: unknown): value is ForgeReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const common = typeof record.id === "string" && record.id.length > 0 && record.id.length <= 100
    && (record.status === "succeeded" || record.status === "partial" || record.status === "failed" || record.status === "cancelled" || record.status === "unknown-side-effect" || record.status === "reauth-required" || record.status === "unavailable")
    && record.provider === "github" && typeof record.accountId === "string" && SAFE_ACCOUNT_ID.test(record.accountId)
    && typeof record.message === "string" && record.message.length <= 2000
    && typeof record.observedAt === "string";
  if (!common) return false;
  if (record.kind === "interrupted") return typeof record.operation === "string" && ["idle", "account-discovery", "sign-in", "publish", "owner-discovery"].includes(record.operation) && record.status === "unknown-side-effect";
  if (record.kind === "account") return record.operation === "sign-in" || record.operation === "sign-out" || record.operation === "refresh" || record.operation === "activate";
  return record.kind === "publication"
    && typeof record.ownerId === "string" && SAFE_OWNER_ID.test(record.ownerId)
    && (record.route === "fork" || record.route === "copy-and-push")
    && typeof record.repositoryName === "string" && SAFE_NAME.test(record.repositoryName)
    && (record.repositoryUrl === undefined || (typeof record.repositoryUrl === "string" && SAFE_REMOTE.test(record.repositoryUrl)))
    && (record.effectivePushUrl === undefined || (typeof record.effectivePushUrl === "string" && SAFE_REMOTE.test(record.effectivePushUrl)))
    && (record.sourceCommit === undefined || (typeof record.sourceCommit === "string" && SAFE_COMMIT.test(record.sourceCommit)));
}

function isForgeOperation(value: unknown): value is ForgeOperation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.kind === "string"
    && ["idle", "account-discovery", "sign-in", "publish", "owner-discovery"].includes(record.kind)
    && typeof record.status === "string" && ["idle", "running", "succeeded", "failed", "cancelled"].includes(record.status)
    && typeof record.progress === "number" && Number.isFinite(record.progress) && record.progress >= 0 && record.progress <= 100
    && typeof record.message === "string" && record.message.length <= 2000
    && typeof record.cancellable === "boolean";
}

function isForgeDeviceState(value: unknown): value is ForgeDeviceState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return ["idle", "pending", "installed", "failed", "cancelled"].includes(String(record.status))
    && typeof record.message === "string" && record.message.length <= 2000
    && (record.userCode === undefined || (typeof record.userCode === "string" && /^[A-Z0-9 -]{4,32}$/u.test(record.userCode)))
    && (record.verificationUri === undefined || (typeof record.verificationUri === "string" && /^https:\/\/[A-Za-z0-9.-]+\/.+/u.test(record.verificationUri)))
    && (record.expiresAt === undefined || typeof record.expiresAt === "string");
}

function parseProvider(value: unknown): ForgeProvider {
  if (value === "github" || value === "gitlab") return value;
  throw new Error("Choose a supported forge provider.");
}

function parseLogin(value: unknown): string {
  const login = typeof value === "string" ? value.trim() : "";
  if (!SAFE_LOGIN.test(login)) throw new Error("The account name must be a real provider account name.");
  return login;
}

function parseRoute(value: unknown): ForgePublishRoute {
  if (value === "fork" || value === "copy-and-push") return value;
  throw new Error("Choose Fork or Copy and push.");
}

function parseRepositoryName(value: unknown): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (!SAFE_NAME.test(name)) throw new Error("The repository name must be 1 to 100 letters, numbers, dots, underscores, or hyphens.");
  return name;
}

function parseAbsolutePath(value: unknown): string {
  const path = typeof value === "string" ? value.trim() : "";
  if (!isAbsolute(path) || path.length > 4096) throw new Error("Choose the local source folder through the desktop file picker.");
  return path;
}

function parseHttpsRemote(value: unknown, expectedHost = GITHUB_HOST): string {
  const remote = typeof value === "string" ? value.trim() : "";
  if (!SAFE_REMOTE.test(remote)) throw new Error("The source remote must be an HTTPS forge URL.");
  const parsed = new URL(remote);
  if (parsed.hostname !== expectedHost) throw new Error(`The source host ${parsed.hostname} does not match the active provider host ${expectedHost}.`);
  return remote;
}

function parseVisibility(value: unknown): "private" | "public" {
  return value === "public" ? "public" : "private";
}

function parseDefaultBranch(value: unknown): string {
  const branch = typeof value === "string" && value.trim().length > 0 ? value.trim() : "main";
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/u.test(branch) || branch.includes("..") || branch.includes("@{")) {
    throw new Error("The destination default branch name is not valid.");
  }
  return branch;
}

function parseGhAccounts(stdout: string, now: string): ForgeAccount[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return [];
  }
  const hosts = parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>).hosts
    : undefined;
  const entries = hosts && typeof hosts === "object" && !Array.isArray(hosts)
    ? (hosts as Record<string, unknown>)[GITHUB_HOST]
    : undefined;
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry): ForgeAccount[] => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const record = entry as Record<string, unknown>;
    const loginValue = record.user ?? record.login;
    if (typeof loginValue !== "string" || !SAFE_LOGIN.test(loginValue)) return [];
    const login = loginValue.trim();
    const signedIn = record.state === undefined || record.state === "logged_in" || record.state === "available";
    const credentialStorage = record.tokenSource === "keyring" ? "keyring" as const : "plaintext-refused" as const;
    return [{
      id: `github.com:${login}`,
      provider: "github",
      hostname: GITHUB_HOST,
      login,
      displayName: login,
      state: signedIn && credentialStorage === "keyring" ? "available" : "reauth-required",
      credentialStorage,
      lastSeenAt: now,
      active: record.active === true,
    }];
  });
}

function resultFromCommand(result: CommandResult, action: string): string {
  if (result.status === "timedOut") return `${action} timed out before the provider confirmed an outcome.`;
  if (result.status === "cancelled") return `${action} was cancelled before the provider confirmed an outcome.`;
  return result.stderr.trim() || `${action} did not complete.`;
}

function receiptStatus(result: CommandResult, unknownSideEffect = false): ForgeReceiptStatus {
  if (result.status === "cancelled") return "cancelled";
  if (unknownSideEffect && result.status === "timedOut") return "partial";
  return result.status === "succeeded" ? "succeeded" : "failed";
}

function accountOwner(account: ForgeAccount, kind: ForgeOwnerKind, login: string, name: string, canCreateRepository = true, reason?: string, canForkRepository = canCreateRepository): ForgeOwner {
  const id = kind === "personal" ? `github:user:${login}` : `github:org:${login}`;
  return {
    id,
    accountId: account.id,
    provider: account.provider,
    login,
    displayName: name || login,
    kind,
    canForkRepository,
    canCreateRepository,
    capabilities: canCreateRepository ? PROVIDER_CAPABILITIES.github : { ...PROVIDER_CAPABILITIES.github, supportsOrganizationCreation: false, reason: reason ?? "The provider did not report repository-create permission for this owner." },
  };
}

export class ForgePublisher {
  readonly #executor: ProcessExecutor;
  readonly #store: ForgeStateStore;
  readonly #history?: Pick<LocalHistory, "record">;
  readonly #now: () => Date;
  readonly #deviceClientId?: string;
  readonly #fetch: typeof fetch;
  readonly #conptyHelperPath?: string;
  readonly #conptyStatePath?: string;
  readonly #bundledGhPath?: string;
  readonly #bundledGhSha256?: string;
  readonly #conptyHelperSha256?: string;
  #state: ForgeState;
  #owners = new Map<string, ForgeOwner>();
  #abortController: AbortController | undefined;
  #deviceCode: string | undefined;
  #deviceTask: Promise<void> | undefined;
  #conptySessionId: string | undefined;

  constructor(options: ForgePublisherOptions) {
    this.#executor = options.executor;
    this.#store = options.store;
    this.#history = options.history;
    this.#now = options.now ?? (() => new Date());
    this.#deviceClientId = options.deviceClientId;
    this.#fetch = options.fetchImpl ?? fetch;
    this.#conptyHelperPath = options.conptyHelperPath;
    this.#conptyStatePath = options.conptyStatePath;
    this.#bundledGhPath = options.bundledGhPath;
    this.#bundledGhSha256 = options.bundledGhSha256;
    this.#conptyHelperSha256 = options.conptyHelperSha256;
    this.#state = parseForgeState(options.store.read());
  }

  capabilities(): ReadonlyArray<ForgeProviderCapabilities> {
    return FORGE_PROVIDERS.map((provider) => PROVIDER_CAPABILITIES[provider]);
  }

  state(): ForgeState {
    return JSON.parse(JSON.stringify(this.#state)) as ForgeState;
  }

  async deviceState(): Promise<ForgeDeviceState> { return { ...(this.#state.device ?? { status: "idle", message: "No device sign-in is running." }) }; }

  private save(): void {
    this.#store.write(this.#state);
  }

  resetCorruption(): ForgeActionResult<ForgeState> {
    if (!this.#state.corruption) return { status: "failed", message: "No saved forge-state corruption is recorded." };
    this.#state = { ...this.#state, corruption: undefined };
    this.save();
    return { status: "succeeded", message: "The visible forge-state corruption marker was reset. Existing retained accounts and receipts were not deleted.", data: this.state() };
  }

  private async record(action: LocalHistoryEntry["action"], subject: string, payload: unknown): Promise<void> {
    if (!this.#history) return;
    await this.#history.record({ action, subject, payload });
  }

  private addReceipt(receipt: ForgeReceipt): void {
    this.#state.receipts = [receipt, ...this.#state.receipts].slice(0, MAX_RECEIPTS);
    this.save();
  }

  private beginOperation(kind: ForgeOperation["kind"], message: string): boolean {
    if (this.#state.operation.status === "running") return false;
    this.#abortController = new AbortController();
    this.#state.operation = { id: `forge-op-${Date.now().toString(36)}`, kind, status: "running", progress: 5, message, startedAt: this.#now().toISOString(), cancellable: true };
    this.save();
    return true;
  }

  private updateOperation(progress: number, message: string): void {
    if (this.#state.operation.status !== "running") return;
    this.#state.operation = { ...this.#state.operation, progress: Math.max(0, Math.min(100, progress)), message };
    this.save();
  }

  private finishOperation(status: ForgeOperation["status"], message: string): void {
    this.#state.operation = { ...this.#state.operation, status, progress: status === "succeeded" ? 100 : this.#state.operation.progress, message, cancellable: false };
    this.#abortController = undefined;
    this.save();
  }

  cancel(): ForgeActionResult<ForgeOperation> {
    if (this.#state.operation.status !== "running" || !this.#abortController) return { status: "failed", message: "No cancellable forge operation is running." };
    this.#abortController.abort();
    if (this.#conptySessionId && this.#conptyHelperPath && this.#conptyStatePath) void this.execute({ executable: "powershell.exe", args: ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", this.#conptyHelperPath, "-Mode", "cancel", "-StatePath", this.#conptyStatePath, "-GhPath", this.#bundledGhPath ?? "", "-SessionId", this.#conptySessionId], timeoutMs: 10_000, maxOutputBytes: 16 * 1024, clearEnvironmentKeys: AUTH_ENVIRONMENT_KEYS });
    this.finishOperation("cancelled", "The forge operation was cancelled before completion.");
    return { status: "cancelled", message: this.#state.operation.message, data: this.#state.operation };
  }

  private async gh(args: ReadonlyArray<string>, timeoutMs = 30_000, interactive = false, input?: string, redactedValues?: ReadonlyArray<string>): Promise<CommandResult> {
    this.updateOperation(Math.max(5, this.#state.operation.progress), interactive ? "Waiting for the provider device sign-in flow." : "Running the provider command.");
    const result = await this.execute({ executable: "gh", args, input, redactedValues, timeoutMs, maxOutputBytes: 4 * 1024 * 1024, signal: this.#abortController?.signal, environment: interactive ? undefined : { GH_PROMPT_DISABLED: "1" }, clearEnvironmentKeys: AUTH_ENVIRONMENT_KEYS });
    this.updateOperation(result.status === "succeeded" ? Math.min(95, this.#state.operation.progress + 20) : this.#state.operation.progress, result.status === "succeeded" ? "Provider command returned." : result.status === "cancelled" ? "Provider command cancelled." : "Provider command returned a failure.");
    return result;
  }

  private async devicePost(url: string, body: URLSearchParams, allowError = false): Promise<Record<string, unknown>> {
    const requestController = new AbortController();
    const timeout = setTimeout(() => requestController.abort(), 15_000);
    const parentAbort = () => requestController.abort();
    this.#abortController?.signal.addEventListener("abort", parentAbort, { once: true });
    try {
      const response = await this.#fetch(url, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(), signal: requestController.signal, redirect: "error" });
      const text = await response.text();
      if (text.length > 64 * 1024) throw new Error("The provider device response exceeded the bounded response size.");
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { throw new Error("The provider device response was not valid JSON."); }
      if ((!response.ok && !allowError) || !parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`The provider device request returned HTTP ${response.status}.`);
      return parsed as Record<string, unknown>;
    } catch (error) {
      if (requestController.signal.aborted) throw new Error(this.#abortController?.signal.aborted ? "Device sign-in was cancelled." : "The provider device request timed out.");
      throw error;
    } finally {
      clearTimeout(timeout);
      this.#abortController?.signal.removeEventListener("abort", parentAbort);
    }
  }

  private async waitForDevicePoll(ms: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, ms);
      const signal = this.#abortController?.signal;
      const abort = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); reject(new Error("Device sign-in was cancelled.")); };
      signal?.addEventListener("abort", abort, { once: true });
    });
  }

  private fileSha256(path: string): string {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  }

  private readConPtyState(): Record<string, unknown> | undefined {
    if (!this.#conptyStatePath || !existsSync(this.#conptyStatePath)) return undefined;
    try {
      const text = readFileSync(this.#conptyStatePath, "utf8");
      if (text.length > 64 * 1024) return undefined;
      const parsed = JSON.parse(text) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined;
    } catch { return undefined; }
  }

  private async startConPtyDeviceFlow(): Promise<ForgeActionResult<ReadonlyArray<ForgeAccount>>> {
    if (!this.#conptyHelperPath || !this.#conptyStatePath || !this.#bundledGhPath || !this.#bundledGhSha256 || !this.#conptyHelperSha256) return { status: "unavailable", message: "The packaged ConPTY helper contract is incomplete. Device sign-in remains unavailable until gh.exe and the helper are bundled with verified digests.", reauthAction: "sign-in" };
    if (this.fileSha256(this.#conptyHelperPath) !== this.#conptyHelperSha256) return { status: "unavailable", message: "The packaged ConPTY helper digest does not match the approved manifest. Device sign-in is refused.", reauthAction: "sign-in" };
    if (!this.beginOperation("sign-in", "Starting gh's bundled ConPTY device sign-in flow.")) return { status: "failed", message: "Another forge operation is already running." };
    const result = await this.execute({ executable: "powershell.exe", args: ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", this.#conptyHelperPath, "-Mode", "start", "-StatePath", this.#conptyStatePath, "-GhPath", this.#bundledGhPath], timeoutMs: 30_000, maxOutputBytes: 16 * 1024, environment: { DING_FORGE_GH_SHA256: this.#bundledGhSha256 }, clearEnvironmentKeys: AUTH_ENVIRONMENT_KEYS });
    const sessionId = result.status === "succeeded" ? result.stdout.trim().split(/\r?\n/u).filter(Boolean).pop() : undefined;
    if (!sessionId || !/^[0-9a-f]{32}$/iu.test(sessionId)) {
      const status = result.status === "cancelled" ? "cancelled" : "failed";
      const receipt: ForgeAccountReceipt = { kind: "account", operation: "sign-in", id: `forge-account-${Date.now().toString(36)}`, status, provider: "github", accountId: "github.com:conpty", message: resultFromCommand(result, "Starting the bundled ConPTY device flow"), observedAt: this.#now().toISOString(), reauthAction: "sign-in" };
      this.addReceipt(receipt); this.finishOperation(status, receipt.message); return { status, message: receipt.message, receipt, reauthAction: "sign-in" };
    }
    this.#conptySessionId = sessionId;
    this.#state.device = { status: "pending", message: "The bundled gh ConPTY helper is running. The user code and verification URL will appear here." };
    this.updateOperation(10, this.#state.device.message); this.save();
    this.#deviceTask = this.completeConPtyDeviceFlow(sessionId);
    return { status: "pending", message: this.#state.device.message, data: this.#state.accounts };
  }

  private async completeConPtyDeviceFlow(sessionId: string): Promise<void> {
    try {
      const started = Date.now();
      while (Date.now() - started < 300_000) {
        await this.waitForDevicePoll(500);
        const state = this.readConPtyState();
        if (state) {
          this.#state.device = { status: state.status === "completed" ? "installed" : state.status === "cancelled" ? "cancelled" : state.status === "failed" ? "failed" : "pending", userCode: typeof state.userCode === "string" ? state.userCode : undefined, verificationUri: typeof state.verificationUri === "string" ? state.verificationUri : undefined, message: typeof state.message === "string" ? state.message : "The ConPTY device flow is running." };
          this.updateOperation(Math.min(90, this.#state.operation.progress + 2), this.#state.device.message); this.save();
          if (state.status === "completed" || state.status === "failed" || state.status === "cancelled") break;
        }
      }
      const state = this.readConPtyState();
      if (!state || state.status === "pending" || state.status === "starting") throw new Error("The bundled ConPTY device flow timed out with unknown external outcome.");
      if (state.status !== "completed") throw new Error(typeof state.message === "string" ? state.message : "The bundled ConPTY device flow did not complete.");
      const verified = await this.gh(["auth", "status", "--hostname", GITHUB_HOST, "--json", "hosts"]);
      const secureAccount = verified.status === "succeeded" ? parseGhAccounts(verified.stdout, this.#now().toISOString()).find((account) => account.active && account.credentialStorage === "keyring") : undefined;
      if (!secureAccount) throw new Error("gh did not confirm secure keyring storage after ConPTY sign-in. Plain-text fallback is refused.");
      this.#state.device = { ...this.#state.device, status: "installed", message: "gh completed the device flow and confirmed keyring storage." };
      this.finishOperation("succeeded", this.#state.device.message); this.save();
    } catch (error) {
      const cancelled = this.#abortController?.signal.aborted || (error instanceof Error && /cancelled/iu.test(error.message));
      const status = cancelled ? "cancelled" : /unknown external outcome|timed out/iu.test(error instanceof Error ? error.message : "") ? "unknown-side-effect" : "failed";
      const message = error instanceof Error ? error.message : "The bundled ConPTY device flow did not complete.";
      const receipt: ForgeAccountReceipt = { kind: "account", operation: "sign-in", id: `forge-account-${Date.now().toString(36)}`, status, provider: "github", accountId: "github.com:conpty", message, observedAt: this.#now().toISOString(), reauthAction: "sign-in" };
      this.addReceipt(receipt); this.#state.device = { ...this.#state.device, status: status === "cancelled" ? "cancelled" : "failed", message }; this.finishOperation(status === "cancelled" ? "cancelled" : "failed", message); this.save();
    } finally { this.#conptySessionId = undefined; this.#deviceTask = undefined; }
  }

  private async verifyDestinationIdentity(ownerLogin: string, repositoryName: string, expectedUrl: string): Promise<{ ok: boolean; status: ForgeReceiptStatus; message: string }> {
    const result = await this.gh(["repo", "view", `${ownerLogin}/${repositoryName}`, "--json", "nameWithOwner,url"]);
    if (result.status !== "succeeded") return { ok: false, status: receiptStatus(result, true), message: resultFromCommand(result, "Reading the destination repository identity") };
    try {
      const parsed = JSON.parse(result.stdout) as { nameWithOwner?: unknown; url?: unknown };
      const expectedName = `${ownerLogin}/${repositoryName}`;
      if (parsed.nameWithOwner !== expectedName || parsed.url !== expectedUrl) return { ok: false, status: "failed", message: `The provider returned destination ${String(parsed.nameWithOwner ?? "unknown")} at ${String(parsed.url ?? "unknown")}, not ${expectedName} at ${expectedUrl}.` };
      return { ok: true, status: "succeeded", message: "The provider confirmed the exact destination owner, name, and URL." };
    } catch {
      return { ok: false, status: "failed", message: "The provider returned invalid destination identity data." };
    }
  }

  private async git(args: ReadonlyArray<string>, cwd: string, timeoutMs = 60_000): Promise<CommandResult> {
    this.updateOperation(Math.max(5, this.#state.operation.progress), "Running the local git command.");
    return await this.execute({ executable: "git", args, cwd, timeoutMs, maxOutputBytes: 4 * 1024 * 1024, signal: this.#abortController?.signal, environment: { GIT_TERMINAL_PROMPT: "0" }, clearEnvironmentKeys: AUTH_ENVIRONMENT_KEYS });
  }

  private async execute(request: CommandRequest): Promise<CommandResult> {
    const started = Date.now();
    try {
      return await this.#executor.execute(request);
    } catch (error) {
      return { status: "failed", exitCode: null, stdout: "", stderr: redactText(error instanceof Error ? error.message : "The privileged process did not start."), durationMs: Date.now() - started };
    } finally {
      if (request.signal?.aborted && this.#state.operation.status === "running") this.finishOperation("cancelled", "The privileged process was cancelled before completion.");
    }
  }

  private activeAccount(): ForgeAccount | undefined {
    return this.#state.accounts.find((account) => account.id === this.#state.activeAccountId && account.state === "available");
  }

  private async discoverGhAccounts(): Promise<ForgeActionResult<ReadonlyArray<ForgeAccount>>> {
    if (!this.beginOperation("account-discovery", "Reading the local provider sign-in store.")) return { status: "failed", message: "Another forge operation is already running." };
    const result = await this.gh(["auth", "status", "--hostname", GITHUB_HOST, "--json", "hosts"]);
    if (result.status !== "succeeded") {
      const receipt: ForgeAccountReceipt = {
        kind: "account",
        operation: "refresh",
        id: `forge-${Date.now().toString(36)}`,
        status: result.status === "cancelled" ? "cancelled" : "unavailable",
        provider: "github",
        accountId: this.#state.activeAccountId ?? "github.com:unknown",
        message: resultFromCommand(result, "Account discovery"),
        observedAt: this.#now().toISOString(),
        reauthAction: "add-account",
      };
      this.addReceipt(receipt);
      this.finishOperation(result.status === "cancelled" ? "cancelled" : "failed", receipt.message);
      return { status: receipt.status, message: receipt.message, receipt };
    }
    const accounts = parseGhAccounts(result.stdout, this.#now().toISOString());
    if (accounts.length === 0) {
      const message = "No signed-in GitHub account was found. Add an account through the provider sign-in flow; no token was accepted here.";
      this.addReceipt({ kind: "account", operation: "refresh", id: `forge-account-${Date.now().toString(36)}`, status: "reauth-required", provider: "github", accountId: "github.com:none", message, observedAt: this.#now().toISOString(), reauthAction: "add-account" });
      this.finishOperation("failed", message);
      return { status: "reauth-required", message, reauthAction: "add-account" } as ForgeActionResult<ReadonlyArray<ForgeAccount>>;
    }
    const previous = new Map(this.#state.accounts.map((account) => [account.id, account]));
    this.#state.accounts = accounts.map((account) => ({ ...previous.get(account.id), ...account }));
    const active = this.#state.accounts.find((account) => account.active && account.state === "available");
    this.#state.activeAccountId = active?.id ?? this.#state.activeAccountId;
    if (!this.#state.activeAccountId || !this.#state.accounts.some((account) => account.id === this.#state.activeAccountId)) this.#state.activeAccountId = this.#state.accounts[0]!.id;
    this.save();
    this.finishOperation("succeeded", `${accounts.length} signed-in GitHub account${accounts.length === 1 ? "" : "s"} discovered.`);
    return { status: "succeeded", message: `${accounts.length} signed-in GitHub account${accounts.length === 1 ? "" : "s"} discovered.`, data: this.#state.accounts };
  }

  async listAccounts(): Promise<ForgeActionResult<ReadonlyArray<ForgeAccount>>> {
    if (this.#state.operation.status === "running") return { status: "pending", message: this.#state.operation.message, data: this.#state.accounts };
    return await this.discoverGhAccounts();
  }

  private async completeDeviceFlow(deviceCode: string, userCode: string, verificationUri: string, expiresAt: string, initialInterval: number): Promise<void> {
    let accessToken = "";
    try {
      let interval = initialInterval;
      while (Date.now() < Date.parse(expiresAt)) {
        await this.waitForDevicePoll(interval * 1000);
        const token = await this.devicePost("https://github.com/login/oauth/access_token", new URLSearchParams({ client_id: this.#deviceClientId!, device_code: deviceCode, grant_type: "urn:ietf:params:oauth:grant-type:device_code" }), true);
        if (typeof token.access_token === "string" && token.access_token.length > 0) { accessToken = token.access_token; break; }
        const error = typeof token.error === "string" ? token.error : "";
        if (error === "authorization_pending") { this.updateOperation(Math.min(85, this.#state.operation.progress + 5), "Waiting for the provider approval."); continue; }
        if (error === "slow_down") { interval = Math.min(interval + 5, 30); continue; }
        if (error === "expired_token") throw new Error("The provider device code expired before approval.");
        if (error === "access_denied") throw new Error("The provider device sign-in was declined.");
        throw new Error("The provider returned an unexpected device sign-in state.");
      }
      if (!accessToken) throw new Error("The provider device code expired before approval.");
      const installed = await this.gh(["auth", "login", "--hostname", GITHUB_HOST, "--git-protocol", "https", "--with-token"], 30_000, false, accessToken, [accessToken]);
      if (installed.status !== "succeeded") throw new Error(resultFromCommand(installed, "Installing the provider credential"));
      const verified = await this.gh(["auth", "status", "--hostname", GITHUB_HOST, "--json", "hosts"]);
      const secureAccount = verified.status === "succeeded" ? parseGhAccounts(verified.stdout, this.#now().toISOString()).find((account) => account.active && account.credentialStorage === "keyring") : undefined;
      if (!secureAccount) throw new Error("gh did not confirm secure keyring storage for the newly installed credential. Plain-text fallback is refused.");
      this.#state.device = { status: "installed", userCode, verificationUri, expiresAt, message: "The provider credential was installed in gh's credential store. The credential value was not retained." };
      this.finishOperation("succeeded", this.#state.device.message);
      this.save();
    } catch (error) {
      const cancelled = this.#abortController?.signal.aborted || (error instanceof Error && /cancelled/iu.test(error.message));
      const status = cancelled ? "cancelled" : "failed";
      const message = cancelled ? "Device sign-in was cancelled. The approval code remains invalidated by the bounded flow." : error instanceof Error ? error.message : "Device sign-in did not complete.";
      const receipt: ForgeAccountReceipt = { kind: "account", operation: "sign-in", id: `forge-account-${Date.now().toString(36)}`, status, provider: "github", accountId: "github.com:device", message, observedAt: this.#now().toISOString(), reauthAction: "sign-in" };
      this.addReceipt(receipt);
      this.#state.device = { status, userCode, verificationUri, expiresAt, message };
      this.finishOperation(status, message);
      this.save();
    } finally {
      accessToken = "";
      this.#deviceCode = undefined;
      this.#deviceTask = undefined;
    }
  }

  async signIn(request: ForgeSignInRequest): Promise<ForgeActionResult<ReadonlyArray<ForgeAccount>>> {
    const provider = parseProvider(request.provider);
    const hostname = typeof request.hostname === "string" && request.hostname.trim() ? request.hostname.trim() : GITHUB_HOST;
    if (provider !== "github" || hostname !== GITHUB_HOST) return { status: "unavailable", message: "Device sign-in is currently available for github.com only.", reauthAction: "sign-in" };
    if (!this.#deviceClientId || !/^[A-Za-z0-9_-]{20,100}$/u.test(this.#deviceClientId)) return await this.startConPtyDeviceFlow();
    if (!this.beginOperation("sign-in", "Starting the provider device sign-in flow.")) return { status: "failed", message: "Another forge operation is already running." };
    try {
      const start = await this.devicePost("https://github.com/login/device/code", new URLSearchParams({ client_id: this.#deviceClientId, scope: "repo read:org" }));
      const deviceCode = typeof start.device_code === "string" ? start.device_code : "";
      const userCode = typeof start.user_code === "string" ? start.user_code : "";
      const verificationUri = typeof start.verification_uri === "string" ? start.verification_uri : typeof start.verification_uri_complete === "string" ? start.verification_uri_complete : "";
      const expiresIn = typeof start.expires_in === "number" && Number.isFinite(start.expires_in) ? Math.min(Math.max(start.expires_in, 60), 900) : 900;
      if (!deviceCode || !/^[A-Z0-9-]{4,64}$/iu.test(userCode) || !/^https:\/\/github\.com\//u.test(verificationUri)) throw new Error("The provider device response omitted a bounded user code or verification URL.");
      this.#deviceCode = deviceCode;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      this.#state.device = { status: "pending", userCode, verificationUri, expiresAt, message: "Open the verification URL and enter the displayed user code. This app will not open a browser automatically." };
      this.updateOperation(15, this.#state.device.message);
      this.save();
      const interval = typeof start.interval === "number" && Number.isFinite(start.interval) ? Math.min(Math.max(start.interval, 5), 30) : 5;
      this.#deviceTask = this.completeDeviceFlow(deviceCode, userCode, verificationUri, expiresAt, interval);
      return { status: "pending", message: this.#state.device.message, data: this.#state.accounts };
    } catch (error) {
      const cancelled = this.#abortController?.signal.aborted || (error instanceof Error && /cancelled/iu.test(error.message));
      const status = cancelled ? "cancelled" : "failed";
      const message = cancelled ? "Device sign-in was cancelled. The approval code remains invalidated by the bounded flow." : error instanceof Error ? error.message : "Device sign-in did not complete.";
      const receipt: ForgeAccountReceipt = { kind: "account", operation: "sign-in", id: `forge-account-${Date.now().toString(36)}`, status, provider: "github", accountId: "github.com:device", message, observedAt: this.#now().toISOString(), reauthAction: "sign-in" };
      this.addReceipt(receipt);
      this.#state.device = { status, userCode: this.#state.device?.userCode, verificationUri: this.#state.device?.verificationUri, expiresAt: this.#state.device?.expiresAt, message };
      this.finishOperation(status, message);
      return { status, message, receipt, reauthAction: "sign-in" };
    } finally {
      if (!this.#deviceTask) this.#deviceCode = undefined;
    }
  }

  async addAccount(request: ForgeAccountRequest): Promise<ForgeActionResult<ForgeAccount>> {
    const provider = parseProvider(request.provider);
    if (provider !== "github") return { status: "unavailable", message: PROVIDER_CAPABILITIES[provider].reason ?? "This provider is unavailable.", reauthAction: "add-account" };
    const login = parseLogin(request.login);
    const discovered = await this.discoverGhAccounts();
    const account = discovered.data?.find((candidate) => candidate.login === login);
    if (!account) return { status: "reauth-required", message: `Account ${login} is not signed in. Start the provider sign-in flow beside this control, then refresh the account list. No token was accepted or stored here.`, reauthAction: "add-account" };
    await this.record("created", `forge account ${login}`, { provider, accountId: account.id, tokenRef: account.tokenRef });
    const receipt = this.makeAccountReceipt("succeeded", "refresh", account, `Account ${login} is available to publish.`);
    this.addReceipt(receipt);
    return { status: "succeeded", message: receipt.message, data: account, receipt };
  }

  async refreshAccount(accountId: string): Promise<ForgeActionResult<ForgeAccount>> {
    const account = this.#state.accounts.find((candidate) => candidate.id === accountId);
    if (!account) return { status: "failed", message: "Choose an account from the discovered account list." };
    const discovered = await this.discoverGhAccounts();
    const refreshed = discovered.data?.find((candidate) => candidate.id === accountId);
    if (!refreshed) {
      const next = { ...account, state: "reauth-required" as const, lastSeenAt: this.#now().toISOString() };
      this.#state.accounts = this.#state.accounts.map((candidate) => candidate.id === accountId ? next : candidate);
      this.save();
      const receipt = this.makeAccountReceipt("reauth-required", "refresh", account, `Account ${account.login} needs sign-in again. No token was exposed or changed.`);
      this.addReceipt(receipt);
      return { status: "reauth-required", message: receipt.message, data: next, receipt, reauthAction: "refresh-account" };
    }
    await this.record("updated", `forge account ${account.login}`, { provider: account.provider, accountId, tokenRef: account.tokenRef, state: refreshed.state });
    const receipt = this.makeAccountReceipt("succeeded", "refresh", account, `Account ${account.login} was refreshed from the provider sign-in store.`);
    this.addReceipt(receipt);
    return { status: "succeeded", message: receipt.message, data: refreshed, receipt };
  }

  async activateAccount(accountId: string): Promise<ForgeActionResult<ForgeAccount>> {
    const account = this.#state.accounts.find((candidate) => candidate.id === accountId);
    if (!account) return { status: "failed", message: "Choose an account from the discovered account list." };
    const result = await this.gh(["auth", "switch", "--hostname", account.hostname, "--user", account.login]);
    if (result.status !== "succeeded") return { status: "reauth-required", message: resultFromCommand(result, `Activating ${account.login}`), reauthAction: "refresh-account" };
    const verified = await this.gh(["auth", "status", "--hostname", account.hostname, "--json", "hosts"]);
    const active = verified.status === "succeeded" ? parseGhAccounts(verified.stdout, this.#now().toISOString()).find((candidate) => candidate.login === account.login && candidate.active) : undefined;
    if (!active) return { status: "reauth-required", message: `The provider did not confirm ${account.login} as the active account. Re-authenticate beside this surface.`, reauthAction: "refresh-account" };
    this.#state.activeAccountId = account.id;
    this.save();
    await this.record("updated", `active forge account ${account.login}`, { accountId: account.id, tokenRef: account.tokenRef });
    const receipt = this.makeAccountReceipt("succeeded", "activate", account, `Account ${account.login} is active.`);
    this.addReceipt(receipt);
    return { status: "succeeded", message: receipt.message, data: account, receipt };
  }

  async signOut(accountId: string): Promise<ForgeActionResult<{ accountId: string }>> {
    const account = this.#state.accounts.find((candidate) => candidate.id === accountId);
    if (!account) return { status: "failed", message: "Choose an account from the discovered account list." };
    if (!this.beginOperation("account-discovery", `Signing out ${account.login} without an interactive confirmation.`)) return { status: "failed", message: "Another forge operation is already running." };
    const result = await this.gh(["auth", "logout", "--hostname", account.hostname, "--user", account.login], 30_000, true, "y\n");
    if (result.status !== "succeeded") {
      const status = receiptStatus(result, true);
      const receipt = this.makeAccountReceipt(status, "sign-out", account, `${resultFromCommand(result, `Signing out ${account.login}`)} The command may have had an unknown side effect. Logout removes local gh authentication only and does not revoke provider authorization.`);
      this.addReceipt(receipt);
      this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message);
      return { status, message: receipt.message, receipt };
    }
    const reread = await this.gh(["auth", "status", "--hostname", account.hostname, "--json", "hosts"]);
    const stillPresent = reread.status === "succeeded" && parseGhAccounts(reread.stdout, this.#now().toISOString()).some((candidate) => candidate.login === account.login && candidate.state === "available");
    if (reread.status !== "succeeded" || stillPresent) {
      const status = reread.status === "cancelled" || reread.status === "timedOut" ? "unknown-side-effect" : "partial";
      const receipt = this.makeAccountReceipt(status, "sign-out", account, `${reread.status === "succeeded" ? `The provider still reports ${account.login} as available.` : resultFromCommand(reread, "Re-reading account state after sign-out")} Logout removes local gh authentication only and does not revoke provider authorization.`);
      this.addReceipt(receipt); this.finishOperation("failed", receipt.message); return { status, message: receipt.message, receipt };
    }
    this.#state.accounts = this.#state.accounts.filter((candidate) => candidate.id !== accountId);
    if (this.#state.activeAccountId === accountId) this.#state.activeAccountId = this.#state.accounts[0]?.id;
    this.save();
    this.finishOperation("succeeded", `Account ${account.login} was signed out.`);
    const receipt = this.makeAccountReceipt("succeeded", "sign-out", account, `Account ${account.login} was signed out locally. Logout does not revoke provider authorization.`);
    this.addReceipt(receipt);
    await this.record("deleted", `forge account ${account.login}`, { provider: account.provider, accountId, tokenRef: account.tokenRef });
    return { status: "succeeded", message: receipt.message, data: { accountId }, receipt };
  }

  async listOwners(accountId?: string): Promise<ForgeActionResult<ReadonlyArray<ForgeOwner>>> {
    if (!this.beginOperation("owner-discovery", "Reading personal and organization owners from the active provider account.")) return { status: "failed", message: "Another forge operation is already running." };
    if (accountId && accountId !== this.#state.activeAccountId) {
      const activation = await this.activateAccount(accountId);
      if (activation.status !== "succeeded") { this.finishOperation("failed", activation.message); return { status: activation.status, message: activation.message, reauthAction: activation.reauthAction }; }
    }
    const account = this.activeAccount();
    if (!account) { const message = "Choose a signed-in account before loading personal and organization owners."; this.finishOperation("failed", message); return { status: "reauth-required", message, reauthAction: "add-account" }; }
    const confirmed = await this.activateAccount(account.id);
    if (confirmed.status !== "succeeded") { this.finishOperation("failed", confirmed.message); return { status: confirmed.status, message: confirmed.message, reauthAction: confirmed.reauthAction }; }
    const personal = await this.gh(["api", "user"]);
    if (personal.status !== "succeeded") { const message = resultFromCommand(personal, "Loading the personal owner"); this.finishOperation(personal.status === "cancelled" ? "cancelled" : "failed", message); return { status: personal.status === "cancelled" ? "cancelled" : "reauth-required", message, reauthAction: "refresh-account" }; }
    let personalRecord: Record<string, unknown>;
    try { personalRecord = JSON.parse(personal.stdout) as Record<string, unknown>; } catch { const message = "The provider returned invalid personal-owner data."; this.finishOperation("failed", message); return { status: "failed", message }; }
    const login = typeof personalRecord.login === "string" ? personalRecord.login : account.login;
    const name = typeof personalRecord.name === "string" ? personalRecord.name : login;
    this.#owners.clear();
    const owners: ForgeOwner[] = [accountOwner(account, "personal", login, name)];
    this.#owners.set(owners[0]!.id, owners[0]!);
    const organizations = await this.gh(["api", "user/orgs", "--paginate", "--slurp"]);
    if (organizations.status !== "succeeded") {
      const message = `${owners.length} personal owner loaded, but organization permissions were not available: ${resultFromCommand(organizations, "Loading organization owners")}`;
      this.finishOperation(organizations.status === "cancelled" ? "cancelled" : "failed", message);
      return { status: organizations.status === "cancelled" ? "cancelled" : "partial", message, data: owners };
    }
    if (organizations.status === "succeeded") {
      try {
        const pages = JSON.parse(organizations.stdout) as unknown;
        if (!Array.isArray(pages)) throw new Error("organization response was not a paginated array");
        const records = pages.flatMap((page) => Array.isArray(page) ? page : []);
        for (const record of records) {
          if (!record || typeof record !== "object" || Array.isArray(record)) continue;
          const org = record as Record<string, unknown>;
          if (typeof org.login !== "string" || !SAFE_LOGIN.test(org.login)) continue;
          const owner = accountOwner(account, "organization", org.login, org.login, false, "Organization repository creation is unknown until a provider operation proves it.", false);
          owners.push(owner);
          this.#owners.set(owner.id, owner);
        }
      } catch {
        const message = "The provider returned invalid organization-owner data."; this.finishOperation("failed", message); return { status: "failed", message };
      }
    }
    this.finishOperation("succeeded", `${owners.length} owner${owners.length === 1 ? "" : "s"} loaded from the active provider account.`);
    return { status: "succeeded", message: `${owners.length} owner${owners.length === 1 ? "" : "s"} loaded from the active provider account.`, data: owners };
  }

  async publish(request: ForgePublishRequest): Promise<ForgeActionResult<ForgeReceipt>> {
    const provider = parseProvider(request.provider);
    const route = parseRoute(request.route);
    if (provider !== "github") return { status: "unavailable", message: PROVIDER_CAPABILITIES[provider].reason ?? "This provider is unavailable." };
    const accountId = typeof request.accountId === "string" ? request.accountId : "";
    if (!SAFE_ACCOUNT_ID.test(accountId)) return { status: "failed", message: "Choose a signed-in account from the account list." };
    const account = this.#state.accounts.find((candidate) => candidate.id === accountId);
    if (!account) return { status: "reauth-required", message: "The chosen account is not in the local signed-in account list.", reauthAction: "add-account" };
    if (account.state !== "available") return { status: "reauth-required", message: `Account ${account.login} needs sign-in again before publishing.`, reauthAction: "refresh-account" };
    if (account.credentialStorage !== "keyring") return { status: "unavailable", message: "The provider account is not backed by gh's secure keyring. Plain-text credential fallback is refused; sign in again through the device flow." , reauthAction: "sign-in" };
    const ownerId = typeof request.ownerId === "string" ? request.ownerId : "";
    if (!SAFE_OWNER_ID.test(ownerId)) return { status: "failed", message: "Choose a personal or organization owner from the provider owner list." };
    const owner = this.#owners.get(ownerId);
    if (!owner || owner.accountId !== account.id) return { status: "failed", message: "The selected owner was not returned for the active account. Load owner data again before publishing." };
    if (route === "copy-and-push" && !owner.canCreateRepository) return { status: "unavailable", message: owner.capabilities.reason ?? "The provider did not report repository-create permission for this owner." };
    if (route === "fork" && !owner.canForkRepository) return { status: "unavailable", message: "The provider did not report fork permission for this organization owner." };
    const ownerLogin = ownerId.replace(/^github:(?:user|org):/u, "");
    const ownerKind: ForgeOwnerKind = ownerId.startsWith("github:org:") ? "organization" : "personal";
    const repositoryName = parseRepositoryName(request.repositoryName);
    const sourcePath = route === "copy-and-push" ? parseAbsolutePath(request.sourcePath) : undefined;
    const sourceRemote = route === "fork" ? parseHttpsRemote(request.sourceRemote) : undefined;
    const description = typeof request.description === "string" ? request.description.trim().slice(0, 500) : "";
    const visibility = parseVisibility(request.visibility);
    const defaultBranch = parseDefaultBranch(request.defaultBranch);
    const active = await this.activateAccount(account.id);
    if (active.status !== "succeeded") return { status: active.status, message: active.message, reauthAction: active.reauthAction };
    if (route === "fork" && !PROVIDER_CAPABILITIES.github.supportsFork) return { status: "unavailable", message: "The selected provider does not expose a fork route." };
    if (!this.beginOperation("publish", route === "fork" ? "Forking the source repository." : "Creating and pushing the destination repository.")) return { status: "failed", message: "Another forge operation is already running." };

    const observedAt = this.#now().toISOString();
    const repositoryUrl = `https://github.com/${ownerLogin}/${repositoryName}`;
    let sourceCommit: string | undefined;
    let effectivePushUrl = "";
    if (route === "copy-and-push") {
      const head = await this.git(["rev-parse", "HEAD"], sourcePath!);
      if (head.status !== "succeeded") {
        const status = head.status === "cancelled" ? "cancelled" : "failed";
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, undefined, resultFromCommand(head, "Reading the local source commit"), observedAt);
        this.addReceipt(receipt); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message); await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status, message: receipt.message, receipt, data: receipt };
      }
      sourceCommit = head.stdout.trim();
      if (!SAFE_COMMIT.test(sourceCommit)) {
        const receipt = this.makeReceipt("failed", account, ownerId, route, repositoryName, repositoryUrl, undefined, "The local source did not return a valid commit id.", observedAt);
        this.addReceipt(receipt); this.finishOperation("failed", receipt.message); return { status: "failed", message: receipt.message, receipt, data: receipt };
      }
      const create = await this.gh(["repo", "create", `${ownerLogin}/${repositoryName}`, visibility === "public" ? "--public" : "--private", ...(description ? ["--description", description] : [])]);
      if (create.status !== "succeeded") {
        const status = receiptStatus(create, true);
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, resultFromCommand(create, "Creating the destination repository"), observedAt);
        this.addReceipt(receipt); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message); await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status, message: receipt.message, receipt, data: receipt };
      }
      const identity = await this.verifyDestinationIdentity(ownerLogin, repositoryName, repositoryUrl);
      if (!identity.ok) {
        const receipt = this.makeReceipt(identity.status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, identity.message, observedAt);
        this.addReceipt(receipt); this.finishOperation(identity.status === "cancelled" ? "cancelled" : "failed", receipt.message); await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status: identity.status, message: receipt.message, receipt, data: receipt };
      }
      const remote = await this.git(["remote", "get-url", "--push", "forge-publish"], sourcePath!);
      const pushUrls = remote.status === "succeeded" ? remote.stdout.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean) : [];
      if (pushUrls.length > 1) {
        const receipt = this.makeReceipt("failed", account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, "The forge-publish remote has more than one push URL, so the destination cannot be proved uniquely.", observedAt);
        this.addReceipt(receipt); this.finishOperation("failed", receipt.message); return { status: "failed", message: receipt.message, receipt, data: receipt };
      }
      effectivePushUrl = pushUrls[0] ?? "";
      if (!effectivePushUrl) {
        const fetchRemote = await this.git(["remote", "get-url", "forge-publish"], sourcePath!);
        const fetchUrls = fetchRemote.status === "succeeded" ? fetchRemote.stdout.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean) : [];
        if (fetchUrls.length > 1) {
          const receipt = this.makeReceipt("failed", account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, "The forge-publish remote has more than one effective URL, so the destination cannot be proved uniquely.", observedAt);
          this.addReceipt(receipt); this.finishOperation("failed", receipt.message); return { status: "failed", message: receipt.message, receipt, data: receipt };
        }
        effectivePushUrl = fetchUrls[0] ?? "";
      }
      if (!effectivePushUrl) {
        const add = await this.git(["remote", "add", "forge-publish", repositoryUrl], sourcePath!);
        if (add.status !== "succeeded") {
          const status = add.status === "cancelled" ? "cancelled" : "partial";
          const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, resultFromCommand(add, "Adding the destination remote"), observedAt);
          this.addReceipt(receipt); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message); await this.record("updated", `forge publication ${repositoryName}`, receipt);
          return { status, message: receipt.message, receipt, data: receipt };
        }
      } else if (effectivePushUrl !== repositoryUrl && effectivePushUrl !== `${repositoryUrl}.git`) {
        const receipt = this.makeReceipt("failed", account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, "The local forge-publish remote already points somewhere else, so it was not changed.", observedAt);
        this.addReceipt(receipt); this.finishOperation("failed", receipt.message); return { status: "failed", message: receipt.message, receipt, data: receipt };
      }
      const pushed = await this.git(["push", "forge-publish", `HEAD:${defaultBranch}`], sourcePath!, 120_000);
      if (pushed.status !== "succeeded") {
        const status = pushed.status === "cancelled" ? "cancelled" : "partial";
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, resultFromCommand(pushed, "Pushing the local source"), observedAt);
        receipt.effectivePushUrl = effectivePushUrl;
        this.addReceipt(receipt); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message);
        await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status, message: receipt.message, receipt, data: receipt };
      }
      const verified = await this.git(["ls-remote", "--heads", effectivePushUrl, defaultBranch], sourcePath!, 30_000);
      const verifiedCommit = verified.status === "succeeded" ? /^([0-9a-f]{40})\s+refs\/heads\//iu.exec(verified.stdout.trim())?.[1] : undefined;
      if (verifiedCommit !== sourceCommit) {
        const status = verified.status === "cancelled" ? "cancelled" : "partial";
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, verified.status === "succeeded" ? `The destination answered with ${verifiedCommit ?? "no matching commit"}, not ${sourceCommit}.` : resultFromCommand(verified, "Verifying the destination commit"), observedAt);
        receipt.effectivePushUrl = effectivePushUrl;
        this.addReceipt(receipt); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message); await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status, message: receipt.message, receipt, data: receipt };
      }
    } else {
      const args = ["repo", "fork", sourceRemote!, "--remote=false", "--fork-name", repositoryName];
      if (ownerKind === "organization") args.push("--org", ownerLogin);
      const fork = await this.gh(args, 120_000);
      if (fork.status !== "succeeded") {
        const status = receiptStatus(fork, true);
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, undefined, resultFromCommand(fork, "Forking the source repository"), observedAt);
        this.addReceipt(receipt); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message); return { status, message: receipt.message, receipt, data: receipt };
      }
      const identity = await this.verifyDestinationIdentity(ownerLogin, repositoryName, repositoryUrl);
      if (!identity.ok) {
        const receipt = this.makeReceipt(identity.status, account, ownerId, route, repositoryName, repositoryUrl, undefined, identity.message, observedAt);
        this.addReceipt(receipt); this.finishOperation(identity.status === "cancelled" ? "cancelled" : "failed", receipt.message); return { status: identity.status, message: receipt.message, receipt, data: receipt };
      }
    }
    const receipt = this.makeReceipt("succeeded", account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, route === "fork" ? "The provider confirmed the fork request." : `The destination accepted commit ${sourceCommit}.`, observedAt);
    if (route === "copy-and-push") receipt.effectivePushUrl = effectivePushUrl;
    this.addReceipt(receipt);
    this.finishOperation("succeeded", receipt.message);
    await this.record("created", `forge publication ${repositoryName}`, receipt);
    return { status: "succeeded", message: receipt.message, receipt, data: receipt };
  }

  private makeReceipt(status: ForgeReceiptStatus, account: ForgeAccount, ownerId: string, route: ForgePublishRoute, repositoryName: string, repositoryUrl: string | undefined, sourceCommit: string | undefined, message: string, observedAt: string): ForgePublicationReceipt {
    return { kind: "publication", id: `forge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, status, provider: account.provider, accountId: account.id, ownerId, route, repositoryName, repositoryUrl, sourceCommit, message, observedAt };
  }

  private makeAccountReceipt(status: ForgeReceiptStatus, operation: ForgeAccountReceipt["operation"], account: ForgeAccount, message: string): ForgeAccountReceipt {
    return { kind: "account", operation, id: `forge-account-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, status, provider: account.provider, accountId: account.id, message, observedAt: this.#now().toISOString() };
  }
}
