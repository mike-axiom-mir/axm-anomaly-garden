'use strict';
const assert = require('assert');
const { GardenSimulation } = require('../src/v09.js');

function run(seed, containmentPolicy) {
  const sim = new GardenSimulation({ seed, replicationPolicy: 'open', containmentPolicy });
  sim.seedReplicator({ x: 6, y: 4 });
  sim.run(120);
  return sim;
}

(function quarantineBoundsActiveLoadWithoutDeletion() {
  const sim = run('containment-bounds', 'quarantine');
  assert(sim.containmentActivated, 'quarantine should activate after repeated strain');
  assert(sim.quarantinedReplicators().length > 0, 'quarantine should retain contained programs');
  assert(sim.activeReplicators().length <= Math.floor(sim.config.containmentBound * sim.config.systemCapacity / sim.config.replicatorCost));
  assert(sim.metrics.containmentCycles > 0);
  const receipt = sim.receipts.find((item) => item.type === 'machine.replicator-quarantined');
  assert(receipt, 'quarantine action must be receipted');
  assert.strictEqual(receipt.payload.lineagePreserved, true);
  assert.strictEqual(receipt.parents.length, 1, 'quarantine receipt must point back to program creation');
  const cycle = sim.receipts.find((item) => item.type === 'machine.containment-cycle');
  assert(cycle && cycle.payload.deletionCount === 0, 'containment must not masquerade as deletion');
})();

(function quarantinedCellsStayOccupied() {
  const sim = run('containment-occupancy', 'quarantine');
  const quarantined = sim.quarantinedReplicators()[0];
  assert(quarantined, 'expected quarantined program');
  const occupied = sim.machinePrograms.filter((p) => (p.active || p.quarantined) && p.x === quarantined.x && p.y === quarantined.y);
  assert.strictEqual(occupied.length, 1, 'quarantined cell should remain occupied by retained lineage');
})();

(function quarantineReducesActiveStrainComparedWithOpen() {
  const open = run('containment-compare', 'off');
  const contained = run('containment-compare', 'quarantine');
  assert(contained.systemLoad() < open.systemLoad(), 'containment should reduce active system load');
  assert(contained.systemViability() > open.systemViability(), 'containment should improve modeled viability');
  assert(contained.metrics.strainEvents < open.metrics.strainEvents, 'reactive containment should reduce later strain without pretending earlier damage never occurred');
  assert(contained.metrics.strainEvents > 0, 'reactive containment should preserve residual pre-activation strain');
})();

(function deterministicRoundTrip() {
  const a = run('containment-roundtrip', 'quarantine');
  const b = GardenSimulation.deserialize(a.serialize());
  assert.strictEqual(a.stateFingerprint(), b.stateFingerprint(), 'containment state must survive serialization exactly');
  a.run(37); b.run(37);
  assert.strictEqual(a.stateFingerprint(), b.stateFingerprint(), 'restored containment world must continue deterministically');
})();

console.log('Anomaly Garden containment tests: PASS');