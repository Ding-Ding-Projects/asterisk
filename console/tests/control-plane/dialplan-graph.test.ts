import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDialplanGraph,
  parseDialplanExtensions,
  parseDialplanGraph,
  agiReferences,
} from "../../control-plane/dialplan-graph.ts";

// Fixtures mirror main/pbx.c's show_dialplan_helper() / show_dialplan_helper_extension_output()
// / print_ext(): a context header, then "  '<exten>' =>          N. App(data)  [file:line]"
// for the first priority, "     [label]     N. App(data)  [file:line]" for later ones, an
// "Include =>" line, and "Autohints support enabled" where hints are on.

test("parses multiple contexts, multiple priorities and labels", () => {
  const stdout = [
    "[ Context 'from-external' created by 'pbx_config' ]",
    "  '6001'          =>          1. Goto(ivr-main,s,1)                       [pbx_config]",
    "",
    "[ Context 'ivr-main' created by 'pbx_config' ]",
    "  's'             =>          1. Background(welcome)                     [extensions.conf:12]",
    "                     [start]   2. WaitExten(7)                            [extensions.conf:13]",
    "                                3. Goto(ivr-main,s,1)                     [extensions.conf:14]",
    "  Include =>        'ivr-main-includes'                    [pbx_config]",
    "",
  ].join("\n");

  const extensions = parseDialplanExtensions(stdout);
  assert.equal(extensions.length, 2);

  const [from, ivr] = extensions;
  assert.equal(from.context, "from-external");
  assert.equal(from.extension, "6001");
  assert.deepEqual(from.steps, [{ priority: 1, app: "Goto", data: "ivr-main,s,1" }]);
  assert.deepEqual(from.registrar, { name: "pbx_config" });

  assert.equal(ivr.context, "ivr-main");
  assert.equal(ivr.extension, "s");
  assert.deepEqual(ivr.steps, [
    { priority: 1, app: "Background", data: "welcome" },
    { priority: 2, app: "WaitExten", data: "7" },
    { priority: 3, app: "Goto", data: "ivr-main,s,1" },
  ]);
  assert.deepEqual(ivr.registrar, { file: "extensions.conf", line: 12 });
});

test("resolves Goto/GotoIf/GotoIfTime/Dial/Queue/VoiceMail targets that are parsed extensions", () => {
  const stdout = [
    "[ Context 'from-external' created by 'pbx_config' ]",
    "  '6001'          =>          1. GotoIfTime(09:00-17:00,mon-fri,*,*?ivr-main,s,1:ivr-main,after,1)  [pbx_config]",
    "",
    "[ Context 'ivr-main' created by 'pbx_config' ]",
    "  's'             =>          1. GotoIf($[\"${X}\"=\"1\"]?ivr-main,queue,1)  [extensions.conf:20]",
    "  'queue'         =>          1. Queue(support,tT,,,180)                 [extensions.conf:21]",
    "  'after'         =>          1. VoiceMail(1004@default,u)               [extensions.conf:22]",
    "",
  ].join("\n");

  const graph = parseDialplanGraph(stdout);
  assert.equal(graph.nodes.length, 4);

  const has = (from: string, to: string) => graph.edges.some(([a, b]) => a === from && b === to);
  assert.ok(has("from-external/6001", "ivr-main/s"), "GotoIfTime true-branch resolves");
  assert.ok(has("ivr-main/s", "ivr-main/queue"), "GotoIf true-branch resolves");
  assert.equal(graph.edges.length, 2, "Queue()/VoiceMail() destinations are not extensions and are not walked as edges");
});

test("does not emit an edge for a Goto target that is not among the parsed extensions", () => {
  const extensions = parseDialplanExtensions(
    [
      "[ Context 'from-external' created by 'pbx_config' ]",
      "  '6001'          =>          1. Goto(nowhere-context,s,1)               [pbx_config]",
      "",
    ].join("\n"),
  );
  const graph = buildDialplanGraph(extensions);
  assert.equal(graph.nodes.length, 1);
  assert.deepEqual(graph.edges, []);
});

test("resolves a Dial target that names another parsed extension by number alone", () => {
  const stdout = [
    "[ Context 'from-internal' created by 'pbx_config' ]",
    "  '1001'          =>          1. Dial(PJSIP/1001,20)                     [pbx_config]",
    "  '1002'          =>          1. Dial(1001,20)                           [pbx_config]",
    "",
  ].join("\n");
  const graph = parseDialplanGraph(stdout);
  assert.deepEqual(graph.edges, [["from-internal/1002", "from-internal/1001"]]);
});

test("returns an empty graph for empty dialplan output", () => {
  assert.deepEqual(parseDialplanGraph(""), { nodes: [], edges: [] });
  assert.deepEqual(parseDialplanGraph("\n\n"), { nodes: [], edges: [] });
});

test("ignores hint priorities and unrelated CLI chatter", () => {
  const stdout = [
    "[ Context 'from-external' created by 'pbx_config' ]",
    "Autohints support enabled",
    "  '6001'          =>          1. NoOp(start)                             [pbx_config]",
    "  [Dialplan hints]",
    "     6001@from-external           : PJSIP/6001         State:Idle       Watchers 0",
    "",
  ].join("\n");
  const extensions = parseDialplanExtensions(stdout);
  assert.equal(extensions.length, 1);
  assert.equal(extensions[0].steps.length, 1);
});

// ---------------------------------------------------------------- agiReferences

test("agiReferences finds a local script name across AGI, EAGI and DeadAGI", () => {
  const stdout = [
    "[ Context 'from-internal' created by 'pbx_config' ]",
    "  '2000'          =>          1. AGI(lookup.agi,${EXTEN})                [pbx_config]",
    "  '2001'          =>          1. EAGI(record.agi)                       [pbx_config]",
    "  '2002'          =>          1. DeadAGI(cleanup.agi)                   [pbx_config]",
    "",
  ].join("\n");
  const graph = parseDialplanGraph(stdout);
  const refs = agiReferences(graph);
  assert.deepEqual(refs.map((r) => [r.app, r.script, r.kind]), [
    ["AGI", "lookup.agi", "local"],
    ["EAGI", "record.agi", "local"],
    ["DeadAGI", "cleanup.agi", "local"],
  ]);
  assert.equal(refs[0].context, "from-internal");
  assert.equal(refs[0].extension, "2000");
  assert.equal(refs[0].priority, 1);
});

test("agiReferences classifies a FastAGI URI as network, not a local script", () => {
  const stdout = [
    "[ Context 'from-internal' created by 'pbx_config' ]",
    "  '2000'          =>          1. AGI(agi://127.0.0.1/awesome-script)     [pbx_config]",
    "  '2001'          =>          1. AGI(hagi://agi.example.com/foo.agi)     [pbx_config]",
    "",
  ].join("\n");
  const refs = agiReferences(parseDialplanGraph(stdout));
  assert.deepEqual(refs.map((r) => r.kind), ["network", "network"]);
});

test("agiReferences classifies agi:async as async, not a local script", () => {
  const stdout = [
    "[ Context 'from-internal' created by 'pbx_config' ]",
    "  '2000'          =>          1. AGI(agi:async)                         [pbx_config]",
    "",
  ].join("\n");
  const refs = agiReferences(parseDialplanGraph(stdout));
  assert.deepEqual(refs, [{ context: "from-internal", extension: "2000", priority: 1, app: "AGI", script: "agi:async", kind: "async" }]);
});

test("agiReferences strips one layer of quotes and stops at the first comma", () => {
  const stdout = [
    "[ Context 'from-internal' created by 'pbx_config' ]",
    '  \'2000\'          =>          1. AGI("my script.agi",${EXTEN})           [pbx_config]',
    "",
  ].join("\n");
  const refs = agiReferences(parseDialplanGraph(stdout));
  assert.equal(refs[0].script, "my script.agi");
  assert.equal(refs[0].kind, "local");
});

test("agiReferences ignores every non-AGI application", () => {
  const stdout = [
    "[ Context 'from-internal' created by 'pbx_config' ]",
    "  '2000'          =>          1. Dial(PJSIP/1001,20)                     [pbx_config]",
    "",
  ].join("\n");
  assert.deepEqual(agiReferences(parseDialplanGraph(stdout)), []);
});

test("agiReferences returns empty for an empty graph", () => {
  assert.deepEqual(agiReferences({ nodes: [], edges: [] }), []);
});
