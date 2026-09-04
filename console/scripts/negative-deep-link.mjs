#!/usr/bin/env node
/**
 * Deliberate red-then-green regression for the `ding-pbx://` product route.
 *
 * The defect this guards is one nothing can see, and it is the exact defect this route was
 * built to close. `inventories/design-parity.json` mapped every audited destination to a
 * product route, `design-reference/capture-manifest.generated.json` generated one for all
 * 32, and no code anywhere read a single one -- so no test failed, no build broke, and the
 * only symptom was a column that looked authoritative while naming an address nothing
 * answered. A route wired at one end and consumed at neither ships silently. That is what
 * these breaks are for.
 *
 * Each break removes exactly ONE guarded thing, runs the tests that are supposed to notice,
 * and requires them to fail; then restores it and requires the file to be byte-identical
 * again. Breaking several at once proves only that *something* among them is watched, which
 * is precisely how a wiring line ends up commented out with every unit test still green.
 *
 * Three traps this guards itself against, each of which has cost this repository real time:
 *
 *  - **A break that never landed.** Every replacement asserts the file's bytes actually
 *    changed. An edit that matched nothing reports success and changes nothing, and "no
 *    effect" then reads exactly like a passing guard.
 *  - **A restore that never landed.** Every restore asserts the file is byte-identical to
 *    what it was before, so a later break cannot run against a tree an earlier one damaged.
 *  - **CRLF.** Needles written with `\n` match nothing in a file stored with `\r\n`, so the
 *    break silently never lands -- see `forFile` at the foot of this file.
 *
 *     node console/scripts/negative-deep-link.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const RULES = 'tests/control-plane/deep-link.test.ts';
const WIRED = 'tests/ui/deep-link-wired.test.tsx';

/** @type {Array<{name: string, file: string, find: string, replace: string, tests: string[]}>} */
const BREAKS = [
  // ------------------------------------------------------- what the route refuses
  {
    name: 'the light theme is accepted, so a link asking for a palette this build does not have opens dark and says nothing',
    file: 'shared/deep-link.ts',
    find: "    return refuse('This console has only a dark theme, so a link asking for the light one cannot be opened as written.');",
    replace: "    return { ok: true, target: { destinationId: rest, state: 'default', theme: 'dark', width: 1440, height: 1000, scale: 1 } };",
    tests: [RULES],
  },
  {
    name: 'any theme at all is accepted, so a spelling mistake in a link opens a screen instead of reporting itself',
    file: 'shared/deep-link.ts',
    find: "  if (theme !== 'dark') {",
    replace: '  if (false) {',
    tests: [RULES],
  },
  {
    name: "a display scale factor is accepted from a link, which no window can actually change",
    file: 'shared/deep-link.ts',
    find: "  if (scaleRaw !== null && scaleRaw !== '1') {",
    replace: '  if (false) {',
    tests: [RULES],
  },
  {
    name: 'a state other than the default is accepted, so a link names a screen state nothing produces',
    file: 'shared/deep-link.ts',
    find: "  if (state !== 'default') {",
    replace: '  if (false) {',
    tests: [RULES],
  },
  {
    name: 'a size below the window own minimum is accepted and silently widened instead of refused',
    file: 'shared/deep-link.ts',
    find: '  if (value < minimum) {',
    replace: '  if (false) {',
    tests: [RULES],
  },
  {
    name: 'a size is no longer required to be a whole number of pixels',
    file: 'shared/deep-link.ts',
    find: '  if (!Number.isInteger(value)) {',
    replace: '  if (false) {',
    tests: [RULES],
  },
  {
    name: 'an unbounded size is accepted, so one link can ask for a window of hundreds of megapixels',
    file: 'shared/deep-link.ts',
    find: '  if (value > DEEP_LINK_MAX_EDGE) {',
    replace: '  if (false) {',
    tests: [RULES],
  },

  // ------------------------------------------------------- what the route is
  {
    name: 'any scheme is accepted, so an https link opens a screen in this console',
    file: 'shared/deep-link.ts',
    find: '  if (url.protocol !== `${DEEP_LINK_SCHEME}:`) {',
    replace: '  if (false) {',
    tests: [RULES],
  },
  {
    name: 'any authority is accepted, so this scheme quietly gains addresses it never defined',
    file: 'shared/deep-link.ts',
    find: '  if (url.hostname.toLowerCase() !== DEEP_LINK_HOST) {',
    replace: '  if (false) {',
    tests: [RULES],
  },
  {
    name: 'the schemeless-authority form stops being named, so ding-pbx:destination/dash reports the wrong problem',
    file: 'shared/deep-link.ts',
    find: "  if (url.hostname === '') {",
    replace: '  if (false) {',
    tests: [RULES],
  },
  {
    name: 'a destination id is no longer checked for shape, so a link may name anything at all',
    file: 'shared/deep-link.ts',
    find: '  if (!DESTINATION_ID.test(rest)) {',
    replace: '  if (false) {',
    tests: [RULES],
  },
  {
    name: 'a path is no longer decoded before the single-segment check, so %2F smuggles a second segment past it',
    file: 'shared/deep-link.ts',
    find: "  const rest = decodeURIComponent(url.pathname).replace(/^\\//u, '');",
    replace: "  const rest = url.pathname.replace(/^\\//u, '');",
    tests: [RULES],
  },
  {
    name: 'a link is no longer required to name exactly one destination',
    file: 'shared/deep-link.ts',
    find: "  if (rest.includes('/')) {",
    replace: '  if (false) {',
    tests: [RULES],
  },
  {
    name: 'a non-string command-line entry is coerced instead of refused',
    file: 'shared/deep-link.ts',
    find: "  if (typeof raw !== 'string' || raw.trim() === '') {",
    replace: '  if (false) {',
    tests: [RULES],
  },
  {
    name: 'membership stops being checked, so a link naming a screen this build has never had reports success',
    file: 'shared/deep-link.ts',
    find: '  if (knownDestinationIds.includes(target.destinationId)) {',
    replace: '  if (true) {',
    tests: [RULES, WIRED],
  },
  {
    name: 'the command line is searched for the wrong scheme, so no link is ever found on it',
    file: 'shared/deep-link.ts',
    find: '  const prefix = `${DEEP_LINK_SCHEME}:`;',
    replace: "  const prefix = 'ding-pbx-console:';",
    tests: [RULES],
  },
  {
    /* One break, two properties: the scheme match stops being case-insensitive, so an
     * upper-cased link on the command line is skipped -- and the next one along is
     * returned instead, which is also the first-wins ordering going wrong. */
    name: 'the command-line scan becomes case-sensitive, so an upper-cased link is skipped and a later one wins',
    file: 'shared/deep-link.ts',
    find: '    if (trimmed.toLowerCase().startsWith(prefix)) return trimmed;',
    replace: '    if (trimmed.startsWith(prefix)) return trimmed;',
    tests: [RULES],
  },

  // ------------------------------------------------------- the renderer end
  {
    name: 'the renderer never pulls the queue, so every link that started the process is lost before anything is listening',
    file: 'app/renderer/src/App.tsx',
    find: '    void deepLink.pending().then((queued) => {',
    replace: '    void Promise.resolve([] as DeepLinkDelivery[]).then((queued) => {',
    tests: [WIRED],
  },
  {
    name: 'the renderer never subscribes to the live channel, so only a link that started the process ever arrives',
    file: 'app/renderer/src/App.tsx',
    find: '    this.stopDeepLinkListener = deepLink.onNavigate((delivery) => this.openDeepLink(delivery));',
    replace: '    this.stopDeepLinkListener = undefined;',
    tests: [WIRED],
  },
  {
    name: 'a refused link is dropped in silence, so a typo and a broken installation look identical',
    file: 'app/renderer/src/App.tsx',
    find: '    if (!delivery.ok) { this.toast(`That link could not be opened. ${delivery.reason}`); return; }',
    replace: '    if (!delivery.ok) { return; }',
    tests: [WIRED],
  },
  {
    name: 'a refused link navigates anyway, to whatever destination the refused link named',
    file: 'app/renderer/src/App.tsx',
    find: '    if (!resolved.ok) { this.toast(`That link could not be opened. ${resolved.reason}`); return; }',
    replace: '    if (!resolved.ok) { this.openScreen(delivery.target.destinationId); return; }',
    tests: [WIRED],
  },
  {
    name: 'the screen moves without the rail, so the destination arrives beside the previous rail section list',
    file: 'app/renderer/src/App.tsx',
    find: '    this.openScreen(resolved.destinationId);',
    replace: "    this.setState({ screen: resolved.destinationId });",
    tests: [WIRED],
  },
  {
    name: 'the subscriber is never called on mount, so every method behind it is unreachable at run time',
    file: 'app/renderer/src/App.tsx',
    find: '    this.listenForDeepLinks();',
    replace: '    void 0;',
    tests: [WIRED],
  },
  {
    name: 'the listener outlives the component and fires into a dead tree on the next reload',
    file: 'app/renderer/src/App.tsx',
    find: '    this.stopDeepLinkListener?.();',
    replace: '    void 0;',
    tests: [WIRED],
  },

  // ------------------------------------------------------- the main-process end
  {
    name: 'the scheme is never registered with the operating system, so no click on a link reaches this application at all',
    file: 'app/electron/main.ts',
    find: '  if (app.isPackaged) app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME);',
    replace: '  void DEEP_LINK_SCHEME;',
    tests: [WIRED],
  },
  {
    name: 'the single-instance lock is dropped, so every link opens a second copy of the console',
    file: 'app/electron/main.ts',
    find: '} else if (!app.requestSingleInstanceLock()) {',
    replace: '} else if (false) {',
    tests: [WIRED],
  },
  {
    name: 'a second launch never hands its command line to the first, so the lock silently discards every link',
    file: 'app/electron/main.ts',
    find: "  app.on('second-instance', (_event, argv) => receiveDeepLink(firstDeepLinkInArgv(argv)));",
    replace: '  void receiveDeepLink;',
    tests: [WIRED],
  },
  {
    name: 'the renderer has nothing to pull the startup queue from',
    file: 'app/electron/main.ts',
    find: "ipcMain.handle('deep-link:pending', (): DeepLinkDelivery[] => {",
    replace: "ipcMain.handle('deep-link:pendinq', (): DeepLinkDelivery[] => {",
    tests: [WIRED],
  },
  {
    name: 'a link arriving while the console runs is never pushed to the renderer',
    file: 'app/electron/main.ts',
    find: "    mainWindow.webContents.send('deep-link:navigate', delivery);",
    replace: '    deepLinkQueue.push(delivery);',
    tests: [WIRED],
  },
  {
    name: 'the link this process was started with is never read off its own command line',
    file: 'app/electron/main.ts',
    find: 'const startupDelivery = deliveryFor(firstDeepLinkInArgv(process.argv));',
    replace: 'const startupDelivery = deliveryFor(undefined);',
    tests: [WIRED],
  },
  {
    name: 'the window never takes the size the route declares, so the tuple it names is not the tuple it produces',
    file: 'app/electron/main.ts',
    find: '  if (startupDelivery?.ok) mainWindow.setContentSize(startupDelivery.target.width, startupDelivery.target.height);',
    replace: '  void startupDelivery;',
    tests: [WIRED],
  },

  // ------------------------------------------------------- the preload Electron actually loads
  {
    name: 'the channel is exposed only on the TypeScript preload, not the .cjs Electron really loads',
    file: 'app/electron/preload.cjs',
    find: "    pending: () => ipcRenderer.invoke('deep-link:pending'),",
    replace: "    pendinq: () => ipcRenderer.invoke('deep-link:pending'),",
    tests: [WIRED],
  },
  {
    name: 'the .cjs preload stops listening on the live channel',
    file: 'app/electron/preload.cjs',
    find: "      ipcRenderer.on('deep-link:navigate', handler);",
    replace: "      ipcRenderer.on('deep-link:naviqate', handler);",
    tests: [WIRED],
  },

  // ------------------------------------------------------- the generated product-route column
  {
    /* The column the roadmap item is about. This is the break that matters most, because
     * it is the exact state the route was in before this change: a generated `builtRoute`
     * naming an address the application does not answer, with nothing anywhere to notice. */
    name: 'one generated product route goes back to naming an address this application does not answer',
    file: 'design-reference/capture-manifest.generated.json',
    find: '"builtRoute": "ding-pbx://destination/dash?',
    replace: '"builtRoute": "ding-pbx-console://open/dash?',
    tests: [RULES],
  },
  {
    name: 'one generated product route opens a different destination from the row it sits in',
    file: 'design-reference/capture-manifest.generated.json',
    find: '"builtRoute": "ding-pbx://destination/cdr?',
    replace: '"builtRoute": "ding-pbx://destination/dash?',
    tests: [RULES],
  },
];

/**
 * Every `find`/`replace` above is written with `\n`, and parts of this checkout are stored
 * with CRLF. A multi-line needle written with `\n` matches nothing in a CRLF file, so the
 * break silently never lands -- which reads exactly like a guard that passed.
 */
function forFile(source, text) {
  return source.includes('\r\n') ? text.replace(/\n/gu, '\r\n') : text;
}

function run(tests) {
  const result = spawnSync('npx', ['tsx', '--test', ...tests], {
    cwd: root, encoding: 'utf8', shell: process.platform === 'win32',
  });
  return result.status ?? 1;
}

let failures = 0;
for (const breakage of BREAKS) {
  const path = resolve(root, breakage.file);
  const original = readFileSync(path, 'utf8');
  const find = forFile(original, breakage.find);
  if (!original.includes(find)) {
    console.error(`SKIPPED-AS-FAILURE: ${breakage.name}\n  the text this break edits is not in ${breakage.file} any more, so the break would never land`);
    failures += 1;
    continue;
  }
  const broken = original.replace(find, forFile(original, breakage.replace));
  if (broken === original) {
    console.error(`SKIPPED-AS-FAILURE: ${breakage.name}\n  the replacement changed nothing in ${breakage.file}`);
    failures += 1;
    continue;
  }
  writeFileSync(path, broken);
  const redStatus = run(breakage.tests);
  writeFileSync(path, original);
  if (readFileSync(path, 'utf8') !== original) {
    console.error(`FATAL: ${breakage.file} was not restored byte-for-byte; stop and check the tree`);
    process.exit(2);
  }
  if (redStatus === 0) {
    console.error(`FAILED (stayed green): ${breakage.name}`);
    failures += 1;
    continue;
  }
  console.log(`red then restored: ${breakage.name}`);
}

if (failures > 0) {
  console.error(`\n${failures} of ${BREAKS.length} break(s) did not turn the tests red.`);
  process.exit(1);
}
console.log(`\nall ${BREAKS.length} breaks turned their tests red and restored green.`);
