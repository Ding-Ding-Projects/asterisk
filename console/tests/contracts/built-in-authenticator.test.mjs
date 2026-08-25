/**
 * Contract: built-in-authenticator. Real and wired into the per-element lock.
 * `totp.ts` is imported by App.tsx and used from `pairAuth`/`lockNext`/
 * `tryUnlock`: `pairAuth` generates a real random secret with the Web Crypto
 * RNG (`crypto.getRandomValues`), computes a real `otpauth://` pairing URI
 * (`pairingUri`), and reveals both as copyable text through the app's own info
 * panel -- never a remote QR service, and never a network call anywhere in the
 * method. `lockNext` refuses to finish a TOTP-including lock until `pairAuth`
 * has actually run. `tryUnlock` verifies a real RFC 6238 code via
 * `verifyCode` (one step of skew) using the app's own numeric keypad.
 *
 * Two real gaps, both because editing the compiled design/generated output was
 * out of scope: the QR box next to "Pair the built-in authenticator" is a
 * static decorative gradient with no bound slot for pixel data, so the secret
 * is shown as copyable text instead of a scannable image; and there is no
 * confirmation-code re-entry step before the secret is treated as paired,
 * because the Password+TOTP wizard panel has no digit-entry control of its own
 * to collect one. The secret is stored in the same non-durable, non-OS-vault
 * state.locks as the PIN and password (see per-element-toy-locks.md) -- a
 * pre-existing gap, not a new one.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const APP = 'app/renderer/src/App.tsx';
const MODULE = 'app/renderer/src/totp.ts';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['built-in-authenticator'];
  assert.ok(row, 'the implementation registry has no row for built-in-authenticator');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('pairAuth generates a real random secret with Web Crypto and computes a real otpauth:// pairing URI', () => {
  const app = read(APP);
  const fn = app.match(/pairAuth = \(\): void => \{[\s\S]*?\n  \};/);
  assert.ok(fn, 'expected to find the pairAuth method body');
  const body = fn[0];
  assert.match(body, /crypto\.getRandomValues\(secretBytes\);/u, 'pairAuth no longer generates real random bytes');
  assert.match(body, /const secret = encodeBase32\(secretBytes\);/u, 'pairAuth no longer encodes a real base32 secret');
  assert.match(body, /const uri = pairingUri\(\{ issuer: 'Ding PBX Console', account, parameters: \{ secret \} \}\);/u,
    'pairAuth no longer computes a real pairing URI');
  assert.doesNotMatch(body, /fetch\(|XMLHttpRequest|axios/u, 'pairAuth now makes a network call -- the "never sent anywhere" claim would be false');
});

test('the secret and URI are revealed as copyable text, and the copy says so honestly rather than implying a scannable image', () => {
  const app = read(APP);
  assert.match(app, /This build shows the real one-time secret as text rather than a scannable QR image/u,
    'the honest QR-gap disclosure copy no longer matches');
});

test('lockNext refuses to finish a TOTP-including lock until pairAuth has actually generated a secret', () => {
  const app = read(APP);
  assert.match(app, /if \(needsTotp && !s\.totpPendingSecret\) \{ this\.toast\('Pair the built-in authenticator first'\); return; \}/u,
    'lockNext no longer refuses to finish without a real paired secret');
});

test('tryUnlock verifies a real RFC 6238 code with one step of skew, using totp.ts\'s own verifyCode', () => {
  const app = read(APP);
  assert.match(app, /const params: TotpParameters = \{ secret: L\.totpSecret \};/u, 'tryUnlock no longer builds real TOTP parameters from the stored secret');
  assert.match(app, /const ok = await verifyCode\(params, s\.unlockTotpDigits \?\? '', Date\.now\(\), 1\);/u,
    'tryUnlock no longer calls verifyCode with one step of skew');
});

test('totp.ts exports the real primitives this wiring depends on: encodeBase32, generateCode, verifyCode, pairingUri', () => {
  const src = read(MODULE);
  for (const fn of ['export function encodeBase32(', 'export async function generateCode(', 'export async function verifyCode(', 'export function pairingUri(']) {
    assert.ok(src.includes(fn), `${fn} no longer exists in totp.ts`);
  }
});
