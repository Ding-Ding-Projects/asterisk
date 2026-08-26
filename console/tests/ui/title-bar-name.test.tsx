/**
 * The structural rewrite that gives the compiled title bar's static app-name text a
 * live value, without touching the generated file it is baked into.
 *
 * The risk this file exists to catch is precision, not detection: the drag region also
 * contains a connection pill with its own two plain-string spans (`pbx-hq · AMI 5038`,
 * `up 14d 06:22`) and a literal `·` separator span, none of them carrying the `msym`
 * icon class either. An early version of this rewrite matched "any non-icon span with a
 * plain string child" anywhere in the whole drag region and would have overwritten the
 * connection label along with the app name -- caught only by building the drag region's
 * real shape here, with that pill included, rather than a stripped-down tree that
 * happens not to exercise the mistake.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { withTitleBarName } from '../../app/renderer/src/title-bar-name.ts';

const SHIPPED_NAME = 'Material Asterisk';

/** The drag region's real shape: icon-and-name row, menu strip, connection pill,
 *  window controls -- built with plain `createElement`, the same element shape the
 *  compiled design's own `h()` calls produce. */
function realWindow(nameText: string = SHIPPED_NAME) {
  return createElement('div', { style: { height: '100%' } },
    createElement('div', { 'data-window-drag': '' },
      createElement('div', { className: 'icon-row' },
        createElement('span', { className: 'msym' }, 'deployed_code'),
        createElement('span', {}, nameText),
      ),
      createElement('div', { className: 'menus' },
        createElement('button', {}, 'File'),
        createElement('button', {}, 'Edit'),
      ),
      createElement('div', { className: 'conn' },
        createElement('button', {},
          createElement('span', {}),
          createElement('span', {}, 'pbx-hq · AMI 5038'),
          createElement('span', {}, '·'),
          createElement('span', {}, 'up 14d 06:22'),
        ),
      ),
      createElement('div', { className: 'right' },
        createElement('button', {}, createElement('span', { className: 'msym' }, 'remove')),
        createElement('button', {}, createElement('span', { className: 'msym' }, 'crop_square')),
        createElement('button', {}, createElement('span', { className: 'msym' }, 'close')),
      ),
    ),
  );
}

const text = (node: unknown) => renderToStaticMarkup(node as never)
  .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

test('the shipped name in the icon row becomes the chosen name', () => {
  const rewritten = withTitleBarName(realWindow(), 'Reception');
  const rendered = text(rewritten);
  assert.ok(rendered.includes('Reception'), `expected "Reception" in: ${rendered}`);
  assert.equal(rendered.includes(SHIPPED_NAME), false, `shipped name should be gone: ${rendered}`);
});

test('the icon itself is untouched', () => {
  const rendered = text(withTitleBarName(realWindow(), 'Reception'));
  assert.ok(rendered.includes('deployed_code'));
});

/**
 * The precision guard. Proved by breaking it on purpose: replacing the icon-row-only
 * targeting with the earlier "any non-icon span in the whole drag region" search made
 * this fail with the connection pill overwritten by the chosen name -- restoring the
 * icon-row scoping in title-bar-name.ts turns it back green.
 */
test('the connection pill and its separator are never touched', () => {
  const rendered = text(withTitleBarName(realWindow(), 'Reception'));
  assert.ok(rendered.includes('pbx-hq · AMI 5038'), `connection label was altered: ${rendered}`);
  assert.ok(rendered.includes('up 14d 06:22'), `connection uptime was altered: ${rendered}`);
  /* Exactly one "Reception" -- the pill spans must not also have been rewritten to it. */
  assert.equal((rendered.match(/Reception/gu) ?? []).length, 1, `expected exactly one match: ${rendered}`);
});

test('the window-control icons (also lone msym spans) are never touched', () => {
  const rendered = text(withTitleBarName(realWindow(), 'Reception'));
  for (const icon of ['remove', 'crop_square', 'close']) {
    assert.ok(rendered.includes(icon), `window control icon "${icon}" was altered: ${rendered}`);
  }
});

test('the menu strip is never touched', () => {
  const rendered = text(withTitleBarName(realWindow(), 'Reception'));
  assert.ok(rendered.includes('File'));
  assert.ok(rendered.includes('Edit'));
});

test('a tree with no drag-region marker is returned unchanged rather than guessed at', () => {
  const noMarker = createElement('div', {},
    createElement('span', { className: 'msym' }, 'deployed_code'),
    createElement('span', {}, SHIPPED_NAME),
  );
  const rewritten = withTitleBarName(noMarker, 'Reception');
  assert.equal(text(rewritten), text(noMarker));
  assert.ok(text(rewritten).includes(SHIPPED_NAME));
});

test('an already vocabulary-substituted shipped name is still found and replaced', () => {
  /* The rewrite cannot key off the literal shipped-name string, because a personal
   * vocabulary file is free to have already changed it to something else by the time
   * this runs. It has to work by structure regardless of current text. */
  const rewritten = withTitleBarName(realWindow('個人助理'), 'Reception');
  const rendered = text(rewritten);
  assert.ok(rendered.includes('Reception'));
  assert.equal(rendered.includes('個人助理'), false);
});

test('a plain string tree (no element at all) is returned unchanged', () => {
  assert.equal(withTitleBarName('just text' as never, 'Reception'), 'just text');
});

/**
 * `React.cloneElement(node, config, singleValue)` and `React.cloneElement(node, config,
 * ...manyValues)` are different calls -- the first never marks the array `singleValue`
 * happens to be as a list of literal, static children, so React treats every item
 * inside it exactly as it would treat an unkeyed `.map()` result. The compiled shell
 * always renders the rewritten drag region as one of several siblings in a real array
 * (the top-level list of screens, dialogs and overlays `Template()` returns), so this
 * reproduces that exact shape rather than rendering the rewritten tree alone, which
 * would never exercise the array-context check that actually fires the warning.
 *
 * Proved by breaking it on purpose: passing `rewritten`/`next` straight to
 * `cloneElement` instead of through `cloneWithChildren`'s array-spread turns this red
 * with real "Each child in a list should have a unique key" console.error calls;
 * restoring the spread turns it back green.
 */
test('rewriting the title bar name never reports a missing-key warning when the result sits in a real sibling array', () => {
  const original = console.error;
  const warnings: string[] = [];
  console.error = ((...args: unknown[]) => {
    const message = String(args[0] ?? '');
    if (message.includes('key')) warnings.push(message);
    else original(...(args as []));
  }) as typeof console.error;
  try {
    const rewritten = withTitleBarName(realWindow(), 'Reception');
    /* The real siblings a compiled shell surrounds the drag region with: other
     * top-level nodes and a couple of `null`s from closed dialogs, exactly like
     * `Template()`'s own conditional overlay children. */
    const siblingArray = createElement('div', null,
      rewritten,
      createElement('div', {}, 'sibling one'),
      null,
      createElement('div', {}, 'sibling two'),
    );
    renderToStaticMarkup(siblingArray);
  } finally {
    console.error = original;
  }
  assert.deepEqual(warnings, [], `expected no missing-key warnings, got: ${warnings.join(' | ')}`);
});
