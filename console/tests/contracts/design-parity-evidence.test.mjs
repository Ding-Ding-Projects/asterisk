// Proves the design-parity evidence pipeline: the dependency-free PNG codec, the
// reference-versus-built diff tool, the deterministic capture-route contract, and the
// fail-closed guard that refuses a `verified` claim without real evidence behind it.
//
// None of this drives a real headless browser: what is tested here is everything that does
// not require one — the pixel math, the route/selector contract as data, and the guard's
// refusal logic, each proven with a deliberate red-then-green case per the project's own
// guard-quality rule.
//
// This header used to add "that capability does not exist in this worktree". It does now:
// console/scripts/design-parity-capture-run.mjs takes both sides against real Chromium on an
// off-screen Windows desktop, and the captures it produced are guarded by
// design-parity-captures-on-disk.mjs and tests/contracts/design-parity-capture-harness.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync, crc32 } from 'node:zlib';
import { decodePNG, encodePNG } from '../../scripts/png-codec.mjs';
import { compareCaptures, PALETTE_BLACK_FRACTION_LIMIT } from '../../scripts/design-parity-diff.mjs';
import {
  parseCaptureTuple, referenceRouteFor, builtRouteFor, navigationPlanFor, DEFAULT_TUPLE,
} from '../../scripts/design-parity-capture.mjs';
import { verifyDesignParityEvidence } from '../../scripts/design-parity-evidence-on-disk.mjs';
import { computeLabels, translateRail } from '../../scripts/design-parity-labels.mjs';

const root = resolve(import.meta.dirname, '..', '..', '..');

function solid(width, height, [r, g, b, a]) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    pixels[i * 4] = r; pixels[i * 4 + 1] = g; pixels[i * 4 + 2] = b; pixels[i * 4 + 3] = a;
  }
  return { width, height, pixels };
}

function checkerboard(width, height) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const on = (x + y) % 2 === 0;
      const i = (y * width + x) * 4;
      pixels[i] = on ? 255 : 12; pixels[i + 1] = on ? 200 : 30; pixels[i + 2] = on ? 40 : 210; pixels[i + 3] = 255;
    }
  }
  return { width, height, pixels };
}

// --- png-codec ---------------------------------------------------------------------------

test('png-codec: encode then decode round-trips exactly for a checkerboard image', () => {
  const original = checkerboard(9, 7);
  const buffer = encodePNG(original);
  assert.ok(buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'missing PNG signature');
  const decoded = decodePNG(buffer);
  assert.equal(decoded.width, original.width);
  assert.equal(decoded.height, original.height);
  assert.deepEqual(Array.from(decoded.pixels), Array.from(original.pixels));
});

test('png-codec: encode then decode round-trips a solid translucent image', () => {
  const original = solid(4, 4, [10, 20, 30, 128]);
  const decoded = decodePNG(encodePNG(original));
  assert.deepEqual(Array.from(decoded.pixels), Array.from(original.pixels));
});

function buildPng(ihdrData, idatData) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunk = (type, data) => {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0);
    return Buffer.concat([len, t, data, crc]);
  };
  return Buffer.concat([sig, chunk('IHDR', ihdrData), chunk('IDAT', idatData), chunk('IEND', Buffer.alloc(0))]);
}

test('png-codec: unfilter reconstructs Sub and Up scanlines independently of the encoder', () => {
  // Hand-built 2x2 RGB (bytesPerPixel=3) raw filtered stream, cross-checking the unfilter
  // math against values worked out by hand from the PNG spec rather than against our own
  // encoder (which only ever emits filter type 0), so this is a genuine second source.
  const width = 2, height = 2;
  const row0 = [1, /* filter Sub */ 10, 20, 30, 5, 5, 5]; // second pixel = (10+5,20+5,30+5)=(15,25,35)
  const row1 = [2, /* filter Up */ 1, 1, 1, 2, 2, 2]; // adds row0 above: (11,21,31),(17,27,37)
  const raw = Buffer.from([...row0, ...row1]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); ihdr.writeUInt8(2, 9); ihdr.writeUInt8(0, 10); ihdr.writeUInt8(0, 11); ihdr.writeUInt8(0, 12);
  const png = buildPng(ihdr, deflateSync(raw));
  const decoded = decodePNG(png);
  assert.deepEqual(Array.from(decoded.pixels), [
    10, 20, 30, 255, 15, 25, 35, 255,
    11, 21, 31, 255, 17, 27, 37, 255,
  ]);
});

test('png-codec: refuses a 16-bit-depth PNG rather than silently mis-decoding it', () => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4);
  ihdr.writeUInt8(16, 8); ihdr.writeUInt8(2, 9); ihdr.writeUInt8(0, 10); ihdr.writeUInt8(0, 11); ihdr.writeUInt8(0, 12);
  const png = buildPng(ihdr, deflateSync(Buffer.alloc(1 + 1 * 6)));
  assert.throws(() => decodePNG(png), /unsupported bit depth/);
});

test('png-codec: refuses interlaced PNGs rather than silently mis-decoding them', () => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4);
  ihdr.writeUInt8(8, 8); ihdr.writeUInt8(2, 9); ihdr.writeUInt8(0, 10); ihdr.writeUInt8(0, 11); ihdr.writeUInt8(1, 12);
  const png = buildPng(ihdr, deflateSync(Buffer.alloc(1 + 1 * 3)));
  assert.throws(() => decodePNG(png), /interlaced/);
});

test('png-codec: refuses a truncated / corrupt capture rather than decoding garbage', () => {
  const buffer = encodePNG(solid(3, 3, [1, 2, 3, 255]));
  assert.throws(() => decodePNG(buffer.subarray(0, buffer.length - 20)), /truncated|CRC mismatch/);
});

// --- design-parity-diff -------------------------------------------------------------------

test('compareCaptures: identical images produce a match verdict with zero diff pixels', () => {
  const img = checkerboard(12, 8);
  const result = compareCaptures({ reference: img, built: img, destinationId: 'dash' });
  assert.equal(result.diffPixelCount, 0);
  assert.equal(result.diffPercentage, 0);
  assert.equal(result.paletteCheck.thresholdExceeded, false);
  assert.equal(result.verdict, 'match');
});

test('compareCaptures: a single changed pixel is counted and located, verdict becomes diff', () => {
  const reference = solid(5, 5, [10, 10, 10, 255]);
  const built = solid(5, 5, [10, 10, 10, 255]);
  built.pixels[(2 * 5 + 3) * 4] = 250; // move one channel of pixel (3,2) far away
  const result = compareCaptures({ reference, built, destinationId: 'live' });
  assert.equal(result.diffPixelCount, 1);
  assert.ok(result.diffPercentage > 0);
  assert.deepEqual(result.boundingBox, { x0: 3, y0: 2, x1: 3, y1: 2 });
  assert.equal(result.verdict, 'diff');
});

test('compareCaptures: dimension mismatch is refused, never silently cropped or stretched', () => {
  const reference = solid(10, 10, [1, 1, 1, 255]);
  const built = solid(11, 10, [1, 1, 1, 255]);
  const result = compareCaptures({ reference, built, destinationId: 'endpoints' });
  assert.equal(result.verdict, 'refused');
  assert.ok(result.reasons.some((reason) => /dimension/i.test(reason)));
});

test('compareCaptures: a fully black built capture is refused as an unpainted region, not a design match', () => {
  const reference = checkerboard(20, 20);
  const built = solid(20, 20, [0, 0, 0, 255]);
  const result = compareCaptures({ reference, built, destinationId: 'about' });
  assert.equal(result.paletteCheck.thresholdExceeded, true);
  assert.ok(result.paletteCheck.blackFraction > PALETTE_BLACK_FRACTION_LIMIT);
  assert.equal(result.verdict, 'refused');
  assert.ok(result.reasons.some((reason) => /black|unpainted/i.test(reason)));
});

test('compareCaptures: a stale built capture (older than its own build output) is refused', () => {
  const img = checkerboard(6, 6);
  const result = compareCaptures({
    reference: img,
    built: img,
    destinationId: 'dash',
    builtCaptureMtimeMs: 1000,
    builtSourceMtimesMs: [2000, 500],
  });
  assert.equal(result.stalenessCheck.stale, true);
  assert.equal(result.verdict, 'refused');
  assert.ok(result.reasons.some((reason) => /stale/i.test(reason)));
});

test('compareCaptures: a built capture newer than every build source passes the staleness check', () => {
  const img = checkerboard(6, 6);
  const result = compareCaptures({
    reference: img,
    built: img,
    destinationId: 'dash',
    builtCaptureMtimeMs: 5000,
    builtSourceMtimesMs: [2000, 500],
  });
  assert.equal(result.stalenessCheck.stale, false);
  assert.equal(result.verdict, 'match');
});

test('compareCaptures: writes a side-by-side comparison whose width is the sum of both captures', () => {
  const reference = checkerboard(6, 4);
  const built = checkerboard(6, 4);
  const result = compareCaptures({ reference, built, destinationId: 'dash', sideBySide: true });
  const decoded = decodePNG(result.sideBySideBuffer);
  assert.equal(decoded.height, 4);
  assert.ok(decoded.width >= reference.width + built.width, 'side-by-side must be at least as wide as both captures combined');
});

// --- design-parity-capture (the deterministic route/selector contract) --------------------

test('parseCaptureTuple: reads the exact five-part tuple from a query string, defaults filled in', () => {
  const tuple = parseCaptureTuple('destination=endpoints&theme=dark&width=1440&height=1000&scale=1');
  assert.deepEqual(tuple, { destination: 'endpoints', state: 'default', theme: 'dark', width: 1440, height: 1000, scale: 1 });
});

test('parseCaptureTuple: refuses a request with no destination named', () => {
  assert.throws(() => parseCaptureTuple('theme=dark'), /destination/);
});

test('parseCaptureTuple: refuses an out-of-range scale or non-numeric viewport', () => {
  assert.throws(() => parseCaptureTuple('destination=dash&scale=0'), /scale/);
  assert.throws(() => parseCaptureTuple('destination=dash&width=abc'), /width/);
});

test('referenceRouteFor / builtRouteFor: substitute {id} and the full tuple into the committed evidence templates', () => {
  const inventory = JSON.parse(readFileSync(resolve(root, 'console/inventories/design-parity.json'), 'utf8'));
  const reference = referenceRouteFor(inventory, 'endpoints', DEFAULT_TUPLE);
  const built = builtRouteFor(inventory, 'endpoints', DEFAULT_TUPLE);
  assert.ok(reference.includes('destination=endpoints'));
  assert.ok(reference.startsWith('console/design-reference/index.html'));
  assert.ok(built.includes('destination/endpoints'));
  assert.ok(built.startsWith('ding-pbx://'));
});

test('navigationPlanFor: a destination on a different rail clicks the rail first, then the section by its exact label', () => {
  const labels = { dash: { rail: 'pbx', label: 'Dashboard', title: 'Dashboard' }, security: { rail: 'system', label: 'Security', title: 'Security' } };
  const plan = navigationPlanFor('security', labels, /* currentRail */ 'pbx');
  assert.deepEqual(plan.steps.map((step) => step.kind), ['click-rail', 'click-section']);
  assert.equal(plan.steps[0].target, 'system');
  assert.equal(plan.steps[1].target, 'Security');
  assert.equal(plan.settle.expectedHeading, 'Security');
});

test('navigationPlanFor: staying on the same rail skips the rail click', () => {
  const labels = { dash: { rail: 'pbx', label: 'Dashboard', title: 'Dashboard' }, live: { rail: 'pbx', label: 'Live channels', title: 'Live channels' } };
  const plan = navigationPlanFor('live', labels, 'pbx');
  assert.deepEqual(plan.steps.map((step) => step.kind), ['click-section']);
});

test('navigationPlanFor: refuses a destination id absent from the labels map', () => {
  assert.throws(() => navigationPlanFor('nope', {}, 'pbx'), /nope/);
});

// --- design-parity-evidence-on-disk (the fail-closed guard) --------------------------------

test('verifyDesignParityEvidence: an inventory with no verified rows checks nothing and passes', () => {
  const inventory = JSON.parse(readFileSync(resolve(root, 'console/inventories/design-parity.json'), 'utf8'));
  const result = verifyDesignParityEvidence(inventory, { root, exists: () => false, read: () => '' });
  assert.equal(result.verifiedRows, 0);
});

test('verifyDesignParityEvidence: claiming verified with every artifact absent is refused', () => {
  const inventory = JSON.parse(readFileSync(resolve(root, 'console/inventories/design-parity.json'), 'utf8'));
  const candidate = structuredClone(inventory);
  candidate.destinations[0].status = 'verified';
  assert.throws(() => verifyDesignParityEvidence(candidate, { root, exists: () => false, read: () => '' }), /absent/);
});

/**
 * One honest set of evidence files, so each test below can plant exactly one lie in it.
 *
 * Note which file is allowed to say `diff`. The whole-frame `visualDiff` SHOULD record a
 * divergence on a verified row: that is the design's invented sample content sitting where
 * the application shows a real reading, and a `match` there would mean the application had
 * grown the sample rows back. The bar a verified row rests on is the chrome record beside
 * it, which must be a match.
 */
const HONEST_EXCLUSIONS = [
  { area: 'contentPane', x: 356, y: 78, width: 1084, height: 946 },
  { area: 'statusCell', x: 1060, y: 0, width: 380, height: 40 },
];
const honestEvidence = (id, overrides = {}) => ({
  diff: JSON.stringify({
    destinationId: id, verdict: 'diff', diffPixelCount: 828314,
    paletteCheck: { thresholdExceeded: false }, stalenessCheck: { checked: true, stale: false },
  }),
  regions: JSON.stringify({
    destinationId: id, bar: 'chrome-parity',
    areas: { contentPane: { role: 'data' }, statusCell: { role: 'data' }, rail: { role: 'chrome' } },
    exclusions: HONEST_EXCLUSIONS, comparedAreas: ['rail'],
  }),
  chrome: JSON.stringify({
    destinationId: id, bar: 'chrome-parity', verdict: 'match', diffPixelCount: 0,
    comparedFraction: 0.2954, excluded: { rectangles: HONEST_EXCLUSIONS },
    paletteCheck: { thresholdExceeded: false }, stalenessCheck: { checked: true, stale: false },
  }),
  material: JSON.stringify({ destinationId: id, conforms: true, defects: [] }),
  ...overrides,
});
const readerFor = (files) => (path) => {
  const p = String(path);
  if (p.includes('-diff.json')) return files.diff;
  if (p.includes('-regions.json')) return files.regions;
  if (p.includes('-chrome.json')) return files.chrome;
  if (p.includes('-material.json')) return files.material;
  return 'binary-capture-placeholder';
};
const verifiedCandidate = () => {
  const candidate = structuredClone(JSON.parse(readFileSync(resolve(root, 'console/inventories/design-parity.json'), 'utf8')));
  candidate.destinations[0].status = 'verified';
  return candidate;
};

test('verifyDesignParityEvidence: a chrome-parity record that found a real divergence is refused, presence is not enough', () => {
  const candidate = verifiedCandidate();
  const id = candidate.destinations[0].id;
  const files = honestEvidence(id, {
    chrome: JSON.stringify({
      destinationId: id, bar: 'chrome-parity', verdict: 'diff', diffPixelCount: 28354,
      comparedFraction: 0.2954, excluded: { rectangles: HONEST_EXCLUSIONS },
      paletteCheck: { thresholdExceeded: false }, stalenessCheck: { checked: true, stale: false },
    }),
  });
  assert.throws(() => verifyDesignParityEvidence(candidate, { root, exists: () => true, read: readerFor(files) }),
    /chromeParity verdict is 'diff'/);
});

test('verifyDesignParityEvidence: a whole-frame visualDiff recording the data divergence does NOT block a verified row', () => {
  const candidate = verifiedCandidate();
  const files = honestEvidence(candidate.destinations[0].id);
  // The old bar refused exactly this, which is why no row could ever be verified: the
  // application shows real readings where the design shows invented ones, so the
  // whole-frame comparison is supposed to differ.
  const result = verifyDesignParityEvidence(candidate, { root, exists: () => true, read: readerFor(files) });
  assert.equal(result.verifiedRows, 1);
});

test('verifyDesignParityEvidence: a whole-frame visualDiff that was refused rather than taken still blocks a verified row', () => {
  const candidate = verifiedCandidate();
  const id = candidate.destinations[0].id;
  const files = honestEvidence(id, {
    diff: JSON.stringify({
      destinationId: id, verdict: 'refused', reasons: ['dimension mismatch'],
      paletteCheck: { thresholdExceeded: false }, stalenessCheck: { checked: true, stale: false },
    }),
  });
  assert.throws(() => verifyDesignParityEvidence(candidate, { root, exists: () => true, read: readerFor(files) }),
    /never happened/);
});

test('verifyDesignParityEvidence: a chrome comparison citing a mask the region ledger never recorded is refused', () => {
  const candidate = verifiedCandidate();
  const id = candidate.destinations[0].id;
  const files = honestEvidence(id, {
    chrome: JSON.stringify({
      destinationId: id, bar: 'chrome-parity', verdict: 'match', diffPixelCount: 0,
      comparedFraction: 0.2954,
      excluded: { rectangles: [{ area: 'everything', x: 0, y: 0, width: 1440, height: 1000 }] },
      paletteCheck: { thresholdExceeded: false }, stalenessCheck: { checked: true, stale: false },
    }),
  });
  assert.throws(() => verifyDesignParityEvidence(candidate, { root, exists: () => true, read: readerFor(files) }),
    /a mask nobody measured/);
});

test('verifyDesignParityEvidence: a visualDiff for the wrong destination id is refused even though the file exists', () => {
  const candidate = verifiedCandidate();
  const files = honestEvidence(candidate.destinations[0].id, {
    diff: JSON.stringify({
      destinationId: 'some-other-destination', verdict: 'diff', diffPixelCount: 40,
      paletteCheck: { thresholdExceeded: false }, stalenessCheck: { checked: true, stale: false },
    }),
  });
  assert.throws(() => verifyDesignParityEvidence(candidate, { root, exists: () => true, read: readerFor(files) }), /destination id/);
});

test('verifyDesignParityEvidence: a region ledger measured on a different screen is refused', () => {
  const candidate = verifiedCandidate();
  const files = honestEvidence(candidate.destinations[0].id, {
    regions: JSON.stringify({
      destinationId: 'some-other-destination', bar: 'chrome-parity',
      areas: { contentPane: { role: 'data' } }, exclusions: HONEST_EXCLUSIONS, comparedAreas: ['rail'],
    }),
  });
  assert.throws(() => verifyDesignParityEvidence(candidate, { root, exists: () => true, read: readerFor(files) }),
    /measured on a different screen/);
});

test('verifyDesignParityEvidence: a fully honest verified row (chrome match + conforming audit) is accepted', () => {
  const candidate = verifiedCandidate();
  const files = honestEvidence(candidate.destinations[0].id);
  const result = verifyDesignParityEvidence(candidate, { root, exists: () => true, read: readerFor(files) });
  assert.equal(result.verifiedRows, 1);
  // Seven artifacts now, not five: the region ledger and the chrome record joined the set
  // when the bar moved off whole-frame pixel identity.
  assert.equal(result.checked, 7);
});

test('verifyDesignParityEvidence: a materialAudit that records unresolved conformance defects is refused', () => {
  const candidate = verifiedCandidate();
  const files = honestEvidence(candidate.destinations[0].id, {
    material: JSON.stringify({ destinationId: candidate.destinations[0].id, conforms: false, defects: ['legacy checkbox on the queues screen'] }),
  });
  assert.throws(() => verifyDesignParityEvidence(candidate, { root, exists: () => true, read: readerFor(files) }), /conform/);
});

// --- design-parity-labels (rail-vocabulary translation and drift detection) ---------------

test('translateRail: translates the catalog\'s "sys" to the audit inventory\'s "system", leaves other rails untouched', () => {
  assert.equal(translateRail('sys'), 'system');
  for (const rail of ['pbx', 'media', 'data', 'agent', 'app']) assert.equal(translateRail(rail), rail);
});

test('computeLabels: produces one label entry per audited destination, translating rails', () => {
  const inventory = { destinations: [{ id: 'security', rail: 'system' }, { id: 'dash', rail: 'pbx' }] };
  const catalog = [
    { id: 'security', rail: 'sys', label: 'Security', title: 'Security' },
    { id: 'dash', rail: 'pbx', label: 'Dashboard', title: 'Dashboard' },
    { id: 'fcodes', rail: 'pbx', label: 'Feature codes', title: 'Feature codes' }, // not audited — must be excluded
  ];
  const catalogRails = [
    { id: 'sys', icon: 'settings_applications', label: 'System' },
    { id: 'pbx', icon: 'call', label: 'PBX' },
    { id: 'media', icon: 'graphic_eq', label: 'Media' }, // unused rail — must be excluded from the output
  ];
  const generated = computeLabels(inventory, catalog, catalogRails);
  assert.equal(generated.destinationCount, 2);
  assert.deepEqual(Object.keys(generated.labels).sort(), ['dash', 'security']);
  assert.deepEqual(generated.labels.security, { rail: 'system', label: 'Security', title: 'Security' });
  assert.deepEqual(Object.keys(generated.rails).sort(), ['pbx', 'system']);
  assert.deepEqual(generated.rails.system, { icon: 'settings_applications', label: 'System' });
});

test('computeLabels: refuses when a rail an audited destination uses has no icon in the compiled RAIL strip', () => {
  const inventory = { destinations: [{ id: 'dash', rail: 'pbx' }] };
  const catalog = [{ id: 'dash', rail: 'pbx', label: 'Dashboard', title: 'Dashboard' }];
  assert.throws(() => computeLabels(inventory, catalog, []), /no icon in the compiled RAIL strip/);
});

test('computeLabels: refuses when an audited destination id no longer exists in the compiled catalog', () => {
  const inventory = { destinations: [{ id: 'vanished', rail: 'pbx' }] };
  assert.throws(() => computeLabels(inventory, []), /vanished/);
});

test('computeLabels: refuses when the compiled rail disagrees with the audited rail after translation (rail drift)', () => {
  const inventory = { destinations: [{ id: 'dash', rail: 'media' }] }; // audit says media
  const catalog = [{ id: 'dash', rail: 'pbx', label: 'Dashboard', title: 'Dashboard' }]; // catalog says pbx
  assert.throws(() => computeLabels(inventory, catalog), /rail drift/);
});

test('computeLabels: the real committed inventory and catalog agree — no rail drift today', async () => {
  const inventory = JSON.parse(readFileSync(resolve(root, 'console/inventories/design-parity.json'), 'utf8'));
  const generatedLabels = JSON.parse(readFileSync(resolve(root, 'console/design-reference/destination-labels.generated.json'), 'utf8'));
  assert.equal(generatedLabels.destinationCount, inventory.destinations.length);
  for (const destination of inventory.destinations) {
    assert.ok(generatedLabels.labels[destination.id], `${destination.id}: missing from the generated labels file`);
    assert.equal(generatedLabels.labels[destination.id].rail, destination.rail, `${destination.id}: rail drifted between the audit and the generated labels`);
  }
});

// --- generated capture manifest (maps all 32 destinations to routes/paths/click plans) ----

test('capture-manifest.generated.json covers every audited destination exactly once, in inventory order', () => {
  const inventory = JSON.parse(readFileSync(resolve(root, 'console/inventories/design-parity.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(resolve(root, 'console/design-reference/capture-manifest.generated.json'), 'utf8'));
  assert.equal(manifest.destinationCount, inventory.destinations.length);
  assert.deepEqual(manifest.destinations.map((entry) => entry.id), inventory.destinations.map((destination) => destination.id));
});

test('capture-manifest.generated.json: every entry carries a resolved route and every evidence path, with {id} fully substituted', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'console/design-reference/capture-manifest.generated.json'), 'utf8'));
  for (const entry of manifest.destinations) {
    for (const key of ['referenceRoute', 'builtRoute', 'referenceCapture', 'builtCapture', 'sideBySide', 'visualDiff', 'materialAudit']) {
      assert.ok(typeof entry[key] === 'string' && entry[key].length > 0, `${entry.id}: ${key} is missing`);
      assert.equal(entry[key].includes('{id}'), false, `${entry.id}: ${key} still has an unsubstituted {id} placeholder`);
    }
    assert.ok(entry.navigationPlan.steps.length > 0, `${entry.id}: navigationPlan has no steps`);
    assert.equal(entry.navigationPlan.settle.expectedHeading.length > 0, true, `${entry.id}: navigationPlan has no settle heading`);
  }
});

test('capture-manifest.generated.json: every plan starts from its own rail, including consecutive same-rail destinations', () => {
  // This test used to assert the OPPOSITE — that a destination on the same rail as the one
  // before it omits the rail click — because the manifest modelled one continuous session that
  // never switched rails twice. That session does not exist: the harness loads one destination
  // per page load, so the twenty-six plans with no rail click could only ever look for a
  // section that was not on screen, and every one of them failed on the first real run while
  // the six rail-leading ones passed. Addressability is the contract a capture route needs, and
  // saving a click is not worth giving it up.
  const manifest = JSON.parse(readFileSync(resolve(root, 'console/design-reference/capture-manifest.generated.json'), 'utf8'));
  for (const entry of manifest.destinations) {
    assert.deepEqual(
      entry.navigationPlan.steps.map((step) => step.kind),
      ['click-rail', 'click-section'],
      `${entry.id}: a capture route has to be reachable from a freshly loaded harness on its own`,
    );
  }
});

test('navigationPlanFor still skips the rail click when a caller genuinely is on that rail', () => {
  // The generator no longer uses it, but the same-rail branch is real behaviour a driver
  // holding one page open would want, and deleting the assertion with the caller would leave it
  // untested rather than removed.
  const labels = { dash: { rail: 'pbx', label: 'Dashboard', title: 'Dashboard' } };
  assert.deepEqual(navigationPlanFor('dash', labels, 'pbx').steps.map((step) => step.kind), ['click-section']);
  assert.deepEqual(navigationPlanFor('dash', labels, null).steps.map((step) => step.kind), ['click-rail', 'click-section']);
});

// --- design-reference/route.mjs (the harness's pure, DOM-free pieces) ---------------------

test('route.mjs tupleFromLocation: reuses the shared parseCaptureTuple, accepting a leading "?"', async () => {
  const { tupleFromLocation } = await import('../../design-reference/route.mjs');
  assert.deepEqual(
    tupleFromLocation('?destination=dash&theme=light'),
    { destination: 'dash', state: 'default', theme: 'light', width: 1440, height: 1000, scale: 1 },
  );
});

test('route.mjs designFrameSrc: points at the real checked-in design export as the capture host serves it, with the theme carried through', async () => {
  const { designFrameSrc } = await import('../../design-reference/route.mjs');
  const { DESIGN_HOST_PREFIX } = await import('../../scripts/design-parity-server.mjs');
  const src = designFrameSrc({ theme: 'dark' });
  assert.equal(src, './design-host/Asterisk Console M3.dc.html?theme=dark');

  // That virtual directory is not a copy of the design. The capture host maps it back onto the
  // real design/ folder and injects only the local-React shim on the way out, so prove the file
  // this route resolves to is genuinely the checked-in one, through that same mapping.
  const resolved = new URL(src, 'http://127.0.0.1/console/design-reference/');
  assert.ok(resolved.pathname.startsWith(DESIGN_HOST_PREFIX), `${resolved.pathname} is not served from the design host prefix`);
  const target = resolve(root, 'design', decodeURIComponent(resolved.pathname.slice(DESIGN_HOST_PREFIX.length)));
  assert.doesNotThrow(() => readFileSync(target, 'utf8'), 'design-reference/route.mjs points at a design file that does not exist');
});
