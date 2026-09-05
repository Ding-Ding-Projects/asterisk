# Handoff

## Canvas writes and the fake-control sweep, 2026-09-05

- The dialplan canvas was read-only by construction (`readOnlyCanvas` in `App.tsx`): every add, wire, duplicate, delete and inspector action fired a notice. It now carries a write model in `app/renderer/src/canvas-edits.ts` (pending edits against `extensions.conf`: add-step, connect as `Goto`, delete-extension, duplicate-extension, set-step, delete-step; `applyCanvasEdits` for the file, `projectEdits` for the drawn graph) and commits through the three-hit gate and the wizard's own full-document `pbx.apply`, then re-reads the target. Toolbar tools with no consumer (Pan, Marquee, Split, Comment, Measure, Grid, Guides, Minimap, the Annotations layer, Align left, Distribute) were withdrawn; Select, Wire, Snap, the Dialplan/IVR/Queues layer filter, zoom, Auto-arrange, Fit to view, Undo layout, Apply and Discard are real. Layout persists under `console.canvas.layout`. Arrow-key nudges no longer throw on a live node (`moveLiveNode`). Tests: `tests/ui/canvas-edits.test.tsx` (6).
- Fake controls found and made real or withdrawn: the wizard's and the server form's target choices mapped to connection kinds the control plane does not have (`local`, `ssh`, docker variants), so every connection they created was refused on connect; both now offer Local (`wsl`) and SSH (`remoteLinux`) only. The IVR screen previewed a dialplan it could not write; it gained a "Write it" control (`ivr-apply`) that replaces `[main-menu]` through the same apply path. The servers screen's "Manager interface" group stored six values nothing read and was withdrawn. Appearance colour actions, the Arcade "Spend one now" and the fun shortcuts (which wrote a `chaos_level` nothing read) now act on the real dials or say plainly what they cannot; "Pick from screen" uses the platform EyeDropper or says the runtime lacks it.
- Shek Q: `tests/contracts/live-controls.test.mjs` is a hand-written inventory of those boundaries, anchored to exact lines; watched red with the IVR hook commented out, green restored. Suites: renderer 1926/1957 (same 31 pre-existing failures), control-plane 809/816 (same 7), contracts 596/613 (same 17), all compared against a pristine detached checkout of HEAD.
- Trap recorded: an Edit that meant to write a space wrote a NUL byte into `App.tsx`; git then treated the file as binary (`w/-text`), skipped line-ending normalisation and showed a whole-file diff. `git ls-files --eol` plus a control-byte scan found it in seconds; the fix was one byte.
- Not yet verified at handoff time: the canvas write and the guided onboarding walk on the built artifact from the release this commit produces.

## Deploy smoke on WSL and Docker, 2026-09-05

- Asked for a real PBX deploy smoke through the packaged console on WSL and on Docker. Three product poke guys stood in the way before any deploy could run, all found by driving and reading rather than by the suite:
  - `bundledAsteriskRuntime()` in `console/control-plane/dispatch.ts` accepted provenance `schemaVersion === 1`; the generator writes 2 (`scripts/asterisk-runtime-provenance.mjs`). Every packaged runtime was `unavailable`, so the wizard went to the base-image fallback, which the package does not carry (`base-image.json` is not in `extraResources`). Fixed to accept 2; pinned by `tests/control-plane/bundled-runtime-provenance.test.ts` (red then green).
  - `App.tsx` auto-selected `distributions[0]` from `wsl --list`; on this machine that is `lol`, hence the dashboard's `asterisk: command not found`. `preferredDistribution()` in `app/renderer/src/runtime.ts` now prefers the managed distribution; test in `tests/ui/runtime.test.tsx`.
  - The Asterisk runtime image (`scripts/asterisk-wsl-runtime.Dockerfile`) compiled with menuselect's default `BUILD_NATIVE` (`-march=native`) on the GitHub runner. Pulled as a container on the i9-14900KF: `asterisk -V` answers, `asterisk -f` and `asterisk -F` die with `Illegal instruction` (exit 132). The older rootfs (built 2026-08-23) in the existing `ding-pbx-console` distro runs fine. Fixed by disabling `BUILD_NATIVE` between configure and make; guard test in `packaging-contract.test.mjs`.
- Fourth defect, found on release `0.1.316` (built from `bb3d7aeb7c`, run `33945792548`): with the managed distro now selected, `server.connect` still reported `No target is connected — Asterisk: Asterisk UNKNOWN__and_probably_unsupported …` because its identity regex demanded digits. The wizard's Super-easy button then silently did nothing observable beyond a notification. Fixed by accepting any `Asterisk <token>` identity (`tests/control-plane/server-connect-identity.test.ts`, red then green) and by writing `.version` in the runtime image so new builds identify as `master-g<sha12>`.
- The portable runtime from `bb3d7aeb7c` was proven on this CPU: container `ding-pbx-smoke` from `ghcr.io/ding-ding-projects/asterisk-runtime:bb3d7aeb7c…` starts `asterisk -F`, answers `core show version` and `core show uptime`.
- WSL deploy proven on release `0.1.317` (`b3638bf2c4`, run `33947356145`): packaged executable on hidden desktop `DingPbx317Deploy` with the real profile; the title bar read `ding-pbx-console · 6 local target(s), connection verified`; the Super-easy card opened the gate with the real plan for that target; three target hits and `Yes, do it`; the notification centre then carried `Deployed … Applied: pjsip.conf: add 8 endpoint, authentication, and AoR trios starting at 100; extensions.conf: add a one-menu auto-attendant`. On the distro, `/etc/asterisk/pjsip.conf` gained `[100]`..`[107]` trios and `extensions.conf` gained `[onboard-menu]`; Asterisk reports the endpoints and `dialplan show onboard-menu` lists 1..8 → `Dial(PJSIP/10x,20)`. A manual `core reload` was issued during the 180 s wait, so the app's own reload cannot be separated from it in the timeline; the app reported Deployed on its own path afterwards. Real background mouse clicks through the cheap Lowlevel route then reached PBX → Endpoints (8 rows, 112 settings across 24 sections) and Dialplan canvas (`onboard-menu · 7/8` boxes loaded). Captures: `console/release/captures/0.1.317-wsl-deploy-endpoints-hidden-desktop.png`, `0.1.317-wsl-deploy-dialplan-hidden-desktop.png`.
- Two more findings from that drive: Local history shows `No local history entry has been recorded yet` although the Deployed notification says the deploy is recorded there; and the notification centre stores the new extension secrets in plain text after the "shown once" dialog. Filed as an issue.
- Docker: the console has no Docker deploy path. Discovery lists containers labelled `io.ding.pbx.project=ding-pbx-console` and readings go through `docker exec`, but every write and connect rejects non-`wsl` kinds. A labelled container from `ghcr.io/ding-ding-projects/asterisk-runtime:5837764723…` was created for the smoke and is discovered by the app's own command; it cannot be a deploy target until that path exists.
- The app pins its data directory to `%APPDATA%\Ding PBX Console`; `--user-data-dir` is honoured only in probe mode. The two earlier hidden-desktop launches therefore wrote `settings.json` there (`p_start_last_screen`, `dimSum.hasLaunchedBefore`), nothing else.
- Machine state: WSL distros `docker-desktop`, `lol`, `test`, `ding-pbx-console` (Asterisk from the 2026-08-23 rootfs, daemon starts), `gitlab-gdk`, `test-instance`, `ding-pbx-test` (no asterisk). Docker 29.6.2.

## Launch failure and red delivery lane, 2026-09-04

- Installed `app-0.1.302` failed at startup: `ERR_MODULE_NOT_FOUND` for `probe-path.cjs` imported from `app.asar/dist-electron/app/electron/main.js`. Listing that asar confirmed 1,426 entries with no `/dist-electron/app/electron/probe-path.cjs` and a stray copy at `/app/electron/probe-path.cjs`.
- Cause: `scripts/build-delivery.ps1` (the workflow path) re-implements the build inline and never called `scripts/copy-electron-cjs.mjs`, which commit `8f6b928dc3` had wired only into `npm run build` and `package:squirrel`.
- Fix: the delivery script copies after `tsc -b --noCheck` and runs `--check` before `package-squirrel.mjs`; `package-squirrel.mjs` lists the packaged `app.asar` with `@electron/asar` and fails on a missing sibling; `check-delivery-path.mjs` guards both steps and was watched to fail red on each removal.
- Separate failure: the last three `Build, package, and release` runs (latest `33839083970`) stopped in `check-delivery-path.mjs --verify-gh-fields` because the `build-package` job had no `GH_TOKEN` and `gh` exited 4. The job now sets `GH_TOKEN` from the release job's secret chain, and the contract asserts it.
- Run `33932217480` for `f2aa1b98d8` got past the token Chut and the copy step, then stopped at `package-squirrel.mjs` line 40: the packaging-input preflight found `resources/school-mode-provenance.json` missing. Nothing in the repository ever wrote that file; `2dfefec067` made it required and the previous green run only passed because electron-builder logged `file source doesn't exist` and continued. `package-squirrel.mjs` now writes it from the release identity before the preflight, `.gitignore` excludes the generated file, and `packaging-contract.test.mjs` asserts the write precedes the preflight (watched red then green). `build-delivery.ps1` also keeps Node stderr in the packaging log; the previous capture turned the first stderr line into the only error text.
- Run `33933219491` for `e92b12adf1` built `Material-Asterisk-Setup.exe`, then electron-builder's publish manager failed with `Cannot detect repository by .git/config` because `GH_TOKEN` is now in the job environment and its default publish mode engaged. `package-squirrel.mjs` now passes `--publish never`; `packaging-contract.test.mjs` asserts it.
- Run `33933983970` for `d636ea9ea7` built the full package with `--publish never` holding, then `validateReleasesIndex` rejected the real `RELEASES` file: `expected ding-pbx-console-0.1.311-full.nupkg, got 466172676`. The helper took the last column and its unit-test fixture was written as `hash size name`; real rows are `sha1 file size`, exactly as `verify-squirrel-artifacts.ps1` parses them. Parser and fixture corrected; malformed rows now surface as `malformed row: ...`.
- Run `33934757898` for `47a646d8b9` passed RELEASES validation and then crashed at `record(executable)` in `package-squirrel.mjs` (`statSync(undefined)`): `executable` is a path string while `record` takes an entry. Fixed to `record({ name: builderIdentity.executableName, path: executable })`; the source test that pinned the wrong call now pins the right one and forbids the old.
- Proven: run `33935644308` for `5837764723` went green end to end and published non-draft release `ding-pbx-console-v0.0.313-r1` targeting `5837764723` with `Material-Asterisk-Setup.exe`, `RELEASES`, `ding-pbx-console-0.1.313-full.nupkg` (SHA-256 `7d94ddb336652f2b418021456c622b1b4533f684751fb09ca56f749966277c4c`, matching `SHA256SUMS.txt`), the packaging receipts, and the release ISO. The full package's `app.asar` lists 2,580 entries including `/dist-electron/app/electron/probe-path.cjs`. The packaged `Material Asterisk.exe` (SHA-256 `0c1fef022a0f8f494dd1d5464924606cec9ae398dee3acb785b693cc3e20fde6`) launched on a hidden desktop with an isolated profile and showed the onboarding wizard with no error dialog: `console/release/captures/0.1.313-first-launch-hidden-desktop.png`. The user's own Squirrel install was deliberately not touched; they update by running the new Setup.exe or letting the in-app updater pick up 0.1.313.
- Smoke run on the same packaged 0.1.313 (hidden desktop `DingPbx313Smoke`, isolated profile, debugging port 9556, exactly one page target): `scripts/ui-drive/smoke.mjs` first reported the onboarding wizard covering the interface, and after dismissing it over the protocol returned `VERDICT: the built artifact renders its real interface` (437 elements, 105 controls, 5 destinations); `scripts/ui-drive/a11y-probe.mjs` returned 10 roles, 6 landmarks, 9 aria-labels, 4 tabindex over 437 elements. Capture: `console/release/captures/0.1.313-smoke-dashboard-hidden-desktop.png`. One visible defect in it: the tab strip at top-left renders the literal icon names `search`, `group_work`, `travel_explore` instead of glyphs, the ligature-font trap; filed as an issue, not fixed in this pass.

## Current shipping state, measured 2026-08-31

This section is authoritative for the current checkout. Sections below are historical records,
retained for traceability, and must not override the evidence here.

| Item | Exact state |
| --- | --- |
| Default branch | `main` |
| Local commit | `7c6e0c6c9520c6fd421cabf73bcbb6af15a18c60` |
| Git server proof | `refs/heads/main` reads back to the same SHA |
| Console release | [`ding-pbx-console-v0.0.300-r1`](https://github.com/Ding-Ding-Projects/material-asterisk/releases/tag/ding-pbx-console-v0.0.300-r1), non-draft, target SHA exact |
| Installer ISO release | [`ding-pbx-installer-iso-v0.0.7-r1`](https://github.com/Ding-Ding-Projects/material-asterisk/releases/tag/ding-pbx-installer-iso-v0.0.7-r1), non-draft, target SHA exact |
| Console delivery run | [33210571775](https://github.com/Ding-Ding-Projects/material-asterisk/actions/runs/33210571775), successful |
| Installer ISO run | [33210571840](https://github.com/Ding-Ding-Projects/material-asterisk/actions/runs/33210571840), successful |
| Pages run | [33210571949](https://github.com/Ding-Ding-Projects/material-asterisk/actions/runs/33210571949), successful |
| Published Pages URL | https://ding-ding-projects.github.io/material-asterisk/ |
| Current local lane | Documentation and record refresh only, uncommitted at handoff start |

The console release contains `Material-Asterisk-Setup.exe`, `RELEASES`, the full
`ding-pbx-console-0.1.300-full.nupkg`, release identity, update manifest, SHA-256 records,
line-count records, WSL runtime records, and the published dim-sum image asset. The release
notes record code name `Yellow Sugar Sponge Cake · 黃糖糕`, workflow timing `00:16:24`, and
that automated checks were not run by GitHub Actions. The ISO release contains two numbered
volumes, reassembly instructions, and a reassembled SHA-256 record. Both releases state that
their Windows outputs are unsigned and may trigger an unknown-publisher or SmartScreen warning.

The Pages deployment is verified for the candidate SHA, but the Pages API currently reports
its source branch as `master` while the repository default branch is `main`. That external
configuration mismatch remains recorded for the release owner to reconcile. The current
documentation lane does not change it.

No current-commit built-application walkthrough, new UI capture, design-parity verdict, or
local test result is claimed by this lane. The rolling public drafts prepared in
`console/docs/release-drafts/2026-08-31-release-records.md` are intentionally not posted
until runtime evidence is final.

### Current open records

- GitHub issue [#1](https://github.com/Ding-Ding-Projects/material-asterisk/issues/1) remains open for the overall desktop, control-plane, and documentation delivery. Its current evidence boundary still requires fresh runtime and built-artifact proof before completion.
- GitHub issue [#6](https://github.com/Ding-Ding-Projects/material-asterisk/issues/6) remains open. Its apply-and-undo repair has source-stage evidence on a task branch, but no final disposition is recorded on `main` by this documentation lane.
- The only open issue found in `Ding-Ding-Projects/agent-global-memory` is issue #4, an instruction and workflow request. It was read during this session and is not implemented in this repository lane.

### Documentation lane result

The documentation lane is limited to `console/docs/**` and root guidance records. It repaired
the canonical repository and Pages links in `README.md`, corrected one broken changelog article
link, refreshed the current release and evidence boundary, and prepared public-safe bilingual
drafts without posting them. Documentation and link checks run after these edits. No workflow,
inventory, evidence, parity, packaging, or implementation file is changed here.

## Historical shipping handoff, 2026-08-26

### Published state

| Item | Exact state |
| --- | --- |
| Default branch | `master` at `6f8f959832f7783b75167fcb6e359073f473bb54` |
| Git server proof | `refs/heads/master` read back at the same SHA |
| Central feature integration | `246b2bc7a5` |
| Default-branch integration | `780eb88cb6` |
| Local feature-history consolidation | `33c0f66b9b` |
| Remaining remote-history consolidation | `6f8f959832` |

The default branch now records every published branch tip that was present during the
integration sweep as an ancestor. The consolidated tree contains the desktop renderer,
PBX control plane, documentation site, updater, migration and backup flows, local Git
history, configurable Git destinations, Asterisk and FreePBX surfaces, WSL and Docker
deployment sources, and the sharded UI-smoke inventory.

### Build evidence

`build.bat /s` completed successfully against
`6f8f959832f7783b75167fcb6e359073f473bb54`.

- Dependency bootstrap completed with pinned Node.js `22.23.2` and `npm ci`.
- Native dependencies rebuilt for Electron `43.4.1` on Windows x64.
- Design compilation completed.
- The offline documentation bundle contains 133 articles.
- The changelog bundle contains 20 real tagged versions.
- TypeScript compilation and the Vite production build completed.
- The local update manifest records version `0.1.0` and the exact candidate SHA.

This handoff does **not** claim that the current installer was packaged, installed, deployed,
or released. It also does not claim a current-commit UI walkthrough or capture set. The
existing untracked installer ISO predates this commit and must not be presented as current
release evidence.

### Cleanup state

The integration and cleanup pass removed 49 linked worktrees, 49 local branches, and 148
remote branches after clean-state, push, and ancestry checks. No stash exists. Exactly one
working tree remains: the primary checkout on `master`.

Two preservation branches remain locally without linked checkouts:

- `claude/busy-zhukovsky-ae0b75` at
  `fd1f2c51a9e91779cd8fd278bbbe9d43cc822d91`; its committed tip is published and is an
  ancestor of `master`.
- `codex/ui-smoke-recovery` at
  `1ea934bcd65e018a0d4f71c3b5d1ca26ce793875`; its extra commit contains a 159.93 MB Git
  blob and the server rejects that tip. The local branch preserves the commit after its linked
  checkout was removed. The safely published predecessor is
  `cbad600e5483e5ab19da35aa941efe923467f9f0`.

Remote branch `site-per-element-toy-locks` remains at
  `1cadefa72b861dec5c6de5bd5c926a32db0e4e58`, because it appeared during cleanup and is
  not an ancestor of the published default branch.

### Explicit stop boundary and next owner

The user requested an immediate handoff and stop. Do not start another debugging or repair
cycle. Continue with new-feature implementation only when the user resumes the task.

The next shipping actions, if explicitly resumed, are:

1. Run `build-installer.bat /s` against the exact default-branch SHA.
2. Deploy the supported WSL and Docker targets from that same candidate.
3. Run the required cheap headless interaction pass and capture the current built artifact.
4. Promote the evidence to the documentation, wiki, and Pages source.
5. Publish one unique non-draft GitHub release and verify every downloadable asset.

### Public tracking

- Rolling progress: GitHub Discussion #2.
- Main delivery handoff and remaining work: GitHub issue #1.
- FreePBX apply and undo work remains tracked by GitHub issue #6 until current-build UI
  interaction evidence exists.

> [!IMPORTANT]
> **Everything below the next rule was written on 2026-08-23 and much of it is now wrong.**
> It is kept because a handoff that is quietly rewritten loses the record of what was
> believed at the time, but nothing in it should be trusted without checking. The counts
> it quotes -- 144 tests, then 6238 -- and the releases it names -- v0.0.5, v0.0.7,
> v0.0.82, v0.0.84 -- have all been overtaken.

## Current state, measured 2026-08-25

| | |
| --- | --- |
| Suite | 3,195 passing, 0 failing, across 8 sub-suites, exit 0 |
| Latest release | v0.0.212 |
| Roadmap | 51 open / 59 done |
| Evidence rows verified | 2 of 88 |
| Evidence artifacts on disk | 38 capture-and-record pairs |
| Interaction captures | 242, with a ledger recording every digest |
| Branches | 35, of which 32 are already ancestors of master |

Two branches are not ancestors of master, and neither should be merged as it stands:

- `parity-bar` holds the loop's design-parity work in progress. Its own guard fails on its
  own document, and its verdicts read "diff" rather than "match" -- which is a real
  measurement, not a passing one. Committed and pushed so it cannot be lost.
- `integration-runtime-proof` is fully superseded. Master carries every one of its
  resolutions, and merging it would revert roughly thirteen thousand lines. It is retained
  rather than deleted precisely because it is not an ancestor, so the ancestry proof that
  authorises a deletion cannot be produced for it.

### What is known to be unfinished

- A global Undo on the shared notification reverts nothing, and the copy-tab-list control
  writes the literal text `undefined` to the clipboard. Both are the same class as the
  decorative controls fixed on 2026-08-25 and were deliberately left rather than guessed at.
- Five platform features are recorded as unreachable rather than photographed from something
  adjacent: the unlock ladder, the built-in authenticator, forge publishing,
  browser-extension download surfaces, and in-context recovery.
- The bundled runtime payload in `console/resources/` is built from commit `d50822fbb`. Any
  release from a later commit rebuilds it, which needs a working local container engine.

---
# Ding PBX delivery handoff

## Status Hub and browser-extension transfer mount, 2026-08-23

The `codex/mount-status-downloads` lane mounts `#surface=status` plus `#surface=download/start`, `#surface=download/progress`, and `#surface=download/complete`. The Status Hub client and store remain receipt-led and derive rows only from the configured external service. The privileged dispatcher exposes `status-hub.*` actions and accepts the non-secret `STATUS_HUB_URL` origin configuration. An absent or unreachable service remains a typed unavailable or offline state.

The browser-extension handoff enters through the packaged submission-only `Ding-PBX-Console-NativeMessagingHost.exe`, registered under reverse-domain host name `com.dingdingprojects.asterisk.downloads` and authenticated with the shipped 32-character extension id `dnpkplcgjmipnndmghkhljjoefjhidab`. The native host is built through `build-native-host.ps1`, and `register-native-host.ps1` writes the absolute manifest path for both Chrome and Edge, verifies executable and manifest ownership, stable digest, protected challenge config, current-user ACL, registry values, and returns a typed registration receipt. The primary shell exposes the first-run Register extension ingress action and typed ready, starting, unavailable, or retry state; successful registration hot-reloads the listener. The host crosses the bounded random local named pipe with the installation challenge into `download:submit-handoff`, can submit one validated handoff and receive its receipt, and exposes no transfer command, snapshot, queue, or credential operation. Handoffs are persisted in an ordered pending queue with transfer snapshots in `download-transfers.json`. The primary shell only offers a passive open-window action, while dedicated always-on-top BrowserWindows are the sole owners of Start, Downloading, and Complete surfaces and events, each bound to one exact handoff or transfer id. The native picker or a persisted approved root supplies the destination, and the manager rejects mismatched handoff replay, non-absolute paths, containment escapes, and symlink or reparse components immediately before writing. It rechecks the parent after directory creation before opening the temporary file. The packaged native helper contract opens the verified parent with `FILE_FLAG_OPEN_REPARSE_POINT` and no delete sharing before no-follow temporary creation. It streams HTTPS bytes into a unique adjacent temporary file, applies header, body-idle, and total deadlines, validates bytes, records exact complete size and SHA-256, and publishes through the shared Windows rename retry helper. A full-body publication failure keeps the same complete temporary file available for retry publication only after size and digest revalidation, never requesting Range at EOF. Range pause and resume use recorded validators when supported, while unsupported controls stay disabled with an exact reason. Startup reconciliation turns interrupted work into partial or failed state, and retry or discard outcomes remain explicit. Durable Status Hub receipt read and write failures stay visibly warned while the live registration remains usable, and stale or not-found receipts get one bounded clear and re-registration attempt. The preload exposes only dedicated-window transfer actions. The companion extension capture itself is not part of this repository, so no browser extension source was added.

This lane intentionally ran no tests, lint, type checks, builds, packaging, runtime interaction, external service calls, extension launch, or captures. The next owner must run the focused control-plane and renderer checks, then verify the built desktop routes with a real configured Status Hub and a real extension handoff. The feature registry and platform articles record this unverified boundary.

The source platform articles were updated and `npm run bundle:docs` was run as the permitted documentation-only generator. The generated `console/app/renderer/src/generated/docs-bundle.ts` now contains the updated articles. No other build or verification command was run.

## Surface mount integration, 2026-08-23

The integration lane added `console/app/renderer/src/surface-mounts.tsx` and mounted it from `main.tsx` as an addressable hash route. `#surface=converter` renders the real converter component and reads its catalog and PDF capability evidence through the local control-plane dispatcher. Picker, queue mutation, and packaged-worker proof operations still return explicit unavailable receipts because those handlers are not registered. `#surface=ollama` renders the real Ollama component and reports a typed `bridge-not-registered` state until its privileged dispatcher is registered. `#surface=docs` and `#surface=changelog` render the bundled documentation and changelog components.

The desktop and Pages feature registries, plus `console/inventories/surface-completeness.json`, record the converter and Ollama rows as `implemented-unverified`. No tests, lint, type checks, builds, packaging, UI runs, captures, or Lowlevel work ran in this lane. The next owner must register the remaining converter and Ollama handlers, then run the focused checks and built-artifact interaction proof.

## Scope

This handoff covers the integrated Material Asterisk desktop application, bounded PBX control plane, GitHub Pages documentation application, repository delivery automation, line counting, completeness and design-parity inventories, contributor guidance, and release evidence contracts.

## Completeness matrix session of 2026-08-23

### Scope and current commit

This lane replaces the earlier 44-feature, two-surface inventory with schema version 2 of `console/inventories/surface-completeness.json`. The source audit baseline for this lane is `088ecde1a6`. The matrix is hand-written and does not discover features or routes from implementation files.

### Matrix counts

| Surface family | Exact count |
| --- | ---: |
| Desktop shell | 1 |
| Login | 1 |
| Setup | 1 |
| Desktop destinations | 32 |
| Desktop overlay states | 17 |
| Top-level site pages | 6 |
| Generated documentation routes | 82 |
| Browser-extension download states | 3 |
| **Total addressable surfaces** | **143** |
| **Canonical features on every surface** | **44** |
| **Feature rows** | **6,292** |

The required features include local file conversion and the local Ollama suite manager. `console/inventories/exemptions.json` is schema version 2 with zero exemptions.

### Evidence boundary

Every row records status, demo state, exact provenance, implementation and registration symbols, route, documentation, localization, persistence, focused checks, negative evidence, built interaction, current-commit capture fields, and design-parity tuple fields. The current ultra-speed delivery boundary did not run validators, tests, or captures. No row was promoted to `verified`, and no unproven evidence is described as present.

### Verification and next owner

The validator is `console/scripts/verify-inventories.mjs`. The red-then-green regressions are `console/scripts/negative-surface-completeness.mjs` and `console/scripts/negative-evidence-claims.mjs`. The next owner must run them against the exact integrated default-branch commit, observe every deliberate break turn red, restore the matrix, and then capture the real built artifact and design reference under identical tuples before recording verified evidence.

## Site history and delivery lane

The isolated `codex/site-history-delivery` lane added `console/site/history-delivery.js` and `console/site/history.html`. The shared `console/site/app.js` now registers the module on each primary page, and `console/site/build.mjs` copies it into deterministic output and wires it into generated documentation pages with a real delivery mount host, depth-correct changelog, release-manifest, app, full-builder, and command-palette shells. The module supplies schema-versioned local append-only visitor history with explicit older-state migration and future-version refusal, bounded browser storage, strict recursive redaction, scrubbed summaries that omit paths, URLs, and private values, validated local calendar dates and presets, date/action/regex filtering, retention preview that reserves the prune-event slot, restore-as-new-event, a generated product-release changelog with optional upstream history and exact Git target validation, safe provider Markdown preview, honest unavailable editor handoff, a File System Access download state machine with measured chunks and stream-close completion, interrupted-transfer reconciliation and active-write refusal, a partial forge provider preview with source and destination states, cancellable byte-based local export preparation, in-context recovery, target-specific context actions on genuine panels and rows, ordinary persisted route navigation with pinning, and static-page update status that validates the bundled release manifest without claiming installation. It never stores credentials, private vocabulary, local paths, or file contents, and it never claims that a browser handoff installed, published, or completed something the browser did not report.

The source documentation is `console/docs/platform/site-history-and-delivery.md`, indexed by `console/docs/platform/README.md`. This lane did not run tests, lint, builds, browser interaction, captures, hosting, releases, or pushes by assignment. The next owner should run the site's existing validation and inspect the built route before publication.

## Implemented

- Pinned Node.js `22.23.2` for Windows x64 from the official Node.js release service with SHA-256 `1177b4137ba5adaa56354ae40f1080c7450e8ae09cecb47da459d1c52ac99f97`.
- Added silent modes `/s`, `--silent`, and `SILENT=1`; user-scoped extraction under local application data; digest verification; reproducible `npm ci`; phase timing; and actionable failure output.
- Added runnable-build and installer-build entry points. Packaging clears signing inputs, invokes the product's Squirrel.Windows script, checks required files and the `RELEASES` index, verifies `Setup.exe` is `NotSigned`, and prints file sizes and SHA-256 values.
- Replaced inherited workflows with two Windows-only workflows: `.github/workflows/delivery.yml` owns the unsigned desktop build, package, and release; `.github/workflows/pages.yml` independently composes and publishes the documentation site. Desktop delivery probes repository self-hosted runner availability and otherwise uses pinned `windows-2025`; the site workflow uses pinned `windows-2025`. The observed repository inventory contained zero self-hosted runners; organization inventory was unavailable with HTTP 403, so neither workflow claims organization-runner evidence.
- Added one unique monotonic `ding-pbx-console-v0.0.<run>-r<attempt>` release per successful push or manual run, exact target verification, non-draft verification, required-asset verification, workflow start/completion/duration, SHA-256 records, and safe always-upload evidence.
- Added a committed line counter that separates project source, tests, markup, generated output, and inherited/vendor source, with surviving-line authorship for project files.
- Implemented the 32 audited destinations across six navigation rails in the packaged desktop application, with tabbed navigation, searchable menus and lists, an anchored regex builder, command palette, guided flows, appearance controls, non-blocking notifications, and guarded destructive previews.
- Implemented a bounded process control plane with no shell execution, allowlisted commands, WSL discovery, project-labelled container discovery, scoped SSH trust, pinned Asterisk provisioning plans, staged configuration validation, backups, post-write reads, and rollback.
- Added a reproducible Ubuntu 24.04 WSL root filesystem build that compiles the exact repository commit, installs Asterisk and its modules, includes every runtime library and operating-system file, verifies dynamic-library closure, records source/base-image provenance and SHA-256, and embeds the complete payload inside the Squirrel.Windows application resources. Packaged target discovery reports whether that payload is present without relying on PATH or a post-install download.
- Implemented a dependency-free static documentation application containing the same 32 destination identifiers, 32 feature articles, local settings and search behavior, deterministic output, an Open Graph graphic, and no runtime asset fetches.
- Reworked the static site into a responsive product-marketing and documentation surface with an animated hero, bento product sections, scroll reveals, a responsive 32-destination navigator, local theme/language/density controls, accessible search and anchored regular-expression tooling, and an installer action that remains unavailable until a verified immutable URL exists.
- Split the compact static experience into six routable pages—Home, Product, Documentation, Downloads, Status, and Settings—using shared local CSS and JavaScript. The documentation map shows eight of 32 destinations at a time, generated articles include anchored section navigation, and every primary page carries page-specific title, description, Open Graph URL, active navigation, and `/asterisk/`-compatible relative links.
- Mounted the desktop forge-publishing runtime on the History screen. The typed bridge now discovers local GitHub CLI accounts, confirms the active login for each owner read, proves keyring storage and refuses plaintext fallback, clears inherited authentication variables, stores only account ids and provider-supplied vault references in atomic versioned state, supports client-id-free ConPTY device sign-in with surfaced user code and verification URL plus per-request deadlines, bounded polling and stdin-only credential installation, valid stdin-confirmed sign-out with independent reread and provider-authorization disclosure, refresh, add, and cancellation, reads personal and organization owners with unknown capabilities until proven, distinguishes GitHub and unavailable GitLab capabilities, and offers exact fork and copy-and-push routes with destination identity and exactly-one effective push-URL `git ls-remote` proof. `gh` and `git` calls use the allowlisted `shell:false` executor with deadlines, redaction, and common settlement. Account and publication receipts are separate, reloadable, action-specific, and retain failed, partial, cancelled, and unknown-side-effect outcomes. Hosted refusal and disabled controls, visible corruption reset, forge-bound regex label and preview, operation-id progress terminal states, and pinned gh and ConPTY helper package checks are explicit. The direct HTTP route still needs an immutable approved public OAuth client id, and the feature is partial until runtime provider verification and built-artifact evidence land.

## Design parity by compilation

- Replaced the hand-written renderer with a compiler. `console/scripts/compile-design.mjs` reads the checked-in design reference and emits `console/app/renderer/src/generated/{console.tsx,m3-control.tsx,design-styles.css,design-manifest.json}`: markup becomes React calls, the design's `style-hover` and `style-active` attributes become 45 real CSS rules, and the design's own component logic is carried over and driven by a small runtime in `console/app/renderer/src/dc-runtime.tsx`. `console/app/renderer/src/App.tsx` subclasses the generated shell. The design reference itself is never edited.
- The compiler applies two recorded deviations and asserts both: the product name is replaced, and the design's font-CDN links are dropped in favour of locally bundled Roboto, Roboto Mono and Material Symbols Outlined. It also attaches behaviour to the three frameless-window controls the design leaves inert, failing the build if it does not match exactly one drag region and exactly three controls.
- `console/app/renderer/src/catalog.ts`, `console/docs/` and `console/site/` all now derive their destination catalogue from the design instead of from three divergent hand-written lists. Independently checked: the 32 documentation articles cover every design destination with none missing, extra or duplicated, and the site's catalogue order equals the design's own `ORDER`.
- The design's sample content was removed from the running app. Live channels, endpoints, contacts, registrations, queues, modules and uptime are read from allowlisted read-only Asterisk CLI commands; the dialplan canvas is built from the target's own `dialplan show`. The history, agent-rail and trunk-authentication surfaces, and the navigation badges, have no real source yet and therefore render empty with the exact reason stated, rather than the design's invented values. Cells the console has not read show `—`.
- Two real defects were found and fixed by writing the parser tests: `parseRegistrations` matched a `Registration:` label that `res/res_pjsip_outbound_registration.c` never prints, so it would have returned zero rows against real output; and `parseQueues` counted caller lines as members because `apps/app_queue.c` indents both by six spaces.

## Design parity verification state

- `npm test` in `console/` runs 126 local tests, all passing: 9 inventory and drift tests, 39 renderer tests, 69 control-plane tests, and 9 static-site tests. It then runs the inventory validators and both negative regressions, which show 14 deliberate breaks red and restoration green.
- `console/tests/ui/design-drift.test.mjs` recompiles the design and fails unless the shipped renderer is byte-identical, and asserts the compiled binding census equals the audited baseline: 212 click, 10 change, 10 input, 9 context menu, 4 each drag start/over/drop/end, 5 mouse down, 1 each mouse enter/leave/up, plus the 3 window controls. The guard was observed red after a deliberate edit to the generated output and green after restoration.
- `console/tests/ui/design-parity.test.tsx` renders all 32 destinations from the compiled design and asserts each one's title, description, Expert-mode owning file, control groups including the design control's slider, stepper and reorder affordances, Beginner-mode plain wording, and all 17 transient-state families. `console/tests/ui/app-no-sample-data.test.tsx` renders the real application and asserts the design's invented commits, memory rows, partner requests and navigation badges never appear.
- Because that evidence is render-based rather than capture-based, the parity inventory records those destinations as `compiled`, not `verified`. `compiled` is a new status the validator defines and enforces: it requires the inventory to name both the design compiler and the rendering test, and the negative regression proves those requirements turn red when removed. Moving to `verified` still needs the reference-versus-built captures and visual diffs the inventory's evidence templates describe.
- Observed in the running renderer by driving it: the design's exact background, Roboto body type, and Material Symbols Outlined all resolve from the local bundle with zero remote requests; the onboarding overlay, command palette and navigation work; the palette lists destinations in the design's own order; and no sample rows, tiles, health bars or badges appear while no target is connected.
- Superseded on 2026-08-22: readings **have** now been exercised against a live Asterisk. A WSL distribution was created from the packaged root filesystem on a real machine, its digest verified against the recorded manifest, the daemon started, and the console read from it. What remains unverified is any **write** to a real exchange. Every CLI parser was originally written against the format strings in this repository’s Asterisk sources and is covered by fixtures derived from them; the live run confirmed the read path end to end but did not exercise every parser against real output.

## Continuing on another device

Everything below is on the default branch. To pick this up elsewhere:

1. Clone, then from `console/` run `download-dependencies.bat /s` at the repository root, or `npm ci` inside `console/` for renderer work only.
2. `npm test` in `console/` runs the whole local suite — renderer, control plane, static site, inventory validators and both negative regressions. `npm run build` compiles the design and builds the renderer.
3. Do not hand-edit `console/app/renderer/src/generated/`. It is produced by `node console/scripts/compile-design.mjs` from `design/`, which is a read-only reference. Change the design and recompile; `console/tests/ui/design-drift.test.mjs` fails if the shipped renderer is not byte-identical to a fresh compile. Those paths are pinned to `eol=lf` so the guard holds on any platform.
4. Superseded: a machine with WSL was used on 2026-08-22 and the read path was exercised against a live Asterisk. The highest-value next step is now a **write** against a disposable target, and real captures for the completeness inventory.
5. No sample data may be reintroduced. Every surface shows only what was actually read; where nothing was read the surface stays empty and states why, and an unread cell is an em dash.

## Delivery record for the design-parity change

- Candidate commit `550bf81a821a95d83581f580b705db884e4fc0e7` on branch `design-parity-real-readings`, pushed to `origin` and tracking `origin/design-parity-real-readings`. The change was not pushed to the default branch, so nothing was released.
- Neither workflow ran. `.github/workflows/delivery.yml` and `.github/workflows/pages.yml` both trigger only on `push` to `master` or on manual dispatch, so this push produced no desktop build, no release, no tag and no Pages deployment. Publication remains pending a default-branch push and must be recorded from the observed run rather than predicted.
- Verified on the committed tree with `npm test` in `console/`: 126 local tests pass — 9 inventory and drift, 39 renderer, 69 control-plane, 9 static site. The inventory validators pass with `--allow-unverified`, and the two negative regressions show 14 deliberate breaks red and restoration green.
- The repository had no `.gitattributes` and the working copy uses `core.autocrlf=true`, so a checkout would have rewritten the compiled renderer to CRLF while the compiler emits LF, failing the byte-identical drift guard on every machine except the authoring one. `console/app/renderer/src/generated/.gitattributes` now pins those paths to `eol=lf`; the file was deleted, re-checked-out, confirmed LF, and the guard was re-run green.
- The integrate-and-clean pass merged `origin/feature/bundled-asterisk-runtime` and `design-parity-real-readings` into the default branch. Merging exposed regressions the multi-page static-site rewrite had already shipped: four site tests were red on the default branch before this merge because they still read only `index.html` after the site was split into six pages; the simulated telemetry panel had returned on the status page; duplicate-key rejection had been dropped from the vocabulary upload validator; and the humour-level, attention, schedule and logo-upload controls plus the documentation-index link had been dropped entirely. All were repaired rather than asserted away, and the site suite is green again.
- Not done in this change: the desktop application was not rebuilt or repackaged, no installer or capture evidence was produced, and no reading was exercised against a live Asterisk. The packaged-application and installer evidence recorded below belongs to the earlier candidate `5e7cc508d470b022c96d4008dc6b0927f5748d6f`, not to this one.

## Independent audit baseline

- Original design archive SHA-256: `9A4284745A745C18A18B0A23D2A2F5851A79F9B6EFCBC5EE30EDCD69CEA2863F`.
- Destinations: `32`.
- Navigation rail counts: `8 / 4 / 2 / 4 / 7 / 7`.
- Declarative bindings: `265` total: `212` click, `10` change, `10` input, `9` context menu, `4` each drag start/over/drop/end, `5` mouse down, and `1` each mouse enter/leave/up.
- Distinct expressions: `168`.
- Controls: `479`.
- Transient-state families: `17`.

## Verification state

- Candidate commit `5e7cc508d470b022c96d4008dc6b0927f5748d6f` passed 49 local tests: 6 desktop UI, 34 control-plane, and 9 static-site tests. Both inventory negative regressions were observed red after a deliberate removal and green after restoration.
- A cold user-scoped dependency bootstrap and `build.bat /s` completed successfully. The exact candidate produced an intentionally unsigned Squirrel.Windows set: `Ding-PBX-Console-Setup.exe` is 294,705,152 bytes with SHA-256 `714767a464b91dc3c1f763a763fd6c855188b10771a84bd76b138ddbed23568b`; the full package is 294,208,940 bytes with SHA-256 `cff93c46d0f05e0ddea11835b24328dcc6978e50438e866763e64a87f7476b4b`.
- The packaged application ran on an isolated hidden Windows desktop with one exact renderer target. Its real preload bridge discovered the installed `Ubuntu` WSL distribution from **App > Deploy & servers > Discover local targets**. The inspected capture is `console/release/captures/windows-console/servers.png`; its SHA-256 is `f3621c0c622fba580cc2ad9908a631eac34a73e4c8f90ab8ddca0d857a951aa6`.
- That capture is now **stale as a reproduction target**. The `Ubuntu` distribution it shows is no longer present on this machine: `wsl.exe --list --quiet` returns only `docker-desktop`, which target discovery deliberately filters out, so the same route now returns an empty list here. The capture remains valid evidence of what the route did at the commit it was taken from; it is no longer reproducible on this machine without first providing a distribution. Discovery returning empty is correct behaviour rather than a defect, and the application does not depend on it, because the installer carries its own Ubuntu 24.04 payload.
- The static-site builder produced 43 deterministic files including `console/site/dist/build-manifest.json`; the site test rejects runtime network fetches.
- The marketing-surface lane intentionally did not run tests, lint, reviews, audits, accessibility automation, or captures under its ultra-speed delivery boundary. Its production composition outcome and exact candidate commit are recorded with the lane handoff.
- GitHub Actions deliberately runs no tests, lint, type checks, static analysis, coverage, accessibility checks, or screenshot checks. Those remain local responsibilities and do not gate release publication in the workflow.
- Remote release and GitHub Pages publication are pending the default-branch push and must be recorded below rather than predicted.

### Corrections recorded at commit `23bd12e797`

- **The completeness inventory was not checking its own evidence.** `verify-inventories.mjs` validated that each evidence template was a well-formed string and that each row carried a status, then never resolved a single path. Substituting `{id}` and looking: all 88 rows x 6 artifacts = 528 files, of which **528 are absent**, and four of the seven evidence directories do not exist. Under the previous check, flipping 88 statuses to `verified` would have turned the strict gate green with nothing behind it. The check now resolves every template a `verified` row claims and requires the file to exist, with anchored templates additionally required to mention that feature id. `negative-evidence-claims.mjs` proves it: four ways of lying turn it red, and a fully evidenced row is still accepted, so it refuses false claims rather than refusing everything. The run now prints `0/88 rows claim verified; 0 claimed evidence artifacts resolved on disk` — a figure that was always true and previously had nowhere to appear.
- **The design reference's font set was being shipped as a fraction of itself.** The reference names one Google Fonts stylesheet whose single request answers with **49 `@font-face` blocks** — one per family, per weight, per `unicode-range` subset. Three package substitutes stood in for them, collapsing four Roboto weights, dropping every non-latin subset, and supplying a Material Symbols face with no variation axes beneath a `.msym` rule that sets `FILL`, `wght`, `GRAD` and `opsz`. The browser synthesised silently, producing an interface that was uniformly slightly wrong with nothing to read in the source that looked incorrect. `console/scripts/download-fonts.mjs` now downloads all 49 files from the URL read out of the design file itself, preserves `font-weight` and `unicode-range` verbatim, rewrites only `src`, and records a SHA-256 per file in a committed manifest. Cost: 5.2 MB, of which 3.96 MB is the genuine variable symbol face.
- **The compiler's coverage of the design specification is otherwise complete.** An attribute-level audit of both reference files confirmed every tag, attribute, event and control-flow construct reaches the compiled renderer: 1,010 and 76 inline `style` props are emitted, the `<style>` block is carried, `style-hover`/`style-active` are rerouted into generated CSS, and `list`/`as`/`ctl` are consumed by the control-flow branches before the generic drop list runs. `design/support.js` is entirely design-tool editor and live-preview machinery — a browser interpreter of the same work `compile-design.mjs` does ahead of time — and its one behavioural contract, `DCLogic`, is already reimplemented in shipped `console/app/renderer/src/dc-runtime.tsx`. `design/uploads/*.png` are unreferenced authoring leftovers. The fonts were the divergence.

## Session handoff — superseded, see the section below

_The record that follows was accurate at commit `87cead7124` and has been overtaken. It is kept because its corrections and its WSL evidence still stand; its counts do not._

### Superseded record

### What this session changed

| Commit | Change |
| --- | --- |
| `0611732d09` | Downloaded the design reference's complete 49-face font set; was 3 package substitutes |
| `23bd12e797` | Made the completeness inventory resolve and require its own evidence artifacts |
| `f552a8cd3a` | Corrected the handoff and roadmap against the real tree |
| `899a3c3ecf` | Removed private vocabulary from every shipped and published surface, with a guard |
| `7e8adb70ce` | Created and managed the console's own WSL distribution from the packaged payload |
| `87cead7124` | Made the confirmation flow actually run the command it guarded |
| `bc1b43acc8` | Implemented the configuration transport the transaction engine had been waiting for |

### Verification at close

- Local suite: **144 test cases green, exit 0** — 12 design/leak, 49 renderer, 83 control-plane, plus the static-site and inventory checks. Every negative regression was observed red on a deliberate break and green on restoration.
- Remote CI was verified green at `23bd12e797`, which published release `ding-pbx-console-v0.0.7-r1` (non-draft, exact target, six assets). Runs for `899a3c3ecf`, `7e8adb70ce` and `87cead7124` were still in flight at close and their verdicts are **not** recorded here, because a predicted verdict is not a verdict.
- Release `ding-pbx-console-v0.0.5-r1` was independently verified: `RELEASES` and `SHA256SUMS.txt` were downloaded and read back, and the size `RELEASES` records for the full package matches the published asset exactly.

### WSL lifecycle, verified against a real machine

The provisioning module was driven against the host's real `wsl.exe` through the ordinary allowlisted executor, mutating nothing:

| Call | Result |
| --- | --- |
| `status(payloadPresent: true)` | `notProvisioned` — WSL answered, the console's distribution is absent |
| `status(payloadPresent: false)` | `payloadMissing` — the two states are correctly distinguished rather than conflated |
| `provision(payloadPresent: false)` | refused, and **no command reached WSL at all** |
| `remove('docker-desktop')` | **refused** — *"This console only removes ding-pbx-console; it will not unregister docker-desktop."* |

That last row is the one worth keeping. `docker-desktop` is the host's only real distribution, and the ownership boundary held against it on the real machine rather than against a scripted executor. The import path itself is still covered only by tests, because a development checkout has no packaged payload to import; it needs an installed build to exercise for real.

### Repository state at close

One branch on the remote (`master`), one local branch, one checkout, no linked worktrees, no stashes, clean tree. The four feature branches were already removed when they merged, so no cleanup pass was required and none was staged. `StructuredConfigPlanner` and `ConfigTransaction` — 270 lines of backup, stage, validate, apply, post-read and reverse-order rollback — had never executed once, because nothing implemented the transport they call; that transport now exists and is covered end to end, including a target that silently never changed being caught by the post-read and rolled back rather than reported as applied.

### The state a next owner most needs to know

**The interface is far less wired than it appears.** An audit found **7 of 32 destinations backed by live control-plane data**. Of nine declared control-plane actions, three were implemented and two were ever called from the interface. Twenty-one screens are complete, responsive editor forms — switches, selects, sliders — that persist nothing anywhere.

This session fixed the worst of it: every destructive and write control funnelled through one confirmation flow that closed the dialog and announced the command had been "executed and attested" while calling nothing at all. It now dispatches and reports the truth, including its refusals. **The twenty-one editor screens remain unwired** and are the largest honest gap in the product.

One genuine mitigation already in place: `App.tsx` blanks the design's 72 seeded sample rows at render, so no invented data reaches the screen. The affected destinations are honestly empty rather than falsely populated.

### Decisions taken, and what remains open

1. **Two commit messages carry private wording** — `9beed2f159` and `899a3c3ecf`. **Decided: they stay.** Correcting them would mean rewriting published history and force-pushing, and the owner declined that. This is recorded so a later reader finds a decision rather than an oversight, and so nobody "fixes" it by rewriting shared history later. Every editable surface was swept instead: release notes, the task issue, and the repository's own files are clean, and a guard now refuses any new occurrence in a shipped or published file.
2. **Installers published before `899a3c3ecf` contain the pre-scrub wording.** Binaries cannot be edited, so this cannot be scrubbed in place. Superseding or removing those releases remains open for the owner. Every release published from `899a3c3ecf` onward is clean.

## Current handoff

### Where the console actually is

| | At the start of this work | Now |
| --- | --- | --- |
| Destinations backed by live data | 7 of 32 | **20 of 32** |
| Control-plane actions implemented | 3 | **21** |
| Read-only Asterisk commands | 23 | **63** |
| Writable configuration files | 10 | **91** |
| Controls bound to real Asterisk keys | 0 | **82 of 130** |
| Local test cases | 117 | **1,116** |

### What is genuinely working

- **The console creates and manages its own Asterisk runtime.** The installer always carried a complete Ubuntu 24.04 root filesystem and nothing ever imported it. Four actions now create, verify, stop and remove a distribution the console owns, verifying by asking the distribution for its Asterisk version rather than trusting an exit code, refusing to import over an existing one, and refusing to remove one it did not create. Both refusals were exercised against the real machine, not a scripted double.
- **Configuration is read and written through a transaction.** `StructuredConfigPlanner` and `ConfigTransaction` — back up, stage, validate, apply, read back, compare, roll back in reverse — existed and had never once executed, because nothing implemented the transport they call. That transport exists now, and the whole path has run end to end against a real Asterisk installation: a change applied, independently re-read, then rolled back.
- **Confirmation actually performs the action.** Every destructive and write control funnelled through one flow that closed the dialog and announced the command "executed and attested" while calling nothing at all. It dispatches now and reports the real outcome, refusals included.
- **Ten destinations gained a reader**, each parsing the output format taken from the literal format string in Asterisk's own source rather than a guess. A guessed parser returns an empty list, which is exactly what those screens already showed, so that defect would have been invisible.
- **Media upload exists**, so a screen offering a custom prompt can accept one, refusing by name before a command is built and confirming the written size.
- **A real append-only history**, where a restore is a new record rather than a rewrite.
- **A standards-correct authenticator**, verified against all published RFC 6238 test vectors rather than merely passing its own tests.

### What is not, stated plainly

- **Nothing here has written to a real exchange.** Everything above was proved against a disposable distribution created for the purpose. No configuration change may be described as verified against production until an approved plan has run there.
- **48 of 130 controls remain unbound.** Each screen reports how many of its own controls are not yet connected. They stay unbound deliberately: a wrong binding does not fail loudly, it writes the wrong setting to a telephone exchange and looks like it worked.
- **The desktop interface has no accessibility attributes at all**, and nothing under its application directory is covered by a test. Both facts are recorded in the platform documentation where a reader will meet them.
- **The completeness inventory has no evidence behind any row.** The check now resolves every artifact a row claims and refuses a false claim, so the figure it prints is true rather than flattering.

### Corrections made during this work

- The claim that no release had ever carried the Asterisk payload **was wrong**. The installer script verifies the packaged runtime and throws when it is absent, and it predates this work; builds have been passing, so the payload has been shipping. The listing defect found was real but Windows-only, and the bundle step runs on Linux where it never applied.
- A fix for that Windows defect was applied unconditionally and **broke the Linux build**, because `$env:SystemRoot` is null there. Repaired, with both platform branches exercised before committing.
- A change adding the control plane to the standalone type-check would have accomplished nothing: TypeScript excludes files owned by a referenced project. The configuration was never wrong — the verification command being used was.

### Session of 2026-08-22

Verified on this tree, by running each suite: **1,014 local tests pass** -- 16 inventory
and drift, 485 renderer, 503 control plane, 10 static site -- plus the inventory
validators and the negative regressions.

Landed this session:

- **Automatic updates.** The application shipped Squirrel installers and never checked
  for a newer one, so an installed copy stayed on its version permanently. Squirrel's own
  protocol expects one accumulating multi-version feed and this pipeline publishes
  standalone immutable releases, so the check reads the releases API, verifies the
  download against that release's own digest list, and re-runs the installer. That is
  integrity, not authenticity: artifacts remain unsigned by policy and the banner says so.
  Observed working in the built application.
- **More than one server.** An inventory with independently tracked per-server state and
  a response-routing guard, so a slow answer from one server cannot be written into
  another's slot. The design's servers table was being fed from PBX readings, which it is
  not -- the list exists before anything is reachable -- and its screen kind was not one
  the table branch recognised, so it never rendered at all.
- **A daemon lifecycle.** Provisioning verified `asterisk -V`, which proves only that the
  binary exists. Every reading needs a running daemon and nothing ever started one, so a
  healthy runtime read nothing on every screen. Start now polls until the daemon actually
  answers rather than trusting an exit code, and the console starts it automatically on
  discovery.
- **Personal vocabulary loading**, bounded and fail-closed, matching the site's schema so
  the same file loads in both. Nothing ships preloaded.
- **Controls for all of the above**, added to the design reference and compiled, including
  a new file control kind. Three of these capabilities were finished and unreachable
  before this.

Found by deploying rather than by reading:

- A WSL distribution stays **registered when its virtual disk is deleted underneath it**.
  The console then refused to create it (the name exists) and could not use it (it does
  not answer), with a message saying creation had failed when nothing had been created.
  That dead end is now its own state, whose message names the escape.
- **WSL writes its failures to stdout, not stderr.** Reading stderr alone discarded the
  disk path and error code and replaced them with a generic sentence.

Mistakes made and corrected in the same session, recorded because both are easy to repeat:

- An edit written through a tool defaulting to the platform's legacy code page turned an
  ellipsis into a byte no UTF-8 reader accepts, and the bundler refused the module --
  naming the *importing* file, not the unreadable one.
- The repair was worse than the fault: re-encoding the whole file treated every already
  correct character as legacy, so every dash and ellipsis was encoded twice. It built
  cleanly, passed every test, and put mojibake on screen. `console/tests/ui/source-encoding.test.mjs`
  now checks both faults, because a valid-UTF-8 check alone cannot catch the second.

Still true and unchanged: **no write has been made to a real exchange**, and the
completeness inventory has evidence behind no row -- 42 features across two surfaces, of
which only the documentation column is complete.


### Where this session stopped

Closed at a usage limit, deliberately rather than mid-edit. The working tree was clean
and the default branch matched the remote exactly at the time of writing, so nothing was
left uncommitted anywhere.

Two lanes were started and stopped before either wrote a file, so there is no partial
work to recover and no half-finished module in the tree:

- **Localization.** Still entirely absent, and it is the item that blocks a whole
  evidence column as well as being a product contract in its own right. Start here.
- **The implementation registry** (`console/app/feature-registry.json`). Still absent.
  It is the cheapest of the five missing evidence columns because it is a record of code
  that already exists, but it is only worth having if every row is checked against the
  source first: a registry that names a file which does not implement the feature is
  worse than no registry, because the inventory check would then pass on a false claim.

Neither is blocked by anything external. Both are ordinary work.


### In flight at 2026-08-23

Four lanes were running when this was written. Each is uncommitted work in a named
checkout; none had landed, and none of it should be described as working until its own
report and suites are checked.

**On `feat/freepbx-parity-electron`** (checkout `../asterisk-pr3`, pull request #3):

- Its one failing check is **fixed and green** -- commit `a6701e9d70`, run 32654148588.
  The checked-in `m3-control.tsx` was one trailing blank line short of what the compiler
  and the PBX extension produce. Nothing about the rendered interface changed.
  - Worth knowing before diagnosing that gate again: **the assertion prints a long slice
    of surrounding context before the difference**, so the excerpt shows an unrelated
    element and reads as a missing control. It said `... 9995 more characters`, which is
    truncated context and not the size of the change. Reproduce it instead of reading the
    excerpt: run the compile, run the extension, then diff the generated directory.
  - This is **not** the line-ending hazard recorded elsewhere in this document. The same
    single blank line reproduces identically on Windows and on the Linux runner.
- The parity plan's own gate -- a recorded successful validation run -- is now satisfied,
  so `draft` is the only remaining block on that pull request.
- Two lanes are extending it: the feature catalogue beyond its current 95 Standard Module
  entries, and the writable resource surface beyond its current 47.

**On `master`** (this checkout), two lanes for a direction added this session:

- **A VM-hosted server mode**, so the console can be installed on a machine beside
  Asterisk and administered from a browser, the way FreePBX is. It reuses the existing
  action dispatch rather than growing a second one, and adds authentication, TLS, a
  loopback-by-default bind address, a systemd unit and an install script.
- **A second desktop application that deploys that server in one click**, to a local
  hypervisor VM or an existing Linux host over SSH, verifying by asking the server and
  Asterisk rather than by trusting an exit code.

The parity boundary is unchanged and still correct: the FreePBX PHP framework, its
database and module loader, commercial licensing and entitlement, provider cloud APIs,
and the host operating-system firewall are **not** implemented and must not be presented
as though they were.


### Session of 2026-08-23

Verified by running each suite on this tree: **1,116 local tests** -- 19 inventory and
drift, 516 renderer, 533 control plane, 10 static site, 8 hosted server, 30 installer
image. Build clean, design-drift guard green.

What changed, and why each mattered:

- **The catalogue tab is gone.** All 107 FreePBX features registered a screen with an
  empty control list, parked in a rail of their own -- 107 named pages that did nothing.
  Nineteen described capabilities the console already had a screen for and are merged
  into it rather than duplicated; the other eighty-eight are routed onto the four real
  rails from a per-feature table that can be read and argued with.
- **The onboarding wizard was implemented.** The compiled design carried every step of it
  and the application implemented none, so the first surface a new user met did nothing
  while offering to build a working phone system in one press. It now reads the target's
  configuration, builds a real plan, confirms it through the same gate as every other
  write, and applies it through the transaction path. The one promise that could not be
  backed -- business hours -- was removed from the copy rather than faked.
- **Four subsystems gained rows**: voicemail, conferences, hold music and the manager
  interfaces. Reading them against a live target found a parser that required a zone
  column and therefore returned nothing at all for three configured mailboxes.
- **A choice can now ask for what it needs.** The design gained a conditional mechanism;
  the hold-music screen offered four modes and asked for nothing further, so two of them
  could be chosen and never completed.
- **An installer image was built.** The first one was valid, correct and unbootable, and
  every test passed on it. See the ISO section for what that cost and what it changed.
- **A PJSIP endpoint model** that treats the endpoint, auth and aor trio as one identity,
  verified by writing an endpoint to the live target and reading every field back.

Two corrections worth carrying forward, both found by checking a claim rather than
accepting it:

- An audit recorded six PJSIP keys as verified against the sample file. None of them has
  a documented line in it; they were mentioned in prose only. They are excluded rather
  than given invented values.
- The feature catalogue contained two entries -- `sms-plus` and `sms-webhook` -- matching
  no module FreePBX ships under any name. A fabricated feature breaks no test, so nothing
  was ever going to catch it.

**The scoreboard has not moved.** `FREEPBX_FEATURES.md` reads 605 unchecked, none
checked. Everything above is real and none of it clears that document's bar, which
requires a rendered control, applied and read back, with a positive and a negative
regression. Its own rule is the reason: an item is not checked merely because a
destination exists. One subsection of it is unbuildable rather than unbuilt -- the legacy
SIP channel fields specify a driver this Asterisk does not contain.


### What blocks a release-grade close, exactly

The completeness inventory holds **84 unverified rows and 4 exempt, none verified**, across two
surfaces. A row reaches `verified` only when all six of its evidence artifacts resolve on disk, and
**three of the six do not exist anywhere in the repository**:

- `console/app/feature-registry.json` — absent
- `console/app/locales/feature-registry.json` — absent
- `console/tests/contracts/` — absent

So producing captures and interaction records, which is now possible, cannot move a single row on
its own. That was worth discovering before spending a pass on captures: the missing columns are the
binding constraint, and one of them is not a documentation gap at all -- the application has no
localization mechanism, so the localized-copy column requires building one.

### Driving the built application, and one way it stops working

Screens below the sidebar fold cannot be reached by scrolling: scrolling is a foreground action and
the headless route refuses it rather than taking over the visible desktop. The route that works is
the debugging protocol -- launch with `--remote-debugging-port`, require the target list to hold
exactly one `page`, and drive it with `Runtime.evaluate`. Never pass `awaitPromise`; keep every
expression synchronous.

**A blocking launch will wedge the capture tool completely.** Using `run_command` for a windowed
application never returns, and the stuck call holds the server: every later call, including trivial
ones, times out with no response. It looks exactly like the server having died. It is not -- killing
the stray application processes frees it immediately, and the server was healthy again on the next
call. Use the headless-desktop launch call, never `run_command`, for anything with a window.

Two detection traps in this interface, both of which read as "the control is missing" when it is
present: looking for a native `select` finds nothing, because a choice renders as a row of buttons;
and matching button text finds every option **except the one currently set**, because the selected
option carries a mark and its text is not the bare value.

## Language, School mode and narration lane

The desktop language lane is implemented in commits `1b920405cfc18908565da8eb531aba089a06f17e`,
`303733d7ab3018f132a824bff4b6582fc243d41e`, and `d743779088`. The design source adds three language modes, independent English and Cantonese funny
levels, a persisted dialog-emoji switch, a shared renamable School mode, and an off-by-default narration
group. The renderer mounts the existing localization boundary, applies bounded funny wrappers to app
notifications and dialogs, polls the shared settings snapshot once per second, and hides Cantonese,
funny, vocabulary, dialog-emoji and narration controls while School mode is active. Electron stores
the School unlock credential through the operating-system credential vault under a stable account key using the `keytar` adapter; the plain settings snapshot and application-data files never receive it.

The browser speech adapter enumerates the installed voice list late through `voiceschanged`, persists
stable voice URI identities, reports missing and network-backed choices, and serializes English then
Cantonese for `Both`. Events are split into independent English and Cantonese tracks before funny
styling and speech. Cantonese accepts only `zh-HK` or `yue-HK`; duplicate voice names carry an engine
or URI suffix. The app-owned credential dialog exposes the exact `%APPDATA%\\ding-pbx-console` recovery
line. No tests, lint, broad build, packaging, UI capture or release work was run in this lane, per its
bounded scope. The generated renderer and docs bundle were regenerated from the checked-in design and
Markdown sources. A type-check attempt was not independently usable because this isolated checkout has
no installed React dependencies and no referenced Electron declaration outputs.

The School credential now uses the shared `keytar` OS-vault account contract in
`shared/school-contract.ts`. The supported packaging path rebuilds native add-ons through
`electron-builder install-app-deps`, unpacks `keytar` from the asar, and runs
`scripts/verify-keytar-packaged.mjs` to load the packaged native module and complete a vault
round-trip. The packaging controller now stages candidate provenance before the builder, compares
the final release identity with independent controller values, and passes that identity into a
probe-only preload and main-process IPC route. Credential operations run in isolated cancellable
workers with cumulative bounded cleanup evidence. The probe asserts the requested isolated
application data path before dispatcher initialization, uses the shared production reparse
validator, waits for a bounded post-kill exit deadline, records each cleanup result, and retains
the forensic profile when child exit cannot be proven. The event census has one runtime record and
stable call ID for each of 276 App, design, and generated event calls, plus the 12 App template
records, with an explicit localized or plain-English fallback status for each. The 98 generated
records carry one-to-one design-source pairing metadata, and text lookup is reserved for
non-census fallback paths. These records and the release checks remain `implemented-unverified`
because package execution was not run in this lane.


## Next owner actions

Ordered by what actually blocks the next claim.

1. **Write to a disposable PBX target through an explicitly approved plan.** The read path
   is now exercised end to end against a live Asterisk; the write path is not. Until that
   happens, no configuration mutation may be described as working.
2. **Produce the completeness inventory's evidence.** 42 features across two surfaces need
   six artifacts each. Documentation is complete for all 42; the implementation registry,
   localization registry and contract-test directory do not exist, and there is one
   built-interaction record and one capture. This is what blocks the release-grade closeout.
3. **Build the localization mechanism.** The application has no i18n of any kind, so the
   three language modes and both funny-level sliders do not exist. It blocks a whole
   evidence column and is a product contract in its own right.
4. **Bind the remaining controls, or state per screen why not.** Each screen reports its
   own unbound count. They stay unbound deliberately -- a wrong binding writes a wrong key.
5. **Make the dashboard's stated refresh cadence true.** It says `refreshing 1s` and does
   not re-check after a failed read: a stale error survived until the application was
   relaunched. A label claiming a cadence it does not keep is the decorative-UI defect the
   rest of this product forbids.
6. **Add accessibility attributes to the desktop interface**, which currently has none,
   and cover the application directory with tests.
7. **Retained, not merged: `claude/busy-zhukovsky-ae0b75`.** One commit, clean worktree,
   but not an ancestor of `master`, and `master` has moved well past it -- merging would
   revert later site work. Keep it or drop it deliberately; do not merge it blindly.

## Updater evidence added on 2026-08-23

The updater evidence lane fast-forwarded this branch through source commit
`b29850dd1ae63553dc6c60ecdedc60adb6707a77` and preserved the two contract-test commits in
that graph. It copied two supplied real built-artifact captures byte-for-byte into
`console/docs/platform/captures/automatic-updates/`:

- `baseline-update-ready.png`: 1456 x 928, SHA-256
  `3a92900f8fd19a722ece3175567df346d8f272ee24d7ac47e3681b1db5216d99`. This is the old
  `0.1.0` baseline from source and release commit `745d7425df791646aef4a6972c96dcf279a6004a`,
  tag `ding-pbx-console-v0.0.82-r1`, with the repaired `0.1.84` candidate from
  `870be47d6708b32f7fed154abf0ca3779f1fe3bb`, tag `ding-pbx-console-v0.0.84-r1`.
- `installed84-draft-blocked.png`: 1456 x 928, SHA-256
  `79d4257a806ef31aea22cef34ce490cc980fdd527ce84a5adfe60e6bd197b751`. This is the
  installed `0.1.84` artifact from `870be47d6708b32f7fed154abf0ca3779f1fe3bb`, with the
  next `0.1.85` release record from `b29850dd1ae63553dc6c60ecdedc60adb6707a77`, tag
  `ding-pbx-console-v0.0.85-r1`, and two PBX drafts blocking restart.

The evidence was captured through Lowlevel on named hidden desktops, using task-local CDP
ports `9346` and `9347`, exact expected file URLs, bounded synchronous evaluation, and a
one-page target preflight. The run also recorded direct `Setup.exe` launch success, the
repaired restart path, Later hiding the banner while retaining the staged candidate, and
the visible review, apply, or discard block for two drafts. The detailed public article is
`console/docs/platform/automatic-updates-evidence.md`. No new capture was made in this lane.

## Attention runtime mount on 2026-08-23

The desktop attention runtime is implemented but unverified on `codex/mount-attention-runtime`.
`App.tsx` restores all five independent switches and the persisted `att_next` action after the durable settings snapshot loads. It applies Focus dimming without removing inactive work, Low stimulation color and motion consumers, live operating-system reduced-motion composition, session and since-last-change values, and a factual Momentum prompt with a 30-minute snooze.

The checked-in design adds the `att_next` text control, generated renderer output was refreshed with `npm run compile:design`, and Cantonese labels cover the new control. Directly related records are `console/app/feature-registry.json`, `console/app/locales/feature-registry.json`, `console/docs/platform/attention-modes.md`, `console/docs/changelog/attention-runtime-mount.md`, and `ROADMAP.md`.

The refutation repair now uses semantic markers from the design for title bar, tab strip, rail, section list, work region, and attention-card mount instead of child indexes. It also acknowledges attention writes, bounds restored snoozes, suppresses informational notifications only, retains warning and error history, and records last-change time through the explicit mutation-path inventory while leaving passive reads and navigation alone.

The second refutation repair adds the generated `onUserMutation` callback for controls, steppers, appearance, canvas, layout, tabs, groups, presets, and direct application-owned mutations. Durable writes are serialized per key and newest generations decide pending, session-only, retry, or saved state. Notification severity is passed explicitly through the notification and ceremony APIs, with no text heuristic.

The fourth refutation repair routes every App and generated notification producer through typed notification helpers, persists bounded schema-versioned redacted warning and error history with restore, search, clear, and export, and adds exact mutation action and notification producer inventories. Host settings roll back their in-memory map when atomic persistence fails, while Group tabs by area is real and Move to new window is explicitly unavailable.

The fifth refutation repair wires `verifyAttentionWiring` into `scripts/verify-inventories.mjs` through Node's type stripping, with one deliberate red and restored-green fixture for each of the six rows. It also separates mode and history persistence status, shows corrupt history without deleting it, adds reset recovery, expands path redaction to Windows, UNC, POSIX, relative, and PBX paths, and removes raw App and generated notification calls in favor of typed helpers.

No UI, accessibility, browser, capture, Lowlevel, broad build, packaging, or release verification was run in this lane. The next owner must run focused built-artifact checks for mount restoration, each mode's visible consumer, the next-action persistence path, Momentum snooze expiry, keyboard access, reduced-motion behavior, refused durable writes, and reviewable warning or error history before marking the feature verified.
