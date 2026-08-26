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
  /**
   * Set only for a `string`-kind control whose own values do not literally match the
   * spelling Asterisk uses for the same setting (a segmented control showing "Reject"
   * where the real key wants `reject_request`, say). Maps the control's own value to
   * the raw Asterisk string on write, and the reverse on read. Deliberately explicit
   * rather than inferred — an enumeration that happened to coincide by accident is
   * exactly the kind of silent luck this table refuses to rely on.
   */
  valueMap?: Readonly<Record<string, string>>;
  /**
   * Set only when two controls share ONE Asterisk value that carries two things -- the
   * clearest case being `tlsbindaddr=address:port`, which the interface offers as an address
   * field and a port stepper because that is how a person thinks about it.
   *
   * `part` says which half this control owns. Reading takes that half; writing replaces that
   * half and leaves the other exactly as it was, so two controls can edit one line without
   * either erasing the other's work -- which is the whole reason this exists rather than
   * binding one of them and quietly dropping the other.
   */
  composite?: { separator: string; part: 'before' | 'after' };
  /**
   * Set when the section is identified by what it IS rather than by its name.
   *
   * pjsip.conf and its relatives name each section after the object it configures -- [6001],
   * [carrier-primary] -- and declare what it is inside, as `type=endpoint`. The headings that
   * look like section names in the sample file, `[endpoint]` and `[aor]`, are commented out:
   * they are documentation. A binding naming one of them matches nothing on any real file,
   * which is exactly what nineteen bindings here were doing.
   *
   * When this is set, `section` is ignored for matching and the first section declaring this
   * type is used instead.
   */
  sectionType?: string | ReadonlyArray<string>;
  /**
   * Set when the setting is expressed by the key being PRESENT rather than by its value.
   *
   * `deny=` is the clearest case: denying by default means a line carrying 0.0.0.0/0.0.0.0
   * exists, and not denying means there is no deny line at all. Writing `deny=no` is not the
   * off state -- it is a line Asterisk tries to read as a network and rejects.
   *
   * `whenPresent` is the value written for the true state; false removes the entry. Reading
   * treats a missing key as false rather than as nothing to report, which is the difference
   * between a switch that shows its real state and one that shows nothing until touched.
   */
  presence?: { whenPresent: string };
  /**
   * Set when the control's key lives in a different file from the one its screen edits.
   *
   * Logger verbosity is `verbose` in asterisk.conf's [options]; the logger screen edits
   * logger.conf. Global transcoding is `transcode_via_sln`, same place. Both were recorded
   * as unbindable when what was really true is that they are on a screen reading another
   * file.
   *
   * A bare filename, matched against the map of extra files a caller supplies. Never a path:
   * the resource that gets written is resolved by the caller from this name, so a separator
   * here could never become one.
   */
  file?: string;
  /**
   * Set when the key appears many times in one section rather than carrying a list.
   *
   * Asterisk writes an ACL as `permit=` once per network, in order, because the order
   * decides which rule wins. Reading collects every occurrence in file order; writing
   * replaces the whole run, since a list control means "these, in this order" and leaving
   * the old entries behind would combine two lists into one that permits more than either.
   */
  repeated?: true;
  /**
   * Set when the section is whichever one another control currently names.
   *
   * The security screen picks an ACL and then edits the networks inside it; acl.conf names
   * each ACL by its section, so the list belongs to the chosen one. Naming a fixed section
   * would have meant editing whichever ACL happened to be written here first, which is not
   * what the person picking one meant.
   *
   * The value of that control is used as the section name, so it is checked before use --
   * a name with a bracket in it would close the section early and put the rest somewhere
   * nobody intended.
   */
  sectionFrom?: string;
  /**
   * Set when the TYPE of object this screen edits is itself a choice.
   *
   * The IAX screen edits a peer, and iax.conf writes one as type=peer or type=friend
   * depending on whether it also receives calls. Its type picker was unbound because binding
   * it to the type key would let somebody change the type through the very match that found
   * the section. Driving the match instead is the honest version: choosing user makes the
   * screen edit user objects, which is what picking it means.
   */
  sectionTypeFrom?: string;
  /**
   * Set when one control is several keys to Asterisk.
   *
   * The conference announce picker is one setting to a person and two booleans in
   * confbridge.conf. Binding either alone would leave the other saying something different,
   * so this names what EVERY key it owns must say for each value the control can take.
   *
   * Reading finds the value whose keys all match; an arrangement matching none reads as
   * absent rather than as the nearest one, because somebody has set those keys by hand to a
   * combination this control cannot express and showing them the closest would misreport
   * what their bridge does.
   */
  multi?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

/** A section name that cannot break the file it is written into.
 *
 * `:` and `*` are both included for dundi.conf's own peer sections -- named after a
 * colon-separated entityid such as `[00:50:8B:F3:75:BB]` (dundi.conf.sample line 239), or
 * the literal `[*]` peer that matches any unspecified entity (line 288). Neither character
 * can break a `[name]` header or start a new section the way `[`, `]`, a newline or a
 * quote could, so widening the charset by exactly these two costs nothing for every
 * existing binding, none of which has ever used either. */
function usableSectionName(value: unknown): string | undefined {
  return typeof value === 'string' && /^(\*|[A-Za-z0-9:_-]{1,79})$/u.test(value) ? value : undefined;
}

/**
 * The first section declaring one of the wanted types, as a real config spells it.
 *
 * Several types can mean one thing to a person: an IAX peer is written type=peer or
 * type=friend depending on whether it also receives calls, and the screen that edits it does
 * not care which. Matching only one would leave half of real files unreadable.
 */
function sectionOfType(value: ConfigValue, wanted: string | ReadonlyArray<string>): ConfigSection | undefined {
  const types = new Set((typeof wanted === 'string' ? [wanted] : wanted).map((t) => t.toLowerCase()));
  return value.find((candidate) => candidate.entries.some(
    (entry) => entry.key === 'type' && types.has(entry.value.trim().toLowerCase()),
  ));
}

/** Splits a composite value into its two halves, tolerating a missing or malformed one. */
export function splitComposite(raw: string, separator: string): { before: string; after: string } {
  const at = raw.indexOf(separator);
  /* No separator means the whole value is the FIRST half. That is what Asterisk means by a
   * bare tlsbindaddr with no port, and treating it as the second half would silently move an
   * address into a port field. */
  if (at < 0) return { before: raw.trim(), after: '' };
  return { before: raw.slice(0, at).trim(), after: raw.slice(at + separator.length).trim() };
}

/** Puts one half back, keeping the other. */
export function joinComposite(
  existing: string,
  separator: string,
  part: 'before' | 'after',
  value: string,
): string {
  const halves = splitComposite(existing, separator);
  const next = part === 'before'
    ? { before: value.trim(), after: halves.after }
    : { before: halves.before, after: value.trim() };
  /* An empty other half is written without a dangling separator, because `0.0.0.0:` is not
   * a value Asterisk accepts and a half-filled line is worse than a short one. */
  if (next.before === '' && next.after === '') return '';
  if (next.after === '') return next.before;
  if (next.before === '') return `${separator}${next.after}`.replace(separator, '');
  return `${next.before}${separator}${next.after}`;
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
 * (an unrecognised boolean spelling, non-numeric text for a number, a raw value that
 * is not in `valueMap` at all, …) so callers can tell "not set" from "set to something
 * we cannot parse" if they need to.
 */
function fromRaw(
  raw: string,
  kind: ControlValueKind,
  invert: boolean | undefined,
  valueMap: Readonly<Record<string, string>> | undefined,
): unknown {
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
      if (!valueMap) return raw;
      // Reverse lookup: find the control-facing value whose mapped raw string matches.
      // A raw value the map does not know about is left unset rather than passed
      // through unmapped, which would silently show Asterisk's own spelling in a
      // control that only knows how to display and write the design's own words.
      for (const [controlValue, rawValue] of Object.entries(valueMap)) {
        if (rawValue === raw) return controlValue;
      }
      return undefined;
  }
}

/** Convert a control's own value back into the string Asterisk itself would write. */
function toRaw(
  value: unknown,
  kind: ControlValueKind,
  invert: boolean | undefined,
  valueMap: Readonly<Record<string, string>> | undefined,
): string | undefined {
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
    default: {
      if (value === undefined || value === null) return undefined;
      if (!valueMap) return String(value);
      // A control value with no entry in the map is refused rather than written
      // verbatim — writing the design's own word into Asterisk's config when it is
      // not one of the values Asterisk understands is exactly the invisible defect
      // this whole table exists to avoid.
      return Object.prototype.hasOwnProperty.call(valueMap, String(value))
        ? valueMap[String(value)]
        : undefined;
    }
  }
}

/** The same three helpers, for a section identified by its type rather than its name. */
function bt(control: string, type: string, key: string, invert?: boolean): ControlBinding {
  return { ...b(control, type, key, invert), sectionType: type };
}
function nt(control: string, type: string, key: string): ControlBinding {
  return { ...n(control, type, key), sectionType: type };
}
function st(control: string, type: string, key: string): ControlBinding {
  return { ...s(control, type, key), sectionType: type };
}
function lt(control: string, type: string, key: string): ControlBinding {
  return { ...l(control, type, key), sectionType: type };
}

/**
 * The same two helpers again, for a section named by ANOTHER control's own current
 * value (`sectionFrom`) rather than a literal name — the mechanism `s_permit`'s own
 * removal note above documented and left without a live user, and the PJSIP-transport
 * TLS bindings below are that user. `section` is required by `ControlBinding`'s own
 * type but is never consulted once `sectionFrom` is set; it is given the picking
 * control's id purely so a reader scanning the table sees at a glance which control
 * decides where a binding writes, rather than an empty string that answers nothing.
 */
function bFrom(control: string, sectionFrom: string, key: string, file?: string): ControlBinding {
  const base = { control, section: sectionFrom, sectionFrom, key, kind: 'boolean' as const };
  return file ? { ...base, file } : base;
}
function sFrom(control: string, sectionFrom: string, key: string, file?: string): ControlBinding {
  const base = { control, section: sectionFrom, sectionFrom, key, kind: 'string' as const };
  return file ? { ...base, file } : base;
}
/** The same, for a `number`-kind control -- res_odbc.conf's per-connection numeric
 *  settings (max_connections, connect_timeout, ...) need this and neither `bFrom` nor
 *  `sFrom` carries the right kind for them. */
function nFrom(control: string, sectionFrom: string, key: string, file?: string): ControlBinding {
  const base = { control, section: sectionFrom, sectionFrom, key, kind: 'number' as const };
  return file ? { ...base, file } : base;
}

function b(control: string, section: string, key: string, invert?: boolean, file?: string): ControlBinding {
  const base = invert ? { control, section, key, kind: 'boolean' as const, invert } : { control, section, key, kind: 'boolean' as const };
  return file ? { ...base, file } : base;
}
function n(control: string, section: string, key: string, file?: string): ControlBinding {
  const base = { control, section, key, kind: 'number' as const };
  return file ? { ...base, file } : base;
}
function s(control: string, section: string, key: string, file?: string): ControlBinding {
  const base = { control, section, key, kind: 'string' as const };
  return file ? { ...base, file } : base;
}
/** A `string`-kind binding whose control values do not literally match Asterisk's own
 *  spelling — see `ControlBinding.valueMap`. */
function sMapped(
  control: string,
  section: string,
  key: string,
  valueMap: Readonly<Record<string, string>>,
  file?: string,
): ControlBinding {
  const base = { control, section, key, kind: 'string' as const, valueMap };
  return file ? { ...base, file } : base;
}
function l(control: string, section: string, key: string, file?: string): ControlBinding {
  const base = { control, section, key, kind: 'list' as const };
  return file ? { ...base, file } : base;
}
/** `sFrom`, for a control whose own values do not literally match Asterisk's own
 *  spelling -- the `sectionFrom` equivalent of `sMapped`. Needed once a picked, named
 *  section (the Call attestation screen's own STIR/SHAKEN profile) carries a field the
 *  design shows in different words than the raw key wants, the same reason `sMapped`
 *  exists for a fixed section. */
function sFromMapped(
  control: string,
  sectionFrom: string,
  key: string,
  valueMap: Readonly<Record<string, string>>,
  file?: string,
): ControlBinding {
  const base = { control, section: sectionFrom, sectionFrom, key, kind: 'string' as const, valueMap };
  return file ? { ...base, file } : base;
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
  // configs/samples/iax.conf.sample. The section is matched by type, not by name: iax.conf
  // writes a peer as [guest] with type=user inside, the same shape pjsip uses. Both peer
  // and friend match, because an object that also receives calls is written type=friend and
  // this screen does not care which.
  //
  // ix_type stays unbound: it IS the discriminator, so binding it would let somebody change
  // the type through the match that found the section, after which the screen is editing
  // something it can no longer see. ix_secret_set stays unbound because it means "set a new
  // secret" rather than carrying one -- a secret must never travel through an ordinary
  // binding into renderer state, and from there into exports, history and screenshots.
  iaxpeers: [
    { ...st('ix_host', 'peer', 'host'), sectionType: ['peer', 'friend'], sectionTypeFrom: 'ix_type' },  // line 486 and others: host=
    { ...st('ix_username', 'peer', 'username'), sectionType: ['peer', 'friend'], sectionTypeFrom: 'ix_type' },  // username=
    { ...nt('ix_port', 'peer', 'port'), sectionType: ['peer', 'friend'], sectionTypeFrom: 'ix_type' },  // port= (IAX2 is 4569 by default)
    { ...st('ix_transfer', 'peer', 'transfer'), sectionType: ['peer', 'friend'], sectionTypeFrom: 'ix_type' },  // transfer= no/yes/mediaonly, matching the control
    { ...st('ix_qualify', 'peer', 'qualify'), sectionType: ['peer', 'friend'], sectionTypeFrom: 'ix_type' },  // qualify= yes, no, or a millisecond threshold
    { ...bt('ix_trunk', 'peer', 'trunk'), sectionType: ['peer', 'friend'], sectionTypeFrom: 'ix_type' },  // trunk=
    { ...st('ix_calltoken', 'peer', 'requirecalltoken'), sectionType: ['peer', 'friend'], sectionTypeFrom: 'ix_type' },  // requirecalltoken= no/yes/auto, matching the control
    { ...st('ix_context', 'peer', 'context'), sectionType: ['peer', 'friend'], sectionTypeFrom: 'ix_type' },  // context=
    { ...st('ix_accountcode', 'peer', 'accountcode'), sectionType: ['peer', 'friend'], sectionTypeFrom: 'ix_type' },  // accountcode=
    { ...st('ix_mailbox', 'peer', 'mailbox'), sectionType: ['peer', 'friend'], sectionTypeFrom: 'ix_type' },  // mailbox=
    { ...lt('ix_codecs', 'peer', 'allow'), sectionType: ['peer', 'friend'], sectionTypeFrom: 'ix_type' },  // allow=, written after disallow=all as the design says
  ],
  // configs/samples/chan_dahdi.conf.sample. Every key below lives in the [channels]
  // section, whose settings apply cumulatively to every "channel =>" directive that
  // follows -- so this table reads/writes the FIRST occurrence of each key (the same
  // "first match wins" rule `applyControlValues` already documents for every other
  // fixed-section binding), which is where installers conventionally put the shared
  // defaults, before any "channel =>" line. Adding or removing a channel span itself is
  // NOT expressible here (the key "channel" repeats, with a different value each time,
  // rather than carrying a list) -- App.tsx's onDahdiAddChannel/onDahdiRemoveChannel do
  // that directly against the parsed ConfigValue.
  dahdi: [
    s('da_context', 'channels', 'context'),  // line 56: context=public
    s('da_language', 'channels', 'language'),  // line 52: ;language=en
    s('da_switchtype', 'channels', 'switchtype'),  // line 68: ;switchtype=euroisdn
    s('da_signalling', 'channels', 'signalling'),  // line 514: ;signalling=fxo_ls
    b('da_usecallerid', 'channels', 'usecallerid'),  // line 576: usecallerid=yes
    b('da_busydetect', 'channels', 'busydetect'),  // line 1097: ;busydetect=yes
    s('da_echocancel', 'channels', 'echocancel'),  // line 873: echocancel=yes
    b('da_echocancelbridged', 'channels', 'echocancelwhenbridged'),  // line 888: echocancelwhenbridged=yes
    b('da_immediate', 'channels', 'immediate'),  // line 1014: ;immediate=yes
    s('da_rxgain', 'channels', 'rxgain'),  // line 949: ;rxgain=2.0
    s('da_txgain', 'channels', 'txgain'),  // line 950: ;txgain=3.0
    s('da_group', 'channels', 'group'),  // line 972: group=1
  ],
  // configs/samples/sla.conf.sample. attemptcallerid is the file's only [general] key
  // (line 10). Every trunk/station field is bound through sectionFrom, picked by the
  // name typed into sl_trunkname/sl_stationname, the same mechanism db_odbcname gives
  // res_odbc.conf's per-connection fields (see CONTROL_BINDINGS.dbrealtime below) --
  // sla.conf names each trunk and station after an arbitrary section, not a fixed one.
  // The station's own repeated "trunk=" assignment lines are NOT expressible here for
  // the same reason chan_dahdi's "channel =>" directives are not: App.tsx's
  // onSlaStationTrunkAdd/onSlaStationTrunkRemove edit those directly.
  sla: [
    b('sl_attemptcid', 'general', 'attemptcallerid'),  // line 10: ;attemptcallerid=no
    sFrom('sl_trunktype', 'sl_trunkname', 'type'),  // line 33: type=trunk
    sFrom('sl_trunkdevice', 'sl_trunkname', 'device'),  // line 35: device=DAHDI/3
    sFrom('sl_trunkautocontext', 'sl_trunkname', 'autocontext'),  // line 42: autocontext=line1
    sFrom('sl_trunkringtimeout', 'sl_trunkname', 'ringtimeout'),  // line 47: ;ringtimeout=30
    bFrom('sl_trunkbarge', 'sl_trunkname', 'barge'),  // line 50: ;barge=no
    sFrom('sl_trunkhold', 'sl_trunkname', 'hold'),  // line 54: ;hold=private (open/private)
    sFrom('sl_stationtype', 'sl_stationname', 'type'),  // line 85: type=station
    sFrom('sl_stationdevice', 'sl_stationname', 'device'),  // line 87: device=SIP/station1
    sFrom('sl_stationautocontext', 'sl_stationname', 'autocontext'),  // line 89: autocontext=sla_stations
    sFrom('sl_stationringtimeout', 'sl_stationname', 'ringtimeout'),  // line 94: ;ringtimeout=10
    sFrom('sl_stationringdelay', 'sl_stationname', 'ringdelay'),  // line 97: ;ringdelay=10
    sFrom('sl_stationhold', 'sl_stationname', 'hold'),  // line 100: ;hold=private (open/private)
  ],
  // configs/samples/dundi.conf.sample. The contact/network/query/outgoing-call fields
  // below all live in [general], checked per key against the sample. Peer fields are
  // bound through sectionFrom, picked by the entityid typed into du_peereid -- dundi.conf
  // names each peer's section after its own entityid, an arbitrary string, not a fixed
  // one. The [mappings] section is NOT expressible through this table at all: it varies
  // its KEY (the DUNDi context) rather than its section, the same shape
  // extconfig.conf's family mappings are (see the long comment above
  // CONTROL_BINDINGS.dbrealtime) -- App.tsx's du_map* handlers read/write it directly
  // through control-plane/realtime-mappings-model.ts's findEntry/writeEntry/removeEntry.
  dundi: [
    s('du_department', 'general', 'department'),  // line 15: ;department=Your Department
    s('du_organization', 'general', 'organization'),  // line 16: ;organization=Your Company, Inc.
    s('du_locality', 'general', 'locality'),  // line 17: ;locality=Your City
    s('du_stateprov', 'general', 'stateprov'),  // line 18: ;stateprov=ST
    s('du_country', 'general', 'country'),  // line 19: ;country=US
    s('du_email', 'general', 'email'),  // line 20: ;email=your@email.com
    s('du_phone', 'general', 'phone'),  // line 21: ;phone=+12565551212
    s('du_bindaddr', 'general', 'bindaddr'),  // line 29: ;bindaddr=0.0.0.0
    n('du_port', 'general', 'port'),  // line 30: ;port=4520
    s('du_tos', 'general', 'tos'),  // line 33: ;tos=ef
    s('du_entityid', 'general', 'entityid'),  // line 41: ;entityid=00:07:E9:3B:76:60
    n('du_cachetime', 'general', 'cachetime'),  // line 46: ;cachetime=3600
    n('du_ttl', 'general', 'ttl'),  // line 52: ttl=32
    s('du_autokill', 'general', 'autokill'),  // line 62: autokill=yes
    b('du_storehistory', 'general', 'storehistory'),  // line 77: ;storehistory=yes
    s('du_outgoingsiptech', 'general', 'outgoing_sip_tech'),  // line 83: ;outgoing_sip_tech=pjsip
    s('du_pjsipendpoint', 'general', 'pjsip_outgoing_endpoint'),  // line 89: ;pjsip_outgoing_endpoint=outgoing
    sFrom('du_peermodel', 'du_peereid', 'model'),  // line 240: model = symmetric
    sFrom('du_peerhost', 'du_peereid', 'host'),  // line 181: host - What their host is
    sFrom('du_peerport', 'du_peereid', 'port'),  // line 183: port - default 4520
    sFrom('du_peerinkey', 'du_peereid', 'inkey'),  // line 242: inkey = digium
    sFrom('du_peeroutkey', 'du_peereid', 'outkey'),  // line 243: outkey = misery
    sFrom('du_peerorder', 'du_peereid', 'order'),  // line 187-191: primary/secondary/tertiary/quartiary
    sFrom('du_peerinclude', 'du_peereid', 'include'),  // line 244: include = e164
    sFrom('du_peerpermit', 'du_peereid', 'permit'),  // line 245: permit = e164
    sFrom('du_peerdeny', 'du_peereid', 'deny'),  // line 207-209: deny -   Denies this peer
    sFrom('du_peerqualify', 'du_peereid', 'qualify'),  // line 246: qualify = yes
    bFrom('du_peerregister', 'du_peereid', 'register'),  // line 281: register = yes
    sFrom('du_peerprecache', 'du_peereid', 'precache'),  // line 267/279: precache = inbound/outbound
  ],
  // configs/samples/calendar.conf.sample. Every calendar is its own named [section] --
  // there is no [general] section in this file at all -- so every field is bound through
  // sectionFrom, picked by the name typed into ca_name, the same mechanism db_odbcname
  // gives res_odbc.conf. ca_secret carries NO binding, on purpose: a real account
  // password must never travel through an ordinary binding into renderer state, from
  // where an export, history entry or screenshot could reach it -- App.tsx takes it,
  // writes it once, and blanks the field in the same step, exactly like db_pgpassword
  // and iax.conf's ix_secret_set before it.
  calendar: [
    sFrom('ca_type', 'ca_name', 'type'),  // line 2: type = ical
    sFrom('ca_url', 'ca_name', 'url'),  // line 3: url = https://example.com/...
    sFrom('ca_user', 'ca_name', 'user'),  // line 4: user = jdoe
    sFrom('ca_refresh', 'ca_name', 'refresh'),  // line 6: refresh = 15
    sFrom('ca_timeframe', 'ca_name', 'timeframe'),  // line 7: timeframe = 60
    bFrom('ca_fetchagain', 'ca_name', 'fetch_again_at_reload'),  // line 9: fetch_again_at_reload = no
    sFrom('ca_autoreminder', 'ca_name', 'autoreminder'),  // line 25: autoreminder = 10
    sFrom('ca_channel', 'ca_name', 'channel'),  // line 27: channel = SIP/60001
    sFrom('ca_context', 'ca_name', 'context'),  // line 28: context = default
    sFrom('ca_extension', 'ca_name', 'extension'),  // line 29: extension = 123
    sFrom('ca_app', 'ca_name', 'app'),  // line 33: app = Playback
    sFrom('ca_appdata', 'ca_name', 'appdata'),  // line 34: appdata = tt-weasels
    sFrom('ca_waittime', 'ca_name', 'waittime'),  // line 36: waittime = 30
  ],
  // configs/samples/http.conf.sample — every key below is in [general] there, checked
  // by hand against the file in this checkout rather than taken from a proposal.
  // ht_tlsaddr and ht_tlsport are two halves of one Asterisk value: tlsbindaddr is
  // address:port (line 88 of the sample). Each owns its half and leaves the other alone on
  // write, so editing the port cannot erase the address.
  httpd: [
    b('ht_enabled', 'general', 'enabled'),  // line 29: ;enabled=yes
    s('ht_prefix', 'general', 'prefix'),  // line 45: ;prefix=asterisk
    b('ht_tlsenable', 'general', 'tlsenable'),  // line 87: ;tlsenable=yes
    s('ht_tlskey', 'general', 'tlsprivatekey'),  // line 91: ;tlsprivatekey=</path/to/private.pem>
    b('ht_notls1', 'general', 'tlsdisablev1'),  // line 112: ; tlsdisablev1=yes
    b('ht_notls11', 'general', 'tlsdisablev11'),  // line 113: ; tlsdisablev11=yes
    n('ht_sessinact', 'general', 'session_inactivity'),  // line 56: ;session_inactivity=30000
    n('ht_sesskeep', 'general', 'session_keep_alive'),
    s('ht_bindaddr', 'general', 'bindaddr'),  // line 35: bindaddr=127.0.0.1
    n('ht_bindport', 'general', 'bindport'),  // line 39: ;bindport=8088
    b('ht_static', 'general', 'enable_static'),  // line 68: ;enable_static=yes
    b('ht_status', 'general', 'enable_status'),  // line 74: ;enable_status=yes
    s('ht_tlscert', 'general', 'tlscertfile'),  // line 90: ;tlscertfile=</path/to/certificate.pem>
    b('ht_notls12', 'general', 'tlsdisablev12'),  // line 114: ; tlsdisablev12=yes
    n('ht_sesslimit', 'general', 'sessionlimit'),
    { control: 'ht_tlsaddr', section: 'general', key: 'tlsbindaddr', kind: 'string',
      composite: { separator: ':', part: 'before' } },
    { control: 'ht_tlsport', section: 'general', key: 'tlsbindaddr', kind: 'number',
      composite: { separator: ':', part: 'after' } },  // line 50: ;sessionlimit=100  // line 63: ;session_keep_alive=15000
  ],
  // configs/samples/features.conf.sample — the five transfer and parking codes live in
  // [featuremap] and the timeouts in [general]; both sections were confirmed per key,
  // because getting the section wrong writes a valid-looking line Asterisk ignores.
  //
  // The parking-lot controls below are a different file, stated explicitly per binding
  // exactly the way the security screen's stir_shaken.conf group is: features.conf.sample
  // says on its own line 5 "From Asterisk 12 - All parking lot configuration is now done
  // in res_parking.conf", and this checkout ships that sample too
  // (configs/samples/res_parking.conf.sample). fc_parkcall above is the DTMF trigger and
  // stays in features.conf's [featuremap] -- it is the lot's own behaviour (context,
  // timeout, extension range, retrieval rules) that moved, all of it in res_parking.conf's
  // [general] (parkeddynamic only) and [default] sections (the guaranteed lot every park
  // uses unless a channel names another, per the sample's own comment at line 42-46).
  fcodes: [
    s('fc_blindxfer', 'featuremap', 'blindxfer'),  // blind transfer, default #
    s('fc_atxfer', 'featuremap', 'atxfer'),  // attended transfer
    s('fc_disconnect', 'featuremap', 'disconnect'),  // disconnect, default *
    s('fc_automixmon', 'featuremap', 'automixmon'),  // one touch record
    s('fc_parkcall', 'featuremap', 'parkcall'),  // one step parking
    s('fc_atxferabort', 'general', 'atxferabort'),  // cancel the attended transfer
    s('fc_atxferthreeway', 'general', 'atxferthreeway'),  // complete and stay in the call
    s('fc_atxferswap', 'general', 'atxferswap'),  // swap to the other party
    s('fc_pickupexten', 'general', 'pickupexten'),  // pickup extension, default *8
    n('fc_featuredigittimeout', 'general', 'featuredigittimeout'),  // max ms between digits
    n('fc_transferdigittimeout', 'general', 'transferdigittimeout'),  // seconds between digits
    n('fc_atxfernoanswertimeout', 'general', 'atxfernoanswertimeout'),  // answer timeout, default 15s
    b('fc_atxferdropcall', 'general', 'atxferdropcall'),
    s('fc_atxfercomplete', 'general', 'atxfercomplete'),  // line 37: ;atxfercomplete = *2  // hang up before the target answers
    // res_parking.conf.sample from here down.
    b('fc_parkeddynamic', 'general', 'parkeddynamic', undefined, 'res_parking.conf'),  // line 2: ;parkeddynamic = yes, default no
    s('fc_parkext', 'default', 'parkext', 'res_parking.conf'),  // line 49: parkext => 700
    b('fc_parkext_exclusive', 'default', 'parkext_exclusive', undefined, 'res_parking.conf'),  // line 57: ;parkext_exclusive=yes, default no
    s('fc_parkpos', 'default', 'parkpos', 'res_parking.conf'),  // line 60: parkpos => 701-720
    s('fc_parkcontext', 'default', 'context', 'res_parking.conf'),  // line 65: context => parkedcalls
    n('fc_parkingtime', 'default', 'parkingtime', 'res_parking.conf'),  // line 70: ;parkingtime => 45
    s('fc_findslot', 'default', 'findslot', 'res_parking.conf'),  // line 134: ;findslot => next
    s('fc_parkedmusicclass', 'default', 'parkedmusicclass', 'res_parking.conf'),  // line 138: ;parkedmusicclass = default
    s('fc_courtesytone', 'default', 'courtesytone', 'res_parking.conf'),  // line 118: ;courtesytone = beep
    s('fc_parkedplay', 'default', 'parkedplay', 'res_parking.conf'),  // line 122: ;parkedplay = caller -- values parked/caller/both, same spelling as the segmented control
    s('fc_parkedcalltransfers', 'default', 'parkedcalltransfers', 'res_parking.conf'),  // line 125: ;parkedcalltransfers = caller -- values callee/caller/both/no, default no
    s('fc_parkedcallreparking', 'default', 'parkedcallreparking', 'res_parking.conf'),  // line 128: ;parkedcallreparking = caller -- same value set, default no
    s('fc_parkedcallhangup', 'default', 'parkedcallhangup', 'res_parking.conf'),  // line 131: ;parkedcallhangup = caller -- same value set, default no
    b('fc_comebacktoorigin', 'default', 'comebacktoorigin', undefined, 'res_parking.conf'),  // line 72: ;comebacktoorigin = yes, default yes
    n('fc_comebackdialtime', 'default', 'comebackdialtime', 'res_parking.conf'),  // line 109: ;comebackdialtime = 30
    s('fc_comebackcontext', 'default', 'comebackcontext', 'res_parking.conf'),  // line 114: ;comebackcontext = parkedcallstimeout
  ],
  // configs/samples/pjsip.conf.sample — [endpoint] template (~line 648) and [aor]
  // template (~line 1255). e_callerid is left unmapped: the design's segmented
  // options (Allowed/Prohibited/Unavailable) do not match the real values Asterisk
  // accepts for `callerid_privacy` (e.g. `allowed_not_screened`), so writing the
  // design's own words back would corrupt the setting.
  endpoints: [
    st('e_transport', 'endpoint', 'transport'),
    st('e_context', 'endpoint', 'context'),
    bt('e_trust', 'endpoint', 'trust_id_inbound'),
    bt('e_direct', 'endpoint', 'direct_media'),
    bt('e_symmetric', 'endpoint', 'rtp_symmetric'),
    bt('e_forcerport', 'endpoint', 'force_rport'),
    bt('e_rewrite', 'endpoint', 'rewrite_contact'),
    bt('e_ice', 'endpoint', 'ice_support'),
    st('e_encryption', 'endpoint', 'media_encryption'),
    st('e_dtmf', 'endpoint', 'dtmf_mode'),
    lt('e_codecs', 'endpoint', 'allow'),
    /* Seventeen more, each key read out of configs/samples/pjsip.conf.sample rather than
     * recalled: every one appears there, documented under the object type used below. That
     * check is what caught remove_existing -- it reads like an endpoint setting and is an AOR
     * key, and binding it to an endpoint would have written a line Asterisk quietly ignores
     * while the screen reported it as set. */
    nt('e_maxaudio', 'endpoint', 'max_audio_streams'),
    nt('e_maxvideo', 'endpoint', 'max_video_streams'),
    bt('e_optimistic', 'endpoint', 'media_encryption_optimistic'),
    /* no | yes | required | always -- the control's own options are the values Asterisk takes,
     * so this is a passthrough and not a translation table somebody has to keep in step. */
    st('e_timers', 'endpoint', 'timers'),
    nt('e_timers_min_se', 'endpoint', 'timers_min_se'),
    nt('e_timers_sess', 'endpoint', 'timers_sess_expires'),
    nt('e_rtp_timeout', 'endpoint', 'rtp_timeout'),
    nt('e_rtp_hold', 'endpoint', 'rtp_timeout_hold'),
    nt('e_busy_at', 'endpoint', 'device_state_busy_at'),
    bt('e_refer_blind', 'endpoint', 'refer_blind_progress'),
    bt('e_aggregate_mwi', 'endpoint', 'aggregate_mwi'),
    bt('e_mwi_replaces', 'endpoint', 'mwi_subscribe_replaces_unsolicited'),
    st('e_outbound_proxy', 'endpoint', 'outbound_proxy'),
    st('e_outbound_auth', 'endpoint', 'outbound_auth'),
    st('e_mailboxes', 'endpoint', 'mailboxes'),
    st('e_voicemail_ext', 'endpoint', 'voicemail_extension'),
    /* An AOR key, not an endpoint one, despite sitting on the endpoint screen -- the sample
     * documents it under [aor] and max_contacts beside it already binds the same way. */
    bt('e_removeexisting', 'aor', 'remove_existing'),
    nt('e_maxcontacts', 'aor', 'max_contacts'),
    nt('e_qualify', 'aor', 'qualify_frequency'),
    nt('e_expiry', 'aor', 'default_expiration'),
  ],

  // configs/samples/pjsip.conf.sample — [registration] template (~line 1522) for the
  // retry keys, [endpoint] template (~line 648) for send_pai/100rel. t_order (no key
  // holds a failover order list), t_from (no from-domain-source enum key) and
  // t_privacy (no privacy-header key with these exact values) are unmapped.
  trunks: [
    nt('t_retry', 'registration', 'retry_interval'),
    nt('t_forbidden', 'registration', 'forbidden_retry_interval'),
    nt('t_fatal', 'registration', 'max_retries'),
    bt('t_pai', 'endpoint', 'send_pai'),
    st('t_100rel', 'endpoint', '100rel'),
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
    // confbridge.conf.sample lines 50 and 156. One setting to a person, two booleans to
    // Asterisk, so both are written together: choosing count means announce the count AND do
    // not announce names, and writing only the first would leave the second contradicting it.
    { control: 'c_announce', section: 'default_user', key: 'announce_join_leave', kind: 'string',
      multi: {
        off: { announce_join_leave: 'no', announce_user_count: 'no' },
        name: { announce_join_leave: 'yes', announce_user_count: 'no' },
        count: { announce_join_leave: 'no', announce_user_count: 'yes' },
      } },
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

  // configs/samples/rtp.conf.sample — [general], now the codecs screen's own declared
  // `file` (it used to say 'codecs.conf · rtp.conf', a display label two filenames
  // joined for the reader; resourceForFile refuses that shape, so this screen had never
  // read anything -- see resource-for-file.test.tsx). codecs.conf.sample has no
  // [general] section at all, so k_order (no global codec-order key exists anywhere —
  // order is only ever set per-endpoint via pjsip.conf's `allow=`, already bound as
  // e_codecs) is unmapped. k_transcode is bound below, through asterisk.conf, not left
  // unmapped -- an earlier version of this comment said otherwise and was wrong; fixed
  // once its Save button actually made the wrong claim testable. k_opusbr
  // ("Opus bitrate", a kbps slider) looked bindable to codecs.conf.sample's commented
  // `;[opus]` template's `;bitrate=` line (~line 189) but is left unmapped on a second
  // look: that key's unit is bits per second, not kilobits (the sample documents "Any
  // value between 500 and 512000"), and this table has no supported way to scale a
  // number on write without silently mis-scaling a boolean/string/list control that
  // happens to share the 'number' kind elsewhere — writing the slider's raw kbps value
  // straight into `bitrate=` would set an opus bitrate a thousand times too low. k_ptime
  // ("Preferred ptime", one of '10'/'20'/'30'/'40'/'60') has no matching key either:
  // pjsip.conf's `use_ptime` (~line 748) is a yes/no switch for honoring the far end's
  // own requested packetisation, not a ptime value to set. r_dtmf (no RFC2833
  // payload-type key) and r_dtls (DTLS is negotiated per-endpoint in pjsip.conf, not in
  // rtp.conf) are unmapped.
  codecs: [
    // asterisk.conf.sample line 77: ;transcode_via_sln = yes, in [options]. Same story:
    // there is no global transcoding switch in codecs.conf, because it is not kept there.
    { control: 'k_transcode', section: 'options', key: 'transcode_via_sln', kind: 'boolean', file: 'asterisk.conf' },
    n('r_start', 'general', 'rtpstart'),
    n('r_end', 'general', 'rtpend'),
    b('r_strict', 'general', 'strictrtp'),
    b('r_ice', 'general', 'icesupport'),
  ],

  // configs/samples/cdr.conf.sample [general] (~line 10) for the d_* controls: enable
  // ~line 14, unanswered ~line 28, congestion ~line 33, batch ~line 72, size ~line 76.
  // d_backend is unmapped: cdr.conf.sample's own "CHOOSING A CDR BACKEND" section
  // (~line 100 onward) is explicit that there is no single key that selects one --
  // "you have to make sure either the right category is defined in this file, or that
  // the appropriate config file exists" ([csv] ~line 31, [radius] ~line 34, or a
  // separate cdr_odbc.conf/cdr_pgsql.conf/etc. file). d_status reports that honestly,
  // reading what is really configured (this file's own sections) against what the
  // target's running Asterisk has actually registered (`cdr show status`), rather than
  // pretending a single-key picker exists.
  //
  // This screen's own file is cdr.conf; cel.conf, cel_odbc.conf and cel_pgsql.conf are
  // secondary files read the same way pjsip.conf and stir_shaken.conf are on the
  // Security screen (see the `screen === 'security'` block in App.tsx and the matching
  // `screen === 'cdr'` block that reads them). Before this lane, cel.conf's own real
  // [general] section was bound under a synthetic 'cel' name to dodge a collision with
  // cdr.conf's [general] inside one combined (and, worse, non-existent — see the file
  // note on SCREENS.cdr — resource named "cdr.conf · cel.conf"). Now that the two files
  // are read as themselves, cel.conf's keys are bound to its own real section name.
  //
  // configs/samples/cel.conf.sample [general]: enable ~line 19, apps ~line 34, events
  // ~line 74, dateformat ~line 90.
  cdr: [
    b('d_enable', 'general', 'enable'),
    b('d_unanswered', 'general', 'unanswered'),
    b('d_congestion', 'general', 'congestion'),
    b('d_batch', 'general', 'batch'),
    n('d_size', 'general', 'size'),
    b('l_enable', 'general', 'enable', undefined, 'cel.conf'),
    l('l_events', 'general', 'events', 'cel.conf'),
    l('l_apps', 'general', 'apps', 'cel.conf'),
    s('l_date', 'general', 'dateformat', 'cel.conf'),

    // configs/samples/cel_odbc.conf.sample: [general]/show_user_defined ~line 6/10.
    // Everything else in that file is a per-context section ([first]/[second]/... in
    // the sample, ~line 83 onward) naming its own `connection=`/`table=` (~lines 84-85,
    // 88-89, 92-93) — there is no fixed section to bind those two keys to, the same
    // shape the Security screen's PJSIP-transport TLS fields are in, so l_octx names
    // the target `[section]` the same way s_transport does and l_oconn/l_otable read
    // and write whichever one is named there.
    b('l_oshow', 'general', 'show_user_defined', undefined, 'cel_odbc.conf'),
    sFrom('l_oconn', 'l_octx', 'connection', 'cel_odbc.conf'),
    sFrom('l_otable', 'l_octx', 'table', 'cel_odbc.conf'),

    // configs/samples/cel_pgsql.conf.sample [global] (~line 55): show_user_defined
    // ~line 58, usegmtime ~line 61, hostname ~line 64, port ~line 65, dbname ~line 66,
    // user ~line 67, table ~line 69, schema ~line 70, appname ~line 72. password
    // (~line 68) is deliberately unmapped: see unbound-controls.md — "a secret must
    // never travel through an ordinary binding, because it would be read into renderer
    // state and from there into exports, local history and screenshots."
    b('l_pshow', 'global', 'show_user_defined', undefined, 'cel_pgsql.conf'),
    b('l_pgmtime', 'global', 'usegmtime', undefined, 'cel_pgsql.conf'),
    s('l_phost', 'global', 'hostname', 'cel_pgsql.conf'),
    n('l_pport', 'global', 'port', 'cel_pgsql.conf'),
    s('l_pdb', 'global', 'dbname', 'cel_pgsql.conf'),
    s('l_puser', 'global', 'user', 'cel_pgsql.conf'),
    s('l_ptable', 'global', 'table', 'cel_pgsql.conf'),
    s('l_pschema', 'global', 'schema', 'cel_pgsql.conf'),
    s('l_papp', 'global', 'appname', 'cel_pgsql.conf'),
  ],

  // configs/samples/manager.conf.sample — [general] (the only section header the
  // sample declares; the read/write example at ~line 330 sits textually under it).
  // configs/samples/http.conf.sample — [general]. configs/samples/ari.conf.sample —
  // [general] (~line 1), which shares this screen's synthetic 'general' section
  // safely: none of its own keys collide by name with manager.conf's or http.conf's.
  // a_origin ("Allowed origins", a chip list) binds to ari.conf.sample's
  // `;allowed_origins=` (~line 5) — a second look found this; the first pass checked
  // only http.conf.sample, which genuinely has no CORS key, and missed that ari.conf
  // is one of this screen's declared files and does have one. a_tlsport (a discrete
  // numeric port) stays unmapped: http.conf.sample's only TLS bind setting is
  // `;tlsbindaddr=0.0.0.0:8089` (~line 89), a combined address:port string with no
  // separate port key this table's kinds can address without guessing where the colon
  // falls. a_deny is unmapped because the real `deny=` key takes a CIDR string, not a
  // boolean.
  ami: [
    // manager.conf.sample line 97: ;deny=0.0.0.0/0.0.0.0 -- denying by default is the LINE
    // existing, not a yes or a no, so the off state removes it. Writing deny=no would be a
    // line Asterisk tries to read as a network.
    { control: 'a_deny', section: 'general', key: 'deny', kind: 'boolean',
      presence: { whenPresent: '0.0.0.0/0.0.0.0' } },
    // manager.conf.sample line 34: ;tlsbindaddr=0.0.0.0:5039 -- address and port in one
    // value, the same shape as http.conf, so the port owns its half and leaves the address.
    { control: 'a_tlsport', section: 'general', key: 'tlsbindaddr', kind: 'number',
      composite: { separator: ':', part: 'after' } },
    b('a_http', 'general', 'enabled'),
    n('a_port', 'general', 'bindport'),
    b('a_tls', 'general', 'tlsenable'),
    l('a_read', 'general', 'read'),
    l('a_write', 'general', 'write'),
    n('a_timeout', 'general', 'httptimeout'),
    l('a_origin', 'general', 'allowed_origins'),
  ],

  // configs/samples/modules.conf.sample. main/loader.c's own loader_config_init reads
  // 'preload'/'load'/'require'/'noload' by walking every [modules] variable of that
  // exact name one at a time (v->value is ONE module per line, never split on a
  // comma) -- lines 42-44 show it directly: three separate `noload = res_hep*.so`
  // lines, not one comma-joined line. `l()` alone (a single key holding a
  // comma-separated value, the shape `entryValue`/`applyControlValues` use for
  // everything else that calls itself a "list") would therefore collapse a
  // multi-module chip selection into one line Asterisk reads as a single, nonexistent
  // module name -- so mo_preload/mo_noload/mo_require/mo_load below all also carry
  // `repeated: true`, which reads and writes one line per occurrence instead (see the
  // long comment on `ControlBinding.repeated`, written for acl.conf's `permit=`/`deny=`
  // and unused until now). mo_require used to be a plain boolean bound straight to
  // `require`, which is wrong the same way: the sample's own `;require = chan_pjsip.so`
  // (line 27) names a specific module to require, not a global switch, so the design's
  // control is now a chips list like preload/noload rather than a switch.
  modules: [
    b('mo_auto', 'modules', 'autoload'),
    { ...l('mo_preload', 'modules', 'preload'), repeated: true },
    { ...l('mo_noload', 'modules', 'noload'), repeated: true },
    { ...l('mo_require', 'modules', 'require'), repeated: true },
    // configs/samples/modules.conf.sample line 32: ;load = res_musiconhold.so -- forces
    // a specific module to load even with autoload off, same per-line shape as the three
    // above.
    { ...l('mo_load', 'modules', 'load'), repeated: true },
  ],

  // configs/samples/logger.conf.sample — [general] for rotatestrategy/queue_log,
  // [logfiles] for the two level lists. g_verbose, g_colour, g_count and g_size have
  // no corresponding key in this sample (console verbosity is a CLI/asterisk.conf
  // setting, not a logger.conf key) and are unmapped.
  logger: [
    // asterisk.conf.sample line 20: ;verbose = 3, in [options]. Verbosity is not a
    // logger.conf key at all -- this screen simply edits a different file from the one this
    // setting lives in.
    { control: 'g_verbose', section: 'options', key: 'verbose', kind: 'number', file: 'asterisk.conf' },
    l('g_console', 'logfiles', 'console'),
    // logger.conf.sample line 176: messages.log => notice,warning,error -- the KEY is
    // the literal channel name "messages.log", dot and all, not "messages". Binding to
    // 'messages' silently read and wrote nothing against a real target: the file was
    // never seeded (no key called that exists) and a write would have appended a
    // brand-new, wrong `messages =` line beside the real `messages.log =` one rather
    // than editing it. Found while wiring this screen's first Save button, which is
    // what made a wrong key finally testable instead of silently inert.
    l('g_file', 'logfiles', 'messages.log'),
    s('g_rotate', 'general', 'rotatestrategy'),
    b('g_queue', 'general', 'queue_log'),
  ],

  // configs/samples/stir_shaken.conf.sample — [attestation] template (~line 128) and
  // [verification] template (~line 436). Both use `global_disable`, whose sense is the
  // opposite of the design's "enabled" switches, hence `invert`. s_failaction ("On
  // verification failure": Continue/Tag/Reject) binds to the [verification] template's
  // `;failure_action=` (~line 441, `= reject_request`; also shown at ~line 504 under
  // the [myprofile] profile template) — a second look found this. The sample documents
  // the key's three real values directly: "continue" (request keeps processing),
  // "reject_request" (rejected outright with a SIP error) and
  // "continue_return_reason" (keeps processing but tells the caller why verification
  // failed via a SIP Reason header) — mapped explicitly below to Continue/Reject/Tag
  // respectively ("Tag" for continue_return_reason because tagging the response with a
  // Reason header, rather than rejecting or silently continuing, is what that value
  // does). All four now carry an explicit `file` override: the security screen's own
  // resource became `acl.conf` (see below) once the access-control-rules editor started
  // reading it as this screen's primary file, so these attestation/verification
  // settings — which have always lived in stir_shaken.conf, a different file — need
  // that stated rather than left to default to whatever the screen itself reads. Left
  // unmapped: s_aclname/s_action/s_spec (the "Add a rule" form below is navigation and
  // input for a NEW rule, exactly like the servers screen's sv_host/sv_user — writing
  // one of them into a key would put a control's current typed value where a setting
  // belongs, not persist the setting itself); s_failban/s_bantime (this console's own
  // auto-ban behaviour — no failban/bantime key exists in acl.conf.sample or anywhere
  // else Asterisk reads, because banning a repeat offender is not something Asterisk's
  // own ACL evaluation does). http.conf's own TLS settings are a separate screen,
  // `httpd`, bound further up this table (ht_tlscert etc.) — that "a screen this
  // console does not yet have" was true when written and is not any more.
  //
  // configs/samples/pjsip.conf.sample — the [transport] section's TLS-only options
  // (~line 1161 onward). A transport is named by its own section, never by `type`
  // alone (several transports can share `type=transport`), so these ten bind through
  // `sectionFrom: 's_transport'` — the section is whichever name is currently typed
  // into that control, exactly the mechanism `s_permit`'s own removal note above left
  // documented and unused until now. s_transport itself is not bound: like
  // s_aclname/s_action/s_spec above, it is a picker read straight out of state by
  // App.tsx's transport Load/Save actions, not a setting with a key of its own.
  // s_tprotocol/protocol — line 130 (`;protocol=udp    ;udp,tcp,tls,ws,wss,flow`),
  // and the dedicated `[transport-tls]` example at line 154 (`;protocol=tls`).
  // s_tcert/cert_file — description ~1176; example line 191 (`;cert_file=/path/to/mycert.crt`).
  // s_tprivkey/priv_key_file — description ~1190; example line 192 (`;priv_key_file=/path/to/mykey.key`).
  // s_tcalistfile/ca_list_file — description ~1170 (`;ca_list_file=`).
  // s_tcalistpath/ca_list_path — description ~1172 (`;ca_list_path=`).
  // s_tcipher/cipher — description ~1188; example line 158 (`;cipher=ADH-AES256-SHA,ADH-AES128-SHA`).
  // s_tmethod/method — description ~1189; example line 159 (`;method=tlsv1`) — the only
  // value the sample itself documents, which is why the control is free text rather
  // than a segmented list this table would otherwise be inventing.
  // s_tverifyclient/verify_client — description ~1194 (`;verify_client=`).
  // s_tverifyserver/verify_server — description ~1196 (`;verify_server=`).
  // s_treqclientcert/require_client_cert — description ~1198 (`;require_client_cert=`).
  //
  // configs/samples/stir_shaken.conf.sample — the STIR/SHAKEN KEY material, as
  // distinct from the policy switches above: the private key Asterisk signs with, and
  // the certificate-authority material it verifies incoming Identity headers against.
  // s_privkey/[attestation].private_key_file — description ~64; example line 130
  // (`;private_key_file = /var/lib/asterisk/keys/stir_shaken/tns/multi-tns-key.pem`).
  // s_certurl/[attestation].public_cert_url — description ~72; example line 131
  // (`;public_cert_url = https://example.com/tncerts/multi-tns-cert.pem`).
  // s_loadsyscerts/[verification].load_system_certs — description ~217; example
  // line 438 (`;load_system_certs = no`).
  // s_cafile/[verification].ca_file — description ~226 (`Path to a file containing
  // one or more CA certs in PEM format`; no separate example value in the sample's
  // own [verification] template, which shows ca_path instead — see s_capath below).
  // s_capath/[verification].ca_path — description ~236; example line 439
  // (`;ca_path = /var/lib/asterisk/keys/stir_shaken/verification_ca`). The sample
  // itself is explicit that ca_file and ca_path may both be set but at least one
  // MUST be, for verification to have anything to check against at all.
  // configs/samples/res_fax.conf.sample [general] for the fx_maxrate..fx_t38timeout
  // fields (the screen's own primary file, no `file:` override needed); the six
  // fx_udptl* fields are configs/samples/udptl.conf.sample [general] instead, stated
  // explicitly per binding the same way the security screen's stir_shaken.conf group
  // is -- both files declare their own [general], and res_fax.conf is what the screen
  // itself reads, so udptl.conf needs saying or these six would be read from the wrong
  // file. App.tsx fetches udptl.conf as a dedicated extra read (this screen's own
  // 'fax-udptl' key, mirroring the security screen's 'security-stir' one) and seeds it
  // through this same table via readControlValues's `elsewhere` map, since the generic
  // per-screen read path only ever supplies the screen's declared `file`.
  fax: [
    s('fx_maxrate', 'general', 'maxrate'),  // line 7: ;maxrate=14400 -- fastest modulation offered
    s('fx_minrate', 'general', 'minrate'),  // line 12: ;minrate=4800
    b('fx_statusevents', 'general', 'statusevents'),  // line 19: statusevents=yes as shipped (comment says default no)
    l('fx_modems', 'general', 'modems'),  // line 24: ;modems=v17,v27,v29
    b('fx_ecm', 'general', 'ecm'),  // line 28: ;ecm=yes, enabled by default
    n('fx_t38timeout', 'general', 't38timeout'),  // line 32: t38timeout=5000
    // configs/samples/udptl.conf.sample from here down -- the transport T.38 rides on.
    n('fx_udptlstart', 'general', 'udptlstart', 'udptl.conf'),  // line 8: udptlstart=4000
    n('fx_udptlend', 'general', 'udptlend', 'udptl.conf'),  // line 9: udptlend=4999
    b('fx_udptlchecksums', 'general', 'udptlchecksums', undefined, 'udptl.conf'),  // line 13: ;udptlchecksums=no
    n('fx_udptlfecentries', 'general', 'udptlfecentries', 'udptl.conf'),  // line 17: udptlfecentries = 3
    n('fx_udptlfecspan', 'general', 'udptlfecspan', 'udptl.conf'),  // line 21: udptlfecspan = 3
    b('fx_udptleven', 'general', 'use_even_ports', undefined, 'udptl.conf'),  // line 26: use_even_ports = no
  ],
  security: [
    b('s_stir', 'attestation', 'global_disable', true, 'stir_shaken.conf'),
    s('s_level', 'attestation', 'attest_level', 'stir_shaken.conf'),
    b('s_verifyin', 'verification', 'global_disable', true, 'stir_shaken.conf'),
    sMapped('s_failaction', 'verification', 'failure_action', {
      Continue: 'continue',
      Tag: 'continue_return_reason',
      Reject: 'reject_request',
    }, 'stir_shaken.conf'),
    sFrom('s_tprotocol', 's_transport', 'protocol', 'pjsip.conf'),
    sFrom('s_tcert', 's_transport', 'cert_file', 'pjsip.conf'),
    sFrom('s_tprivkey', 's_transport', 'priv_key_file', 'pjsip.conf'),
    sFrom('s_tcalistfile', 's_transport', 'ca_list_file', 'pjsip.conf'),
    sFrom('s_tcalistpath', 's_transport', 'ca_list_path', 'pjsip.conf'),
    sFrom('s_tcipher', 's_transport', 'cipher', 'pjsip.conf'),
    sFrom('s_tmethod', 's_transport', 'method', 'pjsip.conf'),
    bFrom('s_tverifyclient', 's_transport', 'verify_client', 'pjsip.conf'),
    bFrom('s_tverifyserver', 's_transport', 'verify_server', 'pjsip.conf'),
    bFrom('s_treqclientcert', 's_transport', 'require_client_cert', 'pjsip.conf'),
    s('s_privkey', 'attestation', 'private_key_file', 'stir_shaken.conf'),
    s('s_certurl', 'attestation', 'public_cert_url', 'stir_shaken.conf'),
    b('s_loadsyscerts', 'verification', 'load_system_certs', undefined, 'stir_shaken.conf'),
    s('s_cafile', 'verification', 'ca_file', 'stir_shaken.conf'),
    s('s_capath', 'verification', 'ca_path', 'stir_shaken.conf'),
  ],
  // configs/samples/stir_shaken.conf.sample — [profile] objects (description ~line
  // 468, example [myprofile] ~line 501). The Security screen's own s_* group above
  // already covers the file's two SINGLETON objects, [attestation] and [verification];
  // a profile is a THIRD, differently-shaped object -- arbitrarily many of them,
  // picked by name the same way the Security screen's own PJSIP-transport TLS fields
  // pick a transport (`sectionFrom`) -- named in an endpoint's own `stir_shaken_profile`
  // parameter in pjsip.conf (not bound here: that lives on the Endpoints screen).
  // `type=profile` itself is not a bound control -- App.tsx's onSaveStirShakenProfile
  // writes it directly, the same "not an operator choice, always this literal value"
  // shape `sectionType` already gives pjsip.conf's own [endpoint]/[aor] sections; see
  // the "type (required) ... Must be set to profile" note at line 471.
  // cs_behavior/endpoint_behavior — description ~line 473 (off/attest/verify/on,
  // default off); example line 503 (";endpoint_behavior = verify").
  // cs_failaction/failure_action — a profile's own override of the same key
  // description ~line 347 documents ("All of the verification parameters ... can be
  // set on a profile"); example override line 504
  // (";failure_action = continue_return_reason"). Same three-way valueMap as the
  // Security screen's own s_failaction above.
  // cs_level/attest_level — a profile's own override of the [attestation] object's
  // own key, description ~line 96 ("All parameters ... may be overridden in a
  // profile", line 51).
  // cs_privkey/private_key_file — override of the [attestation] object's own key,
  // description ~line 64.
  // cs_certurl/public_cert_url — override of the [attestation] object's own key,
  // description ~line 72.
  // cs_x5uacl/x5u_acl — override of the [verification] object's own key, description
  // ~line 423; example override line 505 (";x5u_acl = myacllist").
  // TN objects (per-telephone-number certificate overrides, ~line 156 onward) are
  // deliberately out of scope for this screen -- the design's own group description
  // says so; they are a fourth, yet again differently-named-and-shaped object
  // (`[<canonicalized-telephone-number>]`) this pass did not reach.
  stirshaken: [
    sFromMapped('cs_behavior', 'cs_profile', 'endpoint_behavior', {
      Off: 'off',
      Attest: 'attest',
      Verify: 'verify',
      On: 'on',
    }),
    sFromMapped('cs_failaction', 'cs_profile', 'failure_action', {
      Continue: 'continue',
      Tag: 'continue_return_reason',
      Reject: 'reject_request',
    }),
    sFrom('cs_level', 'cs_profile', 'attest_level'),
    sFrom('cs_privkey', 'cs_profile', 'private_key_file'),
    sFrom('cs_certurl', 'cs_profile', 'public_cert_url'),
    sFrom('cs_x5uacl', 'cs_profile', 'x5u_acl'),
  ],
  // configs/samples/geolocation.conf.sample — two object shapes, both named and
  // picked exactly the way the stir_shaken.conf profile above is: a [location] object
  // (description ~line 54, example [mylocation] ~line 151) holding the physical
  // location, and a [profile] object (description ~line 169, example [myprofile]
  // ~line 322) that a pjsip.conf endpoint actually references and that decides how
  // the location is used. `type=location`/`type=profile` are not bound controls for
  // the same reason `stirshaken`'s own profile `type` above is not: App.tsx's
  // onSaveGeolocationLocation/onSaveGeolocationProfile write the literal value
  // directly, per the "type (required)" note at lines 54/56 and 169/173.
  // gl_format/format — description ~line 61; example line 86 ("format = civicAddress").
  // gl_info/location_info — description ~line 88 ("required"). Asterisk repeats this
  // key once per fragment and concatenates them (lines 109-112 show four for one
  // civicAddress); this console has no free-text repeated-key control (its chip
  // control only ever offers a closed, enumerable set -- module names, log levels --
  // and location_info is neither), so this binds a plain text field to the FIRST
  // occurrence only, which is exactly what the sample's own GML/URI examples (lines
  // 116, 119) already use as a single line. Any additional pre-existing location_info
  // lines on the target are left exactly as they are -- `applyControlValues`'s plain
  // (non-repeated) write path only ever replaces the first matching key, never every
  // occurrence, so a second or third line already on the target survives a save from
  // this screen untouched rather than being silently deleted.
  // gl_method/method — description ~line 121; example line 127 ("method = Manual").
  // gl_source/location_source — description ~line 129 (must be a FQDN, never an IP
  // address, per RFC8787); example line 137.
  // gl_precedence/profile_precedence — description ~line 175; example line 204.
  // gl_pidf/pidf_element — description ~line 206; example line 223.
  // gl_reference/location_reference — description ~line 262, naming the [location_id]
  // object bound above; example lines 270 (quoted) and 324 (bare).
  // gl_routing/allow_routing_use — description ~line 247 (default no); example line 260.
  geolocation: [
    sFrom('gl_format', 'gl_location', 'format'),
    sFrom('gl_info', 'gl_location', 'location_info'),
    sFrom('gl_method', 'gl_location', 'method'),
    sFrom('gl_source', 'gl_location', 'location_source'),
    sFrom('gl_precedence', 'gl_profile', 'profile_precedence'),
    sFrom('gl_pidf', 'gl_profile', 'pidf_element'),
    sFrom('gl_reference', 'gl_profile', 'location_reference'),
    bFrom('gl_routing', 'gl_profile', 'allow_routing_use'),
  ],
  // configs/samples/phoneprov.conf.sample — [general] (line 1, the screen's own
  // primary file, no override needed) plus a named provisioning profile such as
  // [polycom] (line 63), picked by name the same way every other named-section group
  // in this table is (`sectionFrom`). pv_default/default_profile — line 14
  // ("default_profile=polycom ; The default profile to use if none specified"),
  // uncommented in the sample, unlike the three overrides above it. pv_addr/
  // serveraddr — line 9 (";serveraddr=192.168.1.1"). pv_iface/serveriface — line 10
  // (";serveriface=eth0"). pv_port/serverport — line 13 (";serverport=5060").
  // pv_staticdir/staticdir — line 64 ("staticdir => configs/ ; Sub directory of
  // AST_DATA_DIR/phoneprov that static files reside in"). pv_mimetype/mime_type —
  // line 67 ("mime_type => text/xml ; Default mime type to use if one isn't
  // specified"). Neither uses `=`; phoneprov.conf's own named-profile keys are
  // written with `=>` (confirmed already working the same way res_odbc.conf's own
  // `=>` keys are, in CONTROL_BINDINGS.dbrealtime above). The profile's actual file
  // list (`static_file =>`, dozens of entries in the sample, plus the dynamically
  // generated `${MAC}.cfg => ...` filename-as-key entries from line 134 onward) is
  // deliberately left unbound: it is neither one value nor a small closed set this
  // table's kinds can honestly carry, and a text field that only ever showed "the
  // first file" out of sixty would be worse than no field at all.
  phoneprov: [
    s('pv_default', 'general', 'default_profile'),
    s('pv_addr', 'general', 'serveraddr'),
    s('pv_iface', 'general', 'serveriface'),
    n('pv_port', 'general', 'serverport'),
    sFrom('pv_staticdir', 'pv_profile', 'staticdir'),
    sFrom('pv_mimetype', 'pv_profile', 'mime_type'),
  ],
  // configs/samples/res_pgsql.conf.sample — the screen's own primary file, [general]
  // section, no override needed. db_pgpassword is deliberately unbound: it is
  // write-only, exactly like res_odbc.conf's db_odbcpassword below and iax.conf's
  // ix_secret_set before it -- a real database password must never travel through an
  // ordinary binding into renderer state, from where an export, history entry or
  // screenshot could reach it. App.tsx takes it, writes it, and blanks the field in
  // one step (the same consumeCredential shape credential-field.ts already uses for
  // this console's own unlock PIN), and db_pgpasswordstatus reports only whether a
  // password line exists on the target, never what it holds.
  //
  // configs/samples/res_odbc.conf.sample — every db_odbc* key below is read from the
  // [asterisk] example section (enabled, dsn, pre-connect are uncommented there; the
  // rest are commented defaults shown the same way http.conf's own sample comments
  // its optional keys). Every one binds through `sectionFrom: 'db_odbcname'`, the
  // same mechanism the security screen's PJSIP-transport TLS fields use for a named
  // section chosen by a picker rather than declared in this table: res_odbc.conf
  // names an ODBC connection after an arbitrary [section], not a fixed one, and
  // extconfig.conf/func_odbc.conf refer to it by that same name. db_odbccachetype's
  // three options (stack/roundrobin/queue) are the sample's own words: "setting this
  // value to any of rr, roundrobin or queue will result in a round-robin queue being
  // used" -- rr is left off the list as a bare alias for roundrobin, not a fourth
  // distinct behaviour.
  //
  // extconfig.conf and sorcery.conf are NOT in this table. Both name a family or an
  // object type as the KEY itself (`ps_endpoints => odbc,asterisk`; `endpoint =
  // realtime,ps_endpoints`), which nothing here can express: `sectionFrom` picks a
  // SECTION by another control's value, and neither of these two files varies its
  // section that way (extconfig.conf's is always [settings]; sorcery.conf's section
  // is the module name, which sectionFrom could pick, but the mapping's own VALUE is
  // two logically separate fields -- driver/database/table/priority, or
  // wizard/wizard-config -- joined by commas, which is more than the two-part
  // `composite` mechanism tlsbindaddr already uses was built to carry, and extending
  // it for two call sites risked every other composite binding in this table for a
  // net decrease in clarity). Both are instead a hand-rolled read/edit/write pair in
  // App.tsx, over the pure functions in control-plane/realtime-mappings-model.ts --
  // the same shape control-plane/acl-model.ts already established for a file whose
  // structure this single-key table cannot carry, wired through the identical
  // pbx.plan/pbx.apply transaction every other write in this console uses.
  dbrealtime: [
    s('db_pghost', 'general', 'hostname'),  // ;hostname=localhost
    n('db_pgport', 'general', 'port'),  // ;port=5432
    s('db_pgdbname', 'general', 'dbname'),  // ;dbname=asterisk
    s('db_pguser', 'general', 'user'),  // ;user=postgres
    s('db_pgsocket', 'general', 'socket'),  // ;socket=/tmp
    s('db_pgappname', 'general', 'appname'),  // ;appname=asterisk
    s('db_pgrequirements', 'general', 'requirements'),  // requirements=warn (uncommented in the sample)
    b('db_pgorderby', 'general', 'order_multi_row_results_by_initial_column'),  // ;order_multi_row_results_by_initial_column=no -- absent means yes, so the switch's own design default is true
    bFrom('db_odbcenabled', 'db_odbcname', 'enabled', 'res_odbc.conf'),  // enabled => no
    sFrom('db_odbcdsn', 'db_odbcname', 'dsn', 'res_odbc.conf'),  // dsn => asterisk
    sFrom('db_odbcusername', 'db_odbcname', 'username', 'res_odbc.conf'),  // ;username => myuser
    bFrom('db_odbcpreconnect', 'db_odbcname', 'pre-connect', 'res_odbc.conf'),  // pre-connect => yes
    nFrom('db_odbcmaxconn', 'db_odbcname', 'max_connections', 'res_odbc.conf'),  // ;max_connections => 20
    nFrom('db_odbcconntimeout', 'db_odbcname', 'connect_timeout', 'res_odbc.conf'),  // ;connect_timeout => 10
    nFrom('db_odbcnegcache', 'db_odbcname', 'negative_connection_cache', 'res_odbc.conf'),  // ;negative_connection_cache => 300
    bFrom('db_odbclogging', 'db_odbcname', 'logging', 'res_odbc.conf'),  // ;logging => yes
    nFrom('db_odbcslowquery', 'db_odbcname', 'slow_query_limit', 'res_odbc.conf'),  // ;slow_query_limit => 5000
    bFrom('db_odbcbackslash', 'db_odbcname', 'backslash_is_escape', 'res_odbc.conf'),  // ;backslash_is_escape => yes
    sFrom('db_odbcisolation', 'db_odbcname', 'isolation', 'res_odbc.conf'),  // ;isolation => repeatable_read
    sFrom('db_odbccachetype', 'db_odbcname', 'cache_type', 'res_odbc.conf'),  // ;cache_type => roundrobin
  ],
  // configs/samples/res_snmp.conf.sample (two keys total, both in [general]) plus
  // configs/samples/prometheus.conf.sample (also [general], a different file entirely --
  // every prometheus.conf binding below carries an explicit `file`, the same shape the CDR
  // screen's cel.conf/cel_odbc.conf/cel_pgsql.conf bindings use for a screen that spans
  // several files). pm_authpassword and pm_authpasswordstatus carry no binding at all: the
  // password is write-only, handled the same way db_pgpassword is in App.tsx's
  // onSaveResPgsql -- read via findConfigEntry/consumeCredential/writeConfigEntry rather
  // than through this table, so it can never be populated by an ordinary read.
  monitoring: [
    b('mn_subagent', 'general', 'subagent'),  // line 16: ;subagent = yes
    b('mn_enabled', 'general', 'enabled'),  // line 18: ;enabled = yes
    b('pm_enabled', 'general', 'enabled', undefined, 'prometheus.conf'),  // line 20: enabled = no
    b('pm_core', 'general', 'core_metrics_enabled', undefined, 'prometheus.conf'),  // line 41: core_metrics_enabled = yes
    s('pm_uri', 'general', 'uri', 'prometheus.conf'),  // line 46: uri = metrics
    s('pm_authuser', 'general', 'auth_username', 'prometheus.conf'),  // line 49: ; auth_username = Asterisk
    s('pm_authrealm', 'general', 'auth_realm', 'prometheus.conf'),  // line 61: ; auth_realm =
  ],
  // configs/samples/asterisk.conf.sample. [directories] is a template in the shipped
  // sample ([directories](!)) that most installs never activate -- see that file's own
  // first lines -- but a real target that HAS activated it carries a plain [directories]
  // section this table matches like any other. [options] is the rest.
  identity: [
    s('as_dircache', 'directories', 'astcachedir'),  // line 6: astcachedir => /var/cache/asterisk
    s('as_diretc', 'directories', 'astetcdir'),  // line 7: astetcdir => /etc/asterisk
    s('as_dirmod', 'directories', 'astmoddir'),  // line 8: astmoddir => /usr/lib/asterisk/modules
    s('as_dirvarlib', 'directories', 'astvarlibdir'),  // line 9: astvarlibdir => /var/lib/asterisk
    s('as_dirdb', 'directories', 'astdbdir'),  // line 10: astdbdir => /var/lib/asterisk
    s('as_dirkey', 'directories', 'astkeydir'),  // line 11: astkeydir => /var/lib/asterisk
    s('as_dirdata', 'directories', 'astdatadir'),  // line 12: astdatadir => /var/lib/asterisk
    s('as_diragi', 'directories', 'astagidir'),  // line 13: astagidir => /var/lib/asterisk/agi-bin
    s('as_dirspool', 'directories', 'astspooldir'),  // line 14: astspooldir => /var/spool/asterisk
    s('as_dirrun', 'directories', 'astrundir'),  // line 15: astrundir => /var/run/asterisk
    s('as_dirlog', 'directories', 'astlogdir'),  // line 16: astlogdir => /var/log/asterisk
    s('as_dirsbin', 'directories', 'astsbindir'),  // line 17: astsbindir => /usr/sbin
    s('as_systemname', 'options', 'systemname'),  // line 38: ;systemname = my_system_name
    b('as_autosystemname', 'options', 'autosystemname'),  // line 40: ;autosystemname = yes
    s('as_entityid', 'options', 'entityid'),  // line 108: ;entityid=00:11:22:33:44:55
    s('as_runuser', 'options', 'runuser'),  // line 79: ;runuser = asterisk
    s('as_rungroup', 'options', 'rungroup'),  // line 80: ;rungroup = asterisk
    s('as_documentation_language', 'options', 'documentation_language'),  // line 87: documentation_language = en_US
    s('as_defaultlanguage', 'options', 'defaultlanguage'),  // line 86: ;defaultlanguage = en
    n('as_maxcalls', 'options', 'maxcalls'),  // line 46: ;maxcalls = 10
    n('as_maxload', 'options', 'maxload'),  // line 47: ;maxload = 0.9
    n('as_maxfiles', 'options', 'maxfiles'),  // line 49: ;maxfiles = 1000
    n('as_minmemfree', 'options', 'minmemfree'),  // line 50: ;minmemfree = 1
  ],
  // configs/samples/res_stun_monitor.conf.sample -- both keys in [general].
  stun: [
    s('su_addr', 'general', 'stunaddr'),  // line 19: ;stunaddr = mystunserver.com
    n('su_refresh', 'general', 'stunrefresh'),  // line 25: ;stunrefresh = 30
  ],
  // configs/samples/xmpp.conf.sample -- [general] only. The [asterisk] connection section
  // further down the sample mixes address fields with real credentials (secret,
  // refresh_token, oauth_secret) in one block, exactly the shape this table refuses to
  // guess a binding for; it is left entirely unbound, same reasoning as ix_secret_set.
  xmpp: [
    b('xm_debug', 'general', 'debug'),  // line 2: ;debug=yes
    b('xm_autoprune', 'general', 'autoprune'),  // line 3: ;autoprune=yes
    b('xm_autoregister', 'general', 'autoregister'),  // line 6: ;autoregister=yes
    b('xm_collection_nodes', 'general', 'collection_nodes'),  // line 7: ;collection_nodes=yes
    b('xm_pubsub_autocreate', 'general', 'pubsub_autocreate'),  // line 9: ;pubsub_autocreate=yes
    s('xm_auth_policy', 'general', 'auth_policy'),  // line 13: ;auth_policy=accept
  ],
  // configs/samples/adsi.conf.sample. Only [intro] exists in the shipped sample.
  // ad_greeting stays unbound: adsi.conf repeats a bare "greeting =>" line once per line
  // of the welcome message, and this table has no mechanism for an ordered, unlimited,
  // untyped multi-line control -- `repeated` exists for one key with many values, not for
  // free text, so guessing a shape for it would be exactly the guess this table refuses.
  adsi: [
    s('ad_alignment', 'intro', 'alignment'),  // line 5: alignment = center
  ],
};

function bindingsFor(screen: string): ReadonlyArray<ControlBinding> {
  return CONTROL_BINDINGS[screen] ?? [];
}

/** Pulls the real values out of a parsed file, keyed by control id. */
export function readControlValues(
  screen: string,
  value: ConfigValue | undefined,
  /** Other files this screen's controls reach, keyed by bare filename. */
  elsewhere: Readonly<Record<string, ConfigValue>> = {},
  /** The controls' current values, for a binding whose section is chosen by one of them. */
  chosen: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const binding of bindingsFor(screen)) {
    /* A control whose home is another file reads from that one. When it has not been
     * supplied, the control is left absent rather than read from the wrong file, which
     * would report one setting's value under another's name. */
    const source = binding.file ? elsewhere[binding.file] : value;
    if (!source) continue;
    const wanted = binding.sectionFrom === undefined
      ? binding.section
      : usableSectionName(chosen[binding.sectionFrom]);
    /* Nothing chosen, or a name that could break the file: the control is absent rather than
     * read from a section nobody picked. */
    if (wanted === undefined) continue;
    const chosenType = binding.sectionTypeFrom === undefined
      ? binding.sectionType
      : (typeof chosen[binding.sectionTypeFrom] === 'string' ? String(chosen[binding.sectionTypeFrom]) : binding.sectionType);
    const section = chosenType
      ? sectionOfType(source, chosenType)
      : source.find((candidate) => candidate.name === wanted);
    const entry = section?.entries.find((e) => e.key === binding.key);
    if (!entry) {
      /* A presence control reports false for a missing key rather than staying silent: the
       * absence IS the setting, and a switch that shows nothing until somebody touches it is
       * hiding the state it exists to show. */
      if (binding.presence && section) out[binding.control] = false;
      continue;
    }
    if (binding.presence) {
      /* Present means true whatever it carries, because the value is the network being
       * denied rather than a yes or a no. */
      out[binding.control] = true;
      continue;
    }
    if (binding.multi) {
      if (!section) continue;
      const holds = (key: string, value: string): boolean => {
        const entry = section.entries.find((candidate) => candidate.key === key);
        return entry !== undefined && entry.value.trim().toLowerCase() === value.toLowerCase();
      };
      const matched = Object.entries(binding.multi)
        .find(([, keys]) => Object.entries(keys).every(([key, value]) => holds(key, value)));
      if (matched) out[binding.control] = matched[0];
      continue;
    }
    if (binding.repeated) {
      /* Every occurrence, in file order, because the order is the setting. */
      if (!section) continue;
      out[binding.control] = section.entries
        .filter((candidate) => candidate.key === binding.key)
        .map((candidate) => candidate.value.trim());
      continue;
    }
    const rawValue = binding.composite
      ? splitComposite(entry.value, binding.composite.separator)[binding.composite.part]
      : entry.value;
    if (binding.composite && rawValue === '') continue;
    const parsed = fromRaw(rawValue, binding.kind, binding.invert, binding.valueMap);
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
  /* A section chosen by another control is read from the same changes, since that is where
   * the picker's current value lives. */
  const chosenSection = (binding: ControlBinding): string | undefined => (
    binding.sectionFrom === undefined
      ? binding.section
      : usableSectionName(changes[binding.sectionFrom]));
  const bindings = bindingsFor(screen);
  if (bindings.length === 0) return current;

  // Work section-by-section so we can preserve ordering, repeated keys, and every
  // untouched entry exactly, only ever replacing the first matching entry for a key
  // (mirroring the "first match wins" read semantics `entryValue` already documents)
  // or appending a new one when the key is not present yet.
  const sections: ConfigSection[] = current.map((sec) => ({ name: sec.name, entries: [...sec.entries] }));

  for (const binding of bindings) {
    if (!(binding.control in changes)) continue;
    const own = toRaw(changes[binding.control], binding.kind, binding.invert, binding.valueMap);
    if (own === undefined) continue;

    const wantedSection = chosenSection(binding);
    if (wantedSection === undefined) continue;
    let section = binding.sectionType
      ? sectionOfType(sections, binding.sectionType)
      : sections.find((sec) => sec.name === wantedSection);
    if (!section) {
      /* A type-matched binding does not invent a section. Creating [endpoint] because no
       * endpoint exists yet would write a section Asterisk reads as an object literally
       * called "endpoint", which is not what anybody meant. Making one is the endpoint
       * editor's job, and it names it after the extension. */
      if (binding.sectionType) continue;
      section = { name: wantedSection, entries: [] };
      sections.push(section);
    }

    const entries = section.entries as { key: string; value: string }[];
    const idx = entries.findIndex((e) => e.key === binding.key);
    /* A composite control owns half of the value, so the other half is read back off what is
     * already there and carried forward. Writing only this half would erase the other
     * control's work every time either one changed. */
    const raw = binding.composite
      ? joinComposite(idx === -1 ? '' : entries[idx].value, binding.composite.separator, binding.composite.part, own)
      : own;
    if (binding.multi) {
      const picked = changes[binding.control];
      const keys = typeof picked === 'string' ? binding.multi[picked] : undefined;
      /* A value this control cannot express writes nothing at all. Writing some of the keys
       * would leave the file in a state neither the old value nor the new one describes. */
      if (!keys) continue;
      for (const [key, value] of Object.entries(keys)) {
        const at = entries.findIndex((candidate) => candidate.key === key);
        if (at === -1) entries.push({ key, value });
        else entries[at] = { key, value };
      }
      continue;
    }
    if (binding.repeated) {
      const wanted = changes[binding.control];
      if (!Array.isArray(wanted) || !wanted.every((item) => typeof item === 'string')) continue;
      /* Replaced where the run started, so a rewritten list stays where it was rather than
       * moving to the end of the section. In a file whose order decides which rule wins,
       * moving a block is not a formatting detail. */
      const first = entries.findIndex((candidate) => candidate.key === binding.key);
      const kept = entries.filter((candidate) => candidate.key !== binding.key);
      const written = (wanted as string[]).map((value) => ({ key: binding.key, value }));
      const at = first === -1 ? kept.length : first;
      entries.length = 0;
      entries.push(...kept.slice(0, at), ...written, ...kept.slice(at));
      continue;
    }
    if (binding.presence) {
      /* The off state is the key not being there. Removing rather than writing "no" is the
       * whole point: "no" is a line Asterisk would try to read as a value. */
      if (changes[binding.control] === true) {
        if (idx === -1) entries.push({ key: binding.key, value: binding.presence.whenPresent });
        else entries[idx] = { key: binding.key, value: binding.presence.whenPresent };
      } else if (idx !== -1) {
        entries.splice(idx, 1);
      }
      continue;
    }
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
  const known = SCREEN_CONTROL_IDS[screen];
  if (known === undefined) {
    /* A screen this table has never heard of is not a screen with nothing unmapped -- it is
     * a screen nobody has looked at. Returning an empty list here made three of them read as
     * fully wired, because the caller warns only when the list is non-empty, so silence and
     * "all bound" were indistinguishable. UNKNOWN_SCREEN says which it is; the caller can
     * then tell somebody the truth instead of nothing. */
    return UNKNOWN_SCREEN;
  }
  return known.filter((id) => !bindingsFor(screen).some((b) => b.control === id));
}

/**
 * The answer for a screen the table does not cover.
 *
 * A distinct value rather than an empty array, so a caller cannot mistake "nothing left to
 * bind" for "nothing known about this at all". Compared by identity, so it survives being
 * passed around.
 */
export const UNKNOWN_SCREEN: ReadonlyArray<string> = Object.freeze(['(this screen is not in the binding inventory)']);

/** Whether that screen is one nobody has inventoried yet. */
export function isUninventoried(result: ReadonlyArray<string>): boolean {
  return result === UNKNOWN_SCREEN;
}

/**
 * Every control id declared on each screen in the generated design, independent of
 * `CONTROL_BINDINGS`. Kept separate (rather than derived from the bindings table) because a
 * list derived from the bindings could never report anything as unmapped -- everything in it
 * would be, by construction.
 *
 * It used to say that a control this table does not know about is "simply absent from its
 * result, never wrongly reported as mapped". That was backwards, and it hid three whole
 * screens: absent from the unmapped list IS reported as mapped, because the caller warns
 * only when the list is non-empty. A screen missing from here now answers UNKNOWN_SCREEN
 * and a test refuses the omission outright.
 */
const SCREEN_CONTROL_IDS: Readonly<Record<string, ReadonlyArray<string>>> = {
  /* http.conf. Every one of these is bound in CONTROL_BINDINGS.httpd below, including
   * the tlsbindaddr composite -- this comment used to say none of them were, which was
   * true when it was written and stopped being true once the composite mechanism
   * arrived (see control-keys.test.tsx's binding-count history). ht_save is the
   * action button that actually writes them; it carries no key of its own. */
  httpd: [
    'ht_enabled', 'ht_bindaddr', 'ht_bindport', 'ht_prefix', 'ht_static', 'ht_status',
    'ht_tlsenable', 'ht_tlsaddr', 'ht_tlsport', 'ht_tlscert', 'ht_tlskey', 'ht_notls1',
    'ht_notls11', 'ht_notls12', 'ht_sesslimit', 'ht_sessinact', 'ht_sesskeep', 'ht_save'
  ],
  /* features.conf and res_parking.conf. Every one of these is bound; see the comment above
   * CONTROL_BINDINGS.fcodes for the file split. (This comment used to say "none bound yet" --
   * that stopped being true once the fourteen features.conf controls were wired, and stayed
   * wrong until this parking pass noticed it.) */
  fcodes: [
    'fc_blindxfer', 'fc_atxfer', 'fc_disconnect', 'fc_automixmon', 'fc_parkcall',
    'fc_atxferabort', 'fc_atxfercomplete', 'fc_atxferthreeway', 'fc_atxferswap',
    'fc_pickupexten', 'fc_featuredigittimeout', 'fc_transferdigittimeout',
    'fc_atxfernoanswertimeout', 'fc_atxferdropcall',
    'fc_parkeddynamic', 'fc_parkext', 'fc_parkext_exclusive', 'fc_parkpos', 'fc_parkcontext',
    'fc_parkingtime', 'fc_findslot', 'fc_parkedmusicclass', 'fc_courtesytone', 'fc_parkedplay',
    'fc_parkedcalltransfers', 'fc_parkedcallreparking', 'fc_parkedcallhangup',
    'fc_comebacktoorigin', 'fc_comebackdialtime', 'fc_comebackcontext'
  ],
  /* iax.conf. Every one of these except ix_type and ix_secret_set is bound in
   * CONTROL_BINDINGS.iaxpeers above; see the comment there for why those two stay
   * unbound. ix_save is the action button that actually writes a selected peer (via
   * `App.tsx`'s `onSaveIaxPeer`, which reads iax-peers.ts's own name-targeted
   * `applyControlValues` rather than this table's generic single-section path -- iax.conf
   * can hold several peers, and this table's `sectionOfType` only ever reaches the
   * first); it carries no key of its own, same as httpd's ht_save above. */
  iaxpeers: [
    'ix_type', 'ix_host', 'ix_username', 'ix_port', 'ix_transfer', 'ix_qualify', 'ix_trunk',
    'ix_calltoken', 'ix_codecs', 'ix_context', 'ix_accountcode', 'ix_mailbox', 'ix_secret_set',
    'ix_save',
  ],
  /* chan_dahdi.conf. Every one of the twelve [channels] fields is bound in
   * CONTROL_BINDINGS.dahdi above; da_savegeneral is the write action (App.tsx's
   * onSaveDahdiGeneral). da_spans is a live status readout (`action:'dahdi-spans-status'`);
   * da_spec, da_addspan and da_removespan drive App.tsx's onDahdiAddChannel/
   * onDahdiRemoveChannel directly, since a repeated "channel =>" directive is not a
   * single-key binding this table can express. */
  dahdi: [
    'da_context', 'da_language', 'da_switchtype', 'da_signalling', 'da_usecallerid',
    'da_busydetect', 'da_echocancel', 'da_echocancelbridged', 'da_immediate', 'da_rxgain',
    'da_txgain', 'da_group', 'da_savegeneral', 'da_spans', 'da_spec', 'da_addspan', 'da_removespan',
  ],
  /* sla.conf. sl_attemptcid and every sl_trunk-/sl_station-prefixed field bound in
   * CONTROL_BINDINGS.sla above; sl_trunkname/sl_stationname are the sectionFrom pickers
   * (read via `values['sl_trunkname']`/`values['sl_stationname']`, same shape as
   * db_odbcname); sl_trunkload/sl_trunksave/sl_stationload/sl_stationsave are the four
   * write/read actions. The station's own "trunk=" list is not a single-key binding --
   * sl_stationtrunkline/sl_stationtrunkadd/sl_stationtrunkremove/sl_stationtrunks drive
   * App.tsx's onSlaStationTrunkAdd/onSlaStationTrunkRemove and the live status readout
   * directly, the same shape chan_dahdi's channel spans above use. */
  sla: [
    'sl_attemptcid',
    'sl_trunkname', 'sl_trunkload', 'sl_trunktype', 'sl_trunkdevice', 'sl_trunkautocontext',
    'sl_trunkringtimeout', 'sl_trunkbarge', 'sl_trunkhold', 'sl_trunksave',
    'sl_stationname', 'sl_stationload', 'sl_stationtype', 'sl_stationdevice',
    'sl_stationautocontext', 'sl_stationringtimeout', 'sl_stationringdelay', 'sl_stationhold',
    'sl_stationsave',
    'sl_stationtrunks', 'sl_stationtrunkline', 'sl_stationtrunkadd', 'sl_stationtrunkremove',
  ],
  /* dundi.conf. The seventeen [general] fields and the twelve peer fields are bound in
   * CONTROL_BINDINGS.dundi above; du_savegeneral is the general-settings write action.
   * du_peereid is the sectionFrom picker (read via `values['du_peereid']`);
   * du_peerload/du_peersave are its two actions. [mappings] varies its KEY rather than
   * its section, which this table cannot express at all -- du_mapname/du_mapvalue/
   * du_mapload/du_mapsave/du_mapremove drive App.tsx's onDundiMapping* handlers directly
   * through control-plane/realtime-mappings-model.ts, the same shape the Database
   * backends screen's db_family/db_driver/db_database/db_table/db_priority group uses
   * for extconfig.conf below. */
  dundi: [
    'du_department', 'du_organization', 'du_locality', 'du_stateprov', 'du_country', 'du_email',
    'du_phone', 'du_bindaddr', 'du_port', 'du_tos', 'du_entityid', 'du_cachetime', 'du_ttl',
    'du_autokill', 'du_storehistory', 'du_outgoingsiptech', 'du_pjsipendpoint', 'du_savegeneral',
    'du_mapname', 'du_mapload', 'du_mapvalue', 'du_mapsave', 'du_mapremove',
    'du_peereid', 'du_peerload', 'du_peermodel', 'du_peerhost', 'du_peerport', 'du_peerinkey',
    'du_peeroutkey', 'du_peerorder', 'du_peerinclude', 'du_peerpermit', 'du_peerdeny',
    'du_peerqualify', 'du_peerregister', 'du_peerprecache', 'du_peersave',
  ],
  /* calendar.conf. Every ca_* field except ca_name and ca_secret is bound in
   * CONTROL_BINDINGS.calendar above through sectionFrom, picked by ca_name (read via
   * `values['ca_name']`, same shape as db_odbcname). ca_secret is write-only (see the
   * long comment above CONTROL_BINDINGS.calendar); ca_secretstatus is its live
   * password-on-target readout (`action:'calendar-secret-status'`); ca_load/ca_save are
   * the two actions. */
  calendar: [
    'ca_name', 'ca_load', 'ca_type', 'ca_url', 'ca_user', 'ca_secretstatus', 'ca_secret',
    'ca_refresh', 'ca_timeframe', 'ca_fetchagain', 'ca_autoreminder', 'ca_channel', 'ca_context',
    'ca_extension', 'ca_app', 'ca_appdata', 'ca_waittime', 'ca_save',
  ],
  live: ['m_spy', 'm_format', 'm_beep', 'm_retain'],
  endpoints: [
    'e_transport', 'e_context', 'e_trust',
    'e_direct', 'e_symmetric', 'e_forcerport', 'e_rewrite', 'e_ice', 'e_encryption', 'e_dtmf',
    'e_maxcontacts', 'e_qualify', 'e_expiry', 'e_codecs',
    'e_maxaudio', 'e_maxvideo', 'e_optimistic', 'e_timers', 'e_timers_min_se', 'e_timers_sess',
    'e_rtp_timeout', 'e_rtp_hold', 'e_busy_at', 'e_refer_blind', 'e_aggregate_mwi',
    'e_mwi_replaces', 'e_outbound_proxy', 'e_outbound_auth', 'e_mailboxes', 'e_voicemail_ext',
    'e_removeexisting',
  ],
  trunks: ['t_retry', 't_forbidden', 't_fatal', 't_pai', 't_100rel'],
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
    'c_max', 'c_marked', 'c_announce', 'c_music',
  ],
  moh: ['h_mode', 'h_sort'],
  /* Sound prompts has no CONTROL_BINDINGS entries at all -- and deliberately so, not
   * because nobody has looked. Every one of its real actions (upload, audition, remove)
   * is `media.*` on `MediaLibrary`, an operation on a whole file rather than a value in a
   * `[section]`/`key=value` file this table's single-key binding shape could ever carry.
   * There is no `so_*` control on the screen for the same reason `moh` above lists no
   * entry for `h_upload`: the table's own "Upload a prompt" button and each row's own
   * context menu ARE the interface, and an empty list here is the honest "nothing is
   * unbound" rather than a screen the audit has simply never reached (see
   * `isUninventoried` above for what that distinction protects). */
  sounds: [],
  /* rtp.conf (the screen's own primary file) plus asterisk.conf's transcode_via_sln;
   * k_save/r_save are the two one-shot Save buttons this screen never had before -- pure
   * actions with no key of their own, recognised the same way fx_save/fx_udptlsave are. */
  codecs: [
    'k_order', 'k_transcode', 'k_save',
    'r_start', 'r_end', 'r_strict', 'r_ice', 'r_save',
  ],
  /* res_fax.conf's six fields plus udptl.conf's six, all bound (see CONTROL_BINDINGS.fax
   * above); fx_save and fx_udptlsave are the screen's two one-shot Save buttons -- pure
   * actions with no key of their own, recognised as working by
   * telephony-coverage.test.tsx's `deliveredByAction` exactly the way ht_save/s_tsave are. */
  fax: [
    'fx_maxrate', 'fx_minrate', 'fx_statusevents', 'fx_modems', 'fx_ecm', 'fx_t38timeout', 'fx_save',
    'fx_udptlstart', 'fx_udptlend', 'fx_udptlchecksums', 'fx_udptlfecentries', 'fx_udptlfecspan',
    'fx_udptleven', 'fx_udptlsave',
  ],
  /* cdr.conf, cel.conf, cel_odbc.conf and cel_pgsql.conf. d_status/l_status are the
   * live+configured backend readouts (action controls, no key of their own, same shape
   * as ht_status/ht_save above); d_save/l_save/l_osave/l_psave are the write actions;
   * l_octx names the cel_odbc.conf `[section]` l_oload/l_oconn/l_otable/l_osave read
   * and write, the same shape as s_transport on the Security screen. */
  cdr: [
    'd_enable', 'd_unanswered', 'd_congestion', 'd_batch', 'd_size', 'd_status', 'd_save',
    'l_enable', 'l_events', 'l_apps', 'l_date', 'l_status', 'l_save',
    'l_oshow', 'l_octx', 'l_oload', 'l_oconn', 'l_otable', 'l_osave',
    'l_pshow', 'l_pgmtime', 'l_phost', 'l_pport', 'l_pdb', 'l_puser', 'l_ptable', 'l_pschema', 'l_papp', 'l_psave',
  ],
  ami: ['a_http', 'a_port', 'a_tls', 'a_tlsport', 'a_origin', 'a_read', 'a_write', 'a_deny', 'a_timeout'],
  /* modules.conf, all bound as `repeated: true` lists (see CONTROL_BINDINGS.modules
   * above for why); mo_save is the screen's one Save button, a pure action with no key
   * of its own. */
  modules: ['mo_auto', 'mo_preload', 'mo_noload', 'mo_require', 'mo_load', 'mo_save'],
  /* logger.conf plus asterisk.conf's own verbose; g_save/g_vsave are the screen's two
   * Save buttons (logger.conf's four fields, and asterisk.conf's verbosity, are two
   * different files so they cannot share one write). g_chname/g_chlevels are the "any
   * other named channel" editor's free-form fields -- no fixed key, read directly out of
   * `state.values` by App.tsx the same way s_aclname/s_action/s_spec are for an ACL rule
   * -- and g_chload/g_chsave are its Load/Save actions. */
  logger: ['g_console', 'g_verbose', 'g_file', 'g_rotate', 'g_queue', 'g_save', 'g_vsave',
    'g_chname', 'g_chlevels', 'g_chload', 'g_chsave'],
  security: [
    's_aclname', 's_action', 's_spec', 's_failban', 's_bantime',
    's_transport', 's_tload', 's_tprotocol', 's_tcert', 's_tprivkey', 's_tcalistfile',
    's_tcalistpath', 's_tcipher', 's_tmethod', 's_tverifyclient', 's_tverifyserver',
    's_treqclientcert', 's_tsave',
    's_stir', 's_level', 's_verifyin', 's_failaction',
    's_privkey', 's_certurl', 's_loadsyscerts', 's_cafile', 's_capath', 's_stirsave',
  ],
  /* stir_shaken.conf's own [profile] objects -- see CONTROL_BINDINGS.stirshaken above.
   * cs_profile names the section; cs_load/cs_save are the two one-shot action buttons
   * (no key of their own, same shape as s_tload/s_tsave above). */
  stirshaken: [
    'cs_profile', 'cs_load', 'cs_behavior', 'cs_failaction', 'cs_level',
    'cs_privkey', 'cs_certurl', 'cs_x5uacl', 'cs_save',
  ],
  /* geolocation.conf's [location] and [profile] objects -- see CONTROL_BINDINGS.geolocation
   * above. gl_location/gl_profile name the two sections; gl_loadloc/gl_savloc/gl_loadprof/
   * gl_savprof are the four one-shot action buttons. */
  geolocation: [
    'gl_location', 'gl_loadloc', 'gl_format', 'gl_info', 'gl_method', 'gl_source', 'gl_savloc',
    'gl_profile', 'gl_loadprof', 'gl_precedence', 'gl_pidf', 'gl_reference', 'gl_routing', 'gl_savprof',
  ],
  /* phoneprov.conf's [general] section plus a named provisioning profile -- see
   * CONTROL_BINDINGS.phoneprov above. pv_gensave saves the four [general] fields;
   * pv_profile names the profile section; pv_load/pv_save are its own action pair. */
  phoneprov: [
    'pv_default', 'pv_addr', 'pv_iface', 'pv_port', 'pv_gensave',
    'pv_profile', 'pv_load', 'pv_staticdir', 'pv_mimetype', 'pv_save',
  ],
  /* res_odbc.conf, extconfig.conf, sorcery.conf, res_pgsql.conf -- see the long comment
   * above CONTROL_BINDINGS.dbrealtime for which of these are bound and why the rest
   * (every one of the db_family and db_sorcery controls, both picker names, both
   * passwords, both password-status readouts, and every Load/Save/Remove action) are
   * not: pickers and write-only fields carry no key of their own, and the family and
   * sorcery mapping editors are a hand-rolled read/write pair over
   * control-plane/realtime-mappings-model.ts rather than a single-key binding, the same
   * way the security screen's ACL rules are. */
  dbrealtime: [
    'db_pghost', 'db_pgport', 'db_pgdbname', 'db_pguser', 'db_pgpassword', 'db_pgpasswordstatus',
    'db_pgsocket', 'db_pgappname', 'db_pgrequirements', 'db_pgorderby', 'db_pgsave',
    'db_odbcname', 'db_odbcload', 'db_odbcenabled', 'db_odbcdsn', 'db_odbcusername',
    'db_odbcpassword', 'db_odbcpasswordstatus', 'db_odbcpreconnect', 'db_odbcmaxconn',
    'db_odbcconntimeout', 'db_odbcnegcache', 'db_odbclogging', 'db_odbcslowquery',
    'db_odbcbackslash', 'db_odbcisolation', 'db_odbccachetype', 'db_odbcsave',
    'db_family', 'db_mappingload', 'db_driver', 'db_database', 'db_table', 'db_priority',
    'db_mappingsave', 'db_mappingremove',
    'db_sorcerymodule', 'db_sorceryload', 'db_sorceryobjtype', 'db_sorcerywizard',
    'db_sorceryconfig', 'db_sorcerysave', 'db_sorceryremove',
  ],
  /* res_snmp.conf and prometheus.conf. Every control except pm_authpassword and
   * pm_authpasswordstatus is bound in CONTROL_BINDINGS.monitoring above; those two carry
   * no key of their own for the same reason db_pgpassword/db_pgpasswordstatus do not
   * (see the comment there). mn_save/pm_save are the two Save actions. */
  monitoring: [
    'mn_subagent', 'mn_enabled', 'mn_save',
    'pm_enabled', 'pm_core', 'pm_uri', 'pm_authuser', 'pm_authpassword', 'pm_authpasswordstatus',
    'pm_authrealm', 'pm_save',
  ],
  /* asterisk.conf: [directories] and [options]. Every control is bound in
   * CONTROL_BINDINGS.identity above; as_save is the one Save action for the whole screen. */
  identity: [
    'as_dircache', 'as_diretc', 'as_dirmod', 'as_dirvarlib', 'as_dirdb', 'as_dirkey',
    'as_dirdata', 'as_diragi', 'as_dirspool', 'as_dirrun', 'as_dirlog', 'as_dirsbin',
    'as_systemname', 'as_autosystemname', 'as_entityid', 'as_runuser', 'as_rungroup',
    'as_documentation_language', 'as_defaultlanguage',
    'as_maxcalls', 'as_maxload', 'as_maxfiles', 'as_minmemfree', 'as_save',
  ],
  /* res_stun_monitor.conf. Both fields are bound in CONTROL_BINDINGS.stun above;
   * su_save is the Save action. */
  stun: ['su_addr', 'su_refresh', 'su_save'],
  /* xmpp.conf's [general] section. Every control is bound in CONTROL_BINDINGS.xmpp
   * above; xm_save is the Save action. */
  xmpp: [
    'xm_debug', 'xm_autoprune', 'xm_autoregister', 'xm_collection_nodes',
    'xm_pubsub_autocreate', 'xm_auth_policy', 'xm_save',
  ],
  /* adsi.conf's [intro] section. ad_alignment is bound in CONTROL_BINDINGS.adsi above;
   * ad_greeting stays unbound (see the comment there) and ad_save is the Save action. */
  adsi: ['ad_alignment', 'ad_greeting', 'ad_save'],
};
