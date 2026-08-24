# Hosted control-plane deployment

## Behavior

The hosted control plane is built as a multi-stage Docker image from the exact Asterisk repository commit supplied by `deployer/deployment/build-control-plane.ps1`. The build stage compiles Asterisk and the console server. The runtime image records the source commit, image version, and pinned base-image references in OCI labels and `/opt/ding-pbx-console/provenance.json`.

The Windows desktop is a separate surface. It uses the bundled `console/resources/asterisk/asterisk-wsl-rootfs.tar` and its provenance record. The desktop control plane provides status, provision, daemon start, stop, restart, read, and recovery actions for its fixed managed WSL distribution. A runtime action is not successful merely because `wsl.exe` returned zero. The control plane asks the distribution or Asterisk for a direct answer and reports the observed state.

## Configuration

`deployer/deployment/docker-compose.yml` is the hosted deployment contract. It uses port `8088`, a named persistent data volume, `restart: unless-stopped`, a read-only root filesystem, dropped capabilities, `no-new-privileges`, and a bounded temporary filesystem. TLS files are mounted through Docker secrets. They are not copied into the image, passed as secret-bearing environment values, or emitted in logs.

Build the image with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployer\deployment\build-control-plane.ps1 -Version <version>
```

Inspect local WSL and Docker capacity with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployer\deployment\preflight.ps1 -Mode all
```

The optional host mode requires an explicitly approved host, user, port, and persistent known-hosts file. It reads architecture, CPU, memory, disk capacity, Docker information, and existing workloads only.

## Failure and recovery

An image with a mismatched revision label, missing provenance, or an invalid health response is not a verified deployment. Preserve the data volume, inspect the exact image record, and select a previously verified immutable image reference. `deployer/deployment/rollback.ps1` prints a plan by default and changes Compose state only when `-Execute` is supplied. It never removes the data volume.

If the desktop reports an unusable managed WSL distribution, recovery is scoped to `ding-pbx-console`: stop it, inspect the reported WSL reason, and use the destructive removal action only after the app's confirmation flow. Re-provisioning then uses the packaged archive and validates Asterisk directly. A registered user distribution is never imported over or removed by the desktop runtime lane.

## Security considerations

The image runs as UID/GID `10001`, does not receive a shell command, drops all Linux capabilities, and uses a read-only root filesystem in Compose. The persistent volume is the only writable application location. The build context excludes credentials, private keys, generated output, and the WSL tar payload. Code signing remains disabled for the Windows package.

## Verification state

The deployment manifests, build script, preflight command, rollback plan, health endpoint, and desktop provenance validation are implemented. This lane intentionally did not build an image, import WSL, contact a private host, start Docker Compose, run the installer, or capture a runtime surface. Those are release and deployment evidence steps for the next owner.

## Suggested articles

[In-context recovery](in-context-recovery.md), [Installer ISO](../installer-iso.md), and [Automatic updates](automatic-updates.md).
