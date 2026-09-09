'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { GardenSimulation: NodeGardenSimulation } = require('../src/v16.js');

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
  'src/v16.js'
];

function loadBrowserEngine() {
  const context = vm.createContext({ console });
  for (const relativePath of browserEngineScripts) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    vm.runInContext(source, context, { filename: relativePath });
  }
  assert(context.AnomalyGardenSim, 'browser engine must expose AnomalyGardenSim');
  return context.AnomalyGardenSim.GardenSimulation;
}

(function browserRestoreMustRejectSemanticallyInvalidCanonicalState() {
  const source = new NodeGardenSimulation({ seed: 'browser-admission-repro' });
  source.run(4);
  const forged = JSON.parse(source.serialize());
  forged.state.seed = (forged.state.seed + 1) >>> 0;

  const BrowserGardenSimulation = loadBrowserEngine();
  let accepted = false;
  let thrown = null;
  try {
    BrowserGardenSimulation.deserialize(JSON.stringify(forged));
    accepted = true;
  } catch (error) {
    thrown = error;
  }

  assert.strictEqual(
    accepted,
    false,
    'browser deserialize admitted a state whose seed no longer matches seedText'
  );
  assert(thrown, 'browser deserialize must fail closed');
  assert.strictEqual(thrown.code, 'AXM_STATE_CONTRACT_REJECTED');
  assert(
    Array.isArray(thrown.problems) && thrown.problems.some((problem) => problem.code === 'SEED_IDENTITY_MISMATCH'),
    'browser rejection must preserve the canonical contract reason'
  );
})();

console.log('Anomaly Garden browser deserialization admission: PASS');
