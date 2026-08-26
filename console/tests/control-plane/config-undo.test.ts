import assert from "node:assert/strict";
import test from "node:test";
import { ConfigUndoService } from "../../control-plane/config-undo.js";
import type { ChangePlan } from "../../control-plane/contracts.js";

const resource = "/etc/asterisk/queues.conf";
const before = { general: { persistentmembers: "no" } };
const after = { general: { persistentmembers: "yes" } };
const plan: ChangePlan = { id: "plan-6", targetId: "target-a", createdAt: "2026-08-26T00:00:00.000Z", summary: "change", actions: [], diffs: [{ resource, before, after, changedPaths: ["$.general.persistentmembers"] }], requiredStorageBytes: 1, destructive: false };

function target() {
  let value: unknown = after;
  let failUndo = false;
  return {
    get value() { return value; }, set value(next: unknown) { value = next; },
    set failUndo(next: boolean) { failUndo = next; },
    read: async () => value,
    rollback: async () => { if (failUndo) throw new Error("target rollback refused"); value = before; },
  };
}

test("successful apply receipt undoes once, validates state, and persists redacted history", async () => {
  const at = () => new Date("2026-08-26T00:00:00.000Z");
  const service = new ConfigUndoService(at);
  const receipt = service.issue(plan, [{ resource, handle: "backup:private-path" }], "catalog-83");
  const host = target(); const entries: unknown[] = [];
  const result = await service.undo(receipt, "target-a", host, { record: async (entry) => { entries.push(entry); return { id: "history" }; } });
  assert.equal(result.ok, true); assert.deepEqual(host.value, before); assert.equal(entries.length, 1);
  assert.doesNotMatch(JSON.stringify(entries), /private-path/u);
  const repeated = await service.undo(receipt, "target-a", host);
  assert.deepEqual(repeated, { ok: false, code: "UNDO_HANDLE_CONSUMED", message: "This undo handle has already been used." });
});

test("rejects foreign, target-mismatched, expired, and post-state-diverged receipts before mutation", async () => {
  let now = new Date("2026-08-26T00:00:00.000Z"); const service = new ConfigUndoService(() => now, 1);
  const receipt = service.issue(plan, [{ resource, handle: "backup" }]); const host = target();
  assert.equal((await service.undo({ ...receipt, nonce: "foreign" }, "target-a", host)).ok, false);
  assert.equal((await service.undo(receipt, "target-b", host)).ok, false);
  now = new Date("2026-08-26T00:00:01.000Z"); assert.equal((await service.undo(receipt, "target-a", host)).ok, false);
  const freshService = new ConfigUndoService(() => new Date("2026-08-26T00:00:00.000Z")); const fresh = freshService.issue(plan, [{ resource, handle: "backup" }]); host.value = { changed: true };
  const diverged = await freshService.undo(fresh, "target-a", host);
  assert.equal(diverged.ok, false); assert.equal(host.value instanceof Object && (host.value as { changed?: boolean }).changed, true);
});

test("undo failure consumes the receipt once and records no backup handle", async () => {
  const service = new ConfigUndoService(() => new Date("2026-08-26T00:00:00.000Z")); const receipt = service.issue(plan, [{ resource, handle: "backup:secret" }]);
  const host = target(); host.failUndo = true; const entries: unknown[] = [];
  const failed = await service.undo(receipt, "target-a", host, { record: async (entry) => { entries.push(entry); return {}; } });
  assert.equal(failed.ok, false); assert.equal(entries.length, 1); assert.doesNotMatch(JSON.stringify(entries), /backup:secret/u);
  assert.equal((await service.undo(receipt, "target-a", host)).ok, false);
});

test("concurrent callers cannot consume the same receipt twice", async () => {
  const service = new ConfigUndoService(() => new Date("2026-08-26T00:00:00.000Z")); const receipt = service.issue(plan, [{ resource, handle: "backup" }]); const host = target();
  const [one, two] = await Promise.all([service.undo(receipt, "target-a", host), service.undo(receipt, "target-a", host)]);
  assert.equal([one.ok, two.ok].filter(Boolean).length, 1);
});
