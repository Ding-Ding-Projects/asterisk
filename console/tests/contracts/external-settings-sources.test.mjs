/**
 * Contract: settings sources are validated the way the module's own comments claim, and
 * a source a person configures can actually be reached by the running app.
 *
 * `external-settings-sources.ts` and `source-store.ts` are pure and self-contained enough
 * that Node's built-in TypeScript type-stripping can `import()` them directly and run the
 * real functions -- no bundler, no local reimplementation of the validation rules that could
 * silently drift from the original. `source-store.ts` imports `./external-settings-sources`
 * with no extension, which only a bundler resolves, so a small inline loader hook retries a
 * failed relative specifier with `.ts` appended before giving up. It changes nothing else.
 *
 * The privileged half -- the actual network fetch and its host allowlist -- lives in
 * `control-plane/settings-source-fetcher.ts` and is wired up in `app/electron/main.ts`. That
 * wiring is what this file spends most of its effort on, because it is where the feature
 * turns out to be dead in a real build: the fetcher's allowlist starts empty by design, and
 * nothing anywhere populates it from what a person actually configures.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { register } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const loaderSrc = `
export async function resolve(specifier, context, nextResolve) {
  try { return await nextResolve(specifier, context); }
  catch (err) {
    if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return nextResolve(specifier + '.ts', context);
    throw err;
  }
}
`;
register(`data:text/javascript,${encodeURIComponent(loaderSrc)}`, import.meta.url);

const settings = await import('../../app/renderer/src/external-settings-sources.ts');
const store = await import('../../app/renderer/src/source-store.ts');

/* --- validateSourceUrl --------------------------------------------------------------- */

test('validateSourceUrl: HTTPS is accepted, plain HTTP anywhere but loopback is refused', () => {
  assert.deepEqual(settings.validateSourceUrl('https://settings.example.net/console'), []);
  assert.deepEqual(settings.validateSourceUrl('http://localhost:9000/x'), [], 'loopback dev route');
  assert.deepEqual(settings.validateSourceUrl('http://127.0.0.1/x'), []);
  assert.deepEqual(settings.validateSourceUrl('http://[::1]/x'), []);
  const refused = settings.validateSourceUrl('http://settings.example.net/console');
  assert.equal(refused.length, 1);
  assert.match(refused[0].message, /HTTPS/);
});

test('validateSourceUrl: credentials embedded in the URL are refused', () => {
  const problems = settings.validateSourceUrl('https://user:pass@settings.example.net/');
  assert.ok(problems.some((p) => p.message.includes('Credentials cannot go in the URL')));
});

test('validateSourceUrl: an empty string and unparsable text are both refused with a reason', () => {
  assert.equal(settings.validateSourceUrl('').length, 1);
  assert.equal(settings.validateSourceUrl('not a url at all \u0000').length, 1);
});

/* --- applyResponse -------------------------------------------------------------------- */

const baseSource = { id: 's1', kind: 'https-api', url: 'https://x/y', allowedKeys: ['lang_mode', 'fun_level'] };

function attempt(overrides = {}) {
  return { generation: 1, status: 200, body: '{}', redirected: false, byteLength: 2, ...overrides };
}

test('applyResponse: a stale generation is dropped so a slow reply cannot flip a setting back', () => {
  const outcome = settings.applyResponse(baseSource, attempt({ generation: 1 }), /* currentGeneration */ 2);
  assert.ok(settings.isRejected(outcome));
  assert.match(outcome.rejected, /stale answer/);
});

test('applyResponse: a redirect is refused, since the far end chose a destination nobody validated', () => {
  const outcome = settings.applyResponse(baseSource, attempt({ redirected: true }), 1);
  assert.ok(settings.isRejected(outcome));
  assert.match(outcome.rejected, /redirected/);
});

test('applyResponse: a response over the byte cap is refused, at exactly the documented boundary', () => {
  const atCap = settings.applyResponse(baseSource, attempt({ byteLength: settings.MAX_RESPONSE_BYTES }), 1);
  assert.equal(settings.isRejected(atCap), false, 'exactly at the cap is still read');
  const overCap = settings.applyResponse(baseSource, attempt({ byteLength: settings.MAX_RESPONSE_BYTES + 1 }), 1);
  assert.ok(settings.isRejected(overCap));
});

test('applyResponse: a non-2xx status and unparsable JSON are both refused with the previous values kept', () => {
  const badStatus = settings.applyResponse(baseSource, attempt({ status: 503 }), 1);
  assert.ok(settings.isRejected(badStatus));
  assert.match(badStatus.rejected, /answered 503/);
  const badJson = settings.applyResponse(baseSource, attempt({ body: 'not json' }), 1);
  assert.ok(settings.isRejected(badJson));
  assert.match(badJson.rejected, /did not answer with JSON/);
});

test('applyResponse (https-api): only allowlisted keys are read, and only string values are trusted', () => {
  const outcome = settings.applyResponse(
    baseSource,
    attempt({ body: JSON.stringify({ lang_mode: 'yue', fun_level: 3, not_allowed: 'x' }) }),
    1,
  );
  assert.deepEqual(settings.isRejected(outcome), false);
  /* fun_level was a number, not a string -- coercing it would be this console deciding what
   * the remote system meant, which the module explicitly refuses to do. */
  assert.deepEqual(outcome.applied, { lang_mode: 'yue' });
});

test('applyResponse (home-assistant): "off" applies nothing and is not a failure', () => {
  const ha = { ...baseSource, kind: 'home-assistant', entityId: 'input_boolean.quiet_hours' };
  const off = settings.applyResponse(
    ha, attempt({ body: JSON.stringify({ entity_id: ha.entityId, state: 'off' }) }), 1,
  );
  assert.equal(settings.isRejected(off), false);
  assert.deepEqual(off.applied, {});
  const on = settings.applyResponse(
    ha, attempt({ body: JSON.stringify({ entity_id: ha.entityId, state: 'on' }) }), 1,
  );
  assert.deepEqual(on.applied, { lang_mode: 'on', fun_level: 'on' });
});

test('applyResponse (home-assistant): a mismatched entity or a non-boolean state is refused', () => {
  const ha = { ...baseSource, kind: 'home-assistant', entityId: 'input_boolean.quiet_hours' };
  const wrongEntity = settings.applyResponse(
    ha, attempt({ body: JSON.stringify({ entity_id: 'input_boolean.other', state: 'on' }) }), 1,
  );
  assert.ok(settings.isRejected(wrongEntity));
  const notBoolean = settings.applyResponse(
    ha, attempt({ body: JSON.stringify({ entity_id: ha.entityId, state: 'unavailable' }) }), 1,
  );
  assert.ok(settings.isRejected(notBoolean));
});

test('validateRefresh floors the interval so this console cannot itself deny-of-service a source', () => {
  assert.equal(settings.validateRefresh(settings.MIN_REFRESH_MS).length, 0);
  assert.equal(settings.validateRefresh(settings.MIN_REFRESH_MS - 1).length, 1);
  assert.equal(settings.validateRefresh(NaN).length, 1);
});

test('onSourceUnavailable keeps the last known good values and never resets to defaults', () => {
  const outcome = settings.onSourceUnavailable({ lang_mode: 'yue' }, 'The source timed out.');
  assert.deepEqual(outcome.values, { lang_mode: 'yue' });
  assert.match(outcome.notice, /your own settings are unchanged underneath/);
});

/* --- source-store: draft validation, and untrusted-input handling on the way back in -- */

test('buildSource refuses an empty allowlist and a Home Assistant source with no entity', () => {
  const noKeys = store.buildSource({ url: 'https://x/y', kind: 'https-api', allowedKeys: '' }, 'id1');
  assert.ok('problems' in noKeys);
  assert.ok(noKeys.problems.some((p) => p.field === 'allowedKeys'));

  const noEntity = store.buildSource({ url: 'https://x/y', kind: 'home-assistant', allowedKeys: 'lang_mode' }, 'id2');
  assert.ok('problems' in noEntity);
  assert.ok(noEntity.problems.some((p) => p.field === 'entityId'));
});

test('buildSource splits and trims the comma-separated key list, dropping blanks', () => {
  const built = store.buildSource(
    { url: 'https://x/y', kind: 'https-api', allowedKeys: ' lang_mode ,  fun_level ,,' }, 'id3',
  );
  assert.ok(!('problems' in built));
  assert.deepEqual(built.allowedKeys, ['lang_mode', 'fun_level']);
});

test('saveSources/loadSources round-trip a well-formed list unchanged', () => {
  const memory = new Map();
  const storage = { getItem: (k) => (memory.has(k) ? memory.get(k) : null), setItem: (k, v) => memory.set(k, v) };
  const built = store.buildSource({ url: 'https://x/y', kind: 'https-api', allowedKeys: 'lang_mode' }, 'idA');
  store.saveSources(storage, [built]);
  assert.deepEqual(store.loadSources(storage), [built]);
});

test('loadSources drops a malformed entry rather than trusting it partially', () => {
  const memory = new Map();
  const storage = { getItem: (k) => memory.get(k) ?? null };
  const bad = [
    { id: 'no-keys', kind: 'https-api', url: 'https://x/y', allowedKeys: [] }, // empty allowlist refused
    { id: 'bad-kind', kind: 'ftp', url: 'https://x/y', allowedKeys: ['a'] },
    { id: 'bad-url', kind: 'https-api', url: 'not a url', allowedKeys: ['a'] },
    { id: 'ha-no-entity', kind: 'home-assistant', url: 'https://x/y', allowedKeys: ['a'] },
  ];
  memory.set(store.SOURCES_STORAGE_KEY, JSON.stringify(bad));
  assert.deepEqual(store.loadSources(storage), [], 'every entry above is individually invalid');

  memory.set(store.SOURCES_STORAGE_KEY, 'not even json');
  assert.deepEqual(store.loadSources(storage), [], 'a corrupt file yields no sources rather than throwing');
});

test('sourcesStatusLine names a source that has stopped working, with its reason, rather than omitting it', () => {
  const src = { id: 's1', kind: 'https-api', url: 'https://x/y', allowedKeys: ['lang_mode'] };
  const line = store.sourcesStatusLine([src], [{ sourceId: 's1', at: '2026-01-01T00:00:00Z', ok: false, detail: 'timed out' }]);
  assert.match(line, /failing -- timed out/);
  assert.equal(store.sourcesStatusLine([], []), 'No sources configured.');
});

/* --- wiring: the renderer really does drive buildSource/loadSources/saveSources ------- */

const app = read('app/renderer/src/App.tsx');
const generated = read('app/renderer/src/generated/console.tsx');
const dispatch = read('control-plane/dispatch.ts');
const fetcher = read('control-plane/settings-source-fetcher.ts');
const mainTs = read('app/electron/main.ts');

test('App imports the real validation and store functions rather than a local copy', () => {
  assert.match(app, /buildSource, loadSources, saveSources, sourcesStatusLine,/);
  assert.match(app, /applyResponse, isRejected, MIN_REFRESH_MS/);
});

test('polling is started at mount, on the same interval floor the validator enforces', () => {
  assert.match(app, /this\.startSourcePolling\(\);/);
  assert.match(app, /private static readonly SOURCE_POLL_MS = MIN_REFRESH_MS;/);
  assert.match(app, /if \(this\.sourceTimer\) clearInterval\(this\.sourceTimer\);/);
});

test('a fetched answer is applied through baseSetVal, the same path a manual edit takes', () => {
  const start = app.indexOf('private async pollSettingsSources(): Promise<void> {');
  assert.ok(start > 0, 'pollSettingsSources has been renamed or removed');
  const body = app.slice(start, app.indexOf('\n  }', start));
  assert.match(body, /this\.baseSetVal\(\{ id: key, label: key, kind: 'text' \}, value\);/);
});

test('the design renders src_add / src_clear and the status readout, and App answers them', () => {
  for (const id of ['src_url', 'src_kind', 'src_entity', 'src_keys', 'src_credential', 'src_add', 'src_clear', 'src_status']) {
    assert.match(generated, new RegExp(`ctl\\('${id}',`), `${id} is missing from the design`);
  }
  assert.match(app, /control\?\.id === 'src_add' && value === true/);
  assert.match(app, /control\?\.id === 'src_clear' && value === true/);
  assert.match(app, /if \(action === 'source-status'\) return this\.sourceStatusLine;/);
});

test('dispatch answers settings.source.fetch through the real fetcher, distinguishing a refusal from a real response', () => {
  assert.match(dispatch, /if \(request\.action === 'settings\.source\.fetch'\) \{/);
  assert.match(dispatch, /const result = await settingsSourceFetcher\.fetchSource\(/);
  assert.match(dispatch, /if \(result\.reason !== undefined\) \{/);
});

/* --- PIN: the host allowlist that gates every fetch is permanently empty in the real app */

test('PIN: SettingsSourceFetcher refuses any host that is not on its allowlist, by name', () => {
  /* This is the real, exact refusal message a person will see for every source they add,
   * confirmed against the module below rather than paraphrased. */
  assert.match(fetcher, /return refuse\(`\$\{url\.hostname\} is not an allowed source host\.`\);/);
});

test('the dispatcher falls back to the persisted allowlist, not to an empty one', () => {
  /* This replaces a pin that asserted the defect. It read:
   *
   *     allowedHosts: options.allowedSettingsSourceHosts ?? [],
   *
   * which meant production, passing nothing, always got an empty allowlist and refused
   * every external settings source forever. The pin was correct to exist and correct to
   * fire the moment the fix landed -- it even said so in its own failure message.
   *
   * What must not be lost is the reason the empty default was right in the first place: a
   * fetcher configured with nothing is not a fetcher configured with no restrictions. So
   * the fallback must still be fail-closed when nothing is persisted either. */
  assert.match(dispatch, /allowedHosts: options\.allowedSettingsSourceHosts \?\? parseAllowlist\(/,
    'the dispatcher no longer falls back to the persisted allowlist');
  assert.doesNotMatch(dispatch, /allowedHosts: options\.allowedSettingsSourceHosts \?\? \[\],/,
    'the dispatcher is back to defaulting to an empty allowlist, which refuses every source forever');
});

test('main.ts deliberately passes no allowlist, so it inherits the persisted one', () => {
  /* The previous pin asserted the word `allowedSettingsSourceHosts` appeared nowhere in
   * main.ts. That is now false for a harmless reason -- it appears in a comment explaining
   * why the option is deliberately left unset -- and a test that cannot tell a comment from
   * a call is testing the wrong thing. What matters is the construction call itself. */
  const callStart = mainTs.indexOf('const dispatcher = createControlPlaneDispatcher({');
  assert.ok(callStart > 0, 'the dispatcher construction call has moved or been renamed');
  const call = mainTs.slice(callStart, mainTs.indexOf('})', callStart));
  assert.doesNotMatch(call, /allowedSettingsSourceHosts\s*:/,
    'main.ts now passes an explicit allowlist, which would override whatever the user persisted');
});
