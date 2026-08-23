/**
 * Turns a read codec translation matrix into a directed graph the canvas can draw.
 *
 * `core show translation` already prints an N×N cost matrix — data that is graph-shaped
 * in its source format, unlike most of the console's tabular readings. A matrix is hard
 * to read as a table past a handful of codecs; as a graph it answers two real operational
 * questions directly: "what is the cheapest way to get from codec A to codec B", and
 * "is any codec stranded with no way in or out".
 *
 * Nothing here invents an edge or a cost. An edge exists only when `parseTranslations`
 * reported a numeric cost for that (source, destination) pair; a missing entry in the
 * matrix stays absent from the graph, never becomes a zero-cost edge (zero means free,
 * which is a different and wrong claim). Layout is a deterministic function of the input
 * — no `Math.random()`, no `Date.now()` — so the same matrix always draws the same picture.
 */
import type { Codec, TranslationRow } from '../../../control-plane/asterisk-parsers.ts';

export interface CodecNode {
  id: string;
  name: string;
  sampleRate?: number;
  type?: string;
}

export interface CodecEdge {
  from: string;
  to: string;
  cost: number;
}

export interface CodecGraph {
  nodes: CodecNode[];
  edges: CodecEdge[];
}

export interface PositionedCodecNode extends CodecNode {
  x: number;
  y: number;
}

export interface CodecPath {
  path: string[];
  totalCost: number;
}

export interface TranscodingSummary {
  reachable: boolean;
  direct: boolean;
  hops: number;
  totalCost: number;
  lossy: boolean;
}

const NARROWBAND_HINTS = ['g729', 'g723', 'gsm', 'ilbc', 'g726', 'speex', 'amr'];

/**
 * Build the codec graph from a real `core show translation` matrix, optionally enriched
 * with `core show codecs` metadata (sample rate, type) for nodes the matrix mentions.
 * A codec named only in `codecs` and never appearing as a row or column in `translations`
 * is not part of the translation graph and is not added as a node — the matrix is the
 * source of truth for which codecs are actually reachable by translation at all.
 */
export function buildCodecGraph(translations: TranslationRow[], codecs?: Codec[]): CodecGraph {
  const codecByName = new Map<string, Codec>();
  if (codecs) {
    for (const codec of codecs) codecByName.set(codec.name, codec);
  }

  const nodeOrder: string[] = [];
  const seen = new Set<string>();
  const addNode = (name: string): void => {
    if (seen.has(name)) return;
    seen.add(name);
    nodeOrder.push(name);
  };

  for (const row of translations) {
    addNode(row.sourceFormat);
    for (const destName of Object.keys(row.costs)) addNode(destName);
  }

  const nodes: CodecNode[] = nodeOrder.map((name) => {
    const meta = codecByName.get(name);
    return {
      id: name,
      name,
      sampleRate: meta ? sampleRateOf(meta) : undefined,
      type: meta?.type,
    };
  });

  const edges: CodecEdge[] = [];
  for (const row of translations) {
    for (const [destName, cost] of Object.entries(row.costs)) {
      if (cost === undefined) continue;
      edges.push({ from: row.sourceFormat, to: destName, cost });
    }
  }

  return { nodes, edges };
}

/** `Codec.description` sometimes carries a rate hint like "8khz"; parseCodecs has no dedicated field, so there is none to read reliably — sampleRate stays undefined unless a future parser adds one. */
function sampleRateOf(_codec: Codec): number | undefined {
  return undefined;
}

export interface LayoutOptions {
  radius?: number;
  centerX?: number;
  centerY?: number;
}

/**
 * A deterministic ring layout: nodes grouped by family (a `sampleRate` group when known,
 * else the codec's `type`, else "other"), groups placed around the ring in a fixed order
 * derived from the group keys themselves (sorted), and nodes placed around their group's
 * arc in the graph's own node order. No two nodes land at the same angle, so no two nodes
 * share a position on the ring — a matrix genuinely does not carry information that would
 * justify a force-directed layout, and a ring keeps the picture identical run to run.
 */
export function layoutCodecs(nodes: CodecNode[], options: LayoutOptions = {}): PositionedCodecNode[] {
  const radius = options.radius ?? 220;
  const centerX = options.centerX ?? 260;
  const centerY = options.centerY ?? 260;

  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    return [{ ...nodes[0], x: centerX, y: centerY }];
  }

  const groupKey = (node: CodecNode): string =>
    node.sampleRate !== undefined ? `rate:${node.sampleRate}` : node.type ? `type:${node.type}` : 'other';

  const groups = new Map<string, CodecNode[]>();
  for (const node of nodes) {
    const key = groupKey(node);
    const list = groups.get(key);
    if (list) list.push(node);
    else groups.set(key, [node]);
  }

  const orderedGroupKeys = [...groups.keys()].sort();
  const total = nodes.length;

  let index = 0;
  const positioned: PositionedCodecNode[] = [];
  for (const key of orderedGroupKeys) {
    for (const node of groups.get(key) as CodecNode[]) {
      const angle = (2 * Math.PI * index) / total;
      positioned.push({
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
      index++;
    }
  }

  return positioned;
}

/**
 * Dijkstra over the edge costs. Returns the cheapest route (as a sequence of codec ids
 * including `from` and `to`) and its total cost, or undefined when no path exists. A
 * direct edge only wins when its cost is genuinely the lowest — a cheaper two-hop route
 * through an intermediate codec is preferred over a pricier direct edge.
 */
export function cheapestPath(graph: CodecGraph, from: string, to: string): CodecPath | undefined {
  if (from === to) {
    if (graph.nodes.some((n) => n.id === from)) return { path: [from], totalCost: 0 };
    return undefined;
  }

  const adjacency = new Map<string, CodecEdge[]>();
  for (const edge of graph.edges) {
    const list = adjacency.get(edge.from);
    if (list) list.push(edge);
    else adjacency.set(edge.from, [edge]);
  }

  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  dist.set(from, 0);

  // Simple O(V^2) Dijkstra: fine for a codec-count-sized graph, deterministic, no priority queue needed.
  for (;;) {
    let current: string | undefined;
    let currentDist = Infinity;
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < currentDist) {
        currentDist = d;
        current = id;
      }
    }
    if (current === undefined) break;
    visited.add(current);
    if (current === to) break;

    for (const edge of adjacency.get(current) ?? []) {
      const candidate = currentDist + edge.cost;
      if (candidate < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, candidate);
        prev.set(edge.to, current);
      }
    }
  }

  const totalCost = dist.get(to);
  if (totalCost === undefined) return undefined;

  const path: string[] = [to];
  let cursor = to;
  while (cursor !== from) {
    const p = prev.get(cursor);
    if (p === undefined) return undefined; // unreachable/inconsistent state, defensive
    path.push(p);
    cursor = p;
  }
  path.reverse();
  return { path, totalCost };
}

/**
 * A small summary for a pair of codecs: is there a direct edge, how many hops does the
 * cheapest route take, what does it cost in total, and does that route pass through any
 * codec whose name hints at a narrowband/lossy codec (a real signal, not a precise one —
 * the matrix does not carry a lossy flag, so this is inferred from well-known codec names).
 */
export function transcodingCost(graph: CodecGraph, a: string, b: string): TranscodingSummary {
  const best = cheapestPath(graph, a, b);
  if (!best) {
    return { reachable: false, direct: false, hops: 0, totalCost: 0, lossy: false };
  }

  const direct = graph.edges.some((edge) => edge.from === a && edge.to === b);
  const hops = best.path.length - 1;
  const lossy = best.path.some((id) => NARROWBAND_HINTS.some((hint) => id.toLowerCase().includes(hint)));

  return { reachable: true, direct, hops, totalCost: best.totalCost, lossy };
}

/**
 * Codecs that can reach nothing, or that nothing can reach — the defect a graph exposes
 * at a glance and a table hides in row/column scanning. A node with no outgoing edge and
 * no incoming edge is unreachable in both directions and is still reported once.
 */
export function unreachable(graph: CodecGraph): CodecNode[] {
  const hasOutgoing = new Set(graph.edges.map((e) => e.from));
  const hasIncoming = new Set(graph.edges.map((e) => e.to));
  return graph.nodes.filter((node) => !hasOutgoing.has(node.id) || !hasIncoming.has(node.id));
}
