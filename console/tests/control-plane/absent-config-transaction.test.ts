import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigHistory } from '../../control-plane/config-history.js';
import { WslConfigTransport, parseConfig } from '../../control-plane/wsl-config-transport.js';
import type { CommandRequest, CommandResult, ProcessExecutor } from '../../control-plane/executor.js';

class FakeExecutor implements ProcessExecutor {
  readonly calls: CommandRequest[] = [];
  constructor(private readonly run: (request: CommandRequest) => Partial<CommandResult>) {}
  async execute(request: CommandRequest): Promise<CommandResult> {
    this.calls.push(request);
    return { status: 'succeeded', exitCode: 0, stdout: '', stderr: '', durationMs: 1, ...this.run(request) };
  }
}

const RESOURCE = '/etc/asterisk/geolocation.conf';
const MARKER = '/etc/asterisk/geolocation.conf.backup-2026-08-23T06-00-00-000Z-absent';
const verb = (request: CommandRequest) => request.args[3];

test('an absent allowlisted resource reads as an empty structured config, not a fake value', async () => {
  const executor = new FakeExecutor((request) => verb(request) === 'cat'
    ? { status: 'failed', exitCode: 1, stderr: `cat: ${RESOURCE}: No such file or directory` }
    : {});
  const transport = new WslConfigTransport({ executor, distribution: 'ding-pbx-console' });
  assert.deepEqual(await transport.read(RESOURCE), []);
  assert.equal(executor.calls.length, 1);
});

test('backup records absence and rollback removes a file that the transaction created', async () => {
  const executor = new FakeExecutor((request) => {
    if (verb(request) === 'cp') return { status: 'failed', exitCode: 1, stderr: `cp: cannot stat '${RESOURCE}': No such file or directory` };
    return {};
  });
  const transport = new WslConfigTransport({
    executor,
    distribution: 'ding-pbx-console',
    now: () => new Date('2026-08-23T06:00:00.000Z'),
  });

  const handle = await transport.backup(RESOURCE);
  assert.equal(handle, MARKER);
  assert.equal(verb(executor.calls[1]!), 'touch');

  await transport.rollback(handle);
  const rollback = executor.calls.at(-1)!;
  assert.equal(verb(rollback), 'rm');
  assert.deepEqual(rollback.args.slice(4), ['-f', RESOURCE]);
});

test('permission failures are not misclassified as optional-file absence', async () => {
  const executor = new FakeExecutor(() => ({ status: 'failed', exitCode: 1, stderr: 'Permission denied' }));
  const transport = new WslConfigTransport({ executor, distribution: 'ding-pbx-console' });
  await assert.rejects(() => transport.read(RESOURCE), /Permission denied/u);
  await assert.rejects(() => transport.backup(RESOURCE), /Permission denied/u);
});

test('absent recovery point restores absence and verifies the resource is gone', async () => {
  let resourceExists = true;
  const executor = new FakeExecutor((request) => {
    const command = verb(request);
    if (command === 'ls') return { stdout: `${MARKER.slice(MARKER.lastIndexOf('/') + 1)}\n` };
    if (command === 'stat') return { stdout: '0\n' };
    if (command === 'test') {
      const path = request.args.at(-1);
      const exists = path === MARKER ? true : path === RESOURCE ? resourceExists : false;
      return exists ? {} : { status: 'failed', exitCode: 1 };
    }
    if (command === 'rm') { resourceExists = false; return {}; }
    return {};
  });
  const history = new ConfigHistory({ executor, distribution: 'ding-pbx-console' });
  const result = await history.restore(MARKER);
  assert.equal(result.ok, true);
  assert.equal(resourceExists, false);
  assert.match(result.detail, /did not exist/u);
});

test('history restore refuses a manufactured prefixed handle before any remove or copy', async () => {
  const executor = new FakeExecutor((request) => {
    if (verb(request) === 'ls') return { stdout: '' };
    return {};
  });
  const history = new ConfigHistory({ executor, distribution: 'ding-pbx-console' });
  await assert.rejects(
    () => history.restore(`${RESOURCE}.backup-../../not-a-listed-backup`),
    /not a recovery point currently listed/u,
  );
  assert.equal(executor.calls.some((request) => ['rm', 'cp'].includes(String(verb(request)))), false);
});

test('a newly created config still has to contain structured content before staging can validate', async () => {
  const desired = parseConfig('[location]\ntype = location_info\n');
  assert.equal(desired.length, 1);
  assert.equal(desired[0]!.entries.length, 1);
});
