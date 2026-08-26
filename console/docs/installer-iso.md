# The Ding PBX installer ISO

## What it is

A bootable, unattended-install ISO that turns a bare machine (or VM) into a working Ding PBX
server, the same way a FreePBX distro ISO does. Boot it, walk away, and when it reboots itself
there is a running Asterisk and a Material Asterisk admin surface reachable from a browser on the
local network — with no default password of any kind.

It is built by `build-iso.bat` at the repository root (`console/scripts/build-iso.ps1`), following
the same reproducibility discipline as the WSL Asterisk bundle: a base image pinned by digest,
Asterisk compiled from the exact repository commit, every download verified against a recorded
SHA-256 before it is trusted, and a provenance record written beside the finished artifact.

## Architecture

The build has three stages, each a separate Docker stage or image so a failure in one is easy to
isolate:

1. **`iso-payload.Dockerfile`** compiles Asterisk from source (the same recipe as
   `asterisk-wsl-runtime.Dockerfile`), builds the Material Asterisk server (`npm ci && npm run
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
- installs the Material Asterisk server under `/opt/ding-pbx-console` (reusing
  `console/server/deploy/install.sh` unmodified) and enables `ding-pbx-console.service`, bound to
  `0.0.0.0:8443` so it is reachable from the LAN rather than loopback-only
- installs a first-boot banner unit that writes the machine's current LAN address into
  `/etc/issue`, so whoever is at the console sees exactly where to point a browser

## First-boot credential flow

**No credential of any kind is written to the ISO.** The `identity.password` field in the
autoinstall answer file is the locked sentinel `"!"`, which refuses interactive password login for
that local Unix account entirely — it exists only so the installer has an account to run under,
never as an administrative credential.

The actual admin account is created by the Material Asterisk server itself, the first time anyone
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
  Material Asterisk payload itself is fully offline and reproducible from the ISO's own contents.
- Building the ISO requires Docker with a working Linux engine; it cannot be produced on a bare
  Windows host.

## Building it in CI

`.github/workflows/installer-iso.yml` builds this ISO reproducibly on a GitHub-hosted
`ubuntu-24.04` runner (a Linux Docker engine is required to compile the Linux payload and produce
an ISO 9660 image, which a Windows host cannot do natively -- Docker ships preinstalled on that
runner image, so no separate setup is needed). It runs on `workflow_dispatch`, and automatically
whenever a push to `master` touches `console/scripts/iso/**`, `console/scripts/build-iso.ps1`,
`build-iso.bat`, or the workflow file itself.

It runs the same three stages as local `build-iso.bat`/`build-iso.ps1` (payload build, ISO respin,
boot verification), then keeps the same "not tests, not lint" discipline as every other workflow in
this repository: no test job, no lint job, nothing gates the build. A run either builds, packages,
and publishes evidence, or it fails outright on the build or verification step itself.

### The 2 GiB release-asset problem

A GitHub release asset is capped at 2 GiB (2,147,483,648 bytes) per file. The ISO this pipeline
produces is roughly 3.47 GiB (3,720,878,080 bytes measured against a real build), so it cannot be
attached to a release as a single file.

The workflow solves this by splitting the verified ISO into 1900 MiB volumes (`split -b 1900MiB`,
safely under the cap) and publishing all of them as release assets, alongside:

- `ding-pbx-installer.iso.sha256` -- the reassembled image's own SHA-256, for a one-line check.
- `ding-pbx-installer.iso.json` -- full provenance (source commit, base ISO URL/digest, Node
  runtime version/digest, console build base image digest, ISO byte count and SHA-256, part
  count, and the same Secure Boot / no-signing statement as the local build).
- `ding-pbx-installer.iso.REASSEMBLE.md` -- exact reassembly commands for Linux/macOS and Windows,
  plus the SHA-256 of every individual volume and of the reassembled whole.

To reassemble and verify a downloaded release:

```sh
cat ding-pbx-installer.iso.part* > ding-pbx-installer.iso
sha256sum -c ding-pbx-installer.iso.sha256
```

On Windows PowerShell:

```powershell
cmd /c "copy /b ding-pbx-installer.iso.part001+ding-pbx-installer.iso.part002+... ding-pbx-installer.iso"
certutil -hashfile ding-pbx-installer.iso SHA256
```

Compare the resulting digest against the one recorded in `ding-pbx-installer.iso.sha256` and in
`ding-pbx-installer.iso.json` before writing the ISO to a USB drive or booting it. **Do not boot an
ISO whose reassembled digest does not match.**

The workflow also uploads the complete, unsplit ISO as an ordinary GitHub Actions workflow
artifact (a separate, larger size limit than a release asset), for convenience when the run is
still fresh -- but workflow artifacts expire (14 days here) and are not a durable distribution
channel, so the split release assets are the one to link to for anyone downloading later.

### Boot verification in CI

The workflow re-checks, on the artifact it actually produced, the exact three properties the local
build and `console/tests/iso/iso-build.test.mjs` already require of the respin recipe: both El
Torito boot catalog entries present (`BIOS` and `UEFI`), and a real master boot record signature
(`55aa`) at byte 510, plus the ISO 9660 primary volume descriptor signature (`CD001`) at byte
32769. These are the properties that distinguish a genuinely bootable image from a valid-looking
ISO 9660 file that cannot boot -- see the long comment above the repack in
`console/scripts/iso/iso-respin.Dockerfile` for the real incident that made these checks necessary.

### Unsigned, same as the local build

This ISO is unsigned in CI exactly as it is locally -- code signing is permanently out of scope for
this project. The workflow states this in its own release notes and evidence rather than leaving it
to be discovered at a Secure Boot prompt.

## Verification state

Everything in `console/tests/iso/*.test.mjs` (20 tests) is run without Docker or a real ISO: it
statically checks the autoinstall answer file for structural correctness and the absence of any
embedded credential, checks that `build-iso.ps1` verifies its downloads and the finished artifact
rather than trusting a green build log, and checks that no code-signing call exists anywhere in the
pipeline. Every one of those checks was proved meaningful by breaking the real file it guards,
observing the test go red, and restoring it.

**A full ISO has been built.** 3,720,878,080 bytes, from the packaged Asterisk runtime whose digest
was checked against its own manifest first. Its structure was verified rather than assumed: one El
Torito BIOS entry, one EFI entry, an ISO 9660 primary volume descriptor, and a real master boot
record signature at byte 510. The base Ubuntu image and the Linux Node.js runtime are pinned to
their published SHA-256 values, both verified against the sums their vendors publish, and every
download fails closed rather than accepting a file that does not match.

**Building it found a defect that no other check would have.** The first image produced was a valid
ISO 9660 with entirely correct contents that no machine would boot. The repack followed Ubuntu's own
published autoinstall recipe, which names `boot_hybrid.img` for the master boot record; Ubuntu
24.04.4 does not ship that file. The hybrid repack failed, a fallback repack ran, and the build
reported success. Every test in the suite passed on that image.

The fallback is gone — one that quietly drops the single property the artifact exists for is worse
than no fallback. The repack now asks the base image to describe its own boot arrangement through
`xorriso -report_el_torito as_mkisofs` and uses that answer, reading the master boot record and the
appended EFI partition back out of it by byte interval. That is what the vendor shipped rather than
a reconstruction of it, and it does not go stale when a point release moves a file.

**Still not done: the image has not been booted.** Its structure says it can; only running it proves
it does. That, and the fact that it is unsigned and Secure Boot will therefore refuse it, are the two
things to know before trusting it.

It was built under WSL rather than a container, because the container engine on the build host would
not start. The CI workflow builds it in a container on a Linux runner, which is the reproducible
path; the local script remains the fallback.
