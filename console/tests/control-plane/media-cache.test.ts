import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";


import { parseMediaCacheItems } from "../../control-plane/asterisk-parsers.js";
import {
  READ_ONLY_COMMANDS,
  READ_ONLY_OBJECT_COMMANDS,
  isAllowedCommandLine,
} from "../../control-plane/asterisk-readings.js";

/**
 * `media cache show all` and the parser that reads it.
 *
 * The allowlist used to carry the bare `media cache show`, which is the singular CLI entry
 * (`main/media_cache.c` line 528) and refuses any argc but 4, so allowlisted without its
 * `<uri>` it could only ever answer with a usage line -- and `AsteriskReadings` diverts on
 * `No such command` but not on `Usage:`, so that line reached a screen as though it were
 * data. `media cache show all` (line 477) is the container listing that actually produces
 * a reading.
 */

const CAPTURES = join(
  import.meta.dirname,
  "..",
  "..",
  "release",
  "evidence",
  "live-exchange",
  "readings",
  "added",
);

const capture = (state: string) =>
  readFileSync(join(CAPTURES, `media-cache-show-all.${state}.txt`), "utf8");

test("the allowlist carries the container listing and not the singular form", () => {
  const commands: readonly string[] = READ_ONLY_COMMANDS;
  assert.ok(commands.includes("media cache show all"));
  /* Exact equality, not a prefix: `isAllowedCommandLine` matches this list by equality, so
   * the bare singular must not be reachable through it either. */
  assert.ok(!commands.includes("media cache show"));
  assert.equal(isAllowedCommandLine("media cache show all"), true);
  assert.equal(isAllowedCommandLine("media cache show"), false);
});

test("the singular form is refused however its URI is spelled", () => {
  /* The reason it is not an object command: its id is a URI, and `OBJECT_ID` admits no `:`
   * and no `/` on purpose. If that decision is ever reversed this test fails, which is the
   * point -- widening the one check between a target-supplied string and an `asterisk -rx`
   * argument should be a decision somebody makes rather than one that happens. */
  assert.equal(isAllowedCommandLine("media cache show http://example.com/a.gsm"), false);
  assert.equal(isAllowedCommandLine("media cache show all extra"), false);
  const objects: readonly string[] = READ_ONLY_OBJECT_COMMANDS;
  assert.deepEqual([...objects], ["pjsip show endpoint"]);
});

test("the dispatcher reads the cache for the Music on Hold view", () => {
  /* `parsedView` is a closure inside `createControlPlaneDispatcher` and reaching it needs a
   * real WSL discovery run, so this asserts the wiring line itself -- the same route
   * `readView routes the endpoints view` takes in asterisk-readings.test.ts. Anchored to a
   * whole line on purpose: a substring needle for `media cache show all` is satisfied by a
   * commented-out call, which is how a wiring line usually dies. Without this the reading
   * could be deleted from the dispatcher and every other test here would stay green, since
   * they all feed the parser and the screen their own bytes. */
  const source = readFileSync(new URL("../../control-plane/dispatch.ts", import.meta.url), "utf8").replace(/\r/gu, "");
  assert.ok(source.length > 1000, "dispatch.ts was not read");
  assert.match(source, /^\s*readHere\('media cache show all', parseMediaCacheItems\),$/mu);
});

test("an empty cache parses to no items rather than to the header", () => {
  /* The live target's own bytes, before anything was fetched. The header is `URI` followed
   * by a tab-indented `Local File`, which is exactly the shape of one item -- so a parser
   * that paired continuation lines from the top would invent an item whose URI is the word
   * `URI`. That is the single most likely way to get this wrong. */
  const result = parseMediaCacheItems(capture("unpopulated"));
  assert.deepEqual(result.items, []);
  assert.deepEqual(result.dropped, []);
});

test("the live populated capture parses to both of its items", () => {
  const result = parseMediaCacheItems(capture("populated"));
  assert.deepEqual(result.items, [
    { uri: "http://127.0.0.1:18080/probe.gsm", localFile: "/var/cache/asterisk/bucket-HDzQa1.gsm" },
    {
      uri: "http://127.0.0.1:18080/a-deliberately-long-path-that-overruns-forty-columns.gsm",
      localFile: "/var/cache/asterisk/bucket-OMdQWL.gsm",
    },
  ]);
  assert.deepEqual(result.dropped, []);
});

test("a URI past the forty-column pad is read in full, because %-40s has no precision", () => {
  /* This is the property the parser rests on and the reason it needs no dropped-row branch
   * of the kind `parseVoicemailUsers` needs. It is asserted against the real capture rather
   * than a fixture: the long URI is 78 characters and arrives with no padding at all, while
   * the short one is padded out to 40. */
  const [short, long] = parseMediaCacheItems(capture("populated")).items;
  assert.ok(long.uri.length > 40, `expected a URI past the pad, got ${long.uri.length}`);
  assert.ok(!long.uri.endsWith(" "));
  /* The short one proves the other half: it is inside the pad, so the target padded it, and
   * the parser has to take that padding off. Asserting only the long one would pass on a
   * parser that never trimmed at all. */
  assert.ok(short.uri.length < 40);
  assert.ok(!short.uri.endsWith(" "));
});

test("the after-restore capture is byte-identical to the unpopulated one", () => {
  /* The evidence claim that the harness put the target back, re-derived here from the
   * committed bytes rather than taken from the harness's own word for it. */
  assert.equal(capture("after-restore"), capture("unpopulated"));
});

test("a listing with no separator yields nothing rather than guessing", () => {
  const truncated = "URI\n\tLocal File\n";
  const result = parseMediaCacheItems(truncated);
  assert.deepEqual(result.items, []);
});

test("a URI line whose local file never arrived is recorded, not discarded", () => {
  const truncated = "URI\n\tLocal File\n---------------\nhttp://example.com/a.gsm\n";
  const result = parseMediaCacheItems(truncated);
  assert.deepEqual(result.items, []);
  assert.deepEqual(result.dropped, ["http://example.com/a.gsm"]);
});

test("a stray continuation line is recorded, not attributed to the previous item", () => {
  const stray = [
    "URI",
    "\tLocal File",
    "---------------",
    "http://example.com/a.gsm",
    "\t/var/cache/asterisk/a.gsm",
    "\t/var/cache/asterisk/orphan.gsm",
    "",
  ].join("\n");
  const result = parseMediaCacheItems(stray);
  assert.deepEqual(result.items, [
    { uri: "http://example.com/a.gsm", localFile: "/var/cache/asterisk/a.gsm" },
  ]);
  assert.deepEqual(result.dropped, ["\t/var/cache/asterisk/orphan.gsm"]);
});

test("a blank local file is absent rather than an empty string", () => {
  /* `bucket_file->path` can be empty, and `%-40s` prints it as forty spaces. An item whose
   * URI is real and whose local file the target left blank is a fact, not a parse failure,
   * so the item survives and the field is simply not there for a caller to render. */
  const blank = `URI\n\tLocal File\n---------------\nhttp://example.com/a.gsm\n\t${" ".repeat(40)}\n`;
  const result = parseMediaCacheItems(blank);
  assert.deepEqual(result.items, [{ uri: "http://example.com/a.gsm", localFile: undefined }]);
});

test("CRLF output parses the same as LF", () => {
  /* A capture checked out on Windows without the repository's `.gitattributes` pin would
   * arrive CRLF, and a parser that split pairs on a bare `\n` would carry a stray carriage
   * return into every local file. */
  const lf = capture("populated");
  assert.deepEqual(
    parseMediaCacheItems(lf.replace(/\n/gu, "\r\n")),
    parseMediaCacheItems(lf),
  );
});
