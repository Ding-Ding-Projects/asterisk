# External editor runtime mount

## Immutable materialized handoffs

Completed same-name exports now receive separate UUID-scoped local paths. Their launch receipts retain the exact path, preserving each editor's bytes. The bounded retention policy keeps the 32 newest completed exports, while failed and cancelled handoffs clean only their own output.

The external-editor settings group is now mounted into the desktop runtime. Detection runs
in the privileged process, custom records are bounded and persistent, native executable
picking is available, and every launch returns a typed receipt or failure. Visual Studio Code
stable, Insiders and Portable routes are distinct, folder targets require workspace support,
and unavailable saved choices remain visible instead of being replaced.

The renderer, Electron preload, hosted fallback, control-plane runtime, design source and
generated output share one typed bridge. Exports and selected PBX read-back content can be
handed directly to Visual Studio Code through application-owned UTF-8 files. The launch path
never uses a shell. The privileged store is the only source of the selected editor id and uses
the shared bounded Windows-safe atomic rename retry helper. Invalid persistence is visible and
resettable. Every operation now carries an id and bounded progress, refuses re-entry while
busy, and reports picker cancellation separately from launch or materialization cancellation.
Cancellation now kills a child editor when present, removes a temporary materialization, and
returns a typed cancelled result carrying the operation id and stage.

## Renderer mutation notices stay truthful

Status-returning save, remove, clear and reset actions now share one renderer outcome helper.
Only a completed privileged operation can produce a success notice. Failed, cancelled, running
or missing terminal status produces localized failure copy with the exact privileged detail and
keeps the rolled-back status visible.

## Suggested articles

[External editor handoff](../platform/external-editor-handoff.md), [Complete data export](../platform/complete-exports.md), [Local version history](../app/local-version-history.md).
