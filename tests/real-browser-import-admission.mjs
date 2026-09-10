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
  if (candidate !== root && !candidate.startsWith(root + sep)) {
    throw new Error('path escaped repository root');
  }
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

  const valid = await page.evaluate(() => {
    const simulation = new window.AnomalyGardenSim.GardenSimulation({
      seed: 'browser-import-proof-001',
      repairPolicy: 'tolerant'
    });
    simulation.run(7);
    return {
      serialized: simulation.serialize(),
      tick: simulation.tick,
      fingerprint: simulation.stateFingerprint()
    };
  });

  await page.locator('#import-file').setInputFiles({
    name: 'valid-state.json',
    mimeType: 'application/json',
    buffer: Buffer.from(valid.serialized, 'utf8')
  });
  await page.waitForFunction((tick) => document.getElementById('status')?.textContent === `Imported exact state at tick ${tick}. RNG state was restored, so deterministic continuation can continue from here.`, valid.tick);

  assert.equal(await page.locator('#tick').textContent(), String(valid.tick), 'valid file import must expose the imported tick');
  assert.equal(await page.locator('#metric-fingerprint').textContent(), valid.fingerprint, 'valid file import must expose the imported fingerprint');

  const expectedAfterStep = await page.evaluate((serialized) => {
    const simulation = window.AnomalyGardenSim.GardenSimulation.deserialize(serialized);
    simulation.run(1);
    return { tick: simulation.tick, fingerprint: simulation.stateFingerprint() };
  }, valid.serialized);

  const corrupted = JSON.parse(valid.serialized);
  assert(corrupted.state && typeof corrupted.state === 'object', 'serialized fixture must expose canonical state envelope');
  corrupted.state.seed = (Number(corrupted.state.seed) + 1) >>> 0;
  const semanticProblems = await page.evaluate((candidate) => window.AnomalyGardenStateContract.validateSerializedState(candidate).problems, corrupted);
  assert(semanticProblems.some((problem) => problem.code === 'SEED_IDENTITY_MISMATCH'), 'fixture must violate deterministic seed identity');

  const baseline = {
    tick: await page.locator('#tick').textContent(),
    fingerprint: await page.locator('#metric-fingerprint').textContent()
  };

  await page.locator('#import-file').setInputFiles({
    name: 'forged-seed-state.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(corrupted), 'utf8')
  });
  await page.waitForFunction(() => (document.getElementById('status')?.textContent || '').startsWith('Import rejected:'));

  const rejectedStatus = await page.locator('#status').textContent();
  assert.match(rejectedStatus, /^Import rejected:/, 'actual browser import path must surface rejection');
  assert.equal(await page.locator('#tick').textContent(), baseline.tick, 'rejected file must not replace the live tick');
  assert.equal(await page.locator('#metric-fingerprint').textContent(), baseline.fingerprint, 'rejected file must not replace the live canonical fingerprint');

  await page.locator('#step').click();
  await page.waitForFunction((tick) => document.getElementById('tick')?.textContent === String(tick), expectedAfterStep.tick);
  assert.equal(await page.locator('#metric-fingerprint').textContent(), expectedAfterStep.fingerprint, 'post-rejection continuation must match deterministic continuation from the last admitted state');

  assert.deepEqual(pageErrors, [], 'real browser journey must have no uncaught page errors');
  assert.deepEqual(consoleErrors, [], 'real browser journey must have no unexpected console errors');

  await mkdir(artifactDir, { recursive: true });
  const receipt = {
    schema: 'axm-anomaly-garden/browser-import-admission-evidence-v1',
    browser: await browser.version(),
    origin,
    validImport: {
      tick: valid.tick,
      fingerprint: valid.fingerprint,
      admitted: true
    },
    forgedImport: {
      semanticProblemCodes: semanticProblems.map((problem) => problem.code),
      rejected: true,
      status: rejectedStatus,
      liveStateUnchanged: true
    },
    continuation: {
      tick: expectedAfterStep.tick,
      fingerprint: expectedAfterStep.fingerprint,
      matchedReference: true
    },
    pageErrors,
    consoleErrors,
    boundary: 'Real Chromium file-input/change/import controller + shared browser semantic contract. This is not an OS-native file-dialog, authorship, signature, or cross-browser proof.'
  };
  await writeFile(resolve(artifactDir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  await page.screenshot({ path: resolve(artifactDir, 'rejected-state-preserved.png'), fullPage: true });
  process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
