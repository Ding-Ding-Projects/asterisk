/**
 * No menu item may claim work it does not do.
 *
 * An audit of this design found thirty items whose entire handler was a toast or a
 * notification saying "Diff copied", "Group exported", "Branch created from the current
 * commit", "Mirror push queued". Each is a sentence about something that never happened,
 * and each was indistinguishable, to the person clicking it, from a control that worked.
 *
 * This refuses the shape. An item that genuinely cannot do its thing yet is listed below
 * with the reason, so it is a decision somebody wrote down rather than a gap somebody
 * missed -- and the list is checked in both directions, so a name that has since been
 * fixed cannot sit here pretending to still be broken.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const design = readFileSync(new URL('../../../design/Asterisk Console M3.dc.html', import.meta.url), 'utf8');

/* A menu item whose whole run handler is a toast or a fire. Deliberately narrow: it looks
 * for the announce IMMEDIATELY after the arrow, so an item that does real work and then
 * reports it -- which is what every fixed one now does -- is not caught. */
const ANNOUNCE_ONLY = /label:'([^']*)'[^}]*?run:\(\) => .{0,14}this\.(?:toast|fire)\(/g;

/**
 * Items still announcing, each with why, and what it is waiting on.
 *
 * These are not excused. They are the remaining work, written down where it cannot be
 * forgotten, and every one of them still tells the person something untrue today.
 */
const STILL_ANNOUNCING = new Map([
  ['Commit now', 'needs a git write through the control plane; ceremony only reaches pbx.command, which is the Asterisk CLI'],
  ['New branch', 'needs a git write, and a name to give the branch'],
  ['Tag this state', 'needs a git write through the control plane'],
  ['Push to mirror', 'needs a git write and a configured mirror, neither of which exists yet'],
  ['Export bundle', 'needs git bundle through the control plane, not a renderer download'],
  ['Revert just this option', 'needs a per-option revert the configuration writer cannot do yet'],
  ['Branch from here', 'needs a git write through the control plane'],
  ['Lock every tab in group', 'needs the per-element lock wizard to accept a whole group'],
  ['Restore last session', 'needs the tab session to be persisted first; nothing writes it yet'],
  ['Group tabs by area', 'needs the tab model to accept a bulk regroup'],
  ['Whole word only', 'needs the table search to carry a whole-word option'],
  ['Duplicate step', 'needs the dialplan canvas to accept an inserted node'],
  ['Insert condition before', 'needs the dialplan canvas to accept an inserted node'],
  ['Export', 'the bulk-selection Export shares a label with the appearance Export; it needs the selection model to produce rows'],
]);

test('no menu item announces work it has not done', () => {
  const found = [...design.matchAll(ANNOUNCE_ONLY)].map((match) => match[1]);
  const unexpected = found.filter((label) => !STILL_ANNOUNCING.has(label));
  assert.deepEqual(unexpected, [],
    `these controls claim work they do not do, and are not recorded as known: ${unexpected.join(', ')}`);
});

test('the known list stays honest as items are fixed', () => {
  /* Otherwise it becomes a place stale names accumulate, and the count of outstanding work
   * quietly overstates itself -- which is the same dishonesty in the other direction. */
  const found = new Set([...design.matchAll(ANNOUNCE_ONLY)].map((match) => match[1]));
  const fixed = [...STILL_ANNOUNCING.keys()].filter((label) => !found.has(label));
  assert.deepEqual(fixed, [],
    `these are listed as still announcing but no longer are; remove them from the list: ${fixed.join(', ')}`);
});

test('every known item says what it is waiting on', () => {
  for (const [label, reason] of STILL_ANNOUNCING) {
    assert.ok(reason.length > 20, `${label} has no real reason recorded`);
  }
});

test('the fixed items reach a real effect rather than a message', () => {
  /* The fourteen that were converted all route through one hook, so this checks the route
   * exists rather than fourteen separate handlers. */
  const routed = [...design.matchAll(/this\.hostAction\('([a-z-]+)'/g)].map((match) => match[1]);
  assert.ok(routed.length >= 14, `only ${routed.length} controls route to a real action`);
  for (const kind of ['copy', 'export-json', 'import-json', 'save']) {
    assert.ok(routed.includes(kind), `nothing routes to ${kind}`);
  }
});
