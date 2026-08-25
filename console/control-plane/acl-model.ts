/**
 * A pure model of `acl.conf` — Asterisk's named Access Control Lists.
 *
 * `configs/samples/acl.conf.sample` is the authority for the shape: each `[name]`
 * section is an ORDERED list of `permit=` / `deny=` rules. `ast_apply_ha` in
 * `main/acl.c` (lines 806-868) is the authority for how they are evaluated, and it is
 * NOT first-match-wins: it starts optimistic (`res = AST_SENSE_ALLOW`), then walks
 * every rule in order, and each rule whose netmask matches the address OVERWRITES
 * `res` with that rule's sense. The verdict is therefore whichever matching rule comes
 * LAST — a later, broader `permit` un-does an earlier, narrower `deny`, and vice versa.
 * That is precisely what makes the classic allowlist idiom below work: `deny=0.0.0.0/0`
 * matches everything first, and each later `permit=<specific address>` then overwrites
 * the verdict back to allow for just that address. Order is therefore not incidental
 * formatting — it is the whole meaning of the list — so this module treats a
 * `ConfigSection`'s `entries` array as already carrying the order and never reorders,
 * groups, or deduplicates it. (`ast_apply_acl_internal`, lines 757-793, is a different,
 * outer loop — it walks a set of *named ACLs* applied to one endpoint and denies as
 * soon as any one of them denies; it says nothing about the order of rules inside a
 * single ACL, which is what this module models.)
 *
 * `named_acl.c`'s own sample documents the two idioms this module has to recognise
 * (`configs/samples/acl.conf.sample` lines 33-42, 75-81):
 *   - a deny-everything-then-permit-some allowlist (`deny=0.0.0.0/0.0.0.0`, then permits)
 *   - a permit-everything-then-deny-some blocklist (`permit=0.0.0.0/0.0.0.0`, then denies)
 * `analyse()` flags the dangerous cousin of the second idiom: a list that ends on an
 * unqualified permit, so anything nobody thought of is let through.
 *
 * Every rule specification here is validated the way `main/acl.c`'s `ast_append_ha`
 * actually parses one (lines 561-712): an address, optionally followed by `/` and a
 * netmask that is either dotted-quad/colon-form or a bare CIDR prefix length. Asterisk
 * resolves anything else — a hostname — with a DNS lookup at load time
 * (`ast_sockaddr_parse` is a numeric parse, not a resolver call for a `permit`/`deny`
 * line), and a console cannot check that offline, so a hostname is refused rather than
 * silently accepted and possibly wrong.
 */
import type { ConfigSection, ConfigValue } from "./wsl-config-transport.js";

export type AclAction = "permit" | "deny";

export interface AclRule {
  action: AclAction;
  spec: string;
}

export interface NamedAcl {
  name: string;
  rules: ReadonlyArray<AclRule>;
}

export type AclModel = ReadonlyArray<NamedAcl>;

export interface AclViolation {
  rule: number;
  message: string;
}

export type AclEvaluation =
  | { verdict: "permit" | "deny"; matchedRule: number }
  | { verdict: "permit"; matchedRule: null; reason: "no-match" };

export type AclFindingKind = "shadowed" | "permit-everything" | "open-tail" | "empty-acl";

export interface AclFinding {
  kind: AclFindingKind;
  rule: number | null;
  message: string;
}

/* ------------------------------------------------------------------------------------
 * Address / CIDR validation
 *
 * Mirrors the two things `ast_append_ha` actually accepts for a rule's address half
 * (main/acl.c, `parse_cidr_mask` and the `ast_sockaddr_parse` calls around line 615):
 *   - a bare address ("209.16.236.1", "::1")
 *   - "address/mask", where mask is either a full netmask ("255.255.255.0",
 *     "ffff:ffff::") or a bare prefix length ("24", "128")
 * A prefix length is bounded by the address family: 0-32 for IPv4, 0-128 for IPv6
 * (parse_cidr_mask defaults to 32 or 128 and validates against that ceiling).
 * ------------------------------------------------------------------------------------ */

function ipVersion(address: string): 4 | 6 | 0 {
  if (/^(\d{1,3}\.){3}\d{1,3}$/u.test(address)) {
    const octets = address.split(".").map(Number);
    return octets.every((octet) => octet >= 0 && octet <= 255) ? 4 : 0;
  }
  if (address.includes(":")) {
    return isValidIpv6(address) ? 6 : 0;
  }
  return 0;
}

function isValidIpv6(address: string): boolean {
  if (address.length === 0) return false;
  if (address === "::") return true;
  // No more than one "::" collapse, and only hex groups / a trailing embedded IPv4.
  const doubleColonCount = (address.match(/::/gu) ?? []).length;
  if (doubleColonCount > 1) return false;
  const withoutDoubleColon = address.replace("::", ":");
  const groups = withoutDoubleColon.split(":").filter((group) => group.length > 0);
  if (groups.length === 0) return false;
  if (!address.includes("::") && groups.length !== 8) return false;
  if (groups.length > 8) return false;
  return groups.every((group, index) => {
    if (index === groups.length - 1 && group.includes(".")) {
      return ipVersion(group) === 4;
    }
    return /^[0-9a-fA-F]{1,4}$/u.test(group);
  });
}

function isFullNetmask(mask: string, family: 4 | 6): boolean {
  return ipVersion(mask) === family;
}

function isBarePrefixLength(mask: string, family: 4 | 6): boolean {
  if (!/^\d{1,3}$/u.test(mask)) return false;
  const length = Number(mask);
  const ceiling = family === 4 ? 32 : 128;
  return length >= 0 && length <= ceiling;
}

/**
 * Validates one rule's action and specification the way `ast_append_ha` parses it.
 * Refuses by throwing, naming the exact value that was rejected, per the repository's
 * "refuse rather than guess" and "quote the value" conventions used throughout the
 * control plane (see `wsl-config-transport.ts`'s `assertConfigurable`).
 */
export function validateRule(action: string, spec: string): AclRule {
  if (action !== "permit" && action !== "deny") {
    throw new Error(`"${action}" is not a valid ACL action; only "permit" and "deny" are recognised.`);
  }
  if (spec.trim().length === 0) {
    throw new Error(`An ACL rule specification cannot be empty.`);
  }

  const separator = spec.indexOf("/");
  const addressPart = separator < 0 ? spec : spec.slice(0, separator);
  const maskPart = separator < 0 ? undefined : spec.slice(separator + 1);

  if (separator >= 0 && maskPart!.length === 0) {
    throw new Error(`"${spec}" is not a valid ACL rule: nothing follows the "/".`);
  }

  const family = ipVersion(addressPart);
  if (family === 0) {
    // Distinguish "looks like a hostname" from "looks like a malformed address" only
    // for the message; either way the rule is refused, never resolved.
    if (/^[a-zA-Z][a-zA-Z0-9.-]*$/u.test(addressPart) && !/^\d/u.test(addressPart)) {
      throw new Error(
        `"${spec}" is not a valid ACL rule: "${addressPart}" looks like a hostname. Asterisk resolves ACL ` +
          `addresses at load time, and this console cannot verify a hostname offline, so it is refused. Use a ` +
          `literal IPv4 or IPv6 address instead.`,
      );
    }
    throw new Error(`"${spec}" is not a valid ACL rule: "${addressPart}" is not a valid IPv4 or IPv6 address.`);
  }

  if (maskPart !== undefined) {
    const validMask = isFullNetmask(maskPart, family) || isBarePrefixLength(maskPart, family);
    if (!validMask) {
      const ceiling = family === 4 ? 32 : 128;
      throw new Error(
        `"${spec}" is not a valid ACL rule: "${maskPart}" is not a valid netmask or CIDR prefix length for an ` +
          `IPv${family} address (prefix length must be between 0 and ${ceiling}).`,
      );
    }
  }

  return { action, spec };
}

/* ------------------------------------------------------------------------------------
 * Parsing / rendering
 * ------------------------------------------------------------------------------------ */

/**
 * Parses `acl.conf`'s already-structured `ConfigValue` (one section per named ACL, one
 * entry per `permit=`/`deny=` line, in file order) into the ordered rule lists this
 * module reasons about. Throws on the first invalid rule, naming the ACL and the value.
 */
export function parseAcl(value: ConfigValue): AclModel {
  return value.map((section) => {
    const rules = section.entries.map((entry) => {
      try {
        return validateRule(entry.key, entry.value);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`In ACL "${section.name}": ${reason}`);
      }
    });
    return { name: section.name, rules };
  });
}

/**
 * Renders back to the transport's `ConfigValue` shape, preserving section order and
 * each ACL's rule order exactly — a round trip with no changes must render identically.
 */
export function toConfigValue(acls: AclModel): ConfigValue {
  return acls.map(
    (acl): ConfigSection => ({
      name: acl.name,
      entries: acl.rules.map((rule) => ({ key: rule.action, value: rule.spec })),
    }),
  );
}

/* ------------------------------------------------------------------------------------
 * Mutation
 *
 * Pure, order-preserving edits over an `AclModel`. Every one returns a NEW model rather
 * than touching its argument, so a caller building a plan can compare the result against
 * what it started with. None of these validate a rule's address/mask shape themselves —
 * `validateRule` above is what a caller runs first on anything a person typed, so a bad
 * value is refused before it ever reaches here rather than being silently accepted into
 * the model and only failing later, confusingly, inside `toConfigValue`/the transport.
 * ------------------------------------------------------------------------------------ */

/**
 * Appends `rule` to the end of the named ACL's rule list, which is where a newly added
 * rule belongs: `ast_apply_ha` is last-match-wins (see the module doc above), so a rule
 * appended after everything else is the one that decides the outcome for any address it
 * matches, exactly as "add a rule" should mean. Creates the ACL, appended after every
 * existing one, when `aclName` does not yet exist — `acl.conf.sample` shows named ACLs
 * as ordinary `[name]` sections with no special declaration beyond having at least one
 * `permit=`/`deny=` line in them, so a first rule is enough to bring one into existence.
 */
export function addRule(acls: AclModel, aclName: string, rule: AclRule): AclModel {
  const index = acls.findIndex((acl) => acl.name === aclName);
  if (index === -1) return [...acls, { name: aclName, rules: [rule] }];
  return acls.map((acl, i) => (i === index ? { ...acl, rules: [...acl.rules, rule] } : acl));
}

/**
 * Removes rule `ruleIndex` from the named ACL. Returns the model UNCHANGED (by value; a
 * new array is still returned, but with identical content) when `aclName` does not exist
 * or `ruleIndex` is out of range, rather than guessing which rule a caller might have
 * meant — the same "refuse rather than guess" rule `validateRule` documents above.
 */
export function removeRule(acls: AclModel, aclName: string, ruleIndex: number): AclModel {
  return acls.map((acl) => {
    if (acl.name !== aclName) return acl;
    if (ruleIndex < 0 || ruleIndex >= acl.rules.length) return acl;
    return { ...acl, rules: acl.rules.filter((_, i) => i !== ruleIndex) };
  });
}

/**
 * Swaps rule `ruleIndex` with its immediate neighbour one position earlier (`'up'`) or
 * later (`'down'`) within its OWN ACL — never across ACLs, since evaluation order is
 * scoped to one named list at a time (`ast_apply_ha` again). A no-op at either end of
 * the list: there is nowhere further to move, and this module never reorders anything
 * without being asked to move a specific rule a specific direction.
 */
export function moveRule(acls: AclModel, aclName: string, ruleIndex: number, direction: 'up' | 'down'): AclModel {
  return acls.map((acl) => {
    if (acl.name !== aclName) return acl;
    const target = direction === 'up' ? ruleIndex - 1 : ruleIndex + 1;
    if (ruleIndex < 0 || ruleIndex >= acl.rules.length || target < 0 || target >= acl.rules.length) return acl;
    const rules = acl.rules.slice();
    const moved = rules[ruleIndex]!;
    rules[ruleIndex] = rules[target]!;
    rules[target] = moved;
    return { ...acl, rules };
  });
}

/* ------------------------------------------------------------------------------------
 * Evaluation
 *
 * Mirrors `ast_apply_ha` (main/acl.c lines 806-868): start optimistic (permit), walk
 * every rule in order, and every rule whose netmask matches the address overwrites the
 * running verdict with that rule's sense. The result is whichever matching rule comes
 * LAST, not first. An ACL with no rules — or an address none of its rules match — is
 * permitted (`ast_named_acl_find` logs a NOTICE that an empty ACL "will accept
 * addresses unconditionally"; `ast_apply_ha`'s starting value is the same permit).
 * ------------------------------------------------------------------------------------ */

function addressInSpec(address: string, spec: string): boolean {
  const separator = spec.indexOf("/");
  const specAddress = separator < 0 ? spec : spec.slice(0, separator);
  const family = ipVersion(specAddress);
  const addressFamily = ipVersion(address);
  if (family === 0 || addressFamily === 0 || family !== addressFamily) return false;

  const maskPart = separator < 0 ? undefined : spec.slice(separator + 1);
  const prefixLength = maskPart === undefined
    ? family === 4
      ? 32
      : 128
    : isBarePrefixLength(maskPart, family)
      ? Number(maskPart)
      : netmaskToPrefixLength(maskPart, family);

  const addressBits = toBits(address, family);
  const specBits = toBits(specAddress, family);
  if (addressBits === null || specBits === null) return false;

  return addressBits.slice(0, prefixLength) === specBits.slice(0, prefixLength);
}

function netmaskToPrefixLength(mask: string, family: 4 | 6): number {
  const bits = toBits(mask, family);
  if (bits === null) return family === 4 ? 32 : 128;
  const ones = bits.indexOf("0");
  return ones === -1 ? bits.length : ones;
}

function toBits(address: string, family: 4 | 6): string | null {
  if (family === 4) {
    const octets = address.split(".").map(Number);
    if (octets.length !== 4 || octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) return null;
    return octets.map((octet) => octet.toString(2).padStart(8, "0")).join("");
  }
  return ipv6ToBits(address);
}

function ipv6ToBits(address: string): string | null {
  if (!isValidIpv6(address)) return null;
  let groups: string[];
  if (address.includes("::")) {
    const [head, tail] = address.split("::");
    const headGroups = head.length > 0 ? head.split(":") : [];
    const tailGroups = tail.length > 0 ? tail.split(":") : [];
    const missing = 8 - headGroups.length - tailGroups.length;
    if (missing < 0) return null;
    groups = [...headGroups, ...Array(missing).fill("0"), ...tailGroups];
  } else {
    groups = address.split(":");
  }
  if (groups.length !== 8) return null;
  return groups
    .map((group) => {
      if (group.includes(".")) {
        // Embedded IPv4 tail: expand to two 16-bit groups.
        const octets = group.split(".").map(Number);
        const value = ((octets[0]! << 24) | (octets[1]! << 16) | (octets[2]! << 8) | octets[3]!) >>> 0;
        return value.toString(2).padStart(32, "0");
      }
      return parseInt(group, 16).toString(2).padStart(16, "0");
    })
    .join("");
}

/**
 * Evaluates a single address against one named ACL, last-match-wins, mirroring
 * `ast_apply_ha`'s own evaluation order exactly.
 */
export function evaluate(acl: NamedAcl, address: string): AclEvaluation {
  let matchedRule: number | null = null;
  let verdict: "permit" | "deny" = "permit";

  for (const [index, rule] of acl.rules.entries()) {
    if (addressInSpec(address, rule.spec)) {
      matchedRule = index;
      verdict = rule.action === "permit" ? "permit" : "deny";
    }
  }

  if (matchedRule === null) {
    return { verdict: "permit", matchedRule: null, reason: "no-match" };
  }
  return { verdict, matchedRule };
}

/* ------------------------------------------------------------------------------------
 * Analysis
 * ------------------------------------------------------------------------------------ */

const EVERYTHING_SPECS = new Set(["0.0.0.0/0", "0.0.0.0/0.0.0.0", "::/0"]);

function isPermitEverything(rule: AclRule): boolean {
  return rule.action === "permit" && EVERYTHING_SPECS.has(rule.spec);
}

function specCovers(outer: string, inner: string): boolean {
  // True when every address matching "inner" also matches "outer": same family, and
  // outer's prefix is a real prefix of (or equal to) inner's, with a shorter-or-equal
  // length. Used to find shadowing: since evaluation is last-match-wins
  // (`ast_apply_ha`), a LATER rule whose spec covers an EARLIER rule's spec always
  // overwrites that earlier rule's verdict for every address the earlier rule could
  // ever have matched, so the earlier rule can never be the one that decides.
  const outerSep = outer.indexOf("/");
  const innerSep = inner.indexOf("/");
  const outerAddr = outerSep < 0 ? outer : outer.slice(0, outerSep);
  const innerAddr = innerSep < 0 ? inner : inner.slice(0, innerSep);
  const outerFamily = ipVersion(outerAddr);
  const innerFamily = ipVersion(innerAddr);
  if (outerFamily === 0 || innerFamily === 0 || outerFamily !== innerFamily) return false;

  const outerMask = outerSep < 0 ? undefined : outer.slice(outerSep + 1);
  const innerMask = innerSep < 0 ? undefined : inner.slice(innerSep + 1);
  const outerPrefix = outerMask === undefined
    ? outerFamily === 4 ? 32 : 128
    : isBarePrefixLength(outerMask, outerFamily)
      ? Number(outerMask)
      : netmaskToPrefixLength(outerMask, outerFamily);
  const innerPrefix = innerMask === undefined
    ? innerFamily === 4 ? 32 : 128
    : isBarePrefixLength(innerMask, innerFamily)
      ? Number(innerMask)
      : netmaskToPrefixLength(innerMask, innerFamily);

  if (outerPrefix > innerPrefix) return false;

  const outerBits = toBits(outerAddr, outerFamily);
  const innerBits = toBits(innerAddr, innerFamily);
  if (outerBits === null || innerBits === null) return false;
  return outerBits.slice(0, outerPrefix) === innerBits.slice(0, outerPrefix);
}

/**
 * Finds real defects in one named ACL, each naming the exact rule index:
 *  - a rule that can never decide anything because a LATER rule always covers every
 *    address it matches and so always overwrites it (shadowed — evaluation is
 *    last-match-wins, per `ast_apply_ha`)
 *  - a `permit=0.0.0.0/0` / `permit=::/0` — permits the entire internet
 *  - an ACL whose evaluation order ends on an unqualified permit with nothing after it
 *    to narrow it, so anything unmatched by earlier rules is allowed (open-tail)
 *  - an empty ACL, which Asterisk treats as "accept unconditionally"
 */
export function analyse(acl: NamedAcl): AclFinding[] {
  const findings: AclFinding[] = [];

  if (acl.rules.length === 0) {
    findings.push({
      kind: "empty-acl",
      rule: null,
      message: `ACL "${acl.name}" has no rules, so Asterisk accepts every address unconditionally.`,
    });
    return findings;
  }

  for (const [index, rule] of acl.rules.entries()) {
    if (isPermitEverything(rule)) {
      findings.push({
        kind: "permit-everything",
        rule: index,
        message: `Rule ${index} ("permit ${rule.spec}") permits every address on the internet.`,
      });
    }

    for (let later = index + 1; later < acl.rules.length; later += 1) {
      const laterRule = acl.rules[later]!;
      if (specCovers(laterRule.spec, rule.spec)) {
        findings.push({
          kind: "shadowed",
          rule: index,
          message:
            `Rule ${index} ("${rule.action} ${rule.spec}") can never decide anything: later rule ${later} ` +
            `("${laterRule.action} ${laterRule.spec}") matches every address rule ${index} matches and ` +
            `always evaluates after it, so it always overwrites the result.`,
        });
        break;
      }
    }
  }

  const lastIndex = acl.rules.length - 1;
  const last = acl.rules[lastIndex]!;
  if (last.action === "permit" && !isPermitEverything(last)) {
    findings.push({
      kind: "open-tail",
      rule: lastIndex,
      message:
        `ACL "${acl.name}" ends on a permit (rule ${lastIndex}, "permit ${last.spec}") with no closing deny, ` +
        `so any address none of the earlier rules matched is allowed through.`,
    });
  }

  return findings;
}
