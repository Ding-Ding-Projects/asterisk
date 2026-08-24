/**
 * Durable renderer settings.
 *
 * The renderer is loaded from a `file://` origin, and Chromium keeps DOM storage for
 * that origin in memory only -- a value written to `window.localStorage` reads back
 * correctly within the same session and is gone the moment the process exits. Every
 * renderer feature that reached for `localStorage` expecting it to survive a relaunch
 * (the appearance editor, the personal-vocabulary cache) was therefore silently not
 * persisting anything, proven by writing a value, inspecting the on-disk store, and
 * finding it empty, then confirming the value was gone after a real relaunch.
 *
 * This module is the durable replacement: a small key/value store, keyed by an
 * arbitrary string key with a string value (renderer callers already serialise to JSON
 * themselves, exactly as `localStorage` expects), persisted through an injectable
 * `SettingsStore` so this file stays pure and testable with no filesystem or Electron
 * dependency -- the same shape as `ServerInventory` next to it.
 *
 * Nothing secret belongs here. A credential goes in the OS credential vault; this store
 * is plain JSON on disk and must never be asked to hold one.
 */

export interface SettingsSnapshotStore {
  /** Returns `undefined` when nothing has been persisted yet, or the file is unreadable. */
  read(): Record<string, string> | undefined;
  write(snapshot: Record<string, string>): void;
}

export type SettingsWriteResult =
  | { ok: true }
  | { ok: false; code: 'SETTINGS_WRITE_FAILED' | 'SETTINGS_REMOVE_FAILED'; message: string };

/** A store that keeps nothing -- the default for tests and any host with no persistent
 *  backing. Never a source of real data; it starts and stays empty. */
export class InMemorySettingsStore implements SettingsSnapshotStore {
  private snapshot: Record<string, string> = {};
  read(): Record<string, string> {
    return { ...this.snapshot };
  }
  write(snapshot: Record<string, string>): void {
    this.snapshot = { ...snapshot };
  }
}

/**
 * The in-process model: loads once from the injected store, keeps every mutation in
 * memory, and persists the whole snapshot back on every write. A corrupt or unreadable
 * backing file fails closed to an empty settings set (every renderer default applies)
 * rather than throwing at startup -- `SettingsSnapshotStore.read()` already returns
 * `undefined` for that case, exactly like `ServerInventoryStore.read()`.
 */
export class SettingsRegistry {
  private readonly store: SettingsSnapshotStore;
  private values = new Map<string, string>();

  constructor(store: SettingsSnapshotStore = new InMemorySettingsStore()) {
    this.store = store;
    const snapshot = this.store.read();
    if (snapshot) this.values = new Map(Object.entries(snapshot));
  }

  /** The full snapshot, sent to the renderer once at bootstrap so every subsequent
   *  read is synchronous against an in-memory cache rather than round-tripping IPC. */
  snapshot(): Record<string, string> {
    return Object.fromEntries(this.values);
  }

  get(key: string): string | undefined {
    return this.values.get(key);
  }

  set(key: string, value: string): SettingsWriteResult {
    const previous = new Map(this.values);
    this.values.set(key, value);
    try {
      this.store.write(this.snapshot());
      return { ok: true };
    } catch (error) {
      this.values = previous;
      return { ok: false, code: 'SETTINGS_WRITE_FAILED', message: error instanceof Error ? error.message : 'Could not persist the setting.' };
    }
  }

  remove(key: string): SettingsWriteResult {
    if (!this.values.has(key)) return { ok: true };
    const previous = new Map(this.values);
    this.values.delete(key);
    try {
      this.store.write(this.snapshot());
      return { ok: true };
    } catch (error) {
      this.values = previous;
      return { ok: false, code: 'SETTINGS_REMOVE_FAILED', message: error instanceof Error ? error.message : 'Could not remove the setting.' };
    }
  }
}
