import { Component, createElement, Fragment, type ReactNode } from 'react';

/**
 * Runtime for the compiled design reference.
 *
 * The design's own component model is a class with `state`, `setState` and a
 * `renderVals()` method whose result is bound into the template. React class
 * components already provide the first three, so `DCLogic` only has to route
 * `renderVals()` into the compiled template.
 */
export abstract class DCLogic<P = Record<string, unknown>, S = Record<string, unknown>> extends Component<P, S> {
  /** Assigned by the generated module. */
  declare template: (values: Record<string, unknown>) => ReactNode;

  abstract renderVals(): Record<string, unknown>;

  render(): ReactNode {
    return this.template({ ...(this.props as Record<string, unknown>), ...this.renderVals() });
  }
}

export const h = createElement;

export function F(...children: ReactNode[]): ReactNode {
  return createElement(Fragment, null, ...children);
}

/** Keys every list entry the design iterates with `sc-for`. */
export function R(index: number, node: ReactNode): ReactNode {
  return createElement(Fragment, { key: index }, node);
}

/** `sc-for` tolerates a missing list; the design relies on that during transitions. */
export function A<T>(list: T[] | null | undefined): T[] {
  return Array.isArray(list) ? list : [];
}

/** Renders a bound value the way the design's text interpolation does. */
export function S(value: unknown): string {
  if (value === null || value === undefined || value === false) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

/** Bindings that resolve to a non-function (a placeholder, or a guarded action) must not crash. */
export function fn(value: unknown): ((event: unknown) => void) | undefined {
  return typeof value === 'function' ? (value as (event: unknown) => void) : undefined;
}

const styleCache = new Map<string, Record<string, string>>();

/** Converts the design's inline CSS text into a React style object. */
export function sty(text: string): Record<string, string> {
  const cached = styleCache.get(text);
  if (cached) return cached;
  const style: Record<string, string> = {};
  for (const declaration of splitDeclarations(text)) {
    const colon = declaration.indexOf(':');
    if (colon < 0) continue;
    const property = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (!property || !value) continue;
    style[property.startsWith('--') ? property : camel(property)] = value;
  }
  if (styleCache.size < 4000) styleCache.set(text, style);
  return style;
}

/** Semicolons inside `url()`, gradients and `cubic-bezier()` must not split a declaration. */
function splitDeclarations(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ';' && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out;
}

const camel = (property: string): string =>
  property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
