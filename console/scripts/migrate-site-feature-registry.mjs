/**
 * One-shot migration: console/site/feature-registry.json schema v1 -> v2.
 *
 * The merge that integrated the two feature lanes kept the v1 site registry
 * (state/note/files) while taking the v2 contract tests and the v2 validator,
 * so every consumer spoke a schema the file did not have. This rewrites the
 * file into the exact shape console/scripts/inventory-validation.mjs requires,
 * carrying every honest state and note across rather than regenerating them
 * from the generator's 2026-08-23 snapshot, which has since gone stale.
 *
 * It is committed rather than pasted at a shell so the transform can be read,
 * re-run and argued with. Re-running it on an already-migrated file is a no-op
 * refusal: it only accepts a v1 input.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const consoleRoot = resolve(import.meta.dirname, '..');
const at = (relative) => resolve(consoleRoot, relative);
const readText = (relative) => readFileSync(at(relative), 'utf8').replace(/\r\n|\r/gu, '\n');
const readJson = (relative) => JSON.parse(readText(relative));

const v1 = readJson('site/feature-registry.json');
if (v1.schemaVersion !== 1) {
  console.error('FAIL: site/feature-registry.json is not schema v1; nothing to migrate.');
  process.exit(1);
}

const locales = readJson('site/locales/feature-registry.json');
const generator = readText('scripts/generate-completeness-matrix.mjs');

/* The symbol maps are read out of the generator rather than retyped, so the two
 * cannot disagree about which declaration owns a feature. */
function generatorMap(name) {
  const opening = `const ${name} = {`;
  const start = generator.indexOf(opening);
  if (start < 0) throw new Error(`generator no longer declares ${name}`);
  const end = generator.indexOf('\n};', start);
  if (end < 0) throw new Error(`generator declaration of ${name} is unterminated`);
  const literal = generator.slice(start + `const ${name} = `.length, end + 2);
  return JSON.parse(JSON.stringify(new Function(`return (${literal})`)()));
}

const implementationSymbols = generatorMap('siteImplementationSymbols');
const registrationSymbols = generatorMap('siteRegistrationSymbols');

const NEGATIVE_CASES = [
  'whole-feature-disappearance', 'whole-page-disappearance', 'renamed-symbol', 'commented-symbol',
  'stale-commit', 'missing-evidence', 'route-only-prose', 'fake-success', 'sample-data',
];
/* v1 said "implemented" where v2 says "implemented-unverified". The two words mean the
 * same thing here and the longer one says the second half out loud: built, not proven. */
const STATUS_FROM_STATE = { implemented: 'implemented-unverified', partial: 'partial', absent: 'absent' };
const ROUTE = 'https://ding-ding-projects.github.io/asterisk/';

/* Mirrors sourceHasExactSymbol in scripts/inventory-validation.mjs. A symbol the
 * validator would reject is dropped here and named, rather than carried into a file
 * that then refuses to validate. */
function symbolResolves(symbol) {
  const path = symbol.path.startsWith('site/') ? symbol.path : symbol.path;
  if (!existsSync(at(path))) return false;
  const source = readText(path);
  const name = symbol.name;
  return new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?(?:function|class|const|let|var)\\s+${name}\\b`, 'mu').test(source)
    || new RegExp(`^\\s*(?:(?:public|private|protected|static|async)\\s+)*${name}\\s*(?::|=|\\()`, 'mu').test(source);
}

const dropped = [];
const migrated = {
  surface: 'pages-site',
  schemaVersion: 2,
  canonicalMatrix: 'console/inventories/surface-completeness.json',
  features: {},
};

for (const [id, row] of Object.entries(v1.features)) {
  const status = STATUS_FROM_STATE[row.state];
  if (!status) throw new Error(`${id}: v1 state '${row.state}' has no v2 status`);

  const keep = (list) => (list ?? []).filter((symbol) => {
    if (symbolResolves(symbol)) return true;
    dropped.push(`${id}: ${symbol.path}#${symbol.name}`);
    return false;
  });

  const documentation = existsSync(at(`docs/platform/${id}.md`)) ? `console/docs/platform/${id}.md` : null;
  const localization = locales.features[id];
  const focusedCheck = `site/tests/contracts/${id}.test.mjs`;
  if (!existsSync(at(focusedCheck))) throw new Error(`${id}: no focused check on disk at ${focusedCheck}`);

  migrated.features[id] = {
    status,
    note: row.note,
    implementation: { paths: [...(row.files ?? [])], symbols: keep(implementationSymbols[id]) },
    registration: { paths: [], symbols: keep(registrationSymbols[id]) },
    route: ROUTE,
    documentation: { path: documentation, state: documentation ? 'present' : 'absent' },
    localization: {
      state: localization ? localization.state : 'unverified',
      paths: localization ? ['site/locales/feature-registry.json'] : [],
      symbols: [],
    },
    persistence: { state: 'unverified', paths: [], symbols: [] },
    focusedChecks: { state: 'present', commands: [`node --test console/${focusedCheck}`] },
    negativeEvidence: { state: 'not-run', script: 'console/scripts/negative-surface-completeness.mjs', cases: [...NEGATIVE_CASES] },
    builtInteraction: { state: 'not-run', commit: null, route: null, evidence: null },
    captures: { state: 'not-run', currentCommit: null, paths: [] },
    designParity: {
      state: 'not-run', referenceRoute: null, builtRoute: ROUTE,
      tuple: { state: null, theme: null, viewport: null, scale: null },
      rawCaptures: [], sideBySide: null, visualDiff: null,
    },
  };
}

writeFileSync(at('site/feature-registry.json'), `${JSON.stringify(migrated, null, 2)}\n`, 'utf8');
console.log(`PASS: migrated ${Object.keys(migrated.features).length} pages-site rows to schema v2.`);
for (const entry of dropped) console.log(`  dropped unresolvable symbol -- ${entry}`);
