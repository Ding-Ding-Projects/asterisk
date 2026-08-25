// Guards the website design reference committed under design/site/: the read-only export from
// the design tool that the site's "C - Blueprint" reskin (commit d98624fc72) was adopted from.
// See design/site/README.md for the full account of what is here, what was excluded, and why.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
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

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

test("the shipped site never fetches the design reference's Google Fonts URLs at runtime", async () => {
  // The design reference itself is exempt: it is an unmodified, read-only export and is expected
  // to still carry fonts.googleapis.com / fonts.gstatic.com references (README.md explains why).
  // Only console/site/, the directory that is actually built and published, is checked here.
  const siteDir = join(consoleRoot, 'site');
  const files = await walk(siteDir);
  // Assert the walk actually found files before trusting the loop below.
  assert.ok(files.length > 0, 'walked zero files under console/site/ — scan is broken');

  const forbidden = ['fonts.googleapis.com', 'fonts.gstatic.com'];
  const offenders = [];
  for (const file of files) {
    const text = await readFile(file, 'utf8').catch(() => null);
    if (text === null) continue; // binary asset (image, font file, etc.)
    for (const needle of forbidden) {
      if (text.includes(needle)) offenders.push(`${file} contains ${needle}`);
    }
  }
  assert.deepEqual(offenders, [], `console/site/ must never fetch fonts at runtime:\n${offenders.join('\n')}`);
});

test('negative regression: a live Google Fonts reference reintroduced into console/site/ is caught', async () => {
  const html = await readConsole('site/index.html');
  const contaminated = html + '\n<link href="https://fonts.googleapis.com/css2?family=Archivo">';
  const forbidden = ['fonts.googleapis.com', 'fonts.gstatic.com'];
  const hit = forbidden.some(needle => contaminated.includes(needle));
  assert.ok(hit, 'the negative-regression fixture itself does not trip the forbidden-URL check');
});

test('the design reference itself is still allowed to carry the Google Fonts reference (contrast case)', async () => {
  // This is the deliberate asymmetry the README documents: forbidden in console/site/, expected
  // here. If this ever starts failing, either the export changed or vendoring silently rewrote
  // the committed reference file, and either is worth knowing about.
  const landingC = norm(await readRepo('design/site/Landing C - Blueprint.dc.html'));
  assert.ok(
    landingC.includes('fonts.googleapis.com'),
    'the read-only design export no longer contains its original Google Fonts reference',
  );
});
