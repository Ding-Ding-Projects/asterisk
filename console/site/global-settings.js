(() => {
  'use strict';

  /*
   * Page-local equivalents for settings that belong to every published page.
   * This module has no network imports and uses one bounded localStorage record
   * per visitor. It deliberately does not share the desktop application's
   * identity, credential store, or update feed.
   */
  const CANONICAL_STATE_KEY = 'ding-pbx-site-global-settings-v1';
  const MIRROR_STATE_KEY = 'ding-pbx-pages-v2';
  const STORAGE_KEY = CANONICAL_STATE_KEY;
  const OWNED_STATE_KEYS = [CANONICAL_STATE_KEY, 'ding-pbx-dimsum-image-cache-v2', 'ding-pbx-vocabulary-cache', 'ding-pbx-logo-cache'];
  const SETTINGS_SCHEMA_VERSION = 2;
  const MAX_RULES = 32;
  const MAX_STATE_BYTES = 131072;
  const MAX_ENDPOINT_BYTES = 65536;
  const MAX_ENDPOINT_DEPTH = 4;
  const MAX_ENDPOINT_FIELDS = 24;
  const APPROVED_EXTERNAL_HOSTS = new Set(['api.github.com', 'localhost', '127.0.0.1']);
  const APPROVED_HOME_ASSISTANT_HOSTS = new Set(['homeassistant.local', 'localhost', '127.0.0.1']);
  const NARRATION_COOLDOWN_MS = 2500;
  const NARRATION_DEBOUNCE_MS = 250;
  const SCHOOL_SUPPRESSION_INVENTORY = [
    '#language-mode', '#english-funny', '#cantonese-funny', '#vocabulary-file', '#vocabulary-clear',
    '#vocabulary-status', '#settings-search', '#documentation-filters-panel', '#settings-filters-panel',
    '#feature-search', '#notification-search', '#palette-search', '.global-dimsum-toast',
    '#global-tab-voice', '#global-tab-visitor'
  ];
  const DISPLAY_NAME_CONSUMER_INVENTORY = ['document.title', '.brand strong', '[data-display-name]', 'body[data-display-name]'];
  const DIM_SUM_CACHE = { file: 'dim-sum-cache.json', schemaVersion: 2, sourceUrl: 'https://raw.githubusercontent.com/Ding-Ding-Projects/dim-sum-photos/main/catalog/index.json', releaseNamespace: 'catalog-v1' };
  const PAGE_COPY_INVENTORY = ['global-settings-title', 'global-settings-lede', 'global-settings-search', 'global-settings-search-status', 'global-language-title', 'global-language-help', 'global-english-funny-title', 'global-english-funny-help', 'global-cantonese-funny-title', 'global-cantonese-funny-help', 'global-emoji-title', 'global-emoji-help', 'global-school-label', 'global-school-note', 'global-narrator-title', 'global-narrator-help', 'global-narrator-voice-status', 'global-schedule-title', 'global-schedule-help', 'global-schedule-status', 'global-schedule-rules', 'global-display-title', 'global-dimsum-title', 'global-dimsum-help', 'global-dimsum-status', 'global-update-title', 'global-update-help', 'global-update-status', 'global-tab-language-button', 'global-tab-voice-button', 'global-tab-visitor-button', 'global-regex-mode', 'global-regex-pattern', 'global-regex-feedback', 'global-confirm-title', 'global-confirm-description', 'global-confirm-code', 'global-confirm-slider', 'global-confirm-apply', 'global-confirm-cancel', 'global-school-toggle', 'global-school-name', 'global-school-code', 'global-school-name-save', 'global-school-code-save', 'global-school-reset', 'global-narrator-enabled', 'global-narrator-language', 'global-narrator-english-voice', 'global-narrator-cantonese-voice', 'global-narrator-rate', 'global-narrator-pitch', 'global-narrator-test', 'global-schedule-enabled', 'global-schedule-all-day', 'global-schedule-target', 'global-schedule-value', 'global-schedule-start-date', 'global-schedule-end-date', 'global-schedule-start-time', 'global-schedule-end-time', 'global-schedule-every-day', 'global-schedule-precedence', 'global-schedule-timezone', 'global-schedule-source', 'global-schedule-endpoint', 'global-schedule-entity'];
  const STATIC_COPY_INVENTORY = [
    ['#global-settings-open', 'Settings', '設定', 'text'], ['#palette-open', 'Search', '搜尋', 'text'], ['#global-settings-close', 'Close settings', '關閉設定', 'aria-label'], ['#global-settings-search', 'Search page settings', '搜尋頁面設定', 'placeholder'], ['#palette-search', 'Search page settings and destinations', '搜尋頁面設定同目的地', 'aria-label'], ['#global-regex-open', 'Build a regular expression for page settings', '為頁面設定建立正則表達式', 'aria-label'], ['#global-palette-title', 'Command palette', '命令 palette', 'text'],
    ['#global-narrator-test', 'Speak a local test', '播放本地測試', 'text'], ['#global-schedule-save', 'Save schedule rule', '保存排程規則', 'text'], ['#global-schedule-check', 'Check source explicitly', '明確檢查來源', 'text'], ['#global-settings-reset', 'Reset this page\'s visitor settings', '重設此頁訪客設定', 'text'],
    ['#global-school-name-save', 'Save name', '保存名稱', 'text'], ['#global-school-code-save', 'Set code', '設定解鎖碼', 'text'], ['#global-confirm-apply', 'Confirm', '確認', 'text'], ['#global-confirm-cancel', 'Emergency exit', '緊急退出', 'text'], ['#global-regex-apply', 'Apply to this search', '套用到此搜尋', 'text'], ['#global-regex-cancel', 'Cancel', '取消', 'text'],
    ['#global-regex-pattern', 'Pattern', '模式', 'placeholder'], ['#global-regex-mode', 'Search mode', '搜尋模式', 'aria-label'], ['#global-confirm-code', 'Unlock code, when requested', '需要時輸入解鎖碼', 'aria-label'], ['#global-confirm-slider', 'Slide fully to confirm', '滑到最盡確認', 'aria-label'],
    ['#global-language option[value="en"]', 'English', '英文', 'text'], ['#global-language option[value="zh"]', 'Playful Hong Kong-style Cantonese', '玩味香港廣東話', 'text'], ['#global-language option[value="both"]', 'Bilingual', '雙語', 'text'], ['#global-narrator-language option[value="en"]', 'English', '英文', 'text'], ['#global-narrator-language option[value="zh"]', 'Cantonese', '廣東話', 'text'], ['#global-narrator-language option[value="both"]', 'Both, serialized', '兩種語言，依次播放', 'text'],
    ['#global-schedule-source option[value="local"]', 'Local page state', '本地頁面狀態', 'text'], ['#global-schedule-source option[value="https"]', 'Validated HTTPS API', '已驗證 HTTPS API', 'text'], ['#global-schedule-source option[value="home-assistant"]', 'Home Assistant boolean', 'Home Assistant 布林值', 'text'],
    ['#global-regex-mode option[value="plain"]', 'Plain text', '純文字', 'text'], ['#global-regex-mode option[value="regex"]', 'Regular expression', '正則表達式', 'text'], ['#global-regex-i + span', 'Ignore case', '忽略大小寫', 'text'], ['#global-regex-u + span', 'Unicode', 'Unicode', 'text'], ['#global-confirm-key-one + span', 'I understand the exact local effect', '我明白確實本地效果', 'text'], ['#global-confirm-key-two + span', 'I understand the recovery route', '我明白恢復方法', 'text'], ['#global-schedule-timezone-picker', 'Choose IANA timezone', '選擇 IANA 時區', 'aria-label']
  ];
  const PANEL_LITERAL_COPY = {
    'Spoken language': ['Spoken language', '旁白語言'], 'English voice': ['English voice', '英文聲音'], 'Cantonese voice': ['Cantonese voice', '廣東話聲音'], Rate: ['Rate', '速度'], Pitch: ['Pitch', '音調'], Target: ['Target', '目標'], Value: ['Value', '數值'], 'Start date': ['Start date', '開始日期'], 'End date': ['End date', '結束日期'], 'Start time': ['Start time', '開始時間'], 'End time': ['End time', '結束時間'], 'Every day in the date window': ['Every day in the date window', '日期範圍內每日'], Weekdays: ['Weekdays', '星期'], Precedence: ['Precedence', '優先次序'], Timezone: ['Timezone', '時區'], Source: ['Source', '來源'], Endpoint: ['Endpoint', '端點'], 'Home Assistant entity': ['Home Assistant entity', 'Home Assistant 實體'], 'Show emojis in dialogs and message boxes': ['Show emojis in dialogs and message boxes', '喺對話框同訊息框顯示表情'], 'Use this local page mode': ['Use this local page mode', '使用此本地模式'], 'Unlock code': ['Unlock code', '解鎖碼'], 'Display name': ['Display name', '顯示名稱'], 'Mode name': ['Mode name', '模式名稱']
  };
  const WEEKDAY_COPY = { mo: ['Monday', '星期一'], tu: ['Tuesday', '星期二'], we: ['Wednesday', '星期三'], th: ['Thursday', '星期四'], fr: ['Friday', '星期五'], sa: ['Saturday', '星期六'], su: ['Sunday', '星期日'] };
  const IANA_TIMEZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC', 'America/Toronto', 'America/New_York', 'Europe/London', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Australia/Sydney'];
  const IDENTITY_BOUNDARY = { shippedName: 'Ding PBX Console', packageId: 'ding-pbx-console', dataDirectory: 'ding-pbx-console', installerId: 'ding-pbx-console', updateFeed: 'verified-release-manifest' };
  const SCHEDULE_TARGETS = [
    ['language', 'Language mode'], ['theme', 'Theme'], ['density', 'Density'],
    ['narratorEnabled', 'Narrator enabled'], ['displayName', 'Display name']
  ];
  const DEFAULTS = {
    theme: 'dark',
    density: 'comfortable',
    language: 'en',
    englishFunny: 5,
    cantoneseFunny: 5,
    dialogEmoji: true,
    schoolMode: false,
    schoolName: 'School mode',
    schoolCredentialDigest: '',
    narratorEnabled: false,
    narratorLanguage: 'en',
    narratorEnglishVoice: '',
    narratorCantoneseVoice: '',
    narratorRate: 1,
    narratorPitch: 1,
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    schedule: { schemaVersion: 1, rules: [], lastAppliedRule: '', lastAppliedSignature: '', paused: false },
    displayName: 'Ding PBX Console',
    visited: false,
    dimSumShown: 0,
    dimSumCacheReason: 'not-loaded',
    notifications: [],
    quietHours: false,
    reducedSound: false,
    screenReaderActive: false
  };
  let DISHES = [];
  let dimSumReady = Promise.resolve(false);
  let dimSumDrawnThisLaunch = false;
  const DIM_SUM_IMAGE_CACHE_KEY = 'ding-pbx-dimsum-image-cache-v2';
  const WEEKDAYS = [['mo', 'Monday'], ['tu', 'Tuesday'], ['we', 'Wednesday'], ['th', 'Thursday'], ['fr', 'Friday'], ['sa', 'Saturday'], ['su', 'Sunday']];
  let compatibilityMalformed = false;
  const $ = (id) => document.getElementById(id);
  const all = (selector) => [...document.querySelectorAll(selector)];
  const copy = (en, zh, tone, mode = state.language) => {
    const funny = tone === 'zh' ? state.cantoneseFunny : state.englishFunny;
    const variants = tone === 'zh' ? [
      (value) => value,
      (value) => `講清楚啲：${value}`,
      (value) => `放心，${value}`,
      (value) => `溫馨提示，${value}`,
      (value) => `穩陣先：${value}，輕鬆搞掂。`
    ] : [
      (value) => value,
      (value) => `Plainly: ${value}`,
      (value) => `Friendly note: ${value}`,
      (value) => `Heads up: ${value}`,
      (value) => `Steady on: ${value}. Easy enough to keep moving.`
    ];
    const render = variants[Math.min(5, Math.max(1, Number(funny) || 1)) - 1];
    const styled = render(tone === 'zh' ? zh : en);
    if (mode === 'zh') return styled;
    if (mode === 'both') return `${render(en)} / ${render(zh)}`;
    return styled;
  };
  function setLocalizedText(node, en, zh, tone = 'en') {
    if (!node) return;
    node.replaceChildren();
    if (state.language === 'both') {
      const english = document.createElement('span'); english.className = 'copy-segment copy-segment-en'; english.lang = 'en'; english.textContent = copy(en, zh, tone, 'en');
      const cantonese = document.createElement('span'); cantonese.className = 'copy-segment copy-segment-zh'; cantonese.lang = 'yue-HK'; cantonese.textContent = copy(en, zh, 'zh', 'zh');
      node.append(english, document.createTextNode(' / '), cantonese);
    } else node.textContent = copy(en, zh, tone, state.language);
  }
  function localizedInline(en, zh, tone = 'en') { if (state.language === 'zh') return copy(en, zh, 'zh', 'zh'); if (state.language === 'both') return `${copy(en, zh, 'en', 'en')} / ${copy(en, zh, 'zh', 'zh')}`; return copy(en, zh, tone, state.language); }
  function applyLiteralCopy(root) { if (!root) return; const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode); nodes.forEach((node) => { const key = node.nodeValue.trim(); const pair = PANEL_LITERAL_COPY[key]; if (!pair) return; const leading = node.nodeValue.match(/^\s*/)[0]; const trailing = node.nodeValue.match(/\s*$/)[0]; node.nodeValue = `${leading}${localizedInline(pair[0], pair[1])}${trailing}`; }); }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || '{}';
      if (new TextEncoder().encode(raw).byteLength > MAX_STATE_BYTES) throw new Error('settings record exceeds the bounded size');
      const saved = parseUniqueJson(raw);
      if (saved.schemaVersion !== undefined && ![1, SETTINGS_SCHEMA_VERSION].includes(saved.schemaVersion)) throw new Error('Unsupported settings schema version.');
      if (!saved.schemaVersion) {
        try { const legacy = parseUniqueJson(localStorage.getItem(MIRROR_STATE_KEY) || '{}'); if (['en', 'zh', 'both'].includes(legacy.language)) saved.language = legacy.language; if (['light', 'dark', 'contrast'].includes(legacy.theme)) saved.theme = legacy.theme; if (['compact', 'comfortable', 'spacious'].includes(legacy.density)) saved.density = legacy.density; if (Number.isFinite(legacy.englishFunny)) saved.englishFunny = Number(legacy.englishFunny) >= 1 && Number(legacy.englishFunny) <= 5 ? Number(legacy.englishFunny) : Math.min(5, Math.max(1, Math.round(Number(legacy.englishFunny) * 4 / 3 + 1))); if (Number.isFinite(legacy.cantoneseFunny)) saved.cantoneseFunny = Number(legacy.cantoneseFunny) >= 1 && Number(legacy.cantoneseFunny) <= 5 ? Number(legacy.cantoneseFunny) : Math.min(5, Math.max(1, Math.round(Number(legacy.cantoneseFunny) * 4 / 3 + 1))); } catch { compatibilityMalformed = true; }
      }
      const oldSchedule = saved.schedule || {};
      const rules = Array.isArray(oldSchedule.rules) ? oldSchedule.rules : (oldSchedule.enabled ? [{
        id: `migrated-${Date.now()}`, target: 'language', value: saved.language || 'en', startDate: '', endDate: '', startTime: oldSchedule.start || '', endTime: oldSchedule.end || '', weekdays: oldSchedule.weekdays || [], everyDay: false, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, precedence: 0, source: oldSchedule.source || 'local', endpoint: oldSchedule.endpoint || '', entity: ''
      }] : []);
      saved.schemaVersion = SETTINGS_SCHEMA_VERSION;
      saved.schedule = { schemaVersion: 1, rules: rules.slice(0, MAX_RULES), lastAppliedRule: oldSchedule.lastAppliedRule || '', lastAppliedSignature: oldSchedule.lastAppliedSignature || '', paused: oldSchedule.paused === true };
      return saved;
    } catch {
      return { ...DEFAULTS, schedule: { ...DEFAULTS.schedule } };
    }
  }
  function sanitizeState(raw) {
    const safe = { ...DEFAULTS };
    ['language', 'schoolName', 'schoolCredentialDigest', 'narratorLanguage', 'narratorEnglishVoice', 'narratorCantoneseVoice', 'displayName'].forEach((key) => { if (typeof raw[key] === 'string') safe[key] = raw[key].slice(0, key === 'schoolName' ? 48 : 256); });
    if (!['en', 'zh', 'both'].includes(safe.language)) safe.language = 'en';
    if (!['light', 'dark', 'contrast'].includes(raw.theme)) safe.theme = document.documentElement.dataset.theme || 'dark'; else safe.theme = raw.theme;
    if (!['compact', 'comfortable', 'spacious'].includes(raw.density)) safe.density = document.documentElement.dataset.density || 'comfortable'; else safe.density = raw.density;
    ['dialogEmoji', 'schoolMode', 'narratorEnabled', 'visited', 'quietHours', 'reducedSound', 'screenReaderActive'].forEach((key) => { if (typeof raw[key] === 'boolean') safe[key] = raw[key]; });
    ['englishFunny', 'cantoneseFunny'].forEach((key) => { safe[key] = Math.min(5, Math.max(1, Number(raw[key]) || 5)); });
    safe.narratorRate = Math.min(2, Math.max(0.5, Number(raw.narratorRate) || 1));
    safe.narratorPitch = Math.min(2, Math.max(0, Number(raw.narratorPitch) || 1));
    safe.dimSumShown = Math.min(100000, Math.max(0, Number(raw.dimSumShown) || 0));
    safe.dimSumCacheReason = typeof raw.dimSumCacheReason === 'string' ? raw.dimSumCacheReason.slice(0, 120) : 'not-loaded';
    safe.notifications = Array.isArray(raw.notifications) ? raw.notifications.slice(-100).filter((item) => item && typeof item.id === 'string' && item.source && typeof item.source.enTitle === 'string' && typeof item.source.zhTitle === 'string' && typeof item.source.enBody === 'string' && typeof item.source.zhBody === 'string').map((item) => ({ id: item.id.slice(0, 128), time: Number(item.time) || Date.now(), legacyPresentation: item.legacyPresentation === true, source: { enTitle: item.source.enTitle.slice(0, 256), zhTitle: item.source.zhTitle.slice(0, 256), enBody: item.source.enBody.slice(0, 1024), zhBody: item.source.zhBody.slice(0, 1024) } })) : [];
    const schedule = raw.schedule || {};
    safe.schedule = { schemaVersion: 1, lastAppliedRule: typeof schedule.lastAppliedRule === 'string' ? schedule.lastAppliedRule.slice(0, 128) : '', lastAppliedSignature: typeof schedule.lastAppliedSignature === 'string' ? schedule.lastAppliedSignature.slice(0, 256) : '', effectiveTuple: schedule.effectiveTuple && typeof schedule.effectiveTuple === 'object' ? { language: ['en', 'zh', 'both'].includes(schedule.effectiveTuple.language) ? schedule.effectiveTuple.language : 'en', theme: ['light', 'dark', 'contrast'].includes(schedule.effectiveTuple.theme) ? schedule.effectiveTuple.theme : 'dark', density: ['compact', 'comfortable', 'spacious'].includes(schedule.effectiveTuple.density) ? schedule.effectiveTuple.density : 'comfortable', narratorEnabled: schedule.effectiveTuple.narratorEnabled === true, displayName: String(schedule.effectiveTuple.displayName || 'Ding PBX Console').slice(0, 80), sourceValidity: String(schedule.effectiveTuple.sourceValidity || 'validated').slice(0, 64) } : undefined, paused: schedule.paused === true, invalidTimezones: [], rules: Array.isArray(schedule.rules) ? schedule.rules.slice(0, MAX_RULES).map((rule) => ({ id: String(rule?.id || '').slice(0, 128), target: String(rule?.target || '').slice(0, 64), value: String(rule?.value || '').slice(0, 120), startDate: String(rule?.startDate || '').slice(0, 10), endDate: String(rule?.endDate || '').slice(0, 10), startTime: String(rule?.startTime || '').slice(0, 5), endTime: String(rule?.endTime || '').slice(0, 5), allDay: rule?.allDay === true, weekdays: Array.isArray(rule?.weekdays) ? rule.weekdays.filter((day) => WEEKDAYS.some(([id]) => id === day)).slice(0, 7) : [], everyDay: rule?.everyDay === true, timezone: String(rule?.timezone || '').slice(0, 80), precedence: Math.min(100, Math.max(0, Number(rule?.precedence) || 0)), source: ['local', 'https', 'home-assistant'].includes(rule?.source) ? rule.source : 'local', endpoint: String(rule?.endpoint || '').slice(0, 512), entity: String(rule?.entity || '').slice(0, 128), disabled: rule?.disabled === true })) : [] };
    safe.schedule.invalidTimezones = safe.schedule.rules.filter((rule) => !isValidTimezone(rule.timezone)).map((rule) => rule.id);
    safe.schedule.invalidRules = safe.schedule.rules.filter((rule) => !isValidStoredRule(rule)).map((rule) => rule.id);
    safe.schedule.rules = safe.schedule.rules.map((rule) => ({ ...rule, validationReasons: ruleValidationReasons(rule), disabled: rule.disabled || !isValidStoredRule(rule) }));
    safe.schemaVersion = SETTINGS_SCHEMA_VERSION;
    safe.compatibilityStatus = compatibilityMalformed ? 'malformed' : 'valid';
    return safe;
  }
  const state = sanitizeState(load());
  const baseSettings = { language: state.language, theme: state.theme, density: state.density, narratorEnabled: state.narratorEnabled, displayName: state.displayName };
  const effectiveSettings = { ...baseSettings };
  let scheduleTimer;
  let scheduleBoundaryTimer;
  const voices = { en: [], zh: [] };
  let voiceListener;
  let narrationCurrent = false;
  let narrationQueue = [];
  let globalEventSequence = 0;
  let pageEventListener;
  let pageStateListener;
  let regexConfig = { pattern: '', flags: 'iu', enabled: false };
  let regexReturnFocus;
  let regexTargetInput;
  const dropdownRegex = new Map();
  const narrationLastByCategory = new Map();
  const narrationTimers = new Map();
  let confirmReturnFocus;
  let confirmAction;
  let confirmScheduleId;

  const PANEL_COPY = {
    'global-settings-title': ['Page settings', '頁面設定'],
    'global-settings-lede': ['Every page owns this visitor-local panel. No analytics, third-party assets, or automatic network requests.', '每頁都有自己嘅訪客本地設定，冇分析、第三方素材或者自動網絡要求。'],
    'global-language-title': ['Language mode', '語言模式'],
    'global-language-help': ['Choose English, playful Hong Kong-style Cantonese, or bilingual copy for this page.', '為此頁選擇英文、玩味香港廣東話或者雙語顯示。'],
    'global-english-funny-title': ['English funny level', '英文搞笑程度'],
    'global-english-funny-help': ['Styles every English message, including warnings. Facts stay exact. Level 5 is the shipped default.', '所有英文訊息包括警告都會套用語氣，事實保持準確，預設係第 5 級。'],
    'global-cantonese-funny-title': ['Cantonese funny level', '廣東話搞笑程度'],
    'global-cantonese-funny-help': ['Styles every Cantonese message, including warnings. Facts stay exact. Level 5 is the shipped default.', '所有廣東話訊息包括警告都會套用語氣，事實保持準確，預設係第 5 級。'],
    'global-emoji-title': ['Dialog emoji decoration', '對話框表情裝飾'],
    'global-emoji-help': ['Decorates informational dialog and toast headings only. Control labels and accessible names stay plain.', '只裝飾資訊對話框同提示標題，控制標籤同無障礙名稱保持原文。'],
    'global-school-help': ['A local interface preference, not a security boundary. Clearing this site storage resets it.', '呢個係本地介面偏好，唔係安全邊界。清除本網站儲存資料就可以重設。'],
    'global-narrator-title': ['Narrator', '旁白'],
    'global-narrator-help': ['Off by default. Installed browser voices are enumerated late from this device.', '預設關閉，瀏覽器會稍後列出此裝置實際安裝嘅聲音。'],
    'global-schedule-title': ['Scheduled settings', '排程設定'],
    'global-schedule-help': ['Rules are local and timezone-aware. External values are checked only after an explicit action.', '規則會按本地時區運作，外部資料只會喺人手明確要求後檢查。'],
    'global-visitor-title': ['Visitor and updates', '訪客同更新'],
    'global-display-title': ['Page display name', '頁面顯示名稱'],
    'global-display-help': ['Changes the page label only. It never changes package identity, storage location, installer identity, or update feed.', '只改變頁面標籤，唔會改變套件身份、儲存位置、安裝程式身份或者更新來源。'],
    'global-dimsum-title': ['Startup dim sum', '啟動點心'],
    'global-dimsum-help': ['A later-visit ten-percent surprise uses the sanctioned public catalog image and has no off switch.', '之後訪問有百分之十機會顯示公共目錄圖片，冇關閉掣。'],
    'global-update-title': ['Updates and downloads', '更新同下載'],
    'global-update-help': ['No verified release manifest or installer is available for this static page, so no action is shown.', '此靜態頁未有已驗證發行清單或者安裝程式，所以唔會顯示冇作用嘅掣。'],
    'global-tab-language-button': ['Language and School', '語言同 School mode'],
    'global-tab-voice-button': ['Narration and Schedule', '旁白同排程'],
    'global-tab-visitor-button': ['Visitor and Updates', '訪客同更新']
  };
  const ROW_COPY = {
    narrator: ['Narrator', '旁白'],
    schedule: ['Scheduled settings', '排程設定'],
    'display name': ['Page display name', '頁面顯示名稱'],
    'dim sum': ['Startup dim sum', '啟動點心'],
    updates: ['Updates and downloads', '更新同下載'],
    'reset local': ['Reset visitor settings', '重設訪客設定']
  };
  const GLOBAL_PALETTE_CONTROLS = [
    ['Page settings', 'global-settings-open'], ['Language mode', 'global-language'], ['English funny level', 'global-english-funny'], ['Cantonese funny level', 'global-cantonese-funny'], ['Dialog emoji decoration', 'global-dialog-emoji'], ['School mode', 'global-school-toggle'], ['School mode name', 'global-school-name'], ['School mode reset and recovery', 'global-school-reset'], ['Narrator', 'global-narrator-enabled'], ['Narrator language', 'global-narrator-language'], ['Scheduled settings', 'global-schedule-enabled'], ['Page display name', 'global-display-name'], ['Startup dim sum status', 'global-dimsum-status'], ['Updates and downloads status', 'global-update-status']
  ];
  const PALETTE_ZH = { 'Page settings': '頁面設定', 'Language mode': '語言模式', 'English funny level': '英文搞笑程度', 'Cantonese funny level': '廣東話搞笑程度', 'Dialog emoji decoration': '對話框表情裝飾', 'School mode': 'School mode', 'School mode name': 'School mode 名稱', 'School mode reset and recovery': 'School mode 重設同恢復', Narrator: '旁白', 'Narrator language': '旁白語言', 'Scheduled settings': '排程設定', 'Page display name': '頁面顯示名稱', 'Startup dim sum status': '啟動點心狀態', 'Updates and downloads status': '更新同下載狀態' };

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('ding-global-settings-change', { detail: { language: state.language, theme: state.theme, density: state.density, englishFunny: state.englishFunny, cantoneseFunny: state.cantoneseFunny } }));
  }
  function purgeOwnedState() {
    OWNED_STATE_KEYS.forEach((key) => localStorage.removeItem(key));
    try { const mirror = parseUniqueJson(localStorage.getItem(MIRROR_STATE_KEY) || '{}'); delete mirror.language; delete mirror.englishFunny; delete mirror.cantoneseFunny; localStorage.setItem(MIRROR_STATE_KEY, JSON.stringify(mirror)); } catch { /* keep an unreadable compatibility mirror untouched */ }
  }
  function parseUniqueJson(raw) {
    let index = 0;
    const whitespace = () => { while (/\s/.test(raw[index] || '')) index += 1; };
    const string = () => { const start = index; if (raw[index] !== '"') throw new Error('JSON string expected.'); index += 1; while (index < raw.length) { if (raw[index] === '\\') index += 2; else if (raw[index++] === '"') return JSON.parse(raw.slice(start, index)); } throw new Error('Unterminated JSON string.'); };
    const value = () => { whitespace(); const char = raw[index]; if (char === '{') { index += 1; const object = {}; const keys = new Set(); whitespace(); if (raw[index] === '}') { index += 1; return object; } while (index < raw.length) { whitespace(); const key = string(); if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Unsafe JSON key.'); if (keys.has(key)) throw new Error(`Duplicate JSON key: ${key}`); keys.add(key); whitespace(); if (raw[index++] !== ':') throw new Error('JSON colon expected.'); object[key] = value(); whitespace(); if (raw[index] === '}') { index += 1; return object; } if (raw[index++] !== ',') throw new Error('JSON comma expected.'); } throw new Error('Unterminated JSON object.'); } if (char === '[') { index += 1; const array = []; whitespace(); if (raw[index] === ']') { index += 1; return array; } while (index < raw.length) { array.push(value()); whitespace(); if (raw[index] === ']') { index += 1; return array; } if (raw[index++] !== ',') throw new Error('JSON comma expected.'); } throw new Error('Unterminated JSON array.'); } const start = index; while (index < raw.length && !/[\s,\]}]/.test(raw[index])) index += 1; if (start === index) throw new Error('JSON value expected.'); return JSON.parse(raw.slice(start, index)); };
    const parsed = value(); whitespace(); if (index !== raw.length) throw new Error('Trailing JSON content.'); return parsed;
  }
  function assetUrl(name) {
    const style = document.querySelector('link[href$="styles.css"]');
    return new URL(name, style ? new URL(style.href, document.baseURI) : document.baseURI).href;
  }
  async function sha256Hex(bytes) {
    if (!window.crypto?.subtle) return '';
    const digestValue = await window.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digestValue)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  function bytesToBase64(bytes) { let binary = ''; for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192)); return btoa(binary); }
  function detectImageMime(bytes, contentType = '') { const header = contentType.split(';')[0].trim().toLowerCase(); const png = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a; const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff; if (png && (header === 'image/png' || !header)) return 'image/png'; if (jpeg && (header === 'image/jpeg' || !header)) return 'image/jpeg'; return '' }
  function fisherYates(values) { const output = [...values]; for (let index = output.length - 1; index > 0; index -= 1) { const swap = Math.floor(Math.random() * (index + 1)); [output[index], output[swap]] = [output[swap], output[index]]; } return output; }
  async function fetchWithDeadline(url, options = {}, timeoutMs = 5000) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs); try { return await fetch(url, { ...options, signal: controller.signal }); } finally { clearTimeout(timer); } }
  function withDeadline(promise, timeoutMs = 5000) { let timer; return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Operation deadline exceeded.')), timeoutMs); })]).finally(() => clearTimeout(timer)); }
  async function decodeImage(dataUrl) {
    if (typeof Image !== 'function') return false;
    return new Promise((resolve) => { const image = new Image(); image.onload = () => resolve(image.naturalWidth > 0 && image.naturalHeight > 0); image.onerror = () => resolve(false); image.src = dataUrl; });
  }
  async function loadDimSumCatalog() {
    try {
      const response = await fetchWithDeadline(assetUrl(DIM_SUM_CACHE.file), { cache: 'no-store', credentials: 'omit', redirect: 'error' });
      if (!response.ok) throw new Error(`Cache metadata HTTP ${response.status}`);
      const raw = await withDeadline(response.text()); if (new TextEncoder().encode(raw).byteLength > 131072) throw new Error('Dim-sum cache metadata is too large.');
      const parsed = parseUniqueJson(raw);
      if (parsed.schemaVersion !== DIM_SUM_CACHE.schemaVersion || parsed.sourceUrl !== DIM_SUM_CACHE.sourceUrl || parsed.catalogRevision !== DIM_SUM_CACHE.releaseNamespace || !Array.isArray(parsed.dishes) || parsed.dishes.length > 32) throw new Error('Dim-sum cache schema or source revision is not accepted.');
      DISHES = parsed.dishes.filter((dish) => { if (!dish || typeof dish.id !== 'string' || typeof dish.imageUrl !== 'string' || typeof dish.sha256 !== 'string' || dish.sha256.length !== 64 || dish.releaseTag !== DIM_SUM_CACHE.releaseNamespace || typeof dish.catalogRevision !== 'string' || !dish.name || typeof dish.name.en !== 'string' || typeof dish.name.zhHant !== 'string') return false; try { const url = new URL(dish.imageUrl); const filename = url.pathname.split('/').pop() || ''; const expectedPath = `/Ding-Ding-Projects/dim-sum-photos/releases/download/catalog-v1/${filename}`; return url.protocol === 'https:' && url.hostname === 'github.com' && url.pathname === expectedPath && filename === `hk-dish-${dish.id.slice(-4)}-${filename.split('-').slice(3).join('-')}` && /^hk-dish-\d{4}-[a-z0-9-]+\.png$/.test(filename); } catch { return false; } }).map((dish) => ({ id: dish.id, en: dish.name.en, zh: dish.name.zhHant, imageUrl: dish.imageUrl, sha256: dish.sha256, releaseTag: dish.releaseTag, catalogRevision: dish.catalogRevision }));
      let cached = {};
      try { const cacheRaw = localStorage.getItem(DIM_SUM_IMAGE_CACHE_KEY) || '{}'; if (new TextEncoder().encode(cacheRaw).byteLength > 6291456) throw new Error('cache-oversize'); cached = parseUniqueJson(cacheRaw); if (cached.schemaVersion !== 1 || cached.sourceUrl !== DIM_SUM_CACHE.sourceUrl || cached.catalogRevision !== DIM_SUM_CACHE.releaseNamespace || !Array.isArray(cached.entries) || cached.entries.length > 32) throw new Error('cache-stale'); } catch (error) { localStorage.removeItem(DIM_SUM_IMAGE_CACHE_KEY); state.dimSumCacheReason = error.message === 'cache-oversize' ? 'cache-oversize' : 'cache-purged'; cached = {}; }
      const usable = [];
      for (const dish of DISHES) { const local = cached?.entries?.find((entry) => entry.id === dish.id && entry.sha256 === dish.sha256 && entry.releaseTag === dish.releaseTag && entry.catalogRevision === dish.catalogRevision && typeof entry.mime === 'string' && /^image\/(?:png|jpeg)$/.test(entry.mime) && typeof entry.dataUrl === 'string' && entry.dataUrl.length <= 1398104 && new RegExp(`^data:${entry.mime.replace('/', '\\/')};base64,[A-Za-z0-9+/]+={0,2}$`).test(entry.dataUrl)); if (local) { try { const encoded = local.dataUrl.split(',')[1] || ''; const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0)); if (bytes.length > 1048576 || detectImageMime(bytes, local.mime) !== local.mime) continue; if (await sha256Hex(bytes) === dish.sha256 && await decodeImage(local.dataUrl)) usable.push({ ...dish, dataUrl: local.dataUrl, mime: local.mime }); } catch { /* purge below if no usable entry */ } } }
      if (usable.length) { DISHES = usable; state.dimSumCacheReason = 'verified'; return true; }
      localStorage.removeItem(DIM_SUM_IMAGE_CACHE_KEY);
      const candidates = fisherYates(DISHES).slice(0, 5);
      const verified = [];
      let candidateReason = 'fetch-failed';
      for (const candidate of candidates) {
        try {
          const imageResponse = await fetchWithDeadline(candidate.imageUrl, { cache: 'force-cache', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' }); if (!imageResponse.ok || !imageResponse.body) { candidateReason = 'fetch-failed'; continue; }
          const reader = imageResponse.body.getReader(); const chunks = []; let total = 0; while (true) { const part = await withDeadline(reader.read()); if (part.done) break; total += part.value.byteLength; if (total > 1048576) { await reader.cancel(); total = 0; break; } chunks.push(part.value); }
          if (!total) { candidateReason = 'image-oversize'; continue; }
          const bytes = new Uint8Array(total); let offset = 0; chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; }); const mime = detectImageMime(bytes, imageResponse.headers.get('content-type') || ''); if (!mime) { candidateReason = 'mime-or-magic-mismatch'; continue; } const digestValue = await sha256Hex(bytes); if (digestValue !== candidate.sha256) { candidateReason = 'digest-mismatch'; continue; }
          const dataUrl = `data:${mime};base64,${bytesToBase64(bytes)}`; if (!await decodeImage(dataUrl)) { candidateReason = 'image-decode-failed'; continue; } verified.push({ ...candidate, dataUrl, mime });
        } catch { candidateReason = 'fetch-failed'; /* try the next bounded candidate */ }
      }
      if (!verified.length) { state.dimSumCacheReason = candidateReason; return false; }
      localStorage.setItem(DIM_SUM_IMAGE_CACHE_KEY, JSON.stringify({ schemaVersion: 1, sourceUrl: DIM_SUM_CACHE.sourceUrl, catalogRevision: DIM_SUM_CACHE.releaseNamespace, entries: verified.map((candidate) => ({ id: candidate.id, sha256: candidate.sha256, releaseTag: candidate.releaseTag, catalogRevision: candidate.catalogRevision, mime: candidate.mime, dataUrl: candidate.dataUrl })) })); DISHES = verified; state.dimSumCacheReason = 'verified'; return true;
    } catch { DISHES = []; state.dimSumCacheReason = 'fetch-failed'; return false; }
  }
  function applyPanelCopy() {
    Object.entries(PANEL_COPY).forEach(([id, [en, zh]]) => {
      const node = $(id);
      if (node) setLocalizedText(node, en, zh, state.language === 'zh' ? 'zh' : 'en');
    });
    all('[data-global-copy-en]').forEach((node) => {
      const en = node.dataset.globalCopyEn || node.textContent;
      const zh = node.dataset.globalCopyZh || en;
      setLocalizedText(node, en, zh, state.language === 'zh' ? 'zh' : 'en');
    });
    all('#global-settings-panel .global-setting').forEach((row) => {
      const key = Object.keys(ROW_COPY).find((candidate) => (row.dataset.search || '').includes(candidate));
      const heading = row.querySelector('h3');
      if (key && heading) setLocalizedText(heading, ...ROW_COPY[key], state.language === 'zh' ? 'zh' : 'en');
    });
    const status = $('global-narrator-voice-status');
    if (status && !voices.en.length && !voices.zh.length) status.textContent = copy('No compatible installed browser voice is available yet.', '暫時未搵到可以用嘅瀏覽器聲音。', 'en');
    STATIC_COPY_INVENTORY.forEach(([selector, en, zh, type]) => { const node = document.querySelector(selector); if (!node) return; if (type === 'placeholder') node.placeholder = localizedInline(en, zh); else if (type === 'aria-label') node.setAttribute('aria-label', localizedInline(en, zh)); else setLocalizedText(node, en, zh, 'en'); });
    applyLiteralCopy($('global-settings-panel'));
    all('[data-global-weekday]').forEach((input) => { const label = WEEKDAY_COPY[input.dataset.globalWeekday]; if (!label) return; const parent = input.closest('label'); if (parent) { [...parent.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).forEach((node) => { node.nodeValue = ` ${state.language === 'zh' ? copy(label[0], label[1], 'zh') : state.language === 'both' ? `${copy(label[0], label[1], 'en')} / ${copy(label[0], label[1], 'zh')}` : copy(label[0], label[1], 'en')}`; }); } });
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }
  function digest(value) {
    if (window.crypto?.subtle) return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)).then((buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join(''));
    let hash = 2166136261;
    for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return Promise.resolve(`fallback-${(hash >>> 0).toString(16)}`);
  }
  function notify(title, body, source = { enTitle: title, zhTitle: title, enBody: body, zhBody: body }) {
    const region = $('toast-region') || (() => { const node = document.createElement('div'); node.id = 'toast-region'; node.className = 'toast-region'; node.setAttribute('aria-live', 'polite'); document.body.append(node); return node; })();
    const toast = document.createElement('div');
    toast.className = 'toast global-toast';
    const rendered = { enTitle: copy(source.enTitle, source.zhTitle, 'en', 'en'), zhTitle: copy(source.enTitle, source.zhTitle, 'zh', 'zh'), enBody: copy(source.enBody, source.zhBody, 'en', 'en'), zhBody: copy(source.enBody, source.zhBody, 'zh', 'zh') };
    const titleNode = document.createElement('strong'); if (state.dialogEmoji) { const icon = document.createElement('span'); icon.setAttribute('aria-hidden', 'true'); icon.textContent = '◈ '; titleNode.append(icon); } const titleParts = state.language === 'both' ? [rendered.enTitle, rendered.zhTitle] : [state.language === 'zh' ? rendered.zhTitle : rendered.enTitle]; titleParts.forEach((part, index) => { if (index) titleNode.append(document.createTextNode(' / ')); const segment = document.createElement('span'); segment.className = index ? 'copy-segment copy-segment-zh' : 'copy-segment copy-segment-en'; segment.lang = index ? 'yue-HK' : 'en'; segment.textContent = part; titleNode.append(segment); });
    const bodyNode = document.createElement('span'); const bodyParts = state.language === 'both' ? [rendered.enBody, rendered.zhBody] : [state.language === 'zh' ? rendered.zhBody : rendered.enBody]; bodyParts.forEach((part, index) => { if (index) bodyNode.append(document.createTextNode(' / ')); const segment = document.createElement('span'); segment.className = index ? 'copy-segment copy-segment-zh' : 'copy-segment copy-segment-en'; segment.lang = index ? 'yue-HK' : 'en'; segment.textContent = part; bodyNode.append(segment); }); toast.append(titleNode, bodyNode);
    region.append(toast);
    window.dispatchEvent(new CustomEvent('ding-page-event', { detail: { eventId: `global-${Date.now()}-${++globalEventSequence}`, category: 'global-notification', enTitle: source.enTitle, zhTitle: source.zhTitle, enBody: source.enBody, zhBody: source.zhBody } }));
    window.setTimeout(() => toast.remove(), 6000);
  }
  function notifyLocalized(enTitle, zhTitle, enBody, zhBody) { const displayTitle = state.language === 'zh' ? zhTitle : state.language === 'both' ? `${enTitle} / ${zhTitle}` : enTitle; const displayBody = state.language === 'zh' ? zhBody : state.language === 'both' ? `${enBody} / ${zhBody}` : enBody; notify(displayTitle, displayBody, { enTitle, zhTitle, enBody, zhBody }); }
  function setText(id, en, zh) {
    const node = $(id);
    if (node) node.textContent = copy(en, zh, state.language === 'zh' ? 'zh' : 'en');
  }
  function renderVoices() {
    const selectEnglish = $('global-narrator-english-voice');
    const selectCantonese = $('global-narrator-cantonese-voice');
    const fill = (select, list, selected) => {
      if (!select) return;
      const missing = selected && !list.some((voice) => voice.voiceURI === selected) ? `<option value="${escapeHtml(selected)}">Selected voice is not installed on this computer</option>` : '';
      select.innerHTML = '<option value="">Choose automatically</option>' + missing + list.map((voice) => `<option value="${escapeHtml(voice.voiceURI)}">${escapeHtml(voice.name)} · ${escapeHtml(voice.lang)}</option>`).join('');
      select.value = selected || '';
    };
    fill(selectEnglish, voices.en, state.narratorEnglishVoice);
    fill(selectCantonese, voices.zh, state.narratorCantoneseVoice);
    const status = $('global-narrator-voice-status');
    if (status) status.textContent = speechSynthesisAvailable() ? copy(`Installed voices: English ${voices.en.length}, Cantonese yue-HK ${voices.zh.length}.`, `已安裝聲音：英文 ${voices.en.length} 個，yue-HK 廣東話 ${voices.zh.length} 個。`, 'en') : copy('Speech synthesis is unavailable in this browser.', '此瀏覽器未能提供語音合成。', 'en');
  }
  function speechSynthesisAvailable() {
    return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
  }
  function refreshVoices() {
    if (!speechSynthesisAvailable()) return;
    const list = window.speechSynthesis.getVoices();
    voices.en = list.filter((voice) => /^en(?:-|$)/i.test(voice.lang));
    voices.zh = list.filter((voice) => voice.lang.toLowerCase() === 'yue-hk');
    renderVoices();
  }
  function selectedVoice(language) {
    const uri = language === 'zh' ? state.narratorCantoneseVoice : state.narratorEnglishVoice;
    return (voices[language] || []).find((voice) => voice.voiceURI === uri);
  }
  function speakNext() {
    if (!speechSynthesisAvailable() || narrationCurrent || narrationQueue.length === 0 || !state.narratorEnabled) return;
    const item = narrationQueue.shift();
    narrationCurrent = true;
    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.lang = item.language === 'zh' ? 'yue-HK' : 'en-US';
    utterance.rate = Number(state.narratorRate) || 1;
    utterance.pitch = Number(state.narratorPitch) || 1;
    const voice = selectedVoice(item.language);
    if (voice) utterance.voice = voice;
    utterance.onend = utterance.onerror = () => { narrationCurrent = false; speakNext(); };
    window.speechSynthesis.speak(utterance);
  }
  function announce(en, zh, category = 'general') {
    if (!state.narratorEnabled || !speechSynthesisAvailable() || state.quietHours || state.reducedSound || state.screenReaderActive || document.body.classList.contains('low-stimulation') || document.documentElement.dataset.reducedSound === 'true') return;
    const now = Date.now();
    if (now - (narrationLastByCategory.get(category) || 0) < NARRATION_COOLDOWN_MS) return;
    narrationLastByCategory.set(category, now);
    clearTimeout(narrationTimers.get(category));
    narrationTimers.set(category, setTimeout(() => {
      const tonedEnglish = copy(en, zh, 'en', 'en');
      const tonedCantonese = copy(en, zh, 'zh', 'zh');
      const items = state.narratorLanguage === 'both' ? [{ text: tonedEnglish, language: 'en' }, { text: tonedCantonese, language: 'zh' }] : [{ text: state.narratorLanguage === 'zh' ? tonedCantonese : tonedEnglish, language: state.narratorLanguage === 'zh' ? 'zh' : 'en' }];
      narrationQueue = items;
      speakNext();
    }, NARRATION_DEBOUNCE_MS));
  }
  function applyDisplayName() {
    const name = state.displayName.trim() || DEFAULTS.displayName;
    all('.brand strong, [data-display-name]').forEach((node) => { node.textContent = name; });
    document.body.dataset.displayName = name;
    document.body.dataset.displayNameConsumers = DISPLAY_NAME_CONSUMER_INVENTORY.join(',');
    document.body.dataset.pageCopyInventory = PAGE_COPY_INVENTORY.join(',');
    document.body.dataset.shippedIdentity = IDENTITY_BOUNDARY.shippedName;
    document.body.dataset.identityBoundary = Object.keys(IDENTITY_BOUNDARY).join(',');
    if (document.title) document.title = document.title.replace(/^[^·]+/, `${name} `);
  }
  function applySchoolMode() {
    document.body.classList.toggle('global-school-mode', state.schoolMode);
    document.documentElement.lang = state.schoolMode ? 'en' : (state.language === 'zh' ? 'zh-Hant' : 'en');
    all('[data-school-hidden]').forEach((node) => { node.hidden = state.schoolMode; });
    SCHOOL_SUPPRESSION_INVENTORY.forEach((selector) => all(selector).forEach((node) => {
      if (node.id === 'global-settings-search' || node.closest('.global-settings-search-wrap')) return;
      if (node.closest('#global-settings-panel') && node.closest('[data-school-keep]')) return;
      const target = node.closest('article.setting-card, details, .search-composite') || node;
      if (!target.dataset.schoolOriginalHidden) target.dataset.schoolOriginalHidden = String(target.hidden);
      target.hidden = state.schoolMode ? true : target.dataset.schoolOriginalHidden === 'true';
    }));
    all('.destination-card, .palette-result:not([data-global-palette])').forEach((node) => { if (!node.dataset.schoolOriginalHidden) node.dataset.schoolOriginalHidden = String(node.hidden); node.hidden = state.schoolMode ? true : node.dataset.schoolOriginalHidden === 'true'; });
    augmentPalette();
    const label = $('global-school-label');
    if (label) setLocalizedText(label, state.schoolName, state.schoolName, 'en');
    const renamed = state.schoolName.trim() || DEFAULTS.schoolName;
    document.body.dataset.schoolName = renamed;
    $('global-settings-panel')?.setAttribute('data-school-name', renamed);
    const tabs = document.querySelector('.global-tabs'); if (tabs) tabs.setAttribute('aria-label', `${renamed} setting sections`);
    const settingsSearch = $('global-settings-search'); if (settingsSearch) settingsSearch.setAttribute('aria-label', `Search ${renamed} and page settings`);
    const paletteSearch = $('palette-search'); if (paletteSearch) paletteSearch.setAttribute('aria-label', `Search ${renamed} and destinations`);
    const languageTab = $('global-tab-language-button'); if (languageTab) setLocalizedText(languageTab, 'Language and mode', `語言同${renamed}`, 'en');
    const modeNameLabel = document.querySelector('label[for="global-school-name"]'); if (modeNameLabel) setLocalizedText(modeNameLabel, 'Mode name', `${renamed} 名稱`, 'en');
    const codeLabel = document.querySelector('label[for="global-school-code"]'); if (codeLabel) setLocalizedText(codeLabel, `${renamed} unlock code`, `${renamed} 解鎖碼`, 'en');
    const toggleText = document.querySelector('#global-school-toggle + span'); if (toggleText) setLocalizedText(toggleText, `Use ${renamed}`, `使用${renamed}`, 'en');
    const resetButton = $('global-school-reset'); if (resetButton) setLocalizedText(resetButton, `Reset ${renamed} and recovery`, `重設${renamed}同恢復`, 'en');
    const note = $('global-school-note');
    if (note) setLocalizedText(note, state.schoolMode ? `${state.schoolName} is active. The page stays in English and optional playful controls are suppressed. Turn it off with the local credential, or clear this site's storage to reset it.` : `${state.schoolName} is a local interface preference, not a security boundary. Clearing this site's storage resets it.`, state.schoolMode ? `${state.schoolName} 已啟用，頁面保持英文並隱藏可選玩味控制。用本地憑證關閉，或者清除本網站儲存資料重設。` : `${state.schoolName} 係本地介面偏好，唔係安全邊界。清除本網站儲存資料就可以重設。`, 'en');
  }
  function applyLanguageValue() {
    document.documentElement.lang = state.schoolMode ? 'en' : (state.language === 'zh' ? 'zh-Hant' : 'en');
    if ($('global-language')) $('global-language').value = state.language;
  }
  function settingRows() { return all('#global-settings-panel .global-setting'); }
  function schoolSuppressed(node) {
    if (!state.schoolMode) return false;
    if (node.closest('[data-school-keep]') || node.id === 'global-school-toggle' || node.id === 'global-school-name' || node.id === 'global-school-reset') return false;
    return node.matches('[data-school-hidden], .global-setting[data-school-hidden], .destination-card, .palette-result, #feature-search, #palette-search, #settings-search, #vocabulary-file, #vocabulary-clear');
  }
  function searchMatches(text) {
    const query = $('global-settings-search')?.value.trim() || '';
    if (!query) return true;
    if (regexConfig.enabled) {
      try { return new RegExp(regexConfig.pattern, regexConfig.flags).test(text); } catch { return false; }
    }
    return text.toLocaleLowerCase().includes(query.toLocaleLowerCase());
  }
  function filterSettings() {
    let count = 0;
    settingRows().forEach((row) => { const visible = !schoolSuppressed(row) && searchMatches(row.textContent); row.hidden = !visible; if (visible) count += 1; });
    const status = $('global-settings-search-status');
    if (status) setLocalizedText(status, `${state.schoolName}: ${count} setting${count === 1 ? '' : 's'} shown.${state.compatibilityStatus === 'malformed' ? ' Compatibility mirror malformed, unrelated fields were preserved.' : ''}`, `${state.schoolName}：顯示 ${count} 項設定。${state.compatibilityStatus === 'malformed' ? '相容鏡像格式錯誤，無關欄位已保留。' : ''}`, 'en');
  }
  function openRegex() {
    const popover = $('global-regex-popover');
    if (!popover) return;
    popover.hidden = false;
    $('global-regex-pattern').value = regexConfig.pattern;
    if ($('global-regex-mode')) $('global-regex-mode').value = regexConfig.enabled ? 'regex' : 'plain';
    $('global-regex-i').checked = regexConfig.flags.includes('i');
    $('global-regex-u').checked = regexConfig.flags.includes('u');
    $('global-regex-pattern').oninput = () => { previewRegex(); if ($('global-regex-mode')?.value === 'regex') { if (regexTargetInput) regexTargetInput.value = $('global-regex-pattern').value; else if ($('global-settings-search')) $('global-settings-search').value = $('global-regex-pattern').value; filterSettings(); } };
    $('global-regex-i').onchange = previewRegex;
    $('global-regex-u').onchange = previewRegex;
    $('global-regex-pattern').focus();
    positionRegexPopover();
    previewRegex();
  }
  function positionRegexPopover() {
    const popover = $('global-regex-popover'); if (!popover) return;
    const anchor = regexTargetInput || $('global-settings-search');
    if (anchor) popover.dataset.anchorFor = anchor.id || 'global-settings-search';
    const panel = $('global-settings-panel');
    if (panel && anchor) {
      const panelRect = panel.getBoundingClientRect(); const anchorRect = anchor.getBoundingClientRect(); const gap = 8; const maxWidth = Math.max(220, panelRect.width - 24); const left = Math.min(Math.max(12, anchorRect.left - panelRect.left), Math.max(12, panelRect.width - maxWidth - 12)); const top = Math.max(12, anchorRect.bottom - panelRect.top + panel.scrollTop + gap); popover.style.position = 'absolute'; popover.style.left = `${left}px`; popover.style.top = `${top}px`; popover.style.maxWidth = `${maxWidth}px`; popover.style.maxHeight = `${Math.max(180, panel.clientHeight - 120)}px`; popover.dataset.collision = top + popover.offsetHeight > panel.scrollHeight ? 'scroll' : 'none';
    }
    popover.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function previewRegex() {
    const pattern = $('global-regex-pattern')?.value.slice(0, 256) || '';
    const flags = `${$('global-regex-i')?.checked ? 'i' : ''}${$('global-regex-u')?.checked ? 'u' : ''}`;
    const feedback = $('global-regex-feedback');
    if (!feedback) return;
    if (!pattern) { feedback.textContent = 'Plain text search remains active.'; return; }
    try { const matches = [...'Language School Narrator Schedule Updates'.matchAll(new RegExp(pattern, `${flags}g`))].length; feedback.textContent = `Valid JavaScript regular expression, ${matches} sample match${matches === 1 ? '' : 'es'}.`; } catch (error) { feedback.textContent = `Invalid pattern: ${error.message}`; }
  }
  function applyRegex() {
    const pattern = $('global-regex-pattern')?.value.slice(0, 256) || '';
    const flags = `${$('global-regex-i')?.checked ? 'i' : ''}${$('global-regex-u')?.checked ? 'u' : ''}`;
    if ($('global-regex-mode')?.value === 'plain') regexConfig.enabled = false;
    try { new RegExp(pattern, flags); } catch { return; }
    if (regexTargetInput) {
      dropdownRegex.set(regexTargetInput, { pattern, flags, enabled: regexConfig.enabled !== false && Boolean(pattern) });
      regexTargetInput.value = pattern;
      regexTargetInput.dispatchEvent(new Event('input'));
    } else {
      regexConfig = { pattern, flags, enabled: regexConfig.enabled !== false && Boolean(pattern) };
      if ($('global-settings-search')) $('global-settings-search').value = pattern;
    }
    $('global-regex-popover').hidden = true;
    $('global-regex-open')?.setAttribute('aria-expanded', 'false');
    filterSettings();
    regexReturnFocus?.focus(); regexReturnFocus = undefined; regexTargetInput = undefined;
  }
  function openRegexForInput(input) {
    regexTargetInput = input;
    regexReturnFocus = input;
    const saved = dropdownRegex.get(input) || { pattern: '', flags: 'iu', enabled: false };
    regexConfig = saved;
    $('global-regex-popover')?.setAttribute('data-anchor-for', input.id || 'dropdown-search');
    openRegex();
  }
  function createDropdownRegexOverlay(input, wrapper, regex, filter) {
    const popover = document.createElement('div'); popover.className = 'global-regex-popover dropdown-regex-popover'; popover.hidden = true; popover.setAttribute('role', 'group'); popover.innerHTML = '<h3>Regex builder for this choices list</h3><label>Pattern<input type="text" maxlength="256"></label><label>Mode<select><option value="plain">Plain text</option><option value="regex">Regular expression</option></select></label><label><input type="checkbox" data-flag="i" checked> Ignore case</label><label><input type="checkbox" data-flag="u" checked> Unicode</label><p role="status"></p><button type="button" class="primary-button" data-apply>Apply</button><button type="button" class="text-button" data-cancel>Cancel</button>';
    wrapper.after(popover);
    const pattern = popover.querySelector('input[type="text"]'); const mode = popover.querySelector('select'); const feedback = popover.querySelector('[role="status"]'); const apply = () => { const flags = `${popover.querySelector('[data-flag="i"]').checked ? 'i' : ''}${popover.querySelector('[data-flag="u"]').checked ? 'u' : ''}`; const enabled = mode.value === 'regex' && Boolean(pattern.value); try { if (enabled) new RegExp(pattern.value, flags); } catch (error) { feedback.textContent = `Invalid pattern: ${error.message}`; return; } dropdownRegex.set(input, { pattern: pattern.value.slice(0, 256), flags, enabled }); input.value = pattern.value.slice(0, 256); input.dispatchEvent(new Event('input')); popover.hidden = true; regex.focus(); };
    const open = () => { const saved = dropdownRegex.get(input) || { pattern: '', flags: 'iu', enabled: false }; pattern.value = saved.pattern; mode.value = saved.enabled ? 'regex' : 'plain'; popover.querySelector('[data-flag="i"]').checked = saved.flags.includes('i'); popover.querySelector('[data-flag="u"]').checked = saved.flags.includes('u'); popover.hidden = false; popover.dataset.anchorFor = input.id || 'dropdown-search'; pattern.focus(); };
    pattern.addEventListener('input', () => { feedback.textContent = pattern.value && mode.value === 'regex' ? 'Pattern will be checked when applied.' : 'Plain text filtering is active.'; }); mode.addEventListener('change', () => { feedback.textContent = mode.value === 'regex' ? 'Regular expression mode is active.' : 'Plain text mode is active.'; }); popover.querySelector('[data-apply]').onclick = apply; popover.querySelector('[data-cancel]').onclick = () => { popover.hidden = true; regex.focus(); }; regex.onclick = open;
  }
  function enhanceDropdowns() {
    all('select').forEach((select) => {
      if (select.dataset.dropdownEnhanced) return;
      select.dataset.dropdownEnhanced = 'true';
      const wrapper = document.createElement('div'); wrapper.className = 'global-dropdown-tools';
      const input = document.createElement('input'); input.type = 'search'; input.className = 'global-dropdown-search'; input.placeholder = 'Filter choices'; input.setAttribute('aria-label', `Filter ${select.getAttribute('aria-label') || select.previousElementSibling?.textContent || 'choices'}`);
      const regex = document.createElement('button'); regex.type = 'button'; regex.className = 'regex-trigger'; regex.textContent = '.*'; regex.setAttribute('aria-label', `Build a regular expression for ${input.getAttribute('aria-label')}`); regex.dataset.globalDropdownRegex = 'true'; regex.dataset.globalSettingsOwned = 'true';
      wrapper.append(input, regex); select.parentNode.insertBefore(wrapper, select);
      const filter = () => { const config = dropdownRegex.get(input); [...select.options].forEach((option) => { const text = option.textContent || ''; let visible = !input.value; if (input.value && config?.enabled) { try { visible = new RegExp(config.pattern, config.flags).test(text); } catch { visible = false; } } else if (input.value) visible = text.toLocaleLowerCase().includes(input.value.toLocaleLowerCase()); option.hidden = !visible; }); };
      input.addEventListener('input', filter); createDropdownRegexOverlay(input, wrapper, regex, filter);
    });
  }
  function ensureAllDayControl() {
    if ($('global-schedule-all-day') || !$('global-schedule-enabled')) return;
    const label = document.createElement('label'); label.className = 'switch-row'; label.innerHTML = '<input id="global-schedule-all-day" type="checkbox"><span>All day in the selected date window</span>';
    $('global-schedule-enabled').closest('label')?.after(label);
    $('global-schedule-all-day').onchange = () => { const disabled = $('global-schedule-all-day').checked; ['global-schedule-start-time', 'global-schedule-end-time'].forEach((id) => { if ($(id)) { $(id).disabled = disabled; if (disabled) $(id).value = ''; } }); };
  }
  function ensureTimezonePicker() {
    const input = $('global-schedule-timezone'); if (!input || $('global-schedule-timezone-picker')) return;
    const picker = document.createElement('select'); picker.id = 'global-schedule-timezone-picker'; picker.setAttribute('aria-label', 'Choose IANA timezone'); IANA_TIMEZONES.forEach((zone) => { const option = document.createElement('option'); option.value = zone; option.textContent = zone; picker.append(option); });
    input.before(picker); picker.onchange = () => { input.value = picker.value; input.readOnly = true; };
  }
  function ensureCopyAnchors() {
    const anchors = [['narrator', 'global-narrator-title', 'global-narrator-help'], ['schedule', 'global-schedule-title', 'global-schedule-help'], ['display name', 'global-display-title', 'global-display-help'], ['dim sum', 'global-dimsum-title', 'global-dimsum-help'], ['updates', 'global-update-title', 'global-update-help']];
    anchors.forEach(([needle, headingId, helpId]) => {
      const row = all('#global-settings-panel .global-setting').find((candidate) => (candidate.dataset.search || '').includes(needle));
      if (!row) return;
      const heading = row.querySelector('h3'); const help = row.querySelector('p');
      if (heading) heading.id = headingId;
      if (help) help.id = helpId;
    });
  }
  function ensureRegexModeControl() {
    if ($('global-regex-mode')) return;
    const pattern = $('global-regex-pattern'); if (!pattern) return;
    const mode = document.createElement('select'); mode.id = 'global-regex-mode'; mode.setAttribute('aria-label', 'Search mode'); mode.innerHTML = '<option value="plain">Plain text</option><option value="regex">Regular expression</option>'; pattern.before(mode);
    mode.onchange = () => { regexConfig.enabled = mode.value === 'regex'; if (!regexConfig.enabled) regexConfig.pattern = ''; previewRegex(); filterSettings(); };
  }
  function decorateDialogs() {
    all('dialog .dialog-heading').forEach((heading) => {
      const existing = heading.querySelector('.global-dialog-emoji');
      if (state.dialogEmoji && !existing) { const icon = document.createElement('span'); icon.className = 'global-dialog-emoji'; icon.textContent = '◈'; icon.setAttribute('aria-hidden', 'true'); heading.prepend(icon); }
      if (!state.dialogEmoji && existing) existing.remove();
    });
  }
  function augmentPalette() {
    const list = $('palette-results'); if (!list) return;
    const query = $('palette-search')?.value.trim().toLocaleLowerCase() || '';
    const existing = new Set([...list.querySelectorAll('[data-global-palette]')].map((node) => node.dataset.globalPalette));
    [...list.querySelectorAll('.palette-result:not([data-global-palette])')].forEach((node) => { node.hidden = state.schoolMode; });
    [...list.querySelectorAll('[data-global-palette]')].forEach((node) => { const keep = ['global-settings-open', 'global-school-toggle', 'global-school-name', 'global-school-reset'].includes(node.dataset.globalPalette); node.hidden = state.schoolMode && !keep; });
    [...list.querySelectorAll('[data-global-palette]')].forEach((node) => { const row = GLOBAL_PALETTE_CONTROLS.find(([, targetId]) => targetId === node.dataset.globalPalette); if (!row || !node.firstElementChild) return; const label = row[1].startsWith('global-school') ? state.schoolName : row[0]; const zh = row[1].startsWith('global-school') ? state.schoolName : (PALETTE_ZH[row[0]] || row[0]); setLocalizedText(node.firstElementChild, label, zh, 'en'); });
    GLOBAL_PALETTE_CONTROLS.forEach(([label, targetId]) => {
      const chosen = targetId.startsWith('global-school') ? state.schoolName : label;
      const chosenZh = targetId.startsWith('global-school') ? state.schoolName : (PALETTE_ZH[label] || label);
      const target = $(targetId); const hiddenBySchool = state.schoolMode && target && !target.closest('[data-school-keep]') && targetId !== 'global-school-toggle' && targetId !== 'global-school-name' && targetId !== 'global-school-reset';
      if (hiddenBySchool || (query && !chosen.toLocaleLowerCase().includes(query) && !chosenZh.toLocaleLowerCase().includes(query)) || existing.has(targetId)) return;
      const item = document.createElement('button'); item.type = 'button'; item.className = 'palette-result'; item.dataset.globalPalette = targetId; item.innerHTML = `<strong>${escapeHtml(copy(chosen, chosenZh, 'en'))}</strong><span>${escapeHtml(copy('Open exact page setting', '開啟確實頁面設定', 'en'))}</span>`;
      item.onclick = () => { $('global-settings-panel').hidden = false; $('global-settings-open').setAttribute('aria-expanded', 'true'); const panel = target?.closest('[role="tabpanel"]'); const tab = panel ? document.querySelector(`[role="tab"][aria-controls="${panel.id}"]`) : undefined; tab?.click(); target?.focus(); };
      list.append(item);
    });
  }
  function openConfirmation(action, returnNode, description, payload = '') {
    confirmAction = action;
    confirmScheduleId = payload;
    confirmReturnFocus = returnNode;
    const popover = $('global-confirm-popover');
    if (!popover) return;
    $('global-confirm-description').textContent = copy(description, '請確認呢個本地操作嘅確實效果同恢復方法。', state.language === 'zh' ? 'zh' : 'en');
    $('global-confirm-key-one').checked = false;
    $('global-confirm-key-two').checked = false;
    $('global-confirm-slider').value = '0';
    $('global-confirm-code').value = '';
    $('global-confirm-code').required = action === 'unlock';
    popover.hidden = false;
    updateConfirmationState();
    $('global-confirm-key-one').focus();
  }
  function closeConfirmation() {
    const popover = $('global-confirm-popover');
    if (popover) popover.hidden = true;
    confirmAction = undefined;
    confirmReturnFocus?.focus();
    confirmReturnFocus = undefined;
  }
  function updateConfirmationState() {
    const ready = $('global-confirm-key-one')?.checked && $('global-confirm-key-two')?.checked && Number($('global-confirm-slider')?.value) === 100 && (confirmAction !== 'unlock' || $('global-confirm-code')?.value.length >= 1);
    if ($('global-confirm-apply')) $('global-confirm-apply').disabled = !ready;
  }
  async function finishConfirmation() {
    if (confirmAction === 'unlock') {
      if (await digest($('global-confirm-code').value) !== state.schoolCredentialDigest) { $('global-confirm-description').textContent = copy('The local unlock code did not match. The mode remains active.', '本地解鎖碼唔啱，模式繼續啟用。', 'en'); $('global-confirm-code').focus(); return; }
      state.schoolMode = false;
    } else if (confirmAction === 'school-reset') {
      state.schoolMode = false; state.schoolCredentialDigest = '';
    } else if (confirmAction === 'display-reset') {
      baseSettings.displayName = DEFAULTS.displayName; state.displayName = DEFAULTS.displayName;
    } else if (confirmAction === 'schedule-remove') {
      state.schedule.rules = state.schedule.rules.filter((rule) => rule.id !== confirmScheduleId);
      state.schedule.lastAppliedRule = ''; state.schedule.lastAppliedSignature = '';
    } else if (confirmAction === 'full-reset') {
      purgeOwnedState(); window.location.reload(); return;
    }
    save(); applyState(); notifyLocalized('Local action completed', '本地操作完成', 'The page returned to its truthful local state.', '頁面已返回真實嘅本地狀態。'); closeConfirmation();
  }
  function renderPanel() {
    if ($('global-settings-panel')) return;
    let topActions = document.querySelector('.top-actions') || document.querySelector('.topbar');
    if (!topActions) {
      topActions = document.createElement('div');
      topActions.className = 'global-settings-fallback-toolbar';
      topActions.setAttribute('role', 'toolbar');
      topActions.setAttribute('aria-label', 'Page tools');
      document.body.prepend(topActions);
    }
    ensurePaletteMarkup();
    const button = document.createElement('button');
    button.type = 'button'; button.id = 'global-settings-open'; button.className = 'text-button global-settings-open'; button.textContent = 'Settings'; button.setAttribute('aria-expanded', 'false');
    topActions?.prepend(button);
    const panel = document.createElement('aside');
    panel.id = 'global-settings-panel'; panel.className = 'global-settings-panel'; panel.hidden = true; panel.setAttribute('aria-labelledby', 'global-settings-title');
    panel.innerHTML = `
      <div class="global-settings-header"><div><span class="card-kicker">LOCAL PAGE CONTROLS</span><h2 id="global-settings-title">Page settings</h2><p id="global-settings-lede">Every page owns this visitor-local panel. No analytics, third-party assets, or automatic network requests.</p></div><button type="button" class="icon-button" id="global-settings-close" aria-label="Close settings">×</button></div>
      <div class="search-composite global-settings-search-wrap"><label class="sr-only" for="global-settings-search">Search page settings</label><input id="global-settings-search" type="search" placeholder="Search page settings"><button type="button" class="regex-trigger" id="global-regex-open" aria-label="Build a regular expression for page settings">.*</button></div><p id="global-settings-search-status" class="filter-status" role="status"></p>
      <div class="global-tabs" role="tablist" aria-label="Page setting sections"><button type="button" role="tab" aria-selected="true" aria-controls="global-tab-language" id="global-tab-language-button">Language &amp; School</button><button type="button" role="tab" aria-selected="false" aria-controls="global-tab-voice" id="global-tab-voice-button">Narration &amp; Schedule</button><button type="button" role="tab" aria-selected="false" aria-controls="global-tab-visitor" id="global-tab-visitor-button">Visitor &amp; Updates</button></div>
      <section class="global-tab-panel" role="tabpanel" id="global-tab-language" aria-labelledby="global-tab-language-button">
        <div class="global-setting" data-school-hidden data-search="language english cantonese bilingual funny"><h3 id="global-language-title">Language mode</h3><p id="global-language-help">Choose English, playful Hong Kong-style Cantonese, or bilingual copy for this page.</p><select id="global-language" aria-label="Page language mode"><option value="en">English</option><option value="zh">Playful Hong Kong-style Cantonese</option><option value="both">Bilingual</option></select></div>
        <div class="global-setting" data-school-hidden data-search="funny english level playful"><h3 id="global-english-funny-title">English funny level</h3><p id="global-english-funny-help">Styles every English message, including warnings. Facts stay exact. Level 5 is the shipped default.</p><input id="global-english-funny" type="range" min="1" max="5" value="5" step="1"><output id="global-english-funny-output">5</output></div>
        <div class="global-setting" data-school-hidden data-search="funny cantonese level playful"><h3 id="global-cantonese-funny-title">Cantonese funny level</h3><p id="global-cantonese-funny-help">Styles every Cantonese message, including warnings. Facts stay exact. Level 5 is the shipped default.</p><input id="global-cantonese-funny" type="range" min="1" max="5" value="5" step="1"><output id="global-cantonese-funny-output">5</output></div>
        <div class="global-setting" data-school-hidden data-search="emoji dialogs message boxes"><h3 id="global-emoji-title">Dialog emoji decoration</h3><p id="global-emoji-help">When enabled, informational dialog and toast headings receive a non-semantic decoration. Control labels and accessible names stay plain.</p><label class="switch-row"><input id="global-dialog-emoji" type="checkbox"><span>Show emojis in dialogs and message boxes</span></label></div>
        <div class="global-setting" data-school-keep data-search="school mode rename unlock reset"><h3 id="global-school-label">School mode</h3><p id="global-school-note"></p><label class="switch-row"><input id="global-school-toggle" type="checkbox"><span>Use this local page mode</span></label><div class="global-inline"><label for="global-school-name">Mode name</label><input id="global-school-name" maxlength="48" type="text"><button type="button" class="text-button" id="global-school-name-save">Save name</button></div><div class="global-inline"><label for="global-school-code">Unlock code</label><input id="global-school-code" type="password" autocomplete="new-password" inputmode="numeric" maxlength="64"><button type="button" class="text-button" id="global-school-code-save">Set code</button></div><button type="button" class="danger-button" id="global-school-reset">Reset mode and credential</button></div>
      </section>
      <section class="global-tab-panel" role="tabpanel" id="global-tab-voice" aria-labelledby="global-tab-voice-button" hidden data-school-hidden>
        <div class="global-setting" data-search="narrator text to speech voice english cantonese"><h3>Narrator</h3><p>Off by default. Browser speech voices are enumerated late from this device, and the selected voice identity is stored locally.</p><label class="switch-row"><input id="global-narrator-enabled" type="checkbox"><span>Enable spoken page events</span></label><label>Spoken language<select id="global-narrator-language" aria-label="Narrated language"><option value="en">English</option><option value="zh">Cantonese</option><option value="both">Both, serialized</option></select></label><label>English voice<select id="global-narrator-english-voice" aria-label="English narrator voice"><option value="">Choose automatically</option></select></label><label>Cantonese voice<select id="global-narrator-cantonese-voice" aria-label="Cantonese narrator voice"><option value="">Choose automatically</option></select></label><p id="global-narrator-voice-status" role="status"></p><div class="global-range-grid"><label>Rate <input id="global-narrator-rate" type="range" min="0.5" max="2" value="1" step="0.1"><output id="global-narrator-rate-output">1</output></label><label>Pitch <input id="global-narrator-pitch" type="range" min="0" max="2" value="1" step="0.1"><output id="global-narrator-pitch-output">1</output></label></div><button type="button" class="primary-button" id="global-narrator-test">Speak a local test</button></div>
        <div class="global-setting" data-school-hidden data-search="schedule date time weekdays local api home assistant"><h3 id="global-schedule-title">Scheduled settings</h3><p id="global-schedule-help">Rules are local and timezone-aware. External values are checked only after an explicit action.</p><label class="switch-row"><input id="global-schedule-enabled" type="checkbox"><span>Enable schedule rules</span></label><div class="global-range-grid"><label>Target<select id="global-schedule-target">${SCHEDULE_TARGETS.map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}</select></label><label>Value<input id="global-schedule-value" type="text" maxlength="120"></label><label>Start date <input id="global-schedule-start-date" type="date"></label><label>End date <input id="global-schedule-end-date" type="date"></label><label>Start time <input id="global-schedule-start-time" type="time"></label><label>End time <input id="global-schedule-end-time" type="time"></label></div><label class="switch-row"><input id="global-schedule-every-day" type="checkbox"><span>Every day in the date window</span></label><fieldset><legend>Weekdays</legend>${WEEKDAYS.map(([id, name]) => `<label class="weekday"><input type="checkbox" data-global-weekday="${id}"> ${name}</label>`).join('')}</fieldset><div class="global-range-grid"><label>Precedence <input id="global-schedule-precedence" type="number" min="0" max="100" value="0"></label><label>Timezone <input id="global-schedule-timezone" type="text" readonly></label></div><label>Source<select id="global-schedule-source"><option value="local">Local page state</option><option value="https">Validated HTTPS API</option><option value="home-assistant">Home Assistant boolean</option></select></label><label>Endpoint <input id="global-schedule-endpoint" type="url" placeholder="https://example.invalid/settings.json"></label><label>Home Assistant entity <input id="global-schedule-entity" type="text" placeholder="input_boolean.example"></label><p id="global-schedule-status" role="status"></p><div id="global-schedule-rules" aria-live="polite"></div><button type="button" class="text-button" id="global-schedule-save">Save schedule rule</button><button type="button" class="text-button" id="global-schedule-check">Check source explicitly</button></div>
      </section>
      <section class="global-tab-panel" role="tabpanel" id="global-tab-visitor" aria-labelledby="global-tab-visitor-button" hidden data-school-hidden>
        <div class="global-setting" data-search="display name rename title about"><h3>Page display name</h3><p>Changes the name shown in this page's title and brand only. It never changes package identity, storage location, installer identity, or update feed.</p><div class="global-inline"><label for="global-display-name">Display name</label><input id="global-display-name" maxlength="80" type="text"><button type="button" class="text-button" id="global-display-name-save">Save name</button><button type="button" class="text-button" id="global-display-name-reset">Reset</button></div></div>
        <div class="global-setting" data-search="dim sum startup surprise local visitor cache"><h3>Startup dim sum</h3><p>One in ten later visits may show one locally cached dish name with its sanctioned public catalog photo. There is no off switch. The first visit, School mode, quiet mode, errors, and active work suppress it.</p><p id="global-dimsum-status" role="status"></p></div>
        <div class="global-setting" data-search="updates downloads installer local status"><h3>Updates and downloads</h3><p id="global-update-status">No verified installer or release manifest is published for this static page. No update action is available.</p></div>
        <div class="global-setting" data-search="reset local storage visitor state"><h3>Reset visitor settings</h3><p>Clearing this site's storage resets language, School mode, narrator choices, schedule rules, display name, and visitor cache. It does not touch the installed desktop application.</p><button type="button" class="danger-button" id="global-settings-reset">Reset this page's visitor settings</button></div>
      </section>
      <div id="global-regex-popover" class="global-regex-popover" hidden><h3>Regex builder for page settings</h3><label>Pattern<input id="global-regex-pattern" type="text" maxlength="256"></label><label class="switch-row"><input id="global-regex-i" type="checkbox" checked><span>Ignore case</span></label><label class="switch-row"><input id="global-regex-u" type="checkbox" checked><span>Unicode</span></label><p id="global-regex-feedback" role="status"></p><button type="button" class="primary-button" id="global-regex-apply">Apply to this search</button><button type="button" class="text-button" id="global-regex-cancel">Cancel</button></div>
      <div id="global-confirm-popover" class="global-confirm-popover" role="dialog" aria-modal="false" aria-labelledby="global-confirm-title" hidden><h3 id="global-confirm-title">Confirm this local action</h3><p id="global-confirm-description"></p><label class="switch-row"><input id="global-confirm-key-one" type="checkbox"><span>I understand the exact local effect</span></label><label class="switch-row"><input id="global-confirm-key-two" type="checkbox"><span>I understand the recovery route</span></label><label>Unlock code, when requested<input id="global-confirm-code" type="password" autocomplete="current-password"></label><label>Slide fully to confirm<input id="global-confirm-slider" type="range" min="0" max="100" value="0"></label><div class="global-inline"><button type="button" class="danger-button" id="global-confirm-apply" disabled>Confirm</button><button type="button" class="text-button" id="global-confirm-cancel">Emergency exit</button></div></div>`;
    document.body.append(panel);
    ensureCopyAnchors();
    ensureRegexModeControl();
    bindPanel(button);
  }
  function ensurePaletteMarkup() {
    if (!$('palette-open')) {
      const open = document.createElement('button'); open.type = 'button'; open.id = 'palette-open'; open.className = 'command-button'; open.textContent = 'Search'; open.innerHTML = 'Search <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>'; (document.querySelector('.global-settings-fallback-toolbar') || document.body).prepend(open);
    }
    if (!$('command-palette')) {
      const dialog = document.createElement('dialog'); dialog.id = 'command-palette'; dialog.className = 'overlay-card'; dialog.setAttribute('aria-labelledby', 'global-palette-title'); dialog.innerHTML = '<form method="dialog"><div class="dialog-heading"><h2 id="global-palette-title">Command palette</h2><button class="icon-button" value="cancel" aria-label="Close">×</button></div><div class="search-composite"><label class="sr-only" for="palette-search">Search page settings and destinations</label><input id="palette-search" type="search" aria-label="Search page settings and destinations"><button type="button" class="regex-trigger" data-regex-for="palette-search" aria-label="Build a regular expression for palette search">.*</button></div><div id="palette-results" class="palette-results" role="listbox" aria-label="Page commands"></div></form></dialog>'; document.body.append(dialog);
    }
  }
  function ensureDocumentBase() {
    if (document.documentElement.dataset.base && document.documentElement.dataset.base !== './') return;
    const stylesheet = document.querySelector('link[href$="styles.css"]');
    if (stylesheet) document.documentElement.dataset.base = new URL('.', new URL(stylesheet.href, document.baseURI)).href;
  }
  function bindPanel(openButton) {
    const panel = $('global-settings-panel');
    const close = () => { panel.hidden = true; openButton.setAttribute('aria-expanded', 'false'); openButton.focus(); };
    openButton.onclick = () => { panel.hidden = false; openButton.setAttribute('aria-expanded', 'true'); filterSettings(); $('global-language')?.focus(); refreshVoices(); };
    $('global-settings-close').onclick = close;
    $('global-settings-search').oninput = (event) => { if (regexConfig.enabled) regexConfig.pattern = event.target.value.slice(0, 256); filterSettings(); };
    $('global-regex-open').setAttribute('data-regex-for', 'global-settings-search');
    $('global-regex-open').dataset.globalSettingsOwned = 'true';
    $('global-regex-open').setAttribute('aria-controls', 'global-regex-popover');
    $('global-regex-open').setAttribute('aria-expanded', 'false');
    $('global-regex-open').onclick = () => { $('global-regex-open').setAttribute('aria-expanded', 'true'); regexReturnFocus = $('global-settings-search'); openRegex(); };
    $('global-regex-popover').dataset.anchorFor = 'global-settings-search';
    $('global-regex-cancel').onclick = () => { $('global-regex-popover').hidden = true; $('global-regex-open').setAttribute('aria-expanded', 'false'); regexTargetInput = undefined; regexReturnFocus?.focus(); regexReturnFocus = undefined; };
    $('global-regex-pattern').oninput = previewRegex;
    $('global-regex-i').onchange = previewRegex;
    $('global-regex-u').onchange = previewRegex;
    $('global-regex-apply').onclick = applyRegex;
    all('[role="tab"]').forEach((tab, index, tabs) => {
      tab.tabIndex = index === 0 ? 0 : -1;
      const activate = () => { all('.global-tab-panel').forEach((node) => { node.hidden = node.id !== tab.getAttribute('aria-controls'); }); tabs.forEach((node) => { node.setAttribute('aria-selected', String(node === tab)); node.tabIndex = node === tab ? 0 : -1; }); tab.focus(); };
      tab.onclick = activate;
      tab.onkeydown = (event) => { const current = tabs.indexOf(tab); let next = current; if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % tabs.length; if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current + tabs.length - 1) % tabs.length; if (event.key === 'Home') next = 0; if (event.key === 'End') next = tabs.length - 1; if (next !== current) { event.preventDefault(); tabs[next].click(); } };
    });
    $('global-language').onchange = (event) => { baseSettings.language = event.target.value; state.language = baseSettings.language; save(); applyState(); announce('Language mode changed', '語言模式已更改'); };
    $('global-english-funny').oninput = (event) => { state.englishFunny = Number(event.target.value); save(); applyState(); };
    $('global-cantonese-funny').oninput = (event) => { state.cantoneseFunny = Number(event.target.value); save(); applyState(); };
    $('global-dialog-emoji').onchange = (event) => { state.dialogEmoji = event.target.checked; save(); applyState(); notifyLocalized('Dialog setting saved', '對話框設定已保存', 'The local decoration preference is active.', '本地裝飾偏好已啟用。'); };
    $('global-school-toggle').onchange = (event) => { if (!event.target.checked && state.schoolCredentialDigest) { event.target.checked = true; openConfirmation('unlock', event.target, 'Turn off School mode only after the local unlock code matches. The page will return to the visitor language and optional controls.'); return; } state.schoolMode = event.target.checked; save(); applyState(); };
    $('global-school-name-save').onclick = () => { const value = $('global-school-name').value.trim(); if (value) { state.schoolName = value.slice(0, 48); save(); applyState(); notifyLocalized('Mode name saved', '模式名稱已保存', 'The chosen name is now used on this page.', '呢個名稱會喺此頁使用。'); } };
    $('global-school-code-save').onclick = async () => { const value = $('global-school-code').value; if (value.length < 4) { notifyLocalized('Unlock code not saved', '解鎖碼未保存', 'Use at least four characters, then try again.', '請用至少四個字元再試。'); return; } state.schoolCredentialDigest = await digest(value); $('global-school-code').value = ''; save(); applyState(); notifyLocalized('Unlock code saved', '解鎖碼已保存', 'The code is stored only as a digest in this browser.', '解鎖碼只會喺此瀏覽器保存摘要。'); };
    $('global-school-reset').onclick = (event) => openConfirmation('school-reset', event.currentTarget, 'Clear the renamed School mode, its unlock digest, and its active state. Clearing site storage remains the recovery route.');
    $('global-narrator-enabled').onchange = (event) => { baseSettings.narratorEnabled = event.target.checked; state.narratorEnabled = baseSettings.narratorEnabled; save(); applyState(); if (state.narratorEnabled) announce('Narrator enabled', '旁白已啟用'); };
    $('global-narrator-language').onchange = (event) => { state.narratorLanguage = event.target.value; save(); applyState(); };
    $('global-narrator-english-voice').onchange = (event) => { state.narratorEnglishVoice = event.target.value; save(); };
    $('global-narrator-cantonese-voice').onchange = (event) => { state.narratorCantoneseVoice = event.target.value; save(); };
    $('global-narrator-rate').oninput = (event) => { state.narratorRate = Number(event.target.value); save(); applyState(); };
    $('global-narrator-pitch').oninput = (event) => { state.narratorPitch = Number(event.target.value); save(); applyState(); };
    $('global-narrator-test').onclick = () => announce('This is a local narrator test.', '呢句係本地旁白測試。');
    $('global-schedule-enabled').onchange = (event) => { state.schedule.paused = !event.target.checked; save(); applyState(); };
    $('global-schedule-save').onclick = saveSchedule;
    $('global-schedule-check').onclick = checkSource;
    $('global-display-name-save').onclick = () => { const value = $('global-display-name').value.trim(); if (value) { baseSettings.displayName = value.slice(0, 80); state.displayName = baseSettings.displayName; save(); applyState(); notifyLocalized('Display name saved', '顯示名稱已保存', 'Only this page label changed; installed identity stayed fixed.', '只改變此頁標籤，已安裝身份保持不變。'); } };
    $('global-display-name-reset').onclick = (event) => openConfirmation('display-reset', event.currentTarget, 'Reset the page display name to the shipped name while leaving the application identity unchanged.');
    $('global-settings-reset').onclick = (event) => openConfirmation('full-reset', event.currentTarget, 'Reset this page\'s visitor-local settings, including language, School mode, narrator choices, schedules, display name, and surprise history.');
    $('global-confirm-cancel').onclick = closeConfirmation;
    $('global-confirm-apply').onclick = finishConfirmation;
    $('global-confirm-key-one').onchange = updateConfirmationState;
    $('global-confirm-key-two').onchange = updateConfirmationState;
    $('global-confirm-slider').oninput = updateConfirmationState;
    $('global-confirm-code').oninput = updateConfirmationState;
    $('global-schedule-source').onchange = applyState;
    enhanceDropdowns();
    ensureAllDayControl();
    ensureTimezonePicker();
    enhanceDropdowns();
  }
  function applyState() {
    applyScheduleRules();
    $('global-language') && ($('global-language').value = state.language);
    $('global-english-funny') && ($('global-english-funny').value = String(state.englishFunny));
    $('global-cantonese-funny') && ($('global-cantonese-funny').value = String(state.cantoneseFunny));
    $('global-english-funny-output') && ($('global-english-funny-output').textContent = String(state.englishFunny));
    $('global-cantonese-funny-output') && ($('global-cantonese-funny-output').textContent = String(state.cantoneseFunny));
    $('global-dialog-emoji') && ($('global-dialog-emoji').checked = state.dialogEmoji);
    $('global-school-toggle') && ($('global-school-toggle').checked = state.schoolMode);
    $('global-school-name') && ($('global-school-name').value = state.schoolName);
    $('global-narrator-enabled') && ($('global-narrator-enabled').checked = state.narratorEnabled);
    $('global-narrator-language') && ($('global-narrator-language').value = state.narratorLanguage);
    $('global-narrator-rate') && ($('global-narrator-rate').value = String(state.narratorRate));
    $('global-narrator-pitch') && ($('global-narrator-pitch').value = String(state.narratorPitch));
    $('global-narrator-rate-output') && ($('global-narrator-rate-output').textContent = String(state.narratorRate));
    $('global-narrator-pitch-output') && ($('global-narrator-pitch-output').textContent = String(state.narratorPitch));
    $('global-schedule-enabled') && ($('global-schedule-enabled').checked = state.schedule.rules.length > 0 && !state.schedule.paused);
    if ($('global-schedule-timezone')) { const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local timezone'; if (!state.schedule.invalidTimezones.length || !$('global-schedule-timezone').value) $('global-schedule-timezone').value = localTimezone; $('global-schedule-timezone').readOnly = !state.schedule.invalidTimezones.length; }
    renderScheduleRules();
    if ($('global-schedule-status') && (state.schedule.invalidTimezones.length || state.schedule.invalidRules.length)) setScheduleStatus('Some saved schedule rules were invalid and were paused until corrected or removed.', '部分已保存排程規則無效，已暫停，請修正或者移除。');
    $('global-display-name') && ($('global-display-name').value = state.displayName);
    const updateStatus = $('global-update-status');
    if (updateStatus) updateStatus.textContent = localizedInline('No verified installer or release manifest is published for this static page. No update action is available.', '此靜態頁未有已驗證安裝程式或者發行清單，暫時冇更新操作。');
    const dishStatus = $('global-dimsum-status');
    if (dishStatus) { const cacheReasons = { verified: ['Verified local catalog image cache is active.', '已驗證本地目錄圖片快取已啟用。'], 'cache-purged': ['An invalid dim-sum cache was purged. First use must verify a new image.', '無效點心快取已清除，首次使用必須重新驗證圖片。'], 'cache-oversize': ['The local dim-sum cache exceeded its size bound and was purged.', '本地點心快取超過大小限制，已清除。'], 'first-use-required': ['No verified local image is available yet. First use requires a bounded catalog fetch.', '暫時未有已驗證本地圖片，首次使用需要受限目錄要求。'], 'fetch-failed': ['The catalog image fetch failed safely. The surprise remains unavailable.', '目錄圖片要求安全失敗，小驚喜暫時不可用。'], 'image-oversize': ['A catalog image exceeded its size bound and was skipped.', '目錄圖片超過大小限制，已跳過。'], 'mime-or-magic-mismatch': ['A catalog image MIME or magic-byte check did not match.', '目錄圖片 MIME 或檔案標記檢查不匹配。'], 'digest-mismatch': ['A catalog image digest did not match its recorded value.', '目錄圖片摘要不匹配記錄值。'], 'image-decode-failed': ['A catalog image could not be decoded safely.', '目錄圖片未能安全解碼。'], 'not-loaded': ['The local catalog cache has not loaded yet.', '本地目錄快取尚未載入。'] }; const cacheReason = cacheReasons[state.dimSumCacheReason] || cacheReasons['not-loaded']; const countText = state.dimSumShown ? ` One catalog dish has been shown during a later visit. Total shown on this browser: ${state.dimSumShown}.` : ' No catalog dish has been shown on this browser yet.'; const countZh = state.dimSumShown ? ` 之後訪問已顯示一款目錄點心，此瀏覽器總數：${state.dimSumShown}。` : ' 此瀏覽器暫時未顯示目錄點心。'; setLocalizedText(dishStatus, `${cacheReason[0]}${countText}`, `${cacheReason[1]}${countZh}`, 'en'); }
    applyDisplayName(); applyPanelCopy(); applySchoolMode(); filterSettings(); decorateDialogs();
  }
  function scheduleClock(now, timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(now).reduce((out, part) => { out[part.type] = part.value; return out; }, {});
      return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`, weekday: { Sun: 'su', Mon: 'mo', Tue: 'tu', Wed: 'we', Thu: 'th', Fri: 'fr', Sat: 'sa' }[parts.weekday] };
    } catch { return { date: now.toISOString().slice(0, 10), time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, weekday: ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'][now.getDay()] }; }
  }
  function isValidTimezone(timezone) {
    if (typeof timezone !== 'string' || timezone.length > 80) return false;
    try { return new Intl.DateTimeFormat('en-US', { timeZone: timezone }).resolvedOptions().timeZone === timezone; } catch { return false; }
  }
  function scheduleRuleMatches(rule, now = new Date()) {
    if (!isValidTimezone(rule.timezone)) return false;
    const clock = scheduleClock(now, rule.timezone);
    if (rule.startDate && clock.date < rule.startDate) return false;
    if (rule.endDate && clock.date > rule.endDate) return false;
    const weekday = clock.weekday;
    if (!rule.everyDay && (!Array.isArray(rule.weekdays) || !rule.weekdays.includes(weekday))) return false;
    if (!rule.startTime || !rule.endTime) return true;
    const current = clock.time;
    if (rule.startTime <= rule.endTime) return current >= rule.startTime && current <= rule.endTime;
    return current >= rule.startTime || current <= rule.endTime;
  }
  function applyScheduleRules() {
    const result = effectiveTupleAt(new Date());
    Object.assign(effectiveSettings, result.tuple);
    state.language = result.tuple.language;
    state.narratorEnabled = result.tuple.narratorEnabled;
    state.displayName = result.tuple.displayName;
    document.documentElement.dataset.theme = result.tuple.theme;
    document.documentElement.dataset.density = result.tuple.density;
    state.schedule.lastAppliedRule = result.active?.id || '';
    state.schedule.lastAppliedSignature = effectiveRuleSignature();
    state.schedule.effectiveTuple = result.tuple;
  }
  function effectiveRuleSignature(now = new Date()) {
    const result = effectiveTupleAt(now);
    return JSON.stringify({ tuple: result.tuple, active: result.active?.id || '', invalid: state.schedule.invalidRules, paused: state.schedule.paused });
  }
  function effectiveTupleAt(now = new Date()) {
    const tuple = { ...baseSettings, sourceValidity: state.schedule.invalidRules.length ? 'invalid-rules-present' : 'validated' };
    if (state.schedule.paused) { tuple.sourceValidity = 'paused'; return { tuple, active: undefined }; }
    const active = state.schedule.rules.filter((rule) => !rule.disabled && rule.source === 'local' && scheduleRuleMatches(rule, now)).sort((a, b) => Number(b.precedence) - Number(a.precedence))[0];
    if (active && SCHEDULE_TARGETS.some(([id]) => id === active.target)) tuple[active.target] = active.target === 'narratorEnabled' ? active.value === 'true' : active.value;
    return { tuple, active };
  }
  function applyExternalSetting(body, active) {
    if (!active) return;
    const target = String(body?.target || '');
    if (!SCHEDULE_TARGETS.some(([id]) => id === target) || body.value === undefined || !validateTargetValue(target, body.value)) return;
    effectiveSettings[target] = target === 'narratorEnabled' ? body.value === true || body.value === 'true' : String(body.value).slice(0, 120);
    if (target === 'language') state.language = effectiveSettings.language;
    if (target === 'narratorEnabled') state.narratorEnabled = effectiveSettings.narratorEnabled;
    if (target === 'displayName') state.displayName = effectiveSettings.displayName;
    if (target === 'theme' || target === 'density') document.documentElement.dataset[target] = effectiveSettings[target];
    applyLanguageValue(); applyDisplayName(); applyPanelCopy();
  }
  function validateTargetValue(target, value) {
    if (target === 'language') return ['en', 'zh', 'both'].includes(value);
    if (target === 'theme') return ['light', 'dark', 'contrast'].includes(value);
    if (target === 'density') return ['compact', 'comfortable', 'spacious'].includes(value);
    if (target === 'narratorEnabled') return typeof value === 'boolean' || value === 'true' || value === 'false';
    if (target === 'displayName') return typeof value === 'string' && value.trim().length > 0 && value.length <= 80;
    return false;
  }
  function isValidStoredRule(rule) {
    if (!rule || !rule.id || !SCHEDULE_TARGETS.some(([id]) => id === rule.target) || !validateTargetValue(rule.target, rule.value) || !isValidTimezone(rule.timezone)) return false;
    if (rule.startDate && rule.endDate && rule.endDate < rule.startDate) return false;
    if (!rule.allDay && (!/^\d{2}:\d{2}$/.test(rule.startTime) || !/^\d{2}:\d{2}$/.test(rule.endTime))) return false;
    if (!rule.everyDay && (!Array.isArray(rule.weekdays) || !rule.weekdays.length)) return false;
    if (rule.source !== 'local') { try { validateEndpoint(rule.endpoint, rule.source); } catch { return false; } }
    if (rule.source === 'home-assistant' && !/^\b(?:binary_sensor|input_boolean)\.[a-z0-9_]+$/i.test(rule.entity)) return false;
    return true;
  }
  function ruleValidationReasons(rule) {
    const reasons = [];
    if (!rule || !SCHEDULE_TARGETS.some(([id]) => id === rule.target)) reasons.push('target');
    if (!rule || !validateTargetValue(rule.target, rule.value)) reasons.push('value');
    if (!rule || !isValidTimezone(rule.timezone)) reasons.push('timezone');
    if (rule?.startDate && rule?.endDate && rule.endDate < rule.startDate) reasons.push('date-order');
    if (rule && !rule.allDay && (!/^\d{2}:\d{2}$/.test(rule.startTime) || !/^\d{2}:\d{2}$/.test(rule.endTime))) reasons.push('time');
    if (rule && !rule.everyDay && (!Array.isArray(rule.weekdays) || !rule.weekdays.length)) reasons.push('weekdays');
    if (rule?.source !== 'local') { try { validateEndpoint(rule.endpoint, rule.source); } catch { reasons.push('source'); } }
    if (rule?.source === 'home-assistant' && !/^\b(?:binary_sensor|input_boolean)\.[a-z0-9_]+$/i.test(rule.entity)) reasons.push('entity');
    return reasons;
  }
  const RULE_REASON_COPY = { target: ['target setting', '目標設定'], value: ['target value', '目標數值'], timezone: ['timezone', '時區'], 'date-order': ['date order', '日期次序'], time: ['time window', '時間範圍'], weekdays: ['weekday selection', '星期選擇'], source: ['source endpoint', '來源端點'], entity: ['Home Assistant entity', 'Home Assistant 實體'] };
  function ruleReasonsText(rule) { const ids = rule.validationReasons || []; const en = ids.map((id) => RULE_REASON_COPY[id]?.[0] || id).join(', '); const zh = ids.map((id) => RULE_REASON_COPY[id]?.[1] || id).join('、'); return { en, zh }; }
  function renderScheduleRules() {
    const node = $('global-schedule-rules');
    if (!node) return;
    node.innerHTML = state.schedule.rules.length ? state.schedule.rules.map((rule) => { const reasons = ruleReasonsText(rule); const reasonText = rule.disabled && rule.validationReasons?.length ? localizedInline(`Reasons: ${reasons.en}`, `原因：${reasons.zh}`) : ''; return `<div class="global-schedule-rule" data-disabled-rule="${rule.disabled ? 'true' : 'false'}"><strong>${escapeHtml(rule.target)} = ${escapeHtml(rule.value)}${rule.disabled ? ` (${escapeHtml(localizedInline('disabled', '已停用'))})` : ''}</strong><span>${escapeHtml(rule.startDate || localizedInline('any date', '任何日期'))} ${escapeHtml(rule.allDay ? localizedInline('all day', '全日') : `${rule.startTime || localizedInline('any time', '任何時間')} to ${rule.endTime || localizedInline('any time', '任何時間')}`)} · ${escapeHtml(rule.everyDay ? localizedInline('every day', '每日') : (rule.weekdays || []).join(', ') || localizedInline('no weekdays', '未選星期'))} · ${escapeHtml(rule.timezone || localizedInline('local timezone', '本地時區'))} · precedence ${escapeHtml(rule.precedence)}${reasonText ? ` · ${escapeHtml(reasonText)}` : ''}</span><button type="button" class="text-button" data-edit-schedule="${escapeHtml(rule.id)}">${escapeHtml(localizedInline('Edit', '編輯'))}</button><button type="button" class="text-button" data-remove-schedule="${escapeHtml(rule.id)}">${escapeHtml(localizedInline('Remove', '移除'))}</button></div>` }).join('') : `<p>${escapeHtml(localizedInline('No schedule rules saved.', '未保存排程規則。'))}</p>`;
    all('[data-edit-schedule]').forEach((button) => { button.onclick = () => { const rule = state.schedule.rules.find((candidate) => candidate.id === button.dataset.editSchedule); if (!rule) return; $('global-schedule-target').value = rule.target; $('global-schedule-value').value = rule.value; $('global-schedule-start-date').value = rule.startDate; $('global-schedule-end-date').value = rule.endDate; $('global-schedule-start-time').value = rule.startTime; $('global-schedule-end-time').value = rule.endTime; $('global-schedule-all-day').checked = rule.allDay; $('global-schedule-every-day').checked = rule.everyDay; $('global-schedule-timezone').value = rule.timezone; $('global-schedule-precedence').value = rule.precedence; $('global-schedule-source').value = rule.source; $('global-schedule-endpoint').value = rule.endpoint; $('global-schedule-entity').value = rule.entity; $('global-schedule-status').textContent = 'Editing the selected rule. Save it as a new validated rule, then remove the old record if needed.'; $('global-schedule-value').focus(); }; });
    all('[data-remove-schedule]').forEach((button) => { button.onclick = () => openConfirmation('schedule-remove', button, 'Remove this schedule rule from the local rule list. The active base setting will remain available.', button.dataset.removeSchedule); });
  }
  function validateEndpoint(endpoint, source) {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' && !(url.hostname === 'localhost' || url.hostname === '127.0.0.1')) throw new Error('Only HTTPS or loopback development URLs are accepted.');
    if (url.username || url.password || url.search || url.hash) throw new Error('Credentials, query strings, and fragments are not accepted in source URLs.');
    if (!url.hostname || url.hostname.length > 253 || /[^a-z0-9.:-]/i.test(url.hostname)) throw new Error('The source host is not valid.');
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    const privateHost = host === 'localhost' || host === '::1' || host === '127.0.0.1' || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^169\.254\./.test(host) || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:');
    if (source === 'https' && privateHost) throw new Error('Production HTTPS sources may not use loopback, link-local, or private-address hosts.');
    if (source === 'https' && !APPROVED_EXTERNAL_HOSTS.has(host)) throw new Error(`HTTPS source host is not on the approved host allowlist: ${[...APPROVED_EXTERNAL_HOSTS].join(', ')}.`);
    if (source === 'home-assistant' && !privateHost && url.protocol !== 'https:') throw new Error('Home Assistant requires HTTPS, loopback, or an explicitly local private host.');
    if (source === 'home-assistant' && !privateHost && !APPROVED_HOME_ASSISTANT_HOSTS.has(host)) throw new Error(`Home Assistant host is not approved: ${[...APPROVED_HOME_ASSISTANT_HOSTS].join(', ')} or an explicitly local private host.`);
    return url;
  }
  function validateExternalPayload(value, depth = 0, fields = 0) {
    if (depth > MAX_ENDPOINT_DEPTH) throw new Error('The source response is nested too deeply.');
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return;
    if (Array.isArray(value)) { if (value.length > MAX_ENDPOINT_FIELDS) throw new Error('The source response has too many items.'); value.forEach((item) => validateExternalPayload(item, depth + 1, fields)); return; }
    if (typeof value !== 'object') throw new Error('The source response contains an unsupported value.');
    const keys = Object.keys(value); if (keys.length > MAX_ENDPOINT_FIELDS) throw new Error('The source response has too many fields.');
    keys.forEach((key) => { if (!['target', 'value', 'enabled', 'state', 'entity_id'].includes(key)) throw new Error(`Unsupported source field: ${key}`); validateExternalPayload(value[key], depth + 1, fields + 1); });
  }
  function validateHomeAssistantProxy(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Home Assistant response must be one object.');
    const keys = Object.keys(value).sort();
    if (!keys.every((key) => ['state', 'target', 'value'].includes(key)) || !keys.includes('state') || keys.length > 3) throw new Error('Home Assistant reduced proxy response must contain only state, target, and value.');
    if (value.state !== 'on' && value.state !== 'off') throw new Error('Home Assistant reduced proxy state must be on or off.');
    if (value.state === 'on' && (typeof value.target !== 'string' || typeof value.value !== 'string')) throw new Error('An on Home Assistant response must include a target and value.');
    return value;
  }
  async function readBoundedJson(response) {
    if (!response.body) throw new Error('The source response had no body.');
    const reader = response.body.getReader(); const chunks = []; let total = 0;
    while (true) { const part = await withDeadline(reader.read()); if (part.done) break; total += part.value.byteLength; if (total > MAX_ENDPOINT_BYTES) { await reader.cancel(); throw new Error('The source response exceeded the 64 KiB bound.'); } chunks.push(part.value); }
    const bytes = new Uint8Array(total); let offset = 0; chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; });
    const value = parseUniqueJson(new TextDecoder().decode(bytes)); validateExternalPayload(value); return value;
  }
  function setScheduleStatus(en, zh) { setLocalizedText($('global-schedule-status'), en, zh, 'en'); }
  function saveSchedule() {
    const source = $('global-schedule-source').value;
    const endpoint = $('global-schedule-endpoint').value.trim();
    if (source !== 'local') { try { validateEndpoint(endpoint, source); } catch (error) { setScheduleStatus(`Schedule not saved: ${error.message}`, `排程未保存：${error.message}`); return; } }
    const startDate = $('global-schedule-start-date').value; const endDate = $('global-schedule-end-date').value; const startTime = $('global-schedule-start-time').value; const endTime = $('global-schedule-end-time').value; const timezone = $('global-schedule-timezone').value;
    if (!isValidTimezone(timezone)) { setScheduleStatus('Schedule not saved: choose a valid IANA timezone.', '排程未保存：請選擇有效 IANA 時區。'); return; }
    if (startDate && endDate && endDate < startDate) { setScheduleStatus('Schedule not saved: the end date must not precede the start date.', '排程未保存：結束日期不可早過開始日期。'); return; }
    const allDay = $('global-schedule-all-day')?.checked === true;
    if (!allDay && (!startTime || !endTime)) { setScheduleStatus('Schedule not saved: choose both a start and end time, or use a local all-day rule.', '排程未保存：請選擇開始及結束時間，或者使用本地全日規則。'); return; }
    const rule = { id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, target: $('global-schedule-target').value, value: $('global-schedule-value').value.slice(0, 120), startDate, endDate, startTime: allDay ? '' : startTime, endTime: allDay ? '' : endTime, allDay, weekdays: all('[data-global-weekday]:checked').map((node) => node.dataset.globalWeekday), everyDay: $('global-schedule-every-day').checked, timezone, precedence: Math.min(100, Math.max(0, Number($('global-schedule-precedence').value) || 0)), source, endpoint, entity: $('global-schedule-entity').value.trim().slice(0, 128), disabled: false };
    if (!rule.value) { setScheduleStatus('Schedule not saved: choose a target value.', '排程未保存：請選擇目標值。'); return; }
    if (!validateTargetValue(rule.target, rule.value)) { setScheduleStatus('Schedule not saved: the value does not match the selected target setting.', '排程未保存：數值不符合所選目標設定。'); return; }
    if (!rule.everyDay && !rule.weekdays.length) { setScheduleStatus('Schedule not saved: choose weekdays or Every day.', '排程未保存：請選擇星期或者每日。'); return; }
    if (source === 'home-assistant' && !/^\b(?:binary_sensor|input_boolean)\.[a-z0-9_]+$/i.test(rule.entity)) { setScheduleStatus('Schedule not saved: use a boolean Home Assistant entity such as input_boolean.example.', '排程未保存：請使用布林 Home Assistant 實體，例如 input_boolean.example。'); return; }
    state.schedule.rules = [...state.schedule.rules, rule].slice(-MAX_RULES); state.schedule.lastAppliedRule = ''; state.schedule.lastAppliedSignature = ''; save(); applyState(); setScheduleStatus('Versioned schedule rule saved locally. It applies by precedence when its date, time, weekday, and timezone window matches.', '版本化排程規則已保存喺本地，日期、時間、星期同時區符合時會按優先次序套用。'); notifyLocalized('Schedule saved', '排程已保存', 'The local rule is ready.', '本地規則準備好喇。');
  }
  async function checkSource() {
    const source = $('global-schedule-source').value;
    if (source === 'local') { setScheduleStatus('Local source selected, so no network request is needed.', '已選擇本地來源，所以唔需要網絡要求。'); return; }
    const endpoint = $('global-schedule-endpoint').value.trim();
    let timer;
    try { const url = validateEndpoint(endpoint, source); const controller = new AbortController(); timer = setTimeout(() => controller.abort(), 5000); const response = await fetch(url.href, { credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const body = await readBoundedJson(response); if (source === 'home-assistant') { const proxy = validateHomeAssistantProxy(body); if (proxy.state === 'on') applyExternalSetting(proxy, true); else { applyScheduleRules(); applyState(); } if (proxy.state === 'on') setScheduleStatus('The Home Assistant reduced proxy is on. Its validated target and value were applied only to the effective local layer.', 'Home Assistant 縮減代理已開啟，已驗證目標值只套用到有效本地層。'); else setScheduleStatus('The Home Assistant reduced proxy is off. The local base setting remains active.', 'Home Assistant 縮減代理已關閉，本地底層設定保持有效。'); } else { applyExternalSetting(body, body.enabled !== false); if (body.enabled === false) { applyScheduleRules(); applyState(); } setScheduleStatus('Source checked explicitly. The bounded response was read locally and was not stored as a permanent setting.', '來源已明確檢查，受限回應只喺本地讀取，冇保存成永久設定。'); } } catch (error) { setScheduleStatus(`Source check failed safely: ${error.message}. The last local value remains active.`, `來源安全檢查失敗：${error.message}。最後有效本地值保持不變。`); } finally { if (timer) clearTimeout(timer); }
  }
  function showDimSum() {
    if (!canShowDimSum() || !dishCatalogUsable()) return;
    const dish = DISHES[Math.floor(Math.random() * DISHES.length)];
    const { en, zh } = dish;
    state.dimSumShown += 1; save(); applyState();
    const region = $('toast-region') || document.body;
    const toast = document.createElement('div'); toast.className = 'global-dimsum-toast'; toast.setAttribute('role', 'status'); toast.innerHTML = `<img class="global-dimsum-image" src="${escapeHtml(dish.dataUrl)}" alt="${escapeHtml(`${en} · ${zh}`)}" width="96" height="72"><div><strong>${escapeHtml(copy(en, zh, 'en'))}</strong><span>${escapeHtml(copy('A local ten-percent visitor surprise.', '本地十個百分比訪客小驚喜。', 'en'))}</span><small>Catalog ${escapeHtml(dish.catalogRevision)} · release ${escapeHtml(dish.releaseTag)} · asset ${escapeHtml(dish.id)} · SHA-256 ${escapeHtml(dish.sha256)}</small></div>`; region.append(toast); setTimeout(() => toast.remove(), 7000);
  }
  function dishCatalogUsable() { return DISHES.some((dish) => typeof dish.dataUrl === 'string' && dish.dataUrl.startsWith('data:image/')); }
  function canShowDimSum() {
    return !state.schoolMode && !document.hidden && !state.quietHours && !state.reducedSound && !document.body.classList.contains('low-stimulation') && document.body.dataset.errorPath !== 'true' && document.body.dataset.updateFlow !== 'true' && document.body.dataset.activeTask !== 'true' && document.body.dataset.screenReaderActive !== 'true';
  }
  function maybeDimSum() {
    if (dimSumDrawnThisLaunch) return;
    dimSumDrawnThisLaunch = true;
    if (state.visited) { dimSumReady.then(() => { if (canShowDimSum() && Math.random() < 0.1) setTimeout(showDimSum, 700); }); return; }
    state.visited = true; save();
  }
  function refreshScheduledState() {
    const before = `${effectiveSettings.language}|${effectiveSettings.theme}|${effectiveSettings.density}|${effectiveSettings.narratorEnabled}|${effectiveSettings.displayName}`;
    applyScheduleRules();
    const after = `${effectiveSettings.language}|${effectiveSettings.theme}|${effectiveSettings.density}|${effectiveSettings.narratorEnabled}|${effectiveSettings.displayName}`;
    if (before !== after) applyState();
    scheduleNextBoundary();
  }
  function scheduleNextBoundary() {
    if (scheduleBoundaryTimer) clearTimeout(scheduleBoundaryTimer);
    const now = new Date();
    let previous = effectiveRuleSignature(now);
    let next = new Date(now.getTime() + 60 * 1000);
    for (let minute = 1; minute <= 10080; minute += 1) { const candidate = new Date(now.getTime() + minute * 60000); const signature = effectiveRuleSignature(candidate); if (signature !== previous) { next = candidate; break; } previous = signature; }
    scheduleBoundaryTimer = setTimeout(refreshScheduledState, Math.max(100, next.getTime() - Date.now() + 25));
  }
  function init() {
    if (window.__dingPbxGlobalSettingsInitialized) return;
    window.__dingPbxGlobalSettingsInitialized = true;
    ensureDocumentBase();
    renderPanel();
    document.body.dataset.dimSumCache = `${DIM_SUM_CACHE.file};schema=${DIM_SUM_CACHE.schemaVersion};release=${DIM_SUM_CACHE.releaseNamespace}`;
    const dialogObserver = new MutationObserver(() => decorateDialogs());
    dialogObserver.observe(document.body, { childList: true, subtree: true });
    const paletteObserver = new MutationObserver(() => augmentPalette());
    if ($('palette-results')) paletteObserver.observe($('palette-results'), { childList: true });
    augmentPalette();
    if (speechSynthesisAvailable()) { voiceListener = () => { refreshVoices(); }; speechSynthesis.addEventListener('voiceschanged', voiceListener); refreshVoices(); }
    pageEventListener = (event) => { const detail = event.detail; if (detail?.eventId && detail?.enTitle && detail?.zhTitle && detail?.enBody && detail?.zhBody) { const source = { enTitle: String(detail.enTitle).slice(0, 256), zhTitle: String(detail.zhTitle).slice(0, 256), enBody: String(detail.enBody).slice(0, 1024), zhBody: String(detail.zhBody).slice(0, 1024) }; state.notifications = [...state.notifications.filter((item) => item.id !== detail.eventId), { id: String(detail.eventId).slice(0, 128), time: Date.now(), source }].slice(-100); save(); window.dispatchEvent(new CustomEvent('ding-global-notification', { detail: { eventId: String(detail.eventId).slice(0, 128), source } })); window.dispatchEvent(new CustomEvent('ding-notification-history-change')); announce(`${source.enTitle}. ${source.enBody}`, `${source.zhTitle}。${source.zhBody}`, String(detail.category || 'page-event')); } };
    window.addEventListener('ding-page-event', pageEventListener);
    pageStateListener = (event) => { if (!event.detail) return; if (['en', 'zh', 'both'].includes(event.detail.language)) { state.language = event.detail.language; baseSettings.language = state.language; } if (Number.isFinite(event.detail.englishFunny)) state.englishFunny = Math.min(5, Math.max(1, Number(event.detail.englishFunny))); if (Number.isFinite(event.detail.cantoneseFunny)) state.cantoneseFunny = Math.min(5, Math.max(1, Number(event.detail.cantoneseFunny))); if (['light', 'dark', 'contrast'].includes(event.detail.theme)) { baseSettings.theme = event.detail.theme; state.theme = event.detail.theme; } if (['compact', 'comfortable', 'spacious'].includes(event.detail.density)) { baseSettings.density = event.detail.density; state.density = event.detail.density; } save(); applyState(); };
    window.addEventListener('ding-page-state-change', pageStateListener);
    save();
    applyState();
    dimSumReady = loadDimSumCatalog().then((result) => { save(); applyState(); return result; });
    maybeDimSum();
    scheduleTimer = window.setInterval(refreshScheduledState, 30000);
    scheduleNextBoundary();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshScheduledState(); });
    window.addEventListener('beforeunload', () => { if (voiceListener && speechSynthesisAvailable()) speechSynthesis.removeEventListener('voiceschanged', voiceListener); if (pageEventListener) window.removeEventListener('ding-page-event', pageEventListener); if (pageStateListener) window.removeEventListener('ding-page-state-change', pageStateListener); dialogObserver.disconnect(); paletteObserver.disconnect(); if (scheduleTimer) clearInterval(scheduleTimer); if (scheduleBoundaryTimer) clearTimeout(scheduleBoundaryTimer); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
