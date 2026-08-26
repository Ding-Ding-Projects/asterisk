/**
 * Deciding when the dim sum surprise may actually fire.
 *
 * `dim-sum-surprise.ts` is careful and pure, and until now reachable by nothing: it
 * never once asked the running application what it was actually doing, because nothing
 * ever called it with real data. This module is the part that does -- translating the
 * console's own real signals (an unreviewed PBX draft, an update in flight, a first
 * launch, low-stimulation mode) into the `StartupContext` the pure module already
 * understands, and gating the one draw a launch is owed.
 *
 * Still no DOM, no Electron API, no clock: everything here is a plain function over
 * data a caller supplies, for the same reason `accessibility-contract.ts` states for
 * itself -- so the whole thing runs under `node:test` with nothing behind it. The
 * component that actually reads the bridge and the storage lives in `DimSumSurprise.tsx`
 * and owns none of this decision; it only supplies the signals.
 */

import { surpriseFor, type Dish, type StartupContext, type Surprise } from './dim-sum-surprise';

/**
 * What the running app actually knows, already translated into plain data before this
 * module ever sees it.
 */
export interface RuntimeSignals {
  /** This feature's own idea of first launch: a marker its caller persisted, not any
   *  other screen's onboarding state -- this console has no onboarding wizard that
   *  opens by default, so there is no existing "first run" flag to borrow. */
  isFirstLaunch: boolean;
  /** The same updater state the update banner already reads (see UpdateBanner.tsx).
   *  Undefined when there is no bridge to ask -- a browser tab with no privileged
   *  process behind it. */
  updaterState?: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'failed';
  /** PBX drafts nobody has reviewed, applied, or discarded yet -- the update banner's
   *  own definition of unfinished work, reused here rather than invented a second time. */
  unsavedDraftCount: number;
  restartPending: boolean;
  /**
   * Low-stimulation mode's own promise is "only the notifications that genuinely need
   * a person" -- a startup delight is exactly the kind that does not, so this is where
   * "quiet-hours" is drawn from. This console has no separate scheduled quiet-hours
   * window of its own yet: the notifications screen's `nt_quiet` control persists a
   * stated intention with no configured window behind it (see App.tsx's own note on
   * CONSOLE_SETTINGS). Reusing low-stimulation mode is reading a real signal that
   * exists rather than fabricating a second, unimplemented one.
   */
  lowStimulationEnabled: boolean;
}

/**
 * Exactly one context wins when several signals are true at once, and the order is
 * deliberate: a first launch is the most certain "not yet" there is; unfinished PBX
 * work and an update in flight are the two states this feature's own contract names
 * by name; an update failure is worth distinguishing as an error rather than folding
 * into "update"; and low-stimulation is the softest signal, so nothing else outranks
 * it and it only applies once every firmer reason to skip has been ruled out.
 */
export function resolveStartupContext(signals: RuntimeSignals): StartupContext {
  if (signals.isFirstLaunch) return 'first-run';
  if (signals.unsavedDraftCount > 0 || signals.restartPending) return 'mid-task';
  if (signals.updaterState === 'failed') return 'error';
  if (signals.updaterState !== undefined && signals.updaterState !== 'idle') return 'update';
  if (signals.lowStimulationEnabled) return 'quiet-hours';
  return 'normal';
}

/**
 * A launch gets exactly one draw (dim-sum-surprise.ts's own rule). This is that gate,
 * as a value rather than module-level mutable state hidden inside this file -- so a
 * test can hold two independent launches side by side instead of fighting shared state
 * between test cases, and so the one real gate a running process uses is visibly a
 * single object a caller can point at, not an implicit global.
 */
export interface LaunchGate {
  /** True the first time this is called for a given gate; false on every call after. */
  consume(): boolean;
}

export function createLaunchGate(): LaunchGate {
  let consumed = false;
  return {
    consume(): boolean {
      if (consumed) return false;
      consumed = true;
      return true;
    },
  };
}

export interface DecideInput {
  dishes: readonly Dish[];
  signals: RuntimeSignals;
  /** A draw in [0, 1), from whichever launch-scoped random source the caller used. */
  draw: number;
  /** Chooses the dish, same source. */
  pick: number;
  gate: LaunchGate;
}

/**
 * The whole decision, in one call: consumes the launch's one draw, resolves the
 * context, and asks the pure module for a verdict. A caller -- the mounted component in
 * production, a test with a synthetic signal set -- never has to get the
 * gate-then-context ordering right by hand, and never has two places that could
 * disagree about it.
 */
export function decideDimSumSurprise(input: DecideInput): Surprise | undefined {
  const alreadyDrawnThisLaunch = !input.gate.consume();
  const context = resolveStartupContext(input.signals);
  return surpriseFor(input.dishes, {
    context, draw: input.draw, pick: input.pick, alreadyDrawnThisLaunch,
  });
}
