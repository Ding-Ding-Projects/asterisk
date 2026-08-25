/**
 * Contract: browser-extension-download-surfaces. The honest state is "absent" --
 * this is a desktop console for an Asterisk PBX. There is no browser extension in
 * this repository, and no Start-download / Downloading / completion dialog trio
 * anywhere in the renderer.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const rendererSrcDir = resolve(root, 'app/renderer/src');
const rendererFiles = readdirSync(rendererSrcDir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
const rendererSource = rendererFiles.map((f) => read(`app/renderer/src/${f}`)).join('\n');

test('the implementation registry carries a row for browser-extension-download-surfaces, marked absent', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['browser-extension-download-surfaces'];
  assert.ok(row, 'no browser-extension-download-surfaces row in app/feature-registry.json');
  assert.equal(row.state, 'absent', 'this project may have grown a browser extension -- re-check this test, not just the registry');
  assert.deepEqual(row.files, [], 'an absent row should name no implementation files');
});

test('there is no manifest.json anywhere in the repository describing a browser extension', () => {
  const walk = (dir) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'release') continue;
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        const found = walk(full);
        if (found) return found;
      } else if (entry.name === 'manifest.json') {
        const content = readFileSync(full, 'utf8');
        if (/"manifest_version"/u.test(content)) return full;
      }
    }
    return null;
  };
  const found = walk(resolve(root, 'app'));
  assert.equal(found, null, `a browser-extension manifest was found at ${found} -- the "absent" state needs re-checking`);
});

test('no Start download, Downloading, or download-complete dialog surface exists in the renderer', () => {
  assert.doesNotMatch(rendererSource, /start.?download.?dialog/iu, 'a Start download dialog now exists -- re-check the "absent" state');
  assert.doesNotMatch(rendererSource, /downloading.?dialog/iu, 'a Downloading dialog now exists -- re-check the "absent" state');
});

test('the repository is genuinely a desktop console, not a browser extension host', () => {
  const pkg = json('package.json');
  assert.notEqual(pkg.main, undefined, 'package.json has no main entry, which is unexpected for an Electron desktop app');
  assert.doesNotMatch(JSON.stringify(pkg), /browser_action|content_scripts/iu, 'package.json now carries extension-manifest fields');
});

test('the documentation article honestly says the surface is not implemented, on both surfaces', () => {
  const doc = read('docs/platform/browser-extension-download-surfaces.md');
  assert.match(doc, /Desktop application:\*\*\s*Not implemented/u, 'the doc no longer says the desktop console lacks this surface');
  assert.match(doc, /Documentation website:\*\*\s*Not implemented/u, 'the doc no longer says the site lacks this surface');
});
