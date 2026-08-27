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
 * process in the background for legacy callers. Attention settings use the explicit
 * `writeItem` and `removeItem` methods when they need an acknowledgement. Until
 * `bootstrap()` resolves, reads answer as if nothing were stored yet, the same
 * fail-closed-to-defaults behaviour a corrupt or missing file gets on the main-process side.
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
  /** Loads the initial snapshot and retains the exact result, including failures. */
  bootstrap(): Promise<DurableBootstrapResult>;
  /** Retries only within the bounded retry budget. */
  retryBootstrap(): Promise<DurableBootstrapResult>;
  /** The last bootstrap result, retained for rendering and diagnostics. */
  bootstrapResult(): DurableBootstrapResult | undefined;
  /** Writes one value and reports whether the main process acknowledged it. */
  writeItem(key: string, value: string): Promise<DurableWriteResult>;
  /** Removes one value and reports whether the main process acknowledged it. */
  removeItem(key: string): Promise<DurableWriteResult>;
}

export interface DurableWriteResult {
  ok: boolean;
  durable: boolean;
}

export const DURABLE_BOOTSTRAP_MAX_RETRIES = 3;
export type DurableBootstrapResult =
  | { status: 'loaded'; restoredKeys: number; attempt: number }
  | { status: 'unavailable'; reason: 'bridge-missing'; attempt: number }
  | { status: 'malformed'; reason: 'invalid-response' | 'invalid-values'; attempt: number }
  | { status: 'retryable'; reason: 'request-failed' | 'refused'; attempt: number; retriesRemaining: number };

/**
 * Builds one durable storage instance. With no bridge available (tests, or a host with
 * no preload), the cache still works for the lifetime of the session -- exactly the
 * graceful degrade `createMemoryStorage()` already provided -- it simply never persists.
 */
export function createDurableStorage(bridge: DurableStorageBridge | undefined): DurableStorageHandle {
  const cache = new Map<string, string>();
  let bootstrapped = false;
  let bootstrapPromise: Promise<DurableBootstrapResult> | undefined;
  let result: DurableBootstrapResult | undefined;
  let attempt = 0;

  async function bootstrap(): Promise<DurableBootstrapResult> {
    if (bootstrapped && result) return result;
    if (bootstrapPromise) return bootstrapPromise;
    bootstrapPromise = (async () => {
      attempt += 1;
      cache.clear();
      result = undefined;
      if (!bridge) {
        result = { status: 'unavailable', reason: 'bridge-missing', attempt };
        bootstrapped = true;
        return result;
      }
      try {
        const response = await bridge.controlPlane.request({ requestId: newRequestId(), action: 'settings.snapshot' });
        if (!response) {
          result = { status: 'retryable', reason: 'request-failed', attempt, retriesRemaining: Math.max(0, DURABLE_BOOTSTRAP_MAX_RETRIES - attempt) };
        } else if (!response.ok) {
          result = { status: 'retryable', reason: 'refused', attempt, retriesRemaining: Math.max(0, DURABLE_BOOTSTRAP_MAX_RETRIES - attempt) };
        } else {
          const data = response.data;
          if (!data || typeof data !== 'object' || !('values' in data)) {
            result = { status: 'malformed', reason: 'invalid-response', attempt };
          } else {
            const values = (data as { values?: unknown }).values;
            if (!values || typeof values !== 'object' || Array.isArray(values)) {
              result = { status: 'malformed', reason: 'invalid-values', attempt };
            } else {
              let restoredKeys = 0;
              for (const [key, value] of Object.entries(values)) {
                if (typeof value !== 'string') {
                  result = { status: 'malformed', reason: 'invalid-values', attempt };
                  cache.clear();
                  break;
                }
                cache.set(key, value);
                restoredKeys += 1;
              }
              if (!result || result.status !== 'malformed') result = { status: 'loaded', restoredKeys, attempt };
            }
          }
        }
      } catch {
        result = { status: 'retryable', reason: 'request-failed', attempt, retriesRemaining: Math.max(0, DURABLE_BOOTSTRAP_MAX_RETRIES - attempt) };
      }
      bootstrapped = true;
      return result!;
    })();
    try { return await bootstrapPromise; } finally { bootstrapPromise = undefined; }
  }

  async function retryBootstrap(): Promise<DurableBootstrapResult> {
    if (result?.status === 'loaded') return result;
    if (attempt >= DURABLE_BOOTSTRAP_MAX_RETRIES) {
      if (result?.status === 'retryable') return result;
      return result ?? { status: 'unavailable', reason: 'bridge-missing', attempt };
    }
    bootstrapped = false;
    return bootstrap();
  }

  const pending = new Map<string, { kind: 'write' | 'remove'; value?: string; promise: Promise<DurableWriteResult> }>();
  const chains = new Map<string, Promise<DurableWriteResult>>();

  function persist(action: 'settings.write' | 'settings.remove', payload: Record<string, unknown>, key: string, value?: string): Promise<DurableWriteResult> {
    const kind = action === 'settings.write' ? 'write' : 'remove';
    const existing = pending.get(key);
    if (existing && existing.kind === kind && existing.value === value) return existing.promise;
    const previous = chains.get(key) ?? Promise.resolve({ ok: true, durable: !!bridge });
    const promise = previous.catch(() => ({ ok: false, durable: !!bridge })).then(() => bridge
      ? bridge.controlPlane.request({ requestId: newRequestId(), action, payload })
        .then((response) => ({ ok: response?.ok === true, durable: true }))
        .catch(() => ({ ok: false, durable: true }))
      : Promise.resolve({ ok: false, durable: false }));
    chains.set(key, promise);
    pending.set(key, { kind, value, promise });
    void promise.finally(() => {
      const current = pending.get(key);
      if (current?.promise === promise) pending.delete(key);
      if (chains.get(key) === promise) chains.delete(key);
    });
    return promise;
  }

  function writeItem(key: string, value: string): Promise<DurableWriteResult> {
    cache.set(key, value);
    return persist('settings.write', { key, value }, key, value);
  }

  function removeItem(key: string): Promise<DurableWriteResult> {
    const existing = pending.get(key);
    if (existing && existing.kind === 'remove') return existing.promise;
    if (!cache.has(key)) return Promise.resolve({ ok: true, durable: !!bridge });
    cache.delete(key);
    return persist('settings.remove', { key }, key);
  }

  const storage: DurableStorage = {
    getItem(key) {
      return cache.has(key) ? cache.get(key)! : null;
    },
    setItem(key, value) {
      void writeItem(key, value);
    },
    removeItem(key) {
      void removeItem(key);
    },
  };

  return { storage, bootstrap, retryBootstrap, bootstrapResult: () => result, writeItem, removeItem };
}
