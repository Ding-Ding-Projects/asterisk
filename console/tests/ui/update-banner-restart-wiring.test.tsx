/**
 * Interaction Chut for the ready-update action.  It executes the exact helper used
 * by UpdateBanner's button, then traces its production IPC name through both preload
 * variants into the single main-process handler.  The checks intentionally cover
 * refusal, offline IPC rejection, and the one-call latch boundary.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { requestReadyUpdateInstall, restoreUpdateRestartFocus } from '../../app/renderer/src/UpdateBanner.js';

const source = async (path: string) => (await readFile(new URL(path, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');

test('the rendered restart action reaches the production updater bridge exactly once', async () => {
  let calls = 0;
  const updater = {
    restartToInstall: async () => { calls += 1; return { ok: true } as const; },
  } as never;
  const result = await requestReadyUpdateInstall(updater, { restartPending: false, unsavedDraftCount: 0 });
  assert.deepEqual(result, { ok: true });
  assert.equal(calls, 1, 'the real rendered action did not send exactly one install request');
});

test('unsaved drafts and an already-pending restart are refused before IPC', async () => {
  let calls = 0;
  const updater = { restartToInstall: async () => { calls += 1; return { ok: true } as const; } } as never;
  for (const status of [{ restartPending: false, unsavedDraftCount: 1 }, { restartPending: true, unsavedDraftCount: 0 }]) {
    const result = await requestReadyUpdateInstall(updater, status);
    assert.equal(result.ok, false);
  }
  assert.equal(calls, 0, 'a local refusal still sent an install request');
});

test('an offline or refused IPC request remains visible as a restart failure', async () => {
  const updater = { restartToInstall: async () => { throw new Error('desktop bridge offline'); } } as never;
  const result = await requestReadyUpdateInstall(updater, { restartPending: false, unsavedDraftCount: 0 });
  assert.deepEqual(result, { ok: false, reason: 'Could not ask the desktop updater to start the installer: desktop bridge offline' });
});

test('a refused restart restores focus to its exact Retry action', async () => {
  let focused = 0;
  restoreUpdateRestartFocus({ focus: () => { focused += 1; } } as HTMLButtonElement);
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  assert.equal(focused, 1);
});

test('the production bridge and main process receive the one real install request', async () => {
  const [banner, typedPreload, commonJsPreload, main, runtime] = await Promise.all([
    source('../../app/renderer/src/UpdateBanner.tsx'),
    source('../../app/electron/preload.ts'),
    source('../../app/electron/preload.cjs'),
    source('../../app/electron/main.ts'),
    source('../../app/electron/updater-runtime.ts'),
  ]);
  assert.match(banner, /requestReadyUpdateInstall\(bridge\.updater, status\)/u);
  for (const preload of [typedPreload, commonJsPreload]) assert.match(preload, /restartToInstall:\s*\(\)\s*=>\s*ipcRenderer\.invoke\('updater:restart-to-install'\)/u);
  assert.match(main, /ipcMain\.handle\('updater:restart-to-install', async \(\): Promise<UpdaterRestartResult> => \{/u);
  assert.match(main, /if \(installingLatch\) return installingLatch;/u, 'the main-process one-request latch is missing');
  assert.match(main, /const result = await launchInstaller\(updaterState\.downloadedPath!\);/u);
  assert.match(main, /publishUpdaterState\(installerLaunchFailed\(updaterState, result\.reason\)\);/u, 'a launch refusal collapsed the ready update into a failed check');
  assert.doesNotMatch(main, /publishUpdaterState\(updateFailed\(updaterState, result\.reason\)\);/u, 'a launch refusal must preserve the ready update for direct retry');
  assert.match(banner, /Installer launch failed: \{status\.lastError\}\. The verified update is still ready; choose Restart to install update to try again\./u);
  assert.match(banner, /ref=\{restartButtonRef\}/u);
  assert.match(banner, /restoreUpdateRestartFocus\(restartButtonRef\.current\);/u);
  assert.match(runtime, /spawn\(installerPath, \[\], \{ detached: true, stdio: 'ignore', windowsHide: false \}\)/u, 'Squirrel Setup.exe was put back into invisible silent mode');
  assert.doesNotMatch(runtime, /spawn\(installerPath, \['--silent'\]/u, 'the installer would again appear to do nothing');
});
