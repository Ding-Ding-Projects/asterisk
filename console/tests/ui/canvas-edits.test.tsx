import assert from 'node:assert/strict';
import test from 'node:test';

import { applyCanvasEdits, describeEdits, parseStepText, projectEdits, stepText } from '../../app/renderer/src/canvas-edits';
import type { ConfigValue } from '../../app/renderer/src/configuration';
import type { DialplanGraph } from '../../app/renderer/src/canvas';

const file: ConfigValue = [
  { name: 'general', entries: [{ key: 'static', value: 'yes' }] },
  {
    name: 'from-internal',
    entries: [
      { key: 'include', value: 'onboard-menu' },
      { key: 'exten', value: '100,1,Answer()' },
      { key: 'same', value: 'n,Dial(PJSIP/100,20)' },
      { key: 'same', value: 'n,Hangup()' },
      { key: 'exten', value: '101,1,Dial(PJSIP/101,20)' },
    ],
  },
];

const graph: DialplanGraph = {
  nodes: [
    { id: 'from-internal/100', context: 'from-internal', extension: '100', steps: [{ priority: 1, app: 'Answer', data: '' }, { priority: 2, app: 'Dial', data: 'PJSIP/100,20' }, { priority: 3, app: 'Hangup', data: '' }] },
    { id: 'from-internal/101', context: 'from-internal', extension: '101', steps: [{ priority: 1, app: 'Dial', data: 'PJSIP/101,20' }] },
  ],
  edges: [],
};

test('adding a step appends same => n to an existing extension and exten => 1 to a new one', () => {
  const { value, summary } = applyCanvasEdits(file, [
    { kind: 'add-step', context: 'from-internal', extension: '101', app: 'Hangup', data: '' },
    { kind: 'add-step', context: 'from-internal', extension: '200', app: 'Playback', data: 'welcome' },
    { kind: 'add-step', context: 'brand-new', extension: 's', app: 'Answer', data: '' },
  ]);
  const internal = value.find((s) => s.name === 'from-internal')!;
  assert.deepEqual(internal.entries, [
    { key: 'include', value: 'onboard-menu' },
    { key: 'exten', value: '100,1,Answer()' },
    { key: 'same', value: 'n,Dial(PJSIP/100,20)' },
    { key: 'same', value: 'n,Hangup()' },
    { key: 'exten', value: '101,1,Dial(PJSIP/101,20)' },
    { key: 'same', value: 'n,Hangup()' },
    { key: 'exten', value: '200,1,Playback(welcome)' },
  ]);
  assert.deepEqual(value.find((s) => s.name === 'brand-new')!.entries, [{ key: 'exten', value: 's,1,Answer()' }]);
  assert.equal(value[0].name, 'general', 'unrelated sections keep their place');
  assert.equal(summary.length, 3);
});

test('connecting appends a Goto and deleting removes the exten line with every same line under it', () => {
  const { value } = applyCanvasEdits(file, [
    { kind: 'connect', from: { context: 'from-internal', extension: '101' }, to: { context: 'onboard-menu', extension: 's' } },
    { kind: 'delete-extension', context: 'from-internal', extension: '100' },
  ]);
  assert.deepEqual(value.find((s) => s.name === 'from-internal')!.entries, [
    { key: 'include', value: 'onboard-menu' },
    { key: 'exten', value: '101,1,Dial(PJSIP/101,20)' },
    { key: 'same', value: 'n,Goto(onboard-menu,s,1)' },
  ]);
});

test('duplicating copies the whole block and editing a step replaces one line in place', () => {
  const { value } = applyCanvasEdits(file, [
    { kind: 'duplicate-extension', context: 'from-internal', extension: '100', as: '100copy' },
    { kind: 'set-step', context: 'from-internal', extension: '100', priority: 2, app: 'Dial', data: 'PJSIP/100,45' },
  ]);
  const entries = value.find((s) => s.name === 'from-internal')!.entries;
  assert.deepEqual(entries.slice(1, 4), [
    { key: 'exten', value: '100,1,Answer()' },
    { key: 'same', value: 'n,Dial(PJSIP/100,45)' },
    { key: 'same', value: 'n,Hangup()' },
  ]);
  assert.deepEqual(entries.slice(-3), [
    { key: 'exten', value: '100copy,1,Answer()' },
    { key: 'same', value: 'n,Dial(PJSIP/100,20)' },
    { key: 'same', value: 'n,Hangup()' },
  ]);
});

test('the projected graph shows the edits the way the file will land', () => {
  const projected = projectEdits(graph, [
    { kind: 'add-step', context: 'from-internal', extension: '101', app: 'Hangup', data: '' },
    { kind: 'connect', from: { context: 'from-internal', extension: '101' }, to: { context: 'onboard-menu', extension: 's' } },
    { kind: 'duplicate-extension', context: 'from-internal', extension: '100', as: '100copy' },
    { kind: 'delete-extension', context: 'from-internal', extension: '100' },
  ]);
  assert.deepEqual(projected.nodes.map((n) => n.id), ['from-internal/101', 'onboard-menu/s', 'from-internal/100copy']);
  assert.deepEqual(projected.nodes[0].steps.map((s) => `${s.app}(${s.data})`), ['Dial(PJSIP/101,20)', 'Hangup()', 'Goto(onboard-menu,s,1)']);
  assert.deepEqual(projected.edges, [['from-internal/101', 'onboard-menu/s']]);
  assert.equal(graph.nodes.length, 2, 'the live graph is never mutated');
});

test('deleting a step renumbers what follows, drops the edge its Goto drew, and removes an emptied extension', () => {
  const { value } = applyCanvasEdits(file, [{ kind: 'delete-step', context: 'from-internal', extension: '100', priority: 1 }]);
  assert.deepEqual(value.find((s) => s.name === 'from-internal')!.entries.slice(1, 3), [
    { key: 'exten', value: '100,1,Dial(PJSIP/100,20)' },
    { key: 'same', value: 'n,Hangup()' },
  ]);
  const emptied = applyCanvasEdits(file, [{ kind: 'delete-step', context: 'from-internal', extension: '101', priority: 1 }]).value;
  assert.ok(!emptied.find((s) => s.name === 'from-internal')!.entries.some((e) => e.value.startsWith('101,')));
  const wired = projectEdits(graph, [
    { kind: 'connect', from: { context: 'from-internal', extension: '101' }, to: { context: 'from-internal', extension: '100' } },
    { kind: 'delete-step', context: 'from-internal', extension: '101', priority: 2 },
  ]);
  assert.deepEqual(wired.edges, []);
  assert.deepEqual(wired.nodes.find((n) => n.extension === '101')!.steps.map((s) => s.priority), [1]);
});

test('step text round-trips and the summary names every edit', () => {
  assert.equal(stepText(' Dial ', 'PJSIP/100,20'), 'Dial(PJSIP/100,20)');
  assert.deepEqual(parseStepText('Dial(PJSIP/100,20)'), { app: 'Dial', data: 'PJSIP/100,20' });
  assert.deepEqual(parseStepText('Hangup'), { app: 'Hangup', data: '' });
  const lines = describeEdits([
    { kind: 'add-step', context: 'c', extension: 'e', app: 'Answer', data: '' },
    { kind: 'connect', from: { context: 'c', extension: 'e' }, to: { context: 'd', extension: 's' } },
    { kind: 'delete-extension', context: 'c', extension: 'e' },
    { kind: 'duplicate-extension', context: 'c', extension: 'e', as: 'f' },
    { kind: 'set-step', context: 'c', extension: 'e', priority: 1, app: 'Hangup', data: '' },
  ]);
  assert.equal(lines.length, 5);
  assert.ok(lines.every((line) => line.length > 10));
});
