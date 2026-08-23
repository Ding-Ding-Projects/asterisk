import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ConfigBackup,
  type Snapshot,
} from '../../control-plane/config-backup.js';
import { CONFIGURABLE_RESOURCES } from '../../control-plane/wsl-config-transport.js';
import type { CommandRequest, CommandResult, ProcessExecutor } from '../../control-plane/executor.js';

const PJSIP = '/etc/asterisk/pjsip.conf';
const QUEUES = '/etc/asterisk/queues.conf';
const EXTENSIONS = '/etc/asterisk/extensions.conf';

class FakeExecutor implements ProcessExecutor {
  readonly calls: CommandRequest[] = [];
  constructor(private readonly files: Map<string, string>) {}

  async execute(request: CommandRequest): Promise<CommandResult> {
    this.calls.push(request);
    const args = request.args;
    const verb = args[3];
    const target = args[4];
    const base: CommandResult = { status: 'succeeded', exitCode: 0, stdout: '', stderr: '', durationMs: 1 };

    if (verb === 'test' && args[4] === '-e') {
      const path = args[5];
      return this.files.has(path) ? base : { ...base, status: 'failed', exitCode: 1 };
    }
    if (verb === 'cat') {
      const path = target;
      if (!this.files.has(path)) return { ...base, status: 'failed', exitCode: 1, stderr: 'no such file' };
      return { ...base, stdout: this.files.get(path)! };
    }
    if (verb === 'tee') {
      const path = target;
      this.files.set(path, request.input ?? '');
      return { ...base, stdout: request.input ?? '' };
    }
    if (verb === 'rm') {
      const path = args[5];
      this.files.delete(path);
      return base;
    }
    return base;
  }
}

function build(files: Record<string, string> = {}, now = () => new Date('2026-08-23T01:02:03.000Z')) {
  const map = new Map(Object.entries(files));
  const executor = new FakeExecutor(map);
  const backup = new ConfigBackup({ executor, distribution: 'ding-pbx-console', now, maxTotalBytes: 1024 * 1024 });
  return { executor, backup, map };
}

// ---------- capture ----------

test('capture records present files with content and digest', async () => {
  const { backup } = build({ [PJSIP]: 'a=1\n' });
  const snap = await backup.capture();
  const entry = snap.resources.get(PJSIP as any);
  assert.ok(entry && entry.present);
  if (entry?.present) {
    assert.equal(entry.content, 'a=1\n');
    assert.equal(typeof entry.digest, 'string');
    assert.ok(entry.digest.length > 0);
  }
});

test('capture records a missing file as absent, not omitted', async () => {
  const { backup } = build({ [PJSIP]: 'a=1\n' });
  const snap = await backup.capture();
  assert.equal(snap.resources.size, CONFIGURABLE_RESOURCES.length);
  const entry = snap.resources.get(QUEUES as any);
  assert.deepEqual(entry, { present: false });
});

test('capture covers every allowlisted resource', async () => {
  const { backup } = build({});
  const snap = await backup.capture();
  for (const resource of CONFIGURABLE_RESOURCES) {
    assert.ok(snap.resources.has(resource), `missing ${resource}`);
  }
});

test('capture stamps takenAt and distribution', async () => {
  const { backup } = build({});
  const snap = await backup.capture();
  assert.equal(snap.takenAt, '2026-08-23T01:02:03.000Z');
  assert.equal(snap.distribution, 'ding-pbx-console');
});

test('capture refuses beyond the byte bound, naming the offending resource', async () => {
  const big = 'x'.repeat(2_000_000);
  const { backup } = build({ [PJSIP]: big }, () => new Date());
  const small = new ConfigBackup({
    executor: (build({ [PJSIP]: big }).executor),
    distribution: 'd',
    maxTotalBytes: 1000,
  });
  await assert.rejects(() => small.capture(), /exceeds the 1000-byte bound/u);
});

// ---------- compare ----------

test('compare reports identical when both snapshots agree', async () => {
  const { backup } = build({ [PJSIP]: 'a=1\n' });
  const a = await backup.capture();
  const b = await backup.capture();
  const diff = backup.compare(a, b);
  const entry = diff.entries.find((e) => e.resource === PJSIP);
  assert.equal(entry?.kind, 'identical');
});

test('compare reports added when a file appears in the second snapshot', async () => {
  const { backup, map } = build({});
  const a = await backup.capture();
  map.set(PJSIP, 'a=1\n');
  const b = await backup.capture();
  const entry = backup.compare(a, b).entries.find((e) => e.resource === PJSIP);
  assert.equal(entry?.kind, 'added');
});

test('compare reports removed when a file disappears in the second snapshot', async () => {
  const { backup, map } = build({ [PJSIP]: 'a=1\n' });
  const a = await backup.capture();
  map.delete(PJSIP);
  const b = await backup.capture();
  const entry = backup.compare(a, b).entries.find((e) => e.resource === PJSIP);
  assert.equal(entry?.kind, 'removed');
});

test('compare reports changed with a line-level diff', async () => {
  const { backup, map } = build({ [PJSIP]: 'a=1\nb=2\n' });
  const a = await backup.capture();
  map.set(PJSIP, 'a=1\nb=3\n');
  const b = await backup.capture();
  const entry = backup.compare(a, b).entries.find((e) => e.resource === PJSIP);
  assert.equal(entry?.kind, 'changed');
  assert.ok(entry?.lines);
  const removed = entry!.lines!.filter((l) => l.kind === 'remove').map((l) => l.text);
  const added = entry!.lines!.filter((l) => l.kind === 'add').map((l) => l.text);
  assert.deepEqual(removed, ['b=2']);
  assert.deepEqual(added, ['b=3']);
});

test('compare of both-absent is identical, not removed', async () => {
  const { backup } = build({});
  const a = await backup.capture();
  const b = await backup.capture();
  const entry = backup.compare(a, b).entries.find((e) => e.resource === QUEUES);
  assert.equal(entry?.kind, 'identical');
});

// ---------- restore ----------

test('restore writes back and verifies each write', async () => {
  const { backup, map } = build({ [PJSIP]: 'old\n' });
  const snap = await backup.capture();
  map.set(PJSIP, 'drifted\n');
  const result = await backup.restore(snap, { resources: [PJSIP] });
  assert.deepEqual(result.restored, [PJSIP]);
  assert.equal(result.failed.length, 0);
  assert.equal(map.get(PJSIP), 'old\n');
});

test('restore reports a mismatch as failure, never success', async () => {
  const { backup, executor, map } = build({ [PJSIP]: 'old\n' });
  const snap = await backup.capture();
  // Sabotage: make tee silently write something else, simulating a corrupted write.
  const originalExecute = executor.execute.bind(executor);
  executor.execute = async (request: CommandRequest) => {
    if (request.args[3] === 'tee') {
      map.set(request.args[4], 'CORRUPTED');
      return { status: 'succeeded', exitCode: 0, stdout: 'CORRUPTED', stderr: '', durationMs: 1 };
    }
    return originalExecute(request);
  };
  const result = await backup.restore(snap, { resources: [PJSIP] });
  assert.equal(result.restored.length, 0);
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].resource, PJSIP);
  assert.match(result.failed[0].reason, /did not verify/u);
});

test('restore returns the pre-restore snapshot so the restore can itself be undone', async () => {
  const { backup, map } = build({ [PJSIP]: 'target-value\n' });
  const snap = await backup.capture();
  map.set(PJSIP, 'current-live-value\n');
  const result = await backup.restore(snap, { resources: [PJSIP] });
  const pre = result.preRestoreSnapshot.resources.get(PJSIP as any);
  assert.ok(pre && pre.present);
  if (pre?.present) assert.equal(pre.content, 'current-live-value\n');
});

test('restore of a subset only touches the named resources', async () => {
  const { backup, map } = build({ [PJSIP]: 'p\n', [QUEUES]: 'q\n' });
  const snap = await backup.capture();
  map.set(PJSIP, 'p-drift\n');
  map.set(QUEUES, 'q-drift\n');
  const result = await backup.restore(snap, { resources: [PJSIP] });
  assert.deepEqual(result.restored, [PJSIP]);
  assert.equal(map.get(PJSIP), 'p\n');
  assert.equal(map.get(QUEUES), 'q-drift\n', 'restore touched a resource outside the requested subset');
});

test('restore with no resources option restores everything in the snapshot', async () => {
  const { backup, map } = build({ [PJSIP]: 'p\n', [QUEUES]: 'q\n' });
  const snap = await backup.capture();
  map.set(PJSIP, 'p-drift\n');
  map.set(QUEUES, 'q-drift\n');
  const result = await backup.restore(snap);
  assert.ok(result.restored.includes(PJSIP));
  assert.ok(result.restored.includes(QUEUES));
  assert.equal(map.get(PJSIP), 'p\n');
  assert.equal(map.get(QUEUES), 'q\n');
});

test('restoring an absent capture removes the file on the target', async () => {
  const { backup, map } = build({});
  const snap = await backup.capture(); // PJSIP absent in snapshot
  map.set(PJSIP, 'appeared-later\n');
  const result = await backup.restore(snap, { resources: [PJSIP] });
  assert.deepEqual(result.restored, [PJSIP]);
  assert.equal(map.has(PJSIP), false);
});

test('restore refuses an out-of-snapshot resource name', async () => {
  const { backup } = build({});
  const snap = await backup.capture();
  await assert.rejects(() => backup.restore(snap, { resources: ['/etc/asterisk/sip.conf'] }), /not a configurable resource/u);
});

// ---------- verify ----------

test('verify reports a match when the target still equals the snapshot', async () => {
  const { backup } = build({ [PJSIP]: 'a=1\n' });
  const snap = await backup.capture();
  const result = await backup.verify(snap);
  assert.ok(result.matches.includes(PJSIP));
  assert.equal(result.diverged.length, 0);
});

test('verify detects drift when content changed', async () => {
  const { backup, map } = build({ [PJSIP]: 'a=1\n' });
  const snap = await backup.capture();
  map.set(PJSIP, 'a=2\n');
  const result = await backup.verify(snap);
  const bad = result.diverged.find((d) => d.resource === PJSIP);
  assert.ok(bad);
  assert.match(bad!.reason, /no longer matches/u);
});

test('verify detects a file that disappeared', async () => {
  const { backup, map } = build({ [PJSIP]: 'a=1\n' });
  const snap = await backup.capture();
  map.delete(PJSIP);
  const result = await backup.verify(snap);
  const bad = result.diverged.find((d) => d.resource === PJSIP);
  assert.match(bad!.reason, /now absent/u);
});

test('verify detects a file that appeared where the snapshot expected absence', async () => {
  const { backup, map } = build({});
  const snap = await backup.capture();
  map.set(PJSIP, 'new\n');
  const result = await backup.verify(snap);
  const bad = result.diverged.find((d) => d.resource === PJSIP);
  assert.match(bad!.reason, /now exists/u);
});

// ---------- export/import ----------

test('export then import round-trips a snapshot', async () => {
  const { backup } = build({ [PJSIP]: 'a=1\n', [QUEUES]: 'q\n' });
  const snap = await backup.capture();
  const text = backup.export(snap);
  const round: Snapshot = backup.import(text);
  assert.equal(round.takenAt, snap.takenAt);
  assert.equal(round.distribution, snap.distribution);
  for (const resource of CONFIGURABLE_RESOURCES) {
    assert.deepEqual(round.resources.get(resource), snap.resources.get(resource));
  }
});

test('import refuses the whole snapshot when one resource is outside the allowlist', async () => {
  const { backup, executor } = build({});
  const bogus = JSON.stringify({
    formatVersion: 1,
    takenAt: new Date().toISOString(),
    distribution: 'x',
    resources: [
      { resource: PJSIP, present: true, content: 'ok\n' },
      { resource: '/etc/asterisk/sip.conf', present: true, content: 'nope\n' },
    ],
  });
  const before = executor.calls.length;
  assert.throws(() => backup.import(bogus), /outside the allowlist/u);
  assert.equal(executor.calls.length, before, 'import touched the target instead of only parsing');
});

test('import refuses malformed JSON', async () => {
  const { backup } = build({});
  assert.throws(() => backup.import('{not json'), /not valid JSON/u);
});

test('import refuses an unsupported format version', async () => {
  const { backup } = build({});
  const text = JSON.stringify({ formatVersion: 99, takenAt: 't', distribution: 'd', resources: [] });
  assert.throws(() => backup.import(text), /Unsupported snapshot format version/u);
});

test('import refuses a present entry with no content', async () => {
  const { backup } = build({});
  const text = JSON.stringify({
    formatVersion: 1,
    takenAt: 't',
    distribution: 'd',
    resources: [{ resource: PJSIP, present: true }],
  });
  assert.throws(() => backup.import(text), /marked present but has no content/u);
});

test('import refuses when the embedded digest does not match the content', async () => {
  const { backup } = build({});
  const text = JSON.stringify({
    formatVersion: 1,
    takenAt: 't',
    distribution: 'd',
    resources: [{ resource: PJSIP, present: true, content: 'a=1\n', digest: 'deadbeef' }],
  });
  assert.throws(() => backup.import(text), /failed its digest check/u);
});

test('import refuses beyond the byte bound, naming it', async () => {
  const { backup } = build({}, () => new Date());
  const tiny = new ConfigBackup({ executor: build({}).executor, distribution: 'd', maxTotalBytes: 10 });
  const text = JSON.stringify({
    formatVersion: 1,
    takenAt: 't',
    distribution: 'd',
    resources: [{ resource: PJSIP, present: true, content: 'x'.repeat(1000) }],
  });
  assert.throws(() => tiny.import(text), /exceeds the 10-byte bound/u);
});

test('an imported snapshot can be restored', async () => {
  const { backup, map } = build({ [PJSIP]: 'live\n' });
  const exported = JSON.stringify({
    formatVersion: 1,
    takenAt: new Date().toISOString(),
    distribution: 'ding-pbx-console',
    resources: [{ resource: PJSIP, present: true, content: 'imported\n' }],
  });
  const snap = backup.import(exported);
  const result = await backup.restore(snap, { resources: [PJSIP] });
  assert.deepEqual(result.restored, [PJSIP]);
  assert.equal(map.get(PJSIP), 'imported\n');
});

// ---------- security sweep ----------

test('every command issued uses the allowlisted wsl.exe executable with no shell metacharacters', async () => {
  const { backup, executor, map } = build({ [PJSIP]: 'a=1\n', [EXTENSIONS]: 'b=2\n' });
  const snap = await backup.capture();
  map.set(PJSIP, 'a=drift\n');
  await backup.restore(snap, { resources: [PJSIP] });
  await backup.verify(snap);
  assert.ok(executor.calls.length > 0);
  for (const call of executor.calls) {
    assert.equal(call.executable, 'wsl.exe');
    for (const arg of call.args) {
      assert.doesNotMatch(arg, /[;&|`$<>]/u, `argument "${arg}" looked like it carried shell metacharacters`);
    }
  }
});

test('content is passed on standard input for writes, never embedded as an argument', async () => {
  const { backup, executor, map } = build({ [PJSIP]: 'old\n' });
  const snap = await backup.capture();
  map.set(PJSIP, 'drift\n');
  await backup.restore(snap, { resources: [PJSIP] });
  const teeCall = executor.calls.find((c) => c.args[3] === 'tee');
  assert.ok(teeCall);
  assert.equal(teeCall!.input, 'old\n');
  for (const arg of teeCall!.args) {
    assert.doesNotMatch(arg, /old\n/u);
  }
});
