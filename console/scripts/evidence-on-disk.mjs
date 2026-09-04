#!/usr/bin/env node
/**
 * Proves that every evidence artifact a surface-completeness row claims really exists.
 *
 * The shape validators confirm each evidence template is well formed and each row
 * carries a status. Nothing there ever asks the filesystem whether the named article,
 * contract test, built-interaction record or capture is actually present, so a row can
 * assert `verified` while all six artifacts behind it are absent and the check still
 * reports clean. A guard that cannot fail is worse than no guard, because the green
 * tick is exactly what stops anyone looking.
 *
 * Only rows claiming `verified` are checked. A row still marked `unverified` is being
 * honest about being unproven, and the strict status gate already refuses it.
 *
 * A template may carry an anchor (`path/to/registry.json#{id}`): the file must exist
 * and must itself mention that feature id, because a registry created without the
 * row's own entry is not evidence for that row.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Proves every `exempt` row carries a written reason.
 *
 * An exemption is a decision and must cost something to make, or the status becomes a
 * quiet way of clearing a row nobody wants to do. Requiring a named reason, a decider
 * and a date means an exclusion stays legible as a choice — and means the next person
 * finds an argument to disagree with rather than a gap to fill in.
 */
export function verifyExemptions(inventory, exemptions) {
  const declared = new Map();
  for (const entry of exemptions?.exemptions ?? []) {
    for (const surface of entry.surfaces ?? []) {
      if (typeof entry.reason === 'string' && entry.reason.trim().length >= 40 && entry.decidedBy && entry.decidedOn) {
        declared.set(`${surface}.${entry.feature}`, entry);
      }
    }
  }

  const problems = [];
  let exemptRows = 0;
  for (const surface of inventory.surfaces) {
    for (const feature of surface.rows) {
      const key = `${surface.id}.${feature.id}`;
      if (feature.status === 'exempt') {
        exemptRows += 1;
        if (!declared.has(key)) {
          problems.push(`${key} is marked exempt with no recorded reason, decider and date in exemptions.json`);
        }
      } else if (declared.has(key)) {
        problems.push(`${key} has a recorded exemption but is not marked exempt, so the record and the inventory disagree`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`${problems.length} exemption problem(s):\n  - ${problems.join('\n  - ')}`);
  }
  return { exemptRows };
}

/**
 * Which per-surface feature registry speaks for each surface in the completeness
 * inventory.
 *
 * Declared here rather than derived, and a surface with no entry is a hard failure
 * below rather than a silent skip: a new surface arriving with no registry named would
 * otherwise be exempt from the check that its exemptions mean anything.
 */
export const EXEMPTION_SURFACE_REGISTRIES = {
  'windows-console': 'console/app/feature-registry.json',
  'pages-site': 'console/site/feature-registry.json',
};

/**
 * Proves that a feature recorded as excluded was actually left unbuilt, and that the
 * registry a reader is most likely to open says so.
 *
 * `verifyExemptions` above already ties the inventory to the exemption record in both
 * directions. Nothing tied either of them to the third record -- the per-surface feature
 * registry that says what exists -- and that gap is not hypothetical. On 2026-08-27 an
 * agent read `site/feature-registry.json`, found `local-file-converter` marked `absent`
 * with a note explaining only that the site's export formatters are not a converter,
 * took that as a gap to fill, built the whole feature with 57 contract tests and 48
 * planted breaks behind it, and set the registry row to `implemented`. Every existing
 * check stayed green: the site suite, the completeness validator, and this file's own
 * exemption check, which asks whether an exempt row has a REASON and never whether it
 * has been quietly built anyway. The exclusion was the owner's, recorded four days
 * earlier, and covered that exact surface.
 *
 * So two things are required of every exempt row, and the second is what would have
 * stopped that afternoon before it started:
 *
 *   - the registry must record the feature as `absent`, because an exclusion that has
 *     shipped is not an exclusion, and a row saying `implemented` under an exemption is
 *     the two records contradicting each other in the expensive direction;
 *   - the registry note must point at `exemptions.json` by name, so somebody reading
 *     the registry alone meets an argument they can disagree with rather than a gap
 *     that looks like an oversight. The pointer is required rather than the word
 *     "excluded", because a path is checkable and a word is a box to tick.
 */
export function verifyExemptionRegistries(inventory, exemptions, {
  root, read = readFileSync, registries = EXEMPTION_SURFACE_REGISTRIES,
} = {}) {
  if (typeof root !== 'string' || root.length === 0) {
    throw new Error('verifyExemptionRegistries requires an absolute repository root');
  }
  const recorded = new Map();
  for (const entry of exemptions?.exemptions ?? []) {
    for (const surface of entry.surfaces ?? []) recorded.set(`${surface}.${entry.feature}`, entry);
  }

  const problems = [];
  const loaded = new Map();
  let checked = 0;

  for (const surface of inventory.surfaces) {
    const relativePath = registries[surface.id];
    if (!relativePath) {
      problems.push(`${surface.id} names no feature registry, so nothing can check whether its exempt rows were built anyway`);
      continue;
    }
    if (!loaded.has(surface.id)) {
      try {
        loaded.set(surface.id, JSON.parse(read(resolve(root, relativePath), 'utf8')));
      } catch (error) {
        problems.push(`${surface.id}: ${relativePath} could not be read (${error.message})`);
        loaded.set(surface.id, null);
      }
    }
    const registry = loaded.get(surface.id);
    if (!registry) continue;

    for (const feature of surface.features) {
      if (feature.status !== 'exempt') continue;
      checked += 1;
      const key = `${surface.id}.${feature.id}`;
      const row = registry.features?.[feature.id];
      if (!row) {
        problems.push(`${key} is exempt and ${relativePath} carries no row for it at all`);
        continue;
      }
      const decided = recorded.get(key);
      const who = decided ? `${decided.decidedBy} on ${decided.decidedOn}` : 'an unrecorded decision';
      if (row.state !== 'absent') {
        problems.push(`${key} was excluded by ${who} and ${relativePath} records it as "${row.state}" -- an excluded feature has been built`);
      }
      if (!String(row.note ?? '').includes('exemptions.json')) {
        problems.push(`${key} is excluded by ${who} and its note in ${relativePath} never points at exemptions.json, so a reader of that file alone sees a gap to fill rather than a decision to argue with`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`${problems.length} exemption-registry problem(s):\n  - ${problems.join('\n  - ')}`);
  }
  return { checked };
}

export function verifyEvidenceOnDisk(inventory, { root, exists = existsSync, read = readFileSync } = {}) {
  if (typeof root !== 'string' || root.length === 0) {
    throw new Error('verifyEvidenceOnDisk requires an absolute repository root');
  }

  const missing = [];
  let checked = 0;
  let verifiedRows = 0;

  for (const surface of inventory.surfaces) {
    for (const feature of surface.rows) {
      if (feature.status !== 'verified') continue;
      verifiedRows += 1;
      for (const [kind, template] of Object.entries(surface.evidenceTemplates)) {
        const [relativePath, anchor] = template.replaceAll('{id}', feature.id).split('#');
        const absolute = resolve(root, relativePath);
        checked += 1;
        if (!exists(absolute)) {
          missing.push(`${surface.id}.${feature.id}: ${kind} evidence absent at ${relativePath}`);
          continue;
        }
        if (anchor && !read(absolute, 'utf8').includes(anchor)) {
          missing.push(`${surface.id}.${feature.id}: ${kind} evidence at ${relativePath} never mentions '${anchor}'`);
        }
      }
    }
  }

  if (missing.length > 0) {
    const shown = missing.slice(0, 12).join('\n  - ');
    const more = missing.length > 12 ? `\n  - ...and ${missing.length - 12} more` : '';
    throw new Error(`${missing.length} claimed evidence artifacts are absent:\n  - ${shown}${more}`);
  }

  return { checked, verifiedRows };
}
