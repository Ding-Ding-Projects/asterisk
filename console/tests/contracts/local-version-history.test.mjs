/**
 * Contract: local-version-history.
 *
 * The registry note documents its own correction, which is worth restating
 * here rather than re-deriving: this row once read "absent -- backend plumbing
 * with no reachable UI", believed literally by a later pass that began
 * designing a replacement for a feature that already worked. The row was fixed
 * on 2026-08-24 and a guard now refuses an "absent" row whose evidence is
 * actually present in the source tree (see absent-rows.test.mjs).
 *
 * Real and wired, confirmed directly against control-plane/local-history.ts and
 * PbxAdminApp.tsx: Git-backed commits per subject, secret redaction before
 * anything is written to disk (`redactSecretValues`, a `[redacted]` marker over
 * password/secret/token/key/pin/credential-named fields), `list()`/`restore()`/
 * `actionCounts()`/`prune()` as real async methods, `history.list`/
 * `history.restore` dispatch actions, and a real restore path in PbxAdminApp
 * gated behind `areYouSure(...)` -- the project's destructive-action
 * confirmation -- before it runs.
 *
 * Real gaps, confirmed by their absence rather than assumed from the note:
 * no `diff` method between two recovery points (only an internal `diff-tree`
 * git invocation used to build one commit's own record), and no user-applied
 * label concept anywhere in the module.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const HISTORY = 'control-plane/local-history.ts';
const DISPATCH = 'control-plane/dispatch.ts';
const PBX_ADMIN = 'app/renderer/src/PbxAdminApp.tsx';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['local-version-history'];
  assert.ok(row, 'the implementation registry has no row for local-version-history');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('secret values are genuinely redacted before anything is written to a history file', () => {
  const src = read(HISTORY);
  assert.match(src, /const SECRET_KEY_NAMES = \["password", "secret", "token", "key", "pin", "credential"\];/u,
    'the secret-key-name list no longer matches');
  assert.match(src, /const redactedPayload = redactSecretValues\(entry\.payload\);/u,
    'redactSecretValues is no longer called before a write');
});

test('list, restore, actionCounts, and prune are real async methods', () => {
  const src = read(HISTORY);
  for (const method of ['async list(', 'async restore(', 'async actionCounts(', 'async prune(']) {
    assert.ok(src.includes(method), `${method} no longer exists on LocalHistory`);
  }
});

test('there is no diff-between-two-points method and no user-applied label concept -- real, named gaps', () => {
  const src = read(HISTORY);
  assert.doesNotMatch(src, /\basync diff\(/u, 'an async diff(...) method now exists -- the diff gap may have been closed');
  assert.doesNotMatch(src, /\blabel\(|applyLabel|setLabel/u, 'a label concept now exists -- the labelling gap may have been closed');
});

test('history.list and history.restore are real dispatch actions', () => {
  const src = read(DISPATCH);
  assert.match(src, /if \(request\.action === 'history\.list' \|\| request\.action === 'history\.restore'\) \{/u,
    'the history dispatch branch no longer matches');
  assert.match(src, /await history\.list\(resource\)/u, 'history.list(...) is no longer called from dispatch');
  assert.match(src, /await history\.restore\(handle\)/u, 'history.restore(...) is no longer called from dispatch');
});

test('PbxAdminApp lists recovery points per resource and gates restore behind the destructive-action confirmation', () => {
  const src = read(PBX_ADMIN);
  assert.match(src, /private historyControlId\(screen: string\) \{ return `pbxadm:\$\{screen\}:history`; \}/u,
    'the per-screen history control id helper no longer matches');
  assert.match(src, /this\.areYouSure\(`Restore \$\{basename\(context\.resource\)\}`,/u,
    'the restore path no longer runs through areYouSure(...) -- the confirmation gate may have been removed');
  assert.match(src, /await this\.adminRequest\('history\.restore', \{ serverId: target, payload: \{ handle: selected\.handle \} \}\);/u,
    'restoreAdminConfirmed no longer calls history.restore over adminRequest');
});
