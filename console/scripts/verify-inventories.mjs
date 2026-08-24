#!/usr/bin/env node
import { readFileSync } from 'node:fs';
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
    import { ATTENTION_MUTATION_INVENTORY, ATTENTION_SEVERITY_PRODUCERS, ATTENTION_WIRING, verifyAttentionMutationInventory, verifyAttentionSeverityProducers, verifyAttentionWiring } from './console/app/renderer/src/attention-modes.ts';
    const root = resolve(${JSON.stringify(root)});
    const sources = {
      design: readFileSync(resolve(root, 'design/Asterisk Console M3.dc.html'), 'utf8'),
      app: readFileSync(resolve(root, 'console/app/renderer/src/App.tsx'), 'utf8'),
      generated: readFileSync(resolve(root, 'console/app/renderer/src/generated/console.tsx'), 'utf8'),
      module: readFileSync(resolve(root, 'console/app/renderer/src/attention-modes.ts'), 'utf8'),
    };
    const removeEverywhere = (input, marker) => {
      let count = 0;
      const next = {};
      for (const key of Object.keys(input)) {
        const sourceText = input[key];
        const matches = sourceText.split(marker).length - 1;
        count += matches;
        next[key] = sourceText.split(marker).join('');
      }
      if (count !== 1 && count < 1) throw new Error('Negative fixture marker was absent: ' + marker);
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
    verifyAttentionWiring(sources);
    verifyAttentionMutationInventory({ app: sources.app, generated: sources.generated });
    verifyAttentionSeverityProducers(sources);
    for (const row of ATTENTION_WIRING) {
      const markers = [row.designMarker, row.controlConstruction, row.durableKey, ...row.writerMarkers, ...row.setterMarkers, ...row.consumerMarkers];
      for (const marker of markers) {
        const broken = removeEverywhere(sources, marker);
        let turnedRed = false;
        try { verifyAttentionWiring(broken); } catch { turnedRed = true; }
        if (!turnedRed) throw new Error('Attention wiring negative fixture stayed green for ' + row.id + ': ' + marker);
        verifyAttentionWiring(sources);
      }
    }
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
    console.log('PASS: attention wiring, mutation, and severity Chuts green; every exact matrix fixture turned red and restored green.');
  `;
  const output = execFileSync(process.execPath, ['--experimental-strip-types', '--experimental-specifier-resolution=node', '--input-type=module', '-e', source], {
    cwd: root,
    encoding: 'utf8',
  });
  process.stdout.write(output);
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
