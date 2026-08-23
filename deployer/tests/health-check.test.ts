import test from "node:test";
import assert from "node:assert/strict";
import { checkServerHealth, waitForServerHealth, type HttpGetter } from "../control-plane/health-check.js";
import { healthUrl } from "../control-plane/server-contract.js";

test("checkServerHealth verifies by parsing the real response, not by assuming HTTP 200 means healthy", async () => {
  const getter: HttpGetter = { async get() { return { statusCode: 200, body: "not json" }; } };
  const result = await checkServerHealth("10.0.0.5", 8088, getter);
  assert.equal(result.ok, false);
  assert.match(result.reason ?? "", /valid JSON/u);
});

test("checkServerHealth rejects a non-200 status even with a plausible body", async () => {
  const getter: HttpGetter = { async get() { return { statusCode: 503, body: JSON.stringify({ status: "ok", asteriskVersion: "23.5.0", authRequired: true }) }; } };
  const result = await checkServerHealth("10.0.0.5", 8088, getter);
  assert.equal(result.ok, false);
  assert.match(result.reason ?? "", /503/u);
});

test("checkServerHealth accepts a well-formed health response and hits the documented URL", async () => {
  let requested = "";
  const getter: HttpGetter = {
    async get(url) {
      requested = url;
      return { statusCode: 200, body: JSON.stringify({ status: "ok", asteriskVersion: "23.5.0", authRequired: true }) };
    },
  };
  const result = await checkServerHealth("10.0.0.5", 8088, getter);
  assert.equal(result.ok, true);
  assert.equal(result.health?.asteriskVersion, "23.5.0");
  assert.equal(requested, healthUrl("10.0.0.5", 8088));
});

test("checkServerHealth reports a connection failure honestly rather than a generic message", async () => {
  const getter: HttpGetter = { async get() { throw new Error("ECONNREFUSED"); } };
  const result = await checkServerHealth("10.0.0.5", 8088, getter);
  assert.equal(result.ok, false);
  assert.match(result.reason ?? "", /ECONNREFUSED/u);
});

test("waitForServerHealth retries a bounded number of times and returns the last real result", async () => {
  let calls = 0;
  const getter: HttpGetter = {
    async get() {
      calls += 1;
      if (calls < 3) return { statusCode: 503, body: "" };
      return { statusCode: 200, body: JSON.stringify({ status: "ok", asteriskVersion: "23.5.0", authRequired: false }) };
    },
  };
  const result = await waitForServerHealth("10.0.0.5", 8088, { attempts: 5, delayMs: 0, getter });
  assert.equal(result.ok, true);
  assert.equal(calls, 3);
});

test("waitForServerHealth never claims success from an exit-code-shaped signal: repeated bad status stays failed", async () => {
  const getter: HttpGetter = { async get() { return { statusCode: 500, body: "" }; } };
  const result = await waitForServerHealth("10.0.0.5", 8088, { attempts: 3, delayMs: 0, getter });
  assert.equal(result.ok, false);
});
