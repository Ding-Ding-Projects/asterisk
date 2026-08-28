#!/usr/bin/env node
/**
 * Deliberate red-then-green regression for the narratedFire half of
 * `console/tests/contracts/narration.test.mjs`.
 *
 * Why this script exists rather than a note saying the breaks were watched: the
 * assertions it guards had been failing on master, and the reason they went unnoticed
 * for as long as they did is that nobody could re-run the observation. Each case below
 * plants exactly one break in App.tsx, asserts the break actually landed (an edit that
 * silently matched nothing reads identically to a guard that held -- that is the trap
 * this project has already been caught by twice), runs the contract, and requires it to
 * go red. The file is restored from the original bytes after every case, and the
 * untouched tree must go green at the end.
 *
 * Nothing here is written by hand into App.tsx that could survive: the original bytes
 * are held in memory and written back in a `finally`, and the script refuses to start if
 * App.tsx is not clean in git, so an interrupted run cannot be mistaken for a source edit.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const consoleRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(consoleRoot, '..');
const APP = resolve(consoleRoot, 'app/renderer/src/App.tsx');
const TEST = 'tests/contracts/narration.test.mjs';

const status = execFileSync('git', ['status', '--porcelain', '--', 'console/app/renderer/src/App.tsx'], {
  cwd: repoRoot,
  encoding: 'utf8',
});
if (status.trim() !== '') {
  console.error('FAIL: App.tsx has uncommitted changes; refusing to plant breaks over unsaved work.');
  process.exit(1);
}

/**
 * Each case names the exact substring to replace and what it becomes. `find` must occur
 * exactly once, so a break can never land in a neighbour by accident.
 */
const CASES = [
  {
    name: 'the field is renamed, so the slice cannot be found at all',
    find: '\n  private narratedFire = (\n',
    replace: '\n  private narratedFireRenamed = (\n',
  },
  {
    name: 'the severity parameter loses its type union',
    find: "    severityOrLegacyError: NotificationSeverity | boolean = 'warning',\n",
    replace: '    severityOrLegacyError: boolean = false,\n',
  },
  {
    name: 'the severity parameter defaults to info instead of warning',
    find: "severityOrLegacyError: NotificationSeverity | boolean = 'warning',",
    replace: "severityOrLegacyError: NotificationSeverity | boolean = 'info',",
  },
  {
    name: 'the legacy boolean call shape stops meaning error',
    find: "      ? (severityOrLegacyError ? 'error' : 'warning')\n",
    replace: "      ? (severityOrLegacyError ? 'warning' : 'info')\n",
  },
  /* The next three anchors carry a neighbouring line each. Their own line is not unique
   * in App.tsx -- the `classifyDialogKind` styling call occurs twice and the styled
   * `baseFire` call occurs twice -- which is the same duplication that made the old
   * whole-file needles say nothing about this function in particular. */
  {
    name: 'the copy is no longer styled before it is spoken',
    find: '    const styled = styledDialog(this.messageStorage, this.currentCopyLanguage(), classifyDialogKind(title), title, body);\n    const message = styled.body ?',
    replace: '    const styled = { heading: title, body };\n    const message = styled.body ?',
  },
  {
    name: 'the narrator is handed the raw text instead of the styled text',
    find: "    this.narrator.enqueue('notification', styled.body ? `${styled.heading}. ${styled.body}` : styled.heading, { isError: severity === 'error' });\n",
    replace: "    this.narrator.enqueue('notification', body ? `${title}. ${body}` : title, { isError: severity === 'error' });\n",
  },
  {
    name: 'error priority is dropped on the way to the narrator',
    find: "{ isError: severity === 'error' });",
    replace: '{ isError: false });',
  },
  {
    name: 'the toast is never fired, so the notice is spoken and never shown',
    find: "{ isError: severity === 'error' });\n    this.baseFire(styled.heading, styled.body);\n",
    replace: "{ isError: severity === 'error' });\n",
  },
  {
    name: 'the toast call is commented out rather than removed',
    find: "{ isError: severity === 'error' });\n    this.baseFire(styled.heading, styled.body);\n",
    replace: "{ isError: severity === 'error' });\n    // this.baseFire(styled.heading, styled.body);\n",
  },
];

const runContract = () => spawnSync(process.execPath, ['--test', TEST], {
  cwd: consoleRoot,
  encoding: 'utf8',
});

const original = readFileSync(APP, 'utf8');
/* App.tsx is stored CRLF in this checkout. Anchors are written with `\n` because that is
 * what a person reads, so every one of them has to be re-spelled in the file's own
 * newline before it is looked for. Written down because the first run of this script
 * reported seven anchors occurring zero times, and the occurrence check above is the only
 * reason that read as a broken script rather than as seven guards that held. */
const NEWLINE = original.includes('\r\n') ? '\r\n' : '\n';
const inFileNewline = (text) => (NEWLINE === '\n' ? text : text.replaceAll('\n', NEWLINE));
let failures = 0;

try {
  for (const testCase of CASES) {
    testCase.find = inFileNewline(testCase.find);
    testCase.replace = inFileNewline(testCase.replace);
    const occurrences = original.split(testCase.find).length - 1;
    if (occurrences !== 1) {
      console.error(`FAILED CASE: "${testCase.name}" -- its anchor occurs ${occurrences} times in App.tsx, not once. The break could not be placed exactly, so this case proves nothing.`);
      failures += 1;
      continue;
    }
    const broken = original.replace(testCase.find, testCase.replace);
    assert.notEqual(broken, original, `break "${testCase.name}" produced identical bytes`);
    writeFileSync(APP, broken);
    const result = runContract();
    writeFileSync(APP, original);
    if (result.status === 0) {
      console.error(`FAILED CASE: "${testCase.name}" -- the break landed and the contract still passed. That assertion is not watching what it claims to.`);
      failures += 1;
    } else {
      console.log(`RED as required: ${testCase.name}`);
    }
  }
} finally {
  writeFileSync(APP, original);
}

const restored = runContract();
if (restored.status !== 0) {
  console.error('FAILED: the restored tree does not pass. Something in this run did not put App.tsx back.');
  console.error(restored.stdout);
  failures += 1;
} else {
  console.log('GREEN on restore.');
}

if (failures > 0) {
  console.error(`FAIL: ${failures} of ${CASES.length + 1} checks did not behave as required.`);
  process.exit(1);
}
console.log(`PASS: ${CASES.length} breaks planted one at a time, each red; untouched tree green.`);
