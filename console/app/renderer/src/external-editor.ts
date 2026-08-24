/**
 * Pure external-editor policy.
 *
 * The renderer owns the safe model and launch-plan rules. The privileged runtime
 * supplies actual filesystem detection, native picking and process creation through
 * the typed bridge. No command line is ever assembled and no shell is ever used.
 */

export interface EditorDefinition {
  id: string;
  name: string;
  command: string;
  fallbackPaths: readonly string[];
  folderArgs: readonly string[];
  fileArgs: readonly string[];
  supportsFolderWorkspace: boolean;
  downloadUrl: string;
}

export const VS_CODE: EditorDefinition = {
  id: 'vscode', name: 'Visual Studio Code', command: 'code',
  fallbackPaths: [
    '%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe',
    '%ProgramFiles%\\Microsoft VS Code\\Code.exe',
    '%ProgramFiles(x86)%\\Microsoft VS Code\\Code.exe',
  ],
  folderArgs: ['--new-window'], fileArgs: [], supportsFolderWorkspace: true,
  downloadUrl: 'https://code.visualstudio.com/',
};

export const VS_CODE_INSIDERS: EditorDefinition = {
  id: 'vscode-insiders', name: 'Visual Studio Code Insiders', command: 'code-insiders',
  fallbackPaths: [
    '%LOCALAPPDATA%\\Programs\\Microsoft VS Code Insiders\\Code - Insiders.exe',
    '%ProgramFiles%\\Microsoft VS Code Insiders\\Code - Insiders.exe',
    '%ProgramFiles(x86)%\\Microsoft VS Code Insiders\\Code - Insiders.exe',
  ],
  folderArgs: ['--new-window'], fileArgs: [], supportsFolderWorkspace: true,
  downloadUrl: 'https://code.visualstudio.com/insiders/',
};

export const VS_CODE_PORTABLE: EditorDefinition = {
  id: 'vscode-portable', name: 'Visual Studio Code Portable', command: 'code-portable',
  fallbackPaths: [
    '%USERPROFILE%\\Applications\\VSCode\\Code.exe',
    '%USERPROFILE%\\Tools\\VSCode\\Code.exe',
    '%LOCALAPPDATA%\\VSCode\\Code.exe',
  ],
  folderArgs: ['--new-window'], fileArgs: [], supportsFolderWorkspace: true,
  downloadUrl: 'https://code.visualstudio.com/download',
};

export const KNOWN_EDITORS: readonly EditorDefinition[] = [
  VS_CODE, VS_CODE_INSIDERS, VS_CODE_PORTABLE,
  { id: 'notepadpp', name: 'Notepad++', command: 'notepad++', fallbackPaths: ['%ProgramFiles%\\Notepad++\\notepad++.exe'], folderArgs: [], fileArgs: [], supportsFolderWorkspace: false, downloadUrl: 'https://notepad-plus-plus.org/' },
  { id: 'sublime', name: 'Sublime Text', command: 'subl', fallbackPaths: ['%ProgramFiles%\\Sublime Text\\subl.exe'], folderArgs: [], fileArgs: [], supportsFolderWorkspace: false, downloadUrl: 'https://www.sublimetext.com/' },
  { id: 'notepad', name: 'Notepad', command: 'notepad.exe', fallbackPaths: [], folderArgs: [], fileArgs: [], supportsFolderWorkspace: false, downloadUrl: '' },
];

export const EDITOR_SETTING = 'console.externalEditor';
export const CUSTOM_EDITORS_SETTING = 'console.externalEditors.v1';
export const MAX_CUSTOM_EDITORS = 32;
export const MAX_EDITOR_NAME_LENGTH = 80;
export const MAX_EDITOR_PATH_LENGTH = 1024;

export interface EditorStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface Probe { (executable: string): boolean; }
export interface DetectedEditor { definition: EditorDefinition; resolved: string; }
export interface CustomEditor { id?: string; name: string; executable: string; supportsFolderWorkspace?: boolean; }
export interface EditorProblem { message: string; }

export interface StoredEditorConfiguration {
  version: 1;
  choiceId?: string;
  customEditors: CustomEditor[];
}

export function validateCustomEditor(candidate: CustomEditor): EditorProblem[] {
  const problems: EditorProblem[] = [];
  if (candidate.name.trim() === '') problems.push({ message: 'Give the editor a name.' });
  if (candidate.name.trim().length > MAX_EDITOR_NAME_LENGTH) problems.push({ message: `The editor name must be ${MAX_EDITOR_NAME_LENGTH} characters or fewer.` });
  const executable = candidate.executable.trim();
  if (executable === '') {
    problems.push({ message: 'Choose the editor executable. Browse for it rather than typing it if you are not sure.' });
    return problems;
  }
  if (executable.length > MAX_EDITOR_PATH_LENGTH) problems.push({ message: `The executable path must be ${MAX_EDITOR_PATH_LENGTH} characters or fewer.` });
  if (/[&|;<>^`\n\r]/u.test(executable)) problems.push({ message: 'That looks like a command rather than a program. Choose the executable itself.' });
  if (/^".*"$/u.test(executable)) problems.push({ message: 'Leave the quotes off. The path is passed to the editor directly, so it does not need them.' });
  if (candidate.id !== undefined && !/^[a-z0-9][a-z0-9._:-]{0,80}$/u.test(candidate.id)) problems.push({ message: 'The editor identifier has an unsupported shape.' });
  return problems;
}

export function expandEnvironmentPath(value: string, env: Readonly<Record<string, string | undefined>> = {}): string {
  return value
    .replace(/%([^%]+)%/gu, (_, key: string) => env[key] ?? `%${key}%`)
    .replace(/\$env:([A-Za-z_][A-Za-z0-9_]*)/gu, (_, key: string) => env[key] ?? `$env:${key}`)
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/gu, (_, key: string) => env[key] ?? `$${key}`);
}

export function normalizeEditorPath(value: string, env: Readonly<Record<string, string | undefined>> = {}, platform: 'win32' | 'posix' = 'win32'): string {
  const expanded = expandEnvironmentPath(value.trim(), env);
  if (platform === 'posix') {
    const parts: string[] = [];
    for (const part of (expanded.startsWith('/') ? expanded : `/${expanded}`).split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') parts.pop(); else parts.push(part);
    }
    return `/${parts.join('/')}`;
  }
  const slash = expanded.replaceAll('/', '\\');
  const prefix = slash.startsWith('\\\\') ? '\\\\' : (/^[A-Za-z]:\\/u.test(slash) ? slash.slice(0, 3) : '');
  const parts: string[] = [];
  for (const part of (prefix ? slash.slice(prefix.length) : slash).split('\\')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop(); else parts.push(part);
  }
  return `${prefix || '\\\\'}${parts.join('\\')}`;
}

export function detectEditors(probe: Probe, editors: readonly EditorDefinition[] = KNOWN_EDITORS): DetectedEditor[] {
  const found: DetectedEditor[] = [];
  for (const definition of editors) {
    if (probe(definition.command)) { found.push({ definition, resolved: definition.command }); continue; }
    const fallback = definition.fallbackPaths.find((candidate) => probe(candidate));
    if (fallback) found.push({ definition, resolved: fallback });
  }
  return found;
}

export function readStoredEditorConfiguration(storage: EditorStorage | undefined): StoredEditorConfiguration {
  const raw = storage?.getItem(CUSTOM_EDITORS_SETTING);
  if (typeof raw !== 'string') return { version: 1, customEditors: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<StoredEditorConfiguration>;
    if (parsed.version !== 1 || !Array.isArray(parsed.customEditors)) return { version: 1, customEditors: [] };
    const customEditors = parsed.customEditors.filter((entry): entry is CustomEditor => !!entry && typeof entry === 'object')
      .filter((entry) => validateCustomEditor(entry).length === 0).slice(0, MAX_CUSTOM_EDITORS);
    return { version: 1, choiceId: typeof parsed.choiceId === 'string' ? parsed.choiceId : undefined, customEditors };
  } catch { return { version: 1, customEditors: [] }; }
}

export function writeStoredEditorConfiguration(storage: EditorStorage, configuration: StoredEditorConfiguration): void {
  const customEditors = configuration.customEditors.filter((entry) => validateCustomEditor(entry).length === 0).slice(0, MAX_CUSTOM_EDITORS);
  storage.setItem(CUSTOM_EDITORS_SETTING, JSON.stringify({ version: 1, choiceId: configuration.choiceId, customEditors }));
}

export function chosenEditor(storage: EditorStorage | undefined, available: readonly DetectedEditor[]): DetectedEditor | undefined {
  const stored = storage?.getItem(EDITOR_SETTING);
  if (typeof stored !== 'string') return undefined;
  return available.find((candidate) => candidate.definition.id === stored);
}

export function chooseEditor(storage: EditorStorage, id: string): void { storage.setItem(EDITOR_SETTING, id); }
export function clearEditorChoice(storage: EditorStorage): void { storage.removeItem(EDITOR_SETTING); }

export interface LaunchPlan { executable: string; args: string[]; }
export interface LaunchRefusal { message: string; downloadUrl?: string; }

export function planLaunch(editor: DetectedEditor | undefined, target: { kind: 'file' | 'folder'; path: string }, fallbackDefinition: EditorDefinition = VS_CODE): LaunchPlan | LaunchRefusal {
  if (!editor) return {
    message: `No editor is set up yet, so there is nothing to open ${target.path} with. The console works fully without one. Choose an installed editor in settings, or install ${fallbackDefinition.name}.`,
    downloadUrl: fallbackDefinition.downloadUrl || undefined,
  };
  if (target.path.trim() === '') return { message: 'There is no file or folder to open.' };
  if (target.kind === 'folder' && !editor.definition.supportsFolderWorkspace) return { message: `${editor.definition.name} can open files but does not provide a folder workspace.` };
  const args = target.kind === 'folder' ? [...editor.definition.folderArgs, target.path] : [...editor.definition.fileArgs, target.path];
  return { executable: editor.resolved, args };
}

export function isRefusal(result: LaunchPlan | LaunchRefusal): result is LaunchRefusal { return 'message' in result; }

export type LaunchFailureCode = 'NO_EDITOR' | 'EMPTY_TARGET' | 'FOLDER_UNSUPPORTED' | 'SPAWN_FAILED';
export interface LaunchReceipt { ok: true; editorId: string; executable: string; args: string[]; target: { kind: 'file' | 'folder'; path: string }; pid?: number; }
export interface LaunchFailure { ok: false; code: LaunchFailureCode; message: string; downloadUrl?: string; }
