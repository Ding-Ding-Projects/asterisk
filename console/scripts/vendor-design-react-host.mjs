#!/usr/bin/env node
/**
 * Vendors the React runtime the checked-in design export needs, locally and offline.
 *
 * `console/design-reference/README.md` used to record this as an unclosed capability
 * boundary: "design/*.dc.html expects window.React/window.ReactDOM supplied by its host".
 * That is true of the HTML file and false of the runtime beside it. `design/support.js`
 * loads React itself — `loadReactUmd()` at its foot appends two <script> tags for
 * react@18.3.1 and react-dom@18.3.1 from unpkg, each pinned with a subresource-integrity
 * hash — and, one function above that, `cdnScriptFor()` reads `window.__resources[url]`
 * and uses that value as the script source when it is a non-empty string. So the design
 * already ships the hook a host is meant to use; nothing under design/ needs editing.
 *
 * What was genuinely missing is the two files that hook should point at. This script
 * downloads them once, into console/design-reference/vendor/, so a capture run makes no
 * network request at all — the same rule every other asset in this project follows.
 *
 * The pins are never typed here. Both URLs and both sha384 integrity hashes are parsed out
 * of design/support.js itself, so if the design's own React pin ever moves, `--check` goes
 * red rather than silently continuing to serve the old runtime. A downloaded file whose
 * sha384 does not equal the integrity hash the design declares is refused and not written.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, '..', '..');
export const SUPPORT_JS = resolve(REPO_ROOT, 'design', 'support.js');
export const VENDOR_DIR = resolve(REPO_ROOT, 'console', 'design-reference', 'vendor');
export const MANIFEST_PATH = join(VENDOR_DIR, 'vendor-manifest.json');

/** The two `var NAME = "..."` pairs support.js declares, and the local filename each maps to. */
const WANTED = [
  { urlVar: 'REACT_URL', sriVar: 'REACT_SRI', file: 'react.production.min.js', global: 'React' },
  { urlVar: 'REACT_DOM_URL', sriVar: 'REACT_DOM_SRI', file: 'react-dom.production.min.js', global: 'ReactDOM' },
];

/**
 * Reads one `var NAME = "value";` string constant out of support.js source.
 *
 * Anchored to the whole declaration rather than to the bare name: a substring needle for
 * `REACT_URL` is equally satisfied by `REACT_URL_FALLBACK` and by a commented-out line,
 * and this value decides which bytes get served as the design's runtime.
 */
export function readStringConstant(source, name) {
  const pattern = new RegExp(String.raw`^\s*var\s+` + name + String.raw`\s*=\s*"([^"]+)"\s*;`, 'm');
  const match = pattern.exec(source.replace(/\r\n/g, '\n'));
  if (!match) throw new Error(`vendor-design-react-host: design/support.js declares no 'var ${name} = "…";' — its React pin has moved or been renamed`);
  return match[1];
}

/** The exact pins design/support.js itself declares — never a hand-typed version. */
export function pinsFromSupportJs(source) {
  return WANTED.map(({ urlVar, sriVar, file, global }) => ({
    file,
    global,
    url: readStringConstant(source, urlVar),
    integrity: readStringConstant(source, sriVar),
  }));
}

const sha384Of = (bytes) => `sha384-${createHash('sha384').update(bytes).digest('base64')}`;
const sha256Of = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function download(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`vendor-design-react-host: ${url} answered HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/** Verifies every vendored file against the pin the design declares. Returns the problems found. */
export function verifyVendored(pins, { dir = VENDOR_DIR, exists = existsSync, read = readFileSync } = {}) {
  const problems = [];
  for (const pin of pins) {
    const path = join(dir, pin.file);
    if (!exists(path)) {
      problems.push(`${pin.file} is absent — run 'node console/scripts/vendor-design-react-host.mjs' to fetch it`);
      continue;
    }
    const actual = sha384Of(read(path));
    if (actual !== pin.integrity) {
      problems.push(`${pin.file} has sha384 ${actual}, but design/support.js pins ${pin.integrity} for ${pin.url}`);
    }
  }
  return problems;
}

async function main() {
  const check = process.argv.includes('--check');
  const pins = pinsFromSupportJs(readFileSync(SUPPORT_JS, 'utf8'));

  if (check) {
    const problems = verifyVendored(pins);
    if (problems.length > 0) {
      console.error(`vendor-design-react-host --check failed:\n  - ${problems.join('\n  - ')}`);
      process.exit(1);
    }
    console.log(`vendor-design-react-host --check: ${pins.length} vendored file(s) match the pins design/support.js declares.`);
    return;
  }

  mkdirSync(VENDOR_DIR, { recursive: true });
  const records = [];
  for (const pin of pins) {
    const bytes = await download(pin.url);
    const actual = sha384Of(bytes);
    if (actual !== pin.integrity) {
      throw new Error(`vendor-design-react-host: refusing to write ${pin.file} — ${pin.url} returned bytes whose sha384 is ${actual}, not the ${pin.integrity} design/support.js pins for it`);
    }
    writeFileSync(join(VENDOR_DIR, pin.file), bytes);
    records.push({ file: pin.file, global: pin.global, url: pin.url, integrity: pin.integrity, sha256: sha256Of(bytes), bytes: bytes.length });
    console.log(`vendored ${pin.file} (${bytes.length} bytes) from ${pin.url}`);
  }
  writeFileSync(MANIFEST_PATH, `${JSON.stringify({
    generatedBy: 'console/scripts/vendor-design-react-host.mjs',
    pinnedBy: 'design/support.js (REACT_URL/REACT_SRI and REACT_DOM_URL/REACT_DOM_SRI)',
    note: 'Served to the design iframe through its own window.__resources hook so a capture run fetches nothing from the network. Regenerate rather than hand-edit.',
    files: records,
  }, null, 2)}\n`);
}

// pathToFileURL, not a hand-built `file://` + backslash swap: on Windows the hand-built form
// is `file://C:/…` while import.meta.url is `file:///C:/…`, so the guard never matches and the
// script silently does nothing at all — which reads exactly like a successful run.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
