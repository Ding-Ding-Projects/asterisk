/**
 * Opening a folder in the platform's own file manager.
 *
 * The Support Tickets recovery flow (`app/renderer/src/support-tickets.ts`) promises to
 * do exactly this with the console's application-data folder, and used to do nothing at
 * all. The only path this ever opens is the one the caller in `main.ts` computes itself
 * from `app.getPath('userData')` -- never anything the renderer supplies -- so there is
 * no argument here for a renderer to control at all, let alone inject through.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { nodeSpawnDetached, type SpawnDetached, type SpawnOutcome } from './local-launch.js';

export interface FolderOpenDeps {
  platform: NodeJS.Platform;
  exists: (path: string) => boolean;
  /** Best-effort: the folder may not exist yet on a machine that has never written a
   *  setting or filed a ticket. Failure to create it is not fatal -- the existence check
   *  right after this call reports the real outcome either way. */
  ensureDirectory: (path: string) => void;
  spawnDetached: SpawnDetached;
}

export function nodeFolderOpenDeps(): FolderOpenDeps {
  return {
    platform: process.platform,
    exists: existsSync,
    ensureDirectory: (path) => { try { mkdirSync(path, { recursive: true }); } catch { /* reported by the exists() check that follows */ } },
    spawnDetached: nodeSpawnDetached,
  };
}

/** The platform's own file manager, launched with no shell and no other arguments. */
const FILE_MANAGER_BY_PLATFORM: Readonly<Partial<Record<NodeJS.Platform, string>>> = {
  win32: 'explorer.exe',
  darwin: 'open',
  linux: 'xdg-open',
};

/**
 * Opens `path` in the platform's file manager, creating it first if it does not exist
 * yet. Never throws: every failure -- an empty path, a platform with no known file
 * manager, a launch that did not start -- comes back as a named reason so the caller can
 * show the exact folder path as text and let the person navigate there by hand, exactly
 * as `support-tickets.md`'s failure mode describes.
 */
export async function openFolderInFileManager(path: string, deps: FolderOpenDeps = nodeFolderOpenDeps()): Promise<SpawnOutcome> {
  const trimmed = path.trim();
  if (trimmed === '') return { ok: false, reason: 'There is no folder to open.' };
  if (!deps.exists(trimmed)) deps.ensureDirectory(trimmed);
  if (!deps.exists(trimmed)) return { ok: false, reason: `The folder does not exist and could not be created: ${trimmed}` };
  const executable = FILE_MANAGER_BY_PLATFORM[deps.platform];
  if (!executable) return { ok: false, reason: `Opening a file manager is not supported on this platform (${deps.platform}).` };
  return deps.spawnDetached(executable, [trimmed]);
}
