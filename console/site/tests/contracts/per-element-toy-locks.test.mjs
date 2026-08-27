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
/* `authclocknote` joined the unrelated bucket on 2026-08-26 with the built-in
 * authenticator: it is the sentence saying this page cannot tell you your CLOCK is
 * wrong, and the substring is the tail of that word rather than anything to do with
 * locking a control. Worth naming rather than widening the pattern -- a scan that
 * stopped matching "clock" would also stop matching a real `clockLock`. */
const UNRELATED_LOCK_WORDS = ['blocks', 'block', 'rendermarkdownblock', 'authclocknote'];
const RESTRICTED_PRESENTATION_LOCK_WORDS = [
  'lock', 'locked', 'lockout', 'clock',
  'unlock', 'unlockcontrols', 'unlockschoolmode', 'schoolunlockverdict',
];
/* A third bucket, added when the right-click menu landed. `locks` reaches app.js only
 * inside the string "per-element-toy-locks" -- this row's own id, quoted back in the
 * reason the menu gives for the one command it can never run. A word scan cannot tell
 * a citation of the gap from the arrival of the mechanism, so the property tests below
 * carry that weight and this bucket exists purely so the scan stops reporting the
 * citation as a finding. */
const REGISTRY_ROW_LOCK_WORDS = ['locks'];

test('every "lock"-shaped substring in app.js belongs either to unrelated wording, to the one page-level mode, or to this row\'s own id -- never to a per-element mechanism', () => {
  const matches = [...app.matchAll(/\w*lock\w*/giu)].map((m) => m[0].toLowerCase());
  assert.ok(matches.length > 0, 'app.js no longer contains any "lock"-shaped substring at all, which would make the check below vacuous');
  const allowed = [...UNRELATED_LOCK_WORDS, ...RESTRICTED_PRESENTATION_LOCK_WORDS, ...REGISTRY_ROW_LOCK_WORDS];
  for (const word of matches) {
    assert.ok(allowed.includes(word), `an unexpected "lock"-shaped word "${word}" now appears in app.js -- a per-element lock mechanism may have been added`);
  }
});

test('the only "locks" in app.js is this row\'s own id, quoted inside the menu\'s reason -- not an identifier', () => {
  /* The bucket above is only safe while that is true. If `locks` ever turns up as a
   * variable, a property or a storage key, the scan would wave it through on the
   * strength of a citation that no longer exists. */
  /* Not `\w*locks\w*`: that pattern matches "blocks" too, and this file's first bucket is
   * full of them. What is wanted is "locks" that is not the tail of a longer English word,
   * which for this file means the one preceded by the hyphen in the row's own id. */
  const occurrences = [...app.matchAll(/locks/gu)].filter((m) => !/[A-Za-z]/u.test(app[m.index - 1] ?? ''));
  assert.ok(occurrences.length > 0, 'no standalone "locks" occurrence found at all, so this would pass vacuously');
  const citations = [...app.matchAll(/per-element-toy-locks/gu)];
  assert.equal(occurrences.length, citations.length,
    `${occurrences.length} standalone "locks" occurrences but only ${citations.length} citations of the registry row -- one of them is something else`);
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

/**
 * Re-derived by hand on 2026-08-26, exactly as the assertion this replaces asked the
 * next person to do.
 *
 * A context menu now exists, and it does offer "Lock this element…" from every element's
 * own menu -- because the canonical contract asks every menu for that item, and a menu
 * that quietly left it out would look complete while being one item short. What it does
 * NOT do is lock anything: the entry is permanently unavailable and its reason names
 * this registry row.
 *
 * So the claim worth checking has moved. It is no longer "the command does not exist"
 * -- it does. It is "the command can never run", which is a stronger property than the
 * old absence and is the one that would break if somebody wired a real mechanism to it.
 */
test('the menu offers the canonical lock command and it can never run: no page, element or state can make it available', () => {
  assert.match(app, /\{id:'lock-element',label:'Lock this element…',chord:null,kinds:'any',/u,
    'the menu no longer offers the canonical per-element lock command at all');
  /* Zero-argument, so it cannot consult anything. An `unavailable:ctx=>` here would mean
   * some condition makes it available, and the whole claim would need re-deriving again. */
  assert.match(app, /\{id:'lock-element'[\s\S]{0,120}?unavailable:\(\)=>'this site ships no per-element lock: per-element-toy-locks is recorded absent in site\/feature-registry\.json'/u,
    'the lock entry no longer refuses unconditionally, or no longer names the registry row that records why');
  assert.match(app, /\{id:'lock-element'[\s\S]{0,400}?run:\(\)=>\{\}\}/u,
    'the lock entry now has a body -- something would happen if it could be activated');
});

test('an unavailable menu item cannot be activated, by click or by chord', () => {
  /* The other half of the same claim. A permanently-unavailable entry is only honest
   * while nothing will run it, and there are exactly two routes in. */
  assert.match(app, /function activateContextMenuItem\(id\)\{[\s\S]{0,200}?if\(!item\|\|!item\.enabled\)return;/u,
    'activating a menu item no longer refuses a disabled one');
  assert.match(app, /function chordIsLive\(item,menuState\)\{\s*if\(!item\|\|!item\.enabled\)return false;/u,
    'a shortcut no longer refuses to fire a disabled item');
});

test('there is no lock/unlock mechanism, no state.locks, and no wizard for it', () => {
  assert.doesNotMatch(app, /state\.locks|tryUnlock|lockWizard|unlockDialog/iu,
    'a real per-element lock mechanism now exists -- the "absent" state needs re-checking');
});

test('the registry records per-element-toy-locks as absent, and the code agrees', () => {
  assert.equal(registry.features['per-element-toy-locks'].status, 'absent',
    'no per-element lock/unlock mechanism exists anywhere in site/app.js -- "absent" is the honest state');
});
