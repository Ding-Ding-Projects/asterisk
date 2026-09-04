import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { App } from '../../app/renderer/src/App.tsx';
import { constrainLogoPickerValues } from '../../app/renderer/src/logo-picker-capability.ts';

const appPath = new URL('../../app/renderer/src/App.tsx', import.meta.url);

test('logo upload uses the typed inspect, convert, and cache-write service actions', async () => {
  const source = await readFile(appPath, 'utf8');
  assert.match(source, /this\.request\('logo\.inspect'/u);
  assert.match(source, /this\.request\('logo\.convert'/u);
  assert.match(source, /bytesBase64: App\.bytesToBase64\(fullBytes\)/u);
  assert.match(source, /this\.request\('logo\.cache\.write'/u);
  assert.match(source, /this\.validLogoCacheRecord\(cached\.data\)/u);
  assert.match(source, /this\.setLogoPreview\(file\)/u);
  assert.match(source, /this\.logoBusy/u);
});

test('startup rehydrates only validated cache receipts and refuses a missing image payload', async () => {
  const source = await readFile(appPath, 'utf8');
  assert.match(source, /void this\.restoreLogoCache\(\)/u);
  assert.match(source, /this\.request\('logo\.cache\.read'/u);
  assert.match(source, /roundTripVerified === true/u);
  assert.match(source, /if \(!asset\.bytesBase64\)/u);
  assert.match(source, /the shipped mark is shown/u);
  assert.match(source, /base64ToBytes/u);
});

test('logo reset clears the service cache and reports a clear failure without pretending it worked', async () => {
  const source = await readFile(appPath, 'utf8');
  assert.match(source, /this\.request\('logo\.cache\.clear'/u);
  assert.match(source, /kind: 'reset'/u);
  assert.match(source, /cache could not be cleared/u);
});

test('restart rehydrates a service-provided validated logo payload into title-bar rendering', async () => {
  const cache = {
    schemaVersion: 1,
    packageIdentity: 'ding-pbx-console',
    customLogoActive: true,
    crop: {},
    assets: [{
      filename: 'logo-png.png',
      bytesBase64: 'AA==',
      receipt: {
        target: { format: 'png', width: 20, height: 20, alpha: true },
        bytes: 1,
        sha256: 'a'.repeat(64),
        signature: 'png-signature',
        width: 20,
        height: 20,
        alpha: true,
        decoder: 'isolated',
        roundTripVerified: true,
        lossNotes: [],
      },
    }],
    updatedAt: '2026-08-31T02:00:00.000Z',
  };
  (globalThis as { window?: unknown }).window = {
    dingDesktop: {
      platform: 'win32',
      window: { minimize() {}, toggleMaximize() {}, close() {}, setTitle() {} },
      controlPlane: {
        request: async (request: Record<string, unknown>) => request.action === 'logo.cache.read'
          ? { ok: true, requestId: 'read-1', data: cache }
          : { ok: true, requestId: 'other', data: { values: {} } },
      },
    },
  };
  const app = new App({}) as unknown as Record<string, unknown> & { durableStorage: { storage: { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void } } };
  (app as unknown as { updater: unknown }).updater = { isMounted: () => true, enqueueForceUpdate() {} };
  const restore = app.restoreLogoCache as unknown as () => Promise<void>;
  await restore.call(app);
  const resolve = app.logoForTitleBar as unknown as () => { source: string; label: string };
  const logo = resolve.call(app);
  assert.match(logo.source, /^blob:/u);
  assert.equal(logo.label, 'Custom local app logo');
  assert.equal(logo.source.includes('logo-png.png'), false);
});

test('the rendered logo file input advertises only the decoder-supported PNG format', () => {
  const groups = constrainLogoPickerValues([{ ctls: [{ id: 'logo_pick', accept: 'image/png,image/jpeg,image/webp,image/svg+xml' }] }]) as Array<{ ctls: Array<{ accept: string }> }>;
  assert.equal(groups[0].ctls[0].accept, 'image/png,.png');
});
