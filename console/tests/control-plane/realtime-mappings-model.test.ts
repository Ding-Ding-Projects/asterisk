import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EXTCONFIG_SECTION,
  findEntry,
  findRealtimeMapping,
  findSorceryMapping,
  formatRealtimeMappingValue,
  formatSorceryMappingValue,
  parseRealtimeMappingValue,
  parseSorceryMappingValue,
  removeEntry,
  removeRealtimeMapping,
  removeSorceryMapping,
  usableMappingName,
  writeEntry,
  writeRealtimeMapping,
  writeSorceryMapping,
} from "../../control-plane/realtime-mappings-model.js";
import type { ConfigValue } from "../../control-plane/wsl-config-transport.js";

// ---------------------------------------------------------------- usableMappingName

test("usableMappingName accepts the safe charset and rejects everything else", () => {
  for (const good of ["ps_endpoints", "queues_conf", "endpoint/cache", "a", "A-Z_0-9"]) {
    assert.equal(usableMappingName(good), good, `expected "${good}" to be accepted`);
  }
  for (const bad of ["", "has space", "bracket]", "semi;colon", "new\nline", 42, undefined, null]) {
    assert.equal(usableMappingName(bad), undefined, `expected ${JSON.stringify(bad)} to be refused`);
  }
});

// ---------------------------------------------------------------- generic entry access

test("findEntry / writeEntry / removeEntry round-trip through an arbitrary section and key", () => {
  const empty: ConfigValue = [];
  const written = writeEntry(empty, "settings", "ps_endpoints", "odbc,asterisk");
  assert.equal(findEntry(written, "settings", "ps_endpoints"), "odbc,asterisk");

  const updated = writeEntry(written, "settings", "ps_endpoints", "odbc,asterisk,ast_config,1");
  assert.equal(findEntry(updated, "settings", "ps_endpoints"), "odbc,asterisk,ast_config,1");
  // The section was not duplicated -- still exactly one [settings] block.
  assert.equal(updated.filter((s) => s.name === "settings").length, 1);

  const removed = removeEntry(updated, "settings", "ps_endpoints");
  assert.equal(findEntry(removed, "settings", "ps_endpoints"), undefined);
});

test("writeEntry preserves every unrelated section and entry exactly", () => {
  const cfg: ConfigValue = [
    { name: "settings", entries: [{ key: "queues.conf", value: "odbc,asterisk,ast_config" }] },
    { name: "unrelated", entries: [{ key: "k", value: "v" }] },
  ];
  const next = writeEntry(cfg, "settings", "ps_endpoints", "odbc,asterisk");
  assert.deepEqual(next[0].entries, [
    { key: "queues.conf", value: "odbc,asterisk,ast_config" },
    { key: "ps_endpoints", value: "odbc,asterisk" },
  ]);
  assert.deepEqual(next[1], { name: "unrelated", entries: [{ key: "k", value: "v" }] });
});

test("removeEntry on a missing section or key is a no-op, not a guess", () => {
  const cfg: ConfigValue = [{ name: "settings", entries: [{ key: "ps_endpoints", value: "odbc,asterisk" }] }];
  assert.deepEqual(removeEntry(cfg, "settings", "no_such_family"), cfg);
  assert.deepEqual(removeEntry(cfg, "no_such_section", "ps_endpoints"), cfg);
});

// ---------------------------------------------------------------- extconfig.conf

test("parseRealtimeMappingValue: configs/samples/extconfig.conf.sample's own examples", () => {
  // "example => odbc,asterisk,alttable,1"
  assert.deepEqual(parseRealtimeMappingValue("odbc,asterisk,alttable,1"), {
    driver: "odbc", database: "asterisk", table: "alttable", priority: 1,
  });
  // "ps_endpoints => odbc,asterisk" -- no table, no priority.
  assert.deepEqual(parseRealtimeMappingValue("odbc,asterisk"), { driver: "odbc", database: "asterisk" });
  // "meetme => mysql,general"
  assert.deepEqual(parseRealtimeMappingValue("mysql,general"), { driver: "mysql", database: "general" });
});

test("parseRealtimeMappingValue tolerates surrounding whitespace, the same way the parser trims key/value", () => {
  assert.deepEqual(parseRealtimeMappingValue(" odbc , asterisk , ast_config "), {
    driver: "odbc", database: "asterisk", table: "ast_config",
  });
});

test("parseRealtimeMappingValue refuses a value with no driver or no database", () => {
  assert.equal(parseRealtimeMappingValue(""), undefined);
  assert.equal(parseRealtimeMappingValue("odbc"), undefined);
  assert.equal(parseRealtimeMappingValue(",asterisk"), undefined);
});

test("formatRealtimeMappingValue round-trips every arity the sample documents", () => {
  assert.equal(formatRealtimeMappingValue({ driver: "odbc", database: "asterisk" }), "odbc,asterisk");
  assert.equal(
    formatRealtimeMappingValue({ driver: "odbc", database: "asterisk", table: "ast_config" }),
    "odbc,asterisk,ast_config",
  );
  assert.equal(
    formatRealtimeMappingValue({ driver: "odbc", database: "asterisk", table: "ast_config", priority: 1 }),
    "odbc,asterisk,ast_config,1",
  );
});

test("formatRealtimeMappingValue never writes a priority with no table -- it would land in the table's own slot", () => {
  // extconfig.conf's format is strictly positional: driver,database,table,priority. A
  // priority with no table would silently become the table's own value instead of being
  // skipped, which is worse than dropping it -- Asterisk would read a number as a table
  // name rather than refusing the line.
  assert.equal(formatRealtimeMappingValue({ driver: "odbc", database: "asterisk", priority: 1 }), "odbc,asterisk");
});

test("a real family mapping round-trips through find/write/remove exactly", () => {
  let cfg: ConfigValue = [];
  cfg = writeRealtimeMapping(cfg, "ps_endpoints", { driver: "odbc", database: "asterisk" });
  assert.equal(findEntry(cfg, EXTCONFIG_SECTION, "ps_endpoints"), "odbc,asterisk");
  assert.deepEqual(findRealtimeMapping(cfg, "ps_endpoints"), { driver: "odbc", database: "asterisk" });

  // Editing one family leaves a second, unrelated one exactly as it was.
  cfg = writeRealtimeMapping(cfg, "ps_auths", { driver: "odbc", database: "asterisk", table: "ps_auths" });
  cfg = writeRealtimeMapping(cfg, "ps_endpoints", { driver: "pgsql", database: "asterisk" });
  assert.deepEqual(findRealtimeMapping(cfg, "ps_endpoints"), { driver: "pgsql", database: "asterisk" });
  assert.deepEqual(findRealtimeMapping(cfg, "ps_auths"), { driver: "odbc", database: "asterisk", table: "ps_auths" });

  cfg = removeRealtimeMapping(cfg, "ps_endpoints");
  assert.equal(findRealtimeMapping(cfg, "ps_endpoints"), undefined);
  assert.deepEqual(findRealtimeMapping(cfg, "ps_auths"), { driver: "odbc", database: "asterisk", table: "ps_auths" });
});

test("findRealtimeMapping reports undefined for a family that has never been mapped", () => {
  const cfg: ConfigValue = [{ name: EXTCONFIG_SECTION, entries: [{ key: "ps_endpoints", value: "odbc,asterisk" }] }];
  assert.equal(findRealtimeMapping(cfg, "queues"), undefined);
});

// ---------------------------------------------------------------- sorcery.conf

test("parseSorceryMappingValue: configs/samples/sorcery.conf.sample's own examples", () => {
  assert.deepEqual(parseSorceryMappingValue("memory"), { wizard: "memory" });          // "bob = memory"
  assert.deepEqual(parseSorceryMappingValue("config,joe.conf"), { wizard: "config", config: "joe.conf" }); // "joe = config,joe.conf"
  assert.deepEqual(parseSorceryMappingValue("realtime,ps_endpoints"), { wizard: "realtime", config: "ps_endpoints" }); // "endpoint=realtime,ps_endpoints"
  assert.deepEqual(parseSorceryMappingValue("astdb,mwi_external"), { wizard: "astdb", config: "mwi_external" }); // "mailboxes=astdb,mwi_external"
  assert.deepEqual(parseSorceryMappingValue("test"), { wizard: "test" }); // "test/cache=test"
});

test("parseSorceryMappingValue refuses a value with no wizard name", () => {
  assert.equal(parseSorceryMappingValue(""), undefined);
  assert.equal(parseSorceryMappingValue(","), undefined);
});

test("formatSorceryMappingValue round-trips with and without wizard configuration", () => {
  assert.equal(formatSorceryMappingValue({ wizard: "memory" }), "memory");
  assert.equal(formatSorceryMappingValue({ wizard: "realtime", config: "ps_endpoints" }), "realtime,ps_endpoints");
});

test("a real object-type mapping round-trips through find/write/remove, scoped to its own module section", () => {
  let cfg: ConfigValue = [];
  cfg = writeSorceryMapping(cfg, "res_pjsip", "endpoint", { wizard: "realtime", config: "ps_endpoints" });
  cfg = writeSorceryMapping(cfg, "res_pjsip", "auth", { wizard: "realtime", config: "ps_auths" });
  cfg = writeSorceryMapping(cfg, "res_pjsip_endpoint_identifier_ip", "identify", { wizard: "realtime", config: "ps_endpoint_id_ips" });

  assert.deepEqual(findSorceryMapping(cfg, "res_pjsip", "endpoint"), { wizard: "realtime", config: "ps_endpoints" });
  assert.deepEqual(findSorceryMapping(cfg, "res_pjsip", "auth"), { wizard: "realtime", config: "ps_auths" });
  assert.deepEqual(
    findSorceryMapping(cfg, "res_pjsip_endpoint_identifier_ip", "identify"),
    { wizard: "realtime", config: "ps_endpoint_id_ips" },
  );

  // The "/cache" suffix is part of the object type's own spelling (sorcery.conf.sample:
  // "test/cache=test"), not a separate field -- writing "endpoint/cache" must not disturb
  // the plain "endpoint" mapping already in the same section.
  cfg = writeSorceryMapping(cfg, "res_pjsip", "endpoint/cache", { wizard: "memory" });
  assert.deepEqual(findSorceryMapping(cfg, "res_pjsip", "endpoint"), { wizard: "realtime", config: "ps_endpoints" });
  assert.deepEqual(findSorceryMapping(cfg, "res_pjsip", "endpoint/cache"), { wizard: "memory" });

  cfg = removeSorceryMapping(cfg, "res_pjsip", "auth");
  assert.equal(findSorceryMapping(cfg, "res_pjsip", "auth"), undefined);
  // Removing one object type in one module never touches the same object type's mapping
  // in a different module's section.
  assert.deepEqual(
    findSorceryMapping(cfg, "res_pjsip_endpoint_identifier_ip", "identify"),
    { wizard: "realtime", config: "ps_endpoint_id_ips" },
  );
});

test("findSorceryMapping never returns a mapping from the wrong module's section", () => {
  const cfg: ConfigValue = [
    { name: "res_pjsip", entries: [{ key: "endpoint", value: "realtime,ps_endpoints" }] },
    { name: "res_mwi_external", entries: [{ key: "mailboxes", value: "astdb,mwi_external" }] },
  ];
  assert.equal(findSorceryMapping(cfg, "res_mwi_external", "endpoint"), undefined);
  assert.equal(findSorceryMapping(cfg, "res_pjsip", "mailboxes"), undefined);
});
