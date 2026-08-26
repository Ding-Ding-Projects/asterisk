# In-app changelog viewer

A browsable record of every released version, filterable by date and searchable by text, with export and per-entry commit links.

## Behavior

The viewer lists every released version, newest first, with its release date and its changes grouped by category. Each change carries the real commit that made it, rendered as a short id linking to that commit in the repository. A date range and a text search narrow what is shown; they compose rather than override one another, so a search restricted to a week returns what that search found *within* that week. Whatever is on screen is what exports.

The content is a **factual external record**, and that distinction decides most of the design. Every other string these surfaces render is their own copy — restyled by the funny-level sliders, rewritten by a local personal-vocabulary file. A change summary is neither of those. It is what a release said, and a viewer that restyles it has stopped being a record of anything. So the funny-level copy reaches the description *around* the list and nothing inside it, and the list is held outside the vocabulary walker.

The data is real or it is absent. `scripts/bundle-changelog.mjs` builds the Markdown from this repository's own tags: every version heading is a real tag, every change line is a real commit reachable from that tag and not from the one before it, and every id is the real 40-character SHA. Nothing is authored by hand and nothing is invented to fill a gap.

## Configuration

Nothing about the changelog is a stored setting except whether its search-and-date panel is expanded, which persists per visitor like every other collapsible on the site.

The description above the list follows the language mode and both funny-level sliders. The entries do not, deliberately and permanently — see above. Version numbers, dates, commit ids, the match counts and the stated range are facts and are exact at every setting.

## Current status

**Desktop application:** Partial. `App > Changelog` renders every version parsed from the build-time bundle, with plain-text and regular-expression search, a date range, copy and Markdown export, and per-change commit links. Its remaining gap, recorded in `app/feature-registry.json`, is that the date filter is typed ISO fields plus range presets rather than the full month-and-year-jump calendar grid the contract describes.

*This line was corrected on 2026-08-26.* It previously read "Not implemented. The desktop application has no in-app changelog viewer", which had been false for some time: `app/renderer/src/changelog.ts`, `tests/ui/changelog.test.tsx` and `tests/ui/changelog-wired.test.tsx` were all present and the registry already recorded the screen as wired. The claim above is taken from that registry row and those tests; this pass did not independently drive the desktop application.

**Documentation website:** Implemented. `downloads.html` carries a `CHANGELOG` section, reachable from the page's own section tabs, holding the description, a collapsible search-and-date panel and the version list.

The panel carries a search field with the site's anchored regular-expression builder beside it and its own plain-versus-regular-expression mode line; a preset select (every version, this calendar year, the last 90, 30 or 7 days); two native date fields; an export-format select filled from whichever formats the shared export engine judges suitable for the rows currently shown; and Export and Copy actions.

Two properties of the website version are worth stating because they are the parts that could have been faked. First, the two date bounds are native date fields, which is what supplies the calendar with its month and year jump, and what makes a half-typed date detectable: such a field reports an empty value and `validity.badInput`, so the code reports the problem inline and leaves the field alone rather than writing to it, and what the reader typed survives. Second, the exported file states its own range on every row. A single metadata row carrying different keys would make the whole set ragged, and five of the ten formats would then correctly report that as a real loss; a repeated column costs bytes and says the same thing in CSV, JSON and SQL alike.

## Failure modes

**A commit that no longer exists.** `site/build.mjs` hands every referenced id to a single `git cat-file --batch-check` before it will emit a link. A commit git reports missing fails the build. Where git cannot answer at all — no git on the machine, a checkout too shallow to hold the objects — the history still ships and the repository URL is dropped, so every id renders as plain text with no link on it. That is deliberate rather than a shortcut: the promise is *never a dead link*, and emitting no link keeps it exactly, while failing the build would take an unrelated deploy down with it.

**A malformed id anywhere else.** `changelogCommitUrl` refuses anything that is not exactly 40 hexadecimal characters, and refuses a repository that is not an `https` URL. It returns nothing rather than composing a URL out of what it was given.

**A line that does not match the grammar.** It is counted and the count is reported above the list, rather than dropped in silence. A viewer showing half its input is otherwise indistinguishable from one reading a short release history. Two versions in the current real history carry `Release published; no new commits recorded against the previous tag.` — a real line, deliberately not a change entry — so they are counted there and their versions render with an honest "no changes were recorded" body instead of disappearing.

**A build with no history.** The committed `site/app.js` ships both declarations empty, and a page served straight from the source directory says so plainly rather than showing a stale copy baked in months earlier. That message is distinct from the no-match message, so a build problem never reads as the reader's search being too narrow.

**A range that cannot contain anything.** A "from" after its "to" is reported in words naming both dates, rather than rendering as an empty list that reads as "there are no releases".

## Accessibility and localization

Every control in the panel has its own label, the section is labelled by its own heading, and the count, range and problem lines are live regions so a change in the filter is announced rather than only drawn. The commit id keeps a visible contrast ratio against the surface rather than being dimmed into decoration — it is the one part of an entry a reader can check for themselves. The entry header collapses from a row to a stack at narrow widths so a version and its date never overlap.

The description carries four English and four Cantonese variants, and every one of the eight states the two facts the viewer rests on: that each line carries the real commit, and that what is exported is what is on screen. A fact stated at some funny levels and not at others is a fact nobody can rely on. The section heading, the control labels and the count and range lines are still fixed English.

## Verification

`site/tests/contracts/changelog-viewer.test.mjs` — 40 tests. The behavioural half extracts the real functions from `site/app.js` and runs them against the **real generated release history**, not an invented fixture: a parser proved only against text written to suit it has been proved against nothing. It also pins the site's three grammar regular expressions equal to the desktop renderer's, so the two cannot come to read one generated changelog differently.

`scripts/negative-changelog-site.mjs` plants **41 breaks, one at a time**, each of which turns that file red and green again on restore. Two of the first run's failures were this pass's own guards rather than the code: an assertion that a control was wired was satisfied by the closure that merely *reads* that control's value, and an assertion that the first render happens was satisfied by any of the handlers that also call it. Both are now anchored to a line and to the function's closing brace respectively, and both then went red alone and green on restore.

The desktop application's own coverage is `tests/ui/changelog.test.tsx` and `tests/ui/changelog-wired.test.tsx`.

## Suggested articles

[Local version history](local-version-history.md), [Complete exports](complete-exports.md), [Regex builder](regex-builder.md), [Status hub](status-hub.md), [History and git](../app/history.md), [Platform feature index](README.md).
