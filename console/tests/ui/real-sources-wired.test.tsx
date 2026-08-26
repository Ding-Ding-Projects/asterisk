import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

(globalThis as { window?: unknown }).window ??= globalThis as unknown;
(globalThis as { crypto?: unknown }).crypto ??= { randomUUID: () => 'test-uuid' };

import { App } from '../../app/renderer/src/App';
import { SCREENS } from '../../app/renderer/src/generated/console';
import { AGENT_RAIL_SOURCES, BUNDLED_RELEASE_LIMIT } from '../../app/renderer/src/agent-rail';
import { MAX_LISTED_AUTHS, NO_PARTNER_CHANNEL } from '../../app/renderer/src/trunk-auth';
import { parseChangelog } from '../../app/renderer/src/changelog';
import { CHANGELOG_MARKDOWN } from '../../app/renderer/src/generated/changelog-bundle';
import type { PjsipAuth, Registration, ViewReadings } from '../../app/renderer/src/readings';

/**
 * The three surfaces the design filled with invented content and this console emptied:
 * History, the agent rail, and Trunk authentication.
 *
 * Every one of these assertions reads the markup the real `App` produces. A unit test of
 * the modules underneath passes whether or not any of them is ever called from a screen,
 * which is the failure this repository keeps repeating -- a reading taken and dropped on
 * the way to the surface produces no error and no failing test.
 */

const strip = (markup: string) => markup
  .replace(/<[^>]*>/g, ' ')
  .replace(/&#x27;/gu, "'")
  .replace(/&amp;/gu, '&')
  .replace(/&quot;/gu, '"')
  .replace(/&#x2014;/gu, '—')
  .replace(/&#x2019;/gu, '’')
  .replace(/\s+/gu, ' ');

const available = <T,>(command: string, value: T) =>
  ({ command, result: { state: 'available' as const, observedAt: '2026-01-01T00:00:00.000Z', value } });
const unavailable = (command: string, reason: string) =>
  ({ command, result: { state: 'unavailable' as const, observedAt: '2026-01-01T00:00:00.000Z', reason } });

type Pinnable = {
  state: Record<string, unknown>;
  readings: Record<string, ViewReadings | undefined>;
  target: { id: string; label: string; detail: string; connected: boolean };
};

/** Renders the real `App` pinned to one screen. `connected` and `readings` default to the
 *  first-run state a person meets before anything has been discovered. */
function render(screen: string, options: { connected?: boolean; readings?: ViewReadings } = {}): string {
  const rail = (SCREENS as Record<string, { rail: string }>)[screen].rail;
  class Pinned extends (App as unknown as new (props: unknown) => Pinnable & { componentDidMount?(): void }) {
    constructor(props: unknown) {
      super(props);
      this.state = { ...this.state, screen, railId: rail, onboardOpen: false };
      if (options.connected) {
        this.target = { id: 'Ubuntu-22.04', label: 'Ubuntu-22.04', detail: 'connection verified', connected: true };
      }
      if (options.readings) this.readings[screen] = options.readings;
    }
    componentDidMount() {
      // No discovery and no async control-plane calls during a static render.
    }
  }
  return strip(renderToStaticMarkup(createElement(Pinned as never)));
}

// ------------------------------------------------------------------ the agent rail

/** The rail's real membership, read out of the compiled design rather than restated. */
const AGENT_SCREENS = Object.entries(SCREENS as Record<string, { rail: string }>)
  .filter(([, screen]) => screen.rail === 'agent')
  .map(([id]) => id)
  .sort();

test('the agent rail has destinations, so nothing below is vacuous', () => {
  assert.ok(AGENT_SCREENS.length >= 7, `only ${AGENT_SCREENS.length} agent destinations were found`);
});

test('the hand-written source record covers exactly the agent rail, no more and no less', () => {
  /* Hand-written rather than derived, so this is the assertion that catches an eighth
   * agent destination arriving with no entry -- which would silently fall through to the
   * PBX branch and tell its reader "No target is connected" again. */
  assert.deepEqual(Object.keys(AGENT_RAIL_SOURCES).sort(), AGENT_SCREENS);
});

test('no agent-rail screen blames a missing PBX target for being empty', () => {
  for (const screen of AGENT_SCREENS) {
    const text = render(screen);
    assert.ok(
      !text.includes('No target is connected'),
      `${screen}: still reports "No target is connected", which implies discovering a phone system would fill it in`,
    );
  }
});

test('every agent-rail screen with no store says which store it has not got', () => {
  for (const screen of AGENT_SCREENS) {
    const source = AGENT_RAIL_SOURCES[screen];
    if (source.kind !== 'no-store') continue;
    const text = render(screen);
    /* Compared against the first clause of the recorded reason rather than the whole
     * sentence: the funny-level and language layers restyle the copy around it, and this
     * is asserting that this screen's own reason reached this screen, not that it survived
     * verbatim. */
    const opening = source.reason.split('.')[0];
    assert.ok(opening.length > 20, `${screen}: its recorded reason has no substantial first sentence`);
    assert.ok(text.includes(opening), `${screen}: the screen does not carry its own recorded reason (${opening})`);
  }
});

test('Operations & releases renders this build’s real bundled release history', () => {
  const bundled = parseChangelog(CHANGELOG_MARKDOWN);
  assert.ok(bundled.length > 0, 'sanity: the bundled changelog must carry at least one release for this to test anything');
  const text = render('ops');
  for (const entry of bundled.slice(0, 3)) {
    assert.ok(text.includes(entry.version), `ops: version ${entry.version} is in the bundle but not on the screen`);
    assert.ok(text.includes(entry.date), `ops: date ${entry.date} is in the bundle but not on the screen`);
  }
  assert.ok(
    text.includes('read from this build’s own bundled tag history'),
    'ops: the screen does not say where its rows came from',
  );
});

test('Operations & releases never claims a release was published, because nothing checked', () => {
  const text = render('ops');
  assert.ok(
    text.includes('a tag is not a release'),
    'ops: the screen must say why State is empty rather than filling it with "Published"',
  );
  assert.ok(!/\bPublished\s+\d/u.test(text), 'ops: a row appears to assert a publication state');
});

test('the release limit the screen quotes is the one the bundler actually applies', () => {
  /* `BUNDLED_RELEASE_LIMIT` is a hand-copied constant, and a hand-copied constant that has
   * drifted from its source is worse than none: the screen would state a bound nobody is
   * enforcing, and a reader would trust it. */
  const script = readFileSync(new URL('../../scripts/bundle-changelog.mjs', import.meta.url), 'utf8');
  const declared = /const\s+MAX_VERSIONS\s*=\s*(\d+)\s*;/u.exec(script);
  assert.ok(declared, 'bundle-changelog.mjs no longer declares MAX_VERSIONS, so the screen is quoting a bound that has moved');
  assert.equal(BUNDLED_RELEASE_LIMIT, Number.parseInt(declared[1], 10));
});

test('the vocabulary screen keeps private terms off a table that can be exported', () => {
  /* The dictionary is a real local store and is deliberately not tabulated: every table in
   * this console can be selected, copied and exported to a file, and a private vocabulary
   * term must never reach an export or the clipboard. The screen says so instead. */
  assert.equal(AGENT_RAIL_SOURCES.vocab.kind, 'withheld');
  const text = render('vocab');
  assert.ok(text.includes('No dictionary is loaded'), 'vocab: the screen does not report the real loaded state');
  assert.ok(
    text.includes('must never reach an export or the clipboard'),
    'vocab: the screen does not say why the terms are not listed',
  );
});

// --------------------------------------------------------- trunk authentication

const AUTHS: PjsipAuth[] = [
  { id: 'carrier-primary-auth', username: 'hq-outbound' },
  { id: 'half-built', username: '' },
];
const REGISTRATIONS: Registration[] = [{ id: 'carrier-primary', serverUri: 'sip:carrier.example', status: 'Registered' }];

test('the trunk-authentication screen reports the target’s real authentication objects', () => {
  const text = render('trunkauth', {
    connected: true,
    readings: {
      auths: available('pjsip show auths', AUTHS),
      registrations: available('pjsip show registrations', REGISTRATIONS),
    },
  });
  assert.ok(text.includes('carrier-primary-auth (username hq-outbound)'), 'the auth object and its username are not on screen');
  assert.ok(text.includes('half-built (no username set)'), 'an auth object with no username= is not reported as such');
  assert.ok(text.includes('2 PJSIP authentication objects'), 'the count read from the target is not on screen');
  assert.ok(text.includes('1 outbound registration.'), 'the registration count read alongside it is not on screen');
});

test('a target with no authentication object says so rather than saying nothing', () => {
  const text = render('trunkauth', {
    connected: true,
    readings: { auths: available('pjsip show auths', []), registrations: available('pjsip show registrations', []) },
  });
  assert.ok(text.includes('no PJSIP authentication object on this target'), 'an empty reading is not reported');
});

test('a failed auth read carries the target’s own reason to the screen', () => {
  const text = render('trunkauth', {
    connected: true,
    readings: {
      auths: unavailable('pjsip show auths', 'No such command ‘pjsip show auths’'),
      registrations: available('pjsip show registrations', REGISTRATIONS),
    },
  });
  assert.ok(text.includes('could not be read'), 'a failed reading is not reported as one');
  assert.ok(text.includes('No such command'), 'the target’s own reason did not reach the screen');
});

test('the empty request inbox is explained by the missing channel, not by a missing target', () => {
  /* Both states must say it: connecting a phone system adds no partner request, so "No
   * target is connected" alone would name a cause that is not the cause. */
  const opening = NO_PARTNER_CHANNEL.split('—')[0].trim();
  const disconnected = render('trunkauth');
  assert.ok(disconnected.includes(opening), 'the disconnected screen does not say why the inbox is empty');
  const connected = render('trunkauth', {
    connected: true,
    readings: { auths: available('pjsip show auths', AUTHS), registrations: available('pjsip show registrations', []) },
  });
  assert.ok(connected.includes(opening), 'the connected screen does not say why the inbox is empty');
});

test('a target with more auth objects than the sentence lists says how many it left out', () => {
  /* The bound is asserted before it is used. Sizing the fixture from `MAX_LISTED_AUTHS`
   * alone would make this test agree with any value at all -- raise the bound to a
   * thousand and a thousand-and-three fixtures still leave exactly three over -- which is
   * precisely the vacuous shape a planted break caught here. A sentence a person reads has
   * to stop enumerating at a length a person can read. */
  assert.ok(MAX_LISTED_AUTHS >= 3 && MAX_LISTED_AUTHS <= 12,
    `MAX_LISTED_AUTHS is ${MAX_LISTED_AUTHS}; a sentence that lists that many names is not a sentence`);

  const TOTAL = 15;
  const many = Array.from({ length: TOTAL }, (_, index) => ({ id: `auth-${index}`, username: `u${index}` }));
  const text = render('trunkauth', {
    connected: true,
    readings: {
      auths: available('pjsip show auths', many),
      registrations: available('pjsip show registrations', []),
    },
  });
  assert.ok(text.includes(`${TOTAL} PJSIP authentication objects`), 'the full count is not reported');
  assert.ok(text.includes('auth-0 (username u0)'), 'the first listed object is missing');
  assert.ok(text.includes(`, and ${TOTAL - MAX_LISTED_AUTHS} more.`), 'the objects past the listing bound are not accounted for');
  assert.ok(!text.includes('auth-14 '), 'the last object was listed, so the sentence is not bounded at all');
});

test('no auth reading is ever rendered under the answer-history heading', () => {
  /* The design's "Answer history" grid claims a partner asked and this console answered.
   * An auth object is neither, so it must not be rendered there -- putting real-looking
   * content under a label it does not belong to is exactly the defect the sample rows
   * this project removed already were. */
  const source = readFileSync(new URL('../../app/renderer/src/App.tsx', import.meta.url), 'utf8').replace(/\r/gu, '');
  assert.ok(
    /^\s*\.\.\.\(screen === 'trunkauth' \? \{ authRequests: \[\], authHistory: \[\] \} : \{\}\),$/mu.test(source),
    'the trunk-authentication request and answer lists are no longer both pinned empty',
  );
});

// ------------------------------------------------------------------------ history

test('the History screen is wired to the console’s own local history store', () => {
  /* Anchored to whole lines: a substring needle for `local-history.list` is satisfied by a
   * commented-out call, and by a renamed one that still contains the old text. */
  const source = readFileSync(new URL('../../app/renderer/src/App.tsx', import.meta.url), 'utf8').replace(/\r/gu, '');
  assert.ok(
    /^\s*const response = await this\.request\('local-history\.list', \{\}\);$/mu.test(source),
    'refresh() no longer reads the local history store for the History screen',
  );
  assert.ok(
    /^\s*\.\.\.\(screen === 'history' \? this\.historyVals\(\) : \{\}\),$/mu.test(source),
    'the History screen no longer renders from the local history reading',
  );
});

test('the History screen distinguishes "not read yet" from "read and empty"', () => {
  /* Two different facts with two different sentences: before the first read the console
   * has no wired path to report on, and after it the store is genuinely empty. Conflating
   * them would make a real reading indistinguishable from never having taken one. */
  const beforeRead = render('history');
  assert.ok(beforeRead.includes('No configuration change has been written this session'),
    'the pre-read reason is not on screen');
  assert.ok(!beforeRead.includes('was just read and is genuinely empty'),
    'the post-read reason is shown before any read has happened');
});
