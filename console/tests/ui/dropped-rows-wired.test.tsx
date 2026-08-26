import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

(globalThis as { window?: unknown }).window ??= {} as unknown;

import { App } from '../../app/renderer/src/App';
import type { ViewReadings } from '../../app/renderer/src/readings';

/**
 * `parseVoicemailUsers` and `parseManagerUsers` each hand back the target's own trailer
 * count beside the list they managed to parse, and both screens rendered the list and
 * threw the count away -- so a Voicemail screen showing three of four mailboxes was
 * indistinguishable from one showing all four.
 *
 * Every parser and note-builder test for that passes whether or not either value ever
 * reaches a screen, which is the exact shape of defect this repository keeps meeting:
 * wired at one end, consumed at neither. These render the real `App` and read the
 * sentence out of the markup instead.
 */

const strip = (markup: string) =>
  markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#x2014;/g, '—')
    .replace(/\s+/g, ' ');

const available = <T,>(command: string, value: T) =>
  ({ command, result: { state: 'available' as const, observedAt: '2026-01-01T00:00:00.000Z', value } });
const unavailable = (command: string, reason: string) =>
  ({ command, result: { state: 'unavailable' as const, observedAt: '2026-01-01T00:00:00.000Z', reason } });

/**
 * `note()` answers "No target is connected" before it reaches anything else, so a
 * connected target is seeded as well as the readings -- otherwise the sentence under test
 * is unreachable and the test would pass against any implementation at all.
 */
type Pinnable = {
  state: Record<string, unknown>;
  readings: Record<string, ViewReadings | undefined>;
  target: { id: string; label: string; detail: string; connected: boolean };
};

function renderScreen(screen: string, readings: ViewReadings): string {
  class Pinned extends (App as unknown as new (props: unknown) => Pinnable) {
    constructor(props: unknown) {
      super(props);
      this.state = { ...this.state, screen, railId: screen === 'ami' ? 'data' : 'media', onboardOpen: false };
      this.target = { id: 'Ubuntu-22.04', label: 'Ubuntu-22.04', detail: 'connection verified', connected: true };
      this.readings[screen] = readings;
    }
  }
  return strip(renderToStaticMarkup(createElement(Pinned as never)));
}

/** The live target's own output, verbatim; see release/evidence/live-exchange. The
 *  `myaliases` mailbox runs past the five-character Mbox field and cannot be read. */
const LIVE_VOICEMAIL = {
  users: [
    { context: 'default', mailbox: '1234', fullName: 'Example Mailbox', zone: '', newMessages: 0 },
    { context: 'other', mailbox: '1234', fullName: 'Company2 User', zone: '', newMessages: 0 },
    { context: 'dingvm', mailbox: '4242', fullName: 'Ding Live Probe', zone: '', newMessages: 0 },
  ],
  total: 4,
  dropped: ['myaliases  1234@devices                                           0'],
};

// ---------------------------------------------------------------- voicemail

test('the Voicemail screen says a mailbox is missing from the table', () => {
  const readable = renderScreen('voicemail', {
    voicemailUsers: available('voicemail show users', LIVE_VOICEMAIL),
  });
  assert.ok(
    readable.includes('1 of the 4 voicemail users on this target is missing from this table'),
    `expected the shortfall on screen, got: ${readable.slice(0, 1200)}`,
  );
});

test('the Voicemail screen names the line it could not read', () => {
  const readable = renderScreen('voicemail', {
    voicemailUsers: available('voicemail show users', LIVE_VOICEMAIL),
  });
  assert.ok(
    readable.includes('"myaliases 1234@devices 0"'),
    `expected the unreadable line on screen, got: ${readable.slice(0, 1200)}`,
  );
});

test('the Voicemail screen says nothing about a shortfall when there is none', () => {
  const readable = renderScreen('voicemail', {
    voicemailUsers: available('voicemail show users', { users: LIVE_VOICEMAIL.users, total: 3, dropped: [] }),
  });
  assert.ok(
    // The uninflected part of the sentence, so a claim about two rows cannot pass a needle
    // written for a claim about one.
    !readable.includes('voicemail users on this target'),
    `expected silence when the table is complete, got: ${readable.slice(0, 1200)}`,
  );
});

test('the Voicemail screen reports a failed reading in the target\'s own words', () => {
  // This screen edits voicemail.conf, so `note()` returns from the configuration branch
  // and never reaches the reading-failure report at the bottom of it. Without its own
  // line, a failed `voicemail show users` leaves an empty table whose only sentence is
  // about the file, which names the wrong thing entirely.
  const readable = renderScreen('voicemail', {
    voicemailUsers: unavailable('voicemail show users', 'Unable to connect to remote asterisk'),
  });
  assert.ok(
    readable.includes('No mailboxes are listed because') && readable.includes('Unable to connect to remote asterisk'),
    `expected the failure named on screen, got: ${readable.slice(0, 1200)}`,
  );
});

// ---------------------------------------------------------------- manager users

test('the AMI screen says a manager user is missing from the table', () => {
  const readable = renderScreen('ami', {
    managerUsers: available('manager show users', { users: [{ username: 'monitor' }], total: 2 }),
    ariApps: available('ari show apps', []),
  });
  assert.ok(
    readable.includes('1 of the 2 manager users on this target is missing from this table'),
    `expected the shortfall on screen, got: ${readable.slice(0, 1200)}`,
  );
});

test('the AMI screen says nothing about a shortfall when the trailer agrees with the table', () => {
  const readable = renderScreen('ami', {
    managerUsers: available('manager show users', { users: [{ username: 'monitor' }], total: 1 }),
    ariApps: available('ari show apps', []),
  });
  assert.ok(
    // Uninflected, for the same reason as the Voicemail case above.
    !readable.includes('manager users on this target'),
    `expected silence when the table is complete, got: ${readable.slice(0, 1200)}`,
  );
});

test('a failed AMI reading names itself rather than being reported as a shortfall', () => {
  // This screen edits manager.conf, so it takes the same configuration branch the
  // Voicemail screen does and its reading failures reach `reasonFor` no more than that
  // screen's do. And "the table is short two rows" is the wrong sentence for a table that
  // has none because the command never answered, so the failure says so and claims no
  // shortfall it cannot measure.
  const readable = renderScreen('ami', {
    managerUsers: unavailable('manager show users', 'Unable to connect to remote asterisk'),
  });
  assert.ok(readable.includes('Unable to connect to remote asterisk'), `expected the reason, got: ${readable.slice(0, 1200)}`);
  /* Anchored to the shortfall sentence's own signature, and to the part of it that does
   * not inflect. A bare "missing from this table" is satisfied by the failure sentence
   * sitting right beside it; "on this target is missing" only catches a shortfall of
   * exactly one, so a fabricated claim about two would walk straight past. Both of those
   * were live here: the second was found by planting the fabrication and watching this
   * assertion stay green. */
  assert.ok(!readable.includes('manager users on this target'), `expected no shortfall claim, got: ${readable.slice(0, 1200)}`);
});

test('a failed `ari show apps` costs the AMI table rows and is named too', () => {
  // `amiRows` is fed by both commands, so a screen that only ever reported the manager
  // half would go quiet about half its own table.
  const readable = renderScreen('ami', {
    managerUsers: available('manager show users', { users: [{ username: 'monitor' }], total: 1 }),
    ariApps: unavailable('ari show apps', 'Unable to connect to remote asterisk'),
  });
  assert.ok(
    readable.includes('This table is incomplete because a reading did not answer')
      && readable.includes('Unable to connect to remote asterisk'),
    `expected the failed reading named, got: ${readable.slice(0, 1200)}`,
  );
});

test('a screen short of rows AND missing a reading says both, not whichever came first', () => {
  // The AMI table is fed by two commands. One can fail while the other comes back a row
  // light, and each sentence is the only thing that names its own cause -- so reporting
  // one and dropping the other leaves a real cause unsaid on a screen that measured it.
  const readable = renderScreen('ami', {
    managerUsers: available('manager show users', { users: [{ username: 'monitor' }], total: 2 }),
    ariApps: unavailable('ari show apps', 'Unable to connect to remote asterisk'),
  });
  assert.ok(readable.includes('Unable to connect to remote asterisk'), `expected the failed reading named, got: ${readable.slice(0, 1200)}`);
  assert.ok(
    readable.includes('1 of the 2 manager users on this target is missing from this table'),
    `expected the shortfall named too, got: ${readable.slice(0, 1200)}`,
  );
});
