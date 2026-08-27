/**
 * Bounded overlays.
 *
 * A pure placement calculator for every popover, menu, dropdown, tooltip and anchored
 * panel in the console, plus a check on the surface each one paints. Two failures this
 * design exists to prevent, both real and both invisible in a quick look at the markup:
 *
 *  - TRANSPARENT OVERLAYS. An overlay that renders with no background lets whatever sits
 *    behind it read straight through the text on top -- the fastest way to make a
 *    well-built dialog look broken. An overlay must declare its own background, border,
 *    elevation and shape; a value that is technically present but paints nothing
 *    ('transparent', 'none', an elevation of zero) is treated the same as an absent one,
 *    because it fails for the same reason.
 *  - CAPPED-AND-CLIPPED OVERLAYS. Capping an overlay's height and then hiding the
 *    overflow DELETES the content past the cap with no scrollbar to say anything is
 *    missing: a calendar loses its last week, a menu loses its last items. The
 *    calculator below never does that -- it bounds the size to the space actually
 *    available and reports when the result is smaller than what was asked for, so the
 *    caller knows to scroll rather than silently truncate.
 *
 * A third rule -- the overlay must never cover the control that opened it, never sit
 * under the surface that opened it, and never push the page into scroll -- is modelled
 * as three separate, checkable properties: `coversAnchor`, `overlayClearsAnchor`, and
 * unconditional containment inside the viewport rectangle.
 *
 * Pure logic only: no DOM, no Electron API, no measurement. Every rectangle and every
 * declared style value is a plain parameter, so the whole thing runs under `node:test`.
 */

export interface Rect { x: number; y: number; width: number; height: number }
export interface Size { width: number; height: number }

export const OVERLAY_SIDES = ['top', 'bottom', 'left', 'right'] as const;
export type OverlaySide = (typeof OVERLAY_SIDES)[number];

/** The overlay never touches the control it opened from; flush against it reads as one merged shape. */
export const OVERLAY_GAP_PX = 4;

const OPPOSITE_SIDE: Record<OverlaySide, OverlaySide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Keeps `start..start+size` fully inside `viewportStart..viewportStart+viewportSize`, given `size <= viewportSize`. */
function clampIntoViewport(start: number, size: number, viewportStart: number, viewportSize: number): number {
  const maxStart = viewportStart + Math.max(0, viewportSize - size);
  return clampNumber(start, viewportStart, maxStart);
}

/** Strict on purpose: rectangles that only share an edge are adjacent, not overlapping. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Space between the anchor and each viewport edge, minus the gap. Deliberately unclamped
 * (can be negative, or far larger than the viewport itself) -- side selection below needs
 * the raw number to compare candidates against each other and to notice an anchor that
 * sits outside the viewport entirely.
 */
function spaceBySide(anchor: Rect, viewport: Rect): Record<OverlaySide, number> {
  return {
    top: anchor.y - viewport.y - OVERLAY_GAP_PX,
    bottom: viewport.y + viewport.height - (anchor.y + anchor.height) - OVERLAY_GAP_PX,
    left: anchor.x - viewport.x - OVERLAY_GAP_PX,
    right: viewport.x + viewport.width - (anchor.x + anchor.width) - OVERLAY_GAP_PX,
  };
}

/** Preferred side first, then its opposite (a flip), then the two perpendicular sides, in a fixed order. */
function candidateOrder(preferred: OverlaySide): OverlaySide[] {
  const opposite = OPPOSITE_SIDE[preferred];
  const rest = OVERLAY_SIDES.filter((side) => side !== preferred && side !== opposite);
  return [preferred, opposite, ...rest];
}

function requiredExtent(side: OverlaySide, desired: Size): number {
  return side === 'top' || side === 'bottom' ? desired.height : desired.width;
}

export interface OverlayPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Which side of the anchor the overlay actually landed on -- may differ from what was asked for. */
  side: OverlaySide;
  /** True when either dimension was constrained below what was asked for: scroll inside, never crop. */
  scrollsInternally: boolean;
  /** False only when there was no usable space anywhere -- the overlay would render at zero size. */
  fits: boolean;
  /** Computed from the final rectangle, never assumed: the one guarantee this whole module exists for. */
  coversAnchor: boolean;
}

/**
 * Chooses where an overlay opens, how big it ends up, and whether it has to scroll.
 *
 * `preferredSide` is a request, not a promise: if there is not enough room, the
 * calculator tries the opposite side, then the two perpendicular sides, and finally
 * falls back to whichever side has the most room even if that is still not enough --
 * an overlay that cannot fit anywhere still gets a rectangle, just one with `fits: false`
 * rather than a thrown error or a rectangle that quietly claims to have worked.
 *
 * The chosen rectangle is ALWAYS fully inside `viewport`, on both axes, regardless of
 * where the anchor sits -- including an anchor that is partly or entirely outside the
 * viewport, which happens the moment a container scrolls. That is what stops an overlay
 * from ever pushing the page into scroll: it is never allowed to sit even one pixel
 * outside the bounds it was given.
 */
export function computeOverlayPlacement(
  anchor: Rect,
  desired: Size,
  viewport: Rect,
  preferredSide: OverlaySide = 'bottom',
): OverlayPlacement {
  const order = candidateOrder(preferredSide);
  const space = spaceBySide(anchor, viewport);

  let side = order.find((candidate) => space[candidate] >= requiredExtent(candidate, desired));
  if (side === undefined) {
    // Nothing has enough room. Do not throw and do not silently pick the preferred side
    // anyway -- report the least-bad option, so `fits` below can tell the caller the
    // truth instead of a rectangle that looks fine and renders at nearly zero size.
    side = order.reduce((best, candidate) => (space[candidate] > space[best] ? candidate : best), order[0]);
  }

  const axisViewportSize = side === 'top' || side === 'bottom' ? viewport.height : viewport.width;
  // Capped at the viewport's own extent, not just at zero: an anchor positioned far
  // outside the viewport (mid-scroll, or simply wrong) can report "space" far larger
  // than the viewport itself, which would otherwise size the overlay past the edge.
  const rawSpace = clampNumber(space[side], 0, axisViewportSize);

  let width: number;
  let height: number;
  if (side === 'top' || side === 'bottom') {
    height = clampNumber(desired.height, 0, rawSpace);
    width = clampNumber(desired.width, 0, viewport.width);
  } else {
    width = clampNumber(desired.width, 0, rawSpace);
    height = clampNumber(desired.height, 0, viewport.height);
  }

  let x: number;
  let y: number;
  switch (side) {
    case 'bottom': x = anchor.x; y = anchor.y + anchor.height + OVERLAY_GAP_PX; break;
    case 'top': x = anchor.x; y = anchor.y - OVERLAY_GAP_PX - height; break;
    case 'right': x = anchor.x + anchor.width + OVERLAY_GAP_PX; y = anchor.y; break;
    case 'left': x = anchor.x - OVERLAY_GAP_PX - width; y = anchor.y; break;
  }
  // Clamped on BOTH axes, not just the one the side flip already handled -- an anchor
  // hugging the left edge still needs its bottom-opening overlay pulled back on x, or a
  // dropdown near the corner would hang off the right edge of the viewport.
  x = clampIntoViewport(x, width, viewport.x, viewport.width);
  y = clampIntoViewport(y, height, viewport.y, viewport.height);

  return {
    x, y, width, height, side,
    scrollsInternally: width < desired.width || height < desired.height,
    fits: width > 0 && height > 0,
    coversAnchor: rectsOverlap({ x, y, width, height }, anchor),
  };
}

export const OVERLAY_SURFACE_FIELDS = ['background', 'border', 'elevation', 'shape'] as const;
export type OverlaySurfaceField = (typeof OVERLAY_SURFACE_FIELDS)[number];

export interface OverlaySurface {
  background?: string;
  border?: string;
  elevation?: number;
  shape?: string;
}

/** A value that is present but paints nothing counts the same as an absent one -- it fails for the same reason. */
const UNPAINTED_VALUES = new Set(['', 'none', 'transparent', 'inherit', 'initial', 'unset']);

function isPaintedString(value: string | undefined): boolean {
  return typeof value === 'string' && !UNPAINTED_VALUES.has(value.trim().toLowerCase());
}

/** Zero elevation does not separate the overlay from whatever sits behind it, so it reads as undeclared too. */
function isRealElevation(value: number | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export interface OverlaySurfaceCheck {
  decorated: boolean;
  missing: OverlaySurfaceField[];
}

/** Refuses an overlay that declares none of its four surface properties, and names exactly which are missing. */
export function checkOverlaySurface(surface: OverlaySurface): OverlaySurfaceCheck {
  const missing: OverlaySurfaceField[] = [];
  if (!isPaintedString(surface.background)) missing.push('background');
  if (!isPaintedString(surface.border)) missing.push('border');
  if (!isRealElevation(surface.elevation)) missing.push('elevation');
  if (!isPaintedString(surface.shape)) missing.push('shape');
  return { decorated: missing.length === 0, missing };
}

/**
 * True only when the overlay's own declared elevation is strictly higher than the
 * anchor's. An overlay with no declared elevation at all can never clear anything --
 * that is the surface check's job to catch first, not something this function should
 * paper over by treating "undeclared" as "high enough".
 */
export function overlayClearsAnchor(surface: OverlaySurface, anchorElevation: number): boolean {
  return typeof surface.elevation === 'number' && surface.elevation > anchorElevation;
}
