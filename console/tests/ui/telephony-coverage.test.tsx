/**
 * How much of the telephony interface actually does something.
 *
 * This exists because measuring it wrongly is easy, and I did it twice in one afternoon. The
 * first attempt looked for a control id anywhere in the renderer sources and reported 100%.
 * The second restricted that to modules the app imports and still reported 100%. Both were
 * artefacts of the measurement: SCREEN_CONTROL_IDS in control-keys.ts lists every control id
 * on every screen, so scanning it counts an inventory as a consumer.
 *
 * A 100% that comes from the measurement rather than the code is worse than a low number,
 * because it ends the work.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { unmappedControls, isUninventoried } from '../../app/renderer/src/control-keys.ts';
import { ORDER, SCREENS } from '../../app/renderer/src/generated/console.tsx';

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'app', 'renderer', 'src');
/* orphan-controls.test.mjs already treats a control delivered by `c.action` — a real side
 * effect the design marks explicitly, rather than a value the console merely remembers — as
 * reaching something, and scans the design source directly for it rather than looking for the
 * control's own id in App.tsx. This measurement had no such route until the Security screen's
 * "Load"/"Save" buttons (s_tload, s_tsave, s_stirsave): each is a real write path, fully wired
 * through onControlAction, but its control id itself never needs to appear as a quoted literal
 * anywhere in App.tsx -- only its action NAME does (`'security-transport-save'`, not
 * `'s_tsave'`). Without this, three genuinely-working controls would read as dead here while
 * orphan-controls.test.mjs correctly counts them as reached, which is the exact kind of
 * measurement artefact this file's own header warns about. */
const design = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'design', 'Asterisk Console M3.dc.html'), 'utf8');
function deliveredByAction(id: string): boolean {
  return new RegExp(`ctl\\('${id}'[^\\n]*?action:'[a-z-]+'`).test(design);
}

/**
 * The share on 2026-08-24, measured.
 *
 * The total fell from 191 to 178 the same day, because thirteen controls were removed rather
 * than bound: each described a setting Asterisk does not have in the file its screen edits,
 * and mapping one onto something else would have meant inventing behaviour. The removals are
 * listed in docs/platform/unbound-controls.md so any of them can be put back with a real key.
 *
 * Then 172: the access-control-rules editor removed s_acl and s_permit (a real ACL edit does
 * not go through this single-key binding table at all -- see control-keys.test.tsx's "a
 * section somebody picks" note) and replaced them with the "Add a rule" form's own three
 * fields, s_aclname/s_action/s_spec, read directly by App.tsx's onAddAclRule the same way the
 * servers screen's sv_host/sv_user are (`'s_aclname'`/`'s_action'`/`'s_spec'` appear as quoted
 * literals right there, which is what this measurement actually looks for). Net +1 control,
 * all of it working.
 *
 * Then 188: the feature-codes screen gained a "Parking lot" and a "Parking retrieval and
 * timeout" group, sixteen controls covering res_parking.conf -- the file Asterisk 12 moved
 * parking-lot configuration into out of features.conf, per that sample's own first line. All
 * sixteen are bound (see control-keys.test.tsx), so working rose by the same sixteen.
 *
 * It may rise freely and may not fall.
 * Then 191 with the TLS and certificate-management lane: net +19 on the Security screen --
 * ten PJSIP-transport TLS fields and five STIR/SHAKEN key-material fields, all bound in
 * CONTROL_BINDINGS; s_transport, read via `values['s_transport']` (the quoted form this
 * measurement looks for); and three one-shot action buttons (s_tload, s_tsave, s_stirsave)
 * that write for real through onControlAction but, being pure actions, never appear as a
 * quoted control id in App.tsx -- only their action NAME does. `deliveredByAction` above adds
 * the same recognition orphan-controls.test.mjs already gives `c.action`, so these three read
 * as working rather than as a measurement artefact. All 191 work.
 *
 * Then 192: the same lane's `ht_save` action button gives http.conf's already-complete
 * CONTROL_BINDINGS.httpd table an actual write path (`onSaveHttp`), which it never had --
 * every ht_* field was seedable and none of them were writable. Recognised the same way as
 * s_tload/s_tsave/s_stirsave, via `deliveredByAction`.
 *
 * Then 209: the IAX peers screen gained `ix_save`, its own action button
 * (`action:'iaxpeers-save'`), giving the already-bound `CONTROL_BINDINGS.iaxpeers` table an
 * actual write path (`onSaveIaxPeer`) for the first time -- the eleven `ix_*` fields were
 * seedable off a live `iax.conf` and none of them were writable, the same gap `ht_save`
 * closed for http.conf above. Recognised the same way, via `deliveredByAction`. Net +1
 * control, and it works: the screen itself also moved from a single fixed section (whichever
 * peer/friend happened to be first) to a real `iax2 show peers` table, so which peer
 * `onSaveIaxPeer` writes is now the one actually selected, not an assumption.
 *
 * Then 223: landed alongside (and independently of) 209 above -- the new Fax screen added
 * fourteen controls of its own, twelve bound in CONTROL_BINDINGS.fax (six res_fax.conf, six
 * udptl.conf) plus fx_save/fx_udptlsave, two action buttons recognised via
 * `deliveredByAction` the same way as httpd-save above, each writing through its own
 * `onSaveFax`/`onSaveFaxUdptl`. All fourteen work, so 209 + 14 = 223.
 * Then 228 with the channel-event-logging lane: net +20 on the CDR/CEL screen. Twelve are
 * new CONTROL_BINDINGS.cdr entries -- cel_odbc.conf's show_user_defined plus a per-context
 * connection/table pair (l_octx names the section, the same sectionFrom shape s_transport
 * uses above), and cel_pgsql.conf's whole [global] section bar password. l_octx itself is
 * one more: a plain text picker with no binding of its own, read via `values['l_octx']`
 * (the quoted form this measurement looks for) exactly the way s_transport already is.
 * The remaining seven are one-shot action buttons -- d_save/d_status, l_save/l_status,
 * l_oload/l_osave, l_psave -- real write and live-status paths through onControlAction,
 * recognised the same way as s_tload/s_tsave/s_stirsave/ht_save, via `deliveredByAction`.
 * All 228 work: this lane also fixed cdr.conf's own five d_* fields and cel.conf's own
 * four l_* fields, which had never been read from a real target before (the screen's
 * declared `file` was the non-existent combined resource "cdr.conf · cel.conf"), but
 * those nine were already counted as working before this pass -- `measure()` only checks
 * whether a control is bound or delivered by an action, not whether the file it targets
 * was ever actually reachable, so their count does not move even though their behaviour
 * just went from silently inert to genuinely live.
 *
 * Then 222: the new Fax screen, fourteen controls -- twelve bound in CONTROL_BINDINGS.fax
 * (six res_fax.conf, six udptl.conf) plus fx_save/fx_udptlsave, two action buttons
 * recognised via `deliveredByAction` the same way as httpd-save above, each writing
 * through its own `onSaveFax`/`onSaveFaxUdptl`. All fourteen work.
 *
 * Merged: both lanes moved the floor independently from 208 (228 and 222 respectively),
 * so the reconciled number is neither -- it is 208 + 20 + 14, confirmed the same way as
 * control-keys.test.tsx's controlCount: a deliberately wrong value run through this test,
 * and the real figure it reported read back, rather than adding the two deltas by hand.
 *
 * It may rise freely and may not fall.
 * The floor moved on from 192 to 208 in the meantime, in changes this comment was not
 * updated alongside -- the numbers below are what this pass measured at HEAD before its
 * own change, and are the honest starting point for the delta actually being recorded
 * here. Then 251 with the whole new Database backends screen (res_odbc.conf, extconfig.conf,
 * sorcery.conf, res_pgsql.conf): net +43. Twenty are ordinary CONTROL_BINDINGS entries
 * (eight res_pgsql.conf fields bound plainly, twelve res_odbc.conf fields bound through
 * `sectionFrom: 'db_odbcname'`); the other twenty-three -- every picker, both write-only
 * passwords, both password-status readouts, and every Load/Save/Remove action across the
 * ODBC/realtime-mapping/sorcery groups -- are recognised the same two ways the Security
 * and HTTP-server lanes above already established: an action button or a status readout
 * carries `action:'db-*'` in the design, matched by `deliveredByAction`, and every picker
 * and write-only field is read out of `state.values['db_*']` by name in App.tsx's own
 * handlers, which is the quoted literal this measurement looks for. All 43 work; none are
 * decorative.
 *
 * This screen's own branch counted its +43 on top of a stale 208 and called the result
 * 251, the same way control-keys.test.tsx's Database backends paragraph called its own
 * total 199 before this same rebase. The real tip had already reached 243 by the time
 * this landed, so the honest number is 243 + 43 = 286 -- read back the same way, by
 * trying a deliberately wrong value first and taking whatever this test reported.
 *
 * It may rise freely and may not fall.
 */
function measure() {
  const files = readdirSync(srcDir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
  const raw = (f: string) => readFileSync(join(srcDir, f), 'utf8');
  /* The inventory is cut out before scanning: it names every control on every screen, so
   * counting it makes every control look consumed. */
  const withoutInventory = (f: string) => {
    const text = raw(f);
    const at = text.indexOf('SCREEN_CONTROL_IDS');
    return at === -1 ? text : text.slice(0, at);
  };
  /* And modules nothing imports are excluded: an orphaned module naming a control proves
   * somebody thought about it, not that anything reads it. Four such modules turned up in
   * this repository in one week. */
  const reachable = new Set<string>(['App.tsx', 'PbxAdminApp.tsx']);
  for (let hop = 0; hop < 3; hop += 1) {
    for (const f of [...reachable]) {
      for (const m of raw(f).matchAll(/from '\.\/([\w-]+)'/g)) {
        const hit = files.find((c) => c === `${m[1]}.ts` || c === `${m[1]}.tsx`);
        if (hit) reachable.add(hit);
      }
    }
  }
  const source = [...reachable].map(withoutInventory).join('\n');

  const screens = SCREENS as unknown as Record<string, { groups?: { ctls?: unknown[] }[]; file?: string }>;
  let working = 0; const dead: string[] = [];
  for (const id of ORDER as unknown as string[]) {
    const n = (screens[id]?.groups ?? []).reduce((a, g) => a + (g.ctls?.length ?? 0), 0);
    if (!n || !(screens[id]?.file ?? '').includes('.conf')) continue;
    const u = unmappedControls(id);
    const unbound = isUninventoried(u) ? [] : [...u];
    working += n - unbound.length;
    for (const c of unbound) { if (source.includes(`'${c}'`) || deliveredByAction(c)) working += 1; else dead.push(`${id}:${c}`); }
  }
  return { working, dead, total: working + dead.length, source, reachable, files };
}

/* 286, re-derived from the code after rebasing the Database backends lane onto a tip
 * that had already reached 243 by other means, rather than by adding the two deltas
 * together. The comment above still tells the true story of every lane that got here;
 * this number is what running this test with a deliberately wrong value read back,
 * exactly as that comment already recommends doing instead of arithmetic.
 *
 * Then 296, with the Logger/Modules/Codecs deepening pass: net +10, and every one of
 * them works, which is the same net gain to the floor as to the total. Logger gained
 * six -- g_save and g_vsave (its own two Save buttons, since logger.conf's four fields
 * and asterisk.conf's verbosity are two different files and cannot share one write, the
 * same split http.conf/httpd already established) plus g_chname/g_chlevels/g_chload/
 * g_chsave (the "any other named channel" editor: no fixed key, so g_chname/g_chlevels
 * are read directly out of `state.values` by name in App.tsx's onLoadLoggerChannel and
 * onSaveLoggerChannel, the quoted-literal shape this measurement already recognises for
 * s_aclname/s_action/s_spec, and g_chload/g_chsave are its Load/Save actions). Modules
 * gained two -- mo_load (a real new binding, modules.conf.sample line 32) and mo_save,
 * its first Save button ever; mo_preload/mo_noload/mo_require already counted as
 * working before this pass and still do, even though their `repeated: true` fix changed
 * what they actually write. Codecs gained two -- k_save and r_save, the screen's first
 * two Save buttons, now that its own declared `file` is rtp.conf (a real, readable file)
 * rather than the 'codecs.conf · rtp.conf' label resource-for-file.test.tsx already
 * refused; k_order and the five previously-bound fields do not recount, only the two new
 * action buttons do. All ten recognised via `deliveredByAction` or a quoted `state.values`
 * literal, the same two routes this measurement has recognised since s_tload/s_tsave.
 *
 * Then 319 with the compliance lane's three new screens: Call attestation (nine
 * controls -- a name picker, a Load button, six bound overrides and a Save button, all
 * on stir_shaken.conf's own [profile] objects), Emergency-services location (fourteen,
 * split across geolocation.conf's [location] and [profile] object groups) and Phone
 * provisioning (ten, split across phoneprov.conf's [general] section and its own named
 * profile). 9 + 14 + 10 = 33, and this test reported all 33 as reached the first time
 * it ran against them -- every picker is read via `values['...']` in App.tsx (the
 * quoted form `measure()` looks for), and every Load/Save button carries a design
 * `action:` recognised by `deliveredByAction`, the same two routes every other
 * named-section screen on this console already uses.
 *
 * Then a further jump once the telephony deepening lane's four brand new screens and
 * files landed -- chan_dahdi.conf, sla.conf, dundi.conf and calendar.conf, the
 * roadmap's "Hardware trunks / Shared line appearances / Distributed dialplan lookup /
 * Calendars" line. Every one of the 96 new controls works: the ordinary fields are
 * bound in CONTROL_BINDINGS (see the long comments there for the sectionFrom groups
 * picked by sl_trunkname/sl_stationname/du_peereid/ca_name); every name picker,
 * write-only credential and live status readout is read via `values['...']` by name in
 * App.tsx's own handlers or carries `action:'...'` in the design, recognised by
 * `deliveredByAction` exactly the way db_odbcname and db_pgpasswordstatus already are;
 * and the repeated-key directives this table cannot express at all -- chan_dahdi's
 * "channel =>" spans and sla's per-station "trunk=" assignments -- are read and written
 * directly against the parsed ConfigValue by onDahdiAddChannel/onDahdiRemoveChannel and
 * onSlaStationTrunkAdd/onSlaStationTrunkRemove.
 *
 * It may rise freely and may not fall.
 *
 * Then a further jump once the ops lane's five screens landed: Monitoring
 * (res_snmp.conf + prometheus.conf, 11 controls, all working -- the write-only
 * pm_authpassword is recognised because its id appears quoted in App.tsx's
 * consumeCredential(...) call, and the three action buttons/status readout via
 * deliveredByAction), Directories & identity (asterisk.conf, 24 controls, all working),
 * NAT discovery (res_stun_monitor.conf, 3, all working) and Messaging (xmpp.conf, 7, all
 * working) are each fully wired. Caller display (adsi.conf, 3) is not: ad_greeting is
 * deliberately left dead, because adsi.conf repeats a bare "greeting =>" line once per
 * line of the welcome message and this console has no control for an ordered, unlimited,
 * free-text list -- see the long comment on CONTROL_BINDINGS.adsi. That is the one control
 * this pass leaves genuinely unwired, on purpose, which is why the floor and the total are
 * no longer the same number. Read back the same way every earlier total on this page
 * was: trying a deliberately wrong value first and taking whatever this test actually
 * reported.
 *
 * Then a further jump with the Voicemail and AMI & REST deepening lane. Voicemail
 * gained thirteen: ten new CONTROL_BINDINGS entries (the storage-backend and
 * greeting-management fields) plus v_save/v_storagesave/v_greetsave, three one-shot
 * Save buttons recognised via `deliveredByAction` -- this screen had ten already-bound
 * fields and, before this lane, no write path of any kind. AMI & REST gained six:
 * a_httpsave/a_mgrsave, two more `deliveredByAction` buttons, plus am_interface/
 * am_username/am_secret/am_readonly, the Add-an-API-user form's own fields, read
 * directly out of `state.values` by `onAddApiUser` (the quoted-literal form this
 * measurement looks for, the same shape s_aclname/s_action/s_spec already use for the
 * Security screen's own "Add a rule" form). All nineteen work, read back the same way
 * every number above it was. */

const WORKING_FLOOR = 491;
const TELEPHONY_TOTAL = 492;

test('an action-delivered control is recognised even though its id never appears as a quoted literal', () => {
  for (const id of [
    's_tload', 's_tsave', 's_stirsave', 'ht_save', 'fx_save', 'fx_udptlsave',
    'g_save', 'g_vsave', 'g_chload', 'g_chsave', 'mo_save', 'k_save', 'r_save',
  ]) {
    assert.ok(deliveredByAction(id), `${id} should be recognised via its design-declared action`);
  }
  // These really do write for real -- their ACTION names, not their control ids, are the
  // quoted literals App.tsx actually contains.
  const app = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'app', 'renderer', 'src', 'App.tsx'), 'utf8');
  for (const action of [
    'security-transport-load', 'security-transport-save', 'security-stir-save', 'httpd-save', 'fax-save', 'fax-udptl-save',
    'logger-save', 'logger-verbosity-save', 'logger-channel-load', 'logger-channel-save',
    'modules-save', 'codecs-transcode-save', 'codecs-rtp-save',
  ]) {
    assert.ok(app.includes(`'${action}'`), `onControlAction should handle '${action}'`);
  }
  // g_chname/g_chlevels are read directly out of state.values, the same shape as
  // s_aclname/s_action/s_spec -- the quoted-literal route this file's own header
  // documents `deliveredByAction` was built to complement, not replace.
  for (const id of ['g_chname', 'g_chlevels']) {
    assert.ok(app.includes(`'${id}'`), `${id} should appear as a quoted literal read by App.tsx`);
  }
  assert.ok(!deliveredByAction('s_transport'), 's_transport has no action -- it is a plain text picker, not a one-shot button');
});

test('the measurement cannot count an inventory as a consumer', () => {
  /* The exact way both earlier attempts reported a false 100%. */
  const { source } = measure();
  assert.ok(!source.includes('SCREEN_CONTROL_IDS'), 'the inventory list is scanned as though it were code');
  assert.ok(!source.includes("'e_callerid'"),
    'e_callerid appears only in the inventory, so finding it means the cut failed');
});

test('the measurement ignores modules nothing imports', () => {
  const { reachable, files } = measure();
  assert.ok(reachable.size < files.length, 'every module counts as reachable, so an orphan would look consumed');
  assert.ok(reachable.has('App.tsx') && reachable.has('control-keys.ts'), 'the reachable set is not built');
});

test('the number of telephony controls that work does not fall', () => {
  /* A ratchet, like the orphan count. Wiring one is always welcome; a change that quietly
   * unwires one has to be a decision somebody takes on purpose. */
  const { working, dead, total } = measure();
  assert.equal(total, TELEPHONY_TOTAL, `the screen inventory moved: ${total} controls, not ${TELEPHONY_TOTAL}`);
  assert.ok(working >= WORKING_FLOOR,
    `${working} of ${total} work, down from ${WORKING_FLOOR}. Newly dead: ${dead.join(' ')}`);
});

test('the floor is raised when the number rises, so it cannot go stale', () => {
  const { working } = measure();
  /* The floor and the total were the same number until Caller display (ADSI) landed --
   * ad_greeting is the one deliberately unwired control on this whole console, left that
   * way because adsi.conf repeats a bare "greeting =>" line once per line of the welcome
   * message and nothing here can express an ordered, unlimited, free-text list. So the
   * gap here is exactly WORKING_FLOOR to TELEPHONY_TOTAL (333 to 334), never more: a
   * second gap would mean some OTHER control was added without being wired, or one that
   * used to work stopped. */
  assert.equal(working, WORKING_FLOOR,
    `${working} of ${TELEPHONY_TOTAL} work, expected exactly ${WORKING_FLOOR} (only ad_greeting stays dead on purpose).`);
});
