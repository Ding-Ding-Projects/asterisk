import { useEffect, useState } from 'react';
import type {
  DownloadCommand,
  DownloadTransferClient,
  DownloadTransferReceipt,
  DownloadTransferSnapshot,
} from '../../../shared/download-transfer';

export interface DownloadCommandState {
  command?: DownloadCommand;
  pending: boolean;
  error?: string;
  receipt?: DownloadTransferReceipt;
}

export function useDownloadSnapshot(
  client: DownloadTransferClient | undefined,
  transferId: string | undefined,
  initialSnapshot?: DownloadTransferSnapshot,
): DownloadTransferSnapshot | undefined {
  const [snapshot, setSnapshot] = useState<DownloadTransferSnapshot | undefined>(initialSnapshot);

  useEffect(() => {
    setSnapshot(initialSnapshot);
    if (!client || !transferId) return undefined;
    return client.subscribe(transferId, setSnapshot);
  }, [client, transferId, initialSnapshot]);

  return snapshot;
}

export function useDownloadCommand(client: DownloadTransferClient | undefined, transferId: string | undefined) {
  const [state, setState] = useState<DownloadCommandState>({ pending: false });
  const send = async (command: Exclude<DownloadCommand, 'start'>): Promise<DownloadTransferReceipt | undefined> => {
    if (!client || !transferId || state.pending) return undefined;
    setState({ pending: true, command });
    try {
      const receipt = await client.command(transferId, command);
      setState({ pending: false, command, receipt, error: receipt.accepted ? undefined : (receipt.detail ?? 'The transfer rejected this request.') });
      return receipt;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The transfer boundary did not answer.';
      setState({ pending: false, command, error: message });
      return undefined;
    }
  };
  return { state, send };
}
