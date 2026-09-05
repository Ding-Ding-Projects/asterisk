import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const consoleRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const source = readFileSync(join(consoleRoot, 'control-plane', 'dispatch.ts'), 'utf8');
const lines = source.split(/\r?\n/u);
const codeLine = (needle: string) => lines.findIndex((line) => line.includes(needle) && !line.trim().startsWith('//') && !line.trim().startsWith('*'));

/**
 * pbx.apply used to stop after ConfigTransaction wrote the file. reloadAndVerifyRuntime was
 * defined for the second half and called by nothing, so every "applied" the console reported
 * left Asterisk running the previous configuration. Two real deploys proved it on
 * 2026-09-05. This pins the call, in order, on the applied path.
 */
test('pbx.apply reloads and verifies the runtime after the file is written', () => {
  const applied = codeLine('const result = await new ConfigTransaction(transport, () => new Date()).apply(plan);');
  const reload = codeLine('await reloadAndVerifyRuntime(target, plan);');
  const returned = codeLine("code: result.status === 'applied' ? undefined : 'CONFIG_APPLY_FAILED',");
  assert.ok(applied >= 0, 'the transaction apply must remain addressable');
  assert.ok(reload >= 0, 'reloadAndVerifyRuntime must be called');
  assert.ok(returned >= 0, 'the apply response must remain addressable');
  assert.ok(applied < reload && reload < returned, 'the reload must run after the write and before the applied response');
  assert.ok(codeLine("code: 'CONFIG_RELOAD_FAILED',") >= 0, 'a failed reload must be reported as its own outcome, not as applied');
});

test('the post-reload identity check accepts whatever identity the daemon prints', () => {
  const at = codeLine("const identity = await runTargetCli(target, 'core show version');");
  assert.ok(at >= 0);
  const check = lines.slice(at, at + 4).join(' ');
  assert.match(check, /\^Asterisk\\s\+\\S\+/u, 'the identity pattern must not demand digits');
});
