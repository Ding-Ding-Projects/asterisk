import type { Component } from 'react';
import ConsoleShell, { ORDER, SCREENS } from './generated/console';
import {
  badgeFor, dashboardStats, formatDuration, healthBars, isReadable, reasonFor, regexMatchLabel, rowsFor, valueOf,
  type ViewReadings,
} from './readings';
import { canvasReason, edgePairs, layoutNodes, valueOf as canvasValueOf, type CanvasReadings } from './canvas';
import type { ControlPlaneResponse, PbxReadView } from '../../../shared/control-plane';

/**
 * The interface is the compiled design reference. This subclass supplies what a static
 * design cannot: the real frameless-window controls, and real readings in place of the
 * design's sample content. No screen ever shows a value the console has not read.
 */
type Target = { id: string; label: string; detail: string; connected: boolean };

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
  private readings: Partial<Record<string, ViewReadings>> = {};
  private pending = '';
  private canvasReadings: CanvasReadings | undefined;
  private canvasPending = false;

  private bridge() {
    return (window as unknown as { dingDesktop?: DesktopBridge }).dingDesktop;
  }

  componentDidMount() {
    super.componentDidMount?.();
    void this.discover();
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
      const detail = Array.isArray(data.wsl) ? 'no WSL distribution discovered' : data.wsl?.unavailable ?? 'no local target discovered';
      this.target = { ...NO_TARGET, detail };
      this.forceUpdate();
      return;
    }
    this.target = { id: distributions[0], label: distributions[0], detail: `${distributions.length} local target(s)`, connected: true };
    this.readings = {};
    this.canvasReadings = undefined;
    this.forceUpdate();
  };

  /** Reads the screen currently on top, once per screen change. */
  private refresh = async () => {
    const screen = (this.state as { screen: string }).screen;
    if (!this.target.connected) return;
    if (screen === 'canvas') {
      if (this.canvasReadings || this.canvasPending) return;
      this.canvasPending = true;
      const response = await this.request('pbx.read', { serverId: this.target.id, view: 'canvas' as PbxReadView });
      this.canvasPending = false;
      this.canvasReadings = response?.ok
        ? (response.data as CanvasReadings)
        : { dialplan: { command: 'pbx.read', result: { state: 'unavailable', observedAt: new Date().toISOString(), reason: response?.message ?? 'the control plane did not answer' } } };
      this.forceUpdate();
      return;
    }
    if (!isReadable(screen)) return;
    if (this.readings[screen] || this.pending === screen) return;
    this.pending = screen;
    const response = await this.request('pbx.read', { serverId: this.target.id, view: screen as PbxReadView });
    this.pending = '';
    this.readings[screen] = response?.ok
      ? (response.data as ViewReadings)
      : { channels: { command: 'pbx.read', result: { state: 'unavailable', observedAt: new Date().toISOString(), reason: response?.message ?? 'the control plane did not answer' } } };
    this.forceUpdate();
  };

  /** The design's sample rows are replaced before it builds the table, so selection,
   *  filtering, chips and the row context menu keep working against real rows. */
  private applyRows(screen: string): void {
    const screens = SCREENS as Record<string, { table?: { rows: string[][] } }>;
    for (const id of TABLE_SCREENS) {
      const table = screens[id].table;
      if (table) table.rows = id === screen ? rowsFor(screen, this.readings[screen]) : [];
    }
  }

  private note(screen: string): string {
    if (screen === 'history') return NO_HISTORY;
    if (screen === 'memory') return NO_MEMORY;
    if (screen === 'trunkauth') return NO_AUTH_REQUESTS;
    if (!this.target.connected) return `No target is connected — ${this.target.detail}.`;
    if (screen === 'canvas') {
      if (!this.canvasReadings) return 'Reading…';
      return canvasReason(this.canvasReadings);
    }
    if (!isReadable(screen)) return NO_READER;
    const readings = this.readings[screen];
    if (!readings) return 'Reading…';
    return reasonFor(readings, ['channels', 'endpoints', 'contacts', 'registrations', 'queues', 'modules', 'uptime']);
  }

  /** Real dialplan nodes/edges in the design's canvas shapes, with a bezier path per edge
   *  computed the same way the design computes it for its own sample graph. */
  private canvasVals(designVals: Record<string, unknown>): Record<string, unknown> {
    const graph = canvasValueOf(this.canvasReadings?.dialplan);
    if (!graph) return { nodes: [], edges: [], nodeCtls: [], nodeTitle: '', nodeApp: '' };

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
        connect: () => this.addEdgeFrom(),
        ctx: (e: MouseEvent) => { e.preventDefault(); this.setState({ nodeId: node.id, ctxOpen: true, ctxX: `${e.clientX}px`, ctxY: `${e.clientY}px`, ctxTarget: node.title, ctxKind: 'node' }); },
        dup: () => this.toast(`${node.title} duplicated on the canvas`),
        del: () => this.areYouSure(`Delete ${node.title}`, 'The step and every connection into or out of it are removed from the dialplan.', 3, () => this.fire('Step deleted', `${node.title} is gone.`)),
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
          onInfo: () => {},
          onWizard: () => {},
        }))
      : [];

    return {
      nodes,
      edges,
      nodeCtls,
      nodeTitle: source ? `${source.context} · ${source.extension}` : (designVals.nodeTitle as string),
      nodeApp: source && source.steps[0] ? `${source.steps[0].app}(${source.steps[0].data})` : '',
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
      oneClickRunning: false,
      oneClickLog: [],
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
