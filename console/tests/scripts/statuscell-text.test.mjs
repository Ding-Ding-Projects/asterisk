/**
 * Contract: the statusCell text finding is arithmetic, not a story.
 *
 * The prose says the built application inherits a font weight the design does not, that the
 * consequence is a 0.359375px leftward shift of everything inside the mode picker, and that
 * applying the appearance system's own defaults to the design reproduces the built capture
 * exactly. Every one of those is a number, and every one of them is checked here against the
 * committed artifacts rather than against the sentence that describes them.
 *
 * The end-to-end check is deliberately narrowed to two destinations. It re-derives the
 * localisation on all 32 when `test:inventories` runs it for real; doing that here as well
 * would decode sixty-four 1440x1000 PNGs to prove the same thing twice.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  APPEARANCE_DEFAULTS, EVIDENCE, checkStatusCellTextEvidence, columnRuns, differencesIn, samePixel,
} from '../../scripts/design-parity-statuscell-text.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const record = JSON.parse(readFileSync(resolve(root, EVIDENCE), 'utf8'));

/** A tiny synthetic frame, so the pixel arithmetic is tested on values a reader can count. */
const frame = (width, height, fill) => ({
  width, height, pixels: new Uint8Array(width * height * 4).fill(fill),
});

test('samePixel compares all four channels', () => {
  const a = frame(2, 1, 10);
  const b = frame(2, 1, 10);
  assert.equal(samePixel(a, b, 0), true);
  b.pixels[3] = 9;
  assert.equal(samePixel(a, b, 0), false, 'a difference in alpha alone must not read as identical');
});

test('differencesIn counts only inside its rectangle, and reports the columns and rows it found', () => {
  const a = frame(4, 3, 0);
  const b = frame(4, 3, 0);
  b.pixels[((0 * 4) + 0) * 4] = 255;        // (0,0) outside the rectangle below
  b.pixels[((1 * 4) + 2) * 4 + 1] = 255;    // (2,1) inside
  b.pixels[((2 * 4) + 3) * 4 + 2] = 255;    // (3,2) inside
  const found = differencesIn(a, b, { x: 1, y: 1, width: 3, height: 2 });
  assert.equal(found.count, 2);
  assert.deepEqual(found.columns, [2, 3]);
  assert.deepEqual(found.rows, [1, 2]);
});

test('differencesIn refuses frames of different sizes rather than comparing the overlap', () => {
  assert.throws(() => differencesIn(frame(2, 2, 0), frame(3, 2, 0), { x: 0, y: 0, width: 2, height: 2 }),
    /frame sizes differ/);
});

test('columnRuns collapses contiguous columns and splits on any gap', () => {
  assert.deepEqual(columnRuns([]), []);
  assert.deepEqual(columnRuns([5]), [{ from: 5, to: 5 }]);
  assert.deepEqual(columnRuns([1, 2, 3, 7, 8, 20]), [{ from: 1, to: 3 }, { from: 7, to: 8 }, { from: 20, to: 20 }]);
});

test('the finding names the three column runs, one per piece of text in the picker', () => {
  assert.equal(record.columnRuns.length, 3);
  const named = Object.keys(record.whatEachColumnRunIs);
  assert.deepEqual(named, record.columnRuns.map((run) => `${run.from}-${run.to}`),
    'every column run must say which piece of text it lands on');
});

test('the appearance defaults applied are the four App.tsx writes, and the weight among them is 500', () => {
  assert.deepEqual(APPEARANCE_DEFAULTS.map((d) => d.property), ['color', 'font-family', 'font-weight', 'font-size']);
  const weight = APPEARANCE_DEFAULTS.find((d) => d.property === 'font-weight');
  assert.equal(weight.value, '500');
  assert.match(weight.sourceOf, /ap_weight/, 'the default must name the control it comes from');
});

test("the recorded source anchors are still present in App.tsx, so the cause has not moved", () => {
  const appTsx = readFileSync(resolve(root, 'console/app/renderer/src/App.tsx'), 'utf8').replaceAll('\r\n', '\n');
  assert.ok(record.sourceAnchors.length > 0, 'a staleness anchor set that is empty would pass vacuously');
  for (const anchor of record.sourceAnchors) {
    assert.ok(appTsx.includes(anchor), `App.tsx no longer contains ${JSON.stringify(anchor)}`);
  }
});

test('the measured shift is exactly 0.359375px left for everything inside the picker, and zero for the credits pill', () => {
  const { asDesigned, withAppearanceDefaults } = record.measurements;
  const shift = (key) => withAppearanceDefaults[key].x - asDesigned[key].x;
  for (const key of ['picker', 'activeButton', 'checkGlyph', 'beginnerLabel', 'expertLabel']) {
    assert.equal(shift(key), -0.359375, `${key} should move left by exactly 0.359375px`);
  }
  assert.equal(shift('creditsPill'), 0, 'the credits pill sits outside the picker and must not move');
  assert.equal(withAppearanceDefaults.picker.right, asDesigned.picker.right,
    "the picker's right edge is pinned by the group being packed against the right of the strip");
  assert.equal(
    withAppearanceDefaults.expertLabel.width - asDesigned.expertLabel.width, 0.359375,
    'the whole shift is the Expert label growing by one weight step',
  );
});

test('every rectangle still rounds to the same painted pixel, which is why the boxes look identical', () => {
  const { asDesigned, withAppearanceDefaults } = record.measurements;
  for (const key of ['picker', 'activeButton', 'inactiveButton']) {
    assert.equal(Math.round(withAppearanceDefaults[key].x), Math.round(asDesigned[key].x),
      `${key}'s painted left edge must snap to the same device pixel on both`);
    assert.equal(Math.round(withAppearanceDefaults[key].right), Math.round(asDesigned[key].right),
      `${key}'s painted right edge must snap to the same device pixel on both`);
  }
});

test('the inactive button is the only one whose computed weight changes', () => {
  const { asDesigned, withAppearanceDefaults } = record.measurements;
  assert.equal(asDesigned.computedWeight.inactive, '400');
  assert.equal(withAppearanceDefaults.computedWeight.inactive, '500');
  assert.equal(asDesigned.computedWeight.active, '500', 'the active button declares its own weight');
  assert.equal(withAppearanceDefaults.computedWeight.active, '500', 'and is therefore unaffected');
});

test('the reproduction reached no network', () => {
  assert.equal(record.interceptedRequests.blocked, 0);
  assert.deepEqual(record.blockedUrls, []);
  assert.ok(record.interceptedRequests['font-stylesheet'] > 0,
    'the design asks for its font stylesheet, so a run that intercepted none did not render it');
});

/**
 * The check makes three comparisons and they overlap: a frame swapped for the wrong one
 * usually trips two of them. That redundancy is worth having and it hides a removal, which was
 * measured rather than assumed: deleting the built-capture comparison on its own left both
 * the suite and the negative regression green, because the reference comparison caught the
 * same planted lie. So this pins that one message by name.
 */
test('a themed frame that is not the built capture is refused by name', () => {
  const referenceBytes = readFileSync(resolve(root, 'console/release/captures/parity/dash-reference.png'));
  const themed = resolve(root, 'console/release/captures/parity/statuscell-text/dash-design-with-appearance-defaults.png');
  const { problems } = checkStatusCellTextEvidence({
    root,
    ids: ['dash'],
    read: (path, encoding) => (path === themed ? referenceBytes : readFileSync(path, encoding)),
  });
  assert.ok(
    problems.some((problem) => problem.includes('differing from the committed built capture in statusCell')),
    `the built-capture comparison must report it by name; got ${JSON.stringify(problems)}`,
  );
});

test('the committed frames prove the finding without a browser', () => {
  const { problems, measured, destinations } = checkStatusCellTextEvidence({ root, ids: ['dash', 'about'] });
  assert.deepEqual(problems, []);
  assert.equal(measured.plainVsReference, 0,
    'the design as it stands must reproduce the committed reference capture exactly');
  assert.equal(measured.themedVsBuilt, 0,
    "the design with the appearance system's defaults must reproduce the committed built capture exactly");
  assert.equal(measured.themedVsReference, record.differingPixelsPerDestination);
  assert.equal(destinations.length, 2);
  for (const entry of destinations) {
    assert.equal(entry.differingPixels, record.differingPixelsPerDestination);
  }
});
