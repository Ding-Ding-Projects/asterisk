/**
 * The unlock ladder — an escalating set of small challenges that can clear a lockout WAIT.
 *
 * Five rules make this safe rather than merely fun (see the shared instructions for the full
 * writeup); each is called out at its enforcement point below:
 *
 *   1. Clears the WAITING, never the CREDENTIAL. `grade()` never returns anything that could be
 *      mistaken for a session token or an authentication result — `cleared: true` means "the wait
 *      is over," nothing more, and the caller still has to sign in normally.
 *   2. Never refunds the attempt budget. This module has no concept of "attempts remaining" at
 *      all — it only tracks how many times the LADDER itself has been used to skip a wait, which
 *      is rule 3's budget. It never touches whatever counter the caller uses for sign-in attempts.
 *   3. Budgeted: at most 3 skips per rolling hour. After that, `issue()` returns the clock.
 *   4. Never slows the escalation it skips: this module has no opinion about lockout duration at
 *      all. It is purely "can this particular wait be skipped," and the caller's own exponential
 *      backoff is untouched either way.
 *   5. Every challenge is graded against a single-use nonce that is consumed before grading, and
 *      challenges expire.
 */

export type Rung = 'dish' | 'sums' | 'moles' | 'clock';

export interface DishChallengePayload {
  choices: readonly [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export interface SumProblem {
  a: number;
  b: number;
  op: '+' | '-';
}

export interface SumsChallengePayload {
  problems: readonly SumProblem[];
}

export interface MoleSpawn {
  /** Index into a fixed grid (e.g. 0-8 for a 3x3 board). */
  cell: number;
  /** Milliseconds from round start at which this mole becomes hittable. */
  atMs: number;
  /** Milliseconds from round start at which this mole disappears. */
  untilMs: number;
}

export interface MolesChallengePayload {
  grid: number;
  durationMs: number;
  spawns: readonly MoleSpawn[];
  /** Minimum number of distinct spawns that must be hit to clear the round. */
  hitsRequired: number;
}

export interface ClockChallengePayload {
  reason: string;
}

interface BaseChallenge {
  nonce: string;
  lockoutId: string;
  rung: Rung;
  issuedAtMs: number;
  expiresAtMs: number;
}

export interface DishChallenge extends BaseChallenge {
  rung: 'dish';
  payload: DishChallengePayload;
}

export interface SumsChallenge extends BaseChallenge {
  rung: 'sums';
  payload: SumsChallengePayload;
}

export interface MolesChallenge extends BaseChallenge {
  rung: 'moles';
  payload: MolesChallengePayload;
}

export type Challenge = DishChallenge | SumsChallenge | MolesChallenge;

export interface ClockResult {
  rung: 'clock';
  reason: string;
}

export type IssueResult = Challenge | ClockResult;

export interface DishAnswer {
  kind: 'dish';
  choiceIndex: number;
}

export interface SumsAnswer {
  kind: 'sums';
  /** One answer per problem, in the same order as the challenge's `problems`. */
  answers: readonly number[];
}

export interface MolesAnswer {
  kind: 'moles';
  /**
   * Each hit names the cell and the time (ms from round start) it was tapped. A hit only counts
   * when it lands on a cell that was genuinely visible (within its spawn/expiry window) at that
   * time, and each spawn can be credited at most once.
   */
  hits: readonly { cell: number; atMs: number }[];
  /** Wall-clock time (ms since epoch) the submission was made, used for the "cannot finish
   * faster than the round lasts" check. */
  submittedAtMs: number;
}

export type Answer = DishAnswer | SumsAnswer | MolesAnswer;

export interface GradeResult {
  cleared: boolean;
  /** The rung the caller should be offered next. When `cleared` is true this still reports a
   * rung for bookkeeping purposes, but the caller's job at that point is only to unlock the wait,
   * never to keep playing. */
  nextRung: Rung;
  reason?: string;
}

export interface UnlockLadderOptions {
  now: () => number;
  random: () => number;
  schoolMode?: boolean;
  /** Maximum number of skipped waits allowed per rolling hour. Defaults to 3 — this is what
   * makes the ladder safe rather than merely clever; do not raise it without re-reading rule 3. */
  maxSkipsPerHour?: number;
  challengeTtlMs?: number;
}

const ROLLING_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_TTL_MS = 2 * 60 * 1000;
const DEFAULT_MAX_SKIPS_PER_HOUR = 3;

const DISH_NAMES = [
  'Har gow',
  'Siu mai',
  'Char siu bao',
  'Egg tart',
  'Cheung fun',
  'Lo mai gai',
] as const;

const GRID_SIZE = 9;
const MOLE_ROUND_MS = 8000;
const HITS_REQUIRED = 5;
const SPAWN_COUNT = 8;
const SPAWN_VISIBLE_MS = 1200;

const WRONG_DISHES_TO_ESCALATE = 5;

function startingRung(schoolMode: boolean | undefined): Rung {
  // School mode requires every dish-related capability to behave as though it is not
  // installed — not "skipped with a message," genuinely absent, because naming the hidden
  // thing is exactly what that mode forbids. One function decides this so no caller can get
  // it wrong locally.
  return schoolMode ? 'sums' : 'dish';
}

function makeNonce(random: () => number): string {
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += Math.floor(random() * 16).toString(16);
  }
  return out;
}

function pickInt(random: () => number, maxExclusive: number): number {
  return Math.floor(random() * maxExclusive);
}

function buildDishPayload(random: () => number): DishChallengePayload {
  const pool = [...DISH_NAMES];
  const picked: string[] = [];
  while (picked.length < 4 && pool.length > 0) {
    const idx = pickInt(random, pool.length);
    picked.push(pool.splice(idx, 1)[0]!);
  }
  const correctIndex = pickInt(random, 4) as 0 | 1 | 2 | 3;
  return {
    choices: picked as unknown as [string, string, string, string],
    correctIndex,
  };
}

function buildSumsPayload(random: () => number): SumsChallengePayload {
  const problems: SumProblem[] = [];
  for (let i = 0; i < 10; i++) {
    const op: '+' | '-' = random() < 0.5 ? '+' : '-';
    let a = pickInt(random, 90) + 1;
    let b = pickInt(random, 90) + 1;
    if (op === '-' && b > a) {
      const tmp = a;
      a = b;
      b = tmp;
    }
    problems.push({ a, b, op });
  }
  return { problems };
}

function sumAnswer(p: SumProblem): number {
  return p.op === '+' ? p.a + p.b : p.a - p.b;
}

function buildMolesPayload(random: () => number): MolesChallengePayload {
  const spawns: MoleSpawn[] = [];
  const step = MOLE_ROUND_MS / SPAWN_COUNT;
  for (let i = 0; i < SPAWN_COUNT; i++) {
    const atMs = Math.floor(i * step);
    spawns.push({
      cell: pickInt(random, GRID_SIZE),
      atMs,
      untilMs: atMs + SPAWN_VISIBLE_MS,
    });
  }
  return {
    grid: GRID_SIZE,
    durationMs: MOLE_ROUND_MS,
    spawns,
    hitsRequired: HITS_REQUIRED,
  };
}

interface StoredChallenge {
  challenge: Challenge;
  consumed: boolean;
}

export class UnlockLadder {
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly schoolMode: boolean;
  private readonly maxSkipsPerHour: number;
  private readonly ttlMs: number;

  private readonly challenges = new Map<string, StoredChallenge>();
  /** Timestamps (ms) of skips already granted, for the rolling-hour budget. */
  private readonly skipTimestamps: number[] = [];
  /** Per-lockout: once a rung has been lost to the clock, the ladder is not offered again. */
  private readonly clockedOut = new Set<string>();
  /** Per-lockout: current rung the caller is on, for escalation bookkeeping. */
  private readonly lockoutRung = new Map<string, Rung>();
  /** Per-lockout: consecutive wrong dish answers (5 escalates to sums). */
  private readonly wrongDishCount = new Map<string, number>();

  constructor(options: UnlockLadderOptions) {
    this.now = options.now;
    this.random = options.random;
    this.schoolMode = options.schoolMode ?? false;
    this.maxSkipsPerHour = options.maxSkipsPerHour ?? DEFAULT_MAX_SKIPS_PER_HOUR;
    this.ttlMs = options.challengeTtlMs ?? DEFAULT_TTL_MS;
  }

  private pruneSkipWindow(atMs: number): void {
    while (this.skipTimestamps.length > 0 && atMs - this.skipTimestamps[0]! > ROLLING_WINDOW_MS) {
      this.skipTimestamps.shift();
    }
  }

  /** How many skips remain in the current rolling hour. */
  budgetRemaining(atMs: number): number {
    this.pruneSkipWindow(atMs);
    return Math.max(0, this.maxSkipsPerHour - this.skipTimestamps.length);
  }

  private recordSkip(atMs: number): void {
    this.skipTimestamps.push(atMs);
  }

  issue(lockoutId: string): IssueResult {
    const atMs = this.now();

    if (this.clockedOut.has(lockoutId)) {
      return { rung: 'clock', reason: 'this lockout already lost a round; only the clock remains' };
    }

    if (this.budgetRemaining(atMs) <= 0) {
      return { rung: 'clock', reason: 'ladder budget exhausted for this rolling hour' };
    }

    let rung = this.lockoutRung.get(lockoutId);
    if (!rung) {
      rung = startingRung(this.schoolMode);
      this.lockoutRung.set(lockoutId, rung);
    }

    if (rung === 'clock') {
      return { rung: 'clock', reason: 'this lockout already lost a round; only the clock remains' };
    }

    const nonce = makeNonce(this.random);
    const base = {
      nonce,
      lockoutId,
      issuedAtMs: atMs,
      expiresAtMs: atMs + this.ttlMs,
    };

    let challenge: Challenge;
    if (rung === 'dish') {
      challenge = { ...base, rung: 'dish', payload: buildDishPayload(this.random) };
    } else if (rung === 'sums') {
      challenge = { ...base, rung: 'sums', payload: buildSumsPayload(this.random) };
    } else {
      challenge = { ...base, rung: 'moles', payload: buildMolesPayload(this.random) };
    }

    this.challenges.set(nonce, { challenge, consumed: false });
    return challenge;
  }

  private gradeDish(challenge: DishChallenge, answer: Answer): boolean {
    if (answer.kind !== 'dish') return false;
    return answer.choiceIndex === challenge.payload.correctIndex;
  }

  private gradeSums(challenge: SumsChallenge, answer: Answer): boolean {
    if (answer.kind !== 'sums') return false;
    const { problems } = challenge.payload;
    if (answer.answers.length !== problems.length) return false;
    return problems.every((p, i) => answer.answers[i] === sumAnswer(p));
  }

  private gradeMoles(challenge: MolesChallenge, answer: Answer): boolean {
    if (answer.kind !== 'moles') return false;

    const roundStartMs = challenge.issuedAtMs;
    const elapsedMs = answer.submittedAtMs - roundStartMs;

    // A timed game cannot be won faster than it lasts: reject any submission arriving before
    // the round's own duration has genuinely elapsed.
    if (elapsedMs < challenge.payload.durationMs) return false;

    const claimedSpawns = new Set<number>();
    for (const hit of answer.hits) {
      const spawnIndex = challenge.payload.spawns.findIndex(
        (spawn, idx) =>
          !claimedSpawns.has(idx) &&
          spawn.cell === hit.cell &&
          hit.atMs >= spawn.atMs &&
          hit.atMs <= spawn.untilMs,
      );
      if (spawnIndex >= 0) {
        claimedSpawns.add(spawnIndex);
      }
    }

    return claimedSpawns.size >= challenge.payload.hitsRequired;
  }

  grade(nonce: string, answer: Answer, atMs: number): GradeResult {
    const entry = this.challenges.get(nonce);
    if (!entry) {
      return { cleared: false, nextRung: 'clock', reason: 'unknown or already-used nonce' };
    }

    // Single-use: consume the nonce before grading, so a wrong answer cannot be retried against
    // the same question and a right one cannot be replayed.
    this.challenges.delete(nonce);
    if (entry.consumed) {
      return { cleared: false, nextRung: 'clock', reason: 'nonce already consumed' };
    }
    entry.consumed = true;

    const { challenge } = entry;

    if (atMs > challenge.expiresAtMs) {
      const fallback = this.escalateAfterFailure(challenge.lockoutId, challenge.rung);
      return { cleared: false, nextRung: fallback, reason: 'challenge expired' };
    }

    let correct: boolean;
    switch (challenge.rung) {
      case 'dish':
        correct = this.gradeDish(challenge, answer);
        break;
      case 'sums':
        correct = this.gradeSums(challenge, answer);
        break;
      case 'moles':
        correct = this.gradeMoles(challenge, answer);
        break;
    }

    if (correct) {
      // Winning any rung clears the wait outright and is a genuine skip, so it consumes the
      // budget (rule 3) — rule 2 (never refunding the *attempt* budget) is a different counter
      // entirely: this module has no notion of sign-in attempts at all.
      this.recordSkip(atMs);
      this.lockoutRung.delete(challenge.lockoutId);
      this.wrongDishCount.delete(challenge.lockoutId);
      // Rule 1: this result carries nothing that could be mistaken for authentication. It says
      // only that the WAIT is cleared; the caller still returns to the ordinary sign-in form.
      return { cleared: true, nextRung: challenge.rung };
    }

    const fallback = this.escalateAfterFailure(challenge.lockoutId, challenge.rung);
    return { cleared: false, nextRung: fallback, reason: 'wrong answer' };
  }

  /**
   * Decides the next rung after a failure, per the ladder's own escalation rule: five wrong
   * dishes before falling to sums, a single wrong sum falls to moles, and losing a mole round
   * falls to the clock — after which the ladder is not offered again for that lockout.
   */
  private escalateAfterFailure(lockoutId: string, rung: Rung): Rung {
    let next: Rung;

    if (rung === 'dish') {
      const wrongSoFar = (this.wrongDishCount.get(lockoutId) ?? 0) + 1;
      if (wrongSoFar >= WRONG_DISHES_TO_ESCALATE) {
        this.wrongDishCount.delete(lockoutId);
        next = 'sums';
      } else {
        this.wrongDishCount.set(lockoutId, wrongSoFar);
        next = 'dish';
      }
    } else if (rung === 'sums') {
      next = 'moles';
    } else {
      // Losing a mole round, or anything already at the clock, falls straight to the clock and
      // stays there for this lockout.
      next = 'clock';
    }

    this.lockoutRung.set(lockoutId, next);
    if (next === 'clock') {
      this.clockedOut.add(lockoutId);
    }
    return next;
  }
}
