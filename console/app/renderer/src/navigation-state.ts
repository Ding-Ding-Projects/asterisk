/** Persistent, versioned navigation state shared by every renderer surface. */

import { createSearchField, createSearchStateMap, reduceSearchStateMap, type SearchMapAction, type SearchStateMap } from './search-state';
import { reduceTabGroupAction, type TabGroupAction } from './tab-groups';
import { reduceWorkspaceAction, type WorkspaceAction } from './tab-workspaces';

export type TabDock = 'left' | 'right' | 'top' | 'bottom';
export type TabAxis = 'horizontal' | 'vertical';
export type PaletteSize = 'card' | 'full-window';

export interface NavigationTab {
  readonly id: string;
  readonly label: string;
  readonly destinationId: string;
  readonly pageId: string;
  readonly elementId: string;
  /** Every exact element that a palette result may focus or highlight. */
  readonly teleportElementIds: ReadonlyArray<string>;
  readonly groupId?: string;
  readonly pinned: boolean;
  readonly dirty: boolean;
  readonly locked: boolean;
  readonly closable: boolean;
  readonly capabilities: ReadonlyArray<string>;
}

export interface TabGroupState {
  readonly id: string;
  readonly name: string;
  readonly colour?: string;
  readonly order: number;
  readonly collapsed: boolean;
  readonly pinned: boolean;
}

export interface TabOverflowState {
  readonly capacity: number;
  readonly measuredAxisPixels?: number;
}

export interface TabStripState {
  readonly id: string;
  readonly dock: TabDock;
  readonly activeTabId?: string;
  readonly tabOrder: ReadonlyArray<string>;
  readonly groupOrder: ReadonlyArray<string>;
  readonly tabs: Readonly<Record<string, NavigationTab>>;
  readonly groups: Readonly<Record<string, TabGroupState>>;
  readonly overflow: TabOverflowState;
}

export interface NavigationWorkspace {
  readonly id: string;
  readonly label: string;
  readonly windowId: string;
  readonly order: number;
  readonly activeStripId: string;
  readonly strips: Readonly<Record<string, TabStripState>>;
}

export interface PaletteState {
  readonly size: PaletteSize;
  readonly searchFieldId: string;
}

export interface NavigationState {
  readonly schemaVersion: 1;
  readonly activeWorkspaceId: string;
  readonly workspaces: Readonly<Record<string, NavigationWorkspace>>;
  readonly workspaceOrder: ReadonlyArray<string>;
  readonly searches: SearchStateMap;
  readonly palette: PaletteState;
  readonly revision: number;
}

export type NavigationAction =
  | { readonly type: 'workspace'; readonly workspaceId: string; readonly action: WorkspaceAction }
  | { readonly type: 'group'; readonly workspaceId: string; readonly stripId: string; readonly action: TabGroupAction }
  | { readonly type: 'search'; readonly action: SearchMapAction }
  | { readonly type: 'set-active-workspace'; readonly workspaceId: string }
  | { readonly type: 'set-workspace-order'; readonly workspaceOrder: ReadonlyArray<string> }
  | { readonly type: 'set-palette-size'; readonly size: PaletteSize };

const IDENTIFIER = /^[A-Za-z][A-Za-z0-9._:-]{0,191}$/u;
export const NAVIGATION_STORAGE_KEY = 'ding.navigation-state.v1';
export const MAX_WORKSPACES = 32;
export const MAX_STRIPS_PER_WORKSPACE = 16;
export const MAX_TABS_PER_STRIP = 1_000;
export const MAX_GROUPS_PER_STRIP = 200;
export const MAX_SEARCH_FIELDS = 2_000;

export function tabAxis(dock: TabDock): TabAxis {
  return dock === 'left' || dock === 'right' ? 'vertical' : 'horizontal';
}

export function createNavigationState(
  workspaces: ReadonlyArray<NavigationWorkspace>,
  searches: SearchStateMap,
  paletteSearchFieldId: string,
): NavigationState {
  if (workspaces.length === 0) throw new Error('Navigation requires at least one workspace.');
  if (workspaces.length > MAX_WORKSPACES) throw new Error(`Navigation supports at most ${MAX_WORKSPACES} workspaces.`);
  const searchEntries = Object.entries(searches);
  if (searchEntries.length > MAX_SEARCH_FIELDS) throw new Error(`Navigation supports at most ${MAX_SEARCH_FIELDS} search fields.`);
  for (const [key, search] of searchEntries) {
    if (key !== search.identity.fieldId) throw new Error(`Search map key does not match field ${search.identity.fieldId}.`);
  }
  const workspaceMap: Record<string, NavigationWorkspace> = {};
  for (const workspace of workspaces) {
    validateWorkspace(workspace);
    if (workspaceMap[workspace.id]) throw new Error(`Duplicate workspace id: ${workspace.id}`);
    workspaceMap[workspace.id] = workspace;
  }
  if (!searches[paletteSearchFieldId]) throw new Error(`Palette search field is missing: ${paletteSearchFieldId}`);
  if (searches[paletteSearchFieldId]?.identity.kind !== 'palette') {
    throw new Error(`Search field ${paletteSearchFieldId} is not a palette search field.`);
  }
  const workspaceOrder = [...workspaces].sort((a, b) => a.order - b.order).map((workspace) => workspace.id);
  workspaceOrder.forEach((id, order) => { workspaceMap[id] = { ...workspaceMap[id]!, order }; });
  return {
    schemaVersion: 1,
    activeWorkspaceId: workspaceOrder[0],
    workspaces: workspaceMap,
    workspaceOrder,
    searches,
    palette: { size: 'card', searchFieldId: paletteSearchFieldId },
    revision: 0,
  };
}

export function createEmptyStrip(id: string, dock: TabDock = 'left'): TabStripState {
  assertIdentifier(id, 'strip id');
  return {
    id,
    dock,
    tabOrder: [],
    groupOrder: [],
    tabs: {},
    groups: {},
    overflow: { capacity: 1 },
  };
}

export function createWorkspace(id: string, label: string, windowId: string, stripId: string, order = 0): NavigationWorkspace {
  assertIdentifier(id, 'workspace id');
  assertIdentifier(windowId, 'window id');
  const strip = createEmptyStrip(stripId);
  return { id, label, windowId, order, activeStripId: stripId, strips: { [stripId]: strip } };
}

export function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  if (action.type === 'set-palette-size') {
    if (state.palette.size === action.size) return state;
    return bump(state, { ...state, palette: { ...state.palette, size: action.size } });
  }
  if (action.type === 'set-active-workspace') {
    if (!state.workspaces[action.workspaceId]) throw new Error(`Unknown workspace: ${action.workspaceId}`);
    if (state.activeWorkspaceId === action.workspaceId) return state;
    return bump(state, { ...state, activeWorkspaceId: action.workspaceId });
  }
  if (action.type === 'set-workspace-order') {
    const nextOrder = exactOrder(action.workspaceOrder, Object.keys(state.workspaces), 'workspace');
    const workspaces: Record<string, NavigationWorkspace> = {};
    nextOrder.forEach((id, order) => { workspaces[id] = { ...state.workspaces[id]!, order }; });
    return bump(state, { ...state, workspaceOrder: nextOrder, workspaces });
  }
  if (action.type === 'search') {
    const searches = reduceSearchStateMap(state.searches, action.action);
    return bump(state, { ...state, searches });
  }

  const workspace = state.workspaces[action.workspaceId];
  if (!workspace) throw new Error(`Unknown workspace: ${action.workspaceId}`);
  if (action.type === 'workspace') {
    const nextWorkspace = reduceWorkspaceAction(workspace, action.action);
    if (nextWorkspace === workspace) return state;
    return bump(state, { ...state, workspaces: { ...state.workspaces, [workspace.id]: nextWorkspace } });
  }

  const strip = workspace.strips[action.stripId];
  if (!strip) throw new Error(`Unknown strip: ${action.stripId}`);
  const nextStrip = reduceTabGroupAction(strip, action.action);
  if (nextStrip === strip) return state;
  const nextWorkspace = { ...workspace, strips: { ...workspace.strips, [strip.id]: nextStrip } };
  return bump(state, { ...state, workspaces: { ...state.workspaces, [workspace.id]: nextWorkspace } });
}

function bump(_previous: NavigationState, next: NavigationState): NavigationState {
  return { ...next, revision: next.revision + 1 };
}

function assertIdentifier(value: string, name: string): void {
  if (!IDENTIFIER.test(value)) throw new Error(`${name} must be a stable non-empty identifier.`);
}

function exactOrder(order: ReadonlyArray<string>, expected: ReadonlyArray<string>, name: string): ReadonlyArray<string> {
  const expectedSet = new Set(expected);
  if (order.length !== expectedSet.size || new Set(order).size !== order.length || order.some((id) => !expectedSet.has(id))) {
    throw new Error(`${name} order must contain every ${name} exactly once.`);
  }
  return [...order];
}

function validateWorkspace(workspace: NavigationWorkspace): void {
  assertIdentifier(workspace.id, 'workspace id');
  assertIdentifier(workspace.windowId, 'window id');
  if (typeof workspace.label !== 'string' || workspace.label.trim().length === 0 || workspace.label.length > 240) {
    throw new Error(`Workspace ${workspace.id} has an invalid label.`);
  }
  if (!Number.isSafeInteger(workspace.order) || workspace.order < 0) throw new Error(`Workspace ${workspace.id} has an invalid order.`);
  const strips = Object.values(workspace.strips);
  if (strips.length === 0 || strips.length > MAX_STRIPS_PER_WORKSPACE) {
    throw new Error(`Workspace ${workspace.id} must contain 1-${MAX_STRIPS_PER_WORKSPACE} strips.`);
  }
  if (!workspace.strips[workspace.activeStripId]) throw new Error(`Workspace ${workspace.id} has an unknown active strip.`);
  for (const strip of strips) validateStrip(strip);
}

function validateStrip(strip: TabStripState): void {
  assertIdentifier(strip.id, 'strip id');
  if (!(['left', 'right', 'top', 'bottom'] as const).includes(strip.dock)) throw new Error(`Strip ${strip.id} has an invalid dock.`);
  if (!Number.isSafeInteger(strip.overflow?.capacity) || strip.overflow.capacity < 1 || strip.overflow.capacity > 10_000) {
    throw new Error(`Strip ${strip.id} has an invalid overflow capacity.`);
  }
  if (strip.overflow.measuredAxisPixels !== undefined
    && (!Number.isFinite(strip.overflow.measuredAxisPixels) || strip.overflow.measuredAxisPixels < 0)) {
    throw new Error(`Strip ${strip.id} has an invalid measured axis.`);
  }
  const tabs = Object.values(strip.tabs);
  const groups = Object.values(strip.groups);
  if (tabs.length > MAX_TABS_PER_STRIP) throw new Error(`Strip ${strip.id} exceeds the tab limit.`);
  if (groups.length > MAX_GROUPS_PER_STRIP) throw new Error(`Strip ${strip.id} exceeds the group limit.`);
  exactOrder(strip.tabOrder, tabs.map((tab) => tab.id), 'tab');
  exactOrder(strip.groupOrder, groups.map((group) => group.id), 'group');
  strip.groupOrder.forEach((id, order) => {
    if (strip.groups[id]?.order !== order) throw new Error(`Group ${id} has a stale persisted order.`);
  });
  if (strip.activeTabId !== undefined && !strip.tabs[strip.activeTabId]) throw new Error(`Strip ${strip.id} has an unknown active tab.`);
  for (const tab of tabs) {
    assertIdentifier(tab.id, 'tab id');
    assertIdentifier(tab.destinationId, 'destination id');
    assertIdentifier(tab.pageId, 'page id');
    assertIdentifier(tab.elementId, 'element id');
    if (typeof tab.label !== 'string' || tab.label.trim().length === 0 || tab.label.length > 240 || /[\u0000-\u001f\u007f]/u.test(tab.label)) {
      throw new Error(`Tab ${tab.id} has an invalid label.`);
    }
    if (![tab.pinned, tab.dirty, tab.locked, tab.closable].every((value) => typeof value === 'boolean')) {
      throw new Error(`Tab ${tab.id} has invalid protection state.`);
    }
    if (!Array.isArray(tab.teleportElementIds) || !Array.isArray(tab.capabilities)) {
      throw new Error(`Tab ${tab.id} has invalid capability or teleport metadata.`);
    }
    if (tab.teleportElementIds.length === 0 || tab.teleportElementIds.length > 2_000) {
      throw new Error(`Tab ${tab.id} must register 1-2000 teleport elements.`);
    }
    if (!tab.teleportElementIds.includes(tab.elementId)) {
      throw new Error(`Tab ${tab.id} must register its primary element as a teleport element.`);
    }
    if (new Set(tab.teleportElementIds).size !== tab.teleportElementIds.length) {
      throw new Error(`Tab ${tab.id} registers duplicate teleport elements.`);
    }
    for (const elementId of tab.teleportElementIds) assertIdentifier(elementId, 'teleport element id');
    if (tab.capabilities.length > 256 || tab.capabilities.some((capability) => typeof capability !== 'string' || capability.length === 0 || capability.length > 120)) {
      throw new Error(`Tab ${tab.id} has invalid destination capabilities.`);
    }
    if (tab.groupId !== undefined && !strip.groups[tab.groupId]) throw new Error(`Tab ${tab.id} names an unknown group.`);
  }
  for (const group of groups) {
    assertIdentifier(group.id, 'group id');
    if (typeof group.name !== 'string' || group.name.trim().length === 0 || group.name.length > 120) {
      throw new Error(`Group ${group.id} has an invalid name.`);
    }
    if (!Number.isSafeInteger(group.order) || group.order < 0 || typeof group.collapsed !== 'boolean' || typeof group.pinned !== 'boolean') {
      throw new Error(`Group ${group.id} has invalid state.`);
    }
    if (group.colour !== undefined && (typeof group.colour !== 'string' || group.colour.length > 128)) {
      throw new Error(`Group ${group.id} has an invalid colour.`);
    }
  }
}

export interface NavigationStoragePort {
  readonly read: (key: string) => string | null;
  readonly write: (key: string, value: string) => void;
  readonly remove: (key: string) => void;
}

export interface NavigationPersistenceAdapter {
  readonly load: () => NavigationState | undefined;
  readonly save: (state: NavigationState) => void;
  readonly clear: () => void;
}

export function browserNavigationStorage(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
): NavigationStoragePort {
  return {
    read: (key) => storage.getItem(key),
    write: (key, value) => storage.setItem(key, value),
    remove: (key) => storage.removeItem(key),
  };
}

export function createNavigationPersistenceAdapter(
  storage: NavigationStoragePort,
  key = NAVIGATION_STORAGE_KEY,
): NavigationPersistenceAdapter {
  return {
    load: () => {
      const encoded = storage.read(key);
      if (encoded === null) return undefined;
      return parseNavigationState(encoded);
    },
    save: (state) => storage.write(key, serializeNavigationState(state)),
    clear: () => storage.remove(key),
  };
}

export function serializeNavigationState(state: NavigationState): string {
  validateDecodedState(state);
  return JSON.stringify(state);
}

export function parseNavigationState(encoded: string): NavigationState | undefined {
  if (encoded.length > 2_000_000) return undefined;
  let raw: unknown;
  try {
    raw = JSON.parse(encoded);
  } catch {
    return undefined;
  }
  try {
    return hydrateNavigationState(raw);
  } catch {
    return undefined;
  }
}

function hydrateNavigationState(raw: unknown): NavigationState {
  if (!isRecord(raw) || raw.schemaVersion !== 1) throw new Error('Unsupported navigation schema.');
  if (!isRecord(raw.workspaces) || !Array.isArray(raw.workspaceOrder) || !isRecord(raw.searches) || !isRecord(raw.palette)) {
    throw new Error('Navigation state is incomplete.');
  }
  const searches = Object.entries(raw.searches);
  if (searches.length > MAX_SEARCH_FIELDS) throw new Error('Search-field limit exceeded.');
  const hydratedSearches = createSearchStateMap(searches.map(([mapKey, value]) => {
    if (!isRecord(value) || !isRecord(value.identity)) throw new Error('Invalid search state.');
    const identity = value.identity as unknown as Parameters<typeof createSearchField>[0];
    if (identity.fieldId !== mapKey) throw new Error('Search map key does not match its field identity.');
    const field = createSearchField(identity, {
      mode: value.mode === 'regex' ? 'regex' : 'plain',
      query: typeof value.query === 'string' ? value.query : '',
      flags: typeof value.flags === 'string' ? value.flags : '',
    });
    return {
      ...field,
      resultCount: finiteNonNegative(value.resultCount),
      evaluatedCount: finiteNonNegative(value.evaluatedCount),
      truncated: value.truncated === true,
      timedOut: value.timedOut === true,
      builderOpen: value.builderOpen === true,
    };
  }));
  const state = {
    schemaVersion: 1 as const,
    activeWorkspaceId: stringValue(raw.activeWorkspaceId),
    workspaces: raw.workspaces as unknown as Readonly<Record<string, NavigationWorkspace>>,
    workspaceOrder: raw.workspaceOrder.map(stringValue),
    searches: hydratedSearches,
    palette: {
      size: raw.palette.size === 'full-window' ? 'full-window' as const : 'card' as const,
      searchFieldId: stringValue(raw.palette.searchFieldId),
    },
    revision: finiteNonNegative(raw.revision),
  };
  validateDecodedState(state);
  return state;
}

function validateDecodedState(state: NavigationState): void {
  const workspaces = Object.values(state.workspaces);
  if (workspaces.length === 0 || workspaces.length > MAX_WORKSPACES) throw new Error('Workspace limit violated.');
  exactOrder(state.workspaceOrder, workspaces.map((workspace) => workspace.id), 'workspace');
  state.workspaceOrder.forEach((id, order) => {
    if (state.workspaces[id]?.order !== order) throw new Error(`Workspace ${id} has a stale persisted order.`);
  });
  if (!state.workspaces[state.activeWorkspaceId]) throw new Error('Active workspace is unknown.');
  if (!state.searches[state.palette.searchFieldId]) throw new Error('Palette search field is unknown.');
  for (const workspace of workspaces) validateWorkspace(workspace);
}

function finiteNonNegative(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function stringValue(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Expected a string.');
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
