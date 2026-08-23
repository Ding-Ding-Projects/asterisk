import assert from 'node:assert/strict';
import test from 'node:test';

import { NOT_READ, serverRows, type ServerRow } from '../../app/renderer/src/readings.ts';

const server = (over: Partial<ServerRow> = {}): ServerRow => ({
  name: 'branch-office',
  connectionKind: 'wsl',
  state: 'connected',
  wslDistribution: 'ding-pbx-console',
  ...over,
});

test('a configured server becomes one row in the design table columns', () => {
  const [row] = serverRows([server()]);
  /* Profile, Route, Target, Interface, State — the design's own five columns. */
  assert.equal(row.length, 5);
  assert.equal(row[0], 'branch-office');
  assert.equal(row[1], 'Local WSL');
  assert.equal(row[2], 'ding-pbx-console');
  assert.equal(row[4], 'Connected');
});

test('several servers each get their own row, in order', () => {
  const rows = serverRows([server({ name: 'a' }), server({ name: 'b' }), server({ name: 'c' })]);
  assert.deepEqual(rows.map((row) => row[0]), ['a', 'b', 'c']);
});

test('the reason travels with the state, because the state alone is not actionable', () => {
  const [row] = serverRows([
    server({ state: 'unreachable', reason: 'the distribution did not answer' }),
  ]);
  assert.ok(row[4].includes('Unreachable'));
  assert.ok(row[4].includes('did not answer'), 'the state was shown without the one part anybody can act on');
});

test('a connected server carries no reason, so nothing is appended', () => {
  const [row] = serverRows([server({ state: 'connected' })]);
  assert.equal(row[4], 'Connected');
});

test('an unknown value is never dressed up as a plausible one', () => {
  const [row] = serverRows([
    server({ connectionKind: 'wsl', wslDistribution: undefined, host: undefined, port: undefined }),
  ]);
  assert.equal(row[2], NOT_READ, 'a target the console does not know was invented');
  assert.equal(row[3], NOT_READ, 'an interface the console does not know was invented');
});

test('a remote server is identified by user and host together', () => {
  const [row] = serverRows([
    server({ connectionKind: 'ssh', wslDistribution: undefined, host: 'pbx.example.internal', user: 'operator', port: 22 }),
  ]);
  assert.equal(row[1], 'SSH');
  assert.equal(row[2], 'operator@pbx.example.internal');
  assert.equal(row[3], 'port 22');
});

test('an unrecognised route or state is shown as itself rather than blanked', () => {
  /* Falling back to the raw value keeps a newly added kind visible instead of silently
   * rendering an empty cell that reads as "no route configured". */
  const [row] = serverRows([server({ connectionKind: 'carrier-pigeon', state: 'sulking' })]);
  assert.equal(row[1], 'carrier-pigeon');
  assert.equal(row[4], 'sulking');
});

test('no server configured means no rows, never a sample row', () => {
  assert.deepEqual(serverRows([]), []);
});

test("none of the design reference's invented servers can be produced from real records", () => {
  /* The design ships pbx-hq, pbx-lab and pbx-edge as sample content. They must only ever
   * appear if a person actually created a server by those names. */
  const rows = serverRows([server({ name: 'branch-office' })]);
  const flat = rows.flat().join(' ');
  for (const invented of ['pbx-hq', 'pbx-lab', 'pbx-edge', 'asterisk-ops', '10.20.4.10']) {
    assert.ok(!flat.includes(invented), `the design's sample value ${invented} leaked into a real row`);
  }
});
