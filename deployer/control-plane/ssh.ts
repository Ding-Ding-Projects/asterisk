/**
 * Re-exports the console's own SSH policy adapter: host validation, the approved
 * exact host/port allowlist, and trust-on-first-use host key handling with
 * `accept-new` against a persistent, protected known_hosts store. See
 * `console/control-plane/ssh.ts` for the implementation and its safety notes; this
 * deployer intentionally shares it rather than maintaining a second copy of code that
 * decides whether a host key is trusted.
 */
export * from "../../console/control-plane/ssh.js";
