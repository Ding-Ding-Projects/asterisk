# Authenticator core

## Behavior

The authenticator core provides local TOTP registration and code verification using RFC 6238 over RFC 4226. It accepts SHA-1, SHA-256, or SHA-512, six through eight digits, and a positive period up to 86,400 seconds. Pairing data follows the standard `otpauth://totp/` shape so a local QR renderer can present it without a network request.

Registration validates bounded RFC 4648 base32 input, writes the secret directly to the operating-system credential vault, and returns only redacted metadata. An entry remains unarmed until the user confirms one current code. Current and next codes are generated in the privileged boundary, never by returning the stored secret to the renderer. The confirmation result never reveals or describes secret material.

## Configuration

The control-plane store receives a `CredentialVault` adapter, a durable metadata store, and a stable unique entry-identity source. Both stores must fail explicitly when unavailable. There is no in-memory or plaintext fallback. Persisted metadata contains issuer, account, algorithm, digit count, period, stable entry identity, vault reference, armed state, and timestamps, but never the secret. Returned entries omit the vault reference as well.

## Failure modes and security

Malformed registration, unsupported algorithms, out-of-range digits or periods, invalid base32, missing entries, unavailable vaults, and failed confirmation all return bounded, actionable error codes. Vault errors are passed through without secret values. Deleting an entry removes the vault record first and only then removes its metadata. Startup reconciliation preserves pending identifiers, reports `pending-vault-unavailable`, `pending-removal-failed`, or `unresolved-legacy` with affected IDs, and blocks authenticator mutations until the receipt is `reconciled`. An available-vault removal failure takes precedence over legacy warnings whenever a pending removal remains. The mounted Retry reconciliation action performs a fresh serialized authenticator-and-lock pass in the existing runtime after vault availability changes, atomically publishes the complete pair of refreshed receipts, and clears resolved pending identities from both durable journals. Failed removals retain their exact typed identities. If the local history receipt is unavailable after a successful authenticator mutation, the warning is published best-effort to the canonical Notification centre and never changes the already successful mutation result.

## Verification boundary

This lane was implemented without running tests, lint, type checks, builds, packaging, runtime interaction, or captures. RFC-vector verification and built-artifact wiring remain unverified until the owning lane runs its release checks.

## Suggested articles

[Built-in authenticator](../platform/built-in-authenticator.md), [Local version history](../platform/local-version-history.md), and [Security](../system/security.md).
