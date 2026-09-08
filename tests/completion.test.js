const assert = require('assert');
const { GardenSimulation } = require('../src/v16.js');

(function completionScenarioExercisesTheFinishedLayers() {
  const sim = new GardenSimulation({ seed: 'completion-scenario-test', config: { subworldInvestigationPeriod: 2 } });
  const planted = sim.plantCompletionScenario();
  sim.run(28);
  const overview = sim.worldglassOverview();
  const audit = sim.worldIntegrityReport();

  assert.strictEqual(sim.version, '0.16.0');
  assert.strictEqual(overview.livingSubworlds.length, 2);
  assert.strictEqual(overview.gates.length, 1);
  assert(overview.totals.experiments > 0);
  assert(overview.totals.modelBreaks > 0);
  assert(sim.metrics.subworldResidentInvestigations > 0);
  assert(sim.metrics.subworldAssemblies > 0);
  assert(sim.metrics.subworldProgramCopies > 0 || sim.metrics.subworldProgramQuarantines > 0);
  assert.strictEqual(audit.pass, true, JSON.stringify(audit.errors));
  assert.strictEqual(audit.counts.livingSubworlds, 2);
  assert.strictEqual(audit.counts.gates, 1);
  assert(planted.gate.creationReceiptId);
})();

(function observingWorldglassDoesNotMutateCanonicalState() {
  const sim = new GardenSimulation({ seed: 'completion-observer-purity' });
  sim.plantCompletionScenario();
  sim.run(7);
  const fingerprint = sim.stateFingerprint();
  const audits = sim.metrics.completionAudits;
  const failures = sim.metrics.completionAuditFailures;
  const receipts = sim.receipts.length;

  sim.snapshot();
  sim.snapshot();
  sim.worldglassOverview();
  sim.worldIntegrityReport();
  sim.causalSlice({ limit: 12 });

  assert.strictEqual(sim.stateFingerprint(), fingerprint);
  assert.strictEqual(sim.metrics.completionAudits, audits);
  assert.strictEqual(sim.metrics.completionAuditFailures, failures);
  assert.strictEqual(sim.receipts.length, receipts);
})();

(function explicitAuditIsReceiptedAndCounted() {
  const sim = new GardenSimulation({ seed: 'completion-explicit-audit' });
  sim.plantCompletionScenario();
  sim.run(4);
  const before = sim.metrics.completionAudits;
  const report = sim.runCompletionAudit();
  assert.strictEqual(report.pass, true, JSON.stringify(report.errors));
  assert.strictEqual(sim.metrics.completionAudits, before + 1);
  assert(sim.receipts.some((receipt) => receipt.type === 'world.completion-audit' && receipt.payload.pass === true));
})();

(function causalSliceIsBoundedAndFilterable() {
  const sim = new GardenSimulation({ seed: 'completion-causal-slice' });
  const planted = sim.plantCompletionScenario();
  sim.run(12);
  const slice = sim.causalSlice({ modalId: planted.child.id, limit: 7 });
  assert(slice.length <= 7);
  assert(slice.length > 0);
  for (const receipt of slice) {
    const payload = receipt.payload || {};
    assert(
      payload.modalId === planted.child.id ||
      payload.fromModalId === planted.child.id ||
      payload.toModalId === planted.child.id ||
      payload.targetModalId === planted.child.id ||
      payload.parentModalId === planted.child.id
    );
  }
  const auditOnly = sim.causalSlice({ types: ['world.completion-audit'], limit: 10 });
  assert.strictEqual(auditOnly.length, 0);
  sim.runCompletionAudit();
  assert.strictEqual(sim.causalSlice({ types: ['world.completion-audit'], limit: 10 }).length, 1);
})();

(function completionRoundTripAndContinuationRemainExact() {
  const sim = new GardenSimulation({ seed: 'completion-roundtrip', config: { subworldInvestigationPeriod: 2 } });
  sim.plantCompletionScenario();
  sim.run(19);
  const restored = GardenSimulation.deserialize(sim.serialize());
  assert.strictEqual(restored.version, '0.16.0');
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint());
  assert.deepStrictEqual(restored.worldIntegrityReport().errors, []);
  sim.run(17);
  restored.run(17);
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint());
  assert.deepStrictEqual(restored.worldglassOverview().totals, sim.worldglassOverview().totals);
})();

console.log('Anomaly Garden completion tests: PASS');