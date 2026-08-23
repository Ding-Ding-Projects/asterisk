# The Ding PBX installer ISO

## What it is

A bootable, unattended-install ISO that turns a bare machine (or VM) into a working Ding PBX
server, the same way a FreePBX distro ISO does. Boot it, walk away, and when it reboots itself
there is a running Asterisk and a Ding PBX Console admin surface reachable from a browser on the
local network — with no default password of any kind.

It is built by `build-iso.bat` at the repository root (`console/scripts/build-iso.ps1`), following
the same reproducibility discipline as the WSL Asterisk bundle: a base image pinned by digest,
Asterisk compiled from the exact repository commit, every download verified against a recorded
SHA-256 before it is trusted, and a provenance record written beside the finished artifact.

## Architecture

The build has three stages, each a separate Docker stage or image so a failure in one is easy to
isolate:

1. **`iso-payload.Dockerfile`** compiles Asterisk from source (the same recipe as
   `asterisk-wsl-runtime.Dockerfile`), builds the Ding PBX Console server (`npm ci && npm run
   build` against `console/`), and downloads a portable Linux Node.js runtime verified by SHA-256.
   These three pieces — Asterisk, the console server, and Node — are assembled into one payload
   directory with an `install-target.sh` script and systemd units.
2. **`iso-respin.Dockerfile`** downloads the official Ubuntu 24.04 LTS Server ISO, verified against
   a pinned SHA-256 before anything touches it, extracts it, drops in the payload plus an
   `autoinstall` (Subiquity cloud-init) answer file at `/server/`, points the bootloader at
   `autoinstall ds=nocloud;s=/cdrom/server/`, and repacks a hybrid BIOS+UEFI-bootable ISO with
   `xorriso`.
3. **`build-iso.ps1`** orchestrates both stages from Windows (Docker's Linux engine does the actual
   work, since Windows cannot compile the Linux payload or produce an ISO 9660 image natively),
   exports and verifies the result, and writes `console/release/iso/ding-pbx-installer.iso.json`
   with the source commit, base image and Node digests, and the finished ISO's own SHA-256.

## What happens on the target machine

Booting the ISO runs Ubuntu's ordinary Subiquity installer with no prompts: it partitions the
disk, installs the base OS, then autoinstall's `late-commands` step runs `install-target.sh`
(inside the newly installed system, via `curtin in-target`), which:

- installs the bundled Node.js runtime to `/usr/local/lib/ding-pbx-node`
- installs the compiled Asterisk tree and enables `asterisk.service`
- installs the Ding PBX Console server under `/opt/ding-pbx-console` (reusing
  `console/server/deploy/install.sh` unmodified) and enables `ding-pbx-console.service`, bound to
  `0.0.0.0:8443` so it is reachable from the LAN rather than loopback-only
- installs a first-boot banner unit that writes the machine's current LAN address into
  `/etc/issue`, so whoever is at the console sees exactly where to point a browser

## First-boot credential flow

**No credential of any kind is written to the ISO.** The `identity.password` field in the
autoinstall answer file is the locked sentinel `"!"`, which refuses interactive password login for
that local Unix account entirely — it exists only so the installer has an account to run under,
never as an administrative credential.

The actual admin account is created by the Ding PBX Console server itself, the first time anyone
visits it: `console/server/auth.ts`'s `createAdminAccount` gates every other request behind the
first-run setup screen until an account exists. Whoever reaches the printed LAN address first
creates the admin account. Because the service binds to the LAN rather than loopback by default so
that an operator can reach it at all, **the operative security boundary during the first-boot
window is the network the machine is plugged into**, not a credential — treat that window (from
first boot until an admin account is created) the way you would treat an unconfigured switch port:
keep the machine off an untrusted network, or firewall port 8443 to the operator's own address,
until setup is done.

## Requirements

- A machine or VM with x86-64 hardware, at least 2 vCPU / 2 GiB RAM / 8 GiB disk for a minimal
  install (Asterisk itself is light; size storage for call recordings and voicemail separately).
- **Secure Boot must be disabled**, or a custom key enrolled for this ISO. Code signing is
  permanently out of scope for this project (see the repository's no-signing policy) — the ISO is
  genuinely unsigned, and a machine enforcing Secure Boot will refuse to boot it. This is stated by
  the build script's own output and here, rather than left for someone to discover at a boot
  prompt.
- Network reachable by DHCP during install (the base OS and package list install from the
  network unless a local mirror is configured; the Asterisk/Node/console payload itself needs no
  network, since it is embedded on the ISO).

## How to boot and install it

1. Write `console/release/iso/ding-pbx-installer.iso` to a USB drive (`dd`, Rufus, or Ventoy) or
   attach it as a VM CD-ROM.
2. Boot from it. No prompts appear; the machine partitions its disk and installs unattended.
3. On completion the machine reboots itself into the installed system.
4. At the console login screen, read the printed address (`Console admin setup: http://<ip>:8443/`)
   and open it from a browser on the same network.
5. Create the admin account. From then on the console requires that account's credentials for
   every request.

## Verifying the download

`console/release/iso/ding-pbx-installer.iso.json` records the exact source commit, the pinned base
Ubuntu ISO URL and SHA-256, the pinned Node.js runtime version and SHA-256, and the finished ISO's
own SHA-256. Compare that last value against a locally computed digest of the downloaded file
before writing it to a USB drive or booting it in a VM.

## Honest security posture

- The ISO itself is unsigned; Secure Boot refuses it.
- No credential is embedded anywhere on the ISO or in its build.
- The admin surface binds to the LAN by default during the first-boot window, before any account
  exists — see **First-boot credential flow** above for the mitigation.
- `late-commands`' package list (`packages:` in the autoinstall answer file) is installed from
  whatever apt sources the target machine reaches at install time; only the Asterisk, Node.js, and
  Ding PBX Console payload itself is fully offline and reproducible from the ISO's own contents.
- Building the ISO requires Docker with a working Linux engine; it cannot be produced on a bare
  Windows host.

## Verification state

Everything in `console/tests/iso/*.test.mjs` (20 tests) is run without Docker or a real ISO: it
statically checks the autoinstall answer file for structural correctness and the absence of any
embedded credential, checks that `build-iso.ps1` verifies its downloads and the finished artifact
rather than trusting a green build log, and checks that no code-signing call exists anywhere in the
pipeline. Every one of those checks was proved meaningful by breaking the real file it guards,
observing the test go red, and restoring it.

**A full ISO has not been built or booted in this environment**: this repository checkout has no
running Docker engine and no network access to `releases.ubuntu.com` or `nodejs.org`, so the base
Ubuntu ISO digest and the Linux Node.js runtime digest in `build-iso.ps1` are recorded as explicit
placeholders that must be replaced with the real published values before a real build — the
download-and-verify step fails closed rather than silently accepting the wrong file if they are
left unset. The exact `xorriso` boot-preservation flags in `iso-respin.Dockerfile` follow the
documented Ubuntu autoinstall custom-ISO recipe but have not been exercised against a real ISO
either, and are the highest-risk, least-verified part of this pipeline.
