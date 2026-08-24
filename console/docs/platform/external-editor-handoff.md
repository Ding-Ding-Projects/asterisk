# External editor handoff

Open the current project folder, a selected configuration file, or an export in an editor that is installed on the same Windows computer.

## Behavior

The desktop process detects real executables and returns normalized absolute paths to the renderer. Detection covers Visual Studio Code stable, Visual Studio Code Insiders, Visual Studio Code Portable, user and machine installation paths, Notepad++, Sublime Text, and Notepad. Detection status, editor counts, persistence state, operation stage and progress, and saved-but-unavailable recovery all use the shared localized text boundary while editor names, paths and ids remain factual. Export readiness resolves the selected candidate into three distinct states: no selection, saved selection currently unavailable, or selected executable available. An unavailable saved choice remains preserved, with choose-another guidance and the separate explicit Visual Studio Code download route. The console never substitutes another editor without an explicit choice.

Every picker, persistence write, launch, and materialization receives an operation id in the same `ExternalEditorStatus.operation` contract. The main process publishes running status before awaiting a native picker or child process, and the renderer subscribes through the preload bridge until terminal. Native pickers report `picked`, `user-cancelled`, or `busy` separately, with their terminal operation receipt carrying the same id and progress state. Launch and materialization operations report bounded progress, refuse re-entry while another operation is active, and distinguish launch cancellation from materialization cancellation. Picker busy state is held by the runtime operation itself, not by a second main-process flag.

All status-returning mutations use one renderer outcome helper. Only a `completed` operation can produce a success notice. A `failed`, `cancelled`, `running`, or missing operation state keeps the returned status and produces a localized failure notice with the privileged detail, so a rollback cannot be reported as a save, removal, clear, or reset success.

The settings surface can cancel the active operation. Cancellation kills the child process when one exists, removes an in-flight local materialization, clears the timeout, and returns a typed cancelled result carrying the operation id and stage. A pending native picker is marked cancelled through the same main-process IPC path and finishes with a `programmatic-cancelled` picker receipt when the native dialog returns.

Empty file and folder paths are rejected before absolute-path normalization, so an empty value can never become the privileged process directory.

The settings surface provides these actions:

- Choose a local project folder through the native folder picker, then open that chosen folder as a workspace root. The installed console directory is never guessed as the user's project.
- Open the selected configuration file by materializing the exact structured read-back content into a bounded local application-data export. A remote `/etc/asterisk/...` path is never passed to the local editor.
- Open the current project explicitly in Visual Studio Code.
- Open the latest export in the selected editor through one action. If no editor is selected, the action refuses with a clear message. Visual Studio Code has its own explicit project and download actions.
- Browse for a custom editor executable, save it, remove it, or forget the selected editor.
  - Choose an arbitrary portable Visual Studio Code executable, which is verified through Windows product metadata and persisted separately from bounded automatic discovery routes.
- Choose whether a custom editor supports folders as workspaces. The setting is explicit per custom record and defaults to files only.
- Review the chosen project folder's session-only provenance and reset it without writing it to the privileged settings store.
- Inspect invalid or corrupt persistence and reset the privileged editor store in one action.

Session-only folder status preserves the factual selected path while localizing the surrounding state. A missing project folder, an oversized selected file, an empty live configuration read, and the decision not to create a partial local editor file each have distinct localized states.

Folder opening is capability-aware. Visual Studio Code variants receive `--new-window` followed by the folder path. Editors without folder-workspace support refuse the folder action with an actionable message rather than opening a misleading single file.

## Configuration and persistence

Custom records use the versioned `console.externalEditors.v1` shape in the application data store. The privileged runtime bounds the record to 32 entries, limits names to 80 characters and executable paths to 1,024 characters, normalizes accepted paths, and rejects command-line operators, quotes, newlines, and malformed identifiers. The selected editor id is stored separately from the renderer's display state so the choice survives relaunch and unavailable choices can still be reported. Portable Visual Studio Code auto-discovery is limited to the documented user and machine routes; an arbitrary portable executable is marked explicit only after the native picker verifies its product name, company and original filename metadata.

Exports handed to an editor are written to an application-owned `external-editor-exports` directory with a bounded UTF-8 payload and a sanitized filename. The source export remains unchanged. A selected PBX configuration receives a source path and a local materialized target path in its launch receipt.

## Security and failure modes

No editor launch goes through a shell. The runtime calls `child_process.spawn` with `shell:false`, `windowsHide:true`, and separate executable and argument arrays. A path containing spaces remains one argument, and shell metacharacters are never interpreted. Launches return a typed receipt with editor id, executable, arguments, target and process id, or a typed failure with a bounded startup timeout.

When no supported editor is installed, the settings surface states that the console works fully without one. The generic download action requires a selected editor. The separate Visual Studio Code download action is the only explicit default route. The app does not auto-download software. A missing selected executable, invalid custom record, inaccessible persistence parent, unsupported folder target, unavailable bridge, oversized export, and failed process start each produces a distinct failed operation status rather than a raw persistence throw.

The hosted browser surface exposes an honest no-editor state because native executable detection, file picking and process creation require the installed desktop runtime. No browser route pretends that a local editor was opened. The chosen project folder is session-only, with its local-picker provenance visible and an explicit reset action. The official download action requires a known current editor id and uses one exact URL allowlist. Unknown or stale ids do not fall back to Visual Studio Code.

## Accessibility and localization

All editor actions are rendered through the design reference's existing Material controls and retain keyboard focus, accessible labels, explanation affordances and the three language modes. Cantonese labels are registered alongside the English labels. The corrected executable placeholder names a path shape without suggesting a shell command.

## Verification

The focused renderer file covers the pure policy plus failed, completed, cancelled, and missing-operation mutation outcomes, and `tests/control-plane/external-editor-runtime.test.ts` covers synchronous spawn failure cleanup, inaccessible persistence and materialization parents, materialization cleanup after a typed failure, active-child cancellation with a typed cancelled receipt, unified picker status and cancellation, and empty-target rejection before child start. The two focused files currently run as 32 passing tests. This lane did not change the checked-in design controls, so the design compiler was not needed. The docs bundle was regenerated with `npm run bundle:docs`; this lane did not run lint, a broad build, packaging, UI driving or captures by design. The next verification lane should launch the packaged desktop artifact and prove detection, native picking, persistence, folder capability refusal, Visual Studio Code handoff, export handoff, and typed launch failure receipts.

## Suggested articles

[Complete data export](complete-exports.md), [Local version history](../app/local-version-history.md), [Platform feature index](README.md).
