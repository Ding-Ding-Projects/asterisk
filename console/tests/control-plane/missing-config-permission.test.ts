import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WslConfigTransport } from '../../control-plane/wsl-config-transport.js';
import type { CommandRequest, CommandResult, ProcessExecutor } from '../../control-plane/executor.js';

class PermissionExecutor implements ProcessExecutor {
  readonly calls: CommandRequest[] = [];
  async execute(request: CommandRequest): Promise<CommandResult> {
    this.calls.push(request);
    return {
      status: 'failed',
      exitCode: 1,
      stdout: '',
      stderr: `cp: cannot stat '/etc/asterisk/geolocation.conf': Permission denied`,
      durationMs: 1,
    };
  }
}

test('cannot-stat permission failure is never treated as an absent optional config', async () => {
  const executor = new PermissionExecutor();
  const transport = new WslConfigTransport({ executor, distribution: 'ding-pbx-console' });
  await assert.rejects(() => transport.backup('/etc/asterisk/geolocation.conf'), /Permission denied/u);
  assert.equal(executor.calls.some((call) => call.args[3] === 'touch'), false, 'permission failure created an absent marker');
});
