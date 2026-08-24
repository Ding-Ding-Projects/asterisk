import type { ProcessExecutor, CommandResult } from './executor.js';

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
  installed: boolean;
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
  message: string;
}

export interface FreePbxRuntimeOptions {
  executor: ProcessExecutor;
  distribution: string;
  catalog: ReadonlyArray<FreePbxCatalogModule>;
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
    if (key === 'version') version = parseVersion(value) ?? value || null;
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
  readonly #distribution: string;
  readonly #catalog: ReadonlyArray<FreePbxCatalogModule>;
  readonly #now: () => string;

  constructor(options: FreePbxRuntimeOptions) {
    if (!options.distribution.trim()) throw new Error('A WSL distribution is required.');
    this.#executor = options.executor;
    this.#distribution = options.distribution.trim();
    this.#catalog = options.catalog;
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  #catalogEntry(moduleId: string): FreePbxCatalogModule | undefined {
    return this.#catalog.find((module) => module.moduleId === moduleId);
  }

  async #run(args: ReadonlyArray<string>): Promise<CommandResult> {
    return this.#executor.execute({
      executable: 'wsl.exe',
      args: ['-d', this.#distribution, '--', 'fwconsole', ...args],
      timeoutMs: 30_000,
      maxOutputBytes: 2 * 1024 * 1024,
    });
  }

  #merge(moduleId: string, row: { version: string | null; enabled: boolean | null; detail: string } | undefined, detail?: { installed: boolean | null; version: string | null; enabled: boolean | null; license: string | null; dependencies: Array<{ moduleId: string; version: string }> }): FreePbxRuntimeModule {
    const catalog = this.#catalogEntry(moduleId);
    const installed = detail?.installed ?? Boolean(row || detail);
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

  async readModule(moduleId: string): Promise<FreePbxRuntimeModule> {
    if (!MODULE_ID.test(moduleId)) throw new Error('Module ID must be a bounded FreePBX module identifier.');
    const result = await this.#run(['ma', 'show', moduleId]);
    if (result.status !== 'succeeded') {
      const catalog = this.#catalogEntry(moduleId);
      return {
        moduleId,
        catalogPresence: catalog ? 'published' : 'local-only',
        catalogVersion: catalog?.version ?? null,
        installed: false,
        enabled: false,
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

  async action(request: { moduleId: string; action: FreePbxModuleAction; confirmed: boolean; expectedRevision?: string | null }): Promise<FreePbxModuleActionResult> {
    if (!MODULE_ID.test(request.moduleId)) throw new Error('Module ID must be a bounded FreePBX module identifier.');
    if (!ACTIONS.has(request.action)) throw new Error(`Unsupported FreePBX module action: ${request.action}`);
    const catalog = this.#catalogEntry(request.moduleId);
    const before = await this.readModule(request.moduleId);
    if (!request.confirmed && (request.action === 'remove' || request.action === 'disable')) {
      return { action: request.action, moduleId: request.moduleId, status: 'refused', before, after: before, message: 'Confirmation is required before a destructive or availability-changing module action.' };
    }
    if (catalog?.entitlementClass === 'commercial') {
      return { action: request.action, moduleId: request.moduleId, status: 'refused', before, after: before, message: 'The published module metadata declares commercial entitlement. No license or vendor account was supplied, so the action was not sent.' };
    }
    if (request.expectedRevision && catalog?.sourceRevision && request.expectedRevision !== catalog.sourceRevision) {
      return { action: request.action, moduleId: request.moduleId, status: 'refused', before, after: before, message: 'The catalog revision changed. Refresh the module catalog before attempting this action.' };
    }
    const command = ['ma', ACTION_COMMANDS[request.action], request.moduleId];
    const result = await this.#run(command);
    if (result.status !== 'succeeded') {
      return { action: request.action, moduleId: request.moduleId, status: 'failed', before, after: before, message: resultMessage(result, ['fwconsole', ...command]) };
    }
    const after = await this.readModule(request.moduleId);
    const expectedInstalled = request.action === 'remove' ? false : request.action === 'install' || request.action === 'update' ? true : before.installed;
    const expectedEnabled = request.action === 'enable' ? true : request.action === 'disable' ? false : after.enabled;
    const matches = after.installed === expectedInstalled && (request.action === 'enable' || request.action === 'disable' ? after.enabled === expectedEnabled : true);
    if (matches) return { action: request.action, moduleId: request.moduleId, status: 'applied', before, after, message: result.stdout.trim() || 'fwconsole confirmed the module action.' };

    const rollbackAction: FreePbxModuleAction | undefined = request.action === 'install' ? 'remove' : request.action === 'remove' ? 'install' : request.action === 'enable' ? 'disable' : request.action === 'disable' ? 'enable' : undefined;
    if (!rollbackAction) return { action: request.action, moduleId: request.moduleId, status: 'failed', before, after, rollback: { attempted: false, status: 'not-applicable', reason: 'The update command changed state but no safe inverse action is available.' }, message: 'fwconsole returned success, but the readback did not match the requested state.' };
    const rollback = await this.#run(['ma', ACTION_COMMANDS[rollbackAction], request.moduleId]);
    const restored = await this.readModule(request.moduleId);
    const restoredMatch = restored.installed === before.installed && (before.enabled === null || restored.enabled === before.enabled);
    return {
      action: request.action,
      moduleId: request.moduleId,
      status: restoredMatch ? 'rolledBack' : 'failed',
      before,
      after: restored,
      rollback: { attempted: true, status: restoredMatch ? 'verified' : 'failed', reason: rollback.status === 'succeeded' ? 'Inverse fwconsole action was sent and read back.' : resultMessage(rollback, ['fwconsole', 'ma', ACTION_COMMANDS[rollbackAction], request.moduleId]) },
      message: restoredMatch ? 'The requested state did not read back, so the inverse action restored the prior state.' : 'The requested state did not read back and rollback did not restore the prior state.',
    };
  }
}
