/**
 * In-memory state holder for external scheduled settings.
 *
 * The store owns the fallback rule, refresh cadence, and generation check. It
 * never writes a remote response into DesktopSettings or any other persistent
 * base. A failed refresh keeps a still-valid last reading when possible and
 * otherwise exposes the original local assignments.
 */
import {
  createInitialExternalSettingsState,
  validateAssignments,
} from "../shared/external-settings.js";
import type {
  ExternalSettingsSource,
  ExternalSettingsState,
  ExternalSettingsStatus,
  ScheduleAssignment,
} from "../shared/external-settings.js";
import {
  createExternalSettingsHandler,
} from "./external-settings-client.js";
import type {
  ExternalSettingsFailure,
  ExternalSettingsHandler,
  ExternalSettingsReadResult,
} from "./external-settings-client.js";

export interface ExternalSettingsStoreOptions {
  readonly handler?: ExternalSettingsHandler;
  readonly now?: () => Date;
}

export interface ExternalSettingsRefreshOptions {
  readonly force?: boolean;
  readonly signal?: AbortSignal;
}

export interface ExternalSettingsStore {
  getState(): ExternalSettingsState;
  subscribe(listener: (state: ExternalSettingsState) => void): () => void;
  refresh(
    source: ExternalSettingsSource,
    baseAssignments: readonly ScheduleAssignment[],
    options?: ExternalSettingsRefreshOptions,
  ): Promise<ExternalSettingsState>;
  cancel(): void;
}

function fallbackAssignments(state: ExternalSettingsState, now: Date): {
  readonly assignments: readonly ScheduleAssignment[];
  readonly active: boolean;
} {
  const last = state.lastValid;
  if (!last) return { assignments: state.baseAssignments, active: false };
  if (last.expiresAt && Date.parse(last.expiresAt) <= now.getTime()) {
    return { assignments: state.baseAssignments, active: false };
  }
  if (!last.active) return { assignments: state.baseAssignments, active: false };
  return { assignments: last.assignments ?? state.baseAssignments, active: true };
}

function failureStatus(status: ExternalSettingsFailure): ExternalSettingsStatus {
  if (status === 'cancelled') return 'cancelled';
  return status;
}

function sourceKey(source: ExternalSettingsSource): string {
  return JSON.stringify(source);
}

/** Creates a store. All state is process-local and disposable. */
export function createExternalSettingsStore(options: ExternalSettingsStoreOptions = {}): ExternalSettingsStore {
  const handler = options.handler ?? createExternalSettingsHandler({ now: options.now });
  const now = options.now ?? (() => new Date());
  let state = createInitialExternalSettingsState('local');
  let generation = 0;
  let sourceIdentity = sourceKey({ kind: 'local' });
  const listeners = new Set<(next: ExternalSettingsState) => void>();

  function publish(next: ExternalSettingsState): void {
    state = next;
    for (const listener of listeners) listener(state);
  }

  function nextRefreshAt(source: ExternalSettingsSource, at: Date): string | undefined {
    if (source.kind === 'local') return undefined;
    return new Date(at.getTime() + source.refreshMinutes * 60_000).toISOString();
  }

  function isCadenced(stateValue: ExternalSettingsState, source: ExternalSettingsSource, at: Date): boolean {
    if (source.kind === 'local' || !stateValue.nextRefreshAt) return false;
    const next = Date.parse(stateValue.nextRefreshAt);
    return Number.isFinite(next) && at.getTime() < next;
  }

  async function refresh(
    source: ExternalSettingsSource,
    baseAssignments: readonly ScheduleAssignment[],
    refreshOptions: ExternalSettingsRefreshOptions = {},
  ): Promise<ExternalSettingsState> {
    const validatedAssignments = validateAssignments(baseAssignments);
    if (!validatedAssignments.ok) throw new Error(`Invalid local scheduled assignments: ${validatedAssignments.reason}`);
    const validatedSource = source;
    const identity = sourceKey(validatedSource);
    const clock = now();
    const sameBase = JSON.stringify(state.baseAssignments) === JSON.stringify(validatedAssignments.assignments);
    if (!refreshOptions.force && identity === sourceIdentity && sameBase
      && isCadenced(state, validatedSource, clock)) {
      return state;
    }
    const myGeneration = ++generation;
    const sameSource = identity === sourceIdentity;
    sourceIdentity = identity;
    const previous = state;
    const nextBase = validatedAssignments.assignments;
    const started: ExternalSettingsState = {
      ...(sameSource ? previous : createInitialExternalSettingsState(validatedSource.kind, nextBase)),
      sourceKind: validatedSource.kind,
      baseAssignments: structuredClone(nextBase),
      effectiveAssignments: structuredClone(nextBase),
      status: 'refreshing',
      nextRefreshAt: nextRefreshAt(validatedSource, clock),
      lastError: undefined,
      remoteValuePersistedAsBase: false,
    };
    publish(started);
    const result = await handler.read(validatedSource, refreshOptions.signal);
    if (myGeneration !== generation) return state;
    const finishedAt = now();
    if (result.ok) {
      const reading = result.reading;
      const acceptedAssignments = reading.assignments ?? nextBase;
      const snapshot = {
        sourceKind: validatedSource.kind,
        ...reading,
        assignments: structuredClone(acceptedAssignments),
      };
      const effective = reading.active ? acceptedAssignments : nextBase;
      const next: ExternalSettingsState = {
        sourceKind: validatedSource.kind,
        baseAssignments: structuredClone(nextBase),
        lastValid: snapshot,
        effectiveAssignments: structuredClone(effective),
        active: reading.active,
        status: reading.active ? 'active' : 'inactive',
        lastRefreshAt: finishedAt.toISOString(),
        nextRefreshAt: nextRefreshAt(validatedSource, finishedAt),
        lastError: undefined,
        remoteValuePersistedAsBase: false,
      };
      publish(next);
      return next;
    }
    const fallback = fallbackAssignments({ ...state, baseAssignments: structuredClone(nextBase) }, finishedAt);
    const status = failureStatus(result.status);
    const next: ExternalSettingsState = {
      sourceKind: validatedSource.kind,
      baseAssignments: structuredClone(nextBase),
      lastValid: state.lastValid,
      effectiveAssignments: structuredClone(fallback.assignments),
      active: fallback.active,
      status,
      lastRefreshAt: state.lastRefreshAt,
      nextRefreshAt: nextRefreshAt(validatedSource, finishedAt),
      lastError: result.reason,
      remoteValuePersistedAsBase: false,
    };
    publish(next);
    return next;
  }

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    refresh,
    cancel: () => {
      generation += 1;
      handler.cancel();
    },
  };
}
