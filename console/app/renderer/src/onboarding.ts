/**
 * The "super easy" onboarding wizard used to be a demo: it walked five screens of
 * questions, then closed itself and switched to the servers screen having written
 * nothing anywhere. This module is the part that makes the promise on the wizard's
 * first screen ("eight extensions, one menu, TLS, hardened") true - it turns the
 * wizard's answers into the same structured configuration documents the rest of the
 * console already reads and writes through `pbx.plan` / `pbx.apply`.
 *
 * Nothing here invents a value. An extension's number is derived from what already
 * exists on the target (highest numbered endpoint plus one, or 100 if there is none);
 * a secret is generated at random rather than guessed; TLS is only turned on when a
 * certificate is already present on the target, because a certificate path cannot be
 * invented. Hardening needs target-specific ACL, transport, and dialplan policy, so
 * the wizard reports that boundary instead of inventing a configuration option.
 * Business hours has no real value to derive from a single
 * yes/no switch, so this module does not write a schedule - see `ONBOARD_HOURS_NOTE`.
 */
import { CONFIG_DIRECTORY, entryValue, type ConfigSection, type ConfigValue } from './configuration';

export interface OnboardAnswers {
  intent: 'Deploy a new server' | 'Connect to an existing one';
  phones: number;
  menu: boolean;
  tls: boolean;
  hardened: boolean;
}

export interface OnboardDocument {
  resource: string;
  value: ConfigValue;
  expectedBefore: ConfigValue;
}

export interface OnboardExtension {
  id: string;
  secret: string;
}

export interface OnboardPlanInputs {
  pjsip: ConfigValue;
  extensions: ConfigValue;
  http: ConfigValue;
}

export interface OnboardPlan {
  documents: OnboardDocument[];
  newExtensions: OnboardExtension[];
  summary: string[];
  skipped: string[];
}

/** Shown on the Basics step and in the deploy summary - the honest replacement for a
 *  promise this module cannot keep from one boolean switch. */
export const ONBOARD_HOURS_NOTE =
  'Not written. A real business-hours schedule needs actual open/close ' +
  'times, which this wizard does not ask for - set it up afterward in Configure > Dialplan.';

function resourcePath(file: string): string {
  return `${CONFIG_DIRECTORY}/${file}`;
}

function section(value: ConfigValue, name: string): ConfigSection {
  return value.find((s) => s.name === name) ?? { name, entries: [] };
}

function withSection(value: ConfigValue, updated: ConfigSection): ConfigValue {
  const rest = value.filter((s) => s.name !== updated.name);
  return [...rest, updated];
}

function withTypedSection(value: ConfigValue, updated: ConfigSection): ConfigValue {
  const updatedType = updated.entries.find((entry) => entry.key === 'type')?.value;
  const rest = value.filter((candidate) => {
    if (candidate.name !== updated.name) return true;
    return candidate.entries.find((entry) => entry.key === 'type')?.value !== updatedType;
  });
  return [...rest, updated];
}

function randomSecret(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Highest numeric PJSIP endpoint section name already on the target, or 99 if none -
 *  so a fresh deploy starts numbering at 100, matching Asterisk's usual convention. */
function highestExtension(pjsip: ConfigValue): number {
  let max = 99;
  for (const s of pjsip) {
    if (/^\d+$/u.test(s.name)) max = Math.max(max, Number(s.name));
  }
  return max;
}

/**
 * Builds the full desired state for every resource the "super easy" deploy touches.
 * Each returned document is the COMPLETE file contents the planner should compare
 * against what is already on the target - `pbx.plan` diffs full documents, not
 * fragments, so anything already there that this function does not re-list would
 * otherwise read as "removed".
 */
export function buildOnboardPlan(answers: OnboardAnswers, inputs: OnboardPlanInputs): OnboardPlan {
  const summary: string[] = [];
  const skipped: string[] = [];
  const newExtensions: OnboardExtension[] = [];

  let pjsip = inputs.pjsip;
  let extensions = inputs.extensions;
  let http = inputs.http;

  const start = highestExtension(pjsip) + 1;
  const count = Number.isFinite(answers.phones)
    ? Math.max(0, Math.min(500, Math.floor(answers.phones)))
    : 0;
  if (!Number.isFinite(answers.phones)) skipped.push('Extensions: skipped - the requested count was not a finite number.');

  for (let i = 0; i < count; i++) {
    const id = String(start + i);
    const secret = randomSecret();
    newExtensions.push({ id, secret });

    pjsip = withSection(pjsip, {
      name: id,
      entries: [
        { key: 'type', value: 'endpoint' },
        { key: 'context', value: 'from-internal' },
        { key: 'disallow', value: 'all' },
        { key: 'allow', value: 'ulaw,alaw' },
        { key: 'auth', value: `auth${id}` },
        // PJSIP configuration sections are named records.  An endpoint and its AoR
        // must therefore not both occupy the numeric extension record: doing so
        // creates two records with the same name, which is ambiguous to a complete
        // document planner and makes the wizard appear to have created extensions
        // twice.  Keep the dialable extension id for the endpoint and give the AoR
        // its own stable, derived record name.
        { key: 'aors', value: `aor${id}` },
      ],
    });
    pjsip = withTypedSection(pjsip, {
      name: `auth${id}`,
      entries: [
        { key: 'type', value: 'auth' },
        { key: 'auth_type', value: 'userpass' },
        { key: 'username', value: id },
        { key: 'password', value: secret },
      ],
    });
    pjsip = withTypedSection(pjsip, {
      name: `aor${id}`,
      entries: [
        { key: 'type', value: 'aor' },
        { key: 'max_contacts', value: '1' },
        { key: 'remove_existing', value: 'yes' },
        { key: 'qualify_frequency', value: '60' },
      ],
    });
  }
  if (count > 0) {
    summary.push(`pjsip.conf: add ${count} endpoint, authentication, and AoR trio${count === 1 ? '' : 's'} starting at ${start}`);
  }

  if (answers.menu && count > 0) {
    const menuEntries: Array<{ key: string; value: string }> = [
      { key: 'exten', value: 's,1,Answer()' },
      { key: 'same', value: 'n,Background(welcome)' },
      { key: 'same', value: 'n,WaitExten(10)' },
    ];
    for (let i = 0; i < newExtensions.length; i++) {
      menuEntries.push({ key: 'exten', value: `${i + 1},1,Dial(PJSIP/${newExtensions[i].id},20)` });
    }
    menuEntries.push({ key: 'exten', value: 't,1,Hangup()' });
    menuEntries.push({ key: 'exten', value: 'i,1,Hangup()' });
    extensions = withSection(extensions, { name: 'onboard-menu', entries: menuEntries });
    summary.push('extensions.conf: add a one-menu auto-attendant dialing 1..N to the new extensions');
  } else if (answers.menu) {
    skipped.push('One menu: skipped - no extensions were created for it to route to.');
  }

  if (answers.tls) {
    const existingCert = entryValue(http, 'general', 'tlscertfile');
    if (existingCert && existingCert.length > 0) {
      const general = section(http, 'general');
      const already = general.entries.some((e) => e.key === 'tlsenable' && e.value === 'yes');
      http = withSection(http, {
        name: 'general',
        entries: [...general.entries.filter((e) => e.key !== 'tlsenable'), { key: 'tlsenable', value: 'yes' }],
      });
      if (!already) summary.push(`http.conf: enable TLS using the certificate already at ${existingCert}`);
    } else {
      skipped.push(
        'TLS: skipped - no certificate is already on the target, and this wizard does not invent one. ' +
          'Add a certificate and enable it from Configure > HTTP/TLS.',
      );
    }
  }

  if (answers.hardened) {
    skipped.push(
      'Hardening: skipped - target-specific endpoint, ACL, transport, and dialplan policy must be read and selected explicitly.',
    );
  }

  const documents: OnboardDocument[] = [
    { resource: resourcePath('pjsip.conf'), value: pjsip, expectedBefore: inputs.pjsip },
    { resource: resourcePath('extensions.conf'), value: extensions, expectedBefore: inputs.extensions },
    { resource: resourcePath('http.conf'), value: http, expectedBefore: inputs.http },
  ];

  return { documents, newExtensions, summary, skipped };
}
