/**
 * A `localStorage`-shaped storage seam that actually survives a relaunch.
 *
 * The renderer is loaded from a `file://` origin, and Chromium keeps DOM storage for
 * that origin in memory only: a write to `window.localStorage` succeeds, reads back
 * correctly in the same session, and is gone the moment the process exits -- proven by
 * writing a value, inspecting the on-disk store and finding it empty, and confirming the
 * value is gone after a real relaunch three different ways (force-kill, normal kill,
 * graceful close). Every caller that reached for `localStorage` expecting durability
 * (the appearance editor, the personal-vocabulary cache) was therefore not persisting
 * anything at all.
 *
 * The fix routes through the main process instead, via the existing generic control-plane
 * request bridge (`settings.snapshot` / `settings.write` / `settings.remove`; see
 * `control-plane/settings-store.ts`), which persists to an atomically-written JSON file
 * under `app.getPath('userData')`.
 *
 * The main-process round trip is asynchronous, but every existing caller of this seam
 * (`VocabularyStorage`, the appearance editor) needs a synchronous get/set/remove, exactly
 * like `localStorage` itself. This module bridges the two with a write-through cache:
 * `bootstrap()` loads the full snapshot once, after which every read is answered from an
 * in-memory `Map` and every write updates that `Map` immediately (so the value is visible
 * to the very next synchronous read within the same session) and is mirrored to the main
 * process in the background. Until `bootstrap()` resolves, reads answer as if nothing were
 * stored yet -- the same fail-closed-to-defaults behaviour a corrupt or missing file gets
 * on the main-process side.
 */

/** The minimal shape of the control-plane request the durable storage needs, kept
 *  narrow rather than importing the full desktop bridge type so this module has no
 *  dependency on `App.tsx`. */
export interface DurableStorageBridge {
  controlPlane: {
    request(request: Record<string, unknown>): Promise<{ ok: boolean; data?: unknown } | undefined>;
  };
}

/** Same shape `VocabularyStorage` (and the DOM's own `Storage`) already expect, so this
 *  can be dropped in wherever `window.localStorage` used to be passed. */
export interface DurableStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function newRequestId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return c?.randomUUID ? c.randomUUID() : `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface DurableStorageHandle {
  storage: DurableStorage;
  /** Writes one value and resolves only after the privileged store acknowledges it. */
  writeAcknowledged(key: string, value: string): Promise<{ ok: true } | { ok: false; reason: string }>;
  /** Resolves once the initial snapshot has been loaded (or, with no bridge, resolves
   *  immediately with an empty cache). Callers that restore persisted UI state at mount
   *  should await this before reading, then re-render. */
  bootstrap(): Promise<void>;
}

/**
 * Builds one durable storage instance. With no bridge available (tests, or a host with
 * no preload), the cache still works for the lifetime of the session -- exactly the
 * graceful degrade `createMemoryStorage()` already provided -- it simply never persists.
 */
export function createDurableStorage(bridge: DurableStorageBridge | undefined): DurableStorageHandle {
  const cache = new Map<string, string>();
  let bootstrapped = false;
  let bootstrapPromise: Promise<void> | undefined;

  async function bootstrap(): Promise<void> {
    if (bootstrapped) return;
    if (bootstrapPromise) return bootstrapPromise;
    bootstrapPromise = (async () => {
      if (!bridge) { bootstrapped = true; return; }
      try {
        const response = await bridge.controlPlane.request({ requestId: newRequestId(), action: 'settings.snapshot' });
        if (response?.ok) {
          const values = (response.data as { values?: Record<string, string> } | undefined)?.values;
          if (values && typeof values === 'object') {
            for (const [key, value] of Object.entries(values)) {
              if (typeof value === 'string') cache.set(key, value);
            }
          }
        }
      } catch {
        // No snapshot to restore from; the cache stays empty, i.e. every renderer
        // default applies, exactly like a missing settings.json on the main-process side.
      } finally {
        bootstrapped = true;
      }
    })();
    return bootstrapPromise;
  }

  function persist(action: 'settings.write' | 'settings.remove', payload: Record<string, unknown>): void {
    if (!bridge) return;
    // Fire-and-forget: the cache is already updated synchronously above, so the
    // renderer's own next read is correct regardless of how long the IPC round trip
    // takes. A failure here means the next relaunch loses this one write; it never
    // corrupts the in-session value.
    void bridge.controlPlane.request({ requestId: newRequestId(), action, payload }).catch(() => {});
  }

  async function writeAcknowledged(key: string, value: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    const previous = cache.get(key);
    cache.set(key, value);
    if (!bridge) return { ok: false, reason: 'The durable settings bridge is unavailable, so the value was not acknowledged.' };
    try {
      const response = await bridge.controlPlane.request({ requestId: newRequestId(), action: 'settings.write', payload: { key, value } });
      if (response?.ok) return { ok: true };
      if (previous === undefined) cache.delete(key); else cache.set(key, previous);
      return { ok: false, reason: 'The durable settings store refused the write.' };
    } catch (error) {
      if (previous === undefined) cache.delete(key); else cache.set(key, previous);
      return { ok: false, reason: `The durable settings store did not acknowledge the write: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  const storage: DurableStorage = {
    getItem(key) {
      return cache.has(key) ? cache.get(key)! : null;
    },
    setItem(key, value) {
      cache.set(key, value);
      persist('settings.write', { key, value });
    },
    removeItem(key) {
      if (!cache.has(key)) return;
      cache.delete(key);
      persist('settings.remove', { key });
    },
  };

  return { storage, bootstrap, writeAcknowledged };
}
