/**
 * A small, deliberately narrow Markdown-to-blocks parser for the bundled documentation
 * body text (see `docs-browser.ts` / `generated/docs-bundle.ts`).
 *
 * Renders the shapes the bundled articles actually use — headings, paragraphs, fenced
 * code blocks, bullet list items, and inline `[text](href)` links — into plain data
 * blocks. It never emits HTML or React nodes: the compiled design template (see
 * `docs` kind in `generated/console.tsx`) walks this structure directly, and a caller
 * outside a renderer (e.g. a test) can inspect it without a DOM.
 */

export type DocsSpan = { readonly text: string; readonly href?: string };

export type DocsBlock =
  | { readonly kind: 'h1' | 'h2' | 'h3'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'paragraph' | 'list-item'; readonly spans: readonly DocsSpan[] };

export const SUPPORTED_MARKDOWN_SUBSET = Object.freeze([
  'ATX headings', 'fenced code blocks', 'ordered and unordered list items',
  'blockquote paragraphs', 'inline relative Markdown links', 'plain paragraphs',
] as const);

const LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;

/** Splits one line of prose into plain-text and link spans. */
function spansFor(line: string): DocsSpan[] {
  const spans: DocsSpan[] = [];
  let last = 0;
  LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LINK_RE.exec(line)) !== null) {
    if (match.index > last) spans.push({ text: line.slice(last, match.index) });
    const href = match[2].trim();
    const safeHref = href.startsWith('#') || href.startsWith('/') || href.startsWith('\\') || /^[a-z][a-z0-9+.-]*:/iu.test(href)
      ? undefined
      : href;
    spans.push({ text: match[1] || href, ...(safeHref ? { href: safeHref } : {}) });
    last = match.index + match[0].length;
  }
  if (last < line.length) spans.push({ text: line.slice(last) });
  if (spans.length === 0) spans.push({ text: line });
  return spans;
}

/** Parses Markdown body text into an ordered list of render-ready blocks. */
export function parseMarkdown(body: string): DocsBlock[] {
  const blocks: DocsBlock[] = [];
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  let inCode = false;
  let codeLines: string[] = [];

  for (const raw of lines) {
    if (raw.trim().startsWith('```')) {
      if (inCode) {
        blocks.push({ kind: 'code', text: codeLines.join('\n') });
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(raw);
      continue;
    }

    const line = raw.trim();
    if (line.length === 0) continue;

    const h1 = /^#\s+(.*)$/.exec(line);
    const h2 = /^##\s+(.*)$/.exec(line);
    const h3 = /^###\s+(.*)$/.exec(line);
    if (h1) { blocks.push({ kind: 'h1', text: h1[1] }); continue; }
    if (h2) { blocks.push({ kind: 'h2', text: h2[1] }); continue; }
    if (h3) { blocks.push({ kind: 'h3', text: h3[1] }); continue; }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) { blocks.push({ kind: 'paragraph', spans: spansFor(`Quote: ${quote[1]}`) }); continue; }

    const li = /^(?:[-*]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) { blocks.push({ kind: 'list-item', spans: spansFor(li[1]) }); continue; }

    blocks.push({ kind: 'paragraph', spans: spansFor(line) });
  }

  if (inCode && codeLines.length > 0) blocks.push({ kind: 'code', text: codeLines.join('\n') });

  return blocks;
}

/** A short plain-text excerpt for a list row: parses the Markdown and joins the
 *  rendered (not raw) text of the first few blocks, so a search result never
 *  shows a raw "# Heading" line or literal `[text](href)` link syntax. */
export function plainTextExcerpt(body: string, maxLength: number): string {
  const blocks = parseMarkdown(body);
  const parts: string[] = [];
  for (const block of blocks) {
    let text = '';
    switch (block.kind) {
      case 'code':
        continue;
      case 'h1':
      case 'h2':
      case 'h3':
        text = block.text;
        break;
      case 'list-item':
      case 'paragraph':
        text = block.spans.map((s) => s.text).join('');
        break;
    }
    if (text.trim().length > 0) parts.push(text.trim());
    if (parts.join(' ').length >= maxLength) break;
  }
  const joined = parts.join(' ');
  return joined.length > maxLength ? `${joined.slice(0, maxLength).trim()}…` : joined;
}
