# Browser-extension download transfer surfaces

## Behavior

This implementation adds three mount-ready renderer surfaces for a browser-extension handoff:

1. **Start download** is a blocking decision surface. It names the file, source, destination, and known size. Nothing starts until `DownloadTransferClient.start()` accepts the typed handoff. Cancel uses `cancelHandoff()` and reports the receipt.
2. **Downloading** is a separate progress surface. It renders only `DownloadTransferSnapshot` values from the transfer client, including exact bytes, known totals, observed rate, known ETA, deadline, pause/resume/cancel/retry availability, errors, and partial outcomes. It never increments a local timer or predicts a result.
3. **Download complete** is a non-blocking result surface. It names the file, destination, observed outcome, and observation time. The exported intent metadata marks it always-on-top while leaving dismissal non-blocking.

## Extension handoff contract

`console/shared/download-transfer.ts` is the boundary contract. An extension handoff is bounded and must have an HTTPS source, a file name, a destination, an ISO timestamp, an explicit unsaved-work state, and an optional known byte total. `isExtensionDownloadHandoff()` rejects malformed or unbounded messages before they reach a transfer client.

The dedicated `Ding-PBX-Console-NativeMessagingHost.exe` submits a bounded handoff over the authenticated allowlisted extension origin and a random protected per-installation named pipe. `Ding-PBX-Console-NativeIngressBroker.exe` owns that pipe with a protected descriptor for only the current user and `SYSTEM`, verifies the effective pipe ACL before its ready handshake, caps active slots, rejects incomplete frames by deadline, and has a bounded startup handshake. Registration settles only after ready, error, or unavailable status. The desktop arms the secure-helper path only after every config, manifest, host, broker, and helper digest and ACL check passes. Any config, registration, ACL, digest, broker startup, broker shutdown, or hot-reload failure clears that helper path before publishing the failure state. Before any resume Range request, the manager requires the temporary file size to equal the recorded acknowledged byte count exactly. A larger or smaller file is refused with no Range request unless a future explicit recovery record authorizes normalization. Pause does not persist a new byte count until the helper has closed and the durable size has been reconciled, so a flushed but not yet processed acknowledgement cannot leave a paused snapshot behind the actual temporary file. If reconciliation fails, the snapshot emits `SECURE_TEMP_SIZE_RECONCILIATION_FAILED`, disables resume, and requires discard before another attempt. The host and broker are built by `build-native-host.ps1` through the supported MSVC path, with the supported MinGW fallback when MSVC is unavailable, and the script records separate digests after proving fresh binaries. `register-native-host.ps1` verifies each regular-file SHA-256, installs absolute manifest and broker paths for Chrome and Edge, creates the current-user challenge configuration, verifies protected inheritance plus exact allow rules, and returns a typed registration receipt. The host can submit only a `download-handoff` message and receive its receipt. It cannot issue transfer commands or read queue or snapshot state. The desktop boundary repeats the challenge, extension id, and complete handoff validation before opening the native picker or entering the durable queue. The transfer manager streams new and resumed bytes directly into a native handle created relative to the verified parent handle, without a path reopen. The helper emits cumulative size and write acknowledgements only after `WriteFile` and `FlushFileBuffers` completion, and its `--publish` operation opens the verified child with exclusive sharing, hashes and flushes that same handle, validates the expected size and digest, renames it parent-relatively with `NtSetInformationFile`, verifies final destination identity through the original renamed handle, and if that handle query fails closes it and compares the destination file identity through a compatible reopen. If neither proof establishes the original file identity, it returns `SECURE_TEMP_PUBLISH_AMBIGUOUS`; the manager emits `PUBLISH_AMBIGUOUS`, clears publication pending, disables automatic retry, and requires review. Initial and retry publication use that native operation on Windows, so the digest-to-rename race has no unverified replacement window. Publication runs in a cancellable child attached to the transfer task, and cancel or discard waits for confirmed process termination before cleanup and terminal state. After cancellation, the manager verifies that the destination is still absent and emits `DOWNLOAD_LATE_PUBLICATION_CONFLICT` if a late publish is observed. Header, body-idle, and total timeout kinds remain attached to the terminal typed timeout receipt even when the native helper fails during the same operation, with `TRANSFER_TIMEOUT_HEADER`, `TRANSFER_TIMEOUT_BODY_IDLE`, and `TRANSFER_TIMEOUT_TOTAL` codes. On helper interruption, the manager stats and reconciles the durable temporary size before retaining a partial or allowing resume. Cancellation and discard wait for the exact helper process to close before bounded sharing-violation delete retry, and keep a typed cleanup failure when removal cannot be confirmed. Hot reload waits for the previous broker close and refuses replacement readiness while the old broker remains. The preload supplies the dedicated-window client, while the primary shell offers only a passive open-window action and does not mount a second transfer route. File and network I/O remain in the privileged manager. Hosted mode returns an explicit unavailable receipt because it cannot accept a desktop extension handoff.

## Window and accessibility intent

`DOWNLOAD_WINDOW_INTENTS` and `DOWNLOAD_SURFACE_REGISTRATIONS` document the contract, while Electron creates dedicated BrowserWindows with `alwaysOnTop: true` for Start, Downloading, and Complete. Start is a blocking decision and returns focus to its originating window after cancel or close. Completion is always-on-top but non-blocking, with a dismiss action. Each surface uses semantic headings, live status or alert regions, visible keyboard focus, keyboard-sized controls, overflow-safe URLs and paths, reduced-motion CSS, and a narrow-layout breakpoint.

Language and funny-copy selection remain host-owned: labels are ordinary strings in these mount-ready components, so a future host can pass localized or funny-level copy without changing transfer facts such as bytes, timestamps, URLs, paths, status, or error codes. Unsaved-work state is required in the handoff and remains visible on the Start surface; no transfer action discards it.

## Configuration

Nothing on this path is configured by editing a file by hand, and that is deliberate: every value
below is either derived per installation or verified by digest, because a settable browser origin or
a settable pipe name is a settable way in.

| What | Where it comes from |
| --- | --- |
| The native-messaging manifest Chrome and Edge read | written by `native-messaging/register-native-host.ps1`, with absolute host and broker paths, after verifying each regular file's SHA-256 |
| The allowed extension identity | `native-messaging/extension-identity.json`, checked again at the desktop boundary rather than trusted from the message |
| The manifest name and shape | `native-messaging/com.dingdingprojects.asterisk.downloads.json` |
| The named pipe carrying a handoff | random per installation, with a protected descriptor allowing only the current user and `SYSTEM`; the broker verifies the effective ACL before its ready handshake |
| The per-user challenge | created by the same registration script, with protected inheritance and exact allow rules |
| The host and broker binaries | built by `native-messaging/build-native-host.ps1` through MSVC, falling back to MinGW when MSVC is absent, recording a separate digest per binary after proving the binaries are fresh |
| Durable transfer state | `download-transfers.json` beneath the installation data directory |

Registration returns a typed receipt and settles only on ready, error or unavailable — never on a
timeout read as success. The secure-helper path is armed only after every config, manifest, host,
broker and helper digest and ACL check passes, and any later failure among them clears that path
before the failure state is published, so a partly-verified helper is never left armed.

Hosted mode has nothing to configure here at all: it returns an explicit unavailable receipt, because
a hosted server cannot accept a desktop extension handoff.

## Failure modes

The transfer manager stores `download-transfers.json` beneath the installation data directory, strictly validates every persisted snapshot field before accepting it, and reconciles interrupted queued, downloading, and paused states at startup. It streams the HTTPS response into a unique adjacent temporary file, validates the byte total, records the exact complete size and SHA-256 digest, then uses the shared bounded Windows rename helper to publish atomically. A body interruption is distinct from a full-body publication failure. A complete temporary file remains available for retry publication only after its recorded size and digest are revalidated, without requesting Range at EOF. Header, body-idle, and total deadlines have distinct timeout codes. Pause and resume use HTTP Range with a recorded ETag or Last-Modified validator, and controls remain disabled with the exact reason when the server cannot resume. Cancel, discard, and non-resumable failure remove temporary files unless a resumable partial or publication-pending state is retained. A missing first snapshot is shown as a waiting state. A rejected command, deadline, non-retryable error, cancellation, and partial result stay visible and are not converted into success.

## Verification

The lane that wrote this ran no tests, no build, no runtime interaction and no captures. Since then
the contract and the renderer surfaces are covered by the repository's own suites — `npm run
test:renderer` and `npm run test:contracts` for the typed boundary and the three surfaces, `npx tsc
-b` for the types — and all of that is source-level.

What has **not** been observed, and matters most on this path:

- No browser extension has actually handed a download off. The three surfaces have never been driven
  from a real extension, so the Start → Downloading → Complete sequence is proved against supplied
  snapshots rather than against a real transfer.
- The native host, the ingress broker and the secure temporary-file helper are C++ binaries built by
  `build-native-host.ps1`; nothing here proves a built pair registered, handshook and published a
  file on a real machine.
- The always-on-top intent is declared in `DOWNLOAD_WINDOW_INTENTS` and applied by Electron's
  `alwaysOnTop`. No capture shows those windows above a browser.

The inventory row stays `implemented-unverified` until a driven run produces those records.

## Suggested articles

[Long-operation progress reporting](long-operation-progress.md), [In-context failure recovery](in-context-recovery.md), [Accessibility](accessibility.md), [Responsive and high-scale sizing](responsive-sizing.md).
