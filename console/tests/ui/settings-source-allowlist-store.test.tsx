/**
 * The renderer's add/remove/list surface for the settings-source host allowlist.
 *
 * Validation itself is exercised in `tests/control-plane/settings-source-allowlist.test.ts`
 * against the shared pure module; these tests are about the renderer-facing shape on top
 * of it -- add, remove, duplicate handling, and the status line a person actually reads.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addAllowlistHost, loadAllowlist, removeAllowlistHost, sourceAllowlistStatusLine,
  type AllowlistStorage,
} from '../../app/renderer/src/settings-source-allowlist-store.ts';
import { SETTINGS_SOURCE_ALLOWLIST_KEY } from '../../control-plane/settings-source-allowlist.ts';

const memory = (): AllowlistStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); } };
};

/* --- loadAllowlist: empty by default ---------------------------------------------------- */

test('a fresh install has no allowed hosts', () => {
  assert.deepEqual(loadAllowlist(memory()), []);
});

test('loadAllowlist tolerates an undefined storage seam (no bridge, no host yet)', () => {
  assert.deepEqual(loadAllowlist(undefined), []);
});

/* --- addAllowlistHost -------------------------------------------------------------------- */

test('a valid host is added and then loads back', () => {
  const storage = memory();
  const result = addAllowlistHost(storage, 'settings.example.net');
  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.host : '', 'settings.example.net');
  assert.deepEqual(loadAllowlist(storage), ['settings.example.net']);
});

test('an invalid host is refused and the list is unchanged', () => {
  const storage = memory();
  const result = addAllowlistHost(storage, 'https://settings.example.net/x');
  assert.equal(result.ok, false);
  assert.ok(!result.ok && result.problems.length > 0);
  assert.deepEqual(loadAllowlist(storage), []);
});

test('adding the same host twice is refused the second time, not silently repeated', () => {
  const storage = memory();
  assert.equal(addAllowlistHost(storage, 'settings.example.net').ok, true);
  const second = addAllowlistHost(storage, 'settings.example.net');
  assert.equal(second.ok, false);
  assert.ok(!second.ok && /already allowed/u.test(second.problems[0].message));
  assert.deepEqual(loadAllowlist(storage), ['settings.example.net'], 'the list gained a duplicate entry');
});

test('adding the same host with different case is still treated as a duplicate', () => {
  const storage = memory();
  assert.equal(addAllowlistHost(storage, 'Settings.Example.NET').ok, true);
  const second = addAllowlistHost(storage, 'settings.example.net');
  assert.equal(second.ok, false);
  assert.deepEqual(loadAllowlist(storage), ['settings.example.net']);
});

test('a second, distinct host is appended rather than replacing the first', () => {
  const storage = memory();
  addAllowlistHost(storage, 'a.example.net');
  addAllowlistHost(storage, 'b.example.net');
  assert.deepEqual(loadAllowlist(storage), ['a.example.net', 'b.example.net']);
});

/* --- removeAllowlistHost ------------------------------------------------------------------ */

test('a removed host is refused again -- it leaves the persisted list', () => {
  const storage = memory();
  addAllowlistHost(storage, 'settings.example.net');
  const removed = removeAllowlistHost(storage, 'settings.example.net');
  assert.equal(removed.ok, true);
  assert.deepEqual(loadAllowlist(storage), []);
});

test('removing a host that is not on the list is refused rather than silently doing nothing', () => {
  const storage = memory();
  const result = removeAllowlistHost(storage, 'never-added.example.net');
  assert.equal(result.ok, false);
  assert.ok(!result.ok && /was not on the allowed list/u.test(result.problems[0].message));
});

test('removing one host leaves an unrelated second host allowed', () => {
  const storage = memory();
  addAllowlistHost(storage, 'a.example.net');
  addAllowlistHost(storage, 'b.example.net');
  removeAllowlistHost(storage, 'a.example.net');
  assert.deepEqual(loadAllowlist(storage), ['b.example.net']);
});

test('removal is also validated -- an invalid typed value is refused with the same rule', () => {
  const storage = memory();
  const result = removeAllowlistHost(storage, '*.example.net');
  assert.equal(result.ok, false);
  assert.ok(!result.ok && /wildcard/u.test(result.problems[0].message));
});

/* --- the status line ----------------------------------------------------------------------- */

test('an empty allowlist reads as a deliberate state, not a blank field', () => {
  const line = sourceAllowlistStatusLine([]);
  assert.match(line, /No hosts are allowed yet/u);
  assert.match(line, /every external settings source is refused/u);
});

test('a populated allowlist names every host and says the change is not yet live', () => {
  const line = sourceAllowlistStatusLine(['a.example.net', 'b.example.net']);
  assert.match(line, /a\.example\.net/u);
  assert.match(line, /b\.example\.net/u);
  assert.match(line, /restart/u);
});

/* --- shares the exact same storage key durable-storage persists other settings under ------ */

test('the allowlist is stored under the shared settings key, not a private one', () => {
  const storage = memory();
  addAllowlistHost(storage, 'settings.example.net');
  assert.ok(storage.map.has(SETTINGS_SOURCE_ALLOWLIST_KEY));
});
