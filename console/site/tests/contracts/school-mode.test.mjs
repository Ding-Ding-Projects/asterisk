/**
 * Contract: School mode on the pages-site.
 *
 * This file used to pin an absence -- there was no such mode here, and it re-derived
 * that from the real sources every run so a claim of "implemented" could not be made
 * without somebody having to explain themselves first. The mode now exists, so the
 * absence assertions are gone and what replaces them is the set of properties that
 * make it the canonical feature rather than a checkbox with a name.
 *
 * Most of the file is about four things, because those are the ones that are easy to
 * ship broken with nothing complaining:
 *
 *   - the capabilities it covers are REMOVED from the document, not disabled and not
 *     hidden, and every one of them comes back untouched. A hidden control is still a
 *     control; a destroyed one is a setting somebody has lost;
 *   - the value that turns it off is never stored. What is on disk is a random salt
 *     and a digest, and the stored bytes are searched for the value itself so a
 *     regression to storing it cannot pass;
 *   - live copy always renders the chosen name, and persisted text -- history entries,
 *     stored notifications -- never names the mode at all. That second half is the
 *     subtle one: history here is append-only, so an entry written before a rename
 *     would sit in the record naming the previous name, which for the first rename is
 *     exactly the shipped name this mode exists to stop showing;
 *   - neither "Reset settings" nor restoring a local-history revision opens it, because
 *     either would be a one-click way around the lock rather than a reset.
 *
 * The behavioural half runs the real extracted source over a recording DOM, a fake
 * storage and Node's own Web Crypto, in the style narration.test.mjs established here.
 * That matters especially for this feature: "the record says on" is true of a mode that
 * suppresses nothing, and a source-pattern test cannot tell the two apart.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoConsole = resolve(siteRoot, '..');
/* CRLF stripped before anything is matched across lines. A newline-only pattern against
 * a CRLF checkout matches nothing, and an assertion that matches nothing passes in the
 * one direction nobody notices. */
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

/* Derived from the filesystem, not hand-copied: the six-name literal that used to sit
 * here excluded converter.html, ollama.html and history.html, so every 'anywhere in
 * the site' claim below searched two thirds of the site. See ./site-pages.mjs. */
import { PAGE_NAMES } from './site-pages.mjs';
const PAGES = PAGE_NAMES;
const pageSource = Object.fromEntries(PAGES.map((name) => [name, read(`${name}.html`)]));
const app = read('app.js');
const css = read('styles.css');
const settings = pageSource.settings;
const registry = json('feature-registry.json');
const locales = json('locales/feature-registry.json');

/** The shipped name, and the one a rename has to stop showing. */
const SHIPPED = 'School mode';
/** Every control the card ships. This pin moves by hand. */
const CONTROL_IDS = ['school-name', 'school-secret', 'school-secret-confirm', 'school-arm', 'school-unlock', 'school-unlock-submit'];
/** Every container the mode removes while it is on. This pin moves by hand too. */
const SUPPRESSED_SELECTORS = [
  '#settings-language-card',
  '#settings-vocabulary-card',
  '#narration-language-controls',
  '#narration-cantonese-controls',
];

/* ------------------------------------------------------------------ *
 * Reading the real source.
 * ------------------------------------------------------------------ */

const SCHOOL_FROM = "const SCHOOL_KEY='ding-pbx-pages-school-v1';";
const SCHOOL_TO = 'const DEFAULT_FAVICON=';

/** The whole contiguous restricted-presentation block, comments and all. */
function schoolBlock() {
  const start = app.indexOf(SCHOOL_FROM);
  assert.notEqual(start, -1, `${SCHOOL_FROM} is no longer declared in site/app.js`);
  const end = app.indexOf(SCHOOL_TO, start);
  assert.notEqual(end, -1, `${SCHOOL_TO} no longer follows the restricted-presentation block in site/app.js`);
  return app.slice(start, end);
}

/** One brace-balanced function declaration, by name. */
function functionSource(src, name) {
  let start = src.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `function ${name} is not declared in site/app.js`);
  /* Keep an `async` prefix. Dropping it produces a body that still awaits, which fails
   * to parse -- and reads as a defect in the source rather than in the reader. */
  if (src.slice(start - 6, start) === 'async ') start -= 6;
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

/** Every declaration the block must still contain, so a shrunken slice fails loudly. */
const BLOCK_DECLARATIONS = [
  'const SCHOOL_SHIPPED_NAME=', 'const SCHOOL_SECRET_MIN=', 'const SCHOOL_SUPPRESSED=',
  'const SCHOOL_ABSENT_HERE=', 'const SCHOOL_ARM_REASON=', 'const schoolRetained=',
  'function loadSchool(', 'function schoolActive(', 'function schoolName(',
  'function effectiveLanguage(', 'function schoolDigestOf(', 'function schoolUnlockVerdict(',
  'function schoolArmVerdict(', 'function schoolSuppress(', 'function schoolRestore(',
  'function el(', 'function renderSchoolCard(', 'function applySchoolMode(',
  'function schoolExportSummary(', 'function armSchoolMode(', 'function unlockSchoolMode(',
  'function initSchool(', 'function initSchoolWatch(',
];

test('the extracted block is the real thing and is not silently short, or every behavioural test below is about nothing', () => {
  const block = schoolBlock();
  assert.ok(block.length > 6000, `the extracted block measured only ${block.length} characters -- too small to be the real feature`);
  for (const declaration of BLOCK_DECLARATIONS) {
    assert.ok(block.includes(declaration), `the extracted block no longer contains ${declaration}`);
  }
});

/* ------------------------------------------------------------------ *
 * A recording DOM.
 * ------------------------------------------------------------------ */

class FakeComment {
  /* The data is kept, not dropped. A fake that ignored it could not tell an empty
   * placeholder from one carrying the name this mode must not leave in the document,
   * and the assertion about it would pass whatever the source did. */
  constructor(data) { this.nodeType = 8; this.parentNode = null; this.data = String(data ?? ''); }
}

class FakeElement {
  constructor(tag, id) {
    this.tag = tag;
    this.id = id || '';
    this.nodeType = 1;
    this.childNodes = [];
    this.parentNode = null;
    this.textContent = '';
    this.value = '';
    this.hidden = false;
    this.dataset = {};
  }

  append(child) { child.parentNode = this; this.childNodes.push(child); return child; }

  replaceChild(next, previous) {
    const at = this.childNodes.indexOf(previous);
    assert.notEqual(at, -1, 'replaceChild was called with a node that is not a child');
    this.childNodes[at] = next;
    next.parentNode = this;
    previous.parentNode = null;
    return previous;
  }

  querySelector(selector) {
    const byAttribute = /^\[id="([^"]+)"\]$/u.exec(selector);
    const byHash = /^#([\w-]+)$/u.exec(selector);
    const id = (byAttribute || byHash || [])[1];
    assert.ok(id, `the fake DOM was asked for an unsupported selector: ${selector}`);
    return descendantById(this, id);
  }
}

function descendantById(root, id) {
  for (const child of root.childNodes) {
    if (child.nodeType !== 1) continue;
    if (child.id === id) return child;
    const found = descendantById(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * A page carrying the card, the four suppressible containers, and nothing else.
 *
 * Built rather than parsed, deliberately: the markup assertions further down check the
 * real settings.html, and a parser here would only be a second, weaker copy of them.
 */
function buildPage() {
  const root = new FakeElement('body', 'root');
  const grid = root.append(new FakeElement('section', 'settings-grid'));

  const languageCard = grid.append(new FakeElement('article', 'settings-language-card'));
  languageCard.append(new FakeElement('select', 'language-mode'));
  languageCard.append(new FakeElement('select', 'english-funny'));
  languageCard.append(new FakeElement('select', 'cantonese-funny'));
  languageCard.append(new FakeElement('p', 'language-preview'));

  const vocabularyCard = grid.append(new FakeElement('article', 'settings-vocabulary-card'));
  vocabularyCard.append(new FakeElement('input', 'vocabulary-file'));
  vocabularyCard.append(new FakeElement('button', 'vocabulary-clear'));

  const narrationCard = grid.append(new FakeElement('article', 'narration-card'));
  const narrationLanguage = narrationCard.append(new FakeElement('div', 'narration-language-controls'));
  narrationLanguage.append(new FakeElement('select', 'narration-language'));
  const narrationCantonese = narrationCard.append(new FakeElement('div', 'narration-cantonese-controls'));
  narrationCantonese.append(new FakeElement('select', 'narration-voice-zh'));
  narrationCard.append(new FakeElement('select', 'narration-voice-en'));

  const card = grid.append(new FakeElement('article', 'school-card'));
  card.dataset.search = 'school mode restricted plain english only lock passphrase';
  const title = card.append(new FakeElement('h2', 'school-title'));
  title.textContent = SHIPPED;
  card.append(new FakeElement('p', 'school-status'));
  card.append(new FakeElement('p', 'school-suppressed'));
  card.append(new FakeElement('p', 'school-recovery-text'));
  const nameControls = card.append(new FakeElement('div', 'school-name-controls'));
  nameControls.append(new FakeElement('input', 'school-name'));
  const armControls = card.append(new FakeElement('div', 'school-arm-controls'));
  armControls.append(new FakeElement('input', 'school-secret'));
  armControls.append(new FakeElement('input', 'school-secret-confirm'));
  armControls.append(new FakeElement('button', 'school-arm'));
  const unlockControls = card.append(new FakeElement('div', 'school-unlock-controls'));
  unlockControls.append(new FakeElement('input', 'school-unlock'));
  unlockControls.append(new FakeElement('button', 'school-unlock-submit'));

  return root;
}

function fakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
  };
}

/** The COPY subset the copy-layer harness runs over: one key, four levels, two languages. */
const COPY_FIXTURE = {
  sample: {
    en: ['Plain English.', 'Mild English.', 'Playful English.', 'Maximum English.'],
    zh: ['廣東話一。', '廣東話二。', '廣東話三。', '廣東話四。'],
  },
};

/**
 * Build a page and run the real restricted presentation over it.
 *
 * Nothing here is a re-implementation: the block is the bytes in site/app.js, evaluated
 * once, and the copy layer beside it is the real `copyText`/`applyVocabularyText`/
 * `copyLevel` wired to this block's own `schoolActive`.
 */
function loadSchool({
  stored = null, language = 'zh', englishFunny = 3, cantoneseFunny = 3,
  vocabulary = null, cryptoApi = globalThis.crypto,  /* pass null, never undefined: undefined re-triggers this default */
} = {}) {
  const root = buildPage();
  const seed = {};
  if (stored) seed['ding-pbx-pages-school-v1'] = JSON.stringify(stored);
  if (vocabulary) seed['ding-pbx-vocabulary-cache'] = JSON.stringify(vocabulary);
  const storage = fakeStorage(seed);

  const bodyClasses = new Set();
  const document = {
    documentElement: { lang: 'zh-Hant' },
    body: { classList: { toggle: (name, on) => { if (on) bodyClasses.add(name); else bodyClasses.delete(name); } } },
    activeElement: null,
    createComment: (data) => new FakeComment(data),
    createElement: (tag) => new FakeElement(tag, ''),
    getElementById: (id) => descendantById(root, id),
    querySelector: (selector) => root.querySelector(selector),
  };
  const $ = (id) => descendantById(root, id);

  const state = { language, englishFunny, cantoneseFunny, attention: { simplifiedLanguage: false } };
  const history = [];
  const notified = [];
  const windowListeners = new Map();
  const applied = { count: 0 };
  /* In-context recovery, recorded rather than rendered: since it landed, this block
   * writes through the one guarded writer and takes its own route down when the mode
   * is armed. The region itself is built and checked in
   * site/tests/contracts/in-context-recovery.test.mjs against its own page. */
  const recoveriesReported = [];
  const recoveriesCleared = [];
  let api = null;

  const block = schoolBlock();
  const exported = [
    'SCHOOL_KEY', 'SCHOOL_SHIPPED_NAME', 'SCHOOL_SECRET_MIN', 'SCHOOL_SECRET_MAX',
    'SCHOOL_SUPPRESSED', 'SCHOOL_ABSENT_HERE', 'SCHOOL_ARM_REASON', 'schoolRetained',
    'loadSchool', 'saveSchool', 'reloadSchool', 'schoolActive', 'schoolName', 'schoolIsRenamed',
    'schoolSearchKeywords', 'effectiveLanguage', 'schoolDigestOf', 'schoolUnlockVerdict',
    'schoolArmVerdict', 'schoolSuppress', 'schoolRestore', 'el', 'renderSchoolCard',
    'applySchoolMode', 'schoolExportSummary', 'setSchoolName', 'commitSchoolName',
    'armSchoolMode', 'unlockSchoolMode', 'initSchool', 'initSchoolWatch',
  ];
  const body = `${block}\nreturn { ${exported.join(', ')}, get record(){ return schoolRecord } };`;

  // eslint-disable-line no-new-func -- deliberately re-running the real extracted source
  api = new Function(
    'document', '$', 'localStorage', 'crypto', 'state', 'applyState', 'recordHistory', 'notify', 'window',
    'writeLocal', 'reportWrite', 'clearRecovery', 'reportSchoolCannotArm', body,
  )(
    document, $, storage, cryptoApi, state,
    () => { applied.count += 1; if (api) api.applySchoolMode(); },
    (action, summary) => history.push({ action, summary }),
    (title, message, narration) => notified.push({ title, message, narration }),
    { addEventListener: (name, listener) => { windowListeners.set(name, listener); } },
    /* Both halves are real here -- the value genuinely reaches the fake storage -- so
     * every assertion below about what is and is not stored still reads the bytes
     * rather than a spy's opinion of them. */
    (key, value) => { storage.setItem(key, String(value)); return { ok: true, reason: '' }; },
    (what, result) => Boolean(result && result.ok),
    (surface, only) => { recoveriesCleared.push({ surface, only }); return true; },
    (detail) => { recoveriesReported.push({ id: 'school-cannot-arm', detail }); return { ok: true, id: 'school-cannot-arm' }; },
  );

  const copyBody = `${functionSource(app, 'copyLevel')}\n${functionSource(app, 'copyText')}\n`
    + `${functionSource(app, 'vocabularyReplacements')}\n${functionSource(app, 'applyVocabularyText')}\n`
    + 'return { copyLevel, copyText, applyVocabularyText };';
  // eslint-disable-line no-new-func -- the real copy layer, wired to this block's schoolActive
  const copy = new Function('COPY', 'state', 'localStorage', 'schoolActive', 'effectiveLanguage', copyBody)(
    COPY_FIXTURE, state, storage, api.schoolActive, api.effectiveLanguage,
  );

  return { ...api, ...copy, root, storage, document, state, history, notified, windowListeners, applied, bodyClasses, recoveriesReported, recoveriesCleared, $ };
}

const suppressibleIds = () => SUPPRESSED_SELECTORS.map((selector) => selector.slice(1));

/* ------------------------------------------------------------------ *
 * Off is off, and off is the shipped state.
 * ------------------------------------------------------------------ */

test('nothing is stored until somebody turns it on, and an untouched browser is unrestricted', () => {
  const h = loadSchool();
  assert.equal(h.schoolActive(), false);
  assert.equal(h.storage.getItem(h.SCHOOL_KEY), null, 'the mode wrote a record without anybody switching it on');
  h.applySchoolMode();
  for (const id of suppressibleIds()) {
    assert.ok(h.$(id), `#${id} was removed from the page while the mode was off`);
  }
});

test('a record that says on but carries no credential is treated as off, not as a page with no way back', () => {
  const h = loadSchool({ stored: { on: true, name: '', secret: null } });
  assert.equal(h.schoolActive(), false,
    'a credential-less "on" record locked the page -- there would be no value that could ever open it');
});

test('a corrupt record falls back to off rather than to a page nobody can open', () => {
  const h = loadSchool();
  h.storage.setItem(h.SCHOOL_KEY, '{not json at all');
  h.reloadSchool();
  assert.equal(h.schoolActive(), false);
  assert.deepEqual(h.record, { on: false, name: '', secret: null });
});

/* ------------------------------------------------------------------ *
 * Turning it on: what is stored, and what is emphatically not.
 * ------------------------------------------------------------------ */

test('arming stores a salt and a digest, and never the value itself', async () => {
  const h = loadSchool();
  h.$('school-secret').value = 'correct-horse';
  h.$('school-secret-confirm').value = 'correct-horse';
  const verdict = await h.armSchoolMode();
  assert.deepEqual(verdict, { arm: true, why: 'ready' });
  assert.equal(h.schoolActive(), true);
  const raw = h.storage.getItem(h.SCHOOL_KEY);
  assert.ok(raw, 'nothing was written');
  assert.ok(!raw.includes('correct-horse'),
    'the value that turns the mode off is sitting in local storage in the clear');
  const record = JSON.parse(raw);
  assert.equal(record.secret.algorithm, 'SHA-256');
  assert.match(record.secret.saltHex, /^[0-9a-f]{32}$/u, 'the salt is not 16 random bytes of hex');
  assert.match(record.secret.digestHex, /^[0-9a-f]{64}$/u, 'the digest is not a SHA-256 hex digest');
});

test('the salt is fresh every time, so two people choosing the same value do not store the same digest', async () => {
  const digests = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const h = loadSchool();
    h.$('school-secret').value = 'same-value';
    h.$('school-secret-confirm').value = 'same-value';
    // eslint-disable-next-line no-await-in-loop -- two sequential arms is the point
    await h.armSchoolMode();
    digests.push(JSON.parse(h.storage.getItem(h.SCHOOL_KEY)).secret.digestHex);
  }
  assert.notEqual(digests[0], digests[1], 'the same value produced the same digest twice -- the salt is not random');
});

test('the typed value is cleared out of the fields the moment the digest exists', async () => {
  const h = loadSchool();
  h.$('school-secret').value = 'correct-horse';
  h.$('school-secret-confirm').value = 'correct-horse';
  await h.armSchoolMode();
  assert.equal(h.$('school-secret').value, '', 'the value is still sitting in the field behind a locked page');
  assert.equal(h.$('school-secret-confirm').value, '');
});

test('every refusal to arm is decided by the pure verdict, and each branch is reachable', () => {
  const h = loadSchool();
  const base = { alreadyOn: false, hasDigest: true, secret: 'abcd', confirm: 'abcd' };
  assert.deepEqual(h.schoolArmVerdict(base), { arm: true, why: 'ready' });
  assert.deepEqual(h.schoolArmVerdict({ ...base, alreadyOn: true }), { arm: false, why: 'already-on' });
  assert.deepEqual(h.schoolArmVerdict({ ...base, hasDigest: false }), { arm: false, why: 'no-digest-available' });
  assert.deepEqual(h.schoolArmVerdict({ ...base, secret: 'abc', confirm: 'abc' }), { arm: false, why: 'too-short' });
  assert.deepEqual(h.schoolArmVerdict({ ...base, secret: 'a'.repeat(129), confirm: 'a'.repeat(129) }), { arm: false, why: 'too-long' });
  assert.deepEqual(h.schoolArmVerdict({ ...base, confirm: 'abce' }), { arm: false, why: 'mismatch' });
  assert.deepEqual(h.schoolArmVerdict(null), { arm: false, why: 'no-digest-available' });
  for (const why of ['already-on', 'no-digest-available', 'too-short', 'too-long', 'mismatch']) {
    assert.ok(h.SCHOOL_ARM_REASON[why], `no sentence exists for the refusal "${why}", so the card would say nothing useful`);
  }
});

test('a mismatched confirmation changes nothing at all, and says so', async () => {
  const h = loadSchool();
  h.$('school-secret').value = 'correct-horse';
  h.$('school-secret-confirm').value = 'correct-hors';
  const verdict = await h.armSchoolMode();
  assert.deepEqual(verdict, { arm: false, why: 'mismatch' });
  assert.equal(h.schoolActive(), false);
  assert.equal(h.storage.getItem(h.SCHOOL_KEY), null, 'a refused arming still wrote a record');
  assert.match(h.$('school-status').textContent, /not the same/u);
});

test('with no cryptographic digest available it refuses to arm rather than storing the value in the clear', async () => {
  const h = loadSchool({ cryptoApi: null });
  h.$('school-secret').value = 'correct-horse';
  h.$('school-secret-confirm').value = 'correct-horse';
  const verdict = await h.armSchoolMode();
  assert.deepEqual(verdict, { arm: false, why: 'no-digest-available' });
  assert.equal(h.storage.getItem(h.SCHOOL_KEY), null);
  h.renderSchoolCard();
  assert.match(h.$('school-status').textContent, /cannot be turned on here/u,
    'the card does not say why it cannot be turned on, so it reads as broken rather than as unavailable');
});

/* ------------------------------------------------------------------ *
 * Turning it off.
 * ------------------------------------------------------------------ */

async function armed(options = {}) {
  const h = loadSchool(options);
  h.$('school-secret').value = 'correct-horse';
  h.$('school-secret-confirm').value = 'correct-horse';
  await h.armSchoolMode();
  assert.equal(h.schoolActive(), true, 'the fixture failed to arm, so the test using it would prove nothing');
  return h;
}

test('the right value turns it off, and takes the credential with it', async () => {
  const h = await armed();
  h.$('school-unlock').value = 'correct-horse';
  const verdict = await h.unlockSchoolMode();
  assert.deepEqual(verdict, { unlock: true, why: 'match' });
  assert.equal(h.schoolActive(), false);
  assert.equal(JSON.parse(h.storage.getItem(h.SCHOOL_KEY)).secret, null,
    'a digest of somebody’s value is still on disk for a lock that no longer exists');
});

test('a wrong value changes nothing, is counted on screen, and is recorded', async () => {
  const h = await armed();
  h.$('school-unlock').value = 'wrong-horse';
  const verdict = await h.unlockSchoolMode();
  assert.deepEqual(verdict, { unlock: false, why: 'wrong-value' });
  assert.equal(h.schoolActive(), true);
  assert.equal(h.$('school-unlock').value, '', 'the wrong value was left in the field');
  assert.match(h.$('school-status').textContent, /Values tried since this page loaded: 1\./u);
  assert.ok(h.history.some((entry) => /does not match/u.test(entry.summary)),
    'a refused attempt left no trace in the local history');
});

test('the unlock verdict is pure, and every branch is reachable', () => {
  const h = loadSchool();
  const stored = { algorithm: 'SHA-256', saltHex: 'ab', digestHex: 'abcdef' };
  assert.deepEqual(h.schoolUnlockVerdict(stored, 'abcdef'), { unlock: true, why: 'match' });
  assert.deepEqual(h.schoolUnlockVerdict(stored, 'abcdee'), { unlock: false, why: 'wrong-value' });
  assert.deepEqual(h.schoolUnlockVerdict(stored, 'abcde'), { unlock: false, why: 'wrong-value' });
  assert.deepEqual(h.schoolUnlockVerdict(stored, ''), { unlock: false, why: 'no-digest' });
  assert.deepEqual(h.schoolUnlockVerdict(stored, null), { unlock: false, why: 'no-digest' });
  assert.deepEqual(h.schoolUnlockVerdict(null, 'abcdef'), { unlock: false, why: 'no-credential' });
  assert.deepEqual(h.schoolUnlockVerdict({ digestHex: '' }, 'abcdef'), { unlock: false, why: 'no-credential' });
});

test('the comparison does not stop at the first difference, so its timing says nothing about how much was right', () => {
  const source = functionSource(app, 'schoolUnlockVerdict');
  assert.match(source, /difference\|=/u, 'the comparison no longer accumulates every character difference');
  assert.doesNotMatch(source, /break;/u, 'the comparison loop now breaks early');
  assert.doesNotMatch(source, /index\s*\)\s*return/u, 'the comparison loop now returns from inside itself');
});

test('unlocking is refused outright when the mode is not on, rather than clearing a record that is not there', async () => {
  const h = loadSchool();
  assert.deepEqual(await h.unlockSchoolMode(), { unlock: false, why: 'not-on' });
});

/* ------------------------------------------------------------------ *
 * Removed, not hidden -- and every one of them comes back.
 * ------------------------------------------------------------------ */

test('while it is on, every covered capability is out of the document entirely', async () => {
  const h = await armed();
  h.applySchoolMode();
  for (const id of suppressibleIds()) {
    assert.equal(h.$(id), null, `#${id} is still in the document while the mode is on -- removed means removed`);
  }
  /* And the controls inside them with it, which is the property a `hidden` attribute
   * would not have: a hidden container still answers getElementById for its children. */
  for (const id of ['language-mode', 'english-funny', 'cantonese-funny', 'vocabulary-file', 'narration-language', 'narration-voice-zh']) {
    assert.equal(h.$(id), null, `#${id} is still reachable in the document while the mode is on`);
  }
});

test('nothing that stays is disturbed -- the card and the untouched controls are exactly where they were', async () => {
  const h = await armed();
  h.applySchoolMode();
  assert.ok(h.$('school-card'), 'the mode removed its own card, so nobody could turn it off');
  assert.ok(h.$('narration-voice-en'), 'the English voice picker was removed, and the mode has no business touching it');
});

test('turning it off puts every removed node back, in its own place, as the same node', async () => {
  /* Captured BEFORE arming, deliberately: arming applies the mode, so by the time an
   * armed fixture is handed back every one of these is already out of the document and
   * this would read the nulls rather than the nodes. */
  const h = loadSchool();
  const before = Object.fromEntries(suppressibleIds().map((id) => [id, h.$(id)]));
  const positions = Object.fromEntries(suppressibleIds().map((id) => {
    const node = h.$(id);
    return [id, node.parentNode.childNodes.indexOf(node)];
  }));
  h.$('school-secret').value = 'correct-horse';
  h.$('school-secret-confirm').value = 'correct-horse';
  await h.armSchoolMode();
  assert.equal(h.$('settings-language-card'), null, 'the fixture did not suppress, so this would prove nothing');
  h.$('school-unlock').value = 'correct-horse';
  await h.unlockSchoolMode();
  for (const id of suppressibleIds()) {
    const node = h.$(id);
    assert.ok(node, `#${id} did not come back`);
    assert.equal(node, before[id], `#${id} came back as a different node -- anything bound to the original is now dead`);
    assert.equal(node.parentNode.childNodes.indexOf(node), positions[id], `#${id} came back in a different position`);
  }
});

test('the placeholder left behind is a bare comment that names nothing', async () => {
  const h = await armed();
  h.applySchoolMode();
  const grid = h.$('settings-grid');
  const comments = grid.childNodes.filter((node) => node.nodeType === 8);
  assert.ok(comments.length > 0, 'no placeholder was left at all, so the restore position could not be exact');
  for (const comment of comments) {
    const text = Object.values(comment).filter((value) => typeof value === 'string').join('');
    assert.equal(text, '',
      'the placeholder carries text -- the name of this mode is exactly what it must not leave in the document');
  }
});

test('el() finds a control whether it is in the document or currently held out of it', async () => {
  const h = await armed();
  h.applySchoolMode();
  assert.equal(h.$('language-mode'), null, 'the fixture did not suppress, so this would prove nothing');
  assert.ok(h.el('language-mode'), 'el() cannot see a held-out control, so every handler bound through it is dead');
  assert.ok(h.el('settings-language-card'), 'el() cannot see a held-out container itself');
  assert.equal(h.el('nothing-of-the-kind'), null);
});

test('applying it twice removes nothing twice, and lifting it twice restores nothing twice', async () => {
  const h = await armed();
  h.applySchoolMode();
  h.applySchoolMode();
  assert.equal(h.schoolRetained.size, SUPPRESSED_SELECTORS.length);
  h.$('school-unlock').value = 'correct-horse';
  await h.unlockSchoolMode();
  h.applySchoolMode();
  assert.equal(h.schoolRetained.size, 0);
  for (const id of suppressibleIds()) assert.ok(h.$(id));
});

test('the settings behind the removed controls are never written, so a choice survives the whole time', async () => {
  const h = await armed({ language: 'zh', englishFunny: 3, cantoneseFunny: 2 });
  h.applySchoolMode();
  assert.equal(h.state.language, 'zh', 'the stored language choice was overwritten rather than overridden');
  assert.equal(h.state.englishFunny, 3);
  assert.equal(h.state.cantoneseFunny, 2);
  h.$('school-unlock').value = 'correct-horse';
  await h.unlockSchoolMode();
  assert.equal(h.effectiveLanguage(), 'zh', 'the chosen language did not come back');
});

/* ------------------------------------------------------------------ *
 * Plain English, and the copy layer that produces it.
 * ------------------------------------------------------------------ */

test('while it is on the effective language is English whatever is stored, and the document says so', async () => {
  const h = await armed({ language: 'both' });
  assert.equal(h.effectiveLanguage(), 'en');
  h.applySchoolMode();
  assert.equal(h.document.documentElement.lang, 'en',
    'the document language attribute still claims the stored language');
});

test('copy renders at the plainest English level, not at the stored funny level', async () => {
  const h = await armed({ language: 'zh', englishFunny: 3, cantoneseFunny: 3 });
  assert.equal(h.copyText('sample'), 'Plain English.');
  h.$('school-unlock').value = 'correct-horse';
  await h.unlockSchoolMode();
  assert.equal(h.copyText('sample'), '廣東話四。',
    'the stored Cantonese choice and funny level did not come back, so the previous assertion proved nothing');
});

test('the personal vocabulary behaves as though it were not installed, and the file is kept rather than deleted', async () => {
  const vocabulary = { replacements: [{ from: 'Plain English.', to: 'REPLACED' }] };
  const h = await armed({ language: 'en', englishFunny: 0, vocabulary });
  assert.equal(h.copyText('sample'), 'Plain English.',
    'a personal-vocabulary replacement was applied while the mode was on');
  assert.ok(h.storage.getItem('ding-pbx-vocabulary-cache'), 'the uploaded file was destroyed rather than set aside');
  h.$('school-unlock').value = 'correct-horse';
  await h.unlockSchoolMode();
  assert.equal(h.copyText('sample'), 'REPLACED', 'the uploaded file did not come back');
});

/* ------------------------------------------------------------------ *
 * The name.
 * ------------------------------------------------------------------ */

test('the shipped name is what an untouched card renders', () => {
  const h = loadSchool();
  h.renderSchoolCard();
  assert.equal(h.schoolName(), SHIPPED);
  assert.equal(h.$('school-title').textContent, SHIPPED);
  assert.equal(h.schoolIsRenamed(), false);
});

test('after a rename, no rendered surface of the card carries the shipped name', () => {
  const h = loadSchool();
  h.setSchoolName('Quiet mode');
  h.renderSchoolCard();
  const rendered = [
    h.$('school-title').textContent,
    h.$('school-status').textContent,
    h.$('school-suppressed').textContent,
    h.$('school-recovery-text').textContent,
    h.$('school-card').dataset.search,
  ];
  for (const text of rendered) {
    assert.ok(!text.toLowerCase().includes(SHIPPED.toLowerCase()),
      `a rendered surface still carries the shipped name: ${JSON.stringify(text)}`);
  }
  assert.match(h.$('school-title').textContent, /Quiet mode/u);
  assert.match(h.$('school-card').dataset.search, /quiet mode/u,
    'the settings search would still only find this card by the name it no longer shows');
});

test('the description itself never names the mode, at any funny level or in either language', () => {
  /* The description is the one piece of card copy that comes from the COPY table, so it
   * cannot be rewritten per render. It is written not to name the mode at all, which is
   * what makes a rename total rather than nearly total. */
  const key = 'schoolDesc:{en:[';
  const start = app.indexOf(key);
  assert.notEqual(start, -1, 'COPY.schoolDesc is no longer declared');
  const zhEnd = app.indexOf(']}', app.indexOf('],zh:[', start));
  /* From after the key itself, or the key's own name would satisfy the scan below and
   * this test would be checking that `schoolDesc` is spelled `schoolDesc`. */
  const entry = app.slice(start + key.length, zhEnd);
  assert.ok(entry.length > 800, 'the extracted description is too short to be all eight variants');
  assert.ok(!/school/iu.test(entry), 'COPY.schoolDesc names the mode, so a rename could never be complete');
});

test('persisted text never names the mode, because a rename cannot rewrite an append-only record', async () => {
  const h = await armed();
  h.setSchoolName('Quiet mode');
  h.commitSchoolName();
  h.$('school-unlock').value = 'wrong';
  await h.unlockSchoolMode();
  h.$('school-unlock').value = 'correct-horse';
  await h.unlockSchoolMode();
  assert.ok(h.history.length >= 4, 'too few history entries were written for this to prove anything');
  for (const entry of h.history) {
    assert.ok(!/school|quiet mode/iu.test(entry.summary),
      `a history entry names the mode and would outlive the next rename: ${JSON.stringify(entry.summary)}`);
  }
  assert.ok(h.notified.length >= 3, 'too few notifications were raised for this to prove anything');
  for (const item of h.notified) {
    assert.ok(!/school|quiet mode/iu.test(`${item.title} ${item.message}`),
      `a stored notification names the mode: ${JSON.stringify(item.message)}`);
  }
});

test('the name is capped, so a pasted essay cannot become the card heading', () => {
  const h = loadSchool();
  h.setSchoolName('x'.repeat(500));
  assert.equal(h.schoolName().length, 60, 'the chosen name is not capped at 60 characters');
});

/* ------------------------------------------------------------------ *
 * One switch, across every tab.
 * ------------------------------------------------------------------ */

test('a change made in another tab arrives live rather than at the next load', () => {
  const h = loadSchool();
  h.initSchoolWatch();
  const listener = h.windowListeners.get('storage');
  assert.ok(listener, 'nothing subscribes to the shared record, so a second tab would be a second answer');
  h.storage.setItem(h.SCHOOL_KEY, JSON.stringify({ on: true, name: 'Quiet mode', secret: { algorithm: 'SHA-256', saltHex: 'ab', digestHex: 'cd' } }));
  listener({ key: h.SCHOOL_KEY });
  assert.equal(h.schoolActive(), true, 'the record changed in another tab and this one carried on unrestricted');
  assert.equal(h.$('settings-language-card'), null, 'the mode arrived but nothing was applied');
});

test('the whole store being cleared elsewhere is handled too, since that is the documented recovery', () => {
  const h = loadSchool({ stored: { on: true, name: '', secret: { algorithm: 'SHA-256', saltHex: 'ab', digestHex: 'cd' } } });
  h.initSchoolWatch();
  h.applySchoolMode();
  assert.equal(h.schoolActive(), true, 'the fixture did not start on, so this would prove nothing');
  h.storage.map.clear();
  h.windowListeners.get('storage')({ key: null });
  assert.equal(h.schoolActive(), false);
  assert.ok(h.$('settings-language-card'), 'the recovery happened elsewhere and this tab stayed restricted');
});

test('an unrelated key changing in another tab is ignored rather than re-reading everything', () => {
  const h = loadSchool();
  h.initSchoolWatch();
  const applied = h.applied.count;
  h.windowListeners.get('storage')({ key: 'ding-pbx-pages-v2' });
  assert.equal(h.applied.count, applied, 'an unrelated storage change re-applied the whole page');
});

/* ------------------------------------------------------------------ *
 * The ways out, and the ways that must not be.
 * ------------------------------------------------------------------ */

test('the record lives in its own storage key, so nothing that writes the settings can reach it', () => {
  const h = loadSchool();
  assert.equal(h.SCHOOL_KEY, 'ding-pbx-pages-school-v1');
  assert.notEqual(h.SCHOOL_KEY, 'ding-pbx-pages-v2');
  /* performSettingsReset writes `state` and nothing else, so this is the whole of why a
   * reset cannot open the lock. Checked against the real function rather than believed. */
  const reset = functionSource(app, 'performSettingsReset');
  assert.match(reset, /Object\.assign\(state,DEFAULTS\)/u, 'the reset no longer works by replacing state');
  assert.ok(!reset.includes('SCHOOL_KEY') && !reset.includes('school'),
    'the reset now reaches the restricted-presentation record -- that is a way around the lock, not a reset');
});

test('restoring an earlier local-history revision cannot turn it off either', () => {
  const restore = functionSource(app, 'restoreHistoryEntry');
  assert.ok(!restore.includes('SCHOOL_KEY') && !restore.includes('school'),
    'restoring a revision now writes the restricted-presentation record, which would make history a bypass');
  const snapshot = functionSource(app, 'snapshotState');
  assert.ok(!snapshot.includes('school'), 'the history snapshot now carries the mode, so a restore could lift it');
});

test('the redacted settings export names the mode honestly and omits the credential', () => {
  const h = loadSchool();
  h.setSchoolName('Quiet mode');
  const summary = h.schoolExportSummary();
  assert.deepEqual(Object.keys(summary).sort(), ['credential', 'name', 'on', 'renamed', 'storedSeparatelyIn']);
  assert.equal(summary.credential, 'omitted');
  assert.equal(summary.on, false);
  assert.equal(summary.renamed, true);
  assert.equal(summary.name, 'Quiet mode');
  assert.match(app, /restrictedPresentation:schoolExportSummary\(\)/u,
    'the settings export no longer carries the restricted-presentation summary at all');
  assert.ok(!/saltHex|digestHex/u.test(JSON.stringify(summary)), 'the export carries credential material');
});

test('the card says how to get back in, and it is a real route rather than a support address', () => {
  const h = loadSchool();
  h.renderSchoolCard();
  const text = h.$('school-recovery-text').textContent;
  assert.match(text, /not stored/u, 'the recovery text does not say the value cannot be recovered');
  assert.match(text, /ding-pbx-pages-school-v1/u, 'the recovery text does not name the record to clear');
  assert.match(text, /no waiting period and no attempt limit/u,
    'the recovery text no longer states that this page cannot lock somebody out on a clock');
});

test('the card states plainly that it is not a security boundary', () => {
  assert.match(settings, /<p class="setting-note" id="school-note">[^<]*not a security boundary[^<]*<\/p>/u,
    'the card no longer says it is a speed bump rather than protection');
  assert.match(settings, /<p class="setting-note" id="school-note">[^<]*clearing this site's storage[^<]*<\/p>/u,
    'the card no longer says the recovery route exists');
});

/* ------------------------------------------------------------------ *
 * The capability this site has not got.
 * ------------------------------------------------------------------ */

test('the one capability the canon names that this site cannot suppress is recorded, and really is absent', () => {
  const h = loadSchool();
  assert.deepEqual(h.SCHOOL_ABSENT_HERE, ['startup-surprise'],
    'the recorded list of capabilities this site has not got changed -- re-derive the absence below by hand');
  /* Re-derived rather than believed, so the day somebody builds one this pin stops being
   * true and says so instead of the mode quietly failing to hide it. */
  /* The block itself is cut out first, because it is the one place on this site that
   * legitimately talks about the surprise it cannot remove -- leaving it in would make
   * the scan below match this feature's own explanation of why the scan exists. */
  const combined = [app.replace(schoolBlock(), ''), css, ...PAGES.map((name) => pageSource[name])].join('\n');
  assert.ok(combined.length > 20000, 'the combined source is too small to trust a "not found" result from it');
  assert.doesNotMatch(app, /Math\.random/u,
    'site/app.js now draws a random number -- a per-launch surprise may exist, and the mode would have to remove it');
  for (const pattern of [/\bdumplings?\b/giu, /har[\s-]?gow/giu, /\bsurprise\b/giu]) {
    assert.deepEqual([...combined.matchAll(pattern)].map((m) => m[0]), [],
      'a per-launch surprise may have been added to this site -- the restricted presentation would have to remove it');
  }
});

test('every capability the mode DOES cover has a container that really exists in the markup', () => {
  const declared = [...schoolBlock().matchAll(/selector:'([^']+)'/gu)].map((m) => m[1]);
  assert.deepEqual(declared, SUPPRESSED_SELECTORS,
    'the declared list of covered containers changed -- check each one still owns the capability it claims');
  for (const selector of declared) {
    const id = selector.slice(1);
    assert.ok(settings.includes(`id="${id}"`),
      `the mode claims to remove ${selector}, and no element with that id exists on settings.html -- it would remove nothing`);
  }
});

/* ------------------------------------------------------------------ *
 * The markup, the wiring and the registries.
 * ------------------------------------------------------------------ */

test('the card exists on the settings page, with every control it needs', () => {
  assert.match(settings, /<article class="setting-card setting-card-stack school-card" id="school-card"/u,
    'the restricted-presentation card is not on settings.html');
  for (const id of CONTROL_IDS) {
    assert.ok(settings.includes(`id="${id}"`), `#${id} is not on settings.html`);
  }
  for (const id of CONTROL_IDS.filter((name) => name !== 'school-arm' && name !== 'school-unlock-submit')) {
    assert.match(settings, new RegExp(`<label for="${id}">[^<]+</label>`, 'u'), `#${id} has no visible label of its own`);
  }
  assert.match(settings, /<p id="school-status" role="status">/u, 'the status line is not a live region');
});

test('the three secret-bearing fields are password fields, so a value is not read over somebody’s shoulder', () => {
  for (const id of ['school-secret', 'school-secret-confirm', 'school-unlock']) {
    const field = settings.match(new RegExp(`<input id="${id}"[^>]*>`, 'u'));
    assert.ok(field, `#${id} is not an input at all`);
    assert.match(field[0], /type="password"/u, `#${id} shows the value as it is typed`);
  }
});

test('every control on the card is bound to something that changes real state', () => {
  const h = loadSchool();
  h.initSchool();
  assert.equal(typeof h.$('school-name').oninput, 'function', 'the name field is bound to nothing');
  assert.equal(typeof h.$('school-name').onchange, 'function', 'the name field records nothing when it is left');
  assert.equal(typeof h.$('school-arm').onclick, 'function', 'the arm button is bound to nothing');
  assert.equal(typeof h.$('school-unlock-submit').onclick, 'function', 'the unlock button is bound to nothing');
  h.$('school-name').oninput({ target: { value: 'Quiet mode' } });
  assert.equal(h.schoolName(), 'Quiet mode');
  assert.equal(JSON.parse(h.storage.getItem(h.SCHOOL_KEY)).name, 'Quiet mode', 'the rename was not persisted');
});

test('the control groups are swapped by state, and the stylesheet actually hides the one that is off', async () => {
  const h = await armed();
  h.renderSchoolCard();
  assert.equal(h.$('school-arm-controls').hidden, true, 'the arm form is still offered while the mode is on');
  assert.equal(h.$('school-unlock-controls').hidden, false);
  assert.equal(h.$('school-name-controls').hidden, false, 'the name cannot be changed while the mode is on');
  /* Load-bearing rather than defensive: `display:grid` on the group would otherwise beat
   * the browser's own `[hidden]{display:none}`, and the group nobody is in the state for
   * would sit there fully operable. */
  assert.match(css, /^#school-name-controls\[hidden\],#school-arm-controls\[hidden\],#school-unlock-controls\[hidden\]\{display:none\}/mu,
    'a display rule on the control groups would beat [hidden] with nothing to say so');
  assert.match(css, /^#school-name-controls,#school-arm-controls,#school-unlock-controls\{display:grid/mu,
    'the groups no longer carry the display rule that made the [hidden] rule necessary');
});

test('the card is wired into the page: applied on every state change, and started once', () => {
  assert.match(app, /function applyState\(\)\{applySchoolMode\(\);/u,
    'applyState no longer applies the restricted presentation, so a stored record would do nothing');
  assert.match(app, /initDisplayName\(\);initNarration\(\);initSchool\(\);/u,
    'nothing starts the restricted presentation card');
  assert.match(app, /function init\(\)\{ensureAttentionUI\(\);initSchoolWatch\(\);/u,
    'nothing subscribes to the shared record at start-up');
});

test('the card is findable from the settings search, and its keywords follow the chosen name', () => {
  assert.match(settings, /id="school-card" data-search="school mode restricted plain english only lock pin passphrase"/u,
    'the shipped card carries no search keywords');
  assert.match(functionSource(app, 'renderSchoolCard'), /card\.dataset\.search=schoolSearchKeywords\(\);/u,
    'the keywords are not rewritten from the chosen name, so a renamed card is findable only by a name it no longer shows');
});

test('the site feature registry records it as implemented, and names the files it lives in', () => {
  const row = registry.features['school-mode'];
  assert.ok(row, 'no school-mode row in site/feature-registry.json');
  assert.equal(row.status, 'implemented-unverified');
  assert.deepEqual([...row.implementation.paths].sort(), ['site/app.js', 'site/settings.html', 'site/styles.css'].sort());
  assert.match(row.note, /removed from the document/u, 'the registry note does not record the removal boundary');
  /* The exact claim, not the word. A bare /digest/ needle was satisfied by the note's
   * second, unrelated mention of one, so a planted break that deleted the sentence
   * saying what is stored survived -- found by running the negative script rather than
   * by reading it. */
  assert.match(row.note, /random 16-byte salt and the SHA-256 digest of salt-and-value/u,
    'the registry note no longer records exactly what is stored in place of the value');
});

test('the localization registry records the card copy rather than claiming untranslated coverage', () => {
  const row = locales.features['school-mode'];
  assert.equal(row.state, 'localized');
  assert.deepEqual(row.copyKeys, ['schoolDesc']);
  assert.ok(locales.knownCopyKeys.includes('schoolDesc'), 'schoolDesc is missing from the recorded COPY keys');
});

test('the documentation article covers this surface rather than the desktop one alone', () => {
  const article = readFileSync(resolve(repoConsole, 'docs', 'platform', 'school-mode.md'), 'utf8').replaceAll('\r\n', '\n');
  assert.match(article, /## The pages-site/u, 'the article has no section for this surface');
  /* The recovery sentence specifically, rather than the key anywhere. The article names
   * that key several times for several reasons, so a bare needle for it was satisfied by
   * an occurrence in a different paragraph and a planted break on the recovery sentence
   * survived -- found by running the negative script rather than by reading it. */
  assert.match(article, /Clearing this site's storage in the browser removes `ding-pbx-pages-school-v1`/u,
    'the article no longer tells a locked-out reader exactly what to clear');
  assert.match(article, /no waiting period/u, 'the article does not record why this surface ships no unlock ladder');
});

test('the console/assets tree the site publishes carries no asset named for this mode', () => {
  const entries = readdirSync(resolve(repoConsole, 'assets'));
  assert.ok(entries.length > 0, 'assets directory listed as empty, which proves nothing');
  assert.deepEqual(entries.filter((name) => /school/iu.test(name)), []);
});
