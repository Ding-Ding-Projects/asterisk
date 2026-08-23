import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { ORDER, RAIL, SCREENS } from '../../app/renderer/src/generated/console';
import { PBX_FEATURES } from '../../app/renderer/src/pbx-admin-model';
import { PBX_RAIL_IDS, railForFeature } from '../../app/renderer/src/pbx-rail-mapping';
import {
  PBX_ADMIN_RAIL,
  advancedScreenId,
  registerPbxAdminScreens,
} from '../../app/renderer/src/pbx-admin-screens';

const appUrl = new URL('../../app/renderer/src/PbxAdminApp.tsx', import.meta.url);
const integratedUrl = new URL('../../app/renderer/src/PbxAdminIntegratedApp.tsx', import.meta.url);
const mainUrl = new URL('../../app/renderer/src/main.tsx', import.meta.url);

registerPbxAdminScreens();

const merged = PBX_FEATURES.filter((feature) => feature.delegateScreen);
const unmerged = PBX_FEATURES.filter((feature) => !feature.delegateScreen);

test('there is no catalogue-only PBX Admin rail: every feature is merged into a real destination or routed to a real rail', () => {
  const rails = RAIL as unknown as Array<{ id?: string }>;
  assert.ok(
    !rails.some((rail) => rail.id === PBX_ADMIN_RAIL),
    'PBX_ADMIN_RAIL is registered — some feature was not routed to a real rail; check railForFeature coverage',
  );
});

test('a feature with a real destination is not also registered as a second screen', () => {
  const screens = SCREENS as unknown as Record<string, unknown>;
  for (const feature of merged) {
    const id = advancedScreenId(feature);
    assert.equal(screens[id], undefined, `${feature.label} has both a delegate (${feature.delegateScreen}) and its own screen ${id} — duplicate destination`);
    assert.ok(!ORDER.includes(id), `${id} should not appear in console order; it delegates to ${feature.delegateScreen}`);
  }
});

test('every non-delegate feature is a real generic screen on a real console rail, never PBX_ADMIN_RAIL', () => {
  const screens = SCREENS as unknown as Record<string, { rail?: string; kind?: string; groups?: unknown[] }>;
  for (const feature of unmerged) {
    const id = advancedScreenId(feature);
    assert.ok(ORDER.includes(id), `${id} is missing from console order / command palette`);
    const rail = screens[id]?.rail;
    assert.ok(rail && (PBX_RAIL_IDS as readonly string[]).includes(rail), `${id} is not on a real rail (got ${rail})`);
    assert.equal(rail, railForFeature(feature), `${id} rail does not match the documented mapping`);
    assert.equal(screens[id]?.kind, 'generic', `${id} must use the compiled generic/M3Control screen path`);
  }
});

test('every live-module alias points to an existing Ding destination', () => {
  const screens = SCREENS as unknown as Record<string, { rail?: string }>;
  for (const feature of merged) {
    const target = screens[feature.delegateScreen!];
    assert.ok(target, `${feature.label} delegates to missing screen ${feature.delegateScreen}`);
    assert.ok(target.rail, `${feature.delegateScreen} has no navigation rail`);
  }
});

test('PBX Admin uses bounded desktop actions and never exposes a raw command or OS shell', async () => {
  const source = await readFile(appUrl, 'utf8');
  for (const action of [
    'server.list',
    'pbx.config',
    'pbx.plan',
    'pbx.apply',
    'history.list',
    'history.restore',
    'media.list',
    'media.upload',
    'media.remove',
  ]) {
    assert.match(source, new RegExp(`adminRequest\\('${action.replace('.', '\\.')}'`), `missing ${action} wiring`);
  }

  assert.doesNotMatch(source, /pbx\.command/u, 'PBX Admin must not expose the Asterisk command action');
  assert.doesNotMatch(source, /child_process|exec\(|spawn\(|powershell|cmd\.exe|wsl\.exe/u, 'renderer must not execute an operating-system shell');
  assert.match(source, /kind: 'text'/u, 'configuration values must use the design-system text control');
  assert.match(source, /kind: 'select'/u, 'selection must use the design-system select control');
  assert.match(source, /kind: 'segmented'/u, 'actions must use the design-system segmented control');
  assert.match(source, /kind: 'file'/u, 'media upload must use the design-system file control');
  assert.match(source, /kind: 'switch'/u, 'a yes/no Asterisk value must use the design-system switch control, not free text');
  assert.match(source, /this\.areYouSure/u, 'destructive / live writes must pass through the existing confirmation dialog');
});

test('live/report standard modules route through existing Ding screens instead of cloning UI', async () => {
  const source = await readFile(integratedUrl, 'utf8');
  assert.match(source, /featureForAdvancedScreen/u);
  assert.match(source, /delegateScreen/u);
  assert.match(source, /this\.setState\(\{ screen: delegate, railId: target\.rail \}/u);
  assert.doesNotMatch(source, /createRoot|document\.createElement|position:\s*fixed|backdrop-filter/u);
});

test('there is one application shell root; PBX Admin is not a floating or parallel workspace', async () => {
  const [appSource, integratedSource, mainSource] = await Promise.all([
    readFile(appUrl, 'utf8'),
    readFile(integratedUrl, 'utf8'),
    readFile(mainUrl, 'utf8'),
  ]);
  assert.doesNotMatch(appSource, /createRoot|position:\s*fixed|backdrop-filter/u);
  assert.doesNotMatch(integratedSource, /createRoot|position:\s*fixed|backdrop-filter/u);
  assert.match(mainSource, /createRoot\(document\.getElementById\('root'\)!\)\.render\(<React\.StrictMode><PbxAdminIntegratedApp/u);
  assert.doesNotMatch(mainSource, /PbxAdminWorkspace|pbx-admin-workspace-host/u);
});
