/**
 * Collapsible filter rows, search bars and statistics panels.
 *
 * Every one of these is collapsible, and the ones that only DESCRIBE a collection
 * (statistics) rather than change it start collapsed by default: a view whose controls
 * occupy more space than its content has buried the content.
 *
 * One rule matters more than the rest. A collapsed row can be quietly excluding results
 * while it looks like a tidy, empty strip of UI -- and that is how a user comes to believe
 * their own data is missing. So a panel that is collapsed AND actively filtering must
 * always carry a non-empty summary of what it is excluding; the type of `ActiveFilterSummary`
 * and the guard in `activeFilter` make an active filter with no description impossible to
 * construct, and `panelAccessibleState`/`panelAnnouncement` make it impossible to report a
 * collapsed-and-filtering panel as though nothing were happening.
 *
 * Two further rules, easy to get backwards:
 *  - Collapsing a panel never touches the filter it holds, and expanding one never
 *    reapplies a filter the user cleared. This module owns only the collapsed/expanded
 *    flag; no function here accepts or mutates filter state, so there is nothing for a
 *    toggle to clear or reapply even by accident.
 *  - A statistics panel never filters anything, by contract. Handing one an active filter
 *    is a caller error, not a state to render -- see the guard in `panelAnnouncement`.
 */

export const PANEL_KINDS = ['search', 'filterRow', 'statistics'] as const;
export type PanelKind = (typeof PANEL_KINDS)[number];

export interface PanelKindDescription {
  id: PanelKind;
  label: string;
  /** Statistics describe the collection and never change it, so they start collapsed. */
  defaultCollapsed: boolean;
}

export const PANEL_KIND_DESCRIPTIONS: readonly PanelKindDescription[] = [
  { id: 'search', label: 'Search', defaultCollapsed: false },
  { id: 'filterRow', label: 'Filter row', defaultCollapsed: false },
  { id: 'statistics', label: 'Statistics', defaultCollapsed: true },
];

export function isPanelKind(value: unknown): value is PanelKind {
  return typeof value === 'string' && (PANEL_KINDS as readonly string[]).includes(value);
}

function kindDescription(kind: PanelKind): PanelKindDescription {
  // PANEL_KIND_DESCRIPTIONS is authored by hand alongside PANEL_KINDS; a missing entry is a
  // programmer error in this module, not a runtime input, so it throws rather than guessing.
  const found = PANEL_KIND_DESCRIPTIONS.find((d) => d.id === kind);
  if (!found) throw new RangeError(`no description registered for panel kind "${kind}"`);
  return found;
}

export interface PanelStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
}

export const PANEL_SETTING_PREFIX = 'console.panel.';

function storageKey(surfaceId: string, kind: PanelKind): string {
  // Keyed by surface AND kind: the same kind of panel (say, a filter row) appears on many
  // screens, and collapsing it on one screen must not collapse it everywhere.
  return `${PANEL_SETTING_PREFIX}${surfaceId}.${kind}`;
}

/** An unrecognised stored value reads as this panel kind's own default, not a global one. */
export function isCollapsed(storage: PanelStorage | undefined, surfaceId: string, kind: PanelKind): boolean {
  const stored = storage?.getItem(storageKey(surfaceId, kind));
  if (stored === 'collapsed') return true;
  if (stored === 'expanded') return false;
  return kindDescription(kind).defaultCollapsed;
}

export function setCollapsed(storage: PanelStorage, surfaceId: string, kind: PanelKind, collapsed: boolean): void {
  storage.setItem(storageKey(surfaceId, kind), collapsed ? 'collapsed' : 'expanded');
}

/** Convenience wrapper. Still touches nothing but the collapsed flag -- see the module note. */
export function toggleCollapsed(storage: PanelStorage, surfaceId: string, kind: PanelKind): boolean {
  const next = !isCollapsed(storage, surfaceId, kind);
  setCollapsed(storage, surfaceId, kind, next);
  return next;
}

/**
 * Whether a panel is currently excluding results, and -- when it is -- what it is excluding.
 *
 * A discriminated union rather than a `description?: string` field: the inactive case
 * carries no description at all, and the active case cannot exist without one. That makes
 * "filtering, but nothing to say about it" a state the type system refuses, not a state a
 * reviewer has to notice is missing.
 */
export type ActiveFilterSummary =
  | { active: false }
  | { active: true; description: string };

export const noActiveFilter: ActiveFilterSummary = { active: false };

/** Throws rather than silently accepting a blank description a collapsed row would hide behind. */
export function activeFilter(description: string): ActiveFilterSummary {
  if (description.trim().length === 0) {
    throw new RangeError(
      'an active filter needs a real description -- a collapsed row with none would report itself as inert',
    );
  }
  return { active: true, description };
}

export interface PanelAccessibleState {
  expanded: boolean;
  ariaExpanded: 'true' | 'false';
  /** Mirrors the filter's own active flag, independent of whether the panel is collapsed. */
  filterActive: boolean;
  /** Non-empty exactly when the panel is BOTH collapsed AND actively filtering. */
  filterSummary: string;
  /** True in that same collapsed-and-filtering case -- the state this module exists to surface. */
  isFiltering: boolean;
}

export function panelAccessibleState(collapsed: boolean, filter: ActiveFilterSummary): PanelAccessibleState {
  const hidingAnActiveFilter = collapsed && filter.active;
  return {
    expanded: !collapsed,
    ariaExpanded: collapsed ? 'false' : 'true',
    filterActive: filter.active,
    isFiltering: hidingAnActiveFilter,
    filterSummary: hidingAnActiveFilter ? (filter as { description: string }).description : '',
  };
}

function capitalise(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

/**
 * A screen-reader announcement naming the panel's expanded state and, when it applies, the
 * filter it is hiding. Kept as a single string rather than left to the caller to assemble,
 * because assembling it is exactly the step where "collapsed and filtering" quietly loses
 * its second half.
 */
export function panelAnnouncement(kind: PanelKind, collapsed: boolean, filter: ActiveFilterSummary): string {
  if (kind === 'statistics' && filter.active) {
    // Statistics describe a collection; they have no mechanism to exclude anything from it.
    // An active filter here is a caller wiring a filter's state onto the wrong panel.
    throw new RangeError('a statistics panel never filters, so it cannot be handed an active filter');
  }
  const state = collapsed ? 'collapsed' : 'expanded';
  const accessible = panelAccessibleState(collapsed, filter);
  const filteringClause = accessible.isFiltering ? ` Filtering: ${accessible.filterSummary}.` : '';
  return `${capitalise(kindDescription(kind).label)}, ${state}.${filteringClause}`;
}

export interface CollapsiblePanelState {
  kind: PanelKind;
  collapsed: boolean;
  toggleLabel: string;
  ariaExpanded: 'true' | 'false';
  filterActive: boolean;
  filterSummary: string;
  isFiltering: boolean;
  announcement: string;
}

/** Everything a surface needs to render one collapsible panel, read from storage in one call. */
export function collapsiblePanelState(
  storage: PanelStorage | undefined,
  surfaceId: string,
  kind: PanelKind,
  filter: ActiveFilterSummary,
): CollapsiblePanelState {
  const collapsed = isCollapsed(storage, surfaceId, kind);
  const accessible = panelAccessibleState(collapsed, filter);
  const label = kindDescription(kind).label.toLowerCase();
  return {
    kind,
    collapsed,
    toggleLabel: collapsed ? `Show ${label}` : `Hide ${label}`,
    ariaExpanded: accessible.ariaExpanded,
    filterActive: accessible.filterActive,
    filterSummary: accessible.filterSummary,
    isFiltering: accessible.isFiltering,
    announcement: panelAnnouncement(kind, collapsed, filter),
  };
}

export interface PanelAriaAttributes {
  role: 'button';
  tabIndex: 0;
  'aria-expanded': 'true' | 'false';
  'aria-controls'?: string;
}

/** tabIndex is fixed at 0: a collapsible toggle that cannot be tabbed to is not keyboard operable. */
export function panelToggleAriaAttributes(collapsed: boolean, controlsId?: string): PanelAriaAttributes {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-expanded': collapsed ? 'false' : 'true',
    ...(controlsId ? { 'aria-controls': controlsId } : {}),
  };
}

/** The two keys a `role="button"` toggle must respond to; a click handler alone is mouse-only. */
export const TOGGLE_ACTIVATION_KEYS: readonly string[] = ['Enter', ' '];

export function isToggleActivationKey(key: string): boolean {
  return TOGGLE_ACTIVATION_KEYS.includes(key);
}
