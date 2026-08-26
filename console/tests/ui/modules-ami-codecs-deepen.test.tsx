/**
 * Guards the three destinations this pass deepened:
 *
 *  1. Modules -- row-level Load/Unload/Reload against the running target
 *     (`module load|unload|reload <name>`, `write-commands.ts`), plus "Show declared
 *     policy for …", the closest honest substitute for a dependency view Asterisk's
 *     own CLI does not expose (see `moduleDeclaredPolicyLine`'s own comment).
 *  2. AMI & REST -- a real live "Connected sessions" readout off `manager show
 *     connected` and a real "Kick session" action (`manager kick session <fd>`).
 *  3. Codecs -- an on-demand "pjsip show endpoint <id>" per-endpoint lookup, which
 *     also required widening `dispatch.ts`'s `pbx.command` handler to accept the
 *     read-only *object* commands `isAllowedCommandLine` already covers (it never had
 *     before) and the two non-read-only shapes `isAllowlistedWriteCommand` covers.
 *
 * Every source-anchored assertion here matches the real call shape App.tsx uses, not a
 * bare substring a comment could also satisfy. Each one was broken on purpose, watched
 * red, and restored -- see the task's own report for the individual break/restore
 * pairs and `tests/control-plane/write-commands.test.ts` for the validator's own
 * negative cases (command injection, out-of-range file descriptors, and so on).
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { managerConnectionsStatus } from '../../app/renderer/src/readings.ts';
import type { ManagerConnection } from '../../app/renderer/src/readings.ts';

const appUrl = new URL('../../app/renderer/src/App.tsx', import.meta.url);
const designUrl = new URL('../../../design/Asterisk Console M3.dc.html', import.meta.url);
const dispatchUrl = new URL('../../control-plane/dispatch.ts', import.meta.url);
const controlKeysUrl = new URL('../../app/renderer/src/control-keys.ts', import.meta.url);

async function source(url: URL): Promise<string> {
  // CRLF-safe: this checkout is CRLF throughout.
  return (await readFile(url, 'utf8')).replace(/\r\n/g, '\n');
}

// ---------------------------------------------------------------- Modules: real row actions

test('the modules row menu offers real Load/Unload/Reload, gated on the row’s own live State cell', async () => {
  const design = await source(designUrl);
  assert.match(design, /const isModuleRow = s\.screen === 'modules';/u);
  assert.match(design, /const moduleLoaded = !!moduleRowData && moduleRowData\[3\] !== 'Not loaded';/u,
    'moduleLoaded must read the table’s own State column, not be hard-coded true/false');
  assert.match(design, /run:\(\) => \{ close\(\); this\.onModuleAction\('reload', name\); \} \}/u);
  assert.match(design, /run:\(\) => \{ close\(\); this\.onModuleAction\('unload', name\); \} \}/u);
  assert.match(design, /run:\(\) => \{ close\(\); this\.onModuleAction\('load', name\); \} \}/u);
});

test('a module row never falls back to the generic fictional "reload <name>"/"delete <name>" ceremony', async () => {
  const design = await source(designUrl);
  const menuStart = design.indexOf("if (s.ctxKind === 'row')");
  const menuEnd = design.indexOf("if (s.ctxKind === 'search')");
  const menu = design.slice(menuStart, menuEnd);
  assert.match(menu, /isModuleRow \? \[\] : \[/u,
    'module rows must skip the generic "Delete <name>" item entirely -- deleting a compiled .so file is not an operation this console performs anywhere else');
});

test('onModuleAction builds the exact CLI line through write-commands.ts and refuses a name it did not read', async () => {
  const app = await source(appUrl);
  const body = app.slice(app.indexOf('onModuleAction = (kind'), app.indexOf('moduleDeclaredPolicyLine ='));
  assert.match(body, /const command = buildModuleActionCommand\(kind, moduleName\);/u);
  assert.match(body, /if \(!command\) \{ this\.fire\('Not run',/u, 'a module name buildModuleActionCommand refused must be a refusal, not a silent no-op');
  assert.match(body, /this\.ceremony\(`\$\{verb\} \$\{moduleName\}`, command\);/u,
    'the real command must reach the same confirmation ceremony every other real action on this console uses');
});

test('a successful module-action ceremony drops the cached modules reading so the next refresh re-reads the target', async () => {
  const app = await source(appUrl);
  assert.match(app, /if \(\/\^module \(load\|unload\|reload\) \/u\.test\(command\)\) delete this\.readings\.modules;/u);
});

test('"Show declared policy for" reads the same mo_preload/mo_noload/mo_require/mo_load bound values the Load-policy group already writes', async () => {
  const app = await source(appUrl);
  const body = app.slice(app.indexOf('moduleDeclaredPolicyLine = (moduleName'), app.indexOf('// ---------------------------------------------------------------- Codecs & RTP screen'));
  for (const id of ['mo_preload', 'mo_noload', 'mo_require', 'mo_load']) {
    assert.match(body, new RegExp(`listed\\('${id}'\\)`, 'u'), `${id} is not read by moduleDeclaredPolicyLine`);
  }
  // Honest about the real gap: Asterisk's own CLI has no dependency/dependents listing.
  assert.match(body, /has no command listing a module's runtime dependents or dependencies/u);
});

// ---------------------------------------------------------------- AMI & REST: connected sessions + kick

test('the AMI & REST screen reads real live sessions off `manager show connected`, not the static manager.conf/ari.conf table', async () => {
  const design = await source(designUrl);
  assert.match(design, /ctl\('a_connected','Connected right now','text','Read manager\.conf to check\.',\{ action:'ami-connected-status'/u);
  assert.match(design, /ctl\('a_kickfd','File descriptor to kick','text','',\{ placeholder:'12'/u);
  assert.match(design, /ctl\('a_kick','Kick session','segmented','Kick',\{ options:\['Kick'\], action:'ami-kick-session'/u);
  // main/manager.c handle_kickmanconn takes a file descriptor, never a username -- the
  // one detail that makes this control usable rather than a field nobody knows how to
  // fill in correctly.
  assert.match(design, /manager kick session <file descriptor>/u);
});

test('ami-kick-session and ami-connected-status are both dispatched to real handlers', async () => {
  const app = await source(appUrl);
  assert.match(app, /^\s*if \(action === 'ami-kick-session'\) \{ this\.onKickManagerSession\(\); return; \}/mu);
  assert.match(app, /^\s*if \(action === 'ami-connected-status'\) return managerConnectionsStatus\(this\.readings\.ami\?\.managerConnections\);/mu);
});

test('onKickManagerSession validates the file descriptor through write-commands.ts before ever opening the ceremony', async () => {
  const app = await source(appUrl);
  const body = app.slice(app.indexOf('onKickManagerSession = (): void'), app.indexOf('private note(screen: string)'));
  assert.match(body, /const command = buildManagerKickSessionCommand\(fd\);/u);
  assert.match(body, /if \(!command\) \{ this\.fire\('Not run',/u);
  assert.match(body, /this\.ceremony\(`Kick manager session \$\{fd\}`, command\);/u);
});

test('a successful kick-session ceremony drops the cached AMI reading too', async () => {
  const app = await source(appUrl);
  assert.match(app, /if \(\/\^manager kick session \/u\.test\(command\)\) delete this\.readings\.ami;/u);
});

test('managerConnectionsStatus reports an honest empty state, a real live session, and an unavailable reading -- never invented data', () => {
  assert.equal(managerConnectionsStatus(undefined), 'Read manager.conf to check.');
  assert.equal(
    managerConnectionsStatus({ command: 'manager show connected', result: { state: 'unavailable', observedAt: 'now', reason: 'refused' } }),
    'Connected sessions could not be read: refused',
  );
  assert.equal(
    managerConnectionsStatus({ command: 'manager show connected', result: { state: 'available', observedAt: 'now', value: { connections: [], total: 0 } } }),
    'No AMI or HTTP sessions are connected to this target right now.',
  );
  const one: ManagerConnection = {
    username: 'monitor', ipAddress: '10.20.4.9', startEpochSeconds: 1, elapsedSeconds: 42,
    fileDescriptor: 12, httpCount: 0, readPerms: 65535, writePerms: 65535,
  };
  assert.equal(
    managerConnectionsStatus({ command: 'manager show connected', result: { state: 'available', observedAt: 'now', value: { connections: [one], total: 1 } } }),
    'monitor @ 10.20.4.9 — fd 12, connected 42s',
  );
});

// ---------------------------------------------------------------- Codecs: per-endpoint lookup

test('the Codecs screen has a real, read-only, on-demand per-endpoint lookup', async () => {
  const design = await source(designUrl);
  assert.match(design, /ctl\('k_endpoint','Endpoint','text','',\{ placeholder:'phone-201'/u);
  assert.match(design, /ctl\('k_endpointlookup','Look up','segmented','Look up',\{ options:\['Look up'\], action:'codecs-endpoint-lookup'/u);
  assert.match(design, /ctl\('k_endpointresult','Configured codecs','text',/u);
});

test('codecs-endpoint-lookup and codecs-endpoint-status are both dispatched to real handlers', async () => {
  const app = await source(appUrl);
  assert.match(app, /^\s*if \(action === 'codecs-endpoint-lookup'\) \{ void this\.onLookupEndpointCodecs\(\); return; \}/mu);
  assert.match(app, /^\s*if \(action === 'codecs-endpoint-status'\) return this\.endpointCodecLine;/mu);
});

test('onLookupEndpointCodecs validates the id and runs a real, allowlisted read-only pbx.command -- never behind the write-action ceremony', async () => {
  const app = await source(appUrl);
  const body = app.slice(app.indexOf('onLookupEndpointCodecs = async'), app.length);
  assert.match(body, /if \(!App\.CODECS_ENDPOINT_ID\.test\(id\)\)/u);
  assert.match(body, /payload: \{ command: `pjsip show endpoint \$\{id\}` \} \}\);/u);
});

test('dispatch.ts’s pbx.command now accepts the read-only object commands isAllowedCommandLine already covers, not only the bare READ_ONLY_COMMANDS list', async () => {
  const dispatch = await source(dispatchUrl);
  const body = dispatch.slice(dispatch.indexOf("if (request.action === 'pbx.command')"), dispatch.indexOf("if (request.action === 'pbx.config')"));
  assert.match(body, /const readOnly = isAllowedCommandLine\(command\);/u);
  assert.match(body, /const write = !readOnly && isAllowlistedWriteCommand\(command\);/u);
  assert.match(body, /\? await cliGateway\.run\(target, command as ReadOnlyCommandLine\)/u);
  assert.match(body, /: await cliGateway\.runUnchecked\(target, command\);/u);
});

// ---------------------------------------------------------------- coverage inventory

test('every new control on the ami and codecs screens is named in SCREEN_CONTROL_IDS, so unmappedControls actually sees it', async () => {
  const controlKeys = await source(controlKeysUrl);
  const amiBlock = controlKeys.slice(controlKeys.indexOf('ami: [', controlKeys.indexOf('SCREEN_CONTROL_IDS')), controlKeys.indexOf('],', controlKeys.indexOf('ami: [', controlKeys.indexOf('SCREEN_CONTROL_IDS'))));
  for (const id of ['a_connected', 'a_kickfd', 'a_kick']) {
    assert.ok(amiBlock.includes(`'${id}'`), `${id} is missing from SCREEN_CONTROL_IDS.ami`);
  }
  const codecsBlock = controlKeys.slice(controlKeys.indexOf('codecs: [', controlKeys.indexOf('SCREEN_CONTROL_IDS')), controlKeys.indexOf('],', controlKeys.indexOf('codecs: [', controlKeys.indexOf('SCREEN_CONTROL_IDS'))));
  for (const id of ['k_endpoint', 'k_endpointlookup', 'k_endpointresult']) {
    assert.ok(codecsBlock.includes(`'${id}'`), `${id} is missing from SCREEN_CONTROL_IDS.codecs`);
  }
});
