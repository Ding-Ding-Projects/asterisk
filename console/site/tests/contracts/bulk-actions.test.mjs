/**
 * Contract: bulk actions on the pages-site.
 *
 * bulkClick/bulkSelectAll/planBulk/summariseBulk in site/app.js are pure functions
 * (ported from app/renderer/src/bulk.ts) with no DOM dependency, so this file does not
 * merely check for their presence -- it extracts their real source text by matching
 * braces (never a lazy multi-line regex) and actually RUNS them, asserting the real
 * shift-range-select, ctrl-toggle, page-vs-every-match selection, and reviewable
 * affected/skipped preview behaviour that a genuine bulk-action contract requires.
 *
 * It also pins the honest scope: these functions are wired to exactly one surface on
 * the site -- the notification history panel. The documentation destination list and
 * the settings page have no multi-select of their own. That is recorded here as a fact
 * rather than left to be discovered again.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const norm = (s) => s.replace(/\r\n/g, '\n');

function extractFunction(src, name) {
  const marker = `function ${name}(`;
  const start = src.indexOf(marker);
  assert.ok(start !== -1, `function ${name} not found in site/app.js`);
  /* The parameter list can itself contain a brace (a default value like
   * `options={}`), so the body's real opening brace is found by first matching the
   * parameter list's own parentheses to their close, THEN looking for the next `{`. */
  let parenDepth = 0, argEnd = src.indexOf('(', start);
  for (let j = argEnd; j < src.length; j += 1) {
    if (src[j] === '(') parenDepth += 1;
    else if (src[j] === ')') { parenDepth -= 1; if (parenDepth === 0) { argEnd = j; break; } }
  }
  const braceStart = src.indexOf('{', argEnd);
  let depth = 0, i = braceStart;
  for (; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') { depth -= 1; if (depth === 0) { i += 1; break; } }
  }
  return src.slice(start, i);
}

function loadBulkModel() {
  const src = norm(read('site/app.js'));
  const parts = ['bulkClick', 'bulkSelectAll', 'planBulk', 'summariseBulk'].map((name) => extractFunction(src, name));
  const body = `${parts.join('\n')}\nreturn { bulkClick, bulkSelectAll, planBulk, summariseBulk };`;
  return new Function(body)(); // eslint-disable-line no-new-func -- deliberately re-running the real extracted source
}

test('bulkClick with the ctrl modifier toggles one id in and out of the selection', () => {
  const { bulkClick } = loadBulkModel();
  const ordered = ['a', 'b', 'c', 'd'];
  let state = { anchor: undefined, selected: new Set() };
  state = bulkClick(state, 'b', { ctrl: true, shift: false }, ordered);
  assert.deepEqual([...state.selected], ['b']);
  state = bulkClick(state, 'b', { ctrl: true, shift: false }, ordered);
  assert.deepEqual([...state.selected], [], 'a second ctrl-click on the same id should remove it again');
});

test('bulkClick with the shift modifier selects the real contiguous range from the anchor', () => {
  const { bulkClick } = loadBulkModel();
  const ordered = ['a', 'b', 'c', 'd', 'e'];
  let state = { anchor: undefined, selected: new Set() };
  state = bulkClick(state, 'b', { ctrl: false, shift: false }, ordered); // sets anchor
  state = bulkClick(state, 'd', { ctrl: false, shift: true }, ordered); // range b..d
  assert.deepEqual([...state.selected].sort(), ['b', 'c', 'd']);
});

test('a plain click (no modifiers) replaces the selection with exactly the clicked id', () => {
  const { bulkClick } = loadBulkModel();
  const ordered = ['a', 'b', 'c'];
  let state = { anchor: 'a', selected: new Set(['a', 'b', 'c']) };
  state = bulkClick(state, 'c', { ctrl: false, shift: false }, ordered);
  assert.deepEqual([...state.selected], ['c']);
  assert.equal(state.anchor, 'c');
});

test('bulkSelectAll distinguishes "this page" from "every match", by real different arguments', () => {
  const { bulkSelectAll } = loadBulkModel();
  const page = ['a', 'b'];
  const matches = ['a', 'b', 'c', 'd', 'e'];
  const start = { anchor: undefined, selected: new Set() };
  const pageResult = bulkSelectAll(start, 'page', page, matches);
  assert.deepEqual([...pageResult.state.selected].sort(), ['a', 'b']);
  assert.equal(pageResult.count, 2);
  const matchesResult = bulkSelectAll(start, 'matches', page, matches);
  assert.deepEqual([...matchesResult.state.selected].sort(), ['a', 'b', 'c', 'd', 'e']);
  assert.equal(matchesResult.count, 5);
});

test('planBulk produces a real reviewable affected/skipped split, never a blind "all succeeded"', () => {
  const { planBulk } = loadBulkModel();
  const selected = [1, 2, 3];
  const plan = planBulk('Dismiss', selected, (item) => (item === 2 ? 'locked' : true), { destructive: true });
  assert.deepEqual(plan.affected, [1, 3]);
  assert.deepEqual(plan.skipped, [{ item: 2, reason: 'locked' }]);
  assert.equal(plan.destructive, true);
});

test('summariseBulk states a destructive action cannot be undone and names the skip reason', () => {
  const { planBulk, summariseBulk } = loadBulkModel();
  const plan = planBulk('Dismiss', [1, 2, 3], (item) => (item === 2 ? 'locked' : true), { destructive: true });
  const summary = summariseBulk(plan);
  assert.match(summary, /Dismiss: 2 of 3 selected will change/);
  assert.match(summary, /1 skipped \(locked\)/);
  assert.match(summary, /This cannot be undone\./);
});

test('summariseBulk reports "nothing selected" honestly rather than a misleading zero-of-zero', () => {
  const { planBulk, summariseBulk } = loadBulkModel();
  const plan = planBulk('Dismiss', [], () => true, {});
  assert.equal(summariseBulk(plan), 'Dismiss: nothing selected.');
});

/**
 * Every list on this site somebody would want to act on in bulk, and the state object
 * each one selects through.
 *
 * A table rather than one hand-written block per surface. It reached three on
 * 2026-08-26 with the element locks, and the shape of the interesting failure has not
 * changed: a FOURTH list arriving with its own hand-rolled selection instead of this
 * shared model, which reads as working right up to the day one of them is fixed and
 * the others are not.
 */
const BULK_SURFACES = [
  { init: 'initNotificationBulk', state: 'notifSelection', verb: 'Dismiss', what: 'the notification panel' },
  { init: 'initAuthenticator', state: 'authSelection', verb: 'Remove', what: 'the authenticator list' },
  { init: 'initLocks', state: 'lockSelection', verb: 'Remove', what: 'the element-lock list' },
];

/** The source of one `function name(){...}`, brace-counted so nesting survives. */
function bodyOf(src, name) {
  const start = src.indexOf(`function ${name}(){`);
  assert.notEqual(start, -1, `${name}() not found`);
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') { depth -= 1; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error(`${name}() is not brace-balanced`);
}

test('the bulk model is wired to every listed surface, and to nothing beside them', () => {
  const src = norm(read('site/app.js'));
  const surfaces = BULK_SURFACES.length;
  assert.ok(surfaces > 0, 'no bulk surfaces are listed at all, so everything below would pass vacuously');
  /* Two calls of bulkSelectAll per surface -- select-this-page and select-every-match --
   * and one each of the rest. Derived from the table so adding a surface moves the
   * arithmetic with it, rather than leaving four numbers to be edited by hand. */
  for (const [name, per] of [['bulkClick', 1], ['bulkSelectAll', 2], ['planBulk', 1], ['summariseBulk', 1]]) {
    const total = src.split(`${name}(`).length - 1;
    const def = src.split(`function ${name}(`).length - 1;
    assert.equal(def, 1, `expected exactly one definition of ${name}`);
    assert.equal(total - def, per * surfaces,
      `${name} is now called ${total - def} time(s) outside its own definition, expected ${per * surfaces} for ${surfaces} listed surfaces -- if this grew, bulk actions may have reached a surface this table has not been told about`);
  }
  for (const surface of BULK_SURFACES) {
    const body = bodyOf(src, surface.init);
    for (const call of [
      `bulkClick(${surface.state}`,
      `bulkSelectAll(${surface.state},'page'`,
      `bulkSelectAll(${surface.state},'matches'`,
      `planBulk('${surface.verb}'`,
    ]) {
      assert.ok(body.includes(call),
        `${surface.init}() no longer calls ${call} -- the bulk model may be disconnected from ${surface.what}`);
    }
  }
});

test('the element-lock list exposes the same real select-page, select-matches, select-none and remove controls', () => {
  const html = norm(read('site/settings.html'));
  for (const id of ['locks-select-page', 'locks-select-matches', 'locks-select-none', 'locks-remove-selected', 'locks-confirm-yes', 'locks-confirm-cancel']) {
    assert.match(html, new RegExp(`id="${id}"`), `#${id} control not found on the element-locks card`);
  }
  assert.match(html, /id="locks-confirm-text"/, 'the reviewable confirm-preview element (#locks-confirm-text) is missing');
});

test('the element-lock removal reports what it skipped and why, rather than silently dropping it', () => {
  /* The one place on this site where a bulk action genuinely refuses part of what was
   * selected: a lock that has not been opened is not removable, because a removal that
   * ignored the lock would be the way around every lock at once. */
  const { planBulk, summariseBulk } = loadBulkModel();
  const src = norm(read('site/app.js'));
  assert.match(src, /planBulk\('Remove',\[\.\.\.lockSelection\.selected\],lockRemovalVerdict,\{destructive:true\}\)/u,
    'the lock removal no longer passes its per-item verdict to planBulk, so nothing could be skipped for a reason');
  assert.match(src, /function lockRemovalVerdict\(key\)\{[\s\S]{0,400}?open it first/u,
    'the lock removal verdict no longer names opening the lock as what is missing');
  const plan = planBulk('Remove', ['open', 'shut'], (key) => (key === 'open' ? true : 'that element is still locked'));
  assert.deepEqual(plan.affected, ['open']);
  assert.match(summariseBulk(plan), /1 skipped \(that element is still locked\)/u,
    'the summary no longer names the reason a selected lock was skipped');
});

test('the authenticator account list exposes the same real select-page, select-matches, select-none and remove controls', () => {
  const html = norm(read('site/settings.html'));
  for (const id of ['auth-select-page', 'auth-select-matches', 'auth-select-none', 'auth-remove-selected', 'auth-confirm-yes', 'auth-confirm-cancel']) {
    assert.match(html, new RegExp(`id="${id}"`), `#${id} control not found on the authenticator card`);
  }
  assert.match(html, /id="auth-confirm-text"/, 'the reviewable confirm-preview element (#auth-confirm-text) is missing');
});

test('the notification history panel exposes real select-page, select-matches, select-none and dismiss controls', () => {
  const html = norm(read('site/index.html'));
  for (const id of ['notif-select-page', 'notif-select-matches', 'notif-select-none', 'notif-dismiss-selected', 'notif-confirm-yes', 'notif-confirm-cancel']) {
    assert.match(html, new RegExp(`id="${id}"`), `#${id} control not found on the notification dialog`);
  }
  assert.match(html, /id="notif-confirm-text"/, 'the reviewable confirm-preview element (#notif-confirm-text) is missing');
});
