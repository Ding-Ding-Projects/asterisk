
# Material Asterisk operations

Every route below was executed in this repository and produced the stated result. Where a
route failed, the failure is recorded too, because the failures here are the expensive part.

## Build and package

    build.bat /s              # renderer + main process, ~32s warm
    build-installer.bat /s    # full Squirrel.Windows set, ~8m

**Invoke by absolute path from automation.** `NoDefaultCurrentDirectoryInExePath` makes
`cmd /c build.bat` fail with "is not recognized" even when the working directory is right
and the file is plainly there. Use:

    MSYS_NO_PATHCONV=1 cmd /c "cd /d <repo> && <repo>\build.bat /s"

Both halves matter: without `MSYS_NO_PATHCONV`, the shell rewrites `/s` to a drive path and
the build goes interactive.

**Nothing else may touch `node_modules` while these run.** `npm ci` deletes and recreates
it, so a test run or a live Electron instance holding a file produces `npm ci exited -4048`
— a file-in-use error that reads like a corrupt install. Stop every Electron process first
and run the suite and the build one at a time. Two separate failures in one session came
from ignoring this.

## The bundled runtime payload

`console/resources/asterisk-wsl-rootfs.tar` (~315 MB) and its `.json` are **gitignored**;
they never enter history. Packaging refuses to reuse a payload whose `sourceCommit` differs
from the commit being released — correct behaviour, not a defect — so a release from a new
commit rebuilds it, which needs a working local container engine.

If the engine is down, packaging fails with *"Docker is installed but its Linux engine is
unavailable"*. Start it without disturbing the visible desktop by launching Docker Desktop
on an off-screen desktop through the cheap headless route, then poll `docker info` until
`OSType` reports `linux`.

## Verification

    cd console && npm test    # 8 sub-suites, ~3200 assertions

Read the **exit code**, not just the failure count: several gates live outside the test
runner (inventory validation, generated-file freshness, negative regressions), so a run can
report zero failures and still exit 1. When it does, the cause is in the last twenty lines.

A failure under load is not automatically a regression. Re-run the single file alone before
concluding anything — a renderer test failed once in a contended run and passed 28/28 in
isolation. Equally, a test that fails at exactly the configured timeout timed out; it did
not assert anything false.

### Committed generated files

Two generated files are committed rather than built on demand, and each has a drift check that
compares the committed copy against a fresh generation:

| File | Generator | Scratch override | Drift check |
| --- | --- | --- | --- |
| `app/renderer/src/generated/*` (the design compile) | `scripts/compile-design.mjs` | `DING_DESIGN_OUT_DIR` | `tests/ui/design-drift.test.mjs` |
| `app/renderer/src/generated/docs-bundle.ts` | `scripts/bundle-docs.mjs` | `DING_DOCS_OUT_FILE` | `tests/ui/docs-drift.test.mjs` |

The scratch override is what makes each check able to fail. A check that regenerates over the file
it is about to read compares that file with itself, always passes, and leaves the working tree
dirty for whoever runs the suite next. The docs bundle was checked that way and drifted by two
articles across a merge — `npm run build` regenerates it, so no release was affected, but every
reader of the checked-in tree saw a catalogue missing this very article.

A merge is the likeliest way to drift one: an article arriving on one side and a bundle
regenerated without it on the other produces no conflict to report. If a drift check fails, run its
generator and commit the result — do not hand-edit generated output.

## Driving the built application

    node console/scripts/ui-drive/drive.mjs      <port> <output>            # every click, a capture each
    node console/scripts/ui-drive/gallery.mjs    <port> <output>            # clean per-destination shots
    node console/scripts/ui-drive/smoke.mjs      <port> [artifact]          # ship-readiness verdict
    node console/scripts/ui-drive/a11y-probe.mjs <port> [dist/index.html]   # ARIA roles, landmarks, aria-label, tabindex, tags

`a11y-probe.mjs` prints the same five counts the accessibility ROADMAP entry was measured
with, dismisses the onboarding wizard the same way `smoke.mjs` does, and refuses (rather
than reports) when the artifact is stale against its sources. It exits non-zero when any
count drops below a floor set a little under what a healthy build actually produces —
never the exact figure, because a guard pinned to the exact number breaks on the next
unrelated content change and gets "fixed" by whoever hits it first. What it protects is
the baseline the accessibility work started from: 1 role, 0 landmarks, 0 aria-label, 0
tabindex out of 426 elements, all of which sit below every floor.

Launch the application on an off-screen desktop with `--remote-debugging-port` and a
task-scoped `--user-data-dir`, then drive it over loopback. Refuse to evaluate anything
until the target list holds **exactly one** page; that check is the isolation proof.

Four traps, each measured here:

- **A fresh profile opens on a setup wizard covering 94% of the viewport.** Clicks issued
  through the document bypass hit-testing, so navigation works underneath it while every
  capture photographs the wizard. 109 published images were lost to this. Dismiss it and
  prove it is gone. Detect it by its own `Skip setup` control — **not** by looking for a
  full-viewport element, because the application's content wrapper legitimately fills the
  screen and that test refuses to drive a perfectly healthy app.
- **Never pass `awaitPromise: true` to `Runtime.evaluate`.** It hangs on this Node even for
  synchronous expressions.
- **Write evaluated expressions with no backslashes.** One arrived mangled and silently
  deleted every letter `s` from the results, with no error at all.
- **Every navigable control carries an icon ligature glued to its label** — the text reads
  `smartphoneEndpoints`, not `Endpoints`. Matching whole text finds nothing, and finding
  nothing is indistinguishable from a screen with no controls.

A capture is not evidence until it is checked. Sampling for pure black catches an unpainted
frame — this palette has none — but it cannot tell you the *right* screen was captured.
Record the visible heading beside each image, and open one before believing any of it.

## Release

Every push to `main` publishes a uniquely tagged non-draft release with a ~446 MB
installer, and redeploys the site. Verify by observation: non-draft, exact target commit,
assets downloadable.

**Code signing is permanently prohibited.** `Get-AuthenticodeSignature` on the setup
executable must report `NotSigned`, and the notes must say so rather than implying
authenticity.

## Recovery

- Suite exits 1 with zero failures → read the last twenty lines; a non-runner gate failed.
- A generated file reports stale with no visible diff → line endings. Regenerate, and pin
  the file `eol=lf` so it stops recurring.
- A pinned count moved → re-derive it from the code and explain the delta. Never add two
  lanes' deltas together and never force a number.
- A negative regression goes green → its fixture may be asserting something that progress
  made true. Force the condition instead of assuming it.
- The installed app dies at launch with `ERR_MODULE_NOT_FOUND` for a `.cjs` file next to
  `main.js` → `tsc` emits only `.ts`, so hand-written `.cjs` siblings must be copied into
  `dist-electron/app/electron/` by `scripts/copy-electron-cjs.mjs` after emission. Both the
  local `npm run build` path and `scripts/build-delivery.ps1` call it, and
  `package-squirrel.mjs` lists the packaged `app.asar` to prove each sibling is at the path
  the module loader resolves. `check-delivery-path.mjs` fails if either call is removed.
  Release `0.1.302` shipped without the copy on the delivery path and reproduced this exactly.
- `build-delivery.ps1` stops at `check-delivery-path.mjs` with `gh release list ... exit 4`
  → `gh` has no token. The `build-package` job in `delivery.yml` must set `GH_TOKEN` from the
  same secret chain the release job uses; the delivery-path contract asserts it.
