/**
 * Maps design control ids (`g_console`, `q_strategy`, …) onto the real Asterisk
 * configuration keys they are supposed to represent.
 *
 * The generated `SCREENS` object in `./generated/console.tsx` declares which file each
 * screen edits and lists its controls, but the control ids are arbitrary design
 * identifiers with no connection to Asterisk's own configuration keys. This file is
 * that connection: a hand-checked table of bindings, each one justified against the
 * real sample files shipped in this checkout (`configs/samples/*.conf.sample`), plus
 * the pure functions that read a parsed file into control values and write control
 * changes back into a file without disturbing anything else in it.
 *
 * Coverage is intentionally partial. A control with no entry in `CONTROL_BINDINGS` is
 * left unmapped rather than guessed at — see `unmappedControls`. Guessing a key wrong
 * would silently steer a real telephone exchange; leaving a switch unconnected is
 * merely honest about what has not been wired up yet.
 */

import type { ConfigSection, ConfigValue } from './configuration';

/** The four value shapes a control can round-trip through Asterisk's own text format. */
export type ControlValueKind = 'boolean' | 'number' | 'string' | 'list';

export interface ControlBinding {
  /** The control id as it appears in a screen's `ctl(id, …)` call. */
  control: string;
  /** The `[section]` name in the target file. */
  section: string;
  /** The `key` within that section. */
  key: string;
  /** How the raw config string round-trips to and from the control's own value. */
  kind: ControlValueKind;
  /**
   * Set only for a boolean control whose real key has the opposite sense — e.g. the
   * control means "enabled" while the key is a `*_disable` flag. When true, the parsed
   * boolean is negated on read and negated again on write, so the control's own value
   * still means what its label says.
   */
  invert?: boolean;
}

const YES_VALUES = new Set(['yes', 'true', 'on', '1']);
const NO_VALUES = new Set(['no', 'false', 'off', '0']);

/** Asterisk spells booleans several ways across its sample files; accept them all. */
function parseAsteriskBoolean(raw: string): boolean | undefined {
  const v = raw.trim().toLowerCase();
  if (YES_VALUES.has(v)) return true;
  if (NO_VALUES.has(v)) return false;
  return undefined;
}

function formatAsteriskBoolean(value: boolean): string {
  return value ? 'yes' : 'no';
}

/** Asterisk's own list spelling: comma-separated, whitespace around commas ignored. */
function parseAsteriskList(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function formatAsteriskList(values: ReadonlyArray<unknown>): string {
  return values.map((v) => String(v).trim()).filter((v) => v.length > 0).join(',');
}

function parseAsteriskNumber(raw: string): number | undefined {
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Convert one raw config-file string into the shape a control of the given kind wants.
 * Returns `undefined` when the raw value cannot be interpreted as that kind at all
 * (an unrecognised boolean spelling, non-numeric text for a number, …) so callers can
 * tell "not set" from "set to something we cannot parse" if they need to.
 */
function fromRaw(raw: string, kind: ControlValueKind, invert: boolean | undefined): unknown {
  switch (kind) {
    case 'boolean': {
      const b = parseAsteriskBoolean(raw);
      if (b === undefined) return undefined;
      return invert ? !b : b;
    }
    case 'number':
      return parseAsteriskNumber(raw);
    case 'list':
      return parseAsteriskList(raw);
    case 'string':
    default:
      return raw;
  }
}

/** Convert a control's own value back into the string Asterisk itself would write. */
function toRaw(value: unknown, kind: ControlValueKind, invert: boolean | undefined): string | undefined {
  switch (kind) {
    case 'boolean': {
      if (typeof value !== 'boolean') return undefined;
      return formatAsteriskBoolean(invert ? !value : value);
    }
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? String(n) : undefined;
    }
    case 'list': {
      if (!Array.isArray(value)) return undefined;
      return formatAsteriskList(value);
    }
    case 'string':
    default:
      return value === undefined || value === null ? undefined : String(value);
  }
}

function b(control: string, section: string, key: string, invert?: boolean): ControlBinding {
  return invert ? { control, section, key, kind: 'boolean', invert } : { control, section, key, kind: 'boolean' };
}
function n(control: string, section: string, key: string): ControlBinding {
  return { control, section, key, kind: 'number' };
}
function s(control: string, section: string, key: string): ControlBinding {
  return { control, section, key, kind: 'string' };
}
function l(control: string, section: string, key: string): ControlBinding {
  return { control, section, key, kind: 'list' };
}

/**
 * Bindings, keyed by screen id. Every binding below is justified against a specific
 * `configs/samples/*.conf.sample` file in this checkout; the comment above each
 * screen's block names the sample(s) consulted.
 *
 * A screen not listed here (dash, live, canvas, cli, memory, sync, skills, hub, vocab,
 * ops, secrets, servers, notifications, history, arcade, customise, appearance, about,
 * trunkauth) either has no real Asterisk configuration file behind it (dashboard/live
 * data, dialplan canvas, console-internal settings) or its controls describe a shared
 * link/partner-request workflow (`trunkauth`) that has no key of its own in
 * `pjsip.conf` — nothing in those screens is mapped.
 */
export const CONTROL_BINDINGS: Readonly<Record<string, ReadonlyArray<ControlBinding>>> = {
  // configs/samples/pjsip.conf.sample — [endpoint] template (~line 648) and [aor]
  // template (~line 1255). e_callerid is left unmapped: the design's segmented
  // options (Allowed/Prohibited/Unavailable) do not match the real values Asterisk
  // accepts for `callerid_privacy` (e.g. `allowed_not_screened`), so writing the
  // design's own words back would corrupt the setting.
  endpoints: [
    s('e_transport', 'endpoint', 'transport'),
    s('e_context', 'endpoint', 'context'),
    b('e_trust', 'endpoint', 'trust_id_inbound'),
    b('e_direct', 'endpoint', 'direct_media'),
    b('e_symmetric', 'endpoint', 'rtp_symmetric'),
    b('e_forcerport', 'endpoint', 'force_rport'),
    b('e_rewrite', 'endpoint', 'rewrite_contact'),
    b('e_ice', 'endpoint', 'ice_support'),
    s('e_encryption', 'endpoint', 'media_encryption'),
    s('e_dtmf', 'endpoint', 'dtmf_mode'),
    l('e_codecs', 'endpoint', 'allow'),
    n('e_maxcontacts', 'aor', 'max_contacts'),
    n('e_qualify', 'aor', 'qualify_frequency'),
    n('e_expiry', 'aor', 'default_expiration'),
  ],

  // configs/samples/pjsip.conf.sample — [registration] template (~line 1522) for the
  // retry keys, [endpoint] template (~line 648) for send_pai/100rel. t_order (no key
  // holds a failover order list), t_from (no from-domain-source enum key) and
  // t_privacy (no privacy-header key with these exact values) are unmapped.
  trunks: [
    n('t_retry', 'registration', 'retry_interval'),
    n('t_forbidden', 'registration', 'forbidden_retry_interval'),
    n('t_fatal', 'registration', 'max_retries'),
    b('t_pai', 'endpoint', 'send_pai'),
    s('t_100rel', 'endpoint', '100rel'),
  ],

  // configs/samples/extensions.conf.sample has no keyed IVR-behaviour settings of this
  // shape — IVR menus are dialplan (priorities/applications), not `key = value` pairs.
  // Nothing on this screen is mapped.
  ivr: [],

  // configs/samples/queues.conf.sample — every one of these is documented directly
  // under [general], which queues.conf treats as the template a named queue section
  // inherits from. All twelve controls are justified.
  queues: [
    s('q_strategy', 'general', 'strategy'),
    n('q_timeout', 'general', 'timeout'),
    n('q_wrapup', 'general', 'wrapuptime'),
    n('q_retry', 'general', 'retry'),
    b('q_ringinuse', 'general', 'ringinuse'),
    s('q_autopause', 'general', 'autopause'),
    n('q_maxlen', 'general', 'maxlen'),
    n('q_service', 'general', 'servicelevel'),
    l('q_joinempty', 'general', 'joinempty'),
    l('q_leave', 'general', 'leavewhenempty'),
    n('q_periodic', 'general', 'announce-frequency'),
    b('q_position', 'general', 'announce-position'),
  ],

  // configs/samples/voicemail.conf.sample — all ten controls are documented under
  // [general] (some noted "per-mailbox only", still shown there as the general-level
  // default in the sample).
  voicemail: [
    b('v_attach', 'general', 'attach'),
    b('v_delete', 'general', 'delete'),
    s('v_format', 'general', 'format'),
    n('v_maxmsg', 'general', 'maxmsg'),
    n('v_maxsecs', 'general', 'maxsecs'),
    n('v_minsecs', 'general', 'minsecs'),
    b('v_review', 'general', 'review'),
    b('v_operator', 'general', 'operator'),
    b('v_envelope', 'general', 'envelope'),
    b('v_saycid', 'general', 'saycid'),
  ],

  // configs/samples/confbridge.conf.sample — [default_bridge] template (~line 181) and
  // [default_user] template (~line 18). c_announce (real key is a plain yes/no, the
  // design's segmented off/tone/name/count options do not match) and c_dtmf (no menu
  // key present in the sample) are unmapped.
  confbridge: [
    s('c_rate', 'default_bridge', 'internal_sample_rate'),
    s('c_mixing', 'default_bridge', 'mixing_interval'),
    s('c_video', 'default_bridge', 'video_mode'),
    b('c_denoise', 'default_user', 'denoise'),
    b('c_jitter', 'default_user', 'jitterbuffer'),
    b('c_talker', 'default_user', 'talk_detection_events'),
    n('c_max', 'default_bridge', 'max_members'),
    b('c_marked', 'default_user', 'wait_marked'),
    b('c_music', 'default_user', 'music_on_hold_when_empty'),
  ],

  // configs/samples/musiconhold.conf.sample — [default] template (~line 65). No
  // numeric announcement-interval or volume-trim key exists in this sample (its
  // `announcement=` is a sound-file name, not an interval), so h_announce and
  // h_volume are unmapped.
  moh: [
    s('h_mode', 'default', 'mode'),
    s('h_sort', 'default', 'sort'),
  ],

  // configs/samples/rtp.conf.sample — [general]. codecs.conf.sample has no [general]
  // section and no opus/ptime keys at all, so every k_* control is unmapped; only the
  // rtp.conf-backed controls (r_*) are bound. r_dtmf (no RFC2833 payload-type key) and
  // r_dtls (DTLS is negotiated per-endpoint in pjsip.conf, not in rtp.conf) are
  // unmapped.
  codecs: [
    n('r_start', 'general', 'rtpstart'),
    n('r_end', 'general', 'rtpend'),
    b('r_strict', 'general', 'strictrtp'),
    b('r_ice', 'general', 'icesupport'),
  ],

  // configs/samples/cdr.conf.sample [general] for the d_* controls;
  // configs/samples/cel.conf.sample [general] for the l_* controls. Both sample files
  // declare their own unrelated [general] section, and a ConfigValue for this
  // two-file screen has no per-file namespace to keep them apart in — so the CEL
  // keys are bound under the synthetic section name 'cel' here to avoid colliding
  // with cdr.conf's own [general]/enable. d_backend is unmapped: cdr.conf.sample has
  // no single key that selects a backend by name (a backend is chosen by which
  // per-backend section, e.g. [csv] or [odbc], is present and loaded).
  cdr: [
    b('d_enable', 'general', 'enable'),
    b('d_unanswered', 'general', 'unanswered'),
    b('d_congestion', 'general', 'congestion'),
    b('d_batch', 'general', 'batch'),
    n('d_size', 'general', 'size'),
    b('l_enable', 'cel', 'enable'),
    l('l_events', 'cel', 'events'),
    l('l_apps', 'cel', 'apps'),
    s('l_date', 'cel', 'dateformat'),
  ],

  // configs/samples/manager.conf.sample — [general] (the only section header the
  // sample declares; the read/write example at ~line 330 sits textually under it).
  // configs/samples/http.conf.sample — [general]. a_tlsport (no tlsbindport key in
  // http.conf.sample) and a_origin (no CORS/allowed-origins key) are unmapped; a_deny
  // is unmapped because the real `deny=` key takes a CIDR string, not a boolean.
  ami: [
    b('a_http', 'general', 'enabled'),
    n('a_port', 'general', 'bindport'),
    b('a_tls', 'general', 'tlsenable'),
    l('a_read', 'general', 'read'),
    l('a_write', 'general', 'write'),
    n('a_timeout', 'general', 'httptimeout'),
  ],

  // configs/samples/modules.conf.sample.
  modules: [
    b('mo_auto', 'modules', 'autoload'),
    l('mo_preload', 'modules', 'preload'),
    l('mo_noload', 'modules', 'noload'),
    b('mo_require', 'modules', 'require'),
  ],

  // configs/samples/logger.conf.sample — [general] for rotatestrategy/queue_log,
  // [logfiles] for the two level lists. g_verbose, g_colour, g_count and g_size have
  // no corresponding key in this sample (console verbosity is a CLI/asterisk.conf
  // setting, not a logger.conf key) and are unmapped.
  logger: [
    l('g_console', 'logfiles', 'console'),
    l('g_file', 'logfiles', 'messages'),
    s('g_rotate', 'general', 'rotatestrategy'),
    b('g_queue', 'general', 'queue_log'),
  ],

  // configs/samples/stir_shaken.conf.sample — [attestation] template (~line 128) and
  // [verification] template (~line 436). Both use `global_disable`, whose sense is the
  // opposite of the design's "enabled" switches, hence `invert`. s_acl, s_permit,
  // s_failban, s_bantime, s_guest, s_cert, s_method, s_verify, s_ciphers and
  // s_failaction have no matching key in acl.conf.sample or stir_shaken.conf.sample
  // with the same meaning and value set as the design control, and are unmapped —
  // most of acl.conf.sample's `permit=`/`deny=` entries live in a *named* ACL section
  // chosen dynamically by another control, which a static section binding cannot
  // follow without risking a write to the wrong ACL.
  security: [
    b('s_stir', 'attestation', 'global_disable', true),
    s('s_level', 'attestation', 'attest_level'),
    b('s_verifyin', 'verification', 'global_disable', true),
  ],
};

function bindingsFor(screen: string): ReadonlyArray<ControlBinding> {
  return CONTROL_BINDINGS[screen] ?? [];
}

/** Pulls the real values out of a parsed file, keyed by control id. */
export function readControlValues(screen: string, value: ConfigValue | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!value) return out;
  for (const binding of bindingsFor(screen)) {
    const section = value.find((candidate) => candidate.name === binding.section);
    const entry = section?.entries.find((e) => e.key === binding.key);
    if (!entry) continue;
    const parsed = fromRaw(entry.value, binding.kind, binding.invert);
    if (parsed !== undefined) out[binding.control] = parsed;
  }
  return out;
}

/**
 * Returns a NEW ConfigValue with only the bound keys in `changes` updated. Every
 * unrelated section, key, entry order and repeated key is preserved exactly; a bound
 * key that does not yet exist is created (in its declared section, appended to that
 * section — creating the section too, appended to the file, if it is missing yet); a
 * control in `changes` with no binding for this screen is ignored, never written.
 */
export function applyControlValues(
  screen: string,
  current: ConfigValue,
  changes: Record<string, unknown>,
): ConfigValue {
  const bindings = bindingsFor(screen);
  if (bindings.length === 0) return current;

  // Work section-by-section so we can preserve ordering, repeated keys, and every
  // untouched entry exactly, only ever replacing the first matching entry for a key
  // (mirroring the "first match wins" read semantics `entryValue` already documents)
  // or appending a new one when the key is not present yet.
  const sections: ConfigSection[] = current.map((sec) => ({ name: sec.name, entries: [...sec.entries] }));

  for (const binding of bindings) {
    if (!(binding.control in changes)) continue;
    const raw = toRaw(changes[binding.control], binding.kind, binding.invert);
    if (raw === undefined) continue;

    let section = sections.find((sec) => sec.name === binding.section);
    if (!section) {
      section = { name: binding.section, entries: [] };
      sections.push(section);
    }

    const entries = section.entries as { key: string; value: string }[];
    const idx = entries.findIndex((e) => e.key === binding.key);
    if (idx === -1) {
      entries.push({ key: binding.key, value: raw });
    } else {
      entries[idx] = { key: binding.key, value: raw };
    }
  }

  return sections;
}

/** The controls on this screen with no real-key binding, so the UI can say so honestly. */
export function unmappedControls(screen: string): ReadonlyArray<string> {
  return SCREEN_CONTROL_IDS[screen]?.filter((id) => !bindingsFor(screen).some((b) => b.control === id)) ?? [];
}

/**
 * Every control id declared on each screen in the generated design, independent of
 * `CONTROL_BINDINGS`. Kept separate (rather than derived from the bindings table) so
 * `unmappedControls` reports the real remainder — a control this table does not know
 * about yet is simply absent from its result, never wrongly reported as mapped.
 */
const SCREEN_CONTROL_IDS: Readonly<Record<string, ReadonlyArray<string>>> = {
  live: ['m_spy', 'm_format', 'm_beep', 'm_retain'],
  endpoints: [
    'e_transport', 'e_context', 'e_callerid', 'e_trust',
    'e_direct', 'e_symmetric', 'e_forcerport', 'e_rewrite', 'e_ice', 'e_encryption', 'e_dtmf',
    'e_maxcontacts', 'e_qualify', 'e_expiry', 'e_codecs',
  ],
  trunks: ['t_retry', 't_forbidden', 't_fatal', 't_order', 't_from', 't_pai', 't_privacy', 't_100rel'],
  trunkauth: ['ta_auto', 'ta_expire', 'ta_notify', 'ta_mutual', 'ta_sign', 'ta_log'],
  ivr: ['i_timeout', 'i_retries', 'i_invalid', 'i_direct', 'i_lang', 'i_barge'],
  queues: [
    'q_strategy', 'q_timeout', 'q_wrapup', 'q_retry', 'q_ringinuse', 'q_autopause',
    'q_maxlen', 'q_service', 'q_joinempty', 'q_leave', 'q_periodic', 'q_position',
  ],
  voicemail: [
    'v_attach', 'v_delete', 'v_format', 'v_maxmsg', 'v_maxsecs', 'v_minsecs',
    'v_review', 'v_operator', 'v_envelope', 'v_saycid',
  ],
  confbridge: [
    'c_rate', 'c_mixing', 'c_video', 'c_denoise', 'c_jitter', 'c_talker',
    'c_max', 'c_marked', 'c_announce', 'c_music', 'c_dtmf',
  ],
  moh: ['h_mode', 'h_sort', 'h_announce', 'h_volume'],
  codecs: [
    'k_order', 'k_transcode', 'k_opusbr', 'k_ptime',
    'r_start', 'r_end', 'r_dtmf', 'r_strict', 'r_ice', 'r_dtls',
  ],
  cdr: [
    'd_enable', 'd_backend', 'd_unanswered', 'd_congestion', 'd_batch', 'd_size',
    'l_enable', 'l_events', 'l_apps', 'l_date',
  ],
  ami: ['a_http', 'a_port', 'a_tls', 'a_tlsport', 'a_origin', 'a_read', 'a_write', 'a_deny', 'a_timeout'],
  modules: ['mo_auto', 'mo_preload', 'mo_noload', 'mo_require'],
  logger: ['g_console', 'g_verbose', 'g_colour', 'g_file', 'g_rotate', 'g_count', 'g_size', 'g_queue'],
  security: [
    's_acl', 's_permit', 's_failban', 's_bantime', 's_guest', 's_cert', 's_method',
    's_verify', 's_ciphers', 's_stir', 's_level', 's_verifyin', 's_failaction',
  ],
};
