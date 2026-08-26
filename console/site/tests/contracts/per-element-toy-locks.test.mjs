/**
 * Contract: per-element-toy-locks. The honest state is "absent" -- no PER-ELEMENT
 * lock/unlock mechanism exists anywhere in site/app.js.
 *
 * The word scan below used to carry the whole weight of that claim, and it no longer
 * can. Since the restricted presentation landed, this site does have one lock: a single
 * page-level mode with a single credential. That is a different feature with its own
 * contract in school-mode.test.mjs, and letting the two blur in either direction would
 * be wrong -- so this file now checks the property that actually separates them.
 *
 * A per-element lock is per element: a "Lock this element..." command reachable from an
 * element's own menu, one credential per locked element, and a record keyed by element.
 * None of that exists. What exists is one switch, one credential, one fixed record, over
 * the whole page's presentation. The tests below pin the count and the keying rather
 * than the spelling, and keep the word scan beside them as a cheap tripwire for a
 * mechanism arriving under some third name.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for per-element-toy-locks', () => {
  assert.ok(registry.features['per-element-toy-locks'], 'no per-element-toy-locks row in site/feature-registry.json');
});

/* Two buckets, deliberately kept apart. The first is genuinely nothing to do with
 * locks. The second belongs to the page-level restricted presentation, which IS a real
 * lock and is allowed to exist -- it has its own contract in school-mode.test.mjs. A
 * word in neither bucket means some third mechanism arrived under a name nobody here
 * chose, which is exactly what this scan is cheap enough to be worth keeping for. */
const UNRELATED_LOCK_WORDS = ['blocks', 'block', 'rendermarkdownblock'];
const RESTRICTED_PRESENTATION_LOCK_WORDS = [
  'lock', 'locked', 'lockout', 'clock',
  'unlock', 'unlockcontrols', 'unlockschoolmode', 'schoolunlockverdict',
];

test('every "lock"-shaped substring in app.js belongs either to unrelated wording or to the one page-level mode -- never to a per-element mechanism', () => {
  const matches = [...app.matchAll(/\w*lock\w*/giu)].map((m) => m[0].toLowerCase());
  assert.ok(matches.length > 0, 'app.js no longer contains any "lock"-shaped substring at all, which would make the check below vacuous');
  const allowed = [...UNRELATED_LOCK_WORDS, ...RESTRICTED_PRESENTATION_LOCK_WORDS];
  for (const word of matches) {
    assert.ok(allowed.includes(word), `an unexpected "lock"-shaped word "${word}" now appears in app.js -- a per-element lock mechanism may have been added`);
  }
});

test('the site holds exactly one credential record, and it is keyed by nothing -- not by an element', () => {
  /* The distinguishing property, and the one a word scan cannot see. A per-element lock
   * needs a credential per element, which means a map or a key built from the element.
   * Every storage key here is a fixed literal, and every credential read goes through
   * the one record's own `.secret` rather than a lookup. */
  const keys = [...app.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\('([^']+)'\)/gu)].map((m) => m[1]);
  assert.ok(keys.length > 0, 'no localStorage keys were found at all, so this would pass vacuously');
  const built = [...app.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(`([^`]*)`\)/gu)];
  assert.deepEqual(built.map((m) => m[0]), [],
    'a storage key is now built from a template rather than being a fixed literal -- a per-element keyed record may exist');
  const secretReads = [...app.matchAll(/\.secret\b/gu)];
  assert.ok(secretReads.length > 0, 'no credential reads were found, so this would pass vacuously');
  assert.doesNotMatch(app, /secrets\[|secretFor\(|lockFor\(|locksBy/u,
    'a credential is now looked up by something -- a per-element lock may have been added');
});

test('no element offers a lock command of its own, and there is no menu to offer it from', () => {
  assert.doesNotMatch(app, /Lock this element/iu, 'the canonical per-element lock command now exists');
  assert.doesNotMatch(app, /contextmenu/iu,
    'a context menu now exists -- the per-element lock command would be reachable from it, so re-derive this contract by hand');
});

test('there is no lock/unlock mechanism, no state.locks, and no wizard for it', () => {
  assert.doesNotMatch(app, /state\.locks|tryUnlock|lockWizard|unlockDialog/iu,
    'a real per-element lock mechanism now exists -- the "absent" state needs re-checking');
});

test('the registry records per-element-toy-locks as absent, and the code agrees', () => {
  assert.equal(registry.features['per-element-toy-locks'].state, 'absent',
    'no per-element lock/unlock mechanism exists anywhere in site/app.js -- "absent" is the honest state');
});
