/**
 * Contract: a companion extension may submit a handoff, but the desktop owns
 * the real decision, transfer snapshots, and dedicated result windows. This
 * deliberately proves no browser-extension package is claimed by this repo.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n');

const contract = read('shared/download-transfer.ts');
const mount = read('app/renderer/src/download-window-mount.tsx');
const start = read('app/renderer/src/download-start-surface.tsx');
const progress = read('app/renderer/src/download-progress-surface.tsx');
const complete = read('app/renderer/src/download-complete-surface.tsx');
const preload = read('app/electron/preload.ts');
const main = read('app/electron/main.ts');
const transfers = read('control-plane/download-transfer-manager.ts');
const nativeContract = read('shared/native-messaging.ts');
const nativeManifest = JSON.parse(read('native-messaging/com.dingdingprojects.asterisk.downloads.json'));

test('registers three dedicated download routes with factual window intents', () => {
  for (const kind of ['start', 'progress', 'complete']) {
    assert.match(contract, new RegExp(`kind: '${kind}', route: 'download/${kind}'`), `missing ${kind} registration`);
    assert.match(contract, new RegExp(`${kind}: \\{\\n    alwaysOnTop: true`), `missing always-on-top ${kind} intent`);
  }
  assert.match(contract, /start: \{[^}]*presentation: 'blocking-decision'/, 'Start must remain a real decision surface');
  assert.match(contract, /complete: \{[^}]*presentation: 'non-blocking-completion'/, 'completion must remain non-blocking');
  assert.match(mount, /value === 'start' \|\| value === 'progress' \|\| value === 'complete'/, 'dedicated window selector lost a route');
});

test('start, transfer, and completion surfaces operate against receipts and observed snapshots', () => {
  assert.match(start, /await client\.start\(handoff\)/, 'confirm must call the transfer boundary');
  assert.match(start, /await client\.cancelHandoff\(handoff\.handoffId\)/, 'cancel must call the transfer boundary');
  assert.match(progress, /useDownloadSnapshot\(client, transferId, initialSnapshot\)/, 'progress must read observed snapshots');
  for (const command of ['pause', 'resume', 'cancel']) {
    assert.match(progress, new RegExp(`action\\('${command}'\\)`), `${command} must issue its real command`);
  }
  assert.match(complete, /snapshot\.status === 'completed'/, 'completion must derive its outcome from a snapshot');
  assert.doesNotMatch(progress, /setInterval|setTimeout/, 'progress must never manufacture transfer progress locally');
});

test('preload and main constrain transfer commands to the dedicated bound windows', () => {
  for (const method of ['listPendingHandoffs', 'start', 'cancelHandoff', 'command', 'getSnapshot', 'subscribe']) {
    assert.match(preload, new RegExp(`${method}:`), `preload is missing downloads.${method}`);
  }
  assert.match(main, /Only a dedicated bound Start window may start a handoff\./, 'start must reject non-Start windows');
  assert.match(main, /Only a dedicated bound Start window may cancel its pending handoff\./, 'cancel must reject non-Start windows');
  assert.match(main, /Only the dedicated bound transfer window may issue this command\./, 'commands must reject unrelated windows');
  assert.match(main, /alwaysOnTop: true/, 'dedicated Electron windows must honor their intent');
  assert.match(main, /openDownloadWindow\('complete'/, 'terminal snapshots must open completion');
  assert.match(main, /openDownloadWindow\('progress'/, 'active snapshots must open progress');
});

test('the authenticated ingress accepts only one bounded extension handoff, never queue or transfer powers', () => {
  assert.equal(nativeManifest.name, 'com.dingdingprojects.asterisk.downloads');
  assert.deepEqual(nativeManifest.allowed_origins, ['chrome-extension://dnpkplcgjmipnndmghkhljjoefjhidab/']);
  assert.match(nativeContract, /type: 'download-handoff'/, 'native ingress must accept only the handoff message type');
  assert.match(nativeContract, /message\.extensionId === DOWNLOAD_EXTENSION_ID/, 'native ingress must bind the shipped extension identity');
  assert.match(main, /isNativeDownloadIngressMessage\(envelope\.payload\)/, 'desktop must repeat native ingress validation');
  assert.match(main, /acceptExtensionHandoff\(envelope\.payload\.handoff/, 'validated ingress must become a receipt-backed handoff');
  assert.match(transfers, /class DownloadTransferManager/, 'privileged transfer state must live in the control plane');
  assert.match(transfers, /download-transfers\.json/, 'snapshots must be persisted rather than renderer-only');
});

test('documentation names the real desktop and browser-local boundaries without inventing a shipped extension', () => {
  const doc = read('docs/platform/browser-extension-download-surfaces.md');
  assert.match(doc, /Desktop application:\*\* Implemented as three explicit routes/, 'documentation lost the desktop routes');
  assert.match(doc, /companion extension itself is not shipped in this repository/, 'documentation must keep the extension absence honest');
  assert.match(doc, /Documentation website:\*\* Implemented as a browser-local handoff equivalent/, 'documentation lost the browser-local equivalent');
  assert.match(doc, /does not receive native-extension handoffs, own the desktop transfer queue, or create always-on-top windows/, 'documentation must preserve site limitations');
});
