import assert from "node:assert/strict";
import test from "node:test";

import {
  AsteriskReadings,
  LocalAsteriskCliGateway,
  parseChannels,
  parseChannelStats,
  parseContacts,
  parseEndpoints,
  parseModules,
  parseQueues,
  parseRegistrations,
  parseUptimeSeconds,
} from "../../control-plane/asterisk-readings.ts";
import type { AsteriskCliGateway, ReadOnlyCommand } from "../../control-plane/asterisk-readings.ts";
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
