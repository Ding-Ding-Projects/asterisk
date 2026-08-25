#!/usr/bin/env node
/**
 * The per-destination Material Design 3 conformance audit that a `verified` design-parity
 * row requires, alongside its captures, its whole-frame diff and its chrome-parity record.
 *
 * WHY THIS FILE EXISTS AT ALL, AND WHAT IT REFUSES TO BE. The design-parity inventory has
 * carried, for several passes, a sentence explaining that no `{id}-material.json` had been
 * written because "a generated audit nobody performed would be an invented verdict". That
 * is the right instinct and it is aimed at exactly one failure: a script that writes
 * `conforms: true` without looking at anything. This module is the opposite construction.
 * It cannot write a pass it did not measure, because `conforms` is computed from the
 * defect list and the defect list is computed from the rendered markup — there is no code
 * path here that can set `conforms` directly, and `auditMaterial` throws rather than
 * guessing when it is handed nothing to measure.
 *
 * WHAT IT MEASURES. Seven properties of the real rendered destination, each against a
 * published Material Design 3 specification value rather than against a number chosen
 * here:
 *
 *   1. type scale        — every explicit font-size must be one of the 15 M3 type-scale sizes
 *   2. icon size         — every icon glyph must be one of the 4 M3 icon sizes
 *   3. shape scale       — every corner radius must be one of the 6 M3 shape-scale values, or full
 *   4. elevation         — a shadow must be a two-layer M3 elevation, not a single custom layer
 *   5. state layers      — hover/pressed must be a translucent state layer, not an opaque swap
 *   6. touch targets     — an interactive element must reach the 48dp minimum
 *   7. motion            — durations and easings must be M3 motion tokens
 *
 * WHAT IT CANNOT MEASURE, stated here rather than left for a reader to discover. A static
 * audit of rendered markup reads declarations, not pixels. It cannot tell whether a
 * control that measures correctly is a real M3 component or a custom lookalike that
 * happens to share its numbers; it cannot see geometry that only exists after layout (a
 * flex child with no declared size); it cannot see a style injected at runtime; and it
 * cannot watch motion actually run. Every audit record carries these limits in its own
 * `notMeasured` field, so a row resting on one is resting on a stated bar rather than an
 * implied one. Closing them needs the same driven-build route the captures use.
 *
 * A NOTE ON THE DIRECTION OF ERROR. Every check here can only ever add a defect. A check
 * that fails to fire leaves a real divergence unreported, which is the ordinary cost of an
 * incomplete audit; no check can manufacture a conformance. That asymmetry is deliberate:
 * this file's whole purpose is that it may not invent a pass.
 */

/**
 * The Material Design 3 type scale, in dp. Fifteen roles across five groups — display,
 * headline, title, body and label — each at large/medium/small. Sizes only: this audit
 * does not attempt line height or tracking, which a static declaration frequently omits
 * and inherits.
 */
export const M3_TYPE_SCALE_PX = Object.freeze({
  57: 'display-large', 45: 'display-medium', 36: 'display-small',
  32: 'headline-large', 28: 'headline-medium', 24: 'headline-small',
  22: 'title-large', 16: 'title-medium/body-large', 14: 'title-small/body-medium/label-large',
  12: 'body-small/label-medium', 11: 'label-small',
});

/** The four Material Design 3 icon sizes, in dp. */
export const M3_ICON_SIZES_PX = Object.freeze([20, 24, 40, 48]);

/**
 * The Material Design 3 shape scale, in dp: none, extra-small, small, medium, large,
 * extra-large. "Full" is the seventh and is a fully-rounded shape rather than a fixed
 * number, so it is recognised separately below.
 */
export const M3_SHAPE_SCALE_PX = Object.freeze([0, 4, 8, 12, 16, 28]);

/** A radius at or above this, or a 50% radius, is the shape scale's "full" step. */
export const M3_SHAPE_FULL_MIN_PX = 999;

/**
 * Material Design 3 state-layer opacities. A state is communicated by laying the
 * element's own on-colour over it at one of these opacities — never by swapping the
 * element to a different opaque colour, which loses the underlying surface entirely.
 */
export const M3_STATE_LAYER_OPACITY = Object.freeze({ hover: 0.08, focus: 0.10, pressed: 0.10, dragged: 0.16 });

/** Material Design 3's minimum touch-target size, in dp, for any interactive element. */
export const M3_MIN_TOUCH_TARGET_PX = 48;

/**
 * Material Design 3 easing tokens, normalised to bare comma-separated control points so a
 * declaration written `.2,0,0,1` compares equal to one written `0.2, 0, 0, 1`.
 */
export const M3_EASING = Object.freeze({
  'standard': '0.2,0,0,1',
  'standard-decelerate': '0,0,0,1',
  'standard-accelerate': '0.3,0,1,1',
  'emphasized-decelerate': '0.05,0.7,0.1,1',
  'emphasized-accelerate': '0.3,0,0.8,0.15',
  'linear': 'linear',
});

/** Material Design 3 duration tokens, in milliseconds: short, medium, long and extra-long. */
export const M3_DURATIONS_MS = Object.freeze([50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 700, 800, 900, 1000]);

/** The seven check ids, in the order they are reported. Kept exported so a test can pin them. */
export const M3_CHECKS = Object.freeze(['typeScale', 'iconSize', 'shapeScale', 'elevation', 'stateLayer', 'touchTarget', 'motion']);

/**
 * What a static audit of rendered markup structurally cannot decide. Recorded into every
 * audit so the limit travels with the verdict instead of living only in this comment.
 */
export const NOT_MEASURED = Object.freeze([
  'component anatomy: whether a control whose numbers are correct is a real Material Design 3 component or a custom lookalike sharing its measurements',
  'post-layout geometry: the rendered size of an element that declares none, which only exists after layout in a real engine',
  'runtime-injected style: anything a script sets on an element after render',
  'observed motion: that a declared transition or animation actually runs, and runs for the duration it declares',
  'colour roles: whether a hard-coded colour corresponds to the Material Design 3 colour role its position calls for — this audit measures no colour tokens',
]);

const INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'select', 'textarea', 'summary']);

/**
 * A tolerant scanner over well-formed rendered markup. It returns start tags with their
 * attributes and nothing else — this audit reads declarations per element and never needs
 * the tree. Quote state is tracked so a `>` inside an attribute value cannot end a tag
 * early; `title` attributes in this design genuinely contain them.
 */
export function scanElements(html) {
  if (typeof html !== 'string' || html.length === 0) {
    throw new Error('design-parity-material: scanElements requires rendered markup');
  }
  const elements = [];
  let i = 0;
  while (i < html.length) {
    const open = html.indexOf('<', i);
    if (open === -1) break;
    const next = html[open + 1];
    if (!next || !/[a-zA-Z]/.test(next)) { i = open + 1; continue; }
    let j = open + 1;
    let quote = null;
    while (j < html.length) {
      const ch = html[j];
      if (quote) { if (ch === quote) quote = null; }
      else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '>') break;
      j += 1;
    }
    if (j >= html.length) break;
    const raw = html.slice(open + 1, j);
    const space = raw.search(/\s/);
    const tag = (space === -1 ? raw : raw.slice(0, space)).toLowerCase();
    elements.push({ tag, index: elements.length, attributes: parseAttributes(space === -1 ? '' : raw.slice(space)) });
    i = j + 1;
  }
  return elements;
}

function parseAttributes(text) {
  const attributes = {};
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    attributes[match[1].toLowerCase()] = match[3] ?? match[4] ?? '';
  }
  return attributes;
}

/** Splits an inline `style` attribute into a declaration map. */
export function parseInlineStyle(style) {
  const declarations = {};
  if (typeof style !== 'string') return declarations;
  let depth = 0;
  let start = 0;
  const parts = [];
  for (let i = 0; i < style.length; i += 1) {
    const ch = style[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ';' && depth === 0) { parts.push(style.slice(start, i)); start = i + 1; }
  }
  parts.push(style.slice(start));
  for (const part of parts) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const name = part.slice(0, colon).trim().toLowerCase();
    const value = part.slice(colon + 1).trim();
    if (name.length > 0) declarations[name] = value;
  }
  return declarations;
}

/**
 * Reads a length in dp. A bare `0` counts, and deliberately: CSS allows a unitless zero,
 * the design writes `border-radius:0`, and refusing it would report the shape scale's own
 * "none" step as a divergence from the shape scale.
 */
const pxOf = (value) => {
  const text = String(value ?? '').trim();
  if (/^-?0+(\.0+)?$/.test(text)) return 0;
  const match = /^(-?\d*\.?\d+)px$/.exec(text);
  return match ? Number(match[1]) : null;
};

/** Describes an element concisely enough to find it again, without dumping its markup. */
function describe(element) {
  const cls = element.attributes.class ? `.${element.attributes.class.split(/\s+/).join('.')}` : '';
  return `<${element.tag}${cls}> (element ${element.index})`;
}

const nearest = (value, allowed) => allowed.reduce((best, candidate) =>
  Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best, allowed[0]);

function checkTypeScale(elements) {
  const allowed = Object.keys(M3_TYPE_SCALE_PX).map(Number);
  const findings = [];
  for (const element of elements) {
    if ((element.attributes.class ?? '').split(/\s+/).includes('msym')) continue;
    const size = pxOf(parseInlineStyle(element.attributes.style)['font-size']);
    if (size === null) continue;
    if (allowed.includes(size)) continue;
    findings.push({
      element: describe(element), property: 'font-size', measured: `${size}px`,
      nearestSpecValue: `${nearest(size, allowed)}px`,
      why: 'the Material Design 3 type scale has 15 sizes and this is not one of them',
    });
  }
  return findings;
}

function checkIconSize(elements) {
  const findings = [];
  for (const element of elements) {
    if (!(element.attributes.class ?? '').split(/\s+/).includes('msym')) continue;
    const size = pxOf(parseInlineStyle(element.attributes.style)['font-size']);
    if (size === null) continue;
    if (M3_ICON_SIZES_PX.includes(size)) continue;
    findings.push({
      element: describe(element), property: 'font-size (icon glyph)', measured: `${size}px`,
      nearestSpecValue: `${nearest(size, M3_ICON_SIZES_PX)}px`,
      why: `Material Design 3 icons are drawn at ${M3_ICON_SIZES_PX.join('/')}dp`,
    });
  }
  return findings;
}

function checkShapeScale(elements) {
  const findings = [];
  for (const element of elements) {
    const raw = parseInlineStyle(element.attributes.style)['border-radius'];
    if (raw === undefined) continue;
    // Deduplicated per element: `border-radius:10px 10px 0 0` names one radius twice, and
    // reporting it twice would inflate the count without naming a second divergence.
    for (const token of [...new Set(String(raw).trim().split(/\s+/))]) {
      if (token === '50%') continue;
      const radius = pxOf(token);
      if (radius === null) {
        findings.push({
          element: describe(element), property: 'border-radius', measured: token,
          nearestSpecValue: 'one of 0/4/8/12/16/28px, or a fully-rounded shape',
          why: 'a radius this audit cannot read in dp cannot be placed on the Material Design 3 shape scale',
        });
        continue;
      }
      if (radius >= M3_SHAPE_FULL_MIN_PX) continue;
      if (M3_SHAPE_SCALE_PX.includes(radius)) continue;
      findings.push({
        element: describe(element), property: 'border-radius', measured: `${radius}px`,
        nearestSpecValue: `${nearest(radius, M3_SHAPE_SCALE_PX)}px`,
        why: 'the Material Design 3 shape scale is none/4/8/12/16/28dp plus full',
      });
    }
  }
  return findings;
}

/** Counts comma-separated shadow layers, ignoring commas inside rgb()/rgba(). */
function shadowLayers(value) {
  const layers = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) { layers.push(value.slice(start, i).trim()); start = i + 1; }
  }
  layers.push(value.slice(start).trim());
  return layers.filter((layer) => layer.length > 0);
}

function checkElevation(elements) {
  const findings = [];
  for (const element of elements) {
    const raw = parseInlineStyle(element.attributes.style)['box-shadow'];
    if (raw === undefined) continue;
    const value = String(raw).trim();
    if (value === 'none') continue;
    const layers = shadowLayers(value);
    if (layers.length === 2) continue;
    findings.push({
      element: describe(element), property: 'box-shadow', measured: value,
      nearestSpecValue: 'a two-layer Material Design 3 elevation (a key shadow plus an ambient shadow) at one of levels 0-5',
      why: `every Material Design 3 elevation level is drawn as two shadow layers; this declares ${layers.length}`,
    });
  }
  return findings;
}

function checkTouchTarget(elements) {
  const findings = [];
  for (const element of elements) {
    const declarations = parseInlineStyle(element.attributes.style);
    const interactive = INTERACTIVE_TAGS.has(element.tag)
      || 'data-window-button' in element.attributes
      || declarations.cursor === 'pointer';
    if (!interactive) continue;
    const width = pxOf(declarations.width);
    const height = pxOf(declarations.height);
    const short = [];
    if (width !== null && width < M3_MIN_TOUCH_TARGET_PX) short.push(`width ${width}px`);
    if (height !== null && height < M3_MIN_TOUCH_TARGET_PX) short.push(`height ${height}px`);
    if (short.length === 0) continue;
    findings.push({
      element: describe(element), property: 'touch target', measured: short.join(', '),
      nearestSpecValue: `${M3_MIN_TOUCH_TARGET_PX}px`,
      why: `Material Design 3 requires an interactive element to reach ${M3_MIN_TOUCH_TARGET_PX}dp in both axes, and no expanded target is declared here`,
    });
  }
  return findings;
}

const normaliseEasing = (value) => {
  const bezier = /cubic-bezier\(([^)]*)\)/.exec(value);
  if (!bezier) return value.trim().toLowerCase();
  return bezier[1].split(',').map((n) => String(Number(n.trim()))).join(',');
};

const durationsIn = (value) => [...value.matchAll(/(\d*\.?\d+)(ms|s)\b/g)]
  .map((match) => (match[2] === 's' ? Number(match[1]) * 1000 : Number(match[1])));

function checkMotion(elements, extraDeclarations) {
  const findings = [];
  const easings = Object.values(M3_EASING);
  const consider = (source, property, value) => {
    for (const ms of durationsIn(value)) {
      if (M3_DURATIONS_MS.includes(ms)) continue;
      const longest = M3_DURATIONS_MS[M3_DURATIONS_MS.length - 1];
      findings.push({
        element: source, property: `${property} (duration)`, measured: `${ms}ms`,
        nearestSpecValue: ms > longest
          ? `beyond the longest Material Design 3 duration token (${longest}ms)`
          : `${nearest(ms, M3_DURATIONS_MS)}ms`,
        why: 'Material Design 3 durations come from a fixed token set; this is not one of them',
      });
    }
    for (const bezier of value.matchAll(/cubic-bezier\([^)]*\)/g)) {
      const normalised = normaliseEasing(bezier[0]);
      if (easings.includes(normalised)) continue;
      findings.push({
        element: source, property: `${property} (easing)`, measured: bezier[0],
        nearestSpecValue: `one of the Material Design 3 easing tokens (${easings.filter((e) => e !== 'linear').join(' | ')})`,
        why: 'Material Design 3 motion uses its own easing tokens rather than an arbitrary curve',
      });
    }
  };
  for (const element of elements) {
    const declarations = parseInlineStyle(element.attributes.style);
    for (const property of ['transition', 'animation', 'transition-duration', 'animation-duration', 'transition-timing-function', 'animation-timing-function']) {
      if (declarations[property] === undefined) continue;
      consider(describe(element), property, String(declarations[property]));
    }
  }
  for (const declaration of extraDeclarations) {
    consider(declaration.source, declaration.property, declaration.value);
  }
  return findings;
}

/** True when a colour declaration is fully opaque, so laying it on hides the surface beneath. */
function isOpaqueColour(value) {
  const text = String(value).trim().toLowerCase();
  if (text === 'transparent' || text === 'none' || text === 'inherit' || text === 'currentcolor') return false;
  if (/^#[0-9a-f]{8}$/.test(text) || /^#[0-9a-f]{4}$/.test(text)) return false;
  const rgba = /^rgba?\(([^)]*)\)$/.exec(text);
  if (rgba) {
    const parts = rgba[1].split(/[,/]/).map((part) => part.trim());
    if (parts.length < 4) return true;
    return Number(parts[3]) >= 1;
  }
  return /^#[0-9a-f]{3}$|^#[0-9a-f]{6}$|^[a-z]+$/.test(text);
}

/**
 * Reads `selector:state{decls}` rules out of a stylesheet. Only the interaction states
 * matter here, so anything without one is skipped. Carriage returns are stripped first:
 * this checkout stores text files CRLF and a newline-only pattern would match nothing.
 */
export function parseInteractionRules(css) {
  if (typeof css !== 'string') return [];
  const rules = [];
  const pattern = /([^{}]+?):(hover|active|focus|focus-visible|focus-within)\s*\{([^}]*)\}/g;
  let match;
  while ((match = pattern.exec(css.replaceAll('\r', ''))) !== null) {
    rules.push({
      selector: `${match[1].trim()}:${match[2]}`,
      state: match[2],
      declarations: parseInlineStyle(match[3].replaceAll('!important', '')),
    });
  }
  return rules;
}

function checkStateLayer(rules) {
  const findings = [];
  for (const rule of rules) {
    if (rule.state === 'focus' || rule.state === 'focus-visible' || rule.state === 'focus-within') continue;
    for (const property of ['background', 'background-color']) {
      const value = rule.declarations[property];
      if (value === undefined) continue;
      if (!isOpaqueColour(value)) continue;
      const opacity = rule.state === 'hover' ? M3_STATE_LAYER_OPACITY.hover : M3_STATE_LAYER_OPACITY.pressed;
      findings.push({
        element: rule.selector, property, measured: value,
        nearestSpecValue: `a state layer: the element's own on-colour at ${Math.round(opacity * 100)}% over its existing surface`,
        why: 'Material Design 3 communicates an interaction state with a translucent state layer, not by swapping the element to a different opaque colour',
      });
    }
  }
  if (!rules.some((rule) => rule.state.startsWith('focus'))) {
    findings.push({
      element: 'the destination stylesheet as a whole', property: ':focus-visible', measured: 'no focus rule of any kind',
      nearestSpecValue: `a focus state layer at ${Math.round(M3_STATE_LAYER_OPACITY.focus * 100)}% plus a visible focus indicator`,
      why: 'Material Design 3 requires every interactive element to show a focus state, and no rule here declares one',
    });
  }
  return findings;
}

const EXAMPLE_LIMIT = 3;

/**
 * Audits one rendered destination and returns its evidence record.
 *
 * `conforms` is computed, never supplied: it is exactly `defects.length === 0`. There is
 * deliberately no option, override or argument that can set it, so this module cannot be
 * asked for a pass it did not measure.
 */
export function auditMaterial({ destinationId, html, stylesheet = '', extraDeclarations = [], source = {} } = {}) {
  if (typeof destinationId !== 'string' || destinationId.length === 0) {
    throw new Error('design-parity-material: auditMaterial requires a destinationId');
  }
  const elements = scanElements(html);
  if (elements.length === 0) {
    throw new Error(`design-parity-material: ${destinationId} rendered no elements — there is nothing here to audit`);
  }
  const interactionRules = parseInteractionRules(stylesheet);
  const findings = {
    typeScale: checkTypeScale(elements),
    iconSize: checkIconSize(elements),
    shapeScale: checkShapeScale(elements),
    elevation: checkElevation(elements),
    stateLayer: checkStateLayer(interactionRules),
    touchTarget: checkTouchTarget(elements),
    motion: checkMotion(elements, extraDeclarations),
  };

  const defects = [];
  for (const check of M3_CHECKS) {
    const found = findings[check];
    if (found.length === 0) continue;
    const examples = [...new Set(found.map((finding) => finding.measured))].slice(0, EXAMPLE_LIMIT);
    defects.push(`${check}: ${found.length} divergence(s) from the Material Design 3 specification (e.g. ${examples.join(', ')})`);
  }

  return {
    destinationId,
    bar: 'material-design-3',
    conforms: defects.length === 0,
    defects,
    elementsAudited: elements.length,
    interactionRulesAudited: interactionRules.length,
    checks: M3_CHECKS.map((check) => ({
      check,
      divergences: findings[check].length,
      conforms: findings[check].length === 0,
    })),
    findings,
    specification: {
      typeScalePx: Object.keys(M3_TYPE_SCALE_PX).map(Number),
      iconSizesPx: [...M3_ICON_SIZES_PX],
      shapeScalePx: [...M3_SHAPE_SCALE_PX],
      minimumTouchTargetPx: M3_MIN_TOUCH_TARGET_PX,
      stateLayerOpacity: { ...M3_STATE_LAYER_OPACITY },
      easingTokens: { ...M3_EASING },
      durationsMs: [...M3_DURATIONS_MS],
    },
    notMeasured: [...NOT_MEASURED],
    source,
  };
}

/** The one serialization every writer and every freshness check must agree on. */
export function serializeAudit(record) {
  return `${JSON.stringify(record, null, 2)}\n`;
}

/**
 * Names every audit record on disk that is missing, unreadable, or no longer what the
 * current renderer produces.
 *
 * This is the freshness half of the bar, and it is the half that decides whether a
 * committed audit means anything a month from now. A conformance verdict is a statement
 * about a screen; a verdict left behind by a renderer that has since changed is a
 * statement about a screen nobody can reach, which is the same staleness the capture
 * harness refuses everywhere else in this project.
 *
 * `read` is injected so a negative regression can plant exactly one stale record without
 * touching the committed evidence it is supposed to be protecting.
 */
export function findStaleRecords(records, { pathFor, read } = {}) {
  if (typeof pathFor !== 'function' || typeof read !== 'function') {
    throw new Error('design-parity-material: findStaleRecords requires pathFor and read');
  }
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('design-parity-material: findStaleRecords was given no records — a freshness check over nothing passes vacuously');
  }
  const stale = [];
  for (const record of records) {
    const expected = serializeAudit(record);
    let onDisk;
    try { onDisk = read(pathFor(record.destinationId)); } catch { onDisk = null; }
    if (onDisk === expected) continue;
    stale.push({ destinationId: record.destinationId, reason: onDisk === null ? 'absent or unreadable' : 'differs from what the current renderer produces' });
  }
  return stale;
}
