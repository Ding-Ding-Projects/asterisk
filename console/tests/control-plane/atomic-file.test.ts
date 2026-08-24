import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { atomicWriteFileSync } from "../../control-plane/atomic-file.js";

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "atomic-file-test-"));
}

test("writes the file with the given contents", () => {
  const dir = tempDir();
  try {
    const path = join(dir, "settings.json");
    atomicWriteFileSync(path, JSON.stringify({ a: 1 }));
    assert.equal(readFileSync(path, "utf8"), JSON.stringify({ a: 1 }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("overwrites an existing file completely rather than merging", () => {
  const dir = tempDir();
  try {
    const path = join(dir, "settings.json");
    atomicWriteFileSync(path, "first");
    atomicWriteFileSync(path, "second");
    assert.equal(readFileSync(path, "utf8"), "second");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("creates the destination directory when it does not exist", () => {
  const dir = tempDir();
  try {
    const path = join(dir, "nested", "deeper", "settings.json");
    atomicWriteFileSync(path, "value");
    assert.equal(readFileSync(path, "utf8"), "value");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("leaves no temp file behind after a successful write", () => {
  const dir = tempDir();
  try {
    const path = join(dir, "settings.json");
    atomicWriteFileSync(path, "value");
    const entries = readdirSync(dir);
    assert.deepEqual(entries, ["settings.json"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("retries a rename that fails transiently and still lands the write", () => {
  const dir = tempDir();
  try {
    const path = join(dir, "settings.json");
    // Prime the destination so a rename actually has something to replace.
    atomicWriteFileSync(path, "initial");

    let calls = 0;
    const rename = (from: string, to: string) => {
      calls += 1;
      if (calls < 3) {
        const error = new Error("EBUSY: resource busy or locked") as NodeJS.ErrnoException;
        error.code = "EBUSY";
        throw error;
      }
      renameSync(from, to);
    };
    atomicWriteFileSync(path, "retried-through", { attempts: 5, delayMs: 1, rename });
    assert.equal(calls, 3);
    assert.equal(readFileSync(path, "utf8"), "retried-through");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("gives up after exhausting its attempts, throws, and cleans up the temp file", () => {
  const dir = tempDir();
  try {
    const path = join(dir, "settings.json");
    const rename = () => {
      const error = new Error("EPERM: operation not permitted") as NodeJS.ErrnoException;
      error.code = "EPERM";
      throw error;
    };
    assert.throws(() => atomicWriteFileSync(path, "value", { attempts: 3, delayMs: 1, rename }), /EPERM/);
    // No destination and no leftover temp file.
    const entries = readdirSync(dir);
    assert.deepEqual(entries, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
