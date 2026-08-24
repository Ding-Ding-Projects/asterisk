import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

(globalThis as { window?: unknown }).window ??= {} as unknown;

import { SCREENS } from '../../app/renderer/src/generated/console';
import { App } from '../../app/renderer/src/App';
import type { ViewReadings, Endpoint, Contact, Registration } from '../../app/renderer/src/readings';

const strip = (markup: string) => markup.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

// ViewReadings fields are `Reading<T>` (`{ command, result: Observation<T> }`), not a
// bare Observation -- these build the whole shape so a seeded reading matches exactly
// what the control-plane dispatcher actually returns.
const available = <T,>(command: string, value: T) =>
  ({ command, result: { state: 'available' as const, observedAt: '2026-01-01T00:00:00.000Z', value } });
const unavailable = (command: string, reason: string) =>
  ({ command, result: { state: 'unavailable' as const, observedAt: '2026-01-01T00:00:00.000Z', reason } });

/** Renders the real `App` pinned on the endpoints screen with seeded readings, exactly
 *  the way the mounted application would show it after a real `pjsip show endpoints` /
 *  `pjsip show contacts` / `pjsip show registrations` read landed. */
function renderEndpointsScreen(readings: ViewReadings | undefined): string {
  class Pinned extends (App as unknown as new (props: unknown) => { state: Record<string, unknown>; readings: Record<string, ViewReadings | undefined> }) {
    constructor(props: unknown) {
      super(props);
      this.state = { ...this.state, screen: 'endpoints', railId: 'pbx', onboardOpen: false };
      if (readings) this.readings.endpoints = readings;
    }
  }
  return renderToStaticMarkup(createElement(Pinned as never));
}

const endpoints: Endpoint[] = [
  { id: 'alice', state: 'Not in use', channels: '0 of inf' },
  { id: 'bob', state: 'Unavailable', channels: '0 of inf' },
];
const contacts: Contact[] = [
  { aor: 'alice', uri: 'sip:alice@10.0.0.5:5060', status: 'Avail', roundTripMs: 12 },
  { aor: 'nobody', uri: 'sip:orphan@10.0.0.9:5060', status: 'Avail' },
];
const registrations: Registration[] = [{ id: 'alice', serverUri: 'sip:pbx.example.com', status: 'Registered' }];

test('the endpoints screen is registered on the real rail', () => {
  assert.equal((SCREENS as Record<string, { rail: string }>).endpoints.rail, 'pbx');
});

test('real endpoint/contact/registration readings render real nodes for each of them', () => {
  const markup = renderEndpointsScreen({ endpoints: available('pjsip show endpoints', endpoints), contacts: available('pjsip show contacts', contacts), registrations: available('pjsip show registrations', registrations) });
  const readable = strip(markup);
  assert.ok(readable.includes('alice'), 'expected the alice endpoint node to render');
  assert.ok(readable.includes('bob'), 'expected the bob endpoint node to render');
  assert.ok(readable.includes('2 endpoints'), 'expected the summary node count to match the built graph');
  assert.ok(readable.includes('1 reachable'), 'alice has a live contact, bob does not');
  assert.ok(readable.includes('1 broken'), 'expected bob to be reported as a broken chain');
});

test('an orphan contact (no matching AOR) is reported, never silently attached to a guessed parent', () => {
  const markup = renderEndpointsScreen({ endpoints: available('pjsip show endpoints', endpoints), contacts: available('pjsip show contacts', contacts), registrations: available('pjsip show registrations', []) });
  const readable = strip(markup);
  assert.ok(readable.includes('does not match any known address-of-record'), 'expected the orphan contact to be reported by name');
});

test('an empty endpoints reading says why, rather than rendering a blank graph', () => {
  const markup = renderEndpointsScreen({ endpoints: available('pjsip show endpoints', []) });
  assert.ok(strip(markup).includes('No endpoints have been read from this target yet.'));
});

test('an unavailable endpoints reading surfaces its real reason', () => {
  const markup = renderEndpointsScreen({ endpoints: unavailable('pjsip show endpoints', '`asterisk -rx "pjsip show endpoints"` failed: No such command') });
  assert.ok(strip(markup).includes('No such command'), 'expected the real unavailable reason to render, not a generic placeholder');
});

test('no reading at all (screen never opened) does not throw, and reports absence honestly', () => {
  const markup = renderEndpointsScreen(undefined);
  assert.ok(strip(markup).includes('No endpoints have been read from this target yet.'));
});

test('BREAK CHECK -- deleting the endpoint graph wiring from App.tsx is what this guard actually catches', () => {
  const withData = renderEndpointsScreen({ endpoints: available('pjsip show endpoints', endpoints), contacts: available('pjsip show contacts', contacts), registrations: available('pjsip show registrations', registrations) });
  assert.ok(strip(withData).includes('2 endpoints'), 'the summary must reflect the real built graph, not a hard-coded string');
});
