const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { GardenSimulation } = require('../src/v16.js');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

(function everyBrowserAssetIsLocalAndPresent() {
  const scripts = Array.from(html.matchAll(/<script\s+[^>]*src=["']([^"']+)["']/gi), (match) => match[1]);
  const styles = Array.from(html.matchAll(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi), (match) => match[1]);
  assert(scripts.length > 0);
  assert(styles.length > 0);
  for (const asset of scripts.concat(styles)) {
    assert(!/^https?:\/\//i.test(asset), 'runtime asset must be local: ' + asset);
    assert(fs.existsSync(path.join(root, asset)), 'missing browser asset: ' + asset);
  }
})();

(function extensionOrderKeepsLatestEngineAheadOfController() {
  const order = ['src/v12.js', 'src/v13.js', 'src/v14.js', 'src/v15.js', 'src/v16.js', 'src/app.js'];
  let last = -1;
  for (const item of order) {
    const index = html.indexOf('src="' + item + '"');
    assert(index > last, item + ' must load after previous engine layer');
    last = index;
  }
  assert(html.indexOf('src="src/v16-ui.js"') > html.indexOf('src="src/app.js"'));
})();

(function requiredControllerTargetsExist() {
  const ids = [
    'world', 'truth-list', 'people-list', 'causal-list', 'selected-detail', 'seed',
    'repair-policy', 'scenario', 'tick', 'metric-day', 'metric-investigating',
    'metric-awake', 'metric-signals', 'metric-repairs', 'metric-modals',
    'metric-fingerprint', 'metric-tests', 'metric-branches', 'status',
    'selected-agent', 'import-file'
  ];
  for (const id of ids) assert(html.includes('id="' + id + '"'), 'missing browser target #' + id);
})();

(function latestEngineCanPowerTheBrowserContractWithoutNetwork() {
  const sim = new GardenSimulation({ seed: 'browser-contract-engine', config: { subworldInvestigationPeriod: 2 } });
  sim.plantCompletionScenario();
  sim.run(8);
  const audit = sim.worldIntegrityReport();
  assert.strictEqual(sim.version, '0.16.0');
  assert.strictEqual(audit.pass, true, JSON.stringify(audit.errors));
  assert.strictEqual(sim.worldglassOverview().livingSubworlds.length, 2);
})();

console.log('Anomaly Garden browser wiring contract: PASS');