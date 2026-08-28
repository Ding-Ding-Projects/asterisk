# Builds the offline installer payload embedded on the Ding PBX ISO: a compiled
# Asterisk tree, a portable Node.js runtime, and a built Ding PBX Console server
# (dist/dist-electron), plus the install script that assembles them on the
# target machine during `late-commands`. Nothing this stage produces is fetched
# again during the unattended install — the ISO carries everything it needs.
#
# Mirrors console/scripts/asterisk-wsl-runtime.Dockerfile's build discipline:
# base image pinned by digest, source built from the exact repository commit,
# every runtime library resolved and verified before the stage is trusted.

# This argument must be global because Docker resolves a FROM image before any
# stage-scoped ARG declaration is available.
ARG CONSOLE_BUILD_BASE_IMAGE=node:22.23.2-bookworm-slim

FROM ubuntu:24.04@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517 AS asterisk-build

ARG ASTERISK_SOURCE_REVISION
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    autoconf automake bison build-essential bzip2 ca-certificates flex git \
    libcurl4-openssl-dev libedit-dev libjansson-dev libncurses-dev libssl-dev \
    libsqlite3-dev libtool libxml2-dev patch pkg-config uuid-dev wget && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY . /src

RUN test -n "$ASTERISK_SOURCE_REVISION" && \
    find . -type f -exec sh -c 'for path do if grep -Iq . "$path"; then sed -i "s/\r$//" "$path"; fi; done' sh {} + && \
    ./bootstrap.sh && \
    ./configure --with-pjproject-bundled --without-dahdi --without-pri --without-tonezone && \
    make -j2 && \
    make install DESTDIR=/stage && \
    make samples DESTDIR=/stage && \
    rm -rf /stage/var/run

# ---------------------------------------------------------------------------

# No literal base digest is hardcoded here: this build stage only ever runs
# `npm ci` / `tsc` / `vite build` against files already in the repository, so
# the image identity matters for reproducibility but not for source trust the
# way the Asterisk and final payload stages' pinned Ubuntu digest does.
# build-iso.ps1 resolves the current `node:22.23.2-bookworm-slim` digest with
# `docker buildx imagetools inspect` and passes it as CONSOLE_BUILD_BASE_IMAGE,
# recording the resolved digest in the ISO provenance either way.
FROM ${CONSOLE_BUILD_BASE_IMAGE} AS console-build

WORKDIR /console
COPY console/package.json console/package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY console/ ./
RUN npm run compile:design && npm run bundle:docs && npm run write:update-manifest && npx tsc -b && npx vite build

# ---------------------------------------------------------------------------

FROM ubuntu:24.04@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517 AS payload

ARG ASTERISK_SOURCE_REVISION
ARG NODE_RUNTIME_VERSION=22.23.2
ARG NODE_RUNTIME_SHA256

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget xz-utils && \
    rm -rf /var/lib/apt/lists/*

# Portable Linux x64 Node.js runtime, pinned by version and verified by digest —
# same pin the Windows console build uses (see HANDOFF.md), fetched once here
# rather than left for the target machine to obtain over the network.
RUN wget -q -O /tmp/node.tar.xz \
      "https://nodejs.org/dist/v${NODE_RUNTIME_VERSION}/node-v${NODE_RUNTIME_VERSION}-linux-x64.tar.xz" && \
    echo "${NODE_RUNTIME_SHA256}  /tmp/node.tar.xz" | sha256sum -c - && \
    mkdir -p /payload/runtime/node && \
    tar -xJf /tmp/node.tar.xz -C /payload/runtime/node --strip-components=1 && \
    rm /tmp/node.tar.xz

COPY --from=asterisk-build /stage/ /payload/asterisk-root/
COPY --from=console-build /console/dist/ /payload/console/dist/
COPY --from=console-build /console/dist-electron/ /payload/console/dist-electron/
COPY --from=console-build /console/resources/ /payload/console/resources/
COPY console/server/deploy/ /payload/console/server/deploy/
COPY console/scripts/iso/install-target.sh /payload/install-target.sh
COPY console/scripts/iso/dingpbx-firstboot-banner.sh /payload/dingpbx-firstboot-banner.sh
COPY console/scripts/iso/dingpbx-firstboot-banner.service /payload/dingpbx-firstboot-banner.service

RUN set -eux; \
    chmod +x /payload/install-target.sh /payload/dingpbx-firstboot-banner.sh; \
    printf '[Unit]\nDescription=Asterisk PBX for Ding PBX\nAfter=network.target\n\n[Service]\nType=simple\nUser=asterisk\nGroup=asterisk\nExecStart=/usr/sbin/asterisk -f -U asterisk -G asterisk\nExecReload=/usr/sbin/asterisk -rx core reload\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n' \
      > /payload/asterisk.service; \
    printf '{"schemaVersion":1,"sourceCommit":"%s","baseImage":"ubuntu:24.04","nodeRuntimeVersion":"%s","generatedAt":"'"$(date -u +%%Y-%%m-%%dT%%H:%%M:%%SZ)"'"}\n' \
      "$ASTERISK_SOURCE_REVISION" "$NODE_RUNTIME_VERSION" > /payload/provenance.json

CMD ["/bin/true"]
