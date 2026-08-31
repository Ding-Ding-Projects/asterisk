/** Pure, bounded contract used by privileged vocabulary persistence. */
export const VOCABULARY_SCHEMA_VERSION = 1 as const;
export const VOCABULARY_MAX_FILE_BYTES = 65_536;
export const VOCABULARY_MAX_REPLACEMENTS = 256;
export const VOCABULARY_MAX_FROM_LENGTH = 128;
export const VOCABULARY_MAX_TO_LENGTH = 256;
export const VOCABULARY_MAX_NESTING_DEPTH = 4;

export interface VocabularyReplacement { readonly from: string; readonly to: string }
export interface VocabularyFile { readonly version: 1; readonly replacements: readonly VocabularyReplacement[] }
export type VocabularyValidation = { readonly ok: true; readonly file: VocabularyFile } | { readonly ok: false; readonly reason: string };

class VocabularySyntaxError extends Error {}
class VocabularyDuplicateKeyError extends Error {}
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function parseStrictJson(source: string): unknown {
  let cursor = 0;
  const whitespace = () => { while (cursor < source.length && ' \t\r\n'.includes(source[cursor]!)) cursor += 1; };
  const stringValue = (): string => {
    const start = cursor;
    if (source[cursor] !== '"') throw new VocabularySyntaxError(`expected a string at character ${cursor + 1}`);
    cursor += 1;
    let escaped = false;
    while (cursor < source.length) {
      const character = source[cursor++]!;
      if (escaped) { escaped = false; continue; }
      if (character === '\\') { escaped = true; continue; }
      if (character === '"') {
        try { return JSON.parse(source.slice(start, cursor)) as string; }
        catch { throw new VocabularySyntaxError('invalid string escape'); }
      }
      if (character.charCodeAt(0) < 0x20) throw new VocabularySyntaxError('unescaped control character');
    }
    throw new VocabularySyntaxError('unterminated string');
  };
  const value = (depth: number): unknown => {
    if (depth > VOCABULARY_MAX_NESTING_DEPTH) throw new VocabularySyntaxError('nesting exceeds the supported depth');
    whitespace();
    const character = source[cursor];
    if (character === '"') return stringValue();
    if (character === '{') {
      cursor += 1;
      const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
      const seen = new Set<string>();
      whitespace();
      if (source[cursor] === '}') { cursor += 1; return result; }
      while (cursor < source.length) {
        whitespace();
        const key = stringValue();
        if (seen.has(key)) throw new VocabularyDuplicateKeyError(`duplicate key ${JSON.stringify(key)}`);
        if (UNSAFE_KEYS.has(key)) throw new VocabularySyntaxError(`unsafe key ${JSON.stringify(key)}`);
        seen.add(key);
        whitespace();
        if (source[cursor++] !== ':') throw new VocabularySyntaxError('expected a colon after an object key');
        result[key] = value(depth + 1);
        whitespace();
        if (source[cursor] === '}') { cursor += 1; return result; }
        if (source[cursor++] !== ',') throw new VocabularySyntaxError('expected a comma or object end');
      }
      throw new VocabularySyntaxError('unterminated object');
    }
    if (character === '[') {
      cursor += 1;
      const result: unknown[] = [];
      whitespace();
      if (source[cursor] === ']') { cursor += 1; return result; }
      while (cursor < source.length) {
        result.push(value(depth + 1));
        whitespace();
        if (source[cursor] === ']') { cursor += 1; return result; }
        if (source[cursor++] !== ',') throw new VocabularySyntaxError('expected a comma or array end');
      }
      throw new VocabularySyntaxError('unterminated array');
    }
    const rest = source.slice(cursor);
    for (const [literal, result] of [['true', true], ['false', false], ['null', null] ] as const) {
      if (rest.startsWith(literal)) { cursor += literal.length; return result; }
    }
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(rest)?.[0];
    if (number) { cursor += number.length; const parsed = Number(number); if (Number.isFinite(parsed)) return parsed; }
    throw new VocabularySyntaxError(`unexpected value at character ${cursor + 1}`);
  };
  const parsed = value(1);
  whitespace();
  if (cursor !== source.length) throw new VocabularySyntaxError('unexpected trailing content');
  return parsed;
}

function object(value: unknown, label: string): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export function validateVocabularyPayload(rawText: string): VocabularyValidation {
  const bytes = new TextEncoder().encode(rawText).byteLength;
  if (bytes > VOCABULARY_MAX_FILE_BYTES) return { ok: false, reason: `The vocabulary file exceeds the ${VOCABULARY_MAX_FILE_BYTES}-byte limit.` };
  let root: Record<string, unknown> | undefined;
  try { root = object(parseStrictJson(rawText), 'top level'); }
  catch (error) {
    const prefix = error instanceof VocabularyDuplicateKeyError ? 'duplicate keys are not accepted' : 'the file is not valid JSON';
    return { ok: false, reason: `${prefix}: ${error instanceof Error ? error.message : 'parse failed'}.` };
  }
  if (!root) return { ok: false, reason: 'The top level must be a JSON object.' };
  const versionKey = Object.hasOwn(root, 'version') ? 'version' : Object.hasOwn(root, 'schemaVersion') ? 'schemaVersion' : undefined;
  if (!versionKey || (versionKey === 'version' && Object.hasOwn(root, 'schemaVersion')) || (versionKey === 'schemaVersion' && Object.hasOwn(root, 'version')) || root[versionKey] !== 1) {
    return { ok: false, reason: 'Declare exactly one supported schema version field with value 1.' };
  }
  const sourceKey = Object.hasOwn(root, 'replacements') ? 'replacements' : Object.hasOwn(root, 'terms') ? 'terms' : undefined;
  if (!sourceKey || (sourceKey === 'replacements' && Object.hasOwn(root, 'terms')) || (sourceKey === 'terms' && Object.hasOwn(root, 'replacements'))) {
    return { ok: false, reason: 'Declare exactly one vocabulary replacement collection.' };
  }
  if (Object.keys(root).some(key => key !== versionKey && key !== sourceKey)) return { ok: false, reason: 'The top level contains an unexpected field.' };
  const source = root[sourceKey];
  let raw: unknown[];
  if (sourceKey === 'terms') {
    const map = object(source, 'terms');
    if (!map) return { ok: false, reason: 'The terms collection must be an object map.' };
    raw = Object.entries(map).map(([from, to]) => ({ from, to }));
  } else if (Array.isArray(source)) raw = source;
  else return { ok: false, reason: 'The replacements collection must be an array.' };
  if (raw.length < 1 || raw.length > VOCABULARY_MAX_REPLACEMENTS) return { ok: false, reason: `The replacement count must be between 1 and ${VOCABULARY_MAX_REPLACEMENTS}.` };
  const replacements: VocabularyReplacement[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < raw.length; index += 1) {
    const entry = object(raw[index], `replacement ${index + 1}`);
    if (!entry || Object.keys(entry).length !== 2 || !Object.hasOwn(entry, 'from') || !Object.hasOwn(entry, 'to')) return { ok: false, reason: `Replacement ${index + 1} must contain only from and to strings.` };
    if (typeof entry.from !== 'string' || entry.from.length < 1 || entry.from.length > VOCABULARY_MAX_FROM_LENGTH || UNSAFE_KEYS.has(entry.from)) return { ok: false, reason: `Replacement ${index + 1} has an invalid source string.` };
    if (typeof entry.to !== 'string' || entry.to.length > VOCABULARY_MAX_TO_LENGTH) return { ok: false, reason: `Replacement ${index + 1} has an invalid replacement string.` };
    if (seen.has(entry.from)) return { ok: false, reason: `Replacement ${index + 1} repeats a source string.` };
    seen.add(entry.from);
    replacements.push({ from: entry.from, to: entry.to });
  }
  return { ok: true, file: { version: 1, replacements } };
}
