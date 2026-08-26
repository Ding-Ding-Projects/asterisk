/**
 * Contract: a change that succeeded can be undone.
 *
 * The transaction has always taken a backup per resource, and always used it to roll back a
 * *failed* apply. It never handed the handles out, so a caller who changed their mind after
 * a *successful* one had nowhere to go. The only route was to take a second backup before
 * applying, which the evidence run for the first live write had to do -- leaving two copies
 * on the target for every edit and no supported way to undo.
 *
 * These tests use a fake target that behaves like a filesystem. A fake that answers every
 * read with the original file cannot tell a successful apply from a failed one, and two of
 * this repository's doubles used to do exactly that.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { ConfigTransaction, StructuredConfigPlanner } from "../../control-plane/config-transaction.js";
import { parseConfig, renderConfig, type ConfigValue } from "../../control-plane/wsl-config-transport.js";

const RESOURCE = "/etc/asterisk/queues.conf";
const BEFORE = "[general]\npersistentmembers = no\n";
const AFTER = "[general]\npersistentmembers = yes\n";
const at = () => new Date("2026-08-25T00:00:00.000Z");

/** A target that really stores what is written to it, including its backups. */
const target = () => {
  const files = new Map<string, string>([[RESOURCE, BEFORE]]);
  let backupCount = 0;
  return {
    files,
    backupsTaken: () => backupCount,
    read: async (resource: string) => parseConfig(files.get(resource) ?? ""),
    backup: async (resource: string) => {
      backupCount += 1;
      const handle = `${resource}.backup-${backupCount}`;
      files.set(handle, files.get(resource) ?? "");
      return handle;
    },
    stage: async (resource: string, value: unknown) => {
      const handle = `${resource}.staged`;
      files.set(handle, renderConfig(value as ConfigValue));
      return handle;
    },
    validate: async (handle: string) => {
      if (!files.has(handle)) throw new Error(`nothing staged at ${handle}`);
    },
    apply: async (handle: string) => {
      files.set(handle.replace(".staged", ""), files.get(handle) ?? "");
      files.delete(handle);
    },
    rollback: async (handle: string) => {
      const resource = handle.slice(0, handle.indexOf(".backup-"));
      files.set(resource, files.get(handle) ?? "");
    },
  };
};

const planFor = async (transport: ReturnType<typeof target>) =>
  new StructuredConfigPlanner(at).createPlan("plan", "target", [{ resource: RESOURCE, value: parseConfig(AFTER) }], transport);

test("a successful apply hands back one backup handle per changed resource", async () => {
  const transport = target();
  const result = await new ConfigTransaction(transport, at).apply(await planFor(transport));

  assert.equal(result.status, "applied", result.message);
  assert.ok(result.backups, "a successful apply returned no backup handles, so it cannot be undone");
  assert.equal(result.backups?.length, 1);
  assert.equal(result.backups?.[0]?.resource, RESOURCE);
});

test("the handle it hands back actually restores the previous content", async () => {
  /* The point of the whole change: not that a handle exists, but that using it works. */
  const transport = target();
  const result = await new ConfigTransaction(transport, at).apply(await planFor(transport));
  assert.equal(transport.files.get(RESOURCE), AFTER, "the apply did not take effect, so the undo proves nothing");

  for (const entry of [...(result.backups ?? [])].reverse()) {
    await transport.rollback(entry.handle);
  }
  assert.equal(transport.files.get(RESOURCE), BEFORE);
});

test("undoing needs no second backup, so one edit leaves one copy on the target", async () => {
  /* Before this, the only way to undo a successful apply was for the caller to take its own
   * backup first, which doubled what an edit left behind on a real exchange. */
  const transport = target();
  await new ConfigTransaction(transport, at).apply(await planFor(transport));
  assert.equal(transport.backupsTaken(), 1);
});

test("a failed apply still rolls back on its own and reports that it did", async () => {
  /* The behaviour that already worked must keep working: handing the handles out is an
   * addition, not a replacement for the automatic path. */
  const transport = target();
  const stubborn = { ...transport, apply: async () => { /* accepts the write and changes nothing */ } };
  const result = await new ConfigTransaction(stubborn, at).apply(await planFor(transport));

  assert.notEqual(result.status, "applied");
  assert.equal(result.rollbackAttempted, true);
  assert.match(result.message, /Post-read mismatch/u);
});

test("a plan that changes nothing takes no backup and hands back none", async () => {
  const transport = target();
  const plan = await new StructuredConfigPlanner(at)
    .createPlan("plan", "target", [{ resource: RESOURCE, value: parseConfig(BEFORE) }], transport);
  assert.equal(plan.diffs.length, 0, "the planner saw a change where none was made");

  const result = await new ConfigTransaction(transport, at).apply(plan);
  assert.equal(result.status, "applied");
  assert.deepEqual(result.backups, []);
  assert.equal(transport.backupsTaken(), 0);
});
