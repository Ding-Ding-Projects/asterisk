import type { Component } from 'react';
import ConsoleShell, { ONBOARD, ORDER, SCREENS } from './generated/console';
import {
  badgeFor, dashboardStats, formatDuration, healthBars, isReadable, reasonFor, regexMatchLabel, rowsFor, serverRows, valueOf,
  type ViewReadings,
} from './readings';
import { canvasReason, edgePairs, layoutNodes, valueOf as canvasValueOf, type CanvasReadings } from './canvas';
import { buildCodecGraph, layoutCodecs, unreachable as unreachableCodecs } from './codec-graph';
import { buildEndpointGraph, brokenLinks as brokenEndpointLinks, layoutTopology, summarise as summariseEndpointGraph } from './endpoint-graph';
import { runCeremonyCommand, type CeremonyResponse } from './ceremony';
import { configSummary, renderForDisplay, resourceForFile, type ConfigReading, type ConfigValue } from './configuration';
import { readControlValues, unmappedControls } from './control-keys';
import { canProvision, runtimeHint, runtimeLabel, type RuntimeStatus } from './runtime';
import type { ControlPlaneResponse, PbxReadView } from '../../../shared/control-plane';
import { ServerSwitcher, type ServerSummary } from './servers';
import { buildEndpointDraft, endpointDocument, PJSIP_RESOURCE } from './endpoint-create';
import {
  applyControlValues, controlValuesFor, editDocument, ENDPOINT_CONTROLS, findEndpoint, removeEndpoint,
} from './endpoint-edit';
import {
  clearVocabulary, loadVocabularyFile, vocabularyStatus, type VocabularyStorage,
} from './personal-vocabulary';
import { createDurableStorage, type DurableBootstrapResult, type DurableStorageHandle } from './durable-storage';
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
  ATTENTION_WIRING, LAST_CHANGED_SETTING_KEY, NEXT_ACTION_MAX_LENGTH, NEXT_ACTION_SETTING_KEY,
  MODE_SETTING_PREFIX, NOTICE_HISTORY_MAX_ENTRIES, NOTICE_HISTORY_SCHEMA_VERSION, NOTICE_HISTORY_SETTING_KEY,
  SNOOZED_UNTIL_SETTING_KEY, SNOOZE_MIGRATION_TOLERANCE_MS, SNOOZE_MS, elapsedPhrase,
  isAttentionMode, modeEnabled, momentumPrompt, nextAction, presentationFor, redactNoticeText, sensitiveSpansForValue, setModeEnabled,
  type NoticeSensitiveSpan,
  setNextAction,
} from './attention-modes';
import { openTicket, resolutionFor, type TicketCategory, type TicketSeverity } from './support-tickets';
import { KNOWN_EDITORS, chooseEditor, clearEditorChoice } from './external-editor';
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
type Target = { id: string; label: string; detail: string; connected: boolean; connectionKind?: string };

type ConnectionObservation = { state?: string; reason?: string };
type AttentionNoticeSeverity = 'info' | 'warning' | 'error';

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
  'This screen is not wired to the target backup records yet. Configuration writes use target-side backups and ' +
  'verified rollback, but they are not indexed here, so this screen stays empty rather than inventing history.';

const NO_MEMORY =
  'This console has no local agent-memory store wired in. There is no memory corpus to search, sync, or ' +
  'attest, so this screen stays empty rather than showing invented records.';

const NO_AUTH_REQUESTS =
  'There is no partner-request channel wired into this console. No trunk partner can reach it to ask for a ' +
  'change, so there is nothing pending or answered to show.';

function resourcesForScreen(file: unknown): string[] {
  if (typeof file !== 'string') return [];
  const names = file.split(' · ').map((part) => part.trim());
  const resources = names.map(resourceForFile);
  return resources.every((resource): resource is string => typeof resource === 'string') ? resources : [];
}

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
  componentWillUnmount?(): void;
  showInfo(title: string, body: string, plain: string, x: string, y: string): void;
  ceremony(title: string, command: string): void;
  set(key: string, value: unknown): void;
  setState(update: Record<string, unknown>): void;
  moveNode(id: string, dx: number, dy: number): void;
  addEdgeFrom(): void;
  toast(message: string, severity?: AttentionNoticeSeverity): void;
  areYouSure(title: string, body: string, seconds: number, onConfirm: () => void): void;
  fire(title: string, body: string, severity?: AttentionNoticeSeverity): void;
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
  private discoveredDistributions: string[] = [];
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
    'att_next': 'nextAction',
  };

  /** The shell's own `setVal`, captured so the override below can delegate to it.
   *  It is a class property rather than a prototype method, so `super.setVal` does not
   *  exist and the only way to wrap it is to take a copy before replacing it. That has
   *  to happen in the constructor: field initializers all run before the constructor
   *  body, so by then an override declared as a field would already have replaced the
   *  shell's and the copy would point at itself -- a recursion with no base case. */
  private readonly baseSetVal: (control: ControlRef, value: unknown) => void;
  private readonly baseToast: (message: string, severity?: AttentionNoticeSeverity) => void;
  private readonly baseFire: (title: string, body: string, severity?: AttentionNoticeSeverity) => void;
  private attentionTimer: ReturnType<typeof setInterval> | undefined;
  private attentionSessionStartedAt = Date.now();
  private attentionLastChangedAt = this.attentionSessionStartedAt;
  private attentionSnoozedUntil = 0;
  private attentionStyle: HTMLStyleElement | undefined;
  private attentionStatus: HTMLElement | undefined;
  private attentionMotionQuery: MediaQueryList | undefined;
  private attentionSyncing = false;
  private attentionModePersistenceState: 'saved' | 'pending' | 'session-only' | 'retry' = 'saved';
  private attentionHistoryPersistenceState: 'saved' | 'pending' | 'session-only' | 'retry' = 'saved';
  private attentionPendingWrites = new Map<string, { value: string | null; generation: number }>();
  private attentionWriteGenerations = new Map<string, number>();
  private attentionFailedKeys = new Set<string>();
  private attentionSessionOnlyKeys = new Set<string>();
  private attentionNoticeHistory: Array<{ severity: 'warning' | 'error'; title: string; body: string }> = [];
  private attentionHistoryQuery = '';
  private attentionHistoryCorrupt = false;
  private durableBootstrapState: DurableBootstrapResult | undefined;

  /** Single generated-renderer mutation callback. Direct App-owned mutation paths
   * call this too, so the last-change clock has one source rather than a scattered
   * collection of timestamp writes. */
  onUserMutation = (_source = 'unknown'): void => this.attentionSetLastChanged();

  notifyInfo = (message: string): void => this.toast(message, 'info');
  notifyWarning = (message: string): void => this.toast(message, 'warning');
  notifyError = (message: string): void => this.toast(message, 'error');
  notifyInfoEvent = (title: string, body: string): void => this.fire(title, body, 'info');
  notifyWarningEvent = (title: string, body: string): void => this.fire(title, body, 'warning');
  notifyErrorEvent = (title: string, body: string): void => this.fire(title, body, 'error');
  notifyMessage = (message: string, severity: AttentionNoticeSeverity = 'info'): void => {
    if (severity === 'error') this.notifyError(message);
    else if (severity === 'warning') this.notifyWarning(message);
    else this.notifyInfo(message);
  };
  notifyEvent = (title: string, body: string, severity: AttentionNoticeSeverity = 'info', spans: readonly NoticeSensitiveSpan[] = []): void => {
    const fire = this.fire as unknown as (nextTitle: string, nextBody: string, nextSeverity: AttentionNoticeSeverity, nextSpans?: readonly NoticeSensitiveSpan[]) => void;
    fire(title, body, severity, spans);
  };

  constructor(props: Record<string, never>) {
    super(props);
    this.baseSetVal = this.setVal as (control: ControlRef, value: unknown) => void;
    this.setVal = this.languageAwareSetVal;
    this.baseToast = this.toast as (message: string, severity?: AttentionNoticeSeverity) => void;
    this.baseFire = this.fire as (title: string, body: string, severity?: AttentionNoticeSeverity) => void;
    this.toast = (message: string, severity: AttentionNoticeSeverity = 'info', spans: readonly NoticeSensitiveSpan[] = []): void => {
      if (severity !== 'info') this.attentionRecordNotice(severity, 'Notification', message, spans);
      /* Low stimulation suppresses informational messages only. Warnings and errors
       * stay visible and are retained by the reviewable history below. */
      if (severity === 'info' && modeEnabled(this.durableStorage.storage, 'lowStimulation')) return;
      this.baseToast(message, severity);
    };
    this.fire = (title: string, body: string, severity: AttentionNoticeSeverity = 'info', spans: readonly NoticeSensitiveSpan[] = []): void => {
      if (severity !== 'info') this.attentionRecordNotice(severity, title, body, spans);
      if (severity === 'info' && modeEnabled(this.durableStorage.storage, 'lowStimulation')) return;
      this.baseFire(title, body, severity);
    };
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

  private attentionStateValues(): Record<string, unknown> {
    const restored: Record<string, unknown> = {};
    for (const wiring of ATTENTION_WIRING) {
      const mode = App.ATTENTION_CONTROLS[wiring.control];
      if (isAttentionMode(mode)) restored[wiring.control] = modeEnabled(this.durableStorage.storage, mode);
    }
    restored.att_next = nextAction(this.durableStorage.storage);
    return restored;
  }

  private attentionRecordNotice(severity: 'warning' | 'error', title: string, body: string, spans: readonly NoticeSensitiveSpan[] = []): void {
    const titleSpans = spans.filter((span) => span.field === 'title');
    const bodySpans = spans.filter((span) => span.field === 'body');
    if (titleSpans.length + bodySpans.length !== spans.length) throw new Error('Notice span field discriminator is invalid.');
    this.attentionNoticeHistory = [{ severity, title: redactNoticeText(title, titleSpans, 'title'), body: redactNoticeText(body, bodySpans, 'body') }, ...this.attentionNoticeHistory].slice(0, NOTICE_HISTORY_MAX_ENTRIES);
    this.attentionPersistHistory();
    this.attentionRender();
  }

  private attentionPersistHistory(): void {
    this.attentionWrite(NOTICE_HISTORY_SETTING_KEY, JSON.stringify({
      schemaVersion: NOTICE_HISTORY_SCHEMA_VERSION,
      entries: this.attentionNoticeHistory,
    }));
  }

  private restoreAttentionHistory(): void {
    const raw = this.durableStorage.storage.getItem(NOTICE_HISTORY_SETTING_KEY);
    if (raw === null) return;
    if (raw === '') {
      this.attentionHistoryCorrupt = true;
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { schemaVersion?: number; entries?: unknown };
      if (parsed.schemaVersion !== NOTICE_HISTORY_SCHEMA_VERSION || !Array.isArray(parsed.entries)) {
        this.attentionHistoryCorrupt = true;
        return;
      }
      this.attentionNoticeHistory = parsed.entries.filter((entry): entry is { severity: 'warning' | 'error'; title: string; body: string } => {
        if (!entry || typeof entry !== 'object') return false;
        const value = entry as Record<string, unknown>;
        return (value.severity === 'warning' || value.severity === 'error')
          && typeof value.title === 'string' && typeof value.body === 'string';
      }).slice(0, NOTICE_HISTORY_MAX_ENTRIES).map((entry) => ({
        severity: entry.severity,
        title: redactNoticeText(entry.title),
        body: redactNoticeText(entry.body),
      }));
    } catch {
      this.attentionHistoryCorrupt = true;
    }
  }

  private attentionClearHistory(): void {
    this.attentionNoticeHistory = [];
    this.attentionHistoryQuery = '';
    this.attentionHistoryCorrupt = false;
    this.attentionPersistHistory();
    this.onUserMutation('attention-history-clear');
    this.attentionRender();
  }

  private attentionExportHistory(): void {
    const rows = this.attentionNoticeHistory.map((entry) => ({ severity: entry.severity, title: entry.title, body: entry.body }));
    const blob = new Blob([JSON.stringify({ schemaVersion: 1, personalVocabulary: 'omitted', notifications: rows }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'attention-notification-history.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  private attentionPersistenceNotice(): string {
    const pending = [...this.attentionPendingWrites.keys()].join(', ');
    const failed = [...this.attentionFailedKeys.keys()].join(', ');
    const sessionOnly = [...this.attentionSessionOnlyKeys.keys()].join(', ');
    const notices: string[] = [];
    if (this.durableBootstrapState && this.durableBootstrapState.status !== 'loaded') {
      const state = this.durableBootstrapState;
      notices.push(`Attention settings were not restored: durable snapshot is ${state.status}. Current controls remain safe defaults until restore succeeds.`);
    }
    if (this.attentionModePersistenceState === 'pending') notices.push(`Saving attention keys: ${pending || 'mode settings'}.`);
    if (this.attentionModePersistenceState === 'session-only') notices.push(`Session-only attention keys: ${sessionOnly || pending || 'mode settings'}. The desktop bridge is unavailable.`);
    if (this.attentionModePersistenceState === 'retry') notices.push(`Attention keys needing retry: ${failed || pending || 'mode settings'}. Current values remain active.`);
    if (this.attentionHistoryPersistenceState === 'pending') notices.push('Saving warning and error history.');
    if (this.attentionHistoryPersistenceState === 'session-only') notices.push('Warning and error history is session-only because the desktop bridge is unavailable.');
    if (this.attentionHistoryPersistenceState === 'retry') notices.push('Warning and error history needs retry. Current history remains visible.');
    return notices.join(' ');
  }

  private attentionWrite(key: string, value: string | null): void {
    const generation = (this.attentionWriteGenerations.get(key) ?? 0) + 1;
    this.attentionWriteGenerations.set(key, generation);
    this.attentionPendingWrites.set(key, { value, generation });
    this.attentionFailedKeys.delete(key);
    this.attentionSessionOnlyKeys.delete(key);
    const isHistory = key === NOTICE_HISTORY_SETTING_KEY;
    const setPersistenceState = (state: 'saved' | 'pending' | 'session-only' | 'retry') => {
      if (isHistory) this.attentionHistoryPersistenceState = state;
      else this.attentionModePersistenceState = state;
    };
    setPersistenceState(this.bridge() ? 'pending' : 'session-only');
    this.attentionRender();
    const result = value === null
      ? this.durableStorage.removeItem(key)
      : this.durableStorage.writeItem(key, value);
    void result.then((outcome) => {
      if (!outcome.durable) {
        if (this.attentionPendingWrites.get(key)?.generation !== generation) return;
        this.attentionSessionOnlyKeys.add(key);
        setPersistenceState('session-only');
        this.attentionRender();
        return;
      }
      if (!outcome.ok) {
        if (this.attentionPendingWrites.get(key)?.generation !== generation) return;
        this.attentionFailedKeys.add(key);
        setPersistenceState('retry');
        this.attentionRender();
        return;
      }
      if (this.attentionPendingWrites.get(key)?.generation !== generation) return;
      this.attentionPendingWrites.delete(key);
      this.attentionFailedKeys.delete(key);
      this.attentionSessionOnlyKeys.delete(key);
      if (isHistory) this.attentionHistoryPersistenceState = 'saved';
      else if (this.attentionPendingWrites.size === 0) this.attentionModePersistenceState = 'saved';
      this.attentionRender();
    });
  }

  private attentionRetry(): void {
    const pending = [...this.attentionPendingWrites.entries()];
    if (pending.length === 0) return;
    for (const [key, entry] of pending) this.attentionWrite(key, entry.value);
  }

  private attentionRetryBootstrap = (): void => {
    void this.durableStorage.retryBootstrap().then((state) => {
      this.durableBootstrapState = state;
      if (state.status === 'loaded') {
        this.restoreLanguageMode();
        this.restoreDisplayName();
        this.restoreAppearance();
        this.restoreAttention();
        this.restoreAttentionHistory();
      }
      this.forceUpdate();
      this.attentionRender();
    });
  };

  /** Restores all five independent switches and the chosen next action from the one
   * durable storage handle before the compiled controls are refreshed. */
  private restoreAttention(): void {
    const rawChanged = this.durableStorage.storage.getItem(LAST_CHANGED_SETTING_KEY);
    const changed = rawChanged ? Number(rawChanged) : NaN;
    if (Number.isFinite(changed) && changed >= 0 && changed <= Date.now()) this.attentionLastChangedAt = changed;
    const rawSnooze = this.durableStorage.storage.getItem(SNOOZED_UNTIL_SETTING_KEY);
    const snoozed = rawSnooze ? Number(rawSnooze) : NaN;
    const now = Date.now();
    if (Number.isFinite(snoozed) && snoozed > now && snoozed <= now + SNOOZE_MS + SNOOZE_MIGRATION_TOLERANCE_MS) {
      this.attentionSnoozedUntil = snoozed;
    }
    const restored = this.attentionStateValues();
    this.setState((st: { values: Record<string, unknown> }) => ({ values: { ...st.values, ...restored } }));
  }

  private attentionRoot(): HTMLElement | null {
    const titlebar = typeof document === 'undefined'
      ? null : document.querySelector<HTMLElement>('[data-attention-titlebar="true"]');
    return titlebar?.parentElement ?? null;
  }

  private ensureAttentionStyle(): void {
    if (this.attentionStyle || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.dataset.attentionRuntime = 'true';
    style.textContent = `
      [data-attention-inactive="true"] { opacity: .46; filter: saturate(.72); transition: opacity 180ms ease, filter 180ms ease; }
      [data-attention-current="true"] { opacity: 1; filter: none; }
      body.attention-low-stimulation [data-attention-root="true"] { filter: saturate(.72); }
      body.attention-low-stimulation [data-attention-root="true"] * { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
      body.attention-reduced-motion [data-attention-root="true"] * { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
      [data-attention-status="true"] { display:flex; flex-direction:column; gap:6px; background:#1B211C; border:1px solid #333B34; border-radius:14px; padding:10px 14px; margin:0 0 12px; color:#DFF3E5; font-size:12px; line-height:1.45; }
      [data-attention-status="true"] [data-attention-meta] { color:#9AA39B; font-family:'Roboto Mono',monospace; font-size:11px; }
      [data-attention-status="true"] [data-attention-next] { color:#9FF7C4; font-weight:500; }
      [data-attention-status="true"] button { align-self:flex-start; border:1px solid #617066; border-radius:999px; background:#262B26; color:#DFF3E5; padding:7px 12px; min-height:32px; cursor:pointer; font:inherit; }
      [data-attention-status="true"] button:focus-visible { outline:2px solid #9FF7C4; outline-offset:2px; }
      @media (prefers-reduced-motion: reduce) { [data-attention-inactive="true"] { transition:none; } }
    `;
    document.head.append(style);
    this.attentionStyle = style;
  }

  private attentionSetLastChanged(now = Date.now()): void {
    this.attentionLastChangedAt = now;
    this.attentionWrite(LAST_CHANGED_SETTING_KEY, String(now));
  }

  private attentionSnooze(): void {
    this.attentionSnoozedUntil = Date.now() + SNOOZE_MS;
    this.attentionWrite(SNOOZED_UNTIL_SETTING_KEY, String(this.attentionSnoozedUntil));
    this.attentionRender();
  }

  private attentionSyncControls(): void {
    if (this.attentionSyncing) return;
    const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
    const restored = this.attentionStateValues();
    const changed = Object.entries(restored).some(([key, value]) => values[key] !== value);
    if (!changed) return;
    this.attentionSyncing = true;
    this.setState((st: { values: Record<string, unknown> }) => ({ values: { ...st.values, ...restored } }), () => {
      this.attentionSyncing = false;
    });
  }

  /** Applies the live accommodation consumers for the lifetime of this application.
   * Focus marks the rail, group list and chrome as inactive while leaving the current
   * work region present. Time, next action and momentum share one visible status card. */
  private attentionRender = (): void => {
    if (typeof document === 'undefined') return;
    this.ensureAttentionStyle();
    this.attentionSyncControls();
    const root = this.attentionRoot();
    if (!root) return;
    root.dataset.attentionRoot = 'true';
    const presentation = presentationFor(this.durableStorage.storage, {
      prefersReducedMotion: this.attentionMotionQuery?.matches ?? false,
    });
    document.body.classList.toggle('attention-focus', presentation.dimInactive);
    document.body.classList.toggle('attention-low-stimulation', presentation.quietNotifications);
    document.body.classList.toggle('attention-reduced-motion', presentation.reduceMotion);
    const selectors = [
      '[data-attention-titlebar="true"]',
      '[data-attention-tabstrip="true"]',
      '[data-attention-rail="true"]',
      '[data-attention-section-list="true"]',
    ];
    for (const selector of selectors) {
      const element = root.querySelector<HTMLElement>(selector);
      if (element) element.dataset.attentionInactive = presentation.dimInactive ? 'true' : 'false';
    }
    const content = root.querySelector<HTMLElement>('[data-attention-work-region="true"]');
    if (!content) return;
    content.dataset.attentionCurrent = 'true';
    const mount = content.querySelector<HTMLElement>('[data-attention-card-mount="true"]');
    if (!mount) return;
    let status = this.attentionStatus;
    if (!status || !status.isConnected) {
      status = document.createElement('div');
      status.dataset.attentionStatus = 'true';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      this.attentionStatus = status;
      mount.prepend(status);
    }
    const now = Date.now();
    const prompt = momentumPrompt(
      this.durableStorage.storage,
      Math.max(0, now - this.attentionLastChangedAt),
      this.attentionSnoozedUntil > 0 ? Math.max(0, now - (this.attentionSnoozedUntil - SNOOZE_MS)) : undefined,
    );
    const shouldShow = presentation.showElapsedTime || presentation.showNextAction || prompt.show
      || this.attentionModePersistenceState !== 'saved' || this.attentionHistoryPersistenceState !== 'saved'
      || this.attentionNoticeHistory.length > 0 || this.attentionHistoryCorrupt
      || (this.durableBootstrapState !== undefined && this.durableBootstrapState.status !== 'loaded');
    status.hidden = !shouldShow;
    status.replaceChildren();
    if (!shouldShow) return;
    if (presentation.showElapsedTime) {
      const meta = document.createElement('div');
      meta.dataset.attentionMeta = 'true';
      meta.textContent = `Session elapsed: ${elapsedPhrase(now - this.attentionSessionStartedAt)} · Since last change: ${elapsedPhrase(now - this.attentionLastChangedAt)}`;
      status.append(meta);
    }
    if (presentation.showNextAction) {
      const action = document.createElement('div');
      action.dataset.attentionNext = 'true';
      const chosen = nextAction(this.durableStorage.storage);
      action.textContent = chosen ? `Next action: ${chosen}` : 'Next action: none chosen yet.';
      status.append(action);
    }
    if (prompt.show) {
      const message = document.createElement('div');
      message.textContent = prompt.message;
      status.append(message);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `Not now for ${elapsedPhrase(SNOOZE_MS)}`;
      button.addEventListener('click', () => this.attentionSnooze(), { once: true });
      status.append(button);
    }
    const persistence = this.attentionPersistenceNotice();
    if (persistence) {
      const notice = document.createElement('div');
      notice.textContent = persistence;
      status.append(notice);
      if (this.durableBootstrapState && this.durableBootstrapState.status !== 'loaded') {
        const retryRestore = document.createElement('button');
        retryRestore.type = 'button';
        const exhausted = this.durableBootstrapState.attempt >= 3;
        retryRestore.textContent = exhausted ? 'Restore retry limit reached' : 'Retry restoring attention settings';
        retryRestore.disabled = exhausted;
        retryRestore.addEventListener('click', () => this.attentionRetryBootstrap(), { once: true });
        status.append(retryRestore);
      } else if (this.attentionModePersistenceState === 'retry' || this.attentionHistoryPersistenceState === 'retry') {
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.textContent = 'Retry saving attention settings';
        retry.addEventListener('click', () => this.attentionRetry(), { once: true });
        status.append(retry);
      }
    }
    if (this.attentionNoticeHistory.length > 0 || this.attentionHistoryCorrupt) {
      if (this.attentionHistoryCorrupt) {
        const corrupt = document.createElement('div');
        corrupt.textContent = 'Saved warning and error history could not be read. It remains untouched until you reset it.';
        status.append(corrupt);
        const reset = document.createElement('button');
        reset.type = 'button';
        reset.textContent = 'Reset unreadable history';
        reset.addEventListener('click', () => this.attentionClearHistory(), { once: true });
        status.append(reset);
      }
      const search = document.createElement('input');
      search.type = 'search';
      search.placeholder = 'Search warnings and errors';
      search.setAttribute('aria-label', 'Search warnings and errors');
      search.value = this.attentionHistoryQuery;
      search.addEventListener('input', () => {
        this.attentionHistoryQuery = search.value;
        this.attentionRender();
      });
      status.append(search);
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '6px';
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.textContent = 'Clear history';
      clear.addEventListener('click', () => this.attentionClearHistory(), { once: true });
      const exportButton = document.createElement('button');
      exportButton.type = 'button';
      exportButton.textContent = 'Export history';
      exportButton.addEventListener('click', () => this.attentionExportHistory(), { once: true });
      actions.append(clear, exportButton);
      status.append(actions);
      const history = document.createElement('div');
      history.dataset.attentionMeta = 'true';
      const query = this.attentionHistoryQuery.trim().toLowerCase();
      const entries = query
        ? this.attentionNoticeHistory.filter((item) => `${item.severity} ${item.title} ${item.body}`.toLowerCase().includes(query))
        : this.attentionNoticeHistory;
      history.textContent = `${entries.length} of ${this.attentionNoticeHistory.length} warnings and errors shown.`;
      status.append(history);
      for (const item of entries) {
        const entry = document.createElement('div');
        entry.textContent = `${item.severity}: ${item.title} ${item.body}`;
        status.append(entry);
      }
    }
  };

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
    void this.durableStorage.bootstrap().then((state) => {
      this.durableBootstrapState = state;
      if (state.status !== 'loaded') {
        this.attentionRender();
        return;
      }
      this.restoreLanguageMode();
      this.restoreDisplayName();
      this.restoreAppearance();
      this.restoreAttention();
      this.restoreAttentionHistory();
      this.forceUpdate();
      this.attentionRender();
    });
    /* The configured server list is not a reading from any PBX — it exists before
     * anything is reachable and must be on screen whether or not discovery finds a
     * target, so it is loaded independently of it. */
    const state = this.state as { values?: Record<string, unknown> };
    this.setState({
      values: {
        ...(state.values ?? {}),
        sv_host: '', sv_container: '', sv_user: '',
        ob_host: '',
      },
    } as never);
    void this.initializeTargets();
    this.refreshTimer = setInterval(() => {
      if (this.target.connected) {
        void this.refresh();
        void this.refreshDaemonStatus();
      }
    }, 1000);
  }

  private initializeTargets = async (): Promise<void> => {
    const inventory = await this.servers.load();
    if (inventory.state === 'unavailable') {
      this.target = { ...NO_TARGET, label: 'inventory unavailable', detail: inventory.reason ?? 'the saved server inventory could not be read' };
    }
    this.forceUpdate();
    await this.discover();
  };

  componentWillUnmount() {
    super.componentWillUnmount?.();
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
    if (this.attentionTimer) clearInterval(this.attentionTimer);
    this.attentionTimer = undefined;
    this.attentionMotionQuery?.removeEventListener?.('change', this.attentionRender);
    this.attentionStyle?.remove();
    this.attentionStyle = undefined;
    this.attentionStatus?.remove();
    this.attentionStatus = undefined;
  }

  componentDidUpdate() {
    void this.refresh();
    this.attentionRender();
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
    this.discoveredDistributions = distributions;
    const active = this.servers.servers.find((server) => server.id === this.servers.activeServerId);
    const activeDistribution = active?.connectionKind === 'wsl' ? active.wslDistribution : undefined;
    if (active && (active.connectionKind !== 'wsl' || !activeDistribution || !distributions.includes(activeDistribution))) {
      const connected = await this.activateServer(active);
      this.oneClickStage = connected ? 'Connection verified' : 'Selected target is not reachable';
      this.oneClickPct = '100%';
      this.oneClickLog = [{
        icon: connected ? 'verified' : 'error',
        text: connected ? `${active.name} answered both required probes` : this.target.detail,
        color: connected ? '#9FF7C4' : '#FFB4AB',
        ms: connected ? 'done' : 'failed',
      }];
      return;
    }
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
    const configuredDistribution = active?.connectionKind === 'wsl' ? active.wslDistribution : undefined;
    const distribution = configuredDistribution ?? distributions[0]!;
    const selectedId = configuredDistribution === distribution && active ? active.id : distribution;
    const selectedLabel = configuredDistribution === distribution && active ? active.name : distribution;
    this.target = { id: selectedId, label: selectedLabel, detail: 'connecting to the selected target', connected: false, connectionKind: 'wsl' };
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
    let connected = await this.request('server.connect', { serverId: selectedId });
    let connectionReason = connectionFailureReason(connected);
    if (!connectionVerified(connected)) {
      await this.ensureDaemon();
      connected = await this.request('server.connect', { serverId: selectedId });
      connectionReason = connectionFailureReason(connected);
    }
    if (!connectionVerified(connected)) {
      const reason = connectionReason;
      this.target = { id: selectedId, label: selectedLabel, detail: reason, connected: false, connectionKind: 'wsl' };
      this.oneClickStage = 'Target connection unavailable';
      this.oneClickPct = '100%';
      this.oneClickLog = [
        { icon: 'search', text: `${distributions.length} local target${distributions.length === 1 ? '' : 's'} discovered`, color: '#9FF7C4', ms: 'read' },
        { icon: 'error', text: reason, color: '#FFB4AB', ms: 'failed' },
      ];
      this.forceUpdate();
      return;
    }
    this.target = { id: selectedId, label: selectedLabel, detail: `${distribution} answered both required probes`, connected: true, connectionKind: 'wsl' };
    this.oneClickStage = 'Connection verified';
    this.oneClickPct = '100%';
    this.oneClickLog = [
      { icon: 'search', text: `${distributions.length} local target${distributions.length === 1 ? '' : 's'} discovered`, color: '#9FF7C4', ms: 'read' },
      { icon: 'verified', text: `${selectedLabel} answered both required connection probes`, color: '#9FF7C4', ms: 'done' },
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
    if (!this.target.id) return;
    const serverId = this.target.id;
    const answer = await this.request('daemon.status', { serverId });
    if (!answer?.ok) return;
    const state = (answer.data as { status?: { state?: string } }).status?.state;
    /* This is the same reading the Deploy & servers status line shows, so it is
     * seeded from it rather than issuing a second `daemon.status` request. */
    void this.refreshDaemonStatus();
    if (state === 'daemonAnswering') return;

    this.toast('Starting the phone system…');
    const started = await this.request('daemon.start', { serverId });
    if (!started?.ok) {
      this.notifyEvent('The phone system did not start', started?.message ?? 'Asterisk did not answer after it was started.', 'error');
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
    if (named) return named;
    const status = vocabularyStatus(this.vocabStorage);
    return status.replacementCount > 0 ? `${status.replacementCount} replacement(s) loaded` : 'No file chosen';
  };

  fileControlHasFile = (): boolean => vocabularyStatus(this.vocabStorage).replacementCount > 0;

  /** The file's bytes never leave this process: read locally, validated by the pure
   *  loader in `personal-vocabulary.ts`, and — only on success — cached locally. */
  onFilePicked = (ctl: { id: string }, file: File): void => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = loadVocabularyFile(this.vocabStorage, text);
      this.pickedFileNames.set(ctl.id, result.ok ? file.name : `${file.name} — rejected`);
      this.forceUpdate();
      if (result.ok) {
        this.onUserMutation('vocabulary-load');
        this.notifyMessage(result.status);
      }
      else this.notifyEvent('Vocabulary file rejected', result.status, 'error');
    };
    reader.onerror = () => this.notifyEvent('Vocabulary file not read', 'The file could not be read from disk.', 'error');
    reader.readAsText(file);
  };

  onFileCleared = (ctl: { id: string }): void => {
    const result = clearVocabulary(this.vocabStorage);
    this.pickedFileNames.delete(ctl.id);
    this.forceUpdate();
    this.onUserMutation('vocabulary-clear');
    this.notifyMessage(result.status);
  };

  // ---------------------------------------------------------------- daemon lifecycle

  private daemonAction = async (verb: 'start' | 'stop' | 'restart'): Promise<void> => {
    if (!this.target.connected) {
      this.notifyEvent('No target connected', 'Connect to a server first — there is nothing to start, stop, or restart yet.', 'warning');
      return;
    }
    this.toast(`${verb === 'start' ? 'Starting' : verb === 'stop' ? 'Stopping' : 'Restarting'} the phone system…`);
    const serverId = this.target.id;
    const response = await this.request(`daemon.${verb}`, { serverId });
    if (!response?.ok) {
      this.notifyEvent('Not done', response?.message ?? `The phone system did not ${verb}.`, 'error');
      await this.refreshDaemonStatus();
      return;
    }
    const observed = (response.data as { status?: { state?: string; reason?: string; distribution?: string } }).status;
    const expectedState = verb === 'stop' ? 'daemonNotRunning' : 'daemonAnswering';
    if (observed?.state !== expectedState || this.target.id !== serverId) {
      this.fire('State not verified', observed?.reason ?? `The ${verb} request returned without the expected daemon state on the selected target.`);
      await this.refreshDaemonStatus();
      return;
    }
    /* Anything read before this point may no longer reflect what Asterisk is doing. */
    this.readings = {};
    this.canvasReadings = undefined;
    await this.refreshDaemonStatus();
    const detail = verb === 'stop'
      ? `Asterisk on ${this.target.label} was independently observed as not running after the stop.`
      : `Asterisk on ${this.target.label} returned a valid daemon identity after the ${verb}.`;
    this.fire(`Phone system ${verb === 'start' ? 'started' : verb === 'stop' ? 'stopped' : 'restarted'}`, detail);
  };

  private refreshDaemonStatus = async (): Promise<void> => {
    if (!this.target.id) {
      this.daemonStatusLine = 'Unknown: no target selected yet.';
      this.forceUpdate();
      return;
    }
    const serverId = this.target.id;
    const response = await this.request('daemon.status', { serverId });
    if (this.target.id !== serverId) return;
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
      category: String(values.sup_category ?? 'Something else') as TicketCategory,
      description: String(values.sup_description ?? ''),
      severity: String(values.sup_severity ?? 'Normal') as TicketSeverity,
      openedAt: new Date().toISOString(),
      draw: Math.random(),
    });
    if ('problems' in result) {
      this.notifyEvent('That ticket will not file', result.problems[0].message, 'error');
      return;
    }
    const resolution = resolutionFor(IDENTITY.dataDirectory);
    this.onUserMutation('support-ticket');
    this.notifyEvent(`Ticket ${result.id} — ${result.status}`,
      `${result.firstResponse}

${resolution.instructions}

${resolution.consequence}

${resolution.disclosure}`);
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
        this.notifyEvent('That name will not work', problems[0].message, 'error');
        return;
      }
    }
    if (control?.id === 'id_name_reset' && value === true) {
      resetDisplayName(this.durableStorage.storage);
      this.notifyMessage(`Name restored to ${IDENTITY.productName}`);
    }
    /* The five attention modes share one prefix and one handler, so adding a sixth is
     * a registry entry rather than another branch here. */
    if (control?.id === 'ed_choice' && typeof value === 'string') {
      const editor = KNOWN_EDITORS.find((candidate) => candidate.name === value);
      if (editor) chooseEditor(this.durableStorage.storage, editor.id);
    }
    if (control?.id === 'ed_clear' && value === true) {
      clearEditorChoice(this.durableStorage.storage);
      this.notifyMessage('Editor choice forgotten');
    }
    if (control?.id === 'sup_open' && value === true) {
      this.fileSupportTicket();
      return;
    }
    if (control?.id?.startsWith('att_') && typeof value === 'boolean') {
      const mode = App.ATTENTION_CONTROLS[control.id];
      if (isAttentionMode(mode)) {
        setModeEnabled(this.durableStorage.storage, mode, value);
        this.attentionWrite(`${MODE_SETTING_PREFIX}${mode}`, value ? 'on' : 'off');
      }
    }
    if (control?.id === 'att_next' && typeof value === 'string') {
      setNextAction(this.durableStorage.storage, value);
      this.attentionWrite(NEXT_ACTION_SETTING_KEY, value.trim().slice(0, NEXT_ACTION_MAX_LENGTH) || null);
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
    this.attentionRender();
  };

  /** Read by the compiled `text`-kind control marked `action:'daemon-status'`/`'vocab-status'`. */
  controlActionText = (action: string): string => {
    if (action === 'daemon-status') return this.daemonStatusLine;
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

  private activateServer = async (server: ServerSummary): Promise<boolean> => {
    const selected = await this.servers.setActive(server.id);
    if (!selected) {
      this.fire('Not selected', 'The control plane refused to make that server active.');
      return false;
    }
    this.target = {
      id: server.id,
      label: server.name,
      detail: 'verifying the selected target',
      connected: false,
      connectionKind: server.connectionKind,
    };
    this.readings = {};
    this.canvasReadings = undefined;
    this.configs = {};
    this.pending = '';
    this.configPending = '';
    this.canvasPending = false;
    this.seeded.clear();
    this.forceUpdate();
    const response = await this.servers.connect(server.id);
    if (!connectionVerified(response)) {
      this.target = { ...this.target, detail: connectionFailureReason(response), connected: false };
      await this.servers.load();
      this.forceUpdate();
      return false;
    }
    this.target = { ...this.target, detail: 'both required connection probes succeeded', connected: true };
    await this.servers.load();
    this.forceUpdate();
    void this.refreshDaemonStatus();
    return true;
  };

  /** Reads the already-bound `sv_*` connection controls straight out of component state —
   *  the same values the form on screen is showing — and adds the configured server. */
  onAddServer = async (): Promise<void> => {
    const values = (this.state as { values?: Record<string, unknown> }).values ?? {};
    const kindLabel = String(values.sv_kind ?? 'Local');
    const kindMap: Record<string, ServerSummary['connectionKind']> = {
      Local: 'wsl', 'Local Docker': 'localDocker', SSH: 'remoteLinux', 'SSH Docker': 'remoteDocker',
    };
    const connectionKind = kindMap[kindLabel] ?? 'wsl';
    const host = String(values.sv_host ?? '').trim();
    const container = String(values.sv_container ?? '').trim();
    const activeDistribution = this.servers.servers.find((server) => server.id === this.servers.activeServerId)?.wslDistribution;
    const chosenDistribution = this.discoveredDistributions.includes(host)
      ? host
      : activeDistribution && this.discoveredDistributions.includes(activeDistribution)
        ? activeDistribution
        : this.discoveredDistributions.length === 1 ? this.discoveredDistributions[0] : '';
    if (connectionKind === 'wsl' && !chosenDistribution) {
      this.fire('Not added', 'Choose one of the WSL distributions found by discovery before adding a local server.');
      return;
    }
    const input = {
      name: connectionKind === 'wsl' ? chosenDistribution : host || container,
      connectionKind,
      ...(connectionKind === 'wsl' ? { wslDistribution: chosenDistribution } : {}),
      ...(connectionKind === 'localDocker' ? { dockerProject: container } : {}),
      ...(connectionKind === 'remoteLinux' || connectionKind === 'remoteDocker' ? {
        host,
        user: String(values.sv_user ?? '').trim(),
        port: Number(values.sv_sshport ?? 22),
      } : {}),
      ...(connectionKind === 'remoteDocker' ? { dockerProject: container } : {}),
    };
    const created = await this.servers.add(input);
    this.forceUpdate();
    if (created) {
      this.onUserMutation('server-add');
      this.notifyEvent('Connection added', `${created.name} is now in the server list below.`);
    }
    else this.notifyEvent('Not added', 'The control plane did not accept that connection.', 'error');
  };

  /** The design has already run this past `areYouSure` before calling it. */
  onRemoveServerRow = async (name: string): Promise<void> => {
    const server = this.servers.servers.find((s) => s.name === name);
    if (!server) { this.notifyEvent('Not found', `${name} is no longer in the server list.`, 'error'); return; }
    const removed = await this.servers.remove(server.id);
    this.forceUpdate();
    if (removed) {
      this.onUserMutation('server-remove');
      this.notifyEvent('Connection removed', `${name} was removed from the server list.`);
    }
    else this.notifyEvent('Not removed', 'The control plane did not accept that removal.', 'error');
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
      if (!response?.ok) throw new Error(response?.message ?? `${resource} could not be read.`);
      const data = response.data as { state?: string; value?: ConfigValue };
      if (data.state === 'absent') return [];
      if (data.state !== 'present' || !Array.isArray(data.value)) {
        throw new Error(`${resource} returned an invalid or partial configuration reading.`);
      }
      return data.value;
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
    if (whereLabel !== 'This machine') {
      this.fire('Not connected', 'This compact wizard does not collect the user, trust store, and container details required for that route. Add it from Deploy & servers instead.');
      return;
    }
    const requested = String(values.ob_host ?? '').trim();
    const distribution = this.discoveredDistributions.includes(requested)
      ? requested
      : this.discoveredDistributions.length === 1 ? this.discoveredDistributions[0] : '';
    if (!distribution) {
      this.fire('Not connected', 'Choose one of the WSL distributions returned by discovery. No connection profile was written.');
      return;
    }
    const created = await this.servers.add({ name: distribution, connectionKind: 'wsl', wslDistribution: distribution });
    this.forceUpdate();
    if (created) {
      const connected = await this.activateServer(created);
      if (!connected) {
        this.fire('Configured, not connected', `${created.name} was saved, but the required operating-system and Asterisk probes did not both succeed.`);
        return;
      }
      this.fire('Connected', `${created.name} was saved, selected, and answered both required connection probes.`);
      this.onUserMutation('onboarding-connect');
      this.set('onboardOpen', false);
      this.set('screen', 'servers');
      this.set('railId', 'app');
    } else {
      this.notifyEvent('Not connected', 'The control plane did not accept that connection. Nothing was written.', 'error');
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
        this.notifyEvent('No target', `Nothing is connected and a runtime cannot be created here: ${runtimeLabel(this.runtime)}`, 'warning');
        return;
      }
      this.notifyMessage('Creating the Asterisk runtime for the wizard — this takes a while.');
      const provisioned = await this.request('runtime.provision');
      if (!provisioned?.ok) {
        this.notifyEvent('Not created', provisioned?.message ?? 'Creating the runtime did not succeed, so there is nothing to deploy to.', 'error');
        return;
      }
      await this.discover();
      if (!this.target.connected) {
        this.notifyEvent('No target', 'The runtime was created but nothing is connected yet — open Deploy & servers to finish connecting, then try the wizard again.', 'warning');
        return;
      }
    }

    const answers = this.onboardAnswers();
    const serverId = this.target.id;
    let inputs: OnboardPlanInputs;
    try {
      inputs = await this.readOnboardInputs(serverId);
    } catch (error) {
      this.fire('Deploy not planned', `${error instanceof Error ? error.message : 'A required configuration file could not be read.'} Nothing was written.`);
      return;
    }
    const plan = buildOnboardPlan(answers, inputs);

    const summaryLines = [
      `Target: ${this.target.label}`,
      ...plan.summary.map((line) => `• ${line}`),
      ...plan.skipped.map((line) => `• ${line}`),
      `Business hours: ${ONBOARD_HOURS_NOTE}`,
      '',
      'Every file is backed up on the selected target before it is touched. This flow does not create a local-history entry.',
    ].filter((line, i, arr) => line !== '' || arr[i - 1] !== '');

    if (plan.summary.length === 0) {
      this.notifyEvent('Nothing to change', 'The target already matches what the wizard would have written, so nothing was touched.', 'warning');
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
          if (this.target.id !== serverId) {
            this.fire('Deploy not applied', 'The selected target changed after the plan was reviewed. Nothing was written.');
            return;
          }
          const response = await this.request('pbx.apply', { serverId, payload: { documents: plan.documents } });
          const result = (response as { data?: { result?: { status: string; message?: string } }; message?: string } | undefined);
          if (!response?.ok) {
            this.notifyEvent('Deploy not applied', `${response?.message ?? result?.data?.result?.message ?? 'The target refused the change.'}`, 'error');
            return;
          }
          const secretLines = plan.newExtensions.map((e) => `${e.id}: ${e.secret}`).join('\n');
          const deployedBody = [
            `Applied: ${plan.summary.join('; ')}.`,
            plan.newExtensions.length > 0 ? `New extension secrets (shown once — write these down):\n${secretLines}` : '',
            plan.skipped.length > 0 ? `Not applied: ${plan.skipped.join(' ')}` : '',
            'Every changed file was backed up on the selected target before it was touched. This flow did not create a local-history entry.',
          ].filter(Boolean).join('\n\n');
          const deploymentSpans = plan.newExtensions.flatMap((entry) => sensitiveSpansForValue(deployedBody, entry.secret, 'credential', 'body'));
          this.notifyEvent('Deployed', deployedBody, 'info', deploymentSpans);
          this.onUserMutation('onboarding-deploy');
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
    const screen = (this.state as { screen?: string }).screen;
    if (screen === 'servers') {
      const server = this.servers.servers.find((candidate) => candidate.name === name);
      if (!server) { this.fire('Not selected', `${name} is no longer in the saved server inventory.`); return; }
      void this.activateServer(server).then((connected) => {
        if (connected) this.toast(`${server.name} is now the selected, verified target.`);
        else this.fire('Selected, not connected', `${server.name} is active, but it did not pass both required connection probes.`);
      });
      return;
    }
    if (screen !== 'endpoints') {
      this.fire('Read-only row', `${name} has no reviewed editor on this screen.`);
      return;
    }
    const value = this.pjsipValue();
    if (!value) { this.notifyEvent('Not loaded', 'The pjsip.conf on this target has not been read yet.', 'warning'); return; }
    const endpoint = findEndpoint(value, name);
    if (!endpoint) { this.notifyEvent('Not loaded', `${name} is not in this target's pjsip.conf.`, 'warning'); return; }
    this.editingEndpoint = name;
    const state = this.state as { values: Record<string, unknown> };
    const cleared = Object.fromEntries(Object.values(ENDPOINT_CONTROLS).map((id) => [id, undefined]));
    this.setState({ values: { ...state.values, ...cleared, ...controlValuesFor(endpoint) }, selected: [name] } as never);
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
        this.notifyEvent('Nothing to export', message, 'warning');
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
      const noticeBody = `${message} Saved as ${filename} — ${format.toUpperCase()}, UTF-8, LF line endings.${lossNote}`;
      const filenameSpans = sensitiveSpansForValue(noticeBody, filename, 'path', 'body');
      this.notifyEvent('Exported', noticeBody, 'info', filenameSpans);
      return;
    }

    // Every other bulk verb (Enable/Disable/Duplicate/...) has no write path in this
    // console yet -- the plan and its honest count are real, but nothing is applied.
    this.set('selected', []);
    this.notifyEvent(verb, message);
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
    this.onUserMutation('authenticator-pair');
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
    this.notifyEvent('Authenticator paired', 'A real TOTP secret was generated locally for this element.');
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
    if (needsPin && s.pin.length < 4) { this.notifyWarning('Set at least a four-digit PIN first'); return; }
    if (needsPw && (s.password || '').length < 4) { this.notifyWarning('Set a passphrase first'); return; }
    if (needsTotp && !s.totpPendingSecret) { this.notifyWarning('Pair the built-in authenticator first'); return; }
    const L = { ...s.locks };
    L[s.lockKey] = {
      method: s.lockMethod, pin: s.pin, password: s.password, target: s.lockTarget,
      ...(needsTotp ? { totpSecret: s.totpPendingSecret } : {}),
    };
    this.setState({ locks: L, lockOpen: false, totpPendingSecret: undefined, totpPendingUri: undefined } as never);
    this.onUserMutation('lock-create');
    this.notifyMessage(`${s.lockTarget} is locked with ${s.lockMethod} -- the surface is now disabled`);
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
          this.notifyWarning(`${message} -- ${result.reason}`);
          return;
        }
        if (result.rung === 'moles') {
          this.notifyWarning(`${message} -- the next challenge needs a visual board this build cannot show yet. Wait it out.`);
          return;
        }
        this.setState({ ladderActive: true, ladderChallenge: result, ladderDigits: '', ladderSumsAnswers: [] } as never);
        this.notifyWarning(`${message} -- or clear a quick challenge instead of waiting. It only clears the wait, not this credential.`);
        return;
      }
      this.notifyWarning(message);
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
    this.onUserMutation('lock-remove');
    this.notifyEvent('Unlocked', 'Welcome back.');
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
      this.notifyInfo('Challenge cleared -- the wait is over. You still need the real PIN, passphrase or code.');
      return;
    }
    const next = this.ladder.issue(lockKey);
    if (next.rung === 'clock' || next.rung === 'moles') {
      this.setState({ ladderActive: false, ladderChallenge: null } as never);
      this.notifyWarning(next.rung === 'clock'
        ? `Wrong. ${next.reason}`
        : 'Wrong. The next challenge needs a visual board this build cannot show yet.');
      return;
    }
    this.setState({ ladderChallenge: next, ladderDigits: '', ladderSumsAnswers: [] } as never);
    this.notifyWarning('Wrong -- try again.');
  }

  /** Writes the controls back onto the endpoint they were loaded from. */
  onSaveEndpoint = async (): Promise<void> => {
    const value = this.pjsipValue();
    if (!value || !this.editingEndpoint) { this.notifyEvent('Nothing to save', 'Select an endpoint first.', 'warning'); return; }
    const edit = applyControlValues(value, this.editingEndpoint, (this.state as { values: Record<string, unknown> }).values);
    if ('error' in edit) { this.notifyEvent('Not saved', edit.error, 'error'); return; }
    if (edit.summary.length === 0) { this.notifyMessage('Nothing changed, so nothing was written.'); return; }
    await this.writePjsip(editDocument(edit, PJSIP_RESOURCE), edit.summary, `${this.editingEndpoint} updated`);
  };

  /** Removes the loaded endpoint, meaning all three of its sections. */
  onDeleteEndpoint = (): void => {
    const value = this.pjsipValue();
    if (!value || !this.editingEndpoint) { this.notifyEvent('Nothing to remove', 'Select an endpoint first.', 'warning'); return; }
    const name = this.editingEndpoint;
    const removal = removeEndpoint(value, name);
    if ('error' in removal) { this.notifyEvent('Not removed', removal.error, 'error'); return; }
    this.areYouSure('Remove ' + name, removal.summary.join('\n'), 3, () => {
      void this.writePjsip(editDocument(removal, PJSIP_RESOURCE), removal.summary, `${name} removed`).then((applied) => {
        if (applied) this.editingEndpoint = '';
      });
    });
  };

  /** Creating one from the guided wizard's own answers. */
  onCreateEndpoint = async (): Promise<void> => {
    const value = this.pjsipValue();
    if (!value) {
      this.fire('Not created', 'The selected target\'s pjsip.conf has not been read successfully. Refresh the endpoints screen before creating anything.');
      return;
    }
    const draft = buildEndpointDraft(value, (this.state as { values: Record<string, unknown> }).values);
    if ('error' in draft) { this.notifyEvent('Not created', draft.error, 'error'); return; }
    const applied = await this.writePjsip(endpointDocument(draft), draft.summary, `${draft.view.endpoints.slice(-1)[0].name} created`);
    /* Shown once, and deliberately never in the plan above: a plan gets read aloud and
     * screenshotted, and a password has no business in one. */
    if (applied) {
      this.fire('Write this password down', `${draft.created.name}: ${draft.secret}

It is shown once. The phone needs it to register.`;
      const secretSpans = sensitiveSpansForValue(noticeBody, draft.secret, 'credential', 'body');
      this.notifyEvent('Write this password down', noticeBody, 'info', secretSpans);
    }
  };

  /** One write path for all three, so none of them can skip the backup and read-back. */
  private async writePjsip(document: { resource: string; value: ConfigValue }, summary: string[], done: string): Promise<boolean> {
    if (!this.target.connected || !this.target.id) {
      this.fire('Not written', 'No verified target is selected. Nothing was changed.');
      return false;
    }
    const serverId = this.target.id;
    const expectedBefore = this.pjsipValue();
    if (!expectedBefore) {
      this.fire('Not written', 'The source reading is stale or unavailable. Read pjsip.conf again before writing.');
      return false;
    }
    const payload = { documents: [{ resource: document.resource, value: document.value, expectedBefore }] };
    const planned = await this.request('pbx.plan', { serverId, payload });
    if (!planned?.ok) { this.fire('Not written', planned?.message ?? 'The control plane did not answer.'); return false; }
    if (this.target.id !== serverId) {
      this.fire('Not written', 'The selected target changed after planning. Review the change again for the newly selected target.');
      return false;
    }
    const applied = await this.request('pbx.apply', { serverId, payload });
    if (!applied?.ok) { this.fire('Not written', applied?.message ?? 'The change was planned but not applied.'); return false; }
    /* The reading is now stale, and a stale reading is how the next edit gets built on a
     * value that is no longer there. */
    this.configs.endpoints = {
      resource: PJSIP_RESOURCE,
      state: 'unavailable',
      reason: 'The write and running-daemon reload were verified. Re-reading pjsip.conf before another edit.',
      observedAt: new Date().toISOString(),
    };
    this.seeded.delete('endpoints');
    this.notifyEvent(done, summary.join('\n'));
    this.onUserMutation('endpoint-write');
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
      const serverId = this.target.id;
      const response = await this.request('pbx.read', { serverId, view: 'canvas' as PbxReadView });
      this.canvasPending = false;
      if (this.target.id !== serverId) return;
      this.canvasReadings = response?.ok
        ? (response.data as CanvasReadings)
        : { dialplan: { command: 'pbx.read', result: { state: 'unavailable', observedAt: new Date().toISOString(), reason: response?.message ?? 'the control plane did not answer' } } };
      this.forceUpdate();
      return;
    }
    /* A configuration screen names the file it edits. Read that file from the target so
     * the screen can show what the machine actually has, instead of standing there
     * displaying the design's own defaults as though they were settings in force. */
    const resources = resourcesForScreen((SCREENS as Record<string, { file?: unknown }>)[screen]?.file);
    if (resources.length > 0 && (!this.configs[screen] || this.configs[screen]?.state === 'unavailable') && this.configPending !== screen && mayStartRead(`config:${screen}`)) {
      this.configPending = screen;
      const serverId = this.target.id;
      const responses = await Promise.all(resources.map(async (resource) => ({
        resource,
        response: await this.request('pbx.config', { serverId, payload: { resource } }),
      })));
      this.configPending = '';
      if (this.target.id !== serverId) return;
      const failed = responses.filter(({ response }) => !response?.ok);
      if (failed.length > 0) {
        this.configs[screen] = {
          resource: resources.join(' · '),
          state: 'unavailable',
          reason: `Partial read refused. ${failed.map(({ resource, response }) => `${resource}: ${response?.message ?? 'the control plane did not answer'}`).join(' ')}`,
          observedAt: new Date().toISOString(),
        };
      } else {
        const readings = responses.map(({ response }) => (response as { ok: true; data: unknown }).data as { state?: 'present' | 'absent'; value?: ConfigValue });
        if (readings.some((reading) => !['present', 'absent'].includes(reading.state ?? '') || !Array.isArray(reading.value))) {
          this.configs[screen] = {
            resource: resources.join(' · '),
            state: 'unavailable',
            reason: 'One or more resources returned an invalid or partial configuration reading.',
            observedAt: new Date().toISOString(),
          };
        } else {
          this.configs[screen] = {
            resource: resources.join(' · '),
            state: 'read',
            value: readings.flatMap((reading, index) => (reading.value ?? []).map((section) => ({
              ...section,
              name: resources.length > 1 ? `${resources[index].split('/').pop()} :: ${section.name}` : section.name,
            }))),
            observedAt: new Date().toISOString(),
            presence: readings.every((reading) => reading.state === 'absent') ? 'absent' : 'present',
          } as ConfigReading;
        }
      }

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
    if (screen === 'servers' && this.servers.loadState === 'loading') return 'Reading the saved server inventory…';
    if (screen === 'servers' && this.servers.loadState === 'unavailable') {
      return `The saved server inventory is unavailable and will not be overwritten: ${this.servers.loadReason ?? 'read failed'}`;
    }
    if (screen === 'history') return NO_HISTORY;
    if (screen === 'memory') return NO_MEMORY;
    if (screen === 'trunkauth') return NO_AUTH_REQUESTS;
    if (!this.target.connected) return `No target is connected — ${this.target.detail}.`;
    /* A configuration screen reports the file it edits and what is really in it. This
     * says what was read; it does not claim the controls below are bound to it, because
     * they are not yet, and implying otherwise would be the same untruth the
     * confirmation dialog used to tell. */
    if (resourcesForScreen((SCREENS as Record<string, { file?: unknown }>)[screen]?.file).length > 0) {
      const config = this.configs[screen] as (ConfigReading & { presence?: 'present' | 'absent' }) | undefined;
      if (config?.state === 'read' && config.presence === 'absent') {
        return `${config.resource} does not exist on this target. No missing or failed read was presented as an empty file.`;
      }
      const summary = configSummary(config, this.target.connected);
      /* Say how many controls on this screen are genuinely bound to that file. A screen
       * that reads its file but leaves half its switches on design defaults must not let
       * a reader assume every control below is live — that is the same untruth as the
       * dialog that used to announce work it had not done, just quieter. */
      const unmapped = unmappedControls(screen).length;
      if (this.configs[screen]?.state === 'read' && unmapped > 0) {
        return `${summary} ${unmapped} control(s) on this screen are not yet bound to a setting in it and still show shipped defaults.`;
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
    const readOnlyCanvas = () => this.notifyWarningEvent(
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
    for (const key of ['ap_hue', 'ap_sat', 'ap_light', 'ap_family', 'ap_weight', 'ap_size']) {
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
              this.notifyMessage(`${text} copied`);
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
    this.onUserMutation('appearance-random');
    this.notifyEvent('Bold choice', 'Nobody will ever say it is boring.');
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
      for (const key of ['ap_hue', 'ap_sat', 'ap_light', 'ap_family', 'ap_weight', 'ap_size']) delete next[key];
      return { values: next };
    });
    this.applyAppearanceToDom(resetAll(this.buildAppearanceTheme(this.currentAppearanceValues())));
    this.onUserMutation('appearance-reset');
    this.notifyMessage('Appearance reset to the design system');
  }

  private saveAppearance(): void {
    this.syncAppearance();
    this.onUserMutation('appearance-save');
    this.notifyEvent('Appearance saved', 'It will still be set the next time this opens.');
  }

  /** Downloads the real appearance.ts JSON export (schema-versioned, re-importable)
   *  of the live theme -- not the design's placeholder toast claiming an export
   *  happened. */
  private exportAppearance(): void {
    if (typeof document === 'undefined') {
      this.notifyWarning('Export is not available in this environment.');
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
    this.notifyMessage('Appearance exported as JSON');
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
          toast: (message, severity = 'info') => severity === 'error'
            ? this.notifyError(message) : severity === 'warning' ? this.notifyWarning(message) : this.notifyInfo(message),
          fire: (title, body, severity = 'info') => severity === 'error'
            ? this.notifyErrorEvent(title, body) : severity === 'warning' ? this.notifyWarningEvent(title, body) : this.notifyInfoEvent(title, body),
        });
      },
      /* The real file, for the screens that edit one. A screen showing the target's own
       * configuration is the difference between an administration tool and a picture of
       * one, and it costs one read. */
      liveConfigResource: this.configs[screen]?.resource ?? '',
      liveConfigText: renderForDisplay(this.configs[screen]?.value),
      liveConfigState: this.configs[screen]?.state ?? (this.target.connected ? 'reading' : 'disconnected'),
      ...(screen === 'endpoints' && this.editingEndpoint ? {
        hasSelection: true,
        selectionLabel: `${this.editingEndpoint} loaded for editing`,
        bulkActions: [
          { icon: 'save', label: `Save ${this.editingEndpoint}`, run: () => { void this.onSaveEndpoint(); } },
          { icon: 'delete', label: `Delete ${this.editingEndpoint}`, run: () => this.onDeleteEndpoint() },
        ],
      } : {}),

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
          this.notifyEvent('Not available', runtimeLabel(this.runtime), 'warning');
          return;
        }
        this.notifyMessage('Creating the Asterisk runtime — this imports a root filesystem and takes a while.');
        void this.request('runtime.provision').then((response) => {
          if (!response) {
            this.notifyEvent('Not run', 'The desktop bridge is unavailable, so nothing was created.', 'error');
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
            this.notifyEvent('Not created', `${response.message ?? 'Creating the runtime did not succeed.'}\n\n${steps}`.trim(), 'error');
            return;
          }
          this.notifyEvent('Runtime ready', steps || 'The runtime was created and answered.');
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
          onboardOpen: true,
          onboardStep: 0,
        }));
        this.toast('Review each onboarding answer. Nothing is planned or written until the final confirmation.');
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

      // History & git has no indexed source yet, so it never shows the design's invented commits.
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
      () => this.notifyMessage('Changelog copied to the clipboard'),
      () => this.notifyError('Could not reach the clipboard'),
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
