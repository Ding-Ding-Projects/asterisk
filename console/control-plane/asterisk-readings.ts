import type { CapabilityResult, TargetProfile } from "./contracts.js";
import type { CommandResult, ProcessExecutor } from "./executor.js";

/**
 * Reads a live Asterisk through its own CLI and turns the output into the rows the
 * console screens display. Every command is read-only and comes from the allowlist
 * below; nothing is composed from user input and no shell is involved.
 *
 * Output formats are taken from the Asterisk sources in this repository:
 *   main/cli.c                          core show channels [concise|count], core show uptime
 *   res/res_pjsip/pjsip_configuration.c pjsip show endpoints
 *   res/res_pjsip/location.c            pjsip show contacts
 *   apps/app_queue.c                    queue show
 *   main/loader.c                       module show
 *   channels/chan_iax2.c                iax2 show peers, iax2 show registry
 */
export const READ_ONLY_COMMANDS = [
  "core show channels concise",
  "core show channels count",
  "core show uptime seconds",
  "core show sysinfo",
  "core show version",
  "pjsip show endpoints",
  "pjsip show contacts",
  "pjsip show registrations",
  "pjsip show auths",
  "pjsip show transports",
  "queue show",
  "voicemail show users",
  "confbridge list",
  "moh show classes",
  "core show codecs",
  "rtp show settings",
  "cdr show status",
  "manager show settings",
  "ari show status",
  "module show",
  "logger show channels",
  "acl show",
  "dialplan show",

  /* Everything below was verified to exist in this checkout by searching the CLI
   * registrations in the Asterisk sources, not recalled. A command that does not exist
   * fails at the target and looks to a user like the subsystem is broken. */

  // Fax
  "fax show settings", "fax show stats", "fax show sessions",
  // Analogue, T1/E1 and PRI hardware
  "dahdi show channels", "dahdi show status", "dahdi show version",
  // IAX2 trunking
  "iax2 show peers", "iax2 show registry",
  // Channel event logging, the compliance counterpart to call records
  "cel show status",
  // Database connectivity
  "odbc show", "database show",
  // The built-in HTTP server, which the manager and REST interfaces ride on
  "http show status",
  // Call parking, transfer and feature codes
  "features show", "parking show",
  // Shared line appearances
  "sla show stations", "sla show trunks",
  // Dialplan scripting
  "agi show commands",
  // Distributed dialplan lookup
  "dundi show peers", "dundi show mappings",
  // Call attestation
  "stir_shaken show profile", "stir_shaken show verification", "stir_shaken show tn",
  // Emergency-services location. The command is geoloc, not geolocation.
  "geoloc show profiles", "geoloc list locations",
  // Manager and REST interfaces
  "manager show connected", "manager show users", "manager show commands",
  "ari show apps", "ari show users",
  // Endpoint detail the endpoints screen could not previously reach
  "pjsip show aors", "pjsip show identifies", "pjsip show channelstats",
  // Calendars
  "calendar show calendars", "calendar show types",
  // Media and codecs
  "core show translation", "core show file formats", "media cache show",
  // Voicemail
  "voicemail show zones",
  // Runtime health
  "stun show status", "core show threads",
] as const;

export type ReadOnlyCommand = (typeof READ_ONLY_COMMANDS)[number];

const ALLOWED = new Set<string>(READ_ONLY_COMMANDS);

export interface Reading<T> {
  command: ReadOnlyCommand;
  result: CapabilityResult<T>;
}

export interface Channel {
  name: string;
  context: string;
  extension: string;
  state: string;
  application: string;
  callerNumber: string;
  durationSeconds: number;
  bridgeId: string;
  uniqueId: string;
}

export interface Endpoint {
  id: string;
  callerId?: string;
  state: string;
  channels: string;
  /** The endpoint's own `transport=` id, when the config sets one explicitly. Most
   *  endpoints do not (transports are auto-matched by the inbound connection), so this
   *  is legitimately absent far more often than not -- see `parseEndpoints` below. */
  transport?: string;
}

/**
 * One row of `pjsip show channelstats`, keyed to the live channel it was measured on
 * rather than to an endpoint directly -- see `parseChannelStats` below for how the
 * endpoint id is recovered from the channel name.
 */
export interface ChannelCodecUsage {
  /** Full channel name as PJSIP names it, e.g. `PJSIP/1000-00000001`. */
  channelName: string;
  /** `channelName` with the `PJSIP/<id>-` wrapper removed. */
  endpointId: string;
  /** The codec in use on that channel's default audio stream, when Asterisk could read
   *  one. Absent for "direct media", "not valid", "no audio streams" and "corrupted
   *  default audio session" rows -- none of those print a codec at all, so there is
   *  nothing honest to report for them. */
  codec?: string;
}

export interface Contact {
  aor: string;
  uri: string;
  status: string;
  roundTripMs?: number;
}

export interface Registration {
  id: string;
  serverUri: string;
  status: string;
}

export interface QueueSummary {
  name: string;
  strategy: string;
  callers: number;
  members: number;
  holdtimeSeconds: number;
  completed: number;
  abandoned: number;
  serviceLevelPercent?: number;
}

export interface ModuleSummary {
  name: string;
  description: string;
  useCount: number;
  status: string;
  support: string;
}

/** One row of `iax2 show peers` -- see `parseIax2Peers` for the exact format string. */
export interface IaxPeer {
  /** `peer->name`, i.e. the `[section]` iax.conf itself uses -- with any trailing
   *  `/<username>` the CLI appends for a peer that also sets `username=` stripped back
   *  off, so a clicked row can be matched to iax.conf's own peer/friend section by name. */
  name: string;
  host: string;
  dynamic: boolean;
  trunk: boolean;
  status: string;
}

/** One row of `iax2 show registry` -- see `parseIax2Registry` for the exact format string. */
export interface IaxRegistration {
  host: string;
  username: string;
  refresh: number;
  state: string;
}

/** Runs one allowlisted CLI command against a target. */
export interface AsteriskCliGateway {
  run(target: TargetProfile, command: ReadOnlyCommand, signal?: AbortSignal): Promise<CommandResult>;
}

/** Invokes `asterisk -rx` on a discovered WSL distribution or local container. */
export class LocalAsteriskCliGateway implements AsteriskCliGateway {
  readonly #executor: ProcessExecutor;

  constructor(executor: ProcessExecutor) {
    this.#executor = executor;
  }

  async run(target: TargetProfile, command: ReadOnlyCommand, signal?: AbortSignal): Promise<CommandResult> {
    if (!ALLOWED.has(command)) throw new Error(`Command is not allowlisted: ${command}`);
    const invocation = this.#invocation(target, command);
    return await this.#executor.execute({ ...invocation, signal, timeoutMs: 15_000, maxOutputBytes: 2 * 1024 * 1024 });
  }

  #invocation(target: TargetProfile, command: ReadOnlyCommand): { executable: string; args: ReadonlyArray<string> } {
    if (target.connectionKind === "wsl") {
      if (!target.wslDistribution) throw new Error("A WSL target requires a discovered distribution name");
      return { executable: "wsl.exe", args: ["-d", target.wslDistribution, "--", "asterisk", "-rx", command] };
    }
    if (target.connectionKind === "localDocker") {
      if (!target.dockerContext) throw new Error("A container target requires a discovered container id");
      return { executable: "docker", args: ["exec", target.dockerContext, "asterisk", "-rx", command] };
    }
    throw new Error(`Connection kind ${target.connectionKind} has no local CLI gateway`);
  }
}

export class AsteriskReadings {
  readonly #gateway: AsteriskCliGateway;
  readonly #now: () => Date;

  constructor(gateway: AsteriskCliGateway, now: () => Date = () => new Date()) {
    this.#gateway = gateway;
    this.#now = now;
  }

  channels(target: TargetProfile, signal?: AbortSignal): Promise<Reading<Channel[]>> {
    return this.#read(target, "core show channels concise", parseChannels, signal);
  }

  endpoints(target: TargetProfile, signal?: AbortSignal): Promise<Reading<Endpoint[]>> {
    return this.#read(target, "pjsip show endpoints", parseEndpoints, signal);
  }

  /** The only CLI command that ever prints a codec: the endpoint's own `allow=` list is
   *  not shown by `pjsip show endpoints` (that requires `show_details`, which the CLI
   *  never sets for the plural listing -- only `pjsip show endpoint <id>` sets it, and
   *  that needs a per-endpoint argument this console does not compose). What this reads
   *  instead is the codec actually negotiated on each live channel, which is honestly
   *  absent for an endpoint with no active call. */
  channelStats(target: TargetProfile, signal?: AbortSignal): Promise<Reading<ChannelCodecUsage[]>> {
    return this.#read(target, "pjsip show channelstats", parseChannelStats, signal);
  }

  contacts(target: TargetProfile, signal?: AbortSignal): Promise<Reading<Contact[]>> {
    return this.#read(target, "pjsip show contacts", parseContacts, signal);
  }

  registrations(target: TargetProfile, signal?: AbortSignal): Promise<Reading<Registration[]>> {
    return this.#read(target, "pjsip show registrations", parseRegistrations, signal);
  }

  queues(target: TargetProfile, signal?: AbortSignal): Promise<Reading<QueueSummary[]>> {
    return this.#read(target, "queue show", parseQueues, signal);
  }

  modules(target: TargetProfile, signal?: AbortSignal): Promise<Reading<ModuleSummary[]>> {
    return this.#read(target, "module show", parseModules, signal);
  }

  iaxPeers(target: TargetProfile, signal?: AbortSignal): Promise<Reading<IaxPeer[]>> {
    return this.#read(target, "iax2 show peers", parseIax2Peers, signal);
  }

  iaxRegistrations(target: TargetProfile, signal?: AbortSignal): Promise<Reading<IaxRegistration[]>> {
    return this.#read(target, "iax2 show registry", parseIax2Registry, signal);
  }

  uptimeSeconds(target: TargetProfile, signal?: AbortSignal): Promise<Reading<number>> {
    return this.#read(target, "core show uptime seconds", parseUptimeSeconds, signal);
  }

  /** Raw output of any allowlisted command, for the CLI builder's read-only console. */
  raw(target: TargetProfile, command: ReadOnlyCommand, signal?: AbortSignal): Promise<Reading<string>> {
    return this.#read(target, command, (stdout) => stdout.replace(/\s+$/u, ""), signal);
  }

  async #read<T>(
    target: TargetProfile,
    command: ReadOnlyCommand,
    parse: (stdout: string) => T,
    signal?: AbortSignal,
  ): Promise<Reading<T>> {
    const observedAt = this.#now().toISOString();
    let result: CommandResult;
    try {
      result = await this.#gateway.run(target, command, signal);
    } catch (error) {
      return { command, result: { state: "unavailable", observedAt, reason: reason(error) } };
    }
    if (result.status !== "succeeded") {
      const detail = result.stderr.trim() || result.stdout.trim();
      return {
        command,
        result: {
          state: "unavailable",
          observedAt,
          reason: `\`asterisk -rx "${command}"\` ${result.status}${detail ? `: ${firstLine(detail)}` : ""}`,
        },
      };
    }
    if (/No such command|Unable to connect to remote asterisk/iu.test(result.stdout)) {
      return { command, result: { state: "unavailable", observedAt, reason: firstLine(result.stdout.trim()) } };
    }
    try {
      return { command, result: { state: "available", observedAt, value: parse(result.stdout) } };
    } catch (error) {
      return { command, result: { state: "unavailable", observedAt, reason: `Could not read the output of \`${command}\`: ${reason(error)}` } };
    }
  }
}

// ---------------------------------------------------------------- parsers

/** `main/cli.c` CONCISE_FORMAT_STRING: 14 `!`-separated fields per channel. */
export function parseChannels(stdout: string): Channel[] {
  return lines(stdout)
    .map((line) => line.split("!"))
    .filter((fields) => fields.length >= 14)
    .map((fields) => ({
      name: fields[0],
      context: fields[1],
      extension: fields[2],
      state: fields[4],
      application: fields[5],
      callerNumber: fields[7],
      durationSeconds: Number.parseInt(fields[11], 10) || 0,
      bridgeId: fields[12],
      uniqueId: fields[13],
    }));
}

/**
 * `res/res_pjsip/pjsip_configuration.c` `cli_endpoint_print_body`:
 * `"%*s:  %-*.*s  %-12.12s  %d of %.0f\n"` -> ` Endpoint:  <id[/cid]>  <state>  <n of m>`.
 *
 * `pjsip show endpoints` runs with `context.recurse = 1` (`ast_sip_cli_traverse_objects`,
 * `res/res_pjsip/pjsip_cli.c` line 152), so `cli_endpoint_print_body` also calls
 * `cli_endpoint_print_child_body("transport", endpoint, context)` for every endpoint
 * (`pjsip_configuration.c` line 2180). That child line comes from `config_transport.c`
 * `cli_print_body`: `"%*s:  %-21s  %6s  %5u  %5u  %s\n"` -> `  Transport:  <id>  <type>
 * <cos>  <tos>  <bind address>`. Its own `cli_iterate` (`config_transport.c`, just above
 * `cli_print_header`) looks the endpoint's `transport` field up by id and returns -1 --
 * printing nothing at all -- when that field is empty, which is the common case
 * (transports are auto-matched from the inbound connection, not pinned per endpoint).
 * So a missing Transport line is the honest, frequent outcome, not a parser miss.
 */
export function parseEndpoints(stdout: string): Endpoint[] {
  const rows: Endpoint[] = [];
  let current: Endpoint | null = null;
  for (const line of lines(stdout)) {
    const endpointMatch = /^\s*Endpoint:\s{2}(\S+)\s+(\S.*?)\s{2,}(\d+ of \S+)\s*$/u.exec(line);
    if (endpointMatch) {
      const [id, callerId] = endpointMatch[1].split("/");
      current = { id, callerId, state: endpointMatch[2].trim(), channels: endpointMatch[3] };
      rows.push(current);
      continue;
    }
    if (!current) continue;
    // "  Transport:  <TransportId(21)>  <Type(6)>  <cos(5)>  <tos(5)>  <BindAddress>". The
    // two numeric fields (cos, tos) are what pins this to the real row shape rather than
    // matching some other line that merely starts with "Transport:".
    const transportMatch = /^\s*Transport:\s{2}(\S+)\s+(\S+)\s+\d+\s+\d+\s+\S+\s*$/u.exec(line);
    if (transportMatch) current.transport = transportMatch[1];
  }
  return rows;
}

/**
 * `channels/pjsip/cli_commands.c` `cli_channelstats_print_body`: the only row shape that
 * carries a codec is the full stats line,
 * `" %8.8s %-18.18s %-8.8s %-6.6s %6u%s %6u%s %3u %7.3f %6u%s %6u%s %3u %7.3f %7.3f\n"`
 * (bridge id, channel id, uptime, codec, then RTP counters this reader has no use for).
 * A channel that is gone by the time Asterisk looks it up, has no audio stream, has a
 * corrupted session, or is in direct media prints a short one-line message instead --
 * `"<name> not valid"`, `"<name> no audio streams"`, `"<name> corrupted default audio
 * session"`, `"<name> direct media"` -- with no codec field in it at all. There is
 * genuinely nothing to read there, so those lines are skipped rather than turned into a
 * row with an invented codec.
 *
 * The fixed-width columns mean a blank codec (no `rawreadformat` yet) prints as pure
 * whitespace rather than an omitted field, exactly like `parseVoicemailUsers` above --
 * so this slices by the format's own column offsets (bridgeId 1-8, channelId 10-27,
 * uptime 29-36, codec 38-43, one space between each) and drops any row whose separator
 * positions do not land on spaces, rather than misreading a shifted column as a value.
 *
 * `channelId` is `snapshot->base->name` with its 6-character `"PJSIP/"` prefix removed
 * (`print_name += 6` in the same function); this command only ever sees PJSIP channels
 * (`cli_message_to_snapshot`, a few lines above, links a snapshot only when
 * `snapshot->base->type` is `"PJSIP"`). The endpoint id is recovered by stripping the
 * trailing `-<8 lowercase hex digits>` sequence Asterisk appends when it names the
 * channel: `channels/chan_pjsip.c` line 667, `ast_channel_alloc_with_initializers(...,
 * "PJSIP/%s-%08x", ...)`.
 */
export function parseChannelStats(stdout: string): ChannelCodecUsage[] {
  const rows: ChannelCodecUsage[] = [];
  for (const line of lines(stdout)) {
    if (line.length < 45 || line[9] !== " " || line[28] !== " " || line[37] !== " " || line[44] !== " ") continue;
    const bridgeId = line.slice(1, 9).trim();
    if (bridgeId === "BridgeId") continue; // the header row, which happens to share this column layout
    const channelId = line.slice(10, 28).trim();
    const codec = line.slice(38, 44).trim();
    if (!channelId || !codec) continue;
    rows.push({
      channelName: `PJSIP/${channelId}`,
      endpointId: channelId.replace(/-[0-9a-f]{8}$/u, ""),
      codec,
    });
  }
  return rows;
}

/** `res/res_pjsip/location.c`: ` Contact:  <aor/uri>  <hash>  <status>  <rtt>`. */
export function parseContacts(stdout: string): Contact[] {
  const rows: Contact[] = [];
  for (const line of lines(stdout)) {
    const match = /^\s*Contact:\s{2}(\S+?)\/(sip\S*)\s+\S+\s+(\S+)\s+(\S+)?/u.exec(line);
    if (!match) continue;
    const rtt = match[4] === undefined ? Number.NaN : Number.parseFloat(match[4]);
    rows.push({ aor: match[1], uri: match[2], status: match[3], roundTripMs: Number.isFinite(rtt) ? rtt : undefined });
  }
  return rows;
}

/**
 * `res/res_pjsip_outbound_registration.c` `cli_print_body`: unlike endpoints/contacts, a
 * registration line carries no `Registration:` label — just ` <id>/<server uri>  <auth>  <status>`.
 * The header line (`cli_print_header`) is the only line with angle brackets, so it is
 * excluded rather than matched on a label that the real output never prints.
 */
export function parseRegistrations(stdout: string): Registration[] {
  const rows: Registration[] = [];
  for (const line of lines(stdout)) {
    if (/[<>]/u.test(line)) continue;
    const match = /^\s*(\S+)\/(\S+)\s{2,}\S+\s{2,}(\S.*?)\s*$/u.exec(line);
    if (!match) continue;
    rows.push({ id: match[1], serverUri: match[2], status: match[3] });
  }
  return rows;
}

/** `apps/app_queue.c`: `name has N calls (max …) in 'strategy' strategy (…)` then member lines. */
export function parseQueues(stdout: string): QueueSummary[] {
  const rows: QueueSummary[] = [];
  let current: QueueSummary | null = null;
  // print_queue's member lines ("      %s ...") and caller lines ("      %d. %s (wait: ...")
  // share the same six-space indent, so once the "   Callers: " line for this queue is seen,
  // stop counting six-space lines as members.
  let inCallers = false;
  for (const line of lines(stdout, { keepBlank: true })) {
    const header =
      /^(\S+)\s+has\s+(\d+)\s+calls?\s+\(max [^)]*\)\s+in\s+'([^']+)'\s+strategy\s+\((\d+)s holdtime[^)]*\)/u.exec(line);
    if (header) {
      current = {
        name: header[1],
        callers: Number.parseInt(header[2], 10),
        strategy: header[3],
        holdtimeSeconds: Number.parseInt(header[4], 10),
        members: 0,
        completed: 0,
        abandoned: 0,
      };
      const service = /SL:(\d+(?:\.\d+)?)%/u.exec(line);
      if (service) current.serviceLevelPercent = Number.parseFloat(service[1]);
      const counts = /W:(\d+),\s*C:(\d+),\s*A:(\d+)/u.exec(line);
      if (counts) {
        current.completed = Number.parseInt(counts[2], 10);
        current.abandoned = Number.parseInt(counts[3], 10);
      }
      rows.push(current);
      inCallers = false;
      continue;
    }
    if (/^\s+Callers:\s*$/u.test(line)) {
      inCallers = true;
      continue;
    }
    if (current && !inCallers && /^\s{6}\S/u.test(line) && !/^\s+No Members/u.test(line)) current.members += 1;
  }
  return rows;
}

/** `main/loader.c`: `<name> <description> <use count> <status> <support level>`. */
export function parseModules(stdout: string): ModuleSummary[] {
  const rows: ModuleSummary[] = [];
  for (const line of lines(stdout)) {
    if (/^Module\s+Description/u.test(line) || /modules? loaded$/u.test(line)) continue;
    const match = /^(\S+\.so)\s+(.*?)\s{2,}(\d+)\s+(\S+)\s+(\S+)\s*$/u.exec(line);
    if (!match) continue;
    rows.push({
      name: match[1],
      description: match[2].trim(),
      useCount: Number.parseInt(match[3], 10),
      status: match[4],
      support: match[5],
    });
  }
  return rows;
}

/**
 * `channels/chan_iax2.c` `_iax2_show_peers_one`/`__iax2_show_peers`: `PEERS_FORMAT`
 * (line 6996) is `"%-15.15s  %-40.40s %s  %-40.40s  %-6s%s %s  %-11s %-32.32s\n"`,
 * called (line 7084) with `(name, tmp_host, dynamicFlag, tmp_mask, tmp_port, trunkFlag,
 * encFlag, status, description)` where `dynamicFlag` is `"(D)"`/`"(S)"` and `trunkFlag`
 * is `"(T)"`/`"   "`.
 *
 * Every `%-N.Ns` field is truncated as well as padded, so its column position is fixed
 * regardless of content: `name` at [0,15), `host` at [17,57) (one literal space after the
 * two-space separator), the dynamic flag at [58,61), and the trunk flag at [111,114)
 * (immediately after the un-truncated `%-6s` port field -- there is no space between them
 * in the format string itself). `status` starts at a fixed offset too (120, two literal
 * spaces after the encryption flag) because every field ahead of it is fixed-width -- but
 * `%-11s` carries no precision, so a status longer than 11 characters is not truncated and
 * the field after it (description) shifts right. This reader never looks past status, so
 * that shift never matters here.
 *
 * The five values status can ever hold are enumerated in `peer_status` (lines 3878-3897):
 * `"UNREACHABLE"` (3883), `"LAGGED (%d ms)"` (3885), `"OK (%d ms)"` (3888), `"UNKNOWN"`
 * (3891) and `"Unmonitored"` (3894). Matching against that fixed set, rather than guessing
 * where status ends by its own whitespace (both `LAGGED`/`OK` forms contain one), is exact
 * rather than a heuristic.
 *
 * The header row (`PEERS_FORMAT2`, line 6995, printed at line 7154) and the summary line
 * (`"%d iax2 peers [...]"`, line 7173) use different column widths from the data rows and
 * are excluded on content rather than by reusing these offsets against them.
 *
 * `name` here strips a trailing `/<username>`: `_iax2_show_peers_one` (~line 7011) writes
 * `"%s/%s"` (peer name, username) into the Name column when a peer sets `username=`, and
 * that combined string is not the `[section]` name iax.conf itself uses -- only the part
 * before the slash is.
 */
export function parseIax2Peers(stdout: string): IaxPeer[] {
  const STATUS = /^(UNREACHABLE|UNKNOWN|Unmonitored|LAGGED \(\d+ ms\)|OK \(\d+ ms\))/u;
  const rows: IaxPeer[] = [];
  for (const line of lines(stdout)) {
    if (line.length < 121) continue;
    const raw = line.slice(0, 15).trim();
    if (!raw || raw === "Name/Username") continue;
    const dynamicFlag = line.slice(58, 61).trim();
    const trunkFlag = line.slice(111, 114).trim();
    const statusMatch = STATUS.exec(line.slice(120));
    if (!statusMatch) continue;
    rows.push({
      name: raw.split("/")[0],
      host: line.slice(17, 57).trim(),
      dynamic: dynamicFlag === "(D)",
      trunk: trunkFlag === "(T)",
      status: statusMatch[1],
    });
  }
  return rows;
}

/**
 * `channels/chan_iax2.c` `handle_cli_iax2_show_registry`: `FORMAT` (line 7484) is
 * `"%-45.45s  %-6.6s  %-10.10s  %-45.45s %8d  %s\n"`, called (lines 7510-7511) with
 * `(host, dnsmgr ? "Y" : "N", reg->username, perceived, reg->refresh,
 * regstate2str(reg->regstate))`.
 *
 * `host` and `username` are truncated as well as padded (`.N`), so their column
 * positions are fixed: `host` at [0,45), `username` at [55,65). `refresh` is `%8d`, an
 * un-truncated right-justified integer at [113,121) for any value up to eight digits --
 * iax.conf's own `register =>` refresh interval never approaches that. `state` is the
 * last field with no width specifier at all, so the remainder of the line from [123,) is
 * taken whole; it can only ever be one of `regstate2str`'s seven literal returns (lines
 * 7459-7478): "Unregistered", "Request Sent", "Auth. Sent", "Registered", "Rejected",
 * "Timeout", "No Authentication", "Unknown".
 *
 * The header row (`FORMAT2`, printed at line 7503) is excluded by its literal `"Host"`
 * column rather than reusing these offsets against it: `FORMAT2`'s own refresh column is
 * a string (`%8.8s`) rather than `FORMAT`'s integer, so the two rows are not exactly the
 * same shape even though every other field shares a width.
 */
export function parseIax2Registry(stdout: string): IaxRegistration[] {
  const rows: IaxRegistration[] = [];
  for (const line of lines(stdout)) {
    if (line.length < 123) continue;
    const host = line.slice(0, 45).trim();
    if (!host || host === "Host") continue;
    const state = line.slice(123).trim();
    if (!state) continue;
    rows.push({
      host,
      username: line.slice(55, 65).trim(),
      refresh: Number.parseInt(line.slice(113, 121).trim(), 10) || 0,
      state,
    });
  }
  return rows;
}

/** `core show uptime seconds` prints `System uptime: <n>` when the system is up. */
export function parseUptimeSeconds(stdout: string): number {
  const match = /System uptime:\s*(\d+)/u.exec(stdout);
  if (!match) throw new Error("uptime was not present in the output");
  return Number.parseInt(match[1], 10);
}

// ---------------------------------------------------------------- helpers

function lines(stdout: string, options: { keepBlank?: boolean } = {}): string[] {
  const all = stdout.replace(/\r\n/gu, "\n").split("\n");
  return options.keepBlank ? all : all.filter((line) => line.trim().length > 0);
}

const firstLine = (text: string): string => text.split(/\r?\n/u)[0].trim();

function reason(error: unknown): string {
  return error instanceof Error ? error.message : "the command could not be run";
}
