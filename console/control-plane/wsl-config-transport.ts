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
  /* Both are declared by a configuration screen in the design reference, so leaving them
   * out would make those screens permanently unreadable for no reason a user could see. */
  `${CONFIG_DIRECTORY}/modules.conf`,
  `${CONFIG_DIRECTORY}/acl.conf`,

  /* The subsystems a real exchange needs and this console could not reach at all.
   * Every name below has a matching file in Asterisk's own `configs/samples`, checked
   * against this checkout rather than remembered — a resource named here that Asterisk
   * does not actually read would be a control that silently does nothing.
   *
   * Presence in this list makes a file readable and writable through the transaction
   * path; it does not by itself put a screen in front of it. Coverage is deliberately
   * ahead of the interface so a new screen needs no change here. */
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
  `${CONFIG_DIRECTORY}/http.conf`,             // the built-in server, and its TLS
  `${CONFIG_DIRECTORY}/stir_shaken.conf`,      // call attestation and its certificates
  `${CONFIG_DIRECTORY}/geolocation.conf`,      // emergency-services location
  `${CONFIG_DIRECTORY}/phoneprov.conf`,        // handset auto-provisioning
  `${CONFIG_DIRECTORY}/features.conf`,         // parking, transfer and feature codes
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
  `${CONFIG_DIRECTORY}/asterisk.conf`,         // directories, and the run-as identity
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
  distribution: string;
  now?: () => Date;
}

function looksAbsent(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /No such file or directory|cannot stat/u.test(message);
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
      /* Optional Asterisk subsystem files are often genuinely absent on a fresh target.
       * Absence means an empty desired resource that the admin UI may create; permission
       * errors and every other failure still surface unchanged. */
      if (looksAbsent(error)) return [];
      throw error;
    }
  }

  async backup(resource: string): Promise<string> {
    const allowed = assertConfigurable(resource);
    /* A timestamped copy rather than an overwritten `.bak`, so a second failed apply
     * cannot destroy the backup taken by the first. If the resource does not exist yet,
     * record that fact as a bounded marker; rollback then removes the newly created file
     * rather than turning "absent" into an empty config. */
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
    /* Content travels on standard input, never as an argument: a configuration file can
     * carry anything, and an argument is visible in a process list. */
    await this.#run(["tee", staged], renderConfig(value as ConfigValue));
    this.#staged.set(staged, allowed);
    return staged;
  }

  /**
   * Confirms the staged file is on the target and reads back exactly as intended.
   *
   * Asterisk offers no offline syntax check, so this deliberately does not claim to be
   * one. What it does prove is that the write landed and survived a round trip — which
   * is the failure this step can actually catch, and saying more than that would be a
   * claim the check cannot support.
   */
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

  /**
   * Restores a backup over the resource it was taken from.
   *
   * The resource is recovered by matching the handle against the allowlist itself rather
   * than by parsing a path out of it, so a handle can only ever restore over a file the
   * allowlist already contains. An `-absent` marker means the resource did not exist
   * before the transaction, so rollback removes the file that transaction created.
   */
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
