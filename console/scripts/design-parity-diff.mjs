#!/usr/bin/env node
/**
 * Compares a reference capture against a built capture for one design-parity destination
 * and produces the two artifacts a `verified` row is required to name: a labelled
 * side-by-side comparison image and machine-readable visual-diff evidence.
 *
 * This never decides a row is `verified` — that stays a human/inventory decision, guarded
 * separately by design-parity-evidence-on-disk.mjs. What this module decides is narrower
 * and mechanical: whether the two captures are pixel-identical, and whether either capture
 * is even trustworthy enough to compare in the first place. Two traps recorded from this
 * project's own working notes are checked explicitly rather than left to a bare pixel diff:
 *
 *   - "Pure black is diagnostic." A capture that is mostly (0,0,0) usually means nothing
 *     painted into the surface, not a dark theme — this palette has no true-black surface
 *     colour. A same-dimension all-black built capture would otherwise report a boring,
 *     misleading "100% different" diff; instead it is refused outright as unpainted.
 *   - "A stale renderer photographs the previous build." When the caller supplies the
 *     built capture's mtime and the mtimes of the build output it was taken from, a
 *     capture older than its own sources is refused rather than compared, because it is
 *     evidence about a UI that no longer exists.
 */
import { decodePNG, encodePNG } from './png-codec.mjs';

/** Above this fraction of near-black built pixels, treat the capture as unpainted rather
 *  than as a real (possibly dark-themed) render. 2% comfortably covers legitimate dark
 *  chrome — title bars, icons, shadow edges — while catching a capture that is blank. */
export const PALETTE_BLACK_FRACTION_LIMIT = 0.02;
const NEAR_BLACK_THRESHOLD = 4; // per-channel; (0,0,0)-(4,4,4) counts as "near black"
const DIVIDER_WIDTH = 6;
const DIVIDER_COLOR = [214, 214, 214, 255];

function decodeIfBuffer(image) {
  if (Buffer.isBuffer(image)) return decodePNG(image);
  if (image && typeof image === 'object' && 'pixels' in image) return image;
  throw new Error('design-parity-diff: capture must be a PNG Buffer or a decoded {width,height,pixels} image');
}

function blackFractionOf(image) {
  const total = image.width * image.height;
  let black = 0;
  for (let i = 0; i < total; i += 1) {
    const o = i * 4;
    if (image.pixels[o] <= NEAR_BLACK_THRESHOLD && image.pixels[o + 1] <= NEAR_BLACK_THRESHOLD && image.pixels[o + 2] <= NEAR_BLACK_THRESHOLD) {
      black += 1;
    }
  }
  return total === 0 ? 0 : black / total;
}

function buildSideBySide(reference, built) {
  const height = Math.max(reference.height, built.height);
  const width = reference.width + DIVIDER_WIDTH + built.width;
  const pixels = new Uint8ClampedArray(width * height * 4);
  pixels.fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4;
      if (x < reference.width) {
        if (y < reference.height) {
          const s = (y * reference.width + x) * 4;
          pixels[o] = reference.pixels[s]; pixels[o + 1] = reference.pixels[s + 1];
          pixels[o + 2] = reference.pixels[s + 2]; pixels[o + 3] = reference.pixels[s + 3];
        } else pixels[o + 3] = 255;
      } else if (x < reference.width + DIVIDER_WIDTH) {
        pixels[o] = DIVIDER_COLOR[0]; pixels[o + 1] = DIVIDER_COLOR[1]; pixels[o + 2] = DIVIDER_COLOR[2]; pixels[o + 3] = DIVIDER_COLOR[3];
      } else {
        const bx = x - reference.width - DIVIDER_WIDTH;
        if (y < built.height) {
          const s = (y * built.width + bx) * 4;
          pixels[o] = built.pixels[s]; pixels[o + 1] = built.pixels[s + 1];
          pixels[o + 2] = built.pixels[s + 2]; pixels[o + 3] = built.pixels[s + 3];
        } else pixels[o + 3] = 255;
      }
    }
  }
  return { width, height, pixels };
}

/**
 * @param {object} options
 * @param {Buffer|{width:number,height:number,pixels:Uint8ClampedArray}} options.reference
 * @param {Buffer|{width:number,height:number,pixels:Uint8ClampedArray}} options.built
 * @param {string} options.destinationId
 * @param {number} [options.tolerance] per-pixel summed-channel tolerance before counting a diff (default 0 — exact)
 * @param {number} [options.builtCaptureMtimeMs] mtime of the built capture file, for the staleness check
 * @param {number[]} [options.builtSourceMtimesMs] mtimes of every build-output file the built capture depends on
 * @param {boolean} [options.sideBySide] when true, also renders and returns a PNG buffer
 */
export function compareCaptures({
  reference, built, destinationId, tolerance = 0, builtCaptureMtimeMs, builtSourceMtimesMs, sideBySide = false,
}) {
  if (!destinationId) throw new Error('compareCaptures: destinationId is required');
  const referenceImage = decodeIfBuffer(reference);
  const builtImage = decodeIfBuffer(built);
  const reasons = [];

  const stalenessCheck = builtCaptureMtimeMs != null && Array.isArray(builtSourceMtimesMs) && builtSourceMtimesMs.length > 0
    ? { checked: true, stale: builtCaptureMtimeMs < Math.max(...builtSourceMtimesMs), builtCaptureMtimeMs, newestBuildSourceMtimeMs: Math.max(...builtSourceMtimesMs) }
    : { checked: false, stale: false };
  if (stalenessCheck.stale) {
    reasons.push(`${destinationId}: built capture (mtime ${stalenessCheck.builtCaptureMtimeMs}) is stale — older than its own build output (newest source mtime ${stalenessCheck.newestBuildSourceMtimeMs}); rebuild before capturing`);
  }

  if (referenceImage.width !== builtImage.width || referenceImage.height !== builtImage.height) {
    reasons.push(`${destinationId}: dimension mismatch — reference ${referenceImage.width}x${referenceImage.height} vs built ${builtImage.width}x${builtImage.height}`);
    return {
      destinationId, verdict: 'refused', reasons,
      dimensions: { reference: { width: referenceImage.width, height: referenceImage.height }, built: { width: builtImage.width, height: builtImage.height } },
      diffPixelCount: null, totalPixels: null, diffPercentage: null, boundingBox: null,
      paletteCheck: { blackFraction: blackFractionOf(builtImage), thresholdExceeded: blackFractionOf(builtImage) > PALETTE_BLACK_FRACTION_LIMIT },
      stalenessCheck,
    };
  }

  const { width, height } = referenceImage;
  const totalPixels = width * height;
  let diffPixelCount = 0;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4;
      const delta = Math.abs(referenceImage.pixels[o] - builtImage.pixels[o])
        + Math.abs(referenceImage.pixels[o + 1] - builtImage.pixels[o + 1])
        + Math.abs(referenceImage.pixels[o + 2] - builtImage.pixels[o + 2])
        + Math.abs(referenceImage.pixels[o + 3] - builtImage.pixels[o + 3]);
      if (delta > tolerance) {
        diffPixelCount += 1;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  const diffPercentage = totalPixels === 0 ? 0 : (diffPixelCount / totalPixels) * 100;
  const boundingBox = diffPixelCount === 0 ? null : { x0, y0, x1, y1 };

  const blackFraction = blackFractionOf(builtImage);
  const paletteCheck = { blackFraction, thresholdExceeded: blackFraction > PALETTE_BLACK_FRACTION_LIMIT };
  if (paletteCheck.thresholdExceeded) {
    reasons.push(`${destinationId}: built capture is ${(blackFraction * 100).toFixed(1)}% near-black pixels (limit ${(PALETTE_BLACK_FRACTION_LIMIT * 100).toFixed(0)}%) — this palette has no true-black surface, so this reads as unpainted rather than a real dark render`);
  }

  let verdict;
  if (paletteCheck.thresholdExceeded || stalenessCheck.stale) verdict = 'refused';
  else if (diffPixelCount > 0) verdict = 'diff';
  else verdict = 'match';

  const result = {
    destinationId, verdict, reasons,
    dimensions: { reference: { width, height }, built: { width, height } },
    diffPixelCount, totalPixels, diffPercentage, boundingBox,
    paletteCheck, stalenessCheck,
  };
  if (sideBySide) result.sideBySideBuffer = encodePNG(buildSideBySide(referenceImage, builtImage));
  return result;
}
