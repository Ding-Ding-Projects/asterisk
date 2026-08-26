# Complete data export

Every record, list, and view the product owns can be exported, in whichever format can faithfully carry that data.

## Behavior

Visible table rows use the shared export engine and export the selected rows, not an unseen full collection. The engine supports JSON, JSONL, YAML, TOML, XML, CSV, TSV, Markdown, HTML, and SQL. It computes suitable formats from the real row shape and reports ragged keys, nested values, null ambiguity, and identifier limitations before the file is written. Changelog and app-data history have their own filtered exports and preserve the active range in the output.

## Configuration

Exports are UTF-8 and carry every field represented by the selected rows. Coding formats are re-importable where their schema permits it. ZIP output is produced by the bundled store-mode writer, includes safe relative entry names, and is validated by its local records, central-directory offsets, sizes, CRC values, end record, and re-opened entry names before download. Reopening refuses absolute paths, empty or dot path components, backslashes, unsupported characters, and duplicate normalized names. The archive catalog exposes only implemented ZIP store mode. 7z remains disabled with the exact missing bundled adapter and its full future option inventory: LZMA2, LZMA, PPMd, BZip2, Deflate, store through ultra levels, solid mode, AES-256 content encryption, and encrypted headers.

## Current status

**Desktop application:** Partial and mounted. Table bulk export, changelog export, appearance export, app-data History JSON export, and validated ZIP export write real files from the current filtered or selected records. Each export also invokes the shared VS Code handoff after writing an app-data copy, while leaving the normal download available. The shared engine exposes the complete coding-format catalog and omission markers. A richer user-facing format picker and a bundled 7z adapter remain open.

**Documentation website:** Not changed in this desktop-only lane.

## Failure modes

Nested values, missing keys, null values, invalid XML names, and invalid SQL identifiers are reported by `describeLoss` or by the format validator. No export is reported as complete when the selected format cannot represent its input. Archive formats are not advertised as available without a bundled adapter.

## Accessibility and localization

The desktop export controls reuse the generated shell's keyboard and focus behavior. A broad accessibility or narrow-layout run was not performed in this implementation lane.

## Verification

The mounted paths are `App.tsx` bulk export, `changelog.ts` export helpers, `export.ts` format conversion, and app-data History export. This lane intentionally did not run broad build, packaging, or UI capture commands.

## Suggested articles

[Bulk actions](bulk-actions.md), [Local version history](local-version-history.md), [Platform feature index](README.md).
