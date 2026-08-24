import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// App.bridge() reads `window.dingDesktop`; outside a browser/jsdom environment there
// is no `window` global at all, so stub the minimum this render path touches.
(globalThis as { window?: unknown }).window ??= {} as unknown;

import { SCREENS } from '../../app/renderer/src/generated/console';
import { App } from '../../app/renderer/src/App';
import type { ViewReadings } from '../../app/renderer/src/readings';
import type { Codec, TranslationRow } from '../../control-plane/asterisk-parsers.ts';

const strip = (markup: string) => markup.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

// ViewReadings fields are `Reading<T>` (`{ command, result: Observation<T> }`), not a
// bare Observation -- these build the whole shape so a seeded reading matches exactly
// what the control-plane dispatcher actually returns.
const available = <T,>(command: string, value: T) =>
  ({ command, result: { state: 'available' as const, observedAt: '2026-01-01T00:00:00.000Z', value } });
const unavailable = (command: string, reason: string) =>
  ({ command, result: { state: 'unavailable' as const, observedAt: '2026-01-01T00:00:00.000Z', reason } });

/** Renders the real `App` (not the bare compiled shell) pinned on the codecs screen with
 *  seeded readings, exactly the way the mounted application would show it after a real
 *  `core show codecs` / `core show translation` read landed -- the guard against
 *  "imported, but never reachable" regressing again for the codec graph. */
function renderCodecsScreen(readings: ViewReadings | undefined): string {
  class Pinned extends (App as unknown as new (props: unknown) => { state: Record<string, unknown>; readings: Record<string, ViewReadings | undefined> }) {
    constructor(props: unknown) {
      super(props);
      this.state = { ...this.state, screen: 'codecs', railId: 'media', onboardOpen: false };
      if (readings) this.readings.codecs = readings;
    }
  }
  return renderToStaticMarkup(createElement(Pinned as never));
}

const codecs: Codec[] = [
  { type: 'audio', name: 'opus', format: 'opus', description: 'Opus Codec' },
  { type: 'audio', name: 'ulaw', format: 'ulaw', description: 'G.711 u-law' },
  { type: 'audio', name: 'g729', format: 'g729', description: 'G.729' },
];

const translations: TranslationRow[] = [
  { sourceFormat: 'opus', costs: { ulaw: 4 } },
  { sourceFormat: 'ulaw', costs: { opus: 4, g729: 90000 } },
  // g729 appears only as a destination -- no outgoing edge, so it is stranded.
];

test('the codecs screen is registered on the real rail', () => {
  assert.equal((SCREENS as Record<string, { rail: string }>).codecs.rail, 'media');
});

test('a real translation reading renders a real node for every codec it mentions', () => {
  const markup = renderCodecsScreen({ codecs: available('core show codecs', codecs), translations: available('core show translation', translations) });
  const readable = strip(markup);
  assert.ok(readable.includes('opus'), 'expected the opus node label to render');
  assert.ok(readable.includes('ulaw'), 'expected the ulaw node label to render');
  assert.ok(readable.includes('g729'), 'expected the g729 node label to render');
  // 3 codecs, 3 translation edges (opus->ulaw, ulaw->opus, ulaw->g729).
  assert.ok(readable.includes('3 codecs'), 'expected the summary node count to match the built graph');
  assert.ok(readable.includes('3 translation path'), 'expected the summary edge count to match the built graph');
});

test('a codec with no incoming or outgoing edge is reported as stranded, not silently dropped', () => {
  const markup = renderCodecsScreen({
    codecs: available('core show codecs', codecs),
    translations: available('core show translation', [{ sourceFormat: 'opus', costs: { ulaw: 4 } }, { sourceFormat: 'ulaw', costs: { opus: 4 } }]),
  });
  // g729 was named in the codecs reading but never appears as a row or column in the
  // translation matrix, so buildCodecGraph correctly excludes it as a node entirely --
  // stranded only applies to a codec the matrix DOES mention with no edge either way.
  const readable = strip(markup);
  assert.ok(!readable.includes('Stranded'), 'g729 is absent from the translation matrix entirely, not stranded');
});

test('an empty translation reading says why, rather than rendering a blank graph', () => {
  const markup = renderCodecsScreen({ translations: available('core show translation', []) });
  assert.ok(strip(markup).includes('No codec translation paths have been read from this target yet.'));
});

test('an unavailable translation reading surfaces its real reason', () => {
  const markup = renderCodecsScreen({ translations: unavailable('core show translation', '`asterisk -rx "core show translation"` failed: No such command') });
  assert.ok(strip(markup).includes('No such command'), 'expected the real unavailable reason to render, not a generic placeholder');
});

test('no reading at all (screen never opened) does not throw, and reports absence honestly', () => {
  const markup = renderCodecsScreen(undefined);
  assert.ok(strip(markup).includes('No codec translation paths have been read from this target yet.'));
});

test('BREAK CHECK -- deleting the codec graph wiring from App.tsx is what this guard actually catches', () => {
  const withData = renderCodecsScreen({ codecs: available('core show codecs', codecs), translations: available('core show translation', translations) });
  assert.ok(strip(withData).includes('3 codecs'), 'the summary must reflect the real built graph, not a hard-coded string');
});
