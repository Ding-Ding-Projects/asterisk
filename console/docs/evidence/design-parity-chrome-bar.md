# The chrome-parity bar

The reference-versus-built comparison a destination in this project can actually meet.

## Why the old bar could never be met

`compareCaptures` asks whether the reference capture and the built capture are pixel-identical
across the whole frame, and `verifyDesignParityEvidence` used to require that `match` before a
design-parity row could claim `verified`.

That question is unanswerable here, and not because of any defect. This application deliberately
removed the design's sample rows, dashboard tiles, health bars, per-row badges, history, agent rail
and trunk-authentication content, and shows the target's real — usually empty — readings in the same
place. So the design shows invented content exactly where the application shows a reading, and
between 47% and 64% of every frame differs for a reason nobody wants fixed. No row could ever be
verified, and the guard was right to refuse every one of them.

## What the bar asks instead

> Outside the regions that carry data, do the two artifacts render identically?

That is meetable, and the existing captures prove it rather than assert it: the `dash` and `logger`
capture pairs each contain runs of rows that are byte-for-byte equal between the two sides. Both
sides are Chromium at the same device metrics reading the same local font files, so identical
content really does produce identical pixels here.

The bar therefore has **no per-pixel tolerance**. A tolerance would be a number chosen until
something passed; zero is the number the artifacts themselves support.

## The three properties that keep it honest

A masked comparison is easy to pass badly: widen the mask until nothing is left. Three properties
stop that, and each is guarded and proven red-then-green.

**The mask is declared, not discovered.** Nothing in `compareChrome` reads the pixel diff to decide
what to exclude. A mask derived from the diff would exclude exactly what differs and turn every
verdict into a match — the one construction that would make the whole thing worthless.

**A mask that swallows the frame is refused.** The compared region must keep at least 25% of the
frame (`chromeParityBar.minimumComparedFraction`). The regions this application actually declares
leave a little under 30%, so the floor sits below what an honest mask costs and far above what a
mask widened to force a pass would leave. `compareChrome` returns `refused`, never `match`, when the
floor is breached.

**What the mask hid is measured and reported anyway.** Every record carries
`excluded.diffPercentage` — how much of the masked region genuinely differed. A mask covering a
region that was identical all along shows up as a suspiciously low number rather than as nothing at
all.

## Where the rectangles come from

They are measured off both live DOMs during a capture run by `scripts/design-parity-regions.mjs`,
never hand-drawn.

The shell is located **structurally** — a three-row layout whose last row is three columns — because
the two sides share the design's layout but not its class names: the design export's runtime emits
`scp7`/`scp8` and the compiled renderer emits `k-h0`/`k-h7`, both hashed at build time. A side whose
structure has drifted from that shape is refused by name rather than silently measured in the wrong
place.

Eight areas are measured on each side. Which of them carry data is the **one human judgement** this
bar rests on, declared once for the whole application in `inventories/design-parity.json` rather
than as 32 per-destination masks, so the judgement stays small enough to review:

- **`brandCell`** — *chrome*. The product mark and name; the same on every destination.
- **`menuCell`** — *chrome*. A fixed set of menu titles.
- **`commandCell`** — *chrome*. Carries its own label, not a reading.
- **`statusCell`** — **data**. Live connection status. The design invents a healthy value; the
  application shows what the target reports, which with no target configured is nothing at all.
- **`tabStrip`** — *chrome*. Tab titles come from the navigation catalogue, itself compiled from the
  design, so both sides are naming the same screens.
- **`rail`** — *chrome*. Six fixed rail icons and labels, compiled from the design's catalogue.
- **`sectionList`** — *chrome*. Kept **inside** the comparison on purpose, badges and all — see below.
- **`contentPane`** — **data**. The destination's own screen: the region this bar exists to exclude.

The section list stays in the compared region deliberately, even though this application removed the
design's per-row badges. The labels are chrome, and a badge present on one side and absent on the
other is a divergence worth reading in the result rather than one worth hiding in a mask.

An area's exclusion rectangle is the **union** of the two sides' measured rectangles, not their
intersection. The sides genuinely disagree about some heights, and an intersection would leave a
strip of one side's data inside the compared region and report it as a chrome defect it is not. A
union can only ever hide more, which is what the compared-fraction floor and the excluded-region
measurement are there to keep honest.

## Running it

The region measurement and the comparison are separate from the capture stages, so the bar can be
applied to captures that are already committed — re-photographing them to obtain a mask would
replace the very evidence being measured.

```
# measure the rectangles, photograph nothing
node console/scripts/design-parity-capture-run.mjs --side=reference --regions-only --port=N --server-port=M
node console/scripts/design-parity-capture-run.mjs --side=built     --regions-only --port=N

# apply the bar: no browser, reads the two region files and the captures off disk
node console/scripts/design-parity-capture-run.mjs --side=chrome
```

A full `--side=reference` / `--side=built` run measures the rectangles too, while the screen is
settled and before anything else touches it, so a complete run produces everything in one pass.

`--side=chrome` **refuses to run at all** when `console/dist` and `console/dist-electron` are both
absent: with no build output, no capture can be proved newer than the build it claims to show, and a
staleness check that silently does not run is indistinguishable from one that passed.

## What it produces

Two files per destination, both named by `evidenceTemplates`:

- `{id}-regions.json` — every area's rectangle on each side, its union, its declared role and the
  reason behind that role.
- `{id}-chrome.json` — the verdict, the compared fraction, the differing pixel count and bounding
  box, a per-area breakdown, what the mask hid, and the palette and staleness checks.

A `verified` row now requires the chrome record to be a `match` with a staleness check that
**actually ran**, and requires it to cite exactly the mask its own region ledger recorded — so a
passing comparison cannot rest on rectangles nobody measured. The whole-frame `visualDiff` is still
required and still read; it is now required to be a real comparison rather than a match, and a
`refused` one is refused exactly as before.

## Capture records

Every record below was produced by `--side=chrome`, which takes no pictures: it reads the two
region measurements and the already-committed captures off disk. The commit column is the tree the
measurement run was performed from, not the tree the built artifact was compiled from — see the
verification boundary below, which is not the same thing and matters here.

| State | Record | Run from commit | Coverage | Result |
| --- | --- | --- | --- | --- |
| Reference-side rectangles measured, nothing photographed | `release/evidence/parity/regions-reference.json` | `f346ebfc2aff9d1ed815ec15968afe9b07371707` | 32 of 32 destinations | 8 area rectangles per destination |
| Built-side rectangles measured, nothing photographed | `release/evidence/parity/regions-built.json` | `f346ebfc2aff9d1ed815ec15968afe9b07371707` | 31 of 32 destinations | About refused: its heading does not settle on this build |
| Per-destination region ledger, both sides unioned | `release/evidence/parity/{id}-regions.json` | `f346ebfc2aff9d1ed815ec15968afe9b07371707` | 31 ledgers | 2 data areas excluded, 6 chrome areas compared |
| Per-destination chrome-parity comparison | `release/evidence/parity/{id}-chrome.json` | `f346ebfc2aff9d1ed815ec15968afe9b07371707` | 31 records | 0 match, 31 diff, 0 refused; 6.67%–26.78% of the compared region differs |
| Run ledger for the comparison stage | `release/evidence/parity/run-chrome.json` | `f346ebfc2aff9d1ed815ec15968afe9b07371707` | 31 compared, 1 skipped | 29.5%–29.6% of frame compared against a declared floor of 25% |

## Capture method

Both sides were driven over loopback Chrome DevTools Protocol against an already-running target that
exposes exactly one page target, and neither run photographed anything — `--regions-only` measures
rectangles and writes no PNG.

- **Reference side.** The design export rendered by its own runtime inside
  `design-reference/index.html`, under headless Edge, with the same request interception a capture
  run uses: React served from the locally vendored copies the design's own integrity hashes pin, the
  font stylesheet answered from `assets/fonts`, and every other request refused and counted. No
  request reached the network. 32 of 32 destinations measured.
- **Built side.** The real built renderer under Electron on an off-screen Windows desktop created by
  `scripts/launch-on-hidden-desktop.ps1` — the same route and the same build output the committed
  built captures came from. The visible desktop, cursor and foreground application were never
  touched. 31 of 32 measured; About refused, below.
- **Comparison.** `--side=chrome`, no browser at all.

## Verification boundary

Four things this evidence does **not** establish, each named rather than left to inference.

**The staleness check ran and passed, and in this run it did not mean much.** `compareChrome`
compares each built capture's mtime against the build output's mtimes, and all 31 passed. But this
run was made from a fresh linked worktree, and a checkout stamps every file with the time it was
written — so what actually got compared was "the checkout happened after the build", which was never
in doubt. It is the same limitation the inventory already records for `compareCaptures`. Treat the
31 passes as an absence of contrary evidence, not as proof the captures postdate the build.

**The built artifact's own commit is not identified.** `console/dist` on the machine this ran on was
built before the commit that repaired the About heading, which is why About still refuses. The
commit column above says which tree the measurement RUN was performed from; it does not claim the
built renderer was compiled from that tree, because that is not known.

**The rectangles and the pixels come from the same artifacts but not the same instant.** The
captures were taken by an earlier run and the rectangles by this one. A full single-pass run
(`--side=reference` then `--side=built`, without `--regions-only`) measures the rectangles while the
screen is settled and before anything else touches it, and should be preferred whenever the captures
are being retaken anyway.

**About is absent, not assumed.** No `about-regions.json` and no `about-chrome.json` were written.
The next built run from a current build should settle on it like the other 31; that is an
expectation, not a result.

## What the first run found

31 destinations measured (About has no built capture yet), all `diff`, none `refused`.

- **6.67% to 26.78%** of the compared region differs, against a compared region of 29.5%–29.6% of
  the frame.
- The worst area is `commandCell` on 30 of the 31 destinations, and `sectionList` on `logger`.
- `brandCell` differs by exactly 15.6% and `menuCell` by exactly 12.0% on **every** destination —
  identical figures, which is the signature of one divergence rather than 31.

That one divergence is measurable in the region ledgers: the **built shell is exactly 1440x1000 on
all 31 destinations**, while the **reference shell is 1428 wide on 20 of the 32** (a 12px vertical
scrollbar) and ranges in height from 622px to 7668px. The design export, rendered by its own
runtime, lets the document grow to its content and scrolls the page; the application constrains its
shell to the viewport and scrolls within panes. Every horizontal position in the top strip drifts as
a result, which is why the brand and menu cells differ by the same amount on every screen.

Whether that is repaired in the application, in the design, or in the capture harness is a judgement
for a later pass. What matters here is that the bar turned "57% of pixels differ" into one named,
measurable cause.

## Suggested articles

- [Design-reference harness](../../design-reference/README.md) — how each side is driven and captured.
- `console/scripts/design-parity-chrome.mjs` — the comparator.
- `console/scripts/design-parity-regions.mjs` — the region probe and ledger.
- `console/tests/scripts/design-parity-chrome.test.mjs` — its tests.
- `console/scripts/negative-design-parity-evidence.mjs` — the red-then-green proof for the
  `verified` guard.
- `console/scripts/negative-design-parity.mjs` — the red-then-green proof for the bar's declaration.
