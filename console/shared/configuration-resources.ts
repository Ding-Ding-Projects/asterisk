import type { ControlPlaneAction } from './control-plane.js';

export type ConfigurationParserId = 'asterisk-ini';

export type HostCapabilityDescriptor =
  | { readonly state: 'available'; readonly action: ControlPlaneAction }
  | { readonly state: 'unavailable'; readonly reason: string };

export interface ConfigurationResourceDescriptor {
  readonly resource: `/etc/asterisk/${string}.conf`;
  readonly parser: ConfigurationParserId;
  readonly reader: HostCapabilityDescriptor;
  readonly planner: HostCapabilityDescriptor;
  readonly applier: HostCapabilityDescriptor;
}

const available = (action: ControlPlaneAction): HostCapabilityDescriptor => ({ state: 'available', action });

const resource = (name: string): ConfigurationResourceDescriptor => ({
  resource: `/etc/asterisk/${name}.conf`,
  parser: 'asterisk-ini',
  reader: available('pbx.config'),
  planner: available('pbx.plan'),
  applier: available('pbx.apply'),
});

/**
 * The configuration resources used by the compiled base screens. The list is explicit
 * so a display label can never become a path and a multi-file screen cannot collapse
 * unrelated `[general]` sections into one synthetic document.
 */
export const CONFIGURATION_RESOURCES = {
  pjsip: resource('pjsip'),
  extensions: resource('extensions'),
  queues: resource('queues'),
  voicemail: resource('voicemail'),
  confbridge: resource('confbridge'),
  musiconhold: resource('musiconhold'),
  codecs: resource('codecs'),
  rtp: resource('rtp'),
  cdr: resource('cdr'),
  cel: resource('cel'),
  manager: resource('manager'),
  ari: resource('ari'),
  http: resource('http'),
  modules: resource('modules'),
  logger: resource('logger'),
  acl: resource('acl'),
  stirShaken: resource('stir_shaken'),
} as const satisfies Readonly<Record<string, ConfigurationResourceDescriptor>>;

export type ConfigurationResource = (typeof CONFIGURATION_RESOURCES)[keyof typeof CONFIGURATION_RESOURCES]['resource'];

export const SCREEN_CONFIGURATION_RESOURCES: Readonly<Record<string, ReadonlyArray<ConfigurationResourceDescriptor>>> = {
  endpoints: [CONFIGURATION_RESOURCES.pjsip],
  trunks: [CONFIGURATION_RESOURCES.pjsip],
  trunkauth: [CONFIGURATION_RESOURCES.pjsip],
  canvas: [CONFIGURATION_RESOURCES.extensions],
  ivr: [CONFIGURATION_RESOURCES.extensions],
  queues: [CONFIGURATION_RESOURCES.queues],
  voicemail: [CONFIGURATION_RESOURCES.voicemail],
  confbridge: [CONFIGURATION_RESOURCES.confbridge],
  moh: [CONFIGURATION_RESOURCES.musiconhold],
  codecs: [CONFIGURATION_RESOURCES.codecs, CONFIGURATION_RESOURCES.rtp],
  cdr: [CONFIGURATION_RESOURCES.cdr, CONFIGURATION_RESOURCES.cel],
  ami: [CONFIGURATION_RESOURCES.manager, CONFIGURATION_RESOURCES.ari, CONFIGURATION_RESOURCES.http],
  modules: [CONFIGURATION_RESOURCES.modules],
  logger: [CONFIGURATION_RESOURCES.logger],
  security: [CONFIGURATION_RESOURCES.acl, CONFIGURATION_RESOURCES.stirShaken],
};

const unavailableCapability = (reason: string): HostCapabilityDescriptor => ({ state: 'unavailable', reason });

/** Missing descriptors fail closed instead of inheriting a nearby screen's host powers. */
export function configurationResourcesForScreen(screen: string): ReadonlyArray<ConfigurationResourceDescriptor> {
  return SCREEN_CONFIGURATION_RESOURCES[screen] ?? [];
}

export function hostCapabilityFor(
  resourcePath: string,
  capability: 'reader' | 'planner' | 'applier',
): HostCapabilityDescriptor {
  const descriptor = Object.values(CONFIGURATION_RESOURCES).find((candidate) => candidate.resource === resourcePath);
  return descriptor?.[capability] ?? unavailableCapability(`${resourcePath} has no declared ${capability} capability.`);
}
