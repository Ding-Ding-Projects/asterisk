import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The one section of an evidence document whose table rows must each name a source commit. */
const CAPTURE_RECORDS_HEADING = '## Capture records';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..', '..');
const html = await readFile(join(root, 'index.html'), 'utf8');
const css = await readFile(join(root, 'styles.css'), 'utf8');
const js = await readFile(join(root, 'app.js'), 'utf8');
const pages = Object.fromEntries(await Promise.all(
  ['index', 'product', 'documentation', 'downloads', 'status', 'settings'].map(
    async name => [name, await readFile(join(root, name + '.html'), 'utf8')])));
const everyPage = Object.values(pages).join();

/* Guaranteed never to exist on disk; used to force build.mjs's download-manifest
 * fallback path regardless of any manifest a developer or a resolver run left behind. */
const ABSENT_MANIFEST_PATH = join(root, '__no_release_manifest_for_tests__.json');
/* A structurally valid fixture manifest, shaped exactly like the real output of
 * console/scripts/resolve-site-download-manifest.mjs, but for a release that does not
 * exist -- this proves build.mjs's substitution logic without any network access. */
const FIXTURE_MANIFEST = {
  schemaVersion: 1,
  resolved: true,
  resolvedAt: '2026-01-01T00:00:00.000Z',
  product: 'ding-pbx-console',
  version: '9.9.9',
  tag: 'ding-pbx-console-v9.9.9-r1',
  sourceCommit: 'a'.repeat(40),
  publishedAt: '2026-01-01T00:00:00Z',
  releaseUrl: 'https://github.com/Ding-Ding-Projects/asterisk/releases/tag/ding-pbx-console-v9.9.9-r1',
  releaseNotesMarkdown: '# Fixture release\n\n- A test-only note with a `code span`, a "quote", and a back\\slash.',
  asset: {
    name: 'Ding-PBX-Console-Setup.exe',
    url: 'https://github.com/Ding-Ding-Projects/asterisk/releases/download/ding-pbx-console-v9.9.9-r1/Ding-PBX-Console-Setup.exe',
    sizeBytes: 123456789,
    sha256: 'b'.repeat(64),
  },
  verification: { identityManifestChecked: true, sha256sumsChecked: true, assetDigestHeaderChecked: true, remoteHeadBytesConfirmed: true },
};
/** Runs build.mjs against a scratch dist directory with the given manifest env override, then returns its parsed output. */
async function buildWithManifest(manifestPath) {
  execFileSync(process.execPath, [join(root, 'build.mjs')], {
    cwd: repo, stdio: 'pipe',
    env: { ...process.env, DING_PBX_SITE_RELEASE_MANIFEST: manifestPath ?? ABSENT_MANIFEST_PATH },
  });
  // build.mjs always writes to its own fixed root/dist -- read what we need back out
  // immediately, before the next build (a different fixture, or the ordinary suite
  // run) removes and recomposes that same directory.
  const out = {};
  for (const name of ['index.html', 'downloads.html', 'product.html', 'status.html', 'app.js', 'build-manifest.json']) {
    out[name] = await readFile(join(root, 'dist', name), 'utf8');
  }
  return out;
}
/** Asserts the honest "not published" fallback is what actually got published, in every place it must appear. */
function assertFallbackPublished(dist) {
  assert.match(dist['index.html'], /<strong id="home-installer-status-label">Not published<\/strong>/);
  assert.match(dist['index.html'], /No verified release manifest exists yet, so this site does not guess a download URL\./);
  assert.match(dist['index.html'], /class="download-button disabled-link" href="downloads\.html" aria-disabled="true">Download unavailable</);
  assert.match(dist['downloads.html'], /<span class="status-chip warning-chip">Not published<\/span>/);
  assert.match(dist['downloads.html'], /<button class="primary-button" type="button" disabled aria-describedby="installer-status">Download unavailable<\/button>/);
  assert.match(dist['downloads.html'], /<dt>Version<\/dt><dd>Unavailable<\/dd>/);
  assert.match(dist['downloads.html'], /<dt>Artifact<\/dt><dd>Not verified<\/dd>/);
  assert.match(dist['downloads.html'], /<dt>SHA-256<\/dt><dd>Not published<\/dd>/);
  assert.doesNotMatch(dist['index.html'] + dist['downloads.html'], /href="https?:[^"]*Setup\.exe/i);
  assert.match(dist['app.js'], /const RELEASE_NOTES_MARKDOWN = "";/);
  // The reverse claim -- describing a real, downloadable product as merely planned --
  // is just as false as a guessed URL, so the fallback must say "planned"/"CONCEPT"
  // consistently everywhere that claim is made, in both the JS-rendered hero copy and
  // its static HTML default, never a stale mix of the two states.
  assert.match(dist['index.html'], /Ding PBX Console is a planned Windows desktop console/);
  assert.match(dist['index.html'], /<strong>Console overview<\/strong><em>CONCEPT<\/em>/);
  assert.equal((dist['product.html'].match(/planned desktop runtime/g) || []).length, 2);
  assert.doesNotMatch(dist['product.html'], /(?<!planned )desktop runtime/);
  assert.match(dist['status.html'], /<small>Installer release<\/small><strong>Not published<\/strong>/);
  assert.match(dist['status.html'], /<p>No verified immutable asset exists yet\.<\/p>/);
  assert.match(dist['status.html'], /<span class="sparkline is-waiting"/);
  assert.match(dist['status.html'], /<li data-state="waiting"><strong>Installer release pending<\/strong>/);
  assert.match(dist['app.js'], /'Ding PBX Console is a planned desktop administration experience for Asterisk\./);
  assert.match(dist['app.js'], /Asterisk 嘅桌面管理計劃項目/);
  const manifest = JSON.parse(dist['build-manifest.json']);
  assert.equal(manifest.download.resolved, false);
}

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

test('declares responsive and Open Graph metadata', () => {
  assert.match(html, /<meta name="viewport"/);
  for (const key of ['og:title','og:description','og:url','og:type','og:site_name','og:image','og:image:width','og:image:height','og:image:alt']) assert.match(html, new RegExp(`property="${key}"`));
  assert.match(html, /twitter:card" content="summary_large_image"/);
});
test('states the static site boundary and never bakes a guessed download into source', () => {
  assert.match(html, /not the installed desktop application/i);
  assert.match(html, /not a PBX runtime/i);
  // The real installer state (published or not) is resolved by build.mjs from a
  // build-time manifest, never hard-coded in source -- see the {{DING_PBX_...}}
  // markers templated below. What source must never contain, in either state, is a
  // literal guessed download URL: that is the one thing that must be impossible
  // regardless of what console/scripts/resolve-site-download-manifest.mjs finds.
  assert.doesNotMatch(everyPage, /href="https?:[^"]*Setup\.exe/i);
  for (const token of ['{{DING_PBX_DL_STATUS_CHIP}}', '{{DING_PBX_DL_STATUS_DETAIL}}', '{{DING_PBX_DL_ACTION}}', '{{DING_PBX_DL_VERSION}}', '{{DING_PBX_DL_ARTIFACT}}', '{{DING_PBX_DL_SHA256}}']) {
    assert.ok(pages.downloads.includes(token), `downloads.html source is missing template marker ${token}`);
  }
  for (const token of ['{{DING_PBX_HOME_STATUS_LABEL}}', '{{DING_PBX_HOME_STATUS_DETAIL}}', '{{DING_PBX_HOME_DOWNLOAD_ACTION}}', '{{DING_PBX_HOME_STAT_VALUE}}', '{{DING_PBX_HOME_STAT_TREND_CLASS}}', '{{DING_PBX_HOME_STAT_TREND_TEXT}}']) {
    assert.ok(pages.index.includes(token), `index.html source is missing template marker ${token}`);
  }
  assert.match(js, /const RELEASE_NOTES_MARKDOWN = '';/, 'app.js source default must be the empty-string fallback that build.mjs replaces');
});
test('contains exactly 32 destination definitions in six declared groups', () => {
  const block = js.match(/const DESTINATIONS = \[([\s\S]*?)\n  \];/)[1];
  assert.equal((block.match(/\{id:/g) || []).length, 32);
  const counts = [...block.matchAll(/group:'([^']+)'/g)].reduce((map, match) => map.set(match[1], (map.get(match[1]) || 0) + 1), new Map());
  assert.deepEqual([...counts.values()], [7,8,4,2,4,7]);
  assert.deepEqual([...block.matchAll(/\{id:'([^']+)'/g)].map(match => match[1]), [
    'servers','dash','live','endpoints','trunks','trunkauth','canvas','ivr','queues',
    'voicemail','confbridge','moh','codecs','cdr','ami','modules','logger','security','cli',
    'memory','sync','skills','hub','vocab','ops','secrets',
    'arcade','notifications','history','customise','appearance','about',
  ]);
});
test('provides 76 complete feature articles plus checked evidence records', async () => {
  const docsRoot=resolve(root,'..','docs'), categories=['pbx','media','data','system','agent','app','platform'];
  const articles=[];
  for(const category of categories)for(const name of await readdir(join(docsRoot,category)))if(name.endsWith('.md')&&name!=='README.md')articles.push(join(docsRoot,category,name));
  assert.equal(articles.length,76); // 32 destination articles (pbx/media/data/system/agent/app) plus 44 platform articles
  // An evidence record is a different genre from a feature article: it says what was
  // captured, from which commit, and by what method, and forcing "## Behavior" onto it
  // would distort a document that is doing its job. So it lives in its own category --
  // following docs/changelog, which is outside this list for the same reason -- and gets
  // its OWN required sections rather than none. A genre nobody checks is how an evidence
  // file quietly becomes a paragraph asserting that something was verified.
  const evidenceRoot=join(docsRoot,'evidence');
  const evidence=(await readdir(evidenceRoot)).filter(name=>name.endsWith('.md')&&name!=='README.md');
  assert.ok(evidence.length>0,'the evidence category exists and is empty, which proves nothing');
  for(const name of evidence){
    const content=await readFile(join(evidenceRoot,name),'utf8');
    for(const heading of [CAPTURE_RECORDS_HEADING,'## Capture method','## Verification boundary','## Suggested articles'])assert.match(content,new RegExp(heading),`${name} has no ${heading}`);
    // The whole value of an evidence record is that a reader can go back to the exact
    // source a capture came from. A capture with no commit is a screenshot.
    //
    // Per ROW, not per file: "this document mentions a commit somewhere" passes while any
    // individual row quietly loses its own, which was exactly what the first version of
    // this check did when it was broken on purpose.
    //
    // Scoped to the Capture records section rather than the whole document. It used to scan
    // every table anywhere in the file, which is a different rule from the one stated above and
    // a stricter one than it can justify: an evidence record that explains a measurement with a
    // table -- a font's variation axes, a before-and-after of the figures -- has no capture in
    // that table and no commit to name. Narrowing costs nothing against the corpus it was
    // written for, because every row in every evidence document already sat inside this
    // section, and it keeps the rule the comment above describes.
    const recordsAt=content.indexOf(CAPTURE_RECORDS_HEADING);
    assert.notEqual(recordsAt,-1,`${name} has no ${CAPTURE_RECORDS_HEADING} section to scan`);
    const captureRecords=content.slice(recordsAt);
    const nextHeading=captureRecords.indexOf('\n## ',CAPTURE_RECORDS_HEADING.length);
    const rows=[...(nextHeading===-1?captureRecords:captureRecords.slice(0,nextHeading)).matchAll(/^\|(?!\s*(?:---|\s*State))(.+)\|\s*$/gm)].map(match=>match[1]);
    assert.ok(rows.length>0,`${name} has a capture-records section with no rows in it`);
    for(const row of rows)assert.match(row,/[0-9a-f]{40}/,`a capture row in ${name} names no source commit: ${row.slice(0,60)}`);
    for(const match of content.matchAll(/\]\(([^)]+\.(?:md|png))\)/g)){const target=resolve(evidenceRoot,match[1]);assert.ok((await stat(target)).isFile(),`${name} -> ${match[1]}`)}
  }
  for(const article of articles){const content=await readFile(article,'utf8');for(const heading of ['## Behavior','## Configuration','## Failure modes','## Verification','## Suggested articles'])assert.match(content,new RegExp(heading));for(const match of content.matchAll(/\]\(([^)]+\.md)\)/g)){const target=resolve(dirname(article),match[1]);assert.ok((await stat(target)).isFile(),`${article} -> ${match[1]}`)}}
});
test('exposes keyboard, tab, regex, and local settings interactions', () => {
  assert.match(everyPage, /class="local-tabs" aria-label=/); assert.match(everyPage, /id="command-palette"/); assert.match(js, /ctrlKey&&event.shiftKey/);
  assert.ok((everyPage.match(/class="regex-trigger"/g) || []).length >= 8);
  for (const id of ['language-mode','english-funny','cantonese-funny','vocabulary-file','attention-settings','schedule-enabled','logo-file','notification-history']) assert.match(everyPage, new RegExp(`id="${id}"`));
});
test('has accessible names and reduced motion support', () => {
  assert.match(everyPage, /class="skip-link"/); assert.match(everyPage, /aria-live="polite"/); assert.match(everyPage, /aria-label="Open notification history"/);
  assert.match(css, /prefers-reduced-motion:reduce/); assert.match(css, /min-width:320px/); assert.match(css, /:focus-visible/);
});
test('uses no runtime CDN, analytics, or remote script and stylesheet assets', () => {
  assert.doesNotMatch(html, /(?:src|href)="https?:\/\//i);
  assert.doesNotMatch(html, /google-analytics|googletagmanager|unpkg|jsdelivr|cdnjs/i);
  assert.doesNotMatch(css, /@import|url\(\s*['"]?https?:/i);
});
test('documents local-only validation and redacted export boundaries', () => {
  assert.match(js, /file\.size>65536/); assert.match(js, /parsed\.version!==1/); assert.match(js, /Duplicate keys are not accepted/);
  assert.match(js, /personalVocabulary:'omitted'/); assert.match(everyPage, /No data leaves this browser/);
});
test('build composes deterministic local output without fetches', async () => {
  // Point at a manifest path that is guaranteed never to exist, so this determinism
  // check never depends on whatever a developer's own working directory happens to
  // have lying around from a manual resolver run.
  execFileSync(process.execPath, [join(root, 'build.mjs')], { cwd: repo, stdio: 'pipe', env: { ...process.env, DING_PBX_SITE_RELEASE_MANIFEST: ABSENT_MANIFEST_PATH } });
  const manifest = JSON.parse(await readFile(join(root, 'dist', 'build-manifest.json'), 'utf8'));
  assert.equal(manifest.networkFetches, 0);
  // 91 pages, the remaining documents and the social preview, plus the 51 vendored font
  // files (49 faces, fonts.css and manifest.json) copied in so the published pages reach
  // them without a request to anybody.
  //
  // An exact count is the point: this is the determinism check, so a number that drifts
  // fails and gets explained rather than quietly widened. It last moved on 2026-08-24, by
  // two, for two articles that had been committed without it: the updater capture evidence
  // and the updater reliability changelog entry. Each contributes one page.
  // 146 from 2026-08-24, for docs/platform/unbound-controls.md: the record of which controls
  // do not write to a file and why, so nobody reads "unbound" as "unfinished" and wires one
  // to the nearest plausible key.
  // 147 from 2026-08-24, for docs/platform/branch-integration.md: why forty-eight branches are
  // still unmerged, measured branch by branch, so the same afternoon is not spent again.
  // 179 from 2026-08-24, for the homepage's Blueprint reskin adopting the "Landing C"
  // design export: 30 vendored Archivo / IBM Plex Mono font files plus their own
  // fonts.css and manifest.json, copied in by build.mjs exactly as the app's own
  // vendored Roboto set already is, so the published pages reach them too.
  // 185 from 2026-08-25, for six product screenshots on the homepage. The readme and the
  // published site both carried no pictures at all, so somebody deciding whether to install
  // this was being asked to imagine it. build.mjs copies them by name from the page own
  // references rather than by sweeping a directory, so a capture the page never uses cannot
  // quietly add megabytes to every visit, and a renamed file fails the build instead of
  // rendering as a broken image. Both of those refusals were broken on purpose and watched.
  // 187 from 2026-08-25, for an operations category: an index and one article recording how
  // this repository is built, packaged, driven, captured and released, and what each of those
  // does when it fails. It is the article half of the operational skill, mirrored here because
  // the skill directory is not tracked, so a skill committed there would travel with nobody.
  // 186 from 2026-08-25, for one evidence record: docs/evidence/design-parity-chrome-bar.md,
  // which states the chrome-parity bar a design-parity row now has to meet, and what the
  // first run of it measured. One article in, one HTML page out.
  // Merged: 188, re-derived from the build rather than by adding the two deltas above.
  // 189 from 2026-08-25, for a second evidence record:
  // docs/evidence/design-parity-material-audit.md, which states the per-destination Material
  // Design 3 conformance audit a design-parity row also has to meet, why a machine is allowed
  // to write that one, and what the first run of it measured across all 32 destinations.
  // One article in, one HTML page out.
  // 190 from 2026-08-25, for a third evidence record:
  // docs/evidence/statuscell-text-pixels.md, which traces the last measured divergence inside
  // statusCell to a font weight the built application inherits and the design does not, and
  // records the two hypotheses that were falsified on the way to it.
  // One article in, one HTML page out.
  assert.equal(manifest.outputFiles.length, 190);
  assert.ok(manifest.outputFiles.some(file => file.path === 'social-preview.png'));
  assert.ok((await stat(join(root, 'dist', 'docs', 'README.html'))).isFile());
  const built = await readFile(join(root, 'dist', 'index.html'), 'utf8');
  assert.doesNotMatch(built, /\.\.\/docs\//); assert.match(built, /href="docs\/README\.html"/);
  const article=await readFile(join(root,'dist','docs','pbx','dash.html'),'utf8');assert.match(article,/<h1>Dashboard<\/h1>/);assert.doesNotMatch(article,/\.md"/);
});


test('the vendored fonts are published inside dist and every page reaches them', async () => {
  // The pages reference ../assets/fonts/ because that is where the fonts sit relative
  // to the source directory, which serves perfectly and hides the defect: the same
  // path points outside the published tree, so every font would 404 once deployed.
  const files = await readdir(join(root, 'dist', 'assets', 'fonts'));
  assert.ok(files.includes('fonts.css'), 'dist carries no fonts.css, so the published pages fall back silently');
  const faces = files.filter((file) => file.endsWith('.woff2')).length;
  assert.ok(faces >= 40, 'the published output carries only ' + faces + ' font faces; the vendored set is 49');
  const siteFiles = await readdir(join(root, 'dist', 'assets', 'site-fonts'));
  assert.ok(siteFiles.includes('fonts.css'), 'dist carries no site-fonts fonts.css, so Archivo/IBM Plex Mono fall back silently');
  const siteFaces = siteFiles.filter((file) => file.endsWith('.woff2')).length;
  assert.equal(siteFaces, 30, 'the published site-fonts set carries ' + siteFaces + ' faces; the vendored export declares 30 (15 Archivo weights/subsets + 15 IBM Plex Mono)');
  for (const page of ['index.html', 'product.html', 'downloads.html', 'documentation.html', 'status.html', 'settings.html']) {
    const html = await readFile(join(root, 'dist', page), 'utf8');
    // Plain string checks rather than patterns: the needles here are all slashes and
    // dots, and a mangled pattern would match nothing while still reporting a pass.
    assert.ok(!html.includes('../assets/'), page + ' still points outside the published tree');
    assert.ok(html.includes('href="assets/fonts/fonts.css"'), page + ' does not reference the published fonts');
    assert.ok(html.includes('href="assets/site-fonts/fonts.css"'), page + ' does not reference the published Blueprint fonts');
  }
});

test('publishes the honest unavailable installer state when no download manifest exists', async () => {
  const dist = await buildWithManifest(null);
  assertFallbackPublished(dist);
});

test('bakes a verified download manifest into the home page, the downloads page, and the release notes', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'ding-pbx-manifest-fixture-'));
  const manifestPath = join(scratch, 'release-manifest.json');
  try {
    await writeFile(manifestPath, JSON.stringify(FIXTURE_MANIFEST), 'utf8');
    const dist = await buildWithManifest(manifestPath);

    assert.match(dist['index.html'], /<strong id="home-installer-status-label">Published<\/strong>/);
    assert.match(dist['index.html'], /Verified release v9\.9\.9 · 123 MB · unsigned by permanent policy\./);
    assert.match(dist['index.html'], new RegExp(`<a class="download-button" id="home-download-button" href="${FIXTURE_MANIFEST.asset.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" rel="noopener" aria-describedby="home-installer-status-detail">Download for Windows \\(v9\\.9\\.9\\)</a>`));
    assert.match(dist['index.html'], /<strong>v9\.9\.9<\/strong><span class="trend">Verified installer<\/span>/);

    assert.match(dist['downloads.html'], /<span class="status-chip">Published<\/span>/);
    assert.match(dist['downloads.html'], /Verified release v9\.9\.9, published 2026-01-01\./);
    assert.match(dist['downloads.html'], new RegExp(`<a class="primary-button" id="download-button" href="${FIXTURE_MANIFEST.asset.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" aria-describedby="installer-status" rel="noopener">Download Ding-PBX-Console-Setup\\.exe \\(v9\\.9\\.9\\)</a>`));
    assert.match(dist['downloads.html'], /<dt>Version<\/dt><dd>v9\.9\.9<\/dd>/);
    assert.match(dist['downloads.html'], /<dt>Artifact<\/dt><dd>Ding-PBX-Console-Setup\.exe \(123 MB\)<\/dd>/);
    assert.match(dist['downloads.html'], new RegExp(`<dt>SHA-256</dt><dd><code>${FIXTURE_MANIFEST.asset.sha256}</code></dd>`));

    // A real installer exists once a manifest resolves, so "planned"/"CONCEPT" must
    // become "downloadable today"/"PREVIEW" everywhere those claims are made -- and
    // must never leave a stale "planned" behind in the JS-rendered copy that overwrites
    // the static HTML on load.
    assert.match(dist['index.html'], /Ding PBX Console is a Windows desktop console, downloadable today/);
    assert.match(dist['index.html'], /<strong>Console overview<\/strong><em>PREVIEW<\/em>/);
    assert.equal((dist['product.html'].match(/(?<!planned )desktop runtime/g) || []).length, 2);
    assert.doesNotMatch(dist['product.html'], /planned desktop runtime/);
    assert.match(dist['status.html'], /<small>Installer release<\/small><strong>Published v9\.9\.9<\/strong>/);
    assert.match(dist['status.html'], /<span class="gauge" style="--value:100%;--gauge-color:var\(--good\)"/);
    assert.match(dist['status.html'], /<span class="state-dot good"><\/span>/);
    assert.match(dist['status.html'], /<span class="sparkline is-good"/);
    assert.match(dist['status.html'], /<li data-state="good"><strong>Installer release published<\/strong><p>v9\.9\.9 verified against SHA256SUMS\.txt/);
    assert.match(dist['app.js'], /'Ding PBX Console is a desktop administration experience for Asterisk, downloadable today\./);
    assert.match(dist['app.js'], /Asterisk 嘅桌面管理應用程式，而家已經可以下載/);
    assert.doesNotMatch(dist['app.js'], /a planned desktop administration experience for Asterisk/);
    assert.doesNotMatch(dist['app.js'], /Asterisk 嘅桌面管理計劃項目/);

    // A JSON.stringify'd string is always valid inside a JS string literal (its escapes
    // are a subset of JS's), but this proves it against the fixture's own quote and
    // backslash characters rather than trusting that in the abstract.
    assert.equal(dist['app.js'].includes(`const RELEASE_NOTES_MARKDOWN = ${JSON.stringify(FIXTURE_MANIFEST.releaseNotesMarkdown)};`), true);
    await writeFile(join(scratch, 'app.js'), dist['app.js'], 'utf8');
    execFileSync(process.execPath, ['--check', join(scratch, 'app.js')], { stdio: 'pipe' });

    const manifest = JSON.parse(dist['build-manifest.json']);
    assert.equal(manifest.download.resolved, true);
    assert.equal(manifest.download.version, '9.9.9');
    assert.equal(manifest.download.tag, FIXTURE_MANIFEST.tag);
    assert.equal(manifest.download.assetUrl, FIXTURE_MANIFEST.asset.url);
    assert.equal(manifest.download.sha256, FIXTURE_MANIFEST.asset.sha256);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('rejects a structurally invalid download manifest and falls back to the honest state', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'ding-pbx-manifest-invalid-'));
  try {
    // An asset URL outside github.com's release-download path: exactly what a corrupted
    // or tampered manifest would look like, and exactly what must never reach a page.
    const invalid = { ...FIXTURE_MANIFEST, asset: { ...FIXTURE_MANIFEST.asset, url: 'https://evil.example/Ding-PBX-Console-Setup.exe' } };
    const manifestPath = join(scratch, 'release-manifest.json');
    await writeFile(manifestPath, JSON.stringify(invalid), 'utf8');
    const dist = await buildWithManifest(manifestPath);
    assertFallbackPublished(dist);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

let passed = 0;
for (const [name, fn] of tests) {
  try { await fn(); console.log(`PASS ${name}`); passed += 1; }
  catch (error) { console.error(`FAIL ${name}`); console.error(error.stack || error); process.exitCode = 1; }
}
console.log(`${passed}/${tests.length} tests passed`);
if (passed !== tests.length) process.exitCode = 1;
