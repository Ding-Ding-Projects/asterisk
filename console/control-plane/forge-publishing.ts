import { existsSync, readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import type { LocalHistory, LocalHistoryEntry } from "./local-history.js";
import type { CommandResult, ProcessExecutor } from "./executor.js";
import { atomicWriteFileSync } from "./atomic-file.js";

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
  tokenRef: string;
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

export interface ForgeReceipt {
  id: string;
  status: "succeeded" | "partial" | "failed" | "cancelled" | "reauth-required" | "unavailable";
  provider: ForgeProvider;
  accountId: string;
  ownerId?: string;
  route?: ForgePublishRoute;
  repositoryName?: string;
  repositoryUrl?: string;
  sourceCommit?: string;
  message: string;
  observedAt: string;
  reauthAction?: "add-account" | "refresh-account" | "sign-in";
}

export interface ForgeState {
  schemaVersion: typeof FORGE_SCHEMA_VERSION;
  activeAccountId?: string;
  accounts: ForgeAccount[];
  receipts: ForgeReceipt[];
  operation: ForgeOperation;
  corruption?: string;
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
  status: ForgeReceipt["status"];
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
  "GH_TOKEN", "GITHUB_TOKEN", "GH_ENTERPRISE_TOKEN", "GITLAB_TOKEN", "GIT_ASKPASS",
  "GIT_CONFIG_COUNT", "GIT_CONFIG_KEY_0", "GIT_CONFIG_VALUE_0", "GIT_HTTP_EXTRAHEADER",
] as const;

function defaultState(): ForgeState {
  return { schemaVersion: FORGE_SCHEMA_VERSION, accounts: [], receipts: [], operation: idleOperation() };
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
  const accounts = record.accounts.filter(isForgeAccount).slice(0, 50);
  const receipts = record.receipts.filter(isForgeReceipt).slice(0, MAX_RECEIPTS);
  const activeAccountId = typeof record.activeAccountId === "string" && accounts.some((account) => account.id === record.activeAccountId)
    ? record.activeAccountId
    : undefined;
  const storedOperation = isForgeOperation(record.operation) ? record.operation : idleOperation();
  const operation = storedOperation.status === "running" ? { ...storedOperation, status: "failed" as const, cancellable: false, message: "The previous forge operation stopped before its outcome was recorded." } : storedOperation;
  return { schemaVersion: FORGE_SCHEMA_VERSION, activeAccountId, accounts, receipts, operation };
}

function isForgeAccount(value: unknown): value is ForgeAccount {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && SAFE_ACCOUNT_ID.test(record.id)
    && record.provider === "github" && record.hostname === GITHUB_HOST
    && typeof record.login === "string" && SAFE_LOGIN.test(record.login)
    && typeof record.displayName === "string" && record.displayName.length <= 120
    && typeof record.tokenRef === "string" && /^gh:\/\/github\.com\/[A-Za-z0-9][A-Za-z0-9._-]{0,38}$/u.test(record.tokenRef)
    && (record.state === "available" || record.state === "reauth-required" || record.state === "signed-out")
    && typeof record.lastSeenAt === "string"
    && (record.active === undefined || typeof record.active === "boolean");
}

function isForgeReceipt(value: unknown): value is ForgeReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && record.id.length > 0 && record.id.length <= 100
    && (record.status === "succeeded" || record.status === "partial" || record.status === "failed" || record.status === "cancelled" || record.status === "reauth-required" || record.status === "unavailable")
    && record.provider === "github" && typeof record.accountId === "string" && SAFE_ACCOUNT_ID.test(record.accountId)
    && (record.ownerId === undefined || (typeof record.ownerId === "string" && SAFE_OWNER_ID.test(record.ownerId)))
    && (record.route === undefined || record.route === "fork" || record.route === "copy-and-push")
    && (record.repositoryName === undefined || (typeof record.repositoryName === "string" && SAFE_NAME.test(record.repositoryName)))
    && (record.repositoryUrl === undefined || (typeof record.repositoryUrl === "string" && SAFE_REMOTE.test(record.repositoryUrl)))
    && typeof record.message === "string" && record.message.length <= 2000
    && typeof record.observedAt === "string";
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
    return [{
      id: `github.com:${login}`,
      provider: "github",
      hostname: GITHUB_HOST,
      login,
      displayName: login,
      tokenRef: `gh://github.com/${login}`,
      state: signedIn ? "available" : "reauth-required",
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
  #state: ForgeState;
  #owners = new Map<string, ForgeOwner>();
  #abortController: AbortController | undefined;

  constructor(options: ForgePublisherOptions) {
    this.#executor = options.executor;
    this.#store = options.store;
    this.#history = options.history;
    this.#now = options.now ?? (() => new Date());
    this.#state = parseForgeState(options.store.read());
  }

  capabilities(): ReadonlyArray<ForgeProviderCapabilities> {
    return FORGE_PROVIDERS.map((provider) => PROVIDER_CAPABILITIES[provider]);
  }

  state(): ForgeState {
    return JSON.parse(JSON.stringify(this.#state)) as ForgeState;
  }

  private save(): void {
    this.#state = { ...this.#state, corruption: undefined };
    this.#store.write(this.#state);
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
    this.finishOperation("cancelled", "The forge operation was cancelled before completion.");
    return { status: "cancelled", message: this.#state.operation.message, data: this.#state.operation };
  }

  private async gh(args: ReadonlyArray<string>, timeoutMs = 30_000, interactive = false): Promise<CommandResult> {
    this.updateOperation(Math.max(5, this.#state.operation.progress), interactive ? "Waiting for the provider device sign-in flow." : "Running the provider command.");
    const result = await this.#executor.execute({ executable: "gh", args, timeoutMs, maxOutputBytes: 4 * 1024 * 1024, signal: this.#abortController?.signal, environment: interactive ? undefined : { GH_PROMPT_DISABLED: "1" }, clearEnvironmentKeys: AUTH_ENVIRONMENT_KEYS });
    this.updateOperation(result.status === "succeeded" ? Math.min(95, this.#state.operation.progress + 20) : this.#state.operation.progress, result.status === "succeeded" ? "Provider command returned." : result.status === "cancelled" ? "Provider command cancelled." : "Provider command returned a failure.");
    return result;
  }

  private async git(args: ReadonlyArray<string>, cwd: string, timeoutMs = 60_000): Promise<CommandResult> {
    this.updateOperation(Math.max(5, this.#state.operation.progress), "Running the local git command.");
    return await this.#executor.execute({ executable: "git", args, cwd, timeoutMs, maxOutputBytes: 4 * 1024 * 1024, signal: this.#abortController?.signal, environment: { GIT_TERMINAL_PROMPT: "0" }, clearEnvironmentKeys: AUTH_ENVIRONMENT_KEYS });
  }

  private activeAccount(): ForgeAccount | undefined {
    return this.#state.accounts.find((account) => account.id === this.#state.activeAccountId && account.state === "available");
  }

  private async discoverGhAccounts(): Promise<ForgeActionResult<ReadonlyArray<ForgeAccount>>> {
    if (!this.beginOperation("account-discovery", "Reading the local provider sign-in store.")) return { status: "failed", message: "Another forge operation is already running." };
    const result = await this.gh(["auth", "status", "--hostname", GITHUB_HOST, "--json", "hosts"]);
    if (result.status !== "succeeded") {
      const receipt: ForgeReceipt = {
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
    return await this.discoverGhAccounts();
  }

  async signIn(request: ForgeSignInRequest): Promise<ForgeActionResult<ReadonlyArray<ForgeAccount>>> {
    const provider = parseProvider(request.provider);
    const hostname = typeof request.hostname === "string" && request.hostname.trim() ? request.hostname.trim() : GITHUB_HOST;
    if (provider !== "github" || hostname !== GITHUB_HOST) return { status: "unavailable", message: "Device sign-in is currently available for github.com only.", reauthAction: "sign-in" };
    if (!this.beginOperation("sign-in", "Starting the provider device sign-in flow.")) return { status: "failed", message: "Another forge operation is already running." };
    const result = await this.gh(["auth", "login", "--hostname", hostname, "--git-protocol", "https", "--web", "--skip-ssh-key", "--scopes", "repo,read:org"], 300_000, true);
    if (result.status !== "succeeded") {
      const status = result.status === "cancelled" ? "cancelled" : "failed";
      const receipt = this.makeReceipt(status, { id: "github.com:sign-in", provider: "github", hostname, login: "sign-in", displayName: "sign-in", tokenRef: "gh://github.com/sign-in", state: "reauth-required", lastSeenAt: this.#now().toISOString() }, undefined, "copy-and-push", "sign-in", undefined, undefined, resultFromCommand(result, "Device sign-in"), this.#now().toISOString());
      this.addReceipt(receipt);
      this.finishOperation(status, receipt.message);
      return { status, message: receipt.message, receipt, reauthAction: "sign-in" };
    }
    this.finishOperation("succeeded", "Device sign-in completed. Reading the active provider accounts.");
    return await this.discoverGhAccounts();
  }

  async addAccount(request: ForgeAccountRequest): Promise<ForgeActionResult<ForgeAccount>> {
    const provider = parseProvider(request.provider);
    if (provider !== "github") return { status: "unavailable", message: PROVIDER_CAPABILITIES[provider].reason ?? "This provider is unavailable.", reauthAction: "add-account" };
    const login = parseLogin(request.login);
    const discovered = await this.discoverGhAccounts();
    const account = discovered.data?.find((candidate) => candidate.login === login);
    if (!account) return { status: "reauth-required", message: `Account ${login} is not signed in. Start the provider sign-in flow beside this control, then refresh the account list. No token was accepted or stored here.`, reauthAction: "add-account" };
    await this.record("created", `forge account ${login}`, { provider, accountId: account.id, tokenRef: account.tokenRef });
    return { status: "succeeded", message: `Account ${login} is available to publish.`, data: account };
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
      return { status: "reauth-required", message: `Account ${account.login} needs sign-in again. No token was exposed or changed.`, data: next, reauthAction: "refresh-account" };
    }
    await this.record("updated", `forge account ${account.login}`, { provider: account.provider, accountId, tokenRef: account.tokenRef, state: refreshed.state });
    return { status: "succeeded", message: `Account ${account.login} was refreshed from the provider sign-in store.`, data: refreshed };
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
    return { status: "succeeded", message: `Account ${account.login} is active.`, data: account };
  }

  async signOut(accountId: string): Promise<ForgeActionResult<{ accountId: string }>> {
    const account = this.#state.accounts.find((candidate) => candidate.id === accountId);
    if (!account) return { status: "failed", message: "Choose an account from the discovered account list." };
    if (!this.beginOperation("account-discovery", `Signing out ${account.login} without an interactive confirmation.`)) return { status: "failed", message: "Another forge operation is already running." };
    const result = await this.gh(["auth", "logout", "--hostname", account.hostname, "--user", account.login, "--yes"]);
    if (result.status !== "succeeded") {
      const status = result.status === "cancelled" ? "cancelled" : "failed";
      const receipt = this.makeReceipt(status, account, account.id, "copy-and-push", "sign-out", undefined, undefined, resultFromCommand(result, `Signing out ${account.login}`), this.#now().toISOString());
      this.addReceipt(receipt);
      this.finishOperation(status, receipt.message);
      return { status, message: receipt.message, receipt };
    }
    this.#state.accounts = this.#state.accounts.filter((candidate) => candidate.id !== accountId);
    if (this.#state.activeAccountId === accountId) this.#state.activeAccountId = this.#state.accounts[0]?.id;
    this.save();
    this.finishOperation("succeeded", `Account ${account.login} was signed out.`);
    const receipt = this.makeReceipt("succeeded", account, account.id, "copy-and-push", "sign-out", undefined, undefined, `Account ${account.login} was signed out.`, this.#now().toISOString());
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
          const permissions = org.permissions && typeof org.permissions === "object" && !Array.isArray(org.permissions) ? org.permissions as Record<string, unknown> : undefined;
          const canCreate = permissions?.admin === true;
          const canFork = permissions?.push === true || permissions?.admin === true;
          const owner = accountOwner(account, "organization", org.login, org.login, canCreate, canCreate ? undefined : "The provider returned this organization but did not report repository-create permission.", canFork);
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
    if (route === "copy-and-push") {
      const head = await this.git(["rev-parse", "HEAD"], sourcePath!);
      if (head.status !== "succeeded") {
        const status = head.status === "cancelled" ? "cancelled" : "failed";
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, undefined, resultFromCommand(head, "Reading the local source commit"), observedAt);
        this.addReceipt(receipt); this.finishOperation(status, receipt.message); await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status, message: receipt.message, receipt, data: receipt };
      }
      sourceCommit = head.stdout.trim();
      if (!SAFE_COMMIT.test(sourceCommit)) {
        const receipt = this.makeReceipt("failed", account, ownerId, route, repositoryName, repositoryUrl, undefined, "The local source did not return a valid commit id.", observedAt);
        this.addReceipt(receipt); this.finishOperation("failed", receipt.message); return { status: "failed", message: receipt.message, receipt, data: receipt };
      }
      const create = await this.gh(["repo", "create", `${ownerLogin}/${repositoryName}`, visibility === "public" ? "--public" : "--private", ...(description ? ["--description", description] : [])]);
      if (create.status !== "succeeded") {
        const status = create.status === "cancelled" ? "cancelled" : "failed";
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, resultFromCommand(create, "Creating the destination repository"), observedAt);
        this.addReceipt(receipt); this.finishOperation(status, receipt.message); await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status, message: receipt.message, receipt, data: receipt };
      }
      const remote = await this.git(["remote", "get-url", "forge-publish"], sourcePath!);
      if (remote.status !== "succeeded") {
        const add = await this.git(["remote", "add", "forge-publish", repositoryUrl], sourcePath!);
        if (add.status !== "succeeded") {
          const status = add.status === "cancelled" ? "cancelled" : "partial";
          const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, resultFromCommand(add, "Adding the destination remote"), observedAt);
          this.addReceipt(receipt); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message); await this.record("updated", `forge publication ${repositoryName}`, receipt);
          return { status, message: receipt.message, receipt, data: receipt };
        }
      } else if (remote.stdout.trim() !== repositoryUrl && remote.stdout.trim() !== `${repositoryUrl}.git`) {
        const receipt = this.makeReceipt("failed", account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, "The local forge-publish remote already points somewhere else, so it was not changed.", observedAt);
        this.addReceipt(receipt); this.finishOperation("failed", receipt.message); return { status: "failed", message: receipt.message, receipt, data: receipt };
      }
      const pushed = await this.git(["push", "forge-publish", `HEAD:${defaultBranch}`], sourcePath!, 120_000);
      if (pushed.status !== "succeeded") {
        const status = pushed.status === "cancelled" ? "cancelled" : "partial";
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, resultFromCommand(pushed, "Pushing the local source"), observedAt);
        this.addReceipt(receipt); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message);
        await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status, message: receipt.message, receipt, data: receipt };
      }
      const verified = await this.git(["ls-remote", "--heads", "forge-publish", defaultBranch], sourcePath!, 30_000);
      const verifiedCommit = verified.status === "succeeded" ? /^([0-9a-f]{40})\s+refs\/heads\//iu.exec(verified.stdout.trim())?.[1] : undefined;
      if (verifiedCommit !== sourceCommit) {
        const status = verified.status === "cancelled" ? "cancelled" : "partial";
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, verified.status === "succeeded" ? `The destination answered with ${verifiedCommit ?? "no matching commit"}, not ${sourceCommit}.` : resultFromCommand(verified, "Verifying the destination commit"), observedAt);
        this.addReceipt(receipt); this.finishOperation(status === "cancelled" ? "cancelled" : "failed", receipt.message); await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status, message: receipt.message, receipt, data: receipt };
      }
    } else {
      const args = ["repo", "fork", sourceRemote!, "--remote=false", "--fork-name", repositoryName];
      if (ownerKind === "organization") args.push("--org", ownerLogin);
      const fork = await this.gh(args, 120_000);
      if (fork.status !== "succeeded") {
        const status = fork.status === "cancelled" ? "cancelled" : "failed";
        const receipt = this.makeReceipt(status, account, ownerId, route, repositoryName, repositoryUrl, undefined, resultFromCommand(fork, "Forking the source repository"), observedAt);
        this.addReceipt(receipt); this.finishOperation(status, receipt.message); return { status, message: receipt.message, receipt, data: receipt };
      }
    }
    const receipt = this.makeReceipt("succeeded", account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, route === "fork" ? "The provider confirmed the fork request." : `The destination accepted commit ${sourceCommit}.`, observedAt);
    this.addReceipt(receipt);
    this.finishOperation("succeeded", receipt.message);
    await this.record("created", `forge publication ${repositoryName}`, receipt);
    return { status: "succeeded", message: receipt.message, receipt, data: receipt };
  }

  private makeReceipt(status: ForgeReceipt["status"], account: ForgeAccount, ownerId: string | undefined, route: ForgePublishRoute, repositoryName: string, repositoryUrl: string | undefined, sourceCommit: string | undefined, message: string, observedAt: string): ForgeReceipt {
    return { id: `forge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, status, provider: account.provider, accountId: account.id, ownerId, route, repositoryName, repositoryUrl, sourceCommit, message, observedAt };
  }
}
