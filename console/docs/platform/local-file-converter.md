# Local file converter

The converter backend and documentation-site equivalent are separate local surfaces. Both keep source bytes local, detect types from bounded bytes rather than extensions, and leave the source unchanged. Neither uses PATH discovery, a remote converter, or guessed output.

## Desktop backend contract

The backend defines a bounded, offline conversion catalog and a persistent queue. It always exposes Documents and PDF, Images, Audio, Video, Archives, Structured Data and Spreadsheets, Code and Text, and Binary Encodings, including when every adapter in a category is unavailable. Unavailable adapters remain visible with the exact missing bundled dependency and reason.

The fixed worker kernels cover strict UTF-8 text to canonical Base64, canonical Base64 to arbitrary binary data, arbitrary binary data to lowercase hexadecimal text, even-length hexadecimal text to arbitrary binary data, and strict UTF-8 line-ending normalization. A caller cannot supply code, a command, an executable, arguments, or environment variables. An adapter becomes enabled only with a packaged-artifact proof containing its absolute path, SHA-256, verification time, offline declaration, and exact runtime identity. Source-tree presence is not proof.

Known capabilities that remain unavailable until their runtimes are bundled and proven include PDF inspection and editing, office to PDF conversion, image conversion, audio and video transcoding, archive conversion, spreadsheet conversion, and document or markup conversion. The UI must show each missing dependency rather than hiding it.

Input type comes from bounded signature inspection and strict UTF-8 decoding. JSON, Base64, hexadecimal, and CSV classification is attempted only when the complete file fits the sniffing limit. Unknown non-text bytes remain arbitrary binary data. Empty files are not converted.

Every adapter declares input and output formats, packaged proof or an unavailable reason, sandbox boundary, resource limits, output validator, metadata and encoding behavior, lossiness, and required disclosures. The runner performs storage preflight, rejects symbolic-link sources and destination components, writes a unique temporary file, syncs and reopens it, validates the result, and only then replaces the destination atomically. Cancellation removes temporary output and leaves the destination unchanged. Transient Windows rename sharing violations use a short bounded retry; other errors fail immediately.

The queue consumes an `AsyncIterable` one path at a time and persists each item before requesting the next. It has no artificial total-file cap, uses bounded shards and concurrency from 1 through 8, checks source size and destination capacity before admission, and persists pause, resume, cancellation, per-file results, and crash reconciliation. Outcomes distinguish converted, skipped, cancelled, and failed work. A failed item never becomes a false batch success.

PDF adapters are cataloged but disabled until a packaged offline tool is proven. A valid adapter must reopen its output and verify page count, order, rotations, metadata, and opaque capability limits before replacement. Encrypted, signed, malformed, and unsupported inputs remain explicit facts.

## Documentation site surface

The site exposes `converter.html` as a browser-local equivalent. Its catalog is categorized as Documents/PDF, Images, Audio, Video, Archives, Structured Data/Spreadsheets, Code/Text, and Binary Encodings. Browser-bundled adapters are limited to UTF-8 text, Markdown, JSON, JSONL, CSV, TSV, and Base64 output. Other entries stay visible as unavailable with their missing-adapter reason.

**The paragraph that used to sit here described behaviour the page did not have, and the correction is recorded rather than written over.** From the commit that added `converter.html` until 2026-08-27 the page shipped a file picker, an adapter catalogue, a target select, a queue, a pager and a cancel button, and not one of those control ids appeared anywhere in `site/app.js`, which is the only script the page loads. Nothing read a file, nothing converted anything, and the classes the markup used had no rules behind them either, so every card rendered as an unstyled block. The old text described a queue with `reading` and `ready` states that had never existed in any source. What follows is what the page actually does.

`initConverter()` in `site/app.js` wires every control. A chosen file is read through its own `File` object and identified by its bytes: a `%PDF-`, PNG, JPEG, GIF, ZIP, gzip, WAV, MP3, Ogg or MP4 signature decides first, then a strict UTF-8 decode that refuses rather than substituting replacement characters, then a classification that parses -- JSON if the whole file parses, JSONL if every line does, CSV or TSV on a consistent quoted field count. Markdown is the one kind decided by the file name, and its own reason says so out loud. A file over the 32 MiB bound is refused before anything reads it, and the refusal names the bound.

The queue reports queued, converted, skipped, failed or cancelled, five files to a page, with Convert, Download and Remove on each row and one batch button for the files currently listed. Conversion waits for an explicit press: choosing a file only inspects and describes it. What a conversion would lose is stated first, per target, and the row-shaped targets defer to the same `describeLoss()` the exports use, so the converter and an export cannot disagree about the same table and the same format. Cancel is checked between files and a cancelled file says so instead of staying queued; the batch reports converted, skipped and cancelled separately rather than calling itself a success. Two refusals are deliberate: a JSON array of scalars will not become a table, because naming its column would be this page inventing a heading, and a CSV whose header repeats a column is refused because a row read from it would lose one of them. Adapter search is plain text by default with its own adjacent regex builder. No `fetch` and no `XMLHttpRequest` appears anywhere in the block, and the page says in words that nothing was uploaded.

## Privacy and failure modes

Conversion is local-only. Paths must be absolute and null-free, symbolic-link sources and destination components are refused, and no adapter is enabled through PATH discovery. Inputs, outputs, memory, time, temporary storage, and concurrency are bounded. Existing destinations require explicit overwrite approval. The backend and site report unavailable adapters, malformed encodings, source mismatches, missing disclosures, resource limits, storage shortages, cancellation, output validation mismatches, and destination conflicts without writing guessed or partial output.

## Verification boundary

The desktop backend half of this article is unchanged and carries the boundary it was written with: that lane ran no tests, lint, type checks, builds, packaging, runtime execution, browser sessions, network requests, or captures, so the desktop backend remains implemented but unverified.

The site half now has a focused contract of its own. `site/tests/contracts/local-file-converter.test.mjs` extracts the real DOM-free converter block out of `site/app.js` and runs it against real bytes -- a `%PDF-` header, a PNG signature, invalid UTF-8, a quoted CSV, a duplicated header column, a nested JSON value, an array of scalars -- and checks the Base64 output against an encoder it did not write. The wiring half is pinned separately by whole-line anchors, because a correct engine nothing calls is precisely the state this page was already in, and a substring needle is satisfied by a commented-out call.

**What that contract does not claim.** Nothing here has been opened in a browser. No real file picker has been operated, no real `File` has been read, no download has been offered by a real browser, and no capture of the working surface exists. It is proved against the real extracted source and against the page's own markup, and no further -- so the registry row for `local-file-converter` records the surface as implemented while the two artifacts that need a running program remain absent.

## Suggested articles

[Complete exports](complete-exports.md), [Long-operation progress](long-operation-progress.md), [Destructive-action confirmation](destructive-action-confirmation.md), [Non-blocking notifications](non-blocking-notifications.md), [Regex builder](regex-builder.md), [Responsive sizing](responsive-sizing.md), [Platform feature index](README.md).
