/**
 * Pure parsers for Asterisk CLI output. Each function takes the raw stdout of one
 * allowlisted `asterisk -rx "<command>"` invocation and returns structured data.
 * No I/O, no clock, no process execution here — see `asterisk-readings.ts` for the
 * gateway that actually runs the commands.
 *
 * Every format below was taken from the `ast_cli(a->fd, "...")` calls in this
 * checkout's C sources, not recalled. The exact format string relied on is quoted
 * in the comment above each parser.
 */

// ---------------------------------------------------------------- shapes

export interface VoicemailUser {
  context: string;
  mailbox: string;
  fullName: string;
  zone: string;
  newMessages?: number;
}

export interface VoicemailZone {
  zone: string;
  timezone: string;
  messageFormat: string;
}

export interface ConfbridgeConference {
  name: string;
  users: number;
  marked: number;
  locked: boolean;
  muted: boolean;
}

export interface MohClass {
  name: string;
  mode?: string;
  directory?: string;
  announcement?: string;
  application?: string;
  format?: string;
}

export interface Codec {
  id?: number;
  type: string;
  name: string;
  format: string;
  quality?: number;
  description: string;
}

export interface TranslationRow {
  sourceFormat: string;
  costs: Record<string, number | undefined>;
}

export interface AclRule {
  name: string;
}

export interface ManagerSettings {
  settings: Record<string, string>;
}

export interface ManagerUser {
  username: string;
}

export interface ManagerUsersResult {
  users: ManagerUser[];
  total?: number;
}

export interface AriApp {
  name: string;
}

export interface AriUser {
  username: string;
  readOnly: boolean;
  hasAcl: boolean;
}

export interface Bridge {
  id: string;
  name: string;
  channels: number;
  bridgeType: string;
  technology: string;
  duration: string;
}

export interface DialplanApplication {
  name: string;
  synopsis: string;
}

export interface CdrBackend {
  name: string;
  suspended: boolean;
}

export interface CdrStatus {
  settings: Record<string, string>;
  backends: CdrBackend[];
}

export interface LoggerChannel {
  channel: string;
  type: string;
  formatter: string;
  status: string;
  levels: string[];
}

export interface LoggerChannelsResult {
  queueLimit?: number;
  channels: LoggerChannel[];
}

export interface Sysinfo {
  values: Record<string, string>;
}

export interface Uptime {
  uptimeSeconds?: number;
  lastReloadSeconds?: number;
}

// ---------------------------------------------------------------- parsers

/**
 * `apps/app_voicemail.c` HVSU_OUTPUT_FORMAT: `"%-10s %-5s %-25s %-10s %6s\n"`
 * header `Context Mbox User Zone NewMsg`, data row same widths, trailing
 * `"%d voicemail users configured.\n"`.
 */
export function parseVoicemailUsers(stdout: string): { users: VoicemailUser[]; total?: number } {
  const users: VoicemailUser[] = [];
  let total: number | undefined;
  // The fixed-width printf format means a Zone left blank (the common case) prints as
  // pure whitespace, not an omitted field, so a token-based regex requiring a non-blank
  // zone silently drops every row with no zone configured -- verified against a live
  // target where all three configured mailboxes were dropped this way. Slice by the
  // format's own column offsets instead: context(10) mbox(5) fullName(25) zone(10)
  // newmsg(6), one space between each. A mailbox/context longer than its field (e.g. a
  // long alias) overruns the fixed columns and the separator positions stop landing on
  // spaces; that row is unparseable from its column layout alone and is dropped rather
  // than misassigned.
  for (const line of lines(stdout)) {
    if (/^Context\s+Mbox\s+User\s+Zone\s+NewMsg\s*$/u.test(line)) continue;
    const totalMatch = /^(\d+)\s+voicemail users configured\.?$/u.exec(line.trim());
    if (totalMatch) {
      total = Number.parseInt(totalMatch[1], 10);
      continue;
    }
    if (line.length < 54 || line[10] !== " " || line[16] !== " " || line[42] !== " " || line[53] !== " ") continue;
    const context = line.slice(0, 10).trim();
    const mailbox = line.slice(11, 16).trim();
    const fullName = line.slice(17, 42).trim();
    const zone = line.slice(43, 53).trim();
    const newMessages = Number.parseInt(line.slice(54).trim(), 10);
    if (!context || !mailbox) continue;
    users.push({ context, mailbox, fullName, zone, newMessages: Number.isFinite(newMessages) ? newMessages : undefined });
  }
  return { users, total };
}

/**
 * `apps/app_voicemail.c` HVSZ_OUTPUT_FORMAT: `"%-15s %-20s %-45s\n"`
 * header `Zone Timezone Message Format`, then one row per zone.
 */
export function parseVoicemailZones(stdout: string): VoicemailZone[] {
  const rows: VoicemailZone[] = [];
  for (const line of lines(stdout)) {
    if (/^Zone\s+Timezone\s+Message Format\s*$/u.test(line)) continue;
    const match = /^(\S+)\s+(\S+)\s+(\S.*?)\s*$/u.exec(line);
    if (!match) continue;
    rows.push({ zone: match[1], timezone: match[2], messageFormat: match[3].trim() });
  }
  return rows;
}

/**
 * `apps/app_confbridge.c` `handle_cli_confbridge_list` (no-argument form):
 * header `"Conference Bridge Name           Users  Marked Locked Muted\n"`,
 * separator of `=`, data row `"%-32s %6u %6u %-6s %s\n"` where the last two
 * fields are `AST_CLI_YESNO` (`Yes`/`No`).
 */
export function parseConfbridgeList(stdout: string): ConfbridgeConference[] {
  const rows: ConfbridgeConference[] = [];
  for (const line of lines(stdout)) {
    if (/^Conference Bridge Name/u.test(line)) continue;
    if (/^=+\s+=+/u.test(line)) continue;
    const match = /^(\S.*?)\s{2,}(\d+)\s+(\d+)\s+(Yes|No)\s+(Yes|No)\s*$/u.exec(line);
    if (!match) continue;
    rows.push({
      name: match[1].trim(),
      users: Number.parseInt(match[2], 10),
      marked: Number.parseInt(match[3], 10),
      locked: match[4] === "Yes",
      muted: match[5] === "Yes",
    });
  }
  return rows;
}

/**
 * `res/res_musiconhold.c` `handle_cli_moh_show_classes`: block style, one class
 * per group starting with `"Class: %s\n"`, then indented `"\tKey: value\n"` lines
 * (Mode, Directory, Announcement, Application, Format, ...).
 */
export function parseMohClasses(stdout: string): MohClass[] {
  const rows: MohClass[] = [];
  let current: MohClass | null = null;
  for (const raw of lines(stdout)) {
    const classMatch = /^Class:\s*(\S.*?)\s*$/u.exec(raw);
    if (classMatch) {
      current = { name: classMatch[1] };
      rows.push(current);
      continue;
    }
    if (!current) continue;
    const kv = /^\t(\S[^:]*):\s*(.*?)\s*$/u.exec(raw);
    if (!kv) continue;
    const value = kv[2] === "<none>" ? undefined : kv[2];
    switch (kv[1]) {
      case "Mode":
        current.mode = value;
        break;
      case "Directory":
        current.directory = value;
        break;
      case "Announcement":
        current.announcement = value;
        break;
      case "Application":
        current.application = value;
        break;
      case "Format":
        current.format = value;
        break;
      default:
        break;
    }
  }
  return rows;
}

/**
 * `main/codec.c` `show_codecs`: header `"%8s %-5s %-12s %-16s %7s %s\n"`
 * (`ID TYPE NAME FORMAT QUALITY DESCRIPTION`), a `-` separator line, then
 * data rows `"%8u %-5s %-12s %-16s %7d (%s)\n"`.
 */
export function parseCodecs(stdout: string): Codec[] {
  const rows: Codec[] = [];
  for (const line of lines(stdout)) {
    if (/^\s*ID\s+TYPE\s+NAME/u.test(line)) continue;
    if (/^-+$/u.test(line.trim())) continue;
    if (/^Disclaimer:/u.test(line) || /^\s*It does not indicate/u.test(line)) continue;
    const match = /^\s*(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(-?\d+)\s+\((.*)\)\s*$/u.exec(line);
    if (!match) continue;
    const id = Number.parseInt(match[1], 10);
    const quality = Number.parseInt(match[5], 10);
    rows.push({
      id: Number.isFinite(id) ? id : undefined,
      type: match[2],
      name: match[3],
      format: match[4],
      quality: Number.isFinite(quality) ? quality : undefined,
      description: match[6],
    });
  }
  return rows;
}

/**
 * `main/translate.c` `handle_show_translation_table`: a header line of
 * right-justified codec names (the leftmost column blank), then one row per
 * source codec: the row's codec name followed by right-justified costs
 * (an integer, or `-` where no translation path exists).
 */
export function parseTranslations(stdout: string): TranslationRow[] {
  const rows: TranslationRow[] = [];
  const body = lines(stdout).filter(
    (line) =>
      !/^\s*Translation times between formats/u.test(line) &&
      !/^\s*Source Format \(Rows\)/u.test(line),
  );
  if (body.length === 0) return rows;
  const header = body[0].trim().split(/\s+/u).filter(Boolean);
  if (header.length === 0) return rows;
  for (let i = 1; i < body.length; i++) {
    const cells = body[i].trim().split(/\s+/u).filter(Boolean);
    if (cells.length < 2) continue;
    const [sourceFormat, ...values] = cells;
    const costs: Record<string, number | undefined> = {};
    for (let c = 0; c < header.length && c < values.length; c++) {
      const parsed = Number.parseInt(values[c], 10);
      costs[header[c]] = Number.isFinite(parsed) ? parsed : undefined;
    }
    rows.push({ sourceFormat, costs });
  }
  return rows;
}

/**
 * `main/named_acl.c` `cli_display_named_acl_list` (`acl show`, no arguments):
 * `"\nacl\n---\n"` followed by one named ACL name per line (`"%s\n"`).
 */
export function parseAclRules(stdout: string): AclRule[] {
  const rows: AclRule[] = [];
  let started = false;
  for (const line of lines(stdout)) {
    if (line.trim() === "acl") {
      started = true;
      continue;
    }
    if (/^-+$/u.test(line.trim())) continue;
    if (!started) continue;
    if (/isn't available/u.test(line)) continue;
    rows.push({ name: line.trim() });
  }
  return rows;
}

/**
 * `main/manager.c` `handle_manager_show_settings`: `"\nGlobal Settings:\n----------------\n"`
 * then `"  %-25.25s  %-15.55s\n"` / `FORMAT2` / `FORMAT3` label/value pairs, where
 * every label ends in `:`.
 */
export function parseManagerSettings(stdout: string): ManagerSettings {
  const settings: Record<string, string> = {};
  for (const line of lines(stdout)) {
    if (/^Global Settings:$/u.test(line.trim())) continue;
    if (/^-+$/u.test(line.trim())) continue;
    const match = /^\s*(\S.*?:)\s\s(.*?)\s*$/u.exec(line);
    if (!match) continue;
    const key = match[1].slice(0, -1).trim();
    settings[key] = match[2].trim();
  }
  return { settings };
}

/**
 * `main/manager.c` `handle_showmanagers`: `"\nusername\n--------\n"`, one
 * `"%s\n"` per configured user, then `"-------------------\n%d manager users
 * configured.\n"`.
 */
export function parseManagerUsers(stdout: string): ManagerUsersResult {
  const users: ManagerUser[] = [];
  let total: number | undefined;
  let started = false;
  for (const line of lines(stdout)) {
    const trimmed = line.trim();
    if (trimmed === "username") {
      started = true;
      continue;
    }
    if (/^-+$/u.test(trimmed)) continue;
    const totalMatch = /^(\d+)\s+manager users configured\.?$/u.exec(trimmed);
    if (totalMatch) {
      total = Number.parseInt(totalMatch[1], 10);
      continue;
    }
    if (/^There are no manager users\.?$/u.test(trimmed)) continue;
    if (!started) continue;
    users.push({ username: trimmed });
  }
  return { users, total };
}

/**
 * `res/ari/cli.c` `ari_show_apps`: `"Application Name         \n"` then a `=`
 * separator, then one registered application name per line (`"%s\n"`).
 */
export function parseAriApps(stdout: string): AriApp[] {
  const rows: AriApp[] = [];
  for (const line of lines(stdout)) {
    if (/^Application Name\s*$/u.test(line)) continue;
    if (/^=+$/u.test(line.trim())) continue;
    if (/^Unable to retrieve/u.test(line)) continue;
    rows.push({ name: line.trim() });
  }
  return rows;
}

/**
 * `res/ari/cli.c` `ari_show_users` (line 112): header `"r/o?  ACL?  Username\n"`
 * (line 111), separator `"----  ----  --------\n"`, then `show_users_cb` (line 80)
 * `"%-4s  %-4s  %s\n"` with `AST_CLI_YESNO` for the first two columns -- "Yes" or
 * "No", never anything else, so the fixed 4-char field never overflows.
 */
export function parseAriUsers(stdout: string): AriUser[] {
  const rows: AriUser[] = [];
  for (const line of lines(stdout)) {
    if (/^r\/o\?\s+ACL\?\s+Username\s*$/u.test(line)) continue;
    if (/^-+\s+-+\s+-+$/u.test(line.trim())) continue;
    const match = /^(Yes|No)\s+(Yes|No)\s+(\S.*)$/u.exec(line.trim());
    if (!match) continue;
    rows.push({ readOnly: match[1] === "Yes", hasAcl: match[2] === "Yes", username: match[3].trim() });
  }
  return rows;
}

/**
 * `main/bridge.c` `handle_bridge_show_all`: `FORMAT_HDR`/`FORMAT_ROW` (lines
 * 5247-5248) `"%-36s %-36s %5s %-15s %-15s %s\n"`, header row printed at line 5264
 * (`"Bridge-ID", "Name", "Chans", "Type", "Technology", "Duration"`), one data row per
 * live bridge at line 5273. There is no "no bridges" message -- the header prints
 * unconditionally and simply has nothing under it when the container is empty.
 *
 * Sliced by the format's own column offsets, the same defence
 * `parseVoicemailUsers` above uses: a name or id that overruns its fixed field shifts
 * every separator position that follows it, and that row is dropped rather than
 * misassigned to the wrong column.
 */
export function parseBridges(stdout: string): Bridge[] {
  const rows: Bridge[] = [];
  for (const line of lines(stdout)) {
    if (line.startsWith("Bridge-ID")) continue;
    if (
      line.length < 112
      || line[36] !== " " || line[73] !== " " || line[79] !== " "
      || line[95] !== " " || line[111] !== " "
    ) continue;
    const id = line.slice(0, 36).trim();
    const name = line.slice(37, 73).trim();
    const channels = Number.parseInt(line.slice(74, 79).trim(), 10);
    const bridgeType = line.slice(80, 95).trim();
    const technology = line.slice(96, 111).trim();
    const duration = line.slice(112).trim();
    if (!id) continue;
    rows.push({ id, name, channels: Number.isFinite(channels) ? channels : 0, bridgeType, technology, duration });
  }
  return rows;
}

/**
 * `main/pbx_app.c` `handle_show_applications` (no-argument form): banner
 * `"    -= Registered Asterisk Applications =-\n"` (line 359), one
 * `"  %20s: %s\n"` row per registered application (line 390, name right-justified to
 * 20 -- the literal `": "` immediately follows the padded field, with no space between
 * the name itself and the colon), trailing `"    -= %d Applications Registered =-\n"`
 * (line 394). When nothing is registered at all, prints only
 * `"There are no registered applications\n"` (line 345) and nothing else. Matched by
 * the first colon rather than a fixed offset, because an application name is never
 * longer than its field in this checkout's own module set but the format does not
 * guarantee that, and `%20s` does not truncate a longer name -- only pad a shorter one.
 */
export function parseApplications(stdout: string): DialplanApplication[] {
  const rows: DialplanApplication[] = [];
  for (const line of lines(stdout)) {
    const match = /^ {2}\s*(\S+):\s(.*)$/u.exec(line);
    if (!match) continue;
    rows.push({ name: match[1], synopsis: match[2].trim() });
  }
  return rows;
}

/**
 * `main/cdr.c` `handle_cli_status`: `"Call Detail Record (CDR) settings\n"`,
 * `"  Key:                        value\n"` pairs, then a `"* Registered
 * Backends\n"` section listing `"    %s%s\n"` (name plus optional
 * `" (suspended) "`), or `"    (none)\n"` when empty.
 */
export function parseCdrStatus(stdout: string): CdrStatus {
  const settings: Record<string, string> = {};
  const backends: CdrBackend[] = [];
  let inBackends = false;
  for (const line of lines(stdout)) {
    const trimmed = line.trim();
    if (/^Call Detail Record \(CDR\) settings$/u.test(trimmed)) continue;
    if (/^-+$/u.test(trimmed)) continue;
    if (/^\*\s*Batch Mode Settings$/u.test(trimmed)) continue;
    if (/^\*\s*Registered Backends$/u.test(trimmed)) {
      inBackends = true;
      continue;
    }
    if (inBackends) {
      if (trimmed === "(none)") continue;
      const backendMatch = /^(\S+)(\s+\(suspended\)\s*)?$/u.exec(trimmed);
      if (backendMatch) backends.push({ name: backendMatch[1], suspended: Boolean(backendMatch[2]) });
      continue;
    }
    const kv = /^(\S.*?:)\s+(.*?)\s*$/u.exec(trimmed);
    if (!kv) continue;
    const key = kv[1].slice(0, -1).trim();
    settings[key] = kv[2].trim();
  }
  return { settings, backends };
}

/**
 * `main/logger.c` `handle_logger_show_channels`: `"Logger queue limit: %d\n\n"`,
 * then header/separator using `FORMATL "%-35.35s %-8.8s %-10.10s %-9.9s "`
 * followed by `"Configuration\n"`, then data rows using the same FORMATL plus
 * `" - "` and space-separated active level names.
 */
export function parseLoggerChannels(stdout: string): LoggerChannelsResult {
  let queueLimit: number | undefined;
  const channels: LoggerChannel[] = [];
  for (const line of lines(stdout)) {
    const limitMatch = /^Logger queue limit:\s*(\d+)/u.exec(line);
    if (limitMatch) {
      queueLimit = Number.parseInt(limitMatch[1], 10);
      continue;
    }
    if (/^Channel\s+Type\s+Formatter\s+Status/u.test(line)) continue;
    if (/^-{5,}\s+-{3,}/u.test(line)) continue;
    const match = /^(\S.*?)\s{2,}(\S+)\s+(\S+)\s+(\S+)\s+-\s*(.*?)\s*$/u.exec(line);
    if (!match) continue;
    const levels = match[5].length > 0 ? match[5].trim().split(/\s+/u).filter(Boolean) : [];
    channels.push({ channel: match[1].trim(), type: match[2], formatter: match[3], status: match[4], levels });
  }
  return { queueLimit, channels };
}

/**
 * `main/asterisk.c` `handle_show_sysinfo`: `"\nSystem Statistics\n-----------------\n"`
 * then `"  Key:             value\n"` lines (`System Uptime`, `Total RAM`,
 * `Free RAM`, `Buffer RAM`, `Total Swap Space`, `Free Swap Space`, `Number of
 * Processes`).
 */
export function parseSysinfo(stdout: string): Sysinfo {
  const values: Record<string, string> = {};
  for (const line of lines(stdout)) {
    const trimmed = line.trim();
    if (/^System Statistics$/u.test(trimmed)) continue;
    if (/^-+$/u.test(trimmed)) continue;
    const kv = /^(\S.*?:)\s+(.*?)\s*$/u.exec(trimmed);
    if (!kv) continue;
    const key = kv[1].slice(0, -1).trim();
    values[key] = kv[2].trim();
  }
  return { values };
}

/**
 * `main/cli.c` `handle_showuptime` via `print_uptimestr` with `printsec`:
 * `"%s%lu\n"` -> `"System uptime: <n>\n"` and, when a reload has happened,
 * `"Last reload: <n>\n"`.
 */
export function parseUptime(stdout: string): Uptime {
  const uptimeMatch = /System uptime:\s*(\d+)/u.exec(stdout);
  const reloadMatch = /Last reload:\s*(\d+)/u.exec(stdout);
  return {
    uptimeSeconds: uptimeMatch ? Number.parseInt(uptimeMatch[1], 10) : undefined,
    lastReloadSeconds: reloadMatch ? Number.parseInt(reloadMatch[1], 10) : undefined,
  };
}

// ---------------------------------------------------------------- helpers

function lines(stdout: string): string[] {
  return stdout
    .replace(/\r\n/gu, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);
}
