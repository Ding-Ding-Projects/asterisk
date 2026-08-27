## Local file converter surface

Added a mount-ready renderer surface for the local file converter. It reads a typed client
catalog, shows all eight adapter categories and exact unavailable dependency reasons, reads
real byte-signature results, and keeps the destination and disclosure steps explicit.

The surface also provides per-category plain-text and anchored regex search, a bounded paged
queue view with real progress and outcomes, PDF operation commands, export descriptors, and
the Visual Studio Code handoff descriptor. No renderer state fabricates a source, output,
progress value, or conversion success.
