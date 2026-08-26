/**
 * Contract: guided-forms. Real for exactly one flow (new PJSIP endpoint
 * creation): `endpoint-create.ts` (WIZARD_CONTROLS, buildEndpointDraft) is
 * imported by App.tsx and genuinely called to build a validated draft with a
 * generated secret, which the wizard then displays with an explicit
 * "write this password down" warning. This is a real guided form, not a
 * system-wide guided-forms contract -- every other create/edit flow in the
 * console is an ordinary field-by-field form.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const APP = 'app/renderer/src/App.tsx';
const ENDPOINT_CREATE = 'app/renderer/src/endpoint-create.ts';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['guided-forms'];
  assert.ok(row, 'the implementation registry has no row for guided-forms');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('endpoint-create.ts IS imported by App.tsx', () => {
  const app = read(APP);
  assert.match(app, /import \{ buildEndpointDraft, endpointDocument, PJSIP_RESOURCE, WIZARD_CONTROLS \} from '\.\/endpoint-create';/,
    'endpoint-create.ts is no longer imported the expected way');
});

test('buildEndpointDraft is genuinely called to build a validated draft with a generated secret', () => {
  const app = read(APP);
  assert.match(app, /const draft = buildEndpointDraft\(value, \(this\.state as \{ values: Record<string, unknown> \}\)\.values\);/u,
    'buildEndpointDraft(...) is no longer called the expected way');
  assert.match(app, /Write this password down/u, 'the generated-secret warning copy no longer appears');
});

test('WIZARD_CONTROLS exports a real control map, not an empty placeholder', () => {
  const src = read(ENDPOINT_CREATE);
  const body = src.match(/export const WIZARD_CONTROLS = \{([^}]*)\} as const;/);
  assert.ok(body, 'expected to find the WIZARD_CONTROLS object literal');
  const keys = [...body[1].matchAll(/(\w+):/gu)].map((m) => m[1]);
  assert.ok(keys.length > 0, 'WIZARD_CONTROLS has no fields, which would make this feature vacuously "wired"');
});

test('this is one flow, not a system-wide guided-forms mechanism: no other module imports endpoint-create.ts', () => {
  const app = read(APP);
  const importers = [...app.matchAll(/from '\.\/endpoint-create';/gu)];
  assert.equal(importers.length, 1, 'endpoint-create.ts is now imported more than once in App.tsx -- re-check whether this is still a single-flow feature');
});
