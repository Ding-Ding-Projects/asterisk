import type { CSSProperties, ReactNode } from 'react';

const MAX_MARKDOWN_LENGTH = 500_000;
const MAX_BLOCKS = 10_000;

export type MarkdownBlock =
  | { readonly kind: 'heading'; readonly level: number; readonly text: string; readonly id: string }
  | { readonly kind: 'paragraph'; readonly text: string }
  | { readonly kind: 'list-item'; readonly ordered: boolean; readonly text: string }
  | { readonly kind: 'code'; readonly text: string; readonly language: string }
  | { readonly kind: 'quote'; readonly text: string }
  | { readonly kind: 'rule' };

export interface ParsedMarkdown {
  readonly blocks: readonly MarkdownBlock[];
  readonly empty: boolean;
  readonly truncated: boolean;
  readonly malformed: readonly string[];
}

export type MarkdownReference =
  | { readonly kind: 'internal'; readonly href: string; readonly articleId?: string; readonly fragment?: string }
  | { readonly kind: 'external'; readonly href: string }
  | { readonly kind: 'blocked'; readonly href: string; readonly reason: string };

export interface MarkdownRendererProps {
  readonly source: string;
  readonly baseReference?: string;
  readonly resolveInternal?: (href: string) => { readonly articleId: string; readonly fragment?: string } | undefined;
  readonly onInternalNavigate?: (articleId: string | undefined, fragment: string | undefined) => void;
  readonly emptyMessage?: string;
  readonly ariaLabel?: string;
  readonly compact?: boolean;
}

function slug(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
}

/** Parse a deliberately bounded Markdown subset without interpreting HTML. */
export function parseMarkdown(source: string): ParsedMarkdown {
  const malformed: string[] = [];
  const truncated = source.length > MAX_MARKDOWN_LENGTH;
  const bounded = source.slice(0, MAX_MARKDOWN_LENGTH).replace(/\r\n|\r/g, '\n');
  const lines = bounded.split('\n');
  const blocks: MarkdownBlock[] = [];
  let blockLimitReached = false;
  let paragraph: string[] = [];
  let fence: { marker: string; language: string; lines: string[] } | undefined;
  const headingCounts = new Map<string, number>();

  const flushParagraph = () => {
    if (paragraph.length === 0 || blocks.length >= MAX_BLOCKS) return;
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ').trim() });
    paragraph = [];
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    if (blocks.length >= MAX_BLOCKS) {
      blockLimitReached = true;
      break;
    }
    const rawLine = lines[lineIndex];
    const fenceMatch = /^\s*(```+|~~~+)\s*([^\s`]*)\s*$/.exec(rawLine);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence.marker[0] && fenceMatch[1].length >= fence.marker.length) {
        blocks.push({ kind: 'code', text: fence.lines.join('\n'), language: fence.language });
        fence = undefined;
      } else {
        fence.lines.push(rawLine);
      }
      continue;
    }
    if (fenceMatch) {
      flushParagraph();
      fence = { marker: fenceMatch[1], language: fenceMatch[2], lines: [] };
      continue;
    }

    const line = rawLine.trimEnd();
    if (line.trim().length === 0) {
      flushParagraph();
      continue;
    }

    const heading = /^(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/.exec(line);
    if (heading) {
      flushParagraph();
      const base = slug(heading[2]);
      const count = headingCounts.get(base) ?? 0;
      headingCounts.set(base, count + 1);
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2], id: count === 0 ? base : `${base}-${count + 1}` });
      continue;
    }

    const unordered = /^\s*[-+*]\s+(.+)$/.exec(line);
    if (unordered) {
      flushParagraph();
      blocks.push({ kind: 'list-item', ordered: false, text: unordered[1] });
      continue;
    }
    const ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (ordered) {
      flushParagraph();
      blocks.push({ kind: 'list-item', ordered: true, text: ordered[1] });
      continue;
    }
    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph();
      blocks.push({ kind: 'quote', text: quote[1] });
      continue;
    }
    if (/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)) {
      flushParagraph();
      blocks.push({ kind: 'rule' });
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph();

  if (fence && blocks.length < MAX_BLOCKS) {
    blocks.push({ kind: 'code', text: fence.lines.join('\n'), language: fence.language });
    malformed.push('The Markdown ended before its code fence closed. The remaining text is shown as code.');
  } else if (fence) {
    blockLimitReached = true;
  }
  const wasTruncated = truncated || blockLimitReached;
  if (wasTruncated) {
    malformed.push('The Markdown exceeded the renderer bounds and was truncated.');
  }
  return { blocks, empty: bounded.trim().length === 0, truncated: wasTruncated, malformed };
}

export function resolveMarkdownReference(
  href: string,
  baseReference?: string,
  resolveInternal?: MarkdownRendererProps['resolveInternal'],
): MarkdownReference {
  const trimmed = href.trim();
  if (trimmed.length === 0) return { kind: 'blocked', href, reason: 'The link target is empty.' };
  if (trimmed.startsWith('#')) return { kind: 'internal', href: trimmed, fragment: trimmed.slice(1) };

  const internal = resolveInternal?.(trimmed);
  if (internal) return { kind: 'internal', href: trimmed, articleId: internal.articleId, fragment: internal.fragment };

  try {
    const resolved = baseReference ? new URL(trimmed, baseReference) : new URL(trimmed);
    if (resolved.protocol === 'https:' || resolved.protocol === 'http:' || resolved.protocol === 'mailto:') {
      return { kind: 'external', href: resolved.href };
    }
    return { kind: 'blocked', href: trimmed, reason: `Links using ${resolved.protocol || 'this protocol'} are not allowed.` };
  } catch {
    return { kind: 'blocked', href: trimmed, reason: 'The relative link does not resolve inside this bundle.' };
  }
}

interface InlineProps {
  text: string;
  baseReference?: string;
  resolveInternal?: MarkdownRendererProps['resolveInternal'];
  onInternalNavigate?: MarkdownRendererProps['onInternalNavigate'];
}

const INLINE_TOKEN = /(`[^`]*`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]*\]\([^)]*\))/g;

function InlineMarkup({ text, baseReference, resolveInternal, onInternalNavigate }: InlineProps) {
  const nodes: ReactNode[] = [];
  let offset = 0;
  INLINE_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_TOKEN.exec(text)) !== null) {
    if (match.index > offset) nodes.push(text.slice(offset, match.index));
    const token = match[0];
    const link = /^\[([^\]]*)\]\(([^)]*)\)$/.exec(token);
    if (link) {
      const reference = resolveMarkdownReference(link[2], baseReference, resolveInternal);
      if (reference.kind === 'external') {
        const isWeb = reference.href.startsWith('http://') || reference.href.startsWith('https://');
        nodes.push(<a key={match.index} href={reference.href} target={isWeb ? '_blank' : undefined} rel={isWeb ? 'noopener noreferrer' : undefined}>{link[1] || reference.href}</a>);
      } else if (reference.kind === 'internal' && onInternalNavigate) {
        nodes.push(
          <a
            key={match.index}
            href={reference.href}
            onClick={(event) => {
              event.preventDefault();
              onInternalNavigate(reference.articleId, reference.fragment);
            }}
          >
            {link[1] || reference.href}
          </a>,
        );
      } else {
        const reason = reference.kind === 'blocked' ? reference.reason : 'This internal link is not connected.';
        nodes.push(<span key={match.index} title={reason}>{link[1] || reference.href}</span>);
      }
    } else if (token.startsWith('`')) {
      nodes.push(<code key={match.index}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    }
    offset = match.index + token.length;
  }
  if (offset < text.length) nodes.push(text.slice(offset));
  return <>{nodes}</>;
}

const proseStyle: CSSProperties = { lineHeight: 1.6, overflowWrap: 'anywhere' };

/**
 * One shared renderer for bundled documentation and provider-authored release text.
 * It builds React nodes directly and never executes embedded HTML or script markup.
 */
export function MarkdownRenderer({
  source,
  baseReference,
  resolveInternal,
  onInternalNavigate,
  emptyMessage = 'No content was provided.',
  ariaLabel = 'Rendered Markdown',
  compact = false,
}: MarkdownRendererProps) {
  const parsed = parseMarkdown(source);
  if (parsed.empty) return <p role="status">{emptyMessage}</p>;

  const inline = (text: string) => (
    <InlineMarkup text={text} baseReference={baseReference} resolveInternal={resolveInternal} onInternalNavigate={onInternalNavigate} />
  );

  return (
    <section aria-label={ariaLabel} style={{ ...proseStyle, fontSize: compact ? '0.92rem' : undefined }}>
      {parsed.malformed.map((message) => <p key={message} role="alert">{message}</p>)}
      {parsed.blocks.map((block, index) => {
        if (block.kind === 'heading') {
          const content = inline(block.text);
          if (block.level === 1) return <h1 id={block.id} key={index}>{content}</h1>;
          if (block.level === 2) return <h2 id={block.id} key={index}>{content}</h2>;
          if (block.level === 3) return <h3 id={block.id} key={index}>{content}</h3>;
          if (block.level === 4) return <h4 id={block.id} key={index}>{content}</h4>;
          if (block.level === 5) return <h5 id={block.id} key={index}>{content}</h5>;
          return <h6 id={block.id} key={index}>{content}</h6>;
        }
        if (block.kind === 'paragraph') return <p key={index}>{inline(block.text)}</p>;
        if (block.kind === 'quote') return <blockquote key={index}>{inline(block.text)}</blockquote>;
        if (block.kind === 'code') return <pre key={index} aria-label={block.language ? `${block.language} code` : 'Code'}><code>{block.text}</code></pre>;
        if (block.kind === 'rule') return <hr key={index} />;
        return block.ordered
          ? <ol key={index} start={1}><li>{inline(block.text)}</li></ol>
          : <ul key={index}><li>{inline(block.text)}</li></ul>;
      })}
    </section>
  );
}
