/**
 * Re-exports the console's own allowlisted, no-shell process executor.
 *
 * This deployer is a separate desktop application but shares one control-plane
 * discipline with the console: no shell, an explicit executable allowlist, redacted
 * secrets, bounded output. Rather than copy `console/control-plane/executor.ts`, this
 * file re-exports it, so a fix or an audit of the executor only ever has one place to
 * happen.
 */
export * from "../../console/control-plane/executor.js";
