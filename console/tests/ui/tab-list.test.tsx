import assert from 'node:assert/strict';
import test from 'node:test';

import { tabListText } from '../../app/renderer/src/tab-list.ts';

test('a plain tab key falls back to its compiled destination title', () => {
  const text = tabListText(['dash', 'endpoints'], {}, (key) => (key === 'dash' ? 'Dashboard' : key === 'endpoints' ? 'Endpoints' : undefined));
  assert.equal(text, 'Dashboard\nEndpoints');
});

test('a renamed tab copies under its real, custom name', () => {
  const text = tabListText(['dash'], { dash: 'My workspace' }, () => 'Dashboard');
  assert.equal(text, 'My workspace');
});

test('a key with no compiled title and no custom name falls back to the raw key rather than "undefined"', () => {
  const text = tabListText(['mystery-tab'], {}, () => undefined);
  assert.equal(text, 'mystery-tab');
  assert.doesNotMatch(text, /undefined/);
});

test('no open tabs is an empty string, not a stray newline', () => {
  assert.equal(tabListText([], {}, () => undefined), '');
});

test('BREAK CHECK -- the original `t.label` read is what this guard exists to catch', () => {
  /* The behaviour being guarded against: `tabs` holds plain string keys, read as
   * though each were an object with its own `.label`. Every entry is `undefined`, and
   * `Array.prototype.join` silently turns a run of `undefined` entries into empty
   * lines rather than throwing or spelling out the word -- so the clipboard ends up
   * holding blank lines, never the real tab names, with nothing to say why. */
  const tabs = ['dash', 'endpoints'];
  const naive = tabs.map((t: unknown) => (t as { label?: string }).label).join('\n');
  assert.equal(naive, '\n', 'the original bug produces blank lines, never the real tab names');
  assert.doesNotMatch(naive, /Dashboard|Endpoints/, 'the original bug never contains a real tab name');
  const real = tabListText(tabs, {}, (key) => (key === 'dash' ? 'Dashboard' : 'Endpoints'));
  assert.equal(real, 'Dashboard\nEndpoints');
  assert.notEqual(real, naive, 'the fix must produce the real tab names, not the blank text the original read produced');
});
