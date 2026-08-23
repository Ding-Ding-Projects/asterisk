/**
 * Local personal-vocabulary loader.
 *
 * Pure validation and application logic for a user-supplied local JSON file that remaps
 * specific words in the interface to their own preferred terms. No network request of
 * any kind. No bundled mappings, samples, templates, guesses, or defaults ship here —
 * the data exists only after a user supplies a valid file, and clearing it restores
 * original wording immediately.
 *
 * The accepted file shape mirrors the site's loader exactly (`site/app.js`,
 * `loadVocabulary`), because the same real file a user has must load on both surfaces:
 *   - a top-level "version" (or "schemaVersion") equal to 1
 *   - "replacements" as either an array of {"from","to"} objects, or an object mapping
 *     each term to its replacement (also accepted under a "terms" key)
 *
 * Every function here is pure and takes its I/O as arguments, so tests need no
 * filesystem, storage, or network.
 */

export const SCHEMA_VERSION = 1;
export const MAX_FILE_BYTES = 65536;
export const MAX_REPLACEMENTS = 256;
export const MAX_FROM_LENGTH = 128;
export const MAX_TO_LENGTH = 256;
export const MAX_NESTING_DEPTH = 4;

/** Object keys that could touch a prototype rather than naming a real replacement. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export interface Replacement {
  readonly from: string;
  readonly to: string;
}

export interface VocabularyFile {
  readonly version: 1;
  readonly replacements: readonly Replacement[];
}

export interface ValidationOk {
  readonly ok: true;
  readonly file: VocabularyFile;
}

export interface ValidationFailed {
  readonly ok: false;
  readonly reason: string;
}

export type ValidationResult = ValidationOk | ValidationFailed;

function measureDepth(value: unknown, guard = 0): number {
  if (guard > MAX_NESTING_DEPTH + 2) return guard; // bail out; caller rejects past the bound anyway
  if (value === null || typeof value !== 'object') return 0;
  if (Array.isArray(value)) {
    let max = 0;
    for (const item of value) max = Math.max(max, measureDepth(item, guard + 1));
    return 1 + max;
  }
  let max = 0;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    max = Math.max(max, measureDepth((value as Record<string, unknown>)[key], guard + 1));
  }
  return 1 + max;
}

function hasUnsafeKey(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasUnsafeKey);
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (UNSAFE_KEYS.has(key)) return true;
    if (hasUnsafeKey((value as Record<string, unknown>)[key])) return true;
  }
  return false;
}

/**
 * Validate raw JSON bytes (already decoded to text) against the bounded schema. Never
 * touches the network, storage, or the DOM — a pure function from bytes to a validated
 * file or an exact, human-readable rejection reason.
 */
export function validateVocabularyPayload(rawText: string): ValidationResult {
  const byteLength = new TextEncoder().encode(rawText).length;
  if (byteLength > MAX_FILE_BYTES) {
    return { ok: false, reason: `Rejected: the file is ${Math.ceil(byteLength / 1024)} KiB and the limit is ${MAX_FILE_BYTES / 1024} KiB.` };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch (error) {
    return { ok: false, reason: `Rejected: not valid JSON (${error instanceof Error ? error.message : String(error)}).` };
  }

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'Rejected: the top level must be a JSON object.' };
  }
  const root = raw as Record<string, unknown>;

  if (hasUnsafeKey(root)) {
    return { ok: false, reason: 'Rejected: this file uses an unsafe object key (__proto__, constructor, or prototype).' };
  }

  const depth = measureDepth(root);
  if (depth > MAX_NESTING_DEPTH) {
    return { ok: false, reason: `Rejected: the file nests ${depth} levels deep and the limit is ${MAX_NESTING_DEPTH}.` };
  }

  // Accept "version" or "schemaVersion", exactly as the site's loader does — the site's
  // own settings export uses "schemaVersion", so a file this app produced elsewhere must
  // not be rejected here for spelling its version key the other way.
  const version = root.version !== undefined ? root.version : root.schemaVersion;
  if (version !== SCHEMA_VERSION) {
    return { ok: false, reason: `Rejected: expected schema version ${SCHEMA_VERSION}, but this file declares ${JSON.stringify(version)}. Set "version": ${SCHEMA_VERSION} (or "schemaVersion": ${SCHEMA_VERSION}) at the top level.` };
  }

  const rawReplacements = root.replacements;
  let list: unknown[];
  if (Array.isArray(rawReplacements)) {
    list = rawReplacements;
  } else if (rawReplacements !== null && typeof rawReplacements === 'object') {
    list = Object.entries(rawReplacements as Record<string, unknown>).map(([from, to]) => ({ from, to }));
  } else if (root.terms !== null && typeof root.terms === 'object' && !Array.isArray(root.terms)) {
    list = Object.entries(root.terms as Record<string, unknown>).map(([from, to]) => ({ from, to }));
  } else {
    return { ok: false, reason: 'Rejected: this file has no replacements. Provide "replacements" as a list of {"from","to"} objects, or as an object mapping each term to its replacement.' };
  }

  if (list.length > MAX_REPLACEMENTS) {
    return { ok: false, reason: `Rejected: this file has ${list.length} replacements and the limit is ${MAX_REPLACEMENTS}. Remove ${list.length - MAX_REPLACEMENTS}.` };
  }

  const replacements: Replacement[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < list.length; index += 1) {
    const item = list[index] as { from?: unknown; to?: unknown } | null;
    if (!item || typeof item !== 'object') {
      return { ok: false, reason: `Rejected: replacement ${index + 1} is not valid: expected an object with "from" and "to".` };
    }
    const { from, to } = item;
    if (typeof from !== 'string') {
      return { ok: false, reason: `Rejected: replacement ${index + 1} is not valid: "from" is missing or is not a string.` };
    }
    if (typeof to !== 'string') {
      return { ok: false, reason: `Rejected: replacement ${index + 1} is not valid: "to" is missing or is not a string.` };
    }
    if (from.length === 0 || from.length > MAX_FROM_LENGTH) {
      return { ok: false, reason: `Rejected: replacement ${index + 1} is not valid: "from" is ${from.length} characters and the limit is ${MAX_FROM_LENGTH}.` };
    }
    if (to.length > MAX_TO_LENGTH) {
      return { ok: false, reason: `Rejected: replacement ${index + 1} is not valid: "to" is ${to.length} characters and the limit is ${MAX_TO_LENGTH}.` };
    }
    if (UNSAFE_KEYS.has(from)) {
      return { ok: false, reason: `Rejected: replacement ${index + 1} is not valid: ${JSON.stringify(from)} is not an accepted term.` };
    }
    if (seen.has(from)) {
      return { ok: false, reason: `Rejected: duplicate keys are not accepted; each "from" value must appear once. ${JSON.stringify(from)} appears more than once.` };
    }
    seen.add(from);
    replacements.push({ from, to });
  }

  return { ok: true, file: { version: SCHEMA_VERSION, replacements } };
}

// ---------------------------------------------------------------- cache

const CACHE_KEY = 'ding-pbx-vocabulary-cache';

/** Minimal storage seam so callers can inject `window.localStorage`, an in-memory stub
 *  for tests, or a persisted store bridged from the main process — never assumed. */
export interface VocabularyStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Re-validate a cached payload before every load. A cache that is missing, corrupt,
 *  stale, or fails the same bounds as a fresh upload fails closed to original wording —
 *  it is never trusted merely because it was written by this app before. */
export function readVocabularyCache(storage: VocabularyStorage): VocabularyFile | undefined {
  const raw = storage.getItem(CACHE_KEY);
  if (raw === null) return undefined;
  const result = validateVocabularyPayload(raw);
  if (!result.ok) {
    // A corrupt or now-invalid cache is purged rather than left to fail silently again
    // on every subsequent load.
    storage.removeItem(CACHE_KEY);
    return undefined;
  }
  return result.file;
}

export interface LoadResult {
  readonly ok: boolean;
  readonly status: string;
  readonly replacementCount: number;
}

/** Validate an uploaded file's raw text and, only on success, cache it. A rejected file
 *  never applies partially — the previous cache (if any) is left completely untouched. */
export function loadVocabularyFile(storage: VocabularyStorage, rawText: string): LoadResult {
  const result = validateVocabularyPayload(rawText);
  if (!result.ok) {
    return { ok: false, status: result.reason, replacementCount: 0 };
  }
  storage.setItem(CACHE_KEY, JSON.stringify(result.file));
  const count = result.file.replacements.length;
  return {
    ok: true,
    status: `Loaded ${count} local replacement${count === 1 ? '' : 's'}. No data was transmitted.`,
    replacementCount: count,
  };
}

/** Purge the cache and report the restored (original-wording) state. */
export function clearVocabulary(storage: VocabularyStorage): LoadResult {
  storage.removeItem(CACHE_KEY);
  return { ok: true, status: 'No file loaded; original wording is active.', replacementCount: 0 };
}

export function vocabularyStatus(storage: VocabularyStorage): LoadResult {
  const file = readVocabularyCache(storage);
  if (!file) return { ok: true, status: 'No file loaded; original wording is active.', replacementCount: 0 };
  const count = file.replacements.length;
  return {
    ok: true,
    status: `Loaded ${count} local replacement${count === 1 ? '' : 's'}. No data was transmitted.`,
    replacementCount: count,
  };
}

// ---------------------------------------------------------------- apply

/** Apply the active replacements to one piece of user-facing text. Longer `from` terms
 *  are applied first so a short term never shadows a longer one that contains it.
 *  Replacement is exact-substring, applied only at the text boundary — never to
 *  commands, URLs, identifiers, code, or file paths, which callers must keep out of the
 *  text passed here. */
export function applyVocabularyText(storage: VocabularyStorage, text: string): string {
  const file = readVocabularyCache(storage);
  if (!file || file.replacements.length === 0) return text;
  const ordered = [...file.replacements].sort((a, b) => b.from.length - a.from.length);
  let result = text;
  for (const { from, to } of ordered) {
    result = result.split(from).join(to);
  }
  return result;
}

/** In-memory storage stub for tests and for any host with no persistent store. Never
 *  used as a source of real vocabulary data — it starts and stays empty until a caller
 *  explicitly loads a file into it. */
export function createMemoryStorage(): VocabularyStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => { map.set(key, value); },
    removeItem: (key) => { map.delete(key); },
  };
}
