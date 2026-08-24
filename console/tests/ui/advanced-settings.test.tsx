/**
 * The advanced-settings page contract (CORE-ADV-UI-001 through -004, -006, -007).
 *
 * The secret and read-only tests carry the weight. A settings page is the surface most
 * likely to render something it should not, and "hidden" and "read-only" are exactly the
 * two states that decay into decoration when nothing asserts them.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  changedKeys, impactOf, renderSettings, resetAll, restoreDefault, validateWrite,
  type SettingDefinition, type SettingValues,
} from '../../app/renderer/src/advanced-settings.ts';

const REGISTRY: readonly SettingDefinition[] = [
  { key: 'OUTBOUND_CID_UPDATE', group: 'Dialing', name: 'Show outbound caller ID', help: 'h',
    type: 'boolean', default: false, impact: 'reload' },
  { key: 'RECORDING_PRIORITY', group: 'Recording', name: 'Recording priority', help: 'h',
    type: 'integer', default: 10, min: 0, max: 20 },
  { key: 'MIXMON_FORMAT', group: 'Recording', name: 'Recording format', help: 'h',
    type: 'enum', default: 'wav', options: ['wav', 'gsm', 'ulaw'] },
  { key: 'MIXMON_DIR', group: 'Recording', name: 'Recording directory', help: 'h',
    type: 'path', default: '/var/spool/asterisk/monitor', impact: 'restart' },
  { key: 'AMI_SECRET', group: 'Security', name: 'Manager secret', help: 'h', type: 'secret', default: '' },
  { key: 'READONLY_ONE', group: 'Security', name: 'Locked thing', help: 'h', type: 'string',
    default: 'fixed', readOnly: true },
  { key: 'HIDDEN_ONE', group: 'Security', name: 'Hidden thing', help: 'h', type: 'string',
    default: 'x', hidden: true },
  { key: 'NEW_ASTERISK_ONLY', group: 'Dialing', name: 'Newer only', help: 'h', type: 'boolean',
    default: false, minAsteriskMajor: 21 },
  { key: 'NEEDS_MODULE', group: 'Dialing', name: 'Module gated', help: 'h', type: 'boolean',
    default: false, requiresModule: 'app_queue' },
];

const STORED = 'the-real-manager-secret';
const values: SettingValues = { RECORDING_PRIORITY: 15, AMI_SECRET: STORED };
const facts = { asteriskMajor: 22, loadedModules: ['app_queue'] };

const flat = (result: ReturnType<typeof renderSettings>) => result.groups.flatMap((g) => g.settings);
const find = (result: ReturnType<typeof renderSettings>, key: string) =>
  flat(result).find((s) => s.definition.key === key);

/* --- rendering and grouping (UI-001) ---------------------------------------- */

test('settings are grouped, and the registry order is kept rather than sorted', () => {
  /* Registry order is editorial; re-sorting scatters related settings apart. */
  const result = renderSettings(REGISTRY, values, facts);
  assert.deepEqual(result.groups.map((g) => g.title), ['Dialing', 'Recording', 'Security']);
});

test('a setting with no stored value shows its default', () => {
  assert.equal(find(renderSettings(REGISTRY, {}, facts), 'MIXMON_FORMAT')!.currentValue, 'wav');
});

test('a stored value that differs from the default is marked modified', () => {
  const result = renderSettings(REGISTRY, values, facts);
  assert.equal(find(result, 'RECORDING_PRIORITY')!.isModified, true);
  assert.equal(find(result, 'MIXMON_FORMAT')!.isModified, false);
});

test('a stored value equal to the default is not modified', () => {
  assert.equal(find(renderSettings(REGISTRY, { RECORDING_PRIORITY: 10 }, facts), 'RECORDING_PRIORITY')!.isModified, false);
});

test('restoring one default touches only that setting', () => {
  const next = restoreDefault(REGISTRY, values, 'RECORDING_PRIORITY') as SettingValues;
  assert.equal(next.RECORDING_PRIORITY, 10);
  assert.equal(next.AMI_SECRET, STORED);
});

test('restoring an unregistered setting is refused rather than silently ignored', () => {
  const result = restoreDefault(REGISTRY, values, 'NOT_A_SETTING');
  assert.ok('error' in result);
});

test('reset all restores every writable setting and leaves a locked one alone', () => {
  const next = resetAll(REGISTRY, { ...values, READONLY_ONE: 'tampered' });
  assert.equal(next.RECORDING_PRIORITY, 10);
  assert.equal(next.READONLY_ONE, 'tampered', 'a reset wrote a setting the policy forbids writing');
});

test('reset all reaches a read-only setting once an override is granted', () => {
  const next = resetAll(REGISTRY, { READONLY_ONE: 'tampered' }, { allowReadOnlyOverride: { reason: 'migration' } });
  assert.equal(next.READONLY_ONE, 'fixed');
});

test('the change list is what actually differs, not everything submitted', () => {
  assert.deepEqual(changedKeys(values, { RECORDING_PRIORITY: 15, MIXMON_FORMAT: 'gsm' }), ['MIXMON_FORMAT']);
});

/* --- secrets (UI-006) -------------------------------------------------------- */

test('a stored secret is never rendered, only reported as present', () => {
  /* The single most important assertion here. Anything on a rendered setting is walked
   * by the screen, exports and debug dumps at once. */
  const rendered = find(renderSettings(REGISTRY, values, facts), 'AMI_SECRET')!;
  assert.equal(rendered.currentValue, undefined);
  assert.equal(rendered.hasValue, true);
  assert.ok(!JSON.stringify(rendered).includes(STORED), 'the secret survives anywhere in the rendered setting');
});

test('no rendered setting anywhere carries the stored secret', () => {
  const result = renderSettings(REGISTRY, values, facts);
  assert.ok(!JSON.stringify(result).includes(STORED));
});

test('an unset secret is reported absent rather than defaulted to something', () => {
  const rendered = find(renderSettings(REGISTRY, {}, facts), 'AMI_SECRET')!;
  assert.equal(rendered.hasValue, false);
  assert.equal(rendered.currentValue, undefined);
});

test('a secret is never marked modified, since that would compare against its value', () => {
  assert.equal(find(renderSettings(REGISTRY, values, facts), 'AMI_SECRET')!.isModified, false);
});

test('a secret is validated without its value appearing in the message', () => {
  /* The rejected value is deliberately a distinctive string rather than something like
   * "short": the first version of this test used the latter and failed against its own
   * message, which reads as a leak and is a fixture colliding with the wording. */
  const rejected = 'Qx7pLm';
  const problems = validateWrite(REGISTRY, { AMI_SECRET: rejected }, facts);
  assert.equal(problems.length, 1);
  assert.ok(!problems[0].message.includes(rejected), 'the rejected secret was quoted back into the message');
  assert.match(problems[0].message, /too short/u);
});

test('a good secret validates', () => {
  assert.deepEqual(validateWrite(REGISTRY, { AMI_SECRET: 'a-long-enough-secret' }, facts), []);
});

/* --- read-only and hidden (UI-002, UI-003) ----------------------------------- */

test('a read-only setting renders but is locked', () => {
  const rendered = find(renderSettings(REGISTRY, {}, facts), 'READONLY_ONE')!;
  assert.equal(rendered.isLocked, true);
  assert.equal(rendered.currentValue, 'fixed', 'a read-only setting should still show its value');
});

test('writing a read-only setting is refused without an override', () => {
  const problems = validateWrite(REGISTRY, { READONLY_ONE: 'x' }, facts);
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /recorded reason/u);
});

test('an override unlocks it, and only alongside a reason', () => {
  const policy = { allowReadOnlyOverride: { reason: 'migrating from Core' } };
  assert.deepEqual(validateWrite(REGISTRY, { READONLY_ONE: 'x' }, facts, policy), []);
  assert.equal(find(renderSettings(REGISTRY, {}, facts, policy), 'READONLY_ONE')!.isLocked, false);
});

test('a hidden setting is withheld entirely rather than shown disabled', () => {
  /* Core shipped a hidden-setting preference that did nothing. A control that reads as
   * a control and is a decoration is worse than no control. */
  const result = renderSettings(REGISTRY, {}, facts);
  assert.equal(find(result, 'HIDDEN_ONE'), undefined);
  assert.ok(result.omitted.some((o) => o.key === 'HIDDEN_ONE'));
});

test('a hidden setting cannot be written just because it was submitted', () => {
  const problems = validateWrite(REGISTRY, { HIDDEN_ONE: 'x' }, facts);
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /not available on this target/u);
});

test('policy can admit hidden settings deliberately', () => {
  const result = renderSettings(REGISTRY, {}, facts, { showHidden: true });
  assert.ok(find(result, 'HIDDEN_ONE'));
  assert.deepEqual(validateWrite(REGISTRY, { HIDDEN_ONE: 'x' }, facts, { showHidden: true }), []);
});

/* --- version and module gating (UI-007) -------------------------------------- */

test('every omitted setting carries a reason, and the reason names the cause', () => {
  const result = renderSettings(REGISTRY, {}, { asteriskMajor: 18, loadedModules: [] });
  const keys = result.omitted.map((o) => o.key);
  assert.ok(keys.includes('NEW_ASTERISK_ONLY'));
  assert.ok(keys.includes('NEEDS_MODULE'));
  for (const omission of result.omitted) {
    assert.ok(omission.reason.length > 20, `${omission.key} was withheld with no usable reason`);
  }
  assert.match(result.omitted.find((o) => o.key === 'NEW_ASTERISK_ONLY')!.reason, /Asterisk 21/u);
  assert.match(result.omitted.find((o) => o.key === 'NEEDS_MODULE')!.reason, /app_queue/u);
});

test('a version-gated setting appears on a target new enough for it', () => {
  assert.ok(find(renderSettings(REGISTRY, {}, { asteriskMajor: 22, loadedModules: ['app_queue'] }), 'NEW_ASTERISK_ONLY'));
});

test('an unknown target version gates nothing rather than hiding everything', () => {
  /* Guessing "too old" from a missing fact would empty the page on any target whose
   * version has not been read yet, which reads as the console being broken. */
  const result = renderSettings(REGISTRY, {}, {});
  assert.ok(find(result, 'NEW_ASTERISK_ONLY'));
  assert.ok(find(result, 'NEEDS_MODULE'));
});

/* --- type, range and path validation (UI-004) -------------------------------- */

test('an unregistered key is refused rather than written through', () => {
  assert.match(validateWrite(REGISTRY, { NOT_REAL: 1 }, facts)[0].message, /not a registered setting/u);
});

test('each type refuses the wrong shape', () => {
  const cases: ReadonlyArray<readonly [string, unknown]> = [
    ['OUTBOUND_CID_UPDATE', 'yes'], ['RECORDING_PRIORITY', '15'],
    ['RECORDING_PRIORITY', 1.5], ['MIXMON_FORMAT', 'flac'], ['MIXMON_DIR', 42],
  ];
  for (const [key, value] of cases) {
    assert.equal(validateWrite(REGISTRY, { [key]: value } as SettingValues, facts).length, 1,
      `${key} accepted ${JSON.stringify(value)}`);
  }
});

test('an integer is held to both ends of its range, inclusively', () => {
  assert.deepEqual(validateWrite(REGISTRY, { RECORDING_PRIORITY: 0 }, facts), []);
  assert.deepEqual(validateWrite(REGISTRY, { RECORDING_PRIORITY: 20 }, facts), []);
  assert.equal(validateWrite(REGISTRY, { RECORDING_PRIORITY: -1 }, facts).length, 1);
  assert.equal(validateWrite(REGISTRY, { RECORDING_PRIORITY: 21 }, facts).length, 1);
});

test('an enum names its allowed values when it refuses one', () => {
  const problems = validateWrite(REGISTRY, { MIXMON_FORMAT: 'flac' }, facts);
  assert.match(problems[0].message, /wav, gsm, ulaw/u);
});

test('a path must be absolute and must not traverse', () => {
  /* A traversal segment in a configured path is how a setting becomes a way to write
   * somewhere nobody intended. */
  assert.deepEqual(validateWrite(REGISTRY, { MIXMON_DIR: '/var/spool/recordings' }, facts), []);
  assert.equal(validateWrite(REGISTRY, { MIXMON_DIR: 'relative/path' }, facts).length, 1);
  assert.equal(validateWrite(REGISTRY, { MIXMON_DIR: '/var/../etc/passwd' }, facts).length, 1);
  assert.equal(validateWrite(REGISTRY, { MIXMON_DIR: '  ' }, facts).length, 1);
});

test('every problem is reported at once rather than one per submit', () => {
  const problems = validateWrite(REGISTRY, {
    RECORDING_PRIORITY: 99, MIXMON_FORMAT: 'flac', MIXMON_DIR: 'nope',
  }, facts);
  assert.equal(problems.length, 3);
});

test('a wholly valid submission reports nothing', () => {
  assert.deepEqual(validateWrite(REGISTRY, {
    OUTBOUND_CID_UPDATE: true, RECORDING_PRIORITY: 5, MIXMON_FORMAT: 'gsm',
    MIXMON_DIR: '/var/spool/recordings',
  }, facts), []);
});

/* --- the apply preview -------------------------------------------------------- */

test('the impact preview names the real keys rather than a count', () => {
  const impact = impactOf(REGISTRY, ['OUTBOUND_CID_UPDATE']);
  assert.deepEqual(impact.keys, ['OUTBOUND_CID_UPDATE']);
  assert.equal(impact.needsReload, true);
  assert.equal(impact.needsRestart, false);
});

test('a restart outranks a reload, so the preview never understates the interruption', () => {
  const impact = impactOf(REGISTRY, ['OUTBOUND_CID_UPDATE', 'MIXMON_DIR']);
  assert.equal(impact.needsRestart, true);
  assert.equal(impact.needsReload, false);
});

test('a change needing neither says so, and still carries the backup warning', () => {
  const impact = impactOf(REGISTRY, ['RECORDING_PRIORITY']);
  assert.equal(impact.needsReload, false);
  assert.equal(impact.needsRestart, false);
  assert.ok(impact.backupWarning.length > 20);
});
