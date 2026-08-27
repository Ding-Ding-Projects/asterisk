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

/**
 * Every way this site can obtain a random number, and what each one is for.
 *
 * Re-derived on 2026-08-26, and the reason is the whole point of keeping this scan.
 * It used to look for `Math.random` alone and read as proof that the site drew no
 * random numbers at all. That was true when it was written and stopped being true the
 * moment anything reached for a different generator -- and the element locks did
 * exactly that, for a keypad whose digits can be shuffled. A needle naming one
 * spelling of a thing proves nothing about the thing.
 *
 * So the scan names every source, and every use of one is accounted for here by hand.
 * `Math.random` is still expected to be absent outright; each use of the cryptographic
 * generator is named with the function that makes it, so a NEW draw appearing anywhere
 * fails rather than quietly joining a permitted set.
 */
const RANDOM_SOURCES = [
  { needle: 'Math.random', allowed: [] },
  {
    needle: 'getRandomValues',
    allowed: [
      /* Two of these are not draws at all: both crypto-capability checks name the
       * method to ask whether this browser has it. They are listed rather than
       * pattern-excluded, because a rule clever enough to tell a capability check from
       * a call is a rule that would eventually wave a real call through. */
      '  function schoolCryptoApi(){',
      '  function lockCryptoApi(){',
      /* Credential salts: the restricted-presentation record's, and each element lock's. */
      '  function schoolSalt(){',
      '  function lockSalt(){',
      /* The one genuinely per-use draw on this site: the shuffled PIN keypad, which is
       * per lock, off unless the reader asked for it, and nothing to do with a draw
       * that happens once per page load. */
      '  function lockRandomBelow(bound){',
    ],
  },
];

test('the site never draws a per-launch random surprise -- every random draw it makes is accounted for', () => {
  /* The canonical mechanism is a fresh random draw at roughly 10% per launch. A site
   * whose every random draw is named, and named as something else, cannot implement
   * that draw -- whatever shows up elsewhere in its markup. */
  const src = norm(read('site/app.js'));
  /** The `function name(...){` declaration one offset sits inside, or '' at top level. */
  const enclosing = (at) => {
    const before = src.slice(0, at);
    const start = before.lastIndexOf('\n  function ');
    if (start === -1) return '';
    return before.slice(start + 1, before.indexOf('{', start) + 1);
  };
  for (const source of RANDOM_SOURCES) {
    const uses = [];
    for (let at = src.indexOf(source.needle); at !== -1; at = src.indexOf(source.needle, at + 1)) uses.push(enclosing(at));
    if (source.allowed.length === 0) {
      assert.deepEqual(uses, [],
        `site/app.js now calls ${source.needle} -- a per-launch random surprise mechanism may exist; re-derive this contract by hand`);
      continue;
    }
    assert.ok(uses.length > 0,
      `${source.needle} no longer appears at all, so the accounting below is vacuous -- remove it from RANDOM_SOURCES rather than leaving it`);
    for (const where of uses) {
      assert.ok(source.allowed.includes(where),
        `${source.needle} is now drawn inside ${where.trim() || 'the top level'}, which this contract has not been told about -- re-derive it by hand`);
    }
    for (const where of source.allowed) {
      assert.ok(uses.includes(where), `${where.trim()} no longer draws ${source.needle}, so its entry here is stale`);
    }
  }
});

test('the console/assets tree the site publishes carries no dish image or catalog', () => {
  const assetsDir = resolve(root, 'assets');
  const entries = readdirSync(assetsDir);
  assert.ok(entries.length > 0, 'assets directory listed as empty, which proves nothing');
  const suspicious = entries.filter((name) => /dim.?sum|dumpling|dish|siu.?mai|har.?gow/i.test(name));
  assert.deepEqual(suspicious, [], `unexpected dim-sum-named asset(s) found: ${suspicious.join(', ')}`);
});
