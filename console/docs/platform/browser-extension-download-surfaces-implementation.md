# Browser-extension download transfer surfaces

This implementation adds three mount-ready renderer surfaces for a browser-extension handoff:

1. **Start download** is a blocking decision surface. It names the file, source, destination, and known size. Nothing starts until `DownloadTransferClient.start()` accepts the typed handoff. Cancel uses `cancelHandoff()` and reports the receipt.
2. **Downloading** is a separate progress surface. It renders only `DownloadTransferSnapshot` values from the transfer client, including exact bytes, known totals, observed rate, known ETA, deadline, pause/resume/cancel/retry availability, errors, and partial outcomes. It never increments a local timer or predicts a result.
3. **Download complete** is a non-blocking result surface. It names the file, destination, observed outcome, and observation time. The exported intent metadata marks it always-on-top while leaving dismissal non-blocking.

## Extension handoff contract

`console/shared/download-transfer.ts` is the boundary contract. An extension handoff is bounded and must have an HTTPS source, a file name, a destination, an ISO timestamp, an explicit unsaved-work state, and an optional known byte total. `isExtensionDownloadHandoff()` rejects malformed or unbounded messages before they reach a transfer client.

The dedicated `Ding-PBX-Console-NativeMessagingHost.exe` submits a bounded handoff over the authenticated allowlisted extension origin and a random protected per-installation named pipe. It is built by `build-native-host.ps1` through the supported MSVC path, with the supported MinGW fallback when MSVC is unavailable, and the script records a digest and fails closed without executable proof. `register-native-host.ps1` verifies its regular-file SHA-256, installs its absolute manifest path for Chrome and Edge, creates the current-user challenge configuration, and returns a typed registration receipt. The host can submit only a `download-handoff` message and receive its receipt. It cannot issue transfer commands or read queue or snapshot state. The desktop boundary repeats the challenge, extension id, and complete handoff validation before opening the native picker or entering the durable queue. The preload supplies the dedicated-window client, while the primary shell offers only a passive open-window action and does not mount a second transfer route. File and network I/O remain in the privileged manager. Hosted mode returns an explicit unavailable receipt because it cannot accept a desktop extension handoff.

## Window and accessibility intent

`DOWNLOAD_WINDOW_INTENTS` and `DOWNLOAD_SURFACE_REGISTRATIONS` document the contract, while Electron creates dedicated BrowserWindows with `alwaysOnTop: true` for Start, Downloading, and Complete. Start is a blocking decision and returns focus to its originating window after cancel or close. Completion is always-on-top but non-blocking, with a dismiss action. Each surface uses semantic headings, live status or alert regions, visible keyboard focus, keyboard-sized controls, overflow-safe URLs and paths, reduced-motion CSS, and a narrow-layout breakpoint.

Language and funny-copy selection remain host-owned: labels are ordinary strings in these mount-ready components, so a future host can pass localized or funny-level copy without changing transfer facts such as bytes, timestamps, URLs, paths, status, or error codes. Unsaved-work state is required in the handoff and remains visible on the Start surface; no transfer action discards it.

## Failure and verification boundaries

The transfer manager stores `download-transfers.json` beneath the installation data directory, strictly validates every persisted snapshot field before accepting it, and reconciles interrupted queued, downloading, and paused states at startup. It streams the HTTPS response into a unique adjacent temporary file, validates the byte total, records the exact complete size and SHA-256 digest, then uses the shared bounded Windows rename helper to publish atomically. A body interruption is distinct from a full-body publication failure. A complete temporary file remains available for retry publication only after its recorded size and digest are revalidated, without requesting Range at EOF. Header, body-idle, and total deadlines have distinct timeout codes. Pause and resume use HTTP Range with a recorded ETag or Last-Modified validator, and controls remain disabled with the exact reason when the server cannot resume. Cancel, discard, and non-resumable failure remove temporary files unless a resumable partial or publication-pending state is retained. A missing first snapshot is shown as a waiting state. A rejected command, deadline, non-retryable error, cancellation, and partial result stay visible and are not converted into success. This lane intentionally did not run tests, builds, runtime interaction, or captures, so built-artifact evidence remains pending.

## Suggested articles

[Long-operation progress reporting](long-operation-progress.md), [In-context failure recovery](in-context-recovery.md), [Accessibility](accessibility.md), [Responsive and high-scale sizing](responsive-sizing.md).
