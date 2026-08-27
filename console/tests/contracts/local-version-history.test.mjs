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
  assert.ok(['implemented', 'partial', 'absent'].includes(row.status), `undefined state "${row.status}"`);
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

test('the diff method exists and is reachable, and the labelling gap is still open', () => {
  /* This replaced a pin asserting that BOTH gaps were open. Its own failure message said
   * the diff gap may have been closed, and it had been: a later lane added a diff method
   * and a two-point comparison, each shaped against real version-control output. The pin
   * was doing its job by firing.
   *
   * It is inverted rather than deleted, because deleting it would leave nothing watching a
   * method the History screen now depends on. The half that is still honestly missing keeps
   * its original pin, so this goes red in either direction: if the diff disappears, or if
   * labelling arrives and this test stops telling the truth.
   *
   * Deliberately no regular expressions. Matching whole trimmed lines cannot be satisfied
   * by a renamed symbol that contains the old name, nor by a commented-out declaration,
   * and it survives a checkout that rewrites line endings. */
  /* Split on a newline built from its character code: a backslash escape does not
   * reliably survive being written through a shell into a source file, and the failure
   * is silent -- it produced a real line break inside a string literal here. */
  const NEWLINE = String.fromCharCode(10);
  const declarations = read(HISTORY).split(NEWLINE).map((line) => line.trim());
  assert.ok(declarations.length > 0, 'the history module read back empty');
  assert.ok(
    declarations.includes('async diff(commitId: string): Promise<HistoryDiff> {'),
    'the diff-between-two-points method is gone; the History screen reads it',
  );
  assert.ok(
    declarations.some((line) => line.startsWith('async compareFiles(')),
    'compareFiles is gone; it is what makes a two-point comparison possible',
  );
  assert.ok(
    !declarations.some((line) => {
      /* Strip a leading async before matching. Checking the bare name alone let a method
       * declared as an async one walk straight past this, which a deliberate break caught
       * before it shipped -- the exact reason each guard is broken on its own. */
      const declaration = line.startsWith('async ') ? line.slice(6) : line;
      return ['label(', 'applyLabel(', 'setLabel(']
        .some((name) => declaration.startsWith(name));
    }),
    'a label concept now exists -- the labelling gap has closed and this test should say so',
  );
});

test('history.list and history.restore are real dispatch actions', () => {
  const src = read(DISPATCH);
  // Widened from a bare `history.list || history.restore` branch to also carry
  // `history.diff` (ConfigHistory#diff, a real Myers line diff against what is on the
  // target right now) and `history.prune` (ConfigHistory#prune, which existed with no
  // caller until the Configuration backups screen gave it one) -- see
  // config-history-rest-agi.test.tsx for the guard on those two.
  assert.match(
    src,
    /if \(request\.action === 'history\.list' \|\| request\.action === 'history\.restore'\) \{/u,
    'the history dispatch branch no longer matches',
  );
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
