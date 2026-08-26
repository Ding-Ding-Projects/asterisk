# Hosted control-plane deployment

## Behavior

The hosted control plane is built from a `git archive` of the exact Asterisk repository commit supplied by `deployer/deployment/build-control-plane.ps1`. The build stage compiles Asterisk and the console server. The runtime image records the source commit, image version, source-tree, Dockerfile, lockfile, input-manifest, and Ubuntu snapshot digests in OCI labels and `/opt/ding-pbx-console/provenance.json`. It copies the pinned Node `22.23.2` runtime and records apt package versions plus a matching SBOM digest.

The Windows desktop is a separate surface. It uses the bundled `console/resources/asterisk/asterisk-wsl-rootfs.tar`, provenance, trusted manifest, and release manifest. The desktop control plane provides status, provision, daemon start, stop, restart, read, and recovery actions for its fixed managed WSL distribution. A runtime action is not successful merely because `wsl.exe` returned zero. The control plane hashes the rootfs and asks the distribution or Asterisk for a direct answer before reporting the observed state.

## Configuration

`deployer/deployment/docker-compose.yml` is the hosted deployment contract. Its exact network choice is `admin-only`: port `8088` is the only published port, no SIP, RTP, AMI, or ARI port is published, and the Docker network is internal. It uses five named writable volumes for control-plane data, Asterisk configuration, Asterisk library state, logs, and spool state, plus the `/run/asterisk` tmpfs socket area. The server binds to `0.0.0.0` inside the container, while `DING_PBX_BIND_ADDRESS` controls host-side publication. It also uses `restart: unless-stopped`, a read-only root filesystem, dropped capabilities, `no-new-privileges`, bounded temporary filesystems, memory, CPU, PID, file-descriptor, and process limits. TLS files are mounted through Docker secrets. They are not copied into the image, passed as secret-bearing environment values, or emitted in logs.

Build the image with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployer\deployment\build-control-plane.ps1 -Version <version>
```

Inspect local WSL and Docker capacity with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployer\deployment\preflight.ps1 -Mode all
```

The optional host mode requires an exact host, user, port, architecture, thresholds, allowed port, and persistent known-hosts file from the operator's private inventory. It reads architecture, CPU, memory, disk capacity, port listeners, Docker information, and existing workloads only. It refuses a tuple that is not present in that inventory. Hosted deployment is restricted to the local Docker engine. Approved SSH mode is inventory evidence only and is not an execution route.

## Failure and recovery

An image with a mismatched revision label, missing provenance, a mutable tag, or an invalid health response is not a verified deployment. Preserve the data volume, inspect the exact image record, and select a previously verified immutable image reference. `deployer/deployment/deploy-control-plane.ps1` derives source commit and version from embedded provenance, waits for liveness, and automatically restores the previous image when the new image fails. `deployer/deployment/rollback.ps1` prints a plan by default and changes Compose state only when `-Execute` is supplied. It never removes the data volume.

Standalone snapshot restore validates the fixed ordered set of five persistent volume names before it writes anything, then verifies every volume's project and role label. After Compose restarts, the restore resolves a fresh container ID and binds it to the `ding-pbx` and `control-plane` ownership labels, the immutable manifest image reference and image ID, and the same exact volume inventory. Health and authenticated readiness are accepted only after those ownership and identity checks pass; a stale ID, wrong label, missing volume label, reordered or substituted volume, or image mismatch is a restore failure.

If the desktop reports an unusable managed WSL distribution, recovery is scoped to `ding-pbx-console`: stop it, inspect the reported WSL reason, and use the destructive removal action only after the app's confirmation flow. Re-provisioning then uses the packaged archive and validates Asterisk directly. A registered user distribution is never imported over or removed by the desktop runtime lane.

## Security considerations

The image runs as UID/GID `10001`, does not receive a shell command, drops all Linux capabilities, and uses a read-only root filesystem in Compose. The persistent volume is the only writable application location. The build context excludes credentials, private keys, generated output, and the WSL tar payload. Code signing remains disabled for the Windows package.

## Verification state

The deployment manifests, committed JSON Schema validator, shared provenance validator with a PowerShell fallback, exact HKDF and streaming archive protection, plaintext recovery journal, build script, structured read-only preflight, rollback plan, liveness endpoint, authenticated readiness endpoint, explicit hosted transport, owned-volume verification, protected encrypted snapshot journal and recoverability proof, standalone restore validation, verified retention cleanup, and desktop provenance validation are implemented. First admin setup is loopback-only even under TLS, with no public nonce or public enrollment value. Plan-only deployment reports local image ID and RepoDigests while leaving embedded provenance, snapshot recoverability, Compose state, and runtime readiness unverified. This lane intentionally did not build an image, import WSL, contact a private host, start Docker Compose, run the installer, or capture a runtime surface. These implementation records remain separate from runtime verification, which is still unrun.

## Suggested articles

[In-context recovery](in-context-recovery.md), [Installer ISO](../installer-iso.md), and [Automatic updates](automatic-updates.md).
