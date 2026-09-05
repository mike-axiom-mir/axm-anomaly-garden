'use strict';

const { GardenSimulation } = require('../src/v07.js');

const sim = new GardenSimulation({ seed: 'history-compaction-study', repairPolicy: 'tolerant' });
sim.addModal({ x: 5, y: 4, radius: 4, period: 10, memoryLeak: 0.35 });
for (let tick = 0; tick < 1200; tick += 1) {
  if (tick % 120 === 20) sim.addAnomaly('loop-echo', { x: 5, y: 4, radius: 3.2, intensity: 0.9, ttl: 55 });
  sim.step();
}

const beforeFingerprint = sim.stateFingerprint();
const beforeTotal = sim.totalReceiptCount();
const beforeHot = sim.receipts.length;
const beforeBytes = Buffer.byteLength(sim.serialize());
const recentReset = sim.receipts.slice().reverse().find((receipt) => receipt.type === 'world.modal-reset');
const creationId = recentReset && recentReset.parents[0];
const compacted = sim.compactHistory(192);
const afterBytes = Buffer.byteLength(sim.serialize());
const ancestry = recentReset ? sim.causalAncestors(recentReset.id) : [];

console.log(JSON.stringify({
  experiment: 'exact cold-history representation compaction',
  tick: sim.tick,
  fingerprintBefore: beforeFingerprint,
  fingerprintAfter: sim.stateFingerprint(),
  fingerprintPreserved: beforeFingerprint === sim.stateFingerprint(),
  totalReceiptsBefore: beforeTotal,
  totalReceiptsAfter: sim.totalReceiptCount(),
  hotReceiptsBefore: beforeHot,
  hotReceiptsAfter: sim.receipts.length,
  coldReceiptsAfter: sim.coldHistory.reduce((sum, chunk) => sum + chunk.count, 0),
  serializedBytesBefore: beforeBytes,
  serializedBytesAfter: afterBytes,
  serializedReductionPercent: Number(((1 - afterBytes / beforeBytes) * 100).toFixed(2)),
  compacted,
  coldParentStillQueryable: Boolean(creationId && ancestry.some((receipt) => receipt.id === creationId))
}, null, 2));
