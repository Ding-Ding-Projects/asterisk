/**
 * A second, deliberately tiny allowlist beside `READ_ONLY_COMMANDS` in
 * `asterisk-readings.ts` -- for the handful of `asterisk -rx` command lines this console
 * runs that are *not* read-only, because the screen offering them has no other way to
 * carry out a real per-object operation (loading a module, unloading a module, ending a
 * live AMI session) without inventing a second execution path.
 *
 * Everything here is validated by exact shape -- fixed verb words plus one argument this
 * module checks itself -- never by trusting a caller-supplied string wholesale, exactly
 * as `isAllowedCommandLine` in `asterisk-readings.ts` does for the read-only list. A
 * command that does not match one of these builders is refused, not trimmed or guessed.
 *
 * Sources, read directly out of this checkout rather than recalled:
 *   main/cli.c   handle_load    (~line 243)  "module load <module name>"
 *   main/cli.c   handle_unload  (~line 848)  "module unload [-f|-h] <module_1> [...]"
 *   main/cli.c   handle_reload  (~line 271)  "module reload [module ...]"
 *   main/manager.c  handle_kickmanconn (~line 1388)  "manager kick session <file descriptor>"
 */

/** Asterisk always prints and expects a loadable module by its `.so` resource name --
 *  see every row `module show` itself prints (`ModuleSummary.name` in this same
 *  control-plane). Anything else is not a module this console has ever read a name for. */
const MODULE_RESOURCE_NAME = /^[A-Za-z][A-Za-z0-9_-]*\.so$/u;

export type ModuleActionKind = "load" | "unload" | "reload";

export function isModuleResourceName(name: string): boolean {
  return MODULE_RESOURCE_NAME.test(name);
}

/** Builds the exact `asterisk -rx` command line for one module action on one module,
 *  or `undefined` when the module name is not one this console will send anywhere. The
 *  caller (the Modules screen's row menu) always has a real module name off a row this
 *  console itself just read with `module show`, so `undefined` here means the row is
 *  stale rather than that a user typed something -- there is no free-text entry point. */
export function buildModuleActionCommand(kind: ModuleActionKind, moduleName: string): string | undefined {
  if (!isModuleResourceName(moduleName)) return undefined;
  if (kind === "load") return `module load ${moduleName}`;
  if (kind === "unload") return `module unload ${moduleName}`;
  return `module reload ${moduleName}`;
}

/** A manager (AMI) session is identified on the wire, and in `manager show connected`'s
 *  own `FileDes` column, by the file descriptor Asterisk accepted its socket on --
 *  always a small positive integer, never a username (`handle_kickmanconn` above,
 *  `atoi(a->argv[3])`, rejecting anything `<= 0`). */
const FILE_DESCRIPTOR = /^[1-9][0-9]{0,8}$/u;

export function isManagerSessionFileDescriptor(value: string): boolean {
  return FILE_DESCRIPTOR.test(value);
}

export function buildManagerKickSessionCommand(fileDescriptor: string): string | undefined {
  if (!isManagerSessionFileDescriptor(fileDescriptor)) return undefined;
  return `manager kick session ${fileDescriptor}`;
}

/**
 * True for a complete `asterisk -rx` command line this console will run even though it
 * is not read-only -- reconstructed from the exact same builders above rather than
 * matched by a separate, looser pattern, so a command this validator accepts is always
 * one of exactly these two shapes and nothing a future edit to one builder could widen
 * without the other noticing.
 */
export function isAllowlistedWriteCommand(command: string): boolean {
  const trimmed = command.trim();
  const moduleMatch = /^module (load|unload|reload) (\S+)$/u.exec(trimmed);
  if (moduleMatch) {
    return buildModuleActionCommand(moduleMatch[1] as ModuleActionKind, moduleMatch[2]) === trimmed;
  }
  const kickMatch = /^manager kick session (\S+)$/u.exec(trimmed);
  if (kickMatch) {
    return buildManagerKickSessionCommand(kickMatch[1]) === trimmed;
  }
  return false;
}
