/** Privileged external-editor runtime for the Electron main process. */
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, delimiter, dirname, extname, isAbsolute, join, normalize, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { atomicWriteFileSync } from './atomic-file.js';
import type {
  ExternalEditorCandidate, ExternalEditorCustomRecord, ExternalEditorLaunchResult,
  ExternalEditorLaunchTarget, ExternalEditorStatus,
} from '../shared/control-plane.js';

type RuntimeDefinition = ExternalEditorCandidate & { command: string; fallbackPaths: string[]; folderArgs: string[]; fileArgs: string[] };
type Persisted = { version: 1; choiceId?: string; portableExecutable?: string; customEditors: ExternalEditorCustomRecord[] };

const MAX_RECORD_BYTES = 256 * 1024;
const MAX_EXPORT_BYTES = 8 * 1024 * 1024;
const MAX_CUSTOM_EDITORS = 32;
const MAX_NAME = 80;
const MAX_PATH = 1024;
const OFFICIAL_DOWNLOADS = new Map([
  ['vscode', 'https://code.visualstudio.com/'],
  ['vscode-insiders', 'https://code.visualstudio.com/insiders/'],
  ['vscode-portable', 'https://code.visualstudio.com/download'],
]);

const KNOWN: RuntimeDefinition[] = [
  { id: 'vscode', name: 'Visual Studio Code', command: 'code', fallbackPaths: ['%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe', '%ProgramFiles%\\Microsoft VS Code\\Code.exe', '%ProgramFiles(x86)%\\Microsoft VS Code\\Code.exe'], folderArgs: ['--new-window'], fileArgs: [], supportsFolderWorkspace: true, downloadUrl: 'https://code.visualstudio.com/', custom: false, available: false, selected: false },
  { id: 'vscode-insiders', name: 'Visual Studio Code Insiders', command: 'code-insiders', fallbackPaths: ['%LOCALAPPDATA%\\Programs\\Microsoft VS Code Insiders\\Code - Insiders.exe', '%ProgramFiles%\\Microsoft VS Code Insiders\\Code - Insiders.exe', '%ProgramFiles(x86)%\\Microsoft VS Code Insiders\\Code - Insiders.exe'], folderArgs: ['--new-window'], fileArgs: [], supportsFolderWorkspace: true, downloadUrl: 'https://code.visualstudio.com/insiders/', custom: false, available: false, selected: false },
  { id: 'vscode-portable', name: 'Visual Studio Code Portable', command: 'code-portable', fallbackPaths: ['%USERPROFILE%\\Applications\\VSCode\\Code.exe', '%USERPROFILE%\\Tools\\VSCode\\Code.exe', '%LOCALAPPDATA%\\VSCode\\Code.exe'], folderArgs: ['--new-window'], fileArgs: [], supportsFolderWorkspace: true, downloadUrl: 'https://code.visualstudio.com/download', custom: false, available: false, selected: false },
  { id: 'notepadpp', name: 'Notepad++', command: 'notepad++', fallbackPaths: ['%ProgramFiles%\\Notepad++\\notepad++.exe'], folderArgs: [], fileArgs: [], supportsFolderWorkspace: false, downloadUrl: 'https://notepad-plus-plus.org/', custom: false, available: false, selected: false },
  { id: 'sublime', name: 'Sublime Text', command: 'subl', fallbackPaths: ['%ProgramFiles%\\Sublime Text\\subl.exe'], folderArgs: [], fileArgs: [], supportsFolderWorkspace: false, downloadUrl: 'https://www.sublimetext.com/', custom: false, available: false, selected: false },
  { id: 'notepad', name: 'Notepad', command: 'notepad.exe', fallbackPaths: [], folderArgs: [], fileArgs: [], supportsFolderWorkspace: false, downloadUrl: undefined, custom: false, available: false, selected: false },
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

export interface ExternalEditorRuntimeOptions { userDataPath: string; env?: NodeJS.ProcessEnv; }

export class ExternalEditorRuntime {
  private readonly file: string;
  private readonly env: NodeJS.ProcessEnv;
  private config: Persisted;
  private persistenceState: 'valid' | 'missing' | 'invalid' = 'missing';
  private persistenceMessage: string | undefined;

  constructor(options: ExternalEditorRuntimeOptions) {
    this.file = join(options.userDataPath, 'external-editors.json');
    this.env = options.env ?? process.env;
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

  private persist(): void {
    mkdirSync(dirname(this.file), { recursive: true });
    const text = JSON.stringify(this.config, null, 2);
    if (Buffer.byteLength(text, 'utf8') > MAX_RECORD_BYTES) throw new Error('The external-editor settings are too large.');
    atomicWriteFileSync(this.file, text);
    this.persistenceState = 'valid';
    this.persistenceMessage = undefined;
  }

  private candidates(): RuntimeDefinition[] {
    const known = KNOWN.map((definition) => {
      const portable = definition.id === 'vscode-portable' && this.config.portableExecutable ? safePath(this.config.portableExecutable) : undefined;
      const resolved = portable && isFile(portable) ? portable : resolveCommand(definition.command, this.env)
        ?? definition.fallbackPaths.map((candidate) => safePath(candidate)).find(isFile);
      return { ...definition, resolved, available: !!resolved, selected: definition.id === this.config.choiceId };
    });
    const custom = this.config.customEditors.map((record) => {
      const resolved = safePath(record.executable);
      return {
        id: record.id!, name: record.name, command: resolved, fallbackPaths: [], resolved, available: isFile(resolved), selected: record.id === this.config.choiceId,
        supportsFolderWorkspace: record.supportsFolderWorkspace === true, folderArgs: [], fileArgs: [], custom: true,
      } as RuntimeDefinition;
    });
    return [...known, ...custom];
  }

  status(): ExternalEditorStatus {
    const candidates = this.candidates();
    const available = candidates.filter((candidate) => candidate.available);
    return {
      selectedId: this.config.choiceId,
      editors: candidates.map(({ id, name, resolved, available: found, selected, supportsFolderWorkspace, downloadUrl, custom }) => ({ id, name, resolved: found ? resolved : undefined, available: found, selected, supportsFolderWorkspace, downloadUrl, custom })),
      noEditorMessage: available.length === 0 ? 'No supported editor is installed. The console works fully without one.' : undefined,
      persistenceState: this.persistenceState,
      persistenceMessage: this.persistenceMessage,
    };
  }

  choose(editorId: string): ExternalEditorStatus {
    const candidate = this.candidates().find((entry) => entry.id === editorId && entry.available);
    if (!candidate) throw new Error('That editor is not currently available on this computer.');
    this.config.choiceId = editorId;
    this.persist();
    return this.status();
  }

  clearChoice(): ExternalEditorStatus {
    this.config.choiceId = undefined;
    this.persist();
    return this.status();
  }

  resetStorage(): ExternalEditorStatus {
    this.config = { version: 1, customEditors: [] };
    this.persist();
    return this.status();
  }

  savePortable(executable: string): ExternalEditorStatus {
    if (!executable || !isFile(safePath(executable)) || !['.exe', '.com'].includes(extname(executable).toLowerCase())) throw new Error('Choose an existing native Visual Studio Code executable for the portable route.');
    this.config.portableExecutable = safePath(executable);
    this.config.choiceId = 'vscode-portable';
    this.persist();
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
    this.config.customEditors = [...rest, next];
    this.config.choiceId = id;
    this.persist();
    return this.status();
  }

  removeCustom(editorId: string): ExternalEditorStatus {
    this.config.customEditors = this.config.customEditors.filter((entry) => entry.id !== editorId);
    if (this.config.choiceId === editorId) this.config.choiceId = undefined;
    this.persist();
    return this.status();
  }

  launch(target: ExternalEditorLaunchTarget, editorId?: string): Promise<ExternalEditorLaunchResult> {
    if (!target || (target.kind !== 'file' && target.kind !== 'folder') || typeof target.path !== 'string') {
      return Promise.resolve({ ok: false, code: 'INVALID_EDITOR', message: 'The editor target was not a valid file or folder.' });
    }
    const id = editorId ?? this.config.choiceId;
    const candidate = this.candidates().find((entry) => entry.id === id && entry.available);
    if (!candidate) return Promise.resolve({ ok: false, code: 'NO_EDITOR', message: 'No selected editor is available. Choose one in settings, or install Visual Studio Code.', downloadUrl: 'https://code.visualstudio.com/' });
    if (!target.path.trim()) return Promise.resolve({ ok: false, code: 'EMPTY_TARGET', message: 'There is no file or folder to open.' });
    if (!existsSync(target.path)) return Promise.resolve({ ok: false, code: 'EMPTY_TARGET', message: `The selected ${target.kind} is not available at the reported path.` });
    let targetStat: ReturnType<typeof statSync>;
    try { targetStat = statSync(target.path); } catch { return Promise.resolve({ ok: false, code: 'EMPTY_TARGET', message: `The selected ${target.kind} is not available at the reported path.` }); }
    if (target.kind === 'file' && !targetStat.isFile()) return Promise.resolve({ ok: false, code: 'EMPTY_TARGET', message: 'The selected target is a folder, not a file.' });
    if (target.kind === 'folder' && !targetStat.isDirectory()) return Promise.resolve({ ok: false, code: 'EMPTY_TARGET', message: 'The selected target is a file, not a folder.' });
    if (target.kind === 'folder' && !candidate.supportsFolderWorkspace) return Promise.resolve({ ok: false, code: 'FOLDER_UNSUPPORTED', message: `${candidate.name} can open files but does not provide a folder workspace.` });
    const executable = candidate.resolved!;
    const args = [...(target.kind === 'folder' ? candidate.folderArgs : candidate.fileArgs), target.path];
    return new Promise((resolveResult) => {
      let settled = false;
      const child = spawn(executable, args, { shell: false, windowsHide: true, detached: false, stdio: 'ignore' });
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (result: ExternalEditorLaunchResult) => { if (settled) return; settled = true; if (timer !== undefined) clearTimeout(timer); resolveResult(result); };
      child.once('spawn', () => { child.unref(); finish({ ok: true, editorId: candidate.id, executable, args, target, pid: child.pid }); });
      child.once('error', (error: Error) => finish({ ok: false, code: 'SPAWN_FAILED', message: `The editor could not be started: ${error.message}` }));
      timer = setTimeout(() => finish({ ok: false, code: 'SPAWN_FAILED', message: 'The editor did not acknowledge launch within the bounded startup window.' }), 1500);
      if (typeof timer === 'object' && timer !== null && 'unref' in timer) (timer as { unref(): void }).unref();
    });
  }

  async openExport(input: { name: string; content: string; source?: string; editorId?: string }): Promise<ExternalEditorLaunchResult> {
    return this.openMaterializedFile({ ...input, source: input.source ?? 'renderer export' });
  }

  async openMaterializedFile(input: { name: string; content: string; source: string; editorId?: string }): Promise<ExternalEditorLaunchResult> {
    if (!input || typeof input.name !== 'string' || typeof input.content !== 'string' || typeof input.source !== 'string' || input.source.trim() === '') return { ok: false, code: 'INVALID_EDITOR', message: 'The materialized editor payload was not valid text with a source record.' };
    if (Buffer.byteLength(input.content, 'utf8') > MAX_EXPORT_BYTES) return { ok: false, code: 'SPAWN_FAILED', message: 'This export is too large to hand off safely.' };
    const safeName = basename(input.name).replace(/[^A-Za-z0-9._-]/gu, '_') || 'export.txt';
    const root = join(this.file.replace(/external-editors\.json$/u, ''), 'external-editor-exports');
    mkdirSync(root, { recursive: true });
    const path = join(root, safeName);
    atomicWriteFileSync(path, input.content);
    const result = await this.launch({ kind: 'file', path }, input.editorId);
    return result.ok ? { ...result, source: input.source, materializedPath: path } : result;
  }
}
