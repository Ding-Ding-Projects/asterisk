import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const docs = resolve(root, '..', 'docs');
const output = join(root, 'dist');
const assets = ['index.html', 'product.html', 'documentation.html', 'converter.html', 'ollama.html', 'downloads.html', 'status.html', 'settings.html', 'styles.css', 'app.js', 'qr-encoder.js'];
const socialPreview = resolve(root, '..', '..', 'social-preview.png');
const packageFile = resolve(root, '..', 'package.json');
const releaseEvidenceFile = resolve(root, '..', 'release', 'evidence', 'site-release.json');
const repoRoot = resolve(root, '..', '..');

function git(args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function changelogRecord() {
  let tags = [];
  try {
    tags = git(['tag', '--sort=-creatordate', '--format=%(refname:short)'])
      .split('\n').map(tag => tag.trim()).filter(tag => tag.startsWith('ding-pbx-console-v'));
  } catch {
    return [];
  }
  return tags.map((tag, index) => {
    const version = tag.slice('ding-pbx-console-v'.length);
    let date = '';
    let tagCommit = '';
    try {
      date = git(['log', '-1', '--format=%cs', tag]);
      tagCommit = git(['rev-list', '-1', tag]);
    } catch {
      return null;
    }
    const previous = tags[index + 1];
    let rows = [];
    try {
      const range = previous ? `${previous}..${tag}` : tag;
      const raw = git(['log', '--no-merges', '--format=%H%x1f%s', range]);
      rows = raw ? raw.split('\n').map(line => {
        const [commit, subject] = line.split('\x1f');
        return /^[0-9a-f]{40}$/i.test(commit || '') && subject ? { text: subject.replace(/[\r\n]/g, ' ').trim(), commit: commit.toLowerCase() } : null;
      }).filter(Boolean) : [];
    } catch {
      rows = [];
    }
    if (!rows.length && /^[0-9a-f]{40}$/i.test(tagCommit)) rows = [{ text: 'Release published; no new commits were recorded against the previous tag.', commit: tagCommit.toLowerCase() }];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version) || !rows.length) return null;
    return { version, date, commit: rows[0].commit, changes: rows };
  }).filter(Boolean);
}

if (process.argv.includes('--clean')) {
  await rm(output, { recursive: true, force: true });
  console.log(`Removed generated output ${output}`);
  process.exit(0);
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

async function listMarkdown(relative = '') {
  const files = [];
  for (const entry of await readdir(join(docs, relative), { withFileTypes: true })) {
    const child = join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await listMarkdown(child));
    else if (entry.name.endsWith('.md')) files.push(child.replaceAll('\\', '/'));
  }
  return files;
}

function isHttpsUrl(value) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

function validateReleaseEvidence(value) {
  if (!value || value.schemaVersion !== 1) throw new Error('release evidence must use schemaVersion 1');
  const allowed = new Set(['schemaVersion', 'tag', 'version', 'publishedAt', 'sourceCommit', 'setup', 'releases', 'packages']);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`release evidence contains unexpected field ${key}`);
  if (!/^ding-pbx-console-[a-z0-9._-]+$/i.test(value.tag || '')) throw new Error('release evidence tag is missing or outside the Ding PBX Console release namespace');
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value.version || '')) throw new Error('release evidence version is not a semantic version');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value.publishedAt || '')) throw new Error('release evidence publishedAt must be a UTC ISO-8601 timestamp');
  if (!/^[0-9a-f]{40}$/i.test(value.sourceCommit || '')) throw new Error('release evidence sourceCommit must be a full commit SHA');
  const validateAsset = (asset, label) => {
    if (!asset || typeof asset !== 'object') throw new Error(`${label} evidence is missing`);
    if (typeof asset.name !== 'string' || !asset.name.trim()) throw new Error(`${label} name is missing`);
    if (!isHttpsUrl(asset.url)) throw new Error(`${label} URL must be HTTPS`);
    if (!Number.isSafeInteger(asset.bytes) || asset.bytes <= 0) throw new Error(`${label} byte count must be a positive integer`);
    if (!/^[0-9a-f]{64}$/i.test(asset.sha256 || '')) throw new Error(`${label} SHA-256 is missing or invalid`);
    return { name: asset.name, url: asset.url, bytes: asset.bytes, sha256: asset.sha256.toLowerCase() };
  };
  const setup = validateAsset(value.setup, 'Setup.exe');
  if (!/Setup\.exe$/i.test(setup.name)) throw new Error('release evidence setup asset is not a Setup.exe');
  const releases = validateAsset(value.releases, 'RELEASES');
  if (releases.name !== 'RELEASES') throw new Error('release evidence RELEASES asset has the wrong name');
  if (!Array.isArray(value.packages) || value.packages.length < 1) throw new Error('release evidence must include at least one full nupkg');
  const packages = value.packages.map((asset, index) => validateAsset(asset, `package ${index + 1}`));
  if (!packages.some(asset => /\.nupkg$/i.test(asset.name) && !/-delta\.nupkg$/i.test(asset.name))) throw new Error('release evidence contains no full nupkg');
  return { state: 'available', source: 'console/release/evidence/site-release.json', tag: value.tag, version: value.version, publishedAt: value.publishedAt, sourceCommit: value.sourceCommit.toLowerCase(), setup, releases, packages };
}

async function releaseRecord() {
  try {
    return validateReleaseEvidence(JSON.parse(await readFile(releaseEvidenceFile, 'utf8')));
  } catch (error) {
    if (error?.code === 'ENOENT') return { state: 'unavailable', source: 'console/release/evidence/site-release.json', reason: 'No validated release evidence record was present when this site was composed.' };
    return { state: 'invalid', source: 'console/release/evidence/site-release.json', reason: `The release evidence record was rejected: ${error.message}` };
  }
}

const markdownFiles = await listMarkdown();
const packageMetadata = JSON.parse(await readFile(packageFile, 'utf8'));
const runtimeNetworkEntries = [];
for (const asset of assets) {
  const source = await readFile(join(root, asset), 'utf8');
  if (asset.endsWith('.js')) {
    for (const match of source.matchAll(/\b(fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/g)) runtimeNetworkEntries.push(`${asset}:${match[1]}`);
  }
  if (asset.endsWith('.html')) {
    for (const match of source.matchAll(/<(?:script|img|source|link)\b[^>]*(?:src|href)=["']https:/gi)) runtimeNetworkEntries.push(`${asset}:${match[0].slice(0, 80)}`);
  }
}
const validatedRelease = await releaseRecord();
const release = validatedRelease.state === 'available' && validatedRelease.version !== packageMetadata.version
  ? { ...validatedRelease, state: 'stale', reason: `The release record describes ${validatedRelease.version}, while this site composition describes ${packageMetadata.version}.` }
  : validatedRelease;
const siteStatusRecord = {
  schemaVersion: 1,
  build: {
    state: 'validated',
    source: 'build-manifest.json',
    documentationArticles: markdownFiles.length,
    topLevelPages: assets.filter(asset => asset.endsWith('.html')).length,
    runtimeNetworkFetches: runtimeNetworkEntries.length,
    runtimeNetworkEntries,
    packageVersion: typeof packageMetadata.version === 'string' ? packageMetadata.version : null
  },
  release,
  changelog: changelogRecord()
};
const embeddedStatusRecord = `<script id="site-status-record" type="application/json">${JSON.stringify(siteStatusRecord).replaceAll('<', '\\u003c')}</script>`;

function embedStatusRecord(text) {
  if (!text.includes('</body>')) throw new Error('HTML page has no closing body for the status record');
  return text.replace('</body>', `${embeddedStatusRecord}</body>`);
}

/**
 * The vendored fonts, copied in and rewritten to a path that exists once published.
 *
 * The pages reference `../assets/fonts/` because that is where the fonts really are
 * relative to the source directory. Published output is flat under `dist/`, so that
 * same path points outside the published tree and every font 404s — while the source
 * directory serves perfectly, which is exactly what makes it easy to miss. Copy them
 * in and rewrite the reference, the same way the docs links are already rewritten.
 */
const fontSource = resolve(root, '..', 'assets', 'fonts');
const fontOutput = join(output, 'assets', 'fonts');
await mkdir(fontOutput, { recursive: true });
const fontFiles = await readdir(fontSource);
for (const file of fontFiles) {
  await copyFile(join(fontSource, file), join(fontOutput, file));
}
if (!fontFiles.includes('fonts.css')) {
  throw new Error(`No fonts.css in ${fontSource}; the published pages would fall back silently.`);
}

for (const asset of assets) {
  let content = await readFile(join(root, asset));
  let text = content.toString('utf8').replaceAll('../assets/fonts/', 'assets/fonts/');
  if (asset === 'index.html') {
    text = text.replaceAll('../docs/', 'docs/').replaceAll('.md"', '.html"');
  }
  if (asset.endsWith('.html')) text = embedStatusRecord(text);
  await writeFile(join(output, asset), Buffer.from(text));
}
await copyFile(socialPreview, join(output, 'social-preview.png'));

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);
}
function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => `<a href="${href.replace(/\.md$/, '.html')}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
function renderMarkdown(markdown) {
  const outputLines=[]; let listOpen=false;
  for(const rawLine of markdown.replaceAll('\r\n','\n').split('\n')) {
    const line=rawLine.trim();
    if(line.startsWith('- ')){if(!listOpen){outputLines.push('<ul>');listOpen=true}outputLines.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);continue}
    if(listOpen){outputLines.push('</ul>');listOpen=false}
    if(!line)continue;
    const heading=line.match(/^(#{1,6})\s+(.+)$/);if(heading){const level=heading[1].length,id=heading[2].toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');outputLines.push(`<h${level}${level===2?` id="${id}"`:''}>${inlineMarkdown(heading[2])}</h${level}>`)}else outputLines.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  if(listOpen)outputLines.push('</ul>');
  return outputLines.join('\n');
}
async function composeDocs(sourceRelative='') {
  for(const entry of await readdir(join(docs,sourceRelative),{withFileTypes:true})) {
    const child=join(sourceRelative,entry.name);
    if(entry.isDirectory()){await composeDocs(child);continue}
    if(!entry.name.endsWith('.md'))continue;
    const markdown=await readFile(join(docs,child),'utf8'), title=markdown.match(/^#\s+(.+)$/m)?.[1]||'Ding PBX Console documentation';
    const htmlRelative=child.replace(/\.md$/,'.html'), destination=join(output,'docs',htmlRelative), depth=htmlRelative.split(/[\\/]/).length;
    const back='../'.repeat(depth), sections=[...markdown.matchAll(/^##\s+(.+)$/gm)].map(match=>({title:match[1],id:match[1].toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')})), sectionNav=sections.map(section=>`<a href="#${section.id}">${escapeHtml(section.title)}</a>`).join(''), page=embedStatusRecord(`<!doctype html>\n<html lang="en" data-theme="dark" data-base="${back}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(title)} documentation for Ding PBX Console."><meta name="theme-color" content="#0B0F0C"><meta property="og:title" content="${escapeHtml(title)} · Ding PBX Console"><meta property="og:description" content="Focused Ding PBX Console feature documentation."><meta property="og:url" content="https://ding-ding-projects.github.io/asterisk/docs/${htmlRelative.replaceAll('\\','/')}"><meta property="og:type" content="article"><meta property="og:site_name" content="Ding PBX Console"><meta property="og:image" content="https://ding-ding-projects.github.io/asterisk/social-preview.png"><meta property="og:image:width" content="1280"><meta property="og:image:height" content="640"><meta property="og:image:alt" content="Ding PBX Console documentation interface"><meta name="twitter:card" content="summary_large_image"><title>${escapeHtml(title)} · Ding PBX Console</title><link rel="stylesheet" href="${back}styles.css"></head><body data-page="article"><a class="skip-link" href="#article-content">Skip to article</a><header class="topbar"><a class="brand" href="${back}index.html"><span class="brand-mark" aria-hidden="true">D</span><span><strong>Ding PBX Console</strong><small>Documentation &amp; download</small></span></a><nav class="site-nav" id="site-nav" aria-label="Primary"><a href="${back}index.html">Home</a><a href="${back}product.html">Product</a><a href="${back}documentation.html" aria-current="page">Documentation</a><a href="${back}downloads.html">Downloads</a><a href="${back}status.html">Status</a><a href="${back}settings.html">Settings</a></nav><div class="top-actions"><button class="command-button" id="palette-open" type="button">Search <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd></button><button class="icon-button nav-toggle" id="nav-toggle" type="button" aria-label="Open navigation" aria-expanded="false">☰</button></div></header><main class="documentation-page"><nav aria-label="Documentation breadcrumb"><a href="${back}index.html">Ding PBX Console</a> · <a href="${back}documentation.html">Documentation map</a> · <a href="${back}docs/README.html">Category index</a></nav><div class="article-shell"><nav class="article-nav" aria-label="Article sections">${sectionNav||'<a href="#article-content">Article</a>'}</nav><article id="article-content">${renderMarkdown(markdown)}</article></div><footer><p>This documentation website is not the installed desktop application and is not a PBX runtime.</p></footer></main><div id="toast-region" class="toast-region" aria-live="polite"></div><script src="${back}app.js" defer></script></body></html>\n`);
    await mkdir(dirname(destination),{recursive:true});await writeFile(destination,page,'utf8');
  }
}
await composeDocs();

const files = [];
async function record(relative) {
  const content = await readFile(join(output, relative));
  files.push({ path: relative.replaceAll('\\', '/'), bytes: content.length, sha256: createHash('sha256').update(content).digest('hex') });
}
async function walk(relative) {
  for (const entry of await readdir(join(output, relative), { withFileTypes: true })) {
    const child = join(relative, entry.name);
    if (entry.isDirectory()) await walk(child);
    else if (entry.name !== 'build-manifest.json') await record(child);
  }
}
await walk('.');

const manifest = {
  schemaVersion: 1,
  generatedBy: 'node console/site/build.mjs',
  networkFetches: runtimeNetworkEntries.length,
  status: siteStatusRecord,
  outputFiles: files.sort((a, b) => a.path.localeCompare(b.path))
};
await writeFile(join(output, 'build-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Composed ${output}`);
console.log(`Output files: ${files.length}; runtime network fetches: 0`);
