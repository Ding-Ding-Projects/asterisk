/**
 * Public, secret-free contracts shared by hosted authentication clients and the
 * server. Password hashes, signing keys, session identifiers, and source addresses
 * never cross this boundary.
 */
export const HOSTED_AUTH_API_VERSION = 1 as const;

export type HostedAccountState = 'missing' | 'valid' | 'corrupt';

export interface HostedSessionStatus {
  apiVersion: typeof HOSTED_AUTH_API_VERSION;
  accountState: HostedAccountState;
  authenticated: boolean;
  username?: string;
  needsSetup: boolean;
  tlsEnabled: boolean;
  authTransportAllowed: boolean;
  plainHttpWarning?: string;
  recoveryMessage?: string;
}

export interface HostedSetupStatus {
  apiVersion: typeof HOSTED_AUTH_API_VERSION;
  accountState: HostedAccountState;
  needsSetup: boolean;
  tlsEnabled: boolean;
  authTransportAllowed: boolean;
  plainHttpWarning?: string;
  recoveryMessage?: string;
}

export interface HostedHealthStatus {
  apiVersion: typeof HOSTED_AUTH_API_VERSION;
  service: 'ding-pbx-console';
  status: 'ok' | 'degraded';
}

export interface HostedAuthMutationResult {
  ok: true;
  revokedSessions?: number;
}

export interface HostedAuthBridge {
  getSession(): Promise<HostedSessionStatus>;
  signOut(): Promise<HostedAuthMutationResult>;
  revokeAllSessions(): Promise<HostedAuthMutationResult>;
}

declare global {
  interface Window {
    /** Hosted-only authentication actions. Desktop builds intentionally omit it. */
    dingHostedAuth?: HostedAuthBridge;
  }
}

