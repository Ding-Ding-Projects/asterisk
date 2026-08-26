import assert from 'node:assert/strict';
import test from 'node:test';

import { contextsMissingFromLoadedDialplan } from '../../app/renderer/src/canvas';
import type { DialplanGraph, DialplanNode } from '../../app/renderer/src/canvas';

/**
 * `contextsMissingFromLoadedDialplan` -- see its own comment in canvas.ts for the live
 * finding it exists to surface: `dialplan show` reads what Asterisk currently has
 * *loaded*, `/etc/asterisk/extensions.conf` is what the file on disk currently says,
 * and nothing before this compared the two.
 */

const node = (context: string, extension = '1'): DialplanNode => ({
  id: `${context}/${extension}`,
  context,
  extension,
  steps: [{ priority: 1, app: 'Answer', data: '' }],
});

const graph = (contexts: string[]): DialplanGraph => ({
  nodes: contexts.map((context) => node(context)),
  edges: [],
});

test('reports a context the file declares that the loaded dialplan has no extensions under', () => {
  const missing = contextsMissingFromLoadedDialplan(graph(['default']), ['default', 'dundi-e164', 'iax2-trunk']);
  assert.deepEqual(missing, ['dundi-e164', 'iax2-trunk']);
});

test('reports nothing when every file context has a loaded extension', () => {
  const missing = contextsMissingFromLoadedDialplan(graph(['default', 'from-trunk']), ['default', 'from-trunk']);
  assert.deepEqual(missing, []);
});

test('excludes "general" and "globals", which are not contexts at all', () => {
  const missing = contextsMissingFromLoadedDialplan(graph(['default']), ['default', 'general', 'globals', 'Globals']);
  assert.deepEqual(missing, [], 'general/globals are pbx_config.c special sections, never contexts');
});

test('never reports the same missing context twice, even if the file repeats it', () => {
  const missing = contextsMissingFromLoadedDialplan(graph([]), ['dundi-e164', 'dundi-e164']);
  assert.deepEqual(missing, ['dundi-e164']);
});

test('ignores blank section names', () => {
  const missing = contextsMissingFromLoadedDialplan(graph([]), ['', '   ']);
  assert.deepEqual(missing, []);
});

test('returns nothing when the dialplan graph has not been read yet', () => {
  assert.deepEqual(contextsMissingFromLoadedDialplan(undefined, ['default']), []);
});

test('the live finding itself: three real contexts a restored-but-unreloaded file held', () => {
  // Measured against a live target (docs/evidence/live-readings.md finding 3): the file
  // held [dundi-e164] at line 287, [iax2-trunk] at 306 and [trunkint] at 318, and the
  // running dialplan had none of them.
  const fileContexts = ['default', 'dundi-e164', 'iax2-trunk', 'trunkint'];
  const missing = contextsMissingFromLoadedDialplan(graph(['default']), fileContexts);
  assert.deepEqual(missing, ['dundi-e164', 'iax2-trunk', 'trunkint']);
});
