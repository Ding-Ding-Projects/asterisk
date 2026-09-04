import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  DEEP_LINK_HOST,
  DEEP_LINK_MAX_EDGE,
  DEEP_LINK_MIN_HEIGHT,
  DEEP_LINK_MIN_WIDTH,
  DEEP_LINK_SCHEME,
  deepLinkFor,
  firstDeepLinkInArgv,
  parseDeepLink,
  resolveDeepLinkDestination,
} from '../../shared/deep-link.ts';

/**
 * The `ding-pbx://` product route.
 *
 * Every one of the 32 audited destinations has carried a `builtRoute` in
 * `design-reference/capture-manifest.generated.json` since that manifest was generated, and
 * for as long as it has existed nothing read one. The inventory said so in as many words --
 * `captureContract.builtRouteStatus`: "a committed route template only; no custom protocol
 * handler is registered". These are the tests for the reader that makes it a route.
 *
 * The refusals matter more than the acceptances here, and that is why most of this file is
 * refusals. A route that accepts `theme=light` and renders dark, or accepts `scale=2` and
 * changes nothing, is worse than one that never existed: it reports success and does
 * something else, and nothing anywhere would ever say so.
 */

const inRepo = (relative: string) => resolve(import.meta.dirname, '..', '..', relative);

function accepted(url: string) {
  const parsed = parseDeepLink(url);
  assert.equal(parsed.ok, true, `expected '${url}' to be accepted, refused with: ${parsed.ok ? '' : parsed.reason}`);
  assert.ok(parsed.ok);
  return parsed.target;
}

function refused(url: unknown): string {
  const parsed = parseDeepLink(url);
  assert.equal(parsed.ok, false, `expected '${String(url)}' to be refused, and it was accepted`);
  assert.ok(!parsed.ok);
  return parsed.reason;
}

test('the canonical route parses into the exact capture tuple it names', () => {
  const target = accepted('ding-pbx://destination/dash?state=default&theme=dark&width=1440&height=1000&scale=1');
  assert.deepEqual(target, { destinationId: 'dash', state: 'default', theme: 'dark', width: 1440, height: 1000, scale: 1 });
});

test('a bare route defaults to the capture tuple rather than refusing', () => {
  assert.deepEqual(accepted('ding-pbx://destination/cdr'), {
    destinationId: 'cdr', state: 'default', theme: 'dark', width: 1440, height: 1000, scale: 1,
  });
});

test('the scheme and the authority are case-insensitive but the destination is not', () => {
  assert.equal(accepted('DING-PBX://Destination/cdr').destinationId, 'cdr');
  assert.match(refused('ding-pbx://destination/CDR'), /not a destination name this console recognises/u);
});

test('another scheme is refused by name', () => {
  assert.match(refused('https://destination/dash'), /only opens ding-pbx:\/\/ links.*'https' link/u);
});

test('the two-slash form is required, and the schemeless-authority form says which', () => {
  assert.match(refused('ding-pbx:destination/dash'), /needs two slashes after the scheme/u);
});

test('an authority this scheme does not define is refused rather than guessed at', () => {
  assert.match(refused('ding-pbx://settings/dash'), /'settings' is not something this console can open/u);
});

test('a link naming no destination, or more than one path segment, is refused', () => {
  assert.match(refused('ding-pbx://destination/'), /names no destination/u);
  assert.match(refused('ding-pbx://destination/dash/rows'), /names exactly one, with nothing after it/u);
});

test('a destination name that is not a catalogue-shaped id is refused', () => {
  for (const bad of ['9dash', 'da_sh', 'da-sh', 'dash!']) {
    assert.match(refused(`ding-pbx://destination/${encodeURIComponent(bad)}`), /is not a destination name/u, bad);
  }
  /* `..` is refused a step earlier and for a different reason, which is worth pinning
   * rather than folding into the loop above: URL parsing resolves a dot segment away
   * before this module ever sees it, so the link arrives naming no destination at all
   * rather than naming a badly-shaped one. */
  assert.match(refused('ding-pbx://destination/..'), /names no destination/u);
});

test('a percent-encoded path separator cannot smuggle a second segment past the check', () => {
  // `%2F` decodes to '/' after URL parsing, so decoding before the check is what makes the
  // single-segment rule mean anything.
  assert.match(refused('ding-pbx://destination/dash%2Frows'), /names exactly one, with nothing after it/u);
});

test('the light theme is refused, and the refusal says this build has no light theme', () => {
  const reason = refused('ding-pbx://destination/dash?theme=light');
  assert.match(reason, /only a dark theme/u);
});

test('a theme this console has never had is refused separately from light', () => {
  assert.match(refused('ding-pbx://destination/dash?theme=solarized'), /'solarized' is not a theme this console has/u);
});

test('a scale other than 1 is refused, because a window cannot set its display scale factor', () => {
  assert.match(refused('ding-pbx://destination/dash?scale=2'), /device scale factor and cannot be set by a link/u);
});

test('a state other than default is refused', () => {
  assert.match(refused('ding-pbx://destination/dash?state=empty'), /default state only.*'empty'/u);
});

test('a size below the window own minimum is refused rather than silently widened', () => {
  assert.match(refused(`ding-pbx://destination/dash?width=${DEEP_LINK_MIN_WIDTH - 1}`), /'width' must be at least 920/u);
  assert.match(refused(`ding-pbx://destination/dash?height=${DEEP_LINK_MIN_HEIGHT - 1}`), /'height' must be at least 640/u);
  assert.equal(accepted(`ding-pbx://destination/dash?width=${DEEP_LINK_MIN_WIDTH}&height=${DEEP_LINK_MIN_HEIGHT}`).width, DEEP_LINK_MIN_WIDTH);
});

test('an absurd or non-integer size is refused', () => {
  assert.match(refused(`ding-pbx://destination/dash?width=${DEEP_LINK_MAX_EDGE + 1}`), /must be at most 8192/u);
  assert.match(refused('ding-pbx://destination/dash?width=1440.5'), /whole number of pixels/u);
  assert.match(refused('ding-pbx://destination/dash?width=wide'), /whole number of pixels/u);
});

test('something that is not a string at all is refused rather than coerced', () => {
  assert.match(refused(undefined), /non-empty string/u);
  assert.match(refused(42), /non-empty string/u);
  assert.match(refused('   '), /non-empty string/u);
  assert.match(refused('not a url'), /is not a URL this console can read/u);
});

test('membership is checked against a real catalogue, and is a separate decision', () => {
  const target = accepted('ding-pbx://destination/nowhere');
  assert.deepEqual(resolveDeepLinkDestination(target, ['dash', 'cdr']), {
    ok: false, reason: "This console has no screen called 'nowhere', so the link could not be opened.",
  });
  assert.deepEqual(resolveDeepLinkDestination(accepted('ding-pbx://destination/cdr'), ['dash', 'cdr']), { ok: true, destinationId: 'cdr' });
});

test('a link is found anywhere on a command line, and the first one wins', () => {
  assert.equal(firstDeepLinkInArgv(['C:\\app\\Ding.exe', '--allow-file-access', 'ding-pbx://destination/cdr']), 'ding-pbx://destination/cdr');
  assert.equal(firstDeepLinkInArgv(['exe', 'DING-PBX://destination/a', 'ding-pbx://destination/b']), 'DING-PBX://destination/a');
  assert.equal(firstDeepLinkInArgv(['C:\\app\\Ding.exe', '--squirrel-firstrun']), undefined);
  assert.equal(firstDeepLinkInArgv([]), undefined);
  // argv is what an operating system assembled, so a non-string entry must not throw.
  assert.equal(firstDeepLinkInArgv([undefined, null, 7]), undefined);
});

test('deepLinkFor builds a route this parser accepts, round trip', () => {
  const built = deepLinkFor('appearance');
  assert.equal(built, `${DEEP_LINK_SCHEME}://${DEEP_LINK_HOST}/appearance?state=default&theme=dark&width=1440&height=1000&scale=1`);
  assert.equal(accepted(built).destinationId, 'appearance');
});

/**
 * The check that holds the manifest's `builtRoute` column and this reader together.
 *
 * The manifest generates that column from `inventories/design-parity.json`'s own
 * `evidenceTemplates.builtRoute`, not from `deepLinkFor` -- deliberately, so the two are
 * independent and this test is a real comparison rather than a function agreeing with
 * itself. If the template ever drifts into something the application cannot open, every
 * row goes red here rather than the manifest quietly going back to naming an address
 * nothing answers.
 */
test('every product route in the capture manifest is one the application accepts', () => {
  const manifest = JSON.parse(readFileSync(inRepo('design-reference/capture-manifest.generated.json'), 'utf8')) as {
    destinationCount: number;
    destinations: Array<{ id: string; builtRoute: string }>;
  };
  assert.equal(manifest.destinations.length, manifest.destinationCount);
  assert.ok(manifest.destinations.length >= 32, `expected the 32 audited destinations, got ${manifest.destinations.length}`);
  for (const row of manifest.destinations) {
    const parsed = parseDeepLink(row.builtRoute);
    assert.ok(parsed.ok, `${row.id}: the manifest's product route is one this console refuses -- ${parsed.ok ? '' : parsed.reason}`);
    assert.equal(parsed.target.destinationId, row.id, `${row.id}: the route opens '${parsed.target.destinationId}' instead`);
  }
});

test('every product route in the manifest names a destination this build actually renders', () => {
  const manifest = JSON.parse(readFileSync(inRepo('design-reference/capture-manifest.generated.json'), 'utf8')) as {
    destinations: Array<{ id: string; builtRoute: string }>;
  };
  /* Read out of the compiled renderer's own catalogue rather than a list restated here: a
   * copy of the ids kept in this file would agree with itself forever while the catalogue
   * moved underneath it. The `ORDER` array is one line of generated source, so it is read
   * as text rather than by importing a module full of JSX into a node test. */
  const compiled = readFileSync(inRepo('app/renderer/src/generated/console.tsx'), 'utf8');
  const order = /^const ORDER = \[([^\]]*)\];/mu.exec(compiled);
  assert.ok(order, 'the compiled renderer no longer declares a single-line ORDER array; this check cannot read the catalogue');
  const ids = [...order[1].matchAll(/'([^']+)'/gu)].map((match) => match[1]);
  assert.ok(ids.length >= 32, `expected a real catalogue, read ${ids.length} ids`);
  for (const row of manifest.destinations) {
    assert.ok(ids.includes(row.id), `${row.id}: the manifest names a destination the compiled renderer does not have`);
  }
});
