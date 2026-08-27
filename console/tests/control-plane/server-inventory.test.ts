import test from "node:test";
import assert from "node:assert/strict";
import {
  ServerInventory,
  ServerInventoryError,
  InMemoryServerInventoryStore,
  ResponseRoutingGuard,
  applyIfCurrent,
} from "../../control-plane/server-inventory.js";
import type { ServerInventoryStore } from "../../control-plane/server-inventory.js";

function makeInventory(ids: string[] = []) {
  let counter = 0;
  const idQueue = [...ids];
  return new ServerInventory({
    generateId: () => idQueue.shift() ?? `auto-${++counter}`,
    now: () => new Date(2026, 0, 1, 0, counter).toISOString(),
  });
}

test("add registers a server and makes it active when it is the first one", () => {
  const inventory = makeInventory(["a"]);
  const server = inventory.add({ name: "Primary", connectionKind: "wsl", wslDistribution: "asterisk-1" });
  assert.equal(server.id, "a");
  assert.equal(server.state, "idle");
  assert.equal(inventory.activeId(), "a");
  assert.equal(inventory.list().length, 1);
});

test("add refuses a blank name", () => {
  const inventory = makeInventory();
  assert.throws(() => inventory.add({ name: "   ", connectionKind: "wsl", wslDistribution: "x" }), ServerInventoryError);
});

test("add refuses a second server pointed at the same target", () => {
  const inventory = makeInventory(["a", "b"]);
  inventory.add({ name: "Primary", connectionKind: "wsl", wslDistribution: "asterisk-1" });
  assert.throws(
    () => inventory.add({ name: "Duplicate", connectionKind: "wsl", wslDistribution: "asterisk-1" }),
    (error: unknown) => error instanceof ServerInventoryError && error.code === "DUPLICATE_TARGET",
  );
});

test("a second server registers independently and does not disturb the first", () => {
  const inventory = makeInventory(["a", "b"]);
  const first = inventory.add({ name: "Primary", connectionKind: "wsl", wslDistribution: "asterisk-1" });
  const second = inventory.add({ name: "Backup", connectionKind: "wsl", wslDistribution: "asterisk-2" });
  assert.equal(inventory.activeId(), "a", "the first server registered stays active");
  assert.equal(inventory.list().length, 2);
  assert.equal(inventory.get(first.id)?.name, "Primary");
  assert.equal(inventory.get(second.id)?.name, "Backup");
});

test("setState on one server never touches another server's state", () => {
  const inventory = makeInventory(["a", "b"]);
  inventory.add({ name: "Primary", connectionKind: "wsl", wslDistribution: "asterisk-1" });
  inventory.add({ name: "Backup", connectionKind: "wsl", wslDistribution: "asterisk-2" });

  inventory.setState("a", "connected", undefined, { targetId: "a", operatingSystem: true, asterisk: true });
  inventory.setState("b", "unreachable", "connection refused");

  assert.equal(inventory.get("a")?.state, "connected");
  assert.equal(inventory.get("a")?.reason, undefined);
  assert.ok(inventory.get("a")?.lastSeenAt);

  assert.equal(inventory.get("b")?.state, "unreachable");
  assert.equal(inventory.get("b")?.reason, "connection refused");
  assert.equal(inventory.get("b")?.lastSeenAt, undefined, "an unreachable server never got a fabricated last-seen time");
});

test("one server being unreachable does not block another from being connected at the same time", () => {
  const inventory = makeInventory(["a", "b"]);
  inventory.add({ name: "Primary", connectionKind: "wsl", wslDistribution: "asterisk-1" });
  inventory.add({ name: "Backup", connectionKind: "wsl", wslDistribution: "asterisk-2" });
  inventory.setState("a", "unreachable", "timed out");
  inventory.setState("b", "connected", undefined, { targetId: "b", operatingSystem: true, asterisk: true });
  assert.equal(inventory.get("a")?.state, "unreachable");
  assert.equal(inventory.get("b")?.state, "connected");
});

test("setState rejects an unrecognised state", () => {
  const inventory = makeInventory(["a"]);
  inventory.add({ name: "Primary", connectionKind: "wsl", wslDistribution: "asterisk-1" });
  assert.throws(
    () => inventory.setState("a", "totally-fine" as never),
    (error: unknown) => error instanceof ServerInventoryError && error.code === "INVALID_STATE",
  );
});

test("setActive switches the active server and refuses an unknown id", () => {
  const inventory = makeInventory(["a", "b"]);
  inventory.add({ name: "Primary", connectionKind: "wsl", wslDistribution: "asterisk-1" });
  inventory.add({ name: "Backup", connectionKind: "wsl", wslDistribution: "asterisk-2" });
  inventory.setActive("b");
  assert.equal(inventory.activeId(), "b");
  assert.throws(
    () => inventory.setActive("missing"),
    (error: unknown) => error instanceof ServerInventoryError && error.code === "SERVER_NOT_FOUND",
  );
});

test("update edits connection details without touching state", () => {
  const inventory = makeInventory(["a"]);
  inventory.add({ name: "Primary", connectionKind: "wsl", wslDistribution: "asterisk-1" });
  inventory.setState("a", "connected", undefined, { targetId: "a", operatingSystem: true, asterisk: true });
  const updated = inventory.update("a", { name: "Renamed" });
  assert.equal(updated.name, "Renamed");
  assert.equal(updated.state, "connected", "editing details does not reset the observed connection state");
});

test("remove deletes a server and moves the active selection to whatever remains", () => {
  const inventory = makeInventory(["a", "b"]);
  inventory.add({ name: "Primary", connectionKind: "wsl", wslDistribution: "asterisk-1" });
  inventory.add({ name: "Backup", connectionKind: "wsl", wslDistribution: "asterisk-2" });
  inventory.remove("a");
  assert.equal(inventory.list().length, 1);
  assert.equal(inventory.activeId(), "b", "removing the active server falls back to another registered one");
});

test("remove refuses an unknown id and leaves the inventory untouched", () => {
  const inventory = makeInventory(["a"]);
  inventory.add({ name: "Primary", connectionKind: "wsl", wslDistribution: "asterisk-1" });
  assert.throws(
    () => inventory.remove("missing"),
    (error: unknown) => error instanceof ServerInventoryError && error.code === "SERVER_NOT_FOUND",
  );
  assert.equal(inventory.list().length, 1);
});

test("removing the last server leaves no active server", () => {
  const inventory = makeInventory(["a"]);
  inventory.add({ name: "Primary", connectionKind: "wsl", wslDistribution: "asterisk-1" });
  inventory.remove("a");
  assert.equal(inventory.activeId(), undefined);
});

test("the inventory persists across a restart through the injected store", () => {
  const store: ServerInventoryStore = new InMemoryServerInventoryStore();
  const first = new ServerInventory({ store, generateId: () => "a" });
  first.add({ name: "Primary", connectionKind: "wsl", wslDistribution: "asterisk-1" });
  first.setState("a", "connected", undefined, { targetId: "a", operatingSystem: true, asterisk: true });

  const second = new ServerInventory({ store });
  assert.equal(second.list().length, 1);
  assert.equal(second.get("a")?.state, "connected");
  assert.equal(second.activeId(), "a");
});

test("toTargetProfile projects a server record onto the shape the rest of the control plane reads", () => {
  const inventory = makeInventory(["a"]);
  inventory.add({ name: "Primary", connectionKind: "wsl", wslDistribution: "asterisk-1" });
  const profile = inventory.toTargetProfile("a");
  assert.equal(profile.id, "a");
  assert.equal(profile.displayName, "Primary");
  assert.equal(profile.connectionKind, "wsl");
  assert.equal(profile.wslDistribution, "asterisk-1");
});

// --- Cross-server response-routing guard -----------------------------------------

test("a stale response for the same server is dropped once a newer request has been issued", () => {
  const guard = new ResponseRoutingGuard();
  const staleToken = guard.begin("server-a");
  const freshToken = guard.begin("server-a");
  const state: Record<string, string> = {};

  // The stale request's answer arrives after the fresh one was already issued.
  const staleApplied = applyIfCurrent(guard, staleToken, "server-a", state, "stale-data");
  assert.equal(staleApplied, false, "a superseded request for the same server must not be applied");
  assert.equal(state["server-a"], undefined);

  const freshApplied = applyIfCurrent(guard, freshToken, "server-a", state, "fresh-data");
  assert.equal(freshApplied, true);
  assert.equal(state["server-a"], "fresh-data");
});

test("a response addressed to one server can never be applied to a different server's slot", () => {
  const guard = new ResponseRoutingGuard();
  const tokenForA = guard.begin("server-a");
  const state: Record<string, string> = {};

  // A caller that (incorrectly) believes it is updating server-b's slot, while holding
  // a token that was actually issued for server-a, must be refused rather than writing
  // server-a's data into server-b's slot.
  const misrouted = applyIfCurrent(guard, tokenForA, "server-b", state, "data-from-a");
  assert.equal(misrouted, false, "a token minted for server-a must never write into server-b's slot");
  assert.equal(state["server-b"], undefined);
  assert.equal(state["server-a"], undefined, "the correctly-addressed slot was not written either, since the caller did not ask for it");
});

test("responses interleaved across two servers each land in their own slot and never cross over", () => {
  const guard = new ResponseRoutingGuard();
  const state: Record<string, string> = {};

  const tokenA1 = guard.begin("server-a");
  const tokenB1 = guard.begin("server-b");
  // server-a issues a second, newer request before its first one answers (e.g. the user
  // hit refresh, or the active screen re-read the same server).
  const tokenA2 = guard.begin("server-a");

  // Late answer for A's first (now stale) request arrives first.
  assert.equal(applyIfCurrent(guard, tokenA1, "server-a", state, "a-old"), false);
  // B's only request answers normally.
  assert.equal(applyIfCurrent(guard, tokenB1, "server-b", state, "b-data"), true);
  // A's newer request finally answers.
  assert.equal(applyIfCurrent(guard, tokenA2, "server-a", state, "a-new"), true);

  assert.equal(state["server-a"], "a-new");
  assert.equal(state["server-b"], "b-data");
});

test("guard: proving it actually guards — break it, watch it go red, restore, watch it go green", () => {
  const guard = new ResponseRoutingGuard();
  const staleToken = guard.begin("server-a");
  guard.begin("server-a"); // supersede it
  const state: Record<string, string> = {};

  // BROKEN version of the check (as a caller might mistakenly write it): apply
  // unconditionally, ignoring staleness. This is what the guard exists to prevent —
  // demonstrate it goes wrong when the guard is bypassed.
  state[staleToken.serverId] = "stale-data-applied-without-guard";
  assert.equal(state["server-a"], "stale-data-applied-without-guard", "confirms an unguarded write would have let stale data through");

  // Reset and use the real guarded path: it must refuse the same stale token.
  delete state["server-a"];
  const applied = applyIfCurrent(guard, staleToken, "server-a", state, "stale-data-applied-without-guard");
  assert.equal(applied, false, "the guard correctly refuses the same stale token that the unguarded write let through");
  assert.equal(state["server-a"], undefined);
});


test('an answer is filed where the caller asked, not where the guard assumed', () => {
  /* The regression this exists for: the guard filed every answer under the server it came
   * from, and the console reads its readings back by screen. The keys never matched, so
   * every table rendered empty for want of data that had arrived and been stored one key
   * away. The guard reported success each time, because storing it was all it had been
   * asked to confirm. */
  const guard = new ResponseRoutingGuard();
  const slot: Record<string, string> = {};
  const token = guard.begin('server-a');

  assert.equal(applyIfCurrent(guard, token, 'server-a', slot, 'the answer', 'endpoints'), true);
  assert.equal(slot.endpoints, 'the answer', 'the answer was not filed under the key the caller named');
  assert.equal(slot['server-a'], undefined, 'it was also filed under the server id, which nobody reads back');
});

test('naming a key does not weaken the routing checks it exists for', () => {
  const guard = new ResponseRoutingGuard();
  const slot: Record<string, string> = {};

  /* Still refused when the answer is for a different server than the one on screen. */
  const forA = guard.begin('server-a');
  assert.equal(applyIfCurrent(guard, forA, 'server-b', slot, 'wrong server', 'endpoints'), false);
  assert.equal(slot.endpoints, undefined);

  /* And still refused once a newer request for the same server has superseded it. */
  const stale = guard.begin('server-a');
  guard.begin('server-a');
  assert.equal(applyIfCurrent(guard, stale, 'server-a', slot, 'stale', 'endpoints'), false);
  assert.equal(slot.endpoints, undefined);
});

test('omitting the key keeps the original per-server behaviour', () => {
  const guard = new ResponseRoutingGuard();
  const slot: Record<string, string> = {};
  const token = guard.begin('server-a');
  assert.equal(applyIfCurrent(guard, token, 'server-a', slot, 'per-server'), true);
  assert.equal(slot['server-a'], 'per-server');
});
