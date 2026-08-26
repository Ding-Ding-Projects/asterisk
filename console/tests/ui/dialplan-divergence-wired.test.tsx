import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

(globalThis as { window?: unknown }).window ??= {} as unknown;

import { App } from '../../app/renderer/src/App';
import type { CanvasReadings, DialplanDivergence } from '../../app/renderer/src/canvas';

/**
 * The dialplan canvas draws `dialplan show`, which reads what `pbx_config` has **loaded**
 * and never what `extensions.conf` says. With nothing on the screen to mark the
 * difference, a canvas showing a dialplan no file describes looked exactly like one the
 * file describes to the letter — and the operator about to edit that file had no way to
 * tell which they were looking at.
 *
 * `dialplan-divergence.test.ts` proves the comparison. This proves it reaches a screen:
 * a comparison computed and dropped on the way to the renderer is this repository's
 * oldest recurring defect, it produces no error and no failing parser test, and every
 * assertion here is read out of markup the real `App` rendered.
 */

const strip = (markup: string) =>
  markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#x2014;/g, '—')
    .replace(/\s+/g, ' ');

const EMPTY_GRAPH = { nodes: [], edges: [] };

const agreeing: DialplanDivergence = {
  inFileNotLoaded: [],
  loadedNotInFile: [],
  fromIncludedFiles: [],
  unattributed: [],
  directives: [],
  fileContextCount: 4,
  loadedFromPbxConfigCount: 4,
  loadedFromOtherRegistrarsCount: 0,
  loadedContextsParsed: 4,
  loadedContextsReported: 4,
  diverged: false,
};

/**
 * `note()` answers "No target is connected" before it reaches the canvas branch, so the
 * target is pinned connected as well as the readings — otherwise every sentence under test
 * is unreachable and this file would pass against any implementation at all.
 */
type Pinnable = {
  state: Record<string, unknown>;
  canvasReadings: CanvasReadings | undefined;
  target: { id: string; label: string; detail: string; connected: boolean };
};

function renderCanvas(readings: CanvasReadings): string {
  class Pinned extends (App as unknown as new (props: unknown) => Pinnable) {
    constructor(props: unknown) {
      super(props);
      this.state = { ...this.state, screen: 'canvas', railId: 'pbx', onboardOpen: false };
      this.target = { id: 'Ubuntu-22.04', label: 'Ubuntu-22.04', detail: 'connection verified', connected: true };
      this.canvasReadings = readings;
    }
  }
  return strip(renderToStaticMarkup(createElement(Pinned as never)));
}

const withDivergence = (value: Partial<DialplanDivergence>): CanvasReadings => ({
  dialplan: { command: 'dialplan show', result: { state: 'available', observedAt: '2026-01-01T00:00:00.000Z', value: EMPTY_GRAPH } },
  dialplanFile: { state: 'available', observedAt: '2026-01-01T00:00:00.000Z', value: { ...agreeing, ...value } },
});

test('the canvas names the contexts the file declares that Asterisk has not loaded', () => {
  // The case the live run met: extensions.conf held [dundi-e164] at line 287, [iax2-trunk]
  // at 306 and [trunkint] at 318, and the running Asterisk had none of them.
  // docs/evidence/live-readings.md.
  const readable = renderCanvas(withDivergence({
    diverged: true,
    inFileNotLoaded: ['dundi-e164', 'iax2-trunk', 'trunkint'],
    fileContextCount: 4,
    loadedFromPbxConfigCount: 1,
  }));
  assert.ok(
    readable.includes('The running dialplan and /etc/asterisk/extensions.conf have diverged.'),
    `expected the divergence stated on screen, got: ${readable.slice(0, 1500)}`,
  );
  assert.ok(
    readable.includes('3 contexts the file declares are not loaded: dundi-e164, iax2-trunk, trunkint.'),
    `expected the missing contexts named on screen, got: ${readable.slice(0, 1500)}`,
  );
  assert.ok(
    readable.includes('reads what pbx_config has loaded, not what is on disk'),
    `expected the mechanism stated on screen, got: ${readable.slice(0, 1500)}`,
  );
});

test('the canvas names a context loaded from the file that the file no longer declares', () => {
  const readable = renderCanvas(withDivergence({
    diverged: true,
    loadedNotInFile: ['deleted-context'],
  }));
  assert.ok(
    readable.includes('1 context loaded from this file is no longer in it: deleted-context.'),
    `expected the stale loaded context named on screen, got: ${readable.slice(0, 1500)}`,
  );
});

test('the canvas says plainly when the running dialplan matches the file', () => {
  const readable = renderCanvas(withDivergence({}));
  assert.ok(
    readable.includes('The running dialplan matches /etc/asterisk/extensions.conf: every one of the 4 contexts it declares is loaded'),
    `expected the agreement stated on screen, got: ${readable.slice(0, 1500)}`,
  );
  assert.ok(
    !readable.includes('have diverged'),
    `expected no divergence claim when the two agree, got: ${readable.slice(0, 1500)}`,
  );
});

test('the canvas says how many contexts belong to another module rather than to this file', () => {
  // 21 of the live capture's 49 contexts were created by pbx_ael, res_parking or
  // func_periodic_hook. Saying so is what stops "28 of 49 compared" reading as a shortfall.
  const readable = renderCanvas(withDivergence({ loadedFromOtherRegistrarsCount: 21 }));
  assert.ok(
    readable.includes('A further 21 contexts on this target were created by another module rather than by this file'),
    `expected the other registrars accounted for on screen, got: ${readable.slice(0, 1500)}`,
  );
});

test('the canvas reports an unreadable extensions.conf in the target\'s own words', () => {
  const readable = renderCanvas({
    dialplan: { command: 'dialplan show', result: { state: 'available', observedAt: '2026-01-01T00:00:00.000Z', value: EMPTY_GRAPH } },
    dialplanFile: {
      state: 'unavailable',
      observedAt: '2026-01-01T00:00:00.000Z',
      reason: '/etc/asterisk/extensions.conf could not be read: cat: /etc/asterisk/extensions.conf: Permission denied',
    },
  });
  assert.ok(
    readable.includes('the two could not be compared here, because /etc/asterisk/extensions.conf could not be read: cat: /etc/asterisk/extensions.conf: Permission denied.'),
    `expected the exact reason on screen, got: ${readable.slice(0, 1500)}`,
  );
});

test('the canvas reports a failed dialplan reading once, not twice', () => {
  // `canvasReason` already carries this. The divergence note must stay silent rather than
  // adding a second sentence about the same failure, or one refusal reads as two.
  const readable = renderCanvas({
    dialplan: {
      command: 'dialplan show',
      result: { state: 'unavailable', observedAt: '2026-01-01T00:00:00.000Z', reason: 'Unable to connect to remote asterisk' },
    },
    dialplanFile: {
      state: 'unavailable',
      observedAt: '2026-01-01T00:00:00.000Z',
      reason: 'the running dialplan could not be read, so there is nothing to compare /etc/asterisk/extensions.conf against',
    },
  });
  assert.ok(
    readable.includes('Unable to connect to remote asterisk'),
    `expected the dialplan failure on screen, got: ${readable.slice(0, 1500)}`,
  );
  assert.ok(
    !readable.includes('nothing to compare'),
    `expected the divergence note silent while the dialplan itself is unread, got: ${readable.slice(0, 1500)}`,
  );
});

test('the canvas says when its own comparison is short of the count the command reported', () => {
  const readable = renderCanvas(withDivergence({ loadedContextsParsed: 47, loadedContextsReported: 49 }));
  assert.ok(
    readable.includes('`dialplan show` reported 49 contexts and this reading could only make out 47, so what follows is incomplete by 2.'),
    `expected the shortfall stated on screen, got: ${readable.slice(0, 1500)}`,
  );
});

test('the canvas says nothing about a shortfall when the two counts agree', () => {
  const readable = renderCanvas(withDivergence({}));
  assert.ok(
    // Uninflected, so a claim about a different number cannot satisfy a needle written
    // for this one.
    !readable.includes('could only make out'),
    `expected silence when the counts agree, got: ${readable.slice(0, 1500)}`,
  );
});
