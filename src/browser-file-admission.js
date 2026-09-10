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
  const SCHEMA = 'axm-anomaly-garden/browser-file-admission/v1';

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

  function install(input, status) {
    if (!input || typeof input.addEventListener !== 'function') throw new Error('browser file admission requires a file input');
    if (!status || !('textContent' in status)) throw new Error('browser file admission requires a status target');
    if (input.__axmBrowserFileAdmissionInstalled) return;
    input.__axmBrowserFileAdmissionInstalled = true;
    input.addEventListener('change', function (event) {
      const file = input.files && input.files[0];
      const result = inspect(file);
      if (result.ok) return;
      if (event && typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      status.textContent = 'Import rejected: ' + result.code + ' — ' + result.message;
      try { input.value = ''; } catch (_) { /* best effort UI reset only */ }
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
    MAX_STATE_FILE_BYTES,
    inspect,
    install,
    installCurrentDocument
  });
});
