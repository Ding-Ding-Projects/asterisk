# Local Ollama service core

- Added a loopback-only Ollama client for health, version, installed and running models, model details, streamed pulls, and streamed chat.
- Added exhaustive paginated catalogue ingestion contracts with revision, timestamp, page count, completeness, stale-cache fallback, and installed-state reconciliation.
- Added conservative hardware-fit assessments that retain their evidence, assumptions, resource estimates, and blockers.
- Added a durable bounded-parallel pull queue with progress, cancellation, retry, restart recovery, and honest partial outcomes.
- Added cancellable multi-session chat with capability-gated images and bounded parameters, content, attachments, and streamed events.
- Added allowlisted application-owned harness profiles with preflight, configuration snapshots, explicit restore, and automatic failed-launch rollback. Ollama itself is never presented as a program launcher.
- Added typed handler factories for later dispatcher integration. The desktop bridge and user interface are not wired by this fragment.
- No tests, type checks, lint, build, packaging command, runtime request, or screen capture ran in this ultra-speed implementation lane.
