#!/usr/bin/env node
/**
 * Proves that every evidence artifact a design-parity `verified` row claims actually
 * exists on disk AND actually says the capture matched.
 *
 * validateParityInventory (inventory-validation.mjs) only checks the inventory's own
 * SHAPE: that a `verified` row is spelled correctly and that a `compiled` row names its
 * compiler and test. It never asks the filesystem whether a reference/built capture, a
 * side-by-side comparison or a visual diff genuinely exists, and it never reads what that
 * diff actually concluded — so a row could claim `verified` while every artifact behind it
 * is absent, or worse, present but recording a real pixel mismatch, and the shape check
 * would still pass. This is the guard that closes that gap, in the same spirit as
 * evidence-on-disk.mjs (which does the equivalent job for surface-completeness.json).
 *
 * Presence is necessary but never sufficient: a `visualDiff` file that exists but whose
 * own JSON says `verdict: "diff"`, or names a different destination id, or reports an
 * unpainted (near-black) built capture, or a stale one, is refused exactly as if the file
 * were missing. A guard that only checks a file exists catches a thing forgotten and
 * never a thing done wrongly — this checks both.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ARTIFACT_KEYS = ['referenceCapture', 'builtCapture', 'sideBySide', 'visualDiff', 'materialAudit'];

export function verifyDesignParityEvidence(inventory, { root, exists = existsSync, read = readFileSync } = {}) {
  if (typeof root !== 'string' || root.length === 0) {
    throw new Error('verifyDesignParityEvidence requires an absolute repository root');
  }
  if (!Array.isArray(inventory?.destinations)) {
    throw new Error('verifyDesignParityEvidence: inventory.destinations array required');
  }

  const problems = [];
  let checked = 0;
  let verifiedRows = 0;

  for (const destination of inventory.destinations) {
    if (destination.status !== 'verified') continue;
    verifiedRows += 1;
    const id = destination.id;
    const paths = {};
    let missingArtifact = false;

    for (const key of ARTIFACT_KEYS) {
      const template = inventory.evidenceTemplates?.[key];
      if (typeof template !== 'string') {
        problems.push(`${id}: evidenceTemplates.${key} is missing from the inventory`);
        missingArtifact = true;
        continue;
      }
      const relativePath = template.replaceAll('{id}', id);
      const absolute = resolve(root, relativePath);
      paths[key] = absolute;
      checked += 1;
      if (!exists(absolute)) {
        problems.push(`${id}: ${key} evidence absent at ${relativePath}`);
        missingArtifact = true;
      }
    }
    // Never attempt to read and JSON-parse a file we just proved does not exist — that
    // would just trade one clear error for a confusing filesystem one.
    if (missingArtifact) continue;

    let diff;
    try {
      diff = JSON.parse(read(paths.visualDiff, 'utf8'));
    } catch (error) {
      problems.push(`${id}: visualDiff evidence is not valid JSON (${error.message})`);
      continue;
    }
    if (diff.destinationId !== id) {
      problems.push(`${id}: visualDiff evidence claims destination id '${diff.destinationId}', not '${id}' — this is evidence for a different row`);
    }
    if (diff.verdict !== 'match') {
      problems.push(`${id}: visualDiff verdict is '${diff.verdict}', not 'match' — a verified row needs a real pixel match, not merely an existing diff file`);
    }
    if (diff.paletteCheck?.thresholdExceeded !== false) {
      problems.push(`${id}: visualDiff paletteCheck.thresholdExceeded is not exactly false — the built capture may be unpainted rather than really rendered`);
    }
    if (diff.stalenessCheck?.stale !== false) {
      problems.push(`${id}: visualDiff stalenessCheck.stale is not exactly false — the built capture may predate its own build output`);
    }

    let audit;
    try {
      audit = JSON.parse(read(paths.materialAudit, 'utf8'));
    } catch (error) {
      problems.push(`${id}: materialAudit evidence is not valid JSON (${error.message})`);
      continue;
    }
    if (audit.destinationId && audit.destinationId !== id) {
      problems.push(`${id}: materialAudit evidence claims destination id '${audit.destinationId}', not '${id}'`);
    }
    if (audit.conforms !== true) {
      problems.push(`${id}: materialAudit.conforms is not exactly true — a verified row needs clean Material Design 3 conformance, not an absent verdict`);
    }
    if (Array.isArray(audit.defects) && audit.defects.length > 0) {
      problems.push(`${id}: materialAudit records ${audit.defects.length} unresolved conformance defect(s): ${audit.defects.join('; ')}`);
    }
  }

  if (problems.length > 0) {
    const shown = problems.slice(0, 12).join('\n  - ');
    const more = problems.length > 12 ? `\n  - ...and ${problems.length - 12} more` : '';
    throw new Error(`${problems.length} design-parity evidence problem(s):\n  - ${shown}${more}`);
  }

  return { checked, verifiedRows };
}
