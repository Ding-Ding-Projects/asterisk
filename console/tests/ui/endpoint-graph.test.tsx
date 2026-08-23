import assert from 'node:assert/strict';
import test from 'node:test';

import {
  brokenLinks,
  buildEndpointGraph,
  chainFor,
  layoutTopology,
  summarise,
} from '../../app/renderer/src/endpoint-graph.ts';
import type { Contact, Endpoint, Registration } from '../../app/renderer/src/readings.ts';

const endpoint = (id: string, state = 'Not in use'): Endpoint => ({ id, state, channels: '' });
const contact = (aor: string, uri: string, status = 'OK', roundTripMs?: number): Contact =>
  ({ aor, uri, status, roundTripMs });
const registration = (id: string, serverUri: string, status = 'Registered'): Registration =>
  ({ id, serverUri, status });

// ---------------------------------------------------------------- buildEndpointGraph

test('builds nodes and edges from realistic endpoints, contacts and registrations', () => {
  const graph = buildEndpointGraph({
    endpoints: [endpoint('alice'), endpoint('trunk-out')],
    contacts: [contact('alice', 'sip:alice@10.0.0.5:5060', 'OK', 42)],
    registrations: [registration('trunk-out', 'sip:provider.example.com')],
  });
  assert.equal(graph.nodes.filter((n) => n.kind === 'endpoint').length, 2);
  assert.equal(graph.nodes.filter((n) => n.kind === 'aor').length, 2);
  assert.equal(graph.nodes.filter((n) => n.kind === 'contact').length, 1);
  assert.equal(graph.nodes.filter((n) => n.kind === 'registration').length, 1);
});

test('endpoint -> aor edge is a configured binding', () => {
  const graph = buildEndpointGraph({ endpoints: [endpoint('alice')], contacts: [], registrations: [] });
  const edge = graph.edges.find((e) => e.kind === 'binding');
  assert.ok(edge);
  assert.equal(edge!.from, 'alice');
  assert.match(edge!.detail, /configured/iu);
});

test('aor -> contact edge is a live binding and carries round-trip time when reported', () => {
  const graph = buildEndpointGraph({
    endpoints: [endpoint('alice')],
    contacts: [contact('alice', 'sip:alice@10.0.0.5', 'OK', 17)],
    registrations: [],
  });
  const edge = graph.edges.find((e) => e.kind === 'live-contact');
  assert.ok(edge);
  assert.match(edge!.detail, /17ms/u);
});

test('aor -> contact edge omits round-trip time when the contact does not report one', () => {
  const graph = buildEndpointGraph({
    endpoints: [endpoint('alice')],
    contacts: [contact('alice', 'sip:alice@10.0.0.5', 'OK')],
    registrations: [],
  });
  const edge = graph.edges.find((e) => e.kind === 'live-contact');
  assert.ok(edge);
  assert.equal(/ms/u.test(edge!.detail), false);
});

test('registration -> endpoint edge fires when the registration id matches a known endpoint', () => {
  const graph = buildEndpointGraph({
    endpoints: [endpoint('trunk-out')],
    contacts: [],
    registrations: [registration('trunk-out', 'sip:provider.example.com')],
  });
  const edge = graph.edges.find((e) => e.kind === 'outbound-registration');
  assert.ok(edge);
  assert.equal(edge!.to, 'trunk-out');
});

test('registration -> server edge fires when the registration id matches no endpoint', () => {
  const graph = buildEndpointGraph({
    endpoints: [],
    contacts: [],
    registrations: [registration('reg1', 'sip:provider.example.com')],
  });
  const edge = graph.edges.find((e) => e.kind === 'outbound-registration');
  assert.ok(edge);
  assert.equal(edge!.to, 'server:sip:provider.example.com');
  const serverNode = graph.nodes.find((n) => n.id === 'server:sip:provider.example.com');
  assert.ok(serverNode);
});

test('a contact with no attributable address-of-record is an orphan, never attached to a guessed parent', () => {
  const graph = buildEndpointGraph({
    endpoints: [endpoint('alice')],
    contacts: [contact('bob-does-not-exist', 'sip:mystery@10.0.0.9')],
    registrations: [],
  });
  const contactNode = graph.nodes.find((n) => n.kind === 'contact');
  assert.ok(contactNode);
  const hasIncoming = graph.edges.some((e) => e.to === contactNode!.id);
  assert.equal(hasIncoming, false);
});

test('an endpoint with no contacts still produces an endpoint and aor node without throwing', () => {
  const graph = buildEndpointGraph({ endpoints: [endpoint('lonely')], contacts: [], registrations: [] });
  assert.equal(graph.nodes.some((n) => n.id === 'lonely'), true);
  assert.equal(graph.edges.some((e) => e.kind === 'live-contact'), false);
});

test('a contact with no matching endpoint does not throw', () => {
  assert.doesNotThrow(() => buildEndpointGraph({
    endpoints: [],
    contacts: [contact('nobody', 'sip:x@1.2.3.4')],
    registrations: [],
  }));
});

test('empty inputs produce an empty graph without throwing', () => {
  const graph = buildEndpointGraph({ endpoints: [], contacts: [], registrations: [] });
  assert.deepEqual(graph.nodes, []);
  assert.deepEqual(graph.edges, []);
});

test('reported order is preserved among endpoints', () => {
  const graph = buildEndpointGraph({
    endpoints: [endpoint('zeta'), endpoint('alpha')],
    contacts: [],
    registrations: [],
  });
  const ids = graph.nodes.filter((n) => n.kind === 'endpoint').map((n) => n.id);
  assert.deepEqual(ids, ['zeta', 'alpha']);
});

// ---------------------------------------------------------------- chainFor

test('chainFor returns the ordered chain from an endpoint through contact and registration', () => {
  const graph = buildEndpointGraph({
    endpoints: [endpoint('trunk-out')],
    contacts: [contact('trunk-out', 'sip:trunk@10.0.0.1', 'OK', 5)],
    registrations: [registration('trunk-out', 'sip:provider.example.com')],
  });
  const chain = chainFor(graph, 'trunk-out');
  assert.equal(chain[0].kind, 'endpoint');
  assert.equal(chain[1].kind, 'aor');
  assert.equal(chain.some((n) => n.kind === 'contact'), true);
  assert.equal(chain.some((n) => n.kind === 'registration'), true);
});

test('chainFor on an unknown endpoint returns an empty chain', () => {
  const graph = buildEndpointGraph({ endpoints: [endpoint('a')], contacts: [], registrations: [] });
  assert.deepEqual(chainFor(graph, 'does-not-exist'), []);
});

// ---------------------------------------------------------------- brokenLinks

test('brokenLinks finds an endpoint with no address-of-record contact', () => {
  const graph = buildEndpointGraph({ endpoints: [endpoint('alice')], contacts: [], registrations: [] });
  const links = brokenLinks(graph);
  const link = links.find((l) => l.reason === 'no-contact');
  assert.ok(link);
  assert.match(link!.message, /no contact registered/iu);
});

test('brokenLinks finds an orphan contact separately', () => {
  const graph = buildEndpointGraph({
    endpoints: [endpoint('alice')],
    contacts: [contact('nobody-home', 'sip:x@1.2.3.4')],
    registrations: [],
  });
  const links = brokenLinks(graph);
  const link = links.find((l) => l.reason === 'orphan-contact');
  assert.ok(link);
  assert.match(link!.message, /does not match any known/iu);
});

test('brokenLinks flags an unreachable contact', () => {
  const graph = buildEndpointGraph({
    endpoints: [endpoint('alice')],
    contacts: [contact('alice', 'sip:alice@10.0.0.5', 'Unreachable')],
    registrations: [],
  });
  const links = brokenLinks(graph);
  const link = links.find((l) => l.reason === 'contact-unreachable');
  assert.ok(link);
  assert.match(link!.message, /not reachable/iu);
});

test('brokenLinks flags a registration that is not registered', () => {
  const graph = buildEndpointGraph({
    endpoints: [],
    contacts: [],
    registrations: [registration('reg1', 'sip:provider.example.com', 'Rejected')],
  });
  const links = brokenLinks(graph);
  const link = links.find((l) => l.reason === 'not-registered');
  assert.ok(link);
  assert.match(link!.message, /not registered/iu);
});

test('a fully healthy graph returns no broken links', () => {
  const graph = buildEndpointGraph({
    endpoints: [endpoint('alice')],
    contacts: [contact('alice', 'sip:alice@10.0.0.5', 'OK', 12)],
    registrations: [registration('reg1', 'sip:provider.example.com', 'Registered')],
  });
  assert.deepEqual(brokenLinks(graph), []);
});

// ---------------------------------------------------------------- layoutTopology

test('layoutTopology is deterministic across two runs on the same input', () => {
  const graph = buildEndpointGraph({
    endpoints: [endpoint('alice'), endpoint('bob')],
    contacts: [contact('alice', 'sip:alice@10.0.0.5', 'OK', 3)],
    registrations: [registration('reg1', 'sip:provider.example.com')],
  });
  const first = layoutTopology(graph.nodes);
  const second = layoutTopology(graph.nodes);
  assert.deepEqual(first, second);
});

test('layoutTopology never places two nodes at the same position', () => {
  const graph = buildEndpointGraph({
    endpoints: [endpoint('alice'), endpoint('bob'), endpoint('carol')],
    contacts: [contact('alice', 'sip:a@1', 'OK'), contact('bob', 'sip:b@1', 'OK')],
    registrations: [registration('reg1', 'sip:p1'), registration('reg2', 'sip:p2')],
  });
  const laid = layoutTopology(graph.nodes);
  const positions = new Set(laid.map((n) => `${n.x},${n.y}`));
  assert.equal(positions.size, laid.length);
});

test('layoutTopology puts endpoints strictly left of registrations', () => {
  const graph = buildEndpointGraph({
    endpoints: [endpoint('alice')],
    contacts: [],
    registrations: [registration('reg1', 'sip:p1')],
  });
  const laid = layoutTopology(graph.nodes);
  const endpointX = laid.find((n) => n.kind === 'endpoint')!.x;
  const registrationXs = laid.filter((n) => n.kind === 'registration').map((n) => n.x);
  assert.ok(registrationXs.every((x) => x > endpointX));
});

test('layoutTopology honours custom column width and origin options', () => {
  const graph = buildEndpointGraph({ endpoints: [endpoint('alice')], contacts: [], registrations: [] });
  const laid = layoutTopology(graph.nodes, { originX: 100, originY: 50, columnWidth: 10, rowHeight: 10 });
  const endpointNode = laid.find((n) => n.kind === 'endpoint');
  assert.equal(endpointNode!.x, 100);
  assert.equal(endpointNode!.y, 50);
});

test('layoutTopology on an empty node list returns an empty array without throwing', () => {
  assert.deepEqual(layoutTopology([]), []);
});

// ---------------------------------------------------------------- summarise

test('summarise counts add up to the node and edge totals', () => {
  const graph = buildEndpointGraph({
    endpoints: [endpoint('alice'), endpoint('bob')],
    contacts: [contact('alice', 'sip:a@1', 'OK'), contact('nobody', 'sip:b@1', 'OK')],
    registrations: [registration('reg1', 'sip:p1', 'Registered')],
  });
  const summary = summarise(graph);
  const nodeTotal = Object.values(summary.nodeCounts).reduce((a, b) => a + b, 0);
  const edgeTotal = Object.values(summary.edgeCounts).reduce((a, b) => a + b, 0);
  assert.equal(nodeTotal, graph.nodes.length);
  assert.equal(edgeTotal, graph.edges.length);
  assert.equal(summary.chainsComplete + summary.chainsBroken, 2);
});

test('summarise on empty inputs reports zero counts without throwing', () => {
  const graph = buildEndpointGraph({ endpoints: [], contacts: [], registrations: [] });
  const summary = summarise(graph);
  assert.equal(summary.nodeCounts.endpoint, 0);
  assert.equal(summary.chainsComplete, 0);
  assert.equal(summary.chainsBroken, 0);
});
