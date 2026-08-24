# Hosted control-plane deployment

This directory contains the deployment contract for the hosted Ding PBX control plane. It is separate from the Windows desktop package. The desktop package carries the complete Asterisk WSL root filesystem in `console/resources/asterisk/`, while the hosted image carries the Linux control plane and an Asterisk build from the same source commit.

## Build from one exact commit

Run the build from the repository root or from this directory:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployer\deployment\build-control-plane.ps1 -Version 0.1.0
```

The script reads `git rev-parse HEAD`, passes that full 40-character commit to Docker, and refuses to report success unless the resulting image label matches it. The Dockerfile pins its Ubuntu and Node build images by digest. The image also stores the source commit, version, and base-image digests in `/opt/ding-pbx-console/provenance.json`. `out/control-plane-image.json` records the local image identifier and the source commit. The build script does not start a container, connect to a host, or deploy anything.

The image has a dedicated non-root UID and GID, a read-only root filesystem in the Compose deployment, dropped Linux capabilities, `no-new-privileges`, bounded temporary filesystems, an explicit port, a persistent data volume, an OCI revision label, and a Docker healthcheck against `/api/v1/health`.

## Compose deployment contract

Create a private operator directory outside this repository containing the TLS certificate and private key. Set these variables in that operator environment, without placing their values in a checked-in file:

```powershell
$env:DING_PBX_IMAGE = 'registry.example.invalid/ding-pbx-control-plane@sha256:<verified-image-digest>'
$env:DING_PBX_SOURCE_COMMIT = '<the-40-character-commit-used-for-the-image>'
$env:DING_PBX_VERSION = '<the-image-version>'
$env:DING_PBX_TLS_CERT_FILE = 'C:\private\ding-pbx\tls\fullchain.pem'
$env:DING_PBX_TLS_KEY_FILE = 'C:\private\ding-pbx\tls\privkey.pem'
docker compose --project-name ding-pbx-control-plane --file .\deployer\deployment\docker-compose.yml up --detach
```

The Compose file uses `127.0.0.1:8088` by default. Set `DING_PBX_BIND_ADDRESS` only after the operator has reviewed the network boundary and TLS setup. TLS files are mounted as Docker secrets and never copied into the image, placed in an environment value, or written to logs. The named volume `ding-pbx-control-plane-data` holds the local account, sessions, server inventory, and history. The volume is not removed during an image change or rollback.

The default restart policy is `unless-stopped`. The service listens on container port `8088`, has a healthcheck with a 20 second start period and three retries, and exposes the source commit and version through labels. A health response with an unavailable Asterisk version is still a real response and is not treated as a fabricated version.

## Read-only preflight inventory

The exact local inventory command is:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployer\deployment\preflight.ps1 -Mode all
```

It reads WSL status and distributions, local Docker version, engine information, containers, and storage usage. It performs no install, start, stop, import, remove, prune, or deployment action. To inspect an explicitly approved private host, supply its persistent known-hosts file and use the same read-only command:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployer\deployment\preflight.ps1 -Mode host -ApprovedHost <approved-host> -ApprovedPort 22 -ApprovedUser <approved-user> -KnownHostsPath <persistent-known-hosts-file>
```

The host probe reads architecture, CPU count, memory, root filesystem capacity, Docker engine information, and every container. It does not stop or replace an unrelated workload. The host spelling and port must already be approved in the operator's private inventory before this command is run.

## Rollback

Rollback means selecting a previously verified immutable image reference while keeping the data volume:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployer\deployment\rollback.ps1 -PreviousImage 'registry.example.invalid/ding-pbx-control-plane@sha256:<previous-verified-digest>'
```

That command is plan-only. Review the source commit and image provenance, then add `-Execute` to run the Compose update. It never removes the named data volume. If the image fails its healthcheck, inspect `docker compose ps`, `docker compose logs --no-color control-plane`, and the recorded image provenance before choosing another verified image. Do not rebuild an older commit under a new tag and call it a rollback.

## Desktop WSL runtime

The Windows desktop continues to use the bundled `asterisk-wsl-rootfs.tar` and its adjacent `asterisk-wsl-rootfs.json`. The control plane validates the schema, source commit, runtime identifier, base-image digest, SHA-256 shape, and rootfs byte count before offering the payload to WSL. Runtime actions are scoped to the fixed `ding-pbx-console` distribution: status, provision, stop, remove for recovery, and daemon status, start, stop, and restart. Each daemon action asks Asterisk for its own answer instead of trusting a process exit code. Removal remains a destructive action and is not part of deployment automation.

## Evidence state

The source and deployment records are committed, but no Docker build, WSL import, hosted deployment, private-host probe, installer run, or runtime capture was performed in this lane. The next operator must run the read-only preflight first, build from the exact desired commit, verify image labels and `/opt/ding-pbx-console/provenance.json`, and only then decide whether a deployment is authorized.
