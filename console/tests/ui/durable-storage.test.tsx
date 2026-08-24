import test from "node:test";
import assert from "node:assert/strict";
import { createDurableStorage } from "../../app/renderer/src/durable-storage.js";
import type { DurableStorageBridge } from "../../app/renderer/src/durable-storage.js";

function fakeBridge(initial: Record<string, string> = {}): {
  bridge: DurableStorageBridge;
  written: Array<{ action: string; payload: unknown }>;
} {
  const store = { ...initial };
  const written: Array<{ action: string; payload: unknown }> = [];
  const bridge: DurableStorageBridge = {
    controlPlane: {
      async request(request) {
        const action = request.action as string;
        if (action === "settings.snapshot") {
          return { ok: true, data: { values: { ...store } } };
        }
        if (action === "settings.write") {
          const { key, value } = request.payload as { key: string; value: string };
          store[key] = value;
          written.push({ action, payload: request.payload });
          return { ok: true };
        }
        if (action === "settings.remove") {
          const { key } = request.payload as { key: string };
          delete store[key];
          written.push({ action, payload: request.payload });
          return { ok: true };
        }
        return { ok: false };
      },
    },
  };
  return { bridge, written };
}

test("with no bridge, reads answer null until something is written in-session", () => {
  const { storage } = createDurableStorage(undefined);
  assert.equal(storage.getItem("k"), null);
  storage.setItem("k", "v");
  assert.equal(storage.getItem("k"), "v");
});

test("bootstrap loads the persisted snapshot before any read", async () => {
  const { bridge } = fakeBridge({ appearance: "{\"hue\":10}" });
  const { storage, bootstrap } = createDurableStorage(bridge);
  // Before bootstrap resolves, nothing is loaded yet -- fails closed to defaults.
  assert.equal(storage.getItem("appearance"), null);
  await bootstrap();
  assert.equal(storage.getItem("appearance"), "{\"hue\":10}");
});

test("setItem updates the cache synchronously and mirrors the write to the bridge", async () => {
  const { bridge, written } = fakeBridge();
  const { storage, bootstrap } = createDurableStorage(bridge);
  await bootstrap();
  storage.setItem("k", "v");
  // Synchronous read-your-write, before the async mirror has necessarily settled.
  assert.equal(storage.getItem("k"), "v");
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(written.length, 1);
  assert.deepEqual(written[0], { action: "settings.write", payload: { key: "k", value: "v" } });
});

test("removeItem drops the cached value and mirrors the removal", async () => {
  const { bridge, written } = fakeBridge({ k: "v" });
  const { storage, bootstrap } = createDurableStorage(bridge);
  await bootstrap();
  assert.equal(storage.getItem("k"), "v");
  storage.removeItem("k");
  assert.equal(storage.getItem("k"), null);
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(written[0], { action: "settings.remove", payload: { key: "k" } });
});

test("bootstrap only ever loads once, even when called repeatedly", async () => {
  let snapshotCalls = 0;
  const bridge: DurableStorageBridge = {
    controlPlane: {
      async request(request) {
        if (request.action === "settings.snapshot") {
          snapshotCalls += 1;
          return { ok: true, data: { values: {} } };
        }
        return { ok: true };
      },
    },
  };
  const { bootstrap } = createDurableStorage(bridge);
  await Promise.all([bootstrap(), bootstrap(), bootstrap()]);
  await bootstrap();
  assert.equal(snapshotCalls, 1);
});

test("a snapshot request that fails leaves the cache empty rather than throwing", async () => {
  const bridge: DurableStorageBridge = {
    controlPlane: {
      async request(request) {
        if (request.action === "settings.snapshot") throw new Error("no bridge");
        return { ok: true };
      },
    },
  };
  const { storage, bootstrap } = createDurableStorage(bridge);
  await bootstrap();
  assert.equal(storage.getItem("anything"), null);
});

test("bootstrap returns and retains a typed retryable failure, then succeeds within the bound", async () => {
  let attempts = 0;
  const bridge: DurableStorageBridge = {
    controlPlane: {
      async request(request) {
        if (request.action !== "settings.snapshot") return { ok: true };
        attempts += 1;
        if (attempts === 1) throw new Error("temporary bridge failure");
        return { ok: true, data: { values: { restored: "yes" } } };
      },
    },
  };
  const handle = createDurableStorage(bridge);
  const first = await handle.bootstrap();
  assert.equal(first.status, "retryable");
  assert.deepEqual(handle.bootstrapResult(), first);
  assert.equal(handle.storage.getItem("restored"), null);
  const second = await handle.retryBootstrap();
  assert.deepEqual(second, { status: "loaded", restoredKeys: 1, attempt: 2 });
  assert.equal(handle.storage.getItem("restored"), "yes");
});

test("malformed snapshots are retained as malformed rather than becoming default-off loaded state", async () => {
  const bridge: DurableStorageBridge = {
    controlPlane: {
      async request(request) {
        if (request.action === "settings.snapshot") return { ok: true, data: { values: { broken: 7 } } };
        return { ok: true };
      },
    },
  };
  const handle = createDurableStorage(bridge);
  const result = await handle.bootstrap();
  assert.deepEqual(result, { status: "malformed", reason: "invalid-values", attempt: 1 });
  assert.deepEqual(handle.bootstrapResult(), result);
  assert.equal(handle.storage.getItem("broken"), null);
});
