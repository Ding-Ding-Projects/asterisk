import { APPEARANCE_PROPERTIES, type AppearanceProperty } from './appearance-schema';
import { createCommandRegistry, type CommandDefinition, type CommandRegistry, type CommandHandlerMap, type OptionsProviderMap, type ValueReaderMap } from './command-registry';
import { ORDER, SCREENS } from './generated/console';
import { createEmptyStrip, createNavigationState, createWorkspace, type NavigationState, type NavigationTab } from './navigation-state';
import { createSearchField, createSearchFieldIdentity, createSearchStateMap, type SearchFieldKind } from './search-state';

export interface RichControlMountOptions {
  readonly readControlValue: (controlId: string) => unknown;
  readonly writeControlValue: (controlId: string, value: unknown) => void;
  readonly openDestination: (destinationId: string) => void;
  readonly readAppearanceValue: (property: AppearanceProperty) => unknown;
  readonly writeAppearanceValue: (property: AppearanceProperty, value: unknown) => void;
  readonly executeControlAction?: (controlId: string, action: string) => void;
  readonly runtimeControls?: Readonly<Record<string, ReadonlyArray<RichControlInput>>>;
}

export interface RichControlRegistration {
  readonly registry: CommandRegistry;
  readonly navigationState: NavigationState;
  readonly definitions: ReadonlyArray<CommandDefinition>;
  readonly settingControlIds: ReadonlyArray<string>;
  readonly appearanceControlIds: ReadonlyArray<string>;
  readonly defects: ReadonlyArray<string>;
}

export type RichControlInput = {
  id?: unknown;
  label?: unknown;
  kind?: unknown;
  value?: unknown;
  options?: unknown;
  min?: unknown;
  max?: unknown;
  step?: unknown;
  action?: unknown;
  accept?: unknown;
};

type DesignScreen = { title?: unknown; groups?: unknown };

function idPart(value: string): string {
  return value.replace(/[^A-Za-z0-9._:-]/gu, '-').slice(0, 150);
}

export function controlAppearanceId(controlId: string): string {
  return `control-${controlId}`;
}

export function tabAppearanceId(destinationId: string): string {
  return `tab-${idPart(destinationId)}`;
}

function canonicalNavigationState(runtimeControls: Readonly<Record<string, ReadonlyArray<RichControlInput>>> = {}): NavigationState {
  const tabs: Record<string, NavigationTab> = {};
  const destinationIds = [...new Set([...(ORDER as ReadonlyArray<string>), ...Object.keys(runtimeControls)])];
  for (const destinationId of destinationIds) {
    const screen = (SCREENS as unknown as Record<string, DesignScreen>)[destinationId] ?? {};
    const seenControlIds = new Set<string>();
    const controlIds = [...groupsFor(screen), ...(runtimeControls[destinationId] ?? [])].flatMap((control) => {
      if (typeof control.id !== 'string' || seenControlIds.has(control.id)) return [];
      seenControlIds.add(control.id);
      return [controlAppearanceId(control.id)];
    });
    if (destinationId === 'appearance') controlIds.push(...APPEARANCE_PROPERTIES.map((property) => controlAppearanceId(`appearance:${property}`)));
    const tabId = `tab:${idPart(destinationId)}`;
    tabs[tabId] = {
      id: tabId,
      label: typeof screen.title === 'string' ? screen.title : destinationId,
      destinationId,
      pageId: `page:${idPart(destinationId)}`,
      elementId: tabAppearanceId(destinationId),
      teleportElementIds: [tabAppearanceId(destinationId), ...controlIds],
      pinned: false,
      dirty: false,
      locked: false,
      closable: true,
      capabilities: ['settings', 'appearance', 'palette'],
    };
  }
  const baseStrip = createEmptyStrip('console-strip');
  const strip = { ...baseStrip, tabOrder: Object.keys(tabs), activeTabId: Object.keys(tabs)[0], tabs };
  const baseWorkspace = createWorkspace('console-workspace', 'Console', 'main-window', 'console-strip');
  const workspace = { ...baseWorkspace, strips: { 'console-strip': strip } };
  const searchFields = ['strip', 'group-names', 'master', 'palette'].map((kind) => {
    const fieldId = `navigation-${kind}`;
    const searchKind: SearchFieldKind = kind === 'strip' ? 'strip-tabs' : kind === 'group-names' ? 'group-names' : kind === 'master' ? 'master-tabs' : 'palette';
    const identity = createSearchFieldIdentity({ fieldId, kind: searchKind, surfaceId: 'console-workspace', anchorElementId: `${fieldId}-field` });
    return createSearchField(identity);
  });
  return createNavigationState([workspace], createSearchStateMap(searchFields), 'navigation-palette');
}

export const CANONICAL_NAVIGATION_STATE = canonicalNavigationState();

function target(destinationId: string, elementId: string, navigationState: NavigationState) {
  const safeDestination = idPart(destinationId);
  const safeElement = idPart(elementId);
  const workspace = navigationState.workspaces.console-workspace!;
  const strip = workspace.strips['console-strip']!;
  const tab = strip.tabs[`tab:${safeDestination}`];
  if (!tab || !tab.teleportElementIds.includes(safeElement)) throw new Error(`No canonical navigation target exists for ${safeDestination}:${safeElement}.`);
  return {
    destinationId: tab.destinationId,
    windowId: workspace.windowId,
    workspaceId: workspace.id,
    stripId: strip.id,
    tabId: tab.id,
    pageId: tab.pageId,
    elementId: safeElement,
    focusElementId: safeElement,
    highlightElementId: safeElement,
  } as const;
}

function richKind(control: RichControlInput): 'switch' | 'checkbox' | 'text' | 'number' | 'stepper' | 'slider' | 'select' | 'colour' | 'order' | 'file' | 'action' | undefined {
  const kind = String(control.kind ?? '');
  if (typeof control.action === 'string') return 'action';
  if (kind === 'switch') return 'switch';
  if (kind === 'stepper') return 'stepper';
  if (kind === 'slider') return 'slider';
  if (kind === 'select' || kind === 'segmented' || kind === 'chips') return 'select';
  if (kind === 'text' && typeof control.action !== 'string') return 'text';
  if (kind === 'number') return 'number';
  if (kind === 'order') return 'order';
  if (kind === 'file') return 'file';
  return undefined;
}

function optionsFor(control: RichControlInput): ReadonlyArray<{ readonly value: string; readonly label: string }> {
  if (!Array.isArray(control.options)) return [];
  return control.options
    .filter((value): value is string => typeof value === 'string')
    .map((value) => ({ value, label: value }));
}

function groupsFor(screen: DesignScreen): RichControlInput[] {
  if (!Array.isArray(screen.groups)) return [];
  return screen.groups.flatMap((group) => {
    if (!group || typeof group !== 'object') return [];
    const controls = (group as { ctls?: unknown }).ctls;
    return Array.isArray(controls) ? controls.filter((control): control is RichControlInput => Boolean(control && typeof control === 'object')) : [];
  });
}

function definitionForDestination(destinationId: string, screen: DesignScreen, handlers: Record<string, (context: { value?: unknown }) => void | Promise<void>>, navigationState: NavigationState): CommandDefinition {
  const id = `destination.${idPart(destinationId)}`;
  const handlerId = `open.${idPart(destinationId)}`;
  handlers[handlerId] = () => undefined;
  return {
    id,
    kind: 'destination',
    label: typeof screen.title === 'string' ? screen.title : destinationId,
    description: `Open ${typeof screen.title === 'string' ? screen.title : destinationId}.`,
    keywords: [destinationId],
    handlerId,
    target: target(destinationId, tabAppearanceId(destinationId), navigationState),
  };
}

export function createRichControlRegistration(options: RichControlMountOptions): RichControlRegistration {
  const handlers: Record<string, (context: { value?: unknown }) => void | Promise<void>> = {};
  const readers: Record<string, () => unknown> = {};
  const providers: OptionsProviderMap = {};
  const definitions: CommandDefinition[] = [];
  const settingControlIds: string[] = [];
  const appearanceControlIds: string[] = [];
  const defects: string[] = [];
  const navigationState = canonicalNavigationState(options.runtimeControls);
  const destinationIds = [...new Set([...(ORDER as ReadonlyArray<string>), ...Object.keys(options.runtimeControls ?? {})])];

  for (const destinationId of destinationIds) {
    const screen = (SCREENS as unknown as Record<string, DesignScreen>)[destinationId] ?? {};
    const destination = definitionForDestination(destinationId, screen, handlers, navigationState);
    const openHandler = `open.${idPart(destinationId)}`;
    handlers[openHandler] = () => options.openDestination(destinationId);
    definitions.push(destination);

    const seenControlIds = new Set<string>();
    const controls = [...groupsFor(screen), ...(options.runtimeControls?.[destinationId] ?? [])].filter((control) => {
      if (typeof control.id !== 'string') return true;
      if (seenControlIds.has(control.id)) {
        defects.push(`Control collision at destination ${destinationId}, control ${control.id}.`);
        return false;
      }
      seenControlIds.add(control.id);
      return true;
    });
    for (const control of controls) {
      const controlId = typeof control.id === 'string' ? control.id : '';
      if (!controlId) continue;
      const kind = richKind(control);
      if (!kind) continue;
      const controlOptions = optionsFor(control);
      if (kind === 'select' && controlOptions.length === 0) continue;
      const commandId = `setting.${idPart(destinationId)}.${idPart(controlId)}`;
      const handlerId = `set.${idPart(destinationId)}.${idPart(controlId)}`;
      const readerId = `read.${idPart(destinationId)}.${idPart(controlId)}`;
      const providerId = controlOptions.length > 0 ? `options.${idPart(destinationId)}.${idPart(controlId)}` : undefined;
      let controlTarget: ReturnType<typeof target>;
      try { controlTarget = target(destinationId, controlAppearanceId(controlId), navigationState); }
      catch { defects.push(`Prepared control ${destinationId}:${controlId} has no canonical navigation target.`); continue; }
      handlers[handlerId] = ({ value }) => {
        if (kind === 'action' && typeof control.action === 'string') {
          options.executeControlAction?.(controlAppearanceId(controlId), control.action);
          return;
        }
        options.writeControlValue(controlId, value);
      };
      readers[readerId] = () => options.readControlValue(controlId);
      if (providerId) providers[providerId] = () => controlOptions;
      settingControlIds.push(controlId);
      definitions.push({
        id: commandId,
        kind: 'setting',
        label: typeof control.label === 'string' ? control.label : controlId,
        description: `Change ${typeof control.label === 'string' ? control.label : controlId}.`,
        keywords: [destinationId, controlId],
        handlerId,
        target: controlTarget,
        control: {
          kind,
          controlId: controlAppearanceId(controlId),
          sourceControlId: controlId,
          label: typeof control.label === 'string' ? control.label : controlId,
          handlerId,
          valueReaderId: readerId,
          ...(providerId ? { optionsProviderId: providerId } : {}),
          ...(typeof control.min === 'number' ? { minimum: control.min } : {}),
          ...(typeof control.max === 'number' ? { maximum: control.max } : {}),
          ...(typeof control.step === 'number' ? { step: control.step } : {}),
          ...(typeof control.accept === 'string' ? { accept: control.accept } : {}),
        },
      });
    }
  }

  for (const property of APPEARANCE_PROPERTIES) {
    const propertyId = idPart(property);
    const commandId = `appearance.${propertyId}`;
    const handlerId = `appearance.set.${propertyId}`;
    const readerId = `appearance.read.${propertyId}`;
    const kind = property === 'colour' || property === 'background' || property === 'highlight' || property === 'borderColour' || property === 'underlineColour'
      ? 'colour'
      : property === 'fontSize' || property === 'fontWeight' || property === 'letterSpacing' || property === 'wordSpacing' || property === 'lineHeight' || property === 'baselineShift' || property === 'radius' || property === 'borderWidth' || property === 'padding' || property === 'gap' || property === 'elevation' || property === 'opacity'
        ? 'number'
        : 'text';
    handlers[handlerId] = ({ value }) => options.writeAppearanceValue(property, value);
    readers[readerId] = () => options.readAppearanceValue(property);
    appearanceControlIds.push(property);
    definitions.push({
      id: commandId,
      kind: 'control',
      label: `Appearance ${property}`,
      description: `Edit ${property} in the mounted appearance editor.`,
      keywords: ['appearance', property],
      handlerId,
        target: target('appearance', controlAppearanceId(`appearance:${property}`), navigationState),
      control: {
        kind,
        controlId: controlAppearanceId(`appearance:${property}`),
        sourceControlId: `appearance:${property}`,
        label: `Appearance ${property}`,
        handlerId,
        valueReaderId: readerId,
      },
    });
  }

  const registry = createCommandRegistry(
    definitions,
    handlers as CommandHandlerMap,
    readers as ValueReaderMap,
    providers,
    destinationIds.map((destinationId) => ({ destinationId, capabilities: new Set<string>(['settings', 'appearance', 'palette']) })),
  );
  return { registry, navigationState, definitions, settingControlIds, appearanceControlIds, defects };
}
