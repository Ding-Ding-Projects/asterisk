/**
 * Contract: attention-modes. Real and wired, off by default. `site/app.js`
 * declares a real `attention` object in `DEFAULTS` with every named mode
 * (reduceFlashing, simplifiedLanguage, extendedTimeouts, focus,
 * timeAwareness, oneThing, momentum) starting `false`, wires each one to a
 * real settings checkbox in `initSettings()`, persists through `updateAttention`,
 * and applies real behaviour: `document.body.classList.toggle('reduce-flashing', ...)`
 * / `'extended-timeouts'` / `'attn-focus'`, a longer toast timeout when
 * `extendedTimeouts` is on, a one-thing banner (`updateOneThingBanner`), and a
 * momentum/idle timer (`initMomentum`/`checkMomentum`/`updateSessionTimer`).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for attention-modes', () => {
  assert.ok(registry.features['attention-modes'], 'no attention-modes row in site/feature-registry.json');
});

test('every named attention mode exists in DEFAULTS and starts false -- off by default', () => {
  const defaults = app.match(/attention:\{([^}]*)\}/u);
  assert.ok(defaults, 'expected to find the attention block inside DEFAULTS');
  for (const mode of ['reduceFlashing', 'simplifiedLanguage', 'extendedTimeouts', 'focus', 'timeAwareness', 'oneThing', 'momentum']) {
    assert.match(defaults[1], new RegExp(`${mode}:false`, 'u'), `${mode} no longer defaults to false in DEFAULTS.attention`);
  }
});

test('every mode is wired to a real settings checkbox through updateAttention', () => {
  for (const [id, key] of [
    ['attention-reduce-flashing', 'reduceFlashing'],
    ['attention-simplified-language', 'simplifiedLanguage'],
    ['attention-extended-timeouts', 'extendedTimeouts'],
    ['attention-focus', 'focus'],
    ['attention-time-awareness', 'timeAwareness'],
    ['attention-one-thing', 'oneThing'],
    ['attention-momentum', 'momentum'],
  ]) {
    assert.match(app, new RegExp(`updateAttention\\('${key}',event\\.target\\.checked\\)`, 'u'),
      `${id} no longer wires updateAttention('${key}', ...)`);
  }
});

test('reduce-flashing, extended-timeouts, and attn-focus are real applied body classes, not just stored values', () => {
  assert.match(app, /document\.body\.classList\.toggle\('reduce-flashing',state\.attention\.reduceFlashing\)/u,
    'reduce-flashing is no longer applied as a body class');
  assert.match(app, /document\.body\.classList\.toggle\('extended-timeouts',state\.attention\.extendedTimeouts\)/u,
    'extended-timeouts is no longer applied as a body class');
  assert.match(app, /document\.body\.classList\.toggle\('attn-focus',state\.attention\.focus\)/u,
    'attn-focus is no longer applied as a body class');
});

test('extendedTimeouts genuinely changes a real toast duration, not merely a stored preference', () => {
  assert.match(app, /state\.attention\.extendedTimeouts\?15000:5000/u,
    'the toast timeout no longer branches on extendedTimeouts');
});

test('a one-thing banner and a momentum/idle timer are real functions, called from init()', () => {
  assert.match(app, /function updateOneThingBanner\(\)/u, 'updateOneThingBanner no longer exists');
  assert.match(app, /function initMomentum\(\)/u, 'initMomentum no longer exists');
  assert.match(app, /initTimeAwareness\(\);initMomentum\(\);/u, 'init() no longer calls initTimeAwareness()/initMomentum()');
});

test('the registry records attention-modes as implemented', () => {
  assert.equal(registry.features['attention-modes'].status, 'implemented-unverified',
    'real ADHD/attention accommodations, wired and off by default, should read as implemented');
});
