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
 */
import { connect } from './cdp.mjs';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = Number(process.argv[2] || 9700);
const OUT = process.argv[3] || 'C:/Users/cntow/AppData/Local/Temp/dinggallery';
mkdirSync(OUT, { recursive: true });

const { send, evaluate, close } = await connect(PORT);
const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));

const LIGATURE_PREFIX = /^[a-z_]+(?=[A-Z])/;
const labelOf = "(e) => ((e.getAttribute('aria-label') || e.textContent || '').trim().replace(/^[a-z_]+(?=[A-Z])/, ''))";
const clickText = (text) => evaluate(`(() => {
  const wanted = ${JSON.stringify(text)};
  const label = ${labelOf};
  const el = [...document.querySelectorAll('button, [role=tab], a[href], [role=option], li')]
    .find((e) => label(e) === wanted && (e.offsetWidth || e.offsetHeight) && !e.disabled);
  if (!el) return false;
  el.click();
  return true;
})()`);

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

const state = () => evaluate(`(() => ({
  heading: ((document.querySelector('h1, h2, h3') || {}).textContent || '').trim().slice(0, 60),
  dialogs: document.querySelectorAll('[role=dialog]').length,
  wizard: [...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Skip setup'),
}))()`);

if ((await state()).wizard) { await clickText('Skip setup'); await settle(900); }
if ((await state()).wizard) { console.log('REFUSING: the setup wizard is still up'); close(); process.exit(2); }
await clearOverlays();

/* The rail destinations, read from the page rather than hard-coded. */
const MENU_BAR = ['File', 'Edit', 'View', 'PBX', 'Agent', 'Window', 'Help'];
const rail = await evaluate(`(() => {
  const label = ${labelOf};
  return [...document.querySelectorAll('button, [role=tab], a[href], [role=option], li')]
    .map(label)
    .filter((t) => t.length > 3 && t.length < 40);
})()`);

const wanted = [...new Set(rail)].filter((t) => !MENU_BAR.includes(t));
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
  shots.push({ heading: s.heading, file, clickedLabel: label, dialogsOnScreen: s.dialogs,
               sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
  index += 1;
  if (index >= 40) break;
}

writeFileSync(join(OUT, 'gallery.json'), JSON.stringify({ generatedAt: new Date().toISOString(), shots }, null, 2));
console.log('captured ' + shots.length + ' clean screens');
for (const s of shots) console.log('  ' + s.heading.padEnd(28) + ' -> ' + s.file + (s.dialogsOnScreen ? '  (a dialog was still open)' : ''));
close();
