import type {
  DisabledOperationReceipt,
  FailedOperationReceipt,
  OperationActionReference,
  OperationCapability,
  OperationItemOutcome,
  OperationObservation,
  OperationProgress,
  OperationReceipt,
  OperationRequest,
  OperationRetryReference,
  OperationUndoReference,
  PartialOperationReceipt,
  RefusedOperationReceipt,
  SuccessfulOperationReceipt,
  TimedOutOperationReceipt,
  UnavailableOperationReceipt,
  CancelledOperationReceipt,
} from '../../../shared/operations';
import { isObservedSuccess } from '../../../shared/operations';

export interface ReceiptContext {
  readonly receiptId: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly message: string;
  readonly progress?: OperationProgress;
  readonly itemOutcomes?: ReadonlyArray<OperationItemOutcome>;
}

export interface ObservedReceiptContext<TResult> extends ReceiptContext {
  readonly observation: OperationObservation<TResult>;
}

export interface FollowUpOperationContext {
  readonly operationId: string;
  readonly requestedAt: string;
  readonly deadlineAt: string;
  readonly cancellable: boolean;
}

/** Materializes Undo as a separate receipt-producing operation request. */
export function undoOperationRequest(
  undo: OperationUndoReference,
  context: FollowUpOperationContext,
): OperationRequest<{ readonly undo: OperationUndoReference }> {
  return {
    operationId: context.operationId,
    operationType: undo.kind === 'inverse-operation' ? undo.operationType : undo.restoreOperationType,
    idempotencyKey: undo.idempotencyKey,
    target: undo.target,
    payload: { undo },
    requestedAt: context.requestedAt,
    deadlineAt: context.deadlineAt,
    cancellable: context.cancellable,
    retryable: true,
  };
}

export function successfulReceipt<TPayload, TResult>(
  request: OperationRequest<TPayload>,
  context: ObservedReceiptContext<TResult>,
): SuccessfulOperationReceipt<TResult> {
  return {
    ...receiptBase(request, context),
    outcome: 'succeeded',
    observation: context.observation,
    undo: request.undo,
  };
}

export function partialReceipt<TPayload, TResult>(
  request: OperationRequest<TPayload>,
  context: ObservedReceiptContext<TResult>,
): PartialOperationReceipt<TResult> {
  return {
    ...receiptBase(request, context),
    outcome: 'partial',
    observation: context.observation,
    retry: request.retryable && request.retryIdempotencyKey
      ? retryReference(request, context.message, request.retryIdempotencyKey)
      : undefined,
    undo: request.undo,
  };
}

export function failedReceipt<TPayload>(
  request: OperationRequest<TPayload>,
  context: ReceiptContext & { readonly observation?: OperationObservation<unknown> },
): FailedOperationReceipt {
  return {
    ...receiptBase(request, context),
    outcome: 'failed',
    observation: context.observation,
    retry: request.retryable ? retryReference(request, context.message) : undefined,
  };
}

export function cancelledReceipt<TPayload>(
  request: OperationRequest<TPayload>,
  context: ReceiptContext & { readonly observation?: OperationObservation<unknown> },
): CancelledOperationReceipt {
  return {
    ...receiptBase(request, context),
    outcome: 'cancelled',
    observation: context.observation,
    retry: request.retryable ? retryReference(request, context.message) : undefined,
  };
}

export function timedOutReceipt<TPayload>(
  request: OperationRequest<TPayload>,
  context: ReceiptContext & { readonly observation?: OperationObservation<unknown> },
): TimedOutOperationReceipt {
  return {
    ...receiptBase(request, context),
    outcome: 'timed-out',
    observation: context.observation,
    retry: request.retryable ? retryReference(request, context.message) : undefined,
  };
}

export function refusedReceipt<TPayload>(
  request: OperationRequest<TPayload>,
  context: ReceiptContext,
): RefusedOperationReceipt {
  return { ...receiptBase(request, context), outcome: 'refused' };
}

export function unavailableReceipt<TPayload>(
  request: OperationRequest<TPayload>,
  context: ReceiptContext,
  recoveryAction?: OperationActionReference,
): UnavailableOperationReceipt {
  return { ...receiptBase(request, context), outcome: 'unavailable', recoveryAction };
}

export function disabledReceipt<TPayload>(
  request: OperationRequest<TPayload>,
  context: ReceiptContext,
  enableAction?: OperationActionReference,
): DisabledOperationReceipt {
  return { ...receiptBase(request, context), outcome: 'disabled', enableAction };
}

export function capabilityReceipt<TPayload>(
  request: OperationRequest<TPayload>,
  capability: Exclude<OperationCapability, { readonly state: 'available' }>,
  context: ReceiptContext,
): UnavailableOperationReceipt | DisabledOperationReceipt {
  return capability.state === 'unavailable'
    ? unavailableReceipt(request, context, capability.recoveryAction)
    : disabledReceipt(request, context, capability.enableAction);
}

export function retryReference<TPayload>(
  request: OperationRequest<TPayload>,
  reason: string,
  idempotencyKey: string = request.idempotencyKey,
): OperationRetryReference {
  return {
    priorOperationId: request.operationId,
    operationType: request.operationType,
    idempotencyKey,
    target: request.target,
    reason,
  };
}

export function receiptValidationProblem<TPayload, TResult>(
  request: OperationRequest<TPayload>,
  receipt: OperationReceipt<TResult>,
): string | undefined {
  if (!receipt.receiptId.trim()) return 'Runner returned no receipt id.';
  if (!receipt.message.trim()) return 'Runner returned an empty receipt message.';
  if (receipt.operationId !== request.operationId) return 'Receipt operation id does not match the request.';
  if (receipt.operationType !== request.operationType) return 'Receipt operation type does not match the request.';
  if (receipt.idempotencyKey !== request.idempotencyKey) return 'Receipt idempotency key does not match the request.';
  if (!targetsMatch(receipt.target, request.target)) {
    return 'Receipt target does not match the request.';
  }
  if (!Number.isFinite(Date.parse(receipt.startedAt)) || !Number.isFinite(Date.parse(receipt.completedAt))) {
    return 'Receipt timestamps are invalid.';
  }
  if (Date.parse(receipt.completedAt) < Date.parse(receipt.startedAt)) return 'Receipt completed before it started.';
  if (receipt.progress) {
    if (receipt.progress.operationId !== request.operationId) return 'Receipt progress belongs to another operation.';
    if (
      !Number.isFinite(receipt.progress.completed) ||
      !Number.isFinite(receipt.progress.total) ||
      receipt.progress.completed < 0 ||
      receipt.progress.total < 0 ||
      receipt.progress.completed > receipt.progress.total
    ) {
      return 'Receipt progress is outside its declared range.';
    }
    if (!receipt.progress.unit.trim() || !receipt.progress.message.trim()) return 'Receipt progress lacks a unit or message.';
    const progressObservedAt = Date.parse(receipt.progress.observedAt);
    if (!Number.isFinite(progressObservedAt)) return 'Receipt progress observation time is invalid.';
    if (progressObservedAt < Date.parse(receipt.startedAt) || progressObservedAt > Date.parse(receipt.completedAt)) {
      return 'Receipt progress observation time falls outside the operation interval.';
    }
  }
  if ((receipt.outcome === 'succeeded' || receipt.outcome === 'partial') && !isObservedSuccess(receipt)) {
    return 'A successful or partial receipt requires an observed effect.';
  }
  if (receipt.outcome === 'succeeded' || receipt.outcome === 'partial') {
    const observedAt = Date.parse(receipt.observation.observedAt);
    if (observedAt < Date.parse(receipt.startedAt) || observedAt > Date.parse(receipt.completedAt)) {
      return 'Receipt observation time falls outside the operation interval.';
    }
  }
  if (receipt.outcome === 'succeeded' && receipt.itemOutcomes.some((item) => item.status !== 'succeeded')) {
    return 'A successful receipt contains an item that did not succeed.';
  }
  const itemIds = receipt.itemOutcomes.map((item) => item.itemId);
  if (itemIds.some((id) => !id.trim()) || new Set(itemIds).size !== itemIds.length) {
    return 'Receipt item outcomes require unique non-empty ids.';
  }
  if (receipt.itemOutcomes.some((item) => !item.label.trim())) return 'Receipt item outcomes require labels.';
  if (receipt.outcome === 'partial' && receipt.itemOutcomes.length === 0) {
    return 'A partial receipt must describe per-item outcomes.';
  }
  if (receipt.outcome === 'partial' && !receipt.itemOutcomes.some((item) => item.status === 'succeeded')) {
    return 'A partial receipt must include at least one succeeded item.';
  }
  if (receipt.outcome === 'partial' && !receipt.itemOutcomes.some((item) => item.status !== 'succeeded')) {
    return 'A partial receipt must include at least one non-success item.';
  }
  return undefined;
}

export function replayReceipt<TPayload, TResult>(
  request: OperationRequest<TPayload>,
  receipt: OperationReceipt<TResult>,
  receiptId: string,
  completedAt: string,
): OperationReceipt<TResult> {
  return {
    ...receipt,
    receiptId,
    operationId: request.operationId,
    operationType: request.operationType,
    idempotencyKey: request.idempotencyKey,
    target: request.target,
    completedAt,
    message: `Reused observed receipt ${receipt.receiptId}. ${receipt.message}`,
    progress: receipt.progress ? { ...receipt.progress, operationId: request.operationId } : undefined,
    replayedFromReceiptId: receipt.receiptId,
  };
}

export function receiptMayBeReplayed(receipt: OperationReceipt<unknown>): boolean {
  return isObservedSuccess(receipt);
}

function receiptBase<TPayload>(request: OperationRequest<TPayload>, context: ReceiptContext) {
  return {
    receiptId: context.receiptId,
    operationId: request.operationId,
    operationType: request.operationType,
    idempotencyKey: request.idempotencyKey,
    target: request.target,
    startedAt: context.startedAt,
    completedAt: context.completedAt,
    message: context.message,
    progress: context.progress,
    itemOutcomes: context.itemOutcomes ?? [],
  };
}

function targetsMatch(left: OperationRequest['target'], right: OperationRequest['target']): boolean {
  if (left.targetType !== right.targetType || left.targetId !== right.targetId || left.label !== right.label) return false;
  if (left.affectedData.length !== right.affectedData.length) return false;
  return left.affectedData.every((datum, index) => {
    const other = right.affectedData[index];
    return datum.key === other.key && datum.label === other.label && datum.effect === other.effect;
  });
}
