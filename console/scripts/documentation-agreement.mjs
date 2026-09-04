#!/usr/bin/env node
/**
 * Holds the two records of "does this feature exist on this surface" to each other.
 *
 * Every feature is described twice. Its surface's own implementation registry
 * (`app/feature-registry.json`, `site/feature-registry.json`) records a machine-readable
 * `state` of `absent`, `partial` or `implemented` with a note and the files behind it. Its
 * documentation article records the same fact in prose, under a `Desktop application:` or
 * `Documentation website:` heading. Both are evidence artifacts the surface-completeness
 * inventory names, and they are supposed to be saying the same thing.
 *
 * They are not. Measured over all 88 surface-feature pairs, 40 declared pairs agree, 40
 * disagree and 8 declare nothing at all — so half of what the documentation says about
 * whether a feature exists is contradicted by the registry beside it. Two records of one
 * fact that disagree destroy the credibility of both, and neither can be quietly preferred:
 * both have been found stale in this tree, in opposite directions. `language-modes` has an
 * article saying `not implemented` against a registry that records the day it landed and
 * names the module; `app-display-name` has a registry note reading `CORRECTED 2026-08-25:
 * … nameFor(surface, storage) … is never called anywhere` against code that calls it at
 * four sites and an article that describes those four sites correctly.
 *
 * Resolving each disagreement therefore means reading the code, one feature at a time, and
 * cannot be done by preferring a record. What this module does instead is refuse to let the
 * set change without anyone noticing:
 *
 *   - the census is pinned by exact membership, so a NEW disagreement fails the build the
 *     moment it appears rather than joining a pile nobody counts;
 *   - and a RESOLVED one fails too, until it is struck off the census, because the census is
 *     the record of what remains and a silently shrinking list is not a record.
 *
 * The stricter, per-row form of this lives in `evidence-integrity.mjs`, where a row claiming
 * `verified` is refused outright while its own two records disagree. This module is the
 * whole-tree census behind it.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  REGISTRY_STATE_TO_DOC_STATUS, SURFACE_REGISTRY_PATHS, SURFACE_STATUS_LABELS,
  canonicalImplementationStatus, readImplementationStatus,
} from './evidence-integrity.mjs';

/**
 * Reads the live state of all 88 pairs off disk.
 *
 * A pair is `undeclared` when the article states no status for that surface at all, which is
 * a different fact from a status that disagrees and is counted separately — an article that
 * has never said anything is a gap, and one that says the wrong thing is a contradiction.
 */
export function measureAgreement(inventory, options = {}) {
  const { root, readText = (absolute) => readFileSync(absolute, 'utf8') } = options;
  if (typeof root !== 'string' || root.length === 0) {
    throw new Error('measureAgreement requires an absolute repository root');
  }

  const registries = {};
  for (const [surfaceId, relativePath] of Object.entries(SURFACE_REGISTRY_PATHS)) {
    registries[surfaceId] = JSON.parse(readText(resolve(root, relativePath)));
  }

  const agreeing = [];
  const disagreements = [];
  const undeclared = [];
  for (const surface of inventory.surfaces) {
    const label = SURFACE_STATUS_LABELS[surface.id];
    const documentationTemplate = surface.evidenceTemplates.documentation.split('#')[0];
    for (const feature of surface.features) {
      const registryState = registries[surface.id].features?.[feature.id]?.state ?? null;
      let article = '';
      try { article = readText(resolve(root, documentationTemplate.replaceAll('{id}', feature.id))); }
      catch { article = ''; }
      const articleStatus = canonicalImplementationStatus(readImplementationStatus(article, label));
      const entry = { surface: surface.id, feature: feature.id, registryState, articleStatus };
      if (articleStatus === null) undeclared.push(entry);
      else if (REGISTRY_STATE_TO_DOC_STATUS[registryState] === articleStatus) agreeing.push(entry);
      else disagreements.push(entry);
    }
  }
  return { agreeing, disagreements, undeclared, pairs: agreeing.length + disagreements.length + undeclared.length };
}

const keyOf = (entry) => `${entry.surface}.${entry.feature}`;

function compareSet(pinnedEntries, measuredEntries, kind, problems) {
  const pinned = new Map(pinnedEntries.map((entry) => [keyOf(entry), entry]));
  const measured = new Map(measuredEntries.map((entry) => [keyOf(entry), entry]));
  for (const [key, entry] of measured) {
    if (!pinned.has(key)) {
      problems.push(`${key} is now ${kind} (registry '${entry.registryState}', article '${entry.articleStatus}') and the census does not list it`);
    }
  }
  for (const [key, entry] of pinned) {
    const found = measured.get(key);
    if (!found) {
      problems.push(`${key} is listed as ${kind} but no longer is — strike it off the census in the same change that resolved it, so the list stays a record of what remains`);
      continue;
    }
    if (found.registryState !== entry.registryState || found.articleStatus !== entry.articleStatus) {
      problems.push(`${key} is still ${kind} but has moved: the census records registry '${entry.registryState}' / article '${entry.articleStatus}', the tree now reads registry '${found.registryState}' / article '${found.articleStatus}'`);
    }
  }
}

export function verifyDocumentationAgreement(inventory, census, options = {}) {
  if (census?.schemaVersion !== 1) throw new Error('documentation agreement census: schemaVersion 1 required');
  for (const field of ['what', 'whyPinned', 'whyNeitherRecordWins']) {
    if (typeof census[field] !== 'string' || census[field].trim().length === 0) {
      throw new Error(`documentation agreement census: ${field} must say what it means`);
    }
  }
  const measured = measureAgreement(inventory, options);
  const problems = [];
  compareSet(census.disagreements ?? [], measured.disagreements, 'disagreeing', problems);
  compareSet(census.undeclared ?? [], measured.undeclared, 'undeclared', problems);

  const totals = census.totals ?? {};
  const actual = { pairs: measured.pairs, agree: measured.agreeing.length, disagree: measured.disagreements.length, undeclared: measured.undeclared.length };
  for (const [key, value] of Object.entries(actual)) {
    if (totals[key] !== value) problems.push(`census records ${key} as ${JSON.stringify(totals[key])} where the tree measures ${value}`);
  }
  /* The census's own arithmetic, kept because a hand-edited total that no longer sums is a
   * census nobody can read, and the three lists above would not notice. */
  if (actual.agree + actual.disagree + actual.undeclared !== actual.pairs) {
    throw new Error('documentation agreement: measured buckets do not sum to the pair count, so the measurement is wrong rather than the census');
  }

  if (problems.length > 0) {
    const shown = problems.slice(0, 12).join('\n  - ');
    const more = problems.length > 12 ? `\n  - ...and ${problems.length - 12} more` : '';
    throw new Error(`${problems.length} documentation-agreement census problem(s):\n  - ${shown}${more}`);
  }
  return actual;
}
