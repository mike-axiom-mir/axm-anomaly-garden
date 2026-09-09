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
  assert(context.AnomalyGardenStateContract, 'portable state contract must be exposed in browser mode');
  assert(context.AnomalyGardenBrowserStateAdmission, 'browser admission adapter must be exposed');
  return context;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function problemSignatures(result) {
  return (result.problems || [])
    .map((problem) => [problem.code, problem.path, problem.message])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

const source = new NodeGardenSimulation({ seed: 'shared-state-contract-parity' });
source.run(8);
const baseline = JSON.parse(source.serialize());

const fixtures = [
  {
    name: 'invalid config width',
    mutate(state) {
      state.state.config.width = 0;
    },
    expected: 'INVALID_WIDTH'
  },
  {
    name: 'missing metrics object',
    mutate(state) {
      state.state.metrics = null;
    },
    expected: 'INVALID_METRICS'
  },
  {
    name: 'dangling causal parent',
    mutate(state) {
      assert(state.state.receipts.length > 0, 'fixture requires at least one causal receipt');
      state.state.receipts[state.state.receipts.length - 1].parents = ['event-999999999'];
    },
    expected: 'DANGLING_RECEIPT_PARENT'
  },
  {
    name: 'dangling intervention receipt',
    mutate(state) {
      state.state.interventions = ['event-999999999'];
    },
    expected: 'DANGLING_INTERVENTION'
  }
];

for (const fixture of fixtures) {
  const forged = clone(baseline);
  fixture.mutate(forged);

  const nodeResult = nodeContract.validateSerializedState(forged);
  assert.strictEqual(nodeResult.ok, false, fixture.name + ': Node contract must reject fixture');
  assert(nodeResult.problems.some((problem) => problem.code === fixture.expected), fixture.name + ': Node contract must expose expected reason');

  const context = loadBrowserRuntime();
  const browserResult = context.AnomalyGardenBrowserStateAdmission.validateSerializedState(forged);
  assert.strictEqual(browserResult.ok, false, fixture.name + ': browser contract must reject the same fixture');
  assert.deepStrictEqual(
    problemSignatures(browserResult),
    problemSignatures(nodeResult),
    fixture.name + ': browser and Node semantic problem sets must be identical'
  );
}

console.log('Anomaly Garden shared state-contract parity: PASS');
