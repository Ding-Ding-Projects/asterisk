# UI smoke evidence storage

The current source-only contract contains 17,127 rows: 5,486 checked-in control action cases × three language modes = 16,458 control rows, plus 669 route and equivalent proofs. It reconciles 940 executable control ids. Runtime evidence remains unrun.

Accepted per-click evidence is stored below one integrated commit directory:

```text
console/docs/evidence/ui-smoke/<integrated-commit>/
```

The directory is created only by `console/scripts/promote-ui-smoke-evidence.mjs` after the task-owned raw run root outside the repository has supplied every required before and after PNG, version-1 interaction, outcome, privacy, alt-text, pixel-review, and evidence receipt, plus each surface's labelled comparison PNG and visual-diff record. The promotion step compares source and destination SHA-256 values before marking a row accepted, stages transactionally, and refuses overwrite.

This directory intentionally contains no runtime captures in the source-only manifest lane. Raw bytes remain outside the repository until a later built-artifact evidence run promotes them.
