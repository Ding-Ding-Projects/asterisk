# Hosted control-plane deployment

This directory contains the deployment contract for the hosted Ding PBX control plane. It is separate from the Windows desktop package. The desktop package carries the complete Asterisk WSL root filesystem in `console/resources/asterisk/`, while the hosted image carries the Linux control plane and an Asterisk build from the same source commit.

## Build from one exact commit

Run the build from the repository root or from this directory:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployer\deployment\build-control-plane.ps1 -Version 0.1.0
```

The script reads `git rev-parse HEAD`, passes that full 40-character commit to Docker, and refuses to report success unless the resulting image label matches it. The Dockerfile pins its Ubuntu and Node build images by digest. The image also stores the source commit, version, and base-image digests in `/opt/ding-pbx-console/provenance.json`. `out/control-plane-image.json` records the local image identifier and the source commit. The build script does not start a container, connect to a host, or deploy anything.

After a registry has returned the immutable image digest, create an external deployment manifest matching `deployment-manifest.schema.json`. It must carry the image digest, source commit, version, `ding-pbx-control-plane`, admin port `8088`, `admin-only` network mode, target kind (`local-docker` or `approved-ssh`), the preflight evidence path, the embedded provenance SHA-256, the source-tree, Dockerfile, lockfile, input-manifest, apt SBOM, and non-secret `snapshotKeyId` values. The manifest lives outside the repository and is the final release identity. `snapshotKeyId` is an operator-chosen label, not a digest or representation of the encryption key.

The image has a dedicated non-root UID and GID, a read-only root filesystem in the Compose deployment, dropped Linux capabilities, `no-new-privileges`, bounded temporary filesystems, explicit memory, CPU, PID, file-descriptor, and process limits, an explicit port, five persistent volumes plus the `/run/asterisk` tmpfs, an OCI revision label, an embedded apt SBOM, a copied Node `22.23.2` runtime, and a Docker healthcheck against `/api/v1/health`.

The Squirrel packaging path writes a non-secret WSL release binding into the packaged resources and `release-identity.json` records every installer, `RELEASES`, and package byte digest. `build-installer.ps1` rehashes those exact output files and compares them to the identity before reporting a package result. The desktop runtime independently rehashes the bundled rootfs, trusted manifest, release manifest, and binding before exposing WSL actions. This proves package-to-payload identity only. No installer execution, WSL import, or hosted runtime verification was performed in this source lane, so those runtime claims remain unverified until the separately authorized runtime Chuts run.

## Compose deployment contract

Registry publication is implemented but remains unverified in this lane. An immutable registry digest is still required in the external deployment manifest before execution.

Create a private operator directory outside this repository containing the TLS certificate and private key. Set these variables in that operator environment, without placing their values in a checked-in file:

```powershell
$env:DING_PBX_IMAGE = 'registry.example.invalid/ding-pbx-control-plane@sha256:<verified-image-digest>'
$env:DING_PBX_SOURCE_COMMIT = '<the-40-character-commit-used-for-the-image>'
$env:DING_PBX_VERSION = '<the-image-version-derived-from-provenance>'
$env:DING_PBX_TLS_CERT_FILE = 'C:\private\ding-pbx\tls\fullchain.pem'
$env:DING_PBX_TLS_KEY_FILE = 'C:\private\ding-pbx\tls\privkey.pem'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployer\deployment\deploy-control-plane.ps1 -ImageRef 'registry.example.invalid/ding-pbx-control-plane@sha256:<verified-image-digest>' -TlsCertFile 'C:\private\ding-pbx\tls\fullchain.pem' -TlsKeyFile 'C:\private\ding-pbx\tls\privkey.pem' -TlsCertificateSha256 '<sha256-of-the-der-certificate>' -ManifestPath 'C:\private\ding-pbx\deployment-manifest.json' -PreflightEvidencePath 'C:\private\ding-pbx\preflight.json' -SessionCookieFile 'C:\private\ding-pbx\operator-session.cookie' -SnapshotDirectory 'C:\private\ding-pbx\snapshots\<timestamp>' -SnapshotEncryptionKeyFile 'C:\private\ding-pbx\keys\snapshot.key' -Execute
```

The Compose file uses `127.0.0.1:8088` by default. `DING_PBX_BIND_ADDRESS` controls only host-side port publication; the server always listens on `0.0.0.0` inside the container so the host publication cannot select an unreachable container interface. Set the host bind only after the operator has reviewed the network boundary and TLS setup. TLS files are mounted as Docker secrets and never copied to the image, placed in an environment value, or written to logs. Five named writable volumes hold control-plane data, Asterisk configuration, library state, logs, and spool state, plus the `/run/asterisk` tmpfs socket area. The named volumes are not removed during an image change or rollback.

First administrator setup is loopback-only even when TLS is enabled. Start the initial Compose instance with `DING_PBX_BIND_ADDRESS=127.0.0.1`, create the account through the local port-forward or local browser, then move to the reviewed admin bind address. A non-loopback first-admin POST is refused regardless of transport security. There is no public setup nonce or public enrollment secret.

The default restart policy is `unless-stopped`. The service listens on container port `8088`, has a healthcheck with a 20 second start period and three retries, and exposes the source commit and version through labels. The selected network mode is `admin-only`: only the admin port `8088` is published, no SIP, RTP, AMI, or ARI port is published by this Compose contract, and the Docker network is internal. `/api/v1/health` is deliberately a redacted process-liveness route and never claims that the PBX target is ready. `/api/v1/ready` requires an authenticated session and checks the configured local Asterisk transport with `asterisk -rx`, so binary presence alone cannot become readiness. Deployment also checks the published host port before authenticated readiness, so a healthy container with an unreachable host publication cannot be reported ready.

## Read-only preflight inventory

The exact local inventory command is:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployer\deployment\preflight.ps1 -Mode all
```

It reads WSL status and distributions, local Docker version, engine information, containers, and storage usage. It performs no install, start, stop, import, remove, prune, or deployment action. To inspect an explicitly approved private host, supply its persistent known-hosts file and use the same read-only command:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployer\deployment\preflight.ps1 -Mode host -ApprovedHost <approved-host> -ApprovedPort 22 -ApprovedUser <approved-user> -KnownHostsPath <persistent-known-hosts-file> -InventoryPath <private-inventory-file>
```

The host probe reads architecture, CPU count, memory, root filesystem capacity, Docker engine information, port listeners, and every container. It compares the tuple and thresholds with the exact private inventory entry, uses the persistent known-hosts path recorded there, and does not stop or replace an unrelated workload. The host spelling and port must already be approved in the operator's private inventory before this command is run. Hosted deployment itself is restricted to the local Docker engine. Approved SSH mode is inventory evidence only until a separate exact SSH execution lane exists.

Capture the command's JSON output to the preflight evidence path named by the external deployment manifest. Plan-only deployment requires the immutable image to already exist in the local Docker cache, then performs image inspection only. It does not pull images, create temporary containers, remove containers, or change Compose state. Local engine storage is reported from Docker engine facts and workload conflicts are parsed from structured container records, not substring matches.

## Rollback

Rollback means selecting a previously verified immutable image reference while keeping the data volume:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployer\deployment\rollback.ps1 -PreviousImage 'registry.example.invalid/ding-pbx-control-plane@sha256:<previous-verified-digest>' -CurrentImage 'registry.example.invalid/ding-pbx-control-plane@sha256:<current-verified-digest>' -TlsCertFile 'C:\private\ding-pbx\tls\fullchain.pem' -TlsKeyFile 'C:\private\ding-pbx\tls\privkey.pem' -TlsCertificateSha256 '<sha256-of-the-der-certificate>' -PreviousManifestPath 'C:\private\ding-pbx\previous-deployment-manifest.json' -CurrentManifestPath 'C:\private\ding-pbx\current-deployment-manifest.json' -PreflightEvidencePath 'C:\private\ding-pbx\preflight.json' -SessionCookieFile 'C:\private\ding-pbx\operator-session.cookie' -SnapshotDirectory 'C:\private\ding-pbx\snapshots\<timestamp>' -SnapshotEncryptionKeyFile 'C:\private\ding-pbx\keys\snapshot.key'
```

That command is plan-only. Review the external deployment manifests, preflight evidence, source commit, embedded provenance, image digest, TLS paths, certificate pin, and protected operator session flow, then add `-Execute` to run the Compose update. The session credential file must be an absolute path outside this repository, have a restrictive owner ACL, contain exactly one server-issued session cookie with no newline, be no older than the default 15-minute freshness bound, and never be copied into logs or snapshots. The `/api/v1/ready` endpoint validates its signed expiry server-side. Execute mode first capacity-preflights a protected external snapshot directory, writes a durable partial journal, captures every one of the five persistent volumes with per-archive bytes, SHA-256, an authenticated version-2 `DING-PBX-SNAPSHOT` header, AES-256-CBC encryption, HKDF-SHA256-derived separate encryption and integrity keys, the non-secret `snapshotKeyId`, reopen, and contents validation, proves extraction into temporary recovery volumes, and records an exact restore command plus retention policy. The header and HMAC bind the snapshot ID, volume, key label, KDF, and algorithm to the journal. Only after recoverability is verified does it change Compose state. It waits for host-side reachability, local CLI readiness, and authenticated server readiness with a pinned certificate. If either the new image or its readiness checks fail, it stops the owned workload, restores the compatible pre-change volume state, and starts the previously verified immutable image. It verifies the live image digest, owned container labels, five persistent volumes, the `/run/asterisk` tmpfs, and the internal network. It never removes the named data volumes. If the image fails its healthcheck, inspect `docker compose ps`, `docker compose logs --no-color control-plane`, and the recorded image provenance before choosing another verified image. Do not rebuild an older commit under a new tag and call it a rollback.

## Desktop WSL runtime

The Windows desktop continues to use the bundled `asterisk-wsl-rootfs.tar` and its adjacent `asterisk-wsl-rootfs.json`. The control plane validates the schema, source commit, runtime identifier, trusted base-image digest, SHA-256 value, rootfs byte count, and an 8 GiB upper bound before offering the payload to WSL. Runtime actions are scoped to the fixed `ding-pbx-console` distribution: status, provision, stop, remove for recovery, and daemon status, start, stop, and restart. Hosted mode refuses those WSL and daemon actions by name. Hosted reads use the explicit local Asterisk transport when `DING_ASTERISK_TRANSPORT=local`; an absent or unknown transport is refused rather than guessed.

## Evidence state

The source and deployment records are committed, but no Docker build, WSL import, hosted deployment, private-host probe, installer run, or runtime capture was performed in this lane. The next operator must run the read-only preflight first, build from the exact desired commit, verify image labels and `/opt/ding-pbx-console/provenance.json`, and only then decide whether a deployment is authorized.
