'use strict';

const assert = require('assert');
const { GardenSimulation } = require('../src/v08.js');

function seeded(policy, seed) {
  const sim = new GardenSimulation({ seed, replicationPolicy: policy, repairPolicy: 'off' });
  const root = sim.seedReplicator({ x: 5, y: 4 });
  assert(root, 'root replicator should be planted');
  return sim;
}

(function deterministicReplicationTest() {
  const a = seeded('open', 'replication-deterministic');
  const b = seeded('open', 'replication-deterministic');
  a.run(140); b.run(140);
  assert.strictEqual(a.stateFingerprint(), b.stateFingerprint(), 'same seed/policy must reproduce the same replicator future');
  assert.deepStrictEqual(a.machinePrograms, b.machinePrograms);
})();

(function boundedBudgetTest() {
  const sim = seeded('bounded', 'replication-bounded');
  sim.run(240);
  assert(sim.metrics.replicatorCopies > 0, 'bounded policy should still permit locally valid copies');
  assert(sim.metrics.replicatorRefusals > 0, 'bounded policy should refuse copies at the shared budget boundary');
  assert(sim.systemLoad() <= sim.config.replicationBound + 1e-9, 'bounded policy must remain inside shared system budget');
  assert.strictEqual(sim.metrics.strainEvents, 0, 'bounded load should not reach the strain threshold');
})();

(function openGlobalStrainTest() {
  const sim = seeded('open', 'replication-open');
  sim.run(240);
  assert(sim.systemLoad() > sim.config.strainThreshold, 'open replication should be able to cross the global strain threshold');
  assert(sim.metrics.strainEvents > 0, 'crossing strain threshold should create machine-layer strain events');
  assert(sim.systemViability() < 1, 'global viability metric should fall under sustained excess load');
  const copies = sim.receipts.filter((receipt) => receipt.type === 'machine.replicator-copied');
  assert(copies.length > 0);
  for (const receipt of copies) {
    assert.strictEqual(receipt.payload.locallyValid, true, 'each accepted replication transition is locally valid by the model rules');
    assert(receipt.parents.length === 1, 'each child copy should point to its parent creation receipt');
  }
})();

(function replicationRoundTripTest() {
  const sim = seeded('open', 'replication-save');
  sim.run(90);
  const restored = GardenSimulation.deserialize(sim.serialize());
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint());
  sim.run(30); restored.run(30);
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint(), 'replication state and RNG must continue deterministically after restore');
})();

console.log('Anomaly Garden replication tests: PASS');
