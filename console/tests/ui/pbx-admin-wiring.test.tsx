import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { ORDER, RAIL, SCREENS } from '../../app/renderer/src/generated/console';
import { PBX_FEATURES } from '../../app/renderer/src/pbx-admin-model';
import {
  PBX_ADMIN_RAIL,
  advancedScreenId,
  registerPbxAdminScreens,
} from '../../app/renderer/src/pbx-admin-screens';

const appUrl = new URL('../../app/renderer/src/PbxAdminApp.tsx', import.meta.url);
const mainUrl = new URL('../../app/renderer/src/main.tsx', import.meta.url);

registerPbxAdminScreens();

test('every PBX catalogue feature is a real generic screen in the compiled console shell', () => {
  const screens = SCREENS as unknown as Record<string, { rail?: string; kind?: string; groups?: unknown[] }>;
  const rails = RAIL as unknown as Array<{ id?: string }>;
  assert.ok(rails.some((rail) => rail.id === PBX_ADMIN_RAIL), 'PBX Admin rail is missing');

  for (const feature of PBX_FEATURES) {
    const id = advancedScreenId(feature);
    assert.ok(ORDER.includes(id), `${id} is missing from console order / command palette`);
    assert.equal(screens[id]?.rail, PBX_ADMIN_RAIL, `${id} is not on the PBX Admin rail`);
    assert.equal(screens[id]?.kind, 'generic', `${id} must use the compiled generic/M3Control screen path`);
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
  assert.match(source, /this\.areYouSure/u, 'destructive / live writes must pass through the existing confirmation dialog');
});

test('there is one application shell root; PBX Admin is not a floating or parallel workspace', async () => {
  const [appSource, mainSource] = await Promise.all([readFile(appUrl, 'utf8'), readFile(mainUrl, 'utf8')]);
  assert.doesNotMatch(appSource, /createRoot|position:\s*fixed|backdrop-filter/u);
  assert.match(mainSource, /createRoot\(document\.getElementById\('root'\)!\)\.render\(<React\.StrictMode><PbxAdminApp/u);
  assert.doesNotMatch(mainSource, /PbxAdminWorkspace|pbx-admin-workspace-host/u);
});
