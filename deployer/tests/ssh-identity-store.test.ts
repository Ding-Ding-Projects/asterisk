import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SshIdentityStore, validateSshIdentityShape } from "../control-plane/ssh-identity-store.js";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "ding-deployer-ssh-store-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("validateSshIdentityShape rejects an invalid host", () => {
  assert.match(validateSshIdentityShape("not a host!", 22, "root") ?? "", /Host/u);
});

test("validateSshIdentityShape rejects an out-of-range port", () => {
  assert.match(validateSshIdentityShape("10.0.0.1", 99999, "root") ?? "", /Port/u);
});

test("validateSshIdentityShape accepts a valid identity", () => {
  assert.equal(validateSshIdentityShape("10.0.0.1", 22, "root"), undefined);
});

test("load returns empty when no store file exists yet", async () => {
  await withTempDir(async (dir) => {
    const store = new SshIdentityStore(join(dir, "nested", "identities.json"));
    const loaded = await store.load();
    assert.deepEqual(loaded, []);
  });
});

test("add persists an identity, and it survives a fresh store instance reading the same path", async () => {
  await withTempDir(async (dir) => {
    const path = join(dir, "identities.json");
    const store = new SshIdentityStore(path);
    const result = await store.add("192.168.50.60", 22, "root", "branch office");
    assert.equal(result.ok, true);

    const reopened = new SshIdentityStore(path);
    const loaded = await reopened.load();
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0]?.host, "192.168.50.60");
    assert.deepEqual(reopened.identities(), [{ host: "192.168.50.60", port: 22 }]);
  });
});

test("add is idempotent for an already-approved host:port", async () => {
  await withTempDir(async (dir) => {
    const store = new SshIdentityStore(join(dir, "identities.json"));
    await store.add("10.0.0.5", 22, "root");
    await store.add("10.0.0.5", 22, "root");
    assert.equal(store.list().length, 1);
  });
});

test("add refuses a malformed identity and does not persist it", async () => {
  await withTempDir(async (dir) => {
    const path = join(dir, "identities.json");
    const store = new SshIdentityStore(path);
    const result = await store.add("not a host!", 22, "root");
    assert.equal(result.ok, false);
    const reopened = new SshIdentityStore(path);
    assert.deepEqual(await reopened.load(), []);
  });
});

test("remove drops exactly the named host:port and nothing else", async () => {
  await withTempDir(async (dir) => {
    const store = new SshIdentityStore(join(dir, "identities.json"));
    await store.add("10.0.0.5", 22, "root");
    await store.add("10.0.0.6", 22, "root");
    await store.remove("10.0.0.5", 22);
    assert.deepEqual(store.identities(), [{ host: "10.0.0.6", port: 22 }]);
  });
});

test("a corrupt store file is treated as empty rather than crashing the load", async () => {
  await withTempDir(async (dir) => {
    const path = join(dir, "identities.json");
    const { writeFile, mkdir } = await import("node:fs/promises");
    await mkdir(dir, { recursive: true });
    await writeFile(path, "{ not valid json", "utf8");
    const store = new SshIdentityStore(path);
    assert.deepEqual(await store.load(), []);
  });
});
