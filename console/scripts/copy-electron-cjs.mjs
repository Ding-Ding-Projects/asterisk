#!/usr/bin/env node
// Copies hand-written .cjs siblings from app/electron into the compiled
// dist-electron tree, because tsc only emits from .ts sources and leaves
// `import './probe-path.cjs'` in main.js pointing at a file that never
// arrives. Fails closed rather than shipping a build that dies on launch.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'app', 'electron');
const out = join(root, 'dist-electron', 'app', 'electron');

// Every .cjs a compiled file imports as a same-directory sibling must exist there.
// Exported so the packaging step can assert the same list inside the built asar.
export function neededCjsSiblings(compiledDir = out) {
  const needed = new Set();
  for (const name of readdirSync(compiledDir)) {
    if (!name.endsWith('.js')) continue;
    const source = readFileSync(join(compiledDir, name), 'utf8');
    for (const m of source.matchAll(/from\s+'\.\/([A-Za-z0-9._-]+\.cjs)'/g)) needed.add(m[1]);
    for (const m of source.matchAll(/require\('\.\/([A-Za-z0-9._-]+\.cjs)'\)/g)) needed.add(m[1]);
  }
  return needed;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();

function main() {
if (!existsSync(out)) {
  console.error(`copy-electron-cjs: ${out} does not exist. Run tsc -b first.`);
  process.exit(1);
}

const check = process.argv.includes('--check');
const needed = neededCjsSiblings(out);

let missing = 0;
for (const name of needed) {
  const from = join(src, name);
  const to = join(out, name);
  if (!existsSync(from)) {
    console.error(`copy-electron-cjs: compiled output imports ./${name} but ${from} does not exist.`);
    missing += 1;
    continue;
  }
  if (check) {
    if (!existsSync(to)) {
      console.error(`copy-electron-cjs: ${to} is missing; the packaged app would fail with ERR_MODULE_NOT_FOUND.`);
      missing += 1;
    }
    continue;
  }
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`copy-electron-cjs: ${name} -> dist-electron/app/electron/`);
}

if (missing > 0) process.exit(1);
if (check) console.log(`copy-electron-cjs: ${needed.size} sibling .cjs file(s) present.`);
}
