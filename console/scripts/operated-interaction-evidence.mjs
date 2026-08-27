#!/usr/bin/env node
/**
 * Refuses a `verified` inventory row whose built-interaction record only photographed the feature.
 *
 * The two guards already here answer two different questions, and neither answers this one.
 * `evidence-on-disk.mjs` asks whether the six files a `verified` row names exist.
 * `built-interaction-evidence.mjs` asks whether each record and the picture beside it are two
 * halves of one claim. Both are satisfied completely by a record that navigated to a screen,
 * took a photograph, and established nothing about the feature at all.
 *
 * That is not hypothetical. Of the thirty-nine committed windows-console records, several say in
 * their own words that they never operated anything:
 *
 *   bulk-actions        "captured its toolbar without clicking (no rows exist to select ...)"
 *   collapsible-filters "captured its Filter row without clicking"
 *
 * and of the twenty-six that record `observedPanelControls` at all, twenty-five recorded an empty
 * list, while fourteen recorded an element count that is identical either side of the click they
 * describe. Every one of those rows is honestly marked `unverified` today,
 * and every one of them has all six artifacts sitting on disk, so the entire distance between
 * "honest" and "thirty-nine rows claiming proof they do not have" is one careless edit to a status
 * field, with every existing guard staying green through it.
 *
 * So this guard adds the missing question: for a row to claim `verified`, its record must carry
 * the specific observations that show the feature *behaving*, each one named here by hand.
 *
 * Hand-written, per surface and per feature, on purpose. A rule of the shape "the record must have
 * some observations" is satisfied by whichever fields the harness happened to write, which is
 * exactly the failure being guarded against, the harness wrote `observedPanelControls` for
 * twenty-six rows and it came back empty for twenty-five of them. Naming the keys, and naming what
 * each key has to look like, means adding a row to this map is an argument somebody has to make
 * rather than a field somebody has to populate.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * How each observation has to look for it to count as having observed anything.
 *
 * `present` exists because two of the strongest observations in the whole set are the number
 * zero: pairing the built-in authenticator fetched no resource before and no resource after,
 * which is how that record proves the secret is generated locally and never leaves. A
 * "non-empty" rule would throw both of those away and demand the harness write something
 * louder than the truth.
 */
const shapes = {
  present: (value) => value !== undefined && value !== null,
  trueFlag: (value) => value === true,
  positiveNumber: (value) => typeof value === 'number' && Number.isFinite(value) && value > 0,
  /* `text` is any real reading, however short -- a rung is called "dish" and a version is
   * "0.1.175", and a length floor there would refuse the truth for being brief. `quotedCopy` is
   * for a reading that is user-visible *copy* read off the screen, where one word means the
   * harness caught a fragment rather than the sentence. */
  text: (value) => typeof value === 'string' && value.trim().length > 0,
  quotedCopy: (value) => typeof value === 'string' && value.trim().length >= 12,
  nonEmptyList: (value) => Array.isArray(value) && value.length > 0
    && value.every((entry) => typeof entry === 'string' && entry.trim().length > 0),
};

/**
 * Every row allowed to claim `verified`, keyed `<surface>.<feature>`, and what proves it.
 *
 * `transition` names a before/after pair that must both be recorded and must differ. A click that
 * left the document byte-identical either side of itself did not do anything the record can point
 * at, whatever its prose says.
 *
 * `observations` names the feature-specific readings. They are deliberately the awkward ones, the
 * refusal text, the stale code, the count that stayed at zero, because those are the readings a
 * screenshot cannot produce.
 */
export const operationProofs = {
  'windows-console.regex-builder': {
    why: 'the builder opened from the field it belongs to and rendered its real groups, presets and flags',
    transition: ['domBeforeClick', 'domAfterClick'],
    observations: {
      observedPanelControls: 'nonEmptyList',
      observedGroups: 'nonEmptyList',
      observedTelephonyPresets: 'nonEmptyList',
      observedFlags: 'nonEmptyList',
      observedPlainWords: 'quotedCopy',
      anchoredToOriginatingField: 'trueFlag',
    },
  },
  'windows-console.automatic-updates': {
    why: 'the updater raised a real banner for a real offered version, disclosed the unsigned build, and waited for the user',
    observations: {
      observedOfferedVersion: 'text',
      installedVersion: 'text',
      bannerText: 'quotedCopy',
      observedActions: 'nonEmptyList',
      unsignedDisclosureShown: 'trueFlag',
      restartRequiresUserAction: 'trueFlag',
    },
  },
  'windows-console.built-in-authenticator': {
    why: 'pairing fetched nothing, a code computed outside the application was accepted, and a stale one was refused first',
    observations: {
      refusedBeforePairing: 'quotedCopy',
      pairedSecretLengthBase32: 'positiveNumber',
      resourceEntriesBeforePairing: 'present',
      resourceEntriesAfterPairing: 'present',
      staleCodeRefusedWith: 'quotedCopy',
      liveCodeAccepted: 'trueFlag',
    },
  },
  'windows-console.unlock-ladder': {
    why: 'three real wrong attempts drew the ladder, it was graded, and the element stayed locked through it',
    observations: {
      wrongAttemptToasts: 'nonEmptyList',
      challengeOfferedOnAttempt: 'positiveNumber',
      rung: 'text',
      challengePrompt: 'quotedCopy',
      gradedAnswerToast: 'quotedCopy',
      lockStillPresentAfterChallenge: 'trueFlag',
    },
  },
};

/** Phrases a record uses to say, in its own words, that it operated nothing. */
const disclaimers = [/without clicking/i, /captured .{0,40}\bwithout\b/i];

function describe(value) {
  if (Array.isArray(value)) return `a list of ${value.length}`;
  if (value === undefined) return 'absent';
  return JSON.stringify(value);
}

export function verifyOperatedInteractionEvidence({ root, inventory, exists = existsSync, read = readFileSync } = {}) {
  if (typeof root !== 'string' || root.length === 0) {
    throw new Error('verifyOperatedInteractionEvidence requires an absolute repository root');
  }

  const problems = [];
  const claimed = new Set();
  let checkedRows = 0;
  let checkedObservations = 0;

  for (const surface of inventory.surfaces) {
    for (const feature of surface.features) {
      const key = `${surface.id}.${feature.id}`;
      if (feature.status !== 'verified') continue;
      claimed.add(key);
      checkedRows += 1;

      const proof = operationProofs[key];
      if (!proof) {
        problems.push(`${key} claims verified but names no operation proof here, so nothing says what its record had to observe`);
        continue;
      }

      const template = surface.evidenceTemplates.builtInteraction.replaceAll('{id}', feature.id);
      const [relativePath] = template.split('#');
      const absolute = resolve(root, relativePath);
      if (!exists(absolute)) {
        problems.push(`${key}: the built-interaction record is absent at ${relativePath}`);
        continue;
      }

      const text = read(absolute, 'utf8');
      let record;
      try { record = JSON.parse(text); } catch {
        problems.push(`${key}: the built-interaction record is not valid JSON`);
        continue;
      }

      const interaction = record.interaction ?? {};
      const prose = `${interaction.action ?? ''} ${interaction.route ?? ''}`;
      for (const pattern of disclaimers) {
        if (pattern.test(prose)) {
          problems.push(`${key}: the record says in its own words that it operated nothing -- ${JSON.stringify(interaction.action ?? '')}`);
        }
      }

      if (proof.transition) {
        const [before, after] = proof.transition;
        if (!(before in interaction) || !(after in interaction)) {
          problems.push(`${key}: the record has no ${before}/${after} pair, so nothing shows the click changed anything`);
        } else if (JSON.stringify(interaction[before]) === JSON.stringify(interaction[after])) {
          problems.push(`${key}: ${before} and ${after} are identical (${describe(interaction[before])}), so the recorded click moved nothing`);
        }
      }

      for (const [observation, shape] of Object.entries(proof.observations)) {
        checkedObservations += 1;
        const check = shapes[shape];
        if (!check) {
          problems.push(`${key}.${observation}: '${shape}' is not a shape this guard knows how to check`);
          continue;
        }
        if (!check(interaction[observation])) {
          problems.push(`${key}: '${observation}' is ${describe(interaction[observation])}, which does not satisfy ${shape}`);
        }
      }
    }
  }

  /* The other direction. A proof left behind for a row that has since been demoted reads as
   * though that row is still proven, and is the quiet way this map drifts out of step with the
   * inventory it speaks for. */
  for (const key of Object.keys(operationProofs)) {
    if (!claimed.has(key)) {
      problems.push(`${key} has an operation proof recorded here but is not marked verified, so the map and the inventory disagree`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`${problems.length} operated-interaction problem(s):\n  - ${problems.join('\n  - ')}`);
  }
  return { checkedRows, checkedObservations };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = resolve(dirname(import.meta.dirname), '..');
  try {
    const inventory = JSON.parse(readFileSync(resolve(root, 'console/inventories/surface-completeness.json'), 'utf8'));
    const result = verifyOperatedInteractionEvidence({ root, inventory });
    console.log(`PASS: ${result.checkedRows} verified row(s) carry a named operation proof; `
      + `${result.checkedObservations} observation(s) checked.`);
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
