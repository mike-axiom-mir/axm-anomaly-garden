'use strict';

const assert = require('assert');
const fs = require('fs');
const { GardenSimulation } = require('../src/v11.js');

function build(seed) {
  const sim = new GardenSimulation({ seed: seed || 'nested-modal-test', repairPolicy: 'off' });
  const anchor = sim.agents[0];
  const root = sim.addModal({ x: anchor.x, y: anchor.y, radius: 3.2, period: 12, memoryLeak: 0.15 });
  const rngBefore = sim.random.getState();
  const child = sim.addNestedModal(root.id, { x: root.x, y: root.y, radius: 1.6, period: 7, memoryLeak: 0.25 });
  assert.strictEqual(sim.random.getState(), rngBefore, 'explicit nested Modal creation must not consume parent RNG');
  const grand = sim.addNestedModal(child.id, { x: child.x, y: child.y, radius: 0.9, period: 5, memoryLeak: 0.35 });
  return { sim, root, child, grand };
}

{
  const { sim, root, child, grand } = build('nested-structure');
  assert.strictEqual(child.parentModalId, root.id);
  assert.strictEqual(child.depth, 1);
  assert.strictEqual(grand.parentModalId, child.id);
  assert.strictEqual(grand.depth, 2);
  assert(sim._modalCreationById.get(child.id), 'child creation receipt must be indexed');
  const childReceipt = sim._getReceipt(sim._modalCreationById.get(child.id));
  assert(childReceipt.parents.includes(sim._modalCreationById.get(root.id)), 'child creation must causally link to parent creation');

  const great = sim.addNestedModal(grand.id, { x: grand.x, y: grand.y, radius: 0.6, period: 4, memoryLeak: 0.4 });
  assert.strictEqual(great.depth, 3);
  assert.throws(() => sim.addNestedModal(great.id, { x: great.x, y: great.y, radius: 0.6 }), /depth limit/i);
  assert.throws(() => sim.addNestedModal(root.id, { x: root.x + root.radius, y: root.y, radius: 1 }), /fit completely/i);
}

{
  const a = build('nested-determinism').sim;
  const b = build('nested-determinism').sim;
  a.run(48);
  b.run(48);
  assert.strictEqual(a.stateFingerprint(), b.stateFingerprint(), 'same seed/actions must produce identical nested future');
  assert(a.metrics.nestedModalResets > 0, 'nested local resets should occur');
  assert(a.metrics.nestedParentCascadeResets > 0, 'root resets should cascade into nested layers');
  const nestedResets = a.receipts.filter((receipt) => receipt.type === 'world.modal-reset' && receipt.payload && receipt.payload.nested);
  assert(nestedResets.length > 0, 'nested reset receipts should exist');
  assert(nestedResets.some((receipt) => receipt.payload.cause === 'parent-reset'), 'parent reset cause must be explicit');
  assert(nestedResets.every((receipt) => receipt.parents.length > 0), 'nested reset must keep causal parents');
}

{
  const { sim } = build('nested-roundtrip');
  sim.run(31);
  const restored = GardenSimulation.deserialize(sim.serialize());
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint(), 'nested state must survive serialization exactly');
  sim.run(23);
  restored.run(23);
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint(), 'restored nested world must continue deterministically');
  assert.deepStrictEqual(restored.modalTree(), sim.modalTree(), 'modal tree must survive deterministic continuation');
}

{
  const source = fs.readFileSync(require.resolve('../src/v11.js'), 'utf8');
  assert(!source.includes('this.random('), 'v0.11 nested-local execution must not consume parent simulation RNG directly');
}

console.log('Anomaly Garden nested-Modal tests: PASS');
