#!/usr/bin/env node
/**
 * Deliberate red-then-green regression for the mounted narrated notification path.
 *
 * The guard this exercises -- `tests/contracts/narration.test.mjs`, "the mounted
 * notification path is narrated and preserves the styled message plus error priority"
 * -- was found RED on master and wrong: it pinned an exact one-line signature that a
 * later severity refactor had legitimately reshaped, so it reported a defect that was
 * not there while saying nothing about the behaviour its own title claims.
 *
 * A repaired guard nobody has watched fail is worth no more than the stale one it
 * replaced, so each break below removes exactly one guarded property, alone, and the
 * guard must go red for it. Breaking several at once would prove only that SOMETHING
 * among them is watched, which is the observation this repository has already been
 * bitten by.
 *
 * Two disciplines the cases here rest on:
 *   - Every break asserts its own bytes actually changed. An edit that never landed
 *     reads exactly like a guard that held, and that is how a case passes vacuously.
 *   - Where a wiring line is the subject, it is COMMENTED OUT rather than deleted,
 *     because a substring needle is satisfied by a commented-out call and that is how
 *     a wiring line usually dies.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const consoleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = resolve(consoleRoot, 'app/renderer/src/App.tsx');
const GUARD = 'tests/contracts/narration.test.mjs';
const TEST_NAME = 'the mounted notification path is narrated and preserves the styled message plus error priority';

/** Each case removes exactly one property the guard claims to protect. */
const CASES = [
  {
    id: 'declaration-renamed',
    why: 'narratedFire renamed, so the private class field the guard anchors on is gone',
    // Renamed rather than deleted: `narratedFire` is still a substring of the new
    // name, so a needle that is not anchored to a whole line survives this.
    from: '  private narratedFire = (',
    to: '  private narratedFireRenamed = (',
  },
  {
    id: 'severity-parameter-dropped',
    inMethod: true,
    why: 'the severity parameter is gone, so a caller can no longer ask for a severity',
    from: "    severityOrLegacyError: NotificationSeverity | boolean = 'warning',",
    to: '    unusedThirdArgument: boolean = false,',
  },
  {
    id: 'mount-wiring-commented-out',
    why: 'fire() is no longer narratedFire, so the notification path is not narrated at all',
    from: '    this.fire = this.narratedFire;',
    to: '    // this.fire = this.narratedFire;',
  },
  {
    id: 'styling-dropped',
    inMethod: true,
    why: 'the copy is no longer styled before it is narrated',
    from: '    const styled = styledDialog(this.messageStorage, this.currentCopyLanguage(), classifyDialogKind(title), title, body);',
    to: '    const styled = { heading: title, body };',
  },
  {
    id: 'narrator-given-raw-text',
    inMethod: true,
    why: 'the narrator speaks the raw title while the screen shows the styled heading',
    from: "    this.narrator.enqueue('notification', styled.body ? `${styled.heading}. ${styled.body}` : styled.heading, { isError: severity === 'error' });",
    to: "    this.narrator.enqueue('notification', body ? `${title}. ${body}` : title, { isError: severity === 'error' });",
  },
  {
    id: 'screen-given-raw-text',
    inMethod: true,
    why: 'the on-screen notification no longer receives the same styled text the narrator got',
    from: '    this.baseFire(styled.heading, styled.body);',
    to: '    this.baseFire(title, body);',
  },
  {
    id: 'error-priority-lost',
    inMethod: true,
    why: 'a legacy boolean true no longer normalises to error, so shell error notices lose priority',
    from: "      ? (severityOrLegacyError ? 'error' : 'warning')",
    to: "      ? 'warning'",
  },
];

const original = readFileSync(TARGET, 'utf8');
const restore = () => writeFileSync(TARGET, original);

/** The marker every in-method break is measured from. */
const METHOD = '  private narratedFire = (';

/**
 * Replaces one occurrence of `from`, choosing the copy inside `narratedFire` when the
 * case says so.
 *
 * This exists because a plain `String.replace` takes the FIRST occurrence, and two of
 * the lines below appear twice in App.tsx -- once in a sibling dialog path near the top
 * of the class and once in `narratedFire` some 2,200 lines later. Breaking the sibling
 * copy changes bytes, so the did-it-land assertion is satisfied, while leaving the line
 * this guard is about completely intact. Both such cases stayed green on the first run
 * for exactly that reason, and the guard was repaired to slice the method out rather
 * than matching the whole file.
 */
function applyBreak(source, testCase) {
  if (!testCase.inMethod) {
    const at = source.indexOf(testCase.from);
    return at === -1 ? source : source.slice(0, at) + testCase.to + source.slice(at + testCase.from.length);
  }
  const methodAt = source.indexOf(METHOD);
  if (methodAt === -1) return source;
  const at = source.indexOf(testCase.from, methodAt);
  if (at === -1) return source;
  return source.slice(0, at) + testCase.to + source.slice(at + testCase.from.length);
}

/** Runs the one guard and reports whether it went red. Never throws on a red run. */
function guardIsRed() {
  try {
    execFileSync(process.execPath, ['--test', '--test-name-pattern', TEST_NAME, GUARD], {
      cwd: consoleRoot,
      stdio: 'pipe',
    });
    return false;
  } catch {
    return true;
  }
}

let failedCases = 0;

// A guard that is red before anything is broken proves nothing about the breaks below.
if (guardIsRed()) {
  console.error('FAILED CASE baseline: the guard is already red before any break was planted');
  process.exit(1);
}
console.log('baseline: guard is GREEN on the untouched file');

for (const testCase of CASES) {
  const broken = applyBreak(original, testCase);
  if (broken === original) {
    // The break never landed. Reporting this as a passing case would be exactly the
    // vacuous pass these scripts exist to refuse.
    console.error(`FAILED CASE ${testCase.id}: the break did not change any bytes -- its anchor no longer matches the file`);
    failedCases += 1;
    continue;
  }
  writeFileSync(TARGET, broken);
  const red = guardIsRed();
  restore();
  if (readFileSync(TARGET, 'utf8') !== original) {
    console.error(`FAILED CASE ${testCase.id}: the file was not restored`);
    failedCases += 1;
    continue;
  }
  if (!red) {
    console.error(`FAILED CASE ${testCase.id}: the guard stayed GREEN -- ${testCase.why}`);
    failedCases += 1;
    continue;
  }
  console.log(`ok ${testCase.id}: RED when broken, and the file restored`);
}

// Green again on the restored file, so the run proves both directions rather than one.
if (guardIsRed()) {
  console.error('FAILED CASE restore: the guard did not return to GREEN on the restored file');
  failedCases += 1;
}

if (failedCases > 0) {
  console.error(`FAIL: ${failedCases} of ${CASES.length} planted breaks did not behave`);
  process.exit(1);
}
console.log(`PASS: ${CASES.length} planted breaks, each alone, each RED, and GREEN again on restore`);
