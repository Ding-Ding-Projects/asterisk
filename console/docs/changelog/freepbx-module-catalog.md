# FreePBX module catalog

## 2026-08-24

Added a generated FreePBX 17 public module catalog sourced through the official GitHub CLI route.
The catalog records 83 public module metadata entries, exact source revisions, licenses and
entitlement classes, dependencies, Asterisk resources, published command and API metadata, UI
families, local installation state, and exact unavailable reasons. Added a native schema-driven
module form model and a fail-closed catalog/inventory validator with a deliberate negative
regression.

The follow-up also adds a native searchable catalog destination, explicit exclusion records,
multi-resource field identity, and a typed FreePBX runtime adapter. The adapter uses bounded
allowlisted `fwconsole` arguments, performs entitlement and confirmation checks, reads state back
after each action, and attempts a safe inverse action when readback does not match. No live target
was contacted in this lane, so runtime and built-artifact evidence remain unverified.

This entry documents implementation and static generation only. Runtime actions, target writes,
packaging, built-artifact interaction, and screen captures remain unverified.
