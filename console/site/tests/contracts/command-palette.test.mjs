/**
 * Contract: command-palette, recomputed from the published site.
 *
 * The registry's own note says "Ctrl+Shift+F was not confirmed as the activation
 * key". Reading the source says otherwise: the keydown listener wired in
 * initNavigation() checks exactly ctrlKey && shiftKey && key === 'f' and calls
 * openPalette(). That is a real, working keyboard shortcut, present on every page
 * this repository ships. This file pins the fact that IS true rather than repeating
 * the stale claim -- a `verified` row has to mean the code was actually read.
 *
 * What keeps the honest state at "partial" is a different, real gap: the palette's
 * result list covers the six pages and the destination catalog only. It never reaches
 * a setting, an appearance control, or any other in-page command the way the full
 * command-palette contract requires, and this file proves that gap from the same
 * source rather than asserting it from the note.
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

test('the site feature registry carries a row for command-palette', () => {
  assert.ok(registry.features['command-palette'], 'no command-palette row in site/feature-registry.json');
});

test('every published page carries the palette dialog, its open control, and its search field', () => {
  for (const name of PAGES) {
    for (const id of ['command-palette', 'palette-open', 'palette-search', 'palette-results']) {
      assert.match(pageSource[name], new RegExp(`id="${id}"`, 'u'), `${name}.html is missing #${id}`);
    }
  }
});

test('Ctrl+Shift+F genuinely opens the palette -- this contradicts the registry note and the note is wrong', () => {
  const line = app.split('\n').find((l) => /addEventListener\('keydown',event=>/.test(l) && l.includes('openPalette()'));
  assert.ok(line, 'no keydown listener calling openPalette() was found in app.js');
  assert.match(line, /event\.ctrlKey&&event\.shiftKey&&event\.key\.toLowerCase\(\)==='f'/u,
    'the Ctrl+Shift+F condition is no longer wired to openPalette() -- if this fails, the registry note would finally be correct');
});

test('the shortcut is discoverable: the visible open button advertises Ctrl+Shift+F', () => {
  assert.match(pageSource.index, /id="palette-open"[^>]*>[\s\S]{0,80}<kbd>Ctrl<\/kbd>\+<kbd>Shift<\/kbd>\+<kbd>F<\/kbd>/u,
    'the palette-open button no longer shows the Ctrl+Shift+F hint to a sighted user');
});

test('openPalette() opens a real modal, clears the query, and moves focus into the search field', () => {
  const line = app.split('\n').find((l) => /^\s*function openPalette\(\)\{/.test(l));
  assert.ok(line, 'openPalette() was not found as a single source line');
  assert.match(line, /\.showModal\(\)/u, 'openPalette no longer opens a real <dialog> modal');
  assert.match(line, /\$\('palette-search'\)\.focus\(\)/u, 'openPalette no longer moves focus into the search field');
});

test('renderPalette() only indexes the six pages and the destination catalog, not settings or appearance controls', () => {
  const line = app.split('\n').find((l) => /^\s*function renderPalette\(query=''\)\{/.test(l));
  assert.ok(line, 'renderPalette(query) was not found as a single source line');
  assert.match(line, /\['Home','index\.html'\]/u, 'renderPalette no longer indexes the page destinations');
  assert.match(line, /DESTINATIONS\.map/u, 'renderPalette no longer indexes the destination catalog');
  /* The gap: nothing in the palette result source reaches into settings controls
   * (theme-mode, accent-color, and friends) or into an "appearance" editor. If this
   * ever starts referencing them, the palette has grown past "pages and destinations
   * only" and the honest state moves from "partial" toward "implemented". */
  assert.doesNotMatch(line, /theme-mode|accent-color|density-mode|font-scale/u,
    'renderPalette now reaches into settings controls -- the "partial" state needs re-checking');
});

test('the registry records command-palette as partial, and that is still the honest state', () => {
  assert.equal(registry.features['command-palette'].state, 'partial',
    'the palette is real and keyboard-activated on every page, but only indexes pages and destinations -- "partial" is correct, even though the note\'s specific reasoning (an unconfirmed shortcut) is stale');
});
