/**
 * Contract: an exemption is a decision, and every record has to agree that it stands.
 *
 * This project keeps three records about a feature, and until now only two of them were
 * tied together. `inventories/surface-completeness.json` says whether a row is exempt;
 * `inventories/exemptions.json` says who decided that and why; and each surface's own
 * `feature-registry.json` says what actually exists. `verifyExemptions` ties the first
 * two in both directions. Nothing tied either of them to the third.
 *
 * The cost of that gap is measured rather than imagined. On 2026-08-27 an agent opened
 * `site/feature-registry.json` looking for something to build, found `local-file-
 * converter` marked `absent` with a note explaining only that the site's export
 * formatters are not a converter, and read that as a gap. It built the feature -- a real
 * one, with an eight-category catalogue, byte-signature detection, a pausable queue, 57
 * contract tests and 48 planted red-then-green breaks -- and set the registry row to
 * `implemented`. The whole site suite passed. The completeness validator passed. The
 * exemption check passed, because it asks whether an exempt row has a REASON and never
 * whether somebody has since built it anyway. The exclusion was the owner's, recorded
 * four days earlier, and named that exact surface.
 *
 * Two properties close it, and the second matters more than the first: an excluded
 * feature must be recorded absent, AND the registry note must point at the exemption
 * record by name, so the file somebody actually opens carries the decision rather than
 * the appearance of an oversight.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { verifyExemptionRegistries, EXEMPTION_SURFACE_REGISTRIES } from '../../scripts/evidence-on-disk.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const readJson = (relative) => JSON.parse(readFileSync(resolve(root, relative), 'utf8'));

const inventory = readJson('console/inventories/surface-completeness.json');
const exemptions = readJson('console/inventories/exemptions.json');

/** A registry reader that answers from a table, so a case can plant one lie and no more. */
const readerFor = (overrides = {}) => (absolute) => {
  const relative = String(absolute).replaceAll('\\', '/').slice(String(root).replaceAll('\\', '/').length + 1);
  if (Object.hasOwn(overrides, relative)) return JSON.stringify(overrides[relative]);
  return readFileSync(absolute, 'utf8');
};

/** The registry as it stands, with one feature's row replaced. */
function registryWith(relative, id, row) {
  const registry = readJson(relative);
  registry.features[id] = { ...registry.features[id], ...row };
  return { [relative]: registry };
}

const mustFail = (name, options) => {
  assert.throws(() => verifyExemptionRegistries(inventory, exemptions, { root, ...options }), /exemption-registry problem/u, name);
  try {
    verifyExemptionRegistries(inventory, exemptions, { root, ...options });
  } catch (error) {
    return error.message;
  }
  throw new Error(`${name}: expected a refusal`);
};

test('the records as they stand agree, so nothing below passes vacuously', () => {
  const result = verifyExemptionRegistries(inventory, exemptions, { root });
  assert.ok(result.checked > 0, 'no exempt row was checked at all, so every assertion here would be about nothing');
});

test('every exempt row really is exempt in the inventory, so the count is not an accident', () => {
  const exempt = inventory.surfaces.flatMap((surface) => surface.features.filter((feature) => feature.status === 'exempt'));
  assert.equal(verifyExemptionRegistries(inventory, exemptions, { root }).checked, exempt.length,
    'the check visited a different number of rows than the inventory marks exempt');
});

test('an excluded feature that has been built is refused, and the refusal names who excluded it', () => {
  /* The exact thing that happened, replayed: the site converter row set to implemented. */
  const message = mustFail('a built exclusion', {
    read: readerFor(registryWith('console/site/feature-registry.json', 'local-file-converter', {
      state: 'implemented',
      note: 'Excluded by owner decision, recorded in console/inventories/exemptions.json, and then built anyway.',
    })),
  });
  assert.match(message, /pages-site\.local-file-converter/u, 'the refusal does not name the row');
  assert.match(message, /excluded by owner on 2026-08-23/u,
    'the refusal does not name who excluded it or when, which is the whole reason to stop rather than to argue');
  assert.match(message, /an excluded feature has been built/u);
});

test('a half-built exclusion is refused too, because "partial" is not "absent"', () => {
  const message = mustFail('a partially built exclusion', {
    read: readerFor(registryWith('console/app/feature-registry.json', 'ollama-suite-manager', {
      state: 'partial',
      note: 'Excluded by owner decision, recorded in console/inventories/exemptions.json.',
    })),
  });
  assert.match(message, /windows-console\.ollama-suite-manager/u);
});

test('a registry note that never points at the exemption record is refused, gap-shaped as it is', () => {
  /* This is the one that would actually have prevented the afternoon. The row was
   * already `absent` and already carried a long, accurate, useful note -- and nothing in
   * it said the absence was a decision, so it read exactly like work nobody had got to. */
  const message = mustFail('a note that reads as an oversight', {
    read: readerFor(registryWith('console/site/feature-registry.json', 'local-file-converter', {
      state: 'absent',
      note: "The site's to*() functions are export formatting, not a general-purpose converter. No such converter surface exists.",
    })),
  });
  assert.match(message, /never points at exemptions\.json/u);
  assert.match(message, /a gap to fill rather than a decision to argue with/u);
});

test('an exempt row with no registry entry at all is refused rather than skipped', () => {
  const registry = readJson('console/site/feature-registry.json');
  delete registry.features['local-file-converter'];
  const message = mustFail('a missing registry row', {
    read: readerFor({ 'console/site/feature-registry.json': registry }),
  });
  assert.match(message, /carries no row for it at all/u);
});

test('a surface with no registry named fails closed, so a new surface cannot be silently unchecked', () => {
  const message = mustFail('an unmapped surface', { registries: { 'windows-console': EXEMPTION_SURFACE_REGISTRIES['windows-console'] } });
  assert.match(message, /pages-site names no feature registry/u);
});

test('an unreadable registry is reported rather than treated as agreement', () => {
  const message = mustFail('an unreadable registry', {
    read: (absolute) => (String(absolute).includes('site') ? 'not json at all' : readFileSync(absolute, 'utf8')),
  });
  assert.match(message, /could not be read/u);
});

test('the check refuses to run without a repository root, rather than resolving against the process directory', () => {
  assert.throws(() => verifyExemptionRegistries(inventory, exemptions, {}), /absolute repository root/u);
});

test('both surfaces name a registry, and both of those files exist and carry feature rows', () => {
  assert.deepEqual(Object.keys(EXEMPTION_SURFACE_REGISTRIES).sort(), inventory.surfaces.map((surface) => surface.id).sort(),
    'the declared registry map and the inventory surfaces have drifted apart');
  for (const relative of Object.values(EXEMPTION_SURFACE_REGISTRIES)) {
    const registry = readJson(relative);
    assert.ok(Object.keys(registry.features ?? {}).length > 0, `${relative} carries no feature rows`);
  }
});

test('the verifier is wired into the inventory check, not merely exported', () => {
  const wiring = readFileSync(resolve(root, 'console/scripts/verify-inventories.mjs'), 'utf8').replaceAll('\r\n', '\n');
  assert.match(wiring, /^\s*const exemptionRegistries = verifyExemptionRegistries\(inventory, exemptionRecord, \{ root \}\);$/mu,
    'verify-inventories.mjs no longer calls verifyExemptionRegistries on a statement boundary -- or the call has been commented out');
  assert.match(wiring, /exempt row\(s\) are recorded absent in their own surface registry/u,
    'the inventory check no longer reports what this verifier found');
});
