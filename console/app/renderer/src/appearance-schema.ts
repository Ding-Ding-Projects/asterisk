import type { RainbowSpeedLevel } from './colour';

export const APPEARANCE_MODEL_SCHEMA_VERSION = 2 as const;

export type AppearanceInteractionState =
  | 'default'
  | 'hover'
  | 'focus'
  | 'focusVisible'
  | 'active'
  | 'disabled'
  | 'selected'
  | 'checked'
  | 'expanded';

export const APPEARANCE_INTERACTION_STATES: ReadonlyArray<AppearanceInteractionState> = [
  'default', 'hover', 'focus', 'focusVisible', 'active', 'disabled', 'selected', 'checked', 'expanded',
];

export type AppearanceProperty =
  | 'fontFamily' | 'fontSize' | 'fontWeight' | 'fontStyle'
  | 'underline' | 'underlineStyle' | 'underlineColour'
  | 'strikethrough' | 'doubleStrikethrough' | 'overline'
  | 'capitalisation' | 'smallCaps' | 'superscript' | 'subscript'
  | 'letterSpacing' | 'wordSpacing' | 'lineHeight' | 'baselineShift' | 'textAlign' | 'direction'
  | 'colour' | 'background' | 'highlight' | 'borderColour'
  | 'outline' | 'shadow' | 'glow'
  | 'radius' | 'borderWidth' | 'padding' | 'gap' | 'elevation' | 'opacity';

export const APPEARANCE_PROPERTIES: ReadonlyArray<AppearanceProperty> = [
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
  'underline', 'underlineStyle', 'underlineColour',
  'strikethrough', 'doubleStrikethrough', 'overline',
  'capitalisation', 'smallCaps', 'superscript', 'subscript',
  'letterSpacing', 'wordSpacing', 'lineHeight', 'baselineShift', 'textAlign', 'direction',
  'colour', 'background', 'highlight', 'borderColour',
  'outline', 'shadow', 'glow',
  'radius', 'borderWidth', 'padding', 'gap', 'elevation', 'opacity',
];

export interface LiteralAppearanceValue {
  readonly kind: 'literal';
  readonly value: string;
}

export interface SolidColourAppearanceValue {
  readonly kind: 'colour';
  /** A parseable, alpha-preserving colour representation. */
  readonly value: string;
}

/**
 * Rainbow is deliberately not a colour string. Renderers resolve this marker
 * through the global speed mapping and a reduced-motion single hue.
 */
export interface RainbowAppearanceValue {
  readonly kind: 'rainbow';
  readonly reducedMotionHue: number;
}

export type AppearanceValue = LiteralAppearanceValue | SolidColourAppearanceValue | RainbowAppearanceValue;

export interface GlobalAppearanceTarget {
  readonly scope: 'global';
}

export interface ElementAppearanceTarget {
  readonly scope: 'element';
  readonly elementId: string;
}

export type AppearanceTarget = GlobalAppearanceTarget | ElementAppearanceTarget;

export interface AppearanceOverride {
  readonly target: AppearanceTarget;
  readonly state: AppearanceInteractionState;
  readonly property: AppearanceProperty;
  readonly value: AppearanceValue;
}

export interface AppearanceDraft extends AppearanceOverride {
  readonly baseRevision: number;
}

export type AppearanceCapabilityId =
  | 'installedFontEnumeration'
  | 'variableFontAxes'
  | 'eyeDropper'
  | 'clipboardWrite'
  | 'customLogoDecode'
  | 'customLogoCrop'
  | 'rainbowAnimation'
  | 'cssOklch';

export interface AppearanceCapabilityRecord {
  readonly id: AppearanceCapabilityId;
  readonly supported: boolean;
  /** Required for unsupported capabilities and omitted for supported ones. */
  readonly reason?: string;
  readonly fallback?: string;
}

export interface LogoCropMetadata {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly unit: 'ratio';
}

export interface LogoAppearanceMetadata {
  readonly source: 'shipped-preset' | 'custom-local';
  readonly presetId?: string;
  readonly hasLocalSource: boolean;
  readonly fit: 'contain' | 'cover' | 'fill';
  readonly focalPoint: { readonly x: number; readonly y: number };
  readonly crop?: LogoCropMetadata;
  readonly background: AppearanceValue;
  readonly transparency: 'preserve' | 'flatten';
  readonly conversionStatus: 'not-required' | 'pending' | 'converted' | 'failed';
  readonly conversionLosses: ReadonlyArray<string>;
}

export interface NamedAppearancePreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly builtIn: boolean;
  readonly rainbowLevel: RainbowSpeedLevel;
  readonly globals: AppearanceGlobalSettings;
  readonly overrides: ReadonlyArray<AppearanceOverride>;
}

export interface AppearanceGlobalSettings {
  readonly theme: 'dark' | 'light' | 'system';
  readonly density: 'dense' | 'comfortable' | 'spacious';
  readonly accent: AppearanceValue;
  readonly fontFamily?: string;
  readonly fontScale: number;
  readonly motion: 'system' | 'reduce' | 'no-preference';
}

export interface AppearanceModel {
  readonly schemaVersion: typeof APPEARANCE_MODEL_SCHEMA_VERSION;
  readonly revision: number;
  /** One speed setting drives every rainbow surface. */
  readonly rainbowLevel: RainbowSpeedLevel;
  readonly globals: AppearanceGlobalSettings;
  readonly overrides: ReadonlyArray<AppearanceOverride>;
  readonly drafts: ReadonlyArray<AppearanceDraft>;
  readonly presets: ReadonlyArray<NamedAppearancePreset>;
  readonly activePresetId?: string;
  readonly capabilities: ReadonlyArray<AppearanceCapabilityRecord>;
  readonly logo?: LogoAppearanceMetadata;
}

export const MAX_APPEARANCE_OVERRIDES = 4000;
export const MAX_APPEARANCE_DRAFTS = 512;
export const MAX_APPEARANCE_PRESETS = 128;
export const MAX_PRESET_OVERRIDES = 2000;
export const MAX_APPEARANCE_VALUE_LENGTH = 512;
export const MAX_APPEARANCE_ELEMENT_ID_LENGTH = 160;
export const MAX_APPEARANCE_NAME_LENGTH = 128;

export function appearanceTargetKey(target: AppearanceTarget): string {
  return target.scope === 'global' ? 'global' : `element:${target.elementId}`;
}

export function appearanceOverrideKey(
  target: AppearanceTarget,
  state: AppearanceInteractionState,
  property: AppearanceProperty,
): string {
  return `${appearanceTargetKey(target)}::${state}::${property}`;
}

export function emptyAppearanceModel(
  capabilities: ReadonlyArray<AppearanceCapabilityRecord> = [],
): AppearanceModel {
  return {
    schemaVersion: APPEARANCE_MODEL_SCHEMA_VERSION,
    revision: 0,
    rainbowLevel: 3,
    globals: {
      theme: 'dark',
      density: 'comfortable',
      accent: { kind: 'colour', value: '#82d9a5' },
      fontScale: 1,
      motion: 'system',
    },
    overrides: [],
    drafts: [],
    presets: [],
    capabilities: [...capabilities],
  };
}
