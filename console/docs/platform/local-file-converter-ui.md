# Local file converter surface

The desktop renderer exposes the local file converter through `ConverterSurface`. The
surface is mounted later by `CONVERTER_SURFACE_REGISTRATION`, which accepts a typed
`ConverterClient` and keeps the privileged file and control-plane operations outside the
renderer component.

## User flow

1. Choose a local file through the client-provided native picker.
2. Read the source bytes through the typed `sniff` method. The surface shows the exact
   format, confidence, inspection method, byte count, and detail returned by the client.
3. Review the complete adapter catalog. All eight categories remain visible, including
   adapters that are unavailable because their required bundled dependency has not been
   proven in the packaged artifact.
4. Select an enabled adapter, review every loss, metadata, and encoding disclosure, and
   acknowledge each disclosure.
5. Provide an absolute destination path. The client may provide a native destination
   picker, but the text field remains available and is validated again by the privileged
   boundary.
6. Request overwrite confirmation from the client. The renderer never assumes that a
   destination is absent and never sets approval without the client response.
7. Queue one request through `enqueueOne`. Queue records are loaded in bounded pages and
   are never collected into an unbounded renderer array by the surface.

## Search and regex builder

Every category owns a separate search query and an adjacent anchored regex builder. Plain
text is the initial mode. The builder exposes guided insertions for literals, character
classes, anchors, groups, alternation, and quantifiers, plus a raw JavaScript `RegExp`
pattern, flags, bounded sample text, syntax feedback, matches, capture groups, and copy.
The query and pattern stay synchronized when regex mode is selected. Invalid patterns and
oversized samples produce an explicit local error and no match result.

## Queue and failure states

The queue uses the backend cursor contract. The surface loads at most 100 records at a
time, offers refresh and next-page controls, and displays every returned item state and
outcome. Start, pause, resume, and cancel invoke the corresponding typed client method.
Progress is shown only when the client has reported a real progress event. A missing
total is rendered as an indeterminate detail rather than an invented percentage.

All client calls use a bounded deadline. Rejected promises and timeouts become visible
renderer error or status copy. No rejected call is turned into a success state.

## PDF commands

The surface renders inspect, split, merge, extract, reorder, rotate, and metadata commands
from the `pdfCapabilities` response. Unavailable commands stay visible with the exact
reason returned by the client. The operation form accepts absolute sources and the
operation-specific ranges, pages, rotation, or metadata. Execution is available only when
the registered client exposes `runPdfOperation` and reports that capability as available.

## Export and editor handoff

The surface exports only the queue page currently loaded by the renderer. JSON, CSV, and
Markdown descriptors state their media type, extension, scope, and loss note. A separate
Visual Studio Code handoff descriptor opens the selected destination only through the
registered client. Missing client methods leave the controls disabled with an exact reason.

## Security and privacy boundaries

The renderer does not read arbitrary paths, invoke a shell, discover machine-wide tools,
or upload a source. The client owns native file selection, byte inspection, destination
validation, bundled-adapter proof, overwrite confirmation, conversion, atomic output
validation, and editor launch. The renderer holds only display metadata and the queue page
provided by the client. A consumer integration must keep the client methods local and
bounded, and must not put credentials or source contents in logs, exports, history, or
telemetry.

## Suggested articles

- [Regex builder](regex-builder.md)
- [Complete exports](complete-exports.md)
- [Long-operation progress](long-operation-progress.md)
- [In-context recovery](in-context-recovery.md)
