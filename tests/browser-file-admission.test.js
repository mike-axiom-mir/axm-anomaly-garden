const assert = require('node:assert/strict');
const admission = require('../src/browser-file-admission');

assert.equal(admission.SCHEMA, 'axm-anomaly-garden/browser-file-admission/v1');
assert.equal(admission.MAX_STATE_FILE_BYTES, 16 * 1024 * 1024);

const atLimit = admission.inspect({ size: admission.MAX_STATE_FILE_BYTES });
assert.equal(atLimit.ok, true);
assert.equal(atLimit.code, 'CLEAR_FILE_SIZE');
assert.equal(atLimit.authority.readFile, false);
assert.equal(atLimit.authority.parseState, false);
assert.equal(atLimit.authority.mutateSimulation, false);
assert.equal(atLimit.authority.merge, false);
assert.equal(atLimit.authority.canon, false);

const overLimit = admission.inspect({ size: admission.MAX_STATE_FILE_BYTES + 1 });
assert.equal(overLimit.ok, false);
assert.equal(overLimit.code, 'AXM_BROWSER_IMPORT_TOO_LARGE');
assert.equal(overLimit.observedSize, admission.MAX_STATE_FILE_BYTES + 1);

for (const invalid of [null, {}, { size: -1 }, { size: 1.5 }, { size: Number.MAX_SAFE_INTEGER + 1 }, { size: '12' }]) {
  const result = admission.inspect(invalid);
  assert.equal(result.ok, false);
}

let listener = null;
const input = {
  files: [{ size: admission.MAX_STATE_FILE_BYTES + 1 }],
  value: 'chosen.json',
  addEventListener(type, callback, capture) {
    assert.equal(type, 'change');
    assert.equal(capture, true);
    listener = callback;
  }
};
const status = { textContent: '' };
admission.install(input, status);
assert.equal(typeof listener, 'function');
let stopped = false;
listener({ stopImmediatePropagation() { stopped = true; } });
assert.equal(stopped, true, 'oversized file must stop later import listeners before file bytes are read');
assert.match(status.textContent, /^Import rejected: AXM_BROWSER_IMPORT_TOO_LARGE/);
assert.equal(input.value, '');

let clearStopped = false;
input.files = [{ size: 64 }];
listener({ stopImmediatePropagation() { clearStopped = true; } });
assert.equal(clearStopped, false, 'admitted size must leave the existing import path in control');

console.log('browser file admission: PASS');
