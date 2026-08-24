/**
 * In-context recovery.
 *
 * The tests that carry weight are the ones about what is NOT offered. A rejected push
 * has remedies that look fast and lose commits, and they are the ones somebody reaches
 * for under pressure -- so the important property is not that the right route appears
 * but that the destructive ones never do.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FAILURE_KINDS, RECOVERY_ACTIONS, agentBrief, recoveryFor,
  type FailureKind,
} from '../../app/renderer/src/in-context-recovery.ts';

const DETAIL = 'remote: rejected non-fast-forward (fetch first)';

/* --- what is never offered ---------------------------------------------------------- */

test('no git failure offers a remedy that loses work', () => {
  /* Force-push, reset and dropping the branch all "fix" a rejected push and all destroy
   * commits. They must never be an action somebody can click. */
  const destructive = /force|reset|drop|delete|rewrite|discard/iu;
  for (const kind of FAILURE_KINDS) {
    for (const { label } of recoveryFor(kind, DETAIL).actions) {
      assert.ok(!destructive.test(label), `"${label}" is offered for ${kind}`);
    }
  }
});

test('a rejected push names the forbidden remedies rather than merely omitting them', () => {
  /* Named, because a caller handing this to a coding agent has to be able to pass the
   * list on -- and because "not offered" and "must not be done" are different claims. */
  const forbidden = recoveryFor('push-rejected', DETAIL).forbidden.join(' ').toLowerCase();
  for (const remedy of ['force-push', 'drop existing commits', 'reset the branch']) {
    assert.ok(forbidden.includes(remedy.toLowerCase()), `${remedy} is not named as forbidden`);
  }
});

test('a merge conflict forbids the same set, since the tempting shortcuts are identical', () => {
  assert.deepEqual(
    recoveryFor('merge-conflict', DETAIL).forbidden,
    recoveryFor('push-rejected', DETAIL).forbidden,
  );
});

test('a refused permission does not offer a retry', () => {
  /* Repeating a refused action changes nothing and reads as the console not having
   * understood the answer. */
  const recovery = recoveryFor('permission-denied', DETAIL);
  assert.ok(!recovery.actions.some((entry) => entry.action === 'retry'));
  assert.ok(recovery.forbidden.some((entry) => /retry the same action/iu.test(entry)));
});

test('a full disk never offers to delete anything on the person’s behalf', () => {
  const recovery = recoveryFor('disk-full', DETAIL);
  assert.ok(recovery.forbidden.some((entry) => /delete anything/iu.test(entry)));
  assert.ok(!recovery.actions.some((entry) => /delete/iu.test(entry.label)));
});

/* --- the real error always survives -------------------------------------------------- */

test('every recovery carries the real error rather than replacing it with a summary', () => {
  /* A summary that swallowed the error leaves somebody unable to search for what
   * actually happened. */
  for (const kind of FAILURE_KINDS) {
    assert.equal(recoveryFor(kind, DETAIL).detail, DETAIL, `${kind} lost the detail`);
  }
});

test('every recovery has a summary somebody can act on, not a status code', () => {
  for (const kind of FAILURE_KINDS) {
    const { summary } = recoveryFor(kind, DETAIL);
    assert.ok(summary.length > 20, `${kind} has no usable summary`);
    assert.ok(!/^[0-9]+$/u.test(summary.trim()), `${kind} summarised with a bare code`);
  }
});

/* --- what is offered ------------------------------------------------------------------ */

test('a missing scope offers the permission grant where the failure happened', () => {
  /* Reporting "insufficient scope" and leaving somebody to find the sign-in screen is a
   * dead end at the moment they know exactly what they wanted to do. */
  const recovery = recoveryFor('scope-missing', DETAIL);
  assert.ok(recovery.actions.some((entry) => entry.action === 'request-scopes'));
});

test('an expired credential offers re-authentication and nothing that stores it elsewhere', () => {
  const recovery = recoveryFor('credential-expired', DETAIL);
  assert.ok(recovery.actions.some((entry) => entry.action === 're-authenticate'));
  assert.ok(recovery.forbidden.some((entry) => /credential vault/iu.test(entry)));
});

test('an unreachable target offers both a retry and a different server', () => {
  const actions = recoveryFor('target-unreachable', DETAIL).actions.map((entry) => entry.action);
  assert.ok(actions.includes('retry'));
  assert.ok(actions.includes('choose-another-target'));
});

test('an unknown failure says so instead of inventing a route', () => {
  /* A cheerful "Try again" that does the same thing and fails the same way is worse than
   * saying plainly that this one is not understood. */
  const recovery = recoveryFor('unknown', DETAIL);
  assert.match(recovery.summary, /does not have a recovery route/u);
  assert.ok(!recovery.actions.some((entry) => entry.action === 'retry'));
});

test('every offered action is one of the declared kinds', () => {
  /* So a call site cannot invent an action the surface does not know how to perform,
   * which would render as a button that does nothing. */
  for (const kind of FAILURE_KINDS) {
    for (const { action } of recoveryFor(kind, DETAIL).actions) {
      assert.ok((RECOVERY_ACTIONS as readonly string[]).includes(action), `${action} is not declared`);
    }
  }
});

test('every failure kind offers at least one action', () => {
  /* A failure with no route at all is a dead end, and the unknown case still offers the
   * full error rather than nothing. */
  for (const kind of FAILURE_KINDS) {
    assert.ok(recoveryFor(kind, DETAIL).actions.length > 0, `${kind} offers nothing at all`);
  }
});

test('the target is named in the summary when one is known', () => {
  const recovery = recoveryFor('target-unreachable', DETAIL, { target: 'branch-office' });
  assert.ok(recovery.summary.includes('branch-office'));
});

test('an unrecognised kind falls to the unknown route rather than throwing', () => {
  const recovery = recoveryFor('not-a-real-kind' as FailureKind, DETAIL);
  assert.match(recovery.summary, /does not have a recovery route/u);
});

/* --- the agent brief -------------------------------------------------------------------- */

test('the brief forbids the work-losing remedies by name', () => {
  /* A brief that only described the goal would invite exactly the shortcut this exists
   * to prevent, because those shortcuts genuinely do make a rejected push go away. */
  const brief = agentBrief(recoveryFor('push-rejected', DETAIL), { remote: 'origin', branch: 'master' });
  assert.match(brief, /Do not, under any circumstances/u);
  assert.match(brief, /force-push/u);
});

test('the brief names the real situation rather than describing it in the abstract', () => {
  const brief = agentBrief(recoveryFor('push-rejected', DETAIL), { remote: 'origin', branch: 'master' });
  assert.ok(brief.includes('origin'));
  assert.ok(brief.includes('master'));
  assert.ok(brief.includes(DETAIL));
});

test('a brief with no forbidden remedies omits the prohibition rather than emptying it', () => {
  /* "Do not, under any circumstances: ." reads as a truncated instruction. */
  const brief = agentBrief(recoveryFor('target-unreachable', DETAIL), {});
  assert.ok(!brief.includes('Do not, under any circumstances'));
});

test('a brief with no remote or branch omits those lines rather than saying undefined', () => {
  const brief = agentBrief(recoveryFor('push-rejected', DETAIL), {});
  assert.ok(!brief.includes('undefined'));
  assert.ok(!/Remote:\s*$/mu.test(brief));
});
