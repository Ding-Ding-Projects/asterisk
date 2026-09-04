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

This layer has no settings file and no environment variables. Everything a caller can vary is an
option object, and the defaults below are the ones the code actually carries:

| Option | Where | Default |
| --- | --- | --- |
| `concurrency` — how many bulk items run at once | `RunBulkOptions` (`app/renderer/src/bulk.ts:214`) | unset, so the run is serial |
| `itemDeadlineMs` — the finite per-item deadline described above | same interface | `DEFAULT_BULK_ITEM_DEADLINE_MS`, `30_000` (`bulk.ts:212`) |
| `signal` — the caller's own `AbortSignal`, linked into each item's controller | same interface | unset, so only the deadline can abort |
| `onProgress` — a callback receiving `BulkProgress` as outcomes settle | same interface | unset, so a run reports only when it finishes |
| `includePinned`, `includeProtected` — whether a plan reaches records the exclusion policy holds back | `BulkPlanOptions` (`bulk.ts:105`) | both absent, so a pinned record is excluded and counted rather than silently dropped |
| The export format | `ExportRequest.format` (`app/renderer/src/export.ts:23`) | none; a caller picks from the list above, and `suitableFormats()` reports which of them this dataset can survive |

A per-item deadline above `MAX_TIMER_DELAY_MS` (`2_147_483_647`) cannot be expressed by the platform
timer, so `bulk.ts` knows that bound rather than silently giving a caller a shorter wait than it
asked for.

Every prepared artifact declares `schemaVersion: 'ding-pbx-export.v1'`, UTF-8, and LF line endings
(`export.ts:570`). Those three are fixed rather than configurable, because an export whose encoding
or line endings vary by host is an export another tool cannot read without guessing.

There is nothing to configure for archives. No bundled ZIP or 7z adapter is registered, so those
formats are unavailable rather than optional, and the core refuses encryption settings outright
instead of accepting settings it cannot honour.

## Platform integration contract

The renderer does not write files or launch an editor directly. A privileged desktop or hosted adapter must implement the shared `ExportPlatformPort` contract for save, download, clipboard, editor detection, and editor launch. The renderer reports success only after that adapter returns a confirmation receipt with an operation identifier and completion time.

Saving and opening an export in Visual Studio Code is a two-stage operation. The save must first be confirmed with a local path. Editor detection and launch happen afterward, and the overall result remains failed, cancelled, or unavailable unless the launch is separately confirmed.

## Configuration

- **The output format**, from the thirteen listed above. It is a choice among formats that
  can carry the dataset, never a choice to lose part of it: a format that cannot preserve
  the data is unavailable with its reason rather than offered and silently lossy.
- **The selection context**, one collection identifier and one query key. Changing either
  creates a new empty selection on purpose, so a selection made against one result set can
  never act on another.
- **Whether pinned and protected records are included**, which the caller must ask for
  explicitly; the default excludes them across page, all-match, inverse, toggle and range
  selection alike.
- **The per-item deadline** for execute and revert, a finite positive safe integer
  defaulting to 30 seconds, delivered to each handler as a real `AbortSignal` from its own
  linked controller.
- **The platform port.** Save, download, clipboard, editor detection and editor launch all
  arrive through an injected `ExportPlatformPort`; the domain layer has no filesystem,
  clipboard, process or network access of its own, so there is nothing here to point at a
  path or a host.

Archive export and archive encryption take no settings because neither is available: no
bundled, verified ZIP or 7z adapter is registered. The core refuses encryption settings
outright rather than accepting them and producing an archive it cannot claim is protected.

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
