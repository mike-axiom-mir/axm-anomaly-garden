const assert = require('assert');
const { GardenSimulation } = require('../src/v12.js');

function build(seed) {
  const sim = new GardenSimulation({ seed: seed || 'subworld-security-test' });
  const root = sim.addModal({ x: 5, y: 4, radius: 3.5, period: 12, memoryLeak: 0.5 });
  const child = sim.addNestedModal(root.id, { x: 5, y: 4, radius: 1.7, period: 7, memoryLeak: 0.55 });
  sim.initializeModalSubworld(child.id, { population: 4, width: 7, height: 7 });
  return { sim, root, child };
}

(function deterministicSubworldContinuation() {
  const a = build('subworld-deterministic');
  const b = build('subworld-deterministic');
  a.sim.seedSubworldAnomaly(a.child.id, 'local-distortion', { x: 3, y: 3, radius: 3, intensity: 1, ttl: 40 });
  b.sim.seedSubworldAnomaly(b.child.id, 'local-distortion', { x: 3, y: 3, radius: 3, intensity: 1, ttl: 40 });
  a.sim.seedSubworldProgram(a.child.id, 'replicator', { x: 5, y: 5, authorization: 'denied', period: 3 });
  b.sim.seedSubworldProgram(b.child.id, 'replicator', { x: 5, y: 5, authorization: 'denied', period: 3 });
  a.sim.run(25); b.sim.run(25);
  assert.strictEqual(a.sim.stateFingerprint(), b.sim.stateFingerprint());
})();

(function nestedOnlyInitializationBoundary() {
  const sim = new GardenSimulation({ seed: 'subworld-root-reject' });
  const root = sim.addModal({ x: 5, y: 4, radius: 3.5, period: 12 });
  assert.throws(() => sim.initializeModalSubworld(root.id), /nested Modal/);
})();

(function localStateAndReceiptsExist() {
  const { sim, child } = build('subworld-local-state');
  assert.strictEqual(child.subworld.residents.length, 4);
  const anomaly = sim.seedSubworldAnomaly(child.id, 'local-distortion', { x: 3, y: 3, radius: 8, intensity: 1, ttl: 40 });
  sim.run(6);
  assert(sim.receipts.some((r) => r.type === 'intervention.subworld-anomaly-added' && r.payload.anomaly.id === anomaly.id));
  assert(sim.receipts.some((r) => r.type === 'subworld.inhabitant-observed-anomaly'));
})();

(function securityCapabilitiesAndJurisdictionAreBounded() {
  const { sim, child } = build('subworld-security-bounds');
  const grandchild = sim.addNestedModal(child.id, { x: child.x, y: child.y, radius: 0.8, period: 5, memoryLeak: 0.4 });
  sim.initializeModalSubworld(grandchild.id, { population: 1, width: 5, height: 5 });
  const observer = sim.deploySecurityProgram(child.id, 'observer', { x: 1, y: 1, sensorRadius: 5, actionRadius: 5 });
  const denied = sim.seedSubworldProgram(child.id, 'replicator', { x: 2, y: 1, authorization: 'denied', period: 10 });
  sim.run(1);
  const capabilityBlock = sim.securityAttempt(observer.id, 'quarantine-program', child.id, denied.id, 'program');
  assert.strictEqual(capabilityBlock.payload.reason, 'missing-capability');
  assert.strictEqual(denied.quarantined, false);
  const warden = sim.deploySecurityProgram(child.id, 'warden', { x: 1, y: 2, sensorRadius: 5, actionRadius: 5 });
  const outside = sim.seedSubworldProgram(grandchild.id, 'replicator', { x: 1, y: 1, authorization: 'denied', period: 10 });
  const jurisdictionBlock = sim.securityAttempt(warden.id, 'quarantine-program', grandchild.id, outside.id, 'program');
  assert.strictEqual(jurisdictionBlock.payload.reason, 'outside-jurisdiction');
  assert.strictEqual(outside.quarantined, false);
})();

(function securityKnowledgeAndRangeAreNotOmniscient() {
  const { sim, child } = build('subworld-security-knowledge');
  const hidden = sim.seedSubworldProgram(child.id, 'replicator', { x: 6, y: 6, authorization: 'denied', period: 20 });
  const narrow = sim.deploySecurityProgram(child.id, 'warden', { x: 0, y: 0, sensorRadius: 1, actionRadius: 1 });
  const unknown = sim.securityAttempt(narrow.id, 'quarantine-program', child.id, hidden.id, 'program');
  assert.strictEqual(unknown.payload.reason, 'target-not-observed');
  assert.strictEqual(hidden.quarantined, false);
  const far = sim.seedSubworldProgram(child.id, 'service', { x: 3, y: 0, authorization: 'denied', period: 20 });
  const scanner = sim.deploySecurityProgram(child.id, 'warden', { x: 0, y: 1, sensorRadius: 10, actionRadius: 1 });
  sim.run(1);
  assert.strictEqual(child.subworld.programs.find((p) => p.id === far.id).quarantined, false);
  const ranged = sim.securityAttempt(scanner.id, 'quarantine-program', child.id, far.id, 'program');
  assert.strictEqual(ranged.payload.reason, 'outside-action-range');
})();

(function wardenQuarantineIsNoLoss() {
  const { sim, child } = build('subworld-warden');
  const target = sim.seedSubworldProgram(child.id, 'replicator', { x: 5, y: 5, authorization: 'denied', period: 10 });
  const warden = sim.deploySecurityProgram(child.id, 'warden', { x: 4, y: 5, sensorRadius: 3, actionRadius: 2 });
  sim.run(1);
  const liveTarget = child.subworld.programs.find((p) => p.id === target.id);
  assert(liveTarget && liveTarget.quarantined && !liveTarget.active);
  const receipt = sim.receipts.find((r) => r.type === 'security.program-quarantined' && r.payload.targetProgramId === target.id);
  assert(receipt && receipt.payload.deletionCount === 0 && receipt.payload.lineagePreserved === true);
  assert.strictEqual(warden.capabilities.includes('repair-anomaly'), false);
})();

(function repairerCannotQuarantineButCanRepair() {
  const { sim, child } = build('subworld-repairer');
  const anomaly = sim.seedSubworldAnomaly(child.id, 'local-distortion', { x: 3, y: 3, radius: 2, intensity: 1, ttl: 40 });
  const denied = sim.seedSubworldProgram(child.id, 'replicator', { x: 4, y: 3, authorization: 'denied', period: 10 });
  const repairer = sim.deploySecurityProgram(child.id, 'repairer', { x: 2, y: 3, sensorRadius: 5, actionRadius: 5 });
  sim.run(1);
  assert(child.subworld.anomalies.find((a) => a.id === anomaly.id).intensity < 1);
  assert.strictEqual(sim.securityAttempt(repairer.id, 'quarantine-program', child.id, denied.id, 'program').payload.reason, 'missing-capability');
})();

(function localReplicatorCanCopyWithoutSecurity() {
  const { sim, child } = build('subworld-local-replication');
  sim.seedSubworldProgram(child.id, 'replicator', { x: 3, y: 3, authorization: 'denied', period: 2 });
  sim.run(5);
  assert(sim.metrics.subworldProgramCopies > 0);
  assert(sim.receipts.some((r) => r.type === 'subworld.program-copied' && r.payload.locallyValid === true));
})();

(function resetRestoresLivingBaselineButKeepsHistory() {
  const { sim, child } = build('subworld-reset');
  const target = sim.seedSubworldProgram(child.id, 'replicator', { x: 5, y: 5, authorization: 'denied', period: 20 });
  sim.deploySecurityProgram(child.id, 'warden', { x: 4, y: 5, sensorRadius: 3, actionRadius: 2 });
  sim.run(1);
  assert(child.subworld.programs.find((p) => p.id === target.id).quarantined);
  const before = sim.receipts.filter((r) => r.type === 'security.program-quarantined').length;
  sim.run(6);
  const restored = child.subworld.programs.find((p) => p.id === target.id);
  assert(restored && restored.active && !restored.quarantined);
  assert(sim.receipts.filter((r) => r.type === 'security.program-quarantined').length >= before);
  assert(sim.receipts.some((r) => r.type === 'subworld.state-reset' && r.payload.modalId === child.id));
})();

(function serializationRoundTripAndContinuation() {
  const { sim, child } = build('subworld-roundtrip');
  sim.seedSubworldAnomaly(child.id, 'local-distortion', { x: 3, y: 3, radius: 3, intensity: 0.95, ttl: 50 });
  sim.seedSubworldProgram(child.id, 'replicator', { x: 5, y: 5, authorization: 'denied', period: 3 });
  sim.deploySecurityProgram(child.id, 'warden', { x: 4, y: 5, sensorRadius: 3, actionRadius: 2 });
  sim.run(15);
  const restored = GardenSimulation.deserialize(sim.serialize());
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint());
  assert.deepStrictEqual(restored.modalTree(), sim.modalTree());
  sim.run(20); restored.run(20);
  assert.strictEqual(restored.stateFingerprint(), sim.stateFingerprint());
})();

console.log('Anomaly Garden subworld/security tests: PASS');