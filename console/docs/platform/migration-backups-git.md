# Migration, verified backups, and local Git management

The History & git destination now provides one local-first route for moving the console's non-secret state and preserving recovery points. An export is a directory containing a versioned `manifest.json`, copied non-secret records, and `history.bundle`. The history repository is represented only by that Git bundle, never by a loose `.git` directory.

## What moves

The manifest records every copied file with its byte count and SHA-256 digest. Settings, server inventory, notification records, tabs, groups, appearance state, documents, local history metadata, and generated local artifacts are eligible when they exist in the installation data directory. The bundle also records every owned Git ref and is verified with `git bundle verify` before the export is reported ready.

The manifest always lists machine-readable omissions for credential-vault secrets, TOTP/password/PIN data, private vocabulary, source paths, transient caches, and unsafe or unsupported records. Omitted values are not replaced with guesses.

## Import safety

Import validates the schema version, duplicate-key rejection, depth and path limits, regular-file and reparse-point status, byte limits, every SHA-256 digest, and the Git bundle. The source may be a manifest file or its export directory. The bundle is cloned into a temporary directory and checked with `git fsck` before it can replace the local history. A two-key destructive confirmation is required, and a verified backup is created before live state is switched. The switch uses a staged directory and restores the previous directory if the final rename fails.

## Backups and partial outcomes

Manual backups use the same manifest and bundle format under the private application data directory. Each operation writes a durable record with state, item count, bytes, and exact detail. Cancelled, failed, partial, and unverified outcomes remain visible rather than becoming a green summary. Backup retention is reported in the manifest and the backup index, and transient caches are intentionally rebuilt.

Backup creation returns an operation identifier before copying begins, so the cancel action can reach the active process. Startup inspects any interrupted swap journal, restores the prior tree when the old tree was moved but the incoming tree was not installed, and retains both trees when the incoming tree had already become live. Retained trees are indexed for later review rather than silently discarded.

Retained import trees carry `kind: retained-import-tree`. They are inventory-only recovery records, never treated as verified backups, never removed by ordinary retention pruning, and remain available for a later explicit recovery or export decision.

Pruning is a two-stage operation. A preview creates a short-lived, opaque token that freezes the selected paths, retention value, and backup-index revision. The service refuses a missing, blank, unknown, expired, selection-mismatched, or revision-stale token before it enumerates candidates or removes a path. This prevents a later confirmation from silently acting on a different set than the one reviewed.

## Local Git management

The screen lists the local branch, exact refs, clean state, ahead/behind counts, divergence, configured remotes, and redacted fetch/push receipts. Remote and target-branch pickers use observed values, and counts stay explicitly unverified until both are selected and the comparison succeeds. Fetch and push each receive an operation identifier before the Git process starts, so cancellation and terminal receipts remain durable. Remote names are bounded. URLs may be HTTPS, SSH, or an absolute local bare-repository path, but may not contain credentials, query data, fragments, whitespace, or unsupported protocols. A blank optional push URL explicitly clears a previously configured custom push URL, then readback confirms that the effective push URL falls back to the validated fetch URL. Fetch and push use structured Git arguments. Push is explicit and normal only: there is no checkout, switch, rebase, reset, force push, or silent URL rewrite. A divergence or authentication failure is recorded with its exact status and recovery detail.

## Verification boundary

The narrow verification for this feature is design compilation plus schema and syntax checks. No built-artifact UI capture exists yet. A packaged-artifact interaction, real import, real remote fetch, and real remote push remain runtime evidence to collect before the feature can be called fully verified.

Suggested articles: [Local version history](local-version-history.md), [Complete data export](complete-exports.md), [Destructive-action super confirmation](destructive-action-confirmation.md), and [In-context failure recovery](in-context-recovery.md).
