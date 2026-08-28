# The site's half of the per-surface inventory could not be validated at all

`console/site/feature-registry.json` is one of the two feature registries the per-surface
completeness inventory rests on. The desktop one, `console/app/feature-registry.json`, is
schema v2. The site one was schema v1, and every reader in the tree had already moved.

That is not a stylistic difference. Four things were true at once, and each hid the others.

## What was actually wrong

**One: the validator refused the file outright, and stopped before everything behind it.**
[`scripts/inventory-validation.mjs`](../../scripts/inventory-validation.mjs) line 124 opens with
`if (data?.schemaVersion !== 2) throw`. The committed file said `1`. So
`scripts/verify-inventories.mjs` — the whole `test:inventories` chain's first step — printed
`FAIL: pages-site feature registry: schemaVersion 2 required` and returned. Every check after
that point had not run in a long time, and nothing said so.

**Two: the status vocabulary was not the canonical one.** The canonical set is exactly
`absent`, `partial`, `implemented-unverified`, `verified`. Twenty of the site's forty-four rows
carried `implemented`, which is not one of them. It reads as a stronger claim than
`implemented-unverified` and is precisely the claim the evidence does not support: those
features are built, and no running browser has been driven over any of them.

**Three: thirty-three site contract tests were comparing `undefined` against a real value.**
The registry keys its status as `state`; twenty-seven of the tests read `.status`, and the rest
read `.status` off a nested row. Every one of them failed with `+ undefined - 'partial'`. They
were not badly written — they were written against schema v2, which is what the rest of the
tree uses. Five *newer* tests had been written against the v1 shape instead
(`row.state`, `row.files`), so the two halves of the same directory disagreed about the shape of
the same file.

**Four, and worst: the generator that produces the file had gone six features stale.**
[`scripts/generate-completeness-matrix.mjs`](../../scripts/generate-completeness-matrix.mjs)
writes both registries *and* the canonical matrix from hand-written tables inside it. Its
`siteStatus` table still recorded `responsive-sizing`, `guided-forms`,
`built-in-authenticator`, `context-menu-shortcuts`, `long-operation-progress` and
`in-context-recovery` as `absent` — each of them days after its own pass had built the feature
and written a note into the registry describing what it had built. Running the generator would
have reverted all six, and the six site surfaces of the canonical matrix already carried the
stale values, because they come from the same table.

That last one is the shape worth naming: **a producer nobody re-runs is a producer nobody
notices going stale.** The registry was being maintained by hand, and the generator that claims
to own it was drifting further away with every pass, invisibly, because the only way to see the
difference was to run it and read a three-thousand-line diff.

## What this pass changed

- `site/feature-registry.json` is schema v2, surface `pages-site`, and every row carries the
  canonical status vocabulary. The honest position is unchanged in substance: **20
  `implemented-unverified`, 11 `partial`, 13 `absent`** — the same twenty, eleven and thirteen
  features the hand-maintained file recorded, with `implemented` renamed to the canonical
  `implemented-unverified` that says the same thing about the code and one more thing about the
  evidence. Every row's hand-written note is preserved verbatim.
- The generator's `siteStatus` table is corrected for those six features, so the matrix's six
  `site-*` surfaces and the registry now agree on all 264 rows.
- The generator has a `--check` mode. It re-derives every artifact and compares, rather than
  overwriting, so drift is a failing check instead of something you would have to go looking
  for. It compares with line endings normalised, because this checkout is CRLF on disk and the
  generator emits LF, and comparing raw bytes would fail on every Windows checkout for a reason
  that has nothing to do with drift.
- The generator takes `--root=<dir>`, so a guard can point it at a copy of the tree.
- Five contract tests that had been written against the v1 shape are moved to v2.
- Ten `scripts/negative-*-site.mjs` break anchors are re-targeted, because the registry's byte
  shape moved under them. Every one was found by those scripts' own did-the-bytes-change check
  reporting a `FAILED CASE` rather than letting a break that never landed read as a guard that
  held. Two of the ten needed more than an indentation change: the three-file path list
  `site/app.js`, `site/settings.html`, `site/styles.css` is no longer unique across the file, so
  one anchor is now tied to the tail of its own row's note.

## The guard

[`tests/contracts/site-registry-matrix-parity.test.mjs`](../../tests/contracts/site-registry-matrix-parity.test.mjs)
asserts all four of the things that were wrong, so none of them can come back alone: schema v2;
the canonical vocabulary, hand-written in the test rather than read out of the file it polices;
no `state` or `files` key returning beside `status` and `implementation.paths`; and exact
agreement between the registry and all six site surfaces of the canonical matrix. It also runs
the generator's `--check`.

[`scripts/negative-site-registry-parity.mjs`](../../scripts/negative-site-registry-parity.mjs)
plants nine breaks on disk, one at a time, and every one turns that guard red and green again on
restore. Unchaining the script from `test:inventories` was also broken on purpose, and
`tests/scripts/test-suites-are-wired.test.mjs` named it.

**Two of those nine stayed green on the first run, and both were this pass's own guard.**
Neutering `--check` so it never reports drift, and making it find drift and pass anyway, both
left the guard green — because the guard read `--check`'s `PASS` line, and a check that cannot
fail prints exactly the same `PASS` line. The repair is the `--root=<dir>` option: the guard now
copies the three artifacts into a scratch tree, changes one byte, and requires
`--check --root=<copy>` to fail *and to name the file that drifted*. Both breaks turn it red
now. A check whose own failure path has never been exercised is decoration, and reading its
success line is not exercising it.

## One further defect this exposed, in a neighbouring contract

With the site contract suite red, `scripts/negative-changelog-site.mjs` could never start: its
first act is to confirm the untouched contract test is green, and it was not. So its fifty-one
planted breaks had not run. With the suite green, fifty of the fifty-one turn the changelog
contract red — and one did not.

The break computes the export's date range from the whole history rather than from the rows
being exported, so a filtered export claims a range it does not cover. The assertion written for
it narrowed to one real entry and compared that row's `exportedRange` against the entry's own
date. **Every release in the generated changelog bundle is dated `2026-08-26` — one distinct
date across the whole file** — so `changelogRangeLabel` collapses to its `first === last` branch
and returns that single date, which is the exact string the narrowed row was being checked
against. The assertion compared two strings that were equal whatever the code did.

The narrowed set is synthetic now, with two dates (`1999-01-02`, `1999-03-04`) that the test
first asserts do not occur in the real history, so the expected label is unreachable unless the
range really is derived from the rows being exported. All fifty-one breaks turn it red now.

## What this does not claim

Nothing here was driven in a browser, and no inventory row moved to `verified`. The position on
the 88-row inventory is unchanged: **4 of 88**. Twenty site features are `implemented-unverified`
precisely because the two artifacts that need a running program — a built-artifact interaction
record and a capture — do not exist for any of them.

**And `npm test` is still red on `master` for a reason this pass did not repair.** With the
registry failure out of the way, `scripts/verify-inventories.mjs` reaches its attention-modes
wiring check, and that check fails. The cause is structural rather than local:
`console/app/renderer/src/App.tsx` exists in two lineages in this history, one of about 2,600
lines carrying the attention runtime instrumentation and one of about 9,200 lines carrying the
PBX feature set, and the integration merges have flipped between them. The current file is the
9,179-line one; `console/app/renderer/src/attention-inventory.ts` survives from the other, and
describes seams — `onUserMutation`, twelve mutation-action tuples, exact producer line numbers —
that the current `App.tsx` has never contained. All four attention verifiers fail against it.

One row of that inventory *was* repairable and is repaired here, because its implementation
genuinely ships and its record was simply describing the wrong thing. See
[the attention inventory note](#the-one-attention-row-that-was-repairable) below.

## The one attention row that was repairable

`ATTENTION_WIRING`'s `next-action` row claimed a design control `ctl('att_next','Current next
action','text','')`, an `App.ATTENTION_CONTROLS` entry beside the five modes, an
`onUserMutation` writer, and a consumer writing `Next action: ...` into an element's
`textContent`. Eight of its ten markers matched nothing, and a search of the whole history shows
`att_next` has never appeared in `design/Asterisk Console M3.dc.html` in any commit. The design
draws five attention controls, all switches.

What actually ships is the attention rail's own text input, built in `attentionOverlay()` in
`App.tsx`, bound to `nextAction(storage)` and `setNextAction(...)`, and exercised by
`tests/ui/attention-modes-wired.test.tsx`. That is what the canonical requirement asks for — the
chosen action visible where the work happens rather than parked on a settings page. The design's
contribution is the sentence under the `att_one` switch that states the requirement, and that
sentence is the row's design marker.

**The first attempt at this repair produced a row that was a copy of its neighbour, and only
breaking it found that out.** The obvious seams to name were the rail's rendering — the
`attn-rail-next` div, `value: nextAction(storage)`, `setNextAction(storage, event.target.value)`
and `showNextAction: modeEnabled(storage, 'oneThing')`. All four are already named by the
`one-thing` row above, because they are what its switch turns on. Removing any of them one at a
time raised `one-thing`'s error, not `next-action`'s: the sixth row was watching nothing of its
own, and every marker still occurred exactly once, so nothing about reading it would have shown
that. What the row names now is the value's own storage seam, which no other row touches: the
control that carries it, its durable key, its bounded writer and its `removeItem` branch, the
setter, the reader, and the `NEXT_ACTION_MAX_LENGTH` clamp that bounds what a hand-edited store
can put on screen.

Each of the nine markers was then removed alone and the check's error read back: all nine name
`next-action`, and the baseline error returns on every restore. The proof cannot use the whole
function as a green/red oracle, because its last step is the mutation-action check that fails for
the lineage reason above — so it asserts *which* error is raised instead, which is a stronger
statement than red-versus-green anyway.

The other five rows of that inventory were already green and are untouched.

## Capture records

| Measurement | Value | Command | Source commit |
| --- | --- | --- | --- |
| Site registry schema | `1` before, `2` after | `node scripts/generate-completeness-matrix.mjs --check` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |
| Site feature rows | 44 canonical rows | `node scripts/negative-site-registry-parity.mjs` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |
| Matrix and registry status agreement | 264 site rows compared | `node --test tests/contracts/site-registry-matrix-parity.test.mjs` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |

## Capture method

The measurements came from the committed generator, the site registry parity contract, and the
real-file negative regression. No browser session or packaged application was used for these
records. The negative regression rewrites one real file at a time, runs the contract, restores the
original bytes in a `finally` block, and verifies the restoration.

## Verification boundary

These records prove the schema shape, generated-file agreement, and deliberate-break behavior at
the source level. They do not prove a running browser, a packaged desktop application, a screen
reader, or a deployed Pages response.

## Suggested articles

[Hidden test groups](hidden-red-groups.md), [Panel observation](panel-observation.md), and
[Completeness evidence](../platform/completeness-matrix.md).
