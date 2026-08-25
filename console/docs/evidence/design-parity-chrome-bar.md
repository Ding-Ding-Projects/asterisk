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

- **`brandCell`** — *chrome*. The product mark and name; the same on every destination. It is
  guaranteed to differ and is compared anyway — see [the brand cell](#the-brand-cell-is-7px-wider-and-that-is-not-geometry).
- **`menuCell`** — *chrome*. A fixed set of menu titles. Its divergence is the brand cell's, displaced.
- **`commandCell`** — *chrome*, **and this declaration is wrong**. It used to read "carries its own
  label, not a reading". It renders `connLabel` and `connUptime`: the design invents `pbx-hq · AMI
  5038` / `up 14d 06:22`, the application shows what its target reports. That is data-bearing in
  exactly the sense `statusCell` is, and it is the worst area on all 32 destinations at an identical
  39.00%. It is still compared rather than excluded, deliberately and provisionally: reclassifying an
  area as data narrows the bar, and narrowing it in the same pass that repaired the harness would
  leave one number nobody could attribute to either change. Whether it becomes data is its own
  roadmap item, with this measurement behind it.
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

**Prefer a full run of both sides.** It photographs each destination and measures its rectangles in
the same loop iteration, while the screen is settled and before anything else touches it, so the
mask and the pixels are the same render. Everything below comes out of one pass per side.

```
# the design export, rendered by its own runtime, under a browser on an off-screen desktop
node console/scripts/design-parity-capture-run.mjs --side=reference --port=N --server-port=M

# the real built renderer, under Electron on an off-screen desktop
node console/scripts/design-parity-capture-run.mjs --side=built --port=N

# no browser at all: both stages read the two PNG sets and the two region files off disk
node console/scripts/design-parity-capture-run.mjs --side=diff
node console/scripts/design-parity-capture-run.mjs --side=chrome
```

`--regions-only` measures the rectangles and photographs nothing. It exists so the bar could be
applied to captures that were already committed, where re-photographing them to obtain a mask would
have replaced the very evidence being measured. It leaves the rectangles and the pixels a run apart,
so reach for it only when the captures are not being retaken.

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

## Capture method

Both sides were driven over loopback Chrome DevTools Protocol against an already-running target that
exposes exactly one page target. **One full run per side**, so each destination's rectangles were
measured on the live DOM while that screen was settled, in the same loop iteration that photographed
it -- the mask and the pixels are the same render, not two visits that happen to agree. That
supersedes the earlier pair of `--regions-only` runs, which existed so the bar could be applied to
captures that were already committed.

- **Reference side.** The design export rendered by its own runtime inside
  `design-reference/index.html`, under headless Edge, with a capture run's full request
  interception: React served from the locally vendored copies the design's own integrity hashes pin,
  the font stylesheet answered from `assets/fonts`, and every other request refused and counted. **No
  request reached the network** -- 710 to the capture host, 64 font stylesheets answered locally, 0
  blocked. 32 of 32 destinations.
- **Built side.** The real built renderer under Electron on an off-screen Windows desktop created by
  `scripts/launch-on-hidden-desktop.ps1`, from `console/dist` built out of this tree. The visible
  desktop, cursor and foreground application were never touched. 32 of 32 destinations.
- **Comparison.** `--side=diff` and `--side=chrome`, no browser at all.

## Capture records

Every record below came from that same run: one full pass per side against one build of this tree.
The `--side=chrome` stage itself takes no pictures — it reads the two region measurements and the
captures off disk.

| State | Record | Run from commit | Coverage | Result |
| --- | --- | --- | --- | --- |
| Reference-side rectangles | `release/evidence/parity/regions-reference.json` | `3a63ea4d50ee262db85e3a1ef50bd96d4c44e63b` | 32 of 32 | 8 area rectangles each; every shell exactly 1440x1000 at the origin |
| Built-side rectangles | `release/evidence/parity/regions-built.json` | `3a63ea4d50ee262db85e3a1ef50bd96d4c44e63b` | 32 of 32 | every shell exactly 1440x1000 at the origin |
| Whole-frame visual diff | `release/evidence/parity/{id}-diff.json` | `3a63ea4d50ee262db85e3a1ef50bd96d4c44e63b` | 32 records | 0 match, 32 diff, 0 refused; 23.07%-60.98% of pixels differ |
| Per-destination region ledger | `release/evidence/parity/{id}-regions.json` | `3a63ea4d50ee262db85e3a1ef50bd96d4c44e63b` | 32 ledgers | 2 data areas excluded, 6 chrome areas compared |
| Per-destination chrome-parity comparison | `release/evidence/parity/{id}-chrome.json` | `3a63ea4d50ee262db85e3a1ef50bd96d4c44e63b` | 32 records | 0 match, 32 diff, 0 refused; 6.34%-14.95% of the compared region differs |
| Run ledger for the comparison stage | `release/evidence/parity/run-chrome.json` | `3a63ea4d50ee262db85e3a1ef50bd96d4c44e63b` | 32 compared, 0 skipped | exactly 29.57% of the frame compared, against a declared floor of 25% |

## Verification boundary

Two of the three limitations this section used to record are gone, and one is not.

**Gone: the rectangles and the pixels came from different runs.** They do not any more. Each
destination is measured and photographed in the same loop iteration, on both sides.

**Gone: the built artifact's own commit was not identified.** `console/dist` and
`console/dist-electron` were built from this tree, and `console/resources/update-manifest.json`
records that candidate commit in the same change as these captures.

**Still true: the mtime staleness check does not mean much from a fresh worktree.** `compareChrome`
compares each built capture's mtime against the build output's mtimes, and all 32 passed. But a
checkout stamps every file with the time it was written, so what that check compares in a freshly
linked worktree is "the checkout happened after the build", which was never in doubt. Treat the 32
passes as an absence of contrary evidence rather than proof, and rely on the single-pass provenance
above, which does not depend on a timestamp at all.

**No destination meets the bar.** All 32 report a real chrome divergence. That is the bar doing its
job rather than a defect in it, and it is now a second measured reason nothing is verified, beside
the Material Design 3 audit's finding that none of the 32 conforms.

## Where the divergence actually comes from

The previous version of this section named **one** cause -- the reference shell being 1428 wide
against the built shell's 1440 -- and that attribution was **wrong**. `brandCell` and `menuCell`
diverged by the same amount on the eleven destinations where the reference shell was a full 1440
wide too, so a scrollbar cannot have been what moved them. Measuring properly found three causes,
and two of them were defects in the equipment rather than in either artifact.

### One: the reference document was never given the height its own root style needs

The design's root element is `height:100%; overflow:hidden` -- the same shape the built application's
shell has. A percentage height against an auto-height body computes to `auto`, so the reference shell
grew to its content: **622px to 7668px tall** across the 32, and **1428px wide on 20 of them**
because the document then scrolled.

`design/support.js` supplies exactly the missing stylesheet, in its own `FULL_PAGE_CSS` constant --
but only `if (!parsed.preview)`, and this export declares a `$preview` of 1440x900 in its
`data-props`. So the runtime withholds it and leaves the sizing to the frame the design tool would
have provided. Served bare in an iframe, nothing provided it.

**Repaired in the capture harness**, by `design-parity-server.mjs`'s `injectFullPageHeight`, which
serves that stylesheet with the hosted design -- read out of `support.js`'s own declaration rather
than typed, so a renamed or moved constant throws by name. Nothing under `design/` is edited, on disk
or in flight.

### Two: every built capture was taken behind the update banner

The banner is raised by the updater's own background check, which completes whenever it completes
rather than at startup -- and the driver dismissed once, before the first destination. A full
32-destination run was taken with it up: the application's shell sat at **(0, 43)** on the first
twenty-two destinations and **(0, 52)** on the last ten, as the banner's text rewrapped for a newer
version. Nothing failed. The captures looked entirely normal.

**Repaired in the capture harness**, twice over: `clearUpdateBanner` dismisses and *proves
dismissed* before **every** destination, in the shape the onboarding-wizard dismissal already had;
and a built measurement whose shell does not sit at the window origin is refused outright, naming
whatever is above it. The second guard is not about the banner -- it catches any surface that
displaces the shell, including one nobody has thought of yet.

### The brand cell is 7px wider, and that is not geometry

`Ding PBX Console` measures **106.63px** where the design's `Asterisk Console` measures **100.27px**,
at the same 13px/500 Roboto inside the same 12px padding, 20px glyph and 10px gap: 160.63px against
154.27px, rounding the two rectangles to **161** and **154**. Every remaining top-strip displacement
is that one number -- `menuCell` moves right by 7, `commandCell` is squeezed by 8.

**Repaired nowhere, and that is the finding.** It is a deliberate product rename, recorded in
`compile-design.mjs`'s `BRAND` table and in `console/design/inventory.json` under
`source.sanitization`, of the same kind as the sample data this project removed. Not the
application's to fix -- the name is the product's own. Not the design's -- it is the reference, and
is never edited. Not the harness's -- it is reporting the difference correctly.

So `brandCell` differs by **15.56%** and `menuCell` by **12.00%** on every one of the 32,
permanently. Both stay inside the compared region, on the same principle `sectionList` does: a
divergence worth reading in the result is not one worth hiding in a mask.

### What the repairs changed

Written as a list rather than a table on purpose: the row-level check on this document requires
every table row to name the commit its capture came from, and these are not capture records.

- **Reference shells** — 1428 or 1440 wide and 622-7668 tall, now **1440x1000 at the origin on all 32**.
- **Built shells** — 1440 wide at y=43 or y=52, now **1440x1000 at the origin on all 32**.
- **Areas whose rectangle matches on both sides** — 0 of 8 on any destination, now **5 of 8 on all 32**.
- **Whole-frame diff** — 47.13%-63.95%, now **23.07%-60.98%**.
- **Compared-region diff** — 6.67%-26.78%, now **6.34%-14.95%**.
- **Compared fraction** — 29.5%-29.6%, now **exactly 29.57% on every one of the 32**.
- **Destinations with records** — 31, now **32**.

`statusCell`, `tabStrip`, `rail`, `sectionList` and `contentPane` now measure the **same rectangle**
on both sides on every destination. The only geometric difference left anywhere in the application
is the three top-strip cells, and it is one number.

**None of this verified anything.** No destination moved to `verified` and none could: every one
still reports a real chrome divergence, and the Material Design 3 audit still reports all 32
nonconforming. What changed is that the numbers now measure the product's real differences from the
design instead of two defects in the equipment measuring them.

## Suggested articles

- [Design-reference harness](../../design-reference/README.md) — how each side is driven and captured.
- `console/scripts/design-parity-chrome.mjs` — the comparator.
- `console/scripts/design-parity-regions.mjs` — the region probe and ledger.
- `console/tests/scripts/design-parity-chrome.test.mjs` — its tests.
- `console/scripts/negative-design-parity-evidence.mjs` — the red-then-green proof for the
  `verified` guard.
- `console/scripts/negative-design-parity.mjs` — the red-then-green proof for the bar's declaration.
