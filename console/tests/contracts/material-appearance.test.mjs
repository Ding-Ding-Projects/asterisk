/**
 * Contract: material-appearance.
 *
 * The implementation-registry note ("neither module is imported by
 * App.tsx/PbxAdminApp.tsx") is STALE for `colour.ts` and overstates the gap for
 * `appearance.ts`. What is true today, read from the source:
 *
 *   - `colour.ts`'s `translate` IS imported and genuinely used three times: the
 *     wildcard appearance panel, an AA contrast readout (`contrastStatus`,
 *     explicitly reusing the same translator "so the measured value is exactly
 *     the one the person is being shown"), and a third live conversion.
 *   - `appearance.ts` IS imported, and four of its six imported symbols
 *     (`addRule`, `applyTheme`, `cssVarFor`, `exportTheme`, `resetAll`,
 *     `WILDCARD_ELEMENT`) are genuinely called from `buildAppearanceTheme()`/
 *     `applyAppearanceToDom()`, which write real inline styles (`color`,
 *     `font-family`, `font-weight`, `font-size`) onto the actual root element --
 *     live, with no restart, using the hue/saturation/lightness/family/weight/
 *     size values the appearance panel already exposes.
 *   - `importTheme` is the one dead symbol: imported alongside the other five,
 *     never called. There is no appearance IMPORT path in App.tsx even though
 *     export (`exportTheme`) is real.
 *
 * The compiled console separately implements its own tab-colour picker and a
 * rainbow colour cycle (`applyColour`, `tabColourOpts`), real and wired but
 * narrower (tab colour only) than the appearance.ts/colour.ts module set -- this
 * file pins that split too.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const APP = 'app/renderer/src/App.tsx';
const GENERATED = 'app/renderer/src/generated/console.tsx';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['material-appearance'];
  assert.ok(row, 'the implementation registry has no row for material-appearance');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('colour.ts IS imported and translate() is genuinely called more than once', () => {
  const app = read(APP);
  assert.match(app, /import \{ COLOUR_FORMATS, formatColour, parseColour, translate as translateColour \} from '\.\/colour';/,
    'colour.ts is no longer imported the expected way -- the note may have become accurate again');
  const calls = [...app.matchAll(/translateColour\(/gu)];
  assert.ok(calls.length >= 3, `expected translateColour(...) called at least 3 times, found ${calls.length}`);
});

test('appearance.ts IS imported, and addRule/applyTheme/cssVarFor/exportTheme/resetAll are genuinely called', () => {
  const app = read(APP);
  assert.match(app, /addRule, applyTheme, cssVarFor, exportTheme, importTheme, resetAll, WILDCARD_ELEMENT,/u,
    'appearance.ts is no longer imported the expected way -- re-check the import list');
  for (const symbol of ['addRule', 'applyTheme', 'cssVarFor', 'exportTheme', 'resetAll']) {
    // The destructuring import has no parenthesis after the symbol, so any match of
    // `symbol(` is a genuine call site, never the import line itself.
    const callSites = [...app.matchAll(new RegExp(`\\b${symbol}\\(`, 'gu'))];
    assert.ok(callSites.length >= 1, `${symbol}(...) is imported but never called -- it may have gone dead, like importTheme`);
  }
});

test('importTheme is the one dead symbol: imported, never called -- there is no appearance IMPORT path', () => {
  const app = read(APP);
  const occurrences = [...app.matchAll(/\bimportTheme\b/gu)];
  assert.equal(occurrences.length, 1, 'importTheme now appears more than once -- it may have been wired to a real import control, which would close this gap');
});

test('applyAppearanceToDom writes real inline styles onto the root element -- this is not a value that is merely stored', () => {
  const app = read(APP);
  const fn = app.match(/private applyAppearanceToDom\(theme: AppearanceTheme\): void \{[\s\S]*?\n  \}/);
  assert.ok(fn, 'expected to find applyAppearanceToDom');
  const body = fn[0];
  assert.match(body, /root\.style\.setProperty\('color', colourVal\);/u, 'colour is no longer applied to the DOM');
  assert.match(body, /root\.style\.setProperty\('font-family', `\$\{familyVal\},sans-serif`\);/u, 'font-family is no longer applied to the DOM');
  assert.match(body, /root\.style\.setProperty\('font-weight', weightVal\);/u, 'font-weight is no longer applied to the DOM');
  assert.match(body, /root\.style\.setProperty\('font-size', sizeVal\);/u, 'font-size is no longer applied to the DOM');
});

test('the appearance system is scoped to the wildcard element -- the compiled interface exposes no per-element CSS hook', () => {
  const app = read(APP);
  const normalized = app.replace(/[ \t]*\*[ \t]*/gu, ' ').replace(/\s+/gu, ' ');
  assert.match(normalized, /scoped to the wildcard element -- the only scope the compiled interface can actually read back, since it exposes no per-element CSS hook\./u,
    'the wildcard-only scoping comment no longer matches -- per-element appearance may now be reachable');
});

test('the compiled console also implements its own tab-colour picker and rainbow cycle, real but narrower than appearance.ts', () => {
  const generated = read(GENERATED);
  assert.match(generated, /applyColour = \(val\) => \{/u, 'the compiled tab-colour applyColour() no longer matches');
  assert.match(generated, /const colour = val === 'rainbow' \? 'hsl\(148 60% 62%\)' : val;/u, 'the rainbow cycle special-case no longer matches');
});
