/**
 * Contract: the logo-customization module validates a supplied picture the way its own
 * comments claim, and the choice it produces is actually shown somewhere.
 *
 * `logo-customization.ts` is pure and self-contained, so this plain `.mjs` file `import()`s
 * it directly through Node's built-in TypeScript type-stripping and calls the real
 * `sniffFormat` / `acceptLogo` / `currentChoice` functions -- no reimplementation of the
 * byte-sniffing or the decompression-bomb math that could quietly drift from the original.
 *
 * The second half of this file is textual, against App.tsx and the generated design, because
 * the interesting question for this feature is not "does the validator work" -- it does --
 * but "does choosing a mark change anything a person can see". It does not: the choice is
 * persisted and reported back as a line of text, and nothing else in the running app ever
 * reads it to paint a different picture anywhere.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const logo = await import('../../app/renderer/src/logo-customization.ts');

/* --- sniffFormat: the bytes decide, never the claimed name or type ------------------- */

test('sniffFormat recognises PNG, JPEG, WebP and SVG by their real leading bytes', () => {
  assert.equal(logo.sniffFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])), 'png');
  assert.equal(logo.sniffFormat(new Uint8Array([0xff, 0xd8, 0xff, 0, 0])), 'jpeg');
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  assert.equal(logo.sniffFormat(webp), 'webp');
  assert.equal(logo.sniffFormat(new TextEncoder().encode('  <svg xmlns="x">')), 'svg', 'leading whitespace before the root element');
});

test('sniffFormat returns undefined for bytes that are none of the accepted formats', () => {
  assert.equal(logo.sniffFormat(new Uint8Array([0, 1, 2, 3])), undefined);
  assert.equal(logo.sniffFormat(new TextEncoder().encode('plain text, not svg')), undefined);
});

/* --- acceptLogo: every bound checked before anything is trusted ---------------------- */

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test('acceptLogo refuses an empty file and a file over the size cap', () => {
  const empty = logo.acceptLogo(PNG_BYTES, { width: 10, height: 10, frames: 1 }, { fileBytes: 0 });
  assert.ok('problems' in empty);
  const tooBig = logo.acceptLogo(PNG_BYTES, { width: 10, height: 10, frames: 1 }, { fileBytes: logo.MAX_FILE_BYTES + 1 });
  assert.ok('problems' in tooBig);
});

test('acceptLogo refuses bytes that sniff to no known format, regardless of the claimed name', () => {
  const garbage = new Uint8Array([1, 2, 3, 4]);
  const result = logo.acceptLogo(garbage, { width: 10, height: 10, frames: 1 }, { fileName: 'totally-a-logo.png' });
  assert.ok('problems' in result);
  assert.match(result.problems[0].message, /not a PNG, JPEG, WebP or SVG/);
});

test('acceptLogo refuses a side over MAX_DIMENSION, and accepts exactly MAX_DIMENSION square (the largest legal square)', () => {
  const overSide = logo.acceptLogo(PNG_BYTES, { width: logo.MAX_DIMENSION + 1, height: 10, frames: 1 });
  assert.ok('problems' in overSide);
  const atLimit = logo.acceptLogo(PNG_BYTES, { width: logo.MAX_DIMENSION, height: logo.MAX_DIMENSION, frames: 1 });
  assert.ok(!('problems' in atLimit), 'exactly at both limits at once must still be accepted');
});

test('PIN: the pixel-count check can never fire on its own here, because MAX_DECODED_PIXELS equals MAX_DIMENSION squared exactly', () => {
  /* For any width and height individually within MAX_DIMENSION, the largest possible
   * product is MAX_DIMENSION * MAX_DIMENSION -- which is exactly MAX_DECODED_PIXELS, not
   * one pixel more. So there is no rectangle that passes the per-side check and still trips
   * the separate "more pixels than this console will hold" message; the two checks always
   * fire together or not at all. The module's own comment frames the pixel-count check as
   * catching what "the byte limit alone would not" -- true -- but the per-side check already
   * covers every case the pixel check could additionally catch, given this exact ratio. If
   * MAX_DECODED_PIXELS is ever lowered below MAX_DIMENSION squared (which would make the
   * pixel check meaningfully independent), this assertion is the one that should start
   * failing and prompt a real "thin rectangle bomb" test to replace it. */
  assert.equal(logo.MAX_DECODED_PIXELS, logo.MAX_DIMENSION * logo.MAX_DIMENSION);
});

test('acceptLogo refuses more than one frame, since a mark is one picture', () => {
  const animated = logo.acceptLogo(PNG_BYTES, { width: 10, height: 10, frames: logo.MAX_FRAMES + 1 });
  assert.ok('problems' in animated);
});

test('acceptLogo refuses an unusable reported size rather than guessing', () => {
  assert.ok('problems' in logo.acceptLogo(PNG_BYTES, { width: 0, height: 10, frames: 1 }));
  assert.ok('problems' in logo.acceptLogo(PNG_BYTES, { width: NaN, height: 10, frames: 1 }));
});

test('acceptLogo accepts a well-formed PNG and reports (never refuses on) a name/type mismatch', () => {
  const result = logo.acceptLogo(
    PNG_BYTES, { width: 64, height: 64, frames: 1 },
    { fileName: 'mark.jpg', mimeType: 'image/jpeg', fileBytes: PNG_BYTES.length },
  );
  assert.ok(!('problems' in result), 'a real PNG must be accepted even if it is misnamed');
  assert.equal(result.format, 'png');
  assert.ok(result.notices.some((n) => n.includes('actually png')));
});

/* --- currentChoice / choosePreset / resetLogo: storage round-trip -------------------- */

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

test('currentChoice falls back to the shipped default preset when nothing, or garbage, is stored', () => {
  assert.deepEqual(logo.currentChoice(undefined), { kind: 'preset', presetId: logo.DEFAULT_PRESET_ID });
  const storage = memoryStorage();
  storage.setItem(logo.LOGO_SETTING, 'not json');
  assert.deepEqual(logo.currentChoice(storage), { kind: 'preset', presetId: logo.DEFAULT_PRESET_ID });
});

test('currentChoice never trusts a remote URL as a custom mark -- a network mark would be a request on every launch', () => {
  const storage = memoryStorage();
  storage.setItem(logo.LOGO_SETTING, JSON.stringify({ kind: 'custom', storedAt: 'https://evil.example/x.png' }));
  assert.deepEqual(logo.currentChoice(storage), { kind: 'preset', presetId: logo.DEFAULT_PRESET_ID });
});

test('choosePreset only accepts a real preset id, and resetLogo returns to the shipped mark in one action', () => {
  const storage = memoryStorage();
  assert.equal(logo.choosePreset(storage, 'not-a-real-preset'), false);
  assert.equal(logo.choosePreset(storage, 'handset'), true);
  assert.deepEqual(logo.currentChoice(storage), { kind: 'preset', presetId: 'handset' });
  logo.resetLogo(storage);
  assert.deepEqual(logo.currentChoice(storage), { kind: 'preset', presetId: logo.DEFAULT_PRESET_ID });
});

test('NEVER_CHANGED_BY_A_MARK lists every identity constant a mark must never touch', () => {
  for (const key of ['dataDirectory', 'applicationId', 'credentialService', 'updateFeed', 'installerIdentity', 'executableName']) {
    assert.ok(logo.NEVER_CHANGED_BY_A_MARK.includes(key), `${key} is missing from the list of things a mark must never change`);
  }
});

/* --- wiring: App.tsx really calls acceptLogo/chooseCustom/choosePreset/resetLogo ------ */

const app = read('app/renderer/src/App.tsx');
const generated = read('app/renderer/src/generated/console.tsx');

test('App imports the real validator rather than a local copy', () => {
  assert.match(app, /DEFAULT_PRESET_ID, LOGO_PRESETS, acceptLogo, chooseCustom, choosePreset, currentChoice, resetLogo,/);
});

test('picking a file runs it through acceptLogo before it can become the mark, and a rejection leaves the previous mark alone', () => {
  const start = app.indexOf('private pickLogo(file: File): void {');
  assert.ok(start > 0, 'pickLogo has been renamed or removed');
  const body = app.slice(start, app.indexOf('\n  }', start));
  assert.match(body, /const verdict = acceptLogo\(bytes, facts, /);
  assert.match(body, /if \('problems' in verdict\) \{/);
  assert.match(body, /chooseCustom\(this\.durableStorage\.storage, `logo\/cache\/\$\{receiptId\}`\);/);
});

test('the design renders the preset picker, the file picker, reset and a status readout, all answered', () => {
  for (const id of ['logo_preset', 'logo_pick', 'logo_reset', 'logo_status']) {
    assert.match(generated, new RegExp(`ctl\\('${id}',`), `${id} is missing from the design`);
  }
  assert.match(app, /control\?\.id === 'logo_preset' && typeof value === 'string'/);
  assert.match(app, /control\?\.id === 'logo_reset' && value === true/);
  assert.match(app, /if \(action === 'logo-status'\) return this\.logoStatusLine;/);
});

/* --- visible renderer consumption ----------------------------------------------------- */

test('the renderer consumes the current choice through the title-bar logo boundary', () => {
  const mark = read('app/renderer/src/logo-mark.tsx');
  const titleBar = read('app/renderer/src/title-bar-name.ts');
  const callSites = [...app.matchAll(/currentChoice\(this\.durableStorage\.storage\)/g)];
  assert.ok(callSites.length >= 2, 'currentChoice is called from fewer places than expected -- re-check this pin');
  assert.match(app, /createElement\(LogoMark, this\.logoForTitleBar\(\)\)/u,
    'App no longer supplies the selected logo to the title-bar boundary');
  assert.match(app, /private logoForTitleBar\(\)/u,
    'the title-bar logo resolver is missing');
  assert.match(mark, /data-app-logo="true"/u,
    'LogoMark no longer renders a real, inspectable image consumer');
  assert.match(mark, /alt=\{props\.label\}/u,
    'the visible logo has no accessible name');
  assert.match(titleBar, /brand\?: ReactNode/u,
    'title-bar-name no longer accepts the real logo boundary');
  assert.match(titleBar, /cloneElement\(brand/u,
    'title-bar-name no longer replaces the design placeholder icon');
});

test('PIN: no window icon, title bar, taskbar mark or nativeImage anywhere reads the stored logo choice', () => {
  const mainTs = read('app/electron/main.ts');
  assert.doesNotMatch(mainTs, /LOGO_SETTING|currentChoice|nativeImage|setIcon/,
    'main.ts now reads the logo setting to set a real window/app icon -- update this pin');
});

test('the privileged logo boundary stores validated local derivatives and the renderer consumes the cache', () => {
  const dispatch = read('control-plane/dispatch.ts');
  const store = read('control-plane/logo-store.ts');
  assert.match(dispatch, /logo\.inspect|logo\.convert|logo\.cache\.read|logo\.cache\.write|logo\.cache\.clear/u);
  assert.match(dispatch, /logo-cache/u);
  assert.match(store, /validAssetBytes|sha256|manifest\.json|recursive: true/u);
  assert.doesNotMatch(store, /sourcePath|sourceBytes|file\.name/u,
    'the private cache must not retain the selected source path or source bytes');
  assert.match(app, /action: 'logo\.inspect'/u,
    'accepted logo bytes no longer pass through the privileged inspection action');
  assert.match(app, /action: 'logo\.convert'/u,
    'accepted logo bytes no longer pass through the isolated conversion action');
  assert.match(app, /action: 'logo\.cache\.write'/u,
    'validated derivatives are no longer written through the private cache boundary');
  assert.match(app, /action: 'logo\.cache\.read'/u,
    'startup no longer rehydrates the validated private cache');
  assert.match(app, /action: 'logo\.cache\.clear'/u,
    'reset no longer clears the private cache');
  assert.match(app, /bytesBase64/u,
    'renderer rehydration no longer requires a validated byte-bearing cache response');
  assert.match(app, /URL\.revokeObjectURL\(this\.logoPreviewUrl\)/u,
    'custom object URLs are not revoked on replacement or unmount');
});

test('the visible picker is constrained to PNG because the packaged isolated decoder is PNG-only', () => {
  const picker = read('app/renderer/src/logo-picker-capability.ts');
  assert.match(picker, /PNG_ACCEPT = 'image\/png,\.png'/u);
  assert.match(picker, /control\.id === 'logo_pick'/u);
  assert.match(app, /verdict\.format !== 'png'/u);
  assert.match(app, /isolated decoder supports PNG derivatives only/u);
  assert.match(app, /JPEG, WebP, and SVG remain unavailable/u);
});

test('the durable logo marker is receipt-derived and never includes the source filename', () => {
  assert.match(app, /const receiptId = cached\.data\.assets\[0\]\?\.receipt\.sha256/u);
  assert.match(app, /logo\/cache\/\$\{receiptId\}/u);
  assert.doesNotMatch(app, /chooseCustom\(this\.durableStorage\.storage, `logo\/\$\{file\.name\}`/u);
});
