import type { ExtensionDownloadHandoff } from './download-transfer.js';

export const DOWNLOAD_EXTENSION_ID = 'dnpkplcgjmipnndmghkhljjoefjhidab';
export const DOWNLOAD_NATIVE_PIPE = '\\\\.\\pipe\\ding-pbx-download-ingress';
export const DOWNLOAD_NATIVE_MESSAGE_LIMIT = 128 * 1024;

export interface NativeDownloadIngressMessage {
  type: 'download-handoff';
  extensionId: typeof DOWNLOAD_EXTENSION_ID;
  handoff: ExtensionDownloadHandoff;
}

export function isNativeDownloadIngressMessage(value: unknown): value is NativeDownloadIngressMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<NativeDownloadIngressMessage>;
  return message.type === 'download-handoff' && message.extensionId === DOWNLOAD_EXTENSION_ID && Boolean(message.handoff) && typeof message.handoff === 'object';
}
