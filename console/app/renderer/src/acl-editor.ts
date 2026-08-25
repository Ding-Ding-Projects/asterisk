/**
 * Turns `acl.conf`'s parsed `ConfigValue` into the row shapes the Security screen's
 * table renders, and turns a clicked row back into the exact `(aclName, ruleIndex)`
 * pair the mutation functions in `control-plane/acl-model.ts` need.
 *
 * The table has no server-assigned id for a rule -- `acl.conf` has no such thing, a
 * `permit=`/`deny=` line is identified only by its ACL and its position in it -- so the
 * row's own identity is built here and resolved back here, from the SAME parse of the
 * SAME file, rather than kept in a side table that could drift from what is on screen a
 * moment later. See `resolveAclRowKey` below for why this is safe even though ACL names
 * are otherwise free text.
 */
import type { ConfigValue } from './configuration';
import { analyse, parseAcl, type AclFinding, type AclModel } from '../../../control-plane/acl-model';

export interface AclRowResolution {
  aclName: string;
  ruleIndex: number;
}

/** Appended to a row's first cell so the same string is both a legible "ACL — rule N"
 *  label and a globally unique identifier a click can be resolved back through. Chosen
 *  to match the " · " separator this design already uses everywhere else it joins two
 *  facts into one line (a screen's `file` field, `configSummary`'s section list, …). */
const MARKER = ' · #';

/**
 * The row label deliberately embeds the rule's own action and spec, not just its
 * position -- (aclName, ruleIndex, globalIndex) alone can name the SAME triple before
 * and after an edit that shifts positions elsewhere in the file (insert one rule
 * earlier in the same ACL and everything after it keeps its old ruleIndex+1 numeral by
 * coincidence when the shift is small), which would let a stale row key resolve
 * successfully onto a rule it was never built from. Content in the label is what makes
 * the belt-and-braces check in {@link resolveAclRowKey} actually belt-and-braces:
 * anything that changes WHAT is at a position changes the label naming that position,
 * not just its numbering.
 */
function ruleLabel(aclName: string, ruleIndex: number, action: string, spec: string, globalIndex: number): string {
  return `${aclName} — rule ${ruleIndex + 1} · ${action} ${spec}${MARKER}${globalIndex}`;
}

/** Parses `value` into an `AclModel`, or returns `undefined` for "not read yet" and
 *  throws only when the file itself does not parse as valid ACL rules -- the same
 *  distinction `configSummary` already makes between unread and unavailable. Callers
 *  that only want a best-effort read (row building) should catch; callers reporting a
 *  hard error (the write path validating what it is about to overwrite) should not. */
export function parseAclConfig(value: ConfigValue | undefined): AclModel | undefined {
  if (!value) return undefined;
  // `ConfigValue` is declared once for the transport (`control-plane/wsl-config-transport.ts`)
  // and once for the renderer (`./configuration.ts`) -- structurally identical, so this is a
  // real assignment rather than a cast that papers over a mismatch.
  return parseAcl(value);
}

/** One row per rule, across every named ACL, in file order -- the same order
 *  `ast_apply_ha` evaluates them in, so the table reads top-to-bottom exactly the way
 *  Asterisk itself would walk it. Never throws: a file that fails to parse (a spec this
 *  console's own writer could never have produced, but a hand-edited file might) reports
 *  zero rows rather than crashing the render, and the caller's own summary line says why. */
export function aclRuleRows(value: ConfigValue | undefined): string[][] {
  let model: AclModel | undefined;
  try {
    model = parseAclConfig(value);
  } catch {
    return [];
  }
  if (!model) return [];
  const rows: string[][] = [];
  let globalIndex = 0;
  for (const acl of model) {
    acl.rules.forEach((rule, ruleIndex) => {
      rows.push([ruleLabel(acl.name, ruleIndex, rule.action, rule.spec, globalIndex), rule.action, rule.spec]);
      globalIndex += 1;
    });
  }
  return rows;
}

/**
 * Resolves a row key built by {@link aclRuleRows} back to the exact `(aclName,
 * ruleIndex)` it names, by re-parsing `value` and re-numbering the SAME way -- so this
 * only ever agrees with a row that was actually built from `value`. A key from a stale
 * render (the file changed underneath a still-open context menu) resolves to
 * `undefined` rather than to whatever now happens to sit at that position, which would
 * silently act on the wrong rule.
 */
export function resolveAclRowKey(value: ConfigValue | undefined, rowKey: string): AclRowResolution | undefined {
  const marker = rowKey.lastIndexOf(MARKER);
  if (marker < 0) return undefined;
  const wantedIndex = Number(rowKey.slice(marker + MARKER.length));
  if (!Number.isInteger(wantedIndex) || wantedIndex < 0) return undefined;

  let model: AclModel | undefined;
  try {
    model = parseAclConfig(value);
  } catch {
    return undefined;
  }
  if (!model) return undefined;

  let globalIndex = 0;
  for (const acl of model) {
    for (let ruleIndex = 0; ruleIndex < acl.rules.length; ruleIndex += 1) {
      if (globalIndex === wantedIndex) {
        const rule = acl.rules[ruleIndex]!;
        // Belt-and-braces: the position matched, but only trust it once the label this
        // position would build RIGHT NOW also matches the key we were asked to resolve.
        // Because the label embeds the rule's own action and spec (see `ruleLabel`
        // above), this catches both a shrunk file (the position no longer exists at
        // all, caught by the loop above finishing early) and a SHIFTED one -- an edit
        // elsewhere that leaves the same (aclName, ruleIndex, globalIndex) triple
        // pointing at a different rule, which a position-only comparison would have
        // missed entirely.
        if (ruleLabel(acl.name, ruleIndex, rule.action, rule.spec, globalIndex) !== rowKey) return undefined;
        return { aclName: acl.name, ruleIndex };
      }
      globalIndex += 1;
    }
  }
  return undefined;
}

/** The real problems `analyse()` finds across every named ACL in the file, each already
 *  naming its own ACL so several findings from different lists are not ambiguous. */
export function aclFindings(value: ConfigValue | undefined): ReadonlyArray<AclFinding> {
  let model: AclModel | undefined;
  try {
    model = parseAclConfig(value);
  } catch {
    return [];
  }
  if (!model) return [];
  return model.flatMap((acl) => analyse(acl));
}
