FROM ubuntu:24.04@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517 AS build

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
    make menuselect.makeopts && \
    menuselect/menuselect --disable BUILD_NATIVE menuselect.makeopts && \
    make -j2 && \
    make install DESTDIR=/stage && \
    make samples DESTDIR=/stage

RUN rm -rf /stage/var/run

FROM ubuntu:24.04@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517

ARG ASTERISK_SOURCE_REVISION
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libcap2 libcurl4t64 libedit2 libgcc-s1 libjansson4 \
    libncurses6 libsqlite3-0 libssl3t64 libstdc++6 libtinfo6 libuuid1 \
    libxml2 systemd tzdata && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /stage/ /

RUN set -eux; \
    groupadd --system asterisk; \
    useradd --system --gid asterisk --home-dir /var/lib/asterisk --shell /usr/sbin/nologin asterisk; \
    install -d -o asterisk -g asterisk /var/lib/asterisk /var/log/asterisk /var/spool/asterisk /run/asterisk /usr/share/ding-pbx; \
    chown -R asterisk:asterisk /var/lib/asterisk /var/log/asterisk /var/spool/asterisk; \
    printf '[boot]\nsystemd=true\n\n[user]\ndefault=root\n' > /etc/wsl.conf; \
    printf '%s\n' '[Unit]' 'Description=Asterisk PBX bundled by Ding PBX Console' 'After=network.target' '' '[Service]' 'Type=simple' 'User=asterisk' 'Group=asterisk' 'ExecStart=/usr/sbin/asterisk -f -U asterisk -G asterisk' 'ExecReload=/usr/sbin/asterisk -rx core reload' 'Restart=on-failure' '' '[Install]' 'WantedBy=multi-user.target' > /etc/systemd/system/asterisk.service; \
    ln -s /etc/systemd/system/asterisk.service /etc/systemd/system/multi-user.target.wants/asterisk.service; \
    printf '{"schemaVersion":1,"sourceCommit":"%s","baseImage":"ubuntu:24.04","baseDigest":"sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517","runtime":"wsl2-linux-amd64"}\n' "$ASTERISK_SOURCE_REVISION" > /usr/share/ding-pbx/bundle-manifest.json; \
    ldconfig; \
    /usr/sbin/asterisk -V; \
    if find /usr/sbin/asterisk /usr/lib/asterisk/modules -type f -exec ldd '{}' ';' 2>&1 | grep -q 'not found'; then echo 'A bundled Asterisk object has an unresolved runtime library.' >&2; exit 1; fi

LABEL org.opencontainers.image.title="Ding PBX Console bundled Asterisk runtime" \
      org.opencontainers.image.source="https://github.com/Ding-Ding-Projects/material-asterisk" \
      org.opencontainers.image.revision="$ASTERISK_SOURCE_REVISION"

CMD ["/usr/sbin/asterisk", "-f", "-U", "asterisk", "-G", "asterisk"]
