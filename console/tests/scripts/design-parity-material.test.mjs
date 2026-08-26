/**
 * The Material Design 3 auditor's own behaviour, on synthetic markup whose every
 * declaration is known.
 *
 * Synthetic rather than the real renderer, for the same reason the chrome-parity tests use
 * synthetic images: a test that reads the real product can only assert whatever the
 * product happens to declare today, so it would go red the next time the interface
 * legitimately changes, and — far worse here — it could never exercise the case that
 * matters most, which is a **conformant** screen. Every audited destination in this
 * project is currently nonconforming, so a test that only ever saw the real ones could
 * not tell an auditor that measures from one that returns `false` unconditionally.
 *
 * That is the shape of the trap this file is written against. An auditor which always
 * fails is exactly as worthless as one which always passes, and reading the committed
 * evidence would not distinguish them. The conformant fixture below is the discriminator.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditMaterial, scanElements, parseInlineStyle, parseInteractionRules,
  serializeAudit, findStaleRecords,
  M3_CHECKS, M3_TYPE_SCALE_PX, M3_ICON_SIZES_PX, M3_SHAPE_SCALE_PX,
  M3_MIN_TOUCH_TARGET_PX, M3_STATE_LAYER_OPACITY, M3_EASING, M3_DURATIONS_MS, NOT_MEASURED,
} from '../../scripts/design-parity-material.mjs';

const CONSOLE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INVENTORY = JSON.parse(readFileSync(resolve(CONSOLE_ROOT, 'inventories', 'design-parity.json'), 'utf8'));

/**
 * A screen that conforms: every size on the type scale, every icon at an M3 icon size,
 * every radius on the shape scale, a two-layer elevation, a 48dp target, M3 standard
 * easing at an M3 duration. Its stylesheet uses translucent state layers and declares a
 * focus state.
 */
const CONFORMANT_HTML = [
  '<div style="font-size:16px;border-radius:12px">',
  '<span class="msym" style="font-size:24px">home</span>',
  '<button style="font-size:14px;border-radius:999px;width:48px;height:48px;transition:background-color 200ms cubic-bezier(0.2, 0, 0, 1)">Go</button>',
  '<div style="border-radius:28px;box-shadow:0px 1px 2px 0px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)">card</div>',
  '</div>',
].join('');

const CONFORMANT_CSS = [
  'button:hover{background:rgba(255,255,255,0.08)}',
  'button:active{background:rgba(255,255,255,0.10)}',
  'button:focus-visible{outline:3px solid #fff}',
].join('\n');

const auditFixture = (overrides = {}) => auditMaterial({
  destinationId: 'fixture',
  html: CONFORMANT_HTML,
  stylesheet: CONFORMANT_CSS,
  ...overrides,
});

test('the auditor can return a clean verdict — otherwise every failing verdict below means nothing', () => {
  const audit = auditFixture();
  assert.equal(audit.conforms, true, `expected a clean audit, got: ${audit.defects.join(' | ')}`);
  assert.deepEqual(audit.defects, []);
  assert.deepEqual(audit.checks.map((entry) => entry.check), [...M3_CHECKS]);
  assert.ok(audit.checks.every((entry) => entry.conforms));
});

test('conforms is computed from the defects and cannot be supplied by a caller', () => {
  // Every plausible way somebody might try to hand the auditor a verdict, at once. The
  // point is not that any one of these is likely; it is that the returned record's
  // `conforms` is a function of what was measured and of nothing else.
  const audit = auditMaterial({
    destinationId: 'fixture',
    html: '<button style="font-size:13px"></button>',
    stylesheet: CONFORMANT_CSS,
    conforms: true,
    defects: [],
    checks: M3_CHECKS.map((check) => ({ check, divergences: 0, conforms: true })),
    source: { conforms: true },
  });
  assert.equal(audit.conforms, false);
  assert.equal(audit.defects.length, 1);
  assert.match(audit.defects[0], /^typeScale: 1 divergence/);
});

test('an audit of nothing is refused rather than answered', () => {
  assert.throws(() => auditMaterial({ destinationId: 'fixture', html: '<!-- nothing here -->' }), /nothing here to audit/);
  assert.throws(() => auditMaterial({ destinationId: '', html: CONFORMANT_HTML }), /requires a destinationId/);
  assert.throws(() => auditMaterial({ html: CONFORMANT_HTML }), /requires a destinationId/);
  assert.throws(() => scanElements(''), /requires rendered markup/);
  assert.throws(() => scanElements(undefined), /requires rendered markup/);
});

/* One planted divergence per check, each on the otherwise-conformant fixture, so a case
 * that goes red for some other reason cannot pass for the right-looking wrong reason.
 * Each asserts the exact check that fired AND that no other check fired with it. */
const PLANTED = [
  {
    check: 'typeScale',
    what: 'a 13px label, which the Material Design 3 type scale does not contain',
    overrides: { html: `${CONFORMANT_HTML}<span style="font-size:13px">off</span>` },
    measured: '13px',
  },
  {
    check: 'iconSize',
    what: 'a 19px icon glyph, between the 20dp and smaller Material Design 3 icon sizes',
    overrides: { html: `${CONFORMANT_HTML}<span class="msym" style="font-size:19px">bug</span>` },
    measured: '19px',
  },
  {
    check: 'shapeScale',
    what: 'a 10px corner radius, between the shape scale\'s small (8dp) and medium (12dp) steps',
    overrides: { html: `${CONFORMANT_HTML}<div style="border-radius:10px">off</div>` },
    measured: '10px',
  },
  {
    check: 'elevation',
    what: 'a single-layer custom shadow where an elevation level is two layers',
    overrides: { html: `${CONFORMANT_HTML}<div style="box-shadow:0 4px 16px rgba(0,0,0,.4)">off</div>` },
    measured: '0 4px 16px rgba(0,0,0,.4)',
  },
  {
    check: 'stateLayer',
    what: 'a hover that swaps the element to an opaque colour instead of laying a state layer over it',
    overrides: { stylesheet: `${CONFORMANT_CSS}\n.thing:hover{background:#262B26}` },
    measured: '#262B26',
  },
  {
    check: 'touchTarget',
    what: 'a 32dp interactive control, below the 48dp minimum, with no expanded target declared',
    overrides: { html: `${CONFORMANT_HTML}<button style="width:32px;height:32px">x</button>` },
    measured: 'width 32px, height 32px',
  },
  {
    check: 'motion',
    what: 'a 160ms transition on a spring curve, neither of which is a Material Design 3 motion token',
    overrides: { html: `${CONFORMANT_HTML}<div style="transition:transform .16s cubic-bezier(.2,1.4,.4,1)">off</div>` },
    measured: '160ms',
  },
];

for (const planted of PLANTED) {
  test(`planting ${planted.what} turns exactly the ${planted.check} check red`, () => {
    const audit = auditFixture(planted.overrides);
    assert.equal(audit.conforms, false);
    const failed = audit.checks.filter((entry) => !entry.conforms).map((entry) => entry.check);
    assert.deepEqual(failed, [planted.check], `expected only ${planted.check} to fire, got ${failed.join(', ') || 'nothing'}`);
    assert.equal(audit.defects.length, 1);
    assert.ok(audit.defects[0].startsWith(`${planted.check}:`));
    assert.ok(
      audit.findings[planted.check].some((finding) => finding.measured === planted.measured),
      `${planted.check} fired but did not report the planted value ${planted.measured}`,
    );
  });

  test(`restoring ${planted.check} turns it green again`, () => {
    assert.equal(auditFixture().checks.find((entry) => entry.check === planted.check).conforms, true);
  });
}

test('a stylesheet with no focus state of any kind is itself a state-layer defect', () => {
  const audit = auditFixture({ stylesheet: 'button:hover{background:rgba(255,255,255,0.08)}' });
  assert.equal(audit.conforms, false);
  assert.deepEqual(audit.checks.filter((entry) => !entry.conforms).map((entry) => entry.check), ['stateLayer']);
  assert.ok(audit.findings.stateLayer.some((finding) => finding.property === ':focus-visible'));
});

test('a translucent hover is a state layer and is not reported', () => {
  for (const value of ['rgba(255,255,255,0.08)', 'rgba(255,255,255,.1)', '#FFFFFF14', 'transparent']) {
    const audit = auditFixture({ stylesheet: `${CONFORMANT_CSS}\n.thing:hover{background:${value}}` });
    assert.equal(audit.conforms, true, `${value} was reported as an opaque swap`);
  }
});

test('every value the specification does allow passes, so the checks are not blanket refusals', () => {
  for (const size of Object.keys(M3_TYPE_SCALE_PX)) {
    assert.equal(auditFixture({ html: `${CONFORMANT_HTML}<span style="font-size:${size}px">t</span>` }).conforms, true, `${size}px type`);
  }
  for (const size of M3_ICON_SIZES_PX) {
    assert.equal(auditFixture({ html: `${CONFORMANT_HTML}<span class="msym" style="font-size:${size}px">i</span>` }).conforms, true, `${size}px icon`);
  }
  for (const radius of [...M3_SHAPE_SCALE_PX, 999, 9999]) {
    assert.equal(auditFixture({ html: `${CONFORMANT_HTML}<div style="border-radius:${radius}px">r</div>` }).conforms, true, `${radius}px radius`);
  }
  assert.equal(auditFixture({ html: `${CONFORMANT_HTML}<div style="border-radius:0">r</div>` }).conforms, true, 'a unitless zero radius is the shape scale\'s own "none" step');
  assert.equal(auditFixture({ html: `${CONFORMANT_HTML}<div style="border-radius:50%">r</div>` }).conforms, true, 'a 50% radius is the shape scale\'s "full" step');
  for (const ms of M3_DURATIONS_MS) {
    assert.equal(auditFixture({ html: `${CONFORMANT_HTML}<div style="transition:opacity ${ms}ms linear">m</div>` }).conforms, true, `${ms}ms duration`);
  }
  for (const easing of Object.values(M3_EASING)) {
    if (easing === 'linear') continue;
    const written = `cubic-bezier(${easing})`;
    assert.equal(auditFixture({ html: `${CONFORMANT_HTML}<div style="transition:opacity 200ms ${written}">m</div>` }).conforms, true, written);
  }
});

test('a duration written in seconds is measured in milliseconds, not read as a bare number', () => {
  assert.equal(auditFixture({ html: `${CONFORMANT_HTML}<div style="transition:opacity .2s linear">m</div>` }).conforms, true);
  const audit = auditFixture({ html: `${CONFORMANT_HTML}<div style="transition:opacity .16s linear">m</div>` });
  assert.ok(audit.findings.motion.some((finding) => finding.measured === '160ms'));
});

test('a duration past the longest token says so rather than naming a nearest it is nowhere near', () => {
  const audit = auditFixture({ html: `${CONFORMANT_HTML}<span style="animation:pulse 2.4s ease-in-out infinite">p</span>` });
  const finding = audit.findings.motion.find((entry) => entry.measured === '2400ms');
  assert.ok(finding);
  assert.match(finding.nearestSpecValue, /beyond the longest Material Design 3 duration token \(1000ms\)/);
});

test('an easing written with and without leading zeros compares equal', () => {
  for (const written of ['cubic-bezier(.2,0,0,1)', 'cubic-bezier(0.2, 0, 0, 1)', 'cubic-bezier(0.20,0.0,0,1.0)']) {
    assert.equal(auditFixture({ html: `${CONFORMANT_HTML}<div style="transition:opacity 200ms ${written}">m</div>` }).conforms, true, written);
  }
});

test('an element that is interactive only by its cursor is still held to the touch-target minimum', () => {
  const audit = auditFixture({ html: `${CONFORMANT_HTML}<div style="cursor:pointer;width:34px;height:32px">x</div>` });
  assert.deepEqual(audit.checks.filter((entry) => !entry.conforms).map((entry) => entry.check), ['touchTarget']);
  assert.equal(auditFixture({ html: `${CONFORMANT_HTML}<div style="width:34px;height:32px">x</div>` }).conforms, true, 'a non-interactive box has no touch target to miss');
});

test('scanElements does not end a tag on a > inside an attribute value', () => {
  const elements = scanElements('<button title="a > b" style="font-size:14px">x</button><span>y</span>');
  assert.deepEqual(elements.map((element) => element.tag), ['button', 'span']);
  assert.equal(elements[0].attributes.title, 'a > b');
  assert.equal(elements[0].attributes.style, 'font-size:14px');
});

test('parseInlineStyle does not split a declaration on a semicolon inside a function', () => {
  const declarations = parseInlineStyle('box-shadow:0 0 0 1px rgba(0,0,0,.3);font-size:14px');
  assert.equal(declarations['box-shadow'], '0 0 0 1px rgba(0,0,0,.3)');
  assert.equal(declarations['font-size'], '14px');
});

test('parseInteractionRules reads a stylesheet stored with carriage returns', () => {
  const crlf = 'button:hover{background:#111}\r\nbutton:focus-visible{outline:2px solid #fff}\r\n';
  const rules = parseInteractionRules(crlf);
  assert.deepEqual(rules.map((rule) => rule.state), ['hover', 'focus-visible']);
  assert.equal(rules[0].declarations.background, '#111');
});

test('parseInteractionRules strips !important so a design-tool hover is still read', () => {
  const rules = parseInteractionRules('.k-h0:hover{background:#262B26 !important; color:#DFE4DC !important}');
  assert.equal(rules[0].declarations.background, '#262B26');
});

test('the specification constants are the published Material Design 3 values, not local inventions', () => {
  assert.deepEqual(Object.keys(M3_TYPE_SCALE_PX).map(Number).sort((a, b) => a - b), [11, 12, 14, 16, 22, 24, 28, 32, 36, 45, 57]);
  assert.deepEqual([...M3_ICON_SIZES_PX], [20, 24, 40, 48]);
  assert.deepEqual([...M3_SHAPE_SCALE_PX], [0, 4, 8, 12, 16, 28]);
  assert.equal(M3_MIN_TOUCH_TARGET_PX, 48);
  assert.deepEqual({ ...M3_STATE_LAYER_OPACITY }, { hover: 0.08, focus: 0.10, pressed: 0.10, dragged: 0.16 });
  assert.equal(M3_EASING.standard, '0.2,0,0,1');
  assert.equal(M3_DURATIONS_MS[0], 50);
  assert.equal(M3_DURATIONS_MS[M3_DURATIONS_MS.length - 1], 1000);
});

test('every audit states what a static audit structurally cannot decide', () => {
  const audit = auditFixture();
  assert.deepEqual(audit.notMeasured, [...NOT_MEASURED]);
  assert.ok(audit.notMeasured.length >= 5);
  assert.ok(audit.notMeasured.some((limit) => limit.startsWith('component anatomy:')));
  assert.ok(audit.notMeasured.some((limit) => limit.startsWith('colour roles:')));
});

/* The freshness check, and specifically the line-ending case that made it green only on
 * the machine that wrote the records.
 *
 * This checkout runs with core.autocrlf=true, so a record written with LF here is
 * materialised with CRLF in every other checkout of the same commit. The first version of
 * this check compared the bytes as read, so the whole suite passed in the tree that
 * generated the evidence and the identical commit reported all 32 records stale in the
 * primary checkout beside it. That is the worst possible direction for a freshness check
 * to be wrong in: green where it was written, red everywhere it actually matters. */
test('a record materialised with CRLF is the same record, not a stale one', () => {
  const records = [auditFixture({ destinationId: 'alpha' })];
  const pathFor = (id) => `/evidence/${id}-material.json`;
  const asCommitted = serializeAudit(records[0]);
  const asCheckedOut = asCommitted.replaceAll('\n', '\r\n');
  assert.notEqual(asCheckedOut, asCommitted, 'the CRLF fixture is identical to the LF one, so this test would prove nothing');
  assert.deepEqual(findStaleRecords(records, { pathFor, read: () => asCheckedOut }), []);
  assert.deepEqual(findStaleRecords(records, { pathFor, read: () => asCommitted }), []);
});

test('the freshness check still notices a record whose content genuinely changed', () => {
  const records = [auditFixture({ destinationId: 'alpha' })];
  const pathFor = (id) => `/evidence/${id}-material.json`;
  const tampered = serializeAudit(records[0]).replace('"conforms": true', '"conforms": false').replaceAll('\n', '\r\n');
  const stale = findStaleRecords(records, { pathFor, read: () => tampered });
  assert.equal(stale.length, 1, 'stripping carriage returns must not blind the check to a real edit');
  assert.equal(stale[0].destinationId, 'alpha');
});

/* The committed evidence. Deliberately asserted on what it IS rather than on a verdict:
 * these rows are all nonconforming today, and a test written to that fact would have to be
 * edited the day one of them is repaired. What must hold whatever the verdicts say is that
 * a record exists for every audited destination, names that destination, was produced by
 * this bar, and never claims a conformance its own defect list contradicts. */
test('every audited destination has a committed Material Design 3 record that is internally consistent', () => {
  const template = INVENTORY.evidenceTemplates.materialAudit;
  assert.equal(typeof template, 'string');
  const repoRoot = resolve(CONSOLE_ROOT, '..');
  let present = 0;
  for (const destination of INVENTORY.destinations) {
    const path = resolve(repoRoot, template.replaceAll('{id}', destination.id));
    assert.ok(existsSync(path), `${destination.id}: no Material Design 3 audit record at ${template.replaceAll('{id}', destination.id)}`);
    const record = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(record.destinationId, destination.id);
    assert.equal(record.bar, 'material-design-3');
    assert.equal(record.conforms, record.defects.length === 0, `${destination.id}: conforms disagrees with its own defect list`);
    assert.ok(record.elementsAudited > 0, `${destination.id}: recorded a verdict over zero elements`);
    assert.deepEqual(record.checks.map((entry) => entry.check), [...M3_CHECKS]);
    for (const entry of record.checks) {
      assert.equal(entry.divergences, record.findings[entry.check].length, `${destination.id}: ${entry.check} count disagrees with its own findings`);
      assert.equal(entry.conforms, entry.divergences === 0);
    }
    present += 1;
  }
  assert.equal(present, INVENTORY.destinations.length);
  assert.equal(present, 32);
});
