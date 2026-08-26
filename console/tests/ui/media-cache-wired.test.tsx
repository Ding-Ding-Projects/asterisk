import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

(globalThis as { window?: unknown }).window ??= {} as unknown;

import { App } from '../../app/renderer/src/App';
import type { ViewReadings } from '../../app/renderer/src/readings';

/**
 * The target's media cache, on the screen.
 *
 * Every parser and note-builder test for this passes whether or not the reading ever
 * reaches a surface, which is the shape of defect this repository keeps meeting: wired at
 * one end, consumed at neither. `media cache show all` was in the allowlist for its whole
 * life with nothing reading it. These render the real `App` on the Music on Hold screen and
 * read the sentence out of the markup.
 */

const strip = (markup: string) =>
  markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#x2F;/g, '/')
    .replace(/&#x2014;/g, '—')
    .replace(/\s+/g, ' ');

const available = <T,>(command: string, value: T) =>
  ({ command, result: { state: 'available' as const, observedAt: '2026-01-01T00:00:00.000Z', value } });
const unavailable = (command: string, reason: string) =>
  ({ command, result: { state: 'unavailable' as const, observedAt: '2026-01-01T00:00:00.000Z', reason } });

type Pinnable = {
  state: Record<string, unknown>;
  readings: Record<string, ViewReadings | undefined>;
  target: { id: string; label: string; detail: string; connected: boolean };
};

/** `note()` answers "No target is connected" before anything else, so the target is seeded
 *  too -- otherwise the sentence under test is unreachable and every assertion here would
 *  pass against any implementation at all. */
function renderMoh(readings: ViewReadings): string {
  class Pinned extends (App as unknown as new (props: unknown) => Pinnable) {
    constructor(props: unknown) {
      super(props);
      this.state = { ...this.state, screen: 'moh', railId: 'media', onboardOpen: false };
      this.target = { id: 'Ubuntu-22.04', label: 'Ubuntu-22.04', detail: 'connection verified', connected: true };
      this.readings.moh = readings;
    }
  }
  return strip(renderToStaticMarkup(createElement(Pinned as never)));
}

/** The live target's own two items, from release/evidence/live-exchange/readings/added. */
const LIVE_ITEMS = {
  items: [
    { uri: 'http://127.0.0.1:18080/probe.gsm', localFile: '/var/cache/asterisk/bucket-HDzQa1.gsm' },
    {
      uri: 'http://127.0.0.1:18080/a-deliberately-long-path-that-overruns-forty-columns.gsm',
      localFile: '/var/cache/asterisk/bucket-OMdQWL.gsm',
    },
  ],
  dropped: [] as string[],
};

test('the Music on Hold screen names the target\'s cached media', () => {
  const markup = renderMoh({
    mohClasses: available('moh show classes', []),
    mediaCacheItems: available('media cache show all', LIVE_ITEMS),
  });
  assert.match(markup, /2 item\(s\) in this target's media cache/);
  assert.match(markup, /http:\/\/127\.0\.0\.1:18080\/probe\.gsm/);
  assert.match(markup, /\/var\/cache\/asterisk\/bucket-HDzQa1\.gsm/);
});

test('it says the cache is empty rather than saying nothing', () => {
  /* An empty cache and an unread cache are different facts, and a screen that mentions
   * neither renders them identically -- which is the whole reason the reading exists rather
   * than the screen simply not having one. */
  const markup = renderMoh({
    mohClasses: available('moh show classes', []),
    mediaCacheItems: available('media cache show all', { items: [], dropped: [] }),
  });
  assert.match(markup, /This target's media cache is empty/);
  assert.match(markup, /media cache show all/);
});

test('it distinguishes cached media from the music-on-hold classes beside it', () => {
  /* The two are genuinely different things -- a class names a directory an operator filled,
   * a cache item is something Asterisk fetched from a URI itself -- and the screen showing
   * both must not let a reader take one for the other. */
  for (const value of [{ items: [], dropped: [] }, LIVE_ITEMS]) {
    const markup = renderMoh({
      mohClasses: available('moh show classes', []),
      mediaCacheItems: available('media cache show all', value),
    });
    assert.match(markup, /music-on-hold classes below/);
  }
});

test('a failed cache reading names itself instead of leaving the screen silent', () => {
  /* This screen edits musiconhold.conf, so `note()` returns from its configuration branch
   * and never reaches the reading-failure report at the bottom of it -- the same shape that
   * left the Voicemail and AMI screens silent about their own failed readings. */
  const markup = renderMoh({
    mohClasses: available('moh show classes', []),
    mediaCacheItems: unavailable('media cache show all', 'Unable to connect to remote asterisk'),
  });
  assert.match(markup, /This target's media cache could not be read: Unable to connect to remote asterisk/);
});

test('the classes reading failing does not silence the cache sentence, or the reverse', () => {
  /* Two readings feed this screen and either can fail without costing the other. A screen
   * that reported whichever came first would leave a real cause unsaid -- exactly the defect
   * the Voicemail and AMI screens were repaired for. */
  const markup = renderMoh({
    mohClasses: unavailable('moh show classes', 'No such command'),
    mediaCacheItems: available('media cache show all', LIVE_ITEMS),
  });
  assert.match(markup, /2 item\(s\) in this target's media cache/);
});

test('lines the listing lost are reported, not quietly absent', () => {
  const markup = renderMoh({
    mohClasses: available('moh show classes', []),
    mediaCacheItems: available('media cache show all', {
      items: LIVE_ITEMS.items,
      dropped: ['http://example.com/orphaned.gsm'],
    }),
  });
  assert.match(markup, /1 further line\(s\) of that listing could not be read/);
  assert.match(markup, /orphaned\.gsm/);
});

test('a screen with no cache reading at all says nothing about one', () => {
  /* Silence is right here and only here: a reading that was never taken must not produce a
   * sentence claiming anything about the cache. */
  const markup = renderMoh({ mohClasses: available('moh show classes', []) });
  assert.doesNotMatch(markup, /media cache/);
});
