import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyControlValues, controlValuesFor, editDocument, endpointNames, findEndpoint,
  removeEndpoint, ENDPOINT_CONTROLS,
} from '../../app/renderer/src/endpoint-edit.ts';
import { buildEndpointDraft, endpointDocument, WIZARD_CONTROLS } from '../../app/renderer/src/endpoint-create.ts';
import type { ConfigValue } from '../../app/renderer/src/configuration.ts';

/** A target carrying one real endpoint, built through the creation path so the fixture
 *  cannot drift from what the console actually writes. */
const withOne = (name = '1001'): ConfigValue => {
  const draft = buildEndpointDraft([], {
    [WIZARD_CONTROLS.name]: name,
    [WIZARD_CONTROLS.context]: 'from-internal',
  });
  assert.ok(!('error' in draft));
  return endpointDocument(draft).value;
};

const ok = <T,>(result: T | { error: string }): T => {
  assert.ok(!(result && typeof result === 'object' && 'error' in result),
    `expected success, got: ${(result as { error?: string }).error ?? ''}`);
  return result as T;
};

test('an endpoint on the target can be found and listed', () => {
  const target = withOne();
  assert.deepEqual(endpointNames(target), ['1001']);
  assert.ok(findEndpoint(target, '1001'));
  assert.equal(findEndpoint(target, 'nope'), undefined);
});

test('selecting a row produces the control values for that endpoint', () => {
  /* This is what the screen was missing. The bound controls point at a section literally
   * named `endpoint`, which no real pjsip.conf contains, so selecting a row loaded
   * nothing and the controls kept showing design defaults. */
  const endpoint = findEndpoint(withOne(), '1001');
  assert.ok(endpoint);
  const values = controlValuesFor(endpoint);
  assert.equal(values[ENDPOINT_CONTROLS.context], 'from-internal');
  assert.equal(typeof values[ENDPOINT_CONTROLS.symmetric], 'boolean', 'a yes/no setting must reach a switch as a boolean');
});

test('a field the endpoint does not set is left out rather than given a value', () => {
  /* Filling it would make the screen claim the target has a setting it has never been
   * given, which is the same untruth as a sample value. */
  const endpoint = findEndpoint(withOne(), '1001');
  assert.ok(endpoint);
  const values = controlValuesFor(endpoint);
  assert.ok(!(ENDPOINT_CONTROLS.encryption in values) || values[ENDPOINT_CONTROLS.encryption] !== undefined);
});

test('changing a control changes that endpoint and says what changed', () => {
  const target = withOne();
  const edit = ok(applyControlValues(target, '1001', { [ENDPOINT_CONTROLS.context]: 'from-external' }));
  assert.equal(edit.view.endpoints[0].endpoint.context, 'from-external');
  assert.ok(edit.summary.some((line) => line.includes('from-internal') && line.includes('from-external')),
    'the summary must name the before and after, not merely that something changed');
});

test('a control the person never touched leaves the target value alone', () => {
  /* Writing every control on every save would quietly reset fields to whatever the
   * interface happened to be showing. */
  const target = withOne();
  const before = findEndpoint(target, '1001')!.endpoint.transport;
  const edit = ok(applyControlValues(target, '1001', { [ENDPOINT_CONTROLS.context]: 'from-external' }));
  assert.equal(edit.view.endpoints[0].endpoint.transport, before);
});

test('saving an unchanged control produces no change and no summary line', () => {
  const edit = ok(applyControlValues(withOne(), '1001', { [ENDPOINT_CONTROLS.context]: 'from-internal' }));
  assert.deepEqual(edit.summary, [], 'a no-op save reported a change');
});

test('a switch reaches the file as the yes or no Asterisk writes', () => {
  const on = ok(applyControlValues(withOne(), '1001', { [ENDPOINT_CONTROLS.direct]: true }));
  assert.equal(on.view.endpoints[0].endpoint.direct_media, 'yes');
  const off = ok(applyControlValues(withOne(), '1001', { [ENDPOINT_CONTROLS.direct]: false }));
  assert.equal(off.view.endpoints[0].endpoint.direct_media, 'no');
});

test('saving an endpoint that is no longer there is refused rather than recreating it', () => {
  const gone = applyControlValues(withOne(), 'someone-else', { [ENDPOINT_CONTROLS.context]: 'x' });
  assert.ok('error' in gone);
  assert.match(gone.error, /not on this target/u);
});

test('removing an endpoint removes all three of its sections', () => {
  /* Removing only the endpoint section leaves an orphan auth and aor that nothing
   * references. Asterisk tolerates it silently, so the file rots one delete at a time. */
  const removal = ok(removeEndpoint(withOne(), '1001'));
  assert.deepEqual(removal.view.endpoints, []);
  const rendered = editDocument(removal, '/etc/asterisk/pjsip.conf').value;
  assert.equal(rendered.filter((section) => section.name === '1001').length, 0,
    'a section survived the delete, so an orphan was left behind');
  assert.ok(removal.summary[0].includes('endpoint') && removal.summary[0].includes('auth') && removal.summary[0].includes('aor'),
    'the summary must say all three are going, so nobody is surprised by what a delete takes');
});

test('removing an endpoint that is not there is refused', () => {
  const gone = removeEndpoint(withOne(), 'nope');
  assert.ok('error' in gone);
});

test('another endpoint is untouched by editing or removing one', () => {
  const two = endpointDocument(ok(buildEndpointDraft(withOne('1001'), {
    [WIZARD_CONTROLS.name]: '1002', [WIZARD_CONTROLS.context]: 'from-internal',
  }))).value;
  assert.deepEqual(endpointNames(two).sort(), ['1001', '1002']);

  const edited = ok(applyControlValues(two, '1001', { [ENDPOINT_CONTROLS.context]: 'changed' }));
  assert.equal(edited.view.endpoints.find((e) => e.name === '1002')!.endpoint.context, 'from-internal');

  const removed = ok(removeEndpoint(two, '1001'));
  assert.deepEqual(endpointNames(editDocument(removed, '/etc/asterisk/pjsip.conf').value), ['1002']);
});
