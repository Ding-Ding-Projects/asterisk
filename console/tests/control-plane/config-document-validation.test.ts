import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blockingConfigFindings, validateConfigDocument } from '../../control-plane/config-document-validation.js';
import { StructuredConfigPlanner } from '../../control-plane/config-transaction.js';
import type { ConfigValue } from '../../control-plane/wsl-config-transport.js';

const ACL_BAD: ConfigValue = [
  { name: 'trusted', entries: [{ key: 'permit', value: 'carrier.example.com' }] },
];

const FEATURES_BAD: ConfigValue = [
  { name: 'general', entries: [{ key: 'atxferdropcall', value: 'sometimes' }] },
];

test('invalid ACL syntax is a blocking typed-model error', () => {
  const findings = blockingConfigFindings('/etc/asterisk/acl.conf', ACL_BAD);
  assert.equal(findings.length, 1);
  assert.equal(findings[0]!.severity, 'error');
  assert.match(findings[0]!.message, /hostname/u);
});

test('dangerous-but-valid ACL analysis is surfaced as warning rather than fabricated syntax failure', () => {
  const findings = validateConfigDocument('/etc/asterisk/acl.conf', [
    { name: 'wide-open', entries: [{ key: 'permit', value: '0.0.0.0/0' }] },
  ]);
  assert.ok(findings.some((finding) => finding.severity === 'warning' && /permits every address/u.test(finding.message)));
  assert.equal(findings.some((finding) => finding.severity === 'error'), false);
});

test('feature-code model errors block a plan', () => {
  const findings = blockingConfigFindings('/etc/asterisk/features.conf', FEATURES_BAD);
  assert.ok(findings.some((finding) => /atxferdropcall must be yes or no/u.test(finding.message)));
});

test('resources with no typed model are not assigned invented semantic rules', () => {
  const value: ConfigValue = [{ name: 'general', entries: [{ key: 'whatever', value: 'target-specific' }] }];
  assert.deepEqual(validateConfigDocument('/etc/asterisk/calendar.conf', value), []);
});

test('planner refuses a typed-model error before touching the target', async () => {
  let reads = 0;
  const planner = new StructuredConfigPlanner(() => new Date('2026-08-23T06:00:00Z'));
  await assert.rejects(
    planner.createPlan(
      'bad-plan',
      'target',
      [{ resource: '/etc/asterisk/features.conf', value: FEATURES_BAD }],
      { read: async () => { reads += 1; return []; } },
    ),
    /Configuration validation failed.*atxferdropcall must be yes or no/u,
  );
  assert.equal(reads, 0);
});

test('planner still reads and diffs a structurally valid document', async () => {
  let reads = 0;
  const desired: ConfigValue = [{ name: 'general', entries: [{ key: 'atxferdropcall', value: 'no' }] }];
  const planner = new StructuredConfigPlanner(() => new Date('2026-08-23T06:00:00Z'));
  const plan = await planner.createPlan(
    'good-plan',
    'target',
    [{ resource: '/etc/asterisk/features.conf', value: desired }],
    { read: async () => { reads += 1; return []; } },
  );
  assert.equal(reads, 1);
  assert.equal(plan.diffs.length, 1);
});
