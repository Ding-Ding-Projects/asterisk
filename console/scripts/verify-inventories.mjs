#!/usr/bin/env node
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { validateSurfaceInventory, validateParityInventory } from './inventory-validation.mjs';
import { verifyEvidenceOnDisk, verifyExemptions } from './evidence-on-disk.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const allowUnverified = process.argv.includes('--allow-unverified');
const readJson = (relativePath) => JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));

function verifyAttentionWiring() {
  const source = `
    import { readFileSync } from 'node:fs';
    import { resolve } from 'node:path';
    import { ATTENTION_MUTATION_INVENTORY, ATTENTION_SEVERITY_PRODUCERS, ATTENTION_SEVERITY_ROUTES, ATTENTION_WIRING, redactNoticeText, verifyAttentionMutationInventory, verifyAttentionSeverityProducers, verifyAttentionWiring } from './console/app/renderer/src/attention-modes.ts';
    const root = resolve(${JSON.stringify(root)});
    const sources = {
      design: readFileSync(resolve(root, 'design/Asterisk Console M3.dc.html'), 'utf8'),
      app: readFileSync(resolve(root, 'console/app/renderer/src/App.tsx'), 'utf8'),
      generated: readFileSync(resolve(root, 'console/app/renderer/src/generated/console.tsx'), 'utf8'),
      module: readFileSync(resolve(root, 'console/app/renderer/src/attention-modes.ts'), 'utf8'),
    };
    const removeOwned = (input, marker) => {
      const next = { ...input };
      const sourceText = next[marker.owner];
      const count = sourceText.split(marker.text).length - 1;
      if (count !== 1) throw new Error('Negative fixture marker must have one owner match, found ' + count + ': ' + marker.text);
      next[marker.owner] = sourceText.replace(marker.text, '');
      return next;
    };
    const replaceAt = (input, file, line, column, oldText, newText) => {
      const next = { ...input };
      const lines = next[file].split(/\\r?\\n/);
      const current = lines[line - 1];
      if (current.slice(column, column + oldText.length) !== oldText) throw new Error('Severity span drift at ' + file + ':' + line + ':' + column);
      lines[line - 1] = current.slice(0, column) + newText + current.slice(column + oldText.length);
      next[file] = lines.join('\\n');
      return next;
    };
    const removeMutationCallback = (input, row) => {
      const key = row.file === 'App.tsx' ? 'app' : 'generated';
      const call = 'onUserMutation(' + row.argument + ')';
      const next = { ...input };
      const lines = next[key].split(/\\r?\\n/);
      const current = lines[row.line - 1];
      if (current.split(call).length - 1 !== 1) throw new Error('Mutation callback span drift at ' + row.file + ':' + row.line);
      lines[row.line - 1] = current.replace(call, '');
      next[key] = lines.join('\\n');
      return next;
    };
    const replaceMutationArgument = (input, row, replacement) => {
      const key = row.file === 'App.tsx' ? 'app' : 'generated';
      const call = 'onUserMutation(' + row.argument + ')';
      const replacementCall = 'onUserMutation(' + replacement + ')';
      const next = { ...input };
      const lines = next[key].split(/\\r?\\n/);
      const current = lines[row.line - 1];
      if (current.split(call).length - 1 !== 1) throw new Error('Mutation callback replacement span drift at ' + row.file + ':' + row.line);
      lines[row.line - 1] = current.replace(call, replacementCall);
      next[key] = lines.join('\\n');
      return next;
    };
    verifyAttentionWiring(sources);
    verifyAttentionMutationInventory({ app: sources.app, generated: sources.generated });
    verifyAttentionSeverityProducers(sources);
    for (const [input, expected] of [
      ['path C:/Program Files/Ding PBX/settings (old),semi;tail', 'path [path omitted]'],
      ['url https://example.invalid/Program Files/(old)[x],semi;tail', 'url [url omitted]'],
    ]) {
      if (redactNoticeText(input) !== expected) throw new Error('Redaction span fixture failed: ' + input);
    }
    for (const row of ATTENTION_WIRING) {
      const markers = [row.designMarker, row.controlConstruction, row.durableKey, ...row.writerMarkers, ...row.setterMarkers, ...row.consumerMarkers];
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
    for (const row of ATTENTION_SEVERITY_PRODUCERS) {
      const file = row.file === 'App.tsx' ? 'app' : 'generated';
      const broken = replaceAt(sources, file, row.line, row.column, row.helper, 'notifyInvalid');
      let turnedRed = false;
      try { verifyAttentionSeverityProducers({ app: broken.app, generated: broken.generated }); } catch { turnedRed = true; }
      if (!turnedRed) throw new Error('Severity negative fixture stayed green at ' + row.file + ':' + row.line + ':' + row.column);
      verifyAttentionSeverityProducers(sources);
    }
    for (const route of ATTENTION_SEVERITY_ROUTES) {
      const file = route.file === 'App.tsx' ? 'app' : 'generated';
      const first = route.branches[0];
      const entry = ATTENTION_SEVERITY_PRODUCERS.find((candidate) => candidate.file === route.file && candidate.line === route.line && candidate.helper === first.helper);
      if (!entry) throw new Error('Severity route fixture has no inventory entry: ' + route.id);
      const broken = replaceAt(sources, file, entry.line, entry.column, entry.helper, 'notifyInvalid');
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
  const inventory = readJson('console/inventories/surface-completeness.json');
  const surface = validateSurfaceInventory(inventory, { allowUnverified });
  const parity = validateParityInventory(readJson('console/inventories/design-parity.json'), { allowUnverified });
  const evidence = verifyEvidenceOnDisk(inventory, { root });
  const exemptions = verifyExemptions(inventory, readJson('console/inventories/exemptions.json'));
  verifyAttentionWiring();
  const rows = surface.surfaces * surface.featuresPerSurface;
  console.log(`PASS: ${surface.surfaces} surfaces x ${surface.featuresPerSurface} exact feature rows; ${parity.destinations} destinations; ${parity.transientStates} transient-state families.`);
  console.log(`PASS: ${evidence.verifiedRows}/${rows} rows claim verified; ${evidence.checked} claimed evidence artifacts resolved on disk.`);
  console.log(`PASS: ${exemptions.exemptRows} row(s) exempt, each with a recorded reason, decider and date.`);
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
