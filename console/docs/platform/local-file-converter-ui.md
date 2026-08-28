# Local file converter surface

The desktop renderer exposes the local file converter through `ConverterSurface`. The
surface is mounted later by `CONVERTER_SURFACE_REGISTRATION`, which accepts a typed
`ConverterClient` and keeps the privileged file and control-plane operations outside the
renderer component.

## Behavior

`ConverterSurface` is a renderer component and nothing more. It reads no path, launches no process
and converts no bytes; each of those belongs to the typed `ConverterClient` a host registers. What
the surface owns is the sequence below, the catalog rendering, the per-category searches, and the
honest reporting of whatever the client returns — including the cases where the client returns
nothing useful, which is most of what the rest of this article is about.

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

## Search and regex builder

Every category owns a separate search query and an adjacent anchored regex builder. Plain
text is the initial mode. The builder exposes guided insertions for literals, character
classes, anchors, groups, alternation, and quantifiers, plus a raw JavaScript `RegExp`
pattern, flags, bounded sample text, syntax feedback, matches, capture groups, and copy.
The query and pattern stay synchronized when regex mode is selected. Invalid patterns and
oversized samples produce an explicit local error and no match result.

## Configuration

The surface takes no settings. Everything a host varies is supplied when it registers the client
through `CONVERTER_SURFACE_REGISTRATION`, and the two numbers worth knowing are fixed by the surface
rather than chosen by the host:

| Value | Set by | Note |
| --- | --- | --- |
| Queue page size | the surface | at most 100 records per load, with refresh and next-page controls, so a long queue is never collected whole into renderer state |
| Client-call deadline | the surface | every call is bounded; a call that never settles becomes visible status copy rather than a spinner |
| `sniff` inspection bound | the client, via `maxBytes` | the surface displays whatever format, confidence, method, byte count and detail come back |
| Which adapters are enabled | the client's catalog | the surface renders unavailability with the client's exact reason and never hides a category |
| Whether PDF execution exists at all | the client | the commands render from `pdfCapabilities`, and execution is offered only when the client exposes `runPdfOperation` *and* reports that capability available |
| Whether export and editor handoff exist | the client | a missing client method leaves the control disabled with an exact reason rather than absent |

## Failure modes

- **A client method the host did not supply** — the control stays visible and disabled, carrying the
  reason. This is the case the surface is most careful about, because a host registering a partial
  client is the expected situation rather than an error.
- **An unavailable adapter or PDF command** — visible, with the client's exact reason.
- **A rejected promise or a deadline** — visible renderer error or status copy. No rejected call is
  turned into a success state.
- **A missing total on a running item** — rendered as an indeterminate detail. The surface does not
  compute a percentage it was not given, and shows progress only once the client has reported a real
  progress event.
- **An invalid regular expression, or an oversized sample** — an explicit local error and no match
  result, evaluated in the page.
- **A destination that already exists** — overwrite approval is requested from the client. The
  renderer never assumes a destination is absent and never sets approval on its own.

## Verification

Source-level only. The surface and its state machine are covered by the repository's renderer suite
(`npm run test:renderer`) and its type check; those exercise the component against a supplied client.

Nothing here has been driven in the packaged application, and there is a specific reason it would
prove little if it were: no privileged `ConverterClient` is registered anywhere in this repository,
so a real launch shows the surface in exactly the unavailable states listed above. That is a truthful
screen, and it is not evidence that a conversion works. The inventory row stays
`implemented-unverified`.

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
