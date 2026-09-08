'use strict';

const { GardenSimulation } = require('../src/v11.js');

const sim = new GardenSimulation({ seed: 'nested-modal-study-001', repairPolicy: 'off' });
const anchor = sim.agents[0];
const root = sim.addModal({ x: anchor.x, y: anchor.y, radius: 3.2, period: 12, memoryLeak: 0.16 });
const child = sim.addNestedModal(root.id, { x: root.x, y: root.y, radius: 1.6, period: 7, memoryLeak: 0.28 });
const grand = sim.addNestedModal(child.id, { x: child.x, y: child.y, radius: 0.9, period: 5, memoryLeak: 0.36 });

sim.run(96);
const future = sim.listFutures()[0];
const nestedResetReceipts = sim.receipts.filter((receipt) => receipt.type === 'world.modal-reset' && receipt.payload && receipt.payload.nested);
const parentResetReceipts = nestedResetReceipts.filter((receipt) => receipt.payload.cause === 'parent-reset');
const localResetReceipts = nestedResetReceipts.filter((receipt) => receipt.payload.cause === 'local-period');

console.log(JSON.stringify({
  tick: sim.tick,
  root: root.id,
  child: child.id,
  grandchild: grand.id,
  worldDigest: future.worldDigest,
  fingerprint: sim.stateFingerprint(),
  modalTree: sim.modalTree(),
  nestedCreated: sim.metrics.nestedModalsCreated,
  nestedResets: sim.metrics.nestedModalResets,
  localPeriodResets: localResetReceipts.length,
  parentCascadeResets: parentResetReceipts.length,
  nestedMemoryLeaks: sim.metrics.nestedMemoryLeaks,
  totalModalResets: sim.metrics.modalResets
}, null, 2));
