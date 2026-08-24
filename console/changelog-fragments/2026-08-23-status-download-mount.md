# Status Hub and browser-extension transfer mount

- Mounted the Status Hub client and receipt-backed session surface at `#surface=status`.
- Added privileged Status Hub control-plane actions with typed unavailable behavior when no external service is configured.
- Added durable browser-extension handoff and transfer snapshots in `download-transfers.json`.
- Wired Start, Downloading, and completion routes to real preload commands and observed transfer snapshots, with an always-on-top window intent.
- Verification remains pending. This lane ran no tests, lint, type checks, builds, packaging, runtime interaction, extension launch, or captures.
