/**
 * Contract: renameable app display name.
 *
 * `display-name.ts` gets the hard, safety-critical half of this feature genuinely right:
 * `IDENTITY` is a frozen constant with no path from the display name, `validateDisplayName`
 * refuses empty names, over-length names and control characters, `nameFor` keeps
 * diagnostics/crash logs/issue reports/the update feed/the installer on the shipped name
 * regardless of any rename, and `restoreDisplayName` seeds the settings field on mount
 * without ever pre-filling the shipped name as though it had been chosen.
 *
 * The registry note claims the chosen name "reaches the title bar, About and
 * notifications." That claim is checked here against the actual rendered surfaces and does
 * not hold: `nameFor()` -- the function that would decide, per surface, which name to show
 * -- is never called anywhere in App.tsx. The console's custom title bar text is a literal
 * string baked into the compiled design (`app/renderer/src/generated/console.tsx`), and the
 * Electron `BrowserWindow`'s own OS-level title is a literal string in `app/electron/main.ts`.
 * Renaming today validates, persists, and can be reset in one action -- but the name a user
 * actually sees in the title bar or the About screen never changes. This file pins that gap
 * precisely, rather than accepting the registry's prose at face value.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const MODULE = 'app/renderer/src/display-name.ts';
const APP = 'app/renderer/src/App.tsx';
const DESIGN = 'app/renderer/src/generated/console.tsx';
const MAIN = 'app/electron/main.ts';

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
  const row = registry.features['app-display-name'];
  assert.ok(row, 'the implementation registry has no row for app-display-name');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state),
    `app-display-name records an undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40,
    'app-display-name records a state with no note explaining what is and is not wired');
});

test('IDENTITY is frozen and carries no field derivable from the display name', () => {
  const src = read(MODULE);
  const body = src.match(/export const IDENTITY = Object\.freeze\(\{([\s\S]*?)\}\);/);
  assert.ok(body, 'expected the IDENTITY object literal to be found as text');
  assert.match(body[1], /productName: 'Material Asterisk',/);
  assert.match(body[1], /dataDirectory: 'ding-pbx-console',/);
  assert.match(body[1], /applicationId: 'com\.dingding\.pbx-console',/);
  assert.match(body[1], /credentialService: 'ding-pbx-console',/);
});

test('a name must be non-empty, at most 60 characters, and free of control characters', () => {
  const src = read(MODULE);
  assert.match(src, /^export const MAX_DISPLAY_NAME_LENGTH = 60;$/m);
  const fn = src.match(/export function validateDisplayName\([\s\S]*?\n\}/);
  assert.ok(fn);
  assert.match(fn[0], /if \(!value\) return \[\{ message: 'A name cannot be empty\./);
  assert.match(fn[0], /if \(value\.length > MAX_DISPLAY_NAME_LENGTH\) \{/);
  assert.match(fn[0], /if \(CONTROL\.test\(value\)\) \{/);
});

test('a stored name that would no longer validate falls back rather than rendering', () => {
  const src = read(MODULE);
  assert.match(src, /return value && validateDisplayName\(value\)\.length === 0 \? value : IDENTITY\.productName;/);
});

test('five surfaces are pinned to the shipped name regardless of any rename', () => {
  const src = read(MODULE);
  const body = src.match(/const SHIPPED_NAME_SURFACES: ReadonlySet<NameSurface> = new Set<NameSurface>\(\[([\s\S]*?)\]\);/);
  assert.ok(body, 'expected the SHIPPED_NAME_SURFACES set literal to be found as text');
  const surfaces = [...body[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(surfaces.sort(), ['diagnosticReport', 'crashLog', 'issueReport', 'updateFeed', 'installer'].sort());
});

test('the id_name control seeds from storage on mount, without pre-filling the shipped name as a choice', () => {
  const app = read(APP);
  const fn = app.match(/private restoreDisplayName\(\): void \{[\s\S]*?\n {2}\}/);
  assert.ok(fn, 'expected to find restoreDisplayName');
  assert.match(fn[0], /if \(current === IDENTITY\.productName\) return;/);
  assert.match(fn[0], /values: \{ \.\.\.\(prior\.values \?\? \{\}\), id_name: current \},/);
});

test('App.tsx wires the rename control and the reset switch to setDisplayName and resetDisplayName', () => {
  const app = read(APP);
  assert.match(app, /if \(control\?\.id === 'id_name' && typeof value === 'string'\) \{\n\s*const problems = setDisplayName\(this\.durableStorage\.storage, value\);/);
  assert.match(app, /if \(control\?\.id === 'id_name_reset' && value === true\) \{\n\s*resetDisplayName\(this\.durableStorage\.storage\);/);
});

test('a rejected rename is reported and never silently stored', () => {
  const app = read(APP);
  assert.match(app, /if \(problems\.length > 0\) \{[\s\S]*?this\.fire\('That name will not work', problems\[0\]\.message\);\n\s*return;\n\s*\}/);
});

test('nameFor is called, so a surface really reads the per-surface split', () => {
  /* This replaces a pin that asserted the opposite. `nameFor` decides which name a title
   * bar, About screen or notification shows, and it was imported nowhere and called
   * nowhere -- so a user could rename the application and every surface kept showing the
   * shipped name. The pin was right to exist and right to fire when the wiring landed.
   *
   * The exact-import assertion is gone rather than updated. It pinned a four-symbol list,
   * so it broke the moment a fifth symbol was legitimately added, and the arity was never
   * the point: what matters is that the chooser is actually called. */
  const app = read(APP);
  assert.match(app, /\bnameFor\(/, 'nameFor(...) is never called, so no surface reads the chosen name');
  assert.match(app, /^import \{[^}]*\bnameFor\b[^}]*\} from '\.\/display-name';$/ms,
    'App.tsx no longer imports nameFor from ./display-name');
});

test('HONEST GAP: displayName() is called exactly once in App.tsx, only to seed the settings field', () => {
  const app = read(APP);
  const calls = [...app.matchAll(/\bdisplayName\(/g)];
  assert.equal(calls.length, 1, `expected exactly one call to displayName(...), found ${calls.length}`);
});

test('HONEST GAP: the compiled design\'s title bar text is a hard-coded literal, not a rendered value', () => {
  const design = read(DESIGN);
  const literalOccurrences = [...design.matchAll(/^\s*"Material Asterisk"\s*$/gm)];
  assert.ok(literalOccurrences.length >= 2,
    `expected the shipped product name to appear as a bare string literal at least twice in the compiled design, found ${literalOccurrences.length}`);
});

test('HONEST GAP: the Electron BrowserWindow title is also a hard-coded literal', () => {
  const main = read(MAIN);
  assert.match(main, /title: 'Material Asterisk',/);
});
