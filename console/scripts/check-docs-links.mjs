import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const fixture = JSON.parse(await readFile(resolve(root, 'inventories/docs-link-chut.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(root, 'app/renderer/src/generated/docs-bundle-manifest.json'), 'utf8'));
const bundleText = await readFile(resolve(root, 'app/renderer/src/generated/docs-bundle.ts'), 'utf8');
const bundleMarker = 'export const DOCS_BUNDLE: DocsBundle = ';
const bundleStart = bundleText.indexOf(bundleMarker);
const bundleEnd = bundleText.lastIndexOf(' as const;');
if (bundleStart < 0 || bundleEnd < bundleStart) throw new Error('DOCS_BUNDLE generated object is missing.');
const bundle = JSON.parse(bundleText.slice(bundleStart + bundleMarker.length, bundleEnd));
const bundleShape = {
  articleCount: bundle.articleCount,
  articleIds: bundle.articles.map((article) => article.id),
  headings: Object.fromEntries(bundle.articles.map((article) => [article.id, article.headings.map((heading) => heading.id)])),
  links: Object.fromEntries(bundle.articles.map((article) => [article.id, article.links])),
};
const manifestShape = { articleCount: manifest.articleCount, articleIds: manifest.articleIds, headings: manifest.headings, links: manifest.links };
if (JSON.stringify(bundleShape) !== JSON.stringify(manifestShape)) throw new Error('DOCS_BUNDLE manifest does not match the generated bundle ids, headings, links, and count.');
const bundleCount = bundle.articleCount;
const ids = new Set(manifest.articleIds);

function targetFor(from, href) {
  const [pathPart, fragment] = href.split('#', 2);
  const parts = from.split('/');
  parts.pop();
  for (const segment of pathPart.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') parts.pop();
    else parts.push(segment);
  }
  const target = parts.join('/').replace(/\.md$/u, '');
  if (!ids.has(target)) return undefined;
  if (fragment) {
    const heading = decodeURIComponent(fragment).toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
    if (!(manifest.headings[target] ?? []).includes(heading)) return undefined;
  }
  return target;
}

const green = targetFor(fixture.greenFixture.from, fixture.greenFixture.href);
if (green !== fixture.greenFixture.expectedTarget) throw new Error(`DOCS_BUNDLE green fixture failed: ${green ?? 'missing'}`);
const greenFragment = targetFor(fixture.fragmentGreenFixture.from, fixture.fragmentGreenFixture.href);
if (greenFragment !== fixture.fragmentGreenFixture.expectedTarget) throw new Error(`DOCS_BUNDLE fragment fixture failed: ${greenFragment ?? 'missing'}`);
for (const red of fixture.redFixtures) {
  if (targetFor(red.from, red.href) !== undefined) throw new Error(`DOCS_BUNDLE red fixture unexpectedly resolved: ${red.href}`);
}
console.log(`docs-links: green fixtures 2, red fixtures ${fixture.redFixtures.length}, bundle articles ${manifest.articleCount}`);
