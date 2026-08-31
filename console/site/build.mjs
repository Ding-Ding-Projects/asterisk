import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const docs = resolve(root, '..', 'docs');
const output = join(root, 'dist');
const assets = ['index.html', 'product.html', 'documentation.html', 'converter.html', 'ollama.html', 'downloads.html', 'status.html', 'settings.html', 'history.html', 'history-delivery.js', 'styles.css', 'app.js'];
const PUBLIC_REPOSITORY = 'Ding-Ding-Projects/material-asterisk';
const PUBLIC_SITE_ORIGIN = 'https://ding-ding-projects.github.io/material-asterisk/';
const socialPreview = resolve(root, '..', '..', 'social-preview.png');

if (process.argv.includes('--clean')) {
  await rm(output, { recursive: true, force: true });
  console.log(`Removed generated output ${output}`);
  process.exit(0);
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

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
/*
 * Product screenshots. The landing page references `screens/<file>.png`, so the files
 * have to be copied into the published tree for the same reason the fonts are: a source
 * directory that serves perfectly is exactly what makes a published 404 easy to miss.
 *
 * Copied by name from an explicit list rather than by sweeping the directory, so a
 * capture the page never references cannot quietly add megabytes to every visit, and so
 * a renamed file fails the build here instead of rendering as a broken image.
 */
const screenSource = resolve(root, '..', 'release', 'captures', 'gallery');
const screenOutput = join(output, 'screens');
const indexMarkup = await readFile(resolve(root, "index.html"), "utf8");
/* Split on the literal reference rather than matching a pattern: a backslash does not
 * reliably survive being written into a source file, and a mangled pattern that matches
 * nothing looks exactly like a page with no screenshots. */
const SCREEN_MARKER = "src=\"screens/";
const screensReferenced = indexMarkup
  .split(SCREEN_MARKER)
  .slice(1)
  .map((part) => part.slice(0, part.indexOf(String.fromCharCode(34))))
  .filter((name) => name.endsWith(".png"));
if (screensReferenced.length === 0) {
  throw new Error("index.html references no screenshots; the gallery would publish empty.");
}
await mkdir(screenOutput, { recursive: true });
for (const file of screensReferenced) {
  await copyFile(join(screenSource, file), join(screenOutput, file));
}
if (!fontFiles.includes('fonts.css')) {
  throw new Error(`No fonts.css in ${fontSource}; the published pages would fall back silently.`);
}

/*
 * The site's own Archivo / IBM Plex Mono set, vendored from the "Landing C - Blueprint"
 * design export by console/scripts/download-site-fonts.mjs. Same reasoning as the block
 * above: pages reference `../assets/site-fonts/` from the source directory, which serves
 * fine locally and would 404 once published unless copied and rewritten here too.
 */
const siteFontSource = resolve(root, '..', 'assets', 'site-fonts');
const siteFontOutput = join(output, 'assets', 'site-fonts');
await mkdir(siteFontOutput, { recursive: true });
const siteFontFiles = await readdir(siteFontSource);
for (const file of siteFontFiles) {
  await copyFile(join(siteFontSource, file), join(siteFontOutput, file));
}
if (!siteFontFiles.includes('fonts.css')) {
  throw new Error(`No fonts.css in ${siteFontSource}; the published pages would fall back silently.`);
}

/*
 * The real installer download, resolved by console/scripts/resolve-site-download-
 * manifest.mjs and baked into index.html / downloads.html / app.js at build time.
 *
 * The manifest's absence, unreadability, or failure of any of these checks is not an
 * error -- it is the honest "not published" fallback these pages already say, and this
 * build must never fail or block a Pages deploy because of it. Every check below is
 * therefore a downgrade to the fallback, never a thrown error, and the ONLY thing that
 * legitimately throws past this point is a template marker missing from the page HTML
 * itself, because that would mean the page can no longer express either state.
 */
function replaceOnce(text, needle, replacement, label) {
  const count = text.split(needle).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly 1 occurrence of ${JSON.stringify(needle)}, found ${count}`);
  return text.split(needle).join(replacement);
}
/* Same fail-loud contract as replaceOnce, for a substring that is deliberately
 * repeated (once per funny-level variant, for example) rather than a single marker. */
function replaceAllOccurrences(text, needle, replacement, expectedCount, label) {
  const count = text.split(needle).length - 1;
  if (count !== expectedCount) throw new Error(`${label}: expected exactly ${expectedCount} occurrence(s) of ${JSON.stringify(needle)}, found ${count}`);
  return text.split(needle).join(replacement);
}
const SETUP_ASSET_NAME = 'Ding-PBX-Console-Setup.exe';
const RELEASE_URL_PREFIX = `https://github.com/${PUBLIC_REPOSITORY}/releases/tag/`;
const ASSET_URL_PREFIX = `https://github.com/${PUBLIC_REPOSITORY}/releases/download/`;
const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const manifestPath = process.env.DING_PBX_SITE_RELEASE_MANIFEST ?? join(root, 'release-manifest.local.json');

function validateDownloadManifest(candidate) {
  if (candidate?.schemaVersion !== 1) return 'schemaVersion is not 1';
  if (candidate.resolved !== true) return 'resolved is not true';
  if (candidate.product !== 'ding-pbx-console') return 'product does not match';
  if (!SEMVER.test(candidate.version ?? '')) return 'version is not a semantic version';
  if (typeof candidate.tag !== 'string' || candidate.tag.length === 0) return 'tag is missing';
  if (!/^[0-9a-f]{40}$/.test(candidate.sourceCommit ?? '')) return 'sourceCommit is not a full commit SHA';
  if (Number.isNaN(Date.parse(candidate.publishedAt ?? ''))) return 'publishedAt is not a valid date';
  if (typeof candidate.releaseUrl !== 'string' || !candidate.releaseUrl.startsWith(RELEASE_URL_PREFIX)) return 'releaseUrl is not an immutable release tag URL';
  if (typeof candidate.releaseNotesMarkdown !== 'string') return 'releaseNotesMarkdown is not a string';
  const asset = candidate.asset ?? {};
  if (asset.name !== SETUP_ASSET_NAME) return 'asset.name does not name the installer';
  if (typeof asset.url !== 'string' || !asset.url.startsWith(ASSET_URL_PREFIX)) return 'asset.url is not an immutable release asset URL';
  if (!Number.isInteger(asset.sizeBytes) || asset.sizeBytes <= 0) return 'asset.sizeBytes is not a positive integer';
  if (!SHA256_HEX.test(asset.sha256 ?? '')) return 'asset.sha256 is not a lowercase 64-character hex digest';
  return null;
}

let downloadManifest = null;
let downloadManifestRejectionReason = null;
try {
  const candidate = JSON.parse(await readFile(manifestPath, 'utf8'));
  const invalidReason = validateDownloadManifest(candidate);
  if (invalidReason) downloadManifestRejectionReason = `rejected ${manifestPath}: ${invalidReason}`;
  else downloadManifest = candidate;
} catch (error) {
  downloadManifestRejectionReason = `no usable manifest at ${manifestPath}: ${error.message ?? error}`;
}
if (downloadManifestRejectionReason) console.log(downloadManifestRejectionReason);

const downloadValues = downloadManifest ? (() => {
  const versionLabel = `v${downloadManifest.version}`;
  const sizeMb = Math.round(downloadManifest.asset.sizeBytes / 1_000_000);
  const publishedDate = new Date(downloadManifest.publishedAt).toISOString().slice(0, 10);
  return {
    homeStatusLabel: 'Published',
    homeStatusDetail: `Verified release ${versionLabel} · ${sizeMb} MB · unsigned by permanent policy.`,
    homeDownloadAction: `<a class="download-button" id="home-download-button" href="${downloadManifest.asset.url}" rel="noopener" aria-describedby="home-installer-status-detail">Download for Windows (${versionLabel})</a>`,
    homeStatValue: escapeHtml(versionLabel),
    homeStatTrendClass: 'trend',
    homeStatTrendText: 'Verified installer',
    dlStatusChip: '<span class="status-chip">Published</span>',
    dlStatusDetail: `Verified release ${versionLabel}, published ${publishedDate}. The immutable asset URL and its SHA-256 were cross-checked against the release's own signed manifest and SHA256SUMS.txt before this page was published.`,
    dlAction: `<a class="primary-button" id="download-button" href="${downloadManifest.asset.url}" aria-describedby="installer-status" rel="noopener">Download ${SETUP_ASSET_NAME} (${versionLabel})</a>`,
    dlVersion: escapeHtml(versionLabel),
    dlArtifact: `${SETUP_ASSET_NAME} (${sizeMb} MB)`,
    dlSha256: `<code>${downloadManifest.asset.sha256}</code>`,
    releaseNotesMarkdown: downloadManifest.releaseNotesMarkdown,
    // A real installer exists: the hero copy, the homepage preview chrome, product.html's
    // "planned desktop runtime" phrasing, and status.html's installer-release card must
    // all say so, because a "planned"/"CONCEPT" surface next to a working download link
    // is its own false claim -- the opposite direction from guessing a URL, but just as
    // false. Every one of these returns to its exact honest fallback wording below when
    // no manifest resolves.
    heroLede: `Material Asterisk is a Windows desktop console, downloadable today, that administers Asterisk through a bounded control plane&mdash;backup, stage, validate, apply, read back, compare. The installer is unsigned by permanent policy and the product remains in active development. This website is documentation and download infrastructure, not the installed desktop application or a PBX runtime.`,
    homePreviewLabel: 'PREVIEW',
    runtimePrefix: '',
    heroLedeCopyEnNeedle: 'a planned desktop administration experience for Asterisk',
    heroLedeCopyEnReplacement: 'a desktop administration experience for Asterisk, downloadable today',
    heroLedeCopyZhNeedle: 'Asterisk 嘅桌面管理計劃項目',
    heroLedeCopyZhReplacement: 'Asterisk 嘅桌面管理應用程式，而家已經可以下載',
    statusGaugeValue: '100',
    statusGaugeColor: '--good',
    statusDotClass: 'good',
    statusInstallerLabel: `Published ${versionLabel}`,
    statusInstallerDetail: `Verified against the release's own signed manifest and SHA256SUMS.txt. ${sizeMb} MB, unsigned by permanent policy.`,
    statusSparklineClass: 'is-good',
    statusTimelineItem: `<li data-state="good"><strong>Installer release published</strong><p>${versionLabel} verified against SHA256SUMS.txt and the release's own signed manifest, published ${publishedDate}.</p></li>`,
  };
})() : {
  homeStatusLabel: 'Not published',
  homeStatusDetail: 'No verified release manifest exists yet, so this site does not guess a download URL.',
  homeDownloadAction: '<a class="download-button disabled-link" href="downloads.html" aria-disabled="true">Download unavailable</a>',
  homeStatValue: '—',
  homeStatTrendClass: 'trend warning',
  homeStatTrendText: 'Awaiting verification',
  dlStatusChip: '<span class="status-chip warning-chip">Not published</span>',
  dlStatusDetail: 'No verified release manifest exists yet, so this site does not guess a download URL.',
  dlAction: '<button class="primary-button" type="button" disabled aria-describedby="installer-status">Download unavailable</button>',
  dlVersion: 'Unavailable',
  dlArtifact: 'Not verified',
  dlSha256: 'Not published',
  releaseNotesMarkdown: '',
  heroLede: 'Material Asterisk is a planned Windows desktop console that administers Asterisk through a bounded control plane&mdash;backup, stage, validate, apply, read back, compare. This website is documentation and download infrastructure, not the installed desktop application or a PBX runtime.',
  homePreviewLabel: 'CONCEPT',
  runtimePrefix: 'planned ',
  heroLedeCopyEnNeedle: null,
  heroLedeCopyEnReplacement: null,
  heroLedeCopyZhNeedle: null,
  heroLedeCopyZhReplacement: null,
  statusGaugeValue: '0',
  statusGaugeColor: '--warning',
  statusDotClass: 'waiting',
  statusInstallerLabel: 'Not published',
  statusInstallerDetail: 'No verified immutable asset exists yet.',
  statusSparklineClass: 'is-waiting',
  statusTimelineItem: '<li data-state="waiting"><strong>Installer release pending</strong><p>Awaiting a non-draft release with a verified immutable asset and digest.</p></li>',
};

/*
 * The changelog the published site ships.
 *
 * The single source is `console/scripts/bundle-changelog.mjs`, which builds Markdown
 * from this repository's own tags: every version is a real tag, every change line is a
 * real commit reachable from that tag and not from the one before it, and every id is
 * the real 40-character SHA. This build reads the file that generator produced rather
 * than talking to git a second time, so the site and the desktop console cannot come to
 * carry two different changelogs from two different moments.
 *
 * Then it does the one thing the canonical contract asks for beyond shipping the text:
 * it refuses to emit a dead commit link. Every referenced id is handed to a single
 * `git cat-file --batch-check` and must resolve to a real commit object in this
 * repository.
 *
 * Whenever it cannot establish that -- no git on the machine, or a clone that simply
 * never fetched the objects -- the changelog still ships and the REPOSITORY URL is
 * dropped, so every id renders as plain text with no link on it. That is deliberately
 * not a thrown error: the promise is "never a dead link", and emitting no link keeps it
 * exactly, while failing the build would take the whole Pages deploy down for a reason
 * that has nothing to do with the pages.
 *
 * `changelogVerificationVerdict` below is where the one genuinely subtle judgement
 * lives -- what a "missing" report is and is not evidence of -- and it has its own tests
 * because the first version of it got that wrong and broke a deploy.
 */
function resolveChangelog() {
  const bundlePath = resolve(root, '..', 'app', 'renderer', 'src', 'generated', 'changelog-bundle.ts');
  let bundle;
  try {
    bundle = readFileSync(bundlePath, 'utf8');
  } catch {
    console.log('Changelog: no generated bundle found; the site will say it has no release history.');
    return { markdown: '', repository: '' };
  }
  const markdown = readGeneratedString(bundle, 'CHANGELOG_MARKDOWN');
  const repository = readGeneratedString(bundle, 'CHANGELOG_REPOSITORY_URL');
  if (!markdown) {
    console.log('Changelog: the generated bundle carries no release history; the site will say so.');
    return { markdown: '', repository: '' };
  }

  const commits = [...markdown.matchAll(/\(([0-9a-f]{40})\)/gi)].map((match) => match[1]);
  if (commits.length === 0) {
    console.log('Changelog: no commit ids in the release history; ids cannot be linked.');
    return { markdown, repository: '' };
  }
  let report;
  try {
    report = execFileSync('git', ['cat-file', '--batch-check'], {
      cwd: resolve(root, '..', '..'),
      input: `${commits.join('\n')}\n`,
      encoding: 'utf8',
    });
  } catch (error) {
    console.log(`Changelog: git could not verify ${commits.length} commit id(s) (${error.message.split('\n')[0]}); `
      + 'shipping the history with no commit links rather than links nobody checked.');
    return { markdown, repository: '' };
  }
  const missing = report.trim().split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !/\bcommit\b/.test(line))
    .map((line) => line.split(' ')[0]);
  const verdict = changelogVerificationVerdict(missing.length, isShallowCheckout());
  if (verdict === 'unverifiable') {
    console.log(`Changelog: ${missing.length} commit id(s) were not found in this checkout, and this checkout `
      + 'is shallow (or its depth could not be established), so that proves nothing about the repository. '
      + 'Shipping the history with no commit links rather than links nobody checked.');
    return { markdown, repository: '' };
  }
  if (verdict === 'dead') {
    throw new Error(`Changelog: git reports ${missing.length} referenced commit(s) missing from this repository, `
      + `so their links would be dead: ${missing.slice(0, 5).join(', ')}`);
  }
  if (!/^https:\/\/\S+$/.test(repository)) {
    console.log(`Changelog: the recorded repository URL ${JSON.stringify(repository)} is not an https URL; `
      + 'shipping the history with no commit links.');
    return { markdown, repository: '' };
  }
  console.log(`Changelog: ${commits.length} commit id(s) verified against this repository; linking to ${repository}.`);
  return { markdown, repository };
}

/**
 * What a "missing" report from `git cat-file` actually licenses us to conclude.
 *
 * This is a pure function with its own tests because getting it wrong shipped a broken
 * Pages deploy. The first version reasoned: git answered, git said missing, therefore the
 * commit is gone and the link would be dead, therefore throw. That is false in exactly the
 * case CI runs in. `actions/checkout` clones one commit deep, so `cat-file` correctly
 * reports every one of the twenty-six referenced commits as missing -- from THIS CHECKOUT.
 * It says nothing whatever about the repository, which still has all of them.
 *
 * The distinction the check actually needs is between "the repository has lost this
 * commit" and "this clone never fetched it", and `cat-file` alone cannot tell them apart.
 * `git rev-parse --is-shallow-repository` can, so it is what decides:
 *
 *   - nothing missing            -> verified; emit the links
 *   - missing, clone is shallow  -> unverifiable; emit the history with no links, say why
 *   - missing, clone is complete -> dead; fail the build, because now it really is a claim
 *                                   about the repository rather than about this directory
 *   - missing, depth unknown     -> unverifiable, because an unknown is not a proof
 */
function changelogVerificationVerdict(missingCount, shallow) {
  if (missingCount === 0) return 'verified';
  return shallow === false ? 'dead' : 'unverifiable';
}

/** true, false, or undefined when git cannot say -- and undefined is never treated as false. */
function isShallowCheckout() {
  try {
    const answer = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: resolve(root, '..', '..'),
      encoding: 'utf8',
    }).trim();
    if (answer === 'true') return true;
    if (answer === 'false') return false;
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * The value of one `export const NAME: string = <literal>;` out of the generated bundle.
 *
 * Both quote styles occur in that file: the Markdown is emitted double-quoted through
 * `JSON.stringify`, and the repository URL single-quoted. A double-quoted literal is
 * JSON and is parsed as JSON. A single-quoted one is accepted only when it carries no
 * backslash at all, because unescaping single-quoted JavaScript by hand is exactly the
 * kind of near-miss that silently corrupts a string, and an empty result here is a
 * visible "no changelog" rather than a quietly mangled one.
 */
function readGeneratedString(source, name) {
  const marker = `export const ${name}: string = `;
  const start = source.indexOf(marker);
  if (start === -1) return '';
  /* Bounded by the end of that line rather than by the next ";\n": parts of this
   * checkout are CRLF, and a needle carrying a bare newline would run past a CRLF line
   * ending and swallow whatever declaration came next. */
  const from = start + marker.length;
  const lineEnd = source.slice(from).search(/[\r\n]/);
  const line = lineEnd === -1 ? source.slice(from) : source.slice(from, from + lineEnd);
  const literal = line.trim().replace(/;$/, '').trim();
  if (literal.startsWith('"')) {
    try {
      return JSON.parse(literal);
    } catch {
      return '';
    }
  }
  if (literal.startsWith("'") && literal.endsWith("'") && !literal.includes(String.fromCharCode(92))) {
    return literal.slice(1, -1);
  }
  return '';
}

const changelogValues = resolveChangelog();

/**
 * The identity of this build: what `version.json` publishes and what gets baked into
 * `app.js` so a loaded page knows which build it is.
 *
 * The commit is the thing that decides, so a build that cannot resolve one publishes
 * NOTHING rather than a manifest with a placeholder in it. The page then reports itself
 * unbuilt and never asks -- which is the honest outcome, and is also why the two halves
 * cannot disagree: they come from this one resolution or neither exists.
 *
 * The version label is for a person to read and is never compared. It is the verified
 * release this site documents when there is one, and `unversioned` when there is not;
 * inventing a version number for an unreleased build would be a reading nobody took.
 */
function resolveBuildIdentity() {
  let commit = '';
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: resolve(root, '..', '..'),
      encoding: 'utf8',
    }).trim();
  } catch {
    commit = '';
  }
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    return { resolved: false, reason: 'git could not name the commit this site was built from' };
  }
  return {
    resolved: true,
    version: downloadManifest ? `v${downloadManifest.version}` : 'unversioned',
    commit,
    builtAt: new Date().toISOString(),
  };
}

const buildIdentity = resolveBuildIdentity();

for (const asset of assets) {
  let content = await readFile(join(root, asset));
  let text = content.toString('utf8').replaceAll('../assets/fonts/', 'assets/fonts/').replaceAll('../assets/site-fonts/', 'assets/site-fonts/');
  // Current published links use the maintained identity. Historical `/asterisk/`
  // references remain valid evidence, but must not leak into new output.
  text = text.replaceAll('https://ding-ding-projects.github.io/asterisk/', PUBLIC_SITE_ORIGIN)
    .replaceAll('https://github.com/Ding-Ding-Projects/asterisk/', `https://github.com/${PUBLIC_REPOSITORY}/`);
  const navStart = text.indexOf('<nav class="site-nav"');
  const navEnd = navStart < 0 ? -1 : text.indexOf('</nav>', navStart);
  if (navStart >= 0 && navEnd > navStart) {
    const nav = text.slice(navStart, navEnd);
    const additions = `${nav.includes('ollama.html') ? '' : '<a href="ollama.html">Ollama</a>'}${nav.includes('history.html') ? '' : '<a href="history.html">History</a>'}`;
    text = text.slice(0, navEnd) + additions + text.slice(navEnd);
  }
  if (asset.endsWith('.html') && !text.includes('rel="canonical"')) {
    const canonicalUrl = `${PUBLIC_SITE_ORIGIN}${asset === 'index.html' ? '' : asset}`;
    const metadata = `<link rel="canonical" href="${canonicalUrl}"><meta name="twitter:card" content="summary_large_image">`;
    text = text.replace('<title>', `${metadata}<title>`);
  }
  if (asset === 'index.html') {
    text = text.replaceAll('../docs/', 'docs/').replaceAll('.md"', '.html"');
    text = replaceOnce(text, '{{DING_PBX_HOME_STATUS_LABEL}}', downloadValues.homeStatusLabel, asset);
    text = replaceOnce(text, '{{DING_PBX_HOME_STATUS_DETAIL}}', downloadValues.homeStatusDetail, asset);
    text = replaceOnce(text, '{{DING_PBX_HOME_DOWNLOAD_ACTION}}', downloadValues.homeDownloadAction, asset);
    text = replaceOnce(text, '{{DING_PBX_HOME_STAT_VALUE}}', downloadValues.homeStatValue, asset);
    text = replaceOnce(text, '{{DING_PBX_HOME_STAT_TREND_CLASS}}', downloadValues.homeStatTrendClass, asset);
    text = replaceOnce(text, '{{DING_PBX_HOME_STAT_TREND_TEXT}}', downloadValues.homeStatTrendText, asset);
    text = replaceOnce(text, '{{DING_PBX_HERO_LEDE}}', downloadValues.heroLede, asset);
    text = replaceOnce(text, '{{DING_PBX_HOME_PREVIEW_LABEL}}', downloadValues.homePreviewLabel, asset);
  }
  if (asset === 'product.html') {
    text = replaceAllOccurrences(text, '{{DING_PBX_RUNTIME_PREFIX}}', downloadValues.runtimePrefix, 2, asset);
  }
  if (asset === 'downloads.html') {
    text = replaceOnce(text, '{{DING_PBX_DL_STATUS_CHIP}}', downloadValues.dlStatusChip, asset);
    text = replaceOnce(text, '{{DING_PBX_DL_STATUS_DETAIL}}', downloadValues.dlStatusDetail, asset);
    text = replaceOnce(text, '{{DING_PBX_DL_ACTION}}', downloadValues.dlAction, asset);
    text = replaceOnce(text, '{{DING_PBX_DL_VERSION}}', downloadValues.dlVersion, asset);
    text = replaceOnce(text, '{{DING_PBX_DL_ARTIFACT}}', downloadValues.dlArtifact, asset);
    text = replaceOnce(text, '{{DING_PBX_DL_SHA256}}', downloadValues.dlSha256, asset);
  }
  if (asset === 'status.html') {
    text = replaceOnce(text, '{{DING_PBX_STATUS_GAUGE_VALUE}}', downloadValues.statusGaugeValue, asset);
    text = replaceOnce(text, '{{DING_PBX_STATUS_GAUGE_COLOR}}', downloadValues.statusGaugeColor, asset);
    text = replaceOnce(text, '{{DING_PBX_STATUS_DOT_CLASS}}', downloadValues.statusDotClass, asset);
    text = replaceOnce(text, '{{DING_PBX_STATUS_INSTALLER_LABEL}}', downloadValues.statusInstallerLabel, asset);
    text = replaceOnce(text, '{{DING_PBX_STATUS_INSTALLER_DETAIL}}', downloadValues.statusInstallerDetail, asset);
    text = replaceOnce(text, '{{DING_PBX_STATUS_SPARKLINE_CLASS}}', downloadValues.statusSparklineClass, asset);
    text = replaceOnce(text, '{{DING_PBX_STATUS_TIMELINE_ITEM}}', downloadValues.statusTimelineItem, asset);
  }
  if (asset === 'app.js') {
    text = replaceOnce(text, "const RELEASE_NOTES_MARKDOWN = '';", `const RELEASE_NOTES_MARKDOWN = ${JSON.stringify(downloadValues.releaseNotesMarkdown)};`, asset);
    text = replaceOnce(text, "const CHANGELOG_MARKDOWN = '';", `const CHANGELOG_MARKDOWN = ${JSON.stringify(changelogValues.markdown)};`, asset);
    text = replaceOnce(text, "const CHANGELOG_REPOSITORY_URL = '';", `const CHANGELOG_REPOSITORY_URL = ${JSON.stringify(changelogValues.repository)};`, asset);
    // All three or none of the three. A page carrying a commit whose manifest was never
    // written would ask on every load and report a site that is down; a page carrying a
    // version with no commit would have nothing to compare.
    if (buildIdentity.resolved) {
      text = replaceOnce(text, "const SITE_BUILD_VERSION = '';", `const SITE_BUILD_VERSION = ${JSON.stringify(buildIdentity.version)};`, asset);
      text = replaceOnce(text, "const SITE_BUILD_COMMIT = '';", `const SITE_BUILD_COMMIT = ${JSON.stringify(buildIdentity.commit)};`, asset);
      text = replaceOnce(text, "const SITE_BUILD_AT = '';", `const SITE_BUILD_AT = ${JSON.stringify(buildIdentity.builtAt)};`, asset);
    }
    // The hero lede's runtime-rendered text (COPY.heroLede, applied over the static
    // HTML above by app.js's own applyCopy()) must agree with it in every funny-level
    // variant and both languages, or a JS-enabled visitor sees the honest static text
    // for one render frame and then a stale "planned" claim the moment the script runs.
    if (downloadValues.heroLedeCopyEnNeedle) {
      text = replaceAllOccurrences(text, downloadValues.heroLedeCopyEnNeedle, downloadValues.heroLedeCopyEnReplacement, 4, asset);
      text = replaceAllOccurrences(text, downloadValues.heroLedeCopyZhNeedle, downloadValues.heroLedeCopyZhReplacement, 4, asset);
    }
  }
  await writeFile(join(output, asset), Buffer.from(text));
}
await copyFile(socialPreview, join(output, 'social-preview.png'));
// The published identity of this build, which every loaded page compares itself
// against. Written only when the identity resolved, for the reason above.
if (buildIdentity.resolved) {
  await writeFile(join(output, 'version.json'), `${JSON.stringify({
    schemaVersion: 1,
    version: buildIdentity.version,
    commit: buildIdentity.commit,
    builtAt: buildIdentity.builtAt,
  }, null, 2)}\n`, 'utf8');
}

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
    const markdown=await readFile(join(docs,child),'utf8'), title=markdown.match(/^#\s+(.+)$/m)?.[1]||'Material Asterisk documentation';
    const htmlRelative=child.replace(/\.md$/,'.html'), destination=join(output,'docs',htmlRelative), depth=htmlRelative.split(/[\\/]/).length;
    const back='../'.repeat(depth), sections=[...markdown.matchAll(/^##\s+(.+)$/gm)].map(match=>({title:match[1],id:match[1].toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')})), sectionNav=sections.map(section=>`<a href="#${section.id}">${escapeHtml(section.title)}</a>`).join(''), page=`<!doctype html>\n<html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(title)} documentation for Material Asterisk."><meta property="og:title" content="${escapeHtml(title)} · Material Asterisk"><meta property="og:description" content="Focused Material Asterisk feature documentation."><meta property="og:url" content="https://ding-ding-projects.github.io/asterisk/docs/${htmlRelative.replaceAll('\\','/')}"><meta property="og:image" content="https://ding-ding-projects.github.io/asterisk/social-preview.png"><meta name="twitter:card" content="summary_large_image"><title>${escapeHtml(title)} · Material Asterisk</title><link rel="stylesheet" href="${back}styles.css"></head><body><a class="skip-link" href="#article-content">Skip to article</a><main class="documentation-page"><nav aria-label="Documentation breadcrumb"><a href="${back}index.html">Material Asterisk</a> · <a href="${back}documentation.html">Documentation map</a> · <a href="${back}docs/README.html">Category index</a></nav><div class="article-shell"><nav class="article-nav" aria-label="Article sections">${sectionNav||'<a href="#article-content">Article</a>'}</nav><article id="article-content">${renderMarkdown(markdown)}</article></div><footer><p>This documentation website is not the installed desktop application and is not a PBX runtime.</p></footer></main></body></html>\n`;
    await mkdir(dirname(destination),{recursive:true});await writeFile(destination,page,'utf8');
  }
}
await composeDocs();

// Docs pages are generated after the source-page loop, so apply the same identity
// rule to their current metadata before hashing the published output.
async function rewritePublishedIdentity(relative = '.') {
  for (const entry of await readdir(join(output, relative), { withFileTypes: true })) {
    const child = join(relative, entry.name);
    if (entry.isDirectory()) { await rewritePublishedIdentity(child); continue; }
    if (!entry.name.endsWith('.html') && !entry.name.endsWith('.js')) continue;
    const path = join(output, child);
    const current = await readFile(path, 'utf8');
    let rewritten = current.replaceAll('https://ding-ding-projects.github.io/asterisk/', PUBLIC_SITE_ORIGIN)
      .replaceAll('https://github.com/Ding-Ding-Projects/asterisk/', `https://github.com/${PUBLIC_REPOSITORY}/`);
    if (child.endsWith('.html') && child.startsWith(`docs${String.fromCharCode(92)}`) && !rewritten.includes('rel="canonical"')) {
      const canonicalUrl = `${PUBLIC_SITE_ORIGIN}${child.replaceAll(String.fromCharCode(92), '/')}`;
      rewritten = rewritten.replace('<title>', `<link rel="canonical" href="${canonicalUrl}"><meta property="og:image:width" content="1280"><meta property="og:image:height" content="640"><meta property="og:image:alt" content="Material Asterisk documentation"><meta name="twitter:card" content="summary_large_image"><title>`);
    }
    if (rewritten !== current) await writeFile(path, rewritten, 'utf8');
  }
}
await rewritePublishedIdentity();

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
  networkFetches: 0,
  // Whether this build could name itself. Recorded here because it decides whether
  // `version.json` exists at all, and therefore whether the published output carries one
  // more file than a build made outside a git checkout would.
  buildIdentity: buildIdentity.resolved
    ? { resolved: true, version: buildIdentity.version, commit: buildIdentity.commit }
    : { resolved: false, reason: buildIdentity.reason },
  download: downloadManifest
    ? { resolved: true, version: downloadManifest.version, tag: downloadManifest.tag, assetUrl: downloadManifest.asset.url, sha256: downloadManifest.asset.sha256 }
    : { resolved: false, reason: downloadManifestRejectionReason ?? `no manifest file at ${manifestPath}` },
  outputFiles: files.sort((a, b) => a.path.localeCompare(b.path))
};
await writeFile(join(output, 'build-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Composed ${output}`);
// Build-time fetches, which is what `networkFetches` has always counted. A published
// page now makes exactly one runtime request of its own -- `version.json`, on this same
// origin -- so saying "runtime" here would be saying something false.
console.log(`Output files: ${files.length}; build-time network fetches: 0`);
