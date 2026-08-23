import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

/**
 * Renders the real `App` — not the bare design shell — so this proves the sample data the
 * design bakes in never reaches the screen. `App` reads `window`/`crypto` at module scope
 * (via the desktop bridge lookup) and `componentDidMount`, so both are stubbed here rather
 * than touched in production code.
 */
(globalThis as unknown as { window?: unknown }).window ??= globalThis;
(globalThis as unknown as { crypto?: unknown }).crypto ??= { randomUUID: () => 'test-uuid' };

const { App } = await import('../../app/renderer/src/App.tsx');
const { SCREENS } = await import('../../app/renderer/src/generated/console.tsx');

const strip = (markup: string) => markup.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ');

/** Renders `App` pinned to one screen, with no desktop bridge — the state every user sees
 *  before a target is ever discovered. componentDidMount is skipped so no async discovery
 *  kicks off underneath the synchronous render. */
function renderApp(screen: string): string {
  class Pinned extends (App as unknown as new (props: unknown) => { state: Record<string, unknown>; componentDidMount?(): void }) {
    constructor(props: unknown) {
      super(props);
      this.state = { ...this.state, screen, railId: (SCREENS as Record<string, { rail: string }>)[screen].rail, onboardOpen: false };
    }
    componentDidMount() {
      // Skip: no discovery, no async control-plane calls during a static render.
    }
  }
  return renderToStaticMarkup(createElement(Pinned as never));
}

test('history screen never renders the design\'s invented commits', () => {
  const text = strip(renderApp('history'));
  for (const invented of ['8f2a1c4', '2d90b17', 'a41e88d', 'c07bb52', '5be3390', 'ringall', 'leastrecent', 'hardening']) {
    assert.ok(!text.includes(invented), `history: found invented value "${invented}"`);
  }
  assert.ok(text.includes('no configuration change has been written'.slice(0, 20)) || text.toLowerCase().includes('no configuration change'), 'history: missing the empty-state reason');
});

test('memory screen never renders the design\'s invented rows or panels', () => {
  const text = strip(renderApp('memory'));
  for (const invented of ['conservation-bakery', 'material-virtualbox', 'status-hub-protocol', 'HOST_INVENTORY', '184 matches', '2,412', 'Signed']) {
    assert.ok(!text.includes(invented), `memory: found invented value "${invented}"`);
  }
});

test('trunk authentication screen never renders the design\'s invented partner requests', () => {
  const text = strip(renderApp('trunkauth'));
  for (const invented of ['carrier-primary', 'branch-iax', 'carrier-backup', '203.0.113.19', '203.0.113.44']) {
    assert.ok(!text.includes(invented), `trunkauth: found invented value "${invented}"`);
  }
});

test('the nav rail never shows the design\'s invented per-destination badge counts', () => {
  class Pinned extends (App as unknown as new (props: unknown) => {
    state: Record<string, unknown>;
    componentDidMount?(): void;
    renderVals(): Record<string, unknown>;
  }) {
    constructor(props: unknown) {
      super(props);
      this.state = { ...this.state, screen: 'live', railId: (SCREENS as Record<string, { rail: string }>).live.rail, onboardOpen: false };
    }
    componentDidMount() {}
  }
  const instance = new (Pinned as unknown as new () => InstanceType<typeof Pinned>)();
  const sections = instance.renderVals().sections as Array<{ label: string; badge: string }>;
  assert.ok(sections.length > 0, 'expected the pbx rail sections to render');
  for (const section of sections) {
    assert.equal(section.badge, '', `nav: destination "${section.label}" shows badge "${section.badge}" with no target connected`);
  }
});
