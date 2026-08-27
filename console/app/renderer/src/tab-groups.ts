/** Group lifecycle and the independent group-name and per-group tab searches. */

import type { NavigationTab, TabGroupState, TabStripState } from './navigation-state';
import { searchCollection, searchSurfaceId, type SearchFieldState } from './search-state';

export type TabGroupAction =
  | { readonly type: 'create'; readonly group: TabGroupState }
  | { readonly type: 'rename'; readonly groupId: string; readonly name: string }
  | { readonly type: 'set-colour'; readonly groupId: string; readonly colour?: string }
  | { readonly type: 'set-collapsed'; readonly groupId: string; readonly collapsed: boolean }
  | { readonly type: 'set-pinned'; readonly groupId: string; readonly pinned: boolean }
  | { readonly type: 'reorder'; readonly groupOrder: ReadonlyArray<string> }
  | { readonly type: 'move-tab'; readonly tabId: string; readonly groupId?: string }
  | { readonly type: 'remove'; readonly groupId: string; readonly moveTabsToGroupId?: string };

export function reduceTabGroupAction(strip: TabStripState, action: TabGroupAction): TabStripState {
  if (action.type === 'create') return createGroup(strip, action.group);
  if (action.type === 'reorder') return reorderGroups(strip, action.groupOrder);
  if (action.type === 'move-tab') return moveTabToGroup(strip, action.tabId, action.groupId);
  if (action.type === 'remove') return removeGroup(strip, action.groupId, action.moveTabsToGroupId);

  const group = strip.groups[action.groupId];
  if (!group) throw new Error(`Unknown tab group: ${action.groupId}`);
  if (action.type === 'rename') {
    const name = action.name.trim();
    if (name.length === 0 || name.length > 120) throw new Error('Tab group names must contain 1-120 characters.');
    return replaceGroup(strip, { ...group, name });
  }
  if (action.type === 'set-colour') {
    if (action.colour !== undefined && action.colour.length > 128) throw new Error('Tab group colour value is too long.');
    return replaceGroup(strip, { ...group, colour: action.colour });
  }
  if (action.type === 'set-collapsed') return replaceGroup(strip, { ...group, collapsed: action.collapsed });
  return replaceGroup(strip, { ...group, pinned: action.pinned });
}

export function createGroup(strip: TabStripState, group: TabGroupState): TabStripState {
  if (strip.groups[group.id]) throw new Error(`Duplicate tab group: ${group.id}`);
  if (!/^[A-Za-z][A-Za-z0-9._:-]{0,191}$/u.test(group.id)) throw new Error('Tab group id is invalid.');
  const name = group.name.trim();
  if (name.length === 0 || name.length > 120) throw new Error('Tab group names must contain 1-120 characters.');
  const nextGroup = { ...group, name, order: strip.groupOrder.length };
  return {
    ...strip,
    groups: { ...strip.groups, [group.id]: nextGroup },
    groupOrder: [...strip.groupOrder, group.id],
  };
}

export function reorderGroups(strip: TabStripState, groupOrder: ReadonlyArray<string>): TabStripState {
  const expected = Object.keys(strip.groups);
  if (groupOrder.length !== expected.length || new Set(groupOrder).size !== groupOrder.length) {
    throw new Error('Group order must contain each group exactly once.');
  }
  const expectedSet = new Set(expected);
  if (groupOrder.some((id) => !expectedSet.has(id))) throw new Error('Group order contains an unknown group.');
  const groups: Record<string, TabGroupState> = {};
  groupOrder.forEach((id, order) => { groups[id] = { ...strip.groups[id]!, order }; });
  return { ...strip, groupOrder: [...groupOrder], groups };
}

export function moveTabToGroup(strip: TabStripState, tabId: string, groupId?: string): TabStripState {
  const tab = strip.tabs[tabId];
  if (!tab) throw new Error(`Unknown tab: ${tabId}`);
  if (groupId !== undefined && !strip.groups[groupId]) throw new Error(`Unknown destination group: ${groupId}`);
  if (tab.groupId === groupId) return strip;
  return { ...strip, tabs: { ...strip.tabs, [tabId]: { ...tab, groupId } } };
}

export function removeGroup(strip: TabStripState, groupId: string, moveTabsToGroupId?: string): TabStripState {
  if (!strip.groups[groupId]) throw new Error(`Unknown tab group: ${groupId}`);
  if (moveTabsToGroupId === groupId) throw new Error('A removed group cannot be its own replacement.');
  if (moveTabsToGroupId !== undefined && !strip.groups[moveTabsToGroupId]) {
    throw new Error(`Unknown replacement group: ${moveTabsToGroupId}`);
  }
  const groups = { ...strip.groups };
  delete groups[groupId];
  const tabs: Record<string, NavigationTab> = {};
  for (const [id, tab] of Object.entries(strip.tabs)) {
    tabs[id] = tab.groupId === groupId ? { ...tab, groupId: moveTabsToGroupId } : tab;
  }
  const groupOrder = strip.groupOrder.filter((id) => id !== groupId);
  return reorderGroups({ ...strip, groups, tabs, groupOrder }, groupOrder);
}

function replaceGroup(strip: TabStripState, group: TabGroupState): TabStripState {
  return { ...strip, groups: { ...strip.groups, [group.id]: group } };
}

export interface GroupNameSearchResult {
  readonly groups: ReadonlyArray<TabGroupState>;
  readonly search: SearchFieldState;
  readonly error?: string;
}

export function searchGroupNames(strip: TabStripState, search: SearchFieldState): GroupNameSearchResult {
  if (search.identity.kind !== 'group-names') throw new Error('A group-name search requires its own group-names field.');
  if (search.identity.surfaceId !== searchSurfaceId.groupNames(strip.id)) {
    throw new Error('Group-name search is attached to a different strip.');
  }
  const ordered = strip.groupOrder.map((id) => strip.groups[id]!).filter(Boolean);
  const result = searchCollection(search, ordered, (group) => `${group.name}\n${group.colour ?? ''}`);
  return { groups: result.matches, search: result.field, error: result.error };
}

export interface GroupTabSearchMatch {
  readonly tab: NavigationTab;
  readonly stripId: string;
  readonly groupId: string;
  readonly pinned: boolean;
  readonly revealCollapsedGroup: boolean;
}

export interface GroupTabSearchResult {
  readonly matches: ReadonlyArray<GroupTabSearchMatch>;
  readonly search: SearchFieldState;
  readonly error?: string;
}

export function searchTabsInGroup(
  strip: TabStripState,
  groupId: string,
  search: SearchFieldState,
): GroupTabSearchResult {
  if (search.identity.kind !== 'group-tabs') throw new Error('A group tab search requires its own group-tabs field.');
  const group = strip.groups[groupId];
  if (!group) throw new Error(`Unknown group: ${groupId}`);
  if (search.identity.surfaceId !== searchSurfaceId.group(strip.id, groupId)) {
    throw new Error('Group tab search is attached to a different group.');
  }
  const tabs = strip.tabOrder.map((id) => strip.tabs[id]!).filter((tab) => tab?.groupId === groupId);
  const result = searchCollection(search, tabs, tabSearchText);
  return {
    matches: result.matches.map((tab) => ({
      tab,
      stripId: strip.id,
      groupId,
      pinned: tab.pinned,
      revealCollapsedGroup: group.collapsed,
    })),
    search: result.field,
    error: result.error,
  };
}

export function tabSearchText(tab: NavigationTab): string {
  return [tab.label, tab.destinationId, tab.pageId, tab.elementId, ...tab.capabilities].join('\n');
}
