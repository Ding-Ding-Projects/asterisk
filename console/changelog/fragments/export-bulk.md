# Export and bulk-operation domain contracts

- Added versioned, loss-aware encoders for JSON, JSONL, YAML, TOML, XML, CSV, TSV, Markdown, HTML, SQL, TypeScript, JavaScript, and Python data exports.
- Added collection-and-query-scoped selection with page, match, inverse, range, pinned, and protected-item semantics.
- Added bulk action plans with exact disabled reasons, per-item outcomes, cancellation, and real inverse-operation requirements for Undo.
- Added explicit platform contracts for save, download, clipboard, and Visual Studio Code handoff. No operation reports success until the platform confirms it.
- Recorded archive export and encryption as unavailable until a bundled, verified ZIP or 7z adapter exists.
- Added per-item operation deadlines, linked abort signals, distinct timeout outcomes, and redacted untyped rejection handling so a stalled handler cannot hang a batch forever.
- This fragment records domain foundations only. Visible surface and privileged bridge wiring remain separate work.
