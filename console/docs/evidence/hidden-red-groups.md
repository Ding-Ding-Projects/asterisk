# One failing assertion was hiding forty-two others

Measured on 2026-08-27, at `42b961370` on `master`.

`npm test` was eleven groups chained with `&&`. That reads as an entirely reasonable thing to
write, and it meant the fourth group's first failure stopped the seven groups after it from running
at all. The exit code was `1` either way, so nothing anywhere said how much had not been looked at.

What one visible failure was covering, once every group was actually run:

| group | before | after |
| --- | --- | --- |
| `contracts` | 1 failing test | repaired |
| `site-contracts` | **33 failing tests, never reached** | repaired |
| `scripts` | 2 failing tests, never reached | repaired |
| `site` | 2 failing pins, never reached | pins repaired; 15 articles still fail the genre check they were hiding |
| `inventories` | **could not get past its own first command, never reached** | 7 of 38 commands still failing |

The one visible failure was a stale anchor: `narratedFire` had grown a third parameter carrying a
real severity, and `tests/contracts/narration.test.mjs` still asked for the old one-line signature
and a bare `{ isError }`. Two of its four anchors matched nothing. That is an ordinary, cheap
repair — and it had been standing in front of everything else for as long as it had been there.

## The runner

[`scripts/run-test-groups.mjs`](../../scripts/run-test-groups.mjs) runs every group, prints each
group's own verdict as it finishes, and ends with a summary naming every one. The exit code is
still a single bit; what changed is that a red run now says how much is red.

Replacing a chain with something that keeps going gives up the chain's one real virtue — it could
not possibly finish green after a failure — so that has to be earned back explicitly rather than by
looking careful. The verdict is therefore a pure function of what the groups did, proved in
[`tests/scripts/run-test-groups.test.mjs`](../../tests/scripts/run-test-groups.test.mjs) against
fabricated results. The first case is the empty run: a summary that returned "ok" for a run in
which nothing happened would be the worst possible defect in this file, so it is refused outright
rather than trusted never to happen.

The group list is not hand-written. The runner refuses to start unless its arguments are exactly
the set of `test:*` scripts the package declares — both directions, because a requested group that
is not declared would run nothing, and a declared group that is not requested is a suite nobody
runs, which is the same defect one layer up from the one being fixed here.

## The site inventory had reverted to a schema nothing else uses

This is what the thirty-three hidden failures were, and all thirty-three had one cause.

`console/site/feature-registry.json` was at `schemaVersion: 1`, with each row carrying `state` and
`files`. Everything that reads it wants `schemaVersion: 2`, with `status` and
`implementation.paths`: `scripts/inventory-validation.mjs` refuses any other version outright, so
`verify-inventories.mjs` — the first command of `test:inventories` — could not get past its own
opening line, and the thirty-three contracts asserting `registry.features[id].status` were each
comparing `undefined` against a real value.

The migration to schema 2 exists, on the `site-registry-schema-v2` branch, and a later merge put
the schema-1 file back. Nobody noticed, because the chain never reached either group. The four
features that landed afterwards — `context-menu-shortcuts`, `long-operation-progress`,
`in-context-recovery`, `built-in-authenticator` — were each written against `state` and `files`,
so the site contracts had quietly split into two schemas, one of which had never passed.

The repair lifts each row into the schema-2 shape rather than taking the branch's file, because
that branch predates eight features and its notes would have written over the honest current ones.
Every row keeps its own status, its own note and its own file list; only the field names and the
row skeleton change. The status vocabulary differs by one word — schema 2 says
`implemented-unverified` where schema 1 said `implemented`, which is the more honest of the two and
is what every contract was already asking for.

Cross-checked before anything moved: of the twenty-seven contracts that assert a status, **every
one already agreed with the schema-1 value it was going to be migrated from**. So the migration
changes what the rows are called and not one thing about what they claim.

Ten `negative-*-site.mjs` scripts plant a deliberate break into the registry by literal text, and
their anchors moved with the field names. All ten were retargeted and each anchor re-checked to
occur exactly once in the migrated file — one of them did not, because the three-file list it
edits is the identical text in seven other rows, so it is anchored to the tail of its own row's
note instead. A swap that hits the wrong row plants its break somewhere nothing is looking.

## Two defects found by the pins that were already there

**A modal dialog that never said it was modal.** `tests/scripts/panel-observation.test.mjs` pins
the number of dialog roles in the compiled shell against the number of `aria-modal` declarations,
and insists they match. The tab-search overlay that `scripts/extend-pbx-m3.mjs` adds after the
design is compiled had arrived carrying `role` and an accessible name and no `aria-modal`, while
painting a full-inset scrim that dismisses on click. It behaves modally whatever it declares, and a
modal that does not announce itself takes focus away from a screen reader without telling it why.
The pairing assertion is what turned an arrival into a repair rather than a number somebody bumped;
either count alone would have let it through.

**A comment in a template is markup.** The first attempt at that repair put the explanation inside
the emitted template string, so the words `aria-modal` landed in the compiled shell as prose and
the attribute count came back one too high. The explanation now sits in the surrounding script.
This is the same trap the panel-observation harness already documents from the other direction: a
sentence in an article that *mentions* an attribute is not an element carrying it.

## Hiding happens inside a test as well as between groups

`test:site` had two stale pinned counts — 78 documentation articles against 101, and 196 built
output files against 233 — both drifted by the consolidation merges while this group was never run.
Repairing them let the rest of that same test run for the first time, and it immediately named
**fifteen articles that do not carry the sections a feature article is required to carry**, plus
two that are changelog fragments filed in a feature category. `assert` stops at the first failure,
so a count at the top of a test hides everything below it exactly as a `&&` hides the group after
it.

The count pins are now stated per category rather than as one total, and the built-output pin has
the relationship it was really recording asserted beside it — one markdown article in, one HTML
page out — because a total on its own is exactly as easy to bump as it was to let drift, and it
cannot notice an article that silently stops publishing.

The seventeen, named, so the next pass does not have to rediscover them:

- `docs/agent/changelog-status-hub-client.md` — all five; it is a changelog fragment, and
  `docs/changelog-fragments/` is the category for those
- `docs/platform/changelog-logo-conversion.md` — all five; also a changelog fragment
- `docs/platform/changelog-browser-extension-transfer.md` — Behavior, Configuration,
  Failure modes, Verification
- `docs/platform/changelog-dim-sum-runtime.md` — the same four
- `docs/platform/browser-extension-download-surfaces-implementation.md` — the same four
- `docs/platform/local-file-converter-ui.md` — the same four
- `docs/platform/logo-conversion-contract.md` — Behavior, Configuration, Failure modes,
  Suggested articles
- `docs/platform/local-file-converter.md` — Behavior, Configuration, Failure modes
- `docs/platform/dim-sum-startup-runtime.md` — Configuration, Failure modes, Verification
- `docs/platform/desktop-settings-runtime.md` — Configuration, Verification
- `docs/platform/ollama-suite-manager.md` — Behavior, Configuration
- `docs/platform/appearance-runtime-core.md`, `docs/platform/export-and-bulk-core.md`,
  `docs/platform/hosted-authentication.md`, `docs/platform/operation-receipts.md` — Configuration
- `docs/platform/personal-vocabulary-upload.md` — Failure modes
- `docs/agent/status-hub-client.md` — Suggested articles

They are not repaired here. Writing five sections of plausible-looking prose into fifteen articles
would satisfy the check and mean nothing, which is the failure the check exists to prevent. The two
changelog fragments are a different job again: they are in the wrong category rather than short of
sections, and moving them changes the per-category counts pinned above, so it belongs with whoever
writes the other fifteen.

## What is still red, and why it is not fixed here

`test:site`, for the fifteen articles above, and `test:inventories`, where seven of thirty-eight
commands fail in four groups:

- **Five scripts read a matrix shape that no longer exists.** `built-interaction-evidence.mjs`,
  `operated-interaction-evidence.mjs`, `negative-evidence-claims.mjs` and the two negative scripts
  beside them expect `console/inventories/surface-completeness.json` to hold two surfaces
  (`windows-console`, `pages-site`) with `features` and `evidenceTemplates`. It holds 143 surfaces
  with `rows`, and has since `246b2bc7a`. They fail with `surface.features is not iterable` and
  `the inventory has no windows-console surface`. Repairing them is a redesign of the
  evidence-checking layer, not an anchor edit, and it is the subject of the roadmap item this pass
  belongs to rather than something to bolt on beside it.
- **`verify-inventories.mjs` is blocked on a control nobody built.** `attention-inventory.ts` has
  six wiring rows. Five are fully wired. The sixth, `next-action`, has **nine markers and eight of
  them match nothing at all** — `att_next` is in neither the design, nor `App.tsx`, nor the
  compiled shell. Only its durable key exists, in `attention-modes.ts`, along with `nextAction()`,
  `setNextAction()` and `NEXT_ACTION_MAX_LENGTH`, which nothing calls. The canonical
  "One thing at a time" mode rests on a user-chosen next action and the storage half is written and
  the control was never built: wired at one end and consumed at neither, in the repository's own
  inventory.
- **Four scripts have planted breaks that stay green.** `negative-real-sources.mjs` (1 of 19),
  `negative-dialplan-divergence.mjs` (1 of 31), `negative-changelog-site.mjs` (1 of 51: "a filtered
  export claims the range of the whole history"), and `negative-destination-route.mjs` (11 cases
  behaving backwards). Each is a real gap in what those guards can see, and each needs reading
  rather than retargeting.

Nine of the ten `negative-*-site.mjs` scripts pass once their registry anchors follow the schema.
The tenth is the changelog one above, and its failure is its own, not the schema's.

## A hazard worth knowing before running these by hand

The `negative-*` scripts plant a deliberate break into a real source file and restore it
afterwards. They do not restore in a `finally`, so one that crashes mid-run leaves the break behind
— which happened here: `negative-display-name-site.mjs` left four planted breaks in `site/app.js`,
and every command run after it produced a verdict about a tree nobody had written. The nine
verdicts after it in that pass were discarded and re-measured against a restored tree.

Run them one at a time with `git status` checked in between, and treat any run after a crashed one
as void.

## Capture records

Nothing here is a photograph. Every figure is a count taken from a command run against a stated
commit, so the "capture" is the command and the record is what it printed.

| Measurement | Value | Command | Source commit |
| --- | --- | --- | --- |
| Groups `npm test` reached before the change | 4 of 11 | `npm test` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |
| Failing tests in `site-contracts`, never reached | 33 of 670 | `node --test site/tests/contracts/*.test.mjs` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |
| Failing tests in `scripts`, never reached | 2 of 166 | `npm run test:scripts` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |
| Failing tests in `site`, never reached | 2 of 15 | `npm run test:site` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |
| Commands of `test:inventories` failing | 6 of 38 | each command run singly | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |
| Attention wiring markers matching nothing | 8 of 9, all in `next-action` | marker scan over the four owner sources | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |
| Documentation articles, pinned versus actual | 78 versus 101 | `npm run test:site` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |
| Built site output files, pinned versus actual | 196 versus 233 | `npm run test:site` | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |
| Articles missing a required section, once the pins stopped hiding them | 17, of which 2 are misfiled changelog fragments | section scan over the seven article categories | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |
| Site negative scripts passing once their anchors follow the schema | 9 of 10 | each script run singly | `42b961370fc8f2d75421fea7ce9b961c6e23dc78` |

## Capture method

Each group was run on its own with `npm run test:<group>` and its TAP totals read from the run.
The thirty-eight commands of `test:inventories` were split out of `package.json` and run one at a
time, with `git status` checked between each, because several of them plant a deliberate break
into a real source file. The attention markers were counted by extracting every
`marker('owner', "text")` pair from `attention-inventory.ts` and counting its occurrences in the
file that owner names.

## Verification boundary

The counts are of this repository at the commit named above and say nothing about any other.

The `test:inventories` figure of "6 of 38 failing" is measured **after** the site registry was
migrated, because the migration is what let the group's first command get past its opening line at
all; against the unmigrated tree the only measurable figure is "1 of 38, and the chain stops".

Nine of the thirty-eight verdicts in the first pass were discarded rather than reported, because
`negative-display-name-site.mjs` crashed before restoring the breaks it had planted and everything
after it ran against a tree nobody had written. Those nine were re-measured against a restored
tree; the numbers above are from the re-measurement.

Nothing here has been run in a browser, and no packaged artifact was built or driven. The
`aria-modal` repair is proved by the compiled shell and by the pinned counts that caught it, and no
screen reader has been asked what it now announces.

## Suggested articles

[What a panel actually offered](panel-observation.md),
[Command palette route readings](palette-route-readings.md).
