/**
 * Contract: per-element-toy-locks. The honest state is "absent" -- no
 * per-element lock/unlock mechanism was found anywhere in site/app.js. The
 * "lock"-shaped substrings in the file ("blocks" in a TOML export helper,
 * "locked in" in a piece of playful search copy, and -- since the provider-
 * markup-rendering renderer landed -- "block"/"renderMarkdownBlock", which
 * are Markdown *block*-level parsing terminology and share nothing with a
 * lock mechanism) are all confirmed unrelated before trusting the absence
 * claim -- this file pins that they stay unrelated, not merely that "lock"
 * fails to appear as a whole word.
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

test('the only "lock"-containing substrings in app.js are unrelated: a TOML export block, a piece of search copy, and the Markdown block-parser naming', () => {
  const matches = [...app.matchAll(/\w*lock\w*/giu)].map((m) => m[0].toLowerCase());
  assert.ok(matches.length > 0, 'app.js no longer contains any "lock"-shaped substring at all, which would make the check below vacuous');
  for (const word of matches) {
    assert.ok(['blocks', 'block', 'locked', 'rendermarkdownblock'].includes(word), `an unexpected "lock"-shaped word "${word}" now appears in app.js -- a real lock mechanism may have been added`);
  }
});

test('there is no lock/unlock mechanism, no state.locks, and no wizard for it', () => {
  assert.doesNotMatch(app, /state\.locks|tryUnlock|lockWizard|unlockDialog/iu,
    'a real per-element lock mechanism now exists -- the "absent" state needs re-checking');
});

test('the registry records per-element-toy-locks as absent, and the code agrees', () => {
  assert.equal(registry.features['per-element-toy-locks'].state, 'absent',
    'no per-element lock/unlock mechanism exists anywhere in site/app.js -- "absent" is the honest state');
});
