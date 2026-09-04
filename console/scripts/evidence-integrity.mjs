#!/usr/bin/env node
/**
 * Binds a `verified` surface-completeness row to the evidence it rests on.
 *
 * `evidence-on-disk.mjs` asks the filesystem whether each of the six named artifacts is
 * present. That is a real check and it is not enough: presence says nothing about whether
 * the built-interaction record and the capture beside it have anything to do with each
 * other, or with this row. A row passes that check with a zero-byte PNG and a record whose
 * digest was written by hand, and it passes with a record copied from a neighbouring
 * feature — every one of which reads, in the inventory, exactly like a verified row.
 *
 * So this adds the part that cannot be satisfied by a file merely existing:
 *
 *   - the record names THIS row's capture, by the same path the template produces;
 *   - the recorded SHA-256 and byte length are the capture's real digest and real length;
 *   - the capture is a real PNG with real dimensions, not an empty or truncated file;
 *   - no two rows rest on the same capture bytes, because one screenshot doing double duty
 *     is one row's evidence and another row's decoration;
 *   - the record carries its provenance — which commit, which built artifact and that
 *     artifact's own digest — in a shape a reader can go and check;
 *   - and the row's documentation article states an implementation status for THIS row's
 *     own surface, which is not `not implemented`.
 *
 * That last one is the check this module was written for. Twenty-two windows-console rows
 * carry a complete set of six artifacts while their own documentation article says the
 * desktop application does not implement the feature at all. Both cannot be true. A capture
 * of a screen for a feature that is not there is a picture of something else, and marking
 * such a row `verified` is precisely the optimistic tick that makes an inventory worth less
 * than no inventory. The status is not required to be `implemented`: a `partial` feature
 * can carry honest evidence, and every record scopes what it observed in its own
 * `notInterrogatedHere`. What is refused is a row claiming merged evidence for a feature its
 * own documentation says does not exist on that surface.
 *
 * Only rows claiming `verified` are checked, for the same reason the on-disk check gives: a
 * row still marked `unverified` is being honest about being unproven.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** The heading each surface's implementation status is recorded under. */
export const SURFACE_STATUS_LABELS = {
  'windows-console': 'Desktop application',
  'pages-site': 'Documentation website',
};

/**
 * The three things an article may say about a feature on a surface.
 *
 * Ordered longest-first, because a status is matched as a prefix and `implemented` is a
 * substring of nothing here but would be reached first by a shorter-first scan of a value
 * that happens to be spelt differently later.
 */
export const IMPLEMENTATION_STATUSES = ['not implemented', 'implemented', 'partial'];

/** The status a `verified` row may not rest on. */
export const REFUSED_STATUS = 'not implemented';

/** Where each surface's own implementation registry lives. */
export const SURFACE_REGISTRY_PATHS = {
  'windows-console': 'console/app/feature-registry.json',
  'pages-site': 'console/site/feature-registry.json',
};

/**
 * The registry's three words for the same fact the documentation states in its own three.
 *
 * Two records of one fact is one record too many unless they are made to agree, and these
 * two disagree on 40 of the 80 declared pairs in the tree today. A `verified` row is the one
 * place that cannot be tolerated: `verified` claims the six artifacts are merged, and two of
 * the six contradicting each other about whether the feature exists is the opposite of merged.
 */
export const REGISTRY_STATE_TO_DOC_STATUS = {
  absent: 'not implemented',
  partial: 'partial',
  implemented: 'implemented',
};

/**
 * Every provenance label a built-interaction record may carry.
 *
 * A closed set rather than a nonempty string, because the label is the record's own claim
 * about how it was produced and a free-text field would let a new one arrive without anyone
 * deciding it means the same thing.
 */
export const VERIFICATION_LABELS = ['inspected-real-packaged-artifact'];

/** Keys a built-interaction record must carry. */
export const REQUIRED_RECORD_KEYS = [
  'schemaVersion', 'commit', 'artifact', 'artifactSha256', 'capture', 'captureSha256',
  'captureBytes', 'viewport', 'launch', 'interaction', 'contractPoints', 'notInterrogatedHere',
  'privacy', 'verification',
];

/** Keys a record may carry beyond the required ones. */
export const OPTIONAL_RECORD_KEYS = ['correctionRecorded'];

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SHA256_HEX = /^[0-9a-f]{64}$/;
const COMMIT_HEX = /^[0-9a-f]{40}$/;

/**
 * Reads the declared implementation status for one surface out of a documentation article.
 *
 * Two spellings are in the tree and both are meant: `**Desktop application:** Partial` and
 * `**Desktop application: implemented.**`. Accepting only the first silently reports `narration`
 * — which is implemented, and says so — as an article carrying no status at all, which is how
 * a tolerant-looking parser produces a confidently wrong survey.
 *
 * Returns `null` when no status is declared, which is a different fact from a declared status
 * this parser does not recognise, and the caller reports them differently.
 */
export function readImplementationStatus(article, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\*\\*${escaped}:(?:\\*\\*)?[ \\t]*([^.*\\n]+)`, 'i');
  const found = String(article).match(pattern);
  if (!found) return null;
  const value = found[1].trim().toLowerCase().replace(/\s+/g, ' ');
  return value.length === 0 ? null : value;
}

/**
 * Reduces a declared status to one of the three, or `null` when it is none of them.
 *
 * Four articles in the tree qualify the word — `partial, and corrected 2026-08-25`,
 * `partial, and meaningfully improved` — and refusing those would be reading a punctuation
 * habit as a missing declaration. So a qualifier is allowed, but only after a separator: a
 * value must be one of the statuses and then end, or continue with `,`, `;` or `(`. That
 * accepts every qualified spelling in the tree and still refuses a value like
 * `implemented nowhere`, where the continuation reverses the word it follows.
 */
export function canonicalImplementationStatus(declared) {
  if (typeof declared !== 'string') return null;
  const value = declared.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.\s]+$/, '');
  for (const status of IMPLEMENTATION_STATUSES) {
    if (value === status) return status;
    if (value.startsWith(status) && [',', ';', '('].includes(value.charAt(status.length))) return status;
  }
  return null;
}

function pngDimensions(bytes) {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (bytes.subarray(12, 16).toString('latin1') !== 'IHDR') return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function expand(template, id) {
  return template.replaceAll('{id}', id).split('#')[0];
}

/**
 * @param inventory the parsed surface-completeness inventory
 * @param options.root absolute repository root
 * @param options.readText reads a UTF-8 file, throwing when it is absent
 * @param options.readBinary reads a file as bytes, throwing when it is absent
 */
export function verifyEvidenceIntegrity(inventory, options = {}) {
  const {
    root,
    readText = (absolute) => readFileSync(absolute, 'utf8'),
    readBinary = (absolute) => readFileSync(absolute),
  } = options;
  if (typeof root !== 'string' || root.length === 0) {
    throw new Error('verifyEvidenceIntegrity requires an absolute repository root');
  }

  const problems = [];
  let verifiedRows = 0;
  let boundCaptures = 0;
  /* Capture digest -> the row that already rests on those exact bytes. One screenshot
   * standing in for two features is the reused-capture defect, and it is invisible from
   * either row on its own. */
  const captureOwners = new Map();

  for (const surface of inventory.surfaces) {
    const statusLabel = SURFACE_STATUS_LABELS[surface.id];
    /* Loaded once per surface, and only when a row on it actually claims `verified`, so a
     * surface with nothing to prove does not fail for a registry no row was reading. */
    let registry;
    const registryPath = SURFACE_REGISTRY_PATHS[surface.id];
    for (const feature of surface.features) {
      if (feature.status !== 'verified') continue;
      verifiedRows += 1;
      const key = `${surface.id}.${feature.id}`;
      const fail = (message) => problems.push(`${key}: ${message}`);

      const recordPath = expand(surface.evidenceTemplates.builtInteraction, feature.id);
      const capturePath = expand(surface.evidenceTemplates.capture, feature.id);
      const documentationPath = expand(surface.evidenceTemplates.documentation, feature.id);

      let record;
      try {
        record = JSON.parse(readText(resolve(root, recordPath)));
      } catch (error) {
        fail(`built-interaction record at ${recordPath} could not be read as JSON: ${error.message}`);
        continue;
      }

      for (const required of REQUIRED_RECORD_KEYS) {
        if (!(required in record)) fail(`built-interaction record omits '${required}'`);
      }
      for (const present of Object.keys(record)) {
        if (!REQUIRED_RECORD_KEYS.includes(present) && !OPTIONAL_RECORD_KEYS.includes(present)) {
          fail(`built-interaction record carries unknown field '${present}'`);
        }
      }

      if (record.schemaVersion !== 1) fail(`built-interaction record schemaVersion is ${JSON.stringify(record.schemaVersion)}, not 1`);
      if (!COMMIT_HEX.test(String(record.commit))) fail(`built-interaction record commit ${JSON.stringify(record.commit)} is not a 40-character object name`);
      if (typeof record.artifact !== 'string' || record.artifact.trim().length === 0) fail('built-interaction record names no built artifact');
      if (!SHA256_HEX.test(String(record.artifactSha256))) fail(`built-interaction record artifactSha256 ${JSON.stringify(record.artifactSha256)} is not a SHA-256 digest`);
      if (!VERIFICATION_LABELS.includes(record.verification)) fail(`built-interaction record verification ${JSON.stringify(record.verification)} is not one of ${VERIFICATION_LABELS.join('/')}`);
      if (typeof record.privacy !== 'string' || record.privacy.trim().length === 0) fail('built-interaction record makes no privacy statement');
      if (!Array.isArray(record.contractPoints) || record.contractPoints.length === 0) fail('built-interaction record states no contract point, so it records an interaction that proves nothing in particular');
      else if (record.contractPoints.some((point) => typeof point !== 'string' || point.trim().length === 0)) fail('built-interaction record carries an empty contract point');
      if (!Array.isArray(record.notInterrogatedHere)) fail('built-interaction record does not say what it left uninterrogated');

      /* The binding. A record naming a neighbouring row's capture passes every check above
       * and is evidence for the neighbour, not for this row. */
      if (record.capture !== capturePath) {
        fail(`built-interaction record points at '${record.capture}' where this row's capture is '${capturePath}'`);
      }

      let bytes;
      try {
        bytes = readBinary(resolve(root, capturePath));
      } catch (error) {
        fail(`capture at ${capturePath} could not be read: ${error.message}`);
        continue;
      }

      const dimensions = pngDimensions(bytes);
      if (!dimensions) fail(`capture at ${capturePath} is not a PNG with a readable header`);
      else if (dimensions.width < 1 || dimensions.height < 1) fail(`capture at ${capturePath} measures ${dimensions.width}x${dimensions.height}`);

      const digest = createHash('sha256').update(bytes).digest('hex');
      if (record.captureSha256 !== digest) fail(`built-interaction record records capture digest ${String(record.captureSha256).slice(0, 12)}… where the capture on disk hashes to ${digest.slice(0, 12)}…`);
      if (record.captureBytes !== bytes.length) fail(`built-interaction record records ${JSON.stringify(record.captureBytes)} capture bytes where the capture on disk is ${bytes.length}`);

      const owner = captureOwners.get(digest);
      if (owner) fail(`capture bytes are identical to ${owner}'s, so one screenshot is standing in for two rows`);
      else captureOwners.set(digest, key);
      boundCaptures += 1;

      let article;
      try {
        article = readText(resolve(root, documentationPath));
      } catch (error) {
        fail(`documentation article at ${documentationPath} could not be read: ${error.message}`);
        continue;
      }

      const declared = readImplementationStatus(article, statusLabel);
      const status = canonicalImplementationStatus(declared);
      if (declared === null) {
        fail(`documentation article at ${documentationPath} declares no '${statusLabel}' implementation status, so nothing says whether this row's feature exists on this surface`);
      } else if (status === null) {
        fail(`documentation article at ${documentationPath} declares '${statusLabel}: ${declared}', which is not one of ${IMPLEMENTATION_STATUSES.join('/')}`);
      } else if (status === REFUSED_STATUS) {
        fail(`documentation article at ${documentationPath} says '${statusLabel}: ${status}', so this row claims merged evidence for a feature its own documentation says is absent here`);
      }

      if (registry === undefined) {
        try { registry = JSON.parse(readText(resolve(root, registryPath))); }
        catch (error) { registry = null; fail(`implementation registry at ${registryPath} could not be read as JSON: ${error.message}`); }
      }
      if (registry) {
        const registryState = registry.features?.[feature.id]?.state;
        if (registryState === undefined) {
          fail(`implementation registry at ${registryPath} carries no state for this row`);
        } else if (!(registryState in REGISTRY_STATE_TO_DOC_STATUS)) {
          fail(`implementation registry at ${registryPath} records state '${registryState}', which is none of ${Object.keys(REGISTRY_STATE_TO_DOC_STATUS).join('/')}`);
        } else if (status !== null && REGISTRY_STATE_TO_DOC_STATUS[registryState] !== status) {
          fail(`the two records disagree: ${registryPath} says '${registryState}' while ${documentationPath} says '${statusLabel}: ${status}' — a row cannot claim merged evidence while two of its own artifacts contradict each other about whether the feature exists`);
        }
      }
    }
  }

  if (problems.length > 0) {
    const shown = problems.slice(0, 12).join('\n  - ');
    const more = problems.length > 12 ? `\n  - ...and ${problems.length - 12} more` : '';
    throw new Error(`${problems.length} evidence-integrity problem(s):\n  - ${shown}${more}`);
  }

  return { verifiedRows, boundCaptures };
}
