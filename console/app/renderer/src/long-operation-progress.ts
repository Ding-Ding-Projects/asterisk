/**
 * Long operation progress.
 *
 * Three failures this exists to prevent, matched to the three parts below.
 *
 *  - A BARE SPINNER IS INDISTINGUISHABLE FROM A HANG. The operations that most need
 *    reporting -- cloning submodules, fetching a large history, indexing -- are exactly
 *    the ones slow enough for a user to conclude the app has frozen. So progress is
 *    modelled as weighted phases with a label, producing a real fraction wherever the
 *    total work is known, and an honest "indeterminate" state -- never a fabricated
 *    number -- wherever it is not. A stall detector sits underneath both: indeterminate
 *    means "we do not know the total", stalled means "nothing has happened for a while",
 *    and the two must stay distinguishable, or a genuinely stuck indeterminate operation
 *    looks identical to one working normally.
 *  - A DISABLED BUTTON IS THE VISIBLE GUARD, NOT THE REAL ONE. A keyboard submit walks
 *    straight past a disabled control. The re-entry guard here lives in the state
 *    transition itself: starting an operation that is already running is refused by
 *    `startOperation` unconditionally, and the refusal is reported back rather than
 *    silently swallowed. A UI layer can still disable its button for the visible half,
 *    but the handler refuses on its own regardless of whether that UI check ran.
 *  - CANCELLING IS NOT FAILING AND IT IS NOT SUCCEEDING. A cancelled operation reports
 *    exactly how much of the weighted work actually completed, as a status distinct from
 *    `succeeded` -- claiming success for an operation the user stopped partway through
 *    would hide that some of it never happened.
 *
 * Pure state machine: every function takes the current state and an explicit clock
 * reading and returns a new state (or throws on a call that could not come from a
 * legitimate caller -- rewinding a phase, reporting a fraction outside 0..1, declining a
 * required phase). Nothing here touches a timer, a DOM node, or Electron -- the caller
 * supplies `now` so the whole thing is exercised deterministically in a plain node:test
 * run, with no fake timers and no real waiting.
 */

export const OPERATION_STATUSES = ['idle', 'running', 'succeeded', 'cancelled', 'failed'] as const;
export type OperationStatus = (typeof OPERATION_STATUSES)[number];

export interface OperationPhase {
  readonly id: string;
  readonly label: string;
  /** Relative share of the total work. Need not sum to 1 -- it is normalised. */
  readonly weight: number;
  /** Declinable work. A phase without this flag can never be omitted. */
  readonly optional?: boolean;
  /** What is left undone if this phase is declined. Required whenever `optional` is true,
   *  so a caller cannot offer a decline without saying what it costs. */
  readonly consequenceOfSkipping?: string;
}

export interface OmittedPhase {
  readonly id: string;
  readonly label: string;
  readonly consequence: string;
}

export interface OperationPlan {
  readonly included: readonly OperationPhase[];
  readonly omitted: readonly OmittedPhase[];
  readonly totalWeight: number;
}

/**
 * Resolves which phases will actually run, given which optional ones were declined.
 *
 * Every validation here fires at plan time rather than mid-run, because a caller bug in
 * the phase list is a programming error, not a runtime condition to degrade gracefully
 * from -- surfacing it immediately is what stops a silently wrong weight total from ever
 * reaching a progress bar.
 */
export function planOperation(
  phases: readonly OperationPhase[],
  declinedOptionalIds: readonly string[] = [],
): OperationPlan {
  if (phases.length === 0) throw new Error('an operation needs at least one phase');

  const seenIds = new Set<string>();
  for (const phase of phases) {
    if (seenIds.has(phase.id)) throw new Error(`duplicate phase id "${phase.id}"`);
    seenIds.add(phase.id);
    if (!Number.isFinite(phase.weight) || phase.weight <= 0) {
      throw new Error(`phase "${phase.id}" has a non-positive weight (${phase.weight})`);
    }
    if (phase.optional && !phase.consequenceOfSkipping) {
      // Declinable without a stated cost is exactly the silent omission this module exists
      // to prevent -- catch it at definition time, not when a user finally declines it.
      throw new Error(`phase "${phase.id}" is optional but declares no consequenceOfSkipping`);
    }
  }

  const declined = new Set<string>();
  for (const id of declinedOptionalIds) {
    const phase = phases.find((candidate) => candidate.id === id);
    if (!phase) throw new Error(`cannot decline unknown phase "${id}"`);
    if (!phase.optional) throw new Error(`cannot decline phase "${id}": it is not optional`);
    declined.add(id);
  }

  const included = phases.filter((phase) => !declined.has(phase.id));
  const omitted: OmittedPhase[] = phases
    .filter((phase) => declined.has(phase.id))
    .map((phase) => ({ id: phase.id, label: phase.label, consequence: phase.consequenceOfSkipping! }));

  if (included.length === 0) {
    throw new Error('every phase was declined; the operation would do nothing');
  }

  const totalWeight = included.reduce((sum, phase) => sum + phase.weight, 0);
  return { included, omitted, totalWeight };
}

export interface OperationState {
  readonly plan: OperationPlan;
  readonly status: OperationStatus;
  /** -1 before the first `startOperation` call. */
  readonly currentPhaseIndex: number;
  /** null means the current phase is indeterminate, or nothing has started yet. */
  readonly currentPhaseFraction: number | null;
  /** Sum of the weights of phases that are fully behind the current one. */
  readonly completedWeight: number;
  readonly lastProgressAt: number;
}

export function createOperation(
  phases: readonly OperationPhase[],
  declinedOptionalIds: readonly string[] = [],
): OperationState {
  return {
    plan: planOperation(phases, declinedOptionalIds),
    status: 'idle',
    currentPhaseIndex: -1,
    currentPhaseFraction: null,
    completedWeight: 0,
    lastProgressAt: 0,
  };
}

export interface StartResult {
  readonly started: boolean;
  readonly reason: 'already-running' | null;
  readonly message: string;
}

/**
 * The re-entry guard. Refuses unconditionally while `running`, regardless of what a UI
 * layer's own disabled-button check did or did not catch, and says so explicitly rather
 * than failing silently -- silence here is indistinguishable from the second start having
 * been accepted, which is exactly the duplicated action this guards against.
 *
 * A start from any terminal status (`succeeded`, `cancelled`, `failed`) is a fresh run
 * and is allowed: the guard is about concurrency, not about ever running again.
 */
export function startOperation(
  state: OperationState,
  now: number,
): { state: OperationState; result: StartResult } {
  if (state.status === 'running') {
    // Returning the SAME state reference matters as much as the boolean: a caller that
    // forgets to check `started` and blindly replaces its state with the result still
    // ends up with the untouched, still-running operation rather than a reset one.
    return {
      state,
      result: { started: false, reason: 'already-running', message: 'An operation is already running; the new start was refused.' },
    };
  }
  return {
    state: {
      plan: state.plan,
      status: 'running',
      currentPhaseIndex: 0,
      currentPhaseFraction: null,
      completedWeight: 0,
      lastProgressAt: now,
    },
    result: { started: true, reason: null, message: 'Started.' },
  };
}

/**
 * Reports progress within the phase named by `phaseId`, or advances into it from the
 * phase immediately before it.
 *
 * Only the current phase or the very next one may be named. Anything else -- an earlier
 * phase (rewinding) or one further ahead (skipping) -- throws, because either would make
 * `completedWeight` silently wrong: rewinding would double-count work already banked,
 * and skipping would credit a phase's full weight for work that never happened.
 */
export function reportProgress(
  state: OperationState,
  phaseId: string,
  fraction: number | 'indeterminate',
  now: number,
): OperationState {
  if (state.status !== 'running') {
    throw new Error(`cannot report progress: operation is "${state.status}", not running`);
  }
  const targetIndex = state.plan.included.findIndex((phase) => phase.id === phaseId);
  if (targetIndex === -1) throw new Error(`"${phaseId}" is not a phase of this operation`);
  if (targetIndex < state.currentPhaseIndex) {
    throw new Error(`cannot report progress for "${phaseId}": it is behind the current phase`);
  }
  if (targetIndex > state.currentPhaseIndex + 1) {
    const skipped = state.plan.included[state.currentPhaseIndex + 1];
    throw new Error(`cannot jump to "${phaseId}": phase "${skipped?.id}" was never reported as complete`);
  }
  if (fraction !== 'indeterminate') {
    if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
      throw new RangeError(`phase fraction must be between 0 and 1, got ${fraction}`);
    }
  }

  const movedToNextPhase = targetIndex === state.currentPhaseIndex + 1 && state.currentPhaseIndex >= 0;
  const finishedPreviousWeight = movedToNextPhase ? state.plan.included[state.currentPhaseIndex].weight : 0;

  return {
    plan: state.plan,
    status: 'running',
    currentPhaseIndex: targetIndex,
    currentPhaseFraction: fraction === 'indeterminate' ? null : fraction,
    completedWeight: state.completedWeight + finishedPreviousWeight,
    lastProgressAt: now,
  };
}

function requireRunning(state: OperationState, action: string): void {
  if (state.status !== 'running') throw new Error(`cannot ${action}: operation is "${state.status}", not running`);
}

export function completeOperation(state: OperationState, now: number): OperationState {
  requireRunning(state, 'complete');
  return { ...state, status: 'succeeded', completedWeight: state.plan.totalWeight, lastProgressAt: now };
}

/** Reports exactly how far it got. Never rounds up to `succeeded`. */
export function cancelOperation(state: OperationState, now: number): OperationState {
  requireRunning(state, 'cancel');
  return { ...state, status: 'cancelled', lastProgressAt: now };
}

export function failOperation(state: OperationState, now: number): OperationState {
  requireRunning(state, 'fail');
  return { ...state, status: 'failed', lastProgressAt: now };
}

export interface ProgressSnapshot {
  readonly status: OperationStatus;
  readonly phaseId: string | null;
  readonly phaseLabel: string | null;
  readonly phaseFraction: number | null;
  readonly overallFraction: number;
  /** True only when the CURRENT phase's total work is unknown. Independent of `stalled`. */
  readonly indeterminate: boolean;
  /** True when no progress event has landed for at least the stall threshold. */
  readonly stalled: boolean;
  readonly stalledMessage: string | null;
  readonly canStart: boolean;
}

export const DEFAULT_STALL_THRESHOLD_MS = 15_000;

function humanDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/**
 * The displayable snapshot: a fraction (or an honest absence of one), a phase label, and
 * the two independent warnings a caller needs to distinguish -- indeterminate ("we do not
 * know the total") and stalled ("nothing has happened in a while"). Both can be true at
 * once: an indeterminate operation can also be genuinely stuck.
 */
export function snapshot(
  state: OperationState,
  now: number,
  stallThresholdMs: number = DEFAULT_STALL_THRESHOLD_MS,
): ProgressSnapshot {
  const phase = state.currentPhaseIndex >= 0 ? state.plan.included[state.currentPhaseIndex] : null;

  let overallFraction: number;
  if (state.status === 'idle') {
    overallFraction = 0;
  } else if (state.status === 'succeeded') {
    overallFraction = 1;
  } else {
    // Running, cancelled, or failed: the honest fraction of weighted work actually done.
    // An indeterminate current phase contributes nothing beyond the phases already
    // banked in `completedWeight` -- there is no other truthful number to report.
    const currentWeight = phase && state.currentPhaseFraction !== null ? phase.weight * state.currentPhaseFraction : 0;
    overallFraction = (state.completedWeight + currentWeight) / state.plan.totalWeight;
  }

  const indeterminate = state.status === 'running' && state.currentPhaseFraction === null;
  const msSinceProgress = now - state.lastProgressAt;
  const stalled = state.status === 'running' && msSinceProgress >= stallThresholdMs;

  return {
    status: state.status,
    phaseId: phase?.id ?? null,
    phaseLabel: phase?.label ?? null,
    phaseFraction: state.status === 'succeeded' ? 1 : state.currentPhaseFraction,
    overallFraction,
    indeterminate,
    stalled,
    stalledMessage: stalled ? `No progress for ${humanDuration(msSinceProgress)}.` : null,
    canStart: state.status !== 'running',
  };
}
