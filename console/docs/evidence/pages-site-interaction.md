# The documentation website, driven rather than described

The per-surface completeness inventory asks six things of every feature row: an implementation, a
documentation article, localized copy, a local check, a record of the feature being operated in the
built artifact, and a capture of it. Until this pass the `pages-site` surface had four of those six
for all forty-four of its rows and neither of the other two for any of them, which is why every row
read `unverified`. It was an honest state and a stuck one: the two missing artifacts are the two
that cannot be produced without running the thing.

This is the harness that produces them, and the ten rows it has closed.

Records: `release/evidence/pages-site/`.
Captures: `release/captures/pages-site/`.
Harness: [`scripts/site-drive/`](../../scripts/site-drive/), run with `npm run captures:site`.
Guard: [`scripts/site-interaction-evidence.mjs`](../../scripts/site-interaction-evidence.mjs).

## What it does

`npm run captures:site` builds the site into `site/dist`, serves that directory on a loopback port,
and runs four phases. Each phase gets its own headless browser launch, pointed at one page, against
a throwaway profile the four launches share. For each feature it operates the real controls, records
what it observed, and takes one capture.

The shared profile is the point rather than an economy. `localStorage` lives in it, so the second
phase is reading back exactly what the first phase's browser session wrote — after that browser was
shut down and a new one started. That is a stronger claim than an in-page reload, and it is the
claim the persistence evidence actually wants.

## What it covers, and what it deliberately does not

Ten features, and exactly ten: the ones `site/feature-registry.json` records as `implemented`. The
registry currently calls twenty-three of the site's features `absent` and eleven more `partial`, and
a photograph of the space where an absent feature would be is not evidence that it is there. The
guard enforces this rather than trusting the harness — a record for a feature the registry does not
call `implemented` is refused.

| Feature | The observation that needed a browser |
| --- | --- |
| `regex-builder` | The dialog reports which field opened it, accepts a valid pattern with a live match count, and names the exact error for an unterminated class rather than failing silently. |
| `bounded-overlays` | The command palette is a real top-layer modal, its rectangle sits inside the viewport, and its computed background is an opaque surface rather than transparent. |
| `non-blocking-notifications` | Changing a setting raises a toast and opens no modal at all, and the page underneath stays operable while it is up. |
| `bulk-actions` | Selecting every shown notification reports the count, and a reviewable preview naming that count appears **before** anything is dismissed. |
| `attention-modes` | Three toggles and a task reach `document.body`, and are still on after the browser has been closed and started again. |
| `local-version-history` | The action filter is built from the actions really recorded, and the history survives the settings key being deleted. |
| `personal-vocabulary-upload` | The control is present and the status honest before any vocabulary file exists, with nothing cached. |
| `collapsible-filters` | The control panel and the descriptive panel are both native `details`, and collapsing genuinely hides the contents rather than only flipping an attribute. |
| `complete-exports` | Ten formats, every one selected in turn so the loss readout is recomputed from the real rows each time. |
| `provider-markup-rendering` | The shipped release-notes renderer emits block elements and no `script`, `iframe`, `style`, inline handler or off-scheme link. |

## Two corrections the drive made to its own author

Both are recorded because the first version of each read as a site defect and was not.

**The filters panel ships open, and that is correct.** The first pass asserted that the
search-and-filter panel is collapsed by default, measured `false`, and looked like a finding. The
page ships the *control* panel open and the panels that merely describe the collection — the
coverage map, the settings page's live appearance preview — closed. That is exactly the distinction
the house rule draws, so the observation now records which kind ships which way instead.

**An empty loss statement is the honest one.** The first pass asserted that every export format
declares what it loses, measured ten empty strings, and looked like a broken disclosure. It is the
opposite: the readout is computed from the real rows, and destination rows are flat records of
plain-identifier string fields, so nothing is lost in any of the ten formats. An assertion that
every format must confess something could only have been satisfied by a readout that invented
losses.

## How the evidence is kept honest

Each record names the built page and the runtime it was taken from with their digests, the exact
subject its capture claims to show, and the complete list of debugging targets that were on the
port at the time. The guard then checks, for every record:

- the capture exists at the byte count and `sha256` the record wrote down, so a replaced or
  re-cropped picture is a different capture and is reported as one;
- the capture belongs to that feature and not to a neighbour;
- the record names the element its picture claims to show;
- the site registry calls that feature `implemented`;
- and the tracked sources it pins still hash to what they hashed to when it was driven.

That last one is deliberate and it has a cost worth stating plainly: **editing
`console/site/app.js` or `console/site/styles.css` turns every record red until the drive is run
again.** The cure is `npm run captures:site`, never an edit to the recorded digest — a record edited
to match describes no run at all. `site/dist` is generated and gitignored, so it cannot be the thing
a guard re-hashes; those two files can, and they are what the built bundle is composed from.

[`scripts/negative-site-interaction-evidence.mjs`](../../scripts/negative-site-interaction-evidence.mjs)
plants eighteen lies one at a time — a missing capture, a swapped picture, a borrowed picture, a
mangled digest, a dropped observation, a record for an `absent` feature, a stale source — and
requires each to be refused, then requires the untouched evidence to pass. Three of those were also
broken on disk for real, one at a time, and watched go red and green again.

## What the harness refuses to do

- It will not drive a browser it cannot prove is alone. Exactly one page target, at the exact URL
  asked for, and every other target must be the browser's own `chrome://` interface or a
  contentless internal one. A restored tab or an extension is refused rather than worked around.
- It will not photograph a covered subject. Every capture hit-tests `elementFromPoint` at the
  subject's centre and refuses if something else is on top — which caught a live toast sitting over
  the attention panel, and now waits for transient toasts to expire rather than deleting them from
  a document nobody would otherwise see.
- It will not photograph a subject that is off screen. The subject is scrolled into view and the
  probe point is never clamped back inside the viewport, because a clamped probe tests a pixel
  belonging to whatever is at the edge and reports a cover that is not there.

## Related

- [Automatic updates evidence](automatic-updates.md)
- [Every reading, run against a live Asterisk](live-readings.md)
- [The chrome-parity bar](design-parity-chrome-bar.md)
