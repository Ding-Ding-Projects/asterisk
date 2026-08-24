/** Privileged external-editor runtime for the Electron main process. */
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, delimiter, dirname, extname, isAbsolute, join, normalize, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import type {
  ExternalEditorCandidate, ExternalEditorCustomRecord, ExternalEditorLaunchResult,
  ExternalEditorLaunchTarget, ExternalEditorStatus,
} from '../shared/control-plane.js';

type RuntimeDefinition = ExternalEditorCandidate & { command: string; fallbackPaths: string[]; folderArgs: string[]; fileArgs: string[] };
type Persisted = { version: 1; choiceId?: string; customEditors: ExternalEditorCustomRecord[] };

const MAX_RECORD_BYTES = 256 * 1024;
const MAX_EXPORT_BYTES = 8 * 1024 * 1024;
const MAX_CUSTOM_EDITORS = 32;
const MAX_NAME = 80;
const MAX_PATH = 1024;

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
  if (process.platform === 'win32' && !['.exe', '.com'].includes(extname(executable).toLowerCase())) return false;
  return name.length > 0 && name.length <= MAX_NAME && executable.length > 0 && executable.length <= MAX_PATH
    && !/[&|;<>^`\n\r]/u.test(executable) && !/^".*"$/u.test(executable);
}

export interface ExternalEditorRuntimeOptions { userDataPath: string; env?: NodeJS.ProcessEnv; }

export class ExternalEditorRuntime {
  private readonly file: string;
  private readonly env: NodeJS.ProcessEnv;
  private config: Persisted;

  constructor(options: ExternalEditorRuntimeOptions) {
    this.file = join(options.userDataPath, 'external-editors.json');
    this.env = options.env ?? process.env;
    this.config = this.read();
  }

  private read(): Persisted {
    try {
      const text = readFileSync(this.file, 'utf8');
      if (Buffer.byteLength(text, 'utf8') > MAX_RECORD_BYTES) return { version: 1, customEditors: [] };
      const parsed = JSON.parse(text) as Partial<Persisted>;
      if (parsed.version !== 1 || !Array.isArray(parsed.customEditors)) return { version: 1, customEditors: [] };
      return { version: 1, choiceId: typeof parsed.choiceId === 'string' ? parsed.choiceId : undefined, customEditors: parsed.customEditors.filter(validCustom).slice(0, MAX_CUSTOM_EDITORS) };
    } catch { return { version: 1, customEditors: [] }; }
  }

  private persist(): void {
    mkdirSync(dirname(this.file), { recursive: true });
    const text = JSON.stringify(this.config, null, 2);
    if (Buffer.byteLength(text, 'utf8') > MAX_RECORD_BYTES) throw new Error('The external-editor settings are too large.');
    const temp = `${this.file}.${process.pid}.${randomUUID()}.tmp`;
    writeFileSync(temp, text, { encoding: 'utf8', mode: 0o600 });
    try { writeFileSync(this.file, readFileSync(temp)); } finally {
      try { unlinkSync(temp); } catch { /* best effort */ }
    }
  }

  private candidates(): RuntimeDefinition[] {
    const known = KNOWN.map((definition) => {
      const resolved = resolveCommand(definition.command, this.env)
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
    };
  }

  choose(editorId: string): ExternalEditorStatus {
    const candidate = this.candidates().find((entry) => entry.id === editorId && entry.available);
    if (!candidate) throw new Error('That editor is not currently available on this computer.');
    this.config.choiceId = editorId;
    this.persist();
    return this.status();
  }

  saveCustom(record: ExternalEditorCustomRecord): ExternalEditorStatus {
    if (!validCustom(record)) throw new Error('Choose a bounded editor name and executable path without command-line syntax.');
    const id = record.id && /^[a-z0-9][a-z0-9._:-]{0,80}$/u.test(record.id) ? record.id : `custom:${randomUUID()}`;
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
    if (target.kind === 'folder' && !candidate.supportsFolderWorkspace) return Promise.resolve({ ok: false, code: 'FOLDER_UNSUPPORTED', message: `${candidate.name} can open files but does not provide a folder workspace.` });
    const executable = candidate.resolved!;
    const args = [...(target.kind === 'folder' ? candidate.folderArgs : candidate.fileArgs), target.path];
    return new Promise((resolveResult) => {
      let settled = false;
      const child = spawn(executable, args, { shell: false, windowsHide: true, detached: false, stdio: 'ignore' });
      const finish = (result: ExternalEditorLaunchResult) => { if (settled) return; settled = true; resolveResult(result); };
      child.once('spawn', () => { child.unref(); finish({ ok: true, editorId: candidate.id, executable, args, target, pid: child.pid }); });
      child.once('error', (error: Error) => finish({ ok: false, code: 'SPAWN_FAILED', message: `The editor could not be started: ${error.message}` }));
      const timer = setTimeout(() => finish({ ok: false, code: 'SPAWN_FAILED', message: 'The editor did not acknowledge launch within the bounded startup window.' }), 1500);
      if (typeof timer === 'object' && timer !== null && 'unref' in timer) (timer as { unref(): void }).unref();
    });
  }

  async openExport(input: { name: string; content: string; editorId?: string }): Promise<ExternalEditorLaunchResult> {
    if (!input || typeof input.name !== 'string' || typeof input.content !== 'string') return { ok: false, code: 'INVALID_EDITOR', message: 'The export handoff payload was not valid text.' };
    if (Buffer.byteLength(input.content, 'utf8') > MAX_EXPORT_BYTES) return { ok: false, code: 'SPAWN_FAILED', message: 'This export is too large to hand off safely.' };
    const safeName = basename(input.name).replace(/[^A-Za-z0-9._-]/gu, '_') || 'export.txt';
    const root = join(this.file.replace(/external-editors\.json$/u, ''), 'external-editor-exports');
    mkdirSync(root, { recursive: true });
    const path = join(root, safeName);
    writeFileSync(path, input.content, { encoding: 'utf8', mode: 0o600 });
    return this.launch({ kind: 'file', path }, input.editorId);
  }
}
