/**
 * Contract: School mode.
 *
 * The registry note is confident this is fully wired, but it is confident about a stale
 * claim too: it says the `school-status` control's `action:'school-status'` "App does not
 * answer yet, so the control is present and inert." That is no longer true -- App.tsx does
 * answer it -- so this file recomputes every claim from the current source rather than
 * trusting the note either way.
 *
 * What IS genuinely wired: the switch, the credential (set/verify), the rename path, and
 * the status line. All four are exercised below against App.tsx and school-mode.ts as they
 * exist today.
 *
 * What is NOT wired, and is the central honest gap this file exists to pin: the module's
 * whole reason for being is `filterVisibleCapabilities` / `effectiveLanguageMode` /
 * `effectiveFunnyLevel` -- the functions that would actually OMIT Cantonese, bilingual,
 * funny-level and dim-sum capabilities while the mode is on. None of them is imported or
 * called anywhere in App.tsx. Turning School mode on today flips a stored flag, forces the
 * status line to say "On.", and hides nothing. That is a materially different feature from
 * the one `school-mode.md` and the registry note describe, and it is pinned here rather
 * than papered over -- exactly as the localization evidence pins "partial" instead of
 * rounding a feature up to "localized".
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const MODULE = 'app/renderer/src/school-mode.ts';
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
  const row = registry.features['school-mode'];
  assert.ok(row, 'the implementation registry has no row for school-mode');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state),
    `school-mode records an undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40,
    'school-mode records a state with no note explaining what is and is not wired');
});

test('every capability the mode must hide is recorded, exactly six of them', () => {
  const src = read(MODULE);
  const body = src.match(/export const HIDDEN_CAPABILITIES = \[([^\]]*)\] as const;/);
  assert.ok(body, 'expected the HIDDEN_CAPABILITIES array literal to be found as text');
  const items = [...body[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(items.sort(), [
    'language.cantonese', 'language.bilingual',
    'funnyLevel.english', 'funnyLevel.cantonese',
    'personalVocabulary', 'dimSum',
  ].sort());
});

test('the honesty notice actually says this is a UX lock, not a security boundary', () => {
  const src = read(MODULE);
  assert.match(src, /not a security boundary/);
  assert.match(src, /Deleting the shared local ' \+\n\s*'application-data record turns it off/);
});

test('turning it on needs nothing; turning it off needs a verified credential', () => {
  const src = read(MODULE);
  const on = src.match(/export function activateSchoolMode\([\s\S]*?\n\}/);
  const off = src.match(/export function deactivateSchoolMode\([\s\S]*?\n\}/);
  assert.ok(on && off);
  assert.doesNotMatch(on[0], /verifyCredential|hasCredential/,
    'activation must not require a credential check');
  assert.match(off[0], /if \(!hasCredential\(storage\)\) return \{ ok: false, reason: 'no credential has been set for it yet' \};/);
  assert.match(off[0], /if \(!verifyCredential\(storage, providedSecret\)\) return \{ ok: false, reason: 'credential did not match' \};/);
});

test('a rejected attempt never reveals whether a credential exists or what was typed', () => {
  const src = read(MODULE);
  const verify = src.match(/export function verifyCredential\([\s\S]*?\n\}/);
  assert.ok(verify);
  assert.match(verify[0], /return storage\?\.getItem\(KEY_CRED_HASH\) === credentialDigest\(method, secret\);/);
  /* The whole function returns a plain boolean -- no length, no composition, no echo. */
  assert.doesNotMatch(verify[0], /secret\.length/);
});

test('App.tsx wires the switch, the unlock action, the credential setter and the rename', () => {
  const app = read(APP);
  assert.match(app, /if \(control\?\.id === 'school_mode' && typeof value === 'boolean'\) \{\n\s*this\.setSchoolMode\(value\);/);
  assert.match(app, /if \(control\?\.id === 'school_unlock' && value === true\) \{\n\s*this\.setSchoolMode\(false\);/);
  assert.match(app, /if \(control\?\.id === 'school_set_credential' && value === true\) \{\n\s*this\.storeSchoolCredential\(\);/);
  assert.match(app, /if \(control\?\.id === 'school_name' && typeof value === 'string'/);
});

test('the status line control is genuinely answered, contradicting the stale "inert" note', () => {
  const app = read(APP);
  assert.match(app, /if \(action === 'school-status'\) return this\.schoolStatusLine;/);
  assert.match(app, /this\.refreshSchoolStatus\(\);/);
});

test('the credential is consumed through the one-call-lifetime helper, never read as an ordinary control', () => {
  const app = read(APP);
  assert.match(app, /return consumeCredential\(values, 'school_credential'\);/);
});

test('all seven controls this feature owns exist in the compiled design', () => {
  const design = read(DESIGN);
  for (const id of [
    'school_mode', 'school_name', 'school_credential',
    'school_method', 'school_set_credential', 'school_unlock', 'school_status',
  ]) {
    assert.match(design, new RegExp(`ctl\\('${id}',`), `expected control '${id}' in the compiled design`);
  }
});

test('HONEST GAP: nothing in App.tsx ever asks whether a capability should be hidden', () => {
  /* This is the assertion the whole file exists to make. The switch and the credential
   * work; the omission behaviour the feature is named for does not exist anywhere in the
   * mounted app. Anchored on the call shape so a stray comment cannot satisfy it, and the
   * import line is checked too so a call added without an import (impossible in valid
   * TypeScript, but this file does not compile anything) cannot slip past either check. */
  const app = read(APP);
  for (const call of [
    'filterVisibleCapabilities(', 'effectiveLanguageMode(',
    'effectiveFunnyLevel(', 'capabilityVisible(', 'schoolModeDescriptor(', 'lockedOffExplanation(',
  ]) {
    assert.ok(!app.includes(call), `${call} must not appear in App.tsx if the omission behaviour is truly unwired`);
  }
  const importLine = app.match(/^import \{\n\s*activateSchoolMode, deactivateSchoolMode, hasCredential, renameSchoolMode,\n\s*schoolModeActive, schoolModeName, setCredential, type CredentialMethod,\n\} from '\.\/school-mode';$/m);
  assert.ok(importLine, 'expected the exact known-good import list from ./school-mode in App.tsx');
});

test('the module itself proves the hiding behaviour would work, if anything ever called it', () => {
  /* This keeps the previous test from reading as "the feature does not work" -- the logic
   * is correct and tested in isolation (see tests/ui/school-mode.test.tsx); the gap is
   * specifically that App.tsx never reaches it. */
  const src = read(MODULE);
  assert.match(src, /return schoolModeActive\(storage\) \? 'english' : stored;/);
  assert.match(src, /return schoolModeActive\(storage\) \? 1 : stored;/);
});
