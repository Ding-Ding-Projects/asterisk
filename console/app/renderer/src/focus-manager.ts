/**
 * Framework-neutral focus primitives for overlays, tab strips, and other composite widgets.
 *
 * The helpers use DOM interfaces at their boundary, but keep navigation decisions pure so React
 * components can consume them without giving this module ownership of rendering or application
 * state.
 */

export type FocusOrientation = 'horizontal' | 'vertical' | 'both';
export type FocusDirection = 'ltr' | 'rtl';
export type FocusRoot = Document | DocumentFragment | Element;

export interface RovingFocusItem {
  disabled?: boolean;
}

export interface RovingFocusRequest {
  key: string;
  currentIndex: number;
  items: ReadonlyArray<RovingFocusItem>;
  orientation: FocusOrientation;
  direction?: FocusDirection;
  loop?: boolean;
}

export interface RovingFocusResult {
  handled: boolean;
  index: number;
}

function enabledAt(items: ReadonlyArray<RovingFocusItem>, index: number): boolean {
  return index >= 0 && index < items.length && items[index]?.disabled !== true;
}

function endpoint(items: ReadonlyArray<RovingFocusItem>, fromStart: boolean): number | undefined {
  if (fromStart) {
    for (let index = 0; index < items.length; index += 1) {
      if (enabledAt(items, index)) return index;
    }
    return undefined;
  }
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (enabledAt(items, index)) return index;
  }
  return undefined;
}

function nextEnabled(
  items: ReadonlyArray<RovingFocusItem>,
  currentIndex: number,
  delta: -1 | 1,
  loop: boolean,
): number | undefined {
  if (items.length === 0) return undefined;
  let index = currentIndex;
  for (let visited = 0; visited < items.length; visited += 1) {
    index += delta;
    if (index < 0 || index >= items.length) {
      if (!loop) return undefined;
      index = index < 0 ? items.length - 1 : 0;
    }
    if (enabledAt(items, index)) return index;
  }
  return undefined;
}

/**
 * Resolve arrow, Home, and End navigation for a roving-focus composite.
 *
 * Horizontal right-to-left tab strips reverse their left/right direction. Vertical strips use
 * up/down. Disabled items are skipped, and an all-disabled collection leaves focus unchanged.
 */
export function moveRovingFocus(request: RovingFocusRequest): RovingFocusResult {
  const { key, items, orientation } = request;
  const current = enabledAt(items, request.currentIndex)
    ? request.currentIndex
    : (endpoint(items, true) ?? -1);

  if (key === 'Home') {
    return { handled: true, index: endpoint(items, true) ?? current };
  }
  if (key === 'End') {
    return { handled: true, index: endpoint(items, false) ?? current };
  }

  let delta: -1 | 1 | undefined;
  if ((orientation === 'horizontal' || orientation === 'both') && (key === 'ArrowLeft' || key === 'ArrowRight')) {
    const forward = request.direction === 'rtl' ? key === 'ArrowLeft' : key === 'ArrowRight';
    delta = forward ? 1 : -1;
  } else if ((orientation === 'vertical' || orientation === 'both') && (key === 'ArrowUp' || key === 'ArrowDown')) {
    delta = key === 'ArrowDown' ? 1 : -1;
  }

  if (!delta) return { handled: false, index: current };
  return {
    handled: true,
    index: nextEnabled(items, current, delta, request.loop ?? true) ?? current,
  };
}

export interface FocusSnapshot {
  /** The root is retained so a replacement element can be resolved in the same focus scope. */
  root: FocusRoot;
  /** Direct reference is preferred while the original element remains connected. */
  target: HTMLElement | null;
  /** Element-child indexes from the root provide a deterministic replacement lookup. */
  path: ReadonlyArray<number>;
}

function elementPath(root: FocusRoot, target: Element): number[] {
  const path: number[] = [];
  let current: Node | null = target;
  while (current && current !== root) {
    const ancestor: Node | null = current.parentNode;
    if (!ancestor || !('children' in ancestor)) return [];
    path.unshift(Array.prototype.indexOf.call(ancestor.children, current) as number);
    current = ancestor;
  }
  return current === root ? path : [];
}

function resolvePath(root: FocusRoot, path: ReadonlyArray<number>): HTMLElement | null {
  let current: FocusRoot = root;
  for (const index of path) {
    const child: Element | undefined = current.children[index];
    if (!child) return null;
    current = child;
  }
  return current instanceof HTMLElement ? current : null;
}

/** Capture the active element only when it belongs to the requested focus scope. */
export function captureFocus(root: FocusRoot = document): FocusSnapshot {
  const ownerDocument = root instanceof Document ? root : root.ownerDocument;
  const active = ownerDocument?.activeElement;
  const target = active instanceof HTMLElement && (root === ownerDocument || root.contains(active)) ? active : null;
  return { root, target, path: target ? elementPath(root, target) : [] };
}

export function isProgrammaticallyFocusable(element: HTMLElement | null): element is HTMLElement {
  if (!element || !element.isConnected) return false;
  if (element.hidden || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  if ('disabled' in element && (element as HTMLButtonElement).disabled) return false;
  return true;
}

export interface RestoreFocusOptions {
  fallback?: HTMLElement | null | (() => HTMLElement | null);
  preventScroll?: boolean;
}

/**
 * Restore focus to the original element, its deterministic replacement, or an explicit fallback.
 * Returns the element that received focus so callers can verify and log the actual outcome.
 */
export function restoreFocus(snapshot: FocusSnapshot, options: RestoreFocusOptions = {}): HTMLElement | null {
  const replacement = snapshot.path.length > 0 ? resolvePath(snapshot.root, snapshot.path) : null;
  const fallback = typeof options.fallback === 'function' ? options.fallback() : options.fallback;
  const target = [snapshot.target, replacement, fallback ?? null].find(isProgrammaticallyFocusable) ?? null;
  target?.focus({ preventScroll: options.preventScroll ?? true });
  return target;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/** Focus the first usable target in DOM order, optionally preferring an explicit element. */
export function focusFirst(scope: FocusRoot, preferred?: HTMLElement | null): HTMLElement | null {
  if (preferred && isProgrammaticallyFocusable(preferred)) {
    const focusTarget: HTMLElement = preferred;
    focusTarget.focus({ preventScroll: true });
    return focusTarget;
  }
  const target = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).find(isProgrammaticallyFocusable) ?? null;
  target?.focus({ preventScroll: true });
  return target;
}

/** Escape dismissal is an intent only. The owning component decides whether dismissal is allowed. */
export function isEscapeDismissIntent(key: string, isComposing = false): boolean {
  return key === 'Escape' && !isComposing;
}
