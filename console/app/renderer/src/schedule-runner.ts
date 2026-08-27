/**
 * The half of scheduled settings that actually changes something.
 *
 * `scheduled-settings.ts` decides which rules match an instant and what the effective
 * values would be, and deliberately never mutates the base. That is the right shape and
 * it is also why the feature did nothing: something has to take those values, drive the
 * real controls, and put the base back when the window ends. Without this half the
 * scheduler is a display that reads as a working scheduler and schedules nothing.
 *
 * Two properties carry the whole thing, and both are about the ending rather than the
 * beginning:
 *
 *  - AN OVERRIDE NEVER BECOMES THE BASE. What is remembered when a key is first
 *    overridden is the BASE value, not whatever happened to be applied at the time. If it
 *    remembered the applied value, two overlapping windows would leave the first
 *    window's value behind as the permanent setting when the second ended, and nothing
 *    would ever say so -- the setting would simply have changed itself one afternoon.
 *  - A TICK EMITS ONLY REAL CHANGES. Re-applying a value already in force would fire the
 *    console's own change handling on every tick: a toast, a history entry and a write,
 *    once a minute, forever.
 *
 * Pure and instant-driven: `now` is passed in and no clock is read here, so a window
 * boundary is exercised directly rather than waited for.
 */
import {
  effectiveSettings,
  type ScheduledRule,
} from './scheduled-settings';

/**
 * What the runner is holding between ticks.
 *
 * `baseline` is the value each overridden key had before any rule touched it, and it is
 * what a key is restored to. `applied` is what the runner last pushed, so a tick can tell
 * a real change from a repeat.
 */
export interface RunnerState {
  baseline: Readonly<Record<string, string>>;
  applied: Readonly<Record<string, string>>;
}

export const EMPTY_RUNNER_STATE: RunnerState = Object.freeze({
  baseline: Object.freeze({}),
  applied: Object.freeze({}),
});

export interface TickResult {
  /** Key to value, to be pushed through the same path a person changing a control uses. */
  changes: Record<string, string>;
  /** Keys whose scheduled window has ended and which are being put back to the base. */
  restored: string[];
  /** Rule ids in force after this tick, for an honest status line. */
  activeRuleIds: string[];
  state: RunnerState;
}

/**
 * Computes one tick.
 *
 * Returns the changes rather than performing them, so the caller applies them through
 * whatever path a person's own edit takes. A runner that wrote settings directly would
 * bypass validation, history and every other thing that hangs off that path.
 */
export function tick(
  base: Readonly<Record<string, string>>,
  rules: readonly ScheduledRule[],
  now: Date,
  state: RunnerState = EMPTY_RUNNER_STATE,
): TickResult {
  const effective = effectiveSettings(base, rules, now);
  const overridden = new Set(Object.keys(effective.sourceOf));

  const baseline: Record<string, string> = {};
  const applied: Record<string, string> = {};
  const changes: Record<string, string> = {};
  const restored: string[] = [];

  for (const key of overridden) {
    /* The base value, taken from `base` and not from what is currently applied. Once a
     * key is being overridden its baseline is fixed, so a second overlapping window
     * cannot quietly promote the first window's value into the permanent setting. */
    const remembered = key in state.baseline ? state.baseline[key] : base[key];
    if (remembered !== undefined) baseline[key] = remembered;

    const next = effective.values[key];
    if (next === undefined) continue;
    applied[key] = next;
    if (state.applied[key] !== next) changes[key] = next;
  }

  for (const key of Object.keys(state.applied)) {
    if (overridden.has(key)) continue;
    /* The window ended. Put back the baseline this key had before any rule touched it,
     * which is the assertion the whole feature rests on. */
    const remembered = state.baseline[key];
    restored.push(key);
    if (remembered !== undefined && state.applied[key] !== remembered) {
      changes[key] = remembered;
    }
  }

  return {
    changes,
    restored,
    activeRuleIds: effective.appliedRuleIds,
    state: { baseline, applied },
  };
}

/**
 * A one-line description of what the schedule is doing, for a status control.
 *
 * Names the rules and the keys rather than reporting a count: "2 rules active" tells
 * somebody nothing about why their language just changed.
 */
export function statusLine(result: TickResult, ruleLabels: Readonly<Record<string, string>> = {}): string {
  const keys = Object.keys(result.state.applied).sort();
  if (keys.length === 0) return 'No schedule is in force; your own settings are in effect.';
  const names = result.activeRuleIds.map((id) => ruleLabels[id] ?? id);
  return `${names.join(', ')} in force, overriding ${keys.join(', ')}. Your own values are restored when the window ends.`;
}
