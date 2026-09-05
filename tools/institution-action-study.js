'use strict';

const { GardenSimulation } = require('../src/v07.js');

function run(enabled, seed) {
  const sim = new GardenSimulation({ seed, repairPolicy: 'tolerant', config: { institutionActionEnabled: enabled } });
  sim.addModal({ x: 5, y: 4, radius: 3.4, period: 11, memoryLeak: 0.32 });
  sim.addAnomaly('loop-echo', { x: 5, y: 4, radius: 3.2, intensity: 0.9, ttl: 48 });
  sim.run(9);
  sim.whisper(sim.agents[0].id);
  sim.run(13);
  sim.addAnomaly('gravity-slip', { x: 7, y: 3, radius: 2.8, intensity: 0.88, ttl: 42 });
  sim.run(58);
  return {
    investigations: sim.metrics.investigations,
    modelBreaks: sim.metrics.awakenings,
    production: sim.metrics.production,
    meetings: sim.metrics.socialMeetings,
    projects: sim.metrics.projectsCompleted,
    reports: sim.metrics.institutionReports,
    narrativeChanges: sim.metrics.narrativeChanges,
    proposals: sim.metrics.institutionProposals,
    commitments: sim.metrics.institutionCommitments,
    sessions: sim.metrics.institutionSessions,
    receipts: sim.totalReceiptCount()
  };
}

function average(rows, key) {
  return rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
}

const count = Math.max(1, Number(process.argv[2] || 24));
const results = {};
for (const enabled of [false, true]) {
  const rows = [];
  for (let i = 1; i <= count; i += 1) rows.push(run(enabled, 'institution-action-' + String(i).padStart(3, '0')));
  results[enabled ? 'proposals-enabled' : 'proposals-disabled'] = {
    runs: count,
    averages: Object.fromEntries(['investigations', 'modelBreaks', 'production', 'meetings', 'projects', 'reports', 'narrativeChanges', 'proposals', 'commitments', 'sessions', 'receipts'].map((key) => [key, Number(average(rows, key).toFixed(2))]))
  };
}
console.log(JSON.stringify({ experiment: 'bounded institution action proposal toggle under the same scripted perturbation shape', seeds: count, results }, null, 2));
