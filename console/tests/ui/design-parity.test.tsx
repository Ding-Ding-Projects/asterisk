import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

import ConsoleShell, { RAIL, SCREENS, ORDER, ONBOARD, TOUR, GAMES, NODES, EDGES } from '../../app/renderer/src/generated/console';
import { destinations, rails } from '../../app/renderer/src/catalog';

/** Renders one destination of the compiled design reference to static markup. */
function renderDestination(id: string, overrides: Record<string, unknown> = {}): string {
  class Pinned extends (ConsoleShell as unknown as new (props: unknown) => { state: Record<string, unknown> }) {
    constructor(props: unknown) {
      super(props);
      this.state = {
        ...this.state,
        screen: id,
        railId: (SCREENS as Record<string, { rail: string }>)[id].rail,
        onboardOpen: false,
        ...overrides,
      };
    }
  }
  return renderToStaticMarkup(createElement(Pinned as never));
}

const strip = (markup: string) => markup.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ');

/* 37 rather than 34: Feature codes and IAX peers landed on the pbx rail (8 to 10),
 * and the HTTP server destination on the sys rail (4 to 5). The count is pinned deliberately: it is what noticed the addition.
 * 38 rather than 37: the Sound prompts screen landed on the media rail (4 to 5) --
 * `/var/lib/asterisk/sounds`, the one place every "custom" prompt picker on this console
 * points at, finally has a screen that can put a real file there.
 * 39 rather than 38: the Fax screen landed on the media rail (5 to 6) -- res_fax.conf's
 * engine settings and udptl.conf's transport settings, the two files the roadmap's own
 * "sending, receiving, T.38 gateway" line names, finally have a screen and real bindings.
 * 40 rather than 39: the Database backends destination landed on the sys rail (5 to 6) --
 * res_odbc.conf, extconfig.conf, sorcery.conf and res_pgsql.conf finally have a screen,
 * where before none of the four had ever been read or written by this console. Both
 * screens forked from the same 38-destination tip and each counted its own one-screen
 * jump independently (each calling itself "39 rather than 38"); rebasing one onto the
 * other's tip is what stacks the two arrivals to 40 instead of colliding at 39. */
test('the design reference supplies every rail and destination', () => {
  assert.equal(ORDER.length, 40);
  assert.equal(destinations.length, 40);
  assert.deepEqual(rails.map((rail) => rail.id), ['pbx', 'media', 'data', 'sys', 'agent', 'app']);
  assert.deepEqual(
    rails.map((rail) => destinations.filter((destination) => destination.rail === rail.id).length),
    [10, 6, 2, 6, 7, 9],
  );
  assert.equal(RAIL.length, 6);
  assert.equal(Object.keys(SCREENS).length, 40);
});

test('the design audit baseline counts survive compilation', () => {
  assert.equal(ONBOARD.length, 5);
  assert.equal(TOUR.length, 5);
  assert.equal(GAMES.length, 8);
  assert.equal(NODES.length, 6);
  assert.equal(EDGES.length, 5);
});

test('every destination renders its own design title and description', () => {
  for (const destination of destinations) {
    const text = strip(renderDestination(destination.id));
    assert.ok(text.includes(destination.title), `${destination.id}: missing title ${destination.title}`);
    assert.ok(
      text.includes(destination.description.slice(0, 48)),
      `${destination.id}: missing the design's own description`,
    );
  }
});

test('Expert mode reveals the owning configuration file the design assigns each destination', () => {
  for (const destination of destinations) {
    const text = strip(renderDestination(destination.id, { mode: 'Expert' }));
    assert.ok(text.includes(destination.source), `${destination.id}: missing source ${destination.source}`);
  }
});

test('every destination renders the design navigation shell around itself', () => {
  for (const destination of destinations) {
    const text = strip(renderDestination(destination.id));
    for (const rail of rails) assert.ok(text.includes(rail.label), `${destination.id}: rail ${rail.label} missing`);
    assert.ok(text.includes('Guided wizard'), `${destination.id}: wizard action missing`);
    assert.ok(text.includes('Explain'), `${destination.id}: explain action missing`);
  }
});

test('control groups render through the design M3 control, not a substitute', () => {
  const markup = renderDestination('endpoints', { mode: 'Expert' });
  const text = strip(markup);
  for (const label of ['Transport', 'Dialplan context', 'direct_media', 'max_contacts', 'qualify_frequency', 'Allowed codecs']) {
    assert.ok(text.includes(label), `endpoints: control ${label} missing`);
  }
  // Slider, stepper and order controls each have their own affordance in the design control.
  assert.ok(markup.includes('type="range"'), 'slider control did not render');
  assert.ok(/inputmode="numeric"/i.test(markup), 'stepper control did not render');
  assert.ok(markup.includes('draggable="true"'), 'order control did not render');
});

test('Beginner mode replaces raw configuration keys with the design plain wording', () => {
  const beginner = strip(renderDestination('endpoints'));
  assert.ok(
    beginner.includes('Let phones send audio straight to each other'),
    'endpoints: Beginner mode did not use the design plain wording',
  );
  assert.equal(beginner.includes('direct_media'), false, 'endpoints: Beginner mode leaked a raw configuration key');
});

test('each transient-state family opens its own design surface', () => {
  const surfaces: Array<[string, Record<string, unknown>, string]> = [
    ['onboarding', { onboardOpen: true }, 'Super easy mode'],
    ['tour', { tourOpen: true }, 'End tour'],
    ['palette', { paletteOpen: true }, 'Jump to any screen, setting, or command'],
    ['regex builder', { regexOpen: true }, 'Regex builder'],
    ['context menu', { ctxOpen: true }, ''],
    ['lock', { lockOpen: true }, 'Lock this element'],
    ['unlock', { unlockOpen: true }, ''],
    ['appearance', { appearOpen: true }, ''],
    ['wizard', { wizardOpen: true }, 'Guided wizard'],
    ['ceremony', { ceremonyOpen: true }, 'Turn the operator key'],
    ['are-you-sure', { sureOpen: true }, ''],
    ['info', { infoOpen: true, infoTitle: 'Explain', infoBody: 'body' }, 'Pretend you arrived yesterday'],
    ['rename', { renameOpen: true }, ''],
    ['tab colour', { tabColourOpen: true }, ''],
    ['tab filter', { tabFilterOpen: true }, ''],
    ['toast', { toastOpen: true, toastText: 'Change applied' }, 'Undo'],
    ['celebration', { celebrate: true, celebrateTitle: 'Nice', celebrateSub: 'done' }, 'Nice'],
  ];
  assert.equal(surfaces.length, 17, 'the design declares 17 transient-state families');
  for (const [name, state, marker] of surfaces) {
    const text = strip(renderDestination('dash', state));
    if (marker) assert.ok(text.includes(marker), `${name}: overlay did not render (${marker})`);
  }
});

test('the compiled renderer fetches nothing at runtime', () => {
  const markup = renderDestination('about');
  assert.equal(/https?:\/\//.test(markup), false, 'the rendered tree contains an absolute URL');
});
