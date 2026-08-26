/**
 * Contract: language-modes, as the static site actually implements it.
 *
 * The desktop console and this website are different surfaces with different code,
 * so this file does not borrow the console's claims. It recomputes its own facts
 * straight from site/app.js and the six published HTML pages, and pins the honest
 * result: the language-mode switch is real and wired, but it changes the document
 * language attribute and a handful of `data-copy` hooks, not the page's static
 * English prose (nav labels, headings, most body copy stay exactly as written no
 * matter which of the three modes is selected).
 *
 * Plain `.mjs`, no bundler, no build step -- this is the `localCheck` evidence
 * column and must run standalone against the published sources.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const PAGES = ['index', 'product', 'documentation', 'downloads', 'status', 'settings'];
const pageSource = Object.fromEntries(PAGES.map((name) => [name, read(`${name}.html`)]));
const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for language-modes', () => {
  assert.ok(registry.features['language-modes'], 'no language-modes row in site/feature-registry.json');
  assert.equal(typeof registry.features['language-modes'].state, 'string');
});

test('settings.html exposes exactly the three language modes the switch implements', () => {
  const select = pageSource.settings.match(/<select id="language-mode"[^>]*>([\s\S]*?)<\/select>/u);
  assert.ok(select, 'settings.html has no #language-mode select');
  const values = [...select[1].matchAll(/<option value="([^"]+)"/gu)].map((m) => m[1]);
  assert.deepEqual(values, ['en', 'zh', 'both'], 'the select no longer offers exactly English, Cantonese, and Bilingual');
});

test('applyLanguage() only sets the document language attribute and one preview line', () => {
  /* Anchored to the whole function on its own source line -- app.js is minified onto
   * single lines per function, so a line-start/line-end match cannot cross into a
   * neighbouring function the way a lazy [\s\S]*? scan could. */
  const line = app.split('\n').find((l) => /^\s*function applyLanguage\(\)\{/.test(l));
  assert.ok(line, 'applyLanguage() was not found as a single source line');
  assert.match(line, /document\.documentElement\.lang=/, 'applyLanguage no longer sets documentElement.lang');
  assert.match(line, /\$\('language-preview'\)\.textContent=/, 'applyLanguage no longer writes the language-preview line');
  /* The negative half of the claim: if this function starts looping over the page
   * (querySelectorAll / the all() helper / [data-copy] itself) it has stopped being
   * the narrow switch this row describes, and the row would need to say "implemented"
   * instead of "partial". */
  assert.doesNotMatch(line, /querySelectorAll|all\(|data-copy/u,
    'applyLanguage now touches more than the lang attribute and the preview line -- the "partial" claim is stale');
});

test('data-copy is a real but narrow hook: present, and far smaller than the page\'s static text', () => {
  const dataCopyCount = [...pageSource.index.matchAll(/data-copy="[a-zA-Z]+"/gu)].length
    + [...pageSource.settings.matchAll(/data-copy="[a-zA-Z]+"/gu)].length
    + PAGES.filter((n) => n !== 'index' && n !== 'settings')
        .reduce((sum, n) => sum + [...pageSource[n].matchAll(/data-copy="[a-zA-Z]+"/gu)].length, 0);
  assert.ok(dataCopyCount > 0, 'no data-copy hooks exist anywhere, so the language switch would change nothing -- that is "absent", not "partial"');
  /* A generous count of plain static paragraph/heading text nodes across the six pages,
   * none of which carry a translation hook. If this ever shrinks to meet dataCopyCount,
   * the site has actually grown full-page localization and the row should change. */
  const staticTextNodes = PAGES.reduce((sum, n) => sum + [...pageSource[n].matchAll(/<(?:p|h1|h2|h3)[^>]*>/gu)].length, 0);
  assert.ok(staticTextNodes > dataCopyCount * 5,
    `only ${dataCopyCount} data-copy hooks against ${staticTextNodes} static text elements -- if this ratio ever closes, the site covers more than a preview line and is no longer "partial"`);
});

test('primary navigation labels are plain, untranslated English with no data-copy hook', () => {
  /* The concrete case that makes "most page text has no data-copy hook" a checkable
   * fact rather than an impression: the nav bar itself. */
  const nav = pageSource.index.match(/<nav class="site-nav"[^>]*>([\s\S]*?)<\/nav>/u);
  assert.ok(nav, 'index.html has no primary site-nav element');
  assert.doesNotMatch(nav[1], /data-copy=/u, 'the primary navigation now carries translation hooks -- recheck the "partial" claim');
  assert.match(nav[1], />Home</u, 'the nav no longer contains the literal, untranslated label "Home"');
});

test('the registry honestly records "partial" rather than rounding up or down', () => {
  assert.equal(registry.features['language-modes'].state, 'partial',
    'the language-mode switch is real (wired select, applyLanguage, data-copy hooks) but does not cover the page\'s static text -- "partial" is the honest state, not "implemented" or "absent"');
});
