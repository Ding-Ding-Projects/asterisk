/**
 * Handles the lifecycle arguments Squirrel.Windows passes to a freshly installed app.
 *
 * On install, update, obsolete and uninstall, Squirrel launches the application with a
 * `--squirrel-*` argument and waits about fifteen seconds for it to do its bit and
 * exit. An application that does not recognise the argument does what it always does —
 * it starts up and stays running — so Squirrel waits out the full timeout, gives up,
 * and logs:
 *
 *   Couldn't run Squirrel hook, continuing: System.OperationCanceledException
 *
 * The install still completes, which is exactly why this goes unnoticed: nothing looks
 * broken. What it actually costs is fifteen seconds added to every install and every
 * update, shortcuts that are never created through the supported path, and an uninstall
 * that never gets the chance to remove them. The timestamps in the installer log give
 * it away — the gap between "Squirrel Enabled Apps" and the cancellation is always
 * within a second of fifteen.
 *
 * This must run before anything else in the main process. Creating a window, reading
 * configuration or touching the filesystem first all eat into the same fifteen seconds.
 */
import { spawnSync } from "node:child_process";
import { basename, join, resolve } from "node:path";

export type SquirrelAction = "shortcuts-created" | "shortcuts-removed" | "quit" | "first-run" | "not-squirrel";

export interface SquirrelHostess {
  platform: string;
  argv: ReadonlyArray<string>;
  execPath: string;
  /** Runs Squirrel's own updater. Injected so the decision can be tested without it. */
  runUpdater(updateExe: string, args: ReadonlyArray<string>): void;
  quit(): void;
}

/**
 * Decides what a `--squirrel-*` argument means and carries it out.
 *
 * Returns `true` when the caller must stop immediately: the process was started to
 * perform an installer step, not to show anybody an application. `--squirrel-firstrun`
 * is the one exception — that is a real launch by a real person who just installed the
 * app, and it must continue into a normal startup.
 */
export function handleSquirrelEvent(host: SquirrelHostess): { handled: boolean; action: SquirrelAction } {
  if (host.platform !== "win32") return { handled: false, action: "not-squirrel" };

  const event = host.argv[1];
  if (typeof event !== "string" || !event.startsWith("--squirrel-")) {
    return { handled: false, action: "not-squirrel" };
  }

  /* Update.exe sits one level above the versioned app-<version> folder. */
  const appFolder = resolve(host.execPath, "..");
  const updateExe = join(resolve(appFolder, ".."), "Update.exe");
  const exeName = basename(host.execPath);

  switch (event) {
    case "--squirrel-install":
    case "--squirrel-updated":
      host.runUpdater(updateExe, ["--createShortcut", exeName]);
      host.quit();
      return { handled: true, action: "shortcuts-created" };

    case "--squirrel-uninstall":
      host.runUpdater(updateExe, ["--removeShortcut", exeName]);
      host.quit();
      return { handled: true, action: "shortcuts-removed" };

    case "--squirrel-obsolete":
      /* An older version being retired after an update. Nothing to do but leave. */
      host.quit();
      return { handled: true, action: "quit" };

    case "--squirrel-firstrun":
      /* A person launching the app for the first time. Carry on into normal startup. */
      return { handled: false, action: "first-run" };

    default:
      /* An argument from a newer Squirrel than this build knows about. Leaving quietly
       * costs one skipped step; staying open costs the same fifteen-second timeout. */
      host.quit();
      return { handled: true, action: "quit" };
  }
}

/** The real host, wired to this process and Squirrel's updater. */
export function processHostess(quit: () => void): SquirrelHostess {
  return {
    platform: process.platform,
    argv: process.argv,
    execPath: process.execPath,
    runUpdater(updateExe, args) {
      /* Synchronous and bounded: Squirrel is already counting, and a shortcut that
       * takes longer than the timeout is no better than one never created. A failure
       * here must not stop the application exiting, so it is deliberately swallowed —
       * the alternative is an unhandled throw that leaves the process running and
       * reintroduces the very timeout this exists to avoid. */
      try {
        spawnSync(updateExe, [...args], { timeout: 8_000, windowsHide: true });
      } catch {
        /* Nothing useful to do: the app must still quit promptly. */
      }
    },
    quit,
  };
}
