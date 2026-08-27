/**
 * Contract: ollama-suite-manager. The honest state is still "absent", for the same
 * corrected reason as local-file-converter -- see that file for the fuller account.
 *
 * The old version asserted that the word "ollama" never appears anywhere in the published
 * site, and passed. `site/ollama.html` is an entire page about Ollama: an endpoint
 * approval control, a verified-model select, pull and chat controls, and a nav entry
 * labelled "Ollama". The assertion passed because the page list it searched named six
 * pages and the site has nine.
 *
 * Measured rather than assumed: the markup is complete and nothing implements it. The
 * only script ollama.html loads is `site/app.js`, and the string "ollama" does not occur
 * in it once, nor does Ollama's default local port. No page links to ollama.html, so a
 * visitor cannot reach it. "absent" stays the honest status for the feature because
 * nothing about it functions; what changes is that the dead markup is now pinned rather
 * than denied, so wiring it will fail this contract instead of slipping past it.
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
const ollama = pageSource.ollama;
const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for ollama-suite-manager', () => {
  assert.ok(registry.features['ollama-suite-manager'], 'no ollama-suite-manager row in site/feature-registry.json');
});

test('ollama.html really does ship an Ollama page -- denying the word appeared anywhere was the old defect', () => {
  assert.ok(ollama, 'site/ollama.html no longer exists; this contract described its markup and must be re-derived');
  assert.match(ollama, /id="ollama-model-select"/u, 'ollama.html no longer carries the verified-model select');
  assert.match(ollama, /LOCAL OLLAMA MANAGER/u, 'ollama.html no longer announces itself as the local Ollama manager');
});

test('the word "ollama" appears on exactly the two pages that carry the page and its nav entry, and nowhere else', () => {
  const mentioning = PAGES.filter((name) => /ollama/iu.test(pageSource[name])).sort();
  assert.deepEqual(mentioning, ['converter', 'ollama'],
    'the set of pages mentioning Ollama changed -- converter.html carries the sibling nav entry, ollama.html is the page itself; anything else means an integration landed elsewhere');
});

test('nothing implements any of it: the only script the page loads never mentions Ollama', () => {
  const scripts = [...ollama.matchAll(/<script[^>]*src="([^"]+)"/gu)].map((m) => m[1]);
  assert.deepEqual(scripts, ['app.js'], 'ollama.html now loads something other than app.js -- re-derive whether the surface is wired');
  assert.doesNotMatch(app, /^import\s/mu, 'app.js is now a module and may pull in an Ollama client this test cannot see');
  assert.doesNotMatch(app, /ollama/iu, 'an Ollama integration now appears in app.js -- re-check the "absent" state');
  assert.doesNotMatch(app, /11434/u, "Ollama's default local port now appears in app.js -- a loopback client may have landed");
});

test('no navigable page links to ollama.html, so a visitor cannot reach the dead surface either', () => {
  const linking = PAGES.filter((name) => name !== 'converter' && name !== 'ollama' && /href="ollama\.html"/u.test(pageSource[name]));
  assert.deepEqual(linking, [],
    'ollama.html is now linked from a navigable page -- it is reachable, so its state and this contract both need re-deriving');
});

test('the registry records ollama-suite-manager as absent, and says so for the right reason', () => {
  const row = registry.features['ollama-suite-manager'];
  assert.equal(row.status, 'absent',
    'ollama.html renders a complete-looking manager that app.js does not implement one line of -- nothing talks to Ollama, so "absent" is the honest status for the feature');
  /* Anchored to the note's opening claim rather than to substrings that survive a rewrite;
   * see the same correction in local-file-converter.test.mjs, which the negative script
   * caught before this one shipped in the same too-weak shape. */
  assert.ok(row.note.startsWith('site/ollama.html renders a complete-looking local Ollama manager'),
    `the note no longer opens by naming the page and what it renders; it opens: ${JSON.stringify(row.note.slice(0, 80))}`);
  assert.match(row.note, /has no implementation: site\/app\.js is the only script the page loads/u,
    'the note no longer states that the markup exists without an implementation, which is the whole finding');
  assert.doesNotMatch(row.note, /no ollama integration of any kind exists/iu,
    'the note has gone back to denying the surface exists, which is the claim ollama.html disproves');
});
