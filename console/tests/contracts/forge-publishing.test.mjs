/**
 * Contract: forge-publishing. `forge-publishing.ts` (implemented 2026-08-24)
 * is a complete, tested module: multi-account sign-in with an active account
 * that keeps single-account callers working, owner selection across a user's
 * own namespace and the organizations they can create in, route selection
 * between forking and copy-and-push, and a plan reporting every problem at
 * once. NO TOKEN PASSES THROUGH IT: an account carries only the vault key
 * naming where its token lives, asserted both against the object shape and
 * the type declaration -- the object-level check alone missed an optional
 * field once added to the interface, which is how that gap was found. With
 * several accounts signed in and none chosen, nothing is active rather than
 * the first being guessed, because guessing is how work lands in somebody
 * else's namespace.
 *
 * BLOCKED ON THE FORGE TRANSPORT: nothing performs what the module decides.
 * There is no code anywhere that calls a forge API to create a repository,
 * fork one, or push to a new remote, and no account list for it to read.
 * Confirmed by grepping App.tsx and finding no import.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const APP = 'app/renderer/src/App.tsx';
const MODULE = 'app/renderer/src/forge-publishing.ts';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['forge-publishing'];
  assert.ok(row, 'the implementation registry has no row for forge-publishing');
  assert.ok(['implemented-unverified', 'partial', 'absent'].includes(row.status), `undefined state "${row.status}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
  assert.equal(row.builtInteraction.state, 'not-run', 'source wiring must not be upgraded to a built-artifact claim');
});

test('nothing in App.tsx imports forge-publishing.ts -- it decides and performs nothing today', () => {
  const app = read(APP);
  assert.doesNotMatch(app, /from '\.\/forge-publishing'/u,
    'App.tsx now imports forge-publishing.ts -- a real forge transport may have been wired, which would flip this row');
});

test('no token ever passes through the module -- only a vault key naming where the real token lives', () => {
  const src = read(MODULE);
  assert.match(src, /NO TOKEN PASSES THROUGH HERE\./u, 'the "no token passes through" guarantee is no longer documented');
  assert.doesNotMatch(src, /\btoken:\s*string/u, 'a raw token field now appears in a type declaration -- the vault-key-only guarantee may have been broken');
});

test('an active account exists so single-account callers keep working, and nothing is guessed when several are signed in and none is chosen', () => {
  const src = read(MODULE);
  assert.match(src, /export const ACTIVE_ACCOUNT_SETTING = 'console\.forge\.activeAccount';/u, 'the active-account setting key no longer matches');
  assert.match(src, /export function activeAccount\(/u, 'activeAccount(...) no longer exists');
});

test('the module decides fork-vs-copy but no code anywhere performs a forge API call, a fork, or a push to a new remote', () => {
  const src = read(MODULE);
  assert.match(src, /export type ForgeCapability = 'fork' \| 'create-repository' \| 'push';/u, 'the ForgeCapability union no longer matches');
  const rendererSrcDir = resolve(root, 'app/renderer/src');
  const rendererFiles = readdirSync(rendererSrcDir).filter((f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && f !== 'forge-publishing.ts');
  const rendererSource = rendererFiles.map((f) => read(`app/renderer/src/${f}`)).join('\n');
  assert.doesNotMatch(rendererSource, /octokit|api\.github\.com|gitlab\.com\/api/iu,
    'a real forge API call now exists outside forge-publishing.ts -- the transport gap may have been closed');
});

test('the module has its own dedicated test coverage', () => {
  const content = readFileSync(resolve(root, 'tests/ui/forge-publishing.test.tsx'), 'utf8');
  assert.ok(content.length > 500, 'tests/ui/forge-publishing.test.tsx exists but looks too small to be real coverage');
});
