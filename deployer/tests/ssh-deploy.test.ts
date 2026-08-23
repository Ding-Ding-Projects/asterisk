import test from "node:test";
import assert from "node:assert/strict";
import { SshServerDeployer, HostKeyMismatchError } from "../control-plane/ssh-deploy.js";
import type { CommandRequest, CommandResult, ProcessExecutor } from "../control-plane/executor.js";
import { INSTALL_SCRIPT_REMOTE_PATH, SERVICE_UNIT_NAME } from "../control-plane/server-contract.js";

class FakeExecutor implements ProcessExecutor {
  readonly calls: CommandRequest[] = [];
  constructor(private readonly script: (request: CommandRequest) => Partial<CommandResult>) {}
  async execute(request: CommandRequest): Promise<CommandResult> {
    this.calls.push(request);
    return { status: "succeeded", exitCode: 0, stdout: "", stderr: "", durationMs: 1, ...this.script(request) };
  }
}

const target = { host: "192.168.50.60", port: 22, user: "root", knownHostsPath: "/home/tester/.ding/known_hosts" };
const isProbe = (r: CommandRequest) => r.args.includes("cat") && r.args.includes("/etc/os-release");
const isCopy = (r: CommandRequest) => r.args.some((a) => a.includes("cat >") && a.includes(INSTALL_SCRIPT_REMOTE_PATH));
const isRunInstall = (r: CommandRequest) => r.args.includes("sudo") && r.args.includes(INSTALL_SCRIPT_REMOTE_PATH);
const isSystemctl = (r: CommandRequest) => r.args.includes("systemctl");

test("probeReachable reports failure honestly when the target does not answer", async () => {
  const executor = new FakeExecutor(() => ({ status: "failed", exitCode: 255, stderr: "Connection refused" }));
  const deployer = new SshServerDeployer(executor, [{ host: target.host, port: target.port }]);
  const step = await deployer.probeReachable(target);
  assert.equal(step.ok, false);
  assert.match(step.detail, /Connection refused/u);
});

test("a changed host key stops the deployment instead of connecting anyway", async () => {
  const executor = new FakeExecutor(() => ({ status: "failed", exitCode: 255, stderr: "REMOTE HOST IDENTIFICATION HAS CHANGED!" }));
  const deployer = new SshServerDeployer(executor, [{ host: target.host, port: target.port }]);
  const outcome = await deployer.deployInstallScript(target, "#!/bin/sh\necho hi\n");
  assert.equal(outcome.ok, false);
  assert.equal(outcome.steps[0]?.name, "reachable");
  assert.match(outcome.steps[0]?.detail ?? "", /Refusing to connect|does not match/u);
});

test("deployInstallScript succeeds end to end and verifies the systemd unit is active", async () => {
  const executor = new FakeExecutor((r) => {
    if (isProbe(r)) return { stdout: "ID=ubuntu\n" };
    if (isCopy(r)) return {};
    if (isRunInstall(r)) return { stdout: "DING_PBX_INSTALL_OK 23.5.0\n" };
    if (isSystemctl(r)) return { stdout: "active\n" };
    return {};
  });
  const deployer = new SshServerDeployer(executor, [{ host: target.host, port: target.port }]);
  const outcome = await deployer.deployInstallScript(target, "#!/bin/sh\necho installing\n");
  assert.equal(outcome.ok, true);
  assert.equal(outcome.asteriskVersion, "23.5.0");
  assert.deepEqual(outcome.steps.map((s) => s.name), ["reachable", "copy install script", "run install script", "verify service active"]);
  assert.deepEqual(outcome.steps.map((s) => s.ok), [true, true, true, true]);

  const copyCall = executor.calls.find(isCopy);
  assert.equal(copyCall?.input, "#!/bin/sh\necho installing\n");

  const svcCall = executor.calls.find(isSystemctl);
  assert.ok(svcCall?.args.includes(SERVICE_UNIT_NAME));
});

test("deployInstallScript reports failure honestly when the install script exits without the success marker", async () => {
  const executor = new FakeExecutor((r) => {
    if (isProbe(r)) return { stdout: "ID=ubuntu\n" };
    if (isCopy(r)) return {};
    if (isRunInstall(r)) return { status: "failed", exitCode: 1, stderr: "apt-get: no such package" };
    return {};
  });
  const deployer = new SshServerDeployer(executor, [{ host: target.host, port: target.port }]);
  const outcome = await deployer.deployInstallScript(target, "#!/bin/sh\nexit 1\n");
  assert.equal(outcome.ok, false);
  const runStep = outcome.steps.find((s) => s.name === "run install script");
  assert.equal(runStep?.ok, false);
  assert.match(runStep?.detail ?? "", /no such package/u);
});

test("deployInstallScript never reports success from the install exit code alone: an active-but-not-marked run still fails", async () => {
  const executor = new FakeExecutor((r) => {
    if (isProbe(r)) return { stdout: "ID=ubuntu\n" };
    if (isCopy(r)) return {};
    if (isRunInstall(r)) return { stdout: "some unrelated output, no success marker\n" }; // exit 0, but no marker
    return {};
  });
  const deployer = new SshServerDeployer(executor, [{ host: target.host, port: target.port }]);
  const outcome = await deployer.deployInstallScript(target, "#!/bin/sh\n");
  assert.equal(outcome.ok, false, "a zero exit code alone must never be treated as a verified install");
});

test("deployInstallScript reports failure when the service does not end up active", async () => {
  const executor = new FakeExecutor((r) => {
    if (isProbe(r)) return { stdout: "ID=ubuntu\n" };
    if (isCopy(r)) return {};
    if (isRunInstall(r)) return { stdout: "DING_PBX_INSTALL_OK 23.5.0\n" };
    if (isSystemctl(r)) return { stdout: "failed\n" };
    return {};
  });
  const deployer = new SshServerDeployer(executor, [{ host: target.host, port: target.port }]);
  const outcome = await deployer.deployInstallScript(target, "#!/bin/sh\n");
  assert.equal(outcome.ok, false);
  const svc = outcome.steps.find((s) => s.name === "verify service active");
  assert.equal(svc?.ok, false);
});
