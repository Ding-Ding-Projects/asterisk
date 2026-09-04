#!/usr/bin/env node
/**
 * Deliberate red-then-green regression for the guards added while repairing the pages-site
 * inventory.
 *
 * Four things were broken at once and each had gone unnoticed for a different reason, so
 * each gets its own planted break here rather than a note saying the observation was made:
 *
 *  - the site feature registry sat on schema v1 with a `state` key while every consumer
 *    read v2 `status`, so `verify-inventories.mjs` refused the file and thirty-three site
 *    contract assertions compared `undefined` against a status;
 *  - `generate-completeness-matrix.mjs` owns that registry and the canonical completeness
 *    matrix, and its hand-written site status map had not been updated when six features
 *    shipped, so the matrix understated the site by thirty-six rows;
 *  - seventeen site contract files each hand-copied a six-name page list for a site with
 *    nine pages, so every "anywhere in the site" claim searched two thirds of it;
 *  - and exactly the six rows with no registry-status assertion of their own were exactly
 *    the six that drifted.
 *
 * Every case plants one break, asserts the break actually landed (an edit that silently
 * matched nothing reads identically to a guard that held), runs the check that should
 * notice, and requires it to go red. Files are restored from their original bytes after
 * each case and again in a `finally`, and the untouched tree must go green at the end.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const consoleRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(consoleRoot, '..');

const TRACKED = [
  'console/site/feature-registry.json',
  'console/scripts/generate-completeness-matrix.mjs',
  'console/site/tests/contracts/site-pages.mjs',
  'console/site/tests/contracts/registry-status.test.mjs',
  'console/site/tests/contracts/local-file-converter.test.mjs',
  'console/site/tests/contracts/ollama-suite-manager.test.mjs',
];
/* Porcelain status is two columns, index then worktree. A staged file with a clean
 * worktree ("M ") is safe: the bytes on disk are the bytes this script reads and restores.
 * An unstaged edit (" M") is not, because a crash between the write and the `finally`
 * would leave no copy of it anywhere. Only the second column is refused. */
const status = execFileSync('git', ['status', '--porcelain', '--', ...TRACKED], { cwd: repoRoot, encoding: 'utf8' });
const worktreeDirty = status.split('\n').filter((line) => line.length > 1 && line[1] !== ' ');
if (worktreeDirty.length > 0) {
  console.error('FAIL: these files have unstaged changes; refusing to plant breaks over work that exists nowhere else:');
  console.error(worktreeDirty.join('\n'));
  process.exit(1);
}

const abs = (relative) => resolve(repoRoot, relative);
const run = (command, args) => spawnSync(command, args, { cwd: consoleRoot, encoding: 'utf8', shell: process.platform === 'win32' });

const CHECKS = {
  siteContracts: () => run(process.execPath, ['--test', 'site/tests/contracts/registry-status.test.mjs']),
  converterContract: () => run(process.execPath, ['--test', 'site/tests/contracts/local-file-converter.test.mjs']),
  ollamaContract: () => run(process.execPath, ['--test', 'site/tests/contracts/ollama-suite-manager.test.mjs']),
  generatorCheck: () => run(process.execPath, ['scripts/generate-completeness-matrix.mjs', '--check']),
};

const CASES = [
  {
    name: 'the registry falls back to a schema-v1 `state` key, exactly as it was found',
    file: 'console/site/feature-registry.json',
    find: '"schemaVersion": 2,',
    replace: '"schemaVersion": 1,',
    check: 'siteContracts',
  },
  {
    name: 'one registry status is edited in the JSON alone, without the hand-written list',
    file: 'console/site/feature-registry.json',
    find: '"in-context-recovery": {\n      "status": "implemented-unverified",',
    replace: '"in-context-recovery": {\n      "status": "absent",',
    check: 'siteContracts',
  },
  {
    name: 'a registry row claims verified without an interaction record or a capture',
    file: 'console/site/feature-registry.json',
    find: '"collapsible-filters": {\n      "status": "implemented-unverified",',
    replace: '"collapsible-filters": {\n      "status": "verified",',
    check: 'siteContracts',
  },
  {
    name: 'the generator status map drifts from the checked-in registry, as it did for six rows',
    file: 'console/scripts/generate-completeness-matrix.mjs',
    find: "'in-context-recovery': 'implemented-unverified',",
    replace: "'in-context-recovery': 'absent',",
    check: 'generatorCheck',
  },
  {
    name: 'the page list goes back to naming six pages by hand',
    file: 'console/site/tests/contracts/site-pages.mjs',
    find: "export const PAGE_NAMES = readdirSync(resolve(siteRoot))\n  .filter((name) => name.endsWith('.html'))",
    replace: "export const PAGE_NAMES = ['index', 'product', 'documentation', 'downloads', 'status', 'settings'].map((n) => `${n}.html`)\n  .filter((name) => name.endsWith('.html'))",
    check: 'converterContract',
  },
  {
    name: 'the page discovery returns nothing at all, which would make every absence claim vacuous',
    file: 'console/site/tests/contracts/site-pages.mjs',
    find: "  .filter((name) => name.endsWith('.html'))",
    replace: "  .filter((name) => name.endsWith('.no-such-extension'))",
    check: 'converterContract',
  },
  {
    name: 'the converter row goes back to claiming no converter surface exists',
    file: 'console/site/feature-registry.json',
    find: 'site/converter.html renders a complete-looking converter',
    replace: 'No such converter surface exists on the site',
    check: 'converterContract',
  },
  {
    name: 'the Ollama row goes back to claiming no Ollama integration exists',
    file: 'console/site/feature-registry.json',
    find: 'site/ollama.html renders a complete-looking local Ollama manager',
    replace: 'No Ollama integration of any kind exists in the site',
    check: 'ollamaContract',
  },
  {
    name: 'a feature id is dropped from the hand-written status list',
    file: 'console/site/tests/contracts/registry-status.test.mjs',
    find: "  'support-tickets': 'absent',\n",
    replace: '',
    check: 'siteContracts',
  },
];

const originals = new Map(TRACKED.map((relative) => [relative, readFileSync(abs(relative), 'utf8')]));
const restoreAll = () => { for (const [relative, text] of originals) writeFileSync(abs(relative), text); };

let failures = 0;
try {
  for (const testCase of CASES) {
    const original = originals.get(testCase.file);
    assert.ok(original !== undefined, `case "${testCase.name}" names an untracked file: ${testCase.file}`);
    /* Anchors are written with \n; these files are stored CRLF in this checkout, so every
     * anchor is re-spelled in the file's own newline before it is looked for. The first
     * run of the sibling narratedFire script reported seven anchors occurring zero times
     * for exactly this reason, and the occurrence check below is what made that read as a
     * broken script rather than as seven guards that held. */
    const newline = original.includes('\r\n') ? '\r\n' : '\n';
    const find = newline === '\n' ? testCase.find : testCase.find.replaceAll('\n', newline);
    const replace = newline === '\n' ? testCase.replace : testCase.replace.replaceAll('\n', newline);
    const occurrences = original.split(find).length - 1;
    if (occurrences !== 1) {
      console.error(`FAILED CASE: "${testCase.name}" -- its anchor occurs ${occurrences} times in ${testCase.file}, not once. The break could not be placed exactly, so this case proves nothing.`);
      failures += 1;
      continue;
    }
    const broken = original.replace(find, replace);
    assert.notEqual(broken, original, `break "${testCase.name}" produced identical bytes`);
    writeFileSync(abs(testCase.file), broken);
    const result = CHECKS[testCase.check]();
    restoreAll();
    if (result.status === 0) {
      console.error(`FAILED CASE: "${testCase.name}" -- the break landed and ${testCase.check} still passed. That guard is not watching what it claims to.`);
      failures += 1;
    } else {
      console.log(`RED as required (${testCase.check}): ${testCase.name}`);
    }
  }
} finally {
  restoreAll();
}

for (const [name, check] of Object.entries(CHECKS)) {
  const result = check();
  if (result.status !== 0) {
    console.error(`FAILED: ${name} does not pass on the restored tree. Something in this run did not put a file back.`);
    console.error(result.stdout ?? '');
    console.error(result.stderr ?? '');
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`FAIL: ${failures} checks did not behave as required.`);
  process.exit(1);
}
console.log(`PASS: ${CASES.length} breaks planted one at a time, each red; all ${Object.keys(CHECKS).length} checks green on the restored tree.`);
