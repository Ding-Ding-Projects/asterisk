import assert from 'node:assert/strict';
import test from 'node:test';
import { PngIsolatedLogoDecoder } from '../../control-plane/logo-decoder.js';
import { inspectLogoBytes, DEFAULT_LOGO_CROP } from '../../shared/logo.js';

const ONE_PIXEL_PNG = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));

test('isolated PNG decoder produces a bounded, independently inspectable derivative', async () => {
  const decoder = new PngIsolatedLogoDecoder();
  const result = await decoder.convert({
    source: ONE_PIXEL_PNG,
    sourceFormat: 'png',
    target: { format: 'png', width: 2, height: 2, alpha: true },
    crop: DEFAULT_LOGO_CROP,
  });
  assert.equal(result.roundTripVerified, true);
  assert.equal(result.peakMemoryBytes, 20);
  const inspection = inspectLogoBytes(result.bytes, { declaredExtension: 'png' });
  assert.equal(inspection.ok, true);
  if (inspection.ok) {
    assert.equal(inspection.inspection.format, 'png');
    assert.equal(inspection.inspection.width, 2);
    assert.equal(inspection.inspection.height, 2);
  }
});

test('isolated PNG decoder refuses formats it cannot faithfully convert', async () => {
  const decoder = new PngIsolatedLogoDecoder();
  await assert.rejects(
    decoder.convert({ source: ONE_PIXEL_PNG, sourceFormat: 'png', target: { format: 'webp', width: 1, height: 1, alpha: true }, crop: DEFAULT_LOGO_CROP }),
    /supports PNG derivatives only/u,
  );
});

test('opaque PNG derivative applies a deterministic solid background instead of leaking transparent pixels', async () => {
  const decoder = new PngIsolatedLogoDecoder();
  const result = await decoder.convert({
    source: ONE_PIXEL_PNG,
    sourceFormat: 'png',
    target: { format: 'png', width: 1, height: 1, alpha: false },
    crop: { ...DEFAULT_LOGO_CROP, background: { kind: 'solid', color: '#ffffff' } },
  });
  assert.equal(result.roundTripVerified, true);
  assert.match(result.lossNotes?.[0] ?? '', /Transparency was flattened/u);
  const inspection = inspectLogoBytes(result.bytes, { declaredExtension: 'png' });
  assert.equal(inspection.ok, true);
  if (inspection.ok) assert.equal(inspection.inspection.alpha, false);
});
