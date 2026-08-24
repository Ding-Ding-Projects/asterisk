(() => {
  'use strict';

  const STORAGE_KEY = 'ding-pbx-site-history-delivery-v1';
  const MAX_HISTORY = 250;
  const CHANGELOG = [
    {
      version: '0.1.0',
      date: '2026-08-23',
      category: 'Delivery',
      summary: 'Shipped the browser-mediated delivery surfaces and local evidence workspace.',
      commit: 'c8d5f51473368dc7e8b2bde6d58a21ca7a1607e7',
    },
    {
      version: '0.0.9',
      date: '2026-08-22',
      category: 'Design',
      summary: 'Recorded the compiled desktop design and documentation surface baseline.',
      commit: '5e7cc508d470b022c96d4008dc6b0927f5748d6f',
    },
    {
      version: '0.0.8',
      date: '2026-08-21',
      category: 'Reliability',
      summary: 'Made the static site preserve truthful empty and unverified states.',
      commit: '3a1c42907c9e56602934a8ac31edf6544d73e778',
    },
  ];

  const COPY = {
    title: 'Local delivery workspace',
    subtitle: 'History, changelog, handoff, and recovery tools for this browser only.',
    staticBoundary: 'This is a documentation and download surface, not the installed desktop application or a PBX runtime.',
  };

  const own = (value, fallback) => value === undefined || value === null ? fallback : value;
  const id = value => String(value || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || `event-${Date.now()}`;
  const text = value => String(own(value, '')).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 600);
  const escapeHtml = value => text(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

  function siteAsset(name) {
    const script = document.currentScript;
    if (script?.src) return new URL(name, script.src).href;
    return new URL(name, document.baseURI).href;
  }

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        schemaVersion: 1,
        history: Array.isArray(parsed.history) ? parsed.history.slice(-MAX_HISTORY) : [],
        forge: { account: 'browser', owner: '', repository: '', route: 'copy', ...(parsed.forge || {}) },
        editor: { lastExport: '', ...(parsed.editor || {}) },
        transfer: { status: 'idle', name: '', startedAt: '', completedAt: '', ...(parsed.transfer || {}) },
        update: { status: 'ready', checkedAt: '', ...(parsed.update || {}) },
      };
    } catch {
      return { schemaVersion: 1, history: [], forge: { account: 'browser', owner: '', repository: '', route: 'copy' }, editor: { lastExport: '' }, transfer: { status: 'idle', name: '' }, update: { status: 'ready', checkedAt: '' } };
    }
  }

  let state = readState();
  let historyQuery = { text: '', from: '', to: '', action: 'all', regex: false, pattern: '', flags: 'iu' };
  let changelogQuery = { text: '', from: '', to: '', regex: false, pattern: '', flags: 'iu' };
  let activeRegexTarget = null;
  let operation = { running: false, cancelled: false, index: 0, total: 0, timer: 0 };

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* local storage can be unavailable in private browsing */ }
  }

  function record(action, summary, details = {}) {
    const event = {
      id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      action: text(action).slice(0, 80),
      summary: text(summary).slice(0, 240),
      details: { ...details, privateVocabulary: 'omitted', credentials: 'omitted' },
    };
    state.history = [...state.history, event].slice(-MAX_HISTORY);
    persist();
    renderHistory();
    return event;
  }

  function safeRegex(query) {
    if (!query.regex || !query.pattern) return null;
    try { return new RegExp(query.pattern.slice(0, 160), query.flags); } catch { return null; }
  }

  function matchesQuery(value, query) {
    const haystack = String(value || '');
    if (query.regex) {
      const pattern = safeRegex(query);
      return pattern ? pattern.test(haystack) : false;
    }
    return !query.text || haystack.toLocaleLowerCase().includes(query.text.toLocaleLowerCase());
  }

  function withinDate(value, from, to) {
    const date = String(value || '').slice(0, 10);
    return (!from || date >= from) && (!to || date <= to);
  }

  function filterHistory() {
    return state.history.filter(event => withinDate(event.timestamp, historyQuery.from, historyQuery.to)
      && (historyQuery.action === 'all' || event.action === historyQuery.action)
      && matchesQuery(`${event.action} ${event.summary}`, historyQuery));
  }

  function filterChangelog() {
    return CHANGELOG.filter(entry => withinDate(entry.date, changelogQuery.from, changelogQuery.to)
      && matchesQuery(`${entry.version} ${entry.category} ${entry.summary} ${entry.commit}`, changelogQuery));
  }

  function formatDate(value) {
    try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return String(value || 'Unknown time'); }
  }

  function downloadFile(name, body, type) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([body], { type }));
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    state.editor.lastExport = name;
    persist();
    renderEditorStatus();
  }

  function copyText(value, status) {
    const done = () => { if (status) status.textContent = 'Copied locally. Nothing was sent anywhere.'; };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).then(done).catch(() => { if (status) status.textContent = 'Clipboard access was refused. Use the visible text instead.'; });
    else if (status) status.textContent = 'Clipboard access is unavailable in this browser. Use the visible text instead.';
  }

  function historyExportRows() {
    return filterHistory().map(event => ({ id: event.id, timestamp: event.timestamp, action: event.action, summary: event.summary, details: { privateVocabulary: 'omitted', credentials: 'omitted' } }));
  }

  function exportHistory(format = 'json') {
    const rows = historyExportRows();
    if (format === 'markdown') {
      const body = `# Local history export\n\nPrivate vocabulary, credentials, source paths, and file contents were omitted.\n\n| Timestamp | Action | Summary |\n| --- | --- | --- |\n${rows.map(row => `| ${row.timestamp} | ${row.action} | ${row.summary.replaceAll('|', '\\|')} |`).join('\n')}\n`;
      downloadFile('ding-pbx-site-history.md', body, 'text/markdown');
      return;
    }
    downloadFile('ding-pbx-site-history.json', JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), privateVocabulary: 'omitted', credentials: 'omitted', events: rows }, null, 2), 'application/json');
  }

  function renderHistory() {
    const host = document.querySelector('#history-list');
    if (!host) return;
    const rows = filterHistory();
    const actions = [...new Set(state.history.map(event => event.action))].sort();
    const actionSelect = document.querySelector('#history-action');
    if (actionSelect) {
      const current = historyQuery.action;
      actionSelect.innerHTML = `<option value="all">All actions (${state.history.length})</option>${actions.map(action => `<option value="${escapeHtml(action)}">${escapeHtml(action)} (${state.history.filter(event => event.action === action).length})</option>`).join('')}`;
      actionSelect.value = current;
    }
    host.innerHTML = rows.length ? rows.map(event => `<article class="delivery-history-row" data-event-id="${escapeHtml(event.id)}"><div><span class="card-kicker">${escapeHtml(event.action)}</span><h3>${escapeHtml(event.summary)}</h3><p>${escapeHtml(formatDate(event.timestamp))}</p></div><div class="delivery-row-actions"><button type="button" class="text-button" data-restore-event="${escapeHtml(event.id)}">Restore as new event</button><details><summary>Redacted details</summary><pre>${escapeHtml(JSON.stringify(event.details, null, 2))}</pre></details></div></article>`).join('') : '<p class="empty-state">No local events match this filter. Changes made on this page will appear here.</p>';
    host.querySelectorAll('[data-restore-event]').forEach(button => button.addEventListener('click', () => {
      const source = state.history.find(event => event.id === button.dataset.restoreEvent);
      if (!source) return;
      record('restored', `Restored “${source.summary}” as a new local event`, { sourceEvent: source.id, restore: 'new-event-only' });
      const status = document.querySelector('#history-status');
      if (status) status.textContent = 'Restore recorded as a new event. The earlier event remains unchanged.';
    }));
    const status = document.querySelector('#history-count');
    if (status) status.textContent = `${rows.length} of ${state.history.length} local events shown`;
  }

  function renderChangelog() {
    const host = document.querySelector('#changelog-list');
    if (!host) return;
    const rows = filterChangelog();
    host.innerHTML = rows.length ? rows.map(entry => `<article class="delivery-changelog-row"><div><span class="card-kicker">${escapeHtml(entry.category)} · ${escapeHtml(entry.date)}</span><h3>${escapeHtml(entry.version)}</h3><p>${escapeHtml(entry.summary)}</p></div><a class="text-button" href="https://github.com/Ding-Ding-Projects/asterisk/commit/${entry.commit}" target="_blank" rel="noopener" aria-label="Open commit ${entry.commit}">${escapeHtml(entry.commit.slice(0, 12))}</a></article>`).join('') : '<p class="empty-state">No recorded changes match this filter.</p>';
    const status = document.querySelector('#changelog-count');
    if (status) status.textContent = `${rows.length} recorded change${rows.length === 1 ? '' : 's'} shown`;
  }

  function renderEditorStatus() {
    const status = document.querySelector('#editor-status');
    if (status) status.textContent = state.editor.lastExport ? `Last export prepared locally: ${state.editor.lastExport}.` : 'No export prepared in this browser yet.';
    const open = document.querySelector('#open-vscode');
    if (open) open.disabled = !state.editor.lastExport;
  }

  function renderTransfer() {
    const status = document.querySelector('#transfer-status');
    const progress = document.querySelector('#transfer-progress');
    const cancel = document.querySelector('#transfer-cancel');
    const complete = document.querySelector('#transfer-complete');
    if (!status) return;
    const transfer = state.transfer;
    if (transfer.status === 'started') {
      status.textContent = `Browser-owned transfer started for ${transfer.name}. This page cannot observe bytes, rate, ETA, pause, or completion.`;
      progress.removeAttribute('value');
      cancel.hidden = false;
      complete.hidden = false;
    } else if (transfer.status === 'complete') {
      status.textContent = `The browser handoff was marked complete for ${transfer.name} at ${formatDate(transfer.completedAt)}.`;
      progress.value = 100;
      cancel.hidden = true;
      complete.hidden = true;
    } else if (transfer.status === 'cancelled') {
      status.textContent = 'The browser-owned transfer was cancelled before this page marked it complete.';
      progress.value = 0;
      cancel.hidden = true;
      complete.hidden = true;
    } else {
      status.textContent = 'No browser transfer is active. Choose a local file to open the real Start download decision surface.';
      progress.value = 0;
      cancel.hidden = true;
      complete.hidden = true;
    }
  }

  function renderUpdate() {
    const status = document.querySelector('#update-status');
    if (status) status.textContent = state.update.checkedAt ? `Checked locally at ${formatDate(state.update.checkedAt)}. Static hosting does not install updates.` : 'No local update check has been run.';
  }

  function renderForge() {
    const form = document.querySelector('#forge-form');
    if (!form) return;
    document.querySelector('#forge-account').value = state.forge.account;
    document.querySelector('#forge-owner').value = state.forge.owner;
    document.querySelector('#forge-repository').value = state.forge.repository;
    document.querySelector('#forge-route').value = state.forge.route;
  }

  function parseProviderMarkdown(value) {
    const source = escapeHtml(value || '');
    return source.split('\n').map(line => {
      if (/^###\s/.test(line)) return `<h4>${line.slice(4)}</h4>`;
      if (/^##\s/.test(line)) return `<h3>${line.slice(3)}</h3>`;
      if (/^#\s/.test(line)) return `<h2>${line.slice(2)}</h2>`;
      if (/^-\s/.test(line)) return `<li>${line.slice(2)}</li>`;
      return line ? `<p>${line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')}</p>` : '';
    }).join('');
  }

  function openRegex(target) {
    const dialog = document.querySelector('#delivery-regex-dialog');
    if (!dialog) return;
    activeRegexTarget = target;
    document.querySelector('#delivery-regex-label').textContent = `Builder attached to ${target.dataset.label || target.id || 'this field'}. Plain text remains the default.`;
    document.querySelector('#delivery-regex-pattern').value = target.dataset.regexPattern || '';
    document.querySelector('#delivery-regex-i').checked = (target.dataset.regexFlags || 'iu').includes('i');
    document.querySelector('#delivery-regex-u').checked = (target.dataset.regexFlags || 'iu').includes('u');
    dialog.showModal();
  }

  function applyRegex() {
    if (!activeRegexTarget) return;
    const pattern = document.querySelector('#delivery-regex-pattern').value.slice(0, 160);
    const flags = `${document.querySelector('#delivery-regex-i').checked ? 'i' : ''}${document.querySelector('#delivery-regex-u').checked ? 'u' : ''}`;
    try {
      new RegExp(pattern, flags);
      activeRegexTarget.dataset.regexPattern = pattern;
      activeRegexTarget.dataset.regexFlags = flags;
      activeRegexTarget.dataset.regexMode = pattern ? 'regex' : 'plain';
      activeRegexTarget.value = pattern;
      activeRegexTarget.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#delivery-regex-feedback').textContent = pattern ? `Valid ${flags || 'no'}-flag pattern active.` : 'Cleared to plain-text mode.';
      document.querySelector('#delivery-regex-dialog').close();
    } catch (error) {
      document.querySelector('#delivery-regex-feedback').textContent = `Pattern is invalid: ${error.message}`;
    }
  }

  function attachFilter(id, query, render) {
    const input = document.querySelector(`#${id}`);
    if (!input) return;
    input.value = query.text;
    input.addEventListener('input', () => { query.text = input.value.slice(0, 160); query.pattern = input.dataset.regexPattern || ''; query.flags = input.dataset.regexFlags || 'iu'; query.regex = Boolean(query.pattern); render(); });
    document.querySelector(`[data-delivery-regex-for="${id}"]`)?.addEventListener('click', () => openRegex(input));
  }

  function bindHistory() {
    const from = document.querySelector('#history-from');
    const to = document.querySelector('#history-to');
    const action = document.querySelector('#history-action');
    from?.addEventListener('input', () => { historyQuery.from = from.value; renderHistory(); });
    to?.addEventListener('input', () => { historyQuery.to = to.value; renderHistory(); });
    action?.addEventListener('change', () => { historyQuery.action = action.value; renderHistory(); });
    attachFilter('history-search', historyQuery, renderHistory);
    document.querySelector('#history-export-json')?.addEventListener('click', () => exportHistory('json'));
    document.querySelector('#history-export-markdown')?.addEventListener('click', () => exportHistory('markdown'));
    document.querySelector('#history-copy')?.addEventListener('click', () => copyText(JSON.stringify(historyExportRows(), null, 2), document.querySelector('#history-status')));
    document.querySelector('#history-record')?.addEventListener('click', () => {
      const input = document.querySelector('#history-event-summary');
      const value = text(input?.value).trim();
      if (!value) { document.querySelector('#history-status').textContent = 'Enter a factual local event summary before recording it.'; input?.focus(); return; }
      record('updated', value, { source: 'local-browser-form' });
      input.value = '';
      document.querySelector('#history-status').textContent = 'The append-only event was recorded locally.';
    });
    renderHistory();
  }

  function bindChangelog() {
    const from = document.querySelector('#changelog-from');
    const to = document.querySelector('#changelog-to');
    from?.addEventListener('input', () => { changelogQuery.from = from.value; renderChangelog(); });
    to?.addEventListener('input', () => { changelogQuery.to = to.value; renderChangelog(); });
    attachFilter('changelog-search', changelogQuery, renderChangelog);
    document.querySelector('#changelog-export')?.addEventListener('click', () => downloadFile('ding-pbx-changelog.md', `# Changelog export\n\n${filterChangelog().map(entry => `- ${entry.version} · ${entry.date} · ${entry.summary} ([${entry.commit.slice(0, 12)}](https://github.com/Ding-Ding-Projects/asterisk/commit/${entry.commit}))`).join('\n')}\n`, 'text/markdown'));
    document.querySelector('#changelog-copy')?.addEventListener('click', () => copyText(filterChangelog().map(entry => `${entry.version} ${entry.date} ${entry.summary} ${entry.commit}`).join('\n'), document.querySelector('#changelog-status')));
    renderChangelog();
  }

  function bindEditor() {
    document.querySelector('#editor-file')?.addEventListener('change', event => {
      const file = event.target.files?.[0];
      const status = document.querySelector('#editor-status');
      if (!file) return;
      status.textContent = `Selected ${file.name}. The browser can offer it to the configured editor, but cannot inspect or store its path.`;
      state.editor.lastFileName = file.name;
      persist();
    });
    document.querySelector('#open-vscode')?.addEventListener('click', () => {
      if (!state.editor.lastExport) return;
      const href = `vscode://file/${encodeURIComponent(state.editor.lastExport)}`;
      const link = document.createElement('a'); link.href = href; link.click();
      document.querySelector('#editor-status').textContent = 'The browser requested Visual Studio Code for the exported file. If the protocol is unavailable, use the official download link below.';
      record('external-editor-handoff', `Requested Visual Studio Code for ${state.editor.lastExport}`, { path: 'omitted', protocol: 'vscode' });
    });
    document.querySelector('#editor-download')?.addEventListener('click', () => window.open('https://code.visualstudio.com/download', '_blank', 'noopener'));
    renderEditorStatus();
  }

  function bindTransfer() {
    document.querySelector('#transfer-file')?.addEventListener('change', event => {
      const file = event.target.files?.[0];
      const start = document.querySelector('#transfer-start');
      if (start) start.disabled = !file;
      if (file) document.querySelector('#transfer-name').textContent = file.name;
    });
    document.querySelector('#transfer-start')?.addEventListener('click', () => {
      if (state.transfer.status === 'started') return;
      const file = document.querySelector('#transfer-file').files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const link = document.createElement('a'); link.href = url; link.download = file.name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      state.transfer = { status: 'started', name: file.name, startedAt: new Date().toISOString() };
      persist(); renderTransfer();
      record('download-started', `Started a browser-owned download handoff for ${file.name}`, { bytes: file.size, progress: 'browser-owned' });
    });
    document.querySelector('#transfer-cancel')?.addEventListener('click', () => { state.transfer.status = 'cancelled'; persist(); renderTransfer(); record('download-cancelled', `Marked the browser-owned download for ${state.transfer.name} as cancelled`); });
    document.querySelector('#transfer-complete')?.addEventListener('click', () => { state.transfer.status = 'complete'; state.transfer.completedAt = new Date().toISOString(); persist(); renderTransfer(); record('download-complete', `Confirmed browser completion for ${state.transfer.name}`, { completion: 'user-confirmed-browser-state' }); });
    renderTransfer();
  }

  function bindOperation() {
    const start = document.querySelector('#operation-start');
    const cancel = document.querySelector('#operation-cancel');
    const progress = document.querySelector('#operation-progress');
    const status = document.querySelector('#operation-status');
    if (!start || !progress || !status) return;
    const finish = () => {
      operation.running = false;
      start.disabled = false;
      cancel.hidden = true;
      status.textContent = operation.cancelled ? 'Operation cancelled before an export was written.' : 'Local export preparation completed and the redacted file is ready.';
      if (!operation.cancelled) exportHistory('json');
    };
    start.addEventListener('click', () => {
      if (operation.running) return;
      operation = { running: true, cancelled: false, index: 0, total: Math.max(state.history.length, 1), timer: 0 };
      start.disabled = true; cancel.hidden = false; progress.value = 0; status.textContent = 'Preparing a redacted local export. Re-entry is blocked until this run settles.';
      const tick = () => {
        if (!operation.running) return;
        if (operation.cancelled || operation.index >= operation.total) { progress.value = operation.cancelled ? 0 : 100; finish(); return; }
        operation.index += 1; progress.value = Math.round((operation.index / operation.total) * 100); operation.timer = setTimeout(tick, 80);
      };
      tick();
    });
    cancel?.addEventListener('click', () => { if (operation.running) operation.cancelled = true; });
  }

  function bindRecovery() {
    document.querySelectorAll('[data-recovery-action]').forEach(button => button.addEventListener('click', () => {
      const action = button.dataset.recoveryAction;
      const status = button.closest('[data-recovery]')?.querySelector('[data-recovery-status]');
      if (action === 'retry') { if (status) status.textContent = 'Retry is ready. Choose the action again and the browser will report whether it accepted the handoff.'; }
      if (action === 'settings') { window.location.href = siteAsset('settings.html'); }
      if (action === 'vscode') { window.open('https://code.visualstudio.com/download', '_blank', 'noopener'); if (status) status.textContent = 'The official Visual Studio Code download page was opened in a new browser tab.'; }
      record('recovery-opened', `Opened the in-context recovery action: ${action}`, { action });
    }));
  }

  function bindForge() {
    const form = document.querySelector('#forge-form');
    if (!form) return;
    ['forge-account', 'forge-owner', 'forge-repository', 'forge-route'].forEach(idValue => document.querySelector(`#${idValue}`)?.addEventListener('input', () => {
      state.forge = { account: document.querySelector('#forge-account').value, owner: text(document.querySelector('#forge-owner').value), repository: text(document.querySelector('#forge-repository').value), route: document.querySelector('#forge-route').value };
      persist();
    }));
    document.querySelector('#forge-open')?.addEventListener('click', () => {
      const owner = state.forge.owner.trim(), repository = state.forge.repository.trim();
      const status = document.querySelector('#forge-status');
      if (!owner || !repository) { status.textContent = 'Enter an owner and repository name. No credentials are requested or stored here.'; document.querySelector('#forge-owner').focus(); return; }
      const url = state.forge.route === 'fork' ? `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/fork` : `https://github.com/new?name=${encodeURIComponent(repository)}&owner=${encodeURIComponent(owner)}`;
      window.open(url, '_blank', 'noopener');
      status.textContent = 'A browser-mediated forge flow was opened. This page did not authenticate, publish, fork, or store credentials.';
      record('forge-handoff', `Opened a browser-mediated ${state.forge.route} flow for ${owner}/${repository}`, { owner, repository, credentials: 'omitted' });
    });
    renderForge();
  }

  function bindUpdate() {
    document.querySelector('#update-check')?.addEventListener('click', () => {
      state.update = { status: 'checked', checkedAt: new Date().toISOString() };
      persist(); renderUpdate();
      record('update-check', 'Checked the static site locally; no automatic installation was attempted', { installation: 'not supported by a static page' });
    });
    document.querySelector('#update-reload')?.addEventListener('click', () => { record('update-reload', 'Requested a browser reload for the current published site'); location.reload(); });
    renderUpdate();
  }

  function closeContextMenu() { document.querySelector('#delivery-context-menu')?.remove(); }
  function showContextMenu(event) {
    closeContextMenu();
    const menu = document.createElement('div'); menu.id = 'delivery-context-menu'; menu.className = 'delivery-context-menu'; menu.setAttribute('role', 'menu');
    menu.innerHTML = `<label>Filter actions<input id="delivery-context-search" type="search" aria-label="Filter context actions"></label><div class="delivery-context-items"><button type="button" role="menuitem" data-context-action="palette">Open command palette <kbd>Ctrl+Shift+F</kbd></button><button type="button" role="menuitem" data-context-action="record">Record local event <kbd>Ctrl+Enter</kbd></button><button type="button" role="menuitem" data-context-action="escape">Close this menu <kbd>Escape</kbd></button></div>`;
    document.body.append(menu); menu.style.left = `${Math.min(event.clientX, innerWidth - 320)}px`; menu.style.top = `${Math.min(event.clientY, innerHeight - 190)}px`;
    const filter = menu.querySelector('input'); filter.focus();
    filter.addEventListener('input', () => { const query = filter.value.toLocaleLowerCase(); menu.querySelectorAll('[data-context-action]').forEach(item => { item.hidden = !item.textContent.toLocaleLowerCase().includes(query); }); });
    menu.querySelectorAll('[data-context-action]').forEach(button => button.addEventListener('click', () => { if (button.dataset.contextAction === 'palette') document.querySelector('#palette-open')?.click(); if (button.dataset.contextAction === 'record') document.querySelector('#history-event-summary')?.focus(); closeContextMenu(); }));
    document.addEventListener('click', closeContextMenu, { once: true });
    event.preventDefault();
  }

  function ensureNavigation() {
    document.querySelectorAll('.site-nav').forEach(nav => {
      if (!nav.querySelector('a[href$="history.html"]')) { const link = document.createElement('a'); link.href = siteAsset('history.html'); link.textContent = 'Delivery'; nav.append(link); }
    });
  }

  function ensureRail() {
    if (document.querySelector('#delivery-rail')) return;
    const main = document.querySelector('main');
    if (!main) return;
    const rail = document.createElement('section'); rail.id = 'delivery-rail'; rail.className = 'delivery-rail'; rail.dataset.deliveryContext = 'true';
    rail.innerHTML = `<div><span class="eyebrow">LOCAL DELIVERY</span><h2>Keep the evidence close.</h2><p>${escapeHtml(COPY.subtitle)} ${escapeHtml(COPY.staticBoundary)}</p></div><div class="delivery-rail-actions"><a class="secondary-button" href="${siteAsset('history.html')}">Open history workspace</a><button type="button" class="text-button" data-recovery-action="settings">Settings</button><button type="button" class="text-button" data-recovery-action="retry">Retry a handoff</button></div>`;
    main.prepend(rail);
  }

  function ensureRegexDialog() {
    if (document.querySelector('#delivery-regex-dialog')) return;
    const dialog = document.createElement('dialog'); dialog.id = 'delivery-regex-dialog'; dialog.className = 'overlay-card'; dialog.setAttribute('aria-labelledby', 'delivery-regex-title');
    dialog.innerHTML = `<form method="dialog"><div class="dialog-heading"><h2 id="delivery-regex-title">Full regular expression builder</h2><button class="icon-button" value="cancel" aria-label="Close regular expression builder">×</button></div><p id="delivery-regex-label"></p><label>Pattern<input id="delivery-regex-pattern" maxlength="160" spellcheck="false"></label><fieldset><legend>Flags</legend><label><input id="delivery-regex-i" type="checkbox" checked> Ignore case</label><label><input id="delivery-regex-u" type="checkbox" checked> Unicode</label></fieldset><p id="delivery-regex-feedback" role="status">Enter a pattern or leave it blank for plain text.</p><button type="button" id="delivery-regex-apply" class="primary-button">Apply pattern</button></form>`;
    document.body.append(dialog); document.querySelector('#delivery-regex-apply').addEventListener('click', applyRegex);
  }

  function renderPage() {
    const host = document.querySelector('#history-delivery-page');
    if (!host) return;
    host.innerHTML = `<div class="page-intro"><div><span class="eyebrow">DELIVERY WORKSPACE</span><h1>${escapeHtml(COPY.title)}.<br><em>Nothing invented.</em></h1></div><p>${escapeHtml(COPY.subtitle)} ${escapeHtml(COPY.staticBoundary)}</p></div>
      <nav class="local-tabs" aria-label="Delivery sections"><a href="#history" aria-current="page">History</a><a href="#changelog">Changelog</a><a href="#downloads">Download handoff</a><a href="#editor">Editor</a><a href="#publishing">Forge flow</a><a href="#updates">Updates</a></nav>
      <section class="delivery-grid" id="history"><article class="surface-card delivery-panel"><div class="section-heading"><div><span class="card-kicker">APPEND-ONLY</span><h2>Visitor-owned local history</h2><p>Only redacted event metadata is stored in this browser. Restore always appends a new event, never rewrites an earlier one.</p></div><span class="status-chip">Local only</span></div><div class="delivery-form-row"><label>Event summary<input id="history-event-summary" maxlength="240" placeholder="Describe the local change"></label><button id="history-record" class="primary-button" type="button">Record event</button></div><div class="delivery-filter-row"><div class="search-composite wide"><label class="sr-only" for="history-search">Search history</label><input id="history-search" type="search" data-label="history" placeholder="Search action or summary"><button type="button" class="regex-trigger" data-delivery-regex-for="history-search" aria-label="Build a regular expression for history search">.*</button></div><label>From<input id="history-from" type="date"></label><label>To<input id="history-to" type="date"></label><label>Action<select id="history-action"><option value="all">All actions</option></select></label></div><div class="delivery-actions"><button id="history-export-json" class="text-button" type="button">Export redacted JSON</button><button id="history-export-markdown" class="text-button" type="button">Export Markdown</button><button id="history-copy" class="text-button" type="button">Copy filtered history</button></div><p id="history-count" class="filter-status" role="status"></p><p id="history-status" class="export-loss" role="status"></p><div id="history-list"></div></article>
      <article class="surface-card delivery-panel" id="changelog"><div class="section-heading"><div><span class="card-kicker">TRACEABLE RECORD</span><h2>Changelog viewer</h2><p>Recorded changes carry a date, category, full commit link, and exportable filtered view. No release is inferred from a local record.</p></div><span class="status-chip">Evidence links</span></div><div class="delivery-filter-row"><div class="search-composite wide"><label class="sr-only" for="changelog-search">Search changelog</label><input id="changelog-search" type="search" data-label="changelog" placeholder="Search versions, summaries, or commits"><button type="button" class="regex-trigger" data-delivery-regex-for="changelog-search" aria-label="Build a regular expression for changelog search">.*</button></div><label>From<input id="changelog-from" type="date"></label><label>To<input id="changelog-to" type="date"></label></div><div class="delivery-actions"><button id="changelog-export" class="text-button" type="button">Export filtered Markdown</button><button id="changelog-copy" class="text-button" type="button">Copy filtered changes</button></div><p id="changelog-count" class="filter-status" role="status"></p><p id="changelog-status" class="export-loss" role="status"></p><div id="changelog-list"></div></article>
      <article class="surface-card delivery-panel" id="operations"><div class="section-heading"><div><span class="card-kicker">LONG OPERATION</span><h2>Redacted export preparation</h2><p>The operation processes the current local event set in bounded chunks. Start is disabled during the run, cancel is real, and no second run can enter.</p></div><span class="status-chip">Cancellable</span></div><div class="delivery-actions"><button id="operation-start" class="primary-button" type="button">Prepare export</button><button id="operation-cancel" class="text-button" type="button" hidden>Cancel</button></div><progress id="operation-progress" max="100" value="0" aria-label="Redacted export preparation progress"></progress><p id="operation-status" class="export-loss" role="status">No long operation is active.</p></article>
      <article class="surface-card delivery-panel" id="editor"><div class="section-heading"><div><span class="card-kicker">BROWSER HANDOFF</span><h2>External editor</h2><p>Select a local file or use an export, then request the Visual Studio Code protocol. A browser cannot inspect local paths or guarantee that an external editor accepts the request.</p></div><span class="status-chip">No credentials</span></div><div class="delivery-form-row"><label>Local file<input id="editor-file" type="file"></label><button id="open-vscode" class="secondary-button" type="button" disabled>Open exported file in Visual Studio Code</button></div><div class="delivery-actions"><button id="editor-download" type="button" class="text-button">Download Visual Studio Code</button></div><p id="editor-status" class="export-loss" role="status"></p><div class="delivery-recovery" data-recovery><strong>Recovery beside the handoff</strong><p>If the protocol is blocked, download the editor or retry from this card. No path or file content is sent here.</p><button type="button" class="text-button" data-recovery-action="vscode">Open official download</button><span data-recovery-status role="status"></span></div></article>
      <article class="surface-card delivery-panel" id="downloads"><div class="section-heading"><div><span class="card-kicker">BROWSER EXTENSION EQUIVALENT</span><h2>Start, progress, complete</h2><p>This static page hands a real local file to the browser's download manager. The browser owns bytes, rate, ETA, pause, and completion, so this surface never invents progress.</p></div><span class="status-chip">Browser-owned</span></div><div class="delivery-form-row"><label>File to hand off<input id="transfer-file" type="file"></label><span id="transfer-name" class="mono">No file selected</span><button id="transfer-start" class="primary-button" type="button" disabled>Start download</button></div><progress id="transfer-progress" max="100" value="0" aria-label="Browser-owned download progress"></progress><p id="transfer-status" class="export-loss" role="status"></p><div class="delivery-actions"><button id="transfer-cancel" class="text-button" type="button" hidden>Cancel handoff</button><button id="transfer-complete" class="text-button" type="button" hidden>Confirm browser completion</button></div></article>
      <article class="surface-card delivery-panel" id="publishing"><div class="section-heading"><div><span class="card-kicker">FORGE BOUNDARY</span><h2>Publish through the browser</h2><p>Choose a visible account and owner, then open the provider's own flow. This page never stores a credential, signs in, publishes, or silently substitutes a fork for a copy-and-publish flow.</p></div><span class="status-chip">User mediated</span></div><form id="forge-form" class="delivery-form"><label>Account<select id="forge-account"><option value="browser">Use an already signed-in browser account</option><option value="manual">Choose account in the provider flow</option></select></label><label>Owner<input id="forge-owner" maxlength="80" autocomplete="organization" placeholder="Personal account or organization"></label><label>Repository<input id="forge-repository" maxlength="100" autocomplete="off" placeholder="Repository name"></label><label>Route<select id="forge-route"><option value="copy">Copy and publish</option><option value="fork">Provider fork flow</option></select></label><button id="forge-open" class="primary-button" type="button">Open provider flow</button></form><p id="forge-status" class="export-loss" role="status"></p><div class="delivery-recovery" data-recovery><strong>Recovery beside a refused flow</strong><p>Retry the browser handoff or return to local settings. Credentials remain in the provider's own sign-in surface.</p><button type="button" class="text-button" data-recovery-action="retry">Retry</button><span data-recovery-status role="status"></span></div></article>
      <article class="surface-card delivery-panel" id="updates"><div class="section-heading"><div><span class="card-kicker">STATIC UPDATE EQUIVALENT</span><h2>Update and download status</h2><p>A hosted page cannot install software or restart an application. It can record a local check and offer a normal browser reload without claiming that an update was applied.</p></div><span class="status-chip">No install claim</span></div><div class="delivery-actions"><button id="update-check" class="secondary-button" type="button">Check this published page</button><button id="update-reload" class="text-button" type="button">Reload page</button></div><p id="update-status" class="export-loss" role="status"></p></article>
      <article class="surface-card delivery-panel"><div class="section-heading"><div><span class="card-kicker">PROVIDER MARKUP</span><h2>Safe Markdown preview</h2><p>Provider-authored text is escaped first, then only headings, emphasis, code, and plain list rows are rendered. Links, scripts, images, and raw HTML are not executed.</p></div><span class="status-chip">Local preview</span></div><label>Paste provider-authored Markdown<textarea id="provider-markdown" rows="6" placeholder="No provider-authored text is loaded. Paste text here to preview it locally."></textarea></label><div class="delivery-actions"><button id="provider-render" class="secondary-button" type="button">Render safe preview</button><button id="provider-clear" class="text-button" type="button">Clear preview</button></div><div id="provider-preview" class="provider-markdown" aria-live="polite"><p>No provider-authored text is loaded.</p></div></article></section>`;
    bindHistory(); bindChangelog(); bindEditor(); bindTransfer(); bindOperation(); bindRecovery(); bindForge(); bindUpdate();
    document.querySelector('#provider-render')?.addEventListener('click', () => { const value = document.querySelector('#provider-markdown').value.slice(0, 20000); document.querySelector('#provider-preview').innerHTML = parseProviderMarkdown(value) || '<p>No provider-authored text is loaded.</p>'; record('provider-preview', 'Rendered provider-authored Markdown in the isolated local preview', { content: 'omitted' }); });
    document.querySelector('#provider-clear')?.addEventListener('click', () => { document.querySelector('#provider-markdown').value = ''; document.querySelector('#provider-preview').innerHTML = '<p>No provider-authored text is loaded.</p>'; });
  }

  function init() {
    if (document.documentElement.dataset.historyDeliveryReady === 'true') return;
    document.documentElement.dataset.historyDeliveryReady = 'true';
    ensureNavigation(); ensureRail(); ensureRegexDialog();
    document.querySelectorAll('[data-delivery-context]').forEach(target => target.addEventListener('contextmenu', showContextMenu));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeContextMenu(); if (event.ctrlKey && event.shiftKey && event.key.toLocaleLowerCase() === 'f') document.querySelector('#palette-open')?.click(); if (event.ctrlKey && event.key === 'Enter' && document.activeElement?.id === 'history-event-summary') { event.preventDefault(); document.querySelector('#history-record')?.click(); } });
    renderPage();
    if (document.querySelector('#delivery-rail')) bindRecovery();
  }

  if (window.__dingSiteReady || document.readyState !== 'loading') init();
  else document.addEventListener('site:ready', init, { once: true });
  window.DingSiteHistoryDelivery = { init, record, renderMarkdown: parseProviderMarkdown };
})();
