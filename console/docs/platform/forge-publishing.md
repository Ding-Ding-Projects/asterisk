# Forge publishing

The History screen contains a desktop forge-publishing surface. It publishes a local source through a chosen provider account and owner, with a fork route where the provider supports it and a copy-and-push route that does not depend on forking.

## Behavior

The surface is backed by the control plane, not by renderer-only state. Refresh discovers signed-in GitHub accounts from the local `gh` sign-in store. Each row shows the provider login, an account id, a stable `gh://` vault reference, active state, refresh, sign-out, and re-authentication status. The renderer never receives a token value.

Selecting an account activates it through `gh auth switch`, then owner discovery reads the personal owner and paginated organization owners through `gh api`. The owner picker contains only values returned by the provider. It never guesses a personal namespace or accepts an arbitrary organization name.

The two publication routes are intentionally distinct:

- **Fork** invokes `gh repo fork` against the selected HTTPS source remote. Organization forks carry the selected organization explicitly. A personal fork uses the provider account that is active in the local sign-in store.
- **Copy and push** creates the selected destination with `gh repo create`, checks the local `forge-publish` remote, refuses to overwrite an unrelated remote, then pushes the selected local `HEAD` to the chosen default branch with `git`.

Every process call uses typed executable and argument arrays, `shell: false`, bounded output, and a deadline. A publication receipt records the provider, account id, owner id, route, destination URL, source commit when available, exact outcome, and timestamp. Partial creation or push outcomes remain receipts and are not reported as success.

## Configuration

The durable file is `forge-publishing.json` under the application's private data folder. It contains schema version 1, account metadata, the active account id, and redacted publication receipts. It contains no token, password, cookie, or private key. Account mutation and publication receipts are also recorded through the app's local append-only history.

The source-folder field has a native folder picker. The account search is plain text by default and has an adjacent anchored regex builder. The provider capability list distinguishes GitHub, which currently supports both routes, from GitLab, which remains visible but unavailable until a local CLI and OS-vault adapter are configured.

## Failure modes

No signed-in provider account returns a re-authentication state beside the account surface. An expired or missing account returns the same state without clearing the retained account metadata. A failed `gh auth switch`, owner read, repository create, remote add, or push carries its exact bounded process reason in the receipt.

If `forge-publish` already points at a different destination, copy and push stops before changing the remote. If the source commit cannot be read, or the source path is not absolute, publication stops before creating a destination. If fork succeeds but a later provider confirmation is absent, the receipt stays failed or partial and never claims that a complete copy exists.

GitLab is not silently routed through a GitHub command. It remains an explicit unavailable capability until its provider adapter exists.

## Security and privacy

The renderer accepts account names and owner ids, never provider tokens. Durable state stores only stable vault references. `gh` uses its own operating-system credential store, while `git` uses the configured credential helper. No token is placed in arguments, output, logs, renderer state, receipts, local history, exports, or documentation. The executor allowlist contains only the typed `git` and `gh` executables needed by this surface, and all calls use `shell: false`.

## Verification

This lane did not call provider APIs, run tests, lint, build the product, package an installer, launch the desktop surface, or capture a screenshot. Static evidence is the typed action union, the dispatcher branches, the allowlisted executor calls, the generated History-screen route, the atomic state store, and the updated feature registry. Runtime provider verification remains unrun and must be performed by the parent lane through the approved desktop evidence path.

## Suggested articles

[External editor handoff](external-editor-handoff.md), [Local version history](local-version-history.md), [Complete exports](complete-exports.md), [Security](../system/security.md), [Platform feature index](README.md).
