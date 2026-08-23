# Ding PBX delivery handoff

## Scope

This handoff covers the integrated Ding PBX Console desktop application, bounded PBX control plane, GitHub Pages documentation application, repository delivery automation, line counting, completeness and design-parity inventories, contributor guidance, and release evidence contracts.

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
- Not verified: nothing has been run against a live Asterisk. This machine has neither WSL nor Docker, so no target exists here. Every CLI parser was written against the format strings in this repository's Asterisk sources — `main/cli.c`, `main/pbx.c`, `main/loader.c`, `res/res_pjsip/pjsip_configuration.c`, `res/res_pjsip/location.c`, `res/res_pjsip_outbound_registration.c`, `apps/app_queue.c` — and is covered by fixtures derived from those functions, but source-derived is not live-verified. The packaged desktop application was not rebuilt or re-captured for this change.

## Continuing on another device

Everything below is on the default branch. To pick this up elsewhere:

1. Clone, then from `console/` run `download-dependencies.bat /s` at the repository root, or `npm ci` inside `console/` for renderer work only.
2. `npm test` in `console/` runs the whole local suite — renderer, control plane, static site, inventory validators and both negative regressions. `npm run build` compiles the design and builds the renderer.
3. Do not hand-edit `console/app/renderer/src/generated/`. It is produced by `node console/scripts/compile-design.mjs` from `design/`, which is a read-only reference. Change the design and recompile; `console/tests/ui/design-drift.test.mjs` fails if the shipped renderer is not byte-identical to a fresh compile. Those paths are pinned to `eol=lf` so the guard holds on any platform.
4. The single highest-value next step is a machine with WSL or Docker. No reading in this repository has been exercised against a live Asterisk, because this machine has neither. Install a target, discover it from **App > Deploy & servers**, then walk the readable destinations and correct any parser whose fixtures do not match reality.
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

## Session handoff — closing at commit `87cead7124`

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

### Repository state at close

One branch on the remote (`master`), one local branch, one checkout, no linked worktrees, no stashes, clean tree. The four feature branches were already removed when they merged, so no cleanup pass was required and none was staged. `StructuredConfigPlanner` and `ConfigTransaction` — 270 lines of backup, stage, validate, apply, post-read and reverse-order rollback — had never executed once, because nothing implemented the transport they call; that transport now exists and is covered end to end, including a target that silently never changed being caught by the post-read and rolled back rather than reported as applied.

### The state a next owner most needs to know

**The interface is far less wired than it appears.** An audit found **7 of 32 destinations backed by live control-plane data**. Of nine declared control-plane actions, three were implemented and two were ever called from the interface. Twenty-one screens are complete, responsive editor forms — switches, selects, sliders — that persist nothing anywhere.

This session fixed the worst of it: every destructive and write control funnelled through one confirmation flow that closed the dialog and announced the command had been "executed and attested" while calling nothing at all. It now dispatches and reports the truth, including its refusals. **The twenty-one editor screens remain unwired** and are the largest honest gap in the product.

One genuine mitigation already in place: `App.tsx` blanks the design's 72 seeded sample rows at render, so no invented data reaches the screen. The affected destinations are honestly empty rather than falsely populated.

### Decisions taken, and what remains open

1. **Two commit messages carry private wording** — `9beed2f159` and `899a3c3ecf`. **Decided: they stay.** Correcting them would mean rewriting published history and force-pushing, and the owner declined that. This is recorded so a later reader finds a decision rather than an oversight, and so nobody "fixes" it by rewriting shared history later. Every editable surface was swept instead: release notes, the task issue, and the repository's own files are clean, and a guard now refuses any new occurrence in a shipped or published file.
2. **Installers published before `899a3c3ecf` contain the pre-scrub wording.** Binaries cannot be edited, so this cannot be scrubbed in place. Superseding or removing those releases remains open for the owner. Every release published from `899a3c3ecf` onward is clean.

## Next owner actions

1. Review and merge `design-parity-real-readings`, then publish the integrated candidate from the default branch and verify the workflow, release assets, and GitHub Pages response independently.
2. Run every reading against a live Asterisk on a machine that has one. No parser has yet been exercised against real command output — only against fixtures derived from this repository's Asterisk sources — so treat the readings as unverified until a real target has answered them. **This machine now has both WSL and Docker**, correcting an earlier note that said it had neither: `wsl.exe` is present (one distribution, `docker-desktop`) and Docker server `29.6.2` responds with no containers running. Either is a viable disposable target, so this item is no longer blocked on hardware.
3. Produce the reference-versus-built captures and visual diffs the parity inventory's evidence templates describe, so the 32 destinations can move from `compiled` to `verified`. `compiled` records a render-based assertion only.
4. Read per-endpoint transport and codecs so those columns stop reading `—`, and wire real sources for the history, agent-rail and trunk-authentication surfaces, which are currently empty with a stated reason.
5. Continue replacing unverified per-surface inventory evidence with exact built-interaction and capture records; the earlier candidate proves the server-discovery route, not every universal feature.
6. Exercise an explicitly approved target-specific write plan against a disposable PBX target before describing any configuration mutation as production-verified.
