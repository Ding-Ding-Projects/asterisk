# Toy lock, unlock ladder, and local-history core

## Behavior

The core models each toy lock as one stable element identity with one independent credential-vault
reference and one unlock duration. A matching value may open only that element for the current
surface, a bounded number of minutes, or the current application session. Relocking removes the
temporary grant without changing the credential reference.

The unlock ladder is a privileged, server-graded state machine for toy-lock waits. Failed verification creates an authoritative wait for the exact lock, and a challenge response may clear that wait only. It never clears a credential, restores sign-in attempts, or grants authentication. Challenges use single-use nonces, expire, consume a rolling-hour success budget, reject a mole round submitted before its duration, and count each visible mole spawn at most once.
When School mode is active, a new lockout begins with arithmetic and does not expose a dish rung.

Local history stores one immutable encrypted entry file per revision in an isolated local Git
repository. Restore opens the selected encrypted snapshot in memory, reseals it, and appends a new
revision. It never checks old plaintext into the working tree and never rewrites an existing commit.

## Configuration and integration

The toy-lock store requires two runtime adapters:

1. A metadata persistence adapter that stores only stable lock records and vault references.
2. An operating-system credential-vault adapter that owns verification and credential removal.

The unlock ladder requires a privileged clock, a bounded random source for challenge content, and a
cryptographically strong unique nonce source. It also requires a durable privileged state store for
lockout progression and rolling-hour success timestamps. If that store is unavailable, only the
ordinary clock remains. The public challenge model does not contain expected answers.

The history store requires an executor that explicitly allows the `git` executable and a snapshot
protector backed by a key reference in the operating-system credential vault. The mounted desktop
dispatcher supplies both and returns an explicit typed unavailable result when either cannot be used.
There is no plaintext or memory-only fallback.

## Failure modes

- If lock metadata cannot be read or written, the store does not assume a lock state and reports the
  persistence failure.
- If the credential vault is unavailable, lock creation, verification, removal, and history
  snapshot work remain unavailable. Existing metadata is not silently deleted.
- Reconciliation preserves legacy pending IDs that have no surviving vault reference and reports
  the exact affected IDs. An available-vault removal failure is `pending-removal-failed`, not a
  successful reconciliation; lock mutations remain blocked until the pending removal is resolved.
- Removal receipts distinguish `pending`, `rolledBack`, and `recoverable` outcomes. A rollback or
  pending journal is never reported as `removed`.
- Every lock removal path, including reconciliation blocking and a bridge failure, returns a
  `ToyLockRemovalReceipt`. A reconciliation-blocked removal carries the structured `affectedIds`
  field and the full typed reconciliation receipt, so callers never infer identities by parsing
  display text. The mounted lock surface exposes a bounded Retry reconciliation action, and create,
  unlock, relock, and removal mutations remain unavailable until reconciliation is explicitly
  `reconciled`.
- If a history snapshot cannot be encrypted, no plaintext file is written and the live operation
  may continue with a separate history warning.
- If an encrypted revision cannot be opened, restore leaves the live record unchanged.
- If Git is not allowlisted, local-history initialization reports that exact missing integration
  instead of claiming a revision was recorded.
- A lost toy-lock credential is recovered by opening the application-data folder and letting the
  user delete it themselves. The recovery route never deletes data automatically.

## Security and privacy

Credential material is represented as short-lived bytes only at the vault boundary. The store
zeroes verification input after use and persists only an opaque vault account reference. History
entry files contain redacted metadata and authenticated encrypted snapshots. Plaintext snapshots,
credential values, QR payloads, and one-time codes are not written to Git, logs, exports, captures,
or documentation.

Toy locks are personal speed bumps. They are not encryption and do not protect data from another
person with access to the computer.

## Verification state

This ultra-speed implementation pass intentionally did not run tests, lint, type checks, builds,
packaging, runtime interaction, or screen captures. The files are integration-ready foundations,
not evidence that the currently generated interface is connected to them. The mounted dispatcher
still needs a reviewed Git executor and snapshot protector, and the generated interface still needs
reviewed actions that use these stores.

## Suggested articles

- [Authenticator core](authenticator-core.md)
- [Built-in authenticator](../platform/built-in-authenticator.md)
- [Per-element toy locks](../platform/per-element-toy-locks.md)
- [Unlock ladder](../platform/unlock-ladder.md)
- [Local version history](../platform/local-version-history.md)
