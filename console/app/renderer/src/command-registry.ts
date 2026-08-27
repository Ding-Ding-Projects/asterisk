/** Handler-backed commands and exact destination/control teleport contracts. */

export type PaletteEntryKind = 'command' | 'destination' | 'setting' | 'control';
export type RichControlKind = 'switch' | 'checkbox' | 'text' | 'number' | 'stepper' | 'slider' | 'select' | 'colour' | 'action';

export interface TeleportTarget {
  readonly destinationId: string;
  readonly windowId: string;
  readonly workspaceId: string;
  readonly stripId: string;
  readonly tabId: string;
  readonly pageId: string;
  readonly elementId: string;
  readonly focusElementId: string;
  readonly highlightElementId: string;
  readonly groupId?: string;
}

export interface RichControlDescriptor {
  readonly kind: RichControlKind;
  readonly controlId: string;
  readonly label: string;
  readonly handlerId: string;
  readonly valueReaderId: string;
  readonly optionsProviderId?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly step?: number;
}

export interface CommandDefinition {
  readonly id: string;
  readonly kind: PaletteEntryKind;
  readonly label: string;
  readonly description: string;
  readonly keywords: ReadonlyArray<string>;
  readonly handlerId: string;
  readonly target: TeleportTarget;
  readonly requiredCapabilities?: ReadonlyArray<string>;
  readonly control?: RichControlDescriptor;
  readonly shortcut?: string;
}

export interface DestinationCapabilities {
  readonly destinationId: string;
  readonly capabilities: ReadonlySet<string>;
}

export interface CommandContext {
  readonly commandId: string;
  readonly target: TeleportTarget;
  readonly control?: RichControlDescriptor;
  readonly value?: unknown;
}

export type CommandHandler = (context: CommandContext) => void | Promise<void>;
export type CommandHandlerMap = Readonly<Record<string, CommandHandler>>;
export type ValueReader = () => unknown;
export type ValueReaderMap = Readonly<Record<string, ValueReader>>;
export type OptionsProvider = () => ReadonlyArray<{ readonly value: string; readonly label: string }>;
export type OptionsProviderMap = Readonly<Record<string, OptionsProvider>>;

export interface RegisteredCommand extends CommandDefinition {
  readonly enabled: boolean;
  readonly unavailableReason?: string;
}

export interface CommandRegistry {
  readonly entries: ReadonlyArray<RegisteredCommand>;
  readonly handlers: CommandHandlerMap;
  readonly valueReaders: ValueReaderMap;
  readonly optionsProviders: OptionsProviderMap;
  readonly byId: ReadonlyMap<string, RegisteredCommand>;
}

const ID = /^[A-Za-z][A-Za-z0-9._:-]{0,191}$/u;

function assertId(value: string, name: string): void {
  if (!ID.test(value)) throw new Error(`${name} must be a stable non-empty identifier.`);
}

export function validateTeleportTarget(target: TeleportTarget): void {
  assertId(target.destinationId, 'destinationId');
  assertId(target.windowId, 'windowId');
  assertId(target.workspaceId, 'workspaceId');
  assertId(target.stripId, 'stripId');
  assertId(target.tabId, 'tabId');
  assertId(target.pageId, 'pageId');
  assertId(target.elementId, 'elementId');
  assertId(target.focusElementId, 'focusElementId');
  assertId(target.highlightElementId, 'highlightElementId');
  if (target.groupId !== undefined) assertId(target.groupId, 'groupId');
}

function validateControl(
  control: RichControlDescriptor,
  handlers: CommandHandlerMap,
  readers: ValueReaderMap,
  optionsProviders: OptionsProviderMap,
): void {
  assertId(control.controlId, 'controlId');
  assertId(control.handlerId, 'control handlerId');
  assertId(control.valueReaderId, 'valueReaderId');
  if (!handlers[control.handlerId]) {
    throw new Error(`Rich control ${control.controlId} has no registered handler ${control.handlerId}.`);
  }
  if (!readers[control.valueReaderId]) {
    throw new Error(`Rich control ${control.controlId} has no registered value reader ${control.valueReaderId}.`);
  }
  if (control.optionsProviderId !== undefined) {
    assertId(control.optionsProviderId, 'optionsProviderId');
    if (!optionsProviders[control.optionsProviderId]) {
      throw new Error(`Rich control ${control.controlId} has no options provider ${control.optionsProviderId}.`);
    }
  }
  if (control.kind === 'select' && control.optionsProviderId === undefined) {
    throw new Error(`Select control ${control.controlId} requires an options provider.`);
  }
  if (control.minimum !== undefined && control.maximum !== undefined && control.minimum > control.maximum) {
    throw new Error(`Rich control ${control.controlId} has an inverted numeric range.`);
  }
  if (control.step !== undefined && (!Number.isFinite(control.step) || control.step <= 0)) {
    throw new Error(`Rich control ${control.controlId} must use a positive finite step.`);
  }
}

/**
 * A command is not registrable unless its action handler and exact teleport
 * target exist. Capability gaps are represented as disabled entries, while a
 * missing handler is a programming error and never a decorative palette row.
 */
export function createCommandRegistry(
  definitions: ReadonlyArray<CommandDefinition>,
  handlers: CommandHandlerMap,
  valueReaders: ValueReaderMap,
  optionsProviders: OptionsProviderMap,
  destinationCapabilities: ReadonlyArray<DestinationCapabilities>,
): CommandRegistry {
  const capabilityMap = new Map(destinationCapabilities.map((item) => [item.destinationId, item.capabilities]));
  const ids = new Set<string>();
  const entries: RegisteredCommand[] = [];

  for (const definition of definitions) {
    assertId(definition.id, 'command id');
    assertId(definition.handlerId, 'handlerId');
    validateTeleportTarget(definition.target);
    if (ids.has(definition.id)) throw new Error(`Duplicate command id: ${definition.id}`);
    ids.add(definition.id);
    if (!handlers[definition.handlerId]) {
      throw new Error(`Command ${definition.id} has no registered handler ${definition.handlerId}.`);
    }
    if (definition.control) {
      validateControl(definition.control, handlers, valueReaders, optionsProviders);
      if (definition.control.handlerId !== definition.handlerId) {
        throw new Error(`Command ${definition.id} and rich control ${definition.control.controlId} must share one action handler.`);
      }
    }

    const provided = capabilityMap.get(definition.target.destinationId);
    const required = definition.requiredCapabilities ?? [];
    const missing = provided ? required.filter((capability) => !provided.has(capability)) : required;
    entries.push({
      ...definition,
      enabled: missing.length === 0,
      ...(missing.length > 0
        ? { unavailableReason: `Destination ${definition.target.destinationId} does not provide: ${missing.join(', ')}.` }
        : {}),
    });
  }

  return {
    entries,
    handlers,
    valueReaders,
    optionsProviders,
    byId: new Map(entries.map((entry) => [entry.id, entry])),
  };
}

export type ExecuteCommandResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export async function executeCommand(registry: CommandRegistry, commandId: string): Promise<ExecuteCommandResult> {
  const command = registry.byId.get(commandId);
  if (!command) return { ok: false, reason: `Unknown command: ${commandId}` };
  if (!command.enabled) return { ok: false, reason: command.unavailableReason ?? 'Command is unavailable.' };
  const handler = registry.handlers[command.handlerId];
  if (!handler) return { ok: false, reason: `Command handler disappeared: ${command.handlerId}` };
  await handler({ commandId: command.id, target: command.target, control: command.control });
  return { ok: true };
}

export function readControlValue(registry: CommandRegistry, commandId: string): unknown {
  const command = registry.byId.get(commandId);
  if (!command?.control) return undefined;
  return registry.valueReaders[command.control.valueReaderId]?.();
}

export function readControlOptions(
  registry: CommandRegistry,
  commandId: string,
): ReadonlyArray<{ readonly value: string; readonly label: string }> {
  const providerId = registry.byId.get(commandId)?.control?.optionsProviderId;
  return providerId ? registry.optionsProviders[providerId]?.() ?? [] : [];
}

export async function executeRichControl(
  registry: CommandRegistry,
  commandId: string,
  value: unknown,
): Promise<ExecuteCommandResult> {
  const command = registry.byId.get(commandId);
  if (!command?.control) return { ok: false, reason: `Command ${commandId} is not a rich control.` };
  if (!command.enabled) return { ok: false, reason: command.unavailableReason ?? 'Control is unavailable.' };
  const handler = registry.handlers[command.control.handlerId];
  if (!handler) return { ok: false, reason: `Control handler disappeared: ${command.control.handlerId}` };
  await handler({ commandId, target: command.target, control: command.control, value });
  return { ok: true };
}
