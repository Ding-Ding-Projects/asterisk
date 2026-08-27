/**
 * Bounded overlays.
 *
 * Three groups of tests carry the weight. Containment, because an overlay that pushes
 * the page into scroll or hangs off an edge is the failure a placement calculator exists
 * to prevent, and it has to hold for anchors the algorithm did not anticipate (outside
 * the viewport, covering it entirely) and not only the tidy centred case. Scrolling,
 * because a size cap that quietly crops instead of reporting the crop is exactly the
 * calendar-loses-its-last-week failure named in the design. And the surface check,
 * because "declared but paints nothing" (a transparent background, a zero elevation) is
 * the specific trap that makes an overlay look fine in the source and broken on screen.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OVERLAY_GAP_PX, OVERLAY_SIDES, OVERLAY_SURFACE_FIELDS,
  checkOverlaySurface, computeOverlayPlacement, overlayClearsAnchor, rectsOverlap,
  type OverlaySide, type OverlaySurface, type Rect,
} from '../../app/renderer/src/bounded-overlays.ts';

const VIEWPORT: Rect = { x: 0, y: 0, width: 800, height: 600 };

function assertContained(rect: Rect, viewport: Rect, msg: string): void {
  assert.ok(rect.x >= viewport.x, `${msg}: x ${rect.x} left of viewport`);
  assert.ok(rect.y >= viewport.y, `${msg}: y ${rect.y} above viewport`);
  assert.ok(rect.x + rect.width <= viewport.x + viewport.width, `${msg}: right edge past viewport`);
  assert.ok(rect.y + rect.height <= viewport.y + viewport.height, `${msg}: bottom edge past viewport`);
}

/* --- placement: the ordinary case ----------------------------------------------- */

test('with room on every side, the overlay opens on the preferred side at full size', () => {
  const anchor: Rect = { x: 100, y: 100, width: 120, height: 40 };
  const desired = { width: 240, height: 300 };
  const placement = computeOverlayPlacement(anchor, desired, VIEWPORT);
  assert.equal(placement.side, 'bottom');
  assert.equal(placement.width, 240);
  assert.equal(placement.height, 300);
  assert.equal(placement.x, 100);
  assert.equal(placement.y, anchor.y + anchor.height + OVERLAY_GAP_PX);
  assert.equal(placement.fits, true);
  assert.equal(placement.scrollsInternally, false);
  assert.equal(placement.coversAnchor, false);
});

test('omitting the preferred side behaves exactly like passing "bottom" explicitly', () => {
  /* An inert stub could ignore the fourth parameter's default entirely and still pass
   * every other test; this is the one that would catch it. */
  const anchor: Rect = { x: 60, y: 60, width: 80, height: 30 };
  const desired = { width: 150, height: 120 };
  assert.deepEqual(
    computeOverlayPlacement(anchor, desired, VIEWPORT),
    computeOverlayPlacement(anchor, desired, VIEWPORT, 'bottom'),
  );
});

/* --- placement: collision with every edge --------------------------------------- */

const FLIP_CASES: ReadonlyArray<{ preferred: OverlaySide; opposite: OverlaySide; anchor: Rect }> = [
  { preferred: 'bottom', opposite: 'top', anchor: { x: 300, y: 580, width: 100, height: 15 } },
  { preferred: 'top', opposite: 'bottom', anchor: { x: 300, y: 2, width: 100, height: 15 } },
  { preferred: 'left', opposite: 'right', anchor: { x: 2, y: 300, width: 15, height: 100 } },
  { preferred: 'right', opposite: 'left', anchor: { x: 783, y: 300, width: 15, height: 100 } },
];

test('an overlay flips to the opposite side when its preferred side is pinned against that edge', () => {
  /* Looped over all four sides rather than shown once for 'bottom', so a side added
   * later to OVERLAY_SIDES cannot ship without this behaviour being exercised for it. */
  assert.equal(FLIP_CASES.length, OVERLAY_SIDES.length, 'a side is missing its flip case');
  for (const { preferred, opposite, anchor } of FLIP_CASES) {
    const desired = { width: 200, height: 150 };
    const placement = computeOverlayPlacement(anchor, desired, VIEWPORT, preferred);
    assert.equal(placement.side, opposite, `${preferred} anchor should have flipped to ${opposite}`);
    assert.equal(placement.width, desired.width, `${preferred}: flip still had room, should not have been resized`);
    assert.equal(placement.height, desired.height, `${preferred}: flip still had room, should not have been resized`);
    assert.equal(placement.fits, true);
    assert.equal(placement.scrollsInternally, false);
  }
});

test('every preferred side is honoured verbatim, and never covers the anchor, when there is genuine room', () => {
  const anchor: Rect = { x: 350, y: 250, width: 100, height: 40 };
  const desired = { width: 150, height: 120 };
  for (const side of OVERLAY_SIDES) {
    const placement = computeOverlayPlacement(anchor, desired, VIEWPORT, side);
    assert.equal(placement.side, side, `${side} had ample room and should not have been forced to flip`);
    assert.equal(placement.coversAnchor, false, `${side}: overlay overlapped the control that opened it`);
    assertContained(placement, VIEWPORT, side);
  }
});

/* --- placement: never crop, always scroll ---------------------------------------- */

test('when the primary axis cannot hold the full request, the overlay scrolls rather than being silently cropped', () => {
  /* The calendar-loses-its-last-week failure: capping the height and hiding the
   * overflow deletes content with no scrollbar to say anything is missing. */
  const tight: Rect = { x: 0, y: 0, width: 250, height: 200 };
  const anchor: Rect = { x: 80, y: 90, width: 90, height: 20 };
  const desired = { width: 300, height: 300 };
  const placement = computeOverlayPlacement(anchor, desired, tight);
  assert.ok(placement.height < desired.height, 'height was not constrained at all -- an inert implementation would do this');
  assert.equal(placement.scrollsInternally, true);
  assert.equal(placement.fits, true, 'there was some room, just not enough -- this is not the "cannot fit at all" case');
  assertContained(placement, tight, 'tight viewport');
});

test('the cross-axis dimension is bounded too, not only the axis the overlay opened along', () => {
  const narrow: Rect = { x: 0, y: 0, width: 300, height: 600 };
  const anchor: Rect = { x: 100, y: 100, width: 120, height: 40 };
  const desired = { width: 5000, height: 150 };
  const placement = computeOverlayPlacement(anchor, desired, narrow, 'bottom');
  assert.equal(placement.side, 'bottom');
  assert.equal(placement.height, 150, 'the axis with room should not have been resized');
  assert.equal(placement.width, narrow.width, 'the cross axis should have been capped to the viewport');
  assert.ok(placement.width < desired.width);
  assert.equal(placement.scrollsInternally, true);
  assertContained(placement, narrow, 'narrow viewport');
});

/* --- placement: containment holds even for anchors the algorithm did not expect --- */

const EXTREME_ANCHORS: ReadonlyArray<[string, Rect]> = [
  ['centred', { x: 150, y: 100, width: 50, height: 50 }],
  ['far outside, above and left of the viewport', { x: -5000, y: -5000, width: 10, height: 10 }],
  ['far outside, below and right of the viewport', { x: 5000, y: 5000, width: 10, height: 10 }],
  ['larger than the viewport and covering all of it', { x: -100, y: -100, width: 1000, height: 1000 }],
];

test('the overlay stays fully inside the viewport for every extreme anchor and every side', () => {
  /* The strongest anti-inert check here: a passthrough implementation that just returns
   * the desired size positioned relative to the anchor, with no clamping at all, fails
   * this immediately for any of the out-of-bounds anchors. */
  const small: Rect = { x: 0, y: 0, width: 400, height: 300 };
  const desired = { width: 1000, height: 1000 };
  for (const [label, anchor] of EXTREME_ANCHORS) {
    for (const side of OVERLAY_SIDES) {
      const placement = computeOverlayPlacement(anchor, desired, small, side);
      assertContained(placement, small, `${label} (preferred ${side})`);
      assert.ok(placement.width <= desired.width, `${label}: width exceeded what was asked for`);
      assert.ok(placement.height <= desired.height, `${label}: height exceeded what was asked for`);
      assert.ok(OVERLAY_SIDES.includes(placement.side), `${label}: returned an invalid side`);
    }
  }
});

test('an overlay that cannot fit anywhere is reported as such, not silently clipped and called successful', () => {
  const small: Rect = { x: 0, y: 0, width: 400, height: 300 };
  const engulfing: Rect = { x: -100, y: -100, width: 1000, height: 1000 };
  const placement = computeOverlayPlacement(engulfing, { width: 1000, height: 1000 }, small);
  assert.equal(placement.fits, false);
  assert.equal(placement.height, 0, 'there was genuinely zero space, not merely "not enough"');
  assertContained(placement, small, 'engulfing anchor');
});

/* --- rectsOverlap: the primitive coversAnchor is built on ----------------------- */

test('rectangles that only touch at an edge do not count as overlapping', () => {
  assert.equal(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 }), false);
  assert.equal(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 10, width: 10, height: 10 }), false);
});

test('rectangles that genuinely intersect, or one fully inside the other, are reported as overlapping', () => {
  assert.equal(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 }), true);
  assert.equal(rectsOverlap({ x: 0, y: 0, width: 20, height: 20 }, { x: 5, y: 5, width: 5, height: 5 }), true);
});

/* --- surface: refuses an undecorated overlay ------------------------------------- */

function validSurface(): OverlaySurface {
  return { background: '#1c1b1f', border: '1px solid #79747e', elevation: 3, shape: '12px' };
}

test('an overlay declaring none of its surface properties is refused, and every missing one is named', () => {
  const check = checkOverlaySurface({});
  assert.equal(check.decorated, false);
  assert.deepEqual([...check.missing].sort(), [...OVERLAY_SURFACE_FIELDS].sort());
});

test('a fully declared surface is accepted, with nothing reported missing', () => {
  const check = checkOverlaySurface(validSurface());
  assert.equal(check.decorated, true);
  assert.deepEqual(check.missing, []);
});

test('each surface property is checked independently, so a newly added property cannot ship unchecked', () => {
  /* Looped over the field list itself, not written out four times, so a fifth surface
   * property added later automatically gets this coverage rather than being forgotten. */
  for (const field of OVERLAY_SURFACE_FIELDS) {
    const surface: OverlaySurface = validSurface();
    delete surface[field];
    const check = checkOverlaySurface(surface);
    assert.deepEqual(check.missing, [field], `omitting ${field} alone should report exactly that`);
    assert.equal(check.decorated, false);
  }
});

test('a background or border that is declared but paints nothing is treated the same as never declaring it', () => {
  /* The exact failure this whole module exists for: CSS with a value that renders
   * nothing lets whatever sits behind the overlay read straight through. */
  const unpainted = ['', ' ', 'none', 'None', 'transparent', 'inherit', 'unset'];
  for (const field of ['background', 'border'] as const) {
    for (const value of unpainted) {
      const surface: OverlaySurface = { ...validSurface(), [field]: value };
      assert.ok(checkOverlaySurface(surface).missing.includes(field), `"${value}" ${field} should count as undeclared`);
    }
  }
});

test('an elevation that is zero or lower does not separate the overlay from what sits behind it', () => {
  for (const elevation of [0, -1, Number.NaN]) {
    const surface: OverlaySurface = { ...validSurface(), elevation };
    assert.ok(checkOverlaySurface(surface).missing.includes('elevation'), `elevation ${elevation} should count as undeclared`);
  }
});

test('a shape of "0" is a real declared choice of sharp corners, distinct from declaring none at all', () => {
  const sharp = checkOverlaySurface({ ...validSurface(), shape: '0' });
  assert.ok(!sharp.missing.includes('shape'), '"0" is a deliberate radius, not an absent one');
  const none = checkOverlaySurface({ ...validSurface(), shape: 'none' });
  assert.ok(none.missing.includes('shape'), '"none" is the absent case and should still be caught');
});

/* --- surface: sits above the control it opened from ------------------------------ */

test('an overlay clears the anchor only when its own declared elevation is strictly higher', () => {
  const cases: ReadonlyArray<[number, number, boolean]> = [
    [3, 1, true],
    [1, 3, false],
    [2, 2, false],
    [1, 0, true],
  ];
  for (const [overlayElevation, anchorElevation, expected] of cases) {
    const result = overlayClearsAnchor({ elevation: overlayElevation }, anchorElevation);
    assert.equal(result, expected, `overlay ${overlayElevation} vs anchor ${anchorElevation}`);
  }
});

test('an overlay with no declared elevation never clears the anchor, whatever the anchor is at', () => {
  for (const anchorElevation of [0, -5, 100]) {
    assert.equal(overlayClearsAnchor({}, anchorElevation), false);
  }
});
