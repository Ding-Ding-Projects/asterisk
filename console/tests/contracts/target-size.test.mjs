/**
 * This app declares its own minimum target size -- 24 CSS pixels, WCAG 2.2 AA, written down in
 * accessibility-contract.ts -- and then shipped the two icon buttons that sit beside EVERY
 * control at 20x20, along with the tab close button and both table checkboxes. The contract
 * existed, the helper that checks a box against it existed, and nothing compared the two.
 *
 * Found by measuring the running app rather than by reading, which is the only way a rendered
 * size can be checked. This guard is the cheap half: it refuses a hard-coded pixel size below
 * the floor in the design sources, so the same regression cannot be typed back in.
 *
 * It cannot prove a control is big enough -- a size can come from padding, flex, or a class --
 * so it is a floor on what may be written down, not a substitute for measuring.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const MIN = 24;

const SOURCES = [
  ['the console design', '../../../design/Asterisk Console M3.dc.html'],
  ['the shared M3 control', '../../../design/M3 Control.dc.html'],
];

/**
 * Every `width:Npx; height:Npx` written onto an element that takes a click.
 *
 * Reads each opening tag's OWN style attribute rather than scanning the line, because a line
 * routinely holds a button and the small badge inside it. The first version of this check did
 * scan the line, and reported a 16px badge sitting inside a button with 6px/12px padding --
 * a control comfortably over the floor, flagged as under it.
 */
function hardCodedSizes(source) {
  const found = [];
  for (const tag of source.matchAll(/<(button|a)\b([^>]*)>/g)) {
    const style = /\sstyle="([^"]*)"/u.exec(tag[2]);
    if (!style) continue;
    const size = /width:\s*(\d+(?:\.\d+)?)px;\s*height:\s*(\d+(?:\.\d+)?)px/u.exec(style[1]);
    if (!size) continue;
    found.push({ width: Number(size[1]), height: Number(size[2]), what: '<' + tag[1] + ' ' + style[1].slice(0, 70) });
  }
  return found;
}

for (const [name, path] of SOURCES) {
  test(`no clickable element in ${name} is written smaller than the declared floor`, () => {
    const sizes = hardCodedSizes(read(path));
    assert.ok(sizes.length > 0,
      `no hard-coded button sizes were found in ${name} at all; the scan has stopped matching `
      + 'and would pass on anything');
    const tooSmall = sizes.filter((s) => s.width < MIN || s.height < MIN);
    assert.deepEqual(tooSmall.map((s) => `${s.width}x${s.height} :: ${s.what}`), [],
      `${tooSmall.length} clickable element(s) are written below the ${MIN}px floor this app `
      + 'declares for itself in accessibility-contract.ts');
  });
}

test('the floor being enforced is the one the app actually declares', () => {
  const contract = read('../../app/renderer/src/accessibility-contract.ts');
  const declared = /MIN_TARGET_SIZE_PX\s*=\s*(\d+)/u.exec(contract);
  assert.ok(declared, 'MIN_TARGET_SIZE_PX is gone; this guard is enforcing a number nobody declares');
  assert.equal(Number(declared[1]), MIN,
    'the contract moved and this guard did not; it is now checking the wrong floor');
});
