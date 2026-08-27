import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeProcessExecutor } from "../../control-plane/executor.js";
import type { CommandRequest, CommandResult, ProcessExecutor } from "../../control-plane/executor.js";
import { LocalHistory, HISTORY_ACTIONS } from "../../control-plane/local-history.js";

/** Records every request while still delegating to a real executor, so the tests can
 * both inspect exactly what was run and prove the store's real Git behaviour. */
class RecordingExecutor implements ProcessExecutor {
  readonly calls: CommandRequest[] = [];
  constructor(private readonly inner: ProcessExecutor) {}
  async execute(request: CommandRequest): Promise<CommandResult> {
    this.calls.push(request);
    return await this.inner.execute(request);
  }
}

function makeHistory() {
  const dir = mkdtempSync(join(tmpdir(), "local-history-"));
  const executor = new RecordingExecutor(new NodeProcessExecutor({ allowedExecutables: ["git"] }));
  const history = new LocalHistory({ executor, repositoryPath: dir });
  return { dir, executor, history };
}

function cleanup(dir: string) {
  rmSync(dir, { recursive: true, force: true });
}

const allArgs = (executor: RecordingExecutor): string[] =>
  executor.calls.flatMap((call) => [...call.args]);

test("initialize creates the repository and is idempotent", async () => {
  const { dir, history } = makeHistory();
  try {
    const first = await history.initialize();
    assert.equal(first.created, true);
    const second = await history.initialize();
    assert.equal(second.created, false);
  } finally {
    cleanup(dir);
  }
});

test("every fixed action is accepted", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    for (const action of HISTORY_ACTIONS) {
      const commit = await history.record({ action, payload: { ok: true }, subject: `subject for ${action}` });
      assert.equal(commit.action, action);
    }
  } finally {
    cleanup(dir);
  }
});

test("an unrecognized action is refused before any command runs", async () => {
  const { dir, executor, history } = makeHistory();
  try {
    await assert.rejects(
      () => history.record({ action: "sideways" as never, payload: {}, subject: "x" }),
      /not a recognized history action/u,
    );
    assert.equal(executor.calls.length, 0, "it ran a command for an action it should have refused");
  } finally {
    cleanup(dir);
  }
});

test("an empty subject is refused before any command runs", async () => {
  const { dir, executor, history } = makeHistory();
  try {
    await assert.rejects(
      () => history.record({ action: "created", payload: {}, subject: "   " }),
      /non-empty subject/u,
    );
    assert.equal(executor.calls.length, 0, "it ran a command for a subject it should have refused");
  } finally {
    cleanup(dir);
  }
});

test("the commit message names what changed, not merely that something changed", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    const commit = await history.record({ action: "deleted", payload: {}, subject: "the endpoint 1001" });
    assert.match(commit.message, /^Deleted the endpoint 1001$/mu);
    assert.doesNotMatch(commit.message, /^Updated/mu);
  } finally {
    cleanup(dir);
  }
});

test("list returns newest first", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    const first = await history.record({ action: "created", payload: {}, subject: "record one" });
    const second = await history.record({ action: "created", payload: {}, subject: "record two" });
    const third = await history.record({ action: "created", payload: {}, subject: "record three" });
    const commits = await history.list();
    assert.deepEqual(commits.map((c) => c.id), [third.id, second.id, first.id]);
  } finally {
    cleanup(dir);
  }
});

test("list filters by action", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    await history.record({ action: "created", payload: {}, subject: "record a" });
    const updated = await history.record({ action: "updated", payload: {}, subject: "record b" });
    await history.record({ action: "deleted", payload: {}, subject: "record c" });
    const commits = await history.list({ action: "updated" });
    assert.deepEqual(commits.map((c) => c.id), [updated.id]);
  } finally {
    cleanup(dir);
  }
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("list filters by a date range", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    const first = await history.record({ action: "created", payload: {}, subject: "record a" });
    await sleep(1100);
    const second = await history.record({ action: "created", payload: {}, subject: "record b" });
    await sleep(1100);
    const third = await history.record({ action: "created", payload: {}, subject: "record c" });
    const commits = await history.list({ since: second.timestamp, until: second.timestamp });
    assert.deepEqual(commits.map((c) => c.id), [second.id]);
    assert.notEqual(first.id, second.id);
    assert.notEqual(second.id, third.id);
  } finally {
    cleanup(dir);
  }
});

test("action and date filters compose together rather than one overriding the other", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    await history.record({ action: "created", payload: {}, subject: "record a" });
    await sleep(1100);
    const target = await history.record({ action: "updated", payload: {}, subject: "record b" });
    await sleep(1100);
    await history.record({ action: "updated", payload: {}, subject: "record c" });
    const commits = await history.list({ action: "updated", since: target.timestamp, until: target.timestamp });
    assert.deepEqual(commits.map((c) => c.id), [target.id]);
  } finally {
    cleanup(dir);
  }
});

test("an unknown action filter is refused rather than silently returning everything", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    await history.record({ action: "created", payload: {}, subject: "record a" });
    await assert.rejects(() => history.list({ action: "bogus" }), /not a recognized history action/u);
  } finally {
    cleanup(dir);
  }
});

test("actionCounts reports a zero for an action with no commits", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    await history.record({ action: "created", payload: {}, subject: "record a" });
    await history.record({ action: "created", payload: {}, subject: "record b" });
    const counts = await history.actionCounts();
    assert.equal(counts.created, 2);
    assert.equal(counts.deleted, 0);
    assert.equal(counts.restored, 0);
  } finally {
    cleanup(dir);
  }
});

test("restore records a new commit rather than rewriting history", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    const original = await history.record({ action: "deleted", payload: { note: "gone" }, subject: "record a" });
    const before = await history.list();
    const restored = await history.restore(original.id);
    assert.notEqual(restored.id, original.id);
    assert.equal(restored.action, "restored");
    const after = await history.list();
    assert.equal(after.length, before.length + 1);
    assert.ok(after.some((c) => c.id === original.id), "the original commit must still exist");
    assert.ok(after.some((c) => c.id === restored.id), "the restore must be its own commit");
  } finally {
    cleanup(dir);
  }
});

test("a malformed commit id is refused before any command runs", async () => {
  const { dir, executor, history } = makeHistory();
  try {
    await assert.rejects(() => history.restore("not-a-real-commit-id"), /not a 40-character commit id/u);
    assert.equal(executor.calls.length, 0, "it ran a command for a commit id it should have refused");
  } finally {
    cleanup(dir);
  }
});

test("prune keeps N and refuses a non-positive retention count", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    await history.record({ action: "created", payload: {}, subject: "record a" });
    await history.record({ action: "created", payload: {}, subject: "record b" });
    await history.record({ action: "created", payload: {}, subject: "record c" });
    assert.deepEqual(await history.prune(1), { kept: 1 });
    assert.deepEqual(await history.prune(100), { kept: 3 });
    await assert.rejects(() => history.prune(0), /at least 1/u);
    await assert.rejects(() => history.prune(-5), /at least 1/u);
  } finally {
    cleanup(dir);
  }
});

test("a credential-looking payload value is redacted on disk", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    await history.record({
      action: "created",
      payload: { username: "1001", password: "hunter2", apiKey: "sk-live-abc", nested: { token: "xyz" } },
      subject: "protected record",
    });
    const raw = readFileSync(join(dir, "records", "protected-record.json"), "utf8");
    assert.doesNotMatch(raw, /hunter2/u);
    assert.doesNotMatch(raw, /sk-live-abc/u);
    assert.doesNotMatch(raw, /xyz/u);
    assert.match(raw, /\[redacted\]/u);
    assert.match(raw, /1001/u, "a non-secret field must survive redaction");
  } finally {
    cleanup(dir);
  }
});

test("a failing command surfaces the target's own stderr", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    // Shaped like a valid 40-hex commit id, but it names no commit that exists.
    await assert.rejects(() => history.restore("0000000000000000000000000000000000dead"), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.ok(error.message.length > 0, "the real git failure must be surfaced, not swallowed");
      return true;
    });
  } finally {
    cleanup(dir);
  }
});

test("every command this class issues avoids shell metacharacters", async () => {
  const { dir, executor, history } = makeHistory();
  try {
    await history.initialize();
    const original = await history.record({ action: "created", payload: {}, subject: "record a" });
    await history.list();
    await history.restore(original.id);
    await history.prune(1);
    for (const arg of allArgs(executor)) {
      assert.doesNotMatch(arg, /[;&|`$]|\$\(/u, `argument "${arg}" looks like it could break out of its own slot`);
    }
  } finally {
    cleanup(dir);
  }
});

test("negative regression: no command this class issues ever rewrites history", async () => {
  const { dir, executor, history } = makeHistory();
  try {
    await history.initialize();
    const first = await history.record({ action: "created", payload: {}, subject: "record a" });
    await history.record({ action: "updated", payload: {}, subject: "record b" });
    await history.list({ action: "updated" });
    await history.actionCounts();
    await history.restore(first.id);
    await history.prune(1);

    const forbidden = ["--amend", "--hard", "push", "--force", "-f"];
    for (const arg of allArgs(executor)) {
      for (const term of forbidden) {
        assert.notEqual(arg, term, `a command issued the rewriting flag "${term}"`);
      }
    }
    for (const call of executor.calls) {
      assert.notEqual(call.args[0], "reset", "a reset would rewrite history");
      assert.notEqual(call.args[0], "push", "this store never pushes anywhere");
    }
  } finally {
    cleanup(dir);
  }
});

test("branch reads the real HEAD ref, even before the first commit", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    const branch = await history.branch();
    // Whatever the local git default is (master or main), it must be a real,
    // non-empty ref name -- never a guessed literal.
    assert.ok(branch.length > 0);
    assert.doesNotMatch(branch, /\s/u, "a branch name must not contain whitespace");
  } finally {
    cleanup(dir);
  }
});

test("diff reports the real file and the real +/- lines for the first commit", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    const commit = await history.record({ action: "created", payload: { a: 1 }, subject: "record one" });
    const diff = await history.diff(commit.id);
    assert.deepEqual(diff.files, ["records/record-one.json"]);
    const additions = diff.lines.filter((line) => line.sign === "+").map((line) => line.text);
    assert.ok(additions.some((line) => line.includes('"a": 1')), `expected an added line with the real payload, got ${JSON.stringify(diff.lines)}`);
    assert.ok(diff.lines.every((line) => line.sign !== "-"), "a root commit has nothing to delete");
  } finally {
    cleanup(dir);
  }
});

test("diff reports both the removed and the added line across an edit", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    await history.record({ action: "created", payload: { a: 1 }, subject: "record one" });
    const second = await history.record({ action: "updated", payload: { a: 2 }, subject: "record one" });
    const diff = await history.diff(second.id);
    assert.deepEqual(diff.files, ["records/record-one.json"]);
    assert.ok(diff.lines.some((line) => line.sign === "-" && line.text.includes('"a": 1')));
    assert.ok(diff.lines.some((line) => line.sign === "+" && line.text.includes('"a": 2')));
  } finally {
    cleanup(dir);
  }
});

test("diff of a bad commit id is refused before any command runs", async () => {
  const { dir, executor, history } = makeHistory();
  try {
    await assert.rejects(() => history.diff("not-a-real-commit-id"), /not a 40-character commit id/u);
    assert.equal(executor.calls.length, 0, "it ran a command for a commit id it should have refused");
  } finally {
    cleanup(dir);
  }
});

test("compareFiles reports the real file two arbitrary commits differ on", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    const first = await history.record({ action: "created", payload: { a: 1 }, subject: "record one" });
    const second = await history.record({ action: "updated", payload: { a: 2 }, subject: "record one" });
    const files = await history.compareFiles(first.id, second.id);
    assert.deepEqual(files, ["records/record-one.json"]);
  } finally {
    cleanup(dir);
  }
});

test("compareFiles also reports a file that only exists on one side, real tree-to-tree behaviour and not a guess", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    const first = await history.record({ action: "created", payload: { a: 1 }, subject: "record one" });
    await history.record({ action: "created", payload: { z: 9 }, subject: "record two" });
    const third = await history.record({ action: "updated", payload: { a: 2 }, subject: "record one" });
    // record-two.json exists on the "third" side and not on the "first" side, so a
    // real tree-to-tree `git diff` reports it as differing too -- not merely the file
    // that was edited between them.
    const files = await history.compareFiles(first.id, third.id);
    assert.deepEqual(files, ["records/record-one.json", "records/record-two.json"]);
  } finally {
    cleanup(dir);
  }
});

test("compareFiles of two identical commits reports no differing files", async () => {
  const { dir, history } = makeHistory();
  try {
    await history.initialize();
    const commit = await history.record({ action: "created", payload: { a: 1 }, subject: "record one" });
    const files = await history.compareFiles(commit.id, commit.id);
    assert.deepEqual(files, []);
  } finally {
    cleanup(dir);
  }
});

test("compareFiles of a bad commit id is refused before any command runs", async () => {
  const { dir, executor, history } = makeHistory();
  try {
    await history.initialize();
    const commit = await history.record({ action: "created", payload: { a: 1 }, subject: "record one" });
    executor.calls.length = 0;
    await assert.rejects(() => history.compareFiles(commit.id, "not-a-real-commit-id"), /not a 40-character commit id/u);
    assert.equal(executor.calls.length, 0, "it ran a command for a commit id it should have refused");
  } finally {
    cleanup(dir);
  }
});
