/** Searchable command-palette index with rich controls and exact teleport proof. */

import {
  executeCommand,
  readControlValue,
  readControlOptions,
  type CommandRegistry,
  type RegisteredCommand,
  type TeleportTarget,
} from './command-registry';
import type { NavigationState, PaletteSize } from './navigation-state';
import { searchCollection, type SearchFieldState } from './search-state';

export interface PaletteIndexEntry {
  readonly command: RegisteredCommand;
  readonly searchText: string;
}

export interface PaletteIndex {
  readonly entries: ReadonlyArray<PaletteIndexEntry>;
  readonly byId: ReadonlyMap<string, PaletteIndexEntry>;
}

export interface PaletteResultRow {
  readonly id: string;
  readonly kind: RegisteredCommand['kind'];
  readonly label: string;
  readonly description: string;
  readonly shortcut?: string;
  readonly enabled: boolean;
  readonly unavailableReason?: string;
  readonly target: TeleportTarget;
  readonly control?: RegisteredCommand['control'];
  readonly currentValue?: unknown;
  readonly options?: ReadonlyArray<{ readonly value: string; readonly label: string }>;
}

export interface PaletteSearchResult {
  readonly rows: ReadonlyArray<PaletteResultRow>;
  readonly search: SearchFieldState;
  readonly size: PaletteSize;
  readonly error?: string;
}

export function buildPaletteIndex(registry: CommandRegistry): PaletteIndex {
  const entries = registry.entries.map((command) => ({
    command,
    searchText: [
      command.label,
      command.description,
      command.kind,
      command.id,
      command.target.destinationId,
      command.target.pageId,
      command.target.elementId,
      ...command.keywords,
    ].join('\n'),
  }));
  return { entries, byId: new Map(entries.map((entry) => [entry.command.id, entry])) };
}

export function searchPalette(
  index: PaletteIndex,
  registry: CommandRegistry,
  navigation: NavigationState,
  search: SearchFieldState,
): PaletteSearchResult {
  if (search.identity.kind !== 'palette') throw new Error('Palette search requires its own palette field.');
  if (search.identity.fieldId !== navigation.palette.searchFieldId) {
    throw new Error('Palette search field does not match the persisted palette state.');
  }
  const result = searchCollection(search, index.entries, (entry) => entry.searchText);
  const rows = result.matches.map(({ command }) => {
    const target = resolveTeleportTarget(navigation, command.target);
    const enabled = command.enabled && target.ok;
    const unavailableReason = command.unavailableReason ?? (target.ok ? undefined : target.reason);
    return {
      id: command.id,
      kind: command.kind,
      label: command.label,
      description: command.description,
      shortcut: command.shortcut,
      enabled,
      unavailableReason,
      target: command.target,
      control: command.control,
      currentValue: command.control ? readControlValue(registry, command.id) : undefined,
      options: command.control?.optionsProviderId ? readControlOptions(registry, command.id) : undefined,
    } satisfies PaletteResultRow;
  });
  return { rows, search: result.field, size: navigation.palette.size, error: result.error };
}

export type TeleportResolution =
  | { readonly ok: true; readonly target: TeleportTarget }
  | { readonly ok: false; readonly reason: string };

/**
 * Verify every teleport segment against the current navigation state. A stale
 * target is disabled, never downgraded to a destination-only jump.
 */
export function resolveTeleportTarget(state: NavigationState, target: TeleportTarget): TeleportResolution {
  const workspace = state.workspaces[target.workspaceId];
  if (!workspace) return { ok: false, reason: `Workspace no longer exists: ${target.workspaceId}` };
  if (workspace.windowId !== target.windowId) return { ok: false, reason: `Window no longer owns workspace ${target.workspaceId}.` };
  const strip = workspace.strips[target.stripId];
  if (!strip) return { ok: false, reason: `Tab strip no longer exists: ${target.stripId}` };
  const tab = strip.tabs[target.tabId];
  if (!tab) return { ok: false, reason: `Tab no longer exists: ${target.tabId}` };
  if (tab.destinationId !== target.destinationId) return { ok: false, reason: `Tab ${target.tabId} now points to another destination.` };
  if (tab.pageId !== target.pageId) return { ok: false, reason: `Tab ${target.tabId} now points to another page.` };
  for (const elementId of [target.elementId, target.focusElementId, target.highlightElementId]) {
    if (!tab.teleportElementIds.includes(elementId)) {
      return { ok: false, reason: `Tab ${target.tabId} no longer registers teleport element ${elementId}.` };
    }
  }
  if (target.groupId !== undefined && tab.groupId !== target.groupId) {
    return { ok: false, reason: `Tab ${target.tabId} is no longer in group ${target.groupId}.` };
  }
  return { ok: true, target };
}

export interface TeleportInstruction {
  readonly windowId: string;
  readonly workspaceId: string;
  readonly stripId: string;
  readonly groupId?: string;
  readonly tabId: string;
  readonly pageId: string;
  readonly elementId: string;
  readonly focusElementId: string;
  readonly highlightElementId: string;
  readonly revealCollapsedGroup: boolean;
}

export function createTeleportInstruction(state: NavigationState, target: TeleportTarget): TeleportInstruction | undefined {
  const resolution = resolveTeleportTarget(state, target);
  if (!resolution.ok) return undefined;
  const workspace = state.workspaces[target.workspaceId]!;
  const strip = workspace.strips[target.stripId]!;
  const group = target.groupId ? strip.groups[target.groupId] : undefined;
  return {
    windowId: target.windowId,
    workspaceId: target.workspaceId,
    stripId: target.stripId,
    groupId: target.groupId,
    tabId: target.tabId,
    pageId: target.pageId,
    elementId: target.elementId,
    focusElementId: target.focusElementId,
    highlightElementId: target.highlightElementId,
    revealCollapsedGroup: group?.collapsed ?? false,
  };
}

export async function activatePaletteRow(
  registry: CommandRegistry,
  state: NavigationState,
  commandId: string,
): Promise<{ readonly ok: true; readonly teleport: TeleportInstruction } | { readonly ok: false; readonly reason: string }> {
  const command = registry.byId.get(commandId);
  if (!command) return { ok: false, reason: `Unknown palette command: ${commandId}` };
  const teleport = createTeleportInstruction(state, command.target);
  if (!teleport) return { ok: false, reason: 'The palette target changed and cannot be focused exactly.' };
  const execution = await executeCommand(registry, commandId);
  return execution.ok ? { ok: true, teleport } : execution;
}
