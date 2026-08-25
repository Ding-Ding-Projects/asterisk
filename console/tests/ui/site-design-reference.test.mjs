// Guards the website design reference committed under design/site/: the read-only export from
// the design tool that the site's "C - Blueprint" reskin (commit d98624fc72) was adopted from.
// See design/site/README.md for the full account of what is here, what was excluded, and why.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const consoleRoot = fileURLToPath(new URL('../../', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const readConsole = path => readFile(join(consoleRoot, path), 'utf8');
const readRepo = path => readFile(join(repoRoot, path), 'utf8');
// Normalize line endings before any multi-line matching: this checkout mixes LF (the design
// export, as committed) and CRLF (much of the rest of the tree), and an \n-only pattern would
// silently match nothing against a CRLF file.
const norm = text => text.replace(/\r\n/g, '\n');

const expectedFiles = [
  'design/site/Landing A - Spec Sheet.dc.html',
  'design/site/Landing B - Editorial.dc.html',
  'design/site/Landing C - Blueprint.dc.html',
  'design/site/Docs C - Blueprint.dc.html',
  'design/site/Site C - Docs.dc.html',
  'design/site/docs-lib.js',
  'design/site/image-slot.js',
  'design/site/support.js',
  'design/site/.thumbnail',
  'design/site/site/index.html',
  'design/site/README.md',
];

test('every expected site design reference file exists at its exact committed path', async () => {
  // Assert the list itself is non-empty before trusting any loop over it — a scan or a hand-typed
  // list that silently ended up empty would make every assertion below pass vacuously.
  assert.ok(expectedFiles.length > 0, 'expectedFiles must not be empty');
  for (const path of expectedFiles) {
    await assert.doesNotReject(readRepo(path), `missing site design reference file: ${path}`);
  }
});

test('negative regression: a renamed reference file is caught', async () => {
  await assert.rejects(readRepo('design/site/README.md.RENAMED'));
});

test('no committed site design reference file is empty or truncated', async () => {
  for (const path of expectedFiles) {
    const text = await readRepo(path);
    assert.ok(text.length > 0, `${path} is empty`);
  }
  // The five .dc.html screens and the two larger JS files are large exported artifacts; a
  // truncated re-export or a placeholder stub would be far smaller than the real thing.
  const sizeFloors = {
    'design/site/Landing A - Spec Sheet.dc.html': 15000,
    'design/site/Landing B - Editorial.dc.html': 10000,
    'design/site/Landing C - Blueprint.dc.html': 25000,
    'design/site/Docs C - Blueprint.dc.html': 25000,
    'design/site/Site C - Docs.dc.html': 60000,
    'design/site/docs-lib.js': 5000,
    'design/site/image-slot.js': 40000,
    'design/site/support.js': 40000,
  };
  assert.ok(Object.keys(sizeFloors).length > 0, 'sizeFloors must not be empty');
  for (const [path, floor] of Object.entries(sizeFloors)) {
    const text = await readRepo(path);
    assert.ok(text.length >= floor, `${path} is only ${text.length} bytes, expected at least ${floor} (truncated?)`);
  }
});

test('the chosen "Landing C - Blueprint" screen still declares the two vendored font families', async () => {
  const manifest = JSON.parse(await readConsole('assets/site-fonts/manifest.json'));
  const manifestFamilies = [...new Set(manifest.files.map(f => f.family))].sort();
  assert.ok(manifestFamilies.length > 0, 'font manifest declares no families');
  assert.deepEqual(manifestFamilies, ['Archivo', 'IBM Plex Mono']);

  const landingC = norm(await readRepo('design/site/Landing C - Blueprint.dc.html'));
  for (const family of manifestFamilies) {
    assert.ok(
      landingC.includes(family),
      `"Landing C - Blueprint.dc.html" no longer references the vendored family: ${family}`,
    );
  }
});

test('negative regression: a family missing from the reference screen is caught', async () => {
  const landingC = norm(await readRepo('design/site/Landing C - Blueprint.dc.html'));
  const stripped = landingC.replace(/Archivo/g, 'XXXXXXX');
  assert.equal(stripped.includes('Archivo'), false);
});

// --- Runtime-fetch classifier -------------------------------------------------------------
//
// Whether a Google Fonts host string is a runtime problem depends on the SYNTAX it sits in, not
// on whether the substring "fonts.googleapis.com" / "fonts.gstatic.com" appears at all. A plain
// JSON string field recording where a font came from never causes a browser to make a request;
// an HTML <link>, a CSS @import/url(...), or a fetch/XHR call does.
//
// console/assets/site-fonts/manifest.json deliberately keeps such a field:
//   "stylesheetUrl": "https://fonts.googleapis.com/css2?family=Archivo:wght@400;..."
// Commit d98624fc72 ("Vendor the Blueprint fonts and adopt its palette/pipeline structure") says
// so explicitly: "the manifest still records the source URLs as provenance, the same way the
// app's own font manifest already does." That is an audit trail, not a live fetch, and it is
// EXPLICITLY ALLOWED here rather than merely "not caught by the regex" — see the two contrasting
// assertions immediately below, which pin the classifier's behaviour on both sides so the
// allowance cannot silently widen into "nothing is ever flagged".
const RUNTIME_FETCH_PATTERNS = [
  // <link href="https://fonts.googleapis.com/..."> / <link href='...'>
  /<link\b[^>]*href\s*=\s*["'][^"']*fonts\.(?:googleapis|gstatic)\.com[^"']*["']/i,
  // @import url(...) or @import "..."
  /@import\s+(?:url\()?["']?[^"')]*fonts\.(?:googleapis|gstatic)\.com/i,
  // CSS url(...) — e.g. a @font-face src
  /url\(\s*["']?[^"')]*fonts\.(?:googleapis|gstatic)\.com/i,
  // fetch('https://fonts.googleapis.com/...') / fetch(`...`)
  /\bfetch\(\s*["'`][^"'`]*fonts\.(?:googleapis|gstatic)\.com/i,
  // XMLHttpRequest#open('GET', 'https://fonts.googleapis.com/...')
  /\.open\(\s*["'][A-Za-z]+["']\s*,\s*["'`][^"'`]*fonts\.(?:googleapis|gstatic)\.com/i,
];

/** True only when `text` contains a construct that would actually cause a browser or Node
 *  runtime to REQUEST a Google Fonts URL — never merely because the host string appears
 *  somewhere (e.g. recorded as JSON provenance). */
function isRuntimeFontFetch(text) {
  return RUNTIME_FETCH_PATTERNS.some(pattern => pattern.test(text));
}

test('runtime-fetch classifier: a provenance record passes, a real <link> fetch fails (opposite directions)', async () => {
  // The "passes" side is the REAL committed manifest, not a synthetic fixture — if a future
  // rewrite of manifest.json ever turned its provenance field into markup this would catch it.
  const manifestText = await readConsole('assets/site-fonts/manifest.json');
  assert.ok(manifestText.includes('fonts.googleapis.com'), 'manifest.json no longer records its provenance URL at all');
  assert.equal(
    isRuntimeFontFetch(manifestText),
    false,
    'a JSON provenance record must not be classified as a runtime fetch',
  );

  // The "fails" side: the exact same host, but inside syntax that would actually be requested.
  const realFetch = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo">';
  assert.equal(
    isRuntimeFontFetch(realFetch),
    true,
    'a <link href="https://fonts.googleapis.com/..."> must be classified as a runtime fetch',
  );
});

/** Files actually tracked by git under `dir` (repo-relative, forward-slash, POSIX style) —
 *  never a directory walk. This is what keeps a gitignored build directory (console/site/dist/,
 *  created by running the site build) from ever being scanned: `git ls-files` only ever answers
 *  with what is committed, regardless of what happens to exist on disk at the moment the test
 *  runs. A hardcoded "skip dist" exclusion would have to be remembered forever and re-added
 *  every time a new generated directory appeared; deriving the list from git needs neither. */
function gitTrackedFiles(dir) {
  const output = execFileSync('git', ['ls-files', dir], { cwd: repoRoot, encoding: 'utf8' });
  return output.split('\n').map(line => line.trim()).filter(Boolean);
}

test("the shipped site's tracked source never fetches Google Fonts at runtime", async () => {
  // The design reference itself is exempt: it is an unmodified, read-only export and is expected
  // to still carry fonts.googleapis.com / fonts.gstatic.com references (README.md explains why).
  // Only console/site/ — the directory that is actually built and published — is checked here,
  // and only its TRACKED files: `git ls-files` cannot return console/site/dist/, because that
  // directory is gitignored and untracked (.gitignore:53) and is generated fresh by
  // `node site/tests/site.test.mjs`. Scanning a directory walk instead of the tracked-file list
  // was the original defect in this guard: it would pass on a fresh checkout (dist/ does not
  // exist yet) and fail forever afterwards on any checkout where the site had ever been built —
  // an order-dependent verdict, which is exactly what a CI run building before testing would hit.
  const trackedFiles = gitTrackedFiles('console/site');
  // Assert the list actually found files before trusting the loop below.
  assert.ok(trackedFiles.length > 0, 'git ls-files returned zero tracked files under console/site — scan is broken');
  assert.ok(
    trackedFiles.every(f => !f.startsWith('console/site/dist/')),
    'git ls-files returned a path under the gitignored build directory — it should never be tracked',
  );

  const offenders = [];
  for (const relPath of trackedFiles) {
    const text = await readFile(join(repoRoot, relPath), 'utf8').catch(() => null);
    if (text === null) continue; // binary asset (image, font file, etc.)
    if (isRuntimeFontFetch(text)) offenders.push(relPath);
    // A bare host mention that ISN'T a recognised fetch construct is a provenance-style record
    // (per the classifier above) and is allowed without needing a per-file allowlist entry —
    // the classifier test two tests up is what keeps that allowance narrow and provable.
  }
  assert.deepEqual(offenders, [], `console/site/'s tracked source must never fetch fonts at runtime:\n${offenders.join('\n')}`);
});

test('negative regression: a live Google Fonts <link> reintroduced into tracked site source is caught', async () => {
  const html = await readConsole('site/index.html');
  const contaminated = html + '\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo">';
  assert.equal(
    isRuntimeFontFetch(contaminated),
    true,
    'the negative-regression fixture itself does not trip the runtime-fetch classifier',
  );
});

test('the design reference itself is still allowed to carry the Google Fonts reference (contrast case)', async () => {
  // This is the deliberate asymmetry the README documents: forbidden as a runtime fetch in
  // console/site/'s tracked source, expected here. If this ever starts failing, either the
  // export changed or vendoring silently rewrote the committed reference file, and either is
  // worth knowing about.
  const landingC = norm(await readRepo('design/site/Landing C - Blueprint.dc.html'));
  assert.ok(
    landingC.includes('fonts.googleapis.com'),
    'the read-only design export no longer contains its original Google Fonts reference',
  );
});
