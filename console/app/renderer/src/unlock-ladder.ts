/**
 * Server-owned unlock-ladder state.
 *
 * This module is transport-neutral. It belongs behind a privileged boundary that supplies a
 * cryptographically strong nonce source and the server clock. Public challenges never contain
 * expected answers. A success clears only a wait and cannot be mistaken for authentication.
 */

export type UnlockLadderRung = "dish" | "sums" | "moles" | "clock";

export interface DishChallengePayload {
  choices: readonly [string, string, string, string];
}

export interface SumProblem {
  a: number;
  b: number;
  operator: "+" | "-";
}

export interface SumsChallengePayload {
  problems: readonly SumProblem[];
}

export interface MoleSpawn {
  spawnId: number;
  cell: number;
  appearsAtMs: number;
  disappearsAtMs: number;
}

export interface MolesChallengePayload {
  gridSize: number;
  durationMs: number;
  spawns: readonly MoleSpawn[];
  hitsRequired: number;
}

interface PublicChallengeBase {
  nonce: string;
  rung: Exclude<UnlockLadderRung, "clock">;
  issuedAt: string;
  expiresAt: string;
}

export interface DishChallenge extends PublicChallengeBase {
  rung: "dish";
  payload: DishChallengePayload;
}

export interface SumsChallenge extends PublicChallengeBase {
  rung: "sums";
  payload: SumsChallengePayload;
}

export interface MolesChallenge extends PublicChallengeBase {
  rung: "moles";
  payload: MolesChallengePayload;
}

export type UnlockLadderChallenge = DishChallenge | SumsChallenge | MolesChallenge;

export interface UnlockLadderIssueRequest {
  lockoutId: string;
  budgetScopeId: string;
  schoolMode: boolean;
}

export type UnlockLadderIssueResult =
  | { offered: true; challenge: UnlockLadderChallenge; budgetRemaining: number }
  | {
      offered: false;
      rung: "clock";
      reason:
        | "budget-exhausted"
        | "lockout-clock-only"
        | "nonce-source-unavailable"
        | "state-store-unavailable";
      budgetRemaining: number;
    };

export type UnlockLadderAnswer =
  | { kind: "dish"; choiceIndex: number }
  | { kind: "sums"; answers: readonly number[] }
  | { kind: "moles"; hits: readonly { spawnId: number; cell: number; atMs: number }[] };

export interface UnlockLadderGradeResult {
  waitCleared: boolean;
  nextRung: UnlockLadderRung;
  reason:
    | "correct"
    | "wrong-answer"
    | "wrong-answer-kind"
    | "expired"
    | "unknown-or-consumed-nonce"
    | "mole-round-submitted-early"
    | "state-store-unavailable";
  budgetRemaining: number;
  credentialCleared: false;
  attemptsRestored: false;
  authenticationGranted: false;
}

export interface UnlockLadderOptions {
  now: () => number;
  random: () => number;
  /** Supplied by the privileged boundary. There is no predictable fallback. */
  createNonce: () => string;
  stateStore: UnlockLadderStateStore;
  maxClearedWaitsPerHour?: number;
  challengeTtlMs?: number;
}

interface InternalChallengeBase {
  publicChallenge: UnlockLadderChallenge;
  lockoutId: string;
  budgetScopeId: string;
}

type InternalChallenge =
  | (InternalChallengeBase & { expected: { kind: "dish"; correctIndex: number } })
  | (InternalChallengeBase & { expected: { kind: "sums"; answers: readonly number[] } })
  | (InternalChallengeBase & { expected: { kind: "moles" } });

export interface UnlockLadderLockoutState {
  rung: UnlockLadderRung;
  wrongDishAnswers: number;
}

export interface UnlockLadderStateStore {
  readonly available: boolean;
  readLockout(lockoutId: string): Promise<UnlockLadderLockoutState | undefined>;
  writeLockout(lockoutId: string, state: UnlockLadderLockoutState | undefined): Promise<void>;
  readClearedWaits(budgetScopeId: string): Promise<ReadonlyArray<number>>;
  writeClearedWaits(budgetScopeId: string, timestamps: ReadonlyArray<number>): Promise<void>;
}

const ROLLING_HOUR_MS = 60 * 60 * 1000;
const DEFAULT_CHALLENGE_TTL_MS = 2 * 60 * 1000;
const DEFAULT_MAX_CLEARED_WAITS_PER_HOUR = 3;
const WRONG_DISHES_BEFORE_SUMS = 5;
const MOLE_GRID_SIZE = 9;
const MOLE_DURATION_MS = 8_000;
const MOLE_SPAWN_COUNT = 8;
const MOLE_VISIBLE_MS = 1_200;
const MOLE_HITS_REQUIRED = 5;

const DISH_NAMES = [
  "Har gow",
  "Siu mai",
  "Char siu bao",
  "Egg tart",
  "Cheung fun",
  "Lo mai gai",
] as const;

const STABLE_SCOPE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const NONCE = /^[A-Za-z0-9_-]{32,256}$/u;

function assertServerTime(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("The server clock is invalid.");
  return value;
}

function assertLockoutState(value: UnlockLadderLockoutState | undefined): void {
  if (value === undefined) return;
  if (
    !["dish", "sums", "moles", "clock"].includes(value.rung) ||
    !Number.isSafeInteger(value.wrongDishAnswers) ||
    value.wrongDishAnswers < 0 ||
    value.wrongDishAnswers >= WRONG_DISHES_BEFORE_SUMS
  ) {
    throw new Error("The persisted lockout state is invalid.");
  }
}

function activeBudgetTimestamps(timestamps: ReadonlyArray<number>, atMs: number): number[] {
  if (timestamps.length > 1_000 || timestamps.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error("The persisted ladder budget is invalid or unbounded.");
  }
  return timestamps.filter((timestamp) => atMs - timestamp < ROLLING_HOUR_MS);
}

function pickInt(random: () => number, maxExclusive: number): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error("The random source must return a number from 0 up to, but not including, 1.");
  }
  return Math.floor(value * maxExclusive);
}

function buildDishChallenge(random: () => number): {
  payload: DishChallengePayload;
  correctIndex: number;
} {
  const available = [...DISH_NAMES];
  const choices: string[] = [];
  while (choices.length < 4) {
    choices.push(available.splice(pickInt(random, available.length), 1)[0]!);
  }
  return {
    payload: { choices: choices as [string, string, string, string] },
    correctIndex: pickInt(random, choices.length),
  };
}

function buildSumsChallenge(random: () => number): {
  payload: SumsChallengePayload;
  answers: readonly number[];
} {
  const problems: SumProblem[] = [];
  const answers: number[] = [];
  for (let index = 0; index < 10; index += 1) {
    const operator = random() < 0.5 ? "+" : "-";
    let a = pickInt(random, 90) + 1;
    let b = pickInt(random, 90) + 1;
    if (operator === "-" && b > a) [a, b] = [b, a];
    problems.push({ a, b, operator });
    answers.push(operator === "+" ? a + b : a - b);
  }
  return { payload: { problems }, answers };
}

function buildMolesChallenge(random: () => number): MolesChallengePayload {
  const stepMs = Math.floor(MOLE_DURATION_MS / MOLE_SPAWN_COUNT);
  const spawns: MoleSpawn[] = [];
  for (let index = 0; index < MOLE_SPAWN_COUNT; index += 1) {
    const appearsAtMs = index * stepMs;
    spawns.push({
      spawnId: index,
      cell: pickInt(random, MOLE_GRID_SIZE),
      appearsAtMs,
      disappearsAtMs: Math.min(MOLE_DURATION_MS, appearsAtMs + MOLE_VISIBLE_MS),
    });
  }
  return {
    gridSize: MOLE_GRID_SIZE,
    durationMs: MOLE_DURATION_MS,
    spawns,
    hitsRequired: MOLE_HITS_REQUIRED,
  };
}

export class UnlockLadder {
  readonly #now: () => number;
  readonly #random: () => number;
  readonly #createNonce: () => string;
  readonly #stateStore: UnlockLadderStateStore;
  readonly #maxClearedWaitsPerHour: number;
  readonly #challengeTtlMs: number;
  readonly #challenges = new Map<string, InternalChallenge>();

  constructor(options: UnlockLadderOptions) {
    this.#now = options.now;
    this.#random = options.random;
    this.#createNonce = options.createNonce;
    this.#stateStore = options.stateStore;
    this.#maxClearedWaitsPerHour =
      options.maxClearedWaitsPerHour ?? DEFAULT_MAX_CLEARED_WAITS_PER_HOUR;
    this.#challengeTtlMs = options.challengeTtlMs ?? DEFAULT_CHALLENGE_TTL_MS;
    if (
      !Number.isSafeInteger(this.#maxClearedWaitsPerHour) ||
      this.#maxClearedWaitsPerHour < 1 ||
      this.#maxClearedWaitsPerHour > 20
    ) {
      throw new Error("The rolling-hour ladder budget must be between 1 and 20.");
    }
    if (!Number.isSafeInteger(this.#challengeTtlMs) || this.#challengeTtlMs < 1_000) {
      throw new Error("The challenge lifetime must be at least one second.");
    }
  }

  async issue(request: UnlockLadderIssueRequest): Promise<UnlockLadderIssueResult> {
    if (!STABLE_SCOPE_ID.test(request.lockoutId) || !STABLE_SCOPE_ID.test(request.budgetScopeId)) {
      throw new Error("The lockout and budget scope identities must be stable identifiers.");
    }
    let atMs: number;
    try {
      atMs = assertServerTime(this.#now());
    } catch {
      return {
        offered: false,
        rung: "clock",
        reason: "state-store-unavailable",
        budgetRemaining: 0,
      };
    }
    if (!this.#stateStore.available) {
      return {
        offered: false,
        rung: "clock",
        reason: "state-store-unavailable",
        budgetRemaining: 0,
      };
    }
    let budgetRemaining: number;
    let existing: UnlockLadderLockoutState | undefined;
    try {
      budgetRemaining = await this.#budgetRemaining(request.budgetScopeId, atMs);
      existing = await this.#stateStore.readLockout(request.lockoutId);
      assertLockoutState(existing);
    } catch {
      return {
        offered: false,
        rung: "clock",
        reason: "state-store-unavailable",
        budgetRemaining: 0,
      };
    }
    if (existing?.rung === "clock") {
      return { offered: false, rung: "clock", reason: "lockout-clock-only", budgetRemaining };
    }
    if (budgetRemaining === 0) {
      return { offered: false, rung: "clock", reason: "budget-exhausted", budgetRemaining };
    }

    const rung = request.schoolMode && existing?.rung === "dish"
      ? "sums"
      : existing?.rung ?? (request.schoolMode ? "sums" : "dish");
    try {
      await this.#stateStore.writeLockout(request.lockoutId, {
        rung,
        wrongDishAnswers: existing?.wrongDishAnswers ?? 0,
      });
    } catch {
      return {
        offered: false,
        rung: "clock",
        reason: "state-store-unavailable",
        budgetRemaining: 0,
      };
    }

    const nonce = this.#createNonce();
    if (!NONCE.test(nonce) || this.#challenges.has(nonce)) {
      return { offered: false, rung: "clock", reason: "nonce-source-unavailable", budgetRemaining };
    }
    const base = {
      nonce,
      issuedAt: new Date(atMs).toISOString(),
      expiresAt: new Date(atMs + this.#challengeTtlMs).toISOString(),
    };

    let internal: InternalChallenge;
    if (rung === "dish") {
      const built = buildDishChallenge(this.#random);
      const publicChallenge: DishChallenge = { ...base, rung, payload: built.payload };
      internal = {
        publicChallenge,
        lockoutId: request.lockoutId,
        budgetScopeId: request.budgetScopeId,
        expected: { kind: "dish", correctIndex: built.correctIndex },
      };
    } else if (rung === "sums") {
      const built = buildSumsChallenge(this.#random);
      const publicChallenge: SumsChallenge = { ...base, rung, payload: built.payload };
      internal = {
        publicChallenge,
        lockoutId: request.lockoutId,
        budgetScopeId: request.budgetScopeId,
        expected: { kind: "sums", answers: built.answers },
      };
    } else if (rung === "moles") {
      const publicChallenge: MolesChallenge = {
        ...base,
        rung,
        payload: buildMolesChallenge(this.#random),
      };
      internal = {
        publicChallenge,
        lockoutId: request.lockoutId,
        budgetScopeId: request.budgetScopeId,
        expected: { kind: "moles" },
      };
    } else {
      return { offered: false, rung: "clock", reason: "lockout-clock-only", budgetRemaining };
    }

    this.#challenges.set(nonce, internal);
    return { offered: true, challenge: internal.publicChallenge, budgetRemaining };
  }

  async grade(nonce: string, answer: UnlockLadderAnswer): Promise<UnlockLadderGradeResult> {
    const internal = this.#challenges.get(nonce);
    if (!internal) return this.#gradeResult(false, "clock", "unknown-or-consumed-nonce", 0);
    this.#challenges.delete(nonce);

    let atMs: number;
    try {
      atMs = assertServerTime(this.#now());
    } catch {
      return this.#gradeResult(false, "clock", "state-store-unavailable", 0);
    }
    if (!this.#stateStore.available) {
      return this.#gradeResult(false, "clock", "state-store-unavailable", 0);
    }
    if (atMs > Date.parse(internal.publicChallenge.expiresAt)) {
      try {
        const nextRung = await this.#escalate(internal.lockoutId, internal.publicChallenge.rung);
        return this.#gradeResult(
          false,
          nextRung,
          "expired",
          await this.#budgetRemaining(internal.budgetScopeId, atMs),
        );
      } catch {
        return this.#gradeResult(false, "clock", "state-store-unavailable", 0);
      }
    }

    if (answer.kind !== internal.expected.kind) {
      try {
        const nextRung = await this.#escalate(internal.lockoutId, internal.publicChallenge.rung);
        return this.#gradeResult(
          false,
          nextRung,
          "wrong-answer-kind",
          await this.#budgetRemaining(internal.budgetScopeId, atMs),
        );
      } catch {
        return this.#gradeResult(false, "clock", "state-store-unavailable", 0);
      }
    }

    let correct = false;
    if (internal.expected.kind === "dish" && answer.kind === "dish") {
      correct = answer.choiceIndex === internal.expected.correctIndex;
    } else if (internal.expected.kind === "sums" && answer.kind === "sums") {
      correct =
        answer.answers.length === internal.expected.answers.length &&
        internal.expected.answers.every((value, index) => answer.answers[index] === value);
    } else if (internal.expected.kind === "moles" && answer.kind === "moles") {
      const challenge = internal.publicChallenge as MolesChallenge;
      if (atMs - Date.parse(challenge.issuedAt) < challenge.payload.durationMs) {
        try {
          const nextRung = await this.#escalate(internal.lockoutId, "moles");
          return this.#gradeResult(
            false,
            nextRung,
            "mole-round-submitted-early",
            await this.#budgetRemaining(internal.budgetScopeId, atMs),
          );
        } catch {
          return this.#gradeResult(false, "clock", "state-store-unavailable", 0);
        }
      }
      correct = this.#gradeMoles(challenge, answer);
    }

    if (!correct) {
      try {
        const nextRung = await this.#escalate(internal.lockoutId, internal.publicChallenge.rung);
        return this.#gradeResult(
          false,
          nextRung,
          "wrong-answer",
          await this.#budgetRemaining(internal.budgetScopeId, atMs),
        );
      } catch {
        return this.#gradeResult(false, "clock", "state-store-unavailable", 0);
      }
    }

    try {
      await this.#recordClearedWait(internal.budgetScopeId, atMs);
      await this.#stateStore.writeLockout(internal.lockoutId, undefined);
      return this.#gradeResult(
        true,
        internal.publicChallenge.rung,
        "correct",
        await this.#budgetRemaining(internal.budgetScopeId, atMs),
      );
    } catch {
      return this.#gradeResult(false, "clock", "state-store-unavailable", 0);
    }
  }

  #gradeMoles(
    challenge: MolesChallenge,
    answer: Extract<UnlockLadderAnswer, { kind: "moles" }>,
  ): boolean {
    if (answer.hits.length > 256) return false;
    const credited = new Set<number>();
    for (const hit of answer.hits) {
      const spawn = challenge.payload.spawns.find((candidate) => candidate.spawnId === hit.spawnId);
      if (
        !spawn ||
        credited.has(spawn.spawnId) ||
        spawn.cell !== hit.cell ||
        !Number.isSafeInteger(hit.atMs) ||
        hit.atMs < spawn.appearsAtMs ||
        hit.atMs > spawn.disappearsAtMs
      ) {
        continue;
      }
      credited.add(spawn.spawnId);
    }
    return credited.size >= challenge.payload.hitsRequired;
  }

  async #escalate(
    lockoutId: string,
    rung: Exclude<UnlockLadderRung, "clock">,
  ): Promise<UnlockLadderRung> {
    const stored = await this.#stateStore.readLockout(lockoutId);
    assertLockoutState(stored);
    const current = stored ?? { rung, wrongDishAnswers: 0 };
    let next: UnlockLadderRung;
    let wrongDishAnswers = current.wrongDishAnswers;
    if (rung === "dish") {
      wrongDishAnswers += 1;
      next = wrongDishAnswers >= WRONG_DISHES_BEFORE_SUMS ? "sums" : "dish";
      if (next === "sums") wrongDishAnswers = 0;
    } else if (rung === "sums") {
      next = "moles";
    } else {
      next = "clock";
    }
    await this.#stateStore.writeLockout(lockoutId, { rung: next, wrongDishAnswers });
    return next;
  }

  async #budgetRemaining(scopeId: string, atMs: number): Promise<number> {
    const timestamps = await this.#stateStore.readClearedWaits(scopeId);
    const active = activeBudgetTimestamps(timestamps, atMs);
    if (active.length !== timestamps.length) {
      await this.#stateStore.writeClearedWaits(scopeId, active);
    }
    return Math.max(0, this.#maxClearedWaitsPerHour - active.length);
  }

  async #recordClearedWait(scopeId: string, atMs: number): Promise<void> {
    const timestamps = await this.#stateStore.readClearedWaits(scopeId);
    const active = activeBudgetTimestamps(timestamps, atMs);
    if (active.length >= this.#maxClearedWaitsPerHour) {
      throw new Error("The rolling-hour ladder budget was exhausted before grading completed.");
    }
    await this.#stateStore.writeClearedWaits(scopeId, [...active, atMs]);
  }

  #gradeResult(
    waitCleared: boolean,
    nextRung: UnlockLadderRung,
    reason: UnlockLadderGradeResult["reason"],
    budgetRemaining: number,
  ): UnlockLadderGradeResult {
    return {
      waitCleared,
      nextRung,
      reason,
      budgetRemaining,
      credentialCleared: false,
      attemptsRestored: false,
      authenticationGranted: false,
    };
  }
}
