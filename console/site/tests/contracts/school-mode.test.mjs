/**
 * Contract: School mode on the pages-site.
 *
 * The canon requires a universal, user-renamable, credential-gated School mode: forces
 * English, hides Cantonese/bilingual/funny-level/personal-vocabulary/dim-sum surfaces,
 * shares one unlock credential across every app, and is watched live rather than only
 * at launch.
 *
 * None of that exists on this static site. There is no setting, no rename field, no
 * shared unlock credential, no forced-English behaviour, and nothing that suppresses
 * another feature while active -- because there is no "active" state to enter in the
 * first place. This file pins that absence by re-deriving it from the real sources
 * every run, so a claim of "school-mode: implemented" for this surface cannot be made
 * without this test failing first and someone having to explain why.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const norm = (s) => s.replace(/\r\n/g, '\n');

const SOURCE_FILES = [
  'site/app.js', 'site/styles.css', 'site/build.mjs',
  'site/index.html', 'site/product.html', 'site/documentation.html',
  'site/downloads.html', 'site/status.html', 'site/settings.html',
];

function combinedSource() {
  return SOURCE_FILES.map((p) => norm(read(p))).join('\n');
}

test('the combined site source is non-trivial, so an absence finding here is not vacuous', () => {
  const combined = combinedSource();
  assert.ok(combined.length > 20000,
    `the combined source measured only ${combined.length} characters -- too small to trust a "not found" result from it`);
});

test('the word "school" does not appear anywhere in the sites own source', () => {
  const combined = combinedSource();
  const hits = [...combined.matchAll(/\bschool\b/gi)];
  assert.deepEqual(hits.map((h) => h[0]), [],
    'a "school" token now exists in the site source -- School mode may have been partially added; re-derive this contract by hand rather than editing this assertion');
});

test('no shared unlock-credential or forced-language state exists in the persisted settings model', () => {
  /* DEFAULTS is the complete list of every field the site persists. If School mode had
   * been added, its state would have to live here (or nowhere), since this is the one
   * object loadState()/save() round-trip through localStorage. */
  const src = norm(read('site/app.js'));
  const line = src.split('\n').find((l) => l.includes('const DEFAULTS = {'));
  assert.ok(line, 'DEFAULTS object literal line not found');
  for (const forbidden of ['schoolMode', 'unlockCredential', 'forcedLanguage', 'sharedCredential']) {
    assert.ok(!line.includes(forbidden),
      `DEFAULTS now contains "${forbidden}" -- School mode state may exist; re-derive this contract by hand`);
  }
});

test('the console/assets tree the site publishes carries no School-mode-branded asset', () => {
  const assetsDir = resolve(root, 'assets');
  const entries = readdirSync(assetsDir);
  assert.ok(entries.length > 0, 'assets directory listed as empty, which proves nothing');
  const suspicious = entries.filter((name) => /school/i.test(name));
  assert.deepEqual(suspicious, [], `unexpected School-mode-named asset(s) found: ${suspicious.join(', ')}`);
});
