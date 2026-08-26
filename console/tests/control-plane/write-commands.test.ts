import assert from "node:assert/strict";
import test from "node:test";

import {
  buildManagerKickSessionCommand,
  buildModuleActionCommand,
  isAllowlistedWriteCommand,
  isManagerSessionFileDescriptor,
  isModuleResourceName,
} from "../../control-plane/write-commands.ts";
import { LocalAsteriskCliGateway } from "../../control-plane/asterisk-readings.ts";
import type { CommandResult, ProcessExecutor } from "../../control-plane/executor.ts";
import type { TargetProfile } from "../../control-plane/contracts.ts";

/**
 * The second, deliberately tiny allowlist beside `READ_ONLY_COMMANDS`: everything a
 * caller could hand `isAllowlistedWriteCommand` before it ever reaches
 * `LocalAsteriskCliGateway.runUnchecked`, which itself trusts its caller entirely (see
 * that method's own comment). If this file's negative cases ever went green, that
 * trust would be unearned -- an attacker-controlled module name or session id would
 * reach `asterisk -rx` verbatim.
 */

test("isModuleResourceName accepts only a plain .so resource name", () => {
  for (const good of ["res_pjsip.so", "app_queue.so", "chan_iax2.so", "cdr_odbc.so", "res_stir_shaken.so"]) {
    assert.ok(isModuleResourceName(good), `${good} should be a usable module name`);
  }
  for (const bad of [
    "", "res_pjsip", "res pjsip.so", "res_pjsip.so; rm -rf /", "../../../etc/passwd",
    "res_pjsip.so\nmodule load evil.so", "1res_pjsip.so", "res_pjsip.SO", "-res_pjsip.so",
  ]) {
    assert.ok(!isModuleResourceName(bad), `${JSON.stringify(bad)} should be refused`);
  }
});

test("buildModuleActionCommand builds the exact three CLI lines and nothing else for a bad name", () => {
  assert.equal(buildModuleActionCommand("load", "res_pjsip.so"), "module load res_pjsip.so");
  assert.equal(buildModuleActionCommand("unload", "res_pjsip.so"), "module unload res_pjsip.so");
  assert.equal(buildModuleActionCommand("reload", "res_pjsip.so"), "module reload res_pjsip.so");
  assert.equal(buildModuleActionCommand("load", "res_pjsip.so; module unload safe.so"), undefined);
  assert.equal(buildModuleActionCommand("load", ""), undefined);
});

test("isManagerSessionFileDescriptor accepts only a plain small positive integer", () => {
  for (const good of ["1", "12", "9", "123456789"]) {
    assert.ok(isManagerSessionFileDescriptor(good), `${good} should be a usable file descriptor`);
  }
  for (const bad of ["0", "-1", "01", "12.5", "12 extra", "12; rm -rf /", "abc", "", "1234567890"]) {
    assert.ok(!isManagerSessionFileDescriptor(bad), `${JSON.stringify(bad)} should be refused`);
  }
});

test("buildManagerKickSessionCommand builds the exact CLI line and nothing for a bad fd", () => {
  assert.equal(buildManagerKickSessionCommand("12"), "manager kick session 12");
  assert.equal(buildManagerKickSessionCommand("0"), undefined);
  assert.equal(buildManagerKickSessionCommand("12 && rm -rf /"), undefined);
});

test("isAllowlistedWriteCommand accepts exactly the module-action and kick-session shapes", () => {
  for (const good of [
    "module load res_pjsip.so", "module unload res_pjsip.so", "module reload res_pjsip.so",
    "manager kick session 12",
  ]) {
    assert.ok(isAllowlistedWriteCommand(good), `${good} should be allowlisted`);
  }
});

test("isAllowlistedWriteCommand refuses every command it is not one of the two builders", () => {
  for (const bad of [
    "module load", "module load res_pjsip.so extra", "module unload", "module frobnicate res_pjsip.so",
    "manager kick session", "manager kick session 12 extra", "manager kick session -1",
    "module load res_pjsip.so; module unload chan_iax2.so", "core show channels concise",
    "dialplan reload", "", "module load ../../../etc/passwd",
  ]) {
    assert.ok(!isAllowlistedWriteCommand(bad), `${JSON.stringify(bad)} should be refused`);
  }
});

const WSL_TARGET: TargetProfile = {
  id: "t1",
  displayName: "Dev box",
  connectionKind: "wsl",
  wslDistribution: "Ubuntu-22.04",
};

class RecordingExecutor implements ProcessExecutor {
  readonly requests: Array<{ executable: string; args: ReadonlyArray<string> }> = [];
  async execute(request: { executable: string; args: ReadonlyArray<string> }): Promise<CommandResult> {
    this.requests.push({ executable: request.executable, args: request.args });
    return { status: "succeeded", exitCode: 0, stdout: "Reloaded res_pjsip.so\n", stderr: "", durationMs: 1 };
  }
}

test("LocalAsteriskCliGateway.runUnchecked sends exactly the built command as one argv element", async () => {
  const command = buildModuleActionCommand("reload", "res_pjsip.so");
  assert.ok(command);
  const executor = new RecordingExecutor();
  const gateway = new LocalAsteriskCliGateway(executor);
  const result = await gateway.runUnchecked(WSL_TARGET, command);
  assert.equal(result.status, "succeeded");
  assert.deepEqual(executor.requests[0]!.args, ["-d", "Ubuntu-22.04", "--", "asterisk", "-rx", "module reload res_pjsip.so"]);
  /* One argv element, not a shell string: a module name this validator would refuse in
   * the first place cannot smuggle a second command in behind it, because there is no
   * shell here to interpret a `;` or a `&&`. */
  assert.equal(executor.requests[0]!.args.length, 6);
});
