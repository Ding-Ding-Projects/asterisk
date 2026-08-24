import type { StatusHubClientState, StatusHubSessionSnapshot } from '../../../shared/status-hub';

export interface StatusHubSurfaceRow {
  snapshot: StatusHubSessionSnapshot;
}

export interface StatusHubSurfaceModel {
  availability: StatusHubClientState['availability'];
  project: StatusHubClientState['project'];
  rows: readonly StatusHubSurfaceRow[];
  error?: StatusHubClientState['error'];
  persistenceWarning?: StatusHubClientState['persistenceWarning'];
  observedAt?: string;
}

/**
 * Derives render data only from server observations held by the external store.
 * There is no fallback row or optimistic success state here.
 */
export function selectStatusHubSurface(state: StatusHubClientState): StatusHubSurfaceModel {
  return {
    availability: state.availability,
    project: state.project,
    rows: Object.values(state.snapshots).map(snapshot => ({ snapshot })),
    error: state.error,
    persistenceWarning: state.persistenceWarning,
    observedAt: state.observedAt,
  };
}
