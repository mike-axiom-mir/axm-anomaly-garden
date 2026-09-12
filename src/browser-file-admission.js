(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.AnomalyGardenBrowserFileAdmission = api;
    if (root.document) api.installCurrentDocument(root.document);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_STATE_FILE_BYTES = 16 * 1024 * 1024;
  const MAX_JSON_DEPTH = 256;
  const SCHEMA = 'axm-anomaly-garden/browser-file-admission/v1';
  const STRICT_JSON_SCHEMA = 'axm-anomaly-garden/browser-strict-json-intake/v1';
  const approvedFiles = typeof WeakSet === 'function' ? new WeakSet() : null;

  function rejection(code, message, observedSize) {
    return {
      schema: SCHEMA,
      ok: false,
      code,
      message,
      observedSize: Number.isSafeInteger(observedSize) ? observedSize : null,
      maxBytes: MAX_STATE_FILE_BYTES,
      authority: {
        readFile: false,
        parseState: false,
        mutateSimulation: false,
        merge: false,
        canon: false
      }
    };
  }

  function inspect(file) {
    if (!file || typeof file !== 'object') {
      return rejection('AXM_BROWSER_IMPORT_FILE_REQUIRED', 'No browser file was available for import.');
    }
    const size = file.size;
    if (!Number.isSafeInteger(size) || size < 0) {
      return rejection('AXM_BROWSER_IMPORT_SIZE_INVALID', 'The browser did not provide a safe integer file size.');
    }
    if (size > MAX_STATE_FILE_BYTES) {
      return rejection(
        'AXM_BROWSER_IMPORT_TOO_LARGE',
        'State file is ' + size + ' bytes; the offline browser import limit is ' + MAX_STATE_FILE_BYTES + ' bytes.',
        size
      );
    }
    return {
      schema: SCHEMA,
      ok: true,
      code: 'CLEAR_FILE_SIZE',
      observedSize: size,
      maxBytes: MAX_STATE_FILE_BYTES,
      authority: {
        readFile: false,
        parseState: false,
        mutateSimulation: false,
        merge: false,
        canon: false
      }
    };
  }

  function intakeError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function scanJsonStructure(text) {
    let index = 0;

    function skipWhitespace() {
      while (index < text.length && /[\t\n\r ]/.test(text[index])) index += 1;
    }

    function invalid(message) {
      throw intakeError('AXM_BROWSER_IMPORT_JSON_INVALID', message);
    }

    function readString(decode) {
      if (text[index] !== '"') invalid('Expected a JSON string.');
      const start = index;
      index += 1;
      while (index < text.length) {
        const char = text[index];
        const code = text.charCodeAt(index);
        if (char === '"') {
          index += 1;
          if (!decode) return null;
          try {
            return JSON.parse(text.slice(start, index));
          } catch (_) {
            invalid('Object member name is not valid JSON text.');
          }
        }
        if (code < 0x20) invalid('JSON strings cannot contain unescaped control characters.');
        if (char === '\\') {
          index += 1;
          if (index >= text.length) invalid('JSON string ended after an escape prefix.');
          const escaped = text[index];
          if (escaped === 'u') {
            if (!/^[0-9a-fA-F]{4}$/.test(text.slice(index + 1, index + 5))) invalid('JSON unicode escape must contain four hexadecimal digits.');
            index += 5;
            continue;
          }
          if (!'"\\/bfnrt'.includes(escaped)) invalid('JSON string contains an unsupported escape.');
          index += 1;
          continue;
        }
        index += 1;
      }
      invalid('Unterminated JSON string.');
    }

    function readPrimitive() {
      const remaining = text.slice(index);
      const literal = /^(?:true|false|null)(?=[\t\n\r ,}\]]|$)/.exec(remaining);
      if (literal) {
        index += literal[0].length;
        return;
      }
      const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?(?=[\t\n\r ,}\]]|$)/.exec(remaining);
      if (number) {
        index += number[0].length;
        return;
      }
      invalid('Invalid JSON value.');
    }

    function parseValue(depth) {
      if (depth > MAX_JSON_DEPTH) {
        throw intakeError('AXM_BROWSER_IMPORT_JSON_TOO_DEEP', 'JSON nesting exceeds the browser import limit of ' + MAX_JSON_DEPTH + '.');
      }
      skipWhitespace();
      const char = text[index];
      if (char === '{') return parseObject(depth);
      if (char === '[') return parseArray(depth);
      if (char === '"') return readString(false);
      return readPrimitive();
    }

    function parseObject(depth) {
      index += 1;
      skipWhitespace();
      if (text[index] === '}') {
        index += 1;
        return;
      }
      const keys = new Set();
      while (index < text.length) {
        skipWhitespace();
        const key = readString(true);
        if (keys.has(key)) {
          const shown = JSON.stringify(key);
          throw intakeError('AXM_BROWSER_IMPORT_DUPLICATE_KEY', 'Duplicate JSON object member ' + (shown.length > 120 ? shown.slice(0, 117) + '...' : shown) + '.');
        }
        keys.add(key);
        skipWhitespace();
        if (text[index] !== ':') invalid('Expected a colon after a JSON object member name.');
        index += 1;
        parseValue(depth + 1);
        skipWhitespace();
        if (text[index] === '}') {
          index += 1;
          return;
        }
        if (text[index] !== ',') invalid('Expected a comma between JSON object members.');
        index += 1;
      }
      invalid('Unterminated JSON object.');
    }

    function parseArray(depth) {
      index += 1;
      skipWhitespace();
      if (text[index] === ']') {
        index += 1;
        return;
      }
      while (index < text.length) {
        parseValue(depth + 1);
        skipWhitespace();
        if (text[index] === ']') {
          index += 1;
          return;
        }
        if (text[index] !== ',') invalid('Expected a comma between JSON array items.');
        index += 1;
      }
      invalid('Unterminated JSON array.');
    }

    parseValue(0);
    skipWhitespace();
    if (index !== text.length) invalid('Unexpected trailing data after the JSON value.');
  }

  async function readStrictJsonText(file) {
    const sizeAdmission = inspect(file);
    if (!sizeAdmission.ok) throw intakeError(sizeAdmission.code, sizeAdmission.message);
    if (typeof file.arrayBuffer !== 'function') {
      throw intakeError('AXM_BROWSER_IMPORT_BYTE_READER_UNAVAILABLE', 'The browser file does not expose an ArrayBuffer reader.');
    }

    let buffer;
    try {
      buffer = await file.arrayBuffer();
    } catch (error) {
      throw intakeError('AXM_BROWSER_IMPORT_READ_FAILED', 'Browser file byte read failed: ' + (error && error.message ? error.message : String(error)));
    }
    if (!buffer || !Number.isSafeInteger(buffer.byteLength)) {
      throw intakeError('AXM_BROWSER_IMPORT_READ_INVALID', 'Browser file byte read did not return a bounded ArrayBuffer.');
    }
    if (buffer.byteLength !== sizeAdmission.observedSize) {
      throw intakeError('AXM_BROWSER_IMPORT_SIZE_CHANGED', 'Browser file byte length no longer matches the admitted file size.');
    }
    if (buffer.byteLength > MAX_STATE_FILE_BYTES) {
      throw intakeError('AXM_BROWSER_IMPORT_TOO_LARGE', 'Browser file byte read exceeded the offline import limit.');
    }

    if (typeof TextDecoder !== 'function') {
      throw intakeError('AXM_BROWSER_IMPORT_DECODER_UNAVAILABLE', 'Fatal UTF-8 decoding is unavailable in this browser.');
    }
    let text;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(buffer));
    } catch (_) {
      throw intakeError('AXM_BROWSER_IMPORT_UTF8_INVALID', 'State file is not valid UTF-8.');
    }

    scanJsonStructure(text);
    return {
      schema: STRICT_JSON_SCHEMA,
      text,
      byteLength: buffer.byteLength,
      maxBytes: MAX_STATE_FILE_BYTES,
      maxJsonDepth: MAX_JSON_DEPTH,
      authority: {
        mutateSimulation: false,
        merge: false,
        canon: false
      }
    };
  }

  function rejectEvent(event, input, status, code, message) {
    if (event && typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    status.textContent = 'Import rejected: ' + code + ' — ' + message;
    try { input.value = ''; } catch (_) { /* best effort UI reset only */ }
  }

  function install(input, status) {
    if (!input || typeof input.addEventListener !== 'function') throw new Error('browser file admission requires a file input');
    if (!status || !('textContent' in status)) throw new Error('browser file admission requires a status target');
    if (input.__axmBrowserFileAdmissionInstalled) return;
    input.__axmBrowserFileAdmissionInstalled = true;
    input.addEventListener('change', async function (event) {
      const file = input.files && input.files[0];
      const result = inspect(file);
      if (!result.ok) {
        rejectEvent(event, input, status, result.code, result.message);
        return;
      }

      if (approvedFiles && approvedFiles.has(file)) {
        approvedFiles.delete(file);
        return;
      }

      if (event && typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      try {
        await readStrictJsonText(file);
        if (!input.files || input.files[0] !== file) {
          throw intakeError('AXM_BROWSER_IMPORT_SELECTION_CHANGED', 'The selected browser file changed during admission.');
        }
        if (!approvedFiles) throw intakeError('AXM_BROWSER_IMPORT_RELEASE_UNAVAILABLE', 'This browser cannot bind an admitted File object for release.');
        const view = input.ownerDocument && input.ownerDocument.defaultView;
        const EventCtor = view && typeof view.Event === 'function' ? view.Event : (typeof Event === 'function' ? Event : null);
        if (!EventCtor || typeof input.dispatchEvent !== 'function') {
          throw intakeError('AXM_BROWSER_IMPORT_RELEASE_UNAVAILABLE', 'This browser cannot release an admitted file to the import controller.');
        }
        approvedFiles.add(file);
        input.dispatchEvent(new EventCtor('change', { bubbles: true }));
      } catch (error) {
        if (approvedFiles) approvedFiles.delete(file);
        const code = error && error.code ? error.code : 'AXM_BROWSER_IMPORT_PREFLIGHT_FAILED';
        const message = error && error.message ? error.message : String(error);
        rejectEvent(event, input, status, code, message);
      }
    }, true);
  }

  function installCurrentDocument(documentRef) {
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const input = documentRef.getElementById('import-file');
    const status = documentRef.getElementById('status');
    if (!input || !status) return false;
    install(input, status);
    return true;
  }

  return Object.freeze({
    SCHEMA,
    STRICT_JSON_SCHEMA,
    MAX_STATE_FILE_BYTES,
    MAX_JSON_DEPTH,
    inspect,
    scanJsonStructure,
    readStrictJsonText,
    install,
    installCurrentDocument
  });
});
