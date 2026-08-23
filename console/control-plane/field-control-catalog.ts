/**
 * Maps a raw configuration key, scoped to the resource file it lives in, to the exact
 * closed set of values Asterisk itself documents for it — driving the generic per-entry
 * editor (`PbxAdminApp.prepareAdminScreen`) toward a real `select`/`segmented` control
 * instead of a free-text box.
 *
 * Every set here is re-exported from `subsystem-models.ts`, where each one is already
 * cited to the exact line of the matching `configs/samples/*.sample` file that documents
 * it, and already used to validate that same field. This module adds no new claim about
 * what Asterisk accepts; it only exposes an existing, already-verified claim to the
 * renderer's generic editor.
 *
 * A key is listed here ONLY when the sample states a genuinely closed, single-value set.
 * A key whose sample value is a comma-separated LIST of choices (`identify_by`,
 * `auth` on an IAX2 peer/general section, `modems`) is deliberately left out: a single
 * `select` control cannot represent "zero or more of these", and offering one anyway
 * would silently discard every choice past the first. Those stay free text until the
 * editor grows a real multi-select control backed by the same closed set.
 *
 * A numeric field with no explicit range in its sample (`bindport`, `maxjitterbuffer`,
 * `transferdigittimeout`, ...) is also left out, for the same reason `subsystem-models.ts`
 * never invents a range for them: a `stepper`/`slider` control requires a real `min`/`max`,
 * and no sample here states one.
 */
import {
  FAX_RATES,
  IAX_AMAFLAGS,
  IAX_BANDWIDTHS,
  IAX_TYPES,
  PJSIP_AUTH_TYPES,
  PJSIP_DTMF_MODES,
  PJSIP_MEDIA_ENCRYPTION,
} from "./subsystem-models.js";

/** A key whose value must be exactly one of `options`, per the resource's own sample file. */
export interface EnumFieldControl {
  readonly kind: "enum";
  readonly options: readonly string[];
}

export type FieldControl = EnumFieldControl;

function enumControl(values: ReadonlySet<string>): EnumFieldControl {
  return { kind: "enum", options: [...values] };
}

/**
 * Resource basename (as returned by the renderer's own `basename(resource)`) -> raw
 * config key -> the control it should render as. `res_fax.conf`'s comma-list `modems`
 * field is deliberately absent, per the comma-list rule above.
 */
export const FIELD_CONTROL_CATALOG: Readonly<Record<string, Readonly<Record<string, FieldControl>>>> = {
  "iax.conf": {
    // iax.conf.sample: "amaflags ... Accepted values: default, omit, billing, documentation".
    amaflags: enumControl(IAX_AMAFLAGS),
    // iax.conf.sample: "bandwidth of low, medium, or high".
    bandwidth: enumControl(IAX_BANDWIDTHS),
    // iax.conf.sample: ";type=user" / ";type=peer" / ";type=friend" (lines 490, 522, 558,
    // 613, 626, 642) — closed to exactly these three spellings.
    type: enumControl(IAX_TYPES),
  },
  "res_fax.conf": {
    // res_fax.conf.sample: "Possible values are { 2400 | 4800 | 7200 | 9600 | 12000 | 14400 }".
    maxrate: enumControl(FAX_RATES),
    minrate: enumControl(FAX_RATES),
  },
  "pjsip.conf": {
    // pjsip.conf.sample-equivalent enumeration cited beside PJSIP_DTMF_MODES in
    // subsystem-models.ts: rfc4733, inband, info, auto, auto_info.
    dtmf_mode: enumControl(PJSIP_DTMF_MODES),
    // Cited beside PJSIP_MEDIA_ENCRYPTION: no, sdes, dtls.
    media_encryption: enumControl(PJSIP_MEDIA_ENCRYPTION),
    // Cited beside PJSIP_AUTH_TYPES: digest, google_oauth.
    auth_type: enumControl(PJSIP_AUTH_TYPES),
  },
};

/**
 * Looks up the typed control for one raw key in one resource, or `undefined` when this
 * catalog has no verified closed set for it — the caller's fallback (a boolean switch
 * for a literal `yes`/`no`, otherwise free text) is what keeps every other field honest.
 */
export function lookupFieldControl(resourceBasename: string, key: string): FieldControl | undefined {
  return FIELD_CONTROL_CATALOG[resourceBasename]?.[key];
}
