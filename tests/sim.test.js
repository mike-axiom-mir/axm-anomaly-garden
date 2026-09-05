'use strict';

const assert = require('assert');
const { GardenSimulation, hashSeed } = require('../src/sim.js');

function compact(sim) {
  return {
    tick: sim.tick,
    metrics: sim.metrics,
    agents: sim.agents.map((a) => ({
      id: a.id, x: a.x, y: a.y, discrepancy: a.discrepancy, confidence: a.confidence,
      hypothesis: a.hypothesis, investigating: a.investigating, awakened: a.awakened,
      memory: a.memory, modalMemory: a.modalMemory
    })),
    anomalies: sim.anomalies,
    modals: sim.modalZones,
    relationships: sim.relationships,
    repairNodes: sim.repairNodes,
    repairPolicy: sim.repairPolicy,
    receipts: sim.receipts,
    fingerprint: sim.stateFingerprint()
  };
}

(function deterministicSeedTest() {
  const a = new GardenSimulation({ seed: 'same-world' });
  const b = new GardenSimulation({ seed: 'same-world' });
  a.addAnomaly('loop-echo', { x: 4, y: 3, radius: 2, intensity: 0.82, ttl: 24 });
  b.addAnomaly('loop-echo', { x: 4, y: 3, radius: 2, intensity: 0.82, ttl: 24 });
  a.run(40); b.run(40);
  assert.deepStrictEqual(compact(a), compact(b), 'same seed + same interventions must replay identically');
})();

(function differentSeedTest() {
  const a = new GardenSimulation({ seed: 'world-a' });
  const b = new GardenSimulation({ seed: 'world-b' });
  assert.notStrictEqual(hashSeed('world-a'), hashSeed('world-b'));
  assert.notDeepStrictEqual(a.agents, b.agents, 'different seeds should create different inhabitants/positions');
})();

(function receiptParentTest() {
  const sim = new GardenSimulation({ seed: 'causal', repairPolicy: 'off' });
  const anomaly = sim.addAnomaly('gravity-slip', { x: 5, y: 4, radius: 6, intensity: 1, ttl: 30 });
  sim.run(20);
  const observed = sim.receipts.find((r) => r.type === 'inhabitant.observed-anomaly' && r.payload.anomalyId === anomaly.id);
  assert(observed, 'high-coverage anomaly should eventually produce an observation receipt');
  assert.strictEqual(observed.parents.length, 1, 'observation should point to anomaly creation');
  const ancestry = sim.causalAncestors(observed.id);
  assert.strictEqual(ancestry[0].type, 'intervention.anomaly-added');
  assert.strictEqual(ancestry[ancestry.length - 1].id, observed.id);
})();

(function whisperIsReceiptTest() {
  const sim = new GardenSimulation({ seed: 'whisper' });
  const before = sim.receipts.length;
  const target = sim.agents[0];
  sim.whisper(target.id);
  assert.strictEqual(sim.receipts.length, before + 1);
  assert.strictEqual(sim.receipts[sim.receipts.length - 1].type, 'intervention.whisper');
  assert(target.discrepancy > 0);
})();

(function boundedWorldTest() {
  const sim = new GardenSimulation({ seed: 'bounds' });
  sim.run(250);
  for (const agent of sim.agents) {
    assert(agent.x >= 0 && agent.x < sim.config.width);
    assert(agent.y >= 0 && agent.y < sim.config.height);
  }
  for (const node of sim.repairNodes) {
    assert(node.x >= 0 && node.x < sim.config.width);
    assert(node.y >= 0 && node.y < sim.config.height);
  }
})();

(function relationshipTopologyTest() {
  const sim = new GardenSimulation({ seed: 'social-map' });
  assert(sim.relationships.length >= sim.agents.length, 'persistent topology should at least connect the ring');
  const degree = new Map(sim.agents.map((a) => [a.id, 0]));
  for (const r of sim.relationships) {
    assert(degree.has(r.a) && degree.has(r.b), 'relationship endpoints must exist');
    degree.set(r.a, degree.get(r.a) + 1);
    degree.set(r.b, degree.get(r.b) + 1);
  }
  for (const count of degree.values()) assert(count >= 2, 'ring should prevent isolated inhabitants');
})();

(function modalLoopTest() {
  const sim = new GardenSimulation({ seed: 'modal', repairPolicy: 'off' });
  const target = sim.agents[0];
  const zone = sim.addModal({ x: target.x, y: target.y, radius: 6, period: 5, memoryLeak: 1 });
  assert(zone.anchors.length > 0, 'modal should capture inhabitants in range');
  sim.run(11);
  assert(sim.metrics.modalResets >= 2, 'modal should reset on its period');
  assert(sim.metrics.memoryLeaks > 0, '100% memory leak should emit retained fragments');
  assert(sim.receipts.some((r) => r.type === 'world.modal-reset'));
  assert(sim.receipts.some((r) => r.type === 'inhabitant.modal-memory-leak'));
})();

(function repairProgramTest() {
  const sim = new GardenSimulation({ seed: 'repair-me', repairPolicy: 'aggressive' });
  const node = sim.repairNodes[0];
  const anomaly = sim.addAnomaly('gravity-slip', { x: node.x, y: node.y, radius: 2, intensity: 1, ttl: 60 });
  const before = anomaly.intensity;
  sim.run(12);
  assert(sim.metrics.repairActions > 0, 'aggressive repair nodes should act on local anomalies');
  assert(anomaly.intensity < before || anomaly.active === false, 'repair must reduce or close anomaly');
  assert(sim.receipts.some((r) => r.type === 'program.repair-action'));
})();

(function checkpointRewindTest() {
  const sim = new GardenSimulation({ seed: 'rewind', repairPolicy: 'off' });
  sim.addAnomaly('time-pocket', { x: 2, y: 2, radius: 3, intensity: 0.9, ttl: 40 });
  sim.run(7);
  const cp = sim.createCheckpoint('before-fork');
  const fingerprintAtCheckpoint = sim.stateFingerprint();
  sim.run(13);
  sim.whisper(sim.agents[0].id);
  const fromTick = sim.tick;
  const receipt = sim.rewindToCheckpoint(cp.id);
  assert(receipt, 'rewind should return a receipt');
  assert.strictEqual(sim.tick, cp.tick, 'rewind should restore simulation tick');
  assert.notStrictEqual(fromTick, sim.tick);
  assert.strictEqual(receipt.type, 'intervention.rewind');
  assert.strictEqual(sim.receipts[sim.receipts.length - 1].type, 'intervention.rewind');
  assert.notStrictEqual(sim.stateFingerprint(), fingerprintAtCheckpoint, 'rewind receipt intentionally creates a new final-branch state');
})();

(function serializeRoundTripTest() {
  const sim = new GardenSimulation({ seed: 'archive', repairPolicy: 'tolerant' });
  sim.addAnomaly('memory-scar', { x: 3, y: 4, radius: 2.5, intensity: 0.88, ttl: 30 });
  sim.addModal({ x: 5, y: 4, radius: 3, period: 7, memoryLeak: 0.4 });
  sim.run(18);
  sim.createCheckpoint('archive-point');
  const text = sim.serialize();
  const restored = GardenSimulation.deserialize(text);
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint(), 'serialized state should restore exactly');
  assert.deepStrictEqual(compact(restored), compact(sim), 'serialized state should preserve inspectable state');
  sim.run(12);
  restored.run(12);
  assert.deepStrictEqual(compact(restored), compact(sim), 'restored RNG state must continue deterministically');
})();

console.log('Anomaly Garden simulation tests: PASS');
