/** Geometry and motion decisions shared by overlays, floating panels, and touch targets. */

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

export const MINIMUM_INTERACTIVE_TARGET = 48;

export interface MinimumTargetResult extends Size {
  addedInlineSize: number;
  addedBlockSize: number;
}

export function minimumTargetSize(size: Size, minimum = MINIMUM_INTERACTIVE_TARGET): MinimumTargetResult {
  const safeMinimum = Number.isFinite(minimum) ? Math.max(1, minimum) : MINIMUM_INTERACTIVE_TARGET;
  const width = Number.isFinite(size.width) ? Math.max(0, size.width) : 0;
  const height = Number.isFinite(size.height) ? Math.max(0, size.height) : 0;
  return {
    width: Math.max(width, safeMinimum),
    height: Math.max(height, safeMinimum),
    addedInlineSize: Math.max(0, safeMinimum - width),
    addedBlockSize: Math.max(0, safeMinimum - height),
  };
}

export type OverlayPlacement = 'bottom' | 'top' | 'right' | 'left';

export interface OverlayGeometryRequest {
  anchor: Rect;
  desired: Size;
  viewport: Rect;
  preferred?: ReadonlyArray<OverlayPlacement>;
  margin?: number;
  gap?: number;
}

export interface OverlayGeometry extends Rect {
  placement: OverlayPlacement;
  maxWidth: number;
  maxHeight: number;
  scrollX: boolean;
  scrollY: boolean;
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (maximum < minimum) return minimum;
  return Math.min(Math.max(value, minimum), maximum);
}

function availableSpace(request: OverlayGeometryRequest, placement: OverlayPlacement, margin: number, gap: number): Size {
  const viewportRight = request.viewport.x + request.viewport.width - margin;
  const viewportBottom = request.viewport.y + request.viewport.height - margin;
  const anchorRight = request.anchor.x + request.anchor.width;
  const anchorBottom = request.anchor.y + request.anchor.height;
  if (placement === 'bottom') return { width: viewportRight - (request.viewport.x + margin), height: viewportBottom - anchorBottom - gap };
  if (placement === 'top') return { width: viewportRight - (request.viewport.x + margin), height: request.anchor.y - (request.viewport.y + margin) - gap };
  if (placement === 'right') return { width: viewportRight - anchorRight - gap, height: viewportBottom - (request.viewport.y + margin) };
  return { width: request.anchor.x - (request.viewport.x + margin) - gap, height: viewportBottom - (request.viewport.y + margin) };
}

/**
 * Place an overlay beside its anchor. When no side fits completely, use the side with the largest
 * usable area and return scrolling metadata instead of allowing content outside the viewport.
 */
export function placeAnchoredOverlay(request: OverlayGeometryRequest): OverlayGeometry {
  const margin = Math.max(0, request.margin ?? 8);
  const gap = Math.max(0, request.gap ?? 8);
  const preferred = request.preferred && request.preferred.length > 0
    ? request.preferred
    : ['bottom', 'top', 'right', 'left'] as const;
  const candidates = preferred.map((placement) => ({
    placement,
    space: availableSpace(request, placement, margin, gap),
  }));
  const fullFit = candidates.find(({ space }) => space.width >= request.desired.width && space.height >= request.desired.height);
  const selected = fullFit ?? candidates.reduce((best, candidate) => {
    const bestArea = Math.max(0, best.space.width) * Math.max(0, best.space.height);
    const candidateArea = Math.max(0, candidate.space.width) * Math.max(0, candidate.space.height);
    return candidateArea > bestArea ? candidate : best;
  });

  const maxWidth = Math.max(0, selected.space.width);
  const maxHeight = Math.max(0, selected.space.height);
  const width = Math.min(Math.max(0, request.desired.width), maxWidth);
  const height = Math.min(Math.max(0, request.desired.height), maxHeight);
  const left = request.viewport.x + margin;
  const top = request.viewport.y + margin;
  const right = request.viewport.x + request.viewport.width - margin;
  const bottom = request.viewport.y + request.viewport.height - margin;
  const anchorRight = request.anchor.x + request.anchor.width;
  const anchorBottom = request.anchor.y + request.anchor.height;

  let x: number;
  let y: number;
  if (selected.placement === 'bottom') {
    x = clamp(request.anchor.x, left, right - width);
    y = anchorBottom + gap;
  } else if (selected.placement === 'top') {
    x = clamp(request.anchor.x, left, right - width);
    y = request.anchor.y - gap - height;
  } else if (selected.placement === 'right') {
    x = anchorRight + gap;
    y = clamp(request.anchor.y, top, bottom - height);
  } else {
    x = request.anchor.x - gap - width;
    y = clamp(request.anchor.y, top, bottom - height);
  }

  return {
    x: clamp(x, left, right - width),
    y: clamp(y, top, bottom - height),
    width,
    height,
    placement: selected.placement,
    maxWidth,
    maxHeight,
    scrollX: request.desired.width > width,
    scrollY: request.desired.height > height,
  };
}

export type PanelKeyboardMode = 'move' | 'resize';

export interface PanelKeyboardRequest {
  key: string;
  mode: PanelKeyboardMode;
  shiftKey?: boolean;
  step?: number;
  largeStep?: number;
}

export interface PanelKeyboardDelta {
  handled: boolean;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/** Keyboard contract for panel movement and edge resizing. */
export function panelKeyboardDelta(request: PanelKeyboardRequest): PanelKeyboardDelta {
  const amount = request.shiftKey ? (request.largeStep ?? 32) : (request.step ?? 8);
  const vector: Record<string, readonly [number, number]> = {
    ArrowLeft: [-amount, 0],
    ArrowRight: [amount, 0],
    ArrowUp: [0, -amount],
    ArrowDown: [0, amount],
  };
  const [x, y] = vector[request.key] ?? [0, 0];
  if (x === 0 && y === 0) return { handled: false, dx: 0, dy: 0, dw: 0, dh: 0 };
  return request.mode === 'move'
    ? { handled: true, dx: x, dy: y, dw: 0, dh: 0 }
    : { handled: true, dx: 0, dy: 0, dw: x, dh: y };
}

export interface MotionPreferenceInput {
  systemReducedMotion: boolean;
  userReducedMotion?: boolean;
  motionEnabled?: boolean;
}

export interface MotionPreference {
  animate: boolean;
  durationScale: 0 | 1;
  reason: 'system-reduced-motion' | 'user-reduced-motion' | 'motion-disabled' | 'motion-allowed';
}

/** System reduced motion wins over application preferences and settles animation completely. */
export function resolveMotionPreference(input: MotionPreferenceInput): MotionPreference {
  if (input.systemReducedMotion) return { animate: false, durationScale: 0, reason: 'system-reduced-motion' };
  if (input.userReducedMotion) return { animate: false, durationScale: 0, reason: 'user-reduced-motion' };
  if (input.motionEnabled === false) return { animate: false, durationScale: 0, reason: 'motion-disabled' };
  return { animate: true, durationScale: 1, reason: 'motion-allowed' };
}

/** Keep a moved or resized panel recoverable inside the current viewport. */
export function clampPanelToViewport(panel: Rect, viewport: Rect, margin = 8, minimum: Size = { width: 160, height: 96 }): Rect {
  const safeMargin = Math.max(0, margin);
  const maxWidth = Math.max(0, viewport.width - safeMargin * 2);
  const maxHeight = Math.max(0, viewport.height - safeMargin * 2);
  const width = clamp(panel.width, Math.min(minimum.width, maxWidth), maxWidth);
  const height = clamp(panel.height, Math.min(minimum.height, maxHeight), maxHeight);
  return {
    x: clamp(panel.x, viewport.x + safeMargin, viewport.x + viewport.width - safeMargin - width),
    y: clamp(panel.y, viewport.y + safeMargin, viewport.y + viewport.height - safeMargin - height),
    width,
    height,
  };
}
