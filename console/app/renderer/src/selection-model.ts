/**
 * Selection is scoped to one collection and one query result. Changing either
 * creates a new context, which prevents an old global selection from mutating
 * records that are no longer represented by the visible list.
 */
export interface SelectionContext {
  collectionId: string;
  queryKey: string;
}

export interface SelectionItem {
  id: string;
  pinned?: boolean;
  protectedReason?: string;
}

export interface SelectionState {
  context: SelectionContext;
  anchorId?: string;
  selectedIds: ReadonlySet<string>;
}

export type SelectionScope = 'explicit' | 'page' | 'matches' | 'inverse' | 'range';

export interface SelectionPolicy {
  includePinned?: boolean;
  includeProtected?: boolean;
}

export interface SelectionExclusion {
  id: string;
  reason: string;
}

export interface SelectionChange {
  state: SelectionState;
  scope: SelectionScope;
  selectedCount: number;
  candidateCount: number;
  excluded: ReadonlyArray<SelectionExclusion>;
}

export function createSelection(context: SelectionContext): SelectionState {
  return { context: { ...context }, selectedIds: new Set<string>() };
}

export function sameSelectionContext(left: SelectionContext, right: SelectionContext): boolean {
  return left.collectionId === right.collectionId && left.queryKey === right.queryKey;
}

export function selectionForContext(state: SelectionState, context: SelectionContext): SelectionState {
  return sameSelectionContext(state.context, context) ? state : createSelection(context);
}

function exclusionFor(item: SelectionItem, policy: SelectionPolicy): string | undefined {
  if (item.protectedReason && !policy.includeProtected) return item.protectedReason;
  if (item.pinned && !policy.includePinned) return 'Pinned items are excluded unless they are explicitly included.';
  return undefined;
}

function selectCandidates(
  state: SelectionState,
  candidates: ReadonlyArray<SelectionItem>,
  scope: SelectionScope,
  policy: SelectionPolicy,
  invert: boolean,
): SelectionChange {
  const selected = new Set<string>();
  const excluded: SelectionExclusion[] = [];
  candidates.forEach((item) => {
    const reason = exclusionFor(item, policy);
    if (reason) {
      excluded.push({ id: item.id, reason });
      return;
    }
    const shouldSelect = invert ? !state.selectedIds.has(item.id) : true;
    if (shouldSelect) selected.add(item.id);
  });
  return {
    state: { ...state, selectedIds: selected },
    scope,
    selectedCount: selected.size,
    candidateCount: candidates.length,
    excluded,
  };
}

export function selectPage(
  state: SelectionState,
  pageItems: ReadonlyArray<SelectionItem>,
  policy: SelectionPolicy = {},
): SelectionChange {
  return selectCandidates(state, pageItems, 'page', policy, false);
}

export function selectAllMatches(
  state: SelectionState,
  matchingItems: ReadonlyArray<SelectionItem>,
  policy: SelectionPolicy = {},
): SelectionChange {
  return selectCandidates(state, matchingItems, 'matches', policy, false);
}

export function invertSelection(
  state: SelectionState,
  matchingItems: ReadonlyArray<SelectionItem>,
  policy: SelectionPolicy = {},
): SelectionChange {
  return selectCandidates(state, matchingItems, 'inverse', policy, true);
}

export interface SelectionToggleModifiers {
  additive?: boolean;
  range?: boolean;
}

export function toggleSelection(
  state: SelectionState,
  item: SelectionItem,
  orderedItems: ReadonlyArray<SelectionItem>,
  modifiers: SelectionToggleModifiers = {},
  policy: SelectionPolicy = {},
): SelectionChange {
  const targetReason = exclusionFor(item, policy);
  if (targetReason) {
    return {
      state,
      scope: modifiers.range ? 'range' : 'explicit',
      selectedCount: state.selectedIds.size,
      candidateCount: 1,
      excluded: [{ id: item.id, reason: targetReason }],
    };
  }

  if (modifiers.range && state.anchorId) {
    const from = orderedItems.findIndex((candidate) => candidate.id === state.anchorId);
    const to = orderedItems.findIndex((candidate) => candidate.id === item.id);
    if (from >= 0 && to >= 0) {
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      const range = orderedItems.slice(lo, hi + 1);
      const change = selectCandidates(state, range, 'range', policy, false);
      return { ...change, state: { ...change.state, anchorId: state.anchorId } };
    }
  }

  const selected = modifiers.additive ? new Set(state.selectedIds) : new Set<string>();
  if (modifiers.additive && selected.has(item.id)) selected.delete(item.id);
  else selected.add(item.id);
  return {
    state: { ...state, anchorId: item.id, selectedIds: selected },
    scope: 'explicit',
    selectedCount: selected.size,
    candidateCount: 1,
    excluded: [],
  };
}

export function clearSelection(state: SelectionState): SelectionState {
  return { ...state, anchorId: undefined, selectedIds: new Set<string>() };
}

export function reconcileSelection(
  state: SelectionState,
  context: SelectionContext,
  availableItems: ReadonlyArray<SelectionItem>,
): SelectionState {
  if (!sameSelectionContext(state.context, context)) return createSelection(context);
  const available = new Set(availableItems.map((item) => item.id));
  const selectedIds = new Set([...state.selectedIds].filter((id) => available.has(id)));
  const anchorId = state.anchorId && available.has(state.anchorId) ? state.anchorId : undefined;
  return { ...state, anchorId, selectedIds };
}

export function selectedItems<T extends SelectionItem>(
  state: SelectionState,
  items: ReadonlyArray<T>,
): ReadonlyArray<T> {
  return items.filter((item) => state.selectedIds.has(item.id));
}
