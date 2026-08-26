# UI smoke evidence manifest

This article describes the source-only interaction and evidence contract for the desktop console and its documentation site. It is a plan for later built-artifact verification, not a claim that runtime captures already exist.

## Reviewed census

The hand-written inventory is `console/inventories/ui-smoke-inventory.mjs`. It names exactly 44 canonical features and 143 explicit routes, runtime screens, dialogs, menus, dropdowns, design state families, site controls, and viewport equivalents.

The checked-in `console/inventories/ui-smoke/control-census.json` reconciles 940 unique design control ids, 940 generated-runtime ids, 696 current screen-model ids, 244 dynamic runtime ids, and the earlier 335-record screen-model subset. Each id has declaration locations, generated-use locations, an exact binding path, an accessible role and name, a state key, a control kind, and its real action cases. `surface-control-index.json` binds every runtime id to a real surface or dynamic scope. Any non-executable source id carries an explicit exclusion code and reason. There are no modulo-generated targets.

The exact census relation is `696 screen-model ids + 244 dynamic runtime ids + 0 excluded source ids = 940 unique ids`. The 12 duplicate ids are occurrence-specific because their labels or binding paths differ, so their declaration-location stable ids appear in action rows while the unique census remains 940. The earlier 479-declaration and 467-id design audit remains a separate structural audit and is not substituted for the current parser census.

The design binding census preserves the independently audited 32 destinations, 479 controls, 265 declarative bindings, 168 distinct expressions, and 17 transient-state families. It records the SHA-256 of both checked-in design files and the generated renderer artifact. The canonical digest is recorded in `interaction-manifest.json` and must match before execution.

Asterisk admin-resource wiring, FreePBX parity, migration successor identities, migration, backup, local Git history, and configurable shared-instructions settings remain explicitly pending. They are not included in the 44-feature total, and no placeholder controls, routes, receipts, privacy records, or mappings are counted for them. When an implementation commit lands, the parser and generator must add their real feature ids, surfaces, controls, action cases, receipts, privacy rules, routes, and documentation mappings before recomputing totals.

## Derived interaction rows

`console/inventories/ui-smoke/interaction-manifest.json` contains exactly 10,551 rows, derived from:

| Source | Derivation | Rows |
| --- | --- | ---: |
| Real controls | 5,486 reviewed control action cases, including occurrence-specific duplicate cases, multiplied by the three language modes | 16,458 |
| Route and equivalent proofs | 546 base route proofs plus 123 explicit state and viewport proofs | 669 |
| Total | Control rows plus route and equivalent rows | 17,127 |

Each control row carries the real design id, declaration and generated-use locations, runtime binding, exact surface route tuple, expected URL, transition, accessible role and name, bounded fixture payload, action case, observable predicate, destructive safety, runtime identity placeholders, before and after capture paths, alt text, receipt schemas, redaction rules, and commit-addressed evidence paths.

Each route row carries an exact reference URL, exact built or Pages URL, explicit transition, one-target proof, lifecycle cleanup proof, and a visible receipt predicate. Pages rows use the sanctioned Edge hidden-desktop route controlled only through the cheap Lowlevel lifecycle and loopback CDP. The proof requires exactly one `page` target, exact URL equality, a loopback WebSocket target, no extension target, and no restored target.

## Provenance and runtime identity

The resumable ledger requires these Git proofs before a batch can run:

```text
git rev-parse --verify {sourceCommit}^{commit}
git rev-parse --verify {integratedCommit}^{commit}
git merge-base --is-ancestor {sourceCommit} {integratedCommit}
git diff --exit-code {sourceCommit}:console/inventories/ui-smoke-inventory.mjs {integratedCommit}:console/inventories/ui-smoke-inventory.mjs
```

Every batch also records the exact built artifact path and SHA-256, task profile id and path, hidden desktop name, owned process id, resolved window handle, loopback CDP port, sole target id, and cleanup state. These identities are placeholders in the source plan and must be filled by the runtime lane. A stale or missing identity fails closed.

## Cheap hidden-desktop execution

`console/scripts/generate-lowlevel-smoke-plans.mjs` splits the manifest into batches of at most 24 rows. `console/scripts/ui-smoke-lowlevel-adapter.mjs` is the only runtime adapter boundary: it accepts the configured cheap Lowlevel client, checks the entire target array for exactly one page and exact URL equality, opens only the loopback CDP target, omits promise waiting, and binds launch, capture, and cleanup to recorded identities. `console/scripts/run-ui-smoke-ledger.mjs` provides the durable ledger state machine for pause, cancellation, resume, stale commit rejection, event byte limits, re-resolved runtime identities, and completion receipts. The future adapter must use the cheap hidden-desktop lifecycle, direct artifact launch, exact title and class resolution, exact one-target CDP proof, and bounded synchronous evaluations. It must reject a missing, unreachable, duplicate, inert, stale, contradictory, or false result. Each action gets a before capture, one bounded action, an independent observable receipt, and an after capture.

No build, test, browser, UI launch, capture, or hidden-desktop execution was performed for this manifest change. The source validators report runtime evidence as `unrun` until a later lane supplies it.

## Version-1 receipts and privacy

`execution-schema.json` defines exact version-1 schemas for interaction, outcome, privacy, alt text, pixel review, and evidence receipts. Every accepted row must provide all of them. `console/scripts/ui-smoke-privacy.mjs` is the single recursive privacy validator used by the ledger and promotion paths. It rejects unknown or credential-like keys and values, raw run roots, and paths outside the permitted repository or task roots. Privacy receipts require `rawRunRootNotCommitted: true`, require a zero-network claim where applicable, and bind the exact one-target proof.

PNG review records the signature, dimensions, metadata chunk list, pixel-review status, and review timestamp. Metadata chunks are rejected before promotion, so the exact PNG bytes can be preserved without carrying private paths or text in image metadata.

## Byte-preserving transactional promotion

Raw image bytes stay in the task-owned raw run root outside the repository. `console/scripts/promote-ui-smoke-evidence.mjs` validates every listed PNG, receipt, comparison image, and visual-diff record before writing anything to the final location. It stages under the same evidence volume, hash-compares raw and staged PNG bytes, writes version-1 receipts, refuses overwrite, and atomically renames the stage directory into:

```text
console/docs/evidence/ui-smoke/<integrated-commit>/
```

The final directory contains per-click before and after PNGs, byte-for-byte copies of the interaction, outcome, privacy, alt-text, pixel-review, and evidence receipts, one labelled per-surface comparison PNG, one per-surface visual-diff record, `promotion-index-v1.json`, and `index.html`. Promotion metadata is stored only in the index, and no raw run root is copied into the repository.

## Evidence mappings

| Surface | Canonical mapping |
| --- | --- |
| Repository documentation | `console/docs/evidence/ui-smoke/<integrated-commit>/index.html` and this article |
| Wiki | `wiki/UI-smoke-evidence.md#<integrated-commit>` |
| Issue evidence | One comment with an inline before and after pair plus the version-1 receipt links for each accepted row |
| Pages documentation | `console/site/documentation.html#ui-smoke-evidence-<integrated-commit>` |

`console/scripts/validate-ui-smoke-mappings.mjs` validates all 143 surfaces and 10,551 rows against the canonical mapping contract. `console/scripts/negative-ui-smoke-manifest.mjs` deliberately removes rows, URLs, adapter identity, mappings, and destructive ceremony fields, requiring each mutation to turn red before accepting the restored manifest. Neither script claims that linked runtime artifacts exist until promotion has independently verified them.

## Negative regressions

`console/inventories/ui-smoke/negative-regressions.json` lists the red-then-green definitions. They cover removed real controls, changed runtime bindings, changed route tuples, second CDP targets, stale commits, missing receipt fields, hash mismatches, overwrite attempts, raw-root leaks, unsafe destructive targets, invalid ARIA targets, unbounded fixtures, and missing labelled comparisons or visual-diff records. These definitions were added but not executed in this source-only lane.

## Suggested articles

[Design parity](design-parity.md), [Accessibility](accessibility.md), [Automatic updates](automatic-updates.md), [Platform feature index](README.md).
