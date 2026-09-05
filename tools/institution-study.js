'use strict';

const { GardenSimulation } = require('../src/v07.js');

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
    reports: sim.metrics.institutionReports,
    narrativeChanges: sim.metrics.narrativeChanges,
    proposals: sim.metrics.institutionProposals,
    commitments: sim.metrics.institutionCommitments,
    sessions: sim.metrics.institutionSessions,
    institutions: sim.institutions.map((institution) => ({
      id: institution.id,
      narrative: institution.narrative,
      evidenceWeight: institution.evidenceWeight,
      uniqueReporters: institution.reporters.length,
      reports: institution.reports.length
    }))
  };
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const count = Math.max(1, Number(process.argv[2] || 24));
const output = {};
for (const policy of ['off', 'tolerant', 'aggressive']) {
  const rows = [];
  for (let i = 1; i <= count; i += 1) rows.push(run(policy, 'policy-batch-' + String(i).padStart(3, '0')));
  const distributions = {};
  for (const row of rows) {
    for (const institution of row.institutions) {
      distributions[institution.id] ||= {};
      distributions[institution.id][institution.narrative] = (distributions[institution.id][institution.narrative] || 0) + 1;
    }
  }
  output[policy] = {
    runs: count,
    averageReports: Number(average(rows.map((row) => row.reports)).toFixed(2)),
    averageNarrativeChanges: Number(average(rows.map((row) => row.narrativeChanges)).toFixed(2)),
    averageProposals: Number(average(rows.map((row) => row.proposals)).toFixed(2)),
    averageCommitments: Number(average(rows.map((row) => row.commitments)).toFixed(2)),
    averageSessions: Number(average(rows.map((row) => row.sessions)).toFixed(2)),
    finalNarratives: distributions
  };
}

console.log(JSON.stringify({ experiment: 'bounded institution narrative distributions', seeds: count, results: output }, null, 2));
