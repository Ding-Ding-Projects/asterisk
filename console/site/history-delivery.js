(() => {
  'use strict';

  const STORAGE_KEY = 'ding-pbx-site-history-delivery-v1';
  const STATE_SCHEMA_VERSION = 3;
  const HISTORY_EXPORT_SCHEMA_VERSION = 2;
  const MAX_IMPORT_BYTES = 512 * 1024;
  const HISTORY_IMPORT_AUDIT_KEY = `${STORAGE_KEY}-import-audit`;
  const DELIVERY_STATES = new Set(['idle', 'preparing', 'prepared', 'handoff-started', 'handoff-unverified', 'handoff-cancelled', 'handoff-failed']);
  const MAX_HISTORY = 250;
  const MAX_EVENT_COUNT = 100000;
  const MAX_EVENT_BYTES = 64 * 1024 * 1024;
  const CANONICAL_ID_PATTERN = /^[a-z0-9_-]{1,80}$/;
  const CHANGELOG = (Array.isArray(window.DING_SITE_CHANGELOG) ? window.DING_SITE_CHANGELOG : []).filter(entry => entry && /^[0-9a-f]{40}$/.test(entry.commit || '') && entry.version && entry.date && entry.summary);
  const PRODUCT_CHANGELOG = CHANGELOG.filter(entry => entry.category === 'Release');
  const UPSTREAM_HISTORY = CHANGELOG.filter(entry => entry.category !== 'Release');
  const RELEASE_MANIFEST = window.DING_SITE_RELEASE_MANIFEST && typeof window.DING_SITE_RELEASE_MANIFEST === 'object' ? window.DING_SITE_RELEASE_MANIFEST : null;
  const PUBLIC_REPOSITORY_URL = 'https://github.com/Ding-Ding-Projects/material-asterisk';

  const COPY = {
    title: 'Local delivery workspace',
    subtitle: 'History, changelog, handoff, and recovery tools for this browser only.',
    staticBoundary: 'This is a documentation and download surface, not the installed desktop application or a PBX runtime.',
  };
  const TAB_ROUTES = [
    ['home', 'Home', 'index.html'], ['product', 'Product', 'product.html'], ['documentation', 'Documentation', 'documentation.html'],
    ['downloads', 'Downloads', 'downloads.html'], ['status', 'Status', 'status.html'], ['settings', 'Settings', 'settings.html'], ['ollama', 'Ollama', 'ollama.html'], ['history', 'Delivery', 'history.html'],
  ];

  const own = (value, fallback) => value === undefined || value === null ? fallback : value;
  const id = value => String(value || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || `event-${Date.now()}`;
  const isCanonicalId = value => typeof value === 'string' && CANONICAL_ID_PATTERN.test(value);
  const isFiniteTimestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
  const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const text = value => String(own(value, '')).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 600);
  const escapeHtml = value => text(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

  function siteAsset(name) {
    const script = document.currentScript;
    if (script?.src) return new URL(name, script.src).href;
    return new URL(name, document.baseURI).href;
  }

  function normalizePersistedEventParams(action, params) {
    if (action === 'history-import' && params && typeof params === 'object' && !Array.isArray(params)) {
      const keys = Object.keys(params).sort().join(',');
      if (keys === 'imported,refused,truncated') return normalizeEventParams(action, { imported: params.imported, refused: params.refused, existingTruncated: 0, importTruncated: params.truncated });
    }
    return normalizeEventParams(action, params);
  }

  function migrateLegacyEvent(event) {
    if (event && typeof event.params === 'object') return normalizePersistedEventParams(event.action, event.params);
    const details = event?.details && typeof event.details === 'object' ? event.details : {};
    if (event?.action === 'restored' && EVENT_ACTIONS.has(details.sourceAction) && isCanonicalId(details.sourceEvent)) return { sourceAction: details.sourceAction, sourceEvent: details.sourceEvent };
    if (event?.action === 'pruned' && Number.isInteger(details.eventCount) && Number.isInteger(details.retention)) return { count: details.eventCount, retention: details.retention };
    if (['download-started', 'download-complete', 'download-cancelled'].includes(event?.action) && Number.isInteger(details.bytes)) return { bytes: details.bytes, status: event.action === 'download-started' ? 'writing' : event.action === 'download-complete' ? 'stream-closed' : 'cancelled' };
    if (event?.action === 'download-interrupted' && details.status === 'interrupted') return { status: 'interrupted' };
    if (event?.action === 'update-check' && EVENT_ENUMS.updateStatus.has(details.status)) return { status: details.status };
    if (event?.action === 'update-reload') return { status: 'requested' };
    if (event?.action === 'recovery-opened' && EVENT_ENUMS.recoveryAction.has(details.action)) return { action: details.action };
    if (event?.action === 'forge-preview' && EVENT_ENUMS.source.has(details.source) && EVENT_ENUMS.destination.has(details.destination) && EVENT_ENUMS.account.has(details.account) && EVENT_ENUMS.route.has(details.route)) return { source: details.source, destination: details.destination, account: details.account, route: details.route, status: 'preview-ready' };
    if (event?.action === 'forge-handoff' && EVENT_ENUMS.source.has(details.source) && EVENT_ENUMS.destination.has(details.destination) && EVENT_ENUMS.account.has(details.account) && EVENT_ENUMS.route.has(details.route)) return { source: details.source, destination: details.destination, account: details.account, route: details.route, status: 'preview-opened' };
    if (event?.action === 'provider-preview' && details.content === 'omitted') return { status: 'rendered' };
    return null;
  }
  function migrateLegacyHistory(events) {
    const counts = { imported: 0, omitted: 0, refused: 0, retentionOmitted: 0 };
    const migrated = [];
    const seen = new Set();
    for (const event of Array.isArray(events) ? events : []) {
      if (!event || typeof event !== 'object') { counts.omitted += 1; continue; }
      if (!hasOwn(event, 'id') || !hasOwn(event, 'timestamp') || !hasOwn(event, 'action')) { counts.omitted += 1; continue; }
      if (typeof event.id !== 'string' || typeof event.timestamp !== 'string' || typeof event.action !== 'string' || !isCanonicalId(event.id) || seen.has(event.id) || !isFiniteTimestamp(event.timestamp)) { counts.refused += 1; continue; }
      seen.add(event.id);
      const params = normalizePersistedEventParams(event.action, migrateLegacyEvent(event));
      if (!params) { counts.refused += 1; continue; }
      migrated.push({ id: event.id, timestamp: event.timestamp.slice(0, 40), action: event.action, params }); counts.imported += 1;
    }
    const retained = migrated.slice(-MAX_HISTORY); counts.retentionOmitted = migrated.length - retained.length; counts.imported = retained.length;
    return { events: retained, counts };
  }
  function normalizeCurrentHistory(events) {
    const counts = { imported: 0, omitted: 0, refused: 0, retentionOmitted: 0 };
    const normalized = [];
    const seen = new Set();
    for (const event of Array.isArray(events) ? events : []) {
      if (!event || typeof event !== 'object') { counts.omitted += 1; continue; }
      if (!hasOwn(event, 'id') || !hasOwn(event, 'timestamp') || !hasOwn(event, 'action')) { counts.omitted += 1; continue; }
      if (typeof event.id !== 'string' || typeof event.timestamp !== 'string' || typeof event.action !== 'string' || !isCanonicalId(event.id) || seen.has(event.id) || !isFiniteTimestamp(event.timestamp)) { counts.refused += 1; continue; }
      seen.add(event.id);
      const params = normalizePersistedEventParams(event.action, event.params);
      if (!params) { counts.refused += 1; continue; }
      normalized.push({ id: event.id, timestamp: event.timestamp.slice(0, 40), action: event.action, params });
    }
    const retained = normalized.slice(-MAX_HISTORY); counts.retentionOmitted = normalized.length - retained.length; counts.imported = retained.length;
    return { events: retained, counts };
  }

  function defaultState() {
    return { schemaVersion: STATE_SCHEMA_VERSION, migration: { status: 'none', sourceVersion: STATE_SCHEMA_VERSION, recorded: false }, history: [], tabs: TAB_ROUTES.map(([idValue], index) => ({ id: idValue, pinned: index < 2 })), forge: { account: 'browser', owner: '', repository: '', route: 'copy', source: 'current-site', destination: 'new-repository' }, editor: { lastPreparedExport: '', lastHandoffState: 'idle', lastExport: '' }, delivery: { status: 'idle', reason: '' }, transfer: { status: 'idle', handoffState: 'idle', name: '', startedAt: '', completedAt: '', totalBytes: 0, bytesWritten: 0, interruptionRecorded: false, resume: 'never' }, update: { status: 'ready', checkedAt: '' } };
  }
  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const defaults = defaultState();
      const persistedVersion = Number(parsed.schemaVersion ?? 1);
      if (!Number.isInteger(persistedVersion) || persistedVersion > STATE_SCHEMA_VERSION) return { ...defaults, migration: { status: 'future-version-refused', sourceVersion: persistedVersion, recorded: false } };
      const migratedLegacy = persistedVersion < STATE_SCHEMA_VERSION ? migrateLegacyHistory(parsed.history) : normalizeCurrentHistory(parsed.history);
      const history = migratedLegacy.events;
      const allowedTabs = new Set(TAB_ROUTES.map(([idValue]) => idValue));
      const tabs = Array.isArray(parsed.tabs) ? parsed.tabs.filter(tab => tab && allowedTabs.has(tab.id)).map(tab => ({ id: tab.id, pinned: Boolean(tab.pinned) })) : defaults.tabs;
      const forge = parsed.forge && typeof parsed.forge === 'object' ? { account: ['browser', 'manual'].includes(parsed.forge.account) ? parsed.forge.account : 'browser', owner: scrubSummary(parsed.forge.owner).slice(0, 80), repository: scrubSummary(parsed.forge.repository).slice(0, 100), route: ['copy', 'fork'].includes(parsed.forge.route) ? parsed.forge.route : 'copy', source: ['current-site', 'local-export', 'selected-file'].includes(parsed.forge.source) ? parsed.forge.source : 'current-site', destination: ['new-repository', 'existing-repository'].includes(parsed.forge.destination) ? parsed.forge.destination : 'new-repository' } : defaults.forge;
      const transferStatus = ['idle', 'started', 'complete', 'cancelled', 'unavailable', 'interrupted'].includes(parsed.transfer?.status) ? parsed.transfer.status : 'idle';
      const updateStatus = ['ready', 'unavailable', 'available', 'downloading', 'failed'].includes(parsed.update?.status) ? parsed.update.status : 'ready';
      const deliveryStatus = DELIVERY_STATES.has(parsed.delivery?.status) ? parsed.delivery.status : 'idle';
      const transferHandoffState = ['idle', 'handoff-started', 'prepared', 'handoff-cancelled', 'handoff-failed'].includes(parsed.transfer?.handoffState) ? parsed.transfer.handoffState : 'idle';
      const persistedCounts = parsed.migration?.counts && typeof parsed.migration.counts === 'object' ? { imported: Number.isInteger(parsed.migration.counts.imported) ? parsed.migration.counts.imported : 0, omitted: Number.isInteger(parsed.migration.counts.omitted) ? parsed.migration.counts.omitted : 0, refused: Number.isInteger(parsed.migration.counts.refused) ? parsed.migration.counts.refused : 0, retentionOmitted: Number.isInteger(parsed.migration.counts.retentionOmitted) ? parsed.migration.counts.retentionOmitted : 0 } : { imported: 0, omitted: 0, refused: 0, retentionOmitted: 0 };
      const currentLoss = migratedLegacy.counts.refused || migratedLegacy.counts.omitted || migratedLegacy.counts.retentionOmitted;
      const persistedLoss = persistedCounts.refused || persistedCounts.omitted || persistedCounts.retentionOmitted;
      const migrationStatus = persistedVersion < STATE_SCHEMA_VERSION ? (currentLoss ? 'migrated-with-loss' : 'migrated') : currentLoss ? 'normalized-with-loss' : persistedLoss && ['migrated-with-loss', 'normalized-with-loss'].includes(parsed.migration?.status) ? parsed.migration.status : ['migrated', 'migrated-with-loss', 'normalized-with-loss'].includes(parsed.migration?.status) ? parsed.migration.status : 'none';
      const migrationCounts = persistedVersion < STATE_SCHEMA_VERSION || currentLoss ? migratedLegacy.counts : persistedCounts;
      if (persistedVersion === STATE_SCHEMA_VERSION && migrationStatus === 'normalized-with-loss') appendMigrationAudit('normalized-with-loss', persistedVersion, migrationCounts, 'normalized-records-refused-or-omitted');
      return { schemaVersion: STATE_SCHEMA_VERSION, migration: { status: migrationStatus, sourceVersion: persistedVersion < STATE_SCHEMA_VERSION ? persistedVersion : parsed.migration?.sourceVersion || persistedVersion, recorded: parsed.migration?.recorded === true, counts: migrationCounts }, history, tabs, forge, editor: { lastPreparedExport: scrubSummary(parsed.editor?.lastPreparedExport).slice(0, 120), lastHandoffState: ['idle', 'handoff-started', 'handoff-unverified', 'handoff-failed', 'handoff-cancelled'].includes(parsed.editor?.lastHandoffState) ? parsed.editor.lastHandoffState : 'idle', lastExport: scrubSummary(parsed.editor?.lastExport).slice(0, 120) }, delivery: { status: deliveryStatus, reason: scrubSummary(parsed.delivery?.reason).slice(0, 240) }, transfer: { status: transferStatus === 'started' ? 'interrupted' : transferStatus, handoffState: transferHandoffState, name: scrubSummary(parsed.transfer?.name).slice(0, 160), startedAt: text(parsed.transfer?.startedAt).slice(0, 40), completedAt: text(parsed.transfer?.completedAt).slice(0, 40), totalBytes: Number.isFinite(parsed.transfer?.totalBytes) ? Math.max(0, parsed.transfer.totalBytes) : 0, bytesWritten: Number.isFinite(parsed.transfer?.bytesWritten) ? Math.max(0, parsed.transfer.bytesWritten) : 0, interruptionRecorded: transferStatus === 'started' ? false : parsed.transfer?.interruptionRecorded === true, resume: 'never' }, update: { status: updateStatus, checkedAt: text(parsed.update?.checkedAt).slice(0, 40) } };
    } catch {
      return defaultState();
    }
  }

  let state;
  let historyQuery = { text: '', from: '', to: '', action: 'all', regex: false, pattern: '', flags: 'iu' };
  let changelogQuery = { text: '', from: '', to: '', regex: false, pattern: '', flags: 'iu' };
  let includeUpstreamHistory = false;
  let activeRegexTarget = null;
  let contextOrigin = null;
  let transferAbort = null;
  let transferWriter = null;
  let transferDestinationName = '';
  let operation = { running: false, cancelled: false, index: 0, total: 0, timer: 0 };

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* local storage can be unavailable in private browsing */ }
  }
  function setDeliveryState(status, reason = '') {
    if (!DELIVERY_STATES.has(status)) return false;
    state.delivery = { status, reason: scrubSummary(reason).slice(0, 240) };
    persist();
    const output = document.querySelector('#delivery-state'); if (output) output.textContent = `Delivery state: ${status}. ${state.delivery.reason || 'No additional detail.'}`;
    return true;
  }
  function appendMigrationAudit(status, sourceVersion, counts = { imported: 0, omitted: 0, refused: 0, retentionOmitted: 0 }, reason = '') {
    try {
      const key = `${STORAGE_KEY}-migration-audit`;
      const audit = JSON.parse(localStorage.getItem(key) || '[]');
      if (!audit.some(item => item.status === status && item.sourceVersion === sourceVersion)) {
        audit.push({ schemaVersion: 1, status, sourceVersion, imported: counts.imported, omitted: counts.omitted, refused: counts.refused, retentionOmitted: counts.retentionOmitted || 0, refusal: scrubSummary(reason).slice(0, 160), timestamp: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(audit.slice(-20)));
      }
    } catch { /* refusal remains visible even when audit storage is unavailable */ }
  }
  function renderMigrationAudit() {
    const host = document.querySelector('#migration-audit-list'); if (!host) return;
    try {
      const audit = JSON.parse(localStorage.getItem(`${STORAGE_KEY}-migration-audit`) || '[]');
      host.innerHTML = audit.length ? audit.slice().reverse().map(item => `<li>${escapeHtml(item.status)} · saved state version ${escapeHtml(item.sourceVersion)} · imported ${escapeHtml(item.imported || 0)}, omitted ${escapeHtml(item.omitted || 0)}, refused ${escapeHtml(item.refused || 0)}, retention omitted ${escapeHtml(item.retentionOmitted || 0)} · ${escapeHtml(item.refusal || 'reason omitted')} · ${escapeHtml(formatDate(item.timestamp))}</li>`).join('') : '<li>No migration refusal audit records.</li>';
    } catch { host.textContent = 'Migration audit is unavailable because local audit storage could not be read.'; }
  }
  function ensureMigrationAuditPanel() {
    if (document.querySelector('#migration-audit')) return;
    const status = document.querySelector('#history-status'); if (!status) return;
    const panel = document.createElement('details'); panel.id = 'migration-audit'; panel.className = 'delivery-migration-audit'; panel.innerHTML = '<summary>State migration refusal audit</summary><p>Future saved-state versions are refused without applying their records. This audit is stored separately from ordinary history, contains only schema status, version, and time, and is omitted from ordinary history exports.</p><ul id="migration-audit-list"></ul>';
    status.after(panel); renderMigrationAudit();
  }
  function appendHistoryImportAudit(params, reason, schemaVersion, eventSchemaVersion) {
    try {
      if (schemaVersion !== HISTORY_EXPORT_SCHEMA_VERSION || eventSchemaVersion !== STATE_SCHEMA_VERSION) return false;
      const audit = JSON.parse(localStorage.getItem(HISTORY_IMPORT_AUDIT_KEY) || '[]');
      audit.push({ auditSchemaVersion: 1, schemaVersion, eventSchemaVersion, imported: params.imported, refused: params.refused, existingTruncated: params.existingTruncated, importTruncated: params.importTruncated, reason: scrubSummary(reason).slice(0, 160), timestamp: new Date().toISOString() });
      localStorage.setItem(HISTORY_IMPORT_AUDIT_KEY, JSON.stringify(audit.slice(-20)));
      renderHistoryImportAudit();
      return true;
    } catch {
      return false;
    }
  }
  function renderHistoryImportAudit() {
    const host = document.querySelector('#history-import-audit-list'); if (!host) return;
    try {
      const audit = JSON.parse(localStorage.getItem(HISTORY_IMPORT_AUDIT_KEY) || '[]');
      host.innerHTML = audit.length ? audit.slice().reverse().map(item => `<li>Export schema ${escapeHtml(item.schemaVersion || '?')}, event schema ${escapeHtml(item.eventSchemaVersion || '?')}: imported ${escapeHtml(item.imported || 0)}, refused ${escapeHtml(item.refused || 0)}, existing truncated ${escapeHtml(item.existingTruncated || 0)}, import truncated ${escapeHtml(item.importTruncated || 0)} · ${escapeHtml(item.reason || 'no-op import')} · ${escapeHtml(formatDate(item.timestamp))}</li>`).join('') : '<li>No separate no-op import audits.</li>';
    } catch { host.textContent = 'The separate no-op import audit is unavailable because local audit storage could not be read.'; }
  }

  function scrubSummary(value) {
    return text(value).replace(/(?:bearer|token|password|passwd|secret|api[-_]?key)\s*[:=]\s*\S+/gi, '[redacted]').replace(/https?:\/\/\S+/gi, '[url omitted]').replace(/(?:[A-Za-z]:\\|\\\\|\/(?:Users|home|private|tmp)\/)[^\s]+/gi, '[path omitted]').replace(/\b[0-9a-f]{32,}\b/gi, '[redacted]').slice(0, 240);
  }
  const REDACTED_DETAIL_KEYS = new Set(['source', 'route', 'action', 'bytes', 'progress', 'owner', 'repository', 'protocol', 'restore', 'completion', 'installation', 'content', 'privateVocabulary', 'credentials', 'mode', 'status', 'name', 'tag', 'commit', 'provider', 'account', 'destination', 'eventCount', 'sourceEvent']);
  const EVENT_ACTIONS = new Set(['updated', 'restored', 'pruned', 'download-started', 'download-complete', 'download-cancelled', 'download-interrupted', 'update-check', 'update-reload', 'recovery-opened', 'forge-preview', 'forge-handoff', 'tab-pin', 'provider-preview', 'state-migration', 'history-import']);
  const EVENT_ENUMS = {
    updatedField: new Set(['settings', 'history', 'appearance', 'delivery']),
    updatedStatus: new Set(['changed', 'reset', 'imported']),
    deliveryStatus: new Set(['writing', 'stream-closed', 'cancelled', 'interrupted']),
    recoveryAction: new Set(['retry', 'settings', 'vscode']),
    source: new Set(['current-site', 'local-export', 'selected-file']),
    destination: new Set(['new-repository', 'existing-repository']),
    account: new Set(['browser', 'manual']),
    route: new Set(['copy', 'fork']),
    updateStatus: new Set(['unavailable', 'available', 'downloading', 'ready', 'failed']),
    forgeStatus: new Set(['preview-ready', 'preview-opened']),
    tab: new Set(TAB_ROUTES.map(([idValue]) => idValue)),
  };
  const ACTION_LABELS = { updated: ['Updated', '更新'], restored: ['Restored', '還原'], pruned: ['Pruned', '清理'], 'download-started': ['Download started', '開始下載'], 'download-complete': ['Download complete', '下載完成'], 'download-cancelled': ['Download cancelled', '取消下載'], 'download-interrupted': ['Download interrupted', '下載中斷'], 'update-check': ['Update check', '檢查更新'], 'update-reload': ['Reload requested', '要求重新載入'], 'recovery-opened': ['Recovery opened', '開啟恢復'], 'forge-preview': ['Forge preview', '發佈預覽'], 'forge-handoff': ['Forge handoff', '發佈交接'], 'tab-pin': ['Route pin', '路線釘選'], 'provider-preview': ['Provider preview', '供應商預覽'], 'state-migration': ['State migration', '狀態遷移'], 'history-import': ['History import', '匯入歷史'] };
  const ENUM_LABELS = {
    field: { settings: ['Settings', '設定'], history: ['History', '歷史'], appearance: ['Appearance', '外觀'], delivery: ['Delivery', '交付'] },
    status: {
      changed: ['Changed', '改動'], reset: ['Reset', '重設'], imported: ['Imported', '匯入'], writing: ['Writing', '寫入中'], 'stream-closed': ['Stream closed', '串流已關閉'], cancelled: ['Cancelled', '已取消'], interrupted: ['Interrupted', '已中斷'],
      unavailable: ['Unavailable', '未能使用'], available: ['Available', '可用'], downloading: ['Downloading', '下載中'], ready: ['Ready', '準備好'], failed: ['Failed', '失敗'], requested: ['Requested', '已要求'], 'preview-ready': ['Preview ready', '預覽準備好'], 'preview-opened': ['Preview opened', '預覽已開啟'], rendered: ['Rendered', '已顯示'], migrated: ['Migrated', '已遷移'], 'migrated-with-loss': ['Migrated with recorded loss', '遷移但有記錄損失'], 'normalized-with-loss': ['Normalized with recorded loss', '正規化但有記錄損失']
    },
    action: { all: ['All actions', '全部動作'], ...ACTION_LABELS },
    source: { 'current-site': ['Current site', '目前頁面'], 'local-export': ['Local export', '本地匯出'], 'selected-file': ['Selected file', '已選檔案'] },
    destination: { 'new-repository': ['New repository', '新專案庫'], 'existing-repository': ['Existing repository', '現有專案庫'] },
    account: { browser: ['Browser account', '瀏覽器帳戶'], manual: ['Provider selection', '供應商選擇'] },
    route: { copy: ['Copy and publish', '複製及發佈'], fork: ['Fork flow', '分叉流程'] },
    recoveryAction: { retry: ['Retry', '重試'], settings: ['Open settings', '開啟設定'], vscode: ['Open Visual Studio Code download', '開啟 Visual Studio Code 下載'] },
    deliveryStatus: { writing: ['Writing', '寫入中'], 'stream-closed': ['Stream closed', '串流已關閉'], cancelled: ['Cancelled', '已取消'], interrupted: ['Interrupted', '已中斷'] },
    updateStatus: { unavailable: ['Unavailable', '未能使用'], available: ['Available', '可用'], downloading: ['Downloading', '下載中'], ready: ['Ready', '準備好'], failed: ['Failed', '失敗'] },
    forgeStatus: { 'preview-ready': ['Preview ready', '預覽準備好'], 'preview-opened': ['Preview opened', '預覽已開啟'] },
    tab: Object.fromEntries(TAB_ROUTES.map(([idValue, label]) => [idValue, [label, label]])),
  };
  function localizedEnumLabel(kind, value) { const pair = ENUM_LABELS[kind]?.[value] || [value, value]; try { const mode = JSON.parse(localStorage.getItem('ding-pbx-pages-v2') || '{}').language; return mode === 'zh' ? pair[1] : mode === 'both' ? `${pair[0]} · ${pair[1]}` : pair[0]; } catch { return pair[0]; } }
  function normalizeEventParams(action, params = {}) {
    if (!EVENT_ACTIONS.has(action) || !params || typeof params !== 'object' || Array.isArray(params)) return null;
    const allowed = { updated: ['field', 'status'], restored: ['sourceAction', 'sourceEvent'], pruned: ['count', 'retention'], 'download-started': ['bytes', 'status'], 'download-complete': ['bytes', 'status'], 'download-cancelled': ['bytes', 'status'], 'download-interrupted': ['status'], 'update-check': ['status'], 'update-reload': ['status'], 'recovery-opened': ['action'], 'forge-preview': ['source', 'destination', 'account', 'route', 'status'], 'forge-handoff': ['source', 'destination', 'account', 'route', 'status'], 'tab-pin': ['tab', 'pinned'], 'provider-preview': ['status'], 'state-migration': ['fromVersion', 'toVersion', 'status', 'imported', 'omitted', 'refused', 'retentionOmitted'], 'history-import': ['imported', 'refused', 'existingTruncated', 'importTruncated'] }[action] || [];
    if (Object.keys(params).some(key => !allowed.includes(key) || ['__proto__', 'constructor', 'prototype'].includes(key))) return null;
    const integer = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
    const count = value => integer(value) !== null && value <= MAX_EVENT_COUNT ? integer(value) : null;
    const bytes = value => integer(value) !== null && value <= MAX_EVENT_BYTES ? integer(value) : null;
    const version = value => integer(value) !== null && value > 0 && value <= STATE_SCHEMA_VERSION ? integer(value) : null;
    if (action === 'updated') return EVENT_ENUMS.updatedField.has(params.field) && EVENT_ENUMS.updatedStatus.has(params.status) ? { field: params.field, status: params.status } : null;
    if (action === 'restored') return EVENT_ACTIONS.has(params.sourceAction) && isCanonicalId(params.sourceEvent) ? { sourceAction: params.sourceAction, sourceEvent: params.sourceEvent } : null;
    if (action === 'pruned') return count(params.count) !== null && count(params.retention) !== null ? { count: count(params.count), retention: count(params.retention) } : null;
    if (['download-started', 'download-complete', 'download-cancelled'].includes(action)) return bytes(params.bytes) !== null && EVENT_ENUMS.deliveryStatus.has(params.status) ? { bytes: bytes(params.bytes), status: params.status } : null;
    if (action === 'download-interrupted') return params.status === 'interrupted' ? { status: params.status } : null;
    if (action === 'update-check') return EVENT_ENUMS.updateStatus.has(params.status) ? { status: params.status } : null;
    if (action === 'update-reload') return params.status === 'requested' ? { status: params.status } : null;
    if (action === 'recovery-opened') return EVENT_ENUMS.recoveryAction.has(params.action) ? { action: params.action } : null;
    if (['forge-preview', 'forge-handoff'].includes(action)) return EVENT_ENUMS.source.has(params.source) && EVENT_ENUMS.destination.has(params.destination) && EVENT_ENUMS.account.has(params.account) && EVENT_ENUMS.route.has(params.route) && EVENT_ENUMS.forgeStatus.has(params.status) ? { source: params.source, destination: params.destination, account: params.account, route: params.route, status: params.status } : null;
    if (action === 'tab-pin') return EVENT_ENUMS.tab.has(params.tab) && typeof params.pinned === 'boolean' ? { tab: params.tab, pinned: params.pinned } : null;
    if (action === 'provider-preview') return params.status === 'rendered' ? { status: params.status } : null;
    if (action === 'state-migration') return version(params.fromVersion) !== null && params.toVersion === STATE_SCHEMA_VERSION && ['migrated', 'migrated-with-loss', 'normalized-with-loss'].includes(params.status) && count(params.imported) !== null && count(params.omitted) !== null && count(params.refused) !== null && count(params.retentionOmitted) !== null ? { fromVersion: version(params.fromVersion), toVersion: STATE_SCHEMA_VERSION, status: params.status, imported: count(params.imported), omitted: count(params.omitted), refused: count(params.refused), retentionOmitted: count(params.retentionOmitted) } : null;
    if (action === 'history-import') return count(params.imported) !== null && count(params.refused) !== null && count(params.existingTruncated) !== null && count(params.importTruncated) !== null ? { imported: count(params.imported), refused: count(params.refused), existingTruncated: count(params.existingTruncated), importTruncated: count(params.importTruncated) } : null;
    return null;
  }
  function eventSentence(event) {
    const p = event.params || {};
    const labels = { field: { settings: ['settings', '設定'], history: ['history', '歷史'], appearance: ['appearance', '外觀'], delivery: ['delivery', '交付'] }, status: { changed: ['changed', '改動'], reset: ['reset', '重設'], imported: ['imported', '匯入'], writing: ['writing', '寫入中'], 'stream-closed': ['stream closed', '串流已關閉'], cancelled: ['cancelled', '已取消'], interrupted: ['interrupted', '已中斷'], unavailable: ['unavailable', '不可用'], available: ['available', '可用'], downloading: ['downloading', '下載中'], ready: ['ready', '已準備'], failed: ['failed', '失敗'], requested: ['requested', '已要求'], 'preview-ready': ['preview ready', '預覽已準備'], 'preview-opened': ['preview opened', '預覽已開啟'], rendered: ['rendered', '已顯示'], migrated: ['migrated', '已遷移'], 'migrated-with-loss': ['migrated with recorded loss', '遷移但有記錄損失'] }, action: { retry: ['retry', '重試'], settings: ['settings', '設定'], vscode: ['editor download', '編輯器下載'] }, source: { 'current-site': ['current site', '目前頁面'], 'local-export': ['local export', '本地匯出'], 'selected-file': ['selected file', '已選檔案'] }, destination: { 'new-repository': ['new repository', '新專案庫'], 'existing-repository': ['existing repository', '現有專案庫'] }, account: { browser: ['browser account', '瀏覽器帳戶'], manual: ['provider selection', '供應商選擇'] }, route: { copy: ['copy and publish', '複製及發佈'], fork: ['fork flow', '分叉流程'] }, tab: Object.fromEntries(TAB_ROUTES.map(([idValue, label]) => [idValue, [label, label]])) };
    const label = (kind, value, language) => labels[kind]?.[value]?.[language === 'zh' ? 1 : 0] || value;
    const en = { updated: `Updated ${label('field', p.field, 'en')} settings`, restored: `Restored a ${label('action', p.sourceAction, 'en')} event as a new event`, pruned: `Pruned ${p.count} older events, retaining ${p.retention}`, 'download-started': `Started ${label('status', p.status, 'en')} ${p.bytes} bytes`, 'download-complete': `Finished writing ${p.bytes} bytes`, 'download-cancelled': `Cancelled after writing ${p.bytes} bytes`, 'download-interrupted': `Marked the write ${label('status', p.status, 'en')}`, 'update-check': `Checked update state: ${label('status', p.status, 'en')}`, 'update-reload': 'Requested a page reload', 'recovery-opened': `Opened recovery action: ${label('action', p.action, 'en')}`, 'forge-preview': `Prepared a ${label('route', p.route, 'en')} preview from ${label('source', p.source, 'en')} to ${label('destination', p.destination, 'en')} for ${label('account', p.account, 'en')}`, 'forge-handoff': `Opened a ${label('route', p.route, 'en')} preview`, 'tab-pin': `${p.pinned ? 'Pinned' : 'Unpinned'} the ${label('tab', p.tab, 'en')} route`, 'provider-preview': 'Rendered a safe provider preview', 'state-migration': `${label('status', p.status, 'en')} saved state from version ${p.fromVersion} to ${p.toVersion}, imported ${p.imported}, omitted ${p.omitted}, refused ${p.refused}, retention omitted ${p.retentionOmitted}`, 'history-import': `Imported ${p.imported} events, refused ${p.refused}, existing live events truncated ${p.existingTruncated}, imported events truncated ${p.importTruncated}` }[event.action] || 'Recorded a local event';
    const zh = { updated: `更新咗 ${label('field', p.field, 'zh')} 設定`, restored: `將 ${label('action', p.sourceAction, 'zh')} 記錄另存成新記錄`, pruned: `清理咗 ${p.count} 個舊記錄，保留 ${p.retention} 個`, 'download-started': `開始${label('status', p.status, 'zh')} ${p.bytes} bytes`, 'download-complete': `完成寫入 ${p.bytes} bytes`, 'download-cancelled': `寫入 ${p.bytes} bytes 後取消`, 'download-interrupted': `標記寫入為${label('status', p.status, 'zh')}`, 'update-check': `檢查更新狀態：${label('status', p.status, 'zh')}`, 'update-reload': '要求重新載入頁面', 'recovery-opened': `開啟恢復動作：${label('action', p.action, 'zh')}`, 'forge-preview': `準備由${label('source', p.source, 'zh')} 到${label('destination', p.destination, 'zh')} 嘅${label('route', p.route, 'zh')}預覽，使用${label('account', p.account, 'zh')}`, 'forge-handoff': `開啟咗${label('route', p.route, 'zh')}預覽`, 'tab-pin': `${p.pinned ? '釘選' : '取消釘選'} ${label('tab', p.tab, 'zh')} 路線`, 'provider-preview': '安全顯示 provider preview', 'state-migration': `${label('status', p.status, 'zh')} state 由版本 ${p.fromVersion} 到 ${p.toVersion}，匯入 ${p.imported}、省略 ${p.omitted}、拒絕 ${p.refused}、保留上限省略 ${p.retentionOmitted}`, 'history-import': `匯入 ${p.imported} 個記錄，拒絕 ${p.refused}，現有記錄截斷 ${p.existingTruncated}，匯入記錄截斷 ${p.importTruncated}` }[event.action] || '記錄咗一項本地事件';
    try { const prefs = JSON.parse(localStorage.getItem('ding-pbx-pages-v2') || '{}'); const mode = prefs.language; const enLevel = Math.max(0, Math.min(4, Number.isInteger(prefs.englishFunny) ? prefs.englishFunny : 0)); const zhLevel = Math.max(0, Math.min(4, Number.isInteger(prefs.cantoneseFunny) ? prefs.cantoneseFunny : 0)); const enVariants = [sentence => sentence, sentence => `${sentence} (local record)`, sentence => `${sentence}. The tiny ledger agrees.`, sentence => `${sentence}. The paper trail has shown up.`, sentence => `${sentence}. The evidence drawer is wearing a tie.`]; const zhVariants = [sentence => sentence, sentence => `${sentence}（本地記錄）`, sentence => `${sentence}，細細本 ledger 都認同。`, sentence => `${sentence}，紙仔路線出現喇。`, sentence => `${sentence}，證據櫃今日戴咗呔。`]; const styledEn = enVariants[enLevel](en); const styledZh = zhVariants[zhLevel](zh); return mode === 'zh' ? styledZh : mode === 'both' ? `${styledEn} · ${styledZh}` : styledEn; } catch { return en; }
  }
  function eventSearchProjection(event) {
    return `${event.action} ${eventSentence(event)} ${JSON.stringify(event.params || {}).slice(0, 500)}`.slice(0, 900);
  }
  function localizeStructuredControls() {
    const localize = (idValue, kind) => { const select = document.querySelector(`#${idValue}`); if (!select) return; [...select.options].forEach(option => { if (ENUM_LABELS[kind]?.[option.value]) option.textContent = localizedEnumLabel(kind, option.value); }); };
    localize('history-event-field', 'field'); localize('history-event-status', 'status'); localize('forge-source', 'source'); localize('forge-destination', 'destination'); localize('forge-account', 'account'); localize('forge-route', 'route');
    const actions = document.querySelector('#history-action'); if (actions) [...actions.options].forEach(option => { if (ACTION_LABELS[option.value]) option.textContent = localizedEnumLabel('action', option.value); });
  }
  function redactDetails(value, depth = 0) {
    if (depth > 3 || value === null || value === undefined) return undefined;
    if (typeof value === 'string') return scrubSummary(value).slice(0, 240);
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.slice(0, 20).map(item => redactDetails(item, depth + 1)).filter(item => item !== undefined);
    if (typeof value !== 'object') return undefined;
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      if (!REDACTED_DETAIL_KEYS.has(key)) continue;
      if (['content', 'privateVocabulary', 'credentials'].includes(key) && child !== 'omitted') continue;
      const safe = redactDetails(child, depth + 1);
      if (safe !== undefined) result[key] = safe;
    }
    return result;
  }

  state = readState();

  function record(action, params = {}) {
    if (!EVENT_ACTIONS.has(action)) { const reason = `Refused event action "${text(action).slice(0, 80)}": it is not a registered event type.`; document.querySelector('#history-status')?.replaceChildren(document.createTextNode(reason)); return { ok: false, reason }; }
    const normalizedParams = normalizeEventParams(action, params);
    if (!normalizedParams) { const reason = `Refused ${action} event parameters: values did not match the registered structured event contract. Nothing was stored.`; const status = document.querySelector('#history-status'); if (status) status.textContent = reason; return { ok: false, reason }; }
    const event = {
      id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      action,
      params: normalizedParams,
    };
    state.history = [...state.history, event].slice(-MAX_HISTORY);
    persist();
    renderHistory();
    return state.history.some(item => item.id === event.id) ? { ok: true, event } : { ok: false, reason: 'The event was not appended, so success was not reported.' };
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

  function validDateRange(query) {
    const validDate = value => { if (!value) return true; if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const [year, month, day] = value.split('-').map(Number); const date = new Date(Date.UTC(year, month - 1, day)); return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day; };
    const valid = validDate(query.from) && validDate(query.to);
    return valid && (!query.from || !query.to || query.from <= query.to);
  }

  function validReleaseManifest(manifest) {
    if (!manifest || manifest.schemaVersion !== 1 || !['unavailable', 'available', 'downloading', 'ready', 'failed'].includes(manifest.state) || !['stable', 'beta', 'nightly'].includes(manifest.channel) || !Array.isArray(manifest.assets)) return false;
    if (manifest.state === 'unavailable') return manifest.assets.length === 0 && typeof manifest.reason === 'string' && manifest.reason.length > 0;
    const identity = /^[0-9a-f]{40}$/.test(manifest.commit || '') && typeof manifest.version === 'string' && typeof manifest.tag === 'string';
    if (manifest.state === 'failed') return identity && typeof manifest.reason === 'string' && manifest.reason.length > 0 && manifest.assets.every(asset => asset && typeof asset.name === 'string' && (!asset.url || /^https:\/\//.test(asset.url)) && (!asset.sha256 || /^[0-9a-f]{64}$/.test(asset.sha256)) && (asset.bytes === undefined || (Number.isInteger(asset.bytes) && asset.bytes > 0)));
    return manifest.assets.length > 0 && identity && manifest.assets.every(asset => asset && typeof asset.name === 'string' && /^https:\/\//.test(asset.url || '') && /^[0-9a-f]{64}$/.test(asset.sha256 || '') && Number.isInteger(asset.bytes) && asset.bytes > 0);
  }

  function filterHistory() {
    if (!validDateRange(historyQuery)) return [];
    return state.history.filter(event => withinDate(event.timestamp, historyQuery.from, historyQuery.to)
      && (historyQuery.action === 'all' || event.action === historyQuery.action)
      && matchesQuery(eventSearchProjection(event), historyQuery));
  }

  function filterChangelog() {
    if (!validDateRange(changelogQuery)) return [];
    const records = includeUpstreamHistory ? [...PRODUCT_CHANGELOG, ...UPSTREAM_HISTORY] : PRODUCT_CHANGELOG;
    return records.filter(entry => withinDate(entry.date, changelogQuery.from, changelogQuery.to)
      && matchesQuery(`${entry.version} ${entry.category} ${entry.summary} ${entry.commit}`, changelogQuery));
  }

  function formatDate(value) {
    try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return String(value || 'Unknown time'); }
  }

  function applyDatePreset(query, preset) {
    const today = new Date();
    const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    query.to = preset === 'all' ? '' : iso(today);
    if (preset === 'all') query.from = '';
    else if (preset === '7d' || preset === '30d') { const from = new Date(today); from.setDate(from.getDate() - Number(preset.slice(0, -1)) + 1); query.from = iso(from); }
    else if (preset === 'year') query.from = `${today.getFullYear()}-01-01`;
  }

  function bindDatePreset(idValue, query, render) {
    const select = document.querySelector(`#${idValue}`);
    if (!select) return;
    select.addEventListener('change', () => {
      applyDatePreset(query, select.value);
      const fromId = idValue.replace('-preset', '-from');
      const toId = idValue.replace('-preset', '-to');
      const from = document.querySelector(`#${fromId}`); const to = document.querySelector(`#${toId}`);
      if (from) from.value = query.from; if (to) to.value = query.to;
      render();
    });
  }

  function bindDateRange(query, fromId, toId, render) {
    const from = document.querySelector(`#${fromId}`); const to = document.querySelector(`#${toId}`);
    const validate = () => {
      query.from = from?.value || ''; query.to = to?.value || '';
      const valid = validDateRange(query);
      [from, to].forEach(input => { if (!input) return; input.setCustomValidity(valid ? '' : 'Use valid ISO dates with From on or before To.'); input.setAttribute('aria-invalid', valid ? 'false' : 'true'); });
      render();
    };
    from?.addEventListener('input', validate); to?.addEventListener('input', validate); validate();
  }

  function ensureDatePreset(idValue, afterId) {
    if (document.querySelector(`#${idValue}`)) return;
    const after = document.querySelector(`#${afterId}`);
    if (!after) return;
    const wrap = document.createElement('div');
    wrap.className = 'delivery-select-control';
    wrap.innerHTML = `<label for="${idValue}">Date preset</label><select id="${idValue}"><option value="all">All dates</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="year">This year</option></select>`;
    const anchor = after.closest('label') || after;
    anchor.parentElement.insertBefore(wrap, anchor.nextSibling);
  }

  function ensureDropdownSearch(select) {
    if (!select || select.dataset.deliverySearchReady === 'true') return;
    select.dataset.deliverySearchReady = 'true';
    const wrapper = document.createElement('div');
    wrapper.className = 'delivery-select-control';
    const label = document.createElement('label');
    label.textContent = select.getAttribute('aria-label') || select.id.replaceAll('-', ' ');
    const search = document.createElement('input');
    search.type = 'search'; search.id = `${select.id}-search`; search.dataset.label = `${select.id} options`; search.placeholder = 'Find option';
    const composite = document.createElement('div'); composite.className = 'search-composite';
    const regex = document.createElement('button'); regex.type = 'button'; regex.className = 'regex-trigger'; regex.textContent = '.*'; regex.setAttribute('aria-label', `Build a regular expression for ${select.id} options`); regex.dataset.deliveryRegexFor = search.id;
    composite.append(search, regex); wrapper.append(label, composite, select);
    const parentLabel = select.closest('label');
    if (parentLabel && parentLabel.contains(select)) parentLabel.replaceWith(wrapper); else select.replaceWith(wrapper);
    const query = { text: '', pattern: '', flags: 'iu', regex: false };
    const refresh = () => { query.text = search.value.slice(0, 160); query.pattern = search.dataset.regexPattern || ''; query.flags = search.dataset.regexFlags || 'iu'; query.regex = Boolean(query.pattern); [...select.options].forEach(option => { option.hidden = !matchesQuery(option.textContent, query); }); };
    search.addEventListener('input', refresh);
    regex.addEventListener('click', () => openRegex(search));
    select._deliveryRefresh = refresh;
  }

  function ensureDropdownSearches() {
    const owned = [...document.querySelectorAll('#history-delivery-page select'), ...document.querySelectorAll('#forge-form select')];
    owned.forEach(ensureDropdownSearch);
    owned.forEach(select => select._deliveryRefresh?.());
  }

  function ensureRetentionControls() {
    if (document.querySelector('#history-retention')) return;
    const list = document.querySelector('#history-list');
    if (!list) return;
    const panel = document.createElement('div'); panel.id = 'history-retention'; panel.className = 'delivery-retention';
    panel.innerHTML = '<label for="history-retention-value">Retention<select id="history-retention-value"><option value="all">Keep all events</option><option value="100">Keep newest 100</option><option value="50">Keep newest 50</option><option value="20">Keep newest 20</option></select></label><button id="history-prune-preview" type="button" class="text-button">Preview prune</button><button id="history-prune-apply" type="button" class="danger-button" disabled>Apply prune</button><span id="history-prune-status" role="status"></span>';
    list.before(panel);
    const select = panel.querySelector('#history-retention-value'); const status = panel.querySelector('#history-prune-status'); const apply = panel.querySelector('#history-prune-apply');
    const preview = () => { const keep = select.value === 'all' ? state.history.length : Number(select.value); const remove = select.value === 'all' ? 0 : Math.max(0, state.history.length - Math.max(0, keep - 1)); status.textContent = remove ? `Preview: ${remove} older event${remove === 1 ? '' : 's'} will be removed, reserving one slot for the prune event.` : 'Preview: nothing will be removed.'; apply.disabled = remove === 0; };
    panel.querySelector('#history-prune-preview').addEventListener('click', preview);
    apply.addEventListener('click', () => { const keep = Number(select.value); const retain = Math.max(0, keep - 1); const remove = Math.max(0, state.history.length - retain); if (!remove) return; state.history = state.history.slice(-retain); persist(); const result = record('pruned', { count: remove, retention: keep }); if (!result?.ok) { status.textContent = result?.reason || 'The prune event was not appended, so success was not reported.'; return; } status.textContent = `Pruned ${remove} older event${remove === 1 ? '' : 's'} and recorded the action. The prune event occupies the reserved slot.`; apply.disabled = true; });
  }

  function ensureHistoryImportControls() {
    if (document.querySelector('#history-import-file')) return;
    const list = document.querySelector('#history-list'); if (!list) return;
    const panel = document.createElement('div'); panel.id = 'history-import'; panel.className = 'delivery-retention'; panel.innerHTML = '<label>Import schema-2 JSON<input id="history-import-file" type="file" accept="application/json,.json"></label><button id="history-import-button" class="secondary-button" type="button">Append imported events</button><span id="history-import-status" role="status"></span><details id="history-import-audit"><summary>Separate no-op import audit</summary><p>Duplicate-only, refused-only, and zero-retained imports preserve all live events and are recorded here instead of consuming a history slot.</p><ul id="history-import-audit-list"></ul></details>';
    list.before(panel);
    renderHistoryImportAudit();
    panel.querySelector('#history-import-button').addEventListener('click', async () => {
      const input = panel.querySelector('#history-import-file'); const status = panel.querySelector('#history-import-status'); const file = input.files?.[0];
      if (!file) { status.textContent = 'Choose one local JSON export before importing.'; return; }
      try {
        if (!Number.isSafeInteger(file.size) || file.size > MAX_IMPORT_BYTES) throw new Error('the JSON file exceeds the 512 KiB byte limit');
        const rawBytes = await file.slice(0, MAX_IMPORT_BYTES).arrayBuffer();
        if (rawBytes.byteLength !== file.size) throw new Error('the selected file could not be read completely within the byte limit');
        const raw = new TextDecoder('utf-8', { fatal: true }).decode(rawBytes);
        const parsed = validateImportPayload(raw, rawBytes.byteLength);
        const existing = new Set(state.history.map(event => event.id)); const duplicates = parsed.valid.filter(event => existing.has(event.id)).length; const candidates = parsed.valid.filter(event => !existing.has(event.id));
        const refused = parsed.refused + duplicates;
        if (!candidates.length) {
          const auditParams = { imported: 0, refused, existingTruncated: 0, importTruncated: 0 };
          const reason = duplicates ? 'duplicate-only' : parsed.events.length ? 'refused-only' : 'empty-import';
          const auditStored = appendHistoryImportAudit(auditParams, reason, parsed.schemaVersion, parsed.eventSchemaVersion);
          status.textContent = `No events appended (${reason}). Refused ${refused}; all live events were preserved. ${auditStored ? 'The no-op audit was stored separately.' : 'The separate no-op audit could not be stored.'}`;
          return;
        }
        const merged = [...state.history, ...candidates]; const kept = merged.slice(-(MAX_HISTORY - 1)); const keptIds = new Set(kept.map(event => event.id)); const imported = candidates.filter(event => keptIds.has(event.id)).length; const importTruncated = candidates.length - imported; const existingTruncated = state.history.filter(event => !keptIds.has(event.id)).length;
        if (!imported) {
          const auditParams = { imported: 0, refused, existingTruncated: 0, importTruncated: candidates.length };
          const auditStored = appendHistoryImportAudit(auditParams, 'zero-retained', parsed.schemaVersion, parsed.eventSchemaVersion);
          status.textContent = `No events appended (zero-retained). Refused ${refused}, import truncated ${candidates.length}; all live events were preserved. ${auditStored ? 'The no-op audit was stored separately.' : 'The separate no-op audit could not be stored.'}`;
          return;
        }
        const historyImportParams = { imported, refused, existingTruncated, importTruncated };
        const previous = state.history; state.history = kept; persist(); const result = record('history-import', historyImportParams);
        if (!result?.ok) { state.history = previous; persist(); status.textContent = result?.reason || 'The import event was not appended, so success was not reported. Live state was restored.'; return; }
        status.textContent = `Import appended ${imported} events. Refused ${refused}, existing events truncated ${existingTruncated}, import events truncated ${importTruncated}.`; input.value = '';
      } catch (error) { status.textContent = `Import refused: ${error.message || 'invalid JSON export'}. Live state was unchanged.`; }
    });
  }

  function downloadFile(name, body, type) {
    state.editor.lastPreparedExport = scrubSummary(name);
    state.editor.lastHandoffState = 'handoff-started';
    persist();
    setDeliveryState('handoff-started', `Browser handoff started for ${name}`);
    const link = document.createElement('a');
    let url = '';
    try { const blob = new Blob([body], { type }); url = URL.createObjectURL(blob); link.href = url; link.download = name; link.click(); state.editor.lastHandoffState = 'handoff-unverified'; state.editor.lastExport = scrubSummary(name); setDeliveryState('handoff-unverified', `Browser handoff accepted for ${name}; completion is not observable here.`); }
    catch (error) { state.editor.lastHandoffState = 'handoff-failed'; setDeliveryState('handoff-failed', `Browser handoff failed: ${error.message || 'unknown error'}`); }
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    persist();
    renderEditorStatus();
  }

  function copyText(value, status) {
    const done = () => { if (status) status.textContent = 'Copied locally. Nothing was sent anywhere.'; };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).then(done).catch(() => { if (status) status.textContent = 'Clipboard access was refused. Use the visible text instead.'; });
    else if (status) status.textContent = 'Clipboard access is unavailable in this browser. Use the visible text instead.';
  }

  function historyExportRows() {
    return filterHistory().map(event => ({ id: event.id, timestamp: event.timestamp, action: event.action, text: eventSentence(event), params: event.params }));
  }

  function duplicateJsonKey(raw) {
    let index = 0;
    const whitespace = () => { while (/\s/.test(raw[index] || '')) index += 1; };
    const string = () => { const start = index; index += 1; while (index < raw.length) { if (raw[index] === '\\') index += 2; else if (raw[index++] === '"') return JSON.parse(raw.slice(start, index)); } throw new Error('unterminated string'); };
    const value = depth => { if (depth > 8) throw new Error('nesting exceeds 8 levels'); whitespace(); const token = raw[index]; if (token === '{') return object(depth + 1); if (token === '[') return array(depth + 1); if (token === '"') { string(); return; } const match = raw.slice(index).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/); if (!match) throw new Error('invalid value'); index += match[0].length; };
    const array = depth => { index += 1; whitespace(); if (raw[index] === ']') { index += 1; return; } while (index < raw.length) { value(depth); whitespace(); if (raw[index] === ']') { index += 1; return; } if (raw[index++] !== ',') throw new Error('expected array comma'); } throw new Error('unterminated array'); };
    const object = depth => { index += 1; const keys = new Set(); whitespace(); if (raw[index] === '}') { index += 1; return; } while (index < raw.length) { whitespace(); if (raw[index] !== '"') throw new Error('object key must be a string'); const key = string(); if (keys.has(key)) throw new Error(`duplicate key: ${key}`); keys.add(key); if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error(`unsafe key: ${key}`); whitespace(); if (raw[index++] !== ':') throw new Error('expected object colon'); value(depth); whitespace(); if (raw[index] === '}') { index += 1; return; } if (raw[index++] !== ',') throw new Error('expected object comma'); } throw new Error('unterminated object'); };
    value(0); whitespace(); if (index !== raw.length) throw new Error('trailing JSON data');
  }
  function validateImportPayload(raw, byteLength = new TextEncoder().encode(raw).byteLength) {
    if (!Number.isSafeInteger(byteLength) || byteLength > MAX_IMPORT_BYTES) throw new Error('the JSON file exceeds the 512 KiB byte limit');
    duplicateJsonKey(raw);
    const parsed = JSON.parse(raw);
    const topKeys = new Set(['schemaVersion', 'eventSchemaVersion', 'exportedAt', 'privateVocabulary', 'credentials', 'events']);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || Object.keys(parsed).some(key => !topKeys.has(key))) throw new Error('unknown top-level field');
    if (parsed.schemaVersion !== HISTORY_EXPORT_SCHEMA_VERSION || parsed.eventSchemaVersion !== STATE_SCHEMA_VERSION) throw new Error(`expected export schema ${HISTORY_EXPORT_SCHEMA_VERSION} and event schema ${STATE_SCHEMA_VERSION}`);
    if (parsed.privateVocabulary !== 'omitted' || parsed.credentials !== 'omitted') throw new Error('private vocabulary and credentials must be marked omitted');
    if (parsed.exportedAt !== undefined && (typeof parsed.exportedAt !== 'string' || !Number.isFinite(Date.parse(parsed.exportedAt)))) throw new Error('exportedAt must be a valid timestamp');
    if (!Array.isArray(parsed.events) || parsed.events.length > MAX_HISTORY) throw new Error(`events must be an array of at most ${MAX_HISTORY} records`);
    const seen = new Set(); const valid = []; let refused = 0;
    for (const event of parsed.events) {
      if (!event || typeof event !== 'object' || Array.isArray(event) || Object.keys(event).some(key => !['id', 'timestamp', 'action', 'params'].includes(key))) { refused += 1; continue; }
      if (!isCanonicalId(event.id) || typeof event.timestamp !== 'string' || typeof event.action !== 'string' || seen.has(event.id) || !isFiniteTimestamp(event.timestamp)) { refused += 1; continue; }
      seen.add(event.id);
      const params = normalizeEventParams(event.action, event.params); if (!params) { refused += 1; continue; }
      valid.push({ id: event.id, timestamp: event.timestamp.slice(0, 40), action: event.action, params });
    }
    return { valid, refused };
  }

  function exportHistory(format = 'json') {
    const rows = historyExportRows();
    if (format === 'markdown') {
      const query = historyQuery.regex ? `regex ${scrubSummary(historyQuery.pattern).slice(0, 160)}` : `plain text ${scrubSummary(historyQuery.text).slice(0, 160)}`;
      const body = `# Local history export\n\nExport schema version: ${HISTORY_EXPORT_SCHEMA_VERSION}. Private vocabulary, credentials, source paths, and file contents were omitted. This Markdown file is presentation-only. Structured parameters are intentionally omitted here; use the JSON export for round-trip import.\n\nActive search: ${query || 'none'}\nActive date range: ${historyQuery.from || 'none'} to ${historyQuery.to || 'none'}\nActive action filter: ${historyQuery.action || 'all'}\nRows exported: ${rows.length}\n\n| Timestamp | Action | Text |\n| --- | --- | --- |\n${rows.map(row => `| ${row.timestamp} | ${row.action} | ${String(row.text || '').replaceAll('|', '\\|')} |`).join('\n')}\n`;
      downloadFile('ding-pbx-site-history.md', body, 'text/markdown');
      return;
    }
    const jsonRows = rows.map(({ id: eventId, timestamp, action, params }) => ({ id: eventId, timestamp, action, params }));
    downloadFile('ding-pbx-site-history.json', JSON.stringify({ schemaVersion: HISTORY_EXPORT_SCHEMA_VERSION, eventSchemaVersion: STATE_SCHEMA_VERSION, exportedAt: new Date().toISOString(), privateVocabulary: 'omitted', credentials: 'omitted', events: jsonRows }, null, 2), 'application/json');
  }

  function renderHistory() {
    const host = document.querySelector('#history-list');
    if (!host) return;
    const rows = filterHistory();
    const actions = [...new Set(state.history.map(event => event.action))].sort();
    const actionSelect = document.querySelector('#history-action');
    if (actionSelect) {
      const current = historyQuery.action;
      actionSelect.innerHTML = `<option value="all">${escapeHtml(localizedEnumLabel('action', 'all'))} (${state.history.length})</option>${actions.map(action => `<option value="${escapeHtml(action)}">${escapeHtml(localizedEnumLabel('action', action))} (${state.history.filter(event => event.action === action).length})</option>`).join('')}`;
      actionSelect.value = current;
      actionSelect._deliveryRefresh?.();
      [...actionSelect.options].forEach(option => { if (ACTION_LABELS[option.value]) option.textContent = localizedEnumLabel('action', option.value); });
    }
    host.innerHTML = rows.length ? rows.map(event => `<article class="delivery-history-row" data-event-id="${escapeHtml(event.id)}" data-delivery-context="history-row"><div><span class="card-kicker">${escapeHtml(localizedEnumLabel('action', event.action))}</span><h3>${escapeHtml(eventSentence(event))}</h3><p>${escapeHtml(formatDate(event.timestamp))}</p></div><div class="delivery-row-actions"><button type="button" class="text-button" data-restore-event="${escapeHtml(event.id)}">Restore as new event</button><details><summary>Structured parameters</summary><pre>${escapeHtml(JSON.stringify(event.params, null, 2))}</pre></details></div></article>`).join('') : '<p class="empty-state">No local events match this filter. Changes made on this page will appear here.</p>';
    host.querySelectorAll('[data-restore-event]').forEach(button => button.addEventListener('click', () => {
      const source = state.history.find(event => event.id === button.dataset.restoreEvent);
      if (!source) return;
      record('restored', { sourceAction: source.action, sourceEvent: source.id });
      const status = document.querySelector('#history-status');
      if (status) status.textContent = 'Restore recorded as a new event. The earlier event remains unchanged.';
    }));
    bindContextTargets(host);
    const status = document.querySelector('#history-count');
    if (status) status.textContent = validDateRange(historyQuery) ? `${rows.length} of ${state.history.length} local events shown` : 'Invalid date range. Use ISO dates and ensure From is not after To.';
    const migration = document.querySelector('#history-status');
    if (migration && state.migration?.status === 'future-version-refused') migration.textContent = `Saved state version ${state.migration.sourceVersion} is newer than this page understands, so it was refused and no saved events were applied.`;
    else if (migration && ['migrated-with-loss', 'normalized-with-loss'].includes(state.migration?.status)) { const counts = state.migration.counts || { imported: 0, omitted: 0, refused: 0, retentionOmitted: 0 }; migration.textContent = `Saved state version ${state.migration.sourceVersion} was migrated with recorded loss. Imported ${counts.imported}, omitted ${counts.omitted}, refused ${counts.refused}, retention omitted ${counts.retentionOmitted}. This is not a lossless migration.`; if (!document.querySelector('#migration-focus')) { const focus = document.createElement('button'); focus.id = 'migration-focus'; focus.type = 'button'; focus.className = 'text-button'; focus.textContent = 'Review migration audit'; focus.addEventListener('click', () => { const audit = document.querySelector('#migration-audit'); if (audit) { audit.open = true; audit.scrollIntoView({ block: 'nearest' }); } }); migration.after(focus); } }
    else if (migration && state.migration?.status === 'migrated') migration.textContent = `Saved state version ${state.migration.sourceVersion} was migrated to version ${STATE_SCHEMA_VERSION} with no omitted or refused records.`;
  }

  function renderChangelog() {
    const host = document.querySelector('#changelog-list');
    if (!host) return;
    const rows = filterChangelog();
    host.innerHTML = rows.length ? rows.map(entry => `<article class="delivery-changelog-row"><div><span class="card-kicker">${escapeHtml(entry.category)} · ${escapeHtml(entry.date)}</span><h3>${escapeHtml(entry.version)}</h3><p>${escapeHtml(entry.summary)}</p></div><a class="text-button" href="${PUBLIC_REPOSITORY_URL}/commit/${entry.commit}" target="_blank" rel="noopener" aria-label="Open commit ${entry.commit}">${escapeHtml(entry.commit.slice(0, 12))}</a></article>`).join('') : '<p class="empty-state">No recorded changes match this filter.</p>';
    const status = document.querySelector('#changelog-count');
    if (status) status.textContent = validDateRange(changelogQuery) ? `${rows.length} recorded change${rows.length === 1 ? '' : 's'} shown` : 'Invalid date range. Use ISO dates and ensure From is not after To.';
  }

  function renderEditorStatus() {
    const status = document.querySelector('#editor-status');
    if (status) status.textContent = state.editor.lastPreparedExport ? `Prepared export: ${state.editor.lastPreparedExport}. Last handoff state: ${state.editor.lastHandoffState}. Last unverified export: ${state.editor.lastExport || 'none'}. A browser path is unavailable, so external-editor opening remains unavailable.` : 'No export prepared in this browser yet. External-editor opening remains unavailable until a browser exposes a verified local path.';
    const open = document.querySelector('#open-vscode');
    if (open) { open.disabled = true; open.title = 'Unavailable because browsers do not expose a verified local path to this page.'; }
  }

  function renderTransfer() {
    const status = document.querySelector('#transfer-status');
    const progress = document.querySelector('#transfer-progress');
    const cancel = document.querySelector('#transfer-cancel');
    const complete = document.querySelector('#transfer-complete');
    const start = document.querySelector('#transfer-start');
    if (!status) return;
    const transfer = state.transfer;
    if (start) start.disabled = transfer.status === 'started' || !document.querySelector('#transfer-file')?.files?.length;
    if (transfer.status === 'started') {
      status.textContent = `Writing ${transfer.name} to ${transferDestinationName || 'the user-selected local destination'}. The destination identity is transient and is not persisted. Bytes written are reported from the real file stream.`;
      progress.value = transfer.totalBytes ? Math.round(((transfer.bytesWritten || 0) / transfer.totalBytes) * 100) : 0;
      cancel.hidden = false;
      if (complete) complete.hidden = true;
    } else if (transfer.status === 'complete') {
      status.textContent = `The local file write completed for ${transfer.name} at ${formatDate(transfer.completedAt)}.`;
      progress.value = 100;
      cancel.hidden = true;
      if (complete) complete.hidden = true;
    } else if (transfer.status === 'cancelled') {
      status.textContent = 'The local file write was cancelled before completion. No completion claim was made.';
      progress.value = 0;
      cancel.hidden = true;
      if (complete) complete.hidden = true;
    } else if (transfer.status === 'unavailable') {
      status.textContent = 'Unavailable: this browser did not provide a verified local output handle, so no transfer was started.';
      progress.value = 0;
      cancel.hidden = true;
      if (complete) complete.hidden = true;
    } else if (transfer.status === 'interrupted') {
      status.textContent = `An earlier local write for ${transfer.name || 'the selected file'} was interrupted before completion. No destination identity was persisted, no resume is attempted, and a fresh source selection is required.`;
      progress.value = 0;
      cancel.hidden = true;
      if (complete) complete.hidden = true;
    } else {
      status.textContent = 'No local file write is active. Choose a file and a browser-supported output destination to open the real Start decision surface.';
      progress.value = 0;
      cancel.hidden = true;
      if (complete) complete.hidden = true;
    }
  }

  function renderUpdate() {
    const status = document.querySelector('#update-status');
    if (status) {
      const manifestValid = validReleaseManifest(RELEASE_MANIFEST);
      const manifestState = manifestValid ? RELEASE_MANIFEST.state : 'unavailable';
      const detail = !RELEASE_MANIFEST ? 'No verified release manifest is bundled with this page.' : manifestValid ? `Manifest state: ${manifestState}.` : `The bundled release manifest is unavailable because its schema or integrity fields did not validate.`;
      status.textContent = state.update.checkedAt ? `Checked locally at ${formatDate(state.update.checkedAt)}. ${detail} A static page does not install updates.` : `State: ${manifestState}. ${detail}`;
    }
  }

  function renderForge() {
    const form = document.querySelector('#forge-form');
    if (!form) return;
    document.querySelector('#forge-account').value = state.forge.account;
    document.querySelector('#forge-owner').value = state.forge.owner;
    document.querySelector('#forge-repository').value = state.forge.repository;
    document.querySelector('#forge-route').value = state.forge.route;
    if (document.querySelector('#forge-source')) document.querySelector('#forge-source').value = state.forge.source || 'current-site';
    if (document.querySelector('#forge-destination')) document.querySelector('#forge-destination').value = state.forge.destination || 'new-repository';
  }

  function markdownEscape(value) { return String(value || '').slice(0, 20000).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }
  function markdownInline(value) {
    return value.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\.\.?\/[^\s)]+)\)/g, '<a href="$2" rel="noopener" target="_blank">$1</a>');
  }
  function parseProviderMarkdown(value) {
    const lines = markdownEscape(value).replaceAll('\r\n', '\n').split('\n');
    const blocks = []; let paragraph = []; let list = false;
    const flushParagraph = () => { if (paragraph.length) { blocks.push(`<p>${markdownInline(paragraph.join('<br>'))}</p>`); paragraph = []; } };
    const closeList = () => { if (list) { blocks.push('</ul>'); list = false; } };
    for (const line of lines) {
      if (!line.trim()) { flushParagraph(); closeList(); continue; }
      if (/^###\s/.test(line)) { flushParagraph(); closeList(); blocks.push(`<h4>${markdownInline(line.slice(4))}</h4>`); continue; }
      if (/^##\s/.test(line)) { flushParagraph(); closeList(); blocks.push(`<h3>${markdownInline(line.slice(3))}</h3>`); continue; }
      if (/^#\s/.test(line)) { flushParagraph(); closeList(); blocks.push(`<h2>${markdownInline(line.slice(2))}</h2>`); continue; }
      if (/^-\s/.test(line)) { flushParagraph(); if (!list) { blocks.push('<ul>'); list = true; } blocks.push(`<li>${markdownInline(line.slice(2))}</li>`); continue; }
      closeList(); paragraph.push(line);
    }
    flushParagraph(); closeList(); return blocks.join('');
  }

  function openRegex(target) {
    if (window.DingSiteFullRegexBuilder?.open && target?.id) { window.DingSiteFullRegexBuilder.open(target); return; }
    if (window.DingSiteRegex?.open && target?.id) { window.DingSiteRegex.open(target); return; }
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
    ensureStructuredEventControls();
    ensureDropdownSearches();
    const action = document.querySelector('#history-action');
    bindDateRange(historyQuery, 'history-from', 'history-to', renderHistory);
    action?.addEventListener('change', () => { historyQuery.action = action.value; renderHistory(); });
    bindDatePreset('history-preset', historyQuery, renderHistory);
    attachFilter('history-search', historyQuery, renderHistory);
    document.querySelector('#history-export-json')?.addEventListener('click', () => exportHistory('json'));
    document.querySelector('#history-export-markdown')?.addEventListener('click', () => exportHistory('markdown'));
    document.querySelector('#history-copy')?.addEventListener('click', () => copyText(JSON.stringify(historyExportRows(), null, 2), document.querySelector('#history-status')));
    document.querySelector('#history-record')?.addEventListener('click', () => {
      const field = document.querySelector('#history-event-field'); const eventStatus = document.querySelector('#history-event-status');
      const result = record('updated', { field: field?.value, status: eventStatus?.value });
      if (!result?.ok) { field?.focus(); return; }
      field.value = 'settings'; eventStatus.value = 'changed';
      document.querySelector('#history-status').textContent = 'The append-only event was recorded locally.';
    });
    renderHistory();
  }

  function ensureStructuredEventControls() {
    const input = document.querySelector('#history-event-summary');
    if (!input || document.querySelector('#history-event-field')) return;
    const label = input.closest('label'); if (!label) return;
    const wrapper = document.createElement('div'); wrapper.className = 'delivery-form-row'; wrapper.innerHTML = '<label>Event type<select id="history-event-field"><option value="settings">Settings</option><option value="history">History</option><option value="appearance">Appearance</option><option value="delivery">Delivery</option></select></label><label>Change<select id="history-event-status"><option value="changed">Changed</option><option value="reset">Reset</option><option value="imported">Imported</option></select></label>';
    label.replaceWith(wrapper);
    localizeStructuredControls();
  }

  function bindChangelog() {
    const changelogPanel = document.querySelector('#changelog');
    if (changelogPanel && !document.querySelector('#changelog-upstream')) {
      const toggle = document.createElement('label'); toggle.className = 'delivery-checkbox'; toggle.innerHTML = '<input id="changelog-upstream" type="checkbox"> Include optional upstream tag history';
      changelogPanel.querySelector('.delivery-filter-row')?.append(toggle);
      toggle.querySelector('input').addEventListener('change', event => { includeUpstreamHistory = event.target.checked; renderChangelog(); });
    }
    bindDateRange(changelogQuery, 'changelog-from', 'changelog-to', renderChangelog);
    bindDatePreset('changelog-preset', changelogQuery, renderChangelog);
    attachFilter('changelog-search', changelogQuery, renderChangelog);
    document.querySelector('#changelog-export')?.addEventListener('click', () => downloadFile('ding-pbx-changelog.md', `# Changelog export\n\n${filterChangelog().map(entry => `- ${entry.version} · ${entry.date} · ${entry.summary} ([${entry.commit.slice(0, 12)}](${PUBLIC_REPOSITORY_URL}/commit/${entry.commit}))`).join('\n')}\n`, 'text/markdown'));
    document.querySelector('#changelog-copy')?.addEventListener('click', () => copyText(filterChangelog().map(entry => `${entry.version} ${entry.date} ${entry.summary} ${entry.commit}`).join('\n'), document.querySelector('#changelog-status')));
    renderChangelog();
  }

  function bindEditor() {
    document.querySelector('#editor-file')?.addEventListener('change', event => {
      const file = event.target.files?.[0];
      const status = document.querySelector('#editor-status');
      if (!file) return;
      status.textContent = `Selected ${file.name}. The browser can read this file for local actions, but it does not expose a verified local path for an external editor.`;
    });
    document.querySelector('#editor-download')?.addEventListener('click', () => window.open('https://code.visualstudio.com/download', '_blank', 'noopener'));
    renderEditorStatus();
  }

  function bindTransfer() {
    document.querySelector('#transfer-complete')?.remove();
    document.querySelector('#transfer-file')?.addEventListener('change', event => {
      const file = event.target.files?.[0];
      const start = document.querySelector('#transfer-start');
      if (start) start.disabled = state.transfer.status === 'started' || !file;
      if (file) document.querySelector('#transfer-name').textContent = file.name;
    });
    document.querySelector('#transfer-start')?.addEventListener('click', async () => {
      if (state.transfer.status === 'started') { document.querySelector('#transfer-status').textContent = 'A local write is already active. Start is disabled until the writable stream settles.'; return; }
      const file = document.querySelector('#transfer-file').files?.[0];
      const status = document.querySelector('#transfer-status');
      if (!file) return;
      transferDestinationName = '';
      setDeliveryState('preparing', `Preparing a local write for ${file.name}`);
      if (typeof window.showSaveFilePicker !== 'function') { transferDestinationName = ''; state.transfer.handoffState = 'handoff-failed'; setDeliveryState('handoff-failed', 'API unavailable: the browser does not expose a verified local output handle.'); status.textContent = 'Unavailable: this browser does not expose a verified local output handle, so no transfer was started.'; state.transfer = { ...state.transfer, status: 'unavailable', name: scrubSummary(file.name), totalBytes: 0, bytesWritten: 0 }; persist(); renderTransfer(); return; }
      let handle;
      try { handle = await window.showSaveFilePicker({ suggestedName: file.name, types: [{ description: 'Selected file', accept: { [file.type || 'application/octet-stream']: [`.${file.name.split('.').pop() || 'bin'}`] } }] }); transferDestinationName = scrubSummary(handle.name || 'selected destination'); transferWriter = await handle.createWritable(); state.transfer.handoffState = 'handoff-started'; setDeliveryState('handoff-started', 'Writable destination accepted; measured output is beginning.'); }
      catch (error) { transferDestinationName = ''; const pickerReason = error?.name === 'AbortError' ? 'picker-cancelled' : error?.name === 'NotAllowedError' ? 'destination-failed' : 'writable-failed'; state.transfer.handoffState = pickerReason === 'picker-cancelled' ? 'handoff-cancelled' : 'handoff-failed'; setDeliveryState(pickerReason === 'picker-cancelled' ? 'handoff-cancelled' : 'handoff-failed', pickerReason); persist(); status.textContent = `The local destination step ended with ${pickerReason}. Nothing was written.`; state.transfer = { ...state.transfer, status: 'idle', name: scrubSummary(file.name), totalBytes: 0, bytesWritten: 0 }; renderTransfer(); return; }
      transferAbort = new AbortController();
      state.transfer = { ...state.transfer, status: 'started', name: scrubSummary(file.name), startedAt: new Date().toISOString(), totalBytes: file.size, bytesWritten: 0, interruptionRecorded: false };
      persist(); renderTransfer();
      record('download-started', { bytes: file.size, status: 'writing' });
      try {
        const chunkSize = 1024 * 1024;
        for (let offset = 0; offset < file.size; offset += chunkSize) {
          if (transferAbort.signal.aborted) throw new DOMException('Transfer cancelled', 'AbortError');
          const chunk = await file.slice(offset, Math.min(file.size, offset + chunkSize)).arrayBuffer();
          await transferWriter.write(chunk);
          state.transfer.bytesWritten = Math.min(file.size, offset + chunk.byteLength); persist();
          const progress = document.querySelector('#transfer-progress'); if (progress) progress.value = file.size ? Math.round((state.transfer.bytesWritten / file.size) * 100) : 100;
        }
        await transferWriter.close(); transferWriter = null;
        setDeliveryState('prepared', 'Measured writable stream closed successfully.'); transferDestinationName = ''; state.transfer.handoffState = 'prepared'; state.transfer.status = 'complete'; state.transfer.completedAt = new Date().toISOString(); persist(); renderTransfer();
        record('download-complete', { bytes: file.size, status: 'stream-closed' });
      } catch (error) {
        try { await transferWriter?.abort(); } catch { /* abort is best effort after a failed write */ }
        transferWriter = null; transferDestinationName = ''; state.transfer.status = 'cancelled'; persist(); renderTransfer();
        setDeliveryState(error.name === 'AbortError' ? 'handoff-cancelled' : 'handoff-failed', error.name === 'AbortError' ? 'voluntary-cancelled' : 'writable-failed'); state.transfer.handoffState = error.name === 'AbortError' ? 'handoff-cancelled' : 'handoff-failed'; persist();
        record('download-cancelled', { bytes: state.transfer.bytesWritten, status: 'cancelled' });
        status.textContent = error.name === 'AbortError' ? 'Cancelled before the local stream closed.' : `The local write failed: ${error.message || 'unknown error'}. No completion claim was made.`;
      } finally { transferAbort = null; }
    });
    document.querySelector('#transfer-cancel')?.addEventListener('click', () => { if (transferAbort) transferAbort.abort(); });
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
      if (operation.cancelled) { setDeliveryState('handoff-cancelled', 'Preparation cancelled before browser handoff.'); state.editor.lastHandoffState = 'handoff-cancelled'; persist(); } else setDeliveryState('prepared', 'Local export preparation completed before browser handoff.');
      status.textContent = operation.cancelled ? 'Preparation cancelled before an export was written.' : 'Preparation complete. The redacted export is handed to the browser next, and browser download completion is unverified here.';
      if (!operation.cancelled) exportHistory('json');
    };
    start.addEventListener('click', () => {
      if (operation.running) return;
      const payload = new TextEncoder().encode(JSON.stringify(historyExportRows()));
      operation = { running: true, cancelled: false, index: 0, total: Math.max(payload.byteLength, 1), payload, timer: 0 };
      setDeliveryState('preparing', 'Encoding the redacted export before browser handoff.');
      start.disabled = true; cancel.hidden = false; progress.value = 0; status.textContent = 'Preparing a redacted local export. Re-entry is blocked until this run settles.';
      const tick = () => {
        if (!operation.running) return;
        if (operation.cancelled || operation.index >= operation.total) { progress.value = operation.cancelled ? 0 : 100; finish(); return; }
        const end = Math.min(operation.total, operation.index + 64 * 1024); const chunk = operation.payload.slice(operation.index, end); operation.index += chunk.byteLength || 1; progress.value = Math.min(100, Math.round((operation.index / operation.total) * 100)); operation.timer = setTimeout(tick, 40);
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
      record('recovery-opened', { action });
    }));
  }

  function bindForge() {
    const form = document.querySelector('#forge-form');
    if (!form) return;
    const fields = document.createElement('div'); fields.className = 'delivery-form'; fields.innerHTML = '<label>Source<select id="forge-source"><option value="current-site">Current published site</option><option value="local-export">A downloaded local export</option><option value="selected-file">A selected local file</option></select></label><label>Destination<select id="forge-destination"><option value="new-repository">New repository</option><option value="existing-repository">Existing repository</option></select></label>';
    form.prepend(fields);
    ensureDropdownSearches();
    localizeStructuredControls();
    const preview = document.createElement('div'); preview.id = 'forge-preview'; preview.className = 'delivery-preview'; preview.setAttribute('role', 'status');
    const previewButton = document.createElement('button'); previewButton.id = 'forge-preview-button'; previewButton.type = 'button'; previewButton.className = 'secondary-button'; previewButton.textContent = 'Preview provider handoff';
    document.querySelector('#forge-open').before(previewButton); document.querySelector('#forge-open').disabled = true; document.querySelector('#forge-open').before(preview);
    ['forge-account', 'forge-owner', 'forge-repository', 'forge-route', 'forge-source', 'forge-destination'].forEach(idValue => document.querySelector(`#${idValue}`)?.addEventListener('input', () => {
      state.forge = { account: document.querySelector('#forge-account').value, owner: scrubSummary(document.querySelector('#forge-owner').value), repository: scrubSummary(document.querySelector('#forge-repository').value), route: document.querySelector('#forge-route').value, source: document.querySelector('#forge-source').value, destination: document.querySelector('#forge-destination').value };
      document.querySelector('#forge-open').disabled = true;
      persist();
    }));
    previewButton.addEventListener('click', () => {
      const owner = state.forge.owner.trim(), repository = state.forge.repository.trim();
      const status = document.querySelector('#forge-status');
      if (!owner || !repository) { status.textContent = 'Enter the destination owner and repository name before previewing the provider handoff.'; document.querySelector('#forge-owner').focus(); return; }
      const result = record('forge-preview', { source: state.forge.source, destination: state.forge.destination, account: state.forge.account, route: state.forge.route, status: 'preview-ready' });
      if (!result?.ok) { document.querySelector('#forge-open').disabled = true; status.textContent = result?.reason || 'The preview event was not appended, so success was not reported.'; return; }
      preview.textContent = `Preview: source ${state.forge.source}; destination ${state.forge.destination}; account ${state.forge.account}; owner ${owner}; repository ${repository}; route ${state.forge.route}. Credentials stay in the provider flow.`;
      document.querySelector('#forge-open').disabled = false;
    });
    document.querySelector('#forge-open')?.addEventListener('click', () => {
      const owner = state.forge.owner.trim(), repository = state.forge.repository.trim();
      const status = document.querySelector('#forge-status');
      if (document.querySelector('#forge-open').disabled) { status.textContent = 'Preview the provider handoff before opening it.'; return; }
      if (!owner || !repository) { status.textContent = 'Enter the destination owner and repository name. No credentials are requested or stored here.'; document.querySelector('#forge-owner').focus(); return; }
      if (state.forge.route === 'fork' && state.forge.source !== 'current-site') { status.textContent = 'The provider fork route requires a real source repository. Select the current published site or use copy and publish.'; return; }
      const url = state.forge.route === 'fork' ? `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/fork` : `https://github.com/new?name=${encodeURIComponent(repository)}&owner=${encodeURIComponent(owner)}`;
      window.open(url, '_blank', 'noopener');
      status.textContent = `A generic provider preview page was opened for source ${state.forge.source}, destination ${state.forge.destination}, account ${state.forge.account}, and owner ${owner}. No source or destination operation occurred here. This page did not authenticate, publish, fork, or store credentials.`;
      record('forge-handoff', { source: state.forge.source, destination: state.forge.destination, account: state.forge.account, route: state.forge.route, status: 'preview-opened' });
    });
    renderForge();
    localizeStructuredControls();
  }

  function bindUpdate() {
    document.querySelector('#update-check')?.addEventListener('click', () => {
      const valid = validReleaseManifest(RELEASE_MANIFEST);
      state.update = { status: valid ? RELEASE_MANIFEST.state : 'unavailable', checkedAt: new Date().toISOString() };
      persist(); renderUpdate();
      record('update-check', { status: valid ? RELEASE_MANIFEST.state : 'unavailable' });
    });
    document.querySelector('#update-reload')?.addEventListener('click', () => { record('update-reload', { status: 'requested' }); location.reload(); });
    renderUpdate();
  }

  function closeContextMenu() { document.querySelector('#delivery-context-menu')?.remove(); const origin = contextOrigin; contextOrigin = null; origin?.focus?.(); }
  function openPaletteRoute() {
    if (window.DingSitePalette?.open) { window.DingSitePalette.open(); return; }
    const dialog = document.querySelector('#command-palette');
    if (dialog?.showModal) { dialog.showModal(); document.querySelector('#palette-search')?.focus(); return; }
    document.querySelector('#palette-open')?.click();
  }
  function showContextMenu(event) {
    closeContextMenu();
    contextOrigin = event.target.closest('[data-delivery-context]') || event.target;
    const targetKind = contextOrigin.dataset?.deliveryContext || 'panel';
    const menu = document.createElement('div'); menu.id = 'delivery-context-menu'; menu.className = 'delivery-context-menu'; menu.setAttribute('role', 'menu');
    const panelActions = contextOrigin.id === 'history' ? '<button type="button" role="menuitem" data-context-action="record">Record local event <kbd>Ctrl+Enter</kbd></button>' : contextOrigin.id === 'operations' ? '<button type="button" role="menuitem" data-context-action="start-operation">Prepare redacted export</button>' : '';
    const targetActions = targetKind === 'history-row' ? '<button type="button" role="menuitem" data-context-action="restore">Restore this event as new</button><button type="button" role="menuitem" data-context-action="copy-row">Copy this event summary</button>' : `${panelActions}<button type="button" role="menuitem" data-context-action="focus-panel">Focus this panel</button><button type="button" role="menuitem" data-context-action="copy-panel">Copy this panel summary</button>`;
    menu.innerHTML = `<label>Filter actions<div class="search-composite"><input id="delivery-context-search" data-label="context actions" type="search" aria-label="Filter context actions"><button type="button" class="regex-trigger" id="delivery-context-regex" aria-label="Build a regular expression for context actions">.*</button></div></label><div class="delivery-context-items">${targetActions}<button type="button" role="menuitem" data-context-action="palette">Open command palette <kbd>Ctrl+Shift+F</kbd></button><button type="button" role="menuitem" data-context-action="escape">Close this menu <kbd>Escape</kbd></button></div>`;
    document.body.append(menu); menu.style.left = `${Math.min(event.clientX, innerWidth - 320)}px`; menu.style.top = `${Math.min(event.clientY, innerHeight - 190)}px`;
    const filter = menu.querySelector('input'); filter.focus();
    const contextQuery = { text: '', pattern: '', flags: 'iu', regex: false };
    filter.addEventListener('input', () => { contextQuery.text = filter.value.slice(0, 160); contextQuery.pattern = filter.dataset.regexPattern || ''; contextQuery.flags = filter.dataset.regexFlags || 'iu'; contextQuery.regex = Boolean(contextQuery.pattern); menu.querySelectorAll('[data-context-action]').forEach(item => { item.hidden = !matchesQuery(item.textContent, contextQuery); }); });
    menu.querySelector('#delivery-context-regex').addEventListener('click', () => openRegex(filter));
    menu.addEventListener('keydown', keyEvent => { if (keyEvent.key === 'ArrowDown' || keyEvent.key === 'ArrowUp') { keyEvent.preventDefault(); const items = [...menu.querySelectorAll('[data-context-action]:not([hidden])')]; const index = items.indexOf(document.activeElement); items[(index + (keyEvent.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus(); } if (keyEvent.key === 'Escape') { keyEvent.preventDefault(); closeContextMenu(); } });
    menu.querySelectorAll('[data-context-action]').forEach(button => button.addEventListener('click', () => { const rowEvent = contextOrigin.closest?.('[data-event-id]'); if (button.dataset.contextAction === 'palette') openPaletteRoute(); if (button.dataset.contextAction === 'record') document.querySelector('#history-event-field')?.focus(); if (button.dataset.contextAction === 'focus-panel') contextOrigin.scrollIntoView({ block: 'start' }); if (button.dataset.contextAction === 'start-operation') document.querySelector('#operation-start')?.click(); if (button.dataset.contextAction === 'restore') rowEvent?.querySelector('[data-restore-event]')?.click(); if (button.dataset.contextAction === 'copy-row') copyText(rowEvent?.querySelector('h3')?.textContent || '', document.querySelector('#history-status')); if (button.dataset.contextAction === 'copy-panel') copyText(contextOrigin.textContent.slice(0, 2000), document.querySelector('#history-status')); closeContextMenu(); }));
    document.addEventListener('click', closeContextMenu, { once: true });
    event.preventDefault();
  }

  function bindContextTargets(root = document) {
    root.querySelectorAll?.('[data-delivery-context]').forEach(target => {
      if (target.dataset.deliveryContextBound === 'true') return;
      target.dataset.deliveryContextBound = 'true';
      target.addEventListener('contextmenu', showContextMenu);
    });
  }

  function ensureNavigation() {
    document.querySelectorAll('.site-nav').forEach(nav => {
      if (!nav.querySelector('a[href$="history.html"]')) { const link = document.createElement('a'); link.href = siteAsset('history.html'); link.textContent = 'Delivery'; nav.append(link); }
    });
  }

  function ensurePaletteOpener() {
    if (document.querySelector('#palette-open')) return;
    const rail = document.querySelector('#delivery-rail');
    if (!rail) return;
    const button = document.createElement('button'); button.id = 'palette-open'; button.type = 'button'; button.className = 'text-button'; button.textContent = 'Open command palette'; button.title = 'Ctrl+Shift+F'; button.addEventListener('click', openPaletteRoute);
    rail.querySelector('.delivery-rail-actions')?.append(button);
  }

  function currentTabId() {
    const page = document.body?.dataset.page;
    return TAB_ROUTES.find(([idValue, , path]) => page === idValue || location.pathname.endsWith(`/${path}`) || location.pathname.endsWith(path))?.[0] || 'history';
  }

  function renderTabs() {
    const host = document.querySelector('#delivery-tabs');
    if (!host) return;
    const current = currentTabId();
    const known = new Set(state.tabs.map(tab => tab.id));
    TAB_ROUTES.forEach(([idValue]) => { if (!known.has(idValue)) state.tabs.push({ id: idValue, pinned: false }); });
    const ordered = [...state.tabs].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    host.innerHTML = `<span class="delivery-tabs-note">Shared route navigation. Route switching and pinning persist locally; grouping and reordering are unavailable on this static host.</span>${ordered.map(tab => { const route = TAB_ROUTES.find(item => item[0] === tab.id); if (!route) return ''; return `<span class="delivery-tab"><a href="${siteAsset(route[2])}" aria-current="${tab.id === current ? 'page' : 'false'}">${escapeHtml(route[1])}</a><button type="button" data-tab-pin="${escapeHtml(tab.id)}" aria-label="${tab.pinned ? 'Unpin' : 'Pin'} ${escapeHtml(route[1])} route">${tab.pinned ? '★' : '☆'}</button></span>`; }).join('')}`;
    host.querySelectorAll('[data-tab-pin]').forEach(button => button.addEventListener('click', () => { const tab = state.tabs.find(item => item.id === button.dataset.tabPin); if (!tab) return; tab.pinned = !tab.pinned; persist(); renderTabs(); record('tab-pin', { tab: button.dataset.tabPin, pinned: tab.pinned }); }));
    persist();
  }

  function ensureTabs() {
    if (document.querySelector('#delivery-tabs')) { renderTabs(); return; }
    const host = document.createElement('nav'); host.id = 'delivery-tabs'; host.className = 'delivery-tabs'; host.setAttribute('aria-label', 'Shared delivery navigation');
    document.querySelector('#delivery-rail')?.after(host);
    renderTabs();
  }

  function ensureRail() {
    if (document.querySelector('#delivery-rail')) return;
    const main = document.querySelector('#history-delivery-mount') || document.querySelector('main');
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
    const host = document.querySelector('#history-delivery-page') || document.querySelector('#history-delivery-mount');
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
    const deliveryState = document.createElement('p'); deliveryState.id = 'delivery-state'; deliveryState.className = 'filter-status'; deliveryState.setAttribute('role', 'status'); deliveryState.textContent = `Delivery state: ${state.delivery.status}. ${state.delivery.reason || 'No additional detail.'}`; host.querySelector('.page-intro')?.after(deliveryState);
    const editorLead = host.querySelector('#editor .section-heading p'); if (editorLead) editorLead.textContent = 'Select a local file or download an export. A normal browser does not expose a verified local path for external-editor opening, so this route remains explicitly unavailable.';
    const transferLead = host.querySelector('#downloads .section-heading p'); if (transferLead) transferLead.textContent = 'When File System Access is available, this page writes a selected local file to a user-chosen destination in measured chunks. Unsupported browsers remain unavailable.';
    host.querySelector('#transfer-complete')?.remove();
    ensureDatePreset('history-preset', 'history-to'); ensureDatePreset('changelog-preset', 'changelog-to'); ensureRetentionControls(); ensureHistoryImportControls(); ensureMigrationAuditPanel(); ensureDropdownSearches();
    bindHistory(); bindChangelog(); bindEditor(); bindTransfer(); bindOperation(); bindRecovery(); bindForge(); bindUpdate();
    document.querySelector('#provider-render')?.addEventListener('click', () => { const value = document.querySelector('#provider-markdown').value.slice(0, 20000); document.querySelector('#provider-preview').innerHTML = parseProviderMarkdown(value) || '<p>No provider-authored text is loaded.</p>'; record('provider-preview', { status: 'rendered' }); });
    document.querySelector('#provider-clear')?.addEventListener('click', () => { document.querySelector('#provider-markdown').value = ''; document.querySelector('#provider-preview').innerHTML = '<p>No provider-authored text is loaded.</p>'; });
  }

  function init() {
    if (document.documentElement.dataset.historyDeliveryReady === 'true') return;
    document.documentElement.dataset.historyDeliveryReady = 'true';
    ensureNavigation(); ensureRail(); ensureRegexDialog(); ensureDropdownSearches();
    bindContextTargets();
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeContextMenu(); if (event.ctrlKey && event.shiftKey && event.key.toLocaleLowerCase() === 'f') { event.preventDefault(); openPaletteRoute(); } if (event.ctrlKey && event.key === 'Enter' && ['history-event-field', 'history-event-status'].includes(document.activeElement?.id)) { event.preventDefault(); document.querySelector('#history-record')?.click(); } });
    renderPage();
    ensureRail();
    if (['migrated', 'migrated-with-loss', 'normalized-with-loss'].includes(state.migration?.status) && !state.migration.recorded) { const counts = state.migration.counts || { imported: 0, omitted: 0, refused: 0, retentionOmitted: 0 }; const result = record('state-migration', { fromVersion: state.migration.sourceVersion, toVersion: STATE_SCHEMA_VERSION, status: state.migration.status, imported: counts.imported, omitted: counts.omitted, refused: counts.refused, retentionOmitted: counts.retentionOmitted }); if (result?.ok) { state.migration.recorded = true; persist(); } else { appendMigrationAudit('state-migration-event-refused', state.migration.sourceVersion, counts, result?.reason || 'state-migration event was not appended'); renderMigrationAudit(); } }
    if (state.migration?.status === 'future-version-refused') { appendMigrationAudit('future-version-refused', state.migration.sourceVersion, undefined, 'future-version-refused'); renderMigrationAudit(); }
    if (['migrated-with-loss', 'normalized-with-loss'].includes(state.migration?.status)) { appendMigrationAudit(state.migration.status, state.migration.sourceVersion, state.migration.counts, 'unmappable-or-retention-loss'); renderMigrationAudit(); }
    ensurePaletteOpener();
    if (state.transfer.status === 'interrupted' && !state.transfer.interruptionRecorded) { state.transfer.interruptionRecorded = true; persist(); record('download-interrupted', { status: 'interrupted' }); }
    document.querySelectorAll('#history-delivery-page .delivery-panel, #history-delivery-mount .delivery-panel').forEach(panel => { panel.dataset.deliveryContext = 'panel'; });
    bindContextTargets();
    ensureTabs();
    if (document.querySelector('#delivery-rail')) bindRecovery();
  }

  if (window.__dingSiteReady || document.readyState !== 'loading') init();
  else document.addEventListener('site:ready', init, { once: true });
  window.DingSiteHistoryDelivery = { init, record, renderMarkdown: parseProviderMarkdown };
})();
