/**
 * appearance.ts — the model behind a per-element appearance editor.
 *
 * Lets a caller select any rendered "element" (an id string naming a component
 * or region) and set typography, colour, spacing, and elevation properties on
 * it, with word-processor-grade validation and honest failure reporting.
 *
 * Pure functions only: no DOM, no clock, no randomness. Colour handling is
 * delegated entirely to colour.ts — this module never reimplements it.
 */

import {
  contrastRatio,
  contrastVerdict,
  parseColour,
  resolveRainbow,
  RAINBOW,
} from './colour';
import {
  APPEARANCE_INTERACTION_STATES,
  APPEARANCE_PROPERTIES as SCHEMA_APPEARANCE_PROPERTIES,
  MAX_APPEARANCE_ELEMENT_ID_LENGTH,
  MAX_APPEARANCE_VALUE_LENGTH,
  appearanceOverrideKey,
  type AppearanceInteractionState,
  type AppearanceModel,
  type AppearanceOverride,
  type AppearanceProperty as SchemaAppearanceProperty,
  type AppearanceTarget,
  type AppearanceValue,
} from './appearance-schema';

export type {
  AppearanceCapabilityRecord,
  AppearanceDraft,
  AppearanceInteractionState,
  AppearanceModel,
  AppearanceOverride,
  AppearanceTarget,
  AppearanceValue,
  LogoAppearanceMetadata,
  NamedAppearancePreset,
} from './appearance-schema';

// ---------------------------------------------------------------- Types

export type AppearanceProperty = SchemaAppearanceProperty;

export const APPEARANCE_PROPERTIES: ReadonlyArray<AppearanceProperty> = SCHEMA_APPEARANCE_PROPERTIES;

const PROPERTY_SET: ReadonlySet<AppearanceProperty> = new Set(APPEARANCE_PROPERTIES);
const LEGACY_PROPERTY_SET: ReadonlySet<AppearanceProperty> = new Set([
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
  'underline', 'strikethrough', 'overline', 'capitalisation',
  'letterSpacing', 'wordSpacing', 'lineHeight', 'baselineShift', 'textAlign', 'direction',
  'colour', 'background', 'highlight', 'borderColour',
  'radius', 'borderWidth', 'padding', 'gap', 'elevation', 'opacity',
]);

export interface AppearanceRule {
  element: string;
  property: AppearanceProperty;
  value: string;
}

export interface AppearanceTheme {
  id: string;
  name: string;
  rules: ReadonlyArray<AppearanceRule>;
}

export type ValidationResult = { ok: true } | { ok: false; reason: string };

// ---------------------------------------------------------------- Bounds

export const MAX_RULES = 2000;
export const MAX_VALUE_LENGTH = 256;
export const MAX_ELEMENT_LENGTH = 128;

const ELEMENT_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]{0,127}$/;

// The colour-bearing properties, delegated wholesale to colour.ts.
const COLOUR_PROPERTIES: ReadonlySet<AppearanceProperty> = new Set([
  'colour', 'background', 'highlight', 'borderColour', 'underlineColour',
]);

// Length-valued properties: a bare non-negative number (px assumed) or a
// number with an explicit CSS length unit.
const LENGTH_PATTERN = /^-?\d+(\.\d+)?(px|em|rem|%|pt)?$/;
const NONNEGATIVE_LENGTH_PATTERN = /^\d+(\.\d+)?(px|em|rem|%|pt)?$/;

const NAMED_WEIGHTS: ReadonlySet<string> = new Set([
  'thin', 'extralight', 'light', 'normal', 'regular', 'medium',
  'semibold', 'bold', 'extrabold', 'black',
]);

const TEXT_ALIGN_VALUES: ReadonlySet<string> = new Set(['left', 'right', 'center', 'justify', 'start', 'end']);
const DIRECTION_VALUES: ReadonlySet<string> = new Set(['ltr', 'rtl']);
const CAPITALISATION_VALUES: ReadonlySet<string> = new Set(['none', 'uppercase', 'lowercase', 'capitalize', 'smallcaps']);
const FONT_STYLE_VALUES: ReadonlySet<string> = new Set(['normal', 'italic', 'oblique']);
const BOOLEAN_VALUES: ReadonlySet<string> = new Set(['true', 'false']);

function isNonNegativeLength(value: string, max?: number): boolean {
  if (!NONNEGATIVE_LENGTH_PATTERN.test(value)) return false;
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return false;
  if (max !== undefined && n > max) return false;
  return true;
}

function isLength(value: string): boolean {
  if (!LENGTH_PATTERN.test(value)) return false;
  return Number.isFinite(parseFloat(value));
}

// ---------------------------------------------------------------- validateRule

export function validateElementId(element: string): ValidationResult {
  if (typeof element !== 'string' || element.length === 0) {
    return { ok: false, reason: `element must be a non-empty string, got ${JSON.stringify(element)}` };
  }
  if (element.length > MAX_ELEMENT_LENGTH) {
    return { ok: false, reason: `element must be at most ${MAX_ELEMENT_LENGTH} characters, got ${element.length}` };
  }
  if (element === WILDCARD_ELEMENT) return { ok: true };
  if (!ELEMENT_PATTERN.test(element)) {
    return { ok: false, reason: `element '${element}' is not a valid element id (letters, digits, '.', '_', '-', starting with a letter)` };
  }
  return { ok: true };
}

function validatePropertyValue(property: AppearanceProperty, value: string): ValidationResult {
  if (typeof value !== 'string') {
    return { ok: false, reason: `value for '${property}' must be a string, got ${JSON.stringify(value)}` };
  }
  if (value.length === 0) {
    return { ok: false, reason: `value for '${property}' must not be empty` };
  }
  if (value.length > MAX_VALUE_LENGTH) {
    return { ok: false, reason: `value for '${property}' must be at most ${MAX_VALUE_LENGTH} characters, got '${value.slice(0, 32)}...' (${value.length} chars)` };
  }

  if (COLOUR_PROPERTIES.has(property)) {
    if (value === RAINBOW) return { ok: true };
    const parsed = parseColour(value);
    if (!parsed) {
      return { ok: false, reason: `${property} must be a valid colour, got '${value}'` };
    }
    return { ok: true };
  }

  if (value === RAINBOW) {
    return { ok: false, reason: `${property} does not accept the rainbow colour sentinel; it is only valid for colour-bearing properties, got '${value}'` };
  }

  switch (property) {
    case 'fontFamily': {
      if (!/^[a-zA-Z0-9 ,'"._-]+$/.test(value)) {
        return { ok: false, reason: `fontFamily must be a plausible font-family list, got '${value}'` };
      }
      return { ok: true };
    }
    case 'fontSize': {
      if (!isNonNegativeLength(value, 512) || parseFloat(value) <= 0) {
        return { ok: false, reason: `fontSize must be a positive bounded length (0, 512], got '${value}'` };
      }
      return { ok: true };
    }
    case 'fontWeight': {
      const lower = value.toLowerCase();
      if (NAMED_WEIGHTS.has(lower)) return { ok: true };
      const n = Number(value);
      if (!Number.isInteger(n) || n < 100 || n > 900 || n % 100 !== 0) {
        return { ok: false, reason: `fontWeight must be 100-900 in steps of 100, or a named weight, got '${value}'` };
      }
      return { ok: true };
    }
    case 'fontStyle': {
      if (!FONT_STYLE_VALUES.has(value.toLowerCase())) {
        return { ok: false, reason: `fontStyle must be one of ${[...FONT_STYLE_VALUES].join(', ')}, got '${value}'` };
      }
      return { ok: true };
    }
    case 'underline':
    case 'strikethrough':
    case 'doubleStrikethrough':
    case 'overline':
    case 'smallCaps':
    case 'superscript':
    case 'subscript': {
      if (!BOOLEAN_VALUES.has(value.toLowerCase())) {
        return { ok: false, reason: `${property} must be 'true' or 'false', got '${value}'` };
      }
      return { ok: true };
    }
    case 'capitalisation': {
      if (!CAPITALISATION_VALUES.has(value.toLowerCase())) {
        return { ok: false, reason: `capitalisation must be one of ${[...CAPITALISATION_VALUES].join(', ')}, got '${value}'` };
      }
      return { ok: true };
    }
    case 'underlineStyle': {
      if (!new Set(['solid', 'double', 'dotted', 'dashed', 'wavy']).has(value.toLowerCase())) {
        return { ok: false, reason: `underlineStyle must be solid, double, dotted, dashed, or wavy, got '${value}'` };
      }
      return { ok: true };
    }
    case 'letterSpacing':
    case 'wordSpacing':
    case 'baselineShift': {
      if (!isLength(value) || Math.abs(parseFloat(value)) > 100) {
        return { ok: false, reason: `${property} must be a length within [-100, 100], got '${value}'` };
      }
      return { ok: true };
    }
    case 'lineHeight': {
      const n = parseFloat(value);
      const unitless = /^\d+(\.\d+)?$/.test(value);
      if ((!unitless && !isNonNegativeLength(value, 20)) || !Number.isFinite(n) || n <= 0 || n > 20) {
        return { ok: false, reason: `lineHeight must be a positive number or bounded length (0, 20], got '${value}'` };
      }
      return { ok: true };
    }
    case 'textAlign': {
      if (!TEXT_ALIGN_VALUES.has(value.toLowerCase())) {
        return { ok: false, reason: `textAlign must be one of ${[...TEXT_ALIGN_VALUES].join(', ')}, got '${value}'` };
      }
      return { ok: true };
    }
    case 'direction': {
      if (!DIRECTION_VALUES.has(value.toLowerCase())) {
        return { ok: false, reason: `direction must be one of ${[...DIRECTION_VALUES].join(', ')}, got '${value}'` };
      }
      return { ok: true };
    }
    case 'radius':
    case 'padding': {
      /* These two are genuinely per-side in CSS, and the editor exposes them that way:
       * four corner sliders for radius, four edge sliders for padding. So the value may be
       * the ordinary one-to-four length shorthand as well as a single length. Every part is
       * still bounded individually -- the shorthand widens the shape, never the range. */
      const parts = value.split(/\s+/).filter((part) => part.length > 0);
      if (parts.length < 1 || parts.length > 4 || !parts.every((part) => isNonNegativeLength(part, 512))) {
        return {
          ok: false,
          reason: `${property} must be one to four non-negative bounded lengths [0, 512], got '${value}'`,
        };
      }
      return { ok: true };
    }
    case 'borderWidth':
    case 'gap': {
      if (!isNonNegativeLength(value, 512)) {
        return { ok: false, reason: `${property} must be a non-negative bounded length [0, 512], got '${value}'` };
      }
      return { ok: true };
    }
    case 'elevation': {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 24) {
        return { ok: false, reason: `elevation must be an integer within [0, 24], got '${value}'` };
      }
      return { ok: true };
    }
    case 'opacity': {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 1) {
        return { ok: false, reason: `opacity must be a number within [0, 1], got '${value}'` };
      }
      return { ok: true };
    }
    case 'outline':
    case 'shadow':
    case 'glow': {
      if (!/^[a-zA-Z0-9#(),.%+\-\s/]+$/.test(value)) {
        return { ok: false, reason: `${property} contains unsupported characters` };
      }
      return { ok: true };
    }
    default:
      return { ok: false, reason: `unknown property '${property as string}'` };
  }
}

export function validateRule(rule: AppearanceRule): ValidationResult {
  if (rule === null || typeof rule !== 'object') {
    return { ok: false, reason: 'rule must be an object' };
  }
  const elementCheck = validateElementId(rule.element);
  if (!elementCheck.ok) return elementCheck;

  if (!LEGACY_PROPERTY_SET.has(rule.property)) {
    return { ok: false, reason: `unknown property '${String(rule.property)}'` };
  }

  return validatePropertyValue(rule.property, rule.value);
}

// ---------------------------------------------------------------- resolve

/**
 * Precedence, most to least significant:
 *   1. The last matching rule for this exact element and property wins
 *      (later rules in the array override earlier ones for the same key —
 *      "last write wins", the same rule a CSS cascade or a settings merge
 *      would use).
 *   2. A rule scoped to the literal element id beats a rule scoped to the
 *      wildcard element id '*' (an "inherited"/default rule for every
 *      element), regardless of array order.
 *   3. No matching rule at any scope: undefined.
 */
export const WILDCARD_ELEMENT = '*';

export function resolve(theme: AppearanceTheme, element: string, property: AppearanceProperty): string | undefined {
  let exact: string | undefined;
  let wildcard: string | undefined;
  for (const rule of theme.rules) {
    if (rule.property !== property) continue;
    if (rule.element === element) {
      exact = rule.value;
    } else if (rule.element === WILDCARD_ELEMENT) {
      wildcard = rule.value;
    }
  }
  return exact !== undefined ? exact : wildcard;
}

// ---------------------------------------------------------------- applyTheme

const PROPERTY_TO_CSS_VAR: Record<AppearanceProperty, string> = {
  fontFamily: '--font-family',
  fontSize: '--font-size',
  fontWeight: '--font-weight',
  fontStyle: '--font-style',
  underline: '--text-underline',
  underlineStyle: '--text-underline-style',
  underlineColour: '--text-underline-colour',
  strikethrough: '--text-strikethrough',
  doubleStrikethrough: '--text-double-strikethrough',
  overline: '--text-overline',
  capitalisation: '--text-transform',
  smallCaps: '--font-small-caps',
  superscript: '--text-superscript',
  subscript: '--text-subscript',
  letterSpacing: '--letter-spacing',
  wordSpacing: '--word-spacing',
  lineHeight: '--line-height',
  baselineShift: '--baseline-shift',
  textAlign: '--text-align',
  direction: '--direction',
  colour: '--colour',
  background: '--background',
  highlight: '--highlight',
  borderColour: '--border-colour',
  outline: '--outline',
  shadow: '--shadow',
  glow: '--glow',
  radius: '--radius',
  borderWidth: '--border-width',
  padding: '--padding',
  gap: '--gap',
  elevation: '--elevation',
  opacity: '--opacity',
};

export function cssVarFor(property: AppearanceProperty): string {
  return PROPERTY_TO_CSS_VAR[property];
}

/**
 * Returns a flat map, keyed "elementId::--css-var", of every VALID rule's
 * resolved custom-property declaration. An invalid rule is silently absent
 * from the output — never partially applied, never a bad value on the page.
 */
export function applyTheme(theme: AppearanceTheme): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rule of theme.rules) {
    if (!validateRule(rule).ok) continue;
    const key = `${rule.element}::${cssVarFor(rule.property)}`;
    out[key] = rule.value;
  }
  return out;
}

// ---------------------------------------------------------------- resets

export function resetProperty(theme: AppearanceTheme, element: string, property: AppearanceProperty): AppearanceTheme {
  return {
    ...theme,
    rules: theme.rules.filter((r) => !(r.element === element && r.property === property)),
  };
}

export function resetElement(theme: AppearanceTheme, element: string): AppearanceTheme {
  return {
    ...theme,
    rules: theme.rules.filter((r) => r.element !== element),
  };
}

export function resetAll(theme: AppearanceTheme): AppearanceTheme {
  return { ...theme, rules: [] };
}

// ---------------------------------------------------------------- export / import

export const THEME_SCHEMA_VERSION = 1;

interface ExportedTheme {
  schemaVersion: number;
  id: string;
  name: string;
  rules: AppearanceRule[];
}

export function exportTheme(theme: AppearanceTheme): string {
  const payload: ExportedTheme = {
    schemaVersion: THEME_SCHEMA_VERSION,
    id: theme.id,
    name: theme.name,
    rules: theme.rules.map((r) => ({ ...r })),
  };
  return JSON.stringify(payload);
}

export interface ImportResult {
  theme: AppearanceTheme;
  rejected: Array<{ index: number; rule: unknown; reason: string }>;
}

export function importTheme(json: string): ImportResult | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    return { ok: false, reason: `theme JSON is not valid JSON: ${(err as Error).message}` };
  }
  if (parsed === null || typeof parsed !== 'object') {
    return { ok: false, reason: 'theme JSON must be an object' };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.schemaVersion !== THEME_SCHEMA_VERSION) {
    return { ok: false, reason: `unsupported theme schemaVersion, expected ${THEME_SCHEMA_VERSION}, got ${JSON.stringify(obj.schemaVersion)}` };
  }
  if (typeof obj.id !== 'string' || typeof obj.name !== 'string') {
    return { ok: false, reason: 'theme JSON must carry string id and name' };
  }
  if (!Array.isArray(obj.rules)) {
    return { ok: false, reason: 'theme JSON must carry a rules array' };
  }
  if (obj.rules.length > MAX_RULES) {
    return { ok: false, reason: `theme carries ${obj.rules.length} rules, exceeding the maximum of ${MAX_RULES}` };
  }

  const accepted: AppearanceRule[] = [];
  const rejected: Array<{ index: number; rule: unknown; reason: string }> = [];

  obj.rules.forEach((raw, index) => {
    if (raw === null || typeof raw !== 'object') {
      rejected.push({ index, rule: raw, reason: 'rule must be an object' });
      return;
    }
    const candidate = raw as AppearanceRule;
    const check = validateRule(candidate);
    if (!check.ok) {
      rejected.push({ index, rule: raw, reason: check.reason });
      return;
    }
    accepted.push({ element: candidate.element, property: candidate.property, value: candidate.value });
  });

  return {
    theme: { id: obj.id, name: obj.name, rules: accepted },
    rejected,
  };
}

// ---------------------------------------------------------------- rule-count enforcement

export function addRule(theme: AppearanceTheme, rule: AppearanceRule): AppearanceTheme | { ok: false; reason: string } {
  const check = validateRule(rule);
  if (!check.ok) return { ok: false, reason: check.reason };
  if (theme.rules.length >= MAX_RULES) {
    return { ok: false, reason: `theme already carries the maximum of ${MAX_RULES} rules` };
  }
  return {
    ...theme,
    rules: [...theme.rules.filter((r) => !(r.element === rule.element && r.property === rule.property)), rule],
  };
}

// ---------------------------------------------------------------- contrast warnings

export interface ContrastPair { element: string; largeText?: boolean }

export interface ContrastWarning {
  element: string;
  colour: string;
  background: string;
  ratio: number;
  verdict: 'fail' | 'AA' | 'AAA';
}

/**
 * Uses colour.ts's own contrast maths (never reimplemented here). Reports
 * every element whose resolved colour/background pair falls below AA.
 */
export function contrastWarnings(theme: AppearanceTheme, pairs: ReadonlyArray<ContrastPair>): ContrastWarning[] {
  const warnings: ContrastWarning[] = [];
  for (const pair of pairs) {
    const colourValue = resolve(theme, pair.element, 'colour');
    const backgroundValue = resolve(theme, pair.element, 'background');
    if (!colourValue || !backgroundValue) continue;
    if (colourValue === RAINBOW || backgroundValue === RAINBOW) continue;
    const fg = parseColour(colourValue);
    const bg = parseColour(backgroundValue);
    if (!fg || !bg) continue;

    // Local, deterministic re-derivation avoided: delegate to colour.ts.
    // (contrastRatio/contrastVerdict live there.)
    const ratio = contrastRatio(fg, bg);
    const verdict = contrastVerdict(ratio, pair.largeText ?? false);
    if (verdict === 'fail') {
      warnings.push({ element: pair.element, colour: colourValue, background: backgroundValue, ratio, verdict });
    }
  }
  return warnings;
}

// ---------------------------------------------------------------- export-loss description

export type ExportFormat = 'json' | 'css';

const FORMAT_LOSS: Partial<Record<AppearanceProperty, Partial<Record<ExportFormat, string>>>> = {
  highlight: { css: "CSS custom properties carry the value but no browser natively renders 'highlight' without extra markup support" },
  baselineShift: { css: 'baseline-shift has inconsistent support outside SVG text in CSS' },
};

export function describeLoss(theme: AppearanceTheme, format: ExportFormat): string[] {
  const messages: string[] = [];
  const seen = new Set<string>();
  for (const rule of theme.rules) {
    const loss = FORMAT_LOSS[rule.property]?.[format];
    if (!loss) continue;
    const key = `${rule.property}::${format}`;
    if (seen.has(key)) continue;
    seen.add(key);
    messages.push(`${rule.property} on '${rule.element}': ${loss}`);
  }
  return messages;
}

// ---------------------------------------------------------------- versioned runtime model

const RUNTIME_ELEMENT_PATTERN = /^[a-zA-Z][a-zA-Z0-9._:-]*$/;
const INTERACTION_STATE_SET = new Set<AppearanceInteractionState>(APPEARANCE_INTERACTION_STATES);
const RUNTIME_COLOUR_PROPERTIES = new Set<AppearanceProperty>([
  'colour', 'background', 'highlight', 'borderColour', 'underlineColour',
]);

export function validateStableElementId(elementId: string): ValidationResult {
  if (typeof elementId !== 'string' || elementId.length === 0) {
    return { ok: false, reason: 'elementId must be a non-empty stable identifier' };
  }
  if (elementId.length > MAX_APPEARANCE_ELEMENT_ID_LENGTH) {
    return {
      ok: false,
      reason: `elementId must be at most ${MAX_APPEARANCE_ELEMENT_ID_LENGTH} characters, got ${elementId.length}`,
    };
  }
  if (!RUNTIME_ELEMENT_PATTERN.test(elementId)) {
    return {
      ok: false,
      reason: `elementId '${elementId}' must start with a letter and contain only letters, digits, '.', '_', ':', or '-'`,
    };
  }
  return { ok: true };
}

export function validateAppearanceTarget(target: AppearanceTarget): ValidationResult {
  if (target === null || typeof target !== 'object') {
    return { ok: false, reason: 'target must be a global or element target object' };
  }
  if (target.scope === 'global') return { ok: true };
  if (target.scope !== 'element') {
    return { ok: false, reason: `unknown appearance target scope '${String((target as { scope?: unknown }).scope)}'` };
  }
  return validateStableElementId(target.elementId);
}

export function validateAppearanceValue(property: AppearanceProperty, value: AppearanceValue): ValidationResult {
  if (value === null || typeof value !== 'object') {
    return { ok: false, reason: `${property} value must be a discriminated appearance value` };
  }

  if (value.kind === 'rainbow') {
    if (!RUNTIME_COLOUR_PROPERTIES.has(property)) {
      return { ok: false, reason: `${property} does not accept the non-colour rainbow marker` };
    }
    if (!Number.isFinite(value.reducedMotionHue)) {
      return { ok: false, reason: 'rainbow reducedMotionHue must be finite' };
    }
    return { ok: true };
  }

  if (typeof value.value !== 'string' || value.value.length === 0) {
    return { ok: false, reason: `${property} value must be a non-empty string` };
  }
  if (value.value.length > MAX_APPEARANCE_VALUE_LENGTH) {
    return {
      ok: false,
      reason: `${property} value exceeds the ${MAX_APPEARANCE_VALUE_LENGTH}-character limit`,
    };
  }

  if (RUNTIME_COLOUR_PROPERTIES.has(property)) {
    if (value.kind !== 'colour') {
      return { ok: false, reason: `${property} requires a colour or rainbow value, not '${value.kind}'` };
    }
    return parseColour(value.value)
      ? { ok: true }
      : { ok: false, reason: `${property} is not a parseable colour` };
  }

  if (value.kind !== 'literal') {
    return { ok: false, reason: `${property} requires a literal value, not '${value.kind}'` };
  }
  return validatePropertyValue(property, value.value);
}

export function validateAppearanceOverride(override: AppearanceOverride): ValidationResult {
  if (override === null || typeof override !== 'object') {
    return { ok: false, reason: 'appearance override must be an object' };
  }
  const target = validateAppearanceTarget(override.target);
  if (!target.ok) return target;
  if (!INTERACTION_STATE_SET.has(override.state)) {
    return { ok: false, reason: `unknown appearance interaction state '${String(override.state)}'` };
  }
  if (!PROPERTY_SET.has(override.property)) {
    return { ok: false, reason: `unknown appearance property '${String(override.property)}'` };
  }
  return validateAppearanceValue(override.property, override.value);
}

export interface ResolvedAppearanceValue {
  readonly value: AppearanceValue;
  readonly source: 'element-state' | 'element-default' | 'global-state' | 'global-default';
  readonly override: AppearanceOverride;
}

/**
 * Resolution precedence is stable and explicit:
 * element state, element default, global state, then global default.
 */
export function resolveAppearanceValue(
  model: AppearanceModel,
  elementId: string,
  state: AppearanceInteractionState,
  property: AppearanceProperty,
): ResolvedAppearanceValue | undefined {
  const candidates: Array<{
    key: string;
    source: ResolvedAppearanceValue['source'];
  }> = [
    { key: appearanceOverrideKey({ scope: 'element', elementId }, state, property), source: 'element-state' },
    { key: appearanceOverrideKey({ scope: 'element', elementId }, 'default', property), source: 'element-default' },
    { key: appearanceOverrideKey({ scope: 'global' }, state, property), source: 'global-state' },
    { key: appearanceOverrideKey({ scope: 'global' }, 'default', property), source: 'global-default' },
  ];
  const indexed = new Map<string, AppearanceOverride>();
  for (const override of model.overrides) {
    indexed.set(appearanceOverrideKey(override.target, override.state, override.property), override);
  }
  for (const candidate of candidates) {
    const override = indexed.get(candidate.key);
    if (override) return { value: override.value, source: candidate.source, override };
  }
  return undefined;
}

export function upsertAppearanceOverride(model: AppearanceModel, override: AppearanceOverride): AppearanceModel {
  const check = validateAppearanceOverride(override);
  if (!check.ok) throw new Error(check.reason);
  const key = appearanceOverrideKey(override.target, override.state, override.property);
  return {
    ...model,
    revision: model.revision + 1,
    overrides: [
      ...model.overrides.filter((item) => appearanceOverrideKey(item.target, item.state, item.property) !== key),
      override,
    ],
  };
}

export function removeAppearanceOverride(
  model: AppearanceModel,
  target: AppearanceTarget,
  state: AppearanceInteractionState,
  property: AppearanceProperty,
): AppearanceModel {
  const key = appearanceOverrideKey(target, state, property);
  const overrides = model.overrides.filter(
    (item) => appearanceOverrideKey(item.target, item.state, item.property) !== key,
  );
  return overrides.length === model.overrides.length
    ? model
    : { ...model, revision: model.revision + 1, overrides };
}

export interface RuntimeContrastRequest {
  readonly elementId: string;
  readonly state: AppearanceInteractionState;
  readonly largeText?: boolean;
  readonly reducedMotion?: boolean;
}

export interface RuntimeContrastEvidence {
  readonly elementId: string;
  readonly state: AppearanceInteractionState;
  readonly status: 'evaluated' | 'not-evaluated';
  readonly foreground?: string;
  readonly background?: string;
  readonly ratio?: number;
  readonly verdict?: 'fail' | 'AA' | 'AAA';
  readonly reason?: string;
}

function appearanceColourForEvidence(
  value: AppearanceValue,
  reducedMotion: boolean,
  rainbowLevel: AppearanceModel['rainbowLevel'],
): string | undefined {
  if (value.kind === 'colour') return value.value;
  if (value.kind === 'rainbow') {
    if (!reducedMotion) return undefined;
    return resolveRainbow(value, true, rainbowLevel).cssColour;
  }
  return undefined;
}

export function runtimeContrastEvidence(
  model: AppearanceModel,
  requests: ReadonlyArray<RuntimeContrastRequest>,
): RuntimeContrastEvidence[] {
  return requests.map((request) => {
    const foregroundValue = resolveAppearanceValue(model, request.elementId, request.state, 'colour')?.value;
    const backgroundValue = resolveAppearanceValue(model, request.elementId, request.state, 'background')?.value;
    if (!foregroundValue || !backgroundValue) {
      return {
        elementId: request.elementId,
        state: request.state,
        status: 'not-evaluated',
        reason: 'Both foreground and background overrides are required for contrast evidence.',
      };
    }
    const foreground = appearanceColourForEvidence(foregroundValue, request.reducedMotion ?? false, model.rainbowLevel);
    const background = appearanceColourForEvidence(backgroundValue, request.reducedMotion ?? false, model.rainbowLevel);
    if (!foreground || !background) {
      return {
        elementId: request.elementId,
        state: request.state,
        status: 'not-evaluated',
        reason: 'Animated rainbow contrast changes over time; enable reduced motion or choose solid colours for a fixed ratio.',
      };
    }
    const parsedForeground = parseColour(foreground);
    const parsedBackground = parseColour(background);
    if (!parsedForeground || !parsedBackground) {
      return {
        elementId: request.elementId,
        state: request.state,
        status: 'not-evaluated',
        foreground,
        background,
        reason: 'One or both resolved colour values could not be parsed.',
      };
    }
    const ratio = contrastRatio(parsedForeground, parsedBackground);
    return {
      elementId: request.elementId,
      state: request.state,
      status: 'evaluated',
      foreground,
      background,
      ratio,
      verdict: contrastVerdict(ratio, request.largeText ?? false),
    };
  });
}

export { RAINBOW };
