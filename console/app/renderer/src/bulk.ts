/**
 * Selection and bulk-operation model shared by every list surface.
 *
 * Pure functions and a small progress-reporting async runner. No rendering,
 * no I/O, no clock: callers supply ordering, apply functions, and a
 * cancellation signal.
 */

// ---------------------------------------------------------------- selection

export interface SelectionState {
  anchor?: string;
  selected: ReadonlySet<string>;
}

export const EMPTY_SELECTION: SelectionState = { anchor: undefined, selected: new Set() };

export interface ClickModifiers {
  shift?: boolean;
  ctrl?: boolean;
}

/**
 * Apply a click to a selection.
 *
 * - Plain click: replace the selection with just this item; it becomes the anchor.
 * - Ctrl-click: toggle this item's membership; it becomes the anchor regardless
 *   of whether it was added or removed, so the next shift-click ranges from here.
 * - Shift-click: select the inclusive range between the current anchor and this
 *   item, in `ordered`'s order (the order the list is currently displayed in).
 *   If there is no anchor yet, shift-click behaves like a plain click.
 */
export function click(
  state: SelectionState,
  id: string,
  modifiers: ClickModifiers,
  ordered: ReadonlyArray<string>,
): SelectionState {
  if (modifiers.shift && state.anchor !== undefined) {
    const from = ordered.indexOf(state.anchor);
    const to = ordered.indexOf(id);
    if (from === -1 || to === -1) {
      // Anchor or target is not in the visible order; fall back to a plain click.
      return { anchor: id, selected: new Set([id]) };
    }
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const range = ordered.slice(lo, hi + 1);
    return { anchor: state.anchor, selected: new Set(range) };
  }

  if (modifiers.ctrl) {
    const next = new Set(state.selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return { anchor: id, selected: next };
  }

  // Plain click.
  return { anchor: id, selected: new Set([id]) };
}

export type SelectAllScope = 'page' | 'matches';

export interface SelectAllResult {
  state: SelectionState;
  scope: SelectAllScope;
  count: number;
}

/**
 * Select every item on the current page, or every item matching the active
 * filter/search across the whole collection. The caller supplies both
 * candidate sets explicitly and picks which scope was intended; the result
 * carries the scope and count back so a caller can report exactly what
 * happened ("42 selected on this page" versus "1,204 matching items selected").
 */
export function selectAll(
  state: SelectionState,
  scope: SelectAllScope,
  page: ReadonlyArray<string>,
  matches: ReadonlyArray<string>,
): SelectAllResult {
  const ids = scope === 'page' ? page : matches;
  const selected = new Set(ids);
  return {
    state: { anchor: state.anchor, selected },
    scope,
    count: selected.size,
  };
}

/** Invert the selection against the full visible/candidate order. */
export function invert(state: SelectionState, ordered: ReadonlyArray<string>): SelectionState {
  const next = new Set<string>();
  for (const id of ordered) {
    if (!state.selected.has(id)) {
      next.add(id);
    }
  }
  return { anchor: state.anchor, selected: next };
}

export function clearSelection(state: SelectionState): SelectionState {
  return { anchor: state.anchor, selected: new Set() };
}

export function isSelected(state: SelectionState, id: string): boolean {
  return state.selected.has(id);
}

export function selectionCount(state: SelectionState): number {
  return state.selected.size;
}

// ------------------------------------------------------------------ bulk plan

export interface BulkSkip<T> {
  item: T;
  reason: string;
}

export interface BulkPlan<T> {
  action: string;
  selected: ReadonlyArray<T>;
  affected: ReadonlyArray<T>;
  skipped: ReadonlyArray<BulkSkip<T>>;
  destructive: boolean;
}

export interface PlanBulkOptions {
  destructive?: boolean;
}

/**
 * Build a reviewable plan for a bulk action: which of the selected items will
 * actually be affected, and which are excluded and why. `canApply` returns
 * `true` when the action applies to an item, or a human-readable reason
 * string when it does not.
 */
export function planBulk<T>(
  action: string,
  selected: ReadonlyArray<T>,
  canApply: (item: T) => true | string,
  options: PlanBulkOptions = {},
): BulkPlan<T> {
  const affected: T[] = [];
  const skipped: BulkSkip<T>[] = [];

  for (const item of selected) {
    const verdict = canApply(item);
    if (verdict === true) {
      affected.push(item);
    } else {
      skipped.push({ item, reason: verdict });
    }
  }

  return {
    action,
    selected,
    affected,
    skipped,
    destructive: options.destructive ?? false,
  };
}

/**
 * Render a plan as a sentence suitable for a confirmation dialog: what will
 * happen, to how many items, and how many are excluded (and why, when there
 * is exactly one exclusion reason worth naming plainly).
 */
export function summarise<T>(plan: BulkPlan<T>): string {
  const total = plan.selected.length;
  const affected = plan.affected.length;
  const skipped = plan.skipped.length;

  if (total === 0) {
    return `${plan.action}: nothing selected.`;
  }

  const parts: string[] = [];
  parts.push(`${plan.action}: ${affected} of ${total} selected will change`);

  if (skipped > 0) {
    const reasons = new Set(plan.skipped.map((s) => s.reason));
    if (reasons.size === 1) {
      parts.push(`; ${skipped} skipped (${[...reasons][0]})`);
    } else {
      parts.push(`; ${skipped} skipped for ${reasons.size} different reasons`);
    }
  }

  if (plan.destructive) {
    parts.push('. This cannot be undone.');
  } else {
    parts.push('.');
  }

  return parts.join('');
}

// -------------------------------------------------------------------- running

export interface BulkFailure {
  id: string;
  reason: string;
}

export interface BulkProgress {
  done: number;
  total: number;
  failed: ReadonlyArray<BulkFailure>;
}

export interface BulkSuccess<T> {
  item: T;
  index: number;
}

export interface BulkResult<T> {
  succeeded: ReadonlyArray<BulkSuccess<T>>;
  failed: ReadonlyArray<BulkFailure>;
  cancelled: boolean;
  total: number;
}

export interface RunBulkOptions {
  onProgress?: (progress: BulkProgress) => void;
  signal?: { aborted: boolean };
  concurrency?: number;
}

/**
 * Apply a plan's affected items with bounded concurrency, reporting progress
 * and collecting failures without aborting the rest of the batch (a single
 * item's rejection never stops the others). Results are returned in the same
 * order as `plan.affected` regardless of the concurrency used to produce
 * them, so a report reads the same no matter how the work was scheduled:
 * each worker claims the next unclaimed index and writes its outcome into a
 * slot addressed by that index, so reassembly at the end is a plain ordered
 * walk over the slots rather than a race-dependent append.
 */
export async function runBulk<T>(
  plan: BulkPlan<T>,
  apply: (item: T, index: number) => Promise<string>,
  options: RunBulkOptions = {},
): Promise<BulkResult<T>> {
  const items = plan.affected;
  const total = items.length;
  const concurrency = Math.max(1, options.concurrency ?? 1);

  type Outcome = { ok: true; id: string } | { ok: false; id: string; reason: string };
  const outcomes: Array<Outcome | undefined> = new Array(total).fill(undefined);

  let cancelled = false;
  let nextIndex = 0;
  let doneCount = 0;

  function reportProgress(): void {
    if (!options.onProgress) return;
    const failed: BulkFailure[] = [];
    for (const outcome of outcomes) {
      if (outcome && !outcome.ok) {
        failed.push({ id: outcome.id, reason: outcome.reason });
      }
    }
    options.onProgress({ done: doneCount, total, failed });
  }

  async function worker(): Promise<void> {
    for (;;) {
      if (options.signal?.aborted) {
        cancelled = true;
        return;
      }
      const index = nextIndex;
      if (index >= total) {
        return;
      }
      nextIndex += 1;

      const item = items[index];
      const id = itemId(item, index);

      try {
        const reason = await apply(item, index);
        outcomes[index] = reason ? { ok: false, id, reason } : { ok: true, id };
      } catch (err) {
        outcomes[index] = { ok: false, id, reason: err instanceof Error ? err.message : String(err) };
      }

      doneCount += 1;
      reportProgress();
    }
  }

  const workerCount = Math.min(concurrency, total || 1);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  const succeeded: BulkSuccess<T>[] = [];
  const failed: BulkFailure[] = [];

  for (let index = 0; index < total; index += 1) {
    const outcome = outcomes[index];
    if (outcome === undefined) {
      // Never attempted: cancellation stopped the workers before reaching it.
      continue;
    }
    if (outcome.ok) {
      succeeded.push({ item: items[index], index });
    } else {
      failed.push({ id: outcome.id, reason: outcome.reason });
    }
  }

  return { succeeded, failed, cancelled, total };
}

function itemId(item: unknown, index: number): string {
  if (item !== null && typeof item === 'object' && 'id' in (item as Record<string, unknown>)) {
    const raw = (item as Record<string, unknown>).id;
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'number') return String(raw);
  }
  return String(index);
}

/** True only when every attempted item succeeded and nothing was cancelled early. */
export function bulkSucceeded<T>(result: BulkResult<T>): boolean {
  return !result.cancelled && result.failed.length === 0 && result.succeeded.length === result.total;
}

// --------------------------------------------------------------- bulk delete ceremony

/**
 * Recovers the selected ids from the confirmation ceremony the bulk "Delete" action
 * opens, so a confirmed delete can be routed back into `planBulk`/`summarise` instead
 * of sending a raw command straight to the target.
 *
 * The bulk Delete button (see App.tsx's `bulkActions`) opens its ceremony with an exact
 * title/command pair -- `Delete ${sel.length} objects` / `delete ${sel.join(' ')}` -- so
 * this recognises that exact shape and nothing else. A single row's own "Delete <name>"
 * ceremony (opened from a row's context menu, gated by `areYouSure` instead) uses a
 * title with no " objects" suffix and must never match here: the two go through
 * separate confirmation gates and this must not blur them together. Requiring the id
 * count parsed from the command to equal the count parsed from the title is the extra
 * check that keeps a coincidental "Delete <n> objects" title from a completely
 * unrelated ceremony from being treated as a bulk delete.
 */
export function parseBulkDeleteCeremony(title: string, command: string): string[] | undefined {
  const titleMatch = /^Delete (\d+) objects$/.exec(title);
  if (!titleMatch) return undefined;
  const expectedCount = Number(titleMatch[1]);

  const commandMatch = /^delete (.+)$/.exec(command);
  if (!commandMatch) return undefined;
  const ids = commandMatch[1].split(' ').filter((id) => id.length > 0);

  if (ids.length !== expectedCount) return undefined;
  return ids;
}
