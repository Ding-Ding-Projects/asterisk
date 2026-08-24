import type { ExternalEditorStatus } from '../../../shared/control-plane';

export type EditorMutationOutcome =
  | { kind: 'success'; titleKey: string }
  | { kind: 'failure'; titleKey: string; detail: string };

/**
 * A status-returning mutation is successful only after the privileged operation
 * reaches its completed terminal state. Running, cancelled, failed, or missing
 * operation state must never be presented as a success notice.
 */
export function editorMutationOutcome(
  status: Pick<ExternalEditorStatus, 'operation'>,
  successKey: string,
  failureKey: string,
): EditorMutationOutcome {
  const operation = status.operation;
  if (operation?.state === 'completed') return { kind: 'success', titleKey: successKey };
  return { kind: 'failure', titleKey: failureKey, detail: operation?.message ?? '' };
}
