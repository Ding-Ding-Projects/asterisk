import test from 'node:test';
import assert from 'node:assert/strict';
import { AsteriskService } from '../../control-plane/asterisk-service.js';
import { MANAGED_DISTRIBUTION } from '../../control-plane/wsl-provisioning.js';
import type { CommandRequest, CommandResult, ProcessExecutor } from '../../control-plane/executor.js';

/**
 * A recording, scriptable executor. Every case drives real code paths against scripted
 * results, so the tests exercise the module rather than a real machine — nothing here
 * starts, stops, or touches an actual WSL distribution.
 */
class FakeExecutor implements ProcessExecutor {
  readonly calls: CommandRequest[] = [];
  constructor(private readonly script: (request: CommandRequest, callIndex: number) => Partial<CommandResult>) {}
  async execute(request: CommandRequest): Promise<CommandResult> {
    const callIndex = this.calls.length;
    this.calls.push(request);
    return { status: 'succeeded', exitCode: 0, stdout: '', stderr: '', durationMs: 1, ...this.script(request, callIndex) };
  }
}

const isRunningList = (r: CommandRequest) => r.args[0] === '--list' && r.args.includes('--running');
const isPgrep = (r: CommandRequest) => r.args.includes('pgrep');
const isVersion = (r: CommandRequest) => r.args.includes('core show version');
const isLaunch = (r: CommandRequest) => r.args.includes('asterisk') && r.args.includes('-F');
const isStopGraceful = (r: CommandRequest) => r.args.includes('core stop gracefully');
const isStopNow = (r: CommandRequest) => r.args.includes('core stop now');

const build = (script: (request: CommandRequest, callIndex: number) => Partial<CommandResult>, overrides: Partial<{
  pollIntervalMs: number; startTimeoutMs: number; stopTimeoutMs: number;
}> = {}) => {
  const executor = new FakeExecutor(script);
  const service = new AsteriskService({
    executor,
    now: () => new Date('2026-08-23T00:00:00.000Z'),
    pollIntervalMs: overrides.pollIntervalMs ?? 1,
    startTimeoutMs: overrides.startTimeoutMs ?? 5,
    stopTimeoutMs: overrides.stopTimeoutMs ?? 5,
    sleep: () => Promise.resolve(),
  });
  return { executor, service };
};

const runningDistribution = () => ({ stdout: `${MANAGED_DISTRIBUTION}\n` });

// --------------------------------------------------------------- status()

test('status: distribution not running is reported before anything else is asked', async () => {
  const { executor, service } = build((r) => (isRunningList(r) ? { stdout: 'docker-desktop\n' } : {}));
  const status = await service.status();
  assert.equal(status.state, 'distributionNotRunning');
  assert.equal(status.distribution, MANAGED_DISTRIBUTION);
  assert.equal(executor.calls.filter(isVersion).length, 0, 'it asked the daemon without the distribution running');
});

test('status: distribution running, daemon answering', async () => {
  const { service } = build((r) => {
    if (isRunningList(r)) return runningDistribution();
    if (isVersion(r)) return { stdout: 'Asterisk 23.5.0\n' };
    return {};
  });
  const status = await service.status();
  assert.equal(status.state, 'daemonAnswering');
  assert.equal(status.asteriskVersion, 'Asterisk 23.5.0');
});

test('status: distribution running, daemon process absent -> daemonNotRunning', async () => {
  const { service } = build((r) => {
    if (isRunningList(r)) return runningDistribution();
    if (isVersion(r)) return { stdout: 'Unable to connect to remote asterisk (does /var/run/asterisk/asterisk.ctl exist?)\n' };
    if (isPgrep(r)) return { status: 'failed', exitCode: 1, stdout: '' };
    return {};
  });
  const status = await service.status();
  assert.equal(status.state, 'daemonNotRunning');
  assert.match(status.reason ?? '', /Unable to connect/u);
});

test('status: distribution running, daemon process present but socket not answering -> daemonUnresponsive', async () => {
  const { service } = build((r) => {
    if (isRunningList(r)) return runningDistribution();
    if (isVersion(r)) return { stdout: 'Unable to connect to remote asterisk (does /var/run/asterisk/asterisk.ctl exist?)\n' };
    if (isPgrep(r)) return { stdout: '4821\n' };
    return {};
  });
  const status = await service.status();
  assert.equal(status.state, 'daemonUnresponsive');
  assert.match(status.reason ?? '', /Unable to connect/u);
});

// ---------------------------------------------------------------- start()

test('start: reports already answering without launching anything', async () => {
  const { executor, service } = build((r) => (isVersion(r) ? { stdout: 'Asterisk 23.5.0\n' } : {}));
  const outcome = await service.start();
  assert.equal(outcome.status.state, 'daemonAnswering');
  assert.equal(executor.calls.filter(isLaunch).length, 0, 'it launched a daemon that was already answering');
});

test('start: succeeds once the daemon answers after several polls, never trusting the launch exit code alone', async () => {
  let versionCalls = 0;
  const { executor, service } = build((r) => {
    if (isVersion(r)) {
      versionCalls += 1;
      // First call (pre-launch check) and next two polls fail; the third poll answers.
      if (versionCalls <= 3) return { stdout: 'Unable to connect to remote asterisk (does /var/run/asterisk/asterisk.ctl exist?)\n' };
      return { stdout: 'Asterisk 23.5.0\n' };
    }
    return {};
  });
  const outcome = await service.start();
  assert.equal(outcome.status.state, 'daemonAnswering');
  assert.equal(outcome.status.asteriskVersion, 'Asterisk 23.5.0');
  assert.ok(executor.calls.filter(isLaunch).length === 1, 'it did not launch exactly once');
  const launchStep = outcome.steps.find((s) => s.name === 'launch');
  assert.ok(launchStep?.ok, 'the launch step was not reported as having run');
  const verifyStep = outcome.steps.find((s) => s.name === 'verify Asterisk is answering');
  assert.ok(verifyStep?.ok, 'start did not report verification against the real polled answer');
});

test('start: a launch whose exit code succeeds but never actually answers is reported as failed, not started', async () => {
  const { executor, service } = build((r) => {
    if (isVersion(r)) return { stdout: 'Unable to connect to remote asterisk (does /var/run/asterisk/asterisk.ctl exist?)\n' };
    if (isLaunch(r)) return { status: 'succeeded' }; // exit code says success; the daemon never actually answers
    if (isPgrep(r)) return { status: 'failed', exitCode: 1, stdout: '' };
    return {};
  });
  const outcome = await service.start();
  assert.notEqual(outcome.status.state, 'daemonAnswering', 'a successful exit code alone was trusted as "started"');
  assert.equal(outcome.status.state, 'daemonNotRunning');
  assert.match(outcome.status.reason ?? '', /Unable to connect|timeout/iu);
  assert.ok(executor.calls.filter(isLaunch).length >= 1);
});

test('start: process present but never answering within the timeout is reported as unresponsive, not not-running', async () => {
  const { service } = build((r) => {
    if (isVersion(r)) return { stdout: 'Unable to connect to remote asterisk (does /var/run/asterisk/asterisk.ctl exist?)\n' };
    if (isPgrep(r)) return { stdout: '5150\n' };
    return {};
  });
  const outcome = await service.start();
  assert.equal(outcome.status.state, 'daemonUnresponsive');
});

// ----------------------------------------------------------------- stop()

test('stop: uses graceful stop by default and says so', async () => {
  let stopped = false;
  const { executor, service } = build((r, callIndex) => {
    if (isVersion(r)) return stopped ? { stdout: 'Unable to connect to remote asterisk\n' } : { stdout: 'Asterisk 23.5.0\n' };
    if (isStopGraceful(r)) { stopped = true; return {}; }
    if (isPgrep(r)) return { status: 'failed', exitCode: 1, stdout: '' };
    return {};
  });
  const outcome = await service.stop();
  assert.equal(outcome.status.state, 'daemonNotRunning');
  assert.equal(executor.calls.filter(isStopGraceful).length, 1);
  assert.equal(executor.calls.filter(isStopNow).length, 0);
  const stopStep = outcome.steps.find((s) => s.name === 'stop gracefully');
  assert.ok(stopStep, 'stop did not report which command it actually used');
  assert.match(stopStep!.detail, /core stop gracefully/u);
});

test('stop: force uses "core stop now" and says so', async () => {
  let stopped = false;
  const { executor, service } = build((r) => {
    if (isVersion(r)) return stopped ? { stdout: 'Unable to connect to remote asterisk\n' } : { stdout: 'Asterisk 23.5.0\n' };
    if (isStopNow(r)) { stopped = true; return {}; }
    if (isPgrep(r)) return { status: 'failed', exitCode: 1, stdout: '' };
    return {};
  });
  const outcome = await service.stop({ force: true });
  assert.equal(outcome.status.state, 'daemonNotRunning');
  assert.equal(executor.calls.filter(isStopNow).length, 1);
  assert.equal(executor.calls.filter(isStopGraceful).length, 0);
});

test('stop: a stop command that is accepted but never actually takes effect is reported as still running', async () => {
  const { service } = build((r) => {
    if (isVersion(r)) return { stdout: 'Asterisk 23.5.0\n' }; // never stops answering
    if (isStopGraceful(r)) return {}; // the command itself is "accepted"
    return {};
  });
  const outcome = await service.stop();
  assert.equal(outcome.status.state, 'daemonAnswering', 'an accepted stop command was trusted as having stopped the daemon');
  const verifyStep = outcome.steps.find((s) => s.name === 'verify Asterisk stopped');
  assert.equal(verifyStep?.ok, false);
});

test('stop: already stopped reports so without issuing a stop command', async () => {
  const { executor, service } = build((r) => {
    if (isVersion(r)) return { stdout: 'Unable to connect to remote asterisk\n' };
    if (isPgrep(r)) return { status: 'failed', exitCode: 1, stdout: '' };
    return {};
  });
  const outcome = await service.stop();
  assert.equal(outcome.status.state, 'daemonNotRunning');
  assert.equal(executor.calls.filter(isStopGraceful).length, 0);
  assert.equal(executor.calls.filter(isStopNow).length, 0);
});

// -------------------------------------------------------------- restart()

test('restart: stops then starts, both verified', async () => {
  let stopped = false;
  const { executor, service } = build((r) => {
    if (isVersion(r)) return stopped ? { stdout: 'Unable to connect to remote asterisk\n' } : { stdout: 'Asterisk 23.5.0\n' };
    if (isStopGraceful(r)) { stopped = true; return {}; }
    if (isLaunch(r)) { stopped = false; return {}; }
    if (isPgrep(r)) return { status: 'failed', exitCode: 1, stdout: '' };
    return {};
  });
  const outcome = await service.restart();
  assert.equal(outcome.status.state, 'daemonAnswering');
  assert.equal(executor.calls.filter(isStopGraceful).length, 1);
  assert.equal(executor.calls.filter(isLaunch).length, 1);
  assert.ok(outcome.steps.some((s) => s.name === 'stop gracefully'));
  assert.ok(outcome.steps.some((s) => s.name === 'launch'));
});

test('restart: never attempts a start when the stop half never actually took effect', async () => {
  const { executor, service } = build((r) => {
    if (isVersion(r)) return { stdout: 'Asterisk 23.5.0\n' }; // stop never takes effect
    if (isStopGraceful(r)) return {};
    return {};
  });
  const outcome = await service.restart();
  assert.equal(outcome.status.state, 'daemonAnswering');
  assert.equal(executor.calls.filter(isLaunch).length, 0, 'restart started on top of a daemon that never actually stopped');
});

// ---------------------------------------------------------- cancellation

test('an aborted signal stops a start from polling forever', async () => {
  const controller = new AbortController();
  const { executor, service } = build((r) => {
    if (isVersion(r)) return { stdout: 'Unable to connect to remote asterisk\n' };
    if (isPgrep(r)) return { status: 'failed', exitCode: 1, stdout: '' };
    return {};
  }, { startTimeoutMs: 1000, pollIntervalMs: 1 });
  controller.abort();
  const outcome = await service.start(controller.signal);
  assert.notEqual(outcome.status.state, 'daemonAnswering');
  const verifyStep = outcome.steps.find((s) => s.name === 'verify Asterisk is answering');
  assert.match(verifyStep?.detail ?? '', /cancelled/iu);
});
