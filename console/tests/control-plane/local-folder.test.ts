/**
 * Opening the application-data folder in the platform's file manager -- Support
 * Tickets' one real action. `resolutionFor()` in `support-tickets.ts` has always
 * promised "This console will open it for you"; nothing ever did until this module.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { openFolderInFileManager, type FolderOpenDeps } from '../../control-plane/local-folder.js';
import type { SpawnOutcome } from '../../control-plane/local-launch.js';

function deps(overrides: Partial<FolderOpenDeps> = {}): FolderOpenDeps & { calls: { executable: string; args: readonly string[] }[]; created: string[] } {
  const calls: { executable: string; args: readonly string[] }[] = [];
  const created: string[] = [];
  const existing = new Set(['C:\\data\\ding-pbx-console']);
  return {
    platform: 'win32' as NodeJS.Platform,
    exists: (path) => existing.has(path),
    ensureDirectory: (path) => { created.push(path); existing.add(path); },
    spawnDetached: async (executable, args) => { calls.push({ executable, args }); return { ok: true } as SpawnOutcome; },
    calls,
    created,
    ...overrides,
  };
}

test('opens an existing folder in explorer.exe with no shell, exactly the one path and nothing else', () => {
  const d = deps();
  return openFolderInFileManager('C:\\data\\ding-pbx-console', d).then((outcome) => {
    assert.deepEqual(outcome, { ok: true });
    assert.equal(d.calls.length, 1);
    assert.equal(d.calls[0].executable, 'explorer.exe');
    assert.deepEqual(d.calls[0].args, ['C:\\data\\ding-pbx-console']);
    assert.deepEqual(d.created, [], 'created a folder that was already there');
  });
});

test('a folder that does not exist yet is created first, then opened', () => {
  const d = deps();
  return openFolderInFileManager('C:\\data\\ding-pbx-console\\new', d).then((outcome) => {
    assert.deepEqual(outcome, { ok: true });
    assert.deepEqual(d.created, ['C:\\data\\ding-pbx-console\\new']);
    assert.equal(d.calls[0].args[0], 'C:\\data\\ding-pbx-console\\new');
  });
});

test('a folder that still does not exist after trying to create it is refused, never opened', () => {
  const d = deps({ ensureDirectory: () => { /* deliberately does nothing */ } });
  return openFolderInFileManager('C:\\nope', d).then((outcome) => {
    assert.equal(d.calls.length, 0);
    assert.ok(!outcome.ok);
    if (!outcome.ok) assert.match(outcome.reason, /does not exist/u);
  });
});

test('an empty path is refused before anything is created or opened', () => {
  const d = deps();
  return openFolderInFileManager('   ', d).then((outcome) => {
    assert.equal(d.calls.length, 0);
    assert.equal(d.created.length, 0);
    assert.ok(!outcome.ok);
  });
});

test('a platform with no known file manager is refused by name rather than guessing one', () => {
  const d = deps({ platform: 'aix' as NodeJS.Platform });
  return openFolderInFileManager('C:\\data\\ding-pbx-console', d).then((outcome) => {
    assert.equal(d.calls.length, 0);
    assert.ok(!outcome.ok);
    if (!outcome.ok) assert.match(outcome.reason, /not supported on this platform/u);
  });
});

test('macOS and Linux use their own real openers, not explorer.exe', () => {
  const mac = deps({ platform: 'darwin' as NodeJS.Platform });
  const linux = deps({ platform: 'linux' as NodeJS.Platform });
  return Promise.all([
    openFolderInFileManager('C:\\data\\ding-pbx-console', mac).then(() => assert.equal(mac.calls[0].executable, 'open')),
    openFolderInFileManager('C:\\data\\ding-pbx-console', linux).then(() => assert.equal(linux.calls[0].executable, 'xdg-open')),
  ]);
});

test('when the file manager itself fails to start, that failure is reported rather than hidden behind an "opened" result', () => {
  const d = deps({ spawnDetached: async () => ({ ok: false, reason: 'no shell associated' }) });
  return openFolderInFileManager('C:\\data\\ding-pbx-console', d).then((outcome) => {
    assert.ok(!outcome.ok);
    if (!outcome.ok) assert.equal(outcome.reason, 'no shell associated');
  });
});
