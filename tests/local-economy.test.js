const assert = require('assert');
const { GardenSimulation } = require('../src/v14.js');

function build(seed, config) {
  const sim = new GardenSimulation({ seed: seed || 'local-economy-test', config: config || {} });
  const root = sim.addModal({ x: 5, y: 4, radius: 3.8, period: 30, memoryLeak: 0.2 });
  const child = sim.addNestedModal(root.id, { x: 5, y: 4, radius: 2.0, period: 19, memoryLeak: 0.3 });
  sim.initializeModalSubworld(child.id, { population: 3, width: 7, height: 7 });
  return { sim, root, child };
}

(function tasksCreateARealBoundedResourceLoop() {
  const { sim, child } = build('economy-task');
  const resident = child.subworld.residents[0];
  const before = child.subworld.economy.stock.food;
  const receipt = sim.performSubworldTask(child.id, resident.id, 'forage');
  assert.strictEqual(receipt.type, 'subworld.task-completed');
  assert.strictEqual(child.subworld.economy.stock.food, before + 2);
  assert.strictEqual(resident.completedTasks, 1);
  assert(sim.metrics.subworldTasksCompleted >= 1);
})();

(function missingInputsBlockTasksWithoutInventingResources() {
  const { sim, child } = build('economy-block');
  const resident = child.subworld.residents[0];
  child.subworld.economy.stock.material = 0;
  const beforeEnergy = child.subworld.economy.stock.energy;
  const blocked = sim.performSubworldTask(child.id, resident.id, 'maintain-grid');
  assert.strictEqual(blocked.type, 'subworld.task-blocked');
  assert.strictEqual(blocked.payload.reason, 'missing-material');
  assert.strictEqual(child.subworld.economy.stock.energy, beforeEnergy);
})();

(function voluntaryCreditTransferIsExplicit() {
  const { sim, child } = build('credit-transfer');
  const from = child.subworld.residents[0];
  const to = child.subworld.residents[1];
  from.credits = 5;
  const before = to.credits;
  const receipt = sim.transferSubworldCredits(child.id, from.id, to.id, 2, 'shared-tool');
  assert.strictEqual(receipt.type, 'subworld.credit-transferred');
  assert.strictEqual(from.credits, 3);
  assert.strictEqual(to.credits, before + 2);
})();

(function securityRolePolicyIsLocalAndExplicit() {
  const { sim, child } = build('security-policy');
  sim.setSubworldSecurityPolicy(child.id, { name: 'repair-only', allowedRoles: ['observer', 'repairer'] });
  assert.throws(() => sim.deploySecurityProgram(child.id, 'warden', { x: 1, y: 1 }), /denied by local policy/);
  const repairer = sim.deploySecurityProgram(child.id, 'repairer', { x: 1, y: 1, budget: 3 });
  assert.strictEqual(repairer.securityBudget, 3);
})();

(function securityActionsSpendFiniteBudget() {
  const { sim, child } = build('security-budget');
  const target = sim.seedSubworldProgram(child.id, 'replicator', { x: 2, y: 1, authorization: 'denied', period: 20 });
  const warden = sim.deploySecurityProgram(child.id, 'warden', { x: 1, y: 1, sensorRadius: 5, actionRadius: 5, budget: 2 });
  sim.run(1);
  assert(child.subworld.programs.find((item) => item.id === target.id).quarantined);
  assert.strictEqual(warden.securityBudget, 0);
  assert.strictEqual(warden.securitySpent, 2);
  const second = sim.seedSubworldProgram(child.id, 'replicator', { x: 2, y: 2, authorization: 'denied', period: 20, persistAcrossResets: false });
  sim.run(1);
  assert.strictEqual(child.subworld.programs.find((item) => item.id === second.id).quarantined, false);
  assert(sim.receipts.some((r) => r.type === 'security.action-blocked' && r.payload.targetId === second.id && r.payload.reason === 'budget-exhausted'));
})();

(function shortagesBecomeResidentVisiblePressureNotHiddenDeletion() {
  const { sim, child } = build('resource-shortage', { subworldInitialFood: 0, subworldEconomyPeriod: 99, subworldConsumptionPeriod: 2 });
  const before = child.subworld.residents.map((resident) => resident.discrepancy);
  sim.run(2);
  assert(sim.metrics.subworldResourceShortages > 0);
  assert(child.subworld.economy.shortages > 0);
  assert(child.subworld.residents.some((resident, index) => resident.discrepancy > before[index]));
  assert(sim.receipts.some((r) => r.type === 'subworld.resource-shortage' && r.payload.modalId === child.id));
})();

(function economyAndBudgetsRoundTripDeterministically() {
  const { sim, child } = build('economy-roundtrip');
  const resident = child.subworld.residents[0];
  sim.performSubworldTask(child.id, resident.id, 'forage');
  sim.deploySecurityProgram(child.id, 'observer', { x: 1, y: 1, budget: 4 });
  sim.run(7);
  const restored = GardenSimulation.deserialize(sim.serialize());
  assert.strictEqual(restored.version, '0.14.0');
  assert.deepStrictEqual(restored.subworldSummary(child.id).economy, sim.subworldSummary(child.id).economy);
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint());
  sim.run(6);
  restored.run(6);
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint());
})();

console.log('Anomaly Garden local economy/governance tests: PASS');