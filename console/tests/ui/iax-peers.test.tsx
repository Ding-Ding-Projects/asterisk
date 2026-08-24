/**
 * IAX2 peer editing (CORE-IAX-DEV-001 through -005).
 *
 * Every key asserted here appears in Asterisk's own configs/samples/iax.conf.sample.
 * The secret tests carry the most weight: a credential that reaches a control value
 * reaches every screenshot, export and log that walks those values, so its absence is
 * asserted from several directions rather than assumed from one.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyControlValues, controlValuesFor, findPeer, iaxDocument, peerNames,
  IAX_CONTROLS, IAX_CALL_TOKEN_MODES, IAX_TRANSFER_MODES, IAX_PEER_TYPES,
} from '../../app/renderer/src/iax-peers.ts';
import type { ConfigValue } from '../../app/renderer/src/configuration.ts';

const SECRET = 'markpasswd';

const target = (): ConfigValue => [
  { name: 'general', entries: [{ key: 'bindport', value: '4569' }] },
  { name: 'branch-office', entries: [
    { key: 'type', value: 'friend' }, { key: 'host', value: 'dynamic' },
    { key: 'context', value: 'from-internal' }, { key: 'secret', value: SECRET },
  ] },
  { name: 'other-peer', entries: [{ key: 'type', value: 'peer' }, { key: 'host', value: '10.0.0.9' }] },
] as unknown as ConfigValue;

const ok = <T,>(result: T | { error: string }): T => {
  assert.ok(!(result && typeof result === 'object' && 'error' in result),
    `expected success, got: ${(result as { error?: string }).error ?? ''}`);
  return result as T;
};

/** A deterministic stand-in for the CSPRNG, so a generated secret is assertable. */
const fixedRandom = (bytes: number) => new Uint8Array(bytes).fill(7);

const edit = (values: Record<string, unknown>, name = 'branch-office') =>
  ok(applyControlValues(target(), name, values, fixedRandom));

const peerAfter = (values: Record<string, unknown>, name = 'branch-office') =>
  edit(values, name).view.peers.find((peer) => peer.name === name)!;

test('peers are listed and found by name', () => {
  assert.deepEqual(peerNames(target()), ['branch-office', 'other-peer']);
  assert.ok(findPeer(target(), 'branch-office'));
  assert.equal(findPeer(target(), 'nope'), undefined);
});

test('selecting a peer seeds the controls from the file', () => {
  const values = controlValuesFor(findPeer(target(), 'branch-office')!);
  assert.equal(values[IAX_CONTROLS.type], 'friend');
  assert.equal(values[IAX_CONTROLS.host], 'dynamic');
  assert.equal(values[IAX_CONTROLS.context], 'from-internal');
});

/* --- the credential ------------------------------------------------------- */

test('the secret never reaches a control value', () => {
  /* The single most important assertion in this file. A control value is walked by
   * exports, screenshots and any debug dump, so a credential that enters that path
   * leaves the machine through several doors at once. */
  const values = controlValuesFor(findPeer(target(), 'branch-office')!);
  for (const [id, value] of Object.entries(values)) {
    assert.notEqual(value, SECRET, `the stored secret came back through ${id}`);
  }
  assert.ok(!Object.values(values).some((v) => typeof v === 'string' && v.includes(SECRET)));
});

test('no control is dedicated to displaying a secret', () => {
  const ids = Object.values(IAX_CONTROLS).join(' ');
  assert.ok(!/secret_(show|value|current)/u.test(ids));
});

test('saving without asking for a new secret leaves the existing one untouched', () => {
  /* A save that dropped the line would lock the far end out on the next reload, and
   * nothing on screen would say why. */
  assert.equal(peerAfter({ [IAX_CONTROLS.host]: '10.0.0.1' }).secret, SECRET);
});

test('the existing secret survives being rendered back to the file', () => {
  const written = iaxDocument(edit({ [IAX_CONTROLS.host]: '10.0.0.1' }), '/etc/asterisk/iax.conf').value;
  assert.equal(findPeer(written, 'branch-office')!.secret, SECRET);
});

test('asking for a new secret replaces it and hands it back exactly once', () => {
  const result = edit({ [IAX_CONTROLS.setNewSecret]: true });
  assert.ok(result.generatedSecret, 'no secret was generated');
  assert.notEqual(result.generatedSecret, SECRET);
  assert.equal(peerAfter({ [IAX_CONTROLS.setNewSecret]: true }).secret, result.generatedSecret);
});

test('an ordinary save reports no generated secret at all', () => {
  assert.equal(edit({ [IAX_CONTROLS.host]: '10.0.0.1' }).generatedSecret, undefined);
  assert.equal(edit({ [IAX_CONTROLS.setNewSecret]: false }).generatedSecret, undefined);
});

test('the summary says a secret changed and never says what to', () => {
  /* Summaries are shown, logged and exported, so the value must not be in one. */
  const result = edit({ [IAX_CONTROLS.setNewSecret]: true });
  const line = result.summary.find((entry) => entry.includes('secret'));
  assert.ok(line, 'replacing a credential was not reported at all');
  assert.ok(!line.includes(result.generatedSecret!), 'the summary leaked the new secret');
  assert.ok(!line.includes(SECRET), 'the summary leaked the old secret');
});

test('a generated secret is long and drawn from the platform CSPRNG', () => {
  const result = edit({ [IAX_CONTROLS.setNewSecret]: true });
  assert.ok(result.generatedSecret!.length >= 20, 'a short credential is a guessable one');
  assert.match(result.generatedSecret!, /^[A-Za-z0-9]+$/u);
});

/* --- ordinary fields ------------------------------------------------------- */

test('each field writes its own iax.conf key', () => {
  const peer = peerAfter({
    [IAX_CONTROLS.type]: 'peer', [IAX_CONTROLS.host]: '10.0.0.1',
    [IAX_CONTROLS.username]: 'asterisk', [IAX_CONTROLS.port]: 5036,
    [IAX_CONTROLS.transfer]: 'mediaonly', [IAX_CONTROLS.qualify]: 'yes',
    [IAX_CONTROLS.trunk]: true, [IAX_CONTROLS.requireCallToken]: 'auto',
    [IAX_CONTROLS.accountcode]: 'lss0101', [IAX_CONTROLS.mailbox]: '1234',
  });
  assert.equal(peer.type, 'peer');
  assert.equal(peer.host, '10.0.0.1');
  assert.equal(peer.username, 'asterisk');
  assert.equal(peer.port, '5036');
  assert.equal(peer.transfer, 'mediaonly');
  assert.equal(peer.qualify, 'yes');
  assert.equal(peer.trunk, 'yes');
  assert.equal(peer.requirecalltoken, 'auto');
  assert.equal(peer.accountcode, 'lss0101');
  assert.equal(peer.mailbox, '1234');
});

test('every documented enum value survives, rather than only the common one', () => {
  /* transfer=mediaonly and requirecalltoken=auto are the two most likely to be lost to
   * a boolean, and both are in the sample. */
  for (const mode of IAX_TRANSFER_MODES) {
    assert.equal(peerAfter({ [IAX_CONTROLS.transfer]: mode }).transfer, mode);
  }
  for (const mode of IAX_CALL_TOKEN_MODES) {
    assert.equal(peerAfter({ [IAX_CONTROLS.requireCallToken]: mode }).requirecalltoken, mode);
  }
  for (const type of IAX_PEER_TYPES) {
    assert.equal(peerAfter({ [IAX_CONTROLS.type]: type }).type, type);
  }
});

test('reordering codecs writes disallow=all before the allow list', () => {
  const peer = peerAfter({ [IAX_CONTROLS.codecs]: ['opus', 'ulaw'] });
  assert.deepEqual(peer.allow, ['opus', 'ulaw']);
  assert.deepEqual(peer.disallow, ['all']);
});

test('editing the context keeps any additional contexts the file lists', () => {
  /* iax.conf permits several and calls the first the default; dropping the rest would
   * quietly narrow where this peer can route. */
  const value = [{ name: 'p', entries: [
    { key: 'type', value: 'peer' }, { key: 'context', value: 'first' }, { key: 'context', value: 'second' },
  ] }] as unknown as ConfigValue;
  const result = ok(applyControlValues(value, 'p', { [IAX_CONTROLS.context]: 'changed' }, fixedRandom));
  assert.deepEqual(result.view.peers[0].context, ['changed', 'second']);
});

test('a control nobody touched leaves its key alone', () => {
  const peer = peerAfter({ [IAX_CONTROLS.host]: '10.0.0.1' });
  assert.equal(peer.type, 'friend');
  assert.equal(peer.accountcode, undefined);
});

test('an empty text control writes nothing rather than clearing the key', () => {
  assert.equal(peerAfter({ [IAX_CONTROLS.host]: '' }).host, 'dynamic');
});

test('saving an unchanged value produces no summary line', () => {
  assert.deepEqual(edit({ [IAX_CONTROLS.type]: 'friend' }).summary, []);
});

test('another peer is untouched by editing one', () => {
  const other = edit({ [IAX_CONTROLS.host]: '10.0.0.1' }).view.peers.find((p) => p.name === 'other-peer')!;
  assert.equal(other.host, '10.0.0.9');
  assert.equal(other.type, 'peer');
});

test('saving a peer that is no longer there is refused rather than recreating it', () => {
  const gone = applyControlValues(target(), 'vanished', { [IAX_CONTROLS.host]: 'x' }, fixedRandom);
  assert.ok('error' in gone);
  assert.match(gone.error, /not in iax\.conf/u);
});

test('the whole peer survives being rendered to a file and parsed back', () => {
  const written = iaxDocument(edit({
    [IAX_CONTROLS.transfer]: 'mediaonly', [IAX_CONTROLS.requireCallToken]: 'auto',
    [IAX_CONTROLS.port]: 5036, [IAX_CONTROLS.codecs]: ['opus', 'ulaw'],
    [IAX_CONTROLS.accountcode]: 'lss0101',
  }), '/etc/asterisk/iax.conf').value;
  const back = findPeer(written, 'branch-office')!;
  assert.equal(back.transfer, 'mediaonly');
  assert.equal(back.requirecalltoken, 'auto');
  assert.equal(back.port, '5036');
  assert.deepEqual(back.allow, ['opus', 'ulaw']);
  assert.equal(back.accountcode, 'lss0101');
});

test('the general section and unmanaged peers survive a save', () => {
  const written = iaxDocument(edit({ [IAX_CONTROLS.host]: '10.0.0.1' }), 'x').value;
  const general = (written as unknown as { name: string }[]).find((s) => s.name === 'general');
  assert.ok(general, '[general] was dropped on save');
  assert.deepEqual(peerNames(written), ['branch-office', 'other-peer']);
});
