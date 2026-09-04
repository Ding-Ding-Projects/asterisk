#!/usr/bin/env node
/*
 * Breaks exactly one guarded property at a time in `evidence-integrity.mjs` and
 * `documentation-agreement.mjs`, runs the negative regression, and requires it to notice.
 * Restores after each case and requires green again, so no case can pass because an earlier
 * one was never undone.
 *
 * `negative-evidence-integrity.mjs` plants lies in DATA and proves the checks refuse them.
 * That is the wrong way round for one question: it cannot tell whether each individual check
 * is the thing doing the refusing, or whether a neighbour is catching the same lie first. A
 * check whose every case is also caught by the check beside it can be deleted with the suite
 * staying green, which is a guard nobody is watching wearing the appearance of one.
 *
 * It earned its keep immediately. Of the first eleven breaks, two stayed green: the
 * duplicate-capture case was written as `throw inside try, match the message in catch`, and
 * the thrown "...stayed green" message itself contained the substring the catch matched on,
 * so it printed RED whether or not the check existed; and the "documentation says the feature
 * is absent" case was shadowed by the registry-agreement check, which fired first because only
 * the article had been moved. Both were fixed in the regression, not here.
 *
 * NOT wired into `npm test`, deliberately: it rewrites source files in place and restores them
 * in a `finally`, so a run racing another process reading the tree would have that process read
 * a deliberately broken module. Run it by hand after changing either module.
 *
 * Every edit is asserted to have actually changed the file before the case is trusted: a
 * replacement that never matched reports success and changes nothing, and "no effect" then
 * looks exactly like a guard that held.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const scripts = resolve(import.meta.dirname);
const run = () => spawnSync(process.execPath, [resolve(scripts, 'negative-evidence-integrity.mjs')], { encoding: 'utf8' });

const CASES = [
  ['evidence-integrity.mjs', 'PNG header and dimensions read at all',
    'return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };',
    'return { width: 1, height: 1 };'],
  ['evidence-integrity.mjs', 'capture dimensions must be non-zero',
    'else if (dimensions.width < 1 || dimensions.height < 1)',
    'else if (false)'],
  ['evidence-integrity.mjs', 'record names this row\'s own capture',
    'if (record.capture !== capturePath) {',
    'if (false) {'],
  ['evidence-integrity.mjs', 'recorded capture digest matches the file',
    'if (record.captureSha256 !== digest)',
    'if (false)'],
  ['evidence-integrity.mjs', 'recorded capture byte length matches the file',
    'if (record.captureBytes !== bytes.length)',
    'if (false)'],
  ['evidence-integrity.mjs', 'no two rows rest on one capture',
    'if (owner) fail(',
    'if (false) fail('],
  ['evidence-integrity.mjs', 'documentation may not say the feature is absent here',
    '} else if (status === REFUSED_STATUS) {',
    '} else if (false) {'],
  ['evidence-integrity.mjs', 'registry and article must agree',
    '} else if (status !== null && REGISTRY_STATE_TO_DOC_STATUS[registryState] !== status) {',
    '} else if (false) {'],
  ['evidence-integrity.mjs', 'a status must be one of the three',
    "if (value.startsWith(status) && [',', ';', '('].includes(value.charAt(status.length))) return status;",
    'if (value.startsWith(status)) return status;'],
  ['documentation-agreement.mjs', 'census membership compared in both directions',
    'compareSet(census.disagreements ?? [], measured.disagreements, \'disagreeing\', problems);',
    'compareSet([], [], \'disagreeing\', problems);'],
  ['documentation-agreement.mjs', 'census totals compared against the tree',
    'if (totals[key] !== value) problems.push(',
    'if (false) problems.push('],
];

let failures = 0;
const baseline = run();
if (baseline.status !== 0) throw new Error(`baseline negative regression is not green:\n${baseline.stdout}${baseline.stderr}`);
console.log('GREEN baseline: negative regression passes on the untouched tree.\n');

for (const [file, label, from, to] of CASES) {
  const path = resolve(scripts, file);
  const original = readFileSync(path, 'utf8');
  if (!original.includes(from)) throw new Error(`${label}: anchor not found in ${file}, so the break would never have landed`);
  const broken = original.replace(from, to);
  if (broken === original) throw new Error(`${label}: replacement changed nothing`);
  writeFileSync(path, broken);
  try {
    const result = run();
    if (result.status === 0) {
      console.log(`  STAYED GREEN  ${file}: ${label}`);
      failures += 1;
    } else {
      const why = `${result.stdout}${result.stderr}`.split('\n').find((line) => line.includes('stayed green') || line.includes('Error')) ?? '(non-zero exit)';
      console.log(`  RED           ${file}: ${label}\n                -> ${why.trim().slice(0, 130)}`);
    }
  } finally {
    writeFileSync(path, original);
  }
  const restored = run();
  if (restored.status !== 0) throw new Error(`${label}: restoring did not return the tree to green`);
}

console.log(`\n${CASES.length} planted break(s); ${failures} stayed green.`);
process.exitCode = failures === 0 ? 0 : 1;
