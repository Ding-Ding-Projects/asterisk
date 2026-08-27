# Local file converter

The converter backend and documentation-site equivalent are separate local surfaces. Both keep source bytes local, detect types from bounded bytes rather than extensions, and leave the source unchanged. Neither uses PATH discovery, a remote converter, or guessed output.

## Behavior: the desktop backend contract

The backend defines a bounded, offline conversion catalog and a persistent queue. It always exposes Documents and PDF, Images, Audio, Video, Archives, Structured Data and Spreadsheets, Code and Text, and Binary Encodings, including when every adapter in a category is unavailable. Unavailable adapters remain visible with the exact missing bundled dependency and reason.

The fixed worker kernels cover strict UTF-8 text to canonical Base64, canonical Base64 to arbitrary binary data, arbitrary binary data to lowercase hexadecimal text, even-length hexadecimal text to arbitrary binary data, and strict UTF-8 line-ending normalization. A caller cannot supply code, a command, an executable, arguments, or environment variables. An adapter becomes enabled only with a packaged-artifact proof containing its absolute path, SHA-256, verification time, offline declaration, and exact runtime identity. Source-tree presence is not proof.

Known capabilities that remain unavailable until their runtimes are bundled and proven include PDF inspection and editing, office to PDF conversion, image conversion, audio and video transcoding, archive conversion, spreadsheet conversion, and document or markup conversion. The UI must show each missing dependency rather than hiding it.

Input type comes from bounded signature inspection and strict UTF-8 decoding. JSON, Base64, hexadecimal, and CSV classification is attempted only when the complete file fits the sniffing limit. Unknown non-text bytes remain arbitrary binary data. Empty files are not converted.

Every adapter declares input and output formats, packaged proof or an unavailable reason, sandbox boundary, resource limits, output validator, metadata and encoding behavior, lossiness, and required disclosures. The runner performs storage preflight, rejects symbolic-link sources and destination components, writes a unique temporary file, syncs and reopens it, validates the result, and only then replaces the destination atomically. Cancellation removes temporary output and leaves the destination unchanged. Transient Windows rename sharing violations use a short bounded retry; other errors fail immediately.

The queue consumes an `AsyncIterable` one path at a time and persists each item before requesting the next. It has no artificial total-file cap, uses bounded shards and concurrency from 1 through 8, checks source size and destination capacity before admission, and persists pause, resume, cancellation, per-file results, and crash reconciliation. Outcomes distinguish converted, skipped, cancelled, and failed work. A failed item never becomes a false batch success.

PDF adapters are cataloged but disabled until a packaged offline tool is proven. A valid adapter must reopen its output and verify page count, order, rotations, metadata, and opaque capability limits before replacement. Encrypted, signed, malformed, and unsupported inputs remain explicit facts.

## Configuration: the documentation-site surface

The site exposes `converter.html` as a browser-local equivalent. Its catalog is categorized as Documents/PDF, Images, Audio, Video, Archives, Structured Data/Spreadsheets, Code/Text, and Binary Encodings. Browser-bundled adapters are limited to UTF-8 text, Markdown, JSON, JSONL, CSV, TSV, and Base64 output. Other entries stay visible as unavailable with their missing-adapter reason.

The site queue stores file handles and bounded metadata, reads one file at a time, pages visible results, and reports queued, reading, ready, skipped, failed, or cancelled state. A Blob is offered only after conversion succeeds, preview text is capped, cancellation is honored at safe boundaries, and one failed item never marks another successful. Adapter search is plain text by default with its own adjacent regex builder. Pattern evaluation and file bytes stay in the browser.

## Failure modes, privacy and security

Conversion is local-only. Paths must be absolute and null-free, symbolic-link sources and destination components are refused, and no adapter is enabled through PATH discovery. Inputs, outputs, memory, time, temporary storage, and concurrency are bounded. Existing destinations require explicit overwrite approval. The backend and site report unavailable adapters, malformed encodings, source mismatches, missing disclosures, resource limits, storage shortages, cancellation, output validation mismatches, and destination conflicts without writing guessed or partial output.

## Verification boundary

This lane did not run tests, lint, type checks, builds, packaging, runtime execution, browser sessions, network requests, or screen captures. The desktop and site surfaces remain implemented but unverified until the required built-artifact and focused verification passes run.

## Suggested articles

[Complete exports](complete-exports.md), [Long-operation progress](long-operation-progress.md), [Destructive-action confirmation](destructive-action-confirmation.md), [Non-blocking notifications](non-blocking-notifications.md), [Regex builder](regex-builder.md), [Responsive sizing](responsive-sizing.md), [Platform feature index](README.md).
