import type {
  OperationCapability,
  OperationProgress,
  OperationReceipt,
  OperationRequest,
} from '../../../shared/operations';
import {
  cancelledReceipt,
  capabilityReceipt,
  failedReceipt,
  receiptMayBeReplayed,
  receiptValidationProblem,
  refusedReceipt,
  replayReceipt,
  timedOutReceipt,
} from './operation-receipts';

export interface OperationProgressUpdate {
  readonly completed: number;
  readonly total: number;
  readonly unit: string;
  readonly message: string;
}

export interface OperationRunContext {
  readonly signal: AbortSignal;
  reportProgress(update: OperationProgressUpdate): void;
}

export type OperationRunner<TPayload, TResult> = (
  request: OperationRequest<TPayload>,
  context: OperationRunContext,
) => Promise<OperationReceipt<TResult>>;

export type OperationCoordinatorEvent =
  | { readonly type: 'pending'; readonly operationId: string; readonly idempotencyKey: string }
  | { readonly type: 'progress'; readonly progress: OperationProgress }
  | { readonly type: 'settled'; readonly receipt: OperationReceipt<unknown> };

export interface OperationCoordinatorOptions {
  readonly now?: () => Date;
  readonly idFactory?: () => string;
}

interface PendingOperation {
  readonly operationId: string;
  readonly idempotencyKey: string;
  readonly cancellable: boolean;
  readonly abortController: AbortController;
  cancellationReason?: string;
  latestProgress?: OperationProgress;
}

/**
 * Coordinates deadlines, re-entry refusal, cancellation, progress, receipts, and
 * idempotent replay. It never turns the selected execution path into success.
 */
export class OperationCoordinator {
  private readonly pending = new Map<string, PendingOperation>();
  private readonly observedReceipts = new Map<string, OperationReceipt<unknown>>();
  private readonly listeners = new Set<(event: OperationCoordinatorEvent) => void>();
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: OperationCoordinatorOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
  }

  subscribe(listener: (event: OperationCoordinatorEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isPending(operationId: string): boolean {
    return [...this.pending.values()].some((operation) => operation.operationId === operationId);
  }

  pendingOperationIds(): string[] {
    return [...this.pending.values()].map((operation) => operation.operationId);
  }

  cancel(operationId: string, reason = 'Cancellation requested by the user.'): boolean {
    const pending = [...this.pending.values()].find((operation) => operation.operationId === operationId);
    if (!pending || !pending.cancellable) return false;
    pending.cancellationReason = reason;
    pending.abortController.abort(reason);
    return true;
  }

  async execute<TPayload, TResult>(
    request: OperationRequest<TPayload>,
    capability: OperationCapability,
    runner: OperationRunner<TPayload, TResult>,
  ): Promise<OperationReceipt<TResult>> {
    const startedAt = this.now().toISOString();
    const requestProblem = validateRequest(request);
    if (requestProblem) {
      return this.settle(refusedReceipt(request, {
        receiptId: this.idFactory(),
        startedAt,
        completedAt: this.now().toISOString(),
        message: requestProblem,
      }));
    }

    const key = operationKey(request);
    const duplicateOperationId = [...this.pending.values()].find(
      (operation) => operation.operationId === request.operationId,
    );
    if (duplicateOperationId) {
      return this.settle(refusedReceipt(request, {
        receiptId: this.idFactory(),
        startedAt,
        completedAt: this.now().toISOString(),
        message: `Operation id ${request.operationId} is already pending. Duplicate submission was refused.`,
        progress: duplicateOperationId.latestProgress,
      }));
    }
    const observed = this.observedReceipts.get(key);
    if (observed) {
      return this.settle(replayReceipt(
        request,
        observed as OperationReceipt<TResult>,
        this.idFactory(),
        this.now().toISOString(),
      ));
    }

    const inFlight = this.pending.get(key);
    if (inFlight) {
      return this.settle(refusedReceipt(request, {
        receiptId: this.idFactory(),
        startedAt,
        completedAt: this.now().toISOString(),
        message: `Operation ${inFlight.operationId} already owns this idempotency key. Duplicate submission was refused.`,
        progress: inFlight.latestProgress,
      }));
    }

    if (capability.state !== 'available') {
      return this.settle(capabilityReceipt(request, capability, {
        receiptId: this.idFactory(),
        startedAt,
        completedAt: this.now().toISOString(),
        message: capability.reason,
      }));
    }

    const deadlineMs = Date.parse(request.deadlineAt);
    if (deadlineMs <= this.now().getTime()) {
      return this.settle(timedOutReceipt(request, {
        receiptId: this.idFactory(),
        startedAt,
        completedAt: this.now().toISOString(),
        message: `The deadline ${request.deadlineAt} passed before execution began.`,
      }));
    }

    const pending: PendingOperation = {
      operationId: request.operationId,
      idempotencyKey: request.idempotencyKey,
      cancellable: request.cancellable,
      abortController: new AbortController(),
    };
    this.pending.set(key, pending);
    this.emit({ type: 'pending', operationId: request.operationId, idempotencyKey: request.idempotencyKey });

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    type RaceResult =
      | { readonly kind: 'receipt'; readonly receipt: OperationReceipt<TResult> }
      | { readonly kind: 'error'; readonly error: unknown }
      | { readonly kind: 'timeout' };

    const runnerResult: Promise<RaceResult> = Promise.resolve()
      .then(() => runner(request, {
        signal: pending.abortController.signal,
        reportProgress: (update) => {
          const progress = createProgress(request.operationId, update, this.now().toISOString());
          pending.latestProgress = progress;
          this.emit({ type: 'progress', progress });
        },
      }))
      .then((receipt) => ({ kind: 'receipt', receipt } as const))
      .catch((error) => ({ kind: 'error', error } as const));

    const timeoutResult = new Promise<RaceResult>((resolve) => {
      timeoutHandle = setTimeout(() => {
        pending.abortController.abort('Operation deadline reached.');
        resolve({ kind: 'timeout' });
      }, Math.max(0, deadlineMs - this.now().getTime()));
    });

    let receipt: OperationReceipt<TResult>;
    try {
      const result = await Promise.race([runnerResult, timeoutResult]);
      if (result.kind === 'timeout') {
        receipt = timedOutReceipt(request, {
          receiptId: this.idFactory(),
          startedAt,
          completedAt: this.now().toISOString(),
          message: `The operation did not produce a terminal receipt before ${request.deadlineAt}.`,
          progress: pending.latestProgress,
        });
      } else if (result.kind === 'error') {
        if (pending.cancellationReason) {
          receipt = cancelledReceipt(request, {
            receiptId: this.idFactory(),
            startedAt,
            completedAt: this.now().toISOString(),
            message: pending.cancellationReason,
            progress: pending.latestProgress,
          });
        } else {
          receipt = failedReceipt(request, {
            receiptId: this.idFactory(),
            startedAt,
            completedAt: this.now().toISOString(),
            message: `The operation runner failed before returning a valid receipt: ${errorMessage(result.error)}`,
            progress: pending.latestProgress,
          });
        }
      } else {
        const problem = receiptValidationProblem(request, result.receipt);
        receipt = problem
          ? failedReceipt(request, {
              receiptId: this.idFactory(),
              startedAt,
              completedAt: this.now().toISOString(),
              message: `The operation runner returned an invalid receipt: ${problem}`,
              progress: pending.latestProgress,
            })
          : result.receipt;
      }

      if (receiptMayBeReplayed(receipt)) {
        this.observedReceipts.set(key, receipt as OperationReceipt<unknown>);
      }
      return this.settle(receipt);
    } finally {
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
      if (this.pending.get(key) === pending) this.pending.delete(key);
    }
  }

  private emit(event: OperationCoordinatorEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  private settle<TReceipt extends OperationReceipt<unknown>>(receipt: TReceipt): TReceipt {
    this.emit({ type: 'settled', receipt: receipt as OperationReceipt<unknown> });
    return receipt;
  }
}

function validateRequest<TPayload>(request: OperationRequest<TPayload>): string | undefined {
  if (!request.operationId.trim()) return 'Operation id is required.';
  if (!request.operationType.trim()) return 'Operation type is required.';
  if (!request.idempotencyKey.trim()) return 'Idempotency key is required.';
  if (!request.target.targetType.trim() || !request.target.targetId.trim() || !request.target.label.trim()) {
    return 'Operation target type, id, and label are required.';
  }
  if (request.target.affectedData.length === 0) return 'The request must name the affected data.';
  if (request.target.affectedData.some((datum) => !datum.key.trim() || !datum.label.trim() || !datum.effect.trim())) {
    return 'Every affected-data entry requires a key, label, and exact effect.';
  }
  if (new Set(request.target.affectedData.map((datum) => datum.key)).size !== request.target.affectedData.length) {
    return 'Affected-data keys must be unique within the target.';
  }
  if (!Number.isFinite(Date.parse(request.requestedAt))) return 'Requested time is invalid.';
  if (!Number.isFinite(Date.parse(request.deadlineAt))) return 'Deadline is invalid.';
  if (Date.parse(request.deadlineAt) < Date.parse(request.requestedAt)) return 'Deadline precedes the request time.';
  if (request.retryIdempotencyKey !== undefined) {
    if (!request.retryIdempotencyKey.trim()) return 'Retry idempotency key cannot be empty.';
    if (request.retryIdempotencyKey === request.idempotencyKey) return 'Retry idempotency key must differ from the original key.';
  }
  return undefined;
}

function operationKey<TPayload>(request: OperationRequest<TPayload>): string {
  return [request.operationType, request.target.targetType, request.target.targetId, request.idempotencyKey].join('\u001f');
}

function createProgress(operationId: string, update: OperationProgressUpdate, observedAt: string): OperationProgress {
  if (!Number.isFinite(update.completed) || !Number.isFinite(update.total)) throw new Error('Progress values must be finite.');
  if (update.completed < 0 || update.total < 0 || update.completed > update.total) {
    throw new Error('Progress must stay between zero and its total.');
  }
  if (!update.unit.trim() || !update.message.trim()) throw new Error('Progress requires a unit and message.');
  return { operationId, ...update, observedAt };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
