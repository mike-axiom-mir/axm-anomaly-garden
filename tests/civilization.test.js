const assert = require('assert');
const { GardenSimulation } = require('../src/v15.js');

function build(seed, config) {
  const sim = new GardenSimulation({ seed: seed || 'civilization-test', config: Object.assign({ subworldAssemblyPeriod: 9 }, config || {}) });
  const root = sim.addModal({ x: 5, y: 4, radius: 4.0, period: 80, memoryLeak: 0.2 });
  const child = sim.addNestedModal(root.id, { x: 5, y: 4, radius: 2.2, period: 60, memoryLeak: 0.35 });
  sim.initializeModalSubworld(child.id, { population: 4, width: 7, height: 7 });
  return { sim, root, child };
}

(function experimentsRequireResidentKnowledge() {
  const { sim, child } = build('experiment-knowledge');
  const resident = child.subworld.residents[0];
  const anomaly = sim.seedSubworldAnomaly(child.id, 'local-distortion', { x: 3, y: 3, radius: 7, intensity: 1, ttl: 100 });
  const blocked = sim.runResidentExperiment(child.id, resident.id, anomaly.id);
  assert.strictEqual(blocked.type, 'subworld.experiment-blocked');
  assert.strictEqual(blocked.payload.reason, 'target-not-observed-by-resident');
})();

(function repeatedResidentExperimentsProduceRealInvestigationAndModelBreaks() {
  const { sim, child } = build('experiment-model-break', { subworldInvestigationPeriod: 2 });
  sim.seedSubworldAnomaly(child.id, 'local-distortion', { x: 3, y: 3, radius: 20, intensity: 1, ttl: 100 });
  sim.run(18);
  const summary = sim.subworldSummary(child.id);
  assert(summary.experiments > 0);
  assert(sim.metrics.subworldResidentExperiments > 0);
  assert(sim.metrics.subworldResidentInvestigations > 0);
  assert(sim.metrics.subworldResidentModelBreaks > 0);
  assert(child.subworld.residents.some((resident) => resident.modelBreak));
  assert(sim.receipts.some((r) => r.type === 'subworld.inhabitant-ran-experiment' && r.payload.contradiction === true));
})();

(function assembliesUseSourceLinkedResidentEvidenceAndPreserveDissent() {
  const { sim, child } = build('assembly-dissent', { subworldInvestigationPeriod: 2, subworldAssemblyPeriod: 50 });
  const anomaly = sim.seedSubworldAnomaly(child.id, 'local-distortion', { x: 3, y: 3, radius: 20, intensity: 1, ttl: 100 });
  sim.run(12);
  const residents = child.subworld.residents;
  assert(residents.some((resident) => resident.modelBreak));
  // Keep at least one member in a competing stance so the assembly cannot collapse disagreement.
  const routine = residents[residents.length - 1];
  routine.modelBreak = false;
  routine.investigating = false;
  routine.hypothesis = 'local-world-is-consistent';
  const report = sim.conveneSubworldAssembly(child.id);
  assert(['contested-model', 'incomplete-model-supported', 'evidence-under-review'].includes(report.narrative));
  assert.strictEqual(report.machineTruthIncluded, false);
  assert(Array.isArray(report.sourceReceiptIds));
  assert(report.sourceReceiptIds.length > 0);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(report, 'machineTruth'), false);
  assert(sim.receipts.some((r) => r.type === 'subworld.institution-report' && r.payload.report.id === report.id));
  assert(child.subworld.institutions[0].proposals.every((proposal) => proposal.voluntary === true));
  assert(anomaly.creationReceiptId);
})();

(function replicationCannotInventResourcesAndCanResumeAfterRecovery() {
  const { sim, child } = build('replication-resource', {
    subworldEconomyPeriod: 99,
    subworldConsumptionPeriod: 99,
    subworldResourceRecoveryPeriod: 99,
    subworldReplicationMaterialCost: 1,
    subworldReplicationEnergyCost: 1
  });
  child.subworld.economy.stock.material = 0;
  child.subworld.economy.stock.energy = 0;
  sim.seedSubworldProgram(child.id, 'replicator', { x: 3, y: 3, authorization: 'allowed', period: 2 });
  sim.run(4);
  assert.strictEqual(sim.metrics.subworldProgramCopies, 0);
  assert(sim.metrics.subworldReplicationResourceBlocks > 0);
  assert(sim.receipts.some((r) => r.type === 'subworld.program-copy-blocked' && r.payload.reason === 'resource-pressure'));
  child.subworld.economy.stock.material = 4;
  child.subworld.economy.stock.energy = 4;
  sim.run(4);
  assert(sim.metrics.subworldProgramCopies > 0);
  assert(sim.receipts.some((r) => r.type === 'subworld.replication-resources-spent'));
})();

(function modalResetRestoresEconomyAndInstitutionsButKeepsReceipts() {
  const sim = new GardenSimulation({ seed: 'civilization-reset', config: { subworldInvestigationPeriod: 2, subworldAssemblyPeriod: 50 } });
  const root = sim.addModal({ x: 5, y: 4, radius: 4, period: 20 });
  const child = sim.addNestedModal(root.id, { x: 5, y: 4, radius: 2, period: 8, memoryLeak: 0.2 });
  sim.initializeModalSubworld(child.id, { population: 3, width: 7, height: 7 });
  const baselineFood = child.subworld.economy.stock.food;
  const resident = child.subworld.residents[0];
  sim.performSubworldTask(child.id, resident.id, 'forage');
  sim.conveneSubworldAssembly(child.id);
  assert(child.subworld.economy.stock.food > baselineFood);
  const reportReceiptsBefore = sim.receipts.filter((r) => r.type === 'subworld.institution-report').length;
  sim.run(8);
  assert.strictEqual(child.subworld.economy.stock.food, baselineFood);
  assert.strictEqual(child.subworld.institutions[0].reports.length, 0);
  assert(sim.receipts.filter((r) => r.type === 'subworld.institution-report').length >= reportReceiptsBefore);
})();

(function civilizationRoundTripContinuesDeterministically() {
  const { sim, child } = build('civilization-roundtrip', { subworldInvestigationPeriod: 2 });
  sim.seedSubworldAnomaly(child.id, 'local-distortion', { x: 3, y: 3, radius: 20, intensity: 1, ttl: 100 });
  sim.run(15);
  const restored = GardenSimulation.deserialize(sim.serialize());
  assert.strictEqual(restored.version, '0.15.0');
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint());
  assert.deepStrictEqual(restored.subworldSummary(child.id).institutions, sim.subworldSummary(child.id).institutions);
  sim.run(10);
  restored.run(10);
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint());
})();

console.log('Anomaly Garden civilization tests: PASS');