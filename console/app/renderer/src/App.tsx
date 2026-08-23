import type { Component } from 'react';
import ConsoleShell, { ORDER, SCREENS } from './generated/console';
import {
  badgeFor, dashboardStats, formatDuration, healthBars, isReadable, reasonFor, regexMatchLabel, rowsFor, serverRows, valueOf,
  type ViewReadings,
} from './readings';
import { canvasReason, edgePairs, layoutNodes, valueOf as canvasValueOf, type CanvasReadings } from './canvas';
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
  clearVocabulary, createMemoryStorage, loadVocabularyFile, vocabularyStatus, type VocabularyStorage,
} from './personal-vocabulary';

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
  componentDidMount?(): void;
  componentWillUnmount?(): void;
  showInfo(title: string, body: string, plain: string, x: string, y: string): void;
  ceremony(title: string, command: string): void;
  set(key: string, value: unknown): void;
  setState(update: Record<string, unknown>): void;
  moveNode(id: string, dx: number, dy: number): void;
  addEdgeFrom(): void;
  toast(message: string): void;
  areYouSure(title: string, body: string, seconds: number, onConfirm: () => void): void;
  fire(title: string, body: string): void;
}

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
  /** Local storage for the personal-vocabulary loader. `window.localStorage` on a real
   *  desktop build; falls back to an in-memory stub so the control still works (for the
   *  session) on a host with no persistent store rather than throwing. */
  private vocabStorage: VocabularyStorage =
    typeof window !== 'undefined' && window.localStorage ? window.localStorage : createMemoryStorage();
  /** The chosen file's own name, kept only for display — never its contents. */
  private pickedFileNames = new Map<string, string>();
  /** The daemon lifecycle group on Deploy & servers has no reading of its own until a
   *  target is connected and its status has actually been asked for once. */
  private daemonStatusLine = 'Unknown — no target connected yet.';

  private bridge() {
    return (window as unknown as { dingDesktop?: DesktopBridge }).dingDesktop;
  }

  componentDidMount() {
    super.componentDidMount?.();
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
      this.fire('The phone system did not start', started?.message ?? 'Asterisk did not answer after it was started.');
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
      if (result.ok) this.toast(result.status);
      else this.fire('Vocabulary file rejected', result.status);
    };
    reader.onerror = () => this.fire('Vocabulary file not read', 'The file could not be read from disk.');
    reader.readAsText(file);
  };

  onFileCleared = (ctl: { id: string }): void => {
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
      this.fire('Not done', response?.message ?? `The phone system did not ${verb}.`);
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
    if (!this.servers.applyReading(token, this.target.id, this.readings as Record<string, ViewReadings>, data)) return;
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

  renderVals() {
    const screen = (this.state as { screen: string }).screen;
    this.applyRows(screen);
    const values = super.renderVals() as Record<string, unknown>;
    const bridge = this.bridge();
    const readings = this.readings[screen];
    const note = this.note(screen);

    return {
      ...values,
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
