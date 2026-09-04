#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const consoleRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(consoleRoot, '..');
const read = (path) => readFileSync(path, 'utf8');
const delivery = read(join(repoRoot, '.github', 'workflows', 'delivery.yml'));
const iso = read(join(consoleRoot, 'scripts', 'iso', 'iso-payload.Dockerfile'));
const deliveryScript = read(join(consoleRoot, 'scripts', 'build-delivery.ps1'));
const pages = read(join(repoRoot, '.github', 'workflows', 'pages.yml'));
const packageJson = JSON.parse(read(join(consoleRoot, 'package.json')));
const localBuildScript = packageJson.scripts?.build ?? '';
const localPackageScript = packageJson.scripts?.['package:squirrel'] ?? '';
const localInstaller = read(join(consoleRoot, 'scripts', 'build-installer.ps1'));

const forbidden = [
  /npm\s+test\b/i,
  /npm\s+run\s+(?:build|lint|typecheck|type-check)\b/i,
  /(?:^|\s)(?:eslint|vitest|jest|playwright|cypress)\b/i,
  /npx\s+tsc\s+-b\b/i,
  /build\.bat\b/i,
  /build-installer\.bat\b/i,
  /package:squirrel\b/i,
];
const assertAbsent = (text, label, patterns) => {
  for (const pattern of patterns) {
    if (pattern.test(text)) throw new Error(`${label} reaches a forbidden quality path: ${pattern}`);
  }
};

assertAbsent(delivery, 'delivery.yml', forbidden);
assertAbsent(iso, 'iso-payload.Dockerfile', forbidden);
assertAbsent(deliveryScript, 'build-delivery.ps1', forbidden.filter((pattern) => !/tsc/.test(String(pattern))));
if (!/tsc\s+-b\b/i.test(localBuildScript) || !/npm\s+run\s+build\b/i.test(localPackageScript)) {
  throw new Error('local package scripts no longer expose the quality paths this checker must keep out of Der Machine');
}
if (/npm\s+run\s+build\b|build\.bat\b|build-installer\.bat\b|package:squirrel\b/i.test(deliveryScript)) {
  throw new Error('build-delivery.ps1 reaches an indirect local quality path');
}
if (!/node_modules[\\/]typescript[\\/]bin[\\/]tsc['"\s)]*\)?\s+-b\s+--noCheck/i.test(deliveryScript)) {
  throw new Error('build-delivery.ps1 must use TypeScript emission with --noCheck');
}
if (!/node_modules[\\/]vite[\\/]bin[\\/]vite\.js['"\s)]*\)?\s+build/i.test(deliveryScript)) {
  throw new Error('build-delivery.ps1 must invoke the local Vite bundler directly');
}
if (!/package-squirrel\.mjs[\s\S]*packaging-build\.log[\s\S]*packaging-provenance\.json[\s\S]*verify-squirrel-artifacts\.ps1[\s\S]*squirrel-artifact-receipt\.json/i.test(deliveryScript)) {
  throw new Error('delivery packaging path must emit the packaging receipt set and invoke the target-owned verifier');
}
if (existsSync(join(consoleRoot, 'scripts', 'verify-squirrel-artifacts.ps1')) && !/verify-squirrel-artifacts\.ps1/i.test(localInstaller)) {
  throw new Error('local build-installer.ps1 must invoke the target-owned Squirrel verifier');
}
const bootstrapIndex = deliveryScript.indexOf('& $bootstrap');
const pathCheckIndex = deliveryScript.indexOf('check-delivery-path.mjs');
const verifyFlagIndex = deliveryScript.indexOf('--verify-gh-fields');
if (bootstrapIndex < 0 || pathCheckIndex < 0 || verifyFlagIndex < pathCheckIndex || verifyFlagIndex < bootstrapIndex) {
  throw new Error('the delivery path Chut must run after dependency bootstrap on a cold Gay Hay');
}
if (!/build-installer-iso:[\s\S]*?uses:\s+\.\/\.github\/workflows\/installer-iso\.yml[\s\S]*?secrets:\s+inherit/i.test(delivery)) {
  throw new Error('delivery.yml must call the reusable ISO build lane');
}
if (!/release:[\s\S]*?needs:\s*\[[^\]]*build-installer-iso[^\]]*\]/i.test(delivery)) {
  throw new Error('the sole release job must wait for the ISO build lane');
}
if (!/deploy-pages:[\s\S]*?needs:\s*\[release\][\s\S]*?uses:\s+\.\/\.github\/workflows\/pages\.yml/i.test(delivery)) {
  throw new Error('Pages deployment must wait for the successful release job');
}
const idempotencyBlockStart = delivery.indexOf('$releaseTags');
const idempotencyBlockEnd = delivery.indexOf('$previousPreference', idempotencyBlockStart);
const idempotencyBlock = delivery.slice(idempotencyBlockStart, idempotencyBlockEnd < 0 ? undefined : idempotencyBlockEnd);
if (/gh release list[^\r\n]*targetCommitish/i.test(idempotencyBlock)) {
  throw new Error('gh release list must not request unsupported targetCommitish fields');
}
if (!/gh release list[^\r\n]*--json tagName[^\r\n]*\r?\n[\s\S]*?gh release view[^\r\n]*--json targetCommitish,isDraft,isPrerelease/i.test(idempotencyBlock)) {
  throw new Error('candidate-SHA idempotency must list tags, then inspect supported fields with gh release view');
}
if (/^\s{2}(push|workflow_dispatch):/m.test(pages)) {
  throw new Error('pages.yml must be callable only from the delivery workflow');
}
const publisherCount = (delivery.match(/^\s*gh release create\b/gim) ?? []).length;
if (publisherCount !== 1) throw new Error(`expected exactly one executable release publisher, found ${publisherCount}`);
if (process.argv.includes('--verify-gh-fields')) {
  const list = spawnSync('gh', ['release', 'list', '-R', 'Ding-Ding-Projects/material-asterisk', '--limit', '1', '--json', 'tagName', '--jq', '.[].tagName'], { encoding: 'utf8', shell: false });
  if (list.status !== 0) throw new Error(`installed gh release list field contract failed with exit ${list.status}`);
  const tag = list.stdout.trim().split(/\r?\n/).find(Boolean);
  if (tag) {
    const view = spawnSync('gh', ['release', 'view', '-R', 'Ding-Ding-Projects/material-asterisk', tag, '--json', 'targetCommitish,isDraft,isPrerelease'], { encoding: 'utf8', shell: false });
    if (view.status !== 0) throw new Error(`installed gh release view field contract failed with exit ${view.status}`);
    const parsed = JSON.parse(view.stdout);
    for (const field of ['targetCommitish', 'isDraft', 'isPrerelease']) {
      if (!(field in parsed)) throw new Error(`installed gh release view omitted ${field}`);
    }
  }
}
console.log('delivery-path-contract: PASS');
