'use strict';

const { GardenSimulation } = require('../src/sim.js');

function run(policy, seed) {
  const sim = new GardenSimulation({ seed, repairPolicy: policy });
  sim.addModal({ x: 5, y: 4, radius: 3.4, period: 11, memoryLeak: 0.32 });
  sim.addAnomaly('loop-echo', { x: 5, y: 4, radius: 3.2, intensity: 0.9, ttl: 48 });
  sim.run(9);
  sim.whisper(sim.agents[0].id);
  sim.run(13);
  sim.addAnomaly('gravity-slip', { x: 7, y: 3, radius: 2.8, intensity: 0.88, ttl: 42 });
  sim.run(58);
  return {
    policy,
    tick: sim.tick,
    fingerprint: sim.stateFingerprint(),
    activeAnomalies: sim.anomalies.filter((a) => a.active).length,
    observations: sim.metrics.observations,
    investigations: sim.metrics.investigations,
    modelBreaks: sim.metrics.awakenings,
    socialSignals: sim.metrics.socialSignals,
    repairs: sim.metrics.repairActions,
    modalResets: sim.metrics.modalResets,
    memoryLeaks: sim.metrics.memoryLeaks,
    receipts: sim.receipts.length
  };
}

const seed = process.argv[2] || 'policy-comparison-001';
const results = ['off', 'tolerant', 'aggressive'].map((policy) => run(policy, seed));
console.log(JSON.stringify({ seed, results }, null, 2));
