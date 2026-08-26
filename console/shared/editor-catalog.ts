/**
 * Opening a file or folder in an external editor.
 *
 * Pure catalog and decision logic, shared between the renderer (which shows the picker
 * and the settings fields) and the privileged main process (which is the only side that
 * can actually touch PATH, the filesystem, or spawn anything -- see
 * `control-plane/editor-launch.ts`). Nothing here does I/O; every "does this exist"
 * question is answered by an injected `Probe`, which is exactly what keeps this file
 * testable without a real machine and safe to import from either side.
 *
 * `app/renderer/src/external-editor.ts` re-exports this file unchanged, so existing
 * renderer imports and tests keep working without caring where the logic actually lives.
 *
 * Detects the editors actually installed, lets somebody choose or add one, persists the
 * choice, and degrades with a real message rather than a silent no-op when none is found.
 *
 * Two things are deliberate and worth reading before changing anything here.
 *
 * VS Code is not merely one option among several: anything the console can export has to
 * be openable in it directly from the app, so `VS_CODE` is a first-class entry rather
 * than a row in a list. When it is absent the surface says so and offers the download,
 * because silently substituting some other editor the person did not ask for is worse
 * than reporting the gap.
 *
 * And an editor is an OPTIONAL INTEGRATION TARGET, not a dependency. The console is
 * complete without one. So the copy here never reads as a prerequisite somebody failed
 * to satisfy, and nothing about a missing editor blocks anything.
 *
 * No editor is ever launched through a shell. A candidate carries an executable and an
 * argument list, both passed separately, exactly as the control plane does everywhere
 * else -- a path with a space in it is common and a shell would split it, and a path with
 * a semicolon in it is a command injection.
 */

export interface EditorDefinition {
  id: string;
  name: string;
  /** Command looked up on PATH first; absolute candidates are tried after. */
  command: string;
  /** Absolute locations to try when the command is not on PATH. */
  fallbackPaths: readonly string[];
  /** Arguments that open a folder as a workspace root rather than a bare file. */
  folderArgs: readonly string[];
  /** Arguments that open a single file. */
  fileArgs: readonly string[];
  /** Where to send somebody who does not have it. Never auto-downloaded. */
  downloadUrl: string;
}

/**
 * Opening a folder must open it as a workspace ROOT, not as one file with no context --
 * a file tree is the reason to hand a folder to an editor at all.
 */
export const VS_CODE: EditorDefinition = {
  id: 'vscode',
  name: 'Visual Studio Code',
  command: 'code',
  fallbackPaths: [
    '%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\bin\\code.cmd',
    '%ProgramFiles%\\Microsoft VS Code\\bin\\code.cmd',
    '%LOCALAPPDATA%\\Programs\\Microsoft VS Code Insiders\\bin\\code-insiders.cmd',
  ],
  folderArgs: ['--new-window'],
  fileArgs: [],
  downloadUrl: 'https://code.visualstudio.com/',
};

export const KNOWN_EDITORS: readonly EditorDefinition[] = [
  VS_CODE,
  {
    id: 'notepadpp', name: 'Notepad++', command: 'notepad++',
    fallbackPaths: ['%ProgramFiles%\\Notepad++\\notepad++.exe'],
    folderArgs: [], fileArgs: [], downloadUrl: 'https://notepad-plus-plus.org/',
  },
  {
    id: 'sublime', name: 'Sublime Text', command: 'subl',
    fallbackPaths: ['%ProgramFiles%\\Sublime Text\\subl.exe'],
    folderArgs: [], fileArgs: [], downloadUrl: 'https://www.sublimetext.com/',
  },
  {
    id: 'notepad', name: 'Notepad', command: 'notepad.exe',
    fallbackPaths: [], folderArgs: [], fileArgs: [], downloadUrl: '',
  },
];

export const EDITOR_SETTING = 'console.externalEditor';

export interface EditorStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** What the host reports about one candidate. Injected, so detection is testable. */
export interface Probe {
  (executable: string): boolean;
}

export interface DetectedEditor {
  definition: EditorDefinition;
  /** The executable that was actually found, which may be a fallback rather than PATH. */
  resolved: string;
}

/**
 * Which editors are present.
 *
 * PATH first, then the absolute candidates in order, so an install the shell already
 * knows about wins over a guessed location.
 */
export function detectEditors(probe: Probe, editors: readonly EditorDefinition[] = KNOWN_EDITORS): DetectedEditor[] {
  const found: DetectedEditor[] = [];
  for (const definition of editors) {
    if (probe(definition.command)) {
      found.push({ definition, resolved: definition.command });
      continue;
    }
    const fallback = definition.fallbackPaths.find((candidate) => probe(candidate));
    if (fallback) found.push({ definition, resolved: fallback });
  }
  return found;
}

export interface CustomEditor {
  name: string;
  executable: string;
}

export interface EditorProblem {
  message: string;
}

/**
 * Validates a hand-added editor.
 *
 * Rejects anything that is not a bare executable path: an argument string, a shell
 * operator, or a quoted command line. Those all look reasonable in a text box and are
 * how a settings field becomes a way to run an arbitrary command.
 */
export function validateCustomEditor(candidate: CustomEditor): EditorProblem[] {
  const problems: EditorProblem[] = [];
  if (candidate.name.trim() === '') problems.push({ message: 'Give the editor a name.' });
  const executable = candidate.executable.trim();
  if (executable === '') {
    problems.push({ message: 'Choose the editor’s executable. Browse for it rather than typing it if you are not sure.' });
    return problems;
  }
  if (/[&|;<>^`\n\r]/u.test(executable)) {
    problems.push({ message: 'That looks like a command rather than a program. Choose the executable itself.' });
  }
  if (/^".*"$/u.test(executable)) {
    problems.push({ message: 'Leave the quotes off. The path is passed to the editor directly, so it does not need them.' });
  }
  return problems;
}

/** The stored choice, if it is still one of the editors currently present.
 *
 * `custom` is resolved from the saved hand-added editor rather than from `available`,
 * because a hand-added editor was never detected by `detectEditors` in the first place --
 * it was typed in, not found on the machine. Its own executable stands in for a probe. */
export function chosenEditor(
  storage: EditorStorage | undefined,
  available: readonly DetectedEditor[],
): DetectedEditor | undefined {
  const stored = storage?.getItem(EDITOR_SETTING);
  if (typeof stored !== 'string') return undefined;
  if (stored === CUSTOM_EDITOR_ID) {
    const custom = storage ? loadCustomEditor(storage) : undefined;
    if (!custom) return undefined;
    return {
      definition: {
        id: CUSTOM_EDITOR_ID, name: custom.name, command: custom.executable,
        fallbackPaths: [], folderArgs: [], fileArgs: [], downloadUrl: '',
      },
      resolved: custom.executable,
    };
  }
  /* An editor that has since been uninstalled is not silently replaced with another:
   * launching something the person did not choose is worse than reporting the gap. */
  return available.find((candidate) => candidate.definition.id === stored);
}

export function chooseEditor(storage: EditorStorage, id: string): void {
  storage.setItem(EDITOR_SETTING, id);
}

export function clearEditorChoice(storage: EditorStorage): void {
  storage.removeItem(EDITOR_SETTING);
}

/** The id `chooseEditor` is given when the hand-added editor below is what should launch. */
export const CUSTOM_EDITOR_ID = 'custom';

export const CUSTOM_EDITOR_SETTING = 'console.externalEditor.custom';

/**
 * Persists the hand-added editor from the "other editor" fields on the customise screen.
 *
 * Callers validate with `validateCustomEditor` first; this does not re-check, so an
 * invalid candidate is never written -- the whole point of the earlier validation is that
 * nothing downstream has to guard against a command string or a quoted path again.
 */
export function saveCustomEditor(storage: EditorStorage, custom: CustomEditor): void {
  storage.setItem(CUSTOM_EDITOR_SETTING, JSON.stringify(custom));
}

/** The hand-added editor, or undefined when none has been saved yet or the stored JSON
 *  no longer parses -- treated the same as absent rather than thrown. */
export function loadCustomEditor(storage: EditorStorage): CustomEditor | undefined {
  const raw = storage.getItem(CUSTOM_EDITOR_SETTING);
  if (typeof raw !== 'string' || raw === '') return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<CustomEditor>;
    if (typeof parsed.name === 'string' && typeof parsed.executable === 'string') {
      return { name: parsed.name, executable: parsed.executable };
    }
  } catch {
    /* Treated as though nothing were saved. */
  }
  return undefined;
}

export interface LaunchPlan {
  executable: string;
  /** Passed separately. Never joined into a command line, never through a shell. */
  args: string[];
}

export interface LaunchRefusal {
  /** Why nothing will be launched, in words a person can act on. */
  message: string;
  /** Offered only when the reason is a missing editor with somewhere to get it. */
  downloadUrl?: string;
}

/**
 * Builds the launch, or says why it cannot.
 *
 * A folder gets the editor's folder arguments so it opens as a workspace root; a file
 * gets the file arguments. The target is always the last argument and is never
 * interpolated into another string.
 */
export function planLaunch(
  editor: DetectedEditor | undefined,
  target: { kind: 'file' | 'folder'; path: string },
  fallbackDefinition: EditorDefinition = VS_CODE,
): LaunchPlan | LaunchRefusal {
  if (!editor) {
    return {
      message:
        `No editor is set up yet, so there is nothing to open ${target.path} with. `
        + `The console works fully without one; choose an installed editor in settings, or install `
        + `${fallbackDefinition.name}.`,
      downloadUrl: fallbackDefinition.downloadUrl || undefined,
    };
  }
  if (target.path.trim() === '') {
    return { message: 'There is no file or folder to open.' };
  }
  const args = target.kind === 'folder'
    ? [...editor.definition.folderArgs, target.path]
    : [...editor.definition.fileArgs, target.path];
  return { executable: editor.resolved, args };
}

export function isRefusal(result: LaunchPlan | LaunchRefusal): result is LaunchRefusal {
  return 'message' in result;
}
