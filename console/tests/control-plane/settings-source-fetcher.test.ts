/**
 * The privileged settings-source fetch.
 *
 * Almost every test is about a refusal, and about the refusal happening at the right
 * moment. Noticing a redirect after following one is too late: the token has already
 * been sent to a host nobody validated. Measuring a body after reading it whole is too
 * late for the same reason in a different currency.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { SettingsSourceFetcher } from "../../control-plane/settings-source-fetcher.js";

const TOKEN = "a-real-looking-token-value";

/** A fetch stand-in that records what it was asked to do. */
const recordingFetch = (respond: () => Response) => {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (input: unknown, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return respond();
  }) as unknown as typeof fetch;
  return { impl, calls };
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const fetcherWith = (respond: () => Response, allowedHosts = ["settings.example.net"]) => {
  const { impl, calls } = recordingFetch(respond);
  return {
    calls,
    fetcher: new SettingsSourceFetcher({
      allowedHosts,
      readToken: async () => TOKEN,
      fetchImpl: impl,
    }),
  };
};

/* --- the host allowlist ------------------------------------------------------------- */

test("a host nobody agreed to is refused before any request is made", () => {
  /* A compromised settings file must not be able to repoint the fetch at an internal
   * address and make this process the thing that reaches it. */
  const { fetcher, calls } = fetcherWith(() => json({}));
  return fetcher.fetchSource({ url: "https://192.168.0.1/admin" }).then((result) => {
    assert.equal(result.ok, false);
    assert.match(result.reason ?? "", /not an allowed source host/u);
    assert.equal(calls.length, 0, "a request was made to a host that was refused");
  });
});

test("an empty allowlist refuses everything rather than permitting everything", () => {
  /* The safe direction: a fetcher configured with nothing is not a fetcher configured
   * with no restrictions. */
  const { fetcher } = fetcherWith(() => json({}), []);
  return fetcher.fetchSource({ url: "https://settings.example.net/x" }).then((result) => {
    assert.equal(result.ok, false);
  });
});

test("the allowlist compares the host only, so a path cannot smuggle another host past it", () => {
  const { fetcher } = fetcherWith(() => json({}));
  assert.equal(fetcher.allows("https://settings.example.net/settings.example.net"), true);
  assert.equal(fetcher.allows("https://evil.example.com/settings.example.net"), false);
  assert.equal(fetcher.allows("https://SETTINGS.EXAMPLE.NET/x"), true);
});

/* --- the URL ------------------------------------------------------------------------- */

test("plain HTTP is refused except on loopback", () => {
  const { fetcher } = fetcherWith(() => json({}), ["settings.example.net", "localhost"]);
  return Promise.all([
    fetcher.fetchSource({ url: "http://settings.example.net/x" }),
    fetcher.fetchSource({ url: "http://localhost:8123/api" }),
  ]).then(([remote, loopback]) => {
    assert.equal(remote.ok, false);
    assert.match(remote.reason ?? "", /Only HTTPS/u);
    assert.equal(loopback.ok, true);
  });
});

test("a URL carrying credentials is refused rather than quietly stripped", () => {
  /* A configuration mistake somebody should be told about, not one to paper over. */
  const { fetcher, calls } = fetcherWith(() => json({}));
  return fetcher.fetchSource({ url: "https://user:pw@settings.example.net/x" }).then((result) => {
    assert.equal(result.ok, false);
    assert.match(result.reason ?? "", /carries credentials/u);
    assert.equal(calls.length, 0);
  });
});

/* --- the token ------------------------------------------------------------------------ */

test("the token is sent as a header and never appears in the URL", () => {
  const { fetcher, calls } = fetcherWith(() => json({}));
  return fetcher.fetchSource({ url: "https://settings.example.net/x", credentialKey: "k" }).then(() => {
    const headers = calls[0].init.headers as Record<string, string>;
    assert.equal(headers.authorization, `Bearer ${TOKEN}`);
    assert.ok(!calls[0].url.includes(TOKEN), "the token reached the URL");
  });
});

test("no returned value carries the token, on success or on failure", () => {
  /* A result is logged and shown; a token in one leaves through both. */
  const { fetcher } = fetcherWith(() => json({ lang_mode: "English" }));
  const broken = new SettingsSourceFetcher({
    allowedHosts: ["settings.example.net"],
    readToken: async () => TOKEN,
    fetchImpl: (async () => { throw new Error(`failed for https://user:${TOKEN}@x/`); }) as unknown as typeof fetch,
  });
  return Promise.all([
    fetcher.fetchSource({ url: "https://settings.example.net/x", credentialKey: "k" }),
    broken.fetchSource({ url: "https://settings.example.net/x", credentialKey: "k" }),
  ]).then(([good, bad]) => {
    assert.ok(!JSON.stringify(good).includes(TOKEN));
    assert.ok(!JSON.stringify(bad).includes(TOKEN), "the failure reason leaked the token");
  });
});

test("a failure reason comes from the error name rather than its message", () => {
  /* A message can carry a URL, and a URL can carry whatever somebody put in it. */
  const fetcher = new SettingsSourceFetcher({
    allowedHosts: ["settings.example.net"],
    fetchImpl: (async () => { throw new Error("connect ECONNREFUSED 10.0.0.5:443"); }) as unknown as typeof fetch,
  });
  return fetcher.fetchSource({ url: "https://settings.example.net/x" }).then((result) => {
    assert.equal(result.ok, false);
    assert.ok(!(result.reason ?? "").includes("10.0.0.5"), "an internal address reached the reason");
  });
});

test("no token is sent when the source names no credential", () => {
  const { fetcher, calls } = fetcherWith(() => json({}));
  return fetcher.fetchSource({ url: "https://settings.example.net/x" }).then(() => {
    const headers = calls[0].init.headers as Record<string, string>;
    assert.equal(headers.authorization, undefined);
  });
});

/* --- redirects and size, both refused at the transport ---------------------------------- */

test("the transport is told to refuse redirects rather than to follow and report them", () => {
  /* By the time a redirect has been followed, a request carrying the token has already
   * reached a host this console never validated. */
  const { fetcher, calls } = fetcherWith(() => json({}));
  return fetcher.fetchSource({ url: "https://settings.example.net/x" }).then(() => {
    assert.equal(calls[0].init.redirect, "error");
  });
});

test("a body larger than the cap is not returned at all", () => {
  /* Not truncated: a truncated JSON document parses as a failure at best and as
   * something different at worst. */
  const big = "x".repeat(5000);
  const { fetcher } = fetcherWith(() => new Response(big, { status: 200 }));
  return fetcher.fetchSource({ url: "https://settings.example.net/x", maxBytes: 1000 }).then((result) => {
    assert.equal(result.ok, false);
    assert.equal(result.body, "");
    assert.match(result.reason ?? "", /larger than 1000 bytes/u);
  });
});

test("a body inside the cap is returned whole", () => {
  const { fetcher } = fetcherWith(() => json({ lang_mode: "English" }));
  return fetcher.fetchSource({ url: "https://settings.example.net/x" }).then((result) => {
    assert.equal(result.ok, true);
    assert.deepEqual(JSON.parse(result.body), { lang_mode: "English" });
    assert.ok(result.byteLength > 0);
  });
});

/* --- ordinary outcomes -------------------------------------------------------------------- */

test("a non-2xx answer is reported with its status rather than thrown on", () => {
  const { fetcher } = fetcherWith(() => json({ error: "nope" }, 503));
  return fetcher.fetchSource({ url: "https://settings.example.net/x" }).then((result) => {
    assert.equal(result.ok, false);
    assert.equal(result.status, 503);
  });
});

test("a timeout is reported as one rather than as an unreachable host", () => {
  /* They are different problems with different fixes, and a person reading the notice
   * needs to know which they have. */
  const fetcher = new SettingsSourceFetcher({
    allowedHosts: ["settings.example.net"],
    fetchImpl: (async () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    }) as unknown as typeof fetch,
  });
  return fetcher.fetchSource({ url: "https://settings.example.net/x" }).then((result) => {
    assert.match(result.reason ?? "", /did not answer in time/u);
  });
});

test("an unparseable URL is refused without reaching the transport", () => {
  const { fetcher, calls } = fetcherWith(() => json({}));
  return fetcher.fetchSource({ url: "not a url" }).then((result) => {
    assert.equal(result.ok, false);
    assert.equal(calls.length, 0);
  });
});
