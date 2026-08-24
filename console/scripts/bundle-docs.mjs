import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const docsDir = resolve(root, '..', 'docs');
const outFile = resolve(root, '..', 'app', 'renderer', 'src', 'generated', 'docs-bundle.ts');
const manifestFile = resolve(root, '..', 'app', 'renderer', 'src', 'generated', 'docs-bundle-manifest.json');

function slugId(relPath) {
  return relPath.replaceAll('\\', '/').replace(/\.md$/, '');
}

function headingId(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function walk(dir, base = '') {
  const out = [];
  for (const entry of await readdir(join(dir, base), { withFileTypes: true })) {
    const rel = join(base, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(dir, rel)));
    } else if (entry.name.endsWith('.md')) {
      out.push(rel);
    }
  }
  return out;
}

async function main() {
  const relFiles = (await walk(docsDir)).sort((a, b) => a.localeCompare(b));

  const articles = [];
  const titleErrors = [];

  for (const relPath of relFiles) {
    const normalized = relPath.replaceAll('\\', '/');
    const absPath = join(docsDir, relPath);
    const markdown = await readFile(absPath, 'utf8');
    const normalizedMd = markdown.replaceAll('\r\n', '\n');
    const category = normalized.split('/')[0];
    const id = slugId(normalized);

    const titleMatch = normalizedMd.match(/^#\s+(.+)$/m);
    if (!titleMatch) {
      titleErrors.push(normalized);
      continue;
    }
    const title = titleMatch[1].trim();

    const headings = [...normalizedMd.matchAll(/^##\s+(.+)$/gm)].map((m) => ({
      title: m[1].trim(),
      id: headingId(m[1].trim()),
    }));

    const links = [...normalizedMd.matchAll(/\[[^\]]*\]\(([^)]+\.md(?:#[^)]*)?)\)/g)]
      .map((m) => m[1])
      .filter((href) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(href));

    articles.push({
      id,
      category,
      title,
      headings,
      links,
      body: normalizedMd,
    });
  }

  if (titleErrors.length > 0) {
    throw new Error(
      `docs-bundle: ${titleErrors.length} article(s) have no top-level "# Title" heading: ${titleErrors.join(', ')}`,
    );
  }

  if (articles.length !== relFiles.length) {
    throw new Error(
      `docs-bundle: found ${relFiles.length} markdown file(s) on disk but bundled ${articles.length} article(s). ` +
        'A file was silently dropped during bundling.',
    );
  }

  articles.sort((a, b) => a.id.localeCompare(b.id));

  // The bundle is the source of truth for in-app article navigation. Refuse a
  // broken article target or a stale heading fragment before emitting it.
  const byId = new Map(articles.map((article) => [article.id, article]));
  const slugHeading = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const brokenLinks = [];
  for (const article of articles) {
    for (const href of article.links) {
      const [pathPart, fragment] = href.split('#', 2);
      const baseParts = article.id.split('/');
      baseParts.pop();
      for (const segment of pathPart.split('/')) {
        if (!segment || segment === '.') continue;
        if (segment === '..') baseParts.pop();
        else baseParts.push(segment);
      }
      const target = byId.get(baseParts.join('/').replace(/\.md$/, ''));
      let decodedFragment = fragment;
      try { if (fragment) decodedFragment = decodeURIComponent(fragment); } catch { decodedFragment = ''; }
      if (!target || (fragment && !target.headings.some((heading) => heading.id === slugHeading(decodedFragment)))) {
        brokenLinks.push(`${article.id}: ${href}`);
      }
    }
  }
  if (brokenLinks.length > 0) throw new Error(`docs-bundle: broken internal article link(s): ${brokenLinks.join(', ')}`);

  const header = `// GENERATED FILE — do not edit by hand.
// Produced by console/scripts/bundle-docs.mjs from console/docs/**/*.md.
// Re-run \`node scripts/bundle-docs.mjs\` after changing any documentation article.

export interface DocsHeading {
  readonly title: string;
  readonly id: string;
}

export interface DocsArticle {
  readonly id: string;
  readonly category: string;
  readonly title: string;
  readonly headings: readonly DocsHeading[];
  readonly links: readonly string[];
  readonly body: string;
}

export interface DocsBundle {
  readonly generatedAt: string;
  readonly articleCount: number;
  readonly articles: readonly DocsArticle[];
}
`;

  const body = `export const DOCS_BUNDLE: DocsBundle = ${JSON.stringify(
    {
      generatedAt: '1970-01-01T00:00:00.000Z',
      articleCount: articles.length,
      articles,
    },
    null,
    2,
  )} as const;
`;

  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, `${header}\n${body}`, 'utf8');
  await writeFile(manifestFile, `${JSON.stringify({ schemaVersion: 1, articleCount: articles.length, articleIds: articles.map((article) => article.id), headings: Object.fromEntries(articles.map((article) => [article.id, article.headings.map((heading) => heading.id)])), linkChut: 'generator-fails-on-missing-target-or-heading-fragment' }, null, 2)}\n`, 'utf8');

  console.log(
    `docs-bundle: wrote ${articles.length} article(s) from ${relFiles.length} markdown file(s) to ${relative(process.cwd(), outFile)}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
