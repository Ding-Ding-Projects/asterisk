#!/usr/bin/env node
/**
 * Checks that the `ding-pbx://destination/<id>` route is wired end to end, in the source.
 *
 * Behaviour covers the parts that can be driven: the parser, the router that holds a route
 * until the renderer exists, and the renderer's own resolve-then-navigate path are all
 * exercised for real in `tests/control-plane/destination-route.test.ts` and
 * `tests/ui/destination-route-wired.test.tsx`. What no test in this repository can drive is
 * the main process: it needs a real Electron `app`, a real registered scheme, and a real
 * operating system to hand it a link. Those four lines are exactly where this feature would
 * silently stop working, and each of them is one comment character away from being gone.
 *
 * So every anchor below is a WHOLE LINE. A needle for `listenForDestinationRoutes()` is
 * satisfied by `// this.listenForDestinationRoutes();`, which is how a wiring line usually
 * dies -- somebody comments it out while chasing something else and never puts it back.
 * Carriage returns are stripped first, because this checkout is CRLF and a `$`-anchored
 * pattern written against `\n` matches nothing at all, which reads exactly like a clean pass.
 *
 * Kept separate from the tests that use it so `negative-destination-route.mjs` can plant a
 * lie in one file's bytes, in memory, and watch this refuse it.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Each: [file, pattern, what its absence would mean]. */
export const WIRING = [
  ['console/app/renderer/src/App.tsx', /^\s*this\.listenForDestinationRoutes\(\);$/m,
    'nothing calls listenForDestinationRoutes, so no link would ever reach a screen'],
  ['console/app/renderer/src/App.tsx', /^\s*this\.stopDeepLinkListener\?\.\(\);$/m,
    'the deep-link listener outlives the component and fires into a dead tree on the next reload'],
  ['console/app/renderer/src/App.tsx', /^\s*this\.openScreen\(resolution\.destinationId\);$/m,
    'a resolved route navigates nowhere'],
  ['console/app/electron/main.ts', /^\s*if \(app\.isPackaged\) app\.setAsDefaultProtocolClient\(scheme\);$/m,
    'the scheme is never registered, so the operating system has nothing to hand a link to'],
  ['console/app/electron/main.ts', /^\} else if \(!app\.requestSingleInstanceLock\(\)\) \{$/m,
    'without the single-instance lock a link launches a second console that cannot navigate the first'],
  ['console/app/electron/main.ts', /^\s*const launchRoute = firstDestinationRouteArgument\(process\.argv\);$/m,
    'a link that starts the application arrives on the command line and would be dropped'],
  ['console/app/electron/main.ts', /^\s*app\.on\('second-instance', \(_event, argv\) => \{$/m,
    'a link arriving at an already-running console would be dropped'],
  ['console/app/electron/main.ts', /^\s*mainWindow\.webContents\.on\('did-finish-load', \(\) => \{ rendererLoaded = true; destinationRoutes\.flush\(\); \}\);$/m,
    'a route held before the page finished loading would never be delivered'],
  ['console/app/electron/main.ts', /^\s*mainWindow\.webContents\.send\('deep-link:destination', route\);$/m,
    'the main process sends on no channel, so the preload bridge listens for a message nobody sends'],
  /* preload.cjs is the file `webPreferences.preload` names. preload.ts has drifted from it
   * before, and the drift was invisible precisely because the typed file looked right. */
  ['console/app/electron/preload.cjs', /^\s*ipcRenderer\.on\('deep-link:destination', handler\);$/m,
    'the preload Electron actually loads does not expose the deep link at all'],
  ['console/app/electron/preload.cjs', /^\s*deepLink: Object\.freeze\(\{$/m,
    'the deep link is not on the bridge object the renderer reads'],
  ['console/app/electron/preload.ts', /^\s*ipcRenderer\.on\('deep-link:destination', handler\);$/m,
    'preload.ts has drifted from the preload Electron loads'],
];

export function checkDestinationRouteWiring({ root, read = readFileSync } = {}) {
  if (typeof root !== 'string' || root.length === 0) throw new Error('checkDestinationRouteWiring requires an absolute repository root');
  if (WIRING.length === 0) throw new Error('checkDestinationRouteWiring: the anchor list is empty, so this would pass vacuously');
  const problems = [];
  const cache = new Map();
  for (const [relative, pattern, consequence] of WIRING) {
    if (!cache.has(relative)) {
      let text;
      try { text = read(resolve(root, relative), 'utf8'); } catch (error) { text = null; cache.set(relative, null); problems.push(`${relative}: could not be read (${error.message})`); }
      if (text !== null && text !== undefined) cache.set(relative, String(text).split('\r').join(''));
    }
    const text = cache.get(relative);
    if (text === null || text === undefined) continue;
    if (!pattern.test(text)) problems.push(`${relative}: ${pattern} is gone: ${consequence}`);
  }
  return { problems, anchors: WIRING.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = resolve(import.meta.dirname, '..', '..');
  const { problems, anchors } = checkDestinationRouteWiring({ root });
  if (problems.length > 0) {
    for (const problem of problems) console.error(`FAIL: ${problem}`);
    process.exit(1);
  }
  console.log(`PASS: all ${anchors} destination-route wiring anchors are present.`);
}
