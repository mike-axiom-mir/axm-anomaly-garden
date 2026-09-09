'use strict';

const assert = require('assert');
const { GardenSimulation } = require('../src/v16.js');
const { deserializeVerified } = require('../src/state-contract.js');

function makeSimulation() {
  const sim = new GardenSimulation({ seed: 'default-deserialize-admission', repairPolicy: 'off' });
  sim.addAnomaly('admission-probe', { x: 4, y: 3, radius: 2, intensity: 0.8, ttl: 80 });
  sim.run(18);
  return sim;
}

(function validDefaultDeserializePreservesContinuation() {
  const source = makeSimulation();
  const serialized = source.serialize();
  const restored = GardenSimulation.deserialize(serialized);

  assert.strictEqual(restored.stateFingerprint(), source.stateFingerprint(), 'default deserialize must preserve the accepted canonical state');

  source.run(8);
  restored.run(8);
  assert.strictEqual(restored.stateFingerprint(), source.stateFingerprint(), 'default deserialize must preserve deterministic continuation');
})();

(function defaultDeserializeRejectsResealedSemanticCorruption() {
  const envelope = JSON.parse(makeSimulation().serialize());
  const before = JSON.stringify(envelope);
  envelope.state.seed = (envelope.state.seed + 1) >>> 0;
  const rejectedBytes = JSON.stringify(envelope);

  assert.throws(
    () => GardenSimulation.deserialize(envelope),
    (error) => error && error.code === 'AXM_STATE_CONTRACT_REJECTED' && Array.isArray(error.problems) && error.problems.some((problem) => problem.code === 'SEED_IDENTITY_MISMATCH'),
    'default deserialize must reject a state whose seed identity no longer matches seedText'
  );
  assert.strictEqual(JSON.stringify(envelope), rejectedBytes, 'rejected caller state must not be rewritten during admission');
  assert.notStrictEqual(rejectedBytes, before, 'fixture must actually alter canonical state');
})();

(function staleIdentityCounterCannotReachRestore() {
  const envelope = JSON.parse(makeSimulation().serialize());
  envelope.state.counters.nextReceiptId = 1;

  assert.throws(
    () => GardenSimulation.deserialize(envelope),
    (error) => error && error.code === 'AXM_STATE_CONTRACT_REJECTED' && error.problems.some((problem) => problem.code === 'STALE_NEXT_COUNTER'),
    'default deserialize must reject state that would reuse a canonical receipt identity'
  );
})();

(function explicitVerifiedLoaderStillComposesWithDefaultGate() {
  const source = makeSimulation();
  const loaded = deserializeVerified(source.serialize());
  assert.strictEqual(loaded.simulation.stateFingerprint(), source.stateFingerprint(), 'verified loader must still compose after default admission becomes guarded');
  assert.strictEqual(loaded.validation.ok, true);
  assert.strictEqual(loaded.restoredValidation.ok, true);
})();

console.log('Anomaly Garden default deserialization admission tests: PASS');
