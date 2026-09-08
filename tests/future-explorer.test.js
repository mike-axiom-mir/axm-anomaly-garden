'use strict';

const assert = require('assert');
const { GardenSimulation } = require('../src/v10.js');

(function compareAndForkTest() {
  const sim = new GardenSimulation({ seed: 'future-explorer-regression', repairPolicy: 'off' });
  const checkpoint = sim.createCheckpoint('baseline');

  sim.addAnomaly('gravity-slip', { x: 2, y: 2, radius: 2.2, intensity: 0.9, ttl: 30 });
  sim.run(18);
  const abandonedFingerprint = sim.stateFingerprint();
  const abandonedWorldDigest = sim._worldDigestFromState(sim._captureState(false, false));
  const rewindReceipt = sim.rewindToCheckpoint(checkpoint.id);
  assert(rewindReceipt, 'rewind should archive the first future');
  assert.strictEqual(sim.branchArchive.length, 1);
  const branchA = sim.branchArchive[0];
  assert.strictEqual(branchA.fingerprint, abandonedFingerprint);

  sim.addAnomaly('loop-echo', { x: 7, y: 4, radius: 2.2, intensity: 0.9, ttl: 30 });
  sim.run(18);
  const currentBeforeFork = sim.stateFingerprint();
  const branchCountBefore = sim.branchArchive.length;

  const comparison = sim.compareFutures(branchA.id, 'current');
  assert(comparison, 'comparison should be available');
  assert.strictEqual(comparison.divergence.kind, 'intervention-divergence');
  assert(comparison.divergence.a && comparison.divergence.b, 'both futures should have a first differing intervention');
  assert.strictEqual(comparison.a.worldDigest, abandonedWorldDigest);
  assert.notStrictEqual(comparison.a.worldDigest, comparison.b.worldDigest);

  const fork = sim.forkFromArchivedFuture(branchA.id);
  assert(fork, 'fork should restore archived future');
  assert.strictEqual(fork.previousCurrentFingerprint, currentBeforeFork);
  assert.strictEqual(fork.sourceWorldDigest, fork.restoredBaseWorldDigest, 'fork must restore the selected modeled world exactly before adding administrative receipts');
  assert.strictEqual(sim.branchArchive.length, branchCountBefore + 1, 'fork must preserve the prior current future as another archive');
  assert(sim.branchArchive.some((branch) => branch.id === branchA.id), 'source archive must remain retained');
  const preservedCurrent = sim.branchArchive.find((branch) => branch.id === fork.preservedCurrentBranchId);
  assert(preservedCurrent, 'previous current future must be archived');
  assert.strictEqual(preservedCurrent.fingerprint, currentBeforeFork);
  assert.strictEqual(sim.receipts[sim.receipts.length - 1].type, 'intervention.future-fork');
  assert.strictEqual(sim.receipts[sim.receipts.length - 1].payload.deletionCount, 0);
})();

(function sameInterventionStateDriftAlarmTest() {
  const sim = new GardenSimulation({ seed: 'future-drift-alarm', repairPolicy: 'off' });
  const checkpoint = sim.createCheckpoint('baseline');
  sim.run(4);
  sim.rewindToCheckpoint(checkpoint.id);
  const branch = sim.branchArchive[0];
  const cloned = JSON.parse(JSON.stringify(branch));
  cloned.id = 'branch-999';
  cloned.state.agents[0].x = (cloned.state.agents[0].x + 1) % sim.config.width;
  cloned.fingerprint = 'forced-drift';
  sim.branchArchive.push(cloned);
  const comparison = sim.compareFutures(branch.id, cloned.id);
  assert.strictEqual(comparison.divergence.kind, 'state-divergence-with-same-interventions');
})();

(function forkRoundTripTest() {
  const sim = new GardenSimulation({ seed: 'future-round-trip', repairPolicy: 'off' });
  const checkpoint = sim.createCheckpoint('baseline');
  sim.addAnomaly('memory-scar', { x: 3, y: 3, radius: 2, intensity: 0.8, ttl: 20 });
  sim.run(10);
  sim.rewindToCheckpoint(checkpoint.id);
  const sourceBranch = sim.branchArchive[0];
  sim.run(6);
  sim.forkFromArchivedFuture(sourceBranch.id);
  const restored = GardenSimulation.deserialize(sim.serialize());
  sim.run(8);
  restored.run(8);
  assert.strictEqual(sim.stateFingerprint(), restored.stateFingerprint(), 'forked state must continue deterministically after export/import');
})();

console.log('Anomaly Garden Future Explorer tests: PASS');
