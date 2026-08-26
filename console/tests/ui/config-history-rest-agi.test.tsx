/**
 * Guards the three roadmap items this pass closed under "Major gaps -- no destination
 * exists at all":
 *
 *  1. Configuration backup, restore and diff -- `control-plane/config-history.ts` already
 *     had `list`/`restore`/`prune`, and `history.list`/`history.restore` already reached
 *     a real surface through the older fallback admin UI (`PbxAdminApp.tsx`, guarded by
 *     `local-version-history.test.mjs`) -- but never the main M3-compiled console this
 *     project actually ships, and never a diff. This adds `ConfigHistory#diff` (a real
 *     Myers line diff against what is on the target right now, not a second backup
 *     mechanism), wires `history.diff`/`history.prune` through the dispatcher, and gives
 *     the Configuration backups screen its own table, row-pick, restore, diff and prune
 *     on the console every operator actually opens.
 *  2. A live REST resource browser -- channels (already read elsewhere), bridges
 *     (`bridge show all`, newly parsed), registered dialplan applications (`core show
 *     applications`, newly parsed) and what ARI itself reports as its own apps/users
 *     (`ari show apps`/`ari show users`, the second of which was allowlisted and never
 *     read by anything), combined into one live table.
 *  3. Dialplan scripting visibility (AGI) -- every `AGI()`/`EAGI()`/`DeadAGI()` call
 *     `dialplan show` reports, cross-checked against what the target's own AGI
 *     directory (`asterisk.conf`'s `astagidir`) actually holds.
 *
 * Every source-anchored assertion here matches the real call shape a live handler
 * uses, not a bare substring a comment could also satisfy -- the same discipline
 * `voicemail-ami-deepen.test.tsx` already established for this repository's other
 * source-anchored screen guards.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { SCREENS, ORDER } from '../../app/renderer/src/generated/console.tsx';
import { resourceForFile } from '../../app/renderer/src/configuration.ts';
import { READABLE_VIEWS, TABLE_DESTINATION_READERS } from '../../app/renderer/src/readings.ts';
import { historyRows, resolveHistoryRow, formatTakenAt, formatBackupSize } from '../../app/renderer/src/history-backups.ts';
import { restBrowserRows } from '../../app/renderer/src/rest-browser.ts';
import { agiScriptRows } from '../../app/renderer/src/agi-scripting.ts';
import type { HistoryEntry } from '../../control-plane/config-history.ts';

const appUrl = new URL('../../app/renderer/src/App.tsx', import.meta.url);
const designUrl = new URL('../../../design/Asterisk Console M3.dc.html', import.meta.url);

async function source(url: URL): Promise<string> {
  // CRLF-safe: this checkout is CRLF throughout.
  return (await readFile(url, 'utf8')).replace(/\r\n/g, '\n');
}

// ---------------------------------------------------------------- design wiring

test('all three new screens are declared, on the rail their subject matter belongs to', () => {
  const screens = SCREENS as unknown as Record<string, { rail?: string; kind?: string; file?: string; table?: unknown }>;
  assert.equal(screens.confighistory?.rail, 'sys');
  assert.equal(screens.confighistory?.kind, 'table');
  assert.ok(screens.confighistory?.table, 'confighistory must be a real table destination');
  assert.equal(screens.restbrowser?.rail, 'data');
  assert.equal(screens.restbrowser?.kind, 'table');
  assert.ok(screens.restbrowser?.table);
  assert.equal(screens.agiscripts?.rail, 'pbx');
  assert.equal(screens.agiscripts?.kind, 'table');
  assert.ok(screens.agiscripts?.table);
  for (const id of ['confighistory', 'restbrowser', 'agiscripts']) {
    assert.ok((ORDER as unknown as string[]).includes(id), `${id} must be reachable from the nav rail`);
  }
});

test('confighistory and restbrowser declare a label, not a real filename -- neither has one .conf resource behind it', () => {
  const screens = SCREENS as unknown as Record<string, { file?: unknown }>;
  assert.equal(resourceForFile(screens.confighistory?.file), undefined);
  assert.equal(resourceForFile(screens.restbrowser?.file), undefined);
  // agiscripts is the deliberate exception, pinned in resource-for-file.test.tsx: it
  // names two real facts (extensions.conf and astagidir) rather than one file.
  assert.equal(resourceForFile(screens.agiscripts?.file), undefined);
});

test('the "Refresh" button on each new screen reaches a real handler, not the empty generic wizard', async () => {
  const design = await source(designUrl);
  assert.match(design, /: \(s\.screen === 'confighistory' && this\.onRefreshHistoryTable \? this\.onRefreshHistoryTable\(\)/u);
  assert.match(design, /: \(s\.screen === 'restbrowser' && this\.onRefreshRestBrowser \? this\.onRefreshRestBrowser\(\)/u);
  assert.match(design, /: \(s\.screen === 'agiscripts' && this\.onRefreshAgiScripts \? this\.onRefreshAgiScripts\(\)/u);
});

// ---------------------------------------------------------------- App.tsx dispatch wiring

test('history-restore, history-diff and history-prune are each dispatched to a real handler', async () => {
  const app = await source(appUrl);
  assert.match(app, /^\s*if \(action === 'history-restore'\) \{ void this\.onRestoreHistoryEntry\(\); return; \}/mu);
  assert.match(app, /^\s*if \(action === 'history-diff'\) \{ void this\.onDiffHistoryEntry\(\); return; \}/mu);
  assert.match(app, /^\s*if \(action === 'history-prune'\) \{ void this\.onPruneHistoryEntries\(\); return; \}/mu);
});

test('onPickRow routes all three new screens before falling into the pjsip endpoint default', async () => {
  const app = await source(appUrl);
  const body = app.slice(app.indexOf('onPickRow = (name: string)'), app.indexOf('onPickIaxPeerRow(name: string)'));
  assert.match(body, /^\s*if \(\(this\.state as \{ screen: string \}\)\.screen === 'confighistory'\) \{ this\.onPickHistoryRow\(name\); return; \}/mu);
  assert.match(body, /^\s*if \(\(this\.state as \{ screen: string \}\)\.screen === 'restbrowser'\) \{ this\.toast\(/mu);
  assert.match(body, /^\s*if \(\(this\.state as \{ screen: string \}\)\.screen === 'agiscripts'\) \{ this\.toast\(/mu);
});

test('applyRows feeds all three new screens from their own real source, not the generic PbxReadView reader', async () => {
  const app = await source(appUrl);
  const body = app.slice(app.indexOf('private applyRows(screen: string)'), app.indexOf('private aclConfigValue()'));
  assert.match(body, /id === 'confighistory'\s*\n?\s*\?\s*historyRows\(this\.historyBackups\)/u);
  assert.match(body, /id === 'restbrowser'\s*\n?\s*\?\s*restBrowserRows\(this\.readings\.restbrowser\)/u);
  assert.match(body, /id === 'agiscripts'\s*\n?\s*\?\s*agiScriptRows\(this\.readings\.agiscripts\?\.references, this\.readings\.agiscripts\?\.files\)/u);
});

test('the Configuration backups screen reads through history.list, not pbx.read', async () => {
  const app = await source(appUrl);
  const body = app.slice(app.indexOf("if (screen === 'confighistory')"), app.indexOf("/* A configuration screen names the file it edits."));
  assert.match(body, /this\.request\('history\.list', \{ serverId: this\.target\.id \}\)/u);
});

test('restbrowser and agiscripts are real PbxReadView entries, read the generic way every other live table already is', () => {
  assert.ok((READABLE_VIEWS as unknown as string[]).includes('restbrowser'));
  assert.ok((READABLE_VIEWS as unknown as string[]).includes('agiscripts'));
  // Both are marked `false`: their rows come from a custom builder (restBrowserRows /
  // agiScriptRows), not the generic rowsFor -- see the inventory's own comment.
  assert.equal(TABLE_DESTINATION_READERS.restbrowser, false);
  assert.equal(TABLE_DESTINATION_READERS.agiscripts, false);
});

test('onRestoreHistoryEntry refuses without a picked recovery point, rather than restoring nothing silently', async () => {
  const app = await source(appUrl);
  const body = app.slice(app.indexOf('onRestoreHistoryEntry = async'), app.indexOf('onDiffHistoryEntry = async'));
  assert.match(body, /^\s*if \(!handle\) \{ this\.fire\('Not restored', 'Pick a recovery point from the table above first\.'\); return; \}/mu);
  assert.match(body, /this\.request\('history\.restore', \{ serverId: this\.target\.id, payload: \{ handle \} \}\)/u);
});

test('onDiffHistoryEntry refuses without a picked recovery point', async () => {
  const app = await source(appUrl);
  const body = app.slice(app.indexOf('onDiffHistoryEntry = async'), app.indexOf('onPruneHistoryEntries = async'));
  assert.match(body, /^\s*if \(!handle\) \{ this\.fire\('Not compared', 'Pick a recovery point from the table above first\.'\); return; \}/mu);
  assert.match(body, /this\.request\('history\.diff', \{ serverId: this\.target\.id, payload: \{ handle \} \}\)/u);
});

test('onPruneHistoryEntries refuses without a known resource, rather than guessing which file to prune', async () => {
  const app = await source(appUrl);
  const body = app.slice(app.indexOf('onPruneHistoryEntries = async'), app.indexOf('onRefreshRestBrowser = ()'));
  assert.match(body, /^\s*if \(!resource\) \{ this\.fire\('Not pruned', /mu);
  assert.match(body, /this\.request\('history\.prune', \{ serverId: this\.target\.id, payload: \{ resource, keep \} \}\)/u);
});

// ---------------------------------------------------------------- history-backups.ts (renderer row builder)

const entries: HistoryEntry[] = [
  { resource: '/etc/asterisk/pjsip.conf', handle: '/etc/asterisk/pjsip.conf.backup-2026-08-23T01-19-03-627Z', takenAt: '2026-08-23T01:19:03.627Z', bytes: 4096 },
  { resource: '/etc/asterisk/queues.conf', handle: '/etc/asterisk/queues.conf.backup-2026-08-20T09-00-00-000Z-absent', takenAt: '2026-08-20T09:00:00.000Z', bytes: 0 },
];

test('historyRows returns zero rows for undefined, never throws', () => {
  assert.deepEqual(historyRows(undefined), []);
});

test('historyRows produces one row per entry, resource base name and formatted timestamp first', () => {
  const rows = historyRows(entries);
  assert.equal(rows.length, 2);
  assert.match(rows[0][0], /^pjsip\.conf · 2026-08-23 01:19:03 UTC · #/u);
  assert.equal(rows[0][1], '2026-08-23 01:19:03 UTC');
  assert.equal(rows[0][2], formatBackupSize(4096));
  assert.equal(rows[0][3], 'File backup');
  assert.equal(rows[1][2], '—', 'an -absent marker has no real byte size to show');
  assert.equal(rows[1][3], 'Removal recorded');
});

test('resolveHistoryRow round-trips every row historyRows built, and only those', () => {
  const rows = historyRows(entries);
  const resolved = resolveHistoryRow(entries, rows[0][0]);
  assert.equal(resolved, entries[0]);
  const resolvedAbsent = resolveHistoryRow(entries, rows[1][0]);
  assert.equal(resolvedAbsent, entries[1]);
  assert.equal(resolveHistoryRow(entries, 'not a real row key'), undefined);
  assert.equal(resolveHistoryRow(undefined, rows[0][0]), undefined);
});

test('resolveHistoryRow resolves against the list actually supplied, not a stale one', () => {
  const rows = historyRows(entries);
  // A key built from `entries` must not resolve against a DIFFERENT list that no
  // longer contains that exact handle -- the same staleness defence
  // resolveAclRowKey already has for the Security screen.
  assert.equal(resolveHistoryRow([entries[1]], rows[0][0]), undefined);
});

test('formatTakenAt reports an honest unknown time for an unparseable stamp, never a blank cell', () => {
  assert.equal(formatTakenAt(undefined), 'unknown time');
});

// ---------------------------------------------------------------- rest-browser.ts

function available<T>(value: T) {
  return { command: 'test', result: { state: 'available' as const, observedAt: '2026-08-23T00:00:00.000Z', value } };
}

test('restBrowserRows returns zero rows for undefined, never throws', () => {
  assert.deepEqual(restBrowserRows(undefined), []);
});

test('restBrowserRows combines all five readings into one table, kind first', () => {
  const rows = restBrowserRows({
    channels: available([{ name: 'PJSIP/1001-1', context: 'default', extension: '1001', state: 'Up', application: 'Dial', callerNumber: '1001', durationSeconds: 5 }]),
    bridges: available([{ id: 'b1', name: 'into-conf', channels: 2, bridgeType: 'basic', technology: 'simple_bridge', duration: '00:01:00' }]),
    applications: available([{ name: 'Dial', synopsis: 'Attempt a call' }]),
    ariApps: available([{ name: 'my-stasis-app' }]),
    ariUsers: available([{ username: 'dashboard', readOnly: true, hasAcl: false }]),
  });
  assert.deepEqual(rows.map((r) => r[0]), ['Channel', 'Bridge', 'Application', 'ARI app', 'ARI user']);
  assert.equal(rows[0][1], 'PJSIP/1001-1');
  assert.equal(rows[1][1], 'into-conf');
  assert.equal(rows[4][1], 'dashboard');
  assert.equal(rows[4][2], 'Read-only');
});

test('restBrowserRows shows an unavailable reading as no rows for that kind, not a crash', () => {
  const rows = restBrowserRows({
    channels: { command: 'test', result: { state: 'unavailable', observedAt: '2026-08-23T00:00:00.000Z', reason: 'not connected' } },
  });
  assert.deepEqual(rows, []);
});

// ---------------------------------------------------------------- agi-scripting.ts

test('agiScriptRows returns zero rows for two undefined inputs', () => {
  assert.deepEqual(agiScriptRows(undefined, undefined), []);
});

test('agiScriptRows marks a referenced script present when it is on disk', () => {
  const rows = agiScriptRows(
    [{ context: 'from-internal', extension: '2000', priority: 1, app: 'AGI', script: 'lookup.agi', kind: 'local' }],
    [{ name: 'lookup.agi', bytes: 512, executable: true }],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0][0], 'lookup.agi');
  assert.equal(rows[0][1], 'from-internal/2000:1 (AGI)');
  assert.equal(rows[0][3], 'Local script');
  assert.doesNotMatch(rows[0][2], /Missing/u);
});

test('agiScriptRows reports a referenced local script missing from the AGI directory', () => {
  const rows = agiScriptRows(
    [{ context: 'from-internal', extension: '2000', priority: 1, app: 'AGI', script: 'gone.agi', kind: 'local' }],
    [],
  );
  assert.equal(rows[0][2], 'Missing from the AGI directory');
});

test('agiScriptRows lists an unreferenced file, distinctly from a missing one', () => {
  const rows = agiScriptRows([], [{ name: 'orphan.agi', bytes: 10, executable: true }]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0][0], 'orphan.agi');
  assert.equal(rows[0][1], 'not called from the dialplan');
  assert.equal(rows[0][3], 'Unreferenced file');
});

test('agiScriptRows never treats a FastAGI URL or Async AGI as a filesystem fact', () => {
  const rows = agiScriptRows(
    [
      { context: 'c', extension: '1', priority: 1, app: 'AGI', script: 'agi://127.0.0.1/x', kind: 'network' },
      { context: 'c', extension: '2', priority: 1, app: 'AGI', script: 'agi:async', kind: 'async' },
    ],
    [],
  );
  assert.equal(rows[0][3], 'FastAGI URL');
  assert.doesNotMatch(rows[0][2], /Missing/u);
  assert.equal(rows[1][3], 'Async AGI');
  assert.doesNotMatch(rows[1][2], /Missing/u);
});

test('agiScriptRows does not double-count a referenced local script as also unreferenced', () => {
  const rows = agiScriptRows(
    [{ context: 'c', extension: '1', priority: 1, app: 'AGI', script: 'lookup.agi', kind: 'local' }],
    [{ name: 'lookup.agi', bytes: 1, executable: true }],
  );
  assert.equal(rows.length, 1, 'a referenced file must not also appear in the unreferenced pass');
});
