import test from "node:test";
import assert from "node:assert/strict";
import { SettingsRegistry, InMemorySettingsStore } from "../../control-plane/settings-store.js";
import type { SettingsSnapshotStore } from "../../control-plane/settings-store.js";

test("get returns undefined when nothing has been set", () => {
  const registry = new SettingsRegistry();
  assert.equal(registry.get("appearance"), undefined);
});

test("set makes the value readable and persists it to the backing store", () => {
  const store = new InMemorySettingsStore();
  const registry = new SettingsRegistry(store);
  registry.set("appearance", "{\"hue\":148}");
  assert.equal(registry.get("appearance"), "{\"hue\":148}");
  assert.deepEqual(store.read(), { appearance: "{\"hue\":148}" });
});

test("remove drops the key and persists the removal", () => {
  const store = new InMemorySettingsStore();
  const registry = new SettingsRegistry(store);
  registry.set("a", "1");
  registry.set("b", "2");
  registry.remove("a");
  assert.equal(registry.get("a"), undefined);
  assert.equal(registry.get("b"), "2");
  assert.deepEqual(store.read(), { b: "2" });
});

test("remove of a key that was never set does not write to the store", () => {
  let writes = 0;
  const store: SettingsSnapshotStore = {
    read: () => undefined,
    write: () => { writes += 1; },
  };
  const registry = new SettingsRegistry(store);
  registry.remove("never-set");
  assert.equal(writes, 0);
});

test("a fresh registry loads whatever the backing store already had", () => {
  const store = new InMemorySettingsStore();
  store.write({ appearance: "existing" });
  const registry = new SettingsRegistry(store);
  assert.equal(registry.get("appearance"), "existing");
  assert.deepEqual(registry.snapshot(), { appearance: "existing" });
});

test("a store that answers undefined (nothing persisted yet) starts the registry empty", () => {
  const store: SettingsSnapshotStore = { read: () => undefined, write: () => {} };
  const registry = new SettingsRegistry(store);
  assert.deepEqual(registry.snapshot(), {});
});

test("snapshot returns a copy, not a live view into the registry's internal map", () => {
  const registry = new SettingsRegistry();
  registry.set("k", "v");
  const snap = registry.snapshot();
  snap.k = "mutated";
  assert.equal(registry.get("k"), "v");
});
