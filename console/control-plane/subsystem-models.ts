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
const FAX_RATES = new Set(["2400", "4800", "7200", "9600", "12000", "14400"]);
const FAX_MODEMS = new Set(["v17", "v27", "v29"]);

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
const IAX_AMAFLAGS = new Set(["default", "omit", "billing", "documentation"]);
const IAX_BANDWIDTHS = new Set(["low", "medium", "high"]);
const IAX_AUTH_METHODS = new Set(["md5", "plaintext", "rsa"]);
const IAX_TYPES = new Set(["user", "peer", "friend"]);

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
const IAX_PEER_MANAGED_KEYS = ["type", "host", "context", "auth", "permit", "deny", "trunk", "qualify"] as const;

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
        default:
          return [];
      }
    });
    replacements.set(peer.name, { name: peer.name, entries });
  }
  return withSections(view.rest, replacements);
}
