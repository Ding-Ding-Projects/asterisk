#!/usr/bin/env node
import { readFileSync } from 'node:fs';
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
if (!/build-installer-iso:[\s\S]*?uses:\s+\.\/\.github\/workflows\/installer-iso\.yml[\s\S]*?secrets:\s+inherit/i.test(delivery)) {
  throw new Error('delivery.yml must call the reusable ISO build lane');
}
if (!/release:[\s\S]*?needs:\s*\[[^\]]*build-installer-iso[^\]]*\]/i.test(delivery)) {
  throw new Error('the sole release job must wait for the ISO build lane');
}
if (!/deploy-pages:[\s\S]*?needs:\s*\[release\][\s\S]*?uses:\s+\.\/\.github\/workflows\/pages\.yml/i.test(delivery)) {
  throw new Error('Pages deployment must wait for the successful release job');
}
if (/^\s{2}(push|workflow_dispatch):/m.test(pages)) {
  throw new Error('pages.yml must be callable only from the delivery workflow');
}
const publisherCount = (delivery.match(/^\s*gh release create\b/gim) ?? []).length;
if (publisherCount !== 1) throw new Error(`expected exactly one executable release publisher, found ${publisherCount}`);
console.log('delivery-path-contract: PASS');
