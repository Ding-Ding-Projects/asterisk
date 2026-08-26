/**
 * Contract: reading a configuration file and writing it back unchanged must not change it.
 *
 * This is the property the console's whole write path rests on, and it was false. Two
 * separate defects, both measured against a real Asterisk installation rather than a
 * fixture:
 *
 *   1. `exten => 8100` read back as key `exten`, value `> 8100`, and rendered as
 *      `exten = > 8100`. Asterisk loaded an extension literally named `>8100`. An unchanged
 *      round trip of `extensions.conf` took it from 61 `exten =>` lines to zero.
 *
 *   2. Rendering regenerated the file from the parsed shape, which holds no comments. The
 *      same file lost 606 of its 880 lines -- every comment explaining what the dialplan
 *      does. The settings survived; the reasons for them did not.
 *
 * Neither could be caught by the checks that existed. `validate` and the post-read
 * comparison both compare the *parsed* structure, and the structure round-trips
 * consistently through both bugs -- so the transaction reported "Configuration applied and
 * verified" over a flattened dialplan. A test that compares parsed shapes would agree with
 * it. This one compares text.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { parseConfig, renderConfig, renderConfigOver } from "../../control-plane/wsl-config-transport.js";

const LF = String.fromCharCode(10);

/** A file with every shape these configurations actually use. */
const SAMPLE = [
  "; a leading comment",
  ";",
  "[general]",
  "static = yes            ; a trailing comment on an entry",
  "writeprotect=no",
  "",
  "; a comment inside a section",
  "[demo]",
  "exten => 8100,1,NoOp(hello)",
  "exten => 8100,n,Hangup()",
  "same  =>  n,Answer()",
  "include => other-context",
  "",
  "[codecs]",
  "allow = ulaw",
  "allow = alaw",
  "allow = g722",
].join(LF) + LF;

test("an unchanged round trip returns the file byte for byte", () => {
  const parsed = parseConfig(SAMPLE);
  assert.ok(parsed.length > 0, "the sample parsed to nothing, so this would prove nothing");
  assert.equal(renderConfigOver(parsed, SAMPLE), SAMPLE);
});

test("every arrow separator survives, because Asterisk reads the two forms differently", () => {
  const arrowsBefore = SAMPLE.split("=>").length - 1;
  assert.equal(arrowsBefore, 4, "the sample must contain arrows for this to mean anything");
  const rendered = renderConfigOver(parseConfig(SAMPLE), SAMPLE);
  assert.equal(rendered.split("=>").length - 1, arrowsBefore);
});

test("comments survive, including one trailing an entry", () => {
  const commentsBefore = SAMPLE.split(LF).filter((line) => line.trim().startsWith(";")).length;
  /* Three lines begin with a semicolon. The fourth comment in the sample trails a setting
   * on its own line, which is why it is asserted separately below rather than counted. */
  assert.equal(commentsBefore, 3);
  const rendered = renderConfigOver(parseConfig(SAMPLE), SAMPLE);
  assert.equal(rendered.split(LF).filter((line) => line.trim().startsWith(";")).length, commentsBefore);
  assert.ok(rendered.includes("; a trailing comment on an entry"),
    "a comment sharing a line with a setting was dropped");
});

test("a repeated key keeps every one of its occurrences, in order", () => {
  /* Collapsing these would silently remove codecs while looking like a successful write. */
  const rendered = renderConfigOver(parseConfig(SAMPLE), SAMPLE);
  const allows = rendered.split(LF).filter((line) => line.trim().startsWith("allow"));
  assert.deepEqual(allows.map((line) => line.trim()), ["allow = ulaw", "allow = alaw", "allow = g722"]);
});

test("changing one value rewrites that line and leaves every other line alone", () => {
  const parsed = parseConfig(SAMPLE).map((section) =>
    section.name === "general"
      ? { ...section, entries: section.entries.map((e) => (e.key === "writeprotect" ? { ...e, value: "yes" } : e)) }
      : section);
  const rendered = renderConfigOver(parsed, SAMPLE);
  const before = SAMPLE.split(LF);
  const after = rendered.split(LF);
  assert.equal(after.length, before.length, "the line count moved, so something other than the value changed");
  const differing = after.filter((line, i) => line !== before[i]);
  assert.deepEqual(differing, ["writeprotect = yes"],
    "exactly one line should differ, and it should be the one that was edited");
});

test("removing an entry drops only its line", () => {
  const parsed = parseConfig(SAMPLE).map((section) =>
    section.name === "codecs" ? { ...section, entries: section.entries.filter((e) => e.value !== "alaw") } : section);
  const rendered = renderConfigOver(parsed, SAMPLE);
  const missing = SAMPLE.split(LF).filter((line) => !rendered.split(LF).includes(line));
  assert.deepEqual(missing, ["allow = alaw"]);
});

test("a new entry is appended to its own section rather than to the end of the file", () => {
  const parsed = parseConfig(SAMPLE).map((section) =>
    section.name === "codecs" ? { ...section, entries: [...section.entries, { key: "allow", value: "opus" }] } : section);
  const lines = renderConfigOver(parsed, SAMPLE).split(LF);
  const codecs = lines.indexOf("[codecs]");
  assert.ok(codecs >= 0, "the section header went missing");
  assert.ok(lines.slice(codecs).some((line) => line.trim() === "allow = opus"),
    "the new entry did not land inside its section");
});

/**
 * A repeated section name is the shape nearly every real `pjsip.conf` uses, and the write
 * path could not represent one. `renderConfigOver` keyed its desired map by section name, so
 * the last section of a repeated name overwrote every earlier one. Measured against a live
 * Asterisk on this exact text: `type = endpoint` rendered as `type = aor`, `context` and
 * `allow` were deleted, `max_contacts` was inserted into the first section, and parsed entry
 * counts went from [3, 2] to [2, 2] -- on a round trip with no edit in it at all.
 *
 * It failed safe rather than damaging a file, because the transaction compares the parsed
 * post-read against the desired value and rolled the write back. So the cost was that such a
 * resource could not be written by this console at all, and the operator was told
 * `Post-read mismatch`, which names nothing about repeated sections.
 */
const REPEATED = [
  "[6001]",
  "; the endpoint half",
  "type = endpoint",
  "context = default",
  "allow = ulaw",
  "",
  "[6001]",
  "; the aor half",
  "type = aor",
  "max_contacts = 1",
].join(LF) + LF;

test("an unchanged round trip of a repeated section name returns the file byte for byte", () => {
  const parsed = parseConfig(REPEATED);
  assert.deepEqual(parsed.map((section) => [section.name, section.entries.length]),
    [["6001", 3], ["6001", 2]],
    "the sample must parse to two sections of one name, or this proves nothing");
  assert.equal(renderConfigOver(parsed, REPEATED), REPEATED);
});

test("editing one occurrence of a repeated section name leaves the other alone", () => {
  const parsed = parseConfig(REPEATED).map((section, index) => index === 0
    ? { ...section, entries: section.entries.map((e) => (e.key === "context" ? { ...e, value: "inbound" } : e)) }
    : section);
  const before = REPEATED.split(LF);
  const after = renderConfigOver(parsed, REPEATED).split(LF);
  assert.equal(after.length, before.length, "the line count moved, so something other than the value changed");
  assert.deepEqual(after.filter((line, i) => line !== before[i]), ["context = inbound"]);
});

test("a new entry lands in the occurrence that asked for it, not the first of that name", () => {
  const parsed = parseConfig(REPEATED).map((section, index) => index === 1
    ? { ...section, entries: [...section.entries, { key: "remove_existing", value: "yes" }] }
    : section);
  const lines = renderConfigOver(parsed, REPEATED).split(LF);
  const added = lines.findIndex((line) => line.trim() === "remove_existing = yes");
  assert.ok(added >= 0, "the new entry was not written at all");
  /* Both blocks carry the name, so an index is the only thing that can tell them apart. */
  assert.ok(added > lines.indexOf("type = aor"),
    "the entry landed in the endpoint half, which is the collapse this test exists to refuse");
});

test("dropping one occurrence of a repeated name keeps the other, with its own comment", () => {
  const parsed = parseConfig(REPEATED).slice(0, 1);
  const rendered = renderConfigOver(parsed, REPEATED);
  assert.deepEqual(parseConfig(rendered).map((section) => [section.name, section.entries.length]), [["6001", 3]]);
  assert.ok(rendered.includes("; the endpoint half"), "the surviving block lost its comment");
  assert.ok(!rendered.includes("; the aor half"), "the dropped block's comment survived it");
  assert.ok(!rendered.includes("max_contacts"), "an entry of the dropped block survived it");
});

test("an occurrence the original never had is appended rather than folded into an existing one", () => {
  const parsed = [...parseConfig(REPEATED), { name: "6001", entries: [{ key: "type", value: "identify" }] }];
  const rendered = renderConfigOver(parsed, REPEATED);
  assert.deepEqual(parseConfig(rendered).map((section) => [section.name, section.entries.length]),
    [["6001", 3], ["6001", 2], ["6001", 1]]);
  assert.ok(rendered.includes("type = identify"));
});

test("an entry before the first header survives, since parseConfig gives it a nameless section", () => {
  /* `parseConfig` puts a pre-header entry into a section named "", so the write path has to
   * match that same nameless section or the line is dropped. There can only be one such
   * region, and matching sections by occurrence is what makes "which "" is this" a question
   * at all -- so it is asserted rather than assumed. */
  const leading = ["stray = 1", "[a]", "x = 1"].join(LF) + LF;
  const parsed = parseConfig(leading);
  assert.equal(parsed[0]?.name, "", "the sample must produce a nameless leading section");
  assert.equal(renderConfigOver(parsed, leading), leading);
});

test("a file with no trailing newline does not gain one", () => {
  /* Adding one changes a file nobody edited, which is exactly what this path promises not
   * to do. */
  const withoutNewline = SAMPLE.trimEnd();
  assert.equal(renderConfigOver(parseConfig(withoutNewline), withoutNewline), withoutNewline);
});

test("carriage returns survive, so a file written on Windows comes back as it went in", () => {
  const crlf = SAMPLE.split(LF).join(String.fromCharCode(13) + LF);
  assert.equal(renderConfigOver(parseConfig(crlf), crlf), crlf);
});

test("renderConfig alone still loses comments, which is why the write path no longer uses it", () => {
  /* Kept deliberately rather than deleted: it is the right renderer for a resource that has
   * no prior text. Pinning its limitation here stops anybody reaching for it on the write
   * path again by mistake. */
  const rendered = renderConfig(parseConfig(SAMPLE));
  assert.ok(!rendered.includes("; a leading comment"),
    "renderConfig now preserves comments, so this test and the comment above it are stale");
  assert.ok(rendered.includes("exten => 8100,1,NoOp(hello)"),
    "renderConfig must still emit the arrow form for entries that carry one");
});
