import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canProvision,
  canRecoverRuntime,
  canStopRuntime,
  runtimeHint,
  runtimeLabel,
  type ProvisionState,
  type RuntimeStatus,
} from '../../app/renderer/src/runtime.ts';

const status = (state: ProvisionState, extra: Record<string, unknown> = {}): RuntimeStatus => ({
  managedDistribution: 'ding-pbx-console',
  status: {
    state,
    distribution: 'ding-pbx-console',
    observedAt: '2026-08-22T00:00:00.000Z',
    ...extra,
  },
});

/**
 * The exact message WSL produces when a distribution is registered and its virtual disk
 * is not there. Copied from a real machine rather than invented, because the whole point
 * of this state is that it is reachable in the field.
 */
const DISK_GONE =
  "Failed to attach disk 'C:\\Users\\someone\\AppData\\Local\\ding-pbx-console\\wsl\\ext4.vhdx' to WSL2: " +
  'The system cannot find the path specified. \nError code: Wsl/Service/CreateInstance/MountDisk/HCS/ERROR_PATH_NOT_FOUND';

test('every state that cannot proceed names a next action or says plainly there is none', () => {
  /* Hand-written, and that is deliberate: a rule that checks only the states it can find
   * passes on a state nobody wrote a branch for. This list is what must be covered. */
  const mustAnswer: ProvisionState[] = [
    'notProvisioned',
    'ready',
    'payloadMissing',
    'wslUnavailable',
    'unusable',
    'failed',
  ];
  for (const state of mustAnswer) {
    const hint = runtimeHint(status(state, { reason: 'a reason', asteriskVersion: 'Asterisk 20' }));
    assert.notEqual(hint, '', `${state} produced no sentence at all, so the screen would stop at the problem`);
  }
});

test('a registered distribution that does not answer names removal as the way out', () => {
  const hint = runtimeHint(status('unusable', { reason: DISK_GONE }));

  /* The reason must survive intact — a person diagnosing a missing disk needs the path. */
  assert.ok(hint.includes('ERROR_PATH_NOT_FOUND'), 'the real reason was dropped from the sentence');
  /* And the escape must be named. This is the assertion the whole state exists for. */
  assert.match(hint, /remove it first/u);
  assert.ok(
    hint.includes('cannot be created again while it is registered'),
    'the sentence never explains why creating it again is refused, so removal looks arbitrary',
  );
});

test('the unusable state does not claim that creating the runtime was attempted', () => {
  /* It was not. The distribution already existed; nothing was created. Reporting this as
   * a failed creation is a false statement about what the console did. */
  const hint = runtimeHint(status('unusable', { reason: DISK_GONE }));
  assert.doesNotMatch(hint, /creating .* did not succeed/u);
});

test('a genuinely failed creation still reads as a failed creation', () => {
  const hint = runtimeHint(status('failed', { reason: 'wsl --import exited with 1' }));
  assert.match(hint, /creating .* did not succeed/u);
  assert.ok(hint.includes('wsl --import exited with 1'));
});

test('removal is offered only for the state it actually fixes', () => {
  assert.equal(canRecoverRuntime(status('unusable')), true);

  /* Narrow on purpose. Removing a working runtime destroys its configuration, so the
   * interface must never recommend it merely because removal is possible. */
  for (const state of ['ready', 'notProvisioned', 'payloadMissing', 'wslUnavailable', 'failed'] as ProvisionState[]) {
    assert.equal(canRecoverRuntime(status(state)), false, `removal was offered for ${state}`);
  }
  assert.equal(canRecoverRuntime(undefined), false);
});

test('creating is never offered for a distribution that is already registered', () => {
  /* The console refuses to import over an existing name, so offering the control here
   * would be a button guaranteed to fail. */
  assert.equal(canProvision(status('unusable')), false);
  assert.equal(canProvision(status('notProvisioned')), true);
});

test('the label distinguishes registered-but-silent from failed', () => {
  assert.equal(
    runtimeLabel(status('unusable', { reason: 'no answer' })),
    'registered but not answering — no answer',
  );
  assert.equal(runtimeLabel(status('failed', { reason: 'no answer' })), 'failed — no answer');
});

test('a missing reason never renders as an empty gap', () => {
  for (const state of ['unusable', 'failed'] as ProvisionState[]) {
    const hint = runtimeHint(status(state));
    assert.ok(hint.includes('no reason was reported'), `${state} rendered a blank where the reason belongs`);
    assert.equal(runtimeLabel(status(state)).includes('undefined'), false);
  }
});

test('stopping is offered for a registered distribution, whether or not it answers', () => {
  /* `wsl.exe --terminate` needs no working daemon inside the instance, and a stuck
   * (`unusable`) distribution is exactly the case someone most wants a stop button
   * for -- gating this to `ready` alone would remove the one control that could get
   * them out of that state without an irreversible `runtime.remove`. */
  assert.equal(canStopRuntime(status('ready')), true);
  assert.equal(canStopRuntime(status('unusable')), true);
});

test('stopping is refused when there is nothing registered to terminate', () => {
  for (const state of ['notProvisioned', 'payloadMissing', 'wslUnavailable', 'failed'] as ProvisionState[]) {
    assert.equal(canStopRuntime(status(state)), false, `stop was offered for ${state}, which has no registered distribution`);
  }
  assert.equal(canStopRuntime(undefined), false);
});
