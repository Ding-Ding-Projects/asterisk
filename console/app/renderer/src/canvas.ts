import type { Observation } from '../../../shared/control-plane';

/**
 * Turns a read dialplan graph into the design's canvas shapes. Nothing here invents a
 * step or a connection: nodes and edges come only from `dialplan-graph.ts`'s parse of a
 * real `dialplan show`, and the layout below is a deterministic function of that graph
 * (no randomness, no clock) so the same reading always draws the same canvas.
 */
export interface DialplanStep { priority: number; app: string; data: string }
export interface DialplanNode {
  id: string; context: string; extension: string; steps: DialplanStep[];
  registrar?: { file: string; line: number } | { name: string };
}
export type DialplanEdge = [string, string];
export interface DialplanGraph { nodes: DialplanNode[]; edges: DialplanEdge[] }

interface Reading<T> { command: string; result: Observation<T> }
export interface CanvasReadings { dialplan?: Reading<DialplanGraph> }

export type CanvasSubsetState = 'unread' | 'verified-empty' | 'read' | 'unavailable';

export interface CanvasCapability {
  readonly state: 'available' | 'unavailable';
  readonly reason?: string;
}

export interface CanvasSubsetMetadata {
  readonly state: CanvasSubsetState;
  readonly sourceCommand?: string;
  readonly observedAt?: string;
  readonly observedNodes: number;
  readonly observedEdges: number;
  readonly renderedNodes: number;
  readonly renderedEdges: number;
  readonly omittedEdges: number;
  readonly scope: string;
  readonly staleReason?: string;
  readonly reason?: string;
  readonly capabilities: {
    readonly read: CanvasCapability;
    readonly add: CanvasCapability;
    readonly edit: CanvasCapability;
    readonly remove: CanvasCapability;
    readonly rewire: CanvasCapability;
  };
}

export function valueOf<T>(reading: Reading<T> | undefined): T | undefined {
  return reading?.result.state === 'available' ? reading.result.value : undefined;
}

export function canvasReason(readings: CanvasReadings | undefined): string {
  const reading = readings?.dialplan;
  return reading && reading.result.state === 'unavailable' ? reading.result.reason : '';
}

const NO_CANVAS_WRITER = {
  state: 'unavailable',
  reason: 'The canvas has no configuration-write path.',
} as const satisfies CanvasCapability;

/** Exact scope and completeness of the graph that can be drawn from one observation. */
export function canvasSubsetMetadata(readings: CanvasReadings | undefined): CanvasSubsetMetadata {
  const reading = readings?.dialplan;
  const base = {
    observedNodes: 0,
    observedEdges: 0,
    renderedNodes: 0,
    renderedEdges: 0,
    omittedEdges: 0,
    scope: 'Contexts, extensions, priorities, applications, and explicit graph edges returned by the dialplan reading.',
    capabilities: {
      read: { state: 'unavailable', reason: 'The dialplan has not been read.' } as CanvasCapability,
      add: NO_CANVAS_WRITER,
      edit: NO_CANVAS_WRITER,
      remove: NO_CANVAS_WRITER,
      rewire: NO_CANVAS_WRITER,
    },
  } as const;
  if (!reading) return { ...base, state: 'unread' };
  if (reading.result.state === 'unavailable') {
    return {
      ...base,
      state: 'unavailable',
      sourceCommand: reading.command,
      observedAt: reading.result.observedAt,
      reason: reading.result.reason,
      capabilities: {
        ...base.capabilities,
        read: { state: 'unavailable', reason: reading.result.reason },
      },
    };
  }

  const graph = reading.result.value;
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const renderedEdges = graph.edges.filter(([from, to]) => nodeIds.has(from) && nodeIds.has(to)).length;
  return {
    ...base,
    state: graph.nodes.length === 0 && graph.edges.length === 0 ? 'verified-empty' : 'read',
    sourceCommand: reading.command,
    observedAt: reading.result.observedAt,
    observedNodes: graph.nodes.length,
    observedEdges: graph.edges.length,
    renderedNodes: graph.nodes.length,
    renderedEdges,
    omittedEdges: graph.edges.length - renderedEdges,
    capabilities: {
      ...base.capabilities,
      read: { state: 'available' },
    },
  };
}

export interface CanvasNode { id: string; x: number; y: number; icon: string; title: string; detail: string }

const COLUMN_W = 228;
const ROW_H = 96;
const ORIGIN_X = 24;
const ORIGIN_Y = 28;

/** Layered left-to-right layout by graph depth (longest path from a root, in edges). */
export function layoutNodes(graph: DialplanGraph): CanvasNode[] {
  const depth = new Map<string, number>();
  const incoming = new Set(graph.edges.map(([, to]) => to));
  const outgoing = new Map<string, string[]>();
  for (const [from, to] of graph.edges) outgoing.set(from, [...(outgoing.get(from) ?? []), to]);

  const roots = graph.nodes.filter((node) => !incoming.has(node.id)).map((node) => node.id);
  const order = roots.length ? roots : graph.nodes.map((node) => node.id);
  for (const id of order) depth.set(id, 0);

  // Propagate depth = max(parent depth) + 1 along edges, bounded by node count to stay finite on cycles.
  for (let pass = 0; pass < graph.nodes.length; pass++) {
    let changed = false;
    for (const [from, to] of graph.edges) {
      const fromDepth = depth.get(from);
      if (fromDepth === undefined) continue;
      const candidate = fromDepth + 1;
      if ((depth.get(to) ?? -1) < candidate) {
        depth.set(to, candidate);
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const node of graph.nodes) if (!depth.has(node.id)) depth.set(node.id, 0);

  const columnCounts = new Map<number, number>();
  return graph.nodes
    .slice()
    .sort((a, b) => a.context.localeCompare(b.context) || a.extension.localeCompare(b.extension))
    .map((node) => {
      const col = depth.get(node.id) ?? 0;
      const row = columnCounts.get(col) ?? 0;
      columnCounts.set(col, row + 1);
      return {
        id: node.id,
        x: ORIGIN_X + col * COLUMN_W,
        y: ORIGIN_Y + row * ROW_H,
        icon: iconFor(node),
        title: titleFor(node),
        detail: detailFor(node),
      };
    });
}

export function edgePairs(graph: DialplanGraph): [string, string][] {
  return graph.edges.map(([from, to]) => [from, to]);
}

function titleFor(node: DialplanNode): string {
  return `${node.context} · ${node.extension}`;
}

function detailFor(node: DialplanNode): string {
  return node.steps.map((step) => `${step.priority}. ${step.app}(${step.data})`).join('\n');
}

/** Icon derived from what the extension's steps actually do — no invented meaning. */
function iconFor(node: DialplanNode): string {
  const apps = node.steps.map((step) => step.app.toUpperCase());
  if (apps.includes('QUEUE')) return 'groups';
  if (apps.includes('VOICEMAIL')) return 'voicemail';
  if (apps.includes('GOTOIFTIME')) return 'schedule';
  if (apps.some((app) => app === 'PLAYBACK' || app === 'BACKGROUND')) return 'dialpad';
  if (apps.includes('DIAL')) return 'call_made';
  if (apps.includes('HANGUP')) return 'call_end';
  if (/^(from-|trunk|external|inbound)/iu.test(node.context)) return 'call_received';
  return 'call_split';
}
