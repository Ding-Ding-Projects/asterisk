/** Canonical attention inventories. These records are source contracts, not summaries. */

export type AttentionSeverity = 'info' | 'warning' | 'error';
export type AttentionClockEffect = 'recorded' | 'passive';
export type AttentionSourceOwner = 'design' | 'app' | 'generated' | 'module';
export interface AttentionMarker { readonly owner:AttentionSourceOwner; readonly text:string; }
/** A row whose control is rendered outside the checked-in design still records why. */
export interface NoDesignControl { readonly owner:'none'; readonly reason:string; readonly absentFromDesign:string; }
export interface AttentionWiringRow { readonly id:string; readonly control:string; readonly mode:string|null; readonly controlDeclaration?:AttentionMarker; readonly designMarker?:AttentionMarker|NoDesignControl; readonly controlConstruction:AttentionMarker; readonly durableKey:AttentionMarker; readonly writerMarkers:readonly AttentionMarker[]; readonly setterMarkers:readonly AttentionMarker[]; readonly consumerMarkers:readonly AttentionMarker[]; }
const marker = (owner:AttentionSourceOwner, text:string): AttentionMarker => ({ owner, text });
export const ATTENTION_WIRING: readonly AttentionWiringRow[] = [
  { id:'focus', control:'att_focus', mode:'focus', controlDeclaration:marker('design',"ctl('att_focus','Focus','switch',false"), controlConstruction:marker('app',"'att_focus': 'focus'"), durableKey:marker('module',"focus: 'console.attention.focus'"), writerMarkers:[marker('app',"control?.id?.startsWith('att_') && typeof value === 'boolean'"), marker('app',"setModeEnabled(this.durableStorage.storage, mode, value);"), marker('app',"this.attentionWrite(`${MODE_SETTING_PREFIX}${mode}`, value ? 'on' : 'off');"), marker('generated',"this.onUserMutation('control:' + (c.id || 'unknown'));" )], setterMarkers:[marker('app',"setModeEnabled(this.durableStorage.storage, mode, value);")], consumerMarkers:[marker('module',"dimInactive: modeEnabled(storage, 'focus'),"), marker('app','[data-attention-inactive="true"] { opacity'), marker('app',"element.dataset.attentionInactive = presentation.dimInactive ? 'true' : 'false';")] },
  { id:'low-stimulation', control:'att_low', mode:'lowStimulation', controlDeclaration:marker('design',"ctl('att_low','Low stimulation','switch',false"), controlConstruction:marker('app',"'att_low': 'lowStimulation'"), durableKey:marker('module',"lowStimulation: 'console.attention.lowStimulation'"), writerMarkers:[marker('app',"control?.id?.startsWith('att_') && typeof value === 'boolean'"), marker('app',"setModeEnabled(this.durableStorage.storage, mode, value);"), marker('app',"this.attentionWrite(`${MODE_SETTING_PREFIX}${mode}`, value ? 'on' : 'off');"), marker('generated',"this.onUserMutation('control:' + (c.id || 'unknown'));" )], setterMarkers:[marker('app',"setModeEnabled(this.durableStorage.storage, mode, value);")], consumerMarkers:[marker('module',"reduceMotion: low || platform.prefersReducedMotion === true,"), marker('module',"quietNotifications: low,"), marker('app',"document.body.classList.toggle('attention-low-stimulation', presentation.quietNotifications);"), marker('app',"private gatedToast = (message: string, severity: NotificationSeverity = 'info'): void => {"), marker('app',"const suppressed = this.consoleSetting<boolean>('nt_toast', true) === false\n      || (severity === 'info' && this.attentionPresentation().quietNotifications);"), marker('app',"this.recordNotification('toast', message, severity, suppressed ? 'suppressed' : 'delivered');"), marker('app',"private narratedFire = ("), marker('app',"const suppressed = severity === 'info' && this.attentionPresentation().quietNotifications;"), marker('app',"this.recordNotification('notice', message, severity, suppressed ? 'suppressed' : 'delivered');")] },
  { id:'time-awareness', control:'att_time', mode:'timeAwareness', controlDeclaration:marker('design',"ctl('att_time','Time awareness','switch',false"), controlConstruction:marker('app',"'att_time': 'timeAwareness'"), durableKey:marker('module',"timeAwareness: 'console.attention.timeAwareness'"), writerMarkers:[marker('app',"control?.id?.startsWith('att_') && typeof value === 'boolean'"), marker('app',"setModeEnabled(this.durableStorage.storage, mode, value);"), marker('app',"this.attentionWrite(`${MODE_SETTING_PREFIX}${mode}`, value ? 'on' : 'off');"), marker('generated',"this.onUserMutation('control:' + (c.id || 'unknown'));" )], setterMarkers:[marker('app',"setModeEnabled(this.durableStorage.storage, mode, value);")], consumerMarkers:[marker('module',"showElapsedTime: modeEnabled(storage, 'timeAwareness'),"), marker('app',"!presentation.showElapsedTime ? null : h('p', { className: 'attn-rail-time' },"), marker('app','Open for'), marker('app','Last change')] },
  { id:'one-thing', control:'att_one', mode:'oneThing', controlDeclaration:marker('design',"ctl('att_one','One thing at a time','switch',false"), controlConstruction:marker('app',"'att_one': 'oneThing'"), durableKey:marker('module',"oneThing: 'console.attention.oneThing'"), writerMarkers:[marker('app',"control?.id?.startsWith('att_') && typeof value === 'boolean'"), marker('app',"setModeEnabled(this.durableStorage.storage, mode, value);"), marker('app',"this.attentionWrite(`${MODE_SETTING_PREFIX}${mode}`, value ? 'on' : 'off');"), marker('generated',"this.onUserMutation('control:' + (c.id || 'unknown'));" )], setterMarkers:[marker('app',"setModeEnabled(this.durableStorage.storage, mode, value);")], consumerMarkers:[marker('module',"showNextAction: modeEnabled(storage, 'oneThing'),"), marker('app',"!presentation.showNextAction ? null : h('div', { className: 'attn-rail-next' },"), marker('app',"value: nextAction(storage),"), marker('app',"setNextAction(storage, event.target.value);")] },
  { id:'momentum', control:'att_momentum', mode:'momentum', controlDeclaration:marker('design',"ctl('att_momentum','Momentum','switch',false"), controlConstruction:marker('app',"'att_momentum': 'momentum'"), durableKey:marker('module',"momentum: 'console.attention.momentum'"), writerMarkers:[marker('app',"control?.id?.startsWith('att_') && typeof value === 'boolean'"), marker('app',"setModeEnabled(this.durableStorage.storage, mode, value);"), marker('app',"this.attentionWrite(`${MODE_SETTING_PREFIX}${mode}`, value ? 'on' : 'off');"), marker('generated',"this.onUserMutation('control:' + (c.id || 'unknown'));" )], setterMarkers:[marker('app',"setModeEnabled(this.durableStorage.storage, mode, value);")], consumerMarkers:[marker('module',"if (!modeEnabled(storage, 'momentum')) return quiet;"), marker('app',"const prompt = momentumPrompt("), marker('app',"onClick: () => { snoozeMomentum(storage); this.forceUpdate(); },"), marker('app',"className: 'attn-rail-momentum-dismiss'")] },
  /* Re-derived 2026-08-27 against the control that exists. Every one of this row's six
   * markers named text that occurs nowhere in the tree: there is no `att_next` control in
   * the design, none in App.tsx, and none in the compiled renderer. The row described a
   * design text control nobody ever built, and it was never caught because
   * `verifyAttentionWiring` sits behind `verify-inventories.mjs`, which was failing on the
   * site registry's schema long before it reached here.
   *
   * The FEATURE is real and this row now points at it. "One thing at a time" renders its
   * next-action field itself, in the attention rail in App.tsx -- `attn-rail-next-input`,
   * shown when `showNextAction` is on, reading `nextAction(storage)` and writing through
   * `setNextAction`. It is not a design `ctl()` and never was, which is why the field this
   * marker sits in is named `controlDeclaration` rather than `designMarker`: five of these
   * six controls are declared in the design and this one is declared by the application. */
  /* The one-thing field is rendered by App.tsx in the attention rail, not as a design ctl(). */
  { id:'next-action', control:'attn-rail-next-input', mode:null, designMarker:{ owner:'none', reason:"the one-thing field is rendered by App.tsx inside the attention rail, not drawn as a ctl() on the Attention settings screen, so the design has no control for it to name", absentFromDesign:'att_next' }, controlConstruction:marker('app',"className: 'attn-rail-next-input',"), durableKey:marker('module',"nextAction: 'console.attention.nextAction'"), writerMarkers:[marker('app',"setNextAction(storage, event.target.value);")], setterMarkers:[marker('module',"export function setNextAction(storage: ModeStorage, value: string): void {"), marker('module',"const trimmed = value.trim().slice(0, NEXT_ACTION_MAX_LENGTH);")], consumerMarkers:[marker('app',"value: nextAction(storage),"), marker('app',"'aria-label': 'The one thing you are doing right now',"), marker('module',"export function nextAction(storage: ModeStorage | undefined): string {")] }
];
/**
 * The twelve state keys the compiled shell writes through `set()` that hold the user's
 * own work, each beside the exact text in the compiled renderer that mutates it.
 *
 * `generatedMutation` is what makes this a record rather than a wish. The rows used to
 * carry only the three name fields, and the check searched the compiled renderer for the
 * literal `action: 'set', key: 'canvasTool', state: 'canvasTool'` -- an object shape that
 * appears in no commit of that file, ever, so the check could not pass and had never run
 * against anything real. Behind the unpassable shape was a real gap, and a larger one
 * than the list suggested: nothing called `onUserMutation` for any of these keys, and
 * the method the compiled shell calls was declared nowhere at all.
 *
 * Four of the twelve are toggled through a computed key, `this.set(t.k, !s[t.k])`, which
 * is why grepping the renderer for `set('grid'` finds nothing and why an earlier reading
 * concluded that only eight of the twelve went through `set()`. All twelve do. Those four
 * record the control declaration that supplies the key instead, and the one dispatch they
 * share is checked separately below.
 */
export const ATTENTION_MUTATION_ACTIONS = [
  { action:'set', key:'canvasTool', state:'canvasTool', generatedMutation:"this.set('canvasTool'" },
  { action:'set', key:'grid', state:'grid', generatedMutation:"label:'Grid', k:'grid'" },
  { action:'set', key:'snap', state:'snap', generatedMutation:"label:'Snap', k:'snap'" },
  { action:'set', key:'guides', state:'guides', generatedMutation:"label:'Guides', k:'guides'" },
  { action:'set', key:'minimap', state:'minimap', generatedMutation:"label:'Minimap', k:'minimap'" },
  { action:'set', key:'layer', state:'layer', generatedMutation:"this.set('layer'" },
  { action:'set', key:'zoom', state:'zoom', generatedMutation:"this.set('zoom'" },
  { action:'set', key:'pinned', state:'pinned', generatedMutation:"this.set('pinned'" },
  { action:'set', key:'dock', state:'dock', generatedMutation:"this.set('dock'" },
  { action:'set', key:'fullscreen', state:'fullscreen', generatedMutation:"this.set('fullscreen'" },
  { action:'set', key:'branch', state:'branch', generatedMutation:"this.set('branch'" },
  { action:'set', key:'sortList', state:'sortList', generatedMutation:"this.set('sortList'" },
] as const;
/** The single dispatch the four computed-key toggles above share. Checked on its own,
 *  because no per-key marker can stand for a call that never names a key. */
export const ATTENTION_COMPUTED_TOGGLE_DISPATCH = 'pick:() => this.set(t.k, !s[t.k])';
/**
 * The subclass half of the compiled shell's mutation contract, in the exact text each
 * part must have. The shell calls `onUserMutation`; `App` has to declare it and to route
 * `set()` through it, and neither of those was true.
 */
export const ATTENTION_MUTATION_HOOK_MARKERS: readonly AttentionMarker[] = [
  marker('generated', "this.onUserMutation('control:' + (c.id || 'unknown'));"),
  marker('app', "onUserMutation = (_source: string = 'unknown'): void => {"),
  marker('app', 'private static readonly SET_MUTATION_KEYS: ReadonlySet<string> = new Set('),
  marker('app', "ATTENTION_MUTATION_ACTIONS.filter((action) => action.action === 'set').map((action) => action.key),"),
  marker('app', 'const changed = App.SET_MUTATION_KEYS.has(key)'),
  marker('app', "if (changed) this.onUserMutation('set:' + key);"),
];
export interface AttentionMutationInventoryRow { readonly file:string; readonly line:number; readonly argument:string; readonly occurrence:number; readonly state:string; readonly clockEffect:AttentionClockEffect; }
export const ATTENTION_MUTATION_INVENTORY: readonly AttentionMutationInventoryRow[] = [
  /* Fourteen of these fifteen rows named a call `App.tsx` did not contain, and the reason
   * turned out to be worth more than the drift: the calls were not aspirational, they were
   * LOST. `git show 83ec555d0:console/app/renderer/src/App.tsx` has every one of them, at
   * the same handlers, and the consolidation merge that produced `246b2bc7a` dropped all
   * fourteen while leaving this inventory behind as their only surviving record. That is
   * the same accident, in the same merge, that took `onUserMutation` itself.
   *
   * They are restored, at the handlers they came from, and the line numbers here are
   * re-measured against the current file rather than carried over. What each one costs
   * when it is missing is concrete: adding a server, writing an endpoint, filing a ticket
   * or pairing an authenticator would not reset the attention clock, so Momentum would
   * prompt "nothing has changed here for 40 minutes" at somebody who had just done the
   * most substantial thing this application does.
   *
   * One row is deliberately NOT restored, and its absence is the honest one. */
  { file: 'App.tsx', line: 1005, argument: "'set:' + key", occurrence: 1, state: 'canvasAndLayoutKeys', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 1570, argument: "'vocabulary-load'", occurrence: 1, state: 'vocabularyCache', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 1589, argument: "'vocabulary-clear'", occurrence: 1, state: 'vocabularyCache', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 1878, argument: "'support-ticket'", occurrence: 1, state: 'supportTickets', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 3781, argument: "'server-add'", occurrence: 1, state: 'servers', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 3794, argument: "'server-remove'", occurrence: 1, state: 'servers', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 3855, argument: "'onboarding-connect'", occurrence: 1, state: 'servers', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 3934, argument: "'onboarding-deploy'", occurrence: 1, state: 'runtimeConfiguration', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 4391, argument: "'authenticator-pair'", occurrence: 1, state: 'authenticator', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 4430, argument: "'lock-create'", occurrence: 1, state: 'locks', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 4486, argument: "'lock-remove'", occurrence: 1, state: 'locks', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 4672, argument: "'endpoint-write'", occurrence: 1, state: 'endpointConfiguration', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 8446, argument: "'appearance-random'", occurrence: 1, state: 'appearance', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 8463, argument: "'appearance-reset'", occurrence: 1, state: 'appearance', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 8469, argument: "'appearance-save'", occurrence: 1, state: 'appearance', clockEffect: 'recorded' },
  /* The row that was here was `'attention-history-clear'`, against `state: 'noticeHistory'`.
   * It is not restored because there is nothing to restore it INTO: the whole attention
   * notice-history feature it belonged to is gone from this tree. `attentionClearHistory`,
   * `attentionRecordNotice`, `attentionNoticeHistory` and `attentionExportHistory` were
   * added by `b64c3dbd6` -- searchable, clearable, exportable warning and error history --
   * and no longer exist anywhere in `app/renderer/src`. Only the storage key survives, in
   * `attention-modes.ts` as `ATTENTION_STORAGE_KEYS.noticeHistory`.
   *
   * Keeping the row would have meant either a permanently red gate or a verifier taught to
   * tolerate a row it cannot find, and the second is how a completeness check quietly stops
   * checking. The loss is recorded on the roadmap as its own item instead, which is a place
   * somebody reads on purpose rather than a comment beside a list it is not on. */
  { file: 'generated/console.tsx', line: 4647, argument: "'control:' + (c.id || 'unknown')", occurrence: 1, state: 'controlValues', clockEffect: 'recorded' },
];

/**
 * The forty-five generated-shell mutation call sites that a consolidation merge deleted.
 *
 * This is a record, not an inventory: nothing here is expected to exist, and the test beside
 * it asserts that none of it does. Deleting these rows outright would have been the tidy
 * thing to do and would have destroyed the only surviving description of what was lost, so
 * they are kept as data a check can read rather than as a paragraph nobody can verify.
 *
 * How they were lost, measured rather than guessed. Commits 83ec555d0 and b64c3dbd6 carry 46
 * and 47 onUserMutation calls in generated/console.tsx; 246b2bc7a carries 1, and so does
 * every commit after it. Neither compile-design.mjs nor extend-pbx-m3.mjs injected a single
 * one of them at those commits -- so the generated file had been HAND-EDITED, which
 * is exactly what the drift check now forbids, and regenerating it swept every edit away.
 * That is worth stating plainly: the merge did not introduce this defect on its own. It
 * removed edits that could not have survived the first honest recompile either way.
 *
 * Restoring them therefore means adding an anchored patch per call to extend-pbx-m3.mjs,
 * forty-five times, each one proved against the compiled output. That is its own pass and it
 * is on the roadmap. Until it runs, the attention clock is reset by ordinary control changes
 * and by the fifteen App-side mutations above, and NOT by the shell-owned ones listed here --
 * canvas moves, tab and group operations, layout docking, preset picks.
 */
export const ATTENTION_MUTATION_INVENTORY_LOST: readonly AttentionMutationInventoryRow[] = [
  { file: 'generated/console.tsx', line: 4022, argument: "'set:' + k", occurrence: 1, state: 'generatedUserMutationKey', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4160, argument: "'layout:resize'", occurrence: 1, state: 'dlgSize', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4167, argument: "'layout:move'", occurrence: 1, state: 'dlgPos', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4222, argument: "'layout:dock'", occurrence: 1, state: 'dlgDock', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4355, argument: "'appearance:random'", occurrence: 1, state: 'appearanceValues', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4368, argument: "'appearance:colour'", occurrence: 1, state: 'tabColoursOrGroups', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4381, argument: "'lock:unlock'", occurrence: 1, state: 'locks', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4385, argument: "'canvas:edge'", occurrence: 1, state: 'edgeList', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4394, argument: "'canvas:move'", occurrence: 1, state: 'nodePos', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4667, argument: "'canvas:drop'", occurrence: 1, state: 'nodePos', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4671, argument: "'canvas:auto-arrange'", occurrence: 1, state: 'nodePos', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4672, argument: "'canvas:align'", occurrence: 1, state: 'nodePos', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4673, argument: "'canvas:distribute'", occurrence: 1, state: 'nodePos', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4675, argument: "'canvas:undo-layout'", occurrence: 1, state: 'nodePos', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4679, argument: "'canvas:edge-from'", occurrence: 1, state: 'edgeList', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4680, argument: "'canvas:edge-to'", occurrence: 1, state: 'edgeList', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4681, argument: "'canvas:edge-delete'", occurrence: 1, state: 'edgeList', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4683, argument: "'canvas:edge-add'", occurrence: 1, state: 'edgeList', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4861, argument: "'group:toggle'", occurrence: 1, state: 'groups', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4871, argument: "'group:rename'", occurrence: 1, state: 'groups', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4875, argument: "'tab:rename'", occurrence: 1, state: 'tabNames', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4948, argument: "'tabs:close-colour'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4959, argument: "'tabs:close-filter'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4984, argument: "'tabs:reorder'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4993, argument: "'tabs:group'", occurrence: 1, state: 'groupsAndTabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4998, argument: "'tabs:close'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5002, argument: "'tabs:new'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5033, argument: "'preset:max-fun'", occurrence: 1, state: 'values', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5034, argument: "'preset:zero-fun'", occurrence: 1, state: 'values', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5042, argument: "'appearance:reroll'", occurrence: 1, state: 'rndNonce', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5293, argument: "'group:update'", occurrence: 1, state: 'groups', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5320, argument: "'tabs:close-left'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5321, argument: "'tabs:close-right'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5322, argument: "'tabs:close-others'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5326, argument: "'tabs:close-uncoloured'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5327, argument: "'tabs:close-unpinned'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5350, argument: "'group:update'", occurrence: 2, state: 'groups', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5358, argument: "'group:ungroup'", occurrence: 1, state: 'groups', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5359, argument: "'group:close'", occurrence: 1, state: 'groupsAndTabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5373, argument: "'tabs:duplicate'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5374, argument: "'tabs:close'", occurrence: 2, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5376, argument: "'tabs:group-by-area'", occurrence: 1, state: 'groupsAndTabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5419, argument: "'tabs:new-here'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5519, argument: "'appearance:reset'", occurrence: 1, state: 'values', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5617, argument: "'preset:super-easy'", occurrence: 1, state: 'valuesAndOnboarding', clockEffect: 'recorded' },
];
export const ATTENTION_MUTATION_PASSIVE_EXCLUSIONS = [
  { id:'navigation', description:'screen and rail navigation does not change user data' }, { id:'passive-read', description:'PBX reads and refresh timers do not change user data' }, { id:'selection', description:'row, tab, and palette selection does not persist user data' }, { id:'overlay', description:'opening, closing, and moving transient overlays is not a durable mutation' }, { id:'timer', description:'elapsed-time and notification timers do not change user data' },
] as const;
export interface AttentionSeverityProducerSite { readonly id:string; readonly file:string; readonly line:number; readonly column:number; readonly source:string; readonly helper:string; readonly marker:string; readonly occurrence:number; readonly severity:AttentionSeverity; readonly passive:boolean; }
const LEGACY_APP_SEVERITY_PRODUCER_SITES = [
  [863, 9, 'notifyMessage', 'info', false],
  [866, 11, 'notifyEvent', 'error', false],
  [900, 13, 'notifyMessage', 'info', false],
  [902, 16, 'notifyEvent', 'error', false],
  [904, 32, 'notifyEvent', 'error', false],
  [913, 9, 'notifyMessage', 'info', false],
  [920, 11, 'notifyEvent', 'warning', false],
  [923, 9, 'notifyMessage', 'info', false],
  [926, 11, 'notifyEvent', 'error', false],
  [934, 9, 'notifyEvent', 'info', false],
  [971, 11, 'notifyEvent', 'error', false],
  [976, 9, 'notifyEvent', 'info', false],
  [1021, 13, 'notifyEvent', 'error', false],
  [1027, 11, 'notifyMessage', 'info', false],
  [1037, 11, 'notifyMessage', 'info', false],
  [1106, 11, 'notifyEvent', 'info', false],
  [1108, 14, 'notifyEvent', 'error', false],
  [1114, 24, 'notifyEvent', 'error', false],
  [1119, 11, 'notifyEvent', 'info', false],
  [1121, 14, 'notifyEvent', 'error', false],
  [1180, 11, 'notifyEvent', 'info', false],
  [1186, 11, 'notifyEvent', 'error', false],
  [1198, 13, 'notifyEvent', 'warning', false],
  [1201, 11, 'notifyMessage', 'info', false],
  [1204, 13, 'notifyEvent', 'error', false],
  [1209, 13, 'notifyEvent', 'warning', false],
  [1228, 11, 'notifyEvent', 'warning', false],
  [1243, 17, 'notifyEvent', 'error', false],
  [1254, 15, 'notifyEvent', 'info', false],
  [1283, 23, 'notifyEvent', 'warning', false],
  [1285, 26, 'notifyEvent', 'warning', false],
  [1289, 9, 'notifyMessage', 'info', false],
  [1324, 13, 'notifyEvent', 'warning', false],
  [1348, 11, 'notifyEvent', 'info', false],
  [1355, 9, 'notifyEvent', 'info', false],
  [1440, 9, 'notifyEvent', 'info', false],
  [1459, 45, 'notifyWarning', 'warning', false],
  [1460, 57, 'notifyWarning', 'warning', false],
  [1461, 50, 'notifyWarning', 'warning', false],
  [1469, 9, 'notifyMessage', 'info', false],
  [1497, 15, 'notifyWarning', 'warning', false],
  [1501, 15, 'notifyWarning', 'warning', false],
  [1505, 13, 'notifyWarning', 'warning', false],
  [1508, 11, 'notifyWarning', 'warning', false],
  [1528, 9, 'notifyEvent', 'info', false],
  [1542, 11, 'notifyInfo', 'info', false],
  [1548, 11, 'notifyWarning', 'warning', false],
  [1554, 9, 'notifyWarning', 'warning', false],
  [1560, 48, 'notifyEvent', 'warning', false],
  [1562, 32, 'notifyEvent', 'error', false],
  [1563, 42, 'notifyMessage', 'info', false],
  [1570, 48, 'notifyEvent', 'warning', false],
  [1573, 35, 'notifyEvent', 'error', false],
  [1585, 33, 'notifyEvent', 'error', false],
  [1594, 11, 'notifyEvent', 'info', false],
  [1602, 29, 'notifyEvent', 'error', false],
  [1604, 29, 'notifyEvent', 'error', false],
  [1609, 9, 'notifyEvent', 'info', false],
  [1745, 38, 'notifyWarningEvent', 'warning', false],
  [2144, 19, 'notifyMessage', 'info', false],
  [2165, 9, 'notifyEvent', 'info', false],
  [2182, 9, 'notifyMessage', 'info', false],
  [2188, 9, 'notifyEvent', 'info', false],
  [2196, 11, 'notifyWarning', 'warning', false],
  [2207, 9, 'notifyMessage', 'info', false],
  [2250, 19, 'notifyError', 'error', true],
  [2250, 72, 'notifyWarning', 'warning', true],
  [2250, 102, 'notifyInfo', 'warning', true],
  [2252, 19, 'notifyErrorEvent', 'error', true],
  [2252, 81, 'notifyWarningEvent', 'warning', true],
  [2252, 120, 'notifyInfoEvent', 'warning', true],
  [2274, 15, 'notifyEvent', 'warning', false],
  [2277, 13, 'notifyMessage', 'info', false],
  [2280, 17, 'notifyEvent', 'error', false],
  [2292, 17, 'notifyEvent', 'error', false],
  [2295, 15, 'notifyEvent', 'info', false],
  [2646, 17, 'notifyMessage', 'info', false],
  [2647, 17, 'notifyError', 'error', false]
] as const;
const LEGACY_GENERATED_SEVERITY_PRODUCER_SITES = [
  [4039, 9, 'notifyInfo', 'info', false],
  [4041, 114, 'notifyInfoEvent', 'info', false],
  [4042, 113, 'notifyWarning', 'warning', false],
  [4043, 38, 'notifyInfo', 'info', false],
  [4044, 30, 'notifyInfoEvent', 'info', false],
  [4143, 13, 'notifyInfoEvent', 'info', false],
  [4147, 28, 'notifyInfoEvent', 'info', false],
  [4148, 14, 'notifyInfo', 'info', false],
  [4356, 9, 'notifyInfoEvent', 'info', false],
  [4369, 9, 'notifyInfoEvent', 'info', false],
  [4377, 103, 'notifyWarning', 'warning', false],
  [4378, 119, 'notifyWarning', 'warning', false],
  [4382, 9, 'notifyInfoEvent', 'info', false],
  [4385, 142, 'notifyInfo', 'info', false],
  [4397, 63, 'notifyInfoEvent', 'info', false],
  [4546, 102, 'notifyInfo', 'info', false],
  [4616, 149, 'notifyInfo', 'info', false],
  [4657, 25, 'notifyInfo', 'info', false],
  [4658, 153, 'notifyInfoEvent', 'info', false],
  [4671, 152, 'notifyInfo', 'info', false],
  [4674, 90, 'notifyInfo', 'info', false],
  [4675, 135, 'notifyInfo', 'info', false],
  [4688, 75, 'notifyInfo', 'info', false],
  [4692, 63, 'notifyInfo', 'info', false],
  [4720, 15, 'notifyWarning', 'warning', false],
  [4770, 174, 'notifyInfo', 'info', false],
  [4872, 22, 'notifyInfo', 'info', false],
  [4876, 13, 'notifyInfo', 'info', false],
  [4895, 242, 'notifyInfo', 'info', false],
  [4945, 46, 'notifyInfo', 'info', false],
  [4949, 22, 'notifyInfo', 'info', false],
  [4960, 13, 'notifyInfo', 'info', false],
  [4994, 15, 'notifyInfoEvent', 'info', false],
  [5008, 128, 'notifyInfo', 'info', false],
  [5032, 141, 'notifyInfoEvent', 'info', false],
  [5033, 368, 'notifyInfoEvent', 'info', false],
  [5034, 218, 'notifyInfo', 'info', false],
  [5035, 180, 'notifyInfoEvent', 'info', false],
  [5042, 124, 'notifyInfo', 'info', false],
  [5045, 145, 'notifyInfo', 'info', false],
  [5048, 64, 'notifyInfoEvent', 'info', false],
  [5049, 64, 'notifyInfo', 'info', false],
  [5050, 62, 'notifyInfoEvent', 'info', false],
  [5051, 70, 'notifyInfo', 'info', false],
  [5053, 65, 'notifyInfo', 'info', false],
  [5079, 99, 'notifyInfo', 'info', false],
  [5080, 93, 'notifyInfo', 'info', false],
  [5081, 98, 'notifyInfoEvent', 'info', false],
  [5095, 23, 'notifyInfo', 'info', false],
  [5106, 32, 'notifyInfo', 'info', false],
  [5127, 101, 'notifyWarning', 'warning', false],
  [5128, 213, 'notifyInfoEvent', 'info', false],
  [5137, 135, 'notifyInfoEvent', 'info', false],
  [5138, 18, 'notifyWarning', 'warning', false],
  [5159, 58, 'notifyInfoEvent', 'info', false],
  [5160, 100, 'notifyWarning', 'warning', false],
  [5165, 99, 'notifyInfoEvent', 'info', false],
  [5165, 263, 'notifyInfo', 'info', false],
  [5183, 17, 'notifyInfoEvent', 'info', false],
  [5188, 57, 'notifyWarning', 'warning', false],
  [5188, 158, 'notifyInfoEvent', 'info', false],
  [5213, 17, 'notifyInfoEvent', 'info', false],
  [5271, 97, 'notifyInfoEvent', 'info', false],
  [5300, 84, 'notifyInfo', 'info', false],
  [5306, 85, 'notifyInfoEvent', 'info', false],
  [5307, 78, 'notifyInfo', 'info', false],
  [5308, 88, 'notifyInfoEvent', 'info', false],
  [5309, 84, 'notifyInfo', 'info', false],
  [5312, 80, 'notifyInfo', 'info', false],
  [5313, 92, 'notifyInfoEvent', 'info', false],
  [5314, 75, 'notifyInfo', 'info', false],
  [5315, 95, 'notifyInfo', 'info', false],
  [5358, 184, 'notifyInfo', 'info', false],
  [5376, 531, 'notifyInfoEvent', 'info', false],
  [5377, 111, 'notifyWarning', 'warning', false],
  [5389, 99, 'notifyInfo', 'info', false],
  [5399, 93, 'notifyInfo', 'info', false],
  [5400, 96, 'notifyInfoEvent', 'info', false],
  [5409, 96, 'notifyInfo', 'info', false],
  [5410, 101, 'notifyInfo', 'info', false],
  [5411, 194, 'notifyInfoEvent', 'info', false],
  [5422, 101, 'notifyInfo', 'info', false],
  [5487, 54, 'notifyWarning', 'warning', false],
  [5488, 66, 'notifyWarning', 'warning', false],
  [5492, 13, 'notifyInfo', 'info', false],
  [5495, 26, 'notifyInfo', 'info', false],
  [5508, 139, 'notifyInfoEvent', 'info', false],
  [5510, 121, 'notifyInfo', 'info', false],
  [5511, 68, 'notifyInfo', 'info', false],
  [5515, 71, 'notifyInfo', 'info', false],
  [5519, 133, 'notifyInfo', 'info', false],
  [5520, 67, 'notifyInfoEvent', 'info', false],
  [5521, 58, 'notifyInfo', 'info', false],
  [5522, 56, 'notifyInfo', 'info', false],
  [5602, 193, 'notifyInfo', 'info', false],
  [5606, 148, 'notifyInfoEvent', 'info', false],
  [5609, 101, 'notifyInfo', 'info', false],
  [5617, 322, 'notifyInfoEvent', 'info', false],
  [5631, 65, 'notifyInfo', 'info', false]
] as const;
type SeverityProducerTuple = readonly [number, number, string, AttentionSeverity, boolean, string];
const APP_SEVERITY_PRODUCER_SITES: readonly SeverityProducerTuple[] = [
  [905, 12, 'fire', 'error', false, "this.fire('The phone system did not start'"],
  [939, 14, 'notifyMessage', 'info', false, "this.onUserMutation('vocabulary-load');\n        this.notifyMessage(result.status);"],
  [941, 17, 'notifyEvent', 'error', false, "notifyEvent('Vocabulary file rejected'"],
  [943, 33, 'notifyEvent', 'error', false, "notifyEvent('Vocabulary file not read'"],
  [952, 10, 'notifyMessage', 'info', false, "this.onUserMutation('vocabulary-clear');\n    this.notifyMessage(result.status);"],
  [959, 12, 'notifyEvent', 'warning', false, "notifyEvent('No target connected'"],
  [966, 12, 'notifyEvent', 'error', false, "notifyEvent('Not done'"],
  [1028, 12, 'notifyEvent', 'error', false, "notifyEvent('That ticket will not file'"],
  [1033, 10, 'notifyEvent', 'info', false, "notifyEvent(`Ticket ${result.id} — ${result.status}`"],
  [1078, 14, 'notifyEvent', 'error', false, "notifyEvent('That name will not work'"],
  [1084, 12, 'notifyMessage', 'info', false, "notifyMessage(`Name restored to ${IDENTITY.productName}`"],
  [1094, 12, 'notifyMessage', 'info', false, "notifyMessage('Editor choice forgotten'"],
  [1214, 12, 'notifyEvent', 'info', false, "notifyEvent('Connection added'"],
  [1216, 15, 'notifyEvent', 'error', false, "notifyEvent('Not added'"],
  [1222, 25, 'notifyEvent', 'error', false, "notifyEvent('Not found'"],
  [1227, 12, 'notifyEvent', 'info', false, "notifyEvent('Connection removed'"],
  [1229, 15, 'notifyEvent', 'error', false, "else this.notifyEvent('Not removed'"],
  [1307, 12, 'notifyEvent', 'error', false, "notifyEvent('Not connected'"],
  [1319, 14, 'notifyEvent', 'warning', false, "notifyEvent('No target', `Nothing is connected"],
  [1322, 12, 'notifyMessage', 'info', false, "notifyMessage('Creating the Asterisk runtime for the wizard"],
  [1325, 14, 'notifyEvent', 'error', false, "this.notifyEvent('Not created', provisioned"],
  [1330, 14, 'notifyEvent', 'warning', false, "notifyEvent('No target', 'The runtime was created"],
  [1356, 12, 'notifyEvent', 'warning', false, "notifyEvent('Nothing to change'"],
  [1375, 18, 'notifyEvent', 'error', false, "notifyEvent('Deploy not applied'"],
  [1386, 16, 'notifyEvent', 'info', false, "notifyEvent('Deployed', deployedBody"],
  [1429, 24, 'notifyEvent', 'warning', false, "notifyEvent('Not loaded', 'The pjsip.conf on this target"],
  [1431, 27, 'notifyEvent', 'warning', false, "notifyEvent('Not loaded', `${name} is not in this target's"],
  [1471, 14, 'notifyEvent', 'warning', false, "notifyEvent('Nothing to export'"],
  [1495, 12, 'notifyEvent', 'info', false, "notifyEvent('Exported', noticeBody"],
  [1502, 10, 'notifyEvent', 'info', false, 'notifyEvent(verb, message);'],
  [1587, 10, 'notifyEvent', 'info', false, "notifyEvent('Authenticator paired'"],
  [1606, 46, 'notifyWarning', 'warning', false, "notifyWarning('Set at least a four-digit PIN first'"],
  [1607, 58, 'notifyWarning', 'warning', false, "notifyWarning('Set a passphrase first'"],
  [1608, 51, 'notifyWarning', 'warning', false, "notifyWarning('Pair the built-in authenticator first'"],
  [1616, 10, 'notifyMessage', 'info', false, "notifyMessage(`${s.lockTarget} is locked with ${s.lockMethod}"],
  [1644, 16, 'notifyWarning', 'warning', false, "notifyWarning(`${message} -- ${result.reason}`"],
  [1648, 16, 'notifyWarning', 'warning', false, "notifyWarning(`${message} -- the next challenge"],
  [1652, 14, 'notifyWarning', 'warning', false, "notifyWarning(`${message} -- or clear a quick challenge"],
  [1655, 12, 'notifyWarning', 'warning', false, "      this.notifyWarning(message);"],
  [1675, 10, 'notifyEvent', 'info', false, "notifyEvent('Unlocked'"],
  [1689, 12, 'notifyInfo', 'info', false, "notifyInfo('Challenge cleared"],
  [1695, 12, 'notifyWarning', 'warning', false, "notifyWarning(next.rung === 'clock'"],
  [1701, 10, 'notifyWarning', 'warning', false, "notifyWarning('Wrong -- try again.'"],
  [1707, 49, 'notifyEvent', 'warning', false, "notifyEvent('Nothing to save'"],
  [1709, 33, 'notifyEvent', 'error', false, "notifyEvent('Not saved'"],
  [1710, 43, 'notifyMessage', 'info', false, "notifyMessage('Nothing changed"],
  [1717, 49, 'notifyEvent', 'warning', false, "notifyEvent('Nothing to remove'"],
  [1720, 36, 'notifyEvent', 'error', false, "if ('error' in removal) { this.notifyEvent('Not removed'"],
  [1736, 34, 'notifyEvent', 'error', false, "if ('error' in draft) { this.notifyEvent('Not created'"],
  [1745, 12, 'notifyEvent', 'info', false, "notifyEvent('Write this password down'"],
  [1779, 10, 'notifyEvent', 'info', false, "notifyEvent(done, summary.join"],
  [1957, 39, 'notifyWarningEvent', 'warning', false, 'const readOnlyCanvas = () => this.notifyWarningEvent('],
  [2356, 20, 'notifyMessage', 'info', false, 'notifyMessage(`${text} copied`'],
  [2377, 10, 'notifyEvent', 'info', false, "notifyEvent('Bold choice'"],
  [2394, 10, 'notifyMessage', 'info', false, "notifyMessage('Appearance reset to the design system'"],
  [2400, 10, 'notifyEvent', 'info', false, "notifyEvent('Appearance saved'"],
  [2408, 12, 'notifyWarning', 'warning', false, "notifyWarning('Export is not available"],
  [2419, 10, 'notifyMessage', 'info', false, "notifyMessage('Appearance exported as JSON'"],
  [2462, 20, 'notifyError', 'error', true, 'notifyError(message) :'],
  [2462, 73, 'notifyWarning', 'warning', true, 'notifyWarning(message) :'],
  [2462, 103, 'notifyInfo', 'info', true, 'notifyInfo(message),'],
  [2464, 20, 'notifyErrorEvent', 'error', true, 'notifyErrorEvent(title, body) :'],
  [2464, 82, 'notifyWarningEvent', 'warning', true, 'notifyWarningEvent(title, body) :'],
  [2464, 121, 'notifyInfoEvent', 'info', true, 'notifyInfoEvent(title, body),'],
  [2494, 16, 'notifyEvent', 'warning', false, "notifyEvent('Not available'"],
  [2497, 14, 'notifyMessage', 'info', false, "notifyMessage('Creating the Asterisk runtime — this imports"],
  [2500, 18, 'notifyEvent', 'error', false, "notifyEvent('Not run'"],
  [2512, 18, 'notifyEvent', 'error', false, "this.notifyEvent('Not created', `${response.message"],
  [2515, 16, 'notifyEvent', 'info', false, "notifyEvent('Runtime ready'"],
  [2867, 18, 'notifyMessage', 'info', false, "notifyMessage('Changelog copied to the clipboard'"],
  [2868, 18, 'notifyError', 'error', false, "notifyError('Could not reach the clipboard'"],
] as const;
const GENERATED_SEVERITY_PRODUCER_SITES: readonly SeverityProducerTuple[] = [
  [4156, 104, 'notifyWarning', 'warning', false, "notifyWarning('Wrong PIN"],
  [4157, 120, 'notifyWarning', 'warning', false, "notifyWarning('Wrong passphrase"],
  [4164, 143, 'notifyInfo', 'info', false, "notifyInfo('Connection added — pick its target"],
  [4388, 150, 'notifyInfo', 'info', false, "notifyInfo(t.label + ' tool active'"],
  [4447, 153, 'notifyInfo', 'info', false, "notifyInfo('Steps arranged left to right"],
  [4450, 132, 'notifyInfo', 'info', false, "notifyInfo('Zoom reset and canvas centred'"],
  [4451, 136, 'notifyInfo', 'info', false, "notifyInfo('Layout reverted'"],
  [4493, 16, 'notifyWarning', 'warning', false, "notifyWarning(r[0] + ' cannot be loaded"],
  [4965, 85, 'notifyInfo', 'info', false, "notifyInfo('Each tab gets its own credential"],
  [5154, 55, 'notifyWarning', 'warning', false, "notifyWarning('Set at least a four-digit PIN first'"],
  [5155, 67, 'notifyWarning', 'warning', false, "notifyWarning('Set a passphrase first'"],
  [5159, 14, 'notifyInfo', 'info', false, "notifyInfo(s.lockTarget + ' is locked with '"],
] as const;
function producerRows(file: string, rows: readonly SeverityProducerTuple[]): readonly AttentionSeverityProducerSite[] {
  const counts = new Map<string, number>();
  return rows.map(([line, column, helper, severity, passive, marker]) => {
    const occurrence = (counts.get(helper) ?? 0) + 1;
    counts.set(helper, occurrence);
    return { id:`${file}:${line}:${column}`, file, line, column, source:marker, helper, marker, occurrence, severity, passive };
  });
}
export const ATTENTION_SEVERITY_PRODUCERS: readonly AttentionSeverityProducerSite[] = [
  ...producerRows('App.tsx', APP_SEVERITY_PRODUCER_SITES),
  ...producerRows('generated/console.tsx', GENERATED_SEVERITY_PRODUCER_SITES),
];
export interface AttentionSeverityRoute { readonly id:string; readonly file:'App.tsx'|'generated/console.tsx'; readonly line:number; readonly branches:readonly { readonly input:'error'|'warning'|'default'; readonly helper:string; }[]; }
export const ATTENTION_SEVERITY_ROUTES: readonly AttentionSeverityRoute[] = [
  { id:'ceremony-toast-severity', file:'App.tsx', line:2250, branches:[{ input:'error', helper:'notifyError' }, { input:'warning', helper:'notifyWarning' }, { input:'default', helper:'notifyInfo' }] },
  { id:'ceremony-fire-severity', file:'App.tsx', line:2252, branches:[{ input:'error', helper:'notifyErrorEvent' }, { input:'warning', helper:'notifyWarningEvent' }, { input:'default', helper:'notifyInfoEvent' }] },
];
export interface AttentionStructuredNoticeProducer { readonly id:string; readonly file:'App.tsx'|'generated/console.tsx'; readonly line:number; readonly marker:string; readonly kind:'path'|'url'|'credential'; readonly field:'title'|'body'; }
export const ATTENTION_STRUCTURED_NOTICE_PRODUCERS: readonly AttentionStructuredNoticeProducer[] = [
  { id:'deployment-secrets', file:'App.tsx', line:1253, marker:"sensitiveSpansForValue(deployedBody, entry.secret, 'credential', 'body')", kind:'credential', field:'body' },
  { id:'export-filename', file:'App.tsx', line:1347, marker:"sensitiveSpansForValue(noticeBody, filename, 'path', 'body')", kind:'path', field:'body' },
  { id:'endpoint-secret', file:'App.tsx', line:1593, marker:"sensitiveSpansForValue(noticeBody, draft.secret, 'credential', 'body')", kind:'credential', field:'body' },
];
