# Forge publishing

The History screen contains a desktop forge-publishing surface. It publishes a local source through a chosen provider account and owner, with a fork route where the provider supports it and a copy-and-push route that does not depend on forking.

## Behavior

The surface is backed by the control plane, not by renderer-only state. Refresh discovers signed-in GitHub accounts from the local `gh` sign-in store. Each row shows the provider login, an account id, a provider-supplied vault reference when one is actually returned, active state, refresh, sign-out, and re-authentication status. The renderer never receives a token value. Account activation runs `gh auth switch`, then confirms the provider reports that same login as active.

Selecting an account activates it through `gh auth switch`, then owner discovery reads the personal owner and paginated organization owners through `gh api`. The owner picker contains only values returned by the provider. It never guesses a personal namespace or accepts an arbitrary organization name.

The two publication routes are intentionally distinct, and both require the owner to have the capability the route needs:

- **Fork** invokes `gh repo fork` against the selected HTTPS source remote, including the selected destination name. Organization forks carry the selected organization explicitly. A personal fork uses the provider account that is active in the local sign-in store.
- **Copy and push** creates the selected destination with `gh repo create`, checks the local `forge-publish` remote, refuses to overwrite an unrelated remote, sets and rereads exactly one effective push URL, pushes the selected local `HEAD` directly to that validated URL, then verifies that exact commit with `git ls-remote --heads`.

Every process call uses typed executable and argument arrays, `shell: false`, bounded output, a deadline, and cleared inherited authentication variables. A publication receipt records the provider, account id, owner id, route, destination URL, source commit when available, exact outcome, and timestamp. Failed, partial, and cancelled creation, push, verification, sign-in, and sign-out outcomes remain receipts and are reloaded after restart rather than being replaced by a blank state.

## Configuration

The durable file is `forge-publishing.json` under the application's private data folder. It contains schema version 1, account metadata, the active account id, and redacted publication receipts. It contains no token, password, cookie, private key, or invented vault key. A provider vault reference is displayed only when the provider actually supplies one. Account mutation and publication receipts are also recorded through the app's local append-only history.

The packaged desktop contract bundles and verifies the pinned GitHub CLI executable and the ConPTY helper. The helper is the default route. A direct HTTP device flow is permitted only for a client id that is compiled into an explicit immutable allowlist, never for an environment value or renderer input. The helper drives `gh auth login --web` through a native pseudo-terminal with a bounded asynchronous read loop, a no-op browser command, independent deadline, session id, operation id, monotonic revision, atomic state writes, and a truthful expiry. It surfaces only the public verification URL and user code after stripping terminal control bytes, then proves that a newly installed account, not a pre-existing account, is active in keyring storage. Plaintext credential fallback is refused. The exact no-token `gh` keyring-status fixture is pinned at `control-plane/fixtures/gh-keyring-status.json`. The dependency manifest carries separate archive and extracted-file digests, and bootstrap refuses extraction until both are present and verified. The archive digest is pinned to the independently corroborated release hash.

**Desktop application:** Not implemented. The desktop application administers a telephony exchange and has no source-repository publishing feature.

**Documentation website:** Implemented as a browser-mediated flow at `history.html`. The visitor chooses account mode, owner, repository, and copy or fork route; the provider handles authentication and publication, and this page stores no credentials or publication claim.
The source-folder field has a native folder picker. The account search is plain text by default and has an adjacent anchored full regex builder with bounded pattern length, flags, guided tokens, validation, and match counts. The provider capability list distinguishes GitHub, which currently supports both routes, from GitLab, which remains visible but unavailable until a local CLI and OS-vault adapter are configured. The active operation exposes busy, progress, cancellation, and completion state.

## Failure modes

No signed-in provider account returns a re-authentication state beside the account surface. An expired or missing account returns the same state without clearing the retained account metadata. A failed `gh auth switch`, owner read, repository create, remote add, or push carries its exact bounded process reason in the receipt.

If `forge-publish` already points at a different destination, copy and push stops before changing the remote. If the source commit cannot be read, or the source path is not absolute, publication stops before creating a destination. If fork succeeds but a later provider confirmation is absent, the receipt stays failed or partial and never claims that a complete copy exists.

GitLab is not silently routed through a GitHub command. It remains an explicit unavailable capability until its provider adapter exists.

Hosted server mode refuses every `forge.*` action by name and disables the hosted controls because it cannot safely use the desktop's local provider sign-in store or local checkout. The desktop Add account and Re-authenticate actions surface the user code and verification URL in the History screen, poll with bounded deadlines and operation ids, and install the approved credential through the bundled ConPTY route or the explicitly allowlisted direct HTTP route using stdin only. No uncontrolled browser is opened. A timeout, interruption, cancellation, stale state read, or unproven process identity remains partial or unknown-side-effect as appropriate, never a guessed success.

## Security and privacy

The renderer accepts account names and owner ids, never provider tokens. Durable state stores only provider-supplied vault references when present. `gh` is accepted only after it reports `keyring` storage, while plaintext credential fallback is refused. `git` uses the configured credential helper after inherited auth variables are cleared. No token is placed in arguments, output, logs, renderer state, receipts, local history, exports, or documentation. The executor allowlist contains only the typed `git` and `gh` executables needed by this surface, and all calls use `shell: false`.

## Verification

This lane did not call provider APIs, run broad Chuts, lint, build the product, package an installer, launch the desktop surface, or capture a HuiShot. Static evidence is the typed action union, the dispatcher branches, the allowlisted executor calls, the pinned dependency records with separate archive and extracted-artifact digest checks, package-resource verification hooks, the asynchronous and overlapped ConPTY helper with exact handle ownership cleanup, inherited-auth clearing path, no-op browser command, exact device URL parser, newly-installed-account proof, same-account provider identity and credential-state proof, active-account confirmation, `git ls-remote` verification path, hosted refusal and disabled controls, generated History-screen route, atomic versioned state store, reloadable receipts, and updated feature registry. The narrow focused validators are `node scripts/check-forge-keyring-fixture.mjs`, `node scripts/check-forge-digest-manifest.mjs`, and the build hook `npm run check:forge-contracts`. Runtime provider verification remains unrun and must be performed by the parent lane through the approved desktop evidence path.

## Suggested articles

[External editor handoff](external-editor-handoff.md), [Local version history](local-version-history.md), [Complete exports](complete-exports.md), [Security](../system/security.md), [Platform feature index](README.md).
