/**
 * Contract: in-context recovery on the pages-site.
 *
 * This file used to pin an absence, and re-derived that absence from the real source
 * every run so that a claim of "implemented" could not be made without somebody having
 * to explain themselves first. The feature now exists, so the absence assertions are
 * gone and what replaces them is the set of properties that make it the canonical
 * contract rather than a coloured box with an apology in it.
 *
 * Most of the file is about five things, because those are the ones that are easy to
 * ship broken with nothing complaining:
 *
 *   - the region is rendered as the IMMEDIATE NEXT SIBLING of the status line that
 *     reported the failure. "Beside the control that failed, not in a menu elsewhere"
 *     is the whole canonical clause, and a region appended to the end of a card, or
 *     dropped at the top of the page, would look entirely correct in a screenshot;
 *   - every action offered is a capability this page really has. `recoveryFor` is pure
 *     and names ids, `RECOVERY_ACTIONS` holds the real implementations, and every id a
 *     route can emit under any context is checked against that map. A button that looks
 *     like it retries and does not is this repository's decorative-control defect
 *     wearing a helpful face;
 *   - the one route with nothing to offer says so and says why. That is the assertion
 *     a fake retry button would quietly satisfy, so it is checked directly: no actions,
 *     a real reason, and nothing in the reason that reads as an invitation to try again;
 *   - every write this page makes to local storage goes through the one guarded writer.
 *     That is a source-wide scan rather than a behavioural test, because the defect it
 *     prevents is a `setItem` somebody adds next year, not one that is here today;
 *   - the wiring lines. A route that is never raised is a feature that exists and never
 *     happens, which is the oldest recurring defect in this repository and produces no
 *     error and no failing test. Every one of those is anchored to a whole line, and
 *     each is separately checked not to be sitting behind a comment.
 *
 * The behavioural half runs the real extracted source over a recording DOM and a fake
 * storage, in the style school-mode.test.mjs and narration.test.mjs established here.
 * That matters especially for this feature: "the route exists in the table" is true of
 * a route that never reaches a pixel, and a source-pattern test cannot tell those apart.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoConsole = resolve(siteRoot, '..');
/* CRLF stripped before anything is matched across lines. A newline-only pattern against
 * a CRLF checkout matches nothing, and an assertion that matches nothing passes in the
 * one direction nobody notices. */
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));
const readConsole = (p) => readFileSync(resolve(repoConsole, p), 'utf8').replaceAll('\r\n', '\n');

const app = read('app.js');
const css = read('styles.css');
const registry = json('feature-registry.json');
const locales = json('locales/feature-registry.json');
const article = readConsole('docs/platform/in-context-recovery.md');

/* ------------------------------------------------------------------ *
 * Reading the real source.
 * ------------------------------------------------------------------ */

const RECOVERY_FROM = '  const RECOVERY_FORBIDDEN={';
const RECOVERY_TO = '  // Restricted presentation -- shipped as "School mode"';

/** The whole contiguous recovery block, comments and all. */
function recoveryBlock() {
  const start = app.indexOf(RECOVERY_FROM);
  assert.notEqual(start, -1, `${RECOVERY_FROM} is no longer declared in site/app.js`);
  const end = app.indexOf(RECOVERY_TO, start);
  assert.notEqual(end, -1, `${RECOVERY_TO} no longer follows the recovery block in site/app.js`);
  return app.slice(start, end);
}

/** One brace-balanced function declaration, by name. */
function functionSource(src, name) {
  let start = src.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `function ${name} is not declared in site/app.js`);
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

/** The single physical line carrying `needle`, refusing anything that is not exactly one. */
function lineWith(needle) {
  const lines = app.split('\n').filter((line) => line.includes(needle));
  assert.equal(lines.length, 1, `expected exactly one line carrying ${JSON.stringify(needle)}, found ${lines.length}`);
  return lines[0];
}

/**
 * A whole-line anchor that also refuses a commented-out call.
 *
 * A bare substring needle is satisfied by `// thing()`, and commenting out is how a
 * wiring line usually dies -- nobody deletes it, they put two slashes in front of it
 * while chasing something else and never take them off again.
 */
function assertLiveCall(needle, why) {
  const line = lineWith(needle);
  const before = line.slice(0, line.indexOf(needle));
  assert.doesNotMatch(before, /\/\//u, `${why} -- the call is sitting behind a line comment`);
  assert.doesNotMatch(before, /\/\*[^*]*$/u, `${why} -- the call is sitting inside a block comment`);
  return line;
}

const BLOCK_DECLARATIONS = [
  'const RECOVERY_FORBIDDEN=', 'const RECOVERY_HISTORY_KEEP=', 'const FAILURE_ROUTES=',
  'const FAILURES_WITHOUT_A_ROUTE=', 'const RECOVERY_ACTIONS=',
  'function recoveryRoute(', 'function recoveryFor(', 'function secureAddressOf(',
  'function openedFromLabel(', 'function localCharacters(', 'function storageFailureContext(',
  'function writeLocal(', 'function storageRefusalReason(', 'function reportWrite(',
  'function pruneLocalHistory(', 'function searchPlainlyInstead(', 'function recoveryHost(',
  'function renderRecovery(', 'function reportFailure(',
  'function clearRecovery(', 'function reportSchoolCannotArm(',
];

test('the extracted block is the real thing and is not silently short, or every behavioural test below is about nothing', () => {
  const block = recoveryBlock();
  assert.ok(block.length > 8000, `the extracted block measured only ${block.length} characters -- too small to be the real feature`);
  for (const declaration of BLOCK_DECLARATIONS) {
    assert.ok(block.includes(declaration), `the extracted block no longer contains ${declaration}`);
  }
});

/* ------------------------------------------------------------------ *
 * A recording DOM.
 * ------------------------------------------------------------------ */

class FakeElement {
  constructor(tag, id) {
    this.tag = String(tag || '').toLowerCase();
    this.id = id || '';
    this.nodeType = 1;
    this.childNodes = [];
    this.parentNode = null;
    this.className = '';
    this.type = '';
    this.href = '';
    this.value = '';
    this.hidden = false;
    this.dataset = {};
    this.attributes = {};
    this.listeners = new Map();
    this.clicks = 0;
    this.focuses = 0;
    this.ownText = '';
  }

  get textContent() {
    if (this.childNodes.length === 0) return this.ownText;
    return this.childNodes.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    this.childNodes.forEach((child) => { child.parentNode = null; });
    this.childNodes = [];
    this.ownText = String(value);
  }

  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.childNodes.push(child);
    }
    return children[children.length - 1];
  }

  prepend(child) { child.parentNode = this; this.childNodes.unshift(child); return child; }

  replaceChildren() {
    this.childNodes.forEach((child) => { child.parentNode = null; });
    this.childNodes = [];
    this.ownText = '';
  }

  insertBefore(next, reference) {
    const at = reference === null ? this.childNodes.length : this.childNodes.indexOf(reference);
    assert.notEqual(at, -1, 'insertBefore was called with a reference node that is not a child');
    this.childNodes.splice(at, 0, next);
    next.parentNode = this;
    return next;
  }

  removeChild(child) {
    const at = this.childNodes.indexOf(child);
    assert.notEqual(at, -1, 'removeChild was called with a node that is not a child');
    this.childNodes.splice(at, 1);
    child.parentNode = null;
    return child;
  }

  get nextSibling() {
    if (!this.parentNode) return null;
    const at = this.parentNode.childNodes.indexOf(this);
    return this.parentNode.childNodes[at + 1] ?? null;
  }

  setAttribute(name, value) { this.attributes[name] = String(value); }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
  }

  addEventListener(name, handler) {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push(handler);
  }

  dispatchEvent(event) {
    (this.listeners.get(event.type) || []).forEach((handler) => handler(event));
    return true;
  }

  click() { this.clicks += 1; this.dispatchEvent({ type: 'click' }); }

  focus() { this.focuses += 1; }
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

function flatten(root) {
  const out = [];
  for (const child of root.childNodes) {
    if (child.nodeType !== 1) continue;
    out.push(child, ...flatten(child));
  }
  return out;
}

/**
 * A page carrying `main`, the anchored status lines and the controls the routes reach
 * for, and nothing else.
 *
 * Built rather than parsed, deliberately: the markup assertions elsewhere check the real
 * settings.html, and a parser here would only be a second, weaker copy of them.
 */
function buildPage({ withLogoControls = true, withHistoryDialog = true, surfaces = null } = {}) {
  const root = new FakeElement('body', 'root');
  const main = root.append(new FakeElement('main', 'main'));

  const present = surfaces || ['vocabulary-status', 'logo-status', 'update-status', 'school-status', 'regex-feedback'];

  const vocabularyCard = main.append(new FakeElement('article', 'settings-vocabulary-card'));
  vocabularyCard.append(new FakeElement('input', 'vocabulary-file'));
  vocabularyCard.append(new FakeElement('button', 'vocabulary-clear'));
  if (present.includes('vocabulary-status')) vocabularyCard.append(new FakeElement('p', 'vocabulary-status'));
  /* Deliberately NOT the last child: a region appended to the end of the card would pass
   * a "the region is inside the right card" assertion while sitting nowhere near the
   * control that failed. */
  vocabularyCard.append(new FakeElement('p', 'vocabulary-footnote'));

  const logoCard = main.append(new FakeElement('article', 'settings-logo-card'));
  if (withLogoControls) {
    logoCard.append(new FakeElement('input', 'logo-file'));
    logoCard.append(new FakeElement('button', 'logo-clear'));
  }
  if (present.includes('logo-status')) logoCard.append(new FakeElement('p', 'logo-status'));
  logoCard.append(new FakeElement('p', 'logo-footnote'));

  const updateCard = main.append(new FakeElement('article', 'settings-update-card'));
  if (present.includes('update-status')) updateCard.append(new FakeElement('p', 'update-status'));
  updateCard.append(new FakeElement('button', 'update-check'));

  const schoolCard = main.append(new FakeElement('article', 'school-card'));
  if (present.includes('school-status')) schoolCard.append(new FakeElement('p', 'school-status'));
  schoolCard.append(new FakeElement('p', 'school-suppressed'));

  const regexDialog = main.append(new FakeElement('dialog', 'regex-dialog'));
  regexDialog.append(new FakeElement('input', 'regex-pattern'));
  if (present.includes('regex-feedback')) regexDialog.append(new FakeElement('p', 'regex-feedback'));
  regexDialog.append(new FakeElement('p', 'regex-footnote'));

  if (withHistoryDialog) {
    const historyDialog = main.append(new FakeElement('dialog', 'history-dialog'));
    historyDialog.append(new FakeElement('input', 'history-search'));
  }

  return { root, main };
}

function fakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  let refuse = null;
  return {
    map,
    refuseWith(error) { refuse = error; },
    allow() { refuse = null; },
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { if (refuse) throw refuse; map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
  };
}

class FakeEvent {
  constructor(type) { this.type = String(type); }
}

/**
 * Build a page and run the real recovery block over it.
 *
 * Nothing here is a re-implementation: the block is the bytes in site/app.js, evaluated
 * once, with the surrounding capabilities it reaches for recorded rather than faked away
 * -- every action really calls the thing it claims to call, and the recorder is what
 * says so.
 */
function loadRecovery({
  storage = {}, historyEntries = [], page = {}, base = './',
  here = { protocol: 'https:', host: 'example.invalid', pathname: '/site/settings.html', search: '' },
  copy = 'Here is what this page can do about it.',
} = {}) {
  const { root, main } = buildPage(page);
  const store = fakeStorage(storage);
  const calls = {
    checkForUpdate: [], clearVocabulary: 0, clearLogo: 0, previewRegex: 0,
    saveHistory: 0, renderHistory: [], renderModeStatus: [],
    dialogsOpened: [], dialogsClosed: [], vocabularyApplied: [],
  };

  const document = {
    createElement: (tag) => new FakeElement(tag, ''),
    getElementById: (id) => descendantById(root, id),
    querySelector: (selector) => (selector === 'main' ? main : null),
  };
  const el = (id) => descendantById(root, id);
  const regexState = new Map();
  const historyDialog = descendantById(root, 'history-dialog');
  if (historyDialog) historyDialog.showModal = () => calls.dialogsOpened.push('history-dialog');
  const regexDialog = descendantById(root, 'regex-dialog');
  if (regexDialog) regexDialog.close = () => calls.dialogsClosed.push('regex-dialog');

  const block = recoveryBlock();
  const exported = [
    'RECOVERY_FORBIDDEN', 'RECOVERY_HISTORY_KEEP', 'FAILURE_ROUTES', 'FAILURES_WITHOUT_A_ROUTE',
    'RECOVERY_ACTIONS', 'recoveryRoute', 'recoveryFor', 'secureAddressOf', 'openedFromLabel',
    'localCharacters', 'storageFailureContext', 'writeLocal', 'storageRefusalReason',
    'reportWrite', 'pruneLocalHistory', 'searchPlainlyInstead', 'recoveryHost',
    'renderRecovery', 'reportFailure', 'clearRecovery', 'reportSchoolCannotArm',
  ];
  const body = `${block}\nreturn { ${exported.join(', ')}, get entries(){ return historyEntries } };`;

  // eslint-disable-line no-new-func -- deliberately re-running the real extracted source
  const api = new Function(
    'document', 'el', 'localStorage', 'BASE', 'location', 'Event',
    'HISTORY_KEY', 'STORAGE_KEY', 'historyEntries', 'saveHistory', 'renderHistory',
    'checkForUpdate', 'clearVocabulary', 'clearLogo', 'previewRegex',
    'regexTarget', 'regexState', 'renderModeStatus', 'copyText', 'applyVocabularyToNode',
    'vocabularyReplacements', body,
  )(
    document, el, store, base, here, FakeEvent,
    'ding-pbx-page-history', 'ding-pbx-page-v2', historyEntries.slice(),
    () => { calls.saveHistory += 1; return true; },
    (query) => calls.renderHistory.push(query),
    (options) => calls.checkForUpdate.push(options),
    () => { calls.clearVocabulary += 1; },
    () => { calls.clearLogo += 1; },
    () => { calls.previewRegex += 1; },
    'notification-search', regexState,
    (target) => calls.renderModeStatus.push(target),
    () => copy,
    (node) => calls.vocabularyApplied.push(node),
    () => null,
  );

  const region = (surface) => descendantById(root, `${surface}-recovery`);
  /* `entries` is a function rather than the block's own getter, because spreading `api`
   * INVOKES that getter once and freezes whatever it returned at that moment. Pruning
   * reassigns the binding, so the frozen copy would show the untrimmed history and the
   * test would report a working prune as a broken one. */
  return {
    ...api, root, main, storage: store, calls, regexState, el, region,
    entries: () => api.entries,
    regionTexts: (surface) => flatten(region(surface) ?? new FakeElement('div', '')).map((node) => node.textContent),
  };
}

/* ------------------------------------------------------------------ *
 * The route table: complete, consistent, and with nothing dead in it.
 * ------------------------------------------------------------------ */

/** Every combination of the facts any route reads, so no branch goes unvisited. */
const CONTEXT_MATRIX = [
  {},
  {
    dictionaryLoaded: true, markLoaded: true, secureAddress: 'https://example.invalid/x',
    openedFrom: 'an http address', hasHistoryDialog: true, hasLogoControls: true,
    markCharacters: 900, historyEntries: 400, historyCharacters: 90,
    dictionaryCharacters: 5, settingsCharacters: 5, target: 'a-field',
  },
  {
    dictionaryLoaded: false, markLoaded: false, secureAddress: '',
    openedFrom: 'a file on this computer', hasHistoryDialog: false, hasLogoControls: false,
    markCharacters: 0, historyEntries: 0, historyCharacters: 0,
    dictionaryCharacters: 0, settingsCharacters: 0, target: '',
  },
  { markCharacters: 900, hasLogoControls: false, historyEntries: 400, hasHistoryDialog: false },
  { markCharacters: 0, hasLogoControls: true, historyEntries: 1, hasHistoryDialog: true },
];

test('every route is uniquely identified, anchored to a surface, and headed by a real sentence', () => {
  const h = loadRecovery();
  assert.ok(h.FAILURE_ROUTES.length >= 7, `only ${h.FAILURE_ROUTES.length} routes are declared -- this list has shrunk`);
  const ids = h.FAILURE_ROUTES.map((route) => route.id);
  assert.equal(new Set(ids).size, ids.length, 'two routes share an id, so one of them can never be raised');
  for (const route of h.FAILURE_ROUTES) {
    assert.match(route.id, /^[a-z][a-z-]+$/u, `${route.id} is not a plain lower-case id`);
    assert.ok(route.surface, `${route.id} names no surface, so nothing could ever render it`);
    assert.ok(route.heading && route.heading.length > 10, `${route.id} has no real heading`);
  }
});

test('every action any route can emit, under any combination of facts, has a real implementation', () => {
  /* The property that stops a route naming a button nobody wrote. Derived by running
   * every route's own action function over the matrix rather than by reading the source,
   * so a branch added later is covered by this the day it is added. */
  const h = loadRecovery();
  let seen = 0;
  for (const route of h.FAILURE_ROUTES) {
    for (const context of CONTEXT_MATRIX) {
      for (const action of (route.actions ? route.actions(context) : [])) {
        seen += 1;
        assert.ok(h.RECOVERY_ACTIONS[action.id],
          `${route.id} offers "${action.id}", which is not declared in RECOVERY_ACTIONS -- that button would do nothing`);
        assert.ok(action.label && action.label.length > 3, `${route.id} offers ${action.id} with no real label`);
      }
    }
  }
  assert.ok(seen > 20, `only ${seen} action offers were produced across the whole matrix, so this would be close to vacuous`);
});

test('no action is declared that no route can ever offer, and every declared action is real', () => {
  const h = loadRecovery();
  const offered = new Set();
  for (const route of h.FAILURE_ROUTES) {
    for (const context of CONTEXT_MATRIX) {
      for (const action of (route.actions ? route.actions(context) : [])) offered.add(action.id);
    }
  }
  const declared = Object.keys(h.RECOVERY_ACTIONS);
  assert.ok(declared.length > 0, 'no actions are declared at all, so this would pass vacuously');
  for (const id of declared) {
    assert.ok(offered.has(id), `RECOVERY_ACTIONS declares "${id}" and no route can ever offer it -- it is dead`);
    const implementation = h.RECOVERY_ACTIONS[id];
    assert.ok(implementation.kind === 'action' || implementation.kind === 'link', `${id} is neither an action nor a link`);
    if (implementation.kind === 'action') assert.equal(typeof implementation.run, 'function', `${id} is an action with no function`);
    else assert.equal(typeof implementation.href, 'function', `${id} is a link with no address`);
  }
});

test('every forbidden remedy a route names is declared with what it costs, and none is declared unused', () => {
  const h = loadRecovery();
  const named = new Set();
  for (const route of h.FAILURE_ROUTES) for (const id of (route.forbidden || [])) named.add(id);
  const declared = Object.keys(h.RECOVERY_FORBIDDEN);
  assert.ok(declared.length >= 4, `only ${declared.length} forbidden remedies are declared`);
  for (const id of named) {
    assert.ok(Object.prototype.hasOwnProperty.call(h.RECOVERY_FORBIDDEN, id),
      `a route warns about "${id}", which is not declared -- the warning would silently vanish`);
  }
  for (const id of declared) {
    assert.ok(named.has(id), `"${id}" is declared as a forbidden remedy and no route names it -- it is dead`);
    assert.ok(h.RECOVERY_FORBIDDEN[id].length > 60,
      `"${id}" says it is forbidden without saying what it would cost, which is the half that matters`);
  }
});

test('a route that can offer nothing declares why, so an empty box is never left unexplained', () => {
  const h = loadRecovery();
  for (const route of h.FAILURE_ROUTES) {
    const canBeEmpty = CONTEXT_MATRIX.some((context) => (route.actions ? route.actions(context) : []).length === 0);
    if (!canBeEmpty) continue;
    assert.equal(typeof route.noActionsReason, 'function',
      `${route.id} can produce no actions at all and declares no reason for it`);
    for (const context of CONTEXT_MATRIX) {
      if ((route.actions ? route.actions(context) : []).length > 0) continue;
      assert.ok(String(route.noActionsReason(context) || '').length > 40,
        `${route.id} produced no actions and no real reason for a context it accepts`);
    }
  }
});

test('exactly one route is not anchored to a control, and it is the declared exception', () => {
  /* Every other route belongs beside the status line that reported it. A storage write
   * can be refused during any setting on any page, so there is no one control it belongs
   * beside -- which is a real exception and is allowed to be exactly one. */
  const h = loadRecovery();
  const unanchored = h.FAILURE_ROUTES.filter((route) => route.surface === 'page');
  assert.deepEqual(unanchored.map((route) => route.id), ['local-storage-refused'],
    'a route other than the storage one is now rendering at the top of the page instead of beside its control');
});

test('the failures deliberately left without a route are named, with a reason, and none of them has one', () => {
  const h = loadRecovery();
  assert.ok(h.FAILURES_WITHOUT_A_ROUTE.length > 0, 'nothing is declared, so this would pass vacuously');
  const routed = new Set(h.FAILURE_ROUTES.map((route) => route.id));
  for (const entry of h.FAILURES_WITHOUT_A_ROUTE) {
    assert.ok(entry.id, 'an entry in the no-route list has no id');
    assert.ok(String(entry.why || '').length > 40, `${entry.id} is left without a route and without a reason`);
    assert.ok(!routed.has(entry.id), `${entry.id} is listed as having no route and also has one`);
  }
});

/* ------------------------------------------------------------------ *
 * recoveryFor is pure, and decides everything.
 * ------------------------------------------------------------------ */

test('recoveryFor reads nothing and touches nothing -- every branch is decided by what a caller hands it', () => {
  const source = functionSource(app, 'recoveryFor');
  assert.doesNotMatch(source, /document\./u, 'recoveryFor now touches the document, so it is no longer decidable from its arguments');
  assert.doesNotMatch(source, /localStorage/u, 'recoveryFor now reads storage');
  assert.doesNotMatch(source, /\bel\(/u, 'recoveryFor now looks elements up, so it can no longer be tested from values alone');
  assert.doesNotMatch(source, /location/u, 'recoveryFor now reads the address of the page');
});

test('a failure nobody wrote a route for is refused by name rather than rendered as an empty box', () => {
  const h = loadRecovery();
  const resolved = h.recoveryFor({ id: 'something-nobody-routed' });
  assert.deepEqual(resolved, { ok: false, id: 'something-nobody-routed', why: 'no-route-declared' });
  assert.equal(h.renderRecovery(resolved), false, 'an unrouted failure still rendered something');
});

test('the offered way out changes with the facts: a dictionary that is loaded can be removed, and one that is not cannot', () => {
  const h = loadRecovery();
  const withOne = h.recoveryFor({ id: 'vocabulary-rejected', detail: 'expected schema version 1', context: { dictionaryLoaded: true } });
  const withNone = h.recoveryFor({ id: 'vocabulary-rejected', detail: 'expected schema version 1', context: { dictionaryLoaded: false } });
  assert.deepEqual(withOne.actions.map((a) => a.id), ['choose-vocabulary-file', 'clear-vocabulary']);
  assert.deepEqual(withNone.actions.map((a) => a.id), ['choose-vocabulary-file']);
  assert.match(withOne.note, /still in use/u, 'the note no longer says the earlier dictionary survived the refusal');
  assert.match(withNone.note, /original wording/u, 'the note no longer says what is being read instead');
  assert.equal(withOne.detail, 'expected schema version 1', 'the reason the file was refused was dropped');
});

test('the image route says the same thing about the mark, and offers the same two shapes of way out', () => {
  const h = loadRecovery();
  const withOne = h.recoveryFor({ id: 'logo-rejected', detail: 'file exceeds 128 KiB.', context: { markLoaded: true } });
  const withNone = h.recoveryFor({ id: 'logo-rejected', detail: 'file exceeds 128 KiB.', context: { markLoaded: false } });
  assert.deepEqual(withOne.actions.map((a) => a.id), ['choose-logo-file', 'clear-logo']);
  assert.deepEqual(withNone.actions.map((a) => a.id), ['choose-logo-file']);
  assert.match(withOne.note, /still the mark/u);
  assert.match(withNone.note, /shipped mark/u);
});

test('an unbuilt page offers nothing at all, says why, and does not pretend there is anything to try again', () => {
  /* The assertion a fake retry button would quietly satisfy, so it is made directly.
   * "Try again" here would be a lie somebody could press all day. */
  const h = loadRecovery();
  const resolved = h.recoveryFor({ id: 'page-unbuilt', context: {} });
  assert.deepEqual(resolved.actions, [], 'the unbuilt-page route now offers a control, which could not possibly work');
  assert.ok(resolved.nothingToOffer.length > 60, 'the unbuilt-page route offers nothing and explains nothing');
  assert.match(resolved.nothingToOffer, /nothing to try again/iu, 'the reason no longer says outright that there is nothing to retry');
  assert.doesNotMatch(resolved.nothingToOffer, /press |click |button below/iu,
    'the reason now reads as an invitation to press something, which is the thing this route has none of');
});

test('the restricted-presentation route offers a secure address only when there is one, and names where the page came from when there is not', () => {
  const h = loadRecovery();
  const secure = h.recoveryFor({ id: 'school-cannot-arm', context: { secureAddress: 'https://example.invalid/site/settings.html', openedFrom: 'an http address' } });
  assert.deepEqual(secure.actions.map((a) => a.id), ['open-over-https']);
  const none = h.recoveryFor({ id: 'school-cannot-arm', context: { secureAddress: '', openedFrom: 'a file on this computer' } });
  assert.deepEqual(none.actions, [], 'a page with no secure address still offered to open one');
  assert.match(none.nothingToOffer, /a file on this computer/u, 'the reason no longer names where the page was opened from');
});

test('the storage route offers only the space it can actually free, and names every store with its size', () => {
  const h = loadRecovery();
  const plenty = h.recoveryFor({
    id: 'local-storage-refused',
    detail: 'this page’s settings could not be saved: this browser has no room left for this site.',
    context: {
      markCharacters: 90000, historyEntries: 400, historyCharacters: 12000,
      dictionaryCharacters: 40, settingsCharacters: 900, hasHistoryDialog: true, hasLogoControls: true,
    },
  });
  assert.deepEqual(plenty.actions.map((a) => a.id), ['clear-logo', 'prune-local-history', 'open-local-history']);
  assert.match(plenty.note, /400 entries/u, 'the note no longer says how much of the space is the history');
  assert.match(plenty.note, /90000/u, 'the note no longer says how much of the space is the image');
  /* Characters and not bytes, in those words: a string's length is not its size on disk,
   * and calling it bytes would be a measurement nobody took. */
  assert.match(plenty.note, /in characters/u, 'the note now reports a size it did not measure');

  const bare = h.recoveryFor({
    id: 'local-storage-refused',
    context: {
      markCharacters: 0, historyEntries: 2, historyCharacters: 10,
      dictionaryCharacters: 0, settingsCharacters: 40, hasHistoryDialog: false, hasLogoControls: false,
    },
  });
  assert.deepEqual(bare.actions, [], 'the storage route offered to free space it has none of');
  assert.match(bare.nothingToOffer, /belongs to something else/u);
});

test('resetting the settings is named as the wrong answer to a full store, which is exactly what it is', () => {
  /* Not a stylistic warning. `performSettingsReset` writes `state` and touches neither
   * the history key nor the image cache, so it would lose every setting on this page and
   * free almost none of the space that refused the write. */
  const h = loadRecovery();
  const resolved = h.recoveryFor({ id: 'local-storage-refused', context: {} });
  assert.ok(resolved.forbidden.some((item) => item.id === 'reset-settings'),
    'a full store no longer warns against the one remedy that loses everything and frees nothing');
  const reset = functionSource(app, 'performSettingsReset');
  assert.doesNotMatch(reset, /removeItem/u,
    'performSettingsReset now removes a stored key, so the warning above needs re-deriving by hand');
});

/* ------------------------------------------------------------------ *
 * Where the region goes, which is the whole canonical clause.
 * ------------------------------------------------------------------ */

test('the region is the immediate next sibling of the status line that reported the failure', () => {
  const h = loadRecovery();
  h.reportFailure('vocabulary-rejected', { detail: 'expected schema version 1', context: { dictionaryLoaded: false } });
  const status = h.el('vocabulary-status');
  const region = h.region('vocabulary-status');
  assert.ok(region, 'no region was rendered at all');
  assert.equal(status.nextSibling, region,
    'the region is not immediately after the status line -- "beside the control that failed" is the whole clause');
  assert.equal(region.parentNode, status.parentNode, 'the region left the card the failure happened in');
});

test('the one unanchored route goes to the top of the page being read, not to the end of it', () => {
  const h = loadRecovery();
  h.reportFailure('local-storage-refused', { detail: 'x could not be saved: full.', context: {} });
  const region = h.region('page');
  assert.ok(region, 'the storage route rendered nothing');
  assert.equal(h.main.childNodes[0], region, 'the storage route is no longer the first thing on the page');
});

test('a failure whose surface is not on this page renders nothing at all, rather than somewhere wrong', () => {
  const h = loadRecovery({ page: { surfaces: ['update-status'] } });
  const resolved = h.reportFailure('vocabulary-rejected', { detail: 'nope', context: {} });
  assert.equal(resolved.ok, true, 'the route itself should still resolve; it is the rendering that has nowhere to go');
  assert.equal(h.region('vocabulary-status'), null, 'a region was rendered for a surface that is not on this page');
  assert.equal(flatten(h.root).filter((node) => String(node.className).includes('recovery')).length, 0,
    'a region for a missing surface landed somewhere else on the page');
});

test('raising the same route twice replaces the region rather than stacking a second one under it', () => {
  const h = loadRecovery();
  h.reportFailure('logo-rejected', { detail: 'first reason', context: { markLoaded: false } });
  h.reportFailure('logo-rejected', { detail: 'second reason', context: { markLoaded: true } });
  const regions = flatten(h.root).filter((node) => node.id === 'logo-status-recovery');
  assert.equal(regions.length, 1, `${regions.length} regions are stacked under one status line`);
  const text = h.regionTexts('logo-status').join(' | ');
  assert.match(text, /second reason/u, 'the region still shows the first failure');
  assert.doesNotMatch(text, /first reason/u, 'the first failure is still on screen underneath the second');
});

/* ------------------------------------------------------------------ *
 * What the region is made of.
 * ------------------------------------------------------------------ */

test('the region names itself to assistive technology and is announced when it appears', () => {
  const h = loadRecovery();
  h.reportFailure('update-check-failed', { detail: 'HTTP 503', context: {} });
  const region = h.region('update-status');
  assert.equal(region.getAttribute('role'), 'group');
  assert.equal(region.getAttribute('aria-live'), 'polite',
    'the region is no longer announced, so a listener hears that something failed and never that there is a way out');
  const labelledBy = region.getAttribute('aria-labelledby');
  const heading = flatten(region).find((node) => node.id === labelledBy);
  assert.ok(heading, `aria-labelledby points at ${labelledBy}, which is not in the region`);
  assert.equal(heading.textContent, 'The published version file could not be read');
});

test('every part of the region is written as text, so a reason quoting somebody’s file can never become markup', () => {
  const source = functionSource(app, 'renderRecovery');
  assert.doesNotMatch(source, /innerHTML/u, 'the region is now built from a markup string');
  const h = loadRecovery();
  const hostile = '<img src=x onerror="alert(1)"> & "quoted"';
  h.reportFailure('vocabulary-rejected', { detail: hostile, context: { dictionaryLoaded: false } });
  const detail = flatten(h.region('vocabulary-status')).find((node) => String(node.className) === 'recovery-detail');
  assert.equal(detail.textContent, hostile, 'the reason was not rendered literally');
  assert.equal(detail.childNodes.length, 0, 'the reason produced child elements, which means it was parsed as markup');
});

test('the lead line is the only part the funny sliders reach, and it carries its hook so it stays in step', () => {
  const h = loadRecovery({ copy: 'PLAYFUL LEAD' });
  h.reportFailure('update-check-failed', { detail: 'HTTP 503', context: {} });
  const lead = flatten(h.region('update-status')).find((node) => String(node.className) === 'recovery-lead');
  assert.ok(lead, 'the region has no lead line');
  assert.equal(lead.textContent, 'PLAYFUL LEAD', 'the lead line is not rendered through copyText');
  assert.equal(lead.dataset.copy, 'recoveryLead',
    'the lead line carries no data-copy hook, so changing a slider would leave it at the wording it was built with');
  const facts = flatten(h.region('update-status')).filter((node) => node !== lead && node.dataset.copy);
  assert.deepEqual(facts, [], 'something other than the lead line is now restyled by the sliders -- a fact would move with a slider');
});

test('an action renders as a real button carrying its id, and pressing it runs the real implementation', () => {
  const h = loadRecovery();
  h.reportFailure('local-storage-refused', {
    detail: 'the local history could not be saved: this browser has no room left for this site.',
    context: {
      markCharacters: 10, historyEntries: 400, historyCharacters: 10,
      dictionaryCharacters: 0, settingsCharacters: 0, hasHistoryDialog: true, hasLogoControls: true,
    },
  });
  const buttons = flatten(h.region('page')).filter((node) => node.dataset.recoveryAction);
  assert.deepEqual(buttons.map((node) => node.dataset.recoveryAction), ['clear-logo', 'prune-local-history', 'open-local-history']);
  for (const button of buttons.filter((node) => node.tag === 'button')) {
    assert.equal(button.type, 'button', `${button.dataset.recoveryAction} is not a real button`);
    assert.ok(button.listeners.has('click'), `${button.dataset.recoveryAction} carries no click handler at all`);
  }
  buttons.find((node) => node.dataset.recoveryAction === 'clear-logo').dispatchEvent({ type: 'click' });
  assert.equal(h.calls.clearLogo, 1, 'the clear-image button did not reach the real clearing function');
  buttons.find((node) => node.dataset.recoveryAction === 'open-local-history').dispatchEvent({ type: 'click' });
  assert.deepEqual(h.calls.dialogsOpened, ['history-dialog'], 'the history button did not open the real dialog');
});

test('a link action renders a real address, and one whose address resolves to nothing renders nothing at all', () => {
  const withAddress = loadRecovery();
  withAddress.reportFailure('school-cannot-arm', {
    detail: 'no digest here',
    context: { secureAddress: 'https://example.invalid/site/settings.html', openedFrom: 'an http address' },
  });
  const link = flatten(withAddress.region('school-status')).find((node) => node.dataset.recoveryAction === 'open-over-https');
  assert.ok(link, 'the secure-address route offered nothing to follow');
  assert.equal(link.tag, 'a');
  assert.equal(link.href, 'https://example.invalid/site/settings.html');

  const noAddress = loadRecovery();
  noAddress.reportFailure('update-check-failed', { detail: 'HTTP 503', context: {} });
  const downloads = flatten(noAddress.region('update-status')).find((node) => node.dataset.recoveryAction === 'open-downloads');
  assert.ok(downloads, 'the downloads link is gone');
  assert.equal(downloads.href, './downloads.html', 'the downloads link is no longer resolved against this site’s own base');
});

test('a link whose address resolves to nothing is left out rather than rendered as a dead one', () => {
  /* Rendered directly rather than through a route, because no route today offers a link
   * whose address can come back empty -- that is what the `secureAddress` condition on
   * the restricted-presentation route is for. The branch is the guard against the next
   * route that forgets such a condition, and this is the only way to reach it. */
  const h = loadRecovery();
  assert.equal(h.renderRecovery({
    ok: true,
    id: 'school-cannot-arm',
    surface: 'school-status',
    heading: 'A heading long enough to be real',
    context: { secureAddress: '' },
    detail: '',
    note: '',
    actions: [{ id: 'open-over-https', label: 'Open this page over a secure connection' }],
    forbidden: [],
    nothingToOffer: '',
  }), true);
  const links = flatten(h.region('school-status')).filter((node) => node.dataset.recoveryAction);
  assert.deepEqual(links, [], 'a link with no address was rendered, so somebody would follow it nowhere');
});

test('the forbidden remedies render one by one, each with what it would cost', () => {
  const h = loadRecovery();
  h.reportFailure('vocabulary-rejected', { detail: 'bad file', context: { dictionaryLoaded: true } });
  const items = flatten(h.region('vocabulary-status')).filter((node) => node.dataset.recoveryForbidden);
  assert.deepEqual(items.map((node) => node.dataset.recoveryForbidden), ['clear-storage', 'reset-settings']);
  for (const item of items) {
    assert.equal(item.textContent, h.RECOVERY_FORBIDDEN[item.dataset.recoveryForbidden],
      `the ${item.dataset.recoveryForbidden} warning no longer renders the declared cost`);
  }
});

test('a route with nothing to offer renders its reason where the buttons would have been', () => {
  const h = loadRecovery();
  h.reportFailure('page-unbuilt', {});
  const region = h.region('update-status');
  assert.equal(flatten(region).filter((node) => node.dataset.recoveryAction).length, 0,
    'the unbuilt-page route rendered a control');
  const nothing = flatten(region).find((node) => String(node.className) === 'recovery-nothing');
  assert.ok(nothing && nothing.textContent.length > 60, 'the empty route rendered no explanation');
});

test('the region goes through the personal-vocabulary walker like every other rendered surface', () => {
  const h = loadRecovery();
  h.reportFailure('logo-rejected', { detail: 'too big', context: { markLoaded: false } });
  assert.deepEqual(h.calls.vocabularyApplied, [h.region('logo-status')],
    'the region is not handed to the vocabulary walker, so a private dictionary would not reach it');
});

/* ------------------------------------------------------------------ *
 * Taking a route down again.
 * ------------------------------------------------------------------ */

test('clearing removes the region rather than hiding it, because a hidden one is still there', () => {
  const h = loadRecovery();
  h.reportFailure('logo-rejected', { detail: 'too big', context: { markLoaded: false } });
  assert.ok(h.region('logo-status'), 'nothing was rendered to clear');
  assert.equal(h.clearRecovery('logo-status', 'logo-rejected'), true);
  assert.equal(h.region('logo-status'), null, 'the region is still in the document after being cleared');
  assert.equal(h.clearRecovery('logo-status', 'logo-rejected'), false, 'clearing nothing reported that it cleared something');
});

test('two routes share the update card’s status line, and clearing one cannot take the other down', () => {
  /* The reason `clearRecovery` takes a route id at all. A successful check must not
   * remove the unbuilt-page route, which is about a different unsolved problem. */
  const h = loadRecovery();
  h.reportFailure('page-unbuilt', {});
  assert.equal(h.clearRecovery('update-status', 'update-check-failed'), false,
    'a successful check took down the unbuilt-page route, which it has not solved');
  assert.ok(h.region('update-status'), 'the unbuilt-page route was removed by a check that had nothing to do with it');
  assert.equal(h.clearRecovery('update-status', 'page-unbuilt'), true);
  assert.equal(h.region('update-status'), null);
});

/* ------------------------------------------------------------------ *
 * The guarded writer.
 * ------------------------------------------------------------------ */

test('every write this page makes to local storage goes through the one guarded writer', () => {
  /* A source-wide scan rather than a behavioural test, because the defect it prevents is
   * a `setItem` somebody adds next year, not one that is here today. */
  const writes = [...app.matchAll(/localStorage\.setItem\(/gu)];
  assert.equal(writes.length, 1, `${writes.length} direct localStorage.setItem calls exist -- there should be exactly one, inside writeLocal`);
  const guard = functionSource(app, 'writeLocal');
  assert.ok(guard.includes('localStorage.setItem('), 'the one remaining setItem is not the one inside writeLocal');
  assert.match(guard, /try\{/u, 'writeLocal no longer catches the refusal, so it is not a guard at all');
});

test('a refused write is reported with what failed and why, and a write that then succeeds takes the route down', () => {
  const h = loadRecovery();
  const quota = new Error('quota');
  quota.name = 'QuotaExceededError';
  h.storage.refuseWith(quota);
  const refused = h.writeLocal('ding-pbx-page-v2', '{}');
  assert.deepEqual(refused, { ok: false, reason: 'this browser has no room left for this site' });
  assert.equal(h.reportWrite('this page’s settings', refused), false, 'a refused write was reported as a success');
  assert.ok(h.region('page'), 'a refused write raised no route at all');
  assert.match(h.regionTexts('page').join(' | '), /this page’s settings could not be saved/u,
    'the report no longer names which write was refused');

  h.storage.allow();
  assert.equal(h.reportWrite('this page’s settings', h.writeLocal('ding-pbx-page-v2', '{}')), true);
  assert.equal(h.region('page'), null, 'the route is still up after the write succeeded');
  assert.equal(h.storage.getItem('ding-pbx-page-v2'), '{}', 'the value never reached storage');
});

test('a refusal is named by its cause where the browser gives one, and reported honestly where it does not', () => {
  const h = loadRecovery();
  const quota = new Error('x'); quota.name = 'QuotaExceededError';
  const legacy = new Error('x'); legacy.name = 'NS_ERROR_DOM_QUOTA_REACHED';
  const security = new Error('x'); security.name = 'SecurityError';
  const odd = new Error('something else entirely'); odd.name = 'TypeError';
  assert.equal(h.storageRefusalReason(quota), 'this browser has no room left for this site');
  assert.equal(h.storageRefusalReason(legacy), 'this browser has no room left for this site');
  assert.equal(h.storageRefusalReason(security), 'this browser is refusing to let this site store anything');
  assert.equal(h.storageRefusalReason(odd), 'something else entirely',
    'an unfamiliar refusal is now described in words nobody measured instead of being passed on');
});

/* ------------------------------------------------------------------ *
 * The actions really do what their labels say.
 * ------------------------------------------------------------------ */

test('pruning the history really trims it and really saves what is left', () => {
  const entries = Array.from({ length: 40 }, (unused, index) => ({ id: `h${index}` }));
  const h = loadRecovery({ historyEntries: entries });
  const removed = h.pruneLocalHistory(h.RECOVERY_HISTORY_KEEP);
  assert.equal(removed, 40 - h.RECOVERY_HISTORY_KEEP);
  assert.equal(h.entries().length, h.RECOVERY_HISTORY_KEEP, 'the history was not actually trimmed');
  assert.equal(h.entries()[0].id, 'h0', 'pruning kept the oldest entries instead of the newest');
  assert.equal(h.calls.saveHistory, 1, 'the trimmed history was never saved, so it would come back on the next load');
  assert.equal(h.calls.renderHistory.length, 1, 'the panel was not re-rendered, so it would still show the removed entries');
});

test('searching plainly instead really turns the compiled pattern off for the field the builder is attached to', () => {
  const h = loadRecovery();
  h.regexState.set('notification-search', { pattern: '(', flags: 'iu', enabled: true });
  assert.equal(h.searchPlainlyInstead(), true);
  assert.equal(h.regexState.has('notification-search'), false, 'the compiled pattern is still attached to the field');
  assert.deepEqual(h.calls.dialogsClosed, ['regex-dialog'], 'the builder was left open on top of the field it just released');
  assert.deepEqual(h.calls.renderModeStatus, ['notification-search'],
    'the field’s own plain/regex status line was not re-rendered, so it would still claim a pattern is in force');
});

test('emptying the pattern clears the real field and re-runs the real preview', () => {
  const h = loadRecovery();
  h.el('regex-pattern').value = '([';
  assert.equal(h.RECOVERY_ACTIONS['clear-the-pattern'].run(), true);
  assert.equal(h.el('regex-pattern').value, '', 'the pattern field was not emptied');
  assert.equal(h.calls.previewRegex, 1, 'the preview was not re-run, so it would still show the old error');
  assert.equal(h.el('regex-pattern').focuses, 1, 'focus was not returned to the field somebody has to type in');
});

test('checking again asks for a check somebody asked for, not a background one', () => {
  const h = loadRecovery();
  assert.equal(h.RECOVERY_ACTIONS['check-again'].run(), true);
  assert.deepEqual(h.calls.checkForUpdate, [{ manual: true }],
    'the button either never reached the checker or asked for a background check, which reports nothing back');
});

test('choosing another file opens the real picker, having emptied it first so the same file can be chosen again', () => {
  const h = loadRecovery();
  const input = h.el('vocabulary-file');
  /* Seeded, because a file input starts empty: asserting it is empty afterwards would
   * pass whether or not anything cleared it, which is exactly what this assertion did
   * on its first run. Re-choosing the SAME file after correcting it raises no change
   * event unless the value was cleared first, so this is the whole point of the action. */
  input.value = 'my-dictionary.json';
  assert.equal(h.RECOVERY_ACTIONS['choose-vocabulary-file'].run(), true);
  assert.equal(input.clicks, 1, 'the picker was never opened');
  assert.equal(input.value, '', 'the picker was not emptied, so re-choosing the same corrected file would raise no change event');
});

/* ------------------------------------------------------------------ *
 * The two pure address helpers.
 * ------------------------------------------------------------------ */

test('a secure address is offered only for an http page with a real host, and never invented', () => {
  const h = loadRecovery();
  assert.equal(h.secureAddressOf({ protocol: 'http:', host: 'example.invalid', pathname: '/site/settings.html', search: '?a=1' }),
    'https://example.invalid/site/settings.html?a=1');
  assert.equal(h.secureAddressOf({ protocol: 'file:', host: '', pathname: '/C:/site/settings.html', search: '' }), '',
    'a page opened from a file was offered a secure address that cannot exist');
  assert.equal(h.secureAddressOf({ protocol: 'https:', host: 'example.invalid', pathname: '/x', search: '' }), '',
    'a page already served securely was offered a secure address, which would be a link to itself');
  assert.equal(h.secureAddressOf({ protocol: 'http:', host: '', pathname: '/x', search: '' }), '');
  assert.equal(h.secureAddressOf(null), '');
});

test('where a page was opened from is said in words a reader can act on', () => {
  const h = loadRecovery();
  assert.equal(h.openedFromLabel({ protocol: 'file:' }), 'a file on this computer');
  assert.equal(h.openedFromLabel({ protocol: 'http:' }), 'an address with no host');
  assert.equal(h.openedFromLabel({ protocol: 'blob:' }), 'a blob address');
  assert.equal(h.openedFromLabel(null), '');
});

test('the restricted-presentation reporter reads the real address of the page and hands both facts to the route', () => {
  const h = loadRecovery({ here: { protocol: 'http:', host: 'example.invalid', pathname: '/site/settings.html', search: '' } });
  const resolved = h.reportSchoolCannotArm('no digest here');
  assert.equal(resolved.id, 'school-cannot-arm');
  const link = flatten(h.region('school-status')).find((node) => node.dataset.recoveryAction === 'open-over-https');
  assert.ok(link, 'an http page was not offered its own secure address');
  assert.equal(link.href, 'https://example.invalid/site/settings.html');
});

/* ------------------------------------------------------------------ *
 * The wiring. A route nobody raises is a feature that never happens.
 * ------------------------------------------------------------------ */

test('a refused dictionary raises its route, with the reason and with whether one is already loaded', () => {
  const line = assertLiveCall("reportFailure('vocabulary-rejected'", 'a refused dictionary no longer raises its route');
  assert.match(line, /detail:reason/u, 'the route is raised without the reason the file was refused');
  assert.match(line, /dictionaryLoaded:Boolean\(vocabularyReplacements\(\)\)/u,
    'the route is no longer told whether a dictionary is loaded, so it cannot offer to remove one');
  const source = functionSource(app, 'rejectVocabulary');
  assert.ok(source.includes("reportFailure('vocabulary-rejected'"),
    'the call left rejectVocabulary, which is the one writer for every rejection');
});

test('a refused image raises its route, and a refused write during either load is reported rather than thrown past', () => {
  assertLiveCall("reportFailure('logo-rejected'", 'a refused image no longer raises its route');
  const loader = functionSource(app, 'loadLogo');
  assert.match(loader, /reportWrite\('the image you added',writeLocal\('ding-pbx-logo-cache',dataUrl\)\)/u,
    'the image is stored without the guarded writer, so a browser refusing the write would be silent');
  const vocabulary = functionSource(app, 'loadVocabulary');
  assert.match(vocabulary, /reportWrite\('the dictionary you loaded',writeLocal\('ding-pbx-vocabulary-cache'/u,
    'the dictionary is stored without the guarded writer');
});

test('a load that succeeds takes its own route down, so a solved problem stops being reported', () => {
  assert.match(functionSource(app, 'loadVocabulary'), /clearRecovery\('vocabulary-status','vocabulary-rejected'\)/u,
    'a dictionary that loads leaves the refusal of the previous file on screen');
  assert.match(functionSource(app, 'loadLogo'), /clearRecovery\('logo-status','logo-rejected'\)/u,
    'an image that loads leaves the refusal of the previous file on screen');
  assert.match(functionSource(app, 'clearVocabulary'), /clearRecovery\('vocabulary-status','vocabulary-rejected'\)/u,
    'removing the dictionary leaves a refusal on screen about a dictionary that is gone');
  assert.match(functionSource(app, 'clearLogo'), /clearRecovery\('logo-status','logo-rejected'\)/u);
});

test('both clear buttons are wired to the shared writers the recovery routes also call', () => {
  /* One writer each, because two copies of "clear the dictionary" would be two answers
   * to one question the moment somebody edited one of them. */
  const line = lineWith("el('vocabulary-clear').onclick=");
  assert.match(line, /el\('vocabulary-clear'\)\.onclick=clearVocabulary;/u);
  assert.match(line, /\$\('logo-clear'\)\.onclick=clearLogo;/u);
});

test('a check that cannot answer raises its route, and a check that answers takes it down', () => {
  const source = functionSource(app, 'checkForUpdate');
  assert.match(source, /reportFailure\('update-check-failed',\{detail:failure,context:\{\}\}\)/u,
    'a failed check no longer raises its route');
  assert.match(source, /reportFailure\('update-check-failed',\{detail:updateWatch\.reason,context:\{\}\}\)/u,
    'a manifest address this page refuses to resolve no longer raises the route');
  assert.match(source, /clearRecovery\('update-status','update-check-failed'\)/u,
    'a check that answers leaves the previous failure on screen');
  assert.match(source, /reportFailure\('page-unbuilt',\{\}\)/u,
    'an unbuilt page no longer says, in adjacent text, why the button beside it is switched off');
});

test('the restricted presentation raises its route only for the refusal nobody can act on by reading it', () => {
  const source = functionSource(app, 'armSchoolMode');
  assert.match(source, /if\(verdict\.why==='no-digest-available'\)reportSchoolCannotArm\(/u,
    'either the digest refusal stopped raising a route, or every refusal now raises one -- a value too short says the whole answer in its own line');
  assert.match(source, /clearRecovery\('school-status','school-cannot-arm'\)/u,
    'arming successfully leaves the earlier refusal on screen');
  for (const why of ['too-short', 'too-long', 'mismatch', 'already-on']) {
    assert.doesNotMatch(source, new RegExp(`reportSchoolCannotArm[^;]*${why}`, 'u'),
      `${why} now raises a recovery route, and its own line already says the whole answer`);
  }
});

test('an invalid pattern raises its route instead of returning in silence, which is what it used to do', () => {
  const source = functionSource(app, 'applyRegex');
  assert.doesNotMatch(source, /catch\{return\}/u,
    'applyRegex is silently swallowing the invalid pattern again -- the Apply button would appear to do nothing at all');
  assert.match(source, /catch\(error\)\{reportFailure\('regex-invalid',\{detail:error\.message,context:\{target:regexTarget\}\}\);return\}/u,
    'an invalid pattern no longer raises its route with the engine’s own reason');
  assert.match(source, /clearRecovery\('regex-feedback','regex-invalid'\)/u,
    'a pattern that applies leaves the previous error on screen');
});

test('all three savers report their write rather than letting a refusal escape through whichever setter was in use', () => {
  assert.match(lineWith('function save(){'), /return reportWrite\('this page’s settings',writeLocal\(STORAGE_KEY/u,
    'the settings saver no longer reports a refused write');
  assert.match(lineWith('function saveHistory(){'), /return reportWrite\('the local history',writeLocal\(HISTORY_KEY/u,
    'the history saver no longer reports a refused write');
  assert.match(lineWith('function saveSchool(){'), /return reportWrite\('the restricted-presentation record',writeLocal\(SCHOOL_KEY/u,
    'the restricted-presentation saver no longer reports a refused write');
});

test('the recovery engine raises no notification and speaks no line of its own', () => {
  /* Both are deliberate. A message box is somewhere else by definition, `notify` writes
   * to storage -- which is the very thing that failed in one of these routes -- and every
   * failure routed here already speaks its own line, so a second one would be the
   * narrator reporting one event twice. */
  const block = recoveryBlock();
  assert.doesNotMatch(block, /\bnotify\(/u, 'the recovery engine now sends people to a message box somewhere else');
  assert.doesNotMatch(block, /\bnarrate\(/u, 'the recovery engine now speaks a second line about an event that already spoke one');
});

/* ------------------------------------------------------------------ *
 * Copy, styles and the records.
 * ------------------------------------------------------------------ */

test('the lead line ships four English and four Cantonese levels, and none of them carries a fact', () => {
  const start = app.indexOf('    recoveryLead:{en:[');
  assert.notEqual(start, -1, 'COPY.recoveryLead is gone');
  const split = app.indexOf('],zh:[', start);
  const end = app.indexOf(']},', split);
  assert.ok(split !== -1 && end !== -1, 'COPY.recoveryLead is no longer a two-language table');
  const en = app.slice(start, split).match(/^\s*'/gmu) || [];
  const zh = app.slice(split, end).match(/^\s*'/gmu) || [];
  assert.equal(en.length, 4, `recoveryLead has ${en.length} English variants`);
  assert.equal(zh.length, 4, `recoveryLead has ${zh.length} Cantonese variants`);
  /* Voice only. A figure, an address or a store name in this line would be a fact that
   * moves with a slider, which is the one thing the funny levels may never do. */
  assert.doesNotMatch(app.slice(start, end), /ding-pbx|https?:|[0-9]{2,}/u,
    'a fact has appeared in the line the sliders restyle');
  assert.ok(app.includes("copyText('recoveryLead')"), 'the lead line is declared and never reached');
});

test('the stylesheet declares the region exactly once and hides nothing by default', () => {
  const declarations = [...css.matchAll(/^\.recovery\{/gmu)];
  assert.equal(declarations.length, 1, `.recovery is declared ${declarations.length} times -- which one wins is decided by source order`);
  for (const part of ['.recovery-heading', '.recovery-detail', '.recovery-lead', '.recovery-note', '.recovery-actions', '.recovery-forbidden']) {
    assert.ok(css.includes(`${part}{`), `${part} has no styles at all`);
  }
  assert.doesNotMatch(css, /\.recovery\{[^}]*display:none/u, 'the region is hidden by default, so nothing would ever be seen');
});

test('the site feature registry records in-context-recovery as implemented, and names the files it lives in', () => {
  const row = registry.features['in-context-recovery'];
  assert.ok(row, 'no in-context-recovery row in site/feature-registry.json');
  assert.equal(row.state, 'implemented');
  assert.deepEqual(row.files.slice().sort(), ['site/app.js', 'site/styles.css']);
  assert.match(row.note, /recoveryFor/u, 'the note no longer names the pure decision this feature rests on');
  assert.match(row.note, /page-unbuilt/u, 'the note no longer names the route that deliberately offers nothing');
});

test('the localization registry records the lead line, and the known-copy-key list agrees', () => {
  const row = locales.features['in-context-recovery'];
  assert.ok(row, 'no in-context-recovery row in site/locales/feature-registry.json');
  assert.equal(row.state, 'localized');
  assert.deepEqual(row.copyKeys, ['recoveryLead']);
  assert.deepEqual(row.missingCopyKeys, []);
  assert.ok(locales.knownCopyKeys.includes('recoveryLead'),
    'recoveryLead is not in knownCopyKeys, so the localization inventory does not know about it');
});

test('the article says what this does, what it deliberately cannot do here, and where each is', () => {
  assert.match(article, /## Current status/u, 'the article lost its status section');
  assert.doesNotMatch(article, /\*\*Documentation website:\*\* Not implemented/u,
    'the article still says the website has no recovery route');
  for (const route of ['vocabulary-rejected', 'logo-rejected', 'update-check-failed', 'page-unbuilt',
    'school-cannot-arm', 'local-storage-refused', 'regex-invalid']) {
    assert.ok(article.includes(route), `the article does not mention the ${route} route at all`);
  }
  /* Named exactly rather than by the bare word, which the article uses twice: the claim
   * worth pinning is the REASON this surface has no equivalent of the clause, and a
   * heading rename left the bare word standing while the reason had gone. */
  assert.match(article, /no account, no session and no credential to refuse/u,
    'the article no longer says why the canonical re-authentication clause has no equivalent here');
  assert.match(article, /writeLocal/u, 'the article no longer names the guarded writer this rests on');
});
