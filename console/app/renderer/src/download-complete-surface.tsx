import type { DownloadTransferSnapshot } from '../../../shared/download-transfer';
import { formatBytes } from '../../../shared/download-transfer';

export interface DownloadCompleteSurfaceProps {
  snapshot: DownloadTransferSnapshot;
  onDismiss?: () => void;
}

function outcome(snapshot: DownloadTransferSnapshot): string {
  if (snapshot.status === 'completed') return `Download complete: ${snapshot.fileName} is at ${snapshot.destinationPath}.`;
  if (snapshot.status === 'partial') return `Download partially completed: ${snapshot.fileName} has ${formatBytes(snapshot.bytesTransferred)} at ${snapshot.destinationPath}.`;
  if (snapshot.status === 'cancelled') return `Download cancelled: ${snapshot.fileName} remains incomplete.`;
  if (snapshot.status === 'failed') return `Download failed: ${snapshot.error?.message ?? 'the transfer reported a failure'}.`;
  return `Download state: ${snapshot.status}.`;
}

/** A factual, non-blocking completion notification. The caller supplies the observed outcome. */
export function DownloadCompleteSurface({ snapshot, onDismiss }: DownloadCompleteSurfaceProps) {
  return (
    <aside className="download-surface download-complete-surface" role="status" aria-live="polite" aria-label="Download result" data-window-intent="always-on-top">
      <div className="download-complete-surface__icon" aria-hidden="true">{snapshot.status === 'completed' ? '✓' : '!'}</div>
      <div className="download-complete-surface__body">
        <p className="download-surface__eyebrow">Transfer result</p>
        <p>{outcome(snapshot)}</p>
        <p className="download-surface__hint">Observed at {snapshot.observedAt}. Unsaved work was not changed by this transfer.</p>
      </div>
      <button type="button" className="download-button download-button--quiet" onClick={onDismiss}>Dismiss</button>
    </aside>
  );
}
