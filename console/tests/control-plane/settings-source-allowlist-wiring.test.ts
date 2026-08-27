/**
 * The wiring this whole feature was missing: does the PRODUCTION construction path --
 * the exact shape `app/electron/main.ts` uses, with `allowedSettingsSourceHosts` left
 * unset -- actually thread a persisted allowlist through to `SettingsSourceFetcher`?
 *
 * Every other settings-source test either injects `allowedSettingsSourceHosts` directly
 * (proving the fetcher's own logic) or constructs a dispatcher with no settings.json to
 * read at all (proving the safe empty default). Neither proves the thing that was
 * actually broken: that a host a person persists through the allowlist screen is the
 * host `main.ts`'s own dispatcher construction ends up using. A test that supplies the
 * allowlist itself would repeat exactly the mistake this file exists to catch.
 *
 * These tests write `settings.json` by hand, in the exact shape `SettingsRegistry`
 * writes it in (a flat `{ key: string }` snapshot, with the allowlist value itself a
 * JSON-encoded array string -- what `serializeAllowlist` produces and what the
 * renderer's `storage.setItem(SETTINGS_SOURCE_ALLOWLIST_KEY, ...)` persists through
 * `settings.write`), then construct `createControlPlaneDispatcher` with only the options
 * `main.ts` actually passes: `userDataPath`, `resourcesPath`, `hosted`, and a token
 * reader. No `allowedSettingsSourceHosts`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createControlPlaneDispatcher } from '../../control-plane/dispatch.js';
import { SETTINGS_SOURCE_ALLOWLIST_KEY, serializeAllowlist } from '../../control-plane/settings-source-allowlist.js';

/** Writes settings.json exactly as `SettingsRegistry`/`FileSettingsStore` would: a flat
 *  map of string keys to string values, the allowlist entry itself JSON-encoded. */
function seedPersistedAllowlist(userDataPath: string, hosts: readonly string[]): void {
  const snapshot: Record<string, string> = { [SETTINGS_SOURCE_ALLOWLIST_KEY]: serializeAllowlist(hosts) };
  writeFileSync(join(userDataPath, 'settings.json'), JSON.stringify(snapshot, null, 2));
}

/** Exactly the options `app/electron/main.ts` passes to `createControlPlaneDispatcher` --
 *  no `allowedSettingsSourceHosts` -- so a passing test here is a claim about the real
 *  startup path, not about a shape no real caller uses. */
function productionShapedDispatcher(userDataPath: string) {
  return createControlPlaneDispatcher({
    userDataPath,
    resourcesPath: userDataPath,
    hosted: true,
    readSettingsSourceToken: async () => undefined,
  });
}

/** A real loopback HTTP server, because the point of this file is to prove an actual
 *  network request is made once the persisted host is threaded through -- a stubbed
 *  fetch would only prove the stub was called, not that the real host reached it. */
async function withLoopbackServer<T>(
  respond: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void,
  run: (port: number) => Promise<T>,
): Promise<T> {
  const server = createServer(respond);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  try {
    return await run(port);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('the production construction path fetches a host persisted through the allowlist screen', () =>
  withLoopbackServer(
    (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ lang_mode: 'en' }));
    },
    async (port) => {
      const userDataPath = mkdtempSync(join(tmpdir(), 'ding-allowlist-wired-'));
      /* This is the step the whole feature was missing: a host actually ends up in
       * settings.json, exactly as the renderer's "Allow this host" control would leave
       * it. */
      seedPersistedAllowlist(userDataPath, ['127.0.0.1']);

      const dispatcher = productionShapedDispatcher(userDataPath);
      const response = await dispatcher.controlPlaneRequest({
        requestId: 'r1', action: 'settings.source.fetch',
        payload: { url: `http://127.0.0.1:${port}/x` },
      });

      assert.equal(response.ok, true, response.ok === false ? response.message : 'unexpectedly refused');
      const data = response.ok ? (response.data as { status: number; body: string }) : undefined;
      assert.equal(data?.status, 200);
      assert.deepEqual(data ? JSON.parse(data.body) : undefined, { lang_mode: 'en' });
    },
  ));

test('a host never persisted is refused by the production construction path', async () => {
  const userDataPath = mkdtempSync(join(tmpdir(), 'ding-allowlist-wired-'));
  seedPersistedAllowlist(userDataPath, ['some-other-host.example.net']);

  const dispatcher = productionShapedDispatcher(userDataPath);
  const response = await dispatcher.controlPlaneRequest({
    requestId: 'r1', action: 'settings.source.fetch',
    payload: { url: 'http://127.0.0.1:1/x' },
  });

  assert.equal(response.ok, false);
  assert.match(response.ok === false ? response.message : '', /not an allowed source host/u);
});

test('a host removed from the persisted allowlist is refused again on the next construction', async () => {
  await withLoopbackServer(
    (_req, res) => { res.writeHead(200); res.end('{}'); },
    async (port) => {
      const userDataPath = mkdtempSync(join(tmpdir(), 'ding-allowlist-wired-'));

      // First: the host is allowed, and a fresh dispatcher (the shape a relaunch takes)
      // can reach it.
      seedPersistedAllowlist(userDataPath, ['127.0.0.1']);
      const allowed = await productionShapedDispatcher(userDataPath).controlPlaneRequest({
        requestId: 'r1', action: 'settings.source.fetch', payload: { url: `http://127.0.0.1:${port}/x` },
      });
      assert.equal(allowed.ok, true, allowed.ok === false ? allowed.message : 'unexpectedly refused');

      // Then: the person removes it -- exactly what the allowlist screen's "Remove this
      // host" control does -- and the NEXT dispatcher construction (the next restart)
      // refuses it again, precisely because the allowlist is read once at construction
      // and a change takes effect on restart rather than live.
      seedPersistedAllowlist(userDataPath, []);
      const refused = await productionShapedDispatcher(userDataPath).controlPlaneRequest({
        requestId: 'r2', action: 'settings.source.fetch', payload: { url: `http://127.0.0.1:${port}/x` },
      });
      assert.equal(refused.ok, false);
      assert.match(refused.ok === false ? refused.message : '', /not an allowed source host/u);
    },
  );
});

test('a missing settings.json is the safe default: everything is refused, not everything permitted', async () => {
  const userDataPath = mkdtempSync(join(tmpdir(), 'ding-allowlist-wired-'));
  // Deliberately no seedPersistedAllowlist call: no settings.json exists at all, the
  // state of a brand-new installation before anyone has opened the allowlist screen.
  const dispatcher = productionShapedDispatcher(userDataPath);
  const response = await dispatcher.controlPlaneRequest({
    requestId: 'r1', action: 'settings.source.fetch', payload: { url: 'https://settings.example.net/x' },
  });
  assert.equal(response.ok, false);
  assert.match(response.ok === false ? response.message : '', /not an allowed source host/u);
});

test('an explicit allowlist option still wins over whatever is persisted', async () => {
  /* Locks in the `??` in dispatch.ts: an explicit caller (a test, or a hosted server
   * that wants to supply its own list without touching a settings file) is never
   * silently overridden by whatever happens to be on disk. */
  const userDataPath = mkdtempSync(join(tmpdir(), 'ding-allowlist-wired-'));
  seedPersistedAllowlist(userDataPath, ['persisted.example.net']);

  const dispatcher = createControlPlaneDispatcher({
    userDataPath, resourcesPath: userDataPath, hosted: true,
    allowedSettingsSourceHosts: [], // explicit override: refuse everything regardless of disk
    readSettingsSourceToken: async () => undefined,
  });
  const response = await dispatcher.controlPlaneRequest({
    requestId: 'r1', action: 'settings.source.fetch', payload: { url: 'https://persisted.example.net/x' },
  });
  assert.equal(response.ok, false);
  assert.match(response.ok === false ? response.message : '', /not an allowed source host/u);
});
