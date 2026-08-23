import assert from 'node:assert/strict';
import test from 'node:test';

import { UnlockLadder } from '../../app/renderer/src/unlock-ladder.ts';
import type { Answer, Challenge, DishChallenge, MolesChallenge, SumsChallenge } from '../../app/renderer/src/unlock-ladder.ts';

const HOUR_MS = 60 * 60 * 1000;

function makeClock(startMs = 1_000_000) {
  let current = startMs;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
      return current;
    },
    set: (ms: number) => {
      current = ms;
    },
    get value() {
      return current;
    },
  };
}

/** Deterministic PRNG (mulberry32) so tests never depend on real randomness. */
function makeRandom(seed = 42) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function asDish(c: Challenge): DishChallenge {
  assert.equal(c.rung, 'dish');
  return c as DishChallenge;
}
function asSums(c: Challenge): SumsChallenge {
  assert.equal(c.rung, 'sums');
  return c as SumsChallenge;
}
function asMoles(c: Challenge): MolesChallenge {
  assert.equal(c.rung, 'moles');
  return c as MolesChallenge;
}

function correctDishAnswer(c: DishChallenge): Answer {
  return { kind: 'dish', choiceIndex: c.payload.correctIndex };
}

function wrongDishAnswer(c: DishChallenge): Answer {
  const wrong = ((c.payload.correctIndex + 1) % 4) as 0 | 1 | 2 | 3;
  return { kind: 'dish', choiceIndex: wrong };
}

function correctSumsAnswer(c: SumsChallenge): Answer {
  return {
    kind: 'sums',
    answers: c.payload.problems.map((p) => (p.op === '+' ? p.a + p.b : p.a - p.b)),
  };
}

function wrongSumsAnswer(c: SumsChallenge): Answer {
  const answers = c.payload.problems.map((p) => (p.op === '+' ? p.a + p.b : p.a - p.b));
  answers[0] = answers[0]! + 1;
  return { kind: 'sums', answers };
}

function winningMolesAnswer(c: MolesChallenge, atMs: number): Answer {
  const hits = c.payload.spawns.slice(0, c.payload.hitsRequired).map((spawn) => ({
    cell: spawn.cell,
    atMs: spawn.atMs + 1,
  }));
  return { kind: 'moles', hits, submittedAtMs: atMs };
}

function losingMolesAnswer(atMs: number): Answer {
  return { kind: 'moles', hits: [], submittedAtMs: atMs };
}

// ---------------------------------------------------------------- rung 1: dish

test('dish rung is offered first outside school mode', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom() });
  const issued = ladder.issue('lockout-1');
  assert.equal(issued.rung, 'dish');
});

test('a correct dish answer clears the wait', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom() });
  const challenge = asDish(ladder.issue('lockout-1') as Challenge);
  const result = ladder.grade(challenge.nonce, correctDishAnswer(challenge), clock.value);
  assert.equal(result.cleared, true);
});

test('dish choices contain exactly one correct index among four', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom(7) });
  const challenge = asDish(ladder.issue('lockout-1') as Challenge);
  assert.equal(challenge.payload.choices.length, 4);
  assert.ok(challenge.payload.correctIndex >= 0 && challenge.payload.correctIndex <= 3);
});

// ---------------------------------------------------------------- escalation: dish -> sums

test('five wrong dishes escalate to sums, not fewer', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom() });

  let lastRung = 'dish';
  for (let i = 0; i < 4; i++) {
    const challenge = asDish(ladder.issue('lockout-1') as Challenge);
    const result = ladder.grade(challenge.nonce, wrongDishAnswer(challenge), clock.value);
    assert.equal(result.cleared, false);
    lastRung = result.nextRung;
    assert.equal(lastRung, 'dish', `expected still on dish after ${i + 1} wrong answers`);
  }

  // Fifth wrong dish escalates.
  const fifth = asDish(ladder.issue('lockout-1') as Challenge);
  const result = ladder.grade(fifth.nonce, wrongDishAnswer(fifth), clock.value);
  assert.equal(result.cleared, false);
  assert.equal(result.nextRung, 'sums');

  const nextIssued = ladder.issue('lockout-1');
  assert.equal(nextIssued.rung, 'sums');
});

// ---------------------------------------------------------------- rung 2: sums

test('a correct sums answer clears the wait', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom(), schoolMode: true });
  const challenge = asSums(ladder.issue('lockout-1') as Challenge);
  const result = ladder.grade(challenge.nonce, correctSumsAnswer(challenge), clock.value);
  assert.equal(result.cleared, true);
});

test('sums challenge has ten problems, all single- or double-digit', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom(3), schoolMode: true });
  const challenge = asSums(ladder.issue('lockout-1') as Challenge);
  assert.equal(challenge.payload.problems.length, 10);
  for (const p of challenge.payload.problems) {
    assert.ok(p.a >= 1 && p.a <= 90);
    assert.ok(p.b >= 1 && p.b <= 90);
  }
});

test('one wrong sum escalates straight to moles', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom(), schoolMode: true });
  const challenge = asSums(ladder.issue('lockout-1') as Challenge);
  const result = ladder.grade(challenge.nonce, wrongSumsAnswer(challenge), clock.value);
  assert.equal(result.cleared, false);
  assert.equal(result.nextRung, 'moles');

  const nextIssued = ladder.issue('lockout-1');
  assert.equal(nextIssued.rung, 'moles');
});

test('every sums answer must be right, not just most of them', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom(99), schoolMode: true });
  const challenge = asSums(ladder.issue('lockout-1') as Challenge);
  const correct = correctSumsAnswer(challenge) as { kind: 'sums'; answers: number[] };
  // Get every problem right except the very last one.
  const answers = [...correct.answers];
  answers[answers.length - 1] = answers[answers.length - 1]! + 5;
  const result = ladder.grade(challenge.nonce, { kind: 'sums', answers }, clock.value);
  assert.equal(result.cleared, false);
});

// ---------------------------------------------------------------- rung 3: moles

test('winning a mole round clears the wait', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom(), schoolMode: true });
  // Escalate straight to moles via one wrong sum.
  const sums = asSums(ladder.issue('lockout-1') as Challenge);
  ladder.grade(sums.nonce, wrongSumsAnswer(sums), clock.value);
  const moles = asMoles(ladder.issue('lockout-1') as Challenge);

  const submitAt = clock.value + moles.payload.durationMs + 1;
  const result = ladder.grade(moles.nonce, winningMolesAnswer(moles, submitAt), submitAt);
  assert.equal(result.cleared, true);
});

test('losing a mole round falls to the clock, and the ladder is not offered again', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom(), schoolMode: true });
  const sums = asSums(ladder.issue('lockout-1') as Challenge);
  ladder.grade(sums.nonce, wrongSumsAnswer(sums), clock.value);
  const moles = asMoles(ladder.issue('lockout-1') as Challenge);

  const submitAt = clock.value + moles.payload.durationMs + 1;
  const result = ladder.grade(moles.nonce, losingMolesAnswer(submitAt), submitAt);
  assert.equal(result.cleared, false);
  assert.equal(result.nextRung, 'clock');

  const nextIssued = ladder.issue('lockout-1');
  assert.equal(nextIssued.rung, 'clock');

  // Even a fresh call some time later never resurrects the ladder for this lockout.
  clock.advance(10_000);
  const stillClocked = ladder.issue('lockout-1');
  assert.equal(stillClocked.rung, 'clock');
});

test('a timed mole round cannot be won faster than it lasts', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom(), schoolMode: true });
  const sums = asSums(ladder.issue('lockout-1') as Challenge);
  ladder.grade(sums.nonce, wrongSumsAnswer(sums), clock.value);
  const moles = asMoles(ladder.issue('lockout-1') as Challenge);

  // Submit immediately, before the round's own duration has elapsed.
  const tooEarly = clock.value + 5;
  const result = ladder.grade(moles.nonce, winningMolesAnswer(moles, tooEarly), tooEarly);
  assert.equal(result.cleared, false);
});

test('a mole hit on an empty cell does not count', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom(), schoolMode: true });
  const sums = asSums(ladder.issue('lockout-1') as Challenge);
  ladder.grade(sums.nonce, wrongSumsAnswer(sums), clock.value);
  const moles = asMoles(ladder.issue('lockout-1') as Challenge);

  const usedCells = new Set(moles.payload.spawns.map((s) => s.cell));
  let emptyCell = 0;
  while (usedCells.has(emptyCell) && emptyCell < moles.payload.grid) emptyCell++;

  const submitAt = clock.value + moles.payload.durationMs + 1;
  const hits = Array.from({ length: moles.payload.hitsRequired }, () => ({ cell: emptyCell, atMs: 1 }));
  const result = ladder.grade(moles.nonce, { kind: 'moles', hits, submittedAtMs: submitAt }, submitAt);
  assert.equal(result.cleared, false);
});

test('a mole hit outside its visible window does not count', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom(), schoolMode: true });
  const sums = asSums(ladder.issue('lockout-1') as Challenge);
  ladder.grade(sums.nonce, wrongSumsAnswer(sums), clock.value);
  const moles = asMoles(ladder.issue('lockout-1') as Challenge);

  const submitAt = clock.value + moles.payload.durationMs + 1;
  // Hit every mole's cell, but long after its window closed.
  const hits = moles.payload.spawns.map((spawn) => ({ cell: spawn.cell, atMs: spawn.untilMs + 5000 }));
  const result = ladder.grade(moles.nonce, { kind: 'moles', hits, submittedAtMs: submitAt }, submitAt);
  assert.equal(result.cleared, false);
});

test('the same mole spawn cannot be credited twice toward the hit requirement', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom(), schoolMode: true });
  const sums = asSums(ladder.issue('lockout-1') as Challenge);
  ladder.grade(sums.nonce, wrongSumsAnswer(sums), clock.value);
  const moles = asMoles(ladder.issue('lockout-1') as Challenge);

  const submitAt = clock.value + moles.payload.durationMs + 1;
  const spawn = moles.payload.spawns[0]!;
  // Tap the same spawn hitsRequired times instead of hitting distinct moles.
  const hits = Array.from({ length: moles.payload.hitsRequired }, () => ({
    cell: spawn.cell,
    atMs: spawn.atMs + 1,
  }));
  const result = ladder.grade(moles.nonce, { kind: 'moles', hits, submittedAtMs: submitAt }, submitAt);
  assert.equal(result.cleared, false);
});

// ---------------------------------------------------------------- nonce / expiry hygiene

test('a replayed nonce is refused the second time', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom() });
  const challenge = asDish(ladder.issue('lockout-1') as Challenge);
  const first = ladder.grade(challenge.nonce, correctDishAnswer(challenge), clock.value);
  assert.equal(first.cleared, true);

  const replay = ladder.grade(challenge.nonce, correctDishAnswer(challenge), clock.value);
  assert.equal(replay.cleared, false);
  assert.equal(replay.reason, 'unknown or already-used nonce');
});

test('a wrong answer also consumes the nonce so it cannot be retried', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom() });
  const challenge = asDish(ladder.issue('lockout-1') as Challenge);
  ladder.grade(challenge.nonce, wrongDishAnswer(challenge), clock.value);

  const retry = ladder.grade(challenge.nonce, correctDishAnswer(challenge), clock.value);
  assert.equal(retry.cleared, false);
  assert.equal(retry.reason, 'unknown or already-used nonce');
});

test('an unknown nonce is refused', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom() });
  const result = ladder.grade('not-a-real-nonce', { kind: 'dish', choiceIndex: 0 }, clock.value);
  assert.equal(result.cleared, false);
  assert.equal(result.reason, 'unknown or already-used nonce');
});

test('an expired challenge is refused', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom(), challengeTtlMs: 1000 });
  const challenge = asDish(ladder.issue('lockout-1') as Challenge);
  clock.advance(5000);
  const result = ladder.grade(challenge.nonce, correctDishAnswer(challenge), clock.value);
  assert.equal(result.cleared, false);
  assert.equal(result.reason, 'challenge expired');
});

test('an answer of the wrong kind is refused rather than accidentally matching', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom() });
  const challenge = asDish(ladder.issue('lockout-1') as Challenge);
  // A sums-shaped answer submitted against a dish challenge.
  const result = ladder.grade(challenge.nonce, { kind: 'sums', answers: [1] }, clock.value);
  assert.equal(result.cleared, false);
});

// ---------------------------------------------------------------- budget (rule 3)

test('the budget allows exactly three skips per rolling hour', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom() });
  assert.equal(ladder.budgetRemaining(clock.value), 3);

  for (let i = 0; i < 3; i++) {
    const challenge = asDish(ladder.issue(`lockout-${i}`) as Challenge);
    const result = ladder.grade(challenge.nonce, correctDishAnswer(challenge), clock.value);
    assert.equal(result.cleared, true);
    clock.advance(60_000);
  }

  assert.equal(ladder.budgetRemaining(clock.value), 0);

  const fourth = ladder.issue('lockout-fourth');
  assert.equal(fourth.rung, 'clock');
});

test('the budget refills after a full rolling hour', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom() });

  for (let i = 0; i < 3; i++) {
    const challenge = asDish(ladder.issue(`lockout-${i}`) as Challenge);
    ladder.grade(challenge.nonce, correctDishAnswer(challenge), clock.value);
  }
  assert.equal(ladder.budgetRemaining(clock.value), 0);

  clock.advance(HOUR_MS + 1000);
  assert.equal(ladder.budgetRemaining(clock.value), 3);

  const issued = ladder.issue('lockout-new');
  assert.notEqual(issued.rung, 'clock');
});

// ---------------------------------------------------------------- school mode

test('school mode starts at sums, with no dish rung offered at all', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom(), schoolMode: true });
  const issued = ladder.issue('lockout-1');
  assert.equal(issued.rung, 'sums');
  assert.notEqual(issued.rung, 'dish');
});

test('outside school mode the dish rung is present', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom() });
  const issued = ladder.issue('lockout-1');
  assert.equal(issued.rung, 'dish');
});

// ---------------------------------------------------------------- the two rules that matter most

test('a cleared ladder returns nothing that could serve as an authentication token', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom() });
  const challenge = asDish(ladder.issue('lockout-1') as Challenge);
  const result = ladder.grade(challenge.nonce, correctDishAnswer(challenge), clock.value);

  assert.equal(result.cleared, true);
  const keys = Object.keys(result).sort();
  // Only ever "cleared", "nextRung", and an optional "reason" — never a token, session id,
  // credential, or anything resembling one.
  assert.deepEqual(keys, ['cleared', 'nextRung']);
  assert.equal('token' in result, false);
  assert.equal('sessionId' in result, false);
  assert.equal('credential' in result, false);
});

test('clearing the ladder does not increase the caller-side attempt budget it never touches', () => {
  // The ladder module has no attempt-budget concept at all — it only exposes its OWN skip
  // budget. Prove that budget goes down, never up, on a win, and that nothing about the shape
  // of a successful clear looks like an attempt-refund.
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom() });
  const before = ladder.budgetRemaining(clock.value);

  const challenge = asDish(ladder.issue('lockout-1') as Challenge);
  const result = ladder.grade(challenge.nonce, correctDishAnswer(challenge), clock.value);
  assert.equal(result.cleared, true);

  const after = ladder.budgetRemaining(clock.value);
  assert.ok(after < before, 'a win must consume the ladder-skip budget, never leave it untouched or refund it');
  assert.equal(after, before - 1);
});

test('a lost round never refunds or grants any budget either', () => {
  const clock = makeClock();
  const ladder = new UnlockLadder({ now: clock.now, random: makeRandom() });
  const before = ladder.budgetRemaining(clock.value);
  const challenge = asDish(ladder.issue('lockout-1') as Challenge);
  ladder.grade(challenge.nonce, wrongDishAnswer(challenge), clock.value);
  const after = ladder.budgetRemaining(clock.value);
  assert.equal(after, before, 'a loss must not change the skip budget at all');
});
