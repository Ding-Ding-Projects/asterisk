import { Component, createElement, Fragment, type ReactNode } from 'react';

import { localizedCreateElement } from './text-boundary';

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

/**
 * The element factory the entire generated tree is built from -- and therefore the
 * single point every rendered string passes through. It is the localized factory
 * rather than React's own so that language modes and the personal vocabulary apply
 * to the compiled design without any generated file being edited. With no catalog
 * loaded and no vocabulary wired it is `createElement` with one string check, which
 * is what the English default costs.
 */
export const h = localizedCreateElement;

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

/** Validates one explicitly identity-bearing design loop without using labels, values, or indexes as identity. */
export function I<T>(list: T[] | null | undefined, designPath: string, loopVariable: string): Array<T & { id: string; key: string }> {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  return list.map((raw) => {
    if (raw === null || typeof raw !== 'object') throw new Error(`Design path ${designPath}, loop variable ${loopVariable} has a primitive producer without explicit id/key.`);
    const record = raw as { id?: unknown; key?: unknown };
    if (typeof record.id !== 'string' || typeof record.key !== 'string') throw new Error(`Design path ${designPath}, loop variable ${loopVariable} lacks explicit producer id/key.`);
    const stableId = record.id.trim();
    const stableKey = record.key.trim();
    if (!stableId || !stableKey || seen.has(stableId)) throw new Error(`Design path ${designPath}, loop variable ${loopVariable} has a missing or duplicate producer identity.`);
    seen.add(stableId);
    return raw as T & { id: string; key: string };
  });
}

/** Renders a bound value the way the design's text interpolation does. */
export function S(value: unknown): string {
  if (value === null || value === undefined || value === false) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

/** Explicit dynamic-item identity contract for compiled interactive loops. */
export function stableDynamicIdentity(value: unknown, designPath: string, loopVariable: string): string {
  if (value !== null && typeof value === 'object') {
    const record = value as { id?: unknown; key?: unknown };
    for (const candidate of [record.id, record.key]) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate;
    }
  }
  throw new Error(`Design path ${designPath}, loop variable ${loopVariable} lacks a stable id or key identity.`);
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
