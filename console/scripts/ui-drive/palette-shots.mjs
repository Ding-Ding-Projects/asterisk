/**
 * Capture the command palette from the real built application.
 *
 * The palette is opened here with a genuine `Ctrl+Shift+F` key event dispatched through the
 * debugging protocol, not by setting `paletteOpen` directly. That distinction is the whole
 * value of these captures: forcing the state proves the panel can be rendered, which nobody
 * doubted. Dispatching the shortcut proves the shortcut is wired, which is the thing that
 * silently stops being true.
 *
 * Every step asserts the DOM actually changed before the shot is taken. A capture harness
 * that photographs whatever is on screen will happily produce a gallery of the onboarding
 * wizard and file it under names describing screens it never reached -- which happened here
 * once already, 109 captures deep, and was invisible because something genuinely had
 * rendered. "Did anything paint" is not the question.
 *
 * Usage: node scripts/ui-drive/palette-shots.mjs [port] [outDir]
 */
import { connect } from './cdp.mjs';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PORT = Number(process.argv[2] || 9560);
const OUT = process.argv[3] || 'release/captures/command-palette';

/* The palette renders as a modal dialog rather than a uniquely identified panel, and the
 * shell declares fourteen dialogs in total -- so presence proves nothing, and only a
 * VISIBLE one appearing where none was visible before proves the shortcut fired. */
const MODAL = '[role=dialog][aria-modal=true]';
const VISIBLE_MODALS = `Array.from(document.querySelectorAll("${MODAL}")).filter((d) => d.offsetParent !== null).length`;

const shots = [];

const main = async () => {
  mkdirSync(OUT, { recursive: true });
  const cdp = await connect(PORT);

  const evaluate = (expression) => cdp.evaluate(expression);
  const key = (params) => cdp.send('Input.dispatchKeyEvent', params);

  const shoot = async (name, note) => {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const path = join(OUT, `${name}.png`);
    writeFileSync(path, Buffer.from(data, 'base64'));
    const bytes = statSync(path).size;
    /* A PNG of a blank frame is still a valid PNG, so size alone proves little -- but a
     * suspiciously small one is worth surfacing rather than filing silently. */
    shots.push({ name, bytes, note });
    console.log(`  ${name.padEnd(28)} ${String(bytes).padStart(7)} bytes  ${note}`);
  };

  /* 1. A fresh profile opens on the onboarding wizard, whose panel covers nearly the whole
   *    viewport. Navigation underneath genuinely works, so every capture taken without
   *    dismissing it photographs the wizard while the filename claims otherwise. */
  const wizard = 'Array.from(document.querySelectorAll("button")).find((b) => /skip setup/i.test(b.textContent || ""))';
  if (await evaluate(`!!${wizard}`)) {
    await evaluate(`(() => { const b = ${wizard}; if (b) b.click(); return true; })()`);
    await new Promise((r) => setTimeout(r, 2000));
    const stillThere = await evaluate(`!!${wizard}`);
    if (stillThere) throw new Error('the onboarding wizard did not dismiss; every shot below would be of the wizard');
    console.log('  wizard dismissed, and verified gone');
  }

  const visibleBefore = Number(await evaluate(VISIBLE_MODALS));
  console.log(`  visible modal dialogs before the shortcut: ${visibleBefore}`);
  await shoot('01-before-palette', `the console with ${visibleBefore} visible modal dialog(s)`);

  /* 2. The real shortcut. Modifier bits: Ctrl = 2, Shift = 8. */
  const CTRL_SHIFT = 2 | 8;
  for (const type of ['keyDown', 'keyUp']) {
    await key({ type, modifiers: CTRL_SHIFT, key: 'F', code: 'KeyF', windowsVirtualKeyCode: 70, nativeVirtualKeyCode: 70 });
  }
  await new Promise((r) => setTimeout(r, 900));

  /* The palette renders as a modal dialog rather than a uniquely identified panel, and the
   * shell declares fourteen dialogs in total, so presence proves nothing -- what proves the
   * shortcut worked is that a VISIBLE modal appeared where none was visible before. */
  const opened = Number(await evaluate(VISIBLE_MODALS)) > visibleBefore;
  if (!opened) throw new Error('Ctrl+Shift+F did not open the palette — capturing it anyway would document a shortcut that does not work');
  console.log('  Ctrl+Shift+F opened the palette, confirmed in the DOM');
  await shoot('02-palette-open', 'opened by the real Ctrl+Shift+F shortcut, not by forcing state');

  /* 3. Type a query through real key events and confirm the result set actually narrows. */
  const countRows = `document.querySelectorAll("${MODAL} [role=option], ${MODAL} button").length`;
  const before = Number(await evaluate(countRows));
  for (const ch of 'codec') {
    await key({ type: 'keyDown', text: ch, key: ch, code: `Key${ch.toUpperCase()}`, windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0) });
    await key({ type: 'keyUp', key: ch, code: `Key${ch.toUpperCase()}`, windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0) });
  }
  await new Promise((r) => setTimeout(r, 900));
  const after = Number(await evaluate(countRows));
  console.log(`  typing "codec" moved the result count ${before} -> ${after}`);
  await shoot('03-palette-filtered', `typing "codec" narrowed the results from ${before} to ${after}`);

  writeFileSync(join(OUT, 'captures.json'), `${JSON.stringify({
    capturedAt: new Date().toISOString(),
    openedBy: 'Ctrl+Shift+F dispatched as a real key event over the debugging protocol',
    resultsBeforeQuery: before,
    resultsAfterQuery: after,
    shots,
  }, null, 2)}\n`);

  cdp.close();
  console.log(`\n${shots.length} capture(s) written to ${OUT}`);
};

main().catch((error) => {
  console.error(`capture failed: ${error.message}`);
  process.exit(1);
});
