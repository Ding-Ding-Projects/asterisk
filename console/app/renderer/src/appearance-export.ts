import { validateAppearanceOverride, validateAppearanceValue } from './appearance';
import { rainbowDurationMs } from './colour';
import {
  APPEARANCE_MODEL_SCHEMA_VERSION,
  MAX_APPEARANCE_DRAFTS,
  MAX_APPEARANCE_NAME_LENGTH,
  MAX_APPEARANCE_OVERRIDES,
  MAX_APPEARANCE_PRESETS,
  MAX_PRESET_OVERRIDES,
  appearanceOverrideKey,
  type AppearanceCapabilityId,
  type AppearanceCapabilityRecord,
  type AppearanceDraft,
  type AppearanceModel,
  type AppearanceOverride,
  type LogoAppearanceMetadata,
  type NamedAppearancePreset,
} from './appearance-schema';

export const APPEARANCE_EXPORT_KIND = 'ding-pbx-console-appearance' as const;
export const MAX_APPEARANCE_EXPORT_BYTES = 1_048_576;

interface AppearanceExportDocument {
  readonly kind: typeof APPEARANCE_EXPORT_KIND;
  readonly schemaVersion: typeof APPEARANCE_MODEL_SCHEMA_VERSION;
  readonly model: AppearanceModel;
  readonly privacy: {
    readonly containsRawLogoAsset: false;
    readonly containsNetworkReference: false;
  };
}

export interface AppearanceExportSuccess {
  readonly ok: true;
  readonly mediaType: 'application/json';
  readonly fileExtension: '.json';
  readonly text: string;
  readonly byteLength: number;
  readonly warnings: ReadonlyArray<string>;
}

export interface AppearanceContractFailure {
  readonly ok: false;
  readonly reason: string;
  readonly errors: ReadonlyArray<string>;
}

export type AppearanceExportResult = AppearanceExportSuccess | AppearanceContractFailure;
export type AppearanceImportResult = { readonly ok: true; readonly model: AppearanceModel } | AppearanceContractFailure;

const CAPABILITY_IDS = new Set<AppearanceCapabilityId>([
  'installedFontEnumeration', 'variableFontAxes', 'eyeDropper', 'clipboardWrite',
  'customLogoDecode', 'customLogoCrop', 'rainbowAnimation', 'cssOklch',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, allowed: ReadonlyArray<string>, label: string): string[] {
  const accepted = new Set(allowed);
  return Object.keys(value)
    .filter((key) => !accepted.has(key))
    .map((key) => `${label} contains unsupported field '${key}'`);
}

function duplicateOverrideErrors(overrides: ReadonlyArray<AppearanceOverride>, label: string): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];
  overrides.forEach((override, index) => {
    const key = appearanceOverrideKey(override.target, override.state, override.property);
    if (seen.has(key)) errors.push(`${label}[${index}] duplicates '${key}'`);
    seen.add(key);
  });
  return errors;
}

function validateCapability(value: unknown, index: number): string[] {
  const label = `capabilities[${index}]`;
  if (!isRecord(value)) return [`${label} must be an object`];
  const errors = exactKeys(value, ['id', 'supported', 'reason', 'fallback'], label);
  if (!CAPABILITY_IDS.has(value.id as AppearanceCapabilityId)) errors.push(`${label}.id is not supported`);
  if (typeof value.supported !== 'boolean') errors.push(`${label}.supported must be boolean`);
  if (value.reason !== undefined && typeof value.reason !== 'string') errors.push(`${label}.reason must be a string`);
  if (value.fallback !== undefined && typeof value.fallback !== 'string') errors.push(`${label}.fallback must be a string`);
  if (value.supported === false && (typeof value.reason !== 'string' || value.reason.length === 0)) {
    errors.push(`${label}.reason is required when support is unavailable`);
  }
  if (value.supported === false && (typeof value.fallback !== 'string' || value.fallback.length === 0)) {
    errors.push(`${label}.fallback is required when support is unavailable`);
  }
  return errors;
}

function validateAppearanceValueShape(value: unknown, label: string): string[] {
  if (!isRecord(value)) return [`${label} must be an object`];
  if (value.kind === 'rainbow') return exactKeys(value, ['kind', 'reducedMotionHue'], label);
  if (value.kind === 'literal' || value.kind === 'colour') return exactKeys(value, ['kind', 'value'], label);
  return [`${label}.kind is unsupported`];
}

function validateOverrideShape(value: Record<string, unknown>, label: string, draft: boolean): string[] {
  const errors = exactKeys(value, draft
    ? ['target', 'state', 'property', 'value', 'baseRevision']
    : ['target', 'state', 'property', 'value'], label);
  if (!isRecord(value.target)) {
    errors.push(`${label}.target must be an object`);
  } else if (value.target.scope === 'global') {
    errors.push(...exactKeys(value.target, ['scope'], `${label}.target`));
  } else if (value.target.scope === 'element') {
    errors.push(...exactKeys(value.target, ['scope', 'elementId'], `${label}.target`));
  }
  errors.push(...validateAppearanceValueShape(value.value, `${label}.value`));
  return errors;
}

function validateLogo(value: unknown): string[] {
  if (!isRecord(value)) return ['logo must be an object'];
  const errors = exactKeys(value, [
    'source', 'presetId', 'hasLocalSource', 'fit', 'focalPoint', 'crop', 'background',
    'transparency', 'conversionStatus', 'conversionLosses',
  ], 'logo');
  if (value.source !== 'shipped-preset' && value.source !== 'custom-local') errors.push('logo.source is unsupported');
  if (value.presetId !== undefined
    && (typeof value.presetId !== 'string' || value.presetId.length === 0 || value.presetId.length > 128)) {
    errors.push('logo.presetId must be a bounded non-empty string');
  }
  if (typeof value.hasLocalSource !== 'boolean') errors.push('logo.hasLocalSource must be boolean');
  if (value.source === 'shipped-preset' && typeof value.presetId !== 'string') errors.push('logo.presetId is required for a shipped preset');
  if (value.source === 'shipped-preset' && value.hasLocalSource === true) errors.push('a shipped preset cannot claim a custom local source');
  if (value.source === 'custom-local' && value.hasLocalSource !== true) errors.push('a custom-local logo must confirm that its source exists locally');
  if (!new Set(['contain', 'cover', 'fill']).has(value.fit as string)) errors.push('logo.fit is unsupported');
  if (!isRecord(value.focalPoint)
    || typeof value.focalPoint.x !== 'number'
    || !Number.isFinite(value.focalPoint.x)
    || typeof value.focalPoint.y !== 'number'
    || !Number.isFinite(value.focalPoint.y)) {
    errors.push('logo.focalPoint must carry numeric x and y ratios');
  }
  if (isRecord(value.focalPoint)) {
    errors.push(...exactKeys(value.focalPoint, ['x', 'y'], 'logo.focalPoint'));
    for (const key of ['x', 'y'] as const) {
      const component = value.focalPoint[key];
      if (typeof component === 'number' && (component < 0 || component > 1)) {
        errors.push(`logo.focalPoint.${key} must be within [0, 1]`);
      }
    }
  }
  if (value.crop !== undefined) {
    if (!isRecord(value.crop)) {
      errors.push('logo.crop must be an object');
    } else {
      errors.push(...exactKeys(value.crop, ['x', 'y', 'width', 'height', 'unit'], 'logo.crop'));
      for (const key of ['x', 'y', 'width', 'height'] as const) {
        if (typeof value.crop[key] !== 'number' || !Number.isFinite(value.crop[key] as number)) {
          errors.push(`logo.crop.${key} must be finite and numeric`);
        }
        else if ((value.crop[key] as number) < 0 || (value.crop[key] as number) > 1) {
          errors.push(`logo.crop.${key} must be within [0, 1]`);
        }
      }
      if (typeof value.crop.x === 'number' && typeof value.crop.width === 'number'
        && value.crop.x + value.crop.width > 1) errors.push('logo.crop x plus width must not exceed 1');
      if (typeof value.crop.y === 'number' && typeof value.crop.height === 'number'
        && value.crop.y + value.crop.height > 1) errors.push('logo.crop y plus height must not exceed 1');
      if (value.crop.unit !== 'ratio') errors.push("logo.crop.unit must be 'ratio'");
    }
  }
  if (!isRecord(value.background)) errors.push('logo.background must be an appearance value object');
  else {
    errors.push(...validateAppearanceValueShape(value.background, 'logo.background'));
    const backgroundCheck = validateAppearanceValue('background', value.background as never);
    if (!backgroundCheck.ok) errors.push(`logo.background: ${backgroundCheck.reason}`);
  }
  if (value.transparency !== 'preserve' && value.transparency !== 'flatten') errors.push('logo.transparency is unsupported');
  if (!new Set(['not-required', 'pending', 'converted', 'failed']).has(value.conversionStatus as string)) {
    errors.push('logo.conversionStatus is unsupported');
  }
  if (!Array.isArray(value.conversionLosses) || value.conversionLosses.some((item) => typeof item !== 'string')) {
    errors.push('logo.conversionLosses must be a string array');
  }
  return errors;
}

function validateGlobals(value: unknown): string[] {
  if (!isRecord(value)) return ['globals must be an object'];
  const errors = exactKeys(value, ['theme', 'density', 'accent', 'fontFamily', 'fontScale', 'motion'], 'globals');
  if (!new Set(['dark', 'light', 'system']).has(value.theme as string)) errors.push('globals.theme is unsupported');
  if (!new Set(['dense', 'comfortable', 'spacious']).has(value.density as string)) errors.push('globals.density is unsupported');
  if (!new Set(['system', 'reduce', 'no-preference']).has(value.motion as string)) errors.push('globals.motion is unsupported');
  if (value.fontFamily !== undefined
    && (typeof value.fontFamily !== 'string' || value.fontFamily.length === 0 || value.fontFamily.length > 512)) {
    errors.push('globals.fontFamily must be a bounded non-empty string when present');
  }
  if (typeof value.fontScale !== 'number' || !Number.isFinite(value.fontScale) || value.fontScale < 0.5 || value.fontScale > 2) {
    errors.push('globals.fontScale must be within [0.5, 2]');
  }
  errors.push(...validateAppearanceValueShape(value.accent, 'globals.accent'));
  if (isRecord(value.accent)) {
    const accentCheck = validateAppearanceValue('colour', value.accent as never);
    if (!accentCheck.ok) errors.push(`globals.accent: ${accentCheck.reason}`);
  }
  return errors;
}

function validateOverrideArray(value: unknown, label: string, maximum: number): string[] {
  if (!Array.isArray(value)) return [`${label} must be an array`];
  if (value.length > maximum) return [`${label} exceeds the maximum of ${maximum}`];
  const errors: string[] = [];
  const typed: AppearanceOverride[] = [];
  value.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`${label}[${index}] must be an object`);
      return;
    }
    errors.push(...validateOverrideShape(item, `${label}[${index}]`, false));
    const check = validateAppearanceOverride(item as unknown as AppearanceOverride);
    if (!check.ok) errors.push(`${label}[${index}]: ${check.reason}`);
    else typed.push(item as unknown as AppearanceOverride);
  });
  errors.push(...duplicateOverrideErrors(typed, label));
  return errors;
}

function validateDraftArray(value: unknown): string[] {
  if (!Array.isArray(value)) return ['drafts must be an array'];
  if (value.length > MAX_APPEARANCE_DRAFTS) return [`drafts exceeds the maximum of ${MAX_APPEARANCE_DRAFTS}`];
  const errors: string[] = [];
  const seen = new Set<string>();
  value.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`drafts[${index}] must be an object`);
      return;
    }
    errors.push(...validateOverrideShape(item, `drafts[${index}]`, true));
    const check = validateAppearanceOverride(item as unknown as AppearanceOverride);
    if (!check.ok) errors.push(`drafts[${index}]: ${check.reason}`);
    if (!Number.isInteger(item.baseRevision) || (item.baseRevision as number) < 0) {
      errors.push(`drafts[${index}].baseRevision must be a non-negative integer`);
    }
    if (check.ok) {
      const draft = item as unknown as AppearanceDraft;
      const key = appearanceOverrideKey(draft.target, draft.state, draft.property);
      if (seen.has(key)) errors.push(`drafts[${index}] duplicates '${key}'`);
      seen.add(key);
    }
  });
  return errors;
}

function validatePresetArray(value: unknown): string[] {
  if (!Array.isArray(value)) return ['presets must be an array'];
  if (value.length > MAX_APPEARANCE_PRESETS) return [`presets exceeds the maximum of ${MAX_APPEARANCE_PRESETS}`];
  const errors: string[] = [];
  const ids = new Set<string>();
  value.forEach((item, index) => {
    const label = `presets[${index}]`;
    if (!isRecord(item)) {
      errors.push(`${label} must be an object`);
      return;
    }
    errors.push(...exactKeys(item, ['id', 'name', 'description', 'builtIn', 'rainbowLevel', 'globals', 'overrides'], label));
    if (typeof item.id !== 'string' || item.id.length === 0 || item.id.length > MAX_APPEARANCE_NAME_LENGTH) {
      errors.push(`${label}.id must be a bounded non-empty string`);
    } else if (ids.has(item.id)) {
      errors.push(`${label}.id duplicates '${item.id}'`);
    } else {
      ids.add(item.id);
    }
    if (typeof item.name !== 'string' || item.name.length === 0 || item.name.length > MAX_APPEARANCE_NAME_LENGTH) {
      errors.push(`${label}.name must be a bounded non-empty string`);
    }
    if (typeof item.description !== 'string' || item.description.length > 1024) {
      errors.push(`${label}.description must be a string no longer than 1024 characters`);
    }
    if (typeof item.builtIn !== 'boolean') errors.push(`${label}.builtIn must be boolean`);
    try {
      rainbowDurationMs(item.rainbowLevel as number);
    } catch (error) {
      errors.push(`${label}.${error instanceof Error ? error.message : String(error)}`);
    }
    errors.push(...validateGlobals(item.globals).map((error) => `${label}.${error}`));
    errors.push(...validateOverrideArray(item.overrides, `${label}.overrides`, MAX_PRESET_OVERRIDES));
  });
  return errors;
}

export function validateAppearanceModel(value: unknown): AppearanceContractFailure | { readonly ok: true; readonly model: AppearanceModel } {
  if (!isRecord(value)) return { ok: false, reason: 'Appearance model is invalid.', errors: ['model must be an object'] };
  const errors = exactKeys(value, [
    'schemaVersion', 'revision', 'rainbowLevel', 'globals', 'overrides', 'drafts', 'presets', 'activePresetId', 'capabilities', 'logo',
  ], 'model');
  if (value.schemaVersion !== APPEARANCE_MODEL_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${APPEARANCE_MODEL_SCHEMA_VERSION}`);
  }
  if (!Number.isInteger(value.revision) || (value.revision as number) < 0) {
    errors.push('revision must be a non-negative integer');
  }
  try {
    rainbowDurationMs(value.rainbowLevel as number);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  errors.push(...validateGlobals(value.globals));
  errors.push(...validateOverrideArray(value.overrides, 'overrides', MAX_APPEARANCE_OVERRIDES));
  errors.push(...validateDraftArray(value.drafts));
  errors.push(...validatePresetArray(value.presets));
  if (!Array.isArray(value.capabilities)) {
    errors.push('capabilities must be an array');
  } else {
    value.capabilities.forEach((item, index) => errors.push(...validateCapability(item, index)));
    const ids = value.capabilities
      .filter(isRecord)
      .map((item) => item.id)
      .filter((id): id is string => typeof id === 'string');
    if (new Set(ids).size !== ids.length) errors.push('capabilities contains duplicate ids');
  }
  if (value.logo !== undefined) errors.push(...validateLogo(value.logo));
  if (value.activePresetId !== undefined) {
    if (typeof value.activePresetId !== 'string') {
      errors.push('activePresetId must be a string');
    } else if (Array.isArray(value.presets) && !value.presets.some(
      (preset) => isRecord(preset) && preset.id === value.activePresetId,
    )) {
      errors.push(`activePresetId '${value.activePresetId}' does not name an included preset`);
    }
  }
  if (errors.length > 0) return { ok: false, reason: 'Appearance model is invalid.', errors };
  return { ok: true, model: value as unknown as AppearanceModel };
}

function cloneModel(model: AppearanceModel): AppearanceModel {
  return JSON.parse(JSON.stringify(model)) as AppearanceModel;
}

export function exportAppearanceModel(model: AppearanceModel): AppearanceExportResult {
  const checked = validateAppearanceModel(model);
  if (!checked.ok) return checked;
  const warnings: string[] = [];
  if (model.logo?.source === 'custom-local' && model.logo.hasLocalSource) {
    warnings.push('The local custom-logo bytes, filename, path, and cache key are intentionally omitted; only safe rendering metadata is exported.');
  }
  const document: AppearanceExportDocument = {
    kind: APPEARANCE_EXPORT_KIND,
    schemaVersion: APPEARANCE_MODEL_SCHEMA_VERSION,
    model: cloneModel(model),
    privacy: { containsRawLogoAsset: false, containsNetworkReference: false },
  };
  const text = JSON.stringify(document, null, 2);
  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > MAX_APPEARANCE_EXPORT_BYTES) {
    return {
      ok: false,
      reason: 'Appearance export exceeds the size limit.',
      errors: [`export is ${byteLength} bytes; maximum is ${MAX_APPEARANCE_EXPORT_BYTES}`],
    };
  }
  return { ok: true, mediaType: 'application/json', fileExtension: '.json', text, byteLength, warnings };
}

export function importAppearanceModel(text: string): AppearanceImportResult {
  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > MAX_APPEARANCE_EXPORT_BYTES) {
    return {
      ok: false,
      reason: 'Appearance import exceeds the size limit.',
      errors: [`import is ${byteLength} bytes; maximum is ${MAX_APPEARANCE_EXPORT_BYTES}`],
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      reason: 'Appearance import is not valid JSON.',
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (!isRecord(parsed)) return { ok: false, reason: 'Appearance import is invalid.', errors: ['top level must be an object'] };
  const rootErrors = exactKeys(parsed, ['kind', 'schemaVersion', 'model', 'privacy'], 'document');
  if (parsed.kind !== APPEARANCE_EXPORT_KIND) rootErrors.push(`kind must be '${APPEARANCE_EXPORT_KIND}'`);
  if (parsed.schemaVersion !== APPEARANCE_MODEL_SCHEMA_VERSION) {
    rootErrors.push(`schemaVersion must be ${APPEARANCE_MODEL_SCHEMA_VERSION}`);
  }
  if (!isRecord(parsed.privacy)
    || parsed.privacy.containsRawLogoAsset !== false
    || parsed.privacy.containsNetworkReference !== false) {
    rootErrors.push('privacy contract must explicitly exclude raw logo assets and network references');
  } else {
    rootErrors.push(...exactKeys(parsed.privacy, ['containsRawLogoAsset', 'containsNetworkReference'], 'privacy'));
  }
  if (rootErrors.length > 0) return { ok: false, reason: 'Appearance import contract is invalid.', errors: rootErrors };
  const checked = validateAppearanceModel(parsed.model);
  if (!checked.ok) return checked;
  return { ok: true, model: cloneModel(checked.model) };
}

export type {
  AppearanceCapabilityRecord,
  LogoAppearanceMetadata,
  NamedAppearancePreset,
};
