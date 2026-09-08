const assert = require('assert');
const { GardenSimulation } = require('../src/v13.js');

function build(seed) {
  const sim = new GardenSimulation({ seed: seed || 'cross-layer-test' });
  const root = sim.addModal({ x: 5, y: 4, radius: 3.8, period: 20, memoryLeak: 0.3 });
  const child = sim.addNestedModal(root.id, { x: 5, y: 4, radius: 2.2, period: 13, memoryLeak: 0.4 });
  const grandchild = sim.addNestedModal(child.id, { x: 5, y: 4, radius: 1.0, period: 9, memoryLeak: 0.4 });
  sim.initializeModalSubworld(child.id, { population: 3, width: 7, height: 7 });
  sim.initializeModalSubworld(grandchild.id, { population: 2, width: 5, height: 5 });
  return { sim, root, child, grandchild };
}

(function directParentChildGateOnly() {
  const { sim, child, grandchild } = build('gate-relation');
  const resident = child.subworld.residents[0];
  const gate = sim.createSubworldGate(child.id, grandchild.id, { fromX: resident.x, fromY: resident.y, toX: 2, toY: 2 });
  assert.strictEqual(gate.from.modalId, child.id);
  assert.strictEqual(gate.to.modalId, grandchild.id);
  assert.throws(() => sim.createSubworldGate(child.id, child.id), /must differ/);
})();

(function residentTransitPreservesIdentityMemoryAndHistory() {
  const { sim, child, grandchild } = build('resident-transit');
  const resident = child.subworld.residents[0];
  resident.memory.push({ localTick: 0, receiptId: sim._receipt('test.source-memory', { residentId: resident.id }, []).id, summary: 'remembered source' });
  const gate = sim.createSubworldGate(child.id, grandchild.id, { fromX: resident.x, fromY: resident.y, toX: 1, toY: 2, accessRadius: 0.5 });
  const receipt = sim.transitResident(gate.id, resident.id, child.id);
  assert.strictEqual(receipt.type, 'subworld.resident-transited');
  assert.strictEqual(child.subworld.residents.some((item) => item.id === resident.id), false);
  const moved = grandchild.subworld.residents.find((item) => item.id === resident.id);
  assert(moved);
  assert.strictEqual(moved.memory.length, 1);
  assert.strictEqual(moved.transitHistory.length, 1);
  assert.strictEqual(moved.transitHistory[0].fromModalId, child.id);
  assert.strictEqual(moved.transitHistory[0].toModalId, grandchild.id);
  assert.strictEqual(sim.metrics.subworldResidentTransits, 1);
})();

(function proximityAndDirectionAreRealGates() {
  const { sim, child, grandchild } = build('gate-bounds');
  const resident = child.subworld.residents[0];
  const gate = sim.createSubworldGate(child.id, grandchild.id, { fromX: 0, fromY: 0, toX: 1, toY: 1, accessRadius: 0.25, bidirectional: false });
  resident.x = child.subworld.width - 1;
  resident.y = child.subworld.height - 1;
  const blocked = sim.transitResident(gate.id, resident.id, child.id);
  assert.strictEqual(blocked.payload.reason, 'resident-outside-gate-radius');
  const targetResident = grandchild.subworld.residents[0];
  targetResident.x = gate.to.x;
  targetResident.y = gate.to.y;
  const reverse = sim.transitResident(gate.id, targetResident.id, grandchild.id);
  assert.strictEqual(reverse.payload.reason, 'direction-not-allowed');
})();

(function sourceLinkedEvidenceCanCrossWithoutRawTruth() {
  const { sim, child, grandchild } = build('evidence-handoff');
  const resident = child.subworld.residents[0];
  const evidence = sim._receipt('subworld.test-evidence', { modalId: child.id, residentId: resident.id }, []);
  resident.memory.push({ localTick: child.subworld.tick, receiptId: evidence.id, summary: 'local test contradicted expectation' });
  const gate = sim.createSubworldGate(child.id, grandchild.id, { fromX: resident.x, fromY: resident.y, toX: 2, toY: 2, accessRadius: 0.5 });
  const handoff = sim.handoffResidentEvidence(gate.id, resident.id, evidence.id, child.id);
  assert.strictEqual(handoff.type, 'subworld.evidence-handed-off');
  assert.strictEqual(grandchild.subworld.inboundEvidence.length, 1);
  assert.strictEqual(grandchild.subworld.inboundEvidence[0].sourceReceiptId, evidence.id);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(grandchild.subworld.inboundEvidence[0], 'machineTruth'), false);
})();

(function serializationKeepsGateFabricAndContinuation() {
  const { sim, child, grandchild } = build('gate-roundtrip');
  const resident = child.subworld.residents[0];
  const gate = sim.createSubworldGate(child.id, grandchild.id, { fromX: resident.x, fromY: resident.y, toX: 2, toY: 2, accessRadius: 0.5 });
  sim.transitResident(gate.id, resident.id, child.id);
  const restored = GardenSimulation.deserialize(sim.serialize());
  assert.strictEqual(restored.version, '0.13.0');
  assert.deepStrictEqual(restored.subworldGates, sim.subworldGates);
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint());
  sim.run(5);
  restored.run(5);
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint());
})();

console.log('Anomaly Garden cross-layer gate tests: PASS');