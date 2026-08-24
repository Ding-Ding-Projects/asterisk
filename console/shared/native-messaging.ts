import type { ExtensionDownloadHandoff } from './download-transfer.js';

export const DOWNLOAD_EXTENSION_ID = 'dnpkplcgjmipnndmghkhljjoefjhidab';
export const DOWNLOAD_NATIVE_MESSAGE_LIMIT = 128 * 1024;

export interface NativeIngressConfig {
  schemaVersion: 1;
  pipeName: string;
  challenge: string;
  extensionId: typeof DOWNLOAD_EXTENSION_ID;
  executablePath: string;
  executableSha256: string;
  brokerPath: string;
  brokerSha256: string;
  secureHelperPath: string;
  secureHelperSha256: string;
  manifestPath: string;
  configPath: string;
}

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
