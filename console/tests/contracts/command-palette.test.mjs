/**
 * Contract: the command palette (Ctrl+Shift+F).
 *
 * Unlike several of its neighbours in this evidence pass, this feature is genuinely wired
 * end to end: `buildPalette` is called once to construct the list at startup,
 * `isPaletteChord` gates a captured (not bubbled) keydown listener, `searchPalette` and
 * `moveSelection` drive the open palette, and `activatePaletteEntry` teleports to the exact
 * control through the `data-ctl` attribute that `m3-control.tsx` renders on every control
 * row. Every claim below is recomputed from the real source rather than trusted from the
 * registry note.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const MODULE = 'app/renderer/src/command-palette.ts';
const APP = 'app/renderer/src/App.tsx';

test('the registry records this feature as implemented', () => {
  const registry = json('app/feature-registry.json');
  assert.equal(registry.features['command-palette'].state, 'implemented');
});

test('the chord is Ctrl+Shift+F, and the matcher checks it exactly', () => {
  const src = read(MODULE);
  assert.match(src, /^export const PALETTE_CHORD = \{ ctrl: true, shift: true, key: 'f' \} as const;$/m);
  /* isPaletteChord's own parameter type is itself an object literal ending in a bare
   * "\n}", so this matches from the first body statement rather than from the function
   * keyword, to avoid stopping at that type literal's closing brace instead of the
   * function's own. */
  const fn = src.match(/if \(!event\.ctrlKey \|\| !event\.shiftKey\) return false;[\s\S]*?\n\}/);
  assert.ok(fn, 'expected to find the body of isPaletteChord');
  assert.match(fn[0], /if \(event\.altKey === true\) return false;/);
  assert.match(fn[0], /event\.key\.toLowerCase\(\) === PALETTE_CHORD\.key;/);
});

test('the list is derived from the compiled design, never hand-written beside it', () => {
  const src = read(MODULE);
  const fn = src.match(/export function buildPalette\([\s\S]*?\n\}/);
  assert.ok(fn, 'expected to find buildPalette');
  assert.match(fn[0], /for \(const id of order\) \{/);
  assert.match(fn[0], /for \(const group of screen\.groups \?\? \[\]\) \{/);
  assert.match(fn[0], /for \(const control of group\.ctls \?\? \[\]\) \{/);
});

test('a duplicate key keeps the first entry rather than the last', () => {
  const src = read(MODULE);
  assert.match(src, /if \(seen\.has\(entry\.key\)\) return;/);
});

test('search is plain text, case-insensitive, and never regex', () => {
  const src = read(MODULE);
  const fn = src.match(/export function searchPalette\([\s\S]*?\n\}/);
  assert.ok(fn);
  assert.match(fn[0], /const needle = query\.trim\(\)\.toLowerCase\(\);/);
  assert.doesNotMatch(fn[0], /new RegExp/);
});

test('ranking is starts-with, then contains, then detail-only, stably', () => {
  const src = read(MODULE);
  assert.match(src, /const tier = \(match: PaletteMatch\): number => \(match\.at === 0 \? 0 : match\.at > 0 \? 1 : 2\);/);
  assert.match(src, /return matches\.sort\(\(left, right\) => tier\(left\) - tier\(right\)\);/);
});

test('moveSelection wraps in both directions and never returns a negative index', () => {
  const src = read(MODULE);
  const fn = src.match(/export function moveSelection\([\s\S]*?\n\}/);
  assert.ok(fn);
  assert.match(fn[0], /if \(count <= 0\) return 0;/);
  assert.match(fn[0], /return \(\(current \+ delta\) % count \+ count\) % count;/);
});

test('App.tsx builds the palette once and wires the captured keydown listener', () => {
  const app = read(APP);
  assert.match(app, /buildPalette,\s*isPaletteChord,\s*moveSelection,\s*searchPalette,/);
  assert.match(app, /private readonly palette: PaletteEntry\[\] = buildPalette\(/);
  assert.match(app, /window\.addEventListener\('keydown', handler, true\);/,
    'expected the listener registered with capture: true so a field cannot swallow the chord');
});

test('teleporting reveals and focuses the exact control through the data-ctl hook', () => {
  const app = read(APP);
  assert.match(app, /document\?\.querySelector\(`\[data-ctl="\$\{id\}"\]`\);/);
  assert.match(app, /row\.scrollIntoView\(\{ block: 'center' \}\);/);
  assert.match(app, /const focusable = row\.querySelector\('input, select, button, \[tabindex\]'\);/);
});

test('a control that cannot be revealed says so, rather than silently doing nothing', () => {
  const app = read(APP);
  assert.match(app, /this\.toast\('That setting is on this screen but its row is not on display right now\.'\);/);
});

test('the data-ctl attribute actually exists in the rendered control template, not only in the reveal code', () => {
  /* Without this, the previous test would prove the reveal code queries for an attribute
   * that no rendered element ever carries -- a teleport to nowhere. */
  const src = read('app/renderer/src/generated/m3-control.tsx');
  assert.match(src, /"data-ctl": v\.ctl\.rawKey/);
});

test('closing removes the palette from the document entirely rather than merely hiding it', () => {
  const app = read(APP);
  assert.match(app, /private paletteOverlay\(\): ReactNode \{/);
  const fn = app.match(/private paletteOverlay\(\): ReactNode \{[\s\S]*?\n {2}\}/);
  assert.ok(fn);
  assert.match(fn[0], /if \(!this\.paletteOpen\) return null;/,
    'expected the overlay to render nothing at all while closed, not a hidden node');
});

test('closing returns focus to whatever had it before the palette opened', () => {
  const app = read(APP);
  assert.match(app, /this\.paletteReturnFocus = active instanceof HTMLElement \? active : undefined;/);
  assert.match(app, /this\.paletteReturnFocus\?\.focus\?\.\(\);/);
});
