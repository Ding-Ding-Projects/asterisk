/**
 * Contract: dialog-emojis.
 *
 * The site now carries the canonical "Show emojis in dialogs and message boxes" switch.
 * The interesting half is not that it puts an emoji on screen -- that part is one line --
 * but that it puts it in exactly one kind of place and nowhere else. The canonical rule
 * is blunt about it: emoji never appear in buttons, action labels, field labels,
 * accessible names, or other control text. A control is read aloud by its own text, so a
 * decorative glyph sitting in one is noise the listener cannot switch off from where
 * they are.
 *
 * So most of this file is about the boundary, and about the property that makes the
 * boundary checkable at all: the decoration is a separate element the code creates, never
 * characters spliced into copy somebody wrote. Turning the switch off therefore restores
 * the exact bytes rather than an approximation of them, and no assertion here has to
 * guess where a glyph might have been spliced in.
 *
 * The behavioural half runs the real extracted source against a small recording DOM,
 * in the style `complete-exports.test.mjs` and `app-display-name.test.mjs` already
 * established here. That matters for this feature in particular: "the value is stored",
 * "the checkbox reflects it" and "the setting persists" are all true of a switch that
 * never reaches a single pixel, and those are exactly what a source-pattern test checks.
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

const PAGES = ['index', 'product', 'documentation', 'downloads', 'status', 'settings'];
const pageSource = Object.fromEntries(PAGES.map((name) => [name, read(`${name}.html`)]));
const app = read('app.js');
const css = read('styles.css');
const settings = pageSource.settings;
const registry = json('feature-registry.json');
const locales = json('locales/feature-registry.json');

/** Every dialog and message-box surface the switch is declared to decorate. */
const DECORATED_IDS = [
  'command-palette',
  'regex-dialog',
  'notifications-dialog',
  'history-dialog',
  'reset-confirm-dialog',
  /* Joined on 2026-08-26 with the Export everything dialog. A new dialog that did
   * not join this list would be the one surface on the site the switch quietly does
   * not reach, which is exactly the silent gap the "every dialog" wording exists to
   * refuse -- so the arrival of a dialog is meant to move this list. */
  'export-everything-dialog',
  /* Joined on 2026-08-26 by the built-in authenticator: its add-account dialog, the
   * separately confirmed secrets export, and the inline removal confirmation. That last
   * one is a message box rather than a dialog and decorates itself rather than a
   * heading, exactly as the notification confirmation already did. */
  'authenticator-dialog',
  'auth-secrets-dialog',
  'notif-confirm',
  'auth-confirm',
  /* Joined on 2026-08-27 by the support desk: its inline removal confirmation is a
     message box that decorates itself rather than a heading, exactly as the
     notification and authenticator confirmations already did. */
  'support-confirm',
];

/* ------------------------------------------------------------------ *
 * A recording DOM, and running the real source against it.
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

/** The declarations that name what is decorated and with what. */
function constantsSource(src) {
  const start = src.indexOf('const DIALOG_EMOJI_CLASS=');
  assert.notEqual(start, -1, 'DIALOG_EMOJI_CLASS is no longer declared in site/app.js');
  const endMarker = "const MESSAGE_BOX_GLYPH='";
  const end = src.indexOf(endMarker, start);
  assert.notEqual(end, -1, 'MESSAGE_BOX_GLYPH is no longer declared after the decoration table');
  const lineEnd = src.indexOf('\n', end);
  return src.slice(start, lineEnd);
}

/**
 * The smallest DOM that can tell a real decoration from a claimed one.
 *
 * It records rather than shrugs: every attribute set, every child inserted and every
 * child removed is observable afterwards, because "it added an emoji" and "it added an
 * emoji and also wrote one into the close button's accessible name" are the two outcomes
 * this feature has to be able to tell apart.
 */
class El {
  constructor(tag) {
    this.tag = tag;
    this.className = '';
    this.attributes = {};
    this.children = [];
    this.textContent = '';
    this.parent = null;
  }

  setAttribute(key, value) { this.attributes[key] = String(value); }

  getAttribute(key) { return Object.hasOwn(this.attributes, key) ? this.attributes[key] : null; }

  get firstChild() { return this.children[0] ?? null; }

  get firstElementChild() { return this.children[0] ?? null; }

  append(child) { child.parent = this; this.children.push(child); }

  insertBefore(child, reference) {
    child.parent = this;
    const at = reference ? this.children.indexOf(reference) : -1;
    if (at === -1) this.children.push(child);
    else this.children.splice(at, 0, child);
    return child;
  }

  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((c) => c !== this);
    this.parent = null;
  }

  /** Only what the real code asks for: a single class selector. */
  querySelector(selector) {
    assert.match(selector, /^\.[a-z-]+$/u, `the recording DOM only supports a single class selector, got ${selector}`);
    const wanted = selector.slice(1);
    const walk = (node) => {
      for (const child of node.children) {
        if (child.className.split(' ').includes(wanted)) return child;
        const found = walk(child);
        if (found) return found;
      }
      return null;
    };
    return walk(this);
  }
}

/** A dialog shaped like the real ones: a heading holding an h2 and an icon-only close button. */
function makeDialog(id, { heading = true } = {}) {
  const dialog = new El('dialog');
  dialog.id = id;
  if (!heading) {
    /* `#notif-confirm` is the inline alertdialog inside the notification centre: a
     * paragraph and two buttons, with no heading bar of its own. Shaped faithfully here
     * because a stub with no children cannot show whether a decoration displaced text. */
    const text = new El('p');
    text.id = 'notif-confirm-text';
    text.textContent = 'Dismiss 3 selected notifications?';
    const confirm = new El('button');
    confirm.className = 'danger-button';
    confirm.textContent = 'Confirm dismiss';
    const cancel = new El('button');
    cancel.className = 'text-button';
    cancel.textContent = 'Cancel';
    dialog.append(text);
    dialog.append(confirm);
    dialog.append(cancel);
    return dialog;
  }
  const bar = new El('div');
  bar.className = 'dialog-heading';
  const title = new El('h2');
  title.textContent = `${id} title`;
  const close = new El('button');
  close.className = 'icon-button';
  close.textContent = 'x';
  close.setAttribute('aria-label', 'Close');
  bar.append(title);
  bar.append(close);
  dialog.append(bar);
  return dialog;
}

function makeToast() {
  const toast = new El('div');
  toast.className = 'toast';
  const text = new El('div');
  text.className = 'toast-text';
  toast.append(text);
  return toast;
}

const FUNCTIONS = ['setDialogDecoration', 'messageBoxGlyph', 'applyDialogEmojis'];

/**
 * Build a page and run the real decoration code against it.
 *
 * `present` names which decorated surfaces exist, so the "a page without this dialog"
 * case is a real absence rather than a stub that returns something helpful.
 */
function loadDialogEmojis({ present = DECORATED_IDS, toasts = 0, dialogEmojis = false, withCard = true } = {}) {
  const dialogs = Object.fromEntries(present.map((id) => [id, makeDialog(id, { heading: id !== 'notif-confirm' })]));
  const toastElements = Array.from({ length: toasts }, () => makeToast());
  const checkbox = new El('input');
  const status = new El('p');
  const extras = withCard ? { 'dialog-emojis': checkbox, 'dialog-emojis-status': status } : {};

  const idsAsked = [];
  const selectorsAsked = [];

  const $ = (id) => {
    idsAsked.push(id);
    return dialogs[id] ?? extras[id] ?? null;
  };
  const all = (selector) => {
    selectorsAsked.push(selector);
    return selector === '#toast-region .toast' ? toastElements : [];
  };
  const doc = { createElement: (tag) => new El(tag) };

  const state = { dialogEmojis };
  const body = `${constantsSource(app)}\n${FUNCTIONS.map((name) => functionSource(app, name)).join('\n')}\n`
    + `return { ${FUNCTIONS.join(', ')}, DIALOG_EMOJI_CLASS, DIALOG_EMOJI_DECORATIONS, MESSAGE_BOX_GLYPH };`;
  // eslint-disable-line no-new-func -- deliberately re-running the real extracted source
  const api = new Function('document', '$', 'all', 'state', body)(doc, $, all, state);

  /* Reads the table's own `within` rather than a hand-kept list of which surfaces
   * decorate themselves. The hand-kept version threw a TypeError the first time a
   * second such surface arrived, which reads as a broken test rather than as a
   * surface this helper had not been told about. */
  const hostOf = (element) => {
    if (element.className === 'toast') return element;
    const entry = api.DIALOG_EMOJI_DECORATIONS.find((candidate) => candidate.id === element.id);
    return entry && entry.within === '' ? element : element.querySelector(entry ? entry.within : '.dialog-heading');
  };
  const decorationOf = (element) => {
    const first = hostOf(element)?.firstElementChild ?? null;
    return first && first.className === api.DIALOG_EMOJI_CLASS ? first : null;
  };

  return { ...api, state, dialogs, toastElements, checkbox, status, idsAsked, selectorsAsked, hostOf, decorationOf };
}

/* ------------------------------------------------------------------ *
 * The switch does something.
 * ------------------------------------------------------------------ */

test('the decoration table names every dialog and message box, and no two share a surface', () => {
  const h = loadDialogEmojis();
  const ids = h.DIALOG_EMOJI_DECORATIONS.map((d) => d.id);
  assert.ok(ids.length > 0, 'the decoration table is empty, so every assertion below would pass vacuously');
  assert.deepEqual([...ids].sort(), [...DECORATED_IDS].sort(),
    'the set of decorated surfaces changed -- this pin is the list, and it moves by hand');
  assert.equal(new Set(ids).size, ids.length, 'a surface appears twice in the decoration table');
  for (const entry of h.DIALOG_EMOJI_DECORATIONS) {
    assert.ok(entry.glyph.length > 0, `${entry.id} has no glyph`);
  }
});

test('every decorated surface really exists in the published markup', () => {
  /* A table naming an element no page carries would decorate nothing at all, and every
   * behavioural assertion here -- which builds its own elements -- would still pass. */
  const everyPage = PAGES.map((name) => pageSource[name]).join('\n');
  for (const id of DECORATED_IDS) {
    assert.ok(everyPage.includes(`id="${id}"`), `${id} is decorated but appears on no published page`);
  }
});

test('off is the shipped default, so nobody who never touches the switch sees a change', () => {
  const line = app.split('\n').find((l) => l.includes('const DEFAULTS = {'));
  assert.ok(line, 'the DEFAULTS object literal line was not found');
  assert.match(line, /(?:^|[{,])dialogEmojis:false(?=[,}])/u,
    'DEFAULTS no longer carries dialogEmojis:false, so the decoration is on for people who never asked for it');
});

test('with the switch off, no dialog and no message box carries a decoration', () => {
  const h = loadDialogEmojis({ toasts: 2 });
  h.applyDialogEmojis();
  for (const id of DECORATED_IDS) {
    assert.equal(h.decorationOf(h.dialogs[id]), null, `${id} was decorated while the switch was off`);
  }
  for (const toast of h.toastElements) {
    assert.equal(h.decorationOf(toast), null, 'a message box was decorated while the switch was off');
  }
});

test('with the switch on, every declared surface is decorated -- not just the one being watched', () => {
  const h = loadDialogEmojis({ toasts: 2, dialogEmojis: true });
  h.applyDialogEmojis();
  for (const entry of h.DIALOG_EMOJI_DECORATIONS) {
    const decoration = h.decorationOf(h.dialogs[entry.id]);
    assert.ok(decoration, `${entry.id} was not decorated with the switch on`);
    assert.equal(decoration.textContent, entry.glyph, `${entry.id} carries a glyph other than the one it declares`);
  }
  for (const toast of h.toastElements) {
    assert.equal(h.decorationOf(toast)?.textContent, h.MESSAGE_BOX_GLYPH,
      'a message box already on screen was left undecorated');
  }
});

test('turning the switch back off removes the decoration rather than emptying it', () => {
  /* An empty span still occupies the flex row and still reads as an element to anything
   * walking the DOM, so "off" would not be off. */
  const h = loadDialogEmojis({ toasts: 1, dialogEmojis: true });
  h.applyDialogEmojis();
  assert.ok(h.decorationOf(h.dialogs['command-palette']), 'nothing was decorated, so the removal below proves nothing');
  h.state.dialogEmojis = false;
  h.applyDialogEmojis();
  for (const id of DECORATED_IDS) {
    assert.equal(h.hostOf(h.dialogs[id]).children.filter((c) => c.className === h.DIALOG_EMOJI_CLASS).length, 0,
      `${id} still holds a decoration element after the switch was turned off`);
  }
  assert.equal(h.toastElements[0].children.length, 1, 'the message box kept an emptied decoration element');
});

test('applying twice does not stack two decorations on one surface', () => {
  const h = loadDialogEmojis({ toasts: 1, dialogEmojis: true });
  h.applyDialogEmojis();
  h.applyDialogEmojis();
  h.applyDialogEmojis();
  for (const id of DECORATED_IDS) {
    assert.equal(h.hostOf(h.dialogs[id]).children.filter((c) => c.className === h.DIALOG_EMOJI_CLASS).length, 1,
      `${id} accumulated more than one decoration`);
  }
  assert.equal(h.toastElements[0].children.filter((c) => c.className === h.DIALOG_EMOJI_CLASS).length, 1);
});

test('a page that does not carry a given dialog is simply skipped, not crashed on', () => {
  /* Only the settings page carries the reset gate and the history dialog; every page
   * carries the palette. A decorator that assumed all six exist would throw on five of
   * the six pages, and one throw takes applyState down with it. */
  const h = loadDialogEmojis({ present: ['command-palette'], dialogEmojis: true });
  h.applyDialogEmojis();
  assert.ok(h.decorationOf(h.dialogs['command-palette']));
});

/* ------------------------------------------------------------------ *
 * The boundary: where a glyph may never go.
 * ------------------------------------------------------------------ */

/**
 * The decorated surfaces that carry a heading, derived from the real table rather
 * than named here.
 *
 * A surface whose entry has an empty `within` decorates ITSELF -- it is a message
 * box rather than a dialog, and it has no heading for a glyph to sit outside of. That
 * used to be one hard-coded id, which is fine right up until a second such surface
 * arrives and the rule below starts failing on a surface it was never about.
 */
const headingDecorated = (h) => h.DIALOG_EMOJI_DECORATIONS.filter((entry) => entry.within !== '').map((entry) => entry.id);

test('the decoration sits outside the heading a dialog is labelled by, so no accessible name contains it', () => {
  /* Every one of these dialogs is `aria-labelledby` its own <h2>. A glyph inside that
   * heading would enter the dialog's accessible name and be read aloud on open, which is
   * exactly the noise the canonical boundary exists to prevent. */
  const h = loadDialogEmojis({ dialogEmojis: true });
  h.applyDialogEmojis();
  for (const id of headingDecorated(h)) {
    const title = h.hostOf(h.dialogs[id]).children.find((c) => c.tag === 'h2');
    assert.ok(title, `${id} lost its heading element`);
    assert.equal(title.children.length, 0, `${id} now nests a decoration inside the heading it is labelled by`);
    assert.equal(title.textContent, `${id} title`, `${id}'s heading text was rewritten rather than decorated beside`);
  }
});

test('every decorated dialog really is labelled by its own heading, which is why the rule above matters', () => {
  for (const id of headingDecorated(loadDialogEmojis())) {
    const at = settings.indexOf(`id="${id}"`);
    assert.notEqual(at, -1, `${id} is not on the settings page, so its labelling cannot be checked here`);
    const opening = settings.slice(settings.lastIndexOf('<', at), settings.indexOf('>', at) + 1);
    assert.match(opening, /aria-labelledby="/u,
      `${id} is no longer labelled by a heading element, so the boundary above is guarding nothing`);
  }
});

test('the decoration is hidden from assistive technology and excluded from the vocabulary walker', () => {
  const h = loadDialogEmojis({ dialogEmojis: true });
  h.applyDialogEmojis();
  const decoration = h.decorationOf(h.dialogs['regex-dialog']);
  assert.equal(decoration.getAttribute('aria-hidden'), 'true',
    'the decoration is exposed to assistive technology, so a glyph name is read aloud');
  assert.equal(decoration.getAttribute('data-no-vocab'), '',
    'the decoration is not excluded from the personal-vocabulary walker, which would treat a glyph as copy');
});

test('no button, label or accessible name is touched -- the switch only ever writes into its own element', () => {
  const h = loadDialogEmojis({ toasts: 1, dialogEmojis: true });
  h.applyDialogEmojis();
  const offenders = [];
  const walk = (node, path) => {
    if (node.className !== h.DIALOG_EMOJI_CLASS) {
      for (const [key, value] of Object.entries(node.attributes)) {
        if (/\p{Extended_Pictographic}/u.test(value)) offenders.push(`${path}[${key}]`);
      }
      if (node.children.length === 0 && /\p{Extended_Pictographic}/u.test(node.textContent)) {
        offenders.push(`${path} text`);
      }
    }
    node.children.forEach((child, index) => walk(child, `${path}>${child.tag}#${index}`));
  };
  for (const id of DECORATED_IDS) walk(h.dialogs[id], id);
  h.toastElements.forEach((toast, index) => walk(toast, `toast#${index}`));
  assert.deepEqual(offenders, [],
    `an emoji reached control text or an accessible name:\n${offenders.join('\n')}`);
});

test('the copy is byte-identical either way, so no fact ever rides on a glyph', () => {
  const collect = (h) => DECORATED_IDS.flatMap((id) => {
    const out = [];
    const walk = (node) => {
      if (node.className === h.DIALOG_EMOJI_CLASS) return;
      if (node.children.length === 0) out.push(node.textContent);
      node.children.forEach(walk);
    };
    walk(h.dialogs[id]);
    return out;
  });
  const off = loadDialogEmojis({ toasts: 1 });
  off.applyDialogEmojis();
  const on = loadDialogEmojis({ toasts: 1, dialogEmojis: true });
  on.applyDialogEmojis();
  assert.ok(collect(off).length > 0, 'no text was collected, so this comparison would pass vacuously');
  assert.deepEqual(collect(on), collect(off),
    'turning the switch on changed a word somewhere -- the decoration is carrying meaning');
});

test('applyDialogEmojis reaches only its own declared surfaces and its own card', () => {
  const h = loadDialogEmojis({ toasts: 1, dialogEmojis: true });
  h.applyDialogEmojis();
  assert.deepEqual([...new Set(h.idsAsked)].sort(), [...DECORATED_IDS, 'dialog-emojis', 'dialog-emojis-status'].sort(),
    'applyDialogEmojis reached an element outside the surfaces it declares');
  assert.deepEqual([...new Set(h.selectorsAsked)], ['#toast-region .toast'],
    'applyDialogEmojis reached for a selector other than the message-box region');
});

test('the glyph is never written as markup', () => {
  assert.doesNotMatch(functionSource(app, 'setDialogDecoration'), /innerHTML/u,
    'setDialogDecoration now writes innerHTML, so a decoration could become markup');
});

test('every emoji in site/app.js is a declared decoration, so none is spliced into copy', () => {
  /* One writer is what makes the boundary above checkable at all. This looks for the
   * glyphs themselves rather than for the writer, because the defect it is really
   * guarding is an emoji typed straight into a string of copy or a control label, which
   * no assertion about setDialogDecoration could ever see. */
  const pictographic = /\p{Extended_Pictographic}/u;
  const bearing = app.split('\n').map((l) => l.trim()).filter((l) => pictographic.test(l));
  assert.ok(bearing.length > 0, 'no emoji found at all in site/app.js, so this would pass vacuously');
  const decorationRows = bearing.filter((l) => /^\{id:'[a-z-]+',within:'[^']*',glyph:'/u.test(l));
  const messageBoxRows = bearing.filter((l) => l.startsWith('const MESSAGE_BOX_GLYPH='));
  /* One pre-existing exception, pinned rather than waved through: the CLI-builder
   * destination in the DESTINATIONS table uses a keyboard glyph as its icon. It predates
   * this feature and is not a dialog decoration; an emoji smuggled into a second
   * destination row, or anywhere else, fails here. */
  const destinationIcons = bearing.filter((l) => /^\{id:'[a-z]+',name:'[^']+',icon:'/u.test(l));
  assert.equal(destinationIcons.length, 1,
    `expected exactly one pre-existing emoji destination icon, found ${destinationIcons.length}:\n${destinationIcons.join('\n')}`);
  assert.equal(messageBoxRows.length, 1, 'MESSAGE_BOX_GLYPH is not declared exactly once');
  const h = loadDialogEmojis();
  assert.equal(decorationRows.length, h.DIALOG_EMOJI_DECORATIONS.length,
    'the number of emoji-bearing decoration rows does not match the table the code actually reads');
  const accounted = decorationRows.length + messageBoxRows.length + destinationIcons.length;
  assert.equal(bearing.length, accounted,
    `an emoji appears in site/app.js outside the decoration table:\n${
      bearing.filter((l) => !decorationRows.includes(l) && !messageBoxRows.includes(l) && !destinationIcons.includes(l)).join('\n')}`);
});

/* ------------------------------------------------------------------ *
 * Message boxes: the new ones as well as the ones already on screen.
 * ------------------------------------------------------------------ */

test('a new message box is decorated as it is built, not only on the next applyState', () => {
  /* The signature gained a third argument on 2026-08-26, when the spoken narrator gave
   * every notification explicit per-language words to read. The decoration this test is
   * about is unchanged. */
  const line = app.split('\n').find((l) => /^\s*function notify\(title,body,narration\)\{/u.test(l));
  assert.ok(line, 'notify(title,body,narration) was not found as a single source line');
  assert.match(line, /setDialogDecoration\(toast,messageBoxGlyph\(\)\)/u,
    'notify no longer decorates the message box it just built');
  assert.match(line, /<div class="toast-text">/u,
    'the message box no longer wraps its text, so a decoration would sit above the title rather than beside it');
});

test('messageBoxGlyph returns the glyph only when the switch is on', () => {
  const on = loadDialogEmojis({ dialogEmojis: true });
  assert.equal(on.messageBoxGlyph(), on.MESSAGE_BOX_GLYPH);
  const off = loadDialogEmojis();
  assert.equal(off.messageBoxGlyph(), '');
});

/* ------------------------------------------------------------------ *
 * The surface: reachable, described, wired, and honest.
 * ------------------------------------------------------------------ */

test('the settings page carries a real, visibly labelled checkbox', () => {
  assert.match(settings, /<label><input id="dialog-emojis" type="checkbox"> Show emojis in dialogs and message boxes<\/label>/u,
    'the switch is missing, or its visible label is no longer the canonical wording');
  assert.match(settings, /<p id="dialog-emojis-status" role="status">/u,
    'the card no longer states what the switch is currently doing');
});

test('the switch is wired to the state, on a statement boundary rather than behind a comment', () => {
  /* A bare `dialog-emojis` needle is satisfied by a commented-out line, which is how a
   * wiring line usually dies. initSettings is one long line, so a line anchor cannot help
   * here; the call must sit at a statement boundary with no comment marker ahead of it. */
  const initSettingsSource = functionSource(app, 'initSettings');
  const marker = "if($('dialog-emojis'))$('dialog-emojis').onchange=event=>update('dialogEmojis',event.target.checked);";
  const at = initSettingsSource.indexOf(marker);
  assert.notEqual(at, -1, 'initSettings no longer wires the dialog-emoji checkbox to the stored setting');
  const ahead = initSettingsSource.slice(0, at);
  assert.match(ahead.slice(-1), /[;{]/u, 'the wiring is not a statement');
  assert.doesNotMatch(ahead.slice(ahead.lastIndexOf('\n') + 1), /\/\//u, 'the wiring sits behind a line comment');
  assert.match(app, /^\s*function applyState\(\)\{[^\n]*applyDialogEmojis\(\);/mu,
    'applyState no longer applies the decoration, so the switch would not survive a reload');
});

test('the checkbox and the status line are read back from the stored setting', () => {
  const h = loadDialogEmojis({ dialogEmojis: true });
  h.applyDialogEmojis();
  assert.equal(h.checkbox.checked, true, 'the checkbox does not reflect the stored setting after a reload');
  assert.match(h.status.textContent, /carry a decorative emoji/u);
  h.state.dialogEmojis = false;
  h.applyDialogEmojis();
  assert.equal(h.checkbox.checked, false);
  assert.match(h.status.textContent, /carry no emoji/u);
  assert.ok(h.status.textContent.includes(String(h.DIALOG_EMOJI_DECORATIONS.length)),
    'the off state does not say how many dialogs turning it on would decorate');
});

test('the status line names the boundary in the state where somebody is looking at it', () => {
  const h = loadDialogEmojis({ dialogEmojis: true });
  h.applyDialogEmojis();
  assert.match(h.status.textContent, /screen-reader name/u,
    'the on state stopped saying that no control text carries a glyph');
});

test('the card describes itself at every funny level in both languages, and every level keeps both facts', () => {
  const start = app.indexOf('dialogEmojisDesc:{en:[');
  assert.notEqual(start, -1, 'the dialog-emoji card has no funny-level copy of its own');
  const block = app.slice(start, app.indexOf(']},', app.indexOf('],zh:[', start)) + 3);
  const english = block.slice(0, block.indexOf('],zh:['));
  const cantonese = block.slice(block.indexOf('],zh:['));
  const levels = (chunk) => chunk.split('\n').filter((l) => /^\s+'/u.test(l));
  assert.equal(levels(english).length, 4, 'the English copy does not carry all four funny levels');
  assert.equal(levels(cantonese).length, 4, 'the Cantonese copy does not carry all four funny levels');
  for (const level of levels(english)) {
    assert.ok(level.includes('button'), `an English funny level stopped naming controls: ${level.trim().slice(0, 60)}`);
    assert.ok(level.includes('wording'), `an English funny level stopped saying the wording is unchanged: ${level.trim().slice(0, 60)}`);
  }
  for (const level of levels(cantonese)) {
    assert.ok(level.includes('按鈕'), `a Cantonese funny level stopped naming controls: ${level.trim().slice(0, 40)}`);
    assert.ok(level.includes('字句'), `a Cantonese funny level stopped saying the wording is unchanged: ${level.trim().slice(0, 40)}`);
  }
  assert.match(settings, /<p id="dialog-emojis-desc" data-copy="dialogEmojisDesc">/u,
    'the card description is not wired to the funny-level copy');
});

test('the card is findable from the settings search', () => {
  assert.match(settings, /data-search="dialog emoji emojis message box decoration heading icons"/u);
});

test('the reset gate names the switch among the things it clears', () => {
  const dialog = settings.match(/<p id="reset-confirm-text">([^<]*)<\/p>/u);
  assert.ok(dialog, 'settings.html no longer carries the reset confirmation text');
  assert.match(dialog[1], /dialog emoji/iu,
    'Reset settings now clears the dialog-emoji switch without saying so');
});

test('the decoration has a stylesheet rule, and the heading holds its shape without one', () => {
  /* Three flex children with `justify-content:space-between` and no `flex` on the heading
   * would push the title into the middle of the bar, so the switch would visibly move the
   * heading rather than only adding a glyph. */
  assert.match(css, /^\.dialog-emoji\{[^}]*flex:0 0 auto/mu, 'the decoration has no stylesheet rule of its own');
  assert.match(css, /^\.dialog-heading h2\{margin:0;flex:1 1 auto\}/mu,
    'the dialog heading no longer holds its own width, so a decoration would shift the title');
  assert.match(css, /^\.toast\{[^}]*display:flex/mu, 'the message box is not a flex row, so a decoration would sit above the title');
  assert.match(css, /^\.toast-text\{flex:1 1 auto/mu, 'the message box text wrapper has no rule');
});

/* ------------------------------------------------------------------ *
 * The registries say what the code does.
 * ------------------------------------------------------------------ */

test('the site feature registry carries a row for dialog-emojis', () => {
  assert.ok(registry.features['dialog-emojis'], 'no dialog-emojis row in site/feature-registry.json');
});

test('the registry records dialog-emojis as implemented, and names the files it lives in', () => {
  const row = registry.features['dialog-emojis'];
  assert.equal(row.status, 'implemented-unverified');
  assert.deepEqual([...row.implementation.paths].sort(), ['site/app.js', 'site/settings.html', 'site/styles.css'].sort());
  assert.match(row.note, /aria-hidden/u, 'the registry note does not record the accessible-name boundary');
});

test('the localization registry records the card copy rather than claiming untranslated coverage', () => {
  const row = locales.features['dialog-emojis'];
  assert.equal(row.state, 'localized');
  assert.deepEqual(row.copyKeys, ['dialogEmojisDesc']);
  assert.ok(locales.knownCopyKeys.includes('dialogEmojisDesc'),
    'dialogEmojisDesc is missing from the recorded COPY keys');
});
