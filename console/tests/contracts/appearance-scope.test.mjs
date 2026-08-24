import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../../app/renderer/src/App.tsx', import.meta.url), 'utf8');
const design = readFileSync(new URL('../../../design/Asterisk Console M3.dc.html', import.meta.url), 'utf8');

test('the appearance panel says on screen how few of its controls apply', () => {
  /* The comment above the appearance code has always been honest about this: six controls
   * reach the document and the rest move a preview swatch, because the compiled markup gives
   * an individual element no selector to receive an override. But that honesty lived in a
   * comment, where nobody using the console could read it -- and a panel offering fifty-odd
   * controls while quietly honouring six is claiming work it does not do, which is the same
   * defect as a button that only announces. */
  assert.match(design, /action:'appearance-scope'/, 'the panel has no scope readout');
  assert.match(app, /if \(action === 'appearance-scope'\) return this\.appearanceScope\(\);/,
    'nothing answers the scope readout, so it would render empty');
});

test('the readout counts the applied keys rather than stating a number', () => {
  /* A hand-typed count drifts away from the code the moment somebody wires a seventh key,
   * and it drifts silently, in the direction of claiming more than is true. */
  const body = app.slice(app.indexOf('private appearanceScope()'), app.indexOf('APPLIED_APPEARANCE = ['));
  assert.match(body, /App\.APPLIED_APPEARANCE\.length/, 'the readout does not count the real list');
  assert.doesNotMatch(body, /\b(six|6) of these controls/i, 'the readout hard-codes its count');
});

test('one list decides what is applied, persisted and restored', () => {
  /* Three copies of the same six names is three lists that will disagree, and the one that
   * disagrees is the one nobody checks. */
  const uses = app.match(/App\.APPLIED_APPEARANCE/g) ?? [];
  assert.ok(uses.length >= 3, `only ${uses.length} use(s) of the shared list; a copy has crept back`);
  assert.equal((app.match(/'ap_hue', 'ap_sat', 'ap_light', 'ap_family', 'ap_weight', 'ap_size'/g) ?? []).length, 1,
    'the six names are written out more than once');
});
