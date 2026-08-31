import assert from 'node:assert/strict';
import test from 'node:test';
import { ConverterRegistry } from '../../control-plane/converter-registry.js';
import { pdfCapabilities } from '../../control-plane/converter-pdf.js';

test('every PDF operation stays explicitly unavailable when no PDF See Fut is declared or bundled', async () => {
  const registry = await ConverterRegistry.create();
  const capabilities = pdfCapabilities(registry);
  assert.deepEqual(capabilities.map(capability => capability.operation), ['inspect', 'split', 'merge', 'extract', 'reorder', 'rotate', 'metadata']);
  for (const capability of capabilities) {
    assert.equal(capability.available, false);
    assert.equal(capability.adapterId, 'pdf-toolkit');
    assert.match(capability.reason ?? '', /packaged|bundled|PDF toolkit/u);
  }
});
