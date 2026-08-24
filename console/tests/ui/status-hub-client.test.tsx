/**
 * Reporting to a shared status hub.
 *
 * A status page is worth exactly as much as its claims are true, so most of these tests
 * are about refusing to send something the console cannot support -- and about the two
 * states a reader actually acts on, passed and failed, being the two that require
 * evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LANE_STATES, LIMITS, advanceCursor, buildPayload, validateReport,
  type Lane, type SessionReport,
} from '../../app/renderer/src/status-hub-client.ts';

const lane = (over: Partial<Lane> = {}): Lane => ({
  id: 'endpoints', label: 'Endpoints', state: 'running', evidence: [], ...over,
});

const report = (over: Partial<SessionReport> = {}): SessionReport => ({
  title: 'Ding PBX Console', summary: 'Reading endpoints from the managed target.',
  lanes: [lane()], ...over,
});

/* --- a claim needs something to check it against ------------------------------------- */

test('a passed lane with no evidence is refused', () => {
  /* Passed and failed are the two states somebody acts on. A lane claiming either with
   * nothing to check is the exact thing that makes a status page worse than none. */
  const problems = validateReport(report({ lanes: [lane({ state: 'passed' })] }));
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /nothing to check it against/u);
});

test('a failed lane with no evidence is refused too', () => {
  assert.equal(validateReport(report({ lanes: [lane({ state: 'failed' })] })).length, 1);
});

test('running, blocked and unrun need no evidence, because they claim nothing yet', () => {
  for (const state of ['running', 'blocked', 'unrun'] as const) {
    assert.deepEqual(validateReport(report({ lanes: [lane({ state })] })), [],
      `${state} was refused for having no evidence`);
  }
});

test('a passed lane with evidence is accepted', () => {
  const passed = lane({ state: 'passed', evidence: [{ label: '1842 tests, 0 failures', href: 'run/12' }] });
  assert.deepEqual(validateReport(report({ lanes: [passed] })), []);
});

test('unrun is a state of its own, not a synonym for failed', () => {
  /* A check nobody ran reported as failed sends somebody looking for a defect that does
   * not exist; reported as passed is worse. It needs its own word. */
  assert.ok((LANE_STATES as readonly string[]).includes('unrun'));
  assert.notEqual('unrun', 'failed');
});

/* --- nothing sent carries a secret ----------------------------------------------------- */

test('only allowlisted fields survive into the payload', () => {
  /* A session is assembled from state that also holds credentials, hostnames and vault
   * keys. An allowlist rather than a deny-list, because a deny-list only protects against
   * what somebody thought of when they wrote it. */
  const contaminated = {
    ...lane({ state: 'running' }),
    credentialKey: 'ding/forge/a1',
    token: 'a-real-looking-token',
    host: 'pbx.internal.example',
  } as unknown as Lane;
  const payload = buildPayload(report({ lanes: [contaminated] }));
  const sent = JSON.stringify(payload);
  for (const secret of ['credentialKey', 'a-real-looking-token', 'pbx.internal.example']) {
    assert.ok(!sent.includes(secret), `"${secret}" reached the payload`);
  }
});

test('an evidence entry carries only its label and link', () => {
  const contaminated = lane({
    state: 'running',
    evidence: [{ label: 'run 12', href: 'run/12', secret: 'nope' } as unknown as { label: string }],
  });
  const payload = buildPayload(report({ lanes: [contaminated] }));
  assert.ok(!JSON.stringify(payload).includes('nope'));
});

test('an evidence entry with no link keeps none rather than an empty one', () => {
  /* An empty href renders as a link to nowhere, which reads as a broken page rather than
   * as evidence that happens to have no address. */
  const payload = buildPayload(report({ lanes: [lane({ evidence: [{ label: 'observed by hand' }] })] }));
  assert.ok(!('href' in payload.lanes[0].evidence[0]));
});

/* --- a payload that would be rejected is not sent ---------------------------------------- */

test('every bound is checked here rather than discovered from a rejection', () => {
  const problems = validateReport(report({
    title: 'x'.repeat(LIMITS.title + 1),
    summary: 'y'.repeat(LIMITS.summary + 1),
  }));
  assert.deepEqual(problems.map((problem) => problem.field).sort(), ['summary', 'title']);
});

test('an over-long field is truncated deliberately rather than by the far end', () => {
  const payload = buildPayload(report({ title: 'x'.repeat(LIMITS.title + 50) }));
  assert.equal(payload.title.length, LIMITS.title);
});

test('too many lanes or too much evidence is refused', () => {
  const many = Array.from({ length: LIMITS.maxLanes + 1 }, (_, i) => lane({ id: `lane-${i}` }));
  assert.ok(validateReport(report({ lanes: many })).some((problem) => problem.field === 'lanes'));

  const evidence = Array.from({ length: LIMITS.maxEvidence + 1 }, (_, i) => ({ label: `e${i}` }));
  assert.ok(validateReport(report({ lanes: [lane({ state: 'passed', evidence })] }))
    .some((problem) => problem.field.startsWith('lanes.')));
});

test('an empty title is refused', () => {
  assert.ok(validateReport(report({ title: '   ' })).some((problem) => problem.field === 'title'));
});

test('two lanes sharing an id are refused', () => {
  /* The hub keeps whichever arrives last, so one silently never appears -- and it is not
   * knowable which. */
  const problems = validateReport(report({ lanes: [lane(), lane()] }));
  assert.ok(problems.some((problem) => /share the id/u.test(problem.message)));
});

test('an unknown lane state is refused rather than sent', () => {
  const problems = validateReport(report({ lanes: [lane({ state: 'greenish' as Lane['state'] })] }));
  assert.ok(problems.some((problem) => /is not a lane state/u.test(problem.message)));
});

/* --- the reply cursor --------------------------------------------------------------------- */

test('only replies newer than the cursor are returned, in order', () => {
  const outcome = advanceCursor({ after: 2 }, [
    { seq: 4, text: 'later' }, { seq: 1, text: 'old' }, { seq: 3, text: 'next' },
  ]);
  assert.deepEqual(outcome.replies.map((reply) => reply.seq), [3, 4]);
  assert.equal(outcome.cursor.after, 4);
});

test('no new replies leaves the cursor where it was', () => {
  const outcome = advanceCursor({ after: 7 }, [{ seq: 5, text: 'old' }]);
  assert.deepEqual(outcome.replies, []);
  assert.equal(outcome.cursor.after, 7);
});

test('a cursor older than the hub still holds resynchronises and says what was lost', () => {
  /* Retrying asks the same impossible question forever, and silently skipping means
   * somebody's answer was never acted on and nobody knows. */
  const outcome = advanceCursor({ after: 2 }, [], 10);
  assert.equal(outcome.cursor.after, 9);
  assert.match(outcome.resynchronised ?? '', /7 earlier replies are no longer available/u);
});

test('the resynchronisation message is singular for exactly one lost reply', () => {
  const outcome = advanceCursor({ after: 2 }, [], 4);
  assert.match(outcome.resynchronised ?? '', /1 earlier reply is no longer available/u);
});

test('an oldest sequence that is not ahead of the cursor is not a resynchronisation', () => {
  /* The ordinary case: the hub still holds everything asked for. */
  const outcome = advanceCursor({ after: 5 }, [{ seq: 6, text: 'new' }], 3);
  assert.equal(outcome.resynchronised, undefined);
  assert.deepEqual(outcome.replies.map((reply) => reply.seq), [6]);
});
