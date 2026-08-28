# Receipt-backed operations and notifications

Typed foundations for long-running console operations and the notification history that reports their real outcomes.

## Behavior

An operation request identifies one operation type, one exact target, the affected data, a stable idempotency key, a deadline, and whether cancellation and retry are allowed. A capability check distinguishes available, unavailable, and deliberately disabled behavior before any work begins. Unavailable and disabled states carry their exact reason and may point to an explicit recovery or enable action.

The coordinator refuses duplicate submissions while the same idempotency key is pending. It reports observed progress, supports cancellation only when the request allows it, enforces the deadline, and returns one terminal receipt. A runner choosing an execution path is not success. A successful or partial receipt must include an observation from the component that applied the effect, and the receipt must match the request's operation id, type, idempotency key, and target.

Bulk and multi-step work returns per-item outcomes. A partial result names what succeeded, failed, was skipped, or was cancelled. Its retry action exists only when the request provides a distinct idempotency key for the unfinished work, so retry cannot replay or repeat effects that already landed. Failure, cancellation, timeout, refusal, unavailable capability, and disabled capability stay distinct so the interface can offer an accurate next action.

## Configuration

Nothing here reads a settings file. Every value is carried on the request or the policy object, and
naming them exactly matters because two of them are what make a retry safe:

| Field | Where | Meaning |
| --- | --- | --- |
| `deadlineAt` | `OperationRequest` (`shared/operations.ts:82`) | an ISO-8601 instant, not a duration. After it the coordinator stops waiting and returns a timeout receipt |
| `idempotencyKey` | same interface | while one is pending, a second submission carrying it is refused rather than queued |
| `retryIdempotencyKey` | same interface | a **distinct** key covering only the unfinished part of a partial result. Without it there is no retry action, because retrying under the original key would replay effects that already landed |
| `cancellable`, `retryable` | same interface | whether those actions exist at all. A surface offers neither unless the request declared it |
| `undo` | same interface | an inverse operation reference or a local-history revision. Undo is absent unless one is supplied |

Quiet hours are configured by `NotificationQuietHoursPolicy` (`shared/notifications.ts:130`):
`enabled`, an IANA `timeZone`, a list of `windows`, and a `mode` that is either
`suppress-info-success-progress` or `suppress-all-toasts`. Each window carries JavaScript weekday
numbers (Sunday 0 through Saturday 6) and local wall-clock `start` and `end` times in `HH:mm` form.
The policy governs **presentation only**: a suppressed notification is still recorded, so quiet hours
never cost a reader the history of what happened while they were quiet. Note what neither mode does —
warning and error records never auto-dismiss regardless of policy.

History filtering takes a `NotificationSearchQuery` (`shared/notifications.ts:136`) of optional
`text`, `severities`, `states` and `sources`. Omitting all four is not an error; it selects
everything.

## Notification history

Notifications have stable ids and one of five severities: information, progress, success, warning, or error. Active notifications have deterministic stacking order. Dismissing one removes it from the active stack but keeps it in history. Deleting one removes it from history and is a separate command.

Quiet hours suppress presentation according to the configured policy, not recording. Warning and error records never auto-dismiss. Every store mutation returns a receipt from the persistence adapter. An in-memory change whose persistence write was not observed is reported as partial rather than successful.

Notification actions are explicit references. Retry appears only when the operation receipt supplies a retry reference. Undo appears only when the receipt supplies a real inverse operation or a local history revision. Running Undo is another operation and must return its own receipt.

## Search, export, and bulk actions

History can be filtered by text, severity, state, and source. Export projection includes factual notification text, source, timestamps, operation receipt reference, and action labels without serializing executable callbacks or operation payloads.

Bulk dismissal, deletion, and read-state changes report every changed id and every skipped id with its reason. An empty selection or a selection containing no applicable record fails explicitly.

## Configuration

Everything here is per request rather than per installation, because these are contracts
rather than a settings screen. One request carries:

- **The operation type and its exact target**, plus a description of the affected data.
- **A stable idempotency key.** The coordinator refuses a duplicate submission while the
  same key is pending, so a double click and a programmatic re-entry are both refused
  rather than replayed. Retry for unfinished work needs a *distinct* key, which is what
  stops a retry repeating effects that already landed.
- **A deadline**, after which the runner's signal is aborted and a timeout receipt is
  returned rather than the request being left open.
- **Whether cancellation and retry are allowed**, each stated by the request. Cancellation
  is offered only where the request permits it, so no control appears that cannot act.

The notification history takes two settings of its own: a **quiet-hours policy**, which
suppresses presentation and never suppresses recording, and a **persistence adapter**,
whose receipt is what distinguishes a stored change from an in-memory one. Warning and
error records are not configurable to auto-dismiss; they never do.

## Failure modes and security

- Missing or malformed request identity, target details, affected-data descriptions, or timestamps are refused before dispatch.
- Duplicate in-flight idempotency keys are refused by the handler, including keyboard or programmatic re-entry.
- A runner exception becomes a failure receipt. It is never converted into success because the intended path was selected.
- A deadline aborts the runner signal and returns a timeout receipt when no terminal receipt arrived in time.
- Invalid, mismatched, or unobserved success receipts become failure receipts.
- Persistence receipt mismatch reports a partial notification mutation and keeps the live in-memory state visible.
- Payloads and affected-data descriptions must remain redacted. Receipts carry references and summaries, not credentials or private configuration values.

## Integration status

The shared contracts, renderer coordinator, receipt helpers, notification model, and durable store are implemented as integration foundations. They are not yet wired into the product shell, trusted process bridge, or control-plane operation dispatch. No screen should claim these behaviors are active until those seams return and render real receipts.

## Verification

This ultra-speed implementation did not run tests, type checks, builds, packaging, runtime interaction, or screen captures. Integration must add focused coverage for unavailable and disabled capabilities, duplicate submission, progress, cancellation, timeout, invalid success receipts, partial outcomes, idempotent replay, quiet hours, warning and error persistence, dismissal versus deletion, persistence mismatch, bulk results, retry, and receipt-backed Undo.

## Suggested articles

[Non-blocking notifications](non-blocking-notifications.md), [Long-operation progress](long-operation-progress.md), [In-context recovery](in-context-recovery.md), [Bulk actions](bulk-actions.md), and [Local version history](local-version-history.md).
