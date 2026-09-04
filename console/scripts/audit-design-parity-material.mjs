#!/usr/bin/env -S npx tsx
/**
 * Runs the Material Design 3 conformance audit over every audited destination and writes
 * one `{id}-material.json` evidence record per destination, plus a run ledger.
 *
 * WHAT IT AUDITS, and why it is the product rather than the design. `design-parity.json`
 * carries two sides: a reference (the checked-in design export, rendered by its own
 * runtime) and a built artifact (this application). The conformance question a `verified`
 * row asks is about the shipped chrome — whether the thing a person operates uses real
 * Material Design 3 primitives — so this renders `App`, the real product renderer, and not
 * the bare compiled shell it subclasses. That is the same class every other "is it
 * actually reachable" test in this repository renders for the same reason.
 *
 * The effective stylesheet is both of the ones the built renderer loads: `styles.css` and
 * the `design-styles.css` it imports. Auditing only the generated one would miss every
 * app-owned rule, which is exactly the "wired at one end, consumed at neither" shape this
 * project keeps meeting.
 *
 * Must be run with `tsx` (not plain `node`), because it imports the TypeScript renderer:
 *
 *     npx tsx console/scripts/audit-design-parity-material.mjs [--check] [--only=id,id]
 *
 * `--check` re-derives every record in memory and exits non-zero if a committed one would
 * change or is missing, writing nothing. That is the freshness guard: an audit committed
 * against a renderer that has since moved is a verdict about a screen nobody can see any
 * more, which is the same staleness the capture harness refuses everywhere else.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// App.bridge() reads `window.dingDesktop`; there is no `window` outside a browser, and
// this render path touches it. Same minimal stub every *-wired.test.tsx uses.
//
// This file is deliberately plain JavaScript despite running under tsx: tsx transforms
// `.ts`/`.tsx`, so a type annotation written in a `.mjs` reaches Node verbatim and fails
// to parse. It is a `.mjs` so that it can import the TypeScript renderer, nothing more.
globalThis.window ??= {};

import { SCREENS } from '../app/renderer/src/generated/console';
import { App } from '../app/renderer/src/App';
import { auditMaterial, parseInteractionRules, serializeAudit, findStaleRecords, M3_CHECKS } from './design-parity-material.mjs';

const root = resolve(import.meta.dirname, '..');
const repoRoot = resolve(root, '..');
const inventory = JSON.parse(readFileSync(resolve(root, 'inventories/design-parity.json'), 'utf8'));
const evidenceDir = resolve(root, 'release/evidence/parity');
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();

const only = (process.argv.find((argument) => argument.startsWith('--only=')) ?? '').slice('--only='.length);
const wanted = only.length > 0 ? new Set(only.split(',').map((id) => id.trim()).filter(Boolean)) : null;
const checkOnly = process.argv.includes('--check');

const appStylesheet = readFileSync(resolve(root, 'app/renderer/src/styles.css'), 'utf8');
const designStylesheet = readFileSync(resolve(root, 'app/renderer/src/generated/design-styles.css'), 'utf8');
const stylesheet = `${appStylesheet}\n${designStylesheet}`;

/**
 * Motion declared in a stylesheet rather than on an element. The generated sheet sets
 * transitions on bare selectors (`button`, `a, span, div`, `*`), which no inline style
 * carries, so an element-only motion check would report the design as having almost no
 * motion at all — a clean result obtained by not looking.
 */
function stylesheetMotion(css) {
  const declarations = [];
  const pattern = /([^{}]+)\{([^}]*)\}/g;
  let match;
  const flat = css.replaceAll('\r', '');
  while ((match = pattern.exec(flat)) !== null) {
    const selector = match[1].trim().replace(/\s+/g, ' ');
    if (selector.startsWith('@')) continue;
    for (const property of ['transition', 'animation', 'transition-duration', 'animation-duration', 'transition-timing-function', 'animation-timing-function']) {
      const declaration = new RegExp(`(?:^|;)\\s*${property}\\s*:([^;]*)`, 'i').exec(match[2].replaceAll('\r', ''));
      if (!declaration) continue;
      declarations.push({ source: `stylesheet rule \`${selector}\``, property, value: declaration[1].trim() });
    }
  }
  return declarations;
}

/**
 * Keyframe bodies are excluded from the motion sweep above on purpose: a `@keyframes`
 * block declares no duration and no easing of its own, so scanning it would report the
 * transition properties of whatever rule happened to follow it.
 */
const extraDeclarations = stylesheetMotion(stylesheet.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, ''));
const interactionRuleCount = parseInteractionRules(stylesheet).length;

function renderDestination(id) {
  const screen = SCREENS[id];
  if (!screen) throw new Error(`audit-design-parity-material: the renderer has no screen '${id}'`);
  class Pinned extends App {
    constructor(props) {
      super(props);
      this.state = { ...this.state, screen: id, railId: screen.rail, onboardOpen: false };
    }
  }
  return renderToStaticMarkup(createElement(Pinned));
}

const targets = inventory.destinations.map((destination) => destination.id).filter((id) => !wanted || wanted.has(id));
if (targets.length === 0) throw new Error('audit-design-parity-material: no audited destination selected');

mkdirSync(evidenceDir, { recursive: true });

const pathFor = (id) => resolve(evidenceDir, `${id}-material.json`);

const records = [];
for (const id of targets) {
  const record = auditMaterial({
    destinationId: id,
    html: renderDestination(id),
    stylesheet,
    extraDeclarations,
    source: {
      renderer: 'console/app/renderer/src/App.tsx (the built product renderer, not the bare compiled shell)',
      stylesheets: ['console/app/renderer/src/styles.css', 'console/app/renderer/src/generated/design-styles.css'],
      auditor: 'console/scripts/design-parity-material.mjs (auditMaterial)',
      runner: 'npx tsx console/scripts/audit-design-parity-material.mjs',
      method: 'static audit of the rendered markup and the effective stylesheet — see notMeasured for what that structurally cannot decide',
    },
  });
  record.tuple = inventory.captureContract.captureTuple;
  record.sourceCommit = sourceCommit;
  record.generatedBy = 'console/scripts/audit-design-parity-material.mjs';
  if (!checkOnly) writeFileSync(pathFor(id), serializeAudit(record));
  records.push(record);
}

const stale = checkOnly ? findStaleRecords(records, { pathFor, read: (path) => readFileSync(path, 'utf8') }) : [];

const conforming = records.filter((record) => record.conforms).length;
const perCheck = Object.fromEntries(M3_CHECKS.map((check) => [
  check,
  records.reduce((total, record) => total + (record.checks.find((entry) => entry.check === check)?.divergences ?? 0), 0),
]));

if (checkOnly) {
  if (stale.length > 0) {
    const named = stale.slice(0, 6).map((entry) => `${entry.destinationId} (${entry.reason})`).join(', ');
    console.error(`FAIL: ${stale.length} Material Design 3 audit record(s) are stale or missing — ${named}${stale.length > 6 ? ', ...' : ''} — run \`npx tsx console/scripts/audit-design-parity-material.mjs\` to regenerate them.`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: all ${records.length} Material Design 3 audit records match the renderer they were taken from.`);
  }
} else {
  const ledger = {
    generatedAt: new Date().toISOString(),
    generatedBy: 'console/scripts/audit-design-parity-material.mjs',
    sourceCommit,
    tuple: inventory.captureContract.captureTuple,
    bar: 'material-design-3',
    audited: records.length,
    conforming,
    nonConforming: records.length - conforming,
    interactionRulesAudited: interactionRuleCount,
    stylesheetMotionDeclarationsAudited: extraDeclarations.length,
    divergencesPerCheck: perCheck,
    checksThatFoundNothingOnAnyDestination: M3_CHECKS.filter((check) => perCheck[check] === 0),
    source: {
      renderer: 'console/app/renderer/src/App.tsx',
      stylesheets: ['console/app/renderer/src/styles.css', 'console/app/renderer/src/generated/design-styles.css'],
      auditor: 'console/scripts/design-parity-material.mjs',
      runner: 'npx tsx console/scripts/audit-design-parity-material.mjs',
    },
    whatThisRunDoesNotClaim: 'A static audit reads declarations, not pixels. It cannot decide whether a control whose measurements are correct is a real Material Design 3 component or a custom lookalike, cannot see geometry that only exists after layout, cannot see a style injected at runtime, and cannot watch motion run. Each record repeats these limits in its own notMeasured field.',
  };
  writeFileSync(resolve(evidenceDir, 'run-material.json'), `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`Audited ${records.length} destination(s) against Material Design 3: ${conforming} conforming, ${records.length - conforming} not.`);
  for (const check of M3_CHECKS) console.log(`  ${check}: ${perCheck[check]} divergence(s) across the run`);
  console.log(`Wrote ${records.length} record(s) and run-material.json into ${resolve(evidenceDir).replace(repoRoot + '\\', '').replace(repoRoot + '/', '')}`);
}
