#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for the Material Design 3 audit.
 *
 * Two properties are worth proving here and they pull in opposite directions, which is
 * exactly why both need a planted break rather than a reading of the committed evidence.
 *
 *   1. THE AUDITOR IS NOT A RUBBER STAMP THAT PASSES. It cannot report a conformance it
 *      did not measure: `conforms` is derived from the defect list, and every attempt to
 *      hand it a verdict is ignored.
 *
 *   2. THE AUDITOR IS NOT A RUBBER STAMP THAT FAILS. Every audited destination in this
 *      project is nonconforming today, so an auditor hard-wired to `false` would produce
 *      byte-identical evidence and nothing in the committed files could tell the
 *      difference. The conformant fixture below is the only thing that distinguishes them,
 *      and each planted divergence must move exactly one check off it.
 *
 * The third property is freshness: a record left behind by a renderer that has since
 * changed is a verdict about a screen nobody can reach. `findStaleRecords` is driven here
 * with an injected reader so a stale record can be planted without touching the committed
 * evidence this check exists to protect.
 *
 * Plain `node`, deliberately: nothing here imports the TypeScript renderer, so nothing
 * here needs a TypeScript runtime. The renderer-facing half of the bar lives in
 * `audit-design-parity-material.mjs --check`, which `npm run test:inventories` also runs.
 */
import {
  auditMaterial, findStaleRecords, serializeAudit, M3_CHECKS,
  M3_TYPE_SCALE_PX, M3_ICON_SIZES_PX, M3_SHAPE_SCALE_PX, M3_DURATIONS_MS, M3_EASING,
} from './design-parity-material.mjs';

/** A screen that genuinely conforms: every declaration below is a specification value. */
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

const audit = (overrides = {}) => auditMaterial({
  destinationId: 'negative-fixture', html: CONFORMANT_HTML, stylesheet: CONFORMANT_CSS, ...overrides,
});

const baseline = audit();
if (!baseline.conforms) {
  throw new Error(`the conformant fixture did not pass, so every planted break below would be meaningless: ${baseline.defects.join(' | ')}`);
}
console.log(`GREEN (baseline): the conformant fixture passes all ${M3_CHECKS.length} checks over ${baseline.elementsAudited} elements — an auditor hard-wired to fail could not produce this.`);

/**
 * Plants exactly one divergence and requires the refusal to be attributable to it. The
 * check that fired is asserted, not merely that something did: a break that goes red for
 * an unrelated reason reads exactly like one that worked, which is how a case quietly
 * stops testing what it names.
 */
function mustFail(name, check, overrides) {
  const result = audit(overrides);
  if (result.conforms) throw new Error(`${name}: deliberate break stayed green`);
  const fired = result.checks.filter((entry) => !entry.conforms).map((entry) => entry.check);
  if (fired.length !== 1 || fired[0] !== check) {
    throw new Error(`${name}: expected only '${check}' to fire, got [${fired.join(', ') || 'nothing'}]`);
  }
  console.log(`RED: ${name}\n       ${result.defects[0]}`);
  const restored = audit();
  if (!restored.conforms) throw new Error(`${name}: removing the break did not turn it green again`);
}

mustFail('a 13px label, which the Material Design 3 type scale does not contain', 'typeScale',
  { html: `${CONFORMANT_HTML}<span style="font-size:13px">off</span>` });

mustFail('a 19px icon glyph, which is not one of the four Material Design 3 icon sizes', 'iconSize',
  { html: `${CONFORMANT_HTML}<span class="msym" style="font-size:19px">bug</span>` });

mustFail('a 10px corner radius, between the shape scale\'s small and medium steps', 'shapeScale',
  { html: `${CONFORMANT_HTML}<div style="border-radius:10px">off</div>` });

mustFail('a single-layer custom shadow where an elevation level is two layers', 'elevation',
  { html: `${CONFORMANT_HTML}<div style="box-shadow:0 4px 16px rgba(0,0,0,.4)">off</div>` });

mustFail('a hover that swaps the element to an opaque colour instead of laying a state layer over it', 'stateLayer',
  { stylesheet: `${CONFORMANT_CSS}\n.thing:hover{background:#262B26}` });

mustFail('a stylesheet that declares no focus state at all', 'stateLayer',
  { stylesheet: 'button:hover{background:rgba(255,255,255,0.08)}' });

mustFail('a 32dp interactive control, below the 48dp minimum, with no expanded target', 'touchTarget',
  { html: `${CONFORMANT_HTML}<button style="width:32px;height:32px">x</button>` });

mustFail('a 160ms duration, which is not a Material Design 3 duration token', 'motion',
  { html: `${CONFORMANT_HTML}<div style="transition:opacity .16s linear">off</div>` });

mustFail('an overshoot spring curve, which is not a Material Design 3 easing token', 'motion',
  { html: `${CONFORMANT_HTML}<div style="transition:transform 200ms cubic-bezier(.2,1.4,.4,1)">off</div>` });

/* The verdict cannot be supplied. Every plausible route by which a caller might try to
 * hand this module a pass, planted at once against markup with one real divergence. */
const smuggled = auditMaterial({
  destinationId: 'negative-fixture',
  html: '<button style="font-size:13px">x</button>',
  stylesheet: CONFORMANT_CSS,
  conforms: true, defects: [], checks: M3_CHECKS.map((check) => ({ check, divergences: 0, conforms: true })),
});
if (smuggled.conforms !== false || smuggled.defects.length !== 1) {
  throw new Error('a caller-supplied conforms/defects/checks reached the returned record');
}
console.log(`RED: a caller handing in conforms:true, an empty defect list and a clean check table\n       ${smuggled.defects[0]}`);

/* An audit over nothing must be refused rather than answered — a verdict about zero
 * elements is the vacuous pass every guard in this repository is written against. */
for (const [name, argument] of [
  ['markup that renders no element at all', { destinationId: 'negative-fixture', html: '<!-- nothing -->' }],
  ['no destination id', { html: CONFORMANT_HTML }],
]) {
  let refused = false;
  try { auditMaterial(argument); } catch (error) { refused = true; console.log(`RED: an audit asked for with ${name}\n       ${error.message}`); }
  if (!refused) throw new Error(`an audit with ${name} returned a verdict instead of refusing`);
}

/* Freshness. The reader is injected, so the committed evidence this guard protects is
 * never touched by the guard's own proof. */
const records = ['alpha', 'beta'].map((id) => audit({ destinationId: id }));
const pathFor = (id) => `/evidence/${id}-material.json`;
const honest = new Map(records.map((record) => [pathFor(record.destinationId), serializeAudit(record)]));

const clean = findStaleRecords(records, { pathFor, read: (path) => honest.get(path) ?? null });
if (clean.length !== 0) throw new Error(`the honest freshness case reported ${clean.length} stale record(s)`);
console.log('GREEN (freshness): records matching what the renderer produces are not reported stale.');

for (const [name, read] of [
  ['a record absent from disk', (path) => (path.includes('beta') ? null : honest.get(path))],
  ['a record that no longer matches what the renderer produces', (path) => (path.includes('beta') ? honest.get(path).replace('"conforms": true', '"conforms": false') : honest.get(path))],
  ['a record whose reader throws', (path) => { if (path.includes('beta')) throw new Error('unreadable'); return honest.get(path); }],
]) {
  const stale = findStaleRecords(records, { pathFor, read });
  if (stale.length !== 1 || stale[0].destinationId !== 'beta') {
    throw new Error(`${name}: expected exactly beta to be reported stale, got [${stale.map((entry) => entry.destinationId).join(', ') || 'nothing'}]`);
  }
  console.log(`RED: ${name}\n       beta: ${stale[0].reason}`);
}

/* The line-ending case, which is the one that actually bit. With core.autocrlf=true a
 * record written LF here is CRLF in every other checkout of the same commit, so a
 * byte-for-byte comparison is green only on the machine that wrote it. Both directions are
 * planted: a CRLF record must not be called stale, and stripping carriage returns must not
 * blind the check to a real edit. */
const asCommitted = serializeAudit(records[0]);
const asCheckedOut = asCommitted.replaceAll('\n', '\r\n');
if (asCheckedOut === asCommitted) throw new Error('the CRLF fixture is identical to the LF one, so this case would prove nothing');
if (findStaleRecords([records[0]], { pathFor, read: () => asCheckedOut }).length !== 0) {
  throw new Error('a record materialised with CRLF was reported stale — the freshness check is green only where it was written');
}
console.log('GREEN (line endings): a record materialised with CRLF is the same record, not a stale one.');

const tampered = asCommitted.replace('"conforms": true', '"conforms": false').replaceAll('\n', '\r\n');
const tamperedStale = findStaleRecords([records[0]], { pathFor, read: () => tampered });
if (tamperedStale.length !== 1) throw new Error('stripping carriage returns blinded the check to a real edit');
console.log(`RED: a CRLF record whose content was genuinely edited\n       ${tamperedStale[0].destinationId}: ${tamperedStale[0].reason}`);

let refusedEmpty = false;
try { findStaleRecords([], { pathFor, read: () => null }); } catch (error) { refusedEmpty = true; console.log(`RED: a freshness check over no records at all\n       ${error.message}`); }
if (!refusedEmpty) throw new Error('a freshness check over zero records passed vacuously');

/* Finally, the specification constants themselves. If one of these drifted, every verdict
 * above would still be internally consistent and every one of them would be wrong. */
const expected = {
  typeScale: [11, 12, 14, 16, 22, 24, 28, 32, 36, 45, 57],
  iconSizes: [20, 24, 40, 48],
  shapeScale: [0, 4, 8, 12, 16, 28],
  standardEasing: '0.2,0,0,1',
  durationBounds: [50, 1000],
};
const actual = {
  typeScale: Object.keys(M3_TYPE_SCALE_PX).map(Number).sort((a, b) => a - b),
  iconSizes: [...M3_ICON_SIZES_PX],
  shapeScale: [...M3_SHAPE_SCALE_PX],
  standardEasing: M3_EASING.standard,
  durationBounds: [M3_DURATIONS_MS[0], M3_DURATIONS_MS[M3_DURATIONS_MS.length - 1]],
};
if (JSON.stringify(expected) !== JSON.stringify(actual)) {
  throw new Error(`the Material Design 3 specification constants have drifted:\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
}
console.log('GREEN: the specification constants are still the published Material Design 3 values.');
console.log('PASS: every deliberate break went red for its own reason, and every restoration went green.');
