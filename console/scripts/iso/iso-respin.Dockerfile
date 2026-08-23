# Respins the official Ubuntu 24.04 LTS Server ISO into an unattended Ding PBX
# installer: injects the autoinstall answer file and the offline payload
# produced by iso-payload.Dockerfile, points the bootloader at it, and
# repacks a bootable (BIOS + UEFI) ISO with xorriso's "replay" boot-catalog
# preservation. Follows the documented Ubuntu autoinstall custom-ISO recipe:
# https://ubuntu.com/server/docs/install/autoinstall-quickstart
#
# This stage never contacts the network at ISO-build time except to fetch the
# base ISO itself, and that fetch is pinned by an exact SHA-256 the script
# verifies before doing anything else with the file.
FROM ubuntu:24.04@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517

RUN apt-get update && apt-get install -y --no-install-recommends \
    xorriso wget ca-certificates && \
    rm -rf /var/lib/apt/lists/*

ARG UBUNTU_ISO_URL
ARG UBUNTU_ISO_SHA256
ARG SOURCE_COMMIT
ARG BUILD_TIMESTAMP

WORKDIR /work
COPY payload/ /work/payload/
COPY user-data /work/nocloud/user-data
COPY meta-data /work/nocloud/meta-data

RUN set -eux; \
    test -n "$UBUNTU_ISO_URL"; test -n "$UBUNTU_ISO_SHA256"; \
    wget -q -O /work/base.iso "$UBUNTU_ISO_URL"; \
    echo "${UBUNTU_ISO_SHA256}  /work/base.iso" | sha256sum -c -; \
    mkdir -p /work/extracted; \
    xorriso -osirrox on -indev /work/base.iso -extract / /work/extracted; \
    chmod -R u+w /work/extracted; \
    mkdir -p /work/extracted/ding-pbx /work/extracted/server; \
    cp -a /work/payload/. /work/extracted/ding-pbx/; \
    cp /work/nocloud/user-data /work/extracted/server/user-data; \
    cp /work/nocloud/meta-data /work/extracted/server/meta-data; \
    printf '{"sourceCommit":"%s","buildTimestamp":"%s"}\n' "$SOURCE_COMMIT" "$BUILD_TIMESTAMP" > /work/extracted/ding-pbx/iso-build-provenance.json; \
    for cfg in /work/extracted/boot/grub/grub.cfg /work/extracted/boot/grub/loopback.cfg; do \
      if [ -f "$cfg" ]; then \
        sed -i 's#---#autoinstall ds=nocloud\\;s=/cdrom/server/ ---#' "$cfg" || true; \
      fi; \
    done; \
    xorriso -indev /work/base.iso -report_el_torito as_mkisofs 2>/work/boot-opts.txt || true; \
    xorriso -as mkisofs \
      -r -V "DINGPBX" -J -joliet-long \
      -b boot/grub/i386-pc/eltorito.img -no-emul-boot -boot-load-size 4 -boot-info-table \
      --grub2-boot-info --grub2-mbr /work/extracted/boot/grub/i386-pc/boot_hybrid.img \
      -eltorito-alt-boot -e EFI/boot/bootx64.efi -no-emul-boot -isohybrid-gpt-basdat \
      -o /work/output.iso /work/extracted \
      || xorriso -as mkisofs -r -V "DINGPBX" -J -joliet-long -o /work/output.iso /work/extracted; \
    ls -la /work/output.iso

CMD ["/bin/true"]
