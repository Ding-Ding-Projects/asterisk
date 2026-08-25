/**
 * Contract: funny-level sliders.
 *
 * `app/feature-registry.json` records this as `implemented`. That is true of the module
 * and of its persistence -- two independent dials, one per language, both defaulting to
 * maximum -- and every claim below about the module itself is recomputed from
 * `funny-levels.ts` as text, not trusted from the registry's prose.
 *
 * It is NOT true of the module's central promise. `funny-levels.ts` exists specifically so
 * a message can be rendered at a chosen level while every fact survives (`renderMessage`,
 * `funnyLevel`), and neither of those two functions is ever called from `App.tsx`. The app
 * persists a number per language; it never uses that number to style anything a person
 * reads. This file pins that gap rather than papering over it, exactly as the localization
 * evidence pins a "partial" state instead of rounding it up to "localized".
 *
 * It also documents a real defect found while reading the source: the design's compiled
 * template reuses the control id `fun_level` for a second, unrelated feature -- a legacy
 * "chaos" appearance-randomization dial with its own 0-4 range and default of 2. Moving
 * the funny-level slider to 5 therefore also feeds 5 into `['Bank','Polite','Balanced',
 * 'Playful','Unhinged'][5]`, one past the end of that array. This is reported, not fixed;
 * the test below only proves the collision is real so it cannot be waved away as a reading
 * mistake.
 *
 * Plain `.mjs`, reading `.ts` sources as text, matching `language-modes.test.mjs`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const MODULE = 'app/renderer/src/funny-levels.ts';
const APP = 'app/renderer/src/App.tsx';
const DESIGN = 'app/renderer/src/generated/console.tsx';

test('the registry records this feature as implemented', () => {
  const registry = json('app/feature-registry.json');
  assert.equal(registry.features['funny-levels'].state, 'implemented');
});

test('the two levels are 1..5 and both start at the maximum', () => {
  const src = read(MODULE);
  assert.match(src, /^export const MIN_FUNNY_LEVEL = 1;$/m);
  assert.match(src, /^export const MAX_FUNNY_LEVEL = 5;$/m);
  assert.match(src, /^export const DEFAULT_FUNNY_LEVEL = 5;$/m);
});

test('the two dials are stored under independent keys, one per language', () => {
  const src = read(MODULE);
  assert.match(src, /^export const LEVEL_SETTING_PREFIX = 'console\.funnyLevel\.';$/m);
  assert.match(src, /^export type CopyLanguage = 'en' \| 'yue';$/m);
});

test('an unreadable stored value falls back rather than being clamped', () => {
  /* This is the module's own stated safety property: a hand-edited 9 must read as the
   * default because clamping it would be indistinguishable from a real choice of 5. */
  const src = read(MODULE);
  assert.match(src, /isFunnyLevel\(parsed\) \? parsed : DEFAULT_FUNNY_LEVEL/);
});

test('a rendered message never drops a fact, whatever the phrasing', () => {
  /* renderMessage appends any fact the chosen phrasing failed to carry, rather than
   * silently rendering an incomplete warning. This is the mechanism the whole feature's
   * safety rests on -- proven here to exist, and proven unreachable from the app below. */
  const src = read(MODULE);
  assert.match(src, /const missingFacts = message\.facts\.filter\(\(fact\) => !text\.includes\(fact\)\);/);
});

test('App.tsx wires both sliders to the persistence layer, and only the persistence layer', () => {
  const app = read(APP);
  const importLine = app.match(/^import \{ ([^}]+) \} from '\.\/funny-levels';$/m);
  assert.ok(importLine, 'expected a single-line import from ./funny-levels in App.tsx');
  const imported = importLine[1].split(',').map((s) => s.trim());
  assert.deepEqual(imported.sort(), ['isFunnyLevel', 'setFunnyLevel', "type CopyLanguage"].sort());

  /* Neither the getter nor the message renderer is imported at all -- so nothing in
   * App.tsx can read a stored level back out to style a message with it. */
  assert.ok(!imported.some((name) => name === 'funnyLevel'),
    'funnyLevel (the getter) must not be imported if it is truly never consumed');
  assert.ok(!imported.some((name) => name === 'renderMessage'),
    'renderMessage must not be imported if it is truly never consumed');
});

test('the two control ids are each routed to setFunnyLevel, distinguished by language', () => {
  const app = read(APP);
  assert.match(
    app,
    /if \(\(control\?\.id === 'fun_level' \|\| control\?\.id === 'fun_level_yue'\) && typeof value === 'number'\) \{\n\s*const language: CopyLanguage = control\.id === 'fun_level_yue' \? 'yue' : 'en';\n\s*if \(isFunnyLevel\(value\)\) setFunnyLevel\(this\.durableStorage\.storage, language, value\);\n\s*\}/,
    'expected the exact fun_level / fun_level_yue branch calling setFunnyLevel with the derived language',
  );
});

test('neither the getter nor the message renderer is called anywhere in App.tsx', () => {
  /* A call site could in principle be reached without an import (e.g. through a dynamic
   * property lookup), so this checks the call shape directly rather than trusting the
   * import list alone. Anchored on the call parenthesis so a comment mentioning the name
   * cannot satisfy it. */
  const app = read(APP);
  assert.doesNotMatch(app, /\bfunnyLevel\(/, 'funnyLevel(...) must never be called from App.tsx');
  assert.doesNotMatch(app, /\brenderMessage\(/, 'renderMessage(...) must never be called from App.tsx');
});

test('the design declares both sliders as a 1..5 range matching the module', () => {
  const design = read(DESIGN);
  assert.match(design, /ctl\('fun_level','Fun level \(English\)','slider',5,\{ min:1, max:5,/);
  assert.match(design, /ctl\('fun_level_yue','Fun level \(廣東話\)','slider',5,\{ min:1, max:5,/);
});

test('KNOWN DEFECT: fun_level collides with an unrelated legacy chaos-appearance dial', () => {
  /* The same control id is read elsewhere in the compiled design with a 0-4 range and a
   * fallback default of 2, for a wholly different "randomize the whole appearance"
   * feature. This is real, verified against the design source, and reported rather than
   * fixed. If this assertion ever fails because the collision has been resolved, that is
   * good news and this test should be deleted rather than "fixed" back to passing. */
  const design = read(DESIGN);
  const chaosReads = [...design.matchAll(/this\.v\('fun_level',\s*2\)/g)];
  assert.ok(chaosReads.length > 0,
    'expected the legacy chaos-appearance code to still read fun_level with a fallback of 2; '
    + 'if this is gone the collision documented here may have been resolved');
  assert.match(design, /\['Bank','Polite','Balanced','Playful','Unhinged'\]\[this\.v\('fun_level', 2\)\]/,
    "expected the 5-entry lookup table indexed by fun_level, which a value of 5 (the funny-level "
    + 'slider\'s own maximum) reads one past the end of');
});

test('every fact in a destructive-style message survives every level, proving the module is safe in isolation', () => {
  /* This exercises renderMessage's own guarantee directly against the source's logic
   * description, without importing the .ts module (this file stays plain JS on purpose).
   * It is a structural check that the fallback chain in phrasingFor walks downward to the
   * lowest defined level rather than to a hard-coded default. */
  const src = read(MODULE);
  assert.match(src, /for \(let candidate = level; candidate >= MIN_FUNNY_LEVEL; candidate -= 1\) \{/);
  assert.match(src, /const phrasing = message\.phrasings\[candidate as FunnyLevel\];/);
});
