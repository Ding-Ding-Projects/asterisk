/**
 * Contract: app-display-name.
 *
 * The site now lets the person reading it rename what it calls itself, and the whole
 * value of the feature is in the boundary rather than in the rename: a display name is
 * a label, and identity is everything else. So most of this file is about what a rename
 * must NOT reach -- the storage keys, the export filename, the `og:` metadata somebody
 * else's chat window reads, and the product prose that names the real software.
 *
 * The behavioural half runs the real extracted source rather than asserting patterns
 * over it, in the style `complete-exports.test.mjs` already established here. That
 * matters more than usual for this feature: "the value is stored" and "the setting
 * persists" are both true of a rename that never reaches a single pixel, and a
 * source-pattern test cannot tell those apart from a working one.
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

/* Derived from the filesystem, not hand-copied: the six-name literal that used to sit
 * here excluded converter.html, ollama.html and history.html, so every 'anywhere in
 * the site' claim below searched two thirds of the site. See ./site-pages.mjs. */
import { PAGE_NAMES } from './site-pages.mjs';
const PAGES = PAGE_NAMES;
const pageSource = Object.fromEntries(PAGES.map((name) => [name, read(`${name}.html`)]));
const app = read('app.js');
const settings = pageSource.settings;
const registry = json('feature-registry.json');

const SHIPPED = 'Material Asterisk';

/* ------------------------------------------------------------------ *
 * Running the real source.
 * ------------------------------------------------------------------ */

/** The source of one `function name(...)` declaration, brace-counted so nesting survives. */
function functionSource(src, name) {
  const start = src.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `function ${name} is not declared in site/app.js`);
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

/** The three declarations that decide what a rename may and may not reach. */
function constantsSource(src) {
  const start = src.indexOf('const SHIPPED_PRODUCT_NAME =');
  assert.notEqual(start, -1, 'SHIPPED_PRODUCT_NAME is no longer declared in site/app.js');
  const endMarker = 'const SHIPPED_TITLE = document.title;';
  const end = src.indexOf(endMarker, start);
  assert.notEqual(end, -1, 'SHIPPED_TITLE is no longer captured from document.title in site/app.js');
  return src.slice(start, end + endMarker.length);
}

const NAMES = ['currentDisplayName', 'displayNameIsChosen', 'applyDisplayName', 'setDisplayName', 'commitDisplayName'];

/**
 * Build a throwaway page and run the real display-name code against it.
 *
 * Every collaborator is a recorder rather than a stub that shrugs: the selectors asked
 * for, the history entries written and the notifications raised are all kept, because
 * "it renamed the brand line" and "it renamed the brand line and quietly rewrote the
 * link preview as well" are the two outcomes this feature has to be able to tell apart.
 */
function loadDisplayName({ title = `Settings · ${SHIPPED}`, brandCount = 2, withCard = true } = {}) {
  const brands = Array.from({ length: brandCount }, () => ({ textContent: SHIPPED }));
  const field = { value: '' };
  const status = { textContent: '' };
  const elements = withCard ? { 'display-name': field, 'display-name-status': status } : {};
  const selectorsAsked = [];
  const idsAsked = [];
  const doc = { title, activeElement: null };

  const all = (selector) => {
    selectorsAsked.push(selector);
    return selector === '.brand-name' ? brands : [];
  };
  const $ = (id) => {
    idsAsked.push(id);
    return elements[id] ?? null;
  };

  const saved = [];
  const history = [];
  const notifications = [];
  const state = { displayName: '' };

  const body = `${constantsSource(app)}\n${NAMES.map((name) => functionSource(app, name)).join('\n')}\n`
    + `return { ${NAMES.join(', ')}, SHIPPED_PRODUCT_NAME, DISPLAY_NAME_MAX, SHIPPED_TITLE };`;
  // eslint-disable-line no-new-func -- deliberately re-running the real extracted source
  const api = new Function(
    'document', 'all', '$', 'state', 'save', 'recordHistory', 'notify', 'copyText', 'applyVocabularyText', body,
  )(
    doc, all, $, state,
    () => saved.push(JSON.stringify(state)),
    (action, summary) => history.push({ action, summary }),
    (titleText, bodyText) => notifications.push({ title: titleText, body: bodyText }),
    () => 'Setting saved',
    (text) => text,
  );

  return { ...api, doc, brands, field, status, state, saved, history, notifications, selectorsAsked, idsAsked };
}

/* ------------------------------------------------------------------ *
 * The feature does something.
 * ------------------------------------------------------------------ */

test('with nothing chosen, every brand line and the tab title carry the shipped name', () => {
  const h = loadDisplayName();
  h.applyDisplayName();
  assert.deepEqual(h.brands.map((b) => b.textContent), [SHIPPED, SHIPPED]);
  assert.equal(h.doc.title, `Settings · ${SHIPPED}`);
  assert.equal(h.status.textContent, `Using the shipped name, ${SHIPPED}.`);
});

test('a chosen name reaches every brand line and the tab title, not just the one being watched', () => {
  const h = loadDisplayName({ brandCount: 2 });
  h.setDisplayName('Front desk');
  assert.deepEqual(h.brands.map((b) => b.textContent), ['Front desk', 'Front desk'],
    'a rename that reached one brand line and not the other is a rename nobody can trust');
  assert.equal(h.doc.title, 'Settings · Front desk');
});

test('a second rename composes against the shipped title, so renames do not compound', () => {
  const h = loadDisplayName();
  h.setDisplayName('Front desk');
  h.setDisplayName('Reception');
  assert.equal(h.doc.title, 'Settings · Reception',
    'the title recomposed from a previous rename rather than from the shipped title');
  assert.deepEqual(h.brands.map((b) => b.textContent), ['Reception', 'Reception']);
});

test('a title that never carried the shipped name is left exactly as it was, not guessed at', () => {
  const h = loadDisplayName({ title: 'Documentation index' });
  h.setDisplayName('Front desk');
  assert.equal(h.doc.title, 'Documentation index');
});

test('clearing the field returns to the shipped name rather than leaving the page nameless', () => {
  const h = loadDisplayName();
  h.setDisplayName('Front desk');
  h.setDisplayName('');
  assert.deepEqual(h.brands.map((b) => b.textContent), [SHIPPED, SHIPPED]);
  assert.equal(h.doc.title, `Settings · ${SHIPPED}`);
  assert.equal(h.state.displayName, '', 'a copy of the shipped name was stored instead of an empty choice');
});

test('whitespace alone is not a name', () => {
  const h = loadDisplayName();
  h.setDisplayName('   ');
  assert.equal(h.currentDisplayName(), SHIPPED);
  assert.equal(h.displayNameIsChosen(), false);
});

test('the stored name is bounded, and the bound is the declared constant rather than a number typed twice', () => {
  const h = loadDisplayName();
  assert.equal(typeof h.DISPLAY_NAME_MAX, 'number');
  assert.ok(h.DISPLAY_NAME_MAX > 0, 'DISPLAY_NAME_MAX must be a real bound before anything is asserted against it');
  h.setDisplayName('x'.repeat(h.DISPLAY_NAME_MAX + 40));
  assert.equal(h.state.displayName.length, h.DISPLAY_NAME_MAX);
  assert.equal(settings.includes(`maxlength="${h.DISPLAY_NAME_MAX}"`), true,
    'the field and the code disagree about how long a display name may be');
});

test('the status line names the shipped name in both states, so a shared file is never a surprise', () => {
  const h = loadDisplayName();
  h.setDisplayName('Front desk');
  assert.match(h.status.textContent, /Front desk/u);
  assert.match(h.status.textContent, new RegExp(SHIPPED, 'u'),
    'the renamed state stopped saying which name a download or export will carry');
  h.setDisplayName('');
  assert.match(h.status.textContent, new RegExp(SHIPPED, 'u'));
});

test('the field is not rewritten under the person typing into it', () => {
  const h = loadDisplayName();
  h.field.value = 'Front des';
  h.doc.activeElement = h.field;
  h.state.displayName = 'Front desk';
  h.applyDisplayName();
  assert.equal(h.field.value, 'Front des', 'applyDisplayName overwrote the focused field mid-keystroke');
  h.doc.activeElement = null;
  h.applyDisplayName();
  assert.equal(h.field.value, 'Front desk', 'an unfocused field was left out of step with the stored name');
});

test('a page with no settings card still renames its own chrome', () => {
  const h = loadDisplayName({ withCard: false });
  h.setDisplayName('Front desk');
  assert.deepEqual(h.brands.map((b) => b.textContent), ['Front desk', 'Front desk']);
  assert.equal(h.doc.title, 'Settings · Front desk');
});

test('one rename writes one history entry and one notification, not one per keystroke', () => {
  const h = loadDisplayName();
  for (const partial of ['F', 'Fr', 'Fro', 'Front desk']) h.setDisplayName(partial);
  assert.equal(h.history.length, 0, 'typing recorded history before the rename was committed');
  h.commitDisplayName();
  assert.equal(h.history.length, 1);
  assert.equal(h.history[0].action, 'display-name-changed');
  assert.match(h.history[0].summary, /Front desk/u);
  assert.match(h.history[0].summary, new RegExp(SHIPPED, 'u'),
    'the history entry does not record that the shipped name was left alone');
  assert.equal(h.notifications.length, 1);
  assert.match(h.notifications[0].body, new RegExp(SHIPPED, 'u'));
});

test('every keystroke is persisted, so a rename survives a reload even if the field is never left', () => {
  const h = loadDisplayName();
  h.setDisplayName('Front desk');
  assert.equal(h.saved.length, 1);
  assert.match(h.saved[0], /Front desk/u);
});

/* ------------------------------------------------------------------ *
 * The boundary: what a rename must never reach.
 * ------------------------------------------------------------------ */

test('applying a display name touches only the brand line and the feature own two elements', () => {
  const h = loadDisplayName();
  h.setDisplayName('Front desk');
  assert.deepEqual([...new Set(h.selectorsAsked)], ['.brand-name'],
    'applyDisplayName reached for a selector other than the brand line');
  assert.deepEqual([...new Set(h.idsAsked)].sort(), ['display-name', 'display-name-status'],
    'applyDisplayName reached an element outside its own card');
});

test('the display name never becomes markup', () => {
  const h = loadDisplayName();
  h.setDisplayName('<img src=x onerror=alert(1)>');
  assert.equal(h.brands[0].textContent, '<img src=x onerror=alert(1)>',
    'the name was not written as text');
  assert.doesNotMatch(functionSource(app, 'applyDisplayName'), /innerHTML/u,
    'applyDisplayName now writes innerHTML, so a typed name could become markup');
});

test('no storage key, cache key or export filename is derived from the display name', () => {
  /* Identity is a set of literal constants. Anything computed from the chosen name would
   * orphan a person's stored settings the moment they renamed the page -- which is the
   * exact failure the canonical contract names, and which no amount of testing the
   * rename itself would ever surface. */
  for (const literal of [
    "const STORAGE_KEY = 'ding-pbx-pages-v2'",
    "const HISTORY_KEY = 'ding-pbx-pages-history-v1'",
    "'ding-pbx-vocabulary-cache'",
    "'ding-pbx-logo-cache'",
    "download('ding-pbx-page-settings.json'",
  ]) {
    assert.ok(app.includes(literal), `${literal} is no longer a literal constant in site/app.js`);
  }
  for (const identity of ['STORAGE_KEY', 'HISTORY_KEY']) {
    const line = app.split('\n').find((l) => l.includes(`const ${identity} =`));
    assert.doesNotMatch(line, /displayName|currentDisplayName/u,
      `${identity} is now derived from the display name, so renaming would orphan stored state`);
  }
});

test('the published metadata other people read keeps the shipped name, and app.js never rewrites it', () => {
  for (const name of PAGES) {
    assert.match(pageSource[name], /<meta property="og:site_name" content="Material Asterisk">/u,
      `${name}.html no longer publishes the shipped name as its og:site_name`);
  }
  assert.doesNotMatch(app, /og:site_name|og:title|property="og:/u,
    'app.js now touches Open Graph metadata -- a rename would tell other people the wrong product name');
});

test('the shipped name is still spelled out in the product prose that describes the real software', () => {
  /* The home page lede is a build-time placeholder in the markup and lives in app.js's
   * own funny-level copy, so this reads it where it really is rather than where it looks
   * like it should be. It is prose ABOUT the product, not the site naming itself, and a
   * rename must leave it alone. */
  assert.ok(app.includes(`${SHIPPED} is a planned desktop administration experience`),
    'the home page lede copy no longer names the real product');
  assert.doesNotMatch(functionSource(app, 'applyDisplayName'), /heroLede|hero-lede|data-copy/u,
    'applyDisplayName now reaches the product prose, which describes the real software by its real name');
});

/* ------------------------------------------------------------------ *
 * The surface: reachable, described, and honest about the boundary.
 * ------------------------------------------------------------------ */

test('the settings page carries a real, labelled, resettable display-name control', () => {
  assert.match(settings, /<input id="display-name" type="text" maxlength="\d+" placeholder="Material Asterisk"/u);
  assert.match(settings, /<label class="sr-only" for="display-name">Display name<\/label>/u);
  assert.match(settings, /<button id="display-name-reset" class="text-button" type="button">Reset to shipped name<\/button>/u);
  assert.match(settings, /<p id="display-name-status" role="status">/u);
});

test('the control is wired, on a whole line rather than a needle a comment could satisfy', () => {
  /* A bare `initDisplayName` needle is satisfied by `// initDisplayName();`, which is
   * how a wiring line usually dies -- commented out during some other repair and never
   * restored. initSettings is written as one long line, so a line anchor cannot help
   * here; instead the call must sit at a statement boundary with no comment marker
   * ahead of it on its own line. */
  const initSettingsSource = functionSource(app, 'initSettings');
  const callAt = initSettingsSource.indexOf('initDisplayName();');
  assert.notEqual(callAt, -1, 'initSettings no longer calls initDisplayName()');
  const ahead = initSettingsSource.slice(0, callAt);
  assert.match(ahead.slice(-1), /[;{]/u, 'initDisplayName() is not called as a statement');
  assert.doesNotMatch(ahead.slice(ahead.lastIndexOf('\n') + 1), /\/\//u,
    'the initDisplayName() call sits behind a line comment');
  assert.match(app, /^\s*function applyState\(\)\{[^\n]*applyDisplayName\(\);/mu,
    'applyState no longer applies the display name, so a rename would not survive a reload');
  const wiring = functionSource(app, 'initDisplayName');
  assert.match(wiring, /field\.oninput=/u, 'the field no longer applies a rename as it is typed');
  assert.match(wiring, /field\.onchange=commitDisplayName/u, 'nothing commits the rename to local history');
  assert.match(wiring, /reset\.onclick=/u, 'the reset button is no longer wired');
});

test('applyDisplayName runs before the vocabulary walker, so a rename is not reverted to a cached original', () => {
  /* applyVocabularyToNode caches the first text it sees per node and thereafter rewrites
   * from that cache. Assigning textContent replaces the node, so a rename survives -- but
   * only if it happens first. Reversed, the walker would put the old name straight back
   * and nothing would fail. */
  const applyState = functionSource(app, 'applyState');
  const renameAt = applyState.indexOf('applyDisplayName();');
  const vocabAt = applyState.indexOf('applyVocabulary();');
  assert.notEqual(renameAt, -1, 'applyState no longer applies the display name');
  assert.notEqual(vocabAt, -1, 'applyState no longer applies the personal vocabulary');
  assert.ok(renameAt < vocabAt, 'the vocabulary walker now runs first and would revert every rename');
});

test('the card describes itself at every funny level in both languages, and every level keeps both facts', () => {
  const copy = functionSource(app, 'copyText');
  assert.ok(copy.length > 0);
  const start = app.indexOf('displayNameDesc:{en:[');
  assert.notEqual(start, -1, 'the display-name card has no funny-level copy of its own');
  const block = app.slice(start, app.indexOf(']},', app.indexOf('],zh:[', start)) + 3);
  const english = block.slice(0, block.indexOf('],zh:['));
  const cantonese = block.slice(block.indexOf('],zh:['));
  const levels = (chunk) => chunk.split('\n').filter((l) => /^\s*'/.test(l.trim()) || /^\s+'/.test(l));
  assert.equal(levels(english).length, 4, 'the English copy does not carry all four funny levels');
  assert.equal(levels(cantonese).length, 4, 'the Cantonese copy does not carry all four funny levels');
  for (const level of [...levels(english), ...levels(cantonese)]) {
    assert.ok(level.includes(SHIPPED),
      `a funny level stopped naming the shipped name, so the boundary is stated at some levels and not others: ${level.trim().slice(0, 60)}`);
  }
  assert.match(settings, /<p id="display-name-desc" data-copy="displayNameDesc">/u,
    'the card description is not wired to the funny-level copy');
});

test('the card is findable from the settings search', () => {
  assert.match(settings, /data-search="display name rename brand identity title chrome"/u);
});

test('every page carries the brand-name hook in both its header and its footer', () => {
  for (const name of PAGES) {
    const hooks = pageSource[name].split('<strong class="brand-name">').length - 1;
    assert.equal(hooks, 2, `${name}.html carries ${hooks} brand-name hooks, so a rename would miss one of its two brand lines`);
  }
});

test('the reset gate names the display name among the things it clears', () => {
  const dialog = settings.match(/<p id="reset-confirm-text">([^<]*)<\/p>/u);
  assert.ok(dialog, 'settings.html no longer carries the reset confirmation text');
  assert.match(dialog[1], /display name/iu,
    'Reset settings now clears the chosen display name without saying so');
});

/* ------------------------------------------------------------------ *
 * The registry says what the code does.
 * ------------------------------------------------------------------ */

test('the site feature registry carries a row for app-display-name', () => {
  assert.ok(registry.features['app-display-name'], 'no app-display-name row in site/feature-registry.json');
});

test('the registry records app-display-name as implemented, and names the files it lives in', () => {
  const row = registry.features['app-display-name'];
  assert.equal(row.status, 'implemented-unverified');
  assert.deepEqual([...row.implementation.paths].sort(), ['site/app.js', 'site/settings.html'].sort());
  assert.match(row.note, /brand-name/u, 'the registry note does not say which elements the rename reaches');
});
