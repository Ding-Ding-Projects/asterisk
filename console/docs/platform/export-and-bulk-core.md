# Export and bulk-operation core

The renderer includes a domain layer for preparing faithful data exports, scoping collection selections, planning bulk operations, and reporting confirmed platform outcomes.

## Behavior

Export preparation validates input against the versioned `ding-pbx-export.v1` tree schema before encoding it. Supported outputs are JSON, JSONL, YAML, TOML, XML, CSV, TSV, Markdown, HTML, SQL, TypeScript, JavaScript, and Python. Every artifact declares UTF-8, its schema version, media type, line-ending convention, byte count, row count, and format-specific disclosures.

Formats fail closed when they cannot preserve a dataset. For example, TOML is unavailable for null values or mixed-type arrays, SQL is unavailable for nested values without a target schema, and XML is unavailable for characters XML 1.0 cannot represent. Source-code forms contain data literals only. Tabular formats use canonical JSON in headers and populated cells, while an empty cell means the field was absent, preserving names, types, and ragged rows.

Archive export and archive encryption are explicitly unavailable because no bundled, verified ZIP or 7z adapter is registered. The core does not accept encryption settings or claim that a renamed or unverified archive is protected.

Selection state belongs to one collection identifier and one query key. Changing either context creates a new empty selection, preventing stale selections from acting on a different result set. Page selection, all-match selection, inverse selection, additive toggles, and inclusive ranges share the same pinned and protected-item exclusion policy.

Bulk actions are discriminated as enabled or disabled. An enabled action must provide an execution handler. A disabled action must provide an exact reason and has no callable handler. Plans distinguish selected, affected, and excluded counts before execution. Runs report each item as converted, saved, exported, changed, skipped, cancelled, or failed according to the action and its confirmed result.

Each execute and revert call receives a real `AbortSignal` from its own linked `AbortController` and a finite positive safe-integer per-item deadline. The default is 30 seconds. Caller cancellation actively aborts every in-flight item, while a deadline abort records a distinct timed-out result. Timers and caller-signal listeners are removed on every settle path. Untyped handler or platform-adapter rejections are reduced to fixed public-safe failure copy instead of exposing raw messages that may contain private paths.

Undo is exposed only when a confirmed mutation supplies an inverse token or local-history revision and the surface registers a real inverse handler. A notification action cannot manufacture undo support.

## Configuration

There is no settings file and no build flag here. What a caller chooses, it chooses per call:

- **The output format**, from the thirteen listed above. It is a choice rather than a preference because a format is only offered for a dataset it can carry faithfully; the same collection can leave TOML or SQL unavailable while leaving JSON available, and the reason travels with the unavailable one.
- **The per-item deadline**, a finite positive safe integer of milliseconds, defaulting to 30 seconds when a caller does not pass one.
- **The `AbortSignal`** a caller may pass to cancel a run it started.
- **The `ExportPlatformPort` adapter**, supplied by the host rather than by this layer. It is what decides whether saving, clipboard, editor detection and editor launch are available at all, so on a host that supplies none of them every one of those actions is a disabled action carrying its exact reason.

Two things are deliberately not configurable, and both would be worth less than nothing if they were. Archive encryption accepts no settings, because no verified archive adapter is registered and a setting would imply one. Undo cannot be turned on by a caller: it appears when a confirmed mutation actually returned an inverse token or a local-history revision, and never because a surface asked for an undo button.

## Platform integration contract

The renderer does not write files or launch an editor directly. A privileged desktop or hosted adapter must implement the shared `ExportPlatformPort` contract for save, download, clipboard, editor detection, and editor launch. The renderer reports success only after that adapter returns a confirmation receipt with an operation identifier and completion time.

Saving and opening an export in Visual Studio Code is a two-stage operation. The save must first be confirmed with a local path. Editor detection and launch happen afterward, and the overall result remains failed, cancelled, or unavailable unless the launch is separately confirmed.

## Failure modes

- Unsupported values, excessive depth, excessive value count, sparse arrays, cycles, repeated object references, accessors, and class instances make preparation unavailable with an exact path and reason.
- A platform cancellation remains cancelled. It is never translated into success.
- A platform failure preserves its code, reason, and retryable state.
- A confirmed save without a returned local path cannot proceed to editor handoff.
- Pinned and protected records remain excluded unless the caller explicitly requests their inclusion.
- Cancellation stops new bulk items from starting and records every unstarted item as cancelled.
- A never-settling execute or revert handler is aborted at its finite per-item deadline and reported as timed out. Timed-out work is not automatically retryable because an abort-ignoring handler may still complete a side effect later.
- A thrown action handler becomes a per-item failed outcome and does not turn the remaining batch green.

## Security and privacy

Encoding is local and deterministic. The domain layer performs no network access, filesystem access, clipboard mutation, process launch, clock read, or random generation. External effects exist only behind the injected platform contract. SQL output uses quoted identifiers and escaped literals, but remains review-only because target constraints and column types are not known to the exporter.

## Verification status

This change provides the pure/domain implementation and platform contracts only. It does not wire a visible export button, file dialog, clipboard bridge, Visual Studio Code launch bridge, or list surface. No tests, type checks, builds, runtime interactions, or captures were run in the ultra-speed lane.

## Suggested articles

[Complete data export](complete-exports.md), [Bulk actions](bulk-actions.md), [External editor handoff](external-editor-handoff.md).
