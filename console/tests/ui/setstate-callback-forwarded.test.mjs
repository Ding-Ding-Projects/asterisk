/**
 * Contract: overriding setState must not eat React's completion callback.
 *
 * `App` replaces `setState` for the whole component so that a context menu opening near
 * an edge gets clamped back inside the viewport. That override is legitimate, but it
 * stands in front of React's real two-argument signature -- `setState(update, callback)`
 * -- and the first version of it took one argument.
 *
 * Nothing passed a callback at the time, which is precisely why this is worth pinning.
 * The failure it would eventually produce has no error, no stack, no failing test and
 * nothing to grep for: somebody writes the perfectly ordinary
 * `this.setState({ ... }, () => somethingAfterwards())`, the update lands, and the
 * callback simply never runs. That is a defect a reader diagnoses by suspecting React
 * before suspecting a line of this file they have no reason to know exists.
 *
 * A found-by-review defect, from the lane that added the override -- kept as a guard
 * rather than a memory, because the next person to touch that signature will not have
 * read the review.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'app', 'renderer', 'src', 'App.tsx');
/* Normalised: this is a CRLF checkout, and a pattern assuming one newline form matches
 * nothing here -- which for the negative assertion below would mean passing forever. */
const source = readFileSync(appPath, 'utf8').replace(/\r\n/gu, '\n');
const lines = source.split('\n');

/* Anchored to a line, never a bare substring: a substring needle is satisfied by a
 * commented-out declaration, and by a renamed symbol that still contains the old name. */
const lineDeclaring = (pattern) => lines.find((line) => pattern.test(line));

test('the override that stands in front of setState is actually there', () => {
  const declaration = lineDeclaring(/^\s*private boundedOverlaySetState\s*=/u);
  assert.ok(declaration, 'boundedOverlaySetState is gone; if the override was removed this guard should go too');
  const install = lineDeclaring(/^\s*this\.setState\s*=\s*this\.boundedOverlaySetState\s*;/u);
  assert.ok(install, 'the override is declared but never installed, so it governs nothing');
});

test('the override accepts a completion callback', () => {
  const declaration = lineDeclaring(/^\s*private boundedOverlaySetState\s*=/u);
  assert.match(
    declaration,
    /callback\?\s*:\s*\(\)\s*=>\s*void/u,
    'boundedOverlaySetState takes only the update, so React\'s second argument is silently discarded',
  );
});

test('every path through the override forwards that callback', () => {
  /* Both branches, not just the one a reader happens to scroll to: the clamped path is
   * the interesting one, and it is also the one that returns early. */
  const forwarding = lines.filter((line) => /this\.baseSetState\(/u.test(line));
  assert.ok(forwarding.length >= 2, `expected the clamped and unclamped paths, found ${forwarding.length}`);
  for (const line of forwarding) {
    assert.match(line, /,\s*callback\s*\)/u, `a path calls baseSetState without forwarding the callback: ${line.trim()}`);
  }
});

test('the stored reference it forwards to is typed to accept one', () => {
  const field = lineDeclaring(/^\s*private readonly baseSetState\s*:/u);
  assert.ok(field, 'baseSetState field declaration is gone');
  assert.match(field, /callback\?\s*:\s*\(\)\s*=>\s*void/u, 'baseSetState is typed one-argument, so forwarding would not type-check');

  const bind = lineDeclaring(/^\s*this\.baseSetState\s*=\s*this\.setState\.bind/u);
  assert.ok(bind, 'baseSetState is never bound to the real setState');
  assert.match(bind, /callback\?\s*:\s*\(\)\s*=>\s*void/u, 'the bind casts away the callback parameter, which reintroduces the defect at the cast');
});
