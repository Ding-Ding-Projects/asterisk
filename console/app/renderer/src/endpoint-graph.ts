import type { Contact, Endpoint, Registration } from './readings.ts';

/**
 * Builds the endpoint reachability graph: endpoint -> address-of-record -> contact,
 * plus outbound registration -> endpoint/server. Nothing here infers a relationship the
 * parsed readings do not state — a contact that cannot be attributed to an endpoint's
 * address-of-record from its own `aor` field is reported as an orphan, never guessed
 * into a plausible parent. Layout mirrors canvas.ts: deterministic, layered, no clock,
 * no randomness.
 */

export type NodeKind = 'endpoint' | 'aor' | 'contact' | 'registration';
export type EdgeKind = 'binding' | 'live-contact' | 'outbound-registration';

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  detail: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: EdgeKind;
  detail: string;
}

export interface EndpointGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphInputs {
  endpoints: Endpoint[];
  contacts: Contact[];
  registrations: Registration[];
}

const aorNodeId = (endpointId: string): string => `aor:${endpointId}`;
const contactNodeId = (contact: Contact, index: number): string => `contact:${contact.aor}:${contact.uri}:${index}`;
const registrationNodeId = (registration: Registration): string => `registration:${registration.id}`;
const serverNodeId = (serverUri: string): string => `server:${serverUri}`;

/**
 * Build the graph from parsed readings. Every endpoint gets a configured address-of-record
 * node (that binding is declared by the endpoint's own configuration, not observed live).
 * A contact is wired to that address-of-record only when the contact's own `aor` field
 * names it; otherwise the contact is an orphan node with no incoming edge. A registration
 * is wired to the endpoint of the same id when one exists, otherwise to a server node
 * derived from its `serverUri` — either way the edge carries the registration's own status.
 */
export function buildEndpointGraph(inputs: GraphInputs): EndpointGraph {
  const { endpoints, contacts, registrations } = inputs;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const endpointIds = new Set(endpoints.map((endpoint) => endpoint.id));

  for (const endpoint of endpoints) {
    nodes.push({
      id: endpoint.id,
      kind: 'endpoint',
      label: endpoint.id,
      detail: endpoint.state,
    });
    const aorId = aorNodeId(endpoint.id);
    nodes.push({
      id: aorId,
      kind: 'aor',
      label: endpoint.id,
      detail: 'Configured address-of-record',
    });
    edges.push({ from: endpoint.id, to: aorId, kind: 'binding', detail: 'Configured binding' });
  }

  const aorIds = new Set(endpoints.map((endpoint) => aorNodeId(endpoint.id)));

  contacts.forEach((contact, index) => {
    const nodeId = contactNodeId(contact, index);
    nodes.push({
      id: nodeId,
      kind: 'contact',
      label: contact.uri,
      detail: contact.status,
    });
    const parentAorId = aorNodeId(contact.aor);
    if (aorIds.has(parentAorId)) {
      const detail = contact.roundTripMs === undefined
        ? `Live contact, ${contact.status}`
        : `Live contact, ${contact.status}, ${contact.roundTripMs}ms round trip`;
      edges.push({ from: parentAorId, to: nodeId, kind: 'live-contact', detail });
    }
    // No matching address-of-record: the contact is an orphan, reported by brokenLinks
    // rather than attached to a guessed parent.
  });

  for (const registration of registrations) {
    const nodeId = registrationNodeId(registration);
    nodes.push({
      id: nodeId,
      kind: 'registration',
      label: registration.id,
      detail: registration.status,
    });
    if (endpointIds.has(registration.id)) {
      edges.push({
        from: nodeId,
        to: registration.id,
        kind: 'outbound-registration',
        detail: `Outbound registration, ${registration.status}`,
      });
    } else {
      const srvId = serverNodeId(registration.serverUri);
      if (!nodes.some((node) => node.id === srvId)) {
        nodes.push({ id: srvId, kind: 'registration', label: registration.serverUri, detail: 'Registration server' });
      }
      edges.push({
        from: nodeId,
        to: srvId,
        kind: 'outbound-registration',
        detail: `Outbound registration, ${registration.status}`,
      });
    }
  }

  return { nodes, edges };
}

/** The ordered chain from one endpoint out through its address-of-record, contacts and registrations. */
export function chainFor(graph: EndpointGraph, endpointId: string): GraphNode[] {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const chain: GraphNode[] = [];
  const start = nodeById.get(endpointId);
  if (!start || start.kind !== 'endpoint') return chain;
  chain.push(start);

  const aorId = aorNodeId(endpointId);
  const aor = nodeById.get(aorId);
  if (!aor) return chain;
  chain.push(aor);

  for (const edge of graph.edges) {
    if (edge.kind === 'live-contact' && edge.from === aorId) {
      const contact = nodeById.get(edge.to);
      if (contact) chain.push(contact);
    }
  }
  for (const edge of graph.edges) {
    if (edge.kind === 'outbound-registration' && edge.to === endpointId) {
      const registration = nodeById.get(edge.from);
      if (registration) chain.push(registration);
    }
  }
  return chain;
}

export interface BrokenLink {
  nodeId: string;
  reason: string;
  message: string;
}

/**
 * The point of the whole feature: every place the chain from an endpoint out to a
 * registered contact is actually broken, named plainly enough to act on.
 */
export function brokenLinks(graph: EndpointGraph): BrokenLink[] {
  const results: BrokenLink[] = [];
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

  const hasIncoming = (nodeId: string): boolean => graph.edges.some((edge) => edge.to === nodeId);
  const outgoingFrom = (nodeId: string): GraphEdge[] => graph.edges.filter((edge) => edge.from === nodeId);

  for (const node of graph.nodes) {
    if (node.kind === 'endpoint') {
      const aorId = aorNodeId(node.id);
      if (!nodeById.has(aorId)) {
        results.push({
          nodeId: node.id,
          reason: 'no-aor',
          message: `Endpoint ${node.id} has no address-of-record configured.`,
        });
        continue;
      }
      const contactEdges = graph.edges.filter((edge) => edge.kind === 'live-contact' && edge.from === aorId);
      if (contactEdges.length === 0) {
        results.push({
          nodeId: aorId,
          reason: 'no-contact',
          message: `Address-of-record ${node.id} has no contact registered against it.`,
        });
        continue;
      }
      const reachable = contactEdges.some((edge) => {
        const contact = nodeById.get(edge.to);
        return contact && /^(?:ok|avail(?:able)?|reachable)$/iu.test(contact.detail.split(',')[0]?.trim() ?? '');
      });
      if (!reachable) {
        results.push({
          nodeId: aorId,
          reason: 'contact-unreachable',
          message: `Address-of-record ${node.id} has a contact, but it is not reachable.`,
        });
      }
    }

    if (node.kind === 'contact' && !hasIncoming(node.id)) {
      results.push({
        nodeId: node.id,
        reason: 'orphan-contact',
        message: `Contact ${node.label} does not match any known address-of-record.`,
      });
    }

    if (node.kind === 'registration') {
      const isServerNode = node.id.startsWith('server:');
      if (isServerNode) continue;
      const edges = outgoingFrom(node.id);
      const notRegistered = edges.some((edge) => !/^registered$/iu.test(edge.detail.split(', ')[1] ?? node.detail));
      if (notRegistered) {
        results.push({
          nodeId: node.id,
          reason: 'not-registered',
          message: `Registration ${node.label} is not registered (status: ${node.detail}).`,
        });
      }
    }
  }

  return results;
}

export interface LaidOutNode extends GraphNode {
  x: number;
  y: number;
}

export interface LayoutOptions {
  columnWidth?: number;
  rowHeight?: number;
  originX?: number;
  originY?: number;
}

const LAYER_ORDER: Record<NodeKind, number> = { endpoint: 0, aor: 1, contact: 2, registration: 3 };

/** Deterministic layered layout: endpoints on the left through registrations on the right. */
export function layoutTopology(nodes: GraphNode[], options: LayoutOptions = {}): LaidOutNode[] {
  const columnWidth = options.columnWidth ?? 228;
  const rowHeight = options.rowHeight ?? 96;
  const originX = options.originX ?? 24;
  const originY = options.originY ?? 28;

  const columnCounts = new Map<number, number>();
  return nodes
    .slice()
    .sort((a, b) => LAYER_ORDER[a.kind] - LAYER_ORDER[b.kind] || a.id.localeCompare(b.id))
    .map((node) => {
      const col = LAYER_ORDER[node.kind];
      const row = columnCounts.get(col) ?? 0;
      columnCounts.set(col, row + 1);
      return {
        ...node,
        x: originX + col * columnWidth,
        y: originY + row * rowHeight,
      };
    });
}

export interface GraphSummary {
  nodeCounts: Record<NodeKind, number>;
  edgeCounts: Record<EdgeKind, number>;
  chainsComplete: number;
  chainsBroken: number;
}

/** Counts per node kind and edge kind, plus how many endpoint chains are complete versus broken. */
export function summarise(graph: EndpointGraph): GraphSummary {
  const nodeCounts: Record<NodeKind, number> = { endpoint: 0, aor: 0, contact: 0, registration: 0 };
  for (const node of graph.nodes) nodeCounts[node.kind] += 1;

  const edgeCounts: Record<EdgeKind, number> = { binding: 0, 'live-contact': 0, 'outbound-registration': 0 };
  for (const edge of graph.edges) edgeCounts[edge.kind] += 1;

  const broken = brokenLinks(graph);
  const brokenNodeIds = new Set(broken.map((link) => link.nodeId));
  const endpoints = graph.nodes.filter((node) => node.kind === 'endpoint');
  let chainsBroken = 0;
  for (const endpoint of endpoints) {
    const aorId = aorNodeId(endpoint.id);
    if (brokenNodeIds.has(endpoint.id) || brokenNodeIds.has(aorId)) chainsBroken += 1;
  }
  const chainsComplete = endpoints.length - chainsBroken;

  return { nodeCounts, edgeCounts, chainsComplete, chainsBroken };
}
