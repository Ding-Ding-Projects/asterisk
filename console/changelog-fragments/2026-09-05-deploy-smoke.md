# Deploy smoke: runtime provenance, managed-distro preference, portable Asterisk build

- The control plane now accepts the runtime provenance schema the generator actually writes (`schemaVersion: 2`). It had accepted only version 1, so every packaged runtime was reported unavailable and the deploy wizard fell through to a base-image fallback the package does not carry.
- Discovery now connects to the managed `ding-pbx-console` distribution whenever it is present instead of whichever distribution `wsl --list` prints first. On a machine with another distribution sorting ahead, the dashboard used to probe that one and report `asterisk: command not found`.
- The Asterisk runtime image disables menuselect's `BUILD_NATIVE` before compiling. The default compiled with `-march=native` on the build runner, and the resulting daemon died with `Illegal instruction` (exit 132) on an i9-14900KF desktop while `asterisk -V` still answered. A test keeps the disable between configure and make.
