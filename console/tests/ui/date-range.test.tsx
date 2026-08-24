import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeLocalDateInterval } from '../../shared/date-range.ts';
import { validateInclusiveDateRange } from '../../app/renderer/src/date-range.ts';

test('shared local date interval keeps the whole inclusive end day', () => {
  const interval = normalizeLocalDateInterval('2026-08-24', '2026-08-24');
  assert.ok(interval.fromMs !== undefined);
  assert.ok(interval.toMs !== undefined);
  assert.ok(interval.toMs! > interval.fromMs!);
});

test('renderer date validation rejects reversed and malformed ranges', () => {
  assert.equal(validateInclusiveDateRange('2026-08-25', '2026-08-24').ok, false);
  assert.equal(validateInclusiveDateRange('not-a-date', '').ok, false);
  assert.deepEqual(validateInclusiveDateRange('2026-08-24', '2026-08-24'), {
    ok: true,
    from: '2026-08-24',
    to: '2026-08-24',
  });
});
