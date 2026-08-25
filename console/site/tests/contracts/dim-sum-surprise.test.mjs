/**
 * Contract: the dim-sum surprise on the pages-site.
 *
 * The canon requires a non-blocking, non-optable, roughly-10%-per-launch startup
 * surprise showing a bundled dish name (bilingual) and image, drawn from a local asset
 * catalog, never fetched or generated at runtime.
 *
 * Nothing on this site does any of that. There is no dish name, no dish vocabulary, no
 * per-launch random draw of any kind, and no bundled dish image anywhere under the
 * assets this site publishes. This file re-derives that absence from the real sources
 * every run rather than trusting a hand-written note about it.
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
  'site/app.js', 'site/styles.css',
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

test('no dim-sum vocabulary appears anywhere in the sites own source', () => {
  const combined = combinedSource();
  const patterns = [
    { name: 'dim sum / dimsum', re: /dim[\s-]?sum/gi },
    { name: 'dumpling', re: /\bdumplings?\b/gi },
    { name: 'har gow', re: /har[\s-]?gow/gi },
    { name: 'siu mai', re: /siu[\s-]?mai/gi },
    { name: 'egg tart', re: /egg[\s-]?tarts?\b/gi },
  ];
  for (const { name, re } of patterns) {
    const hits = [...combined.matchAll(re)];
    assert.deepEqual(hits.map((h) => h[0]), [],
      `a "${name}" token now exists in the site source -- the dim-sum surprise may have been partially added; re-derive this contract by hand`);
  }
});

test('the site never draws a per-launch random surprise -- there is no Math.random call at all', () => {
  /* The canonical mechanism is a fresh random draw at roughly 10% per launch. A site
   * with no random-number generation anywhere cannot implement that draw, whatever
   * shows up elsewhere in its markup. This is a stronger, harder-to-fake pin than the
   * vocabulary scan above: even a surprise using entirely different dish wording would
   * still need this call to fire per page load. */
  const src = norm(read('site/app.js'));
  assert.doesNotMatch(src, /Math\.random/,
    'site/app.js now calls Math.random -- a per-launch random surprise mechanism may exist; re-derive this contract by hand');
});

test('the console/assets tree the site publishes carries no dish image or catalog', () => {
  const assetsDir = resolve(root, 'assets');
  const entries = readdirSync(assetsDir);
  assert.ok(entries.length > 0, 'assets directory listed as empty, which proves nothing');
  const suspicious = entries.filter((name) => /dim.?sum|dumpling|dish|siu.?mai|har.?gow/i.test(name));
  assert.deepEqual(suspicious, [], `unexpected dim-sum-named asset(s) found: ${suspicious.join(', ')}`);
});
