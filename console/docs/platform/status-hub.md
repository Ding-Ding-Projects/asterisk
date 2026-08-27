# Status hub

A shared, live status page reporting what the product's own maintenance work is currently doing, including running, landed, and blocked states.

## Behavior

The desktop surface uses the typed Status Hub client and store. On first mount it hydrates a validated project id and registration receipt from the durable settings store. If that receipt is missing, it registers the project and persists the returned receipt before loading sessions. It re-registers only when the receipt is missing or an explicit registration action is requested. The surface reads session snapshots, evidence links, questions, and reply inbox from the configured service. A question is only marked answered after the service returns its delivery receipt. Polling is bounded, cancellable, and stale generations are discarded when the route leaves.

## Configuration

The desktop bridge accepts `STATUS_HUB_URL` as an origin-only configuration value. Credential references remain privileged and are never exposed as credential values to the renderer. If the service is not configured or cannot be reached, the surface shows a typed unavailable, offline, authentication, refusal, stale, partial, or invalid-response state.

## Current status

**Desktop application:** Implemented as a mountable Status Hub surface at `#surface=status`. The renderer reads only observed project and session records, and the privileged control-plane seam exposes registration, project, session, inbox, and receipt-backed answer actions. External service availability remains unverified in this lane.

**Documentation website:** Partial. The site composer embeds one validated build-manifest record into every published page. The status and download surfaces derive their counts, release availability, immutable URL, byte count, and digest only from that record, and show unavailable, invalid, or stale states otherwise. Live maintenance sessions and interactive question delivery are not implemented on this public surface.

## Failure modes

If no project registration is available, the surface says so. Transport deadlines, redirects, cross-origin responses, malformed JSON, oversized responses, invalid records, authentication refusal, and stale requests are reported as distinct states. No local row, question, answer receipt, or success state is invented when the service has not supplied it.

## Accessibility and localization

The surface uses semantic headings, status regions, bounded links, keyboard-sized question controls, visible focus, and reduced-motion-safe CSS. This lane was not run through tests, builds, type checks, lint, or UI capture. Copy remains host-localized work for a later lane, while evidence identifiers, timestamps, states, and receipt ids remain factual.

## Verification

Verification remains pending for the configured external service and the built desktop artifact. This lane deliberately did not run tests, builds, runtime interaction, or captures. Implementation paths include `console/control-plane/status-hub-client.ts`, `console/control-plane/status-hub-store.ts`, `console/app/renderer/src/status-hub-state.ts`, `console/app/renderer/src/status-hub-surface.tsx`, `console/app/electron/main.ts`, and `console/app/electron/preload.ts`.

## Suggested articles

[Non-blocking notifications](non-blocking-notifications.md), [In-app changelog viewer](changelog-viewer.md), [Agent hub](../agent/hub.md), [Platform feature index](README.md).
