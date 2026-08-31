import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PngIsolatedLogoDecoder } from '../../control-plane/logo-decoder.js';
import { LogoStore } from '../../control-plane/logo-store.js';
import { createLogoConversionHandlers } from '../../control-plane/logo-converter.js';
import { createControlPlaneDispatcher } from '../../control-plane/dispatch.js';
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

test('logo cache read returns independently validated bytes for renderer rehydration', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asterisk-logo-cache-'));
  try {
    const store = new LogoStore({ rootPath: root });
    const handlers = createLogoConversionHandlers(new PngIsolatedLogoDecoder(), {
      read: async () => store.read(),
      write: async request => await store.write(request),
      clear: async request => await store.clear(request),
    });
    const converted = await handlers.convert({ source: { kind: 'local', bytes: ONE_PIXEL_PNG }, targets: [{ format: 'png', width: 2, height: 2, alpha: true }] });
    assert.equal(converted.ok, true);
    if (!converted.ok) return;
    await store.write({ kind: 'write', result: converted });
    const cached = await store.readForRenderer();
    assert.ok(cached);
    assert.equal(cached?.assets.length, 1);
    assert.equal(cached?.assets[0]?.bytesBase64, Buffer.from(converted.outputs[0]!.bytes).toString('base64'));
    assert.equal(cached?.assets[0]?.receipt.sha256, converted.outputs[0]?.receipt.sha256);
  } finally {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try { await rm(root, { recursive: true, force: true }); break; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOTEMPTY' || attempt === 7) throw error; await new Promise(resolve => setTimeout(resolve, 25)); }
    }
  }
});

test('dispatcher logo cache response carries validated bytesBase64 in the renderer shape', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asterisk-logo-dispatch-'));
  try {
    const store = new LogoStore({ rootPath: join(root, 'logo-cache') });
    const handlers = createLogoConversionHandlers(new PngIsolatedLogoDecoder(), { read: async () => store.read(), write: async request => await store.write(request), clear: async request => await store.clear(request) });
    const converted = await handlers.convert({ source: { kind: 'local', bytes: ONE_PIXEL_PNG }, targets: [{ format: 'png', width: 2, height: 2, alpha: true }] });
    assert.equal(converted.ok, true);
    if (!converted.ok) return;
    await store.write({ kind: 'write', result: converted });
    const dispatcher = createControlPlaneDispatcher({ userDataPath: root, resourcesPath: root, hosted: true });
    const response = await dispatcher.controlPlaneRequest({ requestId: 'logo-dispatch', action: 'logo.cache.read' });
    assert.equal(response.ok, true);
    if (response.ok) {
      const data = response.data as { assets?: readonly [{ bytesBase64?: string; receipt?: { sha256?: string } }] } | undefined;
      assert.equal(typeof data?.assets?.[0]?.bytesBase64, 'string');
      assert.equal(data?.assets?.[0]?.receipt?.sha256?.length, 64);
    }
  } finally {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try { await rm(root, { recursive: true, force: true }); break; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOTEMPTY' || attempt === 7) throw error; await new Promise(resolve => setTimeout(resolve, 25)); }
    }
  }
});
