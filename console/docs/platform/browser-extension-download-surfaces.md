# Browser-extension download capture surfaces

A companion browser extension's Start-download and in-progress-download dialogs, giving a real confirm/cancel decision and live transfer progress.

## Behavior

A Start-download window names the proposed file, source, and destination before anything transfers. Dedicated always-on-top Downloading and completion windows show live progress or the final observed outcome for the real transfer underway.

## Configuration

The native destination picker or a persisted approved destination root supplies the destination. The privileged transfer manager records the original handoff, applies bounded header, body-idle, and total deadlines, streams into a unique adjacent temporary file, validates bytes, and publishes atomically. Range pause and resume are enabled only when the source supplies both byte-range support and a stable validator.

## Current status

**Desktop application:** Implemented as three explicit routes: `#surface=download/start`, `#surface=download/progress`, and `#surface=download/complete`. The packaged submission-only native-messaging host accepts an authenticated extension handoff, the privileged transfer manager persists it, and each surface reads real receipts or transfer snapshots. The companion extension itself is not shipped in this repository, so its browser-side capture remains an external integration input rather than simulated content.

The supported ingress is the packaged submission-only native-messaging host executable `Ding-PBX-Console-NativeMessagingHost.exe`, registered under the reverse-domain host name `com.dingdingprojects.asterisk.downloads`, with the shipped 32-character extension id `dnpkplcgjmipnndmghkhljjoefjhidab`. Chrome or Edge authenticates the sender through the manifest `allowed_origins` allowlist, the host repeats the exact extension id check, and the desktop named-pipe ingress accepts only one bounded `download-handoff` message after a protected per-installation challenge response. The pipe identity is random per installation, current-user scoped, and connection-capped. The primary shell shows the typed ready, unavailable, starting, or retry state and offers the first-run Register extension ingress action. Registration hot-reloads the listener and verifies the executable, manifest, config, digest, ACL, and Chrome plus Edge registry records. The ingress can submit a handoff and receive its receipt, but it exposes no transfer command, snapshot, queue, or credential operation. `register-native-host.ps1` verifies the executable and recorded SHA-256, writes the absolute install-resolved executable path, and registers both browsers, returning a typed receipt.

**Documentation website:** Implemented as a browser-local handoff equivalent at `history.html`. When File System Access is available, a real local file is written to a user-selected destination in measured chunks, cancellation aborts the writable stream, and completion follows stream close. Unsupported browsers remain explicitly unavailable. This browser-local equivalent does not receive native-extension handoffs, own the desktop transfer queue, or create always-on-top windows.

## Failure modes

Malformed or non-HTTPS handoffs are refused before transfer. Mismatched replayed handoffs, unauthenticated ingress, non-absolute or unapproved destinations, lexical containment failures, symlink or reparse components, destination conflicts, header timeout, body-idle timeout, total timeout, missing source bodies, HTTP errors, cancellation, short responses, bounded-size violations, and transfer failures remain visible as typed failure or partial outcomes. The destination parent is checked again after directory creation immediately before the temporary open. Hosted mode reports the exact unavailable boundary.

## Accessibility and localization

The desktop surfaces use semantic headings, status and alert regions, visible focus, keyboard-sized controls, overflow-safe URLs and paths, reduced-motion CSS, and an always-on-top window intent. This lane was not run through tests, builds, type checks, lint, runtime interaction, or captures. Copy remains host-localized work for a later lane, while bytes, timestamps, paths, URLs, and status values remain factual.

## Verification

Verification remains pending for the built desktop artifact and a real extension handoff. The implementation paths are `console/control-plane/download-transfer-manager.ts`, `console/shared/download-transfer.ts`, `console/app/renderer/src/download-start-surface.tsx`, `console/app/renderer/src/download-progress-surface.tsx`, `console/app/renderer/src/download-complete-surface.tsx`, `console/app/electron/main.ts`, and `console/app/electron/preload.ts`.

## Suggested articles

[Long-operation progress reporting](long-operation-progress.md), [Platform feature index](README.md).
