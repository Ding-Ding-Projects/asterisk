# Twenty-five palette routes, driven and read

Twenty-six of the thirty-nine built-interaction records under `release/evidence/windows-console/`
carry an `observedPanelControls` field. Twenty-five of them recorded an empty list.

[`panel-observation.md`](panel-observation.md) established why, in two parts. Nothing in this
repository ever produced the field -- the selector lived in an ad-hoc paste at a driving session and
was never committed. And every one of the twenty-five readings was taken at a moment with no panel
in it, because activating a palette result closes the palette before it teleports. That pass
repaired the reader and drove exactly one of the twenty-five, which settled what a good reading
looks like and settled nothing about the other twenty-four.

This drives all twenty-five, at both of the moments that pass identified: with the palette up and
filtered, and again once whatever the result teleports to has opened.

Harness: [`scripts/ui-drive/palette-routes.mjs`](../../scripts/ui-drive/palette-routes.mjs) and
[`scripts/ui-drive/palette-route-table.mjs`](../../scripts/ui-drive/palette-route-table.mjs).
Checker: [`scripts/palette-route-readings.mjs`](../../scripts/palette-route-readings.mjs).
Contract: [`tests/scripts/palette-routes.test.mjs`](../../tests/scripts/palette-routes.test.mjs).
Deliberate breaks: [`scripts/negative-palette-routes.mjs`](../../scripts/negative-palette-routes.mjs).
Reading: [`release/evidence/ui-drive/palette-route-readings.json`](../../release/evidence/ui-drive/palette-route-readings.json).

## The route table is read out of the records, not written beside them

A hand-written list of twenty-five queries is a second authority, and it diverges from the first
the day somebody edits a record -- silently, and always in the direction of the copy being stale.
So the table is derived on every run from the records themselves: the query out of each record's
own `action` prose, the target out of its `observedTarget`.

That makes three things errors rather than omissions. A record carrying the field whose prose no
longer names a typed query fails, unless it is one of the records declared as reached another way --
there is exactly one, `regex-builder`, driven from the dashboard section-search row and the only
one of the twenty-six whose reading was not empty. A declaration that no longer matches any record
fails too, because an allowance that excuses nothing should be removed rather than left as a
comment nobody read. And a record naming a query with no target fails, because nothing would then
say what the activation was supposed to reach.

## What each route establishes

Each is a thing a passing suite cannot say, and each is in the reading rather than in this page.

**The chord opens the palette from wherever the last route landed.** Every route is entered from
the previous route's destination, which is how a person uses it and is not how any unit test
exercises it. `startedOn` records that screen. Across the run the routes were entered from ten
different screens -- `Dashboard`, `Customise everything`, `PJSIP endpoints`, `Changelog`,
`Hardware trunks (DAHDI)`, `History`, `Appearance`, `Notification centre`, `Documentation` and
`Status hub sessions` -- so this is not twenty-five readings of one starting state.

**The query filtered, and the palette says by how much.** Its own hint is recorded verbatim, so a
list that rendered unfiltered is distinguishable from one that matched: `1 of 883` for
`narrated language`, `7 of 883` for `school`.

**The typing is real typing.** `Input.insertText` through the input domain, never an assignment to
`.value`: the field is a controlled React input reading `event.target.value`, and an assignment
sets the property without producing the event, so the component would never see it and the list
would never filter -- a difference invisible in a finished screenshot.

**The control the application focused is the control the palette entry names.** This is the
assertion worth having, and it is the checker's job rather than the driver's. A reading saying
"activating this row focused `e_displayname`" is worth nothing alone, because nothing in it says
that row was supposed to reach that control. `buildPalette` gives a setting entry a `controlId` and
a destination entry none, so the row's own label and context determine what the application owed
the reader. The checker rebuilds the palette from the compiled design, finds the entry for the row
that was activated, and compares.

## Capture records

| State | Record | Read at commit | Coverage | Result |
| --- | --- | --- | --- | --- |
| Routes derived from the records | `release/evidence/windows-console/*.json` | `149907a83fcb4d13aa6ac05d8a6991bf81cb87fd` | 40 records | 26 carry the field; **25 are palette routes**, 1 is `regex-builder`, reached another way |
| Routes driven end to end | `release/evidence/ui-drive/palette-route-readings.json` | artifact `f20a66f7388979d627203fd913c153d8f8d4a001` | 25 routes, 2 phases each | **25 of 25** opened the palette on the chord; 0 refused |
| Controls the reader returned with the palette up | `release/evidence/ui-drive/palette-route-readings.json` | artifact `f20a66f7388979d627203fd913c153d8f8d4a001` | 25 routes | **266 controls**, between **2** and **60** per route, where the records recorded **0** on every one |
| Controls the reader returned after activation | `release/evidence/ui-drive/palette-route-readings.json` | artifact `f20a66f7388979d627203fd913c153d8f8d4a001` | 25 routes | **`panelFound: false` on all 25**, with its reason -- a settings screen is a page, not an overlay |
| Focused control against the compiled palette | `scripts/palette-route-readings.mjs` | `149907a83fcb4d13aa6ac05d8a6991bf81cb87fd` | 25 activations | **22 setting entries each reached the exact `controlId` its entry names; 3 destination entries focused nothing, which is what a destination entry names** |
| The record's own target, as a row label | `release/evidence/ui-drive/palette-route-readings.json` | artifact `f20a66f7388979d627203fd913c153d8f8d4a001` | 25 routes | 22 present as an exact row label; **3 name their target in prose** and are reported as such rather than counted as matches |
| Rows sharing one label | `release/evidence/ui-drive/palette-route-readings.json` | artifact `f20a66f7388979d627203fd913c153d8f8d4a001` | 25 routes | **1 route is ambiguous**: `display name` returns two rows both labelled `Display name` |
| Readings standing on the reader's control cap | `release/evidence/ui-drive/palette-route-readings.json` | artifact `f20a66f7388979d627203fd913c153d8f8d4a001` | 25 routes | **2**: `browser-style-tabs` held 63 controls and `material-appearance` 74, against a cap of 60 |
| Pictures taken | `release/captures/ui-drive/palette-routes/` | artifact `f20a66f7388979d627203fd913c153d8f8d4a001` | 50 files | one per route with the palette up, one per route where it landed; every one hashes to what the reading recorded |
| Deliberate breaks to the reading, one at a time | `scripts/negative-palette-routes.mjs` | `149907a83fcb4d13aa6ac05d8a6991bf81cb87fd` | 24 breaks | all 24 red one at a time, all 24 green on restore |
| Deliberate breaks to the harness itself, one at a time | `tests/scripts/palette-routes.test.mjs` | `149907a83fcb4d13aa6ac05d8a6991bf81cb87fd` | 5 breaks | 3 red immediately; **2 stayed green** and were both this pass's own guards, described below; all 5 red after repair and green on restore |

## Three things the run found

**A palette row label does not always identify a result.** The query `display name` returns two
rows, both labelled exactly `Display name`, separated only by their context: one on
`Endpoints · Identity`, the PJSIP endpoint's own field, and one on
`Customise everything · Identity`, the console's display name. `app-display-name.json` says in its
prose that it "clicked the 'Display name' result", and its `route` says that result was in
`Customise everything`. Those two sentences disagree, and matching on the label alone reaches the
endpoint field: the run landed on `PJSIP endpoints` and focused `e_displayname`.

This is reported rather than resolved. Silently preferring the row whose context matches the
record's prose would be a rule nobody argued for, and a reading that reported the substitution as a
match would be worth less than no reading. The reading carries
`expectedTargetAmbiguous: true` and both contexts, so the next pass can decide with the fact in
front of it.

**Three routes focus nothing, and that is correct.** `changelog-viewer`,
`offline-documentation-browser` and `status-hub` each activate a destination entry, which opens a
screen rather than revealing one control.

The dead end here is worth keeping, because it is the obvious classifier and it is wrong. This
application prints the literal context `Destination` beside a destination row -- but only when the
screen's title equals its label, which `buildPalette` decides. `Status hub`'s title is
`Status hub sessions`, so its row reads as though it belonged to that screen, and a classifier
reading the context string reports it as a *setting* that failed to focus anything. That is a
defect that does not exist, and the first version of this summary reported exactly one of them.
Reading the palette entry cannot make that mistake, so the classification lives in the checker,
which has the entry, and the driver records only what it observed.

**The reader has a cap, and two routes stood on it.** The shared collector takes at most 60
controls from one overlay. It always has, as a bare literal, and it became worth naming when
`tab` and `appearance` matched enough of this application's 883 palette entries to fill the list
exactly. A reading of exactly 60 looks identical to a panel that happens to offer 60. The cap is
`PANEL_CONTROL_CAP` now, the collector counts the controls before it cuts, and a reading standing
on the cap carries `controlListTruncated: true` beside the real number.

## Where the artifact came from

The executable driven here was built from `f20a66f7388979d627203fd913c153d8f8d4a001`, while the
harness ran from `149907a83fcb4d13aa6ac05d8a6991bf81cb87fd`. Those are different commits and the
reading says so in two separate fields rather than one that quietly means whichever the reader
assumes.

**It says so because the previous reading's did not.** `command-palette-reading.json` carries a
field called `commit`, documented in the driver as "the commit the ARTIFACT was built from" and
produced by `git rev-parse HEAD`, which is the commit the *driver* ran from. Those coincided in
that run, so nothing was wrong and nothing said the two were different things. Here they came
apart, and the field would have said something false. It is now `harnessCommit`, and the artifact's
commit is a separate field that is not taken on trust: this run drove the same executable as that
one, the two records must therefore name the same digest, and the checker refuses the reading if
they do not. The provenance is a chain between two committed files rather than a sentence.

`appSourcesChangedSince` lists what moved in `console/app`, `console/shared` and
`console/package.json` between those two commits, and the checker re-derives that list with git
rather than believing it. Where a clone does not hold both commits it says so in its own output
instead of passing silently on an unverified list.

## Capture method

The packaged executable was started on a named off-screen Windows desktop by
[`scripts/launch-on-hidden-desktop.ps1`](../../scripts/launch-on-hidden-desktop.ps1), under a
`--user-data-dir` created for the run and deleted with it, with a loopback debugging port. Nothing
touched the visible desktop, the cursor or the foreground window.

The driver connects through [`scripts/ui-drive/cdp.mjs`](../../scripts/ui-drive/cdp.mjs), which
refuses to return unless the endpoint offers **exactly one** page target -- not one acceptable
target among several, which proves nothing. Both surfaces belonging to no flow are cleared before
any reading: the onboarding wizard a fresh profile opens on, whose absence is then proved rather
than assumed, and the update banner, which arrives after its own background check and so cannot be
dismissed once at startup. The banner comes back on its own as that check moves on, so every phase
records its text verbatim rather than claiming a clear screen its own pictures contradict.

Each route then presses Escape and proves the palette is down before sending its own chord, since a
chord sent while the palette is already up would close it and the reading would be of a screen. The
chord is a real `Input.dispatchKeyEvent` and the query a real `Input.insertText`; neither calls the
application's own handler, which would only prove that a function agrees with itself.

Two pictures per route, one with the palette up and filtered and one where activating landed, are
written to `release/captures/ui-drive/palette-routes/` and their digests into the reading. Fifty
files, and the checker re-hashes every one of them on each run.

The deliberate breaks were applied one at a time by
[`scripts/negative-palette-routes.mjs`](../../scripts/negative-palette-routes.mjs), which refuses to
report a case whose edit did not actually land -- an unmatched replacement reports success and
changes nothing, and "no effect" then reads exactly like a passing guard. The five breaks to the
harness itself were applied by hand to one file at a time, each with the same did-it-land check,
and the two that stayed green are named below rather than quietly repaired.

### The two guard breaks that stayed green

Both were written earlier in this same pass, which is the useful part: a guard is at its weakest
immediately after it is written, while its author still believes it.

- **Commenting out the collector's own `operableControls` line left the whole suite green.** The
  truncation flag would then read `null` forever and no reading could ever be told from a complete
  one -- but every test handed `summarisePanel` a panel object of its own making rather than one the
  collector built, so the consumer was well guarded and the producer was not guarded at all. That
  is this repository's oldest recurring shape, arriving from the producer side again. The contract
  now asserts the line itself, anchored to a whole line, because a needle for the bare property
  name is satisfied by exactly the commented-out form that is how such a line usually dies.
- **The assertion that the cut uses the named cap read the rendered template.** `PANEL_CANDIDATES_SOURCE`
  is a template string, so `.slice(0, 60)` and `.slice(0, ${PANEL_CONTROL_CAP})` render to the same
  characters and the assertion could not tell them apart -- a guard moving with the constant it
  guards, which this harness's z-index check had already been once before. It reads the file source
  now, where the interpolation is visible.

## Verification boundary

**No windows-console record was rewritten and no inventory row moved to `verified`.** The position
is unchanged at 4 of 88. These readings live in their own file under `release/evidence/ui-drive/`,
deliberately apart from the per-feature records, for the same reason the first one does: they are
evidence about routes, taken in one run, and merging them into records taken in a different run
against a different build would describe a run that never happened.

**Nothing here operates a setting.** Every route reveals and focuses a control and then leaves it
alone, so nothing in this file says what any of these features *do*. That distinction is the whole
subject of [`operated-interaction-evidence.mjs`](../../scripts/operated-interaction-evidence.mjs),
which refuses a `verified` row whose record operated nothing -- and these readings do not satisfy
it, deliberately, because they were not taken to.

**The application was not rebuilt for this run.** It is the executable the previous reading was
taken from, driven again; between its commit and this one the application's own sources moved by
two generated bundle files and nothing else, which the checker re-derives rather than asserts.

**Two of the twenty-five control lists are truncated**, and the controls past the cap were never
read. The number beside each says what the panel actually held.

**One route reached a control its record did not intend.** `app-display-name` is recorded as
landing on `PJSIP endpoints`, because that is what happened; whether the record, the palette or
neither needs repairing is a decision this pass did not make.

## Suggested articles

- [What a panel actually offered, read rather than remembered](panel-observation.md) -- the harness
  this run used, why the field had no producer, and the first reading ever taken with it.
- [Design parity: the chrome bar](design-parity-chrome-bar.md) -- the other place in this project
  where a measurement had to be separated from the equipment taking it.
