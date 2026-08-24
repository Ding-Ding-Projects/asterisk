# Complete data export

Every record, list, and view the product owns can be exported, in whichever format can faithfully carry that data.

## Behavior

Visible table rows use the shared export engine and export the selected rows, not an unseen full collection. The engine supports JSON, JSONL, YAML, TOML, XML, CSV, TSV, Markdown, HTML, and SQL. It computes suitable formats from the real row shape and reports ragged keys, nested values, null ambiguity, and identifier limitations before the file is written. Changelog and app-data history have their own filtered exports and preserve the active range in the output.

## Configuration

Exports are UTF-8 and carry every field represented by the selected rows. Coding formats are re-importable where their schema permits it. Archive packaging remains an explicit adapter boundary: the desktop surface must not label a JSON export as a ZIP or 7z archive until a bundled archive writer is available. When an archive adapter is unavailable, the UI reports that exact missing capability instead of pretending that a renamed text file is an archive.

## Current status

**Desktop application:** Partial and mounted. Table bulk export, changelog export, appearance export, and app-data history export write real files from the current filtered or selected records. A format picker is still needed for choosing among every suitable coding format from the UI, and archive output remains unavailable until a bundled writer is added.

**Documentation website:** Not changed in this desktop-only lane.

## Failure modes

Nested values, missing keys, null values, invalid XML names, and invalid SQL identifiers are reported by `describeLoss` or by the format validator. No export is reported as complete when the selected format cannot represent its input. Archive formats are not advertised as available without a bundled adapter.

## Accessibility and localization

The desktop export controls reuse the generated shell's keyboard and focus behavior. A broad accessibility or narrow-layout run was not performed in this implementation lane.

## Verification

The mounted paths are `App.tsx` bulk export, `changelog.ts` export helpers, `export.ts` format conversion, and app-data History export. This lane intentionally did not run broad build, packaging, or UI capture commands.

## Suggested articles

[Bulk actions](bulk-actions.md), [Local version history](local-version-history.md), [Platform feature index](README.md).
