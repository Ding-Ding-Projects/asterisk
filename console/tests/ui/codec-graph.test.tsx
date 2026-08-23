import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCodecGraph,
  cheapestPath,
  layoutCodecs,
  transcodingCost,
  unreachable,
} from '../../app/renderer/src/codec-graph.ts';
import type { CodecGraph } from '../../app/renderer/src/codec-graph.ts';
import type { Codec, TranslationRow } from '../../control-plane/asterisk-parsers.ts';

// ---------------------------------------------------------------- fixtures

function matrix(rows: Array<[string, Record<string, number | undefined>]>): TranslationRow[] {
  return rows.map(([sourceFormat, costs]) => ({ sourceFormat, costs }));
}

const SMALL_MATRIX = matrix([
  ['ulaw', { ulaw: undefined, alaw: 1, g729: 4 }],
  ['alaw', { ulaw: 1, alaw: undefined, g729: 4 }],
  ['g729', { ulaw: 4, alaw: 4, g729: undefined }],
]);

const CODECS: Codec[] = [
  { type: 'audio', name: 'ulaw', format: 'ulaw', description: 'G.711 u-law' },
  { type: 'audio', name: 'alaw', format: 'alaw', description: 'G.711 a-law' },
  { type: 'audio', name: 'g729', format: 'g729', description: 'ITU G.729' },
];

// ---------------------------------------------------------------- buildCodecGraph

test('builds nodes and edges from a realistic small matrix', () => {
  const graph = buildCodecGraph(SMALL_MATRIX, CODECS);
  assert.deepEqual(
    graph.nodes.map((n) => n.id),
    ['ulaw', 'alaw', 'g729'],
  );
  assert.equal(graph.edges.length, 6);
  assert.ok(graph.edges.some((e) => e.from === 'ulaw' && e.to === 'alaw' && e.cost === 1));
  assert.ok(graph.edges.some((e) => e.from === 'g729' && e.to === 'alaw' && e.cost === 4));
});

test('an asymmetric matrix produces directed edges correctly', () => {
  const asym = matrix([
    ['a', { b: 2 }],
    ['b', {}],
  ]);
  const graph = buildCodecGraph(asym);
  assert.equal(graph.edges.length, 1);
  assert.equal(graph.edges[0].from, 'a');
  assert.equal(graph.edges[0].to, 'b');
  assert.equal(cheapestPath(graph, 'b', 'a'), undefined);
});

test('a missing cost stays undefined and never becomes a zero-cost edge', () => {
  const m = matrix([
    ['a', { b: undefined, c: 3 }],
    ['b', { a: 5 }],
    ['c', {}],
  ]);
  const graph = buildCodecGraph(m);
  assert.ok(!graph.edges.some((e) => e.from === 'a' && e.to === 'b'));
  assert.ok(graph.edges.some((e) => e.from === 'a' && e.to === 'c' && e.cost === 3));
});

test('a codec never appearing as a row or column is not added as a node', () => {
  const codecsWithExtra: Codec[] = [
    ...CODECS,
    { type: 'audio', name: 'opus', format: 'opus', description: 'Opus' },
  ];
  const graph = buildCodecGraph(SMALL_MATRIX, codecsWithExtra);
  assert.ok(!graph.nodes.some((n) => n.id === 'opus'));
});

test('nodes carry type metadata from parseCodecs output when available', () => {
  const graph = buildCodecGraph(SMALL_MATRIX, CODECS);
  const ulaw = graph.nodes.find((n) => n.id === 'ulaw');
  assert.equal(ulaw?.type, 'audio');
});

test('builds a usable graph with no codecs metadata supplied', () => {
  const graph = buildCodecGraph(SMALL_MATRIX);
  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.nodes[0].type, undefined);
});

// ---------------------------------------------------------------- layoutCodecs

test('layout is deterministic: same input twice produces identical positions', () => {
  const graph = buildCodecGraph(SMALL_MATRIX, CODECS);
  const first = layoutCodecs(graph.nodes);
  const second = layoutCodecs(graph.nodes);
  assert.deepEqual(first, second);
});

test('no two nodes share a position', () => {
  const manyCodecs: Codec[] = Array.from({ length: 8 }, (_, i) => ({
    type: 'audio',
    name: `codec${i}`,
    format: `codec${i}`,
    description: `Codec ${i}`,
  }));
  const rows = matrix(manyCodecs.map((c) => [c.name, {}] as [string, Record<string, number | undefined>]));
  const graph = buildCodecGraph(rows, manyCodecs);
  const positioned = layoutCodecs(graph.nodes);
  const seen = new Set<string>();
  for (const node of positioned) {
    const key = `${node.x.toFixed(6)},${node.y.toFixed(6)}`;
    assert.ok(!seen.has(key), `duplicate position for ${node.id}`);
    seen.add(key);
  }
});

test('layout never uses randomness or the clock (repeated calls agree bit-for-bit)', () => {
  const graph = buildCodecGraph(SMALL_MATRIX, CODECS);
  const runs = Array.from({ length: 5 }, () => JSON.stringify(layoutCodecs(graph.nodes)));
  assert.ok(runs.every((r) => r === runs[0]));
});

test('single-node layout places the node at the given center', () => {
  const positioned = layoutCodecs([{ id: 'solo', name: 'solo' }], { centerX: 100, centerY: 50 });
  assert.deepEqual(positioned, [{ id: 'solo', name: 'solo', x: 100, y: 50 }]);
});

test('empty layout returns an empty array without throwing', () => {
  assert.deepEqual(layoutCodecs([]), []);
});

// ---------------------------------------------------------------- cheapestPath

test('cheapestPath finds a direct edge', () => {
  const graph = buildCodecGraph(SMALL_MATRIX, CODECS);
  const result = cheapestPath(graph, 'ulaw', 'alaw');
  assert.deepEqual(result, { path: ['ulaw', 'alaw'], totalCost: 1 });
});

test('cheapestPath finds a genuinely cheaper two-hop route over a pricier direct edge', () => {
  const m = matrix([
    ['a', { b: 1, c: 100 }],
    ['b', { c: 1 }],
    ['c', {}],
  ]);
  const graph = buildCodecGraph(m);
  const result = cheapestPath(graph, 'a', 'c');
  assert.deepEqual(result, { path: ['a', 'b', 'c'], totalCost: 2 });
});

test('cheapestPath does not choose a pricier path when the direct edge is cheaper', () => {
  const m = matrix([
    ['a', { b: 1, c: 2 }],
    ['b', { c: 50 }],
    ['c', {}],
  ]);
  const graph = buildCodecGraph(m);
  const result = cheapestPath(graph, 'a', 'c');
  assert.deepEqual(result, { path: ['a', 'c'], totalCost: 2 });
});

test('cheapestPath returns undefined when unreachable', () => {
  const m = matrix([
    ['a', { b: 1 }],
    ['b', {}],
    ['c', {}],
  ]);
  const graph = buildCodecGraph(m);
  assert.equal(cheapestPath(graph, 'a', 'c'), undefined);
  assert.equal(cheapestPath(graph, 'c', 'a'), undefined);
});

test('cheapestPath from a codec to itself is zero-cost and trivially reachable', () => {
  const graph = buildCodecGraph(SMALL_MATRIX, CODECS);
  assert.deepEqual(cheapestPath(graph, 'ulaw', 'ulaw'), { path: ['ulaw'], totalCost: 0 });
});

test('cheapestPath returns undefined for a codec absent from the graph entirely', () => {
  const graph = buildCodecGraph(SMALL_MATRIX, CODECS);
  assert.equal(cheapestPath(graph, 'ulaw', 'opus'), undefined);
  assert.equal(cheapestPath(graph, 'opus', 'opus'), undefined);
});

// ---------------------------------------------------------------- transcodingCost

test('transcodingCost reports a direct single-hop transcode', () => {
  const graph = buildCodecGraph(SMALL_MATRIX, CODECS);
  const summary = transcodingCost(graph, 'ulaw', 'alaw');
  assert.equal(summary.reachable, true);
  assert.equal(summary.direct, true);
  assert.equal(summary.hops, 1);
  assert.equal(summary.totalCost, 1);
});

test('transcodingCost reports hop count for a multi-hop route', () => {
  const m = matrix([
    ['a', { b: 1 }],
    ['b', { c: 1 }],
    ['c', {}],
  ]);
  const graph = buildCodecGraph(m);
  const summary = transcodingCost(graph, 'a', 'c');
  assert.equal(summary.direct, false);
  assert.equal(summary.hops, 2);
  assert.equal(summary.totalCost, 2);
});

test('transcodingCost flags a route through a well-known narrowband codec as lossy', () => {
  const graph = buildCodecGraph(SMALL_MATRIX, CODECS);
  const summary = transcodingCost(graph, 'ulaw', 'g729');
  assert.equal(summary.lossy, true);
});

test('transcodingCost does not flag a wideband-only route as lossy', () => {
  const graph = buildCodecGraph(SMALL_MATRIX, CODECS);
  const summary = transcodingCost(graph, 'ulaw', 'alaw');
  assert.equal(summary.lossy, false);
});

test('transcodingCost reports unreachable pairs honestly', () => {
  const m = matrix([
    ['a', {}],
    ['b', {}],
  ]);
  const graph = buildCodecGraph(m);
  const summary = transcodingCost(graph, 'a', 'b');
  assert.deepEqual(summary, { reachable: false, direct: false, hops: 0, totalCost: 0, lossy: false });
});

// ---------------------------------------------------------------- unreachable

test('unreachable finds an isolated codec with no incoming or outgoing edges', () => {
  const m = matrix([
    ['a', { b: 1 }],
    ['b', { a: 1 }],
    ['isolated', {}],
  ]);
  const graph = buildCodecGraph(m, [
    { type: 'audio', name: 'a', format: 'a', description: 'A' },
    { type: 'audio', name: 'b', format: 'b', description: 'B' },
    { type: 'audio', name: 'isolated', format: 'isolated', description: 'Isolated' },
  ]);
  const isolated = unreachable(graph);
  assert.deepEqual(
    isolated.map((n) => n.id),
    ['isolated'],
  );
});

test('unreachable flags a codec that has outgoing edges but no incoming ones', () => {
  const m = matrix([
    ['sourceOnly', { a: 1 }],
    ['a', {}],
  ]);
  const graph = buildCodecGraph(m);
  const flagged = unreachable(graph).map((n) => n.id);
  // sourceOnly has an outgoing edge but nothing points back to it, so it is flagged too:
  // "unreachable" means nobody can reach it OR it can reach nobody, not both at once.
  assert.ok(flagged.includes('sourceOnly'));
  assert.ok(flagged.includes('a'));
});

test('unreachable returns nothing when every codec has both directions', () => {
  const graph = buildCodecGraph(SMALL_MATRIX, CODECS);
  assert.deepEqual(unreachable(graph), []);
});

// ---------------------------------------------------------------- degenerate inputs

test('empty matrix produces an empty graph without throwing', () => {
  const graph = buildCodecGraph([]);
  assert.deepEqual(graph, { nodes: [], edges: [] });
  assert.deepEqual(unreachable(graph), []);
  assert.deepEqual(layoutCodecs(graph.nodes), []);
});

test('single-codec matrix (no translation targets) handled without throwing', () => {
  const m = matrix([['ulaw', {}]]);
  const graph = buildCodecGraph(m);
  assert.equal(graph.nodes.length, 1);
  assert.equal(graph.edges.length, 0);
  assert.equal(unreachable(graph).length, 1);
  assert.equal(cheapestPath(graph, 'ulaw', 'ulaw')?.totalCost, 0);
});

test('a fully disconnected set of codecs is handled without throwing', () => {
  const m = matrix([
    ['a', {}],
    ['b', {}],
    ['c', {}],
  ]);
  const graph: CodecGraph = buildCodecGraph(m);
  assert.equal(graph.edges.length, 0);
  assert.equal(unreachable(graph).length, 3);
  assert.equal(cheapestPath(graph, 'a', 'b'), undefined);
  const summary = transcodingCost(graph, 'a', 'c');
  assert.equal(summary.reachable, false);
});

test('node order from the parser is preserved for callers that care about it', () => {
  const m = matrix([
    ['zulu', { alpha: 1 }],
    ['alpha', {}],
  ]);
  const graph = buildCodecGraph(m);
  assert.deepEqual(
    graph.nodes.map((n) => n.id),
    ['zulu', 'alpha'],
  );
});
