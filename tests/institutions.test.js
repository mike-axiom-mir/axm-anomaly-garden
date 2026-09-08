'use strict';

const assert = require('assert');
const { GardenSimulation } = require('../src/sim.js');

(function institutionsUseReportsNotMachineTruthTest() {
  const sim = new GardenSimulation({ seed: 'institution-lab', repairPolicy: 'off' });
  assert.strictEqual(sim.institutions.length, 3, 'world should start with three bounded institutions');
  const ids = new Set(sim.institutions.map((institution) => institution.id));
  for (const agent of sim.agents) {
    assert(ids.has(agent.institutionId), 'every inhabitant should belong to one institution');
    assert(agent.institutionTrust >= 0 && agent.institutionTrust <= 1);
  }
  for (const institution of sim.institutions) {
    assert(!Object.prototype.hasOwnProperty.call(institution, 'anomalies'), 'institution must not receive raw anomaly state');
    assert(!Object.prototype.hasOwnProperty.call(institution, 'machineTruth'), 'institution must not receive Worldglass truth');
  }

  sim.addAnomaly('loop-echo', { x: 5, y: 4, radius: 6, intensity: 1, ttl: 100 });
  sim.run(100);

  assert(sim.metrics.institutionReports > 0, 'institutions should receive bounded member reports');
  assert(sim.metrics.narrativeChanges > 0, 'enough corroborated reports should be able to change institutional narratives');
  assert(sim.metrics.institutionBroadcasts > 0, 'institutions should periodically broadcast their current interpretation');
  assert(sim.institutions.some((institution) => institution.narrative !== institution.priorNarrative));
  for (const institution of sim.institutions) {
    for (const report of institution.reports) {
      assert(report.sourceReceiptId, 'institution reports must retain source receipt provenance');
      assert(report.reportReceiptId, 'institution report itself must have a receipt');
    }
  }
})();

(function institutionsRoundTripTest() {
  const sim = new GardenSimulation({ seed: 'institution-archive', repairPolicy: 'tolerant' });
  sim.addAnomaly('memory-scar', { x: 5, y: 4, radius: 5, intensity: 0.9, ttl: 70 });
  sim.run(72);
  const restored = GardenSimulation.deserialize(sim.serialize());
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint(), 'institution state must survive export/import exactly');
  sim.run(24);
  restored.run(24);
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint(), 'restored institutional narratives must continue deterministically');
})();

console.log('Anomaly Garden institution tests: PASS');
