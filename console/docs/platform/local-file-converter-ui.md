# Local file converter surface

The desktop renderer exposes the local file converter through `ConverterSurface`. The
surface is mounted later by `CONVERTER_SURFACE_REGISTRATION`, which accepts a typed
`ConverterClient` and keeps the privileged file and control-plane operations outside the
renderer component.

## Behavior

### User flow

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

### Search and regex builder

Every category owns a separate search query and an adjacent anchored regex builder. Plain
text is the initial mode. The builder exposes guided insertions for literals, character
classes, anchors, groups, alternation, and quantifiers, plus a raw JavaScript `RegExp`
pattern, flags, bounded sample text, syntax feedback, matches, capture groups, and copy.
The query and pattern stay synchronized when regex mode is selected. Invalid patterns and
oversized samples produce an explicit local error and no match result.

### Queue paging and progress

The queue uses the backend cursor contract. The surface loads at most 100 records at a
time, offers refresh and next-page controls, and displays every returned item state and
outcome. Start, pause, resume, and cancel invoke the corresponding typed client method.
Progress is shown only when the client has reported a real progress event. A missing
total is rendered as an indeterminate detail rather than an invented percentage.

All client calls use a bounded deadline. Rejected promises and timeouts become visible
renderer error or status copy. No rejected call is turned into a success state.

### PDF commands

The surface renders inspect, split, merge, extract, reorder, rotate, and metadata commands
from the `pdfCapabilities` response. Unavailable commands stay visible with the exact
reason returned by the client. The operation form accepts absolute sources and the
operation-specific ranges, pages, rotation, or metadata. Execution is available only when
the registered client exposes `runPdfOperation` and reports that capability as available.

### Export and editor handoff

The surface exports only the queue page currently loaded by the renderer. JSON, CSV, and
Markdown descriptors state their media type, extension, scope, and loss note. A separate
Visual Studio Code handoff descriptor opens the selected destination only through the
registered client. Missing client methods leave the controls disabled with an exact reason.

## Configuration

The surface itself configures almost nothing, and that is the boundary rather than a
shortfall: every privileged decision belongs to the registered `ConverterClient`, so a
setting here would be a setting the renderer could not honour. What the reader chooses,
per run:

- **The source**, through the client's native picker; the renderer never reads a path of
  its own choosing.
- **The adapter**, from the visible catalog, and an acknowledgement of each loss,
  metadata and encoding disclosure the chosen one declares.
- **The destination**, as an absolute path. A native destination picker is offered when
  the client provides one, and the text field stays available either way, because a
  picker the client does not implement must not remove the only route.
- **Page size and paging** for the queue view, bounded at 100 records per page.
- **Search mode** per category, plain text first, each with its own adjacent builder.

Which adapters and PDF commands are available at all is not a setting. It is read from
the client's `pdfCapabilities` and adapter responses, so an unavailable one is shown with
the client's own reason rather than hidden behind a toggle.

## Failure modes

Every failure here is the client's, reported rather than absorbed. The surface renders a
rejected promise or an expired deadline as visible error or status copy, and turns none
of them into a success state. An adapter or PDF command that is unavailable stays on
screen carrying the client's own reason, so a missing bundled dependency reads as a
missing dependency rather than as a control that does nothing. A queue item that fails
keeps its own outcome and never marks a sibling successful. Progress with no reported
total renders as indeterminate; the surface has no percentage of its own to fall back on,
which is deliberate, because an invented one is indistinguishable from a real one.

A client that does not implement a method leaves the control it drives disabled with the
exact reason, rather than enabled and silently inert.

## Verification

This article describes `ConverterSurface` and `CONVERTER_SURFACE_REGISTRATION` as they are
written. Nothing here has been driven in a built artifact: no native picker has opened, no
file has been sniffed, no queue has been paged, and no Visual Studio Code handoff has
launched. The renderer's own contract tests exercise the surface against a supplied client;
they say nothing about a real client, which is the half a test that injects its dependency
structurally cannot reach. The registry row stays unverified until a built-artifact
interaction record and a capture exist for it.

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
