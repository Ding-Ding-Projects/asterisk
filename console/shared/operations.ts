/**
 * Transport-safe operation contracts shared by the trusted process and renderer.
 *
 * An operation is successful only when its receipt carries an observation from the
 * component that applied the effect. Starting a path, sending a request, or choosing
 * an available capability is never itself success.
 */

export type OperationId = string;
export type OperationReceiptId = string;
export type IdempotencyKey = string;

export interface OperationActionReference {
  readonly actionId: string;
  readonly label: string;
  readonly destination: string;
}

export type OperationCapability =
  | { readonly state: 'available' }
  | {
      readonly state: 'unavailable';
      readonly reason: string;
      readonly recoveryAction?: OperationActionReference;
    }
  | {
      readonly state: 'disabled';
      readonly reason: string;
      readonly enableAction?: OperationActionReference;
    };

export interface AffectedDatum {
  /** Stable field or resource name, never a secret value. */
  readonly key: string;
  readonly label: string;
  /** Exact, redacted description of what will change. */
  readonly effect: string;
}

export interface OperationTarget {
  readonly targetType: string;
  readonly targetId: string;
  readonly label: string;
  readonly affectedData: ReadonlyArray<AffectedDatum>;
}

export interface InverseOperationReference {
  readonly kind: 'inverse-operation';
  readonly operationType: string;
  readonly target: OperationTarget;
  readonly idempotencyKey: IdempotencyKey;
}

export interface HistoryRevisionReference {
  readonly kind: 'history-revision';
  readonly historyId: string;
  readonly revision: string;
  readonly restoreOperationType: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly target: OperationTarget;
}

/** Undo is representable only when a real inverse or recorded revision exists. */
export type OperationUndoReference = InverseOperationReference | HistoryRevisionReference;

export interface OperationRetryReference {
  readonly priorOperationId: OperationId;
  readonly operationType: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly target: OperationTarget;
  readonly reason: string;
}

export interface OperationRequest<TPayload = unknown> {
  readonly operationId: OperationId;
  readonly operationType: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly target: OperationTarget;
  readonly payload: TPayload;
  readonly requestedAt: string;
  /** ISO-8601 instant after which the coordinator must stop waiting. */
  readonly deadlineAt: string;
  readonly cancellable: boolean;
  readonly retryable: boolean;
  /** A distinct key for a retry that targets unfinished work after a partial result. */
  readonly retryIdempotencyKey?: IdempotencyKey;
  readonly undo?: OperationUndoReference;
}

export interface OperationProgress {
  readonly operationId: OperationId;
  readonly completed: number;
  readonly total: number;
  readonly unit: string;
  readonly message: string;
  readonly observedAt: string;
}

export type OperationItemOutcomeStatus = 'succeeded' | 'failed' | 'skipped' | 'cancelled';

export interface OperationItemOutcome {
  readonly itemId: string;
  readonly label: string;
  readonly status: OperationItemOutcomeStatus;
  readonly reason?: string;
}

export interface OperationObservation<TResult = unknown> {
  /** Stable identity supplied by the component that observed the effect. */
  readonly observationId: string;
  readonly source: 'control-plane' | 'filesystem' | 'history' | 'renderer' | 'external-service';
  readonly observedAt: string;
  readonly summary: string;
  readonly result: TResult;
}

interface OperationReceiptBase {
  readonly receiptId: OperationReceiptId;
  readonly operationId: OperationId;
  readonly operationType: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly target: OperationTarget;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly message: string;
  readonly progress?: OperationProgress;
  readonly itemOutcomes: ReadonlyArray<OperationItemOutcome>;
  readonly retry?: OperationRetryReference;
  readonly undo?: OperationUndoReference;
  readonly replayedFromReceiptId?: OperationReceiptId;
}

export interface SuccessfulOperationReceipt<TResult = unknown> extends OperationReceiptBase {
  readonly outcome: 'succeeded';
  readonly observation: OperationObservation<TResult>;
}

export interface PartialOperationReceipt<TResult = unknown> extends OperationReceiptBase {
  readonly outcome: 'partial';
  /** Partial success still requires an observation of the effects that did land. */
  readonly observation: OperationObservation<TResult>;
}

export interface FailedOperationReceipt extends OperationReceiptBase {
  readonly outcome: 'failed';
  readonly observation?: OperationObservation<unknown>;
}

export interface CancelledOperationReceipt extends OperationReceiptBase {
  readonly outcome: 'cancelled';
  readonly observation?: OperationObservation<unknown>;
}

export interface TimedOutOperationReceipt extends OperationReceiptBase {
  readonly outcome: 'timed-out';
  readonly observation?: OperationObservation<unknown>;
}

export interface RefusedOperationReceipt extends OperationReceiptBase {
  readonly outcome: 'refused';
}

export interface UnavailableOperationReceipt extends OperationReceiptBase {
  readonly outcome: 'unavailable';
  readonly recoveryAction?: OperationActionReference;
}

export interface DisabledOperationReceipt extends OperationReceiptBase {
  readonly outcome: 'disabled';
  readonly enableAction?: OperationActionReference;
}

export type OperationReceipt<TResult = unknown> =
  | SuccessfulOperationReceipt<TResult>
  | PartialOperationReceipt<TResult>
  | FailedOperationReceipt
  | CancelledOperationReceipt
  | TimedOutOperationReceipt
  | RefusedOperationReceipt
  | UnavailableOperationReceipt
  | DisabledOperationReceipt;

export type OperationOutcome = OperationReceipt['outcome'];

export function isObservedSuccess<TResult>(
  receipt: OperationReceipt<TResult>,
): receipt is SuccessfulOperationReceipt<TResult> | PartialOperationReceipt<TResult> {
  return (
    (receipt.outcome === 'succeeded' || receipt.outcome === 'partial') &&
    receipt.observation.observationId.trim().length > 0 &&
    receipt.observation.summary.trim().length > 0 &&
    Number.isFinite(Date.parse(receipt.observation.observedAt))
  );
}

export function operationSucceeded<TResult>(receipt: OperationReceipt<TResult>): boolean {
  return receipt.outcome === 'succeeded' && isObservedSuccess(receipt);
}
