import { useState } from 'react';
import type {
  DownloadTransferClient,
  DownloadTransferReceipt,
  ExtensionDownloadHandoff,
} from '../../../shared/download-transfer';
import { formatBytes } from '../../../shared/download-transfer';
import './download-surfaces.css';

export interface DownloadStartSurfaceProps {
  handoff: ExtensionDownloadHandoff;
  client: DownloadTransferClient;
  onReceipt?: (receipt: DownloadTransferReceipt) => void;
  onClose?: () => void;
}

/** A real decision surface. Nothing is transferred until the user confirms. */
export function DownloadStartSurface({ handoff, client, onReceipt, onClose }: DownloadStartSurfaceProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const start = async () => {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      const receipt = await client.start(handoff);
      onReceipt?.(receipt);
      if (!receipt.accepted) setError(receipt.detail ?? 'The transfer was not accepted.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The transfer boundary did not answer.');
    } finally {
      setPending(false);
    }
  };

  const cancel = async () => {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      const receipt = await client.cancelHandoff(handoff.handoffId);
      onReceipt?.(receipt);
      if (receipt.accepted) onClose?.();
      else setError(receipt.detail ?? 'The transfer was not cancelled.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The transfer boundary did not answer.');
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      className="download-surface download-start-surface"
      aria-labelledby="download-start-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          void cancel();
        } else if (event.key === 'Enter' && event.target === event.currentTarget) {
          event.preventDefault();
          void start();
        }
      }}
    >
      <header className="download-surface__header">
        <div>
          <p className="download-surface__eyebrow">Start download</p>
          <h1 id="download-start-title">Review this download</h1>
        </div>
        <span className="download-surface__state">Waiting for confirmation</span>
      </header>
      <p className="download-surface__lede">Check the file, source, and destination before the transfer begins.</p>
      <dl className="download-facts">
        <div><dt>File</dt><dd>{handoff.fileName}</dd></div>
        <div><dt>Source</dt><dd><a href={handoff.sourceUrl} target="_blank" rel="noreferrer">{handoff.sourceUrl}</a></dd></div>
        <div><dt>Destination</dt><dd>{handoff.destinationPath}</dd></div>
        <div><dt>Size</dt><dd>{formatBytes(handoff.totalBytes)}</dd></div>
      </dl>
      <p className="download-surface__unsaved" role="note">
        Unsaved work: {handoff.unsavedWork.state === 'pending'
          ? `pending — ${handoff.unsavedWork.detail ?? 'the transfer will not discard it'}`
          : handoff.unsavedWork.state === 'preserved'
            ? `preserved${handoff.unsavedWork.detail ? ` — ${handoff.unsavedWork.detail}` : ''}`
            : 'none reported; the transfer does not modify open work'}
      </p>
      {error && <p className="download-surface__error" role="alert">{error}</p>}
      <div className="download-actions" aria-label="Download decision">
        <button type="button" className="download-button download-button--primary" disabled={pending} onClick={() => void start()}>
          {pending ? 'Waiting for transfer boundary…' : 'Confirm download'}
        </button>
        <button type="button" className="download-button" disabled={pending} onClick={() => void cancel()}>
          Cancel
        </button>
      </div>
      <p className="download-surface__hint">Enter confirms. Escape cancels and returns focus to the originating control.</p>
    </section>
  );
}
