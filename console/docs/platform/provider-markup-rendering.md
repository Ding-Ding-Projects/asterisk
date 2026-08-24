# Provider-authored markup rendering

Text authored elsewhere, such as release notes or imported documents, is rendered as real formatted markup rather than printed as raw source characters.

## Behavior

Provider-authored markdown-like text is rendered through the shared isolated `docs-markdown.ts` block parser. It produces headings, paragraphs, quoted paragraphs, ordered and unordered list blocks, fenced code blocks, and internal link spans. React receives text as text nodes, so provider-authored angle brackets are not interpreted as DOM markup. Link fragments are checked against the target article's generated heading ids before navigation.

## Configuration

The renderer would keep an honest empty state when no content is provided, rather than presenting a blank area that looks like a loading failure.

The supported subset is explicit: ATX headings, fenced code blocks, ordered and unordered list items, blockquote paragraphs, inline relative Markdown links, and plain paragraphs. Tables, raw HTML, embedded images, and executable link schemes are not accepted as active markup in this renderer.

## Current status

**Desktop application:** Implemented for bundled documentation and changelog text through the shared block parser. The parser emits safe blocks and never inserts raw HTML.

**Documentation website:** Not changed in this desktop-only lane.

## Failure modes

Malformed Markdown degrades to plain paragraphs or code text. A link only becomes an in-app navigation action when it resolves to a bundled article id and, when present, a real heading fragment. External schemes, unsafe path forms, raw HTML, control characters, and unresolved fragments never become executable renderer content.

## Accessibility and localization

The rendered blocks are reachable from the offline docs screen and use the generated shell's normal focus and text boundary behavior. A broad accessibility or narrow-layout run was not performed in this implementation lane.

## Verification

The mounted path is `docs-markdown.ts`, `docs-browser.ts`, `App.tsx`, and the generated docs bundle. This lane intentionally did not run broad build, packaging, or UI capture commands.

## Suggested articles

[In-app changelog viewer](changelog-viewer.md), [Offline documentation browser](offline-documentation-browser.md), [Platform feature index](README.md).
