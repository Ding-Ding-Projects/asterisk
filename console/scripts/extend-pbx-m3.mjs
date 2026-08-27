import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const consoleRoot = new URL('../', import.meta.url);
/* Follows the compiler's own output directory, so the drift check can run both steps into
 * a scratch directory instead of rewriting the shipped files while sibling tests read them. */
const generated = process.env.DING_DESIGN_OUT_DIR
  ? pathToFileURL(join(process.env.DING_DESIGN_OUT_DIR, 'm3-control.tsx'))
  : new URL('app/renderer/src/generated/m3-control.tsx', consoleRoot);
const path = fileURLToPath(generated);
const consoleGenerated = process.env.DING_DESIGN_OUT_DIR
  ? pathToFileURL(join(process.env.DING_DESIGN_OUT_DIR, 'console.tsx'))
  : new URL('app/renderer/src/generated/console.tsx', consoleRoot);
const consolePath = fileURLToPath(consoleGenerated);

let source = await readFile(generated, 'utf8');

const templateMarker = '      (v.isText ? h("div", { style: sty(`display:flex; align-items:center; gap:10px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:10px 14px;`) },';
const stateMarker = "      isText: c.kind === 'text',";
const extensionMarker = "isEditableText: c.kind === 'text' && String(c.id || '').startsWith('pbxadm:'),";

if (!source.includes(templateMarker)) {
  throw new Error('PBX M3 extension could not find the compiled read-only text-control template marker.');
}
if (!source.includes(stateMarker)) {
  throw new Error('PBX M3 extension could not find the compiled text-control state marker.');
}
if (source.includes(extensionMarker)) {
  throw new Error('PBX M3 extension was applied twice without a fresh design compile.');
}

const editableTemplate = `      (v.isEditableText ? h("div", { style: sty(\`display:flex; align-items:center; gap:10px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:8px 12px;\`) },
          h("span", { style: sty(\`font-size:17px; color:#82D9A5; flex:0 0 auto;\`), className: "msym" },
            "edit"
          ),
          h("input", { type: \`text\`, value: v.ctl.value, "aria-label": v.ctl.label, onChange: fn(v.onEditableTextInput), onInput: fn(v.onEditableTextInput), style: sty(\`flex:1; min-width:0; background:transparent; border:0; outline:none; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:13.5px; padding:2px;\`) })
        ) : null),
`;

source = source.replace(templateMarker, `${editableTemplate}${templateMarker}`);
source = source.replace(
  stateMarker,
  `      ${extensionMarker}\n      onEditableTextInput: (e) => { if (c.set) c.set(e.target.value); },\n      isText: c.kind === 'text' && !String(c.id || '').startsWith('pbxadm:'),`,
);

await writeFile(path, source, 'utf8');
console.log(`extended compiled M3 controls -> ${path}`);

/* The checked-in design reference is immutable. These desktop-only interaction repairs
 * deliberately live in this sanctioned post-compile extension beside the earlier PBX
 * control repair, so a fresh design compile always reapplies them and generated output is
 * never hand-edited. */
let shell = await readFile(consoleGenerated, 'utf8');
const dockMarker = `        { label:'Rail on the left', icon:'dock_to_right', v:'left' },
        { label:'Rail on the right', icon:'dock_to_left', v:'right' },
        { label:'Rail on top', icon:'dock_to_bottom', v:'top' },
        { label:'Compact rail', icon:'width_normal', v:'compact' }`;
const dockReplacement = `        { label:'Rail on the left', icon:'dock_to_right', v:'left' },
        { label:'Rail on the right', icon:'dock_to_left', v:'right' },
        { label:'Rail on top', icon:'dock_to_bottom', v:'top' },
        { label:'Rail on the bottom', icon:'dock_to_top', v:'bottom' }`;
const directionMarker = "      dockDirection:s.dock === 'right' ? 'row-reverse' : (s.dock === 'top' ? 'column' : 'row'),";
const directionReplacement = "      dockDirection:s.dock === 'right' ? 'row-reverse' : (s.dock === 'top' ? 'column' : (s.dock === 'bottom' ? 'column-reverse' : 'row')),";
const keysMarker = "        if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') return;\n        e.preventDefault();";
const keysReplacement = "        const vertical = s.dock === 'left' || s.dock === 'right';\n        const forward = vertical ? 'ArrowDown' : 'ArrowRight';\n        const back = vertical ? 'ArrowUp' : 'ArrowLeft';\n        if (key !== forward && key !== back && key !== 'Home' && key !== 'End') return;\n        e.preventDefault();";
const deltaMarker = "        else { const delta = key === 'ArrowRight' ? 1 : -1; next = ((current >= 0 ? current : 0) + delta + list.length) % list.length; }";
const deltaReplacement = "        else { const delta = key === forward ? 1 : -1; next = ((current >= 0 ? current : 0) + delta + list.length) % list.length; }";
const colourKeepMarker = "          const keep = s.tabs.filter(k => (s.tabColours[k] || 'none') !== s.tabFilterColour);";
const colourKeepReplacement = "          const keep = s.tabs.filter(k => s.pinned.indexOf(k) >= 0 || (s.tabColours[k] || 'none') !== s.tabFilterColour);";
const textKeepMarker = "        const keep = s.tabs.filter(k => {\n          const label = (s.tabNames[k] || (SCREENS[k] ? SCREENS[k].title : k)).toLowerCase();";
const textKeepReplacement = "        const keep = s.tabs.filter(k => {\n          if (s.pinned.indexOf(k) >= 0) return true;\n          const label = (s.tabNames[k] || (SCREENS[k] ? SCREENS[k].title : k)).toLowerCase();";
const shellPatches = [
  [dockMarker, dockReplacement, 'four edge dock choices'],
  [directionMarker, directionReplacement, 'bottom dock direction'],
  [keysMarker, keysReplacement, 'axis-aware tab keyboard navigation'],
  [deltaMarker, deltaReplacement, 'axis-aware tab keyboard delta'],
  [colourKeepMarker, colourKeepReplacement, 'pinned tabs protected from colour bulk close'],
  [textKeepMarker, textKeepReplacement, 'pinned tabs protected from text bulk close'],
];
for (const [before, after, name] of shellPatches) {
  if (!shell.includes(before)) throw new Error(`PBX M3 extension could not find ${name} marker.`);
  shell = shell.replace(before, after);
}

/* `setVal` is the generated shell's one accepted-value path for every ordinary
 * control. Keep the cross-cutting mutation notification here, after the state write
 * commits, rather than in render-time control construction. The unchanged guard is
 * important: typing an already-present value or re-selecting an active option must not
 * reset attention timers or create a false durable-write event. */
const controlMutationMarker = `  setVal = (c, v) => {
    this.commit(c, v);
    this.setState(s => ({ values:Object.assign({}, s.values, { [c.id]:v }) }));
    const shown = Array.isArray(v) ? (v.length ? v.join(', ') : 'nothing') : String(v);`;
const controlMutationReplacement = `  setVal = (c, v) => {
    const previous = this.state.values[c.id] !== undefined ? this.state.values[c.id] : c.value;
    if (Object.is(previous, v)) return;
    this.commit(c, v);
    this.setState(s => ({ values:Object.assign({}, s.values, { [c.id]:v }) }), () => {
      this.onUserMutation('control:' + (c.id || 'unknown'));
    });
    const shown = Array.isArray(v) ? (v.length ? v.join(', ') : 'nothing') : String(v);`;
if (shell.includes("this.onUserMutation('control:' + (c.id || 'unknown'))")) {
  throw new Error('PBX M3 extension found a pre-existing generated control mutation callback. Compile a fresh design before extending it.');
}
const controlMutationMarkerCount = shell.split(controlMutationMarker).length - 1;
if (controlMutationMarkerCount !== 1) {
  throw new Error(`PBX M3 extension expected exactly one generated control-value acceptance marker, found ${controlMutationMarkerCount}.`);
}
shell = shell.replace(controlMutationMarker, controlMutationReplacement);

/* The checked-in design reference is immutable. It intentionally contains only a
 * presentational ceremony, so its two source handlers report a fake success when the
 * reference is opened alone. Replace exactly those compiled handlers here, after the
 * compiler has annotated notification events. App.tsx supplies the typed executor in
 * the desktop product. The strict single-match checks make a changed source a loud
 * compiler extension failure rather than a silently revived decorative action. */
const ceremonyFallbacks = [
  {
    name: 'confirmation-credit fallback',
    pattern: /skipCeremony:\(\) => \{ clearInterval\(this\._mole\); clearInterval\(this\._hold\); this\.setState\(\{ credits:s\.credits - 1, ceremonyOpen:false \}\); this\.fireWithId\('([^']+)', 'Skipped', s\.ceremonyCmd \+ ' ran on a credit\. ' \+ \(s\.credits - 1\) \+ ' left\.'\); \},/gu,
    replacement: (eventId) => `skipCeremony:() => this.fireWithId('${eventId}', 'Not run', 'No command executor is bound to this design preview.'),`,
  },
  {
    name: 'execute fallback',
    pattern: /executeCeremony:\(\) => \{ clearInterval\(this\._mole\); this\.setState\(\{ ceremonyOpen:false \}\); this\.toastWithId\('([^']+)', s\.ceremonyCmd \+ ' executed and attested'\); \},/gu,
    replacement: (eventId) => `executeCeremony:() => this.fireWithId('${eventId}', 'Not run', 'No command executor is bound to this design preview.'),`,
  },
];
for (const { name, pattern, replacement } of ceremonyFallbacks) {
  const matches = [...shell.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`PBX M3 extension expected exactly one ${name}, found ${matches.length}.`);
  shell = shell.replace(pattern, (_whole, eventId) => replacement(eventId));
}

/* Four independent discovery searches, rendered by the compiled shell but owned here so
 * the immutable reference remains data. Each scope owns its query, regex mode and flags.
 * A master search is still useful in this single-window product because it spans every
 * group and every currently-open strip member, with the window context stated on every row. */
const searchStateMarker = "    tabDrag:-1, tabOver:-1, groups:[], ctxGroupId:'', groupRenameOpen:false,";
const searchStateReplacement = "    tabDrag:-1, tabOver:-1, groups:[], ctxGroupId:'', groupRenameOpen:false,\n    tabSearchOpen:false, tabSearchScope:'strip', tabSearchGroupId:'', tabSearchReturn:'', tabSearchRevealTab:'',\n    stripTabSearchQuery:'', stripTabSearchRegex:false, stripTabSearchFlags:'i',\n    groupTabSearchQuery:'', groupTabSearchRegex:false, groupTabSearchFlags:'i',\n    groupNameSearchQuery:'', groupNameSearchRegex:false, groupNameSearchFlags:'i',\n    masterTabSearchQuery:'', masterTabSearchRegex:false, masterTabSearchFlags:'i',";
const searchRenderMarker = "      tabGroups:s.groups.map(g => ({";
const searchRenderReplacement = `      tabSearchOpen:s.tabSearchOpen,
      tabSearchScope:s.tabSearchScope,
      tabSearchGroupName:(s.groups.find(g => g.id === s.tabSearchGroupId) || { name:'this group' }).name,
      tabSearchScopes:[
        { id:'strip', label:'Current strip', pick:() => this.setState({ tabSearchOpen:true, tabSearchScope:'strip', tabSearchReturn:'tab-search-strip' }) },
        { id:'group', label:'Inside group', pick:() => this.setState({ tabSearchOpen:true, tabSearchScope:'group', tabSearchReturn:'tab-search-group-' + s.tabSearchGroupId }) },
        { id:'groups', label:'Group names', pick:() => this.setState({ tabSearchOpen:true, tabSearchScope:'groups', tabSearchReturn:'tab-search-groups' }) },
        { id:'master', label:'All open tabs', pick:() => this.setState({ tabSearchOpen:true, tabSearchScope:'master', tabSearchReturn:'tab-search-master' }) }
      ],
      tabSearchQuery:(() => { const p = s.tabSearchScope === 'strip' ? 'stripTabSearch' : s.tabSearchScope === 'group' ? 'groupTabSearch' : s.tabSearchScope === 'groups' ? 'groupNameSearch' : 'masterTabSearch'; return s[p + 'Query']; })(),
      tabSearchRegex:(() => { const p = s.tabSearchScope === 'strip' ? 'stripTabSearch' : s.tabSearchScope === 'group' ? 'groupTabSearch' : s.tabSearchScope === 'groups' ? 'groupNameSearch' : 'masterTabSearch'; return s[p + 'Regex']; })(),
      tabSearchFlags:(() => { const p = s.tabSearchScope === 'strip' ? 'stripTabSearch' : s.tabSearchScope === 'group' ? 'groupTabSearch' : s.tabSearchScope === 'groups' ? 'groupNameSearch' : 'masterTabSearch'; return s[p + 'Flags']; })(),
      closeTabSearch:() => { this.set('tabSearchOpen', false); const el = document.getElementById(s.tabSearchReturn); if (el) el.focus(); },
      openTabSearch:(scope, groupId) => this.setState({ tabSearchOpen:true, tabSearchScope:scope, tabSearchGroupId:groupId || '', tabSearchReturn:'tab-search-' + scope }),
      onTabSearchQuery:(e) => this.set((s.tabSearchScope === 'strip' ? 'stripTabSearch' : s.tabSearchScope === 'group' ? 'groupTabSearch' : s.tabSearchScope === 'groups' ? 'groupNameSearch' : 'masterTabSearch') + 'Query', e.target.value),
      toggleTabSearchRegex:() => { const p = s.tabSearchScope === 'strip' ? 'stripTabSearch' : s.tabSearchScope === 'group' ? 'groupTabSearch' : s.tabSearchScope === 'groups' ? 'groupNameSearch' : 'masterTabSearch'; this.set(p + 'Regex', !s[p + 'Regex']); },
      openTabSearchRegexBuilder:() => this.setState({ regexOpen:true, regexTarget:'nav', regexX:'34%', regexY:'150px' }),
      tabSearchResults:(() => { const scope=s.tabSearchScope, p=scope === 'strip' ? 'stripTabSearch' : scope === 'group' ? 'groupTabSearch' : scope === 'groups' ? 'groupNameSearch' : 'masterTabSearch', q=s[p + 'Query'] || ''; let hit=(text) => text.toLowerCase().includes(String(q).toLowerCase()); if (s[p + 'Regex'] && q) { try { const re=new RegExp(q, s[p + 'Flags'] || 'i'); hit=(text) => re.test(text); } catch { return []; } } const groupFor=(key) => s.groups.find(g => g.tabs.indexOf(key) >= 0); if (scope === 'groups') return s.groups.filter(g => hit(g.name)).map(g => ({ key:g.tabs[0] || 'dash', label:g.name, context:'Group · ' + g.tabs.length + ' tabs', groupId:g.id })); const keys=scope === 'group' ? ((s.groups.find(g => g.id === s.tabSearchGroupId) || { tabs:[] }).tabs) : s.tabs; return keys.filter(key => hit(s.tabNames[key] || (SCREENS[key] ? SCREENS[key].title : key))).map(key => { const g=groupFor(key); return { key, label:s.tabNames[key] || (SCREENS[key] ? SCREENS[key].title : key), context:(scope === 'master' ? 'Main window · ' : 'Current strip · ') + (g ? g.name : 'Ungrouped') + (s.pinned.indexOf(key) >= 0 ? ' · Pinned' : ''), groupId:g ? g.id : '' }; }); })(),
      activateTabSearch:(r) => { const key=r.key; this.setState({ tabSearchOpen:false, tabSearchRevealTab:key, screen:key, railId:SCREENS[key] ? SCREENS[key].rail : s.railId }, () => { const el=document.getElementById('tab-' + key); if (el) el.focus(); }); },
      tabGroups:s.groups.map(g => ({`;
const revealMarker = "return !(g && (g.collapsed || g.hidden)); }).map((k) => {";
const revealReplacement = "return !(g && (g.collapsed || g.hidden) && s.tabSearchRevealTab !== k); }).map((k) => {";
for (const [before, after, name] of [[searchStateMarker, searchStateReplacement, 'tab search state'], [searchRenderMarker, searchRenderReplacement, 'tab search render values'], [revealMarker, revealReplacement, 'collapsed search reveal']]) {
  if (!shell.includes(before)) throw new Error(`PBX M3 extension could not find ${name} marker.`);
  shell = shell.replace(before, after);
}
const searchButtonMarker = '        h("div", { role: `tablist`, "aria-label": `Open tabs`, onKeyDown: fn(v.tabsKeyDown), style: sty(`display:contents;`) },';
const searchButtonReplacement = `        h("div", { style: sty(\`display:flex; gap:4px; align-items:center;\`) },
          h("button", { id: \`tab-search-strip\`, onClick: fn(() => v.openTabSearch('strip')), title: \`Search this tab strip\`, style: sty(\`background:transparent; border:0; color:#9FF7C4; cursor:pointer;\`) }, "search"),
          h("button", { id: \`tab-search-groups\`, onClick: fn(() => v.openTabSearch('groups')), title: \`Search tab groups\`, style: sty(\`background:transparent; border:0; color:#9FF7C4; cursor:pointer;\`) }, "group_work"),
          h("button", { id: \`tab-search-master\`, onClick: fn(() => v.openTabSearch('master')), title: \`Search every open tab\`, style: sty(\`background:transparent; border:0; color:#9FF7C4; cursor:pointer;\`) }, "travel_explore")
        ),
${searchButtonMarker}`;
if (!shell.includes(searchButtonMarker)) throw new Error('PBX M3 extension could not find tab search trigger marker.');
shell = shell.replace(searchButtonMarker, searchButtonReplacement);
const groupMenuMarker = "{ icon:'edit', label:'Rename group…', hint:'F2', run:() => { close(); this.setState({ renameOpen:true, renameKey:'group:' + g.id, renameValue:g.name }); } },";
const groupMenuReplacement = `${groupMenuMarker}\n            { icon:'search', label:'Search this group…', hint:'⌃F', run:() => { close(); this.setState({ tabSearchOpen:true, tabSearchScope:'group', tabSearchGroupId:g.id, tabSearchReturn:'tab-search-group-' + g.id }); } },`;
if (!shell.includes(groupMenuMarker)) throw new Error('PBX M3 extension could not find group search menu marker.');
shell = shell.replace(groupMenuMarker, groupMenuReplacement);
const searchOverlayMarker = '      (v.tabFilterOpen ? F(';
const searchOverlay = `      (v.tabSearchOpen ? F(
        h("div", { onClick: fn(v.closeTabSearch), style: sty(\`position:absolute; inset:0; background:rgba(0,0,0,.45); z-index:82;\`) }),
        h("div", { role: \`dialog\`, "aria-label": \`Tab search\`, style: sty(\`position:absolute; left:50%; top:92px; transform:translateX(-50%); width:560px; max-height:70vh; overflow:auto; background:#252B25; border-radius:20px; padding:20px; z-index:83;\`) },
          h("div", { style: sty(\`display:flex; gap:6px; flex-wrap:wrap;\`) }, A(v.tabSearchScopes).map(($scope, $scope$i) => R($scope$i, h("button", { onClick: fn($scope.pick), style: sty(\`background:#141A15; color:#DFE4DC; border:1px solid #414942; border-radius:8px; padding:7px 10px;\`) }, S($scope.label))))),
          h("div", { style: sty(\`display:flex; gap:8px; margin-top:12px;\`) },
            h("input", { type: \`text\`, value: v.tabSearchQuery, onChange: fn(v.onTabSearchQuery), onInput: fn(v.onTabSearchQuery), placeholder: \`Search tabs\`, style: sty(\`flex:1;\`) }),
            h("button", { onClick: fn(v.toggleTabSearchRegex), title: \`Use regex\` }, S(v.tabSearchRegex ? 'Regex' : 'Plain text')),
            h("button", { onClick: fn(v.openTabSearchRegexBuilder), title: \`Open regex builder\` }, "data_object")
          ),
          h("div", { style: sty(\`margin-top:12px; display:flex; flex-direction:column; gap:6px;\`) }, A(v.tabSearchResults).map(($result, $result$i) => R($result$i, h("button", { onClick: fn(() => v.activateTabSearch($result)), style: sty(\`text-align:left; background:#141A15; color:#DFE4DC; border:1px solid #414942; border-radius:8px; padding:9px;\`) }, S($result.label + ' · ' + $result.context)))))
        )
      ) : null),
`;
if (!shell.includes(searchOverlayMarker)) throw new Error('PBX M3 extension could not find tab search overlay marker.');
shell = shell.replace(searchOverlayMarker, searchOverlay + searchOverlayMarker);
const methodsMarker = "      newTab:() => { const next = ORDER.find(k => s.tabs.indexOf(k) < 0) || 'dash';";
const methods = `      tabSearchPrefix:(scope) => scope === 'strip' ? 'stripTabSearch' : scope === 'group' ? 'groupTabSearch' : scope === 'groups' ? 'groupNameSearch' : 'masterTabSearch',
      tabSearchValue:(kind) => s[(s.tabSearchScope === 'strip' ? 'stripTabSearch' : s.tabSearchScope === 'group' ? 'groupTabSearch' : s.tabSearchScope === 'groups' ? 'groupNameSearch' : 'masterTabSearch') + kind],
      setTabSearchValue:(kind, value) => this.set((s.tabSearchScope === 'strip' ? 'stripTabSearch' : s.tabSearchScope === 'group' ? 'groupTabSearch' : s.tabSearchScope === 'groups' ? 'groupNameSearch' : 'masterTabSearch') + kind, value),
      openTabSearch:(scope, groupId = '') => this.setState({ tabSearchOpen:true, tabSearchScope:scope, tabSearchGroupId:groupId, tabSearchReturn:scope === 'group' ? 'tab-search-group-' + groupId : 'tab-search-' + scope }),
      tabSearchResults:() => { const scope = s.tabSearchScope, prefix = scope === 'strip' ? 'stripTabSearch' : scope === 'group' ? 'groupTabSearch' : scope === 'groups' ? 'groupNameSearch' : 'masterTabSearch', q = s[prefix + 'Query'] || '', regex = !!s[prefix + 'Regex'], flags = s[prefix + 'Flags'] || 'i'; let matcher = (text) => text.toLowerCase().includes(String(q).toLowerCase()); if (regex && q) { try { const re = new RegExp(q, flags); matcher = (text) => re.test(text); } catch { return []; } } const groupFor = (key) => s.groups.find(g => g.tabs.indexOf(key) >= 0); if (scope === 'groups') return s.groups.filter(g => matcher(g.name)).map(g => ({ key:g.tabs[0] || 'dash', label:g.name, context:'Group · ' + g.tabs.length + ' tabs', groupId:g.id })); const keys = scope === 'group' ? ((s.groups.find(g => g.id === s.tabSearchGroupId) || { tabs:[] }).tabs) : s.tabs; return keys.filter(key => matcher(s.tabNames[key] || (SCREENS[key] ? SCREENS[key].title : key))).map(key => { const g = groupFor(key); return { key, label:s.tabNames[key] || (SCREENS[key] ? SCREENS[key].title : key), context:(scope === 'master' ? 'Main window · ' : 'Current strip · ') + (g ? g.name : 'Ungrouped') + (s.pinned.indexOf(key) >= 0 ? ' · Pinned' : ''), groupId:g ? g.id : '' }; }); },
      activateTabSearch:(result) => { const key = result.key; this.setState({ tabSearchOpen:false, tabSearchRevealTab:key, screen:key, railId:SCREENS[key] ? SCREENS[key].rail : s.railId }, () => { const el = document.getElementById('tab-' + key); if (el) el.focus(); }); },
${methodsMarker}`;
if (!shell.includes(methodsMarker)) throw new Error('PBX M3 extension could not find tab search method marker.');
shell = shell.replace(methodsMarker, methods);
await writeFile(consolePath, shell, 'utf8');
console.log(`extended compiled console interactions -> ${consolePath}`);
