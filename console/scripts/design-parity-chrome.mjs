#!/usr/bin/env node
/**
 * The chrome-parity bar: the reference-versus-built comparison a destination in THIS
 * project can actually meet.
 *
 * `compareCaptures` (design-parity-diff.mjs) asks whether two captures are pixel-identical
 * across the whole frame. That question is unanswerable here by deliberate product
 * decision, not by any defect: this application removed the design's sample rows, tiles,
 * health bars and badges and shows the target's real — usually empty — readings in the same
 * place. So the design shows invented content exactly where the application shows a
 * reading, and 47%-64% of every frame differs for a reason nobody wants fixed.
 *
 * This module asks the narrower question instead: **outside the regions that carry data,
 * do the two artifacts render identically?** That is a bar a correct implementation can
 * meet, because both sides are Chromium at the same device metrics reading the same local
 * font files — and the existing captures prove it, containing runs of rows that are
 * byte-for-byte equal. Identical content really does produce identical pixels here, so the
 * per-pixel tolerance is zero rather than a number chosen until something passed.
 *
 * Three properties keep the bar from being a way to pass by widening a mask:
 *
 *   - **The mask is declared, not discovered.** Exclusion rectangles come from a region
 *     ledger recorded off both live DOMs (design-parity-regions.mjs) against area roles
 *     declared once, application-wide, in design-parity.json. Nothing here reads the pixel
 *     diff to decide what to exclude, which is the one construction that would make the
 *     verdict circular and worthless.
 *   - **A mask that swallows the frame is refused.** The compared region must keep at least
 *     MINIMUM_COMPARED_FRACTION of the frame or the comparison is refused outright.
 *   - **What the mask hid is measured and reported anyway.** `excludedDiffPercentage` says
 *     how much of the masked region actually differed. A mask covering a region that was
 *     identical all along shows up as a suspiciously low number rather than as nothing.
 *
 * The palette and staleness refusals from `compareCaptures` are kept verbatim in spirit:
 * an unpainted capture and a capture older than its own build output are refused rather
 * than compared, because both are evidence about a UI that was never on screen.
 */
import { decodePNG } from './png-codec.mjs';

/**
 * The compared region may never fall below this fraction of the frame.
 *
 * Not a tuning knob: this project's own declared data regions (the content pane and the
 * top strip's status cell) leave a little under 30% of a 1440x1000 frame, so 25% is below
 * what an honest mask costs and far above what a mask widened to force a pass would leave.
 * A change to this number is a change to the bar and belongs in the same review as one.
 */
export const MINIMUM_COMPARED_FRACTION = 0.25;

/** Same limit and reasoning as design-parity-diff.mjs: this palette has no true-black surface. */
export const PALETTE_BLACK_FRACTION_LIMIT = 0.02;
const NEAR_BLACK_THRESHOLD = 4;

function decodeIfBuffer(image) {
  if (Buffer.isBuffer(image)) return decodePNG(image);
  if (image && typeof image === 'object' && 'pixels' in image) return image;
  throw new Error('design-parity-chrome: capture must be a PNG Buffer or a decoded {width,height,pixels} image');
}

function blackFractionOf(image) {
  const total = image.width * image.height;
  if (total === 0) return 0;
  let black = 0;
  for (let i = 0; i < total; i += 1) {
    const o = i * 4;
    if (image.pixels[o] <= NEAR_BLACK_THRESHOLD && image.pixels[o + 1] <= NEAR_BLACK_THRESHOLD && image.pixels[o + 2] <= NEAR_BLACK_THRESHOLD) black += 1;
  }
  return black / total;
}

/**
 * The smallest rectangle containing both — how one area's rect from each side becomes the
 * single rectangle excluded from both.
 *
 * A union rather than an intersection, and the difference is not cosmetic: the two sides
 * genuinely disagree about some of these heights (the design export's shell is 866px tall
 * inside a 1000px viewport where the application fills it), so an intersection would leave
 * a strip of one side's data sitting inside the compared region and report it as a chrome
 * defect. Taking the union can only ever hide MORE, which is exactly why the minimum
 * compared fraction and the excluded-region measurement below both exist.
 */
export function unionRect(a, b) {
  for (const [name, rect] of [['a', a], ['b', b]]) {
    if (!rect || ['x', 'y', 'width', 'height'].some((k) => !Number.isInteger(rect[k]))) {
      throw new Error(`unionRect: ${name} must be a rectangle of four integers, got ${JSON.stringify(rect)}`);
    }
    if (rect.width < 0 || rect.height < 0) throw new Error(`unionRect: ${name} has a negative dimension: ${JSON.stringify(rect)}`);
  }
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
}

/**
 * Turns exclusion rectangles into a per-pixel mask, clipped to the frame.
 *
 * Clipping rather than throwing on an out-of-frame rectangle is deliberate: a recorded rect
 * may legitimately extend past the viewport when a side's shell overflows it, and refusing
 * the whole comparison for that would refuse a real measurement over a detail that costs
 * nothing. A rectangle entirely outside the frame contributes nothing and is reported in
 * `clippedAway` so it cannot pass unnoticed as an exclusion that did something.
 */
export function buildExclusionMask({ width, height, exclusions }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`buildExclusionMask: width and height must be positive integers, got ${width}x${height}`);
  }
  if (!Array.isArray(exclusions)) throw new Error('buildExclusionMask: exclusions must be an array');
  const mask = new Uint8Array(width * height);
  const clippedAway = [];
  for (const rect of exclusions) {
    if (!rect || ['x', 'y', 'width', 'height'].some((k) => !Number.isInteger(rect[k]))) {
      throw new Error(`buildExclusionMask: every exclusion must be a rectangle of four integers, got ${JSON.stringify(rect)}`);
    }
    const x0 = Math.max(0, rect.x);
    const y0 = Math.max(0, rect.y);
    const x1 = Math.min(width, rect.x + rect.width);
    const y1 = Math.min(height, rect.y + rect.height);
    if (x1 <= x0 || y1 <= y0) { clippedAway.push(rect); continue; }
    for (let y = y0; y < y1; y += 1) {
      const row = y * width;
      for (let x = x0; x < x1; x += 1) mask[row + x] = 1;
    }
  }
  let excluded = 0;
  for (let i = 0; i < mask.length; i += 1) excluded += mask[i];
  return { mask, excludedPixels: excluded, comparedPixels: width * height - excluded, clippedAway };
}

const pixelsDiffer = (reference, built, offset) => reference.pixels[offset] !== built.pixels[offset]
  || reference.pixels[offset + 1] !== built.pixels[offset + 1]
  || reference.pixels[offset + 2] !== built.pixels[offset + 2]
  || reference.pixels[offset + 3] !== built.pixels[offset + 3];

/**
 * Measures one named sub-area of the compared region, so a failing destination says WHERE
 * it failed rather than only by how much.
 *
 * A single "8.4% of chrome differs" is a number nobody can act on; "the brand cell differs
 * and the rail does not" names a defect. The areas come from the same recorded region
 * ledger as the exclusions, so this adds no hand-drawn geometry of its own.
 */
function measureArea(reference, built, mask, rect) {
  const { width, height } = reference;
  const x0 = Math.max(0, rect.x);
  const y0 = Math.max(0, rect.y);
  const x1 = Math.min(width, rect.x + rect.width);
  const y1 = Math.min(height, rect.y + rect.height);
  let compared = 0;
  let differing = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const index = y * width + x;
      if (mask[index]) continue;
      compared += 1;
      if (pixelsDiffer(reference, built, index * 4)) differing += 1;
    }
  }
  return { comparedPixels: compared, diffPixelCount: differing, diffPercentage: compared === 0 ? null : (differing / compared) * 100 };
}

/**
 * Compares two captures over everything the region ledger did not declare as data-bearing.
 *
 * @param {object} options
 * @param {Buffer|object} options.reference          reference-side capture
 * @param {Buffer|object} options.built              built-side capture
 * @param {string} options.destinationId
 * @param {Array<{x,y,width,height}>} options.exclusions  data-bearing rectangles, already unioned across both sides
 * @param {Record<string,{x,y,width,height}>} [options.areas]  named chrome sub-areas to break the result down by
 * @param {number} [options.builtCaptureMtimeMs]
 * @param {number[]} [options.builtSourceMtimesMs]
 * @param {number} [options.minimumComparedFraction]
 */
export function compareChrome({
  reference, built, destinationId, exclusions, areas = {},
  builtCaptureMtimeMs, builtSourceMtimesMs,
  minimumComparedFraction = MINIMUM_COMPARED_FRACTION,
}) {
  if (!destinationId) throw new Error('compareChrome: destinationId is required');
  if (!Array.isArray(exclusions)) throw new Error('compareChrome: exclusions is required and must be an array — an absent region ledger is a refusal, never an empty mask');
  const referenceImage = decodeIfBuffer(reference);
  const builtImage = decodeIfBuffer(built);
  const reasons = [];

  const stalenessCheck = builtCaptureMtimeMs != null && Array.isArray(builtSourceMtimesMs) && builtSourceMtimesMs.length > 0
    ? { checked: true, stale: builtCaptureMtimeMs < Math.max(...builtSourceMtimesMs), builtCaptureMtimeMs, newestBuildSourceMtimeMs: Math.max(...builtSourceMtimesMs) }
    : { checked: false, stale: false };
  if (stalenessCheck.stale) {
    reasons.push(`${destinationId}: built capture (mtime ${stalenessCheck.builtCaptureMtimeMs}) is stale — older than its own build output (newest source mtime ${stalenessCheck.newestBuildSourceMtimeMs}); rebuild before capturing`);
  }

  const blackFraction = blackFractionOf(builtImage);
  const paletteCheck = { blackFraction, thresholdExceeded: blackFraction > PALETTE_BLACK_FRACTION_LIMIT };
  if (paletteCheck.thresholdExceeded) {
    reasons.push(`${destinationId}: built capture is ${(blackFraction * 100).toFixed(1)}% near-black pixels (limit ${(PALETTE_BLACK_FRACTION_LIMIT * 100).toFixed(0)}%) — this palette has no true-black surface, so this reads as unpainted rather than a real dark render`);
  }

  const dimensions = {
    reference: { width: referenceImage.width, height: referenceImage.height },
    built: { width: builtImage.width, height: builtImage.height },
  };
  if (referenceImage.width !== builtImage.width || referenceImage.height !== builtImage.height) {
    reasons.push(`${destinationId}: dimension mismatch — reference ${referenceImage.width}x${referenceImage.height} vs built ${builtImage.width}x${builtImage.height}`);
    return {
      destinationId, bar: 'chrome-parity', verdict: 'refused', reasons, dimensions,
      comparedPixels: null, comparedFraction: null, diffPixelCount: null, diffPercentage: null,
      boundingBox: null, excluded: null, areas: {}, paletteCheck, stalenessCheck,
      minimumComparedFraction,
    };
  }

  const { width, height } = referenceImage;
  const totalPixels = width * height;
  const { mask, excludedPixels, comparedPixels, clippedAway } = buildExclusionMask({ width, height, exclusions });
  const comparedFraction = totalPixels === 0 ? 0 : comparedPixels / totalPixels;
  if (comparedFraction < minimumComparedFraction) {
    reasons.push(`${destinationId}: the declared data regions leave only ${(comparedFraction * 100).toFixed(1)}% of the frame to compare (minimum ${(minimumComparedFraction * 100).toFixed(0)}%) — a mask this wide would pass by hiding the artifact rather than by matching it`);
  }

  let diffPixelCount = 0;
  let excludedDiffPixelCount = 0;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const differs = pixelsDiffer(referenceImage, builtImage, index * 4);
      if (!differs) continue;
      if (mask[index]) { excludedDiffPixelCount += 1; continue; }
      diffPixelCount += 1;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }

  const measuredAreas = {};
  for (const [name, rect] of Object.entries(areas)) measuredAreas[name] = measureArea(referenceImage, builtImage, mask, rect);

  let verdict;
  if (reasons.length > 0) verdict = 'refused';
  else if (diffPixelCount > 0) verdict = 'diff';
  else verdict = 'match';

  return {
    destinationId,
    bar: 'chrome-parity',
    verdict,
    reasons,
    dimensions,
    totalPixels,
    comparedPixels,
    comparedFraction,
    minimumComparedFraction,
    diffPixelCount,
    diffPercentage: comparedPixels === 0 ? null : (diffPixelCount / comparedPixels) * 100,
    boundingBox: diffPixelCount === 0 ? null : { x0, y0, x1, y1 },
    excluded: {
      rectangles: exclusions,
      pixels: excludedPixels,
      clippedAway,
      // What the mask hid. A near-zero figure here means a declared data region carried no
      // data on this screen, which is worth seeing rather than silently benefiting from.
      diffPixelCount: excludedDiffPixelCount,
      diffPercentage: excludedPixels === 0 ? null : (excludedDiffPixelCount / excludedPixels) * 100,
    },
    areas: measuredAreas,
    paletteCheck,
    stalenessCheck,
  };
}
