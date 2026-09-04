#!/usr/bin/env node
/**
 * Proves the pages-site built-interaction records are about the pictures beside them, about the
 * site this repository actually ships, and about features that really exist.
 *
 * `built-interaction-evidence.mjs` does this job for the windows-console surface. The pages-site
 * surface needed its own, and needed it to check two things that one cannot:
 *
 *   - **A record may only exist for a feature the site registry calls `implemented`.** The site
 *     registry currently records 23 features as `absent` and 11 as `partial`. A photograph of the
 *     place where an absent feature would be is not evidence that it is there, and a record
 *     asserting otherwise is the exact false claim the inventory's `unverified` status exists to
 *     avoid making. So the registry, not the record, decides which rows may carry one.
 *   - **A record goes stale when the site's own sources move.** `console/site/dist` is generated
 *     and gitignored, so it cannot be the thing a guard re-hashes; `console/site/app.js` and
 *     `console/site/styles.css` are tracked, and every record writes down what they hashed to
 *     when it was driven. Change either and every record turns red until it is driven again.
 *     That is deliberate and it is the whole point: a capture of last week's behaviour, filed
 *     against this week's code, is confidently wrong in the one direction nobody checks.
 *
 * The cure for a red staleness report is one command -- `npm run captures:site` -- not an edit to
 * the recorded digest. A record edited to match is a record that no longer describes any run.
 *
 * And a hand-written list, because a rule alone cannot notice a record that was never written.
 * Every check above is shaped like "if a record exists then it must be consistent", which an
 * empty directory satisfies perfectly. `drivenSiteRecords` names each feature that must have one
 * and the specific observations that run established, so a drive that quietly stopped producing
 * a record disappears from the guard along with itself -- which is precisely what must not happen.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * The records this guard has an opinion about, and what each must show.
 *
 * The observations named here are the ones that cost something to establish -- each is either a
 * claim about a second page load, a claim about what is on top of what, or a claim about the
 * shipped bundle rather than about a function. A record can carry more; it may not carry less.
 */
export const drivenSiteRecords = {
  'regex-builder': ['attachedTo', 'validPatternFeedback', 'invalidPatternRefused', 'dialogClosedAfterApply'],
  'bounded-overlays': ['paletteIsModal', 'paletteWithinViewport', 'transparentSurfaceRefused', 'viewport'],
  'non-blocking-notifications': ['toastsAfterSettingChange', 'noModalOpenedByTheNotification', 'pageStillInteractiveWhileToastShown', 'historyEntriesListed'],
  'bulk-actions': ['selectionStatusAfterSelectAll', 'confirmationPreviewShownBeforeAnyDismissal', 'confirmationPreviewText', 'remainingAfterBulkDismiss'],
  'attention-modes': ['focusModeReachedTheDocument', 'afterFullPageReload', 'survivedReload'],
  'local-version-history': ['entriesListed', 'actionFilterOptionsDerivedFromRealEntries', 'historySurvivedSettingsReset'],
  'personal-vocabulary-upload': ['controlPresentBeforeAnyFileExists', 'statusWithNoFileLoaded', 'noVocabularyCachedBeforeUpload'],
  'collapsible-filters': ['panelIsANativeDetailsElement', 'controlsPanelOpenByDefault',
    'descriptivePanelOpenByDefault', 'contentHiddenWhenCollapsed', 'contentShownWhenExpanded',
    'filterStatusAfterQuery'],
  'complete-exports': ['formatsOffered', 'lossStatementPerFormat', 'formatsDeclaringALoss',
    'everyFormatWasSelectedAndTheReadoutRecomputed'],
  'provider-markup-rendering': ['renderedAsBlocks', 'dangerousElementsInOutput', 'inlineEventHandlersInOutput'],
};

/** The tracked sources a record must pin itself to. Same list the drive writes. */
export const REQUIRED_SOURCES = ['console/site/app.js', 'console/site/styles.css'];

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function verifySiteInteractionEvidence({
  root, inventory, registry, exists = existsSync, read = readFileSync, list = readdirSync,
} = {}) {
  if (typeof root !== 'string' || root.length === 0) {
    throw new Error('verifySiteInteractionEvidence requires an absolute repository root');
  }
  const surface = inventory.surfaces.find((entry) => entry.id === 'pages-site');
  if (!surface) throw new Error('verifySiteInteractionEvidence: the inventory has no pages-site surface');
  const featureIds = new Set(inventory.requiredFeatureIds);
  const directory = resolve(root, 'console/release/evidence/pages-site');
  const problems = [];
  const seen = new Set();
  let checked = 0;
  let stale = 0;

  const entries = exists(directory) ? list(directory) : [];
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const id = entry.slice(0, -'.json'.length);
    /* A record whose name is not a feature id belongs to something else and is left alone;
     * the inventory is what decides which rows this guard speaks for. */
    if (!featureIds.has(id)) continue;
    seen.add(id);
    checked += 1;
    const text = read(resolve(directory, entry), 'utf8');
    let record;
    try { record = JSON.parse(text); } catch { problems.push(`${id}: the record is not valid JSON`); continue; }

    const state = registry.features?.[id]?.state;
    if (state !== 'implemented') {
      problems.push(`${id}: the site registry records this feature as ${JSON.stringify(state ?? 'unknown')}; `
        + 'only an implemented feature may carry a driven record');
    }
    if (record.feature !== id) problems.push(`${id}: the record names feature ${JSON.stringify(record.feature)}`);
    if (record.surface !== 'pages-site') problems.push(`${id}: the record names surface ${JSON.stringify(record.surface)}`);
    if (record.verification !== 'inspected-real-built-site') {
      problems.push(`${id}: the record does not claim to have inspected the real built site`);
    }
    if (typeof record.artifact !== 'string' || !record.artifact.startsWith('console/site/dist/')) {
      problems.push(`${id}: the record does not name a built page under console/site/dist/`);
    }
    for (const key of ['artifactSha256', 'runtimeSha256']) {
      if (typeof record[key] !== 'string' || !/^[0-9a-f]{64}$/.test(record[key])) {
        problems.push(`${id}: ${key} is not a 64-character digest`);
      }
    }

    const recorded = new Map((Array.isArray(record.sources) ? record.sources : [])
      .map((source) => [source.path, source.sha256]));
    for (const path of REQUIRED_SOURCES) {
      const claimed = recorded.get(path);
      if (typeof claimed !== 'string' || !/^[0-9a-f]{64}$/.test(claimed)) {
        problems.push(`${id}: the record pins no digest for its tracked source ${path}`);
        continue;
      }
      const absolute = resolve(root, path);
      if (!exists(absolute)) { problems.push(`${id}: the tracked source ${path} it pins does not exist`); continue; }
      if (sha256(read(absolute)) !== claimed) {
        stale += 1;
        problems.push(`${id}: ${path} has changed since this record was driven, so the capture beside it `
          + 'shows behaviour that may no longer be the behaviour. Re-drive with `npm run captures:site`; '
          + 'do not edit the recorded digest to match.');
      }
    }

    if (typeof record.capture !== 'string') { problems.push(`${id}: the record names no capture`); continue; }
    if (record.capture !== `console/release/captures/pages-site/${id}.png`) {
      problems.push(`${id}: the record names capture ${record.capture}, which is not this feature's own`);
    }
    const capturePath = resolve(root, record.capture);
    if (!exists(capturePath)) { problems.push(`${id}: the capture the record names is absent at ${record.capture}`); continue; }
    const bytes = read(capturePath);
    if (bytes.length !== record.captureBytes) {
      problems.push(`${id}: the capture is ${bytes.length} bytes, the record wrote down ${record.captureBytes}`);
    }
    if (sha256(bytes) !== record.captureSha256) {
      problems.push(`${id}: the capture does not hash to what the record wrote down -- this is a different picture`);
    }
    /* The capture names the element it claims to show and proves that element was on top when
     * the shutter fired. Without it a picture of a modal covering the subject passes every
     * existence check there is, which is how 873 photographs of an onboarding wizard once got
     * filed as evidence of the screens behind it. */
    if (typeof record.subject !== 'string' || record.subject.length === 0) {
      problems.push(`${id}: the record does not name the element its capture claims to show`);
    }
  }

  for (const [id, required] of Object.entries(drivenSiteRecords)) {
    if (!seen.has(id)) { problems.push(`${id}: the driven pages-site record is missing entirely`); continue; }
    const record = JSON.parse(read(resolve(directory, `${id}.json`), 'utf8'));
    for (const key of required) {
      if (!(key in (record.interaction ?? {}))) problems.push(`${id}: the record never observed '${key}'`);
    }
  }

  if (problems.length > 0) {
    const shown = problems.slice(0, 14).join('\n  - ');
    const more = problems.length > 14 ? `\n  - ...and ${problems.length - 14} more` : '';
    throw new Error(`${problems.length} pages-site evidence problem(s):\n  - ${shown}${more}`);
  }
  return { checked, drivenRecords: Object.keys(drivenSiteRecords).length, stale };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = resolve(import.meta.dirname, '..', '..');
  try {
    const inventory = JSON.parse(readFileSync(resolve(root, 'console/inventories/surface-completeness.json'), 'utf8'));
    const registry = JSON.parse(readFileSync(resolve(root, 'console/site/feature-registry.json'), 'utf8'));
    const result = verifySiteInteractionEvidence({ root, inventory, registry });
    console.log(`PASS: ${result.checked} pages-site built-interaction record(s) match their captures and their `
      + `pinned sources; ${result.drivenRecords} driven record(s) present with their observations.`);
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
