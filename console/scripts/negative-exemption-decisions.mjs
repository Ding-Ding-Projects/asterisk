#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for the four excluded-feature contract tests.
 *
 * Each of `local-file-converter` and `ollama-suite-manager` has a contract test per
 * surface asserting the honest `absent` state, and each one now ends with a block saying
 * that the absence is the owner's decision and naming where the decision lives. That
 * block is the last thing standing between somebody who wants to build one of these and
 * an afternoon spent building it: it sits in the file they must edit to make a newly
 * built feature pass.
 *
 * A block like that is worth exactly as much as its assertions, and its assertions are
 * about three JSON records rather than about code -- which is the shape that most often
 * turns out to be checking nothing. So each record is broken here, one at a time, and
 * each break must turn the right contract test red.
 *
 * Every break edits a real file on disk, because that is the only way to exercise a test
 * that reads its subject off the filesystem. The original bytes are restored in a
 * `finally` and the restore is verified rather than assumed; a break whose replacement
 * changed no bytes is reported as a FAILED CASE rather than counted as a pass, because
 * an edit that never landed reads exactly like a guard that held.
 *
 * Usage:  node scripts/negative-exemption-decisions.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');

const INVENTORY = resolve(consoleRoot, 'inventories/surface-completeness.json');
const EXEMPTIONS = resolve(consoleRoot, 'inventories/exemptions.json');

const SITE_CONVERTER = 'site/tests/contracts/local-file-converter.test.mjs';
const SITE_OLLAMA = 'site/tests/contracts/ollama-suite-manager.test.mjs';
const APP_CONVERTER = 'tests/contracts/local-file-converter.test.mjs';
const APP_OLLAMA = 'tests/contracts/ollama-suite-manager.test.mjs';

/** Rewrites one JSON record through a mutation, preserving its trailing newline. */
const edit = (path, mutate) => () => {
  const before = readFileSync(path, 'utf8');
  const data = JSON.parse(before);
  mutate(data);
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  const after = `${JSON.stringify(data, null, 2).split('\n').join(eol)}${before.endsWith('\n') ? eol : ''}`;
  return { path, before, after };
};

const rowIn = (data, surfaceId, featureId) => {
  const surface = data.surfaces.find((entry) => entry.id === surfaceId);
  if (!surface) throw new Error(`no ${surfaceId} surface in the completeness inventory`);
  const row = surface.features.find((entry) => entry.id === featureId);
  if (!row) throw new Error(`no ${featureId} row on ${surfaceId}`);
  return row;
};

const decisionIn = (data, featureId) => {
  const entry = data.exemptions.find((candidate) => candidate.feature === featureId);
  if (!entry) throw new Error(`no recorded exemption for ${featureId}`);
  return entry;
};

/** Each case is one lie about a decision, and the test that must notice it. */
const cases = [
  ['the completeness inventory stops marking the site converter exempt', SITE_CONVERTER,
    edit(INVENTORY, (data) => { rowIn(data, 'pages-site', 'local-file-converter').status = 'unverified'; })],

  ['the completeness inventory stops marking the console converter exempt', APP_CONVERTER,
    edit(INVENTORY, (data) => { rowIn(data, 'windows-console', 'local-file-converter').status = 'unverified'; })],

  ['the completeness inventory stops marking the site Ollama suite exempt', SITE_OLLAMA,
    edit(INVENTORY, (data) => { rowIn(data, 'pages-site', 'ollama-suite-manager').status = 'unverified'; })],

  ['the completeness inventory stops marking the console Ollama suite exempt', APP_OLLAMA,
    edit(INVENTORY, (data) => { rowIn(data, 'windows-console', 'ollama-suite-manager').status = 'unverified'; })],

  ['the exemption record stops covering the website, so the site row answers to nothing', SITE_CONVERTER,
    edit(EXEMPTIONS, (data) => {
      const entry = decisionIn(data, 'local-file-converter');
      entry.surfaces = entry.surfaces.filter((surface) => surface !== 'pages-site');
    })],

  ['the exemption record stops covering the console', APP_OLLAMA,
    edit(EXEMPTIONS, (data) => {
      const entry = decisionIn(data, 'ollama-suite-manager');
      entry.surfaces = entry.surfaces.filter((surface) => surface !== 'windows-console');
    })],

  ['the exclusion stops being the owner\'s, so an agent could record one for itself', SITE_CONVERTER,
    edit(EXEMPTIONS, (data) => { decisionIn(data, 'local-file-converter').decidedBy = 'agent'; })],

  ['the exclusion keeps its decider and loses the reason anybody could disagree with', APP_CONVERTER,
    edit(EXEMPTIONS, (data) => { decisionIn(data, 'local-file-converter').reason = 'no'; })],

  ['the whole exemption disappears from the record', SITE_OLLAMA,
    edit(EXEMPTIONS, (data) => { data.exemptions = data.exemptions.filter((entry) => entry.feature !== 'ollama-suite-manager'); })],
];

const runTest = (relative) => {
  try {
    execFileSync(process.execPath, ['--test', relative], { cwd: consoleRoot, stdio: 'pipe' });
    return 'green';
  } catch {
    return 'red';
  }
};

for (const relative of [SITE_CONVERTER, SITE_OLLAMA, APP_CONVERTER, APP_OLLAMA]) {
  if (runTest(relative) !== 'green') {
    console.error(`FAIL: ${relative} is already red, so nothing below would mean anything.`);
    process.exit(1);
  }
}

let failures = 0;
for (const [name, target, plant] of cases) {
  let planted;
  try {
    planted = plant();
  } catch (error) {
    console.error(`FAILED CASE  ${name}: ${error.message}`);
    failures += 1;
    continue;
  }
  if (planted.after === planted.before) {
    console.error(`FAILED CASE  ${name}: the replacement changed no bytes, so nothing was broken`);
    failures += 1;
    continue;
  }

  let broken;
  try {
    writeFileSync(planted.path, planted.after);
    broken = runTest(target);
  } finally {
    writeFileSync(planted.path, planted.before);
    if (readFileSync(planted.path, 'utf8') !== planted.before) {
      console.error(`FAILED CASE  ${name}: the original bytes were NOT restored -- repair this file by hand`);
      process.exit(1);
    }
  }

  const restored = runTest(target);
  const ok = broken === 'red' && restored === 'green';
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  broke=${broken.padEnd(5)} restored=${restored.padEnd(5)}  ${name}`);
}

if (failures > 0) {
  console.error(`FAIL: ${failures} of ${cases.length} planted break(s) did not turn the target contract test red and green again.`);
  process.exit(1);
}
console.log(`PASS: ${cases.length} planted break(s), each alone, each turning an excluded-feature contract test red and then green again on restore.`);
