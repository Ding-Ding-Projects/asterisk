import { createHash, randomUUID } from 'node:crypto';
import type { ProcessExecutor, CommandResult } from './executor.js';
import type { TargetProfile } from './contracts.js';

export type FreePbxModuleAction = 'install' | 'enable' | 'disable' | 'update' | 'remove';

export interface FreePbxCatalogModule {
  moduleId: string;
  name: string;
  version: string;
  license: string;
  entitlementClass: 'open' | 'commercial' | 'unknown';
  dependencies: ReadonlyArray<{ moduleId: string; version: string }>;
  fwconsoleCommands: ReadonlyArray<{ name: string; class: string }>;
  apiCapabilities: ReadonlyArray<string>;
  sourceRevision: string | null;
  localInstalled: boolean;
  availabilityReason: string;
}

export interface FreePbxRuntimeModule {
  moduleId: string;
  catalogPresence: 'published' | 'local-only';
  catalogVersion: string | null;
  installed: boolean | null;
  enabled: boolean | null;
  version: string | null;
  license: string | null;
  entitlementClass: FreePbxCatalogModule['entitlementClass'] | 'unknown';
  dependencies: ReadonlyArray<{ moduleId: string; version: string }>;
  fwconsoleCommands: ReadonlyArray<{ name: string; class: string }>;
  apiCapabilities: ReadonlyArray<string>;
  sourceRevision: string | null;
  reason: string;
}

export interface FreePbxModuleActionResult {
  action: FreePbxModuleAction;
  moduleId: string;
  status: 'applied' | 'refused' | 'rolledBack' | 'failed';
  before: FreePbxRuntimeModule;
  after: FreePbxRuntimeModule;
  rollback?: { attempted: boolean; status: 'verified' | 'failed' | 'not-applicable'; reason: string };
  backup?: FreePbxBackupReceipt;
  message: string;
}

export interface FreePbxBackupReceipt {
  targetId: string;
  jobId: string;
  moduleId: string;
  action: FreePbxModuleAction;
  catalogRevision: string | null;
  nonce: string;
  digest: string;
  filesReceipt: string;
  databaseReceipt: string;
  source: 'official-freepbx-backup';
  observedAt: string;
  expiresAt: string;
}

export interface FreePbxBackupReceiptStore {
  issue(receipt: FreePbxBackupReceipt): void;
  consume(binding: { targetId: string; jobId: string; moduleId: string; action: FreePbxModuleAction; catalogRevision: string | null; nonce: string }): FreePbxBackupReceipt | undefined;
}

export interface FreePbxHandshake {
  targetId: string;
  targetKind: 'wsl' | 'localDocker' | 'remoteDocker' | 'remoteLinux';
  frameworkVersion: string | null;
  moduleAdmin: 'available' | 'unavailable' | 'unknown';
  database: 'available' | 'unavailable' | 'unknown';
  webService: 'available' | 'unavailable' | 'unknown';
  backup: 'available' | 'unavailable' | 'unknown';
  observedAt: string;
  reason: string;
}

export interface FreePbxBackupJob {
  jobId: string;
  label: string;
}

export interface FreePbxRuntimeOptions {
  executor: ProcessExecutor;
  target: Pick<TargetProfile, 'id' | 'displayName' | 'connectionKind' | 'wslDistribution' | 'dockerContext' | 'dockerProject'>;
  catalog: ReadonlyArray<FreePbxCatalogModule>;
  receipts: FreePbxBackupReceiptStore;
  now?: () => string;
}

const MODULE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/u;
const ACTIONS = new Set<FreePbxModuleAction>(['install', 'enable', 'disable', 'update', 'remove']);
const ACTION_COMMANDS: Readonly<Record<FreePbxModuleAction, string>> = {
  install: 'install',
  enable: 'enable',
  disable: 'disable',
  update: 'upgrade',
  remove: 'uninstall',
};

function resultMessage(result: CommandResult, args: ReadonlyArray<string>): string {
  return (result.stderr || result.stdout).trim() || `${args.join(' ')} exited with ${result.exitCode ?? 'no exit code'}.`;
}

function parseEnabled(value: string): boolean | null {
  const normalized = value.toLowerCase();
  if (/\b(enabled|active|running)\b/u.test(normalized)) return true;
  if (/\b(disabled|inactive|not installed|broken)\b/u.test(normalized)) return false;
  return null;
}

function parseInstalled(value: string): boolean | null {
  const normalized = value.toLowerCase();
  if (/\b(not installed|missing|uninstalled)\b/u.test(normalized)) return false;
  if (/\b(installed|enabled|disabled|active|inactive|running|broken)\b/u.test(normalized)) return true;
  return null;
}

function parseVersion(value: string): string | null {
  const match = /\b(\d+\.\d+(?:\.\d+)*(?:[-+][0-9a-z.-]+)?)\b/iu.exec(value);
  return match?.[1] ?? null;
}

function versionParts(value: string | null): number[] {
  return (value ?? '').split('.').slice(0, 4).map((part) => Number.parseInt(part.replace(/\D.*$/u, ''), 10)).map((part) => Number.isFinite(part) ? part : 0);
}

function compareVersions(left: string | null, right: string | null): number {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function parseModuleRows(output: string): Map<string, { version: string | null; enabled: boolean | null; detail: string }> {
  const rows = new Map<string, { version: string | null; enabled: boolean | null; detail: string }>();
  for (const rawLine of output.split(/\r?\n/u)) {
    const line = rawLine.replaceAll('|', ' ').trim();
    const match = /^([a-z0-9][a-z0-9_-]{0,63})\s+([^\s]+)(?:\s+(.*))?$/iu.exec(line);
    if (!match || match[1].toLowerCase() === 'module' || match[1].toLowerCase() === 'name') continue;
    const detail = match[3] ?? '';
    rows.set(match[1], { version: parseVersion(match[2]) ?? parseVersion(detail), enabled: parseEnabled(`${match[2]} ${detail}`), detail });
  }
  return rows;
}

function parseModuleDetails(output: string): { installed: boolean | null; version: string | null; enabled: boolean | null; license: string | null; dependencies: Array<{ moduleId: string; version: string }> } {
  let installed: boolean | null = null;
  let version: string | null = null;
  let enabled: boolean | null = null;
  let license: string | null = null;
  const dependencies: Array<{ moduleId: string; version: string }> = [];
  for (const line of output.split(/\r?\n/u)) {
    const match = /^\s*(version|status|license|depends?|dependencies?)\s*:\s*(.*?)\s*$/iu.exec(line);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2];
    if (key === 'version') version = parseVersion(value) ?? (value || null);
    else if (key === 'status') { installed = parseInstalled(value); enabled = parseEnabled(value); }
    else if (key === 'license') license = value || null;
    else if (key.startsWith('depend')) {
      for (const token of value.split(/[,\s]+/u).filter(Boolean)) {
        const dependency = /^(?<module>[a-z0-9][a-z0-9_-]*)(?:[:@](?<version>.+))?$/iu.exec(token);
        if (dependency?.groups?.module) dependencies.push({ moduleId: dependency.groups.module, version: dependency.groups.version ?? '' });
      }
    }
  }
  return { installed, version, enabled, license, dependencies };
}

export class FreePbxRuntimeAdapter {
  readonly #executor: ProcessExecutor;
  readonly #target: FreePbxRuntimeOptions['target'];
  readonly #catalog: ReadonlyArray<FreePbxCatalogModule>;
  readonly #receipts: FreePbxBackupReceiptStore;
  readonly #now: () => string;

  constructor(options: FreePbxRuntimeOptions) {
    if (!options.target.id.trim()) throw new Error('A FreePBX target is required.');
    if (options.target.connectionKind === 'wsl' && !options.target.wslDistribution?.trim()) throw new Error('A WSL distribution is required.');
    if (options.target.connectionKind === 'localDocker' && !options.target.dockerContext?.trim()) throw new Error('A local Docker target requires a discovered container id.');
    if (options.target.connectionKind === 'remoteDocker' || options.target.connectionKind === 'remoteLinux') throw new Error('Remote FreePBX targets are unavailable until an approved remote transport is configured.');
    this.#executor = options.executor;
    this.#target = options.target;
    this.#catalog = options.catalog;
    this.#receipts = options.receipts;
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  #catalogEntry(moduleId: string): FreePbxCatalogModule | undefined {
    return this.#catalog.find((module) => module.moduleId === moduleId);
  }

  async #run(args: ReadonlyArray<string>): Promise<CommandResult> {
    const command = this.#target.connectionKind === 'wsl'
      ? ['wsl.exe', ['-d', this.#target.wslDistribution!, '--', 'fwconsole', ...args]] as const
      : this.#target.connectionKind === 'localDocker' || this.#target.connectionKind === 'remoteDocker'
        ? ['docker', ['exec', this.#target.dockerContext!, 'fwconsole', ...args]] as const
        : null;
    if (!command) throw new Error('This target kind has no approved FreePBX fwconsole transport. Remote Linux and remote Docker require an approved remote transport before actions are enabled.');
    return this.#executor.execute({
      executable: command[0],
      args: command[1],
      timeoutMs: 30_000,
      maxOutputBytes: 2 * 1024 * 1024,
    });
  }

  #merge(moduleId: string, row: { version: string | null; enabled: boolean | null; detail: string } | undefined, detail?: { installed: boolean | null; version: string | null; enabled: boolean | null; license: string | null; dependencies: Array<{ moduleId: string; version: string }> }): FreePbxRuntimeModule {
    const catalog = this.#catalogEntry(moduleId);
    const installed = detail?.installed ?? (row ? true : null);
    return {
      moduleId,
      catalogPresence: catalog ? 'published' : 'local-only',
      catalogVersion: catalog?.version ?? null,
      installed,
      enabled: detail?.enabled ?? row?.enabled ?? null,
      version: detail?.version ?? row?.version ?? null,
      license: detail?.license ?? catalog?.license ?? null,
      entitlementClass: catalog?.entitlementClass ?? 'unknown',
      dependencies: detail?.dependencies ?? catalog?.dependencies ?? [],
      fwconsoleCommands: catalog?.fwconsoleCommands ?? [],
      apiCapabilities: catalog?.apiCapabilities ?? [],
      sourceRevision: catalog?.sourceRevision ?? null,
      reason: catalog?.availabilityReason ?? (catalog ? 'Installed state was read from fwconsole.' : 'Installed module was reported by fwconsole but has no matching public catalog metadata.'),
    };
  }

  async listModules(): Promise<{ observedAt: string; modules: FreePbxRuntimeModule[]; source: string; reason?: string }> {
    const result = await this.#run(['ma', 'list']);
    if (result.status !== 'succeeded') throw new Error(resultMessage(result, ['fwconsole', 'ma', 'list']));
    const rows = parseModuleRows(result.stdout);
    const modules = this.#catalog.map((catalog) => this.#merge(catalog.moduleId, rows.get(catalog.moduleId)));
    for (const [moduleId, row] of rows) if (!this.#catalogEntry(moduleId)) modules.push(this.#merge(moduleId, row));
    return { observedAt: this.#now(), modules: modules.sort((a, b) => a.moduleId.localeCompare(b.moduleId)), source: 'fwconsole ma list' };
  }

  async handshake(): Promise<FreePbxHandshake> {
    const version = await this.#run(['--version']);
    const modules = await this.#run(['ma', 'list']);
    const backup = await this.#run(['backup', '--list']);
    const frameworkVersion = version.status === 'succeeded' ? parseVersion(version.stdout) : null;
    return {
      targetId: this.#target.id,
      targetKind: this.#target.connectionKind,
      frameworkVersion,
      moduleAdmin: modules.status === 'succeeded' ? 'available' : 'unavailable',
      database: 'unknown',
      webService: 'unknown',
      backup: backup.status === 'succeeded' ? 'available' : 'unavailable',
      observedAt: this.#now(),
      reason: modules.status !== 'succeeded'
        ? resultMessage(modules, ['fwconsole', 'ma', 'list'])
        : 'Framework version and module manager were read. Database and web-service health require their published target APIs; no direct SQL probe is used.',
    };
  }

  async createBackup(binding: { jobId: string; moduleId: string; action: FreePbxModuleAction; catalogRevision: string | null }): Promise<FreePbxBackupReceipt> {
    const { jobId, moduleId, action, catalogRevision } = binding;
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/iu.test(jobId)) throw new Error('A backup job ID must be a bounded identifier from the target backup catalog.');
    if (!MODULE_ID.test(moduleId)) throw new Error('A backup receipt must name a bounded FreePBX module identifier.');
    const result = await this.#run(['backup', '--run', jobId]);
    if (result.status !== 'succeeded') throw new Error(resultMessage(result, ['fwconsole', 'backup', '--run', jobId]));
    const output = result.stdout.trim();
    if (!/\b(?:file|files)\b[^\r\n]*(?:ok|complete|success)/iu.test(output) || !/\b(?:database|db)\b[^\r\n]*(?:ok|complete|success)/iu.test(output)) {
      throw new Error('The official backup command returned without independently identifying completed file and database backups.');
    }
    const observedAt = this.#now();
    const expiresAt = new Date(Date.parse(observedAt) + 5 * 60_000).toISOString();
    const digest = createHash('sha256').update(`${this.#target.id}\n${jobId}\n${moduleId}\n${action}\n${catalogRevision ?? ''}\n${output}`).digest('hex');
    const receipt: FreePbxBackupReceipt = {
      targetId: this.#target.id,
      jobId,
      moduleId,
      action,
      catalogRevision,
      nonce: randomUUID(),
      digest,
      filesReceipt: `fwconsole-backup:${digest}:files`,
      databaseReceipt: `fwconsole-backup:${digest}:database`,
      source: 'official-freepbx-backup',
      observedAt,
      expiresAt,
    };
    this.#receipts.issue(receipt);
    return receipt;
  }

  async listBackupJobs(): Promise<FreePbxBackupJob[]> {
    const result = await this.#run(['backup', '--list']);
    if (result.status !== 'succeeded') throw new Error(resultMessage(result, ['fwconsole', 'backup', '--list']));
    return result.stdout.split(/\r?\n/u).map((line) => line.replaceAll('|', ' ').trim()).flatMap((line) => {
      const match = /^([a-z0-9][a-z0-9_-]{0,63})\s+(.*)$/iu.exec(line);
      return match && !/^(job|id|name)\b/iu.test(match[1]) ? [{ jobId: match[1], label: match[2].trim() || match[1] }] : [];
    });
  }

  async readModule(moduleId: string): Promise<FreePbxRuntimeModule> {
    if (!MODULE_ID.test(moduleId)) throw new Error('Module ID must be a bounded FreePBX module identifier.');
    const result = await this.#run(['ma', 'show', moduleId]);
    if (result.status !== 'succeeded') {
      const catalog = this.#catalogEntry(moduleId);
      return {
        moduleId,
        catalogPresence: catalog ? 'published' : 'local-only',
        catalogVersion: catalog?.version ?? null,
        installed: null,
        enabled: null,
        version: null,
        license: catalog?.license ?? null,
        entitlementClass: catalog?.entitlementClass ?? 'unknown',
        dependencies: catalog?.dependencies ? [...catalog.dependencies] : [],
        fwconsoleCommands: catalog?.fwconsoleCommands ?? [],
        apiCapabilities: catalog?.apiCapabilities ?? [],
        sourceRevision: catalog?.sourceRevision ?? null,
        reason: resultMessage(result, ['fwconsole', 'ma', 'show', moduleId]),
      };
    }
    const details = parseModuleDetails(result.stdout);
    return this.#merge(moduleId, undefined, details);
  }

  async action(request: { moduleId: string; action: FreePbxModuleAction; confirmed: boolean; expectedRevision?: string | null; backup?: FreePbxBackupReceipt }): Promise<FreePbxModuleActionResult> {
    if (!MODULE_ID.test(request.moduleId)) throw new Error('Module ID must be a bounded FreePBX module identifier.');
    if (!ACTIONS.has(request.action)) throw new Error(`Unsupported FreePBX module action: ${request.action}`);
    const catalog = this.#catalogEntry(request.moduleId);
    const before = await this.readModule(request.moduleId);
    const handshake = await this.handshake();
    if (handshake.moduleAdmin !== 'available' || handshake.backup !== 'available' || handshake.database !== 'available' || handshake.webService !== 'available') {
      return { action: request.action, moduleId: request.moduleId, status: 'refused', before, after: before, message: `FreePBX capability handshake is not complete. Module admin=${handshake.moduleAdmin}, database=${handshake.database}, webService=${handshake.webService}, backup=${handshake.backup}.` };
    }
    if (!catalog || catalog.entitlementClass !== 'open') {
      return { action: request.action, moduleId: request.moduleId, status: 'refused', before, after: before, message: 'The module has no verified open entitlement in the published catalog, so mutation is refused.' };
    }
    if (request.action !== 'install' && catalog.dependencies.length > 0 && before.dependencies.length === 0) {
      return { action: request.action, moduleId: request.moduleId, status: 'refused', before, after: before, message: 'Dependency state is unknown for this module, so mutation is refused until the target reports every required dependency.' };
    }
    const dependencyVersions = new Map(before.dependencies.map((dependency) => [dependency.moduleId, dependency.version]));
    const missingDependency = catalog.dependencies.find((dependency) => !dependencyVersions.has(dependency.moduleId) || compareVersions(dependencyVersions.get(dependency.moduleId) ?? null, dependency.version) < 0);
    if (missingDependency && request.action !== 'install') {
      return { action: request.action, moduleId: request.moduleId, status: 'refused', before, after: before, message: `Dependency ${missingDependency.moduleId} does not satisfy the published version requirement ${missingDependency.version}.` };
    }
    if (!request.backup || request.backup.source !== 'official-freepbx-backup' || !request.backup.filesReceipt || !request.backup.databaseReceipt) {
      return { action: request.action, moduleId: request.moduleId, status: 'refused', before, after: before, message: 'A verified official FreePBX file and database backup receipt is required before a module action can be sent.' };
    }
    const consumed = this.#receipts.consume({ targetId: this.#target.id, jobId: request.backup.jobId, moduleId: request.moduleId, action: request.action, catalogRevision: request.expectedRevision ?? null, nonce: request.backup.nonce });
    if (!consumed) return { action: request.action, moduleId: request.moduleId, status: 'refused', before, after: before, message: 'The backup receipt is stale, already consumed, or bound to a different target, module, action, or catalog revision.' };
    if (!request.confirmed && (request.action === 'remove' || request.action === 'disable')) {
      return { action: request.action, moduleId: request.moduleId, status: 'refused', before, after: before, message: 'Confirmation is required before a destructive or availability-changing module action.' };
    }
    if (before.installed && before.version && catalog?.version && versionParts(before.version)[0] !== versionParts(catalog.version)[0] && request.action !== 'update') {
      return { action: request.action, moduleId: request.moduleId, status: 'refused', before, after: before, backup: request.backup, message: `Installed version ${before.version} is from a different major version than catalog version ${catalog.version}. Update or reconcile the target before this action.` };
    }
    if (request.expectedRevision && catalog?.sourceRevision && request.expectedRevision !== catalog.sourceRevision) {
      return { action: request.action, moduleId: request.moduleId, status: 'refused', before, after: before, backup: request.backup, message: 'The catalog revision changed. Refresh the module catalog before attempting this action.' };
    }
    const command = ['ma', ACTION_COMMANDS[request.action], request.moduleId];
    const result = await this.#run(command);
    if (result.status !== 'succeeded') {
      return { action: request.action, moduleId: request.moduleId, status: 'failed', before, after: before, backup: request.backup, message: resultMessage(result, ['fwconsole', ...command]) };
    }
    const after = await this.readModule(request.moduleId);
    const expectedInstalled = request.action === 'remove' ? false : request.action === 'install' || request.action === 'update' ? true : before.installed;
    const expectedEnabled = request.action === 'enable' ? true : request.action === 'disable' ? false : after.enabled;
    const versionMatches = request.action !== 'update' || compareVersions(after.version, catalog.version) === 0;
    const matches = after.installed === expectedInstalled && versionMatches && (request.action === 'enable' || request.action === 'disable' ? after.enabled === expectedEnabled : true);
    if (matches) return { action: request.action, moduleId: request.moduleId, status: 'applied', before, after, backup: request.backup, message: result.stdout.trim() || 'fwconsole confirmed the module action.' };

    const rollbackAction: FreePbxModuleAction | undefined = request.action === 'install' ? 'remove' : request.action === 'remove' ? 'install' : request.action === 'enable' ? 'disable' : request.action === 'disable' ? 'enable' : undefined;
    if (!rollbackAction) return { action: request.action, moduleId: request.moduleId, status: 'failed', before, after, backup: request.backup, rollback: { attempted: false, status: 'not-applicable', reason: 'The update command changed state but no safe inverse action is available.' }, message: 'fwconsole returned success, but the readback did not match the requested state.' };
    const rollback = await this.#run(['ma', ACTION_COMMANDS[rollbackAction], request.moduleId]);
    const restored = await this.readModule(request.moduleId);
    const restoredMatch = restored.installed === before.installed && (before.enabled === null || restored.enabled === before.enabled);
    return {
      action: request.action,
      moduleId: request.moduleId,
      status: restoredMatch ? 'rolledBack' : 'failed',
      before,
      after: restored,
      backup: request.backup,
      rollback: { attempted: true, status: restoredMatch ? 'verified' : 'failed', reason: rollback.status === 'succeeded' ? 'Inverse fwconsole action was sent and read back.' : resultMessage(rollback, ['fwconsole', 'ma', ACTION_COMMANDS[rollbackAction], request.moduleId]) },
      message: restoredMatch ? 'The requested state did not read back, so the inverse action restored the prior state.' : 'The requested state did not read back and rollback did not restore the prior state.',
    };
  }
}
