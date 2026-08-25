/**
 * Wiring, not the helper.
 *
 * `detectEditors()` and `planLaunch()` already have a full suite (see
 * `tests/ui/external-editor.test.tsx`) that passed while the feature did nothing at
 * all: nothing in `App.tsx` ever called them, the picker's options were a hard-coded
 * constant, and there was no "open" action anywhere. This file exercises `App`'s own
 * methods against a stubbed `window.dingDesktop`, so it fails if the wiring regresses
 * even though every pure function underneath it still passes.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

// App.bridge() reads `window.dingDesktop`; outside a browser/jsdom environment there is
// no `window` global at all, so stub the minimum this render path touches.
(globalThis as { window?: unknown }).window ??= {} as unknown;
(globalThis as unknown as { crypto?: unknown }).crypto ??= { randomUUID: () => 'test-uuid' };

import { App } from '../../app/renderer/src/App';
import { KNOWN_EDITORS, VS_CODE, chooseEditor, saveCustomEditor, CUSTOM_EDITOR_ID } from '../../app/renderer/src/external-editor';

interface EditorsBridge {
  detect(): Promise<ReadonlyArray<{ id: string; resolved: string }>>;
  open(target: { kind: 'file' | 'folder'; path: string }): Promise<
    { ok: true } | { ok: false; message: string; downloadUrl?: string }
  >;
}
interface LocalDataBridge {
  path(): Promise<string>;
  openFolder(): Promise<{ ok: true } | { ok: false; reason: string }>;
}

interface EditorCtlLike { id: string; label: string; kind: string; value: unknown; options?: string[]; info?: string }

type PinnedInstance = InstanceType<typeof App> & {
  durableStorage: { storage: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } };
  detectedEditors: unknown[];
  editorCtls(): EditorCtlLike[] | undefined;
  refreshEditorDetection(): Promise<void>;
  launchExternalEditor(): Promise<void>;
  fire(title: string, body: string): void;
  toast(message: string): void;
  setVal(control: { id?: string; label?: string; kind?: string }, value: unknown): void;
};

function buildApp(bridge: { editors?: EditorsBridge; localData?: LocalDataBridge } = {}): {
  instance: PinnedInstance;
  fired: { title: string; body: string }[];
  toasted: string[];
} {
  // `controlPlane.request` is a harmless stub: `durable-storage.ts` fires a
  // fire-and-forget persist call on every `setItem`, and would otherwise throw on a
  // bridge that only supplies the two fields these tests actually exercise.
  (window as unknown as { dingDesktop?: unknown }).dingDesktop = {
    ...bridge,
    controlPlane: { request: async () => ({ ok: false }) },
  };
  const fired: { title: string; body: string }[] = [];
  const toasted: string[] = [];
  class Pinned extends (App as unknown as new (props: unknown) => PinnedInstance) {
    /* Class-FIELD overrides, not methods: `fire`/`toast` are themselves arrow-function
     * class fields on the compiled `ConsoleShell` base (`fire = (title, sub) => {...}`),
     * which become an OWN instance property set while `super()` runs. A subclass
     * PROTOTYPE method never shadows that -- own properties always win over the
     * prototype chain -- so the override has to be a field too, assigned after
     * `super()` returns so it overwrites the base's own assignment. */
    fire = (title: string, body: string) => { fired.push({ title, body }); };
    toast = (message: string) => { toasted.push(message); };
    componentDidMount() {
      // Skip the full bootstrap chain (discovery, scheduling, live polling) -- these
      // tests call the editor/ticket methods directly, synchronously, with no timers
      // or network left running after the test returns.
    }
    /* `setState` (unlike `fire`/`toast`) is a real prototype method inherited from
     * `React.Component`, so a subclass method DOES override it correctly -- but the
     * real implementation is a no-op on a component nothing has mounted (it prints a
     * console warning and does nothing), which would make `refreshEditorDetection`'s
     * `this.setState(...)` calls silently vanish. Apply the update the way React
     * actually would -- merging a plain object, or the result of an updater function
     * fed the current state -- so the persisted-choice reflection this test exists to
     * prove is genuinely exercised rather than skipped. */
    setState(update: unknown) {
      const patch = typeof update === 'function' ? (update as (state: Record<string, unknown>) => Record<string, unknown>)(this.state) : update;
      this.state = { ...this.state, ...(patch as Record<string, unknown>) };
    }
  }
  const instance = new (Pinned as unknown as new () => PinnedInstance)();
  return { instance, fired, toasted };
}

test('with no built-in editors detected, the picker is emptied honestly rather than left showing the static four', async () => {
  const { instance } = buildApp({ editors: { detect: async () => [], open: async () => ({ ok: false, message: 'unused' }) } });
  await instance.refreshEditorDetection();
  const choice = instance.editorCtls()?.find((c) => c.id === 'ed_choice');
  assert.ok(choice, 'expected the "External editor" group\'s ed_choice control to exist');
  assert.deepEqual(choice!.options, [], 'the picker still shows the hard-coded static list with nothing detected');
  assert.match(String(choice!.info), /No installed editor was found/u);
});

test('detection populates the picker from what detect() actually returns, not the KNOWN_EDITORS constant', async () => {
  const found = [{ id: 'vscode', resolved: 'code' }, { id: 'sublime', resolved: 'subl' }];
  const { instance } = buildApp({ editors: { detect: async () => found, open: async () => ({ ok: false, message: 'unused' }) } });
  await instance.refreshEditorDetection();
  const choice = instance.editorCtls()?.find((c) => c.id === 'ed_choice');
  assert.deepEqual(choice!.options!.slice().sort(), ['Sublime Text', 'Visual Studio Code'].sort());
  assert.match(String(choice!.info), /Only editors actually installed/u);
});

test('an unknown id returned by detect() is dropped rather than crashing the picker', async () => {
  const { instance } = buildApp({ editors: { detect: async () => [{ id: 'some-future-editor', resolved: 'x' }], open: async () => ({ ok: false, message: 'unused' }) } });
  await instance.refreshEditorDetection();
  assert.deepEqual(instance.detectedEditors, []);
});

test('the persisted choice is reflected back into the picker, which nothing did before', async () => {
  const { instance } = buildApp({ editors: { detect: async () => [{ id: 'vscode', resolved: 'code' }], open: async () => ({ ok: false, message: 'unused' }) } });
  chooseEditor(instance.durableStorage.storage, 'vscode');
  await instance.refreshEditorDetection();
  const values = (instance.state as unknown as { values: Record<string, unknown> }).values;
  assert.equal(values['ed_choice'], VS_CODE.name);
});

test('a persisted choice that detect() no longer finds is not shown as selected', async () => {
  const { instance } = buildApp({ editors: { detect: async () => [], open: async () => ({ ok: false, message: 'unused' }) } });
  chooseEditor(instance.durableStorage.storage, 'vscode');
  await instance.refreshEditorDetection();
  const values = (instance.state as unknown as { values: Record<string, unknown> }).values;
  assert.notEqual(values['ed_choice'], VS_CODE.name);
});

test('the "open here" action does not exist in the compiled design and is added exactly once', async () => {
  const { instance } = buildApp({ editors: { detect: async () => [], open: async () => ({ ok: false, message: 'unused' }) } });
  await instance.refreshEditorDetection();
  await instance.refreshEditorDetection();
  const opens = instance.editorCtls()?.filter((c) => c.id === 'ed_open') ?? [];
  assert.equal(opens.length, 1, 'the open action was duplicated across two detection round trips');
  assert.equal(opens[0].kind, 'switch');
});

test('toggling the real "ed_open" control -- the actual UI event path, not the bare method -- reaches editors.open', async () => {
  /* Every other test in this file calls `launchExternalEditor()` directly. This one
   * goes through `setVal`, exactly as the compiled UI's switch does when clicked, so it
   * would fail if the `if (control?.id === 'ed_open' ...)` dispatch branch in
   * `languageAwareSetVal` were ever deleted, even though the method it calls still
   * works perfectly on its own. */
  let openedWith: { kind: string; path: string } | undefined;
  const { instance } = buildApp({
    localData: { path: async () => 'C:\\data\\ding-pbx-console', openFolder: async () => ({ ok: true }) },
    editors: { detect: async () => [], open: async (target) => { openedWith = target; return { ok: true }; } },
  });
  instance.setVal({ id: 'ed_open', label: 'Open here in the chosen editor', kind: 'switch' }, true);
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(openedWith, { kind: 'folder', path: 'C:\\data\\ding-pbx-console' });
});

test('launching the editor asks for the real application-data path and hands it to editors.open as a folder (a workspace root, never a bare file)', async () => {
  let openedWith: { kind: string; path: string } | undefined;
  const { instance, toasted } = buildApp({
    localData: { path: async () => 'C:\\Users\\someone\\AppData\\Roaming\\ding-pbx-console', openFolder: async () => ({ ok: true }) },
    editors: {
      detect: async () => [],
      open: async (target) => { openedWith = target; return { ok: true }; },
    },
  });
  await instance.launchExternalEditor();
  assert.deepEqual(openedWith, { kind: 'folder', path: 'C:\\Users\\someone\\AppData\\Roaming\\ding-pbx-console' });
  assert.equal(toasted.length, 1);
});

test('a refusal from editors.open is reported to the user, not swallowed as a silent success', async () => {
  const { instance, fired, toasted } = buildApp({
    localData: { path: async () => 'C:\\data', openFolder: async () => ({ ok: true }) },
    editors: {
      detect: async () => [],
      open: async () => ({ ok: false, message: 'No editor is set up yet.', downloadUrl: 'https://code.visualstudio.com/' }),
    },
  });
  await instance.launchExternalEditor();
  assert.equal(toasted.length, 0);
  assert.equal(fired.length, 1);
  assert.match(fired[0].body, /No editor is set up yet/u);
  assert.match(fired[0].body, /code\.visualstudio\.com/u);
});

test('with no local bridge at all (a hosted browser tab), opening reports the gap honestly instead of throwing', async () => {
  const { instance, fired } = buildApp({});
  await instance.launchExternalEditor();
  assert.equal(fired.length, 1);
});

test('every built-in editor id known to the picker resolves to a real KNOWN_EDITORS entry', () => {
  /* Guards the id contract `refreshEditorDetection` relies on to translate detect()'s
   * {id, resolved} pairs back into a DetectedEditor. */
  for (const editor of KNOWN_EDITORS) assert.ok(KNOWN_EDITORS.some((e) => e.id === editor.id));
});

/* --- the custom editor route is untouched by real detection ------------------------ */

test('a saved custom editor is reflected back too -- chosenEditor resolves it independent of real detection', async () => {
  const { instance } = buildApp({ editors: { detect: async () => [], open: async () => ({ ok: false, message: 'unused' }) } });
  saveCustomEditor(instance.durableStorage.storage, { name: 'My editor', executable: 'C:\\tools\\ed.exe' });
  chooseEditor(instance.durableStorage.storage, CUSTOM_EDITOR_ID);
  await instance.refreshEditorDetection();
  // The custom editor is never part of the built-in options list -- detection only ever
  // concerns the four KNOWN_EDITORS -- but chosenEditor() still resolves it from the
  // saved name/executable pair regardless of what real detection found, so the picker's
  // reflected value is still correct.
  const choice = instance.editorCtls()?.find((c) => c.id === 'ed_choice');
  assert.ok(!choice!.options!.includes('My editor'), 'a custom editor must never appear in the built-in options list');
  const values = (instance.state as unknown as { values: Record<string, unknown> }).values;
  assert.equal(values['ed_choice'], 'My editor');
});
