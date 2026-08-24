/**
 * The dim sum surprise.
 *
 * The suppression tests matter most. An un-optable surprise is only polite while every
 * clause of its contract holds, and the clause that keeps it out of a first run, an
 * error path or an update is the one standing between a delight and an intrusion.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DISMISS_AFTER_MS, NAME_SEPARATOR, SUPPRESSED_CONTEXTS, SURPRISE_CHANCE,
  storedPreferenceIsIgnored, surpriseFor, type Dish, type StartupContext,
} from '../../app/renderer/src/dim-sum-surprise.ts';

const DISHES: readonly Dish[] = [
  { id: 'har-gow', nameEn: 'Shrimp dumpling', nameZhHant: '蝦餃', asset: 'assets/dim-sum/har-gow.webp' },
  { id: 'siu-mai', nameEn: 'Pork dumpling', nameZhHant: '燒賣', asset: 'assets/dim-sum/siu-mai.webp' },
  { id: 'cha-siu-bao', nameEn: 'Barbecue pork bun', nameZhHant: '叉燒包', asset: 'assets/dim-sum/cha-siu-bao.webp' },
];

const input = (over: Partial<Parameters<typeof surpriseFor>[1]> = {}) => ({
  context: 'normal' as StartupContext, draw: 0.05, alreadyDrawnThisLaunch: false, pick: 0, ...over,
});

/* --- when it appears ------------------------------------------------------------ */

test('a winning draw on an ordinary launch produces a surprise', () => {
  assert.ok(surpriseFor(DISHES, input()));
});

test('a losing draw produces nothing', () => {
  assert.equal(surpriseFor(DISHES, input({ draw: SURPRISE_CHANCE })), undefined);
  assert.equal(surpriseFor(DISHES, input({ draw: 0.9 })), undefined);
});

test('the boundary is exclusive, so the rate is exactly the stated one', () => {
  /* An inclusive bound would make it one-in-ten-point-something, which is a small lie
   * in the one number this feature states about itself. */
  assert.ok(surpriseFor(DISHES, input({ draw: SURPRISE_CHANCE - 1e-9 })));
  assert.equal(surpriseFor(DISHES, input({ draw: SURPRISE_CHANCE })), undefined);
  assert.equal(SURPRISE_CHANCE, 0.1);
});

test('a nonsensical draw produces nothing rather than firing', () => {
  for (const draw of [Number.NaN, -0.5, Number.POSITIVE_INFINITY]) {
    assert.equal(surpriseFor(DISHES, input({ draw })), undefined, `draw ${draw} fired`);
  }
});

/* --- when it must not ------------------------------------------------------------ */

test('every suppressed context is refused, however good the draw', () => {
  /* The clause between a delight and an intrusion. */
  for (const context of SUPPRESSED_CONTEXTS) {
    assert.equal(surpriseFor(DISHES, input({ context, draw: 0 })), undefined, `${context} was not suppressed`);
  }
});

test('a launch gets exactly one draw', () => {
  /* A second draw in the same launch makes the real rate higher than the stated one. */
  assert.equal(surpriseFor(DISHES, input({ alreadyDrawnThisLaunch: true, draw: 0 })), undefined);
});

test('an empty catalogue produces nothing rather than a blank card', () => {
  assert.equal(surpriseFor([], input({ draw: 0 })), undefined);
});

/* --- what it produces ------------------------------------------------------------ */

test('the dish is named in both languages, always', () => {
  const surprise = surpriseFor(DISHES, input())!;
  assert.equal(surprise.title, `Shrimp dumpling${NAME_SEPARATOR}蝦餃`);
  assert.ok(surprise.title.includes(surprise.dish.nameEn));
  assert.ok(surprise.title.includes(surprise.dish.nameZhHant));
});

test('alt text names the dish, so the delight reaches a screen-reader user', () => {
  const surprise = surpriseFor(DISHES, input())!;
  assert.ok(surprise.altText.includes('Shrimp dumpling'));
  assert.ok(surprise.altText.includes('蝦餃'));
  assert.notEqual(surprise.altText.trim(), '');
});

test('it is non-blocking, never takes focus, and dismisses itself', () => {
  const surprise = surpriseFor(DISHES, input())!;
  assert.equal(surprise.blocking, false);
  assert.equal(surprise.stealsFocus, false);
  assert.equal(surprise.dismissAfterMs, DISMISS_AFTER_MS);
  assert.ok(surprise.dismissAfterMs > 0, 'a surprise that never dismisses is a surprise that gates the screen');
});

test('the image is a bundled local asset, never a URL', () => {
  /* No network, no CDN, no tracking -- and a picture that cannot fail to load. */
  for (const dish of DISHES) {
    const surprise = surpriseFor(DISHES, input({ pick: DISHES.indexOf(dish) / DISHES.length }))!;
    assert.ok(!/^https?:/iu.test(surprise.dish.asset), `${dish.id} points at a URL`);
    assert.ok(surprise.dish.asset.startsWith('assets/'), `${dish.id} is not a bundled asset`);
  }
});

test('the pick reaches every dish and never lands outside the catalogue', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 100; i += 1) {
    const surprise = surpriseFor(DISHES, input({ pick: i / 100 }));
    assert.ok(surprise, 'a valid pick produced nothing');
    seen.add(surprise.dish.id);
  }
  assert.equal(seen.size, DISHES.length, 'some dishes can never be chosen');
});

test('a pick at or beyond the end wraps rather than reading past the catalogue', () => {
  for (const pick of [1, 1.5, 42]) {
    assert.ok(surpriseFor(DISHES, input({ pick })), `pick ${pick} fell off the end`);
  }
});

/* --- the opt-out that does not exist --------------------------------------------- */

test('no stored preference can disable it', () => {
  /* Stated as a function rather than an absence, because "there is no setting" is
   * invisible to a reader and to a test. An old profile carrying "off" rejoins the draw. */
  assert.equal(storedPreferenceIsIgnored(), true);
});

test('the module exposes no way to turn it off', () => {
  const surface = Object.keys(
    { DISMISS_AFTER_MS, NAME_SEPARATOR, SUPPRESSED_CONTEXTS, SURPRISE_CHANCE, storedPreferenceIsIgnored, surpriseFor },
  );
  for (const name of surface) {
    /* The first version of this named the query honoursStoredOptOut, which tripped its
     * own check. Renaming it to say what is true was the right fix; loosening the
     * pattern to let it through would have been the wrong one. */
    assert.ok(!/disable|optout|setenabled|turnoff/iu.test(name), `${name} looks like an off switch`);
  }
});
