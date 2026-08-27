/**
 * Every configuration screen is in the binding inventory, or says it is not.
 *
 * `unmappedControls` answered from a hand-written table and returned an empty list for a
 * screen the table had never heard of. The comment above it claimed that kept a control
 * "never wrongly reported as mapped"; it did the exact opposite, because the caller warns
 * only when the list is non-empty, so silence and "everything is bound" were the same
 * answer.
 *
 * Three screens were missing -- HTTP server, feature codes, IAX peers, forty-four controls
 * between them. Every one of those controls wrote local state only, and the screen said
 * nothing at all, so they read as MORE finished than the screens being honest about their
 * gaps. That is the worst possible direction for the error to point.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { isUninventoried, unmappedControls } from '../../app/renderer/src/control-keys.ts';

const keys = readFileSync(new URL('../../app/renderer/src/control-keys.ts', import.meta.url), 'utf8');
const design = readFileSync(new URL('../../../design/Asterisk Console M3.dc.html', import.meta.url), 'utf8');

/** Screens that edit a real Asterisk file, from the design's own destination table. */
function configScreens() {
  const found = [];
  for (const match of design.matchAll(/^ {2}(\w+):\{ rail:'(?:pbx|media|data|sys)'[^\n]*file:'([^']+)'/gm)) {
    /* A destination whose "file" is a live command rather than a path edits nothing, so it
     * has no bindings to be missing. */
    if (/^[a-z -]+$/u.test(match[2]) && !match[2].includes('.')) continue;
    /* The canvas edits the dialplan through nodes and edges rather than a control list, so
     * a control inventory is the wrong shape for it and its absence is not a gap. */
    if (match[1] === 'canvas') continue;
    found.push(match[1]);
  }
  return found;
}

test('every screen that edits a configuration file is in the inventory', () => {
  const missing = configScreens().filter((id) => !keys.includes(`\n  ${id}: [`));
  assert.deepEqual(missing, [],
    `these screens edit a real file and are absent from SCREEN_CONTROL_IDS, so they report nothing unbound and read as fully wired: ${missing.join(', ')}`);
});

test('an uninventoried screen is a distinct answer, not an empty list', () => {
  /* The distinction is the whole fix. An empty array means "nothing left to bind"; this
   * means "nobody has looked", and the two must not be the same value. */
  /* Asserted by CALLING it, not by reading its source. A source check passes while the
   * behaviour reverts -- proved by breaking it on purpose: swapping the distinct answer back
   * to an empty array left every source assertion green and restored the exact defect. */
  assert.match(keys, /export const UNKNOWN_SCREEN/, 'there is no distinct uninventoried answer');
  assert.match(keys, /export function isUninventoried/, 'nothing can tell the two apart');
  const answer = unmappedControls('a-screen-nobody-has-inventoried');
  assert.equal(isUninventoried(answer), true, 'an unknown screen does not answer as uninventoried');
  assert.notDeepEqual(answer, [], 'an unknown screen answers with an empty list again, which reads as fully bound');
  /* And a known screen must NOT answer that way, or everything would look uninventoried. */
  assert.equal(isUninventoried(unmappedControls('endpoints')), false, 'a known screen reports as uninventoried');
});

test('the caller tells somebody, rather than saying nothing', () => {
  const app = readFileSync(new URL('../../app/renderer/src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /isUninventoried\(unmapped\)/,
    'App does not distinguish an uninventoried screen, so it will say nothing again');
  assert.match(app, /None of the controls on this screen are bound to it yet/,
    'there is no honest message for an uninventoried screen');
});

test('the comment no longer claims the property it does not have', () => {
  /* It asserted that an unknown control is "never wrongly reported as mapped", which was
   * false and was believed -- including by me, reading it. A comment that invents a
   * guarantee removes the check that would have caught the defect, and it does so
   * specifically for the careful reader who took it at its word. */
  /* The sentence survives once, quoted inside the correction that replaced it, so the check
   * is that it appears exactly there and not as a live claim anywhere else. */
  const claims = keys.match(/never wrongly reported as mapped/g) ?? [];
  assert.equal(claims.length, 1, 'the inverted safety claim appears somewhere other than its own correction');
  assert.match(keys, /That was backwards/, 'the correction that explains it has been dropped');
});
