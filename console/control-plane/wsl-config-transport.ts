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
import type { TargetProfile } from "./contracts.js";

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
export interface ConfigSection {
  name: string;
  entries: ReadonlyArray<{ key: string; value: string }>;
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
  let current: { name: string; entries: Array<{ key: string; value: string }> } | undefined;

  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    if (line.startsWith(";")) continue;

    if (line.startsWith("[") && line.endsWith("]")) {
      current = { name: line.slice(1, -1).trim(), entries: [] };
      sections.push(current);
      continue;
    }

    const separator = line.indexOf("=");
    if (separator < 0) continue;
    if (!current) {
      current = { name: "", entries: [] };
      sections.push(current);
    }
    current.entries.push({
      key: line.slice(0, separator).trim(),
      value: line.slice(separator + 1).trim(),
    });
  }

  return sections;
}

/** Renders the parsed shape back to a file body. Comments are not preserved. */
export function renderConfig(value: ConfigValue): string {
  const blocks = value.map((section) => {
    const head = section.name.length > 0 ? `[${section.name}]` : "";
    const body = section.entries.map((entry) => `${entry.key} = ${entry.value}`);
    return [head, ...body].filter((line) => line.length > 0).join("\n");
  });
  return `${blocks.join("\n\n")}\n`;
}

export interface WslConfigTransportOptions {
  executor: ProcessExecutor;
  distribution?: string;
  target?: Pick<TargetProfile, "connectionKind" | "wslDistribution" | "dockerContext">;
  now?: () => Date;
}

function looksAbsent(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /No such file or directory/u.test(message);
}

export class WslConfigTransport implements ConfigTransport {
  readonly #executor: ProcessExecutor;
  readonly #target: Pick<TargetProfile, "connectionKind" | "wslDistribution" | "dockerContext">;
  readonly #now: () => Date;
  /** Maps a staged path back to the resource it belongs to, so apply cannot be misaimed. */
  readonly #staged = new Map<string, ConfigurableResource>();

  constructor(options: WslConfigTransportOptions) {
    this.#executor = options.executor;
    this.#target = options.target ?? { connectionKind: "wsl", wslDistribution: options.distribution };
    if (this.#target.connectionKind === "wsl" && !this.#target.wslDistribution?.trim()) throw new Error("A WSL distribution is required.");
    if (this.#target.connectionKind === "localDocker" && !this.#target.dockerContext?.trim()) throw new Error("A local Docker target requires a discovered container id.");
    if (this.#target.connectionKind !== "wsl" && this.#target.connectionKind !== "localDocker") throw new Error("This configuration transport supports WSL and local Docker only.");
    this.#now = options.now ?? (() => new Date());
  }

  /** A resource is already an absolute path from the allowlist; only a suffix is added. */
  #path(resource: ConfigurableResource, suffix = "") {
    return `${resource}${suffix}`;
  }

  async #run(args: ReadonlyArray<string>, input?: string, timeoutMs = 30_000) {
    const command = this.#target.connectionKind === "wsl"
      ? { executable: "wsl.exe", args: ["-d", this.#target.wslDistribution!, "--", ...args] }
      : { executable: "docker", args: ["exec", this.#target.dockerContext!, ...args] };
    const result = await this.#executor.execute({
      executable: command.executable,
      args: command.args,
      input,
      timeoutMs,
      maxOutputBytes: 4 * 1024 * 1024,
    });
    if (result.status !== "succeeded") {
      throw new Error(result.stderr.trim() || `${args[0]} exited with ${result.exitCode}`);
    }
    return result.stdout;
  }

  async read(resource: string): Promise<ConfigValue> {
    const allowed = assertConfigurable(resource);
    try {
      return parseConfig(await this.#run(["cat", this.#path(allowed)]));
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
    await this.#run(["tee", staged], renderConfig(value as ConfigValue));
    this.#staged.set(staged, allowed);
    return staged;
  }

  async validate(stagedHandle: string): Promise<void> {
    const resource = this.#staged.get(stagedHandle);
    if (!resource) throw new Error("That staged file was not created by this transaction.");
    const written = parseConfig(await this.#run(["cat", stagedHandle]));
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
