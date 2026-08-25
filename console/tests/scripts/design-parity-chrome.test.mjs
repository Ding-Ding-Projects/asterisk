/**
 * The chrome-parity bar's own behaviour, on synthetic images whose every pixel is known.
 *
 * Synthetic rather than the committed captures on purpose: a test that reads a real capture
 * can only assert whatever that capture happens to contain today, so it would go red the
 * next time the application legitimately changes, and it could never exercise the cases
 * that matter most here — a mask wide enough to hide the artifact, an unpainted capture, a
 * capture older than its own build. Those are constructed. The real captures are exercised
 * separately, further down, against the evidence this repository actually committed.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareChrome, buildExclusionMask, unionRect, MINIMUM_COMPARED_FRACTION } from '../../scripts/design-parity-chrome.mjs';
import { readBarDeclaration, buildRegionLedger, maskFromLedger, validateSideMeasurement, EXPECTED_SHELL, regionProbeExpression } from '../../scripts/design-parity-regions.mjs';

const CONSOLE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INVENTORY = JSON.parse(readFileSync(resolve(CONSOLE_ROOT, 'inventories', 'design-parity.json'), 'utf8'));

/** A flat image of one colour. */
const solid = (width, height, [r, g, b]) => {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    pixels[i * 4] = r; pixels[i * 4 + 1] = g; pixels[i * 4 + 2] = b; pixels[i * 4 + 3] = 255;
  }
  return { width, height, pixels };
};

/** Paints a rectangle into an image, so a difference can be put exactly where a test wants it. */
const paint = (image, { x, y, width, height }, [r, g, b]) => {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      const o = (row * image.width + column) * 4;
      image.pixels[o] = r; image.pixels[o + 1] = g; image.pixels[o + 2] = b; image.pixels[o + 3] = 255;
    }
  }
  return image;
};

const SURFACE = [18, 24, 20];
const INK = [200, 210, 200];
/** A frame big enough that a realistic mask still leaves well over the minimum fraction. */
const FRAME = { width: 200, height: 100 };
/** The "content pane": the right-hand 60% of the frame, mirroring the real declared mask. */
const PANE = { x: 80, y: 0, width: 120, height: 100 };

test('identical captures outside the mask are a match, even when the masked region differs wildly', () => {
  const reference = paint(solid(FRAME.width, FRAME.height, SURFACE), PANE, INK);
  const built = solid(FRAME.width, FRAME.height, SURFACE);
  const result = compareChrome({ reference, built, destinationId: 'synthetic', exclusions: [PANE] });
  assert.equal(result.verdict, 'match');
  assert.equal(result.diffPixelCount, 0);
  assert.equal(result.excluded.diffPixelCount, PANE.width * PANE.height,
    'the whole masked region differed and the record has to say so rather than swallow it');
  assert.equal(result.bar, 'chrome-parity');
});

test('one differing pixel outside the mask is a diff, because the tolerance is zero', () => {
  const reference = solid(FRAME.width, FRAME.height, SURFACE);
  const built = solid(FRAME.width, FRAME.height, SURFACE);
  built.pixels[(7 * FRAME.width + 3) * 4] = SURFACE[0] + 1;
  const result = compareChrome({ reference, built, destinationId: 'synthetic', exclusions: [PANE] });
  assert.equal(result.verdict, 'diff');
  assert.equal(result.diffPixelCount, 1);
  assert.deepEqual(result.boundingBox, { x0: 3, y0: 7, x1: 3, y1: 7 });
});

test('a mask wide enough to hide the artifact is refused rather than passed', () => {
  const reference = solid(FRAME.width, FRAME.height, SURFACE);
  const built = paint(solid(FRAME.width, FRAME.height, SURFACE), { x: 0, y: 0, width: 4, height: 4 }, INK);
  const wholeFrame = { x: 0, y: 0, width: FRAME.width, height: FRAME.height };
  const result = compareChrome({ reference, built, destinationId: 'synthetic', exclusions: [wholeFrame] });
  assert.equal(result.verdict, 'refused');
  assert.match(result.reasons.join(' '), /leave[s]? only 0\.0% of the frame to compare/);
});

test('a mask just under the floor is refused and one just over it is not', () => {
  const reference = solid(FRAME.width, FRAME.height, SURFACE);
  const built = solid(FRAME.width, FRAME.height, SURFACE);
  const total = FRAME.width * FRAME.height;
  // Rows are the easy unit here: each is exactly FRAME.width pixels.
  const rowsToLeave = (fraction) => Math.round((fraction * total) / FRAME.width);
  const maskLeaving = (rows) => ({ x: 0, y: rows, width: FRAME.width, height: FRAME.height - rows });

  const tooWide = compareChrome({ reference, built, destinationId: 'synthetic', exclusions: [maskLeaving(rowsToLeave(MINIMUM_COMPARED_FRACTION) - 1)] });
  assert.equal(tooWide.verdict, 'refused', 'a mask leaving less than the floor must refuse');

  const acceptable = compareChrome({ reference, built, destinationId: 'synthetic', exclusions: [maskLeaving(rowsToLeave(MINIMUM_COMPARED_FRACTION) + 1)] });
  assert.equal(acceptable.verdict, 'match', 'a mask leaving more than the floor must be compared normally');
});

test('an unpainted built capture is refused rather than reported as a chrome divergence', () => {
  const reference = solid(FRAME.width, FRAME.height, SURFACE);
  const built = solid(FRAME.width, FRAME.height, [0, 0, 0]);
  const result = compareChrome({ reference, built, destinationId: 'synthetic', exclusions: [PANE] });
  assert.equal(result.verdict, 'refused');
  assert.equal(result.paletteCheck.thresholdExceeded, true);
  assert.match(result.reasons.join(' '), /reads as unpainted/);
});

test('a built capture older than its own build output is refused', () => {
  const reference = solid(FRAME.width, FRAME.height, SURFACE);
  const built = solid(FRAME.width, FRAME.height, SURFACE);
  const result = compareChrome({
    reference, built, destinationId: 'synthetic', exclusions: [PANE],
    builtCaptureMtimeMs: 1_000, builtSourceMtimesMs: [500, 9_000],
  });
  assert.equal(result.verdict, 'refused');
  assert.equal(result.stalenessCheck.stale, true);
});

test('captures of different sizes are refused before any mask is applied', () => {
  const result = compareChrome({
    reference: solid(FRAME.width, FRAME.height, SURFACE),
    built: solid(FRAME.width, FRAME.height - 10, SURFACE),
    destinationId: 'synthetic', exclusions: [PANE],
  });
  assert.equal(result.verdict, 'refused');
  assert.match(result.reasons.join(' '), /dimension mismatch/);
});

test('an absent region ledger is a refusal, never an empty mask', () => {
  assert.throws(
    () => compareChrome({ reference: solid(10, 10, SURFACE), built: solid(10, 10, SURFACE), destinationId: 'synthetic' }),
    /exclusions is required/,
    'comparing with no mask would silently compare the data regions the bar exists to exclude',
  );
});

test('exclusion rectangles are clipped to the frame and an entirely outside one is reported', () => {
  const built = buildExclusionMask({
    width: 10, height: 10,
    exclusions: [{ x: 8, y: 8, width: 20, height: 20 }, { x: 50, y: 50, width: 4, height: 4 }],
  });
  assert.equal(built.excludedPixels, 4, 'the overhanging rectangle contributes only its in-frame part');
  assert.deepEqual(built.clippedAway, [{ x: 50, y: 50, width: 4, height: 4 }]);
});

test('a rectangle that is not four integers is refused rather than coerced', () => {
  assert.throws(() => buildExclusionMask({ width: 10, height: 10, exclusions: [{ x: 0, y: 0, width: 4.5, height: 4 }] }), /four integers/);
  assert.throws(() => buildExclusionMask({ width: 10, height: 10, exclusions: [{ x: 0, y: 0, width: 4 }] }), /four integers/);
});

test('unionRect takes the enclosing rectangle, so neither side can leave data outside the mask', () => {
  assert.deepEqual(
    unionRect({ x: 356, y: 78, width: 1072, height: 946 }, { x: 356, y: 78, width: 1084, height: 922 }),
    { x: 356, y: 78, width: 1084, height: 946 },
  );
  assert.throws(() => unionRect({ x: 0, y: 0, width: 1, height: 1 }, null), /four integers/);
});

test('named areas break a failing comparison down to where it failed', () => {
  const reference = solid(FRAME.width, FRAME.height, SURFACE);
  const built = paint(solid(FRAME.width, FRAME.height, SURFACE), { x: 0, y: 0, width: 10, height: 10 }, INK);
  const result = compareChrome({
    reference, built, destinationId: 'synthetic', exclusions: [PANE],
    areas: { rail: { x: 0, y: 0, width: 40, height: 100 }, sectionList: { x: 40, y: 0, width: 40, height: 100 } },
  });
  assert.equal(result.areas.rail.diffPixelCount, 100);
  assert.equal(result.areas.sectionList.diffPixelCount, 0);
});

/* ------------------------------------------------------------------ the bar declaration -- */

test("the inventory's chromeParityBar declares both data and chrome areas, each with a reason", () => {
  const declaration = readBarDeclaration(INVENTORY);
  assert.ok(declaration.dataAreas.length > 0);
  assert.ok(declaration.chromeAreas.length > 0);
  assert.ok(declaration.dataAreas.includes('contentPane'), 'the destination screen is the region this bar exists to exclude');
  assert.ok(declaration.chromeAreas.includes('rail'), 'the navigation rail is chrome and a divergence there is a defect the bar should report');
});

test('a declaration with no data area, no chrome area, or an undocumented role is refused', () => {
  const withAreas = (areas) => ({ chromeParityBar: { ...INVENTORY.chromeParityBar, areas } });
  assert.throws(() => readBarDeclaration(withAreas({ rail: { role: 'chrome', why: 'x' } })), /declares no 'data' area/);
  assert.throws(() => readBarDeclaration(withAreas({ pane: { role: 'data', why: 'x' } })), /declares no 'chrome' area/);
  assert.throws(() => readBarDeclaration(withAreas({ rail: { role: 'chrome', why: 'x' }, pane: { role: 'data' } })), /gives no reason/);
  assert.throws(() => readBarDeclaration(withAreas({ rail: { role: 'decorative', why: 'x' }, pane: { role: 'data', why: 'x' } })), /no role of 'data' or 'chrome'/);
  assert.throws(() => readBarDeclaration({}), /no chromeParityBar declaration/);
});

/* ---------------------------------------------------------------------- region measuring -- */

const measurementFor = (overrides = {}) => ({
  shell: { x: 0, y: 0, width: 1440, height: 1000 },
  areas: Object.fromEntries(Object.keys(INVENTORY.chromeParityBar.areas).map((name, index) => [
    name, { x: index, y: index, width: 100, height: 40 },
  ])),
  ...overrides,
});

test('a probe that failed is refused rather than written down as geometry', () => {
  const names = Object.keys(INVENTORY.chromeParityBar.areas);
  assert.throws(() => validateSideMeasurement('reference', { error: 'no 3-row shell' }, names), /could not be measured/);
  assert.throws(() => validateSideMeasurement('built', undefined, names), /returned undefined/);
});

test('a side that failed to measure a declared area is refused, so the mask cannot silently shrink', () => {
  const names = Object.keys(INVENTORY.chromeParityBar.areas);
  const broken = measurementFor();
  delete broken.areas.contentPane;
  assert.throws(() => validateSideMeasurement('built', broken, names), /contentPane/);
});

test('a side that measured an area with no declared role is refused', () => {
  const names = Object.keys(INVENTORY.chromeParityBar.areas);
  const extra = measurementFor();
  extra.areas.mysteryPanel = { x: 0, y: 0, width: 10, height: 10 };
  assert.throws(() => validateSideMeasurement('reference', extra, names), /mysteryPanel/);
});

test('a region ledger unions the two sides and carries the declared roles and reasons', () => {
  const reference = measurementFor();
  const built = measurementFor();
  built.areas.contentPane = { x: 356, y: 78, width: 1084, height: 922 };
  reference.areas.contentPane = { x: 356, y: 78, width: 1072, height: 946 };
  const ledger = buildRegionLedger({ destinationId: 'synthetic', tuple: INVENTORY.captureContract.captureTuple, reference, built, inventory: INVENTORY });
  assert.deepEqual(ledger.areas.contentPane.union, { x: 356, y: 78, width: 1084, height: 946 });
  assert.equal(ledger.areas.contentPane.role, 'data');
  assert.equal(ledger.areas.rail.role, 'chrome');
  assert.ok(ledger.areas.contentPane.why.length > 0, 'a role is a judgement and the ledger has to carry what it rests on');
  assert.deepEqual(ledger.exclusions.map((e) => e.area).sort(), readBarDeclaration(INVENTORY).dataAreas.sort());
  assert.deepEqual(ledger.comparedAreas.sort(), readBarDeclaration(INVENTORY).chromeAreas.sort());

  const { exclusions, areas } = maskFromLedger(ledger);
  assert.equal(exclusions.length, ledger.exclusions.length);
  assert.deepEqual(Object.keys(areas).sort(), ledger.comparedAreas.sort());
  assert.ok(!('area' in exclusions[0]), 'the mask compareChrome takes is plain rectangles');
});

test('the region probe locates the shell structurally and names a structure that has drifted', () => {
  const expression = regionProbeExpression('document', '{ x: 0, y: 0 }');
  assert.match(expression, new RegExp(`children\\.length === ${EXPECTED_SHELL.rows}`),
    'the shell is found by the row count the design specifies, not by a class name the two toolchains both hash');
  assert.match(expression, new RegExp(`!== ${EXPECTED_SHELL.topCells}`));
  assert.match(expression, new RegExp(`!== ${EXPECTED_SHELL.mainColumns}`));
  assert.doesNotMatch(expression, /className\s*===/, 'a class-name match would work on one side and never the other');
});

/* ------------------------------------------------- the evidence this repository committed -- */

const evidencePath = (key, id) => resolve(CONSOLE_ROOT, '..', INVENTORY.evidenceTemplates[key].replaceAll('{id}', id));
const committedChromeRecords = () => INVENTORY.destinations
  .map((destination) => destination.id)
  .filter((id) => existsSync(evidencePath('chromeParity', id)))
  .map((id) => ({ id, record: JSON.parse(readFileSync(evidencePath('chromeParity', id), 'utf8')) }));

test('every committed chrome-parity record was really measured, at the declared tuple, with a real mask', () => {
  const records = committedChromeRecords();
  assert.ok(records.length > 0, 'no chrome-parity evidence is committed, so this check would prove nothing');
  const tuple = INVENTORY.captureContract.captureTuple;
  for (const { id, record } of records) {
    assert.equal(record.destinationId, id, `${id}: the record names a different destination`);
    assert.equal(record.bar, 'chrome-parity', `${id}: the record measured some other bar`);
    assert.deepEqual(record.tuple, tuple, `${id}: measured at a tuple other than the declared one`);
    assert.equal(record.dimensions.reference.width, tuple.width, `${id}: reference capture is not the declared width`);
    assert.equal(record.dimensions.built.height, tuple.height, `${id}: built capture is not the declared height`);
    assert.ok(record.excluded.rectangles.length > 0, `${id}: the mask excluded nothing`);
    assert.equal(record.stalenessCheck.checked, true, `${id}: the staleness check never ran`);
    assert.equal(record.stalenessCheck.stale, false, `${id}: the built capture predates its own build output`);
    assert.equal(record.paletteCheck.thresholdExceeded, false, `${id}: the built capture reads as unpainted`);
    assert.ok(record.comparedFraction >= INVENTORY.chromeParityBar.minimumComparedFraction,
      `${id}: compared ${record.comparedFraction} of the frame, below the declared floor`);
    assert.ok(record.reasons.length === 0 || record.verdict === 'refused',
      `${id}: a record carrying reasons must be refused, not quietly compared`);
  }
});

test("every committed chrome-parity record cites exactly the mask its own region ledger measured", () => {
  const key = (rect) => `${rect.x},${rect.y},${rect.width},${rect.height}`;
  const records = committedChromeRecords();
  assert.ok(records.length > 0, 'no chrome-parity evidence is committed, so this check would prove nothing');
  for (const { id, record } of records) {
    const ledgerFile = evidencePath('regionLedger', id);
    assert.ok(existsSync(ledgerFile), `${id}: a chrome-parity record exists with no region ledger beside it`);
    const ledger = JSON.parse(readFileSync(ledgerFile, 'utf8'));
    assert.equal(ledger.destinationId, id);
    assert.deepEqual(
      record.excluded.rectangles.map(key).sort(),
      ledger.exclusions.map(key).sort(),
      `${id}: the comparison used a mask the ledger never recorded`,
    );
    for (const [name, area] of Object.entries(ledger.areas)) {
      assert.equal(area.role, INVENTORY.chromeParityBar.areas[name]?.role,
        `${id}: the ledger records '${name}' with a role the inventory does not declare`);
    }
  }
});
