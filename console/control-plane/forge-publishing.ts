import { existsSync, readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import type { LocalHistory, LocalHistoryEntry } from "./local-history.js";
import type { CommandRequest, CommandResult, ProcessExecutor } from "./executor.js";
import { redactText } from "./redaction.js";
import { atomicWriteFileSync } from "./atomic-file.js";
import { FORGE_CONPTY_HELPER_SHA256, FORGE_GH_SHA256 } from "./generated-forge-digests.js";

export const FORGE_SCHEMA_VERSION = 1 as const;
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
  localRemoteState?: "pre-existing" | "added-and-rolled-back" | "retained-after-failure";
  recoveryAction?: string;
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
  status: "idle" | "pending" | "installed" | "failed" | "cancelled" | "unknown-side-effect";
  userCode?: string;
  verificationUri?: string;
  expiresAt?: string;
  exitCode?: number;
  credentialRotation?: "new-account" | "same-account-keyring";
  sessionId?: string;
  operationId?: string;
  revision?: number;
  corruption?: string;
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
  readonly #now: () => Date;

  constructor(path: string, now: () => Date = () => new Date()) {
    this.#path = path;
    this.#now = now;
  }

  read(): ForgeState | undefined {
    if (!existsSync(this.#path)) return undefined;
    try {
      const parsed = JSON.parse(readFileSync(this.#path, "utf8")) as unknown;
      return parseForgeState(parsed, this.#now);
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
const APPROVED_PUBLIC_DEVICE_CLIENT_IDS = new Set<string>();
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

function parseForgeState(value: unknown, now: () => Date = () => new Date()): ForgeState {
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
  const interrupted = wasInterrupted ? [{ kind: "interrupted" as const, operation: storedOperation.kind, id: `forge-interrupted-${storedOperation.id}`, status: "unknown-side-effect" as const, provider: "github" as const, accountId: activeAccountId ?? "github.com:unknown", message: `The ${storedOperation.kind} operation stopped before its external outcome was known. Re-read the provider and local checkout before retrying.`, observedAt: now().toISOString() }] : [];
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
    && (record.localRemoteState === undefined || record.localRemoteState === "pre-existing" || record.localRemoteState === "added-and-rolled-back" || record.localRemoteState === "retained-after-failure")
    && (record.recoveryAction === undefined || (typeof record.recoveryAction === "string" && record.recoveryAction.length <= 500))
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
  let validVerificationUri = true;
  if (record.verificationUri !== undefined) {
    try { parseDeviceVerificationUri(record.verificationUri); } catch { validVerificationUri = false; }
  }
  return ["idle", "pending", "installed", "failed", "cancelled", "unknown-side-effect"].includes(String(record.status))
    && typeof record.message === "string" && record.message.length <= 2000
    && (record.userCode === undefined || (typeof record.userCode === "string" && /^[A-Z0-9 -]{4,32}$/u.test(record.userCode)))
    && validVerificationUri
    && (record.expiresAt === undefined || typeof record.expiresAt === "string")
    && (record.exitCode === undefined || (typeof record.exitCode === "number" && Number.isInteger(record.exitCode) && record.exitCode >= -1 && record.exitCode <= 255))
    && (record.credentialRotation === undefined || record.credentialRotation === "new-account" || record.credentialRotation === "same-account-keyring");
}

function parseDeviceVerificationUri(value: unknown): string {
  if (typeof value !== "string") throw new Error("The provider device response omitted a verification URL.");
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("The provider device response returned an invalid verification URL."); }
  if (parsed.protocol !== "https:" || parsed.hostname !== GITHUB_HOST || parsed.pathname !== "/login/device" || parsed.hash) throw new Error("The provider device response returned an unexpected verification URL.");
  return parsed.href;
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
    const credentialStorage = record.tokenSource === "keyring" ? "keyring" as const : record.tokenSource === "plaintext" ? "plaintext-refused" as const : "unknown" as const;
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

function hasGithubAuthInventory(stdout: string): boolean {
  try {
    const parsed = JSON.parse(stdout) as unknown;
    const hosts = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>).hosts : undefined;
    return !!hosts && typeof hosts === "object" && !Array.isArray(hosts) && Array.isArray((hosts as Record<string, unknown>)[GITHUB_HOST]);
  } catch {
    return false;
  }
}

function resultFromCommand(result: CommandResult, action: string): string {
  if (result.status === "timedOut") return `${action} timed out before the provider confirmed an outcome.`;
  if (result.status === "cancelled") return `${action} was cancelled before the provider confirmed an outcome.`;
  return result.stderr.trim() || `${action} did not complete.`;
}

function receiptStatus(result: CommandResult, unknownSideEffect = false): ForgeReceiptStatus {
  if (unknownSideEffect && (result.status === "timedOut" || result.status === "cancelled")) return "unknown-side-effect";
  if (result.status === "cancelled") return "cancelled";
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
  #deviceSessionId: string | undefined;
  #conptyRevision = 0;
  #lastConPtyState: Record<string, unknown> | undefined;
  #signInBaselineAccountIds = new Set<string>();
  #signInBaselineCredentialStates = new Map<string, string>();

  constructor(options: ForgePublisherOptions) {
    this.#executor = options.executor;
    this.#store = options.store;
    this.#history = options.history;
    this.#now = options.now ?? (() => new Date());
    this.#deviceClientId = options.deviceClientId && APPROVED_PUBLIC_DEVICE_CLIENT_IDS.has(options.deviceClientId) ? options.deviceClientId : undefined;
    this.#fetch = options.fetchImpl ?? fetch;
    this.#conptyHelperPath = options.conptyHelperPath;
    this.#conptyStatePath = options.conptyStatePath;
    this.#bundledGhPath = options.bundledGhPath;
    this.#bundledGhSha256 = options.bundledGhSha256;
    this.#conptyHelperSha256 = options.conptyHelperSha256;
    const saved = options.store.read();
    this.#state = saved ?? defaultState();
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

  private addReceipt(receipt: ForgeReceipt, expectedOperationId?: string, expectedSessionId?: string): void {
    if (expectedOperationId && (this.#state.operation.id !== expectedOperationId || (expectedSessionId && this.#state.device?.sessionId !== expectedSessionId))) return;
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

  private finishOperation(status: ForgeOperation["status"], message: string, expectedOperationId?: string): void {
    if (expectedOperationId && this.#state.operation.id !== expectedOperationId) return;
    this.#state.operation = { ...this.#state.operation, status, progress: status === "succeeded" ? 100 : this.#state.operation.progress, message, cancellable: false };
    this.#abortController = undefined;
    this.save();
  }

  cancel(): ForgeActionResult<ForgeOperation> {
    if (this.#state.operation.status !== "running" || !this.#abortController) return { status: "failed", message: "No cancellable forge operation is running." };
    this.#abortController.abort();
    if (this.#conptySessionId && this.#conptyHelperPath && this.#conptyStatePath) void this.execute({ executable: "powershell.exe", args: ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", this.#conptyHelperPath, "-Mode", "cancel", "-StatePath", this.#conptyStatePath, "-GhPath", this.#bundledGhPath ?? "", "-SessionId", this.#conptySessionId, "-OperationId", this.#state.operation.id], timeoutMs: 10_000, maxOutputBytes: 16 * 1024, clearEnvironmentKeys: AUTH_ENVIRONMENT_KEYS });
    this.finishOperation("cancelled", "The forge operation was cancelled before completion.");
    return { status: "cancelled", message: this.#state.operation.message, data: this.#state.operation };
  }

  private async gh(args: ReadonlyArray<string>, timeoutMs = 30_000, interactive = false, input?: string, redactedValues?: ReadonlyArray<string>, controller = this.#abortController, expectedOperationId = this.#state.operation.id): Promise<CommandResult> {
    const operationId = expectedOperationId;
    if (!this.isCurrentOperationIdentity(operationId)) return { status: "cancelled", exitCode: null, stdout: "", stderr: "The forge command belongs to a stale operation.", durationMs: 0 };
    this.updateOperation(Math.max(5, this.#state.operation.progress), interactive ? "Waiting for the provider device sign-in flow." : "Running the provider command.");
    const result = await this.execute({ executable: "gh", args, input, redactedValues, timeoutMs, maxOutputBytes: 4 * 1024 * 1024, signal: controller?.signal, environment: { GH_HOST: GITHUB_HOST, GH_PROMPT_DISABLED: interactive ? "0" : "1" }, clearEnvironmentKeys: AUTH_ENVIRONMENT_KEYS }, operationId);
    if (!this.isCurrentOperation(operationId)) return result;
    this.updateOperation(result.status === "succeeded" ? Math.min(95, this.#state.operation.progress + 20) : this.#state.operation.progress, result.status === "succeeded" ? "Provider command returned." : result.status === "cancelled" ? "Provider command cancelled." : "Provider command returned a failure.");
    return result;
  }

  private async devicePost(url: string, body: URLSearchParams, allowError = false, controller?: AbortController): Promise<Record<string, unknown>> {
    const requestController = new AbortController();
    const timeout = setTimeout(() => requestController.abort(), 15_000);
    const outerSignal = controller?.signal ?? this.#abortController?.signal;
    const parentAbort = () => requestController.abort();
    outerSignal?.addEventListener("abort", parentAbort, { once: true });
    try {
      const response = await this.#fetch(url, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(), signal: requestController.signal, redirect: "error" });
      const text = await response.text();
      if (text.length > 64 * 1024) throw new Error("The provider device response exceeded the bounded response size.");
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { throw new Error("The provider device response was not valid JSON."); }
      if ((!response.ok && !allowError) || !parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`The provider device request returned HTTP ${response.status}.`);
      return parsed as Record<string, unknown>;
    } catch (error) {
      if (requestController.signal.aborted) throw new Error(outerSignal?.aborted ? "Device sign-in was cancelled." : "The provider device request timed out.");
      throw error;
    } finally {
      clearTimeout(timeout);
      outerSignal?.removeEventListener("abort", parentAbort);
    }
  }

  private async waitForDevicePoll(ms: number, signal = this.#abortController?.signal): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, ms);
      const abort = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); reject(new Error("Device sign-in was cancelled.")); };
      signal?.addEventListener("abort", abort, { once: true });
    });
  }

  private isCurrentDeviceFlow(sessionId: string, operationId: string): boolean {
    return this.#state.operation.id === operationId && this.#state.operation.status === "running" && this.#state.device?.sessionId === sessionId && this.#state.device?.operationId === operationId;
  }

  private isCurrentOperation(operationId: string): boolean {
    return this.#state.operation.id === operationId && this.#state.operation.status === "running";
  }

  private isCurrentOperationIdentity(operationId: string): boolean {
    return this.#state.operation.id === operationId;
  }

  private fileSha256(path: string): string {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  }

  private readConPtyState(sessionId: string, operationId: string): Record<string, unknown> | undefined {
    if (!this.#conptyStatePath || !existsSync(this.#conptyStatePath)) return undefined;
    try {
      const text = readFileSync(this.#conptyStatePath, "utf8");
      if (text.length > 64 * 1024) return { status: "corrupt", corruption: "The ConPTY state exceeded the bounded size." };
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { status: "corrupt", corruption: "The ConPTY state had an invalid shape." };
      const state = parsed as Record<string, unknown>;
      if (state.sessionId !== sessionId || state.operationId !== operationId) return undefined;
      const revision = typeof state.revision === "number" && Number.isSafeInteger(state.revision) ? state.revision : 0;
      if (revision <= this.#conptyRevision) return undefined;
      this.#conptyRevision = revision;
      this.#lastConPtyState = state;
      return state;
    } catch { return { status: "corrupt", corruption: "The ConPTY state was not valid JSON." }; }
  }

  private async startConPtyDeviceFlow(): Promise<ForgeActionResult<ReadonlyArray<ForgeAccount>>> {
    if (!this.#conptyHelperPath || !this.#conptyStatePath || !this.#bundledGhPath || !this.#bundledGhSha256 || !this.#conptyHelperSha256) return { status: "unavailable", message: "The packaged ConPTY helper contract is incomplete. Device sign-in remains unavailable until gh.exe and the helper are bundled with verified digests.", reauthAction: "sign-in" };
    if (this.fileSha256(this.#bundledGhPath) !== this.#bundledGhSha256) return { status: "unavailable", message: "The packaged gh executable digest does not match the approved manifest. Device sign-in is refused.", reauthAction: "sign-in" };
    if (this.fileSha256(this.#conptyHelperPath) !== this.#conptyHelperSha256) return { status: "unavailable", message: "The packaged ConPTY helper digest does not match the approved manifest. Device sign-in is refused.", reauthAction: "sign-in" };
    if (!this.beginOperation("sign-in", "Starting gh's bundled ConPTY device sign-in flow.")) return { status: "failed", message: "Another forge operation is already running." };
    this.#signInBaselineAccountIds = new Set(this.#state.accounts.map((account) => account.id));
    this.#signInBaselineCredentialStates = new Map(this.#state.accounts.map((account) => [account.id, `${account.state}:${account.credentialStorage}`]));
    this.#deviceSessionId = undefined;
    this.#conptyRevision = 0;
    this.#lastConPtyState = undefined;
    const expiresAt = new Date(this.#now().getTime() + 300_000).toISOString();
    const operationId = this.#state.operation.id;
    const result = await this.execute({ executable: "powershell.exe", args: ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", this.#conptyHelperPath, "-Mode", "start", "-StatePath", this.#conptyStatePath, "-GhPath", this.#bundledGhPath, "-OperationId", operationId, "-ExpiresAt", expiresAt], timeoutMs: 30_000, maxOutputBytes: 16 * 1024, environment: { DING_FORGE_GH_SHA256: this.#bundledGhSha256 }, clearEnvironmentKeys: AUTH_ENVIRONMENT_KEYS });
    if (!this.isCurrentOperation(operationId)) return { status: result.status === "cancelled" ? "cancelled" : "failed", message: "The ConPTY sign-in result was stale and was not applied.", reauthAction: "sign-in" };
    const sessionId = result.status === "succeeded" ? result.stdout.trim().split(/\r?\n/u).filter(Boolean).pop() : undefined;
    if (!sessionId || !/^[0-9a-f]{32}$/iu.test(sessionId)) {
      const status = result.status === "cancelled" ? "cancelled" : "failed";
      const receipt: ForgeAccountReceipt = { kind: "account", operation: "sign-in", id: `forge-account-${Date.now().toString(36)}`, status, provider: "github", accountId: "github.com:conpty", message: resultFromCommand(result, "Starting the bundled ConPTY device flow"), observedAt: this.#now().toISOString(), reauthAction: "sign-in" };
      this.addReceipt(receipt, operationId); this.finishOperation(status, receipt.message, operationId); return { status, message: receipt.message, receipt, reauthAction: "sign-in" };
    }
    this.#conptySessionId = sessionId;
    this.#state.device = { status: "pending", operationId, expiresAt, sessionId, revision: 0, message: "The bundled gh ConPTY helper is running. The user code and verification URL will appear here." };
    this.updateOperation(10, this.#state.device.message); this.save();
    this.#deviceTask = this.completeConPtyDeviceFlow(sessionId, operationId, expiresAt, this.#abortController!);
    return { status: "pending", message: this.#state.device.message, data: this.#state.accounts };
  }

  private async completeConPtyDeviceFlow(sessionId: string, operationId: string, expiresAt: string, controller: AbortController): Promise<void> {
    try {
      const deadline = Date.parse(expiresAt);
      while (this.#now().getTime() < deadline) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 500);
          const abort = () => { clearTimeout(timer); controller.signal.removeEventListener("abort", abort); reject(new Error("Device sign-in was cancelled.")); };
          if (controller.signal.aborted) { abort(); return; }
          controller.signal.addEventListener("abort", abort, { once: true });
        });
        if (!this.isCurrentDeviceFlow(sessionId, operationId)) return;
        const state = this.readConPtyState(sessionId, operationId);
        if (state) {
          const stateStatus: ForgeDeviceState["status"] = state.status === "completed" ? "installed" : state.status === "cancelled" ? "cancelled" : state.status === "unknown-side-effect" ? "unknown-side-effect" : state.status === "failed" ? "failed" : state.status === "corrupt" ? "unknown-side-effect" : "pending";
          if (!this.isCurrentDeviceFlow(sessionId, operationId)) return;
          this.#state.device = { status: stateStatus, sessionId, operationId, revision: typeof state.revision === "number" ? state.revision : this.#conptyRevision, expiresAt, exitCode: typeof state.exitCode === "number" ? state.exitCode : undefined, corruption: typeof state.corruption === "string" ? state.corruption : undefined, userCode: typeof state.userCode === "string" ? state.userCode : undefined, verificationUri: typeof state.verificationUri === "string" ? state.verificationUri : undefined, message: typeof state.message === "string" ? state.message : "The ConPTY device flow is running." };
          this.updateOperation(Math.min(90, this.#state.operation.progress + 2), this.#state.device.message); this.save();
          if (["completed", "failed", "cancelled", "unknown-side-effect", "corrupt"].includes(String(state.status))) break;
        }
      }
      if (!this.isCurrentDeviceFlow(sessionId, operationId)) return;
      const state = this.readConPtyState(sessionId, operationId) ?? this.#lastConPtyState;
      if (!state || state.status === "pending" || state.status === "starting") throw new Error("The bundled ConPTY device flow timed out with unknown external outcome.");
      if (state.status === "corrupt") throw new Error(typeof state.corruption === "string" ? state.corruption : "The ConPTY state could not be read without corruption.");
      if (state.status !== "completed") throw new Error(typeof state.message === "string" ? state.message : "The bundled ConPTY device flow did not complete.");
      const verified = await this.gh(["auth", "status", "--hostname", GITHUB_HOST, "--json", "hosts"]);
      if (!this.isCurrentDeviceFlow(sessionId, operationId)) return;
      if (verified.status === "timedOut") throw new Error("Credential verification timed out before the provider confirmed an outcome; external credential side effect is unknown.");
      const discovered = verified.status === "succeeded" ? parseGhAccounts(verified.stdout, this.#now().toISOString()) : [];
      const secureAccount = discovered.find((account) => account.active && account.credentialStorage === "keyring" && (!this.#signInBaselineAccountIds.has(account.id) || this.#signInBaselineCredentialStates.get(account.id) !== `${account.state}:${account.credentialStorage}`));
      if (!secureAccount) throw new Error("gh did not confirm a newly installed secure keyring account after ConPTY sign-in. Plain-text fallback and pre-existing accounts are refused.");
      const identity = await this.gh(["api", "user", "--hostname", GITHUB_HOST]);
      if (!this.isCurrentDeviceFlow(sessionId, operationId)) return;
      if (identity.status === "timedOut") throw new Error("Post-login identity verification timed out; external credential side effect is unknown.");
      let identityRecord: Record<string, unknown>;
      try { identityRecord = JSON.parse(identity.stdout) as Record<string, unknown>; } catch { throw new Error("The provider returned invalid post-login identity data."); }
      if (identity.status !== "succeeded" || identityRecord.login !== secureAccount.login) throw new Error("The provider did not confirm the same post-login account identity. Credential rotation is unproven.");
      const credentialRotation = this.#signInBaselineAccountIds.has(secureAccount.id) ? "same-account-keyring" as const : "new-account" as const;
      this.#state.accounts = discovered;
      this.#state.activeAccountId = secureAccount.id;
      this.#state.device = { ...this.#state.device, status: "installed", credentialRotation, message: credentialRotation === "same-account-keyring" ? "gh completed the device flow and the provider confirmed the same account identity with changed keyring state." : "gh completed the device flow and confirmed the newly installed account in keyring storage." };
      this.finishOperation("succeeded", this.#state.device.message, operationId); this.save();
    } catch (error) {
      const cancelled = controller.signal.aborted || (error instanceof Error && /cancelled/iu.test(error.message));
      if (!this.isCurrentDeviceFlow(sessionId, operationId)) return;
      const status = cancelled ? "cancelled" : /unknown external outcome|timed out|corrupt/iu.test(error instanceof Error ? error.message : "") ? "unknown-side-effect" : "failed";
      const message = error instanceof Error ? error.message : "The bundled ConPTY device flow did not complete.";
      const receipt: ForgeAccountReceipt = { kind: "account", operation: "sign-in", id: `forge-account-${Date.now().toString(36)}`, status, provider: "github", accountId: "github.com:conpty", message, observedAt: this.#now().toISOString(), reauthAction: "sign-in" };
      this.addReceipt(receipt, operationId, sessionId); this.#state.device = { ...this.#state.device, status: status === "cancelled" ? "cancelled" : status === "unknown-side-effect" ? "unknown-side-effect" : "failed", message }; this.finishOperation(status === "cancelled" ? "cancelled" : "failed", message, operationId); this.save();
    } finally { if (this.#conptySessionId === sessionId && this.#state.operation.id === operationId) { this.#conptySessionId = undefined; this.#deviceTask = undefined; this.#signInBaselineAccountIds.clear(); this.#signInBaselineCredentialStates.clear(); this.#lastConPtyState = undefined; } }
  }

  private async verifyDestinationIdentity(ownerLogin: string, repositoryName: string, expectedUrl: string, controller = this.#abortController, operationId = this.#state.operation.id): Promise<{ ok: boolean; status: ForgeReceiptStatus; message: string }> {
    const result = await this.gh(["repo", "view", `${ownerLogin}/${repositoryName}`, "--json", "nameWithOwner,url"], 30_000, false, undefined, undefined, controller, operationId);
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

  private async git(args: ReadonlyArray<string>, cwd: string, timeoutMs = 60_000, controller = this.#abortController, mutateOperation = true, expectedOperationId = this.#state.operation.id): Promise<CommandResult> {
    const operationId = mutateOperation ? expectedOperationId : undefined;
    if (mutateOperation && !this.isCurrentOperationIdentity(operationId!)) return { status: "cancelled", exitCode: null, stdout: "", stderr: "The git command belongs to a stale operation.", durationMs: 0 };
    if (mutateOperation) this.updateOperation(Math.max(5, this.#state.operation.progress), "Running the local git command.");
    const result = await this.execute({ executable: "git", args, cwd, timeoutMs, maxOutputBytes: 4 * 1024 * 1024, signal: controller?.signal, environment: { GIT_TERMINAL_PROMPT: "0" }, clearEnvironmentKeys: AUTH_ENVIRONMENT_KEYS }, operationId ?? null);
    return !mutateOperation || (!!operationId && this.isCurrentOperation(operationId)) ? result : { ...result, status: "cancelled" };
  }

  private async rollbackPublicationRemote(cwd: string, operationId: string, expectedUrl: string, addedForgeRemote: boolean, changedExistingPushUrl: boolean): Promise<{ state: ForgePublicationReceipt["localRemoteState"]; recoveryAction: string }> {
    if (!this.isCurrentOperationIdentity(operationId)) return { state: "retained-after-failure", recoveryAction: "The forge-publish remote was retained because this outcome belongs to an older operation. Review its effective URL before retrying." };
    const cleanupController = new AbortController();
    const timer = setTimeout(() => cleanupController.abort(), 30_000);
    try {
      const current = await this.git(["remote", "get-url", "--push", "forge-publish"], cwd, 30_000, cleanupController, false);
      const urls = current.status === "succeeded" ? current.stdout.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean) : [];
      const matches = urls.length === 1 && (urls[0] === expectedUrl || urls[0] === `${expectedUrl}.git`);
      if (!matches) return { state: "retained-after-failure", recoveryAction: "The forge-publish remote was retained because its current effective URL was not the URL created by this operation." };
      const restored = addedForgeRemote
        ? await this.git(["remote", "remove", "forge-publish"], cwd, 30_000, cleanupController, false)
        : changedExistingPushUrl
          ? await this.git(["config", "--unset-all", "remote.forge-publish.pushurl"], cwd, 30_000, cleanupController, false)
          : { status: "succeeded" as const };
      if (restored.status === "succeeded") return { state: addedForgeRemote ? "added-and-rolled-back" : "pre-existing", recoveryAction: addedForgeRemote ? "The forge-publish remote was added by this attempt and was removed after the publication outcome became non-successful." : "The pre-existing forge-publish push URL mutation was reverted after the publication outcome became non-successful." };
      return { state: "retained-after-failure", recoveryAction: "The forge-publish remote was retained because rollback did not complete. Review its effective URL before retrying; no local configuration was silently discarded." };
    } finally {
      clearTimeout(timer);
    }
  }

  private async execute(request: CommandRequest, expectedOperationId: string | null = this.#state.operation.id): Promise<CommandResult> {
    const started = Date.now();
    try {
      return await this.#executor.execute(request);
    } catch (error) {
      return { status: "failed", exitCode: null, stdout: "", stderr: redactText(error instanceof Error ? error.message : "The privileged process did not start."), durationMs: Date.now() - started };
    } finally {
      if (expectedOperationId && request.signal?.aborted && this.#state.operation.id === expectedOperationId && this.#state.operation.status === "running") this.finishOperation("cancelled", "The privileged process was cancelled before completion.", expectedOperationId);
    }
  }

  private activeAccount(): ForgeAccount | undefined {
    return this.#state.accounts.find((account) => account.id === this.#state.activeAccountId && account.state === "available");
  }

  private async discoverGhAccounts(): Promise<ForgeActionResult<ReadonlyArray<ForgeAccount>>> {
    if (!this.beginOperation("account-discovery", "Reading the local provider sign-in store.")) return { status: "failed", message: "Another forge operation is already running." };
    const operationId = this.#state.operation.id;
    const result = await this.gh(["auth", "status", "--hostname", GITHUB_HOST, "--json", "hosts"]);
    if (!this.isCurrentOperation(operationId)) return { status: "cancelled", message: "The account discovery result was stale and was not applied." };
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
      this.addReceipt(receipt, operationId);
      this.finishOperation(result.status === "cancelled" ? "cancelled" : "failed", receipt.message, operationId);
      return { status: receipt.status, message: receipt.message, receipt };
    }
    const accounts = parseGhAccounts(result.stdout, this.#now().toISOString());
    if (accounts.length === 0) {
      const message = "No signed-in GitHub account was found. Add an account through the provider sign-in flow; no token was accepted here.";
      this.addReceipt({ kind: "account", operation: "refresh", id: `forge-account-${Date.now().toString(36)}`, status: "reauth-required", provider: "github", accountId: "github.com:none", message, observedAt: this.#now().toISOString(), reauthAction: "add-account" }, operationId);
      this.finishOperation("failed", message, operationId);
      return { status: "reauth-required", message, reauthAction: "add-account" } as ForgeActionResult<ReadonlyArray<ForgeAccount>>;
    }
    const previous = new Map(this.#state.accounts.map((account) => [account.id, account]));
    this.#state.accounts = accounts.map((account) => ({ ...previous.get(account.id), ...account }));
    const active = this.#state.accounts.find((account) => account.active && account.state === "available");
    this.#state.activeAccountId = active?.id ?? this.#state.activeAccountId;
    if (!this.#state.activeAccountId || !this.#state.accounts.some((account) => account.id === this.#state.activeAccountId)) this.#state.activeAccountId = this.#state.accounts[0]!.id;
    if (!this.isCurrentOperation(operationId)) return { status: "cancelled", message: "The account discovery result was stale and was not applied." };
    this.save();
    this.finishOperation("succeeded", `${accounts.length} signed-in GitHub account${accounts.length === 1 ? "" : "s"} discovered.`, operationId);
    return { status: "succeeded", message: `${accounts.length} signed-in GitHub account${accounts.length === 1 ? "" : "s"} discovered.`, data: this.#state.accounts };
  }

  async listAccounts(): Promise<ForgeActionResult<ReadonlyArray<ForgeAccount>>> {
    if (this.#state.operation.status === "running") return { status: "pending", message: this.#state.operation.message, data: this.#state.accounts };
    return await this.discoverGhAccounts();
  }

  private async completeDeviceFlow(deviceCode: string, userCode: string, verificationUri: string, expiresAt: string, initialInterval: number, operationId: string, sessionId: string, controller: AbortController): Promise<void> {
    let accessToken = "";
    try {
      let interval = initialInterval;
      while (this.#now().getTime() < Date.parse(expiresAt)) {
        await this.waitForDevicePoll(interval * 1000, controller.signal);
        if (!this.isCurrentDeviceFlow(sessionId, operationId)) return;
        const token = await this.devicePost("https://github.com/login/oauth/access_token", new URLSearchParams({ client_id: this.#deviceClientId!, device_code: deviceCode, grant_type: "urn:ietf:params:oauth:grant-type:device_code" }), true, controller);
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
      if (!this.isCurrentDeviceFlow(sessionId, operationId)) return;
      if (installed.status !== "succeeded") throw new Error(installed.status === "timedOut" ? "Credential installation timed out before the provider confirmed an outcome; external credential side effect is unknown." : resultFromCommand(installed, "Installing the provider credential"));
      const verified = await this.gh(["auth", "status", "--hostname", GITHUB_HOST, "--json", "hosts"]);
      if (!this.isCurrentDeviceFlow(sessionId, operationId)) return;
      if (verified.status === "timedOut") throw new Error("Credential verification timed out before the provider confirmed an outcome; external credential side effect is unknown.");
      const discovered = verified.status === "succeeded" ? parseGhAccounts(verified.stdout, this.#now().toISOString()) : [];
      const secureAccount = discovered.find((account) => account.active && account.credentialStorage === "keyring" && (!this.#signInBaselineAccountIds.has(account.id) || this.#signInBaselineCredentialStates.get(account.id) !== `${account.state}:${account.credentialStorage}`));
      if (!secureAccount) throw new Error("gh did not confirm a newly installed secure keyring account. Plain-text fallback and pre-existing accounts are refused.");
      const identity = await this.gh(["api", "user", "--hostname", GITHUB_HOST]);
      if (!this.isCurrentDeviceFlow(sessionId, operationId)) return;
      if (identity.status === "timedOut") throw new Error("Post-login identity verification timed out; external credential side effect is unknown.");
      let identityRecord: Record<string, unknown>;
      try { identityRecord = JSON.parse(identity.stdout) as Record<string, unknown>; } catch { throw new Error("The provider returned invalid post-login identity data."); }
      if (identity.status !== "succeeded" || identityRecord.login !== secureAccount.login) throw new Error("The provider did not confirm the same post-login account identity. Credential rotation is unproven.");
      const credentialRotation = this.#signInBaselineAccountIds.has(secureAccount.id) ? "same-account-keyring" as const : "new-account" as const;
      this.#state.accounts = discovered;
      this.#state.activeAccountId = secureAccount.id;
      this.#state.device = { status: "installed", operationId, sessionId, credentialRotation, exitCode: installed.exitCode ?? undefined, userCode, verificationUri, expiresAt, message: credentialRotation === "same-account-keyring" ? "The provider confirmed the same account identity with changed keyring state. The credential value was not retained." : "The provider credential was installed in gh's credential store. The credential value was not retained." };
      this.finishOperation("succeeded", this.#state.device.message, operationId);
      this.save();
    } catch (error) {
      const cancelled = controller.signal.aborted || (error instanceof Error && /cancelled/iu.test(error.message));
      if (!this.isCurrentDeviceFlow(sessionId, operationId)) return;
      const status: "cancelled" | "failed" | "unknown-side-effect" = cancelled ? "cancelled" : /external credential side effect is unknown/iu.test(error instanceof Error ? error.message : "") ? "unknown-side-effect" : "failed";
      const message = cancelled ? "Device sign-in was cancelled. The approval code remains invalidated by the bounded flow." : error instanceof Error ? error.message : "Device sign-in did not complete.";
      const receipt: ForgeAccountReceipt = { kind: "account", operation: "sign-in", id: `forge-account-${Date.now().toString(36)}`, status, provider: "github", accountId: "github.com:device", message, observedAt: this.#now().toISOString(), reauthAction: "sign-in" };
      this.addReceipt(receipt, operationId, sessionId);
      this.#state.device = { status, operationId, sessionId, userCode, verificationUri, expiresAt, message };
      this.finishOperation(status === "unknown-side-effect" ? "failed" : status, message, operationId);
      this.save();
    } finally {
      accessToken = "";
      if (this.#state.operation.id === operationId && this.#deviceSessionId === sessionId) {
        this.#deviceCode = undefined;
        this.#deviceTask = undefined;
        this.#deviceSessionId = undefined;
        this.#signInBaselineAccountIds.clear();
        this.#signInBaselineCredentialStates.clear();
      }
    }
  }

  async signIn(request: ForgeSignInRequest): Promise<ForgeActionResult<ReadonlyArray<ForgeAccount>>> {
    const provider = parseProvider(request.provider);
    const hostname = typeof request.hostname === "string" && request.hostname.trim() ? request.hostname.trim() : GITHUB_HOST;
    if (provider !== "github" || hostname !== GITHUB_HOST) return { status: "unavailable", message: "Device sign-in is currently available for github.com only.", reauthAction: "sign-in" };
    if (!this.#deviceClientId || !/^[A-Za-z0-9_-]{20,100}$/u.test(this.#deviceClientId)) return await this.startConPtyDeviceFlow();
    if (!this.beginOperation("sign-in", "Starting the provider device sign-in flow.")) return { status: "failed", message: "Another forge operation is already running." };
    this.#signInBaselineAccountIds = new Set(this.#state.accounts.map((account) => account.id));
    this.#signInBaselineCredentialStates = new Map(this.#state.accounts.map((account) => [account.id, `${account.state}:${account.credentialStorage}`]));
    try {
      const start = await this.devicePost("https://github.com/login/device/code", new URLSearchParams({ client_id: this.#deviceClientId, scope: "repo read:org" }));
      const deviceCode = typeof start.device_code === "string" ? start.device_code : "";
      const userCode = typeof start.user_code === "string" ? start.user_code : "";
      const verificationUri = parseDeviceVerificationUri(typeof start.verification_uri === "string" ? start.verification_uri : start.verification_uri_complete);
      const expiresIn = typeof start.expires_in === "number" && Number.isFinite(start.expires_in) ? Math.min(Math.max(start.expires_in, 60), 900) : 900;
      if (!/^[A-Za-z0-9._-]{4,256}$/u.test(deviceCode) || !/^[A-Z0-9-]{4,64}$/iu.test(userCode)) throw new Error("The provider device response omitted a bounded device code or user code.");
      this.#deviceCode = deviceCode;
      const expiresAt = new Date(this.#now().getTime() + expiresIn * 1000).toISOString();
      this.#state.device = { status: "pending", operationId: this.#state.operation.id, userCode, verificationUri, expiresAt, message: "Open the verification URL and enter the displayed user code. This app will not open a browser automatically." };
      this.updateOperation(15, this.#state.device.message);
      this.save();
      const interval = typeof start.interval === "number" && Number.isFinite(start.interval) ? Math.min(Math.max(start.interval, 5), 30) : 5;
      const sessionId = `forge-http-${this.#state.operation.id}`;
      this.#deviceSessionId = sessionId;
      this.#state.device = { ...this.#state.device, sessionId };
      this.save();
      this.#deviceTask = this.completeDeviceFlow(deviceCode, userCode, verificationUri, expiresAt, interval, this.#state.operation.id, sessionId, this.#abortController!);
      return { status: "pending", message: this.#state.device.message, data: this.#state.accounts };
    } catch (error) {
      const cancelled = this.#abortController?.signal.aborted || (error instanceof Error && /cancelled/iu.test(error.message));
      const status: "cancelled" | "failed" = cancelled ? "cancelled" : "failed";
      const message = cancelled ? "Device sign-in was cancelled. The approval code remains invalidated by the bounded flow." : error instanceof Error ? error.message : "Device sign-in did not complete.";
      const receipt: ForgeAccountReceipt = { kind: "account", operation: "sign-in", id: `forge-account-${Date.now().toString(36)}`, status, provider: "github", accountId: "github.com:device", message, observedAt: this.#now().toISOString(), reauthAction: "sign-in" };
      this.addReceipt(receipt);
      this.#state.device = { status, operationId: this.#state.operation.id, sessionId: this.#deviceSessionId, userCode: this.#state.device?.userCode, verificationUri: this.#state.device?.verificationUri, expiresAt: this.#state.device?.expiresAt, message };
      this.finishOperation(status, message);
      return { status, message, receipt, reauthAction: "sign-in" };
    } finally {
      if (!this.#deviceTask) {
        this.#deviceCode = undefined;
        this.#deviceSessionId = undefined;
        this.#signInBaselineAccountIds.clear();
        this.#signInBaselineCredentialStates.clear();
      }
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
    const operationId = this.#state.operation.id;
    const result = await this.gh(["auth", "logout", "--hostname", account.hostname, "--user", account.login], 30_000, true, "y\n");
    if (!this.isCurrentOperation(operationId)) return { status: "cancelled", message: "The sign-out result was stale and was not applied." };
    if (result.status !== "succeeded") {
      const status = receiptStatus(result, true);
      const receipt = this.makeAccountReceipt(status, "sign-out", account, `${resultFromCommand(result, `Signing out ${account.login}`)} The command may have had an unknown side effect. Logout removes local gh authentication only and does not revoke provider authorization.`);
      this.addReceipt(receipt, operationId);
      this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message, operationId);
      return { status, message: receipt.message, receipt };
    }
    const reread = await this.gh(["auth", "status", "--hostname", account.hostname, "--json", "hosts"]);
    if (!this.isCurrentOperation(operationId)) return { status: "cancelled", message: "The sign-out verification result was stale and was not applied." };
    const completeInventory = reread.status === "succeeded" && hasGithubAuthInventory(reread.stdout);
    const stillPresent = completeInventory && parseGhAccounts(reread.stdout, this.#now().toISOString()).some((candidate) => candidate.id === account.id || candidate.login === account.login);
    if (!completeInventory || stillPresent) {
      const status = reread.status === "cancelled" || reread.status === "timedOut" || !completeInventory ? "unknown-side-effect" : "partial";
      const reason = !completeInventory ? "The provider returned an incomplete account inventory after sign-out." : `The provider still reports ${account.login} as available.`;
      const receipt = this.makeAccountReceipt(status, "sign-out", account, `${reason} Logout removes local gh authentication only and does not revoke provider authorization.`);
      this.addReceipt(receipt, operationId); this.finishOperation("failed", receipt.message, operationId); return { status, message: receipt.message, receipt };
    }
    if (!this.isCurrentOperation(operationId)) return { status: "cancelled", message: "The sign-out result was stale and was not applied." };
    this.#state.accounts = this.#state.accounts.filter((candidate) => candidate.id !== accountId);
    if (this.#state.activeAccountId === accountId) this.#state.activeAccountId = this.#state.accounts[0]?.id;
    this.save();
    this.finishOperation("succeeded", `Account ${account.login} was signed out.`, operationId);
    const receipt = this.makeAccountReceipt("succeeded", "sign-out", account, `Account ${account.login} was signed out locally. Logout does not revoke provider authorization.`);
    this.addReceipt(receipt, operationId);
    await this.record("deleted", `forge account ${account.login}`, { provider: account.provider, accountId, tokenRef: account.tokenRef });
    return { status: "succeeded", message: receipt.message, data: { accountId }, receipt };
  }

  async listOwners(accountId?: string): Promise<ForgeActionResult<ReadonlyArray<ForgeOwner>>> {
    if (!this.beginOperation("owner-discovery", "Reading personal and organization owners from the active provider account.")) return { status: "failed", message: "Another forge operation is already running." };
    const operationId = this.#state.operation.id;
    if (accountId && accountId !== this.#state.activeAccountId) {
      const activation = await this.activateAccount(accountId);
      if (!this.isCurrentOperation(operationId)) return { status: "cancelled", message: "The owner discovery result was stale and was not applied." };
      if (activation.status !== "succeeded") { this.finishOperation("failed", activation.message, operationId); return { status: activation.status, message: activation.message, reauthAction: activation.reauthAction }; }
    }
    const account = this.activeAccount();
    if (!account) { const message = "Choose a signed-in account before loading personal and organization owners."; this.finishOperation("failed", message, operationId); return { status: "reauth-required", message, reauthAction: "add-account" }; }
    const confirmed = await this.activateAccount(account.id);
    if (!this.isCurrentOperation(operationId)) return { status: "cancelled", message: "The owner discovery result was stale and was not applied." };
    if (confirmed.status !== "succeeded") { this.finishOperation("failed", confirmed.message, operationId); return { status: confirmed.status, message: confirmed.message, reauthAction: confirmed.reauthAction }; }
    const personal = await this.gh(["api", "user", "--hostname", GITHUB_HOST]);
    if (!this.isCurrentOperation(operationId)) return { status: "cancelled", message: "The owner discovery result was stale and was not applied." };
    if (personal.status !== "succeeded") { const message = resultFromCommand(personal, "Loading the personal owner"); this.finishOperation(personal.status === "cancelled" ? "cancelled" : "failed", message, operationId); return { status: personal.status === "cancelled" ? "cancelled" : "reauth-required", message, reauthAction: "refresh-account" }; }
    let personalRecord: Record<string, unknown>;
    try { personalRecord = JSON.parse(personal.stdout) as Record<string, unknown>; } catch { const message = "The provider returned invalid personal-owner data."; this.finishOperation("failed", message, operationId); return { status: "failed", message }; }
    const login = typeof personalRecord.login === "string" ? personalRecord.login : account.login;
    const name = typeof personalRecord.name === "string" ? personalRecord.name : login;
    this.#owners.clear();
    const owners: ForgeOwner[] = [accountOwner(account, "personal", login, name)];
    this.#owners.set(owners[0]!.id, owners[0]!);
    const organizations = await this.gh(["api", "user/orgs", "--hostname", GITHUB_HOST, "--paginate", "--slurp"]);
    if (!this.isCurrentOperation(operationId)) return { status: "cancelled", message: "The owner discovery result was stale and was not applied." };
    if (organizations.status !== "succeeded") {
      const message = `${owners.length} personal owner loaded, but organization permissions were not available: ${resultFromCommand(organizations, "Loading organization owners")}`;
      this.finishOperation(organizations.status === "cancelled" ? "cancelled" : "failed", message, operationId);
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
        const message = "The provider returned invalid organization-owner data."; this.finishOperation("failed", message, operationId); return { status: "failed", message };
      }
    }
    if (!this.isCurrentOperation(operationId)) return { status: "cancelled", message: "The owner discovery result was stale and was not applied." };
    this.finishOperation("succeeded", `${owners.length} owner${owners.length === 1 ? "" : "s"} loaded from the active provider account.`, operationId);
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
    const operationId = this.#state.operation.id;
    const controller = this.#abortController!;

    const observedAt = this.#now().toISOString();
    const repositoryUrl = `https://github.com/${ownerLogin}/${repositoryName}`;
    let sourceCommit: string | undefined;
    let effectivePushUrl = "";
    let addedForgeRemote = false;
    let changedExistingPushUrl = false;
    if (route === "copy-and-push") {
      const head = await this.git(["rev-parse", "HEAD"], sourcePath!, 60_000, controller, true, operationId);
      if (head.status !== "succeeded") {
        const status = head.status === "cancelled" ? "cancelled" : "failed";
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, undefined, resultFromCommand(head, "Reading the local source commit"), observedAt);
        this.addReceipt(receipt, operationId); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message, operationId); await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status, message: receipt.message, receipt, data: receipt };
      }
      sourceCommit = head.stdout.trim();
      if (!SAFE_COMMIT.test(sourceCommit)) {
        const receipt = this.makeReceipt("failed", account, ownerId, route, repositoryName, repositoryUrl, undefined, "The local source did not return a valid commit id.", observedAt);
        this.addReceipt(receipt, operationId); this.finishOperation("failed", receipt.message, operationId); return { status: "failed", message: receipt.message, receipt, data: receipt };
      }
      const create = await this.gh(["repo", "create", `${ownerLogin}/${repositoryName}`, visibility === "public" ? "--public" : "--private", ...(description ? ["--description", description] : [])], 30_000, false, undefined, undefined, controller, operationId);
      if (create.status !== "succeeded") {
        const status = receiptStatus(create, true);
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, resultFromCommand(create, "Creating the destination repository"), observedAt);
        this.addReceipt(receipt, operationId); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message, operationId); await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status, message: receipt.message, receipt, data: receipt };
      }
      const identity = await this.verifyDestinationIdentity(ownerLogin, repositoryName, repositoryUrl, controller, operationId);
      if (!identity.ok) {
        const receipt = this.makeReceipt(identity.status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, identity.message, observedAt);
        this.addReceipt(receipt, operationId); this.finishOperation(identity.status === "cancelled" ? "cancelled" : "failed", receipt.message, operationId); await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status: identity.status, message: receipt.message, receipt, data: receipt };
      }
      const remote = await this.git(["remote", "get-url", "--push", "forge-publish"], sourcePath!, 60_000, controller, true, operationId);
      const pushUrls = remote.status === "succeeded" ? remote.stdout.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean) : [];
      if (pushUrls.length > 1) {
        const receipt = this.makeReceipt("failed", account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, "The forge-publish remote has more than one push URL, so the destination cannot be proved uniquely.", observedAt);
         this.addReceipt(receipt, operationId); this.finishOperation("failed", receipt.message, operationId); return { status: "failed", message: receipt.message, receipt, data: receipt };
      }
      effectivePushUrl = pushUrls[0] ?? "";
      if (!effectivePushUrl) {
        const fetchRemote = await this.git(["remote", "get-url", "forge-publish"], sourcePath!, 60_000, controller, true, operationId);
        const fetchUrls = fetchRemote.status === "succeeded" ? fetchRemote.stdout.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean) : [];
        if (fetchUrls.length > 1) {
          const receipt = this.makeReceipt("failed", account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, "The forge-publish remote has more than one effective URL, so the destination cannot be proved uniquely.", observedAt);
           this.addReceipt(receipt, operationId); this.finishOperation("failed", receipt.message, operationId); return { status: "failed", message: receipt.message, receipt, data: receipt };
        }
        if (fetchUrls.length === 1) {
          const setPush = await this.git(["remote", "set-url", "--push", "forge-publish", fetchUrls[0]!], sourcePath!, 60_000, controller, true, operationId);
          if (setPush.status !== "succeeded") {
            const status = setPush.status === "cancelled" ? "cancelled" : "partial";
            const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, resultFromCommand(setPush, "Setting the destination push URL"), observedAt);
             this.addReceipt(receipt, operationId); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message, operationId); await this.record("updated", `forge publication ${repositoryName}`, receipt);
            return { status, message: receipt.message, receipt, data: receipt };
          }
          changedExistingPushUrl = true;
        }
      }
      if (!effectivePushUrl) {
        const add = await this.git(["remote", "add", "forge-publish", repositoryUrl], sourcePath!, 60_000, controller, true, operationId);
        if (add.status !== "succeeded") {
          const status = add.status === "cancelled" ? "cancelled" : "partial";
          const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, resultFromCommand(add, "Adding the destination remote"), observedAt);
           this.addReceipt(receipt, operationId); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message, operationId); await this.record("updated", `forge publication ${repositoryName}`, receipt);
          return { status, message: receipt.message, receipt, data: receipt };
        }
        addedForgeRemote = true;
      }
      const effectiveRemote = await this.git(["remote", "get-url", "--push", "forge-publish"], sourcePath!, 60_000, controller, true, operationId);
      const effectiveUrls = effectiveRemote.status === "succeeded" ? effectiveRemote.stdout.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean) : [];
      if (effectiveUrls.length !== 1) {
        const status = effectiveRemote.status === "cancelled" ? "cancelled" : "partial";
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, effectiveUrls.length > 1 ? "The forge-publish remote has more than one effective push URL, so the destination cannot be proved uniquely." : resultFromCommand(effectiveRemote, "Reading the effective destination push URL"), observedAt);
        if (addedForgeRemote || changedExistingPushUrl) { Object.assign(receipt, await this.rollbackPublicationRemote(sourcePath!, operationId, repositoryUrl, addedForgeRemote, changedExistingPushUrl)); receipt.message = `${receipt.message} ${receipt.recoveryAction ?? ""}`.trim(); }
         this.addReceipt(receipt, operationId); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message, operationId); await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status, message: receipt.message, receipt, data: receipt };
      }
      effectivePushUrl = effectiveUrls[0]!;
      if (effectivePushUrl !== repositoryUrl && effectivePushUrl !== `${repositoryUrl}.git`) {
        const receipt = this.makeReceipt("failed", account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, "The local forge-publish remote already points somewhere else, so it was not changed.", observedAt);
        if (addedForgeRemote || changedExistingPushUrl) { Object.assign(receipt, await this.rollbackPublicationRemote(sourcePath!, operationId, repositoryUrl, addedForgeRemote, changedExistingPushUrl)); receipt.message = `${receipt.message} ${receipt.recoveryAction ?? ""}`.trim(); }
         this.addReceipt(receipt, operationId); this.finishOperation("failed", receipt.message, operationId); return { status: "failed", message: receipt.message, receipt, data: receipt };
      }
      const pushed = await this.git(["push", effectivePushUrl, `HEAD:${defaultBranch}`], sourcePath!, 120_000, controller, true, operationId);
      if (pushed.status !== "succeeded") {
        const status = pushed.status === "cancelled" ? "cancelled" : "partial";
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, resultFromCommand(pushed, "Pushing the local source"), observedAt);
        receipt.effectivePushUrl = effectivePushUrl;
        if (addedForgeRemote || changedExistingPushUrl) { Object.assign(receipt, await this.rollbackPublicationRemote(sourcePath!, operationId, repositoryUrl, addedForgeRemote, changedExistingPushUrl)); receipt.message = `${receipt.message} ${receipt.recoveryAction ?? ""}`.trim(); }
         this.addReceipt(receipt, operationId); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message, operationId);
        await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status, message: receipt.message, receipt, data: receipt };
      }
      const verified = await this.git(["ls-remote", "--heads", effectivePushUrl, defaultBranch], sourcePath!, 30_000, controller, true, operationId);
      const verifiedCommit = verified.status === "succeeded" ? /^([0-9a-f]{40})\s+refs\/heads\//iu.exec(verified.stdout.trim())?.[1] : undefined;
      if (verifiedCommit !== sourceCommit) {
        const status = verified.status === "cancelled" ? "cancelled" : "partial";
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, verified.status === "succeeded" ? `The destination answered with ${verifiedCommit ?? "no matching commit"}, not ${sourceCommit}.` : resultFromCommand(verified, "Verifying the destination commit"), observedAt);
        receipt.effectivePushUrl = effectivePushUrl;
        if (addedForgeRemote || changedExistingPushUrl) { Object.assign(receipt, await this.rollbackPublicationRemote(sourcePath!, operationId, repositoryUrl, addedForgeRemote, changedExistingPushUrl)); receipt.message = `${receipt.message} ${receipt.recoveryAction ?? ""}`.trim(); }
         this.addReceipt(receipt, operationId); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message, operationId); await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status, message: receipt.message, receipt, data: receipt };
      }
    } else {
      const args = ["repo", "fork", sourceRemote!, "--remote=false", "--fork-name", repositoryName];
      if (ownerKind === "organization") args.push("--org", ownerLogin);
      const fork = await this.gh(args, 120_000, false, undefined, undefined, controller, operationId);
      if (fork.status !== "succeeded") {
        const status = receiptStatus(fork, true);
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, undefined, resultFromCommand(fork, "Forking the source repository"), observedAt);
        this.addReceipt(receipt, operationId); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message, operationId); return { status, message: receipt.message, receipt, data: receipt };
      }
      const identity = await this.verifyDestinationIdentity(ownerLogin, repositoryName, repositoryUrl, controller, operationId);
      if (!identity.ok) {
        const receipt = this.makeReceipt(identity.status, account, ownerId, route, repositoryName, repositoryUrl, undefined, identity.message, observedAt);
        this.addReceipt(receipt, operationId); this.finishOperation(identity.status === "cancelled" ? "cancelled" : "failed", receipt.message, operationId); return { status: identity.status, message: receipt.message, receipt, data: receipt };
      }
    }
    const receipt = this.makeReceipt("succeeded", account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, route === "fork" ? "The provider confirmed the fork request." : `The destination accepted commit ${sourceCommit}.`, observedAt);
    if (route === "copy-and-push") receipt.effectivePushUrl = effectivePushUrl;
    this.addReceipt(receipt, operationId);
    this.finishOperation("succeeded", receipt.message, operationId);
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
