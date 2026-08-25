/**
 * The appearance readout tells the person which controls actually do something. That claim is
 * the kind that rots silently: a control gets wired into the preview, or dropped from it, and
 * the sentence keeps stating a number nobody re-derived.
 *
 * This compares the three hand-written lists against the preview the design really compiles
 * to. Hand-written on purpose -- a list generated from the same source it is checked against
 * proves nothing, and the point is to force a person to look when the truth changes.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const generated = read('../../app/renderer/src/generated/console.tsx');
const design = read('../../../design/Asterisk Console M3.dc.html');
const app = read('../../app/renderer/src/App.tsx');

/** The ids the compiled preview's own style string reads. */
function previewConsumes() {
  const line = generated.split('\n').find((l) => l.includes('appearPreviewStyle:'));
  assert.ok(line, 'the compiled preview style is gone; this check can no longer prove anything');
  return new Set([...line.matchAll(/ap_[a-z0-9_]+/g)].map((m) => m[0]));
}

/** One of the three lists in App.tsx, read as source rather than imported, because importing
 *  the renderer would drag a DOM in for a question about text. */
function listNamed(name) {
  const at = app.indexOf(`${name} = [`);
  assert.notEqual(at, -1, `${name} is gone from App.tsx`);
  const body = app.slice(at, app.indexOf('] as const', at));
  return new Set([...body.matchAll(/'(ap_[a-z0-9_]+)'/g)].map((m) => m[1]));
}

test('every control the readout calls live is one the preview really consumes', () => {
  const consumed = previewConsumes();
  for (const id of listNamed('PREVIEW_APPEARANCE')) {
    assert.ok(consumed.has(id),
      `the readout counts ${id} as reaching the preview, and the compiled preview never reads it`);
  }
});

test('every control the preview consumes is one the readout counts', () => {
  const listed = listNamed('PREVIEW_APPEARANCE');
  for (const id of previewConsumes()) {
    assert.ok(listed.has(id),
      `the preview reads ${id} and the readout does not count it, so the readout under-reports`);
  }
});

test('nothing called inert is quietly doing something after all', () => {
  const consumed = previewConsumes();
  for (const id of listNamed('INERT_APPEARANCE')) {
    assert.ok(!consumed.has(id),
      `${id} is listed as reaching nothing, and the preview reads it`);
    assert.ok(design.includes(`ctl('${id}'`),
      `${id} is listed as inert and no longer exists; drop it from the list`);
  }
});

test('the three lists together account for every appearance control on the panel', () => {
  const all = new Set([...design.matchAll(/ctl\('(ap_[a-z0-9_]+)'/g)].map((m) => m[1]));
  /* The two readouts are delivered by action name and are not settings. */
  for (const readout of ['ap_contrast_status', 'ap_scope_status']) all.delete(readout);
  const accounted = new Set([...listNamed('PREVIEW_APPEARANCE'), ...listNamed('INERT_APPEARANCE')]);
  const missing = [...all].filter((id) => !accounted.has(id));
  assert.deepEqual(missing, [],
    `${missing.length} appearance controls are in neither list, so the readout silently omits them`);
});
