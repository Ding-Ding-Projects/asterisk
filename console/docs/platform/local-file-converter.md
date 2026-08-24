# Local file converter

The documentation site exposes a local file-converter page at `converter.html`. It reads a selected file's bytes in the browser, checks bounded signatures before using the file name, and keeps the source unchanged. No upload, PATH lookup, remote converter, or guessed output is used.

## Adapter catalogue

The catalogue is categorized as Documents/PDF, Images, Audio, Video, Archives, Structured Data/Spreadsheets, Code/Text, and Binary Encodings. Browser-bundled adapters are limited to UTF-8 text, Markdown, JSON, JSONL, CSV, TSV, and Base64 output. PDF, image, audio, video, archive, spreadsheet, and other formats remain visible as unavailable when a bundled adapter is missing, with the reason shown beside the entry.

## Queue and results

The queue stores file handles and bounded metadata, reads one file at a time, and pages the visible results. Each file reports queued, reading, ready, skipped, failed, or cancelled state. Conversion output is created as an in-memory Blob and offered for download only after conversion succeeds. Preview text is capped, cancellation is honoured at safe boundaries, and one failed item never marks another item successful.

## Search and privacy

The adapter search is plain text by default and has its own adjacent regular-expression builder. Pattern evaluation uses the site's bounded local worker. Search text, selected file bytes, and generated output stay in the browser. The page does not claim an adapter or conversion that has not been implemented in the bundled site code.

## Verification boundary

This feature was implemented in the source lane without running a build, lint, test suite, browser session, network request, or screen capture. The next verification pass must build the site and exercise empty, text, structured, binary, unsupported, oversized, cancellation, pagination, and download-result states from the built artifact.

## Suggested articles

- [Complete exports](complete-exports.md)
- [Regex builder](regex-builder.md)
- [Responsive sizing](responsive-sizing.md)
