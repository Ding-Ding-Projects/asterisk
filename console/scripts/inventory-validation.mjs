const requiredTemplateKeys = [
  'implementation', 'documentation', 'localization', 'localCheck', 'builtInteraction', 'capture',
];
const parityTemplateKeys = [
  'referenceRoute', 'builtRoute', 'referenceCapture', 'builtCapture', 'sideBySide', 'visualDiff',
  'regionLedger', 'chromeParity', 'materialAudit',
];
/** Every area role the chrome-parity bar may declare. */
const parityAreaRoles = ['chrome', 'data'];
/**
 * Which shell area carries data and which is chrome, pinned by exact value.
 *
 * Pinned rather than merely shape-checked because this map IS the bar: moving one area from
 * `chrome` to `data` hides it from every destination's comparison at once, silently, and a
 * validator that only asked "is the role one of two words" would wave that through. Changing
 * the bar should mean changing this line and arguing for it, exactly as changing a rail count
 * does above.
 */
const parityAreaRoleMap = {
  brandCell: 'chrome', menuCell: 'chrome', commandCell: 'chrome', statusCell: 'data',
  tabStrip: 'chrome', rail: 'chrome', sectionList: 'chrome', contentPane: 'data',
};

function exactSet(actual, expected, label) {
  if (actual.length !== expected.length) throw new Error(`${label}: expected ${expected.length} entries, found ${actual.length}`);
  const unique = new Set(actual);
  if (unique.size !== actual.length) throw new Error(`${label}: duplicate identifier found`);
  for (const value of expected) if (!unique.has(value)) throw new Error(`${label}: missing exact identifier '${value}'`);
  for (const value of unique) if (!expected.includes(value)) throw new Error(`${label}: unexpected identifier '${value}'`);
}

function exactKeys(record, expected, label) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(`${label}: object required`);
  exactSet(Object.keys(record), expected, label);
  for (const key of expected) {
    if (typeof record[key] !== 'string' || !record[key].includes('{id}')) throw new Error(`${label}.${key}: nonempty {id} template required`);
  }
}

export function validateSurfaceInventory(data, { allowUnverified = false } = {}) {
  if (data?.schemaVersion !== 1) throw new Error('surface inventory: schemaVersion 1 required');
  if (!Array.isArray(data.requiredFeatureIds) || data.requiredFeatureIds.length === 0) throw new Error('surface inventory: requiredFeatureIds must be nonempty');
  exactSet(data.requiredFeatureIds, data.requiredFeatureIds, 'requiredFeatureIds');
  if (!Array.isArray(data.surfaces)) throw new Error('surface inventory: surfaces array required');
  exactSet(data.surfaces.map((surface) => surface.id), ['windows-console', 'pages-site'], 'surface identifiers');
  for (const surface of data.surfaces) {
    exactKeys(surface.evidenceTemplates, requiredTemplateKeys, `${surface.id}.evidenceTemplates`);
    if (!Array.isArray(surface.features)) throw new Error(`${surface.id}: features array required`);
    exactSet(surface.features.map((feature) => feature.id), data.requiredFeatureIds, `${surface.id}.features`);
    for (const feature of surface.features) {
      exactSet(Object.keys(feature), ['id', 'status'], `${surface.id}.${feature.id} fields`);
      /* `exempt` is a decision, not a gap. A feature the owner has deliberately excluded
       * has to be recorded as excluded, or it reads to the next person as something that
       * was forgotten — and somebody eventually "fixes" it by building a thing nobody
       * wanted. It is only accepted alongside a written reason, checked separately, so
       * the status cannot become a quiet way of clearing a row. */
      if (!['verified', 'unverified', 'exempt'].includes(feature.status)) throw new Error(`${surface.id}.${feature.id}: invalid status`);
      if (!allowUnverified && feature.status === 'unverified') throw new Error(`${surface.id}.${feature.id}: evidence remains unverified`);
    }
  }
  return { surfaces: data.surfaces.length, featuresPerSurface: data.requiredFeatureIds.length };
}

const destinationIds = [
  'dash','live','endpoints','trunks','trunkauth','canvas','ivr','queues',
  'voicemail','confbridge','moh','codecs','cdr','ami','modules','logger','security','cli',
  'memory','sync','skills','hub','vocab','ops','secrets',
  'servers','arcade','notifications','history','customise','appearance','about',
];
const transientStates = [
  'appearOpen','ceremonyOpen','ctxOpen','infoOpen','lockOpen','onboardOpen','paletteOpen','regexOpen',
  'renameOpen','subOpen','sureOpen','tabColourOpen','tabFilterOpen','toastOpen','tourOpen','unlockOpen','wizardOpen',
];
const parityStatuses = ['verified', 'compiled', 'unverified'];
const exactRails = { pbx: 8, media: 4, data: 2, system: 4, agent: 7, app: 7 };
const exactBindings = {
  total: 265, click: 212, change: 10, input: 10, contextmenu: 9,
  dragstart: 4, dragover: 4, drop: 4, dragend: 4, mousedown: 5, mouseenter: 1, mouseleave: 1, mouseup: 1,
};

/**
 * The shape of the chrome-parity bar's own declaration.
 *
 * This is the bar a `verified` row rests on, so its declaration is the one place where
 * widening a mask, softening a tolerance or dropping the compared-fraction floor would
 * quietly make every row easier to pass. Each of those is refused here by exact value
 * rather than by presence: a tolerance of anything but 0 is a different bar, and a floor
 * that has drifted downward is a mask nobody argued for.
 */
function validateChromeParityBar(bar) {
  if (!bar || typeof bar !== 'object') throw new Error('design parity inventory: chromeParityBar declaration required');
  if (bar.tolerance !== 0) throw new Error(`design parity inventory: chromeParityBar.tolerance must be exactly 0, found ${JSON.stringify(bar.tolerance)} — a non-zero tolerance here is a number chosen until something passed`);
  if (bar.minimumComparedFraction !== 0.25) throw new Error(`design parity inventory: chromeParityBar.minimumComparedFraction must be exactly 0.25, found ${JSON.stringify(bar.minimumComparedFraction)}`);
  for (const key of ['what', 'whyToleranceIsZero', 'whyThereIsAMinimum', 'howRegionsAreObtained', 'howExclusionsCombine', 'areaRoleJudgement']) {
    if (typeof bar[key] !== 'string' || bar[key].trim().length === 0) throw new Error(`design parity inventory: chromeParityBar.${key} must say what it means`);
  }
  const areas = bar.areas;
  if (!areas || typeof areas !== 'object' || Object.keys(areas).length === 0) throw new Error('design parity inventory: chromeParityBar.areas declares no areas');
  exactSet(Object.keys(areas), Object.keys(parityAreaRoleMap), 'chrome-parity area identifiers');
  let dataAreas = 0;
  let chromeAreas = 0;
  for (const [name, area] of Object.entries(areas)) {
    if (!parityAreaRoles.includes(area?.role)) throw new Error(`design parity inventory: chromeParityBar area '${name}' has role ${JSON.stringify(area?.role)}, not one of ${parityAreaRoles.join('/')}`);
    if (area.role !== parityAreaRoleMap[name]) throw new Error(`design parity inventory: chromeParityBar area '${name}' is declared '${area.role}' where the pinned bar says '${parityAreaRoleMap[name]}' — moving an area between chrome and data changes what every destination is measured against`);
    if (typeof area.why !== 'string' || area.why.trim().length === 0) throw new Error(`design parity inventory: chromeParityBar area '${name}' gives no reason for its role — an area's role is a judgement and has to say what it rests on`);
    if (area.role === 'data') dataAreas += 1; else chromeAreas += 1;
  }
  // Kept even though the pinned map above already guarantees both: this is the property the
  // bar is meaningless without, and a future edit to the pinned map should have to trip over
  // it rather than quietly produce a bar that compares everything or nothing.
  if (dataAreas === 0) throw new Error("design parity inventory: chromeParityBar declares no 'data' area, so the bar would compare the sample content it exists to exclude");
  if (chromeAreas === 0) throw new Error("design parity inventory: chromeParityBar declares no 'chrome' area, so the bar would compare nothing and pass vacuously");
}

export function validateParityInventory(data, { allowUnverified = false } = {}) {
  if (data?.schemaVersion !== 1) throw new Error('design parity inventory: schemaVersion 1 required');
  if (data.sourceArchive?.sha256 !== '9A4284745A745C18A18B0A23D2A2F5851A79F9B6EFCBC5EE30EDCD69CEA2863F') throw new Error('design parity inventory: source archive SHA-256 drift');
  if (data.sourceArchive?.verification !== 'independent-authoritative-audit') throw new Error('design parity inventory: source verification label drift');
  exactKeys(data.evidenceTemplates, parityTemplateKeys, 'design parity evidenceTemplates');
  validateChromeParityBar(data.chromeParityBar);
  if (data.auditBaseline?.destinationCount !== 32) throw new Error('design parity inventory: destination count must be 32');
  exactSet(Object.keys(data.auditBaseline?.railCounts ?? {}), Object.keys(exactRails), 'rail identifiers');
  for (const [rail, count] of Object.entries(exactRails)) if (data.auditBaseline.railCounts[rail] !== count) throw new Error(`design parity inventory: rail '${rail}' count drift`);
  exactSet(Object.keys(data.auditBaseline?.declarativeBindings ?? {}), Object.keys(exactBindings), 'binding identifiers');
  for (const [event, count] of Object.entries(exactBindings)) if (data.auditBaseline.declarativeBindings[event] !== count) throw new Error(`design parity inventory: binding '${event}' count drift`);
  const bindingSum = Object.entries(exactBindings).filter(([event]) => event !== 'total').reduce((sum, [, count]) => sum + count, 0);
  if (bindingSum !== exactBindings.total) throw new Error('design parity validator: hard-coded binding arithmetic is invalid');
  if (data.auditBaseline.distinctExpressionCount !== 168) throw new Error('design parity inventory: distinct expression count drift');
  if (data.auditBaseline.controlCount !== 479) throw new Error('design parity inventory: control count drift');
  if (data.auditBaseline.transientStateFamilyCount !== 17) throw new Error('design parity inventory: transient-state count drift');
  if (!Array.isArray(data.destinations)) throw new Error('design parity inventory: destinations array required');
  exactSet(data.destinations.map((destination) => destination.id), destinationIds, 'destination identifiers');
  for (const destination of data.destinations) {
    exactSet(Object.keys(destination), ['rail', 'id', 'status'], `destination ${destination.id} fields`);
    if (!(destination.rail in exactRails)) throw new Error(`destination ${destination.id}: invalid rail '${destination.rail}'`);
    if (!parityStatuses.includes(destination.status)) throw new Error(`destination ${destination.id}: invalid status`);
    if (!allowUnverified && destination.status !== 'verified') throw new Error(`destination ${destination.id}: evidence remains ${destination.status}`);
  }
  // `compiled` is a weaker claim than `verified`: the destination was rendered from the
  // compiled design source and asserted, but no reference/built capture diff exists yet.
  if (data.destinations.some((destination) => destination.status === 'compiled')) {
    const evidence = data.compiledEvidence;
    if (typeof evidence?.test !== 'string' || !evidence.test.endsWith('.test.tsx')) {
      throw new Error('design parity inventory: a compiled destination requires compiledEvidence.test naming the rendering test');
    }
    if (typeof evidence.method !== 'string' || !evidence.method.includes('compile-design.mjs')) {
      throw new Error('design parity inventory: compiledEvidence.method must name the design compiler');
    }
  }
  for (const [rail, expected] of Object.entries(exactRails)) {
    const actual = data.destinations.filter((destination) => destination.rail === rail).length;
    if (actual !== expected) throw new Error(`destination rail '${rail}': expected ${expected}, found ${actual}`);
  }
  exactSet(data.transientStateFamilies ?? [], transientStates, 'transient-state identifiers');
  return { destinations: data.destinations.length, transientStates: data.transientStateFamilies.length };
}
