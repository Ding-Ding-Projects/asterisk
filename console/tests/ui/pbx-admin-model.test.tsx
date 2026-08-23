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
  assert.equal(EXPECTED_CONFIGURABLE_RESOURCES.length, 47);
  assert.deepEqual(missingConfigResources(), []);
  assert.deepEqual(coveredConfigResources(), [...EXPECTED_CONFIGURABLE_RESOURCES].sort());
});

test('catalogue carries every current FreePBX standard Applications module', () => {
  const ids = new Set(PBX_FEATURES.filter((feature) => feature.group === 'Applications').map((feature) => feature.id));
  for (const required of [
    'announcements', 'calendar-event-groups', 'calendar', 'callback', 'call-flow-control', 'call-recording',
    'conferences', 'directory', 'disa', 'extensions', 'follow-me', 'ivr', 'languages', 'misc-applications',
    'misc-destinations', 'missed-call-notification', 'paging', 'parking', 'queue-priorities', 'queues',
    'ring-groups', 'set-callerid', 'text-to-speech', 'time-conditions', 'time-groups', 'voicemail-blasting',
    'wake-up-calls',
  ]) assert.ok(ids.has(required), `missing Applications feature ${required}`);
});

test('catalogue carries every current FreePBX standard Connectivity module', () => {
  const ids = new Set(PBX_FEATURES.filter((feature) => feature.group === 'Connectivity').map((feature) => feature.id));
  for (const required of [
    'api', 'call-forwarding', 'call-waiting', 'dahdi-dids', 'dahdi-configs', 'dnd', 'firewall',
    'inbound-routes', 'outbound-routes', 'sipstation', 'sms-plus', 'sms-webhook', 'trunks', 'voip-innovations',
  ]) assert.ok(ids.has(required), `missing Connectivity feature ${required}`);
});

test('catalogue carries every current FreePBX standard Administration module', () => {
  const ids = new Set(PBX_FEATURES.filter((feature) => feature.group === 'Administration').map((feature) => feature.id));
  for (const required of [
    'administrators', 'asterisk-cli', 'backup', 'blacklist', 'bulk-config', 'callerid-lookup', 'certificates',
    'cid-superfecta', 'config-file-editor', 'contact-manager', 'custom-destinations', 'custom-extensions',
    'feature-codes', 'module-admin', 'presence-state', 'sound-languages', 'system-admin', 'system-recordings',
    'user-management', 'admin-voicemail',
  ]) assert.ok(ids.has(required), `missing Administration feature ${required}`);
});

test('catalogue carries every current FreePBX standard Reports module', () => {
  const ids = new Set(PBX_FEATURES.filter((feature) => feature.group === 'Reports').map((feature) => feature.id));
  for (const required of [
    'asterisk-info', 'asterisk-logfiles', 'cel', 'cdr', 'system-status', 'print-extensions', 'weak-password-detection',
  ]) assert.ok(ids.has(required), `missing Reports feature ${required}`);
});

test('catalogue carries every current FreePBX standard Settings module', () => {
  const ids = new Set(PBX_FEATURES.filter((feature) => feature.group === 'Settings').map((feature) => feature.id));
  for (const required of [
    'advanced', 'iax-settings', 'logfile-settings', 'ami-settings', 'ari-settings', 'sip-settings',
    'extension-settings', 'fax-settings', 'filestore', 'moh-settings', 'pin-sets', 'route-congestion',
    'tts-engines', 'voicemail-admin',
  ]) assert.ok(ids.has(required), `missing Settings feature ${required}`);
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
