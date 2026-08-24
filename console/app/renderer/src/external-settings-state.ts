/**
 * Renderer-safe projection for the privileged external settings store.
 *
 * Endpoint URLs, vault references, response revisions, and response contents
 * do not cross this boundary. The renderer receives only the state needed to
 * explain whether a schedule is active, using a fallback, or waiting to retry.
 */
import type {
  ExternalSettingsProjection,
  ExternalSettingsState,
} from '../../../shared/external-settings.js';

export type ExternalSettingsUiTone = 'neutral' | 'positive' | 'warning' | 'error';

export interface ExternalSettingsUiState {
  readonly status: ExternalSettingsProjection['status'];
  readonly tone: ExternalSettingsUiTone;
  readonly active: boolean;
  readonly isFallback: boolean;
  readonly isStale: boolean;
  readonly assignmentCount: number;
  readonly lastRefreshAt: string | undefined;
  readonly nextRefreshAt: string | undefined;
  readonly lastError: string | undefined;
}

function toneFor(status: ExternalSettingsProjection['status']): ExternalSettingsUiTone {
  if (status === 'active') return 'positive';
  if (status === 'offline' || status === 'stale' || status === 'rate-limited' || status === 'timeout' || status === 'refreshing') return 'warning';
  if (status === 'auth-error' || status === 'malformed' || status === 'blocked' || status === 'failed') return 'error';
  return 'neutral';
}

/** Projects privileged state without exposing source configuration or payloads. */
export function projectExternalSettingsState(state: ExternalSettingsState): ExternalSettingsUiState {
  const projection: ExternalSettingsProjection = {
    sourceKind: state.sourceKind,
    status: state.status,
    active: state.active,
    effectiveAssignments: state.effectiveAssignments,
    assignmentCount: state.effectiveAssignments.length,
    isFallback: state.status !== 'active' && state.status !== 'inactive' && state.status !== 'idle' && state.status !== 'refreshing',
    isStale: state.status === 'stale',
    lastRefreshAt: state.lastRefreshAt,
    nextRefreshAt: state.nextRefreshAt,
    lastError: state.lastError,
  };
  return {
    status: projection.status,
    tone: toneFor(projection.status),
    active: projection.active,
    isFallback: projection.isFallback,
    isStale: projection.isStale,
    assignmentCount: projection.assignmentCount,
    lastRefreshAt: projection.lastRefreshAt,
    nextRefreshAt: projection.nextRefreshAt,
    lastError: projection.lastError,
  };
}
