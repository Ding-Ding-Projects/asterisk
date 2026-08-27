/**
 * Contract: built-in-authenticator on the pages-site.
 *
 * The canonical contract has two halves that are easy to confuse, and this surface
 * implements exactly one of them on purpose:
 *
 *   pairing OUT -- an application that owns a one-time-code factor generates a secret
 *     and draws a QR for a phone to scan. This page owns no such factor. Nothing here
 *     is protected by a one-time code, so there is no secret of ours to hand out, and
 *     a QR generated here would be pairing a phone to a factor nobody can use.
 *   pairing IN -- the reader brings a secret ANOTHER service issued and keeps it here,
 *     and the surface owes every route that avoids retyping a base32 string by hand.
 *
 * Reading a QR is therefore a decode. It is done by the browser's own BarcodeDetector,
 * and where a browser has none the control is absent with the reason stated, because a
 * scan button that cannot scan teaches the reader their code is unreadable rather than
 * that their browser is. That boundary is asserted here rather than left in prose.
 *
 * The arithmetic is not taken on trust. RFC 6238's published vectors run against the
 * real extracted source for all three hash algorithms, at 8 digits, across six widely
 * separated instants -- the same table `tests/ui/totp.test.tsx` already holds for the
 * desktop renderer, so the two implementations are checked against one external
 * authority rather than against each other.
 *
 * Everything else runs the real extracted slice against a recording page and a clock
 * the test holds still, in the style `automatic-updates.test.mjs` established here. It
 * matters more than usual: "there is a code on screen" is true of a surface showing a
 * number that never changes, and "the secret is safe" is true of every implementation
 * right up until one of them writes it into a history entry.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/* CRLF stripped before anything is matched across lines. A newline-only pattern
 * against a CRLF checkout matches nothing, and an assertion that matches nothing
 * passes in the one direction nobody notices. */
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const app = read('app.js');
const settings = read('settings.html');
const styles = read('styles.css');
const registry = json('feature-registry.json');
const locales = json('locales/feature-registry.json');

/* ------------------------------------------------------------------ *
 * Running the real source.
 * ------------------------------------------------------------------ */

/** The source of one `function name(...)` declaration, brace-counted so nesting survives. */
function functionSource(src, name) {
  const found = src.indexOf(`function ${name}(`);
  assert.notEqual(found, -1, `function ${name} is not declared in site/app.js`);
  const start = src.slice(found - 6, found) === 'async ' ? found - 6 : found;
  const braceStart = src.indexOf('{', src.indexOf(')', start));
  let depth = 0;
  for (let i = braceStart; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`function ${name} is not brace-balanced in site/app.js`);
}

/**
 * The whole authenticator, as one contiguous slice.
 *
 * Taken rather than reassembled from a list of names, because the parts that matter
 * most here are the ones between the functions: the storage key, the bounds, and the
 * module-level `authEntries` that every one of them reads. A slice cannot quietly
 * lose one of those the way a name list can.
 */
function authenticatorSource(src) {
  const start = src.indexOf("  const AUTH_KEY='ding-pbx-pages-authenticator-v1';");
  assert.notEqual(start, -1, 'the authenticator block no longer begins with AUTH_KEY in site/app.js');
  const tail = functionSource(src, 'initAuthenticator');
  const end = src.indexOf(tail, start);
  assert.notEqual(end, -1, 'initAuthenticator no longer follows AUTH_KEY in site/app.js');
  return src.slice(start, end + tail.length);
}

/** The export engine, whose real suitability and loss rules the redacted export runs through. */
function exportEngineSource(src) {
  const start = src.indexOf("const EXPORT_FORMATS = ['json'");
  assert.notEqual(start, -1, 'the export engine no longer begins with EXPORT_FORMATS in site/app.js');
  const tail = functionSource(src, 'exportFilename');
  const end = src.indexOf(tail, start);
  return src.slice(start, end + tail.length);
}
function mimeSource(src) {
  const line = src.split('\n').find((candidate) => candidate.includes('const EXPORT_MIME={'));
  assert.ok(line, 'EXPORT_MIME is no longer declared on a line of its own in site/app.js');
  return line;
}

const AUTH_SOURCE = authenticatorSource(app);

const EXPORTED = [
  'authNow', 'authDecodeBase32', 'authEncodeBase32', 'authGroupSecret',
  'authNormaliseAlgorithm', 'authNormaliseDigits', 'authNormalisePeriod',
  'authGenerateCode', 'authVerifyCode', 'authSecondsRemaining',
  'authPairingUri', 'authParsePairingUri', 'authClockNote',
  'authNormaliseEntry', 'authLoadEntries', 'authSaveEntries', 'authEntryTitle', 'authEntryMeta',
  'authExportSummary', 'authExportRows', 'authDraftProblem', 'authPrepareDraft',
  'authDetectorAvailable', 'authCameraAvailable', 'authClipboardAvailable', 'authCapabilityNote',
  'authDetectPairingUri', 'authMatchingEntries', 'authStatusLine', 'authRenderList', 'authTick',
  'authGroupCode', 'authAnnounce', 'authUpdateSelectionUI', 'authUpdateExportFormats',
  'authReadDraftFields', 'authWriteDraftFields', 'authRenderDraftStatus', 'authResetDraft',
  'authApplyReadResult', 'authSaveDraft', 'authRemoveEntries', 'authMoveEntry',
  'authSecretsExportRows', 'authSecretsFields', 'authSecretsReady', 'authUpdateSecretsSlider',
  'authPerformSecretsExport', 'initAuthenticator', 'AUTH_KEY', 'AUTH_ENTRY_LIMIT', 'AUTH_SKEW_STEPS',
  'AUTH_ALGORITHMS',
];

/** A throwaway element that records what was done to it rather than shrugging. */
function makeElement(tag, id) {
  const element = {
    tagName: tag,
    id,
    type: tag === 'input' ? 'text' : '',
    hidden: false,
    disabled: false,
    checked: false,
    value: '',
    textContent: '',
    files: null,
    srcObject: null,
    className: '',
    dataset: {},
    attributes: {},
    listeners: {},
    modalOpens: 0,
    closes: 0,
    focuses: 0,
    rows: [],
    all: [],
    parent: null,
    setAttribute(key, value) { this.attributes[key] = String(value); },
    getAttribute(key) { return Object.prototype.hasOwnProperty.call(this.attributes, key) ? this.attributes[key] : null; },
    removeAttribute(key) { delete this.attributes[key]; },
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); },
    showModal() { this.modalOpens += 1; },
    close() { this.closes += 1; this.dispatch('close'); },
    focus() { this.focuses += 1; },
    play() { return Promise.resolve(); },
    /* Deliberately ignores `disabled`: a disabled control is the visible guard, and
     * anything reaching a handler anyway is exactly the case the refusals below are
     * about. A fake that honoured it would make half of them untestable. */
    dispatch(type, event = {}) {
      for (const handler of [...(this.listeners[type] ?? [])]) handler({ target: this, ...event });
    },
    querySelector(selector) { return this.rows.flatMap((row) => row.all).find((node) => node.matches(selector)) ?? null; },
    querySelectorAll(selector) { return this.rows.flatMap((row) => row.all).filter((node) => node.matches(selector)); },
    matches(selector) { return matchesSelector(this, selector); },
    closest(selector) { return this.matches(selector) ? this : (this.parent ? this.parent.closest(selector) : null); },
  };
  /* The list's markup is a string the source builds; the row objects below are parsed
   * back out of that exact string, so an assertion about a row is an assertion about
   * what the page would really render rather than about a convenient stand-in. */
  Object.defineProperty(element, 'innerHTML', {
    get() { return this._html ?? ''; },
    set(html) { this._html = String(html); this.rows = parseRows(this, this._html); },
  });
  return element;
}

function matchesSelector(node, selector) {
  if (selector.startsWith('.')) return node.className.split(' ').includes(selector.slice(1));
  const exact = /^\[([a-z-]+)="([^"]*)"\]$/.exec(selector);
  if (exact) return node.getAttribute(exact[1]) === exact[2];
  const present = /^\[([a-z-]+)\]$/.exec(selector);
  if (present) return node.getAttribute(present[1]) !== null;
  if (selector === 'input[type="checkbox"]') return node.tagName === 'input' && node.type === 'checkbox';
  const compound = /^([a-z]*)\.([a-z-]+)\[([a-z-]+)\]$/.exec(selector);
  if (compound) {
    return (!compound[1] || node.tagName === compound[1])
      && node.className.split(' ').includes(compound[2])
      && node.getAttribute(compound[3]) !== null;
  }
  return false;
}

/** Pulls the row structure the source emitted back out of its own markup. */
function parseRows(host, html) {
  const rows = [];
  for (const match of html.matchAll(/<article class="auth-entry" data-auth-id="([^"]+)">([\s\S]*?)<\/article>/g)) {
    const id = match[1];
    const body = match[2];
    const row = makeElement('article', '');
    row.className = 'auth-entry';
    row.dataset.authId = id;
    row.setAttribute('data-auth-id', id);
    row.parent = host;
    const checkbox = makeElement('input', '');
    checkbox.type = 'checkbox';
    checkbox.checked = /<input type="checkbox" checked/.test(body);
    checkbox.parent = row;
    const code = makeElement('output', '');
    code.className = 'auth-code mono';
    code.setAttribute('data-auth-code', id);
    code.textContent = (/<output class="auth-code mono" data-auth-code="[^"]*">([^<]*)</.exec(body) ?? ['', ''])[1];
    code.parent = row;
    const meta = makeElement('p', '');
    meta.className = 'auth-meta mono';
    meta.setAttribute('data-auth-meta', id);
    meta.parent = row;
    row.all = [row, checkbox, code, meta];
    row.rows = [{ all: row.all }];
    rows.push({ id, all: row.all, row, checkbox, code, meta });
  }
  return rows;
}

const IDS = [
  'authenticator-card', 'authenticator-desc', 'authenticator-clock-note', 'authenticator-capability',
  'authenticator-status', 'authenticator-search', 'authenticator-list', 'authenticator-announcer',
  'authenticator-add', 'authenticator-dialog', 'auth-selection-status', 'auth-export-format',
  'auth-export-loss', 'auth-confirm', 'auth-confirm-text', 'auth-select-page', 'auth-select-matches',
  'auth-select-none', 'auth-remove-selected', 'auth-export-selected', 'auth-export-secrets',
  'auth-confirm-yes', 'auth-confirm-cancel', 'auth-uri', 'auth-uri-apply', 'auth-qr-file',
  'auth-qr-file-row', 'auth-qr-clipboard', 'auth-qr-camera', 'auth-camera', 'auth-camera-stop',
  'auth-read-status', 'auth-issuer', 'auth-account', 'auth-secret', 'auth-secret-reveal',
  'auth-algorithm', 'auth-digits', 'auth-period', 'auth-cross-check', 'auth-draft-status', 'auth-save',
  'auth-secrets-dialog', 'auth-secrets-text', 'auth-secrets-count', 'auth-secrets-key-1',
  'auth-secrets-key-2', 'auth-secrets-slider', 'auth-secrets-slider-status', 'auth-secrets-cancel',
];

/**
 * The real slice, wired to a page that records and a clock that does not move.
 *
 * `stored` seeds the localStorage the block reads at construction, which is the only
 * way to test that a corrupt record is dropped rather than shown as an account whose
 * codes never work.
 */
function loadAuthenticator({
  stored = [],
  now = 1700000000000,
  detector = null,
  clipboard = false,
  camera = false,
  card = true,
  crypto = globalThis.crypto,
} = {}) {
  const elements = new Map();
  for (const id of IDS) {
    if (!card && id === 'authenticator-card') continue;
    elements.set(id, makeElement(id.includes('dialog') ? 'dialog' : 'div', id));
  }
  const secretField = elements.get('auth-secret');
  if (secretField) secretField.type = 'password';
  const $ = (id) => elements.get(id) ?? null;

  const store = new Map();
  store.set('ding-pbx-pages-authenticator-v1', JSON.stringify(stored));
  const localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };

  const history = [];
  const notifications = [];
  const downloads = [];
  const intervals = [];
  const timeouts = [];
  const networkCalls = [];
  const writeReports = [];

  const clock = { value: now };
  class DateShim extends Date { static now() { return clock.value; } }

  const navigatorShim = {
    ...(clipboard ? { clipboard: { read: async () => [], writeText: async () => {} } } : {}),
    ...(camera ? { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } } : {}),
  };

  const body = `${exportEngineSource(app)}\n${mimeSource(app)}\n`
    + `${['bulkClick', 'bulkSelectAll', 'planBulk', 'summariseBulk', 'matchText', 'escapeHtml',
      'writeLocal', 'storageRefusalReason'].map((name) => functionSource(app, name)).join('\n')}\n`
    + `${AUTH_SOURCE}\n`
    + `return { ${EXPORTED.join(', ')}, get authEntries(){return authEntries}, get authSelection(){return authSelection}, set authSelection(v){authSelection=v} };`;

  /* The detector is looked up on `globalThis` by the source, because that is where a
   * browser puts it and pretending otherwise would test a seam this page does not have.
   * Tests in one file run in sequence, and every one of them loads through here, so the
   * global is always the one this load asked for. */
  if (detector) globalThis.BarcodeDetector = detector; else delete globalThis.BarcodeDetector;

  // eslint-disable-next-line no-new-func -- deliberately re-running the real extracted source
  const api = new Function(
    '$', 'localStorage', 'Date', 'crypto', 'document', 'navigator', 'setInterval', 'setTimeout',
    'recordHistory', 'notify', 'download', 'applyVocabulary', 'applyVocabularyText', 'regexState',
    'createImageBitmap', 'fetch', 'reportWrite',
    body,
  )(
    $, localStorage, DateShim, crypto,
    { createElement: (tag) => makeElement(tag, '') },
    navigatorShim,
    (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; },
    (fn, ms) => { timeouts.push({ fn, ms }); return timeouts.length; },
    (action, summary) => history.push({ action, summary }),
    (title, bodyText, narration) => notifications.push({ title, body: bodyText, narration }),
    (name, text, mime) => downloads.push({ name, text, mime }),
    () => {},
    (text) => text,
    new Map(),
    async (blob) => blob,
    (...args) => { networkCalls.push(args); throw new Error('the authenticator made a network call'); },
    (what, result) => { writeReports.push({ what, result }); return result.ok; },
  );

  /* Copied by name rather than spread. A spread EVALUATES the two accessors below, so
   * `h.authEntries` would be a snapshot of the empty list taken at load time and every
   * assertion about what saving did would read zero accounts and say the save failed. */
  const handle = { api, $, elements, store, history, notifications, downloads, intervals, timeouts, networkCalls, writeReports, clock, localStorage };
  for (const name of EXPORTED) handle[name] = api[name];
  Object.defineProperty(handle, 'authEntries', { get: () => api.authEntries });
  Object.defineProperty(handle, 'authSelection', { get: () => api.authSelection, set: (value) => { api.authSelection = value; } });
  return handle;
}

/* A base32 secret with no ambiguity about what it decodes to, and short enough to read
 * in a failure message. */
const SAMPLE_SECRET = 'JBSWY3DPEHPK3PXP';
const OTHER_SECRET = 'MFRGGZDFMZTWQ2LK';

/* ------------------------------------------------------------------ *
 * RFC 6238. The arithmetic, checked against an outside authority.
 * ------------------------------------------------------------------ */

function seedBase32(h, length) {
  const base = '12345678901234567890';
  let ascii = '';
  while (ascii.length < length) ascii += base;
  ascii = ascii.slice(0, length);
  return h.authEncodeBase32(new Uint8Array([...ascii].map((ch) => ch.charCodeAt(0))));
}

/* https://www.rfc-editor.org/rfc/rfc6238#appendix-B -- the same table the desktop
 * renderer's own totp.test.tsx holds, so both implementations are checked against one
 * external authority rather than against each other. */
const VECTORS = [
  { atMs: 59 * 1000, sha1: '94287082', sha256: '46119246', sha512: '90693936' },
  { atMs: 1111111109 * 1000, sha1: '07081804', sha256: '68084774', sha512: '25091201' },
  { atMs: 1111111111 * 1000, sha1: '14050471', sha256: '67062674', sha512: '99943326' },
  { atMs: 1234567890 * 1000, sha1: '89005924', sha256: '91819424', sha512: '93441116' },
  { atMs: 2000000000 * 1000, sha1: '69279037', sha256: '90698825', sha512: '38618901' },
  { atMs: 20000000000 * 1000, sha1: '65353130', sha256: '77737706', sha512: '47863826' },
];

test('every RFC 6238 published vector is reproduced, for all three algorithms', async () => {
  const h = loadAuthenticator();
  const secrets = { 'SHA-1': seedBase32(h, 20), 'SHA-256': seedBase32(h, 32), 'SHA-512': seedBase32(h, 64) };
  for (const vector of VECTORS) {
    for (const [algorithm, expected] of [['SHA-1', vector.sha1], ['SHA-256', vector.sha256], ['SHA-512', vector.sha512]]) {
      // eslint-disable-next-line no-await-in-loop
      const code = await h.authGenerateCode({ secret: secrets[algorithm], algorithm, digits: 8, period: 30 }, vector.atMs);
      assert.equal(code, expected, `${algorithm} at ${vector.atMs}ms`);
    }
  }
});

test('a code is stable inside its step and different in the next one', async () => {
  const h = loadAuthenticator();
  const parameters = { secret: SAMPLE_SECRET, algorithm: 'SHA-1', digits: 6, period: 30 };
  const early = await h.authGenerateCode(parameters, 60_000);
  const late = await h.authGenerateCode(parameters, 89_999);
  const next = await h.authGenerateCode(parameters, 90_000);
  assert.equal(early, late, 'the code changed inside a single 30-second step');
  assert.notEqual(early, next, 'the code did not change when the step boundary passed');
});

test('verification accepts one step of skew either side and refuses two', async () => {
  const h = loadAuthenticator();
  const parameters = { secret: SAMPLE_SECRET, algorithm: 'SHA-1', digits: 6, period: 30 };
  const at = 1_000_000_000_000;
  const previous = await h.authGenerateCode(parameters, at - 30_000);
  const twoBack = await h.authGenerateCode(parameters, at - 60_000);
  assert.equal(await h.authVerifyCode(parameters, previous, at, h.AUTH_SKEW_STEPS), true);
  assert.equal(await h.authVerifyCode(parameters, twoBack, at, h.AUTH_SKEW_STEPS), false,
    'a code two steps old was accepted, so acceptance is not really time-based');
  assert.equal(h.AUTH_SKEW_STEPS, 1, 'the skew window moved; the desktop renderer allows exactly one step');
});

test('verification refuses anything that is not a code of the declared length', async () => {
  const h = loadAuthenticator();
  const parameters = { secret: SAMPLE_SECRET, digits: 6, period: 30 };
  for (const candidate of ['', '12345', '1234567', 'abcdef', '12 34 56', null, 123456]) {
    // eslint-disable-next-line no-await-in-loop
    assert.equal(await h.authVerifyCode(parameters, candidate, 1_000_000_000_000, 1), false, `accepted ${String(candidate)}`);
  }
});

test('a badly shaped code is refused outright rather than reaching the arithmetic', async () => {
  /* The shape check is what keeps a verify a verify. Without it a malformed code walks
   * into the secret path, and a secret that cannot decode turns a plain "no" into a
   * thrown error -- which a caller checking a one-time code has no reason to expect,
   * and which on this page would take the unlock attempt down with it. */
  const h = loadAuthenticator();
  assert.equal(await h.authVerifyCode({ secret: '!!!!', digits: 6, period: 30 }, 'abc', 1_000, 1), false);
});

test('the countdown counts down, rounds up, and lands on the full period at a boundary', () => {
  const h = loadAuthenticator();
  assert.equal(h.authSecondsRemaining(30, 60_000), 30);
  assert.equal(h.authSecondsRemaining(30, 61_000), 29);
  assert.equal(h.authSecondsRemaining(30, 89_000), 1);
  /* Part-way through a second, rounding UP is what makes "1s left" mean the code is
   * still usable. Rounding down would show 0 for the whole of the last second, which
   * reads as a code that has already expired while it is still being accepted. */
  assert.equal(h.authSecondsRemaining(30, 61_500), 29);
  assert.equal(h.authSecondsRemaining(30, 89_500), 1);
});

/* ------------------------------------------------------------------ *
 * base32, and refusing to guess.
 * ------------------------------------------------------------------ */

test('base32 round-trips arbitrary bytes and tolerates the spacing services print', () => {
  const h = loadAuthenticator();
  const bytes = new Uint8Array([0, 1, 2, 255, 254, 128, 17, 33]);
  assert.deepEqual([...h.authDecodeBase32(h.authEncodeBase32(bytes))], [...bytes]);
  assert.deepEqual([...h.authDecodeBase32('JBSW Y3DP EHPK 3PXP')], [...h.authDecodeBase32(SAMPLE_SECRET)]);
  assert.deepEqual([...h.authDecodeBase32('jbswy3dpehpk3pxp')], [...h.authDecodeBase32(SAMPLE_SECRET)]);
  assert.equal(h.authGroupSecret(SAMPLE_SECRET), 'JBSW Y3DP EHPK 3PXP');
});

test('a character that is not base32 is refused rather than skipped', () => {
  /* Skipping it silently produces a DIFFERENT secret from the one the reader was
   * handed, and the only symptom is codes nothing ever accepts. */
  const h = loadAuthenticator();
  assert.throws(() => h.authDecodeBase32('JBSWY3DP0HPK3PXP'), /not base32/);
  assert.throws(() => h.authDecodeBase32(''), /empty/);
});

test('an unsupported algorithm, digit count or period is refused, never quietly defaulted', () => {
  const h = loadAuthenticator();
  assert.equal(h.authNormaliseAlgorithm('SHA256'), 'SHA-256');
  assert.equal(h.authNormaliseAlgorithm(''), 'SHA-1');
  assert.throws(() => h.authNormaliseAlgorithm('SHA-3'), /SHA-1, SHA-256 and SHA-512/);
  assert.throws(() => h.authNormaliseAlgorithm('md5'), /SHA-1, SHA-256 and SHA-512/);
  assert.throws(() => h.authNormaliseDigits(5), /between 6 and 8/);
  assert.throws(() => h.authNormaliseDigits(9), /between 6 and 8/);
  assert.throws(() => h.authNormalisePeriod(0), /between 1 and 300/);
  assert.throws(() => h.authNormalisePeriod(301), /between 1 and 300/);
  assert.deepEqual(h.AUTH_ALGORITHMS, ['SHA-1', 'SHA-256', 'SHA-512']);
});

/* ------------------------------------------------------------------ *
 * otpauth:// links.
 * ------------------------------------------------------------------ */

test('a pairing link round-trips every parameter it carries', () => {
  const h = loadAuthenticator();
  const entry = { issuer: 'Example Service', account: 'you@example.com', secret: SAMPLE_SECRET, algorithm: 'SHA-256', digits: 8, period: 45 };
  const uri = h.authPairingUri(entry);
  assert.match(uri, /^otpauth:\/\/totp\//);
  assert.deepEqual(h.authParsePairingUri(uri), entry);
});

test('a link this page cannot honour is refused with the reason, not accepted and mis-computed', () => {
  const h = loadAuthenticator();
  assert.throws(() => h.authParsePairingUri('https://example.com/'), /otpauth scheme/);
  assert.throws(() => h.authParsePairingUri('otpauth://hotp/a?secret=JBSWY3DP'), /time-based/);
  assert.throws(() => h.authParsePairingUri('otpauth://totp/a?issuer=b'), /carries no secret/);
  assert.throws(() => h.authParsePairingUri(`otpauth://totp/a?secret=${SAMPLE_SECRET}&algorithm=SHA3`), /SHA-1, SHA-256 and SHA-512/);
  assert.throws(() => h.authParsePairingUri('not a link at all'), /not a link this page can read/);
});

test('a link with no issuer keeps its account, and a labelled one splits on the first colon only', () => {
  const h = loadAuthenticator();
  const bare = h.authParsePairingUri(`otpauth://totp/me?secret=${SAMPLE_SECRET}`);
  assert.equal(bare.issuer, '');
  assert.equal(bare.account, 'me');
  const labelled = h.authParsePairingUri(`otpauth://totp/Corp:me:two?secret=${SAMPLE_SECRET}`);
  assert.equal(labelled.issuer, 'Corp');
  assert.equal(labelled.account, 'me:two');
});

/* ------------------------------------------------------------------ *
 * Nothing leaves this browser.
 * ------------------------------------------------------------------ */

test('the authenticator source makes no network call of any kind', () => {
  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'new WebSocket', 'EventSource', 'serviceWorker']) {
    assert.ok(!AUTH_SOURCE.includes(forbidden), `the authenticator source now contains ${forbidden}`);
  }
});

test('adding, listing and exporting an account touches no injected fetch', async () => {
  /* The scan above is a source property; this is the behavioural half, because a call
   * reached through a variable would not be spelt `fetch(` at all. */
  const h = loadAuthenticator();
  h.initAuthenticator();
  h.$('auth-issuer').value = 'Example';
  h.$('auth-account').value = 'me';
  h.$('auth-secret').value = SAMPLE_SECRET;
  await h.authSaveDraft();
  await h.authTick();
  assert.equal(h.networkCalls.length, 0, 'the authenticator called the injected fetch');
});

test('the clock note says plainly that this page cannot measure the clock, rather than inventing a warning', () => {
  const h = loadAuthenticator();
  const note = h.authClockNote();
  assert.match(note, /this computer’s own clock/);
  assert.match(note, /cannot tell you the clock is wrong/);
  assert.match(note, /Nothing here asks the network/);
});

/* ------------------------------------------------------------------ *
 * The secret never leaves its own store.
 * ------------------------------------------------------------------ */

test('secrets live under their own storage key, not in the settings state', () => {
  const h = loadAuthenticator();
  assert.equal(h.AUTH_KEY, 'ding-pbx-pages-authenticator-v1');
  assert.ok(!AUTH_SOURCE.includes('state.'),
    'the authenticator now reads or writes the settings state, which every history snapshot and the redacted export both serialize');
  assert.match(app, /restrictedPresentation:schoolExportSummary\(\),authenticator:authExportSummary\(\)/,
    'the redacted settings export no longer names the authenticator store it left out');
  assert.deepEqual(h.authExportSummary(), { accounts: 0, secrets: 'omitted', storedSeparatelyIn: 'ding-pbx-pages-authenticator-v1' });
});

test('no history entry, notification or ordinary export carries a secret', async () => {
  const h = loadAuthenticator();
  h.initAuthenticator();
  h.$('auth-issuer').value = 'Example';
  h.$('auth-account').value = 'me';
  h.$('auth-secret').value = SAMPLE_SECRET;
  const saved = await h.authSaveDraft();
  assert.equal(saved.ok, true, saved.reason);
  assert.equal(h.authEntries.length, 1);

  const written = JSON.stringify({ history: h.history, notifications: h.notifications });
  assert.ok(!written.includes(SAMPLE_SECRET), 'a secret reached the local history or a notification');
  assert.equal(h.history[0].action, 'authenticator-account-added');
  assert.match(h.history[0].summary, /The secret is not in this entry/);

  h.authSelection = { anchor: undefined, selected: new Set([h.authEntries[0].id]) };
  assert.deepEqual(h.authExportRows(h.authSelection.selected),
    [{ issuer: 'Example', account: 'me', algorithm: 'SHA-1', digits: 6, period: 30, secret: 'omitted' }]);

  h.authUpdateExportFormats();
  h.$('auth-export-format').value = 'json';
  h.$('auth-export-selected').dispatch('click');
  assert.equal(h.downloads.length, 1);
  assert.ok(!h.downloads[0].text.includes(SAMPLE_SECRET), 'the ordinary account export wrote a usable secret');
  assert.match(h.downloads[0].text, /omitted/);
  assert.match(h.$('auth-export-loss').textContent, /Secrets are omitted from this file/);
});

test('a browser that refuses the write says so rather than losing the account in silence', async () => {
  /* Every store on this page goes through the one guarded writer, and this one has the
   * most to lose by not: an account added into a full browser would simply be gone at
   * the next load, and the only thing the reader would have to go on is a code that is
   * no longer there. */
  const h = loadAuthenticator();
  h.initAuthenticator();
  const refusal = new Error('quota');
  refusal.name = 'QuotaExceededError';
  h.localStorage.setItem = () => { throw refusal; };
  h.$('auth-issuer').value = 'Example';
  h.$('auth-secret').value = SAMPLE_SECRET;
  await h.authSaveDraft();
  const reported = h.writeReports.at(-1);
  assert.ok(reported, 'the account store wrote without going through the guarded writer');
  assert.equal(reported.what, 'your authenticator accounts');
  assert.equal(reported.result.ok, false);
  assert.equal(reported.result.reason, 'this browser has no room left for this site');
});

test('removing an account deletes its secret from storage and says so', async () => {
  const h = loadAuthenticator();
  h.initAuthenticator();
  h.$('auth-issuer').value = 'Example';
  h.$('auth-secret').value = SAMPLE_SECRET;
  await h.authSaveDraft();
  const { id } = h.authEntries[0];
  assert.equal(h.authRemoveEntries([id]), 1);
  assert.equal(h.authEntries.length, 0);
  assert.ok(!h.store.get('ding-pbx-pages-authenticator-v1').includes(SAMPLE_SECRET), 'the secret is still in storage after removal');
  assert.match(h.history.at(-1).summary, /nothing here can give it back/);
});

/* ------------------------------------------------------------------ *
 * The secrets export: the one route that writes a usable secret.
 * ------------------------------------------------------------------ */

test('the secrets export is refused until two independent keys and a full-travel slider all agree', async () => {
  const h = loadAuthenticator();
  h.initAuthenticator();
  h.$('auth-issuer').value = 'Example';
  h.$('auth-secret').value = SAMPLE_SECRET;
  await h.authSaveDraft();

  h.$('auth-export-secrets').dispatch('click');
  assert.equal(h.$('auth-secrets-dialog').modalOpens, 1);
  assert.match(h.$('auth-secrets-count').textContent, /1 account would be written/);
  assert.equal(h.$('auth-secrets-slider').disabled, true, 'the slider was live before either key was turned');

  h.$('auth-secrets-key-1').checked = true;
  h.$('auth-secrets-key-1').dispatch('change');
  assert.equal(h.$('auth-secrets-slider').disabled, true, 'one key was enough to arm the slider');

  h.$('auth-secrets-key-2').checked = true;
  h.$('auth-secrets-key-2').dispatch('change');
  assert.equal(h.$('auth-secrets-slider').disabled, false);

  h.$('auth-secrets-slider').value = '99';
  h.$('auth-secrets-slider').dispatch('input');
  assert.equal(h.downloads.length, 0, 'a partial slide authorized the export');

  h.$('auth-secrets-slider').value = '100';
  h.$('auth-secrets-slider').dispatch('input');
  assert.equal(h.downloads.length, 1);
  assert.ok(h.downloads[0].text.includes(SAMPLE_SECRET), 'the secrets export wrote no secret, so it is not the export it claims to be');
  assert.match(h.downloads[0].text, /usable authenticator secret in the clear/);
  assert.match(h.history.at(-1).summary, /This entry names the count and no secret/);
  assert.ok(!JSON.stringify(h.history).includes(SAMPLE_SECRET), 'the secrets export recorded a secret in local history');
});

test('a slide with a key turned back off writes nothing', async () => {
  const h = loadAuthenticator();
  h.initAuthenticator();
  h.$('auth-issuer').value = 'Example';
  h.$('auth-secret').value = SAMPLE_SECRET;
  await h.authSaveDraft();
  h.$('auth-secrets-key-1').checked = true;
  h.$('auth-secrets-key-2').checked = true;
  h.$('auth-secrets-key-2').dispatch('change');
  h.$('auth-secrets-key-1').checked = false;
  h.$('auth-secrets-slider').value = '100';
  h.$('auth-secrets-slider').dispatch('input');
  assert.equal(h.downloads.length, 0, 'the slider authorized an export after a key was turned back off');
});

/* ------------------------------------------------------------------ *
 * Saving is gated on a code this page really computed.
 * ------------------------------------------------------------------ */

test('a draft with no name, a bad secret, or a duplicate secret is refused with the reason', async () => {
  const h = loadAuthenticator();
  assert.match(h.authDraftProblem({ issuer: '', account: '', secret: SAMPLE_SECRET, algorithm: 'SHA-1', digits: 6, period: 30 }), /service name, a user name, or both/);
  assert.match(h.authDraftProblem({ issuer: 'A', secret: '0000', algorithm: 'SHA-1', digits: 6, period: 30 }), /not base32/);
  assert.match(h.authDraftProblem({ issuer: 'A', secret: SAMPLE_SECRET, algorithm: 'SHA-3', digits: 6, period: 30 }), /SHA-1, SHA-256 and SHA-512/);
  assert.equal(h.authDraftProblem({ issuer: 'A', account: '', secret: SAMPLE_SECRET, algorithm: 'SHA-1', digits: 6, period: 30 }), undefined);

  h.initAuthenticator();
  h.$('auth-issuer').value = 'Example';
  h.$('auth-secret').value = SAMPLE_SECRET;
  await h.authSaveDraft();
  assert.match(h.authDraftProblem({ issuer: 'Other', secret: SAMPLE_SECRET, algorithm: 'SHA-1', digits: 6, period: 30 }),
    /already keeps an account with that exact secret/);
});

test('a secret this page cannot compute a code from is never stored', async () => {
  const h = loadAuthenticator();
  const verdict = await h.authPrepareDraft({ issuer: 'A', account: 'b', secret: 'JBSWY3D!', algorithm: 'SHA-1', digits: 6, period: 30 }, '', 1_000);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /not base32/);
});

test('a browser that refuses the key is a refusal to save, not an exception nobody catches', async () => {
  /* The reachable half of "never store what we could not compute" is the malformed
   * secret above, which the draft check already refuses. This is the other half: a
   * secret that parses and a browser whose crypto declines it anyway. Without the
   * refusal here the rejection escapes as an unhandled error from a click handler, and
   * the dialog simply stops responding with nothing on screen to say why. */
  const refusing = { subtle: { importKey: async () => { throw new Error('the key was refused'); } } };
  const h = loadAuthenticator({ crypto: refusing });
  const verdict = await h.authPrepareDraft({ issuer: 'A', account: 'b', secret: SAMPLE_SECRET, algorithm: 'SHA-1', digits: 6, period: 30 }, '', 1_000);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /could not compute a code from that secret/);
  assert.match(verdict.reason, /the key was refused/);
});

test('the optional cross-check must match when supplied, and says what skipping leaves undone', async () => {
  const h = loadAuthenticator();
  const draft = { issuer: 'A', account: 'b', secret: SAMPLE_SECRET, algorithm: 'SHA-1', digits: 6, period: 30 };
  const at = 1_700_000_000_000;

  const skipped = await h.authPrepareDraft(draft, '', at);
  assert.equal(skipped.ok, true);
  assert.equal(skipped.crossChecked, false);
  assert.match(skipped.note, /without a cross-check/);

  const right = await h.authGenerateCode(draft, at);
  const matched = await h.authPrepareDraft(draft, right, at);
  assert.equal(matched.ok, true);
  assert.equal(matched.crossChecked, true);

  const wrong = String((Number(right) + 1) % 1_000_000).padStart(6, '0');
  const refused = await h.authPrepareDraft(draft, wrong, at);
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /does not match/);
  assert.match(refused.reason, /Check the secret rather than the code/);

  const short = await h.authPrepareDraft(draft, '123', at);
  assert.equal(short.ok, false);
  assert.match(short.reason, /3 digits rather than 6/);
});

test('the save control is disabled while the draft is refused, and the reason is on screen', () => {
  const h = loadAuthenticator();
  h.initAuthenticator();
  h.authResetDraft();
  assert.equal(h.$('auth-save').disabled, true, 'an empty draft left the save control live');
  h.$('auth-secret').value = SAMPLE_SECRET;
  h.$('auth-secret').dispatch('input');
  assert.match(h.$('auth-draft-status').textContent, /service name, a user name, or both/);
  h.$('auth-issuer').value = 'Example';
  h.$('auth-issuer').dispatch('input');
  assert.equal(h.$('auth-save').disabled, false);
  assert.match(h.$('auth-draft-status').textContent, /Ready to save Example — SHA-1 · 6 digits · 30s/);
});

/* ------------------------------------------------------------------ *
 * Reading a link, and reading a QR the browser decoded.
 * ------------------------------------------------------------------ */

test('a pasted link fills the draft and leaves the secret hidden', () => {
  const h = loadAuthenticator();
  h.initAuthenticator();
  h.$('auth-uri').value = `otpauth://totp/Example:me?secret=${SAMPLE_SECRET}&algorithm=SHA256&digits=8&period=45`;
  h.$('auth-uri-apply').dispatch('click');
  assert.equal(h.$('auth-issuer').value, 'Example');
  assert.equal(h.$('auth-account').value, 'me');
  assert.equal(h.$('auth-secret').value, SAMPLE_SECRET);
  assert.equal(h.$('auth-algorithm').value, 'SHA-256');
  assert.equal(h.$('auth-digits').value, '8');
  assert.equal(h.$('auth-period').value, '45');
  assert.equal(h.$('auth-secret').type, 'password', 'the secret was revealed by a route the reader did not ask for');
  assert.match(h.$('auth-read-status').textContent, /stays hidden until you ask to see it/);
});

test('a link that cannot be read reports why and changes nothing', () => {
  const h = loadAuthenticator();
  h.initAuthenticator();
  h.authResetDraft();
  h.$('auth-uri').value = 'https://example.com/not-a-pairing-link';
  h.$('auth-uri-apply').dispatch('click');
  assert.match(h.$('auth-read-status').textContent, /otpauth scheme/);
  assert.equal(h.$('auth-secret').value, '');
});

test('the secret is revealed only by the control that exists to reveal it', () => {
  const h = loadAuthenticator();
  h.initAuthenticator();
  h.authResetDraft();
  assert.equal(h.$('auth-secret').type, 'password');
  h.$('auth-secret-reveal').dispatch('click');
  assert.equal(h.$('auth-secret').type, 'text');
  assert.equal(h.$('auth-secret-reveal').textContent, 'Hide the secret');
  h.$('auth-secret-reveal').dispatch('click');
  assert.equal(h.$('auth-secret').type, 'password');
});

test('a QR the browser decodes is read, and one that is not a pairing link is refused by name', async () => {
  const good = class { async detect() { return [{ rawValue: `otpauth://totp/Example:me?secret=${SAMPLE_SECRET}` }]; } };
  assert.equal((await loadAuthenticator({ detector: good }).authDetectPairingUri({})).secret, SAMPLE_SECRET);

  const wrong = class { async detect() { return [{ rawValue: 'https://example.com/hello' }]; } };
  await assert.rejects(() => loadAuthenticator({ detector: wrong }).authDetectPairingUri({}), /not an authenticator link/);

  const empty = class { async detect() { return []; } };
  await assert.rejects(() => loadAuthenticator({ detector: empty }).authDetectPairingUri({}), /No QR code was found/);

  await assert.rejects(() => loadAuthenticator({ detector: null }).authDetectPairingUri({}), /reports no barcode detector/);
});

test('with no detector the reading routes are removed and the reason is stated, not left as a dead button', () => {
  const h = loadAuthenticator({ detector: null });
  h.initAuthenticator();
  assert.equal(h.authDetectorAvailable(), false);
  assert.equal(h.$('auth-qr-file-row').hidden, true);
  assert.equal(h.$('auth-qr-clipboard').hidden, true);
  assert.equal(h.$('auth-qr-camera').hidden, true);
  assert.match(h.$('authenticator-capability').textContent, /reports no barcode detector/);
  assert.match(h.$('authenticator-capability').textContent, /a typed secret and a scanned one are the same secret/);
});

test('a clipboard or camera without a detector is not a reading route, and is not offered as one', () => {
  /* Both routes end in the same decode. A browser with a clipboard API and no detector
   * can hand over a picture and get no further, so offering the control there is
   * offering a read that cannot finish. */
  const h = loadAuthenticator({ detector: null, clipboard: true, camera: true });
  h.initAuthenticator();
  assert.equal(h.authClipboardAvailable(), false);
  assert.equal(h.authCameraAvailable(), false);
  assert.equal(h.$('auth-qr-clipboard').hidden, true);
  assert.equal(h.$('auth-qr-camera').hidden, true);
});

test('with a detector but no camera, the camera route is removed and named as absent', () => {
  const detector = class { async detect() { return []; } };
  const h = loadAuthenticator({ detector, clipboard: true, camera: false });
  h.initAuthenticator();
  assert.equal(h.$('auth-qr-file-row').hidden, false);
  assert.equal(h.$('auth-qr-clipboard').hidden, false);
  assert.equal(h.$('auth-qr-camera').hidden, true);
  assert.match(h.$('authenticator-capability').textContent, /an image file, the clipboard/);
  assert.match(h.$('authenticator-capability').textContent, /no access to the camera/);
  assert.match(h.$('authenticator-capability').textContent, /never uploaded/);
});

test('this page generates no QR of its own, and says why rather than leaving the gap silent', () => {
  /* Pairing OUT needs a factor of this page's own, and there is none. A QR drawn here
   * would pair a phone to something nobody can use, so its absence is a decision. */
  assert.ok(!AUTH_SOURCE.includes('canvas'), 'the authenticator now draws something');
  assert.match(AUTH_SOURCE, /pairing OUT/, 'the direction boundary is no longer stated in the source');
  const article = readFileSync(resolve(siteRoot, '..', 'docs', 'platform', 'built-in-authenticator.md'), 'utf8');
  /* Both labels, exactly. The distinction is the whole reason the article exists, and a
   * loose match on the phrase is satisfied by a passing mention anywhere in the file --
   * which is what happened the first time this was written. */
  assert.match(article, /- \*\*Pairing out\.\*\*/, 'the article no longer names the pairing-out direction as one of the two');
  assert.match(article, /- \*\*Pairing in\.\*\*/, 'the article no longer names the pairing-in direction as one of the two');
});

/* ------------------------------------------------------------------ *
 * The list: codes, countdowns, and a reading that is never invented.
 * ------------------------------------------------------------------ */

test('the list renders a row per account and a real code beside each one', async () => {
  const h = loadAuthenticator({ now: 1_700_000_000_000 });
  h.initAuthenticator();
  h.$('auth-issuer').value = 'Example';
  h.$('auth-account').value = 'me';
  h.$('auth-secret').value = SAMPLE_SECRET;
  await h.authSaveDraft();
  await h.authTick();

  const list = h.$('authenticator-list');
  assert.equal(list.rows.length, 1);
  const expected = await h.authGenerateCode(h.authEntries[0], 1_700_000_000_000);
  assert.equal(list.rows[0].code.textContent, h.authGroupCode(expected));
  assert.match(list.rows[0].meta.textContent, /SHA-1 · 6 digits · 30s · \d+s left · next \d\d\d \d\d\d/);
  assert.match(list.innerHTML, /data-auth-copy=/);
  assert.match(list.innerHTML, /Move up/);
  assert.match(list.innerHTML, /Remove/);
});

test('the countdown moves and the next code becomes the current one at the boundary', async () => {
  const h = loadAuthenticator({ now: 1_700_000_010_000 });
  h.initAuthenticator();
  h.$('auth-issuer').value = 'Example';
  h.$('auth-secret').value = SAMPLE_SECRET;
  await h.authSaveDraft();
  await h.authTick();
  const list = h.$('authenticator-list');
  const firstCode = list.rows[0].code.textContent;
  const firstMeta = list.rows[0].meta.textContent;

  h.clock.value = 1_700_000_011_000;
  await h.authTick();
  assert.equal(list.rows[0].code.textContent, firstCode, 'the code changed inside its own step');
  assert.notEqual(list.rows[0].meta.textContent, firstMeta, 'the countdown did not move a second later');

  const nextShown = /next (\d\d\d \d\d\d)/.exec(firstMeta)[1];
  h.clock.value = 1_700_000_040_000;
  await h.authTick();
  assert.equal(list.rows[0].code.textContent, nextShown,
    'the code the row promised as next is not the one that arrived, so the peek is decoration');
});

test('a code change is announced once, and the ticking countdown is never announced', async () => {
  const h = loadAuthenticator({ now: 1_700_000_010_000 });
  h.initAuthenticator();
  h.$('auth-issuer').value = 'Example';
  h.$('auth-secret').value = SAMPLE_SECRET;
  await h.authSaveDraft();
  await h.authTick();
  const region = h.$('authenticator-announcer');
  assert.match(region.textContent, /New code for Example/);

  region.textContent = '';
  h.clock.value = 1_700_000_011_000;
  await h.authTick();
  assert.equal(region.textContent, '', 'the announcer spoke again for a second in which no code changed');

  h.clock.value = 1_700_000_040_000;
  await h.authTick();
  assert.match(region.textContent, /New code for Example/);
});

test('a stored record that cannot produce a code is dropped and counted, never shown as an account', () => {
  const h = loadAuthenticator({
    stored: [
      { id: 'good', issuer: 'Fine', account: 'a', secret: SAMPLE_SECRET, algorithm: 'SHA-1', digits: 6, period: 30 },
      { id: 'bad', issuer: 'Broken', account: 'b', secret: '!!!!', algorithm: 'SHA-1', digits: 6, period: 30 },
      { id: 'worse', issuer: 'Broken', account: 'c', secret: SAMPLE_SECRET, algorithm: 'SHA-3', digits: 6, period: 30 },
    ],
  });
  assert.equal(h.authEntries.length, 1);
  assert.equal(h.authEntries[0].id, 'good');
  assert.match(h.authStatusLine(), /2 stored records were unreadable and left out/);
});

test('the empty state says what to do rather than leaving a blank panel', () => {
  const h = loadAuthenticator();
  h.initAuthenticator();
  assert.match(h.$('authenticator-list').innerHTML, /No accounts yet/);
  assert.match(h.$('authenticator-list').innerHTML, /link, a QR code, or the secret/);
  assert.match(h.$('authenticator-status').textContent, /No accounts are kept in this browser yet/);
});

test('reordering moves an account and is written straight back to storage', async () => {
  const h = loadAuthenticator();
  h.initAuthenticator();
  for (const [issuer, secret] of [['First', SAMPLE_SECRET], ['Second', OTHER_SECRET]]) {
    h.$('auth-issuer').value = issuer;
    h.$('auth-secret').value = secret;
    // eslint-disable-next-line no-await-in-loop
    await h.authSaveDraft();
  }
  assert.deepEqual(h.authEntries.map((e) => e.issuer), ['First', 'Second']);
  assert.equal(h.authMoveEntry(h.authEntries[1].id, 'up'), true);
  assert.deepEqual(h.authEntries.map((e) => e.issuer), ['Second', 'First']);
  assert.equal(h.authMoveEntry(h.authEntries[0].id, 'up'), false, 'the first account moved above itself');
  assert.deepEqual(JSON.parse(h.store.get('ding-pbx-pages-authenticator-v1')).map((e) => e.issuer), ['Second', 'First']);
});

/* ------------------------------------------------------------------ *
 * Search, selection and bulk removal.
 * ------------------------------------------------------------------ */

test('the list filters on what is on screen, and the search carries its own anchored builder', async () => {
  const h = loadAuthenticator();
  h.initAuthenticator();
  for (const [issuer, account, secret] of [['GitHub', 'me', SAMPLE_SECRET], ['Bank', 'you', OTHER_SECRET]]) {
    h.$('auth-issuer').value = issuer;
    h.$('auth-account').value = account;
    h.$('auth-secret').value = secret;
    // eslint-disable-next-line no-await-in-loop
    await h.authSaveDraft();
  }
  assert.equal(h.authMatchingEntries('').length, 2);
  assert.equal(h.authMatchingEntries('bank').length, 1);
  assert.equal(h.authMatchingEntries('nothing here').length, 0);

  assert.match(settings, /data-regex-for="authenticator-search"/, 'the account search has no anchored regular-expression builder beside it');
  assert.match(settings, /id="authenticator-search-mode-status"/, 'the account search never says whether it is in plain or regular-expression mode');
});

test('bulk removal previews the count, names what cannot be undone, and only then removes', async () => {
  const h = loadAuthenticator();
  h.initAuthenticator();
  for (const [issuer, secret] of [['One', SAMPLE_SECRET], ['Two', OTHER_SECRET]]) {
    h.$('auth-issuer').value = issuer;
    h.$('auth-secret').value = secret;
    // eslint-disable-next-line no-await-in-loop
    await h.authSaveDraft();
  }
  h.$('auth-select-page').dispatch('click');
  assert.equal(h.authSelection.selected.size, 2);
  assert.match(h.$('auth-selection-status').textContent, /Selected 2 on this page/);

  h.$('auth-remove-selected').dispatch('click');
  assert.equal(h.$('auth-confirm').hidden, false);
  assert.match(h.$('auth-confirm-text').textContent, /Remove: 2 of 2 selected will change/);
  assert.match(h.$('auth-confirm-text').textContent, /This cannot be undone/);
  assert.match(h.$('auth-confirm-text').textContent, /nothing here can give it back/);
  assert.equal(h.authEntries.length, 2, 'the accounts were removed before the confirmation was answered');

  h.$('auth-confirm-yes').dispatch('click');
  assert.equal(h.authEntries.length, 0);
  assert.equal(h.$('auth-confirm').hidden, true);
});

test('cancelling the removal confirmation removes nothing', async () => {
  const h = loadAuthenticator();
  h.initAuthenticator();
  h.$('auth-issuer').value = 'One';
  h.$('auth-secret').value = SAMPLE_SECRET;
  await h.authSaveDraft();
  h.$('auth-select-page').dispatch('click');
  h.$('auth-remove-selected').dispatch('click');
  h.$('auth-confirm-cancel').dispatch('click');
  assert.equal(h.$('auth-confirm').hidden, true);
  assert.equal(h.authEntries.length, 1);
});

/* ------------------------------------------------------------------ *
 * Wiring. A feature reached from nowhere is dead code that tests green.
 * ------------------------------------------------------------------ */

test('init() reaches initAuthenticator on a statement boundary, not behind a comment', () => {
  assert.match(app, /^\s*function init\(\)\{[\s\S]*?initMomentum\(\);initAuthenticator\(\);/mu,
    'init() no longer calls initAuthenticator -- or the call has been commented out, which a bare substring needle would not notice');
});

test('initAuthenticator returns early on a page with no authenticator card, and starts nothing', () => {
  const h = loadAuthenticator({ card: false });
  h.initAuthenticator();
  assert.equal(h.intervals.length, 0, 'a page with no authenticator card still started the one-second tick');
});

test('the ticking is a one-second interval started once', () => {
  const h = loadAuthenticator();
  h.initAuthenticator();
  assert.equal(h.intervals.length, 1);
  assert.equal(h.intervals[0].ms, 1000);
});

test('the Add control opens the dialog, and the Save control is what stores the account', async () => {
  /* Calling the functions is not the same as being able to reach them. Both of these
   * were wired and neither was clicked, which is exactly the shape that ships a dialog
   * nothing opens and a button that stores nothing while every unit assertion passes. */
  const h = loadAuthenticator();
  h.initAuthenticator();
  h.$('authenticator-add').dispatch('click');
  assert.equal(h.$('authenticator-dialog').modalOpens, 1, 'the Add control did not open the dialog');
  assert.equal(h.$('auth-secret').type, 'password', 'opening the dialog left a previous secret on screen');

  h.$('auth-issuer').value = 'Example';
  h.$('auth-secret').value = SAMPLE_SECRET;
  h.$('auth-save').dispatch('click');
  /* The handler is async because computing a code is. A single tick is not a fixed
   * number of awaits away from the answer -- it depends on how many microtasks Web
   * Crypto happens to take -- so this waits for the outcome with a bound rather than
   * guessing at a delay, which is the difference between a test and a coin toss. */
  for (let attempt = 0; attempt < 200 && h.authEntries.length === 0; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((done) => { setTimeout(done, 1); });
  }
  assert.equal(h.authEntries.length, 1, 'clicking Save stored nothing');
});

test('typing in the account search re-renders the list rather than only filtering in principle', async () => {
  const h = loadAuthenticator();
  h.initAuthenticator();
  for (const [issuer, secret] of [['GitHub', SAMPLE_SECRET], ['Bank', OTHER_SECRET]]) {
    h.$('auth-issuer').value = issuer;
    h.$('auth-secret').value = secret;
    // eslint-disable-next-line no-await-in-loop
    await h.authSaveDraft();
  }
  assert.equal(h.$('authenticator-list').rows.length, 2);
  h.$('authenticator-search').dispatch('input', { target: { value: 'bank' } });
  assert.equal(h.$('authenticator-list').rows.length, 1, 'typing in the search changed nothing on screen');
});

test('the card carries every control the feature needs, and both dialogs exist', () => {
  for (const id of IDS) {
    assert.match(settings, new RegExp(`id="${id}"`), `#${id} is missing from settings.html`);
  }
  assert.match(settings, /data-copy="authenticatorDesc"/, 'the card description is not wired to the funny-level copy');
  assert.match(settings, /data-search="[^"]*authenticator[^"]*"/, 'the card carries no settings-search terms');
});

/* ------------------------------------------------------------------ *
 * Accessibility, and the rules a countdown makes easy to break.
 * ------------------------------------------------------------------ */

test('the announcer is a polite live region that is hidden from sight, and the list is not one', () => {
  assert.match(settings, /<p id="authenticator-announcer" class="sr-only" role="status" aria-live="polite">/,
    'the code-change announcer is no longer an off-screen polite live region');
  const list = /<div id="authenticator-list"([^>]*)>/.exec(settings);
  assert.ok(list, 'the account list is missing');
  assert.ok(!list[1].includes('aria-live'), 'the list itself is a live region, so a countdown would be spoken every second');
});

test('every control the reader operates has a name, and the code is not colour-only', () => {
  assert.match(settings, /<label class="sr-only" for="authenticator-search">/);
  assert.match(settings, /aria-label="Authenticator export format"/);
  assert.match(settings, /aria-label="Confirm removal"/);
  assert.ok(AUTH_SOURCE.includes('aria-label="Select ${escapeHtml(authEntryTitle(entry))}"'),
    'a row checkbox has no accessible name of its own, so a screen reader reads a column of unlabelled boxes');
  assert.match(styles, /\.auth-code\{[^}]*font-family:var\(--font-mono\)/,
    'the code is no longer monospaced, so grouped digits shift width as they change');
});

test('the row survives a narrow layout rather than pushing its actions off the edge', () => {
  assert.match(styles, /@media\(max-width:620px\)\{\.auth-entry\{flex-wrap:wrap\}/,
    'the account row no longer wraps on a narrow screen');
});

/* ------------------------------------------------------------------ *
 * The neighbouring surfaces that had to move.
 * ------------------------------------------------------------------ */

test('the settings reset says plainly that it leaves the accounts alone', () => {
  assert.match(settings, /It also leaves your authenticator accounts alone/,
    'the reset gate no longer names the authenticator among the things it deliberately does not clear');
  assert.match(settings, /losing your data rather than resetting a preference/);
});

test('Export everything states that it does not write the accounts, rather than leaving the absence silent', () => {
  assert.match(settings, /id="export-everything-excluded"/);
  assert.match(settings, /Authenticator accounts are not written here/);
});

/* ------------------------------------------------------------------ *
 * The registries.
 * ------------------------------------------------------------------ */

test('the site feature registry records the feature as implemented, and names its files', () => {
  const row = registry.features['built-in-authenticator'];
  assert.ok(row, 'no built-in-authenticator row in site/feature-registry.json');
  assert.equal(row.state, 'implemented');
  assert.deepEqual([...row.files].sort(), ['site/app.js', 'site/settings.html', 'site/styles.css']);
  assert.match(row.note, /BarcodeDetector/);
  assert.match(row.note, /RFC 6238/);
});

test('the localization registry records the copy as translated and names the key', () => {
  const row = locales.features['built-in-authenticator'];
  assert.ok(row, 'no built-in-authenticator row in site/locales/feature-registry.json');
  assert.equal(row.state, 'localized');
  assert.deepEqual(row.copyKeys, ['authenticatorDesc']);
  assert.deepEqual(row.missingCopyKeys, []);
  assert.ok(locales.knownCopyKeys.includes('authenticatorDesc'), 'authenticatorDesc is missing from the known copy-key list');
});

test('the card description the markup ships is exactly the plainest funny-level variant', () => {
  /* Otherwise the page renders one sentence before any script runs and a different one
   * after, which reads as a flicker and hides which of the two is the real copy. */
  const shipped = /<p id="authenticator-desc" data-copy="authenticatorDesc">([\s\S]*?)<\/p>/.exec(settings);
  assert.ok(shipped, 'the card description is missing');
  const plain = /authenticatorDesc:\{en:\[\n\s*'([^']+)'/.exec(app);
  assert.ok(plain, 'the English funny-level variants for authenticatorDesc were not found');
  const decoded = shipped[1].replaceAll('&rsquo;', '’').replaceAll('&hellip;', '…').replaceAll('&amp;', '&');
  assert.equal(decoded, plain[1]);
});

test('every funny-level variant keeps the three facts that make the feature what it is', () => {
  const block = /authenticatorDesc:\{en:\[([\s\S]*?)\],zh:\[([\s\S]*?)\]\}/.exec(app);
  assert.ok(block, 'the authenticatorDesc copy block was not found');
  const en = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const zh = [...block[2].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.equal(en.length, 4);
  assert.equal(zh.length, 4);
  for (const variant of en) {
    assert.match(variant, /stay in this browser and nothing is sent anywhere/, `an English variant stopped saying where the secrets stay: ${variant.slice(0, 60)}`);
    assert.match(variant, /computed|worked out/, 'an English variant stopped saying the code is computed on this page');
    assert.match(variant, /storage/, 'an English variant stopped saying clearing this site’s storage deletes them');
  }
  for (const variant of zh) {
    assert.match(variant, /唔會送去任何地方/, 'a Cantonese variant stopped saying nothing is sent anywhere');
    assert.match(variant, /計出嚟/, 'a Cantonese variant stopped saying the code is computed here');
    assert.match(variant, /儲存空間/, 'a Cantonese variant stopped saying clearing this site’s storage deletes them');
  }
});
