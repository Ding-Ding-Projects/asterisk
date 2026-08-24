/** Pure operation state machine for pending, progress, cancellation, deadlines, and re-entry. */

export type OperationPhase = 'idle' | 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'timed-out';

export interface OperationProgress {
  completed: number;
  total?: number;
  message?: string;
}

export interface OperationState {
  phase: OperationPhase;
  operationId?: string;
  startedAt?: number;
  finishedAt?: number;
  deadlineAt?: number;
  cancellable: boolean;
  cancelRequested: boolean;
  progress?: OperationProgress;
  error?: string;
}

export const IDLE_OPERATION: OperationState = {
  phase: 'idle',
  cancellable: false,
  cancelRequested: false,
};

export type OperationRefusalCode =
  | 're-entry-blocked'
  | 'not-pending'
  | 'not-cancellable'
  | 'cancellation-not-requested'
  | 'deadline-not-reached'
  | 'invalid-deadline'
  | 'invalid-progress';

export interface OperationRefusal {
  code: OperationRefusalCode;
  message: string;
  recoveryAction?: string;
}

export type OperationTransition =
  | { accepted: true; state: OperationState }
  | { accepted: false; state: OperationState; reason: OperationRefusal };

export interface BeginOperationInput {
  operationId: string;
  now: number;
  deadlineMs: number;
  cancellable?: boolean;
}

/** A pending operation refuses re-entry even if a visible button failed to disable. */
export function beginOperation(state: OperationState, input: BeginOperationInput): OperationTransition {
  if (state.phase === 'pending') {
    return {
      accepted: false,
      state,
      reason: {
        code: 're-entry-blocked',
        message: `${state.operationId ?? 'The operation'} is already running.`,
        recoveryAction: 'Wait for it to finish or cancel it where cancellation is available.',
      },
    };
  }
  if (!Number.isFinite(input.now) || !Number.isFinite(input.deadlineMs) || input.deadlineMs <= 0) {
    return {
      accepted: false,
      state,
      reason: {
        code: 'invalid-deadline',
        message: 'The operation requires a finite start time and a positive deadline duration.',
      },
    };
  }
  const duration = input.deadlineMs;
  return {
    accepted: true,
    state: {
      phase: 'pending',
      operationId: input.operationId,
      startedAt: input.now,
      deadlineAt: input.now + duration,
      cancellable: input.cancellable ?? true,
      cancelRequested: false,
      progress: { completed: 0 },
    },
  };
}

export function updateOperationProgress(
  state: OperationState,
  progress: OperationProgress,
): OperationTransition {
  if (state.phase !== 'pending') {
    return { accepted: false, state, reason: { code: 'not-pending', message: 'No operation is currently running.' } };
  }
  const validCompleted = Number.isFinite(progress.completed) && progress.completed >= 0;
  const validTotal = progress.total === undefined || (Number.isFinite(progress.total) && progress.total >= progress.completed);
  if (!validCompleted || !validTotal) {
    return {
      accepted: false,
      state,
      reason: {
        code: 'invalid-progress',
        message: 'Progress must be non-negative, and completed work cannot exceed a reported total.',
      },
    };
  }
  return { accepted: true, state: { ...state, progress: { ...progress } } };
}

export function requestOperationCancellation(state: OperationState): OperationTransition {
  if (state.phase !== 'pending') {
    return { accepted: false, state, reason: { code: 'not-pending', message: 'No operation is currently running.' } };
  }
  if (!state.cancellable) {
    return {
      accepted: false,
      state,
      reason: {
        code: 'not-cancellable',
        message: 'This operation cannot be cancelled after it starts.',
        recoveryAction: 'Wait for the operation to finish.',
      },
    };
  }
  return { accepted: true, state: { ...state, cancelRequested: true } };
}

function settleOperation(
  state: OperationState,
  phase: Extract<OperationPhase, 'succeeded' | 'failed' | 'cancelled' | 'timed-out'>,
  now: number,
  error?: string,
): OperationTransition {
  if (state.phase !== 'pending') {
    return { accepted: false, state, reason: { code: 'not-pending', message: 'No operation is currently running.' } };
  }
  return {
    accepted: true,
    state: { ...state, phase, finishedAt: now, error, cancellable: false },
  };
}

export function completeOperation(state: OperationState, now: number): OperationTransition {
  return settleOperation(state, 'succeeded', now);
}

export function failOperation(state: OperationState, now: number, error: string): OperationTransition {
  return settleOperation(state, 'failed', now, error || 'No error detail was reported.');
}

export function cancelOperation(state: OperationState, now: number): OperationTransition {
  if (state.phase === 'pending' && !state.cancellable) {
    return {
      accepted: false,
      state,
      reason: {
        code: 'not-cancellable',
        message: 'This operation cannot be cancelled after it starts.',
        recoveryAction: 'Wait for the operation to finish.',
      },
    };
  }
  if (state.phase === 'pending' && !state.cancelRequested) {
    return {
      accepted: false,
      state,
      reason: {
        code: 'cancellation-not-requested',
        message: 'Cancellation has not been requested for this operation.',
      },
    };
  }
  return settleOperation(state, 'cancelled', now);
}

/** Mark a deadline once. Calling before the deadline is a refusal, not a premature timeout. */
export function expireOperation(state: OperationState, now: number): OperationTransition {
  if (state.phase !== 'pending') {
    return { accepted: false, state, reason: { code: 'not-pending', message: 'No operation is currently running.' } };
  }
  if (state.deadlineAt !== undefined && now < state.deadlineAt) {
    return {
      accepted: false,
      state,
      reason: {
        code: 'deadline-not-reached',
        message: 'The operation deadline has not been reached.',
      },
    };
  }
  return settleOperation(state, 'timed-out', now, 'The operation did not finish before its deadline.');
}

export interface PendingControlMetadata {
  disabled: boolean;
  reason?: string;
  reasonCode?: 'operation-pending' | 'cancellation-requested';
}

/** Metadata for the real submit control and any alternate keyboard submission route. */
export function pendingControlMetadata(state: OperationState): PendingControlMetadata {
  if (state.phase !== 'pending') return { disabled: false };
  if (state.cancelRequested) {
    return {
      disabled: true,
      reasonCode: 'cancellation-requested',
      reason: 'Cancellation is pending. Wait for the operation to stop.',
    };
  }
  return {
    disabled: true,
    reasonCode: 'operation-pending',
    reason: `${state.operationId ?? 'The operation'} is already running.`,
  };
}
