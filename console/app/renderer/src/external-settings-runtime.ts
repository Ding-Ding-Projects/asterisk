import type {
  ExternalSettingsSource,
  ExternalSettingsStatus,
  ScheduleAssignment,
} from '../../../shared/external-settings';

export interface ExternalSettingsRuntimeBridge {
  readonly controlPlane: { request(request: Record<string, unknown>): Promise<{ ok: boolean; data?: unknown; message?: string }> };
}

export interface ExternalRuleState {
  readonly ruleId: string;
  readonly status: ExternalSettingsStatus;
  readonly active: boolean;
  readonly isFallback: boolean;
  readonly isStale: boolean;
  readonly assignmentCount: number;
  readonly lastRefreshAt?: string;
  readonly nextRefreshAt?: string;
  readonly lastError?: string;
}

function requestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `external-${Date.now().toString(36)}`;
}

function project(ruleId: string, value: unknown): ExternalRuleState {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    ruleId,
    status: typeof item.status === 'string' ? item.status as ExternalSettingsStatus : 'failed',
    active: item.active === true,
    isFallback: item.isFallback === true,
    isStale: item.isStale === true,
    assignmentCount: typeof item.assignmentCount === 'number' ? item.assignmentCount : 0,
    lastRefreshAt: typeof item.lastRefreshAt === 'string' ? item.lastRefreshAt : undefined,
    nextRefreshAt: typeof item.nextRefreshAt === 'string' ? item.nextRefreshAt : undefined,
    lastError: typeof item.lastError === 'string' ? item.lastError : undefined,
  };
}

function parseWireState(value: unknown): ExternalRuleState | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const item = value as Record<string, unknown>;
  const allowed = new Set(['ruleId', 'sourceKind', 'status', 'active', 'isFallback', 'isStale', 'assignmentCount', 'lastRefreshAt', 'nextRefreshAt', 'lastError']);
  if (Object.keys(item).some((key) => !allowed.has(key))) return undefined;
  if (typeof item.ruleId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(item.ruleId)) return undefined;
  if (typeof item.status !== 'string' || !['idle', 'refreshing', 'active', 'inactive', 'stale', 'offline', 'auth-error', 'rate-limited', 'malformed', 'timeout', 'blocked', 'cancelled', 'failed'].includes(item.status)) return undefined;
  if (typeof item.active !== 'boolean' || typeof item.isFallback !== 'boolean' || typeof item.isStale !== 'boolean' || !Number.isSafeInteger(item.assignmentCount) || Number(item.assignmentCount) < 0) return undefined;
  for (const key of ['lastRefreshAt', 'nextRefreshAt', 'lastError'] as const) {
    if (item[key] !== undefined && typeof item[key] !== 'string') return undefined;
  }
  return project(item.ruleId, item);
}

/** Renderer seam for bounded external source refreshes. Endpoint and vault data
 * remain in the privileged process, while source activity feeds schedule runtime. */
export class ExternalSettingsRuntime {
  private readonly states = new Map<string, ExternalRuleState>();
  private readonly inFlight = new Map<string, Promise<ExternalRuleState>>();
  private readonly listeners = new Set<(states: ReadonlyArray<ExternalRuleState>) => void>();
  constructor(private readonly bridge: ExternalSettingsRuntimeBridge) {}

  state(ruleId: string): ExternalRuleState | undefined { return this.states.get(ruleId); }

  all(): ReadonlyArray<ExternalRuleState> { return [...this.states.values()]; }

  subscribe(listener: (states: ReadonlyArray<ExternalRuleState>) => void): () => void {
    this.listeners.add(listener);
    listener(this.all());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const states = this.all();
    for (const listener of this.listeners) listener(states);
  }

  async refresh(ruleId: string, source: ExternalSettingsSource, baseAssignments: readonly ScheduleAssignment[], force = false): Promise<ExternalRuleState> {
    const active = this.inFlight.get(ruleId);
    if (active) return active;
    const task = (async () => {
      const response = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'external-settings.refresh', payload: { ruleId, source, baseAssignments, force } });
      const parsed = response.ok ? parseWireState(response.data) : undefined;
      const state = parsed ?? { ruleId, status: 'failed' as const, active: false, isFallback: true, isStale: false, assignmentCount: 0, lastError: response.message ?? 'The external settings source did not answer.' };
      this.states.set(ruleId, state);
      this.emit();
      return state;
    })();
    this.inFlight.set(ruleId, task);
    try { return await task; } finally { if (this.inFlight.get(ruleId) === task) this.inFlight.delete(ruleId); }
  }

  async readState(ruleIds: readonly string[] = this.all().map((item) => item.ruleId)): Promise<ReadonlyArray<ExternalRuleState>> {
    for (const ruleId of ruleIds) {
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(ruleId)) {
        this.states.set(ruleId, { ruleId, status: 'failed', active: false, isFallback: true, isStale: false, assignmentCount: 0, lastError: 'The rule id was invalid, so no external read was attempted.' });
        this.emit();
        continue;
      }
      const response = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'external-settings.state', payload: { ruleId } });
      const parsed = response.ok ? parseWireState(response.data) : undefined;
      this.states.set(ruleId, parsed ?? { ruleId, status: 'offline', active: false, isFallback: true, isStale: false, assignmentCount: 0, lastError: response.message ?? 'No valid external state was returned for this rule.' });
      this.emit();
    }
    return this.all();
  }

  async cancel(ruleIds: readonly string[] = [...new Set([...this.states.keys(), ...this.inFlight.keys()])]): Promise<void> {
    await Promise.all(ruleIds.map((ruleId) => this.bridge.controlPlane.request({ requestId: requestId(), action: 'external-settings.cancel', payload: { ruleId } })));
  }
}
