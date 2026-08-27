/**
 * The dispatch action joining a settings source's two halves.
 *
 * The distinction these tests exist for: a source answering 503 is a REQUEST THAT
 * SUCCEEDED and a response the renderer must classify, while a refused host is a request
 * that was never made. Collapsing the two would hide the status behind a generic error
 * and lose the difference between "the source said no" and "the source was never asked".
 */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createControlPlaneDispatcher } from "../../control-plane/dispatch.js";

const TOKEN = "a-real-looking-token-value";

const dispatcherWith = (options: {
  allowedSettingsSourceHosts?: readonly string[];
} = {}) => {
  const userDataPath = mkdtempSync(join(tmpdir(), "ding-source-"));
  return createControlPlaneDispatcher({
    userDataPath,
    resourcesPath: userDataPath,
    hosted: true,
    allowedSettingsSourceHosts: options.allowedSettingsSourceHosts,
    readSettingsSourceToken: async () => TOKEN,
  });
};

const fetchSource = (
  dispatcher: ReturnType<typeof createControlPlaneDispatcher>,
  payload: Record<string, unknown>,
) => dispatcher.controlPlaneRequest({
  requestId: "r1", action: "settings.source.fetch", payload,
});

test("a URL is required, and its absence is a named refusal rather than a crash", () => {
  const dispatcher = dispatcherWith({ allowedSettingsSourceHosts: ["settings.example.net"] });
  return fetchSource(dispatcher, {}).then((response) => {
    assert.equal(response.ok, false);
    assert.equal(response.ok === false ? response.code : "", "SOURCE_URL_REQUIRED");
  });
});

test("a host nobody allowed is a control-plane failure, since no response exists to classify", () => {
  const dispatcher = dispatcherWith({ allowedSettingsSourceHosts: ["settings.example.net"] });
  return fetchSource(dispatcher, { url: "https://192.168.0.1/admin" }).then((response) => {
    assert.equal(response.ok, false);
    assert.equal(response.ok === false ? response.code : "", "SOURCE_UNREACHABLE");
    assert.match(response.ok === false ? response.message : "", /not an allowed source host/u);
  });
});

test("the default allowlist is empty, so an unconfigured dispatcher fetches nothing", () => {
  /* A dispatcher configured with no allowlist is not a dispatcher configured with no
   * restrictions, and the default has to be the safe one because it is what ships. */
  const dispatcher = dispatcherWith();
  return fetchSource(dispatcher, { url: "https://settings.example.net/x" }).then((response) => {
    assert.equal(response.ok, false);
    /* Asserting the REASON, not just the failure. The first version of this checked only
     * ok === false, which passed even with the host allowed -- because the fetch then made
     * a real network call that also failed. A test that cannot tell "refused" from
     * "unreachable" passes for the wrong reason and would not have caught a default
     * allowlist quietly gaining entries. */
    assert.match(response.ok === false ? response.message : "", /not an allowed source host/u);
  });
});

test("no refusal message carries the token", () => {
  /* A message reaches the log and the settings surface. */
  const dispatcher = dispatcherWith({ allowedSettingsSourceHosts: ["settings.example.net"] });
  return Promise.all([
    fetchSource(dispatcher, {}),
    fetchSource(dispatcher, { url: "https://192.168.0.1/x", credentialKey: "k" }),
    fetchSource(dispatcher, { url: "https://user:pw@settings.example.net/x", credentialKey: "k" }),
  ]).then((responses) => {
    for (const response of responses) {
      assert.ok(!JSON.stringify(response).includes(TOKEN), "a response carried the token");
    }
  });
});

test("a credentialed URL is refused by the action rather than being sent", () => {
  const dispatcher = dispatcherWith({ allowedSettingsSourceHosts: ["settings.example.net"] });
  return fetchSource(dispatcher, { url: "https://user:pw@settings.example.net/x" }).then((response) => {
    assert.equal(response.ok, false);
    assert.match(response.ok === false ? response.message : "", /carries credentials/u);
  });
});

test("a non-string URL is refused rather than coerced", () => {
  /* Coercing 42 to "42" would produce an unparseable URL and a confusing error a step
   * further along, rather than the accurate one here. */
  const dispatcher = dispatcherWith({ allowedSettingsSourceHosts: ["settings.example.net"] });
  return Promise.all([
    fetchSource(dispatcher, { url: 42 }),
    fetchSource(dispatcher, { url: null }),
    fetchSource(dispatcher, { url: { href: "https://settings.example.net" } }),
  ]).then((responses) => {
    for (const response of responses) {
      assert.equal(response.ok, false);
      assert.equal(response.ok === false ? response.code : "", "SOURCE_URL_REQUIRED");
    }
  });
});

test("the action does not apply anything, it returns what was received", () => {
  /* The renderer's allowlist decides what a body may change. Moving that decision here
   * would put the allowlist somewhere the person configuring the source cannot see it. */
  const source = readFileSync(
    fileURLToPath(new URL("../../control-plane/dispatch.ts", import.meta.url)),
    "utf8",
  );
  assert.ok(!source.includes("applyResponse"), "the dispatcher applies a response itself");
  assert.ok(source.includes("settingsSourceFetcher.fetchSource"), "the action does not call the fetcher");
});
