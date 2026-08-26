import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
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

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

test('declares responsive and Open Graph metadata', () => {
  assert.match(html, /<meta name="viewport"/);
  for (const key of ['og:title','og:description','og:url','og:type','og:site_name','og:image','og:image:width','og:image:height','og:image:alt']) assert.match(html, new RegExp(`property="${key}"`));
  assert.match(html, /twitter:card" content="summary_large_image"/);
});
test('states the static site boundary and honest unavailable installer', () => {
  assert.match(html, /not the installed desktop application/i);
  assert.match(html, /not a PBX runtime/i);
  assert.match(pages.downloads, /Not published/);
  assert.doesNotMatch(everyPage, /href="https?:[^"]*Setup.exe/i);
  assert.match(pages.downloads, /No verified release manifest exists yet/);
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
  execFileSync(process.execPath, [join(root, 'build.mjs')], { cwd: repo, stdio: 'pipe' });
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
  assert.equal(manifest.outputFiles.length, 189);
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

let passed = 0;
for (const [name, fn] of tests) {
  try { await fn(); console.log(`PASS ${name}`); passed += 1; }
  catch (error) { console.error(`FAIL ${name}`); console.error(error.stack || error); process.exitCode = 1; }
}
console.log(`${passed}/${tests.length} tests passed`);
if (passed !== tests.length) process.exitCode = 1;
