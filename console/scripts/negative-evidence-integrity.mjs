#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for the evidence-integrity check and the
 * documentation/registry census.
 *
 * Every case below plants exactly one lie and requires the check to refuse it. A guard
 * nobody has watched fail is decoration, and these two are worth more suspicion than most:
 * the integrity check exists precisely because the on-disk check beside it passes on
 * artifacts that have nothing to do with each other, so a version of it that also passed on
 * anything would be indistinguishable from the thing it was written to replace.
 *
 * Two shapes are proved, not one. `mustFail` asserts a lie is refused. The green cases
 * assert the honest tree is accepted -- because a check that refuses everything passes a
 * red-then-green eyeball while being exactly as useless as one that refuses nothing.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { verifyEvidenceIntegrity, canonicalImplementationStatus, readImplementationStatus } from './evidence-integrity.mjs';
import { verifyDocumentationAgreement, measureAgreement } from './documentation-agreement.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const readJson = (relativePath) => JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));
const inventory = readJson('console/inventories/surface-completeness.json');
const census = readJson('console/inventories/documentation-agreement.json');

/* The row every fixture plants its lie on. Chosen as a row that genuinely passes today, so a
 * case going red is attributable to the planted lie rather than to a row that was already
 * failing -- a deliberate break that "passes" for an unintended reason proves nothing. */
const SUBJECT = 'school-mode';
const subjectRow = () => {
  const copy = structuredClone(inventory);
  for (const surface of copy.surfaces) {
    for (const feature of surface.features) {
      if (feature.status === 'verified' && !(surface.id === 'windows-console' && feature.id === SUBJECT)) {
        feature.status = 'unverified';
      }
    }
  }
  const row = copy.surfaces.find((s) => s.id === 'windows-console').features.find((f) => f.id === SUBJECT);
  if (row.status !== 'verified') throw new Error(`${SUBJECT} is not a verified row, so every fixture below would be vacuous`);
  return copy;
};

const RECORD_PATH = `console/release/evidence/windows-console/${SUBJECT}.json`;
const CAPTURE_PATH = `console/release/captures/windows-console/${SUBJECT}.png`;
const ARTICLE_PATH = `console/docs/platform/${SUBJECT}.md`;
const REGISTRY_PATH = 'console/app/feature-registry.json';

const realRecord = readJson(RECORD_PATH);
const realArticle = readFileSync(resolve(root, ARTICLE_PATH), 'utf8');
const realRegistry = readJson(REGISTRY_PATH);
const realCapture = readFileSync(resolve(root, CAPTURE_PATH));

/**
 * Serves the real bytes for everything except the one artifact a case rewrites.
 *
 * Reading through an override rather than editing files on disk keeps each case isolated:
 * a fixture cannot leave the tree changed for the next one, and a case cannot pass because
 * an earlier case's edit was never undone.
 */
function io({ record = realRecord, article = realArticle, registry = realRegistry, capture = realCapture } = {}) {
  return {
    readText: (absolute) => {
      const path = String(absolute).replaceAll('\\', '/');
      if (path.endsWith(`${SUBJECT}.json`)) return typeof record === 'string' ? record : JSON.stringify(record);
      if (path.endsWith(`${SUBJECT}.md`)) return article;
      if (path.endsWith('app/feature-registry.json')) return typeof registry === 'string' ? registry : JSON.stringify(registry);
      return readFileSync(absolute, 'utf8');
    },
    readBinary: (absolute) => (String(absolute).replaceAll('\\', '/').endsWith(`${SUBJECT}.png`) ? capture : readFileSync(absolute)),
  };
}

function mustFail(name, overrides) {
  try { verifyEvidenceIntegrity(subjectRow(), { root, ...io(overrides) }); }
  catch (error) { console.log(`RED: ${name}: ${error.message.split('\n')[1].trim().replace(/^- /, '').slice(0, 150)}`); return; }
  throw new Error(`${name}: deliberate break stayed green`);
}

/* Baseline: the untouched tree passes, so every red below is the planted lie. */
const baseline = verifyEvidenceIntegrity(inventory, { root });
console.log(`GREEN: the untouched inventory passes with ${baseline.verifiedRows} verified row(s) and ${baseline.boundCaptures} bound capture(s).`);

const withRecord = (mutate) => { const record = structuredClone(realRecord); mutate(record); return { record }; };

mustFail('point the record at a neighbouring row\'s capture', withRecord((record) => {
  record.capture = 'console/release/captures/windows-console/regex-builder.png';
}));

mustFail('record a capture digest the capture on disk does not hash to', withRecord((record) => {
  record.captureSha256 = createHash('sha256').update('not these bytes').digest('hex');
}));

mustFail('record a capture byte length the capture on disk does not have', withRecord((record) => {
  record.captureBytes = realCapture.length + 1;
}));

/* Corrupting the capture also changes its digest and length, so a case that only swapped the
 * bytes would go red through the digest check whether or not the PNG check existed at all --
 * a guard watched by a case that cannot distinguish it from its neighbour is not watched. Each
 * of these therefore rewrites the record to match the corrupted bytes exactly, leaving the PNG
 * header as the only thing left to object to. Verified by deleting the PNG check: with it gone,
 * both go green. */
const consistentWith = (capture) => ({
  capture,
  record: { ...realRecord, captureSha256: createHash('sha256').update(capture).digest('hex'), captureBytes: capture.length },
});

mustFail('swap the capture for an empty file and make the record agree with it', consistentWith(Buffer.alloc(0)));

mustFail('swap the capture for bytes that are not a PNG and make the record agree with them', consistentWith((() => {
  const bytes = Buffer.from(realCapture);
  bytes[1] = 0x00;
  return bytes;
})()));

mustFail('swap the capture for a PNG whose header says it measures nothing', consistentWith((() => {
  const bytes = Buffer.from(realCapture);
  bytes.writeUInt32BE(0, 16);
  return bytes;
})()));

mustFail('claim a schema version this reader has never seen', withRecord((record) => { record.schemaVersion = 2; }));

mustFail('name no built artifact at all', withRecord((record) => { record.artifact = '   '; }));

mustFail('state a contract point that is empty', withRecord((record) => {
  record.contractPoints = [...realRecord.contractPoints, '  '];
}));

mustFail('replace the uninterrogated list with something that is not a list', withRecord((record) => {
  record.notInterrogatedHere = 'nothing much';
}));

mustFail('make no privacy statement', withRecord((record) => { record.privacy = ''; }));

mustFail('claim a commit that is not a 40-character object name', withRecord((record) => { record.commit = 'HEAD'; }));

mustFail('drop the built artifact\'s own digest', withRecord((record) => { record.artifactSha256 = ''; }));

mustFail('invent a provenance label nobody decided the meaning of', withRecord((record) => {
  record.verification = 'looked-about-right';
}));

mustFail('record an interaction that states no contract point', withRecord((record) => { record.contractPoints = []; }));

mustFail('drop the statement of what was left uninterrogated', withRecord((record) => {
  delete record.notInterrogatedHere;
}));

mustFail('add a field to the record that nobody has agreed the meaning of', withRecord((record) => {
  record.looksFine = true;
}));

mustFail('leave the record unparseable', { record: '{ not json' });

/* The registry has to be moved to `absent` alongside the article, or the agreement check
 * below fires first and this case goes red without ever reaching the check it is named for.
 * Caught by disabling the refusal branch and watching this case stay green: with both records
 * saying the feature is absent they agree, and the only thing left to object to is that a
 * `verified` row is resting on an absent feature. */
mustFail('claim verified while both records agree the feature is not implemented here', {
  article: realArticle.replace(/\*\*Desktop application:\*\*[^\n]*/, '**Desktop application:** Not implemented'),
  registry: (() => {
    const registry = structuredClone(realRegistry);
    registry.features[SUBJECT].state = 'absent';
    return registry;
  })(),
});

mustFail('strip the article\'s implementation status entirely', {
  article: realArticle.replace(/\*\*Desktop application:\*\*/, 'Desktop application'),
});

mustFail('declare a status that is none of the three', {
  article: realArticle.replace(/\*\*Desktop application:\*\*[^\n]*/, '**Desktop application:** Mostly there'),
});

mustFail('reverse the status with a continuation rather than a qualifier', {
  article: realArticle.replace(/\*\*Desktop application:\*\*[^\n]*/, '**Desktop application:** Implemented nowhere at all'),
});

mustFail('let the registry and the article disagree', {
  registry: (() => {
    const registry = structuredClone(realRegistry);
    registry.features[SUBJECT].state = 'absent';
    return registry;
  })(),
});

mustFail('remove the row from the surface registry', {
  registry: (() => {
    const registry = structuredClone(realRegistry);
    delete registry.features[SUBJECT];
    return registry;
  })(),
});

/* Two rows resting on one screenshot is invisible from either row alone, so it gets its own
 * case rather than being assumed to fall out of the per-row checks. */
{
  const twoRows = subjectRow();
  const other = twoRows.surfaces.find((s) => s.id === 'windows-console').features.find((f) => f.id === 'guided-forms');
  other.status = 'verified';
  const guidedRecord = readJson('console/release/evidence/windows-console/guided-forms.json');
  const shared = {
    readText: (absolute) => {
      const path = String(absolute).replaceAll('\\', '/');
      if (path.endsWith('guided-forms.json')) {
        return JSON.stringify({ ...guidedRecord, captureSha256: realRecord.captureSha256, captureBytes: realRecord.captureBytes });
      }
      return readFileSync(absolute, 'utf8');
    },
    readBinary: (absolute) => (String(absolute).replaceAll('\\', '/').endsWith('guided-forms.png') ? realCapture : readFileSync(absolute)),
  };
  /* Deliberately NOT written as `throw inside try, match the message in catch`. That shape
   * looked right and was vacuous: the thrown "…stayed green" message itself contained the
   * substring the catch matched on, so the catch swallowed the failure and printed RED
   * whether or not the duplicate check existed. Caught by disabling the real check and
   * watching this case stay green. A flag set outside the try cannot be satisfied that way. */
  let refused = false;
  try { verifyEvidenceIntegrity(twoRows, { root, ...shared }); }
  catch (error) { refused = error.message.includes('standing in for two rows'); }
  if (!refused) throw new Error('rest two rows on the same capture bytes: deliberate break stayed green');
  console.log('RED: rest two rows on the same capture bytes: refused');
}

/* The green half. Without it every case above is satisfied by a check that throws
 * unconditionally. */
const accepted = verifyEvidenceIntegrity(subjectRow(), { root, ...io() });
if (accepted.verifiedRows !== 1 || accepted.boundCaptures !== 1) {
  throw new Error('an honest row was not accepted, so the check refuses everything rather than refusing lies');
}
console.log('GREEN: an honestly evidenced row is accepted through the same reader every break above used.');

/* A qualified status is a punctuation habit, not a missing declaration, and refusing it
 * would quietly reclassify four articles in the tree. */
for (const [declared, expected] of [
  ['partial, and corrected 2026-08-25', 'partial'],
  ['partial, and meaningfully improved', 'partial'],
  ['implemented', 'implemented'],
  ['not implemented', 'not implemented'],
  ['implemented nowhere', null],
  ['mostly there', null],
]) {
  const actual = canonicalImplementationStatus(declared);
  if (actual !== expected) throw new Error(`canonicalImplementationStatus(${JSON.stringify(declared)}) gave ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}
if (readImplementationStatus('**Desktop application: implemented.**', 'Desktop application') !== 'implemented') {
  throw new Error('the colon-inside-the-bold spelling is in the tree and must be read, or narration reports as undeclared');
}
console.log('GREEN: qualified, plain and both bold spellings read correctly; a reversing continuation does not.');

/* The census. */
const censusMeasured = verifyDocumentationAgreement(inventory, census, { root });
console.log(`GREEN: the census matches the tree at ${censusMeasured.agree}/${censusMeasured.disagree}/${censusMeasured.undeclared} of ${censusMeasured.pairs}.`);

function censusMustFail(name, mutate) {
  const candidate = structuredClone(census);
  mutate(candidate);
  try { verifyDocumentationAgreement(inventory, candidate, { root }); }
  catch (error) { console.log(`RED: ${name}: ${error.message.split('\n')[1]?.trim().replace(/^- /, '').slice(0, 150) ?? error.message}`); return; }
  throw new Error(`${name}: deliberate break stayed green`);
}

censusMustFail('drop a known disagreement from the census without resolving it', (candidate) => {
  candidate.disagreements.shift();
  candidate.totals.disagree -= 1;
});

censusMustFail('list a disagreement that is not one', (candidate) => {
  candidate.disagreements.push({ surface: 'windows-console', feature: SUBJECT, registryState: 'absent', articleStatus: 'partial' });
  candidate.totals.disagree += 1;
});

censusMustFail('record a disagreement at the wrong pair of values', (candidate) => {
  candidate.disagreements[0].registryState = 'implemented';
});

censusMustFail('let the pinned totals drift from the measured tree', (candidate) => {
  candidate.totals.agree += 1;
});

censusMustFail('drop an undeclared pair from the census', (candidate) => {
  candidate.undeclared.pop();
  candidate.totals.undeclared -= 1;
});

censusMustFail('leave the census unable to say why it is pinned', (candidate) => { candidate.whyPinned = '   '; });

/* The census's own measurement is asserted to be nonempty before anything rests on it: a
 * measurement that silently found nothing would agree with a census listing nothing, and
 * both would read as clean. */
const live = measureAgreement(inventory, { root });
if (live.pairs !== 88) throw new Error(`the census measured ${live.pairs} pairs, not the 88 the inventory declares`);
if (live.agreeing.length === 0 || live.disagreements.length === 0) {
  throw new Error('the census measured no agreements or no disagreements, so one of its two buckets is unreachable and proves nothing');
}
console.log(`GREEN: the census measurement reaches both buckets over all ${live.pairs} pairs.`);

verifyDocumentationAgreement(inventory, census, { root });
verifyEvidenceIntegrity(inventory, { root });
console.log('GREEN: restored inventory, census and evidence all pass.');
