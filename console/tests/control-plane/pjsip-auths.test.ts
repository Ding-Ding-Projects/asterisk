import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AsteriskReadings,
  READ_ONLY_COMMANDS,
  READ_ONLY_OBJECT_COMMANDS,
  isAllowedCommandLine,
  parsePjsipAuths,
} from "../../control-plane/asterisk-readings.ts";
import type { AsteriskCliGateway, ReadOnlyCommandLine } from "../../control-plane/asterisk-readings.ts";
import type { CommandResult } from "../../control-plane/executor.ts";
import type { TargetProfile } from "../../control-plane/contracts.ts";

/**
 * `pjsip show auths`, the reading the Trunk authentication screen is wired to.
 *
 * The fixture below is not a recollection of what the command prints. It is assembled from
 * the two `ast_str_append` calls in this checkout's own `res/res_pjsip/config_auth.c` and
 * the surrounding frame written by `res/res_pjsip/pjsip_cli.c`, with the widths those two
 * files actually compute:
 *
 *   CLI_MAX_TITLE_NAME 8, CLI_MAX_WIDTH 90            include/asterisk/res_pjsip_cli.h
 *   CLI_INDENT_TO_SPACES(0) = 0*2 + 1 + 8 = 9         same header, line 29
 *   header  "%*s:  <AuthId/UserName%*.*s>\n"          config_auth.c line 668, indent 9,
 *                                                     filler 90 - 9 - 20 = 61
 *   body    "%*s:  %s/%s\n"                           config_auth.c line 686, indent 9,
 *                                                     title "Auth"
 *   frame   "\n" + header + 90 '=' + "\n\n"           pjsip_cli.c lines 188-191
 *   tail    "\nObjects found: %d\n" + "\n"            pjsip_cli.c lines 216, 233
 *
 * The test at the bottom re-derives those widths from the header file rather than trusting
 * the numbers written above, so a change to either constant fails here instead of silently
 * making the fixture fiction.
 */

const INDENT = 9;
const pad = (title: string) => `${" ".repeat(Math.max(0, INDENT - title.length))}${title}`;

const HEADER = `${pad("I/OAuth")}:  <AuthId/UserName${".".repeat(61)}>`;
const RULE = "=".repeat(90);

function output(...bodies: string[]): string {
  return `\n${HEADER}\n${RULE}\n\n${bodies.join("")}\nObjects found: ${bodies.length}\n\n`;
}

const auth = (id: string, username: string) => `${pad("Auth")}:  ${id}/${username}\n`;

const TARGET: TargetProfile = {
  id: "t1",
  displayName: "Dev box",
  connectionKind: "wsl",
  wslDistribution: "Ubuntu-22.04",
};

class RecordingGateway implements AsteriskCliGateway {
  readonly commands: string[] = [];
  constructor(private readonly stdout: string) {}
  async run(_target: TargetProfile, command: ReadOnlyCommandLine): Promise<CommandResult> {
    this.commands.push(command);
    return { status: "succeeded", exitCode: 0, stdout: this.stdout, stderr: "", durationMs: 1 };
  }
}

test("parses every auth object out of the real container output", () => {
  const rows = parsePjsipAuths(output(
    auth("carrier-primary-auth", "hq-outbound"),
    auth("carrier-backup-auth", "hq-outbound"),
    auth("branch-auth", "branch01"),
  ));
  assert.deepEqual(rows, [
    { id: "carrier-primary-auth", username: "hq-outbound" },
    { id: "carrier-backup-auth", username: "hq-outbound" },
    { id: "branch-auth", username: "branch01" },
  ]);
});

test("an auth object with no username= is read as one, not dropped", () => {
  /* Asterisk prints the slash with nothing after it when `auth_user` is unset. That is a
   * real and broken configuration -- an auth object that authenticates as nobody -- and it
   * is exactly the row worth seeing, so it must survive the parse. */
  assert.deepEqual(parsePjsipAuths(output(auth("half-built", ""))), [{ id: "half-built", username: "" }]);
});

test("the header line is not read as an auth object", () => {
  /* `<AuthId/UserName...>` matches the shape of a body line closely enough to be parsed as
   * one if nothing excluded it -- an auth called "AuthId" with the username "UserName...". */
  const rows = parsePjsipAuths(output(auth("only-one", "u")));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "only-one");
});

test("a target with no auth objects parses as none rather than throwing", () => {
  /* pjsip_cli.c line 211 short-circuits an empty container to "No objects found." and never
   * prints the header or the rule at all. */
  assert.deepEqual(parsePjsipAuths("No objects found.\n\n"), []);
});

test("an id is split off at the first slash, so a username containing one survives", () => {
  assert.deepEqual(
    parsePjsipAuths(output(auth("realm-auth", "user/with/slashes"))),
    [{ id: "realm-auth", username: "user/with/slashes" }],
  );
});

test("the reading runs exactly the plural command and reports what it read", async () => {
  const gateway = new RecordingGateway(output(auth("carrier-primary-auth", "hq-outbound")));
  const readings = new AsteriskReadings(gateway, () => new Date("2026-08-25T00:00:00.000Z"));
  const reading = await readings.auths(TARGET);
  assert.deepEqual(gateway.commands, ["pjsip show auths"]);
  assert.equal(reading.result.state, "available");
  assert.deepEqual(
    reading.result.state === "available" ? reading.result.value : undefined,
    [{ id: "carrier-primary-auth", username: "hq-outbound" }],
  );
});

/**
 * The safety property this whole reading rests on, asserted rather than assumed.
 *
 * `pjsip show auth <id>` (singular) is a non-container command, so `pjsip_cli.c` line 151
 * sets `show_details_only_level_0` and `config_auth.c` line 693 reaches
 * `ast_sip_cli_print_sorcery_objectset` -- which prints every registered sorcery field,
 * and `password`, `md5_cred`, `oauth_secret` and `refresh_token` are all registered
 * (`config_auth.c` lines 743-760). Running it would print real credentials in plain text.
 *
 * Two independent things have to stay true for that never to happen: the singular command
 * must not be in either allowlist, and the gateway must refuse it if anybody constructs it
 * anyway.
 */
test("the singular auth command is in neither allowlist", () => {
  assert.ok(!(READ_ONLY_COMMANDS as readonly string[]).includes("pjsip show auth"));
  assert.ok(!(READ_ONLY_OBJECT_COMMANDS as readonly string[]).includes("pjsip show auth"));
  for (const command of READ_ONLY_COMMANDS) {
    assert.notEqual(command, "pjsip show auth", "the command that prints an auth password must never be allowlisted");
  }
});

test("the gateway refuses the singular auth command even when it is constructed by hand", () => {
  assert.equal(isAllowedCommandLine("pjsip show auth carrier-primary-auth"), false);
  assert.equal(isAllowedCommandLine("pjsip show auth"), false);
  assert.equal(isAllowedCommandLine("pjsip show auths"), true);
});

/**
 * The seam. `readings.auths` can be read perfectly and then dropped on the way out of
 * `readView`, and every assertion above stays green while the screen shows nothing --
 * the defect this repository keeps repeating. `readView` is a closure inside
 * `createControlPlaneDispatcher` and reaching it needs a real WSL discovery run, so this
 * asserts the routing itself, anchored to whole lines: a substring needle is satisfied by
 * a commented-out call, which is how a wiring line usually dies.
 */
test("readView routes the trunkauth view to the auth reading and carries it back out", () => {
  const source = readFileSync(new URL("../../control-plane/dispatch.ts", import.meta.url), "utf8").replace(/\r/gu, "");
  assert.ok(source.length > 1000, "dispatch.ts was not read");
  assert.match(source, /^\s*if \(view === 'trunkauth'\) \{$/mu);
  assert.match(source, /^\s*readings\.auths\(target\), readings\.registrations\(target\),$/mu);
  assert.match(source, /^\s*return \{ auths, registrations \};$/mu);
});

test("the renderer will actually ask for the trunkauth view", () => {
  /* `refresh()` only issues a `pbx.read` for a screen `isReadable` accepts, so a view the
   * dispatcher can answer and `READABLE_VIEWS` has never heard of is a reading nothing
   * ever requests. */
  const readings = readFileSync(new URL("../../app/renderer/src/readings.ts", import.meta.url), "utf8").replace(/\r/gu, "");
  const list = /READABLE_VIEWS: PbxReadView\[\] = \[([\s\S]*?)\];/u.exec(readings);
  assert.ok(list, "READABLE_VIEWS must exist in readings.ts");
  const views = [...list[1].matchAll(/'(\w+)'/gu)].map((match) => match[1]);
  assert.ok(views.length > 5, "sanity: READABLE_VIEWS was not parsed");
  assert.ok(views.includes("trunkauth"), "trunkauth is not a readable view, so the renderer never asks for it");
});

test("the fixture's widths are the ones Asterisk's own header computes", () => {
  const header = readFileSync(new URL("../../../include/asterisk/res_pjsip_cli.h", import.meta.url), "utf8");
  const titleName = /#define\s+CLI_MAX_TITLE_NAME\s+(\d+)/u.exec(header);
  const maxWidth = /#define\s+CLI_MAX_WIDTH\s+(\d+)/u.exec(header);
  assert.ok(titleName && maxWidth, "res_pjsip_cli.h must still define both width constants");
  /* CLI_INDENT_TO_SPACES(x) is ((x * 2) + 1 + CLI_MAX_TITLE_NAME); the container walk
   * prints at indent level 0. */
  assert.equal(INDENT, 0 * 2 + 1 + Number.parseInt(titleName[1], 10));
  assert.equal(RULE.length, Number.parseInt(maxWidth[1], 10));
});

test("the body format string this parser is written against is still the one in the sources", () => {
  const source = readFileSync(new URL("../../../res/res_pjsip/config_auth.c", import.meta.url), "utf8");
  assert.ok(
    source.includes('"%*s:  %s/%s\\n"'),
    "config_auth.c no longer prints an auth as `<indent>Title:  <id>/<username>` -- parsePjsipAuths is now parsing a format that does not exist",
  );
  assert.ok(
    source.includes('snprintf(title, sizeof(title), "%sAuth"'),
    "config_auth.c no longer builds the line label as `<direction>Auth` -- the parser's `Auth:` anchor may no longer match",
  );
});
