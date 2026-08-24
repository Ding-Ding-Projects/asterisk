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
  ['Commit now', 'the config history is timestamped backup files, not git -- ConfigHistory runs no git at all, and the screen shows /etc/asterisk/.git, which does not exist. A manual commit has nothing to commit to'],
  ['New branch', 'no git repository exists for /etc/asterisk; the app-side LocalHistory that IS git is append-only by design and has no branch operation'],
  ['Tag this state', 'same: no repository for /etc/asterisk, and LocalHistory records rather than tags. The nearest real thing is a named restore point in the backup list'],
  ['Export bundle', 'a git bundle of a repository that does not exist. The backups it would really be exporting are files, so an archive of those is the honest equivalent'],
  ['Revert just this option', 'restore replaces a whole file from a backup; there is no per-option revert, and inventing one means diffing and rewriting a single key inside a live config'],
  ['Branch from here', 'same as New branch: no repository, and the history that is git is append-only'],
  ['Lock every tab in group', 'needs the per-element lock wizard to accept a whole group'],
  ['Duplicate step', 'needs the dialplan canvas to accept an inserted node'],
  ['Insert condition before', 'needs the dialplan canvas to accept an inserted node'],
]);

/* The same shape, hiding behind a confirmation. This was a real blind spot: "Delete step"
 * opened a genuine three-second destructive gate and then only fired a message, so the gate
 * guarded nothing and the person was told their dialplan had changed when it had not. A
 * decorative destructive control is worse than a decorative ordinary one -- they go looking
 * for the thing later and find it exactly where they left it. */
const CONFIRMED_ANNOUNCE_ONLY = /label:'([^']*)'[^}]{0,200}?areYouSure\([^)]*?,\s*\(\) => this\.(?:fire|toast)\(/g;

/* And the same shape one indirection further out. bulk(verb, sel) clears the selection and
 * fires a message, so every control calling it announced work and did none -- and the guard
 * above could not see them, because it looks for the announce straight after the arrow.
 * Following the helper is the difference between a guard and a decoration. */
const BULK_ANNOUNCE_ONLY = /label:'([^']*)'[^}]{0,120}?this\.bulk\(/g;

const BULK_STILL_ANNOUNCING = new Map([
  ['Enable', 'enabling an endpoint is a write to a live Asterisk configuration, and no path exists for it yet'],
  ['Disable', 'same as Enable: it needs a configuration write that does not exist'],
  ['Duplicate', 'duplicating a row means writing a new section into a live configuration file'],
]);

test('a bulk action does something, or is recorded as not doing it', () => {
  const found = [...design.matchAll(BULK_ANNOUNCE_ONLY)].map((match) => match[1]);
  const unexpected = found.filter((label) => !BULK_STILL_ANNOUNCING.has(label));
  assert.deepEqual(unexpected, [],
    `these bulk actions clear the selection and claim work they did not do: ${unexpected.join(', ')}`);
});

test('the bulk list stays honest too', () => {
  const found = new Set([...design.matchAll(BULK_ANNOUNCE_ONLY)].map((match) => match[1]));
  const fixed = [...BULK_STILL_ANNOUNCING.keys()].filter((label) => !found.has(label));
  assert.deepEqual(fixed, [], `no longer announcing, so remove from the list: ${fixed.join(', ')}`);
});

test('a confirmation runs something, rather than only reporting', () => {
  const found = [...design.matchAll(CONFIRMED_ANNOUNCE_ONLY)].map((match) => match[1]);
  assert.deepEqual(found, [],
    `these confirmations guard nothing and report success anyway: ${found.join(', ')}`);
});

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

test('a removed step is actually dropped from what the canvas draws', () => {
  /* The delete handler records the removal; something has to honour it. Wired at one end
   * and consumed at neither is how a fix ships looking correct and changing nothing -- and
   * here it would restore the exact lie the fix was written to remove, silently. */
  assert.match(design, /NODES\.filter\(n => \(s\.removedNodes \|\| \[\]\)\.indexOf\(n\.id\) < 0\)/,
    'the node list draws removed steps');
  /* And the connections go with it, because that is what the confirmation promises. Lines
   * running to a step that is no longer there would be worse than not deleting at all. */
  assert.match(design, /edges:s\.edgeList\.filter\(\(\[a, b\]\) => \(s\.removedNodes \|\| \[\]\)\.indexOf\(a\) < 0 && \(s\.removedNodes \|\| \[\]\)\.indexOf\(b\) < 0\)/,
    'edges survive the step they connect to');
});
