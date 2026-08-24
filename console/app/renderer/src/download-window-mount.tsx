import { useEffect, useState } from 'react';
import { DownloadStartSurface } from './download-start-surface';
import { DownloadProgressSurface } from './download-progress-surface';
import { DownloadCompleteSurface } from './download-complete-surface';
import type { DownloadTransferSnapshot, ExtensionDownloadHandoff } from '../../../shared/download-transfer';

export type DedicatedDownloadWindowKind = 'start' | 'progress' | 'complete';

export function dedicatedDownloadWindowKind(): DedicatedDownloadWindowKind | undefined {
  const value = new URLSearchParams(window.location.search).get('downloadWindow');
  return value === 'start' || value === 'progress' || value === 'complete' ? value : undefined;
}

export function DownloadWindowMount({ kind }: { kind: DedicatedDownloadWindowKind }) {
  const client = window.dingDesktop?.downloads;
  const query = new URLSearchParams(window.location.search);
  const boundHandoffId = query.get('downloadHandoffId') ?? undefined;
  const boundTransferId = query.get('downloadTransferId') ?? undefined;
  const [handoff, setHandoff] = useState<ExtensionDownloadHandoff | undefined>();
  const [transferId, setTransferId] = useState<string | undefined>();
  const [snapshot, setSnapshot] = useState<DownloadTransferSnapshot | undefined>();

  useEffect(() => {
    if (!client) return;
    if (kind === 'start') {
      const unsubscribe = client.onHandoff((next) => { if (!boundHandoffId || next.handoffId === boundHandoffId) setHandoff(next); });
      void client.listPendingHandoffs().then((handoffs) => setHandoff(handoffs.find((candidate) => !boundHandoffId || candidate.handoffId === boundHandoffId)));
      return unsubscribe;
    }
    if (!boundTransferId) return;
    void client.getSnapshot(boundTransferId).then((latest) => {
      if (!latest) return;
      setTransferId(latest.transferId);
      setSnapshot(latest);
    });
  }, [client, kind]);

  if (!client) return <section className="surface-mount-unavailable" role="status"><h2>Download window unavailable</h2><p>The privileged download bridge is not available.</p></section>;
  if (kind === 'start') {
    return handoff
      ? <DownloadStartSurface handoff={handoff} client={client} onClose={() => void client.closeWindow('start')} />
      : <section className="surface-mount-unavailable" role="status"><h2>Start download unavailable</h2><p>No browser-extension handoff has reached the privileged boundary.</p></section>;
  }
  if (kind === 'progress') {
    return transferId
      ? <DownloadProgressSurface client={client} transferId={transferId} initialSnapshot={snapshot} />
      : <section className="surface-mount-unavailable" role="status"><h2>Downloading unavailable</h2><p>No observed transfer snapshot is available.</p></section>;
  }
  return snapshot
    ? <DownloadCompleteSurface
      snapshot={snapshot}
      onRetry={() => { void client.command(snapshot.transferId, 'retry').then((receipt) => { if (receipt.accepted) void client.openWindow('progress'); }); }}
      onDiscard={() => { void client.command(snapshot.transferId, 'discard').then(() => void client.closeWindow('complete')); }}
      onDismiss={() => void client.closeWindow('complete')}
    />
    : <section className="surface-mount-unavailable" role="status"><h2>Download result unavailable</h2><p>No terminal transfer snapshot is available.</p></section>;
}
