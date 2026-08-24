/**
 * External editor handoff.
 *
 * Two groups matter most. The launch plan, because an editor path with a space in it is
 * the common case and one with a semicolon in it is a command injection -- so the target
 * is never interpolated into a command line. And the copy, because an optional
 * integration described as a missing prerequisite tells somebody their app is broken
 * when it is not.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EDITOR_SETTING, KNOWN_EDITORS, VS_CODE, chooseEditor, chosenEditor, clearEditorChoice,
  detectEditors, isRefusal, planLaunch, validateCustomEditor,
  type DetectedEditor, type EditorStorage, type Probe,
} from '../../app/renderer/src/external-editor.ts';
import { editorMutationOutcome } from '../../app/renderer/src/external-editor-status.ts';

const memory = (): EditorStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
};

const probeFor = (...present: string[]): Probe => (exe) => present.includes(exe);
const vscode = (): DetectedEditor => ({ definition: VS_CODE, resolved: 'code' });

/* --- detection ------------------------------------------------------------------ */

test('an editor on PATH is found', () => {
  const found = detectEditors(probeFor('code'));
  assert.deepEqual(found.map((f) => f.definition.id), ['vscode']);
  assert.equal(found[0].resolved, 'code');
});

test('PATH wins over a guessed absolute location', () => {
  /* An install the shell already knows about is the one the person uses. */
  const found = detectEditors(probeFor('code', VS_CODE.fallbackPaths[0]));
  assert.equal(found[0].resolved, 'code');
});

test('an absolute fallback is used when the command is not on PATH', () => {
  const found = detectEditors(probeFor(VS_CODE.fallbackPaths[1]));
  assert.equal(found[0].resolved, VS_CODE.fallbackPaths[1]);
});

test('fallbacks are tried in order', () => {
  const found = detectEditors(probeFor(VS_CODE.fallbackPaths[1], VS_CODE.fallbackPaths[2]));
  assert.equal(found[0].resolved, VS_CODE.fallbackPaths[1]);
});

test('nothing installed finds nothing, rather than guessing', () => {
  assert.deepEqual(detectEditors(probeFor()), []);
});

test('several installed editors are all offered', () => {
  const found = detectEditors(probeFor('code', 'subl'));
  assert.deepEqual(found.map((f) => f.definition.id).sort(), ['sublime', 'vscode']);
});

test('VS Code is a first-class entry rather than a row in a list', () => {
  /* Anything exportable has to be openable in it directly, so it is exported by name. */
  assert.equal(VS_CODE.id, 'vscode');
  assert.ok(KNOWN_EDITORS.includes(VS_CODE));
  assert.ok(VS_CODE.downloadUrl.startsWith('https://'));
});

test('opening a folder in VS Code opens it as a workspace root', () => {
  /* A file tree is the entire reason to hand a folder to an editor. */
  assert.ok(VS_CODE.folderArgs.length > 0, 'a folder would open as a bare file with no context');
});

/* --- the stored choice ------------------------------------------------------------ */

test('with nothing chosen there is no editor', () => {
  assert.equal(chosenEditor(memory(), [vscode()]), undefined);
  assert.equal(chosenEditor(undefined, [vscode()]), undefined);
});

test('a chosen editor persists and is resolved back', () => {
  const storage = memory();
  chooseEditor(storage, 'vscode');
  assert.equal(chosenEditor(storage, [vscode()])?.definition.id, 'vscode');
  assert.equal(storage.map.get(EDITOR_SETTING), 'vscode');
});

test('an uninstalled choice is not silently replaced with another editor', () => {
  /* Launching something the person did not choose is worse than reporting the gap. */
  const storage = memory();
  chooseEditor(storage, 'sublime');
  assert.equal(chosenEditor(storage, [vscode()]), undefined);
});

test('the choice can be cleared', () => {
  const storage = memory();
  chooseEditor(storage, 'vscode');
  clearEditorChoice(storage);
  assert.equal(chosenEditor(storage, [vscode()]), undefined);
});

/* --- the launch plan --------------------------------------------------------------- */

test('a file launch passes the path as its own argument', () => {
  const plan = planLaunch(vscode(), { kind: 'file', path: 'C:\\Users\\a b\\pjsip.conf' });
  assert.ok(!isRefusal(plan));
  assert.equal(plan.executable, 'code');
  assert.deepEqual(plan.args, ['C:\\Users\\a b\\pjsip.conf']);
});

test('a folder launch carries the workspace-root arguments', () => {
  const plan = planLaunch(vscode(), { kind: 'folder', path: 'C:\\exports' });
  assert.ok(!isRefusal(plan));
  assert.deepEqual(plan.args, [...VS_CODE.folderArgs, 'C:\\exports']);
});

test('a path with a space stays one argument rather than being split', () => {
  /* The common case, and the one a shell would break. */
  const plan = planLaunch(vscode(), { kind: 'file', path: 'C:\\Program Files\\x\\a.conf' });
  assert.ok(!isRefusal(plan));
  assert.equal(plan.args.at(-1), 'C:\\Program Files\\x\\a.conf');
  assert.equal(plan.args.filter((a) => a.includes('Program')).length, 1);
});

test('a hostile path is an argument, never part of a command line', () => {
  /* The plan has no command string for anything to be interpolated into, which is what
   * makes this safe rather than escaped. */
  const nasty = 'C:\\tmp\\a.conf" & calc.exe & "';
  const plan = planLaunch(vscode(), { kind: 'file', path: nasty });
  assert.ok(!isRefusal(plan));
  assert.equal(plan.args.at(-1), nasty);
  assert.ok(!('commandLine' in plan), 'a joined command line appeared, which a shell would parse');
  for (const arg of plan.args.slice(0, -1)) {
    assert.ok(!arg.includes('calc.exe'), 'the target leaked into another argument');
  }
});

test('an empty target is refused rather than opening the editor on nothing', () => {
  const plan = planLaunch(vscode(), { kind: 'file', path: '   ' });
  assert.ok(isRefusal(plan));
});

/* --- no editor: a gap, not a broken app --------------------------------------------- */

test('with no editor the refusal says the console works fully without one', () => {
  /* An optional integration described as a missing prerequisite tells somebody their app
   * is broken when it is not. */
  const plan = planLaunch(undefined, { kind: 'folder', path: 'C:\\exports' });
  assert.ok(isRefusal(plan));
  assert.match(plan.message, /works fully without one/u);
  assert.ok(!/required|must install|cannot continue/iu.test(plan.message));
});

test('the refusal names the target and offers somewhere to get an editor', () => {
  const plan = planLaunch(undefined, { kind: 'folder', path: 'C:\\exports' });
  assert.ok(isRefusal(plan));
  assert.ok(plan.message.includes('C:\\exports'));
  assert.equal(plan.downloadUrl, VS_CODE.downloadUrl);
});

/* --- a hand-added editor ------------------------------------------------------------- */

test('a plain executable is accepted', () => {
  assert.deepEqual(validateCustomEditor({ name: 'My editor', executable: 'C:\\tools\\ed.exe' }), []);
});

test('a name or path left empty is refused', () => {
  assert.equal(validateCustomEditor({ name: '', executable: 'C:\\ed.exe' }).length, 1);
  assert.equal(validateCustomEditor({ name: 'x', executable: '  ' }).length, 1);
});

test('a command rather than a program is refused', () => {
  /* This is how a settings text box becomes a way to run an arbitrary command. */
  for (const bad of ['ed.exe & calc', 'ed.exe | more', 'ed.exe; calc', 'ed.exe\ncalc', 'ed.exe > out']) {
    assert.ok(validateCustomEditor({ name: 'x', executable: bad }).length > 0, `"${bad}" was accepted`);
  }
});

test('a quoted path is refused with an explanation rather than silently unquoted', () => {
  const problems = validateCustomEditor({ name: 'x', executable: '"C:\\Program Files\\ed.exe"' });
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /Leave the quotes off/u);
});

test('a failed returned mutation status cannot produce a success notice', () => {
  const outcome = editorMutationOutcome({
    operation: { operationId: 'op-failed', kind: 'persist', state: 'failed', progress: 1, message: 'EEXIST' },
  }, 'Editor settings reset', 'Editor settings not reset');
  assert.deepEqual(outcome, { kind: 'failure', titleKey: 'Editor settings not reset', detail: 'EEXIST' });
});

test('only a completed returned mutation status produces a success notice', () => {
  const outcome = editorMutationOutcome({
    operation: { operationId: 'op-complete', kind: 'persist', state: 'completed', progress: 1, message: 'done' },
  }, 'Editor settings reset', 'Editor settings not reset');
  assert.deepEqual(outcome, { kind: 'success', titleKey: 'Editor settings reset' });
});

test('cancelled or missing returned mutation status stays out of the success path', () => {
  const cancelled = editorMutationOutcome({
    operation: { operationId: 'op-cancelled', kind: 'persist', state: 'cancelled', progress: 1, message: 'cancelled' },
  }, 'Editor settings reset', 'Editor settings not reset');
  const missing = editorMutationOutcome({}, 'Editor settings reset', 'Editor settings not reset');
  assert.equal(cancelled.kind, 'failure');
  assert.equal(missing.kind, 'failure');
});
