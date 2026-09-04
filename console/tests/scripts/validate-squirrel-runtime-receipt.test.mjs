import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = fileURLToPath(new URL('.', import.meta.url));
const validator = join(here, '..', '..', 'scripts', 'validate-squirrel-runtime-receipt.mjs');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

test('Material Asterisk runtime receipt validator accepts a complete receipt and rejects a changed hash', () => {
  const root = mkdtempSync(join(tmpdir(), 'material-asterisk-runtime-receipt-test-'));
  try {
    const installer = Buffer.from('installer');
    const executable = Buffer.from('installed-executable');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    const ledger = Buffer.from('{"owned":true}');
    const installerPath = join(root, 'Material-Asterisk-Setup.exe');
    const executablePath = join(root, 'Material Asterisk.exe');
    const screenshotPath = join(root, 'installed.png');
    const ledgerPath = join(root, 'ledger.json');
    writeFileSync(installerPath, installer);
    writeFileSync(executablePath, executable);
    writeFileSync(screenshotPath, png);
    writeFileSync(ledgerPath, ledger);
    const now = Date.now();
    const receipt = {
      version: 1, sourceCommit: 'a'.repeat(40), installerPath, installerSha256: hash(installer), route: 'cheap-lowlevel-headless',
      installation: { setupExitCode: 0, installedExecutablePath: executablePath, installedExecutableSha256: hash(executable), candidateVersion: '0.1.0' },
      launch: { pid: 1234, hwnd: '0x1', windowTitle: 'Material Asterisk', className: 'Chrome_WidgetWin_1', processPath: executablePath, processImageSha256: hash(executable), width: 1280, height: 900, installedArtifact: true, screenshotPath, screenshotSha256: hash(png), screenshotWidth: 1, screenshotHeight: 1 },
      update: { feedUrl: 'https://example.test/releases/', observedStates: [{ state: 'available', at: new Date(now).toISOString() }, { state: 'downloading', at: new Date(now + 1000).toISOString() }, { state: 'ready-to-restart', at: new Date(now + 2000).toISOString() }], metadataValidated: true, packageHashValidated: true, unsignedWarningVisible: true, restartActionVisible: true, laterActionVisible: true, unsavedWorkProtectionVerified: true, targetVersion: '0.1.1', releaseNotesUrl: 'https://example.test/releases/0.1.1' },
      privacy: { visibleDesktopUntouched: true, disposableOperatingSystemBoundary: true, existingUserInstallationAbsent: true, taskOwnedProfile: true, unrelatedWindowsObserved: false },
      cleanup: { ledgerPath, ledgerSha256: hash(ledger), targetsAreExact: true, disposableBoundary: true },
    };
    const receiptPath = join(root, 'receipt.json');
    writeFileSync(receiptPath, JSON.stringify(receipt));
    let result = spawnSync(process.execPath, [validator, '--input', receiptPath], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    receipt.update.packageHashValidated = false;
    writeFileSync(receiptPath, JSON.stringify(receipt));
    result = spawnSync(process.execPath, [validator, '--input', receiptPath], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /packageHashValidated/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
