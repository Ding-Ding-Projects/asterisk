/**
 * features.conf editing: the in-call feature map and the transfer codes around it.
 *
 * Covers CORE-FCODE-008 through -016. Every key asserted here appears in Asterisk's own
 * configs/samples/features.conf.sample; `automon` deliberately does not, which is why
 * one-touch recording writes `automixmon` instead and why that has its own test.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyControlValues, controlValuesFor, featuresDocument,
  FEATURE_CONTROLS, FEATUREMAP_KEYS, GENERAL_TEXT_KEYS, GENERAL_NUMBER_KEYS,
} from '../../app/renderer/src/feature-codes.ts';
import { parseFeatures } from '../../control-plane/subsystem-models.ts';
import type { ConfigValue } from '../../app/renderer/src/configuration.ts';

/** A features.conf with one existing map entry and one existing general key. */
const existing = (): ConfigValue => [
  { name: 'general', entries: [{ key: 'pickupexten', value: '*8' }] },
  { name: 'featuremap', entries: [{ key: 'blindxfer', value: '#' }] },
] as unknown as ConfigValue;

const empty = (): ConfigValue => [] as unknown as ConfigValue;

const roundTrip = (value: ConfigValue, values: Record<string, unknown>) => {
  const edit = applyControlValues(value, values);
  return parseFeatures(featuresDocument(edit, '/etc/asterisk/features.conf').value);
};

test('the screen seeds from what the file actually holds', () => {
  const values = controlValuesFor(existing());
  assert.equal(values[FEATURE_CONTROLS.blindxfer], '#');
  assert.equal(values[FEATURE_CONTROLS.pickupexten], '*8');
});

test('a code the file never set is left out rather than given a value', () => {
  /* A feature code shown as configured when it is not is a code somebody will tell
   * their users to dial. */
  const values = controlValuesFor(empty());
  for (const id of Object.keys(FEATUREMAP_KEYS)) assert.ok(!(id in values), `${id} was invented`);
  for (const id of Object.keys(GENERAL_TEXT_KEYS)) assert.ok(!(id in values), `${id} was invented`);
});

test('every featuremap control writes its own [featuremap] line', () => {
  for (const [id, name] of Object.entries(FEATUREMAP_KEYS)) {
    const view = roundTrip(empty(), { [id]: '*99' });
    const entry = view.featuremap.find((e) => e.name === name);
    assert.ok(entry, `${name} was not written`);
    assert.equal(entry.sequence, '*99');
  }
});

test('every general control writes its own [general] key', () => {
  for (const [id, key] of Object.entries(GENERAL_TEXT_KEYS)) {
    assert.equal(roundTrip(empty(), { [id]: '*77' }).general[key], '*77', `${key} was not written`);
  }
  for (const [id, key] of Object.entries(GENERAL_NUMBER_KEYS)) {
    assert.equal(roundTrip(empty(), { [id]: 42 }).general[key], '42', `${key} was not written`);
  }
});

test('the attended-transfer codes are four independent keys', () => {
  /* CORE-FCODE-011..014. Abort, complete, three-way and swap are separate settings and
   * a site may renumber any one of them; writing them together would be wrong. */
  const view = roundTrip(empty(), {
    [FEATURE_CONTROLS.atxferabort]: '*1', [FEATURE_CONTROLS.atxfercomplete]: '*2',
    [FEATURE_CONTROLS.atxferthreeway]: '*3', [FEATURE_CONTROLS.atxferswap]: '*4',
  });
  assert.equal(view.general.atxferabort, '*1');
  assert.equal(view.general.atxfercomplete, '*2');
  assert.equal(view.general.atxferthreeway, '*3');
  assert.equal(view.general.atxferswap, '*4');
});

test('one-touch recording writes automixmon, because automon is not in this sample', () => {
  /* A real divergence from FreePBX rather than an oversight. `automon` would produce a
   * line the build ignores, which reads exactly like a working setting doing nothing. */
  const view = roundTrip(empty(), { [FEATURE_CONTROLS.automixmon]: '*3' });
  assert.ok(view.featuremap.some((e) => e.name === 'automixmon'));
  assert.ok(!view.featuremap.some((e) => e.name === 'automon'), 'a key this Asterisk ignores was written');
});

test('editing an existing map entry keeps its place in the file', () => {
  /* Rewriting the section wholesale would reorder a file somebody arranged deliberately. */
  const value = [
    { name: 'featuremap', entries: [
      { key: 'blindxfer', value: '#' }, { key: 'atxfer', value: '*2' }, { key: 'parkcall', value: '#72' },
    ] },
  ] as unknown as ConfigValue;
  const view = roundTrip(value, { [FEATURE_CONTROLS.atxfer]: '*9' });
  assert.deepEqual(view.featuremap.map((e) => e.name), ['blindxfer', 'atxfer', 'parkcall']);
  assert.equal(view.featuremap[1].sequence, '*9');
});

test('a control nobody touched changes nothing', () => {
  const edit = applyControlValues(existing(), {});
  assert.deepEqual(edit.summary, []);
  assert.deepEqual(edit.view.featuremap, [{ name: 'blindxfer', sequence: '#' }]);
  assert.equal(edit.view.general.pickupexten, '*8');
});

test('an empty text control writes nothing rather than clearing the code', () => {
  /* An untouched optional text control cannot be told apart from a deliberately cleared
   * one, and silently un-configuring a transfer code is the worse guess. */
  const edit = applyControlValues(existing(), {
    [FEATURE_CONTROLS.blindxfer]: '', [FEATURE_CONTROLS.pickupexten]: '',
  });
  assert.deepEqual(edit.summary, []);
  assert.equal(edit.view.featuremap[0].sequence, '#');
  assert.equal(edit.view.general.pickupexten, '*8');
});

test('saving an unchanged value produces no summary line', () => {
  const edit = applyControlValues(existing(), {
    [FEATURE_CONTROLS.blindxfer]: '#', [FEATURE_CONTROLS.pickupexten]: '*8',
  });
  assert.deepEqual(edit.summary, []);
});

test('each change names the section, the key, the before and the after', () => {
  const edit = applyControlValues(existing(), { [FEATURE_CONTROLS.blindxfer]: '##' });
  assert.equal(edit.summary.length, 1);
  assert.match(edit.summary[0], /featuremap/u);
  assert.match(edit.summary[0], /blindxfer/u);
  assert.match(edit.summary[0], /# to ##/u);
});

test('a newly added code says it was unset before, not that it changed', () => {
  const edit = applyControlValues(empty(), { [FEATURE_CONTROLS.atxfer]: '*2' });
  assert.match(edit.summary[0], /unset to \*2/u);
});

test('atxferdropcall reaches the file as the yes or no Asterisk writes', () => {
  assert.equal(roundTrip(empty(), { [FEATURE_CONTROLS.atxferdropcall]: true }).general.atxferdropcall, 'yes');
  assert.equal(roundTrip(empty(), { [FEATURE_CONTROLS.atxferdropcall]: false }).general.atxferdropcall, 'no');
});

test('a timeout seeds back as a number, not the string the file holds', () => {
  const view = roundTrip(empty(), { [FEATURE_CONTROLS.featuredigittimeout]: 1500 });
  const seeded = controlValuesFor(featuresDocument({ view, summary: [] }, 'x').value);
  assert.equal(seeded[FEATURE_CONTROLS.featuredigittimeout], 1500);
  assert.equal(typeof seeded[FEATURE_CONTROLS.featuredigittimeout], 'number');
});

test('everything set at once survives the round trip to a file and back', () => {
  const all: Record<string, unknown> = { [FEATURE_CONTROLS.atxferdropcall]: true };
  for (const id of Object.keys(FEATUREMAP_KEYS)) all[id] = '*11';
  for (const id of Object.keys(GENERAL_TEXT_KEYS)) all[id] = '*22';
  for (const id of Object.keys(GENERAL_NUMBER_KEYS)) all[id] = 33;
  const edit = applyControlValues(empty(), all);
  const seeded = controlValuesFor(featuresDocument(edit, '/etc/asterisk/features.conf').value);
  for (const id of Object.keys(FEATUREMAP_KEYS)) assert.equal(seeded[id], '*11', `${id} was lost`);
  for (const id of Object.keys(GENERAL_TEXT_KEYS)) assert.equal(seeded[id], '*22', `${id} was lost`);
  for (const id of Object.keys(GENERAL_NUMBER_KEYS)) assert.equal(seeded[id], 33, `${id} was lost`);
  assert.equal(seeded[FEATURE_CONTROLS.atxferdropcall], true);
});

test('unrelated sections of the file are carried through untouched', () => {
  /* features.conf also holds [applicationmap] and parking contexts this editor does not
   * manage; losing them on save would be a silent, destructive edit. */
  const value = [
    { name: 'general', entries: [{ key: 'pickupexten', value: '*8' }] },
    { name: 'applicationmap', entries: [{ key: 'mytest', value: '*9,self/callee,Playback(hello)' }] },
  ] as unknown as ConfigValue;
  const written = featuresDocument(applyControlValues(value, { [FEATURE_CONTROLS.atxfer]: '*2' }), 'x').value;
  const kept = (written as unknown as { name: string }[]).find((s) => s.name === 'applicationmap');
  assert.ok(kept, 'an unmanaged section was dropped on save');
});
