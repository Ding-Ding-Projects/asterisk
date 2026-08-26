import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

(globalThis as { window?: unknown }).window ??= {} as unknown;

import { App } from '../../app/renderer/src/App';
import type { CanvasReadings, DialplanGraph } from '../../app/renderer/src/canvas';
import type { ConfigReading, ConfigValue } from '../../app/renderer/src/configuration';

/**
 * `dialplan show` reads what Asterisk currently has loaded; `/etc/asterisk/extensions.conf`
 * is what the file on disk currently says. Nothing before this compared the two, and the
 * canvas screen's status note was additionally stuck on "Reading…" forever regardless --
 * `canvas` declares `file: 'extensions.conf'` and used to be caught by the generic
 * configuration-screen branch in `note()`, which never populates `this.configs.canvas`
 * (the screen has no bound controls to seed) and so never got past its own "Reading…"
 * fallback. Rendered through the real `App`, because a pure-function test of the
 * comparison alone would pass whether or not either defect were actually fixed.
 */

const strip = (markup: string) =>
  markup.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&#x2014;/g, '—').replace(/\s+/g, ' ');

const NOW = '2026-01-01T00:00:00.000Z';

type Pinnable = {
  state: Record<string, unknown>;
  canvasReadings: CanvasReadings | undefined;
  canvasExtensionsConf: ConfigReading | undefined;
  target: { id: string; label: string; detail: string; connected: boolean };
};

function renderCanvasScreen(canvasReadings: CanvasReadings, canvasExtensionsConf?: ConfigReading): string {
  class Pinned extends (App as unknown as new (props: unknown) => Pinnable) {
    constructor(props: unknown) {
      super(props);
      this.state = { ...this.state, screen: 'canvas', railId: 'pbx', onboardOpen: false };
      this.target = { id: 'Ubuntu-22.04', label: 'Ubuntu-22.04', detail: 'connection verified', connected: true };
      this.canvasReadings = canvasReadings;
      this.canvasExtensionsConf = canvasExtensionsConf;
    }
  }
  return renderToStaticMarkup(createElement(Pinned as never));
}

const graph = (contexts: string[]): DialplanGraph => ({
  nodes: contexts.map((context) => ({ id: `${context}/1`, context, extension: '1', steps: [{ priority: 1, app: 'Answer', data: '' }] })),
  edges: [],
});

const dialplanAvailable = (value: DialplanGraph): CanvasReadings =>
  ({ dialplan: { command: 'dialplan show', result: { state: 'available', observedAt: NOW, value } } });

const extensionsConf = (sections: ReadonlyArray<string>): ConfigReading => ({
  resource: '/etc/asterisk/extensions.conf',
  state: 'read',
  value: sections.map((name) => ({ name, entries: [] })) as ConfigValue,
  observedAt: NOW,
});

test('the canvas screen names a context the file declares but the running dialplan has none of', () => {
  const readable = strip(renderCanvasScreen(
    dialplanAvailable(graph(['default'])),
    extensionsConf(['default', 'dundi-e164', 'iax2-trunk']),
  ));
  assert.ok(
    readable.includes('extensions.conf declares 2 context(s) this reading found no loaded extensions under'),
    'expected the canvas screen to say how many contexts diverged',
  );
  assert.ok(readable.includes('dundi-e164, iax2-trunk'), 'expected the diverging contexts to be named');
  assert.ok(readable.includes('This canvas shows what is loaded, not what the file currently says'), 'expected the loaded-vs-file distinction stated plainly');
});

test('the canvas screen says nothing extra when the loaded dialplan and the file agree', () => {
  const readable = strip(renderCanvasScreen(
    dialplanAvailable(graph(['default', 'from-trunk'])),
    extensionsConf(['default', 'from-trunk']),
  ));
  assert.ok(!readable.includes('declares'), 'expected no divergence sentence when the two readings agree');
});

test('the canvas screen no longer sticks on "Reading…" once the dialplan graph has actually landed', () => {
  // Regression: `canvas` declares `file: 'extensions.conf'`, which used to route it into
  // the generic configuration-screen note branch. `this.configs.canvas` is never
  // populated (canvas has no bound controls), so `configSummary()` returned 'Reading…'
  // unconditionally and the dedicated canvas branch below was unreachable code.
  const readable = strip(renderCanvasScreen(dialplanAvailable(graph(['default']))));
  assert.ok(!readable.includes('Reading…'), 'expected the canvas note to move past "Reading…" once the graph is available');
});

test('a failed dialplan read still reports its own reason, not a divergence claim it cannot prove', () => {
  const failed: CanvasReadings = {
    dialplan: { command: 'dialplan show', result: { state: 'unavailable', observedAt: NOW, reason: 'No such command' } },
  };
  const readable = strip(renderCanvasScreen(failed, extensionsConf(['default', 'dundi-e164'])));
  assert.ok(readable.includes('No such command'), 'expected the dialplan read failure reason on screen');
  assert.ok(!readable.includes('declares'), 'expected no divergence claim when the dialplan itself could not be read');
});
