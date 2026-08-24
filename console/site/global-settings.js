(() => {
  'use strict';

  /*
   * Page-local equivalents for settings that belong to every published page.
   * This module has no network imports and uses one bounded localStorage record
   * per visitor. It deliberately does not share the desktop application's
   * identity, credential store, or update feed.
   */
  const STORAGE_KEY = 'ding-pbx-site-global-settings-v1';
  const SETTINGS_SCHEMA_VERSION = 2;
  const MAX_RULES = 32;
  const MAX_ENDPOINT_BYTES = 65536;
  const MAX_ENDPOINT_DEPTH = 4;
  const MAX_ENDPOINT_FIELDS = 24;
  const NARRATION_COOLDOWN_MS = 2500;
  const NARRATION_DEBOUNCE_MS = 250;
  const SCHOOL_SUPPRESSION_INVENTORY = [
    '#language-mode', '#english-funny', '#cantonese-funny', '#vocabulary-file', '#vocabulary-clear',
    '#vocabulary-status', '#settings-search', '#documentation-filters-panel', '#settings-filters-panel',
    '#feature-search', '#notification-search', '#palette-search', '.global-dimsum-toast',
    '#global-tab-voice', '#global-tab-visitor'
  ];
  const DISPLAY_NAME_CONSUMER_INVENTORY = ['document.title', '.brand strong', '[data-display-name]', 'body[data-display-name]'];
  const SCHEDULE_TARGETS = [
    ['language', 'Language mode'], ['theme', 'Theme'], ['density', 'Density'],
    ['narratorEnabled', 'Narrator enabled'], ['displayName', 'Display name']
  ];
  const DEFAULTS = {
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
    schedule: { schemaVersion: 1, rules: [], lastAppliedRule: '' },
    displayName: 'Ding PBX Console',
    visited: false,
    dimSumShown: 0,
    updateCheckedAt: 0,
    quietHours: false,
    reducedSound: false,
    screenReaderActive: false
  };
  const DISHES = [
    ['Shrimp dumpling', '蝦餃'],
    ['Barbecue pork bun', '叉燒包'],
    ['Steamed rice noodle roll', '腸粉'],
    ['Egg custard tart', '蛋撻'],
    ['Turnip cake', '蘿蔔糕']
  ];
  const WEEKDAYS = [['mo', 'Monday'], ['tu', 'Tuesday'], ['we', 'Wednesday'], ['th', 'Thursday'], ['fr', 'Friday'], ['sa', 'Saturday'], ['su', 'Sunday']];
  const $ = (id) => document.getElementById(id);
  const all = (selector) => [...document.querySelectorAll(selector)];
  const copy = (en, zh, tone) => {
    const funny = tone === 'zh' ? state.cantoneseFunny : state.englishFunny;
    const suffix = funny >= 5 ? (tone === 'zh' ? '，輕輕鬆鬆搞掂。' : ' Easy enough to keep the browser smiling.') : funny >= 3 ? (tone === 'zh' ? '，唔使緊張。' : ' No drama required.') : '';
    if (state.language === 'zh') return `${zh}${suffix}`;
    if (state.language === 'both') return `${en}${suffix} / ${zh}`;
    return `${en}${suffix}`;
  };
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const oldSchedule = saved.schedule || {};
      const rules = Array.isArray(oldSchedule.rules) ? oldSchedule.rules : (oldSchedule.enabled ? [{
        id: `migrated-${Date.now()}`, target: 'language', value: saved.language || 'en', startDate: '', endDate: '', startTime: oldSchedule.start || '', endTime: oldSchedule.end || '', weekdays: oldSchedule.weekdays || [], everyDay: false, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, precedence: 0, source: oldSchedule.source || 'local', endpoint: oldSchedule.endpoint || '', entity: ''
      }] : []);
      return {
        ...DEFAULTS,
        ...saved,
        schemaVersion: SETTINGS_SCHEMA_VERSION,
        schedule: { schemaVersion: 1, rules: rules.slice(0, MAX_RULES), lastAppliedRule: oldSchedule.lastAppliedRule || '' },
        englishFunny: Number.isInteger(saved.englishFunny) ? Math.min(5, Math.max(1, saved.englishFunny)) : DEFAULTS.englishFunny,
        cantoneseFunny: Number.isInteger(saved.cantoneseFunny) ? Math.min(5, Math.max(1, saved.cantoneseFunny)) : DEFAULTS.cantoneseFunny,
        narratorLanguage: ['en', 'zh', 'both'].includes(saved.narratorLanguage) ? saved.narratorLanguage : 'en'
      };
    } catch {
      return { ...DEFAULTS, schedule: { ...DEFAULTS.schedule } };
    }
  }
  function sanitizeState(raw) {
    const safe = { ...DEFAULTS };
    ['language', 'schoolName', 'schoolCredentialDigest', 'narratorLanguage', 'narratorEnglishVoice', 'narratorCantoneseVoice', 'displayName'].forEach((key) => { if (typeof raw[key] === 'string') safe[key] = raw[key].slice(0, key === 'schoolName' ? 48 : 256); });
    if (!['en', 'zh', 'both'].includes(safe.language)) safe.language = 'en';
    ['dialogEmoji', 'schoolMode', 'narratorEnabled', 'visited', 'quietHours', 'reducedSound', 'screenReaderActive'].forEach((key) => { if (typeof raw[key] === 'boolean') safe[key] = raw[key]; });
    ['englishFunny', 'cantoneseFunny'].forEach((key) => { safe[key] = Math.min(5, Math.max(1, Number(raw[key]) || 5)); });
    safe.narratorRate = Math.min(2, Math.max(0.5, Number(raw.narratorRate) || 1));
    safe.narratorPitch = Math.min(2, Math.max(0, Number(raw.narratorPitch) || 1));
    safe.dimSumShown = Math.min(100000, Math.max(0, Number(raw.dimSumShown) || 0));
    safe.updateCheckedAt = Math.max(0, Number(raw.updateCheckedAt) || 0);
    const schedule = raw.schedule || {};
    safe.schedule = { schemaVersion: 1, lastAppliedRule: typeof schedule.lastAppliedRule === 'string' ? schedule.lastAppliedRule.slice(0, 128) : '', rules: Array.isArray(schedule.rules) ? schedule.rules.slice(0, MAX_RULES).map((rule) => ({ ...rule, id: String(rule.id || '').slice(0, 128), target: String(rule.target || '').slice(0, 64), value: String(rule.value || '').slice(0, 120), startDate: String(rule.startDate || '').slice(0, 10), endDate: String(rule.endDate || '').slice(0, 10), startTime: String(rule.startTime || '').slice(0, 5), endTime: String(rule.endTime || '').slice(0, 5), weekdays: Array.isArray(rule.weekdays) ? rule.weekdays.filter((day) => WEEKDAYS.some(([id]) => id === day)).slice(0, 7) : [], everyDay: rule.everyDay === true, timezone: String(rule.timezone || '').slice(0, 80), precedence: Math.min(100, Math.max(0, Number(rule.precedence) || 0)), source: ['local', 'https', 'home-assistant'].includes(rule.source) ? rule.source : 'local', endpoint: String(rule.endpoint || '').slice(0, 512), entity: String(rule.entity || '').slice(0, 128) })) : [] };
    safe.schemaVersion = SETTINGS_SCHEMA_VERSION;
    return safe;
  }
  const state = sanitizeState(load());
  const voices = { en: [], zh: [] };
  let voiceListener;
  let narrationCurrent = false;
  let narrationQueue = [];
  let regexConfig = { pattern: '', flags: 'iu', enabled: false };
  let regexReturnFocus;
  let regexTargetInput;
  const dropdownRegex = new Map();
  const narrationLastByCategory = new Map();
  const narrationTimers = new Map();
  let confirmReturnFocus;
  let confirmAction;

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
    'global-visitor-title': ['Visitor and updates', '訪客同更新'],
    'global-display-title': ['Page display name', '頁面顯示名稱'],
    'global-dimsum-title': ['Startup dim sum', '啟動點心'],
    'global-update-title': ['Updates and downloads', '更新同下載'],
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

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  function applyPanelCopy() {
    Object.entries(PANEL_COPY).forEach(([id, [en, zh]]) => {
      const node = $(id);
      if (node) node.textContent = copy(en, zh, state.language === 'zh' ? 'zh' : 'en');
    });
    all('[data-global-copy-en]').forEach((node) => {
      const en = node.dataset.globalCopyEn || node.textContent;
      const zh = node.dataset.globalCopyZh || en;
      node.textContent = copy(en, zh, state.language === 'zh' ? 'zh' : 'en');
    });
    all('#global-settings-panel .global-setting').forEach((row) => {
      const key = Object.keys(ROW_COPY).find((candidate) => (row.dataset.search || '').includes(candidate));
      const heading = row.querySelector('h3');
      if (key && heading) heading.textContent = copy(...ROW_COPY[key], state.language === 'zh' ? 'zh' : 'en');
    });
    const status = $('global-narrator-voice-status');
    if (status && !voices.en.length && !voices.zh.length) status.textContent = copy('No compatible installed browser voice is available yet.', '暫時未搵到可以用嘅瀏覽器聲音。', 'en');
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
  function notify(title, body) {
    const region = $('toast-region') || (() => { const node = document.createElement('div'); node.id = 'toast-region'; node.className = 'toast-region'; node.setAttribute('aria-live', 'polite'); document.body.append(node); return node; })();
    const toast = document.createElement('div');
    toast.className = 'toast global-toast';
    toast.innerHTML = `<strong>${state.dialogEmoji ? '<span aria-hidden="true">◈</span> ' : ''}${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span>`;
    region.append(toast);
    window.setTimeout(() => toast.remove(), 6000);
  }
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
      const tonedEnglish = copy(en, zh, 'en');
      const tonedCantonese = copy(en, zh, 'zh');
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
    const label = $('global-school-label');
    if (label) label.textContent = state.schoolName;
    const note = $('global-school-note');
    if (note) note.textContent = state.schoolMode ? `${state.schoolName} is active. The page stays in English and optional playful controls are suppressed. Turn it off with the local credential, or clear this site's storage to reset it.` : `${state.schoolName} is a local interface preference, not a security boundary. Clearing this site's storage resets it.`;
  }
  function applyLanguageValue() {
    document.documentElement.lang = state.schoolMode ? 'en' : (state.language === 'zh' ? 'zh-Hant' : 'en');
    if ($('global-language')) $('global-language').value = state.language;
  }
  function settingRows() { return all('#global-settings-panel .global-setting'); }
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
    settingRows().forEach((row) => { const visible = searchMatches(row.textContent); row.hidden = !visible; if (visible) count += 1; });
    const status = $('global-settings-search-status');
    if (status) status.textContent = `${count} setting${count === 1 ? '' : 's'} shown.`;
  }
  function openRegex() {
    const popover = $('global-regex-popover');
    if (!popover) return;
    popover.hidden = false;
    $('global-regex-pattern').value = regexConfig.pattern;
    $('global-regex-i').checked = regexConfig.flags.includes('i');
    $('global-regex-u').checked = regexConfig.flags.includes('u');
    $('global-regex-pattern').focus();
    previewRegex();
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
    try { new RegExp(pattern, flags); } catch { return; }
    if (regexTargetInput) {
      dropdownRegex.set(regexTargetInput, { pattern, flags, enabled: Boolean(pattern) });
      regexTargetInput.value = pattern;
      regexTargetInput.dispatchEvent(new Event('input'));
    } else {
      regexConfig = { pattern, flags, enabled: Boolean(pattern) };
      if ($('global-settings-search')) $('global-settings-search').value = pattern;
    }
    $('global-regex-popover').hidden = true;
    filterSettings();
    regexReturnFocus?.focus(); regexReturnFocus = undefined; regexTargetInput = undefined;
  }
  function openRegexForInput(input) {
    regexTargetInput = input;
    regexReturnFocus = input;
    const saved = dropdownRegex.get(input) || { pattern: '', flags: 'iu', enabled: false };
    regexConfig = saved;
    openRegex();
  }
  function enhanceDropdowns() {
    all('select').forEach((select) => {
      if (select.dataset.dropdownEnhanced) return;
      select.dataset.dropdownEnhanced = 'true';
      const wrapper = document.createElement('div'); wrapper.className = 'global-dropdown-tools';
      const input = document.createElement('input'); input.type = 'search'; input.className = 'global-dropdown-search'; input.placeholder = 'Filter choices'; input.setAttribute('aria-label', `Filter ${select.getAttribute('aria-label') || select.previousElementSibling?.textContent || 'choices'}`);
      const regex = document.createElement('button'); regex.type = 'button'; regex.className = 'regex-trigger'; regex.textContent = '.*'; regex.setAttribute('aria-label', `Build a regular expression for ${input.getAttribute('aria-label')}`); regex.dataset.globalDropdownRegex = 'true';
      wrapper.append(input, regex); select.parentNode.insertBefore(wrapper, select);
      const filter = () => { const config = dropdownRegex.get(input); [...select.options].forEach((option) => { const text = option.textContent || ''; let visible = !input.value; if (input.value && config?.enabled) { try { visible = new RegExp(config.pattern, config.flags).test(text); } catch { visible = false; } } else if (input.value) visible = text.toLocaleLowerCase().includes(input.value.toLocaleLowerCase()); option.hidden = !visible; }); };
      input.addEventListener('input', filter); regex.onclick = () => openRegexForInput(input);
    });
  }
  function decorateDialogs() {
    all('dialog .dialog-heading').forEach((heading) => {
      const existing = heading.querySelector('.global-dialog-emoji');
      if (state.dialogEmoji && !existing) { const icon = document.createElement('span'); icon.className = 'global-dialog-emoji'; icon.textContent = '◈'; icon.setAttribute('aria-hidden', 'true'); heading.prepend(icon); }
      if (!state.dialogEmoji && existing) existing.remove();
    });
  }
  function openConfirmation(action, returnNode, description) {
    confirmAction = action;
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
    } else if (confirmAction === 'full-reset') {
      localStorage.removeItem(STORAGE_KEY); window.location.reload(); return;
    }
    save(); applyState(); notify(copy('Local action completed', '本地操作完成', 'en'), copy('The page returned to its truthful local state.', '頁面已返回真實嘅本地狀態。', 'en')); closeConfirmation();
  }
  function renderPanel() {
    if ($('global-settings-panel')) return;
    const topActions = document.querySelector('.top-actions') || document.querySelector('.topbar');
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
        <div class="global-setting" data-search="dim sum startup surprise local visitor cache"><h3>Startup dim sum</h3><p>One in ten later visits may show one locally bundled dish name and a local plate illustration. There is no off switch. The first visit, School mode, quiet mode, errors, and active work suppress it.</p><p id="global-dimsum-status" role="status"></p></div>
        <div class="global-setting" data-search="updates downloads installer local status"><h3>Updates and downloads</h3><p id="global-update-status">No verified installer is published for this static page. Nothing is downloaded automatically.</p><button type="button" class="text-button" id="global-update-refresh">Refresh local status</button></div>
        <div class="global-setting" data-search="reset local storage visitor state"><h3>Reset visitor settings</h3><p>Clearing this site's storage resets language, School mode, narrator choices, schedule rules, display name, and visitor cache. It does not touch the installed desktop application.</p><button type="button" class="danger-button" id="global-settings-reset">Reset this page's visitor settings</button></div>
      </section>
      <div id="global-regex-popover" class="global-regex-popover" hidden><h3>Regex builder for page settings</h3><label>Pattern<input id="global-regex-pattern" type="text" maxlength="256"></label><label class="switch-row"><input id="global-regex-i" type="checkbox" checked><span>Ignore case</span></label><label class="switch-row"><input id="global-regex-u" type="checkbox" checked><span>Unicode</span></label><p id="global-regex-feedback" role="status"></p><button type="button" class="primary-button" id="global-regex-apply">Apply to this search</button><button type="button" class="text-button" id="global-regex-cancel">Cancel</button></div>
      <div id="global-confirm-popover" class="global-confirm-popover" role="dialog" aria-modal="false" aria-labelledby="global-confirm-title" hidden><h3 id="global-confirm-title">Confirm this local action</h3><p id="global-confirm-description"></p><label class="switch-row"><input id="global-confirm-key-one" type="checkbox"><span>I understand the exact local effect</span></label><label class="switch-row"><input id="global-confirm-key-two" type="checkbox"><span>I understand the recovery route</span></label><label>Unlock code, when requested<input id="global-confirm-code" type="password" autocomplete="current-password"></label><label>Slide fully to confirm<input id="global-confirm-slider" type="range" min="0" max="100" value="0"></label><div class="global-inline"><button type="button" class="danger-button" id="global-confirm-apply" disabled>Confirm</button><button type="button" class="text-button" id="global-confirm-cancel">Emergency exit</button></div></div>`;
    document.body.append(panel);
    bindPanel(button);
  }
  function bindPanel(openButton) {
    const panel = $('global-settings-panel');
    const close = () => { panel.hidden = true; openButton.setAttribute('aria-expanded', 'false'); openButton.focus(); };
    openButton.onclick = () => { panel.hidden = false; openButton.setAttribute('aria-expanded', 'true'); filterSettings(); $('global-language')?.focus(); refreshVoices(); };
    $('global-settings-close').onclick = close;
    $('global-settings-search').oninput = (event) => { if (regexConfig.enabled) regexConfig.pattern = event.target.value.slice(0, 256); filterSettings(); };
    $('global-regex-open').onclick = openRegex;
    $('global-regex-cancel').onclick = () => { $('global-regex-popover').hidden = true; regexTargetInput = undefined; regexReturnFocus?.focus(); regexReturnFocus = undefined; };
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
    $('global-language').onchange = (event) => { state.language = event.target.value; save(); applyState(); announce('Language mode changed', '語言模式已更改'); };
    $('global-english-funny').oninput = (event) => { state.englishFunny = Number(event.target.value); save(); applyState(); };
    $('global-cantonese-funny').oninput = (event) => { state.cantoneseFunny = Number(event.target.value); save(); applyState(); };
    $('global-dialog-emoji').onchange = (event) => { state.dialogEmoji = event.target.checked; save(); applyState(); notify(copy('Dialog setting saved', '對話框設定已保存', 'en'), copy('The local decoration preference is active.', '本地裝飾偏好已啟用。', 'en')); };
    $('global-school-toggle').onchange = (event) => { if (!event.target.checked && state.schoolCredentialDigest) { event.target.checked = true; openConfirmation('unlock', event.target, 'Turn off School mode only after the local unlock code matches. The page will return to the visitor language and optional controls.'); return; } state.schoolMode = event.target.checked; save(); applyState(); };
    $('global-school-name-save').onclick = () => { const value = $('global-school-name').value.trim(); if (value) { state.schoolName = value.slice(0, 48); save(); applyState(); notify(copy('Mode name saved', '模式名稱已保存', 'en'), copy('The chosen name is now used on this page.', '呢個名稱會喺此頁使用。', 'en')); } };
    $('global-school-code-save').onclick = async () => { const value = $('global-school-code').value; if (value.length < 4) { notify(copy('Unlock code not saved', '解鎖碼未保存', 'en'), copy('Use at least four characters, then try again.', '請用至少四個字元再試。', 'en')); return; } state.schoolCredentialDigest = await digest(value); $('global-school-code').value = ''; save(); applyState(); notify(copy('Unlock code saved', '解鎖碼已保存', 'en'), copy('The code is stored only as a digest in this browser.', '解鎖碼只會喺此瀏覽器保存摘要。', 'en')); };
    $('global-school-reset').onclick = (event) => openConfirmation('school-reset', event.currentTarget, 'Clear the renamed School mode, its unlock digest, and its active state. Clearing site storage remains the recovery route.');
    $('global-narrator-enabled').onchange = (event) => { state.narratorEnabled = event.target.checked; save(); applyState(); if (state.narratorEnabled) announce('Narrator enabled', '旁白已啟用'); };
    $('global-narrator-language').onchange = (event) => { state.narratorLanguage = event.target.value; save(); applyState(); };
    $('global-narrator-english-voice').onchange = (event) => { state.narratorEnglishVoice = event.target.value; save(); };
    $('global-narrator-cantonese-voice').onchange = (event) => { state.narratorCantoneseVoice = event.target.value; save(); };
    $('global-narrator-rate').oninput = (event) => { state.narratorRate = Number(event.target.value); save(); applyState(); };
    $('global-narrator-pitch').oninput = (event) => { state.narratorPitch = Number(event.target.value); save(); applyState(); };
    $('global-narrator-test').onclick = () => announce('This is a local narrator test.', '呢句係本地旁白測試。');
    $('global-schedule-enabled').onchange = (event) => { if (!event.target.checked) state.schedule.rules = []; save(); applyState(); };
    $('global-schedule-save').onclick = saveSchedule;
    $('global-schedule-check').onclick = checkSource;
    $('global-display-name-save').onclick = () => { const value = $('global-display-name').value.trim(); if (value) { state.displayName = value.slice(0, 80); save(); applyState(); notify(copy('Display name saved', '顯示名稱已保存', 'en'), copy('Only this page label changed; installed identity stayed fixed.', '只改變此頁標籤，已安裝身份保持不變。', 'en')); } };
    $('global-display-name-reset').onclick = () => { state.displayName = DEFAULTS.displayName; save(); applyState(); };
    $('global-update-refresh').onclick = () => { state.updateCheckedAt = Date.now(); save(); applyState(); notify(copy('Local update status refreshed', '本地更新狀態已重新整理', 'en'), copy('No network request was made and no verified installer is available here.', '冇發出網絡要求，此處亦冇已驗證安裝程式。', 'en')); };
    $('global-settings-reset').onclick = (event) => openConfirmation('full-reset', event.currentTarget, 'Reset this page\'s visitor-local settings, including language, School mode, narrator choices, schedules, display name, and surprise history.');
    $('global-confirm-cancel').onclick = closeConfirmation;
    $('global-confirm-apply').onclick = finishConfirmation;
    $('global-confirm-key-one').onchange = updateConfirmationState;
    $('global-confirm-key-two').onchange = updateConfirmationState;
    $('global-confirm-slider').oninput = updateConfirmationState;
    $('global-confirm-code').oninput = updateConfirmationState;
    $('global-schedule-source').onchange = applyState;
    enhanceDropdowns();
  }
  function applyState() {
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
    $('global-schedule-enabled') && ($('global-schedule-enabled').checked = state.schedule.rules.length > 0);
    $('global-schedule-timezone') && ($('global-schedule-timezone').value = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local timezone');
    renderScheduleRules();
    $('global-display-name') && ($('global-display-name').value = state.displayName);
    const updateStatus = $('global-update-status');
    if (updateStatus) updateStatus.textContent = state.updateCheckedAt ? `No verified installer is published for this static page. Last local check: ${new Date(state.updateCheckedAt).toLocaleString()}. No network request was made.` : 'No verified installer is published for this static page. Nothing is downloaded automatically.';
    const dishStatus = $('global-dimsum-status');
    if (dishStatus) dishStatus.textContent = state.dimSumShown ? `One local dish has been shown during a later visit. Total shown on this browser: ${state.dimSumShown}.` : 'No dish has been shown on this browser yet.';
    applyDisplayName(); applySchoolMode(); applyPanelCopy(); applyScheduleRules(); filterSettings(); decorateDialogs();
  }
  function scheduleRuleMatches(rule, now = new Date()) {
    if (rule.startDate && now.toISOString().slice(0, 10) < rule.startDate) return false;
    if (rule.endDate && now.toISOString().slice(0, 10) > rule.endDate) return false;
    const weekday = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'][now.getDay()];
    if (!rule.everyDay && (!Array.isArray(rule.weekdays) || !rule.weekdays.includes(weekday))) return false;
    if (!rule.startTime || !rule.endTime) return true;
    const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (rule.startTime <= rule.endTime) return current >= rule.startTime && current <= rule.endTime;
    return current >= rule.startTime || current <= rule.endTime;
  }
  function applyScheduleRules() {
    if (!state.schedule.rules.length) return;
    const active = state.schedule.rules.filter((rule) => rule.source === 'local' && scheduleRuleMatches(rule)).sort((a, b) => Number(b.precedence) - Number(a.precedence))[0];
    if (!active || state.schedule.lastAppliedRule === active.id) return;
    if (SCHEDULE_TARGETS.some(([id]) => id === active.target)) {
      if (active.target === 'narratorEnabled') state.narratorEnabled = active.value === 'true';
      else state[active.target] = active.value;
      state.schedule.lastAppliedRule = active.id;
      if (active.target === 'displayName') applyDisplayName();
      if (active.target === 'language') { applyLanguageValue(); applyPanelCopy(); }
      save();
    }
  }
  function applyExternalSetting(body, active) {
    if (!active) return;
    const target = String(body?.target || '');
    if (!SCHEDULE_TARGETS.some(([id]) => id === target) || body.value === undefined) return;
    state[target] = target === 'narratorEnabled' ? body.value === true || body.value === 'true' : String(body.value).slice(0, 120);
    applyLanguageValue(); applyDisplayName(); applyPanelCopy(); save();
  }
  function renderScheduleRules() {
    const node = $('global-schedule-rules');
    if (!node) return;
    node.innerHTML = state.schedule.rules.length ? state.schedule.rules.map((rule) => `<div class="global-schedule-rule"><strong>${escapeHtml(rule.target)} = ${escapeHtml(rule.value)}</strong><span>${escapeHtml(rule.startDate || 'any date')} ${escapeHtml(rule.startTime || 'any time')} · ${escapeHtml(rule.everyDay ? 'every day' : (rule.weekdays || []).join(', ') || 'no weekdays')} · ${escapeHtml(rule.timezone || 'local timezone')} · precedence ${escapeHtml(rule.precedence)}</span><button type="button" class="text-button" data-remove-schedule="${escapeHtml(rule.id)}">Remove</button></div>`).join('') : '<p>No schedule rules saved.</p>';
    all('[data-remove-schedule]').forEach((button) => { button.onclick = () => { state.schedule.rules = state.schedule.rules.filter((rule) => rule.id !== button.dataset.removeSchedule); state.schedule.lastAppliedRule = ''; save(); applyState(); }; });
  }
  function validateEndpoint(endpoint, source) {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' && !(url.hostname === 'localhost' || url.hostname === '127.0.0.1')) throw new Error('Only HTTPS or loopback development URLs are accepted.');
    if (url.username || url.password || url.search || url.hash) throw new Error('Credentials, query strings, and fragments are not accepted in source URLs.');
    if (!url.hostname || url.hostname.length > 253 || /[^a-z0-9.:-]/i.test(url.hostname)) throw new Error('The source host is not valid.');
    if (source === 'https' && url.hostname === 'localhost') throw new Error('A production HTTPS source must use a non-loopback host.');
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
  async function readBoundedJson(response) {
    if (!response.body) throw new Error('The source response had no body.');
    const reader = response.body.getReader(); const chunks = []; let total = 0;
    while (true) { const part = await reader.read(); if (part.done) break; total += part.value.byteLength; if (total > MAX_ENDPOINT_BYTES) { await reader.cancel(); throw new Error('The source response exceeded the 64 KiB bound.'); } chunks.push(part.value); }
    const bytes = new Uint8Array(total); let offset = 0; chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; });
    const value = JSON.parse(new TextDecoder().decode(bytes)); validateExternalPayload(value); return value;
  }
  function saveSchedule() {
    const source = $('global-schedule-source').value;
    const endpoint = $('global-schedule-endpoint').value.trim();
    if (source !== 'local') { try { validateEndpoint(endpoint, source); } catch (error) { $('global-schedule-status').textContent = `Schedule not saved: ${error.message}`; return; } }
    const startDate = $('global-schedule-start-date').value; const endDate = $('global-schedule-end-date').value; const startTime = $('global-schedule-start-time').value; const endTime = $('global-schedule-end-time').value;
    if (startDate && endDate && endDate < startDate) { $('global-schedule-status').textContent = 'Schedule not saved: the end date must not precede the start date.'; return; }
    if (!startTime || !endTime) { $('global-schedule-status').textContent = 'Schedule not saved: choose both a start and end time, or use a local all-day rule.'; return; }
    const rule = { id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, target: $('global-schedule-target').value, value: $('global-schedule-value').value.slice(0, 120), startDate, endDate, startTime, endTime, weekdays: all('[data-global-weekday]:checked').map((node) => node.dataset.globalWeekday), everyDay: $('global-schedule-every-day').checked, timezone: $('global-schedule-timezone').value, precedence: Math.min(100, Math.max(0, Number($('global-schedule-precedence').value) || 0)), source, endpoint, entity: $('global-schedule-entity').value.trim().slice(0, 128) };
    if (!rule.value) { $('global-schedule-status').textContent = 'Schedule not saved: choose a target value.'; return; }
    if (!rule.everyDay && !rule.weekdays.length) { $('global-schedule-status').textContent = 'Schedule not saved: choose weekdays or Every day.'; return; }
    if (source === 'home-assistant' && !/^\b(?:binary_sensor|input_boolean)\.[a-z0-9_]+$/i.test(rule.entity)) { $('global-schedule-status').textContent = 'Schedule not saved: use a boolean Home Assistant entity such as input_boolean.example.'; return; }
    state.schedule.rules = [...state.schedule.rules, rule].slice(-MAX_RULES); state.schedule.lastAppliedRule = ''; save(); applyState(); $('global-schedule-status').textContent = copy('Versioned schedule rule saved locally. It applies by precedence when its date, time, weekday, and timezone window matches.', '版本化排程規則已保存喺本地，日期、時間、星期同時區符合時會按優先次序套用。', 'en'); notify(copy('Schedule saved', '排程已保存', 'en'), copy('The local rule is ready.', '本地規則準備好喇。', 'en'));
  }
  async function checkSource() {
    const source = $('global-schedule-source').value;
    if (source === 'local') { $('global-schedule-status').textContent = 'Local source selected, so no network request is needed.'; return; }
    const endpoint = $('global-schedule-endpoint').value.trim();
    let timer;
    try { const url = validateEndpoint(endpoint, source); const controller = new AbortController(); timer = setTimeout(() => controller.abort(), 5000); const response = await fetch(url.href, { credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const body = await readBoundedJson(response); if (source === 'home-assistant') { const remoteState = body?.state?.state || body?.state; if (remoteState !== 'on' && remoteState !== 'off') throw new Error('Home Assistant response must contain state on or off.'); applyExternalSetting(body, remoteState === 'on'); $('global-schedule-status').textContent = remoteState === 'on' ? 'Home Assistant is on. The validated target and value were applied locally.' : 'Home Assistant is off. The local base setting remains active.'; } else { applyExternalSetting(body, body.enabled !== false); $('global-schedule-status').textContent = 'Source checked explicitly. The bounded response was read locally and was not stored as a permanent setting.'; } } catch (error) { $('global-schedule-status').textContent = `Source check failed safely: ${error.message}. The last local value remains active.`; } finally { if (timer) clearTimeout(timer); }
  }
  function showDimSum() {
    if (!canShowDimSum()) return;
    const [en, zh] = DISHES[Math.floor(Math.random() * DISHES.length)];
    state.dimSumShown += 1; save(); applyState();
    const region = $('toast-region') || document.body;
    const toast = document.createElement('div'); toast.className = 'global-dimsum-toast'; toast.setAttribute('role', 'status'); toast.innerHTML = `<span class="global-dimsum-plate" role="img" aria-label="${escapeHtml(`${en} · ${zh}`)}">🥟</span><div><strong>${escapeHtml(copy(en, zh, 'en'))}</strong><span>${escapeHtml(copy('A local ten-percent visitor surprise.', '本地十個百分比訪客小驚喜。', 'en'))}</span></div>`; region.append(toast); setTimeout(() => toast.remove(), 7000);
  }
  function canShowDimSum() {
    return !state.schoolMode && !document.hidden && !state.quietHours && !state.reducedSound && !document.body.classList.contains('low-stimulation') && document.body.dataset.errorPath !== 'true' && document.body.dataset.updateFlow !== 'true' && document.body.dataset.activeTask !== 'true' && document.body.dataset.screenReaderActive !== 'true';
  }
  function maybeDimSum() {
    if (state.visited) { if (canShowDimSum() && Math.random() < 0.1) setTimeout(showDimSum, 700); return; }
    state.visited = true; save();
  }
  function init() {
    if (window.__dingPbxGlobalSettingsInitialized) return;
    window.__dingPbxGlobalSettingsInitialized = true;
    renderPanel();
    const dialogObserver = new MutationObserver(() => decorateDialogs());
    dialogObserver.observe(document.body, { childList: true, subtree: true });
    if (speechSynthesisAvailable()) { voiceListener = () => { refreshVoices(); }; speechSynthesis.addEventListener('voiceschanged', voiceListener); refreshVoices(); }
    applyState();
    maybeDimSum();
    window.addEventListener('beforeunload', () => { if (voiceListener && speechSynthesisAvailable()) speechSynthesis.removeEventListener('voiceschanged', voiceListener); dialogObserver.disconnect(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
