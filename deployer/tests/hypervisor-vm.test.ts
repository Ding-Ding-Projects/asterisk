import test from "node:test";
import assert from "node:assert/strict";
import { HypervisorVmProvisioning, MANAGED_VM_NAME, detectHypervisor } from "../control-plane/hypervisor-vm.js";
import type { CommandRequest, CommandResult, ProcessExecutor } from "../control-plane/executor.js";

class FakeExecutor implements ProcessExecutor {
  readonly calls: CommandRequest[] = [];
  constructor(private readonly script: (request: CommandRequest) => Partial<CommandResult>) {}
  async execute(request: CommandRequest): Promise<CommandResult> {
    this.calls.push(request);
    return { status: "succeeded", exitCode: 0, stdout: "", stderr: "", durationMs: 1, ...this.script(request) };
  }
}

const isList = (r: CommandRequest) => r.args[0] === "list";
const isImport = (r: CommandRequest) => r.args[0] === "import";
const isGuestProp = (r: CommandRequest) => r.args[0] === "guestproperty";
const isStart = (r: CommandRequest) => r.args[0] === "startvm";
const isUnregister = (r: CommandRequest) => r.args[0] === "unregistervm";
const isControl = (r: CommandRequest) => r.args[0] === "controlvm";

const build = (script: (request: CommandRequest) => Partial<CommandResult>) => {
  const executor = new FakeExecutor(script);
  const provisioning = new HypervisorVmProvisioning({
    executor,
    appliancePath: "C:/app/resources/pbx/ding-pbx.ova",
    now: () => new Date("2026-08-23T00:00:00.000Z"),
  });
  return { executor, provisioning };
};

test("detectHypervisor reports absent when VBoxManage does not respond", async () => {
  const executor = new FakeExecutor(() => ({ status: "failed", exitCode: 127, stderr: "not found" }));
  const result = await detectHypervisor(executor);
  assert.equal(result.available, false);
  assert.match(result.reason ?? "", /not found/u);
});

test("detectHypervisor reports available with the reported version", async () => {
  const executor = new FakeExecutor(() => ({ stdout: "7.1.4\n" }));
  const result = await detectHypervisor(executor);
  assert.equal(result.available, true);
  assert.equal(result.version, "7.1.4");
});

test("status reports notProvisioned when the appliance is present and no VM exists", async () => {
  const { provisioning } = build((r) => (isList(r) ? { stdout: '"other-vm" {uuid}\n' } : {}));
  const status = await provisioning.status(true);
  assert.equal(status.state, "notProvisioned");
});

test("status reports applianceMissing rather than offering an import that cannot succeed", async () => {
  const { provisioning } = build((r) => (isList(r) ? { stdout: "" } : {}));
  const status = await provisioning.status(false);
  assert.equal(status.state, "applianceMissing");
});

test("status reports hypervisorUnavailable when VBoxManage itself fails", async () => {
  const { provisioning } = build(() => ({ status: "failed", exitCode: 1, stderr: "VirtualBox is not installed" }));
  const status = await provisioning.status(true);
  assert.equal(status.state, "hypervisorUnavailable");
});

test("status reports ready with the guest address the VM actually answered", async () => {
  const { provisioning } = build((r) => {
    if (isList(r)) return { stdout: `"${MANAGED_VM_NAME}" {uuid}\n` };
    if (isGuestProp(r)) return { stdout: "Value: 192.168.56.10\n" };
    return {};
  });
  const status = await provisioning.status(true);
  assert.equal(status.state, "ready");
  assert.equal(status.guestAddress, "192.168.56.10");
});

test("a registered VM with no reported guest address is unusable, not ready", async () => {
  const { provisioning } = build((r) => {
    if (isList(r)) return { stdout: `"${MANAGED_VM_NAME}" {uuid}\n` };
    if (isGuestProp(r)) return { stdout: "No value set!\n" };
    return {};
  });
  const status = await provisioning.status(true);
  assert.equal(status.state, "unusable");
});

test("provision imports the appliance, starts it, and verifies the guest address", async () => {
  const { executor, provisioning } = build((r) => {
    if (isList(r)) return { stdout: "" };
    if (isImport(r) || isStart(r)) return {};
    if (isGuestProp(r)) return { stdout: "Value: 192.168.56.10\n" };
    return {};
  });
  const outcome = await provisioning.provision(true);
  assert.equal(outcome.status.state, "ready");
  assert.deepEqual(outcome.steps.map((s) => s.ok), [true, true, true, true, true, true]);
  assert.ok(executor.calls.some(isImport));
  assert.ok(executor.calls.some(isStart));
});

test("provision refuses to re-import over an existing VM of the managed name", async () => {
  const { executor, provisioning } = build((r) => (isList(r) ? { stdout: `"${MANAGED_VM_NAME}" {uuid}\n` } : {}));
  const outcome = await provisioning.provision(true);
  assert.equal(outcome.status.state, "failed");
  assert.match(outcome.status.reason ?? "", /already exists/u);
  assert.ok(!executor.calls.some(isImport), "provision must never import over an existing managed VM");
});

test("provision reports applianceMissing without touching VBoxManage at all", async () => {
  const { executor, provisioning } = build(() => ({}));
  const outcome = await provisioning.provision(false);
  assert.equal(outcome.status.state, "failed");
  assert.equal(executor.calls.length, 0, "no VBoxManage call should happen when the appliance is missing");
});

// --- THE REFUSE-TO-DESTROY GUARD, watched red then green ---

test("remove refuses to unregister anything other than the exact managed VM name", async () => {
  const { executor, provisioning } = build(() => ({}));
  const step = await provisioning.remove("some-other-vm-the-user-made");
  assert.equal(step.ok, false);
  assert.match(step.detail, /will not unregister/u);
  assert.ok(!executor.calls.some(isUnregister), "an unregister call must never reach VBoxManage for a foreign VM name");
});

test("remove unregisters only the exact managed VM name when confirmed", async () => {
  const { executor, provisioning } = build(() => ({}));
  const step = await provisioning.remove(MANAGED_VM_NAME);
  assert.equal(step.ok, true);
  const call = executor.calls.find(isUnregister);
  assert.ok(call);
  assert.deepEqual([...call.args], ["unregistervm", MANAGED_VM_NAME, "--delete"]);
});

test("stop refuses anything other than the exact managed VM name", async () => {
  const { executor, provisioning } = build(() => ({}));
  const step = await provisioning.stop("someone-elses-vm");
  assert.equal(step.ok, false);
  assert.ok(!executor.calls.some(isControl), "a controlvm call must never reach VBoxManage for a foreign VM name");
});
