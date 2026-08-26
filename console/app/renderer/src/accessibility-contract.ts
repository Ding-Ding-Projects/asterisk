/**
 * Accessibility contract.
 *
 * The accessibility rules this app holds itself to, written down as data rather than as
 * something every screen author is trusted to remember. A rule that lives only in a
 * reviewer's head is a rule that gets skipped the day the reviewer is somebody else, or
 * the day the change is "just a small one". This module makes each rule a function a test
 * -- or a future runtime audit -- can call and get a straight answer from.
 *
 * Every threshold is a named exported constant with a comment saying where the number
 * comes from. A magic number inline is a rule nobody can find to change on purpose, and
 * a rule nobody can find is a rule that quietly drifts.
 *
 * Pure logic only. No DOM, no Electron API, no network, no clock. Anything that would
 * otherwise reach outside this module -- the platform's reduced-motion preference, a
 * stored setting -- is a parameter, so the whole contract can be exercised in a plain
 * node:test run with nothing running behind it.
 */

// ---------------------------------------------------------------- Contrast (WCAG 2.x)

/**
 * The sRGB-to-linear breakpoint from the WCAG 2.x relative luminance formula. Below this
 * normalised channel value the curve is treated as linear (divided by 12.92); at or above
 * it, the gamma curve applies. Getting this wrong (or the 2.4 exponent below) shifts every
 * ratio calculated from it, silently, by a few percent -- enough to flip a pass into a
 * borderline fail without anything in the code looking wrong.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export const SRGB_LINEAR_THRESHOLD = 0.03928;

/** The gamma exponent applied above the linear threshold. Same source as above. */
export const SRGB_GAMMA_EXPONENT = 2.4;

/** WCAG 2.x contrast ratio formula's fixed offset, applied to both the lighter and the
 * darker relative luminance before dividing. Prevents division by zero at pure black and
 * caps the ratio at 21:1 for black against white. */
export const CONTRAST_RATIO_OFFSET = 0.05;

/** AA minimum contrast ratio for normal-size text. WCAG 2.x Success Criterion 1.4.3. */
export const AA_NORMAL_TEXT_RATIO = 4.5;
/** AA minimum contrast ratio for large text (WCAG defines large as 18pt, or 14pt bold). */
export const AA_LARGE_TEXT_RATIO = 3;
/** AAA minimum contrast ratio for normal-size text. WCAG 2.x Success Criterion 1.4.6. */
export const AAA_NORMAL_TEXT_RATIO = 7;
/** AAA minimum contrast ratio for large text. Same source as above. */
export const AAA_LARGE_TEXT_RATIO = 4.5;

export interface RgbColour {
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
}

/**
 * Parses a hex colour string (#rgb, #rrggbb, with or without the leading #, either case).
 * Returns undefined for anything else rather than throwing, so a caller checking a
 * user-authored theme value can report "not a colour" instead of crashing the check.
 */
export function parseHexColour(hex: string): RgbColour | undefined {
  const trimmed = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [r, g, b] = trimmed.split('').map((c) => parseInt(c + c, 16));
    return { r, g, b };
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return {
      r: parseInt(trimmed.slice(0, 2), 16),
      g: parseInt(trimmed.slice(2, 4), 16),
      b: parseInt(trimmed.slice(4, 6), 16),
    };
  }
  return undefined;
}

function linearizeChannel(channel255: number): number {
  const normalised = Math.min(255, Math.max(0, channel255)) / 255;
  return normalised <= SRGB_LINEAR_THRESHOLD
    ? normalised / 12.92
    : ((normalised + 0.055) / 1.055) ** SRGB_GAMMA_EXPONENT;
}

/** WCAG 2.x relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(colour: RgbColour): number {
  const r = linearizeChannel(colour.r);
  const g = linearizeChannel(colour.g);
  const b = linearizeChannel(colour.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2.x contrast ratio between two colours, from 1 (identical) to 21 (black on white).
 * Order of the two arguments never matters -- the formula always divides the lighter
 * luminance by the darker one.
 */
export function contrastRatio(a: RgbColour, b: RgbColour): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + CONTRAST_RATIO_OFFSET) / (darker + CONTRAST_RATIO_OFFSET);
}

/** Same as {@link contrastRatio}, from two hex strings. Undefined if either fails to parse. */
export function contrastRatioFromHex(hexA: string, hexB: string): number | undefined {
  const a = parseHexColour(hexA);
  const b = parseHexColour(hexB);
  if (!a || !b) return undefined;
  return contrastRatio(a, b);
}

export type ContrastLevel = 'fail' | 'AA' | 'AAA';

/** Which level a ratio meets for the given text size. AAA implies AA; nothing implies fail. */
export function contrastLevel(ratio: number, largeText: boolean): ContrastLevel {
  const aaThreshold = largeText ? AA_LARGE_TEXT_RATIO : AA_NORMAL_TEXT_RATIO;
  const aaaThreshold = largeText ? AAA_LARGE_TEXT_RATIO : AAA_NORMAL_TEXT_RATIO;
  if (ratio >= aaaThreshold) return 'AAA';
  if (ratio >= aaThreshold) return 'AA';
  return 'fail';
}

// ---------------------------------------------------------------- Touch/click target sizing

/**
 * Minimum touch/click target size in CSS pixels. WCAG 2.2 Success Criterion 2.5.8
 * (Target Size, Minimum) sets 24x24 as the AA floor; this app targets that floor rather
 * than the higher 44x44 AAA figure some platform guidelines recommend, so a control
 * genuinely failing this check is failing the baseline, not a stricter house rule.
 */
export const MIN_TARGET_SIZE_PX = 24;

export interface TargetBox {
  /** Visible width of the control itself, before any padded hit area. */
  width: number;
  /** Visible height of the control itself, before any padded hit area. */
  height: number;
  /** Extra invisible hit area on each side, if the control pads its clickable region
   * beyond what is drawn. Absent or zero means the hit area is exactly the visible box. */
  paddedHitArea?: { top: number; right: number; bottom: number; left: number };
}

/**
 * Whether a control's actual clickable region meets the minimum target size. A control
 * that looks small but pads its hit area out to size (a small icon centred in a larger
 * invisible tap zone) passes; one that is small with no padding does not. The visible box
 * alone is never sufficient reason to fail something a user can actually hit.
 */
export function meetsTargetSize(box: TargetBox): boolean {
  const pad = box.paddedHitArea;
  const effectiveWidth = box.width + (pad ? pad.left + pad.right : 0);
  const effectiveHeight = box.height + (pad ? pad.top + pad.bottom : 0);
  return effectiveWidth >= MIN_TARGET_SIZE_PX && effectiveHeight >= MIN_TARGET_SIZE_PX;
}

export interface TargetSizeIssue {
  tooSmall: true;
  effectiveWidth: number;
  effectiveHeight: number;
}

/**
 * Reports the exact shortfall for a control that fails {@link meetsTargetSize}, or
 * undefined for one that passes. Kept separate from the boolean check so a caller building
 * a list of findings does not have to recompute the effective size to explain the failure.
 */
export function targetSizeIssue(box: TargetBox): TargetSizeIssue | undefined {
  if (meetsTargetSize(box)) return undefined;
  const pad = box.paddedHitArea;
  return {
    tooSmall: true,
    effectiveWidth: box.width + (pad ? pad.left + pad.right : 0),
    effectiveHeight: box.height + (pad ? pad.top + pad.bottom : 0),
  };
}

// ---------------------------------------------------------------- Accessible naming

/**
 * A glyph is never itself an accessible name. An emoji or a decorative icon character
 * placed as a control's only visible content renders in the accessibility tree as either
 * nothing or as an unhelpful Unicode description ("floppy disk"), neither of which tells
 * anyone what the control does. Detected as: no letters or digits anywhere in the string,
 * once whitespace is stripped -- a real word always has at least one.
 */
function isGlyphOnly(text: string): boolean {
  const stripped = text.trim();
  if (stripped.length === 0) return false; // empty is handled separately, not glyph-only
  return !/[\p{L}\p{N}]/u.test(stripped);
}

export interface AccessibleNameSources {
  /** Visible text content of the control, if any (a button's label, a link's text). */
  visibleText?: string;
  /** An explicit aria-label attribute. */
  ariaLabel?: string;
  /** Text resolved from an aria-labelledby reference, if the control uses one. */
  labelledByText?: string;
  /** Whether the control's only visible content is an icon (no text label beside it). */
  iconOnly?: boolean;
}

export interface AccessibleNameResult {
  /** The resolved accessible name, or empty if none of the sources produced one. */
  name: string;
  /** Which source won. Priority follows the same order the accessibility tree resolves
   * names in: an explicit aria-label beats labelledby, which beats visible text. */
  source: 'aria-label' | 'labelledby' | 'visible-text' | 'none';
}

/**
 * Resolves a control's accessible name from whichever source actually supplies one,
 * rejecting a source whose entire content is a glyph with no letters or digits in it --
 * a name that says nothing is the same defect as no name at all, and must not pass this
 * check by accident.
 */
export function resolveAccessibleName(sources: AccessibleNameSources): AccessibleNameResult {
  const ariaLabel = sources.ariaLabel?.trim();
  if (ariaLabel && !isGlyphOnly(ariaLabel)) return { name: ariaLabel, source: 'aria-label' };

  const labelledBy = sources.labelledByText?.trim();
  if (labelledBy && !isGlyphOnly(labelledBy)) return { name: labelledBy, source: 'labelledby' };

  const visible = sources.visibleText?.trim();
  if (visible && !isGlyphOnly(visible)) return { name: visible, source: 'visible-text' };

  return { name: '', source: 'none' };
}

/** Whether a control has an accessible name from any source, correctly excluding a
 * glyph-only string from counting as one. */
export function hasAccessibleName(sources: AccessibleNameSources): boolean {
  return resolveAccessibleName(sources).source !== 'none';
}

export interface NamingIssue {
  reason: 'missing-name' | 'icon-only-missing-name' | 'glyph-only-name';
}

/**
 * The specific naming failure for a control, or undefined if it passes. An icon-only
 * control gets its own reason code even though the underlying check is the same "no name"
 * failure, because an icon-only control missing a name is the single most common instance
 * of this defect in a toolbar and is worth flagging distinctly in a findings list.
 */
export function namingIssue(sources: AccessibleNameSources): NamingIssue | undefined {
  const resolved = resolveAccessibleName(sources);
  if (resolved.source !== 'none') return undefined;

  const onlySourceWasGlyph =
    [sources.ariaLabel, sources.labelledByText, sources.visibleText]
      .some((text) => text !== undefined && text.trim().length > 0 && isGlyphOnly(text.trim()));

  if (onlySourceWasGlyph) return { reason: 'glyph-only-name' };
  if (sources.iconOnly) return { reason: 'icon-only-missing-name' };
  return { reason: 'missing-name' };
}

// ---------------------------------------------------------------- Focus

export interface FocusableElement {
  /** Whether the element's focused state carries a visible indicator (an outline, a ring,
   * an underline -- anything a sighted keyboard user can see distinguishes it from
   * unfocused). A style that sets outline to none without supplying a replacement fails
   * this even if the browser's own default outline would otherwise have shown one, because
   * the element reports what it actually renders, not what it would have gotten for free. */
  hasVisibleFocusIndicator: boolean;
  /** The element's tabindex, if set. Absent means the element's natural tab order (0 for
   * a native interactive element, none for a non-interactive one not otherwise reachable). */
  tabIndex?: number;
}

export interface FocusIssue {
  reason: 'no-visible-focus-indicator' | 'positive-tabindex';
}

/**
 * A positive tabindex (1 or greater) pulls an element out of the document's natural
 * reading order and into an explicit numeric order that has to be maintained by hand
 * across every future edit to the page. WCAG 2.4.3 flags this as a trap: the first person
 * to insert a new focusable element without renumbering breaks the sequence for everyone
 * after it. tabindex="0" (join natural order) and tabindex="-1" (programmatic focus only)
 * are both fine; only a strictly positive value is the problem.
 */
export const MAX_SAFE_TABINDEX = 0;

/** The focus failures for an element, in the order they would be found: a missing visible
 * indicator is reported before a positive tabindex, since a user cannot even tell an
 * element is focused before they can ask whether it is reachable in a sane order. */
export function focusIssues(element: FocusableElement): FocusIssue[] {
  const issues: FocusIssue[] = [];
  if (!element.hasVisibleFocusIndicator) issues.push({ reason: 'no-visible-focus-indicator' });
  if (element.tabIndex !== undefined && element.tabIndex > MAX_SAFE_TABINDEX) {
    issues.push({ reason: 'positive-tabindex' });
  }
  return issues;
}

export function meetsFocusContract(element: FocusableElement): boolean {
  return focusIssues(element).length === 0;
}

// ---------------------------------------------------------------- Reduced motion

/**
 * Whether motion is permitted, given the platform's own preference and this app's own
 * setting. Mirrors the composition rule already used for low-stimulation mode: somebody
 * who told their operating system they want less motion has asked once, and an app
 * setting defaulting to "allow motion" must never override that -- so motion is reduced
 * whenever EITHER source asks for it, never only when both agree.
 */
export function motionPermitted(
  platformPrefersReducedMotion: boolean,
  appReducedMotionSetting: boolean,
): boolean {
  return !(platformPrefersReducedMotion || appReducedMotionSetting);
}

/** The inverse framing of {@link motionPermitted}, for call sites that read more naturally
 * asking "should this reduce" than "is this permitted". Always the exact opposite value. */
export function shouldReduceMotion(
  platformPrefersReducedMotion: boolean,
  appReducedMotionSetting: boolean,
): boolean {
  return !motionPermitted(platformPrefersReducedMotion, appReducedMotionSetting);
}
