/**
 * Strict local personal-vocabulary loader. No mappings, examples, private values,
 * source paths, network calls, or telemetry ship in this module.
 */

export const SCHEMA_VERSION = 1;
export const MAX_FILE_BYTES = 65_536;
export const MAX_REPLACEMENTS = 256;
export const MAX_FROM_LENGTH = 128;
export const MAX_TO_LENGTH = 256;
export const MAX_NESTING_DEPTH = 4;

const CACHE_KEY = 'ding-pbx-vocabulary-cache';
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

class JsonSyntaxError extends Error {}
class DuplicateJsonKeyError extends Error {}

/** Parse JSON while retaining the duplicate-key information JSON.parse discards. */
function parseStrictJson(source: string): unknown {
  let cursor = 0;
  const skipWhitespace = (): void => {
    while (cursor < source.length && [' ', '\t', '\r', '\n'].includes(source[cursor]!)) cursor += 1;
  };

  const parseString = (): string => {
    const start = cursor;
    if (source[cursor] !== '"') throw new JsonSyntaxError(`expected a string at character ${cursor + 1}`);
    cursor += 1;
    let escaped = false;
    while (cursor < source.length) {
      const character = source[cursor]!;
      cursor += 1;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (character === '"') {
        try {
          return JSON.parse(source.slice(start, cursor)) as string;
        } catch (error) {
          throw new JsonSyntaxError(error instanceof Error ? error.message : String(error));
        }
      }
      if (character.charCodeAt(0) < 0x20) throw new JsonSyntaxError(`unescaped control character at ${cursor}`);
    }
    throw new JsonSyntaxError('unterminated string');
  };

  const parseValue = (depth: number): unknown => {
    if (depth > MAX_NESTING_DEPTH) throw new JsonSyntaxError(`nesting exceeds ${MAX_NESTING_DEPTH} levels`);
    skipWhitespace();
    const character = source[cursor];
    if (character === '"') return parseString();
    if (character === '{') {
      cursor += 1;
      const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
      const seen = new Set<string>();
      skipWhitespace();
      if (source[cursor] === '}') { cursor += 1; return result; }
      while (cursor < source.length) {
        skipWhitespace();
        const key = parseString();
        if (seen.has(key)) throw new DuplicateJsonKeyError(`duplicate object key ${JSON.stringify(key)}`);
        if (UNSAFE_KEYS.has(key)) throw new JsonSyntaxError(`unsafe object key ${JSON.stringify(key)}`);
        seen.add(key);
        skipWhitespace();
        if (source[cursor] !== ':') throw new JsonSyntaxError(`expected ':' after ${JSON.stringify(key)}`);
        cursor += 1;
        result[key] = parseValue(depth + 1);
        skipWhitespace();
        if (source[cursor] === '}') { cursor += 1; return result; }
        if (source[cursor] !== ',') throw new JsonSyntaxError(`expected ',' or '}' at character ${cursor + 1}`);
        cursor += 1;
      }
      throw new JsonSyntaxError('unterminated object');
    }
    if (character === '[') {
      cursor += 1;
      const result: unknown[] = [];
      skipWhitespace();
      if (source[cursor] === ']') { cursor += 1; return result; }
      while (cursor < source.length) {
        result.push(parseValue(depth + 1));
        skipWhitespace();
        if (source[cursor] === ']') { cursor += 1; return result; }
        if (source[cursor] !== ',') throw new JsonSyntaxError(`expected ',' or ']' at character ${cursor + 1}`);
        cursor += 1;
      }
      throw new JsonSyntaxError('unterminated array');
    }
    const rest = source.slice(cursor);
    for (const [literal, value] of [['true', true], ['false', false], ['null', null]] as const) {
      if (rest.startsWith(literal)) { cursor += literal.length; return value; }
    }
    const number = rest.match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u)?.[0];
    if (number) {
      cursor += number.length;
      const value = Number(number);
      if (!Number.isFinite(value)) throw new JsonSyntaxError('number is outside the supported range');
      return value;
    }
    throw new JsonSyntaxError(`unexpected value at character ${cursor + 1}`);
  };

  const value = parseValue(1);
  skipWhitespace();
  if (cursor !== source.length) throw new JsonSyntaxError(`unexpected trailing content at character ${cursor + 1}`);
  return value;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): string | undefined {
  const expected = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) return `${path} contains unexpected field ${JSON.stringify(key)}.`;
  }
  for (const key of allowed) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return `${path} is missing field ${JSON.stringify(key)}.`;
  }
  return undefined;
}

/** Validate the complete byte payload against one canonical versioned schema. */
export function validateVocabularyPayload(rawText: string): ValidationResult {
  const byteLength = new TextEncoder().encode(rawText).length;
  if (byteLength > MAX_FILE_BYTES) {
    return { ok: false, reason: `Rejected: the file is ${byteLength} bytes and the limit is ${MAX_FILE_BYTES} bytes.` };
  }

  let parsed: unknown;
  try {
    parsed = parseStrictJson(rawText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const prefix = error instanceof DuplicateJsonKeyError ? 'duplicate keys are not accepted' : 'not valid JSON';
    return { ok: false, reason: `Rejected: ${prefix} (${message}).` };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'Rejected: the top level must be a JSON object.' };
  }
  const root = parsed as Record<string, unknown>;
  const rootIssue = exactKeys(root, ['version', 'replacements'], 'The top level');
  if (rootIssue) return { ok: false, reason: `Rejected: ${rootIssue}` };
  if (root.version !== SCHEMA_VERSION) {
    return { ok: false, reason: `Rejected: expected schema version ${SCHEMA_VERSION}, but found ${JSON.stringify(root.version)}.` };
  }
  if (!Array.isArray(root.replacements)) {
    return { ok: false, reason: 'Rejected: "replacements" must be an array of {"from","to"} objects.' };
  }
  if (root.replacements.length === 0 || root.replacements.length > MAX_REPLACEMENTS) {
    return { ok: false, reason: `Rejected: "replacements" must contain 1 to ${MAX_REPLACEMENTS} entries.` };
  }

  const replacements: Replacement[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < root.replacements.length; index += 1) {
    const item = root.replacements[index];
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, reason: `Rejected: replacement ${index + 1} must be an object.` };
    }
    const entry = item as Record<string, unknown>;
    const entryIssue = exactKeys(entry, ['from', 'to'], `Replacement ${index + 1}`);
    if (entryIssue) return { ok: false, reason: `Rejected: ${entryIssue}` };
    if (typeof entry.from !== 'string' || entry.from.length === 0 || entry.from.length > MAX_FROM_LENGTH) {
      return { ok: false, reason: `Rejected: replacement ${index + 1} has an invalid "from" value.` };
    }
    if (typeof entry.to !== 'string' || entry.to.length > MAX_TO_LENGTH) {
      return { ok: false, reason: `Rejected: replacement ${index + 1} has an invalid "to" value.` };
    }
    if (UNSAFE_KEYS.has(entry.from)) {
      return { ok: false, reason: `Rejected: replacement ${index + 1} uses an unsafe source term.` };
    }
    if (seen.has(entry.from)) {
      return { ok: false, reason: `Rejected: the "from" value in replacement ${index + 1} is duplicated.` };
    }
    seen.add(entry.from);
    replacements.push({ from: entry.from, to: entry.to });
  }
  return { ok: true, file: { version: SCHEMA_VERSION, replacements } };
}

export interface VocabularyStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Revalidate the cache before every use and purge a stale or corrupt record. */
export function readVocabularyCache(storage: VocabularyStorage): VocabularyFile | undefined {
  const raw = storage.getItem(CACHE_KEY);
  if (raw === null) return undefined;
  const result = validateVocabularyPayload(raw);
  if (!result.ok) {
    try { storage.removeItem(CACHE_KEY); } catch { /* Original wording remains active. */ }
    return undefined;
  }
  return result.file;
}

export interface LoadResult {
  readonly ok: boolean;
  readonly status: string;
  readonly replacementCount: number;
}

/** A rejected upload leaves the last valid cache unchanged. */
export function loadVocabularyFile(storage: VocabularyStorage, rawText: string): LoadResult {
  const result = validateVocabularyPayload(rawText);
  if (!result.ok) return { ok: false, status: result.reason, replacementCount: 0 };
  try {
    storage.setItem(CACHE_KEY, JSON.stringify(result.file));
  } catch (error) {
    return {
      ok: false,
      status: `The validated file was not cached: ${error instanceof Error ? error.message : String(error)}`,
      replacementCount: 0,
    };
  }
  const count = result.file.replacements.length;
  return { ok: true, status: `Loaded ${count} local replacement${count === 1 ? '' : 's'}. No data was transmitted.`, replacementCount: count };
}

export function clearVocabulary(storage: VocabularyStorage): LoadResult {
  try {
    storage.removeItem(CACHE_KEY);
  } catch (error) {
    return {
      ok: false,
      status: `The local cache was not cleared: ${error instanceof Error ? error.message : String(error)}`,
      replacementCount: readVocabularyCache(storage)?.replacements.length ?? 0,
    };
  }
  return { ok: true, status: 'No file loaded; original wording is active.', replacementCount: 0 };
}

export function vocabularyStatus(storage: VocabularyStorage): LoadResult {
  const file = readVocabularyCache(storage);
  if (!file) return { ok: true, status: 'No file loaded; original wording is active.', replacementCount: 0 };
  const count = file.replacements.length;
  return { ok: true, status: `Loaded ${count} local replacement${count === 1 ? '' : 's'}. No data was transmitted.`, replacementCount: count };
}

export type VocabularyTextBoundary = 'user-interface-copy' | 'accessible-name';

export interface VocabularyTextBoundaryInput {
  text: string;
  boundary: VocabularyTextBoundary;
}

/**
 * Apply replacements only to an explicitly classified private text boundary. Callers
 * must never pass commands, URLs, identifiers, code, paths, logs, exports, history,
 * diagnostics, provider-authored text, or public records through this API.
 */
export function applyVocabularyText(storage: VocabularyStorage, input: VocabularyTextBoundaryInput): string {
  const file = readVocabularyCache(storage);
  if (!file || file.replacements.length === 0) return input.text;
  const ordered = [...file.replacements].sort((left, right) => right.from.length - left.from.length);
  const replacementBySource = new Map(ordered.map((replacement) => [replacement.from, replacement.to]));
  const escaped = ordered.map((replacement) => replacement.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return input.text.replace(new RegExp(escaped.join('|'), 'gu'), (match) => replacementBySource.get(match) ?? match);
}

export const applyVocabularyTextAtBoundary = applyVocabularyText;

export function createVocabularyTextBoundary(storage: VocabularyStorage): {
  apply(input: VocabularyTextBoundaryInput): string;
  status(): LoadResult;
} {
  return {
    apply: (input) => applyVocabularyText(storage, input),
    status: () => vocabularyStatus(storage),
  };
}

export function createMemoryStorage(): VocabularyStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}
