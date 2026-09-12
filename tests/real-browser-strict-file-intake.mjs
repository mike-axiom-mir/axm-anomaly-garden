import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const artifactDir = resolve(root, 'artifacts', 'browser-import-admission');
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8']
]);

function safePath(pathname) {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
  const candidate = resolve(root, relative);
  if (candidate !== root && !candidate.startsWith(root + sep)) throw new Error('path escaped repository root');
  return candidate;
}

const server = http.createServer(async (request, response) => {
  try {
    const filePath = safePath(new URL(request.url, 'http://127.0.0.1').pathname);
    const body = await readFile(filePath);
    response.writeHead(200, {
      'content-type': contentTypes.get(extname(filePath)) || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    response.end(body);
  } catch (error) {
    response.writeHead(error && error.code === 'ENOENT' ? 404 : 400, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('not found');
  }
});

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(0, '127.0.0.1', resolveListen);
});

const address = server.address();
assert.equal(typeof address, 'object');
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(origin + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => {
    const fingerprint = document.getElementById('metric-fingerprint')?.textContent || '';
    return fingerprint && fingerprint !== '--------';
  });

  const intake = await page.evaluate(() => ({
    schema: window.AnomalyGardenBrowserFileAdmission?.STRICT_JSON_SCHEMA,
    maxDepth: window.AnomalyGardenBrowserFileAdmission?.MAX_JSON_DEPTH
  }));
  assert.equal(intake.schema, 'axm-anomaly-garden/browser-strict-json-intake/v1');
  assert.equal(intake.maxDepth, 256);

  const baseline = {
    tick: await page.locator('#tick').textContent(),
    fingerprint: await page.locator('#metric-fingerprint').textContent()
  };

  const valid = await page.evaluate(() => {
    const simulation = new window.AnomalyGardenSim.GardenSimulation({
      seed: 'browser-strict-intake-proof-001',
      repairPolicy: 'tolerant'
    });
    simulation.run(5);
    return {
      serialized: simulation.serialize(),
      tick: simulation.tick,
      fingerprint: simulation.stateFingerprint()
    };
  });
  const parsed = JSON.parse(valid.serialized);
  assert.equal(parsed.schema, 'axm-anomaly-garden/state-v1');
  const duplicateSchema = '{"schema":' + JSON.stringify(parsed.schema) + ',' + valid.serialized.slice(1);

  await page.evaluate(() => {
    window.__axmStrictIntakeReads = { arrayBuffer: 0, text: 0 };
    const originalArrayBuffer = File.prototype.arrayBuffer;
    const originalText = File.prototype.text;
    File.prototype.arrayBuffer = function (...args) {
      window.__axmStrictIntakeReads.arrayBuffer += 1;
      return originalArrayBuffer.apply(this, args);
    };
    File.prototype.text = function (...args) {
      window.__axmStrictIntakeReads.text += 1;
      return originalText.apply(this, args);
    };
  });

  await page.locator('#import-file').setInputFiles({
    name: 'duplicate-schema-state.json',
    mimeType: 'application/json',
    buffer: Buffer.from(duplicateSchema, 'utf8')
  });
  await page.waitForFunction(() => (document.getElementById('status')?.textContent || '').startsWith('Import rejected: AXM_BROWSER_IMPORT_DUPLICATE_KEY'));
  const duplicateStatus = await page.locator('#status').textContent();
  assert.equal(await page.locator('#tick').textContent(), baseline.tick, 'duplicate-key save must not replace the live tick');
  assert.equal(await page.locator('#metric-fingerprint').textContent(), baseline.fingerprint, 'duplicate-key save must not replace live canonical state');
  assert.deepEqual(await page.evaluate(() => window.__axmStrictIntakeReads), { arrayBuffer: 1, text: 0 }, 'duplicate-key save must be rejected before File.text');

  await page.locator('#import-file').setInputFiles({
    name: 'invalid-utf8-state.json',
    mimeType: 'application/json',
    buffer: Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d])
  });
  await page.waitForFunction(() => (document.getElementById('status')?.textContent || '').startsWith('Import rejected: AXM_BROWSER_IMPORT_UTF8_INVALID'));
  const utf8Status = await page.locator('#status').textContent();
  assert.equal(await page.locator('#tick').textContent(), baseline.tick, 'invalid UTF-8 save must not replace the live tick');
  assert.equal(await page.locator('#metric-fingerprint').textContent(), baseline.fingerprint, 'invalid UTF-8 save must not replace live canonical state');
  assert.deepEqual(await page.evaluate(() => window.__axmStrictIntakeReads), { arrayBuffer: 2, text: 0 }, 'invalid UTF-8 must be rejected before File.text replacement decoding');

  await page.locator('#import-file').setInputFiles({
    name: 'valid-state.json',
    mimeType: 'application/json',
    buffer: Buffer.from(valid.serialized, 'utf8')
  });
  await page.waitForFunction((tick) => document.getElementById('status')?.textContent === `Imported exact state at tick ${tick}. RNG state was restored, so deterministic continuation can continue from here.`, valid.tick);
  assert.equal(await page.locator('#tick').textContent(), String(valid.tick));
  assert.equal(await page.locator('#metric-fingerprint').textContent(), valid.fingerprint);
  assert.deepEqual(await page.evaluate(() => window.__axmStrictIntakeReads), { arrayBuffer: 3, text: 1 }, 'strictly admitted valid save must be released once to the existing app reader');

  assert.deepEqual(pageErrors, [], 'strict browser intake journey must have no uncaught page errors');
  assert.deepEqual(consoleErrors, [], 'strict browser intake journey must have no unexpected console errors');

  await mkdir(artifactDir, { recursive: true });
  const receipt = {
    schema: 'axm-anomaly-garden/browser-strict-intake-evidence/v1',
    browser: await browser.version(),
    origin,
    intake,
    duplicateKey: {
      rejected: true,
      code: 'AXM_BROWSER_IMPORT_DUPLICATE_KEY',
      status: duplicateStatus,
      liveStateUnchanged: true,
      fileTextReads: 0
    },
    invalidUtf8: {
      rejected: true,
      code: 'AXM_BROWSER_IMPORT_UTF8_INVALID',
      status: utf8Status,
      liveStateUnchanged: true,
      fileTextReads: 0
    },
    validImport: {
      tick: valid.tick,
      fingerprint: valid.fingerprint,
      admitted: true
    },
    reads: await page.evaluate(() => window.__axmStrictIntakeReads),
    pageErrors,
    consoleErrors,
    boundary: 'Real Chromium File bytes are size-admitted, fatal-UTF-8 decoded, duplicate-key checked, then released to the existing semantic import path. This is not authorship, signature, hostile-script confinement, filesystem-race, or cross-browser proof.'
  };
  await writeFile(resolve(artifactDir, 'strict-intake-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  await page.screenshot({ path: resolve(artifactDir, 'strict-intake-valid.png'), fullPage: true });
  process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
