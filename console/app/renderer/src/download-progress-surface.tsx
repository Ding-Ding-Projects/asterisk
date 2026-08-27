import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { DownloadTransferClient, DownloadTransferSnapshot } from '../../../shared/download-transfer';
import { formatBytes, formatEta, formatRate } from '../../../shared/download-transfer';
import { useDownloadCommand, useDownloadSnapshot } from './download-state';

export interface DownloadProgressSurfaceProps {
  client: DownloadTransferClient;
  transferId: string;
  initialSnapshot?: DownloadTransferSnapshot;
  onComplete?: (snapshot: DownloadTransferSnapshot) => void;
}

function statusLabel(snapshot: DownloadTransferSnapshot): string {
  switch (snapshot.status) {
    case 'queued': return 'Queued';
    case 'downloading': return 'Downloading';
    case 'paused': return 'Paused';
    case 'completed': return 'Completed';
    case 'failed': return 'Failed';
    case 'cancelled': return 'Cancelled';
    case 'partial': return 'Partial result';
  }
}

/** A snapshot-driven progress surface. It never advances from a local timer. */
export function DownloadProgressSurface({ client, transferId, initialSnapshot, onComplete }: DownloadProgressSurfaceProps) {
  const snapshot = useDownloadSnapshot(client, transferId, initialSnapshot);
  const { state: commandState, send } = useDownloadCommand(client, transferId);

  useEffect(() => {
    if (snapshot && (snapshot.status === 'completed' || snapshot.status === 'failed' || snapshot.status === 'cancelled')) onComplete?.(snapshot);
  }, [onComplete, snapshot]);

  if (!snapshot) {
    return <section className="download-surface download-progress-surface" aria-live="polite"><p>Waiting for the transfer boundary to provide its first observation.</p></section>;
  }
  const percentage = snapshot.totalBytes && snapshot.totalBytes > 0
    ? Math.min(100, Math.max(0, (snapshot.bytesTransferred / snapshot.totalBytes) * 100))
    : undefined;
  const commandError = commandState.error;
  const action = (command: 'pause' | 'resume' | 'cancel' | 'retry' | 'discard') => { void send(command); };

  return (
    <section className="download-surface download-progress-surface" aria-labelledby="download-progress-title">
      <header className="download-surface__header">
        <div>
          <p className="download-surface__eyebrow">Downloading</p>
          <h1 id="download-progress-title">{snapshot.fileName}</h1>
        </div>
        <span className={`download-surface__state download-surface__state--${snapshot.status}`} role="status">{statusLabel(snapshot)}</span>
      </header>
      <p className="download-surface__source">From <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer">{snapshot.sourceUrl}</a> to <span>{snapshot.destinationPath}</span></p>
      <div className="download-progress" aria-label={percentage === undefined ? `Transferred ${formatBytes(snapshot.bytesTransferred)}; total size unknown` : `${Math.round(percentage)} percent transferred`}>
        <div className="download-progress__bar" style={{ '--download-progress': percentage === undefined ? '0%' : `${percentage}%` } as CSSProperties} />
      </div>
      <dl className="download-metrics" aria-live="polite">
        <div><dt>Transferred</dt><dd>{formatBytes(snapshot.bytesTransferred)}{snapshot.totalBytes === undefined ? '' : ` of ${formatBytes(snapshot.totalBytes)}`}</dd></div>
        <div><dt>Rate</dt><dd>{formatRate(snapshot.rateBytesPerSecond)}</dd></div>
        <div><dt>ETA</dt><dd>{formatEta(snapshot.etaSeconds)}</dd></div>
        <div><dt>Observed</dt><dd>{snapshot.observedAt}</dd></div>
      </dl>
      {snapshot.deadlineAt && <p className="download-surface__deadline">Transfer deadline: {snapshot.deadlineAt}. The client will report expiry; this surface does not infer it.</p>}
      {snapshot.error && <p className="download-surface__error" role="alert">{snapshot.error.message} {snapshot.error.retryable ? 'Retry is available.' : 'Retry is not available.'}</p>}
      {snapshot.resumeDisabledReason && <p className="download-surface__deadline" role="note">Pause and resume are unavailable: {snapshot.resumeDisabledReason}</p>}
      {snapshot.partial && <p className="download-surface__partial" role="status">Partial result: {formatBytes(snapshot.partial.bytesTransferred)} received. {snapshot.partial.reason} {snapshot.partial.canResume ? 'Resume is available.' : 'Resume is not available.'}</p>}
      {commandError && <p className="download-surface__error" role="alert">{commandError}</p>}
      {snapshot.cleanupCompleted === false && snapshot.cleanupError && <p className="download-surface__error" role="alert">Temporary-file cleanup needs attention: {snapshot.cleanupError.message}</p>}
      <div className="download-actions" aria-label="Transfer controls">
        {(snapshot.status === 'downloading' || snapshot.canPause) && <button type="button" className="download-button" disabled={commandState.pending || !snapshot.canPause} title={snapshot.resumeDisabledReason} onClick={() => action('pause')}>Pause</button>}
        {(snapshot.status === 'paused' || snapshot.status === 'partial' || snapshot.canResume) && <button type="button" className="download-button" disabled={commandState.pending || !snapshot.canResume} title={snapshot.resumeDisabledReason} onClick={() => action('resume')}>Resume</button>}
        {snapshot.canRetry && <button type="button" className="download-button" disabled={commandState.pending} onClick={() => action('retry')}>Retry</button>}
        {(snapshot.status === 'failed' || snapshot.status === 'partial' || snapshot.status === 'cancelled') && <button type="button" className="download-button" disabled={commandState.pending} onClick={() => action('discard')}>Discard</button>}
        {snapshot.canCancel && <button type="button" className="download-button download-button--danger" disabled={commandState.pending} onClick={() => action('cancel')}>Cancel</button>}
      </div>
      <p className="download-surface__hint">Controls send a real request and wait for the next observed snapshot. They never simulate progress.</p>
    </section>
  );
}
