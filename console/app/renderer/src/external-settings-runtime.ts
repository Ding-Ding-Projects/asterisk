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

/** Renderer seam for bounded external source refreshes. Endpoint and vault data
 * remain in the privileged process, while source activity feeds schedule runtime. */
export class ExternalSettingsRuntime {
  private readonly states = new Map<string, ExternalRuleState>();
  constructor(private readonly bridge: ExternalSettingsRuntimeBridge) {}

  state(ruleId: string): ExternalRuleState | undefined { return this.states.get(ruleId); }

  all(): ReadonlyArray<ExternalRuleState> { return [...this.states.values()]; }

  async refresh(ruleId: string, source: ExternalSettingsSource, baseAssignments: readonly ScheduleAssignment[], force = false): Promise<ExternalRuleState> {
    const response = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'external-settings.refresh', payload: { source, baseAssignments, force } });
    const state = response.ok ? project(ruleId, response.data) : { ruleId, status: 'failed' as const, active: false, isFallback: true, isStale: false, assignmentCount: 0, lastError: response.message ?? 'The external settings source did not answer.' };
    this.states.set(ruleId, state);
    return state;
  }

  async readState(): Promise<ReadonlyArray<ExternalRuleState>> {
    const response = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'external-settings.state' });
    if (!response.ok) return this.all();
    return this.all();
  }

  async cancel(): Promise<void> {
    await this.bridge.controlPlane.request({ requestId: requestId(), action: 'external-settings.cancel' });
  }
}
