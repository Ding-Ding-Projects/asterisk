# Completeness matrix

The completeness matrix is the hand-written record of the product contracts that every user-facing surface must carry. It is independent from source discovery, so a feature or page that disappears from the code cannot disappear from the inventory at the same time.

## Behavior

`console/inventories/surface-completeness.json` uses schema version 2. It records 44 canonical features and 143 addressable surfaces: the desktop shell, login and setup routes, 32 desktop destinations, 17 desktop overlay states, six top-level site pages, 82 generated documentation routes, and the three browser-extension download states. Every surface has one row for every canonical feature.

Each row records the status (`absent`, `partial`, `implemented-unverified`, or `verified`), demo state, source provenance, sample-data declaration, implementation paths and symbols, registration paths and symbols, deterministic route, documentation, localization, persistence, focused checks, negative regression evidence, built-artifact interaction evidence, current-commit captures, and the design-parity tuple.

## Configuration

The canonical feature and requirement arrays are literal data in the matrix generator and checked-in JSON. The generator does not scan source files, infer routes, or infer features. The two surface registries point back to the canonical matrix and preserve exact implementation notes and symbols for the desktop and site surfaces. Converter and Ollama requirements remain present on every surface. There are no exemptions.

## Failure modes

The validator fails when a canonical feature, page, route, or row disappears; when a symbol is renamed or commented out; when a verified evidence commit is stale; when a required artifact is missing; when a route is supported only by prose; when a status claims success without all evidence; or when sample data is marked as provenance. Symbol matching uses exact declaration or registration boundaries, not substring presence.

## Security and privacy

The matrix contains paths, symbols, routes, statuses, and evidence references only. It contains no credentials, private user data, call content, personal vocabulary values, or captured PBX configuration. Evidence references are claims about artifacts, not artifacts themselves. A row cannot become verified by changing its status string.

## Verification

The focused validator is `console/scripts/verify-inventories.mjs`. The deliberate regression is `console/scripts/negative-surface-completeness.mjs`, with a companion evidence-claim regression in `console/scripts/negative-evidence-claims.mjs`. The current ultra-speed delivery boundary did not run these validators, tests, or captures, so all evidence that was not already present remains explicitly unverified. A later verification pass must run the validators against the exact integrated commit, observe every deliberate break turn red, restore the matrix, and observe green before changing any row to `verified`.

## Suggested articles

[Design parity](../../design/inventory.json), [Offline documentation browser](offline-documentation-browser.md), [Changelog viewer](changelog-viewer.md), [Status Hub](status-hub.md), [Platform feature index](README.md).
