/**
 * Contract: local-file-converter. The honest state is still "absent", but not for the
 * reason this file used to give, and the correction is the point of the rewrite.
 *
 * The old version asserted "there is no file-picker-driven converter surface, adapter
 * registry, or category catalogue anywhere in the site" and passed. `site/converter.html`
 * ships a file picker, an adapter catalogue, a bounded paged conversion queue, a target-
 * format select, a cancel control and a loss-disclosure line. The assertion passed
 * because the page list it searched named six pages and the site has nine; converter.html
 * was not one of the six, so the word "anywhere" was measured over two thirds of the site.
 *
 * What is actually true, measured rather than assumed: the markup exists in full, and
 * nothing implements it. The only script converter.html loads is `site/app.js`, a classic
 * non-module script, and the string "converter" does not occur in it once -- so the file
 * picker, the adapter catalogue, the queue, the pager, the cancel button and the format
 * select are all decorative. No page links to converter.html either, so a visitor arriving
 * at the site cannot reach it at all.
 *
 * "absent" is therefore the honest status for the FEATURE, because none of it functions.
 * These tests pin the dead markup explicitly instead of denying it exists, so the day
 * somebody wires it this contract fails and has to be re-derived, rather than quietly
 * continuing to report a converter that has become real as absent.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
/* Derived from the filesystem, not hand-copied: the six-name literal that used to sit
 * here excluded converter.html, ollama.html and history.html, so every 'anywhere in
 * the site' claim below searched two thirds of the site. See ./site-pages.mjs. */
import { PAGE_NAMES } from './site-pages.mjs';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const PAGES = PAGE_NAMES;
const pageSource = Object.fromEntries(PAGES.map((name) => [name, read(`${name}.html`)]));
const converter = pageSource.converter;
const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for local-file-converter', () => {
  assert.ok(registry.features['local-file-converter'], 'no local-file-converter row in site/feature-registry.json');
});

test('the site has real to*() format functions, so the absence claim is about a working converter, not about text formatting existing at all', () => {
  const formatFns = [...app.matchAll(/function to(Json|Xml|Yaml|Sql|Toml|Delimited|Markdown|Html)\(/gu)];
  assert.ok(formatFns.length >= 4, `expected several real to*() export-format functions, found ${formatFns.length}`);
});

test('converter.html really does ship the full converter markup -- denying it existed was the old defect', () => {
  assert.ok(converter, 'site/converter.html no longer exists; this contract described its markup and must be re-derived');
  for (const id of ['converter-files', 'converter-adapters', 'converter-queue', 'converter-target-format',
    'converter-cancel', 'converter-prev', 'converter-next', 'converter-loss', 'converter-format-search']) {
    assert.match(converter, new RegExp(`id="${id}"`, 'u'), `converter.html no longer carries #${id}`);
  }
  assert.match(converter, /<input id="converter-files" type="file" multiple>/u, 'the file picker is gone');
});

test('nothing implements any of it: the only script the page loads never mentions the converter', () => {
  const scripts = [...converter.matchAll(/<script[^>]*src="([^"]+)"/gu)].map((m) => m[1]);
  assert.deepEqual(scripts, ['app.js'], 'converter.html now loads something other than app.js -- re-derive whether the surface is wired');
  assert.doesNotMatch(app, /^import\s/mu, 'app.js is now a module and may pull in a converter implementation this test cannot see');
  assert.equal(app.toLowerCase().split('converter').length - 1, 0,
    'app.js now mentions "converter" -- the surface may be wired, so "absent" needs re-deciding rather than re-asserting');
});

test('no navigable page links to converter.html, so a visitor cannot reach the dead surface either', () => {
  const linking = PAGES.filter((name) => name !== 'converter' && name !== 'ollama' && /href="converter\.html"/u.test(pageSource[name]));
  assert.deepEqual(linking, [],
    'converter.html is now linked from a navigable page -- it is reachable, so its state and this contract both need re-deriving');
});

test('the registry records local-file-converter as absent, and says so for the right reason', () => {
  const row = registry.features['local-file-converter'];
  assert.equal(row.status, 'absent',
    'converter.html renders a complete-looking converter that app.js does not implement one line of -- nothing converts, so "absent" is the honest status for the feature');
  /* Anchored to the note's opening claim rather than to substrings that survive a rewrite.
   * The first version of this checked for "converter.html" and "no implementation"
   * anywhere in the note, and `scripts/negative-site-inventory-honesty.mjs` showed it
   * green after the opening clause was replaced with the old false one -- both needles
   * still occurred later in the sentence. */
  assert.ok(row.note.startsWith('site/converter.html renders a complete-looking converter'),
    `the note no longer opens by naming the page and what it renders; it opens: ${JSON.stringify(row.note.slice(0, 80))}`);
  assert.match(row.note, /has no implementation: site\/app\.js is the only script the page loads/u,
    'the note no longer states that the markup exists without an implementation, which is the whole finding');
  assert.doesNotMatch(row.note, /no such converter surface exists/iu,
    'the note has gone back to denying the surface exists, which is the claim converter.html disproves');
});
