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
 * Presence is necessary but never sufficient: an evidence file that exists but whose own
 * JSON names a different destination id, or reports an unpainted (near-black) built
 * capture, or a stale one, is refused exactly as if the file were missing. A guard that
 * only checks a file exists catches a thing forgotten and never a thing done wrongly —
 * this checks both.
 *
 * WHICH BAR A `verified` ROW HAS TO MEET, and why it changed. This guard used to require
 * the whole-frame `visualDiff` to record a `match`, meaning the two captures were
 * pixel-identical everywhere. That is unreachable in this project by deliberate product
 * decision rather than by any defect: the design shows invented sample content exactly
 * where the application shows the target's real readings, so half of every frame differs
 * for a reason nobody wants fixed, and no row could ever be verified. The bar is now
 * `chromeParity` (design-parity-chrome.mjs): outside the regions declared as data-bearing,
 * the two artifacts must render identically. The whole-frame `visualDiff` is still
 * required and still read — it is the record of how far the data diverges — but it is now
 * required to be a real comparison rather than a match, and a `refused` one (unpainted or
 * stale) is refused exactly as before. The chrome record must additionally cite the same
 * mask the region ledger recorded, so a passing comparison cannot rest on rectangles
 * nobody measured.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ARTIFACT_KEYS = ['referenceCapture', 'builtCapture', 'sideBySide', 'visualDiff', 'regionLedger', 'chromeParity', 'materialAudit'];
const rectKey = (rect) => `${rect?.x},${rect?.y},${rect?.width},${rect?.height}`;

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
    if (diff.verdict === 'refused') {
      problems.push(`${id}: visualDiff verdict is 'refused' (${(diff.reasons ?? []).join('; ') || 'no reason recorded'}) — the whole-frame comparison never happened, so nothing was measured to divide into chrome and data`);
    }
    if (diff.paletteCheck?.thresholdExceeded !== false) {
      problems.push(`${id}: visualDiff paletteCheck.thresholdExceeded is not exactly false — the built capture may be unpainted rather than really rendered`);
    }
    if (diff.stalenessCheck?.stale !== false) {
      problems.push(`${id}: visualDiff stalenessCheck.stale is not exactly false — the built capture may predate its own build output`);
    }

    let ledger;
    try {
      ledger = JSON.parse(read(paths.regionLedger, 'utf8'));
    } catch (error) {
      problems.push(`${id}: regionLedger evidence is not valid JSON (${error.message})`);
      continue;
    }
    if (ledger.destinationId !== id) {
      problems.push(`${id}: regionLedger claims destination id '${ledger.destinationId}', not '${id}' — this is a mask measured on a different screen`);
    }
    if (!Array.isArray(ledger.exclusions) || ledger.exclusions.length === 0) {
      problems.push(`${id}: regionLedger declares no exclusions — the chrome-parity bar would then be whole-frame pixel identity under a different name`);
    }
    if (!Array.isArray(ledger.comparedAreas) || ledger.comparedAreas.length === 0) {
      problems.push(`${id}: regionLedger names no compared areas — a bar that compares nothing passes vacuously`);
    }
    // Every area the ledger measured must have a role the inventory declared. An area with
    // no declared role is one somebody added to the probe without deciding whether it
    // carries data, and it would be silently treated as chrome.
    const declared = inventory.chromeParityBar?.areas ?? {};
    for (const [name, area] of Object.entries(ledger.areas ?? {})) {
      if (!declared[name]) problems.push(`${id}: regionLedger measured an area '${name}' that chromeParityBar.areas declares no role for`);
      else if (declared[name].role !== area.role) problems.push(`${id}: regionLedger records area '${name}' as '${area.role}' while chromeParityBar declares it '${declared[name].role}'`);
    }

    let chrome;
    try {
      chrome = JSON.parse(read(paths.chromeParity, 'utf8'));
    } catch (error) {
      problems.push(`${id}: chromeParity evidence is not valid JSON (${error.message})`);
      continue;
    }
    if (chrome.destinationId !== id) {
      problems.push(`${id}: chromeParity evidence claims destination id '${chrome.destinationId}', not '${id}' — this is evidence for a different row`);
    }
    if (chrome.bar !== 'chrome-parity') {
      problems.push(`${id}: chromeParity evidence records bar '${chrome.bar}', not 'chrome-parity'`);
    }
    if (chrome.verdict !== 'match' || chrome.diffPixelCount !== 0) {
      problems.push(`${id}: chromeParity verdict is '${chrome.verdict}' with ${chrome.diffPixelCount} differing pixel(s) — outside the declared data regions the two artifacts must render identically`);
    }
    if (chrome.paletteCheck?.thresholdExceeded !== false) {
      problems.push(`${id}: chromeParity paletteCheck.thresholdExceeded is not exactly false — the built capture may be unpainted rather than really rendered`);
    }
    // Both halves, unlike the whole-frame diff above: this is the bar a verified row rests
    // on, so a staleness check that never ran may not stand in for one that passed.
    if (chrome.stalenessCheck?.checked !== true || chrome.stalenessCheck?.stale !== false) {
      problems.push(`${id}: chromeParity stalenessCheck is ${JSON.stringify(chrome.stalenessCheck)} — a verified row needs a staleness check that actually ran and actually passed`);
    }
    const floor = inventory.chromeParityBar?.minimumComparedFraction;
    if (typeof floor !== 'number') {
      problems.push(`${id}: chromeParityBar.minimumComparedFraction is missing from the inventory, so no floor was applied to how much of the frame the mask may hide`);
    } else if (!(chrome.comparedFraction >= floor)) {
      problems.push(`${id}: chromeParity compared only ${chrome.comparedFraction} of the frame, below the declared floor of ${floor} — a mask this wide passes by hiding the artifact rather than by matching it`);
    }
    // The mask that was applied has to be the mask that was measured. Without this, a
    // chrome record could cite any rectangles it liked and the ledger beside it would be
    // decoration.
    const applied = (chrome.excluded?.rectangles ?? []).map(rectKey).sort().join(' | ');
    const recorded = (ledger.exclusions ?? []).map(rectKey).sort().join(' | ');
    if (applied !== recorded) {
      problems.push(`${id}: chromeParity excluded [${applied}] but the regionLedger recorded [${recorded}] — the comparison used a mask nobody measured`);
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
