import test from 'node:test';
import assert from 'node:assert/strict';
import { AgiLibrary, usableAgiDirectory, DEFAULT_AGI_DIRECTORY } from '../../control-plane/agi-library.js';
import type { CommandRequest, CommandResult, ProcessExecutor } from '../../control-plane/executor.js';

class FakeExecutor implements ProcessExecutor {
  readonly calls: CommandRequest[] = [];
  constructor(private readonly script: (request: CommandRequest) => Partial<CommandResult>) {}
  async execute(request: CommandRequest): Promise<CommandResult> {
    this.calls.push(request);
    return { status: 'succeeded', exitCode: 0, stdout: '', stderr: '', durationMs: 1, ...this.script(request) };
  }
}

const verb = (r: CommandRequest) => r.args[3];
const target = (r: CommandRequest) => r.args[r.args.length - 1];

function build(script: (request: CommandRequest) => Partial<CommandResult>) {
  const executor = new FakeExecutor(script);
  const library = new AgiLibrary({ executor, distribution: 'ding-pbx-console' });
  return { executor, library };
}

// ---------------------------------------------------------------- usableAgiDirectory

test('usableAgiDirectory falls back to the shipped default for empty/undefined input', () => {
  assert.equal(usableAgiDirectory(undefined), DEFAULT_AGI_DIRECTORY);
  assert.equal(usableAgiDirectory(''), DEFAULT_AGI_DIRECTORY);
  assert.equal(usableAgiDirectory('   '), DEFAULT_AGI_DIRECTORY);
});

test('usableAgiDirectory accepts an absolute path as-is', () => {
  assert.equal(usableAgiDirectory('/srv/agi-scripts'), '/srv/agi-scripts');
});

test('usableAgiDirectory refuses a relative path', () => {
  assert.equal(usableAgiDirectory('agi-bin'), undefined);
});

test('usableAgiDirectory refuses a path with a .. segment', () => {
  assert.equal(usableAgiDirectory('/var/lib/asterisk/../../etc'), undefined);
});

test('usableAgiDirectory refuses a path containing a NUL byte', () => {
  assert.equal(usableAgiDirectory('/var/lib\0/asterisk'), undefined);
});

// ---------------------------------------------------------------- list

test('list reports each regular file with its size and executable bit', async () => {
  const { library } = build((r) => {
    const v = verb(r);
    if (v === 'ls') return { stdout: 'lookup.agi\nREADME.txt\n' };
    if (v === 'stat' && target(r).endsWith('lookup.agi') && r.args[4] === '-c' && r.args[5] === '%F') return { stdout: 'regular file\n' };
    if (v === 'stat' && target(r).endsWith('lookup.agi') && r.args[5] === '%s') return { stdout: '512\n' };
    if (v === 'stat' && target(r).endsWith('README.txt') && r.args[5] === '%F') return { stdout: 'regular file\n' };
    if (v === 'stat' && target(r).endsWith('README.txt') && r.args[5] === '%s') return { stdout: '30\n' };
    if (v === 'test' && target(r).endsWith('lookup.agi')) return { status: 'succeeded' };
    if (v === 'test' && target(r).endsWith('README.txt')) return { status: 'failed' };
    return {};
  });
  const files = await library.list('/var/lib/asterisk/agi-bin');
  const byName = (name: string) => files.find((f) => f.name === name);
  assert.deepEqual(byName('lookup.agi'), { name: 'lookup.agi', bytes: 512, executable: true });
  assert.deepEqual(byName('README.txt'), { name: 'README.txt', bytes: 30, executable: false });
  assert.equal(files.length, 2);
});

test('list skips a directory entry (a subdirectory is not a script)', async () => {
  const { library } = build((r) => {
    const v = verb(r);
    if (v === 'ls') return { stdout: 'archive\nlookup.agi\n' };
    if (v === 'stat' && target(r).endsWith('archive') && r.args[5] === '%F') return { stdout: 'directory\n' };
    if (v === 'stat' && target(r).endsWith('lookup.agi') && r.args[5] === '%F') return { stdout: 'regular file\n' };
    if (v === 'stat' && target(r).endsWith('lookup.agi') && r.args[5] === '%s') return { stdout: '10\n' };
    if (v === 'test') return { status: 'succeeded' };
    return {};
  });
  const files = await library.list('/var/lib/asterisk/agi-bin');
  assert.equal(files.length, 1);
  assert.equal(files[0].name, 'lookup.agi');
});

test('list returns empty for a directory that does not exist or cannot be read, not an error', async () => {
  const { library } = build((r) => (verb(r) === 'ls' ? { status: 'failed', stderr: 'No such file or directory' } : {}));
  const files = await library.list('/var/lib/asterisk/agi-bin');
  assert.deepEqual(files, []);
});

test('list refuses a relative directory before running any command', async () => {
  const { executor, library } = build(() => ({}));
  const files = await library.list('agi-bin');
  assert.deepEqual(files, []);
  assert.equal(executor.calls.length, 0);
});

test('list falls back to the shipped default directory when none is given', async () => {
  const { executor, library } = build((r) => (verb(r) === 'ls' ? { stdout: '' } : {}));
  await library.list(undefined);
  const lsCall = executor.calls.find((c) => verb(c) === 'ls');
  assert.ok(lsCall);
  assert.equal(target(lsCall!), DEFAULT_AGI_DIRECTORY);
});

test('every command is wsl.exe with no shell metacharacters in any argument', async () => {
  const { executor, library } = build((r) => {
    const v = verb(r);
    if (v === 'ls') return { stdout: 'lookup.agi\n' };
    if (v === 'stat' && r.args[5] === '%F') return { stdout: 'regular file\n' };
    if (v === 'stat' && r.args[5] === '%s') return { stdout: '5\n' };
    return {};
  });
  await library.list('/var/lib/asterisk/agi-bin');
  assert.ok(executor.calls.length > 0);
  const metacharacters = /[;&|`$<>\n]/u;
  for (const call of executor.calls) {
    assert.equal(call.executable, 'wsl.exe');
    for (const arg of call.args) {
      assert.doesNotMatch(arg, metacharacters, `argument "${arg}" contains a shell metacharacter`);
    }
  }
});
