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
 */
export const READ_ONLY_COMMANDS = [
  "core show channels concise",
  "core show channels count",
  "core show uptime seconds",
  "core show sysinfo",
  "core show version",
  "core show help",
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

export const MODULE_LIFECYCLE_OPERATIONS = ['load', 'unload', 'reload'] as const;
export type ModuleLifecycleOperation = (typeof MODULE_LIFECYCLE_OPERATIONS)[number];

export interface ModuleLifecycleReceipt {
  operation: ModuleLifecycleOperation;
  module: string;
  status: CommandResult['status'];
  exitCode: number | null;
  output: string;
  observedAt: string;
}

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

/** Runs one allowlisted CLI command against a target. */
export interface AsteriskCliGateway {
  run(target: TargetProfile, command: ReadOnlyCommand, signal?: AbortSignal): Promise<CommandResult>;
  runModuleLifecycle(target: TargetProfile, operation: ModuleLifecycleOperation, module: string, signal?: AbortSignal): Promise<ModuleLifecycleReceipt>;
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

  async runModuleLifecycle(target: TargetProfile, operation: ModuleLifecycleOperation, module: string, signal?: AbortSignal): Promise<ModuleLifecycleReceipt> {
    if (!MODULE_LIFECYCLE_OPERATIONS.includes(operation)) throw new Error(`Module lifecycle operation is not allowlisted: ${operation}`);
    if (!/^[A-Za-z0-9_.-]+\.so$/u.test(module)) throw new Error('Module name must be a bare .so filename');
    const invocation = this.#invocation(target, `module ${operation} ${module}`);
    const result = await this.#executor.execute({ ...invocation, signal, timeoutMs: 15_000, maxOutputBytes: 256 * 1024 });
    return { operation, module, status: result.status, exitCode: result.exitCode, output: `${result.stdout}${result.stderr}`.trim(), observedAt: new Date().toISOString() };
  }

  #invocation(target: TargetProfile, command: string): { executable: string; args: ReadonlyArray<string> } {
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

/** `res/res_pjsip/pjsip_configuration.c`: ` Endpoint:  <id[/cid]>  <state>  <n of m>`. */
export function parseEndpoints(stdout: string): Endpoint[] {
  const rows: Endpoint[] = [];
  for (const line of lines(stdout)) {
    const match = /^\s*Endpoint:\s{2}(\S+)\s+(\S.*?)\s{2,}(\d+ of \S+)\s*$/u.exec(line);
    if (!match) continue;
    const [id, callerId] = match[1].split("/");
    rows.push({ id, callerId, state: match[2].trim(), channels: match[3] });
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
