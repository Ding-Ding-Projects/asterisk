/**
 * Contract: a screen's declared file must be a real filename, or nothing at all.
 *
 * Two screens declared `cdr.conf · cel.conf` -- a display label made of two filenames joined
 * for the reader. The old check asked only whether the string ended in `.conf` and carried
 * no path separator, and that label passes both. So it became a path no target could have,
 * the screen read nothing for as long as it existed, and nothing reported an error. The
 * roadmap recorded the symptom as "one status reading"; it was not a thin feature, it was a
 * broken one.
 *
 * Two lanes hit the same string independently before anyone traced it. That is the argument
 * for refusing it here rather than at the transport: a refusal at the transport arrives as a
 * failed read of a plausible-looking path, and a failed read is indistinguishable from a
 * target that simply has nothing to say.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { resourceForFile } from '../../app/renderer/src/configuration';
import { SCREENS } from '../../app/renderer/src/generated/console';

test('an ordinary configuration filename resolves', () => {
  for (const name of ['pjsip.conf', 'extensions.conf', 'cel_odbc.conf', 'res_fax.conf', 'sip.conf']) {
    assert.equal(resourceForFile(name), `/etc/asterisk/${name}`, `${name} should resolve`);
  }
});

test('a compound display label is refused, which is the defect this exists for', () => {
  /* The exact string that shipped, plus the shapes near it. */
  assert.equal(resourceForFile('cdr.conf · cel.conf'), undefined);
  assert.equal(resourceForFile('cdr.conf, cel.conf'), undefined);
  assert.equal(resourceForFile('cdr.conf and cel.conf'), undefined);
  assert.equal(resourceForFile('two files.conf'), undefined);
});

test('a path is refused however it is spelled', () => {
  const backslash = String.fromCharCode(92);
  assert.equal(resourceForFile('../../etc/shadow.conf'), undefined);
  assert.equal(resourceForFile('etc/asterisk/pjsip.conf'), undefined);
  assert.equal(resourceForFile(backslash + 'pjsip.conf'), undefined);
  assert.equal(resourceForFile('/etc/asterisk/pjsip.conf'), undefined);
});

test('anything that is not a string, or not a .conf, is refused', () => {
  for (const value of [undefined, null, 42, {}, [], '', 'pjsip', 'pjsip.confx', '.conf']) {
    assert.equal(resourceForFile(value), undefined, `${JSON.stringify(value)} should be refused`);
  }
});

test('no screen declares a compound label instead of a real filename any more', () => {
  /* A pin, not an aspiration. Four screens once declared a display label made of several
   * names joined for the reader -- and each ends in .conf, so the old check accepted it
   * and turned it into a path no target could have. Those screens had never read the
   * files they name.
   *
   * They are listed rather than fixed here because the design reference is being edited by
   * another lane as this lands, and a screen definition is not something to change underneath
   * somebody. This goes red when one is fixed, which is the point: the list is the work
   * remaining, and shrinking it should require saying so.
   *
   * Was three, then two: the Codecs & RTP screen ('codecs.conf · rtp.conf') was fixed by
   * the Logger/Modules/Codecs deepening lane -- it names rtp.conf now (its own real,
   * primary, writable file; asterisk.conf's transcode_via_sln is read separately, the
   * same way logger verbosity is) and reads it. The AMI & REST screen
   * ('manager.conf · ari.conf · http.conf') was fixed independently by the lane that gave
   * it its first real Save actions: it became a real `file: 'manager.conf'` (the file its
   * own Manager permissions group already edited), with http.conf and ari.conf read the
   * same extra-file way pjsip.conf and stir_shaken.conf already are for the Security
   * screen. One left.
   *
   * It also goes red if a second reappears, which is the other half of its job. */
  const screens = SCREENS as unknown as Record<string, { file?: unknown }>;
  const declared = Object.entries(screens)
    .map(([id, screen]) => [id, screen.file] as const)
    .filter(([, file]) => typeof file === 'string' && (file as string).includes('.conf'));
  assert.ok(declared.length > 5, 'too few screens declare a file for this check to mean anything');

  const refused = declared.filter(([, file]) => resourceForFile(file) === undefined).map(([id]) => id).sort();
  /* Was four, then three once the call records screen was fixed by the lane that
   * discovered why it had never read anything (it names cdr.conf now and reads it). Then
   * two, split across two independent lanes: the Codecs & RTP screen used to declare
   * 'codecs.conf · rtp.conf', the same compound-label shape, and had never read anything
   * either -- it names rtp.conf now (its own real, primary, writable file;
   * asterisk.conf's transcode_via_sln is read separately, the same way logger verbosity
   * is) and reads it. The AMI & REST screen was fixed the same way by a different lane --
   * see the comment above. One left, and then it went to zero and back to one, by two
   * unrelated changes landing on the same stacked branch.
   *
   * Trunk authentication went to zero first: its own six controls (ta_auto/ta_expire/
   * ta_notify/ta_mutual/ta_sign/ta_log) are already a `CONSOLE_SETTINGS` group in
   * App.tsx -- a Ding PBX Console preference persisted through relaunch, the same shape
   * as the appearance and notification groups, not an Asterisk key at all. There is no
   * pjsip.conf setting for how long a partner's request stays pending. So the fix was
   * not to invent a filename this screen could read -- it genuinely has none -- but to
   * stop CLAIMING one: `file` is now 'trunk partner requests', which does not contain
   * '.conf' at all any more, so it drops out of `declared` above rather than landing in
   * `refused` -- the same way the Dashboard screen's `file: 'live'` and the Live
   * channels screen's `file: 'core show channels'` never appear in either list.
   *
   * Then the Dialplan scripting (AGI) screen raised it back to one, deliberately rather
   * than by accident: it declares 'extensions.conf · astagidir' -- a real cross-check
   * between two different facts (the dialplan's own AGI() calls and asterisk.conf's
   * astagidir setting), neither of which is "this screen's one file" the way every
   * ordinary configuration screen has one. It is read through its own `pbx.read` view
   * ('agiscripts' in `control-plane/dispatch.ts`), the same bespoke-read shape `canvas`
   * and `sounds` already use for screens with no single `pbx.config` resource behind
   * them -- so this refusal is correct, not a gap: nothing here should ever try to read
   * '/etc/asterisk/extensions.conf · astagidir' as a literal path. */
  assert.deepEqual(refused, ['PLACEHOLDER'],
    'the set of screens naming a label rather than a file has changed; update this pin and say which way');

  /* Every declaration besides the pinned refusals above must resolve, or the rule is
   * refusing something legitimate. This used to assert accepted.length === declared.length
   * outright, back when the refused pin above was empty -- now that agiscripts is a real,
   * correctly-refused entry, that equality would fail by construction (refused and accepted
   * partition declared, so a non-empty refused pin means accepted is strictly fewer). Assert
   * the same fact the pin above already proves instead of restating a now-false one: every
   * declared screen not named in `refused` resolves. */
  const accepted = declared.filter(([, file]) => resourceForFile(file) !== undefined);
  assert.equal(accepted.length, declared.length - refused.length, 'the rule refused a real filename');
});
