import type { PbxFeatureDefinition, PbxFeatureGroup } from './pbx-admin-model';

/**
 * Where each FreePBX-shaped feature belongs in the console's real navigation.
 *
 * `pbx-admin-model.ts`'s `group` field is a FreePBX menu category (Applications,
 * Connectivity, Administration, Reports, Settings) — that is provenance, not a Ding
 * rail. This file makes the actual placement decision: which of the console's real
 * rails (`pbx`, `media`, `data`, `sys` — see `generated/console.tsx`'s `RAIL` array)
 * a person configuring that capability would actually go looking under.
 *
 * A feature with `delegateScreen` set is not placed here at all: its capability
 * already has a real destination (Endpoints, Queues, Trunks, AMI, …), so it is merged
 * into that destination rather than growing a second page. `registerPbxAdminScreens`
 * does not create a screen for those features; `PBX_FEATURE_RAIL` therefore only
 * needs to cover the remainder.
 *
 * Every entry here is a judgement call, made explicit and reviewable rather than left
 * as an unstated default. The four rails and what each is for:
 *   - `pbx`   (Telephony)          — endpoints, routing and anything a call touches
 *                                    while it is in progress: dialplan, trunks, DIDs,
 *                                    queues, extensions, feature codes, access control.
 *   - `media` (Media & voice)      — codecs, RTP, recordings, prompts, TTS, MOH,
 *                                    conferencing, fax and voicemail (all audio paths).
 *   - `data`  (Records & APIs)     — CDR/CEL, reporting, and the machine interfaces
 *                                    (AMI/ARI/HTTP) used to read that data.
 *   - `sys`   (Runtime & security) — modules, logging, certificates, CLI, ACLs,
 *                                    console-user permissions, backup/restore of the
 *                                    whole configuration surface.
 *
 * `agent` and `app` (Agent global memory; Deploy & application) are not used here —
 * no FreePBX-shaped feature is about the agent-memory subsystem or standing up a new
 * server, so mapping anything onto them would be a worse fit than the four above.
 */
export type PbxRailId = 'pbx' | 'media' | 'data' | 'sys';

const GROUP_DEFAULT: Readonly<Record<PbxFeatureGroup, PbxRailId>> = {
  Applications: 'pbx',
  Connectivity: 'pbx',
  Administration: 'sys',
  Reports: 'data',
  Settings: 'pbx',
};

/**
 * Per-feature overrides where the group default is the wrong call. Each is annotated
 * with why: usually because the feature is really about audio/media, or about a
 * records/reporting surface, even though its FreePBX menu says otherwise.
 */
const OVERRIDE: Readonly<Partial<Record<string, PbxRailId>>> = {
  // Applications that are really about audio content, not call routing.
  'call-recording': 'media', // recording policy + feature codes for capturing audio
  conferences: 'media', // ConfBridge/MeetMe profiles are audio-mixing configuration
  'text-to-speech': 'media', // Festival TTS engine + dialplan use of it
  languages: 'media', // language-aware prompt/media selection
  'voicemail-blasting': 'media', // voicemail fan-out is a voicemail/media capability

  // Connectivity features that are about access policy rather than call routing.
  firewall: 'sys', // ACL + service-level access policy, same shelf as Firewall/ACLs
  'custom-contexts': 'sys', // PIN/time-gated access policy

  // Administration features that are actually media, records or telephony surfaces.
  'sound-languages': 'media',
  'system-recordings': 'media',
  'admin-voicemail': 'media',
  fax: 'media',
  'callerid-lookup': 'data', // HTTP lookup integration read as part of call records/CID data
  'cid-superfecta': 'data',
  'weak-password-detection': 'sys', // credential-policy review of auth objects, not a report
  'realtime': 'sys', // database/ODBC backend wiring for the whole install
  monitoring: 'sys', // Prometheus/SNMP telemetry export
  xmpp: 'sys', // messaging transport, adjacent to other runtime integrations
  adsi: 'pbx', // caller-display feature attached to the calling experience
  geolocation: 'pbx', // emergency location attached to outbound/inbound call handling
  phoneprov: 'sys', // handset provisioning, an install-time/runtime concern

  // Reports that are genuinely records/data surfaces (group default already correct;
  // 'fax' above is the one Reports-group exception, handled under Administration too).

  // Settings that are audio/media configuration rather than call-routing configuration.
  'fax-settings': 'media',
  filestore: 'media', // media storage roots
  'moh-settings': 'media',
  'tts-engines': 'media',
  'voicemail-admin': 'media',
  rtp: 'media',
  'logfile-settings': 'sys',
};

export function railForFeature(feature: Pick<PbxFeatureDefinition, 'id' | 'group'>): PbxRailId {
  return OVERRIDE[feature.id] ?? GROUP_DEFAULT[feature.group];
}

export const PBX_RAIL_IDS: ReadonlyArray<PbxRailId> = ['pbx', 'media', 'data', 'sys'];
