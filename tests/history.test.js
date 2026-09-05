'use strict';

const assert = require('assert');
const { GardenSimulation } = require('../src/v07.js');

(function exactColdHistoryTest() {
  const sim = new GardenSimulation({ seed: 'cold-history', repairPolicy: 'off' });
  const modal = sim.addModal({ x: 5, y: 4, radius: 5, period: 8, memoryLeak: 0.45 });
  for (let tick = 0; tick < 600; tick += 1) {
    if (tick % 90 === 10) sim.addAnomaly('loop-echo', { x: 5, y: 4, radius: 3, intensity: 0.9, ttl: 50 });
    sim.step();
  }

  const beforeFingerprint = sim.stateFingerprint();
  const uncompressedTwin = GardenSimulation.deserialize(sim.serialize());
  const beforeTotal = sim.totalReceiptCount();
  const beforeHot = sim.receipts.length;
  const recentReset = sim.receipts.slice().reverse().find((receipt) => receipt.type === 'world.modal-reset' && receipt.payload.modalId === modal.id);
  assert(recentReset, 'long run should contain a recent modal reset');
  const modalCreationId = sim._modalCreationById.get(modal.id);
  assert(modalCreationId, 'modal creation receipt should be indexed before compaction');

  const compacted = sim.compactHistory(160);
  assert(compacted && compacted.count > 0, 'old history should compact into a cold chunk');
  assert(sim.receipts.length < beforeHot, 'hot receipt object count should shrink');
  assert.strictEqual(sim.totalReceiptCount(), beforeTotal, 'exact receipt count must survive compaction');
  assert.strictEqual(sim.stateFingerprint(), beforeFingerprint, 'storage compaction must not change canonical fingerprint');
  assert(sim.coldHistory.length > 0, 'cold history chunk should exist');

  const ancestry = sim.causalAncestors(recentReset.id);
  assert(ancestry.some((receipt) => receipt.id === modalCreationId), 'causal ancestry must traverse from hot receipt into cold storage');
  assert.strictEqual(ancestry[ancestry.length - 1].id, recentReset.id);

  const restored = GardenSimulation.deserialize(sim.serialize());
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint(), 'cold history must survive export/import without drift');
  assert.strictEqual(restored.totalReceiptCount(), sim.totalReceiptCount());
  const restoredAncestry = restored.causalAncestors(recentReset.id);
  assert(restoredAncestry.some((receipt) => receipt.id === modalCreationId), 'cold causal ancestry must survive import');

  sim.run(24);
  restored.run(24);
  uncompressedTwin.run(24);
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint(), 'compacted/imported world must continue deterministically');
  assert.strictEqual(uncompressedTwin.stateFingerprint(), sim.stateFingerprint(), 'hot/cold storage representation must not alter future simulation trajectory');
})();

console.log('Anomaly Garden cold-history tests: PASS');
