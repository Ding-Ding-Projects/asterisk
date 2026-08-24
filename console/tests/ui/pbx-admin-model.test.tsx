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

test('PBX Admin catalogue covers every allowlisted writable Asterisk resource', () => {
  assert.equal(EXPECTED_CONFIGURABLE_RESOURCES.length, 91);
  assert.deepEqual(missingConfigResources(), []);
  assert.deepEqual(coveredConfigResources(), [...EXPECTED_CONFIGURABLE_RESOURCES].sort());
});

test('catalogue carries the complete, hand-written Applications Standard Module list (exhaustive)', () => {
  const required = [
    'amd', 'announcements', 'calendar', 'calendar-event-groups', 'call-flow-control', 'call-recording', 'callback',
    'conferences', 'dictate', 'directory', 'disa', 'dynamic-routes', 'extensions', 'follow-me', 'info-services',
    'ivr', 'languages', 'misc-applications', 'misc-destinations', 'missed-call-notification', 'paging', 'parking',
    'queue-priorities', 'queues', 'ring-groups', 'set-callerid', 'text-to-speech', 'time-conditions', 'time-groups',
    'voicemail-blasting', 'wake-up-calls',
  ];
  const ids = PBX_FEATURES.filter((feature) => feature.group === 'Applications').map((feature) => feature.id).sort();
  assert.deepEqual(ids, [...required].sort(), 'an Applications module was added or removed without updating this hand-written list');
});

test('catalogue carries the complete, hand-written Connectivity Standard Module list (exhaustive)', () => {
  const required = [
    'api', 'bandwidth', 'call-forwarding', 'call-waiting', 'custom-contexts', 'dahdi-configs', 'dahdi-dids', 'dnd',
    'dundi', 'firewall', 'iax-trunks', 'inbound-routes', 'nat', 'outbound-routes', 'sipstation', 'sla', 'trunks',
    'vitelity', 'voip-innovations',
  ];
  const ids = PBX_FEATURES.filter((feature) => feature.group === 'Connectivity').map((feature) => feature.id).sort();
  assert.deepEqual(ids, [...required].sort(), 'a Connectivity module was added or removed without updating this hand-written list');
});

test('catalogue carries the complete, hand-written Administration Standard Module list (exhaustive)', () => {
  const required = [
    'accountcode-preserve', 'admin-voicemail', 'administrators', 'adsi', 'allowlist', 'asterisk-cli', 'backup', 'freepbx-catalog',
    'blacklist', 'bulk-config', 'callerid-lookup', 'certificates', 'cid-superfecta', 'config-file-editor',
    'contact-manager', 'custom-apps-registration', 'custom-destinations', 'custom-extensions', 'feature-codes',
    'geolocation', 'module-admin', 'monitoring', 'notifications', 'outbound-cnam', 'phonebook', 'phoneprov',
    'presence-state', 'realtime', 'rest-api', 'sound-languages', 'stir-shaken', 'system-admin', 'system-recordings',
    'user-management', 'xmpp',
  ];
  const ids = PBX_FEATURES.filter((feature) => feature.group === 'Administration').map((feature) => feature.id).sort();
  assert.deepEqual(ids, [...required].sort(), 'an Administration module was added or removed without updating this hand-written list');
});

test('catalogue carries the complete, hand-written Reports Standard Module list (exhaustive)', () => {
  const required = [
    'asterisk-info', 'asterisk-logfiles', 'cdr', 'cel', 'fax', 'print-extensions', 'system-status',
    'weak-password-detection',
  ];
  const ids = PBX_FEATURES.filter((feature) => feature.group === 'Reports').map((feature) => feature.id).sort();
  assert.deepEqual(ids, [...required].sort(), 'a Reports module was added or removed without updating this hand-written list');
});

test('catalogue carries the complete, hand-written Settings Standard Module list (exhaustive)', () => {
  const required = [
    'advanced', 'ami-settings', 'ari-settings', 'extension-settings', 'fax-settings', 'filestore', 'iax-settings',
    'logfile-settings', 'moh-settings', 'pin-sets', 'route-congestion', 'rtp', 'sip-settings', 'tts-engines',
    'voicemail-admin',
  ];
  const ids = PBX_FEATURES.filter((feature) => feature.group === 'Settings').map((feature) => feature.id).sort();
  assert.deepEqual(ids, [...required].sort(), 'a Settings module was added or removed without updating this hand-written list');
});

test('catalogue total feature count matches the hand-written Standard Module inventory', () => {
  assert.equal(PBX_FEATURES.length, 108);
});

test('catalogue never embeds sample target rows or configured values', () => {
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
