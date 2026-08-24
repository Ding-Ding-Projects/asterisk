/**
 * The advanced-settings registry, and the rules for rendering and writing one safely.
 *
 * Unlike the endpoint, feature-code and IAX editors beside it, nothing here maps to an
 * Asterisk config key. These are the console's own settings, and the page contract is
 * itself the feature: render every registered setting by category with its keyword,
 * friendly name, help, current and default value, and validate before writing rather
 * than after.
 *
 * Four rules are load-bearing and each exists because the obvious alternative is worse:
 *
 *  - A read-only setting is never writable through a policy flag alone. Overriding one
 *    requires an explicit, recorded reason, so an override is auditable rather than a
 *    boolean somebody flipped once.
 *  - A hidden setting stays inaccessible unless product policy admits it. Core shipped a
 *    hidden-setting preference that did nothing, which is worse than not offering one:
 *    it reads as a control and is a decoration.
 *  - A secret setting is validated without its stored value ever being rendered or
 *    returned. `currentValue` for a secret is a presence flag, never the value.
 *  - A setting omitted for version or module reasons is reported WITH the reason, never
 *    silently dropped. A setting that vanishes with no explanation reads as a bug in the
 *    console rather than as a deliberate gate.
 *
 * Covers CORE-ADV-UI-001 through -004, -006 and -007.
 */

export type SettingType = 'boolean' | 'integer' | 'string' | 'enum' | 'path' | 'secret';

/** Why a setting is not being shown. Never absent when a setting is withheld. */
export interface OmissionReason {
  key: string;
  reason: string;
}

export interface SettingDefinition {
  key: string;
  group: string;
  name: string;
  help: string;
  type: SettingType;
  default: string | number | boolean;
  /** Inclusive, for `integer`. */
  min?: number;
  max?: number;
  /** The complete allowed set, for `enum`. */
  options?: readonly string[];
  /** Read-only settings render their value but refuse a write without an override. */
  readOnly?: boolean;
  /** Hidden settings are withheld entirely unless policy admits them. */
  hidden?: boolean;
  /** Minimum Asterisk major version. A target below this does not see the setting. */
  minAsteriskMajor?: number;
  /** Module that must be present for this setting to mean anything. */
  requiresModule?: string;
  /** What applying it costs, shown before Submit rather than after. */
  impact?: 'none' | 'reload' | 'restart';
}

export interface Policy {
  /** Admits hidden settings. Off by default: a hidden setting is hidden. */
  showHidden?: boolean;
  /** Permits writing a read-only setting, and only alongside a recorded reason. */
  allowReadOnlyOverride?: { reason: string };
}

export interface TargetFacts {
  asteriskMajor?: number;
  loadedModules?: readonly string[];
}

export interface RenderedSetting {
  definition: SettingDefinition;
  /** For a secret this is never the stored value; see `hasValue`. */
  currentValue?: string | number | boolean;
  /** Whether a secret has something stored. The only thing said about a secret's value. */
  hasValue: boolean;
  isModified: boolean;
  /** True when writing needs an override that policy has not granted. */
  isLocked: boolean;
}

export interface RenderResult {
  groups: { title: string; settings: RenderedSetting[] }[];
  /** Every setting withheld, each with its reason. Never silently empty. */
  omitted: OmissionReason[];
}

export type SettingValues = Readonly<Record<string, string | number | boolean>>;

const isSecret = (definition: SettingDefinition) => definition.type === 'secret';

/**
 * Decides what a target actually sees, and says why about everything it does not.
 *
 * Grouping preserves the registry's own order rather than sorting alphabetically: the
 * registry order is editorial, and re-sorting it scatters related settings apart.
 */
export function renderSettings(
  registry: readonly SettingDefinition[],
  values: SettingValues,
  facts: TargetFacts = {},
  policy: Policy = {},
): RenderResult {
  const omitted: OmissionReason[] = [];
  const groups: { title: string; settings: RenderedSetting[] }[] = [];

  for (const definition of registry) {
    const withheld = omissionFor(definition, facts, policy);
    if (withheld) {
      omitted.push({ key: definition.key, reason: withheld });
      continue;
    }
    const stored = values[definition.key];
    const hasValue = stored !== undefined && stored !== '';
    const rendered: RenderedSetting = {
      definition,
      /* A secret's stored value never leaves this function. Everything downstream --
       * the screen, an export, a debug dump -- can only learn that one is set. */
      currentValue: isSecret(definition) ? undefined : (stored ?? definition.default),
      hasValue,
      isModified: !isSecret(definition) && stored !== undefined && stored !== definition.default,
      isLocked: definition.readOnly === true && policy.allowReadOnlyOverride === undefined,
    };
    let group = groups.find((candidate) => candidate.title === definition.group);
    if (!group) {
      group = { title: definition.group, settings: [] };
      groups.push(group);
    }
    group.settings.push(rendered);
  }
  return { groups, omitted };
}

function omissionFor(
  definition: SettingDefinition,
  facts: TargetFacts,
  policy: Policy,
): string | undefined {
  if (definition.hidden && !policy.showHidden) {
    return 'Hidden by product policy. It is withheld rather than shown disabled, so nothing on screen suggests a control that will not work.';
  }
  if (definition.minAsteriskMajor !== undefined && facts.asteriskMajor !== undefined
      && facts.asteriskMajor < definition.minAsteriskMajor) {
    return `Needs Asterisk ${definition.minAsteriskMajor} or newer; this target reports ${facts.asteriskMajor}.`;
  }
  if (definition.requiresModule !== undefined && facts.loadedModules !== undefined
      && !facts.loadedModules.includes(definition.requiresModule)) {
    return `Needs the ${definition.requiresModule} module, which this target has not loaded.`;
  }
  return undefined;
}

export interface WriteProblem {
  key: string;
  message: string;
}

/**
 * Validates a proposed write before it reaches the target.
 *
 * Every problem is returned rather than the first, and a secret's value is never echoed
 * back in a message -- a validation error that quotes the rejected value is a validation
 * error that leaks it into a log.
 */
export function validateWrite(
  registry: readonly SettingDefinition[],
  proposed: SettingValues,
  facts: TargetFacts = {},
  policy: Policy = {},
): WriteProblem[] {
  const problems: WriteProblem[] = [];
  const byKey = new Map(registry.map((definition) => [definition.key, definition]));

  for (const [key, value] of Object.entries(proposed)) {
    const definition = byKey.get(key);
    if (!definition) {
      problems.push({ key, message: `"${key}" is not a registered setting.` });
      continue;
    }
    const withheld = omissionFor(definition, facts, policy);
    if (withheld) {
      problems.push({ key, message: `${key} is not available on this target. ${withheld}` });
      continue;
    }
    if (definition.readOnly && policy.allowReadOnlyOverride === undefined) {
      problems.push({ key, message: `${key} is read-only. Overriding it needs an explicit recorded reason.` });
      continue;
    }
    problems.push(...typeProblems(definition, value));
  }
  return problems;
}

function typeProblems(definition: SettingDefinition, value: unknown): WriteProblem[] {
  const { key, type } = definition;
  const bad = (message: string): WriteProblem[] => [{ key, message }];

  switch (type) {
    case 'boolean':
      return typeof value === 'boolean' ? [] : bad(`${key} takes yes or no.`);
    case 'integer': {
      if (typeof value !== 'number' || !Number.isInteger(value)) return bad(`${key} takes a whole number.`);
      if (definition.min !== undefined && value < definition.min) {
        return bad(`${key} cannot be below ${definition.min}.`);
      }
      if (definition.max !== undefined && value > definition.max) {
        return bad(`${key} cannot be above ${definition.max}.`);
      }
      return [];
    }
    case 'enum': {
      if (typeof value !== 'string') return bad(`${key} takes one of its listed values.`);
      return definition.options?.includes(value)
        ? []
        : bad(`${key} does not accept "${value}". It takes one of: ${(definition.options ?? []).join(', ')}.`);
    }
    case 'path': {
      if (typeof value !== 'string' || value.trim() === '') return bad(`${key} needs a path.`);
      if (!value.startsWith('/')) return bad(`${key} needs an absolute path, starting with a slash.`);
      /* A traversal segment in a configured path is how a setting becomes a way to write
       * somewhere nobody intended. */
      if (value.split('/').includes('..')) return bad(`${key} cannot contain "..".`);
      return [];
    }
    case 'secret': {
      /* Never quote the value. A message naming the rejected secret puts it in whatever
       * log, toast or export the message reaches. */
      if (typeof value !== 'string') return bad(`${key} takes text.`);
      if (value.trim() === '') return bad(`${key} cannot be empty.`);
      if (value.length < 8) return bad(`${key} is too short to be a usable secret.`);
      return [];
    }
    case 'string':
      return typeof value === 'string' ? [] : bad(`${key} takes text.`);
    default:
      return bad(`${key} has an unrecognised type.`);
  }
}

/** The settings whose proposed value differs from what is stored, for the Submit preview. */
export function changedKeys(values: SettingValues, proposed: SettingValues): string[] {
  return Object.keys(proposed).filter((key) => proposed[key] !== values[key]);
}

export interface ApplyImpact {
  /** Real keys, so the preview names what is about to change rather than a count. */
  keys: string[];
  needsReload: boolean;
  needsRestart: boolean;
  /** Stated before Submit, not after: applying settings is a config write like any other. */
  backupWarning: string;
}

/**
 * What applying this change will cost, for the preview shown before Submit.
 *
 * A restart outranks a reload: a change needing both needs the restart, and saying
 * "reload" would understate the interruption somebody is about to cause.
 */
export function impactOf(registry: readonly SettingDefinition[], keys: readonly string[]): ApplyImpact {
  const byKey = new Map(registry.map((definition) => [definition.key, definition]));
  const impacts = keys.map((key) => byKey.get(key)?.impact ?? 'none');
  return {
    keys: [...keys],
    needsRestart: impacts.includes('restart'),
    needsReload: impacts.includes('reload') && !impacts.includes('restart'),
    backupWarning: 'The current settings are backed up before the write, and restored if the read-back does not match.',
  };
}

/** Restores one setting to its shipped default, for the per-setting Restore Default action. */
export function restoreDefault(
  registry: readonly SettingDefinition[],
  values: SettingValues,
  key: string,
): SettingValues | { error: string } {
  const definition = registry.find((candidate) => candidate.key === key);
  if (!definition) return { error: `"${key}" is not a registered setting.` };
  const next: Record<string, string | number | boolean> = { ...values };
  next[key] = definition.default;
  return next;
}

/** Restores every setting a policy permits writing. A locked setting keeps its value. */
export function resetAll(
  registry: readonly SettingDefinition[],
  values: SettingValues,
  policy: Policy = {},
): SettingValues {
  const next: Record<string, string | number | boolean> = { ...values };
  for (const definition of registry) {
    if (definition.readOnly && policy.allowReadOnlyOverride === undefined) continue;
    next[definition.key] = definition.default;
  }
  return next;
}
