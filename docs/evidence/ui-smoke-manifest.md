# UI smoke evidence mapping

The final UI smoke plan is maintained in the platform article at [`console/docs/platform/ui-smoke-evidence.md`](../../console/docs/platform/ui-smoke-evidence.md). This short repository-level pointer exists so the evidence contract is discoverable from the documentation tree and from handoff review.

The source inventory names 44 features and 143 explicit surfaces. Its exact parser reconciles 940 unique design ids, 940 generated-runtime ids, 696 screen-model ids, 244 dynamic runtime ids, the prior 335-record subset, and the independent 479 and 467 design audit counts. The deterministic generator emits 17,127 rows: 5,486 real control action cases multiplied by three language modes yields 16,458 control rows, and explicit route and viewport proofs contribute 669 additional rows. Runtime evidence is not present in this change. Future accepted captures must be copied byte-for-byte from the task-owned hidden-desktop run root outside the repository into `console/docs/evidence/ui-smoke/<integrated-commit>/`, accompanied by version-1 interaction, outcome, privacy, alt-text, pixel-review, and evidence receipts, labelled comparisons, visual diffs, and an index mapping the repository docs, wiki, issue, and Pages article.

Asterisk admin-resource wiring, FreePBX parity, migration successor identities, migration, backup, local Git history, and configurable shared-instructions settings are pending implementation and are intentionally absent from these totals.

The source-only commands are:

```text
node console/scripts/generate-ui-smoke-manifest.mjs
node console/scripts/generate-lowlevel-smoke-plans.mjs
node console/scripts/generate-ui-smoke-contact-sheet.mjs --promotion-index <path> --output <path>
node console/scripts/promote-ui-smoke-evidence.mjs --raw-root <task-owned-run-root> --integrated-commit <sha> --source-commit <sha>
```

The commands above define future evidence production. They do not replace the required real built-artifact interaction and capture route.
