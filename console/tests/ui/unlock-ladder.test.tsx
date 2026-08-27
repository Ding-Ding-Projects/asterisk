import assert from 'node:assert/strict';
import test from 'node:test';

import {
  UnlockLadder,
  type DishChallenge,
  type MolesChallenge,
  type SumsChallenge,
  type UnlockLadderAnswer,
  type UnlockLadderChallenge,
  type UnlockLadderIssueResult,
  type UnlockLadderLockoutState,
  type UnlockLadderStateStore,
} from '../../app/renderer/src/unlock-ladder.ts';

const HOUR_MS = 60 * 60 * 1000;

function clock(start = 1_000_000) {
  let value = start;
  return { now: () => value, advance: (milliseconds: number) => (value += milliseconds), get value() { return value; } };
}

function random(seed = 17) {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

class MemoryStateStore implements UnlockLadderStateStore {
  available = true;
  readonly lockouts = new Map<string, UnlockLadderLockoutState>();
  readonly clearedWaits = new Map<string, number[]>();

  async readLockout(id: string): Promise<UnlockLadderLockoutState | undefined> {
    const state = this.lockouts.get(id);
    return state && { ...state };
  }
  async writeLockout(id: string, state: UnlockLadderLockoutState | undefined): Promise<void> {
    if (state === undefined) this.lockouts.delete(id);
    else this.lockouts.set(id, { ...state });
  }
  async readClearedWaits(id: string): Promise<ReadonlyArray<number>> {
    return [...(this.clearedWaits.get(id) ?? [])];
  }
  async writeClearedWaits(id: string, timestamps: ReadonlyArray<number>): Promise<void> {
    this.clearedWaits.set(id, [...timestamps]);
  }
}

function fixture(options: { schoolMode?: boolean; ttl?: number; max?: number } = {}) {
  const time = clock();
  const store = new MemoryStateStore();
  let nonce = 0;
  const ladder = new UnlockLadder({
    now: time.now,
    // A fixed, valid source keeps the public challenge shape deterministic without exposing
    // private expected answers through a production-only test hook.
    random: () => 0,
    createNonce: () => `${++nonce}`.padStart(32, 'n'),
    stateStore: store,
    challengeTtlMs: options.ttl,
    maxClearedWaitsPerHour: options.max,
  });
  const request = (lockoutId = 'lockout-a', budgetScopeId = 'budget-a') => ({
    lockoutId,
    budgetScopeId,
    schoolMode: options.schoolMode ?? false,
  });
  return { time, store, ladder, request };
}

function offered(result: UnlockLadderIssueResult): UnlockLadderChallenge {
  assert.equal(result.offered, true);
  return (result as Extract<UnlockLadderIssueResult, { offered: true }>).challenge;
}
function dish(challenge: UnlockLadderChallenge): DishChallenge { assert.equal(challenge.rung, 'dish'); return challenge as DishChallenge; }
function sums(challenge: UnlockLadderChallenge): SumsChallenge { assert.equal(challenge.rung, 'sums'); return challenge as SumsChallenge; }
function moles(challenge: UnlockLadderChallenge): MolesChallenge { assert.equal(challenge.rung, 'moles'); return challenge as MolesChallenge; }
function sumsAnswer(challenge: SumsChallenge, correct = true): UnlockLadderAnswer {
  const answers = challenge.payload.problems.map((problem) => problem.operator === '+' ? problem.a + problem.b : problem.a - problem.b);
  if (!correct) answers[0] = answers[0]! + 1;
  return { kind: 'sums', answers };
}
function winningMoles(challenge: MolesChallenge): UnlockLadderAnswer {
  return {
    kind: 'moles',
    hits: challenge.payload.spawns.slice(0, challenge.payload.hitsRequired).map((spawn) => ({
      spawnId: spawn.spawnId,
      cell: spawn.cell,
      atMs: spawn.appearsAtMs + 1,
    })),
  };
}

const CORRECT_DISH: UnlockLadderAnswer = { kind: 'dish', choiceIndex: 0 };

async function issueDish(context: ReturnType<typeof fixture>) {
  return dish(offered(await context.ladder.issue(context.request())));
}

test('issues durable dish state, consumes a nonce once, and clears only the wait', async () => {
  const context = fixture();
  const challenge = await issueDish(context);
  assert.equal((await context.store.readLockout('lockout-a'))?.rung, 'dish');
  const result = await context.ladder.grade(challenge.nonce, CORRECT_DISH);
  assert.equal(result.waitCleared, true);
  assert.equal(result.authenticationGranted, false);
  assert.equal(result.attemptsRestored, false);
  assert.equal(result.credentialCleared, false);
  assert.equal(await context.store.readLockout('lockout-a'), undefined);
  assert.deepEqual(await context.store.readClearedWaits('budget-a'), [context.time.value]);
  assert.equal((await context.ladder.grade(challenge.nonce, CORRECT_DISH)).reason, 'unknown-or-consumed-nonce');
});

test('wrong dishes persist through five failures and then move the same lockout to sums', async () => {
  const context = fixture();
  for (let count = 1; count <= 5; count += 1) {
    const challenge = await issueDish(context);
    const result = await context.ladder.grade(challenge.nonce, { kind: 'dish', choiceIndex: 1 });
    assert.equal(result.nextRung, count === 5 ? 'sums' : 'dish');
    assert.equal((await context.store.readLockout('lockout-a'))?.rung, result.nextRung);
  }
  assert.equal(sums(offered(await context.ladder.issue(context.request()))).payload.problems.length, 10);
});

test('School mode starts at sums and its offered challenge contains no hidden dish payload', async () => {
  const context = fixture({ schoolMode: true });
  const challenge = sums(offered(await context.ladder.issue(context.request())));
  assert.equal(challenge.rung, 'sums');
  assert.equal('choices' in challenge.payload, false);
  assert.equal(JSON.stringify(challenge).toLowerCase().includes('dish'), false);
});

test('one wrong sum reaches moles, and a lost mole round becomes wait-only permanently', async () => {
  const context = fixture({ schoolMode: true });
  const sumChallenge = sums(offered(await context.ladder.issue(context.request())));
  assert.equal((await context.ladder.grade(sumChallenge.nonce, sumsAnswer(sumChallenge, false))).nextRung, 'moles');
  const moleChallenge = moles(offered(await context.ladder.issue(context.request())));
  context.time.advance(moleChallenge.payload.durationMs + 1);
  assert.equal((await context.ladder.grade(moleChallenge.nonce, { kind: 'moles', hits: [] })).nextRung, 'clock');
  assert.deepEqual(await context.ladder.issue(context.request()), { offered: false, rung: 'clock', reason: 'lockout-clock-only', budgetRemaining: 3 });
});

test('mole grading requires a completed round and exact spawnId, cell, window, and uniqueness', async () => {
  const context = fixture({ schoolMode: true });
  const sumChallenge = sums(offered(await context.ladder.issue(context.request())));
  await context.ladder.grade(sumChallenge.nonce, sumsAnswer(sumChallenge, false));
  const early = moles(offered(await context.ladder.issue(context.request())));
  assert.equal((await context.ladder.grade(early.nonce, winningMoles(early))).reason, 'mole-round-submitted-early');

  const duplicates = fixture({ schoolMode: true });
  const duplicateSums = sums(offered(await duplicates.ladder.issue(duplicates.request())));
  await duplicates.ladder.grade(duplicateSums.nonce, sumsAnswer(duplicateSums, false));
  const next = moles(offered(await duplicates.ladder.issue(duplicates.request())));
  duplicates.time.advance(next.payload.durationMs + 1);
  const first = next.payload.spawns[0]!;
  const duplicate = { kind: 'moles' as const, hits: Array.from({ length: next.payload.hitsRequired }, () => ({ spawnId: first.spawnId, cell: first.cell, atMs: first.appearsAtMs + 1 })) };
  assert.equal((await duplicates.ladder.grade(next.nonce, duplicate)).waitCleared, false);

  const invalidContext = fixture({ schoolMode: true });
  const invalidSums = sums(offered(await invalidContext.ladder.issue(invalidContext.request())));
  await invalidContext.ladder.grade(invalidSums.nonce, sumsAnswer(invalidSums, false));
  const final = moles(offered(await invalidContext.ladder.issue(invalidContext.request())));
  invalidContext.time.advance(final.payload.durationMs + 1);
  const invalid = { kind: 'moles' as const, hits: final.payload.spawns.slice(0, final.payload.hitsRequired).map((spawn) => ({ spawnId: spawn.spawnId, cell: (spawn.cell + 1) % final.payload.gridSize, atMs: spawn.appearsAtMs + 1 })) };
  assert.equal((await invalidContext.ladder.grade(final.nonce, invalid)).waitCleared, false);
});

test('valid distinct mole hits clear a wait without producing authentication or an attempt refund', async () => {
  const context = fixture({ schoolMode: true });
  const sumChallenge = sums(offered(await context.ladder.issue(context.request())));
  await context.ladder.grade(sumChallenge.nonce, sumsAnswer(sumChallenge, false));
  const challenge = moles(offered(await context.ladder.issue(context.request())));
  context.time.advance(challenge.payload.durationMs + 1);
  const result = await context.ladder.grade(challenge.nonce, winningMoles(challenge));
  assert.equal(result.waitCleared, true);
  assert.equal(result.authenticationGranted, false);
  assert.equal(result.attemptsRestored, false);
  assert.equal(result.credentialCleared, false);
});

test('expired, wrong-kind, unknown, and unavailable states fail closed while consuming issued nonces', async () => {
  const expired = fixture({ ttl: 1_000 });
  const challenge = await issueDish(expired);
  expired.time.advance(1_001);
  assert.equal((await expired.ladder.grade(challenge.nonce, { kind: 'sums', answers: [] })).reason, 'expired');
  assert.equal((await expired.ladder.grade(challenge.nonce, { kind: 'dish', choiceIndex: 0 })).reason, 'unknown-or-consumed-nonce');
  const unavailable = fixture();
  unavailable.store.available = false;
  assert.deepEqual(await unavailable.ladder.issue(unavailable.request()), { offered: false, rung: 'clock', reason: 'state-store-unavailable', budgetRemaining: 0 });
});

test('the rolling budget permits exactly three clears, rejects a fourth, and refills only after the rolling hour', async () => {
  const context = fixture();
  for (let index = 0; index < 3; index += 1) {
    const challenge = await issueDish(context);
    assert.equal((await context.ladder.grade(challenge.nonce, CORRECT_DISH)).waitCleared, true);
    context.time.advance(1);
  }
  assert.deepEqual(await context.ladder.issue(context.request('fresh-lockout')), { offered: false, rung: 'clock', reason: 'budget-exhausted', budgetRemaining: 0 });
  context.time.advance(HOUR_MS);
  assert.equal(offered(await context.ladder.issue(context.request('fresh-lockout'))).rung, 'dish');
});

test('nonce source refusal fails closed without storing a challenge', async () => {
  const time = clock();
  const store = new MemoryStateStore();
  const ladder = new UnlockLadder({ now: time.now, random: random(), createNonce: () => 'bad', stateStore: store });
  assert.deepEqual(await ladder.issue({ lockoutId: 'lockout-a', budgetScopeId: 'budget-a', schoolMode: false }), { offered: false, rung: 'clock', reason: 'nonce-source-unavailable', budgetRemaining: 3 });
});
