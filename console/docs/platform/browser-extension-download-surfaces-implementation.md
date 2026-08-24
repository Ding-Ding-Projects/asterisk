# Browser-extension download transfer surfaces

This implementation adds three mount-ready renderer surfaces for a browser-extension handoff:

1. **Start download** is a blocking decision surface. It names the file, source, destination, and known size. Nothing starts until `DownloadTransferClient.start()` accepts the typed handoff. Cancel uses `cancelHandoff()` and reports the receipt.
2. **Downloading** is a separate progress surface. It renders only `DownloadTransferSnapshot` values from the transfer client, including exact bytes, known totals, observed rate, known ETA, deadline, pause/resume/cancel/retry availability, errors, and partial outcomes. It never increments a local timer or predicts a result.
3. **Download complete** is a non-blocking result surface. It names the file, destination, observed outcome, and observation time. The exported intent metadata marks it always-on-top while leaving dismissal non-blocking.

## Extension handoff contract

`console/shared/download-transfer.ts` is the boundary contract. An extension handoff is bounded and must have an HTTPS source, a file name, a destination, an ISO timestamp, an explicit unsaved-work state, and an optional known byte total. `isExtensionDownloadHandoff()` rejects malformed or unbounded messages before they reach a transfer client.

The transfer client is intentionally injected. The renderer therefore knows only the typed `start`, `cancelHandoff`, `command`, and `subscribe` operations. Preload or control-plane wiring can implement that client later without changing the three surfaces or making renderer code own file I/O.

## Window and accessibility intent

`DOWNLOAD_WINDOW_INTENTS` and `DOWNLOAD_SURFACE_REGISTRATIONS` export platform handoff metadata. Start is a blocking decision and returns focus to its originating control after close. Progress is an always-on-top progress window. Completion is always-on-top but non-blocking, with a dismiss action. Each surface uses semantic headings, live status or alert regions, visible keyboard focus, keyboard-sized controls, overflow-safe URLs and paths, reduced-motion CSS, and a narrow-layout breakpoint.

Language and funny-copy selection remain host-owned: labels are ordinary strings in these mount-ready components, so a future host can pass localized or funny-level copy without changing transfer facts such as bytes, timestamps, URLs, paths, status, or error codes. Unsaved-work state is required in the handoff and remains visible on the Start surface; no transfer action discards it.

## Failure and verification boundaries

The client must provide real snapshots and real command receipts. A missing first snapshot is shown as a waiting state. A rejected command, deadline, non-retryable error, cancellation, and partial result stay visible and are not converted into success. This lane intentionally contains no test or extension launch wiring; integration owners must connect the exported contract to the preload/control-plane boundary and add built-artifact interaction evidence there.

## Suggested articles

[Long-operation progress reporting](long-operation-progress.md), [In-context failure recovery](in-context-recovery.md), [Accessibility](accessibility.md), [Responsive and high-scale sizing](responsive-sizing.md).
