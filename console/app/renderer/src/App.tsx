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
  isLanguageMode, languageMode, localizeEventText, localizeText, setCatalog, setLanguageMode, setSchoolModeNameProvider, setVocabularyStorage,
  type LanguageMode,
} from './text-boundary';
import {
  CHOOSE_AUTOMATICALLY, browserSpeechEngine, Narrator, voiceOptions,
  type NarrationLanguage, type SpeechEngine,
} from './narration';
import {
  DEFAULT_FUNNY_LEVELS, readFunnyLevels, styleFunnyText, writeFunnyLevels,
  type FunnyLevels,
} from './funny-levels';
import {
  DEFAULT_SCHOOL_NAME, SCHOOL_MODE_SETTING, SCHOOL_RECOVERY_LINE,
  readPreviousSettings, renameSchoolMode, schoolModeEnabled,
  schoolModeName, savePreviousSettings, writeSchoolMode,
} from './school-mode';
import { CANTONESE } from './locale-yue';
import {
  IDENTITY, displayName, resetDisplayName, setDisplayName,
} from './display-name';
import { setEmojisEnabled } from './dialog-emojis';
import { dynamicEventCopyRecord, dynamicEventCopyRecordByCallId } from './event-copy-inventory';
import { isAttentionMode, setModeEnabled } from './attention-modes';
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
  componentWillUnmount?(): void;
  showInfo(title: string, body: string, plain: string, x: string, y: string): void;
  ceremony(title: string, command: string): void;
  set(key: string, value: unknown): void;
  setState(update: Record<string, unknown>): void;
  moveNode(id: string, dx: number, dy: number): void;
  addEdgeFrom(): void;
  toast(message: string): void;
  toastWithId(callId: string, message: string): void;
  areYouSure(title: string, body: string, seconds: number, onConfirm: () => void): void;
  fire(title: string, body: string): void;
  fireWithId(callId: string, title: string, body: string): void;
}

/** The shape the compiled shell hands every control callback. */
interface ControlRef { id?: string; label?: string; kind?: string }

type SchoolStatus = 'unknown' | 'enabled' | 'disabled' | 'refresh-failed';

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
  private funnyLevels: FunnyLevels = { ...DEFAULT_FUNNY_LEVELS };
  private schoolStatus: SchoolStatus = 'unknown';
  private schoolRefreshTimer: ReturnType<typeof setInterval> | undefined;
  private schoolCredentialPromptOpen = false;
  private schoolBootstrapped = false;
  private schoolRefreshInFlight = false;
  private schoolRefreshGeneration = 0;
  private narrator: Narrator | undefined;
  private speechEngine: SpeechEngine | undefined;
  private narrationStatusLine = 'No voice list loaded yet.';
  private voiceOptionIds: Record<string, string> = {};
  private voicesChangedUnsubscribe: (() => void) | undefined;
  private platformAccessibilityTimer: ReturnType<typeof setInterval> | undefined;
  private narrationQuiet = false;
  private platformScreenReaderActive = false;
  private narrationScreenReaderOverride = false;
  private schoolCredentialOpen = false;
  private schoolCredentialKind: 'set' | 'verify' = 'set';
  private schoolCredentialValue = '';
  private schoolRecoveryLine = SCHOOL_RECOVERY_LINE;
  private schoolRecoveryPath = '';
  private schoolRecoveryReady = false;
  private schoolCredentialOrigin: HTMLElement | null = null;
  private readonly baseToast: (message: string) => void;
  private readonly baseFire: (title: string, body: string) => void;

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
  };

  /** The shell's own `setVal`, captured so the override below can delegate to it.
   *  It is a class property rather than a prototype method, so `super.setVal` does not
   *  exist and the only way to wrap it is to take a copy before replacing it. That has
   *  to happen in the constructor: field initializers all run before the constructor
   *  body, so by then an override declared as a field would already have replaced the
   *  shell's and the copy would point at itself -- a recursion with no base case. */
  private readonly baseSetVal: (control: ControlRef, value: unknown) => void;

  constructor(props: Record<string, never>) {
    super(props);
    this.baseSetVal = this.setVal as (control: ControlRef, value: unknown) => void;
    this.setVal = this.languageAwareSetVal;
    this.baseToast = this.toast.bind(this);
    this.baseFire = this.fire.bind(this);
    this.toast = this.localizedToast;
    this.fire = this.localizedFire;
    setSchoolModeNameProvider((text) => this.renameSchoolText(text));
    this.speechEngine = browserSpeechEngine();
    if (this.speechEngine) {
      this.narrator = new Narrator(this.speechEngine, {
        onSpeechError: (_error, item) => {
          this.narrationStatusLine = `Speech could not continue for ${item.language === 'en' ? 'English' : 'Cantonese'}; the next queued line will continue.`;
          this.forceUpdate();
        },
      });
      this.voicesChangedUnsubscribe = this.speechEngine.onVoicesChanged(() => this.refreshNarrationVoiceOptions());
    }
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
    this.funnyLevels = readFunnyLevels(this.vocabStorage);
    this.refreshNarrationVoiceOptions();
    void this.durableStorage.bootstrap().then(() => {
      this.schoolBootstrapped = true;
      this.restoreLanguageMode();
      this.funnyLevels = readFunnyLevels(this.vocabStorage);
      this.restoreNarrationSettings();
      void this.restorePlatformAccessibility();
      this.platformAccessibilityTimer = setInterval(() => { void this.restorePlatformAccessibility(); }, 5000);
      this.restoreDisplayName();
      this.restoreAppearance();
      this.setState((prior: { values?: Record<string, unknown> }) => ({
        values: {
          ...(prior.values ?? {}),
          fun_english: this.funnyLevels.en,
          fun_cantonese: this.funnyLevels.yue,
          school_mode: schoolModeEnabled(this.vocabStorage),
          school_name: schoolModeName(this.vocabStorage),
          school_status: this.schoolStatus,
        },
      }) as never);
      if (schoolModeEnabled(this.vocabStorage)) this.applySchoolMode(true, false);
      void this.refreshSharedSchoolState();
      this.schoolRefreshTimer = setInterval(() => { void this.refreshSharedSchoolState(); }, 1000);
      this.forceUpdate();
    });
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
    if (this.schoolRefreshTimer) clearInterval(this.schoolRefreshTimer);
    this.schoolRefreshTimer = undefined;
    this.narrator?.dispose();
    this.narrator = undefined;
    this.voicesChangedUnsubscribe?.();
    this.voicesChangedUnsubscribe = undefined;
    if (this.platformAccessibilityTimer) clearInterval(this.platformAccessibilityTimer);
    this.platformAccessibilityTimer = undefined;
    setSchoolModeNameProvider(undefined);
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

    this.toastWithId('event-app-event-source-498-toast-0', 'Starting the phone system…');
    const started = await this.request('daemon.start');
    if (!started?.ok) {
      this.fireWithId('event-app-event-source-501-fire-0', 'The phone system did not start', started?.message ?? 'Asterisk did not answer after it was started.');
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
      if (result.ok) this.toastWithId('event-app-event-source-533-toast-0', result.status);
      else this.fireWithId('event-app-event-source-534-fire-0', 'Vocabulary file rejected', result.status);
    };
    reader.onerror = () => this.fireWithId('event-app-event-source-536-fire-0', 'Vocabulary file not read', 'The file could not be read from disk.');
    reader.readAsText(file);
  };

  onFileCleared = (ctl: { id: string }): void => {
    const result = clearVocabulary(this.vocabStorage);
    this.pickedFileNames.delete(ctl.id);
    this.forceUpdate();
    this.toastWithId('event-app-event-source-544-toast-0', result.status);
  };

  // ---------------------------------------------------------------- daemon lifecycle

  private daemonAction = async (verb: 'start' | 'stop' | 'restart'): Promise<void> => {
    if (!this.target.connected) {
      this.fireWithId('event-app-event-source-551-fire-0', 'No target connected', 'Connect to a server first — there is nothing to start, stop, or restart yet.');
      return;
    }
    this.toastWithId('event-app-event-source-554-toast-0', `${verb === 'start' ? 'Starting' : verb === 'stop' ? 'Stopping' : 'Restarting'} the phone system…`);
    const response = await this.request(`daemon.${verb}`);
    if (!response?.ok) {
      this.fireWithId('event-app-event-source-557-fire-0', 'Not done', response?.message ?? `The phone system did not ${verb}.`);
      await this.refreshDaemonStatus();
      return;
    }
    /* Anything read before this point may no longer reflect what Asterisk is doing. */
    this.readings = {};
    this.canvasReadings = undefined;
    await this.refreshDaemonStatus();
    this.fireWithId('event-app-event-source-565-fire-0', `Phone system ${verb === 'start' ? 'started' : verb === 'stop' ? 'stopped' : 'restarted'}`, `Asterisk on ${this.target.label} answered after the ${verb}.`);
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
      category: String(values.sup_category ?? 'Something else') as TicketCategory,
      description: String(values.sup_description ?? ''),
      severity: String(values.sup_severity ?? 'Normal') as TicketSeverity,
      openedAt: new Date().toISOString(),
      draw: Math.random(),
    });
    if ('problems' in result) {
      this.fireWithId('event-app-event-source-602-fire-0', 'That ticket will not file', result.problems[0].message);
      return;
    }
    const resolution = resolutionFor(IDENTITY.dataDirectory);
    this.fireWithId('event-app-event-source-606-fire-0', `Ticket ${result.id} — ${result.status}`,
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

  private currentFunnyEvent(text: string, kind: 'toast' | 'dialog-title' | 'dialog-body' = 'toast', callId?: string): { display: string; enText: string; yueText: string } {
    const event = localizeEventText(text, this.renameSchoolText);
    const enText = styleFunnyText(event.enText, 'en', this.funnyLevels.en);
    const inventory = callId ? dynamicEventCopyRecordByCallId(callId) : dynamicEventCopyRecord(text, kind);
    const yueText = event.translated && inventory?.status !== 'english-fallback'
      ? styleFunnyText(event.yueText, 'yue', this.funnyLevels.yue)
      : event.yueText;
    return {
      display: languageMode() === 'yue' ? yueText : languageMode() === 'both' ? (enText === yueText ? enText : `${enText} · ${yueText}`) : enText,
      enText,
      yueText,
    };
  }

  private renameSchoolText = (text: string): string => {
    const name = schoolModeName(this.vocabStorage);
    if (name === DEFAULT_SCHOOL_NAME) return text;
    const renamed = text.replaceAll(DEFAULT_SCHOOL_NAME, name).replaceAll('school mode', name).replaceAll('學校模式', name);
    if (languageMode() === 'both') {
      const halves = renamed.split(' · ');
      if (halves.length === 2 && halves[0] === name && halves[1] === name) return name;
    }
    return renamed;
  };

  private localizedSchoolRecoveryLine(path: string): string {
    return `${this.renameSchoolText(localizeText('If you forget this credential, delete'))} ${path} ${this.renameSchoolText(localizeText('to reset School mode and its local settings.'))}`;
  }

  private localizedSchoolDisclosure(setMode: boolean): string {
    const source = setMode
      ? 'This credential is stored only in the operating-system credential vault under the shared account key for this installed desktop console. It never enters settings, exports, history, logs or captures.'
      : 'The credential is checked by the operating-system credential vault. Winning a challenge never bypasses this credential.';
    return this.renameSchoolText(localizeText(source));
  }

  /** The generated shell owns the actual toast and dialog renderers. This wrapper
   * keeps every app event on the localization and funny-level boundary and queues
   * the same factual text for the optional narrator. */
  private localizedToast = (message: string): void => {
    const event = this.currentFunnyEvent(message);
    this.baseToast(event.display);
    this.narrator?.enqueue('notification', event.display, { enText: event.enText, yueText: event.yueText });
  };

  private localizedFire = (title: string, body: string): void => {
    const titleEvent = this.currentFunnyEvent(title, 'dialog-title');
    const bodyEvent = this.currentFunnyEvent(body, 'dialog-body');
    this.baseFire(titleEvent.display, bodyEvent.display);
    this.narrator?.enqueue('dialog', `${titleEvent.display}. ${bodyEvent.display}`, {
      isError: /not |failed|error|cannot|could not|rejected|unavailable/iu.test(body),
      enText: `${titleEvent.enText}. ${bodyEvent.enText}`,
      yueText: `${titleEvent.yueText}。${bodyEvent.yueText}`,
    });
  };

  private toastWithId = (callId: string, message: string): void => {
    const event = this.currentFunnyEvent(message, 'toast', callId);
    this.baseToast(event.display);
    this.narrator?.enqueue('notification', event.display, { enText: event.enText, yueText: event.yueText });
  };

  private fireWithId = (callId: string, title: string, body: string): void => {
    const titleEvent = this.currentFunnyEvent(title, 'dialog-title', callId);
    const bodyEvent = this.currentFunnyEvent(body, 'dialog-body', callId);
    this.baseFire(titleEvent.display, bodyEvent.display);
    this.narrator?.enqueue('dialog', `${titleEvent.display}. ${bodyEvent.display}`, {
      isError: /not |failed|error|cannot|could not|rejected|unavailable/iu.test(body),
      enText: `${titleEvent.enText}. ${bodyEvent.enText}`,
      yueText: `${titleEvent.yueText}。${bodyEvent.yueText}`,
    });
  };

  private restoreNarrationSettings(): void {
    const raw = this.vocabStorage.getItem('console.narration');
    if (!raw || !this.narrator) return;
    try {
      const saved = JSON.parse(raw) as { enabled?: boolean; language?: NarrationLanguage; voices?: { en?: string; zh?: string }; rate?: number; pitch?: number };
      this.narrator.setSettings({
        enabled: saved.enabled === true,
        language: saved.language === 'zh' || saved.language === 'both' ? saved.language : 'en',
        voices: saved.voices,
        rate: saved.rate,
        pitch: saved.pitch,
      });
      this.narrationQuiet = this.vocabStorage.getItem('console.narrationQuiet') === 'on';
      this.narrationScreenReaderOverride = this.vocabStorage.getItem('console.narrationScreenReader') === 'on';
      this.narrator.setQuiet(this.narrationQuiet);
      this.narrator.setScreenReaderActive(this.platformScreenReaderActive || this.narrationScreenReaderOverride);
      this.syncNarrationStateToControls();
      this.updateNarrationStatus();
    } catch {
      // Invalid local settings fail closed to narration off and platform defaults.
    }
  }

  private async restorePlatformAccessibility(): Promise<void> {
    const bridge = this.bridge() as DesktopBridge | undefined;
    try {
      const active = await this.boundedCall(() => bridge?.accessibility?.isScreenReaderActive() ?? Promise.resolve(undefined), 1200);
      if (typeof active === 'boolean') {
        this.platformScreenReaderActive = active;
        this.narrator?.setScreenReaderActive(active || this.narrationScreenReaderOverride);
        this.updateNarrationStatus();
      }
    } catch {
      this.platformScreenReaderActive = false;
      this.narrator?.setScreenReaderActive(this.narrationScreenReaderOverride);
      this.updateNarrationStatus();
    }
    try {
      const recovery = await this.boundedCall(() => bridge?.school?.recoveryPath() ?? Promise.resolve(undefined), 1200);
      if (recovery?.ok && recovery.path) {
        this.schoolRecoveryPath = recovery.path;
        this.schoolRecoveryReady = true;
        this.schoolRecoveryLine = `If you forget this credential, delete ${recovery.path} to reset School mode and its local settings.`;
        this.forceUpdate();
      } else {
        this.schoolRecoveryReady = false;
        this.schoolRecoveryLine = recovery?.reason ?? 'The exact application-data recovery path is unavailable.';
        this.forceUpdate();
      }
    } catch {
      this.schoolRecoveryReady = false;
      this.schoolRecoveryLine = 'The exact application-data recovery path is unavailable.';
      this.forceUpdate();
    }
  }

  private syncNarrationStateToControls(): void {
    const settings = this.narrator?.getSettings();
    if (!settings) return;
    const language = settings.language === 'zh' ? '廣東話' : settings.language === 'both' ? 'Both' : 'English';
    this.setState((prior: { values?: Record<string, unknown> }) => ({
      values: {
        ...(prior.values ?? {}),
        nar_enabled: settings.enabled,
        nar_language: language,
        nar_en_voice: this.voiceLabelForId(settings.voices.en, 'en'),
        nar_yue_voice: this.voiceLabelForId(settings.voices.zh, 'zh'),
        nar_rate: settings.rate,
        nar_pitch: settings.pitch,
        nar_screen_reader: this.narrationScreenReaderOverride,
      },
    }) as never);
  }

  private persistNarration(): void {
    const settings = this.narrator?.getSettings();
    if (!settings) return;
    this.vocabStorage.setItem('console.narration', JSON.stringify(settings));
    this.vocabStorage.setItem('console.narrationQuiet', this.narrationQuiet ? 'on' : 'off');
    this.vocabStorage.setItem('console.narrationScreenReader', this.narrationScreenReaderOverride ? 'on' : 'off');
    this.updateNarrationStatus();
  }

  private refreshNarrationVoiceOptions(): void {
    if (!this.speechEngine) {
      this.narrationStatusLine = 'Speech synthesis is not available on this computer.';
      this.forceUpdate();
      return;
    }
    const screens = SCREENS as unknown as { customise?: { groups?: Array<{ ctls: Array<{ id: string; options?: string[] }> }> } };
    this.voiceOptionIds = {};
    for (const group of screens.customise?.groups ?? []) {
      for (const control of group.ctls) {
        if (control.id === 'nar_en_voice' || control.id === 'nar_yue_voice') {
          const language = control.id === 'nar_en_voice' ? 'en' : 'zh';
          const options = voiceOptions(this.speechEngine, language);
          control.options = options.map((option) => {
            if (option.id === CHOOSE_AUTOMATICALLY) return option.label;
            const label = `${option.label} (${language})`;
            this.voiceOptionIds[label] = option.id;
            return label;
          });
        }
      }
    }
    this.updateNarrationStatus();
    this.forceUpdate();
  }

  private voiceLabelForId(id: string | undefined, language: 'en' | 'zh'): string {
    if (!id) return 'Choose automatically';
    const option = Object.entries(this.voiceOptionIds).find(([, voiceId]) => voiceId === id);
    return option?.[0] ?? `Installed voice (${language})`;
  }

  private updateNarrationStatus(): void {
    if (!this.narrator) {
      this.narrationStatusLine = 'Speech synthesis is not available on this computer.';
      return;
    }
    const english = this.narrator.status('en').message;
    const cantonese = this.narrator.status('zh').message;
    this.narrationStatusLine = `English: ${english} Cantonese: ${cantonese}`;
  }

  private applyNarrationControl(control: ControlRef, value: unknown): void {
    if (!this.narrator) return;
    if (control.id === 'nar_enabled' && typeof value === 'boolean') this.narrator.setSettings({ enabled: value });
    if (control.id === 'nar_language') {
      const language: NarrationLanguage = value === '廣東話' ? 'zh' : value === 'Both' ? 'both' : 'en';
      this.narrator.setSettings({ language });
    }
    if (control.id === 'nar_en_voice' || control.id === 'nar_yue_voice') {
      const selected = String(value) === 'Choose automatically' ? undefined : this.voiceOptionIds[String(value)] ?? String(value);
      this.narrator.setSettings({ voices: control.id === 'nar_en_voice' ? { en: selected } : { zh: selected } });
    }
    if (control.id === 'nar_rate' && typeof value === 'number') this.narrator.setSettings({ rate: value });
    if (control.id === 'nar_pitch' && typeof value === 'number') this.narrator.setSettings({ pitch: value });
    if (control.id === 'nar_screen_reader' && typeof value === 'boolean') {
      this.narrationScreenReaderOverride = value;
      this.narrator.setScreenReaderActive(this.platformScreenReaderActive || value);
    }
    this.persistNarration();
  }

  private async refreshSharedSchoolState(): Promise<void> {
    if (!this.schoolBootstrapped || this.schoolRefreshInFlight) return;
    this.schoolRefreshInFlight = true;
    const generation = ++this.schoolRefreshGeneration;
    try {
      const response = await this.requestWithDeadline('settings.snapshot', 1500);
      if (generation !== this.schoolRefreshGeneration) return;
      if (!response?.ok) {
        this.schoolStatus = 'refresh-failed';
        this.forceUpdate();
        return;
      }
      const values = response.data as { values?: Record<string, string> };
      const snapshot = values.values ?? {};
      const enabled = snapshot[SCHOOL_MODE_SETTING] === 'on';
      const localEnabled = schoolModeEnabled(this.vocabStorage);
      const name = snapshot['console.schoolModeName']?.trim() || DEFAULT_SCHOOL_NAME;
      if (enabled !== localEnabled) this.applySchoolMode(enabled, false);
      if (snapshot[SCHOOL_MODE_SETTING] !== this.vocabStorage.getItem(SCHOOL_MODE_SETTING)) this.vocabStorage.setItem(SCHOOL_MODE_SETTING, enabled ? 'on' : 'off');
      if (snapshot['console.schoolModeName'] && snapshot['console.schoolModeName'] !== this.vocabStorage.getItem('console.schoolModeName')) this.vocabStorage.setItem('console.schoolModeName', name);
      this.schoolStatus = enabled ? 'enabled' : 'disabled';
      this.setState((prior: { values?: Record<string, unknown> }) => ({
        values: { ...(prior.values ?? {}), school_mode: enabled, school_name: name, school_status: this.schoolStatus },
      }) as never);
    } catch {
      this.schoolStatus = 'refresh-failed';
      this.forceUpdate();
    } finally {
      this.schoolRefreshInFlight = false;
    }
  }

  private async boundedCall<T>(call: () => Promise<T>, timeoutMs: number): Promise<T | undefined> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        call(),
        new Promise<undefined>((resolve) => { timer = setTimeout(() => resolve(undefined), timeoutMs); }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async requestWithDeadline(action: string, timeoutMs: number): Promise<ControlPlaneResponse | undefined> {
    return this.boundedCall(() => this.request(action), timeoutMs);
  }

  private applySchoolMode(enabled: boolean, persist: boolean): void {
    const storage = this.vocabStorage;
    const currentlyEnabled = schoolModeEnabled(storage);
    if (enabled === currentlyEnabled && this.schoolStatus === (enabled ? 'enabled' : 'disabled')) return;
    if (enabled) {
      const narration = this.narrator ? {
        ...this.narrator.getSettings(),
        quiet: this.narrationQuiet,
        screenReaderOverride: this.narrationScreenReaderOverride,
      } : undefined;
      savePreviousSettings(storage, languageMode(), this.funnyLevels, narration);
      if (persist) writeSchoolMode(storage, true);
      setLanguageMode('en');
      this.funnyLevels = { en: 1, yue: 1 };
      this.schoolStatus = 'enabled';
      this.narrator?.setSettings({ enabled: false });
      this.narrator?.setQuiet(true);
      this.setState((prior: { screen?: string; paletteOpen?: boolean }) => ({
        screen: prior.screen === 'vocab' || prior.screen === 'arcade' ? 'customise' : prior.screen,
        paletteOpen: false,
      }) as never);
    } else {
      if (persist) writeSchoolMode(storage, false);
      const previous = readPreviousSettings(storage);
      if (isLanguageMode(previous?.language)) {
        setLanguageMode(previous.language);
        storage.setItem(App.LANGUAGE_SETTING, previous.language);
      }
      this.funnyLevels = {
        en: Number(previous?.funny?.en) || DEFAULT_FUNNY_LEVELS.en,
        yue: Number(previous?.funny?.yue) || DEFAULT_FUNNY_LEVELS.yue,
      };
      writeFunnyLevels(storage, this.funnyLevels);
      this.schoolStatus = 'disabled';
      this.restoreNarrationFromSchoolSnapshot();
    }
    this.setState((prior: { values?: Record<string, unknown> }) => ({
      values: { ...(prior.values ?? {}), school_mode: enabled, school_status: this.schoolStatus, fun_english: this.funnyLevels.en, fun_cantonese: this.funnyLevels.yue },
    }) as never);
    this.forceUpdate();
  }

  private setSchoolMode = async (enabled: boolean): Promise<void> => {
    if (enabled) {
      this.applySchoolMode(true, true);
      return;
    }
    await this.unlockSchoolMode();
  };

  private configureSchoolCredential = async (): Promise<void> => {
    if (this.schoolCredentialPromptOpen) return;
    if (!this.schoolRecoveryReady) {
      this.fireWithId('event-app-event-source-958-fire-0', 'School mode recovery path unavailable', this.schoolRecoveryLine);
      return;
    }
    this.schoolCredentialKind = 'set';
    this.schoolCredentialValue = '';
    this.schoolCredentialOrigin = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.schoolCredentialOpen = true;
    this.forceUpdate();
  };

  private unlockSchoolMode = async (): Promise<void> => {
    if (this.schoolCredentialPromptOpen) return;
    if (!this.schoolRecoveryReady) {
      this.fireWithId('event-app-event-source-971-fire-0', 'School mode recovery path unavailable', this.schoolRecoveryLine);
      return;
    }
    this.schoolCredentialKind = 'verify';
    this.schoolCredentialValue = '';
    this.schoolCredentialOrigin = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.schoolCredentialOpen = true;
    this.forceUpdate();
  };

  private onSchoolCredential = (event: { target?: { value?: unknown } }): void => {
    this.schoolCredentialValue = String(event.target?.value ?? '');
    this.forceUpdate();
  };

  private cancelSchoolCredential = (): void => {
    this.schoolCredentialOpen = false;
    this.schoolCredentialValue = '';
    this.schoolCredentialOrigin?.focus();
    this.schoolCredentialOrigin = null;
    this.forceUpdate();
  };

  private onSchoolCredentialKeyDown = (event: { key?: string; shiftKey?: boolean; currentTarget?: { id?: string }; preventDefault?: () => void }): void => {
    if (event.key === 'Escape') {
      event.preventDefault?.();
      this.cancelSchoolCredential();
    } else if (event.key === 'Enter') {
      event.preventDefault?.();
      if (event.currentTarget?.id === 'school-credential-cancel') this.cancelSchoolCredential();
      else void this.submitSchoolCredential();
    } else if (event.key === 'Tab') {
      event.preventDefault?.();
      if (typeof document !== 'undefined') {
        const focusOrder = ['school-credential-input', 'school-credential-cancel', 'school-credential-submit'];
        const current = focusOrder.indexOf(event.currentTarget?.id ?? 'school-credential-input');
        const next = (current + (event.shiftKey ? -1 : 1) + focusOrder.length) % focusOrder.length;
        document.getElementById(focusOrder[next]!)?.focus();
      }
    }
  };

  private submitSchoolCredential = async (): Promise<void> => {
    if (this.schoolCredentialPromptOpen || this.schoolCredentialValue.length === 0) return;
    this.schoolCredentialPromptOpen = true;
    const value = this.schoolCredentialValue;
    try {
      const bridge = this.bridge() as DesktopBridge | undefined;
      const result = this.schoolCredentialKind === 'set'
        ? await this.boundedCall(() => bridge?.school?.setCredential(value) ?? Promise.resolve(undefined), 1800)
        : await this.boundedCall(() => bridge?.school?.verifyCredential(value) ?? Promise.resolve(undefined), 1800);
      if (!result?.ok) {
        this.fireWithId('event-app-event-source-1023-fire-0', this.schoolCredentialKind === 'set' ? 'School mode credential not saved' : 'School mode remains on', result?.reason ?? 'The operating-system credential vault is unavailable.');
        return;
      }
      this.schoolCredentialOpen = false;
      this.schoolCredentialValue = '';
      this.schoolCredentialOrigin?.focus();
      this.schoolCredentialOrigin = null;
      if (this.schoolCredentialKind === 'verify') {
        this.applySchoolMode(false, true);
        this.toastWithId('event-app-event-source-1032-toast-0', `${schoolModeName(this.vocabStorage)} unlocked. Earlier language and funny levels are back.`);
      } else {
        this.toastWithId('event-app-event-source-1034-toast-0', 'School mode unlock credential saved locally.');
      }
      this.forceUpdate();
    } finally {
      this.schoolCredentialPromptOpen = false;
    }
  };

  private restoreNarrationFromSchoolSnapshot(): void {
    const previous = readPreviousSettings(this.vocabStorage)?.narration;
    if (!previous || !this.narrator) return;
    this.narrator.setSettings({
      enabled: previous.enabled === true,
      language: previous.language === 'zh' || previous.language === 'both' ? previous.language : 'en',
      voices: previous.voices as { en?: string; zh?: string } | undefined,
      rate: Number.isFinite(Number(previous.rate)) ? Number(previous.rate) : undefined,
      pitch: Number.isFinite(Number(previous.pitch)) ? Number(previous.pitch) : undefined,
    });
    this.narrationQuiet = previous.quiet === true;
    this.narrationScreenReaderOverride = previous.screenReaderOverride === true;
    this.narrator.setQuiet(this.narrationQuiet);
    this.narrator.setScreenReaderActive(this.platformScreenReaderActive || this.narrationScreenReaderOverride);
    this.persistNarration();
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
        this.fireWithId('event-app-event-source-1071-fire-0', 'That name will not work', problems[0].message);
        return;
      }
    }
    if (control?.id === 'id_name_reset' && value === true) {
      resetDisplayName(this.durableStorage.storage);
      this.toastWithId('event-app-event-source-1077-toast-0', `Name restored to ${IDENTITY.productName}`);
    }
    /* The five attention modes share one prefix and one handler, so adding a sixth is
     * a registry entry rather than another branch here. */
    if (control?.id === 'ed_choice' && typeof value === 'string') {
      const editor = KNOWN_EDITORS.find((candidate) => candidate.name === value);
      if (editor) chooseEditor(this.durableStorage.storage, editor.id);
    }
    if (control?.id === 'ed_clear' && value === true) {
      clearEditorChoice(this.durableStorage.storage);
      this.toastWithId('event-app-event-source-1087-toast-0', 'Editor choice forgotten');
    }
    if (control?.id === 'sup_open' && value === true) {
      this.fileSupportTicket();
      return;
    }
    if (control?.id?.startsWith('att_') && typeof value === 'boolean') {
      const mode = App.ATTENTION_CONTROLS[control.id];
      if (isAttentionMode(mode)) setModeEnabled(this.durableStorage.storage, mode, value);
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
    if (control?.id === 'fun_english_reset' && value === true) {
      this.funnyLevels = writeFunnyLevels(this.vocabStorage, { en: DEFAULT_FUNNY_LEVELS.en, yue: this.funnyLevels.yue });
      this.setState((prior: { values?: Record<string, unknown> }) => ({ values: { ...(prior.values ?? {}), fun_english: this.funnyLevels.en, fun_cantonese: this.funnyLevels.yue, fun_english_reset: false } }) as never);
      this.baseSetVal(control, false);
      return;
    }
    if (control?.id === 'fun_cantonese_reset' && value === true) {
      this.funnyLevels = writeFunnyLevels(this.vocabStorage, { en: this.funnyLevels.en, yue: DEFAULT_FUNNY_LEVELS.yue });
      this.setState((prior: { values?: Record<string, unknown> }) => ({ values: { ...(prior.values ?? {}), fun_english: this.funnyLevels.en, fun_cantonese: this.funnyLevels.yue, fun_cantonese_reset: false } }) as never);
      this.baseSetVal(control, false);
      return;
    }
    if (control?.id === 'fun_english' || control?.id === 'fun_cantonese') {
      const levels = control.id === 'fun_english'
        ? writeFunnyLevels(this.vocabStorage, { en: Number(value), yue: this.funnyLevels.yue })
        : writeFunnyLevels(this.vocabStorage, { en: this.funnyLevels.en, yue: Number(value) });
      this.funnyLevels = levels;
      this.setState((prior: { values?: Record<string, unknown> }) => ({ values: { ...(prior.values ?? {}), fun_english: levels.en, fun_cantonese: levels.yue } }) as never);
    }
    if (control?.id === 'school_mode' && typeof value === 'boolean') {
      if (!value) {
        void this.setSchoolMode(false);
        return;
      }
      void this.setSchoolMode(true);
    }
    if (control?.id === 'school_name' && typeof value === 'string') {
      const problems = renameSchoolMode(this.vocabStorage, value);
      if (problems.length > 0) {
        this.fireWithId('event-app-event-source-1136-fire-0', 'School mode name not saved', problems[0]!);
        this.baseSetVal(control, schoolModeName(this.vocabStorage));
        return;
      }
    }
    if (control?.id === 'school_set_credential' && value === true) {
      void this.configureSchoolCredential();
      return;
    }
    if (control?.id === 'school_unlock' && value === true) {
      void this.unlockSchoolMode();
      return;
    }
    if (control?.id?.startsWith('nar_')) this.applyNarrationControl(control, value);
    if (control?.id === 'nt_quiet' && typeof value === 'boolean') {
      this.narrationQuiet = value;
      this.narrator?.setQuiet(value);
      this.persistNarration();
    }
    this.baseSetVal(control, value);
  };

  /** Read by the compiled `text`-kind control marked `action:'daemon-status'`/`'vocab-status'`. */
  controlActionText = (action: string): string => {
    if (action === 'daemon-status') return this.daemonStatusLine;
    if (action === 'vocab-status') return vocabularyStatus(this.vocabStorage).status;
    if (action === 'school-status') return `${schoolModeName(this.vocabStorage)}: ${this.schoolStatus}`;
    if (action === 'narration-status') return this.narrationStatusLine;
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
    if (created) this.fireWithId('event-app-event-source-1196-fire-0', 'Connection added', `${created.name} is now in the server list below.`);
    else this.fireWithId('event-app-event-source-1197-fire-0', 'Not added', 'The control plane did not accept that connection.');
  };

  /** The design has already run this past `areYouSure` before calling it. */
  onRemoveServerRow = async (name: string): Promise<void> => {
    const server = this.servers.servers.find((s) => s.name === name);
    if (!server) { this.fireWithId('event-app-event-source-1203-fire-0', 'Not found', `${name} is no longer in the server list.`); return; }
    const removed = await this.servers.remove(server.id);
    this.forceUpdate();
    if (removed) this.fireWithId('event-app-event-source-1206-fire-0', 'Connection removed', `${name} was removed from the server list.`);
    else this.fireWithId('event-app-event-source-1207-fire-0', 'Not removed', 'The control plane did not accept that removal.');
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
      this.fireWithId('event-app-event-source-1265-fire-0', 'Connected', `${created.name} was added to the server list and is available on Deploy & servers.`);
      void this.discover();
      this.set('onboardOpen', false);
      this.set('screen', 'servers');
      this.set('railId', 'app');
    } else {
      this.fireWithId('event-app-event-source-1271-fire-0', 'Not connected', 'The control plane did not accept that connection. Nothing was written.');
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
        this.fireWithId('event-app-event-source-1283-fire-0', 'No target', `Nothing is connected and a runtime cannot be created here: ${runtimeLabel(this.runtime)}`);
        return;
      }
      this.toastWithId('event-app-event-source-1286-toast-0', 'Creating the Asterisk runtime for the wizard — this takes a while.');
      const provisioned = await this.request('runtime.provision');
      if (!provisioned?.ok) {
        this.fireWithId('event-app-event-source-1289-fire-0', 'Not created', provisioned?.message ?? 'Creating the runtime did not succeed, so there is nothing to deploy to.');
        return;
      }
      await this.discover();
      if (!this.target.connected) {
        this.fireWithId('event-app-event-source-1294-fire-0', 'No target', 'The runtime was created but nothing is connected yet — open Deploy & servers to finish connecting, then try the wizard again.');
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
      this.fireWithId('event-app-event-source-1313-fire-0', 'Nothing to change', 'The target already matches what the wizard would have written, so nothing was touched.');
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
            this.fireWithId('event-app-event-source-1328-fire-0', 'Deploy not applied', `${response?.message ?? result?.data?.result?.message ?? 'The target refused the change.'}`);
            return;
          }
          const secretLines = plan.newExtensions.map((e) => `${e.id}: ${e.secret}`).join('\n');
          this.fireWithId('event-app-event-source-1332-fire-0',
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
    if (!value) { this.fireWithId('event-app-event-source-1368-fire-0', 'Not loaded', 'The pjsip.conf on this target has not been read yet.'); return; }
    const endpoint = findEndpoint(value, name);
    if (!endpoint) { this.fireWithId('event-app-event-source-1370-fire-0', 'Not loaded', `${name} is not in this target's pjsip.conf.`); return; }
    this.editingEndpoint = name;
    const state = this.state as { values: Record<string, unknown> };
    this.setState({ values: { ...state.values, ...controlValuesFor(endpoint) } } as never);
    this.toastWithId('event-app-event-source-1374-toast-0', `${name} loaded into the editor below.`);
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
        this.fireWithId('event-app-event-source-1409-fire-0', 'Nothing to export', message);
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
      this.fireWithId('event-app-event-source-1431-fire-0', 'Exported', `${message} Saved as ${filename} — ${format.toUpperCase()}, UTF-8, LF line endings.${lossNote}`);
      return;
    }

    // Every other bulk verb (Enable/Disable/Duplicate/...) has no write path in this
    // console yet -- the plan and its honest count are real, but nothing is applied.
    this.set('selected', []);
    this.fireWithId('event-app-event-source-1438-fire-0', verb, message);
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
    this.fireWithId('event-app-event-source-1522-fire-0', 'Authenticator paired', 'A real TOTP secret was generated locally for this element.');
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
    if (needsPin && s.pin.length < 4) { this.toastWithId('event-app-event-source-1541-toast-0', 'Set at least a four-digit PIN first'); return; }
    if (needsPw && (s.password || '').length < 4) { this.toastWithId('event-app-event-source-1542-toast-0', 'Set a passphrase first'); return; }
    if (needsTotp && !s.totpPendingSecret) { this.toastWithId('event-app-event-source-1543-toast-0', 'Pair the built-in authenticator first'); return; }
    const L = { ...s.locks };
    L[s.lockKey] = {
      method: s.lockMethod, pin: s.pin, password: s.password, target: s.lockTarget,
      ...(needsTotp ? { totpSecret: s.totpPendingSecret } : {}),
    };
    this.setState({ locks: L, lockOpen: false, totpPendingSecret: undefined, totpPendingUri: undefined } as never);
    this.toastWithId('event-app-event-source-1550-toast-0', `${s.lockTarget} is locked with ${s.lockMethod} -- the surface is now disabled`);
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
          this.toastWithId('event-app-event-source-1578-toast-0', `${message} -- ${result.reason}`);
          return;
        }
        if (result.rung === 'moles') {
          this.toastWithId('event-app-event-source-1582-toast-0', `${message} -- the next challenge needs a visual board this build cannot show yet. Wait it out.`);
          return;
        }
        this.setState({ ladderActive: true, ladderChallenge: result, ladderDigits: '', ladderSumsAnswers: [] } as never);
        this.toastWithId('event-app-event-source-1586-toast-0', `${message} -- or clear a quick challenge instead of waiting. It only clears the wait, not this credential.`);
        return;
      }
      this.toastWithId('event-app-event-source-1589-toast-0', message);
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
    this.fireWithId('event-app-event-source-1608-fire-0', 'Unlocked', 'Welcome back.');
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
      this.toastWithId('event-app-event-source-1622-toast-0', 'Challenge cleared -- the wait is over. You still need the real PIN, passphrase or code.');
      return;
    }
    const next = this.ladder.issue(lockKey);
    if (next.rung === 'clock' || next.rung === 'moles') {
      this.setState({ ladderActive: false, ladderChallenge: null } as never);
      this.toastWithId('event-app-event-source-1628-toast-0', next.rung === 'clock'
        ? `Wrong. ${next.reason}`
        : 'Wrong. The next challenge needs a visual board this build cannot show yet.');
      return;
    }
    this.setState({ ladderChallenge: next, ladderDigits: '', ladderSumsAnswers: [] } as never);
    this.toastWithId('event-app-event-source-1634-toast-0', 'Wrong -- try again.');
  }

  /** Writes the controls back onto the endpoint they were loaded from. */
  onSaveEndpoint = async (): Promise<void> => {
    const value = this.pjsipValue();
    if (!value || !this.editingEndpoint) { this.fireWithId('event-app-event-source-1640-fire-0', 'Nothing to save', 'Select an endpoint first.'); return; }
    const edit = applyControlValues(value, this.editingEndpoint, (this.state as { values: Record<string, unknown> }).values);
    if ('error' in edit) { this.fireWithId('event-app-event-source-1642-fire-0', 'Not saved', edit.error); return; }
    if (edit.summary.length === 0) { this.toastWithId('event-app-event-source-1643-toast-0', 'Nothing changed, so nothing was written.'); return; }
    await this.writePjsip(editDocument(edit, PJSIP_RESOURCE), edit.summary, `${this.editingEndpoint} updated`);
  };

  /** Removes the loaded endpoint, meaning all three of its sections. */
  onDeleteEndpoint = (): void => {
    const value = this.pjsipValue();
    if (!value || !this.editingEndpoint) { this.fireWithId('event-app-event-source-1650-fire-0', 'Nothing to remove', 'Select an endpoint first.'); return; }
    const name = this.editingEndpoint;
    const removal = removeEndpoint(value, name);
    if ('error' in removal) { this.fireWithId('event-app-event-source-1653-fire-0', 'Not removed', removal.error); return; }
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
    if ('error' in draft) { this.fireWithId('event-app-event-source-1665-fire-0', 'Not created', draft.error); return; }
    const applied = await this.writePjsip(endpointDocument(draft), draft.summary, `${draft.view.endpoints.slice(-1)[0].name} created`);
    /* Shown once, and deliberately never in the plan above: a plan gets read aloud and
     * screenshotted, and a password has no business in one. */
    if (applied) {
      this.fireWithId('event-app-event-source-1670-fire-0', 'Write this password down', `${String((this.state as { values: Record<string, unknown> }).values[WIZARD_CONTROLS.name] ?? '')}: ${draft.secret}

It is shown once. The phone needs it to register.`);
    }
  };

  /** One write path for all three, so none of them can skip the backup and read-back. */
  private async writePjsip(document: { resource: string; value: ConfigValue }, summary: string[], done: string): Promise<boolean> {
    const payload = { documents: [{ resource: document.resource, value: document.value }] };
    const planned = await this.request('pbx.plan', { serverId: this.target.id, payload });
    if (!planned?.ok) { this.fireWithId('event-app-event-source-1680-fire-0', 'Not written', planned?.message ?? 'The control plane did not answer.'); return false; }
    const applied = await this.request('pbx.apply', { serverId: this.target.id, payload });
    if (!applied?.ok) { this.fireWithId('event-app-event-source-1682-fire-0', 'Not written', applied?.message ?? 'The change was planned but not applied.'); return false; }
    /* The reading is now stale, and a stale reading is how the next edit gets built on a
     * value that is no longer there. */
    delete this.configs.endpoints;
    this.seeded.delete('endpoints');
    this.fireWithId('event-app-event-source-1687-fire-0', done, summary.join('\n'));
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
    const readOnlyCanvas = () => this.fireWithId('event-app-event-source-1822-fire-0',
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
              this.toastWithId('event-app-event-source-2221-toast-0', `${text} copied`);
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
    this.fireWithId('event-app-event-source-2241-fire-0', 'Bold choice', 'Nobody will ever say it is boring.');
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
    this.toastWithId('event-app-event-source-2257-toast-0', 'Appearance reset to the design system');
  }

  private saveAppearance(): void {
    this.syncAppearance();
    this.fireWithId('event-app-event-source-2262-fire-0', 'Appearance saved', 'It will still be set the next time this opens.');
  }

  /** Downloads the real appearance.ts JSON export (schema-versioned, re-importable)
   *  of the live theme -- not the design's placeholder toast claiming an export
   *  happened. */
  private exportAppearance(): void {
    if (typeof document === 'undefined') {
      this.toastWithId('event-app-event-source-2270-toast-0', 'Export is not available in this environment.');
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
    this.toastWithId('event-app-event-source-2281-toast-0', 'Appearance exported as JSON');
  }

  renderVals() {
    const screen = (this.state as { screen: string }).screen;
    this.applyRows(screen);
    this.syncAppearance();
    const values = super.renderVals() as Record<string, unknown>;
    if (schoolModeEnabled(this.vocabStorage)) {
      const groups = values.groups as Array<{ ctls?: Array<{ id?: string }> }> | undefined;
      if (groups) {
        const hidden = (id: string | undefined): boolean => Boolean(id && (
          id === 'lang_mode' || id === 'dlg_emoji' || id.startsWith('fun_') || id.startsWith('va_') ||
          id === 'nar_enabled' || id === 'nar_language' || id === 'nar_en_voice' || id === 'nar_yue_voice' ||
          id === 'nar_rate' || id === 'nar_pitch' || id === 'nar_screen_reader' || id === 'nar_status'
        ));
        values.groups = groups
          .map((group) => ({ ...group, ctls: (group.ctls ?? []).filter((control) => !hidden(control.id)) }))
          .filter((group) => (group.ctls ?? []).length > 0);
      }
    }
    const schoolModeActive = schoolModeEnabled(this.vocabStorage);
    values.schoolModeActive = schoolModeActive;
    values.schoolCapabilitiesVisible = !schoolModeActive;
    values.customiseFunVisible = Boolean(values.isCustomise) && !schoolModeActive;
    values.schoolSearchVisible = !schoolModeActive;
    values.paletteVisible = Boolean(values.paletteOpen) && !schoolModeActive;
    values.narrationEngineAvailable = Boolean(this.narrator);
    if (!this.narrator) values.narrationStatusLine = 'No speech synthesis engine is available on this computer.';
    if (schoolModeActive) {
      const sections = values.sections as Array<{ label?: string }> | undefined;
      if (sections) values.sections = sections.filter((section) => section.label !== 'Vocabulary & guard' && section.label !== 'Arcade');
      values.paletteItems = [];
    }
    const bridge = this.bridge();
    const readings = this.readings[screen];
    const note = this.note(screen);

    return {
      ...values,
      schoolCredentialOpen: this.schoolCredentialOpen,
      schoolCredentialValue: this.schoolCredentialValue,
      schoolCredentialTitle: this.schoolCredentialKind === 'set' ? 'Set the shared School mode credential' : `Unlock ${schoolModeName(this.vocabStorage)}`,
      schoolCredentialDisclosure: this.localizedSchoolDisclosure(this.schoolCredentialKind === 'set'),
      schoolRecoveryLine: this.localizedSchoolRecoveryLine(this.schoolRecoveryPath),
      schoolCredentialAction: this.schoolCredentialKind === 'set' ? 'Save credential' : 'Unlock',
      onSchoolCredential: this.onSchoolCredential,
      onSchoolCredentialKeyDown: this.onSchoolCredentialKeyDown,
      cancelSchoolCredential: this.cancelSchoolCredential,
      submitSchoolCredential: this.submitSchoolCredential,
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
          toast: (message) => this.toastWithId('event-app-event-source-2359-toast-0', message),
          fire: (title, body) => this.fireWithId('event-app-event-source-2360-fire-0', title, body),
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
          this.fireWithId('event-app-event-source-2382-fire-0', 'Not available', runtimeLabel(this.runtime));
          return;
        }
        this.toastWithId('event-app-event-source-2385-toast-0', 'Creating the Asterisk runtime — this imports a root filesystem and takes a while.');
        void this.request('runtime.provision').then((response) => {
          if (!response) {
            this.fireWithId('event-app-event-source-2388-fire-0', 'Not run', 'The desktop bridge is unavailable, so nothing was created.');
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
            this.fireWithId('event-app-event-source-2400-fire-0', 'Not created', `${response.message ?? 'Creating the runtime did not succeed.'}\n\n${steps}`.trim());
            return;
          }
          this.fireWithId('event-app-event-source-2403-fire-0', 'Runtime ready', steps || 'The runtime was created and answered.');
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
      () => this.toastWithId('event-app-event-source-2754-toast-0', 'Changelog copied to the clipboard'),
      () => this.toastWithId('event-app-event-source-2755-toast-0', 'Could not reach the clipboard'),
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
  school?: {
    setCredential(value: string): Promise<{ ok: boolean; reason?: string }>;
    verifyCredential(value: string): Promise<{ ok: boolean; reason?: string }>;
    recoveryPath(): Promise<{ ok: boolean; path?: string; reason?: string }>;
  };
  accessibility?: { isScreenReaderActive(): Promise<boolean> };
}
