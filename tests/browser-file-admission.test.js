const assert = require('node:assert/strict');
const admission = require('../src/browser-file-admission');

assert.equal(admission.SCHEMA, 'axm-anomaly-garden/browser-file-admission/v1');
assert.equal(admission.STRICT_JSON_SCHEMA, 'axm-anomaly-garden/browser-strict-json-intake/v1');
assert.equal(admission.MAX_STATE_FILE_BYTES, 16 * 1024 * 1024);
assert.equal(admission.MAX_JSON_DEPTH, 256);

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

function browserFile(text) {
  const bytes = Buffer.from(text, 'utf8');
  return {
    size: bytes.byteLength,
    arrayBufferCalls: 0,
    async arrayBuffer() {
      this.arrayBufferCalls += 1;
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }
  };
}

function harness(file) {
  let listener = null;
  const input = {
    files: [file],
    value: 'chosen.json',
    redispatches: 0,
    addEventListener(type, callback, capture) {
      assert.equal(type, 'change');
      assert.equal(capture, true);
      listener = callback;
    },
    dispatchEvent() {
      this.redispatches += 1;
      return true;
    }
  };
  const status = { textContent: '' };
  admission.install(input, status);
  assert.equal(typeof listener, 'function');
  return { input, status, listener };
}

(async () => {
  const tooLarge = harness({ size: admission.MAX_STATE_FILE_BYTES + 1 });
  let stopped = false;
  await tooLarge.listener({ stopImmediatePropagation() { stopped = true; } });
  assert.equal(stopped, true, 'oversized file must stop later import listeners before file bytes are read');
  assert.match(tooLarge.status.textContent, /^Import rejected: AXM_BROWSER_IMPORT_TOO_LARGE/);
  assert.equal(tooLarge.input.value, '');
  assert.equal(tooLarge.input.redispatches, 0);

  const validFile = browserFile('{"schema":"fixture","state":{}}');
  const clear = harness(validFile);
  let clearStopped = false;
  await clear.listener({ stopImmediatePropagation() { clearStopped = true; } });
  assert.equal(clearStopped, true, 'accepted-size files must pause the original event until strict byte/text admission finishes');
  assert.equal(validFile.arrayBufferCalls, 1, 'strict admission must read the immutable browser File bytes once');
  assert.equal(clear.input.redispatches, 1, 'strictly admitted files must be released through one fresh change event');
  assert.equal(clear.status.textContent, '');

  const direct = await admission.readStrictJsonText(browserFile('{"outer":{"left":1,"right":2}}'));
  assert.equal(direct.schema, admission.STRICT_JSON_SCHEMA);
  assert.equal(direct.text, '{"outer":{"left":1,"right":2}}');
  assert.equal(direct.authority.mutateSimulation, false);
  assert.equal(direct.authority.merge, false);
  assert.equal(direct.authority.canon, false);

  console.log('browser file admission: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
