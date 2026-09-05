'use strict';

const assert = require('assert');
const { GardenSimulation, hashSeed } = require('../src/sim.js');

function compact(sim) {
  return {
    tick: sim.tick,
    metrics: sim.metrics,
    agents: sim.agents.map((a) => ({ id: a.id, x: a.x, y: a.y, discrepancy: a.discrepancy, confidence: a.confidence, hypothesis: a.hypothesis, investigating: a.investigating, awakened: a.awakened, memory: a.memory })),
    anomalies: sim.anomalies,
    receipts: sim.receipts
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
  const sim = new GardenSimulation({ seed: 'causal' });
  const anomaly = sim.addAnomaly('gravity-slip', { x: 5, y: 4, radius: 6, intensity: 1, ttl: 30 });
  sim.run(20);
  const observed = sim.receipts.find((r) => r.type === 'inhabitant.observed-anomaly' && r.payload.anomalyId === anomaly.id);
  assert(observed, 'high-coverage anomaly should eventually produce an observation receipt');
  assert(observed.parents.length === 1, 'observation should point to anomaly creation');
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
})();

console.log('Anomaly Garden simulation tests: PASS');
