import type { HostCapabilityDescriptor } from '../../../shared/configuration-resources';
import type { ConfigReading } from './configuration';

export type ControlProvenanceState =
  | 'read'
  | 'missing'
  | 'unparseable'
  | 'unmapped'
  | 'local-draft'
  | 'applied'
  | 'unavailable';

export interface ControlBindingContract {
  readonly control: string;
  readonly resource: string;
  readonly section: string;
  readonly key: string;
  readonly parser: string;
  readonly writerCapability: HostCapabilityDescriptor;
}

export interface ControlDraft {
  readonly value: unknown;
  readonly updatedAt: string;
}

export interface AppliedControlValue {
  readonly value: unknown;
  readonly appliedAt: string;
}

export interface ControlProvenance {
  readonly control: string;
  readonly resource?: string;
  readonly section?: string;
  readonly key?: string;
  readonly parser?: string;
  readonly writerCapability: HostCapabilityDescriptor;
  readonly state: ControlProvenanceState;
  readonly value?: unknown;
  readonly rawValue?: string;
  readonly observedAt?: string;
  readonly lastAttemptAt?: string;
  readonly lastSuccessAt?: string;
  readonly draftedAt?: string;
  readonly staleReason?: string;
  readonly disabledReason?: string;
}

export interface BuildControlProvenanceOptions<TBinding extends ControlBindingContract> {
  readonly controls: ReadonlyArray<string>;
  readonly bindings: ReadonlyArray<TBinding>;
  readonly readings: ReadonlyArray<ConfigReading>;
  readonly drafts?: Readonly<Record<string, ControlDraft>>;
  readonly applied?: Readonly<Record<string, AppliedControlValue>>;
  readonly parse: (binding: TBinding, raw: string) => unknown;
}

const NO_WRITER: HostCapabilityDescriptor = {
  state: 'unavailable',
  reason: 'This control has no exact resource, section, and key binding.',
};

function disabledReasonFor(
  state: ControlProvenanceState,
  writer: HostCapabilityDescriptor,
  readingReason?: string,
): string | undefined {
  if (state === 'unmapped') return 'This control has no exact target binding.';
  if (writer.state === 'unavailable') return writer.reason;
  if (state === 'unparseable') return 'The target value cannot be parsed safely, so writing is disabled.';
  if (state === 'unavailable') return readingReason ?? 'The target resource is unavailable.';
  return undefined;
}

/**
 * Builds one provenance record for every declared control. A control without a target
 * observation receives no value, which prevents the compiled design's shipped value
 * from being mistaken for the current value on the selected target.
 */
export function buildControlProvenance<TBinding extends ControlBindingContract>(
  options: BuildControlProvenanceOptions<TBinding>,
): Readonly<Record<string, ControlProvenance>> {
  const result: Record<string, ControlProvenance> = {};

  for (const control of options.controls) {
    const binding = options.bindings.find((candidate) => candidate.control === control);
    if (!binding) {
      result[control] = {
        control,
        state: 'unmapped',
        writerCapability: NO_WRITER,
        disabledReason: disabledReasonFor('unmapped', NO_WRITER),
      };
      continue;
    }

    const common = {
      control,
      resource: binding.resource,
      section: binding.section,
      key: binding.key,
      parser: binding.parser,
      writerCapability: binding.writerCapability,
    } as const;
    const reading = options.readings.find((candidate) => candidate.resource === binding.resource);

    const draft = options.drafts?.[control];
    if (draft) {
      result[control] = {
        ...common,
        state: 'local-draft',
        value: draft.value,
        draftedAt: draft.updatedAt,
        observedAt: reading?.observedAt,
        disabledReason: disabledReasonFor('local-draft', binding.writerCapability),
      };
      continue;
    }

    const applied = options.applied?.[control];
    if (applied) {
      result[control] = {
        ...common,
        state: 'applied',
        value: applied.value,
        lastAttemptAt: applied.appliedAt,
        lastSuccessAt: applied.appliedAt,
        disabledReason: disabledReasonFor('applied', binding.writerCapability),
      };
      continue;
    }

    if (!reading) {
      const reason = 'This resource has not been read from the selected target.';
      result[control] = {
        ...common,
        state: 'unavailable',
        disabledReason: disabledReasonFor('unavailable', binding.writerCapability, reason),
      };
      continue;
    }

    if (reading.state !== 'read') {
      const state: ControlProvenanceState = 'unavailable';
      result[control] = {
        ...common,
        state,
        observedAt: reading.observedAt,
        disabledReason: disabledReasonFor(state, binding.writerCapability, reading.reason),
      };
      continue;
    }

    const section = reading.value?.find((candidate) => candidate.name === binding.section);
    const entry = section?.entries.find((candidate) => candidate.key === binding.key);
    if (!entry) {
      result[control] = {
        ...common,
        state: 'missing',
        observedAt: reading.observedAt,
        disabledReason: disabledReasonFor('missing', binding.writerCapability),
      };
      continue;
    }

    const parsed = options.parse(binding, entry.value);
    if (parsed === undefined) {
      result[control] = {
        ...common,
        state: 'unparseable',
        rawValue: entry.value,
        observedAt: reading.observedAt,
        disabledReason: disabledReasonFor('unparseable', binding.writerCapability),
      };
      continue;
    }

    result[control] = {
      ...common,
      state: 'read',
      value: parsed,
      rawValue: entry.value,
      observedAt: reading.observedAt,
      disabledReason: disabledReasonFor('read', binding.writerCapability),
    };
  }

  return result;
}
