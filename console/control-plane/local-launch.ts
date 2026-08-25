/**
 * Fire-and-forget process launch for handing something to a local, already-installed
 * program (an editor, the platform's file manager) rather than running a command and
 * waiting for its output the way `executor.ts`'s `ProcessExecutor` does.
 *
 * Shared by `editor-launch.ts` and `local-folder.ts` so there is exactly one spawn
 * implementation to get right: `shell: false` always -- the executable and every
 * argument are passed as separate array entries straight to the OS, never joined into a
 * command line for anything to reparse -- and success is "the process actually started",
 * not "the process finished", because a launched editor or file-manager window is meant
 * to keep running after this call returns. Modelled on `app/electron/updater-runtime.ts`'s
 * `launchInstaller`, which already proved this shape for the installer relaunch.
 */
import { spawn } from 'node:child_process';

export type SpawnOutcome = { ok: true } | { ok: false; reason: string };

export interface SpawnDetached {
  (executable: string, args: readonly string[]): Promise<SpawnOutcome>;
}

const SPAWN_START_TIMEOUT_MS = 15_000;

/**
 * Starts `executable` detached, with `args` passed exactly as given -- no shell, no
 * string concatenation, no reinterpretation. Resolves once the OS confirms the process
 * actually started (or fails to), not once it exits: for an editor window or a file
 * manager, "exits quickly" is the normal, successful case on some platforms, and waiting
 * for it would misreport success as failure.
 */
export const nodeSpawnDetached: SpawnDetached = (executable, args) => new Promise((resolve) => {
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const finish = (result: SpawnOutcome): void => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    resolve(result);
  };
  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(executable, [...args], { detached: true, stdio: 'ignore', windowsHide: false, shell: false });
  } catch (error) {
    finish({ ok: false, reason: error instanceof Error ? error.message : String(error) });
    return;
  }
  child.once('spawn', () => { child.unref(); finish({ ok: true }); });
  child.once('error', (error) => finish({ ok: false, reason: error.message }));
  timer = setTimeout(() => finish({ ok: false, reason: 'The launch timed out before the process confirmed it started.' }), SPAWN_START_TIMEOUT_MS);
  timer.unref();
});
