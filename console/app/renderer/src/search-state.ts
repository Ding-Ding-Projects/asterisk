/** Independent search-field state and capability-aware filtering models. */

import {
  compileSearchPattern,
  DEFAULT_REGEX_LIMITS,
  evaluateCandidates,
  validateSearchPattern,
  type CandidateEvaluation,
  type CompiledSearchPattern,
  type RegexEvaluationLimits,
  type SearchMode,
  type SearchValidation,
} from './regex-engine';

export type SearchFieldKind =
  | 'strip-tabs'
  | 'group-tabs'
  | 'group-names'
  | 'master-tabs'
  | 'menu-items'
  | 'dropdown-items'
  | 'palette'
  | 'bulk-close-containing'
  | 'bulk-close-not-containing';

export interface SearchFieldIdentity {
  readonly fieldId: string;
  readonly kind: SearchFieldKind;
  readonly surfaceId: string;
  readonly anchorElementId: string;
  readonly builderId: string;
  readonly returnFocusElementId: string;
}

export interface SearchIdentityInput {
  readonly fieldId: string;
  readonly kind: SearchFieldKind;
  readonly surfaceId: string;
  readonly anchorElementId: string;
  readonly returnFocusElementId?: string;
}

export interface SearchFieldState {
  readonly identity: SearchFieldIdentity;
  readonly mode: SearchMode;
  readonly query: string;
  readonly flags: string;
  readonly validation: SearchValidation;
  readonly resultCount: number;
  readonly evaluatedCount: number;
  readonly truncated: boolean;
  readonly timedOut: boolean;
  readonly builderOpen: boolean;
}

export type SearchFieldAction =
  | { readonly type: 'set-query'; readonly query: string }
  | { readonly type: 'set-mode'; readonly mode: SearchMode }
  | { readonly type: 'set-flags'; readonly flags: string }
  | { readonly type: 'set-builder-open'; readonly open: boolean }
  | { readonly type: 'set-results'; readonly resultCount: number; readonly evaluatedCount: number; readonly truncated: boolean; readonly timedOut?: boolean }
  | { readonly type: 'reset' };

export type SearchStateMap = Readonly<Record<string, SearchFieldState>>;

export interface SearchMapAction {
  readonly fieldId: string;
  readonly action: SearchFieldAction;
}

const ID_PATTERN = /^[A-Za-z][A-Za-z0-9._:-]{0,191}$/u;
const SEARCH_FIELD_KINDS: ReadonlySet<SearchFieldKind> = new Set([
  'strip-tabs', 'group-tabs', 'group-names', 'master-tabs', 'menu-items', 'dropdown-items',
  'palette', 'bulk-close-containing', 'bulk-close-not-containing',
]);

function assertIdentityValue(value: string, name: string): void {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    throw new Error(`${name} must be a stable non-empty identifier.`);
  }
}

export function validateSearchFieldIdentity(identity: SearchFieldIdentity): void {
  if (!SEARCH_FIELD_KINDS.has(identity.kind)) throw new Error(`Unknown search-field kind: ${String(identity.kind)}`);
  assertIdentityValue(identity.fieldId, 'fieldId');
  assertIdentityValue(identity.surfaceId, 'surfaceId');
  assertIdentityValue(identity.anchorElementId, 'anchorElementId');
  assertIdentityValue(identity.builderId, 'builderId');
  assertIdentityValue(identity.returnFocusElementId, 'returnFocusElementId');
  if (identity.fieldId === identity.builderId) {
    throw new Error('A search field and its anchored builder must have distinct identities.');
  }
}

/**
 * Create one complete field-to-builder identity. The builder id is derived
 * from the field id, so a popover cannot be detached and silently reused by a
 * different search surface.
 */
export function createSearchFieldIdentity(input: SearchIdentityInput): SearchFieldIdentity {
  const identity = {
    fieldId: input.fieldId,
    kind: input.kind,
    surfaceId: input.surfaceId,
    anchorElementId: input.anchorElementId,
    builderId: `${input.fieldId}:regex-builder`,
    returnFocusElementId: input.returnFocusElementId ?? input.anchorElementId,
  } satisfies SearchFieldIdentity;
  validateSearchFieldIdentity(identity);
  return identity;
}

export const searchSurfaceId = Object.freeze({
  strip: (stripId: string) => `tab-strip:${stripId}`,
  group: (stripId: string, groupId: string) => `tab-group:${stripId}:${groupId}`,
  groupNames: (stripId: string) => `tab-groups:${stripId}`,
  master: (ownerId: string) => `tab-master:${ownerId}`,
  bulkClose: (stripId: string, mode: 'containing' | 'not-containing') => `tab-bulk-close:${stripId}:${mode}`,
});

export function createSearchField(
  identity: SearchFieldIdentity,
  initial: Partial<Pick<SearchFieldState, 'mode' | 'query' | 'flags'>> = {},
  limits?: Partial<RegexEvaluationLimits>,
): SearchFieldState {
  validateSearchFieldIdentity(identity);
  const mode = initial.mode ?? 'plain';
  const query = initial.query ?? '';
  const flags = initial.flags ?? '';
  if (mode !== 'plain' && mode !== 'regex') throw new Error(`Unknown search mode: ${String(mode)}`);
  if (typeof query !== 'string' || typeof flags !== 'string') throw new Error('Search query and flags must be strings.');
  const validation = validateSearchPattern({ mode, query, flags }, limits);
  return {
    identity,
    mode,
    query,
    flags,
    validation,
    resultCount: 0,
    evaluatedCount: 0,
    truncated: false,
    timedOut: false,
    builderOpen: false,
  };
}

export function reduceSearchField(
  state: SearchFieldState,
  action: SearchFieldAction,
  limits?: Partial<RegexEvaluationLimits>,
): SearchFieldState {
  if (action.type === 'reset') return createSearchField(state.identity, undefined, limits);
  if (action.type === 'set-builder-open') return { ...state, builderOpen: action.open };
  if (action.type === 'set-results') {
    return {
      ...state,
      resultCount: Math.max(0, Math.trunc(action.resultCount)),
      evaluatedCount: Math.max(0, Math.trunc(action.evaluatedCount)),
      truncated: action.truncated,
      timedOut: action.timedOut ?? false,
    };
  }

  const next = {
    ...state,
    ...(action.type === 'set-query' ? { query: action.query } : {}),
    ...(action.type === 'set-mode' ? { mode: action.mode } : {}),
    ...(action.type === 'set-flags' ? { flags: action.flags } : {}),
    resultCount: 0,
    evaluatedCount: 0,
    truncated: false,
    timedOut: false,
  };
  return {
    ...next,
    validation: validateSearchPattern({ mode: next.mode, query: next.query, flags: next.flags }, limits),
  };
}

export function createSearchStateMap(fields: ReadonlyArray<SearchFieldState>): SearchStateMap {
  const result: Record<string, SearchFieldState> = {};
  for (const field of fields) {
    if (result[field.identity.fieldId]) {
      throw new Error(`Duplicate search field identity: ${field.identity.fieldId}`);
    }
    result[field.identity.fieldId] = field;
  }
  return result;
}

export function reduceSearchStateMap(
  state: SearchStateMap,
  action: SearchMapAction,
  limits?: Partial<RegexEvaluationLimits>,
): SearchStateMap {
  const field = state[action.fieldId];
  if (!field) throw new Error(`Unknown search field: ${action.fieldId}`);
  return { ...state, [action.fieldId]: reduceSearchField(field, action.action, limits) };
}

export type PrepareSearchResult =
  | { readonly ok: true; readonly pattern: CompiledSearchPattern }
  | { readonly ok: false; readonly reason: string };

export function prepareSearch(
  field: SearchFieldState,
  limits?: Partial<RegexEvaluationLimits>,
): PrepareSearchResult {
  if (!field.validation.ok) return field.validation;
  return compileSearchPattern({ mode: field.mode, query: field.query, flags: field.flags }, limits);
}

export interface SearchCollectionResult<T> extends CandidateEvaluation<T> {
  readonly field: SearchFieldState;
  readonly error?: string;
}

export function searchCollection<T>(
  field: SearchFieldState,
  candidates: ReadonlyArray<T>,
  textOf: (candidate: T) => string,
  limits?: Partial<RegexEvaluationLimits>,
): SearchCollectionResult<T> {
  const prepared = prepareSearch(field, limits);
  if (!prepared.ok) {
    return { field, matches: [], evaluated: 0, totalMatches: 0, truncated: false, timedOut: false, error: prepared.reason };
  }
  if (field.query.length === 0) {
    const maxCandidates = limits?.maxCandidates ?? DEFAULT_REGEX_LIMITS.maxCandidates;
    const matches = candidates.slice(0, maxCandidates);
    const truncated = candidates.length > matches.length;
    return {
      field: { ...field, resultCount: matches.length, evaluatedCount: matches.length, truncated, timedOut: false },
      matches,
      evaluated: matches.length,
      totalMatches: matches.length,
      truncated,
      timedOut: false,
    };
  }
  const evaluated = evaluateCandidates(prepared.pattern, candidates, textOf, limits);
  return {
    ...evaluated,
    field: {
      ...field,
      resultCount: evaluated.matches.length,
      evaluatedCount: evaluated.evaluated,
      truncated: evaluated.truncated,
      timedOut: evaluated.timedOut,
    },
  };
}

export interface SurfaceCapabilities {
  readonly surfaceId: string;
  readonly capabilities: ReadonlySet<string>;
  readonly handlers: ReadonlySet<string>;
}

export type FilterItemKind = 'action' | 'value' | 'heading' | 'separator';

export interface FilterableSurfaceItem {
  readonly id: string;
  readonly kind: FilterItemKind;
  readonly label: string;
  readonly searchText?: string;
  readonly requiredCapability?: string;
  readonly handlerId?: string;
  readonly disabledReason?: string;
}

export interface ResolvedSurfaceItem extends FilterableSurfaceItem {
  readonly enabled: boolean;
  readonly unavailableReason?: string;
}

export interface FilterSurfaceModel {
  readonly surfaceId: string;
  readonly kind: 'menu' | 'dropdown';
  readonly search: SearchFieldState;
  readonly items: ReadonlyArray<ResolvedSurfaceItem>;
  readonly totalItemCount: number;
  readonly visibleActionCount: number;
  readonly error?: string;
}

function resolveSurfaceItem(item: FilterableSurfaceItem, capabilities: SurfaceCapabilities): ResolvedSurfaceItem {
  if (item.kind === 'action' && !item.handlerId) {
    throw new Error(`Action item ${item.id} has no registered handler and cannot be rendered.`);
  }
  if (item.handlerId && !capabilities.handlers.has(item.handlerId)) {
    throw new Error(`Action item ${item.id} requires an unavailable handler ${item.handlerId}.`);
  }
  if (item.requiredCapability && !capabilities.capabilities.has(item.requiredCapability)) {
    return { ...item, enabled: false, unavailableReason: item.disabledReason ?? 'This destination does not provide the required capability.' };
  }
  if (item.disabledReason) return { ...item, enabled: false, unavailableReason: item.disabledReason };
  return { ...item, enabled: true };
}

/**
 * Build a menu/dropdown model whose action rows are safe to render. Missing
 * capabilities remain visible and disabled with an exact reason. Missing
 * handlers are never allowed to masquerade as functioning actions.
 */
export function buildFilterSurfaceModel(
  kind: 'menu' | 'dropdown',
  search: SearchFieldState,
  items: ReadonlyArray<FilterableSurfaceItem>,
  capabilities: SurfaceCapabilities,
  limits?: Partial<RegexEvaluationLimits>,
): FilterSurfaceModel {
  if (search.identity.surfaceId !== capabilities.surfaceId) {
    throw new Error('Search-field surface identity does not match the capability source.');
  }
  if (search.identity.kind !== (kind === 'menu' ? 'menu-items' : 'dropdown-items')) {
    throw new Error(`Search field ${search.identity.fieldId} is not a ${kind} filter.`);
  }
  const resolved = items.map((item) => resolveSurfaceItem(item, capabilities));
  const searchable = resolved.filter((item) => item.kind !== 'separator');
  const filtered = searchCollection(search, searchable, (item) => `${item.label}\n${item.searchText ?? ''}`, limits);
  const matched = new Set(filtered.matches.map((item) => item.id));
  const visible = resolved.filter((item) => item.kind === 'separator' || matched.has(item.id));
  return {
    surfaceId: capabilities.surfaceId,
    kind,
    search: filtered.field,
    items: trimSeparators(visible),
    totalItemCount: resolved.length,
    visibleActionCount: visible.filter((item) => item.kind === 'action').length,
    error: filtered.error,
  };
}

function trimSeparators(items: ReadonlyArray<ResolvedSurfaceItem>): ReadonlyArray<ResolvedSurfaceItem> {
  const result: ResolvedSurfaceItem[] = [];
  for (const item of items) {
    if (item.kind === 'separator' && (result.length === 0 || result[result.length - 1]?.kind === 'separator')) continue;
    result.push(item);
  }
  while (result[result.length - 1]?.kind === 'separator') result.pop();
  return result;
}
