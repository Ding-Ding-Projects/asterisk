import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  applyVocabularyText,
  clearVocabulary,
  createMemoryStorage,
  loadVocabularyFile,
  MAX_FILE_BYTES,
  MAX_FROM_LENGTH,
  MAX_NESTING_DEPTH,
  MAX_REPLACEMENTS,
  MAX_TO_LENGTH,
  readVocabularyCache,
  validateVocabularyPayload,
  vocabularyStatus,
} from '../../app/renderer/src/personal-vocabulary.ts';

const VALID_ARRAY = JSON.stringify({ version: 1, replacements: [{ from: 'sample-alpha', to: 'sample-beta' }] });
const applyAtCopyBoundary = (storage: ReturnType<typeof createMemoryStorage>, text: string): string =>
  applyVocabularyText(storage, { text, boundary: 'user-interface-copy' });

// ---------------------------------------------------------------- absent-control / empty state

test('vocabularyStatus on empty storage reports no file loaded, original wording active', () => {
  const storage = createMemoryStorage();
  const status = vocabularyStatus(storage);
  assert.equal(status.ok, true);
  assert.equal(status.replacementCount, 0);
  assert.match(status.status, /No file loaded; original wording is active\./);
});

test('applyVocabularyText is a no-op with no file loaded', () => {
  const storage = createMemoryStorage();
  assert.equal(applyAtCopyBoundary(storage, 'sample-alpha here'), 'sample-alpha here');
});

// ---------------------------------------------------------------- valid load

test('valid array-form payload is accepted', () => {
  const result = validateVocabularyPayload(VALID_ARRAY);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.file.version, 1);
    assert.deepEqual(result.file.replacements, [{ from: 'sample-alpha', to: 'sample-beta' }]);
  }
});

test('every documented version and replacement representation normalizes to canonical array cache data', () => {
  for (const payload of [
    JSON.stringify({ version: 1, replacements: [{ from: 'sample-alpha', to: 'sample-beta' }] }),
    JSON.stringify({ schemaVersion: 1, replacements: [{ from: 'sample-alpha', to: 'sample-beta' }] }),
    JSON.stringify({ version: 1, replacements: { 'sample-alpha': 'sample-beta' } }),
    JSON.stringify({ schemaVersion: 1, replacements: { 'sample-alpha': 'sample-beta' } }),
    JSON.stringify({ version: 1, terms: { 'sample-alpha': 'sample-beta' } }),
    JSON.stringify({ schemaVersion: 1, terms: { 'sample-alpha': 'sample-beta' } }),
  ]) {
    const result = validateVocabularyPayload(payload);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.file, { version: 1, replacements: [{ from: 'sample-alpha', to: 'sample-beta' }] });
    }
  }
});

test('conflicting aliases and extra root fields are rejected rather than resolved by precedence', () => {
  for (const payload of [
    JSON.stringify({ version: 1, schemaVersion: 1, replacements: [] }),
    JSON.stringify({ version: 1, replacements: [], terms: {} }),
    JSON.stringify({ version: 1, replacements: [], extra: true }),
  ]) {
    const result = validateVocabularyPayload(payload);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /exactly one|unexpected field/);
  }
});

test('loadVocabularyFile caches a valid file and reports the count', () => {
  const storage = createMemoryStorage();
  const result = loadVocabularyFile(storage, VALID_ARRAY);
  assert.equal(result.ok, true);
  assert.equal(result.replacementCount, 1);
  assert.match(result.status, /Loaded 1 local replacement\. No data was transmitted\./);
  const cached = readVocabularyCache(storage);
  assert.ok(cached);
  assert.deepEqual(cached?.replacements, [{ from: 'sample-alpha', to: 'sample-beta' }]);
});

test('loadVocabularyFile pluralizes the count correctly', () => {
  const storage = createMemoryStorage();
  const payload = JSON.stringify({ version: 1, replacements: [{ from: 'a', to: 'b' }, { from: 'c', to: 'd' }] });
  const result = loadVocabularyFile(storage, payload);
  assert.match(result.status, /Loaded 2 local replacements\./);
});

// ---------------------------------------------------------------- schema/version bound

test('rejects an unknown schema version', () => {
  const result = validateVocabularyPayload(JSON.stringify({ version: 2, replacements: [] }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /expected schema version 1/);
});

test('rejects a missing version entirely', () => {
  const result = validateVocabularyPayload(JSON.stringify({ replacements: [] }));
  assert.equal(result.ok, false);
});

test('rejects duplicate JSON keys before JSON.parse could silently overwrite one', () => {
  const result = validateVocabularyPayload('{"version":1,"version":1,"replacements":[{"from":"a","to":"b"}]}');
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /duplicate keys are not accepted/);
});

test('rejects unknown entry fields rather than applying a partial envelope', () => {
  for (const payload of [
    JSON.stringify({ version: 1, replacements: [{ from: 'a', to: 'b', extra: true }] }),
  ]) {
    const result = validateVocabularyPayload(payload);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /unexpected field/);
  }
});

// ---------------------------------------------------------------- size bound

test('rejects a payload over the byte-size limit', () => {
  const bigTo = 'x'.repeat(MAX_TO_LENGTH);
  const many: Array<{ from: string; to: string }> = [];
  for (let i = 0; i < MAX_REPLACEMENTS; i += 1) many.push({ from: `term-${i}-${'y'.repeat(100)}`, to: bigTo });
  const payload = JSON.stringify({ version: 1, replacements: many });
  assert.ok(new TextEncoder().encode(payload).length > MAX_FILE_BYTES, 'fixture must actually exceed the byte bound');
  const result = validateVocabularyPayload(payload);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /is \d+ bytes and the limit is 65536 bytes/);
});

// ---------------------------------------------------------------- nesting depth bound

test('rejects a payload nested past the depth limit', () => {
  let nested: unknown = 'leaf';
  for (let i = 0; i < MAX_NESTING_DEPTH + 3; i += 1) nested = { child: nested };
  const payload = JSON.stringify({ version: 1, replacements: [{ from: 'a', to: 'b' }], extra: nested });
  const result = validateVocabularyPayload(payload);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /nesting exceeds 4 levels/);
});

test('accepts a payload within the depth limit', () => {
  const payload = JSON.stringify({ version: 1, replacements: [{ from: 'a', to: 'b' }] });
  const result = validateVocabularyPayload(payload);
  assert.equal(result.ok, true);
});

// ---------------------------------------------------------------- entry count bound

test('rejects a payload over the max entry count', () => {
  const many = Array.from({ length: MAX_REPLACEMENTS + 1 }, (_, i) => ({ from: `term-${i}`, to: 'x' }));
  const result = validateVocabularyPayload(JSON.stringify({ version: 1, replacements: many }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /must contain 1 to 256 entries/);
});

test('accepts exactly the max entry count', () => {
  const many = Array.from({ length: MAX_REPLACEMENTS }, (_, i) => ({ from: `term-${i}`, to: 'x' }));
  const result = validateVocabularyPayload(JSON.stringify({ version: 1, replacements: many }));
  assert.equal(result.ok, true);
});

// ---------------------------------------------------------------- key/value length bounds

test('rejects a "from" over the length bound', () => {
  const result = validateVocabularyPayload(JSON.stringify({ version: 1, replacements: [{ from: 'a'.repeat(MAX_FROM_LENGTH + 1), to: 'b' }] }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /"from" is 129 characters and must contain 1 to 128 characters/);
});

test('rejects a "to" over the length bound', () => {
  const result = validateVocabularyPayload(JSON.stringify({ version: 1, replacements: [{ from: 'a', to: 'b'.repeat(MAX_TO_LENGTH + 1) }] }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /"to" is 257 characters and the limit is 256/);
});

test('accepts exactly the from/to length bounds', () => {
  const result = validateVocabularyPayload(JSON.stringify({ version: 1, replacements: [{ from: 'a'.repeat(MAX_FROM_LENGTH), to: 'b'.repeat(MAX_TO_LENGTH) }] }));
  assert.equal(result.ok, true);
});

test('rejects an empty "from"', () => {
  const result = validateVocabularyPayload(JSON.stringify({ version: 1, replacements: [{ from: '', to: 'b' }] }));
  assert.equal(result.ok, false);
});

// ---------------------------------------------------------------- malformed JSON / duplicates / unsafe keys

test('rejects malformed JSON', () => {
  const result = validateVocabularyPayload('{not json');
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /not valid JSON/);
});

test('rejects a non-object top level', () => {
  const result = validateVocabularyPayload('[1,2,3]');
  assert.equal(result.ok, false);
});

test('rejects duplicate "from" keys in array form', () => {
  const payload = JSON.stringify({ version: 1, replacements: [{ from: 'dup', to: 'a' }, { from: 'dup', to: 'b' }] });
  const result = validateVocabularyPayload(payload);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /"from" value in replacement 2 is duplicated/);
});

test('rejects unsafe object keys (__proto__)', () => {
  const payload = '{"version":1,"replacements":{"__proto__":"x"}}';
  const result = validateVocabularyPayload(payload);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /unsafe object key/);
});

test('rejects unsafe object keys (constructor)', () => {
  const payload = JSON.stringify({ version: 1, replacements: { constructor: 'x' } });
  const result = validateVocabularyPayload(payload);
  assert.equal(result.ok, false);
});

test('rejects unsafe object keys (prototype)', () => {
  const payload = JSON.stringify({ version: 1, replacements: { prototype: 'x' } });
  const result = validateVocabularyPayload(payload);
  assert.equal(result.ok, false);
});

test('rejects "from" equal to an unsafe key even in array form', () => {
  const payload = JSON.stringify({ version: 1, replacements: [{ from: '__proto__', to: 'x' }] });
  const result = validateVocabularyPayload(payload);
  assert.equal(result.ok, false);
});

test('rejects a replacement source that is neither an array nor an object map', () => {
  const result = validateVocabularyPayload(JSON.stringify({ version: 1, replacements: 'nope' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /"replacements" must be an array/);
});

test('rejects a replacement item missing "to"', () => {
  const result = validateVocabularyPayload(JSON.stringify({ version: 1, replacements: [{ from: 'a' }] }));
  assert.equal(result.ok, false);
});

test('rejects a non-string "to"', () => {
  const result = validateVocabularyPayload(JSON.stringify({ version: 1, replacements: [{ from: 'a', to: 5 }] }));
  assert.equal(result.ok, false);
});

// ---------------------------------------------------------------- no partial application

test('a rejected file never applies partially — the previous cache is untouched', () => {
  const storage = createMemoryStorage();
  const good = loadVocabularyFile(storage, VALID_ARRAY);
  assert.equal(good.ok, true);
  const before = readVocabularyCache(storage);

  const bad = loadVocabularyFile(storage, '{"version":2,"replacements":[]}');
  assert.equal(bad.ok, false);

  const after = readVocabularyCache(storage);
  assert.deepEqual(after, before);
  assert.equal(applyAtCopyBoundary(storage, 'sample-alpha'), 'sample-beta');
});

// ---------------------------------------------------------------- persistence / cache corruption / clear

test('readVocabularyCache reflects what was cached (simulated restart via a fresh read)', () => {
  const storage = createMemoryStorage();
  loadVocabularyFile(storage, VALID_ARRAY);
  // Simulate a restart by only using the raw string the storage now holds.
  const raw = storage.getItem('ding-pbx-vocabulary-cache');
  assert.ok(raw);
  const freshStorage = createMemoryStorage();
  freshStorage.setItem('ding-pbx-vocabulary-cache', raw!);
  const cached = readVocabularyCache(freshStorage);
  assert.deepEqual(cached?.replacements, [{ from: 'sample-alpha', to: 'sample-beta' }]);
});

test('a corrupt cache fails closed to original wording and is purged', () => {
  const storage = createMemoryStorage();
  storage.setItem('ding-pbx-vocabulary-cache', '{not json');
  const cached = readVocabularyCache(storage);
  assert.equal(cached, undefined);
  assert.equal(storage.getItem('ding-pbx-vocabulary-cache'), null, 'corrupt cache must be purged, not left to fail again');
  assert.equal(applyAtCopyBoundary(storage, 'sample-alpha'), 'sample-alpha');
});

test('a stale cache (old/unsupported schema) fails closed and is purged', () => {
  const storage = createMemoryStorage();
  storage.setItem('ding-pbx-vocabulary-cache', JSON.stringify({ version: 0, replacements: [] }));
  const cached = readVocabularyCache(storage);
  assert.equal(cached, undefined);
  assert.equal(storage.getItem('ding-pbx-vocabulary-cache'), null);
});

test('clearVocabulary purges the cache and restores original wording immediately', () => {
  const storage = createMemoryStorage();
  loadVocabularyFile(storage, VALID_ARRAY);
  assert.equal(applyAtCopyBoundary(storage, 'sample-alpha'), 'sample-beta');
  const cleared = clearVocabulary(storage);
  assert.equal(cleared.ok, true);
  assert.equal(cleared.replacementCount, 0);
  assert.equal(storage.getItem('ding-pbx-vocabulary-cache'), null);
  assert.equal(applyAtCopyBoundary(storage, 'sample-alpha'), 'sample-alpha');
});

// ---------------------------------------------------------------- replace (loading a second file)

test('loading a second valid file replaces the first (replace state)', () => {
  const storage = createMemoryStorage();
  loadVocabularyFile(storage, VALID_ARRAY);
  assert.equal(applyAtCopyBoundary(storage, 'sample-alpha'), 'sample-beta');
  const second = JSON.stringify({ version: 1, replacements: [{ from: 'sample-alpha', to: 'sample-gamma' }] });
  loadVocabularyFile(storage, second);
  assert.equal(applyAtCopyBoundary(storage, 'sample-alpha'), 'sample-gamma');
});

// ---------------------------------------------------------------- apply semantics

test('applyVocabularyText replaces every occurrence, longest term first', () => {
  const storage = createMemoryStorage();
  const payload = JSON.stringify({
    version: 1,
    replacements: [
      { from: 'sample', to: 'X' },
      { from: 'sample term', to: 'Y' },
    ],
  });
  loadVocabularyFile(storage, payload);
  assert.equal(applyAtCopyBoundary(storage, 'a sample term and another sample'), 'a Y and another X');
});

test('applyVocabularyText leaves unrelated text untouched', () => {
  const storage = createMemoryStorage();
  loadVocabularyFile(storage, VALID_ARRAY);
  assert.equal(applyAtCopyBoundary(storage, 'nothing to see here'), 'nothing to see here');
});

test('applyVocabularyText supports an explicitly classified accessible-name boundary', () => {
  const storage = createMemoryStorage();
  loadVocabularyFile(storage, VALID_ARRAY);
  assert.equal(
    applyVocabularyText(storage, { text: 'sample-alpha', boundary: 'accessible-name' }),
    'sample-beta',
  );
});

// ---------------------------------------------------------------- no-network guard (structural)

test('module performs no network access — no fetch/XHR/WebSocket reference in source', () => {
  const source = readFileSync(
    new URL('../../app/renderer/src/personal-vocabulary.ts', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /XMLHttpRequest/);
  assert.doesNotMatch(source, /WebSocket/);
});
