import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

(globalThis as { window?: unknown }).window ??= {} as unknown;

import { App } from '../../app/renderer/src/App';
import type { VoicemailUser, ViewReadings } from '../../app/renderer/src/readings';

/**
 * `parseVoicemailUsers` (control-plane/asterisk-parsers.ts) drops a mailbox row it
 * cannot safely place into the fixed-width table `voicemail show users` prints, rather
 * than misassigning it -- verified against a live target where the CLI's own trailer
 * said "4 voicemail users configured" and the reading produced 3, with nothing on
 * screen saying why. The parser already hands back that trailer as `total`; this note
 * is what actually reads it. Rendered through the real `App`, like the endpoints
 * per-detail note beside it, because a row-builder test alone would pass whether or not
 * the note ever reaches the screen.
 */

const strip = (markup: string) =>
  markup.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&#x2014;/g, '—').replace(/\s+/g, ' ');

const available = <T,>(command: string, value: T) =>
  ({ command, result: { state: 'available' as const, observedAt: '2026-01-01T00:00:00.000Z', value } });

type Pinnable = {
  state: Record<string, unknown>;
  readings: Record<string, ViewReadings | undefined>;
  target: { id: string; label: string; detail: string; connected: boolean };
};

function renderVoicemailScreen(readings: ViewReadings): string {
  class Pinned extends (App as unknown as new (props: unknown) => Pinnable) {
    constructor(props: unknown) {
      super(props);
      this.state = { ...this.state, screen: 'voicemail', railId: 'pbx', onboardOpen: false };
      this.target = { id: 'Ubuntu-22.04', label: 'Ubuntu-22.04', detail: 'connection verified', connected: true };
      this.readings.voicemail = readings;
    }
  }
  return renderToStaticMarkup(createElement(Pinned as never));
}

const users: VoicemailUser[] = [
  { context: 'default', mailbox: '1234', fullName: 'Alice Example', zone: '', newMessages: 0 },
  { context: 'other', mailbox: '1234', fullName: 'Company2 User', zone: '', newMessages: 0 },
];

test('a voicemail read that dropped a row says so on the screen, naming the real count', () => {
  const readable = strip(renderVoicemailScreen({
    voicemailUsers: available('voicemail show users', { users, total: 3 }),
  }));
  assert.ok(
    readable.includes('The target reports 3 voicemail user(s) configured'),
    'expected the screen to state the target’s own reported total',
  );
  assert.ok(
    readable.includes('could not safely parse 1 of them into columns'),
    'expected the screen to say exactly one row was unparseable',
  );
});

test('a voicemail read where the trailer and the row count already agree adds nothing', () => {
  const readable = strip(renderVoicemailScreen({
    voicemailUsers: available('voicemail show users', { users, total: 2 }),
  }));
  assert.ok(!readable.includes('could not safely parse'), 'expected no dropped-row sentence when nothing was dropped');
});

test('a voicemail read with no reported total says nothing about a mismatch it cannot prove', () => {
  const readable = strip(renderVoicemailScreen({
    voicemailUsers: available('voicemail show users', { users, total: undefined }),
  }));
  assert.ok(!readable.includes('could not safely parse'), 'expected no dropped-row claim without a target-reported total');
});
