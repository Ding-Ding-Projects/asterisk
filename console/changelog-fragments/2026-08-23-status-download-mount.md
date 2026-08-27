# Status Hub and browser-extension transfer mount

- Mounted the Status Hub client and receipt-backed session surface at `#surface=status`.
- Added privileged Status Hub control-plane actions with typed unavailable behavior when no external service is configured.
- Added durable browser-extension handoff and transfer snapshots in `download-transfers.json`.
- Wired Start, Downloading, and completion routes to real preload commands and observed transfer snapshots, with an always-on-top window intent.
- Added native destination approval, lexical containment, reparse checks, unique temporary files, atomic publication, typed header/body-idle/total timeouts, startup reconciliation, immutable handoff replay checks, and Range-based pause/resume when validators support it.
- Electron now creates dedicated always-on-top Start, Downloading, and Complete windows, including failed and cancelled terminal outcomes.
- The primary shell now offers only a passive open-window action. It no longer mounts duplicate transfer routes or listens to transfer events.
- Persisted Status Hub registration receipts hydrate before first mount, while malformed transfer snapshots are rejected field by field. Full-body publication failures retain the same complete temporary file for retry or discard and never request Range at EOF.
- Pending handoffs now use a durable ordered queue, and every dedicated window action and close is bound to its exact handoff or transfer id. Complete publication records an exact size and SHA-256 digest before retry publication.
- Status Hub receipt persistence returns typed failures and keeps live registration visible with a warning. Stale or not-found receipts get one bounded clear and re-registration attempt.
- Added the packaged `Ding-PBX-Console-NativeMessagingHost.exe`, allowlisted 32-character extension identity, bounded handoff schema, named-pipe ingress, Chrome and Edge registration script with typed receipt, MSVC build path, and installer resource entry. Transfer commands and state remain unavailable to the ingress.
- Added first-run in-app registration and typed ready, starting, unavailable, and retry states with hot ingress reload. Registration verifies regular executable and manifest files, stable executable digest, protected challenge config, current-user ACL, and both browser registry records.
- Added the native verified-directory helper contract for reparse-safe parent handles and no-follow temporary creation.
- Verification remains pending. This lane ran no tests, lint, type checks, builds, packaging, runtime interaction, extension launch, or captures.
