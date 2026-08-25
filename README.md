# Ding PBX Console

**Ding PBX Console** is a Windows desktop application for administering [Asterisk](https://www.asterisk.org/) PBX installations. It talks to a target over an allowlisted, no-shell control plane, carries its own Ubuntu WSL runtime so a target exists out of the box, and covers 32 destinations across dialplan, endpoints, trunks, queues, voicemail, security, and system administration.

Install: download the latest unsigned Windows installer from the [Releases page](https://github.com/Ding-Ding-Projects/asterisk/releases/latest) and run it — it will show an unknown-publisher warning (see [Installers are unsigned](#installers-are-unsigned)).
Documentation and downloads: **https://ding-ding-projects.github.io/asterisk/**

**Contents:** [What it is](#what-ding-pbx-console-is) · [What it looks like](#what-it-looks-like) · [Reaching a PBX](#reaching-a-pbx) · [Build and installer scripts](#build-and-installer-scripts) · [The bundled WSL runtime](#the-bundled-wsl-runtime) · [Safety model](#the-control-planes-safety-model) · [Testing](#testing) · [Documentation](#documentation) · [Contributing](#contributing) · [What is not done yet](#what-is-not-done-yet) · [This is a fork of Asterisk](#this-is-a-fork-of-asterisk) · [How long this would take a person](#how-long-this-would-take-a-person-to-write)

---

<details>
<summary><strong>What Ding PBX Console is</strong></summary>

A Windows desktop application, built with Electron and a compiled design system, that gives an administrator one place to observe and configure an Asterisk PBX: channels, endpoints, trunks, registrations, queues, contacts, modules, dialplan (drawn from the target's own `dialplan show` output), voicemail, conferences, music on hold, codecs, access control, call records, logging, and the AMI/REST surface.

It ships as a single Windows installer that carries a complete Ubuntu 24.04 root filesystem with Asterisk and its runtime dependencies already compiled in, so there is a target to connect to without the user separately standing up a PBX first.

The interface is organized into six navigation rails covering 32 destinations, with tabbed navigation, searchable menus and lists, an anchored regex builder, a command palette, guided flows, appearance controls, non-blocking notifications, and guarded destructive-action previews.

</summary>
</details>

<details>
<summary><strong>Reaching a PBX</strong></summary>

The console discovers or connects to a target through:

- **WSL 2 Ubuntu on Windows** — including the console's own bundled distribution, created, verified, stopped, and removed entirely through the app (**App → Deploy & servers**);
- **a local Docker container** discovered by project label; or
- **a remote Debian or Ubuntu host** reached over SSH with scoped trust-on-first-use host-key handling.

Every one of those routes goes through the same bounded control plane described below — there is no path that reaches a target through an unrestricted shell.

</summary>
</details>

<details>
<summary><strong>Build and installer scripts (repository root)</strong></summary>

Run from the repository root on Windows:

| Script | What it does |
| --- | --- |
| `download-dependencies.bat [/s]` | Fetches and digest-verifies every pinned dependency (currently a pinned Node.js build) into a user-scoped, per-project cache. Idempotent; re-run is a no-op once warm. |
| `build.bat [/s]` | Runs the dependency fetch, `npm ci`, and builds a runnable copy of the console out of the checkout. `/s` (also `--silent`, or `SILENT=1`) runs unattended with no prompts, for CI or another agent. |
| `build-installer.bat [/s]` | Builds the actual Windows installer through Squirrel.Windows — the same packaging path CI uses — and verifies the produced `Setup.exe`, `RELEASES` index, and full `.nupkg` exist, are the right shape, and are unsigned (`NotSigned`) as expected. Prints the SHA-256 of each output. |
| `build-wsl-throwaway.bat` | Builds the Ubuntu root filesystem image that gets bundled into the installer, by compiling this repository's own Asterisk source inside a container. |

Every script installs what it needs itself — no separate "install X first" step — reports honestly per phase, and never touches code signing (permanently out of scope; see [Installers are unsigned](#installers-are-unsigned)).

</summary>
</details>

<details>
<summary><strong>The bundled WSL runtime</strong></summary>

The installer carries a complete Ubuntu 24.04 root filesystem, built by `build-wsl-throwaway.bat` from this exact repository commit, with Asterisk and every runtime library it needs already compiled and installed — verified by checking the closure of dynamic-library dependencies, not just a successful compile. The console can create, verify, stop, and remove its own distribution (**App → Deploy & servers**), verifying success by asking the distribution for its actual Asterisk version rather than trusting a process exit code, and it refuses to import over an existing distribution or remove one it did not create — both refusals have been exercised against a real Windows/WSL machine, not a scripted stand-in.

Currently the runtime image is compiled locally by `build-wsl-throwaway.bat`, which takes tens of minutes and needs a working container engine. Building it in CI and pulling a digest-pinned image at packaging time instead is tracked as open work in `ROADMAP.md`.

</summary>
</details>

<details>
<summary><strong>The control plane's safety model</strong></summary>

Nothing the console does reaches a target through an open shell. Every action goes through:

- an **allowlist of read-only CLI commands** (63 of them, each verified against Asterisk's own source rather than invented) for observation, and
- an **allowlist of writable configuration resources** (41 files) for change, reached only through `ConfigTransaction` / `StructuredConfigPlanner`: **backup → stage → validate → apply → post-read → compare**, with automatic rollback if the post-read doesn't match what was written.

There is no free-text command execution and no path that lets the interface construct an arbitrary shell invocation. Every destructive or write action is dispatched through one confirmation flow that now actually calls the underlying action and reports its real outcome — including refusals — rather than announcing success unconditionally.

</summary>
</details>

<details>
<summary><strong>Testing</strong></summary>

From `console/`:

```
npm test
```

This runs the renderer, control-plane, and static-site suites, then the design-parity and completeness inventory validators together with their negative regressions (which deliberately break each guard and confirm it goes red, then confirm restoring it goes green).

Measured on this tree at the commit below:

| Suite | Tests | Pass | Fail |
| --- | ---: | ---: | ---: |
| Inventory / drift | 12 | 12 | 0 |
| Renderer | 424 | 424 | 0 |
| Control plane | 348 | 345 | **3** |
| Static site | 10 | 10 | 0 |

The three control-plane failures are all in the access-control-list (`acl.conf`) address-matching tests (`evaluate returns the matching rule index for a permitted address`, `... a denied address`, and `... an IPv6 address`) — expected, since access-control-rule editing is one of the largest unimplemented gaps (see below) and its evaluator is still under construction. Every other suite is fully green, and both inventory negative regressions were confirmed red-then-green on this run.

</summary>
</details>

<details>
<summary><strong>Documentation</strong></summary>

The Windows application bundles all 82 feature articles offline, with search and link resolution, so the documentation ships inside the installer with no network dependency. The same content, plus product and download pages, is published as a static site with no runtime asset fetches at **https://ding-ding-projects.github.io/asterisk/**.

</summary>
</details>

<details>
<summary><strong>Contributing</strong></summary>

1. Clone the repository, then run `download-dependencies.bat /s` at the root (or `npm ci` inside `console/` for renderer-only work).
2. `npm test` in `console/` runs the full local suite described above.
3. **Do not hand-edit `console/app/renderer/src/generated/`.** It is compiled from the checked-in design reference at `design/` by `node console/scripts/compile-design.mjs`; `console/tests/ui/design-drift.test.mjs` fails the build if the shipped renderer is not byte-identical to a fresh compile. Change the design reference and recompile instead.
4. `ROADMAP.md` and `HANDOFF.md` are kept current and are the honest source of what is and isn't done — read them before proposing a feature.
5. No sample or invented data may be reintroduced into the running application: an unread surface stays empty with a stated reason, and an unread cell renders as an em dash, never a placeholder value.

</summary>
</details>

<details>
<summary><strong>What is not done yet</strong></summary>

Stated plainly, from `ROADMAP.md` and `HANDOFF.md`:

- **Nothing has been written to a real Asterisk exchange.** Every write path — including the configuration transaction engine — has been proved only against a disposable throwaway distribution created for testing. No configuration change may be described as verified against production until an approved plan has run against a real target.
- **16 of 32 destinations are backed by live data.** The rest render honestly empty screens rather than sample content.
- **48 of 130 bound controls remain deliberately unwired.** Each screen states how many of its own controls are not yet connected — a wrong binding doesn't fail loudly, it writes the wrong setting to a telephone exchange and looks like it worked.
- **The desktop interface has no accessibility attributes at all**, and nothing under its application directory is covered by a test.
- **Large gaps in Asterisk coverage remain**, including access control rules (`acl.conf`), sound prompt management, TLS/certificate management, hardware trunks, database/realtime backends, fax, channel event logging, STIR/SHAKEN attestation, and several more — see `ROADMAP.md` for the full list.
- **No screenshots or built-artifact captures exist yet** for most of the interface. Where a picture would normally go here, none is included rather than fabricated or borrowed from elsewhere; producing a real capture set from the built application is open work.

</summary>
</details>

## What it looks like

Every image below is a capture of the real built application, driven on an off-screen desktop so no visible desktop was ever recorded. Each was decoded and sampled before being committed, and each carries its own digest in `console/release/captures/gallery/gallery.json`.

> [!NOTE]
> The tables are empty in most of these because the console was pointed at a freshly provisioned target with no calls, no endpoints and no queues. That is the product working as designed: an empty table is the truth of the running system, and a populated demonstration would not be.

<details>
<summary><strong>Dashboard</strong></summary>

![Dashboard in Ding PBX Console. Live counters read from the running system rather than a configuration file: active channels, endpoints up, queues waiting and uptime, each labelled with the command it came from.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/00-dashboard.png)

Live counters read from the running system rather than a configuration file: active channels, endpoints up, queues waiting and uptime, each labelled with the command it came from.

</details>

<details>
<summary><strong>Confirmation credits</strong></summary>

![Confirmation credits in Ding PBX Console. The arcade. Credits earned here skip one confirmation ceremony -- but never one above the danger line, because some mistakes deserve friction.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/01-confirmation-credits.png)

The arcade. Credits earned here skip one confirmation ceremony -- but never one above the danger line, because some mistakes deserve friction.

</details>

<details>
<summary><strong>Voicemail boxes</strong></summary>

![Voicemail boxes in Ding PBX Console. Mailboxes as the target reports them.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/02-voicemail-boxes.png)

Mailboxes as the target reports them.

</details>

<details>
<summary><strong>Call records</strong></summary>

![Call records in Ding PBX Console. Call detail and channel event logging, with the tracked events and applications each backend records.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/03-call-records.png)

Call detail and channel event logging, with the tracked events and applications each backend records.

</details>

<details>
<summary><strong>Modules</strong></summary>

![Modules in Ding PBX Console. Loaded modules and their state.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/04-modules.png)

Loaded modules and their state.

</details>

<details>
<summary><strong>Memory console</strong></summary>

![Memory console in Ding PBX Console. The agent-facing surface, deliberately empty of any private corpus.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/05-memory-console.png)

The agent-facing surface, deliberately empty of any private corpus.

</details>

<details>
<summary><strong>Deploy a server</strong></summary>

![Deploy a server in Ding PBX Console. Creating, verifying, stopping and removing the console own bundled distribution. It refuses to touch any distribution it did not create.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/06-deploy-a-server.png)

Creating, verifying, stopping and removing the console own bundled distribution. It refuses to touch any distribution it did not create.

</details>

<details>
<summary><strong>Live channels</strong></summary>

![Live channels in Ding PBX Console. Calls in flight, refreshed continuously, empty when nothing is up.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/drive-live-channels.png)

Calls in flight, refreshed continuously, empty when nothing is up.

> Taken during the interaction drive, so a panel is open over part of the screen.

</details>

<details>
<summary><strong>PJSIP endpoints</strong></summary>

![PJSIP endpoints in Ding PBX Console. One row per endpoint, read from the target rather than invented. An empty table is honest; a made-up one is not.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/drive-pjsip-endpoints.png)

One row per endpoint, read from the target rather than invented. An empty table is honest; a made-up one is not.

> Taken during the interaction drive, so a panel is open over part of the screen.

</details>

<details>
<summary><strong>Trunks & registrations</strong></summary>

![Trunks & registrations in Ding PBX Console. Outbound trunks and their registration state, read from the same source the dashboard counts.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/drive-trunks-registrations.png)

Outbound trunks and their registration state, read from the same source the dashboard counts.

> Taken during the interaction drive, so a panel is open over part of the screen.

</details>

<details>
<summary><strong>Trunk authentication</strong></summary>

![Trunk authentication in Ding PBX Console. Authentication sections as the target actually has them.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/drive-trunk-authentication.png)

Authentication sections as the target actually has them.

> Taken during the interaction drive, so a panel is open over part of the screen.

</details>

<details>
<summary><strong>Feature codes</strong></summary>

![Feature codes in Ding PBX Console. Transfer, pickup and recording codes from features.conf, and parking from res_parking.conf where Asterisk 12 moved it.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/drive-feature-codes.png)

Transfer, pickup and recording codes from features.conf, and parking from res_parking.conf where Asterisk 12 moved it.

> Taken during the interaction drive, so a panel is open over part of the screen.

</details>

<details>
<summary><strong>IAX peers</strong></summary>

![IAX peers in Ding PBX Console. IAX2 peers, currently a reading surface rather than an editing one.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/drive-iax-peers.png)

IAX2 peers, currently a reading surface rather than an editing one.

> Taken during the interaction drive, so a panel is open over part of the screen.

</details>

<details>
<summary><strong>Dialplan canvas</strong></summary>

![Dialplan canvas in Ding PBX Console. The dialplan drawn from the target own output, with a step inspector and the connections between contexts.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/drive-dialplan-canvas.png)

The dialplan drawn from the target own output, with a step inspector and the connections between contexts.

> Taken during the interaction drive, so a panel is open over part of the screen.

</details>

<details>
<summary><strong>IVR menus</strong></summary>

![IVR menus in Ding PBX Console. Menu structure and the prompts each option plays.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/drive-ivr-menus.png)

Menu structure and the prompts each option plays.

> Taken during the interaction drive, so a panel is open over part of the screen.

</details>

<details>
<summary><strong>Queues & agents</strong></summary>

![Queues & agents in Ding PBX Console. Queue membership and agent state.](https://raw.githubusercontent.com/Ding-Ding-Projects/asterisk/master/console/release/captures/gallery/drive-queues-agents.png)

Queue membership and agent state.

> Taken during the interaction drive, so a panel is open over part of the screen.

</details>

---
## Installers are unsigned

Every published Windows installer is **deliberately unsigned** — code signing is out of scope for this project by policy — so Windows will show an unknown-publisher warning (SmartScreen) when you run it. This is expected and does not indicate tampering; verify the SHA-256 against the `SHA256SUMS.txt` asset on the same release if you want independent confirmation.

## This is a fork of Asterisk

**This repository is a fork of the [Asterisk](https://www.asterisk.org/) Open Source PBX project**, licensed under the GNU General Public License version 2. Ding PBX Console is additive software built on top of this checkout to administer Asterisk; it does not replace, relicense, or claim authorship of Asterisk itself. The full, unmodified upstream Asterisk source tree and build system remain at the repository root exactly as they do in any Asterisk checkout.

- Upstream project: **https://www.asterisk.org/** — source, downloads, and documentation for Asterisk itself.
- License: see [`LICENSE`](LICENSE) and [`COPYING`](COPYING).
- Original authors and contributors: see [`CREDITS`](CREDITS).

If you are looking for Asterisk the PBX platform rather than this console, the upstream project above is the right place.

## How long this would take a person to write

**Estimate: roughly 6–10 months** for one experienced developer, working alone, to reach the current state of the console (excluding the inherited Asterisk source tree itself).

Method: the committed line counter (`console/scripts/count-lines.mjs`) reports **30,282 hand-written project lines** (source, tests, and markup actually written for this project, excluding generated output and vendored/inherited code) as of commit `53ba00d1b`. At a sustained rate of roughly 100–160 net lines per working day for original application code, tests, and hand-written markup of this kind — a rate that accounts for the design-parity compiler work, the control-plane safety machinery, and the two negative-regression test suites, all of which cost far more time per line than routine CRUD screens — that comes out to about 190–300 working days, or **roughly 6–10 months** of full-time solo work. This is an estimate derived from a line count, not a measurement of actual elapsed time, and it is deliberately given as a range rather than a single figure.

