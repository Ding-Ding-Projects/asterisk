/**
 * Installing the console onto a VM over SSH.
 *
 * The plan is pure, so almost all of this runs without a network or a VM. What is worth
 * testing hardest is not the happy path but the two ways this could be dangerous: a command
 * assembled loosely enough that a hostname could become part of it, and a host key check
 * relaxed because a deployment is inconvenient to authorise. The second matters most,
 * because the plan ends by running a privileged installer.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUNDLE_NAME, INSTALLER_PATH, SERVICE_NAME,
  planDeployment, runDeployment, validateDeployTarget,
  type DeployTarget,
} from '../../control-plane/console-deploy.ts';
import type { CommandResult, ExecuteRequest, ProcessExecutor } from '../../control-plane/executor.ts';

const target: DeployTarget = {
  host: 'pbx.internal.example',
  port: 22,
  user: 'admin',
  knownHostsPath: '/home/me/.ssh/known_hosts',
};

const ok = (stdout = ''): CommandResult => ({ exitCode: 0, stdout, stderr: '', durationMs: 1, outcome: 'completed' });

class Fake implements ProcessExecutor {
  readonly seen: ExecuteRequest[] = [];
  constructor(private readonly replies: Array<CommandResult | Error> = []) {}
  async execute(request: ExecuteRequest): Promise<CommandResult> {
    this.seen.push(request);
    const reply = this.replies[this.seen.length - 1] ?? ok();
    if (reply instanceof Error) throw reply;
    return reply;
  }
}

/* --- the plan ---------------------------------------------------------------------------- */

test('the plan is the whole install, in order, and nothing is run to produce it', () => {
  const plan = planDeployment(target, 'C:/build/bundle.tar.gz', '2026-08-24');
  assert.deepEqual(plan.steps.map((s) => s.executable), ['ssh', 'ssh', 'ssh', 'scp', 'ssh', 'ssh', 'ssh', 'ssh']);
  assert.match(plan.stagingDirectory, /^\/tmp\/ding-deploy-2026-08-24$/u);
  /* Reachability and privilege are checked BEFORE anything is copied: failing after a
   * fifteen-minute upload is a worse way to learn the account cannot use sudo. */
  assert.match(plan.steps[0].name, /can be reached/u);
  assert.match(plan.steps[1].name, /can install a service/u);
  assert.ok(plan.steps.findIndex((s) => s.executable === 'scp') > 1);
});

test('every step is an argument vector, never a command string', () => {
  /* This is what makes a hostname a hostname. If any step joined its parts into one string,
   * a name containing a space or a semicolon would stop being data. */
  for (const step of planDeployment(target, '/tmp/b.tar.gz', 'x').steps) {
    for (const arg of step.args) {
      assert.equal(typeof arg, 'string');
      assert.doesNotMatch(arg, /[;&|`$()]/u, `${step.name} carries a shell metacharacter: ${arg}`);
    }
    assert.ok(!step.args.some((a) => a.includes(' ') && a.includes('-o ')), 'options are not pre-joined');
  }
});

test('the host key discipline is the same as for a read-only probe', () => {
  /* A deployment ends by running a privileged installer, so this is the last place to start
   * trusting a key blindly. accept-new enrols one nobody has seen and still refuses one that
   * CHANGED, which is the distinction that matters. */
  for (const step of planDeployment(target, '/tmp/b.tar.gz', 'x').steps) {
    assert.ok(step.args.includes('StrictHostKeyChecking=accept-new'), step.name);
    assert.ok(step.args.includes('UpdateHostKeys=no'), step.name);
    assert.ok(step.args.includes(`UserKnownHostsFile=${target.knownHostsPath}`), step.name);
    assert.ok(!step.args.includes('StrictHostKeyChecking=no'), step.name);
  }
});

test('scp is given its own spelling of the port option', () => {
  /* ssh takes -p and scp takes -P. Getting it wrong sends the copy to port 22 whatever the
   * person configured, which fails confusingly rather than obviously. */
  const plan = planDeployment({ ...target, port: 2222 }, '/tmp/b.tar.gz', 'x');
  const copy = plan.steps.find((s) => s.executable === 'scp');
  assert.deepEqual([copy.args[0], copy.args[1]], ['-P', '2222']);
  const probe = plan.steps.find((s) => s.executable === 'ssh');
  assert.deepEqual([probe.args[0], probe.args[1]], ['-p', '2222']);
});

test('the installer that runs is the one checked in, at a path under the staging directory', () => {
  const plan = planDeployment(target, '/tmp/b.tar.gz', 'x');
  const install = plan.steps.find((s) => s.name.includes('Installing'));
  assert.ok(install.args.includes(`${plan.stagingDirectory}/${INSTALLER_PATH}`));
  assert.ok(install.args.includes('sudo') && install.args.includes('-n'));
});

test('the upload is cleared away afterwards', () => {
  const plan = planDeployment(target, '/tmp/b.tar.gz', 'x');
  const last = plan.steps[plan.steps.length - 1];
  assert.ok(last.args.includes(plan.stagingDirectory));
  assert.ok(last.args.includes('rm'));
});

test('a copy is allowed far longer than a probe', () => {
  const plan = planDeployment(target, '/tmp/b.tar.gz', 'x');
  const copy = plan.steps.find((s) => s.executable === 'scp');
  const probe = plan.steps[0];
  assert.ok(copy.timeoutMs > probe.timeoutMs * 10,
    'a multi-megabyte upload on a slow link would be killed as though it had hung');
});

/* --- what the plan refuses ---------------------------------------------------------------- */

test('an ephemeral known_hosts store is refused outright', () => {
  for (const path of ['/dev/null', 'NUL', 'C:/tmp/../dev/null']) {
    assert.throws(() => validateDeployTarget({ ...target, knownHostsPath: path }), /ephemeral|prohibited/iu, path);
  }
});

test('a relative known_hosts path is refused', () => {
  assert.throws(() => validateDeployTarget({ ...target, knownHostsPath: '.ssh/known_hosts' }), /absolute/iu);
});

test('a host, port or user that is not one is refused before any plan exists', () => {
  assert.throws(() => planDeployment({ ...target, host: 'pbx; rm -rf /' }, '/tmp/b', 'x'), /exact DNS name/u);
  assert.throws(() => planDeployment({ ...target, host: '' }, '/tmp/b', 'x'), /exact DNS name/u);
  assert.throws(() => planDeployment({ ...target, port: 0 }, '/tmp/b', 'x'), /port is invalid/u);
  assert.throws(() => planDeployment({ ...target, port: 70_000 }, '/tmp/b', 'x'), /port is invalid/u);
  assert.throws(() => planDeployment({ ...target, user: 'root; id' }, '/tmp/b', 'x'), /user is invalid/u);
});

test('a stamp that is not a plain identifier is refused, so it cannot shape a path', () => {
  for (const stamp of ['../../etc', 'a b', '', 'x'.repeat(65)]) {
    assert.throws(() => planDeployment(target, '/tmp/b', stamp), /plain identifier/u, JSON.stringify(stamp));
  }
});

test('an empty bundle path is refused rather than sending nothing', () => {
  assert.throws(() => planDeployment(target, '   ', 'x'), /no bundle/u);
});

/* --- running it ---------------------------------------------------------------------------- */

test('a clean run reports every step, in order, and where to reach it', async () => {
  const fake = new Fake();
  const seen: string[] = [];
  const outcome = await runDeployment({
    executor: fake, target, plan: planDeployment(target, '/tmp/b.tar.gz', 'x'),
    onStep: (s) => seen.push(s.name),
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.steps.length, 8);
  assert.deepEqual(seen, outcome.steps.map((s) => s.name));
  assert.match(outcome.reachableAt, /^http:\/\/pbx\.internal\.example:/u);
});

test('it stops at the first failure and says which step, not just that it failed', async () => {
  /* Which step it failed at is most of the diagnosis, and a single end verdict throws that
   * away. */
  const fake = new Fake([ok(), { exitCode: 1, stdout: '', stderr: 'sudo: a password is required', durationMs: 1, outcome: 'completed' }]);
  const outcome = await runDeployment({ executor: fake, target, plan: planDeployment(target, '/tmp/b.tar.gz', 'x') });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.steps.length, 2);
  assert.match(outcome.steps[1].detail, /cannot use sudo without a password/u);
  assert.equal(fake.seen.length, 2, 'it kept going after a failure');
  assert.equal(outcome.reachableAt, undefined, 'it claimed an address for something that did not install');
});

test('a changed host key stops the deployment and says nothing was installed', async () => {
  /* Never enrolled automatically, never retried past: the next step runs a privileged
   * installer on whatever machine is actually answering. */
  const fake = new Fake([{ exitCode: 255, stdout: '', stderr: 'WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!', durationMs: 1, outcome: 'completed' }]);
  const outcome = await runDeployment({ executor: fake, target, plan: planDeployment(target, '/tmp/b.tar.gz', 'x') });
  assert.equal(outcome.ok, false);
  assert.match(outcome.steps[0].detail, /does not match the one recorded/u);
  assert.match(outcome.steps[0].detail, /Nothing was installed/u);
  assert.equal(fake.seen.length, 1);
});

test('an executor that throws is reported as a failed step, not an unhandled error', async () => {
  const fake = new Fake([new Error('spawn ssh ENOENT')]);
  const outcome = await runDeployment({ executor: fake, target, plan: planDeployment(target, '/tmp/b.tar.gz', 'x') });
  assert.equal(outcome.ok, false);
  assert.match(outcome.steps[0].detail, /did not answer over SSH/u);
  assert.match(outcome.steps[0].detail, /ENOENT/u);
});

test('cancelling stops before the next step rather than mid-install', async () => {
  const controller = new AbortController();
  const fake = new Fake();
  controller.abort();
  const outcome = await runDeployment({
    executor: fake, target, plan: planDeployment(target, '/tmp/b.tar.gz', 'x'), signal: controller.signal,
  });
  assert.equal(outcome.ok, false);
  assert.equal(fake.seen.length, 0);
  assert.match(outcome.steps[0].detail, /Stopped before this step/u);
});

test('the bundle name and service name are stated once and used consistently', () => {
  const plan = planDeployment(target, '/tmp/b.tar.gz', 'x');
  const copy = plan.steps.find((s) => s.executable === 'scp');
  assert.ok(copy.args[copy.args.length - 1].endsWith(`/${BUNDLE_NAME}`));
  const check = plan.steps.find((s) => s.name.includes('started'));
  assert.ok(check.args.includes(SERVICE_NAME));
});
