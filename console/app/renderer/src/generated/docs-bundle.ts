// GENERATED FILE — do not edit by hand.
// Produced by console/scripts/bundle-docs.mjs from console/docs/**/*.md.
// Re-run `node scripts/bundle-docs.mjs` after changing any documentation article.

export interface DocsHeading {
  readonly title: string;
  readonly id: string;
}

export interface DocsArticle {
  readonly id: string;
  readonly category: string;
  readonly title: string;
  readonly headings: readonly DocsHeading[];
  readonly links: readonly string[];
  readonly body: string;
}

export interface DocsBundle {
  readonly generatedAt: string;
  readonly articleCount: number;
  readonly articles: readonly DocsArticle[];
}

export const DOCS_BUNDLE: DocsBundle = {
  "generatedAt": "1970-01-01T00:00:00.000Z",
  "articleCount": 94,
  "articles": [
    {
      "id": "agent/hub",
      "category": "agent",
      "title": "Status hub sessions",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "skills.md",
        "memory.md",
        "sync.md"
      ],
      "body": "# Status hub sessions\n\n## Behavior\n\nOpen sessions, their questions and reply state. The ingest token lives in the trusted process and is never shown in this window. It is backed by `status-hub`. The rail badge on this destination currently reads `3`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## What this screen reads\n\nNothing yet, and the reason is specific enough to be worth naming: the status-hub client module exists in this console and is covered by its own tests, and no surface a person can reach calls it. Until that changes there is no session, no question and no reply state to list here — so the table says that rather than blaming a missing phone system, which would have nothing to do with it.\n\n## Configuration\n\n### Session policy\n\nHow the console behaves as a hub client.\n\n- **Reply poll interval** (`b_poll`) — a slider control, default `15`.\n- **Desktop notification on reply** (`b_notify`) — a switch control, default `true`.\n- **Auto-close idle sessions** (`b_close`) — a switch control, default `false`.\n- **Report worktree state each run** (`b_report`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in status-hub; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in status-hub, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Skills registry](skills.md), [Memory console](memory.md), and [Sync & attestation](sync.md).\n"
    },
    {
      "id": "agent/memory",
      "category": "agent",
      "title": "Memory console",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "sync.md",
        "vocab.md",
        "hub.md"
      ],
      "body": "# Memory console\n\n## Behavior\n\nSearch the memory corpus with a visual regex builder, and watch the sync, attestation and emission guard state alongside it. It is backed by `agent global memory`. The rail badge on this destination currently reads `2.4k`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## What this screen reads\n\nNothing, and that is a fact about this console rather than about any phone system. It keeps no agent-memory corpus, so there is no store behind this screen to search, sync or attest, and the records list and the three panels beside it stay empty rather than showing invented entries.\n\nThis screen used to say \"No target is connected\" when nothing had been discovered. That was true, irrelevant, and read as a promise: find a phone system and this will fill in. It will not — nothing on this rail reads a target at all — so it now names the store it has not got instead.\n\n## Configuration\n\nThere is no settings form here. A visual regex builder searches the memory corpus directly, and the sync, attestation and emission-guard state are shown alongside it for context.\n\n## Failure modes and security\n\nA failed attestation on the most recent sync blocks further writes until it is acknowledged on the Sync & attestation screen.\n\n## Verification\n\nConfirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Sync & attestation](sync.md), [Vocabulary & guard](vocab.md), and [Status hub](hub.md).\n"
    },
    {
      "id": "agent/ops",
      "category": "agent",
      "title": "Operations & releases",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../app/history.md",
        "secrets.md",
        "../app/about.md"
      ],
      "body": "# Operations & releases\n\n## Behavior\n\nRelease history and the update feed. Packages are unsigned by policy; the console says so plainly rather than implying verification. It is backed by `release`. The rail badge on this destination currently reads `v3.2`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## What this screen reads\n\nThis build's own bundled release history — the one place on the agent rail with a real source.\n\n`scripts/bundle-changelog.mjs` runs at build time and reads this repository's real `ding-pbx-console-v*` tags, newest first, at most twenty of them. Every version in the table is a tag that exists and every date is the calendar date of the commit that tag points at. Nothing here is invented, and a checkout with no version tag on it produces an honestly empty table that says so rather than a table that looks broken.\n\nThree of the five columns stay empty, and the screen says why rather than filling them:\n\n- **Artifacts** — the bundle records commits, never release assets. This console has not asked a forge which files are attached to any of these tags.\n- **Duration** — the workflow's own end-to-end timing is written into the release notes on the forge, not into this bundle.\n- **State** — a tag is not a release. Whether a non-draft release was published for one of these tags is a fact about the forge that nothing in this process has checked, and writing `Published` into every row would be asserting exactly that unchecked fact.\n\n### A coupling worth knowing about\n\nThe table's rows come from a build-generated file, so regenerating it changes what this screen renders. `npm run build` regenerates `changelog-bundle.ts` from whatever tags the checkout has, and when a new tag appears the rows change — which makes this destination's Material Design 3 audit record genuinely stale, because that record is a measurement of what this screen renders. Regenerate it with `npx tsx console/scripts/audit-design-parity-material.mjs` and commit the result. No other destination has this coupling, because no other table on this rail has a source at all.\n\n## Configuration\n\n### Updates\n\nUnsigned artifacts. The operating system may warn about an unknown publisher — that is expected.\n\n- **Check for updates** (`o_check`) — a segmented control, default `On start + hourly`, choices `On start`, `On start + hourly`, `Manual`.\n- **Stage in background** (`o_stage`) — a switch control, default `true`.\n- **Install on next restart** (`o_restart`) — a switch control, default `true`.\n- **Channel** (`o_channel`) — a segmented control, default `Stable`, choices `Stable`, `Beta`.\n- **Verify package hashes** (`o_hash`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row is a real tag on this repository; nothing is invented to fill the table, and a column the bundle does not carry is left empty with its reason stated rather than backfilled with a plausible value. The rows describe releases rather than a running configuration, so they cannot drift from one: they describe the build you are looking at, and they change only when that build's own bundled history does.\n\n## Verification\n\nExercise every control against its documented default and its full option range. For the table itself, confirm on the built application that the versions and dates it shows are the ones in this build's own `changelog-bundle.ts`, that Artifacts, Duration and State are empty on every row, and that the note beneath says why. `tests/ui/real-sources-wired.test.tsx` renders the real `App` and asserts all three against the bundle rather than against its own expectations, so a reading taken and dropped on the way to this screen fails there rather than showing as a quietly blank table.\n\n## Suggested articles\n\n[History & git](../app/history.md), [Secret intake](secrets.md), and [About & policy](../app/about.md).\n"
    },
    {
      "id": "agent/README",
      "category": "agent",
      "title": "Agent",
      "headings": [],
      "links": [
        "memory.md",
        "sync.md",
        "skills.md",
        "hub.md",
        "vocab.md",
        "ops.md",
        "secrets.md"
      ],
      "body": "# Agent\n\nAgent global memory: memory, sync, skills, hub sessions and the emission guard.\n\n- [Memory console](memory.md)\n- [Sync & attestation](sync.md)\n- [Skills registry](skills.md)\n- [Status hub](hub.md)\n- [Vocabulary & guard](vocab.md)\n- [Operations](ops.md)\n- [Secret intake](secrets.md)\n"
    },
    {
      "id": "agent/secrets",
      "category": "agent",
      "title": "Secret intake",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "vocab.md",
        "../data/ami.md",
        "ops.md"
      ],
      "body": "# Secret intake\n\n## Behavior\n\nCredentials are captured once through the intake flow and referenced by name everywhere else. No secret value is ever rendered. It is backed by `templates/secret-intake`. The rail badge on this destination currently reads `6`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## What this screen reads\n\nNothing, because this console stores no secret of its own. A credential typed into a control is consumed and the field blanked in the same step — precisely so that nothing keeps it — which also means there is nothing here to name, date or rotate. The table is empty for that reason rather than for want of a phone system to read.\n\n## Configuration\n\n### Handling\n\nStorage and rotation rules for everything in the intake.\n\n- **Storage** (`x_store`) — a segmented control, default `OS keychain`, choices `OS keychain`, `Encrypted file`.\n- **Rotation reminder** (`x_rotate`) — a slider control, default `90`.\n- **Mask in all surfaces** (`x_mask`) — a switch control, default `true`.\n- **Allow export** (`x_export`) — a switch control, default `false`.\n\n## Failure modes and security\n\nEvery row reflects a real object in templates/secret-intake; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in templates/secret-intake, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Vocabulary & guard](vocab.md), [AMI & ARI](../data/ami.md), and [Operations](ops.md).\n"
    },
    {
      "id": "agent/skills",
      "category": "agent",
      "title": "Skills registry",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "memory.md",
        "hub.md",
        "ops.md"
      ],
      "body": "# Skills registry\n\n## Behavior\n\nInstalled agent skills with their trigger scope. Enabling a skill is a switch; nothing about a skill is typed here. It is backed by `skills/`. The rail badge on this destination currently reads `26`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## What this screen reads\n\nNothing. This console installs no agent skills and has no registry to read one from, so the table is empty.\n\nThe orchestration settings below are this console's own preferences and are stored locally; they describe no installed skill, because there is none.\n\n## Configuration\n\n### Orchestration\n\nMulti-agent orchestration defaults.\n\n- **Maximum parallel lanes** (`u_lanes`) — a stepper control, default `4`.\n- **Isolated worktree per lane** (`u_isolate`) — a switch control, default `true`.\n- **Lane model override** (`u_model`) — a select control, default `gpt-5.6-luna`, choices `gpt-5.6-luna`, `inherit`.\n- **Verification panel for high-risk lanes** (`u_verify`) — a switch control, default `true`.\n- **Keep destructive actions with orchestrator** (`u_destruct`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in skills/; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in skills/, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Memory console](memory.md), [Status hub](hub.md), and [Operations](ops.md).\n"
    },
    {
      "id": "agent/sync",
      "category": "agent",
      "title": "Sync & attestation",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "memory.md",
        "memory.md",
        "secrets.md",
        "../app/history.md"
      ],
      "body": "# Sync & attestation\n\n## Behavior\n\nEvery sync run, its attestation and its backup. A failed attestation blocks the next write until it is acknowledged here. It is backed by `agent-memory-sync`. The rail badge on this destination currently reads `ok`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## What this screen reads\n\nNothing, because there is nothing to synchronise: this console keeps no agent-memory corpus (see [Memory console](memory.md)). With no run to record there is no run history, no backup and no attestation, so the table is empty rather than listing runs that never happened.\n\nThe schedule controls below are this console's own preferences and are stored locally. They describe no run, because there is none.\n\n## Configuration\n\n### Schedule\n\nWhen the console pushes memory upstream.\n\n- **Automatic sync** (`y_auto`) — a switch control, default `true`.\n- **Interval** (`y_every`) — a slider control, default `60`.\n- **Backup before write** (`y_backup`) — a switch control, default `true`.\n- **Require attestation** (`y_attest`) — a switch control, default `true`.\n- **Keep backups** (`y_retain`) — a stepper control, default `30`.\n\n## Failure modes and security\n\nEvery row reflects a real object in agent-memory-sync; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in agent-memory-sync, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Memory console](memory.md), [Secret intake](secrets.md), and [History & git](../app/history.md).\n"
    },
    {
      "id": "agent/vocab",
      "category": "agent",
      "title": "Vocabulary & emission guard",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "memory.md",
        "secrets.md",
        "../app/notifications.md"
      ],
      "body": "# Vocabulary & emission guard\n\n## Behavior\n\nThe private vocabulary dictionary and the emission guard that blocks a forbidden term before it can leave the process. It is backed by `vocabulary-dictionary.json`. The rail badge on this destination currently reads `lock`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.\n\n## What this screen reads\n\nThe real loaded state of the dictionary you upload from this machine, in words — whether one is loaded and how many replacements it is applying to the interface.\n\nThe terms themselves are deliberately **not** listed in the table. Every table in this console can be selected, copied and exported to a file, and a private vocabulary term must never reach an export or the clipboard. So the dictionary stays in this machine's own local cache, is applied to the interface, and is reported here as a count rather than as rows. That is a decision, not an omission.\n\n## Configuration\n\n### Emission guard\n\nRuns on every string the app is about to write or display.\n\n- **Guard enabled** (`n_guard`) — a switch control, default `true`.\n- **On violation** (`n_mode`) — a segmented control, default `Block`, choices `Warn`, `Block`, `Rewrite`.\n- **Scan surfaces** (`n_scan`) — a chips control, default `UI text`, `Logs`, `Exports`, choices `UI text`, `Logs`, `Exports`, `Clipboard`, `Telemetry`.\n- **Vocabulary lock** (`n_lock`) — a switch control, default `true`.\n- **Report drift daily** (`n_drift`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in vocabulary-dictionary.json; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in vocabulary-dictionary.json, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Memory console](memory.md), [Secret intake](secrets.md), and [Notifications](../app/notifications.md).\n"
    },
    {
      "id": "app/about",
      "category": "app",
      "title": "About",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../agent/ops.md",
        "../system/security.md",
        "customise.md"
      ],
      "body": "# About\n\n## Behavior\n\nBuild provenance and the policies this console is bound by. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.\n\n## Configuration\n\n### Policy\n\nNon-negotiable behaviour, surfaced so it is never a surprise.\n\n- **Code signing** (`z_sign`) — a segmented control, default `Prohibited`, choices `Prohibited`. Packages ship unsigned on purpose. Windows may show an unknown-publisher warning; nothing here claims to be verified.\n- **Installer** (`z_installer`) — a segmented control, default `Squirrel.Windows`, choices `Squirrel.Windows`.\n- **Telemetry** (`z_telemetry`) — a switch control, default `false`.\n- **Send crash reports** (`z_crash`) — a switch control, default `false`.\n\n## Failure modes and security\n\nEvery control here maps to a real key in the owning configuration; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in the owning file, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Operations](../agent/ops.md), [Security](../system/security.md), and [Customise everything](customise.md).\n"
    },
    {
      "id": "app/appearance",
      "category": "app",
      "title": "Appearance",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "customise.md",
        "history.md",
        "notifications.md"
      ],
      "body": "# Appearance\n\n## Behavior\n\nDensity, theme and motion for this console. Changes apply immediately with an undo. It is backed by `console settings`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.\n\n## Configuration\n\n### Layout\n\nHow much fits on screen.\n\n- **Row density** (`p_density`) — a segmented control, default `Comfortable`, choices `Dense`, `Comfortable`, `Spacious`.\n- **Theme** (`p_theme`) — a segmented control, default `Dark`, choices `Dark`, `Light`, `Follow system`.\n- **Interface scale** (`p_scale`) — a slider control, default `100`.\n- **Reduced motion** (`p_motion`) — a switch control, default `false`.\n- **Monospace numerics** (`p_mono`) — a switch control, default `true`.\n\n### Behaviour\n\nThe console itself.\n\n- **Open on launch** (`p_start`) — a select control, default `Dashboard`, choices `Dashboard`, `Endpoints`, `Last screen`.\n- **Offer the tour on launch** (`p_tour`) — a switch control, default `false`.\n- **Keep running in tray** (`p_tray`) — a switch control, default `true`.\n- **Full ceremony on every destructive action** (`p_confirm`) — a switch control, default `true`. Leave this on. It is the four-gate check: key, arming switch, slider and attention test.\n\n## Failure modes and security\n\nEvery control here maps to a real key in console settings; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in console settings, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Customise everything](customise.md), [History & git](history.md), and [Notifications](notifications.md).\n"
    },
    {
      "id": "app/arcade",
      "category": "app",
      "title": "Confirmation credits",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "history.md",
        "customise.md",
        "notifications.md"
      ],
      "body": "# Confirmation credits\n\n## Behavior\n\nThe four-gate ceremony is thorough and, twelve times a day, exhausting. Win credits here and spend one to skip a ceremony. Credits are earned, never bought with money, and destructive actions above the danger line always cost two. It is backed by `arcade`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.\n\n## Configuration\n\n### Spending rules\n\nHow credits are allowed to replace a ceremony.\n\n- **Allow credits to skip ceremonies** (`cr_enable`) — a switch control, default `true`.\n- **Cost per skip** (`cr_cost`) — a stepper control, default `1`.\n- **High-danger actions still need the full ceremony** (`cr_danger`) — a switch control, default `true`. Restarting Asterisk, unloading a module and deleting an endpoint are above the danger line. Leave this on unless you enjoy explaining outages.\n- **Maximum credits held** (`cr_cap`) — a stepper control, default `20`.\n- **Credits expire after** (`cr_expire`) — a slider control, default `7`.\n\n## Failure modes and security\n\nEvery control here maps to a real key in arcade; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in arcade, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[History & git](history.md), [Customise everything](customise.md), and [Notifications](notifications.md).\n"
    },
    {
      "id": "app/customise",
      "category": "app",
      "title": "Customise everything",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "appearance.md",
        "arcade.md",
        "notifications.md"
      ],
      "body": "# Customise everything\n\n## Behavior\n\nThe global layer. Every one of these reaches across the whole console, and every individual element can still override it from its own right-click menu. It is backed by `console profile`. The rail badge on this destination currently reads `∞`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.\n\n## Configuration\n\n### Fun\n\nHow playful the console is allowed to be. This is a real setting, not a joke — it scales celebrations, copy and randomness together.\n\n- **Fun level** (`fun_level`) — a slider control, default `2`. 0 is a bank. 1 is polite. 2 is the default — celebrations on meaningful wins. 3 adds jokes and bolder motion. 4 is confetti for changing a slider, rainbow fills and an app that will not stop congratulating you.\n  - *What it is:* How playful the console is allowed to be, from 0 to 4.\n  - *Why it exists:* One dial that scales celebrations, copy tone, motion and randomness together.\n  - *Choosing a value:* 0 Bank, 1 Polite, 2 Balanced, 3 Playful, 4 Unhinged.\n  - *Gotcha:* Level 4 celebrates trivial changes. It is delightful for a week and then you will want level 2.\n- **Copy tone** (`fun_copy`) — a segmented control, default `Warm`, choices `Terse`, `Neutral`, `Warm`, `Comedian`.\n- **Celebrate on** (`fun_celebrate`) — a chips control, default `Big wins`, `Security improvements`, choices `Every change`, `Big wins`, `Security improvements`, `Minigame wins`, `Nothing`.\n- **Confetti density** (`fun_confetti`) — a slider control, default `90`.\n- **Sound effects** (`fun_sound`) — a switch control, default `false`.\n- **Show the mascot** (`fun_mascot`) — a switch control, default `false`.\n- **Allow hidden surprises** (`fun_easter`) — a switch control, default `true`.\n- **Random appearance for every element** (`fun_random`) — a switch control, default `false`. On, every rendered element is given its OWN randomly generated appearance — its own colour, radius, weight, shadow and entrance. Nothing shares a look. Turn it off and everything snaps back to the design system; your manual per-element overrides survive either way.\n  - *What it is:* Gives every rendered element its own randomly generated appearance.\n  - *Why it exists:* Because you asked, and because it makes a dull configuration screen memorable.\n  - *Choosing a value:* A seed, a scope of properties to randomise, a wildness percentage and an optional reroll on every screen change.\n  - *Gotcha:* At high wildness with rotation enabled, dense tables become genuinely hard to read. That is the intent, but it is worth knowing.\n- **Randomness seed** (`fun_random_seed`) — a stepper control, default `1`.\n- **Randomise** (`fun_random_scope`) — a chips control, default `Colour`, `Radius`, `Shadow`, choices `Colour`, `Radius`, `Shadow`, `Type weight`, `Size`, `Rotation`, `Entrance animation`.\n- **How wild** (`fun_random_strength`) — a slider control, default `40`.\n- **Reroll on every screen change** (`fun_random_reroll`) — a switch control, default `false`.\n\n### Motion\n\nGlobal timing. Individual elements can still set their own.\n\n- **Animation speed** (`mo_speed`) — a slider control, default `100`.\n- **Default easing** (`mo_curve`) — a segmented control, default `Emphasised`, choices `Linear`, `Standard`, `Emphasised`, `Springy`.\n- **Screen transition** (`mo_screen`) — a select control, default `Lift and fade`, choices `Lift and fade`, `Cross fade`, `Slide`, `Zoom`, `None`.\n- **Dialog entrance** (`mo_dialog`) — a select control, default `Per dialog`, choices `Per dialog`, `Uniform rise`, `Uniform zoom`.\n- **Respect reduced motion** (`mo_reduce`) — a switch control, default `true`.\n- **Hover lift** (`mo_hover`) — a switch control, default `true`.\n\n### Layout\n\nStructure of the whole window.\n\n- **Rail position** (`ly_dock`) — a segmented control, default `Left`, choices `Left`, `Right`, `Top`, `Compact`.\n- **Density** (`ly_density`) — a segmented control, default `Comfortable`, choices `Dense`, `Comfortable`, `Spacious`.\n- **Corner radius** (`ly_radius`) — a slider control, default `16`.\n- **Card spacing** (`ly_gap`) — a slider control, default `12`.\n- **Tab strip** (`ly_tabs`) — a segmented control, default `Above content`, choices `Above content`, `Below rail`, `Hidden`.\n- **Section list width** (`ly_sidebar`) — a slider control, default `268`.\n- **Monospace numerics everywhere** (`ly_mono`) — a switch control, default `true`.\n\n### Theme\n\nColour across the console. Every colour control in the app uses the same infinite picker.\n\n- **Mode** (`th_mode`) — a segmented control, default `Dark`, choices `Dark`, `Light`, `Follow system`, `Per screen`.\n- **Accent hue** (`th_hue`) — a slider control, default `148`.\n- **Accent saturation** (`th_sat`) — a slider control, default `60`.\n- **Contrast** (`th_contrast`) — a segmented control, default `Standard`, choices `Standard`, `Medium`, `High`.\n- **Rainbow accent** (`th_rainbow`) — a switch control, default `false`.\n- **Rainbow speed** (`th_rbspeed`) — a slider control, default `8`.\n- **Tint surfaces with the accent** (`th_tint`) — a slider control, default `6`.\n\n### Behaviour\n\nWhat the console does without being asked.\n\n- **Open on launch** (`bh_start`) — a select control, default `Dashboard`, choices `Dashboard`, `Endpoints`, `Last screen`, `Customise everything`.\n- **Confirmation** (`bh_confirm`) — a segmented control, default `Four gates`, choices `Four gates`, `Credits allowed`, `Single confirm`.\n- **Commit every change to git** (`bh_commit`) — a switch control, default `true`.\n- **Default lock method** (`bh_lockdefault`) — a select control, default `PIN`, choices `PIN`, `Password`, `Password + PIN`, `Password + PIN + TOTP`.\n- **Offer the wizard first on every screen** (`bh_wizard`) — a switch control, default `false`.\n- **Show explain buttons** (`bh_explain`) — a switch control, default `true`.\n- **Offer the tour on launch** (`bh_tour`) — a switch control, default `false`.\n\n### Profiles\n\nSave the entire look and behaviour, then move it between machines.\n\n- **Active profile** (`pr_active`) — a select control, default `Default`, choices `Default`, `Night operations`, `Training room`, `Demo`.\n- **Sync profile with agent memory** (`pr_sync`) — a switch control, default `true`.\n- **Allow per-screen overrides** (`pr_perscreen`) — a switch control, default `true`.\n- **Include appearance overrides in exports** (`pr_export`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery control here maps to a real key in console profile; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. Level 4 celebrates trivial changes. It is delightful for a week and then you will want level 2. At high wildness with rotation enabled, dense tables become genuinely hard to read. That is the intent, but it is worth knowing.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in console profile, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Appearance](appearance.md), [Arcade](arcade.md), and [Notifications](notifications.md).\n"
    },
    {
      "id": "app/history",
      "category": "app",
      "title": "History",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "servers.md",
        "../system/security.md",
        "arcade.md"
      ],
      "body": "# History\n\n## Behavior\n\nEvery control you touch commits to a local git repository the moment you touch it. This screen is the full history: the commit graph, the exact diff, blame per option, branches for trying things out, and a restore that runs the four gates. It is backed by `/etc/asterisk/.git`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.\n\n## Configuration\n\n### Commit behaviour\n\nWhat happens on every single change.\n\n- **Commit on every change** (`hi_commit`) — a switch control, default `true`. On means each toggle, slider and picker writes a real git commit against the configuration directory. Off batches changes until you commit by hand — which is how people lose track of what they changed.\n  - *What it is:* Whether every individual control change writes a git commit immediately.\n  - *Why it exists:* It gives you an exact, attributable history and a one-click revert of any single change.\n  - *Choosing a value:* On is strongly recommended.\n  - *Gotcha:* Off batches changes until you commit manually, which in practice means nobody remembers what changed between two working states.\n- **Commit message style** (`hi_msg`) — a segmented control, default `Descriptive`, choices `Terse`, `Descriptive`, `Conventional`.\n- **Attribute commits to** (`hi_author`) — a segmented control, default `Signed-in user`, choices `Signed-in user`, `Console`, `Both`.\n- **Sign commits** (`hi_sign`) — a switch control, default `false`.\n- **Mirror to a remote** (`hi_push`) — a switch control, default `false`.\n- **Run asterisk config validation as a pre-commit hook** (`hi_hook`) — a switch control, default `true`.\n\n### Retention & safety\n\nHow much history is kept and what a restore does.\n\n- **Keep commits** (`hi_keep`) — a stepper control, default `500`.\n- **Garbage collect monthly** (`hi_gc`) — a switch control, default `true`.\n- **Show a diff before restoring** (`hi_diff`) — a switch control, default `true`.\n- **Restore onto a new branch instead of main** (`hi_branch`) — a switch control, default `true`.\n- **Reload Asterisk after a restore** (`hi_reload`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery control here maps to a real key in /etc/asterisk/.git; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. Off batches changes until you commit manually, which in practice means nobody remembers what changed between two working states.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in /etc/asterisk/.git, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Deploy & servers](servers.md), [Security](../system/security.md), and [Arcade](arcade.md).\n"
    },
    {
      "id": "app/notifications",
      "category": "app",
      "title": "Notification centre",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "history.md",
        "arcade.md",
        "../agent/vocab.md"
      ],
      "body": "# Notification centre\n\n## Behavior\n\nEvery non-blocking notification the console has raised, reviewable after the fact so nothing important disappears with a toast. It is backed by `console`. The rail badge on this destination currently reads `4`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.\n\n## Configuration\n\n### Delivery\n\nWhat interrupts you and what merely gets recorded.\n\n- **Show toasts** (`nt_toast`) — a switch control, default `true`.\n- **Play a sound** (`nt_sound`) — a switch control, default `false`.\n- **Notify on** (`nt_levels`) — a chips control, default `Errors`, `Warnings`, choices `Errors`, `Warnings`, `Info`, `Every change`.\n- **Quiet hours** (`nt_quiet`) — a switch control, default `false`.\n- **Keep history for** (`nt_keep`) — a slider control, default `30`.\n\n## Failure modes and security\n\nEvery row reflects a real object in console; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in console, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[History & git](history.md), [Arcade](arcade.md), and [Vocabulary & guard](../agent/vocab.md).\n"
    },
    {
      "id": "app/README",
      "category": "app",
      "title": "App",
      "headings": [],
      "links": [
        "servers.md",
        "arcade.md",
        "notifications.md",
        "history.md",
        "customise.md",
        "appearance.md",
        "about.md"
      ],
      "body": "# App\n\nDeploy & application: stand up a new server, then appearance, updates and the console itself.\n\n- [Deploy & servers](servers.md)\n- [Arcade](arcade.md)\n- [Notifications](notifications.md)\n- [History & git](history.md)\n- [Customise everything](customise.md)\n- [Appearance](appearance.md)\n- [About & policy](about.md)\n"
    },
    {
      "id": "app/servers",
      "category": "app",
      "title": "Deploy a server",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../system/security.md",
        "../data/ami.md",
        "../agent/ops.md"
      ],
      "body": "# Deploy a server\n\n## Behavior\n\nThis screen discovers local targets, verifies the selected target through the control plane, and keeps the configured server list in the installation's local inventory. Discovery alone is not treated as a connection: the desktop calls `server.connect`, starts the managed daemon when needed, and retries the verification once. The rail badge is empty until a real server row exists. It lives on the App rail, under the Deploy & application group: stand up a new server, then appearance, updates and the console itself.\n\n## Configuration\n\n### Route\n\nHow this console reaches Asterisk. Everything below reshapes itself around this answer. The selected local target is read from the real discovery result rather than from the design's example names.\n\n- **Connection type** (`sv_kind`) — a segmented control, default `Local`, choices `Local`, `Local Docker`, `SSH`, `SSH Docker`. Local is the same machine. Local Docker is a container here. SSH is another machine. SSH Docker is a container on another machine, reached over SSH and then into the container.\n  - *What it is:* How this console reaches Asterisk: locally, into a container, over SSH, or over SSH and then into a container.\n  - *Why it exists:* Everything else on the screen reshapes around this answer, including how configuration files are written.\n  - *Choosing a value:* Local for the same machine, Local Docker for a container here, SSH for another machine, SSH Docker for a container elsewhere.\n  - *Gotcha:* Over SSH the manager port is forwarded through the tunnel, so it never crosses the network unprotected — but only if tunnel forwarding stays enabled.\n- **Host** (`sv_host`) — the host value supplied to the local inventory. It starts empty until the user supplies a target.\n- **Container** (`sv_container`) — the container context supplied to the local inventory when a container route is selected.\n- **SSH user** (`sv_user`) — the user supplied to the local inventory for an SSH route.\n- **SSH port** (`sv_sshport`) — a stepper control, default `22`.\n- **Strict host key checking** (`sv_hostkey`) — a switch control, default `true`. On means a changed host key aborts the connection instead of asking you to accept it. That prompt is how people get compromised.\n  - *What it is:* Whether a changed SSH host key aborts the connection.\n  - *Why it exists:* A changed host key means either a rebuild or an interception. Only one of those is benign.\n  - *Choosing a value:* On, always.\n  - *Gotcha:* The prompt asking a human to accept a new key is precisely how these attacks succeed. This console refuses instead of asking.\n\n### Manager interface\n\nAMI for live events and CLI, ARI for Stasis applications.\n\n- **Interface** (`sv_iface`) — a segmented control, default `AMI`, choices `AMI`, `ARI`, `Both`.\n- **Manager port** (`sv_amiport`) — a stepper control, default `5038`.\n- **TLS** (`sv_tls`) — a switch control, default `true`.\n- **Forward through the SSH tunnel** (`sv_forward`) — a switch control, default `true`.\n- **Reconnect automatically** (`sv_watch`) — a switch control, default `true`.\n- **Open read-only** (`sv_readonly`) — a switch control, default `false`.\n\n## Failure modes and security\n\nThe server list is an honest local inventory. A discovered target is not labelled connected until `server.connect` confirms it. If the control plane cannot answer, the row retains the exact unavailable reason and the dashboard retries failed readings on its one-second refresh cadence. Over SSH the manager port is forwarded through the tunnel, so it never crosses the network unprotected — but only if tunnel forwarding stays enabled. The prompt asking a human to accept a new key is precisely how these attacks succeed. This console refuses instead of asking.\n\n## Verification\n\nExercise discovery with no target, discovery with a target whose daemon is stopped, a successful `server.connect`, and a refused connection. Confirm no row is labelled connected before the control-plane response, and that a failed dashboard read retries without relaunching the app.\n\n## Suggested articles\n\n[Security](../system/security.md), [AMI & ARI](../data/ami.md), and [Operations](../agent/ops.md).\n"
    },
    {
      "id": "changelog/automatic-updater-reliability",
      "category": "changelog",
      "title": "Automatic updater reliability",
      "headings": [],
      "links": [],
      "body": "# Automatic updater reliability\n\n- Draft-count updates now advance the main-process updater revision before publication, so a stale status read cannot overwrite a newer restart block.\n- PBX draft publication now counts every loaded resource against its last live read, including the currently edited resource, so apply, discard, restore, and field edits converge on one accurate restart block.\n- Installer launch acknowledgement clears its timeout on success and failure, preventing an old timer from changing a later state.\n- Successful installer acknowledgement now returns to the renderer before quit is scheduled, while the installing latch stays held through shutdown and clears only for a failed launch.\n- Release identity validation rejects duplicate artifact records, requires every resolved full and delta package exactly once, and checks version-bearing Squirrel filenames.\n- Published tags retain the legacy-compatible `ding-pbx-console-v0.0.<run>-r<attempt>` shape while the package identity remains monotonic `0.1.<run>`, so existing `0.1.0` installations can see repaired releases.\n- Published packaging now rejects a tag and package-version pair unless the run number maps exactly to `0.1.<run>` within a bounded positive range; local unpublished `tag: null` builds remain valid.\n- Added two byte-preserved built-artifact update captures with source and release SHAs, dimensions, digests, hidden-desktop CDP method, direct installer launch, restart, Later, and draft-block evidence.\n- A newer ready revision now clears a stale local spawn-error message after recovery, while current failure state remains visible.\n"
    },
    {
      "id": "data/ami",
      "category": "data",
      "title": "Manager & REST interfaces",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "cdr.md",
        "../system/security.md",
        "../agent/secrets.md"
      ],
      "body": "# Manager & REST interfaces\n\n## Behavior\n\nMachine access to the PBX. Permissions are checkbox matrices, never a comma string you have to remember. It is backed by `manager.conf · ari.conf · http.conf`. The rail badge on this destination currently reads `2`. It lives on the Data rail, under the Records & APIs group: Call records, event logging and the machine interfaces.\n\n## Configuration\n\n### HTTP server\n\nARI and the built-in web sockets ride on this.\n\n- **HTTP enabled** (`a_http`) — a switch control, default `true`.\n- **Bind port** (`a_port`) — a stepper control, default `8088`.\n- **TLS enabled** (`a_tls`) — a switch control, default `true`.\n- **TLS port** (`a_tlsport`) — a stepper control, default `8089`.\n- **Allowed origins** (`a_origin`) — a chips control, default `https://console.local`, choices `https://console.local`, `https://ops.example`, `*`.\n\n### Manager permissions\n\nTick the classes this user may read or write.\n\n- **Read classes** (`a_read`) — a chips control, default `system`, `call`, `log`, choices `system`, `call`, `log`, `verbose`, `command`, `agent`, `user`, `config`, `dtmf`, `reporting`, `cdr`, `dialplan`, `originate`, `message`.\n  - *What it is:* Which classes of AMI events and commands this user may read.\n  - *Why it exists:* AMI is full administrative access. Class-based permissions are the only granularity available.\n  - *Choosing a value:* system, call, log, verbose, command, agent, user, config, dtmf, reporting, cdr, dialplan, originate, message.\n  - *Gotcha:* The command class allows arbitrary CLI execution. Granting it is equivalent to granting a shell.\n- **Write classes** (`a_write`) — a chips control, default `call`, choices `system`, `call`, `log`, `verbose`, `command`, `agent`, `user`, `config`, `originate`, `message`.\n- **Deny by default** (`a_deny`) — a switch control, default `true`.\n- **Idle timeout** (`a_timeout`) — a slider control, default `300`.\n\n## Failure modes and security\n\nEvery row reflects a real object in manager.conf · ari.conf · http.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. The command class allows arbitrary CLI execution. Granting it is equivalent to granting a shell.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in manager.conf · ari.conf · http.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[CDR & CEL](cdr.md), [Security](../system/security.md), and [Secret intake](../agent/secrets.md).\n"
    },
    {
      "id": "data/cdr",
      "category": "data",
      "title": "Call records",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../platform/unbound-controls.md",
        "ami.md",
        "../pbx/dash.md",
        "../system/logger.md",
        "../platform/unbound-controls.md"
      ],
      "body": "# Call records\n\n## Behavior\n\nWhich backend stores records, what counts as an answered call, and which events are logged.\nThis screen edits four files, each read and written independently: `cdr.conf` (its own\ndeclared `file`), plus `cel.conf`, `cel_odbc.conf` and `cel_pgsql.conf`, read the same way\nthe Security screen reads pjsip.conf and stir_shaken.conf besides its own acl.conf. It lives\non the Data rail, under the Records & APIs group: Call records, event logging and the machine\ninterfaces.\n\nThere is no single key anywhere that selects a CDR backend by name. `cdr.conf.sample`'s own\n\"CHOOSING A CDR BACKEND\" section is explicit about this: a backend is chosen by which\n`[section]` is present in cdr.conf itself (`[csv]`, `[radius]`), or by which separate file\nexists and is populated (`cdr_odbc.conf`, `cdr_pgsql.conf`, `cdr_custom.conf`, and so on).\n`d_status` reports that honestly instead of pretending a picker exists: what this screen has\nactually read as configured, against what the target's running Asterisk has actually\nregistered (`cdr show status`). A backend can be configured in a file and not loaded, or\nloaded from a configuration that has since changed underneath it — those are two different\nfacts, and the readout says both rather than one.\n\nCEL had no configuration surface at all before this: the screen's own declared `file` used to\nbe the two-file label `cdr.conf · cel.conf`, which is not a real filename, so nothing was ever\nactually read from a target and every control below silently showed the design's own shipped\ndefault. It now reads cel.conf, cel_odbc.conf and cel_pgsql.conf for real.\n\nConnection secrets never appear on this screen. cel_pgsql.conf's `password` key stays\ndeliberately unbound — see [Controls that do not write to a file, and why](../platform/unbound-controls.md).\n\n## Configuration\n\n### CDR — cdr.conf\n\nOne row per call.\n\n- **CDR enabled** (`d_enable`) — a switch control, default `true`. `[general]/enable`.\n- **Log unanswered calls** (`d_unanswered`) — a switch control, default `false`. `[general]/unanswered`.\n- **Log congestion** (`d_congestion`) — a switch control, default `false`. `[general]/congestion`.\n- **Batch mode** (`d_batch`) — a switch control, default `true`. `[general]/batch`.\n  - *Gotcha:* If the database becomes unreachable, Asterisk may block on writes. Batch mode mitigates it; test the failure case before you rely on it.\n- **Batch size** (`d_size`) — a stepper control, default `100`. `[general]/size`.\n- **Backends** (`d_status`) — a live status readout, not a value control. Reports which of\n  cdr.conf's own `[csv]`/`[radius]` sections are populated, and which backend modules the\n  target's running Asterisk has actually registered.\n- **Save call records settings** — writes the five fields above to cdr.conf.\n\n### CEL — cel.conf\n\nOne row per channel event — far more detail, far more volume.\n\n- **CEL enabled** (`l_enable`) — a switch control, default `true`. `[general]/enable`.\n- **Tracked events** (`l_events`) — a chips control, default `CHAN_START`, `ANSWER`, `HANGUP`, `BRIDGE_ENTER`, choices `CHAN_START`, `CHAN_END`, `ANSWER`, `HANGUP`, `BRIDGE_ENTER`, `BRIDGE_EXIT`, `APP_START`, `APP_END`, `PARK_START`, `BLINDTRANSFER`. `[general]/events`.\n- **Tracked applications** (`l_apps`) — a chips control, default `Dial`, `Queue`, choices `Dial`, `Queue`, `VoiceMail`, `ConfBridge`, `Playback`, `Park`. `[general]/apps`.\n- **Timestamp format** (`l_date`) — a segmented control, default `ISO8601`, choices `ISO8601`, `epoch`, `local`. `[general]/dateformat`.\n- **Backends** (`l_status`) — a live status readout: what cel_odbc.conf/cel_pgsql.conf have\n  configured, against which `cel_*.so` module the target shows loaded.\n- **Save channel event logging settings** — writes the four fields above to cel.conf.\n\n### CEL: ODBC backend — cel_odbc.conf\n\nRecords are written per named context — cel_odbc.conf declares one `[section]` per\nconnection/table pair, not one fixed section, so this group edits whichever one is named in\n**Context name**.\n\n- **Show USER_DEFINED events** (`l_oshow`) — a switch control, default `false`. `[general]/show_user_defined`.\n- **Context name** (`l_octx`) — a text control. Names the `[section]` the two fields below\n  read and write. Not itself a binding — the same shape as the Security screen's **Transport\n  name** field for a PJSIP transport's TLS settings.\n- **Load from target** — reads the named context's current connection/table into the fields\n  below. A name that resolves to nothing yet is not a refusal, unlike the PJSIP transport\n  case: a cel_odbc.conf context needs nothing but these two keys to be usable.\n- **ODBC connection** (`l_oconn`) — a text control. `connection`, in the section named by `l_octx`.\n- **Table** (`l_otable`) — a text control. `table`, in the same section.\n- **Save ODBC context** — writes `l_oshow` and the named context's `connection`/`table` in\n  one cel_odbc.conf write. Creates the section if the name does not already exist.\n\n### CEL: PostgreSQL backend — cel_pgsql.conf\n\nOne connection for the whole file, in its single `[global]` section.\n\n- **Show USER_DEFINED events** (`l_pshow`) — a switch control, default `false`. `[global]/show_user_defined`.\n- **Log date/time in GMT** (`l_pgmtime`) — a switch control, default `false`. `[global]/usegmtime`.\n- **Hostname** (`l_phost`) — a text control. `[global]/hostname`.\n- **Port** (`l_pport`) — a stepper control, default `5432`. `[global]/port`.\n- **Database name** (`l_pdb`) — a text control. `[global]/dbname`.\n- **User** (`l_puser`) — a text control. `[global]/user`.\n- **Table** (`l_ptable`) — a text control. `[global]/table`.\n- **Schema** (`l_pschema`) — a text control, optional. `[global]/schema`. Defaults to the\n  database's own `current_schema()` when left blank.\n- **Application name** (`l_papp`) — a text control, optional. `[global]/appname`. No\n  whitespace allowed.\n- **Save PostgreSQL settings** — writes all nine fields above in one cel_pgsql.conf write.\n  `password` is deliberately absent from this list and from the screen.\n\n## Failure modes and security\n\nEvery bound control here maps to a real key, justified against this checkout's own\n`configs/samples/cdr.conf.sample`, `cel.conf.sample`, `cel_odbc.conf.sample` and\n`cel_pgsql.conf.sample`; an unreachable configuration store is shown as unreachable, never\nbackfilled with placeholder values. If the database becomes unreachable, Asterisk may block\non writes. Batch mode mitigates it; test the failure case before you rely on it. `password`\non the PostgreSQL group is never read, written or displayed by this console — set it through\nsecret intake on the target directly.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the\nwrite lands in the file its own group names, and confirm the ODBC context Save both creates a\nmissing section and edits an existing one without disturbing any other section in\ncel_odbc.conf. Confirm every default shown here matches what a fresh install actually ships,\nthat changing a value here is reflected the next time this screen loads, and that `d_status`/\n`l_status` distinguish a backend that is merely configured from one the target actually has\nloaded.\n\n## Suggested articles\n\n[AMI & ARI](ami.md), [Dashboard](../pbx/dash.md), [Logger](../system/logger.md), and\n[Controls that do not write to a file, and why](../platform/unbound-controls.md).\n"
    },
    {
      "id": "data/README",
      "category": "data",
      "title": "Data",
      "headings": [],
      "links": [
        "cdr.md",
        "ami.md"
      ],
      "body": "# Data\n\nRecords & APIs: call records, event logging and the machine interfaces.\n\n- [CDR & CEL](cdr.md)\n- [AMI & ARI](ami.md)\n"
    },
    {
      "id": "evidence/automatic-updates",
      "category": "evidence",
      "title": "Automatic update evidence",
      "headings": [
        {
          "title": "Release and source records",
          "id": "release-and-source-records"
        },
        {
          "title": "Capture records",
          "id": "capture-records"
        },
        {
          "title": "Capture method and interaction evidence",
          "id": "capture-method-and-interaction-evidence"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../platform/automatic-updates.md",
        "../platform/in-context-recovery.md",
        "../platform/non-blocking-notifications.md",
        "../platform/README.md"
      ],
      "body": "# Automatic update evidence\n\nThis article records the two real off-screen captures committed with the updater repair. The images were supplied by the bounded Lowlevel capture run and copied byte-for-byte. They were not generated, resized, annotated, or edited during this evidence pass.\n\n## Release and source records\n\nThe old baseline was the `ding-pbx-console-v0.0.82-r1` release at source commit `745d7425df791646aef4a6972c96dcf279a6004a`, carrying the old installed package version `0.1.0` and a manifest that recorded only its tag. Its restart button used the old send-only path, so a click could not receive a typed acknowledgement or keep a spawn failure visible.\n\nThe repaired release used for the update-ready capture was source commit `870be47d6708b32f7fed154abf0ca3779f1fe3bb`, package version `0.1.84`, and tag `ding-pbx-console-v0.0.84-r1`. Its release identity recorded the exact `Setup.exe`, `RELEASES`, full package, and SHA-256 values. The installed `0.1.84` capture used that same source and release identity. The follow-up source record merged for the next release is `b29850dd1ae63553dc6c60ecdedc60adb6707a77`, carrying package version `0.1.85` and tag `ding-pbx-console-v0.0.85-r1`.\n\n## Capture records\n\n| State | Source and release | Dimensions | SHA-256 | Evidence |\n| --- | --- | ---: | --- | --- |\n| Update ready from the old installed baseline | `745d7425df791646aef4a6972c96dcf279a6004a`, installed `0.1.0`, candidate `870be47d6708b32f7fed154abf0ca3779f1fe3bb`, release `0.1.84`, tag `ding-pbx-console-v0.0.84-r1` | 1456 x 928 | `3a92900f8fd19a722ece3175567df346d8f272ee24d7ac47e3681b1db5216d99` | ![Update ready banner in the old installed baseline](../platform/captures/automatic-updates/baseline-update-ready.png) |\n| Installed `0.1.84` with two PBX drafts blocking restart | `870be47d6708b32f7fed154abf0ca3779f1fe3bb`, installed `0.1.84`, candidate `b29850dd1ae63553dc6c60ecdedc60adb6707a77`, release `0.1.85`, tag `ding-pbx-console-v0.0.85-r1` | 1456 x 928 | `79d4257a806ef31aea22cef34ce490cc980fdd527ce84a5adfe60e6bd197b751` | ![Restart disabled while two PBX drafts need review, apply, or discard](../platform/captures/automatic-updates/installed84-draft-blocked.png) |\n\n## Capture method and interaction evidence\n\nThe Windows desktop executable was launched on named hidden desktops through the Lowlevel route, with no visible desktop or pointer interaction. The old baseline used `Lowlevel-Updater-Run84`, port `9346`, and the exact file URL for the extracted baseline renderer. The installed repaired application used `Lowlevel-Installed84-Run85`, port `9347`, and the exact file URL for `C:\\ding-pbx-console\\app-0.1.84\\resources\\app.asar\\dist\\index.html`.\n\nEach capture plan required a task-local CDP endpoint, an exact expected URL, bounded synchronous evaluation, and a single page target before evaluating the renderer. No target was selected by index or by a partial URL match. The setup diagnostic was launched directly from the staged `Ding-PBX-Console-Setup.exe`; the recorded process was `33380`, which proves the direct installer launch path reached the operating system even though the installer does not expose an application page target.\n\nThe old baseline restart plan clicked the first restart control on the old build, exposing the missing acknowledgement and failure-reporting contract. The repaired ready plans reached `Restart to install update`, the direct `Setup.exe` process launch was observed, and the repaired path kept the application open when a forced spawn failure was requested. The `Later` plan hid the banner while preserving the staged candidate, and the draft plan sent a count of `2`, observed the exact review, apply, or discard message, and confirmed that restart was disabled.\n\n## Verification boundary\n\nThese records prove the named built-artifact states and the exact capture method. They do not claim a complete release, installer, or production deployment verdict. The source and release SHAs, package versions, dimensions, and digests above are the evidence identifiers for this pair.\n\n## Suggested articles\n\n[Automatic updates](../platform/automatic-updates.md), [In-context recovery](../platform/in-context-recovery.md), [Non-blocking notifications](../platform/non-blocking-notifications.md), [Platform feature index](../platform/README.md).\n"
    },
    {
      "id": "evidence/design-parity-chrome-bar",
      "category": "evidence",
      "title": "The chrome-parity bar",
      "headings": [
        {
          "title": "Why the old bar could never be met",
          "id": "why-the-old-bar-could-never-be-met"
        },
        {
          "title": "What the bar asks instead",
          "id": "what-the-bar-asks-instead"
        },
        {
          "title": "The three properties that keep it honest",
          "id": "the-three-properties-that-keep-it-honest"
        },
        {
          "title": "Where the rectangles come from",
          "id": "where-the-rectangles-come-from"
        },
        {
          "title": "Running it",
          "id": "running-it"
        },
        {
          "title": "What it produces",
          "id": "what-it-produces"
        },
        {
          "title": "Capture method",
          "id": "capture-method"
        },
        {
          "title": "Capture records",
          "id": "capture-records"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "The status cell is chrome, and admitting it found something",
          "id": "the-status-cell-is-chrome-and-admitting-it-found-something"
        },
        {
          "title": "The axis pin: what it was, and what removing it cost",
          "id": "the-axis-pin-what-it-was-and-what-removing-it-cost"
        },
        {
          "title": "Where the divergence actually comes from",
          "id": "where-the-divergence-actually-comes-from"
        },
        {
          "title": "The connection pill is data, and that decision cost two surprises",
          "id": "the-connection-pill-is-data-and-that-decision-cost-two-surprises"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../../design-reference/README.md"
      ],
      "body": "# The chrome-parity bar\n\nThe reference-versus-built comparison a destination in this project can actually meet.\n\n## Why the old bar could never be met\n\n`compareCaptures` asks whether the reference capture and the built capture are pixel-identical\nacross the whole frame, and `verifyDesignParityEvidence` used to require that `match` before a\ndesign-parity row could claim `verified`.\n\nThat question is unanswerable here, and not because of any defect. This application deliberately\nremoved the design's sample rows, dashboard tiles, health bars, per-row badges, history, agent rail\nand trunk-authentication content, and shows the target's real — usually empty — readings in the same\nplace. So the design shows invented content exactly where the application shows a reading, and\nbetween 47% and 64% of every frame differs for a reason nobody wants fixed. No row could ever be\nverified, and the guard was right to refuse every one of them.\n\n## What the bar asks instead\n\n> Outside the regions that carry data, do the two artifacts render identically?\n\nThat is meetable, and the existing captures prove it rather than assert it: the `dash` and `logger`\ncapture pairs each contain runs of rows that are byte-for-byte equal between the two sides, and\ninside the credits pill the Roboto digit is byte-for-byte equal on all 32. Both sides are Chromium\nat the same device metrics reading the same local font files, so identical content **can** produce\nidentical pixels here.\n\nThe bar therefore has **no per-pixel tolerance**. A tolerance would be a number chosen until\nsomething passed; zero is the number the artifacts themselves support.\n\n**That claim used to be stronger, and the stronger version is now known to be too strong.** It read\n\"identical content really does produce identical pixels here\", without qualification. Admitting\n`statusCell` into the compared region tested it directly — one compiled template, nothing overridden\non either side, the same rectangle measured on both — and it differs by 1,420 pixels on every one of\nthe 32. See [what admitting the status cell\nmeasured](#the-status-cell-is-chrome-and-admitting-it-found-something). Zero is still the only\ndefensible tolerance; what changed is that meeting it is not free, and a tolerance wide enough to\nabsorb those 1,420 pixels would be wide enough to absorb a real defect.\n\n## The three properties that keep it honest\n\nA masked comparison is easy to pass badly: widen the mask until nothing is left. Three properties\nstop that, and each is guarded and proven red-then-green.\n\n**The mask is declared, not discovered.** Nothing in `compareChrome` reads the pixel diff to decide\nwhat to exclude. A mask derived from the diff would exclude exactly what differs and turn every\nverdict into a match — the one construction that would make the whole thing worthless.\n\n**A mask that swallows the frame is refused.** The compared region must keep at least 25% of the\nframe (`chromeParityBar.minimumComparedFraction`). The regions this application actually declares\nleave a little under 30%, so the floor sits below what an honest mask costs and far above what a\nmask widened to force a pass would leave. `compareChrome` returns `refused`, never `match`, when the\nfloor is breached.\n\n**What the mask hid is measured and reported anyway.** Every record carries\n`excluded.diffPercentage` — how much of the masked region genuinely differed. A mask covering a\nregion that was identical all along shows up as a suspiciously low number rather than as nothing at\nall.\n\n## Where the rectangles come from\n\nThey are measured off both live DOMs during a capture run by `scripts/design-parity-regions.mjs`,\nnever hand-drawn.\n\nThe shell is located **structurally** — a three-row layout whose last row is three columns — because\nthe two sides share the design's layout but not its class names: the design export's runtime emits\n`scp7`/`scp8` and the compiled renderer emits `k-h0`/`k-h7`, both hashed at build time. A side whose\nstructure has drifted from that shape is refused by name rather than silently measured in the wrong\nplace.\n\nEight areas are measured on each side. Which of them carry data is the **one human judgement** this\nbar rests on, declared once for the whole application in `inventories/design-parity.json` rather\nthan as 32 per-destination masks, so the judgement stays small enough to review:\n\n- **`brandCell`** — *chrome*. The product mark and name; the same on every destination. It is\n  guaranteed to differ and is compared anyway — see [the brand cell](#the-brand-cell-is-7px-wider-and-that-is-not-geometry).\n- **`menuCell`** — *chrome*. A fixed set of menu titles. Its divergence is the brand cell's, displaced.\n- **`commandCell`** — **data**, and this is the decision the roadmap asked for — see\n  [the connection pill](#the-connection-pill-is-data-and-that-decision-cost-two-surprises).\n- **`statusCell`** — *chrome*, and this is the second decision the roadmap asked for — see\n  [the status cell](#the-status-cell-is-chrome-and-admitting-it-found-something).\n- **`tabStrip`** — *chrome*. Tab titles come from the navigation catalogue, itself compiled from the\n  design, so both sides are naming the same screens.\n- **`rail`** — *chrome*. Six fixed rail icons and labels, compiled from the design's catalogue.\n- **`sectionList`** — *chrome*. Kept **inside** the comparison on purpose, badges and all — see below.\n- **`contentPane`** — **data**. The destination's own screen: the region this bar exists to exclude.\n\nThe section list stays in the compared region deliberately, even though this application removed the\ndesign's per-row badges. The labels are chrome, and a badge present on one side and absent on the\nother is a divergence worth reading in the result rather than one worth hiding in a mask.\n\nAn area's exclusion rectangle is the **union** of the two sides' measured rectangles, not their\nintersection. The sides genuinely disagree about some heights, and an intersection would leave a\nstrip of one side's data inside the compared region and report it as a chrome defect it is not. A\nunion can only ever hide more, which is what the compared-fraction floor and the excluded-region\nmeasurement are there to keep honest.\n\n## Running it\n\n**Prefer a full run of both sides.** It photographs each destination and measures its rectangles in\nthe same loop iteration, while the screen is settled and before anything else touches it, so the\nmask and the pixels are the same render. Everything below comes out of one pass per side.\n\n```\n# the design export, rendered by its own runtime, under a browser on an off-screen desktop\nnode console/scripts/design-parity-capture-run.mjs --side=reference --port=N --server-port=M\n\n# the real built renderer, under Electron on an off-screen desktop\nnode console/scripts/design-parity-capture-run.mjs --side=built --port=N\n\n# no browser at all: both stages read the two PNG sets and the two region files off disk\nnode console/scripts/design-parity-capture-run.mjs --side=diff\nnode console/scripts/design-parity-capture-run.mjs --side=chrome\n```\n\n`--regions-only` measures the rectangles and photographs nothing. It exists so the bar could be\napplied to captures that were already committed, where re-photographing them to obtain a mask would\nhave replaced the very evidence being measured. It leaves the rectangles and the pixels a run apart,\nso reach for it only when the captures are not being retaken.\n\n`--side=chrome` **refuses to run at all** when `console/dist` and `console/dist-electron` are both\nabsent: with no build output, no capture can be proved newer than the build it claims to show, and a\nstaleness check that silently does not run is indistinguishable from one that passed.\n\n## What it produces\n\nTwo files per destination, both named by `evidenceTemplates`:\n\n- `{id}-regions.json` — every area's rectangle on each side, its union, its declared role and the\n  reason behind that role.\n- `{id}-chrome.json` — the verdict, the compared fraction, the differing pixel count and bounding\n  box, a per-area breakdown, what the mask hid, and the palette and staleness checks.\n\nA `verified` row now requires the chrome record to be a `match` with a staleness check that\n**actually ran**, and requires it to cite exactly the mask its own region ledger recorded — so a\npassing comparison cannot rest on rectangles nobody measured. The whole-frame `visualDiff` is still\nrequired and still read; it is now required to be a real comparison rather than a match, and a\n`refused` one is refused exactly as before.\n\n## Capture method\n\nBoth sides were driven over loopback Chrome DevTools Protocol against an already-running target that\nexposes exactly one page target. **One full run per side**, so each destination's rectangles were\nmeasured on the live DOM while that screen was settled, in the same loop iteration that photographed\nit -- the mask and the pixels are the same render, not two visits that happen to agree. That\nsupersedes the earlier pair of `--regions-only` runs, which existed so the bar could be applied to\ncaptures that were already committed.\n\n**Both sides now run under the same browser, and that is a change.** The reference side used to run\nunder headless Edge while only the built side ran under Electron, so two artifacts compared at a\ntolerance of exactly zero were being drawn by two different browsers in two different modes. What\nthat was worth is measured rather than guessed at, in\n[why one measurement would have got this backwards](#why-one-measurement-would-have-got-this-backwards):\nretaking the reference side alone, with no change to the product, raises the rail's divergence on\nevery one of the 32.\n\n- **Reference side.** The design export rendered by its own runtime inside\n  `design-reference/index.html`, under **Electron 43.4.1 on an off-screen Windows desktop**, with a\n  capture run's full request interception: React served from the locally vendored copies the design's\n  own integrity hashes pin, the font stylesheet answered from `assets/fonts`, and every other request\n  refused and counted. **No request reached the network** -- 710 to the capture host, 64 font\n  stylesheets answered locally, 0 blocked. 32 of 32 destinations.\n- **Built side.** The real built renderer under **the same Electron 43.4.1** on an off-screen Windows\n  desktop created by `scripts/launch-on-hidden-desktop.ps1`, from `console/dist` built out of this\n  tree. The visible desktop, cursor and foreground application were never touched. 32 of 32\n  destinations.\n- **Comparison.** `--side=diff` and `--side=chrome`, no browser at all.\n\n## Capture records\n\nEvery record below came from that same run: one full pass per side against one build of this tree.\nThe `--side=chrome` stage itself takes no pictures — it reads the two region measurements and the\ncaptures off disk.\n\nThe last two rows have now been **re-derived twice**: once when `commandCell` moved from chrome to\ndata, and once when `statusCell` moved from data to chrome. Neither re-derivation retook a capture or\nre-measured a rectangle. The same 64 PNGs and the same two region files went in both times, and only\nthe mask changed. Both re-runs were made against the exact build output the built captures were taken\nfrom — the newest build mtime each recorded is `1787691669082.8162`, the same figure the original\nrecords carry — so their staleness check compares the same two things the original one did, and means\nneither more nor less. With one caveat the second re-run created for itself: it walked `console/dist`\nalone, for the reason given under [verification boundary](#verification-boundary).\n\n| State | Record | Run from commit | Coverage | Result |\n| --- | --- | --- | --- | --- |\n| Reference-side rectangles | `release/evidence/parity/regions-reference.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 of 32 | 8 area rectangles each; every shell exactly 1440x1000 at the origin |\n| Built-side rectangles | `release/evidence/parity/regions-built.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 of 32 | every shell exactly 1440x1000 at the origin |\n| Whole-frame visual diff | `release/evidence/parity/{id}-diff.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 records | 0 match, 32 diff, 0 refused; 20.60%-61.41% of pixels differ |\n| Per-destination region ledger | `release/evidence/parity/{id}-regions.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 ledgers | 2 data areas excluded, 6 chrome areas compared |\n| Per-destination chrome-parity comparison | `release/evidence/parity/{id}-chrome.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 records | 0 match, 32 diff, 0 refused; 2.95%-12.20% of the compared region differs |\n| Run ledger for the comparison stage | `release/evidence/parity/run-chrome.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 compared, 0 skipped | exactly 29.1106% of the frame compared, against a declared floor of 25% |\n| The axis pin, rendered both ways | `release/evidence/parity/msym-axis-pin.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 98 icons | 0 differing pixels shipped-against-design; 11,252 under the pin |\n| The axis pin, four-way at destination level | `release/evidence/parity/msym-axis-pin-destination.json` | `5cc309a4421ca843721ea71d7336cd7e317f358c` | 32 destinations | baseline `12bb4ff85f21d664b92d90410d645440f022ad9c`; only both changes together converge |\n\nEvery figure above came from one full pass per side taken in one session against the build recorded\nin `console/resources/update-manifest.json`, whose `candidateCommit` is that same\n`5cc309a4421ca843721ea71d7336cd7e317f358c`. **`master` gained an IAX2 destination and a further screen repair after that build,\nand this pass re-photographs neither** — that is stated rather than left to inference, and it is\nthe same condition `master`'s own Fax commit left behind, which retook no capture either.\n\n## Verification boundary\n\nTwo of the three limitations this section used to record are gone, and one is not.\n\n**Gone: the rectangles and the pixels came from different runs.** They do not any more. Each\ndestination is measured and photographed in the same loop iteration, on both sides.\n\n**Gone: the built artifact's own commit was not identified.** `console/dist` and\n`console/dist-electron` were built from this tree, and `console/resources/update-manifest.json`\nrecords that candidate commit in the same change as these captures.\n\n**Still true: the mtime staleness check does not mean much from a fresh worktree.** `compareChrome`\ncompares each built capture's mtime against the build output's mtimes, and all 32 passed. But a\ncheckout stamps every file with the time it was written, so what that check compares in a freshly\nlinked worktree is \"the checkout happened after the build\", which was never in doubt. Treat the 32\npasses as an absence of contrary evidence rather than proof, and rely on the single-pass provenance\nabove, which does not depend on a timestamp at all.\n\n**New, and created by the `statusCell` re-run rather than found by it: that re-run walked\n`console/dist` only.** 21 files — the Vite renderer output the built captures actually photographed —\nand not `console/dist-electron`. The recorded `newestBuildSourceMtimeMs` is unchanged at\n`1787691669082.8162`, because that figure has always come from `dist` and it is the same figure the\nrecords this run replaced already carried.\n\nThe reason `dist-electron` was absent is a mistake, and it is written down rather than tidied away.\nThe pass reached the capture-provenance build output through a **directory junction**, and a routine\n`npx tsc -b` then wrote *through* that junction and restamped all 93 files of `console/dist-electron`\nin the linked worktree holding it, from about `1787691669000` to `1787697942397`. Nothing tracked was\ntouched, and the directory is ignored build output that a rebuild restores — but its mtimes are no\nlonger the ones the captures were taken beside, so including it would have made every record refuse\non a staleness the pass had manufactured itself. Excluding it narrows what this check considered from\n114 files to 21. It does not change what the check concluded, and the honest reading is that this\nrun's timestamp provenance is one directory weaker than the run it replaced.\n\n**No destination meets the bar.** All 32 report a real chrome divergence. That is the bar doing its\njob rather than a defect in it, and it is now a second measured reason nothing is verified, beside\nthe Material Design 3 audit's finding that none of the 32 conforms.\n\n## The status cell is chrome, and admitting it found something\n\nThe roadmap asked the second of two role questions: should `statusCell` stop being excluded as data?\nThe answer is **yes**, and the argument is shorter than `commandCell`'s because the renderer settles\nit outright.\n\nThe fourth top cell holds the Beginner/Expert mode picker, the confirmation-credits pill, the\ncommand-palette button and the three window controls. Its previous declaration read \"carries live\nstatus: what the console is connected to and how that connection is faring\" — but that sentence\ndescribes `commandCell`, and a pass corrected the text while deliberately leaving the role alone so\nthis move could be measured on its own.\n\nThe decisive evidence is not the description. `App.tsx` overrides exactly **two** values in the whole\ntop strip — `connLabel` and `connUptime` — and **both land in `commandCell`**. Nothing inside this\ncell is written by the product at all: the same `modeOpts`, the same credits count, the same search\nglyph and the same three window buttons come out of the same compiled template on both sides. There\nis no invented reading here for the bar to exclude, so excluding it was a narrowing nobody argued\nfor.\n\n**What the decision costs, measured.** The compared fraction **rises** from exactly `28.0883%` to\nexactly `29.1106%` — 419,192 pixels of 1,440,000, which is the 404,472 compared before plus this\ncell's own 14,720. It is the first change to this declaration that widened the comparison instead of\nnarrowing it. The compared-region divergence moves from 4.62%–13.68% to **4.80%–13.54%**: the low end\nrises and the high end falls, because this cell diverges by more than the least-divergent\ndestinations did and by less than the most-divergent ones.\n\n**No neighbouring area moved by a single pixel**, unlike the `commandCell` move. This cell's union\nspans columns 1072–1440 and overlaps nothing else, so there was no neighbour's compared strip to\nclip. The worst-area tally is unchanged at `brandCell` 21, `tabStrip` 7, `sectionList` 4, because\n9.65% never beats `brandCell`'s 15.56%.\n\n### It was expected to match. It does not.\n\nOne template, nothing overridden, the identical rectangle `1072,0,368,40` measured on both sides of\nall 32 — and it differs by **1,420 of its 14,720 pixels, 9.6467%, with the same count on every one of\nthe 32**. An identical figure across 32 different screens is the signature of one cause, so the 1,420\nwere located rather than shrugged at. There are two, and neither is noise.\n\n**One: the Material Symbols glyphs.** Every differing pixel outside the mode picker sits on an icon —\nthe credits pill's `confirmation_number` at columns 1237–1259 (129 differing), the command-palette\n`search` glyph at 1302–1317 (119), and `remove`, `crop_square` and `close` at 1345–1356, 1379–1390 and\n1413–1424 (46, 88 and 84).\n\nThe discriminator sits inside the same pill. The **Roboto digit** beside that icon, columns\n1267–1284, is **byte-for-byte identical — 0 differing pixels**. Roboto matches and Material Symbols\ndoes not, in adjacent runs of the same control, so this is not antialiasing in general.\n\nBoth sides are served the same local `material-symbols-outlined-100-700-0.woff2`; the reference side\ngets it through the capture run's font interception, which answers `fonts.googleapis.com` out of\n`assets/fonts`. What differs is the rule. `font-variation-settings` appears **zero** times anywhere\nunder `design/` and **exactly once** in the built renderer — in the `.msym` rule `compile-design.mjs`\nadds, pinning `FILL 0, wght 400, GRAD 0, opsz 24`. Material Symbols Outlined is a variable font whose\naxes the design's own stylesheet link requests as `opsz 20..48, wght 100..700, FILL 0..1, GRAD\n-50..200`, so the built side draws every icon from a pinned instance and the reference side draws it\nfrom the file's default one.\n\n**Two: the mode picker's border.** 548 of the 946 pixels differing inside the picker are in five\nrows, and they are the box's own 1px border rather than anything inside it. On the reference the top\nborder is a single crisp row 6 at `rgb(65,73,66)`, with rows 5 and 34 pure background. On the built\nside the same ink is **split across rows 5 and 6** at `rgb(24,31,25)` and `rgb(40,52,45)`, and the\nsame at the bottom. The built side draws the 28px-tall picker box half a pixel higher.\n\nThat is a real sub-pixel layout difference and **not** a whole-frame offset. Shifting the built region\nby −2, −1, +1 or +2 pixels raises the divergence in every one of the six runs rather than lowering it,\nso `dx=0` is already the best alignment — and the byte-identical Roboto digit proves at least one\nglyph sits at exactly the same subpixel position on both sides.\n\n### What this section does not claim\n\nThe first cause is measured to its mechanism; the second only to its symptom.\n\nFor the icons, the difference between the two stylesheets is a fact **counted in the files** — 0\noccurrences under `design/`, 1 in the generated renderer — and the divergence is confined to exactly\nthe glyphs that rule governs. But this pass did not re-render either side with the axes changed, so\nthe pinning is a **named** cause rather than a demonstrated one.\n\nFor the picker border, the half-pixel offset is measured in the pixels and its cause is **not\nestablished**. The top strip is 40px on both sides, the picker is 28px on both, and `(40 − 28) / 2` is\nan integer, so where the half pixel enters is unknown.\n\n**Neither is repaired here, on purpose.** Repairing the first means editing the compiled renderer's\n`.msym` rule, which changes how every icon in the shipped product is drawn and invalidates all 32\nbuilt captures — a decision and a capture run of its own, not a side effect of a role change. Both\nare recorded as roadmap items.\n\n> [!NOTE]\n> **Both have since been answered, and only one of them was what it looked like.** The section above\n> is left exactly as written, because the account of how the two causes were found is still the\n> account. See [the axis pin](#the-axis-pin-what-it-was-and-what-removing-it-cost): the icon cause\n> was demonstrated and repaired, and the picker border turned out not to be a divergence between the\n> two artifacts at all.\n\n## The axis pin: what it was, and what removing it cost\n\n`compile-design.mjs` used to append `font-variation-settings:\"FILL\" 0,\"wght\" 400,\"GRAD\" 0,\"opsz\" 24`\nto its own `.msym` rule. It does not any more. The decision, and the reason it could not be taken by\nreading the code, are below.\n\n### What the pin was\n\nIt arrived in this compiler's **first** commit, `9beed2f159` — **thirty minutes before** the 49-face\nfont download in `0611732d0`, and it was never touched again. The roadmap item that raised this\nworried that the pin had arrived *with* that download and that removing it might undo a repair. The\nordering disproves the premise. It is Google's own documented Material Symbols snippet, carried in\nunchanged and never revisited.\n\n### What it did\n\n`scripts/woff2-fvar.mjs` reads the shipped face's own `fvar` table, rather than trusting the\nstylesheet URL that requested it:\n\n| axis | minimum | **default** | maximum |\n| --- | --- | --- | --- |\n| `FILL` | 0 | **0** | 1 |\n| `GRAD` | −50 | **0** | 200 |\n| `opsz` | 20 | **24** | 48 |\n| `wght` | 100 | **400** | 700 |\n\nThree of the four pinned values are the file's own defaults. They did nothing at all.\n\nThe fourth did a great deal. CSS `font-optical-sizing` defaults to `auto`, which drives the `opsz`\naxis from the used font-size, and `font-variation-settings` **outranks it** — so a fixed `opsz 24`\nreplaced every icon's own optical size with a 24px icon's. The design draws **175 icons, and four of\nthem are 24px**.\n\n### The demonstration\n\n`scripts/design-parity-msym-axes.mjs` renders every distinct literal (size, ligature) pair the design\ndraws — 98 of them — four ways in one Chromium at this capture tuple's own metrics, from the shipped\nfont file:\n\n| comparison | whole-frame differing pixels |\n| --- | --- |\n| the design's own `.msym` rules against **the shipped rules** | **0** |\n| the design's own rules against **those rules plus the pin** | **11,252** |\n| the design's own rules against **the pin with `opsz` per icon at `clamp(size, 20, 48)`** | **0** |\n\n95 of the 98 differ under the pin; the three that do not are exactly the 24px ones. The last row is\nwhat identifies the mechanism rather than merely correlating with it — the unpinned rendering **is**\nthe pin at each icon's own optical size.\n\n### Why one measurement would have got this backwards\n\nThis pass changed two things: the product, and the harness — which now renders **both** sides under\none Chromium, where the reference side previously ran under headless Edge while only the built side\nran under Electron. Two artifacts compared at a tolerance of exactly zero were being drawn by two\ndifferent browsers in two different modes.\n\n`scripts/design-parity-msym-destination.mjs` separates the two across all 32 destinations, comparing\nboth reference sets against both built sets. On the **navigation rail** — 81,136 compared pixels of\nnothing but icons and their labels:\n\n| pairing | rail, differing pixels |\n| --- | --- |\n| the recorded baseline | 2,401 – 6,676 |\n| the pin removed, against the **old** reference | 3,346 – 7,432 |\n| the pinned build, against the **new** reference | 4,457 – 8,574 |\n| **both retaken together** | **0 – 4,411, exactly zero on 12** |\n\n**Either change alone makes it worse on every destination but one; only both together converge.** A\npass that had removed the pin and kept the committed reference captures would have measured a correct\nrepair as a regression, and would very reasonably have backed it out. The single exception is\n`codecs`, where removing the pin alone does lower the rail figure — named rather than absorbed into a\n\"most destinations\".\n\n### What it cost and bought\n\n| figure | before | after |\n| --- | --- | --- |\n| `statusCell` | 1,420 pixels (9.6467%) on all 32 | **555 (3.7704%)** on all 32 |\n| `brandCell` | 1,002 (15.5590%) | **846 (13.1366%)** |\n| `menuCell` — the control, holding no icon | 1,886 (12.2786%) | 1,888 (12.2917%) |\n| `rail` | 2.9592% – 8.2282%, never zero | **0% – 5.4366%, byte-identical on 12 of 32** |\n| compared-region divergence | 4.80% – 13.54% | **2.95% – 12.20%** |\n| compared fraction | exactly 29.1106% | exactly 29.1106% |\n| worst-area tally | brandCell 21, tabStrip 7, sectionList 4 | unchanged |\n\nThe **mode picker's border** has left the divergence entirely. Of `statusCell`'s remaining 555\npixels, none is in the border rows; all of them are in the text band, rows 14–25. The half-pixel box\noffset the previous section measured was an artifact of comparing two browsers, not a property of\neither artifact.\n\n### What this does not claim\n\nNo destination moved to `verified` and none could — all 32 still report a real chrome divergence, and\nthe Material Design 3 audit still reports all 32 nonconforming. The 555 pixels still differing in\n`statusCell` are **not explained**: they sit in three column runs matching the check glyph and the\ntwo labels, and nothing here says why. The rail's remaining divergence on 20 of the 32 is likewise\nunexplained — it is 0 or 1 on seven of the eight `pbx`-rail destinations and larger elsewhere, and no\ncause was established. And rendering both sides with one Chromium in one mode is a stronger claim\nthan before, not a proof that every remaining pixel belongs to the artifacts.\n\n## Where the divergence actually comes from\n\nThe previous version of this section named **one** cause -- the reference shell being 1428 wide\nagainst the built shell's 1440 -- and that attribution was **wrong**. `brandCell` and `menuCell`\ndiverged by the same amount on the eleven destinations where the reference shell was a full 1440\nwide too, so a scrollbar cannot have been what moved them. Measuring properly found three causes,\nand two of them were defects in the equipment rather than in either artifact.\n\n### One: the reference document was never given the height its own root style needs\n\nThe design's root element is `height:100%; overflow:hidden` -- the same shape the built application's\nshell has. A percentage height against an auto-height body computes to `auto`, so the reference shell\ngrew to its content: **622px to 7668px tall** across the 32, and **1428px wide on 20 of them**\nbecause the document then scrolled.\n\n`design/support.js` supplies exactly the missing stylesheet, in its own `FULL_PAGE_CSS` constant --\nbut only `if (!parsed.preview)`, and this export declares a `$preview` of 1440x900 in its\n`data-props`. So the runtime withholds it and leaves the sizing to the frame the design tool would\nhave provided. Served bare in an iframe, nothing provided it.\n\n**Repaired in the capture harness**, by `design-parity-server.mjs`'s `injectFullPageHeight`, which\nserves that stylesheet with the hosted design -- read out of `support.js`'s own declaration rather\nthan typed, so a renamed or moved constant throws by name. Nothing under `design/` is edited, on disk\nor in flight.\n\n### Two: every built capture was taken behind the update banner\n\nThe banner is raised by the updater's own background check, which completes whenever it completes\nrather than at startup -- and the driver dismissed once, before the first destination. A full\n32-destination run was taken with it up: the application's shell sat at **(0, 43)** on the first\ntwenty-two destinations and **(0, 52)** on the last ten, as the banner's text rewrapped for a newer\nversion. Nothing failed. The captures looked entirely normal.\n\n**Repaired in the capture harness**, twice over: `clearUpdateBanner` dismisses and *proves\ndismissed* before **every** destination, in the shape the onboarding-wizard dismissal already had;\nand a built measurement whose shell does not sit at the window origin is refused outright, naming\nwhatever is above it. The second guard is not about the banner -- it catches any surface that\ndisplaces the shell, including one nobody has thought of yet.\n\n## The connection pill is data, and that decision cost two surprises\n\nThe roadmap asked one question: should `commandCell` be excluded as data? The answer is **yes**, and\nthe argument is short.\n\nThe cell renders `connLabel` and `connUptime`, which are `this.target.label` and\n`this.target.detail` — what the console's own discovery reports about the target it found. With none\nconfigured that is `no target` / `nothing discovered yet`; once one answers it is the discovered\ndistribution name and `N local target(s), connection verified`. The design invents `pbx-hq · AMI\n5038` and `up 14d 06:22` in the same two spans. That is this bar's founding sentence word for word:\n*the design shows invented sample content exactly where the application shows a real reading.*\n\nIt is **not** the `brandCell` or `sectionList` case, which is the objection worth answering, because\nthose two are also guaranteed to differ and are deliberately still compared. They differ where this\nproduct renders different **chrome** from the design's chrome — a product name one word longer, a\nper-row badge this application removed — and reporting that is what the bar is for. This cell differs\nbecause the design invented a **reading**, which is what the bar is for excluding.\n\n**What it costs, measured.** The compared fraction falls from exactly **29.5717%** to exactly\n**28.0883%** of the frame — 404,472 pixels of 1,440,000 — still above the declared 25% floor. The\ncompared-region divergence falls from 6.34%–14.95% to **4.62%–13.68%**. That fall is not an\nimprovement in the application: nothing about the built artifact changed between those two figures.\n\n**What it also hides, said plainly.** The region probe measures cells, not text runs, so excluding\nthis rectangle also excludes the pill's own border, radius, pulse dot and separator, which are\nchrome. 61.00% of the cell already matched, so most of what the mask now covers is pixels that\nagreed — and `excluded.diffPercentage` goes on reporting whatever it covers, 29.76%–81.88% across\nthe 32 against 29.56%–82.79% before.\n\n**Two results contradicted what was expected of the move, and are recorded because they did.**\n\n*Removing the worst area did not leave one uniform worst area behind it.* The expectation was that\n`brandCell`'s identical 15.56% would become the worst everywhere. It did not: the worst compared area\nis now `brandCell` on 21 destinations, `tabStrip` on 7 and `sectionList` on 4, where before it was\nthis cell on all 32. One area being worst on every destination at an identical figure was the\nsignature of a single cause; underneath it was a spread.\n\n*`menuCell`'s divergence rose, from 12.00% to 12.28%, without one new differing pixel.* Its differing\ncount is 1,886 before and after. Union rectangles overlap, so excluding this cell clipped nine\ncolumns off `menuCell`'s compared strip, and all 360 of those pixels matched. **Excluding an area can\nraise a neighbour's reported percentage by removing agreement rather than by finding disagreement**,\nand a reading of these numbers that misses that will attribute the rise to a regression.\n\n**No destination moved to `verified`, and none could.** All 32 still report a real chrome divergence,\nand the Material Design 3 audit still reports all 32 nonconforming.\n\n### The brand cell is 7px wider, and that is not geometry\n\n`Ding PBX Console` measures **106.63px** where the design's `Asterisk Console` measures **100.27px**,\nat the same 13px/500 Roboto inside the same 12px padding, 20px glyph and 10px gap: 160.63px against\n154.27px, rounding the two rectangles to **161** and **154**. Every remaining top-strip displacement\nis that one number -- `menuCell` moves right by 7, `commandCell` is squeezed by 8.\n\n**Repaired nowhere, and that is the finding.** It is a deliberate product rename, recorded in\n`compile-design.mjs`'s `BRAND` table and in `console/design/inventory.json` under\n`source.sanitization`, of the same kind as the sample data this project removed. Not the\napplication's to fix -- the name is the product's own. Not the design's -- it is the reference, and\nis never edited. Not the harness's -- it is reporting the difference correctly.\n\nSo `brandCell` differs by **15.56%** and `menuCell` by **12.28%** on every one of the 32,\npermanently. Both stay inside the compared region, on the same principle `sectionList` does: a\ndivergence worth reading in the result is not one worth hiding in a mask.\n\n`menuCell`'s figure read **12.00%** while `commandCell` was still compared, on the same 1,886\ndiffering pixels. Reclassifying `commandCell` as data clipped nine columns of matching pixels off\n`menuCell`'s compared strip, which raised the ratio without changing one pixel of either artifact.\n\n### What the repairs changed\n\nWritten as a list rather than a table on purpose: the row-level check on this document requires\nevery table row to name the commit its capture came from, and these are not capture records.\n\n- **Reference shells** — 1428 or 1440 wide and 622-7668 tall, now **1440x1000 at the origin on all 32**.\n- **Built shells** — 1440 wide at y=43 or y=52, now **1440x1000 at the origin on all 32**.\n- **Areas whose rectangle matches on both sides** — 0 of 8 on any destination, now **5 of 8 on all 32**.\n- **Whole-frame diff** — 47.13%-63.95%, now **23.07%-60.98%**.\n- **Compared-region diff** — 6.67%-26.78%, now **6.34%-14.95%**.\n- **Compared fraction** — 29.5%-29.6%, now **exactly 29.57% on every one of the 32**.\n- **Destinations with records** — 31, now **32**.\n\nThose last two figures are what the harness repairs left behind, and they are **not** the current\nones. The `commandCell` decision moved them to 4.62%–13.68% and exactly 28.0883%; the `statusCell`\ndecision moved them again, to **4.80%–13.54% and exactly 29.1106%**. They are kept as written because\nthis list records what one pass changed, and rewriting it would make it describe a different pass.\n\n`statusCell`, `tabStrip`, `rail`, `sectionList` and `contentPane` now measure the **same rectangle**\non both sides on every destination. The only geometric difference left anywhere in the application\nis the three top-strip cells, and it is one number.\n\n**None of this verified anything.** No destination moved to `verified` and none could: every one\nstill reports a real chrome divergence, and the Material Design 3 audit still reports all 32\nnonconforming. What changed is that the numbers now measure the product's real differences from the\ndesign instead of two defects in the equipment measuring them.\n\n## Suggested articles\n\n- [Design-reference harness](../../design-reference/README.md) — how each side is driven and captured.\n- `console/scripts/design-parity-chrome.mjs` — the comparator.\n- `console/scripts/design-parity-regions.mjs` — the region probe and ledger.\n- `console/tests/scripts/design-parity-chrome.test.mjs` — its tests.\n- `console/scripts/negative-design-parity-evidence.mjs` — the red-then-green proof for the\n  `verified` guard.\n- `console/scripts/negative-design-parity.mjs` — the red-then-green proof for the bar's declaration.\n"
    },
    {
      "id": "evidence/design-parity-material-audit",
      "category": "evidence",
      "title": "The Material Design 3 conformance audit",
      "headings": [
        {
          "title": "Why a machine is allowed to write this one",
          "id": "why-a-machine-is-allowed-to-write-this-one"
        },
        {
          "title": "What is audited",
          "id": "what-is-audited"
        },
        {
          "title": "The seven checks",
          "id": "the-seven-checks"
        },
        {
          "title": "Capture records",
          "id": "capture-records"
        },
        {
          "title": "Capture method",
          "id": "capture-method"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "What the first run found",
          "id": "what-the-first-run-found"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "design-parity-chrome-bar.md",
        "design-parity-chrome-bar.md",
        "../../design-reference/README.md"
      ],
      "body": "# The Material Design 3 conformance audit\n\nA design-parity destination cannot move from `compiled` to `verified` on captures alone. Three\nrecords stand behind a verified row, and this article is about the third of them: a per-destination\nMaterial Design 3 conformance audit. The first two — the whole-frame visual diff and the\n[chrome-parity bar](design-parity-chrome-bar.md) — answer *does the built artifact look like the\ndesign*. This one answers a different question the first two cannot: *is what both of them draw\nactually Material Design 3*, or is it a set of custom lookalikes that happen to agree with each\nother.\n\nThose really are different questions, and the reason is worth stating plainly. Two artifacts can\nmatch each other pixel for pixel while neither uses a single Material Design 3 primitive. A parity\nbar would call that a pass, and it would be right to, because parity is all it measures.\n\n## Why a machine is allowed to write this one\n\nFor several passes this repository recorded, deliberately, that no `{id}-material.json` had been\ngenerated, on the grounds that **a generated audit nobody performed would be an invented verdict**.\nThat objection is correct, and it is what shaped the auditor rather than what prevented it.\n\nThe objection is aimed at exactly one construction: a script that writes `conforms: true` without\nlooking at anything. `auditMaterial` is the opposite construction, and three properties make that\ncheckable rather than merely claimed.\n\n- **`conforms` is computed, never supplied.** It is exactly `defects.length === 0`, and the defect\n  list is derived from findings taken out of the rendered markup. There is no argument, option or\n  code path that can set it. The red-then-green proof plants a caller passing `conforms: true`, an\n  empty defect list and a clean check table all at once, and requires every one of them to be\n  ignored.\n- **Every check can only ever add a defect.** A check that fails to fire understates the divergence,\n  which is the ordinary cost of an incomplete audit. None of them can manufacture a conformance.\n  The direction of error is the whole design.\n- **An audit over nothing is refused rather than answered.** Markup that renders no element, or a\n  record with no destination, throws. A verdict about zero elements is the vacuous pass that every\n  other check in this repository is written against.\n\n## What is audited\n\nThe **built product renderer** — `app/renderer/src/App.tsx`, the class the application actually\nmounts — rendered at each destination, together with the effective stylesheet that renderer loads:\n`app/renderer/src/styles.css` and the generated `design-styles.css` it imports.\n\nNot the bare compiled shell `App` subclasses, and not the design export. The conformance question a\nverified row asks is about the chrome a person operates, so it is the product that has to answer\nit. Auditing only the generated stylesheet would miss every application-owned rule, which is the\n\"wired at one end, consumed at neither\" shape this project keeps meeting.\n\n## The seven checks\n\nEach measures a real declaration against a published specification value, not against a number\nchosen here.\n\n- **`typeScale`** — every explicit font size is one of the 15 Material Design 3 type-scale sizes.\n- **`iconSize`** — every icon glyph is drawn at 20, 24, 40 or 48dp.\n- **`shapeScale`** — every corner radius is 0, 4, 8, 12, 16 or 28dp, or fully rounded.\n- **`elevation`** — a shadow is a two-layer elevation, a key shadow plus an ambient shadow, rather\n  than one custom layer.\n- **`stateLayer`** — hover and pressed lay a translucent state layer over the existing surface\n  rather than swapping it to another opaque colour, and a focus state exists.\n- **`touchTarget`** — an interactive element reaches the 48dp minimum in both axes.\n- **`motion`** — durations and easing curves are Material Design 3 motion tokens.\n\n## Capture records\n\n| State | Record | Run from commit | Coverage | Result |\n| --- | --- | --- | --- | --- |\n| Per-destination conformance audit | `release/evidence/parity/{id}-material.json` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 of 32 audited destinations | 0 conforming, 32 not; 155–970 divergences each |\n| Run ledger for the audit | `release/evidence/parity/run-material.json` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 audited, 57 interaction rules | 8279 divergences across seven checks |\n| Type-scale check across the run | `release/evidence/parity/{id}-material.json` → `findings.typeScale` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 1955 sizes off the 15-size scale |\n| Icon-size check across the run | `release/evidence/parity/{id}-material.json` → `findings.iconSize` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 2364 glyphs off 20/24/40/48dp |\n| Touch-target check across the run | `release/evidence/parity/{id}-material.json` → `findings.touchTarget` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 1274 interactive elements below 48dp |\n| State-layer check across the run | `release/evidence/parity/{id}-material.json` → `findings.stateLayer` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 57 interaction rules | 1120 opaque colour swaps where a state layer belongs |\n| Motion check across the run | `release/evidence/parity/{id}-material.json` → `findings.motion` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 955 off-token durations and easings |\n| Shape-scale check across the run | `release/evidence/parity/{id}-material.json` → `findings.shapeScale` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 578 radii off 0/4/8/12/16/28dp |\n| Elevation check across the run | `release/evidence/parity/{id}-material.json` → `findings.elevation` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 33 single-layer shadows where an elevation is two |\n\n## Capture method\n\nThe audit is a static measurement of the rendered markup and the effective stylesheet, not a\nphotograph. Each destination is rendered through `renderToStaticMarkup` from the real `App` class,\npinned on that destination's screen and rail with the first-run wizard closed — the same way every\n\"is this actually reachable\" test in this repository renders it. The markup is then scanned element\nby element, the stylesheet's interaction rules are parsed, and each declaration is compared against\nthe specification constants exported from `console/scripts/design-parity-material.mjs`.\n\n```\nnpx tsx console/scripts/audit-design-parity-material.mjs             # write every record\nnpx tsx console/scripts/audit-design-parity-material.mjs --only=dash # one destination\nnpx tsx console/scripts/audit-design-parity-material.mjs --check     # freshness only, writes nothing\nnode console/scripts/negative-design-parity-material.mjs             # the red-then-green proof\n```\n\n`--check` re-derives all 32 records from the current renderer and fails if a committed one would\ndiffer or is missing. It runs inside `npm run test:inventories`, so a renderer change that moves a\nscreen without re-auditing it turns the suite red — a conformance verdict left behind by a renderer\nthat has since changed is a statement about a screen nobody can reach, which is the same staleness\nthe capture harness refuses everywhere else.\n\n**The comparison strips carriage returns from both sides, and that is load-bearing rather than\ntidy.** This checkout runs with `core.autocrlf=true`, so a record written with LF is materialised\nwith CRLF in every other checkout of the same commit — a fresh clone, a linked working tree, a\nbuild runner. The first version compared the bytes as read, and it was found the only way a defect\nlike that ever is: the whole suite passed in the tree that generated the records, and the identical\ncommit reported all 32 of them stale in the primary checkout beside it. Green where it was written\nand red everywhere it matters is the worst direction for a freshness check to be wrong in. What the\ncheck is actually about is whether a record still says what the renderer produces, and a line\nending is not part of that — so both directions are now planted in the red-then-green proof: a CRLF\nrecord must not be called stale, and stripping carriage returns must not blind the check to a real\nedit.\n\n## Verification boundary\n\nThis audit reads declarations, not pixels. Five limits travel inside every record's own\n`notMeasured` field rather than living only here.\n\n- **Component anatomy.** Whether a control whose measurements are correct is a real Material Design\n  3 component or a custom lookalike sharing its numbers.\n- **Post-layout geometry.** A flex child that declares no size has no measurable touch target, so it\n  is not held to the 48dp minimum.\n- **Runtime-injected style.** Anything a script sets on an element after render.\n- **Observed motion.** That a declared transition runs, and runs for the duration it declares.\n- **Colour roles.** No colour tokens are measured at all, so nothing here says whether a hard-coded\n  colour is the colour role its position calls for.\n\nClosing those needs the same driven-build route the captures use.\n\nThe other boundary worth naming is what a clean run would and would not mean. `conforms: true` on\nevery destination would satisfy one of the three requirements a `verified` row carries. It would\nnot make a row verified on its own, and it would not be evidence about the reference side, which\nthis audit never renders.\n\n## What the first run found\n\nAll 32 audited destinations, between 180 and 1433 elements each, and 57 interaction rules.\n**Conforming: 0. Non-conforming: 32.**\n\nThe shape of it is consistent, and it is the signature of a design-tool export whose measurements\nwere chosen by eye rather than taken from the scale. Type sizes land on 11.5, 12.5, 13, 13.5, 14.5,\n15, 15.5, 18, 20 and 54px, none of which the type scale contains. Icon glyphs land on 14 through\n22, and on 30, 32 and 34. Radii land on 5, 7, 9, 10, 14, 18, 20, 24 and 26. Every interaction state\nis an opaque colour swap. Every shadow is a single custom layer. Durations sit at 120, 160, 180,\n220, 240, 280, 320, 340 and 360ms against a token set holding 100, 150, 200, 250, 300 and 350.\n\n**What it found conforming matters as much.** An auditor reporting everything as wrong would be\nexactly as useless as one reporting everything as right, and — because every audited destination\nhere is non-conforming — the committed evidence alone cannot tell those two apart. So the passes are\nworth naming. `cubic-bezier(.2,0,0,1)`, the curve most of this interface transitions on, **is** the\nMaterial Design 3 standard easing token and is not reported; the two curves that are reported are\novershoot springs. Icon glyphs at 20 and 24px pass. Radii at 8, 12, 16 and 999px pass, and so does a\nunitless `0`, which is the shape scale's own \"none\" step. The application's own stylesheet declares\nfocus states, so the focus half of the state-layer check does not fire.\n\nBeyond that, the auditor is held against a **fully conformant synthetic screen** and required to\nreturn a clean verdict, and each of the seven checks is then broken one at a time on that screen and\nrequired to be the only one that fires. That is the discriminator the real evidence cannot provide.\n\n`verifyDesignParityEvidence` reads these records: a row claiming `verified` needs its record\npresent, naming that destination, recording `conforms: true`, and carrying no unresolved defects.\nAll 32 currently record `conforms: false`, so this is now a second **measured** reason no\ndestination is verified rather than an absent prerequisite, which is what it was before.\n\n## Suggested articles\n\n- [The chrome-parity bar](design-parity-chrome-bar.md) — the reference-versus-built half of the\n  same `verified` requirement.\n- [Design-reference harness](../../design-reference/README.md) — how each side is driven and\n  captured.\n- `console/scripts/design-parity-material.mjs` — the auditor and its specification constants.\n- `console/scripts/audit-design-parity-material.mjs` — the runner and its freshness check.\n- `console/tests/scripts/design-parity-material.test.mjs` — its tests, including the conformant\n  fixture.\n- `console/scripts/negative-design-parity-material.mjs` — the red-then-green proof.\n- `console/scripts/design-parity-evidence-on-disk.mjs` — the guard that reads these records.\n"
    },
    {
      "id": "evidence/live-readings",
      "category": "evidence",
      "title": "Every reading, run against a live Asterisk",
      "headings": [
        {
          "title": "What ran",
          "id": "what-ran"
        },
        {
          "title": "Result",
          "id": "result"
        },
        {
          "title": "Three things it found",
          "id": "three-things-it-found"
        },
        {
          "title": "One thing worth knowing about `dialplan show`",
          "id": "one-thing-worth-knowing-about-dialplan-show"
        },
        {
          "title": "Capture records",
          "id": "capture-records"
        },
        {
          "title": "Capture method",
          "id": "capture-method"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Guards",
          "id": "guards"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "statuscell-text-pixels.md",
        "design-parity-material-audit.md"
      ],
      "body": "# Every reading, run against a live Asterisk\n\nUntil this pass, no reading in this console had ever been taken from a running Asterisk. Every\nparser was written against a format string in this checkout's own C sources and tested against a\nfixture built from that string, which is a real discipline and a different claim: it says the\nparser matches what the source says Asterisk prints, not that it matches what Asterisk printed.\n\nThis is the second claim, measured.\n\nLedger: [`release/evidence/live-exchange/readings.json`](../../release/evidence/live-exchange/readings.json).\nCaptures: `release/evidence/live-exchange/readings/`.\nHarness: [`scripts/live-readings.mjs`](../../scripts/live-readings.mjs).\n\n## What ran\n\nThe target is the `ding-pbx-console` WSL2 distribution the console provisions from its own\nbundled root filesystem — an exchange this console created and may destroy. Nothing here writes\nto an exchange anybody depends on; that remains a separate, annotated roadmap item needing an\nauthorization only the repository owner can give.\n\n1. **Baseline.** All 63 allowlisted read-only command lines, plus the one object command, run\n   through `LocalAsteriskCliGateway` over `NodeProcessExecutor` — the production read path, not a\n   re-implementation of it. Every stdout committed verbatim.\n2. **Population.** The exchange as provisioned has no configured objects at all: every shipped\n   sample file is comment-only, so twelve readings would otherwise have been verified against\n   `No objects found.`, which proves the command runs and proves nothing about the parser. A\n   fixture was written through the console's own `StructuredConfigPlanner` → `ConfigTransaction`\n   → `WslConfigTransport` path across seven resources, and Asterisk reloaded.\n3. **Populated capture.** Every command run again. A command whose bytes were unchanged records\n   `sameAsBaseline` instead of committing a second identical file.\n4. **Restore.** Every backup handle the transaction returned rolled back, then each of the seven\n   files hashed on the target again. **All seven came back byte-identical.**\n\nBeside the parsers, all **14 gateway-backed production readers** were driven exactly as a screen\ncalls them, and the `CapabilityResult` each returned is recorded. That is the half a parser test\ncannot reach: a correct parser behind a reader that reports `unavailable` is a blank screen, and\nonly driving the reader tells the two apart.\n\n## Result\n\n**27 of 27 readings parse the live target's real output. 23 of 27 return rows once populated.**\n\n| Reading | Command | Parser | Baseline | Populated | Rows are |\n| --- | --- | --- | --- | --- | --- |\n| `channels` | `core show channels concise` | parseChannels | 0 | 0 | live channels |\n| `endpoints` | `pjsip show endpoints` | parseEndpoints | 0 | 1 | endpoints |\n| `contacts` | `pjsip show contacts` | parseContacts | 0 | 1 | contacts |\n| `registrations` | `pjsip show registrations` | parseRegistrations | 0 | 1 | outbound registrations |\n| `auths` | `pjsip show auths` | parsePjsipAuths | 0 | 1 | auth objects |\n| `channelStats` | `pjsip show channelstats` | parseChannelStats | 0 | 0 | per-channel codec rows |\n| `endpointDetail` | `pjsip show endpoint ding-live-probe` | parseEndpointDetail | — | 4 | transport and codec values |\n| `queues` | `queue show` | parseQueues | 0 | 1 | queues |\n| `modules` | `module show` | parseModules | 255 | 255 | modules |\n| `iaxPeers` | `iax2 show peers` | parseIax2Peers | 0 | 1 | IAX2 peers |\n| `iaxRegistrations` | `iax2 show registry` | parseIax2Registry | 0 | 1 | IAX2 registrations |\n| `uptimeSeconds` | `core show uptime seconds` | parseUptimeSeconds | 1 | 1 | seconds |\n| `dialplan` | `dialplan show` | parseDialplanGraph | 101 | 101 | dialplan steps |\n| `voicemailUsers` | `voicemail show users` | parseVoicemailUsers | 2 | 3 | mailboxes |\n| `voicemailZones` | `voicemail show zones` | parseVoicemailZones | 5 | 5 | zones |\n| `confbridgeRooms` | `confbridge list` | parseConfbridgeList | 0 | 0 | running conferences |\n| `mohClasses` | `moh show classes` | parseMohClasses | 1 | 2 | music classes |\n| `codecs` | `core show codecs` | parseCodecs | 46 | 46 | codecs |\n| `translations` | `core show translation` | parseTranslations | 18 | 18 | translation rows |\n| `aclRules` | `acl show` | parseAclRules | 0 | 1 | named ACLs |\n| `cdrStatus` | `cdr show status` | parseCdrStatus | 10 | 10 | settings and backends |\n| `loggerChannels` | `logger show channels` | parseLoggerChannels | 1 | 1 | logger channels |\n| `managerSettings` | `manager show settings` | parseManagerSettings | 15 | 15 | settings |\n| `managerUsers` | `manager show users` | parseManagerUsers | 0 | 1 | manager users |\n| `ariApps` | `ari show apps` | parseAriApps | 0 | 0 | connected REST applications |\n| `sysinfo` | `core show sysinfo` | parseSysinfo | 7 | 7 | system values |\n| `uptime` | `core show uptime seconds` | parseUptime | 2 | 2 | uptime values |\n\nThe four that stayed empty are exactly the four this harness declares it cannot populate, and the\nreason is recorded against each rather than left as an unexplained zero: a channel and a channel\nstatistic exist only while a call is up; `confbridge list` prints conferences that are *running*,\nnot rooms that are configured; and an ARI application appears when a client connects, not when a\nfile says so. `--check` refuses any *other* reading landing in that list, so a reading that\nquietly stopped returning rows cannot pass as a documented limitation.\n\n**11 of the 63 commands are not built into this target** and the console handles all eleven\ncorrectly: `AsteriskReadings` diverts on `No such command` and reports the subsystem as\nunavailable rather than parsing the refusal into an empty table. Those eleven are the three\n`dahdi show`, `odbc show`, both `dundi show`, all three `stir_shaken show`, and both `geoloc`.\n\n## Three things it found\n\n**1. The write path cannot represent a file that repeats a section name — high.** Found by the\nfixture's first attempt, which added a second `[general]` to `iax.conf` and was refused with\n`Post-read mismatch for /etc/asterisk/iax.conf`. Measured directly afterwards: an **unchanged**\nround trip of\n\n```\n[6001]                     [6001]\ntype=endpoint              type=aor\ncontext=default            max_contacts=1\nallow=ulaw\n```\n\n— the pattern nearly every real `pjsip.conf` uses — renders `type = endpoint` as `type = aor`,\ndeletes `context` and `allow`, and inserts `max_contacts` into the first section. Parsed section\nentry counts go from `[3, 2]` to `[2, 2]`. The cause is one line: `renderConfigOver` builds its\ndesired map with `wanted.set(section.name, section.entries)`, so the last section of a repeated\nname overwrites every earlier one.\n\nIt **fails safe**: `ConfigTransaction` compares the parsed post-read against the desired value,\nfinds them unequal, and rolls back. What it costs is that such a resource cannot be written at\nall, and the operator is told `Post-read mismatch`, which names nothing about repeated sections.\nThe fixture routes around it — the aor is `ding-live-probe-aor`, and `mergeFixture` folds the\n`register =>` line into the existing `[general]` rather than adding a second one — and refuses\noutright, by name, rather than discovering it three steps later.\n\n> **Repaired since this run, in a change of its own.** `renderConfigOver` now groups the desired\n> value into one ordered list of entry-lists per name and matches the *n*th `[name]` in the file\n> against the *n*th desired section of that name. The exact text above round-trips byte for byte,\n> entry counts stay `[3, 2]`, and editing, adding to, dropping and appending an occurrence each\n> reach the occurrence that asked for it — held by six tests in\n> `tests/control-plane/config-round-trip.test.ts`, each proven by breaking the repair four ways,\n> one at a time. Occurrence matching is positional, so which block's *comments* travel with a\n> surviving section is decided by position, exactly as it already was for a repeated key.\n>\n> The finding above is left as it was written, because it is what this run measured and the run\n> is not being re-taken. Two things this repair does **not** claim: nothing here has been run\n> against a live Asterisk, so the repair is proved against fixtures and this checkout's own\n> round-trip contract and no further; and the fixture still avoids the shape, because the\n> committed captures were taken under that constraint and widening it without re-running against\n> a target would describe a run that never happened.\n\n**2. The voicemail reading drops a mailbox and nothing says so — medium.** The live target's own\ntrailer said **4 voicemail users configured**; the reading produced **3**, and the Voicemail\nscreen renders exactly those three. The missing row is the shipped sample's\n`myaliases  1234@devices`, whose mailbox overruns the five-character field of a fixed-width\ntable. `parseVoicemailUsers` drops such a row deliberately — misassigning its columns would be\nworse — and says so in its own comment. What is missing is that the parser hands back a `total`\nbeside the list and `readings.ts` never reads it, so an incomplete list is indistinguishable from\na complete one. `parseManagerUsers` carries the same `total` beside the same kind of list into\nthe same screen.\n\nThis is also why the fixture's voicemail context is `dingvm` and not `ding-live-probe-vm`: an\neighteen-character context would have added a mailbox the reading could not see, and the fixture\nwould have proved nothing about parsing a new row.\n\n<<<<<<< HEAD\n> **Repaired since this run, in a change of its own.** `parseVoicemailUsers` now hands back\n> `dropped` beside `users` and `total` -- every data line it refused, verbatim -- and both screens\n> read the count they were throwing away. The Voicemail screen says *1 of the 4 voicemail users\n> on this target is missing from this table*, names the mechanism, and quotes the line it could\n> not read; the AMI screen says the same about `manager show users` from its trailer alone,\n> because that parser cannot name the line it lost and the count is the whole honest signal it\n> has. A reading that never answered now names itself too, on both screens: each edits a\n> configuration file, so `note()` returns from its configuration branch and never reaches the\n> reading-failure report at the bottom of it, leaving an empty table whose only sentence was\n> about the file. The AMI screen acquired that same shape the day it was given a real\n> `manager.conf` to read, which is why both of its commands are checked rather than only the one\n> this item named. Nine render tests in `tests/ui/dropped-rows-wired.test.tsx` read those\n> sentences out of the real `App`'s markup rather than out of the note builder, because a value\n> computed and never rendered is exactly the defect being repaired.\n>\n> **The parse half of the ledger beside this article moved, and how it moved is worth stating.**\n> Adding a field to what `parseVoicemailUsers` returns changes the canonical JSON it hashes to,\n> so `--check` went red on both phases -- correctly: the recorded hash no longer described what\n> the parser produced. It was re-derived from the *same committed captures* by a new `--reparse`\n> mode rather than by editing four hashes into JSON by hand. `--reparse` touches only what a\n> parser decides (`parsedSha256`, `rows`, `summary`, `threw`), prints every field it moves, and\n> refuses to write at all when a capture no longer hashes to what the ledger recorded, so it\n> cannot launder an altered capture into a fresh-looking record. Four fields moved: two hashes\n> and two summaries, each gaining the `myaliases  1234@devices` line. **No capture was retaken\n> and no live-half field was touched** -- the commit, the exchange, the fixture, the restore and\n> every production-reader result are exactly as that run recorded them, and a test asserts it.\n>\n> The finding above is left as it was written, because it is what this run measured and the run\n> is not being re-taken. Two things this repair does **not** claim: nothing here ran against a\n> live Asterisk, so it is proved against the committed captures, fixtures and render tests and no\n> further; and the note reports a shortfall against the target's own trailer wherever there is\n> one, so a reading whose target printed no trailer falls back to counting the lines the parser\n> refused -- the best estimate available rather than the same measurement.\n=======\n> **Repaired since this run, in a change of its own.** The Voicemail screen now reads that\n> `total` and compares it against how many rows actually made it into `users`; when they\n> disagree it says exactly how many mailbox rows the target reported that this reading could not\n> safely place into columns, rather than rendering a short table with no sign anything is\n> missing. `parseVoicemailUsers` itself is untouched — `total` was already part of its return\n> value, this pass only started reading it — so the change needed no fresh live capture: it does\n> not move what `--check` re-derives from the committed bytes above, and `dropped` was\n> deliberately **not** added as a new field on the parser for the same reason. Held by\n> `tests/ui/voicemail-dropped-wired.test.tsx`, rendering the real screen against a reading whose\n> `total` and row count disagree.\n>\n> The finding above is left as it was written, because it is what this run measured and the run\n> is not being re-taken.\n>>>>>>> origin/w2-reading-honesty\n\n**3. `media cache show` is allowlisted without the argument it needs — medium.** The live target\nanswered `Usage: media cache show <uri>` with exit code 0. `AsteriskReadings` diverts only on\n`No such command` and `Unable to connect to remote asterisk`, so a usage line reaches the CLI\nscreen as a successful reading. No parser consumes this command today, so nothing is currently\nmis-parsed; what is wrong is that the allowlist carries a line that can never produce one.\n\n<<<<<<< HEAD\n> **Repaired since this run, in a change of its own, and the fix was neither of the two the\n> roadmap offered.** The entry was not a command missing an argument; it was the *wrong command*.\n> `main/media_cache.c` registers two CLI entries whose names are prefixes of one another: line 528\n> is the singular `media cache show`, which refuses any `a->argc != 4` and reads its subject from\n> `a->argv[3]`, and line 477 is `media cache show all`, the container listing that takes no\n> argument at all. The allowlist wanted the container and carried the singular. It now carries\n> `media cache show all`, `parseMediaCacheItems` reads it, the dispatcher takes it for the `moh`\n> view beside the classes, and the Music on Hold screen says what is in the cache — or that it is\n> empty, which is a different fact from unread and had to be sayable separately.\n>\n> **The singular is deliberately not a second object command.** It would fit the mechanism, and it\n> prints per-item metadata (`ext`, `content-type`, `__actual_expires`) the listing does not. It is\n> left out because its object id is a URI: `OBJECT_ID` admits no `:` and no `/`, and widening the\n> one check between a target-supplied string and an `asterisk -rx` argument, for metadata no screen\n> displays, is a bad trade. A test fails if that decision is ever reversed quietly.\n>\n> **It has its own live captures rather than being backdated into this run.** The command was run\n> against the same disposable exchange through `LocalAsteriskCliGateway` over\n> `NodeProcessExecutor`, empty and populated, and the cache was put back — recorded in\n> `commandsAllowlistedAfterThisRun`, which is checked exactly as a phase capture is (a committed\n> file, a hash that still matches, a parse that still digests the same) and additionally refuses a\n> row for a command the allowlist no longer carries. **Nothing in the phases, the fixture, the\n> restore or the production-reader records moved**, because those bytes came from a different run\n> against a different exchange state, and merging the two would describe a run that never happened.\n>\n> Populating it needed the target to *fetch* something: the media cache holds what Asterisk\n> retrieved at run time, so no configuration file can fill it, and `media cache create` is not a\n> route either — it needs the scheme backend to implement a create wizard, and\n> `res_http_media_cache` implements only retrieval, so it answers `Unable to create`. The harness\n> serves one file over loopback HTTP and asks the target to refresh two URIs, one inside the\n> format's 40-column pad and one well past it, which is what proves the parser rather than asserts\n> it: `%-40s` has no precision, so it pads and never truncates, and the long URI arrives in full\n> with no padding beside a short one padded out to 40.\n>\n> **Two things this repair found that are worth more than the repair.** The first\n> `--capture-added` run wrote three byte-identical captures of an empty listing and **passed its\n> own restore proof**, because after-restore trivially equals before-populate when the populate did\n> nothing at all. The cause was that `$name` does not survive the trip to the target: something\n> between `spawn` (with `shell: false`) and the Linux side of `wsl.exe` expands a `$`-sigil\n> identifier and replaces it with nothing, even inside a quoted heredoc — `my $body = 1; my $fh;\n> local $/;` arrives as `my  = 1; my ; local $/;`, with `$/` surviving only because it is not an\n> identifier. Nothing reports it: the file is written, the shell exits 0, and the failure surfaces\n> later as a perl syntax error nobody is looking at. The payload is base64 now, which has no `$` in\n> it for any layer to find. And the harness refuses a populate that changed nothing, because a\n> proof whose condition cannot be violated is not a proof.\n>\n> The finding above is left as it was written, because it is what this run measured and the run is\n> not being re-taken.\n\nAll three are recorded on the roadmap. None is repaired here: this pass verifies readings, and\nclosing a write-path or screen defect inside it would be a change nobody reviewing this item\nwould be looking for.\n=======\n> **Repaired since this run, in a change of its own.** `media cache show` is removed from\n> `READ_ONLY_COMMANDS`. The real no-argument command is a different, four-word one --\n> `media cache show all` (`main/media_cache.c` `media_cache_handle_show_all`) -- and it is\n> deliberately **not** added in its place: doing that would be a new allowlisted reading this\n> pass has not actually run against a live target, and the `--check` coverage rule two sections\n> up (\"a command added to the allowlist after this ran is a command nothing has ever run against\n> a target\") exists precisely to catch that. Nothing consumed `media cache show` -- this pass's\n> own capture ledger records it, and confirmed no parser or reading referenced it -- so removing\n> it costs no screen anything it had.\n>\n> The finding above is left as it was written, because it is what this run measured and the run\n> is not being re-taken.\n\nAll three findings were repaired in a change of its own, after this run. That change did not\nre-take the live pass -- it kept every currently-verified reading's parsed shape exactly as this\nrun captured it, which is what let it repair the voicemail and media-cache findings without a\nfresh capture.\n>>>>>>> origin/w2-reading-honesty\n\n## One thing worth knowing about `dialplan show`\n\nThe baseline `dialplan show` disagreed with `/etc/asterisk/extensions.conf` as it stood on the\ntarget. The file contained `[dundi-e164]` at line 287, `[iax2-trunk]` at 306 and `[trunkint]` at\n318; the running Asterisk had none of them, because it had not reloaded `pbx_config` since an\nearlier session restored that file. The harness reload brought the two into agreement, which is\nwhy `dialplan show` is the one command still differing after the restore — the file is identical,\nand it is the *loaded state* that moved.\n\nThat is a fact about readings in general and not about this run: **`dialplan show` reads what is\nloaded, not what is on disk**, and the console cannot presently tell an operator when the two have\ndiverged. The baseline capture is a genuine reading of a dialplan that no configuration file on\nthat target described.\n\n> **Repaired since this run, in a change of its own.** The canvas screen now compares the two:\n> `contextsMissingFromLoadedDialplan` (`app/renderer/src/canvas.ts`) checks every context name\n> `extensions.conf` declares against the contexts the loaded dialplan graph actually has\n> extensions under, and names the ones that are only in the file. Exactly the shape this run\n> measured: `[dundi-e164]`, `[iax2-trunk]` and `[trunkint]` would each have been reported, had\n> the file and the loaded dialplan still disagreed by the time an operator looked. It compares\n> only the direction a reading can prove without guessing -- a context declared but with no\n> loaded extension, never the reverse -- and says so in its own comment rather than overclaiming\n> what the comparison can rule out. `parseDialplanGraph`'s own return shape is untouched, so this\n> also needed no fresh live capture and does not move what `--check` re-derives above.\n>\n> Fixed alongside it: the canvas screen's status note was separately stuck reporting \"Reading…\"\n> forever, regardless of what `dialplan show` actually answered. `canvas` declares\n> `file: 'extensions.conf'` like a configuration-editing screen, which routed it into the note\n> logic that reports what `this.configs[screen]` holds -- but canvas has no bound controls\n> (`groups: []`) and that field is never populated for it, so the branch always returned its own\n> \"Reading…\" fallback and the canvas-specific reason below it was unreachable. Without that fix\n> the divergence sentence above, and every dialplan-read failure reason, would have been silently\n> discarded before reaching the screen.\n>\n> Held by `tests/ui/canvas.test.tsx` (the comparison itself, including the exact three contexts\n> above) and `tests/ui/canvas-divergence-wired.test.tsx` (rendering the real screen, including the\n> \"Reading…\" regression). The finding above is left as it was written, because it is what this\n> run measured and the run is not being re-taken.\n\n## Capture records\n\n| State | Record | Run from commit | Coverage | Result |\n| --- | --- | --- | --- | --- |\n| Every allowlisted command against the exchange as provisioned | `release/evidence/live-exchange/readings/baseline/` and `readings.json` at `phases.baseline.commands` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 64 command lines, one capture each | 52 returned data, 11 are not built into this target, 1 answered with a usage line |\n| Every reading parsed from those exact bytes | `readings.json` at `phases.baseline.readings` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 27 of 27 readings | 26 parsed; `endpointDetail` threw, and the production reader turned that into an honest `unavailable` in the target's own words |\n| Every gateway-backed reader driven as a screen calls it | `readings.json` at `phases.baseline.productionReaders` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 14 of 14 readers | 13 `available`, 1 `unavailable` naming the endpoint that did not exist yet |\n| The fixture written through the console's own transaction path | `readings.json` at `fixture` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 7 resources, 35 backup/stage/validate/apply/post-read actions | `applied`, \"Configuration applied and verified\" |\n| Every allowlisted command against the populated exchange | `release/evidence/live-exchange/readings/populated/` and `readings.json` at `phases.populated.commands` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 64 command lines; 16 changed and were captured again, 48 recorded `sameAsBaseline` | 23 of 27 readings returned real rows |\n| Every gateway-backed reader against the populated exchange | `readings.json` at `phases.populated.productionReaders` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 14 of 14 readers | 14 of 14 `available` |\n| The exchange put back | `readings.json` at `restore` | `c84e959ef7566367d2e7ee6e33b2b87ee0d63923` | 7 resources hashed on the target before and after | all 7 byte-identical; 4 commands still differ and every one has a recorded reason |\n\n## Capture method\n\nEvery command was run by `LocalAsteriskCliGateway` over `NodeProcessExecutor` — the production\nread path, imported from `control-plane/`, not a re-implementation of it — against the\n`ding-pbx-console` WSL2 distribution the console provisions from its own bundled root filesystem.\nEvery stdout is committed exactly as the console received it, which means after the executor's own\nredaction: a capture is what the console sees rather than what Asterisk printed, and\n`redactedMarkers` counts each place that mattered.\n\nThe fixture went through `StructuredConfigPlanner` → `ConfigTransaction` → `WslConfigTransport`,\nso it is the console writing to the exchange rather than a shell heredoc. The one command that is\n**not** a production path is `asterisk -rx \"core reload\"`: the control plane has no reload action,\nwhich is a recorded roadmap gap, so the harness issues it directly and the ledger says so.\n\nRe-run the live half with `npx tsx console/scripts/live-readings.mjs --capture`. Re-derive the\nparse half from committed bytes, on any machine and against no target, with\n`npx tsx console/scripts/live-readings.mjs --check`, which `npm test` runs.\n\nThe captures are pinned to LF in `.gitattributes`. Without that, `core.autocrlf=true` would check\nthem out as CRLF on a fresh Windows clone, changing every recorded hash and shifting every\nfixed-width column the voicemail and IAX2 parsers slice by — a red gate with nothing wrong with\nthe evidence, and no way for a reader to tell that from tampering. Proven by deleting the capture\ndirectory, checking it out again, and re-running `--check`: zero carriage returns, still green.\n\n## Verification boundary\n\n`--check` re-derives the **parse** half. It reads every committed capture back, re-hashes it,\nre-runs the production parser over it, and requires the canonical JSON to hash to exactly what was\nrecorded — so a parser that moves after a capture turns the suite red rather than leaving a stale\nclaim standing. It requires every allowlisted command to have a record, so a command added later\ncannot be silently unverified while the ledger goes on saying all 63 were covered. And it\nre-derives the ledger's headline counts from the ledger's own rows, so a count that stopped\nmatching its rows cannot keep reading as a verification.\n\nIt **cannot** re-derive the gateway, the executor, the reload or the restore. Those ran once,\nagainst one exchange, at one moment.\n\nFour readings were never exercised with rows, because no configuration file can create what they\nread: a live channel, a per-channel codec statistic, a *running* conference, or a connected REST\napplication. Their zeroes are the target being truthful and are labelled as such rather than left\nunexplained.\n\nNothing here writes to an exchange anybody depends on. The target is one this console created and\nmay destroy, and a write to a production exchange needs an authorization only the repository owner\ncan give — still open on the roadmap.\n\nOne safety property this happens to have measured rather than assumed. The fixture configured a\nreal `password=` on a PJSIP auth object and a real `secret=` on a manager user, and **that value\nappears in none of the 80 committed captures**, from any of the 64 command lines, in either phase.\nThe console's claim that its read-only allowlist prints no credential — the reason `pjsip show\nauth <id>` is kept out of it while `pjsip show auths` is in — now has a live exchange behind it\nrather than only a reading of Asterisk's sources. The executor's redactor fired zero times across\nthe whole run, so nothing was hidden on the way past either.\n\nThree defects were found and none was repaired here. This pass verifies readings; closing a\nwrite-path or screen defect inside it would be a change nobody reviewing this item would be\nlooking for.\n\n## Guards\n\n`tests/live/live-readings.test.mjs` (26 tests) and `scripts/negative-live-readings.mjs`\n(12 breaks, each planted alone, each watched go red, each restored green).\n\nThe five tests added after this run guard `--reparse`, the mode that re-derives the parse half\nfrom the committed captures: that it is a no-op against a ledger already matching its bytes, that\nit repairs a hand-damaged hash and names exactly what it moved, that it refuses to write when a\ncapture no longer hashes to what was recorded, that it leaves every live-half field alone, and\nthat the ledger still names the exact voicemail line the reading could not turn into a row.\n`scripts/negative-dropped-rows.mjs` holds the repair those describe with 18 further breaks, two\nof them aimed at `--reparse` itself.\n\nThe media cache repair adds `tests/control-plane/media-cache.test.ts` (12 tests, run against the\ncommitted live captures rather than against fixtures), `tests/ui/media-cache-wired.test.tsx` (7,\nwhich render the real `App` on the Music on Hold screen and read the sentence out of its markup,\nbecause a reading computed and never rendered is exactly the defect being repaired),\n`tests/live/live-readings-added.test.mjs` (13, mostly refusals — a mechanism that satisfies a\ncoverage check is a mechanism that can become a hole in it), and\n`scripts/negative-media-cache.mjs` with 18 further breaks, each planted alone, each watched go\nred, each restored green.\n\n`tests/scripts/test-suites-are-wired.test.mjs` gained an assertion of its own at the same time,\none layer over all of these: every `scripts/negative-*.mjs` must actually appear in the `npm test`\nchain. It is derived from the filesystem for the same reason its neighbour is — a hand-written\nlist cannot catch a script that was never added to the list, which is the exact failure it exists\nto stop. Proved by unchaining the new script and watching it name it.\n\nTwo of those eighteen stayed green when first planted, and both found something real rather than\nmerely needing rewording.\n\nThe first made the AMI screen claim a shortfall for a reading that had failed, and nothing went\nred, because `note()` returned the failure before the shortfall could be reached: the break was\nunreachable rather than unwatched. **The property genuinely unguarded was the one beside it** --\na screen fed by two commands, one failing while the other comes back a row light, reported\nwhichever sentence came first and dropped the other. Both are said now.\n\nThe second stayed green because of the assertion rather than the code. Three negative needles\nread `missing from this table`, and once a failed reading had a sentence of its own that phrase\nbelonged to both, so the needle could no longer fail for the reason it was written for. Tightened\nto `on this target is missing from this table`, it then missed a *plural* fabricated claim, since\nthat phrase inflects. All three are anchored on the uninflected `<unit>s on this target` now.\n**A negative assertion whose needle drifted onto neighbouring prose is the quietest kind of dead\nguard there is**, and only planting the exact lie it was written to catch shows it up.\n\nTwo of those twelve had to be rewritten, and the reason is worth recording. Commenting out\n`if (!recorded.has(command))` inside the coverage check left everything green — not because\nnothing watches that line, but because every command *did* have a capture, so the condition it\nguards was not violated and there was nothing to find. **A break that removes a guard whose\ncondition currently holds can never go red, and it reads exactly like a guard that is watched.**\nBoth were rewritten to violate the condition instead — a ledger missing a command, and a recorded\nhash that no longer matches the bytes on disk — and both then went red.\n\n## Suggested articles\n\n- [The first approved write plan against a live exchange](../../release/evidence/live-exchange/write-plan.json) — the pass that proved the write path this fixture rides on, and the two defects it found.\n- [What `statusCell`'s remaining pixels are](statuscell-text-pixels.md) — the same discipline applied to a rendered frame rather than to a reading.\n- [The per-destination Material Design 3 audit](design-parity-material-audit.md) — the other place a machine is allowed to write a verdict, and what constrains it.\n"
    },
    {
      "id": "evidence/statuscell-text-pixels",
      "category": "evidence",
      "title": "Where the mode picker's half pixel enters",
      "headings": [
        {
          "title": "The question changed under the item that asked it",
          "id": "the-question-changed-under-the-item-that-asked-it"
        },
        {
          "title": "Where the 555 pixels are",
          "id": "where-the-555-pixels-are"
        },
        {
          "title": "The cause",
          "id": "the-cause"
        },
        {
          "title": "And the offset is a consequence of that, not a second fault",
          "id": "and-the-offset-is-a-consequence-of-that-not-a-second-fault"
        },
        {
          "title": "The demonstration, and why it needs no browser to re-check",
          "id": "the-demonstration-and-why-it-needs-no-browser-to-re-check"
        },
        {
          "title": "Two hypotheses this falsified",
          "id": "two-hypotheses-this-falsified"
        },
        {
          "title": "What this does not claim",
          "id": "what-this-does-not-claim"
        },
        {
          "title": "Capture records",
          "id": "capture-records"
        },
        {
          "title": "Capture method",
          "id": "capture-method"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        },
        {
          "title": "Guards",
          "id": "guards"
        }
      ],
      "links": [
        "design-parity-chrome-bar.md",
        "design-parity-material-audit.md"
      ],
      "body": "# Where the mode picker's half pixel enters\n\nThe last measured divergence inside `statusCell`, traced to its cause.\n\n## The question changed under the item that asked it\n\nThe roadmap asked where a **half-pixel box offset** came from. On every one of the 32 audited\ndestinations the built side appeared to draw the Beginner/Expert picker's 1px border split across\ntwo rows, at `rgb(24,31,25)` and `rgb(40,52,45)`, where the design drew it crisp on one row at\n`rgb(65,73,66)`. Both sides reported a 40px top strip and a 28px picker, `(40 − 28) / 2` is an\ninteger, and so the offset appeared to have nowhere to come from.\n\n**That symptom is gone, and it never belonged to either artifact.** It was a property of comparing\ntwo browsers: the reference used to be photographed under headless Edge while the built side ran\nunder Electron. When both sides were retaken under one browser it disappeared, and the picker's\nborder rows are now byte-for-byte identical between the two captures.\n\nWhat survived is **555 differing pixels inside `statusCell`, the same count on all 32\ndestinations**, entirely in the text band. This article is about those.\n\n## Where the 555 pixels are\n\nThree column runs, and each one lands on exactly one piece of text:\n\n| Columns | Pixels | What it is |\n| --- | --- | --- |\n| 1088–1098 | 31 | the active button's Material Symbols `check` glyph |\n| 1106–1154 | 329 | the active button's `Beginner` label |\n| 1180–1214 | 195 | the inactive button's `Expert` label |\n\nEverything else in the cell is byte-for-byte identical: the confirmation-credits pill including its\nown Roboto digit and its `confirmation_number` glyph, the command-palette `search` glyph, all three\nwindow-control glyphs, and **every box edge**, including the picker's own 1px border and the\nboundary between its two halves.\n\n## The cause\n\n**The built application draws the inactive mode button one weight step heavier than the design\ndoes.**\n\nNothing in the markup says so. The button declares `font:inherit` and no weight of its own, on both\nsides. The weight arrives from somewhere else entirely: `App.tsx`'s appearance system writes its own\ndefault `font-weight` onto the shell root at startup,\n\n```\nweight: str('ap_weight', '500')            // currentAppearanceValues\nroot.style.setProperty('font-weight', weightVal)   // applyAppearanceToDom\n```\n\nso every element in the application that inherits its weight renders at 500. The design declares\nthe *same* 500 default for the *same* control, but feeds it only to the Appearance screen's own\npreview swatch; nothing writes it to the root.\n\n`Expert` is the only text in this cell that inherits its weight. The active button, the credits pill\nand every icon set their own, which is why they are all identical.\n\n## And the offset is a consequence of that, not a second fault\n\nMeasured on the real render, at the capture tuple's own metrics:\n\n| | as designed | with the appearance defaults | change |\n| --- | --- | --- | --- |\n| `Expert` label width | 34.171875 | 34.53125 | **+0.359375** |\n| picker left edge | 1072.09375 | 1071.734375 | **−0.359375** |\n| picker right edge | 1228.171875 | 1228.171875 | 0 |\n| `check` glyph left | 1086.09375 | 1085.734375 | **−0.359375** |\n| `Beginner` label left | 1106.09375 | 1105.734375 | **−0.359375** |\n| `Expert` label left | 1180 | 1179.640625 | **−0.359375** |\n| credits pill left | 1236.171875 | 1236.171875 | 0 |\n\nAt weight 500 the `Expert` label measures 0.359375px wider, so the picker measures 0.359375px wider.\nThe status group is packed against the right edge of the strip, so the picker's **right** edge is\npinned and its **left** edge moves, taking the check glyph and both labels with it. The credits\npill, which sits outside the picker, does not move at all. That is why its Roboto digit is identical\nwhile `Beginner`, which has the same family, the same size, the same weight and the same declared\ncolours, is not.\n\n**And this is why the offset looked like it had no source.** Every one of those rectangles still\nrounds to the same painted device pixel: 1072.09375 and 1071.734375 both paint at 1072, and the\ninternal boundary at 1167 and 1166.640625 both paint at 1167. Chromium snaps a painted box to whole\ndevice pixels and positions text at sub-pixel precision, so a sub-pixel layout difference is\ninvisible in the geometry and visible only in the glyphs. Reading the boxes could never have found\nthis.\n\nSo the half pixel is a third of a pixel, it is a font weight rather than a box offset, and it enters\nthrough a default nobody chose in the design.\n\n## The demonstration, and why it needs no browser to re-check\n\n`console/scripts/design-parity-statuscell-text.mjs --reproduce` renders the checked-in design as the\ntop-level document and photographs it twice: once as it stands, and once with the four declarations\n`applyAppearanceToDom` writes applied to its shell root. Both frames are committed under\n`console/release/captures/parity/statuscell-text/`.\n\n`--check` reads them back off disk and re-derives the whole claim:\n\n```\nstatusCell across 32 destination(s): 555 differing pixel(s)\nas-designed vs committed reference: 0\nappearance defaults applied vs committed built: 0\nappearance defaults applied vs committed reference: 555\n```\n\nThe design as it stands reproduces the committed **reference** capture exactly. The design with the\nappearance system's own defaults reproduces the committed **built** capture exactly. Both to zero\ndiffering pixels, from committed bytes, with nothing running.\n\n## Two hypotheses this falsified\n\nRecorded because they are the obvious ones and both are wrong, so nobody pays for them twice.\n\n**The capture harness's wrapper.** The reference is photographed through an `<iframe>` inside a\n`transform: scale(1)` wrapper and the built side is not, which is exactly the shape of thing that\nmoves text by fractions. Rendering the same design both ways in one session, one browser, one\nsitting: **zero** differing pixels in this cell. The wrapper contributes nothing.\n\n**The DOM shape.** The design's runtime wraps every interpolated value in a\n`<span class=\"sc-interp\">`; the compiled renderer emits a bare text node in the same flex container.\nReplacing the spans with text nodes changes no rectangle and no pixel.\n\n## What this does not claim\n\n- **Nothing is repaired.** The default is still 500 and the built application still renders every\n  inheriting weight one step heavier than the design draws it. Changing it would move type across\n  every screen and invalidate all 64 committed captures, which is a product decision rather than\n  a measurement, and it is not made here.\n- **This measures `statusCell`.** The same root declaration reaches every inheriting weight in the\n  frame, and `applyAppearanceToDom` writes three more declarations beside it: a colour, a family\n  and a size. How much of the divergence in the other seven areas they account for is not measured\n  here, and the guess that it is \"most of it\" is a guess.\n- **No destination moved to `verified`.** All 32 still report a real chrome divergence and the\n  Material Design 3 audit still reports all 32 nonconforming.\n\n## Capture records\n\n| State | Record | Run from commit | Coverage | Result |\n| --- | --- | --- | --- | --- |\n| The design as it stands, top-level document | `release/captures/parity/statuscell-text/dash-design-as-designed.png` | `563618c1bf799c0ea1f9c55f7e6b879955300d09` | one frame, 1440x1000 | identical to the committed reference capture inside `statusCell`, 0 differing pixels |\n| The design with the appearance system's defaults on its shell root | `release/captures/parity/statuscell-text/dash-design-with-appearance-defaults.png` | `563618c1bf799c0ea1f9c55f7e6b879955300d09` | one frame, 1440x1000 | identical to the committed built capture inside `statusCell`, 0 differing pixels |\n| Sub-pixel rectangles for both states | `release/evidence/parity/statuscell-text.json` at `measurements` | `563618c1bf799c0ea1f9c55f7e6b879955300d09` | 7 rectangles per state, plus computed weights | everything inside the picker moves left by 0.359375px; the credits pill does not move |\n| Localisation across the audited set | `release/evidence/parity/statuscell-text.json` at `columnRuns` | `563618c1bf799c0ea1f9c55f7e6b879955300d09` | 32 of 32 audited destinations | 555 differing pixels each, in the same three column runs |\n| The destination captures this was measured against | `release/captures/parity/{id}-reference.png` and `{id}-built.png` | `a2dd99c0fd28341fbdbd8f38e56a3fdada64fcfc` | 32 per side | not retaken here; they are the frames the axis-pin run took |\n\n## Capture method\n\nBoth reproduction frames come from one Electron window on an off-screen Windows desktop, driven\nover its own loopback debugging port, in one sitting, with the second frame taken from the same\npage as the first after four inline declarations were applied to its shell root. The design is\nserved by `console/scripts/design-parity-server.mjs` and loaded as the **top-level document**\nrather than through the capture harness's `index.html`, because rendering it both ways is what\nproved the harness's wrapper contributes nothing here.\n\nEvery outbound request is intercepted. The design's own helmet asks Google Fonts for the exact\nstylesheet `console/assets/fonts` was downloaded from; that request is answered from the local\ncopy with its URLs rewritten to the local faces, the capture server's own origin is allowed\nthrough, and everything else is refused and counted. The recorded run refused nothing, because\nnothing else was asked for: `{\"server\":17,\"font-stylesheet\":2,\"font-face\":0,\"blocked\":0}`.\n\nThe 32-destination localisation is not a capture at all. It is arithmetic over the reference and\nbuilt PNGs already committed, and it runs with no browser.\n\n## Verification boundary\n\n- **The frames are of the design, not of the application.** The claim is that the design plus one\n  root declaration reproduces the built capture, not that the built application was re-photographed.\n  It was not; the destination captures are the ones the axis-pin run took, at the commit named\n  above.\n- **Zero differing pixels is claimed for `statusCell` only.** Outside that rectangle the\n  appearance-defaults frame is the design with a colour, a family and a size changed on its root,\n  and it is not compared to anything.\n- **The cause is identified by reproduction and by reading the source, not by inspecting the\n  running application's computed styles.** `App.tsx`'s two lines are named and anchored so that a\n  repair makes this record fail rather than go quietly stale, but no measurement here was taken\n  from inside the built renderer.\n- **Nothing was repaired**, so this record describes a divergence that is still present.\n\n## Suggested articles\n\n- [The chrome-parity bar](design-parity-chrome-bar.md), which declares the `statusCell` rectangle\n  these 555 pixels are counted inside, and why the bar's tolerance is exactly zero.\n- [The Material Design 3 conformance audit](design-parity-material-audit.md), the second\n  prerequisite a design-parity row has to meet, which this finding does not move.\n\n## Guards\n\n`node scripts/design-parity-statuscell-text.mjs --check` and `node scripts/negative-statuscell-text.mjs`\nrun in `npm run test:inventories`; `tests/scripts/statuscell-text.test.mjs` runs in\n`npm run test:scripts`.\n\nThe negative regression plants eight lies one at a time against the real committed evidence: a\nwrong pixel count, wrong column runs, either frame swapped for the wrong capture, either artifact\ndeleted, and each of the two `App.tsx` anchors moved. Every one must turn the check red before the\nuntouched evidence turns it green. The two source anchors are deliberate: if somebody repairs\nthe default, this evidence becomes stale and says so instead of quietly describing a state that no\nlonger exists.\n"
    },
    {
      "id": "installer-iso",
      "category": "installer-iso.md",
      "title": "The Ding PBX installer ISO",
      "headings": [
        {
          "title": "What it is",
          "id": "what-it-is"
        },
        {
          "title": "Architecture",
          "id": "architecture"
        },
        {
          "title": "What happens on the target machine",
          "id": "what-happens-on-the-target-machine"
        },
        {
          "title": "First-boot credential flow",
          "id": "first-boot-credential-flow"
        },
        {
          "title": "Requirements",
          "id": "requirements"
        },
        {
          "title": "How to boot and install it",
          "id": "how-to-boot-and-install-it"
        },
        {
          "title": "Verifying the download",
          "id": "verifying-the-download"
        },
        {
          "title": "Honest security posture",
          "id": "honest-security-posture"
        },
        {
          "title": "Building it in CI",
          "id": "building-it-in-ci"
        },
        {
          "title": "Verification state",
          "id": "verification-state"
        }
      ],
      "links": [],
      "body": "# The Ding PBX installer ISO\n\n## What it is\n\nA bootable, unattended-install ISO that turns a bare machine (or VM) into a working Ding PBX\nserver, the same way a FreePBX distro ISO does. Boot it, walk away, and when it reboots itself\nthere is a running Asterisk and a Ding PBX Console admin surface reachable from a browser on the\nlocal network — with no default password of any kind.\n\nIt is built by `build-iso.bat` at the repository root (`console/scripts/build-iso.ps1`), following\nthe same reproducibility discipline as the WSL Asterisk bundle: a base image pinned by digest,\nAsterisk compiled from the exact repository commit, every download verified against a recorded\nSHA-256 before it is trusted, and a provenance record written beside the finished artifact.\n\n## Architecture\n\nThe build has three stages, each a separate Docker stage or image so a failure in one is easy to\nisolate:\n\n1. **`iso-payload.Dockerfile`** compiles Asterisk from source (the same recipe as\n   `asterisk-wsl-runtime.Dockerfile`), builds the Ding PBX Console server (`npm ci && npm run\n   build` against `console/`), and downloads a portable Linux Node.js runtime verified by SHA-256.\n   These three pieces — Asterisk, the console server, and Node — are assembled into one payload\n   directory with an `install-target.sh` script and systemd units.\n2. **`iso-respin.Dockerfile`** downloads the official Ubuntu 24.04 LTS Server ISO, verified against\n   a pinned SHA-256 before anything touches it, extracts it, drops in the payload plus an\n   `autoinstall` (Subiquity cloud-init) answer file at `/server/`, points the bootloader at\n   `autoinstall ds=nocloud;s=/cdrom/server/`, and repacks a hybrid BIOS+UEFI-bootable ISO with\n   `xorriso`.\n3. **`build-iso.ps1`** orchestrates both stages from Windows (Docker's Linux engine does the actual\n   work, since Windows cannot compile the Linux payload or produce an ISO 9660 image natively),\n   exports and verifies the result, and writes `console/release/iso/ding-pbx-installer.iso.json`\n   with the source commit, base image and Node digests, and the finished ISO's own SHA-256.\n\n## What happens on the target machine\n\nBooting the ISO runs Ubuntu's ordinary Subiquity installer with no prompts: it partitions the\ndisk, installs the base OS, then autoinstall's `late-commands` step runs `install-target.sh`\n(inside the newly installed system, via `curtin in-target`), which:\n\n- installs the bundled Node.js runtime to `/usr/local/lib/ding-pbx-node`\n- installs the compiled Asterisk tree and enables `asterisk.service`\n- installs the Ding PBX Console server under `/opt/ding-pbx-console` (reusing\n  `console/server/deploy/install.sh` unmodified) and enables `ding-pbx-console.service`, bound to\n  `0.0.0.0:8443` so it is reachable from the LAN rather than loopback-only\n- installs a first-boot banner unit that writes the machine's current LAN address into\n  `/etc/issue`, so whoever is at the console sees exactly where to point a browser\n\n## First-boot credential flow\n\n**No credential of any kind is written to the ISO.** The `identity.password` field in the\nautoinstall answer file is the locked sentinel `\"!\"`, which refuses interactive password login for\nthat local Unix account entirely — it exists only so the installer has an account to run under,\nnever as an administrative credential.\n\nThe actual admin account is created by the Ding PBX Console server itself, the first time anyone\nvisits it: `console/server/auth.ts`'s `createAdminAccount` gates every other request behind the\nfirst-run setup screen until an account exists. Whoever reaches the printed LAN address first\ncreates the admin account. Because the service binds to the LAN rather than loopback by default so\nthat an operator can reach it at all, **the operative security boundary during the first-boot\nwindow is the network the machine is plugged into**, not a credential — treat that window (from\nfirst boot until an admin account is created) the way you would treat an unconfigured switch port:\nkeep the machine off an untrusted network, or firewall port 8443 to the operator's own address,\nuntil setup is done.\n\n## Requirements\n\n- A machine or VM with x86-64 hardware, at least 2 vCPU / 2 GiB RAM / 8 GiB disk for a minimal\n  install (Asterisk itself is light; size storage for call recordings and voicemail separately).\n- **Secure Boot must be disabled**, or a custom key enrolled for this ISO. Code signing is\n  permanently out of scope for this project (see the repository's no-signing policy) — the ISO is\n  genuinely unsigned, and a machine enforcing Secure Boot will refuse to boot it. This is stated by\n  the build script's own output and here, rather than left for someone to discover at a boot\n  prompt.\n- Network reachable by DHCP during install (the base OS and package list install from the\n  network unless a local mirror is configured; the Asterisk/Node/console payload itself needs no\n  network, since it is embedded on the ISO).\n\n## How to boot and install it\n\n1. Write `console/release/iso/ding-pbx-installer.iso` to a USB drive (`dd`, Rufus, or Ventoy) or\n   attach it as a VM CD-ROM.\n2. Boot from it. No prompts appear; the machine partitions its disk and installs unattended.\n3. On completion the machine reboots itself into the installed system.\n4. At the console login screen, read the printed address (`Console admin setup: http://<ip>:8443/`)\n   and open it from a browser on the same network.\n5. Create the admin account. From then on the console requires that account's credentials for\n   every request.\n\n## Verifying the download\n\n`console/release/iso/ding-pbx-installer.iso.json` records the exact source commit, the pinned base\nUbuntu ISO URL and SHA-256, the pinned Node.js runtime version and SHA-256, and the finished ISO's\nown SHA-256. Compare that last value against a locally computed digest of the downloaded file\nbefore writing it to a USB drive or booting it in a VM.\n\n## Honest security posture\n\n- The ISO itself is unsigned; Secure Boot refuses it.\n- No credential is embedded anywhere on the ISO or in its build.\n- The admin surface binds to the LAN by default during the first-boot window, before any account\n  exists — see **First-boot credential flow** above for the mitigation.\n- `late-commands`' package list (`packages:` in the autoinstall answer file) is installed from\n  whatever apt sources the target machine reaches at install time; only the Asterisk, Node.js, and\n  Ding PBX Console payload itself is fully offline and reproducible from the ISO's own contents.\n- Building the ISO requires Docker with a working Linux engine; it cannot be produced on a bare\n  Windows host.\n\n## Building it in CI\n\n`.github/workflows/installer-iso.yml` builds this ISO reproducibly on a GitHub-hosted\n`ubuntu-24.04` runner (a Linux Docker engine is required to compile the Linux payload and produce\nan ISO 9660 image, which a Windows host cannot do natively -- Docker ships preinstalled on that\nrunner image, so no separate setup is needed). It runs on `workflow_dispatch`, and automatically\nwhenever a push to `master` touches `console/scripts/iso/**`, `console/scripts/build-iso.ps1`,\n`build-iso.bat`, or the workflow file itself.\n\nIt runs the same three stages as local `build-iso.bat`/`build-iso.ps1` (payload build, ISO respin,\nboot verification), then keeps the same \"not tests, not lint\" discipline as every other workflow in\nthis repository: no test job, no lint job, nothing gates the build. A run either builds, packages,\nand publishes evidence, or it fails outright on the build or verification step itself.\n\n### The 2 GiB release-asset problem\n\nA GitHub release asset is capped at 2 GiB (2,147,483,648 bytes) per file. The ISO this pipeline\nproduces is roughly 3.47 GiB (3,720,878,080 bytes measured against a real build), so it cannot be\nattached to a release as a single file.\n\nThe workflow solves this by splitting the verified ISO into 1900 MiB volumes (`split -b 1900MiB`,\nsafely under the cap) and publishing all of them as release assets, alongside:\n\n- `ding-pbx-installer.iso.sha256` -- the reassembled image's own SHA-256, for a one-line check.\n- `ding-pbx-installer.iso.json` -- full provenance (source commit, base ISO URL/digest, Node\n  runtime version/digest, console build base image digest, ISO byte count and SHA-256, part\n  count, and the same Secure Boot / no-signing statement as the local build).\n- `ding-pbx-installer.iso.REASSEMBLE.md` -- exact reassembly commands for Linux/macOS and Windows,\n  plus the SHA-256 of every individual volume and of the reassembled whole.\n\nTo reassemble and verify a downloaded release:\n\n```sh\ncat ding-pbx-installer.iso.part* > ding-pbx-installer.iso\nsha256sum -c ding-pbx-installer.iso.sha256\n```\n\nOn Windows PowerShell:\n\n```powershell\ncmd /c \"copy /b ding-pbx-installer.iso.part001+ding-pbx-installer.iso.part002+... ding-pbx-installer.iso\"\ncertutil -hashfile ding-pbx-installer.iso SHA256\n```\n\nCompare the resulting digest against the one recorded in `ding-pbx-installer.iso.sha256` and in\n`ding-pbx-installer.iso.json` before writing the ISO to a USB drive or booting it. **Do not boot an\nISO whose reassembled digest does not match.**\n\nThe workflow also uploads the complete, unsplit ISO as an ordinary GitHub Actions workflow\nartifact (a separate, larger size limit than a release asset), for convenience when the run is\nstill fresh -- but workflow artifacts expire (14 days here) and are not a durable distribution\nchannel, so the split release assets are the one to link to for anyone downloading later.\n\n### Boot verification in CI\n\nThe workflow re-checks, on the artifact it actually produced, the exact three properties the local\nbuild and `console/tests/iso/iso-build.test.mjs` already require of the respin recipe: both El\nTorito boot catalog entries present (`BIOS` and `UEFI`), and a real master boot record signature\n(`55aa`) at byte 510, plus the ISO 9660 primary volume descriptor signature (`CD001`) at byte\n32769. These are the properties that distinguish a genuinely bootable image from a valid-looking\nISO 9660 file that cannot boot -- see the long comment above the repack in\n`console/scripts/iso/iso-respin.Dockerfile` for the real incident that made these checks necessary.\n\n### Unsigned, same as the local build\n\nThis ISO is unsigned in CI exactly as it is locally -- code signing is permanently out of scope for\nthis project. The workflow states this in its own release notes and evidence rather than leaving it\nto be discovered at a Secure Boot prompt.\n\n## Verification state\n\nEverything in `console/tests/iso/*.test.mjs` (20 tests) is run without Docker or a real ISO: it\nstatically checks the autoinstall answer file for structural correctness and the absence of any\nembedded credential, checks that `build-iso.ps1` verifies its downloads and the finished artifact\nrather than trusting a green build log, and checks that no code-signing call exists anywhere in the\npipeline. Every one of those checks was proved meaningful by breaking the real file it guards,\nobserving the test go red, and restoring it.\n\n**A full ISO has been built.** 3,720,878,080 bytes, from the packaged Asterisk runtime whose digest\nwas checked against its own manifest first. Its structure was verified rather than assumed: one El\nTorito BIOS entry, one EFI entry, an ISO 9660 primary volume descriptor, and a real master boot\nrecord signature at byte 510. The base Ubuntu image and the Linux Node.js runtime are pinned to\ntheir published SHA-256 values, both verified against the sums their vendors publish, and every\ndownload fails closed rather than accepting a file that does not match.\n\n**Building it found a defect that no other check would have.** The first image produced was a valid\nISO 9660 with entirely correct contents that no machine would boot. The repack followed Ubuntu's own\npublished autoinstall recipe, which names `boot_hybrid.img` for the master boot record; Ubuntu\n24.04.4 does not ship that file. The hybrid repack failed, a fallback repack ran, and the build\nreported success. Every test in the suite passed on that image.\n\nThe fallback is gone — one that quietly drops the single property the artifact exists for is worse\nthan no fallback. The repack now asks the base image to describe its own boot arrangement through\n`xorriso -report_el_torito as_mkisofs` and uses that answer, reading the master boot record and the\nappended EFI partition back out of it by byte interval. That is what the vendor shipped rather than\na reconstruction of it, and it does not go stale when a point release moves a file.\n\n**Still not done: the image has not been booted.** Its structure says it can; only running it proves\nit does. That, and the fact that it is unsigned and Secure Boot will therefore refuse it, are the two\nthings to know before trusting it.\n\nIt was built under WSL rather than a container, because the container engine on the build host would\nnot start. The CI workflow builds it in a container on a Linux runner, which is the reproducible\npath; the local script remains the fallback.\n"
    },
    {
      "id": "media/codecs",
      "category": "media",
      "title": "Codecs & RTP",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../pbx/endpoints.md",
        "confbridge.md",
        "moh.md"
      ],
      "body": "# Codecs & RTP\n\n## Behavior\n\nTranscoding, packetisation and the media port range. Drag the codec list to change preference order globally. It is backed by `codecs.conf · rtp.conf`. It lives on the Media rail, under the Media & voice group: Codecs, RTP, recordings, prompts and conferencing.\n\n## Configuration\n\n### Codec preference\n\nThe order Asterisk offers codecs in an SDP. Drag to reorder — there is no list to type.\n\n- **Global order** (`k_order`) — a order control, default `opus`, `g722`, `ulaw`, `alaw`, `g729`.\n  - *What it is:* The order codecs are offered in an SDP.\n  - *Why it exists:* The far end picks the first one it also speaks, so order is preference.\n  - *Choosing a value:* opus for quality, g722 for wideband on desk phones, ulaw as the universal fallback, g729 only where bandwidth is scarce and you have licences.\n  - *Gotcha:* Putting a narrowband codec first means every call is narrowband, no matter what the phones support.\n- **Allow transcoding** (`k_transcode`) — a switch control, default `true`.\n- **Opus bitrate** (`k_opusbr`) — a slider control, default `24`.\n- **Preferred ptime** (`k_ptime`) — a segmented control, default `20`, choices `10`, `20`, `30`, `40`, `60`.\n\n### RTP\n\nWhere media lands and how it survives a bad network.\n\n- **RTP port range start** (`r_start`) — a slider control, default `10000`.\n  - *What it is:* The lowest UDP port Asterisk will use for media.\n  - *Why it exists:* Firewalls need to know the range to open.\n  - *Choosing a value:* 10000 to 20000 is the usual convention.\n  - *Gotcha:* Two calls need two ports each. A range smaller than four times your busy-hour concurrency will drop calls with no obvious error.\n- **RTP port range end** (`r_end`) — a slider control, default `20000`.\n- **RFC2833 payload** (`r_dtmf`) — a stepper control, default `101`.\n- **strictrtp** (`r_strict`) — a switch control, default `true`.\n- **ICE support** (`r_ice`) — a switch control, default `false`.\n- **DTLS for WebRTC** (`r_dtls`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery control here maps to a real key in codecs.conf · rtp.conf; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. Putting a narrowband codec first means every call is narrowband, no matter what the phones support. Two calls need two ports each. A range smaller than four times your busy-hour concurrency will drop calls with no obvious error.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in codecs.conf · rtp.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Endpoints](../pbx/endpoints.md), [Conferences](confbridge.md), and [Music on hold](moh.md).\n"
    },
    {
      "id": "media/confbridge",
      "category": "media",
      "title": "ConfBridge rooms",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "moh.md",
        "codecs.md",
        "../pbx/canvas.md"
      ],
      "body": "# ConfBridge rooms\n\n## Behavior\n\nBridge profiles, user profiles and menus. Every mixing option is a control; the DTMF menu is edited on the canvas. It is backed by `confbridge.conf`. The rail badge on this destination currently reads `6`. It lives on the Media rail, under the Media & voice group: Codecs, RTP, recordings, prompts and conferencing.\n\n## Configuration\n\n### Mixing\n\nAudio quality and how the bridge combines participants.\n\n- **Internal sample rate** (`c_rate`) — a segmented control, default `48000`, choices `8000`, `16000`, `48000`, `auto`.\n- **Mixing interval** (`c_mixing`) — a segmented control, default `20`, choices `10`, `20`, `40`, `80`.\n- **Video mode** (`c_video`) — a segmented control, default `follow_talker`, choices `none`, `follow_talker`, `last_marked`, `sfu`.\n- **Denoise** (`c_denoise`) — a switch control, default `true`.\n- **Jitter buffer** (`c_jitter`) — a switch control, default `true`.\n- **Talker detection events** (`c_talker`) — a switch control, default `true`.\n\n### Participants\n\nWhat each caller may do once inside.\n\n- **Maximum members** (`c_max`) — a stepper control, default `50`.\n- **Wait for marked user** (`c_marked`) — a switch control, default `true`.\n- **Announce join and leave** (`c_announce`) — a segmented control, default `name`, choices `off`, `tone`, `name`, `count`.\n- **Music while alone** (`c_music`) — a switch control, default `true`.\n- **DTMF menu** (`c_dtmf`) — a select control, default `default_menu`, choices `default_menu`, `admin_menu`, `listen_only`.\n\n## Failure modes and security\n\nEvery row reflects a real object in confbridge.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in confbridge.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Music on hold](moh.md), [Codecs & RTP](codecs.md), and [Dialplan canvas](../pbx/canvas.md).\n"
    },
    {
      "id": "media/moh",
      "category": "media",
      "title": "Music on hold",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "confbridge.md",
        "codecs.md",
        "voicemail.md"
      ],
      "body": "# Music on hold\n\n## Behavior\n\nHold classes and their sources. Files are chosen from a picker; the playlist is reordered by dragging. It is backed by `musiconhold.conf`. The rail badge on this destination currently reads `4`. It lives on the Media rail, under the Media & voice group: Codecs, RTP, recordings, prompts and conferencing.\n\n## Configuration\n\n### Playback\n\nHow each class behaves while somebody waits.\n\n- **Mode** (`h_mode`) — a segmented control, default `files`, choices `files`, `quietmp3`, `ringing`, `custom`.\n- **Playback order** (`h_sort`) — a segmented control, default `random`, choices `alpha`, `random`, `randstart`.\n- **Announcement every** (`h_announce`) — a slider control, default `30`.\n- **Volume trim** (`h_volume`) — a slider control, default `0`.\n\n## Failure modes and security\n\nEvery row reflects a real object in musiconhold.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in musiconhold.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Conferences](confbridge.md), [Codecs & RTP](codecs.md), and [Voicemail](voicemail.md).\n"
    },
    {
      "id": "media/README",
      "category": "media",
      "title": "Media",
      "headings": [],
      "links": [
        "voicemail.md",
        "confbridge.md",
        "moh.md",
        "codecs.md"
      ],
      "body": "# Media\n\nMedia & voice: codecs, RTP, recordings, prompts and conferencing.\n\n- [Voicemail](voicemail.md)\n- [Conferences](confbridge.md)\n- [Music on hold](moh.md)\n- [Codecs & RTP](codecs.md)\n"
    },
    {
      "id": "media/voicemail",
      "category": "media",
      "title": "Voicemail boxes",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../pbx/queues.md",
        "codecs.md",
        "../agent/secrets.md"
      ],
      "body": "# Voicemail boxes\n\n## Behavior\n\nMailboxes, greetings and delivery. Attachment and storage options are switches; nothing about a mailbox needs typing except the owner name. It is backed by `voicemail.conf`. The rail badge on this destination currently reads `18`. It lives on the Media rail, under the Media & voice group: Codecs, RTP, recordings, prompts and conferencing.\n\n## Configuration\n\n### Delivery\n\nWhat happens the moment a message lands.\n\n- **Attach recording to email** (`v_attach`) — a switch control, default `true`.\n- **Delete after emailing** (`v_delete`) — a switch control, default `false`. Careful. On means the only copy of the message is the one in the mailbox of the email server.\n  - *What it is:* Whether the recording is deleted from the PBX once it has been emailed.\n  - *Why it exists:* Mailbox storage on a PBX is finite and messages accumulate forever.\n  - *Choosing a value:* Off keeps a copy on the PBX. On makes email the only copy.\n  - *Gotcha:* If the mail server bounces the message, on means the recording is gone. Verify delivery before enabling it.\n- **Message format** (`v_format`) — a segmented control, default `wav49`, choices `wav`, `wav49`, `gsm`, `ogg`.\n- **Maximum messages** (`v_maxmsg`) — a stepper control, default `100`.\n- **Maximum message length** (`v_maxsecs`) — a slider control, default `180`.\n  - *What it is:* The longest a single voicemail message may be.\n  - *Why it exists:* It bounds storage and stops accidental open-line recordings filling the disk.\n  - *Choosing a value:* 180 seconds is generous for business use.\n  - *Gotcha:* Callers are cut off mid-word with no warning tone unless you also configure one.\n- **Discard shorter than** (`v_minsecs`) — a slider control, default `3`.\n\n### Caller experience\n\nPrompts, review and escape routes.\n\n- **Let caller review** (`v_review`) — a switch control, default `true`.\n- **Zero escapes to operator** (`v_operator`) — a switch control, default `true`.\n- **Play date envelope** (`v_envelope`) — a switch control, default `true`.\n- **Announce caller ID** (`v_saycid`) — a switch control, default `false`.\n\n## Failure modes and security\n\nEvery row reflects a real object in voicemail.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. If the mail server bounces the message, on means the recording is gone. Verify delivery before enabling it. Callers are cut off mid-word with no warning tone unless you also configure one.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in voicemail.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Queues & agents](../pbx/queues.md), [Codecs & RTP](codecs.md), and [Secret intake](../agent/secrets.md).\n"
    },
    {
      "id": "operations/build-and-release",
      "category": "operations",
      "title": "Ding PBX Console operations",
      "headings": [
        {
          "title": "Build and package",
          "id": "build-and-package"
        },
        {
          "title": "The bundled runtime payload",
          "id": "the-bundled-runtime-payload"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Driving the built application",
          "id": "driving-the-built-application"
        },
        {
          "title": "Release",
          "id": "release"
        },
        {
          "title": "Recovery",
          "id": "recovery"
        }
      ],
      "links": [],
      "body": "\n# Ding PBX Console operations\n\nEvery route below was executed in this repository and produced the stated result. Where a\nroute failed, the failure is recorded too, because the failures here are the expensive part.\n\n## Build and package\n\n    build.bat /s              # renderer + main process, ~32s warm\n    build-installer.bat /s    # full Squirrel.Windows set, ~8m\n\n**Invoke by absolute path from automation.** `NoDefaultCurrentDirectoryInExePath` makes\n`cmd /c build.bat` fail with \"is not recognized\" even when the working directory is right\nand the file is plainly there. Use:\n\n    MSYS_NO_PATHCONV=1 cmd /c \"cd /d <repo> && <repo>\\build.bat /s\"\n\nBoth halves matter: without `MSYS_NO_PATHCONV`, the shell rewrites `/s` to a drive path and\nthe build goes interactive.\n\n**Nothing else may touch `node_modules` while these run.** `npm ci` deletes and recreates\nit, so a test run or a live Electron instance holding a file produces `npm ci exited -4048`\n— a file-in-use error that reads like a corrupt install. Stop every Electron process first\nand run the suite and the build one at a time. Two separate failures in one session came\nfrom ignoring this.\n\n## The bundled runtime payload\n\n`console/resources/asterisk-wsl-rootfs.tar` (~315 MB) and its `.json` are **gitignored**;\nthey never enter history. Packaging refuses to reuse a payload whose `sourceCommit` differs\nfrom the commit being released — correct behaviour, not a defect — so a release from a new\ncommit rebuilds it, which needs a working local container engine.\n\nIf the engine is down, packaging fails with *\"Docker is installed but its Linux engine is\nunavailable\"*. Start it without disturbing the visible desktop by launching Docker Desktop\non an off-screen desktop through the cheap headless route, then poll `docker info` until\n`OSType` reports `linux`.\n\n## Verification\n\n    cd console && npm test    # 8 sub-suites, ~3200 assertions\n\nRead the **exit code**, not just the failure count: several gates live outside the test\nrunner (inventory validation, generated-file freshness, negative regressions), so a run can\nreport zero failures and still exit 1. When it does, the cause is in the last twenty lines.\n\nA failure under load is not automatically a regression. Re-run the single file alone before\nconcluding anything — a renderer test failed once in a contended run and passed 28/28 in\nisolation. Equally, a test that fails at exactly the configured timeout timed out; it did\nnot assert anything false.\n\n### Committed generated files\n\nTwo generated files are committed rather than built on demand, and each has a drift check that\ncompares the committed copy against a fresh generation:\n\n| File | Generator | Scratch override | Drift check |\n| --- | --- | --- | --- |\n| `app/renderer/src/generated/*` (the design compile) | `scripts/compile-design.mjs` | `DING_DESIGN_OUT_DIR` | `tests/ui/design-drift.test.mjs` |\n| `app/renderer/src/generated/docs-bundle.ts` | `scripts/bundle-docs.mjs` | `DING_DOCS_OUT_FILE` | `tests/ui/docs-drift.test.mjs` |\n\nThe scratch override is what makes each check able to fail. A check that regenerates over the file\nit is about to read compares that file with itself, always passes, and leaves the working tree\ndirty for whoever runs the suite next. The docs bundle was checked that way and drifted by two\narticles across a merge — `npm run build` regenerates it, so no release was affected, but every\nreader of the checked-in tree saw a catalogue missing this very article.\n\nA merge is the likeliest way to drift one: an article arriving on one side and a bundle\nregenerated without it on the other produces no conflict to report. If a drift check fails, run its\ngenerator and commit the result — do not hand-edit generated output.\n\n## Driving the built application\n\n    node console/scripts/ui-drive/drive.mjs      <port> <output>            # every click, a capture each\n    node console/scripts/ui-drive/gallery.mjs    <port> <output>            # clean per-destination shots\n    node console/scripts/ui-drive/smoke.mjs      <port> [artifact]          # ship-readiness verdict\n    node console/scripts/ui-drive/a11y-probe.mjs <port> [dist/index.html]   # ARIA roles, landmarks, aria-label, tabindex, tags\n\n`a11y-probe.mjs` prints the same five counts the accessibility ROADMAP entry was measured\nwith, dismisses the onboarding wizard the same way `smoke.mjs` does, and refuses (rather\nthan reports) when the artifact is stale against its sources. It exits non-zero when any\ncount drops below a floor set a little under what a healthy build actually produces —\nnever the exact figure, because a guard pinned to the exact number breaks on the next\nunrelated content change and gets \"fixed\" by whoever hits it first. What it protects is\nthe baseline the accessibility work started from: 1 role, 0 landmarks, 0 aria-label, 0\ntabindex out of 426 elements, all of which sit below every floor.\n\nLaunch the application on an off-screen desktop with `--remote-debugging-port` and a\ntask-scoped `--user-data-dir`, then drive it over loopback. Refuse to evaluate anything\nuntil the target list holds **exactly one** page; that check is the isolation proof.\n\nFour traps, each measured here:\n\n- **A fresh profile opens on a setup wizard covering 94% of the viewport.** Clicks issued\n  through the document bypass hit-testing, so navigation works underneath it while every\n  capture photographs the wizard. 109 published images were lost to this. Dismiss it and\n  prove it is gone. Detect it by its own `Skip setup` control — **not** by looking for a\n  full-viewport element, because the application's content wrapper legitimately fills the\n  screen and that test refuses to drive a perfectly healthy app.\n- **Never pass `awaitPromise: true` to `Runtime.evaluate`.** It hangs on this Node even for\n  synchronous expressions.\n- **Write evaluated expressions with no backslashes.** One arrived mangled and silently\n  deleted every letter `s` from the results, with no error at all.\n- **Every navigable control carries an icon ligature glued to its label** — the text reads\n  `smartphoneEndpoints`, not `Endpoints`. Matching whole text finds nothing, and finding\n  nothing is indistinguishable from a screen with no controls.\n\nA capture is not evidence until it is checked. Sampling for pure black catches an unpainted\nframe — this palette has none — but it cannot tell you the *right* screen was captured.\nRecord the visible heading beside each image, and open one before believing any of it.\n\n## Release\n\nEvery push to `master` publishes a uniquely tagged non-draft release with a ~446 MB\ninstaller, and redeploys the site. Verify by observation: non-draft, exact target commit,\nassets downloadable.\n\n**Code signing is permanently prohibited.** `Get-AuthenticodeSignature` on the setup\nexecutable must report `NotSigned`, and the notes must say so rather than implying\nauthenticity.\n\n## Recovery\n\n- Suite exits 1 with zero failures → read the last twenty lines; a non-runner gate failed.\n- A generated file reports stale with no visible diff → line endings. Regenerate, and pin\n  the file `eol=lf` so it stops recurring.\n- A pinned count moved → re-derive it from the code and explain the delta. Never add two\n  lanes' deltas together and never force a number.\n- A negative regression goes green → its fixture may be asserting something that progress\n  made true. Force the condition instead of assuming it.\n"
    },
    {
      "id": "operations/README",
      "category": "operations",
      "title": "Operations",
      "headings": [],
      "links": [
        "build-and-release.md"
      ],
      "body": "# Operations\n\nHow this repository is built, packaged, driven, captured and released, and what to do when\none of those fails.\n\nDistinct from the rest of this documentation, which describes the product to somebody using\nit. This describes the repository to somebody working on it.\n\n- [Build and release](build-and-release.md) — the commands, and the failures worth knowing\n  about before meeting them. Mirrors the `ding-pbx-console-ops` operational skill.\n"
    },
    {
      "id": "pbx/canvas",
      "category": "pbx",
      "title": "Dialplan canvas",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "ivr.md",
        "queues.md",
        "endpoints.md"
      ],
      "body": "# Dialplan canvas\n\n## Behavior\n\nOne infinite canvas for the live dialplan, IVR and queue routing graph. Nodes and edges are parsed from the target's `dialplan show` output, and the layout can be moved locally for inspection. The inspector is read-only because this surface has no dialplan write path. The rail badge on this destination is empty until a live graph is read. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## Configuration\n\nThere is no settings form here. Adding, deleting, duplicating, or rewiring a node reports that the canvas is read-only rather than claiming a write occurred. An unread or unavailable target produces an empty canvas with the control-plane reason.\n\n## Failure modes and security\n\nA node that references a destination that no longer exists is omitted by the parser and the source reading reports the exact parse or target failure. Local layout changes never alter the target.\n\n## Verification\n\nConfirm the graph contains only nodes and edges from a successful live reading, that local dragging changes layout only, and that every attempted write action reports the read-only boundary without changing the target.\n\n## Suggested articles\n\n[IVR menus](ivr.md), [Queues & agents](queues.md), and [Endpoints](endpoints.md).\n"
    },
    {
      "id": "pbx/dash",
      "category": "pbx",
      "title": "Dashboard",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "live.md",
        "endpoints.md",
        "../data/cdr.md"
      ],
      "body": "# Dashboard\n\n## Behavior\n\nEverything the PBX is doing right now. Numbers come from AMI, not from a config file, so nothing here is editable — it is the truth of the running system. It is backed by `live`. The rail badge on this destination currently reads `live`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## Configuration\n\nThis screen has no editable controls. It is read-only telemetry, refreshed from the live AMI connection to Asterisk, and nothing on it is written back to a configuration file.\n\n## Failure modes and security\n\nBecause the numbers come from AMI rather than a file, an unreachable manager connection means the dashboard shows its disconnected state honestly instead of the last good numbers.\n\n## Verification\n\nConfirm the screen goes to its disconnected state when AMI is unreachable and recovers without a manual refresh once it returns.\n\n## Suggested articles\n\n[Live channels](live.md), [Endpoints](endpoints.md), and [CDR & CEL](../data/cdr.md).\n"
    },
    {
      "id": "pbx/endpoints",
      "category": "pbx",
      "title": "PJSIP endpoints",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "What the table's Transport and Codecs columns read",
          "id": "what-the-table-s-transport-and-codecs-columns-read"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "trunks.md",
        "../system/security.md",
        "../media/codecs.md"
      ],
      "body": "# PJSIP endpoints\n\n## Behavior\n\nPhones, softphones and applications that register with this PBX. Selecting a row loads its full option set below — every one of them a control, never a text field. It is backed by `pjsip.conf`. The rail badge on this destination currently reads `12`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## Configuration\n\n### Identity\n\nWho this endpoint claims to be on the wire, and what the far end is allowed to present back.\n\n- **Transport** (`e_transport`) — a select control, default `transport-udp`, choices `transport-udp`, `transport-tcp`, `transport-tls`, `transport-wss`. A transport is the road the signalling travels on. UDP is the plain road, TLS is the same road inside an armoured tunnel.\n  - *What it is:* Chooses which configured transport this endpoint signals over: plain UDP, TCP, TLS, or WebSocket for browsers.\n  - *Why it exists:* Signalling carries who is calling whom, the credentials exchange and the media keys. On UDP all of that is readable by anything on the path.\n  - *Choosing a value:* transport-udp is the historic default and fine inside a trusted LAN. transport-tcp helps where packets are large or fragmented. transport-tls is the right answer for anything crossing a network you do not own. transport-wss is required for WebRTC browser clients.\n  - *Gotcha:* The transport must already exist as a section in pjsip.conf. Selecting TLS without a certificate configured means the endpoint simply never registers, with a message that does not obviously say so.\n- **Dialplan context** (`e_context`) — a select control, default `from-internal`, choices `from-internal`, `from-external`, `from-trunk`, `sip-guest`. When this endpoint dials, Asterisk looks for the number inside this context. Think of it as which phone book gets opened.\n  - *What it is:* The dialplan context this endpoint enters when it dials.\n  - *Why it exists:* A context is a namespace of extensions. It is the single most important security boundary in Asterisk: an endpoint can only reach what its context lets it reach.\n  - *Choosing a value:* from-internal for staff phones, from-external for anything untrusted, from-trunk for carriers.\n  - *Gotcha:* Putting a desk phone in from-external is the classic toll-fraud opening. If a compromised phone lands in a context that can dial out, it will.\n- **Caller ID presentation** (`e_callerid`) — a segmented control, default `Allowed`, choices `Allowed`, `Prohibited`, `Unavailable`.\n- **Trust inbound identity** (`e_trust`) — a switch control, default `false`. Only turn this on for carriers you control. It tells Asterisk to believe P-Asserted-Identity headers the other side sends.\n\n### Media & NAT\n\nEvery option here came out of pjsip.conf. Toggle, do not type.\n\n- **direct_media** (`e_direct`) — a switch control, default `false`. Off means audio goes through Asterisk. On means the two phones talk to each other directly and Asterisk steps out of the audio path.\n  - *What it is:* Whether the two phones may send audio straight to each other, leaving Asterisk out of the media path.\n  - *Why it exists:* It halves bandwidth at the PBX and removes a hop of latency.\n  - *Choosing a value:* no keeps audio flowing through Asterisk. yes lets the endpoints talk directly once the call is up.\n  - *Gotcha:* With direct media you cannot record, cannot monitor, and mid-call transfers get fragile. Almost every deployment that needs features leaves it off.\n- **rtp_symmetric** (`e_symmetric`) — a switch control, default `true`.\n  - *What it is:* Requires that RTP arrives from the same address and port we are sending to.\n  - *Why it exists:* It defeats a class of audio injection where a third party sprays packets at your open RTP port.\n  - *Choosing a value:* yes is strongly recommended. no only for equipment that genuinely cannot comply.\n  - *Gotcha:* Combined with rewrite_contact it also fixes most NAT audio problems, which is why the pair is usually enabled together.\n- **force_rport** (`e_forcerport`) — a switch control, default `true`.\n  - *What it is:* Sends responses back to the port the request actually came from, rather than the port the phone claimed.\n  - *Why it exists:* A phone behind NAT advertises its private port. Replying there sends the packet nowhere.\n  - *Choosing a value:* yes for anything behind a router, which is nearly everything.\n  - *Gotcha:* Turning it off for a remote phone produces one-way registration that silently expires.\n- **rewrite_contact** (`e_rewrite`) — a switch control, default `true`. Needed when a phone behind a home router announces its private address. Asterisk quietly replaces it with the address the packet really came from.\n  - *What it is:* Replaces the Contact header address with the address the packet actually arrived from.\n  - *Why it exists:* Same NAT problem as force_rport, at the registration layer.\n  - *Choosing a value:* yes for remote and home workers. Not needed on a flat trusted LAN.\n  - *Gotcha:* On a carrier trunk this can be wrong: the carrier may legitimately present a Contact that differs from the source.\n- **ice_support** (`e_ice`) — a switch control, default `false`.\n- **media_encryption** (`e_encryption`) — a segmented control, default `sdes`, choices `no`, `sdes`, `dtls`.\n  - *What it is:* Whether media is encrypted, and with which scheme.\n  - *Why it exists:* TLS protects signalling only. Without media encryption the conversation itself is in the clear.\n  - *Choosing a value:* no is unencrypted. sdes exchanges keys in the SDP and requires TLS to be meaningful. dtls negotiates keys in the media stream itself and is what WebRTC uses.\n  - *Gotcha:* sdes over UDP signalling is theatre — the keys travel in plain text. If you turn on sdes, turn on TLS as well.\n- **dtmf_mode** (`e_dtmf`) — a segmented control, default `rfc4733`, choices `rfc4733`, `inband`, `info`, `auto`.\n  - *What it is:* How keypad presses travel from the phone to Asterisk.\n  - *Why it exists:* IVR menus, voicemail passwords and conference controls all depend on getting this right.\n  - *Choosing a value:* rfc4733 sends them as RTP events and is the modern default. inband sends actual tones in the audio, which compressed codecs mangle. info uses SIP INFO messages. auto tries to work it out.\n  - *Gotcha:* inband with g729 is the single most common cause of an IVR that ignores every key press.\n\n### Registration & AOR\n\nHow many devices may share this identity and how often Asterisk pokes them.\n\n- **max_contacts** (`e_maxcontacts`) — a stepper control, default `2`.\n  - *What it is:* How many devices may register against this one identity at the same time.\n  - *Why it exists:* One identity ringing a desk phone and a mobile app together needs at least two.\n  - *Choosing a value:* 1 for a single desk phone. 2 to 3 for desk plus mobile. 0 means unlimited and should not be used.\n  - *Gotcha:* A stolen credential can quietly add a device. Keep this as low as the deployment allows and watch the contact list.\n- **qualify_frequency** (`e_qualify`) — a slider control, default `60`. Asterisk sends a tiny OPTIONS ping this often to see if the phone is still alive. Zero switches the pings off.\n  - *What it is:* How often Asterisk sends a lightweight OPTIONS request to check the endpoint is still alive.\n  - *Why it exists:* It is how the console knows an endpoint went unreachable before a caller discovers it.\n  - *Choosing a value:* 60 seconds is a sensible default. 30 for critical endpoints. 0 disables the check.\n  - *Gotcha:* Very short intervals across hundreds of endpoints generate real traffic and real CPU. It is a poll, not a subscription.\n- **Registration expiry** (`e_expiry`) — a slider control, default `3600`.\n- **Allowed codecs** (`e_codecs`) — a order control, default `opus`, `g722`, `ulaw`, `alaw`.\n\n## What the table's Transport and Codecs columns read\n\nThe two columns come from the endpoint's own parameter table, which Asterisk prints for\n`pjsip show endpoint <id>` and for nothing else. The plural `pjsip show endpoints` listing\ncarries neither value, so the console runs one further read per endpoint.\n\n- **Transport** is the endpoint's configured `transport=`. An endpoint that sets none shows\n  `—`: transports are matched from the inbound connection unless one is pinned, so there is\n  genuinely no per-endpoint value to report. An endpoint pinned to a transport the target\n  does not have still shows the name it is pinned to, which is the case worth seeing — the\n  plural listing omits that row entirely and made the misconfiguration look like an\n  ordinary blank.\n- **Codecs** is the endpoint's configured `allow=` list, in Asterisk's own preference\n  order. An endpoint configured to allow nothing reads `none allowed`, which is a real\n  answer and not the same thing as never having looked.\n- When the parameter table could not be read for a particular endpoint, the column falls\n  back to the codec negotiated on a live channel and says so — `ulaw (in use)`. That is a\n  different reading: one codec on one call, rather than the list the endpoint offers. It is\n  labelled so the two can never be mistaken for each other.\n\nOne view reads the parameter table for at most **100 endpoints**, six at a time, because\neach one is a separate command against the target. Anything past that shows `—` in both\ncolumns rather than a value nobody read.\n\n## Failure modes and security\n\nEvery row reflects a real object in pjsip.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. The transport must already exist as a section in pjsip.conf. Selecting TLS without a certificate configured means the endpoint simply never registers, with a message that does not obviously say so. Putting a desk phone in from-external is the classic toll-fraud opening. If a compromised phone lands in a context that can dial out, it will. With direct media you cannot record, cannot monitor, and mid-call transfers get fragile. Almost every deployment that needs features leaves it off. Combined with rewrite_contact it also fixes most NAT audio problems, which is why the pair is usually enabled together.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in pjsip.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Trunks](trunks.md), [Security](../system/security.md), and [Codecs & RTP](../media/codecs.md).\n"
    },
    {
      "id": "pbx/iaxpeers",
      "category": "pbx",
      "title": "IAX peers",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "What loading and saving actually touch",
          "id": "what-loading-and-saving-actually-touch"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "trunks.md",
        "endpoints.md",
        "../system/security.md"
      ],
      "body": "# IAX peers\n\n## Behavior\n\nIAX2 peers, users and friends. The table is `iax2 show peers`, live off the target; selecting a row loads that exact peer's real `iax.conf` section below. It is backed by `iax.conf`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\nThe secret is write-only: this screen can set one and can never show you the one already there, which is why there is no field displaying it.\n\n## Configuration\n\n### Identity\n\nWhat this peer is and where it lives.\n\n- **type** (`ix_type`) — a segmented control, default `friend`, choices `user`, `peer`, `friend`.\n- **host** (`ix_host`) — a text control, placeholder `dynamic`. An address, or `dynamic` when the far end registers to you.\n- **username** (`ix_username`) — a text control, placeholder `asterisk`.\n- **port** (`ix_port`) — a stepper control, default `4569`. IAX2 is 4569 by default; the sample shows 5036 for a second instance.\n\n### Call handling\n\nTransfers, liveness and call-token validation.\n\n- **transfer** (`ix_transfer`) — a segmented control, default `yes`, choices `no`, `yes`, `mediaonly`. Native IAX2 transfer. `mediaonly` keeps the signalling here and moves only the audio.\n- **qualify** (`ix_qualify`) — a text control, placeholder `yes`. `yes`, `no`, or a millisecond threshold.\n- **trunk** (`ix_trunk`) — a switch control, default `false`. IAX2 trunking multiplexes several calls into one stream to this host.\n- **requirecalltoken** (`ix_calltoken`) — a segmented control, default `yes`, choices `no`, `yes`, `auto`. Call-token validation resists spoofed call setup. `auto` requires it only from peers known to support it. Turning it off weakens that protection.\n\n### Media\n\n- **Allowed codecs** (`ix_codecs`) — an order control, default `ulaw`, `alaw`, pool `opus`, `g722`, `ulaw`, `alaw`, `g729`, `gsm`, `ilbc`, `speex`. Written as `disallow=all` followed by the allow list, which is what makes an allow list mean anything.\n\n### Routing & accounting\n\nWhere calls land and how they are recorded.\n\n- **context** (`ix_context`) — a text control, placeholder `from-internal`. The dialplan context inbound calls enter. `iax.conf` permits several; the first is the default.\n- **accountcode** (`ix_accountcode`) — a text control, placeholder `lss0101`.\n- **mailbox** (`ix_mailbox`) — a text control, placeholder `1234`.\n\n### Credential\n\nWrite-only. Setting a secret replaces whatever is there; nothing on this screen can read one back.\n\n- **Set a new secret** (`ix_secret_set`) — a switch control, default `false`. Leave this off and the existing secret is left exactly as it is. Switch it on and a strong secret is generated, written once, and shown once — this console never stores or redisplays it.\n\n### Save\n\n- **Save this peer** (`ix_save`) — action button. Select a peer from the table above first — this writes only what changed for that exact peer, backed up first and applied through the same plan/apply transaction every other write in this console uses. A generated secret is shown exactly once, in a dialog, and nowhere else — never persisted by this console, never in an export, never in local history.\n\n## What loading and saving actually touch\n\n`iax.conf` writes a peer as a named section carrying `type=peer` or `type=friend` inside it, so a binding looking for a section literally called `peer` could never have matched one — matching by type, not by name, is what makes the row-click load and Save both work at all. `iax-peers.ts`'s `findPeer`/`applyControlValues` do that match; `App.tsx`'s `onPickIaxPeerRow`/`onSaveIaxPeer` are the load and save paths themselves.\n\nThe trunks screen's own live table also shows every IAX2 registration (`iax2 show registry`, `iax.conf`'s own `register =>` lines), named the same way the directive itself is: username and host joined by `@`, or the bare host when the line sets no username. That is a reading only, not an edit — the registration line an IAX2 trunk uses to dial *out* is a different object from the peer/friend section a partner dials *in* to, and this screen edits only the latter.\n\n## Failure modes and security\n\nEvery row reflects a real object in `iax.conf`; nothing is invented to fill the table. A target with no configured peers renders an honestly empty table rather than the design's own sample rows. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. The secret's write-only design means a wrong guess here cannot be corrected by comparison — only by setting a new one, which is the trade-off for never letting a credential travel back through renderer state, an export, a screenshot, or local history.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in `iax.conf`, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that picking a different row without saving resets `ix_secret_set` to off (so a switch armed for one peer can never silently apply to the next), that a generated secret is shown exactly once and never persisted, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Trunks](trunks.md), [Endpoints](endpoints.md), and [Security](../system/security.md).\n"
    },
    {
      "id": "pbx/ivr",
      "category": "pbx",
      "title": "IVR menus",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "canvas.md",
        "queues.md",
        "../media/voicemail.md"
      ],
      "body": "# IVR menus\n\n## Behavior\n\nEach menu is a canvas subgraph with a prompt and a key map. Editing a key here moves the matching node on the canvas. It is backed by `extensions.conf`. The rail badge on this destination currently reads `5`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## Configuration\n\n### Menu behaviour\n\nApplies to the selected menu.\n\n- **Digit timeout** (`i_timeout`) — a slider control, default `7`.\n- **Retries before fallback** (`i_retries`) — a stepper control, default `3`.\n- **On invalid entry** (`i_invalid`) — a segmented control, default `Repeat`, choices `Repeat`, `Operator`, `Voicemail`, `Hangup`.\n- **Allow direct extension dial** (`i_direct`) — a switch control, default `true`.\n- **Prompt language** (`i_lang`) — a select control, default `en`, choices `en`, `es`, `fr`, `de`, `zh`.\n- **Allow barge-in over prompt** (`i_barge`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in extensions.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in extensions.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Dialplan canvas](canvas.md), [Queues & agents](queues.md), and [Voicemail](../media/voicemail.md).\n"
    },
    {
      "id": "pbx/live",
      "category": "pbx",
      "title": "Live channels",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "dash.md",
        "../system/security.md",
        "endpoints.md"
      ],
      "body": "# Live channels\n\n## Behavior\n\nEvery channel currently up. Spy, record or hang up any of them; each action runs the full four-gate confirmation. It is backed by `core show channels`. The rail badge on this destination currently reads `4`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## Configuration\n\n### Monitor defaults\n\nApplied to any spy or recording started from this screen.\n\n- **Spy mode** (`m_spy`) — a segmented control, default `Whisper`, choices `Listen`, `Whisper`, `Barge`.\n- **Recording format** (`m_format`) — a segmented control, default `wav`, choices `wav`, `gsm`, `g722`, `ogg`.\n- **Beep on record start** (`m_beep`) — a switch control, default `true`.\n- **Keep recordings for** (`m_retain`) — a slider control, default `90`.\n\n## Failure modes and security\n\nEvery row reflects a real object in core show channels; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in core show channels, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Dashboard](dash.md), [Security](../system/security.md), and [Endpoints](endpoints.md).\n"
    },
    {
      "id": "pbx/queues",
      "category": "pbx",
      "title": "Queues & agents",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "canvas.md",
        "ivr.md",
        "../media/moh.md"
      ],
      "body": "# Queues & agents\n\n## Behavior\n\nRing strategy, penalties and service level, all lifted from queues.conf. Agents are dragged between queues on the canvas. It is backed by `queues.conf`. The rail badge on this destination currently reads `4`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## Configuration\n\n### Ring strategy\n\nHow a waiting call is offered to the members of this queue.\n\n- **strategy** (`q_strategy`) — a select control, default `ringall`, choices `ringall`, `leastrecent`, `fewestcalls`, `random`, `rrmemory`, `linear`, `wrandom`. ringall rings every free agent at once. leastrecent picks whoever has gone longest without a call. Pick ringall if you are not sure.\n  - *What it is:* How a waiting call is offered to the members of the queue.\n  - *Why it exists:* It decides whether callers wait less or agents share work evenly. You cannot optimise both.\n  - *Choosing a value:* ringall rings every free agent and answers fastest. leastrecent picks whoever has gone longest without a call. fewestcalls balances totals. rrmemory is round robin that remembers its place. linear follows the member order exactly.\n  - *Gotcha:* ringall on a large queue rings a lot of phones for every call, which staff find exhausting. Above about eight agents, move to rrmemory or leastrecent.\n- **Ring each agent for** (`q_timeout`) — a slider control, default `15`.\n- **wrapuptime** (`q_wrapup`) — a slider control, default `15`. Breathing room after a call ends before that agent may be rung again.\n  - *What it is:* How long after a call ends before this agent may be offered another.\n  - *Why it exists:* Agents need to finish notes. Without it the next call lands mid-sentence.\n  - *Choosing a value:* 15 to 30 seconds suits most support desks. 0 for a high-volume queue where notes are not taken.\n  - *Gotcha:* It applies per member, not per queue, so an agent in three queues is unavailable in all of them during wrap-up.\n- **Retry gap** (`q_retry`) — a slider control, default `5`.\n- **ringinuse** (`q_ringinuse`) — a switch control, default `false`.\n  - *What it is:* Whether members already on a call should still be rung.\n  - *Why it exists:* Some phones can hold a second call; most staff cannot.\n  - *Choosing a value:* no in almost every case.\n  - *Gotcha:* Turning it on makes queue statistics misleading, because calls appear offered to people who could never have taken them.\n- **autopause** (`q_autopause`) — a segmented control, default `no`, choices `no`, `yes`, `all`.\n\n### Capacity & announcements\n\nWhat callers hear and when the queue turns them away.\n\n- **Maximum callers** (`q_maxlen`) — a stepper control, default `25`.\n- **servicelevel** (`q_service`) — a slider control, default `60`.\n  - *What it is:* The answer target used to calculate the service level percentage.\n  - *Why it exists:* It is the number a manager reports on.\n  - *Choosing a value:* 60 seconds is the industry convention.\n  - *Gotcha:* Changing it rewrites the meaning of every historical report; the stored data is raw wait times, but the percentage is computed against whatever this says today.\n- **joinempty** (`q_joinempty`) — a chips control, default `paused`, `invalid`, choices `paused`, `inuse`, `invalid`, `unavailable`, `ringing`.\n  - *What it is:* Under which member states a caller is still allowed to enter the queue.\n  - *Why it exists:* It stops callers waiting in a line nobody is standing behind.\n  - *Choosing a value:* A list of states: paused, inuse, invalid, unavailable, ringing.\n  - *Gotcha:* The semantics are inverted from what most people expect: these are the states that still count as \"somebody is there\".\n- **leavewhenempty** (`q_leave`) — a chips control, default `inuse`, choices `paused`, `inuse`, `invalid`, `unavailable`, `ringing`.\n- **Periodic announcement every** (`q_periodic`) — a slider control, default `60`.\n- **Announce position in queue** (`q_position`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in queues.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. ringall on a large queue rings a lot of phones for every call, which staff find exhausting. Above about eight agents, move to rrmemory or leastrecent. It applies per member, not per queue, so an agent in three queues is unavailable in all of them during wrap-up. Turning it on makes queue statistics misleading, because calls appear offered to people who could never have taken them. Changing it rewrites the meaning of every historical report; the stored data is raw wait times, but the percentage is computed against whatever this says today.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in queues.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Dialplan canvas](canvas.md), [IVR menus](ivr.md), and [Music on hold](../media/moh.md).\n"
    },
    {
      "id": "pbx/README",
      "category": "pbx",
      "title": "PBX",
      "headings": [],
      "links": [
        "dash.md",
        "live.md",
        "endpoints.md",
        "trunks.md",
        "iaxpeers.md",
        "trunkauth.md",
        "canvas.md",
        "ivr.md",
        "queues.md"
      ],
      "body": "# PBX\n\nTelephony: endpoints, routing and everything a call touches while it is alive.\n\n- [Dashboard](dash.md)\n- [Live channels](live.md)\n- [Endpoints](endpoints.md)\n- [Trunks](trunks.md)\n- [IAX peers](iaxpeers.md)\n- [Trunk authentication](trunkauth.md)\n- [Dialplan canvas](canvas.md)\n- [IVR menus](ivr.md)\n- [Queues & agents](queues.md)\n"
    },
    {
      "id": "pbx/trunkauth",
      "category": "pbx",
      "title": "Trunk authentication",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What this screen reads",
          "id": "what-this-screen-reads"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "trunks.md",
        "../system/security.md",
        "../app/history.md"
      ],
      "body": "# Trunk authentication\n\n## Behavior\n\nWhen a trunk partner asks to change something on the shared link — a new source address, a codec, a higher call cap — the request lands here and you answer yes or no. Nothing takes effect until you do. It is backed by `trunk partner requests`, which is not an Asterisk configuration file -- see \"Failure modes and security\" below. The rail badge on this destination currently reads `2`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\n## What this screen reads\n\nTwo things, and they are not the same thing.\n\n**The request inbox is empty and always has been.** No partner-request channel is wired into this console — there is no protocol, no transport and no partner identity behind those cards, because which of each to use is a product decision rather than a piece of wiring. The screen says exactly that. It says it whether or not a target is connected, because connecting a phone system would not add a single request: the missing channel is a fact about this console, not about any target.\n\n**The target's real trunk authentication is read and reported.** The screen runs `pjsip show auths` and names every `type=auth` object the target actually has, with the `username=` each one presents — these are the objects an endpoint's `auth=`/`outbound_auth=` refers to, which is what \"this trunk authenticates as X\" is made of. It reads `pjsip show registrations` alongside them and reports how many outbound registrations exist. An object with no username reads `no username set` rather than rendering an empty pair of brackets, and a failed read carries the target's own reason.\n\nThe auth objects are deliberately **not** rendered as rows in the answer-history grid below. That grid's four fields are partner, what, answer and when, under a heading reading \"Answer history\" — so a row in it claims a partner asked something and this console answered. An auth object is neither, and putting real-looking content under a label it does not belong to is the same defect as the sample rows this console removed.\n\n### Why the plural command, and never the singular one\n\n`pjsip show auths` prints an id and a username and nothing else. `pjsip show auth <id>` prints the object's whole parameter set — including `password`, `md5_cred`, `oauth_secret` and `refresh_token`, all of which are registered fields on this object. Running it would put a real credential on screen and into anything that copies the screen. It is in neither read-only allowlist, the gateway refuses it if it is constructed by hand anyway, and both of those are asserted by tests rather than assumed.\n\n## Configuration\n\n### Answering policy\n\nHow requests arrive and what may be answered without you.\n\n- **Auto-approve low-risk requests** (`ta_auto`) — a switch control, default `false`. Low risk means a codec addition or a health-check interval. Address changes and call caps are never auto-approved.\n- **Requests expire after** (`ta_expire`) — a slider control, default `48`.\n- **Notify on new request** (`ta_notify`) — a switch control, default `true`.\n- **Require mutual confirmation** (`ta_mutual`) — a switch control, default `true`. Both sides must answer yes. A one-sided yes stays pending, which is what stops a partner quietly widening the link.\n- **Sign my answers** (`ta_sign`) — a switch control, default `true`.\n- **Keep the answer history forever** (`ta_log`) — a switch control, default `true`.\n\n## Failure modes and security\n\nThe six controls above are this console's own settings and are stored locally. They are not keys in pjsip.conf, and there is no key in pjsip.conf for \"auto-approve a low-risk partner request\" — that is this console's workflow, which is why this destination's `file` field reads `trunk partner requests` rather than a real Asterisk filename: it used to read `pjsip.conf · partner requests`, which named a real file that this screen has never read a single key from, and `resource-for-file.test.tsx` pins the current label so a screen cannot drift back to claiming one.\n\nThe reading beside them is unreachable-shown-as-unreachable, never backfilled: a failed `pjsip show auths` reports the target's own reason, and a target with genuinely no auth object reports that instead of leaving a blank.\n\n## Verification\n\nExercise every control against its documented default and its full option range, and confirm each value survives a relaunch — they are local settings, so nothing should be expected to land in a configuration file.\n\nFor the reading, confirm on the built application that a target's real auth objects appear by name, that one with no `username=` reads `no username set`, that a target with none says so, and that a failed read carries the target's own reason. `tests/control-plane/pjsip-auths.test.ts` asserts the parser against a fixture assembled from this checkout's own `config_auth.c` format strings and re-derives the column widths from `res_pjsip_cli.h`, and it asserts the two things that keep the credential off this screen: the singular `pjsip show auth <id>` is in neither allowlist, and the gateway refuses it if it is constructed by hand. `tests/ui/real-sources-wired.test.tsx` renders the real `App` and reads all of the above out of the markup.\n\n## Suggested articles\n\n[Trunks](trunks.md), [Security](../system/security.md), and [History & git](../app/history.md).\n"
    },
    {
      "id": "pbx/trunks",
      "category": "pbx",
      "title": "Trunks & registrations",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "What loading and saving actually touch",
          "id": "what-loading-and-saving-actually-touch"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "trunkauth.md",
        "endpoints.md",
        "iaxpeers.md",
        "../system/security.md"
      ],
      "body": "# Trunks & registrations\n\n## Behavior\n\nOutbound carriers and inbound identifies, PJSIP and IAX2 alike -- the live table merges `pjsip show registrations` with `iax2 show registry`. Registration state is polled live; credentials live in the secret intake, never on this screen. It is backed by `pjsip.conf`. The rail badge on this destination currently reads `3`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.\n\nClick a PJSIP row to load that exact registration, and the endpoint paired with it when one can be found, into the groups below. An IAX2 row has no PJSIP registration by that name -- it says so plainly rather than loading nothing silently, and points at the IAX peers screen's own editor instead.\n\n## What loading and saving actually touch\n\nThree real objects, not one:\n\n- The **[registration]** section named after the clicked row (`configs/samples/pjsip.conf.sample` lines 1519-1552), which is where the Failover group's three fields live. `parsePjsip` deliberately does not model this object type -- its own comment excludes registrations alongside transports, ACLs and `[global]` -- so a dedicated module, `trunk-registration.ts`, finds and writes it by name and by `type=registration`, because a registration and an endpoint can share one bracket name the same way an endpoint/auth/aor trio already does.\n- The **paired endpoint**, found through the registration's own `endpoint=` line, or by sharing its bracket name when there is no explicit one -- the Outbound identity and Advanced groups both read and write this object, through `trunk-advanced.ts`.\n- Nothing is guessed: a registration with no reachable endpoint still loads its retry policy, and Save still writes it, but Outbound identity and Advanced simply keep whatever they last showed.\n\nBefore this screen had a Save action at all, these five controls were bound only to whichever registration and endpoint happened to be first in the file -- a real read, but the same value regardless of which row was clicked, and nothing anywhere wrote it back.\n\n## Configuration\n\n### Failover\n\nWhat happens when the primary carrier stops answering. `configs/samples/pjsip.conf.sample` lines 1519-1552 (the `[registration]` template).\n\n- **Retry interval** (`t_retry`) — a slider control, default `60`. `retry_interval`, line 1542.\n- **Forbidden retry** (`t_forbidden`) — a slider control, default `300`. `forbidden_retry_interval`, line 1544.\n- **Fatal retry attempts** (`t_fatal`) — a stepper control, default `5`. `max_retries`, line 1532.\n\n### Outbound identity\n\nHow your calls appear to the carrier, on the paired `[endpoint]` section.\n\n- **Send P-Asserted-Identity** (`t_pai`) — a switch control, default `true`. `send_pai`, default `no`.\n- **100rel** (`t_100rel`) — a segmented control, default `yes`, choices `no`, `required`, `yes`. Line 650.\n\n### Advanced\n\nFurther `[endpoint]` settings on the same paired endpoint -- T.38 fax relay, identity headers, and how this trunk's own address is presented. Every key here was previously fully built and tested in `trunk-advanced.ts` with no control anywhere in the design to carry it; this group is what finally gives that module a screen.\n\n- **Send Connected Line updates** (`tk_connectedline`) — switch, default `true`. `send_connected_line`, default `yes`.\n- **Contact user** (`tk_contactuser`) — text. `contact_user`, default empty.\n- **From domain** (`tk_fromdomain`) — text. `from_domain`, default empty.\n- **From user** (`tk_fromuser`) — text. `from_user`, default empty.\n- **Media address** (`tk_mediaaddr`) — text. `media_address`, default empty.\n- **T.38 UDPTL** (`tk_t38`) — switch, default `false`. `t38_udptl`, default `no`.\n- **T.38 error correction** (`tk_t38ec`) — segmented, default `none`, choices `none`, `fec`, `redundancy`. `t38_udptl_ec`; only read while T.38 UDPTL is on.\n- **T.38 NAT support** (`tk_t38nat`) — switch, default `false`. `t38_udptl_nat`; only read while T.38 UDPTL is on.\n- **T.38 max datagram** (`tk_t38mtu`) — stepper, default `0`. `t38_udptl_maxdatagram`, bytes; only read while T.38 UDPTL is on.\n- **CNG fax tone detection** (`tk_faxdetect`) — switch, default `false`. `fax_detect`, default `no`.\n- **Trust ID outbound** (`tk_trustout`) — switch, default `false`. `trust_id_outbound`, default `no`.\n- **Send Remote-Party-ID** (`tk_sendrpid`) — switch, default `false`. `send_rpid`, default `no`.\n- **Send Diversion header** (`tk_senddiversion`) — switch, default `true`. `send_diversion`, default `yes`.\n\n### Save\n\n- **Save this trunk** (`t_save`) — action button. Writes the loaded registration's retry policy and, when a paired endpoint was found, its outbound identity and advanced fields, in one plan/apply transaction. Refused with a plain message when no row has been loaded, or when the loaded endpoint has since been removed from the target.\n\n## Failure modes and security\n\nEvery row reflects a real object read live off the target; nothing is invented to fill the table. Save only ever writes the three retry keys on the loaded registration, and, when a paired endpoint was found at load time, the outbound-identity and advanced keys on that exact endpoint -- untouched fields are left exactly as they were, and a warning is surfaced (never silently dropped) when T.38 detail is configured without T.38 itself being on, or when Remote-Party-ID is sent without outbound identity being trusted. A registration this target's pjsip.conf does not yet declare statically is created on Save rather than refused, the same convention the SLA trunk editor already uses.\n\n## Verification\n\n`tests/ui/trunk-advanced.test.tsx` exercises every Advanced-group key, including 100rel and send_pai, against `configs/samples/pjsip.conf.sample`'s own defaults and full option ranges, confirms independence between controls, confirms an untouched control writes nothing, and confirms the whole set survives being rendered to a file and re-parsed. Confirm on the built application that clicking a row loads the right registration and (when one exists) the right paired endpoint, that Save writes only what changed, that an IAX2 row is refused with an explanation rather than silently loading nothing, and that a registration Save creates is visible on the next read.\n\n## Suggested articles\n\n[Trunk authentication](trunkauth.md), [Endpoints](endpoints.md), [IAX peers](iaxpeers.md), and [Security](../system/security.md).\n"
    },
    {
      "id": "platform/accessibility",
      "category": "platform",
      "title": "Accessibility",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "responsive-sizing.md",
        "material-appearance.md",
        "../system/security.md",
        "README.md"
      ],
      "body": "# Accessibility\n\nKeyboard reachability, visible focus, correct semantic roles, sufficient contrast, and screen-reader-sensible structure across the whole product.\n\n## Behavior\n\nEvery interactive element is meant to be reachable by keyboard, carry a visible focus indicator, expose the correct accessible role, name, and state, hold sufficient contrast, and respect a reduced-motion preference.\n\n## Configuration\n\nThis is treated as a completion blocker rather than later polish: a control that looks interactive but cannot be reached or announced correctly is considered unfinished, not merely rough.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application's rendered interface currently contains no accessibility attributes at all — no ARIA roles, no accessible names distinct from visible labels, and no verified keyboard focus order. There are also no automated tests covering the desktop application's generic feature surface. This is stated directly rather than left for a reader to assume.\n\n**Documentation website:** Partial. The documentation website has some baseline structure — heading hierarchy, a skip-to-content link, and semantic landmarks — but has not been audited for contrast, full keyboard operability, or screen-reader correctness across every page.\n\n## Failure modes\n\nA control that cannot currently be reached by keyboard or announced correctly to a screen reader is, today, a real and known gap rather than a hypothetical failure mode; closing it is unstarted work on the desktop application and partial work on the site.\n\n## Accessibility and localization\n\nThe desktop application's interface currently contains no accessibility attributes at all, and there are no automated tests covering the desktop application's generic feature surface. This is stated here directly so a reader does not have to assume it. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Responsive and high-scale sizing](responsive-sizing.md), [Material appearance system](material-appearance.md), [Security](../system/security.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/app-display-name",
      "category": "platform",
      "title": "Renameable app display name",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Implementation notes",
          "id": "implementation-notes"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "app-logo-customization.md",
        "../app/about.md",
        "README.md"
      ],
      "body": "# Renameable app display name\n\nLets a user rename what the application calls itself in its own title bar and About screen, without touching its install identity.\n\n## Behavior\n\nA settings field (Customise everything → Identity → Display name) lets a user set a custom display name, persisted across restarts through the durable-storage settings snapshot and resettable to the shipped name in one action (the \"Restore the shipped name\" switch beside it).\n\nThe chosen name reaches every surface the console uses to introduce itself to its own user:\n\n- **The in-app title bar** — the custom drag-region title bar the frameless window renders.\n- **The native OS window title** — taskbar and Alt+Tab, pushed to the main process over IPC (`window:set-title`) whenever the name changes, and once on startup after the durable-storage snapshot loads.\n- **The About screen's heading** — reads \"About \\<name\\>\" instead of a bare \"About\".\n- **Its own notifications** — a toast confirms \"Renamed to \\<name\\>\" when a rename is set, and \"Name restored to \\<shipped name\\>\" when it is reset.\n\n## Configuration\n\nRenaming changes display only. `display-name.ts` keeps two deliberately separate exports with no path between them: `IDENTITY` (a frozen constant: the shipped product name, the application-data directory, the packaging identifier, and the credential-vault service key) and `displayName()` (the user setting). Nothing derives an identity value from the chosen name.\n\nDiagnostics, crash logs, issue reports, the update feed, and the installer always use `IDENTITY.productName`, never the chosen name (`nameFor()`'s `SHIPPED_NAME_SURFACES`) — the rename control's own explanatory copy states this plainly, in text that itself always names the shipped product, regardless of what the console is currently renamed to.\n\n## Implementation notes\n\nThe compiled title bar text is a design-reference literal with no bound value (`h(\"span\", {...}, \"Ding PBX Console\")`), and the renderer is compiled from the design reference and must never be hand-edited. Rather than edit the design reference for one label — which would need a matching, independently re-audited change to its pinned binding and expression counts — `title-bar-name.ts` rewrites the already-built element tree on its way out of `App.render()`, the same way `text-boundary.ts` already applies language and personal-vocabulary substitution to the compiled tree without touching a generated file. It finds the title bar by its `data-window-drag` marker (which `compile-design.mjs` guarantees is unique at compile time) and, within it, the one row carrying the leading Material Symbols icon — never by matching the shipped-name string itself, so an already vocabulary-substituted name is still found.\n\n## Failure modes\n\nA rename that accidentally altered the application's data-directory path rather than only its display label is the specific failure this feature is designed to prevent by deriving the two from separate constants — exercised directly by `display-name.test.tsx`'s identity tests. An invalid name (empty, over 60 characters, or containing a control character) is refused before it reaches storage, and a name a hand-edited settings file or an older version wrote that the app would no longer accept falls back to the shipped name rather than rendering.\n\n## Accessibility and localization\n\nFollows the product's standing accessibility contract: the rename field and reset switch are ordinary keyboard-reachable, correctly-named text and switch controls with the compiled design's own focus and contrast handling. Copy is currently fixed English; the disclosure and confirmation strings are not yet routed through the language-mode/funny-level boundary.\n\n## Verification\n\n`tests/ui/display-name.test.tsx` exercises the `display-name.ts` module directly: identity isolation, validation, persistence, reset, and shipped-name-only surfaces. `tests/ui/display-name-wired.test.tsx` proves the wiring itself against the real `App` — the title bar and About heading actually rendering the chosen name (and the shipped name when unrenamed), the notification toast, the native window-title IPC push, and (by source-scan, since it is Electron-only code this suite cannot import and run directly) `main.ts` and `preload.cjs`. `tests/ui/title-bar-name.test.tsx` covers the tree-rewrite's precision in isolation, including the negative case that would let it silently overwrite the connection-status pill instead.\n\n## Suggested articles\n\n[App logo customization](app-logo-customization.md), [About and policy](../app/about.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/app-logo-customization",
      "category": "platform",
      "title": "App logo customization",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "material-appearance.md",
        "app-display-name.md",
        "../app/appearance.md",
        "README.md"
      ],
      "body": "# App logo customization\n\nLets a user replace the application's displayed mark with a shipped preset or their own local image.\n\n## Behavior\n\nA logo customization surface is meant to offer several presets plus a local image upload, processed entirely on-device with cropping, fit, and background controls, then applied live wherever the mark is shown.\n\n## Configuration\n\nProcessing would be bounded and safe — validated file types, no network upload — with conversion failures leaving the previous valid logo in place.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application shows a fixed application mark with no customization surface.\n\n**Documentation website:** Partial. The site's settings page includes a placeholder entry for logo customization; no preset picker, no upload control, and no on-device processing exist behind it yet.\n\n## Failure modes\n\nA malformed or oversized uploaded image is meant to be rejected before it becomes the active mark, with the previous logo staying in place; nothing implements the upload path today, so nothing enforces that yet.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Material appearance system](material-appearance.md), [Renameable app display name](app-display-name.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/attention-modes",
      "category": "platform",
      "title": "Attention-support modes",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "accessibility.md",
        "non-blocking-notifications.md",
        "README.md"
      ],
      "body": "# Attention-support modes\n\nA set of independently toggleable, off-by-default interface modes — focus, low stimulation, time awareness, one-thing-at-a-time, and momentum — aimed at attention difficulties.\n\n## Behavior\n\nEach mode is meant to be a separate switch: focus dims everything but the active item without hiding it, low stimulation reduces motion and non-essential notifications, time awareness shows elapsed session time, one-thing-at-a-time pins a single chosen next action, and momentum gently and dismissibly flags long-untouched work.\n\n## Configuration\n\nCopy in these modes would stay plain and factual, never gamified or judgmental, presented as interface accommodations rather than anything medical or diagnostic.\n\n## Current status\n\n**Desktop application:** Implemented. Every switch in Customise › Attention now changes real behaviour, not only a stored preference:\n\n- **Focus** dims everything except whatever currently has focus once something is focused; nothing is hidden and the dim is pure opacity, so every element is still reachable and clickable. Nothing is dimmed while nothing is focused.\n- **Low stimulation** composes with, and never overrides, both the console's own Reduced motion switch and the operating system's `prefers-reduced-motion` preference — motion is reduced when any of the three is on. It also quiets the console's ambient, lower-priority toast notifications (progress pings, confirmations); the console's other non-blocking surface — reserved for failures and the outcome of something substantial — is unaffected, so a person still sees what genuinely needs attention.\n- **Time awareness** renders a small rail, present on every screen rather than only on the settings page, stating how long the session has been open and how long since anything last changed.\n- **One thing at a time** adds a single free-text field to that same rail for the one next action, chosen by the person and persisted, so it survives switching screens or relaunching.\n- **Momentum** shows a plain, dismissible prompt on the rail once something has sat unchanged for 20 minutes, stating only the fact (\"Nothing has changed here for 40 minutes.\"). Its \"Not now\" is respected for 30 minutes, not for the length of one render.\n\nEvery switch is off by default, independent of every other, and each attention-mode switch's own on/off position is restored after a relaunch, not only the underlying behaviour.\n\n**Documentation website:** Partial. The site's settings page includes placeholder entries naming these modes; none of the five behaviors are actually wired to change the rendered page yet.\n\n## Failure modes\n\nA failure here is silent by nature — a switch that persists correctly but changes nothing on screen — which is exactly the state this feature shipped in before it was wired. The wired tests in `attention-modes-wired.test.tsx` exist specifically to catch that: they assert on the actual rendered markup and DOM side effects (a real injected style element, a real snoozed timestamp) rather than only on `presentationFor()`'s return value, because a correct pure function that nothing calls passes every test on the pure function alone.\n\n## Accessibility and localization\n\nThe rail (`attn-rail` and its children) uses `role=\"complementary\"` with an `aria-label`, and the momentum prompt uses `role=\"status\"`. The next-action field and the Not now button are ordinary keyboard-reachable `<input>`/`<button>` elements. Copy is plain English today; the console's language-mode and funny-level machinery has not yet been extended to this rail's own strings, which remains open work tracked alongside the rest of the feature.\n\n## Verification\n\n`attention-modes.test.tsx` covers the pure module (`presentationFor`, `momentumPrompt`, `elapsedPhrase`, and the storage-backed helpers for the chosen next action and the momentum snooze). `attention-modes-wired.test.tsx` covers the actual `App.tsx` wiring: real control changes producing real presentation changes, a real style element appearing and disappearing in the document, the rail rendering only what each mode's own state says it should, and the switches' own on/off position surviving a restore. Both suites run under `npm run test:renderer`.\n\n## Suggested articles\n\n[Accessibility](accessibility.md), [Non-blocking notifications](non-blocking-notifications.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/automatic-updates",
      "category": "platform",
      "title": "Automatic updates",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Restart and drafts",
          "id": "restart-and-drafts"
        },
        {
          "title": "Configuration and safety",
          "id": "configuration-and-safety"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification boundary",
          "id": "verification-boundary"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../evidence/automatic-updates.md",
        "in-context-recovery.md",
        "non-blocking-notifications.md",
        "app-display-name.md",
        "README.md"
      ],
      "body": "# Automatic updates\n\nThe desktop updater checks the published release feed over HTTPS, validates one complete release identity, downloads the matching unsigned `Setup.exe`, checks its declared size and SHA-256 digest, and stages it for a user-directed restart.\n\n## Behavior\n\nPublished releases use a monotonic package version `0.1.<run>`, beginning above `0.1.0`, and one immutable identity record. The public release tag remains `ding-pbx-console-v0.0.<run>-r<attempt>` for compatibility with existing `0.1.0` installations. The updater maps that legacy-compatible tag to package version `0.1.<run>` before comparing versions. A usable release carries exactly one stable `Ding-PBX-Console-Setup.exe`, one `RELEASES`, at least one version-bearing full `.nupkg`, `SHA256SUMS.txt`, and `release-identity.json`. The identity records the package version, candidate commit, release tag, artifact names, sizes, and SHA-256 values. A release is ignored when any record is missing, malformed, unpublished, duplicated, or inconsistent.\n\nThe installed version comes from the packaged `update-manifest.json`. Published packaging rejects any run whose bounded positive run number does not map exactly to package version `0.1.<run>`. A release is offered only when its package version is strictly newer. Local unpublished builds remain identifiable by their candidate commit and are never treated as published releases.\n\nThe desktop checks once at startup and on a bounded schedule. Only one check or download may be in flight. Metadata, identity, checksum text, and installer streams have finite response and per-read deadlines and bounded sizes. Temporary installer directories are owned by the updater, removed after every failed or superseded operation, and swept when the desktop starts.\n\n## Restart and drafts\n\nThe ready banner is non-blocking and offers `Restart to install update` and `Later`. `Later` hides the banner without deleting the staged installer. A manual check or the next scheduled check may reveal the preserved ready state again. A newer ready revision clears an older local spawn-error message, while a current failure remains visible. Restart uses an invoke-based acknowledgement. The main process has one installing latch, launches `Setup.exe` at most once, and quits only after the operating system acknowledges process spawn. A spawn failure stays visible and retryable.\n\nPBX drafts disable restart. The renderer counts every loaded resource whose current draft differs from its last live read, including the resource currently being edited, and publishes that count through the main-process updater revision. The banner states the exact recovery route: review the draft, apply it, or discard it, then retry the restart. The updater never drops a draft to make installation convenient.\n\n## Configuration and safety\n\nCode signing is permanently prohibited. The package and update feed are intentionally unsigned, so the operating system may show an unknown-publisher or SmartScreen warning. Digest checking proves byte integrity only and never claims authenticity or signing.\n\n## Failure modes\n\nMalformed packaged identity, an older or equal package version, incomplete release assets, missing checksum lines, inconsistent artifact sizes or digests, response-header timeout, stream-read timeout, bounded-size overflow, temporary-file failure, and installer-spawn failure remain visible as retryable updater states. A failed or superseded download is removed from its updater-owned temporary directory.\n\n## Accessibility and localization\n\nThe banner is a keyboard-operable, screen-reader-named non-blocking status surface with visible focus, a pending state, a disabled restart control while drafts exist, and explicit retry copy after spawn failure. The successful installer spawn is acknowledged to the renderer before application quit is scheduled, while a failure keeps the current session open. It avoids claiming that a download is running while a staged installer is merely ready. The product's language and localization surfaces own the final copy.\n\n## Verification boundary\n\nThis lane intentionally did not run tests, lint, type checks, builds, packaging, desktop launch, UI interaction, or screen captures. The final handoff records the exact packaged regression seam that still needs the cheap Lowlevel headless route: a packaged Windows build with a valid unpublished manifest, a complete newer release identity, a mismatched digest, a malformed manifest, a preserved `Later` state, a duplicate restart activation, a spawn failure, and a PBX draft count above zero.\n\n## Suggested articles\n\n[Update evidence](../evidence/automatic-updates.md), [In-context recovery](in-context-recovery.md), [Non-blocking notifications](non-blocking-notifications.md), [App display name](app-display-name.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/bounded-overlays",
      "category": "platform",
      "title": "Bounded, self-painting overlays",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "material-appearance.md",
        "command-palette.md",
        "README.md"
      ],
      "body": "# Bounded, self-painting overlays\n\nEvery popover, menu, and tooltip paints its own background and elevation and stays fully inside the viewport, scrolling internally rather than clipping content.\n\n## Behavior\n\nOverlays are meant to never render transparent over whatever sits behind them, and to bound their height to the available space, scrolling their own content rather than silently truncating it.\n\n## Configuration\n\nAn overlay would never cover the control that opened it and would remain reachable and legible at every supported display scale.\n\n## Current status\n\n**Desktop application:** Partial. The desktop application's menus and popovers generally paint an opaque background and stay within the window, but have not been systematically verified against the viewport-bounding and internal-scroll requirements at every scale.\n\n**Documentation website:** Partial. The site has a small number of overlay elements, such as the command-palette filter overlay, that paint an opaque surface and stay within the viewport in ordinary use, but have not been stress-tested at extreme viewport sizes.\n\n## Failure modes\n\nAn overlay taller than the available viewport is meant to scroll its own content rather than clip the bottom entries silently out of view; this has not been verified as the actual behavior on either surface at extreme sizes.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Material appearance system](material-appearance.md), [Command palette](command-palette.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/branch-integration",
      "category": "platform",
      "title": "Why forty-eight branches are still unmerged",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Security considerations",
          "id": "security-considerations"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "unbound-controls.md"
      ],
      "body": "# Why forty-eight branches are still unmerged\n\nForty-eight branches sit beside `master`, none of them an ancestor of it, every one holding\ncommits that are not on the default branch. That looks like a backlog nobody has got round to.\nIt is not: it was measured on 2026-08-24, and the reason each group is still separate is\nrecorded here so the same afternoon is not spent again.\n\n## Behavior\n\nNothing is at risk. Every one of the forty-eight is byte-identical on the remote — checked\nbranch by branch with `git ls-remote`, not assumed — so the work exists in two places and\ncleanup can never be the thing that loses it.\n\nThe branches divide cleanly:\n\n| Group | Count | State |\n| --- | --- | --- |\n| Conflict on merge | 26 | `git merge-tree` reports conflicts against `master` |\n| Merge cleanly, tree does not build | 20 | merged into a scratch branch; 57 type errors |\n| Merge refused during the batch | 2 | conflicted against an earlier branch in the same batch |\n\nThe middle group is the interesting one, because \"merges cleanly\" reads as \"ready to land\" and\nis not the same claim at all. Git merging without conflict means no two branches touched the\nsame lines. It says nothing about whether the result compiles, and here it does not.\n\n## Configuration\n\nNothing here is configurable. Reproduce the measurement with:\n\n```\ngit merge-tree --write-tree origin/master <branch>\n```\n\nfor the conflict split, then merge the clean ones onto a scratch branch and run the ordinary\nbuild.\n\n## Failure modes\n\nThe 57 errors are not scattered noise. Twenty-six of them are TS2339 — a property that does\nnot exist — across thirteen files, which is the signature of two branches carrying different\nversions of the same API rather than of one broken file. Two smaller instances were fixed\nwhile measuring, and both had that same shape:\n\n- Three changelog articles arrived without a top-level `# Title`, which the documentation\n  bundler requires. Straightforward, and they only exist on those branches.\n- `applyVocabularyText` was changed on one branch to take a classified boundary\n  (`{ text, boundary }`) instead of a bare string, while a caller on another branch still\n  passed a string. The fix is not to pick a boundary and hard-code it: `transformText` serves\n  both what a person reads and what a screen reader announces, so the caller has to say which,\n  and `alt` is an accessible name despite carrying no `aria-` prefix.\n\nFixing the remaining fifty-odd would mean reconciling two API generations across other\nsessions' work, blind, in a console that configures a real telephone exchange. A tree that\ncompiles is not evidence that it still behaves; that is a project with its own verification,\nnot a step in a cleanup pass.\n\n**So none of them were deleted, and none were force-merged.** A tidy branch list is not worth\nlosing work, and an integration nobody verified is worse than an unmerged branch, because it\nlooks finished.\n\n## Security considerations\n\nNone specific. The usual rule applies with more force than usual here: never resolve a merge\nconflict in a configuration writer by picking whichever side compiles. A wrong Asterisk key\ndoes not fail loudly — it writes a line that looks correct and the exchange obeys it.\n\n## Verification\n\n`git merge-base --is-ancestor <branch> origin/master` is the proof that must pass before any\nbranch is removed. On 2026-08-24 it passed for none of them, which is exactly why the cleanup\nhalf of that pass deleted nothing.\n\n## Suggested articles\n\n[Controls that do not write to a file](unbound-controls.md).\n"
    },
    {
      "id": "platform/browser-extension-download-surfaces",
      "category": "platform",
      "title": "Browser-extension download capture surfaces",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "long-operation-progress.md",
        "README.md"
      ],
      "body": "# Browser-extension download capture surfaces\n\nA companion browser extension's Start-download and in-progress-download dialogs, giving a real confirm/cancel decision and live transfer progress.\n\n## Behavior\n\nA Start-download dialog is meant to name the proposed file, source, and destination before anything transfers; a separate always-on-top Downloading dialog would show live progress, rate, and pause/resume/cancel controls for the real transfer underway.\n\n## Configuration\n\nBoth dialogs would reflect the actual queued and in-flight transfer rather than a simulated progress value.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application is not a browser and has no browser-extension download surface of this kind.\n\n**Documentation website:** Not implemented. The documentation website is not a browser extension and has no download-capture flow of this kind.\n\n## Failure modes\n\nN/A — with no extension or capture flow implemented, there is no failure path to describe.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Long-operation progress reporting](long-operation-progress.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/browser-style-tabs",
      "category": "platform",
      "title": "Browser-style tabbed navigation",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "tab-groups-and-searches.md",
        "command-palette.md",
        "material-appearance.md",
        "../app/appearance.md",
        "README.md"
      ],
      "body": "# Browser-style tabbed navigation\n\nPresents application and settings content as discrete, navigable tabs rather than one long scrolling page.\n\n## Behavior\n\nEvery major surface, including settings, is meant to use a persistent tab strip, dockable to any screen edge, with overflow handling, reordering, and pinning, rather than a single scrolling column.\n\n## Configuration\n\nTabs would support keyboard navigation with correct roles and states, and the strip would collapse gracefully at narrow widths without clipping labels.\n\n## Current status\n\n**Desktop application:** Partial. A left navigation rail separates the app's screens, which gives some of the navigational benefit of tabs, but there is no true tab strip with overflow handling, reordering, pinning, or edge-docking choice.\n\n**Documentation website:** Not implemented. Articles are presented as a navigable list with in-page section anchors rather than a browser-style tab strip.\n\n## Failure modes\n\nWhen more tabs are open than the strip can show, the intended behavior is an overflow menu listing the rest rather than silently clipping the last tab off-screen; there is no tab strip yet to overflow.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Tab groups and tab search](tab-groups-and-searches.md), [Command palette](command-palette.md), [Material appearance system](material-appearance.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/built-in-authenticator",
      "category": "platform",
      "title": "Built-in authenticator",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "per-element-toy-locks.md",
        "unlock-ladder.md",
        "../agent/secrets.md",
        "README.md"
      ],
      "body": "# Built-in authenticator\n\nAn in-app TOTP authenticator for arbitrary accounts, including QR-code pairing, so a user does not need a separate phone app.\n\n## Behavior\n\nA dedicated authenticator surface is meant to accept pairing by QR code, pasted `otpauth://` URI, or manual entry, then show live rotating codes for every registered account, entirely offline and locally stored.\n\n## Configuration\n\nA new pairing would be confirmed by entering one live code back before the entry is considered armed, so a mis-scanned secret is caught immediately rather than at the next login.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no authenticator surface of any kind.\n\n**Documentation website:** Not implemented. The documentation website has no accounts of its own for an authenticator to pair with.\n\n## Failure modes\n\nA clock skewed far enough that generated codes would be rejected everywhere is meant to be reported to the user in plain words; there is no authenticator yet to encounter that condition.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Per-element toy locks](per-element-toy-locks.md), [Unlock ladder](unlock-ladder.md), [Secrets](../agent/secrets.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/bulk-actions",
      "category": "platform",
      "title": "Bulk actions",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "complete-exports.md",
        "destructive-action-confirmation.md",
        "README.md"
      ],
      "body": "# Bulk actions\n\nMulti-select and batch operations across every list, table, and collection in the product, with an honest preview before anything irreversible runs.\n\n## Behavior\n\nEvery list is meant to support multi-select (click, shift-click ranges, and a keyboard equivalent), an honestly scoped select-all, and the same actions available singly — delete, export, move, tag, and so on — offered in bulk with a reviewable count and preview.\n\n## Configuration\n\nA bulk action would be undoable through local version history where the underlying action normally is, and would never silently skip an item without reporting it.\n\n## Current status\n\n**Desktop application:** Not implemented. Every list in the desktop application (servers, recordings, and similar) is single-selection only, with no multi-select, select-all, or batch action available.\n\n**Documentation website:** Not implemented. The documentation website has no user-owned lists to act on in bulk.\n\n## Failure modes\n\nIf an item in a bulk batch cannot complete the action (a locked record, a permission error), the intended behavior is to report that item as skipped in the result summary rather than silently omit it; there is no bulk mechanism yet to test this against.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Complete data export](complete-exports.md), [Destructive-action super confirmation](destructive-action-confirmation.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/changelog-viewer",
      "category": "platform",
      "title": "In-app changelog viewer",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "local-version-history.md",
        "status-hub.md",
        "../app/history.md",
        "README.md"
      ],
      "body": "# In-app changelog viewer\n\nA browsable record of every released version, filterable by date and searchable by text, with export and per-entry commit links.\n\n## Behavior\n\nThe viewer is meant to list every released version with categorized changes, a calendar-based date filter, a text search wired to the regex builder, and export to a durable text format, with each entry linked to the exact commit that made the change.\n\n## Configuration\n\nIts tone would follow the funny-level and language settings while every version number, date, and commit link stays exact regardless of tone.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no in-app changelog viewer; release history is not browsable from within the application.\n\n**Documentation website:** Not implemented. The documentation website links out to release notes rather than hosting an in-app browsable, filterable, searchable changelog view.\n\n## Failure modes\n\nA referenced commit that no longer exists in the repository is meant to be caught and reported before publishing, not linked as a dead reference; there is no changelog viewer yet to enforce that.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Local version history](local-version-history.md), [Status hub](status-hub.md), [History and git](../app/history.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/collapsible-filters",
      "category": "platform",
      "title": "Collapsible filters and statistics",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "regex-builder.md",
        "README.md"
      ],
      "body": "# Collapsible filters and statistics\n\nSearch bars, filter rows, and statistics panels that describe rather than change the current view start collapsed and can be reopened.\n\n## Behavior\n\nPurely descriptive controls, such as filter summaries and statistics panels, are meant to collapse by default, persist that collapsed state, and clearly indicate when a collapsed filter is still actively excluding results.\n\n## Configuration\n\nThe collapsed toggle would be keyboard-operable with a visible focus ring and be announced alongside its expanded or collapsed state.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application's filter and statistics areas, where present, are always expanded; there is no collapse control.\n\n**Documentation website:** Partial. The site's article list has no filter or statistics row to collapse; the underlying collapse behavior exists in the settings-page overlay controls but has not been extended to a filter or statistics panel.\n\n## Failure modes\n\nA collapsed filter that is still silently excluding results without any visible indicator is the specific failure this feature exists to prevent; there is no filter panel on either surface yet to check that against.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Regex builder](regex-builder.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/command-palette",
      "category": "platform",
      "title": "Command palette",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "regex-builder.md",
        "browser-style-tabs.md",
        "README.md"
      ],
      "body": "# Command palette\n\nA `Ctrl+Shift+F`-activated global search that jumps directly to any command, setting, or destination in the product.\n\n## Behavior\n\nThe palette is meant to list every command, feature page, destination, and setting, and to teleport the user to the exact matching control rather than only its containing page.\n\n## Configuration\n\nResults would render as rich, interactive rows — a settings row with its actual live control inline — rather than plain text, in either a compact or a full-window view.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no command palette or global keyboard-activated search of any kind.\n\n**Documentation website:** Partial. The site responds to `Ctrl+Shift+F` with a basic overlay that filters the article title list by substring; it does not index individual settings or in-page destinations, and results are plain text links rather than rich interactive rows.\n\n## Failure modes\n\nIf the underlying index were incomplete, the intended behavior is to show fewer results rather than a broken or unresponsive palette; the current site overlay degrades this way already, since it only ever indexes titles.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Regex builder](regex-builder.md), [Browser-style tabbed navigation](browser-style-tabs.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/complete-exports",
      "category": "platform",
      "title": "Complete data export",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "bulk-actions.md",
        "local-version-history.md",
        "README.md"
      ],
      "body": "# Complete data export\n\nEvery record, list, and view the product owns can be exported, in whichever format can faithfully carry that data.\n\n## Behavior\n\nEvery list, document, log, and setting is meant to be exportable in an appropriate format — JSON, CSV, Markdown, and others depending on the data's shape — stating encoding and any fields a format cannot carry before the export runs.\n\n## Configuration\n\nExports would be complete and, where the shape allows it, re-importable, rather than a partial dump of only the currently visible rows.\n\n## Current status\n\n**Desktop application:** Not implemented. No list, record, or setting anywhere in the desktop application can currently be exported to a file.\n\n**Documentation website:** Partial. The site's settings page includes a placeholder export button that is not wired to produce a file yet.\n\n## Failure modes\n\nWhere a chosen format cannot carry every field of a record, the intended behavior is to say so before the export runs rather than truncate silently afterward; the placeholder export button does not yet reach this decision point.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Bulk actions](bulk-actions.md), [Local version history](local-version-history.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/context-menu-shortcuts",
      "category": "platform",
      "title": "Right-click menus show keyboard shortcuts",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "command-palette.md",
        "README.md"
      ],
      "body": "# Right-click menus show keyboard shortcuts\n\nEvery context-menu item that has a keyboard shortcut displays it, right-aligned, in the platform's own notation.\n\n## Behavior\n\nA context menu is meant to show each item's real, currently-working keyboard shortcut beside its label, derived from the same source that registers the binding, never a guessed or stale one.\n\n## Configuration\n\nShortcuts would be exposed to assistive technology as shortcuts, not as decorative trailing text.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application's right-click menus, where they exist, do not display keyboard shortcuts beside their items.\n\n**Documentation website:** Not implemented. The documentation website has no right-click context menus of its own.\n\n## Failure modes\n\nA displayed shortcut that no longer matches the actual binding (because the binding changed and the label did not) is the specific failure this feature exists to prevent by deriving both from one source; there is nothing implemented yet to exercise that guarantee.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Command palette](command-palette.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/destructive-action-confirmation",
      "category": "platform",
      "title": "Destructive-action super confirmation",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "local-version-history.md",
        "bulk-actions.md",
        "../system/security.md",
        "README.md"
      ],
      "body": "# Destructive-action super confirmation\n\nA deliberately hard-to-trigger-by-accident confirmation gate for irreversible actions, requiring two independent keys plus a full-range slider.\n\n## Behavior\n\nBefore an irreversible action proceeds, the gate is meant to name the exact affected data, require two independently operated key controls, and only then allow a full-range confirmation slider, with an always-available emergency exit.\n\n## Configuration\n\nThe gate would anchor beside the triggering control where the layout allows it and remain fully keyboard-operable.\n\n## Current status\n\n**Desktop application:** Partial. Destructive actions use a single confirmation step (click or checkbox), not the two-key-plus-slider gate, and there is no dedicated emergency-exit control.\n\n**Documentation website:** Not implemented. The documentation website performs no destructive actions of its own.\n\n## Failure modes\n\nCancelling at any point (including through the emergency exit) is meant to leave the target data completely untouched; the existing single-step confirmation on the desktop app does support a plain cancel today, which is the one part of this contract already met.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Local version history](local-version-history.md), [Bulk actions](bulk-actions.md), [Security](../system/security.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/dialog-emojis",
      "category": "platform",
      "title": "Dialog emoji toggle",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "non-blocking-notifications.md",
        "README.md"
      ],
      "body": "# Dialog emoji toggle\n\nA persisted on/off switch controlling whether dialogs and message boxes show a decorative emoji alongside their factual text.\n\n## Behavior\n\nWhen enabled, dialogs are meant to get a relevant, non-semantic emoji; when disabled, the same factual copy is meant to appear with no emoji. The toggle would never add emoji to buttons, field labels, or other control text — only to descriptive dialog copy.\n\n## Configuration\n\nA single switch in application settings, reachable by keyboard, is meant to control this for every dialog at once.\n\n## Current status\n\n**Desktop application:** Not implemented. No toggle exists and no dialog in the product currently carries an emoji.\n\n**Documentation website:** Not implemented. The site has no application-style message boxes to decorate.\n\n## Failure modes\n\nN/A — a switch with no dialogs to affect has no meaningful failure mode of its own; failure would only arise once dialogs exist to decorate.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Non-blocking notifications](non-blocking-notifications.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/dim-sum-surprise",
      "category": "platform",
      "title": "Dim sum surprise",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "school-mode.md",
        "README.md"
      ],
      "body": "# Dim sum surprise\n\nA small, un-opt-outable 10% chance at each startup of showing a randomly chosen dim sum dish's name and picture.\n\n## Behavior\n\nOn roughly one in ten launches, a bundled local image of a dim sum dish is meant to appear briefly with its name in both English and Chinese, then dismiss itself automatically without blocking the interface from becoming usable.\n\n## Configuration\n\nThere is deliberately no setting to turn this off; the only configurable aspect is that School mode, once it exists, would suppress it along with every other optional capability.\n\n## Current status\n\n**Desktop application:** Partial. `dim-sum-surprise.ts` implements the whole draw as specified and as tested: a one-in-ten chance per launch with an exclusive probability boundary, exactly one draw per launch, suppression during a first run, an error path, an update, a mid-task flow and quiet hours, bilingual dish names with alt text, bundled local images, and a deliberate absence of an off switch (`storedPreferenceIsIgnored()` asserts that as a checkable fact). None of it runs: nothing in the mounted application calls this module. A grep for its two exports (`surpriseFor`, `storedPreferenceIsIgnored`) across `App.tsx`, `main.tsx`, `PbxAdminApp.tsx` and `PbxAdminIntegratedApp.tsx` finds no reference outside the module and its own test. Every real launch of the built application currently has a zero, not a one-in-ten, chance of showing a dish.\n\n**Documentation website:** Not implemented. A static documentation site has no startup event to attach this to.\n\n## Failure modes\n\nIf the bundled image set were ever missing an entry, the intended behavior is to skip that draw rather than show a broken image; the desktop module implements this, but since nothing calls the module, the behavior has never run outside its own test.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. The module's tests cover alt text for screen-reader users, but the surface itself is never mounted, so there is nothing in the running application to check focus order or motion behavior against yet.\n\n## Verification\n\n`tests/ui/dim-sum-surprise.test.tsx` exercises the draw logic, suppression rules, and the no-off-switch guarantee directly, in isolation from the running application. Verifying the wiring gap means launching the built desktop application repeatedly and confirming no dish ever appears -- which is the current, correct result, and the defect this article records.\n\n## Suggested articles\n\n[School mode](school-mode.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/external-editor-handoff",
      "category": "platform",
      "title": "External editor handoff",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "complete-exports.md",
        "../agent/ops.md",
        "README.md"
      ],
      "body": "# External editor handoff\n\nA one-click action to open the current project, file, or export directly in an installed code editor.\n\n## Behavior\n\nThe product is meant to detect installed editors and offer opening the current folder or a selected or exported file directly in one, with the choice persisted.\n\n## Configuration\n\nOpening a folder would open it as a workspace root rather than a single unrooted file, so surrounding project context is usable immediately.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no external editor detection or handoff action anywhere in its interface.\n\n**Documentation website:** Not implemented. The documentation website has no local files of the user's own to hand off to an editor.\n\n## Failure modes\n\nWhen no supported editor is installed, the intended behavior is a clear message naming that and an offer to get one, rather than a silently disabled or missing button; there is no handoff action yet to fail this way.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Complete data export](complete-exports.md), [Operations](../agent/ops.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/external-settings-sources",
      "category": "platform",
      "title": "External settings sources",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "scheduled-settings.md",
        "README.md"
      ],
      "body": "# External settings sources\n\nLets a scheduled setting take its value from a remote source — an HTTPS API or a home-automation boolean — instead of only from a fixed local schedule.\n\n## Behavior\n\nA scheduled rule is meant to be able to source its active or inactive value from a validated versioned HTTPS endpoint or a linked home-automation boolean entity, refreshing on a bounded interval.\n\n## Configuration\n\nThe source would be selected per rule alongside the local schedule fields, with the access token for a remote source kept in the operating system credential store rather than in a settings file.\n\n## Current status\n\n**Desktop application:** Not implemented. No external source integration exists; scheduled settings themselves are also not implemented, so there is nothing yet for a remote source to feed.\n\n**Documentation website:** Not implemented. No remote settings source exists on the site.\n\n## Failure modes\n\nOn a network failure, timeout, or malformed response, the intended behavior is to keep the last valid local value and surface a recovery notification rather than silently applying whatever the failed response contained; nothing implements that path today.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Scheduled settings](scheduled-settings.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/forge-publishing",
      "category": "platform",
      "title": "Forge publishing",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "external-editor-handoff.md",
        "../agent/ops.md",
        "README.md"
      ],
      "body": "# Forge publishing\n\nLets a user publish a repository to a chosen account or organization, with a non-forking fallback for providers that cannot fork.\n\n## Behavior\n\nA publish flow is meant to let the user choose the target account or organization from a real signed-in account list, and to offer copy-and-push as an alternative when the target provider cannot fork.\n\n## Configuration\n\nThe account list would be searchable and support adding further signed-in accounts through the same sign-in flow used for the first one.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application administers a telephony exchange and has no source-repository publishing feature.\n\n**Documentation website:** Not implemented. The documentation website has no repository-publishing feature of its own.\n\n## Failure modes\n\nN/A — with no publishing flow implemented, there is no failure path to describe.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[External editor handoff](external-editor-handoff.md), [Operations](../agent/ops.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/funny-levels",
      "category": "platform",
      "title": "Funny-level sliders",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "language-modes.md",
        "README.md"
      ],
      "body": "# Funny-level sliders\n\nTwo independent sliders, one per language, that control how playful the product's own copy sounds — from fully serious to maximum playfulness.\n\n## Behavior\n\nTwo sliders, English and Cantonese, are meant to each range from level 1 (fully professional wording) to level 5 (maximum playfulness), restyling every message category including warnings and errors without changing the underlying facts they carry.\n\n## Configuration\n\nSliders would live in settings, default to level 5 for both languages, and be changeable and resettable independently of each other.\n\n## Current status\n\n**Desktop application:** Partial. Both sliders exist in the design (`fun_level` for English, `fun_level_yue` for Cantonese, each ranging 1-5 and defaulting to 5) and `App.tsx` persists whichever value is chosen. What does not exist is the restyling itself: `funny-levels.ts` exports `renderMessage()`, the function that would take a message's facts and a chosen level and produce styled text, and nothing in the mounted application ever calls it -- a grep across the renderer finds it only inside its own file and test. Moving either slider today changes a stored number and nothing a person can see. One further wrinkle worth recording: the compiled console also has a long-standing, unrelated 0-4 \"fun mode\" dial (confetti, rainbow fills, motion) that happens to share the exact control id `fun_level` with this feature's slider, so the two systems silently read and write the same stored value without either knowing about the other.\n\n**Documentation website:** Partial, and more real than the desktop application's slider mechanism. `site/app.js` implements a genuine `COPY` table with eight keys, each carrying four real English and four real Cantonese phrasings, and `copyText()`/`copyLevel()` genuinely select and render the phrasing matching the chosen level -- changing the site's funny-level selects visibly changes rendered text. The gap is coverage and range: only eight strings on the whole site are wired to it (three through a `data-copy` attribute, five more used directly in notification code), and the site's selects offer four levels (0-3, defaulting to 0/Plain) rather than the canonical five levels defaulting to 5/Maximum.\n\n## Failure modes\n\nA message's facts (file names, error causes, irreversible-action warnings) are meant to stay exact at every level regardless of tone; if a restyled string ever disagreed with the underlying fact, that would be treated as a defect in the styling layer, not an acceptable trade-off.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. The desktop sliders and the site's selects are ordinary native controls reachable by keyboard, but no dedicated accessibility audit of either has been performed. Copy for this feature exists in both English and Cantonese wherever it is actually wired (the site's eight `COPY` keys); the desktop sliders persist correctly but currently style nothing.\n\n## Verification\n\n`tests/ui/funny-levels.test.tsx` exercises the desktop module's own logic (level bounds, storage round-trip, `renderMessage`'s fact-preservation) in isolation, not its absence of wiring into the mounted app. Verifying the wiring gap means opening the built application, moving either slider, and confirming that no rendered message changes tone -- and opening the site's settings page, moving either funny-level select, and confirming that the hero copy and the theme/motion descriptions on that page do change tone across the four available levels.\n\n## Suggested articles\n\n[Language modes](language-modes.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/guided-forms",
      "category": "platform",
      "title": "Guided forms",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "destructive-action-confirmation.md",
        "README.md"
      ],
      "body": "# Guided forms\n\nFields populated from real data wherever possible, sensible defaults, plain-language inline validation, and named reasons on every disabled control.\n\n## Behavior\n\nWherever a value can be enumerated or defaulted, the form is meant to do so — pickers over blank text boxes, a suggested default instead of an empty field, and inline validation that says what to type rather than only showing a red border.\n\n## Configuration\n\nEvery disabled control would state, in its own tooltip or adjacent text, exactly which condition is unmet and how to satisfy it.\n\n## Current status\n\n**Desktop application:** Partial. The desktop application's server and deployment forms mix real pickers for some fields with free-text entry for others; validation messages exist for some fields but not consistently, and not every disabled control names its exact blocking condition.\n\n**Documentation website:** Partial. The site's forms, such as the settings placeholders, are minimal and mostly unvalidated; inline validation guidance is largely absent.\n\n## Failure modes\n\nA field left blank or filled incorrectly is meant to be caught inline, in plain words, before submission is attempted; several forms on both surfaces still rely on submission itself, or a generic error, to reveal that a field was wrong.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Destructive-action super confirmation](destructive-action-confirmation.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/in-context-recovery",
      "category": "platform",
      "title": "In-context failure recovery",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "long-operation-progress.md",
        "README.md"
      ],
      "body": "# In-context failure recovery\n\nWhen an operation fails for a reason the user cannot diagnose alone, the recovery action is offered right at the control that failed, not buried in a menu.\n\n## Behavior\n\nA failed operation is meant to surface its recovery route — retry, re-authenticate, or an equivalent next step — directly beside the control that failed, naming the real cause rather than a generic error.\n\n## Configuration\n\nWhere the underlying cause is a refused credential or missing permission, the recovery route would offer re-authentication directly rather than sending the user hunting for a sign-in screen.\n\n## Current status\n\n**Desktop application:** Partial. The desktop application shows error messages for failed actions but does not consistently offer an inline recovery action at the point of failure; some errors require navigating elsewhere to retry.\n\n**Documentation website:** Not implemented. The documentation website performs no operations that can fail in this sense.\n\n## Failure modes\n\nAn error shown without a concrete next step is exactly the gap this feature exists to close; it is the current state for at least some failures on the desktop application today.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Long-operation progress reporting](long-operation-progress.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/language-modes",
      "category": "platform",
      "title": "Language modes",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "funny-levels.md",
        "school-mode.md",
        "../app/customise.md",
        "README.md"
      ],
      "body": "# Language modes\n\nLets a person pick English, playful Cantonese, or a bilingual view of every label the product shows.\n\n## Behavior\n\nA language mode setting is meant to control which language every user-facing string renders in, independent of the operating system's own locale, with three choices: English only, a playful Cantonese variant, and a bilingual mode showing both languages together without crowding the layout.\n\n## Configuration\n\nThe choice would live in application or site settings, persist across sessions, and apply to every screen at once rather than page by page.\n\n## Current status\n\n**Desktop application:** Not implemented. No language selector exists anywhere in the interface; every label is a fixed English string with no translation table behind it.\n\n**Documentation website:** Partial. A mode selector exists in site settings and changes visible copy on a handful of pages, not every string across the site.\n\n## Failure modes\n\nWhere a translation is missing for a chosen mode, the intended behavior is to fall back to English for that string rather than showing a blank or broken label; today there is nothing to fall back from, since no second language exists yet.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Funny-level sliders](funny-levels.md), [School mode](school-mode.md), [Customise everything](../app/customise.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/local-version-history",
      "category": "platform",
      "title": "Local version history",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "changelog-viewer.md",
        "destructive-action-confirmation.md",
        "../app/history.md",
        "README.md"
      ],
      "body": "# Local version history\n\nA Git-backed, browsable, restorable history of every user-managed record — documents, settings, accounts — kept locally and privately.\n\n## Behavior\n\nEvery creation, edit, and deletion of a user-owned record is meant to be recorded as a commit in a local, isolated repository, with a browsing panel offering filtering, diffing, labeling, and non-destructive restore.\n\n## Configuration\n\nRestoring would itself be recorded as a new revision rather than rewriting history, so a restore could itself be undone.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application keeps no local version history of any kind; settings and records are overwritten in place with no way to browse or restore a prior state.\n\n**Documentation website:** Not implemented. The documentation website has no user-managed records of its own to version.\n\n## Failure modes\n\nIf the local history repository became unreadable, the intended behavior is to keep the live data intact and report the history failure separately rather than blocking the operation that triggered it; nothing implements the repository today.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[In-app changelog viewer](changelog-viewer.md), [Destructive-action super confirmation](destructive-action-confirmation.md), [History and git](../app/history.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/long-operation-progress",
      "category": "platform",
      "title": "Long-operation progress reporting",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "browser-extension-download-surfaces.md",
        "README.md"
      ],
      "body": "# Long-operation progress reporting\n\nA dialog that starts a slow operation shows that operation's real progress inline, with the triggering control disabled against duplicate submission.\n\n## Behavior\n\nLong-running actions, such as provisioning a server, are meant to show real progress inside the originating dialog rather than a bare spinner, and to disable both the visible submit control and the underlying handler against a second, duplicate trigger.\n\n## Configuration\n\nWhere an operation includes a slow optional phase, the user would be able to decline it and be told plainly what declining leaves undone.\n\n## Current status\n\n**Desktop application:** Partial. Long actions show a generic busy indicator rather than real progress, and only the visible button — not confirmed keyboard re-entry — is guarded against duplicate submission.\n\n**Documentation website:** Not implemented. The documentation website triggers no long-running operations of its own.\n\n## Failure modes\n\nA second, keyboard-triggered submission arriving while an operation is already in flight is meant to be refused by the handler itself, not only by the disabled button; this has not been verified as blocked on the desktop application.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Browser-extension download capture surfaces](browser-extension-download-surfaces.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/material-appearance",
      "category": "platform",
      "title": "Material appearance system",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "app-logo-customization.md",
        "browser-style-tabs.md",
        "../app/appearance.md",
        "README.md"
      ],
      "body": "# Material appearance system\n\nRuntime theme, density, accent color, and typography controls, so a user can restyle the interface without editing any file.\n\n## Behavior\n\nA conformant visual system is meant to expose theme (light and dark), density, accent or seed color, and full font customization at runtime with a live preview, plus a per-element appearance editor reachable from any control's context menu.\n\n## Configuration\n\nColors would be chosen through a continuous picker with bidirectional conversion between common color notations rather than a fixed swatch grid; presets would be exportable and importable as files.\n\n## Current status\n\n**Desktop application:** Partial, and corrected 2026-08-25. The accent colour (hue/saturation/lightness), font family, font weight, and font size controls are genuinely live: changing any of them writes a real inline style onto the console's root element immediately, with no restart, persists across relaunch, and can be exported as a re-importable JSON theme file. There is no import path yet for that same file even though export is real, and the whole system is scoped to one global (wildcard) theme rather than the true per-element appearance editor the contract describes, because the compiled interface exposes no per-element CSS hook for a rule to be read back from. A `Theme: Dark / Light / Follow system` control also exists and persists, but it has no effect: the compiled design bakes literal dark-mode hex colours and pixel paddings rather than CSS custom properties the theme setting could switch, so it is a stored intention with no live consumer, in the same way a density control sits beside it.\n\n**Documentation website:** Partial. The site ships a fixed dark theme with no live theme switch, no accent picker, no density control, and no per-element editor.\n\n## Failure modes\n\nAn appearance change that fails to persist (for example, a write to a locked settings file) is meant to notify the user and keep the prior appearance in effect rather than silently reverting after the fact.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. Copy for this feature is available in every supported language mode.\n\n## Verification\n\n`console/tests/contracts/material-appearance.test.mjs` pins which of the six imported appearance symbols write real styles, which one (theme import) is dead, and the wildcard-only scoping, against the source directly. Verifying it by hand means opening the desktop application's appearance panel and dragging the hue control while watching the console's own text colour change live.\n\n## Suggested articles\n\n[App logo customization](app-logo-customization.md), [Browser-style tabbed navigation](browser-style-tabs.md), [Appearance](../app/appearance.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/narration",
      "category": "platform",
      "title": "Spoken narration",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "language-modes.md",
        "README.md"
      ],
      "body": "# Spoken narration\n\nAn optional, off-by-default text-to-speech narrator that reads app events aloud in a user-chosen language and voice.\n\n## Behavior\n\nThe narrator speaks application events using the platform's speech synthesis voices, in English, Cantonese, or both in sequence (English first, then Cantonese, strictly serialized -- never overlapping), with independently selectable voice, rate, and pitch per language. It stays off until the user turns it on with the **Narration** switch, and everything else it reads is a real, already-happening console event -- the non-blocking notifications the console shows (`fire`, the title-and-body kind) and the toast messages (the lighter one-line kind), including the ones the compiled console already raises on its own for a settings change (\"… set to true\", \"Nice … switched on.\"). Nothing was invented specifically to be narrated; the narrator reads what the console already says on screen.\n\nNarration is infrequent by design: ordinary (non-error) lines are rate-limited per category (see Configuration), and a line still queued when a newer one in the same category arrives is replaced rather than stacked, so the console never reads a backlog of superseded status lines aloud. A genuine failure -- currently the two boolean-checked daemon failures (\"The phone system did not start\" and daemon start/stop/restart's \"Not done\") -- is passed through as an error and is never dropped by that rate limit, however soon after another notice it arrives.\n\nThe narrator also yields to two things outside its own settings: an active screen reader (detected through Electron's own accessibility-support signal, forwarded from the main process) and the **Low stimulation** attention mode, which doubles as this feature's quiet-hours setting. Either one silences the narrator immediately, live, without needing to turn narration itself off.\n\n## Configuration\n\nSeven controls on the Customise screen (`nar_*`), each persisted independently:\n\n- **Narration** (`nar_enabled`) -- the master off/on switch. Off by default.\n- **Narrated language** (`nar_language`) -- English, Cantonese, or Both.\n- **English voice** / **Cantonese voice** (`nar_en_voice` / `nar_yue_voice`) -- populated from the voices this computer actually reports, defaulting to \"Choose automatically\" rather than a named voice nobody may have installed. The saved value is the voice's stable platform identity, not its display name, because names are not unique and are localized.\n- **Narration rate** / **Narration pitch** (`nar_rate` / `nar_pitch`) -- 0.5-2.0 and 0-2 respectively, matching the platform's own ranges.\n- **Narration status** (`nar_status`, read-only) -- states plainly which voice will actually speak right now, or exactly why nothing can: no voice chosen (using the system default), a chosen voice that isn't installed here (falling back, choice kept), a chosen voice that is network-backed and will go quiet offline, or no voice on this machine that can read the chosen language at all -- including the case where this computer has no speech synthesis whatsoever.\n\nEvery one of the seven applies live: the switch, the language, either voice, and both sliders reach the running narrator the instant they are chosen, not only on the next restart.\n\n## Current status\n\n**Desktop application: implemented.** `app/renderer/src/narration.ts` holds the pure, injectable `Narrator` (queue, per-category cooldown, \"both\" serialization, error bypass, voice-status resolution -- fully covered by `tests/ui/narration.test.tsx`). `app/renderer/src/narration-engine.ts` is the one real `SpeechEngine` adapter over the platform's Web Speech API, falling back to a null engine that never speaks but still resolves and reports honestly when no `speechSynthesis` exists at all (`tests/ui/narration-engine.test.tsx`). `App.tsx` constructs one `Narrator` for the life of the component, wires the seven controls to it, and narrates through the console's own existing notification paths (`fire`/`toast`) rather than a second, parallel event system -- proven reached from the real mount chain, not merely imported, by `tests/ui/narration-wired.test.tsx`.\n\nScreen-reader ducking is wired through `app/electron/main.ts` (`app.isAccessibilitySupportEnabled()` and its change event) and `app/electron/preload.ts`/`preload.cjs`, exposed to the renderer as `window.dingDesktop.accessibility`. It is optional on the bridge, exactly like `provisioning`: the hosted HTTP surface has no Electron main process behind it and degrades to doing nothing rather than guessing.\n\n**Documentation website: not implemented.** A static documentation site has no application events of the kind this feature narrates -- nothing changed here.\n\n## Failure modes\n\nSpeech synthesis being unavailable is a reported state, not a silent no-op: the **Narration status** control says so plainly (either \"no speech synthesis on this computer\" from the initial enumeration, or \"no voice on this machine can read \\<language\\>\" once a control is touched and the status is recomputed from the same honest voice-resolution logic). Enabling narration and firing an event on a machine with no synthesis does not throw or hang -- there is simply nothing to speak through, and the status line says exactly that. A synthesis error mid-utterance (the adapter's `onerror`) resolves that one utterance and lets the queue continue, rather than blocking every line behind it.\n\n## Accessibility and localization\n\nThe narrator ducks under a real, currently-active screen reader (not a guess -- Electron's own accessibility-support signal) and under the **Low stimulation** attention mode, both live. Its own seven controls follow the console's standing accessibility contract (keyboard reachability, visible focus, correct roles and names) as ordinary compiled console controls. Narrated copy is currently the console's own English notification text; it is not yet independently translated per narrated-language selection beyond the voice/engine actually speaking Cantonese when chosen.\n\n## Verification\n\n`tests/ui/narration.test.tsx` -- the pure `Narrator` logic (queue, cooldown, \"both\" serialization, supersession, voice-status resolution, dispose) against a fake `SpeechEngine`.\n\n`tests/ui/narration-engine.test.tsx` -- the real `SpeechEngine` adapter against a fake `speechSynthesis`/`SpeechSynthesisUtterance` platform, including the no-synthesis-at-all fallback.\n\n`tests/ui/narration-wired.test.tsx` -- the real `App`, mounted (`componentDidMount` actually called, not skipped), driven through its real controls (`setVal`, `fire`, `toast`) exactly as a user or the compiled console would: off by default, enabling causes real speech, disabling silences it again, \"Both\" serialization, the cooldown-vs-error distinction at the real daemon-failure call sites, the honest no-synthesis status, late voice enumeration, screen-reader ducking, Low-stimulation quiet-hours ducking, and a source-anchored guard that the wiring itself (the `Narrator` import and the live `.enqueue(` calls) is actually present rather than merely available. Supersession specifically is proven in the pure suite above rather than re-derived at the mount level -- see the comment above the (deliberately absent) mount-level \"burst\" test in that file for why: the real, non-zero default cooldown structurally prevents observing \"replace, don't stack\" through a synchronous burst of same-category events, which is exactly why the pure test isolates that property with a near-zero cooldown.\n\n## Suggested articles\n\n[Language modes](language-modes.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/non-blocking-notifications",
      "category": "platform",
      "title": "Non-blocking notifications",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "dialog-emojis.md",
        "status-hub.md",
        "../app/notifications.md",
        "README.md"
      ],
      "body": "# Non-blocking notifications\n\nToast-style status messages anchored in a screen corner, used for anything that only informs rather than something the user must decide on.\n\n## Behavior\n\nInformational, success, progress, and non-decision error messages are meant to appear as auto-dismissing (persistent for warnings and errors) toasts anchored to a screen corner, stacking without overlapping, reserving blocking dialogs strictly for confirmations and destructive-action gates.\n\n## Configuration\n\nNotifications would carry an optional title, body, and action links, and remain reviewable afterward in a notification history rather than vanishing without a trace.\n\n## Current status\n\n**Desktop application:** Partial. The desktop application shows a small number of transient status messages during build and deployment actions, but they are not consistently corner-anchored, do not stack predictably, and there is no notification history panel to review a dismissed one.\n\n**Documentation website:** Implemented. The documentation website surfaces confirmation and copy-to-clipboard toasts as non-blocking corner notifications with auto-dismiss timing.\n\n## Failure modes\n\nA notification that fails to render (for example, a missing template) is meant to fall back to a plain-text toast rather than silently drop; there is still no reviewable notification history on either surface to check that against.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Dialog emoji toggle](dialog-emojis.md), [Status hub](status-hub.md), [Notifications](../app/notifications.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/offline-documentation-browser",
      "category": "platform",
      "title": "Offline documentation browser",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "command-palette.md",
        "README.md"
      ],
      "body": "# Offline documentation browser\n\nA fully offline, in-app documentation browser bundling every feature article, with internal links and a search bar, independent of the public documentation website.\n\n## Behavior\n\nEvery article is meant to be bundled into the application at build time, rendered through one shared markdown renderer, with article-to-article links resolving inside the browser and a search bar covering both titles and article bodies.\n\n## Configuration\n\nA completeness guard would fail the build if any article file present in the source tree were missing from the bundle.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no in-app documentation browser; it links out to the public documentation website instead of bundling articles for offline use.\n\n**Documentation website:** Partial. The documentation website itself hosts and renders these same articles online, with in-page section navigation and inter-article links, but it depends on network access and is not the bundled in-app offline browser this feature describes; there is also no full-text search across article bodies yet, only the article list.\n\n## Failure modes\n\nAn article present in the source tree but missing from a build's bundle is meant to fail that build outright; the site's own build script instead simply reflects whatever exists on disk, which is a different and looser guarantee than this feature calls for.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Command palette](command-palette.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/per-element-toy-locks",
      "category": "platform",
      "title": "Per-element toy locks",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "support-tickets.md",
        "support-tickets.md",
        "unlock-ladder.md",
        "built-in-authenticator.md",
        "../system/security.md",
        "README.md"
      ],
      "body": "# Per-element toy locks\n\nA self-imposed, for-fun password or one-time-code lock a user can put on any individual control or setting, purely as a personal speed bump.\n\n## Behavior\n\nAny rendered element is meant to be lockable behind a password or a TOTP code entered independently for that one element, with its own credential, unlock duration, and recovery path.\n\n## Configuration\n\nThis is explicitly a user-experience convenience, not a security boundary: it would never claim to protect data from anyone else with access to the device, and recovery is by deleting the application's local data folder.\n\n## Current status\n\n**Desktop application:** Partial, and corrected 2026-08-25. Right-clicking any element offers a real, wired \"Lock this element...\" context-menu command (shortcut hint shown as ^L) that opens a per-element lock-creation wizard with its own credential, independent of every other lock. The wizard genuinely offers six methods, including three one-time-code combinations (PIN + one-time code, Password + one-time code, Password + PIN + one-time code), and a locked element's own unlock dialog verifies a real RFC 6238 code alongside PIN and password. The gap that remains: the PIN, password, and TOTP secret are all stored in plain React component state rather than the operating system's credential vault, so a credential set here lives in memory no more carefully than an ordinary setting does.\n\n**Documentation website:** Not implemented. The documentation website has no user-editable elements to lock.\n\n## Failure modes\n\nA forgotten per-element credential is recoverable only by deleting the local application-data folder, never by a support process (see [Support Tickets recovery flow](support-tickets.md), which points there on purpose).\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. Copy for this feature is available in every supported language mode.\n\n## Verification\n\n`console/tests/contracts/per-element-toy-locks.test.mjs` pins the wizard's TOTP-including methods, the context-menu command, and the plain-component-state credential gap against the source directly. Verifying it by hand means opening the desktop application, right-clicking any element, and walking the wizard.\n\n## Suggested articles\n\n[Support Tickets recovery flow](support-tickets.md), [Unlock ladder](unlock-ladder.md), [Built-in authenticator](built-in-authenticator.md), [Security](../system/security.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/personal-vocabulary-upload",
      "category": "platform",
      "title": "Personal vocabulary upload",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "language-modes.md",
        "README.md"
      ],
      "body": "# Personal vocabulary upload\n\nLets a user supply a local JSON file that remaps specific words in the interface to their own preferred terms, with no data leaving the device.\n\n## Behavior\n\nA file-upload control is meant to accept a bounded, versioned local JSON file of word replacements, apply it to user-facing text only, and clear back to original wording when the file is removed.\n\n## Configuration\n\nValidation would bound file size, nesting depth, and entry count, and make no network request of any kind when loading, applying, or clearing the file.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no personal-vocabulary upload control anywhere in its settings.\n\n**Documentation website:** Partial. The site's settings page includes a placeholder upload control; no file validation, no applied replacement, and no clear/reset behavior are wired up behind it yet.\n\n## Failure modes\n\nA malformed or oversized uploaded file is meant to be rejected with the exact reason shown inline, and the previous vocabulary state left untouched; the placeholder control does not yet reach this validation step.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Language modes](language-modes.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/provider-markup-rendering",
      "category": "platform",
      "title": "Provider-authored markup rendering",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "changelog-viewer.md",
        "offline-documentation-browser.md",
        "README.md"
      ],
      "body": "# Provider-authored markup rendering\n\nText authored elsewhere — release notes, imported documents — is rendered as real formatted markup rather than printed as raw source characters.\n\n## Behavior\n\nProvider-authored markdown-like text is meant to be rendered through one shared, isolated renderer producing real headings, links, and lists, rather than showing literal hash marks and brackets to the reader.\n\n## Configuration\n\nThe renderer would keep an honest empty state when no content is provided, rather than presenting a blank area that looks like a loading failure.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application does not currently render externally authored markup text in this sense.\n\n**Documentation website:** Implemented. The documentation website's own articles are authored in markdown and rendered through one shared renderer, producing real headings, links, lists, and section navigation rather than raw markdown characters. This is the website's own authored content rather than third-party provider text, but the rendering mechanism itself is the one this feature describes.\n\n## Failure modes\n\nMalformed markdown in a source article is meant to degrade to plain paragraphs rather than break the page layout; the site's renderer has not been separately stress-tested against adversarial input.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[In-app changelog viewer](changelog-viewer.md), [Offline documentation browser](offline-documentation-browser.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/README",
      "category": "platform",
      "title": "Platform feature contracts",
      "headings": [
        {
          "title": "Exemptions",
          "id": "exemptions"
        }
      ],
      "links": [
        "language-modes.md",
        "funny-levels.md",
        "dialog-emojis.md",
        "school-mode.md",
        "narration.md",
        "scheduled-settings.md",
        "external-settings-sources.md",
        "dim-sum-surprise.md",
        "regex-builder.md",
        "non-blocking-notifications.md",
        "status-hub.md",
        "material-appearance.md",
        "app-logo-customization.md",
        "browser-style-tabs.md",
        "tab-groups-and-searches.md",
        "command-palette.md",
        "destructive-action-confirmation.md",
        "local-version-history.md",
        "changelog-viewer.md",
        "external-editor-handoff.md",
        "complete-exports.md",
        "bulk-actions.md",
        "accessibility.md",
        "responsive-sizing.md",
        "personal-vocabulary-upload.md",
        "per-element-toy-locks.md",
        "support-tickets.md",
        "unlock-ladder.md",
        "built-in-authenticator.md",
        "attention-modes.md",
        "browser-extension-download-surfaces.md",
        "offline-documentation-browser.md",
        "app-display-name.md",
        "guided-forms.md",
        "bounded-overlays.md",
        "context-menu-shortcuts.md",
        "long-operation-progress.md",
        "in-context-recovery.md",
        "provider-markup-rendering.md",
        "forge-publishing.md",
        "collapsible-filters.md",
        "automatic-updates.md"
      ],
      "body": "# Platform feature contracts\n\nThis category documents the canonical platform feature contracts this product is expected to implement, and states plainly, per surface, which of them are actually built today.\n\nThe two surfaces referenced throughout are the desktop application (the installed Windows console) and the documentation website (this published site).\n\n- [Language modes](language-modes.md)\n- [Funny-level sliders](funny-levels.md)\n- [Dialog emoji toggle](dialog-emojis.md)\n- [School mode](school-mode.md)\n- [Spoken narration](narration.md)\n- [Scheduled settings](scheduled-settings.md)\n- [External settings sources](external-settings-sources.md)\n- [Dim sum surprise](dim-sum-surprise.md)\n- [Regex builder](regex-builder.md)\n- [Non-blocking notifications](non-blocking-notifications.md)\n- [Status hub](status-hub.md)\n- [Material appearance system](material-appearance.md)\n- [App logo customization](app-logo-customization.md)\n- [Browser-style tabbed navigation](browser-style-tabs.md)\n- [Tab groups and tab search](tab-groups-and-searches.md)\n- [Command palette](command-palette.md)\n- [Destructive-action super confirmation](destructive-action-confirmation.md)\n- [Local version history](local-version-history.md)\n- [In-app changelog viewer](changelog-viewer.md)\n- [External editor handoff](external-editor-handoff.md)\n- [Complete data export](complete-exports.md)\n- [Bulk actions](bulk-actions.md)\n- [Accessibility](accessibility.md)\n- [Responsive and high-scale sizing](responsive-sizing.md)\n- [Personal vocabulary upload](personal-vocabulary-upload.md)\n- [Per-element toy locks](per-element-toy-locks.md)\n- [Support Tickets recovery flow](support-tickets.md)\n- [Unlock ladder](unlock-ladder.md)\n- [Built-in authenticator](built-in-authenticator.md)\n- [Attention-support modes](attention-modes.md)\n- [Browser-extension download capture surfaces](browser-extension-download-surfaces.md)\n- [Offline documentation browser](offline-documentation-browser.md)\n- [Renameable app display name](app-display-name.md)\n- [Guided forms](guided-forms.md)\n- [Bounded, self-painting overlays](bounded-overlays.md)\n- [Right-click menus show keyboard shortcuts](context-menu-shortcuts.md)\n- [Long-operation progress reporting](long-operation-progress.md)\n- [In-context failure recovery](in-context-recovery.md)\n- [Provider-authored markup rendering](provider-markup-rendering.md)\n- [Forge publishing](forge-publishing.md)\n- [Collapsible filters and statistics](collapsible-filters.md)\n- [Automatic updates](automatic-updates.md)\n\n## Exemptions\n\nTwo further canonical features were considered for this product and deliberately excluded by the owner rather than left unbuilt by omission: an Ollama model-manager suite and a general local file converter. Neither shares a data path, a target, or a control surface with the rest of this console. The recorded reason for each exclusion lives in `console/inventories/exemptions.json`, not repeated here, so there is exactly one place that reason can drift out of date.\n\n"
    },
    {
      "id": "platform/regex-builder",
      "category": "platform",
      "title": "Regex builder",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "command-palette.md",
        "tab-groups-and-searches.md",
        "collapsible-filters.md",
        "README.md"
      ],
      "body": "# Regex builder\n\nA guided pattern-building tool attached to every search field, letting a user construct a regular expression without knowing the syntax by heart.\n\n## Behavior\n\nEvery search bar, dropdown filter field, and context-menu filter is meant to carry an adjacent, anchored regex builder offering guided construction, a raw pattern editor, sample text, and live match feedback, with plain text staying the default search mode.\n\n## Configuration\n\nQuery, pattern, flags, and mode would stay synchronized bidirectionally between the search field and its builder popover; pattern and sample size would be bounded to protect against runaway evaluation.\n\n## Current status\n\n**Desktop application:** Partial. The desktop application's filter fields accept plain-text substring queries and have no adjacent builder affordance, raw pattern editor, or guided construction controls.\n\n**Documentation website:** Partial. The site's search input is plain-text only with no builder affordance, guided construction, or pattern/flags UI.\n\n## Failure modes\n\nA pathological pattern is meant to be time- and step-bounded so it cannot hang the evaluating process; today there is no evaluator to bound, since there is no regex mode on either surface.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Command palette](command-palette.md), [Tab groups and tab search](tab-groups-and-searches.md), [Collapsible filters and statistics](collapsible-filters.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/responsive-sizing",
      "category": "platform",
      "title": "Responsive and high-scale sizing",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "accessibility.md",
        "material-appearance.md",
        "README.md"
      ],
      "body": "# Responsive and high-scale sizing\n\nNo clipped, truncated, or overlapping text or controls at narrow window widths, high display scales, or with the longest localized strings.\n\n## Behavior\n\nLayouts are meant to hold correctly at supported window widths and at 100/125/150/200% display scale, including the longest strings a bilingual mode would produce.\n\nThe desktop shell (`app/renderer/src/App.tsx`'s compiled console) has no `className` or `data-*` hook on any layout element — every dimension the design compiler emits is a literal pixel value baked into an inline `style` string for the console's own default 1440px window (see `app/renderer/src/dc-runtime.tsx`'s `sty()`). `app/renderer/src/styles.css` is the one place that can still change how that markup renders, because it is loaded after the compiled stylesheet and can target the same inline styles through `[style*=\"…\"]` attribute selectors — the same technique the compiled design's own (currently dead — see below) `[style*=\"display:grid\"] > *` rule already reaches for.\n\nTwo real width breakpoints now live there:\n\n- **1200px** — the 268px section-list column gives back some of its fixed width (220px) once the window has clearly left the 1440px default behind.\n- **1000px**, close to the console's own enforced 920px minimum window width (`app/electron/main.ts`, `minWidth: 920`) — the section list narrows further (176px), the 88px icon rail narrows too (72px), and every multi-column `display:grid` layout in the compiled console (stat tiles, table headers and rows, dialog layouts, the mini-games) collapses to a single flexed column, because CSS Grid never reflows a fixed-pixel or excess-column template on its own and there is no per-screen hook to retune any one of them individually.\n\nAlongside the breakpoints, `styles.css` also restores a fix the compiled design already tried to ship and never actually applied: `[style*=\"display: flex\"] > *, [style*=\"display: grid\"] > * { min-width: 0; }`, letting a flex or grid child shrink below its own content size instead of refusing to and overflowing its row. This is unconditional (not gated to a narrow window) because it only changes anything when a row is genuinely short of room.\n\n## Configuration\n\nThis is verified against the real built interface at each width rather than assumed from source. There is no user-facing setting; the shell responds to its own window width.\n\n## Current status\n\n**Desktop application:** Partial, and meaningfully improved. Real `@media (max-width: …)` breakpoints exist for the first time (previously the only `@media` rule anywhere in the app responded to `prefers-reduced-motion`, a user preference, never window width — `design-styles.css`, the compiled design output, still has zero `@media` rules of its own). Verified live against the real built Electron app (see Verification below) at the console's own enforced 920px floor and down to 700px (below that floor, for defence in depth): the two structural shell columns narrow, every multi-column grid collapses to a single column, and a real, previously-clipped control (the \"+ New …\" button on every `isTableLike` screen's filter row, cut off the right edge of the window at 920px before this change) is now fully on-screen.\n\nNot covered by this pass: 150%/200% Windows display-scale was reasoned about rather than measured on real hardware DPI (Chromium lays out in CSS pixels regardless of the OS scale factor, so a window-width fix in CSS pixels applies identically at every scale — but that reasoning has not been checked against an actual scaled display). Below the console's enforced 920px floor, the title bar's own menu row (a separate, JS-computed overflow mechanism in `App.tsx`, not a CSS layout problem) can still show overlapping menu labels at very narrow widths (observed at 700px); that floor keeps a real user from ever reaching it, so it is recorded here rather than chased through a boundary this fix could not cross.\n\n**Documentation website:** Partial. The site is responsive down to roughly phone width using relative units and wrapping containers, but has not been verified at every display scale or against long bilingual strings, since bilingual mode does not yet exist. Unchanged by this work.\n\n## Failure modes\n\nClipped or overlapping text below the verified range is the specific failure this feature exists to prevent. The desktop shell is now verified clipping-free and overlap-free at and above its own enforced 920px minimum window width; below that floor (unreachable in the shipped app, but a possible target for a future change to `minWidth` or for a test harness) the fix still substantially helps but the separate title-bar overflow mechanism noted above is a known remaining gap.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference — the pre-existing `prefers-reduced-motion` rule in `styles.css` is untouched by this change. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English, and the breakpoints act on layout, not on any string.\n\n## Verification\n\n`console/tests/ui/responsive-breakpoints.test.mjs` asserts, against the real `styles.css` text, that: at least two genuine `max-width` breakpoints exist (not merely a per-control variant); the 1200px and 1000px tiers are both present; the icon rail and section list narrow inside the 1000px tier; every grid collapses to a flexed column inside that same tier; the `min-width: 0` restoration exists unconditionally, outside every `@media` block; and the pre-existing `prefers-reduced-motion` rule is untouched. It strips CSS comments before matching (so a commented-out rule cannot satisfy it) and anchors every `@media` match to the start of a line via brace-depth counting rather than a substring or a lazy cross-block regex. Three negative-regression cases (a mutated selector, a commented-out restoration rule, and a breakpoint condition rewritten to a value that can never match) each turn the check red; a fourth confirms `design-styles.css` — the compiled design output — still ships zero `@media` rules of its own, i.e. the responsive mechanism lives only in the hand-written file.\n\nBeyond the automated check, this was also verified by driving the real built Electron app headlessly (Chrome DevTools Protocol against the packaged renderer) across window widths from 700px to 1440px, on the Dashboard, PJSIP endpoints, Live channels, and Trunks & registrations screens, both before and after this change.\n\n## Suggested articles\n\n[Accessibility](accessibility.md), [Material appearance system](material-appearance.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/scheduled-settings",
      "category": "platform",
      "title": "Scheduled settings",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "external-settings-sources.md",
        "README.md"
      ],
      "body": "# Scheduled settings\n\nLets a user schedule when a setting — language, theme, density, and the like — takes effect, by date, time, and weekday.\n\n## Behavior\n\nA schedule editor is meant to let a rule pick an optional start and end date, a start and end time, and either every day or specific weekdays, then apply a chosen setting value only during that window, respecting the user's local timezone including daylight-saving behavior.\n\n## Configuration\n\nRules would be stored with stable identifiers and deterministic precedence for when more than one rule could apply at the same moment.\n\n## Current status\n\n**Desktop application:** Not implemented. No schedule editor and no scheduled-value application logic exist anywhere in the product.\n\n**Documentation website:** Not implemented. No scheduling surface exists on the site.\n\n## Failure modes\n\nAn invalid or overlapping schedule is meant to be rejected with a specific inline reason rather than silently applied; there is nothing to validate today because no schedule editor exists.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[External settings sources](external-settings-sources.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/school-mode",
      "category": "platform",
      "title": "School mode",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "language-modes.md",
        "funny-levels.md",
        "dim-sum-surprise.md",
        "../app/customise.md",
        "README.md"
      ],
      "body": "# School mode\n\nA single, renamable, shared switch that forces plain English presentation and hides playful or optional capabilities across every installed surface at once.\n\n## Behavior\n\nOne shared on/off state, stored outside any individual application, is meant to be read live by every surface: turning it on anywhere would turn it on everywhere without a restart, forcing English presentation and making every optional or playful capability behave as though uninstalled.\n\n## Configuration\n\nTurning the mode back off is meant to require a locally verified credential; the mode's own label is renamable, and every surface would respect the chosen name rather than the shipped default.\n\n## Current status\n\n**Desktop application:** Partial. The shared switch, credential-gated deactivation, and rename all exist and are wired: `school-mode.ts`'s `activateSchoolMode`, `deactivateSchoolMode`, `hasCredential`, `renameSchoolMode`, `schoolModeActive` and `setCredential` are all imported and called by `App.tsx`, backed by 32 tests including one that asserts no output leaks the shipped name after a rename. Turning the mode on and off, renaming it, and setting its credential are all real. What is not wired is the mode's actual point: `school-mode.ts` also exports `capabilityVisible()`, `filterVisibleCapabilities()`, `effectiveLanguageMode()` and `effectiveFunnyLevel()` -- the functions that would force English and hide optional capabilities -- and none of them are called anywhere in the mounted application. `schoolModeActive()` itself is read only to build the status control's text. Activating School mode today changes what one status line says and nothing else; it does not force English, does not hide any capability, and no other feature (language mode, funny levels, or any gated control) checks it.\n\n**Documentation website:** Not implemented. No shared switch, rename path, or unlock credential exists anywhere in `site/app.js` or the settings page.\n\n## Failure modes\n\nIf the shared state store were unreachable, the intended behavior is to leave the previous known mode in effect and say so, rather than silently defaulting to unlocked. The desktop implementation has not been exercised against an unreachable store, so this fallback is untested rather than absent.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. The desktop controls (switch, rename field, credential field, unlock switch, status readout) are ordinary native controls reachable by keyboard, but no dedicated accessibility audit has been performed. Copy for this feature is currently fixed English on both surfaces.\n\n## Verification\n\n`tests/ui/school-mode.test.tsx` and `tests/ui/credential-field.test.tsx` (32 tests total) exercise the switch, rename, and credential logic directly, not its lack of effect on the rest of the app. Verifying the capability-hiding gap means activating School mode in the built application and confirming that the language mode, funny levels, and every other optional or playful control remain exactly as visible and functional as before -- they currently do, which is the defect this article now records rather than hides.\n\n## Suggested articles\n\n[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [Dim sum surprise](dim-sum-surprise.md), [Customise everything](../app/customise.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/status-hub",
      "category": "platform",
      "title": "Status hub",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "non-blocking-notifications.md",
        "changelog-viewer.md",
        "../agent/hub.md",
        "README.md"
      ],
      "body": "# Status hub\n\nA shared, live status page reporting what the product's own maintenance work is currently doing — what is running, what has landed, and what is blocked.\n\n## Behavior\n\nA status surface is meant to show real-time build, verification, and release state with evidence behind every claim, distinct from the product's own PBX operational dashboards.\n\n## Configuration\n\nIt would update one page in place rather than mint a new page per update, and carry emoji-coded states that never claim a check passed before it has actually run.\n\n## Current status\n\n**Desktop application:** Not implemented. No such development-status page exists for this product on the desktop application.\n\n**Documentation website:** Not implemented. No such development-status page exists on the site either.\n\n## Failure modes\n\nIf the underlying build or release data were unreachable, the intended behavior is to say so on the page rather than show a stale state as current; nothing implements that today.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Non-blocking notifications](non-blocking-notifications.md), [In-app changelog viewer](changelog-viewer.md), [Agent hub](../agent/hub.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/support-tickets",
      "category": "platform",
      "title": "Support Tickets recovery flow",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "per-element-toy-locks.md",
        "README.md"
      ],
      "body": "# Support Tickets recovery flow\n\nA playful, entirely local, fake support-desk flow that helps a user recover from forgetting a toy-lock credential by pointing them at their own local data folder.\n\n## Behavior\n\nA mock ticket form is meant to lead, after a canned first response, to opening the application's local data folder in the file manager so the user can delete it themselves — nothing sent anywhere and no real ticket created.\n\n## Configuration\n\nOne unmissable, unstyled line would state plainly that nothing leaves the device and nobody is reading the ticket, regardless of the active funny level.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no such recovery flow; there is no per-element locking for it to recover from, and no mock support surface exists.\n\n**Documentation website:** Not implemented. The documentation website has no locks for this recovery flow to serve.\n\n## Failure modes\n\nIf the file manager cannot be launched on a given machine, the intended behavior is to show the exact folder path as text so the user can navigate there manually; nothing implements the flow yet to hit that fallback.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Per-element toy locks](per-element-toy-locks.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/tab-groups-and-searches",
      "category": "platform",
      "title": "Tab groups and tab search",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "browser-style-tabs.md",
        "regex-builder.md",
        "README.md"
      ],
      "body": "# Tab groups and tab search\n\nLets a user organize open tabs into named, colored groups and search across them from four distinct entry points.\n\n## Behavior\n\nTabs are meant to support pinning and named or colored grouping, plus four separate searches: the current strip, inside one group, across group names, and a master search spanning every open tab.\n\n## Configuration\n\nEach search would carry its own adjacent regex builder and reveal a match inside a collapsed group without permanently expanding it.\n\n## Current status\n\n**Desktop application:** Not implemented. The desktop application has no concept of multiple open tabs to group or search across.\n\n**Documentation website:** Not implemented. The site has no open-tab concept either.\n\n## Failure modes\n\nN/A — with no tab or group model implemented on either surface, there is no failure path to describe yet.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Browser-style tabbed navigation](browser-style-tabs.md), [Regex builder](regex-builder.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "platform/unbound-controls",
      "category": "platform",
      "title": "Controls that do not write to a file, and why",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Removed rather than bound",
          "id": "removed-rather-than-bound"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../platform/README.md",
        "../platform/README.md"
      ],
      "body": "# Controls that do not write to a file, and why\n\nMost of this console's telephony controls are bound to a real Asterisk key, and the ones\nthat are not have been treated as a backlog of typing. Going through them one at a time,\nmost are not. They are shapes that do not correspond to a single key, and writing a binding\nfor any of them would mean inventing behaviour and calling it configuration.\n\nThis records each remaining one with its actual reason, so nobody re-derives the same\nanswers, and so a decision to change the design is taken deliberately rather than by\nsomebody filling in what looks like a blank.\n\n## Behavior\n\nA binding maps one control to one key inside one section of one file. Two extensions to\nthat shape already exist, and both were added because a real control needed them:\n\n- **Composite.** Two controls share one value that carries two things, such as\n  `tlsbindaddr=address:port`. Each owns its half and leaves the other alone on write.\n- **Section by type.** The section is identified by the `type=` declared inside it rather\n  than by its name, because `pjsip.conf` and `iax.conf` name each section after the object\n  it configures. Several types may be accepted at once, since an IAX peer is written\n  `type=peer` or `type=friend`.\n\nEverything below needs something neither of those provides.\n\n### One control, several keys\n\nThe conference **announce** picker offers off, tone, name and count, and `confbridge.conf`\nspells that across `announce_join_leave` and `announce_user_count` — two independent\nbooleans. A binding that wrote one would leave the other saying something different.\n\n### A control whose values are sections, not a value\n\nThe CDR **backend** picker would offer csv, odbc, pgsql and the rest. `cdr.conf` has no key\nnaming a backend: each is its own `[section]`, and choosing one means writing a section. The\n**active ACL** picker on the security screen is the same shape against `acl.conf`.\n\n**This one never came back as a picker, and it is not going to.** What it got instead, on the\nCDR/CEL screen, is a live `d_status`/`l_status` readout: what cdr.conf/cel_odbc.conf/\ncel_pgsql.conf actually have configured, against what the target's running Asterisk actually\nhas registered (`cdr show status`, and `modules show` for the `cel_*.so` module names) --\nanswering \"which backend\" honestly instead of offering a single control that could never be\none real key. cel_odbc.conf's own per-context `connection`/`table` pair, which IS a plain pair\nof keys once a context section is named, is bound the same way the security screen's PJSIP-\ntransport TLS fields are: `l_octx` names the `[section]`, the same `sectionFrom` mechanism\n`s_permit`'s own removal note documented and the TLS lane above already reused once.\n\n### A control that is a repeated key\n\n**Permitted networks** is a list of CIDRs, and `acl.conf` writes one `permit=` line per\nentry. The writer replaces the first matching key and appends when absent; it has no notion\nof a key appearing many times in one section, and inventing one risks losing entries the\nperson did not touch.\n\n### A control whose unit is not the key's unit\n\nMusic-on-hold **announcement every N seconds** is an interval; `musiconhold.conf`'s\n`announcement=` is a filename. **Volume trim** in decibels has no key at all. The cipher\n**policy** offers Modern, Intermediate and Legacy where Asterisk wants a cipher string, and\nthe mapping between them is a security decision, not a translation table.\n\n### A control on a different file from its screen\n\nLogger **verbosity** is `asterisk.conf`'s `verbose`, or a per-logfile `verbose(<level>)`\nargument. Neither is a key in `logger.conf`, which is the file that screen edits. **Colourise\noutput**, **keep files** and **rotate at** have no key in either.\n\n### A control that needs a key removed rather than written\n\n**Deny by default** is a switch, and its off state means `deny=` should not be there at all.\nThe writer can create and replace an entry; it cannot delete one, and a switch that can be\nturned on and not off is worse than one that is not wired.\n\n### A control that would break the thing that found it\n\nThe IAX **type** picker IS the discriminator the section is matched by. Binding it would let\nsomebody change `type=peer` to `type=user` through the very match that located the section,\nafter which the screen is editing something it can no longer see.\n\n### A control that must never carry its value\n\n**Set a new secret** means exactly that: it is a switch that starts a credential flow, not a\nvalue. A secret must never travel through an ordinary binding, because it would be read into\nrenderer state and from there into exports, local history and screenshots.\n\n### A control that is dialplan logic, not configuration\n\nThe whole IVR screen — digit timeout, retries, invalid action, direct dial, prompt language,\nbarge-in — describes what an IVR does. `extensions.conf` has no keys for these; it has\n`exten =>` lines. Generating dialplan from a form is a real feature and a different one.\n\n### A control whose values cannot be confirmed from this checkout\n\nCaller ID **presentation** offers Allowed, Prohibited and Unavailable, and `pjsip.conf` does\nhave `callerid_privacy`. It needs a value map, and this is the closest to bindable of\nanything here — but the only accepted value evidenced anywhere in the sample files is\n`allowed_not_screened`. The spellings for the prohibited and unavailable cases are not in\nthis checkout to check against, and the difference between `prohib`, `prohibited` and\n`prohib_not_screened` is not a guess worth taking: it changes what a telephone exchange\ntells the far end about who is calling.\n\nBinding it needs the accepted values confirmed against Asterisk itself, not inferred.\n\n### A control whose key does not exist in the file its screen edits\n\nThe **RFC2833 payload** stepper and the **DTLS for WebRTC** switch sit on a screen editing\n`codecs.conf` and `rtp.conf`. `rtp.conf` has no payload key at all — `dtmftimeout` is a\ntimeout, not a payload number — and the DTLS keys are `dtls_verify`, `dtls_rekey` and their\nsiblings in `pjsip.conf`, per endpoint rather than globally. **Global codec order**,\n**transcoding**, **Opus bitrate** and **preferred ptime** have no key in either file: the\none `bitrate` that exists is inside a `[silk24]` section.\n\n## Removed rather than bound\n\nThirteen controls were taken off their screens on 2026-08-24. Each described a setting\nAsterisk does not have in the file its screen edits, and mapping it onto something else would\nhave meant inventing behaviour and calling it configuration. Removing is the same call\nalready made for a window control in a single-window console and for pushing a history whose\nown design says it is never pushed.\n\nAny of them can come back the moment it has a real key. That is the whole reason each reason\nis written down rather than summarised.\n\n| Control | Screen | Why it went |\n| --- | --- | --- |\n| Announcement every N seconds | Music on hold | an interval; `announcement=` is a filename |\n| Volume trim | Music on hold | no volume key in `musiconhold.conf` |\n| Opus bitrate | Codecs | the only `bitrate` is inside a `[silk24]` section |\n| Preferred ptime | Codecs | no ptime key; the matches are `rtptime`, `ftptime`, `httptime` |\n| RFC2833 payload | Codecs | `rtp.conf` has no payload key; `dtmftimeout` is a timeout |\n| DTLS for WebRTC | Codecs | the DTLS keys are per endpoint in `pjsip.conf` |\n| Colourise output | Logger | no colour key in `logger.conf` or `asterisk.conf` |\n| Keep files | Logger | no file-count key; `rotatestrategy` picks a strategy |\n| Rotate at | Logger | no size key |\n| Server certificate | Security | a hostname picker; `tlscertfile` takes a path |\n| TLS method | Security | Asterisk uses `tlsdisablev1`/`v11`/`v12` flags, not a method |\n| Verify client certificates | Security | no such key in these files |\n| Cipher policy | Security | `tlscipher` takes a cipher string; deciding what Modern means is a security decision |\n\nThe last four are the ones worth being careful about. Each could be made to write something,\nand each would require this console to decide a security question on somebody's behalf --\nwhich certificates live where, which TLS versions a name implies, which ciphers count as\nmodern. A console must not make those silently.\n\n**Two of the four came back on 2026-08-25, with real keys, as plain paths and a raw string\nrather than the removed picker's translated categories:**\n\n- **Server certificate** is bound today as `ht_tlscert`/`ht_tlskey` on the `httpd` screen\n  (http.conf's `tlscertfile`/`tlsprivatekey`) and as `s_tcert`/`s_tprivkey` on the security\n  screen's new \"TLS\" group (a PJSIP transport's `cert_file`/`priv_key_file`). Both are plain\n  text path fields, exactly the \"a hostname picker; tlscertfile takes a path\" reason this row\n  gave for removal in the first place -- once the control stopped being a hostname picker,\n  the objection stopped applying.\n- **Verify client certificates** is bound as `s_tverifyclient`/`s_tverifyserver` on the same\n  group, against `verify_client`/`verify_server` -- real keys that were simply not being\n  looked for in `pjsip.conf`'s `[transport]` section when this row was written, because the\n  security screen had no PJSIP-transport controls at all yet.\n\n**TLS method and Cipher policy have NOT come back, and the distinction matters.** `s_tmethod`\nand `s_tcipher` also exist now, on the same group, but they are free-text fields that write\nwhatever string is typed straight into `method`/`cipher` -- not the translated picker this\ntable describes (a TLS-version name mapped to `tlsdisablev1`/`v11`/`v12`, or a Modern/\nIntermediate/Legacy label mapped to a cipher string). This console still refuses to make that\ntranslation decision on somebody's behalf; typing the exact string Asterisk wants is a\ndifferent, narrower thing than picking a category and trusting this console's judgment about\nwhat the category means.\n\n## Configuration\n\nNothing here is configurable. The list is a record of design decisions still to be taken.\n\n## Failure modes\n\nThe failure this document exists to prevent is somebody reading \"unbound\" as \"unfinished\"\nand wiring one of these to the nearest plausible key. A wrong key does not fail loudly. It\nwrites a line that looks correct, Asterisk either ignores it or obeys it, and the person who\nset it believes something about their exchange that is not true.\n\n## Verification\n\n`console/tests/contracts/orphan-controls.test.mjs` counts every control that reaches nothing\nand refuses to let the number rise. It is a ratchet, not a target: it may fall freely, and a\nsecond check forces the ceiling down when it does, so the figure cannot drift into permitting\nnew gaps in silence.\n\n## Suggested articles\n\n[Screen inventory and binding](../platform/README.md), [Configuration safety](../platform/README.md).\n"
    },
    {
      "id": "platform/unlock-ladder",
      "category": "platform",
      "title": "Unlock ladder",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Current status",
          "id": "current-status"
        },
        {
          "title": "Failure modes",
          "id": "failure-modes"
        },
        {
          "title": "Accessibility and localization",
          "id": "accessibility-and-localization"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "per-element-toy-locks.md",
        "built-in-authenticator.md",
        "../system/security.md",
        "README.md"
      ],
      "body": "# Unlock ladder\n\nA small set of optional games — dim sum trivia, arithmetic, whack-a-mole — a locked-out user can play to shorten a wait, never to bypass the credential itself.\n\n## Behavior\n\nWinning a rung is meant to clear only the current lockout wait, never the credential requirement itself, with a capped, server-graded budget of skippable waits so the ladder cannot be scripted into a bypass.\n\n## Configuration\n\nEvery answer would be generated and graded independently of the browser, using a single-use token, so a client-side script cannot forge a win.\n\n## Current status\n\n**Desktop application:** Partial. A lockout timer exists after repeated wrong password attempts on the desktop application's launch gate, but there are no unlock-ladder games, no attempt-budget mechanic, and no server-side challenge grading.\n\n**Documentation website:** Not implemented. The documentation website has no lockable credential for a ladder to apply to.\n\n## Failure modes\n\nA ladder submission that arrives before its round's own minimum duration has elapsed, or that replays an already-consumed challenge token, is meant to be rejected outright; there is no ladder implementation yet to enforce either check.\n\n## Accessibility and localization\n\nThis feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.\n\n## Verification\n\nNo automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.\n\n## Suggested articles\n\n[Per-element toy locks](per-element-toy-locks.md), [Built-in authenticator](built-in-authenticator.md), [Security](../system/security.md), [Platform feature index](README.md).\n"
    },
    {
      "id": "README",
      "category": "README.md",
      "title": "Ding PBX Console documentation",
      "headings": [
        {
          "title": "Rails",
          "id": "rails"
        },
        {
          "title": "Delivery",
          "id": "delivery"
        },
        {
          "title": "Shared behavior",
          "id": "shared-behavior"
        }
      ],
      "links": [
        "pbx/README.md",
        "media/README.md",
        "data/README.md",
        "system/README.md",
        "agent/README.md",
        "app/README.md",
        "installer-iso.md",
        "app/history.md",
        "app/arcade.md"
      ],
      "body": "# Ding PBX Console documentation\n\nDing PBX Console is a Windows desktop administration experience for Asterisk. The renderer is compiled directly from the design's navigation model, so this documentation follows the same structure: six rails and 32 destinations, one article per destination, grouped and ordered exactly as the app presents them.\n\nThe documentation map contains 32 destinations in six rails. Every article covers behavior, configuration, failure modes and security, verification, and suggested reading.\n\n## Rails\n\n- [PBX](pbx/README.md) — Telephony: endpoints, routing and everything a call touches while it is alive.\n- [Media](media/README.md) — Media & voice: codecs, RTP, recordings, prompts and conferencing.\n- [Data](data/README.md) — Records & APIs: call records, event logging and the machine interfaces.\n- [System](system/README.md) — Runtime & security: modules, logging, certificates and the CLI.\n- [Agent](agent/README.md) — Agent global memory: memory, sync, skills, hub sessions and the emission guard.\n- [App](app/README.md) — Deploy & application: stand up a new server, then appearance, updates and the console itself.\n\n## Delivery\n\n- [The Ding PBX installer ISO](installer-iso.md) — a bootable, unattended-install ISO that turns a bare machine into a working server.\n\n## Shared behavior\n\nConfiguration controls are pickers, switches, sliders and steppers wired to real keys in the owning Asterisk configuration file — never free-text fields that could drift from what Asterisk actually does. Where an article shows a default value or an option list, it is the same default the design and the renderer ship with; nothing here is a simulated call, a sample statistic, or an invented extension. Destructive actions run the full confirmation ceremony described in [History & git](app/history.md) and [Arcade](app/arcade.md).\n"
    },
    {
      "id": "system/cli",
      "category": "system",
      "title": "CLI builder",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "modules.md",
        "logger.md",
        "security.md"
      ],
      "body": "# CLI builder\n\n## Behavior\n\nBuild a real Asterisk CLI command by choosing its parts. The raw console beside it is read-only output, shown only in expert mode. It is backed by `asterisk -rx`. It lives on the System rail, under the Runtime & security group: Modules, logging, certificates and the CLI.\n\n## Configuration\n\nThere is no settings form here. Commands are assembled from pickers that mirror the real `asterisk -rx` command grammar, so what you build is exactly what will run, never free text.\n\n## Failure modes and security\n\nA command built from invalid picker combinations is rejected before it reaches Asterisk, rather than sent and left to fail on the far side.\n\n## Verification\n\nConfirm every picker combination produces the exact command that would be typed by hand, and that the raw console only appears in expert mode.\n\n## Suggested articles\n\n[Modules](modules.md), [Logger](logger.md), and [Security](security.md).\n"
    },
    {
      "id": "system/logger",
      "category": "system",
      "title": "Logging",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "modules.md",
        "cli.md",
        "../app/history.md"
      ],
      "body": "# Logging\n\n## Behavior\n\nSeverity per destination as a matrix of switches. Rotation is a picker, retention is a slider. It is backed by `logger.conf`. It lives on the System rail, under the Runtime & security group: Modules, logging, certificates and the CLI.\n\n## Configuration\n\n### Console\n\nWhat the attached console prints.\n\n- **Console levels** (`g_console`) — a chips control, default `notice`, `warning`, `error`, choices `debug`, `trace`, `notice`, `warning`, `error`, `verbose`, `dtmf`, `fax`, `security`.\n- **Verbosity** (`g_verbose`) — a slider control, default `3`.\n- **Colourise output** (`g_colour`) — a switch control, default `true`.\n\n### Files & rotation\n\nDisk logging.\n\n- **File levels** (`g_file`) — a chips control, default `notice`, `warning`, `error`, `verbose`, choices `debug`, `trace`, `notice`, `warning`, `error`, `verbose`, `dtmf`, `fax`, `security`.\n- **Rotation strategy** (`g_rotate`) — a segmented control, default `rotate`, choices `sequential`, `rotate`, `timestamp`, `none`.\n  - *What it is:* How log files are rotated when they reach the size limit.\n  - *Why it exists:* Unrotated logs fill the disk, and a full disk stops Asterisk.\n  - *Choosing a value:* rotate renames sequentially, timestamp appends the date, sequential numbers forever, none disables it.\n  - *Gotcha:* If an external logrotate is also configured, both will fight and you will lose log lines at the boundary.\n- **Keep files** (`g_count`) — a stepper control, default `10`.\n- **Rotate at** (`g_size`) — a slider control, default `50`.\n- **Queue log** (`g_queue`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery control here maps to a real key in logger.conf; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. If an external logrotate is also configured, both will fight and you will lose log lines at the boundary.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in logger.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.\n\n## Suggested articles\n\n[Modules](modules.md), [CLI builder](cli.md), and [History & git](../app/history.md).\n"
    },
    {
      "id": "system/modules",
      "category": "system",
      "title": "Modules",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "logger.md",
        "security.md",
        "cli.md"
      ],
      "body": "# Modules\n\n## Behavior\n\nEvery loadable module with its live state. Loading and unloading are real actions and run the full confirmation ceremony. It is backed by `modules.conf`. The rail badge on this destination currently reads `214`. It lives on the System rail, under the Runtime & security group: Modules, logging, certificates and the CLI.\n\n## Configuration\n\n### Load policy\n\nWhat Asterisk does with modules it was not explicitly told about.\n\n- **autoload** (`mo_auto`) — a switch control, default `true`.\n  - *What it is:* Whether Asterisk loads every module it finds at startup.\n  - *Why it exists:* Convenient, but it means an unused module with a vulnerability is loaded anyway.\n  - *Choosing a value:* On for a lab. Off with an explicit load list for a hardened deployment.\n  - *Gotcha:* Turning it off without listing what you actually need produces a PBX that starts cleanly and does nothing.\n- **Preload** (`mo_preload`) — a chips control, default `res_odbc.so`, `res_config_odbc.so`, choices `res_odbc.so`, `res_config_odbc.so`, `res_curl.so`, `res_crypto.so`.\n- **Never load** (`mo_noload`) — a chips control, default `chan_sip.so`, choices `chan_sip.so`, `chan_mobile.so`, `app_meetme.so`, `res_snmp.so`.\n- **Fail startup on missing module** (`mo_require`) — a switch control, default `true`.\n\n## Failure modes and security\n\nEvery row reflects a real object in modules.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. Turning it off without listing what you actually need produces a PBX that starts cleanly and does nothing.\n\n## Verification\n\nExercise every control against its documented default and its full option range, confirm the write lands in modules.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.\n\n## Suggested articles\n\n[Logger](logger.md), [Security](security.md), and [CLI builder](cli.md).\n"
    },
    {
      "id": "system/README",
      "category": "system",
      "title": "System",
      "headings": [],
      "links": [
        "modules.md",
        "logger.md",
        "security.md",
        "cli.md"
      ],
      "body": "# System\n\nRuntime & security: modules, logging, certificates and the CLI.\n\n- [Modules](modules.md)\n- [Logger](logger.md)\n- [Security](security.md)\n- [CLI builder](cli.md)\n"
    },
    {
      "id": "system/security",
      "category": "system",
      "title": "Security",
      "headings": [
        {
          "title": "Behavior",
          "id": "behavior"
        },
        {
          "title": "Configuration",
          "id": "configuration"
        },
        {
          "title": "Failure modes and security",
          "id": "failure-modes-and-security"
        },
        {
          "title": "Verification",
          "id": "verification"
        },
        {
          "title": "Suggested articles",
          "id": "suggested-articles"
        }
      ],
      "links": [
        "../pbx/endpoints.md",
        "../pbx/trunkauth.md",
        "../data/ami.md"
      ],
      "body": "# Security\n\n## Behavior\n\nNamed access control lists, listed in the exact order Asterisk evaluates them — the last\nmatching rule wins, which is what makes a broad deny followed by a narrow permit work as an\nallowlist. TLS certificate and key paths on this screen are typed, not chosen from a store\nthis console does not have: it can point Asterisk at a certificate and check the wiring looks\nsane, but it cannot install, generate or rotate one. The rail badge on this destination\ncurrently reads `!`. It lives on the System rail, under the Runtime & security group:\nModules, logging, certificates and the CLI.\n\nThis screen edits `acl.conf`, a PJSIP transport's `[section]` in `pjsip.conf`, and the\n`[attestation]`/`[verification]` objects in `stir_shaken.conf` — three files, none of them\nthis screen's own declared `file` (`acl.conf`) for the latter two, so pjsip.conf and\nstir_shaken.conf are read and written through their own dedicated paths in `App.tsx` rather\nthan the generic per-screen read every other configuration screen relies on alone.\n\n## Configuration\n\n### Access control (`acl.conf`)\n\nThe table is one row per `permit=`/`deny=` line, across every named ACL, in file order —\nAsterisk applies the *last* matching rule, so reordering a rule is not cosmetic. Rows resolve\nback to a real rule through `app/renderer/src/acl-editor.ts`, which embeds each rule's own\naction and spec in its row key so a stale context menu can never act on the wrong rule after a\nconcurrent edit shifts positions. Add, edit, remove and reorder all go through the same\n`pbx.plan`/`pbx.apply` transaction (backup, stage, validate, apply, post-read, compare,\nrollback on mismatch) every other write in this console uses.\n\n- **ACL name** (`s_aclname`) — a text control. The named list a new rule joins, e.g.\n  `trusted-nets`. A name that does not already exist creates that ACL with this as its first\n  rule.\n- **Action** (`s_action`) — a segmented control, `permit` or `deny`.\n- **Network / CIDR** (`s_spec`) — a text control. A bare address or address/mask. A hostname\n  is refused: Asterisk resolves an ACL address at load time and this console cannot verify one\n  offline.\n\nNone of the three above carry a config-key binding: they are read straight out of state by\n`App.tsx`'s `onAddAclRule`, the same way the servers screen's `sv_host`/`sv_user` are — the\ncurrent typed value of a form field, not a persisted setting.\n\n- **Auto-ban after failures** (`s_failban`) — a stepper control, default `5`. This console's\n  own behaviour, never written to `acl.conf` or anywhere else on the target.\n- **Ban duration** (`s_bantime`) — a slider control, default `600`. Same as above.\n\n### TLS (a PJSIP transport, in `pjsip.conf`)\n\nA PJSIP transport's own TLS listener. Type the section name of an existing transport (e.g.\n`transport-tls`), press **Load from target** to see what it currently has, edit, then **Save\ntransport TLS settings** — this edits a transport already declared on the target, it does not\ncreate one. Saving refuses outright when the typed name does not resolve to an existing\n`type=transport` section, rather than inventing a bare `[section]` with nothing but TLS keys\nand no `bind=`/`type=` — which would not be a usable transport.\n\n- **Transport name** (`s_transport`) — a text control. The `pjsip.conf` `[section]` these\n  fields read and write. Not itself bound to a key: every field below reads and writes\n  through `sectionFrom: 's_transport'`, so the section is whichever name is currently typed\n  here.\n- **Load from target** (`s_tload`) — a one-shot action button (`security-transport-load`).\n  Reads the named transport's current TLS settings from `pjsip.conf` into the fields below.\n- **Protocol** (`s_tprotocol`) — a segmented control, default `tls`, choices `udp`, `tcp`,\n  `tls`, `ws`, `wss`, `flow` → `protocol`.\n- **Certificate file** (`s_tcert`) — a text control → `cert_file`.\n- **Private key file** (`s_tprivkey`) — a text control → `priv_key_file`.\n- **CA list file** (`s_tcalistfile`) — a text control → `ca_list_file`. Required for either\n  verification switch below — without one, a client or server certificate can never actually\n  be verified.\n- **CA list path** (`s_tcalistpath`) — a text control → `ca_list_path`, an alternative to the\n  file above.\n- **Cipher list** (`s_tcipher`) — a text control → `cipher`.\n- **Method** (`s_tmethod`) — a text control → `method`. The only value the shipped sample\n  documents (`tlsv1`) is free text rather than a segmented choice; PJPROJECT accepts others,\n  and this console does not offer a list it cannot verify against a real build.\n- **Verify client certificate** (`s_tverifyclient`) — a switch control → `verify_client`.\n- **Verify server certificate** (`s_tverifyserver`) — a switch control → `verify_server`.\n- **Require client certificate** (`s_treqclientcert`) — a switch control →\n  `require_client_cert`.\n- **Save transport TLS settings** (`s_tsave`) — a one-shot action button\n  (`security-transport-save`). Writes the ten fields above into the named transport section\n  and nowhere else.\n\n### STIR/SHAKEN (`stir_shaken.conf`)\n\nSigned caller identity for outbound calls. The four switches below are policy, read from and\nwritten to the `[attestation]`/`[verification]` objects; the key material that makes signing\nand verification actually work lives in the group beneath it.\n\n- **Attestation enabled** (`s_stir`) — a switch control, default `true` → `[attestation]`\n  `global_disable` (inverted).\n- **Attestation level** (`s_level`) — a segmented control, default `A`, choices `A`, `B`, `C`\n  → `[attestation]` `attest_level`. A means you know the caller and their right to that\n  number. C means the call just passed through you.\n- **Verify inbound identity** (`s_verifyin`) — a switch control, default `true` →\n  `[verification]` `global_disable` (inverted).\n- **On verification failure** (`s_failaction`) — a segmented control, default `Continue`,\n  choices `Continue`, `Tag`, `Reject` → `[verification]` `failure_action`\n  (`continue`/`continue_return_reason`/`reject_request`).\n\n### STIR/SHAKEN keys (`stir_shaken.conf`)\n\nThe private key Asterisk signs outgoing Identity headers with, and the certificate-authority\nmaterial used to verify incoming ones — a telephone-number issuing authority hands you these;\nthis console only points Asterisk at them.\n\n- **Signing private key file** (`s_privkey`) — a text control → `[attestation]`\n  `private_key_file`. Must not be group- or world-readable; the account the asterisk process\n  runs as must own it.\n- **Signing certificate URL** (`s_certurl`) — a text control → `[attestation]`\n  `public_cert_url`. Published by the issuing authority — make sure whatever this URL serves\n  is the certificate alone, never the private key too.\n- **Trust the system CA store** (`s_loadsyscerts`) — a switch control, default `false` →\n  `[verification]` `load_system_certs`.\n- **Verification CA file** (`s_cafile`) — a text control → `[verification]` `ca_file`. At\n  least one of this and the directory below is required for verification to do anything.\n- **Verification CA directory** (`s_capath`) — a text control → `[verification]` `ca_path`.\n- **Save STIR/SHAKEN settings** (`s_stirsave`) — a one-shot action button\n  (`security-stir-save`). Writes all nine STIR/SHAKEN fields on this screen — the four policy\n  switches above and the five key-material fields — in one write, since both objects live in\n  the one file.\n\n## Failure modes and security\n\nEvery bound control here maps to a real key: `permit=`/`deny=` lines in `acl.conf`; a named\nPJSIP transport section in `pjsip.conf`; the `[attestation]`/`[verification]` objects in\n`stir_shaken.conf`. An unreachable file is shown as unreachable, never backfilled with\nplaceholder values. Saving the TLS group refuses to write when the typed transport name does\nnot resolve to an existing `type=transport` section, rather than creating a half-built\ntransport with no `bind=`. The plan step itself also validates: `verify_client`/\n`verify_server` enabled with no CA list set, a `cert_file` with nothing to pair it, attestation\nleft enabled with no `private_key_file`/`public_cert_url`, or an `attest_level` outside\n`A`/`B`/`C` all block the write with the exact reason, for every declared PJSIP transport in\nthe file — not only the first one that looks like TLS. Combined with a permissive ACL this is\nhow a PBX ends up open to toll fraud overnight. Claiming attestation level A when you cannot\nprove it is worse than honestly claiming C — it is the specific thing enforcement looks for.\nPrivate key material is never logged, captured, or written anywhere but the path the operator\ntyped; this console shows the path, never the key's contents.\n\n## Verification\n\nExercise the ACL editor's add/edit/remove/reorder against a real `acl.conf`, confirm evaluation\norder actually changes when a rule moves. Type an existing transport's name, press Load,\nconfirm the fields match what is really in `pjsip.conf`, edit and Save, and confirm a name that\ndoes not resolve to a `type=transport` section is refused rather than silently accepted. Set\nand clear each STIR/SHAKEN policy switch and key field, Save, and confirm both objects in\n`stir_shaken.conf` land correctly in one write. Confirm the console's own validation blocks a\n`verify_client` with no CA list, and that Asterisk's own load logs agree.\n\n## Suggested articles\n\n[Endpoints](../pbx/endpoints.md), [Trunk authentication](../pbx/trunkauth.md), and [AMI & ARI](../data/ami.md).\n"
    }
  ]
} as const;
