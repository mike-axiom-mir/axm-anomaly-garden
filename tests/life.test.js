'use strict';

const assert = require('assert');
const { GardenSimulation } = require('../src/sim.js');

(function productiveLifeTest() {
  const sim = new GardenSimulation({ seed: 'productive-life', repairPolicy: 'off' });
  sim.run(sim.config.dayLength * 7);
  assert(sim.metrics.production > 0, 'work routines should produce place resources');
  assert(sim.places.some((place) => place.produced > 0), 'at least one workplace should accumulate production');
  assert(sim.metrics.socialMeetings > 0, 'repeated social routines should produce actual meetings');
  assert(sim.metrics.projectsCompleted > 0, 'long-lived work routines should eventually complete personal projects');
  assert(sim.agents.some((agent) => agent.ownedArtifacts.length > 0), 'completed projects should become owned artifacts');
  for (const agent of sim.agents) {
    assert(agent.hunger >= 0 && agent.hunger <= 1, 'hunger must remain bounded');
    assert(agent.credits >= 0, 'credits must not go negative');
    assert(agent.inventory.food >= 0, 'owned food must not go negative');
    assert(agent.project.progress >= 0 && agent.project.progress < 1, 'project progress should roll over after completion');
  }
})();

(function productiveLifeRoundTripTest() {
  const sim = new GardenSimulation({ seed: 'productive-archive', repairPolicy: 'tolerant' });
  sim.run(sim.config.dayLength * 3);
  const restored = GardenSimulation.deserialize(sim.serialize());
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint(), 'productive life state should survive export/import');
  sim.run(24);
  restored.run(24);
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint(), 'restored productive life should continue deterministically');
})();

console.log('Anomaly Garden productive-life tests: PASS');
