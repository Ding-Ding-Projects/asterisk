/**
 * Contract: per-element-toy-locks.
 *
 * The implementation-registry note is STALE in exactly the two places it
 * claims a gap. It says: "Missing against the contract: no OTP/TOTP option, no
 * per-element lock-creation wizard reachable from a documented context-menu
 * command." Both are now false, and this file pins the current truth instead:
 *
 *   - The compiled lock wizard's `lockMethods` list genuinely offers three
 *     TOTP-including combinations: 'PIN+TOTP', 'Password+TOTP',
 *     'Password+PIN+TOTP'.
 *   - App.tsx's own `lockNext`/`tryUnlock` (overriding the generated design's
 *     PIN/password-only originals via `App extends ConsoleShell`) genuinely
 *     verify a real RFC 6238 code through `totp.ts`'s `verifyCode`, refusing to
 *     finish a TOTP-including lock until `pairAuth()` has actually generated a
 *     secret (see built-in-authenticator.md for the pairing details).
 *   - "Lock this element…" is a real, wired context-menu command (⌃L),
 *     opening the wizard directly.
 *
 * The real gap the note SHOULD have named instead: credentials (PIN, password,
 * and the TOTP secret) are stored in plain React component state
 * (`state.locks`), never in the OS credential vault -- confirmed by grepping
 * the renderer for any vault/keytar/safeStorage reference near the lock
 * mechanism, and finding none.
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
const GENERATED = 'app/renderer/src/generated/console.tsx';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['per-element-toy-locks'];
  assert.ok(row, 'the implementation registry has no row for per-element-toy-locks');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.status), `undefined state "${row.status}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('the wizard genuinely offers three TOTP-including lock methods -- the "no OTP/TOTP option" claim is now false', () => {
  const generated = read(GENERATED);
  assert.match(generated, /\{ label:'PIN \+ one-time code', icon:'phonelink_lock', v:'PIN\+TOTP' \}/u, 'PIN+TOTP method no longer offered');
  assert.match(generated, /\{ label:'Password \+ one-time code', icon:'shield_lock', v:'Password\+TOTP' \}/u, 'Password+TOTP method no longer offered');
  assert.match(generated, /\{ label:'Password \+ PIN \+ one-time code', icon:'admin_panel_settings', v:'Password\+PIN\+TOTP' \}/u,
    'Password+PIN+TOTP method no longer offered');
});

test("App.tsx's own lockNext/tryUnlock override the generated design's PIN/password-only originals and genuinely verify TOTP", () => {
  const app = read(APP);
  assert.match(app, /const needsTotp = s\.lockMethod\.indexOf\('TOTP'\) >= 0;/u, 'lockNext no longer checks for a TOTP-including method');
  assert.match(app, /if \(needsTotp && !s\.totpPendingSecret\) \{ this\.toast\('Pair the built-in authenticator first'\); return; \}/u,
    'lockNext no longer refuses to finish without a paired secret');
  assert.match(app, /const ok = await verifyCode\(params, s\.unlockTotpDigits \?\? '', Date\.now\(\), 1\);/u,
    'tryUnlock no longer verifies a real TOTP code');
});

test('"Lock this element…" is a real, wired context-menu command reachable with a shortcut hint', () => {
  const generated = read(GENERATED);
  assert.match(generated, /\{ icon:'lock', label:'Lock this element…', hint:'⌃L', run:\(\) => this\.setState\(\{ ctxOpen:false, lockOpen:true,/u,
    '"Lock this element…" no longer matches the expected wired context-menu command');
});

test('credentials are stored in plain component state, never the OS credential vault -- the real remaining gap', () => {
  const app = read(APP);
  const lockNextFn = app.match(/lockNext = \(\): void => \{[\s\S]*?\n  \};/);
  assert.ok(lockNextFn, 'expected to find the lockNext method body');
  assert.doesNotMatch(lockNextFn[0], /credentialVault|keytar|safeStorage/iu,
    'lockNext now references an OS credential vault -- the storage gap may have been closed, update this row');
  assert.match(lockNextFn[0], /const L = \{ \.\.\.s\.locks \};/u, 'locks are no longer stored in plain component state -- re-check the storage mechanism');
});
