import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addRule,
  analyse,
  evaluate,
  moveRule,
  parseAcl,
  removeRule,
  toConfigValue,
  validateRule,
  type AclModel,
} from "../../control-plane/acl-model.js";
import type { ConfigValue } from "../../control-plane/wsl-config-transport.js";

/* --------------------------------------------------------------------------------
 * Fixtures — mirrors configs/samples/acl.conf.sample's two named idioms plus one
 * IPv6 section, so the round-trip and evaluation tests exercise a realistic file.
 * -------------------------------------------------------------------------------- */

const SAMPLE_CONFIG: ConfigValue = [
  {
    name: "example_named_acl1",
    entries: [
      { key: "deny", value: "0.0.0.0/0.0.0.0" },
      { key: "permit", value: "209.16.236.0" },
      { key: "permit", value: "209.16.236.1" },
    ],
  },
  {
    name: "example_named_acl2",
    entries: [
      { key: "permit", value: "0.0.0.0/0.0.0.0" },
      { key: "deny", value: "10.24.20.171" },
      { key: "deny", value: "10.24.20.103" },
      { key: "deny", value: "209.16.236.1" },
    ],
  },
  {
    name: "ipv6_example_1",
    entries: [
      { key: "deny", value: "::/0" },
      { key: "permit", value: "::1/128" },
    ],
  },
];

/* --------------------------------------------------------------------------------
 * parseAcl / toConfigValue round trip, order preservation
 * -------------------------------------------------------------------------------- */

test("parseAcl parses the realistic multi-ACL sample into ordered rule lists", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  assert.equal(model.length, 3);
  assert.equal(model[0]!.name, "example_named_acl1");
  assert.deepEqual(
    model[0]!.rules.map((r) => r.action),
    ["deny", "permit", "permit"],
  );
});

test("round trip through toConfigValue renders identically to the input with no changes", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  const rendered = toConfigValue(model);
  assert.deepEqual(rendered, SAMPLE_CONFIG);
});

test("rule order survives a round trip even when it is not sorted or grouped", () => {
  const unordered: ConfigValue = [
    {
      name: "mixed",
      entries: [
        { key: "permit", value: "10.0.0.5" },
        { key: "deny", value: "10.0.0.0/24" },
        { key: "permit", value: "10.0.0.9" },
        { key: "deny", value: "0.0.0.0/0" },
      ],
    },
  ];
  const model = parseAcl(unordered);
  assert.deepEqual(
    model[0]!.rules.map((r) => `${r.action} ${r.spec}`),
    ["permit 10.0.0.5", "deny 10.0.0.0/24", "permit 10.0.0.9", "deny 0.0.0.0/0"],
  );
  assert.deepEqual(toConfigValue(model), unordered);
});

test("parseAcl handles an empty config value without throwing", () => {
  assert.deepEqual(parseAcl([]), []);
});

test("parseAcl preserves an ACL section that legitimately has zero rules", () => {
  const model = parseAcl([{ name: "empty_acl", entries: [] }]);
  assert.equal(model.length, 1);
  assert.deepEqual(model[0]!.rules, []);
});

test("toConfigValue leaves unrelated section content untouched (no extraneous entries introduced)", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  const rendered = toConfigValue(model);
  for (const section of rendered) {
    assert.ok(SAMPLE_CONFIG.some((s) => s.name === section.name));
  }
});

/* --------------------------------------------------------------------------------
 * validateRule — accepted forms
 * (configs/samples/acl.conf.sample lines 34-42, 76-81: bare address, dotted-quad
 * "address/netmask", and IPv6 "address/prefix-length")
 * -------------------------------------------------------------------------------- */

test("validateRule accepts a bare IPv4 address", () => {
  const rule = validateRule("permit", "209.16.236.1");
  assert.deepEqual(rule, { action: "permit", spec: "209.16.236.1" });
});

test("validateRule accepts IPv4 address/dotted-quad-netmask (sample line 34)", () => {
  assert.doesNotThrow(() => validateRule("deny", "0.0.0.0/0.0.0.0"));
});

test("validateRule accepts IPv4 address/CIDR-prefix-length", () => {
  assert.doesNotThrow(() => validateRule("deny", "10.24.20.0/24"));
});

test("validateRule accepts IPv4 CIDR at the 0/0 and /32 boundaries", () => {
  assert.doesNotThrow(() => validateRule("permit", "0.0.0.0/0"));
  assert.doesNotThrow(() => validateRule("permit", "10.0.0.1/32"));
});

test("validateRule accepts a bare IPv6 address (sample line 80)", () => {
  assert.doesNotThrow(() => validateRule("permit", "fe80::21d:bad:fad:2323"));
});

test("validateRule accepts IPv6 address/prefix-length (sample lines 76-77)", () => {
  assert.doesNotThrow(() => validateRule("deny", "::/0"));
  assert.doesNotThrow(() => validateRule("permit", "::1/128"));
});

test("validateRule accepts IPv6 CIDR at the /128 boundary", () => {
  assert.doesNotThrow(() => validateRule("permit", "fe80::1/128"));
});

test("validateRule accepts a full IPv6 netmask form", () => {
  assert.doesNotThrow(() => validateRule("deny", "2001:db8::/ffff:ffff:ffff:ffff::"));
});

/* --------------------------------------------------------------------------------
 * validateRule — refusals, each naming the exact rejected value
 * -------------------------------------------------------------------------------- */

test("validateRule refuses an unknown action, quoting it", () => {
  assert.throws(() => validateRule("allow", "10.0.0.1"), /"allow" is not a valid ACL action/);
});

test("validateRule refuses an empty specification", () => {
  assert.throws(() => validateRule("permit", ""), /cannot be empty/);
});

test("validateRule refuses a malformed IPv4 address, quoting it", () => {
  assert.throws(() => validateRule("permit", "999.1.1.1"), /"999\.1\.1\.1" is not a valid/);
});

test("validateRule refuses a malformed IPv4 address with too few octets", () => {
  assert.throws(() => validateRule("permit", "10.0.0"), /is not a valid/);
});

test("validateRule refuses a malformed IPv6 address", () => {
  assert.throws(() => validateRule("permit", "gggg::1"), /is not a valid/);
});

test("validateRule refuses an IPv4 prefix length above 32, per-family", () => {
  assert.throws(
    () => validateRule("deny", "10.0.0.0/33"),
    /"33" is not a valid netmask or CIDR prefix length for an IPv4 address \(prefix length must be between 0 and 32\)/,
  );
});

test("validateRule refuses an IPv6 prefix length above 128, per-family", () => {
  assert.throws(
    () => validateRule("deny", "::/129"),
    /"129" is not a valid netmask or CIDR prefix length for an IPv6 address \(prefix length must be between 0 and 128\)/,
  );
});

test("validateRule refuses a negative-looking or non-numeric mask", () => {
  assert.throws(() => validateRule("permit", "10.0.0.0/abc"), /is not a valid netmask/);
});

test("validateRule refuses a spec with a trailing slash and nothing after it", () => {
  assert.throws(() => validateRule("permit", "10.0.0.0/"), /nothing follows the "\/"/);
});

test("validateRule refuses a hostname by name, distinguishing it from a malformed address", () => {
  assert.throws(
    () => validateRule("permit", "sip.example.com"),
    /"sip\.example\.com" is not a valid ACL rule: "sip\.example\.com" looks like a hostname/,
  );
});

test("validateRule refuses a hostname even with a mask suffix", () => {
  assert.throws(() => validateRule("deny", "trunk.example.net/24"), /looks like a hostname/);
});

/* --------------------------------------------------------------------------------
 * parseAcl surfaces validateRule failures with the ACL name attached
 * -------------------------------------------------------------------------------- */

test("parseAcl refuses a section containing an invalid rule, naming the ACL", () => {
  const bad: ConfigValue = [
    { name: "broken_acl", entries: [{ key: "permit", value: "not-an-address" }] },
  ];
  assert.throws(() => parseAcl(bad), /In ACL "broken_acl": .*is not a valid/);
});

/* --------------------------------------------------------------------------------
 * evaluate — first match wins, matches Asterisk's own evaluation order
 * -------------------------------------------------------------------------------- */

test("evaluate: a later, narrower permit overrides an earlier deny-everything (allowlist idiom)", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  const result = evaluate(model[0]!, "209.16.236.0");
  assert.deepEqual(result, { verdict: "permit", matchedRule: 1 });
});

test("evaluate: a later, narrower deny overrides an earlier permit-everything (blocklist idiom)", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  const result = evaluate(model[1]!, "10.24.20.171");
  assert.deepEqual(result, { verdict: "deny", matchedRule: 1 });
});

test("evaluate falls back to the catch-all first rule when no later rule also matches", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  const result = evaluate(model[0]!, "8.8.8.8");
  assert.deepEqual(result, { verdict: "deny", matchedRule: 0 });
});

test("evaluate reports no-match with no matched rule for an address matching nothing in a non-catch-all ACL", () => {
  const model = parseAcl([
    { name: "narrow", entries: [{ key: "permit", value: "10.0.0.1" }] },
  ]);
  const result = evaluate(model[0]!, "192.168.0.1");
  assert.deepEqual(result, { verdict: "permit", matchedRule: null, reason: "no-match" });
});

test("evaluate treats an empty ACL as unconditional permit", () => {
  const model = parseAcl([{ name: "empty_acl", entries: [] }]);
  const result = evaluate(model[0]!, "1.2.3.4");
  assert.deepEqual(result, { verdict: "permit", matchedRule: null, reason: "no-match" });
});

test("evaluate matches an IPv6 address against an IPv6 rule", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  const result = evaluate(model[2]!, "::1");
  assert.deepEqual(result, { verdict: "permit", matchedRule: 1 });
});

test("evaluate never matches an IPv4 address against an IPv6-only rule or vice versa", () => {
  const model = parseAcl([
    { name: "v6_only", entries: [{ key: "deny", value: "::/0" }] },
  ]);
  const result = evaluate(model[0]!, "10.0.0.1");
  assert.deepEqual(result, { verdict: "permit", matchedRule: null, reason: "no-match" });
});

test("evaluate: the LAST matching rule wins, not the first, across three matching rules", () => {
  const model = parseAcl([
    {
      name: "multi_override",
      entries: [
        { key: "deny", value: "10.0.0.0/8" },
        { key: "permit", value: "10.0.0.0/16" },
        { key: "deny", value: "10.0.5.0/24" },
      ],
    },
  ]);
  const result = evaluate(model[0]!, "10.0.5.9");
  assert.deepEqual(result, { verdict: "deny", matchedRule: 2 });
});

/* --------------------------------------------------------------------------------
 * analyse — each finding triggered individually, plus a clean ACL producing none
 * -------------------------------------------------------------------------------- */

test("analyse flags a shadowed rule: an earlier, narrower rule that a later, broader rule always overrides", () => {
  const model = parseAcl([
    {
      name: "shadow",
      entries: [
        { key: "deny", value: "10.1.2.3" },
        { key: "permit", value: "10.0.0.0/8" },
      ],
    },
  ]);
  const findings = analyse(model[0]!);
  const shadow = findings.find((f) => f.kind === "shadowed");
  assert.ok(shadow, "expected a shadowed finding");
  assert.equal(shadow!.rule, 0);
});

test("analyse flags permit=0.0.0.0/0 as permitting the whole internet", () => {
  const model = parseAcl([{ name: "wide_open", entries: [{ key: "permit", value: "0.0.0.0/0" }] }]);
  const findings = analyse(model[0]!);
  assert.ok(findings.some((f) => f.kind === "permit-everything" && f.rule === 0));
});

test("analyse flags permit=::/0 as permitting the whole internet (IPv6)", () => {
  const model = parseAcl([{ name: "wide_open_v6", entries: [{ key: "permit", value: "::/0" }] }]);
  const findings = analyse(model[0]!);
  assert.ok(findings.some((f) => f.kind === "permit-everything" && f.rule === 0));
});

test("analyse flags permit=0.0.0.0/0.0.0.0 (dotted-quad everything) too", () => {
  const model = parseAcl([{ name: "wide_open_dotted", entries: [{ key: "permit", value: "0.0.0.0/0.0.0.0" }] }]);
  const findings = analyse(model[0]!);
  assert.ok(findings.some((f) => f.kind === "permit-everything"));
});

test("analyse flags an ACL that ends on an un-narrowed permit (open tail)", () => {
  const model = parseAcl([
    {
      name: "no_closing_deny",
      entries: [
        { key: "deny", value: "10.0.0.0/24" },
        { key: "permit", value: "10.0.0.5" },
      ],
    },
  ]);
  const findings = analyse(model[0]!);
  const openTail = findings.find((f) => f.kind === "open-tail");
  assert.ok(openTail, "expected an open-tail finding");
  assert.equal(openTail!.rule, 1);
});

test("analyse does not flag an open tail when the ACL ends on a deny", () => {
  const model = parseAcl([
    {
      name: "closed",
      entries: [
        { key: "permit", value: "10.0.0.5" },
        { key: "deny", value: "0.0.0.0/0" },
      ],
    },
  ]);
  const findings = analyse(model[0]!);
  assert.ok(!findings.some((f) => f.kind === "open-tail"));
});

test("analyse flags an empty ACL", () => {
  const model = parseAcl([{ name: "empty_acl", entries: [] }]);
  const findings = analyse(model[0]!);
  assert.equal(findings.length, 1);
  assert.equal(findings[0]!.kind, "empty-acl");
});

test("analyse produces no findings for a clean, fully-closed ACL", () => {
  // The catch-all deny goes FIRST, so it never shadows the specific permits that
  // follow it (last-match-wins means a later, narrower rule correctly overrides it).
  const model = parseAcl([
    {
      name: "clean",
      entries: [
        { key: "deny", value: "0.0.0.0/0" },
        { key: "permit", value: "10.0.0.5" },
        { key: "permit", value: "10.0.0.9" },
        { key: "deny", value: "10.0.0.50" },
      ],
    },
  ]);
  const findings = analyse(model[0]!);
  assert.deepEqual(findings, []);
});

test("analyse flags a catch-all deny placed LAST as shadowing every earlier permit", () => {
  // The mirror image of the clean fixture above: putting the catch-all deny at the
  // end means it always overwrites the specific permits before it, denying everyone.
  const model = parseAcl([
    {
      name: "misordered",
      entries: [
        { key: "permit", value: "10.0.0.5" },
        { key: "permit", value: "10.0.0.9" },
        { key: "deny", value: "0.0.0.0/0" },
      ],
    },
  ]);
  const findings = analyse(model[0]!);
  const shadowed = findings.filter((f) => f.kind === "shadowed");
  assert.equal(shadowed.length, 2);
  assert.deepEqual(shadowed.map((f) => f.rule).sort(), [0, 1]);
});

test("analyse reports multiple distinct findings on a badly written ACL", () => {
  const model = parseAcl([
    {
      name: "messy",
      entries: [
        { key: "permit", value: "10.1.2.3" }, // shadowed by rule 1 below
        { key: "permit", value: "10.0.0.0/8" },
        { key: "permit", value: "192.168.1.1" }, // open tail
      ],
    },
  ]);
  const findings = analyse(model[0]!);
  const kinds = new Set(findings.map((f) => f.kind));
  assert.ok(kinds.has("shadowed"));
  assert.ok(kinds.has("open-tail"));
});

/* --------------------------------------------------------------------------------
 * Mutation: addRule / removeRule / moveRule
 * -------------------------------------------------------------------------------- */

test("addRule appends to the end of an existing ACL's rule list", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  const next = addRule(model, "example_named_acl1", { action: "permit", spec: "203.0.113.4" });
  const acl = next.find((a) => a.name === "example_named_acl1")!;
  assert.equal(acl.rules.length, model[0]!.rules.length + 1);
  assert.deepEqual(acl.rules[acl.rules.length - 1], { action: "permit", spec: "203.0.113.4" });
  // every earlier rule kept its exact position -- appended means appended, not inserted
  assert.deepEqual(acl.rules.slice(0, -1), model[0]!.rules);
});

test("addRule creates the named ACL when it does not exist yet, appended after the others", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  const next = addRule(model, "brand-new", { action: "deny", spec: "0.0.0.0/0" });
  assert.equal(next.length, model.length + 1);
  assert.deepEqual(next[next.length - 1], { name: "brand-new", rules: [{ action: "deny", spec: "0.0.0.0/0" }] });
  // every existing ACL is untouched
  assert.deepEqual(next.slice(0, model.length), model);
});

test("addRule never mutates its argument", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  const before = JSON.parse(JSON.stringify(model));
  addRule(model, "example_named_acl1", { action: "permit", spec: "203.0.113.4" });
  assert.deepEqual(model, before);
});

test("removeRule removes exactly the named index and closes the gap, preserving order", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  const acl = model.find((a) => a.name === "example_named_acl1")!;
  assert.equal(acl.rules.length, 3); // deny 0.0.0.0/0.0.0.0, permit .0, permit .1
  const next = removeRule(model, "example_named_acl1", 1); // drop the first permit
  const edited = next.find((a) => a.name === "example_named_acl1")!;
  assert.deepEqual(edited.rules, [acl.rules[0], acl.rules[2]]);
});

test("removeRule on an unknown ACL or an out-of-range index changes nothing", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  assert.deepEqual(removeRule(model, "does-not-exist", 0), model);
  assert.deepEqual(removeRule(model, "example_named_acl1", 99), model);
  assert.deepEqual(removeRule(model, "example_named_acl1", -1), model);
});

test("removeRule leaves every other ACL exactly as it was", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  const next = removeRule(model, "example_named_acl1", 0);
  const untouched = model.filter((a) => a.name !== "example_named_acl1");
  const stillThere = next.filter((a) => a.name !== "example_named_acl1");
  assert.deepEqual(stillThere, untouched);
});

test("moveRule swaps a rule with its earlier neighbour, and only its neighbour", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  const acl = model.find((a) => a.name === "example_named_acl1")!;
  const next = moveRule(model, "example_named_acl1", 1, "up"); // move the first permit above the deny
  const edited = next.find((a) => a.name === "example_named_acl1")!;
  assert.deepEqual(edited.rules, [acl.rules[1], acl.rules[0], acl.rules[2]]);
});

test("moveRule swaps a rule with its later neighbour", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  const acl = model.find((a) => a.name === "example_named_acl1")!;
  const next = moveRule(model, "example_named_acl1", 0, "down"); // move the deny below the first permit
  const edited = next.find((a) => a.name === "example_named_acl1")!;
  assert.deepEqual(edited.rules, [acl.rules[1], acl.rules[0], acl.rules[2]]);
});

test("moveRule is a genuine no-op at either end of the list", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  const acl = model.find((a) => a.name === "example_named_acl1")!;
  const atTop = moveRule(model, "example_named_acl1", 0, "up");
  const atBottom = moveRule(model, "example_named_acl1", acl.rules.length - 1, "down");
  assert.deepEqual(atTop, model);
  assert.deepEqual(atBottom, model);
});

test("moveRule on an unknown ACL or an out-of-range index changes nothing", () => {
  const model = parseAcl(SAMPLE_CONFIG);
  assert.deepEqual(moveRule(model, "does-not-exist", 0, "up"), model);
  assert.deepEqual(moveRule(model, "example_named_acl1", 99, "up"), model);
});

test("moveRule actually changes the evaluation outcome -- reordering is not cosmetic", () => {
  // deny 0.0.0.0/0.0.0.0, permit 209.16.236.0, permit 209.16.236.1 -- .0 is explicitly permitted
  const model = parseAcl(SAMPLE_CONFIG);
  assert.deepEqual(evaluate(model.find((a) => a.name === "example_named_acl1")!, "209.16.236.0"),
    { verdict: "permit", matchedRule: 1 });
  // Move the broad deny to the END: now it overwrites everything after it, including .0.
  const reordered = moveRule(model, "example_named_acl1", 0, "down");
  const acl = reordered.find((a) => a.name === "example_named_acl1")!;
  // deny is now at index 1; move it again to reach the end (3-rule list, started at 0)
  const acl2 = moveRule(reordered, "example_named_acl1", 1, "down").find((a) => a.name === "example_named_acl1")!;
  void acl;
  assert.deepEqual(evaluate(acl2, "209.16.236.0"), { verdict: "deny", matchedRule: 2 });
});

/* --------------------------------------------------------------------------------
 * Purity / determinism smoke check
 * -------------------------------------------------------------------------------- */

test("parseAcl, evaluate, and analyse are pure: repeated calls on the same input agree", () => {
  const model: AclModel = parseAcl(SAMPLE_CONFIG);
  const again: AclModel = parseAcl(SAMPLE_CONFIG);
  assert.deepEqual(model, again);
  assert.deepEqual(evaluate(model[0]!, "209.16.236.1"), evaluate(again[0]!, "209.16.236.1"));
  assert.deepEqual(analyse(model[1]!), analyse(again[1]!));
});
