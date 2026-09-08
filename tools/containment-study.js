'use strict';
const { GardenSimulation } = require('../src/v09.js');
const seeds = Math.max(1, Number(process.argv[2] || 24));
const ticks = Math.max(1, Number(process.argv[3] || 120));

function run(policy, i) {
  const sim = new GardenSimulation({ seed: 'containment-study-' + String(i + 1).padStart(2, '0'), replicationPolicy: 'open', containmentPolicy: policy });
  sim.seedReplicator({ x: 6, y: 4 });
  sim.run(ticks);
  return {
    active: sim.activeReplicators().length,
    quarantined: sim.quarantinedReplicators().length,
    total: sim.machinePrograms.length,
    load: sim.systemLoad(),
    viability: sim.systemViability(),
    strain: sim.metrics.strainEvents || 0,
    observations: sim.metrics.observations || 0,
    investigations: sim.metrics.investigations || 0,
    modelBreaks: sim.metrics.awakenings || 0,
    cycles: sim.metrics.containmentCycles || 0
  };
}

function avg(rows, key) { return rows.reduce((sum, row) => sum + Number(row[key] || 0), 0) / rows.length; }
for (const policy of ['off', 'quarantine']) {
  const rows = Array.from({ length: seeds }, (_, i) => run(policy, i));
  const out = {};
  for (const key of Object.keys(rows[0])) out[key] = Number(avg(rows, key).toFixed(2));
  console.log(policy + ': ' + JSON.stringify(out));
}