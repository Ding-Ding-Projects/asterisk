# Hosted control-plane deployment record

## Current change

Added a reproducible hosted control-plane image and Compose contract under `deployer/deployment/`. The image records the exact source commit and version, binds source-tree, Dockerfile, lockfile, and input-manifest digests, copies the pinned Node `22.23.2` runtime, records an apt SBOM, runs as a bounded non-root user, exposes port `8088`, uses a persistent data volume, and provides a redacted liveness healthcheck. TLS files are external Docker secrets. A read-only WSL, Docker, and exact private-inventory host command reports capacity, architecture, port conflicts, and existing workloads without mutating them. A provenance-driven deployment script waits for health and automatically restores the previous immutable image when needed.

The desktop control plane now hashes the bundled WSL rootfs in bounded chunks and rejects it when its trusted manifest, source commit, runtime identifier, base-image digest, SHA-256, byte count, or 8 GiB upper bound does not match. Hosted mode uses an explicit local Asterisk transport when configured and refuses WSL and daemon lifecycle actions by name. `/api/v1/health` is liveness only. Authenticated target readiness is `/api/v1/ready`.

## Verification

Implementation records are present. Docker build, WSL import, hosted deployment, private-host inventory, installer execution, runtime interaction, and captures were not run in this change.

## Suggested articles

[Hosted control-plane deployment](../platform/hosted-control-plane-deployment.md), [In-context recovery](../platform/in-context-recovery.md), and [Installer ISO](../installer-iso.md).
