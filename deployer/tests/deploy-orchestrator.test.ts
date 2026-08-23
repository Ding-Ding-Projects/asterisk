import test from "node:test";
import assert from "node:assert/strict";
import { DeployOrchestrator } from "../control-plane/deploy-orchestrator.js";
import { MANAGED_VM_NAME } from "../control-plane/hypervisor-vm.js";
import type { CommandRequest, CommandResult, ProcessExecutor } from "../control-plane/executor.js";
import type { HttpGetter } from "../control-plane/health-check.js";

class FakeExecutor implements ProcessExecutor {
  readonly calls: CommandRequest[] = [];
  constructor(private readonly script: (request: CommandRequest) => Partial<CommandResult>) {}
  async execute(request: CommandRequest): Promise<CommandResult> {
    this.calls.push(request);
    return { status: "succeeded", exitCode: 0, stdout: "", stderr: "", durationMs: 1, ...this.script(request) };
  }
}

const healthyGetter: HttpGetter = {
  async get() {
    return { statusCode: 200, body: JSON.stringify({ status: "ok", asteriskVersion: "23.5.0", authRequired: true }) };
  },
};

function scriptFor(opts: { vmExists: boolean; guestReady: boolean }) {
  return (r: CommandRequest): Partial<CommandResult> => {
    if (r.executable === "VBoxManage") {
      if (r.args[0] === "--version") return { stdout: "7.1.4\n" };
      if (r.args[0] === "list") return { stdout: opts.vmExists ? `"${MANAGED_VM_NAME}" {uuid}\n` : "" };
      if (r.args[0] === "guestproperty") {
        return opts.guestReady ? { stdout: "Value: 192.168.56.10\n" } : { stdout: "No value set!\n" };
      }
      return {};
    }
    if (r.executable === "ssh") {
      const cmd = r.args.join(" ");
      if (cmd.includes("os-release")) return { stdout: "ID=ubuntu\n" };
      if (cmd.includes("cat >")) return {};
      if (cmd.includes("install.sh") || r.args.includes("sudo")) return { stdout: "DING_PBX_INSTALL_OK 23.5.0\n" };
      if (cmd.includes("systemctl")) return { stdout: "active\n" };
      return {};
    }
    return {};
  };
}

test("deploy to a local VM: no hypervisor present is reported plainly, without attempting import", async () => {
  const executor = new FakeExecutor((r) => (r.args[0] === "--version" ? { status: "failed", exitCode: 127 } : {}));
  const orchestrator = new DeployOrchestrator({
    executor,
    appliancePath: "C:/app/pbx.ova",
    installScriptText: "#!/bin/sh\n",
    approvedSshIdentities: [],
    healthGetter: healthyGetter,
  });
  const result = await orchestrator.deploy({ kind: "localVm" });
  assert.equal(result.ok, false);
  assert.equal(result.steps[0]?.name, "detect hypervisor");
  assert.equal(result.steps[0]?.ok, false);
  assert.equal(result.steps.length, 1, "must not attempt further steps once the hypervisor is absent");
});

test("deploy to a local VM: hypervisor present, full flow succeeds and is verified by asking", async () => {
  const executor = new FakeExecutor(scriptFor({ vmExists: false, guestReady: true }));
  const orchestrator = new DeployOrchestrator({
    executor,
    appliancePath: "C:/app/pbx.ova",
    installScriptText: "#!/bin/sh\necho install\n",
    approvedSshIdentities: [],
    healthGetter: healthyGetter,
  });
  const result = await orchestrator.deploy({ kind: "localVm" });
  assert.equal(result.ok, true);
  assert.equal(result.address, "192.168.56.10");
  assert.equal(result.asteriskVersion, "23.5.0");
  assert.equal(result.adminUrl, "http://192.168.56.10:8088");
});

test("deploy to a local VM is idempotent: a second run against an already-ready VM does not re-import", async () => {
  const executor = new FakeExecutor(scriptFor({ vmExists: true, guestReady: true }));
  const orchestrator = new DeployOrchestrator({
    executor,
    appliancePath: "C:/app/pbx.ova",
    installScriptText: "#!/bin/sh\n",
    approvedSshIdentities: [],
    healthGetter: healthyGetter,
  });
  const result = await orchestrator.deploy({ kind: "localVm" });
  assert.equal(result.ok, true);
  assert.ok(!executor.calls.some((c) => c.executable === "VBoxManage" && c.args[0] === "import"), "a second run must not re-import over the existing VM");
});

test("deploy over SSH: reachable, refusing target is reported honestly and stops before any install attempt", async () => {
  const executor = new FakeExecutor(() => ({ status: "failed", exitCode: 255, stderr: "Connection refused" }));
  const orchestrator = new DeployOrchestrator({
    executor,
    installScriptText: "#!/bin/sh\n",
    approvedSshIdentities: [{ host: "192.168.50.60", port: 22 }],
    healthGetter: healthyGetter,
  });
  const result = await orchestrator.deploy({ kind: "ssh", host: "192.168.50.60", port: 22, user: "root", knownHostsPath: "/x/known_hosts" });
  assert.equal(result.ok, false);
  assert.equal(result.steps[0]?.name, "reachable");
  assert.equal(result.steps.length, 1);
});

test("deploy over SSH: a changed host key stops the deployment", async () => {
  const executor = new FakeExecutor(() => ({ status: "failed", exitCode: 255, stderr: "REMOTE HOST IDENTIFICATION HAS CHANGED!" }));
  const orchestrator = new DeployOrchestrator({
    executor,
    installScriptText: "#!/bin/sh\n",
    approvedSshIdentities: [{ host: "192.168.50.60", port: 22 }],
    healthGetter: healthyGetter,
  });
  const result = await orchestrator.deploy({ kind: "ssh", host: "192.168.50.60", port: 22, user: "root", knownHostsPath: "/x/known_hosts" });
  assert.equal(result.ok, false);
  /* The host-key check happens inside the reachability probe, so it surfaces as a
   * failed "reachable" step rather than a separate one -- but it must still name the
   * real reason (host key, not a generic connection failure) and stop before any
   * install attempt. */
  assert.equal(result.steps[0]?.name, "reachable");
  assert.equal(result.steps.length, 1);
  assert.match(result.steps[0]?.detail ?? "", /does not match|changed/u);
});

test("deploy over SSH: full flow succeeds and reports the admin URL and Asterisk version", async () => {
  const executor = new FakeExecutor(scriptFor({ vmExists: false, guestReady: true }));
  const orchestrator = new DeployOrchestrator({
    executor,
    installScriptText: "#!/bin/sh\necho install\n",
    approvedSshIdentities: [{ host: "192.168.50.60", port: 22 }],
    healthGetter: healthyGetter,
  });
  const result = await orchestrator.deploy({ kind: "ssh", host: "192.168.50.60", port: 22, user: "root", knownHostsPath: "/x/known_hosts" });
  assert.equal(result.ok, true);
  assert.equal(result.adminUrl, "http://192.168.50.60:8088");
  assert.equal(result.asteriskVersion, "23.5.0");
});

test("deploy fails honestly, not silently, when the server never answers health after install reports success", async () => {
  const unhealthyGetter: HttpGetter = { async get() { return { statusCode: 200, body: "not json" }; } };
  const executor = new FakeExecutor(scriptFor({ vmExists: false, guestReady: true }));
  const orchestrator = new DeployOrchestrator({
    executor,
    installScriptText: "#!/bin/sh\n",
    approvedSshIdentities: [{ host: "192.168.50.60", port: 22 }],
    healthGetter: unhealthyGetter,
  });
  const result = await orchestrator.deploy({ kind: "ssh", host: "192.168.50.60", port: 22, user: "root", knownHostsPath: "/x/known_hosts" });
  assert.equal(result.ok, false, "an install script that exits 0 must never be reported as a verified deployment on its own");
  const verify = result.steps.find((s) => s.name === "verify server responds");
  assert.equal(verify?.ok, false);
});

test("detectAvailableTargets reports the real state rather than assuming the appliance is present", async () => {
  const executor = new FakeExecutor(() => ({ stdout: "7.1.4\n" }));
  const orchestrator = new DeployOrchestrator({
    executor,
    installScriptText: "#!/bin/sh\n",
    approvedSshIdentities: [],
  });
  const targets = await orchestrator.detectAvailableTargets();
  assert.equal(targets.localVm.available, true);
  assert.equal(targets.localVm.appliancePresent, false);
});
