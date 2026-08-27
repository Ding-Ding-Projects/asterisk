/**
 * Contract: app-logo-customization. Real for upload, bounds, and clear;
 * absent for editing and presets. `site/app.js`'s `loadLogo()` genuinely
 * rejects a file over 128 KiB, rejects anything outside `image/png`,
 * `image/jpeg`, or `image/svg+xml`, reads the accepted file as a data URL,
 * and stores it in `localStorage` -- local-only, "No data was transmitted."
 * `applyLogo()` genuinely swaps every `.brand-mark`'s image, and the
 * settings page's `logo-clear` button removes the cache and restores the
 * default mark.
 *
 * What does not exist: no crop/fit/focal-point editor, no background-colour
 * control, no multi-size generation, and no shipped preset gallery -- there is
 * exactly one custom-upload slot and nothing else.
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

test('the site feature registry carries a row for app-logo-customization', () => {
  assert.ok(registry.features['app-logo-customization'], 'no app-logo-customization row in site/feature-registry.json');
});

test('loadLogo genuinely bounds file size and allowlists MIME type before accepting anything', () => {
  // site/app.js is minified onto single lines, so loadLogo's whole body is one
  // line -- match on the exact function signature plus its two guard clauses
  // directly rather than trying to isolate a multi-line function body.
  assert.match(app, /async function loadLogo\(event\)\{/u, 'expected to find loadLogo as a real function');
  /* The rejection reason moved behind rejectLogo() on 2026-08-26, when the spoken
   * narrator gave every rejection one writer -- the status line it shows is the same
   * string, and the same writer now also speaks it. The bound itself is unchanged. */
  assert.match(app, /if\(file\.size>131072\)\{rejectLogo\('file exceeds 128 KiB\.'\);return\}/u,
    'the 128 KiB size bound no longer matches');
  assert.match(app, /function rejectLogo\(reason\)\{\s*\$\('logo-status'\)\.textContent=`Rejected: \$\{reason\}`;/u,
    'the logo rejection no longer writes its reason to the status line beside the control');
  assert.ok(app.includes(String.raw`if(!/^image\/(png|jpeg|svg\+xml)$/.test(file.type))`),
    'the MIME allowlist no longer matches');
});

test('the accepted file is stored locally with an honest "no data transmitted" status, never uploaded', () => {
  /* Through `writeLocal` since in-context recovery landed, which is the one writer every
   * store on this page now goes through so a browser refusing the write is reported
   * rather than thrown past. The property this pins is unchanged and is still exact: the
   * accepted image goes to that one local key and nowhere else. */
  assert.match(app, /writeLocal\('ding-pbx-logo-cache',dataUrl\)/u, 'the logo cache is no longer stored in localStorage');
  assert.match(app, /function writeLocal\(key,value\)\{\s*try\{localStorage\.setItem\(key,String\(value\)\)/u,
    'writeLocal no longer writes to localStorage, so the line above no longer proves the image is stored locally');
  assert.match(app, /No data was transmitted\./u, 'the local-only disclosure copy no longer appears');
  // Bounded to one statement (no crossing a `;`) rather than an unbounded `.*`: this
  // file is minified enough that whole unrelated functions share one physical line,
  // so an unbounded run here matches straight through neighbouring, unrelated code
  // that happens to contain both words -- exactly what happened when the word
  // "Uploaded" (in a settings-export confirmation, describing local-only vocabulary,
  // not a network call) landed on the same line as the later logo-clear wiring.
  assert.doesNotMatch(app, /fetch\([^)]*logo|upload[^;]*logo/iu, 'the logo now appears to be sent over the network -- re-check the local-only claim');
});

test('applyLogo genuinely swaps every .brand-mark image element, and clearing removes the cache', () => {
  assert.match(app, /all\('\.brand-mark'\)\.forEach\(el=>\{/u, 'applyLogo no longer iterates every .brand-mark element');
  /* The handler moved into a named `clearLogo` when in-context recovery landed, because
   * two things clear the mark now: this button, and the recovery route raised when an
   * image is refused. Both halves are checked -- that the button is wired to it, and
   * that it is the thing that removes the cache -- so a button wired to a function that
   * no longer clears anything cannot pass either half. */
  assert.match(app, /\$\('logo-clear'\)\.onclick=clearLogo;/u, 'the logo-clear button is no longer wired to clearLogo');
  assert.match(app, /function clearLogo\(\)\{\s*localStorage\.removeItem\('ding-pbx-logo-cache'\);/u,
    'the logo-clear handler no longer removes the cached logo');
});

test('there is no crop/fit/background editor and no shipped preset gallery -- one upload slot, nothing else', () => {
  assert.doesNotMatch(app, /logo-crop|logo-fit|logo-preset|logo-background/iu,
    'a crop/fit/preset editor now exists for the logo -- update this row');
});

test('the registry records app-logo-customization as partial', () => {
  assert.equal(registry.features['app-logo-customization'].status, 'partial',
    'a real, bounded, local-only upload and clear path exists, but no editor or preset gallery exists behind it');
});
