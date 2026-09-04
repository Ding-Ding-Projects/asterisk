/**
 * Rewrites the compiled title bar's application-name text to the chosen display name.
 *
 * The compiled design renders that text as a literal string with no bound value at all
 * -- `h("span", {...}, "Material Asterisk")` -- so there is nothing in `renderVals()` for
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

/**
 * `React.cloneElement(node, config, singleChildValue)` and
 * `React.cloneElement(node, config, ...manyChildren)` are not the same call. Passed a
 * whole array as that one `singleChildValue` -- which is what handing it `rewritten`
 * or `next` directly used to do whenever a node had more than one child -- React has
 * no way to tell the array apart from a `.map()` result nobody keyed, so it silently
 * skips its own "these were written as literal siblings, no key needed" bookkeeping
 * for every element inside. That bookkeeping is what stands between a normal,
 * static, multi-child node and a spurious "each child in a list should have a
 * unique key" warning the moment it renders inside any array -- which the title
 * bar's own row always does, since it sits inside the compiled shell's top-level
 * list of screens and overlays. Spreading the array back into individual arguments,
 * exactly as the original compiled call passed them, is what tells React they were
 * static children all along.
 */
function cloneWithChildren(node: ReactNode, children: ReactNode): ReactNode {
  return Array.isArray(children)
    ? cloneElement(node as never, undefined, ...children)
    : cloneElement(node as never, undefined, children);
}

/** Finds the `data-window-drag` node and returns it with its name span rewritten. */
export function withTitleBarName(tree: ReactNode, name: string, searchDepth = 8, brand?: ReactNode): ReactNode {
  return findDragRegion(tree, name, searchDepth, brand);
}

function findDragRegion(node: ReactNode, name: string, depth: number, brand?: ReactNode): ReactNode {
  const el = asElement(node);
  if (!el || depth < 0) return node;
  if (el.props[DRAG_MARKER] !== undefined) {
    const children = el.props.children;
    const rewritten = mapChildren(children, (child) => rewriteIconRow(child, name, brand));
    return rewritten === children ? node : cloneWithChildren(node, rewritten);
  }
  const children = el.props.children;
  if (children === undefined) return node;
  const rewritten = mapChildren(children, (child) => findDragRegion(child, name, depth - 1, brand));
  return rewritten === children ? node : cloneWithChildren(node, rewritten);
}

/**
 * Only the drag region's own child whose *direct* children include the leading
 * `msym` icon qualifies -- the connection pill, the menu strip and the window-control
 * buttons are left completely untouched, because none of them are that row.
 */
function rewriteIconRow(node: ReactNode, name: string, brand?: ReactNode): ReactNode {
  const el = asElement(node);
  if (!el) return node;
  const children = el.props.children;
  if (!Array.isArray(children) || !children.some(isIconSpan)) return node;
  let changed = false;
  let brandInserted = false;
  const next = children.map((child) => {
    const childEl = asElement(child);
    if (brand !== undefined && !brandInserted && isIconSpan(child)) {
      brandInserted = true;
      changed = true;
      /* A key makes this dynamically supplied child safe when the design row sits in
       * the generated shell's sibling arrays. The no-brand path remains equivalent to
       * the existing title-bar rewrite. */
      return isValidElement(brand)
        ? cloneElement(brand as never, { key: 'app-logo' })
        : brand;
    }
    const isNameSpan = !!childEl && childEl.type === 'span' && childEl.props.className !== ICON_CLASS
      && typeof childEl.props.children === 'string' && childEl.props.children.trim() !== '';
    if (!isNameSpan) return child;
    changed = true;
    return cloneElement(child as never, undefined, name);
  });
  return changed ? cloneWithChildren(node, next) : node;
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
