/**
 * Real installed-editor detection and launch.
 *
 * `shared/editor-catalog.ts` decides everything about WHICH editor to use and HOW to
 * launch it -- that logic is pure and injects a `Probe`, precisely so it never has to
 * touch a real machine to be tested. This module is the one thing that actually answers
 * that probe for real: it walks PATH, expands `%ENV%`-templated absolute fallbacks, and
 * checks the filesystem, because the renderer is sandboxed (`contextIsolation: true,
 * nodeIntegration: false, sandbox: true`) and can do none of that itself.
 *
 * The launch side never trusts the renderer for WHICH executable to run. `openInEditor`
 * re-derives the choice from the console's own persisted settings snapshot and re-runs
 * real detection, so the only things this can ever spawn are one of the four built-in
 * editors' own known candidates (`KNOWN_EDITORS`, fixed in `shared/editor-catalog.ts`) or
 * the exact custom path a user already saved through `validateCustomEditor` -- never an
 * arbitrary path or command line handed over on the request itself.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  KNOWN_EDITORS, CUSTOM_EDITOR_ID, chosenEditor, planLaunch, detectEditors, isRefusal,
  type DetectedEditor, type EditorStorage,
} from '../shared/editor-catalog.js';
import { nodeSpawnDetached, type SpawnDetached } from './local-launch.js';
import { parseSettingsSnapshot } from './settings-store.js';

export interface ProbeEnvironment {
  env: Readonly<Record<string, string | undefined>>;
  platform: NodeJS.Platform;
  exists: (path: string) => boolean;
}

export function nodeProbeEnvironment(): ProbeEnvironment {
  return { env: process.env, platform: process.platform, exists: existsSync };
}

/** `%LOCALAPPDATA%\...` -> the real path, using whatever environment is supplied.
 *  A name with no matching variable is left untouched rather than silently blanked, so
 *  a broken template fails the existence check instead of resolving to something else. */
export function expandEnvironmentPath(template: string, env: Readonly<Record<string, string | undefined>>): string {
  return template.replace(/%([^%]+)%/gu, (match, name: string) => env[name] ?? match);
}

function pathDirectories(env: Readonly<Record<string, string | undefined>>, platform: NodeJS.Platform): string[] {
  const raw = (platform === 'win32' ? (env.Path ?? env.PATH) : env.PATH) ?? '';
  const separator = platform === 'win32' ? ';' : ':';
  return raw.split(separator).map((entry) => entry.trim()).filter((entry) => entry !== '');
}

/** Extensions Windows will run without the caller spelling one out, in the order
 *  `cmd.exe` itself tries them -- this is why `code` on PATH resolves to `code.cmd`. */
function executableExtensions(env: Readonly<Record<string, string | undefined>>, platform: NodeJS.Platform): string[] {
  if (platform !== 'win32') return [''];
  const raw = env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD';
  const extensions = raw.split(';').filter((entry) => entry !== '');
  return extensions.length > 0 ? extensions : ['.EXE'];
}

function joinPath(dir: string, name: string, platform: NodeJS.Platform): string {
  const separator = platform === 'win32' ? '\\' : '/';
  return dir.endsWith(separator) ? `${dir}${name}` : `${dir}${separator}${name}`;
}

/** True for a candidate that names a filesystem location (`%LOCALAPPDATA%\...`,
 *  `C:\tools\ed.exe`) rather than a bare command to be found on PATH (`code`, `subl`). */
export function isPathCandidate(candidate: string): boolean {
  return candidate.includes('%') || /[\\/]/u.test(candidate);
}

const HAS_EXTENSION = /\.[a-z0-9]+$/iu;

/**
 * Resolves one `EditorDefinition.command`/`fallbackPaths` entry (or a saved custom
 * executable) to the real, extension-complete file that is actually on this machine
 * right now, or `undefined` when nothing matches.
 *
 * This is the one place detection and launch share code: detection only needs to know
 * whether the result is defined; launch needs the resolved path itself, because Windows
 * will not run a bare `code` the way it will run the `code.cmd` PATH search finds.
 */
export function resolveCandidate(candidate: string, deps: ProbeEnvironment): string | undefined {
  const trimmed = candidate.trim();
  if (trimmed === '') return undefined;
  if (isPathCandidate(trimmed)) {
    const expanded = expandEnvironmentPath(trimmed, deps.env);
    return deps.exists(expanded) ? expanded : undefined;
  }
  if (HAS_EXTENSION.test(trimmed) && deps.exists(trimmed)) return trimmed;
  for (const dir of pathDirectories(deps.env, deps.platform)) {
    if (HAS_EXTENSION.test(trimmed)) {
      const direct = joinPath(dir, trimmed, deps.platform);
      if (deps.exists(direct)) return direct;
    }
    for (const extension of executableExtensions(deps.env, deps.platform)) {
      const withExtension = joinPath(dir, `${trimmed}${extension}`, deps.platform);
      if (deps.exists(withExtension)) return withExtension;
    }
  }
  return undefined;
}

/** Matches `shared/editor-catalog.ts`'s `Probe` signature exactly: one candidate string
 *  in, one boolean out. The only place detection touches PATH or the filesystem. */
export function probeExecutable(candidate: string, deps: ProbeEnvironment = nodeProbeEnvironment()): boolean {
  return resolveCandidate(candidate, deps) !== undefined;
}

/** Which of the four built-in editors are actually installed on this machine, right
 *  now -- real detection, never the static list the picker used to show unconditionally. */
export function detectInstalledEditors(deps: ProbeEnvironment = nodeProbeEnvironment()): DetectedEditor[] {
  return detectEditors((candidate) => probeExecutable(candidate, deps), KNOWN_EDITORS);
}

/**
 * Reads the console's own persisted settings straight off disk -- the exact same
 * `settings.json` under `userDataPath` that `settings.snapshot`/`settings.write`
 * read and write -- for the one-off read a launch request needs. Never a second
 * writable cache: this module only ever reads, so it cannot drift from the renderer's
 * own choice by writing something different.
 */
export function readEditorSettingsSnapshot(userDataPath: string): Record<string, string> {
  const path = join(userDataPath, 'settings.json');
  if (!existsSync(path)) return {};
  return parseSettingsSnapshot(readFileSync(path, 'utf8')) ?? {};
}

function storageFromSnapshot(snapshot: Readonly<Record<string, string>>): EditorStorage {
  return {
    getItem: (key) => (Object.hasOwn(snapshot, key) ? snapshot[key] : null),
    /* The privileged process only ever reads the editor choice here -- the renderer owns
     * writing it, through `settings.write`. A launch request has no business changing it. */
    setItem: () => { throw new Error('editor-launch: the privileged process does not persist the editor choice.'); },
    removeItem: () => { throw new Error('editor-launch: the privileged process does not clear the editor choice.'); },
  };
}

export type EditorLaunchOutcome =
  | { ok: true }
  | { ok: false; message: string; downloadUrl?: string };

/**
 * Opens `target` in the console's currently chosen editor.
 *
 * `settingsSnapshot` is the console's own persisted settings (the same file
 * `settings.snapshot`/`settings.write` read and write), never anything the launch
 * request itself supplies -- see the module doc for why that is the whole allowlist.
 */
export async function openInEditor(
  settingsSnapshot: Readonly<Record<string, string>>,
  target: { kind: 'file' | 'folder'; path: string },
  deps: ProbeEnvironment = nodeProbeEnvironment(),
  spawnDetached: SpawnDetached = nodeSpawnDetached,
): Promise<EditorLaunchOutcome> {
  const storage = storageFromSnapshot(settingsSnapshot);
  const available = detectInstalledEditors(deps);
  const editor = chosenEditor(storage, available);
  const plan = planLaunch(editor, target);
  if (isRefusal(plan)) return { ok: false, message: plan.message, downloadUrl: plan.downloadUrl };

  /* `plan.executable` is `editor.resolved`, and for a PATH match `detectEditors` deliberately
   * records that as the bare command (e.g. `code`) rather than a resolved path -- see
   * shared/editor-catalog.ts. Windows will not itself find that without the extension
   * PATHEXT would add, so it is re-resolved to a real file immediately before spawning,
   * which also re-confirms the editor has not vanished since detection ran a moment ago. */
  const executable = resolveCandidate(plan.executable, deps);
  if (!executable) {
    const name = editor?.definition.id === CUSTOM_EDITOR_ID ? (editor.definition.name || 'The custom editor') : (editor?.definition.name ?? 'The chosen editor');
    return { ok: false, message: `${name} is no longer where it was found. Detect editors again in Customise everything.` };
  }
  const outcome = await spawnDetached(executable, plan.args);
  if (outcome.ok) return { ok: true };
  return { ok: false, message: `${editor?.definition.name ?? 'The editor'} did not start: ${outcome.reason}` };
}
