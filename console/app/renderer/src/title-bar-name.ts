/**
 * Rewrites the compiled title bar's application-name text to the chosen display name.
 *
 * The compiled design renders that text as a literal string with no bound value at all
 * -- `h("span", {...}, "Ding PBX Console")` -- so there is nothing in `renderVals()` for
 * `App.tsx` to override the way every other live value on screen is overridden. The
 * renderer is compiled from the design reference and must never be hand-edited, and
 * editing the design reference itself would need a matching change to its independently
 * audited binding and expression counts for the sake of one label, which is a far bigger
 * and riskier change than renaming actually needs.
 *
 * So this works the same way `text-boundary.ts` already does for language and personal
 * vocabulary: it does not touch a generated or design file, it transforms the already
 * -built element tree on its way out of `render()`. Unlike that boundary, this cannot key
 * off the literal shipped-name string -- a personal vocabulary file is free to remap that
 * exact string to something else first, and doing so must not make the title bar
 * unreachable. Instead it is found structurally, in two narrowing steps:
 *
 *   1. The title bar carries a `data-window-drag` marker. `compile-design.mjs` throws at
 *      compile time unless that marker appears on exactly one node, so a search keyed on
 *      it cannot silently drift onto some other draggable-looking region.
 *   2. Inside it, the one row that carries the leading Material Symbols icon
 *      (`className: 'msym'`) among its *direct* children is the icon-and-name row --
 *      the connection pill, the menu strip and the window buttons do not qualify, even
 *      though the window buttons are themselves lone `msym` icons, because none of them
 *      sit as a *direct child of a `data-window-drag` child* the way the name row does.
 *      Within that one row, the sibling span that is not the icon itself, and whose only
 *      child is a plain string, is the application name -- replaced regardless of what
 *      it currently says, so a vocabulary-substituted shipped name is still found.
 *
 * A tree that does not contain the marker, or a marked region with no such row, is
 * returned unchanged rather than guessed at.
 */
import { cloneElement, isValidElement, type ReactNode } from 'react';

const DRAG_MARKER = 'data-window-drag';
const ICON_CLASS = 'msym';

interface ElementLike {
  type: unknown;
  props: Record<string, unknown> & { children?: ReactNode; className?: string };
}

function asElement(node: ReactNode): ElementLike | undefined {
  return isValidElement(node) ? (node as unknown as ElementLike) : undefined;
}

/** Finds the `data-window-drag` node and returns it with its name span rewritten. */
export function withTitleBarName(tree: ReactNode, name: string, searchDepth = 8): ReactNode {
  return findDragRegion(tree, name, searchDepth);
}

function findDragRegion(node: ReactNode, name: string, depth: number): ReactNode {
  const el = asElement(node);
  if (!el || depth < 0) return node;
  if (el.props[DRAG_MARKER] !== undefined) {
    const children = el.props.children;
    const rewritten = mapChildren(children, (child) => rewriteIconRow(child, name));
    return rewritten === children ? node : cloneElement(node as never, undefined, rewritten);
  }
  const children = el.props.children;
  if (children === undefined) return node;
  const rewritten = mapChildren(children, (child) => findDragRegion(child, name, depth - 1));
  return rewritten === children ? node : cloneElement(node as never, undefined, rewritten);
}

/**
 * Only the drag region's own child whose *direct* children include the leading
 * `msym` icon qualifies -- the connection pill, the menu strip and the window-control
 * buttons are left completely untouched, because none of them are that row.
 */
function rewriteIconRow(node: ReactNode, name: string): ReactNode {
  const el = asElement(node);
  if (!el) return node;
  const children = el.props.children;
  if (!Array.isArray(children) || !children.some(isIconSpan)) return node;
  let changed = false;
  const next = children.map((child) => {
    const childEl = asElement(child);
    const isNameSpan = !!childEl && childEl.type === 'span' && childEl.props.className !== ICON_CLASS
      && typeof childEl.props.children === 'string' && childEl.props.children.trim() !== '';
    if (!isNameSpan) return child;
    changed = true;
    return cloneElement(child as never, undefined, name);
  });
  return changed ? cloneElement(node as never, undefined, next) : node;
}

function isIconSpan(node: ReactNode): boolean {
  const el = asElement(node);
  return !!el && el.type === 'span' && el.props.className === ICON_CLASS;
}

function mapChildren(children: ReactNode, fn: (child: ReactNode) => ReactNode): ReactNode {
  if (Array.isArray(children)) {
    let changed = false;
    const next = children.map((child) => {
      const result = fn(child);
      if (result !== child) changed = true;
      return result;
    });
    return changed ? next : children;
  }
  return fn(children);
}
