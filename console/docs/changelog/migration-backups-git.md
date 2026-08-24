# Migration, verified backups, and local Git management

This change adds a real History & git migration surface to the desktop console. It exports non-secret app state with a versioned manifest, per-file byte and SHA-256 records, machine-readable omissions, and a verified Git bundle for the complete isolated local history. Import validates the schema, duplicate keys, bounds, paths, links, hashes, and bundle before taking an automatic backup and switching staged data atomically. The same surface records backup operations and exposes validated HTTPS, SSH, and local bare-repository remotes with explicit normal fetch and push receipts.

Verification for this lane is limited to design compilation, documentation bundling, diff checks, and narrow TypeScript syntax parsing. No built-artifact UI capture exists yet. Packaged import, a real backup restore, and actual remote mutation remain runtime evidence for the integrated task.

Commit link: [`c086ecca12`](https://github.com/Ding-Ding-Projects/asterisk/commit/c086ecca12), the implementation commit for this lane. The default branch integration may add a later merge commit.
