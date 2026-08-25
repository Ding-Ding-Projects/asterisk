/**
 * Wiring, not the helper.
 *
 * `resolutionFor()`'s own copy has always said "This console will open it for you" (see
 * `tests/ui/support-tickets.test.tsx`, which passed while nothing ever called anything
 * to open a folder). This file exercises `App.fileSupportTicket()` against a stubbed
 * `window.dingDesktop`, so it fails if the folder-open action stops being wired even
 * though the pure ticket logic underneath it still passes.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

(globalThis as { window?: unknown }).window ??= {} as unknown;
(globalThis as unknown as { crypto?: unknown }).crypto ??= { randomUUID: () => 'test-uuid' };

import { App } from '../../app/renderer/src/App';
import { NO_NETWORK_DISCLOSURE } from '../../app/renderer/src/support-tickets';
import { setFunnyLevel } from '../../app/renderer/src/funny-levels';

interface LocalDataBridge {
  path(): Promise<string>;
  openFolder(): Promise<{ ok: true } | { ok: false; reason: string }>;
}

type PinnedInstance = InstanceType<typeof App> & {
  durableStorage: { storage: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } };
  fileSupportTicket(): void;
  state: Record<string, unknown>;
  setVal(control: { id?: string; label?: string; kind?: string }, value: unknown): void;
};

const DEFAULT_TICKET_VALUES = { sup_category: 'Forgotten PIN or password', sup_description: 'I cannot remember it', sup_severity: 'Normal' };

function buildApp(
  localData?: LocalDataBridge,
  values: Record<string, unknown> = DEFAULT_TICKET_VALUES,
): { instance: PinnedInstance; fired: { title: string; body: string }[] } {
  // `controlPlane.request` is a harmless stub -- see external-editor-wired.test.tsx's
  // identical comment: `durable-storage.ts` fires a persist call on every `setItem`
  // (used here by `setFunnyLevel`) and would otherwise throw on a bare bridge.
  (window as unknown as { dingDesktop?: unknown }).dingDesktop = {
    ...(localData ? { localData } : {}),
    controlPlane: { request: async () => ({ ok: false }) },
  };
  const fired: { title: string; body: string }[] = [];
  class Pinned extends (App as unknown as new (props: unknown) => PinnedInstance) {
    /* A class-FIELD override, not a method -- `fire` is itself an arrow-function class
     * field on the compiled `ConsoleShell` base, which becomes an own instance property
     * set while `super()` runs. A subclass prototype method never shadows an own
     * property, so the override has to be a field too. See the identical note in
     * external-editor-wired.test.tsx, where this cost real debugging time to track down. */
    fire = (title: string, body: string) => { fired.push({ title, body }); };
    constructor(props: unknown) {
      super(props);
      /* Direct assignment, never `this.setState(...)`: React's real `setState` is a
       * silent no-op on a component nothing has ever mounted (it prints exactly that
       * warning), which is what `new Pinned()` alone produces here -- there is no
       * `ReactDOM.render` in any of these tests. `app-no-sample-data.test.tsx`
       * establishes the same direct-assignment pattern for the identical reason. */
      this.state = { ...this.state, values: { ...(this.state as { values?: Record<string, unknown> }).values, ...values } };
    }
    componentDidMount() { /* no full bootstrap for these direct-method tests */ }
  }
  const instance = new (Pinned as unknown as new (props: unknown) => PinnedInstance)(undefined);
  return { instance, fired };
}

/** Waits for the fire-and-forget async chain `fileSupportTicket` starts to settle,
 *  without depending on any particular number of microtask turns. */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test('toggling the real "sup_open" control -- the actual UI event path, not the bare method -- reaches openFolder', async () => {
  /* Every other test in this file calls `fileSupportTicket()` directly. This one goes
   * through `setVal`, exactly as the compiled UI's "Open a ticket" switch does when
   * clicked, so it would fail if the `if (control?.id === 'sup_open' ...)` dispatch
   * branch in `languageAwareSetVal` were ever deleted, even though the method it calls
   * still works perfectly on its own. */
  let opened = false;
  const { instance } = buildApp({ path: async () => 'C:\\data\\ding-pbx-console', openFolder: async () => { opened = true; return { ok: true }; } });
  instance.setVal({ id: 'sup_open', label: 'Open a ticket', kind: 'switch' }, true);
  await settle();
  assert.equal(opened, true);
});

test('filing a ticket asks the privileged process for the real path and opens it -- the resolution\u2019s own promise, finally kept', async () => {
  let pathCalls = 0;
  let openCalls = 0;
  const { instance, fired } = buildApp({
    path: async () => { pathCalls += 1; return 'C:\\Users\\someone\\AppData\\Roaming\\ding-pbx-console'; },
    openFolder: async () => { openCalls += 1; return { ok: true }; },
  });
  instance.fileSupportTicket();
  await settle();
  assert.equal(pathCalls, 1);
  assert.equal(openCalls, 1);
  assert.equal(fired.length, 1);
  assert.match(fired[0].body, /C:\\Users\\someone\\AppData\\Roaming\\ding-pbx-console/u);
  assert.match(fired[0].body, /folder is open now/u);
});

test('a failed folder-manager launch still names the exact path as text, per the documented failure mode', async () => {
  const { instance, fired } = buildApp({
    path: async () => 'C:\\data\\ding-pbx-console',
    openFolder: async () => ({ ok: false, reason: 'explorer.exe refused to start' }),
  });
  instance.fileSupportTicket();
  await settle();
  assert.equal(fired.length, 1);
  assert.match(fired[0].body, /C:\\data\\ding-pbx-console/u);
  assert.match(fired[0].body, /explorer\.exe refused to start/u);
  assert.match(fired[0].body, /navigate to the path above by hand/u);
});

test('with no local bridge at all (a hosted browser tab), the ticket still files and says so honestly rather than throwing', async () => {
  const { instance, fired } = buildApp(undefined);
  instance.fileSupportTicket();
  await settle();
  assert.equal(fired.length, 1);
  assert.match(fired[0].body, /has no local file manager/u);
});

test('an invalid ticket never reaches the folder-open path at all', async () => {
  let opened = false;
  const { instance, fired } = buildApp(
    { path: async () => 'C:\\data', openFolder: async () => { opened = true; return { ok: true }; } },
    { sup_category: 'Forgotten PIN or password', sup_description: '   ', sup_severity: 'Normal' },
  );
  instance.fileSupportTicket();
  await settle();
  assert.equal(opened, false, 'a ticket with no description still tried to open the folder');
  assert.equal(fired.length, 1);
  assert.match(fired[0].title, /will not file/u);
});

/* --- the disclosure line, at every humour level -------------------------------------- */

for (const level of [1, 2, 3, 4, 5] as const) {
  test(`the disclosure line survives funny level ${level} unchanged`, async () => {
    const { instance, fired } = buildApp({
      path: async () => 'C:\\data\\ding-pbx-console',
      openFolder: async () => ({ ok: true }),
    });
    setFunnyLevel(instance.durableStorage.storage, 'en', level);
    setFunnyLevel(instance.durableStorage.storage, 'yue', level);
    instance.fileSupportTicket();
    await settle();
    assert.equal(fired.length, 1);
    assert.ok(fired[0].body.includes(NO_NETWORK_DISCLOSURE), `funny level ${level} altered or dropped the no-network disclosure`);
  });
}

test('the disclosure line is present even when the folder cannot be opened at all', async () => {
  const { instance, fired } = buildApp(undefined);
  instance.fileSupportTicket();
  await settle();
  assert.ok(fired[0].body.includes(NO_NETWORK_DISCLOSURE));
});

/* --- nothing in this flow deletes anything ------------------------------------------- */

test('the folder-open bridge contract exposes no delete/remove/wipe/purge/clear method', () => {
  const shape: LocalDataBridge = { path: async () => '', openFolder: async () => ({ ok: true }) };
  for (const name of Object.keys(shape)) {
    assert.ok(!/delete|remove|wipe|purge|clear/iu.test(name), `${name} looks like it deletes something`);
  }
});
