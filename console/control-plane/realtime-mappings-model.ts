/**
 * A pure model of the two "the KEY is itself a name someone chose" Asterisk files this
 * console edits without `control-keys.ts`'s `CONTROL_BINDINGS` table: `extconfig.conf`'s
 * realtime/static family mappings and `sorcery.conf`'s object-type mappings.
 *
 * Neither shape fits `sectionFrom` (a SECTION named by another control's current value,
 * the mechanism the Security screen's PJSIP-transport TLS fields use): `extconfig.conf`
 * always writes into one fixed `[settings]` section and varies the KEY instead
 * (`configs/samples/extconfig.conf.sample`: "file.conf => driver,database[,table[,priority]]",
 * "ps_endpoints => odbc,asterisk"), and `sorcery.conf`'s per-module section varies but its
 * mapping's own VALUE is two people-facing fields joined by a comma -- driver/database/
 * table/priority, or wizard/wizard-configuration -- more than `control-keys.ts`'s
 * `composite` mechanism (built for exactly two halves and one separator, already carrying
 * `tlsbindaddr`) was designed for. This mirrors `control-plane/acl-model.ts` instead: a
 * pure, hand-checked model of the file's real shape, with the read/edit/write loop left to
 * the caller (`App.tsx`, over the same `pbx.plan`/`pbx.apply` transaction every other write
 * in this console uses).
 *
 * `configs/samples/sorcery.conf.sample`'s own format line: "object type [/options] = wizard
 * name, wizard configuration data" -- e.g. `endpoint=realtime,ps_endpoints`, or `test/cache
 * =test` for a caching wizard. The "/options" suffix (only "/cache" is documented) is part
 * of the KEY's own spelling, not a separate field, so it travels with the object-type string
 * verbatim rather than being parsed out here.
 */
import type { ConfigSection, ConfigValue } from "./wsl-config-transport.js";

/** A family or object-type name safe to write as a literal, single-line config key -- the
 *  same charset `control-keys.ts`'s own `usableSectionName` refuses to widen, because this
 *  becomes a literal key in the file and a bracket or newline in it could break the line
 *  it lands in or open a new section nobody asked for. */
const NAME_PATTERN = /^[A-Za-z0-9_/-]{1,79}$/u;

export function usableMappingName(value: unknown): string | undefined {
  return typeof value === "string" && NAME_PATTERN.test(value) ? value : undefined;
}

/* ------------------------------------------------------------------------------------
 * Generic entry access -- shared by both files below, since each is ultimately "one
 * value, at one key, inside one named section" once the value's own shape is peeled off.
 * ------------------------------------------------------------------------------------ */

/** The raw string at `section`/`key`, or `undefined` if either is missing. First match
 *  wins, exactly as `configuration.ts`'s `entryValue` and Asterisk's own parser do. */
export function findEntry(value: ConfigValue, section: string, key: string): string | undefined {
  const sec = value.find((candidate) => candidate.name === section);
  return sec?.entries.find((candidate) => candidate.key === key)?.value;
}

/** Order-preserving: replaces the entry in place when the key already exists, appends it
 *  (creating the section, appended to the file, if it does not exist yet) otherwise --
 *  the same rule `control-keys.ts`'s `applyControlValues` already follows for every other
 *  binding in this console. */
export function writeEntry(value: ConfigValue, section: string, key: string, raw: string): ConfigValue {
  const sections: ConfigSection[] = value.map((sec) => ({ name: sec.name, entries: [...sec.entries] }));
  let sec = sections.find((candidate) => candidate.name === section);
  if (!sec) {
    sec = { name: section, entries: [] };
    sections.push(sec);
  }
  const entries = sec.entries as { key: string; value: string }[];
  const idx = entries.findIndex((candidate) => candidate.key === key);
  if (idx === -1) entries.push({ key, value: raw });
  else entries[idx] = { key, value: raw };
  return sections;
}

/** Removes the entry, leaving every other section and key exactly as it was. A no-op,
 *  returning an equal-by-value result, when `section`/`key` do not exist -- refusing to
 *  guess which entry a caller might have meant, the same "refuse rather than guess" rule
 *  `acl-model.ts`'s own mutation functions follow. */
export function removeEntry(value: ConfigValue, section: string, key: string): ConfigValue {
  return value.map((sec) => (
    sec.name === section
      ? { name: sec.name, entries: sec.entries.filter((entry) => entry.key !== key) }
      : sec
  ));
}

/* ------------------------------------------------------------------------------------
 * extconfig.conf -- configs/samples/extconfig.conf.sample, [settings] section:
 *   "file.conf => driver,database[,table[,priority]]"
 *   "maps a particular configuration file to the given database driver, database and
 *    table (or uses the name of the file as the table if not specified)"
 * Realtime family mappings use the identical shape one line further down the same
 * section ("ps_endpoints => odbc,asterisk"). Both are one comma-joined value at one key
 * inside [settings]; this module does not distinguish "static file" from "realtime
 * family" because the file itself does not -- only the key's own spelling does.
 * ------------------------------------------------------------------------------------ */

export const EXTCONFIG_SECTION = "settings";

export interface RealtimeMapping {
  driver: string;
  database: string;
  table?: string;
  priority?: number;
}

/** Parses one `driver,database[,table[,priority]]` value. `undefined` when driver or
 *  database -- the two fields the sample documents as always required -- are missing,
 *  since a value with neither means nothing to Asterisk's own config loader either. */
export function parseRealtimeMappingValue(raw: string): RealtimeMapping | undefined {
  const parts = raw.split(",").map((part) => part.trim());
  const [driver, database, table, priorityRaw] = parts;
  if (!driver || !database) return undefined;
  const mapping: RealtimeMapping = { driver, database };
  if (table) mapping.table = table;
  if (priorityRaw) {
    const priority = Number(priorityRaw);
    if (Number.isFinite(priority)) mapping.priority = priority;
  }
  return mapping;
}

/** The inverse of `parseRealtimeMappingValue`. A priority is written only once a table
 *  is present: the sample's own format is strictly positional
 *  (`driver,database,table,priority`), so a priority with no table would land in the
 *  table's own slot and silently rename the table to a number instead of being skipped. */
export function formatRealtimeMappingValue(mapping: RealtimeMapping): string {
  const parts = [mapping.driver.trim(), mapping.database.trim()];
  const table = mapping.table?.trim();
  if (table) {
    parts.push(table);
    if (mapping.priority !== undefined && mapping.priority > 0) parts.push(String(mapping.priority));
  }
  return parts.join(",");
}

export function findRealtimeMapping(value: ConfigValue, family: string): RealtimeMapping | undefined {
  const raw = findEntry(value, EXTCONFIG_SECTION, family);
  return raw === undefined ? undefined : parseRealtimeMappingValue(raw);
}

export function writeRealtimeMapping(value: ConfigValue, family: string, mapping: RealtimeMapping): ConfigValue {
  return writeEntry(value, EXTCONFIG_SECTION, family, formatRealtimeMappingValue(mapping));
}

export function removeRealtimeMapping(value: ConfigValue, family: string): ConfigValue {
  return removeEntry(value, EXTCONFIG_SECTION, family);
}

/* ------------------------------------------------------------------------------------
 * sorcery.conf -- configs/samples/sorcery.conf.sample:
 *   "[module-name]" section, then "object type [/options] = wizard name, wizard
 *    configuration data" -- e.g. "endpoint=realtime,ps_endpoints", "test=memory",
 *    "test/cache=test".
 * ------------------------------------------------------------------------------------ */

export interface SorceryMapping {
  wizard: string;
  /** The wizard's own configuration data -- a filename for the `config` wizard, a
   *  realtime family for the `realtime` wizard, absent entirely for `memory`. */
  config?: string;
}

/** Parses one `wizard[,config]` value. `undefined` when the wizard name -- the one part
 *  every documented example carries -- is missing. */
export function parseSorceryMappingValue(raw: string): SorceryMapping | undefined {
  const at = raw.indexOf(",");
  const wizard = (at < 0 ? raw : raw.slice(0, at)).trim();
  if (!wizard) return undefined;
  const config = at < 0 ? undefined : raw.slice(at + 1).trim();
  return config ? { wizard, config } : { wizard };
}

export function formatSorceryMappingValue(mapping: SorceryMapping): string {
  const config = mapping.config?.trim();
  return config ? `${mapping.wizard.trim()},${config}` : mapping.wizard.trim();
}

export function findSorceryMapping(value: ConfigValue, module: string, objectType: string): SorceryMapping | undefined {
  const raw = findEntry(value, module, objectType);
  return raw === undefined ? undefined : parseSorceryMappingValue(raw);
}

export function writeSorceryMapping(
  value: ConfigValue, module: string, objectType: string, mapping: SorceryMapping,
): ConfigValue {
  return writeEntry(value, module, objectType, formatSorceryMappingValue(mapping));
}

export function removeSorceryMapping(value: ConfigValue, module: string, objectType: string): ConfigValue {
  return removeEntry(value, module, objectType);
}
