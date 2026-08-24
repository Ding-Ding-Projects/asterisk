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
}

export interface ForgeOwner {
  id: string;
  accountId: string;
  provider: ForgeProvider;
  login: string;
  displayName: string;
  kind: ForgeOwnerKind;
  canCreateRepository: boolean;
  capabilities: ForgeProviderCapabilities;
}

export interface ForgeReceipt {
  id: string;
  status: "succeeded" | "partial" | "failed" | "reauth-required" | "unavailable";
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
      return undefined;
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
  },
  gitlab: {
    provider: "gitlab",
    displayName: "GitLab",
    supportsFork: false,
    supportsCopyAndPush: false,
    apiState: "unavailable",
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

function defaultState(): ForgeState {
  return { schemaVersion: FORGE_SCHEMA_VERSION, accounts: [], receipts: [] };
}

function parseForgeState(value: unknown): ForgeState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultState();
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== FORGE_SCHEMA_VERSION || !Array.isArray(record.accounts) || !Array.isArray(record.receipts)) {
    return defaultState();
  }
  const accounts = record.accounts.filter(isForgeAccount).slice(0, 50);
  const receipts = record.receipts.filter(isForgeReceipt).slice(0, MAX_RECEIPTS);
  const activeAccountId = typeof record.activeAccountId === "string" && accounts.some((account) => account.id === record.activeAccountId)
    ? record.activeAccountId
    : undefined;
  return { schemaVersion: FORGE_SCHEMA_VERSION, activeAccountId, accounts, receipts };
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
    && typeof record.lastSeenAt === "string";
}

function isForgeReceipt(value: unknown): value is ForgeReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && record.id.length > 0 && record.id.length <= 100
    && (record.status === "succeeded" || record.status === "partial" || record.status === "failed" || record.status === "reauth-required" || record.status === "unavailable")
    && record.provider === "github" && typeof record.accountId === "string" && SAFE_ACCOUNT_ID.test(record.accountId)
    && (record.ownerId === undefined || (typeof record.ownerId === "string" && SAFE_OWNER_ID.test(record.ownerId)))
    && (record.route === undefined || record.route === "fork" || record.route === "copy-and-push")
    && (record.repositoryName === undefined || (typeof record.repositoryName === "string" && SAFE_NAME.test(record.repositoryName)))
    && (record.repositoryUrl === undefined || (typeof record.repositoryUrl === "string" && SAFE_REMOTE.test(record.repositoryUrl)))
    && typeof record.message === "string" && record.message.length <= 2000
    && typeof record.observedAt === "string";
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

function parseHttpsRemote(value: unknown): string {
  const remote = typeof value === "string" ? value.trim() : "";
  if (!SAFE_REMOTE.test(remote)) throw new Error("The source remote must be an HTTPS forge URL.");
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
    }];
  });
}

function resultFromCommand(result: CommandResult, action: string): string {
  if (result.status === "timedOut") return `${action} timed out before the provider confirmed an outcome.`;
  if (result.status === "cancelled") return `${action} was cancelled before the provider confirmed an outcome.`;
  return result.stderr.trim() || `${action} did not complete.`;
}

function accountOwner(account: ForgeAccount, kind: ForgeOwnerKind, login: string, name: string): ForgeOwner {
  const id = kind === "personal" ? `github:user:${login}` : `github:org:${login}`;
  return {
    id,
    accountId: account.id,
    provider: account.provider,
    login,
    displayName: name || login,
    kind,
    canCreateRepository: true,
    capabilities: PROVIDER_CAPABILITIES.github,
  };
}

export class ForgePublisher {
  readonly #executor: ProcessExecutor;
  readonly #store: ForgeStateStore;
  readonly #history?: Pick<LocalHistory, "record">;
  readonly #now: () => Date;
  #state: ForgeState;

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

  private async gh(args: ReadonlyArray<string>, timeoutMs = 30_000): Promise<CommandResult> {
    return await this.#executor.execute({ executable: "gh", args, timeoutMs, maxOutputBytes: 4 * 1024 * 1024 });
  }

  private async git(args: ReadonlyArray<string>, cwd: string, timeoutMs = 60_000): Promise<CommandResult> {
    return await this.#executor.execute({ executable: "git", args, cwd, timeoutMs, maxOutputBytes: 4 * 1024 * 1024 });
  }

  private activeAccount(): ForgeAccount | undefined {
    return this.#state.accounts.find((account) => account.id === this.#state.activeAccountId && account.state === "available");
  }

  private async discoverGhAccounts(): Promise<ForgeActionResult<ReadonlyArray<ForgeAccount>>> {
    const result = await this.gh(["auth", "status", "--hostname", GITHUB_HOST, "--json", "hosts"]);
    if (result.status !== "succeeded") {
      const receipt: ForgeReceipt = {
        id: `forge-${Date.now().toString(36)}`,
        status: "unavailable",
        provider: "github",
        accountId: this.#state.activeAccountId ?? "github.com:unknown",
        message: resultFromCommand(result, "Account discovery"),
        observedAt: this.#now().toISOString(),
        reauthAction: "add-account",
      };
      return { status: "unavailable", message: receipt.message, receipt };
    }
    const accounts = parseGhAccounts(result.stdout, this.#now().toISOString());
    if (accounts.length === 0) {
      return { status: "reauth-required", message: "No signed-in GitHub account was found. Add an account through the provider sign-in flow; no token was accepted here.", reauthAction: "add-account" } as ForgeActionResult<ReadonlyArray<ForgeAccount>>;
    }
    const previous = new Map(this.#state.accounts.map((account) => [account.id, account]));
    this.#state.accounts = accounts.map((account) => ({ ...previous.get(account.id), ...account }));
    if (!this.#state.activeAccountId || !this.#state.accounts.some((account) => account.id === this.#state.activeAccountId)) {
      this.#state.activeAccountId = this.#state.accounts[0]!.id;
    }
    this.save();
    return { status: "succeeded", message: `${accounts.length} signed-in GitHub account${accounts.length === 1 ? "" : "s"} discovered.`, data: this.#state.accounts };
  }

  async listAccounts(): Promise<ForgeActionResult<ReadonlyArray<ForgeAccount>>> {
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
    this.#state.activeAccountId = account.id;
    this.save();
    await this.record("updated", `active forge account ${account.login}`, { accountId: account.id, tokenRef: account.tokenRef });
    return { status: "succeeded", message: `Account ${account.login} is active.`, data: account };
  }

  async signOut(accountId: string): Promise<ForgeActionResult<{ accountId: string }>> {
    const account = this.#state.accounts.find((candidate) => candidate.id === accountId);
    if (!account) return { status: "failed", message: "Choose an account from the discovered account list." };
    const result = await this.gh(["auth", "logout", "--hostname", account.hostname, "--user", account.login, "--yes"]);
    if (result.status !== "succeeded") return { status: "failed", message: resultFromCommand(result, `Signing out ${account.login}`) };
    this.#state.accounts = this.#state.accounts.filter((candidate) => candidate.id !== accountId);
    if (this.#state.activeAccountId === accountId) this.#state.activeAccountId = this.#state.accounts[0]?.id;
    this.save();
    await this.record("deleted", `forge account ${account.login}`, { provider: account.provider, accountId, tokenRef: account.tokenRef });
    return { status: "succeeded", message: `Account ${account.login} was signed out.`, data: { accountId } };
  }

  async listOwners(accountId?: string): Promise<ForgeActionResult<ReadonlyArray<ForgeOwner>>> {
    if (accountId && accountId !== this.#state.activeAccountId) {
      const activation = await this.activateAccount(accountId);
      if (activation.status !== "succeeded") return { status: activation.status, message: activation.message, reauthAction: activation.reauthAction };
    }
    const account = this.activeAccount();
    if (!account) return { status: "reauth-required", message: "Choose a signed-in account before loading personal and organization owners.", reauthAction: "add-account" };
    const personal = await this.gh(["api", "user"]);
    if (personal.status !== "succeeded") return { status: "reauth-required", message: resultFromCommand(personal, "Loading the personal owner"), reauthAction: "refresh-account" };
    let personalRecord: Record<string, unknown>;
    try { personalRecord = JSON.parse(personal.stdout) as Record<string, unknown>; } catch { return { status: "failed", message: "The provider returned invalid personal-owner data." }; }
    const login = typeof personalRecord.login === "string" ? personalRecord.login : account.login;
    const name = typeof personalRecord.name === "string" ? personalRecord.name : login;
    const owners: ForgeOwner[] = [accountOwner(account, "personal", login, name)];
    const organizations = await this.gh(["api", "user/orgs", "--paginate", "--slurp"]);
    if (organizations.status === "succeeded") {
      try {
        const pages = JSON.parse(organizations.stdout) as unknown;
        const records = Array.isArray(pages) ? pages.flatMap((page) => Array.isArray(page) ? page : []) : [];
        for (const record of records) {
          if (!record || typeof record !== "object" || Array.isArray(record)) continue;
          const org = record as Record<string, unknown>;
          if (typeof org.login !== "string" || !SAFE_LOGIN.test(org.login)) continue;
          owners.push(accountOwner(account, "organization", org.login, typeof org.login === "string" ? org.login : ""));
        }
      } catch {
        return { status: "failed", message: "The provider returned invalid organization-owner data." };
      }
    }
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
    const ownerLogin = ownerId.replace(/^github:(?:user|org):/u, "");
    const ownerKind: ForgeOwnerKind = ownerId.startsWith("github:org:") ? "organization" : "personal";
    const repositoryName = parseRepositoryName(request.repositoryName);
    const sourcePath = parseAbsolutePath(request.sourcePath);
    const sourceRemote = request.sourceRemote === undefined || request.sourceRemote === "" ? undefined : parseHttpsRemote(request.sourceRemote);
    const description = typeof request.description === "string" ? request.description.trim().slice(0, 500) : "";
    const visibility = parseVisibility(request.visibility);
    const defaultBranch = parseDefaultBranch(request.defaultBranch);
    const active = await this.activateAccount(account.id);
    if (active.status !== "succeeded") return { status: active.status, message: active.message, reauthAction: active.reauthAction };
    if (route === "fork" && !sourceRemote) return { status: "failed", message: "Fork needs the source repository HTTPS URL; copy and push can publish the selected local folder." };
    if (route === "fork" && !PROVIDER_CAPABILITIES.github.supportsFork) return { status: "unavailable", message: "The selected provider does not expose a fork route." };

    const observedAt = this.#now().toISOString();
    const repositoryUrl = `https://github.com/${ownerLogin}/${repositoryName}`;
    let sourceCommit: string | undefined;
    if (route === "copy-and-push") {
      const head = await this.git(["rev-parse", "HEAD"], sourcePath);
      if (head.status !== "succeeded") return { status: "failed", message: resultFromCommand(head, "Reading the local source commit") };
      sourceCommit = head.stdout.trim();
      if (!SAFE_COMMIT.test(sourceCommit)) return { status: "failed", message: "The local source did not return a valid commit id." };
      const create = await this.gh(["repo", "create", `${ownerLogin}/${repositoryName}`, visibility === "public" ? "--public" : "--private", ...(description ? ["--description", description] : [])]);
      if (create.status !== "succeeded") return { status: "failed", message: resultFromCommand(create, "Creating the destination repository") };
      const remote = await this.git(["remote", "get-url", "forge-publish"], sourcePath);
      if (remote.status !== "succeeded") {
        const add = await this.git(["remote", "add", "forge-publish", repositoryUrl], sourcePath);
        if (add.status !== "succeeded") return { status: "partial", message: resultFromCommand(add, "Adding the destination remote"), data: this.makeReceipt("partial", account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, resultFromCommand(add, "Adding the destination remote"), observedAt) };
      } else if (remote.stdout.trim() !== repositoryUrl && remote.stdout.trim() !== `${repositoryUrl}.git`) {
        return { status: "failed", message: "The local forge-publish remote already points somewhere else, so it was not changed." };
      }
      const pushed = await this.git(["push", "forge-publish", `HEAD:${defaultBranch}`], sourcePath, 120_000);
      if (pushed.status !== "succeeded") {
        const receipt = this.makeReceipt("partial", account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, resultFromCommand(pushed, "Pushing the local source"), observedAt);
        this.addReceipt(receipt);
        await this.record("updated", `forge publication ${repositoryName}`, receipt);
        return { status: "partial", message: receipt.message, receipt, data: receipt };
      }
    } else {
      const args = ["repo", "fork", sourceRemote!, "--remote=false"];
      if (ownerKind === "organization") args.push("--org", ownerLogin);
      const fork = await this.gh(args, 120_000);
      if (fork.status !== "succeeded") {
        const receipt = this.makeReceipt("failed", account, ownerId, route, repositoryName, repositoryUrl, undefined, resultFromCommand(fork, "Forking the source repository"), observedAt);
        this.addReceipt(receipt);
        return { status: "failed", message: receipt.message, receipt, data: receipt };
      }
    }
    const receipt = this.makeReceipt("succeeded", account, ownerId, route, repositoryName, repositoryUrl, sourceCommit, route === "fork" ? "The provider confirmed the fork request." : `The destination accepted commit ${sourceCommit}.`, observedAt);
    this.addReceipt(receipt);
    await this.record("created", `forge publication ${repositoryName}`, receipt);
    return { status: "succeeded", message: receipt.message, receipt, data: receipt };
  }

  private makeReceipt(status: ForgeReceipt["status"], account: ForgeAccount, ownerId: string, route: ForgePublishRoute, repositoryName: string, repositoryUrl: string, sourceCommit: string | undefined, message: string, observedAt: string): ForgeReceipt {
    return { id: `forge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, status, provider: account.provider, accountId: account.id, ownerId, route, repositoryName, repositoryUrl, sourceCommit, message, observedAt };
  }
}
