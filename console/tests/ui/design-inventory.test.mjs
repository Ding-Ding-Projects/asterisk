import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const expectedDestinations = [
  'dash','live','endpoints','trunks','trunkauth','canvas','ivr','queues',
  'voicemail','confbridge','moh','codecs','cdr','ami','modules','logger','security','cli',
  'memory','sync','skills','hub','vocab','ops','secrets',
  'servers','arcade','notifications','history','customise','appearance','about',
];

function validateInventory(inventory) {
  assert.equal(inventory.schemaVersion, 1);
  assert.equal(inventory.source.sha256, '9A4284745A745C18A18B0A23D2A2F5851A79F9B6EFCBC5EE30EDCD69CEA2863F');
  assert.deepEqual(inventory.rails.map(r => r.destinations.length), [8,4,2,4,7,7]);
  assert.deepEqual(inventory.rails.flatMap(r => r.destinations), expectedDestinations);
  assert.deepEqual(inventory.auditBaseline, {
    bindings:{total:265,primary:233,reusableControl:32}, distinctExpressions:168,
    controlDeclarations:479, controlIds:467, openStateFamilies:17, onboardingSteps:5,
    tourSteps:5, confirmationGames:8, provisioningLogEntries:10, canvas:{nodes:6,edges:5},
  });
}

const expectedPreloadSections = [
  'platform', 'window', 'dialog', 'controlPlane', 'school', 'provisioning', 'accessibility', 'editors',
  'localData', 'deepLink', 'statusHub', 'nativeHost', 'downloads', 'converter', 'updater',
];

function topLevelPreloadSections(preload) {
  return [...preload.matchAll(/^  ([A-Za-z][A-Za-z0-9]*):/gm)].map(([, section]) => section);
}

function validateRuntimePreloadBoundary(preload, typedPreload) {
  assert.deepEqual(topLevelPreloadSections(preload), expectedPreloadSections, 'runtime preload section inventory drifted');
  assert.deepEqual(topLevelPreloadSections(typedPreload), expectedPreloadSections, 'typed preload section inventory drifted');
  for (const member of [
    'setTitle:', 'provisioning: Object.freeze({', 'accessibility: Object.freeze({', 'editors: Object.freeze({', 'localData: Object.freeze({', 'deepLink: Object.freeze({',
    "'provision:step'", "'accessibility:changed'", "'editors:detect'", "'local-data:path'", "'deep-link:destination'",
  ]) assert.ok(preload.includes(member), `runtime preload boundary missing exact member: ${member}`);
  for (const forbidden of ['ipcRenderer.invoke.bind', 'ipcRenderer.on.bind', 'ipcRenderer.send.bind', "ipcRenderer.invoke('*'", "ipcRenderer.on('*'"]) {
    assert.equal(preload.includes(forbidden), false, `runtime preload leaked an unbounded IPC capability: ${forbidden}`);
  }
}

test('pins every authoritative design destination and audit count', async () => {
  validateInventory(JSON.parse(await read('design/inventory.json')));
});

test('negative regression: a removed destination turns the inventory check red', async () => {
  const inventory = JSON.parse(await read('design/inventory.json'));
  inventory.rails[0].destinations = inventory.rails[0].destinations.filter(id => id !== 'endpoints');
  assert.throws(() => validateInventory(inventory));
});

test('negative regression: a changed audit baseline turns the inventory check red', async () => {
  const inventory = JSON.parse(await read('design/inventory.json'));
  inventory.auditBaseline.bindings.total = 264;
  assert.throws(() => validateInventory(inventory));
});

test('the renderer is the compiled design output, and App.tsx does not reintroduce a hand-written substitute', async () => {
  const generated = await read('app/renderer/src/generated/console.tsx');
  for (const exact of [
    'Guided wizard', 'Regex builder', 'Lock this element', 'Notification centre',
    'Jump to any screen, setting, or command', 'Vocabulary & guard', 'Arcade',
  ]) assert.ok(generated.includes(exact), `generated design output missing exact surface marker: ${exact}`);

  const manifest = JSON.parse(await read('app/renderer/src/generated/design-manifest.json'));
  assert.equal(manifest.generatedBy, 'console/scripts/compile-design.mjs');
  assert.deepEqual(manifest.sources, ['design/Asterisk Console M3.dc.html', 'design/M3 Control.dc.html']);

  // App.tsx supplies real control-plane readings on top of the compiled shell; it must not
  // hand-roll its own copies of the design's navigation/overlay surfaces.
  const app = await read('app/renderer/src/App.tsx');
  assert.match(app, /from '\.\/generated\/console'/, 'App.tsx must subclass the compiled design shell');
  for (const substitute of ['Search current tab strip', 'Master destination search', 'Appearance editor', 'Review consequential action']) {
    assert.equal(app.includes(substitute), false, `App.tsx reintroduced a hand-written substitute: ${substitute}`);
  }
});

test('public source contains no runtime CDN or private source branding', async () => {
  const files = [
    'app/renderer/src/App.tsx', 'app/renderer/src/catalog.ts', 'app/renderer/src/styles.css', 'app/renderer/index.html',
    'app/renderer/src/generated/console.tsx', 'app/renderer/src/generated/m3-control.tsx',
    'app/renderer/src/generated/design-styles.css',
  ];
  const text = (await Promise.all(files.map(read))).join('\n');
  for (const forbidden of ['fonts.googleapis.com','fonts.gstatic.com','unpkg.com','Asterisk Console','support.js']) {
    assert.equal(text.includes(forbidden), false, `public renderer leaked forbidden source text: ${forbidden}`);
  }
});

test('preload exposes a typed, bounded control-plane boundary', async () => {
  const preload = await read('app/electron/preload.cjs');
  const typedPreload = await read('app/electron/preload.ts');
  const main = await read('app/electron/main.ts');
  // The action dispatch itself moved to control-plane/dispatch.ts so the Electron main
  // process and the hosted HTTP server (server/http-server.ts) run the exact same
  // dispatcher rather than drifting into two implementations — see dispatch.ts's own
  // header comment. main.ts now just wires it up through createControlPlaneDispatcher.
  const dispatch = await read('control-plane/dispatch.ts');
  assert.match(preload, /contextBridge\.exposeInMainWorld\('dingDesktop', api\)/);
  assert.match(preload, /ipcRenderer\.invoke\('control-plane:request', request\)/);
  assert.match(typedPreload, /const api: DingDesktopApi = \{/);
  // The CJS preload is the runtime artifact configured by Electron. Keep this explicit list
  // hand-written so a surface cannot disappear just because a discovery-only scan stopped seeing it.
  validateRuntimePreloadBoundary(preload, typedPreload);
  assert.match(main, /createControlPlaneDispatcher/);
  assert.match(dispatch, /discoverWslDistributions/);
  assert.match(dispatch, /discoverLocalDocker\('ding-pbx-console'\)/);
  assert.match(dispatch, /TARGET_NOT_DISCOVERED/);
  assert.equal(main.includes('exec('), false);
  // The native-host broker is a named, validated executable. The exact call is allowed,
  // while arbitrary renderer-to-main process launch APIs remain absent from the preload.
  assert.match(main, /spawn\(nativeIngressConfig\.brokerPath, \['--listen', nativeIngressConfig\.pipeName\], \{ stdio: 'pipe', windowsHide: true \}\)/);
  assert.equal((main.match(/\bspawn\(/g) ?? []).length, 1, 'Electron main must expose exactly one validated native-host launch');
  assert.equal(dispatch.includes('exec('), false);
  assert.match(dispatch, /spawn\('wsl\.exe', \['-d', distribution, '--', 'cat', resource\], \{/);
  assert.equal((dispatch.match(/\bspawn\(/g) ?? []).length, 1, 'control-plane dispatch must expose exactly one bounded WSL config read');
});

test('negative regression: a removed runtime preload capability turns the boundary check red', async () => {
  const preload = await read('app/electron/preload.cjs');
  const typedPreload = await read('app/electron/preload.ts');
  assert.throws(() => validateRuntimePreloadBoundary(preload.replace('editors: Object.freeze({', 'editorsRemoved: Object.freeze({'), typedPreload));
});

test('negative regression: an added runtime preload capability turns the boundary check red', async () => {
  const preload = await read('app/electron/preload.cjs');
  const typedPreload = await read('app/electron/preload.ts');
  assert.throws(() => validateRuntimePreloadBoundary(preload.replace('  updater:', '  fakeRuntimeEscape: Object.freeze({}),\n  updater:'), typedPreload));
});
