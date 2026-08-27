# Local file converter surface

The desktop renderer exposes the local file converter through `ConverterSurface`. The
surface is mounted later by `CONVERTER_SURFACE_REGISTRATION`, which accepts a typed
`ConverterClient` and keeps the privileged file and control-plane operations outside the
renderer component.

## Behavior

The surface renders the converter and owns none of it. Every fact it shows arrived from the
typed `ConverterClient`: the detected format and its confidence, the adapter catalogue and each
adapter's availability, the queue page, the progress events, the PDF capabilities, and the
result of every command. The renderer performs no file access, runs no process, and derives no
state it was not told. Two consequences are worth stating rather than leaving to be inferred —
a missing client method leaves its control visible and disabled with the exact reason, and a
rejected call becomes visible error copy rather than a success state.

The flow below is the whole of it, in order.

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

## Configuration

Nothing on this surface is configured by a setting a person edits. What decides its behaviour
is the registered client, and the mapping is exact:

- **Which controls exist at all.** Overwrite confirmation, the native destination picker, PDF
  execution and the Visual Studio Code handoff each require their own client method. A client
  that does not expose one leaves the control disabled with the reason, rather than removing it
  and leaving a reader to wonder whether the feature exists.
- **Which adapters are enabled.** The renderer does not decide. It shows the catalogue the
  client returns, with the unavailable entries and their missing bundled dependency intact.
- **Page size.** The queue loads at most 100 records at a time and offers refresh and next-page
  controls. The surface never collects the queue into an unbounded renderer array, so this bound
  is a property of the code rather than a limit a caller can raise.
- **Deadlines.** Every client call is made under a bounded deadline. A timeout is a visible
  status, not a spinner that never resolves.
- **Search state.** Each category owns its own query, mode and pattern. There is no shared
  builder, so a pattern applied in one category cannot silently filter another.

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

## Failure modes

- A client method that is absent leaves its control disabled with the exact reason. It is never
  hidden, because a hidden control and an unsupported one are indistinguishable to a reader.
- A rejected promise or an exceeded deadline becomes visible error or status copy. No rejected
  call is converted into a success state.
- Progress is shown only for a progress event the client actually reported. A missing total
  renders as an indeterminate detail rather than an invented percentage.
- An unavailable adapter or PDF command stays listed with the reason the client returned, rather
  than disappearing from the catalogue.
- A destination is never assumed absent. Without an overwrite response from the client, the
  request is not queued.

## Verification

None of this has been run. The surface is mounted later by `CONVERTER_SURFACE_REGISTRATION`,
and until a host registers a real `ConverterClient` there is no client to answer any of the
calls described above — so there is no focused suite behind this article, no built-artifact
interaction, and no capture. The article describes a contract that is ready to be mounted, and
that is the whole of its claim.

## Suggested articles

- [Regex builder](regex-builder.md)
- [Complete exports](complete-exports.md)
- [Long-operation progress](long-operation-progress.md)
- [In-context recovery](in-context-recovery.md)
