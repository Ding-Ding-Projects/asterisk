# What a panel actually offered, read rather than remembered

`observedPanelControls` is a field in the built-interaction records under
`release/evidence/windows-console/`. Twenty-six of the thirty-nine committed records carry it.
Twenty-five of those recorded an empty list.

The field is not decorative. [`scripts/operated-interaction-evidence.mjs`](../../scripts/operated-interaction-evidence.mjs)
reads it and refuses a `verified` inventory row whose record does not carry a non-empty one, on
the grounds that a row claiming proof must show the feature behaving rather than merely being
photographed. So the field is consumed.

Nothing in this repository ever produced it. A search of the whole tree finds
`observedPanelControls` in the two guard scripts, in the records themselves, and in one contract
test, and in no script that writes one. The selector lived in an ad-hoc paste at a driving session
and was never committed, so it could not be reviewed, could not be tested, and could not be fixed
once. Twenty-five empty readings are what that looks like from the outside — a field wired at one
end and consumed at neither, arriving from the producer side for once.

Harness: [`scripts/ui-drive/observe-panel.mjs`](../../scripts/ui-drive/observe-panel.mjs).
Contract: [`tests/scripts/panel-observation.test.mjs`](../../tests/scripts/panel-observation.test.mjs).

## Two properties of this application that defeat the obvious reader

Both are measured off the compiled shell by the contract test rather than remembered here, so a
change to either fails the suite rather than quietly changing what the harness means.

**This application used to declare almost no roles, and exactly one dialog role.** When this
harness was designed, the compiled shell — effectively the whole console interface — contained zero
`role` attributes and zero accessible-name attributes, and the only `dialog` role anywhere was the
command palette's card in `App.tsx`. That is what forced the reader below to fall through to
`textContent`.

> **Corrected again on 2026-08-27.** The sentence above was left in the present tense after
> accessibility work landed, so this article went on saying "zero" while
> [`tests/scripts/panel-observation.test.mjs`](../../tests/scripts/panel-observation.test.mjs)
> pinned **33** declared roles, **28** accessible-name attributes and **15** dialog roles in the
> same file. The counts live in the test, measured off the shell on every run; this article keeps
> the reasoning and no longer keeps a copy of the numbers, because a second copy is a second thing
> to go stale. What has *not* changed is the consequence: the fall-through to `textContent` is now
> a choice nobody has revisited rather than a necessity.

> **Corrected on 2026-08-26.** This section used to say that *no* element anywhere carried the
> dialog role, so a selector for it "matches nothing under any state" and a count of it "can only
> ever be zero". That was false the whole time it was written down, and false about the one surface
> it mattered most for: all twenty-five of the empty records were driven through the palette. The
> test guarding the claim could not see it. Its needle was the JSX spelling `role="dialog"`, and
> this renderer is hyperscript, which writes `role: 'dialog'` — so it reported absence and had
> never once looked. Measured on a tree deliberately carrying the role in **two** places, the old
> needle still came back with an empty list.
>
> The number now comes from the packaged application rather than from a reading of the source.
> [`release/evidence/ui-drive/command-palette-reading.json`](../../release/evidence/ui-drive/command-palette-reading.json)
> records `dialogRoleElements` as **0** before the chord, **1** while the palette is up, and **0**
> again once a result is activated.

`drive.mjs` counted elements carrying the dialog role as its `dialogs` reading, recorded it either
side of every click, and used it in the flag that decides whether a click changed anything. With
one surface in a dozen declaring the role, that reading moved for the command palette and stayed at
zero for the wizard, the info sheet, context menus, the appearance drawer, the lock and unlock
sheets, the confirmation gate, the colour picker and the regex builder — so the "did this click
open something" test was blind to almost every outcome it needed to see. `gallery.mjs` printed
`(a dialog was still open)` beside a screenshot on the same reading.

**The z-index scan stays, and the reason is now stated rather than assumed.** One element in one
state is not a reader: a driver choosing panels by the dialog role would be right about the palette
and blind everywhere else. The contract test therefore keeps the ban on that selector for every
driver that *chooses* a panel, and names the single script allowed to *count* it.

**Icon ligatures put their own name in the DOM, before the label.** The shell renders 175
`<span class="msym">` Material Symbols spans, and an icon-bearing control emits its icon span
first. So `textContent` on the regex builder's first tool button reads `backspaceDelete last`, not
`Delete last`. Every control name `drive.mjs` recorded carried its glyph name glued to the front,
and any comparison against a name a person had written could never match.

## The dead end, kept where it can be seen

`gallery.mjs` stripped the ligature with the prefix pattern `/^[a-z_]+(?=[A-Z])/`. It is the
obvious fix, it handles `backspaceDelete last` correctly, and it is wrong: it needs a capital
immediately after the glyph name, so it silently strips nothing from any label that begins
lowercase. The regex builder's own flag chips render as `checki · ignore case` when the flag is
on — and the default state has one flag on, so this is the ordinary case rather than a corner.

`stripLigaturePrefix` in the harness keeps that behaviour, exported and tested, with an assertion
pinning the lowercase failure, so nobody reaches for it again. The browser side does not use it.
It removes the icon elements from a clone and reads what is left, which is exact and cannot
mis-fire on a lowercase label — and reading a clone leaves the live application untouched, which
matters when the thing being measured is its state.

## How a panel is identified without a role

By stacking order, which this application is unusually disciplined about. Every literal `z-index`
in the shell is either at most 6 — rails, sticky headers, ordinary page chrome — or at least 55:
the setup wizard, the info sheet, the command palette, context menus and their submenus, the
appearance drawer, the lock and unlock sheets, the confirmation gate, the tab filter, the colour
picker, and the regex builder at 96 and 97. There is nothing in between.

So `OVERLAY_Z_FLOOR` is 55, and an overlay is a positioned element at or above it. Among those,
the panel is the highest one that actually holds something operable — a scrim is the sibling one
level below with nothing inside it — and where two share a level the smaller wins, because a
full-viewport flex container that centres a card reports the same level as the card and the card
is the panel.

**One surface does not have that shape, and the first real reading is of exactly that surface.**
The command palette's scrim *wraps* its card rather than sitting beside it, and `.palette-card`
declares neither `position` nor `z-index`, so the card is never a candidate and the scrim is what
gets chosen. The controls found are still the card's, because they are inside it — but the
rectangle reported is the whole viewport, `coversViewport` is true, and a palette can therefore
never read as anchored to anything. All three are true of the reading and all three are in it. The
contract test reads both rules out of `styles.css` on every run, so a card that gains a position or
a scrim that loses one fails the suite instead of quietly changing what a reading means.

The one interpolated `z-index` in the shell is the dialplan canvas, which is `94` when fullscreen
and the keyword `auto` otherwise. The keyword parses to `NaN` and is rejected; the number is a
genuine overlay and is correctly treated as one.

## What the harness reports

`observedPanelControls` is a list of strings, because that is the shape the guard checks. The
fuller readings travel beside it in `panelControlReadings`, each naming how the label was arrived
at: an accessible name where one exists, then the text with the icons removed, then the `title`
this application sets on its icon-only controls.

**The ligature hazard has a second shape, and only a real reading found it.** The first run came
back with a palette row named `languageHardware trunks · Signalling & routing`. `textContent` puts
nothing between adjacent element children, and a palette row is two top-level spans — its label and
the context it sits in. The reading was not missing; it was two different fields glued into one
word, which reads as a broken label and can never match a name a person wrote down. The browser
side now hands the top-level runs back separately and `readControlLabel` joins them with a space,
in Node, where it is a pure function with a test. Top-level only: descending further would start
putting spaces inside words a component split across spans for styling.

A control that has none of those is reported with `source: "icon"` and is deliberately kept **out**
of `observedPanelControls`. A glyph name is a finding — this control has no name a person can read
— not a control label, and letting it into the list would let a panel of unlabelled icons satisfy
a guard that exists to show a panel was operable.

A screen with no panel open records `panelFound: false` and the reason, never an empty control
list. Those two are the readings that look identical in a record and mean opposite things, and
telling them apart is most of the point: an empty list beside `panelFound: true` is exactly the
shape of the twenty-five records this work exists to stop being written again.

Where a caller supplies the control the panel was opened from, the record carries both rectangles
and the measured gap between them beside `anchoredToOriginatingField`, so the flag can be argued
with rather than merely believed. It is a geometric reading: a panel the application positions by
percentage, or one the user has dragged, will legitimately read false, and a panel covering the
viewport can never read true.

## Capture records

The first table is the tree-read evidence the design rests on. The second is the first reading
ever taken with this harness from a running build, added on 2026-08-26 — the section directly
below it says what that reading did and did not settle.

| State | Record | Read at commit | Coverage | Result |
| --- | --- | --- | --- | --- |
| Producers of `observedPanelControls` anywhere in the tree | tree-wide search for the field name | `56ca283dccfae7b9226d17950193266482605f00` | whole repository | two guard scripts, 26 evidence records, one contract test, and **no script that writes one** |
| Committed records carrying the field | `release/evidence/windows-console/*.json` | `56ca283dccfae7b9226d17950193266482605f00` | 39 records | 26 carry it; 25 of those recorded an empty list |
| Role attributes in the compiled shell | `app/renderer/src/generated/console.tsx` | `56ca283dccfae7b9226d17950193266482605f00` | 6,277 lines | zero roles, zero accessible-name attributes |
| Roles anywhere in the renderer, JSX spelling only | `app/renderer/src/**/*.{ts,tsx}` | `56ca283dccfae7b9226d17950193266482605f00` | whole renderer | four: two `alert`, two `status`. **This is the reading that produced the "no dialog role at all" claim, and it is a partial count** — it can only see `role="…"`, and this renderer is mostly hyperscript |
| Roles anywhere in the renderer, both spellings | `app/renderer/src/**/*.{ts,tsx}` | `f20a66f7388979d627203fd913c153d8f8d4a001` | whole renderer | eleven: the four above plus `button`×2, `option`, `listbox`, `complementary`, `status`, and **one `dialog`** on the command palette's card |
| Accessible names outside the shell | `app/renderer/src/**/*.tsx` | `56ca283dccfae7b9226d17950193266482605f00` | whole renderer | six, which is why the reader still prefers one where it exists |
| Icon ligature spans in the shell | `className: "msym"` occurrences | `56ca283dccfae7b9226d17950193266482605f00` | 6,277 lines | 175, emitted before the label on every icon-bearing control |
| Literal stacking levels in the shell | `z-index:` occurrences | `56ca283dccfae7b9226d17950193266482605f00` | 22 distinct values | page chrome tops out at 6, overlays start at 55, nothing between |
| The one interpolated stacking level | `canvasZ:s.fullscreen ? 94 : 'auto'` | `56ca283dccfae7b9226d17950193266482605f00` | 1 site | `94` is a real overlay; `auto` parses to `NaN` and is rejected |
| Deliberate breaks, applied one at a time | `tests/scripts/panel-observation.test.mjs` | `56ca283dccfae7b9226d17950193266482605f00` | 21 breaks | 19 red on the first attempt; **2 stayed green** and are described below |
| The same 21 breaks after both guards were repaired | `tests/scripts/panel-observation.test.mjs` | `56ca283dccfae7b9226d17950193266482605f00` | 21 breaks | all 21 red one at a time, all 21 green on restore |
| The whole suite with the harness wired in | `npm test` | `56ca283dccfae7b9226d17950193266482605f00` | 3,713 assertions | 3,713 passed, 0 failed |

### The first reading taken from a running build

Taken by [`scripts/ui-drive/palette-reading.mjs`](../../scripts/ui-drive/palette-reading.mjs)
against the packaged executable built from `f20a66f7388979d627203fd913c153d8f8d4a001`, launched on
an off-screen Windows desktop under a throwaway profile, driven over loopback Chrome DevTools
Protocol with exactly one page target proved before anything was evaluated. The query typed is
`language`, which is the exact query `language-modes.json` records — so this is a reading of one
of the twenty-five routes, not a convenient example.

Every row below is the same five-column shape as the table above, so each one names the commit the
artifact it was read from was built at.

| State | Record | Read at commit | Coverage | Result |
| --- | --- | --- | --- | --- |
| Elements carrying the dialog role, packaged build | `release/evidence/ui-drive/command-palette-reading.json` | `f20a66f7388979d627203fd913c153d8f8d4a001` | 3 phases of one route | **0** before the chord, **1** while the palette is up, **0** after a result is activated |
| Controls the reader returned | `release/evidence/ui-drive/command-palette-reading.json` | `f20a66f7388979d627203fd913c153d8f8d4a001` | same 3 phases | `panelFound` false / **true** / false; `observedPanelControls` 0 / **11** / 0 entries |
| The panel the z-index scan chose | `release/evidence/ui-drive/command-palette-reading.json` | `f20a66f7388979d627203fd913c153d8f8d4a001` | 1 candidate considered | `.palette-scrim`, z-index 1000, 1440×922, 1 input — the scrim, never the card |
| The chord, sent as a real key event | `release/evidence/ui-drive/command-palette-reading.json` | `f20a66f7388979d627203fd913c153d8f8d4a001` | 1 press | the palette opened; `.palette-card` present where it had not been |
| What the palette searched | `release/evidence/ui-drive/command-palette-reading.json` | `f20a66f7388979d627203fd913c153d8f8d4a001` | 883 entries | its own hint read `10 of 883`, so 10 matched a real query rather than a list rendering unfiltered |
| Where activating a result landed | `release/evidence/ui-drive/command-palette-reading.json` | `f20a66f7388979d627203fd913c153d8f8d4a001` | 1 activation | heading `Hardware trunks (DAHDI)`, `focusedControlId` `da_language` — the exact control, focused |
| The two captures | `release/captures/ui-drive/palette-open-filtered.png`, `palette-after-activation.png` | `f20a66f7388979d627203fd913c153d8f8d4a001` | 2 states | both hash to what the record wrote down; both carry the update banner, which the record records rather than claims away |

Four notes on the rows above, each about a sentence that had never been checked before this run:

- **`Ctrl+Shift+F` reaches the handler in the packaged build.** It was sent as a real key event
  through the input domain, never by calling the application's own toggle, which would only prove
  that a function agrees with itself. Every one of the twenty-five records says the chord was used.
- **The query was typed, not assigned.** `Input.insertText` rather than setting `.value`: the field
  is a controlled React input reading `event.target.value`, and an assignment sets the property
  without producing the event, so the component would never have seen it and the list would never
  have filtered — a distinction that would have looked identical in the finished screenshot.
- **Teleporting is not landing nearby.** Landing on the right screen and leaving somebody to hunt
  for the row is the failure `focusedControlId` distinguishes, and it is a reading no screenshot
  states outright.
- **The update banner was up, and the record says so.** `Later` is clicked before any reading is
  taken, and the banner returns on its own once the background check moves to downloading, so both
  captures carry `Downloading update (0.1.264)…` in a strip above the title bar. It covers no part
  of the palette. It is recorded as `updateBanner` rather than dismissed in prose, because a record
  claiming a clear screen while its own picture shows a banner is describing a different picture.

## Capture method

None of the readings above came from a running program, and none of them needed to: every one is
a property of the committed tree, read from the tree, and re-read by the contract test on every
run so it cannot go stale silently. The counts in the table were taken by search; the assertions
in `tests/scripts/panel-observation.test.mjs` re-derive each of them from the same files and fail
if they move.

The deliberate breaks were applied one at a time by a scratch script that refused to proceed when
its edit did not actually land — an unmatched replacement reports success and changes nothing,
and "no effect" then reads exactly like a passing guard. Each break was applied, the suite run,
the file restored byte for byte, and the suite run again to confirm green before the next break
was applied. Nineteen assertions in this file, run inside `npm test` through `test:scripts`.

## Verification boundary

**The harness has now observed one real panel, and one only.** The reading above is of the command
palette, on one route, on one screen, from one build. It settles the two things it was taken to
settle — that the reader returns real controls when a panel is genuinely up, and that a reading
taken *after* a palette result is activated has no panel in it at all — and it settles nothing
about the other twenty-four routes.

**Nothing in the 39 committed `release/evidence/windows-console/` records changed, and no inventory
row moved to `verified`.** The position is unchanged at 4 of 88. This reading lives in its own file
under `release/evidence/ui-drive/`, deliberately apart from the per-feature records, because it is
evidence about the harness rather than evidence about a feature.

**What it does close is the reason those twenty-five lists were empty**, and the answer is not the
one the previous pass expected. A missing selector was half of it. The other half is that all
twenty-five readings were taken at the wrong moment: activating a palette result closes the palette
before it teleports, so there was no panel to read. `observedPanelControls: []` beside no
`panelFound` field is exactly what that looks like. The repaired reader records `panelFound: false`
with `whyNoPanel` at that moment instead, which is the same fact stated so it cannot be mistaken for
a panel that offered nothing.

So the next pass drives the remaining twenty-four routes knowing where the reading has to be taken:
with the palette up, and again once whatever the result teleports to has opened — not once, after
the click, when neither is true.

> **Done, on 2026-08-26.** All twenty-five palette routes have been driven, at both of those
> moments, and the readings are in
> [`release/evidence/ui-drive/palette-route-readings.json`](../../release/evidence/ui-drive/palette-route-readings.json).
> The field that recorded an empty list twenty-five times now holds **266 controls**, between 2 and
> 60 per route. [`palette-route-readings.md`](palette-route-readings.md) is that run: what it
> established, the three things it found, and what it still does not claim. This paragraph's
> prediction held: every one of the twenty-five reported no panel after activation, which is what
> the empty lists were a reading of.

Two of the twenty-one breaks were applied to guards written earlier in the same pass and **stayed
green**, which is the part worth recording:

- The z-index check asserted that the lowest overlay equalled `OVERLAY_Z_FLOOR`. That is true of
  any floor landing on a real value, so moving the floor from 55 down to 6 — into the middle of
  the page chrome — passed. A guard that moves with the constant it guards cannot catch the
  constant being wrong. It now measures the empty band from the shell alone and requires the floor
  to sit inside it.
- The comment stripper that keeps a scan for forbidden code from being satisfied by prose
  describing that code checked only that stripping made the file shorter — which dropping blank
  lines alone achieves. Defeating the stripper entirely passed. It is now checked against a sample
  containing a marker in three comment shapes and two lines of real code.

The generated shell must not be hand-edited, so the assertions about its own DOM were exercised by
pointing the scan at a renderer source that does declare roles, and the dialog-role scan by
temporarily giving a hand-written component that role. Both went red.

**And the third failure of that kind, found on 2026-08-26 and worth more than either of the two
above, because it is the one a deliberate break did not catch.** The dialog-role scan *was* broken
on purpose and it *did* go red — and it stayed blind anyway. The break was written in the JSX
spelling the needle expected, `role="dialog"`, and applied to one of the four JSX components; the
palette card is hyperscript and writes `role: 'dialog'`, which the needle cannot see. So the guard
was proved able to fail on the shape it was looking for, while remaining unable to fail on the
shape the codebase actually uses.

That is the general lesson: **breaking a guard in the form its needle expects proves the needle
fires, never that the needle is the right one.** Break it in the form the code is really written
in. Re-measured here — on a tree deliberately carrying the dialog role in *two* places, one
hyperscript and one already present, the old needle returned an empty carrier list; the replacement
returns both. The replacement reads every attribute spelling this codebase uses, asserts the exact
set of files carrying the role and the exact count within `App.tsx`, and pins it to the palette
card. **Fourteen deliberate breaks, one at a time: all fourteen red, all fourteen green on
restore.** Five on the dialog-role assertions — the role removed; a second carrier file in the
hyperscript spelling; a second role inside `App.tsx`; the card's anchoring class renamed; the role
pushed out of the card's attribute block — one on the prose-bundle exclusion, four on the
stylesheet assertions, two on the label runs, and two on the driver allowance.

**One of those fourteen exists because writing this correction caused the failure it now guards.**
The scan walks every `.ts`/`.tsx` under `app/renderer/src`, and `docs-bundle.ts` is every
documentation article serialised as string data — so the paragraph above, quoting the attribute,
became a second "carrier" the moment the bundle was regenerated, and the suite went red on prose
about a defect rather than on the defect. A sentence mentioning an attribute is not an element
carrying it. Both prose bundles are excluded by exact path rather than by a `generated/` rule, since
`console.tsx` and `m3-control.tsx` live there too and are the markup the scan exists to read, and
each exclusion asserts that its file still exists and still declares itself generated — an excuse
for a file that is not there any more is an excuse nobody can check, and a renamed bundle would
rejoin the scan as a false carrier.

## Suggested articles

- [Every reading, run against a live Asterisk](live-readings.md) — the same discipline applied to
  command output rather than to a rendered panel, and the two guards there that could not go red.
- [What `statusCell`'s remaining pixels are](statuscell-text-pixels.md) — measuring a rendered
  frame rather than reasoning about the stylesheet that produced it.
- [The per-destination Material Design 3 audit](design-parity-material-audit.md) — the other place
  a machine writes a verdict about the interface, and what constrains it.
