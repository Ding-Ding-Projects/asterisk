import { APPEARANCE_PROPERTIES, type AppearanceProperty } from './appearance-schema';
import { createCommandRegistry, type CommandDefinition, type CommandRegistry, type CommandHandlerMap, type OptionsProviderMap, type ValueReaderMap } from './command-registry';
import { ORDER, SCREENS } from './generated/console';

export interface RichControlMountOptions {
  readonly readControlValue: (controlId: string) => unknown;
  readonly writeControlValue: (controlId: string, value: unknown) => void;
  readonly openDestination: (destinationId: string) => void;
  readonly readAppearanceValue: (property: AppearanceProperty) => unknown;
  readonly writeAppearanceValue: (property: AppearanceProperty, value: unknown) => void;
}

export interface RichControlRegistration {
  readonly registry: CommandRegistry;
  readonly definitions: ReadonlyArray<CommandDefinition>;
  readonly settingControlIds: ReadonlyArray<string>;
  readonly appearanceControlIds: ReadonlyArray<string>;
}

type DesignControl = {
  id?: unknown;
  label?: unknown;
  kind?: unknown;
  value?: unknown;
  options?: unknown;
  min?: unknown;
  max?: unknown;
  step?: unknown;
  action?: unknown;
};

type DesignScreen = { title?: unknown; groups?: unknown };

function idPart(value: string): string {
  return value.replace(/[^A-Za-z0-9._:-]/gu, '-').slice(0, 150);
}

function target(destinationId: string, elementId: string) {
  const safeDestination = idPart(destinationId);
  const safeElement = idPart(elementId);
  return {
    destinationId: safeDestination,
    windowId: 'main-window',
    workspaceId: 'console-workspace',
    stripId: 'console-strip',
    tabId: `tab:${safeDestination}`,
    pageId: `page:${safeDestination}`,
    elementId: safeElement,
    focusElementId: safeElement,
    highlightElementId: safeElement,
  } as const;
}

function richKind(control: DesignControl): 'switch' | 'checkbox' | 'text' | 'number' | 'stepper' | 'slider' | 'select' | 'colour' | 'action' | undefined {
  const kind = String(control.kind ?? '');
  if (kind === 'switch') return 'switch';
  if (kind === 'stepper') return 'stepper';
  if (kind === 'slider') return 'slider';
  if (kind === 'select' || kind === 'segmented' || kind === 'chips') return 'select';
  if (kind === 'text' && typeof control.action !== 'string') return 'text';
  if (kind === 'number') return 'number';
  return undefined;
}

function optionsFor(control: DesignControl): ReadonlyArray<{ readonly value: string; readonly label: string }> {
  if (!Array.isArray(control.options)) return [];
  return control.options
    .filter((value): value is string => typeof value === 'string')
    .map((value) => ({ value, label: value }));
}

function groupsFor(screen: DesignScreen): DesignControl[] {
  if (!Array.isArray(screen.groups)) return [];
  return screen.groups.flatMap((group) => {
    if (!group || typeof group !== 'object') return [];
    const controls = (group as { ctls?: unknown }).ctls;
    return Array.isArray(controls) ? controls.filter((control): control is DesignControl => Boolean(control && typeof control === 'object')) : [];
  });
}

function definitionForDestination(destinationId: string, screen: DesignScreen, handlers: Record<string, (context: { value?: unknown }) => void | Promise<void>>): CommandDefinition {
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
    target: target(destinationId, `destination:${destinationId}`),
  };
}

export function createRichControlRegistration(options: RichControlMountOptions): RichControlRegistration {
  const handlers: Record<string, (context: { value?: unknown }) => void | Promise<void>> = {};
  const readers: Record<string, () => unknown> = {};
  const providers: OptionsProviderMap = {};
  const definitions: CommandDefinition[] = [];
  const settingControlIds: string[] = [];
  const appearanceControlIds: string[] = [];

  for (const destinationId of ORDER as ReadonlyArray<string>) {
    const screen = (SCREENS as unknown as Record<string, DesignScreen>)[destinationId] ?? {};
    const destination = definitionForDestination(destinationId, screen, handlers);
    const openHandler = `open.${idPart(destinationId)}`;
    handlers[openHandler] = () => options.openDestination(destinationId);
    definitions.push(destination);

    for (const control of groupsFor(screen)) {
      const controlId = typeof control.id === 'string' ? control.id : '';
      if (!controlId || typeof control.action === 'string') continue;
      const kind = richKind(control);
      if (!kind) continue;
      const controlOptions = optionsFor(control);
      if (kind === 'select' && controlOptions.length === 0) continue;
      const commandId = `setting.${idPart(destinationId)}.${idPart(controlId)}`;
      const handlerId = `set.${idPart(destinationId)}.${idPart(controlId)}`;
      const readerId = `read.${idPart(destinationId)}.${idPart(controlId)}`;
      const providerId = controlOptions.length > 0 ? `options.${idPart(destinationId)}.${idPart(controlId)}` : undefined;
      handlers[handlerId] = ({ value }) => options.writeControlValue(controlId, value);
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
        target: target(destinationId, `control:${destinationId}:${controlId}`),
        control: {
          kind,
          controlId: `control:${destinationId}:${controlId}`,
          label: typeof control.label === 'string' ? control.label : controlId,
          handlerId,
          valueReaderId: readerId,
          ...(providerId ? { optionsProviderId: providerId } : {}),
          ...(typeof control.min === 'number' ? { minimum: control.min } : {}),
          ...(typeof control.max === 'number' ? { maximum: control.max } : {}),
          ...(typeof control.step === 'number' ? { step: control.step } : {}),
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
      target: target('appearance', `appearance:${property}`),
      control: {
        kind,
        controlId: `appearance:${property}`,
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
    [...(ORDER as ReadonlyArray<string>)].map((destinationId) => ({ destinationId, capabilities: new Set<string>(['settings', 'appearance', 'palette']) })),
  );
  return { registry, definitions, settingControlIds, appearanceControlIds };
}
