/**
 * Reads and writes Asterisk configuration inside a WSL distribution.
 *
 * `ConfigTransaction` and `StructuredConfigPlanner` were already complete: they plan a
 * change, back up, stage, validate, apply, read the result back, compare it against
 * what was asked for, and roll back in reverse order if any step fails. None of it had
 * ever run, because nothing implemented the transport they call. This is that half.
 *
 * Two boundaries matter more than anything else here, because this is the only code in
 * the console that writes to a target:
 *
 *  - **Resources are allowlisted by exact filename.** A resource is one of the Asterisk
 *    configuration files named below and nothing else. No path is accepted, joined, or
 *    interpolated from a caller, so there is no traversal to defend against — a name
 *    that is not on the list is refused before any command is built.
 *  - **Every command is an allowlisted executable with separate arguments.** No shell,
 *    no concatenated command string, no redirection. Content reaches the target through
 *    the process's standard input rather than through an argument, which keeps it out of
 *    the command line entirely.
 */
import type { ProcessExecutor } from "./executor.js";
import type { ConfigDocument, ConfigTransport } from "./config-transaction.js";

const CONFIG_DIRECTORY = "/etc/asterisk";

/**
 * The configuration files this console is willing to read and write.
 *
 * Absolute paths, because `StructuredConfigPlanner` identifies a resource by absolute
 * path and refuses anything else. Listing them in full also means the allowlist is the
 * literal set of files that can ever be touched, rather than a set of names joined onto
 * a directory somewhere else in the code.
 */
export const CONFIGURABLE_RESOURCES = [
  `${CONFIG_DIRECTORY}/pjsip.conf`,
  `${CONFIG_DIRECTORY}/extensions.conf`,
  `${CONFIG_DIRECTORY}/queues.conf`,
  `${CONFIG_DIRECTORY}/voicemail.conf`,
  `${CONFIG_DIRECTORY}/confbridge.conf`,
  `${CONFIG_DIRECTORY}/musiconhold.conf`,
  `${CONFIG_DIRECTORY}/cdr.conf`,
  `${CONFIG_DIRECTORY}/manager.conf`,
  `${CONFIG_DIRECTORY}/logger.conf`,
  `${CONFIG_DIRECTORY}/rtp.conf`,
  `${CONFIG_DIRECTORY}/modules.conf`,
  `${CONFIG_DIRECTORY}/acl.conf`,

  /* Subsystems a complete administration surface needs. Every name below has a matching
   * file in this checkout's configs/samples and is verified by capability-surface.test. */
  `${CONFIG_DIRECTORY}/chan_dahdi.conf`,       // analogue, T1/E1 and PRI trunks
  `${CONFIG_DIRECTORY}/iax.conf`,              // IAX2 peers and trunking
  `${CONFIG_DIRECTORY}/res_fax.conf`,          // fax sending, receiving and T.38
  `${CONFIG_DIRECTORY}/cel.conf`,              // channel event logging
  `${CONFIG_DIRECTORY}/cel_odbc.conf`,
  `${CONFIG_DIRECTORY}/cel_pgsql.conf`,
  `${CONFIG_DIRECTORY}/res_odbc.conf`,         // database connectivity
  `${CONFIG_DIRECTORY}/extconfig.conf`,        // which objects come from a database
  `${CONFIG_DIRECTORY}/sorcery.conf`,
  `${CONFIG_DIRECTORY}/res_pgsql.conf`,
  `${CONFIG_DIRECTORY}/res_ldap.conf`,
  `${CONFIG_DIRECTORY}/cdr_odbc.conf`,
  `${CONFIG_DIRECTORY}/cdr_pgsql.conf`,
  `${CONFIG_DIRECTORY}/http.conf`,             // built-in HTTP/TLS server
  `${CONFIG_DIRECTORY}/ari.conf`,              // Asterisk REST Interface users/options
  `${CONFIG_DIRECTORY}/stir_shaken.conf`,      // call attestation and certificates
  `${CONFIG_DIRECTORY}/geolocation.conf`,      // emergency-services location
  `${CONFIG_DIRECTORY}/phoneprov.conf`,        // handset auto-provisioning
  `${CONFIG_DIRECTORY}/features.conf`,         // transfer/pickup/dynamic feature codes
  `${CONFIG_DIRECTORY}/res_parking.conf`,      // parking lots (moved out of features.conf in Asterisk 12)
  `${CONFIG_DIRECTORY}/sla.conf`,              // shared line appearances
  `${CONFIG_DIRECTORY}/dundi.conf`,            // distributed dialplan lookup
  `${CONFIG_DIRECTORY}/calendar.conf`,
  `${CONFIG_DIRECTORY}/queuerules.conf`,       // queue penalty rules
  `${CONFIG_DIRECTORY}/udptl.conf`,            // the transport T.38 fax rides on
  `${CONFIG_DIRECTORY}/res_stun_monitor.conf`,
  `${CONFIG_DIRECTORY}/res_snmp.conf`,
  `${CONFIG_DIRECTORY}/prometheus.conf`,
  `${CONFIG_DIRECTORY}/xmpp.conf`,
  `${CONFIG_DIRECTORY}/adsi.conf`,
  `${CONFIG_DIRECTORY}/asterisk.conf`,         // directories and run-as identity
  `${CONFIG_DIRECTORY}/festival.conf`,         // Festival text-to-speech application
  `${CONFIG_DIRECTORY}/cli_aliases.conf`,      // CLI alias templates
  `${CONFIG_DIRECTORY}/cli_permissions.conf`,  // per-user CLI permissions
  `${CONFIG_DIRECTORY}/indications.conf`,      // regional tones / call progress indications

  /* Dialplan applications and their standalone-voicemail companions. Every one below is
   * plain `[section]` / `key = value`, verified by capability-surface.test against this
   * checkout's own configs/samples. */
  `${CONFIG_DIRECTORY}/agents.conf`,           // static agent pool (app_agent_pool)
  `${CONFIG_DIRECTORY}/followme.conf`,         // Find-Me/Follow-Me
  `${CONFIG_DIRECTORY}/meetme.conf`,           // MeetMe conference rooms (DAHDI-backed)
  `${CONFIG_DIRECTORY}/minivm.conf`,           // MiniVoicemail application set
  `${CONFIG_DIRECTORY}/extensions_minivm.conf`, // MiniVoicemail's own dialplan snippet
  `${CONFIG_DIRECTORY}/amd.conf`,              // answering-machine detection tuning
  `${CONFIG_DIRECTORY}/alarmreceiver.conf`,    // AlarmReceiver app (security-panel signalling)

  /* Signalling and application-layer protocol timers. */
  `${CONFIG_DIRECTORY}/ss7.timers`,            // SS7/MTP3 timer overrides for libss7 (chan_dahdi)
  `${CONFIG_DIRECTORY}/aeap.conf`,             // res_aeap: Asterisk External Application Protocol
  `${CONFIG_DIRECTORY}/ccss.conf`,             // Call Completion Supplementary Services

  /* Channel drivers, transports and provisioning. */
  `${CONFIG_DIRECTORY}/chan_websocket.conf`,   // native WebSocket channel driver
  `${CONFIG_DIRECTORY}/websocket_client.conf`, // outbound WebSocket client connections chan_websocket uses
  `${CONFIG_DIRECTORY}/motif.conf`,            // chan_motif: Jingle/Google Talk signalling
  `${CONFIG_DIRECTORY}/unistim.conf`,          // chan_unistim: Nortel/Mitel UNIStim handsets
  `${CONFIG_DIRECTORY}/pjproject.conf`,        // PJPROJECT-wide logging/settings shared by PJSIP
  `${CONFIG_DIRECTORY}/pjsip_notify.conf`,     // `pjsip send notify` event body templates
  `${CONFIG_DIRECTORY}/pjsip_wizard.conf`,     // PJSIP config-wizard object templates
  `${CONFIG_DIRECTORY}/iaxprov.conf`,          // IAX2 firmware/handset provisioning templates
  `${CONFIG_DIRECTORY}/phoneprov_users.conf`,  // per-user phoneprov.conf assignments

  /* Realtime/database backends and CDR/CEL sinks that carry no login credentials of
   * their own — connection strings and auth for the databases they use live in
   * res_odbc.conf (already listed) or the system ODBC/curl configuration, not here. */
  `${CONFIG_DIRECTORY}/cdr_adaptive_odbc.conf`,
  `${CONFIG_DIRECTORY}/cdr_beanstalkd.conf`,
  `${CONFIG_DIRECTORY}/cdr_custom.conf`,
  `${CONFIG_DIRECTORY}/cdr_manager.conf`,
  `${CONFIG_DIRECTORY}/cdr_sqlite3_custom.conf`,
  `${CONFIG_DIRECTORY}/cel_beanstalkd.conf`,
  `${CONFIG_DIRECTORY}/cel_custom.conf`,
  `${CONFIG_DIRECTORY}/cel_sqlite3_custom.conf`,
  `${CONFIG_DIRECTORY}/res_config_odbc.conf`,  // realtime-via-ODBC sort behaviour
  `${CONFIG_DIRECTORY}/res_config_sqlite3.conf`,
  `${CONFIG_DIRECTORY}/func_odbc.conf`,        // custom dialplan functions backed by SQL
  `${CONFIG_DIRECTORY}/hep.conf`,              // HEPv3 capture-server forwarding (res_hep)
  `${CONFIG_DIRECTORY}/res_curl.conf`,         // shared CURLOPT defaults for res_curl/realtime-curl
  `${CONFIG_DIRECTORY}/res_http_media_cache.conf`,

  /* Core system, CLI and diagnostics. */
  `${CONFIG_DIRECTORY}/cli.conf`,              // CLI startup-command hooks
  `${CONFIG_DIRECTORY}/codecs.conf`,           // per-codec encoder tuning (e.g. Speex quality)
  `${CONFIG_DIRECTORY}/dnsmgr.conf`,           // background DNS refresh manager
  `${CONFIG_DIRECTORY}/dsp.conf`,              // silence/DTMF detection thresholds
  `${CONFIG_DIRECTORY}/enum.conf`,             // ENUM (telephone-number-to-DNS) lookups
  `${CONFIG_DIRECTORY}/resolver_unbound.conf`, // libunbound-based internal DNS resolver
  `${CONFIG_DIRECTORY}/res_corosync.conf`,     // cluster/failover heartbeat (Corosync)
  `${CONFIG_DIRECTORY}/say.conf`,              // language-specific "say number/date" phrasing
  `${CONFIG_DIRECTORY}/smdi.conf`,             // Simplified Message Desk Interface
  `${CONFIG_DIRECTORY}/statsd.conf`,           // StatsD metrics forwarding
  `${CONFIG_DIRECTORY}/stasis.conf`,           // Stasis message-bus taskpool sizing

  /*
   * Deliberately excluded from configs/samples, and why:
   *
   *  - extensions.ael, extensions.lua: dialplan written in AEL or Lua, not the
   *    `[section]` / `key = value` shape this transport parses and renders. Staging one
   *    through renderConfig() would silently rewrite it to garbage.
   *  - dbsep.conf, res_config_mysql.conf, cdr_tds.conf, cel_tds.conf: each file's whole
   *    purpose is a database login (dbuser/dbpass, or TDS username/password) — there is
   *    no non-credential content left over once those fields are stripped, so exposing
   *    the file at all is exposing a credential field. res_odbc.conf, res_curl.conf and
   *    res_config_odbc.conf stay in because their credential-shaped fields (userpwd,
   *    ssl_keypasswd) are optional extras beside substantial non-secret configuration,
   *    the same balance the IAX2 model already strikes by typing every iax.conf peer
   *    field except `secret`.
   *  - ast_debug_tools.conf: read by companion shell scripts under contrib/, not by
   *    Asterisk itself, and uses '#' comments this parser does not recognise.
   *  - config_test.conf, test_sorcery.conf: fixtures for Asterisk's own C unit tests
   *    (test_config.c, test_sorcery.c); nothing running Asterisk ever loads them.
   *  - app_skel.conf: the sample config for app_skel.c, a documentation skeleton for
   *    module authors, not a real dialplan application.
   *  - chan_mobile.conf, ooh323.conf: sample files with no corresponding module in this
   *    source tree (chan_mobile.c and chan_ooh323 do not exist here), so nothing would
   *    ever read a file placed at either path.
   *  - console.conf: configures chan_console, a local sound-card channel driver. The WSL
   *    target this transport writes to has no local audio hardware, so this control
   *    could never do anything for it.
   */
] as const;

export type ConfigurableResource = (typeof CONFIGURABLE_RESOURCES)[number];

const ALLOWED = new Set<string>(CONFIGURABLE_RESOURCES);

/** One `[section]` and the `key = value` lines beneath it, in file order. */
/**
 * Asterisk writes two separators and they do not mean the same thing. `key = value` assigns
 * a setting; `key => value` declares an object, and the entire dialplan is written in the
 * second form.
 *
 * Reading with one and writing with the other is not cosmetic. It renamed every extension
 * in a real file: `exten => 8100` read back as key `exten` and value `> 8100`, went out as
 * `exten = > 8100`, and Asterisk loaded an extension literally called `>8100`. Sixty-one
 * lines lost, from a read and a write-back with no edit in between.
 */
export type ConfigSeparator = '=' | '=>';

export interface ConfigSection {
  name: string;
  entries: ReadonlyArray<{ key: string; value: string; separator?: ConfigSeparator }>;
}

export type ConfigValue = ReadonlyArray<ConfigSection>;

export function assertConfigurable(resource: string): ConfigurableResource {
  if (!ALLOWED.has(resource)) {
    throw new Error(`"${resource}" is not a configurable resource, so it was not touched.`);
  }
  return resource as ConfigurableResource;
}

/**
 * Parses Asterisk's INI-like configuration.
 *
 * Entries are kept as an ordered list rather than an object because these files
 * legitimately repeat a key within one section — several `type=friend` entries, several
 * `allow=` codec lines — and an object would silently keep only the last of each. That
 * would make a round trip lose configuration while looking like it worked.
 */
export function parseConfig(text: string): ConfigValue {
  const sections: ConfigSection[] = [];
  let current: { name: string; entries: Array<{ key: string; value: string; separator?: ConfigSeparator }> } | undefined;

  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    if (line.startsWith(";")) continue;

    if (line.startsWith("[") && line.endsWith("]")) {
      current = { name: line.slice(1, -1).trim(), entries: [] };
      sections.push(current);
      continue;
    }

    const equals = line.indexOf("=");
    if (equals < 0) continue;
    if (!current) {
      current = { name: "", entries: [] };
      sections.push(current);
    }
    /* Record which separator the file actually used, so writing the line back cannot
     * silently change what it means. */
    const arrow = line.charAt(equals + 1) === ">";
    current.entries.push({
      key: line.slice(0, equals).trim(),
      value: line.slice(equals + (arrow ? 2 : 1)).trim(),
      /* Only recorded for the arrow form. Stamping every entry with the plain separator
       * would make a parsed value stop deep-equalling a hand-built one, and the
       * transaction compares exactly those two after every write -- so every apply would
       * report a post-read mismatch and roll back a change that had worked. */
      ...(arrow ? { separator: "=>" as ConfigSeparator } : {}),
    });
  }

  return sections;
}

/** Renders the parsed shape back to a file body. Comments are not preserved. */
export function renderConfig(value: ConfigValue): string {
  const blocks = value.map((section) => {
    const head = section.name.length > 0 ? `[${section.name}]` : "";
    const body = section.entries.map(
      /* Defaults to the plain form: every caller that builds an entry by hand means an
       * ordinary assignment and says nothing about separators. */
      (entry) => `${entry.key} ${entry.separator ?? "="} ${entry.value}`,
    );
    return [head, ...body].filter((line) => line.length > 0).join("\n");
  });
  return `${blocks.join("\n\n")}\n`;
}

/**
 * Renders a desired value over the file it came from, keeping every line the change did
 * not touch.
 *
 * `renderConfig` regenerates a file from the parsed shape, and the parsed shape holds no
 * comments. On this project's own sample dialplan that meant a single edit rewrote 880
 * lines and deleted 606 of them -- every comment explaining what the dialplan does. The
 * settings survived and the reasons for them did not, which is a worse outcome than a
 * failed write, because a failed write tells you.
 *
 * So the original text is walked line by line. A line that is not an entry -- a comment, a
 * blank, a section header -- is kept exactly as written. An entry whose key, value and
 * separator are unchanged is kept as its original line. An entry whose value changed is
 * re-rendered. An entry that is gone is dropped, and anything genuinely new is appended to
 * its section.
 *
 * Repeated keys are matched by position within the key, not by name alone, because these
 * files legitimately repeat one -- several `allow=` lines, many `exten =>` lines -- and
 * matching by name alone would collapse them into the first.
 */
export function renderConfigOver(desired: ConfigValue, originalText: string): string {
  /* Split on the newline alone, so a carriage return rides along inside the line and a
   * file written with either ending comes back with exactly the one it had. Splitting on
   * both and rejoining with one silently rewrites every line in a file it was asked not
   * to touch. */
  const originalLines = originalText.split(String.fromCharCode(10));
  const wanted = new Map<string, ReadonlyArray<{ key: string; value: string; separator?: ConfigSeparator }>>();
  for (const section of desired) wanted.set(section.name, section.entries);

  /* How many of each key have been consumed in the section being walked, so a repeated key
   * lines up with the right one rather than always with the first. */
  const consumed = new Map<string, number>();
  const emitted: string[] = [];
  const seenSections: string[] = [];
  let sectionName: string | undefined;
  let sectionKept = true;

  const entryFor = (name: string, key: string) => {
    const entries = wanted.get(name);
    const index = consumed.get(key) ?? 0;
    consumed.set(key, index + 1);
    if (!entries) return undefined;
    let seen = 0;
    for (const entry of entries) {
      if (entry.key !== key) continue;
      if (seen === index) return entry;
      seen += 1;
    }
    return undefined;
  };

  const flushNewEntries = (name: string) => {
    const entries = wanted.get(name);
    if (!entries) return;
    const used = new Map<string, number>();
    for (const entry of entries) {
      const index = used.get(entry.key) ?? 0;
      used.set(entry.key, index + 1);
      if (index < (consumed.get(entry.key) ?? 0)) continue;
      emitted.push(`${entry.key} ${entry.separator ?? "="} ${entry.value}`);
    }
  };

  for (const rawLine of originalLines) {
    const line = rawLine.trim();

    if (line.startsWith("[") && line.endsWith("]")) {
      if (sectionName !== undefined && sectionKept) flushNewEntries(sectionName);
      sectionName = line.slice(1, -1).trim();
      seenSections.push(sectionName);
      sectionKept = wanted.has(sectionName);
      consumed.clear();
      if (sectionKept) emitted.push(rawLine);
      continue;
    }

    if (!sectionKept) continue;

    const equals = line.length === 0 || line.startsWith(";") ? -1 : line.indexOf("=");
    if (equals < 0) {
      emitted.push(rawLine);
      continue;
    }

    const arrow = line.charAt(equals + 1) === ">";
    const key = line.slice(0, equals).trim();
    const value = line.slice(equals + (arrow ? 2 : 1)).trim();
    const separator: ConfigSeparator = arrow ? "=>" : "=";
    const match = entryFor(sectionName ?? "", key);

    if (!match) continue;
    if (match.value === value && (match.separator ?? "=") === separator) {
      emitted.push(rawLine);
      continue;
    }
    emitted.push(`${match.key} ${match.separator ?? separator} ${match.value}`);
  }

  if (sectionName !== undefined && sectionKept) flushNewEntries(sectionName);

  /* Sections the original never had. Rendered plainly; there is no prior text to keep. */
  for (const section of desired) {
    if (seenSections.includes(section.name)) continue;
    emitted.push("");
    if (section.name.length > 0) emitted.push(`[${section.name}]`);
    for (const entry of section.entries) {
      emitted.push(`${entry.key} ${entry.separator ?? "="} ${entry.value}`);
    }
  }

  /* No trailing newline is added. A file that ended with one has an empty final element
   * from the split and gets it back; a file that did not, does not. Appending one
   * unconditionally added a line to a file nobody edited. */
  return emitted.join(String.fromCharCode(10));
}

export interface WslConfigTransportOptions {
  executor: ProcessExecutor;
  distribution: string;
  now?: () => Date;
}

function looksAbsent(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /No such file or directory/u.test(message);
}

export class WslConfigTransport implements ConfigTransport {
  readonly #executor: ProcessExecutor;
  readonly #distribution: string;
  readonly #now: () => Date;
  /** Maps a staged path back to the resource it belongs to, so apply cannot be misaimed. */
  readonly #staged = new Map<string, ConfigurableResource>();

  constructor(options: WslConfigTransportOptions) {
    this.#executor = options.executor;
    this.#distribution = options.distribution;
    this.#now = options.now ?? (() => new Date());
  }

  /** A resource is already an absolute path from the allowlist; only a suffix is added. */
  #path(resource: ConfigurableResource, suffix = "") {
    return `${resource}${suffix}`;
  }

  async #run(args: ReadonlyArray<string>, input?: string, timeoutMs = 30_000) {
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["-d", this.#distribution, "--", ...args],
      input,
      timeoutMs,
      maxOutputBytes: 8 * 1024 * 1024,
    });
    if (result.status !== "succeeded") {
      throw new Error(result.stderr.trim() || `${args[0]} exited with ${result.exitCode}`);
    }
    return result.stdout;
  }

  /**
   * Reads a file's exact bytes.
   *
   * Deliberately base64, not `cat`. The executor redacts stdout before returning it, which
   * is right for anything a person or a log will see and wrong for a file that is about to
   * be written back: the placeholder goes into the real file and the credential it replaced
   * is gone. Measured on this project's own sample dialplan -- 31,925 bytes on disk came
   * back as 31,896, and the 29 missing were a password in a commented example. On a
   * `pjsip.conf` with live trunk credentials the same path would have replaced working
   * secrets with the word that hides them, and every registration would have failed with a
   * file that still looked plausible.
   *
   * Base64 also makes the read binary-exact, so nothing about encoding can alter a byte on
   * the way in. The decoded text stays in memory and never reaches stdout, which serves the
   * redactor's actual purpose better than redacting the thing we intend to preserve.
   */
  async #readExact(path: string): Promise<string> {
    const encoded = await this.#run(["base64", "-w", "0", path], undefined, 30_000);
    return Buffer.from(encoded.replace(/\s/gu, ""), "base64").toString("utf8");
  }

  async read(resource: string): Promise<ConfigValue> {
    const allowed = assertConfigurable(resource);
    try {
      return parseConfig(await this.#readExact(this.#path(allowed)));
    } catch (error) {
      if (looksAbsent(error)) return [];
      throw error;
    }
  }

  async backup(resource: string): Promise<string> {
    const allowed = assertConfigurable(resource);
    const stamp = this.#now().toISOString().replaceAll(/[:.]/gu, "-");
    const backup = this.#path(allowed, `.backup-${stamp}`);
    try {
      await this.#run(["cp", "--preserve=mode,ownership,timestamps", this.#path(allowed), backup]);
      return backup;
    } catch (error) {
      if (!looksAbsent(error)) throw error;
      const absent = `${backup}-absent`;
      await this.#run(["touch", absent]);
      return absent;
    }
  }

  async stage(resource: string, value: unknown): Promise<string> {
    const allowed = assertConfigurable(resource);
    const staged = this.#path(allowed, ".staged");
    /* Render over the file as it stands, not from the parsed shape alone. The parsed shape
     * carries no comments, so regenerating from it deletes every one of them -- 606 lines
     * out of 880 on this project own sample dialplan. Reading the current text first costs
     * one command and keeps everything the change did not touch.
     *
     * A resource that does not exist yet has no text to preserve, so an empty original is
     * the honest input rather than a failure. */
    let original = "";
    try { original = await this.#readExact(allowed); } catch { original = ""; }
    const body = original.length > 0
      ? renderConfigOver(value as ConfigValue, original)
      : renderConfig(value as ConfigValue);
    await this.#run(["tee", staged], body);
    this.#staged.set(staged, allowed);
    return staged;
  }

  async validate(stagedHandle: string): Promise<void> {
    const resource = this.#staged.get(stagedHandle);
    if (!resource) throw new Error("That staged file was not created by this transaction.");
    /* Exact, like the read above. Validating a redacted copy of what was written would be
     * checking a different file from the one about to be applied. */
    const written = parseConfig(await this.#readExact(stagedHandle));
    if (written.length === 0) {
      throw new Error(`The staged ${resource} parsed to nothing, so it was not applied.`);
    }
  }

  async apply(stagedHandle: string): Promise<void> {
    const resource = this.#staged.get(stagedHandle);
    if (!resource) throw new Error("That staged file was not created by this transaction.");
    await this.#run(["mv", stagedHandle, this.#path(resource)]);
    this.#staged.delete(stagedHandle);
  }

  async rollback(backupHandle: string): Promise<void> {
    const resource = CONFIGURABLE_RESOURCES.find((candidate) => backupHandle.startsWith(`${candidate}.backup-`));
    if (!resource) {
      throw new Error("That backup handle does not belong to a configurable resource.");
    }
    if (backupHandle.endsWith("-absent")) {
      await this.#run(["rm", "-f", resource]);
      return;
    }
    await this.#run(["cp", backupHandle, resource]);
  }
}

/** Convenience for callers assembling a plan from screen state. */
export function configDocument(resource: string, value: ConfigValue): ConfigDocument {
  return { resource: assertConfigurable(resource), value };
}
