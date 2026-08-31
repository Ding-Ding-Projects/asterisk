# Design parity schema-v2 capture plan

This runbook is for the final integrated candidate. It deliberately keeps the reference and
built captures tied to one candidate commit, one tuple, and one generated manifest. It does not
permit a capture from an earlier renderer to be presented as current evidence.

## Contract inputs

The inventory opts into schema v2 with `schemaVersion: 2` or
`captureContract.evidenceSchemaVersion: 2`. Its `captureContract.captureTuple` is the single
tuple used by both routes. When the screen text varies by locale, include `locale` in that tuple.
The inventory also records `captureContract.sourceCommit`, and the capture and audit writers copy
that exact commit into each run ledger and derived JSON record.

The generated manifest carries `state` and `tuple` per destination. The hand-written
`transientStateFamilies` list is checked against those manifest entries. A missing family is a
hard failure, not a silently skipped capture.

## Final candidate sequence

Run these commands from `console/` after the integrated candidate is pinned and the build output
is current:

```powershell
git fetch origin
npm ci
npm run build
npx tsx scripts/generate-design-parity-labels.mjs
node scripts/generate-design-parity-capture-manifest.mjs
node scripts/design-parity-evidence-on-disk.mjs
```

The evidence guard is expected to report zero verified rows until the candidate has real captures
and audits. That is an honest state, not a failure of the guard.

Start the dedicated design-reference harness and the packaged desktop build on separate named
hidden desktops using the required Lowlevel headless route. Resolve each target again by its exact
page type, URL, title, class, and non-zero dimensions. Do not reuse a process, window handle,
debugging target, or profile from an earlier run.

With the reference harness debugging port available, run:

```powershell
node scripts/design-parity-capture-run.mjs --side=reference --port=<reference-port> --server-port=<capture-server-port>
```

With the real packaged desktop debugging port available, run:

```powershell
node scripts/design-parity-capture-run.mjs --side=built --port=<built-port>
```

Then derive the whole-frame comparison and the chrome comparison from the two immutable raw
capture sets:

```powershell
node scripts/design-parity-capture-run.mjs --side=diff
node scripts/design-parity-capture-run.mjs --side=chrome
npx tsx scripts/audit-design-parity-material.mjs
node scripts/design-parity-captures-on-disk.mjs
node scripts/design-parity-evidence-on-disk.mjs
```

Every run ledger and every derived record must carry the candidate commit, generator identity,
and exact tuple. The capture guard validates raw PNG byte counts and SHA-256 values against its
run ledgers. The evidence guard validates destination identity, tuple equality, source-commit
binding, region-mask agreement, chrome verdict, staleness, and the Material Design 3 audit.

## Transient states

Transient-state captures are a second matrix, not a reason to overwrite the stable default-state
captures. For each family in `transientStateFamilies`, add an explicit manifest entry with the
same destination, state, theme, viewport, scale, locale, fixture revision, and source commit on
both sides. Use the same capture runner and retain raw PNGs, labelled comparisons, and diff
records under a state-qualified path. Run the same on-disk and evidence guards after each batch.

The current branch contains the strict coverage helper and the v2 contract tests. The integrated
renderer lane must provide the final state-qualified manifest and real built captures before any
row can be promoted to `verified`.

## Required red and green proof

Run the committed negative checks after the final candidate is quiet:

```powershell
node scripts/negative-design-parity-evidence.mjs
node scripts/negative-design-parity-captures.mjs
node scripts/negative-design-parity-material.mjs
node --test tests/contracts/design-parity-contract-v2.test.mjs
```

The negative cases must remove one exact tuple field, source commit, route, raw capture, derived
record, region mask, Material Design 3 audit, or transient state family at a time. Each case must
turn red for its named omission, then the restored fixture must turn green. A list derived only
from currently present entries is not sufficient because a disappeared screen or state would
disappear from the check as well.

## Current-lane boundary

This parity lane does not run final built captures against the stale renderer. It prepares the
strict contract, generators, guards, and exact commands for the integrated candidate. Remaining
visual findings must be measured again after the renderer lane lands, because the committed
baseline still reports real chrome differences and nonconforming Material Design 3 declarations.
