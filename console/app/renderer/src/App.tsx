import type { Component, ReactNode } from 'react';
import ConsoleShell, { APPEAR_GROUPS, ONBOARD, ORDER, SCREENS } from './generated/console';
import { h } from './dc-runtime';
import {
  badgeFor, dashboardStats, formatDuration, healthBars, isReadable, reasonFor, regexMatchLabel, rowsFor, serverRows, valueOf,
  type ViewReadings,
} from './readings';
import { canvasReason, edgePairs, layoutNodes, valueOf as canvasValueOf, type CanvasReadings } from './canvas';
import { buildCodecGraph, layoutCodecs, unreachable as unreachableCodecs } from './codec-graph';
import { buildEndpointGraph, brokenLinks as brokenEndpointLinks, layoutTopology, summarise as summariseEndpointGraph } from './endpoint-graph';
import { runCeremonyCommand, type CeremonyResponse } from './ceremony';
import { configSummary, renderForDisplay, resourceForFile, type ConfigReading, type ConfigValue } from './configuration';
import { readControlValues, isUninventoried, unmappedControls } from './control-keys';
import { canProvision, runtimeHint, runtimeLabel, type RuntimeStatus } from './runtime';
import type { ControlPlaneResponse, PbxReadView } from '../../../shared/control-plane';
import { ServerSwitcher } from './servers';
import { buildEndpointDraft, endpointDocument, PJSIP_RESOURCE, WIZARD_CONTROLS } from './endpoint-create';
import {
  applyControlValues, controlValuesFor, editDocument, findEndpoint, removeEndpoint,
} from './endpoint-edit';
import {
  clearVocabulary, loadVocabularyFile, vocabularyStatus, type VocabularyStorage,
} from './personal-vocabulary';
import { createDurableStorage, type DurableStorageHandle } from './durable-storage';
import {
  isLanguageMode, languageMode, setCatalog, setLanguageMode, setVocabularyStorage,
  type LanguageMode,
} from './text-boundary';
import { CANTONESE } from './locale-yue';
import {
  IDENTITY, displayName, resetDisplayName, setDisplayName,
} from './display-name';
import { setEmojisEnabled } from './dialog-emojis';
import {
  classifyDialogKind, copyLanguageFor, styledDialog, styledToastText, type MessageStorage,
} from './message-styling';
import { isAttentionMode, modeEnabled, setModeEnabled } from './attention-modes';
import { openTicket, resolutionFor, type TicketCategory, type TicketSeverity } from './support-tickets';
import {
  KNOWN_EDITORS, chooseEditor, clearEditorChoice, saveCustomEditor, validateCustomEditor, CUSTOM_EDITOR_ID,
} from './external-editor';
import type { CustomEditor } from './external-editor';
import { loadRules } from './scheduled-settings';
import {
  activateSchoolMode, deactivateSchoolMode, hasCredential, renameSchoolMode,
  schoolModeActive, schoolModeName, setCredential, type CredentialMethod,
} from './school-mode';
import { attemptMessage, consumeCredential } from './credential-field';
import { isFunnyLevel, setFunnyLevel, type CopyLanguage } from './funny-levels';
import { recoveryFor, type FailureKind } from './in-context-recovery';
import {
  DEFAULT_PITCH, DEFAULT_RATE, MAX_PITCH, MAX_RATE, MIN_PITCH, MIN_RATE, Narrator,
  defaultNarrationSettings, resolveVoiceStatus,
  type NarrationLanguage, type NarrationSettings, type SpeechVoice,
} from './narration';
import { NULL_SPEECH_ENGINE, createWebSpeechEngine } from './narration-engine';
import { HEADER_BYTES, readHeaderFacts } from '../../../control-plane/image-facts';
import {
  DEFAULT_PRESET_ID, LOGO_PRESETS, acceptLogo, chooseCustom, choosePreset, currentChoice, resetLogo,
} from './logo-customization';
import {
  buildPalette, isPaletteChord, moveSelection, searchPalette,
  type PaletteEntry, type PaletteMatch,
} from './command-palette';
import { runHostAction, type HostActionKind, type HostActionRequest } from './host-actions';
import { generateIvr, renderDialplan, type InvalidAction, type IvrDefinition } from './ivr-dialplan';
import { applyResponse, isRejected, MIN_REFRESH_MS } from './external-settings-sources';
import {
  buildSource, loadSources, saveSources, sourcesStatusLine,
  type SourceDraft, type SourceReport,
} from './source-store';
import {
  addAllowlistHost, loadAllowlist, removeAllowlistHost, sourceAllowlistStatusLine,
} from './settings-source-allowlist-store';
import {
  AA_LARGE_TEXT_RATIO, AA_NORMAL_TEXT_RATIO, contrastLevel, contrastRatioFromHex,
} from './accessibility-contract';
import { EMPTY_RUNNER_STATE, statusLine, tick, type RunnerState } from './schedule-runner';
import { buildOnboardPlan, ONBOARD_HOURS_NOTE, type OnboardAnswers, type OnboardPlanInputs } from './onboarding';
import { listArticles, resolveLink, search as docsSearch, suggested as docsSuggestedFor } from './docs-browser';
import { DOCS_BUNDLE } from './generated/docs-bundle';
import { parseMarkdown, plainTextExcerpt, type DocsBlock } from './docs-markdown';
import {
  commitUrl, filterAndSearch, parseChangelogDetailed, toMarkdown, toPlainText, type ChangelogEntry,
} from './changelog';
import { CHANGELOG_MARKDOWN, CHANGELOG_REPOSITORY_URL } from './generated/changelog-bundle';
import {
  click as bulkClick, clearSelection as bulkClearSelection, invert as bulkInvert, planBulk, selectAll as bulkSelectAll,
  summarise as bulkSummarise, type SelectionState,
} from './bulk';
import { describeLoss, exportFilename, exportRows, suitableFormats, type ExportFormat } from './export';
import {
  addRule, applyTheme, cssVarFor, exportTheme, importTheme, resetAll, WILDCARD_ELEMENT,
  type AppearanceProperty, type AppearanceTheme,
} from './appearance';
import { COLOUR_FORMATS, formatColour, parseColour, translate as translateColour } from './colour';
import {
  encodeBase32, pairingUri, verifyCode, type TotpParameters,
} from './totp';
import {
  UnlockLadder, type Challenge, type GradeResult,
} from './unlock-ladder';

/**
 * The interface is the compiled design reference. This subclass supplies what a static
 * design cannot: the real frameless-window controls, and real readings in place of the
 * design's sample content. No screen ever shows a value the console has not read.
 */
type Target = { id: string; label: string; detail: string; connected: boolean };

type ConnectionObservation = { state?: string; reason?: string };

/** `server.connect` can accept the discovered distribution while reporting an
 * unavailable operating-system or Asterisk observation in its data payload. The
 * renderer must require both observations before it treats the target as connected. */
function connectionVerified(response: ControlPlaneResponse | undefined): boolean {
  if (!response?.ok) return false;
  const data = response.data as { operatingSystem?: ConnectionObservation; asterisk?: ConnectionObservation };
  return data.operatingSystem?.state === 'available' && data.asterisk?.state === 'available';
}

function connectionFailureReason(response: ControlPlaneResponse | undefined): string {
  if (!response) return 'The desktop control plane did not answer the connection check.';
  if (!response.ok) return response.message;
  const data = response.data as { operatingSystem?: ConnectionObservation; asterisk?: ConnectionObservation };
  const observations: Array<[string, ConnectionObservation | undefined]> = [
    ['operating system', data.operatingSystem],
    ['Asterisk', data.asterisk],
  ];
  const unavailable = observations
    .filter(([, observation]) => observation?.state !== 'available')
    .map(([label, observation]) => `${label}: ${observation?.reason || 'observation unavailable'}`);
  return unavailable.join('; ') || 'The target did not provide both required connection observations.';
}

const NO_TARGET: Target = { id: '', label: 'no target', detail: 'nothing discovered yet', connected: false };

const BOUNDARY =
  'This console reads a PBX only through the local desktop control plane, using read-only Asterisk ' +
  'CLI commands from a fixed allowlist. Until a target is discovered there is nothing to read, so the ' +
  'screens stay empty rather than showing invented values. Discover one from App > Deploy & servers.';

const BOUNDARY_PLAIN =
  'The app is not talking to a phone system yet. Screens stay empty on purpose — an empty table is ' +
  'honest, a made-up one is not. Find a server first and the rows fill in.';

const NO_READER = 'This screen has no live reading wired yet, so it stays empty.';

const NO_HISTORY =
  'No configuration change has been written this session. The console only reads a PBX right now — it has ' +
  'no wired path that stages, applies or commits a change — so there is nothing yet for this screen to show.';

const NO_MEMORY =
  'This console has no local agent-memory store wired in. There is no memory corpus to search, sync, or ' +
  'attest, so this screen stays empty rather than showing invented records.';

const NO_AUTH_REQUESTS =
  'There is no partner-request channel wired into this console. No trunk partner can reach it to ask for a ' +
  'change, so there is nothing pending or answered to show.';

/** Table screens whose design sample rows must never render. */
const TABLE_SCREENS = Object.entries(SCREENS as Record<string, { table?: { rows: string[][] } }>)
  .filter(([, screen]) => Array.isArray(screen.table?.rows))
  .map(([id]) => id);

/** The generated shell is untyped; this is the surface the console builds on. */
interface Shell {
  renderVals(): Record<string, unknown>;
  /** Every control change routes through here, which is why it is the one place a
   *  cross-cutting setting can be noticed without touching a compiled file. */
  setVal: (control: ControlRef, value: unknown) => void;
  componentDidMount?(): void;
  /** The compiled shell's own markup, which App wraps rather than replaces. */
  render(): ReactNode;
  componentWillUnmount?(): void;
  showInfo(title: string, body: string, plain: string, x: string, y: string): void;
  ceremony(title: string, command: string): void;
  /** Set by the app; the compiled menus call it for anything with a real effect. */
  hostAction?: (kind: HostActionKind, payload: Record<string, unknown>) => void;
  set(key: string, value: unknown): void;
  setState(update: Record<string, unknown>): void;
  moveNode(id: string, dx: number, dy: number): void;
  addEdgeFrom(): void;
  toast(message: string): void;
  areYouSure(title: string, body: string, seconds: number, onConfirm: () => void): void;
  /* The compiled shell's real implementation takes exactly two arguments and simply
   * ignores a third; declaring the optional `isError` here is purely a typing device
   * so App's own two genuine-failure call sites (`daemonAction`/`ensureDaemon`) can
   * pass it without a cast, while every other of the ~60 call sites -- unaware this
   * exists -- keeps compiling and behaving exactly as before. */
  fire(title: string, body: string, isError?: boolean): void;
}

/** The shape the compiled shell hands every control callback. */
interface ControlRef { id?: string; label?: string; kind?: string }

const Base = ConsoleShell as unknown as new (props: Record<string, never>) => Component<Record<string, never>> & Shell;

export class App extends Base {
  private target: Target = NO_TARGET;
  /** The configured multi-server inventory and the cross-server response-routing
   *  guard: an answer is only ever merged into `readings[screen]` when it is both the
   *  newest request issued for `this.target.id` and still addressed to that exact
   *  server, so a slow reply from a server the user has since switched away from (or
   *  a superseded re-read of the same server) can never clobber what is on screen. */
  private servers = new ServerSwitcher((action, extra) => this.request(action, extra));
  private readings: Partial<Record<string, ViewReadings>> = {};
  private pending = '';
  private canvasReadings: CanvasReadings | undefined;
  private canvasPending = false;
  /** Live configuration per screen, keyed by screen id. */
  private configs: Partial<Record<string, ConfigReading>> = {};
  private configPending = '';
  /** Screens whose bound controls have already been seeded from the target. */
  private seeded = new Set<string>();
  /** What the console's own Asterisk runtime can do right now. */
  private runtime: RuntimeStatus | undefined;
  /** Discovery and refresh are real operations, so the shell can show their current
   * state instead of leaving the generated setup card in its design-only idle state. */
  private discoveryPending = false;
  private oneClickRunning = false;
  private oneClickStage = '';
  private oneClickPct = '0%';
  private oneClickLog: Array<{ text: string; color: string; icon: string; ms: string }> = [];
  private refreshTimer: ReturnType<typeof setInterval> | undefined;
  private readStartedAt = new Map<string, number>();
  /** Durable storage for everything that must survive a relaunch (the
   *  personal-vocabulary cache below, and the appearance editor further down). A
   *  `file://`-origin renderer's own `window.localStorage` is in-memory only and never
   *  survives a relaunch -- see `durable-storage.ts`. Bootstrapped from the main
   *  process in `componentDidMount`; until that resolves, reads answer as "nothing
   *  stored yet", exactly like a missing settings file. */
  private durableStorage: DurableStorageHandle = createDurableStorage(this.bridge());
  private vocabStorage: VocabularyStorage = this.durableStorage.storage;

  /* The design's `lang_mode` control, mapped to the boundary's own mode names. The
   * control names each language in that language, which is the one label a person
   * hunting for it can read whatever mode the console is currently in. */
  private static readonly LANGUAGE_CHOICES: Record<string, LanguageMode> = {
    English: 'en', '廣東話': 'yue', 'English + 廣東話': 'both',
  };

  private static readonly LANGUAGE_SETTING = 'console.languageMode';

  /** How often the schedule is re-evaluated. A window boundary is noticed within
   *  this, which is close enough for a setting and cheap enough to run forever. */
  private static readonly SCHEDULE_TICK_MS = 30_000;

  /** Sources are polled on their own timer, floored by the module rather than here
   *  so a faster interval cannot be set by editing this one number. */
  private static readonly SOURCE_POLL_MS = MIN_REFRESH_MS;

  private static readonly NARRATION_SETTING = 'console.narration';

  private narration: NarrationSettings = defaultNarrationSettings();

  /**
   * The one real narrator instance, for the whole life of the component.
   *
   * Constructed eagerly as a field — like `ladder` above — rather than lazily on the
   * first `nar_enabled` toggle, so `restoreNarration` can hand it the saved settings
   * the instant they are read back instead of needing to remember to build it first.
   * Off by default (the settings it starts with say so), so nothing speaks until the
   * user actually turns narration on, however early this is constructed.
   *
   * `createWebSpeechEngine()` reaches for `window.speechSynthesis`; where that does
   * not exist (a locked-down build, a machine with no OS voices, this test suite) it
   * falls back to `NULL_SPEECH_ENGINE`, which never speaks but still resolves — the
   * honest "nothing can be spoken here" state then surfaces through
   * `resolveVoiceStatus`'s own `no-voice-available` kind rather than through a second,
   * separate silent-failure path.
   */
  private readonly narrator = new Narrator(createWebSpeechEngine() ?? NULL_SPEECH_ENGINE);

  /** What the platform reports it can speak with. Empty until enumeration fills in. */
  private voices: SpeechVoice[] = [];

  /** Read by the compiled `text`-kind control marked `action:'narration-status'`. */
  private narrationStatusLine = 'Not started.';

  private stopVoiceListener: (() => void) | undefined;

  /** Torn down on unmount; set only when the desktop bridge actually reports
   *  accessibility-support changes (see `listenForScreenReader` below). */
  private stopScreenReaderListener: (() => void) | undefined;

  /** Read by the compiled `text`-kind control marked `action:'logo-status'`. */
  private logoStatusLine = 'The shipped mark.';

  /* --- command palette ---------------------------------------------------------------
   * Built once: it is derived from the compiled design, which cannot change while the
   * console is running, so rebuilding it per keystroke would be work with no possible
   * different answer. */
  private readonly palette: PaletteEntry[] = buildPalette(
    ORDER as string[],
    SCREENS as unknown as Record<string, { label: string; title: string; sub?: string; groups?: { title?: string; ctls?: { id: string; label: string; kind: string; info?: string }[] }[] }>,
    APPEAR_GROUPS as unknown as { title?: string; ctls?: { id: string; label: string; kind: string; info?: string }[] }[],
  );

  private paletteOpen = false;

  private paletteQuery = '';

  private paletteRow = 0;

  /** Where focus was when the palette opened, so Escape can put it back. */
  private paletteReturnFocus: HTMLElement | undefined;

  private stopPaletteKeys: (() => void) | undefined;

  private sourceReports: SourceReport[] = [];

  /** Read by the compiled `text`-kind control marked `action:'source-status'`. */
  private sourceStatusLine = 'No sources configured.';

  private sourceTimer: ReturnType<typeof setInterval> | undefined;

  /** One generation per poll round. An answer carrying an older one is dropped by
   *  applyResponse, so a slow reply cannot land after a fast one. */
  private sourceGeneration = 0;

  /** Read by the compiled `text`-kind control marked `action:'school-status'`. */
  private schoolStatusLine = 'Off.';

  /** The console's own surface, which every accent is read against. Taken from the
   *  compiled design's root background rather than guessed, so the measurement is
   *  against what is actually behind the text. */
  private static readonly SURFACE_HEX = '#0B0F0C';

  /** Read by the compiled `text`-kind control marked `action:'deploy-progress'`. */
  private deployProgressLine = 'No deploy has run in this session.';

  /** Steps seen this run, so the line can say how many have completed rather than only
   *  naming the latest -- "3 done, importing runtime" is a position, "importing runtime"
   *  alone is not. */
  private deploySteps: { name: string; ok: boolean; detail: string }[] = [];

  private stopProvisionListener: (() => void) | undefined;

  /** What the runner is holding between ticks: the base value of every key it has
   *  overridden, and what it last applied. */
  private scheduleState: RunnerState = EMPTY_RUNNER_STATE;

  /** Read by the compiled `text`-kind control marked `action:'schedule-status'`. */
  private scheduleStatusLine = 'No schedule is in force; your own settings are in effect.';

  private scheduleTimer: ReturnType<typeof setInterval> | undefined;

  /** The values the person themselves chose, which every override is measured against
   *  and restored to. A scheduled change never writes into this. */
  private scheduleBase: Record<string, string> = {};

  /** Control id to attention mode. Each mode is independent, so this is a flat map
   *  rather than anything that could switch two of them together. */
  private static readonly ATTENTION_CONTROLS: Record<string, string> = {
    /* Quoted deliberately: the control-wiring contract greps App for each control id
     * as a literal, and an unquoted key satisfies TypeScript while being invisible to
     * any search for the id -- which is exactly the thing that contract exists to find. */
    'att_focus': 'focus',
    'att_low': 'lowStimulation',
    'att_time': 'timeAwareness',
    'att_one': 'oneThing',
    'att_momentum': 'momentum',
  };

  /**
   * The trunk-authentication screen's own settings, which are the console's and not
   * Asterisk's.
   *
   * They looked like configuration and were counted as unbound for it, but there is no key
   * in pjsip.conf for "auto-approve a low-risk partner request" -- that is this console's
   * workflow, and the screen's file field says so: "pjsip.conf · partner requests", where the
   * second half is not a file. Quoted for the same reason as the attention ids above: the
   * wiring contract greps for each id as a literal.
   */
  /**
   * Settings that belong to this console rather than to Asterisk, grouped by subject.
   *
   * Each group gets its own storage prefix so one subject cannot overwrite another, and a
   * third group is an entry here rather than another branch below.
   *
   * The security pair is the same kind of thing as the partner ones: neither failban nor
   * bantime nor autoban nor banduration appears in ANY Asterisk sample file, because banning
   * a repeat offender is this console's behaviour. They were counted as unbound
   * configuration, which was the wrong diagnosis rather than missing work.
   *
   * Keeping a value is not the same as acting on it. Nothing here yet counts failures or
   * enforces a ban; these persist a stated intention, and saying so matters because
   * "persisted" reads like "implemented" to somebody skimming.
   */
  /**
   * The appearance/notifications/history groups below are the same shape as partner and
   * security: a real Ding PBX Console preference persisted through a relaunch, not an
   * Asterisk key. Four of them (p_scale, p_motion, p_mono, p_start, p_tour, nt_toast,
   * nt_sound) also have a genuine live consumer -- see applyLiveConsoleSetting below and
   * its call sites. The rest persist a stated intention and nothing yet enforces it,
   * exactly like s_failban and s_bantime above: p_density and p_theme have no density or
   * light-theme token system to apply to (the compiled design bakes literal dark-mode hex
   * colours and pixel paddings, not CSS custom properties); p_confirm is never allowed to
   * weaken the destructive-action ceremony, which is mandatory everywhere in this app;
   * p_tray has no tray implementation in the main process to hand it to; nt_levels has no
   * per-toast severity to filter by; nt_quiet has no configured quiet-hours window; nt_keep
   * and every hi_* control describe a local Git-backed notification/config history this
   * console does not implement yet (the History screen renders mock rows against a
   * '/etc/asterisk/.git' path with no real repository behind it).
   */
  private static readonly CONSOLE_SETTINGS: Readonly<Record<string, readonly string[]>> = {
    partner: ['ta_auto', 'ta_expire', 'ta_notify', 'ta_mutual', 'ta_sign', 'ta_log'],
    security: ['s_failban', 's_bantime'],
    /* The six agent/ops screens below are the console's own operating policy, not
     * Asterisk configuration -- there is no `sync.conf` or `skills.conf` for any of
     * these to bind to, because the thing each one describes (the memory sync
     * scheduler, the skills orchestrator, the status hub client, the vocabulary
     * emission guard, the update/release pipeline, the secret intake handling rule)
     * runs outside this renderer, in the agent tooling that hosts it. Persisting the
     * chosen value and restoring it on relaunch is the same honest floor as the
     * partner and security groups above: a stated intention that survives a
     * relaunch and is shown back in the control, not a claim that this window is
     * itself running a sync loop, a lane scheduler, or an update checker. */
    sync: ['y_auto', 'y_every', 'y_backup', 'y_attest'],
    skills: ['u_lanes', 'u_isolate', 'u_model', 'u_verify', 'u_destruct'],
    hub: ['b_poll', 'b_notify', 'b_close', 'b_report'],
    vocab: ['n_guard', 'n_mode', 'n_scan', 'n_lock', 'n_drift'],
    ops: ['o_check', 'o_stage', 'o_restart', 'o_channel', 'o_hash'],
    /* None of these four carries a secret's value -- they are handling policy for
     * the intake (where it is stored, when to nag about rotation, whether to mask,
     * whether export is allowed at all). A control that actually set or revealed a
     * secret would go through announceSecretIntent below instead, exactly as
     * ix_secret_set already does; these four never touch that boundary. */
    secrets: ['x_store', 'x_rotate', 'x_mask', 'x_export'],
    appearance: ['p_density', 'p_theme', 'p_scale', 'p_motion', 'p_mono', 'p_start', 'p_tour', 'p_tray', 'p_confirm'],
    notifications: ['nt_toast', 'nt_sound', 'nt_levels', 'nt_quiet', 'nt_keep'],
    history: ['hi_msg', 'hi_author', 'hi_hook', 'hi_keep', 'hi_diff', 'hi_branch', 'hi_reload'],
    /* Customise > Fun's remaining controls, once `fun_level`/`fun_level_yue` (the two
     * playfulness dials) and `fun_random*` (the per-element appearance editor's own
     * randomiser, already applied through `applyAppearanceToDom`) are set aside. These
     * are the tone, celebration and effect controls the dials themselves do not cover
     * yet: real settings, persisted and restored, without a renderer for confetti or a
     * mascot behind them yet. */
    fun: ['fun_copy', 'fun_celebrate', 'fun_confetti', 'fun_sound', 'fun_mascot', 'fun_easter'],
    /* Customise > Motion. `ap_anim`/`ap_dur`/`ap_ease` already drive the per-element
     * appearance editor's own transitions; these are the console-wide defaults a
     * screen transition or a dialog entrance falls back to before any per-element
     * override applies. */
    motion: ['mo_speed', 'mo_screen', 'mo_reduce', 'mo_hover'],
    /* Customise > Layout. Global defaults for rail position, density and the tab
     * strip -- distinct from the Quick settings screen's own `p_density`, which is
     * that screen's own working copy rather than the console-wide default. */
    layout: ['ly_dock', 'ly_density', 'ly_tabs', 'ly_mono'],
    /* Customise > Theme's global accent, mode and rainbow settings. These sit
     * alongside, and do not replace, the per-element appearance editor's own
     * `ap_hue`/`ap_sat`/`ap_rainbow` -- the screen's own intro says every element can
     * still override this global layer from its own right-click menu. */
    accentTheme: ['th_mode', 'th_hue', 'th_sat', 'th_contrast', 'th_rainbow', 'th_rbspeed'],
    /* Customise > Behaviour. What the console opens to, how much ceremony a
     * destructive action gets, and whether the wizard and tour offer themselves. */
    behavior: ['bh_start', 'bh_confirm', 'bh_commit', 'bh_lockdefault', 'bh_wizard', 'bh_explain', 'bh_tour'],
    /* Customise > Profiles. Which named profile is active and whether it follows
     * agent memory. `pr_perscreen` and `pr_export` are a separate piece of work: the
     * classifier that scoped this batch already counted them as reaching something. */
    profile: ['pr_active', 'pr_sync'],
  };

  private static readonly CONSOLE_SETTING_PREFIX = 'console.setting.';

  /** The group a control belongs to, or undefined when it is not a console setting. */
  private static consoleSettingGroup(id: string): string | undefined {
    return Object.keys(App.CONSOLE_SETTINGS).find((group) => App.CONSOLE_SETTINGS[group].includes(id));
  }

  /** The shell's own `setVal`, captured so the override below can delegate to it.
   *  It is a class property rather than a prototype method, so `super.setVal` does not
   *  exist and the only way to wrap it is to take a copy before replacing it. That has
   *  to happen in the constructor: field initializers all run before the constructor
   *  body, so by then an override declared as a field would already have replaced the
   *  shell's and the copy would point at itself -- a recursion with no base case. */
  private readonly baseSetVal: (control: ControlRef, value: unknown) => void;
  private readonly baseToast: (message: string) => void;
  /** The shell's own `fire`/`areYouSure`/`showInfo`, captured for the same reason as
   *  `baseSetVal` above -- each is wrapped below so the funny-level and dialog-emoji
   *  settings actually reach the three real dialog/message-box surfaces the shell
   *  exposes, rather than the two modules sitting fully tested and fully unused. */
  private readonly baseFire: (title: string, body: string) => void;
  private readonly baseAreYouSure: (title: string, body: string, seconds: number, onConfirm: () => void) => void;
  private readonly baseShowInfo: (title: string, body: string, plain: string, x: string, y: string) => void;

  constructor(props: Record<string, never>) {
    super(props);
    this.baseSetVal = this.setVal as (control: ControlRef, value: unknown) => void;
    this.setVal = this.languageAwareSetVal;
    this.baseToast = this.toast as (message: string) => void;
    this.toast = this.gatedToast;
    this.baseFire = this.fire as (title: string, body: string) => void;
    this.fire = this.narratedFire;
    this.baseAreYouSure = this.areYouSure as (title: string, body: string, seconds: number, onConfirm: () => void) => void;
    this.areYouSure = this.styledAreYouSure;
    this.baseShowInfo = this.showInfo as (title: string, body: string, plain: string, x: string, y: string) => void;
    this.showInfo = this.styledShowInfo;
    this.baseSet = this.set as (key: string, value: unknown) => void;
    this.set = this.screenTrackingSet;
  }

  /** The dial that governs dialog copy in whatever language the console is currently
   *  showing (see `message-styling.ts` for why dialog copy is never itself translated). */
  private currentCopyLanguage(): CopyLanguage {
    return copyLanguageFor(languageMode());
  }

  /** `this.durableStorage.storage` typed for what the styling pipeline actually reads:
   *  both the two funny-level keys and the one dialog-emoji key, which is every one of
   *  those settings this console persists. */
  private get messageStorage(): MessageStorage {
    return this.durableStorage.storage;
  }

  /** Wraps the shell's own `fire` (a celebratory title/body popup): the title and body
   *  it was given are real, freshly-supplied call-site text on every invocation, so
   *  styling them here can never double-decorate or double-frame an already-styled
   *  string -- there is nothing to re-style, only ever something new to style. */
  private styledFire = (title: string, body: string): void => {
    const kind = classifyDialogKind(title);
    const styled = styledDialog(this.messageStorage, this.currentCopyLanguage(), kind, title, body);
    this.baseFire(styled.heading, styled.body);
  };

  /** Wraps `areYouSure`. Every call site uses it to gate a consequential action behind
   *  a confirmation, so it is classified 'question' unconditionally rather than through
   *  the title-based heuristic `fire`/`toast`/`showInfo` fall back to -- there is no
   *  ambiguity here to resolve by guessing. */
  private styledAreYouSure = (title: string, body: string, seconds: number, onConfirm: () => void): void => {
    const styled = styledDialog(this.messageStorage, this.currentCopyLanguage(), 'question', title, body);
    this.baseAreYouSure(styled.heading, styled.body, seconds, onConfirm);
  };

  /** Wraps `showInfo`. Only the title and body go through the pipeline; `plain` is the
   *  screen's own plain-language fallback explainer and is left exactly as written, on
   *  the same principle that keeps `buildDialog` away from a control's own label --
   *  a caller reaching for the plain explanation is reaching for it because they want
   *  it unstyled. */
  private styledShowInfo = (title: string, body: string, plain: string, x: string, y: string): void => {
    const styled = styledDialog(this.messageStorage, this.currentCopyLanguage(), classifyDialogKind(title), title, body);
    this.baseShowInfo(styled.heading, styled.body, plain, x, y);
  };

  /** `p_start`'s own copy of `set` (the shell's `set(key, value)` is the same generic
   *  single-value setter `setVal` wraps for controls -- screen navigation goes through
   *  it too, with key `'screen'`), so 'Last screen' has a real, continuously-updated
   *  value to restore instead of only the value at the moment the setting was touched. */
  private baseSet!: (key: string, value: unknown) => void;

  private screenTrackingSet = (key: string, value: unknown): void => {
    if (key === 'screen' && typeof value === 'string') this.rememberLastScreen(value);
    this.baseSet(key, value);
  };

  private consoleSetting<T>(id: string, fallback: T): T {
    const group = App.consoleSettingGroup(id);
    if (group === undefined) return fallback;
    const raw = this.durableStorage.storage.getItem(App.CONSOLE_SETTING_PREFIX + group + '.' + id);
    if (typeof raw !== 'string' || raw === '') return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  }

  private gatedToast = (message: string): void => {
    if (this.consoleSetting<boolean>('nt_toast', true) === false) return;
    /* Narrated in its own category, separate from `narratedFire`'s 'notification' --
     * a toast and a fired notice are visually distinct surfaces in this console and
     * frequently arrive back to back for one flow (a toast on start, a fire on the
     * outcome), so sharing one cooldown bucket would let the second silently eat the
     * first. Gated on the same `nt_toast` setting that decides whether the toast is
     * shown at all: a toast the user asked never to see is not narrated either. */
    this.narrator.enqueue('toast', message);
    if (this.consoleSetting<boolean>('nt_sound', false) === true) this.playNotificationSound();
    /* The one-line message box: funny-level styling then the same emoji boundary a
     * heading/body dialog gets, classified from the message itself since a toast has no
     * separate title to classify from. */
    const kind = classifyDialogKind(message);
    this.baseToast(styledToastText(this.messageStorage, this.currentCopyLanguage(), kind, message));
  };

  private playNotificationSound(): void {
    try {
      const w = globalThis as { AudioContext?: new () => AudioContext; webkitAudioContext?: new () => AudioContext };
      const Ctx = w.AudioContext ?? w.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      osc.onended = () => void ctx.close().catch(() => undefined);
    } catch { /* No audio output available. */ }
  }

  private applyLiveAppearanceSetting(id: string, value: unknown): void {
    const root = (globalThis as { document?: Document }).document?.documentElement;
    if (!root) return;
    if (id === 'p_scale' && typeof value === 'number' && Number.isFinite(value)) {
      const clamped = Math.min(150, Math.max(80, value));
      root.style.fontSize = clamped + '%';
    } else if (id === 'p_motion') {
      this.setReducedMotion(value === true);
    } else if (id === 'p_mono') {
      root.style.setProperty('font-variant-numeric', value === true ? 'tabular-nums' : '');
    }
  }

  private reducedMotionStyleEl: HTMLStyleElement | undefined;

  private setReducedMotion(on: boolean): void {
    const doc = (globalThis as { document?: Document }).document;
    if (!doc) return;
    if (!on) {
      this.reducedMotionStyleEl?.remove();
      this.reducedMotionStyleEl = undefined;
      return;
    }
    if (this.reducedMotionStyleEl) return;
    const el = doc.createElement('style');
    el.setAttribute('data-console-setting', 'p_motion');
    el.textContent = '*, *::before, *::after { animation-duration:0.001ms !important; '
      + 'animation-iteration-count:1 !important; transition-duration:0.001ms !important; '
      + 'scroll-behavior:auto !important; }';
    doc.head?.appendChild(el);
    this.reducedMotionStyleEl = el;
  }

  private applyRestoredLiveConsoleSettings(): void {
    this.applyLiveAppearanceSetting('p_scale', this.consoleSetting<number>('p_scale', 100));
    this.applyLiveAppearanceSetting('p_motion', this.consoleSetting<boolean>('p_motion', false));
    this.applyLiveAppearanceSetting('p_mono', this.consoleSetting<boolean>('p_mono', true));
    if (this.consoleSetting<boolean>('p_tour', false) === true) this.set('onboardOpen', true);
    this.applyStartScreen();
  }

  private applyStartScreen(): void {
    const choice = this.consoleSetting<string>('p_start', 'Dashboard');
    if (choice === 'Endpoints') { this.set('screen', 'endpoints'); return; }
    if (choice === 'Last screen') {
      const last = this.durableStorage.storage.getItem(App.LAST_SCREEN_KEY);
      if (typeof last === 'string' && last !== '') this.set('screen', last);
      return;
    }
    this.set('screen', 'dash');
  }

  private static readonly LAST_SCREEN_KEY = 'console.setting.appearance.p_start_last_screen';

  private rememberLastScreen(screen: string): void {
    if (typeof screen !== 'string' || screen === '') return;
    this.durableStorage.storage.setItem(App.LAST_SCREEN_KEY, screen);
  }
  /** The chosen file's own name, kept only for display — never its contents. */
  private pickedFileNames = new Map<string, string>();
  /** The daemon lifecycle group on Deploy & servers has no reading of its own until a
   *  target is connected and its status has actually been asked for once. */
  private daemonStatusLine = 'Unknown — no target connected yet.';
  /** The appearance editor's persisted key in `window.localStorage` — a plain JSON
   *  blob of the slider/select values it was built from, separate from the richer
   *  `AppearanceTheme` (appearance.ts) an explicit Export writes to a file. This is
   *  what makes a colour or font choice survive a relaunch. */
  private readonly APPEARANCE_STORAGE_KEY = 'asterisk-appearance-v1';
  /** Set once persisted state has been folded into `this.state.values`, so the
   *  restore only ever happens once per mount. */
  private appearanceRestored = false;
  /** The last JSON actually written to storage, so `renderVals` (called on every
   *  paint) does not re-write `localStorage` when nothing changed. */
  private appearanceLastSerialised = '';
  /** The unlock ladder (unlock-ladder.ts) for the per-element lock's unlock dialog.
   *  Renderer-only: this app's per-element lock has no server-enforced attempt budget
   *  or time-based lockout of its own, so this in-memory instance -- like the PIN and
   *  password it sits beside -- is exactly as toy as the lock it serves, not a stronger
   *  claim than that. Its own five safety rules (never returning a credential, never
   *  refunding the attempt budget, the 3-per-hour skip budget, never touching lockout
   *  escalation, and single-use graded nonces) are still fully enforced by the module
   *  itself; see tryUnlock/authVals below for exactly how far that reaches. */
  private ladder = new UnlockLadder({ now: () => Date.now(), random: () => Math.random() });
  /** Consecutive wrong unlock attempts per lock key, so the ladder is offered after
   *  repeated failures rather than on the first typo. */
  private wrongUnlockCounts: Record<string, number> = {};

  private bridge() {
    return (window as unknown as { dingDesktop?: DesktopBridge }).dingDesktop;
  }

  componentDidMount() {
    super.componentDidMount?.();
    /* The durable-storage snapshot has to load before anything reads or restores
     * persisted state from it (the appearance editor's restore below), so the whole
     * bootstrap-then-restore sequence is awaited before touching either. Everything
     * else on mount does not depend on it and proceeds immediately. */
    setCatalog(CANTONESE);
    /* Until this runs the boundary applies language only. Wiring it here rather than
     * at construction keeps the uploaded file and the rendered text reading from one
     * storage handle instead of two that can disagree. */
    setVocabularyStorage(this.vocabStorage);
    void this.durableStorage.bootstrap().then(() => {
      this.restoreLanguageMode();
      this.restoreDisplayName();
      this.startScheduler();
      this.startSourcePolling();
      this.restoreNarration();
      this.applyQuietFromAttentionModes();
      this.restorePartnerSettings();
      this.applyRestoredLiveConsoleSettings();
      this.refreshLogoStatus();
      this.refreshSchoolStatus();
      this.restoreAppearance();
      this.forceUpdate();
    });
    /* Outside the bootstrap chain deliberately: this subscribes to a live channel and
     * reads no persisted state, so making it wait would delay the first steps of a deploy
     * that had already started. Everything above it does depend on the snapshot having
     * loaded, which is why it stays inside. */
    this.listenForProvisionSteps();
    this.startVoiceEnumeration();
    this.listenForScreenReader();
    this.listenForPaletteChord();
    /* The configured server list is not a reading from any PBX — it exists before
     * anything is reachable and must be on screen whether or not discovery finds a
     * target, so it is loaded independently of it. */
    void this.servers.load().then(() => this.forceUpdate());
    void this.discover();
    this.refreshTimer = setInterval(() => {
      if (this.target.connected) {
        void this.refresh();
        void this.refreshDaemonStatus();
      }
    }, 1000);
  }

  componentWillUnmount() {
    super.componentWillUnmount?.();
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
    if (this.scheduleTimer) clearInterval(this.scheduleTimer);
    this.scheduleTimer = undefined;
    if (this.sourceTimer) clearInterval(this.sourceTimer);
    this.sourceTimer = undefined;
    /* Torn down with the unsubscribe the bridge returns. A listener that outlives the
     * component fires into a dead tree on the next reload. */
    this.stopProvisionListener?.();
    this.stopProvisionListener = undefined;
    this.stopVoiceListener?.();
    this.stopVoiceListener = undefined;
    this.stopScreenReaderListener?.();
    this.stopScreenReaderListener = undefined;
    this.stopPaletteKeys?.();
    this.stopPaletteKeys = undefined;
    /* Cancels anything mid-utterance and drops the voice-list subscription the narrator
     * holds internally — the same "torn down on unmount" rule as every listener above. */
    this.narrator.dispose();
  }

  componentDidUpdate() {
    void this.refresh();
  }

  private async request(action: string, extra: Record<string, unknown> = {}): Promise<ControlPlaneResponse | undefined> {
    const bridge = this.bridge();
    if (!bridge) return undefined;
    return await bridge.controlPlane.request({ requestId: crypto.randomUUID(), action, ...extra } as never);
  }

  /** Bounded, allowlisted discovery through the preload bridge. Never a shell command. */
  private discover = async () => {
    if (this.discoveryPending) return;
    this.discoveryPending = true;
    this.oneClickRunning = true;
    this.oneClickStage = 'Reading local targets';
    this.oneClickPct = '15%';
    this.oneClickLog = [{ icon: 'search', text: 'Reading the local target inventory', color: '#9FF7C4', ms: 'now' }];
    this.forceUpdate();
    try {
    const bridge = this.bridge();
    if (!bridge) {
      this.target = { ...NO_TARGET, label: 'bridge unavailable', detail: 'desktop preload not loaded' };
      this.forceUpdate();
      return;
    }
    this.target = { ...NO_TARGET, label: 'discovering…', detail: 'reading local targets' };
    this.forceUpdate();
    const response = await this.request('server.list');
    if (!response?.ok) {
      this.target = { ...NO_TARGET, detail: response?.message ?? 'the control plane did not answer' };
      this.forceUpdate();
      return;
    }
    const data = response.data as { wsl?: string[] | { unavailable: string } };
    const distributions = Array.isArray(data.wsl) ? data.wsl : [];
    if (!distributions.length) {
      /* Finding nothing was a dead end: it reported that no target existed and stopped,
       * while the installer was carrying a complete Asterisk runtime the console could
       * create one from. Ask what the runtime can actually do and say so, so the message
       * names the way forward instead of only the problem. */
      const detail = Array.isArray(data.wsl) ? 'no WSL distribution discovered' : data.wsl?.unavailable ?? 'no local target discovered';
      const runtime = await this.request('runtime.status');
      this.runtime = runtime?.ok ? (runtime.data as RuntimeStatus) : undefined;
      this.target = { ...NO_TARGET, detail: `${detail}${runtimeHint(this.runtime)}` };
      this.oneClickStage = 'No local target is available';
      this.oneClickPct = '100%';
      this.oneClickLog = [{ icon: 'warning', text: this.target.detail, color: '#FFD68A', ms: 'done' }];
      this.forceUpdate();
      return;
    }
    const distribution = distributions[0]!;
    this.target = { id: distribution, label: distribution, detail: 'connecting to the discovered target', connected: false };
    this.oneClickStage = 'Connecting to the discovered target';
    this.oneClickPct = '55%';
    this.oneClickLog = [
      { icon: 'search', text: `${distributions.length} local target${distributions.length === 1 ? '' : 's'} discovered`, color: '#9FF7C4', ms: 'read' },
      { icon: 'link', text: `Verifying ${distribution} through the control plane`, color: '#9FF7C4', ms: 'now' },
    ];
    this.forceUpdate();

    /* Discovery only finds a name. It is not proof that the target is reachable. Ask
     * the real connection action before marking the target connected. If the daemon is
     * merely stopped, start it through the existing lifecycle path and retry once. */
    let connected = await this.request('server.connect', { serverId: distribution });
    let connectionReason = connectionFailureReason(connected);
    if (!connectionVerified(connected)) {
      await this.ensureDaemon();
      connected = await this.request('server.connect', { serverId: distribution });
      connectionReason = connectionFailureReason(connected);
    }
    if (!connectionVerified(connected)) {
      const reason = connectionReason;
      this.target = { id: distribution, label: distribution, detail: reason, connected: false };
      this.oneClickStage = 'Target connection unavailable';
      this.oneClickPct = '100%';
      this.oneClickLog = [
        { icon: 'search', text: `${distributions.length} local target${distributions.length === 1 ? '' : 's'} discovered`, color: '#9FF7C4', ms: 'read' },
        { icon: 'error', text: reason, color: '#FFB4AB', ms: 'failed' },
      ];
      this.forceUpdate();
      return;
    }
    this.target = { id: distribution, label: distribution, detail: `${distributions.length} local target(s), connection verified`, connected: true };
    this.oneClickStage = 'Connection verified';
    this.oneClickPct = '100%';
    this.oneClickLog = [
      { icon: 'search', text: `${distributions.length} local target${distributions.length === 1 ? '' : 's'} discovered`, color: '#9FF7C4', ms: 'read' },
      { icon: 'verified', text: `${distribution} answered the connection check`, color: '#9FF7C4', ms: 'done' },
    ];
    void this.ensureDaemon();
    this.readings = {};
    this.canvasReadings = undefined;
    this.forceUpdate();
    } finally {
      this.discoveryPending = false;
      this.oneClickRunning = false;
      this.forceUpdate();
    }
  };

  /**
   * Starts the phone system if it is not already answering.
   *
   * Provisioning only ever proved the Asterisk binary existed. Every reading the
   * console makes needs a running daemon, and nothing started one, so a freshly
   * created runtime showed empty tables on every screen and looked broken. Verified
   * on a real machine: starting it by hand made the whole application come alive.
   *
   * It runs automatically because the alternative is a person being told to go and
   * start a service by hand, which is exactly the kind of step this product is not
   * allowed to have. It is never silent: starting is announced, and a failure says
   * what actually went wrong rather than leaving the screens quietly empty.
   */
  private ensureDaemon = async () => {
    const answer = await this.request('daemon.status');
    if (!answer?.ok) return;
    const state = (answer.data as { status?: { state?: string } }).status?.state;
    /* This is the same reading the Deploy & servers status line shows, so it is
     * seeded from it rather than issuing a second `daemon.status` request. */
    void this.refreshDaemonStatus();
    if (state === 'daemonAnswering') return;

    this.toast('Starting the phone system…');
    const started = await this.request('daemon.start');
    if (!started?.ok) {
      const detail = started?.message ?? 'Asterisk did not answer after it was started.';
      this.fire('The phone system did not start', detail, true);
      return;
    }
    /* Anything read before this point was read against a daemon that was not up, so it
     * is discarded rather than left on screen as though it were current. */
    this.readings = {};
    this.canvasReadings = undefined;
    void this.refreshDaemonStatus();
    this.forceUpdate();
  };

  // ---------------------------------------------------------------- personal vocabulary

  /** Read by the compiled `file` control kind for the file-picker's own label. */
  fileControlName = (ctl: { id: string }): string => {
    const named = this.pickedFileNames.get(ctl.id);
    if (ctl.id === 'logo_pick') return named ?? 'No picture chosen';
    if (named) return named;
    const status = vocabularyStatus(this.vocabStorage);
    return status.replacementCount > 0 ? `${status.replacementCount} replacement(s) loaded` : 'No file chosen';
  };

  fileControlHasFile = (ctl: { id: string }): boolean => (ctl.id === 'logo_pick'
    ? currentChoice(this.durableStorage.storage).kind === 'custom'
    : vocabularyStatus(this.vocabStorage).replacementCount > 0);

  /** The file's bytes never leave this process: read locally, validated by the pure
   *  loader in `personal-vocabulary.ts`, and — only on success — cached locally. */
  onFilePicked = (ctl: { id: string }, file: File): void => {
    if (ctl.id === 'logo_pick') { this.pickLogo(file); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = loadVocabularyFile(this.vocabStorage, text);
      this.pickedFileNames.set(ctl.id, result.ok ? file.name : `${file.name} — rejected`);
      this.forceUpdate();
      if (result.ok) this.toast(result.status);
      else this.fire('Vocabulary file rejected', result.status);
    };
    reader.onerror = () => this.fire('Vocabulary file not read', 'The file could not be read from disk.');
    reader.readAsText(file);
  };

  onFileCleared = (ctl: { id: string }): void => {
    if (ctl.id === 'logo_pick') {
      resetLogo(this.durableStorage.storage);
      this.pickedFileNames.delete(ctl.id);
      this.refreshLogoStatus();
      return;
    }
    const result = clearVocabulary(this.vocabStorage);
    this.pickedFileNames.delete(ctl.id);
    this.forceUpdate();
    this.toast(result.status);
  };

  // ---------------------------------------------------------------- daemon lifecycle

  private daemonAction = async (verb: 'start' | 'stop' | 'restart'): Promise<void> => {
    if (!this.target.connected) {
      this.fire('No target connected', 'Connect to a server first — there is nothing to start, stop, or restart yet.');
      return;
    }
    this.toast(`${verb === 'start' ? 'Starting' : verb === 'stop' ? 'Stopping' : 'Restarting'} the phone system…`);
    const response = await this.request(`daemon.${verb}`);
    if (!response?.ok) {
      const detail = response?.message ?? `The phone system did not ${verb}.`;
      this.fire('Not done', detail, true);
      await this.refreshDaemonStatus();
      return;
    }
    /* Anything read before this point may no longer reflect what Asterisk is doing. */
    this.readings = {};
    this.canvasReadings = undefined;
    await this.refreshDaemonStatus();
    this.fire(`Phone system ${verb === 'start' ? 'started' : verb === 'stop' ? 'stopped' : 'restarted'}`, `Asterisk on ${this.target.label} answered after the ${verb}.`);
  };

  private refreshDaemonStatus = async (): Promise<void> => {
    const response = await this.request('daemon.status');
    if (!response?.ok) {
      this.daemonStatusLine = response?.message ?? 'The control plane did not answer.';
      this.forceUpdate();
      return;
    }
    const status = (response.data as { status?: { state?: string; reason?: string } }).status;
    const labels: Record<string, string> = {
      daemonAnswering: 'Answering',
      daemonNotRunning: 'Not running',
      daemonUnresponsive: 'Running, not answering yet',
      distributionNotRunning: 'Target is not running',
    };
    const state = status?.state ?? '';
    const label = labels[state] ?? state ?? 'Unknown';
    this.daemonStatusLine = status?.reason ? `${label} — ${status.reason}` : label;
    this.forceUpdate();
  };

  // ---------------------------------------------------------------- support tickets

  /** Files the ticket locally and shows the resolution. Nothing leaves the machine, and
   *  nothing is deleted here: the console opens the folder and the person deletes it. */
  private fileSupportTicket(): void {
    const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
    const result = openTicket({
      category: String(values['sup_category'] ?? 'Something else') as TicketCategory,
      description: String(values['sup_description'] ?? ''),
      severity: String(values['sup_severity'] ?? 'Normal') as TicketSeverity,
      openedAt: new Date().toISOString(),
      draw: Math.random(),
    });
    if ('problems' in result) {
      this.fire('That ticket will not file', result.problems[0].message);
      return;
    }
    const resolution = resolutionFor(IDENTITY.dataDirectory);
    this.fire(`Ticket ${result.id} — ${result.status}`,
      `${result.firstResponse}

${resolution.instructions}

${resolution.consequence}

${resolution.disclosure}`);
  }

  // ---------------------------------------------------------------- deploy progress

  /**
   * Subscribes to provisioning steps, when the surface running this has a privileged
   * process to report from.
   *
   * The hosted HTTP bridge does not, so the capability is checked rather than assumed --
   * a renderer that took it for granted would fail on that surface instead of simply
   * having no live progress there.
   */
  private listenForProvisionSteps(): void {
    const provisioning = window.dingDesktop?.provisioning;
    if (!provisioning) return;
    this.stopProvisionListener = provisioning.onStep((step) => this.onProvisionStep(step));
  }

  /** One step has finished. Says what happened, and stops at the first failure rather
   *  than continuing to count as though the deploy were still going. */
  private onProvisionStep(step: { name: string; ok: boolean; detail: string }): void {
    this.deploySteps.push(step);
    const done = this.deploySteps.filter((candidate) => candidate.ok).length;
    if (!step.ok) {
      /* A failure is where a recovery route is worth having, so it is offered here rather
       * than leaving somebody at a dead end holding an error string. The route never
       * includes a remedy that loses work -- see in-context-recovery.ts. */
      const recovery = recoveryFor(App.classifyStepFailure(step), step.detail, { target: step.name });
      const offered = recovery.actions.map((entry) => entry.label).join(', ');
      this.deployProgressLine = `Stopped at ${step.name}. ${recovery.summary}`;
      this.fire(`Deploy stopped at ${step.name}`,
        `${recovery.summary}

${recovery.detail}${offered ? `

What you can do: ${offered}.` : ''}`);
    } else {
      this.deployProgressLine = `${done} step${done === 1 ? '' : 's'} done -- ${step.name}: ${step.detail}`;
    }
    this.forceUpdate();
  }

  /**
   * Which kind of failure a provisioning step represents.
   *
   * Matched on the reported detail rather than the step name, because the name says what
   * was being attempted and the detail says why it did not work -- and a step can fail for
   * more than one reason. Anything unrecognised falls to `unknown`, which offers the full
   * error rather than inventing a route.
   */
  private static classifyStepFailure(step: { name: string; detail: string }): FailureKind {
    const detail = step.detail.toLowerCase();
    if (/permission|denied|not permitted|elevat/u.test(detail)) return 'permission-denied';
    if (/no space|disk full|enospc/u.test(detail)) return 'disk-full';
    if (/unreachable|refused|timed out|not running|no such host/u.test(detail)) return 'target-unreachable';
    return 'unknown';
  }

  /** Clears the record so a second deploy does not read as a continuation of the first. */
  private resetDeployProgress(): void {
    this.deploySteps = [];
    this.deployProgressLine = 'Starting...';
    this.forceUpdate();
  }

  // ---------------------------------------------------------------- readability

  /**
   * The WCAG contrast of the accent currently being chosen, against the surface behind it.
   *
   * Reports and never refuses. A colour that fails AA is still the person's to keep -- it
   * is their console -- but they should not have to discover it is unreadable by trying to
   * read it. The ratio is stated as well as the level, because "fail" alone does not say
   * whether the colour is slightly short or hopeless.
   */
  private contrastStatus(): string {
    const vals = this.currentAppearanceValues();
    /* Reuses the same translator the colour panel itself uses two methods down, so the
     * measured value is exactly the one the person is being shown rather than a second
     * conversion that could round differently. */
    const translated = translateColour(`hsl(${vals.hue} ${vals.sat}% ${vals.light}%)`);
    const hex = translated?.hex;
    if (!hex) return 'Not measured yet.';
    const ratio = contrastRatioFromHex(hex, App.SURFACE_HEX);
    if (ratio === undefined) return 'Not measured yet.';
    const rounded = Math.round(ratio * 100) / 100;
    const normal = contrastLevel(ratio, false);
    const large = contrastLevel(ratio, true);
    if (normal !== 'fail') {
      return `${hex} on ${App.SURFACE_HEX} is ${rounded}:1 -- ${normal} for ordinary text.`;
    }
    if (large !== 'fail') {
      return `${hex} on ${App.SURFACE_HEX} is ${rounded}:1 -- ${large} for large text only. Ordinary text needs ${AA_NORMAL_TEXT_RATIO}:1.`;
    }
    return `${hex} on ${App.SURFACE_HEX} is ${rounded}:1, below the ${AA_LARGE_TEXT_RATIO}:1 floor even for large text. It is yours to keep, but it will be hard to read.`;
  }

  // ---------------------------------------------------------------- school mode

  /** Turning it ON needs nothing. Turning it OFF needs the credential, which is the whole
   *  point of the mode -- so the two directions deliberately do not share a path. */
  private setSchoolMode(on: boolean): void {
    const name = schoolModeName(this.durableStorage.storage);
    if (on) {
      activateSchoolMode(this.durableStorage.storage);
      this.refreshSchoolStatus();
      this.toast(`${name} is on.`);
      return;
    }
    if (!hasCredential(this.durableStorage.storage)) {
      this.fire(name, attemptMessage('missing', name));
      return;
    }
    const { secret, values } = this.consumeSchoolCredential();
    if (secret === undefined) {
      this.fire(name, `Type the unlock credential first, then switch this off again.`);
      return;
    }
    const result = deactivateSchoolMode(this.durableStorage.storage, secret);
    this.setState({ values } as never);
    this.refreshSchoolStatus();
    this.fire(name, attemptMessage(result.ok ? 'accepted' : 'rejected', name));
  }

  private storeSchoolCredential(): void {
    const name = schoolModeName(this.durableStorage.storage);
    const { secret, values } = this.consumeSchoolCredential();
    this.setState({ values } as never);
    if (secret === undefined) {
      this.fire(name, 'Type a PIN or password in the field above first.');
      return;
    }
    const raw = (this.state as { values?: Record<string, unknown> }).values?.['school_method'];
    const method: CredentialMethod = raw === 'password' ? 'password' : 'pin';
    setCredential(this.durableStorage.storage, method, secret);
    this.refreshSchoolStatus();
    /* Says that one was set, never what it was, and repeats that this is not security. */
    this.fire(name, `Unlock credential set. Deleting the shared local application-data record still resets ${name}, so this is a speed bump rather than protection.`);
  }

  /** Takes the secret out of the bound control and blanks the field in one step. */
  private consumeSchoolCredential(): { secret?: string; values: Record<string, unknown> } {
    const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
    return consumeCredential(values, 'school_credential');
  }

  private refreshSchoolStatus(): void {
    const storage = this.durableStorage.storage;
    const name = schoolModeName(storage);
    const credential = hasCredential(storage) ? 'an unlock credential is set' : 'no unlock credential is set yet';
    this.schoolStatusLine = schoolModeActive(storage)
      ? `${name} is on and ${credential}.`
      : `${name} is off and ${credential}.`;
    this.forceUpdate();
  }

  // ---------------------------------------------------------------- real menu actions

  /**
   * Carries out a menu item that used to only announce itself.
   *
   * Fourteen of them claimed to copy, export, import or save and did none of it. The
   * decisions live in host-actions.ts so they can be tested without a clipboard or a
   * filesystem; this supplies the doing, and reports what came back either way. A refusal
   * named plainly is worth far more than a cheerful message about work that never happened,
   * which is exactly what these controls used to be.
   */
  hostAction = (kind: HostActionKind, payload: Record<string, unknown> = {}): void => {
    const request = { ...payload, kind } as HostActionRequest;
    void runHostAction(request, {
      writeClipboard: async (text: string) => {
        const clipboard = (globalThis as { navigator?: { clipboard?: { writeText(t: string): Promise<void> } } })
          .navigator?.clipboard;
        if (!clipboard) return false;
        try { await clipboard.writeText(text); return true; } catch { return false; }
      },
      offerFile: async (name: string, mimeType: string, contents: string) => {
        const doc = (globalThis as { document?: Document }).document;
        const url = (globalThis as { URL?: typeof URL }).URL;
        if (!doc || !url?.createObjectURL) return false;
        try {
          const href = url.createObjectURL(new Blob([contents], { type: mimeType }));
          const link = doc.createElement('a');
          link.href = href;
          link.download = name;
          doc.body.appendChild(link);
          link.click();
          link.remove();
          /* Revoked on the next turn rather than immediately: revoking before the click has
           * been serviced cancels the download on some platforms, and a download that
           * silently does not happen is the defect this whole change is about. */
          setTimeout(() => url.revokeObjectURL(href), 0);
          return true;
        } catch { return false; }
      },
      requestFile: async (accept: string) => {
        const doc = (globalThis as { document?: Document }).document;
        if (!doc) return undefined;
        return new Promise<{ name: string; text: string } | undefined>((resolve) => {
          const input = doc.createElement('input');
          input.type = 'file';
          input.accept = accept;
          input.addEventListener('change', () => {
            const file = input.files?.[0];
            if (!file) { resolve(undefined); return; }
            void file.text()
              .then((text) => resolve({ name: file.name, text }))
              .catch(() => resolve(undefined));
          });
          /* A cancelled picker fires no change event on most platforms, so a promise that
           * only waits for one would never settle and the menu would appear to hang. */
          input.addEventListener('cancel', () => resolve(undefined));
          input.click();
        });
      },
      store: (key: string, value: string) => {
        try { this.durableStorage.storage.setItem(key, value); return true; } catch { return false; }
      },
      now: () => new Date().toISOString().slice(0, 10),
      /**
       * Picks a colour from anywhere on the screen.
       *
       * Chromium has had this since version 95 and this runtime is far past it; the control
       * simply never called it. It needs a user gesture, which the menu click supplies.
       *
       * Resolves undefined rather than throwing when the person presses Escape, because a
       * cancelled pick is an ordinary outcome and not a failure to report as one.
       */
      pickColour: async () => {
        const Picker = (globalThis as { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper;
        if (!Picker) return undefined;
        try { return (await new Picker().open()).sRGBHex; } catch { return undefined; }
      },
      /** What save() kept, or undefined when nothing was ever saved under that name. */
      readSaved: (bucket: string) => {
        const raw = this.durableStorage.storage.getItem(`console.saved.${bucket}`);
        if (typeof raw !== 'string' || raw === '') return undefined;
        try { return JSON.parse(raw); } catch { return undefined; }
      },
      /**
       * Puts a saved workspace back on screen.
       *
       * Every id is checked against the destinations that actually exist. A workspace saved
       * by an older build can name a screen this one does not have, and opening it would
       * render a blank tab -- which reads as the app breaking rather than as an old file. So
       * the unknown ones are counted and left out, and the count is reported.
       */
      applySaved: (data: unknown) => {
        const saved = data as { data?: { tabs?: unknown; groups?: unknown } } | undefined;
        const tabs = saved?.data?.tabs;
        if (!Array.isArray(tabs)) return undefined;
        const known = new Set(ORDER as unknown as string[]);
        const usable = tabs.filter((id): id is string => typeof id === 'string' && known.has(id));
        if (usable.length === 0) return { restored: 0, skipped: tabs.length };
        const groups = Array.isArray(saved?.data?.groups) ? saved.data.groups : [];
        this.setState({ tabs: usable, groups, screen: usable[0] });
        return { restored: usable.length, skipped: tabs.length - usable.length };
      },
      /* Applied through the same three values the appearance system already persists, so a
       * picked colour changes the console itself rather than a preview swatch. */
      applyAccent: (hex: string) => {
        const translated = translateColour(hex);
        const hsl = translated?.hsl;
        if (!hsl) return false;
        const numbers = hsl.match(/-?\d+(?:\.\d+)?/gu);
        if (!numbers || numbers.length < 3) return false;
        const [hue, sat, light] = numbers.map(Number);
        this.setState((st: { values: Record<string, unknown> }) => ({
          values: { ...st.values, ap_hue: hue, ap_sat: sat, ap_light: light },
        }));
        return true;
      },
    }).then((outcome) => {
      if (outcome.ok) this.toast(`${outcome.title} — ${outcome.detail}`);
      else this.fire(outcome.title, outcome.detail);
    });
  };

  // ---------------------------------------------------------------- command palette

  /**
   * One discoverable global shortcut.
   *
   * Captured rather than bubbled, so a field that stops keys from propagating cannot
   * swallow the one chord that is meant to work from anywhere. The default is prevented
   * only when the chord actually matches, because taking every control-shift keystroke
   * would break whatever else the platform does with them.
   */
  private listenForPaletteChord(): void {
    const handler = (event: KeyboardEvent) => {
      if (isPaletteChord(event)) {
        event.preventDefault();
        this.togglePalette();
        return;
      }
      if (!this.paletteOpen) return;
      if (event.key === 'Escape') { event.preventDefault(); this.closePalette(); return; }
      const matches = this.paletteMatches();
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.paletteRow = moveSelection(matches.length, this.paletteRow, event.key === 'ArrowDown' ? 1 : -1);
        this.forceUpdate();
        return;
      }
      if (event.key === 'Enter' && matches.length > 0) {
        event.preventDefault();
        this.activatePaletteEntry(matches[this.paletteRow].entry);
      }
    };
    window.addEventListener('keydown', handler, true);
    this.stopPaletteKeys = () => window.removeEventListener('keydown', handler, true);
  }

  private paletteMatches(): PaletteMatch[] {
    return searchPalette(this.palette, this.paletteQuery);
  }

  private togglePalette(): void {
    if (this.paletteOpen) { this.closePalette(); return; }
    const active = (globalThis as { document?: Document }).document?.activeElement;
    this.paletteReturnFocus = active instanceof HTMLElement ? active : undefined;
    this.paletteOpen = true;
    this.paletteQuery = '';
    this.paletteRow = 0;
    this.forceUpdate();
  }

  private closePalette(): void {
    this.paletteOpen = false;
    this.forceUpdate();
    /* Focus goes back where it came from. Leaving it on a control that has just been
     * removed from the document drops it to the body, and a keyboard user then has to
     * tab from the top of the page to get back to what they were doing. */
    this.paletteReturnFocus?.focus?.();
    this.paletteReturnFocus = undefined;
  }

  /**
   * Opens the destination, then reveals and focuses the exact control.
   *
   * Landing on the right screen and leaving somebody to hunt for the row is not
   * teleporting. The reveal waits a frame because the destination's markup does not exist
   * until the screen change has rendered.
   */
  private activatePaletteEntry(entry: PaletteEntry): void {
    this.closePalette();
    this.setState({ screen: entry.screen });
    if (entry.controlId === undefined) return;
    const id = entry.controlId;
    const raf = (globalThis as { requestAnimationFrame?: (fn: () => void) => void }).requestAnimationFrame;
    const reveal = () => {
      const document = (globalThis as { document?: Document }).document;
      const row = document?.querySelector(`[data-ctl="${id}"]`);
      if (!(row instanceof HTMLElement)) {
        /* Said plainly rather than silently doing nothing: a result that appears to work
         * and does not is worse than one that admits it could not. */
        this.toast('That setting is on this screen but its row is not on display right now.');
        return;
      }
      row.scrollIntoView({ block: 'center' });
      const focusable = row.querySelector('input, select, button, [tabindex]');
      (focusable instanceof HTMLElement ? focusable : row).focus?.();
    };
    if (raf) raf(() => raf(reveal)); else reveal();
  }

  /** The palette itself. Absent from the document entirely when closed, so nothing of it
   *  can be reached by tab or read by a screen reader while it is not in use. */
  private paletteOverlay(): ReactNode {
    if (!this.paletteOpen) return null;
    const matches = this.paletteMatches();
    const rows = matches.map((match, index) => h('button', {
      key: match.entry.key,
      class: `palette-row${index === this.paletteRow ? ' palette-row-on' : ''}`,
      role: 'option',
      'aria-selected': index === this.paletteRow ? 'true' : 'false',
      onClick: () => this.activatePaletteEntry(match.entry),
      onMouseEnter: () => { this.paletteRow = index; this.forceUpdate(); },
    },
      h('span', { class: 'palette-label' }, match.entry.label),
      h('span', { class: 'palette-context' }, match.entry.context)));
    return h('div', {
      class: 'palette-scrim',
      onClick: () => this.closePalette(),
    }, h('div', {
      class: 'palette-card',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Find a screen or a setting',
      onClick: (event: { stopPropagation(): void }) => event.stopPropagation(),
    },
      h('input', {
        class: 'palette-field',
        type: 'text',
        autoFocus: true,
        placeholder: 'Find a screen or a setting',
        'aria-label': 'Find a screen or a setting',
        'aria-controls': 'palette-results',
        value: this.paletteQuery,
        onInput: (event: { target: { value: string } }) => {
          this.paletteQuery = event.target.value;
          /* Back to the top on every keystroke: keeping the old row means Enter activates
           * whatever happens to sit at that index in a list somebody has not read yet. */
          this.paletteRow = 0;
          this.forceUpdate();
        },
      }),
      h('div', { id: 'palette-results', class: 'palette-results', role: 'listbox' },
        rows.length > 0
          ? rows
          : h('p', { class: 'palette-empty' }, `Nothing here matches ${this.paletteQuery}.`)),
      h('p', { class: 'palette-hint' },
        `${matches.length} of ${this.palette.length}. Arrow keys to move, Enter to go, Escape to close.`)));
  }

  render(): ReactNode {
    /* Wrapping the compiled shell rather than replacing it: the palette is the only thing
     * added, and it sits above everything because it is rendered after. */
    return h('div', { class: 'app-root' }, super.render(), this.paletteOverlay());
  }

  /**
   * Puts the partner-request settings back after a relaunch.
   *
   * A value that cannot be read is left at the design's own default rather than guessed at:
   * these decide whether a change to a live trunk is approved without anybody looking, and a
   * corrupt profile is not a reason to start approving things.
   */
  private restorePartnerSettings(): void {
    const restored: Record<string, unknown> = {};
    for (const [group, ids] of Object.entries(App.CONSOLE_SETTINGS)) {
      for (const id of ids) {
        const raw = this.durableStorage.storage.getItem(`${App.CONSOLE_SETTING_PREFIX}${group}.${id}`);
        if (typeof raw !== 'string' || raw === '') continue;
        try {
          restored[id] = JSON.parse(raw);
        } catch {
          /* Left out entirely, so the shipped default stands. */
        }
      }
    }
    if (Object.keys(restored).length === 0) return;
    this.setState((st: { values: Record<string, unknown> }) => ({ values: { ...st.values, ...restored } }));
  }

  /**
   * The dialplan the IVR form currently describes.
   *
   * Regenerated from the controls each time it is read, so every one of them visibly changes
   * something -- which is the point, since none of them binds to a key and for a long time
   * none of them did anything at all.
   *
   * A form that cannot be generated says why instead of showing a stale plan. Showing the
   * last good one beside settings that would not produce it is worse than showing nothing:
   * it reads as though the change was accepted.
   */
  private ivrDialplanText(): string {
    const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
    const num = (key: string, fallback: number): number => {
      const raw = Number(values[key]);
      return Number.isFinite(raw) ? Math.round(raw) : fallback;
    };
    const definition: IvrDefinition = {
      /* The screen edits one IVR at a time and does not name it yet, so the context is named
       * for what it is. Naming it after something the person did not choose would be worse. */
      name: 'main-menu',
      digitTimeout: num('i_timeout', 7),
      retries: num('i_retries', 3),
      /* Quoted keys, not property access: the wiring contract greps App for each control id
       * as a literal, and values.i_invalid satisfies TypeScript while being invisible to any
       * search for the id -- which is the exact thing that contract exists to catch. */
      onInvalid: (typeof values['i_invalid'] === 'string' ? values['i_invalid'] : 'Repeat') as InvalidAction,
      allowDirectDial: values['i_direct'] !== false,
      language: typeof values['i_lang'] === 'string' ? values['i_lang'] : 'en',
      allowBargeIn: values['i_barge'] !== false,
    };
    const generated = generateIvr(definition);
    if ('problems' in generated) {
      return `This cannot be generated yet: ${generated.problems.map((p) => p.message).join(' ')}`;
    }
    return renderDialplan(definition.name, generated);
  }

  /**
   * Says what setting a new IAX secret will and will not do.
   *
   * The switch used to do nothing at all, recorded as deliberately unbound because a secret
   * must never travel through an ordinary binding -- true, and not the same thing as doing
   * nothing, though the two had been written down as though they were.
   *
   * Nothing here ever holds a secret. It names the flow and the boundary; the value itself
   * only ever exists in the credential field, which clears itself the moment it is used.
   */
  private announceSecretIntent(turningOn: boolean): void {
    if (!turningOn) {
      this.toast('The existing secret is left exactly as it is.');
      return;
    }
    this.fire('A new secret will be set',
      'It is generated when you apply, kept by the operating system credential store, and '
      + 'never written into pjsip.conf, an export, the local history or a screenshot. The '
      + 'console cannot show it to you afterwards, which is the point of keeping it there.');
  }

  // ---------------------------------------------------------------- hosting it elsewhere

  /* Its own field, not the provisioning one above. Both are step progress and both arrive on
   * the same channel, but they are different operations -- sharing one list would interleave
   * a runtime import with an install onto another machine and report the mixture. */
  /** Progress from the running install, newest last. Empty until one is started. */
  private hostingSteps: { name: string; ok: boolean; detail: string }[] = [];

  private hostingRunning = false;

  /**
   * Says what pressing the switch would actually do, before it is pressed.
   *
   * Including when the answer is that it cannot: the deployment installs onto a machine
   * reached over SSH, so a local or container connection has nowhere to send anything, and
   * saying so is better than offering an action that would refuse.
   */
  private deployStatusLine(): string {
    if (this.hostingRunning || this.hostingSteps.length > 0) {
      const last = this.hostingSteps[this.hostingSteps.length - 1];
      const done = this.hostingSteps.filter((step) => step.ok).length;
      if (this.hostingRunning) return `Step ${done + 1}: ${last?.name ?? 'starting'}. ${last?.detail ?? ''}`.trim();
      return last?.ok
        ? `Installed. ${this.hostingSteps.length} steps, all of them done.`
        : `Stopped at "${last?.name}". ${last?.detail ?? ''}`.trim();
    }
    const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
    const kind = String(values.sv_kind ?? 'Local');
    if (!kind.startsWith('SSH')) {
      return `This connection is ${kind}, so there is no machine to install onto. `
        + 'Choose an SSH connection above and fill in its host and account first.';
    }
    const host = String(values.sv_host ?? '').trim();
    const user = String(values.sv_user ?? '').trim();
    const missing = [host === '' ? 'a host' : '', user === '' ? 'an account' : ''].filter(Boolean);
    if (missing.length > 0) return `Fill in ${missing.join(' and ')} above first.`;
    return `It will install onto ${host} as ${user}, over SSH on port ${String(values.sv_sshport ?? 22)}. `
      + 'Nothing of Asterisk is changed; the console installs into paths it creates itself.';
  }

  /**
   * Sends this console to the machine described on this screen.
   *
   * The control plane owns every decision about what runs there -- the plan is built and
   * validated on that side, and refused there too, so a renderer cannot talk it into a
   * different command by sending a different payload.
   */
  private async deployConsole(): Promise<void> {
    const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
    if (!String(values.sv_kind ?? 'Local').startsWith('SSH')) {
      this.fire('Nothing to install onto', this.deployStatusLine());
      return;
    }
    this.hostingSteps = [];
    this.hostingRunning = true;
    this.forceUpdate();
    const response = await this.request('deploy.console', {
      payload: {
        host: String(values.sv_host ?? ''),
        user: String(values.sv_user ?? ''),
        port: Number(values.sv_sshport ?? 22),
        knownHostsPath: String(values.sv_hostkey ?? ''),
        bundlePath: String(values.dp_bundle ?? ''),
        stamp: new Date().toISOString().replace(/[^0-9]/gu, '').slice(0, 14),
      },
    }) as { ok?: boolean; message?: string; data?: { steps?: { name: string; ok: boolean; detail: string }[] } } | undefined;
    this.hostingRunning = false;
    /* Whatever came back, the steps are kept: when it failed, which step it failed at is
     * most of the diagnosis, and a single message throws that away. */
    this.hostingSteps = response?.data?.steps ?? this.hostingSteps;
    this.forceUpdate();
    if (response?.ok) this.fire('Console installed', 'It is running on that machine and reachable from a browser.');
    else this.fire('Not installed', response?.message ?? 'The desktop bridge did not answer, so nothing was installed.');
  }

  // ---------------------------------------------------------------- the console mark

  /**
   * Decides whether a chosen picture may become the mark.
   *
   * Only the HEAD is read. Discovering that a file is too large by reading all of it does
   * the expensive thing before the cheap check, and the head carries both the signature and
   * the dimensions. The SIZE comes from the File rather than from what was read -- a capped
   * read reports the cap, so every oversized file would measure exactly the limit and sail
   * through the check written to catch it.
   */
  private pickLogo(file: File): void {
    void file.slice(0, HEADER_BYTES).arrayBuffer().then((head) => {
      const bytes = new Uint8Array(head);
      const facts = readHeaderFacts(bytes);
      if (!facts) {
        /* Unreadable means unreadable, never "probably fine". A header that cannot be read
         * is exactly the file that deserves the least benefit of the doubt -- and it is
         * named by what it is not, since its name was the thing that turned out untrue. */
        this.rejectLogo(file, 'That file is not a PNG, JPEG, WebP or SVG this console can read, whatever its name says.');
        return;
      }
      /* acceptLogo owns every bound and every message, so one place holds the rules rather
       * than two that would eventually disagree -- and the one that disagreed would be the
       * one nobody checked. */
      const verdict = acceptLogo(bytes, facts, { fileName: file.name, mimeType: file.type, fileBytes: file.size });
      if ('problems' in verdict) {
        this.rejectLogo(file, verdict.problems.map((problem) => problem.message).join(' '));
        return;
      }
      this.pickedFileNames.set('logo_pick', file.name);
      chooseCustom(this.durableStorage.storage, `logo/${file.name}`);
      this.refreshLogoStatus(verdict.notices);
      /* Stated before it becomes the mark rather than discovered when it looks soft in the
       * title bar. */
      for (const notice of verdict.notices) this.toast(notice);
    }).catch(() => this.rejectLogo(file, 'That file could not be read from disk.'));
  }

  /** Nothing partially applied: a rejected picture leaves the previous mark exactly as it
   *  was, and says so, because a half-applied logo is a console that looks broken with no
   *  obvious way back. */
  private rejectLogo(file: File, why: string): void {
    this.pickedFileNames.set('logo_pick', `${file.name} — rejected`);
    this.logoStatusLine = `${why} The previous mark is unchanged.`;
    this.forceUpdate();
    this.fire('Picture rejected', why);
  }

  /** Names the mark actually in use, plus anything stated before it became the mark. */
  private refreshLogoStatus(notices: readonly string[] = []): void {
    const choice = currentChoice(this.durableStorage.storage);
    const chosenName = this.pickedFileNames.get('logo_pick');
    const preset = LOGO_PRESETS.find((candidate) => candidate.id === (choice.presetId ?? DEFAULT_PRESET_ID));
    this.logoStatusLine = choice.kind === 'custom'
      ? [`Your own picture is in use${chosenName ? `: ${chosenName}` : ''}.`, ...notices].join(' ')
      : `The shipped mark is in use: ${preset?.label ?? 'Ding'}.`;
    this.forceUpdate();
  }

  // ---------------------------------------------------------------- spoken narration

  /**
   * Reads the voices the platform actually has.
   *
   * Enumeration commonly returns nothing on the first call and fills in a moment later
   * behind an event. A picker that reads it once reports "no voices installed" on a
   * machine with forty, and looks broken rather than slow -- so this subscribes as well
   * as reading, and unsubscribes on unmount.
   */
  private startVoiceEnumeration(): void {
    const speech = (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
    if (!speech) {
      this.narrationStatusLine = 'This computer has no speech synthesis, so nothing can be spoken.';
      return;
    }
    const read = () => {
      this.voices = speech.getVoices().map((voice) => ({
        id: voice.voiceURI, name: voice.name, lang: voice.lang, localService: voice.localService,
      }));
      this.refreshNarrationStatus();
    };
    read();
    const handler = () => read();
    speech.addEventListener('voiceschanged', handler);
    this.stopVoiceListener = () => speech.removeEventListener('voiceschanged', handler);
  }

  private applyNarrationControl(id: string, value: unknown): void {
    const next: NarrationSettings = { ...this.narration, voices: { ...this.narration.voices } };
    if (id === 'nar_enabled' && typeof value === 'boolean') next.enabled = value;
    /* The design offers these in the words somebody reads, so they are mapped here rather
     * than stored as typed. Storing the label would tie the saved profile to the wording. */
    if (id === 'nar_language' && typeof value === 'string') {
      const byLabel: Record<string, NarrationLanguage> = { English: 'en', '廣東話': 'zh', Both: 'both' };
      next.language = byLabel[value] ?? next.language;
    }
    /* "Choose automatically" is stored as no choice at all rather than as a voice named
     * that, so a machine gaining a better voice starts using it. */
    if (id === 'nar_en_voice' && typeof value === 'string') {
      next.voices.en = value === 'Choose automatically' ? undefined : this.voiceIdByName(value);
    }
    if (id === 'nar_yue_voice' && typeof value === 'string') {
      next.voices.zh = value === 'Choose automatically' ? undefined : this.voiceIdByName(value);
    }
    /* Clamped rather than refused: a slider cannot produce an out-of-range value through
     * the interface, so one arriving here came from a hand-edited profile and the nearest
     * usable value is friendlier than a refusal nobody can act on. */
    if (id === 'nar_rate' && typeof value === 'number') {
      next.rate = Math.min(MAX_RATE, Math.max(MIN_RATE, value));
    }
    if (id === 'nar_pitch' && typeof value === 'number') {
      next.pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, value));
    }
    this.narration = next;
    this.durableStorage.storage.setItem(App.NARRATION_SETTING, JSON.stringify(next));
    /* The real narrator hears every one of these the moment they're chosen -- the
     * switch, the language, either voice, rate and pitch -- rather than only on the
     * next restart. This is the one line that makes the seven `nar_*` controls above
     * actually reach something that speaks instead of only reaching localStorage. */
    this.narrator.setSettings(next);
    this.refreshNarrationStatus();
  }

  /** Names are not unique -- one machine can carry several voices with the same name from
   *  different engines -- so the stable identity is stored and the name only displayed. */
  private voiceIdByName(name: string): string | undefined {
    return this.voices.find((voice) => voice.name === name)?.id;
  }

  private restoreNarration(): void {
    const raw = this.durableStorage.storage.getItem(App.NARRATION_SETTING);
    if (typeof raw === 'string' && raw !== '') {
      try {
        const parsed = JSON.parse(raw) as NarrationSettings;
        if (parsed && typeof parsed === 'object') {
          this.narration = { ...defaultNarrationSettings(), ...parsed };
        }
      } catch {
        /* A hand-edited profile falls back to the shipped settings rather than failing to
         * start. Narration off is the safe direction for something that makes noise. */
        this.narration = defaultNarrationSettings();
      }
    }
    /* Handed to the real narrator unconditionally, including the "nothing saved yet"
     * branch above. The narrator's own field default happens to already match
     * `defaultNarrationSettings()`, but this makes that an explicit guarantee instead
     * of leaving two independently-constructed defaults to keep agreeing by accident. */
    this.narrator.setSettings(this.narration);
    this.refreshNarrationStatus();
  }

  /**
   * Says what will ACTUALLY speak.
   *
   * A picker merely showing a value implies that value will be heard, which is exactly
   * the state that needs saying out loud when it is not true -- a chosen voice that is
   * not installed, a network-backed one that goes quiet offline, or a language nothing
   * on this machine can read.
   */
  private refreshNarrationStatus(): void {
    const languages: ('en' | 'zh')[] = this.narration.language === 'both'
      ? ['en', 'zh']
      : [this.narration.language === 'zh' ? 'zh' : 'en'];
    const lines = languages.map((language) =>
      resolveVoiceStatus(language, this.narration.voices[language], this.voices).message);
    this.narrationStatusLine = this.narration.enabled
      ? lines.join(' ')
      : `Narration is off. ${lines.join(' ')}`;
    this.forceUpdate();
  }

  /**
   * Quiet hours, borrowed from the Low stimulation attention mode rather than invented
   * fresh: that mode already means "only the notifications that genuinely need a
   * person" (see `attention-modes.ts`'s `quietNotifications`), which is exactly what
   * the narrator's own `setQuiet` is for. Read at mount and re-applied the moment the
   * mode itself is toggled, in `languageAwareSetVal`'s `att_` branch below.
   */
  private applyQuietFromAttentionModes(): void {
    this.narrator.setQuiet(modeEnabled(this.durableStorage.storage, 'lowStimulation'));
  }

  /**
   * Ducks the narrator while a real screen reader is active, using Electron's own
   * accessibility-support signal where the desktop bridge exposes one (see
   * `app/electron/main.ts` and `preload.ts` — `app.isAccessibilitySupportEnabled()`).
   * The hosted HTTP surface has no such signal, so `accessibility` is optional on the
   * bridge exactly like `provisioning` above, and this degrades to doing nothing
   * there rather than guessing.
   */
  private listenForScreenReader(): void {
    const accessibility = window.dingDesktop?.accessibility;
    if (!accessibility) return;
    void accessibility.isScreenReaderActive().then((active) => this.narrator.setScreenReaderActive(active));
    this.stopScreenReaderListener = accessibility.onChange((active) => this.narrator.setScreenReaderActive(active));
  }

  /**
   * The single path every `this.fire(...)` call is narrated through, wired in the
   * constructor exactly the way `toast`/`setVal`/`set` already override the compiled
   * shell's own class-field implementations. One category ('notification') so a burst
   * of ordinary notices shares one cooldown and the newest supersedes the rest, per the
   * contract's "infrequent" and "replaced, not stacked" requirements. `isError` is the
   * one place a caller opts a specific failure out of that cooldown -- see
   * `daemonAction`/`ensureDaemon`, the two genuine boolean-checked failures this passes
   * `true` for -- so a real error is never the line that gets dropped for arriving too
   * soon after a chattier notice.
   */
  /* Two lanes independently wrapped `fire`: one styles copy by humour level and emoji
   * setting, the other speaks it. Composed rather than picked between, and the order is
   * the point -- the narrator speaks the STYLED text, so the humour level reaches speech
   * as the narration contract requires. Narrating the raw text would have the console
   * say one thing while the screen showed another. */
  private narratedFire = (title: string, body: string, isError = false): void => {
    const styled = styledDialog(this.messageStorage, this.currentCopyLanguage(), classifyDialogKind(title), title, body);
    this.narrator.enqueue('notification', styled.body ? `${styled.heading}. ${styled.body}` : styled.heading, { isError });
    this.baseFire(styled.heading, styled.body);
  };

  // ---------------------------------------------------------------- settings sources

  /** Adds what is currently typed, or says every reason it cannot be added. */
  private addSettingsSource(): void {
    const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
    const draft: SourceDraft = {
      url: String(values['src_url'] ?? ''),
      kind: values['src_kind'] === 'home-assistant' ? 'home-assistant' : 'https-api',
      entityId: String(values['src_entity'] ?? ''),
      allowedKeys: String(values['src_keys'] ?? ''),
      credentialKey: String(values['src_credential'] ?? ''),
    };
    const existing = loadSources(this.durableStorage.storage);
    const built = buildSource(draft, `src-${existing.length + 1}-${Date.now()}`);
    if ('problems' in built) {
      this.fire('That source will not work', built.problems.map((problem) => problem.message).join(' '));
      return;
    }
    saveSources(this.durableStorage.storage, [...existing, built]);
    this.refreshSourceStatus();
    this.toast(`Source added. It may set ${built.allowedKeys.join(', ')} and nothing else.`);
  }

  private startSourcePolling(): void {
    void this.pollSettingsSources();
    this.sourceTimer = setInterval(() => { void this.pollSettingsSources(); }, App.SOURCE_POLL_MS);
  }

  /**
   * Asks the privileged process for each source, and hands what comes back to the
   * renderer's own allowlist.
   *
   * The renderer never makes the request itself -- it would need the token, and a renderer
   * holding a token is what every credential rule here exists to prevent. What it does
   * own is the decision about what an answer may change.
   */
  private async pollSettingsSources(): Promise<void> {
    const sources = loadSources(this.durableStorage.storage);
    if (sources.length === 0) {
      if (this.sourceReports.length > 0) { this.sourceReports = []; this.refreshSourceStatus(); }
      return;
    }
    this.sourceGeneration += 1;
    const generation = this.sourceGeneration;
    const reports: SourceReport[] = [];
    const applied: Record<string, string> = {};

    for (const source of sources) {
      /* Nested under `payload`, which is what the dispatch action reads. Spreading these
       * at the top level would put them on the request object where nothing looks. */
      const response = await this.request('settings.source.fetch', {
        payload: { url: source.url, credentialKey: source.credentialKey },
      });
      const at = new Date().toISOString();
      if (!response) {
        /* No bridge at all -- the hosted surface. Recorded rather than silently skipped,
         * so the status says why nothing is tracking. */
        reports.push({ sourceId: source.id, at, ok: false, detail: 'No privileged process to fetch through.' });
        continue;
      }
      if (!response.ok) {
        /* A source that has stopped working is recorded rather than skipped: silently
         * ceasing to track is the failure this whole feature exists to avoid. */
        reports.push({ sourceId: source.id, at, ok: false, detail: response.message });
        continue;
      }
      const raw = response.data as {
        status: number; body: string; byteLength: number; redirected: boolean;
      };
      const outcome = applyResponse(source, { ...raw, generation }, this.sourceGeneration);
      if (isRejected(outcome)) {
        reports.push({ sourceId: source.id, at, ok: false, detail: outcome.rejected });
        continue;
      }
      Object.assign(applied, outcome.applied);
      reports.push({ sourceId: source.id, at, ok: true, detail: 'answering' });
    }

    this.sourceReports = reports;
    /* Applied through the same path a person's own edit takes, so a sourced value is
     * validated and noticed exactly as a manual one is. */
    for (const [key, value] of Object.entries(applied)) {
      this.baseSetVal({ id: key, label: key, kind: 'text' }, value);
    }
    this.refreshSourceStatus();
  }

  private refreshSourceStatus(): void {
    this.sourceStatusLine = sourcesStatusLine(
      loadSources(this.durableStorage.storage),
      this.sourceReports,
    );
    this.forceUpdate();
  }

  /** Reads the `src_allow_host` field exactly as `addSettingsSource` reads its own
   *  fields -- straight out of component state, the same value the control on screen is
   *  showing -- and adds it to the persisted allowlist a settings source may reach. */
  private addSettingsSourceAllowlistHost(): void {
    const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
    const typed = String(values['src_allow_host'] ?? '');
    const result = addAllowlistHost(this.durableStorage.storage, typed);
    if (!result.ok) {
      this.fire('That host will not work', result.problems.map((problem) => problem.message).join(' '));
      return;
    }
    this.forceUpdate();
    this.toast(`${result.host} allowed. A settings source can reach it once the console restarts.`);
  }

  /** The removal half of the control above -- same field, same validator, so a host
   *  that could never have been added is refused with the same message rather than a
   *  confusing "not found" for something that was never a valid host in the first
   *  place. */
  private removeSettingsSourceAllowlistHost(): void {
    const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
    const typed = String(values['src_allow_host'] ?? '');
    const result = removeAllowlistHost(this.durableStorage.storage, typed);
    if (!result.ok) {
      this.fire('That host was not removed', result.problems.map((problem) => problem.message).join(' '));
      return;
    }
    this.forceUpdate();
    this.toast(`${result.host} removed. A settings source configured for it is refused once the console restarts.`);
  }

  // ---------------------------------------------------------------- scheduled settings

  /** Starts the schedule tick and runs one immediately, so a window already in force at
   *  launch applies now rather than up to a tick later. */
  private startScheduler(): void {
    this.runScheduleTick();
    this.scheduleTimer = setInterval(() => this.runScheduleTick(), App.SCHEDULE_TICK_MS);
  }

  /**
   * One tick: work out what should be in force now, and apply only what changed.
   *
   * Every change goes through baseSetVal -- the same path a person's own edit takes -- so
   * a scheduled change is validated, persisted and noticed by the language, emoji and
   * attention interceptions exactly as a manual one is. Writing the values directly would
   * bypass all of that and let the two paths drift apart.
   */
  private runScheduleTick(): void {
    const rules = loadRules(this.durableStorage.storage);
    if (rules.length === 0 && Object.keys(this.scheduleState.applied).length === 0) {
      return;
    }
    const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
    /* A key the runner is not currently overriding is the person's own, so its current
     * value is the base. A key it IS overriding must not be re-read, or the override
     * would be mistaken for the base the moment the window ends. */
    for (const [key, value] of Object.entries(values)) {
      if (key in this.scheduleState.applied) continue;
      if (typeof value === 'string') this.scheduleBase[key] = value;
    }

    const result = tick(this.scheduleBase, rules, new Date(), this.scheduleState);
    this.scheduleState = result.state;
    this.scheduleStatusLine = statusLine(
      result,
      Object.fromEntries(rules.map((rule) => [rule.id, rule.label])),
    );
    for (const [key, value] of Object.entries(result.changes)) {
      this.baseSetVal({ id: key, label: key, kind: 'text' }, value);
    }
    this.forceUpdate();
  }

  // ---------------------------------------------------------------- display name

  /** Seeds the rename field with the stored name. An unset name leaves the control on
   *  its design placeholder rather than pre-filling the shipped name as though somebody
   *  had chosen it, so the difference between default and chosen stays visible. */
  private restoreDisplayName(): void {
    const current = displayName(this.durableStorage.storage);
    if (current === IDENTITY.productName) return;
    this.setState((prior: { values?: Record<string, unknown> }) => ({
      values: { ...(prior.values ?? {}), id_name: current },
    }) as never);
  }

  // ---------------------------------------------------------------- language mode

  /** Restores the saved mode. An unrecognised or absent value leaves English in place
   *  rather than guessing, so a hand-edited settings file cannot strand somebody in a
   *  language they never chose. */
  private restoreLanguageMode(): void {
    const saved = this.durableStorage.storage.getItem(App.LANGUAGE_SETTING);
    if (isLanguageMode(saved)) setLanguageMode(saved);
  }

  /** Every control change routes through the compiled shell's `setVal`; this notices
   *  the language one on its way past, applies it live and persists it, then hands the
   *  change on unchanged so the control behaves like every other control. */
  private languageAwareSetVal = (control: ControlRef, value: unknown): void => {
    /* The display name and the dialog-emoji switch ride the same interception as the
     * language mode: one place that notices a cross-cutting setting going past, rather
     * than three places that each have to remember to. */
    if (control?.id === 'id_name' && typeof value === 'string') {
      const problems = setDisplayName(this.durableStorage.storage, value);
      if (problems.length > 0) {
        /* Report it rather than storing a name the module refused, which would leave
         * the control showing something the app would not accept back. */
        this.fire('That name will not work', problems[0].message);
        return;
      }
    }
    if (control?.id === 'id_name_reset' && value === true) {
      resetDisplayName(this.durableStorage.storage);
      this.toast(`Name restored to ${IDENTITY.productName}`);
    }
    /* The five attention modes share one prefix and one handler, so adding a sixth is
     * a registry entry rather than another branch here. */
    /* Two dials, one per language, deliberately not one shared slider. */
    if ((control?.id === 'fun_level' || control?.id === 'fun_level_yue') && typeof value === 'number') {
      const language: CopyLanguage = control.id === 'fun_level_yue' ? 'yue' : 'en';
      if (isFunnyLevel(value)) setFunnyLevel(this.durableStorage.storage, language, value);
    }
    const settingGroup = control?.id === undefined ? undefined : App.consoleSettingGroup(control.id);
    if (settingGroup !== undefined && control?.id !== undefined) {
      /* Falls through to baseSetVal afterwards, so the control shows what was chosen. */
      this.durableStorage.storage.setItem(
        `${App.CONSOLE_SETTING_PREFIX}${settingGroup}.${control.id}`, JSON.stringify(value));
      if (control.id === 'p_scale' || control.id === 'p_motion' || control.id === 'p_mono') {
        this.applyLiveAppearanceSetting(control.id, value);
      } else if (control.id === 'p_start') {
        this.applyStartScreen();
      } else if (control.id === 'p_tour' && value === true) {
        /* Fires immediately when the switch is turned on -- 'on launch' still governs
         * the next real relaunch, via applyRestoredLiveConsoleSettings. */
        this.set('onboardOpen', true);
      }
    }
    if (control?.id === 'ix_secret_set') {
      this.announceSecretIntent(value === true);
      return;
    }
    if (control?.id === 'dp_go' && value === true) {
      void this.deployConsole();
      return;
    }
    if (control?.id === 'logo_preset' && typeof value === 'string') {
      /* Matched by LABEL because that is what the picker offers; the stable id is what
       * gets stored, so a renamed label never orphans somebody's choice. */
      const preset = LOGO_PRESETS.find((candidate) => candidate.label === value);
      if (preset) choosePreset(this.durableStorage.storage, preset.id);
      this.refreshLogoStatus();
      /* Falls through to baseSetVal deliberately. Returning here would apply the change and
       * leave the picker showing the old value -- a control you operate that visibly does
       * not move reads as broken, whatever it did underneath. The action-style switches
       * below DO return, because their value is a press rather than a state. */
    }
    if (control?.id === 'logo_reset' && value === true) {
      resetLogo(this.durableStorage.storage);
      this.pickedFileNames.delete('logo_pick');
      this.refreshLogoStatus();
      return;
    }
    if (control?.id?.startsWith('nar_')) {
      /* Same as the mark picker above: apply, then fall through so the switch, the two voice
       * pickers and both sliders actually show what was chosen. */
      this.applyNarrationControl(control.id, value);
    }
    if (control?.id === 'src_add' && value === true) {
      this.addSettingsSource();
      return;
    }
    if (control?.id === 'src_clear' && value === true) {
      saveSources(this.durableStorage.storage, []);
      this.sourceReports = [];
      this.refreshSourceStatus();
      this.toast('Every settings source removed. Your own settings are unaffected.');
      return;
    }
    if (control?.id === 'src_allow_add' && value === true) {
      this.addSettingsSourceAllowlistHost();
      return;
    }
    if (control?.id === 'src_allow_remove' && value === true) {
      this.removeSettingsSourceAllowlistHost();
      return;
    }
    if (control?.id === 'school_mode' && typeof value === 'boolean') {
      this.setSchoolMode(value);
      return;
    }
    if (control?.id === 'school_unlock' && value === true) {
      this.setSchoolMode(false);
      return;
    }
    if (control?.id === 'school_set_credential' && value === true) {
      this.storeSchoolCredential();
      return;
    }
    if (control?.id === 'school_name' && typeof value === 'string' && value.trim() !== '') {
      const renamed = renameSchoolMode(this.durableStorage.storage, value);
      if (!renamed.ok) {
        this.fire('That name will not work', renamed.reason ?? 'The name was refused.');
        return;
      }
      this.refreshSchoolStatus();
    }
    if (control?.id === 'ed_choice' && typeof value === 'string') {
      const editor = KNOWN_EDITORS.find((candidate) => candidate.name === value);
      if (editor) chooseEditor(this.durableStorage.storage, editor.id);
    }
    if (control?.id === 'ed_custom_name' || control?.id === 'ed_custom_path') {
      /* Neither field alone names an editor; a candidate is built from both, using the
       * value this change is carrying for the one that just changed and whatever the
       * other field already held. Saved only once it passes the same validation the
       * editor screen's info text promises -- a bare executable, never a command line. */
      const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
      const candidate: CustomEditor = {
        name: String(control.id === 'ed_custom_name' ? value : values['ed_custom_name'] ?? ''),
        executable: String(control.id === 'ed_custom_path' ? value : values['ed_custom_path'] ?? ''),
      };
      if (validateCustomEditor(candidate).length === 0) {
        saveCustomEditor(this.durableStorage.storage, candidate);
        chooseEditor(this.durableStorage.storage, CUSTOM_EDITOR_ID);
      }
      /* Falls through to baseSetVal: the field must keep showing what was typed even
       * before both halves are complete enough to save. */
    }
    if (control?.id === 'ed_clear' && value === true) {
      clearEditorChoice(this.durableStorage.storage);
      this.toast('Editor choice forgotten');
    }
    if (control?.id === 'sup_open' && value === true) {
      this.fileSupportTicket();
      return;
    }
    if (control?.id?.startsWith('att_') && typeof value === 'boolean') {
      const mode = App.ATTENTION_CONTROLS[control.id];
      if (isAttentionMode(mode)) {
        setModeEnabled(this.durableStorage.storage, mode, value);
        /* Applied live rather than only on the next restart -- the same reasoning as
         * every other live-applied appearance/attention setting above. */
        if (mode === 'lowStimulation') this.narrator.setQuiet(value);
      }
    }
    if (control?.id === 'dlg_emoji' && typeof value === 'boolean') {
      setEmojisEnabled(this.durableStorage.storage, value);
    }
    if (control?.id === 'lang_mode') {
      const mode = App.LANGUAGE_CHOICES[String(value)];
      if (mode && mode !== languageMode()) {
        setLanguageMode(mode);
        this.durableStorage.storage.setItem(App.LANGUAGE_SETTING, mode);
      }
    }
    this.baseSetVal(control, value);
  };

  /** Read by the compiled `text`-kind control marked `action:'daemon-status'`/`'vocab-status'`. */
  controlActionText = (action: string): string => {
    if (action === 'daemon-status') return this.daemonStatusLine;
    if (action === 'schedule-status') return this.scheduleStatusLine;
    if (action === 'school-status') return this.schoolStatusLine;
    if (action === 'contrast-status') return this.contrastStatus();
    if (action === 'appearance-scope') return this.appearanceScope();
    if (action === 'deploy-progress') return this.deployProgressLine;
    if (action === 'source-status') return this.sourceStatusLine;
    if (action === 'settings-source-allowlist-status') return sourceAllowlistStatusLine(loadAllowlist(this.durableStorage.storage));
    if (action === 'narration-status') return this.narrationStatusLine;
    if (action === 'logo-status') return this.logoStatusLine;
    if (action === 'deploy-status') return this.deployStatusLine();
    if (action === 'ivr-dialplan') return this.ivrDialplanText();
    if (action === 'vocab-status') return vocabularyStatus(this.vocabStorage).status;
    return '';
  };

  /** Read by every control the design marks with `c.action`, whatever its kind. */
  onControlAction = (action: string): void => {
    if (action === 'vocab-clear') { this.onFileCleared({ id: 'va_file' }); return; }
    if (action === 'daemon-start') { void this.daemonAction('start'); return; }
    if (action === 'daemon-stop') { void this.daemonAction('stop'); return; }
    if (action === 'daemon-restart') { void this.daemonAction('restart'); return; }
  };

  // ---------------------------------------------------------------- server add / remove

  /** Reads the already-bound `sv_*` connection controls straight out of component state —
   *  the same values the form on screen is showing — and adds the configured server. */
  onAddServer = async (): Promise<void> => {
    const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
    const kindLabel = String(values.sv_kind ?? 'Local');
    const kindMap: Record<string, string> = { Local: 'local', 'Local Docker': 'local-docker', SSH: 'ssh', 'SSH Docker': 'ssh-docker' };
    const connectionKind = kindMap[kindLabel] ?? 'local';
    const host = String(values.sv_host ?? '');
    const input: { name: string; connectionKind: string; wslDistribution?: string; host?: string; user?: string; port?: number } = {
      name: host || `connection-${this.servers.servers.length + 1}`,
      connectionKind,
    };
    if (connectionKind !== 'local') input.host = host;
    if (connectionKind === 'ssh' || connectionKind === 'ssh-docker') {
      input.user = String(values.sv_user ?? '');
      input.port = Number(values.sv_sshport ?? 22);
    }
    const created = await this.servers.add(input as never);
    this.forceUpdate();
    if (created) this.fire('Connection added', `${created.name} is now in the server list below.`);
    else this.fire('Not added', 'The control plane did not accept that connection.');
  };

  /** The design has already run this past `areYouSure` before calling it. */
  onRemoveServerRow = async (name: string): Promise<void> => {
    const server = this.servers.servers.find((s) => s.name === name);
    if (!server) { this.fire('Not found', `${name} is no longer in the server list.`); return; }
    const removed = await this.servers.remove(server.id);
    this.forceUpdate();
    if (removed) this.fire('Connection removed', `${name} was removed from the server list.`);
    else this.fire('Not removed', 'The control plane did not accept that removal.');
  };

  // ---------------------------------------------------------------- onboarding wizard

  /** True while a real deploy or connect from the wizard is in flight, so the button
   *  cannot be pressed twice and start two transactions against the same target. */
  private onboardBusy = false;

  private onboardAnswers(): OnboardAnswers {
    const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
    const intent = values.ob_intent === 'Connect to an existing one' ? 'Connect to an existing one' : 'Deploy a new server';
    return {
      intent,
      phones: Number(values.ob_phones ?? 8),
      menu: values.ob_menu !== false,
      tls: values.ob_tls !== false,
      // The wizard never asked a separate "harden" question; the only affordance for
      // it is the confirmation-gate choice on the Safety step. Any gate stronger than
      // the loosest one counts as asking for hardening, so "Credits allowed" (the
      // weakest) is the one case that does not imply it.
      hardened: String(values.ob_gates ?? 'All four gates') !== 'Credits allowed',
    };
  }

  /** Reads the three files the deploy touches, in parallel, tolerating an absent file
   *  (an empty section list) the same way the rest of the console already does. */
  private async readOnboardInputs(serverId: string): Promise<OnboardPlanInputs> {
    const read = async (resource: string): Promise<ConfigValue> => {
      const response = await this.request('pbx.config', { serverId, payload: { resource } });
      const value = (response as { data?: { value?: ConfigValue } } | undefined)?.data?.value;
      return Array.isArray(value) ? value : [];
    };
    const [pjsip, extensions, http] = await Promise.all([
      read('/etc/asterisk/pjsip.conf'),
      read('/etc/asterisk/extensions.conf'),
      read('/etc/asterisk/http.conf'),
    ]);
    return { pjsip, extensions, http };
  }

  /** The "connect to an existing one" half of the wizard's first question. Reuses the
   *  exact server-add path the Deploy & servers screen already uses for real, rather
   *  than a second implementation that could drift from it. */
  private async onboardConnect(): Promise<void> {
    const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
    const whereLabel = String(values.ob_where ?? 'This machine');
    const whereMap: Record<string, string> = { 'This machine': 'local', 'Local Docker': 'local-docker', SSH: 'ssh', 'SSH Docker': 'ssh-docker' };
    const connectionKind = whereMap[whereLabel] ?? 'local';
    const host = String(values.ob_host ?? '');
    const input: { name: string; connectionKind: string; host?: string } = {
      name: host || `connection-${this.servers.servers.length + 1}`,
      connectionKind,
    };
    if (connectionKind !== 'local') input.host = host;
    const created = await this.servers.add(input as never);
    this.forceUpdate();
    if (created) {
      this.fire('Connected', `${created.name} was added to the server list and is available on Deploy & servers.`);
      void this.discover();
      this.set('onboardOpen', false);
      this.set('screen', 'servers');
      this.set('railId', 'app');
    } else {
      this.fire('Not connected', 'The control plane did not accept that connection. Nothing was written.');
    }
  }

  /** The "deploy a new server" half. Ensures a target exists (provisioning the local
   *  runtime if the console has none yet), reads what is really on it, builds the plan
   *  with `buildOnboardPlan`, previews it through the same confirmation gate every
   *  other write in the app uses, and — only on confirmation — applies it and reports
   *  exactly what happened, per resource. */
  private async onboardDeploy(): Promise<void> {
    if (!this.target.connected) {
      if (!canProvision(this.runtime)) {
        this.fire('No target', `Nothing is connected and a runtime cannot be created here: ${runtimeLabel(this.runtime)}`);
        return;
      }
      this.toast('Creating the Asterisk runtime for the wizard — this takes a while.');
      const provisioned = await this.request('runtime.provision');
      if (!provisioned?.ok) {
        this.fire('Not created', provisioned?.message ?? 'Creating the runtime did not succeed, so there is nothing to deploy to.');
        return;
      }
      await this.discover();
      if (!this.target.connected) {
        this.fire('No target', 'The runtime was created but nothing is connected yet — open Deploy & servers to finish connecting, then try the wizard again.');
        return;
      }
    }

    const answers = this.onboardAnswers();
    const inputs = await this.readOnboardInputs(this.target.id);
    const plan = buildOnboardPlan(answers, inputs);

    const summaryLines = [
      `Target: ${this.target.label}`,
      ...plan.summary.map((line) => `• ${line}`),
      ...plan.skipped.map((line) => `• ${line}`),
      `Business hours: ${ONBOARD_HOURS_NOTE}`,
      '',
      'Every file is backed up before it is touched, and this is recorded in local history so it can be restored.',
    ].filter((line, i, arr) => line !== '' || arr[i - 1] !== '');

    if (plan.summary.length === 0) {
      this.fire('Nothing to change', 'The target already matches what the wizard would have written, so nothing was touched.');
      this.set('onboardOpen', false);
      this.set('screen', 'servers');
      this.set('railId', 'app');
      return;
    }

    this.areYouSure('Apply the deploy plan?', summaryLines.join('\n'), 3, () => {
      if (this.onboardBusy) return;
      this.onboardBusy = true;
      void (async () => {
        try {
          const response = await this.request('pbx.apply', { serverId: this.target.id, payload: { documents: plan.documents } });
          const result = (response as { data?: { result?: { status: string; message?: string } }; message?: string } | undefined);
          if (!response?.ok) {
            this.fire('Deploy not applied', `${response?.message ?? result?.data?.result?.message ?? 'The target refused the change.'}`);
            return;
          }
          const secretLines = plan.newExtensions.map((e) => `${e.id}: ${e.secret}`).join('\n');
          this.fire(
            'Deployed',
            [
              `Applied: ${plan.summary.join('; ')}.`,
              plan.newExtensions.length > 0 ? `New extension secrets (shown once — write these down):\n${secretLines}` : '',
              plan.skipped.length > 0 ? `Not applied: ${plan.skipped.join(' ')}` : '',
              'Every changed file was backed up first and is in local history if you need to undo this.',
            ].filter(Boolean).join('\n\n'),
          );
          this.set('onboardOpen', false);
          this.set('screen', 'servers');
          this.set('railId', 'app');
        } finally {
          this.onboardBusy = false;
        }
      })();
    });
  }

  /** The endpoint whose settings the controls below are currently showing. */
  private editingEndpoint = '';

  /** The target's real pjsip.conf, or undefined when it has not been read. */
  private pjsipValue(): ConfigValue | undefined {
    return this.configs.endpoints?.state === 'read' ? this.configs.endpoints.value : undefined;
  }

  /**
   * Loading a row into the controls below it.
   *
   * The design announced that this had happened and did nothing: the controls bind to a
   * section named `endpoint`, which a real pjsip.conf never contains, so nothing was ever
   * loaded and the toast was simply untrue.
   */
  onPickRow = (name: string): void => {
    const value = this.pjsipValue();
    if (!value) { this.fire('Not loaded', 'The pjsip.conf on this target has not been read yet.'); return; }
    const endpoint = findEndpoint(value, name);
    if (!endpoint) { this.fire('Not loaded', `${name} is not in this target's pjsip.conf.`); return; }
    this.editingEndpoint = name;
    const state = this.state as { values: Record<string, unknown> };
    this.setState({ values: { ...state.values, ...controlValuesFor(endpoint) } } as never);
    this.toast(`${name} loaded into the editor below.`);
  };

  /**
   * Real bulk-action handling for every table-like screen.
   *
   * The design's own `bulk()` cleared the selection and announced a canned
   * sentence ("Enabled: 3 objects in one action.") whether or not anything
   * was actually eligible. This builds a real plan through `bulk.ts` -- which
   * items are affected versus skipped, and why -- and reports that plan
   * before acting on it, exactly as the bulk-actions contract requires.
   *
   * The 'Exported' verb additionally runs the selected rows through the real
   * export engine (`export.ts`): it picks a format that can faithfully carry
   * the columns actually on screen, states any loss the format entails, and
   * hands the browser a real file download built from those exact rows --
   * never the whole table when only a few rows are selected.
   */
  bulk = (verb: string, sel: string[]): void => {
    const screen = (this.state as { screen: string }).screen;
    const screens = SCREENS as Record<string, { table?: { rows: string[][]; cols: string[] } }>;
    const table = screens[screen]?.table;
    const cols = table?.cols ?? [];
    const rows = table?.rows ?? [];
    const known = new Set(rows.map((r) => r[0]));

    // Every selected row that no longer exists in the current table (deleted,
    // filtered out) is a real skip with a real reason -- never silently dropped.
    const plan = planBulk(verb, sel, (id) => (known.has(id) ? true : 'no longer in this table'), {
      destructive: verb === 'Deleted',
    });
    const message = bulkSummarise(plan);

    if (verb === 'Exported') {
      if (plan.affected.length === 0) {
        this.fire('Nothing to export', message);
        return;
      }
      const byId = new Map(rows.map((r) => [r[0], r] as const));
      const records = plan.affected.map((id) => {
        const row = byId.get(id) ?? [];
        return Object.fromEntries(cols.map((c, i) => [c, row[i] ?? ''])) as Record<string, unknown>;
      });
      const formats = suitableFormats(records);
      const format: ExportFormat = formats.includes('csv') ? 'csv' : (formats[0] ?? 'json');
      const text = exportRows({ rows: records, format, table: screen });
      const loss = describeLoss(records, format);
      const filename = exportFilename(screen, format);
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      this.set('selected', []);
      const lossNote = loss.length > 0 ? ` ${loss.join(' ')}` : '';
      this.fire('Exported', `${message} Saved as ${filename} — ${format.toUpperCase()}, UTF-8, LF line endings.${lossNote}`);
      return;
    }

    // Every other bulk verb (Enable/Disable/Duplicate/...) has no write path in this
    // console yet -- the plan and its honest count are real, but nothing is applied.
    this.set('selected', []);
    this.fire(verb, message);
  };

  /**
   * Selection mechanics for the current table screen, run through `bulk.ts` rather
   * than the design's own array-splice logic: shift-click ranges, ctrl-click toggles,
   * select-all-on-this-page, and inverse selection all go through the real functions
   * the bulk-actions contract requires every list to have.
   *
   * Select-all only ever has a "page" scope here: this console has no server-side
   * paging or a superset of matches beyond the rows already read from the target, so
   * "this page" and "every match" are the same set. `selectAll`'s `matches` scope is
   * therefore unused, and the result is reported as a page-scoped selection rather
   * than claiming a broader one the console cannot actually distinguish.
   */
  private bulkSelectionVals(screen: string, values: Record<string, unknown>): Record<string, unknown> {
    const screens = SCREENS as Record<string, { table?: { rows: string[][] } }>;
    const table = screens[screen]?.table;
    if (!table) return {};
    const ids = table.rows.map((r) => r[0]);
    const state = this.state as { selected?: string[] };
    const selectedArr = state.selected ?? [];
    const sel: SelectionState = {
      anchor: selectedArr.length > 0 ? selectedArr[selectedArr.length - 1] : undefined,
      selected: new Set(selectedArr),
    };
    const apply = (next: SelectionState) => this.set('selected', [...next.selected]);

    const rows = Array.isArray(values.tableRows) ? (values.tableRows as Array<Record<string, unknown>>) : [];
    const tableRows = rows.map((row, i) => ({
      ...row,
      toggle: (e?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) => {
        const modifiers = { shift: !!e?.shiftKey, ctrl: !!(e?.ctrlKey || e?.metaKey) };
        apply(bulkClick(sel, ids[i], modifiers, ids));
      },
    }));

    const existingActions = Array.isArray(values.bulkActions)
      ? (values.bulkActions as Array<{ icon: string; label: string; run: () => void }>)
      : [];

    return {
      tableRows,
      /* Every screen with a table shares this one renderer, so every one of them drew a header
       * row with nothing underneath and no word about why. On the endpoints screen -- a first
       * run, nothing configured -- that is the whole table: five column names and blank space,
       * which reads as a table that failed to load rather than as one with nothing in it yet.
       * The message is deliberately about the rows, not about the system: a filter that matches
       * nothing and a target that has nothing are different situations and say so. */
      noTableRows: tableRows.length === 0,
      tableEmptyText: ids.length === 0
        ? 'Nothing here yet. Anything this screen reads from the target, or that you add with the button above, appears in this table.'
        : 'No rows match the current search or filter. Clear them to see all ' + String(ids.length) + '.',
      toggleAll: () => apply(selectedArr.length === ids.length && ids.length > 0
        ? bulkClearSelection(sel)
        : bulkSelectAll(sel, 'page', ids, ids).state),
      clearSelection: () => apply(bulkClearSelection(sel)),
      bulkActions: existingActions.concat([
        { icon: 'flip_camera_android', label: 'Invert selection', run: () => apply(bulkInvert(sel, ids)) },
      ]),
    };
  }

  /**
   * Real local TOTP pairing for the per-element lock wizard (totp.ts).
   *
   * The design's own button just toasted "Built-in authenticator paired for this
   * element only" and did nothing -- no secret ever existed. This generates a real
   * random secret with the Web Crypto RNG, computes the real otpauth:// pairing URI,
   * and reveals both through the info panel. The compiled QR box next to this button
   * is a static decorative gradient with no bound slot for pixel data (not S(v...)
   * anywhere in it) and adding one would mean editing the compiled design, which is
   * out of scope here -- so the secret is shown as copyable text instead of a
   * scannable image. Nothing here ever leaves this machine: there is no network call
   * of any kind in this method.
   */
  pairAuth = (): void => {
    const s = this.state as { lockKey: string; lockTarget: string; lockX?: string; lockY?: string };
    const secretBytes = new Uint8Array(20);
    crypto.getRandomValues(secretBytes);
    const secret = encodeBase32(secretBytes);
    const account = s.lockTarget || s.lockKey || 'this element';
    const uri = pairingUri({ issuer: 'Ding PBX Console', account, parameters: { secret } });
    this.setState({ totpPendingSecret: secret, totpPendingUri: uri } as never);
    this.showInfo(
      'Authenticator secret',
      `Generated on this computer just now and never sent anywhere. Base32 secret: ${secret} - `
        + `algorithm SHA-1, 6 digits, 30s period. Pairing URI: ${uri} - Add it to any TOTP app, `
        + 'then finish this wizard to lock the element with it.',
      'This build shows the real one-time secret as text rather than a scannable QR image -- copy it '
        + 'into your authenticator app by hand.',
      s.lockX || '40%',
      s.lockY || '22%',
    );
    this.fire('Authenticator paired', 'A real TOTP secret was generated locally for this element.');
  };

  /**
   * Finishes the per-element lock wizard (real version of the design's lockNext).
   * Identical to the compiled original for PIN/Password, plus: a TOTP-including
   * method cannot finish until pairAuth has actually generated a secret, and the
   * real secret -- not a placeholder -- is what gets stored in the lock record.
   */
  lockNext = (): void => {
    const s = this.state as {
      lockStep: number; lockMethod: string; pin: string; password: string; lockTarget: string; lockKey: string;
      locks: Record<string, { method: string; pin: string; password: string; totpSecret?: string; target: string }>;
      totpPendingSecret?: string;
    };
    if (s.lockStep < 3) { this.set('lockStep', s.lockStep + 1); return; }
    const needsPin = s.lockMethod.indexOf('PIN') >= 0;
    const needsPw = s.lockMethod.indexOf('Password') >= 0;
    const needsTotp = s.lockMethod.indexOf('TOTP') >= 0;
    if (needsPin && s.pin.length < 4) { this.toast('Set at least a four-digit PIN first'); return; }
    if (needsPw && (s.password || '').length < 4) { this.toast('Set a passphrase first'); return; }
    if (needsTotp && !s.totpPendingSecret) { this.toast('Pair the built-in authenticator first'); return; }
    const L = { ...s.locks };
    L[s.lockKey] = {
      method: s.lockMethod, pin: s.pin, password: s.password, target: s.lockTarget,
      ...(needsTotp ? { totpSecret: s.totpPendingSecret } : {}),
    };
    this.setState({ locks: L, lockOpen: false, totpPendingSecret: undefined, totpPendingUri: undefined } as never);
    this.toast(`${s.lockTarget} is locked with ${s.lockMethod} -- the surface is now disabled`);
  };

  /**
   * Real unlock check (real version of the design's tryUnlock), extended to verify
   * a real RFC 6238 code (totp.ts, one step of skew allowed) when the lock's method
   * includes TOTP -- the compiled original silently ignored TOTP methods and only
   * ever checked PIN/password. After three consecutive wrong attempts on the same
   * lock it offers the unlock ladder (unlock-ladder.ts) instead of only re-toasting.
   */
  tryUnlock = async (): Promise<void> => {
    const s = this.state as {
      locks: Record<string, { method?: string; pin?: string; password?: string; totpSecret?: string }>;
      unlockKey: string; unlockPin: string; unlockPw: string; unlockTotpDigits?: string;
    };
    const L = s.locks[s.unlockKey];
    if (!L) { this.setState({ unlockOpen: false } as never); return; }
    const m = L.method || 'PIN';

    const wrong = (message: string): void => {
      const count = (this.wrongUnlockCounts[s.unlockKey] ?? 0) + 1;
      this.wrongUnlockCounts[s.unlockKey] = count;
      this.setState({
        unlockPin: '', unlockTotpDigits: '', unlockPhase: m.indexOf('PIN') >= 0 ? 'pin' : 'totp',
      } as never);
      if (count >= 3) {
        const result = this.ladder.issue(s.unlockKey);
        if (result.rung === 'clock') {
          this.toast(`${message} -- ${result.reason}`);
          return;
        }
        if (result.rung === 'moles') {
          this.toast(`${message} -- the next challenge needs a visual board this build cannot show yet. Wait it out.`);
          return;
        }
        this.setState({ ladderActive: true, ladderChallenge: result, ladderDigits: '', ladderSumsAnswers: [] } as never);
        this.toast(`${message} -- or clear a quick challenge instead of waiting. It only clears the wait, not this credential.`);
        return;
      }
      this.toast(message);
    };

    if (m.indexOf('PIN') >= 0 && s.unlockPin !== L.pin) { wrong('Wrong PIN -- the surface stays locked'); return; }
    if (m.indexOf('Password') >= 0 && (s.unlockPw || '') !== L.password) { wrong('Wrong passphrase -- the surface stays locked'); return; }
    if (m.indexOf('TOTP') >= 0) {
      if (!L.totpSecret) { wrong('No authenticator secret is on record for this element'); return; }
      const params: TotpParameters = { secret: L.totpSecret };
      const ok = await verifyCode(params, s.unlockTotpDigits ?? '', Date.now(), 1);
      if (!ok) { wrong('Wrong code -- the surface stays locked'); return; }
    }

    const n = { ...s.locks };
    delete n[s.unlockKey];
    this.wrongUnlockCounts[s.unlockKey] = 0;
    this.setState({
      locks: n, unlockOpen: false, unlockPin: '', unlockPw: '', unlockTotpDigits: '', unlockPhase: undefined,
      ladderActive: false, ladderChallenge: null,
    } as never);
    this.fire('Unlocked', 'Welcome back.');
  };

  /**
   * Grades one ladder answer and either clears the wait, escalates to the next
   * rung, or falls to the clock -- exactly per unlock-ladder.ts's own rules.
   * Rule 1 (never a credential) is kept explicitly honest here: a cleared
   * challenge only closes the ladder and says so; it never touches s.locks
   * or the unlock dialog's own PIN/password/TOTP state, so the real credential
   * is still required afterward.
   */
  private finishLadderGrade(result: GradeResult, lockKey: string): void {
    if (result.cleared) {
      this.setState({ ladderActive: false, ladderChallenge: null, ladderDigits: '', ladderSumsAnswers: [] } as never);
      this.toast('Challenge cleared -- the wait is over. You still need the real PIN, passphrase or code.');
      return;
    }
    const next = this.ladder.issue(lockKey);
    if (next.rung === 'clock' || next.rung === 'moles') {
      this.setState({ ladderActive: false, ladderChallenge: null } as never);
      this.toast(next.rung === 'clock'
        ? `Wrong. ${next.reason}`
        : 'Wrong. The next challenge needs a visual board this build cannot show yet.');
      return;
    }
    this.setState({ ladderChallenge: next, ladderDigits: '', ladderSumsAnswers: [] } as never);
    this.toast('Wrong -- try again.');
  }

  /** Writes the controls back onto the endpoint they were loaded from. */
  onSaveEndpoint = async (): Promise<void> => {
    const value = this.pjsipValue();
    if (!value || !this.editingEndpoint) { this.fire('Nothing to save', 'Select an endpoint first.'); return; }
    const edit = applyControlValues(value, this.editingEndpoint, (this.state as { values: Record<string, unknown> }).values);
    if ('error' in edit) { this.fire('Not saved', edit.error); return; }
    if (edit.summary.length === 0) { this.toast('Nothing changed, so nothing was written.'); return; }
    await this.writePjsip(editDocument(edit, PJSIP_RESOURCE), edit.summary, `${this.editingEndpoint} updated`);
  };

  /** Removes the loaded endpoint, meaning all three of its sections. */
  onDeleteEndpoint = (): void => {
    const value = this.pjsipValue();
    if (!value || !this.editingEndpoint) { this.fire('Nothing to remove', 'Select an endpoint first.'); return; }
    const name = this.editingEndpoint;
    const removal = removeEndpoint(value, name);
    if ('error' in removal) { this.fire('Not removed', removal.error); return; }
    this.areYouSure('Remove ' + name, removal.summary.join('\n'), 3, () => {
      void this.writePjsip(editDocument(removal, PJSIP_RESOURCE), removal.summary, `${name} removed`).then(() => {
        this.editingEndpoint = '';
      });
    });
  };

  /** Creating one from the guided wizard's own answers. */
  onCreateEndpoint = async (): Promise<void> => {
    const value = this.pjsipValue() ?? [];
    const draft = buildEndpointDraft(value, (this.state as { values: Record<string, unknown> }).values);
    if ('error' in draft) { this.fire('Not created', draft.error); return; }
    const applied = await this.writePjsip(endpointDocument(draft), draft.summary, `${draft.view.endpoints.slice(-1)[0].name} created`);
    /* Shown once, and deliberately never in the plan above: a plan gets read aloud and
     * screenshotted, and a password has no business in one. */
    if (applied) {
      this.fire('Write this password down', `${String((this.state as { values: Record<string, unknown> }).values[WIZARD_CONTROLS.name] ?? '')}: ${draft.secret}

It is shown once. The phone needs it to register.`);
    }
  };

  /** One write path for all three, so none of them can skip the backup and read-back. */
  private async writePjsip(document: { resource: string; value: ConfigValue }, summary: string[], done: string): Promise<boolean> {
    const payload = { documents: [{ resource: document.resource, value: document.value }] };
    const planned = await this.request('pbx.plan', { serverId: this.target.id, payload });
    if (!planned?.ok) { this.fire('Not written', planned?.message ?? 'The control plane did not answer.'); return false; }
    const applied = await this.request('pbx.apply', { serverId: this.target.id, payload });
    if (!applied?.ok) { this.fire('Not written', applied?.message ?? 'The change was planned but not applied.'); return false; }
    /* The reading is now stale, and a stale reading is how the next edit gets built on a
     * value that is no longer there. */
    delete this.configs.endpoints;
    this.seeded.delete('endpoints');
    this.fire(done, summary.join('\n'));
    this.forceUpdate();
    return true;
  }

  /** Reads the screen currently on top, once per screen change. */
  private refresh = async () => {
    const screen = (this.state as { screen: string }).screen;
    if (!this.target.connected) return;
    const now = Date.now();
    const mayStartRead = (key: string): boolean => {
      const previous = this.readStartedAt.get(key) ?? 0;
      if (now - previous < 1000) return false;
      this.readStartedAt.set(key, now);
      return true;
    };
    if (screen === 'canvas') {
      const canvasAvailable = this.canvasReadings?.dialplan?.result.state === 'available';
      if (canvasAvailable || this.canvasPending || !mayStartRead('canvas')) return;
      this.canvasPending = true;
      const response = await this.request('pbx.read', { serverId: this.target.id, view: 'canvas' as PbxReadView });
      this.canvasPending = false;
      this.canvasReadings = response?.ok
        ? (response.data as CanvasReadings)
        : { dialplan: { command: 'pbx.read', result: { state: 'unavailable', observedAt: new Date().toISOString(), reason: response?.message ?? 'the control plane did not answer' } } };
      this.forceUpdate();
      return;
    }
    /* A configuration screen names the file it edits. Read that file from the target so
     * the screen can show what the machine actually has, instead of standing there
     * displaying the design's own defaults as though they were settings in force. */
    const resource = resourceForFile((SCREENS as Record<string, { file?: unknown }>)[screen]?.file);
    if (resource && (!this.configs[screen] || this.configs[screen]?.state === 'unavailable') && this.configPending !== screen && mayStartRead(`config:${screen}`)) {
      this.configPending = screen;
      const response = await this.request('pbx.config', { serverId: this.target.id, payload: { resource } });
      this.configPending = '';
      this.configs[screen] = response?.ok
        ? { resource, state: 'read', value: (response.data as { value?: ConfigValue }).value, observedAt: new Date().toISOString() }
        : { resource, state: 'unavailable', reason: response?.message ?? 'the control plane did not answer', observedAt: new Date().toISOString() };

      /* Seed the bound controls from the file that was just read. The design reads a
       * control as `values[id]` falling back to its own default, so putting the target's
       * real setting into `values` is what turns a switch showing a shipped default into
       * a switch showing what the machine has. Only bound controls move; the rest keep
       * the design default and are reported as unmapped rather than quietly implied to
       * be live. Seeded once per screen so a reading never overwrites an edit in
       * progress. */
      const live = this.configs[screen];
      if (live?.state === 'read' && !this.seeded.has(screen)) {
        const bound = readControlValues(screen, live.value);
        if (Object.keys(bound).length > 0) {
          const state = this.state as { values: Record<string, unknown> };
          this.setState({ values: { ...state.values, ...bound } } as never);
        }
        this.seeded.add(screen);
      }
      this.forceUpdate();
    }

    if (!isReadable(screen)) return;
    const existing = this.readings[screen];
    const hasUnavailableReading = existing && Object.values(existing).some((reading) => reading?.result.state === 'unavailable');
    if ((existing && !hasUnavailableReading) || this.pending === screen || !mayStartRead(screen)) return;
    this.pending = screen;
    const serverId = this.target.id;
    const token = this.servers.begin(serverId);
    const response = await this.request('pbx.read', { serverId, view: screen as PbxReadView });
    this.pending = '';
    const data: ViewReadings = response?.ok
      ? (response.data as ViewReadings)
      : { channels: { command: 'pbx.read', result: { state: 'unavailable', observedAt: new Date().toISOString(), reason: response?.message ?? 'the control plane did not answer' } } };
    /* Guarded write: dropped, rather than applied, when a newer request for this same
     * server has since been issued, or when the active server has since changed out
     * from under this in-flight request (`this.target.id` may no longer equal
     * `serverId` by the time this answer lands). Either way the screen keeps waiting
     * for a current answer instead of showing a stale or misrouted one. */
    /* Keyed by screen, which is how it is read back. Without the key the guard files the
     * answer under the server id instead and every table renders empty while reporting
     * nothing wrong. */
    if (!this.servers.applyReading(token, this.target.id, this.readings as Record<string, ViewReadings>, data, screen)) return;
    this.forceUpdate();
  };

  /** The design's sample rows are replaced before it builds the table, so selection,
   *  filtering, chips and the row context menu keep working against real rows. */
  private applyRows(screen: string): void {
    const screens = SCREENS as Record<string, { table?: { rows: string[][] } }>;
    for (const id of TABLE_SCREENS) {
      const table = screens[id].table;
      if (!table) continue;
      if (id !== screen) {
        table.rows = [];
        continue;
      }
      /* The servers table is the one screen whose rows are not a reading from a PBX:
       * they are the console's own configured servers, which exist whether or not
       * anything is reachable. Feeding it from `readings` left it permanently empty. */
      table.rows = id === 'servers' ? serverRows(this.servers.servers) : rowsFor(screen, this.readings[screen]);
    }
  }

  private note(screen: string): string {
    if (screen === 'history') return NO_HISTORY;
    if (screen === 'memory') return NO_MEMORY;
    if (screen === 'trunkauth') return NO_AUTH_REQUESTS;
    if (!this.target.connected) return `No target is connected — ${this.target.detail}.`;
    /* A configuration screen reports the file it edits and what is really in it. This
     * says what was read; it does not claim the controls below are bound to it, because
     * they are not yet, and implying otherwise would be the same untruth the
     * confirmation dialog used to tell. */
    if (resourceForFile((SCREENS as Record<string, { file?: unknown }>)[screen]?.file)) {
      const summary = configSummary(this.configs[screen], this.target.connected);
      /* Say how many controls on this screen are genuinely bound to that file. A screen
       * that reads its file but leaves half its switches on design defaults must not let
       * a reader assume every control below is live — that is the same untruth as the
       * dialog that used to announce work it had not done, just quieter. */
      const unmapped = unmappedControls(screen);
      if (this.configs[screen]?.state === 'read') {
        /* A screen nobody has inventoried is not a screen with nothing left to bind, and the
         * two used to be indistinguishable here -- an empty list meant both, so three whole
         * screens said nothing and read as more finished than the honest ones. */
        if (isUninventoried(unmapped)) {
          return `${summary} None of the controls on this screen are bound to it yet: they change what you see here and are not written to the file.`;
        }
        if (unmapped.length > 0) {
          return `${summary} ${unmapped.length} control(s) on this screen are not yet bound to a setting in it and still show shipped defaults.`;
        }
      }
      return summary;
    }
    if (screen === 'canvas') {
      if (!this.canvasReadings) return 'Reading…';
      return canvasReason(this.canvasReadings);
    }
    if (!isReadable(screen)) return NO_READER;
    const readings = this.readings[screen];
    if (!readings) return 'Reading…';
    return reasonFor(readings, ['channels', 'endpoints', 'contacts', 'registrations', 'queues', 'modules', 'uptime', 'voicemailUsers', 'rooms', 'mohClasses', 'managerUsers', 'ariApps']);
  }

  /** Real dialplan nodes/edges in the design's canvas shapes, with a bezier path per edge
   *  computed the same way the design computes it for its own sample graph. */
  private canvasVals(designVals: Record<string, unknown>): Record<string, unknown> {
    const readOnlyCanvas = () => this.fire(
      'Dialplan canvas is read-only',
      'This graph is read from the live target. Adding, deleting, duplicating, or rewiring a step needs a configuration-write path that this console does not provide.',
    );
    const graph = canvasValueOf(this.canvasReadings?.dialplan);
    if (!graph) return {
      nodes: [], edges: [], nodeCtls: [], edgeRows: [], nodeTitle: '', nodeApp: '',
      addEdge: readOnlyCanvas, paletteNodes: [], canvasBgClick: () => this.set('nodeId', ''),
    };

    const nodePos = ((this.state as { nodePos?: Record<string, { x: number; y: number }> }).nodePos) ?? {};
    const selected = (this.state as { nodeId?: string }).nodeId;
    const laidOut = layoutNodes(graph);
    const byId = new Map(laidOut.map((node) => [node.id, node]));

    const NW = 196;
    const NH = 68;
    const edges = edgePairs(graph).map(([from, to]) => {
      const a = byId.get(from);
      const b = byId.get(to);
      if (!a || !b) return { d: '', stroke: 'transparent', w: 0 };
      const ap = nodePos[from] || a;
      const bp = nodePos[to] || b;
      const sel = selected === from || selected === to;
      let d: string;
      if (bp.x > ap.x + 40) {
        const x1 = ap.x + NW, y1 = ap.y + NH / 2, x2 = bp.x, y2 = bp.y + NH / 2;
        const m = (x1 + x2) / 2;
        d = `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}`;
      } else {
        const x1 = ap.x + NW / 2, y1 = ap.y + NH, x2 = bp.x + NW / 2, y2 = bp.y;
        const m = (y1 + y2) / 2;
        d = `M${x1} ${y1} C${x1} ${m} ${x2} ${m} ${x2} ${y2}`;
      }
      return { d, stroke: sel ? '#82D9A5' : '#37483D', w: sel ? 2.5 : 1.8 };
    });

    const nodes = laidOut.map((node) => {
      const pos = nodePos[node.id] || node;
      const on = node.id === selected;
      return {
        x: `${pos.x}px`, y: `${pos.y}px`, icon: node.icon, title: node.title, detail: node.detail,
        border: on ? '#82D9A5' : '#333B34', selected: on, unselected: !on,
        pick: () => this.set('nodeId', node.id),
        onDragStart: (e: DragEvent) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          this.setState({ nodeId: node.id, nodeDrag: { id: node.id, dx: e.clientX - r.left, dy: e.clientY - r.top } });
        },
        onDragEnd: () => this.set('nodeDrag', null),
        nudge: (dx: number, dy: number) => this.moveNode(node.id, dx, dy),
        left: () => this.moveNode(node.id, -20, 0), right: () => this.moveNode(node.id, 20, 0),
        up: () => this.moveNode(node.id, 0, -20), down: () => this.moveNode(node.id, 0, 20),
        connect: readOnlyCanvas,
        ctx: (e: MouseEvent) => { e.preventDefault(); this.setState({ nodeId: node.id, ctxOpen: true, ctxX: `${e.clientX}px`, ctxY: `${e.clientY}px`, ctxTarget: node.title, ctxKind: 'node' }); },
        dup: readOnlyCanvas,
        del: readOnlyCanvas,
      };
    });

    const source = graph.nodes.find((node) => node.id === selected) ?? graph.nodes[0];
    const nodeCtls = source
      ? source.steps.map((step) => ({
          id: `${source.id}-${step.priority}`,
          label: `Priority ${step.priority}`,
          rawKey: `${source.id}-${step.priority}`,
          showKey: false,
          kind: 'text',
          value: `${step.app}(${step.data})`,
          display: `${step.app}(${step.data})`,
          narrow: true,
          onInfo: () => this.showInfo(
            'Read-only dialplan step',
            `Priority ${step.priority} is an observed ${step.app}(${step.data}) step from the live target. The inspector does not write dialplan changes.`,
            'This step is read-only because the console has no dialplan write path.',
            '46%',
            '150px',
          ),
          onWizard: readOnlyCanvas,
        }))
      : [];

    const nodeById = new Map(graph.nodes.map((candidate) => [candidate.id, candidate]));
    const edgeRows = graph.edges.map(([from, to]) => ({
      from: nodeById.get(from) ? `${nodeById.get(from)!.context} · ${nodeById.get(from)!.extension}` : from,
      to: nodeById.get(to) ? `${nodeById.get(to)!.context} · ${nodeById.get(to)!.extension}` : to,
      toOpts: [],
      del: readOnlyCanvas,
    }));
    const canvasContextItems = (this.state as { ctxKind?: string }).ctxKind === 'node'
      ? [
          { icon: 'info', label: 'Inspect observed step', hint: '', act: () => { this.set('ctxOpen', false); this.showInfo('Read-only dialplan step', 'This menu item describes the selected step from the live target. The canvas has no dialplan write path.', 'This step is read-only.', '46%', '150px'); }, hover: () => {}, bg: '#1B211C' },
          { icon: 'timeline', label: 'Connect to…', hint: 'C', act: () => { this.set('ctxOpen', false); readOnlyCanvas(); }, hover: () => {}, bg: '#1B211C' },
          { icon: 'content_copy', label: 'Duplicate step', hint: '⌃D', act: () => { this.set('ctxOpen', false); readOnlyCanvas(); }, hover: () => {}, bg: '#1B211C' },
          { icon: 'call_split', label: 'Insert condition before', hint: '', act: () => { this.set('ctxOpen', false); readOnlyCanvas(); }, hover: () => {}, bg: '#1B211C' },
          { icon: 'delete', label: 'Delete step', hint: '⌦', act: () => { this.set('ctxOpen', false); readOnlyCanvas(); }, hover: () => {}, bg: '#1B211C' },
        ]
      : undefined;

    return {
      nodes,
      edges,
      nodeCtls,
      edgeRows,
      nodeTitle: source ? `${source.context} · ${source.extension}` : (designVals.nodeTitle as string),
      nodeApp: source && source.steps[0] ? `${source.steps[0].app}(${source.steps[0].data})` : '',
      addEdge: readOnlyCanvas,
      paletteNodes: [
        { icon: 'add_call', label: 'Dial' },
        { icon: 'dialpad', label: 'Menu' },
        { icon: 'groups', label: 'Queue' },
        { icon: 'call_split', label: 'Condition' },
        { icon: 'voicemail', label: 'Voicemail' },
      ].map((item) => ({ ...item, add: readOnlyCanvas })),
      canvasBgClick: () => this.set('nodeId', ''),
      ...(canvasContextItems ? { ctxItems: canvasContextItems } : {}),
    };
  }

  // ---------------------------------------------------------------- Codec & endpoint graphs
  //
  // Two visualisations for screens that already exist, not new destinations: the codec
  // translation graph belongs on `codecs` (drawn from the same `core show translation` /
  // `core show codecs` readings the dispatcher already fetches for that screen -- see
  // `control-plane/dispatch.ts`), and the endpoint reachability graph belongs on
  // `endpoints` (drawn from `pjsip show endpoints` / `contacts` / `registrations`, the
  // last of which the `endpoints` view now also reads for exactly this). Both engines
  // (`codec-graph.ts`, `endpoint-graph.ts`) refuse to invent an edge the reading did not
  // report; an empty graph here means the reading genuinely came back empty, and says so
  // rather than rendering a blank box that reads as broken.

  /** Real codec translation graph for the `codecs` screen, drawn as computed SVG edges
   *  over a deterministic ring layout (`layoutCodecs`) rather than hand-authored path
   *  data. Nodes are plain positioned circles (the same div-overlay idiom the dialplan
   *  canvas already uses), offset here so the design markup never has to subtract. */
  private codecGraphVals(): Record<string, unknown> {
    const readings = this.readings.codecs;
    const translations = valueOf(readings?.translations) ?? [];
    const codecs = valueOf(readings?.codecs);
    const reason = reasonFor(readings, ['translations', 'codecs']);

    if (translations.length === 0) {
      return {
        codecGraphHasData: false,
        codecGraphStatus: reason || 'No codec translation paths have been read from this target yet.',
        codecGraphNodes: [],
        codecGraphEdges: [],
        codecGraphUnreachableLabel: '',
      };
    }

    const graph = buildCodecGraph(translations, codecs);
    const laidOut = layoutCodecs(graph.nodes, { radius: 118, centerX: 230, centerY: 150 });
    const byId = new Map(laidOut.map((node) => [node.id, node]));

    const edges = graph.edges.map((edge) => {
      const a = byId.get(edge.from);
      const b = byId.get(edge.to);
      if (!a || !b) return { d: '' };
      return { d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}` };
    });

    const strandedIds = new Set(unreachableCodecs(graph).map((node) => node.id));
    const NODE_SIZE = 72;
    const nodes = laidOut.map((node) => ({
      id: node.id,
      label: node.name,
      x: `${(node.x - NODE_SIZE / 2).toFixed(1)}px`,
      y: `${(node.y - NODE_SIZE / 2).toFixed(1)}px`,
      fill: strandedIds.has(node.id) ? '#FFB4AB' : '#82D9A5',
    }));

    const unreachableNames = unreachableCodecs(graph).map((node) => node.name);

    return {
      codecGraphHasData: true,
      codecGraphStatus: `${graph.nodes.length} codec${graph.nodes.length === 1 ? '' : 's'} - ${graph.edges.length} translation path${graph.edges.length === 1 ? '' : 's'}${strandedIds.size ? ` - ${strandedIds.size} stranded` : ''}`,
      codecGraphNodes: nodes,
      codecGraphEdges: edges,
      codecGraphUnreachableLabel: unreachableNames.length
        ? `Stranded (no translation path in or out): ${unreachableNames.join(', ')}`
        : '',
    };
  }

  /** Real endpoint reachability graph for the `endpoints` screen, drawn as computed SVG
   *  edges over a deterministic layered layout (`layoutTopology`) rather than hand-
   *  authored path data. Every broken link `brokenLinks` reports is surfaced as its own
   *  line, not merely absent from the picture. */
  private endpointGraphVals(): Record<string, unknown> {
    const readings = this.readings.endpoints;
    const endpoints = valueOf(readings?.endpoints) ?? [];
    const contacts = valueOf(readings?.contacts) ?? [];
    const registrations = valueOf(readings?.registrations) ?? [];
    const reason = reasonFor(readings, ['endpoints', 'contacts', 'registrations']);

    if (endpoints.length === 0) {
      return {
        endpointGraphHasData: false,
        endpointGraphStatus: reason || 'No endpoints have been read from this target yet.',
        endpointGraphWidth: '0px',
        endpointGraphHeight: '0px',
        endpointGraphNodes: [],
        endpointGraphEdges: [],
        endpointGraphBroken: [],
      };
    }

    const graph = buildEndpointGraph({ endpoints, contacts, registrations });
    const laidOut = layoutTopology(graph.nodes, { columnWidth: 190, rowHeight: 74, originX: 20, originY: 26 });
    const byId = new Map(laidOut.map((node) => [node.id, node]));
    const NODE_KIND_FILL: Record<string, string> = {
      endpoint: '#82D9A5', aor: '#9AA39B', contact: '#7FD1F0', registration: '#FFCC80',
    };

    const edges = graph.edges.map((edge) => {
      const a = byId.get(edge.from);
      const b = byId.get(edge.to);
      if (!a || !b) return { d: '' };
      const x1 = a.x + 84, y1 = a.y + 12, x2 = b.x, y2 = b.y + 12;
      const m = (x1 + x2) / 2;
      return { d: `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}` };
    });

    const nodes = laidOut.map((node) => ({
      id: node.id,
      label: node.label,
      detail: node.detail,
      x: `${node.x}px`,
      y: `${node.y}px`,
      fill: NODE_KIND_FILL[node.kind] ?? '#9AA39B',
    }));

    const summary = summariseEndpointGraph(graph);
    const width = 20 + 4 * 190 + 168;
    const rowsPerColumn = new Map<number, number>();
    for (const node of laidOut) rowsPerColumn.set(node.x, (rowsPerColumn.get(node.x) ?? 0) + 1);
    const maxRows = Math.max(1, ...rowsPerColumn.values());
    const height = 26 + maxRows * 74 + 40;

    return {
      endpointGraphHasData: true,
      endpointGraphStatus: `${summary.nodeCounts.endpoint} endpoint${summary.nodeCounts.endpoint === 1 ? '' : 's'} - ${summary.chainsComplete} reachable - ${summary.chainsBroken} broken`,
      endpointGraphWidth: `${width}px`,
      endpointGraphHeight: `${height}px`,
      endpointGraphNodes: nodes,
      endpointGraphEdges: edges,
      endpointGraphBroken: brokenEndpointLinks(graph).map((link) => link.message),
    };
  }

  // ---------------------------------------------------------------- Appearance
  //
  // Wires the compiled design's "Edit appearance..." panel (context menu on any
  // element, tab, or group; see appearOpen in the design reference) to the two
  // pure engines that back it: appearance.ts (the rule model, CSS-variable mapping,
  // and JSON export/import) and colour.ts (real colour maths and format
  // translation). Before this, the panel's colorFormats computed a fake hex value
  // from an arithmetic formula that was not a colour conversion at all, its "copy"
  // actions only showed a toast, and nothing it changed persisted past a reload or
  // was visible anywhere outside its own preview swatch.
  //
  // Scope actually delivered: one global (wildcard-element) theme covering accent
  // colour, font family, font weight and font size, applied live to the app's real
  // root element and persisted in localStorage so it survives a relaunch. Per-
  // element and per-tab scoping (the panel's appearTarget), and the remaining
  // typography/border/shadow/effects/transform groups, are not wired to anything
  // that renders -- the compiled markup has no selector for an individual element or
  // tab to receive its own override, so those controls remain design-only.

  /**
   * Says which of this panel's controls actually reach the console.
   *
   * The panel offers a great many; six of them are applied to the real root element and
   * persisted, and the rest move only its preview swatch because the compiled markup gives
   * an individual element no selector to receive an override. That was recorded in a comment
   * here and nowhere the person using it could see, which is the same defect as a button
   * that announces work it did not do -- the code being honest with itself is not the same
   * as the interface being honest with somebody.
   *
   * Counted from the applied list rather than written as a number, so the sentence cannot
   * drift away from the code the way a hand-typed count would.
   */
  private appearanceScope(): string {
    const applied = App.APPLIED_APPEARANCE.length;
    const preview = App.PREVIEW_APPEARANCE.length;
    const inert = App.INERT_APPEARANCE.length;
    return `${applied} of these controls change the console itself and are kept when you `
      + 'relaunch: the accent colour, the font family, its weight and its size. '
      + `${preview} of them (those ${applied} included) move the preview above, live, so you can `
      + 'see exactly what each one does -- but the interface gives an individual element no way '
      + 'to receive its own override yet, so those choices are not saved and change nothing '
      + 'outside this panel. '
      + `The remaining ${inert} do nothing at all yet: the entrance animation and its timing, `
      + 'and the two layout controls, which need a preview with more than one child before a '
      + 'gap or an alignment can show.';
  }

  /** The appearance keys that genuinely reach the document and survive a relaunch. Named
   *  once so the readout above, the persistence below and the restore path cannot disagree
   *  about which those are. */
  private static readonly APPLIED_APPEARANCE = ['ap_hue', 'ap_sat', 'ap_light', 'ap_family', 'ap_weight', 'ap_size'] as const

  /** Every appearance control the live preview genuinely consumes, `APPLIED_APPEARANCE`
   *  included. The readout above counts this list rather than asserting a number, and a
   *  contract test compares it against the preview the design actually compiles to -- so a
   *  control added to or dropped from the preview cannot leave the readout claiming
   *  something that stopped being true. */
  private static readonly PREVIEW_APPEARANCE = [
    'ap_alpha', 'ap_blend', 'ap_blur', 'ap_bright', 'ap_bs', 'ap_bw', 'ap_case', 'ap_contrast',
    'ap_deco', 'ap_family', 'ap_fill', 'ap_grey', 'ap_hrot', 'ap_hue', 'ap_lead', 'ap_light',
    'ap_num', 'ap_pb', 'ap_pl', 'ap_pr', 'ap_pt', 'ap_r1', 'ap_r2', 'ap_r3', 'ap_r4',
    'ap_rainbow', 'ap_rbdir', 'ap_rbease', 'ap_rblight', 'ap_rbrange', 'ap_rbsat', 'ap_rbspeed',
    'ap_rot', 'ap_sat', 'ap_satf', 'ap_sb', 'ap_scale', 'ap_sin', 'ap_size', 'ap_skew', 'ap_sop',
    'ap_ss', 'ap_sx', 'ap_sy', 'ap_track', 'ap_transition', 'ap_tx', 'ap_ty', 'ap_weight',
  ] as const;

  /** The appearance controls that still reach nothing whatsoever. Named rather than counted,
   *  so the readout can say which they are and the same contract test can prove none of them
   *  is quietly in the preview after all. */
  private static readonly INERT_APPEARANCE = [
    'ap_anim', 'ap_dur', 'ap_ease', 'ap_celebrate',
    'ap_align', 'ap_gap',
  ] as const;

  static readonly APPEARANCE_INVENTORY = {
    applied: App.APPLIED_APPEARANCE,
    preview: App.PREVIEW_APPEARANCE,
    inert: App.INERT_APPEARANCE,
  };;

  /** The actual rendered root: the compiled design's outermost div, found via the
   *  window drag-region marker on its first child rather than a hard-coded ref,
   *  since the generated file assigns it no id or class of its own. */
  private appearanceRootEl(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const drag = document.querySelector('[data-window-drag]');
    return (drag?.parentElement as HTMLElement | null) ?? null;
  }

  private currentAppearanceValues(): { hue: number; sat: number; light: number; family: string; weight: string; size: number } {
    const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
    const num = (key: string, fallback: number): number => {
      const raw = values[key];
      const n = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(n) ? n : fallback;
    };
    const str = (key: string, fallback: string): string => {
      const raw = values[key];
      return typeof raw === 'string' && raw.length > 0 ? raw : fallback;
    };
    return {
      hue: num('ap_hue', 148), sat: num('ap_sat', 54), light: num('ap_light', 68),
      family: str('ap_family', 'Roboto'), weight: str('ap_weight', '500'), size: num('ap_size', 14),
    };
  }

  /** Builds the real appearance.ts theme these four values resolve to, scoped to
   *  the wildcard element -- the only scope the compiled interface can actually read
   *  back, since it exposes no per-element CSS hook. An invalid value (out of
   *  addRule's own bounds) is simply left out of the theme rather than applied. */
  private buildAppearanceTheme(vals: ReturnType<App['currentAppearanceValues']>): AppearanceTheme {
    let theme: AppearanceTheme = { id: 'live', name: 'Live console appearance', rules: [] };
    const colourStr = `hsl(${vals.hue} ${vals.sat}% ${vals.light}%)`;
    const candidates: Array<[AppearanceProperty, string]> = [
      ['colour', colourStr],
      ['fontFamily', vals.family],
      ['fontWeight', vals.weight],
      ['fontSize', `${vals.size}px`],
    ];
    for (const [property, value] of candidates) {
      const outcome = addRule(theme, { element: WILDCARD_ELEMENT, property, value });
      if (!('reason' in outcome)) theme = outcome;
    }
    return theme;
  }

  /** Applies the theme to the actual root element's inline style -- the same
   *  mechanism the design already uses for every other inline colour, so a value
   *  set here wins the same way a design-authored one does, live, with no restart. */
  private applyAppearanceToDom(theme: AppearanceTheme): void {
    const root = this.appearanceRootEl();
    if (!root) return;
    const resolved = applyTheme(theme);
    const colourVal = resolved[`${WILDCARD_ELEMENT}::${cssVarFor('colour')}`];
    const familyVal = resolved[`${WILDCARD_ELEMENT}::${cssVarFor('fontFamily')}`];
    const weightVal = resolved[`${WILDCARD_ELEMENT}::${cssVarFor('fontWeight')}`];
    const sizeVal = resolved[`${WILDCARD_ELEMENT}::${cssVarFor('fontSize')}`];
    if (colourVal) root.style.setProperty('color', colourVal);
    if (familyVal) root.style.setProperty('font-family', `${familyVal},sans-serif`);
    if (weightVal) root.style.setProperty('font-weight', weightVal);
    if (sizeVal) root.style.setProperty('font-size', sizeVal);
  }

  /** Restores the persisted values into this.state.values once, at mount, before
   *  the compiled controls ever read them -- this is what makes a relaunch open on
   *  the appearance that was set last rather than the design's own defaults. */
  private restoreAppearance(): void {
    if (this.appearanceRestored) return;
    this.appearanceRestored = true;
    const raw = this.durableStorage.storage.getItem(this.APPEARANCE_STORAGE_KEY);
    if (!raw) return;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    const restored: Record<string, unknown> = {};
    for (const key of App.APPLIED_APPEARANCE) {
      if (key in parsed) restored[key] = parsed[key];
    }
    if (Object.keys(restored).length === 0) return;
    this.setState((st: { values: Record<string, unknown> }) => ({ values: { ...st.values, ...restored } }));
    this.applyAppearanceToDom(this.buildAppearanceTheme(this.currentAppearanceValues()));
  }

  /** Persists the four values (only when they actually changed) and re-applies them
   *  to the DOM. Called once per render, which is cheap: four numbers/strings
   *  serialised and compared before anything is written. */
  private syncAppearance(): void {
    const vals = this.currentAppearanceValues();
    const theme = this.buildAppearanceTheme(vals);
    this.applyAppearanceToDom(theme);
    const serialised = JSON.stringify({
      ap_hue: vals.hue, ap_sat: vals.sat, ap_light: vals.light,
      ap_family: vals.family, ap_weight: vals.weight, ap_size: vals.size,
    });
    if (serialised === this.appearanceLastSerialised) return;
    this.appearanceLastSerialised = serialised;
    /* React renders (and therefore this method) run before componentDidMount, i.e.
     * before restoreAppearance has had any chance to load what was persisted last
     * time -- this.state.values still holds the design's own defaults at that point.
     * Persisting here unconditionally would overwrite the real saved theme with those
     * defaults on every single launch, before restore ever gets to read it back: a
     * write-before-read race that loses the setting every time, deterministically,
     * because the first render always precedes componentDidMount. Skip the write
     * (the DOM is still updated above, so the paint is correct) until restore has run
     * at least once -- restoreAppearance sets appearanceRestored synchronously, whether
     * or not it found anything to restore, so this simply waits for that one settled
     * point rather than for any particular value. */
    if (!this.appearanceRestored) return;
    this.durableStorage.storage.setItem(this.APPEARANCE_STORAGE_KEY, serialised);
  }

  /** Real overrides for the appearance panel's colour translator and its actions --
   *  everything else in the panel (colorValue, hueStops, shadeStops, appearGroups,
   *  appearPreviewStyle, appearStates) is left to the design's own bindings, which
   *  already compute real (if unpersisted, unapplied) values. */
  private appearanceVals(): Record<string, unknown> {
    const vals = this.currentAppearanceValues();
    const colourStr = `hsl(${vals.hue} ${vals.sat}% ${vals.light}%)`;
    const translated = translateColour(colourStr);
    const colorFormats = translated
      ? COLOUR_FORMATS.map((format) => {
          const text = translated[format];
          return {
            label: `${format} · ${text}`,
            copy: () => {
              const clipboard = (navigator as { clipboard?: { writeText?: (text: string) => Promise<void> } }).clipboard;
              if (clipboard?.writeText) void clipboard.writeText(text);
              this.toast(`${text} copied`);
            },
          };
        })
      : [];
    return {
      colorFormats,
      appearActions: [
        { icon: 'casino', label: 'Randomise this element', run: () => this.randomiseAppearanceHue() },
        { icon: 'restart_alt', label: 'Reset', run: () => this.resetAppearance() },
        { icon: 'bookmark_add', label: 'Save', run: () => this.saveAppearance() },
        { icon: 'download', label: 'Export', run: () => this.exportAppearance() },
      ],
    };
  }

  private randomiseAppearanceHue(): void {
    this.setState((st: { values: Record<string, unknown> }) => ({
      values: { ...st.values, ap_hue: Math.floor(Math.random() * 360) },
    }));
    this.fire('Bold choice', 'Nobody will ever say it is boring.');
  }

  /** Clears the persisted theme, drops the four values back to the design's own
   *  defaults, and re-applies that default to the root element immediately -- a real
   *  reset, not the design's original values:{} (which cleared every control on
   *  every screen, not only these four). */
  private resetAppearance(): void {
    this.durableStorage.storage.removeItem(this.APPEARANCE_STORAGE_KEY);
    this.appearanceLastSerialised = '';
    this.setState((st: { values: Record<string, unknown> }) => {
      const next = { ...st.values };
      for (const key of App.APPLIED_APPEARANCE) delete next[key];
      return { values: next };
    });
    this.applyAppearanceToDom(resetAll(this.buildAppearanceTheme(this.currentAppearanceValues())));
    this.toast('Appearance reset to the design system');
  }

  private saveAppearance(): void {
    this.syncAppearance();
    this.fire('Appearance saved', 'It will still be set the next time this opens.');
  }

  /** Downloads the real appearance.ts JSON export (schema-versioned, re-importable)
   *  of the live theme -- not the design's placeholder toast claiming an export
   *  happened. */
  private exportAppearance(): void {
    if (typeof document === 'undefined') {
      this.toast('Export is not available in this environment.');
      return;
    }
    const json = exportTheme(this.buildAppearanceTheme(this.currentAppearanceValues()));
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asterisk-console-appearance.json';
    a.click();
    URL.revokeObjectURL(url);
    this.toast('Appearance exported as JSON');
  }

  renderVals() {
    const screen = (this.state as { screen: string }).screen;
    this.applyRows(screen);
    this.syncAppearance();
    const values = super.renderVals() as Record<string, unknown>;
    const bridge = this.bridge();
    const readings = this.readings[screen];
    const note = this.note(screen);

    return {
      ...values,
      // The "Edit appearance..." panel's real colour translator and real actions
      // (appearance.ts + colour.ts) -- see the Appearance section above renderVals.
      ...this.appearanceVals(),
      __window: {
        minimize: () => bridge?.window.minimize(),
        toggleMaximize: () => bridge?.window.toggleMaximize(),
        close: () => bridge?.window.close(),
      },
      /**
       * The confirmation flow used to end by announcing that the command had been
       * "executed and attested" while calling nothing at all. Every destructive and
       * write control in the interface funnels through here, so that one line was the
       * single largest untrue claim in the product.
       *
       * It now dispatches the command and reports exactly what came back: the real
       * output on success, and the exact reason otherwise — no connected target, a
       * command outside the read-only allowlist, or the target's own error. A refusal
       * shown plainly is worth far more than a cheerful message about work that never
       * happened.
       */
      executeCeremony: () => {
        const command = String((this.state as { ceremonyCmd?: string }).ceremonyCmd ?? '');
        this.set('ceremonyOpen', false);
        void runCeremonyCommand({
          command,
          connected: this.target.connected,
          serverId: this.target.id,
          request: (action, extra) => this.request(action, extra) as Promise<CeremonyResponse | undefined>,
          toast: (message) => this.toast(message),
          fire: (title, body) => this.fire(title, body),
        });
      },
      /* The real file, for the screens that edit one. A screen showing the target's own
       * configuration is the difference between an administration tool and a picture of
       * one, and it costs one read. */
      liveConfigResource: this.configs[screen]?.resource ?? '',
      liveConfigText: renderForDisplay(this.configs[screen]?.value),
      liveConfigState: this.configs[screen]?.state ?? (this.target.connected ? 'reading' : 'disconnected'),

      /**
       * Creating the console's own Asterisk runtime, from the payload in the installer.
       *
       * Offered only when the runtime reports it can actually be created, so this is
       * never a control that looks available and cannot work. It reports each step the
       * provisioning returns rather than a single success word, because importing a root
       * filesystem and installing into it is slow enough that silence reads as a hang.
       */
      runtimeLabel: runtimeLabel(this.runtime),
      canProvisionRuntime: canProvision(this.runtime),
      provisionRuntime: () => {
        if (!canProvision(this.runtime)) {
          this.fire('Not available', runtimeLabel(this.runtime));
          return;
        }
        this.toast('Creating the Asterisk runtime — this imports a root filesystem and takes a while.');
        void this.request('runtime.provision').then((response) => {
          if (!response) {
            this.fire('Not run', 'The desktop bridge is unavailable, so nothing was created.');
            return;
          }
          /* `data` lives only on the success branch of the response union, so the steps
           * are read from whichever branch actually carries them rather than asserted
           * past the type. A failed provision still returns its steps, and those are the
           * most useful thing to show: they say how far it got. */
          const carrier = response as { data?: { steps?: Array<{ name: string; ok: boolean; detail: string }> } };
          const steps = (carrier.data?.steps ?? [])
            .map((step) => `${step.ok ? 'ok' : 'failed'}: ${step.name} — ${step.detail}`)
            .join('\n');
          if (!response.ok) {
            this.fire('Not created', `${response.message ?? 'Creating the runtime did not succeed.'}\n\n${steps}`.trim());
            return;
          }
          this.fire('Runtime ready', steps || 'The runtime was created and answered.');
          void this.discover();
        });
      },

      /**
       * The onboarding wizard used to be a demo: five screens of questions that ended
       * by setting a few `ob_*` values nothing else read, closing itself, and switching
       * to the servers screen having written nothing anywhere. These three bindings
       * replace that with the real thing — a plan built from what the target actually
       * has, shown for confirmation, applied through the same transaction path (backup,
       * stage, validate, apply, read-back) every other write in the console uses, and
       * reported per resource rather than with one success word.
       */
      superEasy: () => {
        this.setState((st: { values: Record<string, unknown> }) => ({
          values: { ...st.values, ob_intent: 'Deploy a new server', ob_ease: 'Super easy', ob_phones: 8, ob_menu: true, ob_hours: true, ob_tls: true },
        }));
        void this.onboardDeploy();
      },
      onboardNext: () => {
        const step = (this.state as { onboardStep: number }).onboardStep;
        if (step < ONBOARD.length - 1) {
          this.setState((st: { onboardStep: number }) => ({ onboardStep: st.onboardStep + 1 }));
          return;
        }
        const answers = this.onboardAnswers();
        if (answers.intent === 'Connect to an existing one') void this.onboardConnect();
        else void this.onboardDeploy();
      },

      connLabel: this.target.label,
      connUptime: this.target.detail,
      openConnection: () => this.showInfo('Connection', BOUNDARY, BOUNDARY_PLAIN, '38%', '70px'),
      screenSub: note ? `${values.screenSub as string}\n\n${note}` : values.screenSub,

      // Dashboard tiles, live rows and health bars come only from observed readings.
      stats: dashboardStats(readings),
      liveCalls: (valueOf(readings?.channels) ?? []).map((channel) => ({
        chan: channel.name,
        peer: channel.callerNumber || channel.extension || '—',
        dur: formatDuration(channel.durationSeconds),
        spy: () => this.ceremony('Listen to a live call', `channel spy ${channel.name}`),
        rec: () => this.ceremony('Start recording a live call', `mixmonitor start ${channel.name}`),
        kill: () => this.ceremony('Hang up a live call', `channel request hangup ${channel.name}`),
      })),
      health: healthBars(readings),
      /* An empty panel with a heading and nothing under it reads as a rendering failure
       * rather than as "there is nothing to show". Found by driving the built app with a
       * system that has no endpoints and no queues, which is exactly a first run. */
      noHealth: healthBars(readings).length === 0,
      /* Same reason as noHealth: an empty list under a heading is indistinguishable from a
       * panel that failed to render, and a PBX with no calls up is the ordinary case. */
      noLiveCalls: (valueOf(readings?.channels) ?? []).length === 0,

      // The dialplan canvas draws only the real graph read from `dialplan show`; when
      // there is no reading it stays empty rather than falling back to design samples.
      ...(screen === 'canvas' ? this.canvasVals(values) : {}),
      cliLog: [{ text: note || 'Run a command to see its output here.', color: '#8FA394' }],

      // Discovery replaces the design's simulated provisioning run.
      oneClickButton: this.target.connected ? 'Re-run discovery' : 'Discover local targets',
      oneClickRunning: this.oneClickRunning,
      oneClickStage: this.oneClickStage,
      oneClickPct: this.oneClickPct,
      oneClickLog: this.oneClickLog,
      runOneClick: this.discover,

      // Nav-rail badges: only a count this session actually read, never the design's
      // invented per-destination numbers.
      sections: this.badges(values.sections as Array<Record<string, unknown>>),

      // History & git has no real source: nothing in this app stages, applies or commits
      // a configuration change yet, so the screen never shows the design's invented commits.
      ...(screen === 'history' ? {
        commits: [], commitRows: [], diffLines: [], diffFile: 'no commit selected', blameRows: [],
        branches: [], branchName: '', commitCount: '0 commits',
        compareLabel: NO_HISTORY,
      } : {}),

      // The agent rail has no local memory store wired in, so its rows and metrics stay empty.
      ...(screen === 'memory' ? {
        memRows: [], memPanels: [],
        // Memory records are always empty (no local memory store), so the regex builder
        // never has a corpus to search.
        regexMatches: regexMatchLabel(values.regexValue as string, []),
      } : {}),

      // Trunk authentication has no partner-request channel wired in.
      ...(screen === 'trunkauth' ? { authRequests: [], authHistory: [] } : {}),

      // The bundled offline documentation browser: real article search, a real
      // selected article rendered as blocks (not raw Markdown source), and real
      // in-browser navigation for article-to-article links.
      ...(screen === 'docs' ? this.docsVals() : {}),

      // The changelog viewer: every released version, built from this repository's
      // own tag history (see scripts/bundle-changelog.mjs), never invented.
      ...(screen === 'changelog' ? this.changelogVals() : {}),

      // The codec translation graph (codec-graph.ts) on the codecs screen, and the
      // endpoint reachability graph (endpoint-graph.ts) on the endpoints screen --
      // real graphs from the readings already fetched for those screens, drawn as
      // computed SVG, never invented edges.
      ...(screen === 'codecs' ? this.codecGraphVals() : {}),
      ...(screen === 'endpoints' ? this.endpointGraphVals() : {}),

      // Real selection mechanics and bulk-action plans (bulk.ts) plus a real file
      // export (export.ts) for every table-like screen -- see bulkSelectionVals above.
      ...(TABLE_SCREENS.includes(screen) ? this.bulkSelectionVals(screen, values) : {}),

      // Real TOTP pairing/verification (totp.ts) for the per-element lock, and the real
      // unlock ladder (unlock-ladder.ts) offered after repeated wrong unlock attempts --
      // see authVals below. Unconditional: the lock and unlock dialogs can open from any
      // screen's context menu.
      ...this.authVals(),
    };
  }

  /**
   * Real values for the per-element lock's TOTP factor and the unlock ladder.
   *
   * Both wire into the *existing* lock-wizard and unlock-dialog controls -- the
   * numeric keypad, its dots, and the mono-font line under the unlock dialog's
   * title -- rather than adding new markup, because the compiled design has no
   * bound slot for a dish grid, a sums list, a mole board, or QR pixel data, and
   * editing the checked-in design reference or its generated output is out of
   * scope here. That is a real gap, not a cosmetic one: the "moles" rung has no
   * way to be rendered in this build, so it is treated as unreachable (see
   * tryUnlock/finishLadderGrade) rather than faked.
   */
  private authVals(): Record<string, unknown> {
    const s = this.state as {
      locks: Record<string, { method?: string; pin?: string; password?: string; totpSecret?: string }>;
      unlockKey: string; unlockPin: string; unlockPw: string; unlockTotpDigits?: string;
      unlockPhase?: 'pin' | 'totp';
      ladderActive?: boolean; ladderChallenge?: Challenge | null; ladderDigits?: string; ladderSumsAnswers?: number[];
    };

    const L = s.locks[s.unlockKey] || {};
    const method = L.method || '';
    const needsPin = method.indexOf('PIN') >= 0;
    const needsTotp = method.indexOf('TOTP') >= 0;
    const phase: 'pin' | 'totp' = s.unlockPhase ?? (needsPin ? 'pin' : 'totp');

    const ladderActive = !!s.ladderActive;
    const challenge = s.ladderChallenge ?? null;

    const gradeLadder = (): void => {
      if (!challenge) return;
      const digits = s.ladderDigits ?? '';
      if (challenge.rung === 'dish') {
        const choiceIndex = Number(digits) - 1;
        const result = this.ladder.grade(challenge.nonce, { kind: 'dish', choiceIndex }, Date.now());
        this.finishLadderGrade(result, s.unlockKey);
        return;
      }
      if (challenge.rung === 'sums') {
        const answers = [...(s.ladderSumsAnswers ?? []), Number(digits)];
        if (answers.length < challenge.payload.problems.length) {
          this.setState({ ladderSumsAnswers: answers, ladderDigits: '' } as never);
          return;
        }
        const result = this.ladder.grade(challenge.nonce, { kind: 'sums', answers }, Date.now());
        this.finishLadderGrade(result, s.unlockKey);
        return;
      }
      // moles never reaches here -- offerLadder/finishLadderGrade never store one.
    };

    const keyPress = (k: string): void => {
      if (ladderActive) {
        if (k === '⌫') { this.setState({ ladderDigits: (s.ladderDigits ?? '').slice(0, -1) } as never); return; }
        if (k === '✓') { gradeLadder(); return; }
        this.setState({ ladderDigits: ((s.ladderDigits ?? '') + k).slice(0, 6) } as never);
        return;
      }
      if (k === '⌫') {
        if (phase === 'pin') { this.setState({ unlockPin: s.unlockPin.slice(0, -1) } as never); return; }
        this.setState({ unlockTotpDigits: (s.unlockTotpDigits ?? '').slice(0, -1) } as never);
        return;
      }
      if (k === '✓') {
        if (phase === 'pin' && needsTotp) { this.setState({ unlockPhase: 'totp' } as never); return; }
        void this.tryUnlock();
        return;
      }
      if (phase === 'pin') {
        this.setState({ unlockPin: s.unlockPin.length < 6 ? s.unlockPin + k : s.unlockPin } as never);
        return;
      }
      this.setState({
        unlockTotpDigits: (s.unlockTotpDigits ?? '').length < 6 ? (s.unlockTotpDigits ?? '') + k : s.unlockTotpDigits,
      } as never);
    };

    const unlockKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map((k) => ({
      label: k, press: () => keyPress(k),
    }));

    const digitsLength = ladderActive
      ? (s.ladderDigits ?? '').length
      : (phase === 'pin' ? s.unlockPin.length : (s.unlockTotpDigits ?? '').length);
    const unlockDots = Array.from({ length: 6 }, (_, i) => ({ bg: i < digitsLength ? '#82D9A5' : 'transparent' }));

    let ladderPrompt = '';
    if (challenge && challenge.rung === 'dish') {
      const p = challenge.payload;
      ladderPrompt = `Quick challenge -- which dish? 1 ${p.choices[0]} · 2 ${p.choices[1]} · `
        + `3 ${p.choices[2]} · 4 ${p.choices[3]} -- press its digit, then the check mark`;
    } else if (challenge && challenge.rung === 'sums') {
      const idx = s.ladderSumsAnswers?.length ?? 0;
      const problem = challenge.payload.problems[idx];
      ladderPrompt = `Quick challenge -- sum ${idx + 1} of ${challenge.payload.problems.length}: `
        + `${problem.a} ${problem.op} ${problem.b} = ? Type it, then the check mark`;
    }

    const unlockMethod = ladderActive
      ? ladderPrompt
      : (phase === 'totp' && needsTotp ? 'Six-digit code from the paired authenticator' : (method || 'PIN'));

    return {
      pairAuth: this.pairAuth,
      lockNext: this.lockNext,

      openUnlock: () => {
        const screen = (this.state as { screen: string }).screen;
        this.setState({
          unlockOpen: true, unlockKey: screen, unlockPin: '', unlockPw: '', unlockTotpDigits: '',
          unlockPhase: undefined, ladderActive: false, ladderChallenge: null, ladderDigits: '', ladderSumsAnswers: [],
        } as never);
      },
      unlockKeys,
      unlockDots,
      unlockMethod,
      submitUnlock: () => { if (ladderActive) { gradeLadder(); return; } void this.tryUnlock(); },
    };
  }

    /** Real values for the `docs` screen — see `docsVals` usage in `renderVals` above. */
  private docsVals(): Record<string, unknown> {
    const state = this.state as { docsQuery?: string; docsRegexOn?: boolean; docsSelectedId?: string };
    const query = state.docsQuery ?? '';
    const allArticles = listArticles(DOCS_BUNDLE);

    let queryError = '';
    let results: Array<{ id: string; category: string; title: string; excerpt: string }>;
    if (query.trim().length === 0) {
      results = allArticles.map((article) => ({
        id: article.id,
        category: article.category,
        title: article.title,
        excerpt: plainTextExcerpt(article.body, 120),
      }));
    } else {
      const outcome = docsSearch(DOCS_BUNDLE, query, { regex: !!state.docsRegexOn });
      if (!outcome.ok) {
        queryError = outcome.error ?? 'Invalid search.';
        results = [];
      } else {
        const seen = new Set<string>();
        results = [];
        for (const match of outcome.matches) {
          if (seen.has(match.articleId)) continue;
          seen.add(match.articleId);
          results.push({ id: match.articleId, category: match.category, title: match.title, excerpt: match.excerpt });
        }
      }
    }

    const selectedId = state.docsSelectedId && allArticles.some((a) => a.id === state.docsSelectedId)
      ? state.docsSelectedId
      : results[0]?.id ?? allArticles[0]?.id ?? '';
    const article = allArticles.find((a) => a.id === selectedId);

    const HEADING_KEY: Record<'h1' | 'h2' | 'h3', string> = { h1: 'isH1', h2: 'isH2', h3: 'isH3' };
    const spansFor = (spans: readonly { text: string; href?: string }[]) => spans.map((span) => {
      const targetId = span.href && article ? resolveLink(DOCS_BUNDLE, article, span.href) : undefined;
      return targetId
        ? { isLink: true, text: span.text, onClick: () => this.set('docsSelectedId', targetId) }
        : { isPlain: true, text: span.text };
    });
    const blockToVals = (block: DocsBlock): Record<string, unknown> => {
      switch (block.kind) {
        case 'code':
          return { isCode: true, text: block.text };
        case 'h1':
        case 'h2':
        case 'h3':
          return { [HEADING_KEY[block.kind]]: true, text: block.text };
        case 'list-item':
          return { isListItem: true, spans: spansFor(block.spans) };
        case 'paragraph':
        default:
          return { isParagraph: true, spans: spansFor(block.spans) };
      }
    };

    const suggested = article
      ? docsSuggestedFor(DOCS_BUNDLE, article.id).map((s) => ({
          icon: s.relation === 'outgoing' ? 'arrow_forward' : 'arrow_back',
          title: s.title,
          select: () => this.set('docsSelectedId', s.id),
        }))
      : [];

    return {
      docsResults: results.map((r) => ({
        id: r.id,
        category: r.category,
        title: r.title,
        excerpt: r.excerpt,
        bg: r.id === selectedId ? '#232A24' : 'transparent',
        select: () => this.set('docsSelectedId', r.id),
      })),
      docsResultsLabel: query.trim().length === 0
        ? `${results.length} article${results.length === 1 ? '' : 's'}`
        : `${results.length} match${results.length === 1 ? '' : 'es'}`,
      // The compiled design defaults every input to a literal empty string, so a field
      // whose value is not mirrored back here renders empty no matter what was typed:
      // the search reads as though it had been cleared on every keystroke. Found on the
      // changelog first and fixed there; this is the same fault on the same shape of
      // control, which is why it is worth naming rather than quietly repairing.
      docsQuery: query,
      docsRegexOn: !!(this.state as { docsRegexOn?: boolean }).docsRegexOn,
      docsQueryError: queryError,
      docsSelectedTitle: article?.title ?? 'No article',
      docsSelectedCategory: article?.category ?? '',
      docsBlocks: article ? parseMarkdown(article.body).map(blockToVals) : [{ isParagraph: true, spans: [{ isPlain: true, text: 'No documentation article is bundled.' }] }],
      docsHasSuggested: suggested.length > 0,
      docsSuggested: suggested,
    };
  }

  private readonly changelogAllEntries: ReadonlyArray<ChangelogEntry> = parseChangelogDetailed(CHANGELOG_MARKDOWN).entries;

  private static isValidIsoDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }

  private applyChangelogPreset(days: number): void {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    this.setState({ changelogFrom: iso(from), changelogTo: iso(to) });
  }

  private applyChangelogYear(): void {
    const year = new Date().getUTCFullYear();
    this.setState({ changelogFrom: `${year}-01-01`, changelogTo: `${year}-12-31` });
  }

  private copyChangelog(): void {
    const { entries } = this.changelogFilterResult();
    const text = toPlainText(entries);
    void navigator.clipboard.writeText(text).then(
      () => this.toast('Changelog copied to the clipboard'),
      () => this.toast('Could not reach the clipboard'),
    );
  }

  private exportChangelog(): void {
    const { entries } = this.changelogFilterResult();
    const markdown = toMarkdown(entries);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'changelog-export.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Applies the current date range and search query to the real bundled changelog. */
  private changelogFilterResult(): { entries: ReadonlyArray<ChangelogEntry>; error?: string } {
    const state = this.state as { changelogFrom?: string; changelogTo?: string; changelogQuery?: string; changelogRegexOn?: boolean };
    const from = state.changelogFrom ?? '';
    const to = state.changelogTo ?? '';
    const fromValid = from === '' || App.isValidIsoDate(from);
    const toValid = to === '' || App.isValidIsoDate(to);
    return filterAndSearch(this.changelogAllEntries, {
      from: fromValid && from !== '' ? from : undefined,
      to: toValid && to !== '' ? to : undefined,
      query: state.changelogQuery ?? '',
      regex: !!state.changelogRegexOn,
    });
  }

  /** Real values for the `changelog` screen — every released version of this console,
   *  parsed from a Markdown body built at build time from this repository's own tag
   *  history (scripts/bundle-changelog.mjs). Nothing here is invented: a version with
   *  no recorded changes says so plainly rather than inventing an entry. */
  private changelogVals(): Record<string, unknown> {
    const state = this.state as { changelogFrom?: string; changelogTo?: string };
    const from = state.changelogFrom ?? '';
    const to = state.changelogTo ?? '';
    const fromValid = from === '' || App.isValidIsoDate(from);
    const toValid = to === '' || App.isValidIsoDate(to);
    const dateError = !fromValid
      ? 'From date must be a valid calendar date in YYYY-MM-DD form.'
      : !toValid
        ? 'To date must be a valid calendar date in YYYY-MM-DD form.'
        : '';

    const { entries, error } = this.changelogFilterResult();

    const rangeLabel = entries.length === 0
      ? ''
      : (() => {
          const dates = entries.map((e) => e.date).sort();
          const first = dates[0];
          const last = dates[dates.length - 1];
          return first === last ? `Range: ${first}` : `Range: ${first} to ${last}`;
        })();

    const rawState = this.state as { changelogQuery?: string; changelogRegexOn?: boolean };
    return {
      // The compiled design defaults these to a literal placeholder; mirror the
      // real state back so the controlled fields actually reflect what was typed.
      changelogFrom: from,
      changelogTo: to,
      changelogQuery: rawState.changelogQuery ?? '',
      changelogRegexOn: !!rawState.changelogRegexOn,
      changelogQueryError: error ?? '',
      changelogDateError: dateError,
      changelogResultsLabel: `${entries.length} version${entries.length === 1 ? '' : 's'}`,
      changelogRangeLabel: rangeLabel,
      changelogEntries: entries.map((entry) => ({
        version: entry.version,
        date: entry.date,
        changes: entry.changes.length > 0
          ? entry.changes.map((change) => ({
              category: change.category,
              summary: change.summary,
              commitShort: change.commit.slice(0, 10),
              commitUrl: commitUrl(change.commit, CHANGELOG_REPOSITORY_URL),
            }))
          : [{ category: '', summary: 'No changes recorded for this version.', commitShort: '', commitUrl: '' }],
      })),
    };
  }

  /** Replaces the design's constant per-destination badge with a real row count where
   *  this session has actually read one, and empties every other badge. */
  private badges(sections: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    const screen = (this.state as { railId: string }).railId;
    const ids = ORDER.filter((id) => (SCREENS as Record<string, { rail: string }>)[id].rail === screen);
    return sections.map((section, i) => ({ ...section, badge: badgeFor(ids[i], this.readings) }));
  }
}

interface DesktopBridge {
  platform: string;
  window: { minimize: () => void; toggleMaximize: () => void; close: () => void };
  controlPlane: { request: (request: Record<string, unknown>) => Promise<ControlPlaneResponse | undefined> };
}
