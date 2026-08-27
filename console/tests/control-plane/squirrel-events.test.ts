import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSquirrelEvent, type SquirrelHostess } from '../../app/electron/squirrel-events.js';

function host(argv: string[], platform = 'win32') {
  const ran: Array<{ exe: string; args: string[] }> = [];
  let quits = 0;
  const hostess: SquirrelHostess = {
    platform,
    argv,
    /* Forward slashes on purpose. Node resolves them correctly on Windows, and a
     * backslash in a source literal is the one character that does not survive being
     * written through a shell — it silently collapses and the path becomes nonsense. */
    execPath: 'C:/Users/example/AppData/Local/ding-pbx-console/app-0.1.0/Material Asterisk.exe',
    runUpdater: (exe, args) => { ran.push({ exe, args: [...args] }); },
    quit: () => { quits += 1; },
  };
  return { hostess, ran, quits: () => quits };
}

test('an ordinary launch is not a Squirrel event and must not quit', () => {
  const h = host(['electron.exe']);
  const result = handleSquirrelEvent(h.hostess);
  assert.equal(result.handled, false);
  assert.equal(result.action, 'not-squirrel');
  assert.equal(h.quits(), 0, 'a normal launch was terminated');
});

test('install creates shortcuts through Update.exe and quits immediately', () => {
  const h = host(['app.exe', '--squirrel-install', '0.1.0']);
  const result = handleSquirrelEvent(h.hostess);
  assert.equal(result.handled, true);
  assert.equal(result.action, 'shortcuts-created');
  assert.equal(h.ran.length, 1);
  assert.match(h.ran[0].exe, /Update\.exe$/u);
  assert.deepEqual(h.ran[0].args, ['--createShortcut', 'Material Asterisk.exe']);
  assert.equal(h.quits(), 1, 'it did not quit, so Squirrel would wait out its timeout');
});

test('Update.exe is resolved one level above the versioned app folder', () => {
  const h = host(['app.exe', '--squirrel-install', '0.1.0']);
  handleSquirrelEvent(h.hostess);
  /* Separator-agnostic: node joins with the host's separator, and the point of the
   * assertion is the parent directory, not which slash the platform happens to use. */
  const normalised = h.ran[0].exe.split(/[/\\]/u).slice(-2).join('/');
  assert.equal(normalised, 'ding-pbx-console/Update.exe', `Update.exe resolved to the wrong place: ${h.ran[0].exe}`);
});

test('update recreates shortcuts and quits', () => {
  const h = host(['app.exe', '--squirrel-updated', '0.2.0']);
  const result = handleSquirrelEvent(h.hostess);
  assert.equal(result.action, 'shortcuts-created');
  assert.deepEqual(h.ran[0].args, ['--createShortcut', 'Material Asterisk.exe']);
  assert.equal(h.quits(), 1);
});

test('uninstall removes shortcuts and quits', () => {
  const h = host(['app.exe', '--squirrel-uninstall', '0.1.0']);
  const result = handleSquirrelEvent(h.hostess);
  assert.equal(result.action, 'shortcuts-removed');
  assert.deepEqual(h.ran[0].args, ['--removeShortcut', 'Material Asterisk.exe']);
  assert.equal(h.quits(), 1);
});

test('an obsolete version quits without touching shortcuts', () => {
  const h = host(['app.exe', '--squirrel-obsolete', '0.1.0']);
  const result = handleSquirrelEvent(h.hostess);
  assert.equal(result.action, 'quit');
  assert.equal(h.ran.length, 0, 'an obsolete build removed shortcuts the new build needs');
  assert.equal(h.quits(), 1);
});

test('first run is a real person launching the app and must continue', () => {
  const h = host(['app.exe', '--squirrel-firstrun']);
  const result = handleSquirrelEvent(h.hostess);
  assert.equal(result.handled, false, 'the first launch after installing was killed');
  assert.equal(result.action, 'first-run');
  assert.equal(h.quits(), 0);
});

test('an unrecognised squirrel argument quits rather than hanging for the timeout', () => {
  const h = host(['app.exe', '--squirrel-something-newer']);
  const result = handleSquirrelEvent(h.hostess);
  assert.equal(result.handled, true);
  assert.equal(h.quits(), 1);
});

test('non-Windows platforms are unaffected', () => {
  const h = host(['app.exe', '--squirrel-install', '0.1.0'], 'darwin');
  const result = handleSquirrelEvent(h.hostess);
  assert.equal(result.handled, false);
  assert.equal(h.quits(), 0);
});
