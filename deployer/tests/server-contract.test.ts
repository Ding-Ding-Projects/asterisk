import test from "node:test";
import assert from "node:assert/strict";
import { parseServerHealth, healthUrl } from "../control-plane/server-contract.js";

test("parseServerHealth accepts a well-formed response", () => {
  const result = parseServerHealth(JSON.stringify({ status: "ok", asteriskVersion: "23.5.0", authRequired: true }));
  assert.equal(result.ok, true);
});

test("parseServerHealth rejects invalid JSON", () => {
  const result = parseServerHealth("<html>not json</html>");
  assert.equal(result.ok, false);
});

test("parseServerHealth rejects a status other than ok", () => {
  const result = parseServerHealth(JSON.stringify({ status: "degraded", asteriskVersion: "23.5.0", authRequired: true }));
  assert.equal(result.ok, false);
});

test("parseServerHealth rejects a missing Asterisk version", () => {
  const result = parseServerHealth(JSON.stringify({ status: "ok", authRequired: true }));
  assert.equal(result.ok, false);
});

test("parseServerHealth rejects a missing authRequired flag", () => {
  const result = parseServerHealth(JSON.stringify({ status: "ok", asteriskVersion: "23.5.0" }));
  assert.equal(result.ok, false);
});

test("healthUrl composes the documented endpoint", () => {
  assert.equal(healthUrl("10.0.0.5", 8088), "http://10.0.0.5:8088/api/v1/health");
});
