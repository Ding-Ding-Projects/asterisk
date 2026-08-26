# Hosted control-plane deployment record

## Current change

Added a reproducible hosted control-plane image and Compose contract under `deployer/deployment/`. The image records the exact source commit and version, binds source-tree, Dockerfile, lockfile, and input-manifest digests, copies the pinned Node `22.23.2` runtime, records apt package versions and a matching SBOM digest, runs as a bounded non-root user, exposes only the admin port `8088`, mounts six owned writable runtime volumes, and provides a redacted liveness healthcheck. TLS files are external Docker secrets. A read-only WSL, Docker, and exact private-inventory host command reports actual capacity, architecture, port conflicts, SSH status, and existing workloads without mutating them. An external immutable deployment manifest drives rollout, and a provenance-driven deployment script waits for liveness and local Asterisk readiness before preserving or restoring the current image.

The desktop control plane now hashes the bundled WSL rootfs in bounded chunks and rejects it when its trusted manifest, source commit, runtime identifier, base-image digest, SHA-256, byte count, or 8 GiB upper bound does not match. Hosted mode uses an explicit local Asterisk transport when configured and refuses WSL, daemon lifecycle, configuration, media, history, connect, and snapshot actions by name. `/api/v1/health` is liveness only. Authenticated target readiness is `/api/v1/ready`.

Standalone snapshot restore now re-resolves the Compose container after restart and fails closed unless that exact ID has the expected project and service labels, the manifest-declared immutable image and local image ID, plus the fixed ordered five-volume inventory with both required ownership labels on every volume. Runtime restore verification remains unrun.

## Verification

Implementation records are present. Docker build, WSL import, hosted deployment, private-host inventory, installer execution, runtime interaction, and captures were not run in this change.

## Suggested articles

[Hosted control-plane deployment](../platform/hosted-control-plane-deployment.md), [In-context recovery](../platform/in-context-recovery.md), and [Installer ISO](../installer-iso.md).
