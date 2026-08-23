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
- Reworked the static site into a responsive product-marketing and documentation surface with an animated hero, an explicitly simulated deterministic telemetry panel, bento product sections, scroll reveals, a responsive 32-destination navigator, local theme/language/density controls, accessible search and anchored regular-expression tooling, and an installer action that remains unavailable until a verified immutable URL exists.
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

## Delivery record for the design-parity change

- Candidate commit `550bf81a821a95d83581f580b705db884e4fc0e7` on branch `design-parity-real-readings`, pushed to `origin` and tracking `origin/design-parity-real-readings`. The change was not pushed to the default branch, so nothing was released.
- Neither workflow ran. `.github/workflows/delivery.yml` and `.github/workflows/pages.yml` both trigger only on `push` to `master` or on manual dispatch, so this push produced no desktop build, no release, no tag and no Pages deployment. Publication remains pending a default-branch push and must be recorded from the observed run rather than predicted.
- Verified on the committed tree with `npm test` in `console/`: 126 local tests pass — 9 inventory and drift, 39 renderer, 69 control-plane, 9 static site. The inventory validators pass with `--allow-unverified`, and the two negative regressions show 14 deliberate breaks red and restoration green.
- The repository had no `.gitattributes` and the working copy uses `core.autocrlf=true`, so a checkout would have rewritten the compiled renderer to CRLF while the compiler emits LF, failing the byte-identical drift guard on every machine except the authoring one. `console/app/renderer/src/generated/.gitattributes` now pins those paths to `eol=lf`; the file was deleted, re-checked-out, confirmed LF, and the guard was re-run green.
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
- The static-site builder produced 43 deterministic files including `console/site/dist/build-manifest.json`; the site test rejects runtime network fetches.
- The marketing-surface lane intentionally did not run tests, lint, reviews, audits, accessibility automation, or captures under its ultra-speed delivery boundary. Its production composition outcome and exact candidate commit are recorded with the lane handoff.
- GitHub Actions deliberately runs no tests, lint, type checks, static analysis, coverage, accessibility checks, or screenshot checks. Those remain local responsibilities and do not gate release publication in the workflow.
- Remote release and GitHub Pages publication are pending the default-branch push and must be recorded below rather than predicted.

## Next owner actions

1. Review and merge `design-parity-real-readings`, then publish the integrated candidate from the default branch and verify the workflow, release assets, and GitHub Pages response independently.
2. Run every reading against a live Asterisk on a machine that has one. This machine has neither WSL nor Docker, so no parser has been exercised against real command output — only against fixtures derived from this repository's Asterisk sources. Treat the readings as unverified until a real target has answered them.
3. Produce the reference-versus-built captures and visual diffs the parity inventory's evidence templates describe, so the 32 destinations can move from `compiled` to `verified`. `compiled` records a render-based assertion only.
4. Read per-endpoint transport and codecs so those columns stop reading `—`, and wire real sources for the history, agent-rail and trunk-authentication surfaces, which are currently empty with a stated reason.
5. Continue replacing unverified per-surface inventory evidence with exact built-interaction and capture records; the earlier candidate proves the server-discovery route, not every universal feature.
6. Exercise an explicitly approved target-specific write plan against a disposable PBX target before describing any configuration mutation as production-verified.
