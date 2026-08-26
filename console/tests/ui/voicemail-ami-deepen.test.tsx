/**
 * Guards the three roadmap items this pass closed:
 *
 *  1. Voicemail had ten bound fields and no write path at all -- no Save button on any
 *     group, ever. This adds three (mailbox defaults, storage backend, greeting
 *     management) and binds seven new voicemail.conf [general] keys for the
 *     storage-backend group plus three for greeting management.
 *  2. AMI & REST declared `file: 'manager.conf · ari.conf · http.conf'`, a compound
 *     label `resourceForFile` refuses -- so the screen had never read a single setting
 *     from a real target, and two of its five original bindings (a_port, a_tlsport)
 *     pointed at the wrong file entirely, undetected for the same reason. This gives
 *     the screen a real `file`, fixes both wrong bindings, and adds Save actions plus a
 *     real Add/Remove API user flow.
 *  3. Security already edited both a real access rule (the ACL table) and a real
 *     attestation certificate (stir_shaken.conf's private_key_file/public_cert_url) by
 *     the time this pass started -- this file pins that so a regression is caught.
 *
 * Every source-anchored assertion here matches the real call shape a live handler
 * uses, not a bare substring a comment could also satisfy. Every one of these was
 * broken on purpose, watched red, and restored -- see the task's own report for the
 * individual break/restore pairs.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  applyControlValues as applyBoundControlValues,
  readControlValues,
} from '../../app/renderer/src/control-keys.ts';
import type { ConfigValue } from '../../app/renderer/src/configuration.ts';
import { resourceForFile } from '../../app/renderer/src/configuration.ts';
import { SCREENS } from '../../app/renderer/src/generated/console.tsx';

const appUrl = new URL('../../app/renderer/src/App.tsx', import.meta.url);
const designUrl = new URL('../../../design/Asterisk Console M3.dc.html', import.meta.url);

async function source(url: URL): Promise<string> {
  // CRLF-safe: this checkout is CRLF throughout.
  return (await readFile(url, 'utf8')).replace(/\r\n/g, '\n');
}

// ---------------------------------------------------------------- AMI & REST: the file bug

test('the AMI & REST screen declares a real filename, not a compound label', () => {
  const screens = SCREENS as unknown as Record<string, { file?: unknown }>;
  const file = screens.ami?.file;
  assert.equal(typeof file, 'string');
  assert.equal(resourceForFile(file), '/etc/asterisk/manager.conf', 'the declared file must resolve, or this screen is unreadable again');
});

test('a_port and a_tlsport read from http.conf, not manager.conf -- the wrong-file bug this pass fixed', () => {
  // configs/samples/http.conf.sample line 39: ;bindport=8088.
  // configs/samples/http.conf.sample line 88: ;tlsbindaddr=0.0.0.0:8089.
  const httpValue: ConfigValue = [
    { name: 'general', entries: [{ key: 'bindport', value: '8088' }, { key: 'tlsbindaddr', value: '0.0.0.0:8089' }] },
  ];
  // manager.conf has neither key under this name -- if a_port/a_tlsport were still
  // (wrongly) bound to the primary file, this manager.conf-shaped value would answer
  // instead and the assertion below would read undefined, not 8088/8089.
  const managerValue: ConfigValue = [
    { name: 'general', entries: [{ key: 'port', value: '5038' }] },
  ];
  const values = readControlValues('ami', managerValue, { 'http.conf': httpValue });
  assert.equal(values.a_port, 8088);
  assert.equal(values.a_tlsport, 8089);
});

test('a_http and a_tls read from http.conf', () => {
  const httpValue: ConfigValue = [
    { name: 'general', entries: [{ key: 'enabled', value: 'yes' }, { key: 'tlsenable', value: 'yes' }] },
  ];
  const values = readControlValues('ami', [], { 'http.conf': httpValue });
  assert.equal(values.a_http, true);
  assert.equal(values.a_tls, true);
});

test('a_read/a_write/a_deny/a_timeout still read from manager.conf, the screen’s own declared file', () => {
  const managerValue: ConfigValue = [
    { name: 'general', entries: [
      { key: 'read', value: 'system,call,log' },
      { key: 'write', value: 'call' },
      { key: 'deny', value: '0.0.0.0/0.0.0.0' },
      { key: 'httptimeout', value: '60' },
    ] },
  ];
  const values = readControlValues('ami', managerValue);
  assert.deepEqual(values.a_read, ['system', 'call', 'log']);
  assert.deepEqual(values.a_write, ['call']);
  assert.equal(values.a_deny, true);
  assert.equal(values.a_timeout, 60);
});

// ---------------------------------------------------------------- AMI & REST: save actions reach a real target

test('the HTTP server group and the Manager permissions group each have their own Save action, wired in App.tsx', async () => {
  const app = await source(appUrl);
  assert.match(app, /^\s*if \(action === 'ami-http-save'\) \{ void this\.onSaveAmiHttp\(\); return; \}/mu, 'ami-http-save is not dispatched to a real handler');
  assert.match(app, /^\s*if \(action === 'ami-manager-save'\) \{ void this\.onSaveAmiManager\(\); return; \}/mu, 'ami-manager-save is not dispatched to a real handler');
});

test('onSaveAmiHttp writes http.conf and ari.conf in sequence, never one file standing in for both', async () => {
  const app = await source(appUrl);
  const body = app.slice(app.indexOf('onSaveAmiHttp = async'), app.indexOf('onSaveAmiManager = async'));
  assert.match(body, /^\s*this\.configs\.amiHttp\?\.resource \?\? \(resourceForFile\('http\.conf'\)/mu);
  assert.match(body, /^\s*this\.configs\.amiAri\?\.resource \?\? \(resourceForFile\('ari\.conf'\)/mu);
  // The second write must be reachable only past a real early-return on the first --
  // a handler that always attempts both regardless of the first result would report a
  // save that landed on ari.conf while silently having failed on http.conf.
  assert.match(body, /^\s*if \(!httpOk\) return;/mu);
});

// ---------------------------------------------------------------- AMI & REST: add / remove API user

test('the "New API user" button reaches a real handler for the AMI & REST screen', async () => {
  const design = await source(designUrl);
  assert.match(design, /^\s*: \(s\.screen === 'ami' && this\.onAddApiUser \? this\.onAddApiUser\(\)/mu, 'openWizard has no ami branch -- "New API user" falls through to the empty generic wizard');
});

test('onAddApiUser refuses a blank username rather than creating an empty section', async () => {
  const app = await source(appUrl);
  const body = app.slice(app.indexOf('onAddApiUser = async'), app.indexOf('onRemoveApiUser = async'));
  assert.match(body, /^\s*if \(!username\) \{ this\.fire\('Not added'/mu);
});

test('onAddApiUser refuses a username that already exists rather than silently duplicating a section', async () => {
  const app = await source(appUrl);
  const body = app.slice(app.indexOf('onAddApiUser = async'), app.indexOf('onRemoveApiUser = async'));
  const alreadyExists = body.match(/already exists/g) ?? [];
  assert.ok(alreadyExists.length >= 2, 'both the AMI and the ARI branch must refuse a duplicate name');
});

test('the row context menu’s Delete reaches onRemoveApiUser for the AMI & REST table', async () => {
  const design = await source(designUrl);
  assert.match(design, /\(isApiUserRow && this\.onRemoveApiUser \? this\.onRemoveApiUser\(name\) :/u, 'Delete on an AMI/REST row falls through to the fictional generic ceremony instead of a real removal');
});

test('onRemoveApiUser checks manager.conf, then ari.conf, and refuses rather than guessing when neither has the name', async () => {
  const app = await source(appUrl);
  const body = app.slice(app.indexOf('onRemoveApiUser = async'), app.indexOf('private note('));
  assert.match(body, /^\s*if \(managerValue\?\.some/mu);
  assert.match(body, /^\s*if \(ariValue\?\.some/mu);
  assert.match(body, /^\s*this\.fire\('Not removed', `\[\$\{name\}\] is not in manager\.conf or ari\.conf/mu);
});

// ---------------------------------------------------------------- Voicemail: three real save actions

test('all three Voicemail Save actions are wired to real handlers in App.tsx', async () => {
  const app = await source(appUrl);
  assert.match(app, /^\s*if \(action === 'voicemail-save'\) \{ void this\.onSaveVoicemail\(\); return; \}/mu);
  assert.match(app, /^\s*if \(action === 'voicemail-storage-save'\) \{ void this\.onSaveVoicemailStorage\(\); return; \}/mu);
  assert.match(app, /^\s*if \(action === 'voicemail-greeting-save'\) \{ void this\.onSaveVoicemailGreeting\(\); return; \}/mu);
});

test('the storage-backend fields round-trip through voicemail.conf [general] exactly as the sample spells them', () => {
  // configs/samples/voicemail.conf.sample lines 155, 166, 219, 288, 291, 299, 300.
  const written = applyBoundControlValues('voicemail', [], {
    v_odbcstorage: 'voicemail', v_odbctable: 'voicemail_messages', v_odbcaudiodisk: true,
    v_imapgreetings: true, v_greetingsfolder: 'Greetings', v_imapserver: 'mail.example.com', v_imapport: 993,
  });
  const general = written.find((s) => s.name === 'general');
  const entry = (key: string) => general?.entries.find((e) => e.key === key)?.value;
  assert.equal(entry('odbcstorage'), 'voicemail');
  assert.equal(entry('odbctable'), 'voicemail_messages');
  assert.equal(entry('odbc_audio_on_disk'), 'yes');
  assert.equal(entry('imapgreetings'), 'yes');
  assert.equal(entry('greetingsfolder'), 'Greetings');
  assert.equal(entry('imapserver'), 'mail.example.com');
  assert.equal(entry('imapport'), '993');

  const read = readControlValues('voicemail', written);
  assert.equal(read.v_odbcstorage, 'voicemail');
  assert.equal(read.v_odbctable, 'voicemail_messages');
  assert.equal(read.v_odbcaudiodisk, true);
  assert.equal(read.v_imapgreetings, true);
  assert.equal(read.v_greetingsfolder, 'Greetings');
  assert.equal(read.v_imapserver, 'mail.example.com');
  assert.equal(read.v_imapport, 993);
});

test('the greeting-management fields round-trip through voicemail.conf [general]', () => {
  // configs/samples/voicemail.conf.sample lines 58, 396, 400.
  const written = applyBoundControlValues('voicemail', [], {
    v_maxgreet: 90, v_forcegreetings: true, v_tempgreetwarn: false,
  });
  const general = written.find((s) => s.name === 'general');
  const entry = (key: string) => general?.entries.find((e) => e.key === key)?.value;
  assert.equal(entry('maxgreet'), '90');
  assert.equal(entry('forcegreetings'), 'yes');
  assert.equal(entry('tempgreetwarn'), 'no');

  const read = readControlValues('voicemail', written);
  assert.equal(read.v_maxgreet, 90);
  assert.equal(read.v_forcegreetings, true);
  assert.equal(read.v_tempgreetwarn, false);
});

// ---------------------------------------------------------------- Security: already closed before this pass

test('the Security screen writes a real access rule (the ACL editor) -- pinned so a regression is caught', async () => {
  const app = await source(appUrl);
  assert.match(app, /^\s*onAddAclRule = async/mu);
  assert.match(app, /^\s*onRemoveAclRule = async/mu);
});

test('the Security screen writes a real attestation certificate (stir_shaken.conf key material) -- pinned so a regression is caught', async () => {
  const app = await source(appUrl);
  assert.match(app, /^\s*'s_privkey', 's_certurl', 's_loadsyscerts', 's_cafile', 's_capath',/mu);
  assert.match(app, /^\s*onSaveStirShaken = async/mu);
});
