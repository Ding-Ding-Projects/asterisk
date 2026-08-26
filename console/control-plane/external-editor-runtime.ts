/** Privileged external-editor runtime for the Electron main process. */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { basename, delimiter, dirname, extname, isAbsolute, join, normalize, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { atomicWriteFileSync } from './atomic-file.js';
import type {
  ExternalEditorCandidate, ExternalEditorCustomRecord, ExternalEditorLaunchResult,
  ExternalEditorLaunchTarget, ExternalEditorOperation, ExternalEditorPickerReceipt, ExternalEditorStatus,
} from '../shared/control-plane.js';

type RuntimeDefinition = ExternalEditorCandidate & { command: string; fallbackPaths: string[]; folderArgs: string[]; fileArgs: string[] };
type Persisted = { version: 1; choiceId?: string; portableExecutable?: string; customEditors: ExternalEditorCustomRecord[] };

const MAX_RECORD_BYTES = 256 * 1024;
const MAX_EXPORT_BYTES = 8 * 1024 * 1024;
/** Completed handoffs retain recent immutable files so an editor never sees a later export's bytes. */
const MAX_RETAINED_COMPLETED_EXPORTS = 32;
const MAX_CUSTOM_EDITORS = 32;
const MAX_NAME = 80;
const MAX_PATH = 1024;
const OFFICIAL_DOWNLOADS = new Map([
  ['vscode', 'https://code.visualstudio.com/'],
  ['vscode-insiders', 'https://code.visualstudio.com/insiders/'],
  ['vscode-portable', 'https://code.visualstudio.com/download'],
  ['notepadpp', 'https://notepad-plus-plus.org/'],
  ['sublime', 'https://www.sublimetext.com/'],
]);

const KNOWN: RuntimeDefinition[] = [
  { id: 'vscode', name: 'Visual Studio Code', command: 'code', fallbackPaths: ['%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe', '%ProgramFiles%\\Microsoft VS Code\\Code.exe', '%ProgramFiles(x86)%\\Microsoft VS Code\\Code.exe'], folderArgs: ['--new-window'], fileArgs: [], supportsFolderWorkspace: true, downloadUrl: 'https://code.visualstudio.com/', custom: false, discovery: 'automatic', available: false, selected: false },
  { id: 'vscode-insiders', name: 'Visual Studio Code Insiders', command: 'code-insiders', fallbackPaths: ['%LOCALAPPDATA%\\Programs\\Microsoft VS Code Insiders\\Code - Insiders.exe', '%ProgramFiles%\\Microsoft VS Code Insiders\\Code - Insiders.exe', '%ProgramFiles(x86)%\\Microsoft VS Code Insiders\\Code - Insiders.exe'], folderArgs: ['--new-window'], fileArgs: [], supportsFolderWorkspace: true, downloadUrl: 'https://code.visualstudio.com/insiders/', custom: false, discovery: 'automatic', available: false, selected: false },
  { id: 'vscode-portable', name: 'Visual Studio Code Portable', command: 'code-portable', fallbackPaths: ['%USERPROFILE%\\Applications\\VSCode\\Code.exe', '%USERPROFILE%\\Tools\\VSCode\\Code.exe', '%LOCALAPPDATA%\\VSCode\\Code.exe'], folderArgs: ['--new-window'], fileArgs: [], supportsFolderWorkspace: true, downloadUrl: 'https://code.visualstudio.com/download', custom: false, discovery: 'automatic', available: false, selected: false },
  { id: 'notepadpp', name: 'Notepad++', command: 'notepad++', fallbackPaths: ['%ProgramFiles%\\Notepad++\\notepad++.exe'], folderArgs: [], fileArgs: [], supportsFolderWorkspace: false, downloadUrl: 'https://notepad-plus-plus.org/', custom: false, discovery: 'automatic', available: false, selected: false },
  { id: 'sublime', name: 'Sublime Text', command: 'subl', fallbackPaths: ['%ProgramFiles%\\Sublime Text\\subl.exe'], folderArgs: [], fileArgs: [], supportsFolderWorkspace: false, downloadUrl: 'https://www.sublimetext.com/', custom: false, discovery: 'automatic', available: false, selected: false },
  { id: 'notepad', name: 'Notepad', command: 'notepad.exe', fallbackPaths: [], folderArgs: [], fileArgs: [], supportsFolderWorkspace: false, downloadUrl: undefined, custom: false, discovery: 'automatic', available: false, selected: false },
];

function expand(value: string, env: NodeJS.ProcessEnv = process.env): string {
  return value.replace(/%([^%]+)%/gu, (_, key: string) => env[key] ?? `%${key}%`);
}

function safePath(value: string): string {
  return normalize(resolve(expand(value.trim())));
}

function isFile(path: string): boolean {
  try { return statSync(path).isFile(); } catch { return false; }
}

function isPortableVisualStudioCodeExecutable(path: string): boolean {
  if (process.platform !== 'win32' || !isFile(path)) return false;
  try {
    const output = execFileSync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      '$i=Get-Item -LiteralPath $env:EDITOR_IDENTITY_PATH; [pscustomobject]@{ProductName=$i.VersionInfo.ProductName;CompanyName=$i.VersionInfo.CompanyName;OriginalFilename=$i.VersionInfo.OriginalFilename} | ConvertTo-Json -Compress',
    ], { env: { ...process.env, EDITOR_IDENTITY_PATH: path }, encoding: 'utf8', timeout: 1200, windowsHide: true }).trim();
    const metadata = JSON.parse(output) as { ProductName?: string; CompanyName?: string; OriginalFilename?: string };
    return /^Microsoft\s+Visual\s+Studio\s+Code(?:\s+Insiders)?$/iu.test(String(metadata.ProductName ?? '').trim())
      && /^Microsoft(?:\s+Corporation)?$/iu.test(String(metadata.CompanyName ?? '').trim())
      && /^(?:Code|Code - Insiders)\.exe$/iu.test(String(metadata.OriginalFilename ?? '').trim());
  } catch { return false; }
}

function resolveCommand(command: string, env: NodeJS.ProcessEnv): string | undefined {
  const direct = expand(command, env);
  if (isAbsolute(direct) && isFile(direct)) return safePath(direct);
  const roots = String(env.PATH ?? '').split(delimiter).filter(Boolean);
  const extensions = process.platform === 'win32'
    ? String(env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)
    : [''];
  for (const root of roots) {
    for (const extension of extensions) {
      const candidate = join(root, direct.toLowerCase().endsWith(extension.toLowerCase()) ? direct : `${direct}${extension}`);
      if (isFile(candidate)) return safePath(candidate);
    }
  }
  return undefined;
}

function validCustom(record: ExternalEditorCustomRecord): boolean {
  if (!record || typeof record !== 'object' || typeof record.name !== 'string' || typeof record.executable !== 'string') return false;
  const name = record.name.trim();
  const executable = record.executable.trim();
  if (record.id !== undefined && !/^custom:[a-z0-9-]{36}$/u.test(record.id)) return false;
  if (process.platform === 'win32' && !['.exe', '.com'].includes(extname(executable).toLowerCase())) return false;
  return name.length > 0 && name.length <= MAX_NAME && executable.length > 0 && executable.length <= MAX_PATH
    && !/[&|;<>^`\n\r]/u.test(executable) && !/^".*"$/u.test(executable);
}

export interface ExternalEditorRuntimeOptions { userDataPath: string; env?: NodeJS.ProcessEnv; spawnProcess?: typeof spawn; }

export class ExternalEditorRuntime {
  private readonly file: string;
  private readonly env: NodeJS.ProcessEnv;
  private readonly spawnProcess: typeof spawn;
  private config: Persisted;
  private persistenceState: 'valid' | 'missing' | 'invalid' = 'missing';
  private persistenceMessage: string | undefined;
  private activeOperation: ExternalEditorOperation | undefined;
  private activeChild: ReturnType<typeof spawn> | undefined;
  private activeCancel: (() => void) | undefined;
  private activeMaterializedDirectory: string | undefined;
  private readonly statusListeners = new Set<(status: ExternalEditorStatus) => void>();

  constructor(options: ExternalEditorRuntimeOptions) {
    this.file = join(options.userDataPath, 'external-editors.json');
    this.env = options.env ?? process.env;
    this.spawnProcess = options.spawnProcess ?? spawn;
    this.config = this.read();
  }

  private read(): Persisted {
    try {
      const text = readFileSync(this.file, 'utf8');
      if (Buffer.byteLength(text, 'utf8') > MAX_RECORD_BYTES) {
        this.persistenceState = 'invalid';
        this.persistenceMessage = 'The saved editor settings exceed the safe size limit. Reset them to start fresh.';
        return { version: 1, customEditors: [] };
      }
      const parsed = JSON.parse(text) as Partial<Persisted>;
      if (parsed.version !== 1 || !Array.isArray(parsed.customEditors)) throw new Error('unsupported editor settings schema');
      const customEditors = parsed.customEditors.filter(validCustom).slice(0, MAX_CUSTOM_EDITORS);
      this.persistenceState = customEditors.length === parsed.customEditors.length ? 'valid' : 'invalid';
      if (this.persistenceState === 'invalid') this.persistenceMessage = 'Some saved custom editor records were invalid and were withheld. Reset the editor settings to remove the corrupt records.';
      return { version: 1, choiceId: typeof parsed.choiceId === 'string' ? parsed.choiceId : undefined, portableExecutable: typeof parsed.portableExecutable === 'string' ? parsed.portableExecutable : undefined, customEditors };
    } catch (error) {
      if (!existsSync(this.file)) return { version: 1, customEditors: [] };
      this.persistenceState = 'invalid';
      this.persistenceMessage = `The saved editor settings could not be read: ${error instanceof Error ? error.message : String(error)}. Reset them to start fresh.`;
      return { version: 1, customEditors: [] };
    }
  }

  private persist(): boolean {
    const operation = this.beginOperation('persist');
    if (!operation) return false;
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      const text = JSON.stringify(this.config, null, 2);
      if (Buffer.byteLength(text, 'utf8') > MAX_RECORD_BYTES) throw new Error('The external-editor settings are too large.');
      this.updateOperation(operation, 0.5, 'Writing editor settings atomically.');
      atomicWriteFileSync(this.file, text);
      this.persistenceState = 'valid';
      this.persistenceMessage = undefined;
      this.finishOperation(operation, 'completed', 'Editor settings saved.');
      return true;
    } catch (error) {
      this.finishOperation(operation, 'failed', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  private candidates(): RuntimeDefinition[] {
    const known = KNOWN.map((definition) => {
      const portable = definition.id === 'vscode-portable' && this.config.portableExecutable ? safePath(this.config.portableExecutable) : undefined;
      const explicitPortable = !!portable && isPortableVisualStudioCodeExecutable(portable);
      const discovered = resolveCommand(definition.command, this.env)
        ?? definition.fallbackPaths.map((candidate) => safePath(candidate)).find((candidate) => definition.id === 'vscode-portable' ? isPortableVisualStudioCodeExecutable(candidate) : isFile(candidate));
      const resolved = explicitPortable ? portable : (definition.id === 'vscode-portable' && discovered && !isPortableVisualStudioCodeExecutable(discovered) ? undefined : discovered);
      return { ...definition, resolved, discovery: explicitPortable ? 'explicit' : definition.discovery, available: !!resolved, selected: definition.id === this.config.choiceId };
    });
    const custom = this.config.customEditors.map((record) => {
      const resolved = safePath(record.executable);
      return {
        id: record.id!, name: record.name, command: resolved, fallbackPaths: [], resolved, available: isFile(resolved), selected: record.id === this.config.choiceId,
        supportsFolderWorkspace: record.supportsFolderWorkspace === true, folderArgs: [], fileArgs: [], custom: true, discovery: 'custom',
      } as RuntimeDefinition;
    });
    return [...known, ...custom];
  }

  status(): ExternalEditorStatus {
    const candidates = this.candidates();
    const available = candidates.filter((candidate) => candidate.available);
    return {
      selectedId: this.config.choiceId,
      editors: candidates.map(({ id, name, resolved, available: found, selected, supportsFolderWorkspace, downloadUrl, custom, discovery }) => ({ id, name, resolved: found ? resolved : undefined, available: found, selected, supportsFolderWorkspace, downloadUrl, custom, discovery })),
      noEditorMessage: available.length === 0 ? 'No supported editor is installed. The console works fully without one.' : undefined,
      persistenceState: this.persistenceState,
      persistenceMessage: this.persistenceMessage,
      operation: this.activeOperation,
    };
  }

  subscribeStatus(listener: (status: ExternalEditorStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status());
    return () => this.statusListeners.delete(listener);
  }

  private emitStatus(): void {
    const status = this.status();
    for (const listener of this.statusListeners) { try { listener(status); } catch { /* status observers cannot break the operation */ } }
  }

  private beginOperation(kind: ExternalEditorOperation['kind']): ExternalEditorOperation | undefined {
    if (this.activeOperation?.state === 'running') return undefined;
    if (this.activeOperation?.pending) return undefined;
    this.activeOperation = { operationId: randomUUID(), kind, state: 'running', progress: 0, message: `${kind} started.`, pending: true };
    this.emitStatus();
    return this.activeOperation;
  }

  private updateOperation(operation: ExternalEditorOperation, progress: number, message: string): void {
    this.activeOperation = { ...operation, progress: Math.max(0, Math.min(1, progress)), message };
    this.emitStatus();
  }

  private finishOperation(operation: ExternalEditorOperation, state: ExternalEditorOperation['state'], message: string): ExternalEditorOperation {
    const finished = { ...operation, state, progress: state === 'completed' ? 1 : operation.progress, message, pending: false };
    this.activeOperation = finished;
    this.emitStatus();
    return finished;
  }

  cancelOperation(operationId: string): ExternalEditorStatus {
    if (!this.activeOperation || this.activeOperation.operationId !== operationId || this.activeOperation.state !== 'running') return this.status();
    if (this.activeOperation.kind === 'pick-executable' || this.activeOperation.kind === 'pick-folder') {
      this.activeOperation = { ...this.activeOperation, state: 'cancelled', message: 'Picker cancellation requested. Waiting for the native picker to close.', pending: true };
      this.emitStatus();
    } else if (this.activeCancel) this.activeCancel();
    else this.finishOperation(this.activeOperation, 'cancelled', 'Operation cancelled.');
    return this.status();
  }

  beginPicker(kind: 'pick-executable' | 'pick-folder'): ExternalEditorOperation | undefined {
    return this.beginOperation(kind);
  }

  busyPickerReceipt(kind: 'pick-executable' | 'pick-folder'): ExternalEditorPickerReceipt {
    const operation: ExternalEditorOperation = { operationId: randomUUID(), kind, state: 'failed', progress: 1, message: 'Another editor operation is already running.', pending: false };
    return { operationId: operation.operationId, kind, canceled: true, reason: 'busy', operation };
  }

  completePicker(operationId: string, kind: 'pick-executable' | 'pick-folder', value: string | undefined, userCancelled: boolean): ExternalEditorPickerReceipt {
    const active = this.activeOperation;
    if (!active || active.operationId !== operationId || active.kind !== kind) {
      const operation: ExternalEditorOperation = { operationId, kind, state: 'failed', progress: 1, message: 'Picker operation was not found.', pending: false };
      return { operationId, kind, canceled: true, reason: 'failed', operation };
    }
    if (active.state === 'cancelled') {
      const operation = this.finishOperation(active, 'cancelled', 'Picker cancelled by the user.');
      return { operationId, kind, canceled: true, reason: 'programmatic-cancelled', operation };
    }
    if (userCancelled || !value) {
      const operation = this.finishOperation(active, 'cancelled', 'Picker cancelled by the user.');
      return { operationId, kind, canceled: true, reason: 'user-cancelled', operation };
    }
    this.updateOperation(active, 0.8, `${kind} selection received.`);
    const operation = this.finishOperation(this.activeOperation!, 'completed', `${kind} completed.`);
    return { operationId, kind, canceled: false, value, reason: 'picked', operation };
  }

  failPicker(operationId: string, kind: 'pick-executable' | 'pick-folder', message: string): ExternalEditorPickerReceipt {
    const active = this.activeOperation;
    if (!active || active.operationId !== operationId || active.kind !== kind) {
      const operation: ExternalEditorOperation = { operationId, kind, state: 'failed', progress: 1, message, pending: false };
      return { operationId, kind, canceled: true, reason: 'failed', operation };
    }
    const operation = this.finishOperation(active, 'failed', message);
    return { operationId, kind, canceled: true, reason: 'failed', operation };
  }

  choose(editorId: string): ExternalEditorStatus {
    const candidate = this.candidates().find((entry) => entry.id === editorId && entry.available);
    if (!candidate) throw new Error('That editor is not currently available on this computer.');
    const previous = this.config;
    this.config = { ...this.config, choiceId: editorId };
    if (!this.persist()) this.config = previous;
    return this.status();
  }

  clearChoice(): ExternalEditorStatus {
    const previous = this.config;
    this.config = { ...this.config, choiceId: undefined };
    if (!this.persist()) this.config = previous;
    return this.status();
  }

  resetStorage(): ExternalEditorStatus {
    const previous = this.config;
    this.config = { version: 1, customEditors: [] };
    if (!this.persist()) this.config = previous;
    return this.status();
  }

  savePortable(executable: string): ExternalEditorStatus {
    if (!executable || !isPortableVisualStudioCodeExecutable(safePath(executable)) || extname(executable).toLowerCase() !== '.exe') throw new Error('Choose an existing Visual Studio Code executable whose Windows product metadata identifies Visual Studio Code.');
    const previous = this.config;
    this.config = { ...this.config, portableExecutable: safePath(executable), choiceId: 'vscode-portable' };
    if (!this.persist()) this.config = previous;
    return this.status();
  }

  openDownload(editorId?: string): { ok: boolean; message: string } {
    const id = editorId ?? this.config.choiceId;
    const url = id ? OFFICIAL_DOWNLOADS.get(id) : undefined;
    if (!url) return { ok: false, message: 'The editor id is unknown or stale, so no official download link is offered.' };
    return { ok: true, message: url };
  }

  saveCustom(record: ExternalEditorCustomRecord): ExternalEditorStatus {
    if (!validCustom(record)) throw new Error('Choose a bounded editor name and executable path without command-line syntax.');
    const id = record.id && /^custom:[a-z0-9-]{36}$/u.test(record.id) ? record.id : `custom:${randomUUID()}`;
    const next = { ...record, id, name: record.name.trim(), executable: safePath(record.executable) };
    const rest = this.config.customEditors.filter((entry) => entry.id !== id);
    if (rest.length >= MAX_CUSTOM_EDITORS) throw new Error(`Keep at most ${MAX_CUSTOM_EDITORS} custom editors.`);
    const previous = this.config;
    this.config = { ...this.config, customEditors: [...rest, next], choiceId: id };
    if (!this.persist()) this.config = previous;
    return this.status();
  }

  removeCustom(editorId: string): ExternalEditorStatus {
    const previous = this.config;
    this.config = { ...this.config, customEditors: this.config.customEditors.filter((entry) => entry.id !== editorId), choiceId: this.config.choiceId === editorId ? undefined : this.config.choiceId };
    if (!this.persist()) this.config = previous;
    return this.status();
  }

  launch(target: ExternalEditorLaunchTarget, editorId?: string): Promise<ExternalEditorLaunchResult> {
    const operation = this.beginOperation('launch');
    if (!operation) {
      const active = this.activeOperation!;
      return Promise.resolve({ ok: false, code: 'BUSY', message: 'Another editor operation is already running.', operationId: active.operationId, stage: 'launch' });
    }
    return this.launchWithOperation(target, editorId, operation);
  }

  private launchWithOperation(target: ExternalEditorLaunchTarget, editorId: string | undefined, operation: ExternalEditorOperation): Promise<ExternalEditorLaunchResult> {
    const stage: 'launch' | 'materialization' = operation.kind === 'materialize' ? 'materialization' : 'launch';
    if (!target || (target.kind !== 'file' && target.kind !== 'folder') || typeof target.path !== 'string') {
      this.finishOperation(operation, 'failed', 'The editor target was not a valid file or folder.');
      return Promise.resolve({ ok: false, code: 'INVALID_EDITOR', message: 'The editor target was not a valid file or folder.', operationId: operation.operationId, stage });
    }
    if (target.path.trim() === '') {
      this.finishOperation(operation, 'cancelled', 'Launch cancelled because no target was supplied.');
      return Promise.resolve({ ok: false, code: stage === 'materialization' ? 'MATERIALIZATION_CANCELLED' : 'LAUNCH_CANCELLED', message: 'Launch cancelled because there is no file or folder to open.', operationId: operation.operationId, stage, cancelled: true });
    }
    try { target = { ...target, path: safePath(target.path) }; }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.finishOperation(operation, 'failed', message);
      return Promise.resolve({ ok: false, code: 'INVALID_EDITOR', message: `The editor target could not be prepared: ${message}`, operationId: operation.operationId, stage });
    }
    this.updateOperation(operation, stage === 'materialization' ? 0.7 : 0.1, 'Checking the selected editor and target.');
    const id = editorId ?? this.config.choiceId;
    let candidate: RuntimeDefinition | undefined;
    try { candidate = this.candidates().find((entry) => entry.id === id && entry.available); }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.finishOperation(operation, 'failed', message);
      return Promise.resolve({ ok: false, code: 'INVALID_EDITOR', message: `The selected editor could not be prepared: ${message}`, operationId: operation.operationId, stage });
    }
    if (!candidate) { this.finishOperation(operation, 'failed', 'No selected editor is available.'); return Promise.resolve({ ok: false, code: 'NO_EDITOR', message: 'No selected editor is available. Choose one in settings, or install Visual Studio Code.', downloadUrl: 'https://code.visualstudio.com/', operationId: operation.operationId, stage }); }
    if (!existsSync(target.path)) { this.finishOperation(operation, 'failed', `The selected ${target.kind} is not available at the reported path.`); return Promise.resolve({ ok: false, code: 'EMPTY_TARGET', message: `The selected ${target.kind} is not available at the reported path.`, operationId: operation.operationId, stage }); }
    let targetStat: ReturnType<typeof statSync>;
    try { targetStat = statSync(target.path); } catch { this.finishOperation(operation, 'failed', `The selected ${target.kind} is not available at the reported path.`); return Promise.resolve({ ok: false, code: 'EMPTY_TARGET', message: `The selected ${target.kind} is not available at the reported path.`, operationId: operation.operationId, stage }); }
    if (target.kind === 'file' && !targetStat.isFile()) { this.finishOperation(operation, 'failed', 'The selected target is a folder, not a file.'); return Promise.resolve({ ok: false, code: 'EMPTY_TARGET', message: 'The selected target is a folder, not a file.', operationId: operation.operationId, stage }); }
    if (target.kind === 'folder' && !targetStat.isDirectory()) { this.finishOperation(operation, 'failed', 'The selected target is a file, not a folder.'); return Promise.resolve({ ok: false, code: 'EMPTY_TARGET', message: 'The selected target is a file, not a folder.', operationId: operation.operationId, stage }); }
    if (target.kind === 'folder' && !candidate.supportsFolderWorkspace) { this.finishOperation(operation, 'failed', `${candidate.name} can open files but does not provide a folder workspace.`); return Promise.resolve({ ok: false, code: 'FOLDER_UNSUPPORTED', message: `${candidate.name} can open files but does not provide a folder workspace.`, operationId: operation.operationId, stage }); }
    this.updateOperation(operation, stage === 'materialization' ? 0.85 : 0.45, `Starting ${candidate.name}.`);
    const executable = candidate.resolved!;
    const args = [...(target.kind === 'folder' ? candidate.folderArgs : candidate.fileArgs), target.path];
    return new Promise((resolveResult) => {
      let settled = false;
      let child: ReturnType<typeof spawn>;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (resultFactory: (progress: ExternalEditorOperation) => ExternalEditorLaunchResult, state: ExternalEditorOperation['state'], message: string) => { if (settled) return; settled = true; if (timer !== undefined) clearTimeout(timer); this.activeCancel = undefined; this.activeChild = undefined; const progress = this.finishOperation(operation, state, message); resolveResult(resultFactory(progress)); };
      try { child = this.spawnProcess(executable, args, { shell: false, windowsHide: true, detached: false, stdio: 'ignore' }); }
      catch (error) { const message = error instanceof Error ? error.message : String(error); finish(() => ({ ok: false, code: 'SPAWN_FAILED', message: `The editor could not be started: ${message}`, operationId: operation.operationId, stage }), 'failed', message); return; }
      this.activeCancel = () => {
        try { this.activeChild?.kill(); } catch { /* best effort */ }
        if (stage === 'materialization' && this.activeMaterializedDirectory) { try { rmSync(this.activeMaterializedDirectory, { recursive: true, force: true }); } catch { /* best effort */ } this.activeMaterializedDirectory = undefined; }
        finish((progress) => ({ ok: false, code: stage === 'materialization' ? 'MATERIALIZATION_CANCELLED' : 'LAUNCH_CANCELLED', message: `${stage === 'materialization' ? 'Materialization' : 'Launch'} cancelled by the user.`, operationId: operation.operationId, stage, cancelled: true }), 'cancelled', `${stage === 'materialization' ? 'Materialization' : 'Launch'} cancelled by the user.`);
      };
      this.activeChild = child;
      child.once('spawn', () => { child.unref(); finish((progress) => ({ ok: true, editorId: candidate.id, executable, args, target, pid: child.pid, operationId: operation.operationId, progress }), 'completed', `${candidate.name} launch acknowledged.`); });
      child.once('error', (error: Error) => finish(() => ({ ok: false, code: 'SPAWN_FAILED', message: `The editor could not be started: ${error.message}`, operationId: operation.operationId, stage }), 'failed', error.message));
      timer = setTimeout(() => { try { child.kill(); } catch { /* best effort */ } finish(() => ({ ok: false, code: 'SPAWN_FAILED', message: 'The editor did not acknowledge launch within the bounded startup window.', operationId: operation.operationId, stage }), 'failed', 'The editor did not acknowledge launch within the bounded startup window.'); }, 1500);
      if (typeof timer === 'object' && timer !== null && 'unref' in timer) (timer as { unref(): void }).unref();
    });
  }

  async openExport(input: { name: string; content: string; source?: string; editorId?: string }): Promise<ExternalEditorLaunchResult> {
    return this.openMaterializedFile({ ...input, source: input.source ?? 'renderer export' });
  }

  private removeMaterialization(directory: string | undefined): void {
    if (!directory) return;
    try { rmSync(directory, { recursive: true, force: true }); } catch { /* best effort task-owned cleanup */ }
  }

  private retainCompletedMaterializations(root: string, currentDirectory: string): void {
    const completed = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^[a-f0-9-]{36}$/iu.test(entry.name))
      .map((entry) => {
        const directory = join(root, entry.name);
        return { directory, modified: statSync(directory).mtimeMs };
      })
      .sort((left, right) => right.modified - left.modified || right.directory.localeCompare(left.directory));
    const retained = new Set(completed.slice(0, MAX_RETAINED_COMPLETED_EXPORTS).map((entry) => entry.directory));
    retained.add(currentDirectory);
    for (const entry of completed) {
      if (!retained.has(entry.directory)) this.removeMaterialization(entry.directory);
    }
  }

  async openMaterializedFile(input: { name: string; content: string; source: string; editorId?: string }): Promise<ExternalEditorLaunchResult> {
    const operation = this.beginOperation('materialize');
    if (!operation) { const active = this.activeOperation!; return { ok: false, code: 'BUSY', message: 'Another editor operation is already running.', operationId: active.operationId, stage: 'materialization' }; }
    let path: string | undefined;
    let directory: string | undefined;
    try {
      if (!input || typeof input.name !== 'string' || typeof input.content !== 'string' || typeof input.source !== 'string' || input.source.trim() === '') {
        this.finishOperation(operation, 'cancelled', 'Materialization cancelled because the source record was incomplete.');
        return { ok: false, code: 'MATERIALIZATION_CANCELLED', message: 'Materialization cancelled because the source record was incomplete.', operationId: operation.operationId, stage: 'materialization', cancelled: true };
      }
      if (Buffer.byteLength(input.content, 'utf8') > MAX_EXPORT_BYTES) throw new Error('This export is too large to hand off safely.');
      this.updateOperation(operation, 0.35, 'Writing the bounded local materialization.');
      const safeName = basename(input.name).replace(/[^A-Za-z0-9._-]/gu, '_') || 'export.txt';
      const root = join(this.file.replace(/external-editors\.json$/u, ''), 'external-editor-exports');
      mkdirSync(root, { recursive: true });
      directory = join(root, operation.operationId);
      mkdirSync(directory, { recursive: false });
      path = join(directory, safeName);
      this.activeMaterializedDirectory = directory;
      atomicWriteFileSync(path, input.content);
      const result = await this.launchWithOperation({ kind: 'file', path }, input.editorId, operation);
      if (!result.ok) this.removeMaterialization(directory);
      if (!result.ok) return result;
      this.retainCompletedMaterializations(root, directory);
      return { ...result, source: input.source, materializedPath: path };
    } catch (error) {
      this.removeMaterialization(directory);
      const message = error instanceof Error ? error.message : String(error);
      this.finishOperation(operation, 'failed', message);
      return { ok: false, code: 'SPAWN_FAILED', message: `The local materialization could not be completed: ${message}`, operationId: operation.operationId, stage: 'materialization' };
    } finally {
      if (this.activeMaterializedDirectory === directory) this.activeMaterializedDirectory = undefined;
    }
  }
}
