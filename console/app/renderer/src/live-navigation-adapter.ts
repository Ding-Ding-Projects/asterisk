import {
  type NavigationState,
  type NavigationTab,
  type TabGroupState,
} from './navigation-state';
import type { TeleportTarget } from './command-registry';

export type GeneratedNavigationGroup = {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly colour?: unknown;
  readonly collapsed?: unknown;
  readonly expanded?: unknown;
  readonly pinned?: unknown;
  readonly tabs?: unknown;
};

export type GeneratedNavigationSnapshot = {
  readonly expectedRevision?: number;
  readonly screen?: unknown;
  readonly tabs?: unknown;
  readonly pinned?: unknown;
  readonly groups?: unknown;
  readonly railId?: unknown;
};

export interface LiveNavigationAdapter {
  getState(): NavigationState;
  beginTransaction(): number;
  endTransaction(token: number): boolean;
  restore(snapshot: NavigationState): NavigationState;
  subscribe(listener: (state: NavigationState) => void): () => void;
  replaceDefinitionState(definitions: NavigationState): NavigationState;
  syncGenerated(snapshot: GeneratedNavigationSnapshot): NavigationState;
  activateDestination(destinationId: string): NavigationState | undefined;
  activateTarget(target: TeleportTarget): NavigationState | undefined;
}

function destinationMap(state: NavigationState): Map<string, NavigationTab> {
  const map = new Map<string, NavigationTab>();
  for (const workspace of Object.values(state.workspaces)) {
    for (const strip of Object.values(workspace.strips)) {
      for (const tab of Object.values(strip.tabs)) map.set(tab.destinationId, tab);
    }
  }
  return map;
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string');
}

function groupList(value: unknown): GeneratedNavigationGroup[] {
  return Array.isArray(value)
    ? value.filter((item): item is GeneratedNavigationGroup => Boolean(item && typeof item === 'object'))
    : [];
}

function sameTargetTab(definition: NavigationTab, current: NavigationTab | undefined): NavigationTab {
  if (!current) return definition;
  return {
    ...definition,
    pinned: current.pinned,
    dirty: current.dirty,
    locked: current.locked,
    groupId: current.groupId,
  };
}

export function createLiveNavigationAdapter(initial: NavigationState): LiveNavigationAdapter {
  let state = initial;
  let definitions = initial;
  let transactionToken = 0;
  let lockedToken: number | undefined;
  const listeners = new Set<(next: NavigationState) => void>();

  const publish = (next: NavigationState): NavigationState => {
    if (next === state) return state;
    state = next;
    for (const listener of listeners) listener(state);
    return state;
  };

  const restore = (snapshot: NavigationState): NavigationState => publish(snapshot);

  const beginTransaction = (): number => {
    transactionToken += 1;
    lockedToken = transactionToken;
    return transactionToken;
  };

  const endTransaction = (token: number): boolean => {
    if (lockedToken !== token) return false;
    lockedToken = undefined;
    return true;
  };

  const currentWorkspace = (): { workspace: NavigationState['workspaces'][string]; strip: NavigationState['workspaces'][string]['strips'][string] } | undefined => {
    const workspace = state.workspaces[state.activeWorkspaceId];
    if (!workspace) return undefined;
    const strip = workspace.strips[workspace.activeStripId];
    return strip ? { workspace, strip } : undefined;
  };

  const replaceDefinitionState = (nextDefinitions: NavigationState): NavigationState => {
    if (lockedToken !== undefined) return state;
    definitions = nextDefinitions;
    const old = currentWorkspace();
    const nextWorkspace = nextDefinitions.workspaces[nextDefinitions.activeWorkspaceId];
    const nextStrip = nextWorkspace?.strips[nextWorkspace.activeStripId];
    if (!nextWorkspace || !nextStrip) return publish(nextDefinitions);
    const oldByDestination = old ? new Map(Object.values(old.strip.tabs).map((tab) => [tab.destinationId, tab])) : new Map();
    const availableGroups = old?.strip.groups ?? nextStrip.groups;
    const tabs: Record<string, NavigationTab> = {};
    for (const tab of Object.values(nextStrip.tabs)) {
      const previous = oldByDestination.get(tab.destinationId);
      const preserved = previous && (previous.groupId === undefined || Boolean(availableGroups[previous.groupId])) ? previous : undefined;
      tabs[tab.id] = sameTargetTab(tab, preserved);
    }
    const desiredOrder = old?.strip.tabOrder
      .map((id) => old.strip.tabs[id]?.destinationId)
      .filter((id): id is string => typeof id === 'string' && Boolean(destinationMap(nextDefinitions).get(id))) ?? [];
    const tabOrder = [...new Set([...desiredOrder, ...nextStrip.tabOrder.map((id) => tabs[id]?.destinationId).filter((id): id is string => Boolean(id))])]
      .map((destinationId) => destinationMap(nextDefinitions).get(destinationId)?.id)
      .filter((id): id is string => typeof id === 'string');
    const activeDestination = old?.strip.tabs[old.strip.activeTabId ?? '']?.destinationId;
    const activeTabId = activeDestination && tabs[destinationMap(nextDefinitions).get(activeDestination)?.id ?? '']
      ? destinationMap(nextDefinitions).get(activeDestination)?.id
      : tabOrder[0];
    const liveStrip = old?.strip;
    const preservedGroups = liveStrip?.groups ?? nextStrip.groups;
    const preservedGroupOrder = liveStrip?.groupOrder.filter((id) => Boolean(preservedGroups[id])) ?? nextStrip.groupOrder;
    const mergedStrip = {
      ...nextStrip,
      ...(liveStrip ? { dock: liveStrip.dock, overflow: liveStrip.overflow } : {}),
      tabs,
      tabOrder,
      activeTabId,
      groups: preservedGroups,
      groupOrder: preservedGroupOrder,
    };
    const liveWorkspace = old?.workspace;
    const activeStripId = liveWorkspace && nextWorkspace.strips[liveWorkspace.activeStripId]
      ? liveWorkspace.activeStripId
      : nextWorkspace.activeStripId;
    const mergedWorkspace = {
      ...nextWorkspace,
      ...(liveWorkspace ? {
        label: liveWorkspace.label,
        windowId: liveWorkspace.windowId,
        activeStripId,
      } : { activeStripId }),
      strips: { ...nextWorkspace.strips, [mergedStrip.id]: mergedStrip },
    };
    const activeWorkspaceId = liveWorkspace && nextDefinitions.workspaces[liveWorkspace.id]
      ? liveWorkspace.id
      : nextDefinitions.activeWorkspaceId;
    return publish({
      ...nextDefinitions,
      activeWorkspaceId,
      workspaces: { ...nextDefinitions.workspaces, [mergedWorkspace.id]: mergedWorkspace },
      revision: Math.max(state.revision, nextDefinitions.revision) + 1,
    });
  };

  const syncGenerated = (snapshot: GeneratedNavigationSnapshot): NavigationState => {
    if (lockedToken !== undefined) return state;
    if (snapshot.expectedRevision !== undefined && snapshot.expectedRevision !== state.revision) return state;
    const current = currentWorkspace();
    if (!current) return state;
    const available = destinationMap(definitions);
    const requestedOrder = stringList(snapshot.tabs);
    const requestedPinned = new Set(stringList(snapshot.pinned) ?? []);
    const requestedGroups = groupList(snapshot.groups);
    const requestedDestinations = requestedOrder?.filter((id) => available.has(id)) ?? current.strip.tabOrder.map((id) => current.strip.tabs[id]?.destinationId).filter((id): id is string => Boolean(id));
    const tabs: Record<string, NavigationTab> = {};
    for (const destinationId of requestedDestinations) {
      const definition = available.get(destinationId);
      if (!definition) continue;
      const existing = current.strip.tabs[definition.id] ?? definition;
      tabs[definition.id] = { ...definition, ...existing, pinned: requestedPinned.has(destinationId) };
    }
    const groups: Record<string, TabGroupState> = {};
    const groupOrder: string[] = [];
    for (const [index, group] of requestedGroups.entries()) {
      const id = typeof group.id === 'string' ? group.id : `generated-group-${index + 1}`;
      const name = typeof group.name === 'string' && group.name.trim() ? group.name : id;
      groups[id] = {
        id,
        name,
        ...(typeof group.colour === 'string' ? { colour: group.colour } : {}),
        order: index,
        collapsed: group.collapsed === true || group.expanded === false,
        pinned: group.pinned === true,
      };
      groupOrder.push(id);
      for (const destinationId of stringList(group.tabs) ?? []) {
        const definition = available.get(destinationId);
        if (definition && tabs[definition.id]) tabs[definition.id] = { ...tabs[definition.id]!, groupId: id };
      }
    }
    const activeDestination = typeof snapshot.screen === 'string' ? snapshot.screen : undefined;
    const activeTabId = activeDestination && tabs[available.get(activeDestination)?.id ?? '']
      ? available.get(activeDestination)?.id
      : current.strip.activeTabId && tabs[current.strip.activeTabId] ? current.strip.activeTabId : Object.keys(tabs)[0];
    const activeTab = activeTabId ? tabs[activeTabId] : undefined;
    const nextWorkspace = {
      ...current.workspace,
      ...(typeof snapshot.railId === 'string' ? { railId: snapshot.railId } : activeTab?.railId ? { railId: activeTab.railId } : {}),
      strips: {
        ...current.workspace.strips,
        [current.strip.id]: {
          ...current.strip,
          tabs,
          tabOrder: Object.keys(tabs),
          activeTabId,
          groups,
          groupOrder,
        },
      },
    };
    return publish({ ...state, workspaces: { ...state.workspaces, [current.workspace.id]: nextWorkspace }, revision: state.revision + 1 });
  };

  const activateDestination = (destinationId: string): NavigationState | undefined => {
    const current = currentWorkspace();
    const definition = destinationMap(definitions).get(destinationId);
    if (!current || !definition) return undefined;
    const existing = current.strip.tabs[definition.id] ?? definition;
    const tabs = { ...current.strip.tabs, [definition.id]: existing };
    const tabOrder = current.strip.tabOrder.includes(definition.id) ? [...current.strip.tabOrder] : [...current.strip.tabOrder, definition.id];
    const strip = { ...current.strip, tabs, tabOrder, activeTabId: definition.id };
    const workspace = { ...current.workspace, ...(definition.railId ? { railId: definition.railId } : {}), strips: { ...current.workspace.strips, [strip.id]: strip } };
    return publish({ ...state, workspaces: { ...state.workspaces, [workspace.id]: workspace }, revision: state.revision + 1 });
  };

  const activateTarget = (target: TeleportTarget): NavigationState | undefined => {
    const definition = destinationMap(definitions).get(target.destinationId);
    if (!definition || definition.id !== target.tabId || definition.pageId !== target.pageId || !definition.teleportElementIds.includes(target.elementId)) return undefined;
    return activateDestination(target.destinationId);
  };

  return {
    getState: () => state,
    beginTransaction,
    endTransaction,
    restore,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    replaceDefinitionState,
    syncGenerated,
    activateDestination,
    activateTarget,
  };
}
