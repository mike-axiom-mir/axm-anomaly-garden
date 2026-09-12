import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const evidence = path.join(root, 'artifacts', 'city-fidelity');
fs.mkdirSync(evidence, { recursive: true });
const types = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8']]);
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const requested = pathname === '/' ? '/index.html' : pathname;
  const file = path.resolve(root, '.' + requested);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'content-type': types.get(path.extname(file)) || 'application/octet-stream', 'cache-control':'no-store' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless:true });
const context = await browser.newContext({ viewport:{ width:1280, height:900 } });
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];
page.on('pageerror', error => pageErrors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('requestfailed', request => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`));

try {
  await page.goto(origin + '/', { waitUntil:'networkidle' });
  await page.waitForSelector('#city-detail');
  await page.waitForFunction(() => document.querySelector('#city-canvas')?.dataset.detail === 'full');

  const initial = await page.evaluate(() => ({
    fingerprint: document.querySelector('#metric-fingerprint')?.textContent,
    tick: document.querySelector('#tick')?.textContent,
    policy: document.querySelector('#city-canvas')?.dataset.detailPolicy,
    detail: document.querySelector('#city-canvas')?.dataset.detail,
    status: document.querySelector('#city-detail-state')?.textContent
  }));
  assert.equal(initial.policy, 'auto');
  assert.match(initial.status, /EXPRESSION ONLY/);

  await page.selectOption('#city-detail', 'full');
  await page.waitForTimeout(1100);
  const full = await page.evaluate(() => ({
    fingerprint: document.querySelector('#metric-fingerprint').textContent,
    detail: document.querySelector('#city-canvas').dataset.detail,
    policy: document.querySelector('#city-canvas').dataset.detailPolicy,
    drawMeanMs: Number(document.querySelector('#city-canvas').dataset.detailDrawMeanMs),
    status: document.querySelector('#city-detail-state').textContent
  }));
  assert.equal(full.policy, 'full');
  assert.equal(full.detail, 'full');
  assert.equal(full.fingerprint, initial.fingerprint, 'changing realization policy must not mutate canonical state');
  await page.screenshot({ path:path.join(evidence, 'city-detail-full-desktop.png'), fullPage:true });

  await page.selectOption('#city-detail', 'lean');
  await page.waitForTimeout(1100);
  const lean = await page.evaluate(() => ({
    fingerprint: document.querySelector('#metric-fingerprint').textContent,
    detail: document.querySelector('#city-canvas').dataset.detail,
    policy: document.querySelector('#city-canvas').dataset.detailPolicy,
    drawMeanMs: Number(document.querySelector('#city-canvas').dataset.detailDrawMeanMs),
    status: document.querySelector('#city-detail-state').textContent
  }));
  assert.equal(lean.policy, 'lean');
  assert.equal(lean.detail, 'lean');
  assert.equal(lean.fingerprint, initial.fingerprint, 'lean realization must preserve canonical state');
  assert.match(lean.status, /LEAN .* EXPRESSION ONLY/);

  await page.click('#city-inject');
  await page.waitForFunction(() => /^1 glitches/.test(document.querySelector('#city-signals')?.textContent || ''));
  const afterIntervention = await page.evaluate(() => ({
    fingerprint: document.querySelector('#metric-fingerprint').textContent,
    signals: document.querySelector('#city-signals').textContent,
    detail: document.querySelector('#city-canvas').dataset.detail,
    notice: document.querySelector('#city-view-notice').textContent
  }));
  assert.notEqual(afterIntervention.fingerprint, initial.fingerprint, 'the explicit intervention should still author real simulation truth');
  assert.equal(afterIntervention.detail, 'lean');
  assert.match(afterIntervention.notice, /Glitch injected/);
  await page.screenshot({ path:path.join(evidence, 'city-detail-lean-glitch-desktop.png'), fullPage:true });

  await page.setViewportSize({ width:390, height:844 });
  await page.waitForTimeout(250);
  const mobile = await page.evaluate(() => {
    const select = document.querySelector('#city-detail');
    const rect = select.getBoundingClientRect();
    return {
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      detailTargetHeight: rect.height,
      detail: document.querySelector('#city-canvas').dataset.detail,
      fingerprint: document.querySelector('#metric-fingerprint').textContent,
      signals: document.querySelector('#city-signals').textContent
    };
  });
  assert.equal(mobile.scrollWidth, mobile.innerWidth, 'phone realization should not escape horizontally');
  assert(mobile.detailTargetHeight >= 44, `detail selector should remain a >=44px phone target, got ${mobile.detailTargetHeight}`);
  assert.equal(mobile.detail, 'lean');
  assert.equal(mobile.fingerprint, afterIntervention.fingerprint, 'viewport realization must not mutate canonical state');
  assert.match(mobile.signals, /^1 glitches/);
  await page.screenshot({ path:path.join(evidence, 'city-detail-lean-mobile.png'), fullPage:true });

  assert.deepEqual(pageErrors, [], 'page errors');
  assert.deepEqual(consoleErrors, [], 'console errors');
  assert.deepEqual(failedRequests, [], 'failed requests');

  const receipt = {
    schema:'axm.anomaly-garden.city-realization-experience/v1',
    initial,
    full,
    lean,
    afterIntervention,
    mobile,
    pageErrors,
    consoleErrors,
    failedRequests,
    claims:{ canonicalStateChangesWithDetail:false, adaptiveRealizationAuthority:'EXPRESSION_ONLY', sustainedFps:false }
  };
  fs.writeFileSync(path.join(evidence, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
