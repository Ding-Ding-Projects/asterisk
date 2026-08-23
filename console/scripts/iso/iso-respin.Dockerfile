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

# The repack below asks the base image to describe its own boot arrangement rather than
# naming boot files by path.
#
# The first version followed Ubuntu's published autoinstall guide, which names
# `boot_hybrid.img` for the master boot record. Ubuntu 24.04.4 does not ship that file.
# The hybrid repack therefore failed, the fallback ran, and the build produced a valid
# ISO 9660 image with entirely correct contents that could not boot. That is the worst
# outcome available for an installer: every check short of booting it passes.
#
# `-report_el_torito as_mkisofs` returns the exact options that reproduce the source
# image's boot setup, including reading the master boot record and the appended EFI
# partition back out of it by byte interval. That is what the vendor shipped rather than
# a reconstruction, and it does not go stale when a point release moves a file.
#
# The three assertions afterwards check that it can boot rather than that a file exists:
# both El Torito entries present, and a real master boot record signature at byte 510.
# Verified against a real build: without them the fallback image passed every other
# check in this file.
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
    BOOTOPTS="$(xorriso -indev /work/base.iso -report_el_torito as_mkisofs 2>/dev/null \
      | grep -E '^(--grub2-mbr|--protective-msdos-label|-partition_|--mbr-force-bootable|-append_partition|-appended_part_as_gpt|-iso_mbr_part_type|-c |-b |-no-emul-boot|-boot-load-size|-boot-info-table|--grub2-boot-info|-eltorito-alt-boot|-e )' \
      | sed "s#'base.iso'#'/work/base.iso'#g" | tr '\n' ' ')"; \
    test -n "$BOOTOPTS"; \
    eval xorriso -as mkisofs -r -V DINGPBX -J -joliet-long "$BOOTOPTS" -o /work/output.iso /work/extracted; \
    xorriso -indev /work/output.iso -report_el_torito plain 2>&1 | grep -q BIOS; \
    xorriso -indev /work/output.iso -report_el_torito plain 2>&1 | grep -q UEFI; \
    test "$(dd if=/work/output.iso bs=1 skip=510 count=2 2>/dev/null | od -An -tx1 | tr -d ' ')" = 55aa; \
    ls -la /work/output.iso

CMD ["/bin/true"]
