# Local file converter

The converter backend and documentation-site equivalent are separate local surfaces. Both keep source bytes local, detect types from bounded bytes rather than extensions, and leave the source unchanged. Neither uses PATH discovery, a remote converter, or guessed output.

## Behavior

A conversion is one file, one enabled adapter, one destination, and one outcome that is either
converted, skipped, cancelled or failed. Nothing about that sequence is implicit:

1. The source is classified from bounded signature inspection and strict UTF-8 decoding, never
   from its extension. Unknown non-text bytes stay arbitrary binary data, and an empty file is
   not converted at all rather than converted to nothing.
2. The full catalog is shown, including every category in which nothing is available. An
   adapter is enabled only with packaged-artifact proof; source-tree presence is not proof, so
   an unavailable adapter is visible with the exact bundled dependency it is missing.
3. The chosen adapter's loss, metadata and encoding disclosures are stated before the
   conversion, not reported after it.
4. Output is written to a unique temporary file, synced, reopened, validated, and only then put
   in place of the destination. Cancellation removes the temporary output and leaves the
   destination exactly as it was.

The queue runs one item at a time from an `AsyncIterable` and persists each item before asking
for the next, which is what makes pause, resume and crash reconciliation real rather than
best-effort. A failed item never becomes a batch success.

## Configuration

- **Concurrency** is bounded from 1 through 8 shards. There is no unbounded setting, and there
  is no artificial total-file cap either — the queue is bounded by memory it never takes.
- **Admission bounds** are the source size and the destination's free capacity, both checked
  before an item is admitted rather than after it has been read.
- **Adapter availability** is not configurable. It follows from the packaged proof: absolute
  path, SHA-256, verification time, offline declaration and exact runtime identity. There is no
  flag that turns an unproven adapter on.
- **Overwrite** requires explicit approval per destination. The renderer never assumes a
  destination is absent and never records approval the caller did not give.
- **Sniffing limit.** JSON, Base64, hexadecimal and CSV classification is attempted only when
  the whole file fits inside that limit, so a large file is classified conservatively rather
  than partially.

## Desktop backend contract

The backend defines a bounded, offline conversion catalog and a persistent queue. It always exposes Documents and PDF, Images, Audio, Video, Archives, Structured Data and Spreadsheets, Code and Text, and Binary Encodings, including when every adapter in a category is unavailable. Unavailable adapters remain visible with the exact missing bundled dependency and reason.

The fixed worker kernels cover strict UTF-8 text to canonical Base64, canonical Base64 to arbitrary binary data, arbitrary binary data to lowercase hexadecimal text, even-length hexadecimal text to arbitrary binary data, and strict UTF-8 line-ending normalization. A caller cannot supply code, a command, an executable, arguments, or environment variables. An adapter becomes enabled only with a packaged-artifact proof containing its absolute path, SHA-256, verification time, offline declaration, and exact runtime identity. Source-tree presence is not proof.

Known capabilities that remain unavailable until their runtimes are bundled and proven include PDF inspection and editing, office to PDF conversion, image conversion, audio and video transcoding, archive conversion, spreadsheet conversion, and document or markup conversion. The UI must show each missing dependency rather than hiding it.

Input type comes from bounded signature inspection and strict UTF-8 decoding. JSON, Base64, hexadecimal, and CSV classification is attempted only when the complete file fits the sniffing limit. Unknown non-text bytes remain arbitrary binary data. Empty files are not converted.

Every adapter declares input and output formats, packaged proof or an unavailable reason, sandbox boundary, resource limits, output validator, metadata and encoding behavior, lossiness, and required disclosures. The runner performs storage preflight, rejects symbolic-link sources and destination components, writes a unique temporary file, syncs and reopens it, validates the result, and only then replaces the destination atomically. Cancellation removes temporary output and leaves the destination unchanged. Transient Windows rename sharing violations use a short bounded retry; other errors fail immediately.

The queue consumes an `AsyncIterable` one path at a time and persists each item before requesting the next. It has no artificial total-file cap, uses bounded shards and concurrency from 1 through 8, checks source size and destination capacity before admission, and persists pause, resume, cancellation, per-file results, and crash reconciliation. Outcomes distinguish converted, skipped, cancelled, and failed work. A failed item never becomes a false batch success.

PDF adapters are cataloged but disabled until a packaged offline tool is proven. A valid adapter must reopen its output and verify page count, order, rotations, metadata, and opaque capability limits before replacement. Encrypted, signed, malformed, and unsupported inputs remain explicit facts.

## Documentation site surface

**Corrected on 2026-08-27. What this section described does not exist, and the two paragraphs
below said otherwise for long enough to be worth naming rather than quietly rewriting.**

`console/site/converter.html` is real markup: a source queue, an adapter catalogue region, a
target-format select, a cancel control, a loss-disclosure line, a paged result list, and a
catalogue search with its own anchored regular-expression builder. Every one of those controls
is inert. `console/site/app.js` contains no occurrence of `converter-files`,
`converter-adapters`, `converter-queue` or `converter-target-format` — nothing binds them, and
the page loads `app.js` and no other script. The page is also not published: `site/build.mjs`
copies six HTML pages and `converter.html` is not among them, no published page links to it,
and it therefore has no address on the site at all.

It is not alone. `ollama.html` and `history.html` are in the same state, and
`site/full-builder.js`, `site/history-delivery.js`, `site/release-manifest.js` and
`site/changelog-data.js` are referenced by no page, by the build, or by `app.js`. All seven
arrived together with the demo lanes whose own changelog fragment
(`docs/changelog-fragments/2026-08-23-site-local-suites.md`) records that the lane
"intentionally ran no build, lint, test suite, browser session, or network request" — which is
exactly how markup that nothing consumes reads as a shipped surface.

The intended shape is unchanged and is worth keeping written down, because it is what the next
pass has to build rather than re-derive: a catalogue categorised as Documents/PDF, Images,
Audio, Video, Archives, Structured Data/Spreadsheets, Code/Text and Binary Encodings, with
browser-bundled adapters limited to UTF-8 text, Markdown, JSON, JSONL, CSV, TSV and Base64
output and every other entry visible as unavailable with its missing-adapter reason; a queue
that reads one file at a time, pages its results, and reports queued, reading, ready, skipped,
failed or cancelled; a Blob offered only after a validated conversion; capped preview text;
cancellation honoured at safe boundaries; and pattern evaluation and file bytes that never
leave the browser. None of that is implemented today.

## Failure modes

Conversion is local-only. Paths must be absolute and null-free, symbolic-link sources and destination components are refused, and no adapter is enabled through PATH discovery. Inputs, outputs, memory, time, temporary storage, and concurrency are bounded. Existing destinations require explicit overwrite approval. The backend and site report unavailable adapters, malformed encodings, source mismatches, missing disclosures, resource limits, storage shortages, cancellation, output validation mismatches, and destination conflicts without writing guessed or partial output.

## Verification boundary

This lane did not run tests, lint, type checks, builds, packaging, runtime execution, browser sessions, network requests, or screen captures. The desktop backend remains implemented but unverified until the required built-artifact and focused verification passes run.

The site surface is not in that state and must not be read as being in it. It is not
"implemented but unverified"; it is markup with no consumer, on a page the build does not
publish. `console/scripts/site-orphans.mjs` records that exactly — every HTML page the build
does not copy, and every script in `site/` that nothing references — and fails when a page or
script joins or leaves that list without the list being updated, so the next arrival of an
unwired page is a red check rather than a paragraph that reads as a feature.

## Suggested articles

[Complete exports](complete-exports.md), [Long-operation progress](long-operation-progress.md), [Destructive-action confirmation](destructive-action-confirmation.md), [Non-blocking notifications](non-blocking-notifications.md), [Regex builder](regex-builder.md), [Responsive sizing](responsive-sizing.md), [Platform feature index](README.md).
