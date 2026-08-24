import { randomUUID } from 'node:crypto';
import { access, lstat } from 'node:fs/promises';
import { basename, extname, isAbsolute, relative, resolve } from 'node:path';
import { normalizeOllamaRequestId, ollamaErrorMessage } from '../shared/ollama.js';
import type {
  OllamaDispatchHandlers,
  OllamaDispatchRequest,
  OllamaDispatchResponse,
  OllamaFitAssessment,
  OllamaHarnessLaunchResult,
  OllamaHarnessPreflight,
  OllamaHarnessProfile,
  OllamaHarnessSnapshot,
} from '../shared/ollama.js';
import type { OllamaClient } from './ollama-client.js';
import type { OllamaHarnessPersistentState } from './ollama-store.js';

const MAX_PROFILES = 1_000;
const MAX_SNAPSHOTS = 2_000;
const MAX_ARGUMENT_VALUE = 4_096;
const MAX_ENVIRONMENT_VALUE = 8_192;
const SECRET_SUFFIXES = ['password', 'secret', 'token', 'credential', 'privatekey', 'apikey', 'accesstoken', 'refreshtoken'];
const FORBIDDEN_LAUNCHERS = new Set([
  'cmd', 'cmd.exe', 'powershell', 'powershell.exe', 'pwsh', 'pwsh.exe',
  'bash', 'bash.exe', 'sh', 'sh.exe', 'wsl', 'wsl.exe', 'cscript.exe', 'wscript.exe',
]);
const FORBIDDEN_EXTENSIONS = new Set(['.bat', '.cmd', '.ps1', '.vbs', '.js', '.jse', '.wsf']);

type SafeValue = string | number | boolean | null;

export interface HarnessArgumentRule {
  name: string;
  flag?: string;
  kind: 'string' | 'integer' | 'boolean' | 'enum' | 'model' | 'path';
  optional?: boolean;
  allowedValues?: readonly string[];
  pattern?: RegExp;
  minimum?: number;
  maximum?: number;
  allowedRoots?: readonly string[];
}

export interface HarnessEnvironmentRule {
  name: string;
  optional?: boolean;
  allowedValues?: readonly string[];
  pattern?: RegExp;
}

export interface HarnessExecutablePolicy {
  id: string;
  executable: string;
  argumentRules: readonly HarnessArgumentRule[];
  environmentRules: readonly HarnessEnvironmentRule[];
  workingDirectoryRoots: readonly string[];
  mutableConfigurationKeys: readonly string[];
}

export interface HarnessConfigurationAdapter {
  read(keys: readonly string[]): Promise<Readonly<Record<string, SafeValue>>>;
  apply(configuration: Readonly<Record<string, SafeValue>>): Promise<void>;
}

export interface HarnessProcessHandle {
  processId: number;
  exited: Promise<{ exitCode: number | null; reason?: string }>;
  terminate(): Promise<void>;
}

export interface HarnessProcessLauncher {
  launch(specification: {
    executable: string;
    argv: readonly string[];
    workingDirectory?: string;
    environment: Readonly<Record<string, string>>;
  }): Promise<HarnessProcessHandle>;
}

export interface HarnessHealthContext {
  profile: OllamaHarnessProfile;
  processId: number;
  signal: AbortSignal;
}

export interface HarnessStore {
  loadHarnessState(): Promise<OllamaHarnessPersistentState>;
  saveHarnessState(state: OllamaHarnessPersistentState): Promise<void>;
}

export interface OllamaHarnessOptions {
  client: OllamaClient;
  store: HarnessStore;
  policies: readonly HarnessExecutablePolicy[];
  configuration: HarnessConfigurationAdapter;
  launcher: HarnessProcessLauncher;
  healthChecks: Readonly<Record<string, (context: HarnessHealthContext) => Promise<boolean>>>;
  portAvailable: (port: number) => Promise<boolean>;
  fitAssessment?: (profile: OllamaHarnessProfile) => Promise<OllamaFitAssessment | undefined>;
  healthTimeoutMs?: number;
  now?: () => Date;
}

function requiredString(value: unknown, label: string, max = 512): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`${label} is missing, too long, or contains control characters.`);
  }
  return value.trim();
}

function assertSafeName(name: string, label: string): void {
  const normalized = name.replace(/[^a-z0-9]/giu, '').toLowerCase();
  if (normalized === 'key' || SECRET_SUFFIXES.some(suffix => normalized === suffix || normalized.endsWith(suffix))) {
    throw new Error(`${label} ${name} looks credential-bearing and is refused.`);
  }
}

function matches(pattern: RegExp, value: string): boolean {
  pattern.lastIndex = 0;
  return pattern.test(value);
}

function isInside(path: string, roots: readonly string[]): boolean {
  return roots.some(root => {
    const child = relative(resolve(root), resolve(path));
    return child === '' || (!child.startsWith('..') && !isAbsolute(child));
  });
}

function validatePolicy(policy: HarnessExecutablePolicy): HarnessExecutablePolicy {
  requiredString(policy.id, 'Harness executable policy id');
  if (!isAbsolute(policy.executable)) throw new Error(`Harness executable for ${policy.id} must be an absolute path.`);
  const executableName = basename(policy.executable).toLowerCase();
  if (FORBIDDEN_LAUNCHERS.has(executableName) || FORBIDDEN_EXTENSIONS.has(extname(executableName))) {
    throw new Error(`Harness policy ${policy.id} cannot use a shell, script host, or script file.`);
  }
  const argumentNames = new Set<string>();
  for (const rule of policy.argumentRules) {
    const name = requiredString(rule.name, 'Harness argument name', 128);
    assertSafeName(name, 'Harness argument');
    if (argumentNames.has(name)) throw new Error(`Harness policy ${policy.id} repeats argument ${name}.`);
    argumentNames.add(name);
    if (rule.flag !== undefined && !/^--?[a-z][a-z0-9-]*$/u.test(rule.flag)) {
      throw new Error(`Harness argument ${name} has an invalid fixed flag.`);
    }
    if (rule.kind === 'enum' && (!rule.allowedValues || rule.allowedValues.length === 0)) {
      throw new Error(`Harness enum argument ${name} has no allowed values.`);
    }
    if (rule.kind === 'boolean' && !rule.flag) throw new Error(`Harness boolean argument ${name} needs a fixed flag.`);
    if (rule.kind === 'path' && (!rule.allowedRoots || rule.allowedRoots.length === 0)) {
      throw new Error(`Harness path argument ${name} has no allowed roots.`);
    }
  }
  const environmentNames = new Set<string>();
  for (const rule of policy.environmentRules) {
    const name = requiredString(rule.name, 'Harness environment name', 128);
    assertSafeName(name, 'Harness environment key');
    if (!/^[A-Z_][A-Z0-9_]*$/u.test(name)) throw new Error(`Harness environment key ${name} is invalid.`);
    if (environmentNames.has(name)) throw new Error(`Harness policy ${policy.id} repeats environment key ${name}.`);
    environmentNames.add(name);
  }
  for (const key of policy.mutableConfigurationKeys) assertSafeName(requiredString(key, 'Configuration key', 256), 'Configuration key');
  return policy;
}

function argumentValue(rule: HarnessArgumentRule, value: unknown, model: string): string[] {
  if (rule.kind === 'model') {
    if (value !== undefined && value !== model) throw new Error(`Harness model argument ${rule.name} must match the selected model.`);
    value = model;
  }
  if (value === undefined) {
    if (rule.optional) return [];
    else throw new Error(`Harness argument ${rule.name} is required.`);
  }
  let encoded: string;
  if (rule.kind === 'boolean') {
    if (typeof value !== 'boolean') throw new Error(`Harness argument ${rule.name} must be boolean.`);
    if (!value) return [];
    encoded = 'true';
  } else if (rule.kind === 'integer') {
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error(`Harness argument ${rule.name} must be an integer.`);
    if (rule.minimum !== undefined && value < rule.minimum) throw new Error(`Harness argument ${rule.name} is below its minimum.`);
    if (rule.maximum !== undefined && value > rule.maximum) throw new Error(`Harness argument ${rule.name} is above its maximum.`);
    encoded = String(value);
  } else {
    encoded = requiredString(value, `Harness argument ${rule.name}`, MAX_ARGUMENT_VALUE);
  }
  if (rule.kind === 'enum' && !rule.allowedValues?.includes(encoded)) throw new Error(`Harness argument ${rule.name} is not an allowed value.`);
  if (rule.kind === 'path') {
    if (!isAbsolute(encoded) || !isInside(encoded, rule.allowedRoots ?? [])) {
      throw new Error(`Harness path argument ${rule.name} is outside its allowed roots.`);
    }
  }
  if (rule.pattern && !matches(rule.pattern, encoded)) throw new Error(`Harness argument ${rule.name} does not match its allowlist.`);
  if (rule.kind === 'boolean') return rule.flag ? [rule.flag] : [];
  return rule.flag ? [rule.flag, encoded] : [encoded];
}

function safeConfiguration(
  configuration: Readonly<Record<string, SafeValue>>,
  policy: HarnessExecutablePolicy,
): Readonly<Record<string, SafeValue>> {
  const allowed = new Set(policy.mutableConfigurationKeys);
  const result: Record<string, SafeValue> = {};
  for (const [key, value] of Object.entries(configuration)) {
    assertSafeName(key, 'Configuration key');
    if (!allowed.has(key)) throw new Error(`Configuration key ${key} is not allowlisted for this harness.`);
    if (value !== null && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      throw new Error(`Configuration value ${key} is not a safe primitive.`);
    }
    if (typeof value === 'string' && value.length > MAX_ENVIRONMENT_VALUE) {
      throw new Error(`Configuration value ${key} exceeds the string length bound.`);
    }
    result[key] = value;
  }
  return result;
}

export class OllamaHarnessManager {
  readonly #client: OllamaClient;
  readonly #store: HarnessStore;
  readonly #policies: Map<string, HarnessExecutablePolicy>;
  readonly #configuration: HarnessConfigurationAdapter;
  readonly #launcher: HarnessProcessLauncher;
  readonly #healthChecks: Readonly<Record<string, (context: HarnessHealthContext) => Promise<boolean>>>;
  readonly #portAvailable: (port: number) => Promise<boolean>;
  readonly #fitAssessment?: (profile: OllamaHarnessProfile) => Promise<OllamaFitAssessment | undefined>;
  readonly #healthTimeoutMs: number;
  readonly #now: () => Date;

  constructor(options: OllamaHarnessOptions) {
    this.#client = options.client;
    this.#store = options.store;
    this.#policies = new Map(options.policies.map(policy => [policy.id, validatePolicy(policy)]));
    if (this.#policies.size !== options.policies.length) throw new Error('Harness executable policy ids must be unique.');
    this.#configuration = options.configuration;
    this.#launcher = options.launcher;
    this.#healthChecks = options.healthChecks;
    this.#portAvailable = options.portAvailable;
    this.#fitAssessment = options.fitAssessment;
    this.#healthTimeoutMs = Math.max(1_000, Math.min(options.healthTimeoutMs ?? 30_000, 300_000));
    this.#now = options.now ?? (() => new Date());
  }

  async listProfiles(): Promise<readonly OllamaHarnessProfile[]> {
    return structuredClone((await this.#store.loadHarnessState()).profiles);
  }

  async registerProfile(profile: OllamaHarnessProfile): Promise<OllamaHarnessProfile> {
    await this.#compile(profile);
    const state = await this.#store.loadHarnessState();
    const profiles = [...state.profiles];
    const index = profiles.findIndex(item => item.id === profile.id);
    if (index >= 0) profiles[index] = structuredClone(profile);
    else profiles.push(structuredClone(profile));
    if (profiles.length > MAX_PROFILES) throw new Error(`Harness profiles exceeded ${MAX_PROFILES}.`);
    await this.#store.saveHarnessState({ ...state, profiles });
    return structuredClone(profile);
  }

  async #profile(id: string): Promise<OllamaHarnessProfile> {
    const profile = (await this.#store.loadHarnessState()).profiles.find(item => item.id === id);
    if (!profile) throw new Error(`Harness profile ${id} does not exist.`);
    return profile;
  }

  async #compile(profile: OllamaHarnessProfile): Promise<{ policy: HarnessExecutablePolicy; argv: string[]; environment: Record<string, string> }> {
    requiredString(profile.id, 'Harness profile id');
    requiredString(profile.name, 'Harness profile name');
    requiredString(profile.model, 'Harness model');
    const policy = this.#policies.get(profile.executableId);
    if (!policy) throw new Error(`Harness executable policy ${profile.executableId} is not registered.`);
    const suppliedArguments = new Set(Object.keys(profile.arguments));
    const argv: string[] = [];
    for (const rule of policy.argumentRules) {
      suppliedArguments.delete(rule.name);
      argv.push(...argumentValue(rule, profile.arguments[rule.name], profile.model));
    }
    if (suppliedArguments.size > 0) throw new Error(`Harness profile contains unrecognized arguments: ${[...suppliedArguments].join(', ')}.`);
    const environment: Record<string, string> = {};
    const suppliedEnvironment = new Set(Object.keys(profile.environment));
    for (const rule of policy.environmentRules) {
      suppliedEnvironment.delete(rule.name);
      const value = profile.environment[rule.name];
      if (value === undefined) {
        if (!rule.optional) throw new Error(`Harness environment key ${rule.name} is required.`);
        continue;
      }
      if (value.length > MAX_ENVIRONMENT_VALUE || rule.allowedValues && !rule.allowedValues.includes(value) || rule.pattern && !matches(rule.pattern, value)) {
        throw new Error(`Harness environment key ${rule.name} does not match its allowlist.`);
      }
      environment[rule.name] = value;
    }
    if (suppliedEnvironment.size > 0) throw new Error(`Harness profile contains unrecognized environment keys: ${[...suppliedEnvironment].join(', ')}.`);
    safeConfiguration(profile.configuration, policy);
    if (profile.workingDirectory && !isInside(profile.workingDirectory, policy.workingDirectoryRoots)) {
      throw new Error('Harness working directory is outside its allowed roots.');
    }
    if (profile.requiredPorts.length > 64 || profile.requiredPorts.some(port => !Number.isInteger(port) || port < 1 || port > 65_535)) {
      throw new Error('Harness required ports are invalid or exceed the 64-port limit.');
    }
    if (new Set(profile.requiredPorts).size !== profile.requiredPorts.length) throw new Error('Harness required ports contain duplicates.');
    if (!this.#healthChecks[profile.healthCheckId]) throw new Error(`Harness health check ${profile.healthCheckId} is not registered.`);
    return { policy, argv, environment };
  }

  async preflight(id: string): Promise<OllamaHarnessPreflight> {
    const profile = await this.#profile(id);
    const { policy, argv, environment } = await this.#compile(profile);
    const blockers: string[] = [];
    const warnings: string[] = [];
    try {
      await access(policy.executable);
      const stat = await lstat(policy.executable);
      if (!stat.isFile() || stat.isSymbolicLink()) blockers.push('The allowlisted executable is missing, not a file, or is a symbolic link.');
    } catch {
      blockers.push('The allowlisted executable is not available.');
    }
    if (profile.workingDirectory) {
      try {
        const stat = await lstat(profile.workingDirectory);
        if (!stat.isDirectory() || stat.isSymbolicLink()) blockers.push('The working directory is missing, not a directory, or is a symbolic link.');
      } catch {
        blockers.push('The working directory is not available.');
      }
    }
    for (const rule of policy.argumentRules.filter(rule => rule.kind === 'path')) {
      const pathValue = profile.arguments[rule.name];
      if (pathValue === undefined && rule.optional) continue;
      if (typeof pathValue !== 'string') {
        blockers.push(`Path argument ${rule.name} is unavailable.`);
        continue;
      }
      try {
        const stat = await lstat(pathValue);
        if (stat.isSymbolicLink()) blockers.push(`Path argument ${rule.name} is a symbolic link and is refused.`);
      } catch {
        blockers.push(`Path argument ${rule.name} does not exist.`);
      }
    }
    for (const port of profile.requiredPorts) {
      try {
        if (!await this.#portAvailable(port)) blockers.push(`Required port ${port} is not available.`);
      } catch (error) {
        blockers.push(`Required port ${port} could not be checked: ${error instanceof Error ? error.message : 'check failed'}.`);
      }
    }
    try {
      const installed = await this.#client.installedModels();
      if (!installed.some(model => model.name === profile.model || model.model === profile.model)) {
        blockers.push(`Model ${profile.model} is not installed in local Ollama.`);
      }
    } catch (error) {
      blockers.push(`Local Ollama installed-model inventory is unavailable: ${error instanceof Error ? error.message : 'request failed'}.`);
    }
    let fit: OllamaFitAssessment | undefined;
    try {
      fit = await this.#fitAssessment?.(profile);
    } catch (error) {
      warnings.push(`Hardware-fit evidence is unavailable: ${error instanceof Error ? error.message : 'assessment failed'}.`);
    }
    if (fit?.verdict === 'unlikely') warnings.push('Hardware-fit evidence reports this model as unlikely to run.');
    if (fit?.verdict === 'unknown') warnings.push('Hardware-fit evidence is incomplete.');
    return {
      profileId: profile.id,
      allowed: blockers.length === 0,
      executable: policy.executable,
      argv,
      workingDirectory: profile.workingDirectory,
      environmentKeys: Object.keys(environment).sort(),
      model: profile.model,
      requiredPorts: [...profile.requiredPorts],
      blockers,
      warnings,
      fit,
    };
  }

  async #snapshot(profile: OllamaHarnessProfile, policy: HarnessExecutablePolicy): Promise<OllamaHarnessSnapshot> {
    const configuration = safeConfiguration(await this.#configuration.read(policy.mutableConfigurationKeys), policy);
    for (const key of policy.mutableConfigurationKeys) {
      if (!Object.hasOwn(configuration, key)) throw new Error(`Configuration snapshot did not include allowlisted key ${key}.`);
    }
    const snapshot: OllamaHarnessSnapshot = {
      id: randomUUID(),
      profileId: profile.id,
      createdAt: this.#now().toISOString(),
      configuration,
    };
    const state = await this.#store.loadHarnessState();
    const snapshots = [...state.snapshots, snapshot].slice(-MAX_SNAPSHOTS);
    await this.#store.saveHarnessState({ ...state, snapshots });
    return snapshot;
  }

  async restore(snapshotId: string): Promise<OllamaHarnessSnapshot> {
    const state = await this.#store.loadHarnessState();
    const snapshot = state.snapshots.find(item => item.id === snapshotId);
    if (!snapshot) throw new Error(`Harness snapshot ${snapshotId} does not exist.`);
    const profile = state.profiles.find(item => item.id === snapshot.profileId);
    if (!profile) throw new Error(`Harness profile ${snapshot.profileId} no longer exists.`);
    const policy = this.#policies.get(profile.executableId);
    if (!policy) throw new Error(`Harness executable policy ${profile.executableId} is not registered.`);
    for (const key of policy.mutableConfigurationKeys) {
      if (!Object.hasOwn(snapshot.configuration, key)) throw new Error(`Harness snapshot is missing configuration key ${key}.`);
    }
    await this.#configuration.apply(safeConfiguration(snapshot.configuration, policy));
    return structuredClone(snapshot);
  }

  async #rollback(snapshot: OllamaHarnessSnapshot, handle?: HarnessProcessHandle): Promise<{ restored: boolean; reason?: string }> {
    const problems: string[] = [];
    if (handle) {
      try {
        await handle.terminate();
      } catch (error) {
        problems.push(error instanceof Error ? `Process termination failed: ${error.message}` : 'Process termination failed.');
      }
    }
    try {
      await this.restore(snapshot.id);
    } catch (error) {
      problems.push(error instanceof Error ? `Configuration restore failed: ${error.message}` : 'Configuration restore failed.');
      return { restored: false, reason: problems.join(' ') };
    }
    return { restored: true, reason: problems.length > 0 ? problems.join(' ') : undefined };
  }

  async launch(id: string): Promise<OllamaHarnessLaunchResult> {
    const profile = await this.#profile(id);
    const compiled = await this.#compile(profile);
    const preflight = await this.preflight(id);
    if (!preflight.allowed) throw new Error(`Harness preflight failed: ${preflight.blockers.join(' ')}`);
    const snapshot = await this.#snapshot(profile, compiled.policy);
    let handle: HarnessProcessHandle | undefined;
    try {
      await this.#configuration.apply(safeConfiguration(profile.configuration, compiled.policy));
      handle = await this.#launcher.launch({
        executable: compiled.policy.executable,
        argv: compiled.argv,
        workingDirectory: profile.workingDirectory,
        environment: compiled.environment,
      });
      if (!Number.isInteger(handle.processId) || handle.processId < 1) throw new Error('Harness launcher returned an invalid process id.');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(new Error('Harness health verification timed out.')), this.#healthTimeoutMs);
      try {
        const outcome = await Promise.race([
          this.#healthChecks[profile.healthCheckId]!({ profile, processId: handle.processId, signal: controller.signal })
            .then(ready => ({ type: 'health' as const, ready })),
          handle.exited.then(exit => ({ type: 'exit' as const, exit })),
          new Promise<{ type: 'timeout' }>(resolve => controller.signal.addEventListener('abort', () => resolve({ type: 'timeout' }), { once: true })),
        ]);
        if (outcome.type === 'health' && outcome.ready) {
          return { profileId: profile.id, snapshotId: snapshot.id, state: 'ready', processId: handle.processId, rolledBack: false };
        }
        const rollback = await this.#rollback(snapshot, handle);
        const rollbackDetail = rollback.reason ? ` ${rollback.reason}` : '';
        if (outcome.type === 'timeout') {
          return { profileId: profile.id, snapshotId: snapshot.id, state: 'timed-out', processId: handle.processId, reason: `Harness health verification timed out.${rollbackDetail}`, rolledBack: rollback.restored };
        }
        if (outcome.type === 'exit') {
          return { profileId: profile.id, snapshotId: snapshot.id, state: 'exited', processId: handle.processId, reason: `${outcome.exit.reason ?? `Harness exited with code ${outcome.exit.exitCode}.`}${rollbackDetail}`, rolledBack: rollback.restored };
        }
        return { profileId: profile.id, snapshotId: snapshot.id, state: 'failed', processId: handle.processId, reason: `Harness health verification did not report ready.${rollbackDetail}`, rolledBack: rollback.restored };
      } finally {
        clearTimeout(timeout);
        controller.abort();
      }
    } catch (error) {
      const rollback = await this.#rollback(snapshot, handle);
      return {
        profileId: profile.id,
        snapshotId: snapshot.id,
        state: 'failed',
        processId: handle?.processId,
        reason: `${error instanceof Error ? error.message : 'Harness launch failed.'}${rollback.reason ? ` ${rollback.reason}` : ''}`,
        rolledBack: rollback.restored,
      };
    }
  }
}

function payloadId(request: OllamaDispatchRequest, key: string): string {
  if (request.payload === null || typeof request.payload !== 'object' || Array.isArray(request.payload)) {
    throw new Error('Harness action needs an object payload.');
  }
  return requiredString((request.payload as Record<string, unknown>)[key], `Harness ${key}`);
}

function failure(request: OllamaDispatchRequest, error: unknown): OllamaDispatchResponse {
  return {
    ok: false,
    requestId: normalizeOllamaRequestId(request.requestId),
    code: 'OLLAMA_HARNESS_OPERATION_FAILED',
    message: ollamaErrorMessage(error, 'The Ollama harness operation failed.'),
  };
}

export function createOllamaHarnessHandlers(manager: OllamaHarnessManager): OllamaDispatchHandlers {
  const wrap = <T>(fn: (request: OllamaDispatchRequest) => Promise<T>) => async (request: OllamaDispatchRequest) => {
    try {
      return { ok: true, requestId: normalizeOllamaRequestId(request.requestId), data: await fn(request) } as OllamaDispatchResponse<T>;
    } catch (error) {
      return failure(request, error) as OllamaDispatchResponse<T>;
    }
  };
  return {
    'ollama.harness.profiles': wrap(async () => ({ profiles: await manager.listProfiles() })),
    'ollama.harness.register': wrap(async request => {
      if (request.payload === null || typeof request.payload !== 'object' || Array.isArray(request.payload)) {
        throw new Error('Harness registration needs a profile object.');
      }
      const profile = (request.payload as Record<string, unknown>).profile;
      if (profile === null || typeof profile !== 'object' || Array.isArray(profile)) {
        throw new Error('Harness registration needs a profile object.');
      }
      return await manager.registerProfile(profile as OllamaHarnessProfile);
    }),
    'ollama.harness.preflight': wrap(async request => await manager.preflight(payloadId(request, 'profileId'))),
    'ollama.harness.launch': wrap(async request => await manager.launch(payloadId(request, 'profileId'))),
    'ollama.harness.restore': wrap(async request => await manager.restore(payloadId(request, 'snapshotId'))),
  } as OllamaDispatchHandlers;
}
