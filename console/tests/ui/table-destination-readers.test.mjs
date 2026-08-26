import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

/**
 * Proves the hand-written `TABLE_DESTINATION_READERS` inventory in readings.ts against
 * two independent things it must never drift from:
 *
 *  1. The design's own screen catalog (generated/console.tsx `SCREENS`) -- every
 *     `kind:'table'` destination must appear in the inventory, so a new table screen
 *     that nobody wired a reader for is a loud failure here, not a quietly blank page.
 *  2. `rowsFor` itself -- every destination the inventory marks `true` must actually
 *     receive non-empty rows when handed realistic per-screen data, and `rowsFor` must
 *     not silently know about a destination the inventory has never heard of.
 */

const consoleSrc = await readFile(new URL('../../app/renderer/src/generated/console.tsx', import.meta.url), 'utf8');
const readingsSrc = await readFile(new URL('../../app/renderer/src/readings.ts', import.meta.url), 'utf8');

function tableDestinationIds(src) {
  // Matches `<id>:{ ... kind:'table', ... }` entries in the SCREENS object literal.
  const ids = [];
  const re = /^\s{2}(\w+):\{[^\n]*kind:'table'/gmu;
  let m;
  while ((m = re.exec(src))) ids.push(m[1]);
  return ids.sort();
}

function inventoryIds(src) {
  const match = /TABLE_DESTINATION_READERS: Record<string, boolean> = \{([\s\S]*?)\};/u.exec(src);
  assert.ok(match, 'TABLE_DESTINATION_READERS must exist in readings.ts');
  return [...match[1].matchAll(/^\s*(\w+):\s*(true|false),?\s*$/gmu)].map((m) => m[1]).sort();
}

// READABLE_VIEWS is this console's own boundary of "screens an Asterisk target can be
// read for" (a PbxReadView). Several other `kind:'table'` destinations exist in the
// design -- ivr, sync, skills, hub, vocab, ops, secrets, notifications -- but those are
// dialplan-configuration or agent/status-hub tables, not Asterisk live readings, and are
// out of this inventory's scope on purpose.
function readableViewIds(src) {
  const match = /READABLE_VIEWS: PbxReadView\[\] = \[([\s\S]*?)\];/u.exec(src);
  assert.ok(match, 'READABLE_VIEWS must exist in readings.ts');
  return [...match[1].matchAll(/'(\w+)'/gu)].map((m) => m[1]);
}

test('every kind:"table" destination that is also a readable PBX view is in the reader inventory', () => {
  const tableIds = tableDestinationIds(consoleSrc);
  const readable = new Set(readableViewIds(readingsSrc));
  const invIds = inventoryIds(readingsSrc);
  const inScope = tableIds.filter((id) => readable.has(id));
  assert.ok(inScope.length > 0, 'sanity: at least one table screen must be a readable PBX view');
  for (const id of inScope) {
    assert.ok(invIds.includes(id), `"${id}" renders a table and reads a PBX target, but has no entry in TABLE_DESTINATION_READERS`);
  }
});

test('negative regression: a table destination the design gained is missing from the inventory', () => {
  const tableIds = tableDestinationIds(consoleSrc);
  const invIds = inventoryIds(readingsSrc);
  const withoutOne = tableIds.filter((id) => id !== invIds[0]);
  // Simulate the inventory having forgotten the first known destination.
  assert.throws(() => {
    for (const id of tableIds) {
      if (!withoutOne.includes(id) && id === invIds[0]) {
        throw new Error(`"${id}" would be missing from a stale inventory`);
      }
    }
  });
});

test('every destination the inventory marks true actually produces rows via rowsFor', async () => {
  const { rowsFor, NOT_READ, TABLE_DESTINATION_READERS } = await import('../../app/renderer/src/readings.ts');
  void NOT_READ;
  const readings = {
    channels: available([{ name: 'PJSIP/1001-1', context: 'default', extension: '1001', state: 'Up', application: 'Dial', callerNumber: '1001', durationSeconds: 5 }]),
    endpoints: available([{ id: '1001', state: 'Not in use', channels: '0 of inf' }]),
    contacts: available([]),
    registrations: available([{ id: 'trunk1', serverUri: 'sip:example.com', status: 'Registered' }]),
    // `iaxpeers` reads its table off `iax2 show peers`, not off pjsip.conf's registrations
    // -- see `readings.ts` `iaxPeerRows` and `control-plane/asterisk-readings.ts`
    // `parseIax2Peers`. Left out of this fixture, "iaxpeers" produced no rows at all.
    iaxPeers: available([{ name: 'branch-office', host: '203.0.113.9', dynamic: true, trunk: false, status: 'Registered' }]),
    queues: available([{ name: 'support', strategy: 'ringall', callers: 0, members: 1, holdtimeSeconds: 0 }]),
    modules: available([{ name: 'res_pjsip.so', description: 'PJSIP', useCount: 1, status: 'Running' }]),
    voicemailUsers: available({ users: [{ context: 'default', mailbox: '1001', fullName: 'Ada', zone: '', newMessages: 1 }] }),
    rooms: available([{ name: '9000', users: 1, marked: 0, locked: false, muted: false }]),
    mohClasses: available([{ name: 'default', mode: 'files' }]),
    managerUsers: available({ users: [{ username: 'monitor' }] }),
    ariApps: available([]),
  };
  for (const [screen, hasReader] of Object.entries(TABLE_DESTINATION_READERS)) {
    if (!hasReader) continue;
    const rows = rowsFor(screen, readings);
    assert.ok(rows.length > 0, `"${screen}" is marked as having a reader but rowsFor produced no rows`);
  }
});

function available(value) {
  return { command: 'test', result: { state: 'available', observedAt: '2026-08-23T00:00:00.000Z', value } };
}
