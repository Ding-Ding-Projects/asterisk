# Local file converter

The local file converter backend defines a bounded, offline conversion catalog and a persistent queue. It does not send source files, paths, metadata, samples, or output to a network service.

## Current status

The backend contract and queue are implemented, but no central desktop-process registration or renderer surface is included in this change. The later integration must supply a packaged-artifact proof before any built-in adapter becomes enabled.

The catalog always exposes these categories, even when every adapter in a category is unavailable:

- Documents and PDF
- Images
- Audio
- Video
- Archives
- Structured data and spreadsheets
- Code and text
- Binary encodings

Unavailable adapters remain visible with the exact missing bundled dependency and reason. A tool found on `PATH`, a developer-machine installation, or a network endpoint never counts as bundled proof.

## Adapter availability

The fixed worker kernels can provide these transformations after the packaged desktop runtime is independently proven:

- strict UTF-8 text to canonical Base64
- canonical Base64 to arbitrary binary data
- arbitrary binary data to lowercase hexadecimal text
- even-length hexadecimal text to arbitrary binary data
- strict UTF-8 line-ending normalization

Their catalog entries remain unavailable until a caller supplies a proof record with an absolute packaged-artifact path, SHA-256, verification timestamp, offline declaration, and exact runtime identity. Source-tree presence is deliberately insufficient.

The following known capabilities are currently unavailable because their runtimes are not bundled and proven:

| Category | Capability | Missing bundled dependency |
| --- | --- | --- |
| Documents and PDF | inspect, split, merge, extract, reorder, rotate, metadata | qpdf or another packaged PDF toolkit |
| Documents and PDF | office document to PDF | LibreOffice headless runtime |
| Images | PNG, JPEG, and WebP conversion | Sharp/libvips image runtime |
| Audio | audio transcoding | FFmpeg audio runtime |
| Video | video transcoding | FFmpeg video runtime |
| Archives | ZIP, 7z, and gzip conversion | 7-Zip runtime |
| Structured data and spreadsheets | CSV, JSON, and workbook conversion | LibreOffice Calc or a verified spreadsheet parser |
| Code and text | document and markup conversion | Pandoc runtime |

## Type detection

Input type comes from bounded byte inspection, never from a filename extension. The sniffer recognizes supported binary signatures and uses strict UTF-8 decoding for text. JSON, Base64, hexadecimal, and CSV classification is attempted only when the complete file fits inside the sniffing bound. A larger UTF-8 file remains plain text because claiming a more specific format from a prefix would be a guess.

Unknown non-text bytes are reported as arbitrary binary data. Empty files are not converted.

## Conversion execution

Enabled built-in transforms run in a fixed worker kernel. The caller cannot supply code, a command, an executable, arguments, or environment variables. The worker has declared memory and time limits and contains no network operation or shell route.

Every adapter declares:

- input and output formats
- packaged availability proof or the exact unavailable reason
- sandbox boundary
- input, output, memory, time, temporary-storage, page, frame, entry, and recursion bounds where relevant
- output validator
- metadata and encoding behavior
- whether the operation is lossy
- disclosures that must be acknowledged before execution

The runner performs storage preflight, refuses symbolic-link sources and destinations, keeps the source unchanged, writes a unique temporary file beside the destination, syncs it, reopens it, compares the bytes, revalidates its format, and only then replaces the destination atomically. Cancellation before replacement removes the temporary output and leaves the destination unchanged. Transient Windows rename sharing violations receive a short bounded retry; other errors fail immediately.

## Persistent queue

The queue accepts an `AsyncIterable` and requests one path at a time. It never requires or accepts an array containing the complete selection. Each item is persisted before the next input is requested.

Queue items are stored as individually numbered records in bounded shards. A page contains at most 200 records, while the queue itself has no artificial total-file cap. Workers use bounded concurrency from 1 through 8, so only a fixed number of bounded files can be in memory at once.

Before an item is accepted, the queue checks the source size, estimates the bounded output, reads current free destination storage, and reserves queued output plus a safety allowance. Pause, resume, cancel, per-file results, and crash reconciliation are persisted. After a crash, an item that was running returns to queued state and the queue remains paused until explicitly resumed.

Per-file outcomes distinguish converted, skipped, cancelled, and failed work. A failed item never turns another item or the whole batch into a false success.

## PDF operations

PDF operations are cataloged but disabled until a packaged offline PDF adapter is proven. The backend still defines the complete operation contract so a later adapter cannot quietly weaken it.

A PDF adapter must support cancellation and write only to the supplied temporary destination. Before replacement, an independent inspector must reopen the result and verify the requested page count, rotations, metadata, and page fingerprints used to confirm order. Encrypted, signed, malformed, or opaque PDF capabilities remain explicit inspection facts and never become guessed support.

Requests use positive one-based page numbers and bounded source, range, page, and metadata counts. A destination cannot be one of the source files. Temporary output is removed after cancellation or failure.

## Privacy and security

- Conversion is local-only and has no network fallback.
- Source and destination paths must be absolute and cannot contain null bytes.
- Symbolic-link sources and destination components are refused.
- No adapter is enabled through `PATH` discovery.
- Fixed kernels accept bytes and a closed kernel identifier, never code or shell text.
- Input, output, memory, time, temporary storage, and concurrency are bounded.
- Output is validated before it is offered or atomically installed.
- File metadata is not copied by the built-in adapters.
- Existing destinations require explicit overwrite approval.

## Failure modes

The backend reports the exact unavailable adapter reason, source type mismatch, missing disclosure acknowledgement, resource limit, storage shortage, malformed text encoding, output validation mismatch, cancellation, or destination conflict. It does not write truncated, guessed, mislabeled, or partially validated output.

Queue metadata and item records use a versioned schema. Unsupported or malformed persisted records fail closed rather than being partially applied.

## Verification

This ultra-speed implementation lane did not run tests, lint, type checks, builds, packaging, runtime execution, or screen captures. Integration, packaged-runtime proof, focused automated coverage, negative regressions, and real built-artifact interaction remain required before the feature can be described as shipped.

## Suggested articles

[Complete exports](complete-exports.md), [Long-operation progress](long-operation-progress.md), [Destructive-action confirmation](destructive-action-confirmation.md), [Non-blocking notifications](non-blocking-notifications.md), [Platform feature index](README.md).
