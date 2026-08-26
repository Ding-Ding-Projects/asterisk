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

test('the screens that declare a label instead of a filename are exactly these three', () => {
  /* A pin, not an aspiration. Four screens declare a display label made of several names
   * joined for the reader -- and each ends in .conf, so the old check accepted it and turned
   * it into a path no target could have. Those screens have never read the files they name.
   *
   * They are listed rather than fixed here because the design reference is being edited by
   * another lane as this lands, and a screen definition is not something to change underneath
   * somebody. This goes red when one is fixed, which is the point: the list is the work
   * remaining, and shrinking it should require saying so.
   *
   * It also goes red if a fifth appears, which is the other half of its job. */
  const screens = SCREENS as unknown as Record<string, { file?: unknown }>;
  const declared = Object.entries(screens)
    .map(([id, screen]) => [id, screen.file] as const)
    .filter(([, file]) => typeof file === 'string' && (file as string).includes('.conf'));
  assert.ok(declared.length > 5, 'too few screens declare a file for this check to mean anything');

  const refused = declared.filter(([, file]) => resourceForFile(file) === undefined).map(([id]) => id).sort();
  /* Was four. The call records screen was fixed by the lane that discovered why it had
   * never read anything, so it names cdr.conf now and reads it. Three left. */
  assert.deepEqual(refused, ['ami', 'codecs', 'trunkauth'],
    'the set of screens naming a label rather than a file has changed; update this pin and say which way');

  /* Every other declaration must resolve, or the rule is refusing something legitimate. */
  const accepted = declared.filter(([, file]) => resourceForFile(file) !== undefined);
  assert.ok(accepted.length >= declared.length - 3, 'the rule refused more than the three known labels');
});
