import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WslConfigTransport,
  parseConfig,
  renderConfig,
  assertConfigurable,
  CONFIGURABLE_RESOURCES,
} from '../../control-plane/wsl-config-transport.js';
import { ConfigTransaction, StructuredConfigPlanner } from '../../control-plane/config-transaction.js';
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
const verb = (r: CommandRequest) => r.args[3];
const build = (script: (request: CommandRequest) => Partial<CommandResult>) => {
  const executor = new FakeExecutor(script);
  const transport = new WslConfigTransport({
    executor,
    distribution: 'ding-pbx-console',
    now: () => new Date('2026-08-23T01:02:03.000Z'),
  });
  return { executor, transport };
};

/**
 * The transport reads a file with base64, not cat, so that the executor own redaction
 * cannot rewrite the bytes on their way to being written back. A fake that still answered
 * cat would be testing a command the transport no longer runs, so these fakes encode the
 * same way the real one does.
 */
const encoded = (text: string) => Buffer.from(text, "utf8").toString("base64");

const SAMPLE = `; a comment
[general]
context = default
allow = ulaw
allow = alaw

[1001]
type = friend
`;

test('parsing keeps repeated keys instead of collapsing them', () => {
  const parsed = parseConfig(SAMPLE);
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[0].entries.filter((e) => e.key === 'allow').map((e) => e.value), ['ulaw', 'alaw']);
});

test('parsing drops comments and blank lines but keeps section order', () => {
  const parsed = parseConfig(SAMPLE);
  assert.deepEqual(parsed.map((s) => s.name), ['general', '1001']);
});

test('a parse and render round trip preserves every entry', () => {
  const once = parseConfig(SAMPLE);
  const twice = parseConfig(renderConfig(once));
  assert.deepEqual(twice, once);
});

test('a resource outside the allowlist is refused by name', () => {
  assert.throws(() => assertConfigurable('../../etc/shadow'), /not a configurable resource/u);
  assert.throws(() => assertConfigurable('/etc/asterisk/sip.conf'), /not a configurable resource/u);
  for (const resource of CONFIGURABLE_RESOURCES) assert.equal(assertConfigurable(resource), resource);
});

test('read fetches the real file from the named distribution', async () => {
  const { executor, transport } = build((r) => (verb(r) === 'base64' ? { stdout: encoded(SAMPLE) } : {}));
  const value = await transport.read(PJSIP);
  assert.equal(value.length, 2);
  /* base64 rather than cat, deliberately: the executor redacts stdout, and a redacted
   * read written back replaces a real credential with the word that hides it. */
  assert.deepEqual([...executor.calls[0].args], ['-d', 'ding-pbx-console', '--', 'base64', '-w', '0', '/etc/asterisk/pjsip.conf']);
});

test('read refuses a resource outside the allowlist before running anything', async () => {
  const { executor, transport } = build(() => ({}));
  await assert.rejects(() => transport.read('shadow'), /not a configurable resource/u);
  assert.equal(executor.calls.length, 0, 'it ran a command for a resource it should have refused');
});

test('backup is timestamped so a second failure cannot destroy the first backup', async () => {
  const { executor, transport } = build(() => ({}));
  const handle = await transport.backup(QUEUES);
  assert.equal(handle, '/etc/asterisk/queues.conf.backup-2026-08-23T01-02-03-000Z');
  assert.ok(executor.calls[0].args.includes('cp'));
});

test('staged content travels on standard input, never as an argument', async () => {
  const { executor, transport } = build(() => ({}));
  await transport.stage(PJSIP, parseConfig(SAMPLE));
  /* Find the write by its verb rather than by position. The transport reads the file
   * before rendering over it, so the write is no longer the first call, and pinning an
   * index would make this test about ordering instead of about what it is checking. */
  const call = executor.calls.find((c) => c.args.includes('tee'));
  assert.ok(call, 'nothing was written through tee');
  assert.equal(call.input?.includes('context = default'), true);
  for (const arg of call.args) assert.ok(!arg.includes('context = default'), 'content leaked into an argument');
});

test('apply refuses a staged handle this transaction did not create', async () => {
  const { executor, transport } = build(() => ({}));
  await assert.rejects(() => transport.apply('/etc/asterisk/pjsip.conf.staged'), /not created by this transaction/u);
  assert.equal(executor.calls.length, 0);
});

test('apply moves the staged file over the real one', async () => {
  const { executor, transport } = build(() => ({}));
  const staged = await transport.stage(PJSIP, parseConfig(SAMPLE));
  await transport.apply(staged);
  const move = executor.calls.at(-1);
  assert.deepEqual([...(move?.args ?? [])], ['-d', 'ding-pbx-console', '--', 'mv', staged, '/etc/asterisk/pjsip.conf']);
});

test('rollback refuses a handle that is not a backup of a configurable resource', async () => {
  const { executor, transport } = build(() => ({}));
  await assert.rejects(() => transport.rollback('/etc/passwd'), /does not belong to a configurable resource/u);
  await assert.rejects(() => transport.rollback('/etc/asterisk/sip.conf.backup-x'), /does not belong/u);
  assert.equal(executor.calls.length, 0);
});

test('a failing command surfaces the target\'s own error rather than a generic one', async () => {
  const { transport } = build(() => ({ status: 'failed', exitCode: 1, stderr: 'Permission denied' }));
  await assert.rejects(() => transport.read(PJSIP), /Permission denied/u);
});

test('every command uses the allowlisted executable with no shell metacharacters', async () => {
  const { executor, transport } = build((r) => (verb(r) === 'base64' ? { stdout: encoded(SAMPLE) } : {}));
  const staged = await transport.stage(PJSIP, parseConfig(SAMPLE));
  await transport.validate(staged);
  await transport.apply(staged);
  await transport.backup(PJSIP);
  assert.ok(executor.calls.length > 0);
  for (const call of executor.calls) {
    assert.equal(call.executable, 'wsl.exe');
    for (const arg of call.args) assert.ok(!/[&|;><`$]/u.test(arg), `argument carries shell metacharacters: ${arg}`);
  }
});

test('the planner and transaction run end to end against the transport', async () => {
  /* A small in-memory filesystem rather than a single string. The transaction writes a
   * staged file and then reads it back, so a fake that answers every read with the
   * original cannot tell a successful apply from a failed one -- it would report a
   * mismatch for a write that worked perfectly. */
  const files = new Map<string, string>([[PJSIP, SAMPLE]]);
  const { transport } = build((r) => {
    if (verb(r) === 'base64') return { stdout: encoded(files.get(r.args[6]) ?? '') };
    if (verb(r) === 'tee') { files.set(r.args[4], r.input ?? ''); return { stdout: r.input ?? '' }; }
    if (verb(r) === 'mv') { files.set(r.args[5], files.get(r.args[4]) ?? ''); return {}; }
    if (verb(r) === 'cp') { files.set(r.args[6], files.get(r.args[5]) ?? ''); return {}; }
    return {};
  });

  const desired = parseConfig(SAMPLE).map((section) =>
    section.name === '1001'
      ? { name: section.name, entries: [...section.entries, { key: 'context', value: 'internal' }] }
      : section,
  );

  const plan = await new StructuredConfigPlanner(() => new Date('2026-08-23T01:02:03.000Z'))
    .createPlan('plan-1', 'ding-pbx-console', [{ resource: PJSIP, value: desired }], transport);

  assert.equal(plan.diffs.length, 1, 'the planner saw no change where one was made');
  assert.equal(plan.actions.length, 5);

  /* Once applied, a read must answer with the new content, or the transaction's own
   * post-read verification would be comparing against the old file. */
  const applied = new Map<string, string>([[PJSIP, SAMPLE]]);
  const applying = new WslConfigTransport({
    executor: new FakeExecutor((r) => {
      /* Its own filesystem, so the post-read sees what the apply actually wrote. */
      if (verb(r) === 'tee') { applied.set(r.args[4], r.input ?? ''); return {}; }
      if (verb(r) === 'mv') { applied.set(r.args[5], applied.get(r.args[4]) ?? ''); return {}; }
      if (verb(r) === 'cp') { applied.set(r.args[6], applied.get(r.args[5]) ?? ''); return {}; }
      if (verb(r) === 'base64') return { stdout: encoded(applied.get(r.args[6]) ?? '') };
      return {};
    }),
    distribution: 'ding-pbx-console',
    now: () => new Date('2026-08-23T01:02:03.000Z'),
  });

  const result = await new ConfigTransaction(applying, () => new Date('2026-08-23T01:02:03.000Z')).apply(plan);
  assert.equal(result.status, 'applied', result.message);
  assert.ok(result.completedActions.includes(`post-read:${PJSIP}`));
});

test('a post-read mismatch rolls back rather than reporting success', async () => {
  const plan = await new StructuredConfigPlanner(() => new Date('2026-08-23T01:02:03.000Z')).createPlan(
    'plan-2',
    'ding-pbx-console',
    [{ resource: QUEUES, value: parseConfig('[general]\npersistentmembers = yes\n') }],
    { read: async () => parseConfig('[general]\npersistentmembers = no\n') },
  );

  /* The target keeps answering with the old content, which is exactly the case the
   * post-read exists to catch: the apply reported success and nothing changed. */
  const stubborn = new WslConfigTransport({
    executor: new FakeExecutor((r) => (verb(r) === 'base64' ? { stdout: encoded('[general]\npersistentmembers = no\n') } : {})),
    distribution: 'ding-pbx-console',
    now: () => new Date('2026-08-23T01:02:03.000Z'),
  });

  const result = await new ConfigTransaction(stubborn, () => new Date('2026-08-23T01:02:03.000Z')).apply(plan);
  assert.notEqual(result.status, 'applied', 'a target that never changed was reported as applied');
  assert.match(result.message ?? '', /Post-read mismatch/u);
  assert.equal(result.rollbackAttempted, true);
});
