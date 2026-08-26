/**
 * Real editor detection and launch.
 *
 * The pure decision logic (`detectEditors`, `chosenEditor`, `planLaunch`) already has a
 * full suite in `tests/ui/external-editor.test.tsx` and is untouched here. What matters
 * in THIS file is the wiring around it: does `openInEditor` actually resolve a real
 * candidate and actually spawn it, using the console's own persisted choice rather than
 * anything a caller hands it directly. A detection helper that returns the right shape
 * is exactly what passed before this file existed while the feature did nothing at all
 * -- see the task brief -- so every test here goes through the same entry points the
 * IPC handlers in `main.ts` call, with a fake filesystem/PATH and a fake spawn, never
 * the pure catalog functions directly.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  detectInstalledEditors, openInEditor, probeExecutable, readEditorSettingsSnapshot,
  resolveCandidate, isPathCandidate, expandEnvironmentPath,
  type ProbeEnvironment,
} from '../../control-plane/editor-launch.js';
import { VS_CODE, EDITOR_SETTING, CUSTOM_EDITOR_SETTING, CUSTOM_EDITOR_ID } from '../../shared/editor-catalog.js';
import type { SpawnDetached, SpawnOutcome } from '../../control-plane/local-launch.js';

const WIN = 'win32' as NodeJS.Platform;

function deps(files: Iterable<string>, env: Record<string, string | undefined> = {}): ProbeEnvironment {
  /* Case-insensitive, matching a real Windows filesystem (and real PATHEXT, which is
   * conventionally uppercase) -- a case-sensitive fake here would fail candidates that
   * a real machine resolves fine, which is a bug in the fixture, not in the code under
   * test. */
  const set = new Set([...files].map((f) => f.toLowerCase()));
  return {
    platform: WIN,
    env: { PATH: 'C:\\bin;C:\\also', PATHEXT: '.com;.exe;.cmd', ...env },
    exists: (path) => set.has(path.toLowerCase()),
  };
}

function recordingSpawn(outcome: SpawnOutcome = { ok: true }): { spawn: SpawnDetached; calls: { executable: string; args: readonly string[] }[] } {
  const calls: { executable: string; args: readonly string[] }[] = [];
  const spawn: SpawnDetached = async (executable, args) => { calls.push({ executable, args }); return outcome; };
  return { spawn, calls };
}

/* --- candidate resolution ---------------------------------------------------------- */

test('a bare PATH command resolves through PATHEXT, extension and all', () => {
  const resolved = resolveCandidate('code', deps(['C:\\bin\\code.cmd']));
  assert.equal(resolved, 'C:\\bin\\code.cmd');
});

test('PATH directories are tried in order', () => {
  const resolved = resolveCandidate('code', deps(['C:\\also\\code.cmd']));
  assert.equal(resolved, 'C:\\also\\code.cmd');
});

test('an %ENV%-templated absolute fallback is expanded before the existence check', () => {
  const resolved = resolveCandidate(
    '%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\bin\\code.cmd',
    deps(['C:\\Users\\a\\AppData\\Local\\Programs\\Microsoft VS Code\\bin\\code.cmd'], { LOCALAPPDATA: 'C:\\Users\\a\\AppData\\Local' }),
  );
  assert.equal(resolved, 'C:\\Users\\a\\AppData\\Local\\Programs\\Microsoft VS Code\\bin\\code.cmd');
});

test('nothing on disk resolves to nothing, never a guess', () => {
  assert.equal(resolveCandidate('code', deps([])), undefined);
  assert.equal(resolveCandidate('%LOCALAPPDATA%\\x\\code.cmd', deps([], { LOCALAPPDATA: 'C:\\x' })), undefined);
});

test('an absolute custom path is checked directly, not searched on PATH', () => {
  assert.equal(resolveCandidate('C:\\tools\\ed.exe', deps(['C:\\tools\\ed.exe'])), 'C:\\tools\\ed.exe');
  assert.equal(resolveCandidate('C:\\tools\\ed.exe', deps([])), undefined);
});

test('path-shaped vs bare-command candidates are told apart correctly', () => {
  assert.equal(isPathCandidate('code'), false);
  assert.equal(isPathCandidate('C:\\tools\\ed.exe'), true);
  assert.equal(isPathCandidate('%LOCALAPPDATA%\\ed.exe'), true);
  assert.equal(isPathCandidate('subl'), false);
});

test('probeExecutable matches the external-editor.ts Probe contract: one candidate in, one boolean out', () => {
  const environment = deps(['C:\\bin\\code.cmd']);
  assert.equal(probeExecutable('code', environment), true);
  assert.equal(probeExecutable('subl', environment), false);
});

test('an unmatched %VAR% is left untouched rather than expanding to something else', () => {
  assert.equal(expandEnvironmentPath('%NOPE%\\x', {}), '%NOPE%\\x');
});

/* --- real detection replaces the static list --------------------------------------- */

test('detection reflects only what is actually present, never the full static catalog', () => {
  const found = detectInstalledEditors(deps(['C:\\bin\\code.cmd']));
  assert.deepEqual(found.map((f) => f.definition.id), ['vscode']);
});

test('with nothing installed, detection finds nothing', () => {
  assert.deepEqual(detectInstalledEditors(deps([])), []);
});

test('several real installs are all reflected', () => {
  const found = detectInstalledEditors(deps(['C:\\bin\\code.cmd', 'C:\\bin\\subl.exe']));
  assert.deepEqual(found.map((f) => f.definition.id).sort(), ['sublime', 'vscode']);
});

/* --- openInEditor: the actual launch, not the plan ---------------------------------- */

test('the persisted choice is re-detected and actually spawned, with the workspace-root args', () => {
  const { spawn, calls } = recordingSpawn();
  return openInEditor(
    { [EDITOR_SETTING]: 'vscode' },
    { kind: 'folder', path: 'C:\\data\\ding-pbx-console' },
    deps(['C:\\bin\\code.cmd']),
    spawn,
  ).then((outcome) => {
    assert.deepEqual(outcome, { ok: true });
    assert.equal(calls.length, 1, 'openInEditor never actually spawned anything');
    assert.equal(calls[0].executable, 'C:\\bin\\code.cmd', 'spawned the bare unresolved "code" rather than the real file Windows can run');
    assert.deepEqual(calls[0].args, [...VS_CODE.folderArgs, 'C:\\data\\ding-pbx-console']);
  });
});

test('a file target gets the file arguments, not the folder ones', () => {
  const { spawn, calls } = recordingSpawn();
  return openInEditor({ [EDITOR_SETTING]: 'vscode' }, { kind: 'file', path: 'C:\\a b\\pjsip.conf' }, deps(['C:\\bin\\code.cmd']), spawn)
    .then(() => { assert.deepEqual(calls[0].args, ['C:\\a b\\pjsip.conf']); });
});

test('with no persisted choice, nothing is spawned and the refusal names the target', () => {
  const { spawn, calls } = recordingSpawn();
  return openInEditor({}, { kind: 'folder', path: 'C:\\exports' }, deps(['C:\\bin\\code.cmd']), spawn).then((outcome) => {
    assert.equal(calls.length, 0);
    assert.ok(!outcome.ok);
    if (!outcome.ok) {
      assert.ok(outcome.message.includes('C:\\exports'));
      assert.equal(outcome.downloadUrl, VS_CODE.downloadUrl);
    }
  });
});

test('a choice that is no longer installed refuses rather than launching something else', () => {
  const { spawn, calls } = recordingSpawn();
  return openInEditor({ [EDITOR_SETTING]: 'sublime' }, { kind: 'folder', path: 'C:\\exports' }, deps(['C:\\bin\\code.cmd']), spawn).then((outcome) => {
    assert.equal(calls.length, 0, 'launched an editor the person never chose');
    assert.ok(!outcome.ok);
  });
});

test('a choice that vanished between detection and launch is refused by name, not silently launched', () => {
  /* Simulates the editor being uninstalled in the moment between the picker loading and
   * the open action firing. `openInEditor` re-runs detection and then re-resolves the
   * chosen candidate a second time right before spawning (see its doc comment); a fixed
   * snapshot of "what exists" cannot tell those two calls apart, so this fixture is
   * stateful -- present for exactly the first existence check (detection finding
   * "code.cmd" on PATH) and gone for every one after (the pre-spawn re-check). */
  let checks = 0;
  const vanishesAfterDetection: ProbeEnvironment = {
    platform: WIN,
    env: { PATH: 'C:\\bin', PATHEXT: '.cmd' },
    exists: (path) => {
      checks += 1;
      return checks === 1 && path.toLowerCase() === 'c:\\bin\\code.cmd';
    },
  };
  const { spawn, calls } = recordingSpawn();
  return openInEditor({ [EDITOR_SETTING]: 'vscode' }, { kind: 'folder', path: 'C:\\exports' }, vanishesAfterDetection, spawn).then((outcome) => {
    assert.equal(calls.length, 0);
    assert.ok(!outcome.ok);
    if (!outcome.ok) assert.match(outcome.message, /no longer where it was found/u);
  });
});

test('the custom editor launches the exact saved executable, with no folder/file arguments beyond the target', () => {
  const { spawn, calls } = recordingSpawn();
  const snapshot = {
    [EDITOR_SETTING]: CUSTOM_EDITOR_ID,
    [CUSTOM_EDITOR_SETTING]: JSON.stringify({ name: 'My editor', executable: 'C:\\tools\\ed.exe' }),
  };
  return openInEditor(snapshot, { kind: 'file', path: 'C:\\a.conf' }, deps(['C:\\tools\\ed.exe']), spawn).then((outcome) => {
    assert.deepEqual(outcome, { ok: true });
    assert.equal(calls[0].executable, 'C:\\tools\\ed.exe');
    assert.deepEqual(calls[0].args, ['C:\\a.conf']);
  });
});

test('a custom executable that is no longer on disk is refused, never spawned', () => {
  const { spawn, calls } = recordingSpawn();
  const snapshot = {
    [EDITOR_SETTING]: CUSTOM_EDITOR_ID,
    [CUSTOM_EDITOR_SETTING]: JSON.stringify({ name: 'My editor', executable: 'C:\\tools\\ed.exe' }),
  };
  return openInEditor(snapshot, { kind: 'file', path: 'C:\\a.conf' }, deps([]), spawn).then((outcome) => {
    assert.equal(calls.length, 0);
    assert.ok(!outcome.ok);
  });
});

test('an empty target path is refused before anything is spawned', () => {
  const { spawn, calls } = recordingSpawn();
  return openInEditor({ [EDITOR_SETTING]: 'vscode' }, { kind: 'file', path: '   ' }, deps(['C:\\bin\\code.cmd']), spawn).then((outcome) => {
    assert.equal(calls.length, 0);
    assert.ok(!outcome.ok);
  });
});

test('a spawn failure is reported by name rather than swallowed as success', () => {
  const { spawn, calls } = recordingSpawn({ ok: false, reason: 'ENOENT' });
  return openInEditor({ [EDITOR_SETTING]: 'vscode' }, { kind: 'folder', path: 'C:\\exports' }, deps(['C:\\bin\\code.cmd']), spawn).then((outcome) => {
    assert.equal(calls.length, 1);
    assert.ok(!outcome.ok);
    if (!outcome.ok) assert.match(outcome.message, /ENOENT/u);
  });
});

/* --- reading the console's own persisted settings ----------------------------------- */

test('readEditorSettingsSnapshot reads the exact file settings.write produces', () => {
  const dir = mkdtempSync(join(tmpdir(), 'editor-settings-'));
  try {
    writeFileSync(join(dir, 'settings.json'), JSON.stringify({ [EDITOR_SETTING]: 'vscode', other: 'x' }));
    assert.deepEqual(readEditorSettingsSnapshot(dir), { [EDITOR_SETTING]: 'vscode', other: 'x' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a missing settings file reads as an empty snapshot rather than throwing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'editor-settings-'));
  try {
    assert.deepEqual(readEditorSettingsSnapshot(join(dir, 'nested', 'nope')), {});
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a corrupt settings file reads as empty, failing closed rather than throwing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'editor-settings-'));
  try {
    writeFileSync(join(dir, 'settings.json'), '{ not json');
    assert.deepEqual(readEditorSettingsSnapshot(dir), {});
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
