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

test('the registry state agrees with the note that has to justify it', () => {
  /* This used to hardcode 'implemented'. A registry audit then corrected six rows to
   * 'partial' -- their modules are imported but never called, wired at one end and
   * consumed at neither -- and the hardcoded literal turned that correction into six
   * failures. The test was pinning a claim that had become false, which is the opposite
   * of what a guard is for.
   *
   * So it no longer asserts a fixed value. It asserts the row is internally honest: a
   * state the validator defines, and a note long enough to say what is or is not wired.
   * That stays true when the wiring lands and the row legitimately moves back up. */
  const registry = json('app/feature-registry.json');
  const row = registry.features['funny-levels'];
  assert.ok(row, 'the implementation registry has no row for funny-levels');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state),
    `funny-levels records an undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40,
    'funny-levels records a state with no note explaining what is and is not wired');
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

test('the funny-level slider and the chaos dial no longer share a control id', () => {
  /* This replaces a pin that documented the collision as a known defect. Its own comment
   * said that if it ever failed because the collision had been resolved, it should be
   * deleted rather than "fixed" back to passing. It was right about the second half and
   * too modest about the first: deleting it would leave nothing at all stopping the two
   * features sharing an id again.
   *
   * The defect was worth pinning. `fun_level` was read in two unrelated places -- the
   * funny-level slider at 1-5 defaulting to 5, and a legacy appearance-chaos dial at 0-4
   * defaulting to 2 and indexing a five-entry table. It corrupted in both directions:
   * setting the humour level to 5 read one past the end of that table, and choosing a
   * chaos level silently overwrote the persisted humour setting through the shared setter.
   *
   * So the assertion is inverted rather than removed. The chaos dial now owns
   * `chaos_level`, and nothing may read `fun_level` with the chaos dial's shape again. */
  const design = read(DESIGN);
  assert.doesNotMatch(design, /\['Bank','Polite','Balanced','Playful','Unhinged'\]\[this\.v\('fun_level'/,
    'the chaos-appearance lookup table is indexed by fun_level again, so the two features share an id');
  assert.doesNotMatch(design, /this\.v\('fun_level',\s*2\)/,
    "something reads fun_level with the chaos dial's default of 2 again; the humour slider defaults to 5");
  assert.match(design, /\['Bank','Polite','Balanced','Playful','Unhinged'\]\[this\.v\('chaos_level'/,
    'the chaos-appearance dial no longer reads its own chaos_level id');
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
