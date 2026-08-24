/**
 * The configured settings sources.
 *
 * The load tests carry the weight. A stored source is untrusted input on the way back
 * IN as well as out: the file is hand-editable and may have been written by an older
 * version, and a source whose allowlist went missing would sit in the list looking
 * configured while permitting anything a response offered.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SOURCES_STORAGE_KEY, buildSource, loadSources, parseAllowedKeys, saveSources,
  sourcesStatusLine, type SourceDraft, type SourceStorage,
} from '../../app/renderer/src/source-store.ts';
import type { ExternalSource } from '../../app/renderer/src/external-settings-sources.ts';

const memory = (): SourceStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); } };
};

const draft = (over: Partial<SourceDraft> = {}): SourceDraft => ({
  url: 'https://settings.example.net/console',
  kind: 'https-api',
  allowedKeys: 'lang_mode, fun_level',
  ...over,
});

const stored = (storage: ReturnType<typeof memory>, value: unknown) => {
  storage.map.set(SOURCES_STORAGE_KEY, JSON.stringify(value));
};

/* --- what is refused on the way in ---------------------------------------------------- */

test('a source with no allowlist is dropped rather than loaded', () => {
  /* The one that matters. Such a source looks configured and, if the check were ever
   * loosened, would accept every key a response offered. */
  const storage = memory();
  stored(storage, [{ id: '1', kind: 'https-api', url: 'https://settings.example.net/x', allowedKeys: [] }]);
  assert.deepEqual(loadSources(storage), []);
});

test('a source with a URL the validator refuses is dropped', () => {
  const storage = memory();
  stored(storage, [
    { id: '1', kind: 'https-api', url: 'http://settings.example.net/x', allowedKeys: ['a'] },
    { id: '2', kind: 'https-api', url: 'https://user:pw@settings.example.net/x', allowedKeys: ['a'] },
  ]);
  assert.deepEqual(loadSources(storage), []);
});

test('a source with an unknown kind is dropped', () => {
  const storage = memory();
  stored(storage, [{ id: '1', kind: 'carrier-pigeon', url: 'https://settings.example.net/x', allowedKeys: ['a'] }]);
  assert.deepEqual(loadSources(storage), []);
});

test('a Home Assistant source with no entity is dropped', () => {
  /* It would poll and then reject every answer for describing the wrong entity, which
   * reads as the source being broken rather than as the config being incomplete. */
  const storage = memory();
  stored(storage, [{ id: '1', kind: 'home-assistant', url: 'https://ha.example.net/api', allowedKeys: ['a'] }]);
  assert.deepEqual(loadSources(storage), []);
});

test('a non-string key in the allowlist drops the whole source', () => {
  const storage = memory();
  stored(storage, [{ id: '1', kind: 'https-api', url: 'https://settings.example.net/x', allowedKeys: ['a', 7] }]);
  assert.deepEqual(loadSources(storage), []);
});

test('a usable source survives alongside an unusable one', () => {
  /* Dropping the bad one rather than the list: one hand-edited entry must not lose
   * somebody every source they configured. */
  const storage = memory();
  stored(storage, [
    { id: 'bad', kind: 'https-api', url: 'nonsense', allowedKeys: ['a'] },
    { id: 'good', kind: 'https-api', url: 'https://settings.example.net/x', allowedKeys: ['lang_mode'] },
  ]);
  assert.deepEqual(loadSources(storage).map((source) => source.id), ['good']);
});

test('a corrupt file yields no sources rather than throwing on mount', () => {
  /* Losing the list is recoverable; failing to start is not. */
  const storage = memory();
  storage.map.set(SOURCES_STORAGE_KEY, '{not json');
  assert.deepEqual(loadSources(storage), []);
  storage.map.set(SOURCES_STORAGE_KEY, '"a string"');
  assert.deepEqual(loadSources(storage), []);
});

test('nothing stored yields no sources', () => {
  assert.deepEqual(loadSources(memory()), []);
  assert.deepEqual(loadSources(undefined), []);
});

test('a saved list round-trips', () => {
  const storage = memory();
  const source: ExternalSource = {
    id: '1', kind: 'https-api', url: 'https://settings.example.net/x', allowedKeys: ['lang_mode'],
  };
  saveSources(storage, [source]);
  assert.deepEqual(loadSources(storage), [source]);
});

/* --- building one from what was typed --------------------------------------------------- */

test('a good draft becomes a source', () => {
  const built = buildSource(draft(), 's1');
  assert.ok(!('problems' in built));
  assert.equal(built.url, 'https://settings.example.net/console');
  assert.deepEqual(built.allowedKeys, ['lang_mode', 'fun_level']);
});

test('an empty allowlist is refused with a reason worth reading', () => {
  const built = buildSource(draft({ allowedKeys: '  ,  , ' }), 's1');
  assert.ok('problems' in built);
  assert.match(built.problems[0].message, /poll forever and do nothing/u);
});

test('every problem is reported at once', () => {
  const built = buildSource(draft({ url: 'http://x.example/', allowedKeys: '' }), 's1');
  assert.ok('problems' in built);
  assert.deepEqual(built.problems.map((problem) => problem.field).sort(), ['allowedKeys', 'url']);
});

test('a Home Assistant draft needs its entity', () => {
  const built = buildSource(draft({ kind: 'home-assistant', entityId: '  ' }), 's1');
  assert.ok('problems' in built);
  assert.ok(built.problems.some((problem) => problem.field === 'entityId'));
});

test('a blank credential key is left off rather than stored empty', () => {
  /* An empty credentialKey would name a vault entry that does not exist, and the fetch
   * would look up nothing and send no header -- with no way to tell that from a source
   * that deliberately needs none. */
  const built = buildSource(draft({ credentialKey: '   ' }), 's1');
  assert.ok(!('problems' in built));
  assert.ok(!('credentialKey' in built));
});

test('a credential key is kept when given', () => {
  const built = buildSource(draft({ credentialKey: ' ding/source/1 ' }), 's1');
  assert.ok(!('problems' in built));
  assert.equal(built.credentialKey, 'ding/source/1');
});

test('the typed key list drops blanks so a trailing comma is not a key', () => {
  assert.deepEqual(parseAllowedKeys('a, b,'), ['a', 'b']);
  assert.deepEqual(parseAllowedKeys('  '), []);
  assert.deepEqual(parseAllowedKeys('a,,b'), ['a', 'b']);
});

/* --- saying what each source is doing ----------------------------------------------------- */

test('with no sources the status says so plainly', () => {
  assert.equal(sourcesStatusLine([], []), 'No sources configured.');
});

test('a source that has stopped working is named rather than omitted', () => {
  /* A settings source silently ceasing to track is the failure this whole feature exists
   * to avoid: the values just stop changing and nothing says why. */
  const source: ExternalSource = {
    id: '1', kind: 'https-api', url: 'https://settings.example.net/x', allowedKeys: ['a'],
  };
  const line = sourcesStatusLine([source], [
    { sourceId: '1', at: '2026-08-24T10:00:00Z', ok: false, detail: 'The source did not answer in time.' },
  ]);
  assert.ok(line.includes('failing'));
  assert.ok(line.includes('did not answer in time'));
  assert.ok(line.includes('2026-08-24T10:00:00Z'), 'the status does not say when it last tried');
});

test('a source not yet polled says so rather than looking like a failure', () => {
  const source: ExternalSource = {
    id: '1', kind: 'https-api', url: 'https://settings.example.net/x', allowedKeys: ['a'],
  };
  assert.match(sourcesStatusLine([source], []), /not polled yet/u);
});

test('several sources are all reported, not only the first', () => {
  const sources: ExternalSource[] = [
    { id: '1', kind: 'https-api', url: 'https://a.example.net/x', allowedKeys: ['a'] },
    { id: '2', kind: 'https-api', url: 'https://b.example.net/x', allowedKeys: ['b'] },
  ];
  const line = sourcesStatusLine(sources, [
    { sourceId: '1', at: '2026-08-24T10:00:00Z', ok: true, detail: '' },
  ]);
  assert.ok(line.includes('a.example.net'));
  assert.ok(line.includes('b.example.net'));
});
