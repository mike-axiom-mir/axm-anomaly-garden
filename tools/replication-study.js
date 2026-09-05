'use strict';

const { GardenSimulation } = require('../src/v08.js');

function run(policy, seed, ticks) {
  const sim = new GardenSimulation({ seed, replicationPolicy: policy, repairPolicy: 'off' });
  sim.seedReplicator({ x: 5, y: 4 });
  sim.run(ticks);
  return {
    policy,
    programs: sim.machinePrograms.length,
    copies: sim.metrics.replicatorCopies,
    refusals: sim.metrics.replicatorRefusals,
    blocked: sim.metrics.replicatorBlocked,
    strainEvents: sim.metrics.strainEvents,
    peakLoad: sim.metrics.peakSystemLoad,
    finalLoad: Number(sim.systemLoad().toFixed(4)),
    viability: sim.systemViability(),
    anomaliesCreatedByStrain: sim.receipts.filter((receipt) => receipt.type === 'machine.system-strain-anomaly').length,
    observations: sim.metrics.observations,
    investigations: sim.metrics.investigations,
    modelBreaks: sim.metrics.awakenings,
    receipts: sim.totalReceiptCount(),
    fingerprint: sim.stateFingerprint()
  };
}

const count = Math.max(1, Number(process.argv[2] || 24));
const ticks = Math.max(20, Number(process.argv[3] || 240));
const out = {};
for (const policy of ['off', 'bounded', 'open']) {
  const rows = [];
  for (let i = 1; i <= count; i += 1) rows.push(run(policy, 'replication-study-' + String(i).padStart(3, '0'), ticks));
  const avg = (key) => Number((rows.reduce((sum, row) => sum + row[key], 0) / rows.length).toFixed(2));
  out[policy] = {
    runs: count,
    averages: Object.fromEntries(['programs','copies','refusals','blocked','strainEvents','peakLoad','finalLoad','viability','anomaliesCreatedByStrain','observations','investigations','modelBreaks','receipts'].map((key) => [key, avg(key)]))
  };
}
console.log(JSON.stringify({ experiment: 'locally valid replication under shared global capacity', ticks, seeds: count, results: out }, null, 2));
