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

export function verifyEvidenceOnDisk(inventory, { root, exists = existsSync, read = readFileSync } = {}) {
  if (typeof root !== 'string' || root.length === 0) {
    throw new Error('verifyEvidenceOnDisk requires an absolute repository root');
  }

  const missing = [];
  let checked = 0;
  let verifiedRows = 0;

  for (const surface of inventory.surfaces) {
    for (const feature of surface.features) {
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
