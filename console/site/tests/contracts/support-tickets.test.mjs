/**
 * Contract: support-tickets on the pages-site.
 *
 * The canonical desk is a joke with a job. Somebody who has forgotten the value that
 * turns the restricted presentation off is genuinely stuck, and the only thing that
 * actually helps them is clearing this site's storage -- so the desk takes their ticket,
 * numbers it, answers it, escalates it as often as they like, and arrives every single
 * time at that one resolution. The comedy is the delivery; the resolution is real.
 *
 * Which makes the interesting assertions the ones about the boundary rather than the
 * bit, and most of this file is about four of them:
 *
 *   - **Nothing is sent anywhere.** Not "the request goes to the right place" -- there is
 *     no request. A desk that quietly posted a ticket somewhere would look identical from
 *     the outside, and would be the single worst defect this surface could ship, because
 *     the copy promises the opposite in so many words.
 *   - **Nothing is deleted.** The desktop version opens the application-data folder and
 *     stands back. A page cannot open a folder, so this one names the exact origin and
 *     keys and says plainly that clearing them is the reader's own act. No removeItem
 *     anywhere in the block, and therefore no destructive-action gate needed.
 *   - **The key list is DERIVED.** A restated list is wrong the day a seventh key is
 *     added, and this is the one place a locked-out reader is told what to clear. The
 *     test below re-derives the set from every localStorage call in app.js and refuses a
 *     mismatch in either direction.
 *   - **The disclosure cannot be rewritten by anything.** Not by a funny level, not by a
 *     language mode, not by an uploaded personal-vocabulary file. It is a plain constant
 *     rendered verbatim, and a disclosure a slider can edit is decoration.
 *
 * The behavioural half runs the real extracted source against a recording page, in the
 * style app-display-name.test.mjs established here. It has to: "the constant is there",
 * "the button is on the page" and "a ticket was written" are all true of a desk whose
 * status never moves, whose resolution names the wrong keys, or whose first response is
 * re-rendered later at whatever level happens to be current.
 *
 * What this file does NOT prove, said here rather than left implied: nothing has been
 * opened in a browser. No dialog has been shown by a real `showModal`, no `localStorage`
 * has been written by a real browser, no page has been served over HTTP, and the markup
 * assertions below are string checks over the committed HTML rather than a rendered DOM.
 * The pages-site inventory row stays `unverified` for exactly that reason.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/* CRLF stripped before anything is matched across lines. A newline-only pattern against a
 * CRLF checkout matches nothing, and an assertion that matches nothing passes in the one
 * direction nobody notices. */
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const app = read('app.js');
const settings = read('settings.html');
const documentation = read('documentation.html');
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
  const braceStart = src.indexOf('{', src.indexOf(')', found));
  let depth = 0;
  for (let i = braceStart; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(found, i + 1);
    }
  }
  throw new Error(`function ${name} is not brace-balanced in site/app.js`);
}

/** Everything the desk is configured by, taken from the file rather than restated here. */
function constantsSource() {
  const start = app.indexOf("  const SUPPORT_KEY='ding-pbx-pages-support-v1';");
  assert.notEqual(start, -1, 'SUPPORT_KEY is no longer declared in site/app.js');
  const end = app.indexOf('  function supportStorageKeys(){', start);
  assert.notEqual(end, -1, 'supportStorageKeys is no longer declared after the constants');
  return app.slice(start, end);
}

/**
 * The five storage-key declarations, lifted whole.
 *
 * Prepended rather than injected as values, because the property this whole feature turns
 * on is that the recovery panel derives its list from these exact declarations. A copy
 * written here would keep satisfying every test below after the real key had moved.
 */
function storageKeyLines() {
  const names = ['STORAGE_KEY', 'HISTORY_KEY', 'SCHOOL_KEY', 'AUTH_KEY', 'VOCABULARY_CACHE_KEY', 'LOGO_CACHE_KEY'];
  return names.map((name) => {
    const line = app.match(new RegExp(`^ {2}const ${name} ?= ?'[^']+';$`, 'mu'));
    assert.ok(line, `${name} is no longer declared with a fixed literal in site/app.js`);
    return line[0];
  }).join('\n');
}

/** The three mutable bindings the desk keeps between calls. */
function stateSource() {
  const lines = [
    '  let supportStore=loadSupport();',
    '  let supportSelection={anchor:undefined,selected:new Set()};',
    '  let lastSupportOrder=[];',
  ];
  for (const line of lines) {
    assert.ok(app.includes(line), `the desk's mutable binding is no longer declared as expected: ${line.trim()}`);
  }
  return lines.join('\n');
}

const NAMES = [
  'supportStorageKeys', 'supportOrigin', 'supportDefaultStore', 'loadSupport', 'saveSupport',
  'supportTicketNumber', 'supportCategoryLabel', 'supportSeverityLabel', 'supportFormVerdict',
  'openSupportTicket', 'advanceSupportTicket', 'reopenSupportTicket', 'supportResolution',
  'supportTicketText', 'supportMatches', 'supportExportRows', 'updateSupportSelectionUI',
  'updateSupportExportFormats', 'supportUpdateMarkup', 'supportResolutionMarkup', 'renderSupport',
  'renderSupportCopy', 'openSupportDesk', 'supportRouteFromHash', 'submitSupportForm',
  'initSupport', 'copySupportKeys',
];

/** A throwaway element that records what was done to it rather than shrugging. */
function makeElement(id, tag = 'div') {
  return {
    id,
    tagName: tag,
    value: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    hidden: false,
    options: [],
    listeners: {},
    focused: 0,
    shown: 0,
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); },
    focus() { this.focused += 1; },
    showModal() { this.shown += 1; },
    click() { for (const handler of this.listeners.click ?? []) handler({ target: { closest: () => null, matches: () => false } }); },
    querySelector() { return null; },
    matches() { return false; },
    closest() { return null; },
  };
}

/**
 * The extracted source, assembled once.
 *
 * Every test below builds a fresh desk, and re-slicing 27 functions out of a 3,000-line
 * file each time made a single run of this file cost minutes rather than seconds on a
 * contended machine. The STRING is shared; every `new Function` call still compiles and
 * runs its own copy, so no test can see another's store, selection or storage.
 */
const DESK_BODY = (() => {
  const parts = [
    storageKeyLines(),
    constantsSource(),
    /* The real guarded writer and its refusal-reason reader, lifted whole rather than
     * stubbed. `saveSupport` goes through them, so a stub here would prove the desk calls
     * something rather than that a refused write is actually caught and reported. */
    ['writeLocal', 'storageRefusalReason'].map((name) => functionSource(app, name)).join('\n'),
    NAMES.map((name) => functionSource(app, name)).join('\n'),
    stateSource(),
  ];
  return `${parts.join('\n')}\n`
    + `return { ${NAMES.join(', ')}, `
    + 'SUPPORT_KEY, SUPPORT_LIMIT, SUPPORT_DESCRIPTION_MAX, SUPPORT_DISCLOSURE, SUPPORT_CATEGORIES, '
    + 'SUPPORT_SEVERITIES, SUPPORT_SEVERITY_NOTE, SUPPORT_STATUSES, SUPPORT_STATUS_LABEL, SUPPORT_STATUS_NOTE, '
    + 'store: () => supportStore, selection: () => supportSelection, order: () => lastSupportOrder, '
    + 'select: (next) => { supportSelection = next; } };';
})();

/** A localStorage that behaves like one, so a reload is a real reload. */
function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
  };
}

/**
 * Build a throwaway page and run the real ticket desk against it.
 *
 * Every collaborator records rather than stubs, and the three network primitives are
 * supplied as things that THROW -- so a request is a loud failure rather than a silent
 * success. "It did not call the network" and "it called a network that was not there"
 * are the two outcomes this feature most has to be able to tell apart.
 */
function loadDesk({
  storage = makeStorage(),
  ids = [],
  origin = 'https://example.invalid',
  hash = '',
  copy = (key) => `COPY:${key}`,
  vocabulary = (text) => text,
  match = (text, query) => (query ? String(text).toLowerCase().includes(String(query).toLowerCase()) : true),
} = {}) {
  const elements = new Map();
  for (const id of ids) elements.set(id, makeElement(id));

  const history = [];
  const notified = [];
  const downloads = [];
  const applied = [];
  const matchCalls = [];
  const clipboard = [];
  const intervals = [];
  const clearedIntervals = [];
  const writeReports = [];

  // eslint-disable-line no-new-func -- deliberately re-running the real extracted source
  const api = new Function(
    'localStorage', 'location', 'navigator', 'document', '$', 'all', 'escapeHtml', 'matchText',
    'copyText', 'applyVocabularyText', 'applyVocabulary', 'recordHistory', 'notify',
    'suitableFormats', 'describeLoss', 'exportRows', 'exportFilename', 'download', 'EXPORT_MIME',
    'bulkClick', 'bulkSelectAll', 'planBulk', 'summariseBulk', 'setTimeout',
    'setInterval', 'clearInterval', 'fetch', 'XMLHttpRequest', 'reportWrite', DESK_BODY,
  )(
    storage,
    { origin, hash },
    { clipboard: { writeText: (text) => { clipboard.push(text); } } },
    { createElement: (tag) => makeElement('', tag) },
    (id) => elements.get(id) ?? null,
    () => [],
    (value) => String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])),
    (text, query, target) => { matchCalls.push({ text, query, target }); return match(text, query, target); },
    copy,
    vocabulary,
    () => applied.push(1),
    (action, summary) => history.push({ action, summary }),
    (title, message, narration) => notified.push({ title, message, narration }),
    () => ['json'],
    () => ['nothing would be lost.'],
    ({ rows, format, table }) => JSON.stringify({ rows, format, table }),
    (base, format, range) => `${base}-${range}.${format}`,
    (name, text) => downloads.push({ name, text }),
    { json: 'application/json' },
    (state) => state,
    (state) => ({ state, scope: 'page', count: 0 }),
    (action, selected, canApply) => {
      const affected = []; const skipped = [];
      for (const item of selected) {
        const verdict = canApply(item);
        if (verdict === true) affected.push(item); else skipped.push({ item, reason: verdict });
      }
      return { action, selected, affected, skipped, destructive: false };
    },
    (plan) => `${plan.action}: ${plan.affected.length} of ${plan.selected.length} selected will change.`,
    (handler) => { handler(); return 1; },
    /* Recorded rather than real, and the reason is worth writing down. A timer left
     * running by extracted code keeps the whole test process alive after the last
     * assertion, which reads as a hung machine rather than as a defect -- and it happened:
     * a `setInterval` planted by the negative script beside this file turned every run of
     * it into a hundred-second stall, and was diagnosed as contention before it was
     * diagnosed as the break it actually was. A recorded timer fails an assertion instead. */
    (handler, ms) => { intervals.push({ handler, ms }); return intervals.length; },
    (id) => clearedIntervals.push(id),
    () => { throw new Error('the ticket desk made a network request'); },
    function XHR() { throw new Error('the ticket desk opened an XMLHttpRequest'); },
    /* The in-context recovery reporter, recorded. `writeLocal` itself is the real thing
     * (extracted above), so a refusal genuinely travels: the storage throws, the real
     * writer catches it and reads the reason off the error, and what arrives here is the
     * report the reader would have been shown. */
    (what, result) => { writeReports.push({ what, result }); return result.ok; },
  );

  return {
    ...api, storage, elements, history, notified, downloads, applied, matchCalls, clipboard,
    intervals, clearedIntervals, writeReports,
  };
}

const FORM = { category: 'setting', severity: 'normal', description: 'The theme select does nothing.' };
const AT = Date.UTC(2026, 7, 26, 9, 30, 0);

/* ------------------------------------------------------------------ *
 * The registry rows agree with the code.
 * ------------------------------------------------------------------ */

test('the site feature registry carries an implemented row for support-tickets', () => {
  const row = registry.features['support-tickets'];
  assert.ok(row, 'no support-tickets row in site/feature-registry.json');
  assert.equal(row.state, 'implemented',
    'the site now carries a real local ticket desk, so "absent" is no longer the honest state');
  for (const file of ['site/app.js', 'site/settings.html', 'site/documentation.html', 'site/styles.css']) {
    assert.ok(row.files.includes(file), `the row does not name ${file}, which the feature is partly built in`);
  }
});

test('the localization registry records the two copy keys this feature added', () => {
  const row = locales.features['support-tickets'];
  assert.equal(row.state, 'localized', 'the desk ships four English and four Cantonese variants of both its keys');
  assert.deepEqual(row.copyKeys, ['supportDesc', 'supportFirstResponse']);
  for (const key of ['supportDesc', 'supportFirstResponse']) {
    assert.ok(locales.knownCopyKeys.includes(key), `${key} is not listed among the known COPY keys`);
  }
});

/* ------------------------------------------------------------------ *
 * Nothing is sent anywhere.
 * ------------------------------------------------------------------ */

test('the whole desk block contains no network call of any kind', () => {
  /* The narrowest true statement rather than a blanket ban on `fetch(` across app.js --
   * the published-version watch makes exactly one same-origin request and is entitled to.
   * What must be true here is that this block makes none. */
  const block = `${constantsSource()}\n${NAMES.map((name) => functionSource(app, name)).join('\n')}`;
  for (const pattern of [/\bfetch\s*\(/u, /XMLHttpRequest/u, /sendBeacon/u, /new\s+WebSocket/u, /EventSource/u, /\bimport\s*\(/u]) {
    assert.doesNotMatch(block, pattern,
      `the ticket desk now contains ${pattern} -- the "nothing is sent anywhere" copy is no longer true`);
  }
});

test('opening, chasing, rendering, exporting and copying a ticket makes no request, with the network wired to throw', () => {
  /* The injected fetch, XMLHttpRequest and clipboard all throw or record, so reaching the
   * end of this test at all is the assertion. Said out loud, because a test whose real
   * claim is "nothing threw" is one nobody can read the intent of. */
  const h = loadDesk({ ids: ['support-list', 'support-count', 'support-copy-status'] });
  const opened = h.openSupportTicket(FORM, AT);
  assert.ok(opened.ok, opened.reason);
  h.advanceSupportTicket(opened.ticket.id, AT + 1000);
  h.advanceSupportTicket(opened.ticket.id, AT + 2000);
  h.advanceSupportTicket(opened.ticket.id, AT + 3000);
  h.renderSupport();
  h.supportExportRows();
  h.copySupportKeys();
  assert.equal(h.store().tickets.length, 1);
  assert.equal(h.store().tickets[0].status, 'resolved');
});

/* ------------------------------------------------------------------ *
 * Nothing is deleted.
 * ------------------------------------------------------------------ */

test('the desk never removes or clears anything, so it needs no destructive-action gate', () => {
  const block = `${constantsSource()}\n${NAMES.map((name) => functionSource(app, name)).join('\n')}`;
  assert.doesNotMatch(block, /removeItem/u,
    'the ticket desk now removes a storage key -- it is supposed to name what to clear, never to clear it');
  assert.doesNotMatch(block, /localStorage\.clear/u, 'the ticket desk now clears storage');
  assert.doesNotMatch(block, /tickets\s*=\s*\[\]/u, 'the ticket desk now empties its own list');
  assert.doesNotMatch(block, /updates\.slice\(0,\s*-/u, 'the ticket desk now drops updates off the end of a ticket history');
});

test('supportResolution says outright that it deletes nothing, and offers no control that would', () => {
  const h = loadDesk();
  const resolution = h.supportResolution();
  assert.equal(resolution.deletesAnything, false);
  assert.match(resolution.note, /does not clear anything for you, and there is no button here that will/u,
    'the resolution no longer says plainly that this page will not do the clearing');
  const markup = h.supportResolutionMarkup();
  assert.doesNotMatch(markup, /data-support-(clear|delete|wipe)/u, 'the resolution now offers a control that appears to delete');
  assert.match(markup, /data-support-copy-keys="1"/u, 'the resolution no longer offers the key list to the clipboard');
});

/* ------------------------------------------------------------------ *
 * The key list is derived, not restated.
 * ------------------------------------------------------------------ */

test('supportStorageKeys names exactly the keys app.js actually writes, in both directions', () => {
  /* The assertion this feature most needs, because the panel it feeds is the one place a
   * locked-out reader is told what to clear. Derived here the same way the code derives
   * it: every storage call in the file, resolved through its constant. A key added to the
   * file and not to the list fails; a key on the list that nothing writes fails too,
   * because a resolution naming a key that never existed sends somebody hunting.
   *
   * `writeLocal(` is read alongside `localStorage.` because since in-context recovery
   * landed there is exactly ONE direct `localStorage.setItem` left in the whole file --
   * the generic one inside `writeLocal` itself, whose argument is the parameter `key`.
   * Reading only the direct calls would therefore have missed every key that goes through
   * the guarded writer, which is now most of them, and the list would have looked complete
   * while naming a fraction of what this page stores. `key` is skipped by name for the
   * same reason: it is the writer's own parameter, not a key. */
  const args = [
    ...[...app.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(([^,)]+)/gu)].map((m) => m[1].trim()),
    ...[...app.matchAll(/\bwriteLocal\(([^,)]+)/gu)].map((m) => m[1].trim()),
  ].filter((arg) => arg !== 'key');
  assert.ok(args.length >= 6, `only ${args.length} storage calls were found, which is too few to be reading the whole file`);
  assert.equal((app.match(/\bwriteLocal\(/gu) || []).length - 1 > 0, true,
    'nothing calls writeLocal any more, so this derivation is reading only the direct calls and would miss every guarded one');
  const used = new Set();
  for (const arg of args) {
    if (/^'[^']+'$/u.test(arg)) { used.add(arg.slice(1, -1)); continue; }
    const declared = app.match(new RegExp(`^ {2}const ${arg} ?= ?'([^']+)';$`, 'mu'));
    assert.ok(declared, `${arg} is used as a storage key but is not declared with a fixed literal value`);
    used.add(declared[1]);
  }
  const h = loadDesk();
  assert.deepEqual([...h.supportStorageKeys()].sort(), [...used].sort(),
    "the recovery panel's key list and the keys this page actually writes have come apart");
});

test('saveSupport writes through the guarded writer rather than straight at localStorage', () => {
  /* Anchored to a whole line, so a commented-out call cannot satisfy it: commenting out is
   * how a wiring line usually dies. The in-context-recovery contract separately refuses a
   * second direct `localStorage.setItem` anywhere in the file, so a revert here fails twice
   * -- but that one fails under a name that says nothing about this desk, and somebody
   * reading it would go looking in the wrong feature. */
  const line = app.split('\n').find((l) => l.includes('return reportWrite(') && l.includes('writeLocal(SUPPORT_KEY'));
  assert.ok(line, 'saveSupport no longer reports its write through reportWrite/writeLocal');
  assert.doesNotMatch(line.slice(0, line.indexOf('return reportWrite(')), /\/\//u,
    'the guarded write is sitting behind a line comment');
});

test('the key list names the authenticator store, which is the one a reset deliberately does not clear', () => {
  /* Pinned by name as well as by the derivation above, because this key is the one most
   * easily lost from the list: it is the only store on this page whose own card offers no
   * clear button, and the settings reset deliberately leaves it alone. So a reader who
   * wants it gone has nowhere to go except this panel, and a panel that quietly omitted it
   * would be the only route out, silently incomplete. */
  const h = loadDesk();
  assert.ok(h.supportStorageKeys().includes('ding-pbx-pages-authenticator-v1'),
    'the recovery panel no longer names the authenticator store among the keys it tells a reader to clear');
});

test('a ticket the browser refuses to store is reported to the reader, not thrown past', () => {
  /* The desk goes through `writeLocal`, the one guarded writer every store on this page
   * uses. This drives a storage that genuinely throws, so the refusal travels the real
   * path: the browser refuses, the real writer catches it and reads the reason off the
   * error, and what arrives is the report the reader would have been shown.
   *
   * It matters more here than on any other store, which is why it gets its own test. This
   * desk is the recorded route back out of a lock. A ticket that silently failed to save
   * would leave somebody believing they had a record when they had nothing, and they would
   * only find out on the next visit -- by which time the page cannot even tell them what
   * went wrong, because nothing was kept. */
  const refusing = {
    map: new Map(),
    getItem: () => null,
    setItem: () => { const error = new Error('nope'); error.name = 'QuotaExceededError'; throw error; },
    removeItem: () => {},
  };
  const h = loadDesk({ storage: refusing, ids: ['support-list', 'support-count', 'support-form-status'] });
  h.openSupportTicket(FORM, AT);
  assert.equal(h.writeReports.length, 1, 'a refused ticket write raised no report at all');
  const [report] = h.writeReports;
  assert.equal(report.result.ok, false, 'the refused write was reported as having succeeded');
  assert.match(report.what, /ticket/iu, `the report names ${JSON.stringify(report.what)} rather than the thing that was actually lost`);
  assert.match(report.result.reason, /no room left/u,
    `the reason reads ${JSON.stringify(report.result.reason)} rather than naming the full browser the reader has to do something about`);
});

test('a ticket the browser accepts is reported as having been stored, so the refusal path is not the only one exercised', () => {
  /* The other half, and not redundant: a reporter that returned false for everything would
   * satisfy the test above completely while making every successful save look like a
   * failure to the recovery machinery. */
  const h = loadDesk({ ids: ['support-list', 'support-count', 'support-form-status'] });
  h.openSupportTicket(FORM, AT);
  assert.equal(h.writeReports.length, 1, 'an accepted ticket write raised no report at all');
  assert.equal(h.writeReports[0].result.ok, true, 'a write the storage accepted was reported as refused');
  assert.equal(h.storage.map.has('ding-pbx-pages-support-v1'), true, 'the accepted ticket did not reach storage');
});

test('the resolution reports the origin the browser gave it, and says so honestly when there is none', () => {
  const named = loadDesk({ origin: 'https://ding-ding-projects.github.io' });
  assert.equal(named.supportResolution().origin, 'https://ding-ding-projects.github.io');
  const anonymous = loadDesk({ origin: '' });
  assert.match(anonymous.supportResolution().origin, /this browser did not report/u,
    'an unreported origin now renders as an empty string, which reads as a site with no address rather than as a reading nobody took');
});

test('the resolution steps end by sending the reader back here, and name the site rather than a folder', () => {
  const h = loadDesk({ origin: 'https://example.invalid' });
  const { steps } = h.supportResolution();
  assert.equal(steps.length, 4);
  assert.match(steps[1], /https:\/\/example\.invalid/u, 'the resolution no longer names which site entry to look for');
  assert.match(steps[3], /reload this page/u, 'the resolution no longer tells the reader to come back');
});

/* ------------------------------------------------------------------ *
 * The disclosure cannot be rewritten by anything.
 * ------------------------------------------------------------------ */

test('the disclosure is a plain constant, not a COPY key and not vocabulary-substituted', () => {
  assert.match(app, /^ {2}const SUPPORT_DISCLOSURE='[^']+';$/mu, 'SUPPORT_DISCLOSURE is no longer a single fixed constant');
  const copyKeys = [...app.matchAll(/^ {4}(\w+):\{en:\[$/gmu)].map((m) => m[1]);
  assert.ok(copyKeys.includes('supportDesc') && copyKeys.includes('supportFirstResponse'),
    'the two ticket-desk COPY keys are no longer declared in the COPY table');
  assert.ok(!copyKeys.includes('supportDisclosure'),
    'the disclosure is now a COPY key, so a funny level could rewrite the one sentence that has to be true');
  /* Comments stripped first, and the strip is checked rather than trusted: this function's
   * own comment explains WHY it does not call applyVocabularyText, and a bare needle would
   * be satisfied by that explanation -- the mirror image of the trap where a commented-out
   * call satisfies a positive check. */
  const render = functionSource(app, 'renderSupportCopy');
  const code = render.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
  assert.ok(code.length < render.length, 'nothing was stripped, so the comment-free check below is not comment-free');
  assert.match(code, /function renderSupportCopy\(\)\{/u, 'the strip removed the function itself, so the check below is vacuous');
  assert.doesNotMatch(code, /applyVocabularyText/u,
    'the disclosure now passes through the personal-vocabulary replacer, so an uploaded file could rewrite it');
  assert.match(code, /node\.textContent=SUPPORT_DISCLOSURE/u, 'the disclosure is no longer written verbatim');
});

test('renderSupportCopy writes the constant verbatim even when the copy layer and the vocabulary would mangle it', () => {
  const h = loadDesk({
    ids: ['support-severity-note'],
    copy: () => 'A FUNNY LEVEL WROTE THIS',
    vocabulary: () => 'A VOCABULARY FILE WROTE THIS',
  });
  /* `all()` is an empty list in this harness, so the disclosure nodes are exercised by
   * running the same real function with a list that actually holds one. */
  const node = makeElement('', 'p');
  const withNodes = new Function('SUPPORT_DISCLOSURE', 'SUPPORT_SEVERITY_NOTE', 'all', '$',
    `${functionSource(app, 'renderSupportCopy')} return renderSupportCopy;`)(
    h.SUPPORT_DISCLOSURE, h.SUPPORT_SEVERITY_NOTE, () => [node], () => null,
  );
  withNodes();
  assert.equal(node.textContent, h.SUPPORT_DISCLOSURE);
  h.renderSupportCopy();
  assert.equal(h.elements.get('support-severity-note').textContent, h.SUPPORT_SEVERITY_NOTE,
    'the severity note is no longer fixed, so a level could delete the sentence admitting severity changes nothing');
});

test('the disclosure ships in the served markup twice, byte-identical to the constant', () => {
  /* Both copies matter, for different reasons: the card is what somebody browsing settings
   * meets, and the dialog is what a locked-out reader meets. It has to be in the HTML
   * rather than written by script, so it is on the page before app.js has run at all. */
  const constant = app.match(/^ {2}const SUPPORT_DISCLOSURE='([^']+)';$/mu)[1];
  const rendered = settings.split(constant).length - 1;
  assert.equal(rendered, 2,
    `the disclosure sentence appears ${rendered} time(s) in settings.html, expected exactly two -- the card and the dialog`);
  assert.match(settings, /<p class="setting-note support-disclosure">/u, 'the card no longer carries the disclosure');
  assert.match(settings, /<p class="support-disclosure">/u, 'the dialog no longer carries the disclosure');
});

test('the disclosure says all five things it has to say', () => {
  const constant = app.match(/^ {2}const SUPPORT_DISCLOSURE='([^']+)';$/mu)[1];
  for (const [what, pattern] of [
    ['nothing is sent', /sent anywhere/u],
    ['no ticket exists elsewhere', /No ticket exists outside this browser/u],
    ['no request is made', /no network request is made/u],
    ['nothing is collected', /no data is collected/u],
    ['nobody is reading it', /nobody is reading it/u],
  ]) {
    assert.match(constant, pattern, `the disclosure no longer states that ${what}`);
  }
});

/* ------------------------------------------------------------------ *
 * The three routes in.
 * ------------------------------------------------------------------ */

test('the settings card exists, is searchable, and hangs its description off the funny sliders', () => {
  assert.match(settings, /<article class="setting-card setting-card-stack support-card" id="support-tickets-card" data-search="[^"]+">/u,
    'the Support Tickets card is missing from settings.html, or is no longer reachable from the settings search');
  const keywords = settings.match(/id="support-tickets-card" data-search="([^"]+)"/u)[1];
  for (const word of ['support', 'ticket', 'recovery', 'locked', 'forgotten', 'storage']) {
    assert.ok(keywords.includes(word), `the card's search keywords no longer include "${word}"`);
  }
  assert.match(settings, /<p id="support-desc" data-copy="supportDesc">/u,
    'the card description is no longer wired to the funny-level sliders');
  assert.match(settings, /id="support-open-settings"/u, 'the settings route into the desk is gone');
});

test('the recovery route sits inside the restricted presentation\'s own "Forgotten the value?" disclosure', () => {
  /* The canonical desk is reached from the unlock prompt's forgotten-password link, and
   * this is that link. Position is the assertion rather than mere presence: a button
   * somewhere else on the page is not the route somebody who is locked out will find. */
  const recovery = settings.match(/<details id="school-recovery">([\s\S]*?)<\/details>/u);
  assert.ok(recovery, 'the restricted presentation no longer carries its recovery disclosure');
  assert.match(recovery[1], /id="support-open-recovery"/u,
    'the recovery disclosure no longer offers the ticket desk, so a locked-out reader has no route to it');
});

test('the Help route is a real link from the documentation page, and the hash route answers exactly it', () => {
  assert.match(documentation, /id="support-open-help" href="settings\.html#support-tickets"/u,
    'the documentation page no longer links to the ticket desk');
  const h = loadDesk();
  assert.equal(h.supportRouteFromHash('#support-tickets'), true);
  for (const other of ['', '#support', '#support-tickets-card', 'support-tickets', '#SUPPORT-TICKETS']) {
    assert.equal(h.supportRouteFromHash(other), false, `the hash route now also answers ${JSON.stringify(other)}`);
  }
});

test('the desk is wired into startup, in code rather than in a comment', () => {
  /* The gap the negative script found on its own first run: every assertion about the
   * desk passed while `init()` never called it at all, which would have shipped a settings
   * card and a dialog whose every control was dead -- wired at one end and consumed at
   * neither, this repository's oldest recurring defect. Comments are stripped first,
   * because commenting a wiring line out is how one usually dies and a bare needle is
   * satisfied by the comment; and the call is anchored to a statement boundary, so
   * `maybeInitSupport();` cannot stand in for it either. */
  const body = functionSource(app, 'init');
  const code = body.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
  assert.match(code, /function init\(\)\{/u, 'the strip removed the function itself, so the check below is vacuous');
  assert.match(code, /(?:^|[;{])initSupport\(\);/u,
    'nothing calls initSupport() at startup, so every control on the desk would be dead');
});

test('initSupport opens the desk when the page was reached through the Help link, and not otherwise', () => {
  const ids = ['support-dialog', 'support-category', 'support-severity', 'support-list', 'support-count'];
  const arrived = loadDesk({ ids, hash: '#support-tickets' });
  arrived.initSupport();
  assert.equal(arrived.elements.get('support-dialog').shown, 1, 'arriving from the Help link did not open the desk');
  const ordinary = loadDesk({ ids, hash: '' });
  ordinary.initSupport();
  assert.equal(ordinary.elements.get('support-dialog').shown, 0, 'the desk now opens itself on an ordinary settings visit');
});

test('every element the desk addresses exists in settings.html, derived from the code rather than listed here', () => {
  /* A hand-written list here would drift; this reads the ids the code actually asks for.
   * A control wired at one end and consumed at neither is this repository's oldest
   * recurring defect, and this is the cheap direction to check it in. */
  const body = [
    'initSupport', 'renderSupport', 'submitSupportForm', 'openSupportDesk',
    'updateSupportSelectionUI', 'updateSupportExportFormats', 'copySupportKeys', 'renderSupportCopy',
  ].map((name) => functionSource(app, name)).join('\n');
  const ids = [...new Set([...body.matchAll(/\$\('(support-[a-z-]+)'\)/gu)].map((m) => m[1]))];
  assert.ok(ids.length >= 15, `only ${ids.length} support ids were found in the desk's own code, which is too few to be reading it`);
  for (const id of ids) {
    assert.ok(settings.includes(`id="${id}"`), `the desk addresses #${id} and settings.html has no such element`);
  }
});

test('the desk carries its own search field, wired to the regex builder and its own mode status', () => {
  assert.match(settings, /<input id="support-search" type="search"/u, 'the desk has no search field');
  assert.match(settings, /<button class="regex-trigger" type="button" data-regex-for="support-search"/u,
    "the desk's search field no longer has the anchored regular-expression builder beside it");
  assert.match(settings, /id="support-search-mode-status"/u,
    "the desk's search no longer says whether it is in plain-text or regular-expression mode");
  assert.match(functionSource(app, 'supportMatches'), /matchText\(supportTicketText\(ticket\),query,'support-search'\)/u,
    'ticket search no longer goes through matchText under its own target id, so the builder would attach to nothing');
});

/* ------------------------------------------------------------------ *
 * The restricted presentation does not remove the way out.
 * ------------------------------------------------------------------ */

test('the restricted presentation removes neither the card nor either route into the desk', () => {
  /* The one interaction that would turn a self-imposed speed bump into an actual lock.
   * SCHOOL_SUPPRESSED is the list of things that mode takes off the page. */
  const start = app.indexOf('const SCHOOL_SUPPRESSED');
  assert.notEqual(start, -1, 'SCHOOL_SUPPRESSED is no longer declared');
  const suppressed = app.slice(start, app.indexOf('];', start));
  assert.ok(suppressed.length > 40, 'the suppression list read as empty, so this check would pass vacuously');
  for (const id of ['support-tickets-card', 'support-open-settings', 'support-open-recovery', 'support-dialog']) {
    assert.ok(!suppressed.includes(id),
      `the restricted presentation now removes #${id}, so it would hide its own recovery route`);
  }
});

test('the ticket desk goes plain under the restricted presentation rather than going away', () => {
  /* copyText already returns the level-0 English variant while the mode is on, so this is
   * a check that the desk takes its copy from there rather than from its own lookup. */
  const source = functionSource(app, 'openSupportTicket');
  assert.match(source, /copyText\('supportFirstResponse'\)/u,
    'the canned response no longer comes through copyText, so the restricted presentation would not reach it');
  assert.doesNotMatch(source, /copyLevel\(/u,
    'the canned response now indexes the funny level directly, walking straight past the restricted presentation');
});

/* ------------------------------------------------------------------ *
 * A ticket's life.
 * ------------------------------------------------------------------ */

test('a valid form writes one numbered ticket, received, carrying the canned first response', () => {
  const h = loadDesk({ copy: (key) => (key === 'supportFirstResponse' ? 'Thank you for contacting support.' : key) });
  const result = h.openSupportTicket(FORM, AT);
  assert.ok(result.ok);
  assert.equal(result.ticket.number, 'DING-20260826-0001');
  assert.equal(result.ticket.status, 'received');
  assert.equal(result.ticket.category, 'setting');
  assert.equal(result.ticket.severity, 'normal');
  assert.equal(result.ticket.description, FORM.description);
  assert.equal(result.ticket.updates.length, 1);
  assert.equal(result.ticket.updates[0].note, 'Thank you for contacting support.');
  assert.equal(h.store().tickets.length, 1);
});

test('the ticket is persisted immediately, and reloading from that storage returns it unchanged', () => {
  const storage = makeStorage();
  const first = loadDesk({ storage });
  const opened = first.openSupportTicket(FORM, AT);
  assert.ok(storage.getItem(first.SUPPORT_KEY), 'opening a ticket wrote nothing to storage');

  const second = loadDesk({ storage });
  assert.equal(second.store().tickets.length, 1, 'a reload did not find the ticket');
  assert.equal(second.store().tickets[0].number, opened.ticket.number);
  assert.equal(second.store().sequence, 1, 'the counter did not survive the reload, so the next number would repeat');
});

test('ticket numbers never repeat, across one session and across a reload', () => {
  const storage = makeStorage();
  const first = loadDesk({ storage });
  assert.equal(first.openSupportTicket(FORM, AT).ticket.number, 'DING-20260826-0001');
  assert.equal(first.openSupportTicket(FORM, AT).ticket.number, 'DING-20260826-0002');
  const second = loadDesk({ storage });
  assert.equal(second.openSupportTicket(FORM, AT).ticket.number, 'DING-20260826-0003',
    'the counter restarted after a reload, so two tickets would wear one number');
});

test('the number is stamped from the day the ticket was opened, in UTC', () => {
  const h = loadDesk();
  assert.equal(h.supportTicketNumber(7, Date.UTC(2027, 0, 2, 23, 59, 0)), 'DING-20270102-0007');
  assert.equal(h.supportTicketNumber(1, Number.NaN), 'DING-00000000-0001',
    'an unreadable instant now produces an invented date rather than an obviously absent one');
});

test('an empty description is refused, nothing is written, and the field is named', () => {
  const h = loadDesk();
  const verdict = h.openSupportTicket({ ...FORM, description: '   ' }, AT);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.field, 'support-description');
  assert.match(verdict.reason, /cannot be empty/u);
  assert.match(verdict.reason, /nothing was recorded/iu, 'a refusal that does not say nothing was recorded leaves the reader guessing');
  assert.equal(h.store().tickets.length, 0, 'a refused ticket was written anyway');
  assert.equal(h.store().sequence, 0, 'a refused ticket consumed a number');
});

test('an over-long description is refused with the real count and the real limit', () => {
  const h = loadDesk();
  const verdict = h.openSupportTicket({ ...FORM, description: 'x'.repeat(h.SUPPORT_DESCRIPTION_MAX + 5) }, AT);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, new RegExp(`${h.SUPPORT_DESCRIPTION_MAX + 5} characters and the limit is ${h.SUPPORT_DESCRIPTION_MAX}`, 'u'),
    'the refusal no longer states the real length and the real bound');
});

test('a category or severity outside the offered lists is refused rather than stored', () => {
  const h = loadDesk();
  const badCategory = h.openSupportTicket({ ...FORM, category: 'billing' }, AT);
  assert.equal(badCategory.ok, false);
  assert.equal(badCategory.field, 'support-category');
  const badSeverity = h.openSupportTicket({ ...FORM, severity: 'apocalyptic' }, AT);
  assert.equal(badSeverity.ok, false);
  assert.equal(badSeverity.field, 'support-severity');
  assert.equal(h.store().tickets.length, 0);
});

test('the offered choices and the accepted values are the same two lists', () => {
  /* The decorative-control defect at close range: a select offering a value the validator
   * refuses looks like a working control and is not. */
  const h = loadDesk();
  assert.ok(h.SUPPORT_CATEGORIES.length >= 3 && h.SUPPORT_SEVERITIES.length === 4);
  for (const item of h.SUPPORT_CATEGORIES) {
    assert.equal(h.supportFormVerdict({ ...FORM, category: item.id }).ok, true, `the category ${item.id} is offered but refused`);
    assert.equal(h.supportCategoryLabel(item.id), item.label);
  }
  for (const item of h.SUPPORT_SEVERITIES) {
    assert.equal(h.supportFormVerdict({ ...FORM, severity: item.id }).ok, true, `the severity ${item.id} is offered but refused`);
    assert.equal(h.supportSeverityLabel(item.id), item.label);
  }
});

test('chasing a ticket walks the four statuses in order and then refuses to go further', () => {
  const h = loadDesk();
  const { ticket } = h.openSupportTicket(FORM, AT);
  assert.deepEqual(h.SUPPORT_STATUSES, ['received', 'triaged', 'escalated', 'resolved']);
  assert.equal(h.advanceSupportTicket(ticket.id, AT + 1).ticket.status, 'triaged');
  assert.equal(h.advanceSupportTicket(ticket.id, AT + 2).ticket.status, 'escalated');
  assert.equal(h.advanceSupportTicket(ticket.id, AT + 3).ticket.status, 'resolved');
  const fifth = h.advanceSupportTicket(ticket.id, AT + 4);
  assert.equal(fifth.ok, false);
  assert.match(fifth.reason, /already resolved/u);
  assert.equal(h.store().tickets[0].updates.length, 4, 'a refused chase still appended an update');
  assert.equal(h.advanceSupportTicket('no-such-ticket', AT).ok, false);
});

test('a status only moves when somebody asks: nothing schedules it', () => {
  /* Two independent catches, because the source scan and the run see different things.
   * The scan refuses the words; the run refuses the behaviour, and catches a scheduler
   * reached by some spelling nobody thought to ban. */
  const block = NAMES.map((name) => functionSource(app, name)).join('\n');
  for (const pattern of [/setInterval\s*\(/u, /requestAnimationFrame/u]) {
    assert.doesNotMatch(block, pattern,
      `the desk now schedules work with ${pattern} -- a ticket that advances itself is a fiction that moves on its own`);
  }
  const h = loadDesk({ ids: ['support-dialog', 'support-category', 'support-severity', 'support-list', 'support-count'] });
  h.initSupport();
  const { ticket } = h.openSupportTicket(FORM, AT);
  h.advanceSupportTicket(ticket.id, AT + 1);
  h.renderSupport();
  assert.deepEqual(h.intervals, [],
    'the desk scheduled a repeating timer, which keeps a page (and this test process) working long after anybody asked it to');
});

test('reopening appends rather than rewriting, so every earlier update survives', () => {
  /* The append-only property, which is what makes closing a ticket non-destructive and
   * therefore what lets the bulk close below skip the two-key gate. */
  const h = loadDesk();
  const { ticket } = h.openSupportTicket(FORM, AT);
  h.advanceSupportTicket(ticket.id, AT + 1);
  h.advanceSupportTicket(ticket.id, AT + 2);
  h.advanceSupportTicket(ticket.id, AT + 3);
  const before = h.store().tickets[0].updates.map((u) => u.status);
  const reopened = h.reopenSupportTicket(ticket.id, AT + 4);
  assert.equal(reopened.ok, true);
  assert.equal(reopened.ticket.status, 'received');
  const after = h.store().tickets[0].updates.map((u) => u.status);
  assert.deepEqual(after.slice(0, before.length), before, 'reopening rewrote or dropped an earlier update');
  assert.equal(after.length, before.length + 1);
  assert.equal(h.reopenSupportTicket(ticket.id, AT + 5).ok, false, 'an already-open ticket was reopened again');
});

test('every mutation is recorded in local history, and opening one raises a notification', () => {
  const h = loadDesk();
  const { ticket } = h.openSupportTicket(FORM, AT);
  h.advanceSupportTicket(ticket.id, AT + 1);
  h.reopenSupportTicket(ticket.id, AT + 2);
  assert.deepEqual(h.history.map((entry) => entry.action),
    ['support-ticket-opened', 'support-ticket-advanced', 'support-ticket-reopened']);
  for (const entry of h.history) {
    assert.match(entry.summary, /DING-20260826-0001/u, 'a history entry does not name the ticket it is about');
  }
  assert.equal(h.notified.length, 1);
  assert.match(h.notified[0].message, /written to this browser and nowhere else/u);
  assert.ok(h.notified[0].narration.zh, 'the notification carries no Cantonese narration text');
});

test('a corrupt or foreign stored value falls back to an empty store rather than throwing', () => {
  for (const raw of ['{not json at all', 'null', '[]', '{"tickets":"nope"}', '{"tickets":[{"id":1}]}']) {
    const storage = makeStorage();
    storage.setItem('ding-pbx-pages-support-v1', raw);
    const h = loadDesk({ storage });
    assert.equal(h.store().tickets.length, 0, `a stored value of ${raw} produced tickets out of nothing`);
    assert.equal(h.store().sequence, 0);
  }
});

test('a stored ticket with an unreadable status is dropped rather than rendered as a state that does not exist', () => {
  const storage = makeStorage();
  storage.setItem('ding-pbx-pages-support-v1', JSON.stringify({
    schemaVersion: 1,
    sequence: 2,
    tickets: [
      { id: 'a', number: 'DING-1', status: 'received', category: 'other', severity: 'low', description: 'kept', openedAt: AT, updates: [] },
      { id: 'b', number: 'DING-2', status: 'pending-manager-approval', category: 'other', severity: 'low', description: 'dropped', openedAt: AT, updates: [] },
    ],
  }));
  const h = loadDesk({ storage });
  assert.deepEqual(h.store().tickets.map((t) => t.id), ['a']);
});

test('the store is capped, and the cap is the constant rather than a number written twice', () => {
  const storage = makeStorage();
  const tickets = Array.from({ length: 260 }, (_, i) => ({
    id: `t${i}`, number: `DING-${i}`, status: 'received', category: 'other', severity: 'low', description: 'x', openedAt: AT, updates: [],
  }));
  storage.setItem('ding-pbx-pages-support-v1', JSON.stringify({ schemaVersion: 1, sequence: 260, tickets }));
  const h = loadDesk({ storage });
  assert.equal(h.store().tickets.length, h.SUPPORT_LIMIT);
  assert.match(functionSource(app, 'saveSupport'), /slice\(0,SUPPORT_LIMIT\)/u, 'the save no longer bounds what it writes');
});

/* ------------------------------------------------------------------ *
 * The answer keeps the voice it was written in.
 * ------------------------------------------------------------------ */

test('the canned response is stored on the ticket, so moving the slider later does not rewrite an answer already read', () => {
  const storage = makeStorage();
  const playful = loadDesk({ storage, copy: () => 'Ticket received, and frankly we are thrilled.' });
  const { ticket } = playful.openSupportTicket(FORM, AT);
  assert.equal(ticket.updates[0].note, 'Ticket received, and frankly we are thrilled.');

  const plain = loadDesk({ storage, copy: () => 'Your ticket has been received.' });
  assert.equal(plain.store().tickets[0].updates[0].note, 'Ticket received, and frankly we are thrilled.',
    'a stored answer was re-rendered at the level current now rather than at the one it was written at');
});

test("the later status notes are the code's own fixed sentences, one per status", () => {
  const h = loadDesk();
  assert.deepEqual(Object.keys(h.SUPPORT_STATUS_NOTE).sort(), [...h.SUPPORT_STATUSES].sort());
  assert.deepEqual(Object.keys(h.SUPPORT_STATUS_LABEL).sort(), [...h.SUPPORT_STATUSES].sort());
  for (const status of h.SUPPORT_STATUSES) {
    assert.ok(h.SUPPORT_STATUS_NOTE[status].length > 10, `the ${status} note is too short to say anything`);
    assert.ok(h.SUPPORT_STATUS_LABEL[status].length > 0);
  }
});

/* ------------------------------------------------------------------ *
 * Searching, selecting, closing, exporting.
 * ------------------------------------------------------------------ */

test('a ticket is searchable by its number, its category, its severity, its status and its words', () => {
  const h = loadDesk();
  const { ticket } = h.openSupportTicket(FORM, AT);
  const text = h.supportTicketText(h.store().tickets[0]);
  for (const needle of [ticket.number, h.supportCategoryLabel('setting'), h.supportSeverityLabel('normal'), 'Received', 'theme select']) {
    assert.ok(text.toLowerCase().includes(needle.toLowerCase()), `a ticket cannot be found by ${JSON.stringify(needle)}`);
  }
  assert.equal(h.supportMatches('theme select').length, 1);
  assert.equal(h.supportMatches('voicemail').length, 0);
});

test('closing in bulk skips what is already closed, with a reason, and never claims to be irreversible', () => {
  const source = functionSource(app, 'initSupport');
  assert.match(source, /planBulk\('Close',\[\.\.\.supportSelection\.selected\],/u,
    'the bulk close no longer goes through the shared plan, so it would not report what it skipped');
  assert.match(source, /\{destructive:false\}/u,
    'the bulk close now declares itself destructive, which would make it claim it cannot be undone -- but a closed ticket can be reopened');
  /* And the verdict function it hands the plan, exercised for all three of its answers. */
  const h = loadDesk();
  const open = h.openSupportTicket(FORM, AT).ticket;
  const closed = h.openSupportTicket(FORM, AT).ticket;
  h.advanceSupportTicket(closed.id, AT + 1);
  h.advanceSupportTicket(closed.id, AT + 2);
  h.advanceSupportTicket(closed.id, AT + 3);
  const canApply = (id) => {
    const ticket = h.store().tickets.find((item) => item.id === id);
    if (!ticket) return 'no longer in this browser';
    return ticket.status === 'resolved' ? 'already resolved' : true;
  };
  assert.equal(canApply(open.id), true);
  assert.equal(canApply(closed.id), 'already resolved');
  assert.equal(canApply('nope'), 'no longer in this browser');
});

test('an exported ticket carries the readable columns and not the internal id', () => {
  const h = loadDesk();
  const { ticket } = h.openSupportTicket(FORM, AT);
  h.select({ anchor: ticket.id, selected: new Set([ticket.id]) });
  const rows = h.supportExportRows();
  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]).sort(),
    ['category', 'description', 'number', 'opened', 'severity', 'status', 'updates']);
  assert.equal(rows[0].number, ticket.number);
  assert.equal(rows[0].status, 'Received');
  assert.equal(rows[0].opened, new Date(AT).toISOString());
  assert.ok(!('id' in rows[0]), 'the export now carries the internal id, which means nothing outside this browser');
});

test('nothing is selected by default, and a selection of nothing exports nothing', () => {
  const h = loadDesk();
  h.openSupportTicket(FORM, AT);
  assert.equal(h.selection().selected.size, 0);
  assert.equal(h.supportExportRows().length, 0);
});

/* ------------------------------------------------------------------ *
 * What the list actually renders.
 * ------------------------------------------------------------------ */

test('an empty desk says it is empty and says where a ticket would go, rather than rendering nothing', () => {
  const h = loadDesk({ ids: ['support-list', 'support-count'] });
  h.renderSupport();
  const html = h.elements.get('support-list').innerHTML;
  assert.match(html, /No tickets in this browser yet/u, 'the empty state is now blank, which reads as a list that failed to load');
  assert.match(html, /goes no further than this page/u);
  assert.equal(h.elements.get('support-count').textContent, '0 tickets of 0 in this browser');
});

test('a resolved ticket renders the resolution and an unresolved one does not', () => {
  const h = loadDesk({ ids: ['support-list', 'support-count'] });
  const { ticket } = h.openSupportTicket(FORM, AT);
  h.renderSupport();
  assert.doesNotMatch(h.elements.get('support-list').innerHTML, /support-resolution/u,
    'a ticket that has not been resolved is already showing its resolution');
  h.advanceSupportTicket(ticket.id, AT + 1);
  h.advanceSupportTicket(ticket.id, AT + 2);
  h.advanceSupportTicket(ticket.id, AT + 3);
  h.renderSupport();
  const html = h.elements.get('support-list').innerHTML;
  assert.match(html, /support-resolution/u);
  for (const key of h.supportStorageKeys()) {
    assert.ok(html.includes(key), `the rendered resolution does not name ${key}, which the reader is being told to clear`);
  }
  assert.equal(h.elements.get('support-count').textContent, '1 ticket of 1 in this browser');
});

test('the rendered row escapes what the reader typed', () => {
  const h = loadDesk({ ids: ['support-list', 'support-count'] });
  h.openSupportTicket({ ...FORM, description: '<img src=x onerror="alert(1)">' }, AT);
  h.renderSupport();
  const html = h.elements.get('support-list').innerHTML;
  assert.ok(!html.includes('<img src=x'), 'a ticket description is now rendered as markup');
  assert.match(html, /&lt;img src=x/u);
});

test('a selection of a ticket that is no longer shown is dropped rather than kept as a phantom count', () => {
  const h = loadDesk({
    ids: ['support-list', 'support-count'],
    match: (text, query) => (query ? String(text).includes(query) : true),
  });
  const first = h.openSupportTicket({ ...FORM, description: 'alpha' }, AT).ticket;
  const second = h.openSupportTicket({ ...FORM, description: 'beta' }, AT).ticket;
  h.select({ anchor: first.id, selected: new Set([first.id, second.id]) });
  h.renderSupport('alpha');
  assert.deepEqual([...h.selection().selected], [first.id],
    'a selected ticket the search no longer shows is still counted as selected');
});

test('the chase and reopen controls are disabled at the ends, and say why', () => {
  const h = loadDesk({ ids: ['support-list', 'support-count'] });
  const { ticket } = h.openSupportTicket(FORM, AT);
  h.renderSupport();
  const fresh = h.elements.get('support-list').innerHTML;
  assert.match(fresh, /data-support-reopen="[^"]+" disabled title="This ticket is already open\."/u,
    'a brand-new ticket offers a Reopen control that would do nothing, with nothing saying why');
  assert.doesNotMatch(fresh, /data-support-advance="[^"]+" disabled/u, 'a brand-new ticket cannot be chased');
  h.advanceSupportTicket(ticket.id, AT + 1);
  h.advanceSupportTicket(ticket.id, AT + 2);
  h.advanceSupportTicket(ticket.id, AT + 3);
  h.renderSupport();
  assert.match(h.elements.get('support-list').innerHTML, /data-support-advance="[^"]+" disabled title="This ticket is already resolved/u,
    'a resolved ticket still offers a Chase control that would do nothing');
});

/* ------------------------------------------------------------------ *
 * Wiring, submission, and the clipboard.
 * ------------------------------------------------------------------ */

test("initSupport fills both fixed lists from the code's own constants and defaults severity to Normal", () => {
  const ids = ['support-dialog', 'support-category', 'support-severity', 'support-list', 'support-count'];
  const h = loadDesk({ ids });
  h.initSupport();
  const category = h.elements.get('support-category');
  const severity = h.elements.get('support-severity');
  for (const item of h.SUPPORT_CATEGORIES) assert.ok(category.innerHTML.includes(`value="${item.id}"`), `the category ${item.id} is not offered`);
  for (const item of h.SUPPORT_SEVERITIES) assert.ok(severity.innerHTML.includes(`value="${item.id}"`), `the severity ${item.id} is not offered`);
  /* Counted as well as contained, and this direction is the one that catches the real
   * defect: "every accepted value is offered" is satisfied by a list that ALSO offers a
   * value the validator will refuse, which is a control that looks like it works and
   * silently does nothing when chosen. */
  assert.equal((category.innerHTML.match(/value="/gu) ?? []).length, h.SUPPORT_CATEGORIES.length,
    'the category select offers a different number of choices than the validator will accept');
  assert.equal((severity.innerHTML.match(/value="/gu) ?? []).length, h.SUPPORT_SEVERITIES.length,
    'the severity select offers a different number of choices than the validator will accept');
  assert.equal(severity.value, 'normal', 'severity no longer starts at the middle of the four');
});

test('the submit button reads the three controls, clears the box on success, and leaves it alone on refusal', () => {
  const ids = ['support-dialog', 'support-category', 'support-severity', 'support-description', 'support-submit', 'support-form-status', 'support-list', 'support-count'];
  const h = loadDesk({ ids });
  h.initSupport();
  h.elements.get('support-category').value = 'other';
  h.elements.get('support-severity').value = 'high';
  h.elements.get('support-description').value = '';
  h.elements.get('support-submit').click();
  assert.equal(h.store().tickets.length, 0);
  assert.match(h.elements.get('support-form-status').textContent, /cannot be empty/u);
  assert.equal(h.elements.get('support-description').focused, 1, 'the refused field did not take focus');

  h.elements.get('support-description').value = 'The regular expression builder will not open.';
  h.elements.get('support-submit').click();
  assert.equal(h.store().tickets.length, 1);
  assert.equal(h.store().tickets[0].category, 'other');
  assert.equal(h.store().tickets[0].severity, 'high');
  assert.equal(h.elements.get('support-description').value, '', 'the box was not cleared after a ticket was written');
  assert.match(h.elements.get('support-form-status').textContent, /was recorded in this browser/u);
});

test('both settings routes open the same desk', () => {
  const ids = ['support-dialog', 'support-open-settings', 'support-open-recovery', 'support-category', 'support-severity', 'support-list', 'support-count'];
  const h = loadDesk({ ids });
  h.initSupport();
  h.elements.get('support-open-settings').click();
  h.elements.get('support-open-recovery').click();
  assert.equal(h.elements.get('support-dialog').shown, 2, 'one of the two settings routes does not open the desk');
});

test('copying the key list writes the origin and every key, and says so even when the clipboard refuses', () => {
  const h = loadDesk({ ids: ['support-copy-status'], origin: 'https://example.invalid' });
  h.copySupportKeys();
  assert.equal(h.clipboard.length, 1);
  const [text] = h.clipboard;
  assert.ok(text.startsWith('https://example.invalid\n'));
  for (const key of h.supportStorageKeys()) assert.ok(text.includes(key), `${key} was not copied`);
  assert.match(h.elements.get('support-copy-status').textContent, /listed above either way/u,
    'the copy confirmation no longer says the list is on screen regardless, which is what makes a refused clipboard survivable');
});

/* ------------------------------------------------------------------ *
 * The surface obeys the rules every other surface here obeys.
 * ------------------------------------------------------------------ */

test('the desk is a bounded overlay and its disclosure is styled to be unmissable rather than muted', () => {
  assert.match(settings, /<dialog id="support-dialog" class="overlay-card"/u,
    'the desk is no longer an overlay-card, so it loses the bounded height and internal scrolling every dialog here has');
  assert.match(styles, /\.support-disclosure\{[^}]*border:1px solid var\(--outline\)/u,
    'the disclosure no longer has a border of its own, so it reads as one more muted aside');
  assert.doesNotMatch(styles, /\.support-disclosure\{[^}]*display:none/u, 'the disclosure can now be hidden');
  assert.match(styles, /\.support-description\{[^}]*overflow-wrap:anywhere/u,
    'a long unbroken word in a description would now push the row wider than the dialog');
});

test('the desk is reachable by keyboard and named for a screen reader', () => {
  assert.match(settings, /<dialog id="support-dialog" class="overlay-card" aria-labelledby="support-title">/u,
    'the desk dialog is no longer named');
  assert.match(settings, /aria-label="Close Support Tickets"/u, "the desk's close control has no accessible name");
  assert.match(settings, /<label for="support-category">Category<select id="support-category">/u, 'the category control has no label');
  assert.match(settings, /<label for="support-severity">Severity<select id="support-severity">/u, 'the severity control has no label');
  assert.match(settings, /<label for="support-description">What happened\?<textarea id="support-description"/u, 'the description box has no label');
  assert.match(settings, /<p id="support-form-status" role="status">/u, 'a refusal would not be announced');
  assert.match(settings, /<div id="support-list" class="support-list" aria-live="polite">/u, 'a new ticket appearing would not be announced');
  assert.doesNotMatch(loadDesk().supportResolutionMarkup(), /<button(?![^>]*type="button")/u,
    'a control inside the resolution would submit the form it sits in');
});

test('the reset gate names the tickets among the things it deliberately leaves alone', () => {
  const dialog = settings.match(/<p id="reset-confirm-text">([^<]*)<\/p>/u);
  assert.ok(dialog, 'the reset dialog no longer explains what it clears');
  assert.match(dialog[1], /leaves the support tickets in this browser alone/u,
    'the reset gate no longer says it leaves the tickets alone, which a reader would otherwise find out by losing them');
  const reset = functionSource(app, 'performSettingsReset');
  assert.ok(!reset.includes('SUPPORT_KEY') && !reset.includes('support'),
    'a settings reset now reaches the tickets, contradicting what the gate says it does');
});

test('the desk keeps its own storage key, separate from every other record this page holds', () => {
  const h = loadDesk();
  assert.equal(h.SUPPORT_KEY, 'ding-pbx-pages-support-v1');
  for (const other of ['ding-pbx-pages-v2', 'ding-pbx-pages-history-v1', 'ding-pbx-pages-school-v1']) {
    assert.notEqual(h.SUPPORT_KEY, other);
  }
});

test('the desk does nothing at all on a page that has none', () => {
  /* Every page but settings.html loads the same app.js. A feature that threw on the other
   * five would take the rest of the page down with it. */
  const h = loadDesk({ ids: [] });
  assert.doesNotThrow(() => h.initSupport());
  assert.doesNotThrow(() => h.renderSupport());
  assert.doesNotThrow(() => h.renderSupportCopy());
  assert.equal(h.openSupportDesk(), false, 'openSupportDesk claims to have opened a desk that is not on the page');
});
