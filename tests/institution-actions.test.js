'use strict';

const assert = require('assert');
const { GardenSimulation } = require('../src/v07.js');

(function voluntaryInstitutionActionTest() {
  const sim = new GardenSimulation({ seed: 'civic-proposals', repairPolicy: 'off' });

  // Force only the institution's own bounded narrative state for this unit test.
  // No anomaly object, coordinates, or Worldglass truth are injected into the institution.
  for (const institution of sim.institutions) {
    institution.narrative = institution.frame === 'test' ? 'persistent-inconsistency'
      : institution.frame === 'repair' ? 'systemic-fault-pattern'
        : 'community-pattern';
  }
  for (const agent of sim.agents) {
    const institution = sim.institutions.find((item) => item.id === agent.institutionId);
    const place = sim.places.find((item) => item.id === institution.placeId);
    agent.x = place.x;
    agent.y = place.y;
    agent.energy = 1;
    agent.hunger = 0;
    agent.institutionTrust = 0.8;
  }

  sim.run(12); // first broadcast window
  assert(sim.metrics.institutionProposals > 0, 'non-prior narratives should be able to produce bounded action proposals');
  assert(sim.metrics.institutionCommitments > 0, 'members should sometimes voluntarily accept proposals');

  const proposals = sim.receipts.filter((receipt) => receipt.type === 'institution.proposed-action');
  const acceptances = sim.receipts.filter((receipt) => receipt.type === 'inhabitant.accepted-institution-proposal');
  assert(proposals.length > 0 && acceptances.length > 0);
  for (const proposal of proposals) {
    assert(!Object.prototype.hasOwnProperty.call(proposal.payload, 'anomalyId'));
    assert(!Object.prototype.hasOwnProperty.call(proposal.payload, 'x'));
    assert(!Object.prototype.hasOwnProperty.call(proposal.payload, 'y'));
    assert(!Object.prototype.hasOwnProperty.call(proposal.payload, 'machineTruth'));
  }
  for (const acceptance of acceptances) {
    assert(acceptance.parents.length === 1, 'acceptance must point to the proposal that was offered');
    assert(acceptance.payload.acceptanceChance > 0 && acceptance.payload.acceptanceChance < 1, 'proposal acceptance must remain probabilistic rather than forced');
  }

  sim.run(10);
  assert(sim.metrics.institutionSessions > 0, 'accepted proposals should be able to produce bounded institution sessions');
  const sessions = sim.receipts.filter((receipt) => receipt.type === 'inhabitant.participated-institution-session');
  assert(sessions.some((receipt) => receipt.parents.length > 0), 'institution sessions should retain causal parents');
})();

(function institutionActionsCanBeDisabledTest() {
  const sim = new GardenSimulation({ seed: 'civic-off', config: { institutionActionEnabled: false } });
  for (const institution of sim.institutions) institution.narrative = institution.frame === 'test' ? 'persistent-inconsistency' : institution.frame === 'repair' ? 'systemic-fault-pattern' : 'community-pattern';
  sim.run(48);
  assert.strictEqual(sim.metrics.institutionProposals, 0, 'institution action layer must have an explicit off switch');
  assert.strictEqual(sim.metrics.institutionCommitments, 0);
  assert(!sim.agents.some((agent) => agent.institutionCommitment));
})();

console.log('Anomaly Garden institution-action tests: PASS');
