/** Workspace, strip, pinning, overflow, search and protected-close adapters. */

import type {
  NavigationState,
  NavigationTab,
  NavigationWorkspace,
  TabDock,
  TabStripState,
} from './navigation-state';
import { searchCollection, searchSurfaceId, type SearchFieldState } from './search-state';
import { tabSearchText } from './tab-groups';

export type WorkspaceAction =
  | { readonly type: 'set-active-strip'; readonly stripId: string }
  | { readonly type: 'add-strip'; readonly strip: TabStripState }
  | { readonly type: 'remove-strip'; readonly stripId: string }
  | { readonly type: 'set-dock'; readonly stripId: string; readonly dock: TabDock }
  | { readonly type: 'set-overflow'; readonly stripId: string; readonly capacity: number; readonly measuredAxisPixels?: number }
  | { readonly type: 'add-tab'; readonly stripId: string; readonly tab: NavigationTab; readonly activate?: boolean }
  | { readonly type: 'update-tab'; readonly stripId: string; readonly tabId: string; readonly patch: Partial<Omit<NavigationTab, 'id'>> }
  | { readonly type: 'set-active-tab'; readonly stripId: string; readonly tabId: string }
  | { readonly type: 'set-tab-pinned'; readonly stripId: string; readonly tabId: string; readonly pinned: boolean }
  | { readonly type: 'reorder-tabs'; readonly stripId: string; readonly tabOrder: ReadonlyArray<string> }
  | { readonly type: 'apply-close-preview'; readonly stripId: string; readonly preview: BulkClosePreview; readonly search: SearchFieldState };

export function reduceWorkspaceAction(workspace: NavigationWorkspace, action: WorkspaceAction): NavigationWorkspace {
  if (action.type === 'set-active-strip') {
    if (!workspace.strips[action.stripId]) throw new Error(`Unknown strip: ${action.stripId}`);
    return workspace.activeStripId === action.stripId ? workspace : { ...workspace, activeStripId: action.stripId };
  }
  if (action.type === 'add-strip') {
    if (workspace.strips[action.strip.id]) throw new Error(`Duplicate strip: ${action.strip.id}`);
    return { ...workspace, strips: { ...workspace.strips, [action.strip.id]: action.strip } };
  }
  if (action.type === 'remove-strip') {
    if (!workspace.strips[action.stripId]) throw new Error(`Unknown strip: ${action.stripId}`);
    if (Object.keys(workspace.strips).length === 1) throw new Error('A workspace must keep at least one tab strip.');
    const strips = { ...workspace.strips };
    delete strips[action.stripId];
    const activeStripId = workspace.activeStripId === action.stripId ? Object.keys(strips)[0]! : workspace.activeStripId;
    return { ...workspace, strips, activeStripId };
  }

  const strip = workspace.strips[action.stripId];
  if (!strip) throw new Error(`Unknown strip: ${action.stripId}`);
  let next: TabStripState;
  if (action.type === 'set-dock') next = { ...strip, dock: action.dock };
  else if (action.type === 'set-overflow') next = setOverflow(strip, action.capacity, action.measuredAxisPixels);
  else if (action.type === 'add-tab') next = addTab(strip, action.tab, action.activate);
  else if (action.type === 'update-tab') next = updateTab(strip, action.tabId, action.patch);
  else if (action.type === 'set-active-tab') next = setActiveTab(strip, action.tabId);
  else if (action.type === 'set-tab-pinned') next = setTabPinned(strip, action.tabId, action.pinned);
  else if (action.type === 'reorder-tabs') next = reorderTabs(strip, action.tabOrder);
  else next = applyBulkClosePreview(strip, action.preview, action.search);
  return next === strip ? workspace : { ...workspace, strips: { ...workspace.strips, [strip.id]: next } };
}

export function addTab(strip: TabStripState, tab: NavigationTab, activate = true): TabStripState {
  if (strip.tabs[tab.id]) throw new Error(`Duplicate tab: ${tab.id}`);
  if (tab.groupId !== undefined && !strip.groups[tab.groupId]) throw new Error(`Unknown tab group: ${tab.groupId}`);
  validateTab(tab);
  const tabs = { ...strip.tabs, [tab.id]: tab };
  return {
    ...strip,
    tabs,
    tabOrder: normalizePinnedOrder([...strip.tabOrder, tab.id], tabs),
    activeTabId: activate || strip.activeTabId === undefined ? tab.id : strip.activeTabId,
  };
}

export function updateTab(
  strip: TabStripState,
  tabId: string,
  patch: Partial<Omit<NavigationTab, 'id'>>,
): TabStripState {
  const tab = strip.tabs[tabId];
  if (!tab) throw new Error(`Unknown tab: ${tabId}`);
  if (patch.groupId !== undefined && !strip.groups[patch.groupId]) throw new Error(`Unknown tab group: ${patch.groupId}`);
  const updated = { ...tab, ...patch };
  validateTab(updated);
  const tabs = { ...strip.tabs, [tabId]: updated };
  return { ...strip, tabs, tabOrder: normalizePinnedOrder(strip.tabOrder, tabs) };
}

export function setActiveTab(strip: TabStripState, tabId: string): TabStripState {
  if (!strip.tabs[tabId]) throw new Error(`Unknown tab: ${tabId}`);
  return strip.activeTabId === tabId ? strip : { ...strip, activeTabId: tabId };
}

export function setTabPinned(strip: TabStripState, tabId: string, pinned: boolean): TabStripState {
  const tab = strip.tabs[tabId];
  if (!tab) throw new Error(`Unknown tab: ${tabId}`);
  if (tab.pinned === pinned) return strip;
  const tabs = { ...strip.tabs, [tabId]: { ...tab, pinned } };
  return { ...strip, tabs, tabOrder: normalizePinnedOrder(strip.tabOrder, tabs) };
}

export function reorderTabs(strip: TabStripState, order: ReadonlyArray<string>): TabStripState {
  if (order.length !== Object.keys(strip.tabs).length || new Set(order).size !== order.length) {
    throw new Error('Tab order must contain each tab exactly once.');
  }
  if (order.some((id) => !strip.tabs[id])) throw new Error('Tab order contains an unknown tab.');
  return { ...strip, tabOrder: normalizePinnedOrder(order, strip.tabs) };
}

function normalizePinnedOrder(order: ReadonlyArray<string>, tabs: Readonly<Record<string, NavigationTab>>): ReadonlyArray<string> {
  const pinned = order.filter((id) => tabs[id]?.pinned);
  const ordinary = order.filter((id) => !tabs[id]?.pinned);
  return [...pinned, ...ordinary];
}

function validateTab(tab: NavigationTab): void {
  if (!/^[A-Za-z][A-Za-z0-9._:-]{0,191}$/u.test(tab.id)) throw new Error('Tab id is invalid.');
  if (tab.label.trim().length === 0 || tab.label.length > 240 || /[\u0000-\u001f\u007f]/u.test(tab.label)) {
    throw new Error('Tab labels must contain 1-240 printable characters.');
  }
  for (const value of [tab.destinationId, tab.pageId, tab.elementId, ...tab.teleportElementIds]) {
    if (!/^[A-Za-z][A-Za-z0-9._:-]{0,191}$/u.test(value)) throw new Error(`Tab ${tab.id} contains an invalid target identifier.`);
  }
  if (tab.teleportElementIds.length === 0 || tab.teleportElementIds.length > 2_000) {
    throw new Error(`Tab ${tab.id} must register 1-2000 teleport elements.`);
  }
  if (!tab.teleportElementIds.includes(tab.elementId) || new Set(tab.teleportElementIds).size !== tab.teleportElementIds.length) {
    throw new Error(`Tab ${tab.id} has an incomplete or duplicate teleport-element registry.`);
  }
  if (tab.capabilities.length > 256 || tab.capabilities.some((capability) => capability.length === 0 || capability.length > 120)) {
    throw new Error(`Tab ${tab.id} has invalid destination capabilities.`);
  }
}

function setOverflow(strip: TabStripState, capacity: number, measuredAxisPixels?: number): TabStripState {
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 10_000) {
    throw new Error('Tab overflow capacity must be an integer from 1 through 10000.');
  }
  if (measuredAxisPixels !== undefined && (!Number.isFinite(measuredAxisPixels) || measuredAxisPixels < 0)) {
    throw new Error('Measured tab-strip axis must be a non-negative finite number.');
  }
  return { ...strip, overflow: { capacity, measuredAxisPixels } };
}

export interface TabOverflowPlan {
  readonly pinned: ReadonlyArray<NavigationTab>;
  readonly visible: ReadonlyArray<NavigationTab>;
  readonly overflowed: ReadonlyArray<NavigationTab>;
  readonly capacity: number;
  readonly pinnedExceedsCapacity: boolean;
}

export function planTabOverflow(strip: TabStripState): TabOverflowPlan {
  const ordered = strip.tabOrder.map((id) => strip.tabs[id]!).filter(Boolean);
  const pinned = ordered.filter((tab) => tab.pinned);
  const ordinary = ordered.filter((tab) => !tab.pinned);
  const ordinaryCapacity = Math.max(0, strip.overflow.capacity - pinned.length);
  const visibleOrdinary = ordinary.slice(0, ordinaryCapacity);
  return {
    pinned,
    visible: [...pinned, ...visibleOrdinary],
    overflowed: ordinary.slice(ordinaryCapacity),
    capacity: strip.overflow.capacity,
    pinnedExceedsCapacity: pinned.length > strip.overflow.capacity,
  };
}

export interface StripSearchMatch {
  readonly tab: NavigationTab;
  readonly workspaceId: string;
  readonly windowId: string;
  readonly stripId: string;
  readonly groupId?: string;
  readonly groupCollapsed: boolean;
  readonly pinned: boolean;
}

export interface TabSearchResult {
  readonly matches: ReadonlyArray<StripSearchMatch>;
  readonly search: SearchFieldState;
  readonly error?: string;
}

export function searchCurrentStrip(
  workspace: NavigationWorkspace,
  stripId: string,
  search: SearchFieldState,
): TabSearchResult {
  if (search.identity.kind !== 'strip-tabs') throw new Error('Current-strip search requires a strip-tabs field.');
  const strip = workspace.strips[stripId];
  if (!strip) throw new Error(`Unknown strip: ${stripId}`);
  if (search.identity.surfaceId !== searchSurfaceId.strip(strip.id)) {
    throw new Error('Current-strip search is attached to a different strip.');
  }
  const tabs = strip.tabOrder.map((id) => strip.tabs[id]!).filter(Boolean);
  const result = searchCollection(search, tabs, tabSearchText);
  return {
    matches: result.matches.map((tab) => toSearchMatch(workspace, strip, tab)),
    search: result.field,
    error: result.error,
  };
}

export function searchMasterTabs(state: NavigationState, search: SearchFieldState): TabSearchResult {
  if (search.identity.kind !== 'master-tabs') throw new Error('Master search requires a master-tabs field.');
  const registered = state.searches[search.identity.fieldId];
  if (!registered || registered.identity.surfaceId !== search.identity.surfaceId || registered.identity.builderId !== search.identity.builderId) {
    throw new Error('Master search is not registered in this navigation state.');
  }
  if (!search.identity.surfaceId.startsWith('tab-master:')) {
    throw new Error('Master search is attached to an invalid owner surface.');
  }
  const candidates: Array<StripSearchMatch> = [];
  for (const workspaceId of state.workspaceOrder) {
    const workspace = state.workspaces[workspaceId];
    if (!workspace) continue;
    for (const strip of Object.values(workspace.strips)) {
      for (const tabId of strip.tabOrder) {
        const tab = strip.tabs[tabId];
        if (tab) candidates.push(toSearchMatch(workspace, strip, tab));
      }
    }
  }
  const result = searchCollection(search, candidates, (match) => [
    tabSearchText(match.tab), match.workspaceId, match.windowId, match.stripId, match.groupId ?? '',
  ].join('\n'));
  return { matches: result.matches, search: result.field, error: result.error };
}

function toSearchMatch(workspace: NavigationWorkspace, strip: TabStripState, tab: NavigationTab): StripSearchMatch {
  const group = tab.groupId ? strip.groups[tab.groupId] : undefined;
  return {
    tab,
    workspaceId: workspace.id,
    windowId: workspace.windowId,
    stripId: strip.id,
    groupId: tab.groupId,
    groupCollapsed: group?.collapsed ?? false,
    pinned: tab.pinned,
  };
}

export type BulkCloseMode = 'containing' | 'not-containing';

export interface CloseExclusion {
  readonly tab: NavigationTab;
  readonly reason: 'pinned' | 'unsaved-work' | 'locked' | 'not-closable' | 'not-matched';
}

export interface BulkClosePreview {
  readonly previewId: string;
  readonly stripId: string;
  readonly searchFieldId: string;
  readonly mode: BulkCloseMode;
  readonly query: string;
  readonly flags: string;
  readonly includePinned: boolean;
  readonly candidateTabIds: ReadonlyArray<string>;
  readonly candidateSignature: string;
  readonly affectedTabIds: ReadonlyArray<string>;
  readonly exclusions: ReadonlyArray<CloseExclusion>;
  readonly blockedReason?: string;
}

export function previewBulkClose(
  strip: TabStripState,
  search: SearchFieldState,
  mode: BulkCloseMode,
  includePinned = false,
): BulkClosePreview {
  const expectedKind = mode === 'containing' ? 'bulk-close-containing' : 'bulk-close-not-containing';
  if (search.identity.kind !== expectedKind) throw new Error(`Bulk close ${mode} requires its own ${expectedKind} field.`);
  if (search.identity.surfaceId !== searchSurfaceId.bulkClose(strip.id, mode)) {
    throw new Error('Bulk-close search is attached to a different strip or action.');
  }
  if (search.query.trim().length === 0) {
    return blockedPreview(strip, search, mode, includePinned, 'Enter text or a valid pattern before previewing tabs to close.');
  }
  if (!search.validation.ok) return blockedPreview(strip, search, mode, includePinned, search.validation.reason);

  const searched = searchCollection(search, strip.tabOrder.map((id) => strip.tabs[id]!).filter(Boolean), (tab) => tab.label);
  if (searched.error) return blockedPreview(strip, search, mode, includePinned, searched.error);
  const matching = new Set(searched.matches.map((tab) => tab.id));
  const candidates = strip.tabOrder.map((id) => strip.tabs[id]!).filter(Boolean);
  const affectedTabIds: string[] = [];
  const exclusions: CloseExclusion[] = [];
  for (const tab of candidates) {
    const predicate = mode === 'containing' ? matching.has(tab.id) : !matching.has(tab.id);
    if (!predicate) {
      exclusions.push({ tab, reason: 'not-matched' });
      continue;
    }
    if (tab.pinned && !includePinned) exclusions.push({ tab, reason: 'pinned' });
    else if (tab.dirty) exclusions.push({ tab, reason: 'unsaved-work' });
    else if (tab.locked) exclusions.push({ tab, reason: 'locked' });
    else if (!tab.closable) exclusions.push({ tab, reason: 'not-closable' });
    else affectedTabIds.push(tab.id);
  }
  return {
    previewId: previewIdentity(strip.id, search, mode, includePinned),
    stripId: strip.id,
    searchFieldId: search.identity.fieldId,
    mode,
    query: search.query,
    flags: search.flags,
    includePinned,
    candidateTabIds: candidates.map((tab) => tab.id),
    candidateSignature: closeCandidateSignature(candidates),
    affectedTabIds,
    exclusions,
  };
}

function blockedPreview(
  strip: TabStripState,
  search: SearchFieldState,
  mode: BulkCloseMode,
  includePinned: boolean,
  reason: string,
): BulkClosePreview {
  return {
    previewId: previewIdentity(strip.id, search, mode, includePinned),
    stripId: strip.id,
    searchFieldId: search.identity.fieldId,
    mode,
    query: search.query,
    flags: search.flags,
    includePinned,
    candidateTabIds: strip.tabOrder,
    candidateSignature: closeCandidateSignature(strip.tabOrder.map((id) => strip.tabs[id]!).filter(Boolean)),
    affectedTabIds: [],
    exclusions: [],
    blockedReason: reason,
  };
}

function previewIdentity(stripId: string, search: SearchFieldState, mode: BulkCloseMode, includePinned: boolean): string {
  return [stripId, search.identity.fieldId, mode, includePinned ? 'include-pinned' : 'protect-pinned', search.mode, search.flags, search.query].join('::');
}

function closeCandidateSignature(tabs: ReadonlyArray<NavigationTab>): string {
  return tabs.map((tab) => [
    tab.id,
    tab.label,
    tab.pinned ? '1' : '0',
    tab.dirty ? '1' : '0',
    tab.locked ? '1' : '0',
    tab.closable ? '1' : '0',
  ].join('\u001f')).join('\u001e');
}

/**
 * Apply only the exact reviewed preview against an unchanged candidate set.
 * Any stale, blocked or now-protected tab aborts instead of silently changing
 * the action after confirmation.
 */
export function applyBulkClosePreview(
  strip: TabStripState,
  preview: BulkClosePreview,
  search: SearchFieldState,
): TabStripState {
  if (preview.blockedReason) throw new Error(`Cannot apply a blocked close preview: ${preview.blockedReason}`);
  if (preview.stripId !== strip.id) throw new Error('Close preview belongs to another strip.');
  if (preview.query.trim().length === 0) throw new Error('An empty bulk-close query cannot be applied.');
  if (preview.candidateTabIds.join('\0') !== strip.tabOrder.join('\0')) throw new Error('Tabs changed after the close preview was created.');
  const current = previewBulkClose(strip, search, preview.mode, preview.includePinned);
  if (current.blockedReason
    || current.previewId !== preview.previewId
    || current.candidateSignature !== preview.candidateSignature
    || current.affectedTabIds.join('\0') !== preview.affectedTabIds.join('\0')) {
    throw new Error('Bulk-close search state changed after the preview was created.');
  }
  const closing = new Set(preview.affectedTabIds);
  for (const id of closing) {
    const tab = strip.tabs[id];
    if (!tab) throw new Error(`Close preview contains an unknown tab: ${id}`);
    if ((tab.pinned && !preview.includePinned) || tab.dirty || tab.locked || !tab.closable) {
      throw new Error(`Tab ${id} became protected after the close preview was created.`);
    }
  }
  const tabs = { ...strip.tabs };
  for (const id of closing) delete tabs[id];
  const tabOrder = strip.tabOrder.filter((id) => !closing.has(id));
  const activeTabId = strip.activeTabId && closing.has(strip.activeTabId)
    ? tabOrder[0]
    : strip.activeTabId;
  return { ...strip, tabs, tabOrder, activeTabId };
}
