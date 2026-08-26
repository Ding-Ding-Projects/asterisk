import assert from 'node:assert/strict';
import test from 'node:test';

import { aclFindings, aclRuleRows, parseAclConfig, resolveAclRowKey } from '../../app/renderer/src/acl-editor.ts';
import type { ConfigValue } from '../../app/renderer/src/configuration.ts';

/** Two named ACLs, mixed permit/deny, mirroring the two idioms
 *  configs/samples/acl.conf.sample documents (deny-then-permit allowlist, and a
 *  single-rule ACL) -- the same shape control-plane/acl-model.test.ts uses. */
const VALUE: ConfigValue = [
  {
    name: 'trusted-nets',
    entries: [
      { key: 'deny', value: '0.0.0.0/0' },
      { key: 'permit', value: '10.0.0.0/8' },
      { key: 'permit', value: '192.168.0.0/16' },
    ],
  },
  { name: 'branch-offices', entries: [{ key: 'permit', value: '172.16.0.0/12' }] },
];

// ---------------------------------------------------------------- parseAclConfig

test('parseAclConfig returns undefined for "not read yet" rather than an empty list', () => {
  assert.equal(parseAclConfig(undefined), undefined);
});

test('parseAclConfig parses a real value into the same shape acl-model.parseAcl produces', () => {
  const model = parseAclConfig(VALUE);
  assert.equal(model?.length, 2);
  assert.equal(model?.[0]?.name, 'trusted-nets');
  assert.equal(model?.[0]?.rules.length, 3);
});

test('parseAclConfig throws on a rule this console could never have written itself', () => {
  const broken: ConfigValue = [{ name: 'broken', entries: [{ key: 'permit', value: 'not-an-address' }] }];
  assert.throws(() => parseAclConfig(broken), /is not a valid/);
});

// ---------------------------------------------------------------- aclRuleRows

test('aclRuleRows produces one row per rule, across every ACL, in file order', () => {
  const rows = aclRuleRows(VALUE);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((r) => [r[1], r[2]]), [
    ['deny', '0.0.0.0/0'],
    ['permit', '10.0.0.0/8'],
    ['permit', '192.168.0.0/16'],
    ['permit', '172.16.0.0/12'],
  ]);
});

test('aclRuleRows: every row names its own ACL in the first cell', () => {
  const rows = aclRuleRows(VALUE);
  assert.ok(rows[0]![0]!.startsWith('trusted-nets'));
  assert.ok(rows[1]![0]!.startsWith('trusted-nets'));
  assert.ok(rows[2]![0]!.startsWith('trusted-nets'));
  assert.ok(rows[3]![0]!.startsWith('branch-offices'));
});

test('aclRuleRows: every row key is unique, even across two rules with identical action and spec', () => {
  const duplicated: ConfigValue = [
    { name: 'dup', entries: [{ key: 'permit', value: '10.0.0.0/8' }, { key: 'permit', value: '10.0.0.0/8' }] },
  ];
  const rows = aclRuleRows(duplicated);
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0]![0], rows[1]![0]);
});

test('aclRuleRows returns an empty table for "not read yet", never an invented row', () => {
  assert.deepEqual(aclRuleRows(undefined), []);
});

test('aclRuleRows returns an empty table rather than throwing on a file that fails to parse', () => {
  const broken: ConfigValue = [{ name: 'broken', entries: [{ key: 'permit', value: 'not-an-address' }] }];
  assert.deepEqual(aclRuleRows(broken), []);
});

test('an empty acl.conf (present, no ACLs) produces an empty table, honestly', () => {
  assert.deepEqual(aclRuleRows([]), []);
});

// ---------------------------------------------------------------- resolveAclRowKey

test('resolveAclRowKey round-trips every row aclRuleRows built from the same value', () => {
  const rows = aclRuleRows(VALUE);
  const resolved = rows.map((r) => resolveAclRowKey(VALUE, r[0]!));
  assert.deepEqual(resolved, [
    { aclName: 'trusted-nets', ruleIndex: 0 },
    { aclName: 'trusted-nets', ruleIndex: 1 },
    { aclName: 'trusted-nets', ruleIndex: 2 },
    { aclName: 'branch-offices', ruleIndex: 0 },
  ]);
});

test('resolveAclRowKey refuses a key from a stale render once its global index no longer exists', () => {
  const rows = aclRuleRows(VALUE);
  const lastKey = rows[rows.length - 1]![0]!; // branch-offices' one rule
  // The file changed underneath it: branch-offices' rule was removed.
  const changed: ConfigValue = [VALUE[0]!];
  assert.equal(resolveAclRowKey(changed, lastKey), undefined);
});

test('resolveAclRowKey refuses a key whose global index now names a DIFFERENT rule -- the shift case', () => {
  // trusted-nets' second rule (globalIndex 1) is "permit 10.0.0.0/8".
  const rows = aclRuleRows(VALUE);
  const shiftedAwayKey = rows[1]!;
  assert.equal(shiftedAwayKey[1], 'permit');
  assert.equal(shiftedAwayKey[2], '10.0.0.0/8');
  // Now insert a new rule at the FRONT of trusted-nets. Every later rule's globalIndex
  // shifts down by one, so index 1 now names a DIFFERENT rule (the original deny) --
  // exactly the shape a stale context menu produces after somebody else's edit lands.
  // Without the belt-and-braces label check this resolves to the wrong rule silently.
  const shifted: ConfigValue = [
    { name: 'trusted-nets', entries: [{ key: 'permit', value: '203.0.113.0/24' }, ...VALUE[0]!.entries] },
    VALUE[1]!,
  ];
  assert.equal(resolveAclRowKey(shifted, shiftedAwayKey[0]!), undefined);
});

test('resolveAclRowKey refuses a key that never came from this function at all', () => {
  assert.equal(resolveAclRowKey(VALUE, 'not a real row key'), undefined);
  assert.equal(resolveAclRowKey(VALUE, 'trusted-nets — rule 1 · #999'), undefined);
});

test('resolveAclRowKey returns undefined for "not read yet"', () => {
  assert.equal(resolveAclRowKey(undefined, 'anything · #0'), undefined);
});

// ---------------------------------------------------------------- aclFindings

test('aclFindings surfaces analyse() findings across every named ACL, not just the first', () => {
  const risky: ConfigValue = [
    { name: 'wide-open', entries: [{ key: 'permit', value: '0.0.0.0/0' }] },
    { name: 'open-tail', entries: [{ key: 'deny', value: '10.0.0.0/8' }, { key: 'permit', value: '192.168.0.0/16' }] },
  ];
  const findings = aclFindings(risky);
  const kinds = new Set(findings.map((f) => f.kind));
  assert.ok(kinds.has('permit-everything'));
  assert.ok(kinds.has('open-tail'));
});

test('aclFindings is empty for a well-formed ACL that closes on an unambiguous deny', () => {
  const closed: ConfigValue = [
    { name: 'closed', entries: [
      { key: 'permit', value: '10.0.0.0/8' },
      { key: 'deny', value: '10.0.0.4/30' }, // a narrower carve-out of the permit above, not everything
    ] },
  ];
  assert.deepEqual(aclFindings(closed), []);
});

test('aclFindings is empty for "not read yet", never a fabricated warning', () => {
  assert.deepEqual(aclFindings(undefined), []);
});
