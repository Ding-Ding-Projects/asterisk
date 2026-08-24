# Reproducible hosted control-plane image.
#
# The build context is the repository root. build-control-plane.ps1 supplies
# SOURCE_COMMIT after checking it against git rev-parse HEAD. The image itself
# carries that value in both its OCI labels and /opt/ding-pbx/provenance.json.
# No credentials, private keys, or deployment target details are copied into it.

FROM ubuntu:24.04@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517 AS asterisk-build

ARG SOURCE_COMMIT
ARG SOURCE_TREE_COMMIT
ARG SOURCE_TREE_SHA256
ARG DOCKERFILE_SHA256
ARG CONSOLE_LOCK_SHA256
ARG INPUT_MANIFEST_SHA256
ARG UBUNTU_SNAPSHOT=20260824T000000Z
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /src

RUN sed -i "s|archive.ubuntu.com/ubuntu|snapshot.ubuntu.com/ubuntu/${UBUNTU_SNAPSHOT}|g; s|security.ubuntu.com/ubuntu|snapshot.ubuntu.com/ubuntu/${UBUNTU_SNAPSHOT}|g" /etc/apt/sources.list.d/ubuntu.sources && \
    test -n "$SOURCE_COMMIT" && test "$SOURCE_TREE_COMMIT" = "$SOURCE_COMMIT" && test "$SOURCE_TREE_SHA256" != '' && \
    test "$DOCKERFILE_SHA256" != '' && test "$CONSOLE_LOCK_SHA256" != '' && test "$INPUT_MANIFEST_SHA256" != ''

RUN apt-get update && apt-get install -y --no-install-recommends \
    autoconf automake bison build-essential bzip2 ca-certificates flex git \
    libcurl4-openssl-dev libedit-dev libjansson-dev libncurses-dev libssl-dev \
    libsqlite3-dev libtool libxml2-dev patch pkg-config uuid-dev wget && \
    rm -rf /var/lib/apt/lists/*

COPY . /src
RUN printf '%s  /src/deployer/deployment/inputs.lock.json\n' "$INPUT_MANIFEST_SHA256" | sha256sum -c -
RUN test -n "$SOURCE_COMMIT" && \
    ./bootstrap.sh && \
    ./configure --with-pjproject-bundled --without-dahdi --without-pri --without-tonezone && \
    make -j2 && \
    make install DESTDIR=/stage && \
    make samples DESTDIR=/stage && \
    rm -rf /stage/var/run

FROM node:22.23.2-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436 AS console-build

ARG SOURCE_COMMIT
ARG NODE_RUNTIME_VERSION=22.23.2
WORKDIR /src/console
COPY console/package.json console/package-lock.json ./
RUN npm ci --ignore-scripts
COPY console/ ./
RUN test -n "$SOURCE_COMMIT" && npm run build && \
    test "$(node --version)" = "v${NODE_RUNTIME_VERSION}"

FROM ubuntu:24.04@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517

ARG SOURCE_COMMIT
ARG SOURCE_TREE_COMMIT
ARG SOURCE_TREE_SHA256
ARG DOCKERFILE_SHA256
ARG CONSOLE_LOCK_SHA256
ARG INPUT_MANIFEST_SHA256
ARG IMAGE_VERSION=dev
ARG IMAGE_DIGEST=unpublished
ARG UBUNTU_SNAPSHOT=20260824T000000Z
ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    DING_HOST=0.0.0.0 \
    DING_PORT=8088 \
    DING_DATA_DIR=/var/lib/ding-pbx-console

RUN sed -i "s|archive.ubuntu.com/ubuntu|snapshot.ubuntu.com/ubuntu/${UBUNTU_SNAPSHOT}|g; s|security.ubuntu.com/ubuntu|snapshot.ubuntu.com/ubuntu/${UBUNTU_SNAPSHOT}|g" /etc/apt/sources.list.d/ubuntu.sources && \
    apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libcap2 libcurl4t64 libedit2 libgcc-s1 libjansson4 \
    libncurses6 libsqlite3-0 libssl3t64 libstdc++6 libtinfo6 libuuid1 libxml2 \
    tini && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd --system --gid 10001 ding-pbx && \
    useradd --system --uid 10001 --gid 10001 --home-dir /var/lib/ding-pbx-console \
      --shell /usr/sbin/nologin ding-pbx && \
    install -d -o ding-pbx -g ding-pbx /opt/ding-pbx-console /var/lib/ding-pbx-console \
      /var/log/ding-pbx-console

COPY --from=asterisk-build /stage/ /
COPY --from=console-build /usr/local/bin/node /usr/local/bin/node
COPY --from=console-build /src/console/dist/ /opt/ding-pbx-console/dist/
COPY --from=console-build /src/console/dist-electron/ /opt/ding-pbx-console/dist-electron/
COPY --from=console-build /src/console/resources/ /opt/ding-pbx-console/resources/
COPY deployer/deployment/hosted-entrypoint.sh /usr/local/bin/ding-pbx-entrypoint.sh

RUN install -d -o ding-pbx -g ding-pbx /etc/asterisk /run/asterisk /var/lib/asterisk /var/log/asterisk /var/spool/asterisk && \
  chown -R ding-pbx:ding-pbx /etc/asterisk /var/lib/asterisk /var/log/asterisk /var/spool/asterisk /run/asterisk 2>/dev/null || true && \
  chmod 0555 /usr/local/bin/ding-pbx-entrypoint.sh && \
  dpkg-query -W -f='${Package}\t${Version}\n' > /opt/ding-pbx-console/sbom-apt.txt && \
  /usr/local/bin/node --version > /opt/ding-pbx-console/node-runtime-version.txt && \
  printf '%s\n' \
  '{' \
  '  "schemaVersion": 1,' \
  '  "sourceCommit": "'"$SOURCE_COMMIT"'",' \
  '  "imageVersion": "'"$IMAGE_VERSION"",' \
  '  "imageDigest": "'"$IMAGE_DIGEST"",' \
  '  "sourceTreeCommit": "'"$SOURCE_TREE_COMMIT"'",' \
  '  "sourceTreeSha256": "'"$SOURCE_TREE_SHA256"",' \
  '  "dockerfileSha256": "'"$DOCKERFILE_SHA256"'",' \
  '  "consoleLockSha256": "'"$CONSOLE_LOCK_SHA256"'",' \
  '  "inputManifestSha256": "'"$INPUT_MANIFEST_SHA256"'",' \
  '  "ubuntuSnapshot": "'"$UBUNTU_SNAPSHOT"'",' \
  '  "sbom": ["sbom-apt.txt", "node-runtime-version.txt"],' \
  '  "baseImages": {' \
  '    "runtime": "ubuntu:24.04@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517",' \
  '    "nodeBuild": "node:22.23.2-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436"' \
  '  }' \
  '}' > /opt/ding-pbx-console/provenance.json && \
  chown -R ding-pbx:ding-pbx /opt/ding-pbx-console /var/lib/ding-pbx-console /var/log/ding-pbx-console

LABEL org.opencontainers.image.title="Ding PBX hosted control plane" \
      org.opencontainers.image.description="Asterisk administration control plane" \
      org.opencontainers.image.source="https://github.com/Ding-Ding-Projects/asterisk" \
      org.opencontainers.image.revision="$SOURCE_COMMIT" \
      org.opencontainers.image.version="$IMAGE_VERSION" \
      io.ding.pbx.image-digest="$IMAGE_DIGEST" \
      io.ding.pbx.source-tree-commit="$SOURCE_TREE_COMMIT" \
      io.ding.pbx.source-tree-sha256="$SOURCE_TREE_SHA256" \
      io.ding.pbx.dockerfile-sha256="$DOCKERFILE_SHA256" \
      io.ding.pbx.console-lock-sha256="$CONSOLE_LOCK_SHA256" \
      io.ding.pbx.input-manifest-sha256="$INPUT_MANIFEST_SHA256" \
      io.ding.pbx.ubuntu-snapshot="$UBUNTU_SNAPSHOT" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /opt/ding-pbx-console
VOLUME ["/var/lib/ding-pbx-console"]
EXPOSE 8088
USER 10001:10001
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/usr/local/bin/ding-pbx-entrypoint.sh"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8088/api/v1/health').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"]
