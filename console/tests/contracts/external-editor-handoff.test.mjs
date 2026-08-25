/**
 * Contract: external-editor detection, validation and launch-plan building work the way the
 * module claims, and the running console actually reaches the "detect" and "launch" halves
 * of it -- which it does not.
 *
 * `external-editor.ts` is pure and self-contained, so this plain `.mjs` file `import()`s it
 * directly through Node's built-in TypeScript type-stripping and exercises the real
 * `detectEditors` / `validateCustomEditor` / `planLaunch` functions rather than a
 * reimplementation of the shell-injection guards that could quietly drift from the original.
 *
 * The wiring section below is where this feature falls apart: the design's own info text on
 * `ed_choice` claims "Only editors actually installed on this machine are offered", and
 * `planLaunch`'s refusal text claims "This console will open it for you" -- and neither is
 * true of the shipped build. `detectEditors` and `planLaunch` are never called anywhere
 * App.tsx can reach, and `ed_choice`'s option list is a fixed four-item array, not the
 * output of detection.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const editor = await import('../../app/renderer/src/external-editor.ts');

/* --- detectEditors: PATH first, then the absolute fallbacks in order ------------------ */

test('detectEditors finds a command on PATH before trying any fallback path', () => {
  const probe = (candidate) => candidate === 'code';
  const found = editor.detectEditors(probe, [editor.VS_CODE]);
  assert.equal(found.length, 1);
  assert.equal(found[0].resolved, 'code');
});

test('detectEditors falls back to the first working absolute path when the bare command is not on PATH', () => {
  const probe = (candidate) => candidate === editor.VS_CODE.fallbackPaths[1];
  const found = editor.detectEditors(probe, [editor.VS_CODE]);
  assert.equal(found.length, 1);
  assert.equal(found[0].resolved, editor.VS_CODE.fallbackPaths[1]);
});

test('detectEditors omits an editor for which nothing at all answers the probe', () => {
  const found = editor.detectEditors(() => false, editor.KNOWN_EDITORS);
  assert.deepEqual(found, []);
});

test('VS_CODE folder args open a workspace root rather than a bare file', () => {
  assert.deepEqual(editor.VS_CODE.folderArgs, ['--new-window']);
});

/* --- validateCustomEditor: refuses anything that is not a bare executable -------------- */

test('validateCustomEditor accepts a plain path and refuses a shell operator, a quoted path, and an empty field', () => {
  assert.deepEqual(editor.validateCustomEditor({ name: 'Mine', executable: 'C:\\tools\\editor.exe' }), []);
  assert.equal(editor.validateCustomEditor({ name: '', executable: 'C:\\tools\\editor.exe' }).length, 1);
  assert.equal(editor.validateCustomEditor({ name: 'Mine', executable: '' }).length, 1);
  for (const op of ['a & b', 'a | b', 'a ; b', 'a < b', 'a > b', 'a ^ b', 'a`b']) {
    const problems = editor.validateCustomEditor({ name: 'Mine', executable: op });
    assert.ok(problems.length > 0, `"${op}" should have been refused as command-injection-shaped`);
  }
  assert.ok(editor.validateCustomEditor({ name: 'Mine', executable: '"C:\\tools\\editor.exe"' }).length > 0,
    'a quoted path should be refused -- the path is passed directly and does not need quotes');
});

/* --- chosenEditor: an uninstalled editor is never silently replaced -------------------- */

test('chosenEditor returns undefined for a stored id no longer present in "available", rather than substituting another editor', () => {
  const storage = { getItem: () => 'notepadpp' };
  assert.equal(editor.chosenEditor(storage, []), undefined);
});

test('chosenEditor resolves the hand-added editor by its own executable, not through detectEditors', () => {
  const map = new Map();
  map.set(editor.EDITOR_SETTING, editor.CUSTOM_EDITOR_ID);
  map.set(editor.CUSTOM_EDITOR_SETTING, JSON.stringify({ name: 'Mine', executable: 'C:\\tools\\editor.exe' }));
  const storage = { getItem: (k) => map.get(k) };
  const resolved = editor.chosenEditor(storage, []);
  assert.equal(resolved?.resolved, 'C:\\tools\\editor.exe');
});

/* --- planLaunch: never through a shell, target always the final separate argument ------ */

test('planLaunch refuses with no editor set up, offering the fallback\'s download URL', () => {
  const refusal = editor.planLaunch(undefined, { kind: 'file', path: 'a.conf' });
  assert.ok(editor.isRefusal(refusal));
  assert.equal(refusal.downloadUrl, editor.VS_CODE.downloadUrl);
});

test('planLaunch builds a folder open with the editor\'s folder args, and a file open with its file args, target always last', () => {
  const detected = { definition: editor.VS_CODE, resolved: 'code' };
  const folder = editor.planLaunch(detected, { kind: 'folder', path: 'C:\\export\\project' });
  assert.ok(!editor.isRefusal(folder));
  assert.deepEqual(folder.args, ['--new-window', 'C:\\export\\project']);
  const file = editor.planLaunch(detected, { kind: 'file', path: 'a.conf' });
  assert.deepEqual(file.args, ['a.conf']);
});

test('planLaunch refuses an empty target path rather than launching the editor with nothing to open', () => {
  const detected = { definition: editor.VS_CODE, resolved: 'code' };
  const refusal = editor.planLaunch(detected, { kind: 'file', path: '   ' });
  assert.ok(editor.isRefusal(refusal));
});

/* --- wiring: what App.tsx actually does with all of the above ------------------------- */

const app = read('app/renderer/src/App.tsx');
const generated = read('app/renderer/src/generated/console.tsx');

test('App picks the chosen editor by matching against the fixed KNOWN_EDITORS list, not against detection', () => {
  assert.match(app, /control\?\.id === 'ed_choice' && typeof value === 'string'/);
  assert.match(app, /const editor = KNOWN_EDITORS\.find\(\(candidate\) => candidate\.name === value\);/);
  assert.match(app, /if \(editor\) chooseEditor\(this\.durableStorage\.storage, editor\.id\);/);
});

test('a hand-added editor is validated and saved through the real module functions', () => {
  const start = app.indexOf("if (control?.id === 'ed_custom_name' || control?.id === 'ed_custom_path') {");
  assert.ok(start > 0);
  const body = app.slice(start, app.indexOf('\n    }', start));
  assert.match(body, /if \(validateCustomEditor\(candidate\)\.length === 0\) \{/);
  assert.match(body, /saveCustomEditor\(this\.durableStorage\.storage, candidate\);/);
});

test('the design offers exactly the four fixed editor names, never a dynamically detected list', () => {
  assert.match(generated,
    /ctl\('ed_choice','Editor','select','Visual Studio Code',\{ options:\['Visual Studio Code','Notepad\+\+','Sublime Text','Notepad'\],/);
});

/* --- PIN: detection and launching are never reached by the running app ---------------- */

test('PIN: detectEditors is never called anywhere App.tsx, the generated shell or the control plane can reach', () => {
  /* Only defined and exercised inside external-editor.ts and its own test file. The design's
   * ed_choice info text -- "Only editors actually installed on this machine are offered" --
   * is therefore false of the shipped build: the select's options are the fixed four names
   * above, not the output of detectEditors against this machine. */
  assert.doesNotMatch(app, /detectEditors\(/,
    'App now calls detectEditors -- the "options are hardcoded, not detected" gap this pins may be fixed; update the test and the report');
  assert.doesNotMatch(generated, /detectEditors\(/);
  const controlPlaneDispatch = read('control-plane/dispatch.ts');
  assert.doesNotMatch(controlPlaneDispatch, /detectEditors\(/);
});

test('PIN: planLaunch is never called anywhere -- there is no "open in editor" action in this build at all', () => {
  /* chosenEditor is also unreached; App only ever writes an editor id/name to storage and
   * reads it back for display. Nothing in this console ever spawns the chosen editor on a
   * real file or folder, despite planLaunch existing specifically to build that launch. */
  assert.doesNotMatch(app, /planLaunch\(/,
    'App now calls planLaunch -- the "no editor ever actually launches" gap this pins may be fixed; update the test and the report');
  assert.doesNotMatch(generated, /planLaunch\(/);
  /* Inverted: this pinned that the stored choice was never resolved against real
   * detection, so the picker offered a hard-coded list and nothing checked whether the
   * chosen editor was actually installed. It fired when that landed. */
  assert.match(app, /chosenEditor\(/,
    'chosenEditor is called nowhere again -- the stored choice is not resolved against detection');
});

test('PIN: the design has no "open" action anywhere in the External editor group -- only a picker, name/path fields, and a forget switch', () => {
  const at = generated.indexOf("title:'External editor'");
  assert.ok(at > 0, 'the External editor group has been renamed or removed -- update this pin');
  /* Bounded to the next group's own "{ title:'" rather than the first ']', because
   * ed_choice's own option list (options:[...]) closes with ']' long before the group
   * itself does -- a plain indexOf(']') here matches inside that array and truncates the
   * group to just the one control. */
  const next = generated.indexOf("{ title:'", at + 10);
  const group = generated.slice(at, next);
  const controlIds = [...group.matchAll(/ctl\('([a-z0-9_]+)'/g)].map((m) => m[1]);
  assert.deepEqual(controlIds, ['ed_choice', 'ed_custom_name', 'ed_custom_path', 'ed_clear'],
    'an open/launch control was added to the External editor group -- this pin is now stale and should be replaced with real coverage of it');
});
