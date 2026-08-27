/**
 * `nodeSpawnDetached` -- the one real spawn implementation `editor-launch.ts` and
 * `local-folder.ts` both hand off to. Everything else in those two modules' test files
 * uses a fake `SpawnDetached` so the decision logic can be tested without touching a
 * real process; this file is what proves the real one actually starts something.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { nodeSpawnDetached } from '../../control-plane/local-launch.js';

test('a real, existing executable actually starts', async () => {
  /* The pinned Node binary itself is guaranteed to exist on whatever machine runs this
   * test -- no fixture executable to ship or find. */
  const outcome = await nodeSpawnDetached(process.execPath, ['-e', 'process.exit(0)']);
  assert.deepEqual(outcome, { ok: true });
});

test('a nonexistent executable is reported as a failure, not thrown past the caller', async () => {
  const outcome = await nodeSpawnDetached('C:\\this\\does\\not\\exist\\nope.exe', []);
  assert.ok(!outcome.ok);
  assert.ok(outcome.reason.length > 0);
});

/* Argument fidelity ("never joined into a command line, never reinterpreted by a shell")
 * cannot be proven from the outside here: this function deliberately resolves once the
 * OS confirms the process STARTED, not once it exits (stdio is 'ignore'), which is
 * correct for a launched editor or file-manager window that is meant to keep running --
 * but it also means a wrong or reinterpreted argument would not surface as a failed
 * outcome. `shell: false` plus passing `args` straight through as an array to
 * `child_process.spawn` is what actually guarantees no shell reparses them; that
 * `editor-launch.test.ts` and `local-folder.test.ts` assert the exact argv this module
 * is CALLED with, via a fake `SpawnDetached`, is the honest way to cover that property. */
