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
    import { ATTENTION_WIRING, verifyAttentionSeverityProducers, verifyAttentionWiring } from './console/app/renderer/src/attention-modes.ts';
    const root = resolve(${JSON.stringify(root)});
    const sources = {
      design: readFileSync(resolve(root, 'design/Asterisk Console M3.dc.html'), 'utf8'),
      app: readFileSync(resolve(root, 'console/app/renderer/src/App.tsx'), 'utf8'),
      generated: readFileSync(resolve(root, 'console/app/renderer/src/generated/console.tsx'), 'utf8'),
      module: readFileSync(resolve(root, 'console/app/renderer/src/attention-modes.ts'), 'utf8'),
    };
    verifyAttentionWiring(sources);
    verifyAttentionSeverityProducers(sources);
    for (const row of ATTENTION_WIRING) {
      const broken = { ...sources, design: sources.design.replace(new RegExp('\\\\b' + row.control + '\\\\b'), row.control + '_removed') };
      let turnedRed = false;
      try { verifyAttentionWiring(broken); } catch { turnedRed = true; }
      if (!turnedRed) throw new Error('Attention wiring negative fixture stayed green for ' + row.control + '.');
    }
    verifyAttentionWiring(sources);
    const severityBroken = { ...sources, generated: sources.generated.replace("notifyWarning('Wrong tone", "notifyInfo('Wrong tone") };
    let severityTurnedRed = false;
    try { verifyAttentionSeverityProducers(severityBroken); } catch { severityTurnedRed = true; }
    if (!severityTurnedRed) throw new Error('Severity negative fixture stayed green.');
    verifyAttentionSeverityProducers(sources);
    console.log('PASS: attention wiring and severity Chuts green, deliberate red fixtures rejected, restored fixtures green.');
  `;
  const output = execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', source], {
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
