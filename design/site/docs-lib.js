// docs-lib.js — article index, markdown renderer, bounded regex helpers for the docs site.
export const CATS = [
  { id: 'pbx', label: 'PBX', blurb: 'Dialplan, endpoints, trunks, queues — the telephony core.' },
  { id: 'media', label: 'Media', blurb: 'Voicemail, conferences, music on hold, codecs.' },
  { id: 'data', label: 'Data', blurb: 'Call records and the AMI/REST surface.' },
  { id: 'system', label: 'System', blurb: 'Modules, logging, security, CLI.' },
  { id: 'agent', label: 'Agent', blurb: 'Memory, sync, skills, vocabulary, operations.' },
  { id: 'app', label: 'App', blurb: 'Servers, appearance, notifications, history, about.' },
  { id: 'platform', label: 'Platform', blurb: 'Cross-cutting feature contracts — every generic capability, documented one page each.' },
  { id: 'changelog', label: 'Changelog', blurb: 'Dated behavior changes.' },
  { id: 'evidence', label: 'Evidence', blurb: 'Recorded verification runs.' },
  { id: 'root', label: 'General', blurb: 'Index and installer articles.' },
];
export const DOCS = [
  ['root','README'],['root','installer-iso'],
  ['pbx','README'],['pbx','dash'],['pbx','live'],['pbx','endpoints'],['pbx','trunks'],['pbx','trunkauth'],['pbx','canvas'],['pbx','ivr'],['pbx','queues'],
  ['media','README'],['media','voicemail'],['media','confbridge'],['media','moh'],['media','codecs'],
  ['data','README'],['data','cdr'],['data','ami'],
  ['system','README'],['system','modules'],['system','logger'],['system','security'],['system','cli'],
  ['agent','README'],['agent','memory'],['agent','sync'],['agent','skills'],['agent','hub'],['agent','vocab'],['agent','ops'],['agent','secrets'],
  ['app','README'],['app','servers'],['app','arcade'],['app','notifications'],['app','history'],['app','customise'],['app','appearance'],['app','about'],
  ['platform','README'],['platform','accessibility'],['platform','app-display-name'],['platform','app-logo-customization'],['platform','attention-modes'],['platform','automatic-updates'],['platform','bounded-overlays'],['platform','browser-extension-download-surfaces'],['platform','browser-style-tabs'],['platform','built-in-authenticator'],['platform','bulk-actions'],['platform','changelog-viewer'],['platform','collapsible-filters'],['platform','command-palette'],['platform','complete-exports'],['platform','context-menu-shortcuts'],['platform','destructive-action-confirmation'],['platform','dialog-emojis'],['platform','dim-sum-surprise'],['platform','external-editor-handoff'],['platform','external-settings-sources'],['platform','forge-publishing'],['platform','funny-levels'],['platform','guided-forms'],['platform','in-context-recovery'],['platform','language-modes'],['platform','local-version-history'],['platform','long-operation-progress'],['platform','material-appearance'],['platform','narration'],['platform','non-blocking-notifications'],['platform','offline-documentation-browser'],['platform','per-element-toy-locks'],['platform','personal-vocabulary-upload'],['platform','provider-markup-rendering'],['platform','regex-builder'],['platform','responsive-sizing'],['platform','scheduled-settings'],['platform','school-mode'],['platform','status-hub'],['platform','support-tickets'],['platform','tab-groups-and-searches'],['platform','unbound-controls'],['platform','unlock-ladder'],
  ['changelog','automatic-updater-reliability'],
  ['evidence','automatic-updates'],
].map(([cat, slug]) => ({ cat, slug, path: cat === 'root' ? `docs-md/${slug}.md` : `docs-md/${cat}/${slug}.md` }));

export function slugTitle(slug) {
  return slug === 'README' ? 'Index' : slug.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
}

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function resolveLink(href, cat) {
  if (/^https?:/i.test(href)) return { href, ext: true };
  const m = href.replace(/^\.\//, '').match(/^(?:\.\.\/([\w-]+)\/)?([\w-]+)\.md(#.*)?$/);
  if (!m) return { href: '#', ext: false };
  const targetCat = m[1] || (cat === 'root' && !m[1] ? 'root' : cat);
  return { href: `#/docs/${targetCat}/${m[2]}`, ext: false };
}

function inline(s, cat) {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, '<code style="font-family:var(--mono,monospace);font-size:.92em;background:var(--panel2,#141925);border:1px solid var(--line,#1C2230);padding:1px 6px;color:var(--ink,#E6E9EF)">$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--ink,#E6E9EF)">$1</strong>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
    const r = resolveLink(href, cat);
    const ex = r.ext ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${r.href}"${ex} style="color:var(--acc,#FFB224);text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--acc,#FFB224) 40%,transparent)">${text}${r.ext ? ' ↗' : ''}</a>`;
  });
  return out;
}

export function mdToHtml(md, cat) {
  const lines = md.split(/\r?\n/);
  let html = '', i = 0, title = '';
  const P = 'margin:0 0 14px;line-height:1.7;color:var(--mut,#9AA4B4);font-size:calc(15px*var(--fs,1));max-width:var(--measure,74ch)';
  while (i < lines.length) {
    let l = lines[i];
    if (/^# /.test(l) && !title) { title = l.slice(2).trim(); i++; continue; }
    if (/^```/.test(l)) {
      let code = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
      i++;
      html += `<pre style="margin:0 0 16px;border:var(--bw,2px) solid var(--line,#1C2230);background:var(--panel,#0E1219);padding:16px 20px;overflow:auto;font-family:var(--mono,monospace);font-size:13px;line-height:1.7;color:var(--mut,#9AA4B4)">${esc(code.join('\n'))}</pre>`;
      continue;
    }
    if (/^#{2,4} /.test(l)) {
      const level = l.match(/^#+/)[0].length;
      const size = level === 2 ? 'calc(22px*var(--fs,1))' : 'calc(17px*var(--fs,1))';
      html += `<h${level} style="margin:30px 0 12px;font-size:${size};font-weight:var(--hw,800);letter-spacing:-.02em;color:var(--ink,#E6E9EF)">${inline(l.replace(/^#+ /, ''), cat)}</h${level}>`;
      i++; continue;
    }
    if (/^\s*[-*] /.test(l)) {
      let items = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*] /, '')); i++; }
      html += `<ul style="margin:0 0 16px;padding-left:22px;display:grid;gap:7px">${items.map(it => `<li style="line-height:1.65;color:var(--mut,#9AA4B4);font-size:calc(15px*var(--fs,1))">${inline(it, cat)}</li>`).join('')}</ul>`;
      continue;
    }
    if (/^\s*\d+\. /.test(l)) {
      let items = [];
      while (i < lines.length && /^\s*\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\. /, '')); i++; }
      html += `<ol style="margin:0 0 16px;padding-left:22px;display:grid;gap:7px">${items.map(it => `<li style="line-height:1.65;color:var(--mut,#9AA4B4);font-size:calc(15px*var(--fs,1))">${inline(it, cat)}</li>`).join('')}</ol>`;
      continue;
    }
    if (/^\|/.test(l)) {
      let rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = r => r.split('|').slice(1, -1).map(c => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      html += `<div style="overflow:auto;margin:0 0 18px"><table style="border-collapse:collapse;border:var(--bw,2px) solid var(--line,#1C2230);font-size:calc(14px*var(--fs,1));min-width:420px"><thead><tr>${head.map(h => `<th style="text-align:left;padding:10px 16px;background:var(--panel2,#141925);font-family:var(--mono,monospace);font-size:11px;letter-spacing:.08em;color:var(--faint,#5C6470);border-bottom:1px solid var(--line,#1C2230)">${inline(h.toUpperCase(), cat)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td style="padding:10px 16px;border-top:1px solid var(--line,#1C2230);color:var(--mut,#9AA4B4);line-height:1.55;vertical-align:top">${inline(c, cat)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      continue;
    }
    if (/^---+$/.test(l.trim())) { html += `<hr style="border:0;border-top:var(--bw,2px) solid var(--line,#1C2230);margin:26px 0">`; i++; continue; }
    if (l.trim() === '') { i++; continue; }
    let para = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#|```|\||\s*[-*] |\s*\d+\. )/.test(lines[i])) { para.push(lines[i]); i++; }
    html += `<p style="${P}">${inline(para.join(' '), cat)}</p>`;
  }
  return { title, html };
}

// Bounded regex: length caps protect against runaway patterns (contract: pattern and sample bounded).
export function buildRegex(pattern, flags) {
  if (!pattern || pattern.length > 200) return { re: null, error: pattern ? 'Pattern too long (200 char bound).' : 'Enter a pattern.' };
  try { return { re: new RegExp(pattern, flags), error: null }; }
  catch (e) { return { re: null, error: String(e.message || e) }; }
}
export function testSample(re, sample) {
  const lines = (sample || '').slice(0, 2000).split(/\n/).slice(0, 40);
  const hits = [];
  for (const ln of lines) { const m = ln.match(re); if (m) hits.push({ line: ln, match: m[0] }); }
  return hits;
}
