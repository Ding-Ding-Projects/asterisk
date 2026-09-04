#!/usr/bin/env node
/**
 * The deterministic capture-route contract for design-parity evidence.
 *
 * A reference-versus-built comparison only means anything if both sides are captured at
 * the exact same screen, state, theme, viewport and display scale — the five-part tuple
 * this module calls the "capture tuple". This file is the one place that tuple is parsed,
 * substituted into a route, and turned into a concrete navigation plan; nothing downstream
 * (the diff tool, the evidence guard, a future capture driver) re-derives it independently.
 *
 * Two routes exist per destination, both filled from `design-parity.json`'s own committed
 * `evidenceTemplates` so there is exactly one source for the URL shape:
 *   - referenceRoute: the design-reference harness (console/design-reference/index.html).
 *   - builtRoute: a `ding-pbx://` deep link into the real running application.
 *
 * Reaching the reference side's exact destination is not a URL alone: the design export's
 * navigation is real UI (a rail icon, then a labelled section button), not a router, so
 * `navigationPlanFor` turns a destination id into the exact click sequence and settle
 * condition a headless driver must perform — derived from the real rendered labels
 * (destination-labels.generated.json), never guessed or hand-typed.
 */

import { normalizeCaptureTuple } from './design-parity-contract.mjs';

export const DEFAULT_TUPLE = Object.freeze({ state: 'default', theme: 'dark', width: 1440, height: 1000, scale: 1 });
const VALID_THEMES = new Set(['dark', 'light']);

function positiveNumber(params, key, fallback) {
  if (!params.has(key)) return fallback;
  const raw = params.get(key);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`parseCaptureTuple: '${key}' must be a positive number, got '${raw}'`);
  return value;
}

/** Parses a capture-route query string into the exact five-part tuple (plus destination). */
export function parseCaptureTuple(queryString) {
  const params = new URLSearchParams(queryString);
  const destination = params.get('destination');
  if (!destination) throw new Error("parseCaptureTuple: 'destination' is required and was not supplied");
  const theme = params.get('theme') ?? DEFAULT_TUPLE.theme;
  if (!VALID_THEMES.has(theme)) throw new Error(`parseCaptureTuple: 'theme' must be one of ${[...VALID_THEMES].join(', ')}, got '${theme}'`);
  const tuple = {
    destination,
    state: params.get('state') ?? DEFAULT_TUPLE.state,
    theme,
    width: positiveNumber(params, 'width', DEFAULT_TUPLE.width),
    height: positiveNumber(params, 'height', DEFAULT_TUPLE.height),
    scale: positiveNumber(params, 'scale', DEFAULT_TUPLE.scale),
  };
  if (params.has('locale')) tuple.locale = params.get('locale');
  return tuple;
}

function fillRoute(template, id, tuple) {
  if (typeof template !== 'string' || !template.includes('{id}')) {
    throw new Error(`fillRoute: template must contain the '{id}' placeholder, got '${template}'`);
  }
  const normalizedTuple = normalizeCaptureTuple(tuple ?? DEFAULT_TUPLE, 'capture route tuple');
  const filled = template.replaceAll('{id}', id);
  const questionMark = filled.indexOf('?');
  const path = questionMark === -1 ? filled : filled.slice(0, questionMark);
  const params = new URLSearchParams(questionMark === -1 ? '' : filled.slice(questionMark + 1));
  params.set('state', normalizedTuple.state);
  params.set('theme', normalizedTuple.theme);
  params.set('width', String(normalizedTuple.width));
  params.set('height', String(normalizedTuple.height));
  params.set('scale', String(normalizedTuple.scale));
  if (normalizedTuple.locale !== undefined) params.set('locale', normalizedTuple.locale);
  return `${path}?${params.toString()}`;
}

/** The design-reference harness route for one destination at one capture tuple. */
export function referenceRouteFor(inventory, id, tuple = DEFAULT_TUPLE) {
  return fillRoute(inventory.evidenceTemplates.referenceRoute, id, tuple);
}

/** The real application's deep-link route for one destination at one capture tuple. */
export function builtRouteFor(inventory, id, tuple = DEFAULT_TUPLE) {
  return fillRoute(inventory.evidenceTemplates.builtRoute, id, tuple);
}

/**
 * Turns a destination id into the exact, real click sequence a headless driver must
 * perform against the design-reference harness, plus the settle condition proving it
 * arrived. `labels` is the id -> {rail, label, title} map produced by
 * generate-design-parity-labels.mjs from the real compiled catalog — never hand-typed here.
 */
export function navigationPlanFor(id, labels, currentRail) {
  const entry = labels[id];
  if (!entry) throw new Error(`navigationPlanFor: unknown destination id '${id}' is not present in the labels map`);
  const steps = [];
  if (entry.rail !== currentRail) {
    steps.push({
      kind: 'click-rail',
      target: entry.rail,
      description: `Click the rail icon button for rail '${entry.rail}' (the design's own <RAIL> icon strip; there is no other way to switch rails).`,
    });
  }
  steps.push({
    kind: 'click-section',
    target: entry.label,
    description: `Within the now-open rail's section list, click the button whose visible text is exactly '${entry.label}'.`,
  });
  return {
    destinationId: id,
    steps,
    settle: {
      expectedHeading: entry.title,
      description: `Wait until the design's <h1> screen heading reads exactly '${entry.title}' before capturing.`,
    },
  };
}
