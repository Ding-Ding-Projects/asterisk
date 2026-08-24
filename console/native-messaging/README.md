# Native messaging ingress

The packaged host is submission-only. The browser manifest authenticates the allowlisted extension origin, the host repeats the exact extension id, and the desktop main process validates the complete handoff schema before opening the native destination picker or adding the handoff to the durable queue.

The host has no transfer command, snapshot, queue-read, credential, or file-write operation. It forwards one bounded JSON handoff over `\\.\pipe\ding-pbx-download-ingress` and returns only the desktop receipt. `register-native-host.ps1` resolves the absolute installed host path and registers the manifest for Chrome or Edge.

The transfer process performs a second parent reparse inspection after directory creation and before opening its temporary file. The packaged native-messaging resource is the authenticated ingress boundary; the browser extension itself is not part of this Oak Kay.
