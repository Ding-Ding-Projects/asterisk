/**
 * Typed views over five subsystems that were readable/writable through the transport
 * (`wsl-config-transport.ts`) but had no model: fax, channel event logging, feature
 * codes/parking, handset provisioning, and IAX2 trunking.
 *
 * Every field here is justified by a line in the matching sample file under
 * `configs/samples/`, cited in a comment beside the field. Where a sample does not
 * settle a question the field is left out, and the omission is explained in a comment
 * rather than guessed at — a field this console writes that Asterisk does not read is a
 * control that silently does nothing.
 *
 * Each subsystem gets three pure functions: `parseX` builds the typed view from the raw
 * `ConfigValue`, `validateX` returns findings against it, and `toConfigValueX` renders it
 * back — preserving every section and entry this model does not understand, and every
 * repeated key, exactly as `wsl-config-transport.ts` already requires of the transport
 * itself.
 */
import type { ConfigSection, ConfigValue } from "./wsl-config-transport.js";

export type Severity = "error" | "warning";

export interface Finding {
  readonly severity: Severity;
  readonly message: string;
}

function section(value: ConfigValue, name: string): ConfigSection | undefined {
  return value.find((candidate) => candidate.name === name);
}

function entryValue(sectionValue: ConfigSection | undefined, key: string): string | undefined {
  return sectionValue?.entries.find((entry) => entry.key === key)?.value;
}

function entryValues(sectionValue: ConfigSection | undefined, key: string): string[] {
  return (sectionValue?.entries ?? []).filter((entry) => entry.key === key).map((entry) => entry.value);
}

/** Rebuilds a `ConfigValue` from named sections while leaving every other section as-is. */
function withSections(value: ConfigValue, replacements: ReadonlyMap<string, ConfigSection>): ConfigValue {
  const seen = new Set<string>();
  const rebuilt: ConfigSection[] = [];
  for (const existing of value) {
    if (replacements.has(existing.name)) {
      if (!seen.has(existing.name)) {
        rebuilt.push(replacements.get(existing.name)!);
        seen.add(existing.name);
      }
      continue;
    }
    rebuilt.push(existing);
  }
  for (const [name, replacement] of replacements) {
    if (!seen.has(name)) rebuilt.push(replacement);
  }
  return rebuilt;
}

const YES_NO = new Set(["yes", "no"]);

// ---------------------------------------------------------------------------------------
// Fax (res_fax.conf + udptl.conf)
// ---------------------------------------------------------------------------------------

/** `[general]` of res_fax.conf. Sample: configs/samples/res_fax.conf.sample. */
export interface FaxGeneralView {
  /** res_fax.conf.sample: "Maximum Transmission Rate ... {2400|4800|7200|9600|12000|14400}". */
  maxrate?: string;
  /** res_fax.conf.sample: "Minimum Transmission Rate ... {2400|4800|7200|9600|12000|14400}". */
  minrate?: string;
  /** res_fax.conf.sample: "Send Progress/Status events to manager session ... yes/no". */
  statusevents?: string;
  /** res_fax.conf.sample: "modem capabilities ... {v17|v27|v29}". */
  modems?: string;
  /** res_fax.conf.sample: "Enable/disable T.30 ECM ... Default: Enabled" (yes/no). */
  ecm?: string;
  /** res_fax.conf.sample: "T.38 Negotiation Timeout in milliseconds". */
  t38timeout?: string;
}

/** `[general]` of udptl.conf. Sample: configs/samples/udptl.conf.sample. */
export interface UdptlGeneralView {
  /** udptl.conf.sample: "udptlstart and udptlend configure start and end addresses". */
  udptlstart?: string;
  udptlend?: string;
  /** udptl.conf.sample: "Whether to enable or disable UDP checksums ... " (yes/no). */
  udptlchecksums?: string;
  /** udptl.conf.sample: "The number of error correction entries in a UDPTL packet". */
  udptlfecentries?: string;
  /** udptl.conf.sample: "The span over which parity is calculated for FEC". */
  udptlfecspan?: string;
  /** udptl.conf.sample: "Set this option so that Asterisk will only attempt to use
   *  even-numbered ports ... Default is no." */
  use_even_ports?: string;
}

export interface FaxView {
  general: FaxGeneralView;
  udptl: UdptlGeneralView;
  /** Sections/entries this model does not interpret, preserved verbatim on write-back. */
  readonly rest: { fax: ConfigValue; udptl: ConfigValue };
}

const FAX_KEYS: ReadonlyArray<keyof FaxGeneralView> = [
  "maxrate",
  "minrate",
  "statusevents",
  "modems",
  "ecm",
  "t38timeout",
];
const UDPTL_KEYS: ReadonlyArray<keyof UdptlGeneralView> = [
  "udptlstart",
  "udptlend",
  "udptlchecksums",
  "udptlfecentries",
  "udptlfecspan",
  "use_even_ports",
];
export const FAX_RATES = new Set(["2400", "4800", "7200", "9600", "12000", "14400"]);
export const FAX_MODEMS = new Set(["v17", "v27", "v29"]);

export function parseFax(faxValue: ConfigValue, udptlValue: ConfigValue): FaxView {
  const faxGeneral = section(faxValue, "general");
  const udptlGeneral = section(udptlValue, "general");
  const general: FaxGeneralView = {};
  for (const key of FAX_KEYS) {
    const value = entryValue(faxGeneral, key);
    if (value !== undefined) general[key] = value;
  }
  const udptl: UdptlGeneralView = {};
  for (const key of UDPTL_KEYS) {
    const value = entryValue(udptlGeneral, key);
    if (value !== undefined) udptl[key] = value;
  }
  return { general, udptl, rest: { fax: faxValue, udptl: udptlValue } };
}

export function validateFax(view: FaxView): Finding[] {
  const findings: Finding[] = [];
  for (const [field, rate] of [
    ["maxrate", view.general.maxrate],
    ["minrate", view.general.minrate],
  ] as const) {
    // res_fax.conf.sample: "Possible values are { 2400 | 4800 | 7200 | 9600 | 12000 | 14400 }"
    if (rate !== undefined && !FAX_RATES.has(rate)) {
      findings.push({ severity: "error", message: `Fax ${field} must be one of 2400, 4800, 7200, 9600, 12000, or 14400.` });
    }
  }
  if (view.general.modems !== undefined) {
    // res_fax.conf.sample: "Possible values are { v17 | v27 | v29 }"
    const invalid = view.general.modems.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0 && !FAX_MODEMS.has(entry));
    if (invalid.length > 0) {
      findings.push({ severity: "error", message: `Fax modems lists an unsupported value: ${invalid.join(", ")}. Only v17, v27, and v29 are accepted.` });
    }
  }
  for (const [field, value] of [
    ["statusevents", view.general.statusevents],
    ["ecm", view.general.ecm],
  ] as const) {
    if (value !== undefined && !YES_NO.has(value)) {
      findings.push({ severity: "error", message: `Fax ${field} must be yes or no.` });
    }
  }
  if (view.general.maxrate !== undefined && view.general.minrate !== undefined) {
    const maxIndex = [...FAX_RATES].indexOf(view.general.maxrate);
    const minIndex = [...FAX_RATES].indexOf(view.general.minrate);
    if (maxIndex >= 0 && minIndex >= 0 && maxIndex < minIndex) {
      findings.push({ severity: "warning", message: "Fax maxrate is lower than minrate, so no rate in between will ever be selected." });
    }
  }
  if (view.udptl.udptlchecksums !== undefined && !YES_NO.has(view.udptl.udptlchecksums)) {
    findings.push({ severity: "error", message: "udptlchecksums must be yes or no." });
  }
  if (view.udptl.use_even_ports !== undefined && !YES_NO.has(view.udptl.use_even_ports)) {
    findings.push({ severity: "error", message: "use_even_ports must be yes or no." });
  }
  if (view.udptl.udptlstart !== undefined && view.udptl.udptlend !== undefined) {
    const start = Number(view.udptl.udptlstart);
    const end = Number(view.udptl.udptlend);
    // udptl.conf.sample: "udptlstart and udptlend configure start and end addresses"
    if (Number.isFinite(start) && Number.isFinite(end) && start > end) {
      findings.push({ severity: "error", message: "udptlstart is greater than udptlend, so the UDPTL port range is empty." });
    }
  }
  return findings;
}

/**
 * Rebuilds a section's entries in place: a managed key keeps its original position (its
 * first occurrence's position, for a repeatable key), an unmanaged entry is left exactly
 * where it was, and a managed key with no original occurrence is appended at the end.
 * This is what makes a no-change round trip render byte-for-byte identically rather than
 * merely containing the same entries in a different order.
 */
function rebuildEntries(
  original: ReadonlyArray<{ key: string; value: string }>,
  managedKeys: readonly string[],
  valuesFor: (key: string) => readonly string[],
): Array<{ key: string; value: string }> {
  const emitted = new Set<string>();
  const result: Array<{ key: string; value: string }> = [];
  for (const entry of original) {
    if (managedKeys.includes(entry.key)) {
      if (emitted.has(entry.key)) continue;
      for (const value of valuesFor(entry.key)) result.push({ key: entry.key, value });
      emitted.add(entry.key);
      continue;
    }
    result.push(entry);
  }
  for (const key of managedKeys) {
    if (!emitted.has(key)) {
      for (const value of valuesFor(key)) result.push({ key, value });
    }
  }
  return result;
}

function generalSectionFrom(existing: ConfigSection | undefined, values: Record<string, string | undefined>, keys: readonly string[]): ConfigSection {
  const entries = rebuildEntries(existing?.entries ?? [], keys, (key) => (values[key] !== undefined ? [values[key]!] : []));
  return { name: "general", entries };
}

export function toConfigValueFax(view: FaxView): { fax: ConfigValue; udptl: ConfigValue } {
  const faxGeneral = generalSectionFrom(section(view.rest.fax, "general"), view.general as Record<string, string | undefined>, FAX_KEYS);
  const udptlGeneral = generalSectionFrom(section(view.rest.udptl, "general"), view.udptl as Record<string, string | undefined>, UDPTL_KEYS);
  return {
    fax: withSections(view.rest.fax, new Map([["general", faxGeneral]])),
    udptl: withSections(view.rest.udptl, new Map([["general", udptlGeneral]])),
  };
}

// ---------------------------------------------------------------------------------------
// Built-in HTTP server (http.conf)
// ---------------------------------------------------------------------------------------

/**
 * Asterisk's mini-HTTP server, which is what FreePBX's HTTP* advanced settings actually
 * configure. Three of its keys are spelled differently from the Core setting names that
 * map to them, and one Core setting has no key of its own at all -- see HttpView.
 */
export interface HttpGeneralView {
  /** http.conf.sample line 29: ";enabled=yes". Default is no. */
  enabled?: string;
  /** line 68: ";enable_static=yes". Note the underscore: Core calls this setting
   *  HTTPENABLESTATIC, and writing "enablestatic" would emit a key Asterisk ignores. */
  enable_static?: string;
  /** line 74: ";enable_status=yes". Same spelling divergence as enable_static. */
  enable_status?: string;
  /** line 30-ish: "bindaddr=127.0.0.1". */
  bindaddr?: string;
  /** ";bindport=8088". */
  bindport?: string;
  /** ";prefix=asterisk". */
  prefix?: string;
  /** ";tlsenable=yes ; enable tls - default no." */
  tlsenable?: string;
  /** ";tlsbindaddr=0.0.0.0:8089 ; address and port to bind to". ONE key carrying both
   *  the address and the port that Core splits into HTTPTLSBINDADDRESS and
   *  HTTPTLSBINDPORT. */
  tlsbindaddr?: string;
  /** ";tlscertfile=</path/to/certificate.pem>". */
  tlscertfile?: string;
  /** ";tlsprivatekey=</path/to/private.pem>". */
  tlsprivatekey?: string;
  /** line 112: "tlsdisablev1=yes ; Disable TLSv1 support". */
  tlsdisablev1?: string;
  /** line 113: "tlsdisablev11=yes". */
  tlsdisablev11?: string;
  /** line 114: "tlsdisablev12=yes". */
  tlsdisablev12?: string;
  /** line 50: ";sessionlimit=100". Core calls it HTTPSESSIONLIMIT; the key has no
   *  underscore, unlike the two session keys below. */
  sessionlimit?: string;
  /** ";session_inactivity=30000". */
  session_inactivity?: string;
  /** ";session_keep_alive=15000". */
  session_keep_alive?: string;
  /** ";redirect = / /static/config/index.html". */
  redirect?: string;
}

export interface HttpView {
  general: HttpGeneralView;
  readonly rest: ConfigValue;
}

const HTTP_GENERAL_KEYS: ReadonlyArray<keyof HttpGeneralView> = [
  "enabled", "enable_static", "enable_status", "bindaddr", "bindport", "prefix",
  "tlsenable", "tlsbindaddr", "tlscertfile", "tlsprivatekey",
  "tlsdisablev1", "tlsdisablev11", "tlsdisablev12",
  "sessionlimit", "session_inactivity", "session_keep_alive", "redirect",
];

export function parseHttp(value: ConfigValue): HttpView {
  const general = section(value, "general");
  const view: HttpGeneralView = {};
  for (const key of HTTP_GENERAL_KEYS) {
    const found = entryValue(general, key);
    if (found !== undefined) view[key] = found;
  }
  return { general: view, rest: value };
}

export function toConfigValueHttp(view: HttpView): ConfigValue {
  const general = generalSectionFrom(
    section(view.rest, "general"),
    view.general as Record<string, string | undefined>,
    HTTP_GENERAL_KEYS as readonly string[],
  );
  return withSections(view.rest, new Map([["general", general]]));
}

// ---------------------------------------------------------------------------------------
// Channel Event Logging (cel.conf)
// ---------------------------------------------------------------------------------------

const CEL_EVENTS = new Set([
  "ALL",
  "CHAN_START",
  "CHAN_END",
  "ANSWER",
  "HANGUP",
  "BRIDGE_ENTER",
  "BRIDGE_EXIT",
  "APP_START",
  "APP_END",
  "PARK_START",
  "PARK_END",
  "BLINDTRANSFER",
  "ATTENDEDTRANSFER",
  "PICKUP",
  "FORWARD",
  "LINKEDID_END",
  "USER_DEFINED",
  "LOCAL_OPTIMIZE_BEGIN",
  "LOCAL_OPTIMIZE",
  "STREAM_BEGIN",
  "STREAM_END",
  "DTMF",
]);

export interface CelGeneralView {
  /** cel.conf.sample: "Use the 'enable' keyword to turn CEL on or off ... yes and no". */
  enable?: string;
  /** cel.conf.sample: "apps ... comma separated list of Asterisk dialplan applications". */
  apps?: string;
  /** cel.conf.sample: "events ... comma separated list of the values in the table below". */
  events?: string;
  /** cel.conf.sample: "dateformat ... A strftime format string". No enumerated values to
   *  validate, since the sample only gives an example rather than a closed set. */
  dateformat?: string;
}

export interface CelManagerView {
  /** cel.conf.sample: "Use the 'enable' keyword to turn CEL logging to the ... AMI ... on
   *  or off". Note: this key is literally spelled "enabled" in the sample, unlike the
   *  [general] section's "enable" — both are cited as written. */
  enabled?: string;
  /** cel.conf.sample: "Use 'show_user_defined' to put 'USER_DEFINED' in the EventName
   *  header ... yes and no" (accepted values are stated for `enable`/`enabled`; this one
   *  only shows `yes`, but the surrounding options are consistently yes/no booleans). */
  show_user_defined?: string;
}

export interface CelRadiusView {
  /** cel.conf.sample: "Log date/time in GMT" (;usegmtime=yes). */
  usegmtime?: string;
  /** cel.conf.sample: "Set this to the location of the radiusclient-ng configuration
   *  file". Written with "=>" in the sample; captured as a plain value here because the
   *  transport's parser treats "=" as the sole separator (see wsl-config-transport.ts). */
  radiuscfg?: string;
}

export interface CelView {
  general: CelGeneralView;
  manager: CelManagerView;
  radius: CelRadiusView;
  readonly rest: ConfigValue;
}

export function parseCel(value: ConfigValue): CelView {
  const general = section(value, "general");
  const manager = section(value, "manager");
  const radius = section(value, "radius");
  return {
    general: {
      enable: entryValue(general, "enable"),
      apps: entryValue(general, "apps"),
      events: entryValue(general, "events"),
      dateformat: entryValue(general, "dateformat"),
    },
    manager: {
      enabled: entryValue(manager, "enabled"),
      show_user_defined: entryValue(manager, "show_user_defined"),
    },
    radius: {
      usegmtime: entryValue(radius, "usegmtime"),
      radiuscfg: entryValue(radius, "radiuscfg"),
    },
    rest: value,
  };
}

export function validateCel(view: CelView): Finding[] {
  const findings: Finding[] = [];
  if (view.general.enable !== undefined && !YES_NO.has(view.general.enable)) {
    findings.push({ severity: "error", message: "CEL enable must be yes or no." });
  }
  if (view.general.events !== undefined) {
    const invalid = view.general.events.split(",").map((e) => e.trim()).filter((e) => e.length > 0 && !CEL_EVENTS.has(e));
    if (invalid.length > 0) {
      findings.push({ severity: "error", message: `CEL events lists an event that does not exist: ${invalid.join(", ")}.` });
    }
  }
  // cel.conf.sample: "Note: You may also use 'all' which will result in CEL events being
  // reported for all Asterisk applications. This may affect Asterisk's performance
  // significantly." -- warn, but only on the literal 'all' apps keyword can accept.
  if (view.general.apps !== undefined && view.general.apps.split(",").map((a) => a.trim()).includes("all")) {
    findings.push({ severity: "warning", message: "CEL apps is set to 'all', which the sample warns may affect Asterisk's performance significantly." });
  }
  if (view.general.enable !== "yes" && (view.manager.enabled === "yes" || view.general.events !== undefined || view.general.apps !== undefined)) {
    // cel.conf.sample: CEL is off by default; tracking apps/events or an enabled backend
    // with the master switch off means nothing will be recorded.
    findings.push({ severity: "warning", message: "CEL apps, events, or the manager backend are configured but general/enable is not yes, so nothing will be logged." });
  }
  if (view.manager.enabled !== undefined && !YES_NO.has(view.manager.enabled)) {
    findings.push({ severity: "error", message: "CEL manager enabled must be yes or no." });
  }
  if (view.manager.show_user_defined !== undefined && !YES_NO.has(view.manager.show_user_defined)) {
    findings.push({ severity: "error", message: "CEL manager show_user_defined must be yes or no." });
  }
  if (view.radius.usegmtime !== undefined && !YES_NO.has(view.radius.usegmtime)) {
    findings.push({ severity: "error", message: "CEL radius usegmtime must be yes or no." });
  }
  return findings;
}

export function toConfigValueCel(view: CelView): ConfigValue {
  const general = generalSectionFrom(section(view.rest, "general"), view.general as Record<string, string | undefined>, [
    "enable",
    "apps",
    "events",
    "dateformat",
  ]);
  const manager = { ...generalSectionFrom(section(view.rest, "manager"), view.manager as Record<string, string | undefined>, ["enabled", "show_user_defined"]), name: "manager" };
  const radius = { ...generalSectionFrom(section(view.rest, "radius"), view.radius as Record<string, string | undefined>, ["usegmtime", "radiuscfg"]), name: "radius" };
  return withSections(
    view.rest,
    new Map([
      ["general", general],
      ["manager", manager],
      ["radius", radius],
    ]),
  );
}

// ---------------------------------------------------------------------------------------
// Feature codes and parking (features.conf)
// ---------------------------------------------------------------------------------------

export interface FeaturesGeneralView {
  /** features.conf.sample: "transferdigittimeout ... Number of seconds to wait between
   *  digits when transferring a call". */
  transferdigittimeout?: string;
  /** features.conf.sample: "xfersound ... to indicate an attended transfer is complete". */
  xfersound?: string;
  /** features.conf.sample: "xferfailsound ... to indicate a failed transfer". */
  xferfailsound?: string;
  /** features.conf.sample: "pickupexten ... Configure the pickup extension. (default is
   *  *8)". */
  pickupexten?: string;
  /** features.conf.sample: "featuredigittimeout ... Max time (ms) between digits for
   *  feature activation". */
  featuredigittimeout?: string;
  /** features.conf.sample: "atxfernoanswertimeout ... Timeout for answer on attended
   *  transfer default is 15 seconds." */
  atxfernoanswertimeout?: string;
  /** features.conf.sample: "atxferdropcall ... If this is set to 'yes' ...". */
  atxferdropcall?: string;
  /** features.conf.sample: "atxferabort = *1 ; cancel the attended transfer". */
  atxferabort?: string;
  /** features.conf.sample: "atxfercomplete = *2 ; complete the attended transfer,
   *  dropping out of the transfer". */
  atxfercomplete?: string;
  /** features.conf.sample: "atxferthreeway = *3 ; complete the attended transfer,
   *  but stay in the call". */
  atxferthreeway?: string;
  /** features.conf.sample: "atxferswap = *4 ; swap to the other party". */
  atxferswap?: string;
}

/** A single "<FeatureName> => <sequence>" line from `[featuremap]`. features.conf.sample:
 *  "[featuremap] ;blindxfer => #1 ; Blind transfer ...". */
export interface FeatureMapEntry {
  name: string;
  sequence: string;
}

export interface FeaturesView {
  general: FeaturesGeneralView;
  /** `[featuremap]` entries, in file order. Repeats are preserved (see round-trip tests). */
  featuremap: FeatureMapEntry[];
  readonly rest: ConfigValue;
}

const FEATURES_GENERAL_KEYS: ReadonlyArray<keyof FeaturesGeneralView> = [
  "transferdigittimeout",
  "xfersound",
  "xferfailsound",
  "pickupexten",
  "featuredigittimeout",
  "atxfernoanswertimeout",
  "atxferdropcall",
  "atxferabort",
  "atxfercomplete",
  "atxferthreeway",
  "atxferswap",
];

export function parseFeatures(value: ConfigValue): FeaturesView {
  const general = section(value, "general");
  const featuremap = section(value, "featuremap");
  const view: FeaturesGeneralView = {};
  for (const key of FEATURES_GENERAL_KEYS) {
    const v = entryValue(general, key);
    if (v !== undefined) view[key] = v;
  }
  const entries = (featuremap?.entries ?? []).map((entry) => ({ name: entry.key, sequence: entry.value }));
  return { general: view, featuremap: entries, rest: value };
}

export function validateFeatures(view: FeaturesView): Finding[] {
  const findings: Finding[] = [];
  if (view.general.transferdigittimeout !== undefined && !/^\d+$/u.test(view.general.transferdigittimeout)) {
    findings.push({ severity: "error", message: "transferdigittimeout must be a whole number of seconds." });
  }
  if (view.general.featuredigittimeout !== undefined && !/^\d+$/u.test(view.general.featuredigittimeout)) {
    findings.push({ severity: "error", message: "featuredigittimeout must be a whole number of milliseconds." });
  }
  if (view.general.atxfernoanswertimeout !== undefined && !/^\d+$/u.test(view.general.atxfernoanswertimeout)) {
    findings.push({ severity: "error", message: "atxfernoanswertimeout must be a whole number of seconds." });
  }
  if (view.general.atxferdropcall !== undefined && !YES_NO.has(view.general.atxferdropcall)) {
    findings.push({ severity: "error", message: "atxferdropcall must be yes or no." });
  }
  // features.conf.sample: "Configure the pickup extension. (default is *8)" -- names a
  // real dial sequence rather than a closed set, so only emptiness is checked.
  if (view.general.pickupexten !== undefined && view.general.pickupexten.trim().length === 0) {
    findings.push({ severity: "error", message: "pickupexten cannot be blank." });
  }
  const seen = new Map<string, string>();
  for (const entry of view.featuremap) {
    // features.conf.sample: each featuremap entry maps one DTMF sequence to one built-in
    // feature; two features sharing a sequence means only one can ever fire.
    const existing = seen.get(entry.sequence);
    if (existing !== undefined && existing !== entry.name) {
      findings.push({ severity: "warning", message: `Featuremap sequence ${entry.sequence} is assigned to both ${existing} and ${entry.name}.` });
    }
    seen.set(entry.sequence, entry.name);
  }
  return findings;
}

export function toConfigValueFeatures(view: FeaturesView): ConfigValue {
  const general = generalSectionFrom(section(view.rest, "general"), view.general as Record<string, string | undefined>, FEATURES_GENERAL_KEYS);
  const featuremap: ConfigSection = {
    name: "featuremap",
    entries: view.featuremap.map((entry) => ({ key: entry.name, value: entry.sequence })),
  };
  return withSections(
    view.rest,
    new Map([
      ["general", general],
      ["featuremap", featuremap],
    ]),
  );
}

// ---------------------------------------------------------------------------------------
// Handset provisioning (phoneprov.conf)
// ---------------------------------------------------------------------------------------

export interface PhoneprovGeneralView {
  /** phoneprov.conf.sample: "Override address to send to the phone to use as server
   *  address." */
  serveraddr?: string;
  /** phoneprov.conf.sample: "Same as above, except an ethernet interface." */
  serveriface?: string;
  /** phoneprov.conf.sample: "Override port to send to the phone to use as server port." */
  serverport?: string;
  /** phoneprov.conf.sample: "default_profile=polycom ; The default profile to use if none
   *  specified in phoneprov_users.conf". */
  default_profile?: string;
}

/** A profile section such as `[polycom]`. phoneprov.conf.sample lines like
 *  "static_file => bootrom.ld,application/octet-stream". */
export interface PhoneprovProfileView {
  name: string;
  /** phoneprov.conf.sample: "staticdir => configs/ ; Sub directory ... static files
   *  reside in". */
  staticdir?: string;
  /** phoneprov.conf.sample: "mime_type => text/xml ; Default mime type ...". */
  mime_type?: string;
  /** phoneprov.conf.sample: "static_file => filename,mime-type" -- legitimately repeated,
   *  one per file the phone downloads. */
  staticFiles: string[];
}

export interface PhoneprovView {
  general: PhoneprovGeneralView;
  profiles: PhoneprovProfileView[];
  readonly rest: ConfigValue;
}

const PHONEPROV_GENERAL_KEYS: ReadonlyArray<keyof PhoneprovGeneralView> = [
  "serveraddr",
  "serveriface",
  "serverport",
  "default_profile",
];

export function parsePhoneprov(value: ConfigValue): PhoneprovView {
  const general = section(value, "general");
  const view: PhoneprovGeneralView = {};
  for (const key of PHONEPROV_GENERAL_KEYS) {
    const v = entryValue(general, key);
    if (v !== undefined) view[key] = v;
  }
  const profiles = value
    .filter((candidate) => candidate.name.length > 0 && candidate.name !== "general")
    .map((profileSection) => ({
      name: profileSection.name,
      staticdir: entryValue(profileSection, "staticdir"),
      mime_type: entryValue(profileSection, "mime_type"),
      staticFiles: entryValues(profileSection, "static_file"),
    }));
  return { general: view, profiles, rest: value };
}

export function validatePhoneprov(view: PhoneprovView): Finding[] {
  const findings: Finding[] = [];
  if (view.general.default_profile !== undefined) {
    const names = new Set(view.profiles.map((p) => p.name));
    // phoneprov.conf.sample: "default_profile=polycom ; The default profile to use ..."
    // -- a profile named here that has no [section] cannot ever be selected.
    if (!names.has(view.general.default_profile)) {
      findings.push({ severity: "error", message: `default_profile refers to '${view.general.default_profile}', which has no matching profile section.` });
    }
  }
  for (const profile of view.profiles) {
    if (profile.staticFiles.length === 0 && profile.staticdir === undefined && profile.mime_type === undefined) {
      findings.push({ severity: "warning", message: `Profile [${profile.name}] declares no static files, staticdir, or mime_type, so it will register nothing.` });
    }
  }
  return findings;
}

export function toConfigValuePhoneprov(view: PhoneprovView): ConfigValue {
  const general = generalSectionFrom(section(view.rest, "general"), view.general as Record<string, string | undefined>, PHONEPROV_GENERAL_KEYS);
  const profileNames = new Set(view.profiles.map((p) => p.name));
  const replacements = new Map<string, ConfigSection>();
  replacements.set("general", general);
  const PROFILE_KEYS = ["staticdir", "mime_type", "static_file"] as const;
  for (const profile of view.profiles) {
    const existing = section(view.rest, profile.name);
    const entries = rebuildEntries(existing?.entries ?? [], PROFILE_KEYS, (key) => {
      if (key === "staticdir") return profile.staticdir !== undefined ? [profile.staticdir] : [];
      if (key === "mime_type") return profile.mime_type !== undefined ? [profile.mime_type] : [];
      return profile.staticFiles;
    });
    replacements.set(profile.name, { name: profile.name, entries });
  }
  // Sections dropped from view.profiles (name still present in rest but not in the view)
  // are left untouched by withSections since they are not in `replacements`; a caller that
  // wants a profile removed must express that by omitting it AND is expected to handle
  // that case explicitly -- out of scope for this model, which never deletes a section it
  // was not told about.
  void profileNames;
  return withSections(view.rest, replacements);
}

// ---------------------------------------------------------------------------------------
// IAX2 trunking (iax.conf)
// ---------------------------------------------------------------------------------------

export interface IaxGeneralView {
  /** iax.conf.sample: "bindport=4569 ... The default port to listen on". */
  bindport?: string;
  /** iax.conf.sample: "bindaddr ... You can specify 'bindaddr' more than once" --
   *  repeatable, kept as an ordered list. */
  bindaddr: string[];
  /** iax.conf.sample: "Set 'iaxcompat' to yes if you plan to use layered switches ...
   *  Accepted values: yes, no". */
  iaxcompat?: string;
  /** iax.conf.sample: "nochecksums ... Accepted values: yes, no". */
  nochecksums?: string;
  /** iax.conf.sample: "delayreject ... Accepted values: yes, no". */
  delayreject?: string;
  /** iax.conf.sample: "amaflags ... Accepted values: default, omit, billing,
   *  documentation". */
  amaflags?: string;
  /** iax.conf.sample: "bandwidth of low, medium, or high". */
  bandwidth?: string;
  /** iax.conf.sample: "jitterbuffer=yes|no: global default". */
  jitterbuffer?: string;
  /** iax.conf.sample: "maxjitterbuffer: a maximum size for the jitter buffer." */
  maxjitterbuffer?: string;
  /** iax.conf.sample: "auth=md5" -- "three authentication methods that are supported:
   *  md5, plaintext, and rsa." */
  auth?: string;
  /** iax.conf.sample: "requirecalltoken=no" (near line 427; boolean per surrounding
   *  yes/no options, no explicit enumeration given in this exact comment, so treated
   *  as yes/no consistent with every other boolean documented in this section). */
  requirecalltoken?: string;
}

/** A `[name]` user/peer/friend section. iax.conf.sample: "[markster] / type=user /
 *  context=default / auth=md5,plaintext,rsa / secret=... / permit=... / deny=...". */
export interface IaxPeerView {
  name: string;
  /** iax.conf.sample: ";type=user", ";type=peer", ";type=friend" (line 490, 522, 558,
   *  613, 626, 642). */
  type?: string;
  /** iax.conf.sample: ";host=192.168.10.10" / ";host=dynamic". */
  host?: string;
  /** iax.conf.sample: "context=default" / "context=local" -- repeatable, the sample
   *  states "Multiple permitted contexts may be specified, in which case the first
   *  will be the default." */
  context: string[];
  /** iax.conf.sample: ";auth=md5,plaintext,rsa". */
  auth?: string;
  /** iax.conf.sample: ";permit=0.0.0.0/0.0.0.0" -- repeatable ("Multiple rules are
   *  permitted."). */
  permit: string[];
  /** iax.conf.sample: ";deny=0.0.0.0/0.0.0.0" -- same repeatability as permit. */
  deny: string[];
  /** iax.conf.sample: ";trunk=yes ; Use IAX2 trunking with this host". */
  trunk?: string;
  /** iax.conf.sample: ";qualify=yes ; Make sure this peer is alive." */
  qualify?: string;
  /** iax.conf.sample line 533-534: ";transfer=no" / ";transfer=mediaonly". */
  transfer?: string;
  /** iax.conf.sample: ";port=5036". */
  port?: string;
  /** iax.conf.sample: ";disallow=g723.1" -- repeatable, same as PJSIP. */
  disallow: string[];
  /** iax.conf.sample: ";allow=all" -- repeatable and order-significant. */
  allow: string[];
  /** iax.conf.sample: ";accountcode=lss0101". */
  accountcode?: string;
  /** iax.conf.sample: ";mailbox=1234 ; Notify about mailbox 1234". */
  mailbox?: string;
  /** iax.conf.sample line 418-423: ";requirecalltoken=no" / "=auto"; peer/user/friend
   *  definitions only. Distinct from the [general] key of the same name above. */
  requirecalltoken?: string;
  /** iax.conf.sample: ";setvar=NAME=value" -- repeatable, one channel variable each. */
  setvar: string[];
  /** iax.conf.sample: ";username=asterisk". */
  username?: string;
  /** iax.conf.sample: ";secret=markpasswd". A credential: the console writes it and
   *  never reads it back to any surface. Parsed only so a save cannot silently drop
   *  the line already in the file. */
  secret?: string;
}

export interface IaxView {
  general: IaxGeneralView;
  /** Every other `[name]` section, in file order. */
  peers: IaxPeerView[];
  readonly rest: ConfigValue;
}

const IAX_GENERAL_SCALAR_KEYS: ReadonlyArray<keyof Omit<IaxGeneralView, "bindaddr">> = [
  "bindport",
  "iaxcompat",
  "nochecksums",
  "delayreject",
  "amaflags",
  "bandwidth",
  "jitterbuffer",
  "maxjitterbuffer",
  "auth",
  "requirecalltoken",
];
export const IAX_AMAFLAGS = new Set(["default", "omit", "billing", "documentation"]);
export const IAX_BANDWIDTHS = new Set(["low", "medium", "high"]);
const IAX_AUTH_METHODS = new Set(["md5", "plaintext", "rsa"]);
export const IAX_TYPES = new Set(["user", "peer", "friend"]);

export function parseIax(value: ConfigValue): IaxView {
  const general = section(value, "general");
  const view: Omit<IaxGeneralView, "bindaddr"> & { bindaddr?: string[] } = {};
  for (const key of IAX_GENERAL_SCALAR_KEYS) {
    const v = entryValue(general, key);
    if (v !== undefined) view[key] = v;
  }
  const bindaddr = entryValues(general, "bindaddr");
  const peers = value
    .filter((candidate) => candidate.name.length > 0 && candidate.name !== "general")
    .map((peerSection) => ({
      name: peerSection.name,
      type: entryValue(peerSection, "type"),
      host: entryValue(peerSection, "host"),
      context: entryValues(peerSection, "context"),
      auth: entryValue(peerSection, "auth"),
      permit: entryValues(peerSection, "permit"),
      deny: entryValues(peerSection, "deny"),
      trunk: entryValue(peerSection, "trunk"),
      qualify: entryValue(peerSection, "qualify"),
      transfer: entryValue(peerSection, "transfer"),
      port: entryValue(peerSection, "port"),
      disallow: entryValues(peerSection, "disallow"),
      allow: entryValues(peerSection, "allow"),
      accountcode: entryValue(peerSection, "accountcode"),
      mailbox: entryValue(peerSection, "mailbox"),
      requirecalltoken: entryValue(peerSection, "requirecalltoken"),
      setvar: entryValues(peerSection, "setvar"),
      username: entryValue(peerSection, "username"),
      secret: entryValue(peerSection, "secret"),
    }));
  return { general: { ...view, bindaddr }, peers, rest: value };
}

export function validateIax(view: IaxView): Finding[] {
  const findings: Finding[] = [];
  for (const field of ["iaxcompat", "nochecksums", "delayreject", "jitterbuffer", "requirecalltoken"] as const) {
    const v = view.general[field];
    if (v !== undefined && !YES_NO.has(v)) {
      findings.push({ severity: "error", message: `IAX2 general ${field} must be yes or no.` });
    }
  }
  if (view.general.amaflags !== undefined && !IAX_AMAFLAGS.has(view.general.amaflags)) {
    findings.push({ severity: "error", message: "IAX2 general amaflags must be one of default, omit, billing, or documentation." });
  }
  if (view.general.bandwidth !== undefined && !IAX_BANDWIDTHS.has(view.general.bandwidth)) {
    findings.push({ severity: "error", message: "IAX2 general bandwidth must be low, medium, or high." });
  }
  if (view.general.auth !== undefined) {
    const invalid = view.general.auth.split(",").map((m) => m.trim()).filter((m) => m.length > 0 && !IAX_AUTH_METHODS.has(m));
    if (invalid.length > 0) {
      findings.push({ severity: "error", message: `IAX2 general auth lists an unsupported method: ${invalid.join(", ")}. Only md5, plaintext, and rsa are accepted.` });
    }
  }
  if (view.general.maxjitterbuffer !== undefined && !/^\d+$/u.test(view.general.maxjitterbuffer)) {
    findings.push({ severity: "error", message: "IAX2 general maxjitterbuffer must be a whole number of milliseconds." });
  }
  const names = new Set<string>();
  for (const peer of view.peers) {
    if (peer.type !== undefined && !IAX_TYPES.has(peer.type)) {
      findings.push({ severity: "error", message: `IAX2 [${peer.name}] type must be user, peer, or friend.` });
    }
    if (peer.qualify !== undefined && !YES_NO.has(peer.qualify)) {
      findings.push({ severity: "error", message: `IAX2 [${peer.name}] qualify must be yes or no.` });
    }
    if (peer.trunk !== undefined && !YES_NO.has(peer.trunk)) {
      findings.push({ severity: "error", message: `IAX2 [${peer.name}] trunk must be yes or no.` });
    }
    if (peer.auth !== undefined) {
      const invalid = peer.auth.split(",").map((m) => m.trim()).filter((m) => m.length > 0 && !IAX_AUTH_METHODS.has(m));
      if (invalid.length > 0) {
        findings.push({ severity: "error", message: `IAX2 [${peer.name}] auth lists an unsupported method: ${invalid.join(", ")}.` });
      }
    }
    // iax.conf.sample line 626/632: type=friend with host=dynamic and no permit/deny is a
    // realistic, sample-shown configuration (the "[guest]" style dynamic peer), so this is
    // a warning about exposure rather than an error.
    if ((peer.type === "peer" || peer.type === "friend") && peer.host === "dynamic" && peer.permit.length === 0 && peer.deny.length === 0) {
      findings.push({ severity: "warning", message: `IAX2 [${peer.name}] accepts registrations from a dynamic host with no permit/deny access control.` });
    }
    if (names.has(peer.name)) {
      findings.push({ severity: "warning", message: `IAX2 section [${peer.name}] is declared more than once; only entries after the first duplicate section header are distinguishable by name here.` });
    }
    names.add(peer.name);
  }
  return findings;
}

const IAX_GENERAL_MANAGED_KEYS: readonly string[] = [...IAX_GENERAL_SCALAR_KEYS, "bindaddr"];
const IAX_PEER_MANAGED_KEYS = ["type", "host", "context", "auth", "permit", "deny", "trunk", "qualify",
  "transfer", "port", "disallow", "allow", "accountcode", "mailbox", "requirecalltoken", "setvar",
  "username", "secret"] as const;

export function toConfigValueIax(view: IaxView): ConfigValue {
  const existingGeneral = section(view.rest, "general");
  const generalEntries = rebuildEntries(existingGeneral?.entries ?? [], IAX_GENERAL_MANAGED_KEYS, (key) => {
    if (key === "bindaddr") return view.general.bindaddr;
    const scalar = view.general[key as keyof Omit<IaxGeneralView, "bindaddr">];
    return scalar !== undefined ? [scalar] : [];
  });
  const replacements = new Map<string, ConfigSection>();
  replacements.set("general", { name: "general", entries: generalEntries });
  for (const peer of view.peers) {
    const existing = section(view.rest, peer.name);
    const entries = rebuildEntries(existing?.entries ?? [], IAX_PEER_MANAGED_KEYS, (key) => {
      switch (key) {
        case "context":
          return peer.context;
        case "permit":
          return peer.permit;
        case "deny":
          return peer.deny;
        case "type":
          return peer.type !== undefined ? [peer.type] : [];
        case "host":
          return peer.host !== undefined ? [peer.host] : [];
        case "auth":
          return peer.auth !== undefined ? [peer.auth] : [];
        case "trunk":
          return peer.trunk !== undefined ? [peer.trunk] : [];
        case "qualify":
          return peer.qualify !== undefined ? [peer.qualify] : [];
        case "disallow":
          return peer.disallow;
        case "allow":
          return peer.allow;
        case "setvar":
          return peer.setvar;
        case "transfer":
          return peer.transfer !== undefined ? [peer.transfer] : [];
        case "port":
          return peer.port !== undefined ? [peer.port] : [];
        case "accountcode":
          return peer.accountcode !== undefined ? [peer.accountcode] : [];
        case "mailbox":
          return peer.mailbox !== undefined ? [peer.mailbox] : [];
        case "requirecalltoken":
          return peer.requirecalltoken !== undefined ? [peer.requirecalltoken] : [];
        case "username":
          return peer.username !== undefined ? [peer.username] : [];
        case "secret":
          return peer.secret !== undefined ? [peer.secret] : [];
        default:
          return [];
      }
    });
    replacements.set(peer.name, { name: peer.name, entries });
  }
  return withSections(view.rest, replacements);
}

// ---------------------------------------------------------------------------------------
// PJSIP endpoints (pjsip.conf) -- an "endpoint" as edited here is the trio of
// same-named [name] sections res_pjsip.so uses to build one extension: type=endpoint
// (the dialable identity and its media/NAT/security policy), type=auth (the credential
// it authenticates with) and type=aor (where its registered contacts are tracked). All
// three share one [name] header by convention -- see configs/samples/pjsip.conf.sample
// lines 304-320 ([7000] used three times, once per type) -- which is the shape this
// editor creates, edits and deletes as one atomic identity rather than three unrelated
// sections a user could get out of sync.
//
// Every field below is cited to configs/samples/pjsip.conf.sample; a key that is only
// mentioned in passing (bundle, callgroup, pickupgroup, use_received_transport,
// min_expiry/max_expiry, message_context and rtcp_mux all are -- none of them appear as
// their own documented ;key=value line anywhere in that file) is left out rather than
// guessed at, even though an earlier pass of this catalog assumed they were present.
// ---------------------------------------------------------------------------------------

/** configs/samples/pjsip.conf.sample lines 680-908 (the [endpoint](!) template). */
export interface PjsipEndpointFields {
  /** line 662-663: "Dialplan context for inbound sessions". */
  context?: string;
  /** line 685: "Media Codec s to disallow". Repeatable in practice (disallow=all
   *  then one or more allow= lines), kept as an ordered list for symmetry with allow. */
  disallow: string[];
  /** line 653: "Media Codec s to allow" -- repeatable (sample lines 350-351 show two
   *  allow= lines on one endpoint). */
  allow: string[];
  /** line 685 region "transport=": "Explicit transport configuration to use". */
  transport?: string;
  /** line 686: "DTMF mode (default: rfc4733)". The sample does not enumerate the
   *  accepted values beyond the default; rfc4733/inband/info/auto/auto_info are the
   *  standard res_pjsip.so set and are offered here, but only rfc4733 is directly
   *  sample-verified. */
  dtmf_mode?: string;
  /** line 680-681: "Determines whether media may flow directly between endpoints". */
  direct_media?: string;
  /** line 87: "Enable the ICE mechanism to help traverse NAT". */
  ice_support?: string;
  /** line 145-146: "Determines whether res_pjsip will use and enforce usage of AVPF". */
  use_avpf?: string;
  /** line 147-149/358: "Determines whether res_pjsip will use and enforce usage of
   *  media encryption for this endpoint"; sample line 358 shows the value sdes. */
  media_encryption?: string;
  /** line 150-151: "Use encryption if possible but do not fail the call if not
   *  possible." */
  media_encryption_optimistic?: string;
  /** line 86: "Force use of return port (default: yes)". */
  force_rport?: string;
  /** line 119-120/417-419: "Allow Contact header to be rewritten with the source IP
   *  address port". */
  rewrite_contact?: string;
  /** line 121/417: "Enforce that RTP must be symmetric". */
  rtp_symmetric?: string;
  /** line 138-139: "Accept identification information received from this endpoint". */
  trust_id_inbound?: string;
  /** line 124: "Send the P Asserted Identity header". */
  send_pai?: string;
  /** configs/samples/pjsip.conf.sample line 650: "Allow support for RFC3262
   *  provisional ACK tags" -- no, required or yes; not a switch. */
  "100rel"?: string;
  /** line 88-101: "A comma-separated list of ways the Endpoint or AoR can be
   *  identified" -- username, auth_username, ip, header, request_uri. */
  identify_by?: string;
  /** line 105-107: "NOTIFY the endpoint when state changes for any of the specified
   *  mailboxes." */
  mailboxes?: string;
  /** line 107-108: "The voicemail extension to send in the NOTIFY Message-Account
   *  header". */
  voicemail_extension?: string;
  /** line 109-111: "An MWI subscribe will replace unsoliticed NOTIFYs". */
  mwi_subscribe_replaces_unsolicited?: string;
  /** line 47: "(default: yes)" -- aggregate MWI across mailboxes. */
  aggregate_mwi?: string;
  /** line 129-130: "Session timers for SIP packets". */
  timers?: string;
  /** line 127-128: "Minimum session timers expiration period". */
  timers_min_se?: string;
  /** line 735: "Maximum session timer expiration period". */
  timers_sess_expires?: string;
  /** "Send Connected Line updates to this endpoint". */
  send_connected_line?: string;
  /** "On outgoing requests, force the user portion of the Contact header". */
  contact_user?: string;
  /** "Domain to user in From header for requests to this endpoint". */
  from_domain?: string;
  /** "Username to use in From header for requests to this endpoint". */
  from_user?: string;
  /** "IP address used in SDP for media handling". */
  media_address?: string;
  /** "Whether T.38 UDPTL support is enabled or not". */
  t38_udptl?: string;
  /** "T.38 UDPTL error correction method": none, fec or redundancy. */
  t38_udptl_ec?: string;
  /** "Whether NAT support is enabled on UDPTL sessions". */
  t38_udptl_nat?: string;
  /** "T.38 UDPTL maximum datagram size". */
  t38_udptl_maxdatagram?: string;
  /** "Whether CNG tone detection is enabled". */
  fax_detect?: string;
  /** "Send private identification details to the endpoint" (trust outbound). */
  trust_id_outbound?: string;
  /** "Send the Remote-Party-ID header". */
  send_rpid?: string;
  /** "Send the Diversion header, conveying the diversion information". */
  send_diversion?: string;
  /** line 115-116: "Authentication object used for outbound requests". */
  outbound_auth?: string;
  /** line 117-118: "Proxy through which to send requests, a full SIP URI must be
   *  provided". */
  outbound_proxy?: string;
  /** line 238-240: "Hang up channel if RTP is not received for the specified
   *  number of seconds". */
  rtp_timeout?: string;
  /** line 241-242: same as above, while the channel is on hold. */
  rtp_timeout_hold?: string;
  /** line 659/597: "CallerID information for the endpoint", e.g. "My Name
   *  <8005551212>". */
  callerid?: string;
  /** line 165-166: "The number of in use channels which will cause busy to be
   *  reported". */
  device_state_busy_at?: string;
  /** line 308-309: "The maximum number of allowed negotiated audio streams". */
  max_audio_streams?: string;
  /** line 310-311: "The maximum number of allowed negotiated video streams". */
  max_video_streams?: string;
  /** line 299-300: "Whether to notifies all the progress details on blind
   *  transfer". */
  refer_blind_progress?: string;
  /** endpoint line 309/352/414: auth=<name> -- the auth object(s) this endpoint uses
   *  for INBOUND authentication challenges (comma-separated object names). */
  auth?: string;
  /** endpoint line 276/310/353: aors=<name> -- the AoR object(s) this endpoint's
   *  contacts register against (comma-separated object names). */
  aors?: string;
}

/** configs/samples/pjsip.conf.sample lines 457-500 (the [auth](!) template). */
export interface PjsipAuthFields {
  /** line 459-466: digest or google_oauth; digest is what a plain extension uses
   *  and is the only mechanism this editor exposes a full form for. */
  auth_type?: string;
  /** line 498: "Username to use for account (Required)". */
  username?: string;
  /** line 500: "PlainText password used for authentication". A real generated secret,
   *  never a fixed or guessed default -- see randomPjsipSecret below. */
  password?: string;
  /** line 474-475: "For incoming authentication (asterisk is the UAS)". */
  realm?: string;
}

/** configs/samples/pjsip.conf.sample lines 649-691 (the [aor](!) template). */
export interface PjsipAorFields {
  /** line 652: "Permanent contacts assigned to AoR" -- repeatable (sample lines
   *  284-285 show two contact= lines on one AoR). A statically-provisioned trunk
   *  uses this; a phone that registers itself leaves it empty. */
  contact: string[];
  /** line 662-664: "Maximum number of contacts that can bind to an AoR (default:
   *  0)" -- 0 means no registration is allowed at all, so a real extension needs
   *  at least 1. */
  max_contacts?: string;
  /** line 665-666: "Allow a registration to succeed by displacing any existing
   *  contact...". */
  remove_existing?: string;
  /** line 684-685: "Interval at which to qualify an AoR via OPTIONS requests
   *  (default: 0, disabled)". */
  qualify_frequency?: string;
  /** line 691-692: "Proxy through which to send OPTIONS requests". */
  outbound_proxy?: string;
  /** line 659-660: same key as the endpoint's, but scoped to the AoR per the
   *  sample's own separate [aor](!) template block. */
  voicemail_extension?: string;
}

export interface PjsipEndpointView {
  /** Shared [name] header across the endpoint/auth/aor trio. */
  name: string;
  /** Whether a type=endpoint section by this name already exists on the target
   *  (false for a not-yet-applied new endpoint being staged). */
  hasEndpoint: boolean;
  hasAuth: boolean;
  hasAor: boolean;
  endpoint: PjsipEndpointFields;
  auth: PjsipAuthFields;
  aor: PjsipAorFields;
}

export interface PjsipView {
  /** Every recognized endpoint identity, in first-appearance order. A [name] group
   *  is recognized as an endpoint identity only when at least one of its sections
   *  declares type=endpoint -- this deliberately excludes [transport-udp], [global],
   *  [system], ACLs, registrations and every other non-endpoint PJSIP object type,
   *  none of which this editor touches. */
  endpoints: PjsipEndpointView[];
  readonly rest: ConfigValue;
}

export const PJSIP_DTMF_MODES = new Set(["rfc4733", "inband", "info", "auto", "auto_info"]);
const PJSIP_IDENTIFY_BY = new Set(["username", "auth_username", "ip", "header", "request_uri"]);
export const PJSIP_MEDIA_ENCRYPTION = new Set(["no", "sdes", "dtls"]);
export const PJSIP_AUTH_TYPES = new Set(["digest", "google_oauth"]);
const PJSIP_MAX_CONTACTS_CEILING = 100; // CORE-EXT-015: Core's own documented ceiling.

function sectionsNamed(value: ConfigValue, name: string): ConfigSection[] {
  return value.filter((candidate) => candidate.name === name);
}

function sectionOfType(sections: ConfigSection[], type: string): ConfigSection | undefined {
  return sections.find((candidate) => entryValue(candidate, "type") === type);
}

export function parsePjsip(value: ConfigValue): PjsipView {
  const seen = new Set<string>();
  const endpoints: PjsipEndpointView[] = [];
  for (const candidate of value) {
    if (seen.has(candidate.name)) continue;
    const group = sectionsNamed(value, candidate.name);
    const endpointSection = sectionOfType(group, "endpoint");
    if (!endpointSection) continue; // not an endpoint identity -- leave for `rest`.
    seen.add(candidate.name);
    const authSection = sectionOfType(group, "auth");
    const aorSection = sectionOfType(group, "aor");
    endpoints.push({
      name: candidate.name,
      hasEndpoint: true,
      hasAuth: authSection !== undefined,
      hasAor: aorSection !== undefined,
      endpoint: {
        context: entryValue(endpointSection, "context"),
        disallow: entryValues(endpointSection, "disallow"),
        allow: entryValues(endpointSection, "allow"),
        transport: entryValue(endpointSection, "transport"),
        dtmf_mode: entryValue(endpointSection, "dtmf_mode"),
        direct_media: entryValue(endpointSection, "direct_media"),
        ice_support: entryValue(endpointSection, "ice_support"),
        use_avpf: entryValue(endpointSection, "use_avpf"),
        media_encryption: entryValue(endpointSection, "media_encryption"),
        media_encryption_optimistic: entryValue(endpointSection, "media_encryption_optimistic"),
        force_rport: entryValue(endpointSection, "force_rport"),
        rewrite_contact: entryValue(endpointSection, "rewrite_contact"),
        rtp_symmetric: entryValue(endpointSection, "rtp_symmetric"),
        trust_id_inbound: entryValue(endpointSection, "trust_id_inbound"),
        send_pai: entryValue(endpointSection, "send_pai"),
        "100rel": entryValue(endpointSection, "100rel"),
        identify_by: entryValue(endpointSection, "identify_by"),
        mailboxes: entryValue(endpointSection, "mailboxes"),
        voicemail_extension: entryValue(endpointSection, "voicemail_extension"),
        mwi_subscribe_replaces_unsolicited: entryValue(endpointSection, "mwi_subscribe_replaces_unsolicited"),
        aggregate_mwi: entryValue(endpointSection, "aggregate_mwi"),
        timers: entryValue(endpointSection, "timers"),
        timers_min_se: entryValue(endpointSection, "timers_min_se"),
        timers_sess_expires: entryValue(endpointSection, "timers_sess_expires"),
        send_connected_line: entryValue(endpointSection, "send_connected_line"),
        contact_user: entryValue(endpointSection, "contact_user"),
        from_domain: entryValue(endpointSection, "from_domain"),
        from_user: entryValue(endpointSection, "from_user"),
        media_address: entryValue(endpointSection, "media_address"),
        t38_udptl: entryValue(endpointSection, "t38_udptl"),
        t38_udptl_ec: entryValue(endpointSection, "t38_udptl_ec"),
        t38_udptl_nat: entryValue(endpointSection, "t38_udptl_nat"),
        t38_udptl_maxdatagram: entryValue(endpointSection, "t38_udptl_maxdatagram"),
        fax_detect: entryValue(endpointSection, "fax_detect"),
        trust_id_outbound: entryValue(endpointSection, "trust_id_outbound"),
        send_rpid: entryValue(endpointSection, "send_rpid"),
        send_diversion: entryValue(endpointSection, "send_diversion"),
        outbound_auth: entryValue(endpointSection, "outbound_auth"),
        outbound_proxy: entryValue(endpointSection, "outbound_proxy"),
        rtp_timeout: entryValue(endpointSection, "rtp_timeout"),
        rtp_timeout_hold: entryValue(endpointSection, "rtp_timeout_hold"),
        callerid: entryValue(endpointSection, "callerid"),
        device_state_busy_at: entryValue(endpointSection, "device_state_busy_at"),
        max_audio_streams: entryValue(endpointSection, "max_audio_streams"),
        max_video_streams: entryValue(endpointSection, "max_video_streams"),
        refer_blind_progress: entryValue(endpointSection, "refer_blind_progress"),
        auth: entryValue(endpointSection, "auth"),
        aors: entryValue(endpointSection, "aors"),
      },
      auth: {
        auth_type: entryValue(authSection, "auth_type"),
        username: entryValue(authSection, "username"),
        password: entryValue(authSection, "password"),
        realm: entryValue(authSection, "realm"),
      },
      aor: {
        contact: entryValues(aorSection, "contact"),
        max_contacts: entryValue(aorSection, "max_contacts"),
        remove_existing: entryValue(aorSection, "remove_existing"),
        qualify_frequency: entryValue(aorSection, "qualify_frequency"),
        outbound_proxy: entryValue(aorSection, "outbound_proxy"),
        voicemail_extension: entryValue(aorSection, "voicemail_extension"),
      },
    });
  }
  return { endpoints, rest: value };
}

export function validatePjsip(view: PjsipView): Finding[] {
  const findings: Finding[] = [];
  const names = new Set<string>();
  const BOOL_ENDPOINT_FIELDS = [
    "direct_media", "ice_support", "use_avpf", "media_encryption_optimistic",
    "force_rport", "rewrite_contact", "rtp_symmetric", "trust_id_inbound", "send_pai",
    "mwi_subscribe_replaces_unsolicited", "aggregate_mwi", "timers",
  ] as const;
  for (const ep of view.endpoints) {
    if (ep.name.trim().length === 0) {
      findings.push({ severity: "error", message: "PJSIP endpoint name must not be empty." });
    }
    if (names.has(ep.name)) {
      findings.push({ severity: "error", message: `PJSIP endpoint [${ep.name}] is declared more than once.` });
    }
    names.add(ep.name);
    for (const field of BOOL_ENDPOINT_FIELDS) {
      const v = ep.endpoint[field];
      if (v !== undefined && !YES_NO.has(v)) {
        findings.push({ severity: "error", message: `PJSIP [${ep.name}] ${field} must be yes or no.` });
      }
    }
    if (ep.endpoint.dtmf_mode !== undefined && !PJSIP_DTMF_MODES.has(ep.endpoint.dtmf_mode)) {
      findings.push({ severity: "error", message: `PJSIP [${ep.name}] dtmf_mode must be one of ${[...PJSIP_DTMF_MODES].join(", ")}.` });
    }
    if (ep.endpoint.media_encryption !== undefined && !PJSIP_MEDIA_ENCRYPTION.has(ep.endpoint.media_encryption)) {
      findings.push({ severity: "error", message: `PJSIP [${ep.name}] media_encryption must be no, sdes, or dtls.` });
    }
    if (ep.endpoint.identify_by !== undefined) {
      const invalid = ep.endpoint.identify_by.split(",").map((m) => m.trim()).filter((m) => m.length > 0 && !PJSIP_IDENTIFY_BY.has(m));
      if (invalid.length > 0) {
        findings.push({ severity: "error", message: `PJSIP [${ep.name}] identify_by lists an unsupported method: ${invalid.join(", ")}.` });
      }
    }
    if (ep.endpoint.context === undefined || ep.endpoint.context.trim().length === 0) {
      findings.push({ severity: "warning", message: `PJSIP [${ep.name}] has no context; inbound calls have nowhere to route to.` });
    }
    if (ep.endpoint.disallow.length === 0 && ep.endpoint.allow.length === 0) {
      findings.push({ severity: "warning", message: `PJSIP [${ep.name}] does not restrict codecs (no disallow/allow); this is unusual outside the sample's trunk templates.` });
    }
    if (ep.hasAuth) {
      if (ep.auth.auth_type !== undefined && !PJSIP_AUTH_TYPES.has(ep.auth.auth_type)) {
        findings.push({ severity: "error", message: `PJSIP [${ep.name}] auth_type must be digest or google_oauth.` });
      }
      if (ep.auth.auth_type === "digest" || ep.auth.auth_type === undefined) {
        if (ep.auth.username === undefined || ep.auth.username.trim().length === 0) {
          findings.push({ severity: "error", message: `PJSIP [${ep.name}] auth username is required.` });
        }
        if (ep.auth.password === undefined || ep.auth.password.trim().length === 0) {
          findings.push({ severity: "error", message: `PJSIP [${ep.name}] auth password is required.` });
        }
      }
    } else {
      findings.push({ severity: "warning", message: `PJSIP [${ep.name}] has no auth object; the endpoint cannot authenticate inbound registrations or calls.` });
    }
    if (ep.hasAor) {
      if (ep.aor.max_contacts !== undefined) {
        if (!/^\d+$/u.test(ep.aor.max_contacts)) {
          findings.push({ severity: "error", message: `PJSIP [${ep.name}] AoR max_contacts must be a whole number.` });
        } else if (Number(ep.aor.max_contacts) > PJSIP_MAX_CONTACTS_CEILING) {
          findings.push({ severity: "error", message: `PJSIP [${ep.name}] AoR max_contacts exceeds the Core ceiling of ${PJSIP_MAX_CONTACTS_CEILING}.` });
        } else if (Number(ep.aor.max_contacts) === 0 && ep.aor.contact.length === 0) {
          findings.push({ severity: "warning", message: `PJSIP [${ep.name}] AoR allows 0 contacts and has no static contact; nothing can ever register to it.` });
        }
      }
      if (ep.aor.remove_existing !== undefined && !YES_NO.has(ep.aor.remove_existing)) {
        findings.push({ severity: "error", message: `PJSIP [${ep.name}] AoR remove_existing must be yes or no.` });
      }
      if (ep.aor.qualify_frequency !== undefined && !/^\d+$/u.test(ep.aor.qualify_frequency)) {
        findings.push({ severity: "error", message: `PJSIP [${ep.name}] AoR qualify_frequency must be a whole number of seconds.` });
      }
    } else {
      findings.push({ severity: "warning", message: `PJSIP [${ep.name}] has no AoR; nothing can register or be dialed for this endpoint.` });
    }
  }
  return findings;
}

const PJSIP_ENDPOINT_MANAGED_KEYS: readonly string[] = [
  "type", "context", "disallow", "allow", "transport", "dtmf_mode", "direct_media",
  "ice_support", "use_avpf", "media_encryption", "media_encryption_optimistic",
  "force_rport", "rewrite_contact", "rtp_symmetric", "trust_id_inbound", "send_pai", "100rel",
  "identify_by", "mailboxes", "voicemail_extension", "mwi_subscribe_replaces_unsolicited",
  "aggregate_mwi", "timers", "timers_min_se", "timers_sess_expires",
  "outbound_auth", "outbound_proxy",
  "rtp_timeout", "rtp_timeout_hold", "callerid", "device_state_busy_at",
  "max_audio_streams", "max_video_streams", "refer_blind_progress",
  "send_connected_line", "contact_user", "from_domain", "from_user", "media_address", "t38_udptl", "t38_udptl_ec", "t38_udptl_nat", "t38_udptl_maxdatagram", "fax_detect", "trust_id_outbound", "send_rpid", "send_diversion",
  "auth", "aors",
];
const PJSIP_AUTH_MANAGED_KEYS: readonly string[] = ["type", "auth_type", "username", "password", "realm"];
const PJSIP_AOR_MANAGED_KEYS: readonly string[] = [
  "type", "contact", "max_contacts", "remove_existing", "qualify_frequency",
  "outbound_proxy", "voicemail_extension",
];

function endpointFieldValues(key: string, endpoint: PjsipEndpointFields): readonly string[] {
  switch (key) {
    case "type": return ["endpoint"];
    case "disallow": return endpoint.disallow;
    case "allow": return endpoint.allow;
    default: {
      const scalar = (endpoint as unknown as Record<string, string | undefined>)[key];
      return scalar !== undefined ? [scalar] : [];
    }
  }
}

function authFieldValues(key: string, auth: PjsipAuthFields): readonly string[] {
  if (key === "type") return ["auth"];
  const scalar = (auth as Record<string, string | undefined>)[key];
  return scalar !== undefined ? [scalar] : [];
}

function aorFieldValues(key: string, aor: PjsipAorFields): readonly string[] {
  switch (key) {
    case "type": return ["aor"];
    case "contact": return aor.contact;
    default: {
      const scalar = (aor as unknown as Record<string, string | undefined>)[key];
      return scalar !== undefined ? [scalar] : [];
    }
  }
}

/**
 * Renders the full desired pjsip.conf ConfigValue. Every section this parser
 * recognized as belonging to an endpoint identity (i.e. every [name] group that had
 * a type=endpoint section, per parsePjsip) is dropped from the original file and
 * replaced with exactly the trio each surviving view.endpoints entry describes --
 * so removing an entry from view.endpoints deletes its endpoint/auth/aor sections,
 * and every section this model does not recognize (transports, [global], ACLs,
 * registrations, [system], and so on) passes through untouched.
 */
export function toConfigValuePjsip(view: PjsipView): ConfigValue {
  const recognizedNames = new Set(parsePjsip(view.rest).endpoints.map((e) => e.name));
  const byName = new Map(view.endpoints.map((ep) => [ep.name, ep] as const));

  function rebuiltTrioFor(ep: PjsipEndpointView): ConfigSection[] {
    const original = sectionsNamed(view.rest, ep.name);
    const originalEndpoint = sectionOfType(original, "endpoint");
    const originalAuth = sectionOfType(original, "auth");
    const originalAor = sectionOfType(original, "aor");
    const trio: ConfigSection[] = [
      {
        name: ep.name,
        entries: rebuildEntries(originalEndpoint?.entries ?? [], PJSIP_ENDPOINT_MANAGED_KEYS, (key) => endpointFieldValues(key, ep.endpoint)),
      },
    ];
    if (ep.hasAuth) {
      trio.push({
        name: ep.name,
        entries: rebuildEntries(originalAuth?.entries ?? [], PJSIP_AUTH_MANAGED_KEYS, (key) => authFieldValues(key, ep.auth)),
      });
    }
    if (ep.hasAor) {
      trio.push({
        name: ep.name,
        entries: rebuildEntries(originalAor?.entries ?? [], PJSIP_AOR_MANAGED_KEYS, (key) => aorFieldValues(key, ep.aor)),
      });
    }
    return trio;
  }

  // Preserve the position of every unrecognized section exactly, and replace the whole
  // endpoint/auth/aor trio in-place at the position its first section appeared -- so a
  // no-change round trip renders byte-identical output rather than reordering endpoints
  // to the end of the file.
  const result: ConfigSection[] = [];
  const emittedEndpoint = new Set<string>();
  for (const s of view.rest) {
    if (recognizedNames.has(s.name)) {
      if (emittedEndpoint.has(s.name)) continue;
      emittedEndpoint.add(s.name);
      const ep = byName.get(s.name);
      if (ep) result.push(...rebuiltTrioFor(ep));
      continue;
    }
    result.push(s);
  }
  // Endpoints that did not exist on `view.rest` at all (brand-new, staged additions)
  // are appended at the end, in the order they appear in `view.endpoints`.
  for (const ep of view.endpoints) {
    if (recognizedNames.has(ep.name)) continue;
    result.push(...rebuiltTrioFor(ep));
  }
  return result;
}

/**
 * A real random PJSIP auth secret -- 24 bytes of crypto.getRandomValues rendered as
 * hex, the same shape onboarding.ts's randomSecret() already uses for the "super
 * easy" deploy's generated PJSIP passwords. Never a fixed or guessed default: callers
 * must show it to the operator exactly once (so the phone can be provisioned) and must
 * keep it out of the plan the user reviews, out of logs, out of exports and out of any
 * capture, per this catalog's adoption rules.
 */
export function randomPjsipSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Builds a brand-new endpoint identity with sane, sample-cited defaults, ready to be
 *  pushed through toConfigValuePjsip. The generated secret is returned separately
 *  (secret) so a caller can show it once without it ever living in `view` longer
 *  than the single apply that needs it. */
export function newPjsipEndpoint(name: string, context: string): { view: PjsipEndpointView; secret: string } {
  const secret = randomPjsipSecret();
  return {
    secret,
    view: {
      name,
      hasEndpoint: true,
      hasAuth: true,
      hasAor: true,
      endpoint: {
        context,
        disallow: ["all"],
        allow: ["ulaw", "alaw"],
        dtmf_mode: "rfc4733",
        direct_media: "no",
        force_rport: "yes",
        rewrite_contact: "yes",
        rtp_symmetric: "yes",
        auth: name,
        aors: name,
      },
      auth: {
        auth_type: "digest",
        username: name,
        password: secret,
      },
      aor: {
        contact: [],
        max_contacts: "1",
        remove_existing: "yes",
      },
    },
  };
}
