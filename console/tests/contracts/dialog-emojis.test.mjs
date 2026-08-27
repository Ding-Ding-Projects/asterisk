/**
 * Contract: dialog emoji toggle ("Show emojis in dialogs and message boxes").
 *
 * The persisted switch and the boundary rule that keeps emoji off buttons, action labels
 * and accessible names are real -- recomputed from `dialog-emojis.ts` below rather than
 * trusted from the registry note. `setEmojisEnabled` is genuinely wired to the `dlg_emoji`
 * control.
 *
 * What is NOT wired: `decorateDialogText` / `buildDialog`, the functions that actually
 * apply an emoji to a dialog's heading or body, are never called anywhere in `App.tsx`.
 * Every one of the app's ~60 `this.fire(...)` calls builds its dialog text directly,
 * without passing through `buildDialog`. So turning the switch on persists a value and
 * changes nothing a user can see -- this file pins that gap explicitly, the same way the
 * localization evidence pins "partial" rather than rounding a feature up to "localized".
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const MODULE = 'app/renderer/src/dialog-emojis.ts';
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
  const row = registry.features['dialog-emojis'];
  assert.ok(row, 'the implementation registry has no row for dialog-emojis');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.status),
    `dialog-emojis records an undefined state "${row.status}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40,
    'dialog-emojis records a state with no note explaining what is and is not wired');
});

test('the setting key and the off-by-default rule match the source', () => {
  const src = read(MODULE);
  assert.match(src, /^export const DIALOG_EMOJI_SETTING = 'console\.dialogEmojis';$/m);
  assert.match(src, /return storage\?\.getItem\(DIALOG_EMOJI_SETTING\) === 'on';/);
});

test('every dialog kind maps to exactly the emoji the module claims', () => {
  const src = read(MODULE);
  const body = src.match(/export const DIALOG_EMOJI: Readonly<Record<DialogKind, string>> = \{([^}]*)\};/);
  assert.ok(body, 'expected the DIALOG_EMOJI object literal to be found as text');
  const pairs = Object.fromEntries(
    [...body[1].matchAll(/(\w+):\s*'([^']+)',?/g)].map((m) => [m[1], m[2]]),
  );
  assert.deepEqual(pairs, {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    question: '❓',
    destructive: '🛑',
    progress: '⏳',
  });
});

test('ALL_DIALOG_EMOJI is exported for tests that assert none reached a control', () => {
  const src = read(MODULE);
  assert.match(src, /^export const ALL_DIALOG_EMOJI: readonly string\[\] = Object\.values\(DIALOG_EMOJI\);$/m);
});

test('decoration is applied only to heading and body, never to a button, label or accessible name', () => {
  /* buildDialog is the whole enforcement mechanism: heading/body go through
   * decorateDialogText, and confirmLabel/cancelLabel/accessibleName go through the
   * identity function controlText instead. Recomputed structurally from the function
   * body rather than asserted from a comment. */
  const src = read(MODULE);
  const fn = src.match(/export function buildDialog\([\s\S]*?\n\}/);
  assert.ok(fn, 'expected to find the buildDialog function body');
  const body = fn[0];
  assert.match(body, /heading: decorateDialogText\(storage, kind, parts\.heading\),/);
  assert.match(body, /body: decorateDialogText\(storage, kind, parts\.body\),/);
  assert.match(body, /confirmLabel: controlText\(parts\.confirmLabel\),/);
  assert.match(body, /cancelLabel: controlText\(parts\.cancelLabel\),/);
  assert.match(body, /accessibleName: controlText\(parts\.accessibleName\),/);
});

test('decoration never doubles up on a re-render', () => {
  const src = read(MODULE);
  assert.match(src, /if \(text\.startsWith\(emoji\)\) return text;/);
});

test('the dlg_emoji control is declared off by default in the compiled design', () => {
  const design = read(DESIGN);
  assert.match(design, /ctl\('dlg_emoji','Show emojis in dialogs and message boxes','switch',false,/);
});

test('App.tsx imports only the setter, never the getter or the decoration functions', () => {
  const app = read(APP);
  const importLine = app.match(/^import \{ (\w+) \} from '\.\/dialog-emojis';$/m);
  assert.ok(importLine, 'expected a single-symbol import from ./dialog-emojis in App.tsx');
  assert.equal(importLine[1], 'setEmojisEnabled');
});

test('the dlg_emoji control is routed to setEmojisEnabled, and nothing else in dialog-emojis is called', () => {
  const app = read(APP);
  assert.match(
    app,
    /if \(control\?\.id === 'dlg_emoji' && typeof value === 'boolean'\) \{\n\s*setEmojisEnabled\(this\.durableStorage\.storage, value\);\n\s*\}/,
  );
  /* Anchored on the call parenthesis, not the bare name, so a comment mentioning
   * "buildDialog" elsewhere could never satisfy or defeat this assertion. */
  assert.doesNotMatch(app, /\bbuildDialog\(/, 'buildDialog(...) must never be called from App.tsx');
  assert.doesNotMatch(app, /\bdecorateDialogText\(/, 'decorateDialogText(...) must never be called from App.tsx');
  assert.doesNotMatch(app, /\bemojisEnabled\(/, 'emojisEnabled(...) must never be called from App.tsx');
});

test('every dialog the app actually shows goes through this.fire, none of them through buildDialog', () => {
  const app = read(APP);
  const fireCalls = [...app.matchAll(/this\.fire\(/g)];
  assert.ok(fireCalls.length > 30, `expected many this.fire(...) call sites, found ${fireCalls.length}`);
  assert.doesNotMatch(app, /buildDialog\(/, 'no dialog built in App.tsx is routed through buildDialog');
});
