# Browser-extension download capture surfaces

A companion browser extension's Start-download and in-progress-download dialogs, giving a real confirm/cancel decision and live transfer progress.

## Behavior

A Start-download dialog is meant to name the proposed file, source, and destination before anything transfers; a separate always-on-top Downloading dialog would show live progress, rate, and pause/resume/cancel controls for the real transfer underway.

## Configuration

Both dialogs would reflect the actual queued and in-flight transfer rather than a simulated progress value.

## Current status

**Desktop application:** Implemented as three explicit routes: `#surface=download/start`, `#surface=download/progress`, and `#surface=download/complete`. The preload accepts an extension handoff, the privileged transfer manager persists it, and each surface reads real receipts or transfer snapshots. There is no extension package in this Oak Kay, so an external extension remains an integration input rather than simulated content.

**Documentation website:** Unavailable. The hosted bridge exposes a typed unavailable receipt because a static documentation surface cannot own a desktop file transfer or an always-on-top window.

## Failure modes

Malformed or non-HTTPS handoffs are refused before transfer. Missing source bodies, HTTP errors, destination conflicts, cancellation, short responses, bounded-size violations, and transfer failures remain visible as failure or partial outcomes. Hosted mode reports the exact unavailable boundary.

## Accessibility and localization

The desktop surfaces use semantic headings, status and alert regions, visible focus, keyboard-sized controls, overflow-safe URLs and paths, reduced-motion CSS, and an always-on-top window intent. This lane was not run through tests, builds, type checks, lint, runtime interaction, or captures. Copy remains host-localized work for a later lane, while bytes, timestamps, paths, URLs, and status values remain factual.

## Verification

Verification remains pending for the built desktop artifact and a real extension handoff. The implementation paths are `console/control-plane/download-transfer-manager.ts`, `console/shared/download-transfer.ts`, `console/app/renderer/src/download-start-surface.tsx`, `console/app/renderer/src/download-progress-surface.tsx`, `console/app/renderer/src/download-complete-surface.tsx`, `console/app/electron/main.ts`, and `console/app/electron/preload.ts`.

## Suggested articles

[Long-operation progress reporting](long-operation-progress.md), [Platform feature index](README.md).
