# External editor runtime mount

The external-editor settings group is now mounted into the desktop runtime. Detection runs
in the privileged process, custom records are bounded and persistent, native executable
picking is available, and every launch returns a typed receipt or failure. Visual Studio Code
stable, Insiders and Portable routes are distinct, folder targets require workspace support,
and unavailable saved choices remain visible instead of being replaced.

The renderer, Electron preload, hosted fallback, control-plane runtime, design source and
generated output share one typed bridge. Exports can be handed directly to Visual Studio Code
through an application-owned UTF-8 file. The launch path never uses a shell.

## Suggested articles

[External editor handoff](../platform/external-editor-handoff.md), [Complete data export](../platform/complete-exports.md), [Local version history](../app/local-version-history.md).
