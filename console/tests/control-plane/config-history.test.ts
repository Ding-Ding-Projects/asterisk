import test from 'node:test';
import assert from 'node:assert/strict';
import { ConfigHistory, diffLines } from '../../control-plane/config-history.js';
import type { CommandRequest, CommandResult, ProcessExecutor } from '../../control-plane/executor.js';

class FakeExecutor implements ProcessExecutor {
  readonly calls: CommandRequest[] = [];
  constructor(private readonly script: (request: CommandRequest) => Partial<CommandResult>) {}
  async execute(request: CommandRequest): Promise<CommandResult> {
    this.calls.push(request);
    return { status: 'succeeded', exitCode: 0, stdout: '', stderr: '', durationMs: 1, ...this.script(request) };
  }
}

const PJSIP = '/etc/asterisk/pjsip.conf';
const QUEUES = '/etc/asterisk/queues.conf';
const DIRECTORY = '/etc/asterisk';
const verb = (r: CommandRequest) => r.args[3];
const target = (r: CommandRequest) => r.args[r.args.length - 1];

const build = (script: (request: CommandRequest) => Partial<CommandResult>) => {
  const executor = new FakeExecutor(script);
  const history = new ConfigHistory({ executor, distribution: 'ding-pbx-console' });
  return { executor, history };
};

const LISTING = [
  'pjsip.conf.backup-2026-08-20T01-00-00-000Z',
  'pjsip.conf.backup-2026-08-23T01-19-03-627Z',
  'queues.conf.backup-2026-08-21T09-30-15-100Z',
  'pjsip.conf.staged',
].join('\n');

function withListing(script?: (request: CommandRequest) => Partial<CommandResult> | undefined) {
  return (r: CommandRequest): Partial<CommandResult> => {
    const v = verb(r);
    if (v === 'ls') return { stdout: LISTING };
    if (v === 'stat') return { stdout: '42' };
    return script?.(r) ?? {};
  };
}

test('list returns backups for one resource only, newest first', async () => {
  const { history } = build(withListing());
  const entries = await history.list(PJSIP);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].takenAt, '2026-08-23T01:19:03.627Z');
  assert.equal(entries[1].takenAt, '2026-08-20T01:00:00.000Z');
  assert.ok(entries.every((e) => e.resource === PJSIP));
  assert.equal(entries[0].handle, `${DIRECTORY}/pjsip.conf.backup-2026-08-23T01-19-03-627Z`);
  assert.equal(entries[0].bytes, 42);
});

test('list with no resource covers every configurable resource, newest first overall', async () => {
  const { history } = build(withListing());
  const entries = await history.list();
  assert.equal(entries.length, 3);
  assert.equal(entries[0].handle, `${DIRECTORY}/pjsip.conf.backup-2026-08-23T01-19-03-627Z`);
  const resources = new Set(entries.map((e) => e.resource));
  assert.deepEqual([...resources].sort(), [PJSIP, QUEUES].sort());
});

test('an empty or absent backup directory is an empty list, not an error', async () => {
  const { history } = build((r) => (verb(r) === 'ls' ? { status: 'failed', stderr: 'no such directory' } : {}));
  const entries = await history.list(PJSIP);
  assert.deepEqual(entries, []);
});

test('list refuses a non-allowlisted resource before running any command', async () => {
  const { executor, history } = build(withListing());
  await assert.rejects(() => history.list('/etc/asterisk/sip.conf'), /not a configurable resource/u);
  assert.equal(executor.calls.length, 0);
});

test('an unparseable timestamp still yields an entry, with takenAt undefined', async () => {
  const { history } = build((r) => {
    const v = verb(r);
    if (v === 'ls') return { stdout: 'pjsip.conf.backup-not-a-real-stamp' };
    if (v === 'stat') return { stdout: '7' };
    return {};
  });
  const entries = await history.list(PJSIP);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].takenAt, undefined);
  assert.equal(entries[0].bytes, 7);
});

test('restore copies a listed backup over the live resource and verifies by reading it back', async () => {
  const handle = `${DIRECTORY}/pjsip.conf.backup-2026-08-23T01-19-03-627Z`;
  let live = 'old content';
  const { executor, history } = build(withListing((r) => {
    const v = verb(r);
    if (v === 'cat' && target(r) === handle) return { stdout: 'backup content' };
    if (v === 'cp') { live = 'backup content'; return {}; }
    if (v === 'cat' && target(r) === PJSIP) return { stdout: live };
    return {};
  }));
  const result = await history.restore(handle);
  assert.equal(result.ok, true);
  assert.equal(result.resource, PJSIP);
  const cpCall = executor.calls.find((c) => verb(c) === 'cp');
  assert.ok(cpCall);
  assert.deepEqual([...cpCall!.args].slice(3), ['cp', handle, PJSIP]);
});

test('restore reports a verification mismatch as failure rather than success', async () => {
  const handle = `${DIRECTORY}/pjsip.conf.backup-2026-08-23T01-19-03-627Z`;
  const { history } = build(withListing((r) => {
    const v = verb(r);
    if (v === 'cat' && target(r) === handle) return { stdout: 'backup content' };
    if (v === 'cp') return {};
    if (v === 'cat' && target(r) === PJSIP) return { stdout: 'something else entirely' };
    return {};
  }));
  const result = await history.restore(handle);
  assert.equal(result.ok, false);
  assert.match(result.detail, /does not match/u);
});

test('restore refuses a handle outside the allowlist, e.g. /etc/passwd', async () => {
  const { executor, history } = build(withListing());
  await assert.rejects(() => history.restore('/etc/passwd'), /not a configurable resource/u);
  assert.equal(executor.calls.length, 0);
});

test('restore refuses a backup for a resource that is not itself allowlisted (sip.conf)', async () => {
  const { executor, history } = build(withListing());
  await assert.rejects(
    () => history.restore('/etc/asterisk/sip.conf.backup-2026-08-23T01-19-03-627Z'),
    /not a configurable resource/u,
  );
  assert.equal(executor.calls.length, 0);
});

test('prune keeps the newest N backups for a resource and removes the rest', async () => {
  const removed: string[] = [];
  const { history } = build((r) => {
    const v = verb(r);
    if (v === 'ls') return { stdout: LISTING };
    if (v === 'stat') return { stdout: '10' };
    if (v === 'rm') { removed.push(target(r)); return {}; }
    return {};
  });
  const result = await history.prune(PJSIP, 1);
  assert.equal(result.kept, 1);
  assert.equal(result.removed, 1);
  assert.deepEqual(removed, [`${DIRECTORY}/pjsip.conf.backup-2026-08-20T01-00-00-000Z`]);
});

test('prune refuses keep=0 and keep<0, since that would delete every recovery point', async () => {
  const { executor, history } = build(withListing());
  await assert.rejects(() => history.prune(PJSIP, 0), /positive integer/u);
  await assert.rejects(() => history.prune(PJSIP, -1), /positive integer/u);
  assert.equal(executor.calls.length, 0);
});

test('prune refuses a non-allowlisted resource before running any command', async () => {
  const { executor, history } = build(withListing());
  await assert.rejects(() => history.prune('/etc/asterisk/sip.conf', 1), /not a configurable resource/u);
  assert.equal(executor.calls.length, 0);
});

test('every command is wsl.exe with no shell metacharacters in any argument', async () => {
  const { executor, history } = build(withListing());
  await history.list();
  await history.restore(`${DIRECTORY}/pjsip.conf.backup-2026-08-23T01-19-03-627Z`);
  await history.prune(QUEUES, 1);
  assert.ok(executor.calls.length > 0);
  const metacharacters = /[;&|`$<>\n]/u;
  for (const call of executor.calls) {
    assert.equal(call.executable, 'wsl.exe');
    for (const arg of call.args) {
      assert.doesNotMatch(arg, metacharacters, `argument "${arg}" contains a shell metacharacter`);
    }
  }
});

test('list for one resource never returns an entry for another resource', async () => {
  const { history } = build(withListing());
  const entries = await history.list(QUEUES);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].resource, QUEUES);
});

// ---------------------------------------------------------------- diffLines

test('diffLines reports no lines for two identical inputs', () => {
  assert.deepEqual(diffLines(['a', 'b', 'c'], ['a', 'b', 'c']), [
    { text: 'a', sign: ' ' }, { text: 'b', sign: ' ' }, { text: 'c', sign: ' ' },
  ]);
});

test('diffLines reports every line added against an empty original', () => {
  assert.deepEqual(diffLines([], ['a', 'b']), [{ text: 'a', sign: '+' }, { text: 'b', sign: '+' }]);
});

test('diffLines reports every line removed against an empty result', () => {
  assert.deepEqual(diffLines(['a', 'b'], []), [{ text: 'a', sign: '-' }, { text: 'b', sign: '-' }]);
});

test('diffLines finds a single changed line inside unchanged context on both sides', () => {
  const result = diffLines(
    ['bindaddr=0.0.0.0', 'bindport=5060', 'context=from-internal'],
    ['bindaddr=0.0.0.0', 'bindport=5061', 'context=from-internal'],
  );
  assert.deepEqual(result, [
    { text: 'bindaddr=0.0.0.0', sign: ' ' },
    { text: 'bindport=5060', sign: '-' },
    { text: 'bindport=5061', sign: '+' },
    { text: 'context=from-internal', sign: ' ' },
  ]);
});

test('diffLines round-trips: applying "-" removals and "+" additions to the before side reconstructs the after side', () => {
  const before = ['one', 'two', 'three', 'four'];
  const after = ['zero', 'one', 'three', 'five'];
  const result = diffLines(before, after);
  const reconstructed = result.filter((l) => l.sign !== '-').map((l) => l.text);
  assert.deepEqual(reconstructed, after);
  const removedFromBefore = result.filter((l) => l.sign !== '+').map((l) => l.text);
  assert.deepEqual(removedFromBefore, before);
});

// ---------------------------------------------------------------- diff

test('diff reports identical when the backup and the live resource match byte for byte', async () => {
  const handle = `${DIRECTORY}/pjsip.conf.backup-2026-08-23T01-19-03-627Z`;
  const { history } = build(withListing((r) => {
    const v = verb(r);
    if (v === 'cat') return { stdout: 'same content\n' };
    if (v === 'test') return {};
    return {};
  }));
  const result = await history.diff(handle);
  assert.equal(result.identical, true);
  assert.equal(result.added, 0);
  assert.equal(result.removed, 0);
  assert.deepEqual(result.lines, []);
  assert.equal(result.resource, PJSIP);
});

test('diff reports the aligned line-by-line difference when the two sides differ', async () => {
  const handle = `${DIRECTORY}/pjsip.conf.backup-2026-08-23T01-19-03-627Z`;
  const { history } = build(withListing((r) => {
    const v = verb(r);
    if (v === 'cat' && target(r) === handle) return { stdout: 'bindport=5060\n' };
    if (v === 'cat' && target(r) === PJSIP) return { stdout: 'bindport=5061\n' };
    if (v === 'test') return {};
    return {};
  }));
  const result = await history.diff(handle);
  assert.equal(result.identical, false);
  assert.equal(result.currentExists, true);
  assert.equal(result.added, 1);
  assert.equal(result.removed, 1);
  assert.deepEqual(result.lines, [
    { text: 'bindport=5060', sign: '-' },
    { text: 'bindport=5061', sign: '+' },
  ]);
});

test('diff against a resource the target no longer has reports currentExists false and every backup line removed', async () => {
  const handle = `${DIRECTORY}/pjsip.conf.backup-2026-08-23T01-19-03-627Z`;
  const { history } = build(withListing((r) => {
    const v = verb(r);
    if (v === 'cat' && target(r) === handle) return { stdout: 'bindport=5060\n' };
    if (v === 'test' && target(r) === PJSIP) return { status: 'failed' };
    return {};
  }));
  const result = await history.diff(handle);
  assert.equal(result.currentExists, false);
  assert.equal(result.identical, false);
  assert.deepEqual(result.lines, [{ text: 'bindport=5060', sign: '-' }]);
});

test('diff refuses a handle outside the allowlist', async () => {
  const { executor, history } = build(withListing());
  await assert.rejects(() => history.diff('/etc/passwd'), /not a configurable resource/u);
  assert.equal(executor.calls.length, 0);
});

test('diff refuses a handle not currently listed on the target', async () => {
  const { history } = build(withListing());
  await assert.rejects(
    () => history.diff(`${DIRECTORY}/pjsip.conf.backup-1999-01-01T00-00-00-000Z`),
    /not a recovery point currently listed/u,
  );
});
