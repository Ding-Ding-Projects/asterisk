/**
 * Contract: context-menu-shortcuts on the pages-site.
 *
 * The feature is a right-click menu, and the half it is named after is the shortcut
 * column. That column is the part worth testing hardest, because a wrong entry in it is
 * the one UI defect that actively teaches somebody something false: they read
 * "Alt+Shift+L", they press it, nothing happens, and the only thing that told them to
 * press it was the menu. Showing no shortcut at all would have been kinder.
 *
 * So the property under test throughout is that the printed chord and the dispatched
 * chord are THE SAME OBJECT. Not "both say Alt+Shift+L" -- both read `action.chord`.
 * Most of what follows either checks that directly or checks something that would let it
 * drift.
 *
 * The whole feature is extracted from `site/app.js` and run, rather than pattern-matched.
 * That matters more than usual here: "the menu is on the page", "an item is listed" and
 * "a chord is printed beside it" are every one of them true of a menu whose actions are
 * all inert, and a source-pattern test cannot tell that apart from a working one.
 *
 * Two facts about the browser shape the design and are pinned below.
 *
 *   - A page does not get to claim every chord. Ctrl+Shift+N is a private window,
 *     Ctrl+Shift+C is the element picker, Ctrl+Shift+R is a hard reload; a page that
 *     binds one of those prints a shortcut its own handler will never see. So no action
 *     may sit on a reserved chord.
 *   - Firefox activates access keys with Alt+Shift, which is exactly the modifier pair
 *     this site's own chords use. That is safe only while no page declares an
 *     `accesskey`, and a test says so rather than a comment hoping somebody remembers.
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
const everyPage = PAGES.map((name) => pageSource[name]).join('\n');
const app = read('app.js');
const styles = read('styles.css');
const registry = json('feature-registry.json');
const locales = json('locales/feature-registry.json');
const article = readFileSync(resolve(siteRoot, '..', 'docs', 'platform', 'context-menu-shortcuts.md'), 'utf8')
  .replaceAll('\r\n', '\n');

/* ------------------------------------------------------------------ *
 * Running the real source.
 *
 * One contiguous slice rather than a function at a time, because the feature is one
 * block and slicing it up would let the test run a shape the file does not have.
 * ------------------------------------------------------------------ */

const BLOCK_START = '  // Right-click menus, and the shortcut column that must not lie.';
const BLOCK_END = "  function renderPalette(query=''){";

function featureSource() {
  const start = app.indexOf(BLOCK_START);
  assert.notEqual(start, -1, 'the right-click menu block is no longer identifiable in site/app.js');
  const end = app.indexOf(BLOCK_END, start);
  assert.notEqual(end, -1, 'renderPalette no longer follows the right-click menu block in site/app.js');
  const source = app.slice(start, end);
  assert.ok(source.length > 4000, `the extracted block is only ${source.length} bytes -- it cannot be the whole feature`);
  return source;
}

/* ------------------------------------------------------------------ *
 * A recording page. Every element remembers what was done to it rather than shrugging.
 * ------------------------------------------------------------------ */

/** The tiny subset of selector syntax the feature actually uses. */
function matchesSelector(element, selector) {
  return String(selector).split(',').map((part) => part.trim()).filter(Boolean).some((part) => {
    const attribute = part.match(/^([a-z0-9]*)\[([a-z-]+)\]$/iu);
    if (attribute) {
      const [, tag, name] = attribute;
      if (tag && element.tagName.toLowerCase() !== tag.toLowerCase()) return false;
      const value = element.getAttribute(name);
      return value !== null && value !== undefined;
    }
    if (part.startsWith('#')) return element.id === part.slice(1);
    if (part.startsWith('.')) return element.className.split(/\s+/u).includes(part.slice(1));
    return element.tagName.toLowerCase() === part.toLowerCase();
  });
}

let page;

function makeElement(tag) {
  return {
    tagName: String(tag).toUpperCase(),
    id: '',
    className: '',
    type: '',
    value: '',
    hidden: false,
    textContent: '',
    parent: null,
    children: [],
    attributes: {},
    dataset: {},
    listeners: {},
    style: {},
    rect: { left: 0, top: 0, right: 0, bottom: 0, width: 320, height: 240 },
    focused: 0,
    clicks: 0,
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === 'id') this.id = String(value);
    },
    getAttribute(name) {
      if (name === 'id') return this.id || null;
      if (name === 'class') return this.className || null;
      /* `data-*` attributes and the `dataset` object are one thing in a real DOM. Keeping
       * them apart here would make `[data-regex-for]` fail to match an element the page
       * can plainly see, which reads as a missing control rather than a missing stub. */
      if (name.startsWith('data-')) {
        const key = name.slice(5).replace(/-([a-z])/gu, (_, c) => c.toUpperCase());
        return Object.prototype.hasOwnProperty.call(this.dataset, key) ? String(this.dataset[key]) : null;
      }
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    },
    removeAttribute(name) { delete this.attributes[name]; },
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); },
    append(...kids) { for (const kid of kids) { kid.parent = this; this.children.push(kid); } },
    replaceChildren(...kids) {
      for (const kid of this.children) kid.parent = null;
      this.children = [];
      this.append(...kids);
    },
    focus() { this.focused += 1; if (page) page.document.activeElement = this; },
    click() { this.clicks += 1; for (const handler of this.listeners.click ?? []) handler({ target: this }); },
    getBoundingClientRect() { return this.rect; },
    contains(other) { for (let node = other; node; node = node.parent) if (node === this) return true; return false; },
    closest(selector) {
      for (let node = this; node; node = node.parent) if (matchesSelector(node, selector)) return node;
      return null;
    },
    querySelectorAll(selector) {
      const found = [];
      const walk = (node) => { for (const kid of node.children) { if (matchesSelector(kid, selector)) found.push(kid); walk(kid); } };
      walk(this);
      return found;
    },
    dispatch(type, event) { for (const handler of this.listeners[type] ?? []) handler(event); },
  };
}

function makePage({ ids = [] } = {}) {
  const body = makeElement('body');
  const registryById = new Map();
  for (const id of ids) {
    const stub = makeElement('div');
    stub.id = id;
    registryById.set(id, stub);
    body.append(stub);
  }
  const document = {
    body,
    baseURI: 'https://example.invalid/site/index.html',
    activeElement: body,
    listeners: {},
    createElement: (tag) => makeElement(tag),
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); },
    dispatch(type, event) { for (const handler of this.listeners[type] ?? []) handler(event); },
    getElementById(id) {
      if (registryById.has(id)) return registryById.get(id);
      const walk = (node) => {
        for (const kid of node.children) {
          if (kid.id === id) return kid;
          const found = walk(kid);
          if (found) return found;
        }
        return null;
      };
      return walk(body);
    },
  };
  return { document, notifications: [], copied: [], opened: [], palette: 0, timers: [] };
}

/** Compiles the extracted block against a recording page and hands back its internals. */
function load({ ids = [], regexState = new Map(), copy = (key) => `COPY:${key}` } = {}) {
  /* Local, and `page` only follows it for the benefit of makeElement()'s focus tracking.
   * An earlier draft closed over the shared `page` binding, so loading a second instance
   * silently re-pointed the FIRST one's `$` at the second page -- and the symptom was a
   * menu reporting the command palette available on a page that had none, which reads as
   * a defect in the feature rather than in the harness. */
  const own = makePage({ ids });
  page = own;
  const globals = {
    $: (id) => own.document.getElementById(id),
    document: own.document,
    window: {
      innerWidth: 1200,
      innerHeight: 800,
      open: (href, target, features) => own.opened.push({ href, target, features }),
    },
    navigator: {
      platform: 'Win32',
      clipboard: { writeText: (text) => { own.copied.push(text); return Promise.resolve(); } },
    },
    location: { href: 'https://example.invalid/site/index.html' },
    BASE: './',
    notify: (title, body) => own.notifications.push({ title, body }),
    applyVocabularyText: (text) => text,
    applyVocabulary: () => {},
    copyText: copy,
    /* The real one, lifted out of site/app.js rather than restated here. It was restated
     * once, and then master changed it so a compiled pattern is consulted BEFORE the
     * query -- the fix for a builder that announced itself and filtered nothing -- and a
     * hand-written stub would have gone on testing the old behaviour with nothing saying
     * so. A shared helper is exactly where a copy silently stops being a copy. */
    matchText: realMatchText(regexState),
    openPalette: () => { own.palette += 1; },
    renderModeStatus: () => {},
    /* A fired timer leaves the list, exactly as a real one does. Leaving it behind would
     * make "a cancelled long press left its timer running" fail on the corpse of an
     * earlier one that fired perfectly well. */
    setTimeout: (fn, ms) => {
      const handle = { ms, fn: () => { own.timers = own.timers.filter((entry) => entry !== handle); fn(); } };
      own.timers.push(handle);
      return handle;
    },
    clearTimeout: (handle) => { own.timers = own.timers.filter((entry) => entry !== handle); },
  };
  const exported = [
    'CONTEXT_MENU_SEARCH_ID', 'CONTEXT_MENU_MARGIN', 'CONTEXT_MENU_MIN_HEIGHT', 'CONTEXT_MENU_LONG_PRESS_MS',
    'CONTEXT_MENU_LONG_PRESS_SLOP', 'CONTEXT_MENU_TARGETS',
    'chord', 'chordEquals', 'RESERVED_CHORDS', 'reservedChordClaim', 'chordMatches', 'chordLabel', 'chordAriaLabel',
    'accessibleName', 'resolveContextTarget', 'contextTargetKind', 'contextMenuContext', 'MENU_ACTIONS',
    'absoluteHref', 'menuItemsFor', 'filterMenuItems', 'menuResultSummary', 'chordIsLive',
    'ensureContextMenuUI', 'clampMenuPosition', 'renderContextMenuList', 'openContextMenu', 'closeContextMenu',
    'activateContextMenuItem', 'moveContextMenuActive', 'onContextMenuKeydown', 'contextMenuChordAction',
    'handleContextMenuChord', 'openContextMenuForFocus', 'initContextMenu', 'startLongPress', 'cancelLongPress',
  ];
  const names = Object.keys(globals);
  const factory = new Function(...names, `${featureSource()}\nreturn {${exported.join(',')}};`);
  const api = factory(...names.map((name) => globals[name]));
  for (const name of exported) {
    assert.ok(api[name] !== undefined, `${name} did not survive extraction -- the block no longer declares it`);
  }
  return { ...api, page: own };
}

/**
 * The site's own `matchText`, compiled out of `site/app.js` against a supplied regex map.
 *
 * The menu's filter is not its own engine; it is the shared one every search field on this
 * site uses, and the property that matters is that it behaves identically here. Restating
 * it would make this file assert a second implementation that happens to agree today.
 */
function realMatchText(regexState) {
  const line = app.split('\n').find((l) => /^\s*function matchText\(text,query,target\)\{/u.test(l));
  assert.ok(line, 'matchText(text,query,target) was not found as a single source line in site/app.js');
  return new Function('regexState', `${line.trim()}\nreturn matchText;`)(regexState);
}

/** A keyboard event carrying exactly one chord, and nothing else. */
function eventFor(c, overrides = {}) {
  const event = {
    key: c.key,
    ctrlKey: c.ctrl,
    shiftKey: c.shift,
    altKey: c.alt,
    metaKey: c.meta,
    prevented: 0,
    preventDefault() { this.prevented += 1; },
  };
  return Object.assign(event, overrides);
}

const ALL_IDS = ['command-palette', 'notifications-dialog', 'history-dialog', 'reset-confirm-dialog', 'theme-mode',
  'notification-open', 'history-open', 'settings-reset', 'regex-dialog'];

/* ================================================================== *
 * The registry, and the fact that the feature is started at all.
 * ================================================================== */

test('the site feature registry carries a row for context-menu-shortcuts', () => {
  assert.ok(registry.features['context-menu-shortcuts'], 'no context-menu-shortcuts row in site/feature-registry.json');
});

test('the menu is built and started from init(), and built before applyState() reads its filter status', () => {
  const line = app.split('\n').find((l) => /^\s*function init\(\)\{/u.test(l));
  assert.ok(line, 'init() was not found as a single source line');
  assert.match(line, /ensureContextMenuUI\(\);applyState\(\);/u,
    'the menu is no longer built before applyState(), so its filter-mode readout would be missed on the first pass');
  assert.match(line, /initContextMenu\(\)/u, 'nothing starts the right-click menu');
  /* Commented out rather than deleted is how a wiring line usually dies, and a bare
   * substring needle is satisfied by the comment. */
  assert.doesNotMatch(line, /\/\*[^*]*initContextMenu\(\)/u, 'the initContextMenu() call is commented out');
});

test('the right-click listener is on document, so every rendered element genuinely has a menu', () => {
  assert.match(app, /document\.addEventListener\('contextmenu',event=>\{/u,
    'the contextmenu listener is no longer registered on document -- some elements would have no menu');
});

/* ================================================================== *
 * Chords: the property the whole feature is named after.
 * ================================================================== */

test('chordMatches accepts the exact chord and refuses every single-modifier difference', () => {
  const { chord, chordMatches } = load();
  const target = chord('l', { alt: true, shift: true });
  assert.equal(chordMatches(target, eventFor(target)), true, 'the exact chord is not matched');
  for (const modifier of ['ctrlKey', 'shiftKey', 'altKey', 'metaKey']) {
    const event = eventFor(target);
    event[modifier] = !event[modifier];
    assert.equal(chordMatches(target, event), false, `flipping ${modifier} alone still matched`);
  }
  assert.equal(chordMatches(target, eventFor(target, { key: 'k' })), false, 'a different key still matched');
  assert.equal(chordMatches(target, eventFor(target, { key: 'L' })), true, 'the same key in upper case did not match');
  assert.equal(chordMatches(target, null), false, 'a missing event matched');
  assert.equal(chordMatches(null, eventFor(target)), false, 'a missing chord matched');
});

test("chordLabel prints the platform's own notation, and chordAriaLabel prints the specified one", () => {
  const { chord, chordLabel, chordAriaLabel } = load();
  const c = chord('l', { ctrl: true, alt: true, shift: true });
  assert.equal(chordLabel(c, 'Win32'), 'Ctrl+Alt+Shift+L');
  assert.equal(chordLabel(c, 'MacIntel'), '⌃⌥⇧L');
  assert.equal(chordLabel(chord('f10', { shift: true }), 'Win32'), 'Shift+F10');
  assert.equal(chordLabel(null, 'Win32'), '', 'an action with no chord printed something');
  /* aria-keyshortcuts has a fixed grammar of its own: "Control", never "Ctrl", and never
   * a platform glyph. Printing the visible label into it would be read out as nonsense. */
  assert.equal(chordAriaLabel(c), 'Control+Alt+Shift+L');
  assert.equal(chordAriaLabel(null), '');
});

test('the printed shortcut on every item is derived from the same chord the dispatcher matches', () => {
  const api = load({ ids: ALL_IDS });
  const items = api.menuItemsFor(api.contextMenuContext(null), 'Win32');
  assert.ok(items.length > 0, 'no items were produced, so this would pass vacuously');
  let withChords = 0;
  for (const item of items) {
    const action = api.MENU_ACTIONS.find((entry) => entry.id === item.id);
    assert.ok(action, `item ${item.id} has no action behind it`);
    assert.equal(item.chord, action.chord, `item ${item.id} carries a copy of its chord rather than the chord itself`);
    assert.equal(item.shortcut, api.chordLabel(action.chord, 'Win32'), `item ${item.id} prints a shortcut it did not derive`);
    if (action.chord) withChords += 1;
  }
  assert.ok(withChords >= 4, `only ${withChords} items carry a chord, so the shortcut column proves little`);
});

test('pressing a printed chord dispatches exactly the item it was printed beside', () => {
  const api = load({ ids: ALL_IDS });
  const heading = makeElement('h2');
  heading.textContent = 'Release notes';
  const all = api.menuItemsFor(api.contextMenuContext(heading), 'Win32');
  const items = all.filter((item) => item.chord && item.enabled);
  assert.ok(items.length >= 4, `only ${items.length} available chord-carrying items, so this proves little`);
  for (const item of items) {
    const hit = api.contextMenuChordAction(eventFor(item.chord), all, { open: false, visibleIds: [] });
    assert.ok(hit, `the chord printed beside "${item.label}" dispatched nothing`);
    assert.equal(hit.id, item.id, `the chord printed beside "${item.label}" dispatched "${hit.label}" instead`);
  }
});

test('no two actions claim the same chord, so no printed shortcut is ambiguous', () => {
  const api = load({ ids: ALL_IDS });
  const chords = api.MENU_ACTIONS.filter((action) => action.chord).map((action) => api.chordAriaLabel(action.chord));
  assert.ok(chords.length > 0, 'no chords at all, so this would pass vacuously');
  assert.equal(new Set(chords).size, chords.length, `two actions share a chord: ${chords.slice().sort().join(', ')}`);
});

test('no action sits on a chord the browser answers first', () => {
  const api = load();
  assert.ok(api.RESERVED_CHORDS.length >= 10, `only ${api.RESERVED_CHORDS.length} reserved chords are recorded`);
  for (const entry of api.RESERVED_CHORDS) {
    assert.ok(entry.claimedBy && entry.claimedBy.length > 3, 'a reserved chord does not name what claims it');
  }
  /* Proof the lookup works before it is trusted to find nothing: a chord that IS on the
   * list must come back with its claimant. */
  const known = api.reservedChordClaim(api.chord('r', { ctrl: true, shift: true }));
  assert.ok(known && /reload/u.test(known.claimedBy), "Ctrl+Shift+R is no longer recognised as the browser's own");
  for (const action of api.MENU_ACTIONS) {
    if (!action.chord) continue;
    const claim = api.reservedChordClaim(action.chord);
    assert.equal(claim, null, `"${action.label}" is bound to a chord the browser uses for ${claim?.claimedBy}`);
  }
});

test('no page declares an accesskey, which is the one thing that would collide with Alt+Shift', () => {
  /* Firefox fires access keys on Alt+Shift+<key>, and every chord this site owns is
   * Alt+Shift+<key>. The absence below is load-bearing, not incidental tidiness. */
  assert.doesNotMatch(everyPage, /accesskey/iu,
    'a page now declares an accesskey, which Firefox fires on the same Alt+Shift chord this menu uses');
  const api = load();
  const owned = api.MENU_ACTIONS.filter((action) => action.chord?.alt && action.chord?.shift);
  assert.ok(owned.length >= 3, `only ${owned.length} Alt+Shift chords, so the check above guards little`);
});

test('the command palette chord is the one initNavigation actually binds, evaluated rather than restated', () => {
  /* initNavigation() owns Ctrl+Shift+F -- the palette contract covers it, and running it
   * twice would call showModal() on an open dialog and throw. So this menu prints that
   * chord without claiming it, and the two halves are kept honest here by taking the
   * literal condition out of the file and RUNNING it against the chord the menu prints. */
  const line = app.split('\n').find((l) => /addEventListener\('keydown',event=>/u.test(l) && l.includes('openPalette()'));
  assert.ok(line, 'no keydown listener calling openPalette() was found in app.js');
  const condition = line.match(/if\((event\.ctrlKey[\s\S]*?)\)\{event\.preventDefault\(\);openPalette\(\)\}/u);
  assert.ok(condition, 'the palette binding no longer has an extractable condition');
  const fires = new Function('event', `return Boolean(${condition[1]})`);

  const api = load({ ids: ALL_IDS });
  const palette = api.MENU_ACTIONS.find((action) => action.id === 'command-palette');
  assert.ok(palette?.chord, 'the menu no longer prints a chord for the command palette');
  assert.equal(fires(eventFor(palette.chord)), true,
    'the chord the menu prints for the palette is not the chord initNavigation binds');
  assert.equal(fires(eventFor(api.chord('g', { ctrl: true, shift: true }))), false,
    'the extracted condition fires on anything, so the check above proves nothing');
});

test('the dispatcher declines the palette chord it prints, because another binding owns it', () => {
  const api = load({ ids: ALL_IDS });
  const palette = api.MENU_ACTIONS.find((action) => action.id === 'command-palette');
  const handled = api.handleContextMenuChord(eventFor(palette.chord));
  assert.equal(handled, false, 'the menu now dispatches the palette chord too, which would open an already-open dialog');
  assert.equal(api.page.palette, 0, "the palette was opened a second time from the menu's own handler");
  assert.match(app, /\.filter\(item=>item\.id!=='command-palette'\)/u,
    'the dispatcher no longer excludes the chord another binding owns');
});

test('a chord with no menu item behind it does nothing at all', () => {
  const api = load({ ids: ALL_IDS });
  assert.equal(api.handleContextMenuChord(eventFor(api.chord('z', { alt: true, shift: true, ctrl: true }))), false);
  assert.deepEqual(api.page.copied, [], 'an unbound chord still copied something');
});

test('a live chord runs its action and stops the browser doing whatever else it would', () => {
  const api = load({ ids: ALL_IDS });
  const heading = makeElement('h2');
  heading.textContent = 'Release notes';
  api.page.document.activeElement = heading;
  const copy = api.MENU_ACTIONS.find((action) => action.id === 'copy-text');
  const event = eventFor(copy.chord);
  assert.equal(api.handleContextMenuChord(event), true, 'a live chord was not handled');
  assert.deepEqual(api.page.copied, ['Release notes'], 'the chord did not copy the focused element');
  assert.equal(event.prevented, 1, 'the chord did not stop the browser acting on the same keystroke');
});

/* ================================================================== *
 * The items themselves.
 * ================================================================== */

test('every kind of element gets a menu, and link-only actions appear only on links', () => {
  const api = load({ ids: ALL_IDS });
  for (const kind of ['element', 'heading', 'code', 'link', 'image', 'field', 'control', 'page']) {
    const items = api.menuItemsFor({ ...api.contextMenuContext(null), kind }, 'Win32');
    assert.ok(items.length > 0, `a ${kind} target produced no menu items at all`);
    const ids = items.map((item) => item.id);
    if (kind === 'link') assert.ok(ids.includes('copy-link'), 'a link is not offered its address');
    else assert.ok(!ids.includes('copy-link'), `a ${kind} is offered a link address it does not have`);
    if (kind === 'image') assert.ok(ids.includes('copy-image-description'), 'an image is not offered its description');
    else assert.ok(!ids.includes('copy-image-description'), `a ${kind} is offered an image description`);
  }
});

test('every unavailable item names the exact condition that is unmet', () => {
  const api = load({ ids: [] });
  const items = api.menuItemsFor(api.contextMenuContext(null), 'Win32');
  const disabled = items.filter((item) => !item.enabled);
  assert.ok(disabled.length > 0, 'nothing was unavailable on a bare page, so this would pass vacuously');
  for (const item of disabled) {
    assert.ok(item.unavailableReason.length > 20,
      `"${item.label}" is unavailable with no explanation -- a disabled control with no reason reads as broken`);
  }
  for (const item of items.filter((entry) => entry.enabled)) {
    assert.equal(item.unavailableReason, '', `"${item.label}" is available and still carries a reason`);
  }
});

test('page-scoped actions become available exactly when their surface is on the page', () => {
  const bare = load({ ids: [] });
  const full = load({ ids: ALL_IDS });
  const state = (api) => Object.fromEntries(api.menuItemsFor(api.contextMenuContext(null), 'Win32').map((i) => [i.id, i.enabled]));
  const before = state(bare);
  const after = state(full);
  for (const id of ['command-palette', 'notification-centre', 'local-history', 'reset-settings']) {
    assert.equal(before[id], false, `${id} claims to be available on a page that does not carry it`);
    assert.equal(after[id], true, `${id} is still unavailable on a page that does carry it`);
  }
});

test('the destructive action carries no chord, and reaches the two-key gate rather than going round it', () => {
  const api = load({ ids: ALL_IDS });
  const reset = api.MENU_ACTIONS.find((action) => action.id === 'reset-settings');
  assert.ok(reset, 'the menu no longer offers the reset at all');
  assert.equal(reset.destructive, true, 'the reset is no longer marked destructive');
  assert.equal(reset.chord, null,
    'the destructive action now has a keyboard shortcut, which would reach it without reading anything');
  assert.match(app, /\{id:'reset-settings'[\s\S]{0,400}?run:\(\)=>\$\('settings-reset'\)\?\.click\(\)\}/u,
    'the reset no longer routes through the control that opens the confirmation gate');
  /* Never the reset itself. That function is behind two keys and a full-range slider, and
   * a menu item calling it directly would be a one-click way past all of it. */
  assert.doesNotMatch(featureSource(), /performSettingsReset/u, 'the menu can now perform the reset without the gate');
});

test('activating an unavailable item does nothing, whichever route is taken', () => {
  /* Deliberately the palette rather than the lock: on a page with no palette it is
   * unavailable, and its action is the one whose running would be VISIBLE here. An
   * unavailable item whose action does nothing anyway cannot tell a working refusal from
   * a missing one -- which is exactly how this assertion passed on a broken build once. */
  const api = load({ ids: [] });
  api.openContextMenu({ element: null, x: 10, y: 10 });
  const palette = api.menuItemsFor(api.contextMenuContext(null), 'Win32').find((entry) => entry.id === 'command-palette');
  assert.equal(palette.enabled, false, 'the palette is available on a page that does not carry it, so this proves nothing');
  api.activateContextMenuItem('command-palette');
  assert.equal(api.page.palette, 0, 'clicking an unavailable item ran it anyway');
  assert.equal(api.chordIsLive(palette, { open: false, visibleIds: [] }), false, 'an unavailable item is live on the keyboard');
  api.activateContextMenuItem('lock-element');
  api.activateContextMenuItem('reset-settings');
  assert.deepEqual(api.page.copied, [], 'an unavailable item did something');
});

test('the two permanently unavailable entries stay unavailable on a page that carries everything', () => {
  /* The property, not the phrasing. `unavailable` taking no argument is what makes
   * "permanently" true: an `unavailable:ctx=>...` could consult the page and turn on, and
   * a fully-equipped page is where that would show. */
  const api = load({ ids: ALL_IDS });
  const items = api.menuItemsFor(api.contextMenuContext(null), 'Win32');
  for (const [id, row] of [['lock-element', 'per-element-toy-locks'], ['element-appearance', 'material-appearance']]) {
    const item = items.find((entry) => entry.id === id);
    assert.ok(item, `the menu no longer offers ${id} at all`);
    assert.equal(item.enabled, false, `${id} became available on a fully-equipped page`);
    assert.ok(item.unavailableReason.includes(row), `${id} no longer names the registry row that records why`);
    const action = api.MENU_ACTIONS.find((entry) => entry.id === id);
    assert.equal(action.unavailable.length, 0,
      `${id}'s unavailability now takes an argument, so some state could turn it on`);
    assert.equal(action.run.length, 0, `${id} now has a body that reads its context -- something would happen`);
  }
});

/* ================================================================== *
 * Naming an element, including the icon trap.
 * ================================================================== */

test('an element named only by a glyph has no name at all, rather than being called by its glyph', () => {
  const api = load();
  const glyph = makeElement('span');
  glyph.textContent = '▣';
  assert.equal(api.accessibleName(glyph), null, 'a glyph was accepted as a name');
  const prefixed = makeElement('span');
  prefixed.textContent = '▣ Dashboard';
  assert.equal(api.accessibleName(prefixed), 'Dashboard', 'a leading glyph was left glued to the name');
  const labelled = makeElement('button');
  labelled.textContent = '✕';
  labelled.setAttribute('aria-label', 'Close this panel');
  assert.equal(api.accessibleName(labelled), 'Close this panel', 'an explicit label lost to the glyph');
  assert.equal(api.accessibleName(makeElement('div')), null);
  const long = makeElement('p');
  long.textContent = 'x'.repeat(200);
  assert.ok(api.accessibleName(long).length <= 60, 'a very long name is not truncated, so a menu title could run off the screen');
});

test('the copy-text action refuses an element it cannot name, and says why', () => {
  const api = load({ ids: ALL_IDS });
  const glyph = makeElement('span');
  glyph.textContent = '◆';
  const item = api.menuItemsFor(api.contextMenuContext(glyph), 'Win32').find((entry) => entry.id === 'copy-text');
  assert.equal(item.enabled, false, 'an icon-only element offered its glyph for copying');
  assert.match(item.unavailableReason, /named only by an icon/u);
});

test('a right-click resolves to the nearest element with actions of its own', () => {
  const api = load();
  const link = makeElement('a');
  link.setAttribute('href', '/downloads.html');
  const inner = makeElement('span');
  inner.textContent = 'Download';
  link.append(inner);
  assert.equal(api.resolveContextTarget(inner), link, 'a click inside a link did not resolve to the link');
  assert.equal(api.contextTargetKind(link), 'link');
  assert.equal(api.contextTargetKind(makeElement('a')), 'element', 'an anchor with no address is still called a link');
});

/* ================================================================== *
 * Filtering: narrows, never rewrites.
 * ================================================================== */

test('filtering preserves source order and hands back the same objects, never copies', () => {
  const api = load({ ids: ALL_IDS });
  const items = api.menuItemsFor(api.contextMenuContext(null), 'Win32');
  const filtered = api.filterMenuItems(items, 'copy', 'context-menu-search');
  assert.ok(filtered.length > 0 && filtered.length < items.length, `filtering produced ${filtered.length} of ${items.length}`);
  const order = items.filter((item) => filtered.includes(item));
  assert.deepEqual(filtered.map((i) => i.id), order.map((i) => i.id), 'filtering reordered the menu');
  for (const item of filtered) {
    assert.ok(items.includes(item), 'filtering replaced an item with a different object, so its action could differ');
  }
});

test('an empty filter returns everything, as a copy rather than the original array', () => {
  const api = load({ ids: ALL_IDS });
  const items = api.menuItemsFor(api.contextMenuContext(null), 'Win32');
  const all = api.filterMenuItems(items, '   ', 'context-menu-search');
  assert.deepEqual(all.map((i) => i.id), items.map((i) => i.id));
  assert.notEqual(all, items, 'the caller was handed the live array, which it could sort out from under the menu');
});

test('an active pattern filters even with an empty query box, exactly as every other field does', () => {
  /* The property master fixed on the site's other search fields on 2026-08-26: matchText()
   * consults a compiled pattern BEFORE it looks at the query, so a builder left switched on
   * keeps filtering when the box is cleared. A menu that short-circuited on an empty query
   * would be the one search here that announced a builder and then ignored it. */
  const regexState = new Map([['context-menu-search', { pattern: '^Copy link', flags: 'u', enabled: true }]]);
  const api = load({ ids: ALL_IDS, regexState });
  const items = api.menuItemsFor({ ...api.contextMenuContext(null), kind: 'link', href: '/x' }, 'Win32');
  assert.deepEqual(api.filterMenuItems(items, '', 'context-menu-search').map((i) => i.id), ['copy-link'],
    'an empty query box returned every item while a pattern was still active');
  assert.deepEqual(api.filterMenuItems(items, '   ', 'context-menu-search').map((i) => i.id), ['copy-link'],
    'a whitespace-only query box returned every item while a pattern was still active');
});

test('the filter goes through the shared regex engine, keyed by this field and no other', () => {
  const regexState = new Map([['context-menu-search', { pattern: '^Copy link', flags: 'u', enabled: true }]]);
  const api = load({ ids: ALL_IDS, regexState });
  const items = api.menuItemsFor({ ...api.contextMenuContext(null), kind: 'link', href: '/x' }, 'Win32');
  const filtered = api.filterMenuItems(items, 'anything', 'context-menu-search');
  assert.deepEqual(filtered.map((i) => i.id), ['copy-link'], 'the menu filter is not using its own compiled pattern');
  assert.deepEqual(api.filterMenuItems(items, 'anything', 'feature-search'), [],
    "the menu filter answered to another field's key");
});

test('the menu ships the anchored regex builder its own filter needs', () => {
  const api = load({ ids: ALL_IDS });
  api.ensureContextMenuUI();
  const trigger = api.page.document.getElementById('context-menu').querySelectorAll('[data-regex-for]')[0];
  assert.ok(trigger, 'the menu filter has no regex builder beside it');
  assert.equal(trigger.dataset.regexFor, api.CONTEXT_MENU_SEARCH_ID, 'the builder is attached to a different field');
  assert.ok(trigger.className.split(/\s+/u).includes('regex-trigger'),
    'the trigger does not carry the class initSearch() binds, so it would open nothing');
  const status = api.page.document.getElementById(`${api.CONTEXT_MENU_SEARCH_ID}-mode-status`);
  assert.ok(status, 'the menu has no plain-text-versus-regex readout');
  assert.equal(status.getAttribute('role'), 'status');
  assert.equal(status.getAttribute('aria-live'), 'polite');
  assert.ok(status.className.split(/\s+/u).includes('mode-status'),
    'the readout does not carry the class renderAllModeStatuses() finds it by');
});

test('the result count is stated exactly, including the honest empty case', () => {
  const api = load();
  assert.equal(api.menuResultSummary(7, 7, ''), '7 actions for this element.');
  assert.equal(api.menuResultSummary(1, 1, ''), '1 action for this element.');
  assert.equal(api.menuResultSummary(2, 7, 'copy'), '2 of 7 actions match “copy”.');
  assert.match(api.menuResultSummary(0, 7, 'zzz'), /^No action matches “zzz”\./u);
  assert.match(api.menuResultSummary(0, 7, 'zzz'), /7 actions were offered/u,
    'an empty result no longer says how many were offered, so it reads as an empty menu');
});

test('an item the filter has hidden is not reachable by its shortcut either', () => {
  /* The rule this exists for: filtering must never leave a destructive item invisible on
   * screen and live on the keyboard. Applied to every item, not only that one. */
  const api = load({ ids: ALL_IDS });
  const items = api.menuItemsFor(api.contextMenuContext(null), 'Win32');
  const copy = items.find((item) => item.id === 'copy-section-link');
  assert.ok(copy?.chord, 'the item this check relies on no longer carries a chord');
  const live = { ...copy, enabled: true };
  assert.equal(api.chordIsLive(live, { open: false, visibleIds: [] }), true, 'a closed menu suppressed a shortcut');
  assert.equal(api.chordIsLive(live, { open: true, visibleIds: [copy.id] }), true, 'a visible item was suppressed');
  assert.equal(api.chordIsLive(live, { open: true, visibleIds: ['command-palette'] }), false,
    'an item hidden by the filter is still live on the keyboard');
});

/* ================================================================== *
 * Position: inside the viewport, scrolling rather than swallowing.
 * ================================================================== */

test('the menu is placed inside the viewport, flipping rather than lying over the point it opened from', () => {
  const api = load();
  const view = { viewWidth: 1000, viewHeight: 800, menuWidth: 320, menuHeight: 240 };
  const ordinary = api.clampMenuPosition({ x: 100, y: 100, ...view });
  assert.deepEqual([ordinary.left, ordinary.top], [100, 100], 'a menu with room around it was moved anyway');
  assert.equal(ordinary.flippedX, false);
  assert.equal(ordinary.scrolls, false);

  const nearRight = api.clampMenuPosition({ x: 960, y: 100, ...view });
  assert.equal(nearRight.flippedX, true, 'a menu near the right edge was not flipped');
  assert.equal(nearRight.left + view.menuWidth, 960, 'the flipped menu does not end at the point it opened from');

  const nearBottom = api.clampMenuPosition({ x: 100, y: 780, ...view });
  assert.equal(nearBottom.flippedY, true, 'a menu near the bottom edge was not flipped');
  assert.ok(nearBottom.top + nearBottom.maxHeight <= view.viewHeight, 'the flipped menu still runs off the bottom');
});

test('a menu taller than the viewport is bounded and told to scroll, never silently cut short', () => {
  const api = load();
  const placed = api.clampMenuPosition({ x: 10, y: 10, menuWidth: 320, menuHeight: 2000, viewWidth: 1000, viewHeight: 400 });
  assert.ok(placed.maxHeight <= 400 - api.CONTEXT_MENU_MARGIN * 2, 'the menu was not bounded to the viewport');
  assert.equal(placed.scrolls, true, 'a menu that had to be shortened does not report that it scrolls');
  assert.ok(placed.top >= api.CONTEXT_MENU_MARGIN, 'the menu was pushed off the top of the screen');
});

test('a viewport smaller than the minimum still yields a usable, non-negative box', () => {
  const api = load();
  const placed = api.clampMenuPosition({ x: 0, y: 0, menuWidth: 320, menuHeight: 400, viewWidth: 200, viewHeight: 100 });
  assert.ok(placed.maxHeight >= api.CONTEXT_MENU_MIN_HEIGHT, 'a tiny viewport collapsed the menu to nothing');
  assert.ok(placed.left >= 0 && placed.top >= 0, 'the menu was placed off-screen');
});

test('the stylesheet declares .context-menu exactly once', () => {
  /* It declared it twice until this feature landed: a rule from the site's first commit
   * styling a menu that never shipped, and this one. Two rules for one selector in one
   * file are decided by source order rather than by anything a reader can see, so an edit
   * to the wrong one is a silent no-op -- this repository has lost an afternoon to exactly
   * that shape before. */
  const declarations = styles.split('\n').filter((line) => line.startsWith('.context-menu{'));
  assert.equal(declarations.length, 1, `${declarations.length} .context-menu rules in styles.css`);
});

test('the stylesheet pairs the height bound with a scrollbar, and paints its own surface', () => {
  const rule = styles.split('\n').find((line) => line.startsWith('.context-menu{'));
  assert.ok(rule, 'no .context-menu rule in styles.css');
  assert.match(rule, /position:fixed/u, 'the menu is no longer positioned from viewport coordinates');
  assert.match(rule, /overflow:auto/u,
    'a max-height with no overflow rule deletes whatever falls past it, with no scrollbar to say anything is missing');
  assert.match(rule, /background:var\(--surface-1\)/u, 'the menu no longer paints its own background');
  assert.match(rule, /border:1px solid var\(--outline\)/u, 'the menu no longer paints its own border');
  /* Above the rail at 80, deliberately below the toast region at 200: a notification the
   * menu's own action just raised must not end up underneath the menu that raised it. */
  assert.match(rule, /z-index:150/u, 'the menu no longer sits between the page chrome and the toast region');
  const toast = styles.split('\n').find((line) => line.startsWith('.toast-region{'));
  assert.match(toast, /z-index:200/u, 'the toast region moved, so the menu may now cover its own notifications');
});

test("menu rows and the builder trigger meet the site's own touch-target size", () => {
  for (const selector of ['.context-menu-item{', '.context-menu-regex{']) {
    const rule = styles.split('\n').find((line) => line.startsWith(selector));
    assert.ok(rule, `no ${selector.slice(0, -1)} rule in styles.css`);
    assert.match(rule, /min-(?:height|width):var\(--touch\)/u,
      `${selector.slice(0, -1)} no longer meets the touch-target size`);
  }
});

/* ================================================================== *
 * Keyboard and assistive technology.
 * ================================================================== */

test('Escape clears the filter first and closes on the second press, returning focus where it came from', () => {
  const api = load({ ids: ALL_IDS });
  const opener = makeElement('button');
  opener.textContent = 'Open me';
  api.openContextMenu({ element: opener, x: 20, y: 20, opener });
  const menu = api.page.document.getElementById('context-menu');
  const search = api.page.document.getElementById(api.CONTEXT_MENU_SEARCH_ID);
  assert.equal(menu.hidden, false, 'the menu did not open');

  search.value = 'copy';
  api.onContextMenuKeydown(eventFor(api.chord('escape'), { key: 'Escape' }));
  assert.equal(search.value, '', 'the first Escape did not clear the filter');
  assert.equal(menu.hidden, false, 'the first Escape closed the menu instead of clearing the filter');

  const before = opener.focused;
  api.onContextMenuKeydown(eventFor(api.chord('escape'), { key: 'Escape' }));
  assert.equal(menu.hidden, true, 'the second Escape did not close the menu');
  assert.equal(opener.focused, before + 1, 'focus did not return to the element the menu was opened from');
});

test('arrow keys move an active option, and Enter runs that one', () => {
  const api = load({ ids: ALL_IDS });
  const link = makeElement('a');
  link.setAttribute('href', '/downloads.html');
  link.textContent = 'Downloads';
  api.openContextMenu({ element: link, x: 20, y: 20 });
  const search = api.page.document.getElementById(api.CONTEXT_MENU_SEARCH_ID);
  const list = api.page.document.getElementById('context-menu-list');

  assert.equal(search.getAttribute('aria-activedescendant'), null, 'an option was active before anything was pressed');
  api.onContextMenuKeydown(eventFor(api.chord('x'), { key: 'ArrowDown' }));
  const first = search.getAttribute('aria-activedescendant');
  assert.ok(first, 'ArrowDown set no active option');
  assert.equal(list.querySelectorAll('[data-action-id]')[0].getAttribute('aria-selected'), 'true',
    'the first option is not marked selected');

  api.onContextMenuKeydown(eventFor(api.chord('x'), { key: 'ArrowDown' }));
  assert.notEqual(search.getAttribute('aria-activedescendant'), first, 'a second ArrowDown did not move');
  api.onContextMenuKeydown(eventFor(api.chord('x'), { key: 'ArrowUp' }));
  assert.equal(search.getAttribute('aria-activedescendant'), first, 'ArrowUp did not move back');

  api.onContextMenuKeydown(eventFor(api.chord('x'), { key: 'Enter' }));
  assert.equal(api.page.copied.length, 1, 'Enter did not run the active option');
  assert.equal(api.page.document.getElementById('context-menu').hidden, true, 'the menu stayed open after an item ran');
});

test('each option carries its role, its shortcut as a shortcut, and its unavailability where it applies', () => {
  const api = load({ ids: [] });
  api.openContextMenu({ element: null, x: 5, y: 5 });
  const list = api.page.document.getElementById('context-menu-list');
  assert.equal(list.getAttribute('role'), 'listbox');
  const options = list.querySelectorAll('[data-action-id]');
  assert.ok(options.length > 0, 'no options were rendered, so this would pass vacuously');
  let announced = 0;
  for (const option of options) {
    assert.equal(option.getAttribute('role'), 'option', 'an option is not exposed as one');
    const keys = option.querySelectorAll('.context-menu-keys');
    if (keys.length > 0) {
      announced += 1;
      assert.ok(option.getAttribute('aria-keyshortcuts'), 'a visible shortcut is not exposed as a shortcut');
      assert.equal(keys[0].getAttribute('aria-hidden'), 'true',
        'the visible shortcut is announced as text as well, so it would be read out twice');
      assert.equal(keys[0].textContent,
        api.chordLabel(api.MENU_ACTIONS.find((a) => a.id === option.dataset.actionId).chord, 'Win32'));
    }
    const disabled = option.getAttribute('aria-disabled') === 'true';
    assert.equal(disabled, option.querySelectorAll('.context-menu-reason').length === 1,
      `option ${option.dataset.actionId}: aria-disabled and the visible reason disagree`);
  }
  assert.ok(announced >= 2, `only ${announced} options carry a shortcut, so this proves little`);
});

test('the result count and the keyboard hint are live regions carrying real words', () => {
  const api = load({ ids: ALL_IDS, copy: (key) => `voice:${key}` });
  api.openContextMenu({ element: null, x: 5, y: 5 });
  const count = api.page.document.getElementById('context-menu-count');
  assert.equal(count.getAttribute('role'), 'status');
  assert.equal(count.getAttribute('aria-live'), 'polite');
  assert.match(count.textContent, /actions for this element\.$/u);
  const foot = api.page.document.getElementById('context-menu-foot');
  assert.equal(foot.dataset.copy, 'contextMenuHint', 'the hint lost the hook applyCopy() re-renders it through');
  assert.equal(foot.textContent, 'voice:contextMenuHint',
    'the hint is not rendered through the language and funny-level table');
});

test("an empty filter result says so in the site's own voice rather than showing nothing", () => {
  const api = load({ ids: ALL_IDS, copy: (key) => `voice:${key}` });
  api.openContextMenu({ element: null, x: 5, y: 5 });
  api.page.document.getElementById(api.CONTEXT_MENU_SEARCH_ID).value = 'zzzzzz';
  api.renderContextMenuList();
  const list = api.page.document.getElementById('context-menu-list');
  assert.deepEqual(list.querySelectorAll('[data-action-id]'), [], 'options survived a filter that matches nothing');
  const empty = list.querySelectorAll('.context-menu-empty');
  assert.equal(empty.length, 1, 'an empty result renders a blank surface rather than saying anything');
  assert.equal(empty[0].textContent, 'voice:contextMenuNoMatch');
});

test('Shift+F10 and the Menu key open the menu for whatever has focus', () => {
  const api = load({ ids: ALL_IDS });
  api.initContextMenu();
  const focused = makeElement('button');
  focused.textContent = 'Deploy a server';
  api.page.document.activeElement = focused;
  api.page.document.dispatch('keydown', eventFor(api.chord('x', { shift: true }), { key: 'F10' }));
  const menu = api.page.document.getElementById('context-menu');
  assert.equal(menu.hidden, false, 'Shift+F10 did not open the menu');
  assert.match(api.page.document.getElementById('context-menu-title').textContent, /Deploy a server/u,
    'the keyboard route opened a menu for the wrong element');

  api.closeContextMenu({ restoreFocus: false });
  api.page.document.dispatch('keydown', eventFor(api.chord('x'), { key: 'ContextMenu' }));
  assert.equal(menu.hidden, false, 'the Menu key did not open the menu');
});

test("Shift and right-click together leave the browser's own menu alone", () => {
  /* A page that takes the context menu away entirely takes away "copy image", "search
   * for this", "view source", and the reader's only escape hatch when ours is wrong. */
  const api = load({ ids: ALL_IDS });
  api.initContextMenu();
  let prevented = 0;
  api.page.document.dispatch('contextmenu', {
    target: makeElement('p'), clientX: 4, clientY: 4, shiftKey: true, preventDefault() { prevented += 1; },
  });
  assert.equal(prevented, 0, 'Shift+right-click no longer falls through to the browser');
  assert.equal(api.page.document.getElementById('context-menu').hidden, true, 'Shift+right-click opened this menu anyway');
});

test('an ordinary right-click opens the menu over the element that was clicked', () => {
  const api = load({ ids: ALL_IDS });
  api.initContextMenu();
  const heading = makeElement('h2');
  heading.textContent = 'Guided deployment';
  let prevented = 0;
  api.page.document.dispatch('contextmenu', {
    target: heading, clientX: 40, clientY: 60, shiftKey: false, preventDefault() { prevented += 1; },
  });
  assert.equal(prevented, 1, 'the browser menu was not suppressed');
  const menu = api.page.document.getElementById('context-menu');
  assert.equal(menu.hidden, false, 'the menu did not open');
  assert.match(api.page.document.getElementById('context-menu-title').textContent, /Guided deployment/u);
  assert.equal(menu.style.left, '40px');
  assert.equal(menu.style.top, '60px');
});

/* ================================================================== *
 * Touch, which has no right button.
 * ================================================================== */

test('a long press opens the same menu, and a cancelled one leaves nothing running', () => {
  const api = load({ ids: ALL_IDS });
  const target = makeElement('p');
  target.textContent = 'Release notes';

  api.startLongPress({ clientX: 30, clientY: 30, target, pointerType: 'touch' });
  assert.equal(api.page.timers.length, 1, 'a long press was not armed');
  assert.equal(api.page.timers[0].ms, api.CONTEXT_MENU_LONG_PRESS_MS);
  api.page.timers[0].fn();
  assert.equal(api.page.document.getElementById('context-menu').hidden, false, 'the long press opened nothing');

  api.closeContextMenu({ restoreFocus: false });
  api.startLongPress({ clientX: 30, clientY: 30, target, pointerType: 'touch' });
  api.cancelLongPress();
  assert.deepEqual(api.page.timers, [], 'a cancelled long press left its timer running');
  assert.ok(api.CONTEXT_MENU_LONG_PRESS_SLOP > 0,
    'a long press now cancels on any movement at all, which no finger can satisfy');
});

/* ================================================================== *
 * Registry, localization, and the article.
 * ================================================================== */

test('the localization registry records the two keys this feature actually ships', () => {
  const row = locales.features['context-menu-shortcuts'];
  assert.ok(row, 'no context-menu-shortcuts row in site/locales/feature-registry.json');
  assert.equal(row.state, 'localized', 'the menu now renders its own copy through the language table');
  assert.deepEqual([...row.copyKeys].sort(), ['contextMenuHint', 'contextMenuNoMatch']);
  assert.deepEqual(row.missingCopyKeys, []);
});

test('the article records what this surface does and what it deliberately cannot do', () => {
  assert.match(article, /^## The pages-site$/mu, 'the article has no section for this surface');
  assert.match(article, /Alt\+Shift/u, 'the article does not say which chords this site owns');
  /* Named together, because `accesskey` alone appears elsewhere in the article and a bare
   * needle for it survived this exact sentence being replaced with a vaguer one. */
  assert.match(article, /Firefox activates access keys with Alt\+Shift/u,
    'the article does not record the Firefox access-key collision the design depends on');
  assert.match(article, /per-element-toy-locks/u, 'the article does not name the row behind the permanently unavailable lock entry');
});

test('the registry records context-menu-shortcuts as implemented, and every fact above supports that', () => {
/* schema v2: the registry key is `status` with 'implemented-unverified', and the file
 * list moved to `implementation.paths`. The site rows carry no built-artifact interaction
 * record and no capture, which is exactly what 'implemented-unverified' says. */
  assert.equal(registry.features['context-menu-shortcuts'].status, 'implemented-unverified',
    'a real document-level right-click menu with a derived, dispatched shortcut column exists -- "implemented" is the honest state');
  assert.match(registry.features['context-menu-shortcuts'].note, /shortcut/iu,
    'the registry note no longer describes the half this feature is named after');
});
