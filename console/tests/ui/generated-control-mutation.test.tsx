import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ConsoleShell from '../../app/renderer/src/generated/console.tsx';

type MutableShell = InstanceType<typeof ConsoleShell> & {
  state: { values: Record<string, unknown> };
  setState(update: unknown, callback?: () => void): void;
  commit(control: unknown, value: unknown): void;
  toastWithId(id: string, message: string): void;
  fireWithId(id: string, title: string, message: string): void;
  onUserMutation(source: string): void;
  setVal(control: { id: string; label: string; kind: string; value: unknown }, value: unknown): void;
  buildCtl(control: { id: string; label: string; kind: string; value: unknown }): { toggle(): void };
};

const generatedUrl = new URL('../../app/renderer/src/generated/console.tsx', import.meta.url);
const control = { id: 'att_focus', label: 'Focus', kind: 'switch', value: false };

function buildShell(): { shell: MutableShell; mutations: string[]; commits: unknown[] } {
  const shell = new ConsoleShell({}) as MutableShell;
  const mutations: string[] = [];
  const commits: unknown[] = [];
  shell.setState = (update: unknown, callback?: () => void): void => {
    const patch = typeof update === 'function'
      ? (update as (prior: MutableShell['state']) => Partial<MutableShell['state']>)(shell.state)
      : update as Partial<MutableShell['state']>;
    shell.state = { ...shell.state, ...patch, values: { ...shell.state.values, ...(patch.values ?? {}) } };
    callback?.();
  };
  shell.commit = (_control, value) => { commits.push(value); };
  shell.toastWithId = () => undefined;
  shell.fireWithId = () => undefined;
  shell.onUserMutation = (source) => { mutations.push(source); };
  return { shell, mutations, commits };
}

function assertMutationSource(source: string): void {
  const normalized = source.replace(/\r\n/g, '\n');
  const callback = "this.onUserMutation('control:' + (c.id || 'unknown'));";
  assert.equal(normalized.split(callback).length - 1, 1, 'the generated shell must contain exactly one control-mutation callback');
  const setVal = normalized.slice(normalized.indexOf('  setVal = (c, v) => {'), normalized.indexOf('\n  simulate()', normalized.indexOf('  setVal = (c, v) => {')));
  assert.match(setVal, /const previous = this\.state\.values\[c\.id\] !== undefined \? this\.state\.values\[c\.id\] : c\.value;\n    if \(Object\.is\(previous, v\)\) return;/u, 'the generated value writer must reject an unchanged value before writing');
  assert.match(setVal, /this\.setState\(s => \(\{ values:Object\.assign\(\{\}, s\.values, \{ \[c\.id\]:v \}\) \}\), \(\) => \{\n      this\.onUserMutation\('control:' \+ \(c\.id \|\| 'unknown'\)\);\n    \}\);/u, 'the callback must occur only after React accepts the value update');
}

test('rendering a generated control is passive, while an accepted changed value notifies exactly once', () => {
  const { shell, mutations, commits } = buildShell();
  const view = shell.buildCtl(control);
  assert.deepEqual(mutations, [], 'constructing the control during render must not report a mutation');

  view.toggle();
  assert.deepEqual(mutations, ['control:att_focus']);
  assert.deepEqual(commits, [true]);
  assert.equal(shell.state.values.att_focus, true);

  shell.setVal(control, true);
  assert.deepEqual(mutations, ['control:att_focus'], 'an unchanged accepted value must not reset attention timing');
  assert.deepEqual(commits, [true], 'an unchanged value must not create a false local-history record');
});

test('the generated mutation callback has an exact-source Chut whose deliberate breaks turn red then restore green', async () => {
  const source = await readFile(generatedUrl, 'utf8');
  assertMutationSource(source);

  const callback = "this.onUserMutation('control:' + (c.id || 'unknown'));";
  assert.throws(() => assertMutationSource(source.replace(callback, 'this.onUserMutation(\'broken\');')));
  assert.throws(() => assertMutationSource(source.replace('if (Object.is(previous, v)) return;\n', '')));
  assertMutationSource(source);
});
