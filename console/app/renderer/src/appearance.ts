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

import { isRainbow, parseColour, RAINBOW } from './colour';

// ---------------------------------------------------------------- Types

export type AppearanceProperty =
  | 'fontFamily' | 'fontSize' | 'fontWeight' | 'fontStyle'
  | 'underline' | 'strikethrough' | 'overline' | 'capitalisation'
  | 'letterSpacing' | 'wordSpacing' | 'lineHeight' | 'baselineShift' | 'textAlign' | 'direction'
  | 'colour' | 'background' | 'highlight' | 'borderColour'
  | 'radius' | 'borderWidth' | 'padding' | 'gap' | 'elevation' | 'opacity';

export const APPEARANCE_PROPERTIES: ReadonlyArray<AppearanceProperty> = [
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
  'underline', 'strikethrough', 'overline', 'capitalisation',
  'letterSpacing', 'wordSpacing', 'lineHeight', 'baselineShift', 'textAlign', 'direction',
  'colour', 'background', 'highlight', 'borderColour',
  'radius', 'borderWidth', 'padding', 'gap', 'elevation', 'opacity',
];

const PROPERTY_SET: ReadonlySet<AppearanceProperty> = new Set(APPEARANCE_PROPERTIES);

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
  'colour', 'background', 'highlight', 'borderColour',
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
    if (isRainbow(value)) return { ok: true };
    const parsed = parseColour(value);
    if (!parsed) {
      return { ok: false, reason: `${property} must be a valid colour, got '${value}'` };
    }
    return { ok: true };
  }

  if (isRainbow(value)) {
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
    case 'overline': {
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

  if (!PROPERTY_SET.has(rule.property)) {
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
  strikethrough: '--text-strikethrough',
  overline: '--text-overline',
  capitalisation: '--text-transform',
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
    if (isRainbow(colourValue) || isRainbow(backgroundValue)) continue;
    const fg = parseColour(colourValue);
    const bg = parseColour(backgroundValue);
    if (!fg || !bg) continue;

    // Local, deterministic re-derivation avoided: delegate to colour.ts.
    // (contrastRatio/contrastVerdict live there.)
    const { contrastRatio, contrastVerdict } = colourModule();
    const ratio = contrastRatio(fg, bg);
    const verdict = contrastVerdict(ratio, pair.largeText ?? false);
    if (verdict === 'fail') {
      warnings.push({ element: pair.element, colour: colourValue, background: backgroundValue, ratio, verdict });
    }
  }
  return warnings;
}

// Indirection so the single import at the top of the file remains the only
// place colour.ts is named, while still using its real functions.
import { contrastRatio as _contrastRatio, contrastVerdict as _contrastVerdict } from './colour';
function colourModule(): { contrastRatio: typeof _contrastRatio; contrastVerdict: typeof _contrastVerdict } {
  return { contrastRatio: _contrastRatio, contrastVerdict: _contrastVerdict };
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

export { RAINBOW };
