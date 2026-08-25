#!/usr/bin/env node
/**
 * The pure computation behind generate-design-parity-labels.mjs, split out so it can be
 * unit-tested with plain `node:test` (no `tsx`, no real catalog import, no disk I/O) — the
 * TypeScript-importing wrapper is the one part that genuinely needs a TS-capable runtime,
 * and it should be as thin as possible so the logic worth guarding is testable everywhere.
 */

// The design-parity audit's own rail vocabulary (console/inventories/design-parity.json)
// spells the system rail 'system'; the compiled catalog spells it 'sys'. Both are correct
// for their own document — this is the one place that translation happens.
export const RAIL_ID_TRANSLATION = Object.freeze({ sys: 'system' });

export function translateRail(railId) {
  return RAIL_ID_TRANSLATION[railId] ?? railId;
}

/**
 * @param {{destinations: Array<{id: string, rail: string}>}} inventory the design-parity.json inventory
 * @param {Array<{id: string, rail: string, label: string, title: string}>} catalogDestinations the compiled navigation catalog
 * @param {Array<{id: string, icon: string, label: string}>} [catalogRails] the compiled rail strip (RAIL) — used to click the correct rail icon button, since the rendered rail strip carries no visible label, only a Material Symbols icon glyph
 * @returns {{generatedBy: string, generatedFrom: string, note: string, destinationCount: number, labels: Record<string, {rail:string,label:string,title:string}>, rails: Record<string, {icon:string,label:string}>}}
 */
export function computeLabels(inventory, catalogDestinations, catalogRails = []) {
  const auditedIds = inventory.destinations.map((destination) => destination.id);
  const byId = new Map(catalogDestinations.map((destination) => [destination.id, destination]));

  const missing = auditedIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new Error(`generate-design-parity-labels: ${missing.length} audited destination id(s) no longer exist in the compiled catalog: ${missing.join(', ')}`);
  }

  const labels = {};
  const usedRails = new Set();
  for (const id of auditedIds) {
    const destination = byId.get(id);
    const translatedRail = translateRail(destination.rail);
    const auditedRail = inventory.destinations.find((d) => d.id === id).rail;
    if (translatedRail !== auditedRail) {
      throw new Error(`generate-design-parity-labels: '${id}' compiles to rail '${destination.rail}' (translated '${translatedRail}'), but the audit inventory records rail '${auditedRail}' — rail drift between the audit and the live design`);
    }
    labels[id] = { rail: translatedRail, label: destination.label, title: destination.title };
    usedRails.add(destination.rail);
  }

  const rails = {};
  for (const rail of catalogRails) {
    if (!usedRails.has(rail.id)) continue;
    rails[translateRail(rail.id)] = { icon: rail.icon, label: rail.label };
  }
  const missingRailIcons = [...usedRails].filter((railId) => !rails[translateRail(railId)]);
  if (missingRailIcons.length > 0) {
    throw new Error(`generate-design-parity-labels: ${missingRailIcons.length} rail(s) used by an audited destination have no icon in the compiled RAIL strip: ${missingRailIcons.join(', ')}`);
  }

  return {
    generatedBy: 'console/scripts/generate-design-parity-labels.mjs',
    generatedFrom: 'app/renderer/src/catalog.ts (compiled from design/*.dc.html)',
    note: 'id -> {rail, label, title} for the exact 32 destinations audited in inventories/design-parity.json, plus the rail icon strip (rails: railId -> {icon, label}) needed to click a rail button, since the rendered rail strip carries no visible text. Regenerate rather than hand-edit.',
    destinationCount: auditedIds.length,
    labels,
    rails,
  };
}

export function serializeLabels(generated) {
  return `${JSON.stringify(generated, null, 2)}\n`;
}
