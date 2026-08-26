/**
 * Clean screenshots of each destination, for the readme and the website.
 *
 * Distinct from `drive.mjs` on purpose. The drive clicks everything and keeps a picture of
 * every click, so most of its frames carry a dialog, a menu or a toast over the screen --
 * which is exactly right as interaction evidence and exactly wrong as a product shot.
 *
 * This one navigates, clears whatever is floating, waits for the surface to settle, and
 * then captures. It refuses to capture while the setup wizard is up, and it records the
 * heading it actually saw so a picture can be checked against its own caption rather than
 * only against whether pixels appeared -- a distinction that has already cost this
 * repository 109 published images of an onboarding screen.
 *
 * Its label reader used to be a private copy of the ligature-prefix pattern, stripping the
 * Material Symbols glyph name off the front of `textContent` only when the real label began
 * with a capital -- so a flag chip reading `checki · ignore case` kept the icon's name and
 * could never be clicked by its own label. That reader now comes from `observe-panel.mjs`,
 * which removes the icon elements exactly rather than guessing at where they end.
 */
import { connect } from './cdp.mjs';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONTROL_READING_SOURCE, OVERLAY_COUNT_SOURCE, readControlLabel } from './observe-panel.mjs';

const PORT = Number(process.argv[2] || 9700);
const OUT = process.argv[3] || 'C:/Users/cntow/AppData/Local/Temp/dinggallery';
mkdirSync(OUT, { recursive: true });

const { send, evaluate, close } = await connect(PORT);
const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));

/* Wider than the driver's clickable set: a gallery navigates by rail entries, which this
 * application renders as list items rather than buttons. */
const NAVIGABLE = 'button, [role=tab], a[href], [role=option], li';

const readNavigable = () => evaluate(`(() => {
  const read = ${CONTROL_READING_SOURCE};
  return [...document.querySelectorAll(${JSON.stringify(NAVIGABLE)})]
    .map((e, index) => Object.assign({ index, visible: !!(e.offsetWidth || e.offsetHeight) }, read(e)));
})()`);

const namedNavigable = async () => (await readNavigable())
  .map((reading) => Object.assign({}, reading, readControlLabel(reading)))
  .filter((c) => c.visible && !c.disabled && c.label.length > 0);

const clickText = async (text) => {
  const match = (await namedNavigable()).find((c) => c.label === text);
  if (!match) return false;
  return evaluate(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(NAVIGABLE)})][${match.index}];
    if (!el || !(el.offsetWidth || el.offsetHeight) || el.disabled) return false;
    el.click();
    return true;
  })()`);
};

/** Clears menus, palettes, dialogs and toasts so the screen itself is the subject. */
const clearOverlays = async () => {
  for (let i = 0; i < 3; i += 1) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await settle(140);
  }
  await evaluate(`(() => {
    for (const b of document.querySelectorAll('button')) {
      const t = (b.textContent || '').trim();
      if (t === 'Later' || t === 'Got it' || t === 'Undo') continue;
    }
    const later = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Later');
    if (later) later.click();
    const got = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Got it');
    if (got) got.click();
    return true;
  })()`);
  /* Toasts auto-dismiss. Waiting them out beats photographing one, and beats clicking
   * their Undo, which would take back whatever the previous step did. */
  for (let i = 0; i < 12; i += 1) {
    const toast = await evaluate("document.body.innerText.indexOf('Undo') >= 0");
    if (!toast) break;
    await settle(500);
  }
  await settle(250);
};

/* `overlays` was a dialog-role count, and this application renders no element carrying that
 * role, so the "(a dialog was still open)" warning printed beside each shot never fired. */
const state = () => evaluate(`(() => ({
  heading: ((document.querySelector('h1, h2, h3') || {}).textContent || '').trim().slice(0, 60),
  overlays: ${OVERLAY_COUNT_SOURCE},
  wizard: [...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Skip setup'),
}))()`);

if ((await state()).wizard) { await clickText('Skip setup'); await settle(900); }
if ((await state()).wizard) { console.log('REFUSING: the setup wizard is still up'); close(); process.exit(2); }
await clearOverlays();

/* The rail destinations, read from the page rather than hard-coded. */
const MENU_BAR = ['File', 'Edit', 'View', 'PBX', 'Agent', 'Window', 'Help'];
const rail = (await namedNavigable())
  .map((c) => c.label)
  .filter((t) => t.length > 3 && t.length < 40);

const wanted = [...new Set(rail)].filter((t) => !MENU_BAR.includes(t));
if (wanted.length === 0) {
  console.log('REFUSING: no named destination was found, so the label reader matched nothing');
  close();
  process.exit(3);
}
const shots = [];
let index = 0;

for (const label of wanted) {
  const went = await clickText(label);
  if (!went) continue;
  await settle(520);
  await clearOverlays();
  const s = await state();
  if (s.wizard || !s.heading) continue;
  if (shots.some((x) => x.heading === s.heading)) continue;

  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const bytes = Buffer.from(data, 'base64');
  const slug = s.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const file = `${String(index).padStart(2, '0')}-${slug}.png`;
  writeFileSync(join(OUT, file), bytes);
  shots.push({ heading: s.heading, file, clickedLabel: label, overlaysOnScreen: s.overlays,
               sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
  index += 1;
  if (index >= 40) break;
}

writeFileSync(join(OUT, 'gallery.json'), JSON.stringify({ generatedAt: new Date().toISOString(), shots }, null, 2));
console.log('captured ' + shots.length + ' clean screens');
for (const s of shots) console.log('  ' + s.heading.padEnd(28) + ' -> ' + s.file
  + (s.overlaysOnScreen ? `  (${s.overlaysOnScreen} overlay(s) still up)` : ''));
close();
