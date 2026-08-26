import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  DialplanReadings,
  parseDialplanContextTotal,
  parseDialplanContexts,
} from "../../control-plane/dialplan-graph.ts";
import { WslConfigTransport } from "../../control-plane/wsl-config-transport.ts";
import type { CommandRequest, CommandResult, ProcessExecutor } from "../../control-plane/executor.ts";
import type { TargetProfile } from "../../control-plane/contracts.ts";
import {
  compareDialplanToFile,
  parseExtensionsConfSections,
  stripConfigComments,
} from "../../control-plane/dialplan-divergence.ts";

/**
 * Every expectation below is taken from this checkout's own sources, named beside it:
 * `pbx/pbx_config.c` for what becomes a context and what registrar records it,
 * `main/config.c` for how a header, a directive and a comment are read, and `main/pbx.c`
 * for what `dialplan show` prints.
 *
 * The one fixture that is not hand-built is the real capture in
 * `release/evidence/live-exchange/readings/baseline/dialplan-show.txt` — a genuine
 * `dialplan show` from a running Asterisk, used because it carries the case that makes
 * this comparison hard: 21 of its 49 contexts were created by something other than
 * `pbx_config` and must never be reported as missing from `extensions.conf`.
 */

const LIVE_DIALPLAN_SHOW = readFileSync(
  fileURLToPath(new URL("../../release/evidence/live-exchange/readings/baseline/dialplan-show.txt", import.meta.url)),
  "utf8",
);

// ---------------------------------------------------------------- comment stripping

test("a trailing comment does not hide a section header", () => {
  // main/config.c line 2647: `ast_strip(process_buf)` runs after comments are removed, so
  // the header is a header. `parseConfig` in wsl-config-transport.ts loses this one,
  // because it requires the line to end with `]`.
  assert.deepEqual(parseExtensionsConfSections("[from-internal] ; inbound calls").contexts, ["from-internal"]);
});

test("an escaped semicolon is not a comment", () => {
  // main/config.c lines 2577-2581: the backslash is written over and the semicolon stays.
  assert.deepEqual(stripConfigComments("exten => 1,1,NoOp(a\\;b)"), ["exten => 1,1,NoOp(a;b)"]);
});

test("a block comment hides a section header across lines", () => {
  // main/config.c lines 2582-2596: ";--" opens, "--;" closes, and nesting is counted.
  const text = ["[live]", ";--", "[hidden]", "--;", "[alsolive]"].join("\n");
  assert.deepEqual(parseExtensionsConfSections(text).contexts, ["live", "alsolive"]);
});

test("a nested block comment needs both ends before text resumes", () => {
  const text = ["; --", ";-- [a] ;-- [b] --;", "[c]", "--;", "[d]"].join("\n");
  assert.deepEqual(parseExtensionsConfSections(text).contexts, ["d"]);
});

test("';--;' opens a block comment rather than opening and closing one", () => {
  // main/config.c line 2593 tests the two dashes against `new_buf`, which the ";--" branch
  // has already advanced past them — so the ";" cannot close what it just opened. Reading
  // it the other way would leave the block open and swallow the rest of the file, so this
  // is asserted on the sections rather than only on the stripped text.
  assert.deepEqual(stripConfigComments(";--;\n[hidden]\n--;\n[live]"), ["", "", "", "[live]"]);
  assert.deepEqual(parseExtensionsConfSections(";--;\n[hidden]\n--;\n[live]").contexts, ["live"]);
});

test("';---' is a comment marker rather than a block start", () => {
  // main/config.c line 2582: `comment_p[3] != '-'` is part of the start test.
  assert.deepEqual(parseExtensionsConfSections(";---\n[live]").contexts, ["live"]);
});

// ---------------------------------------------------------------- the file side

test("[general] and [globals] are settings, not contexts", () => {
  // pbx/pbx_config.c lines 1745-1746, compared with strcasecmp.
  const sections = parseExtensionsConfSections("[general]\nstatic=yes\n[GLOBALS]\nTRUNK=PJSIP/out\n[default]\n");
  assert.deepEqual(sections.contexts, ["default"]);
  assert.deepEqual(sections.reserved, ["general", "GLOBALS"]);
});

test("a template is not a context", () => {
  // main/config.c line 228 sets `ignored` for "(!)", and ast_category_browse skips it, so
  // pbx_config never sees the category and never creates a context for it.
  const sections = parseExtensionsConfSections("[shared](!)\nexten => 1,1,NoOp()\n[real](shared)\n");
  assert.deepEqual(sections.templates, ["shared"]);
  assert.deepEqual(sections.contexts, ["real"]);
});

test("a space before the option list means there is no option list", () => {
  // main/config.c line 2081: `if (*c++ != '(') c = NULL;` — the paren must be the very
  // next character, so "[foo] (!)" is an ordinary category and IS a context.
  const sections = parseExtensionsConfSections("[foo] (!)\n");
  assert.deepEqual(sections.contexts, ["foo"]);
  assert.deepEqual(sections.templates, []);
});

test("an untrimmed bang is not the template marker", () => {
  // main/config.c line 2105: strsep on "," then strcasecmp against "!", with no trimming.
  assert.deepEqual(parseExtensionsConfSections("[foo]( ! )\n").contexts, ["foo"]);
});

test("a repeated section name is one context", () => {
  // pbx/pbx_config.c line 1750: ast_context_find_or_create, so the second [from-internal]
  // is folded into the first rather than making a second context.
  const sections = parseExtensionsConfSections("[from-internal]\nexten => 1,1,NoOp()\n[from-internal](+)\nexten => 2,1,NoOp()\n");
  assert.deepEqual(sections.contexts, ["from-internal"]);
});

test("recognised directives are recorded and unknown ones are not", () => {
  // main/config.c lines 2188-2196: include / tryinclude / exec, case-insensitively; every
  // other "#word" is logged as unknown and ignored.
  const sections = parseExtensionsConfSections(
    ['#include "extensions_custom.conf"', "#TryInclude extra.conf", "#exec /bin/gen", "#nonsense foo", "#include<nospace>"].join("\n"),
  );
  assert.deepEqual(sections.directives, ['#include "extensions_custom.conf"', "#TryInclude extra.conf", "#exec /bin/gen"]);
});

// ---------------------------------------------------------------- the loaded side

test("parses each context's registrar out of the header", () => {
  // main/pbx.c line 3895: "[ Context '%s' created by '%s' ]".
  const contexts = parseDialplanContexts(LIVE_DIALPLAN_SHOW);
  assert.equal(contexts.length, 49, "the capture holds 49 context headers");
  const registrars = new Map<string, number>();
  for (const context of contexts) registrars.set(context.registrar, (registrars.get(context.registrar) ?? 0) + 1);
  assert.deepEqual([...registrars.entries()].sort(), [
    ["func_periodic_hook", 1],
    ["pbx_ael", 19],
    ["pbx_config", 28],
    ["res_parking", 1],
  ]);
});

test("records a registrar file only when a line number came with it", () => {
  // main/pbx.c show_dialplan_helper_extension_output(): "[%s:%d]" is a file, "[%s]" alone
  // is the registrar's module name. Treating the second as a file would attribute every
  // pbx_ael extension to a file called pbx_ael.
  const contexts = parseDialplanContexts(LIVE_DIALPLAN_SHOW);
  const byName = new Map(contexts.map((context) => [context.name, context]));
  assert.deepEqual(byName.get("trunkint")?.files, ["extensions.conf"]);
  assert.deepEqual(byName.get("ael-dundi-e164")?.files, [], "a bare [pbx_ael] names a module, not a file");
  assert.deepEqual(byName.get("iaxprovider")?.files, [], "a context with no extension names no file");
});

test("reads the context total the command printed for itself", () => {
  // main/pbx.c line 4135.
  assert.equal(parseDialplanContextTotal(LIVE_DIALPLAN_SHOW), 49);
  assert.equal(parseDialplanContextTotal("[ Context 'x' created by 'pbx_config' ]"), undefined);
});

test("does not mistake an Include, an Alt. Switch or an Ignore pattern line for an extension", () => {
  // All three appear in the live capture and none is a priority line.
  const contexts = parseDialplanContexts(
    [
      "[ Context 'local' created by 'pbx_config' ]",
      "  Include =>        'default'                                     [pbx_config]",
      "  Alt. Switch =>    'DUNDi/e164'                                  [pbx_config]",
      "  Ignore pattern => '9'                                           [pbx_config]",
    ].join("\n"),
  );
  assert.deepEqual(contexts, [{ name: "local", registrar: "pbx_config", files: [] }]);
});

// ---------------------------------------------------------------- the comparison

const loaded = (name: string, registrar = "pbx_config", files: string[] = ["extensions.conf"]) =>
  ({ name, registrar, files });
const file = (contexts: string[], directives: string[] = []) =>
  ({ contexts, templates: [], reserved: [], directives });

test("agreement is reported as agreement", () => {
  const result = compareDialplanToFile([loaded("from-internal"), loaded("default")], file(["from-internal", "default"]));
  assert.equal(result.diverged, false);
  assert.deepEqual(result.inFileNotLoaded, []);
  assert.deepEqual(result.loadedNotInFile, []);
  assert.equal(result.fileContextCount, 2);
});

test("a context the file declares and Asterisk has not loaded is a divergence", () => {
  // The case the live run met: extensions.conf held [dundi-e164], [iax2-trunk] and
  // [trunkint] and the running Asterisk had none of them, because nothing had reloaded
  // pbx_config since the file was restored. docs/evidence/live-readings.md.
  const result = compareDialplanToFile(
    [loaded("default")],
    file(["default", "dundi-e164", "iax2-trunk", "trunkint"]),
  );
  assert.equal(result.diverged, true);
  assert.deepEqual(result.inFileNotLoaded, ["dundi-e164", "iax2-trunk", "trunkint"]);
});

test("a context loaded from this file that the file no longer declares is a divergence", () => {
  const result = compareDialplanToFile([loaded("default"), loaded("deleted-context")], file(["default"]));
  assert.equal(result.diverged, true);
  assert.deepEqual(result.loadedNotInFile, ["deleted-context"]);
});

test("a context another module created is never a divergence", () => {
  // 21 of the live capture's 49 contexts are somebody else's. Comparing without the
  // registrar filter reports 21 defects that are not defects.
  const result = compareDialplanToFile(
    [loaded("default"), loaded("ael-dundi-e164", "pbx_ael", []), loaded("parked-calls", "res_parking", [])],
    file(["default"]),
  );
  assert.equal(result.diverged, false);
  assert.deepEqual(result.loadedNotInFile, []);
  assert.equal(result.loadedFromOtherRegistrarsCount, 2);
  assert.equal(result.loadedFromPbxConfigCount, 1);
});

test("a context loaded from an included file is reported as an include, not a divergence", () => {
  // pbx/pbx_config.c lines 1895-1901: the registrar file is the basename of whichever file
  // declared the extension, so an #include'd context names itself.
  const result = compareDialplanToFile(
    [loaded("default"), loaded("from-custom", "pbx_config", ["extensions_custom.conf"])],
    file(["default"], ['#include "extensions_custom.conf"']),
  );
  assert.equal(result.diverged, false);
  assert.deepEqual(result.fromIncludedFiles, [{ context: "from-custom", file: "extensions_custom.conf" }]);
});

test("an empty context this file does not declare is unattributed when an include could explain it", () => {
  const withInclude = compareDialplanToFile(
    [loaded("mystery", "pbx_config", [])],
    file([], ['#include "extensions_custom.conf"']),
  );
  assert.deepEqual(withInclude.unattributed, ["mystery"]);
  assert.equal(withInclude.diverged, false, "an include could have declared it, so it is a question rather than a finding");

  const withoutInclude = compareDialplanToFile([loaded("mystery", "pbx_config", [])], file([]));
  assert.deepEqual(withoutInclude.unattributed, ["mystery"]);
  assert.equal(withoutInclude.diverged, true, "with no include, nothing else could have declared it");
});

test("a context the file declares and another module created is loaded, not missing", () => {
  // pbx_config merges into an existing context rather than recreating it, and the header
  // keeps naming the module that created it first. Filtering inFileNotLoaded by registrar
  // would report a context that is plainly loaded as absent.
  const result = compareDialplanToFile([loaded("parked-calls", "res_parking", [])], file(["parked-calls"]));
  assert.deepEqual(result.inFileNotLoaded, []);
  assert.equal(result.diverged, false);
});

test("carries the command's own context total beside the parsed one", () => {
  const result = compareDialplanToFile([loaded("default")], file(["default"]), 3);
  assert.equal(result.loadedContextsParsed, 1);
  assert.equal(result.loadedContextsReported, 3);
});

// ---------------------------------------------------------------- the wiring

const TARGET: TargetProfile = {
  id: "ding-pbx-console",
  displayName: "ding-pbx-console",
  connectionKind: "wsl",
  wslDistribution: "ding-pbx-console",
};

test("one run of `dialplan show` carries both the graph and the contexts", async () => {
  /* Two runs would draw the canvas from one moment and judge the file against another,
   * and nothing in either output would say they were different moments. This counts the
   * runs rather than trusting the comment that says there is one. */
  let runs = 0;
  const reading = await new DialplanReadings({
    async run() {
      runs += 1;
      return { status: "succeeded", exitCode: 0, stdout: LIVE_DIALPLAN_SHOW, stderr: "", durationMs: 1 };
    },
  }).graph(TARGET);
  assert.equal(runs, 1);
  assert.equal(reading.result.state, "available");
  assert.equal(reading.contexts?.length, 49);
  assert.equal(reading.contextsReported, 49);
});

test("a failed `dialplan show` carries no contexts at all", async () => {
  /* Absent rather than empty, so `readDialplanDivergence` cannot mistake "nothing was
   * read" for "the dialplan holds no contexts" and report every section of the file as
   * missing from a dialplan nobody read. */
  const reading = await new DialplanReadings({
    async run() {
      return { status: "succeeded", exitCode: 0, stdout: "Unable to connect to remote asterisk", stderr: "", durationMs: 1 };
    },
  }).graph(TARGET);
  assert.equal(reading.result.state, "unavailable");
  assert.equal(reading.contexts, undefined);
  assert.equal(reading.contextsReported, undefined);
});

class FakeExecutor implements ProcessExecutor {
  readonly calls: CommandRequest[] = [];
  constructor(private readonly script: (request: CommandRequest) => Partial<CommandResult>) {}
  async execute(request: CommandRequest): Promise<CommandResult> {
    this.calls.push(request);
    return { status: "succeeded", exitCode: 0, stdout: "", stderr: "", durationMs: 1, ...this.script(request) };
  }
}

test("readText hands back the file's exact bytes, directives and all", () => {
  /* `read()` cannot answer this question: `parseConfig` keeps only headers that end the
   * line and `key = value` pairs, so it drops the directive entirely — and a dropped
   * `#include` turns every context that file declares into a reported divergence. */
  const text = '#include "extensions_custom.conf"\n[from-internal] ; inbound\nexten => 1,1,NoOp()\n';
  const executor = new FakeExecutor(() => ({ stdout: Buffer.from(text, "utf8").toString("base64") }));
  const transport = new WslConfigTransport({ executor, distribution: "ding-pbx-console" });
  return transport.readText("/etc/asterisk/extensions.conf").then((read) => {
    assert.equal(read, text);
    assert.deepEqual(executor.calls[0].args, ["-d", "ding-pbx-console", "--", "base64", "-w", "0", "/etc/asterisk/extensions.conf"]);
    assert.deepEqual(parseExtensionsConfSections(read).contexts, ["from-internal"]);
    assert.equal(parseExtensionsConfSections(read).directives.length, 1);
  });
});

test("readText refuses a resource that is not on the allowlist", async () => {
  const transport = new WslConfigTransport({ executor: new FakeExecutor(() => ({})), distribution: "ding-pbx-console" });
  await assert.rejects(() => transport.readText("/etc/shadow"), /not a configurable resource/u);
});

test("the canvas view is wired to both the dialplan reading and the divergence reading", () => {
  /* `readView` and `readDialplanDivergence` are closures inside
   * `createControlPlaneDispatcher`, and reaching them needs a real WSL discovery run, so
   * these assert the wiring lines themselves. Anchored to whole lines, because a substring
   * needle is satisfied by a commented-out call — which is how a wiring line usually dies.
   * The `\r` strip is not decoration: this checkout is CRLF in places, and a newline-only
   * pattern silently matches nothing and reports a guard that never ran as a guard that
   * passed. */
  const source = readFileSync(new URL("../../control-plane/dispatch.ts", import.meta.url), "utf8").replace(/\r/gu, "");
  assert.ok(source.length > 1000, "dispatch.ts was not read");
  assert.match(source, /^\s*return \{ dialplan, dialplanFile: await readDialplanDivergence\(target, dialplan\) \};$/mu);
  assert.match(source, /^\s*const text = await transport\.readText\(DIALPLAN_FILE_RESOURCE\);$/mu);
  assert.match(
    source,
    /^\s*value: compareDialplanToFile\(dialplan\.contexts, parseExtensionsConfSections\(text\), dialplan\.contextsReported\),$/mu,
  );
});

test("the canvas note is wired into the renderer, ahead of the configuration branch", () => {
  /* The canvas declares `file: "extensions.conf"` in the design, so `note()` used to
   * return from the configuration branch before it ever reached this screen — and since
   * `read()` answers the canvas through its own `pbx.read` view rather than the config
   * path, `this.configs.canvas` is never populated and that summary read "Reading…"
   * forever. Order is the whole repair, so order is what is asserted. */
  const source = readFileSync(new URL("../../app/renderer/src/App.tsx", import.meta.url), "utf8").replace(/\r/gu, "");
  assert.ok(source.length > 1000, "App.tsx was not read");
  const canvasBranch = source.search(/^\s*if \(screen === 'canvas'\) \{$/mu);
  const configBranch = source.search(/^\s*if \(screen !== 'canvas' && resourceForFile\(\(SCREENS as Record<string, \{ file\?: unknown \}>\)\[screen\]\?\.file\)\) \{$/mu);
  assert.ok(canvasBranch > 0, "the canvas branch of note() was not found");
  assert.ok(configBranch > 0, "the configuration branch of note() was not found");
  assert.ok(canvasBranch < configBranch, "the canvas branch must come first or it is unreachable");
  assert.match(source, /^\s*return \[canvasReason\(this\.canvasReadings\), dialplanDivergenceNote\(this\.canvasReadings\), this\.dialplanDivergenceNote\(\)\]$/mu);
});

test("the live capture compared against a file describing all 28 of its pbx_config contexts agrees", () => {
  const contexts = parseDialplanContexts(LIVE_DIALPLAN_SHOW);
  const fromPbxConfig = contexts.filter((context) => context.registrar === "pbx_config").map((context) => context.name);
  const asFile = `[general]\nstatic=yes\n${fromPbxConfig.map((name) => `[${name}]`).join("\n")}\n`;
  const result = compareDialplanToFile(
    contexts,
    parseExtensionsConfSections(asFile),
    parseDialplanContextTotal(LIVE_DIALPLAN_SHOW),
  );
  assert.equal(result.diverged, false, JSON.stringify(result, null, 2));
  assert.equal(result.fileContextCount, 28);
  assert.equal(result.loadedFromPbxConfigCount, 28);
  assert.equal(result.loadedFromOtherRegistrarsCount, 21);
  assert.equal(result.loadedContextsParsed, 49);
  assert.equal(result.loadedContextsReported, 49);
});
