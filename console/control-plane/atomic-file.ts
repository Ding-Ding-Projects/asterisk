/**
 * Atomic, Windows-safe file writes.
 *
 * A plain `writeFileSync(path, data)` is not atomic: a process that crashes or is
 * killed mid-write leaves a truncated file behind, and the next read either throws or
 * silently loads a partial payload. The standard fix is temp-file-then-rename, which is
 * atomic on POSIX because `rename(2)` replaces the destination unconditionally.
 *
 * On Windows it is not sufficient by itself. `MoveFileEx` (what Node's `fs.renameSync`
 * calls) fails with a sharing violation -- surfacing through Node as `EPERM`, sometimes
 * `EACCES`/`EBUSY` -- whenever anything has the *destination* open at that instant, even
 * briefly. Microsoft Windows Defender's real-time scanner, the search indexer, and a
 * sync client (OneDrive over a user profile is common) all open a just-written file to
 * look at it. The rename is still one indivisible operation, so retrying it cannot tear
 * a write; it only needs to succeed once whoever holds the destination lets go, which is
 * normally a matter of milliseconds. See the shared instructions' "Temp-then-rename is
 * not atomic on Windows" entry for the full account of why this is worth its own helper
 * rather than a bare `writeFileSync`.
 */
import { writeFileSync, renameSync, mkdirSync, unlinkSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { dirname } from 'node:path';

const TRANSIENT_CODES = new Set(['EPERM', 'EACCES', 'EBUSY']);

export interface RenameRetryOptions {
  attempts?: number;
  delayMs?: number;
}

/** Renames one completed file with the bounded Windows sharing-violation retry. */
export function renameWithRetrySync(from: string, to: string, options: RenameRetryOptions = {}): void {
  const attempts = options.attempts ?? 8;
  const delayMs = options.delayMs ?? 40;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      renameSync(from, to);
      return;
    } catch (error) {
      lastError = error;
      const code = (error as NodeJS.ErrnoException)?.code;
      if (!code || !TRANSIENT_CODES.has(code) || attempt === attempts) break;
      sleepSync(delayMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Removes one temporary file with the same bounded sharing-violation policy. */
export async function unlinkWithRetry(path: string, options: RenameRetryOptions = {}): Promise<void> {
  const attempts = options.attempts ?? 8;
  const delayMs = options.delayMs ?? 40;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { await unlink(path); return; } catch (error) {
      lastError = error;
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT' || !code || !TRANSIENT_CODES.has(code) || attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export interface AtomicWriteOptions {
  /** Number of rename attempts before giving up. Default 8. */
  attempts?: number;
  /** Delay between attempts, in milliseconds. Default 40. */
  delayMs?: number;
  /** Injectable for tests that need to simulate a transient rename failure without
   *  monkey-patching Node's built-in `fs` module (its ESM bindings are read-only, so
   *  that trick does not work here). Defaults to the real `renameSync`. */
  rename?: (from: string, to: string) => void;
}

function sleepSync(ms: number): void {
  // A blocking sleep. There is no synchronous timer in Node, so this busy-waits on
  // Atomics.wait against a throwaway SharedArrayBuffer -- acceptable here because the
  // whole point is a short, bounded pause between two synchronous filesystem calls
  // inside the main process, not something run on a hot path.
  const sab = new SharedArrayBuffer(4);
  const view = new Int32Array(sab);
  Atomics.wait(view, 0, 0, ms);
}

/**
 * Writes `data` to `path` atomically: write to a unique temp file beside the
 * destination, then rename over it, retrying the rename a bounded number of times when
 * the destination is transiently locked. Never leaves a partially-written destination --
 * a reader either sees the previous bytes or the new ones, never a mix.
 */
export function atomicWriteFileSync(path: string, data: string, options: AtomicWriteOptions = {}): void {
  const attempts = options.attempts ?? 8;
  const delayMs = options.delayMs ?? 40;
  const rename = options.rename ?? renameSync;
  mkdirSync(dirname(path), { recursive: true });
  const tempPath = `${path}.${process.pid}.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  writeFileSync(tempPath, data);
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      rename(tempPath, path);
      return;
    } catch (error) {
      lastError = error;
      const code = (error as NodeJS.ErrnoException)?.code;
      if (!code || !TRANSIENT_CODES.has(code) || attempt === attempts) break;
      sleepSync(delayMs);
    }
  }
  // The rename never landed. Clean up the orphaned temp file rather than leaving it
  // behind, then surface the real error instead of pretending the write succeeded.
  try { unlinkSync(tempPath); } catch { /* best effort; the real error is thrown below */ }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
