(() => {
  'use strict';

  /*
   * Page-local equivalents for settings that belong to every published page.
   * This module has no network imports and uses one bounded localStorage record
   * per visitor. It deliberately does not share the desktop application's
   * identity, credential store, or update feed.
   */
  const STORAGE_KEY = 'ding-pbx-site-global-settings-v1';
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
    schedule: {
      enabled: false,
      start: '',
      end: '',
      weekdays: ['mo', 'tu', 'we', 'th', 'fr'],
      source: 'local',
      endpoint: ''
    },
    displayName: 'Ding PBX Console',
    visited: false,
    dimSumShown: 0,
    updateCheckedAt: 0
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
      return {
        ...DEFAULTS,
        ...saved,
        schedule: { ...DEFAULTS.schedule, ...(saved.schedule || {}) },
        englishFunny: Number.isInteger(saved.englishFunny) ? Math.min(5, Math.max(1, saved.englishFunny)) : DEFAULTS.englishFunny,
        cantoneseFunny: Number.isInteger(saved.cantoneseFunny) ? Math.min(5, Math.max(1, saved.cantoneseFunny)) : DEFAULTS.cantoneseFunny
      };
    } catch {
      return { ...DEFAULTS, schedule: { ...DEFAULTS.schedule } };
    }
  }
  const state = load();
  const voices = { en: [], zh: [] };
  let voiceListener;
  let narrationCurrent = false;
  let narrationQueue = [];
  let regexConfig = { pattern: '', flags: 'iu', enabled: false };

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    toast.innerHTML = `<strong>${escapeHtml(state.dialogEmoji ? `◈ ${title}` : title)}</strong><span>${escapeHtml(body)}</span>`;
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
      select.innerHTML = '<option value="">Choose automatically</option>' + list.map((voice) => `<option value="${escapeHtml(voice.voiceURI)}">${escapeHtml(voice.name)} · ${escapeHtml(voice.lang)}</option>`).join('');
      select.value = selected || '';
    };
    fill(selectEnglish, voices.en, state.narratorEnglishVoice);
    fill(selectCantonese, voices.zh, state.narratorCantoneseVoice);
    const status = $('global-narrator-voice-status');
    if (status) status.textContent = speechSynthesisAvailable() ? `Installed voices: English ${voices.en.length}, Cantonese ${voices.zh.length}.` : 'Speech synthesis is unavailable in this browser.';
  }
  function speechSynthesisAvailable() {
    return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
  }
  function refreshVoices() {
    if (!speechSynthesisAvailable()) return;
    const list = window.speechSynthesis.getVoices();
    voices.en = list.filter((voice) => /^en(?:-|$)/i.test(voice.lang));
    voices.zh = list.filter((voice) => /^(?:yue|zh)(?:-|$)/i.test(voice.lang));
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
    utterance.lang = item.language === 'zh' ? 'zh-HK' : 'en-US';
    utterance.rate = Number(state.narratorRate) || 1;
    utterance.pitch = Number(state.narratorPitch) || 1;
    const voice = selectedVoice(item.language);
    if (voice) utterance.voice = voice;
    utterance.onend = utterance.onerror = () => { narrationCurrent = false; speakNext(); };
    window.speechSynthesis.speak(utterance);
  }
  function announce(en, zh) {
    if (!state.narratorEnabled || !speechSynthesisAvailable()) return;
    const items = state.narratorLanguage === 'both' ? [{ text: en, language: 'en' }, { text: zh, language: 'zh' }] : [{ text: state.narratorLanguage === 'zh' ? zh : en, language: state.narratorLanguage === 'zh' ? 'zh' : 'en' }];
    narrationQueue = items;
    speakNext();
  }
  function applyDisplayName() {
    const name = state.displayName.trim() || DEFAULTS.displayName;
    all('.brand strong, [data-display-name]').forEach((node) => { node.textContent = name; });
    document.body.dataset.displayName = name;
    if (document.title) document.title = document.title.replace(/^[^·]+/, `${name} `);
  }
  function applySchoolMode() {
    document.body.classList.toggle('global-school-mode', state.schoolMode);
    document.documentElement.lang = state.schoolMode ? 'en' : (state.language === 'zh' ? 'zh-Hant' : 'en');
    all('[data-school-hidden]').forEach((node) => { node.hidden = state.schoolMode; });
    const label = $('global-school-label');
    if (label) label.textContent = state.schoolName;
    const note = $('global-school-note');
    if (note) note.textContent = state.schoolMode ? `${state.schoolName} is active. The page stays in English and optional playful controls are suppressed. Turn it off with the local credential, or clear this site's storage to reset it.` : `${state.schoolName} is a local interface preference, not a security boundary. Clearing this site's storage resets it.`;
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
    regexConfig = { pattern, flags, enabled: Boolean(pattern) };
    $('global-regex-popover').hidden = true;
    filterSettings();
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
      <div class="global-settings-header"><div><span class="card-kicker">LOCAL PAGE CONTROLS</span><h2 id="global-settings-title">Page settings</h2><p>Every page owns this visitor-local panel. No analytics, third-party assets, or automatic network requests.</p></div><button type="button" class="icon-button" id="global-settings-close" aria-label="Close settings">×</button></div>
      <div class="search-composite global-settings-search-wrap"><label class="sr-only" for="global-settings-search">Search page settings</label><input id="global-settings-search" type="search" placeholder="Search page settings"><button type="button" class="regex-trigger" id="global-regex-open" aria-label="Build a regular expression for page settings">.*</button></div><p id="global-settings-search-status" class="filter-status" role="status"></p>
      <div class="global-tabs" role="tablist" aria-label="Page setting sections"><button type="button" role="tab" aria-selected="true" aria-controls="global-tab-language" id="global-tab-language-button">Language &amp; School</button><button type="button" role="tab" aria-selected="false" aria-controls="global-tab-voice" id="global-tab-voice-button">Narration &amp; Schedule</button><button type="button" role="tab" aria-selected="false" aria-controls="global-tab-visitor" id="global-tab-visitor-button">Visitor &amp; Updates</button></div>
      <section class="global-tab-panel" role="tabpanel" id="global-tab-language" aria-labelledby="global-tab-language-button">
        <div class="global-setting" data-search="language english cantonese bilingual funny"><h3>Language mode</h3><p>Choose English, playful Hong Kong-style Cantonese, or bilingual copy for this page.</p><select id="global-language" aria-label="Page language mode"><option value="en">English</option><option value="zh">Playful Hong Kong-style Cantonese</option><option value="both">Bilingual</option></select></div>
        <div class="global-setting" data-search="funny english level playful"><h3>English funny level</h3><p>Styles every English message, including warnings. Facts stay exact. Level 5 is the shipped default.</p><input id="global-english-funny" type="range" min="1" max="5" value="5" step="1"><output id="global-english-funny-output">5</output></div>
        <div class="global-setting" data-search="funny cantonese level playful"><h3>Cantonese funny level</h3><p>Styles every Cantonese message, including warnings. Facts stay exact. Level 5 is the shipped default.</p><input id="global-cantonese-funny" type="range" min="1" max="5" value="5" step="1"><output id="global-cantonese-funny-output">5</output></div>
        <div class="global-setting" data-search="emoji dialogs message boxes"><h3>Dialog emoji decoration</h3><p>When enabled, informational dialog and toast headings receive a non-semantic decoration. Control labels and accessible names stay plain.</p><label class="switch-row"><input id="global-dialog-emoji" type="checkbox"><span>Show emojis in dialogs and message boxes</span></label></div>
        <div class="global-setting" data-search="school mode rename unlock reset"><h3 id="global-school-label">School mode</h3><p id="global-school-note"></p><label class="switch-row"><input id="global-school-toggle" type="checkbox"><span>Use this local page mode</span></label><div class="global-inline"><label for="global-school-name">Mode name</label><input id="global-school-name" maxlength="48" type="text"><button type="button" class="text-button" id="global-school-name-save">Save name</button></div><div class="global-inline"><label for="global-school-code">Unlock code</label><input id="global-school-code" type="password" autocomplete="new-password" inputmode="numeric" maxlength="64"><button type="button" class="text-button" id="global-school-code-save">Set code</button></div><button type="button" class="danger-button" id="global-school-reset">Reset mode and credential</button></div>
      </section>
      <section class="global-tab-panel" role="tabpanel" id="global-tab-voice" aria-labelledby="global-tab-voice-button" hidden data-school-hidden>
        <div class="global-setting" data-search="narrator text to speech voice english cantonese"><h3>Narrator</h3><p>Off by default. Browser speech voices are enumerated late from this device, and the selected voice identity is stored locally.</p><label class="switch-row"><input id="global-narrator-enabled" type="checkbox"><span>Enable spoken page events</span></label><label>Spoken language<select id="global-narrator-language" aria-label="Narrated language"><option value="en">English</option><option value="zh">Cantonese</option><option value="both">Both, serialized</option></select></label><label>English voice<select id="global-narrator-english-voice" aria-label="English narrator voice"><option value="">Choose automatically</option></select></label><label>Cantonese voice<select id="global-narrator-cantonese-voice" aria-label="Cantonese narrator voice"><option value="">Choose automatically</option></select></label><p id="global-narrator-voice-status" role="status"></p><div class="global-range-grid"><label>Rate <input id="global-narrator-rate" type="range" min="0.5" max="2" value="1" step="0.1"><output id="global-narrator-rate-output">1</output></label><label>Pitch <input id="global-narrator-pitch" type="range" min="0" max="2" value="1" step="0.1"><output id="global-narrator-pitch-output">1</output></label></div><button type="button" class="primary-button" id="global-narrator-test">Speak a local test</button></div>
        <div class="global-setting" data-search="schedule date time weekdays local api home assistant"><h3>Scheduled settings</h3><p>Rules are local and timezone-aware. HTTPS API and Home Assistant values are checked only after an explicit action. Browser storage cannot provide an operating-system credential vault.</p><label class="switch-row"><input id="global-schedule-enabled" type="checkbox"><span>Enable this local schedule</span></label><div class="global-range-grid"><label>Start <input id="global-schedule-start" type="datetime-local"></label><label>End <input id="global-schedule-end" type="datetime-local"></label></div><fieldset><legend>Weekdays</legend>${WEEKDAYS.map(([id, name]) => `<label class="weekday"><input type="checkbox" data-global-weekday="${id}"> ${name}</label>`).join('')}</fieldset><label>Source<select id="global-schedule-source"><option value="local">Local page state</option><option value="https">Validated HTTPS API</option><option value="home-assistant">Home Assistant boolean</option></select></label><label>Endpoint <input id="global-schedule-endpoint" type="url" placeholder="https://example.invalid/settings.json"></label><p id="global-schedule-status" role="status"></p><button type="button" class="text-button" id="global-schedule-save">Save schedule rule</button><button type="button" class="text-button" id="global-schedule-check">Check source explicitly</button></div>
      </section>
      <section class="global-tab-panel" role="tabpanel" id="global-tab-visitor" aria-labelledby="global-tab-visitor-button" hidden data-school-hidden>
        <div class="global-setting" data-search="display name rename title about"><h3>Page display name</h3><p>Changes the name shown in this page's title and brand only. It never changes package identity, storage location, installer identity, or update feed.</p><div class="global-inline"><label for="global-display-name">Display name</label><input id="global-display-name" maxlength="80" type="text"><button type="button" class="text-button" id="global-display-name-save">Save name</button><button type="button" class="text-button" id="global-display-name-reset">Reset</button></div></div>
        <div class="global-setting" data-search="dim sum startup surprise local visitor cache"><h3>Startup dim sum</h3><p>One in ten later visits may show one locally bundled dish name and a local plate illustration. There is no off switch. The first visit, School mode, quiet mode, errors, and active work suppress it.</p><p id="global-dimsum-status" role="status"></p></div>
        <div class="global-setting" data-search="updates downloads installer local status"><h3>Updates and downloads</h3><p id="global-update-status">No verified installer is published for this static page. Nothing is downloaded automatically.</p><button type="button" class="text-button" id="global-update-refresh">Refresh local status</button></div>
        <div class="global-setting" data-search="reset local storage visitor state"><h3>Reset visitor settings</h3><p>Clearing this site's storage resets language, School mode, narrator choices, schedule rules, display name, and visitor cache. It does not touch the installed desktop application.</p><button type="button" class="danger-button" id="global-settings-reset">Reset this page's visitor settings</button></div>
      </section>
      <div id="global-regex-popover" class="global-regex-popover" hidden><h3>Regex builder for page settings</h3><label>Pattern<input id="global-regex-pattern" type="text" maxlength="256"></label><label class="switch-row"><input id="global-regex-i" type="checkbox" checked><span>Ignore case</span></label><label class="switch-row"><input id="global-regex-u" type="checkbox" checked><span>Unicode</span></label><p id="global-regex-feedback" role="status"></p><button type="button" class="primary-button" id="global-regex-apply">Apply to this search</button><button type="button" class="text-button" id="global-regex-cancel">Cancel</button></div>`;
    document.body.append(panel);
    bindPanel(button);
  }
  function bindPanel(openButton) {
    const panel = $('global-settings-panel');
    const close = () => { panel.hidden = true; openButton.setAttribute('aria-expanded', 'false'); openButton.focus(); };
    openButton.onclick = () => { panel.hidden = false; openButton.setAttribute('aria-expanded', 'true'); filterSettings(); $('global-language')?.focus(); refreshVoices(); };
    $('global-settings-close').onclick = close;
    $('global-settings-search').oninput = filterSettings;
    $('global-regex-open').onclick = openRegex;
    $('global-regex-cancel').onclick = () => { $('global-regex-popover').hidden = true; };
    $('global-regex-pattern').oninput = previewRegex;
    $('global-regex-i').onchange = previewRegex;
    $('global-regex-u').onchange = previewRegex;
    $('global-regex-apply').onclick = applyRegex;
    all('[role="tab"]').forEach((tab) => tab.onclick = () => { all('.global-tab-panel').forEach((node) => { node.hidden = node.id !== tab.getAttribute('aria-controls'); }); all('[role="tab"]').forEach((node) => node.setAttribute('aria-selected', String(node === tab))); });
    $('global-language').onchange = (event) => { state.language = event.target.value; save(); applyState(); announce('Language mode changed', '語言模式已更改'); };
    $('global-english-funny').oninput = (event) => { state.englishFunny = Number(event.target.value); save(); applyState(); };
    $('global-cantonese-funny').oninput = (event) => { state.cantoneseFunny = Number(event.target.value); save(); applyState(); };
    $('global-dialog-emoji').onchange = (event) => { state.dialogEmoji = event.target.checked; save(); applyState(); notify('Dialog setting saved', 'The local decoration preference is active.'); };
    $('global-school-toggle').onchange = async (event) => { if (!event.target.checked && state.schoolCredentialDigest) { const code = window.prompt('Enter the local School mode unlock code.'); if (!code || await digest(code) !== state.schoolCredentialDigest) { event.target.checked = true; notify('School mode remains active', 'The local unlock code did not match. Clear this site storage to reset it.'); return; } } state.schoolMode = event.target.checked; save(); applyState(); };
    $('global-school-name-save').onclick = () => { const value = $('global-school-name').value.trim(); if (value) { state.schoolName = value.slice(0, 48); save(); applyState(); notify('Mode name saved', 'The chosen name is now used on this page.'); } };
    $('global-school-code-save').onclick = async () => { const value = $('global-school-code').value; if (value.length < 4) { notify('Unlock code not saved', 'Use at least four characters, then try again.'); return; } state.schoolCredentialDigest = await digest(value); $('global-school-code').value = ''; save(); applyState(); notify('Unlock code saved', 'The code is stored only as a digest in this browser.'); };
    $('global-school-reset').onclick = () => { state.schoolMode = false; state.schoolCredentialDigest = ''; save(); applyState(); notify('School mode reset', 'The local mode and its credential were cleared.'); };
    $('global-narrator-enabled').onchange = (event) => { state.narratorEnabled = event.target.checked; save(); applyState(); if (state.narratorEnabled) announce('Narrator enabled', '旁白已啟用'); };
    $('global-narrator-language').onchange = (event) => { state.narratorLanguage = event.target.value; save(); applyState(); };
    $('global-narrator-english-voice').onchange = (event) => { state.narratorEnglishVoice = event.target.value; save(); };
    $('global-narrator-cantonese-voice').onchange = (event) => { state.narratorCantoneseVoice = event.target.value; save(); };
    $('global-narrator-rate').oninput = (event) => { state.narratorRate = Number(event.target.value); save(); applyState(); };
    $('global-narrator-pitch').oninput = (event) => { state.narratorPitch = Number(event.target.value); save(); applyState(); };
    $('global-narrator-test').onclick = () => announce('This is a local narrator test.', '呢句係本地旁白測試。');
    $('global-schedule-enabled').onchange = (event) => { state.schedule.enabled = event.target.checked; save(); applyState(); };
    $('global-schedule-save').onclick = saveSchedule;
    $('global-schedule-check').onclick = checkSource;
    $('global-display-name-save').onclick = () => { const value = $('global-display-name').value.trim(); if (value) { state.displayName = value.slice(0, 80); save(); applyState(); notify('Display name saved', 'Only this page label changed; installed identity stayed fixed.'); } };
    $('global-display-name-reset').onclick = () => { state.displayName = DEFAULTS.displayName; save(); applyState(); };
    $('global-update-refresh').onclick = () => { state.updateCheckedAt = Date.now(); save(); applyState(); notify('Local update status refreshed', 'No network request was made and no verified installer is available here.'); };
    $('global-settings-reset').onclick = () => { if (!window.confirm('Reset this page\'s local visitor settings?')) return; localStorage.removeItem(STORAGE_KEY); window.location.reload(); };
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
    $('global-schedule-enabled') && ($('global-schedule-enabled').checked = state.schedule.enabled);
    $('global-schedule-start') && ($('global-schedule-start').value = state.schedule.start || '');
    $('global-schedule-end') && ($('global-schedule-end').value = state.schedule.end || '');
    $('global-schedule-source') && ($('global-schedule-source').value = state.schedule.source);
    $('global-schedule-endpoint') && ($('global-schedule-endpoint').value = state.schedule.endpoint || '');
    all('[data-global-weekday]').forEach((node) => { node.checked = state.schedule.weekdays.includes(node.dataset.globalWeekday); });
    $('global-display-name') && ($('global-display-name').value = state.displayName);
    const updateStatus = $('global-update-status');
    if (updateStatus) updateStatus.textContent = state.updateCheckedAt ? `No verified installer is published for this static page. Last local check: ${new Date(state.updateCheckedAt).toLocaleString()}. No network request was made.` : 'No verified installer is published for this static page. Nothing is downloaded automatically.';
    const dishStatus = $('global-dimsum-status');
    if (dishStatus) dishStatus.textContent = state.dimSumShown ? `One local dish has been shown during a later visit. Total shown on this browser: ${state.dimSumShown}.` : 'No dish has been shown on this browser yet.';
    applyDisplayName(); applySchoolMode(); filterSettings();
  }
  function saveSchedule() {
    const source = $('global-schedule-source').value;
    const endpoint = $('global-schedule-endpoint').value.trim();
    if (source !== 'local') {
      try { const url = new URL(endpoint); if (url.protocol !== 'https:' && !(url.hostname === 'localhost' || url.hostname === '127.0.0.1')) throw new Error('Use HTTPS, or loopback for development.'); } catch (error) { $('global-schedule-status').textContent = `Schedule not saved: ${error.message}`; return; }
    }
    state.schedule = { enabled: $('global-schedule-enabled').checked, start: $('global-schedule-start').value, end: $('global-schedule-end').value, weekdays: all('[data-global-weekday]:checked').map((node) => node.dataset.globalWeekday), source, endpoint };
    save(); applyState(); $('global-schedule-status').textContent = 'Rule saved locally with the browser timezone. External values are not applied until explicitly checked.'; notify('Schedule saved', 'The local rule is ready.');
  }
  async function checkSource() {
    const source = $('global-schedule-source').value;
    if (source === 'local') { $('global-schedule-status').textContent = 'Local source selected, so no network request is needed.'; return; }
    const endpoint = $('global-schedule-endpoint').value.trim();
    try { const url = new URL(endpoint); if (url.protocol !== 'https:' && !(url.hostname === 'localhost' || url.hostname === '127.0.0.1')) throw new Error('Only HTTPS or loopback development URLs are accepted.'); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 5000); const response = await fetch(url.href, { credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } }); clearTimeout(timer); if (!response.ok) throw new Error(`HTTP ${response.status}`); const body = await response.json(); if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('The response must be one JSON object.'); $('global-schedule-status').textContent = `Source checked explicitly. The response was read locally and was not stored as a permanent setting.`; } catch (error) { $('global-schedule-status').textContent = `Source check failed safely: ${error.message}. The last local value remains active.`; }
  }
  function showDimSum() {
    if (state.schoolMode || document.hidden) return;
    const [en, zh] = DISHES[Math.floor(Math.random() * DISHES.length)];
    state.dimSumShown += 1; save(); applyState();
    const region = $('toast-region') || document.body;
    const toast = document.createElement('div'); toast.className = 'global-dimsum-toast'; toast.setAttribute('role', 'status'); toast.innerHTML = `<span class="global-dimsum-plate" aria-label="${escapeHtml(`${en} · ${zh}`)}">🥟</span><div><strong>${escapeHtml(copy(en, zh, 'en'))}</strong><span>${escapeHtml(state.language === 'en' ? 'A local ten-percent visitor surprise.' : state.language === 'zh' ? '本地十個百分比訪客小驚喜。' : 'A local ten-percent visitor surprise. / 本地十個百分比訪客小驚喜。')}</span></div>`; region.append(toast); setTimeout(() => toast.remove(), 7000);
  }
  function maybeDimSum() {
    if (state.visited) { if (!state.schoolMode && Math.random() < 0.1 && !document.hidden) setTimeout(showDimSum, 700); return; }
    state.visited = true; save();
  }
  function init() {
    renderPanel();
    if (speechSynthesisAvailable()) { voiceListener = () => { refreshVoices(); }; speechSynthesis.addEventListener('voiceschanged', voiceListener); refreshVoices(); }
    applyState();
    maybeDimSum();
    window.addEventListener('beforeunload', () => { if (voiceListener && speechSynthesisAvailable()) speechSynthesis.removeEventListener('voiceschanged', voiceListener); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
