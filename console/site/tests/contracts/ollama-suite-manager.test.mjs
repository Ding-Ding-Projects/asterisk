/**
 * Contract: ollama-suite-manager. The browser equivalent is implemented but remains
 * unverified until a real built page is driven against a local Ollama service.
 *
 * The old version asserted that the word "ollama" never appears anywhere in the published
 * site, and passed. `site/ollama.html` is an entire page about Ollama: an endpoint
 * approval control, a verified-model select, pull and chat controls, and a nav entry
 * labelled "Ollama". The assertion passed because the page list it searched named six
 * pages and the site has nine.
 *
 * The browser surface is deliberately narrower than the desktop manager: it reads only
 * the approved local API, keeps catalog completeness Unknown, and never invents a model,
 * shell command, cloud fallback, or remote progress value.
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
  assert.deepEqual(mentioning, ['converter', 'documentation', 'ollama'],
    'the set of pages mentioning Ollama changed -- the sibling navigation and documentation link are expected, plus ollama.html itself');
});

test('the page loads its real local manager and keeps the boundary explicit', () => {
  const scripts = [...ollama.matchAll(/<script[^>]*src="([^"]+)"/gu)].map((m) => m[1]);
  assert.deepEqual(scripts, ['app.js'], 'ollama.html now loads something other than app.js -- re-derive whether the surface is wired');
  assert.doesNotMatch(app, /^import\s/mu, 'app.js is now a module and may pull in an Ollama client this test cannot see');
  assert.match(app, /function initOllama\(\)/u, 'app.js does not mount the local manager');
  assert.match(app, /OLLAMA_SITE_KEY/u, 'the local catalog has no bounded visitor-local state key');
  assert.match(app, /OLLAMA_TIMEOUT/u, 'the loopback request has no deadline');
  assert.match(app, /validOllamaEndpoint/u, 'the loopback endpoint is not validated');
  assert.match(app, /credentials:'omit'/u, 'the local request could carry browser credentials');
});

test('a navigable page links to ollama.html', () => {
  const linking = PAGES.filter((name) => name !== 'converter' && name !== 'ollama' && /href="ollama\.html"/u.test(pageSource[name]));
  assert.ok(linking.length > 0, 'ollama.html is not reachable from any other navigable page');
});

test('the registry records ollama-suite-manager as implemented-unverified', () => {
  const row = registry.features['ollama-suite-manager'];
  assert.equal(row.status, 'implemented-unverified',
    'the browser manager is wired but still needs built-artifact evidence');
  /* Anchored to the note's opening claim rather than to substrings that survive a rewrite;
   * see the same correction in local-file-converter.test.mjs, which the negative script
   * caught before this one shipped in the same too-weak shape. */
  assert.match(row.note, /site\/ollama\.html/u, 'the note does not name the browser route');
  assert.match(row.note, /Unknown/u, 'the note does not keep browser catalog completeness honest');
  assert.match(row.note, /loopback|local API/iu, 'the note does not name the local-only boundary');
});
