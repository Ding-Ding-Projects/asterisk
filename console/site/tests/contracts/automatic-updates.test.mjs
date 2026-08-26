/**
 * Contract: automatic-updates on the pages-site.
 *
 * A page installs nothing, so the canonical updater cannot be copied clause by clause.
 * What it is FOR survives the translation exactly: notice that what is published has
 * moved on, say so without interrupting anybody, and let the person take the new one
 * when they choose. Reloading is the whole installation step. Four clauses have no
 * equivalent at all -- staged download, signature, restart, roll-back -- and the card
 * says so out loud rather than implying machinery this surface does not have.
 *
 * The behavioural half runs the real extracted source against a recording page and a
 * fake network, in the style `app-display-name.test.mjs` established here. That matters
 * more than usual for a watch: "the constant is there", "the button is on the page" and
 * "a check ran" are all true of a watch that never notices anything, and a
 * source-pattern test cannot tell those apart from a working one.
 *
 * Two properties carry most of the weight, and most of the tests are about them.
 *
 *   - The comparison is on the build COMMIT, never the version label. Two builds of one
 *     release wear the same label, so a check resting on it reports "current" about a
 *     page that is not.
 *   - The one request this site makes cannot leave this origin. Everything else here is
 *     a bundled local asset, so the property worth being able to check is not "it asked
 *     for the right file" but "it could not have asked somebody else's server".
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/* CRLF stripped before anything is matched across lines. A newline-only pattern against
 * a CRLF checkout matches nothing, and an assertion that matches nothing passes in the
 * one direction nobody notices. */
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const app = read('app.js');
const settings = read('settings.html');
const styles = read('styles.css');
const build = read('build.mjs');
const registry = json('feature-registry.json');
const locales = json('locales/feature-registry.json');

const COMMIT_A = '1111111111111111111111111111111111111111';
const COMMIT_B = '2222222222222222222222222222222222222222';

/* ------------------------------------------------------------------ *
 * Running the real source.
 * ------------------------------------------------------------------ */

/** The source of one `function name(...)` declaration, brace-counted so nesting survives. */
function functionSource(src, name) {
  const found = src.indexOf(`function ${name}(`);
  assert.notEqual(found, -1, `function ${name} is not declared in site/app.js`);
  /* `checkForUpdate` is declared `async function`, and a slice that started at the word
   * `function` would drop the `async` and then fail to parse its own `await`. Keep the
   * modifier when it is there. */
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

/** The four bounds the watch runs under, taken from the file rather than restated here. */
function boundsSource(src) {
  const start = src.indexOf("const VERSION_MANIFEST_NAME = 'version.json';");
  assert.notEqual(start, -1, 'VERSION_MANIFEST_NAME is no longer declared in site/app.js');
  const endMarker = 'const UPDATE_FETCH_TIMEOUT_MS = 8000;';
  const end = src.indexOf(endMarker, start);
  assert.notEqual(end, -1, 'UPDATE_FETCH_TIMEOUT_MS is no longer declared in site/app.js');
  return src.slice(start, end + endMarker.length);
}

/** The mutable pair the watch keeps between calls. */
function stateSource(src) {
  const line = "let updateWatch={state:'idle',direction:'unknown',reason:'',deployed:null,checkedAt:0,inFlight:false};";
  assert.ok(src.includes(line), 'the updateWatch record is no longer declared as expected in site/app.js');
  return `${line}\nlet updateTimer=null;`;
}

const NAMES = [
  'runningBuild', 'shortCommit', 'versionManifestUrl', 'parseVersionManifest',
  'compareBuildVersions', 'updateVerdict', 'updateHeadline', 'runningBuildLine',
  'updateStatusLine', 'updateCheckDisabledReason', 'ensureUpdateUI', 'renderUpdateBanner',
  'dismissUpdateBanner', 'renderUpdateState', 'checkForUpdate', 'startUpdateWatch',
  'stopUpdateWatch', 'initUpdates',
];

/** A throwaway element that records what was done to it rather than shrugging. */
function makeElement(tag) {
  return {
    tagName: tag,
    id: '',
    className: '',
    type: '',
    href: '',
    title: '',
    hidden: false,
    disabled: false,
    onclick: null,
    textContent: '',
    children: [],
    attributes: {},
    listeners: {},
    setAttribute(key, value) { this.attributes[key] = String(value); },
    removeAttribute(key) { delete this.attributes[key]; if (key === 'title') this.title = ''; },
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); },
    append(...kids) { this.children.push(...kids); },
    prepend(...kids) { this.children.unshift(...kids); },
    replaceChildren(...kids) { this.children = [...kids]; },
    click() { for (const handler of this.listeners.click ?? []) handler(); },
  };
}

function findById(node, id) {
  for (const child of node.children) {
    if (child.id === id) return child;
    const deeper = findById(child, id);
    if (deeper) return deeper;
  }
  return null;
}

function flatten(node, out = []) {
  for (const child of node.children) { out.push(child); flatten(child, out); }
  return out;
}

/**
 * Build a throwaway page and run the real deployed-version watch against it.
 *
 * Every collaborator records rather than stubs: the requests made, the notifications
 * raised, the saves, the timers scheduled and the reloads asked for are all kept,
 * because "it noticed a new version" and "it noticed a new version and quietly reloaded
 * the page out from under somebody" are the two outcomes this feature has to be able to
 * tell apart.
 */
function loadWatch({
  running = { version: 'v0.1.5', commit: COMMIT_A, builtAt: '2026-08-26T10:00:00.000Z' },
  base = './',
  baseUri = 'https://example.invalid/site/settings.html',
  respond = null,
  vocabulary = (text) => text,
} = {}) {
  const main = makeElement('main');
  const cardStatus = makeElement('p');
  const cardIdentity = makeElement('p');
  const cardButton = makeElement('button');
  const card = {
    'update-status': cardStatus,
    'update-identity': cardIdentity,
    'update-check': cardButton,
  };

  const doc = {
    baseURI: baseUri,
    createElement: (tag) => makeElement(tag),
    querySelector: (selector) => (selector === 'main' ? main : null),
  };
  const $ = (id) => card[id] ?? findById(main, id);

  const state = { updateDismissedCommit: '' };
  const saves = [];
  const notifications = [];
  const requests = [];
  const timeouts = [];
  const clearedTimeouts = [];
  const intervals = [];
  const clearedIntervals = [];
  const reloads = [];

  const fetchFake = (url, options) => {
    requests.push({ url, options });
    if (typeof respond !== 'function') return Promise.reject(new Error('no responder supplied'));
    return respond(url, options, requests.length);
  };

  const body = `${boundsSource(app)}\n${stateSource(app)}\n`
    + `${NAMES.map((name) => functionSource(app, name)).join('\n')}\n`
    + 'return { '
    + `${NAMES.join(', ')}, VERSION_MANIFEST_NAME, UPDATE_CHECK_INTERVAL_MS, `
    + 'UPDATE_MANIFEST_MAX_BYTES, UPDATE_FETCH_TIMEOUT_MS, watch: () => updateWatch };';

  // eslint-disable-line no-new-func -- deliberately re-running the real extracted source
  const api = new Function(
    'SITE_BUILD_VERSION', 'SITE_BUILD_COMMIT', 'SITE_BUILD_AT', 'BASE',
    'document', '$', 'state', 'save', 'notify', 'applyVocabularyText',
    'fetch', 'location', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', body,
  )(
    running.version, running.commit, running.builtAt, base,
    doc, $, state,
    () => saves.push(JSON.stringify(state)),
    (title, text, narration) => notifications.push({ title, body: text, narration }),
    vocabulary,
    fetchFake,
    { reload: () => reloads.push(1) },
    (handler, ms) => { timeouts.push({ handler, ms }); return timeouts.length; },
    (id) => clearedTimeouts.push(id),
    (handler, ms) => { intervals.push({ handler, ms }); return intervals.length; },
    (id) => clearedIntervals.push(id),
  );

  return {
    ...api,
    main,
    state,
    saves,
    notifications,
    requests,
    timeouts,
    clearedTimeouts,
    intervals,
    clearedIntervals,
    reloads,
    cardStatus,
    cardIdentity,
    cardButton,
    banner: () => findById(main, 'update-banner'),
    bannerText: () => flatten(findById(main, 'update-banner') ?? main).map((el) => el.textContent).join(' | '),
  };
}

/** A response the fake network can hand back. */
const respondWith = (payload, { ok = true, status = 200 } = {}) => () => Promise.resolve({
  ok,
  status,
  text: () => Promise.resolve(typeof payload === 'string' ? payload : JSON.stringify(payload)),
});

const manifest = (overrides = {}) => ({
  schemaVersion: 1,
  version: 'v0.1.6',
  commit: COMMIT_B,
  builtAt: '2026-08-26T12:00:00.000Z',
  ...overrides,
});

/* ------------------------------------------------------------------ *
 * The registry rows agree with the code.
 * ------------------------------------------------------------------ */

test('the site feature registry carries an implemented row for automatic-updates', () => {
  const row = registry.features['automatic-updates'];
  assert.ok(row, 'no automatic-updates row in site/feature-registry.json');
  assert.equal(row.state, 'implemented',
    'the site now carries a real deployed-version watch, so "absent" is no longer the honest state');
  assert.ok(row.files.includes('site/app.js') && row.files.includes('site/build.mjs'),
    'the row must name both halves: the page that checks, and the build that publishes what it checks against');
});

test('the localization registry records the copy this feature added', () => {
  const row = locales.features['automatic-updates'];
  assert.equal(row.state, 'localized', 'the feature ships four English and four Cantonese variants of its description');
  assert.deepEqual(row.copyKeys, ['updatesDesc']);
  assert.ok(locales.knownCopyKeys.includes('updatesDesc'), 'updatesDesc is not listed among the known COPY keys');
});

/* ------------------------------------------------------------------ *
 * What ships in the source, and what the build fills in.
 * ------------------------------------------------------------------ */

test('the committed source carries no build identity at all, so a source-served page says so', () => {
  /* The same shape the changelog already uses: a page served straight out of the source
   * directory has no published build to be judged against, and admits it rather than
   * asking for a manifest that was never written for it. */
  for (const name of ['SITE_BUILD_VERSION', 'SITE_BUILD_COMMIT', 'SITE_BUILD_AT']) {
    assert.match(app, new RegExp(`^  const ${name} = '';$`, 'mu'),
      `${name} is no longer shipped empty in site/app.js -- a committed build identity would be a stale one the day after it was written`);
  }
});

test('the build bakes all three identity values and publishes the manifest, or neither', () => {
  assert.match(build, /if \(buildIdentity\.resolved\) \{\n\s+text = replaceOnce\(text, "const SITE_BUILD_VERSION = '';"/u,
    'site/build.mjs no longer bakes the identity behind a single resolved check');
  for (const name of ['SITE_BUILD_VERSION', 'SITE_BUILD_COMMIT', 'SITE_BUILD_AT']) {
    assert.ok(build.includes(`const ${name} = '';`), `site/build.mjs no longer replaces ${name}`);
  }
  assert.match(build, /if \(buildIdentity\.resolved\) \{\n\s*await writeFile\(join\(output, 'version\.json'\)/u,
    'site/build.mjs no longer writes version.json behind the same resolved check, so a page could carry a commit whose manifest was never published');
  assert.match(build, /return \{ resolved: false, reason: 'git could not name the commit this site was built from' \};/u,
    'site/build.mjs no longer refuses to name a build it cannot identify -- a placeholder commit would be an invented reading');
});

test('the settings card exists, is searchable, and states the four clauses that have no equivalent here', () => {
  assert.match(settings, /<article class="setting-card setting-card-stack" data-search="update updates version published deployed reload check current changelog">/u,
    'the Updates card is missing from settings.html, or is no longer reachable from the settings search');
  for (const id of ['updates-desc', 'update-identity', 'update-status', 'update-check']) {
    assert.ok(settings.includes(`id="${id}"`), `the Updates card no longer carries #${id}`);
  }
  assert.match(settings, /<p id="updates-desc" data-copy="updatesDesc">/u,
    'the description is no longer wired to the funny-level sliders');
  assert.match(settings, /there is no staged download, no signature to verify, no restart, and nothing to roll back/u,
    'the card no longer names the four canonical clauses this surface cannot support -- a silent gap reads as an oversight');
  assert.match(settings, /<p id="update-status" role="status">/u, 'the status line is no longer announced');
  assert.match(styles, /\.update-banner\[hidden\]\{display:none\}/u, 'a hidden banner would still occupy the page');
});

/* ------------------------------------------------------------------ *
 * Reading the published manifest.
 * ------------------------------------------------------------------ */

test('a well-formed manifest is read back exactly, and nothing else on it survives', () => {
  const h = loadWatch();
  const result = h.parseVersionManifest(JSON.stringify(manifest({ note: 'ignored' })));
  assert.equal(result.ok, true, result.reason);
  assert.deepEqual(result.manifest, { version: 'v0.1.6', commit: COMMIT_B, builtAt: '2026-08-26T12:00:00.000Z' });
});

test('the size bound is applied before the JSON is parsed, so a huge but valid body is still refused', () => {
  const h = loadWatch();
  const huge = JSON.stringify(manifest({ padding: 'x'.repeat(h.UPDATE_MANIFEST_MAX_BYTES) }));
  assert.ok(huge.length > h.UPDATE_MANIFEST_MAX_BYTES, 'the fixture is not actually over the bound, so this proves nothing');
  const result = h.parseVersionManifest(huge);
  assert.equal(result.ok, false);
  assert.match(result.reason, /larger than the \d+-byte bound/u);
});

test('every unreadable manifest is refused with its own reason rather than a shrug', () => {
  const h = loadWatch();
  const cases = [
    [undefined, /was not text/u],
    ['{oops', /not valid JSON/u],
    ['[]', /not a JSON object/u],
    ['null', /not a JSON object/u],
    [JSON.stringify(manifest({ schemaVersion: 2 })), /schema version 2/u],
    [JSON.stringify(manifest({ version: '' })), /no readable version label/u],
    [JSON.stringify(manifest({ version: 'v'.repeat(41) })), /no readable version label/u],
    [JSON.stringify(manifest({ version: 'v0.1 6' })), /no readable version label/u],
    [JSON.stringify(manifest({ commit: COMMIT_B.slice(0, 39) })), /no full 40-character commit/u],
    /* Upper case is a real refusal, and the obvious fixture cannot express it: COMMIT_B is
     * all digits, so `.toUpperCase()` returns it unchanged and the case passes vacuously.
     * It did, on the first run of this file. */
    [JSON.stringify(manifest({ commit: 'A'.repeat(40) })), /no full 40-character commit/u],
    [JSON.stringify(manifest({ builtAt: 'sometime last week' })), /no readable build time/u],
    [JSON.stringify(manifest({ builtAt: 42 })), /no readable build time/u],
  ];
  for (const [payload, expected] of cases) {
    const result = h.parseVersionManifest(payload);
    assert.equal(result.ok, false, `expected ${String(payload).slice(0, 40)} to be refused`);
    assert.match(result.reason, expected);
  }
});

/* ------------------------------------------------------------------ *
 * Deciding what two identities mean.
 * ------------------------------------------------------------------ */

test('version labels order numerically, and refuse to order at all when either is not the published shape', () => {
  const h = loadWatch();
  assert.equal(h.compareBuildVersions('v0.1.5', 'v0.1.10'), -1, '10 must sort after 5, not before it as a string would');
  assert.equal(h.compareBuildVersions('v0.1.10', 'v0.1.5'), 1);
  assert.equal(h.compareBuildVersions('v0.1.5', 'v0.1.5'), 0);
  assert.equal(h.compareBuildVersions('0.1.5', 'v0.1.6'), -1, 'the leading v is optional');
  for (const pair of [['unversioned', 'v0.1.5'], ['v0.1.5', 'unversioned'], ['v0.1', 'v0.1.5'], [null, 'v0.1.5']]) {
    assert.equal(h.compareBuildVersions(pair[0], pair[1]), null,
      `${JSON.stringify(pair)} must not be ordered -- guessing an order is how a roll-back gets announced as an update`);
  }
});

test('the verdict rests on the commit, and never on the version label', () => {
  const h = loadWatch();
  const running = { version: 'v0.1.5', commit: COMMIT_A };
  assert.deepEqual(h.updateVerdict({ version: 'v0.1.5', commit: '' }, { commit: COMMIT_B }),
    { state: 'unbuilt', direction: 'unknown' });
  assert.deepEqual(h.updateVerdict(running, null), { state: 'unknown', direction: 'unknown' });
  /* The whole reason the commit decides: two builds of one release wear one label. A
   * check resting on the label would call this pair current, and be wrong. */
  assert.deepEqual(h.updateVerdict(running, { version: 'v0.1.5', commit: COMMIT_B }),
    { state: 'available', direction: 'rebuilt' });
  assert.deepEqual(h.updateVerdict(running, { version: 'v0.1.5', commit: COMMIT_A }),
    { state: 'current', direction: 'same' },
    'the same commit under any label is the same build');
  assert.deepEqual(h.updateVerdict(running, { version: 'v0.1.6', commit: COMMIT_B }),
    { state: 'available', direction: 'newer' });
  assert.deepEqual(h.updateVerdict(running, { version: 'v0.1.4', commit: COMMIT_B }),
    { state: 'available', direction: 'older' });
  assert.deepEqual(h.updateVerdict(running, { version: 'unversioned', commit: COMMIT_B }),
    { state: 'available', direction: 'unknown' });
});

test('the headline says what actually happened, including when the published page went backwards', () => {
  const h = loadWatch();
  const deployed = { version: 'v0.1.6', commit: COMMIT_B };
  assert.match(h.updateHeadline({ direction: 'newer', deployed }), /^A newer version of this page has been published: v0\.1\.6 \(2222222\)\.$/u);
  assert.match(h.updateHeadline({ direction: 'older', deployed }), /rolled back to v0\.1\.6 \(2222222\)/u);
  assert.match(h.updateHeadline({ direction: 'rebuilt', deployed }), /rebuilt and republished at the same version/u);
  assert.match(h.updateHeadline({ direction: 'unknown', deployed }), /is now v0\.1\.6 \(2222222\), which is not the build you are reading/u);
  assert.equal(h.updateHeadline({ direction: 'newer', deployed: null }), '');
});

test('every state the watch can be in has its own status line, and none of them claims more than it knows', () => {
  const h = loadWatch();
  const running = { version: 'v0.1.5', commit: COMMIT_A, builtAt: '2026-08-26T10:00:00.000Z' };
  const line = (watch) => h.updateStatusLine(watch, running);
  assert.equal(line({ state: 'idle' }), 'Not checked yet.');
  assert.equal(line({ state: 'unbuilt' }), 'Not checked: an unbuilt page has nothing to compare.');
  assert.equal(line({ state: 'checking' }), 'Checking the published version…');
  assert.equal(line({ state: 'failed', reason: 'the sky fell in' }), 'Could not check: the sky fell in');
  assert.equal(line({ state: 'current' }), 'This is the published version.');
  assert.match(line({ state: 'available', direction: 'newer', deployed: { version: 'v0.1.6', commit: COMMIT_B } }),
    /^A newer version of this page has been published: v0\.1\.6 \(2222222\)\. Reload to take it\.$/u);
  assert.equal(h.runningBuildLine(running), `You are reading v0.1.5 (1111111), built ${running.builtAt}.`);
  assert.match(h.runningBuildLine({ version: '', commit: '', builtAt: '' }),
    /served straight out of the source directory, so it carries no build identity/u);
});

test('a disabled check button always names the condition it is waiting for', () => {
  const h = loadWatch();
  const running = { version: 'v0.1.5', commit: COMMIT_A };
  assert.equal(h.updateCheckDisabledReason({ inFlight: false }, running), '');
  assert.match(h.updateCheckDisabledReason({ inFlight: true }, running), /already running/u);
  assert.match(h.updateCheckDisabledReason({ inFlight: false }, { commit: '' }), /not produced by the site build/u);
});

/* ------------------------------------------------------------------ *
 * The one request cannot leave this origin.
 * ------------------------------------------------------------------ */

test('the manifest address resolves against this document, and is refused when it would not stay here', () => {
  const h = loadWatch();
  assert.equal(h.versionManifestUrl('./', 'https://example.invalid/site/settings.html'),
    'https://example.invalid/site/version.json');
  assert.equal(h.versionManifestUrl('../', 'https://example.invalid/site/docs/x.html'),
    'https://example.invalid/site/version.json');
  for (const hostile of ['https://evil.invalid/', '//evil.invalid/', 'http://example.invalid/']) {
    assert.equal(h.versionManifestUrl(hostile, 'https://example.invalid/site/settings.html'), null,
      `a base of ${hostile} must be refused rather than fetched -- this is the site's only request`);
  }
  assert.equal(h.versionManifestUrl('./', 'not a url'), null);
});

test('a hostile base is refused before any request is made, not after one comes back', async () => {
  const h = loadWatch({ base: 'https://evil.invalid/' });
  const watch = await h.checkForUpdate({ manual: true });
  assert.equal(h.requests.length, 0, 'a request was made to an address that had already been refused');
  assert.equal(watch.state, 'failed');
  assert.match(watch.reason, /does not resolve to an address on this site/u);
});

/* ------------------------------------------------------------------ *
 * Checking.
 * ------------------------------------------------------------------ */

test('an unbuilt page never asks for a manifest it could not be judged against', async () => {
  const h = loadWatch({ running: { version: '', commit: '', builtAt: '' } });
  const watch = await h.checkForUpdate({ manual: true });
  assert.equal(h.requests.length, 0, 'an unbuilt page made a request, which would read as a site that is down');
  assert.equal(watch.state, 'unbuilt');
  assert.equal(h.cardStatus.textContent, 'Not checked: an unbuilt page has nothing to compare.');
  assert.equal(h.cardButton.disabled, true);
  assert.match(h.cardButton.title, /not produced by the site build/u);
  assert.equal(h.banner(), null, 'an unbuilt page has no banner to raise');
});

test('a page that is the published one says so and raises nothing', async () => {
  const h = loadWatch({ respond: respondWith(manifest({ version: 'v0.1.5', commit: COMMIT_A })) });
  h.ensureUpdateUI();
  const watch = await h.checkForUpdate({ manual: false });
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].url, 'https://example.invalid/site/version.json');
  assert.equal(h.requests[0].options.cache, 'no-store', 'a cached manifest would answer with the version this page already is');
  assert.equal(h.requests[0].options.credentials, 'omit');
  assert.equal(watch.state, 'current');
  assert.ok(watch.checkedAt > 0, 'a completed check recorded no time');
  assert.equal(h.banner().hidden, true);
  assert.deepEqual(h.notifications, [], 'an automatic check that found nothing new interrupted somebody');
  assert.equal(h.cardStatus.textContent, 'This is the published version.');
  assert.equal(h.cardIdentity.textContent, `You are reading v0.1.5 (1111111), built 2026-08-26T10:00:00.000Z.`);
});

test('a manual check that finds nothing new still answers the person who asked', async () => {
  const h = loadWatch({ respond: respondWith(manifest({ version: 'v0.1.5', commit: COMMIT_A })) });
  await h.checkForUpdate({ manual: true });
  assert.equal(h.notifications.length, 1);
  assert.equal(h.notifications[0].title, 'This page is up to date');
  assert.equal(h.notifications[0].narration.category, 'notification');
});

test('a newer published build raises the banner, names itself, and offers a reload that actually reloads', async () => {
  const h = loadWatch({ respond: respondWith(manifest()) });
  h.ensureUpdateUI();
  await h.checkForUpdate({ manual: false });
  const banner = h.banner();
  assert.equal(banner.hidden, false);
  assert.equal(banner.attributes.role, 'status');
  assert.equal(banner.attributes['aria-live'], 'polite');
  assert.match(h.bannerText(), /A newer version of this page has been published: v0\.1\.6 \(2222222\)\./u);
  assert.match(h.bannerText(), /anything typed into a field and not yet saved is lost/u,
    'the banner no longer says what reloading costs, which is the only unsaved-work protection a page can offer');
  const reload = findById(banner, 'update-reload');
  assert.ok(reload, 'the banner carries no reload control');
  assert.equal(h.reloads.length, 0, 'the page reloaded before anybody asked it to');
  reload.click();
  assert.equal(h.reloads.length, 1, 'the reload control is decoration -- it did not reload');
  const changes = findById(banner, 'update-changes');
  assert.equal(changes.href, './downloads.html#changelog', 'the banner no longer links to what changed');
  assert.equal(h.notifications.length, 1);
  assert.match(h.notifications[0].body, /Reload to take it\./u);
});

test('the same available build is announced once, however many times it is polled', async () => {
  const h = loadWatch({ respond: respondWith(manifest()) });
  h.ensureUpdateUI();
  await h.checkForUpdate({ manual: false });
  await h.checkForUpdate({ manual: false });
  await h.checkForUpdate({ manual: false });
  assert.equal(h.requests.length, 3, 'the later polls did not happen, so this proves nothing about repeat announcements');
  assert.equal(h.notifications.length, 1,
    'a poll every half hour that notifies every time is the nagging this site is not allowed to do');
  assert.equal(h.banner().hidden, false, 'the banner is persistent -- polling again must not take it away');
});

test('Later hides the banner against that exact build, persists, and a different build raises it again', async () => {
  let payload = manifest();
  const h = loadWatch({ respond: () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(payload)) }) });
  h.ensureUpdateUI();
  await h.checkForUpdate({ manual: false });
  assert.equal(h.banner().hidden, false);

  findById(h.banner(), 'update-later').click();
  assert.equal(h.banner().hidden, true, 'Later left the banner up');
  assert.equal(h.state.updateDismissedCommit, COMMIT_B);
  assert.equal(h.saves.length, 1, 'Later was not persisted, so it would come straight back on the next page of this site');

  await h.checkForUpdate({ manual: false });
  assert.equal(h.banner().hidden, true, 'a poll of the same dismissed build brought the banner back');

  payload = manifest({ version: 'v0.1.7', commit: '3333333333333333333333333333333333333333' });
  await h.checkForUpdate({ manual: false });
  assert.equal(h.banner().hidden, false,
    'a newly published build is a different answer to a different question, and Later must not silence it');
});

test('a second check while one is in flight is refused rather than queued', async () => {
  let release;
  const h = loadWatch({
    respond: () => new Promise((resolvePromise) => {
      release = () => resolvePromise({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(manifest())) });
    }),
  });
  const first = h.checkForUpdate({ manual: true });
  assert.equal(h.cardButton.disabled, true, 'the button stayed live while a check was running');
  assert.match(h.cardButton.title, /already running/u);
  const second = await h.checkForUpdate({ manual: true });
  assert.equal(h.requests.length, 1, 'a second request went out while the first was still in flight');
  assert.equal(second.state, 'checking');
  release();
  await first;
  assert.equal(h.requests.length, 1);
  assert.equal(h.cardButton.disabled, false, 'the button never came back');
});

test('a refused response is reported as a failure with its own status, and never as current', async () => {
  const h = loadWatch({ respond: respondWith('', { ok: false, status: 404 }) });
  h.ensureUpdateUI();
  const watch = await h.checkForUpdate({ manual: true });
  assert.equal(watch.state, 'failed');
  assert.match(watch.reason, /answered HTTP 404/u);
  assert.equal(h.cardStatus.textContent, 'Could not check: the published version manifest answered HTTP 404');
  assert.equal(h.banner().hidden, true);
  assert.equal(h.notifications.length, 1);
  assert.equal(h.notifications[0].narration.isError, true);
  assert.equal(h.notifications[0].narration.category, 'error');
});

test('an automatic check that fails does so quietly; only a check somebody asked for reports back', async () => {
  const h = loadWatch({ respond: respondWith('', { ok: false, status: 503 }) });
  const watch = await h.checkForUpdate({ manual: false });
  assert.equal(watch.state, 'failed');
  assert.deepEqual(h.notifications, [],
    'a background poll that fails every half hour would raise a notification every half hour');
});

test('an unreadable manifest fails with the reader own reason rather than a generic one', async () => {
  const h = loadWatch({ respond: respondWith('<!doctype html><title>404</title>') });
  const watch = await h.checkForUpdate({ manual: false });
  assert.equal(watch.state, 'failed');
  assert.match(watch.reason, /not valid JSON/u);
});

test('a manifest that never answers is abandoned at the declared bound and says so', async () => {
  const h = loadWatch({
    respond: (url, options) => new Promise((resolvePromise, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }),
  });
  const pending = h.checkForUpdate({ manual: false });
  assert.equal(h.timeouts.length, 1, 'no deadline was armed, so a silent server would hang the check forever');
  assert.equal(h.timeouts[0].ms, h.UPDATE_FETCH_TIMEOUT_MS);
  h.timeouts[0].handler();
  const watch = await pending;
  assert.equal(watch.state, 'failed');
  assert.match(watch.reason, /did not answer within 8 seconds/u);
  assert.ok(h.clearedTimeouts.length >= 1, 'the deadline timer was left running after the check settled');
});

test('a browser that cannot reach the manifest at all says that, rather than blaming the manifest', async () => {
  const h = loadWatch({ respond: () => Promise.reject(new Error('offline')) });
  const watch = await h.checkForUpdate({ manual: false });
  assert.equal(watch.state, 'failed');
  assert.match(watch.reason, /could not reach the published version manifest/u);
});

test('every word the banner and the card render passes through the personal vocabulary', async () => {
  const h = loadWatch({
    respond: respondWith(manifest()),
    vocabulary: (text) => String(text).split('published').join('PUBLISHED'),
  });
  h.ensureUpdateUI();
  await h.checkForUpdate({ manual: false });
  assert.match(h.bannerText(), /has been PUBLISHED/u, 'the banner headline skipped the personal vocabulary');
  assert.match(h.cardStatus.textContent, /PUBLISHED/u, 'the card status line skipped the personal vocabulary');
});

/* ------------------------------------------------------------------ *
 * The schedule.
 * ------------------------------------------------------------------ */

test('the background schedule runs at the declared interval and can be stopped', () => {
  const h = loadWatch({ respond: respondWith(manifest()) });
  h.startUpdateWatch();
  assert.equal(h.intervals.length, 1, 'no background check was scheduled');
  assert.equal(h.intervals[0].ms, h.UPDATE_CHECK_INTERVAL_MS);
  h.stopUpdateWatch();
  assert.equal(h.clearedIntervals.length, 1, 'the background check cannot be stopped');
  h.startUpdateWatch();
  h.startUpdateWatch();
  assert.equal(h.intervals.length, 3);
  /* Three starts and one explicit stop: the explicit stop cleared the first, and the
   * third start cleared the second. The third is still running, which is the point --
   * every start leaves exactly one timer behind rather than accumulating them. */
  assert.deepEqual(h.clearedIntervals, [1, 2],
    'starting again left the previous timer running, so the site would check twice as often for no reason');
});

test('an unbuilt page schedules nothing at all', () => {
  const h = loadWatch({ running: { version: '', commit: '', builtAt: '' } });
  h.startUpdateWatch();
  assert.equal(h.intervals.length, 0, 'an unbuilt page armed a poll it can never learn anything from');
});

test('init wires the button, checks once, and starts the schedule', async () => {
  const h = loadWatch({ respond: respondWith(manifest()) });
  h.initUpdates();
  assert.ok(h.banner(), 'init did not put the banner on the page');
  assert.equal(typeof h.cardButton.onclick, 'function', 'the Check for updates button is wired to nothing');
  assert.equal(h.intervals.length, 1);
  await new Promise((done) => { setTimeout(done, 0); });
  assert.equal(h.requests.length, 1, 'init did not check on startup');
});

test('resetting the settings clears the dismissal, so applyState has to re-render the banner', () => {
  /* `Reset settings` does `Object.assign(state, DEFAULTS)` and then calls applyState().
   * That clears `updateDismissedCommit`, so a banner somebody had set aside is theirs
   * again -- and would sit invisible until the next poll, up to half an hour later, if
   * applyState did not re-render it. Wired at one end and consumed at neither is this
   * repository's oldest recurring defect. */
  /* The trailing `[;}]` rather than `}` since the ticket desk landed: applyState grew a
   * `renderSupportCopy()` call after this one, and pinning the closing brace would have
   * made this assertion a check on what happens to be LAST in applyState rather than on
   * the watch being re-rendered at all. The order up to and including renderUpdateState
   * is still exact. */
  assert.match(app, /updateOneThingBanner\(\);renderAllModeStatuses\(\);renderUpdateState\(\)[;}]/u,
    'applyState no longer re-renders the watch, so a settings reset would clear the dismissal and change nothing on screen');
});

test('the reset dialog names the dismissal among the things it clears', () => {
  const dialog = settings.match(/<p id="reset-confirm-text">([^<]*)<\/p>/u);
  assert.ok(dialog, 'the reset confirmation text is no longer where this test can read it');
  assert.match(dialog[1], /any published-version banner you set aside with Later/u,
    'the reset gate clears the dismissal and no longer says so -- a destructive action that under-reports what it clears');
});

test('app.js calls initUpdates from init, and the call is not commented out', () => {
  /* A wiring line usually dies by being commented out rather than deleted, and a bare
   * substring needle is satisfied by the comment. Anchored to the whole call. */
  assert.match(app, /initSettingsPreview\(\);initReleaseNotes\(\);initChangelog\(\);initUpdates\(\);/u,
    'initUpdates is no longer called from init() -- the whole watch would be dead code');
});
