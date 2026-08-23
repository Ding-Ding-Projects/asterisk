import assert from "node:assert/strict";
import { test } from "node:test";

import { IAX_AMAFLAGS, IAX_BANDWIDTHS, IAX_TYPES, FAX_RATES } from "../../control-plane/subsystem-models.js";
import { FIELD_CONTROL_CATALOG, lookupFieldControl } from "../../control-plane/field-control-catalog.js";

test("iax.conf amaflags resolves to the exact validated closed set", () => {
  const control = lookupFieldControl("iax.conf", "amaflags");
  assert.ok(control, "amaflags must be catalogued for iax.conf");
  assert.equal(control!.kind, "enum");
  assert.deepEqual(new Set(control!.options), IAX_AMAFLAGS, "catalog options must match validateIax's own accepted set exactly");
});

test("iax.conf bandwidth and type resolve to their validated closed sets", () => {
  const bandwidth = lookupFieldControl("iax.conf", "bandwidth");
  assert.deepEqual(new Set(bandwidth!.options), IAX_BANDWIDTHS);
  const type = lookupFieldControl("iax.conf", "type");
  assert.deepEqual(new Set(type!.options), IAX_TYPES);
});

test("res_fax.conf maxrate/minrate resolve to the sample's closed rate set", () => {
  const maxrate = lookupFieldControl("res_fax.conf", "maxrate");
  assert.deepEqual(new Set(maxrate!.options), FAX_RATES);
  const minrate = lookupFieldControl("res_fax.conf", "minrate");
  assert.deepEqual(new Set(minrate!.options), FAX_RATES);
});

test("an unmodelled key returns undefined rather than a guessed control", () => {
  assert.equal(lookupFieldControl("iax.conf", "bindport"), undefined, "bindport has no declared range in the sample and must stay free text");
  assert.equal(lookupFieldControl("iax.conf", "auth"), undefined, "auth is a comma-list, not a single closed value, and must stay free text");
  assert.equal(lookupFieldControl("res_fax.conf", "modems"), undefined, "modems is a comma-list and must stay free text");
  assert.equal(lookupFieldControl("does-not-exist.conf", "anything"), undefined);
});

test("every catalogued option set is non-empty and holds only unique, trimmed values", () => {
  for (const [resourceName, fields] of Object.entries(FIELD_CONTROL_CATALOG)) {
    for (const [key, control] of Object.entries(fields)) {
      assert.ok(control.options.length > 0, `${resourceName}:${key} has an empty option set`);
      const unique = new Set(control.options);
      assert.equal(unique.size, control.options.length, `${resourceName}:${key} has a duplicate option`);
      for (const option of control.options) {
        assert.equal(option, option.trim(), `${resourceName}:${key} has an untrimmed option ${JSON.stringify(option)}`);
        assert.ok(option.length > 0, `${resourceName}:${key} has a blank option`);
      }
    }
  }
});
