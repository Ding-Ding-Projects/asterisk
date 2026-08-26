import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

(globalThis as { window?: unknown }).window ??= {} as unknown;

import { App } from '../../app/renderer/src/App';
import type { Endpoint, EndpointDetailSet, ViewReadings } from '../../app/renderer/src/readings';

/**
 * The endpoints screen renders its Transport and Codecs columns from a per-endpoint
 * `pjsip show endpoint <id>` reading (`endpointDetails`). Every parser and row-builder
 * test for that reading passes whether or not the reading ever reaches this screen, so
 * these render the real `App` and read the columns out of the markup instead.
 */

const strip = (markup: string) =>
  markup.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&#x2014;/g, '—').replace(/\s+/g, ' ');

const available = <T,>(command: string, value: T) =>
  ({ command, result: { state: 'available' as const, observedAt: '2026-01-01T00:00:00.000Z', value } });
const unavailable = (command: string, reason: string) =>
  ({ command, result: { state: 'unavailable' as const, observedAt: '2026-01-01T00:00:00.000Z', reason } });

/**
 * `note()` returns "No target is connected" before it reaches anything else, so a
 * connected target is seeded as well as the readings -- otherwise the screen's own note
 * is unreachable and a test of it would pass on any implementation at all.
 */
type Pinnable = {
  state: Record<string, unknown>;
  readings: Record<string, ViewReadings | undefined>;
  target: { id: string; label: string; detail: string; connected: boolean };
};

function renderEndpointsScreen(readings: ViewReadings): string {
  class Pinned extends (App as unknown as new (props: unknown) => Pinnable) {
    constructor(props: unknown) {
      super(props);
      this.state = { ...this.state, screen: 'endpoints', railId: 'pbx', onboardOpen: false };
      this.target = { id: 'Ubuntu-22.04', label: 'Ubuntu-22.04', detail: 'connection verified', connected: true };
      this.readings.endpoints = readings;
    }
  }
  return renderToStaticMarkup(createElement(Pinned as never));
}

const endpoints: Endpoint[] = [{ id: 'alice', state: 'Not in use', channels: '0 of inf' }];

test('the endpoints table renders the configured transport and codec list on screen', () => {
  const details: EndpointDetailSet = {
    byEndpoint: { alice: { transport: 'transport-tls', codecs: ['opus', 'ulaw'] } },
    notRead: [],
  };
  const readable = strip(renderEndpointsScreen({
    endpoints: available('pjsip show endpoints', endpoints),
    endpointDetails: available('pjsip show endpoint alice', details),
  }));
  assert.ok(readable.includes('transport-tls'), 'expected the configured transport in the table');
  assert.ok(readable.includes('opus, ulaw'), 'expected the configured codec list in the table');
});

test('an endpoint that allows no codec says so on screen rather than showing a blank', () => {
  const details: EndpointDetailSet = { byEndpoint: { alice: { codecs: [] } }, notRead: [] };
  const readable = strip(renderEndpointsScreen({
    endpoints: available('pjsip show endpoints', endpoints),
    endpointDetails: available('pjsip show endpoint alice', details),
  }));
  assert.ok(readable.includes('none allowed'), 'expected "none allowed" for an empty allow= list');
});

test('a failed detail read says why the two columns are empty, on the screen itself', () => {
  // The endpoints screen declares `file: pjsip.conf`, so `note()` returns from its
  // configuration branch and the reading-failure reasons reported further down that
  // method never reach this screen. Without the note added beside the summary, a failed
  // detail read shows as two em dashes and nothing else.
  const readable = strip(renderEndpointsScreen({
    endpoints: available('pjsip show endpoints', endpoints),
    endpointDetails: unavailable('pjsip show endpoint alice', '`asterisk -rx "pjsip show endpoint alice"` failed: No such command'),
  }));
  assert.ok(
    readable.includes('Transport and Codecs are empty because the per-endpoint detail could not be read'),
    'expected the screen to say why the columns are empty',
  );
  assert.ok(readable.includes('No such command'), 'expected the target’s own reason to be carried through');
});

test('endpoints the read budget did not reach are named on the screen, not silently blank', () => {
  const details: EndpointDetailSet = {
    byEndpoint: { alice: { codecs: ['ulaw'] } },
    notRead: ['bob', 'carol'],
  };
  const readable = strip(renderEndpointsScreen({
    endpoints: available('pjsip show endpoints', endpoints),
    endpointDetails: available('pjsip show endpoint alice', details),
  }));
  assert.ok(readable.includes('empty for 2 endpoint(s) this read did not reach'), 'expected the skipped count');
  assert.ok(readable.includes('bob, carol'), 'expected the skipped endpoints to be named');
});

test('a fully read detail set adds no note at all', () => {
  const details: EndpointDetailSet = { byEndpoint: { alice: { codecs: ['ulaw'] } }, notRead: [] };
  const readable = strip(renderEndpointsScreen({
    endpoints: available('pjsip show endpoints', endpoints),
    endpointDetails: available('pjsip show endpoint alice', details),
  }));
  assert.ok(!readable.includes('Transport and Codecs are empty'), 'nothing was missing, so nothing should be claimed missing');
});
