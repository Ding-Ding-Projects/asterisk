#!/usr/bin/env node
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { validateFeatureRegistry, validateParityInventory, validateSurfaceInventory } from './inventory-validation.mjs';
import { verifyEvidenceOnDisk, verifyExemptions } from './evidence-on-disk.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const allowUnverified = process.argv.includes('--allow-unverified');
const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const readJson = (relativePath) => JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));

function verifyAttentionWiring() {
  const source = `
    import { readFileSync } from 'node:fs';
    import { resolve } from 'node:path';
    import { ATTENTION_MUTATION_INVENTORY, ATTENTION_SEVERITY_PRODUCERS, ATTENTION_SEVERITY_ROUTES, ATTENTION_STRUCTURED_NOTICE_PRODUCERS, ATTENTION_WIRING, redactNoticeText, sensitiveSpansForValue, verifyAttentionMutationInventory, verifyAttentionSeverityProducers, verifyAttentionStructuredNoticeProducers, verifyAttentionWiring } from './console/app/renderer/src/attention-modes.ts';
    const root = resolve(${JSON.stringify(root)});
    const readSource = (path) => readFileSync(path, 'utf8').replace(/\\r\\n|\\r/g, '\\n');
    const sources = {
      design: readSource(resolve(root, 'design/Asterisk Console M3.dc.html')),
      app: readSource(resolve(root, 'console/app/renderer/src/App.tsx')),
      generated: readSource(resolve(root, 'console/app/renderer/src/generated/console.tsx')),
      module: readSource(resolve(root, 'console/app/renderer/src/attention-modes.ts')),
    };
    const removeOwned = (input, marker) => {
      const next = { ...input };
      const sourceText = next[marker.owner];
      const count = sourceText.split(marker.text).length - 1;
      if (count !== 1) throw new Error('Negative fixture marker must have one owner match, found ' + count + ': ' + marker.text);
      next[marker.owner] = sourceText.replace(marker.text, '');
      return next;
    };
    const replaceProducer = (input, row, replacement) => {
      const next = { ...input };
      const source = next[row.file === 'App.tsx' ? 'app' : 'generated'];
      const positions = [];
      let cursor = 0;
      while (true) {
        const found = source.indexOf(row.marker, cursor);
        if (found < 0) break;
        positions.push(found);
        cursor = found + row.marker.length;
      }
      if (positions.length !== 1) throw new Error('Severity producer marker is not unique for ' + row.file + ':' + row.line + ' ' + row.marker + ' (found ' + positions.length + ')');
      const markerHelperOffset = row.marker.indexOf(row.helper);
      if (markerHelperOffset < 0) throw new Error('Severity producer marker does not contain its helper for ' + row.file + ':' + row.line);
      const start = positions[0] + markerHelperOffset;
      next[row.file === 'App.tsx' ? 'app' : 'generated'] = source.slice(0, start) + replacement + source.slice(start + row.helper.length);
      return next;
    };
    const removeMutationCallback = (input, row) => {
      const key = row.file === 'App.tsx' ? 'app' : 'generated';
      const call = 'onUserMutation(' + row.argument + ')';
      const next = { ...input };
      const lines = next[key].split(/\\r?\\n/);
      let target = row.line - 1;
      if ((lines[target] || '').split(call).length - 1 !== 1) target = lines.findIndex((line) => line.split(call).length - 1 === 1);
      if (target < 0) throw new Error('Mutation callback span drift at ' + row.file + ':' + row.line);
      lines[target] = lines[target].replace(call, '');
      next[key] = lines.join('\\n');
      return next;
    };
    const replaceMutationArgument = (input, row, replacement) => {
      const key = row.file === 'App.tsx' ? 'app' : 'generated';
      const call = 'onUserMutation(' + row.argument + ')';
      const replacementCall = 'onUserMutation(' + replacement + ')';
      const next = { ...input };
      const lines = next[key].split(/\\r?\\n/);
      let target = row.line - 1;
      if ((lines[target] || '').split(call).length - 1 !== 1) target = lines.findIndex((line) => line.split(call).length - 1 === 1);
      if (target < 0) throw new Error('Mutation callback replacement span drift at ' + row.file + ':' + row.line);
      lines[target] = lines[target].replace(call, replacementCall);
      next[key] = lines.join('\\n');
      return next;
    };
    verifyAttentionWiring(sources);
    verifyAttentionMutationInventory({ app: sources.app, generated: sources.generated });
    verifyAttentionSeverityProducers(sources);
    verifyAttentionStructuredNoticeProducers({ app: sources.app, generated: sources.generated });
    for (const [input, expected] of [
      ['path C:/Program Files/Ding PBX/settings (old),semi;tail', 'path [path omitted]'],
      ['url https://example.invalid/Program Files/(old)[x],semi;tail', 'url [url omitted]'],
      ['path C:/Program Files/Ding PBX/settings (old), retry with bridge', 'path [path omitted], retry with bridge'],
      ['url https://example.invalid/Program Files/(old)[x], retry after bridge', 'url [url omitted], retry after bridge'],
      ['path C:/Program Files/retry because please will/settings, the recovery text', 'path [path omitted], the recovery text'],
      ['url https://example.invalid/retry/because/please/will path, this recovery', 'url [url omitted], this recovery'],
      ['path configs/pjsip.conf, the recovery text', 'path [path omitted], the recovery text'],
      ['path retry/because/please/will/pjsip.conf; check this recovery', 'path [path omitted]; check this recovery'],
      ['PBX configs/pjsip.conf, the recovery text', '[path omitted], the recovery text'],
      ['office PBX/retry because/pjsip.conf; check this recovery', '[path omitted]; check this recovery'],
      ['"office PBX/retry because/pjsip.conf"', '"[path omitted]"'],
      ['HTTPS://example.invalid/config, the recovery text', '[url omitted], the recovery text'],
      ['FILE:///C:/Program Files/pjsip.conf; this recovery', '[url omitted]; this recovery'],
    ]) {
      if (redactNoticeText(input) !== expected) throw new Error('Redaction span fixture failed: ' + input);
    }
    for (const row of ATTENTION_STRUCTURED_NOTICE_PRODUCERS) {
      const file = row.file === 'App.tsx' ? 'app' : 'generated';
      const broken = { ...sources, [file]: sources[file].replace(row.marker, '') };
      let turnedRed = false;
      try { verifyAttentionStructuredNoticeProducers({ app: broken.app, generated: broken.generated }); } catch { turnedRed = true; }
      if (!turnedRed) throw new Error('Structured notice producer fixture stayed green for ' + row.id);
      verifyAttentionStructuredNoticeProducers({ app: sources.app, generated: sources.generated });
    }
    for (const key of ['password', 'token', 'secret', 'PIN', 'API key', 'access token']) {
      const input = '"' + key + ': alpha beta"';
      const expected = '"' + key + ': [redacted]"';
      if (redactNoticeText(input) !== expected) throw new Error('Quoted credential fixture failed: ' + key);
    }
    const repeated = 'credential alpha then alpha';
    const repeatedSpans = sensitiveSpansForValue(repeated, 'alpha', 'credential', 'body');
    if (repeatedSpans.length !== 2 || redactNoticeText(repeated, repeatedSpans, 'body') !== 'credential [redacted] then [redacted]') throw new Error('Repeated structured span fixture failed.');
    let fieldRejected = false;
    try { redactNoticeText('title', [{ field:'body', start:0, end:5, kind:'credential' }], 'title'); } catch { fieldRejected = true; }
    if (!fieldRejected) throw new Error('Structured field discriminator fixture stayed green.');
    let overlapRejected = false;
    try { redactNoticeText('abcdef', [{ field:'body', start:0, end:4, kind:'path' }, { field:'body', start:3, end:6, kind:'url' }], 'body'); } catch { overlapRejected = true; }
    if (!overlapRejected) throw new Error('Structured overlap fixture stayed green.');
    if (!sources.app.includes('if (raw === null) return;') || !sources.app.includes("if (raw === '')") || !sources.app.includes('Reset unreadable history')) throw new Error('Empty-history recovery surface is incomplete.');
    for (const row of ATTENTION_WIRING) {
      const markers = [row.controlDeclaration, row.controlConstruction, row.durableKey, ...row.writerMarkers, ...row.setterMarkers, ...row.consumerMarkers];
      for (const marker of markers) {
        const broken = removeOwned(sources, marker);
        let turnedRed = false;
        try { verifyAttentionWiring(broken); } catch { turnedRed = true; }
        if (!turnedRed) throw new Error('Attention wiring negative fixture stayed green for ' + row.id + ': ' + marker);
        verifyAttentionWiring(sources);
      }
    }
    for (const row of ATTENTION_MUTATION_INVENTORY) {
      const sourceBroken = removeMutationCallback(sources, row);
      let sourceTurnedRed = false;
      try { verifyAttentionMutationInventory({ app: sourceBroken.app, generated: sourceBroken.generated }); } catch { sourceTurnedRed = true; }
      if (!sourceTurnedRed) throw new Error('Mutation source negative fixture stayed green at ' + row.file + ':' + row.line);
      verifyAttentionMutationInventory({ app: sources.app, generated: sources.generated });
    }
    const unlistedRow = ATTENTION_MUTATION_INVENTORY[0];
    const unlistedSource = replaceMutationArgument(sources, unlistedRow, "'unlisted-source-callback'");
    let unlistedTurnedRed = false;
    try { verifyAttentionMutationInventory({ app: unlistedSource.app, generated: unlistedSource.generated }); } catch { unlistedTurnedRed = true; }
    if (!unlistedTurnedRed) throw new Error('Source-unlisted callback fixture stayed green.');
    verifyAttentionMutationInventory({ app: sources.app, generated: sources.generated });
    for (const row of ATTENTION_MUTATION_INVENTORY) {
      const brokenInventory = ATTENTION_MUTATION_INVENTORY.filter((candidate) => candidate !== row);
      let turnedRed = false;
      try { verifyAttentionMutationInventory({ app: sources.app, generated: sources.generated }, brokenInventory); } catch { turnedRed = true; }
      if (!turnedRed) throw new Error('Mutation inventory negative fixture stayed green at ' + row.file + ':' + row.line);
      verifyAttentionMutationInventory({ app: sources.app, generated: sources.generated });
    }
    const severityGreenFixtures = [];
    const severityAmbiguousFixtures = [];
    const severityRowsBefore = ATTENTION_SEVERITY_PRODUCERS.length;
    for (const row of ATTENTION_SEVERITY_PRODUCERS) {
      const file = row.file === 'App.tsx' ? 'app' : 'generated';
      let broken;
      try { broken = replaceProducer(sources, row, 'notifyInvalid'); } catch (error) {
        severityAmbiguousFixtures.push({ row: row.id, reason: String(error?.message ?? error) });
        continue;
      }
      let turnedRed = false;
      try { verifyAttentionSeverityProducers({ app: broken.app, generated: broken.generated }); } catch { turnedRed = true; }
      if (!turnedRed) severityGreenFixtures.push(row.id);
      verifyAttentionSeverityProducers(sources);
    }
    if (severityRowsBefore !== ATTENTION_SEVERITY_PRODUCERS.length) throw new Error('Severity producer row count changed during the all-rows fixture.');
    if (severityGreenFixtures.length || severityAmbiguousFixtures.length) {
      throw new Error('Severity negative fixtures stayed green or ambiguous: ' + JSON.stringify({ rows: severityRowsBefore, green: severityGreenFixtures, ambiguous: severityAmbiguousFixtures }));
    }
    for (const route of ATTENTION_SEVERITY_ROUTES) {
      const file = route.file === 'App.tsx' ? 'app' : 'generated';
      const first = route.branches[0];
      const entry = ATTENTION_SEVERITY_PRODUCERS.find((candidate) => candidate.file === route.file && candidate.helper === first.helper);
      if (!entry) throw new Error('Severity route fixture has no inventory entry: ' + route.id);
      const broken = replaceProducer(sources, entry, 'notifyInvalid');
      let turnedRed = false;
      try { verifyAttentionSeverityProducers({ app: broken.app, generated: broken.generated }); } catch { turnedRed = true; }
      if (!turnedRed) throw new Error('Severity route negative fixture stayed green for ' + route.id);
      verifyAttentionSeverityProducers(sources);
    }
    console.log('PASS: attention wiring, mutation, and severity Chuts green; every exact matrix fixture turned red and restored green.');
  `;
  const temporarySource = resolve(root, '.attention-inventory-check.mjs');
  if (existsSync(temporarySource)) throw new Error(`Refusing to overwrite existing ${temporarySource}.`);
  writeFileSync(temporarySource, source, 'utf8');
  try {
    const command = process.platform === 'win32' ? process.env.ComSpec : 'npx';
    const args = process.platform === 'win32'
      ? ['/d', '/s', '/c', `npx --yes tsx ${temporarySource}`]
      : ['--yes', 'tsx', temporarySource];
    const output = execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8',
    });
    process.stdout.write(output);
  } finally {
    rmSync(temporarySource, { force: true });
  }
}

try {
  const matrix = validateSurfaceInventory(readJson('console/inventories/surface-completeness.json'), { allowUnverified, root, currentCommit });
  const desktop = validateFeatureRegistry(readJson('console/app/feature-registry.json'), { surface: 'windows-console', root, currentCommit });
  const site = validateFeatureRegistry(readJson('console/site/feature-registry.json'), { surface: 'pages-site', root, currentCommit });
  const parity = validateParityInventory(readJson('console/inventories/design-parity.json'), { allowUnverified });
  const exemptions = readJson('console/inventories/exemptions.json');
  if (exemptions.schemaVersion !== 2 || !Array.isArray(exemptions.exemptions) || exemptions.exemptions.length !== 0) throw new Error('exemptions: canonical feature set must have no exemptions');
  console.log(`PASS: ${matrix.surfaces} exact surfaces x ${matrix.featuresPerSurface} canonical features = ${matrix.rows} rows.`);
  console.log(`PASS: desktop registry ${desktop.features} features; site registry ${site.features} features; ${parity.destinations} design destinations and ${parity.transientStates} transient states.`);
  console.log(`PASS: all converter and Ollama rows remain required; exemptions=${exemptions.exemptions.length}.`);
  verifyAttentionWiring();
  const evidence = verifyEvidenceOnDisk(readJson('console/inventories/surface-completeness.json'), { root });
  const exemptionProof = verifyExemptions(readJson('console/inventories/surface-completeness.json'), exemptions);
  console.log(`PASS: attention wiring, mutation, and severity Chuts green; ${evidence.verifiedRows} verified rows and ${evidence.checked} claimed artifacts resolved.`);
  console.log(`PASS: evidence exemptions=${exemptionProof.exemptRows}.`);
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
