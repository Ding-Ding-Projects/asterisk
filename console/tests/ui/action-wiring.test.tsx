/**
 * Guards the two roadmap items this pass closed:
 *
 *  1. `runtime.stop`, `runtime.remove`, and every `local-history.*` action are now
 *     reached from a real screen, not merely implemented in `control-plane/dispatch.ts`
 *     and dispatched nowhere.
 *  2. `server.connect` remains reachable from the interface (`App.discover`) --
 *     the roadmap once asked to "remove or gate" it as unreached, but it was already
 *     called from `discover()` before this pass began; this is the regression guard
 *     that decision names, proving the call site rather than merely asserting intent.
 *
 * Every assertion here is anchored to the real call shape (`this.request('<action>'`,
 * with the real quoting and, where it matters, the real argument), never to a bare
 * substring -- a prose mention of the same action name inside a comment uses backticks
 * (`` `local-history.record` ``), not the single-quoted string literal a real call site
 * uses, so a guard anchored this way cannot be satisfied by documentation alone. Every
 * one of these assertions was broken on purpose, watched red, and restored -- see the
 * task's own report for the individual break/restore pairs.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appUrl = new URL('../../app/renderer/src/App.tsx', import.meta.url);
const pbxAdminAppUrl = new URL('../../app/renderer/src/PbxAdminApp.tsx', import.meta.url);
const runtimeUrl = new URL('../../app/renderer/src/runtime.ts', import.meta.url);

async function source(url: URL): Promise<string> {
  // CRLF-safe: several files in this checkout are CRLF, and a pattern spanning lines
  // (none of these do, but stripping is cheap insurance against the next one that will).
  return (await readFile(url, 'utf8')).replace(/\r\n/g, '\n');
}

test('server.connect is still called from the interface -- item 2 kept it reachable rather than removing it', async () => {
  const app = await source(appUrl);
  const calls = app.match(/this\.request\('server\.connect'/g) ?? [];
  assert.ok(calls.length >= 1, 'server.connect is no longer called anywhere in App.tsx; if it was deliberately removed, delete this guard and drop the action from shared/control-plane.ts + dispatch.ts too');
});

test('runtime.stop is called from a real handler, not merely dispatched', async () => {
  const app = await source(appUrl);
  assert.match(app, /this\.request\('runtime\.stop'\)/u, "no call site invokes 'runtime.stop'");
  assert.match(app, /canStopRuntime\(this\.runtime\)/u, 'runtime.stop is not gated by canStopRuntime, so a control offering it could be shown when nothing is registered to stop');
});

test('runtime.remove is called with the distribution to remove, not bare', async () => {
  const app = await source(appUrl);
  assert.match(
    app,
    /this\.request\('runtime\.remove',\s*\{\s*serverId:\s*distribution\s*\}\)/u,
    "runtime.remove was not called with an explicit serverId -- the dispatcher reads request.serverId, and an omitted one refuses every removal",
  );
  assert.match(app, /canRecoverRuntime\(this\.runtime\)/u, 'runtime.remove is not gated by canRecoverRuntime, so it could be offered when removal is not the fix for the current state');
  assert.match(app, /this\.areYouSure\(\s*\n?\s*`Remove \$\{distribution\}`/u, 'removing the runtime is irreversible and must go through the destructive-action confirmation gate');
});

test('every local-history.* action is called from App.tsx, not only implemented in the dispatcher', async () => {
  const app = await source(appUrl);
  assert.match(app, /this\.request\('local-history\.list',/u, "no call site invokes 'local-history.list'");
  assert.ok(
    (app.match(/this\.request\('local-history\.record',/g) ?? []).length >= 2,
    "'local-history.record' should be reached from both the runtime-stop and runtime-remove handlers -- found fewer than 2 call sites",
  );
  assert.match(app, /this\.request\('local-history\.restore',/u, "no call site invokes 'local-history.restore'");
});

test('the local-history screen is registered at module load, not merely defined and never wired in', async () => {
  const app = await source(appUrl);
  assert.match(app, /^registerLocalHistoryScreen\(\);$/mu, 'registerLocalHistoryScreen() is not called at module scope in App.tsx');
});

test('onControlAction routes every new action to its real handler', async () => {
  const app = await source(appUrl);
  const routes: Array<[string, RegExp]> = [
    ["'runtime-stop'", /if \(action === 'runtime-stop'\) \{ void this\.stopRuntime\(\); return; \}/u],
    ["'runtime-remove'", /if \(action === 'runtime-remove'\) \{ this\.removeRuntime\(\); return; \}/u],
    ["'local-history-refresh'", /if \(action === 'local-history-refresh'\) \{ void this\.refreshLocalHistory\(true\); return; \}/u],
    ["'local-history-restore'", /if \(action === 'local-history-restore'\) \{ this\.restoreLocalHistory\(\); return; \}/u],
  ];
  for (const [label, pattern] of routes) {
    assert.match(app, pattern, `onControlAction has no route for ${label}`);
  }
});

test('PbxAdminApp forwards the picked control and its selected value to the base handler on both fallback paths, rather than dropping them', async () => {
  const pbxAdminApp = await source(pbxAdminAppUrl);
  // Anchored to the real forwarding call (three arguments), never to the bare substring
  // "appControlAction(action)" -- that substring is also a prefix of the correct call,
  // so a needle that only checked for its presence would pass even after a regression
  // reintroduced the truncated one-argument form alongside it.
  const forwardingCalls = pbxAdminApp.match(/this\.appControlAction\(action, _control, selected\);/g) ?? [];
  assert.equal(
    forwardingCalls.length,
    2,
    'expected exactly 2 fallback call sites (the no-PBX-Admin-context early return, and the switch default) to forward (action, _control, selected); found ' + forwardingCalls.length,
  );
  assert.doesNotMatch(
    pbxAdminApp,
    /this\.appControlAction\(action\);/u,
    'a fallback call site still drops _control/selected, which breaks any base-class action (like local-history-filter) that reads the just-picked option rather than racing this.state',
  );
});

test('canStopRuntime exists as its own exported, independently gated helper', async () => {
  const runtime = await source(runtimeUrl);
  assert.match(runtime, /export function canStopRuntime\(/u);
});
