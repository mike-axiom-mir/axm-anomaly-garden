'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { GardenSimulation: NodeGardenSimulation } = require('../src/v16.js');
const nodeContract = require('../src/state-contract.js');

const root = path.resolve(__dirname, '..');
const browserEngineScripts = [
  'src/sim.js',
  'src/v07.js',
  'src/v08.js',
  'src/v09.js',
  'src/v10.js',
  'src/v11.js',
  'src/v12.js',
  'src/v13.js',
  'src/v14.js',
  'src/v15.js',
  'src/v16.js',
  'src/state-contract.js',
  'src/browser-state-admission.js'
];

function loadBrowserRuntime() {
  const context = vm.createContext({ console });
  for (const relativePath of browserEngineScripts) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    vm.runInContext(source, context, { filename: relativePath });
  }
  assert(context.AnomalyGardenSim, 'browser engine must expose AnomalyGardenSim');
  assert(context.AnomalyGardenStateContract, 'browser engine must expose the shared state contract');
  assert(context.AnomalyGardenBrowserStateAdmission, 'browser state admission guard must be installed');
  return context;
}

function rejectionFor(BrowserGardenSimulation, input) {
  try {
    BrowserGardenSimulation.deserialize(JSON.stringify(input));
  } catch (error) {
    return error;
  }
  return null;
}

(function browserWiringPlacesSharedContractBeforeImportController() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const v16 = html.indexOf('src="src/v16.js"');
  const contract = html.indexOf('src="src/state-contract.js"');
  const admission = html.indexOf('src="src/browser-state-admission.js"');
  const app = html.indexOf('src="src/app.js"');
  assert(v16 >= 0 && contract > v16, 'shared state contract must load after v16');
  assert(admission > contract, 'browser admission adapter must load after the shared state contract');
  assert(app > admission, 'browser admission guard must load before the import controller');
})();

(function validStateStillRestoresAndContinuesDeterministically() {
  const source = new NodeGardenSimulation({ seed: 'browser-admission-valid' });
  source.run(6);
  const serialized = source.serialize();
  const context = loadBrowserRuntime();
  const BrowserGardenSimulation = context.AnomalyGardenSim.GardenSimulation;
  const browserRestored = BrowserGardenSimulation.deserialize(serialized);
  const nodeRestored = NodeGardenSimulation.deserialize(serialized);

  browserRestored.run(7);
  nodeRestored.run(7);
  assert.strictEqual(browserRestored.stateFingerprint(), nodeRestored.stateFingerprint());
})();

(function browserRestoreRejectsSeedIdentityForgeryWithNodeContractReason() {
  const source = new NodeGardenSimulation({ seed: 'browser-admission-seed-forgery' });
  source.run(4);
  const forged = JSON.parse(source.serialize());
  forged.state.seed = (forged.state.seed + 1) >>> 0;

  const context = loadBrowserRuntime();
  const error = rejectionFor(context.AnomalyGardenSim.GardenSimulation, forged);
  assert(error, 'browser deserialize must fail closed on seed identity drift');
  assert.strictEqual(error.code, 'AXM_STATE_CONTRACT_REJECTED');
  assert(error.problems.some((problem) => problem.code === 'SEED_IDENTITY_MISMATCH'));

  const nodeResult = nodeContract.validateSerializedState(forged);
  assert(nodeResult.problems.some((problem) => problem.code === 'SEED_IDENTITY_MISMATCH'));
})();

(function browserRestoreRejectsCounterReuseWithNodeContractReason() {
  const source = new NodeGardenSimulation({ seed: 'browser-admission-counter-forgery' });
  source.run(4);
  const forged = JSON.parse(source.serialize());
  forged.state.counters.nextReceiptId = 1;

  const context = loadBrowserRuntime();
  const error = rejectionFor(context.AnomalyGardenSim.GardenSimulation, forged);
  assert(error, 'browser deserialize must fail closed when the next receipt id would be reused');
  assert.strictEqual(error.code, 'AXM_STATE_CONTRACT_REJECTED');
  assert(error.problems.some((problem) => problem.code === 'STALE_NEXT_COUNTER'));

  const nodeResult = nodeContract.validateSerializedState(forged);
  assert(nodeResult.problems.some((problem) => problem.code === 'STALE_NEXT_COUNTER'));
})();

(function rejectedBrowserInputIsNotSilentlyRewritten() {
  const source = new NodeGardenSimulation({ seed: 'browser-admission-no-rewrite' });
  source.run(3);
  const forged = JSON.parse(source.serialize());
  forged.state.seed = (forged.state.seed + 1) >>> 0;
  const before = JSON.stringify(forged);

  const context = loadBrowserRuntime();
  const error = rejectionFor(context.AnomalyGardenSim.GardenSimulation, forged);
  assert(error);
  assert.strictEqual(JSON.stringify(forged), before, 'rejected caller state must remain byte-equivalent JSON');
})();

console.log('Anomaly Garden browser deserialization admission: PASS');
