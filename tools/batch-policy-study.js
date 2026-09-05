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
    observations: sim.metrics.observations,
    investigations: sim.metrics.investigations,
    modelBreaks: sim.metrics.awakenings,
    socialSignals: sim.metrics.socialSignals,
    repairs: sim.metrics.repairActions,
    modalResets: sim.metrics.modalResets,
    memoryLeaks: sim.metrics.memoryLeaks,
    testsRun: sim.metrics.testsRun,
    production: sim.metrics.production,
    socialMeetings: sim.metrics.socialMeetings,
    projectsCompleted: sim.metrics.projectsCompleted,
    resourcesAcquired: sim.metrics.resourcesAcquired,
    resourcesUsed: sim.metrics.resourcesUsed,
    institutionReports: sim.metrics.institutionReports,
    narrativeChanges: sim.metrics.narrativeChanges,
    institutionBroadcasts: sim.metrics.institutionBroadcasts,
    institutionProposals: sim.metrics.institutionProposals,
    institutionCommitments: sim.metrics.institutionCommitments,
    institutionSessions: sim.metrics.institutionSessions,
    receipts: sim.totalReceiptCount()
  };
}

function average(rows, key) {
  return rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
}

const count = Math.max(1, Number(process.argv[2] || 24));
const policies = ['off', 'tolerant', 'aggressive'];
const all = {};
for (const policy of policies) {
  const rows = [];
  for (let i = 1; i <= count; i += 1) rows.push(run(policy, 'policy-batch-' + String(i).padStart(3, '0')));
  all[policy] = {
    runs: rows.length,
    averages: {
      observations: Number(average(rows, 'observations').toFixed(2)),
      investigations: Number(average(rows, 'investigations').toFixed(2)),
      modelBreaks: Number(average(rows, 'modelBreaks').toFixed(2)),
      socialSignals: Number(average(rows, 'socialSignals').toFixed(2)),
      repairs: Number(average(rows, 'repairs').toFixed(2)),
      memoryLeaks: Number(average(rows, 'memoryLeaks').toFixed(2)),
      testsRun: Number(average(rows, 'testsRun').toFixed(2)),
      production: Number(average(rows, 'production').toFixed(2)),
      socialMeetings: Number(average(rows, 'socialMeetings').toFixed(2)),
      projectsCompleted: Number(average(rows, 'projectsCompleted').toFixed(2)),
      resourcesAcquired: Number(average(rows, 'resourcesAcquired').toFixed(2)),
      resourcesUsed: Number(average(rows, 'resourcesUsed').toFixed(2)),
      institutionReports: Number(average(rows, 'institutionReports').toFixed(2)),
      narrativeChanges: Number(average(rows, 'narrativeChanges').toFixed(2)),
      institutionBroadcasts: Number(average(rows, 'institutionBroadcasts').toFixed(2)),
      institutionProposals: Number(average(rows, 'institutionProposals').toFixed(2)),
      institutionCommitments: Number(average(rows, 'institutionCommitments').toFixed(2)),
      institutionSessions: Number(average(rows, 'institutionSessions').toFixed(2)),
      receipts: Number(average(rows, 'receipts').toFixed(2))
    },
    modelBreakFreeRuns: rows.filter((row) => row.modelBreaks === 0).length,
    investigationFreeRuns: rows.filter((row) => row.investigations === 0).length
  };
}
console.log(JSON.stringify({ experiment: 'same scripted perturbations across repair policies', seeds: count, results: all }, null, 2));
