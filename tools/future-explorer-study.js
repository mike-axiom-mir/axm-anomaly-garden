'use strict';

const { GardenSimulation } = require('../src/v10.js');

const sim = new GardenSimulation({ seed: 'future-explorer-study', repairPolicy: 'off' });
const checkpoint = sim.createCheckpoint('baseline');
sim.addAnomaly('gravity-slip', { x: 2, y: 2, radius: 2.4, intensity: 0.9, ttl: 32 });
sim.run(20);
sim.rewindToCheckpoint(checkpoint.id);
const branchA = sim.branchArchive[0];
sim.addAnomaly('loop-echo', { x: 8, y: 4, radius: 2.4, intensity: 0.9, ttl: 32 });
sim.run(20);
const comparison = sim.compareFutures(branchA.id, 'current');
console.log(JSON.stringify({
  sourceBranch: branchA.id,
  current: sim.stateFingerprint(),
  divergence: comparison.divergence,
  worldA: comparison.a.worldDigest,
  worldB: comparison.b.worldDigest,
  metricDelta: comparison.metricDelta
}, null, 2));
const fork = sim.forkFromArchivedFuture(branchA.id);
console.log(JSON.stringify({ fork, futures: sim.listFutures().map((future) => ({ id: future.id, tick: future.tick, worldDigest: future.worldDigest, fingerprint: future.fingerprint })) }, null, 2));
