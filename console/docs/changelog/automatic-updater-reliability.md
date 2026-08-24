# Automatic updater reliability

- Draft-count updates now advance the main-process updater revision before publication, so a stale status read cannot overwrite a newer restart block.
- PBX draft publication now counts every loaded resource against its last live read, including the currently edited resource, so apply, discard, restore, and field edits converge on one accurate restart block.
- Installer launch acknowledgement clears its timeout on success and failure, preventing an old timer from changing a later state.
- Successful installer acknowledgement now returns to the renderer before quit is scheduled, while the installing latch stays held through shutdown and clears only for a failed launch.
- Release identity validation rejects duplicate artifact records, requires every resolved full and delta package exactly once, and checks version-bearing Squirrel filenames.
- Published tags retain the legacy-compatible `ding-pbx-console-v0.0.<run>-r<attempt>` shape while the package identity remains monotonic `0.1.<run>`, so existing `0.1.0` installations can see repaired releases.
