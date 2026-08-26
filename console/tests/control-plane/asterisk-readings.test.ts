import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AsteriskReadings,
  LocalAsteriskCliGateway,
  MAX_ENDPOINT_DETAILS,
  isAllowedCommandLine,
  parseChannels,
  parseChannelStats,
  parseContacts,
  parseEndpointDetail,
  parseEndpoints,
  parseIax2Peers,
  parseIax2Registry,
  parseModules,
  parseQueues,
  parseRegistrations,
  parseUptimeSeconds,
} from "../../control-plane/asterisk-readings.ts";
import type { AsteriskCliGateway, ReadOnlyCommand } from "../../control-plane/asterisk-readings.ts";
import { readEndpointsView } from "../../control-plane/dispatch.ts";
import type { CommandResult, ProcessExecutor } from "../../control-plane/executor.ts";
import type { TargetProfile } from "../../control-plane/contracts.ts";

const NOW = new Date("2026-08-22T12:00:00.000Z");
const now = () => NOW;

const WSL_TARGET: TargetProfile = {
  id: "t1",
  displayName: "Dev box",
  connectionKind: "wsl",
  wslDistribution: "Ubuntu-22.04",
};

const DOCKER_TARGET: TargetProfile = {
  id: "t2",
  displayName: "Container",
  connectionKind: "localDocker",
  dockerContext: "asterisk-1",
};

class FakeExecutor implements ProcessExecutor {
  readonly requests: Array<{ executable: string; args: ReadonlyArray<string> }> = [];
  readonly results: CommandResult[];
  constructor(results: CommandResult[]) { this.results = results; }
  async execute(request: { executable: string; args: ReadonlyArray<string> }): Promise<CommandResult> {
    this.requests.push({ executable: request.executable, args: request.args });
    const result = this.results.shift();
    if (!result) throw new Error("No fake result available");
    return result;
  }
}

function command(stdout = "", stderr = "", status: CommandResult["status"] = "succeeded"): CommandResult {
  return { status, exitCode: status === "succeeded" ? 0 : 1, stdout, stderr, durationMs: 1 };
}

class FailingGateway implements AsteriskCliGateway {
  constructor(private readonly error: Error) {}
  async run(): Promise<CommandResult> {
    throw this.error;
  }
}

class FixedGateway implements AsteriskCliGateway {
  constructor(private readonly result: CommandResult) {}
  async run(): Promise<CommandResult> {
    return this.result;
  }
}

// ------------------------------------------------------------ parseChannels
// main/cli.c handle_chanlist, CONCISE_FORMAT_STRING:
// "%s!%s!%s!%d!%s!%s!%s!%s!%s!%s!%d!%s!%s!%s\n"
// name!context!exten!priority!state!appl!data!calleridnum!accountcode!peeraccount!amaflags!durbuf!bridgeid!uniqueid

test("parseChannels reads several concise rows", () => {
  const stdout = [
    "PJSIP/1000-00000001!from-internal!1001!1!Up!Dial!PJSIP/1002,20!1000!!!3!45!bridge-abc!asterisk-uid-1",
    "PJSIP/1002-00000002!from-internal!!0!Ring!AppDial!(Outgoing Line)!1002!!!3!2!!asterisk-uid-2",
  ].join("\n");
  const rows = parseChannels(stdout);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    name: "PJSIP/1000-00000001",
    context: "from-internal",
    extension: "1001",
    state: "Up",
    application: "Dial",
    callerNumber: "1000",
    durationSeconds: 45,
    bridgeId: "bridge-abc",
    uniqueId: "asterisk-uid-1",
  });
  assert.equal(rows[1].durationSeconds, 2);
  assert.equal(rows[1].bridgeId, "");
});

test("parseChannels ignores lines with too few concise fields and empty output", () => {
  assert.deepEqual(parseChannels(""), []);
  assert.deepEqual(parseChannels("not!enough!fields"), []);
});

test("parseChannels falls back to duration 0 when durbuf is the '-' placeholder", () => {
  // durbuf stays "-" when creationtime is zero (handle_chanlist, durbuf default).
  const stdout = "Console/dsp-1!default!!0!Down!(None)!!!!!0!-!!asterisk-uid-3";
  const rows = parseChannels(stdout);
  assert.equal(rows[0].durationSeconds, 0);
});

// ------------------------------------------------------------ parseEndpoints
// res/res_pjsip/pjsip_configuration.c cli_endpoint_print_body:
// "%*s:  %-*.*s  %-12.12s  %d of %.0f\n" -> " Endpoint:  <id[/cid]>  <state>  <n of m>"

test("parseEndpoints reads rows and ignores the header/divider/summary lines", () => {
  const stdout = [
    "",
    " Endpoint:  <Endpoint/CID.....................................>  <State.....>  <Channels.>",
    "==========================================================================================",
    "",
    " Endpoint:  1000/Alice  Not in use  1 of inf",
    " Endpoint:  1001  Unavailable  0 of inf",
    "",
    "Objects found: 2",
  ].join("\n");
  const rows = parseEndpoints(stdout);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { id: "1000", callerId: "Alice", state: "Not in use", channels: "1 of inf" });
  assert.deepEqual(rows[1], { id: "1001", callerId: undefined, state: "Unavailable", channels: "0 of inf" });
});

// res/res_pjsip/pjsip_cli.c line 152: `pjsip show endpoints` runs with `recurse = 1`, so
// pjsip_configuration.c's cli_endpoint_print_body also emits a child line per endpoint
// from config_transport.c cli_print_body: "%*s:  %-21s  %6s  %5u  %5u  %s\n" ->
// "  Transport:  <id>  <type>  <cos>  <tos>  <bind address>". That child formatter's own
// cli_iterate looks the endpoint's `transport` field up by id and returns -1 -- printing
// nothing -- when it is empty, which real config commonly leaves it (transports are
// auto-matched from the inbound connection). 1001 below has no Transport line at all,
// on purpose, to prove that stays honestly absent rather than becoming a guess.
test("parseEndpoints reads the recursed Transport child line, and leaves it absent when Asterisk printed none", () => {
  const stdout = [
    "",
    " Endpoint:  <Endpoint/CID.....................................>  <State.....>  <Channels.>",
    "==========================================================================================",
    "",
    " Endpoint:  1000/Alice  Not in use  1 of inf",
    "    Auth:  <AuthId/UserId.........................>  <AuthType....>  <Username....................>",
    "     Aor:  <AorId.....................>  <MaxContact>",
    "  Transport:  transport-udp          udp     0     0  0.0.0.0:5060",
    " Identify:  <Identify/Endpoint.....................>  <Match.......................>",
    "",
    " Endpoint:  1001  Unavailable  0 of inf",
    "",
    "Objects found: 2",
  ].join("\n");
  const rows = parseEndpoints(stdout);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].transport, "transport-udp");
  assert.equal(rows[1].transport, undefined);
});

test("parseEndpoints does not mistake a short or malformed Transport-labelled line for a real one", () => {
  const stdout = [
    " Endpoint:  1000  Not in use  1 of inf",
    // Missing the numeric cos/tos columns entirely -- not the real row shape.
    "  Transport:  transport-udp",
  ].join("\n");
  const rows = parseEndpoints(stdout);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].transport, undefined);
});

test("parseEndpoints returns nothing for empty output or 'No objects found.'", () => {
  assert.deepEqual(parseEndpoints(""), []);
  assert.deepEqual(parseEndpoints("No objects found.\n"), []);
});

// ------------------------------------------------------------ parseChannelStats
// channels/pjsip/cli_commands.c cli_channelstats_print_body's detailed row:
// " %8.8s %-18.18s %-8.8s %-6.6s %6u%s %6u%s %3u %7.3f %6u%s %6u%s %3u %7.3f %7.3f\n"
// -> " <bridgeId> <channelId> <uptime> <codec> <...RTP counters this reader ignores>".
// Built with the same field widths/justification as the real printf spec so the fixed
// column offsets `parseChannelStats` slices on land exactly where Asterisk puts them.
function channelStatsRow(
  bridgeId: string,
  channelId: string,
  uptime: string,
  codec: string,
  rest = "    12     0   0   0.120    34     0   0   0.340   5.670",
): string {
  return ` ${bridgeId.padStart(8).slice(0, 8)} ${channelId.padEnd(18).slice(0, 18)} ${uptime.padEnd(8).slice(0, 8)} ${codec.padEnd(6).slice(0, 6)} ${rest}`;
}

test("parseChannelStats reads bridgeId/channelId/codec off the detailed row and derives the endpoint id", () => {
  const stdout = [
    "",
    "                                             ...........Receive......... .........Transmit..........",
    " BridgeId ChannelId ........ UpTime.. Codec.   Count    Lost Pct  Jitter   Count    Lost Pct  Jitter RTT....",
    " =================",
    "==========================================================================================",
    "",
    channelStatsRow("bridge-1", "1000-00000001", "00:01:23", "ulaw"),
    channelStatsRow("bridge-2", "sales-trunk1-0000000a", "00:00:05", "opus"),
    "",
    "Objects found: 2",
  ].join("\n");
  const rows = parseChannelStats(stdout);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { channelName: "PJSIP/1000-00000001", endpointId: "1000", codec: "ulaw" });
  // channelId is truncated to 18 chars by "%-18.18s" before this reader ever sees it, so an
  // endpoint id long enough to push the hex suffix past that width is read as truncated:
  // "sales-trunk1-0000000a" (21 chars) becomes "sales-trunk1-00000" (18), whose trailing
  // "-00000" no longer matches the 8-hex-digit suffix regex. That is an honest degradation
  // -- the endpoint just will not be matched back on the endpoints screen -- not a crash or
  // a wrong match.
  assert.deepEqual(rows[1], { channelName: "PJSIP/sales-trunk1-00000", endpointId: "sales-trunk1-00000", codec: "opus" });
});

// channels/pjsip/cli_commands.c: a channel with no RTP stats to read (gone by lookup time,
// no audio stream, a corrupted session, or direct media) prints a short message with no
// codec field in it at all, not a row with a blank codec.
test("parseChannelStats skips 'not valid'/'no audio streams'/'direct media' lines: no codec to read", () => {
  const stdout = [
    " PJSIP/1000-00000001 not valid",
    " PJSIP/1001-00000002 no audio streams",
    " PJSIP/1002-00000003 corrupted default audio session",
    "PJSIP/1003-00000004 direct media",
  ].join("\n");
  assert.deepEqual(parseChannelStats(stdout), []);
});

test("parseChannelStats skips a detailed row whose codec column is blank rather than inventing one", () => {
  // rawreadformat was unset when Asterisk printed this row: the %-6.6s codec field is pure
  // whitespace, not an omitted column -- same fixed-width trap as parseVoicemailUsers above.
  const stdout = channelStatsRow("bridge-1", "1000-00000001", "00:01:23", "");
  assert.deepEqual(parseChannelStats(stdout), []);
});

test("parseChannelStats on empty output or header-only output yields no rows", () => {
  assert.deepEqual(parseChannelStats(""), []);
  assert.deepEqual(
    parseChannelStats(" BridgeId ChannelId ........ UpTime.. Codec.   Count    Lost Pct  Jitter   Count    Lost Pct  Jitter RTT....\n"),
    [],
  );
});

// ------------------------------------------------------------ parseEndpointDetail
// res/res_pjsip/pjsip_cli.c ast_sip_cli_print_sorcery_objectset:
//   " %-*s : %s\n" for the "ParameterName : ParameterValue" header, then " %s\n" for the
//   "=" separator, then " %-*s : %s\n" per field, sorted by name. `max_name_width` starts
//   at 13 and grows to the widest name in the set, so the padding below is built from the
//   widest name in each fixture rather than a fixed number.
function parameterTable(fields: Array<[string, string]>): string[] {
  const width = Math.max(13, ...fields.map(([name]) => name.length));
  return [
    ` ${"ParameterName".padEnd(width)} : ParameterValue`,
    ` ${"=".repeat(width + 17)}`,
    ...fields.map(([name, value]) => ` ${name.padEnd(width)} : ${value}`),
  ];
}

// A realistic `pjsip show endpoint 1000`: the recursed child rows first (which carry their
// own "Transport:"/"Aor:" labels), then the endpoint's own parameter table.
function endpointDetailOutput(fields: Array<[string, string]>): string {
  return [
    "",
    " Endpoint:  <Endpoint/CID.....................................>  <State.....>  <Channels.>",
    "    I/OAuth:  <AuthId/UserName...........................................................>",
    "        Aor:  <Aor............................................>  <MaxContact>",
    "  Transport:  <TransportId........>  <Type>  <cos>  <tos>  <BindAddress....................>",
    "==========================================================================================",
    "",
    " Endpoint:  1000/Alice                                          Not in use    0 of inf",
    "     InAuth:  1000-auth/1000",
    "        Aor:  1000                                                 1",
    "  Transport:  transport-udp          udp      0      0  0.0.0.0:5060",
    "",
    ...parameterTable(fields),
    "",
  ].join("\n");
}

test("parseEndpointDetail reads the transport and the allow list out of the parameter table", () => {
  const stdout = endpointDetailOutput([
    ["100rel", "yes"],
    ["allow", "(ulaw|alaw|g722)"],
    ["auth", "1000-auth"],
    ["context", "from-internal"],
    ["transport", "transport-udp"],
  ]);
  assert.deepEqual(parseEndpointDetail(stdout), { transport: "transport-udp", codecs: ["ulaw", "alaw", "g722"] });
});

test("parseEndpointDetail reads a name wider than the 13-character minimum column", () => {
  // `max_name_width` grows to the widest name in the set, so every row shifts right with
  // it -- which is exactly why this parser cannot slice fixed columns the way
  // parseChannelStats does.
  const stdout = endpointDetailOutput([
    ["allow", "(opus)"],
    ["rtp_keepalive_interval", "0"],
    ["transport", "transport-tls"],
  ]);
  assert.deepEqual(parseEndpointDetail(stdout), { transport: "transport-tls", codecs: ["opus"] });
});

test("parseEndpointDetail reads '(nothing)' as an endpoint that allows no codec, not as an unread field", () => {
  // main/format_cap.c __ast_format_cap_get_names prints the literal "(nothing)" for an
  // empty capability set. That is a real answer and must not become an absent one.
  const stdout = endpointDetailOutput([["allow", "(nothing)"], ["transport", "transport-udp"]]);
  assert.deepEqual(parseEndpointDetail(stdout), { transport: "transport-udp", codecs: [] });
});

test("parseEndpointDetail leaves transport absent when the endpoint sets none", () => {
  // An unset OPT_STRINGFIELD_T renders as the empty string, so the row is printed with
  // nothing after the separator rather than omitted.
  const stdout = endpointDetailOutput([["allow", "(ulaw)"], ["transport", ""]]);
  assert.deepEqual(parseEndpointDetail(stdout), { codecs: ["ulaw"] });
});

test("parseEndpointDetail reads only inside the table, not anything above its header", () => {
  // The recursed child rows Asterisk really prints above the table carry capital labels
  // (" Transport:  transport-udp  udp  0  0  0.0.0.0:5060"), so the exact key comparison
  // already refuses those. The decoy below is not a shape Asterisk emits -- it is here to
  // pin the other half of the rule: the scan begins at the table's own header, so nothing
  // above it can be read as a parameter whatever it is spelled.
  const stdout = [
    " Endpoint:  1000  Not in use  0 of inf",
    "  Transport:  transport-udp          udp      0      0  0.0.0.0:5060",
    " transport     : above-the-table",
    " allow         : (g729)",
    "",
    ...parameterTable([["allow", "(ulaw)"], ["transport", "transport-tcp"]]),
  ].join("\n");
  assert.deepEqual(parseEndpointDetail(stdout), { transport: "transport-tcp", codecs: ["ulaw"] });
});

test("parseEndpointDetail stops at the end of the table rather than reading past it", () => {
  const stdout = [
    ...parameterTable([["allow", "(ulaw)"], ["transport", "transport-udp"]]),
    "",
    " transport : this-is-after-the-table",
  ].join("\n");
  assert.equal(parseEndpointDetail(stdout).transport, "transport-udp");
});

test("parseEndpointDetail refuses output with no parameter table, carrying what Asterisk said", () => {
  // res/res_pjsip/pjsip_cli.c line 228: an id that resolves to nothing prints this and
  // returns CLI_SUCCESS, so the exit code alone cannot tell the two apart.
  assert.throws(() => parseEndpointDetail("Unable to find object nosuch.\n\n"), /Unable to find object nosuch\./u);
  assert.throws(() => parseEndpointDetail(""), /parameter table/u);
});

// ------------------------------------------------------------ endpoint detail readings

test("endpointDetail refuses an id it will not put on a command line, and names it", async () => {
  const executor = new FakeExecutor([]);
  const readings = new AsteriskReadings(new LocalAsteriskCliGateway(executor), now);
  const reading = await readings.endpointDetail(WSL_TARGET, "1000 show version");
  assert.equal(reading.result.state, "unavailable");
  assert.match(String(reading.result.reason), /not one this console will put on a command line/u);
  // Nothing was run at all: the refusal happens before any process is spawned.
  assert.deepEqual(executor.requests, []);
});

test("endpointDetail sends exactly the id it was given as one argv element", async () => {
  const executor = new FakeExecutor([command(endpointDetailOutput([["allow", "(ulaw)"], ["transport", "transport-udp"]]))]);
  const readings = new AsteriskReadings(new LocalAsteriskCliGateway(executor), now);
  const reading = await readings.endpointDetail(WSL_TARGET, "sales-trunk1");
  assert.equal(reading.result.state, "available");
  assert.deepEqual(reading.result.value, { transport: "transport-udp", codecs: ["ulaw"] });
  assert.deepEqual(executor.requests[0].args, [
    "-d", "Ubuntu-22.04", "--", "asterisk", "-rx", "pjsip show endpoint sales-trunk1",
  ]);
});

test("endpointDetails reads every endpoint it was given and keys them by id", async () => {
  const executor = new FakeExecutor([
    command(endpointDetailOutput([["allow", "(ulaw|alaw)"], ["transport", "transport-udp"]])),
    command(endpointDetailOutput([["allow", "(opus)"], ["transport", ""]])),
  ]);
  const readings = new AsteriskReadings(new LocalAsteriskCliGateway(executor), now);
  const reading = await readings.endpointDetails(WSL_TARGET, ["1000", "1001"]);
  assert.equal(reading.result.state, "available");
  assert.deepEqual(reading.result.value, {
    byEndpoint: {
      1000: { transport: "transport-udp", codecs: ["ulaw", "alaw"] },
      1001: { codecs: ["opus"] },
    },
    notRead: [],
  });
});

test("endpointDetails reports every endpoint past the read budget rather than dropping it", async () => {
  const wanted = Array.from({ length: MAX_ENDPOINT_DETAILS + 3 }, (_, index) => `e${index}`);
  const executor = new FakeExecutor(
    Array.from({ length: MAX_ENDPOINT_DETAILS }, () => command(endpointDetailOutput([["allow", "(ulaw)"]]))),
  );
  const readings = new AsteriskReadings(new LocalAsteriskCliGateway(executor), now);
  const reading = await readings.endpointDetails(WSL_TARGET, wanted);
  assert.equal(reading.result.state, "available");
  const value = reading.result.value!;
  // Exactly the budget was run -- FakeExecutor throws on a request past its fake results,
  // so an off-by-one here would fail loudly rather than silently reading one more.
  assert.equal(executor.requests.length, MAX_ENDPOINT_DETAILS);
  assert.equal(Object.keys(value.byEndpoint).length, MAX_ENDPOINT_DETAILS);
  assert.deepEqual(value.notRead, [`e${MAX_ENDPOINT_DETAILS}`, `e${MAX_ENDPOINT_DETAILS + 1}`, `e${MAX_ENDPOINT_DETAILS + 2}`]);
});

test("endpointDetails keeps the endpoints it could read when one of them fails", async () => {
  const executor = new FakeExecutor([
    command(endpointDetailOutput([["allow", "(ulaw)"]])),
    command("Unable to find object 1001.\n\n"),
  ]);
  const readings = new AsteriskReadings(new LocalAsteriskCliGateway(executor), now);
  const reading = await readings.endpointDetails(WSL_TARGET, ["1000", "1001"]);
  assert.equal(reading.result.state, "available");
  assert.deepEqual(reading.result.value!.byEndpoint, { 1000: { codecs: ["ulaw"] } });
  assert.deepEqual(reading.result.value!.notRead, ["1001"]);
});

test("endpointDetails is unavailable, with the target's own reason, when nothing could be read", async () => {
  const readings = new AsteriskReadings(new FailingGateway(new Error("wsl.exe is not on PATH")), now);
  const reading = await readings.endpointDetails(WSL_TARGET, ["1000", "1001"]);
  assert.equal(reading.result.state, "unavailable");
  assert.match(String(reading.result.reason), /wsl\.exe is not on PATH/u);
});

test("endpointDetails with no endpoints runs nothing and reports an empty set", async () => {
  const executor = new FakeExecutor([]);
  const readings = new AsteriskReadings(new LocalAsteriskCliGateway(executor), now);
  const reading = await readings.endpointDetails(WSL_TARGET, []);
  assert.equal(reading.result.state, "available");
  assert.deepEqual(reading.result.value, { byEndpoint: {}, notRead: [] });
  assert.deepEqual(executor.requests, []);
});

// ------------------------------------------------------------ the endpoints view seam

/** Answers each allowlisted command line from a table, so one test can drive the whole
 *  `endpoints` view the way the dispatcher does rather than one reading at a time. */
class ScriptedGateway implements AsteriskCliGateway {
  readonly ran: string[] = [];
  constructor(private readonly byCommand: Record<string, string>) {}
  async run(_target: TargetProfile, cmd: string): Promise<CommandResult> {
    this.ran.push(cmd);
    return command(this.byCommand[cmd] ?? "");
  }
}

test("readEndpointsView carries the endpoint detail set out with the rest of the view", async () => {
  // The seam this guards: `endpointDetails` is read, and then has to actually leave the
  // function. Dropped here it reaches the table as two placeholder columns, with every
  // parser and row-builder test above still green.
  const gateway = new ScriptedGateway({
    "pjsip show endpoints": " Endpoint:  1000  Not in use  0 of inf",
    "pjsip show contacts": "",
    "pjsip show registrations": "",
    "pjsip show channelstats": "",
    "pjsip show endpoint 1000": endpointDetailOutput([["allow", "(ulaw|alaw)"], ["transport", "transport-tcp"]]),
  });
  const view = await readEndpointsView(new AsteriskReadings(gateway, now), WSL_TARGET);
  assert.ok(gateway.ran.includes("pjsip show endpoint 1000"), "the per-endpoint detail command was never run");
  assert.equal(view.endpointDetails.result.state, "available");
  assert.deepEqual(view.endpointDetails.result.value, {
    byEndpoint: { 1000: { transport: "transport-tcp", codecs: ["ulaw", "alaw"] } },
    notRead: [],
  });
  // The readings that were already there are still there.
  assert.equal(view.endpoints.result.state, "available");
  assert.equal(view.channelStats.result.state, "available");
});

test("readEndpointsView asks for no detail at all when the endpoint listing could not be read", async () => {
  const gateway = new ScriptedGateway({ "pjsip show endpoints": "Unable to connect to remote asterisk" });
  const view = await readEndpointsView(new AsteriskReadings(gateway, now), WSL_TARGET);
  assert.equal(view.endpoints.result.state, "unavailable");
  assert.equal(gateway.ran.filter((cmd) => cmd.startsWith("pjsip show endpoint ")).length, 0);
  assert.deepEqual(view.endpointDetails.result.value, { byEndpoint: {}, notRead: [] });
});

test("readView routes the endpoints view through readEndpointsView", () => {
  /* `readView` is a closure inside `createControlPlaneDispatcher`, and reaching it needs a
   * real WSL discovery run, so this asserts the routing line itself. Anchored to a whole
   * line on purpose: a substring needle would be satisfied by a commented-out call, which
   * is how a wiring line usually dies. */
  const source = readFileSync(new URL("../../control-plane/dispatch.ts", import.meta.url), "utf8").replace(/\r/gu, "");
  assert.ok(source.length > 1000, "dispatch.ts was not read");
  assert.match(source, /^\s*if \(view === 'endpoints'\) return await readEndpointsView\(readings, target\);$/mu);
});

// ------------------------------------------------------------ the object-id allowlist

test("isAllowedCommandLine accepts an object command with a plain id and the exact commands", () => {
  assert.equal(isAllowedCommandLine("pjsip show endpoints"), true);
  assert.equal(isAllowedCommandLine("pjsip show endpoint 1000"), true);
  assert.equal(isAllowedCommandLine("pjsip show endpoint sales-trunk_1.eu+42@example"), true);
});

test("isAllowedCommandLine refuses an object command with nothing after it", () => {
  assert.equal(isAllowedCommandLine("pjsip show endpoint"), false);
  assert.equal(isAllowedCommandLine("pjsip show endpoint "), false);
});

test("isAllowedCommandLine refuses an id carrying a second CLI word", () => {
  // No shell is involved, so this could not start another process -- but Asterisk reads
  // a->argv[3] and ignores the rest, so it would silently answer about a different object.
  assert.equal(isAllowedCommandLine("pjsip show endpoint 1000 like x"), false);
  assert.equal(isAllowedCommandLine("pjsip show endpoint 1000\ncore show version"), false);
});

test("isAllowedCommandLine refuses an over-long id and an unrelated command", () => {
  assert.equal(isAllowedCommandLine(`pjsip show endpoint ${"a".repeat(128)}`), true);
  assert.equal(isAllowedCommandLine(`pjsip show endpoint ${"a".repeat(129)}`), false);
  assert.equal(isAllowedCommandLine("core restart now"), false);
  assert.equal(isAllowedCommandLine("pjsip show contact 1000"), false);
});

test("the gateway refuses to run a command line the allowlist rejects", async () => {
  const executor = new FakeExecutor([]);
  const gateway = new LocalAsteriskCliGateway(executor);
  await assert.rejects(
    () => gateway.run(WSL_TARGET, "pjsip show endpoint 1000 like x" as never),
    /Command is not allowlisted/u,
  );
  assert.deepEqual(executor.requests, []);
});

// ------------------------------------------------------------ parseContacts
// res/res_pjsip/location.c cli_contact_print_body:
// "%*s:  %s/%-*.*s %-10.10s %-7.7s %11.3f\n" -> " Contact:  <aor>/<uri>  <hash> <status> <rtt>"

test("parseContacts reads rows, including an unreachable contact with no numeric rtt", () => {
  const stdout = [
    " Contact:  <Aor/ContactUri.......................> <Hash....> <Status> <RTT(ms)..>",
    "==========================================================================================",
    "",
    " Contact:  1000/sip:1000@10.0.0.5:5060  5f3a9c2b1d Avail  12.345",
    " Contact:  1001/sip:1001@10.0.0.6:5060  a1b2c3d4e5 Unavail    nan",
    "",
    "Objects found: 2",
  ].join("\n");
  const rows = parseContacts(stdout);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { aor: "1000", uri: "sip:1000@10.0.0.5:5060", status: "Avail", roundTripMs: 12.345 });
  assert.equal(rows[1].status, "Unavail");
  assert.equal(rows[1].roundTripMs, undefined);
});

test("parseContacts on empty output yields no rows", () => {
  assert.deepEqual(parseContacts(""), []);
});

// ------------------------------------------------------------ parseRegistrations
// res/res_pjsip_outbound_registration.c cli_print_header/cli_print_body: there is no
// "Registration:" label in the real output, only " <id>/<server uri>  <auth>  <status>".

test("parseRegistrations reads rows from the real (label-less) pjsip show registrations format", () => {
  const stdout = [
    " <Registration/ServerURI..............................>  <Auth....................>  <Status.......>",
    " trunk1/sip:sip.example.com:5060                          n/a                         Registered (exp. 3600s)",
    " trunk2/sip:sip2.example.com:5060                         trunk2-auth                 Unregistered",
    "",
  ].join("\n");
  const rows = parseRegistrations(stdout);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { id: "trunk1", serverUri: "sip:sip.example.com:5060", status: "Registered (exp. 3600s)" });
  assert.deepEqual(rows[1], { id: "trunk2", serverUri: "sip:sip2.example.com:5060", status: "Unregistered" });
});

test("parseRegistrations does not mistake the bracketed header line for a row", () => {
  const stdout = " <Registration/ServerURI..............................>  <Auth....................>  <Status.......>\n";
  assert.deepEqual(parseRegistrations(stdout), []);
});

test("parseRegistrations on empty output yields no rows", () => {
  assert.deepEqual(parseRegistrations(""), []);
});

// ------------------------------------------------------------ parseQueues
// apps/app_queue.c print_queue: header line via ast_str_append(... "%s has %d calls (max %s) in
// '%s' strategy (%ds holdtime, %ds talktime), W:%d, C:%d, A:%d, SL:%2.1f%%, ..."), then a
// "   Members: " line followed by one six-space-indented line per member (do_print per member).

// Regression: member lines ("      %s ...") and caller lines ("      %d. %s (wait: ...")
// share the same six-space indent in print_queue, so a naive "count six-space lines" parser
// would also count callers as members. This fixture has 2 members and 1 caller for support1.
test("parseQueues reads queue summaries, counts members, and skips 'No Members'", () => {
  const stdout = [
    "support1 has 2 calls (max unlimited) in 'ringall' strategy (30s holdtime, 0s talktime), W:0, C:15, A:1, SL:92.3%, SL2:91.7% within 60s",
    "   Members: ",
    "      Agent/1001 (ringinuse enabled) (Not in use) has taken 10 calls (last was 42 secs ago) (login was 120 secs ago)",
    "      Agent/1002 (ringinuse enabled) (In use) has taken 5 calls (last was 5 secs ago) (login was 300 secs ago)",
    "   Callers: ",
    "      1. PJSIP/2000-00000002 (wait: 0:15, prio: 0)",
    "",
    "support2 has 0 calls (max 50) in 'leastrecent' strategy (45s holdtime, 0s talktime), W:0, C:0, A:0, SL:0.0%, SL2:0.0% within 60s",
    "   No Members",
    "   No Callers",
    "",
  ].join("\n");
  const rows = parseQueues(stdout);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    name: "support1",
    strategy: "ringall",
    callers: 2,
    members: 2,
    holdtimeSeconds: 30,
    completed: 15,
    abandoned: 1,
    serviceLevelPercent: 92.3,
  });
  assert.equal(rows[1].members, 0);
  assert.equal(rows[1].callers, 0);
});

test("parseQueues on empty output yields no rows", () => {
  assert.deepEqual(parseQueues(""), []);
});

// ------------------------------------------------------------ parseModules
// main/cli.c handle_modlist: header via MODLIST_FORMAT2 "%-30s %-40.40s %-10s %-11s %13s\n",
// rows via MODLIST_FORMAT "%-30s %-40.40s %-10d %-11s %13s\n", trailer "%d modules loaded\n".

test("parseModules reads rows and ignores the header and 'modules loaded' trailer", () => {
  const stdout = [
    "Module                         Description                              Use Count  Status      Support Level",
    "app_queue.so                   True Call Queueing                       12         Running              core",
    "chan_pjsip.so                  PJSIP Channel Driver                     45         Running              core",
    "271 modules loaded",
  ].join("\n");
  const rows = parseModules(stdout);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    name: "app_queue.so",
    description: "True Call Queueing",
    useCount: 12,
    status: "Running",
    support: "core",
  });
  assert.equal(rows[1].name, "chan_pjsip.so");
});

test("parseModules ignores malformed lines and empty output", () => {
  assert.deepEqual(parseModules(""), []);
  assert.deepEqual(parseModules("garbage line with no useful columns"), []);
});

// ------------------------------------------------------------ parseIax2Peers
// channels/chan_iax2.c PEERS_FORMAT (line 6996):
// "%-15.15s  %-40.40s %s  %-40.40s  %-6s%s %s  %-11s %-32.32s\n"
// -> name(15) host(40) dynFlag mask(40) port(6) trunkFlag encFlag status(11) description(32)
// Built with the same field widths/truncation as the real printf spec so the fixed column
// offsets `parseIax2Peers` slices on land exactly where Asterisk puts them.
const padTrunc = (value: string, width: number): string =>
  value.length > width ? value.slice(0, width) : value.padEnd(width, " ");

function iaxPeersRow(
  name: string, host: string, dynamic: boolean, mask: string, port: string,
  trunk: boolean, status: string, description = "",
): string {
  // status is "%-11s" with no ".N" precision, unlike every field around it -- padded but
  // never truncated, exactly like LAGGED/OK's own possible values can run past 11 chars.
  return padTrunc(name, 15) + "  " + padTrunc(host, 40) + " " + (dynamic ? "(D)" : "(S)") + "  "
    + padTrunc(mask, 40) + "  " + port.padEnd(6, " ") + (trunk ? "(T)" : "   ") + " " + "   " + "  "
    + status.padEnd(11, " ") + " " + padTrunc(description, 32);
}

test("parseIax2Peers reads name/host/dynamic/trunk/status off the fixed-width row", () => {
  const stdout = [
    "Name/Username    Host                                       Mask                                      Port     Status      Description",
    iaxPeersRow("branch-office", "203.0.113.9", true, "0.0.0.0", "4569", true, "OK (5 ms)"),
    iaxPeersRow("carrier-iax", "198.51.100.4", false, "255.255.255.255", "4569", false, "UNREACHABLE"),
    "2 iax2 peers [1 online, 1 offline, 0 unmonitored]",
  ].join("\n");
  const rows = parseIax2Peers(stdout);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { name: "branch-office", host: "203.0.113.9", dynamic: true, trunk: true, status: "OK (5 ms)" });
  assert.deepEqual(rows[1], { name: "carrier-iax", host: "198.51.100.4", dynamic: false, trunk: false, status: "UNREACHABLE" });
});

test("parseIax2Peers reads a status value that contains a space (OK (%d ms) / LAGGED (%d ms))", () => {
  const stdout = [
    iaxPeersRow("peer-a", "10.0.0.5", true, "0.0.0.0", "4569", false, "OK (23 ms)"),
    iaxPeersRow("peer-b", "10.0.0.6", true, "0.0.0.0", "4569", false, "LAGGED (410 ms)"),
  ].join("\n");
  const rows = parseIax2Peers(stdout);
  assert.equal(rows[0].status, "OK (23 ms)");
  assert.equal(rows[1].status, "LAGGED (410 ms)");
});

test("parseIax2Peers strips the CLI's own name/username join back to iax.conf's section name", () => {
  // _iax2_show_peers_one writes "%s/%s" (peer name, username) into the Name column when the
  // peer sets username= -- that combined string is not the [section] name iax.conf uses.
  const stdout = iaxPeersRow("branch-office/asterisk", "203.0.113.9", true, "0.0.0.0", "4569", false, "UNKNOWN");
  assert.equal(parseIax2Peers(stdout)[0].name, "branch-office");
});

test("parseIax2Peers excludes the header row and the summary trailer", () => {
  const header = "Name/Username    Host                                       Mask                                      Port     Status      Description".padEnd(150, " ");
  const trailer = "1 iax2 peers [1 online, 0 offline, 0 unmonitored]";
  assert.deepEqual(parseIax2Peers([header, trailer].join("\n")), []);
});

test("parseIax2Peers ignores empty output, blank lines and a line too short to be a real row", () => {
  assert.deepEqual(parseIax2Peers(""), []);
  assert.deepEqual(parseIax2Peers("\n\n"), []);
  assert.deepEqual(parseIax2Peers("garbage"), []);
});

// ------------------------------------------------------------ parseIax2Registry
// channels/chan_iax2.c FORMAT (line 7484):
// "%-45.45s  %-6.6s  %-10.10s  %-45.45s %8d  %s\n"
// -> host(45) dnsmgr(6) username(10) perceived(45) refresh(8, right-justified) state
function iaxRegistryRow(host: string, dnsmgr: boolean, username: string, perceived: string, refresh: number, state: string): string {
  return padTrunc(host, 45) + "  " + padTrunc(dnsmgr ? "Y" : "N", 6) + "  " + padTrunc(username, 10) + "  "
    + padTrunc(perceived, 45) + " " + String(refresh).padStart(8, " ") + "  " + state;
}

test("parseIax2Registry reads host/username/refresh/state off the fixed-width row", () => {
  const stdout = [
    "Host                                           dnsmgr  Username    Perceived                                     Refresh  State",
    iaxRegistryRow("203.0.113.9:4569", false, "markpasswd", "<Unregistered>", 60, "Unregistered"),
    iaxRegistryRow("198.51.100.4:4569", true, "joe", "203.0.113.50:4569", 120, "Registered"),
  ].join("\n");
  const rows = parseIax2Registry(stdout);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { host: "203.0.113.9:4569", username: "markpasswd", refresh: 60, state: "Unregistered" });
  assert.deepEqual(rows[1], { host: "198.51.100.4:4569", username: "joe", refresh: 120, state: "Registered" });
});

test("parseIax2Registry reads every documented regstate2str value, including the two-word ones", () => {
  // regstate2str's own literal returns, chan_iax2.c lines 7459-7478 -- "Request Sent" and
  // "Auth. Sent" are exactly the values a whitespace-splitting reader would misread.
  for (const state of ["Unregistered", "Request Sent", "Auth. Sent", "Registered", "Rejected", "Timeout", "No Authentication", "Unknown"]) {
    const row = iaxRegistryRow("203.0.113.9:4569", false, "joe", "<Unregistered>", 60, state);
    assert.equal(parseIax2Registry(row)[0].state, state);
  }
});

test("parseIax2Registry excludes the header row", () => {
  const header = "Host                                           dnsmgr  Username    Perceived                                     Refresh  State";
  assert.deepEqual(parseIax2Registry(header), []);
});

test("parseIax2Registry ignores empty output and a line too short to be a real row", () => {
  assert.deepEqual(parseIax2Registry(""), []);
  assert.deepEqual(parseIax2Registry("3 IAX2 registrations."), []);
});

// ------------------------------------------------------------ parseUptimeSeconds

test("parseUptimeSeconds reads the plain-seconds form", () => {
  assert.equal(parseUptimeSeconds("System uptime: 123456\n"), 123456);
});

test("parseUptimeSeconds throws when uptime is absent (e.g. Asterisk just started)", () => {
  assert.throws(() => parseUptimeSeconds(""), /uptime was not present/u);
});

// ------------------------------------------------------------ LocalAsteriskCliGateway

test("LocalAsteriskCliGateway builds a wsl.exe invocation for a wsl target", async () => {
  const executor = new FakeExecutor([command("System uptime: 10\n")]);
  const gateway = new LocalAsteriskCliGateway(executor);
  await gateway.run(WSL_TARGET, "core show uptime seconds");
  assert.deepEqual(executor.requests[0], {
    executable: "wsl.exe",
    args: ["-d", "Ubuntu-22.04", "--", "asterisk", "-rx", "core show uptime seconds"],
  });
});

test("LocalAsteriskCliGateway builds a docker exec invocation for a localDocker target", async () => {
  const executor = new FakeExecutor([command("System uptime: 10\n")]);
  const gateway = new LocalAsteriskCliGateway(executor);
  await gateway.run(DOCKER_TARGET, "module show");
  assert.deepEqual(executor.requests[0], {
    executable: "docker",
    args: ["exec", "asterisk-1", "asterisk", "-rx", "module show"],
  });
});

test("LocalAsteriskCliGateway rejects a command that is not allowlisted", async () => {
  const executor = new FakeExecutor([]);
  const gateway = new LocalAsteriskCliGateway(executor);
  await assert.rejects(
    gateway.run(WSL_TARGET, "core stop now" as unknown as ReadOnlyCommand),
    /not allowlisted/u,
  );
  assert.equal(executor.requests.length, 0);
});

test("LocalAsteriskCliGateway requires a discovered distribution for a wsl target", async () => {
  const gateway = new LocalAsteriskCliGateway(new FakeExecutor([]));
  const target: TargetProfile = { id: "t3", displayName: "No distro", connectionKind: "wsl" };
  await assert.rejects(gateway.run(target, "module show"), /discovered distribution/u);
});

test("LocalAsteriskCliGateway requires a discovered container for a localDocker target", async () => {
  const gateway = new LocalAsteriskCliGateway(new FakeExecutor([]));
  const target: TargetProfile = { id: "t4", displayName: "No container", connectionKind: "localDocker" };
  await assert.rejects(gateway.run(target, "module show"), /discovered container/u);
});

test("LocalAsteriskCliGateway has no local CLI gateway for a remote connection kind", async () => {
  const gateway = new LocalAsteriskCliGateway(new FakeExecutor([]));
  const target: TargetProfile = { id: "t5", displayName: "Remote", connectionKind: "remoteLinux" };
  await assert.rejects(gateway.run(target, "module show"), /has no local CLI gateway/u);
});

// ------------------------------------------------------------ AsteriskReadings

test("AsteriskReadings.uptimeSeconds turns a succeeded command into an available reading", async () => {
  const readings = new AsteriskReadings(new FixedGateway(command("System uptime: 42\n")), now);
  const reading = await readings.uptimeSeconds(WSL_TARGET);
  assert.deepEqual(reading, {
    command: "core show uptime seconds",
    result: { state: "available", observedAt: NOW.toISOString(), value: 42 },
  });
});

test("AsteriskReadings produces unavailable with an exact reason when the gateway throws", async () => {
  const readings = new AsteriskReadings(new FailingGateway(new Error("spawn wsl.exe ENOENT")), now);
  const reading = await readings.channels(WSL_TARGET);
  assert.equal(reading.result.state, "unavailable");
  assert.equal((reading.result as { reason: string }).reason, "spawn wsl.exe ENOENT");
});

test("AsteriskReadings produces unavailable with an exact reason on a failed CommandResult", async () => {
  const readings = new AsteriskReadings(new FixedGateway(command("", "No such command.", "failed")), now);
  const reading = await readings.modules(WSL_TARGET);
  assert.equal(reading.result.state, "unavailable");
  assert.equal(
    (reading.result as { reason: string }).reason,
    '`asterisk -rx "module show"` failed: No such command.',
  );
});

test("AsteriskReadings produces unavailable with an exact reason on a timed-out CommandResult", async () => {
  const readings = new AsteriskReadings(new FixedGateway(command("", "", "timedOut")), now);
  const reading = await readings.queues(WSL_TARGET);
  assert.deepEqual(reading.result, { state: "unavailable", observedAt: NOW.toISOString(), reason: '`asterisk -rx "queue show"` timedOut' });
});

test("AsteriskReadings surfaces 'Unable to connect to remote asterisk' as the exact reason", async () => {
  const readings = new AsteriskReadings(new FixedGateway(command("Unable to connect to remote asterisk (does /var/run/asterisk/asterisk.ctl exist?)\n")), now);
  const reading = await readings.endpoints(WSL_TARGET);
  assert.deepEqual(reading.result, {
    state: "unavailable",
    observedAt: NOW.toISOString(),
    reason: "Unable to connect to remote asterisk (does /var/run/asterisk/asterisk.ctl exist?)",
  });
});

test("AsteriskReadings wraps a parser exception into an unavailable reading", async () => {
  const readings = new AsteriskReadings(new FixedGateway(command("garbage, no uptime here")), now);
  const reading = await readings.uptimeSeconds(WSL_TARGET);
  assert.equal(reading.result.state, "unavailable");
  assert.match((reading.result as { reason: string }).reason, /Could not read the output of `core show uptime seconds`/u);
});

test("AsteriskReadings.raw trims trailing whitespace and allows any allowlisted command", async () => {
  const readings = new AsteriskReadings(new FixedGateway(command("some output\n\n")), now);
  const reading = await readings.raw(WSL_TARGET, "core show version");
  assert.deepEqual(reading, {
    command: "core show version",
    result: { state: "available", observedAt: NOW.toISOString(), value: "some output" },
  });
});
