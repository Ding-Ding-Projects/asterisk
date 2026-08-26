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
capture pairs each contain runs of rows that are byte-for-byte equal between the two sides, and
inside the credits pill the Roboto digit is byte-for-byte equal on all 32. Both sides are Chromium
at the same device metrics reading the same local font files, so identical content **can** produce
identical pixels here.

The bar therefore has **no per-pixel tolerance**. A tolerance would be a number chosen until
something passed; zero is the number the artifacts themselves support.

**That claim used to be stronger, and the stronger version is now known to be too strong.** It read
"identical content really does produce identical pixels here", without qualification. Admitting
`statusCell` into the compared region tested it directly — one compiled template, nothing overridden
on either side, the same rectangle measured on both — and it differs by 1,420 pixels on every one of
the 32. See [what admitting the status cell
measured](#the-status-cell-is-chrome-and-admitting-it-found-something). Zero is still the only
defensible tolerance; what changed is that meeting it is not free, and a tolerance wide enough to
absorb those 1,420 pixels would be wide enough to absorb a real defect.

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
- **`commandCell`** — **data**, and this is the decision the roadmap asked for — see
  [the connection pill](#the-connection-pill-is-data-and-that-decision-cost-two-surprises).
- **`statusCell`** — *chrome*, and this is the second decision the roadmap asked for — see
  [the status cell](#the-status-cell-is-chrome-and-admitting-it-found-something).
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

**Both sides now run under the same browser, and that is a change.** The reference side used to run
under headless Edge while only the built side ran under Electron, so two artifacts compared at a
tolerance of exactly zero were being drawn by two different browsers in two different modes. What
that was worth is measured rather than guessed at, in
[why one measurement would have got this backwards](#why-one-measurement-would-have-got-this-backwards):
retaking the reference side alone, with no change to the product, raises the rail's divergence on
every one of the 32.

- **Reference side.** The design export rendered by its own runtime inside
  `design-reference/index.html`, under **Electron 43.4.1 on an off-screen Windows desktop**, with a
  capture run's full request interception: React served from the locally vendored copies the design's
  own integrity hashes pin, the font stylesheet answered from `assets/fonts`, and every other request
  refused and counted. **No request reached the network** -- 710 to the capture host, 64 font
  stylesheets answered locally, 0 blocked. 32 of 32 destinations.
- **Built side.** The real built renderer under **the same Electron 43.4.1** on an off-screen Windows
  desktop created by `scripts/launch-on-hidden-desktop.ps1`, from `console/dist` built out of this
  tree. The visible desktop, cursor and foreground application were never touched. 32 of 32
  destinations.
- **Comparison.** `--side=diff` and `--side=chrome`, no browser at all.

## Capture records

Every record below came from that same run: one full pass per side against one build of this tree.
The `--side=chrome` stage itself takes no pictures — it reads the two region measurements and the
captures off disk.

The last two rows have now been **re-derived twice**: once when `commandCell` moved from chrome to
data, and once when `statusCell` moved from data to chrome. Neither re-derivation retook a capture or
re-measured a rectangle. The same 64 PNGs and the same two region files went in both times, and only
the mask changed. Both re-runs were made against the exact build output the built captures were taken
from — the newest build mtime each recorded is `1787691669082.8162`, the same figure the original
records carry — so their staleness check compares the same two things the original one did, and means
neither more nor less. With one caveat the second re-run created for itself: it walked `console/dist`
alone, for the reason given under [verification boundary](#verification-boundary).

| State | Record | Run from commit | Coverage | Result |
| --- | --- | --- | --- | --- |
| Reference-side rectangles | `release/evidence/parity/regions-reference.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 of 32 | 8 area rectangles each; every shell exactly 1440x1000 at the origin |
| Built-side rectangles | `release/evidence/parity/regions-built.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 of 32 | every shell exactly 1440x1000 at the origin |
| Whole-frame visual diff | `release/evidence/parity/{id}-diff.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 records | 0 match, 32 diff, 0 refused; 20.60%-61.41% of pixels differ |
| Per-destination region ledger | `release/evidence/parity/{id}-regions.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 ledgers | 2 data areas excluded, 6 chrome areas compared |
| Per-destination chrome-parity comparison | `release/evidence/parity/{id}-chrome.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 records | 0 match, 32 diff, 0 refused; 2.95%-12.20% of the compared region differs |
| Run ledger for the comparison stage | `release/evidence/parity/run-chrome.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 compared, 0 skipped | exactly 29.1106% of the frame compared, against a declared floor of 25% |
| The axis pin, rendered both ways | `release/evidence/parity/msym-axis-pin.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 98 icons | 0 differing pixels shipped-against-design; 11,252 under the pin |
| The axis pin, four-way at destination level | `release/evidence/parity/msym-axis-pin-destination.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 destinations | baseline `12bb4ff85f21d664b92d90410d645440f022ad9c`; only both changes together converge |

Every figure above came from one full pass per side taken in one session against the build recorded
in `console/resources/update-manifest.json`, whose `candidateCommit` is that same
`5cc309a4421ca843721ea71d7336cd7e317f358c`. **`master` gained an IAX2 destination after that build,
and this pass does not re-photograph it** — that is stated rather than left to inference, and it is
the same condition `master`'s own Fax commit left behind, which retook no capture either.

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

**New, and created by the `statusCell` re-run rather than found by it: that re-run walked
`console/dist` only.** 21 files — the Vite renderer output the built captures actually photographed —
and not `console/dist-electron`. The recorded `newestBuildSourceMtimeMs` is unchanged at
`1787691669082.8162`, because that figure has always come from `dist` and it is the same figure the
records this run replaced already carried.

The reason `dist-electron` was absent is a mistake, and it is written down rather than tidied away.
The pass reached the capture-provenance build output through a **directory junction**, and a routine
`npx tsc -b` then wrote *through* that junction and restamped all 93 files of `console/dist-electron`
in the linked worktree holding it, from about `1787691669000` to `1787697942397`. Nothing tracked was
touched, and the directory is ignored build output that a rebuild restores — but its mtimes are no
longer the ones the captures were taken beside, so including it would have made every record refuse
on a staleness the pass had manufactured itself. Excluding it narrows what this check considered from
114 files to 21. It does not change what the check concluded, and the honest reading is that this
run's timestamp provenance is one directory weaker than the run it replaced.

**No destination meets the bar.** All 32 report a real chrome divergence. That is the bar doing its
job rather than a defect in it, and it is now a second measured reason nothing is verified, beside
the Material Design 3 audit's finding that none of the 32 conforms.

## The status cell is chrome, and admitting it found something

The roadmap asked the second of two role questions: should `statusCell` stop being excluded as data?
The answer is **yes**, and the argument is shorter than `commandCell`'s because the renderer settles
it outright.

The fourth top cell holds the Beginner/Expert mode picker, the confirmation-credits pill, the
command-palette button and the three window controls. Its previous declaration read "carries live
status: what the console is connected to and how that connection is faring" — but that sentence
describes `commandCell`, and a pass corrected the text while deliberately leaving the role alone so
this move could be measured on its own.

The decisive evidence is not the description. `App.tsx` overrides exactly **two** values in the whole
top strip — `connLabel` and `connUptime` — and **both land in `commandCell`**. Nothing inside this
cell is written by the product at all: the same `modeOpts`, the same credits count, the same search
glyph and the same three window buttons come out of the same compiled template on both sides. There
is no invented reading here for the bar to exclude, so excluding it was a narrowing nobody argued
for.

**What the decision costs, measured.** The compared fraction **rises** from exactly `28.0883%` to
exactly `29.1106%` — 419,192 pixels of 1,440,000, which is the 404,472 compared before plus this
cell's own 14,720. It is the first change to this declaration that widened the comparison instead of
narrowing it. The compared-region divergence moves from 4.62%–13.68% to **4.80%–13.54%**: the low end
rises and the high end falls, because this cell diverges by more than the least-divergent
destinations did and by less than the most-divergent ones.

**No neighbouring area moved by a single pixel**, unlike the `commandCell` move. This cell's union
spans columns 1072–1440 and overlaps nothing else, so there was no neighbour's compared strip to
clip. The worst-area tally is unchanged at `brandCell` 21, `tabStrip` 7, `sectionList` 4, because
9.65% never beats `brandCell`'s 15.56%.

### It was expected to match. It does not.

One template, nothing overridden, the identical rectangle `1072,0,368,40` measured on both sides of
all 32 — and it differs by **1,420 of its 14,720 pixels, 9.6467%, with the same count on every one of
the 32**. An identical figure across 32 different screens is the signature of one cause, so the 1,420
were located rather than shrugged at. There are two, and neither is noise.

**One: the Material Symbols glyphs.** Every differing pixel outside the mode picker sits on an icon —
the credits pill's `confirmation_number` at columns 1237–1259 (129 differing), the command-palette
`search` glyph at 1302–1317 (119), and `remove`, `crop_square` and `close` at 1345–1356, 1379–1390 and
1413–1424 (46, 88 and 84).

The discriminator sits inside the same pill. The **Roboto digit** beside that icon, columns
1267–1284, is **byte-for-byte identical — 0 differing pixels**. Roboto matches and Material Symbols
does not, in adjacent runs of the same control, so this is not antialiasing in general.

Both sides are served the same local `material-symbols-outlined-100-700-0.woff2`; the reference side
gets it through the capture run's font interception, which answers `fonts.googleapis.com` out of
`assets/fonts`. What differs is the rule. `font-variation-settings` appears **zero** times anywhere
under `design/` and **exactly once** in the built renderer — in the `.msym` rule `compile-design.mjs`
adds, pinning `FILL 0, wght 400, GRAD 0, opsz 24`. Material Symbols Outlined is a variable font whose
axes the design's own stylesheet link requests as `opsz 20..48, wght 100..700, FILL 0..1, GRAD
-50..200`, so the built side draws every icon from a pinned instance and the reference side draws it
from the file's default one.

**Two: the mode picker's border.** 548 of the 946 pixels differing inside the picker are in five
rows, and they are the box's own 1px border rather than anything inside it. On the reference the top
border is a single crisp row 6 at `rgb(65,73,66)`, with rows 5 and 34 pure background. On the built
side the same ink is **split across rows 5 and 6** at `rgb(24,31,25)` and `rgb(40,52,45)`, and the
same at the bottom. The built side draws the 28px-tall picker box half a pixel higher.

That is a real sub-pixel layout difference and **not** a whole-frame offset. Shifting the built region
by −2, −1, +1 or +2 pixels raises the divergence in every one of the six runs rather than lowering it,
so `dx=0` is already the best alignment — and the byte-identical Roboto digit proves at least one
glyph sits at exactly the same subpixel position on both sides.

### What this section does not claim

The first cause is measured to its mechanism; the second only to its symptom.

For the icons, the difference between the two stylesheets is a fact **counted in the files** — 0
occurrences under `design/`, 1 in the generated renderer — and the divergence is confined to exactly
the glyphs that rule governs. But this pass did not re-render either side with the axes changed, so
the pinning is a **named** cause rather than a demonstrated one.

For the picker border, the half-pixel offset is measured in the pixels and its cause is **not
established**. The top strip is 40px on both sides, the picker is 28px on both, and `(40 − 28) / 2` is
an integer, so where the half pixel enters is unknown.

**Neither is repaired here, on purpose.** Repairing the first means editing the compiled renderer's
`.msym` rule, which changes how every icon in the shipped product is drawn and invalidates all 32
built captures — a decision and a capture run of its own, not a side effect of a role change. Both
are recorded as roadmap items.

> [!NOTE]
> **Both have since been answered, and only one of them was what it looked like.** The section above
> is left exactly as written, because the account of how the two causes were found is still the
> account. See [the axis pin](#the-axis-pin-what-it-was-and-what-removing-it-cost): the icon cause
> was demonstrated and repaired, and the picker border turned out not to be a divergence between the
> two artifacts at all.

## The axis pin: what it was, and what removing it cost

`compile-design.mjs` used to append `font-variation-settings:"FILL" 0,"wght" 400,"GRAD" 0,"opsz" 24`
to its own `.msym` rule. It does not any more. The decision, and the reason it could not be taken by
reading the code, are below.

### What the pin was

It arrived in this compiler's **first** commit, `9beed2f159` — **thirty minutes before** the 49-face
font download in `0611732d0`, and it was never touched again. The roadmap item that raised this
worried that the pin had arrived *with* that download and that removing it might undo a repair. The
ordering disproves the premise. It is Google's own documented Material Symbols snippet, carried in
unchanged and never revisited.

### What it did

`scripts/woff2-fvar.mjs` reads the shipped face's own `fvar` table, rather than trusting the
stylesheet URL that requested it:

| axis | minimum | **default** | maximum |
| --- | --- | --- | --- |
| `FILL` | 0 | **0** | 1 |
| `GRAD` | −50 | **0** | 200 |
| `opsz` | 20 | **24** | 48 |
| `wght` | 100 | **400** | 700 |

Three of the four pinned values are the file's own defaults. They did nothing at all.

The fourth did a great deal. CSS `font-optical-sizing` defaults to `auto`, which drives the `opsz`
axis from the used font-size, and `font-variation-settings` **outranks it** — so a fixed `opsz 24`
replaced every icon's own optical size with a 24px icon's. The design draws **175 icons, and four of
them are 24px**.

### The demonstration

`scripts/design-parity-msym-axes.mjs` renders every distinct literal (size, ligature) pair the design
draws — 98 of them — four ways in one Chromium at this capture tuple's own metrics, from the shipped
font file:

| comparison | whole-frame differing pixels |
| --- | --- |
| the design's own `.msym` rules against **the shipped rules** | **0** |
| the design's own rules against **those rules plus the pin** | **11,252** |
| the design's own rules against **the pin with `opsz` per icon at `clamp(size, 20, 48)`** | **0** |

95 of the 98 differ under the pin; the three that do not are exactly the 24px ones. The last row is
what identifies the mechanism rather than merely correlating with it — the unpinned rendering **is**
the pin at each icon's own optical size.

### Why one measurement would have got this backwards

This pass changed two things: the product, and the harness — which now renders **both** sides under
one Chromium, where the reference side previously ran under headless Edge while only the built side
ran under Electron. Two artifacts compared at a tolerance of exactly zero were being drawn by two
different browsers in two different modes.

`scripts/design-parity-msym-destination.mjs` separates the two across all 32 destinations, comparing
both reference sets against both built sets. On the **navigation rail** — 81,136 compared pixels of
nothing but icons and their labels:

| pairing | rail, differing pixels |
| --- | --- |
| the recorded baseline | 2,401 – 6,676 |
| the pin removed, against the **old** reference | 3,346 – 7,432 |
| the pinned build, against the **new** reference | 4,457 – 8,574 |
| **both retaken together** | **0 – 4,411, exactly zero on 12** |

**Either change alone makes it worse on every destination but one; only both together converge.** A
pass that had removed the pin and kept the committed reference captures would have measured a correct
repair as a regression, and would very reasonably have backed it out. The single exception is
`codecs`, where removing the pin alone does lower the rail figure — named rather than absorbed into a
"most destinations".

### What it cost and bought

| figure | before | after |
| --- | --- | --- |
| `statusCell` | 1,420 pixels (9.6467%) on all 32 | **555 (3.7704%)** on all 32 |
| `brandCell` | 1,002 (15.5590%) | **846 (13.1366%)** |
| `menuCell` — the control, holding no icon | 1,886 (12.2786%) | 1,888 (12.2917%) |
| `rail` | 2.9592% – 8.2282%, never zero | **0% – 5.4366%, byte-identical on 12 of 32** |
| compared-region divergence | 4.80% – 13.54% | **2.95% – 12.20%** |
| compared fraction | exactly 29.1106% | exactly 29.1106% |
| worst-area tally | brandCell 21, tabStrip 7, sectionList 4 | unchanged |

The **mode picker's border** has left the divergence entirely. Of `statusCell`'s remaining 555
pixels, none is in the border rows; all of them are in the text band, rows 14–25. The half-pixel box
offset the previous section measured was an artifact of comparing two browsers, not a property of
either artifact.

### What this does not claim

No destination moved to `verified` and none could — all 32 still report a real chrome divergence, and
the Material Design 3 audit still reports all 32 nonconforming. The 555 pixels still differing in
`statusCell` are **not explained**: they sit in three column runs matching the check glyph and the
two labels, and nothing here says why. The rail's remaining divergence on 20 of the 32 is likewise
unexplained — it is 0 or 1 on seven of the eight `pbx`-rail destinations and larger elsewhere, and no
cause was established. And rendering both sides with one Chromium in one mode is a stronger claim
than before, not a proof that every remaining pixel belongs to the artifacts.

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

## The connection pill is data, and that decision cost two surprises

The roadmap asked one question: should `commandCell` be excluded as data? The answer is **yes**, and
the argument is short.

The cell renders `connLabel` and `connUptime`, which are `this.target.label` and
`this.target.detail` — what the console's own discovery reports about the target it found. With none
configured that is `no target` / `nothing discovered yet`; once one answers it is the discovered
distribution name and `N local target(s), connection verified`. The design invents `pbx-hq · AMI
5038` and `up 14d 06:22` in the same two spans. That is this bar's founding sentence word for word:
*the design shows invented sample content exactly where the application shows a real reading.*

It is **not** the `brandCell` or `sectionList` case, which is the objection worth answering, because
those two are also guaranteed to differ and are deliberately still compared. They differ where this
product renders different **chrome** from the design's chrome — a product name one word longer, a
per-row badge this application removed — and reporting that is what the bar is for. This cell differs
because the design invented a **reading**, which is what the bar is for excluding.

**What it costs, measured.** The compared fraction falls from exactly **29.5717%** to exactly
**28.0883%** of the frame — 404,472 pixels of 1,440,000 — still above the declared 25% floor. The
compared-region divergence falls from 6.34%–14.95% to **4.62%–13.68%**. That fall is not an
improvement in the application: nothing about the built artifact changed between those two figures.

**What it also hides, said plainly.** The region probe measures cells, not text runs, so excluding
this rectangle also excludes the pill's own border, radius, pulse dot and separator, which are
chrome. 61.00% of the cell already matched, so most of what the mask now covers is pixels that
agreed — and `excluded.diffPercentage` goes on reporting whatever it covers, 29.76%–81.88% across
the 32 against 29.56%–82.79% before.

**Two results contradicted what was expected of the move, and are recorded because they did.**

*Removing the worst area did not leave one uniform worst area behind it.* The expectation was that
`brandCell`'s identical 15.56% would become the worst everywhere. It did not: the worst compared area
is now `brandCell` on 21 destinations, `tabStrip` on 7 and `sectionList` on 4, where before it was
this cell on all 32. One area being worst on every destination at an identical figure was the
signature of a single cause; underneath it was a spread.

*`menuCell`'s divergence rose, from 12.00% to 12.28%, without one new differing pixel.* Its differing
count is 1,886 before and after. Union rectangles overlap, so excluding this cell clipped nine
columns off `menuCell`'s compared strip, and all 360 of those pixels matched. **Excluding an area can
raise a neighbour's reported percentage by removing agreement rather than by finding disagreement**,
and a reading of these numbers that misses that will attribute the rise to a regression.

**No destination moved to `verified`, and none could.** All 32 still report a real chrome divergence,
and the Material Design 3 audit still reports all 32 nonconforming.

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

So `brandCell` differs by **15.56%** and `menuCell` by **12.28%** on every one of the 32,
permanently. Both stay inside the compared region, on the same principle `sectionList` does: a
divergence worth reading in the result is not one worth hiding in a mask.

`menuCell`'s figure read **12.00%** while `commandCell` was still compared, on the same 1,886
differing pixels. Reclassifying `commandCell` as data clipped nine columns of matching pixels off
`menuCell`'s compared strip, which raised the ratio without changing one pixel of either artifact.

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

Those last two figures are what the harness repairs left behind, and they are **not** the current
ones. The `commandCell` decision moved them to 4.62%–13.68% and exactly 28.0883%; the `statusCell`
decision moved them again, to **4.80%–13.54% and exactly 29.1106%**. They are kept as written because
this list records what one pass changed, and rewriting it would make it describe a different pass.

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
