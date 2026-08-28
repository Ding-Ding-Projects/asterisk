/**
 * Contract: per-element toy locks on the pages site.
 *
 * This file used to prove an absence, and most of it was a scan for "lock"-shaped
 * words. That was the right test for a site with no lock in it. It is the wrong test
 * for a site with one, and the replacement is written around the three properties
 * that actually distinguish a per-element lock from the page-level restricted
 * presentation this site already had:
 *
 *   1. PER ELEMENT. Each lock has its own policy and its own credential set, keyed by
 *      the element. Opening one opens exactly one. There is no master value and no
 *      inheritance -- so the interesting failure is not "the lock does not open", it
 *      is "the lock opens something else too", and that is what is checked.
 *   2. REFUSED, AND STILL THE WAY IN. A locked element does not run its action, and
 *      activating it opens that element's prompt. `disabled` would satisfy the first
 *      half and destroy the second, which is why the refusal is an interception. Both
 *      halves are exercised, and so is the second route in: the element's own menu.
 *   3. HONEST ABOUT WHAT IT IS. It is a speed bump. Every surface says so, at every
 *      funny level, in both languages, and the recovery route -- clear this site's
 *      storage -- is named wherever a value is asked for. A for-fun lock that can
 *      strand somebody is not for fun, so the recovery line is checked as a fact about
 *      the code rather than trusted as a promise about future edits.
 *
 * The behavioural half runs the REAL extracted source against a recording DOM, in the
 * style dialog-emojis.test.mjs and context-menu-shortcuts.test.mjs already established
 * here. That matters especially for this feature: "the record is stored", "the wizard
 * is on the page" and "the method has three factors" are all true of a lock that
 * refuses nothing at all.
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

const PAGES = ['index', 'product', 'documentation', 'downloads', 'status', 'settings'];
const pageSource = Object.fromEntries(PAGES.map((name) => [name, read(`${name}.html`)]));
const app = read('app.js');
const css = read('styles.css');
const settings = pageSource.settings;
const registry = json('feature-registry.json');
const locales = json('locales/feature-registry.json');
const article = readFileSync(resolve(siteRoot, '..', 'docs', 'platform', 'per-element-toy-locks.md'), 'utf8')
  .replaceAll('\r\n', '\n');

/* ================================================================== *
 * Running the real source.
 * ================================================================== */

/**
 * The source of one `function name(...)`, brace-counted so nesting survives.
 *
 * The `async ` prefix is taken with it when there is one. Dropping it produces a
 * function that is not async but still contains `await`, which fails to parse -- and
 * the parse error names the sandbox rather than the missing keyword, so it reads as a
 * broken harness rather than as a lossy extraction.
 */
function functionSource(name) {
  let start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `function ${name} is not declared in site/app.js`);
  if (app.slice(start - 6, start) === 'async ') start -= 6;
  const braceStart = app.indexOf('{', app.indexOf(')', start));
  let depth = 0;
  for (let i = braceStart; i < app.length; i += 1) {
    if (app[i] === '{') depth += 1;
    else if (app[i] === '}') {
      depth -= 1;
      if (depth === 0) return app.slice(start, i + 1);
    }
  }
  throw new Error(`function ${name} is not brace-balanced in site/app.js`);
}

const BLOCK_START = "  const LOCK_KEY='ding-pbx-pages-locks-v1';";
const BLOCK_END = '  function init(){';

/** The whole feature, as one contiguous slice rather than a function at a time. */
function featureSource() {
  const start = app.indexOf(BLOCK_START);
  assert.notEqual(start, -1, 'the element-lock block is no longer identifiable in site/app.js');
  const end = app.indexOf(BLOCK_END, start);
  assert.notEqual(end, -1, 'init() no longer follows the element-lock block in site/app.js');
  const source = app.slice(start, end);
  assert.ok(source.length > 12000, `the extracted block is only ${source.length} bytes -- it cannot be the whole feature`);
  return source;
}

/**
 * The neighbours the block genuinely uses, lifted out of site/app.js rather than
 * restated here.
 *
 * Restating one is how a test comes to assert a second implementation that happens to
 * agree today; this repository has already been bitten by a duplicated pattern whose
 * escaping drifted from the original's. Everything below that could be restated is
 * extracted instead -- above all the one-time-code verifier, because "the lock accepts
 * the code" and "the lock accepts any six digits" are the two outcomes that matter and
 * a stub cannot tell them apart.
 */
const BORROWED_CONSTANTS = [
  "const AUTH_BASE32_ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';",
  'const AUTH_LABEL_MAX=64;',
  'const AUTH_SECRET_MAX=128;',
  'const AUTH_PERIOD_MAX=300;',
  'const CONTEXT_MENU_MARGIN = 8;',
  'const CONTEXT_MENU_MIN_HEIGHT = 120;',
  'const CONTEXT_MENU_WIDTH = 320;',
];
const BORROWED_FUNCTIONS = [
  'authDecodeBase32', 'authNormaliseAlgorithm', 'authNormaliseDigits', 'authNormalisePeriod',
  'authCounterBytes', 'authRawBuffer', 'authHotp', 'authStepFor', 'authGenerateCode', 'authVerifyCode',
  'authParsePairingUri',
  'matchText', 'escapeHtml', 'accessibleName', 'clampMenuPosition',
  'bulkClick', 'bulkSelectAll', 'planBulk', 'summariseBulk',
];

test('every borrowed constant really is declared in site/app.js exactly as quoted here', () => {
  /* Otherwise a renamed constant would be silently supplied by this file, and the block
   * would go on running against a value the real page no longer has. */
  for (const line of BORROWED_CONSTANTS) {
    assert.equal(app.split(`  ${line}`).length - 1, 1, `${line} is not declared exactly once in site/app.js`);
  }
});

/* ------------------------------------------------------------------ *
 * A recording DOM. It remembers rather than shrugs.
 * ------------------------------------------------------------------ */

class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.id = '';
    this.className = '';
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.checked = false;
    /* A `<dialog>` created by `createElement` is CLOSED, and everything else is
     * visible. Starting every element at `hidden = false` made "the prompt opened"
     * assert something that was already true before anything ran -- a vacuous pass
     * that the negative script caught by breaking the open call and watching the test
     * stay green. */
    this.open = false;
    this.hidden = String(tag).toUpperCase() === 'DIALOG';
    this.disabled = false;
    this.placeholder = '';
    this.attributes = {};
    /* `dataset` and the `data-*` attributes are ONE thing in a real DOM, and this
     * feature writes through one and reads through the other: it sets
     * `element.dataset.locked` and finds it again with `closest('[data-locked="1"]')`.
     * Two separate stores here would make every one of those lookups come back empty,
     * which reads as the lock not working rather than as the harness having two
     * places where the browser has one. */
    this.dataset = new Proxy(this.attributes, {
      get: (target, name) => (typeof name === 'string' ? target[El.attributeName(name)] : undefined),
      set: (target, name, value) => { target[El.attributeName(name)] = String(value); return true; },
      deleteProperty: (target, name) => { delete target[El.attributeName(name)]; return true; },
      has: (target, name) => Object.hasOwn(target, El.attributeName(name)),
    });
    this.style = {};
    this.children = [];
    this.parent = null;
    this.listeners = {};
    this.focused = 0;
    this.clicks = 0;
    this.rect = { left: 20, top: 40, right: 220, bottom: 80, width: 200, height: 40 };
  }

  static datasetName(attribute) {
    return attribute.slice(5).replace(/-([a-z])/gu, (_, character) => character.toUpperCase());
  }

  static attributeName(dataName) {
    return `data-${String(dataName).replace(/[A-Z]/gu, (character) => `-${character.toLowerCase()}`)}`;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'id') this.id = String(value);
  }

  getAttribute(name) {
    if (name === 'id') return this.id || null;
    return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  get classList() {
    const self = this;
    return {
      add(name) { if (!self.className.split(' ').filter(Boolean).includes(name)) self.className = `${self.className} ${name}`.trim(); },
      remove(name) { self.className = self.className.split(' ').filter((part) => part && part !== name).join(' '); },
      contains(name) { return self.className.split(' ').includes(name); },
    };
  }

  append(...nodes) {
    for (const node of nodes) {
      if (node && typeof node === 'object' && node.tagName) { node.parent = this; this.children.push(node); }
    }
  }

  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
  }

  get firstElementChild() { return this.children[0] ?? null; }

  get parentElement() { return this.parent; }

  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }

  focus() { this.focused += 1; }

  click() { this.clicks += 1; }

  show() { this.open = true; this.hidden = false; }

  close() { this.open = false; this.hidden = true; }

  getBoundingClientRect() { return this.rect; }

  descendants() {
    const out = [];
    const walk = (node) => { for (const child of node.children) { out.push(child); walk(child); } };
    walk(this);
    return out;
  }

  querySelector(selector) { return this.descendants().find((node) => matchesLocal(node, selector)) ?? null; }

  querySelectorAll(selector) { return this.descendants().filter((node) => matchesLocal(node, selector)); }

  closest(selector) {
    let node = this;
    while (node) {
      if (matchesLocal(node, selector)) return node;
      node = node.parent;
    }
    return null;
  }
}

/** The tiny subset of selector syntax this feature actually uses. */
function matchesLocal(element, selector) {
  return String(selector).split(',').map((part) => part.trim()).filter(Boolean).some((part) => {
    const attributeValue = part.match(/^\[([a-z-]+)="([^"]*)"\]$/u);
    if (attributeValue) return element.getAttribute(attributeValue[1]) === attributeValue[2];
    const attribute = part.match(/^\[([a-z-]+)\]$/u);
    if (attribute) return element.getAttribute(attribute[1]) !== null;
    if (part.startsWith('#')) return element.id === part.slice(1);
    if (part.startsWith('.')) return element.className.split(' ').includes(part.slice(1));
    return element.tagName.toLowerCase() === part.toLowerCase();
  });
}

/** A fake browser store that can be told to refuse, because a full quota is a real state. */
function makeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    refuse: false,
    getItem(key) { return Object.hasOwn(data, key) ? data[key] : null; },
    setItem(key, value) {
      if (this.refuse) { const error = new Error('quota'); error.name = 'QuotaExceededError'; throw error; }
      data[key] = String(value);
    },
    removeItem(key) { delete data[key]; },
  };
}

const CARD_IDS = ['locks-status', 'locks-list', 'locks-count', 'locks-search', 'locks-selection-status',
  'locks-export-format', 'locks-export-loss', 'locks-confirm', 'locks-confirm-text',
  'locks-recovery-text', 'locks-toy-note',
  'locks-select-page', 'locks-select-matches', 'locks-select-none',
  'locks-remove-selected', 'locks-export-selected', 'locks-confirm-yes', 'locks-confirm-cancel'];

/**
 * Build a page and run the real element-lock source against it.
 *
 * `page` is the document's own `data-page`, because a lock key carries the page it
 * belongs to and a record from another page must not resolve here.
 */
function load({ stored = null, page = 'settings', card = true } = {}) {
  const body = new El('body');
  body.dataset.page = page;
  const byId = new Map();
  const register = (element) => { if (element.id) byId.set(element.id, element); return element; };

  if (card) {
    for (const id of CARD_IDS) {
      const node = new El(id.endsWith('-format') ? 'select' : 'p');
      node.setAttribute('id', id);
      register(node);
    }
  }

  const storage = makeStorage(stored ? { 'ding-pbx-pages-locks-v1': JSON.stringify(stored) } : {});
  const record = {
    storage,
    notifications: [],
    history: [],
    writes: [],
    reports: [],
    formatCalls: 0,
    lossCalls: 0,
    downloads: [],
    documentListeners: [],
  };

  /* Registered ids first, then the live tree -- because the two dialogs are BUILT by
   * the code under test, so everything inside them exists only once it has run. A
   * lookup that consulted a fixed map alone would report every field of the wizard
   * missing, which reads as the wizard not working rather than as the harness not
   * looking. */
  const find = (id) => byId.get(id) ?? body.querySelector(`#${id}`) ?? null;

  const document = {
    body,
    createElement: (tag) => new El(tag),
    createTextNode: (text) => ({ text }),
    getElementById: find,
    querySelector: (selector) => body.querySelector(selector),
    querySelectorAll: (selector) => body.querySelectorAll(selector),
    addEventListener: (type, handler, capture) => { record.documentListeners.push({ type, handler, capture }); },
  };

  const globals = {
    document,
    window: { innerWidth: 1200, innerHeight: 800 },
    localStorage: storage,
    crypto: globalThis.crypto,
    TextEncoder: globalThis.TextEncoder,
    regexState: new Map(),
    $: find,
    all: (selector) => body.querySelectorAll(selector),
    writeLocal: (key, value) => {
      record.writes.push({ key, value });
      try { storage.setItem(key, value); return { ok: true, reason: '' }; }
      catch { return { ok: false, reason: 'this browser has no room left for this site' }; }
    },
    reportWrite: (what, result) => { record.reports.push({ what, ok: result.ok }); return result.ok; },
    notify: (title, message, options) => { record.notifications.push({ title, message, options }); },
    applyVocabularyText: (text) => text,
    applyVocabulary: () => {},
    recordHistory: (action, summary) => { record.history.push({ action, summary }); },
    suitableFormats: () => { record.formatCalls += 1; return ['json', 'csv']; },
    describeLoss: () => { record.lossCalls += 1; return []; },
    exportRows: ({ rows }) => JSON.stringify(rows),
    exportFilename: (base, format, range) => `${base}-${range}.${format}`,
    download: (name, text) => { record.downloads.push({ name, text }); },
    EXPORT_MIME: { json: 'application/json', csv: 'text/csv' },
  };

  const exported = [
    'LOCK_KEY', 'LOCK_POLICIES', 'LOCK_DURATIONS', 'LOCK_FACTOR_LABEL', 'LOCK_ENTRY_LIMIT',
    'LOCK_PIN_MIN', 'LOCK_PIN_MAX', 'LOCK_PASSWORD_MIN', 'LOCK_PASSWORD_MAX',
    'LOCK_ATTEMPT_BUDGET', 'LOCK_ATTEMPT_WINDOW_MS', 'LOCK_TOY_LINE', 'LOCK_RECOVERY_LINE',
    'LOCK_GUARDED_EVENTS', 'LOCK_SETUP_REASON',
    'lockPolicy', 'lockDuration', 'lockElementPath', 'lockElementKey', 'lockKeyPage', 'lockKeySelector',
    'lockResolveElement', 'lockCryptoApi', 'lockSalt', 'lockDigestOf', 'lockCredentialVerdict',
    'lockNormaliseRecord', 'lockLoadRecords', 'lockSaveRecords', 'lockRecordFor', 'lockCount',
    'lockExportSummary', 'lockExportRows', 'lockSetupVerdict',
    'lockAttemptVerdict', 'lockNoteAttempt', 'lockClearAttempts',
    'lockOpenVerdict', 'lockGrant', 'lockNoteUse', 'lockRelock', 'lockIsOpen',
    'lockedAncestor', 'lockEventVerdict', 'lockKeypadDigits', 'lockRandomBelow', 'lockVerifyFactor',
    'ensureLockUI', 'lockAnchor', 'openLockWizard', 'closeLockWizard', 'renderLockWizard',
    'lockWizardFields', 'createLockFromWizard',
    'openLockPrompt', 'closeLockPrompt', 'renderLockPrompt', 'renderLockKeypad', 'submitLockStep',
    'lockOpenDescription', 'applyLocks', 'lockGuard', 'initLockGuard',
    'renderLocksCard', 'lockUpdateExportFormats', 'lockRemovalVerdict', 'lockRemove', 'initLocks',
    /* Borrowed, and exported so the tests can compute a code the way the page does. */
    'authGenerateCode',
  ];

  const source = `${BORROWED_CONSTANTS.map((line) => `  ${line}`).join('\n')}\n`
    + `${BORROWED_FUNCTIONS.map((name) => functionSource(name)).join('\n')}\n`
    + `${featureSource()}\nreturn {${exported.join(',')}};`;
  const names = Object.keys(globals);
  // eslint-disable-next-line no-new-func -- deliberately re-running the real extracted source
  const api = new Function(...names, source)(...names.map((name) => globals[name]));
  for (const name of exported) {
    assert.ok(api[name] !== undefined, `${name} did not survive extraction -- the block no longer declares it`);
  }
  return { ...api, record, body, storage, byId, register, find };
}

/** A target element shaped like a real control, with an id so its key is stable. */
function makeTarget(id = 'settings-reset', tag = 'button', text = 'Reset settings') {
  const element = new El(tag);
  element.setAttribute('id', id);
  element.textContent = text;
  return element;
}

/** Fire one registered listener the way a browser would. */
function fire(element, type, event) {
  assert.ok(element, `nothing is listening for ${type} because the element does not exist`);
  const handlers = element.listeners[type] || [];
  assert.ok(handlers.length > 0, `nothing is listening for ${type} on #${element.id || element.className}`);
  for (const handler of handlers) handler({ type, target: element, ...event });
}

/**
 * Select one row the way a click does, through the list's own handler.
 *
 * The list renders its rows as markup, which this DOM keeps as a string -- so the row
 * is built here and handed to the real handler. That is still the real selection path:
 * what is being checked is that the handler reaches the shared bulk model, not that a
 * string became elements.
 */
function selectRow(api, key) {
  const list = api.find('locks-list');
  const row = new El('article');
  row.className = 'lock-entry';
  row.dataset.lockRow = key;
  list.append(row);
  if (!(list.listeners.click || []).length) api.initLocks();
  const handlers = list.listeners.click || [];
  assert.ok(handlers.length > 0, 'the element-lock list has no click handler, so nothing could be selected');
  for (const handler of handlers) handler({ type: 'click', target: row, shiftKey: false, ctrlKey: false, metaKey: false });
}

/** Everything a stored record needs, with real salted digests for its factors. */
async function makeRecord(api, options = {}) {
  const {
    key = 'settings::#settings-reset', policy = 'pin', pin = '4321', password = 'hunter22',
    totp = null, duration = 'once', minutes = 5, shuffle = false,
  } = options;
  const factors = {};
  for (const factor of api.lockPolicy(policy).factors) {
    if (factor === 'totp') { factors.totp = totp ?? { secret: 'JBSWY3DPEHPK3PXP', algorithm: 'SHA-1', digits: 6, period: 30 }; continue; }
    const saltHex = api.lockSalt();
    // eslint-disable-next-line no-await-in-loop
    const digestHex = await api.lockDigestOf(factor === 'pin' ? pin : password, saltHex);
    factors[factor] = { algorithm: 'SHA-256', saltHex, digestHex };
  }
  return { key, name: 'Reset settings', kind: 'control', policy, factors, duration, minutes, shuffle, created: 1 };
}

/** A page holding one already-locked target, ready to be driven. */
async function withLock(options = {}) {
  const seed = load();
  const record = await makeRecord(seed, options);
  const api = load({ stored: { [record.key]: record } });
  const target = makeTarget();
  api.body.append(target);
  api.register(target);
  api.ensureLockUI();
  api.applyLocks();
  return { api, record, target };
}

/* ================================================================== *
 * 1. Per element.
 * ================================================================== */

test('the six canonical methods are all present, each an ordered factor list, and no two ask for the same set', () => {
  const api = load();
  assert.equal(api.LOCK_POLICIES.length, 6, 'the canonical contract names six methods');
  assert.deepEqual(api.LOCK_POLICIES.map((entry) => entry.id),
    ['pin', 'password', 'pin+password', 'password+totp', 'pin+totp', 'password+pin+totp'],
    'the set of methods changed -- the canonical contract names exactly these six');
  const seen = new Set();
  for (const policy of api.LOCK_POLICIES) {
    assert.ok(policy.factors.length > 0, `${policy.id} asks for nothing at all`);
    assert.ok(policy.label.length > 0, `${policy.id} has no label`);
    /* Ordered, not a set: the prompt walks these and says which step it is on, so a
     * method whose factors arrive in a different order from its own name would ask the
     * reader for a different thing than the one they chose. */
    assert.deepEqual(policy.factors, policy.id.split('+'), `${policy.id}'s factor order does not match its own name`);
    const signature = [...policy.factors].sort().join('|');
    assert.ok(!seen.has(signature), `two methods ask for the same set of factors: ${policy.id}`);
    seen.add(signature);
  }
  assert.equal(api.LOCK_POLICIES.filter((policy) => policy.factors.includes('totp')).length, 3,
    'the canonical contract names three one-time-code combinations');
});

test('a key names the element, and an element with an id gets one that survives a re-layout', () => {
  const api = load({ page: 'settings' });
  const target = makeTarget();
  api.body.append(target);
  assert.equal(api.lockElementKey(target), 'settings::#settings-reset');
  assert.equal(api.lockKeySelector('settings::#settings-reset'), '#settings-reset');
  assert.equal(api.lockKeyPage('settings::#settings-reset'), 'settings');
});

test('an element with no id gets its structural position, and two siblings do not collide', () => {
  const api = load({ page: 'index' });
  const only = new El('section');
  const first = new El('button');
  const second = new El('button');
  api.body.append(only, first, second);
  assert.equal(api.lockElementKey(first), 'index::button[1]');
  assert.notEqual(api.lockElementKey(first), api.lockElementKey(second),
    'two sibling elements share one key, so a lock on one would lock the other');
  assert.equal(api.lockElementKey(only), 'index::section',
    'an only-child of its tag is indexed anyway, which makes its key needlessly fragile');
  assert.equal(api.lockKeySelector(api.lockElementKey(second)), 'body > button:nth-of-type(2)');
});

test('a key that cannot be turned back into a selector is refused rather than half-trusted', () => {
  const api = load();
  for (const bad of ['', 'nocolons', 'settings::', 'settings::#not a selector', 'settings::div/../evil', 'settings::#1bad']) {
    assert.equal(api.lockKeySelector(bad), '', `${JSON.stringify(bad)} resolved to a selector`);
  }
});

test('a lock only resolves on the page it was made on', () => {
  const api = load({ page: 'index' });
  const target = makeTarget();
  api.body.append(target);
  assert.equal(api.lockResolveElement('index::#settings-reset'), target);
  assert.equal(api.lockResolveElement('settings::#settings-reset'), null,
    'a lock recorded for another page resolved on this one');
});

test('every lock carries its own credential, and one value never opens another lock', async () => {
  /* The property the whole feature rests on, and the one a source scan cannot see. */
  const api = load();
  const first = await makeRecord(api, { key: 'settings::#a', pin: '1111' });
  const second = await makeRecord(api, { key: 'settings::#b', pin: '2222' });
  assert.notEqual(first.factors.pin.saltHex, second.factors.pin.saltHex,
    'two locks share one salt, so one digest would speak for both');
  assert.equal(await api.lockVerifyFactor(first, 'pin', '1111', 0), true);
  assert.equal(await api.lockVerifyFactor(second, 'pin', '2222', 0), true);
  assert.equal(await api.lockVerifyFactor(first, 'pin', '2222', 0), false, "one lock's value opened another lock");
  assert.equal(await api.lockVerifyFactor(second, 'pin', '1111', 0), false, "one lock's value opened another lock");
  /* Even the same value under two locks produces two different stored digests. */
  const same = await makeRecord(api, { key: 'settings::#c', pin: '1111' });
  assert.notEqual(same.factors.pin.digestHex, first.factors.pin.digestHex,
    'the same value stored twice produced the same digest, so the salt is not per lock');
});

test('a stored record keeps a digest and a salt, and never the value itself', async () => {
  const api = load();
  const record = await makeRecord(api, { policy: 'pin+password', pin: '4321', password: 'hunter22' });
  /* Per field rather than a substring scan of the whole record. A 64-character hex
   * digest contains a given run of four decimal digits often enough that scanning for
   * a PIN would fail on a perfectly correct record every so often -- a flaky assertion
   * that reads as a leak, which is the worst possible noise for this claim. */
  for (const factor of ['pin', 'password']) {
    assert.deepEqual(Object.keys(record.factors[factor]).sort(), ['algorithm', 'digestHex', 'saltHex'],
      `${factor} carries a field this contract has not been told about`);
    assert.match(record.factors[factor].saltHex, /^[0-9a-f]{32}$/u, `${factor} has no 16-byte salt`);
    assert.match(record.factors[factor].digestHex, /^[0-9a-f]{64}$/u, `${factor} has no SHA-256 digest`);
  }
  assert.ok(!Object.values(record.factors.pin).includes('4321'), 'the PIN itself is a field of the stored record');
  assert.ok(!Object.values(record.factors.password).includes('hunter22'), 'the password itself is a field of the stored record');
  /* Not hex, so this one CAN be scanned for across the whole record, and is worth it. */
  assert.doesNotMatch(JSON.stringify(record), /hunter22/u, 'the password appears somewhere in the stored record');
});

test('the one-time-code factor is kept differently, and the source says why rather than implying a digest', () => {
  /* The honest asymmetry. A code has to be computed, so this factor cannot be hashed;
   * implying otherwise in the copy would be the worst kind of wrong. */
  const api = load();
  assert.ok(featureSource().includes('a shared secret cannot be hashed'),
    'the source no longer states why the one-time-code factor is kept as the reader supplied it');
  assert.ok(api.LOCK_TOY_LINE.includes('encrypts nothing'),
    'the toy-lock line no longer says outright that nothing is encrypted');
});

test('a malformed record is dropped rather than locking an element behind an uncheckable value', () => {
  const api = load({
    stored: {
      'settings::#good': { key: 'settings::#good', policy: 'pin', factors: { pin: { saltHex: 'ab', digestHex: 'cd' } }, duration: 'once' },
      'settings::#nopolicy': { key: 'settings::#nopolicy', policy: 'telepathy', factors: {}, duration: 'once' },
      'settings::#nofactor': { key: 'settings::#nofactor', policy: 'pin+password', factors: { pin: { saltHex: 'ab', digestHex: 'cd' } }, duration: 'once' },
      'settings::#badsecret': { key: 'settings::#badsecret', policy: 'pin+totp', factors: { pin: { saltHex: 'ab', digestHex: 'cd' }, totp: { secret: '!!!!' } }, duration: 'once' },
      'mismatched-key': { key: 'settings::#elsewhere', policy: 'pin', factors: { pin: { saltHex: 'ab', digestHex: 'cd' } }, duration: 'once' },
    },
  });
  assert.deepEqual(Object.keys(api.lockLoadRecords().records), ['settings::#good'],
    'a malformed record survived normalisation, so an element could be locked behind a value nothing can check');
  assert.equal(api.lockLoadRecords().dropped, 4, 'the dropped count does not match what was refused');
});

test('one fixed storage key holds the whole map, so nothing builds a key from an element', () => {
  /* A key built from an element is a key an element's rename orphans, and an unbounded
   * set of them is a store nothing can enumerate to clear. */
  const source = featureSource();
  const built = [...source.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(`/gu)];
  assert.deepEqual(built.map((match) => match[0]), [], 'a storage key is now built from a template');
  assert.equal(source.split('localStorage.getItem(LOCK_KEY').length - 1, 1,
    'the record map is no longer read from one fixed key');
  assert.match(app, /const LOCK_KEY='ding-pbx-pages-locks-v1';/u, 'the lock storage key is no longer a fixed literal');
});

test('the store goes through the one guarded writer, so a browser with no room says so', () => {
  const api = load();
  api.lockSaveRecords();
  assert.deepEqual(api.record.reports.map((entry) => entry.what), ['your element locks'],
    'the lock store no longer reports its write through the shared guarded writer');
  api.storage.refuse = true;
  assert.equal(api.lockSaveRecords(), false, 'a refused write was reported as a success');
  assert.deepEqual(api.record.reports.map((entry) => entry.ok), [true, false]);
});

/* ================================================================== *
 * 2. Refused, and still the way in.
 * ================================================================== */

const SHUT_PIN_LOCK = { key: 'settings::#settings-reset', policy: 'pin', factors: { pin: { saltHex: 'ab', digestHex: 'cd' } }, duration: 'once' };

test('a locked element is announced as disabled but keeps its events', () => {
  const api = load({ stored: { 'settings::#settings-reset': SHUT_PIN_LOCK } });
  const target = makeTarget();
  api.body.append(target);
  api.applyLocks();
  assert.equal(target.getAttribute('aria-disabled'), 'true', 'a locked element is not announced as disabled');
  assert.equal(target.disabled, false,
    'a locked element carries the native disabled attribute, which would stop it receiving the click that opens its own prompt');
  assert.equal(target.dataset.lockKey, 'settings::#settings-reset');
  assert.equal(target.dataset.locked, '1');
  assert.ok(target.classList.contains('locked-element'));
});

test('the marker is a word rather than a picture, and is excluded from the vocabulary walker', () => {
  const api = load({ stored: { 'settings::#settings-reset': SHUT_PIN_LOCK } });
  const target = makeTarget();
  api.body.append(target);
  api.applyLocks();
  const badge = target.querySelector('.lock-affordance');
  assert.ok(badge, 'a locked element carries no visible marker at all');
  assert.match(badge.textContent, /locked/iu, 'the marker does not say the word a search over this page would look for');
  assert.doesNotMatch(badge.textContent, /\p{Extended_Pictographic}/u,
    'the marker is a glyph, which reaches nobody using a screen reader and nothing searching page text');
  assert.equal(badge.getAttribute('data-no-vocab'), '', 'the marker is not excluded from the personal-vocabulary walker');
  api.applyLocks();
  api.applyLocks();
  assert.equal(target.querySelectorAll('.lock-affordance').length, 1, 'applying twice stacked two markers');
});

test('unlocking clears the mark and the marker, rather than leaving an emptied one behind', () => {
  const api = load({ stored: { 'settings::#settings-reset': { ...SHUT_PIN_LOCK, duration: 'session' } } });
  const target = makeTarget();
  api.body.append(target);
  api.applyLocks();
  assert.equal(target.dataset.locked, '1');
  api.lockGrant('settings::#settings-reset', api.lockRecordFor('settings::#settings-reset'), Date.now());
  api.applyLocks();
  assert.equal(target.dataset.locked, undefined, 'an opened element is still marked locked');
  assert.equal(target.getAttribute('aria-disabled'), 'false');
  assert.equal(target.querySelectorAll('.lock-affordance').length, 0, 'an opened element kept its locked marker');
});

test('a lock whose element is no longer on the page marks nothing and throws nothing', () => {
  const api = load({ stored: { 'settings::#gone': { ...SHUT_PIN_LOCK, key: 'settings::#gone' } } });
  api.applyLocks();
  assert.equal(api.lockCount(), 1, 'the record was silently dropped rather than kept for its own page');
});

test('every route that could run a locked action is refused, and only the activation routes open the prompt', () => {
  const api = load();
  const locked = { elementKey: 'settings::#a', open: false, insidePrompt: false };
  for (const type of api.LOCK_GUARDED_EVENTS.filter((name) => name !== 'contextmenu')) {
    assert.equal(api.lockEventVerdict({ ...locked, type }).refuse, true, `a ${type} on a locked element was allowed through`);
  }
  assert.equal(api.lockEventVerdict({ ...locked, type: 'click' }).prompt, true, 'clicking a locked element does not open its prompt');
  assert.equal(api.lockEventVerdict({ ...locked, type: 'keydown', eventKey: 'Enter' }).prompt, true, 'Enter does not open the prompt');
  assert.equal(api.lockEventVerdict({ ...locked, type: 'keydown', eventKey: ' ' }).prompt, true, 'Space does not open the prompt');
  assert.equal(api.lockEventVerdict({ ...locked, type: 'keydown', eventKey: 'Tab' }).prompt, false, 'Tab opens the prompt');
  assert.equal(api.lockEventVerdict({ ...locked, type: 'paste' }).prompt, false, 'pasting opens the prompt');
});

test('the guarded list covers pointer, keyboard, typing, dragging and pasting -- not clicks alone', () => {
  const api = load();
  for (const type of ['pointerdown', 'mousedown', 'click', 'keydown', 'input', 'change', 'dragstart', 'paste']) {
    assert.ok(api.LOCK_GUARDED_EVENTS.includes(type), `${type} is no longer intercepted, so a locked field could still be edited`);
  }
});

test('right-clicking a locked element is deliberately NOT refused, because that is how its lock is removed', () => {
  const api = load();
  assert.equal(api.lockEventVerdict({ elementKey: 'settings::#a', open: false, type: 'contextmenu' }).refuse, false,
    'a locked element cannot be right-clicked, so it hides its own management');
  assert.ok(api.LOCK_GUARDED_EVENTS.includes('contextmenu'),
    'contextmenu is not even watched, so the exemption above is not a decision this code makes');
});

test('an element with no lock, an open lock, or an event inside the prompt itself is never refused', () => {
  const api = load();
  assert.equal(api.lockEventVerdict({ elementKey: '', type: 'click' }).refuse, false, 'an unlocked element was refused');
  assert.equal(api.lockEventVerdict({ elementKey: 'settings::#a', open: true, type: 'click' }).refuse, false, 'an opened element was refused');
  assert.equal(api.lockEventVerdict({ elementKey: 'settings::#a', open: false, insidePrompt: true, type: 'click' }).refuse, false,
    'typing into the unlock prompt of a locked element was refused by that same lock');
});

test('the guard really stops the event and really opens the prompt, on a real element', () => {
  const api = load({ stored: { 'settings::#settings-reset': SHUT_PIN_LOCK } });
  const target = makeTarget();
  api.body.append(target);
  api.ensureLockUI();
  api.applyLocks();
  let prevented = 0;
  let stopped = 0;
  api.lockGuard({
    type: 'click',
    target,
    preventDefault: () => { prevented += 1; },
    stopPropagation: () => { stopped += 1; },
    stopImmediatePropagation: () => { stopped += 1; },
  });
  assert.equal(prevented, 1, 'the guard did not prevent the default action of a locked element');
  assert.equal(stopped, 2, 'the guard let the event carry on to other listeners');
  assert.equal(api.find('lock-unlock').open, true, 'clicking a locked element did not open its unlock prompt');
  assert.match(api.find('lock-unlock-step').textContent, /its PIN/u,
    'the prompt opened without saying which factor it is asking for');
});

test('the guard is installed in the capture phase, so nothing downstream sees the event first', () => {
  const api = load();
  api.initLockGuard();
  const listeners = api.record.documentListeners;
  assert.equal(listeners.length, api.LOCK_GUARDED_EVENTS.length, 'not every guarded event is actually listened for');
  for (const entry of listeners) {
    assert.equal(entry.capture, true, `${entry.type} is listened for in the bubble phase, so a handler could run first`);
  }
});

/* ================================================================== *
 * The prompt: ordered steps, one validator, one budget.
 * ================================================================== */

test('the prompt walks a multi-factor method in the order the method declares', async () => {
  const { api, record, target } = await withLock({ policy: 'password+pin+totp', pin: '4321', password: 'hunter22' });
  api.openLockPrompt(record.key, target);
  assert.match(api.find('lock-unlock-step').textContent, /Step 1 of 3: its password/u,
    'the prompt does not start at the first factor the method declares');
  api.find('lock-unlock-value').value = 'hunter22';
  assert.deepEqual(await api.submitLockStep(), { ok: true, why: 'next-step' });
  assert.match(api.find('lock-unlock-step').textContent, /Step 2 of 3: its PIN/u);
  api.find('lock-unlock-value').value = '4321';
  assert.deepEqual(await api.submitLockStep(), { ok: true, why: 'next-step' });
  assert.match(api.find('lock-unlock-step').textContent, /Step 3 of 3: its one-time code/u);
});

test('a wrong step drops every factor already verified in that attempt', async () => {
  /* A factor verified a moment ago is kept only for the attempt it belongs to, so a
   * half-remembered password cannot be banked while somebody works on the code. */
  const { api, record, target } = await withLock({ policy: 'pin+password', pin: '4321', password: 'hunter22' });
  api.openLockPrompt(record.key, target);
  api.find('lock-unlock-value').value = '4321';
  await api.submitLockStep();
  assert.match(api.find('lock-unlock-step').textContent, /Step 2 of 2/u);
  api.find('lock-unlock-value').value = 'wrong';
  await api.submitLockStep();
  assert.match(api.find('lock-unlock-step').textContent, /Step 1 of 2/u,
    'a wrong second factor left the first one banked');
});

test('finishing every step opens the lock, and one step short does not', async () => {
  const { api, record, target } = await withLock({ policy: 'pin+password', pin: '4321', password: 'hunter22', duration: 'session' });
  api.openLockPrompt(record.key, target);
  api.find('lock-unlock-value').value = '4321';
  await api.submitLockStep();
  assert.equal(api.lockIsOpen(record.key, Date.now()), false, 'one factor of two opened the lock');
  api.find('lock-unlock-value').value = 'hunter22';
  assert.deepEqual(await api.submitLockStep(), { ok: true, why: 'open' });
  assert.equal(api.lockIsOpen(record.key, Date.now()), true, 'every factor matched and the lock stayed shut');
  assert.equal(target.dataset.locked, undefined, 'the element was not unmarked when its lock opened');
  assert.equal(api.find('lock-unlock-value').value, '', 'the prompt kept the value after it closed');
});

test('a real one-time code opens the lock and a stale one does not', async () => {
  /* The whole point of a one-time-code factor: acceptance is time-based rather than
   * "any six digits". The codes here are computed by the same extracted source the
   * lock verifies with, at instants this test chooses. */
  const api = load();
  const totp = { secret: 'JBSWY3DPEHPK3PXP', algorithm: 'SHA-1', digits: 6, period: 30 };
  const record = await makeRecord(api, { policy: 'pin+totp', pin: '4321', totp });
  const now = 1_700_000_000_000;
  const current = await api.authGenerateCode(totp, now);
  assert.match(current, /^\d{6}$/u);
  assert.equal(await api.lockVerifyFactor(record, 'totp', current, now), true, 'a current code was refused');
  const stale = await api.authGenerateCode(totp, now - 5 * 30 * 1000);
  assert.notEqual(stale, current, 'the two instants produced the same code, so this would prove nothing');
  assert.equal(await api.lockVerifyFactor(record, 'totp', stale, now), false, 'a code five steps old was accepted');
  assert.equal(await api.lockVerifyFactor(record, 'totp', 'abcdef', now), false, 'a non-numeric code was accepted');
  /* And a code from the neighbouring step IS accepted, because a clock a second out
   * either way is the ordinary case rather than an attack. */
  const neighbour = await api.authGenerateCode(totp, now - 30 * 1000);
  assert.equal(await api.lockVerifyFactor(record, 'totp', neighbour, now), true,
    'a code from the immediately preceding step was refused, so an ordinary clock difference locks somebody out');
});

test('the keypad and the text field are one submission, spending one budget', () => {
  /* Two entry routes that could disagree about what is acceptable, or spend separate
   * budgets, would be two locks wearing one name. */
  const source = featureSource();
  assert.equal(source.split("$('lock-unlock-value')?.value||''").length - 1, 1,
    'the offered value is now read in more than one place, so the keypad and the field could diverge');
  assert.ok(source.includes('if(digit)value.value=`${value.value}${digit}`;'),
    'the keypad no longer writes into the same field the submission reads');
  assert.equal(source.split('lockNoteAttempt(').length - 1, 2,
    'the attempt budget is spent from somewhere other than the single submission path');
});

test('the attempt budget is bounded, honest, and never deletes or escalates', async () => {
  const { api, record, target } = await withLock({ pin: '4321' });
  api.openLockPrompt(record.key, target);
  const messages = [];
  for (let attempt = 0; attempt < api.LOCK_ATTEMPT_BUDGET; attempt += 1) {
    api.find('lock-unlock-value').value = '0000';
    // eslint-disable-next-line no-await-in-loop
    await api.submitLockStep();
    messages.push(api.find('lock-unlock-status').textContent);
  }
  assert.match(messages[0], /did not match\. 4 tries left/u, 'the first refusal does not say how many tries are left');
  assert.match(messages.at(-1), /waits 60 seconds/u, 'running out of tries does not say how long it now waits');
  for (const message of messages) {
    assert.match(message, /Nothing was deleted/u, 'a refusal does not say that nothing was deleted');
  }
  api.find('lock-unlock-value').value = '4321';
  assert.deepEqual(await api.submitLockStep(), { ok: false, why: 'rate-limited' },
    'the correct value was accepted while the budget was exhausted');
  assert.equal(api.lockIsOpen(record.key, Date.now()), false, 'the lock opened while rate-limited');
});

test('the budget refills after its window, and a success clears it outright', () => {
  const api = load();
  const start = 1_000_000;
  const spent = { count: api.LOCK_ATTEMPT_BUDGET, firstAt: start, blockedUntil: start + api.LOCK_ATTEMPT_WINDOW_MS };
  assert.equal(api.lockAttemptVerdict(spent, start + 1).allowed, false);
  assert.equal(api.lockAttemptVerdict(spent, start + api.LOCK_ATTEMPT_WINDOW_MS + 1).allowed, true,
    'the wait never ends, which would be a lockout rather than a speed bump');
  api.lockNoteAttempt('k', start);
  assert.equal(api.lockAttemptVerdict({ count: 1, firstAt: start, blockedUntil: 0 }, start).remaining, api.LOCK_ATTEMPT_BUDGET - 1);
  api.lockClearAttempts('k');
  assert.equal(api.lockAttemptVerdict(undefined, start).remaining, api.LOCK_ATTEMPT_BUDGET);
});

test('the credential compare reads every character rather than stopping at the first difference', () => {
  const api = load();
  assert.match(functionSource('lockCredentialVerdict'), /for\(let index=0;index<digestHex\.length;index\+=1\)difference\|=/u,
    'the compare now short-circuits, so how long it takes says how much of the value was right');
  assert.deepEqual(api.lockCredentialVerdict(null, 'aa'), { open: false, why: 'no-credential' });
  assert.deepEqual(api.lockCredentialVerdict({ digestHex: 'aa' }, ''), { open: false, why: 'no-digest' });
  assert.deepEqual(api.lockCredentialVerdict({ digestHex: 'aa' }, 'aaa'), { open: false, why: 'wrong-value' });
  assert.deepEqual(api.lockCredentialVerdict({ digestHex: 'aa' }, 'aa'), { open: true, why: 'match' });
});

/* ================================================================== *
 * Unlock duration, and locked-on-launch.
 * ================================================================== */

test('the three durations behave as they say, and none of them is written down', () => {
  const api = load();
  assert.deepEqual(api.LOCK_DURATIONS.map((entry) => entry.id), ['once', 'minutes', 'session']);
  const now = 5_000;
  assert.equal(api.lockOpenVerdict({ mode: 'once', uses: 0 }, now).open, true);
  assert.equal(api.lockOpenVerdict({ mode: 'once', uses: 1 }, now).open, false, '"just this once" survived its one use');
  assert.equal(api.lockOpenVerdict({ mode: 'session' }, now).open, true);
  assert.equal(api.lockOpenVerdict({ mode: 'minutes', until: now + 1 }, now).open, true);
  assert.equal(api.lockOpenVerdict({ mode: 'minutes', until: now - 1 }, now).open, false, 'a timed unlock never expires');
  assert.equal(api.lockOpenVerdict(undefined, now).open, false);
  assert.equal(api.lockOpenVerdict({ mode: 'forever' }, now).open, false, 'an unknown mode was treated as open');
  /* The whole open-state map is in memory, so a reload relocks everything. That is the
   * canonical locked-on-launch default arriving as a property of the code rather than
   * as a fourth option somebody has to remember to pick. */
  assert.equal(featureSource().split('writeLocal(').length - 1, 1, 'something beyond the record map is now persisted');
  assert.ok(featureSource().includes('const lockOpened=new Map();'), 'the open-state map is no longer in memory only');
});

test('"just this once" really is once: the use is counted on the activation that follows', () => {
  const api = load({ stored: { 'settings::#settings-reset': SHUT_PIN_LOCK } });
  const target = makeTarget();
  api.body.append(target);
  api.ensureLockUI();
  const key = 'settings::#settings-reset';
  api.lockGrant(key, api.lockRecordFor(key), Date.now());
  api.applyLocks();
  assert.equal(api.lockIsOpen(key, Date.now()), true);
  api.lockGuard({ type: 'click', target, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} });
  assert.equal(api.lockIsOpen(key, Date.now()), false, 'a one-use unlock survived the use it was granted for');
});

test('Lock again exists and relocks without touching the stored record', () => {
  const api = load({ stored: { 'settings::#settings-reset': { ...SHUT_PIN_LOCK, duration: 'session' } } });
  const key = 'settings::#settings-reset';
  api.lockGrant(key, api.lockRecordFor(key), Date.now());
  assert.equal(api.lockIsOpen(key, Date.now()), true);
  api.lockRelock(key);
  assert.equal(api.lockIsOpen(key, Date.now()), false);
  assert.ok(api.lockRecordFor(key), 'relocking deleted the record rather than closing the lock');
  assert.ok(featureSource().includes('data-lock-relock="'), 'the list offers no way to lock an opened element again');
});

test('each duration describes itself, and the description names what it actually does', () => {
  const api = load();
  assert.match(api.lockOpenDescription({ duration: 'once' }), /open for one use/u);
  assert.match(api.lockOpenDescription({ duration: 'minutes', minutes: 7 }), /7 minutes, or until this page is reloaded/u);
  assert.match(api.lockOpenDescription({ duration: 'session' }), /until this page is closed or reloaded/u);
});

/* ================================================================== *
 * Creating one.
 * ================================================================== */

test('the wizard refuses every incomplete draft with the exact reason, and each reason has copy', () => {
  const api = load();
  const base = { policy: 'pin', key: 'settings::#a', count: 0, hasDigest: true, pin: '4321', pinConfirm: '4321', duration: 'once' };
  const cases = [
    [{ ...base, policy: '' }, 'no-policy'],
    [{ ...base, key: '' }, 'no-element'],
    [{ ...base, alreadyLocked: true }, 'already-locked'],
    [{ ...base, count: api.LOCK_ENTRY_LIMIT }, 'too-many'],
    [{ ...base, hasDigest: false }, 'no-digest-available'],
    [{ ...base, pin: 'abcd', pinConfirm: 'abcd' }, 'pin-not-digits'],
    [{ ...base, pin: '1', pinConfirm: '1' }, 'pin-too-short'],
    [{ ...base, pin: '1'.repeat(api.LOCK_PIN_MAX + 1), pinConfirm: '1'.repeat(api.LOCK_PIN_MAX + 1) }, 'pin-too-long'],
    [{ ...base, pinConfirm: '9999' }, 'pin-mismatch'],
    [{ ...base, policy: 'password', password: 'a', passwordConfirm: 'a' }, 'password-too-short'],
    [{ ...base, policy: 'password', password: 'a'.repeat(api.LOCK_PASSWORD_MAX + 1), passwordConfirm: 'a'.repeat(api.LOCK_PASSWORD_MAX + 1) }, 'password-too-long'],
    [{ ...base, policy: 'password', password: 'hunter22', passwordConfirm: 'hunter23' }, 'password-mismatch'],
    [{ ...base, policy: 'pin+totp', totpSecret: '' }, 'totp-missing'],
    [{ ...base, policy: 'pin+totp', totpSecret: '!!!!' }, 'totp-unreadable'],
    [{ ...base, duration: 'forever' }, 'no-duration'],
  ];
  for (const [input, why] of cases) {
    const verdict = api.lockSetupVerdict(input);
    assert.equal(verdict.ok, false, `${why} was accepted`);
    assert.equal(verdict.why, why);
    assert.ok(api.LOCK_SETUP_REASON[why], `${why} has no sentence a reader could act on`);
  }
  assert.deepEqual(api.lockSetupVerdict(base), { ok: true, why: 'ready' }, 'a complete draft was refused');
});

test('the wizard status line and the create path ask the same question', () => {
  /* Pure, so the sentence a reader sees and the button they press cannot disagree. */
  const source = featureSource();
  assert.equal(source.split('lockSetupVerdict(').length - 1, 3,
    'lockSetupVerdict is now called from an unexpected number of places -- check the status line and the create path still share it');
  assert.ok(source.includes("const verdict=lockSetupVerdict(fields);\n    const button=$('lock-wizard-create');\n    if(button)button.disabled=!verdict.ok;"),
    'the create button is no longer disabled from the same verdict the status line is written from');
});

test('creating a lock writes it, marks the element, records history and says what it is', async () => {
  const api = load();
  const target = makeTarget();
  api.body.append(target);
  api.register(target);
  api.ensureLockUI();
  api.openLockWizard({ element: target, name: 'Reset settings', kind: 'control' });
  api.find('lock-wizard-policy').value = 'pin';
  api.find('lock-wizard-pin').value = '4321';
  api.find('lock-wizard-pin-confirm').value = '4321';
  api.find('lock-wizard-duration').value = 'session';
  const created = await api.createLockFromWizard();
  assert.ok(created, 'a complete draft did not create a lock');
  assert.equal(created.key, 'settings::#settings-reset');
  assert.equal(api.lockCount(), 1);
  assert.equal(target.dataset.locked, '1', 'the element was not marked as locked straight away');
  assert.deepEqual(api.record.history.map((entry) => entry.action), ['lock-created']);
  assert.match(api.record.history[0].summary, /Reset settings/u, 'the history entry does not name what was locked');
  assert.doesNotMatch(JSON.stringify(api.record.history), /4321/u, 'the history entry carries the value');
  assert.doesNotMatch(JSON.stringify(api.record.notifications), /4321/u, 'the message box carries the value');
  assert.match(api.record.notifications[0].message, /speed bump, not a security boundary/u,
    'the message announcing a new lock does not say what kind of lock it is');
  const written = JSON.parse(api.storage.getItem('ding-pbx-pages-locks-v1'));
  assert.deepEqual(Object.keys(written), ['settings::#settings-reset']);
  /* Per field, for the same reason as the record test above: four decimal digits turn
   * up inside a 64-character hex digest often enough to make a substring scan flaky. */
  assert.ok(!Object.values(written['settings::#settings-reset'].factors.pin).includes('4321'),
    'the stored record carries the value itself');
});

test('the wizard clears every value field when it closes and returns focus to the element', async () => {
  const api = load();
  const target = makeTarget();
  api.body.append(target);
  api.register(target);
  api.ensureLockUI();
  api.openLockWizard({ element: target, name: 'Reset settings', kind: 'control' });
  api.find('lock-wizard-pin').value = '4321';
  api.find('lock-wizard-password').value = 'hunter22';
  api.find('lock-wizard-totp-secret').value = 'JBSWY3DPEHPK3PXP';
  api.closeLockWizard();
  for (const id of ['lock-wizard-pin', 'lock-wizard-password', 'lock-wizard-totp-secret']) {
    assert.equal(api.find(id).value, '', `${id} still holds a value after the wizard closed`);
  }
  assert.equal(target.focused, 1, 'closing the wizard did not return focus to the element it was opened on');
});

test('the wizard shows only the factors the chosen method asks for', () => {
  const api = load();
  const target = makeTarget();
  api.body.append(target);
  api.register(target);
  api.ensureLockUI();
  api.openLockWizard({ element: target, name: 'Reset settings', kind: 'control' });
  const shown = () => ({
    pin: !api.find('lock-wizard-pin-block').hidden,
    password: !api.find('lock-wizard-password-block').hidden,
    totp: !api.find('lock-wizard-totp-block').hidden,
  });
  for (const policy of api.LOCK_POLICIES) {
    api.find('lock-wizard-policy').value = policy.id;
    api.renderLockWizard();
    assert.deepEqual(shown(), {
      pin: policy.factors.includes('pin'),
      password: policy.factors.includes('password'),
      totp: policy.factors.includes('totp'),
    }, `${policy.id} shows the wrong set of fields`);
  }
});

/* ================================================================== *
 * The keypad.
 * ================================================================== */

test('the keypad is in its ordinary order unless the reader asked for a shuffle', () => {
  const api = load();
  assert.deepEqual(api.lockKeypadDigits(false), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']);
  /* A deterministic draw, so this asserts the shuffle rather than a lucky ordering. */
  const shuffled = api.lockKeypadDigits(true, () => 0);
  assert.equal(shuffled.length, 10, 'the shuffle lost or gained a digit');
  assert.deepEqual([...shuffled].sort(), ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  assert.notDeepEqual(shuffled, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], 'the shuffle did not shuffle');
});

test('the shuffle is off by default on a new record, and is recorded per lock', () => {
  const api = load();
  const base = { key: 'settings::#a', policy: 'pin', factors: { pin: { saltHex: 'ab', digestHex: 'cd' } }, duration: 'once' };
  assert.equal(api.lockNormaliseRecord(base).shuffle, false);
  assert.equal(api.lockNormaliseRecord({ ...base, shuffle: true }).shuffle, true);
});

test('the keypad is drawn for a PIN step and not for a password', async () => {
  const { api, record, target } = await withLock({ policy: 'pin+password', pin: '4321', password: 'hunter22' });
  api.openLockPrompt(record.key, target);
  const pad = api.find('lock-unlock-keypad');
  assert.equal(pad.hidden, false, 'the keypad is not drawn for a PIN step');
  assert.equal(pad.querySelectorAll('[data-lock-digit]').length, 10, 'the keypad does not offer ten digits');
  assert.ok(pad.querySelector('#lock-key-back'), 'the keypad has no backspace');
  assert.ok(pad.querySelector('#lock-key-clear'), 'the keypad has no clear');
  api.find('lock-unlock-value').value = '4321';
  await api.submitLockStep();
  assert.equal(pad.hidden, true, 'the keypad is still drawn for a password step');
});

test('every keypad key carries a name of its own, so it is not a picture to a screen reader', async () => {
  const { api, record, target } = await withLock({ pin: '4321' });
  api.openLockPrompt(record.key, target);
  for (const key of api.find('lock-unlock-keypad').querySelectorAll('[data-lock-digit]')) {
    assert.match(key.getAttribute('aria-label') || '', /^Digit \d$/u, 'a keypad key has no accessible name of its own');
  }
});

/* ================================================================== *
 * 3. Honest about what it is.
 * ================================================================== */

test('the recovery route is named in full wherever a value is asked for', () => {
  const api = load();
  assert.match(api.LOCK_RECOVERY_LINE, /Clear this site’s storage/u, 'the recovery line no longer names the route');
  assert.match(api.LOCK_RECOVERY_LINE, /Nothing on this page can give it back/u,
    'the recovery line no longer says nothing can give a value back');
  api.ensureLockUI();
  assert.equal(api.find('lock-wizard-recovery').textContent, api.LOCK_RECOVERY_LINE, 'the wizard does not carry the recovery line');
  assert.equal(api.find('lock-unlock-recovery').textContent, api.LOCK_RECOVERY_LINE, 'the unlock prompt does not carry the recovery line');
  assert.match(settings, /id="locks-recovery-text"/u, 'the card has no recovery region');
  assert.ok(featureSource().includes("$('locks-recovery-text').textContent=LOCK_RECOVERY_LINE"),
    'the card recovery region is on the page and connected to nothing');
});

test('both dialogs say what kind of lock this is, in the same words as the card', () => {
  const api = load();
  assert.match(api.LOCK_TOY_LINE, /speed bump you set for yourself, not a security boundary/u);
  assert.match(api.LOCK_TOY_LINE, /encrypts nothing/u);
  assert.match(api.LOCK_TOY_LINE, /protects nothing from anyone else who has this computer/u);
  api.ensureLockUI();
  assert.equal(api.find('lock-wizard-toy').textContent, api.LOCK_TOY_LINE);
  assert.equal(api.find('lock-unlock-toy').textContent, api.LOCK_TOY_LINE);
});

test('nothing anywhere in the feature calls this secure, protected or encrypted', () => {
  const source = featureSource();
  /* The one direction a joke must never take. Every occurrence has to sit inside a
   * sentence that is denying the claim rather than making it. */
  /* Comment markers and line breaks are collapsed first: this source wraps its
   * comments, so a denial can be split across two lines with a `//` in the middle of
   * it -- and an unnormalised window would report the denial as the claim. */
  const claims = [...source.matchAll(/\b(secure|protects|protected|encrypts|encrypted)\b/giu)]
    .map((match) => source.slice(Math.max(0, match.index - 60), match.index + 70).replace(/\s*\/\/\s*|\s+/gu, ' '));
  assert.ok(claims.length > 0, 'no protection words appear at all, so this scan is vacuous');
  for (const claim of claims) {
    assert.ok(/encrypts nothing|protects nothing|not a security boundary|not served over a secure connection/u.test(claim),
      `the feature makes a protection claim: ...${claim.trim()}...`);
  }
});

test('the card description carries four levels in both languages, and every level keeps all three facts', () => {
  const start = app.indexOf('locksDesc:{en:[');
  assert.notEqual(start, -1, 'the element-lock card has no funny-level copy of its own');
  const block = app.slice(start, app.indexOf(']},', app.indexOf('],zh:[', start)) + 3);
  const english = block.slice(0, block.indexOf('],zh:['));
  const cantonese = block.slice(block.indexOf('],zh:['));
  const levels = (chunk) => chunk.split('\n').filter((line) => /^\s+'/u.test(line));
  assert.equal(levels(english).length, 4, 'the English copy does not carry all four funny levels');
  assert.equal(levels(cantonese).length, 4, 'the Cantonese copy does not carry all four funny levels');
  for (const level of levels(english)) {
    assert.ok(level.includes('not a security boundary'), `an English level stopped saying what this is not: ${level.trim().slice(0, 60)}`);
    assert.ok(level.includes('its own value'), `an English level stopped saying each lock has its own value: ${level.trim().slice(0, 60)}`);
    assert.ok(level.includes('storage'), `an English level stopped naming the recovery route: ${level.trim().slice(0, 60)}`);
  }
  for (const level of levels(cantonese)) {
    assert.ok(level.includes('唔係安全防線'), `a Cantonese level stopped saying what this is not: ${level.trim().slice(0, 40)}`);
    assert.ok(level.includes('自己嘅值'), `a Cantonese level stopped saying each lock has its own value: ${level.trim().slice(0, 40)}`);
    assert.ok(level.includes('儲存空間'), `a Cantonese level stopped naming the recovery route: ${level.trim().slice(0, 40)}`);
  }
  assert.match(settings, /<p id="locks-desc" data-copy="locksDesc">/u, 'the card description is not wired to the funny-level copy');
});

test('the wizard reports a pasted link by its parameters rather than by its secret', () => {
  /* A status line is on screen, in a capture, and in whatever a reader pastes into an
   * issue. This repository has already leaked a live secret into a committed record by
   * writing a pairing link's query string whole. */
  const source = featureSource();
  assert.ok(source.includes('The secret is ${parsed.secret.length} characters and is not shown here.'),
    'the wizard no longer reports a pasted link by length and parameters');
  assert.ok(!source.includes('${parsed.secret}'), 'the wizard writes a pasted secret into a status line');
});

/* ================================================================== *
 * The card: search, bulk, export, removal.
 * ================================================================== */

test('the card carries its own search field and its own anchored regex builder', () => {
  assert.match(settings, /<input id="locks-search" type="search"/u, 'the element-lock list has no search field');
  assert.match(settings, /<button class="regex-trigger" type="button" data-regex-for="locks-search"/u,
    'the element-lock search has no builder anchored beside it');
  assert.match(settings, /id="locks-search-mode-status"/u, 'the search does not say which mode it is in');
  assert.ok(featureSource().includes(",query,'locks-search')"),
    'the list filter does not go through the shared search engine, so its builder would do nothing');
});

test('the list selects through the shared bulk model, and its removal reports what it skipped', () => {
  /* Both properties belong to the bulk-actions contract as well, and are pinned here
   * too on purpose: this file is the one the negative script drives, and a break that
   * only another file catches is a break this file would report as fine. */
  const source = featureSource();
  assert.ok(source.includes('lockSelection=bulkClick(lockSelection,row.dataset.lockRow,'),
    'selecting a row no longer goes through the shared bulk model, so this list would diverge from the other two');
  assert.ok(source.includes("planBulk('Remove',[...lockSelection.selected],lockRemovalVerdict,{destructive:true})"),
    'the bulk removal no longer passes its per-item verdict, so a lock it could not touch would be dropped silently');
  assert.ok(source.includes('summariseBulk(plan)'),
    'the confirmation no longer summarises the plan, so the count and the skipped reasons never reach the reader');
});

test('the search really filters, and a locked element is findable by the word locked', () => {
  const api = load({
    stored: {
      'settings::#a': { key: 'settings::#a', name: 'Theme', kind: 'control', policy: 'pin', factors: { pin: { saltHex: 'ab', digestHex: 'cd' } }, duration: 'once', created: 2 },
      'settings::#b': { key: 'settings::#b', name: 'Density', kind: 'control', policy: 'password', factors: { password: { saltHex: 'ab', digestHex: 'cd' } }, duration: 'once', created: 1 },
    },
  });
  api.renderLocksCard('theme');
  assert.match(api.find('locks-count').textContent, /^1 of 2 locks/u, 'the search did not narrow the list');
  api.renderLocksCard('locked');
  assert.match(api.find('locks-count').textContent, /^2 of 2 locks/u,
    'a locked element is not findable by the word locked, so a search over this page would lose it');
  api.renderLocksCard('');
  assert.match(api.find('locks-count').textContent, /^2 of 2 locks/u);
});

test('the export omits every credential and says that it did', () => {
  const api = load({
    stored: {
      'settings::#a': { key: 'settings::#a', name: 'Theme', kind: 'control', policy: 'pin+totp', factors: { pin: { saltHex: 'abcd', digestHex: 'ef01' }, totp: { secret: 'JBSWY3DPEHPK3PXP' } }, duration: 'minutes', minutes: 7, created: 1 },
    },
  });
  const rows = api.lockExportRows(['settings::#a']);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].credentials, 'omitted', 'a row does not say that its credentials were left out');
  const serialised = JSON.stringify(rows);
  for (const secret of ['abcd', 'ef01', 'JBSWY3DPEHPK3PXP']) {
    assert.ok(!serialised.includes(secret), `${secret} reached an exported row`);
  }
  assert.equal(rows[0].unlockLasts, '7 minutes');
  assert.deepEqual(api.lockExportSummary(), { locks: 1, credentials: 'omitted', storedSeparatelyIn: 'ding-pbx-pages-locks-v1' });
  /* With nothing selected the line says so instead; the disclosure below is about a
   * run that would actually write something. */
  api.lockUpdateExportFormats();
  assert.match(api.find('locks-export-loss').textContent, /Select one or more locks/u,
    'an empty selection does not say that nothing would be written');
  selectRow(api, 'settings::#a');
  assert.match(api.find('locks-export-loss').textContent, /the word omitted where a credential would be/u,
    'the export does not state what it leaves out before it is run');
  assert.ok(api.record.formatCalls > 0, 'the format list is not derived from the shared suitability rules');
});

test('selecting a row goes through the shared bulk model, and an export writes what was selected', () => {
  const api = load({
    stored: {
      'settings::#a': { key: 'settings::#a', name: 'Theme', kind: 'control', policy: 'pin', factors: { pin: { saltHex: 'ab', digestHex: 'cd' } }, duration: 'once', created: 1 },
    },
  });
  api.initLocks();
  selectRow(api, 'settings::#a');
  assert.match(api.find('locks-selection-status').textContent, /1 selected of 1/u, 'clicking a row selected nothing');
  fire(api.find('locks-export-selected'), 'click', {});
  assert.equal(api.record.downloads.length, 1, 'exporting the selection wrote nothing');
  assert.doesNotMatch(api.record.downloads[0].text, /cd|ab/u, 'the written file carries a digest or a salt');
  assert.match(api.record.notifications.at(-1).message, /every credential left out/u,
    'the export does not say what it left out after it has run');
});

test('Export everything says it does not write the locks, rather than leaving the absence silent', () => {
  assert.match(settings, /id="export-everything-excluded"/u);
  assert.match(settings, /Element locks are left out for the same reason/u,
    'the export-everything dialog no longer says the locks are excluded');
});

test('a lock cannot be removed until it has been opened, and the skip is reported by reason', () => {
  const api = load({
    stored: {
      'settings::#a': { key: 'settings::#a', name: 'Theme', kind: 'control', policy: 'pin', factors: { pin: { saltHex: 'ab', digestHex: 'cd' } }, duration: 'session', created: 1 },
    },
  });
  assert.match(api.lockRemovalVerdict('settings::#a'), /open it first/u,
    'a shut lock can be removed, which would be the way around every lock at once');
  assert.deepEqual(api.lockRemove(['settings::#a']), [], 'a shut lock was removed anyway');
  assert.equal(api.lockCount(), 1);
  api.lockGrant('settings::#a', api.lockRecordFor('settings::#a'), Date.now());
  assert.equal(api.lockRemovalVerdict('settings::#a'), true);
  assert.equal(api.lockRemove(['settings::#a']).length, 1);
  assert.equal(api.lockCount(), 0);
  assert.deepEqual(api.record.history.map((entry) => entry.action), ['lock-removed']);
  assert.equal(api.lockRemovalVerdict('settings::#a'), 'that lock is already gone');
});

test('removing a lock writes the whole remaining map, so a removal survives a reload', () => {
  const api = load({
    stored: {
      'settings::#a': { key: 'settings::#a', policy: 'pin', factors: { pin: { saltHex: 'ab', digestHex: 'cd' } }, duration: 'session', created: 1 },
      'settings::#b': { key: 'settings::#b', policy: 'pin', factors: { pin: { saltHex: 'ab', digestHex: 'cd' } }, duration: 'session', created: 2 },
    },
  });
  api.lockGrant('settings::#a', api.lockRecordFor('settings::#a'), Date.now());
  api.lockRemove(['settings::#a']);
  assert.deepEqual(Object.keys(JSON.parse(api.storage.getItem('ding-pbx-pages-locks-v1'))), ['settings::#b']);
});

/* ================================================================== *
 * The surfaces exist, are wired, and are shaped like the rest of the site.
 * ================================================================== */

test('both dialogs are built once, are labelled, and are anchored rather than modal', () => {
  const api = load();
  api.ensureLockUI();
  const built = api.body.children.filter((child) => child.tagName === 'DIALOG');
  assert.deepEqual(built.map((child) => child.id), ['lock-wizard', 'lock-unlock']);
  for (const dialog of built) {
    assert.ok(dialog.getAttribute('aria-labelledby'), `${dialog.id} is not labelled by its own heading`);
    assert.ok(dialog.querySelector('.dialog-heading'), `${dialog.id} has no heading bar`);
    assert.ok(dialog.querySelector('h2'), `${dialog.id} has no heading`);
  }
  api.ensureLockUI();
  assert.equal(api.body.children.filter((child) => child.tagName === 'DIALOG').length, 2, 'building twice made four dialogs');
  /* Non-modal, and positioned beside the element. `showModal` would centre it over the
   * page and trap focus, which is not what an anchored per-element surface is. */
  assert.ok(!featureSource().includes('showModal'), 'a lock dialog is now modal rather than anchored');
  assert.ok(featureSource().includes('if(dialog.show)dialog.show()'), 'the dialogs are no longer opened non-modally');
});

test('an anchored dialog stays inside the viewport and scrolls rather than painting off the edge', () => {
  const api = load();
  api.ensureLockUI();
  const dialog = api.find('lock-wizard');
  dialog.rect = { left: 0, top: 0, width: 400, height: 2000 };
  const target = makeTarget();
  target.rect = { left: 1180, top: 780, bottom: 790, right: 1200, width: 20, height: 10 };
  api.body.append(target);
  api.lockAnchor(dialog, target);
  assert.ok(Number.parseInt(dialog.style.left, 10) + 400 <= 1200, 'the dialog painted off the right edge');
  assert.ok(Number.parseInt(dialog.style.maxHeight, 10) <= 800, 'the dialog is taller than the viewport');
  assert.equal(dialog.style.overflowY, 'auto',
    'a dialog too tall for the viewport does not scroll, so its buttons would be unreachable');
});

test('the right-click command is wired to the wizard, with a printed shortcut', () => {
  assert.match(app, /\{id:'lock-element',label:'Lock this element…',chord:chord\('k',\{alt:true,shift:true\}\),kinds:'any',/u,
    'the lock command lost its shortcut, or is no longer offered for every kind of element');
  assert.match(app, /\{id:'lock-element'[\s\S]{0,400}?run:ctx=>openLockWizard\(ctx\)\}/u,
    'the lock command no longer opens the wizard');
});

test('the feature is started from init(), and applied from applyState() so a reload marks locked elements', () => {
  const line = app.split('\n').find((candidate) => /^\s*function init\(\)\{/u.test(candidate));
  assert.ok(line, 'init() was not found as a single source line');
  assert.match(line, /initLocks\(\);/u, 'nothing starts the element locks');
  assert.doesNotMatch(line, /\/\*[^*]*initLocks\(\)/u, 'the initLocks() call is commented out');
  assert.match(line, /ensureLockUI\(\);/u, 'the lock dialogs are not built before the first applyState()');
  const applyLine = app.split('\n').find((candidate) => /^\s*function applyState\(\)\{/u.test(candidate));
  assert.ok(applyLine, 'applyState() was not found as a single source line');
  assert.match(applyLine, /applyLocks\(\);/u, 'applyState no longer marks locked elements, so a reload would show none');
});

test('the settings card exists, is findable, and is not a decorative shell', () => {
  assert.match(settings, /<article class="setting-card setting-card-stack" id="locks-card"/u, 'the element-locks card is gone');
  assert.match(settings, /data-search="lock locks locked element control pin password one-time code otp toy speed bump unlock keypad"/u,
    'the card lost its settings-search terms');
  for (const id of ['locks-status', 'locks-list', 'locks-search', 'locks-export-format', 'locks-recovery']) {
    assert.match(settings, new RegExp(`id="${id}"`), `#${id} is missing from the element-locks card`);
  }
  assert.match(settings, /Alt<\/kbd>\+<kbd>Shift<\/kbd>\+<kbd>K/u, 'the card no longer tells the reader how to reach the command');
});

test('the status line says what is locked and how many are open, and an empty state says how to start', () => {
  const empty = load();
  empty.applyLocks();
  assert.match(empty.find('locks-status').textContent, /Nothing on this site is locked/u);
  assert.match(empty.find('locks-status').textContent, /Lock this element/u,
    'the empty state does not say how to make the first lock');
  const one = load({ stored: { 'settings::#a': { ...SHUT_PIN_LOCK, key: 'settings::#a', duration: 'session' } } });
  one.applyLocks();
  assert.match(one.find('locks-status').textContent, /1 element locked on this site, 0 of them open right now/u);
  one.lockGrant('settings::#a', one.lockRecordFor('settings::#a'), Date.now());
  one.applyLocks();
  assert.match(one.find('locks-status').textContent, /1 of them open right now/u);
});

test('an unreadable record is reported rather than silently dropped', () => {
  const api = load({ stored: { 'settings::#a': { key: 'settings::#a', policy: 'telepathy' } } });
  api.applyLocks();
  assert.match(api.find('locks-status').textContent, /1 unreadable record was dropped at load/u,
    'a record that could not be read vanished without saying so');
});

test('the feature has stylesheet rules of its own, including a touch-sized keypad', () => {
  assert.match(css, /^\.lock-keypad\{display:grid/mu, 'the keypad has no layout rule');
  assert.match(css, /^\.lock-key\{[^}]*min-height:48px;min-width:48px/mu, 'the keypad keys are below a usable touch size');
  assert.match(css, /^\.lock-key:focus-visible\{outline:2px solid/mu, 'the keypad keys have no visible focus');
  assert.match(css, /^\.locked-element\[aria-disabled="true"\]\{/mu, 'a locked element looks exactly like an unlocked one');
  assert.match(css, /^\.lock-list\{display:flex/mu, 'the list has no rule of its own');
  assert.match(css, /@media\(max-width:620px\)\{\.lock-entry\{flex-wrap:wrap\}/u, 'the list does not reflow at a narrow width');
});

/* ================================================================== *
 * The registries and the article say what the code does.
 * ================================================================== */

test('the site feature registry carries a row for per-element-toy-locks', () => {
  assert.ok(registry.features['per-element-toy-locks'], 'no per-element-toy-locks row in site/feature-registry.json');
});

test('the registry records the feature as implemented and names the files it lives in', () => {
  const row = registry.features['per-element-toy-locks'];
  assert.equal(row.status, 'implemented-unverified');
  assert.deepEqual([...row.implementation.paths].sort(), ['site/app.js', 'site/settings.html', 'site/styles.css'].sort());
  assert.ok(row.implementation.symbols.some((symbol) => symbol.name === 'LOCK_POLICIES'), 'the registry omits the lock policy source symbol');
  assert.match(row.note, /capture-phase interception/u, 'the registry note does not record how the refusal is done');
  assert.match(row.note, /ding-pbx-pages-locks-v1/u, 'the registry note does not name the storage key');
});

test('the localization registry records the card copy rather than claiming untranslated coverage', () => {
  const row = locales.features['per-element-toy-locks'];
  assert.equal(row.state, 'localized');
  assert.deepEqual(row.copyKeys, ['locksDesc']);
  assert.ok(locales.knownCopyKeys.includes('locksDesc'), 'locksDesc is missing from the recorded COPY keys');
});

test('the article records what the site half does, and does not claim a browser run it has not had', () => {
  const websiteLine = article.split('\n').find((line) => line.startsWith('**Documentation website:**'));
  assert.ok(websiteLine, 'the website status line is no longer a single line beginning with its own label');
  assert.match(websiteLine, /^\*\*Documentation website:\*\* Implemented/u, 'the article still says the website has no locks');
  assert.match(article, /clear(?:ing)? this site.s storage/iu, 'the article does not name the website recovery route');
  assert.match(article, /Not verified in a browser/u,
    'the article no longer says plainly that none of this has been run in a real browser');
  assert.match(article, /no screen reader has announced a locked control/u,
    'the article stopped naming what specifically was never exercised');
});
