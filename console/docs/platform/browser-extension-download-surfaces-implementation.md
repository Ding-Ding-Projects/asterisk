# Browser-extension download transfer surfaces

This implementation adds three mount-ready renderer surfaces for a browser-extension handoff:

1. **Start download** is a blocking decision surface. It names the file, source, destination, and known size. Nothing starts until `DownloadTransferClient.start()` accepts the typed handoff. Cancel uses `cancelHandoff()` and reports the receipt.
2. **Downloading** is a separate progress surface. It renders only `DownloadTransferSnapshot` values from the transfer client, including exact bytes, known totals, observed rate, known ETA, deadline, pause/resume/cancel/retry availability, errors, and partial outcomes. It never increments a local timer or predicts a result.
3. **Download complete** is a non-blocking result surface. It names the file, destination, observed outcome, and observation time. The exported intent metadata marks it always-on-top while leaving dismissal non-blocking.

## Behavior

The three surfaces above are the whole of what a reader sees; the sections below say what
each one is wired to. Start blocks and decides, Downloading reports and never predicts, and
Complete announces without blocking.

### Extension handoff contract

`console/shared/download-transfer.ts` is the boundary contract. An extension handoff is bounded and must have an HTTPS source, a file name, a destination, an ISO timestamp, an explicit unsaved-work state, and an optional known byte total. `isExtensionDownloadHandoff()` rejects malformed or unbounded messages before they reach a transfer client.

The dedicated `Ding-PBX-Console-NativeMessagingHost.exe` submits a bounded handoff over the authenticated allowlisted extension origin and a random protected per-installation named pipe. `Ding-PBX-Console-NativeIngressBroker.exe` owns that pipe with a protected descriptor for only the current user and `SYSTEM`, verifies the effective pipe ACL before its ready handshake, caps active slots, rejects incomplete frames by deadline, and has a bounded startup handshake. Registration settles only after ready, error, or unavailable status. The desktop arms the secure-helper path only after every config, manifest, host, broker, and helper digest and ACL check passes. Any config, registration, ACL, digest, broker startup, broker shutdown, or hot-reload failure clears that helper path before publishing the failure state. Before any resume Range request, the manager requires the temporary file size to equal the recorded acknowledged byte count exactly. A larger or smaller file is refused with no Range request unless a future explicit recovery record authorizes normalization. Pause does not persist a new byte count until the helper has closed and the durable size has been reconciled, so a flushed but not yet processed acknowledgement cannot leave a paused snapshot behind the actual temporary file. If reconciliation fails, the snapshot emits `SECURE_TEMP_SIZE_RECONCILIATION_FAILED`, disables resume, and requires discard before another attempt. The host and broker are built by `build-native-host.ps1` through the supported MSVC path, with the supported MinGW fallback when MSVC is unavailable, and the script records separate digests after proving fresh binaries. `register-native-host.ps1` verifies each regular-file SHA-256, installs absolute manifest and broker paths for Chrome and Edge, creates the current-user challenge configuration, verifies protected inheritance plus exact allow rules, and returns a typed registration receipt. The host can submit only a `download-handoff` message and receive its receipt. It cannot issue transfer commands or read queue or snapshot state. The desktop boundary repeats the challenge, extension id, and complete handoff validation before opening the native picker or entering the durable queue. The transfer manager streams new and resumed bytes directly into a native handle created relative to the verified parent handle, without a path reopen. The helper emits cumulative size and write acknowledgements only after `WriteFile` and `FlushFileBuffers` completion, and its `--publish` operation opens the verified child with exclusive sharing, hashes and flushes that same handle, validates the expected size and digest, renames it parent-relatively with `NtSetInformationFile`, verifies final destination identity through the original renamed handle, and if that handle query fails closes it and compares the destination file identity through a compatible reopen. If neither proof establishes the original file identity, it returns `SECURE_TEMP_PUBLISH_AMBIGUOUS`; the manager emits `PUBLISH_AMBIGUOUS`, clears publication pending, disables automatic retry, and requires review. Initial and retry publication use that native operation on Windows, so the digest-to-rename race has no unverified replacement window. Publication runs in a cancellable child attached to the transfer task, and cancel or discard waits for confirmed process termination before cleanup and terminal state. After cancellation, the manager verifies that the destination is still absent and emits `DOWNLOAD_LATE_PUBLICATION_CONFLICT` if a late publish is observed. Header, body-idle, and total timeout kinds remain attached to the terminal typed timeout receipt even when the native helper fails during the same operation, with `TRANSFER_TIMEOUT_HEADER`, `TRANSFER_TIMEOUT_BODY_IDLE`, and `TRANSFER_TIMEOUT_TOTAL` codes. On helper interruption, the manager stats and reconciles the durable temporary size before retaining a partial or allowing resume. Cancellation and discard wait for the exact helper process to close before bounded sharing-violation delete retry, and keep a typed cleanup failure when removal cannot be confirmed. Hot reload waits for the previous broker close and refuses replacement readiness while the old broker remains. The preload supplies the dedicated-window client, while the primary shell offers only a passive open-window action and does not mount a second transfer route. File and network I/O remain in the privileged manager. Hosted mode returns an explicit unavailable receipt because it cannot accept a desktop extension handoff.

### Window and accessibility intent

`DOWNLOAD_WINDOW_INTENTS` and `DOWNLOAD_SURFACE_REGISTRATIONS` document the contract, while Electron creates dedicated BrowserWindows with `alwaysOnTop: true` for Start, Downloading, and Complete. Start is a blocking decision and returns focus to its originating window after cancel or close. Completion is always-on-top but non-blocking, with a dismiss action. Each surface uses semantic headings, live status or alert regions, visible keyboard focus, keyboard-sized controls, overflow-safe URLs and paths, reduced-motion CSS, and a narrow-layout breakpoint.

Language and funny-copy selection remain host-owned: labels are ordinary strings in these mount-ready components, so a future host can pass localized or funny-level copy without changing transfer facts such as bytes, timestamps, URLs, paths, status, or error codes. Unsaved-work state is required in the handoff and remains visible on the Start surface; no transfer action discards it.

## Configuration

Nothing on these three surfaces is a preference, and the reason is worth stating rather
than leaving to be inferred: every value they show is a fact about one transfer, so a
setting that changed one would be a setting that changed a reading.

What is configured, and where:

- **Registration.** `register-native-host.ps1` installs absolute manifest and broker paths
  for Chrome and Edge, creates the current-user challenge configuration, and returns a
  typed receipt. There is no in-app switch that arms this path; the desktop arms it only
  after every config, manifest, host, broker and helper digest and ACL check has passed.
- **The allowlisted extension origin and the per-installation named pipe**, both fixed at
  registration. The pipe's descriptor admits the current user and `SYSTEM` and nothing
  else, and the broker verifies the effective ACL before its ready handshake.
- **The destination**, chosen per transfer through the native picker after the boundary has
  revalidated the challenge, the extension id and the complete handoff.
- **Language and funny-level copy**, which are host-owned. The mount-ready components carry
  ordinary strings so a host can pass localized copy without touching a transfer fact:
  bytes, timestamps, URLs, paths, status and error codes are never restyled.

Deadlines, slot caps and retry bounds are contract values rather than user settings, so a
reader cannot widen a timeout to make a stalled transfer look healthy.

## Failure modes

The transfer manager stores `download-transfers.json` beneath the installation data directory, strictly validates every persisted snapshot field before accepting it, and reconciles interrupted queued, downloading, and paused states at startup. It streams the HTTPS response into a unique adjacent temporary file, validates the byte total, records the exact complete size and SHA-256 digest, then uses the shared bounded Windows rename helper to publish atomically. A body interruption is distinct from a full-body publication failure. A complete temporary file remains available for retry publication only after its recorded size and digest are revalidated, without requesting Range at EOF. Header, body-idle, and total deadlines have distinct timeout codes. Pause and resume use HTTP Range with a recorded ETag or Last-Modified validator, and controls remain disabled with the exact reason when the server cannot resume. Cancel, discard, and non-resumable failure remove temporary files unless a resumable partial or publication-pending state is retained. A missing first snapshot is shown as a waiting state. A rejected command, deadline, non-retryable error, cancellation, and partial result stay visible and are not converted into success.

## Verification

This lane intentionally did not run tests, builds, runtime interaction, or captures, so
built-artifact evidence remains pending. Nothing described here has been exercised from a
real browser extension: no extension has submitted a handoff, no named pipe has carried
one, no picker has opened, and none of the three surfaces has been photographed. The
registry row for this contract is `absent` for the documentation site for a different
reason again -- this repository contains no browser extension, so on that surface there is
nothing to drive rather than something undriven.

## Suggested articles

[Long-operation progress reporting](long-operation-progress.md), [In-context failure recovery](in-context-recovery.md), [Accessibility](accessibility.md), [Responsive and high-scale sizing](responsive-sizing.md).
