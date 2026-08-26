/* Drive every control on every page of the hosted site, one page at a time.
 * Records, for each clickable control: what it was, and whether clicking it
 * changed anything observable (DOM text near it, a toast, localStorage, a
 * dialog opening, document.title, or an error thrown). Decorative if nothing
 * observable happened and no error was thrown either. */
import { connect } from './cdp.mjs';
import { writeFileSync } from 'node:fs';

const PORT = Number(process.argv[2] || 9333);
const BASE = process.argv[3] || 'http://127.0.0.1:8099';
const PAGE = process.argv[4]; // optional single page filter

const PAGES = ['index.html', 'product.html', 'documentation.html', 'downloads.html', 'status.html', 'settings.html'];

const { send, evaluate, close } = await connect(PORT);
await send('Page.enable');
await send('Runtime.enable');
const settle = (ms) => new Promise((r) => setTimeout(r, ms));

const navigate = async (page) => {
  await send('Page.navigate', { url: `${BASE}/${page}` });
  await settle(700);
  // wait for readyState complete
  for (let i = 0; i < 20; i++) {
    const rs = await evaluate('document.readyState');
    if (rs === 'complete') break;
    await settle(150);
  }
  await settle(400); // reveal animations / app.js init
};

const snapshotState = async () => evaluate(`(() => {
  const ls = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k); }
  const dialogsOpen = [...document.querySelectorAll('dialog[open]')].map(d => d.id);
  const toasts = [...document.querySelectorAll('#toast-region > *')].map(t => (t.textContent||'').trim());
  return JSON.stringify({ ls, dialogsOpen, toasts, title: document.title, bodyText: (document.body.innerText||'') });
})()`).then(JSON.parse);

const listClickables = async () => evaluate(`JSON.stringify((() => {
  const sel = 'button, [role=button], a[href]:not([href^="#"]):not([target]), a[href^="#"]';
  return [...document.querySelectorAll(sel)].map((e, i) => {
    const rect = e.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none';
    const disabled = e.disabled || e.getAttribute('aria-disabled') === 'true';
    const clone = e.cloneNode(true);
    clone.querySelectorAll('.msym').forEach(s => s.remove());
    const label = (clone.textContent || e.getAttribute('aria-label') || '').trim().replace(/\\s+/g,' ').slice(0,80);
    return { i, tag: e.tagName, id: e.id||null, cls: (e.className||'').toString().slice(0,60), label, visible, disabled, href: e.getAttribute('href')||null };
  });
})())`).then(JSON.parse);

const clickAt = async (i) => evaluate(`(() => {
  const sel = 'button, [role=button], a[href]:not([href^="#"]):not([target]), a[href^="#"]';
  const els = [...document.querySelectorAll(sel)];
  const e = els[${i}];
  if (!e) return 'MISSING';
  try { e.scrollIntoView({block:'center'}); e.click(); return 'CLICKED'; } catch (err) { return 'ERR:' + err.message; }
})()`);

const results = [];
const pagesToRun = PAGE ? [PAGE] : PAGES;

for (const page of pagesToRun) {
  await navigate(page);
  // close any dialog that might auto-open (published-version banner etc.), then dismiss cookie-like overlays if present.
  const clickables = await listClickables();
  console.log(`\n=== ${page}: ${clickables.length} clickable controls ===`);
  for (const c of clickables) {
    if (!c.visible || c.disabled) { results.push({ page, ...c, skipped: c.disabled ? 'disabled' : 'not visible' }); continue; }
    // Skip external/mailto links and same-page nav links that would navigate away (handled separately)
    if (c.href && /^https?:\/\//.test(c.href) && !c.href.includes('127.0.0.1')) { results.push({ page, ...c, skipped: 'external link' }); continue; }
    const before = await snapshotState();
    let consoleErr = null;
    const errHandler = (e) => { consoleErr = e.exceptionDetails; };
    // click
    const clickResult = await clickAt(c.i);
    await settle(250);
    // did navigation happen (page unload)? check via document readiness / URL
    const afterUrl = await evaluate('location.pathname.split("/").pop()').catch(() => null);
    let after = null;
    let navigated = false;
    if (afterUrl && afterUrl !== page) {
      navigated = true;
      // navigate back for continued driving
      await navigate(page);
      after = { navigatedTo: afterUrl };
    } else {
      after = await snapshotState().catch((e) => ({ evalError: e.message }));
    }
    const changed = navigated || (after && !after.evalError && JSON.stringify(after) !== JSON.stringify(before));
    results.push({ page, ...c, clickResult, changed, navigated, before: navigated ? undefined : before, after });
    console.log(`  [${changed ? 'OK ' : 'FLAT'}] ${c.tag}#${c.id||''} "${c.label}" -> ${clickResult}${navigated ? ' (navigated to ' + afterUrl + ')' : ''}`);
  }
}

writeFileSync('C:/Users/cntow/AppData/Local/Temp/fx-hosted-site-audit.json', JSON.stringify(results, null, 2));
close();
console.log('\nWrote C:/Users/cntow/AppData/Local/Temp/fx-hosted-site-audit.json');
