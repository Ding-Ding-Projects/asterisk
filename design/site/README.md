# Website design reference

This directory is a **read-only design reference**, exported unmodified from the design tool that
produced it. Nothing in it is hand-edited, and nothing in it runs at build time or ships to a
visitor. It is committed so the site's design can be reviewed and diffed like any other artifact,
instead of existing only inside the design tool where nobody could check the built site against it.

It mirrors the layout already used for the desktop console's own reference at `design/` (see
`design/Asterisk Console M3.dc.html`, `design/M3 Control.dc.html`, `design/support.js`,
`design/.thumbnail`): the same kind of export, for the website instead of the desktop app.

## What is here

Five `.dc.html` screens, exported as alternatives that were considered for the site:

- `Landing A - Spec Sheet.dc.html`
- `Landing B - Editorial.dc.html`
- `Landing C - Blueprint.dc.html`
- `Docs C - Blueprint.dc.html`
- `Site C - Docs.dc.html`

**"C - Blueprint" is the chosen direction.** Commit `d98624fc72` ("Vendor the Blueprint fonts and
adopt its palette/pipeline structure") began adopting it into the shipped site under
`console/site/`: vendoring its Archivo + IBM Plex Mono fonts, mapping its palette onto the site's
M3 tokens, and adding the write-pipeline section from its layout.

The A and B landing variants, and keeping them alongside the chosen C direction rather than
deleting them, is deliberate: it lets a later reader see what was considered and rejected, not just
what was picked.

Also present:

- `docs-lib.js`, `image-slot.js`, `support.js` — design-tool editor and live-preview machinery, not
  runtime code. This is the same conclusion `HANDOFF.md` already records for the desktop console's
  own `design/support.js`: "entirely design-tool editor and live-preview machinery — a browser
  interpreter of the same work `compile-design.mjs` does ahead of time." The site export's copy of
  `support.js` is a separate export from a separate design-tool session (it differs byte-for-byte
  from `design/support.js`, and is not identical to it), but the same conclusion applies to it and
  to its two siblings.
- `.thumbnail` — the design tool's own generated preview image, exactly as `design/.thumbnail`
  exists for the console reference.
- `site/index.html` — the design tool's own stub picker between the three landing variants. It
  randomly redirects to whichever landing page a visitor lands on; it is not the shipped site's
  entry point (that is `console/site/index.html`) and is kept only as part of the unmodified export.

**`docs-md/` from the export is deliberately excluded.** Those 86 Markdown files were verified
byte-for-byte content-identical (modulo line endings — the export uses LF, this repository's
checkout uses CRLF) to the repository's own `console/docs/` tree, which already carries 87 files
(one more: `platform/branch-integration.md`, which the export does not have). Committing a second
copy of the same 86 articles would create two sources of truth for the same documentation; the
repository's own `console/docs/` remains the single one.

## Fonts

The export's landing and docs screens reference Archivo and IBM Plex Mono through
`fonts.googleapis.com`. That reference is **not** how the shipped site fetches fonts. Those exact
families are already vendored locally, offline, and verified, by
`console/scripts/download-site-fonts.mjs`, into `console/assets/site-fonts/`
(`console/assets/site-fonts/manifest.json` records the family names, weights, unicode ranges, and a
SHA-256 per file). Nothing under `console/site/` fetches a font from Google at runtime.

The Google Fonts URL and its `fonts.gstatic.com` file sources remain readable inside this reference
directory's `.dc.html` files, because this directory is the unmodified export, not the shipped
output — see the guard test at `console/tests/ui/site-design-reference.test.mjs`, which asserts the
distinction explicitly: forbidden in `console/site/`, expected and allowed here.
