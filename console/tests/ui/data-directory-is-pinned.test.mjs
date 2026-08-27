/**
 * Contract: the data directory does not follow the product name.
 *
 * The application was renamed. Electron derives `userData` from the packaged product name,
 * so a rename moves the data directory unless something stops it — and when it moves,
 * every stored profile, credential, setting and local history on every existing install is
 * still sitting in the old folder, invisible, while the application reports itself freshly
 * installed. Nothing errors. Nothing logs. The user just opens a console that has forgotten
 * them, and the only symptom is that everything they had is gone.
 *
 * `main.ts` therefore pins `userData` to the name the application SHIPPED under, and that
 * literal is deliberately out of step with what the product is now called.
 *
 * Which makes it look exactly like something left behind by an incomplete rename. It is the
 * one string in this repository that a careful person tidying up would confidently break.
 * That is what this guard is for: it fails if the pin disappears, if it stops running before
 * anything reads the path, and — most importantly — if somebody helpfully updates it to
 * match the current name.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/* Normalised: this is a CRLF checkout, and a pattern assuming one newline form matches
 * nothing here — which for the ordering assertion below would mean passing forever. */
const main = readFileSync(resolve(root, 'app', 'electron', 'main.ts'), 'utf8').replace(/\r\n/gu, '\n');
const lines = main.split('\n');

/* Anchored to a line, never a bare substring: a substring is satisfied by a commented-out
 * declaration, and by a renamed symbol that still contains the old name. */
const lineIndex = (pattern) => lines.findIndex((line) => pattern.test(line));

test('the shipped data directory is still pinned', () => {
  const declaration = lineIndex(/^\s*const SHIPPED_DATA_DIRECTORY\s*=/u);
  assert.notEqual(declaration, -1, 'the data-directory pin is gone; a rename will now move every existing install\'s data');
});

test('it is pinned to the name the application shipped under, not the name it displays', () => {
  const declaration = lines[lineIndex(/^\s*const SHIPPED_DATA_DIRECTORY\s*=/u)];
  assert.match(
    declaration,
    /'Ding PBX Console'/u,
    'the pin was changed to match the current product name. That is the mistake it exists to prevent: '
    + 'it must keep naming the directory users already have, however out of date that looks.',
  );
});

test('the pin is applied as an absolute path, not merely declared', () => {
  const applied = lineIndex(/^\s*app\.setPath\('userData',/u);
  assert.notEqual(applied, -1, 'SHIPPED_DATA_DIRECTORY is declared but nothing calls app.setPath, so it governs nothing');
  const pathConstruction = lineIndex(/^\s*const shippedUserDataPath\s*=\s*join\(app\.getPath\('appData'\), SHIPPED_DATA_DIRECTORY\);/u);
  assert.notEqual(pathConstruction, -1, 'the shipped directory must be constructed beneath Electron\'s absolute appData root');
  assert.match(lines[applied], /shippedUserDataPath/u, 'setPath does not use the absolute path built from the pinned constant');
  assert.doesNotMatch(main, /^\s*app\.setPath\('userData', SHIPPED_DATA_DIRECTORY\);/mu, 'the relative folder label was passed directly to Electron');
});

test('the pin runs before anything reads the path', () => {
  /* Ordering is the whole mechanism. A setPath after the first getPath leaves every earlier
   * reader holding the moved directory, which is the same failure with extra steps. */
  const applied = lineIndex(/^\s*app\.setPath\('userData',/u);
  const firstRead = lines.findIndex((line) => /app\.getPath\('userData'\)/u.test(line));
  assert.notEqual(firstRead, -1, 'nothing reads userData at all any more; this guard needs revisiting');
  assert.ok(
    applied < firstRead,
    `app.setPath runs at line ${applied + 1}, after the first read at line ${firstRead + 1} — everything before it gets the moved directory`,
  );
});

test('the task-only probe override is narrower and runs after the shipped pin', () => {
  const shippedPin = lineIndex(/^\s*app\.setPath\('userData', shippedUserDataPath\);/u);
  const probeCondition = lineIndex(/^\s*if \(requestedProbeUserData\) \{/u);
  const probeOverride = lines.findIndex((line, index) => index > probeCondition && /^\s*app\.setPath\('userData', resolvePath\(requestedProbeUserData\)\);/u.test(line));
  assert.notEqual(probeCondition, -1, 'the task-only probe boundary disappeared');
  assert.notEqual(probeOverride, -1, 'the probe no longer receives its isolated user-data path');
  assert.ok(shippedPin < probeCondition, 'the normal installed directory must be pinned before probe handling');
  assert.ok(probeCondition < probeOverride, 'the probe override must stay inside its explicit task-only boundary');
});
