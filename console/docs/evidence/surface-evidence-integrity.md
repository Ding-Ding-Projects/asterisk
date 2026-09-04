# What a `verified` surface row now has to survive

The surface-completeness inventory holds 88 rows — 44 canonical features across the Windows
console and the documentation website — and each names six evidence artifacts: an
implementation registry entry, a documentation article, a localization entry, a contract test,
a built-interaction record, and a capture.

Until this pass, `verified` meant those six files were **present**. That is a real check and it
is not the check anybody reads it as. Presence says nothing about whether the record and the
capture beside it have anything to do with each other, or with the row they sit under.

## What presence alone let through

Measured, not supposed:

- **37 of the 42 non-exempt windows-console rows already had all six artifacts on disk** while
  still marked `unverified`. The roadmap line describing this item said `0 of 88 rows verified,
  and all 528 claimed artifacts are absent, with four of the seven evidence directories not yet
  created`. Two rows were verified, 38 built-interaction records and 38 captures existed, and
  every directory it named as absent was present. The line had gone stale without anything
  noticing, because nothing measured it.
- **20 of those rows carry a complete set of six artifacts while their own documentation article
  says the desktop application does not implement the feature at all.** (Three further articles
  say the same thing for rows that have no record or capture, so the count of articles reading
  `Not implemented` on the desktop is 23.) `accessibility` is the
  clearest: its article states that the rendered interface *contains no accessibility attributes
  at all*, and its built-interaction record honestly scopes itself to a contrast readout
  "matching **part** of the required contrast and reduced-motion accessibility rules". Both files
  are truthful. A row marked `verified` on top of them would not be.
- A row would pass with a **zero-byte PNG**, with a **digest typed by hand**, and with a record
  **copied from a neighbouring feature** — three states indistinguishable, in the inventory, from
  a row somebody actually drove the application to produce.

## The bar a row now has to clear

`scripts/evidence-integrity.mjs`, run over every row claiming `verified`:

| Property | Refuses |
| --- | --- |
| The record names *this* row's capture | a record copied from a neighbouring feature |
| `captureSha256` is the capture's real digest | a digest written rather than computed |
| `captureBytes` is the capture's real length | a record describing a file that has since changed |
| The capture is a PNG with non-zero dimensions | an empty, truncated or non-image file |
| No two rows share capture bytes | one screenshot standing in for two features |
| `commit` is a 40-character object name, `artifactSha256` a SHA-256, `artifact` named | provenance nobody can go and check |
| `verification` is a known label | a free-text claim nobody decided the meaning of |
| `contractPoints` is non-empty | an interaction recorded that proves nothing in particular |
| `notInterrogatedHere` is present | a record that does not say what it left uncovered |
| The article declares a status for *this* row's surface | a row whose documentation says nothing about whether the feature exists |
| That status is not `not implemented` | the `accessibility` case above |
| The article and the surface registry agree | two of the six artifacts contradicting each other |

`partial` is accepted. A partly-built feature can carry honest evidence, and every record scopes
itself in its own `notInterrogatedHere`. What is refused is a row claiming *merged* evidence
while two of the things being merged disagree about whether the feature is there.

## The contradiction this uncovered, and why it is not resolved here

Every feature is described twice: its surface's registry (`app/feature-registry.json`,
`site/feature-registry.json`) records `absent` / `partial` / `implemented` with a note and the
files behind it, and its documentation article states the same fact in prose.

**Of the 88 pairs, 40 agree, 40 disagree, and 8 declare nothing at all.** Half of what the
documentation says about whether a feature exists is contradicted by the registry beside it.

Neither record can simply be preferred, and that is the finding worth carrying forward, because
the obvious move is to treat the machine-readable one as authoritative:

- `language-modes` has an article reading `Desktop application: Not implemented` against a
  registry entry recording the day the mechanism landed and naming the module. Here the article
  is stale.
- `app-display-name` has a registry note reading `CORRECTED 2026-08-25: … nameFor(surface,
  storage) … is never called anywhere` and `the BrowserWindow is created with a hard-coded title
  … never updated from the renderer's stored choice`. The code calls `nameFor` at
  `App.tsx:2368`, `App.tsx:2987`, `App.tsx:3030` and `display-name.ts:155`; `main.ts:223`
  handles `window:set-title` and both preloads expose it. Here the **registry** is stale, and
  the article describes the four call sites correctly.

So resolving a pair means reading the code for that one feature, forty times. What this pass
does instead is stop the set moving unobserved. `inventories/documentation-agreement.json` pins
all 40 disagreements and all 8 undeclared pairs by exact membership and exact values, and
`scripts/documentation-agreement.mjs` fails when the tree differs **in either direction** — a new
contradiction fails immediately rather than joining a pile nobody counts, and a resolved one
fails until it is struck off, because a list that quietly shrinks is not a record of what remains.

## What moved

Eight rows are `verified`, all on the windows-console surface: `school-mode`,
`dim-sum-surprise`, `regex-builder`, `non-blocking-notifications`, `material-appearance`,
`responsive-sizing`, `per-element-toy-locks`, `guided-forms`. Seven of them moved up from
`unverified` and were already carrying every artifact; nothing was captured or written to make
them pass.

**One row moved down.** `automatic-updates` was marked `verified` and is now `unverified`: its
documentation article carries no implementation-status declaration for either surface, so
nothing in its own evidence says whether the feature exists on the surface the row is about.
Its article also states that the lane which wrote it "intentionally did not run tests, lint,
type checks, builds, packaging, desktop launch, UI interaction, or screen captures", while a
built-interaction record and a capture for it exist from a later pass — a third staleness of the
same kind. The demotion is the guard working on its first day rather than a regression, and
re-earning the row needs one honest paragraph in that article, not a new capture.

The other 76 non-exempt rows stay `unverified` for measured reasons, not absent ones. Counted by
the first thing each one fails on, across the 84 non-exempt rows:

| Rows | Stopped by |
| ---: | --- |
| 8 | nothing — `verified` |
| 20 | its documentation says the feature is absent on that surface |
| 7 | its registry and its article disagree |
| 2 | its article declares no status at all (`app-display-name`, `automatic-updates`) |
| 47 | it has no built-interaction record or capture |

Of those 47, five are on the windows-console surface and **all 42 non-exempt `pages-site` rows
are the rest**: that surface has produced 0 of its 84 interaction-and-capture artifacts, and no
capture of the published site exists at all. It is the single largest remaining block.

## Capture records

The eight captures a `verified` row now rests on, each bound to its own built-interaction
record by path, SHA-256 and byte length. None was taken by this pass; every one was already on
disk, and what changed is that the binding is now checked rather than assumed.

| State | Record | Run from commit | Coverage | Result |
| --- | --- | --- | --- | --- |
| `school-mode` | `release/captures/windows-console/school-mode.png` | `d50822fbb689304fe4f52292c0457c51f9ef4f83` | 1578x678, 81316 bytes | 3 contract points, 3 named as uninterrogated |
| `dim-sum-surprise` | `release/captures/windows-console/dim-sum-surprise.png` | `d50822fbb689304fe4f52292c0457c51f9ef4f83` | 1518x296, 13150 bytes | 3 contract points, 3 named as uninterrogated |
| `regex-builder` | `release/captures/windows-console/regex-builder.png` | `d50822fbb689304fe4f52292c0457c51f9ef4f83` | 2181x1393, 281905 bytes | 5 contract points, 4 named as uninterrogated |
| `non-blocking-notifications` | `release/captures/windows-console/non-blocking-notifications.png` | `d50822fbb689304fe4f52292c0457c51f9ef4f83` | 1536x498, 45331 bytes | 2 contract points, 3 named as uninterrogated |
| `material-appearance` | `release/captures/windows-console/material-appearance.png` | `d50822fbb689304fe4f52292c0457c51f9ef4f83` | 1518x558, 24406 bytes | 2 contract points, 3 named as uninterrogated |
| `responsive-sizing` | `release/captures/windows-console/responsive-sizing.png` | `d50822fbb689304fe4f52292c0457c51f9ef4f83` | 1500x480, 47992 bytes | 1 contract point, 3 named as uninterrogated |
| `per-element-toy-locks` | `release/captures/windows-console/per-element-toy-locks.png` | `d50822fbb689304fe4f52292c0457c51f9ef4f83` | 423x102, 9313 bytes | 2 contract points, 3 named as uninterrogated |
| `guided-forms` | `release/captures/windows-console/guided-forms.png` | `d50822fbb689304fe4f52292c0457c51f9ef4f83` | 1518x348, 30346 bytes | 2 contract points, 3 named as uninterrogated |

## Capture method

Nothing here was captured. Every frame in the table above was produced by an earlier pass,
which recorded its own method in each built-interaction record: an Electron window launched on
an off-screen Windows desktop under a task-scoped profile, driven over a loopback Chrome
DevTools Protocol connection with exactly one page target verified before any evaluation, the
window resolved by exact class `Chrome_WidgetWin_1` with a non-empty title and non-zero size.
Each record names the packaged executable it drove and that executable's SHA-256.

This pass's own method is arithmetic over those committed bytes: each capture is re-hashed and
re-measured from disk and compared against what its record claims, and each row's article and
registry are re-read and compared against each other. That is reproducible on any machine with
the repository and needs no desktop, which is the point — the binding is now checkable by
anyone, where before it was only assertable by whoever took the screenshot.

## Verification boundary

- **No capture was taken, retaken or re-driven.** All eight are the earlier pass's frames from
  commit `d50822fbb689304fe4f52292c0457c51f9ef4f83`, which is an ancestor of `master` but is not
  its tip. The checks prove each record describes the capture beside it; they do not prove the
  capture still resembles what the application renders today, and nothing here measures that
  drift.
- **`verified` is a claim about the evidence, not about the feature.** Six of the eight rows sit
  on a `partial` implementation, and every record scopes itself in its own `notInterrogatedHere`
  — `regex-builder`'s, for instance, excludes typing a pattern and watching the list filter, the
  save and cheatsheet behaviours, keyboard-only operation, and two of its three pattern targets.
  A `verified` row means those six artifacts are real, mutually consistent and not contradicting
  each other. It does not mean the feature is finished.
- **The registry/article census is pinned, not resolved.** 40 pairs still contradict each other
  and 8 still declare nothing. This pass measured them and stopped the set moving; it repaired
  none of them, because each needs its own read of the code and two of the checks above would
  have been satisfied by preferring the wrong record.
- **One stray file is out of scope and named rather than removed.**
  `release/evidence/windows-console/servers.json` is not a feature row — `servers` is a
  destination — and it names commit `5e7cc508d470b022c96d4008dc6b0927f5748d6f`, which does not
  resolve in this repository at all. Nothing checks it, because nothing claims it.
- **No test ran against a live Asterisk, and no built artifact was launched.** Everything here is
  arithmetic over committed files.

## How the guards were proved

`scripts/negative-evidence-integrity.mjs` plants 25 lies in the data — a record pointed at a
neighbour's capture, a digest that does not match, a corrupted PNG whose record was rewritten to
agree with it, a reversing status continuation, a registry moved out of step, a census entry
struck off without being resolved — and requires each to be refused, then requires the honest
tree to be accepted, so the check cannot pass by refusing everything.

That is not sufficient on its own, and `scripts/prove-evidence-guards.mjs` is why. It breaks one
check at a time **in the production module** and requires the regression to notice. Of its first
eleven breaks, **two stayed green**:

- the duplicate-capture case was written as *throw inside `try`, match the message in `catch`* —
  and the thrown `…stayed green` message itself contained the substring the `catch` matched on,
  so it printed RED whether or not the check existed;
- the "documentation says the feature is absent" case was **shadowed** by the registry-agreement
  check, which fired first because only the article had been moved; moving both records to
  `absent` makes them agree and leaves the refusal branch as the only thing left to object to.

Both were repaired in the regression, and all eleven now go red alone and green on restore.

Finally, end to end: setting `windows-console.accessibility` to `verified` in the real inventory
and running `scripts/verify-inventories.mjs` fails with both reasons named. That is the exact
optimistic tick this pass set out to make, refused by the thing it built instead.

## Suggested articles

[Live readings](live-readings.md), [Design-parity chrome bar](design-parity-chrome-bar.md), [Material Design 3 audit](design-parity-material-audit.md).
