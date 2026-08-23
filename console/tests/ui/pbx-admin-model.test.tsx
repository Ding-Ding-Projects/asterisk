import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ConfigValue } from '../../app/renderer/src/configuration';
import {
  EXPECTED_CONFIGURABLE_RESOURCES,
  PBX_FEATURES,
  addEntry,
  addSection,
  coveredConfigResources,
  missingConfigResources,
  removeEntry,
  removeSection,
  updateEntry,
  updateSectionName,
  validateConfigValue,
} from '../../app/renderer/src/pbx-admin-model';

test('advanced PBX catalogue covers every allowlisted writable Asterisk resource', () => {
  assert.equal(EXPECTED_CONFIGURABLE_RESOURCES.length, 41);
  assert.deepEqual(missingConfigResources(), []);
  assert.deepEqual(coveredConfigResources(), [...EXPECTED_CONFIGURABLE_RESOURCES].sort());
});

test('catalogue exposes the major FreePBX administration domains without sample target data', () => {
  const ids = new Set(PBX_FEATURES.map((feature) => feature.id));
  for (const required of [
    'extensions', 'ring-groups', 'ivr', 'queues', 'voicemail', 'conferences', 'time-conditions',
    'pjsip-trunks', 'iax-trunks', 'dahdi', 'inbound-routes', 'outbound-routes',
    'acl', 'certificates', 'stir-shaken', 'backup', 'phoneprov', 'realtime', 'monitoring',
    'cdr', 'cel', 'fax', 'rtp',
  ]) {
    assert.ok(ids.has(required), `missing feature ${required}`);
  }

  // The catalogue may name resources and administrator tasks, but it must not carry a
  // pretend live configuration value that could be mistaken for a target reading.
  for (const feature of PBX_FEATURES) {
    assert.equal('value' in feature, false);
    assert.equal('rows' in feature, false);
  }
});

test('structured editor validation refuses ambiguous INI shapes before a plan is requested', () => {
  const invalid: ConfigValue = [
    {
      name: 'bad[section]',
      entries: [
        { key: '', value: 'x' },
        { key: 'good', value: 'two\nlines' },
        { key: 'bad=key', value: 'value' },
      ],
    },
  ];
  const issues = validateConfigValue(invalid);
  assert.equal(issues.length, 4);
  assert.ok(issues.some((issue) => issue.message.includes('brackets')));
  assert.ok(issues.some((issue) => issue.message.includes('cannot be empty')));
  assert.ok(issues.some((issue) => issue.message.includes('line breaks')));
  assert.ok(issues.some((issue) => issue.message.includes('cannot contain =')));
});

test('structured editor helpers are immutable and preserve repeated settings', () => {
  const original: ConfigValue = [
    {
      name: 'endpoint',
      entries: [
        { key: 'allow', value: 'ulaw' },
        { key: 'allow', value: 'g722' },
      ],
    },
  ];

  const renamed = updateSectionName(original, 0, 'office-phone');
  assert.equal(original[0]!.name, 'endpoint');
  assert.equal(renamed[0]!.name, 'office-phone');

  const changed = updateEntry(renamed, 0, 1, { value: 'opus' });
  assert.deepEqual(changed[0]!.entries, [
    { key: 'allow', value: 'ulaw' },
    { key: 'allow', value: 'opus' },
  ]);
  assert.deepEqual(original[0]!.entries, [
    { key: 'allow', value: 'ulaw' },
    { key: 'allow', value: 'g722' },
  ]);

  const withEntry = addEntry(changed, 0);
  assert.equal(withEntry[0]!.entries.length, 3);
  const withoutEntry = removeEntry(withEntry, 0, 2);
  assert.equal(withoutEntry[0]!.entries.length, 2);

  const withSection = addSection(withoutEntry, 'aor');
  assert.equal(withSection.length, 2);
  assert.equal(addSection(withSection, 'aor').length, 2, 'duplicate sections are refused by the helper');
  assert.equal(addSection(withSection, 'bad[name]').length, 2, 'ambiguous section names are refused by the helper');
  assert.equal(removeSection(withSection, 1).length, 1);
});
