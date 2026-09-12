'use strict';

const assert = require('node:assert/strict');
const admission = require('../src/browser-file-admission.js');

function fileFromBytes(bytes) {
  const view = Uint8Array.from(bytes);
  return {
    size: view.byteLength,
    arrayBufferCalls: 0,
    textCalls: 0,
    async arrayBuffer() {
      this.arrayBufferCalls += 1;
      return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    },
    async text() {
      this.textCalls += 1;
      return Buffer.from(view).toString('utf8');
    }
  };
}

function makeHarness(file) {
  let changeHandler = null;
  const status = { textContent: '' };
  const input = {
    files: [file],
    value: 'selected',
    redispatches: 0,
    addEventListener(type, handler, capture) {
      assert.equal(type, 'change');
      assert.equal(capture, true);
      changeHandler = handler;
    },
    dispatchEvent() {
      this.redispatches += 1;
      return true;
    }
  };
  admission.install(input, status);
  assert.equal(typeof changeHandler, 'function');
  return { input, status, changeHandler };
}

async function deliver(harness) {
  const event = {
    stopped: false,
    stopImmediatePropagation() { this.stopped = true; }
  };
  await harness.changeHandler(event);
  return event;
}

(async () => {
  const duplicate = Buffer.from('{"schema":"axm-anomaly-garden/state-v1","schema":"axm-anomaly-garden/state-v1","state":{}}', 'utf8');
  const duplicateFile = fileFromBytes(duplicate);
  const duplicateHarness = makeHarness(duplicateFile);
  const duplicateEvent = await deliver(duplicateHarness);

  assert.equal(duplicateEvent.stopped, true, 'accepted-size files must be held before the permissive app reader sees them');
  assert.equal(duplicateFile.textCalls, 0, 'strict preflight must not use File.text replacement decoding');
  assert.equal(duplicateHarness.input.redispatches, 0, 'ambiguous JSON must never be released to the app import listener');
  assert.match(duplicateHarness.status.textContent, /^Import rejected: AXM_BROWSER_IMPORT_DUPLICATE_KEY/);

  const invalidUtf8File = fileFromBytes([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d]);
  const invalidUtf8Harness = makeHarness(invalidUtf8File);
  const invalidUtf8Event = await deliver(invalidUtf8Harness);

  assert.equal(invalidUtf8Event.stopped, true, 'invalid UTF-8 must be held in the capturing admission layer');
  assert.equal(invalidUtf8File.textCalls, 0, 'invalid UTF-8 must not reach File.text replacement decoding');
  assert.equal(invalidUtf8Harness.input.redispatches, 0, 'invalid UTF-8 must never be released to the app import listener');
  assert.match(invalidUtf8Harness.status.textContent, /^Import rejected: AXM_BROWSER_IMPORT_UTF8_INVALID/);

  process.stdout.write('browser strict file intake contract: PASS\n');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
